-- 0001_secure_money_flows
-- Moves every money-related value onto the server so the browser can no longer
-- choose amounts, mark things paid, overbook a cold room, or skip the delivery handover.
--
-- 1. Bookings are created only through create_booking() (amount, pass no., capacity check on the server).
-- 2. Dues are settled only through pay_booking_dues().
-- 3. Lot totals (gross / net) are recomputed by a trigger; deductions can't be negative.
-- 4. Lots are cancelled only through cancel_lot().
-- 5. Each lot gets a secret 6-digit handover code only the farmer can read;
--    confirm_delivery() now checks it on the server, with a 5-attempt lockout.
--
-- TEST MODE NOTE: "paid" is still set when the simulated UPI step finishes. Before real money
-- moves, replace that with a payment-gateway webhook running as service_role.

------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------

-- Random uppercase hex code, e.g. short_code('LOT-') -> 'LOT-3FA91C0B' (~4 billion combinations).
CREATE OR REPLACE FUNCTION public.short_code(_prefix text, _len int DEFAULT 8)
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT _prefix || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, _len))
$$;

-- Random 6-digit numeric code (easy for a farmer to read out loud).
CREATE OR REPLACE FUNCTION public.six_digit_code()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0')
$$;

-- Fake 12-digit UTR for test-mode settlements. Real UTRs must come from the bank / gateway.
CREATE OR REPLACE FUNCTION public.test_utr()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint) % 1000000000000)::text, 12, '0')
$$;

REVOKE ALL ON FUNCTION public.short_code(text, int), public.six_digit_code(), public.test_utr() FROM PUBLIC, anon, authenticated;

------------------------------------------------------------------------------------------
-- Unique codes (de-duplicate any existing collisions from the old 4-digit codes first)
------------------------------------------------------------------------------------------

UPDATE public.bookings b SET pass_no = b.pass_no || '-' || upper(substr(b.id::text, 1, 4))
WHERE b.id IN (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY pass_no ORDER BY created_at) AS rn FROM public.bookings) x WHERE x.rn > 1);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_pass_no_key UNIQUE (pass_no);

UPDATE public.lots l SET lot_code = l.lot_code || '-' || upper(substr(l.id::text, 1, 4))
WHERE l.id IN (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY lot_code ORDER BY created_at) AS rn FROM public.lots) x WHERE x.rn > 1);
ALTER TABLE public.lots ADD CONSTRAINT lots_lot_code_key UNIQUE (lot_code);

------------------------------------------------------------------------------------------
-- 1 & 2. Bookings: no direct writes from the browser
------------------------------------------------------------------------------------------

DROP POLICY IF EXISTS "own bookings insert" ON public.bookings;
DROP POLICY IF EXISTS "own bookings update" ON public.bookings;
REVOKE INSERT, UPDATE ON public.bookings FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_booking(
  _cold_room_id uuid,
  _crop text,
  _crates integer,
  _days integer,
  _pay_mode text,
  _utr text DEFAULT NULL,
  _pay_method text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  room public.cold_rooms;
  used integer;
  result public.bookings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF NOT public.has_role(auth.uid(), 'farmer') THEN RAISE EXCEPTION 'only farmers can book cold rooms'; END IF;
  IF _pay_mode IS NULL OR _pay_mode NOT IN ('upi', 'credit') THEN RAISE EXCEPTION 'invalid payment mode'; END IF;
  IF _crates IS NULL OR _crates < 1 OR _crates > 500 THEN RAISE EXCEPTION 'crates must be between 1 and 500'; END IF;
  IF _days IS NULL OR _days < 1 OR _days > 60 THEN RAISE EXCEPTION 'days must be between 1 and 60'; END IF;
  IF _crop IS NULL OR length(trim(_crop)) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'invalid crop'; END IF;

  -- Lock the room row: concurrent bookings for the same room now run one after another,
  -- so two farmers can't both grab the last slots.
  SELECT * INTO room FROM public.cold_rooms WHERE id = _cold_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cold room not found'; END IF;

  SELECT COALESCE(SUM(bk.crates), 0) INTO used
  FROM public.bookings bk
  WHERE bk.cold_room_id = room.id AND bk.created_at + make_interval(days => bk.days) > now();

  IF used + _crates > room.total_slots THEN
    RAISE EXCEPTION 'only % crate slots are free in this cold room', GREATEST(0, room.total_slots - used);
  END IF;

  INSERT INTO public.bookings (farmer_id, cold_room_id, pass_no, crop, crates, days, amount, pay_mode, paid, bay, utr, pay_method)
  VALUES (
    auth.uid(),
    room.id,
    public.short_code('GP-'),
    trim(_crop),
    _crates,
    _days,
    _crates * _days * room.rate_per_crate_day,          -- price comes from the database, not the browser
    _pay_mode,
    _pay_mode = 'upi',                                   -- TEST MODE: trusts the simulated UPI step
    chr(65 + floor(random() * 3)::int) || '-' || lpad((1 + floor(random() * 30))::int::text, 2, '0'),
    CASE WHEN _pay_mode = 'upi' THEN left(_utr, 40) END,
    COALESCE(left(_pay_method, 40), CASE WHEN _pay_mode = 'credit' THEN 'FPO Credit' END)
  )
  RETURNING * INTO result;

  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, text, integer, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, text, integer, integer, text, text, text) TO authenticated;

-- Marks the listed unpaid bookings of the caller as paid. Returns the total settled (₹).
-- Taking explicit ids means a credit booking made after the farmer opened the dues screen
-- is never silently marked paid.
CREATE OR REPLACE FUNCTION public.pay_booking_dues(_booking_ids uuid[], _utr text, _pay_method text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _booking_ids IS NULL OR cardinality(_booking_ids) = 0 THEN RETURN 0; END IF;

  WITH settled AS (
    UPDATE public.bookings
    SET paid = true, utr = left(_utr, 40), pay_method = left(_pay_method, 40)   -- TEST MODE
    WHERE id = ANY(_booking_ids) AND farmer_id = auth.uid() AND paid = false
    RETURNING amount
  )
  SELECT COALESCE(SUM(amount), 0) INTO total FROM settled;

  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.pay_booking_dues(uuid[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_booking_dues(uuid[], text, text) TO authenticated;

------------------------------------------------------------------------------------------
-- 3 & 4. Lots: totals computed on the server, no direct updates
------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lots_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = NEW.farmer_id;

  IF NEW.kg IS NULL OR NEW.kg < 1 OR NEW.kg > 100000 THEN RAISE EXCEPTION 'quantity must be between 1 and 100000 kg'; END IF;
  IF NEW.price_per_kg IS NULL OR NEW.price_per_kg <= 0 OR NEW.price_per_kg > 1000 THEN RAISE EXCEPTION 'price must be between ₹0 and ₹1000 per kg'; END IF;
  IF NEW.grade NOT IN ('A', 'B', 'C') THEN RAISE EXCEPTION 'invalid grade'; END IF;

  NEW.cold_deduction := COALESCE(NEW.cold_deduction, 0);
  NEW.transport_deduction := COALESCE(NEW.transport_deduction, 0);
  IF NEW.cold_deduction < 0 OR NEW.transport_deduction < 0 THEN RAISE EXCEPTION 'deductions cannot be negative'; END IF;

  -- Whatever the browser sent for these is ignored.
  NEW.lot_code        := public.short_code('LOT-');
  NEW.farmer_name     := COALESCE(NULLIF(p.full_name, ''), 'Farmer');
  NEW.farmer_district := p.district;
  NEW.gross           := round(NEW.kg * NEW.price_per_kg)::integer;
  NEW.net_amount      := NEW.gross - NEW.cold_deduction - NEW.transport_deduction;
  IF NEW.net_amount < 0 THEN RAISE EXCEPTION 'deductions are larger than the sale value'; END IF;

  NEW.status     := 'open';
  NEW.buyer_id   := NULL;
  NEW.buyer_name := NULL;
  NEW.utr        := NULL;
  NEW.ordered_at := NULL;
  NEW.settled_at := NULL;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER lots_before_insert BEFORE INSERT ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.lots_before_insert();

DROP POLICY IF EXISTS "farmer cancels open lots" ON public.lots;
REVOKE UPDATE ON public.lots FROM authenticated;

CREATE OR REPLACE FUNCTION public.cancel_lot(_lot_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.lots SET status = 'cancelled'
  WHERE id = _lot_id AND farmer_id = auth.uid() AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'only your own open lots can be cancelled'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.cancel_lot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_lot(uuid) TO authenticated;

------------------------------------------------------------------------------------------
-- 5. Delivery handover codes
------------------------------------------------------------------------------------------

CREATE TABLE public.lot_handover (
  lot_id    uuid PRIMARY KEY REFERENCES public.lots(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL,
  code      text NOT NULL,
  attempts  integer NOT NULL DEFAULT 0
);
ALTER TABLE public.lot_handover ENABLE ROW LEVEL SECURITY;
-- Supabase grants everything on new tables by default; start from nothing.
REVOKE ALL ON public.lot_handover FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lot_handover TO authenticated;
GRANT ALL ON public.lot_handover TO service_role;
-- Only the farmer can read the code. Buyers have no policy, so they can never see it.
CREATE POLICY "farmer reads own handover code" ON public.lot_handover
  FOR SELECT TO authenticated USING (auth.uid() = farmer_id);

CREATE OR REPLACE FUNCTION public.lots_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lot_handover (lot_id, farmer_id, code) VALUES (NEW.id, NEW.farmer_id, public.six_digit_code());
  RETURN NEW;
END $$;
CREATE TRIGGER lots_after_insert AFTER INSERT ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.lots_after_insert();

-- Codes for lots that already exist and aren't finished yet.
INSERT INTO public.lot_handover (lot_id, farmer_id, code)
SELECT id, farmer_id, public.six_digit_code() FROM public.lots
WHERE status IN ('open', 'escrow')
ON CONFLICT (lot_id) DO NOTHING;

-- Old version took a browser-made UTR and no code; replace it.
DROP FUNCTION IF EXISTS public.confirm_delivery(uuid, text);

-- Returns {"status":"ok","utr":"..."} | {"status":"wrong_code","attempts_left":n} | {"status":"locked"}.
-- Wrong codes return (rather than raise) so the attempt counter is actually saved.
CREATE FUNCTION public.confirm_delivery(_lot_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h public.lot_handover;
  ref text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;

  PERFORM 1 FROM public.lots WHERE id = _lot_id AND buyer_id = auth.uid() AND status = 'escrow' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cannot confirm this lot'; END IF;

  SELECT * INTO h FROM public.lot_handover WHERE lot_id = _lot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no handover code for this lot — ask the farmer to generate a new one'; END IF;
  IF h.attempts >= 5 THEN RETURN jsonb_build_object('status', 'locked'); END IF;

  IF h.code <> regexp_replace(COALESCE(_code, ''), '\s', '', 'g') THEN
    UPDATE public.lot_handover SET attempts = attempts + 1 WHERE lot_id = _lot_id;
    IF h.attempts + 1 >= 5 THEN RETURN jsonb_build_object('status', 'locked'); END IF;
    RETURN jsonb_build_object('status', 'wrong_code', 'attempts_left', 5 - (h.attempts + 1));
  END IF;

  ref := public.test_utr();   -- TEST MODE: real UTR comes from the payout provider
  UPDATE public.lots SET status = 'settled', utr = ref, settled_at = now() WHERE id = _lot_id;
  DELETE FROM public.lot_handover WHERE lot_id = _lot_id;   -- code is single-use
  RETURN jsonb_build_object('status', 'ok', 'utr', ref);
END $$;
REVOKE ALL ON FUNCTION public.confirm_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(uuid, text) TO authenticated;

-- Farmer can issue a fresh code (e.g. after a lockout, or if the code was seen by the wrong person).
CREATE OR REPLACE FUNCTION public.regenerate_handover_code(_lot_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code text := public.six_digit_code();
BEGIN
  PERFORM 1 FROM public.lots WHERE id = _lot_id AND farmer_id = auth.uid() AND status IN ('open', 'escrow');
  IF NOT FOUND THEN RAISE EXCEPTION 'cannot reset the code for this lot'; END IF;
  INSERT INTO public.lot_handover (lot_id, farmer_id, code, attempts) VALUES (_lot_id, auth.uid(), new_code, 0)
  ON CONFLICT (lot_id) DO UPDATE SET code = EXCLUDED.code, attempts = 0;
  RETURN new_code;
END $$;
REVOKE ALL ON FUNCTION public.regenerate_handover_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_handover_code(uuid) TO authenticated;
