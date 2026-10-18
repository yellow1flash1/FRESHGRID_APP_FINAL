CREATE TYPE public.app_role AS ENUM ('farmer', 'buyer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  state text,
  district text,
  village text,
  org_name text,
  upi_id text,
  id_type text,
  id_number text,
  fpo_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- A user picks exactly one role (farmer or buyer) once; neither is privileged.
CREATE OR REPLACE FUNCTION public.claim_role(_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN RETURN; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role);
END $$;
GRANT EXECUTE ON FUNCTION public.claim_role(public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := NEW.raw_user_meta_data->>'role';
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  IF r IN ('farmer', 'buyer') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.cold_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_hi text,
  address text NOT NULL,
  district text NOT NULL,
  state text NOT NULL,
  pin text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  rate_per_crate_day integer NOT NULL,
  total_slots integer NOT NULL,
  temp_c numeric NOT NULL,
  humidity integer NOT NULL,
  badges text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  phone text
);
GRANT SELECT ON public.cold_rooms TO anon, authenticated;
GRANT ALL ON public.cold_rooms TO service_role;
ALTER TABLE public.cold_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cold rooms public read" ON public.cold_rooms FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.cold_rooms (name, name_hi, address, district, state, pin, lat, lng, rate_per_crate_day, total_slots, temp_c, humidity, badges, tags) VALUES
('Sunrise Solar Cold Hub', 'सनराइज़ सोलर कोल्ड हब', 'GT Road, Ganaur', 'Sonipat', 'Haryana', '131101', 29.1339, 77.0167, 18, 120, 4.2, 88, ARRAY['Solar','24/7','FPO Certified'], ARRAY['solar','247']),
('Gram Seva Cold Room', 'ग्राम सेवा कोल्ड रूम', 'Rai Industrial Area', 'Sonipat', 'Haryana', '131029', 28.9541, 77.0928, 14, 200, 6.0, 85, ARRAY['Community','Back-up Power'], ARRAY['247']),
('Kisan FPO Chiller', 'किसान FPO चिलर', 'Sonipat Road, Kharkhoda', 'Sonipat', 'Haryana', '131402', 28.8711, 76.9132, 11, 300, 5.0, 90, ARRAY['Bulk','Loading Dock'], ARRAY['bulk']),
('Karnal Agri Cold Chain', 'करनाल एग्री कोल्ड चेन', 'Kunjpura Road', 'Karnal', 'Haryana', '132001', 29.7000, 76.9900, 15, 180, 4.8, 87, ARRAY['24/7','Bulk'], ARRAY['247','bulk']),
('Panipat Solar Chiller', 'पानीपत सोलर चिलर', 'Sanoli Road', 'Panipat', 'Haryana', '132103', 29.4050, 76.9900, 13, 90, 5.5, 86, ARRAY['Solar','Community'], ARRAY['solar']),
('Azadpur Mandi Cold Store', 'आज़ादपुर मंडी कोल्ड स्टोर', 'Azadpur Mandi', 'North West Delhi', 'Delhi', '110033', 28.7076, 77.1800, 22, 400, 3.8, 90, ARRAY['24/7','Loading Dock','Bulk'], ARRAY['247','bulk']);

CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  batch_code text NOT NULL,
  crop text NOT NULL,
  grade text NOT NULL,
  confidence integer NOT NULL,
  uniformity integer NOT NULL,
  spoilage text NOT NULL,
  shelf_no integer NOT NULL,
  shelf_cold integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans" ON public.scans FOR ALL TO authenticated USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL,
  cold_room_id uuid NOT NULL REFERENCES public.cold_rooms(id),
  pass_no text NOT NULL,
  crop text NOT NULL,
  crates integer NOT NULL CHECK (crates > 0 AND crates <= 500),
  days integer NOT NULL CHECK (days > 0 AND days <= 60),
  amount integer NOT NULL,
  pay_mode text NOT NULL CHECK (pay_mode IN ('upi','credit')),
  paid boolean NOT NULL DEFAULT false,
  bay text NOT NULL,
  utr text,
  pay_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings select" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = farmer_id);
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);

-- Free slots per cold room = total minus crates in bookings still active.
CREATE OR REPLACE FUNCTION public.cold_room_free_slots()
RETURNS TABLE (cold_room_id uuid, free integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, GREATEST(0, c.total_slots - COALESCE(SUM(b.crates) FILTER (WHERE b.created_at + make_interval(days => b.days) > now()), 0))::int
  FROM public.cold_rooms c LEFT JOIN public.bookings b ON b.cold_room_id = c.id
  GROUP BY c.id
$$;
GRANT EXECUTE ON FUNCTION public.cold_room_free_slots() TO anon, authenticated;

CREATE TABLE public.lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_code text NOT NULL,
  farmer_id uuid NOT NULL,
  farmer_name text NOT NULL,
  farmer_district text,
  crop text NOT NULL,
  kg integer NOT NULL CHECK (kg > 0),
  grade text NOT NULL DEFAULT 'A',
  price_per_kg numeric NOT NULL CHECK (price_per_kg > 0),
  gross integer NOT NULL,
  cold_deduction integer NOT NULL DEFAULT 0,
  transport_deduction integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','escrow','settled','cancelled')),
  buyer_id uuid,
  buyer_name text,
  utr text,
  created_at timestamptz NOT NULL DEFAULT now(),
  ordered_at timestamptz,
  settled_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmer own lots select" ON public.lots FOR SELECT TO authenticated USING (auth.uid() = farmer_id);
CREATE POLICY "buyer sees open or own lots" ON public.lots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer') AND (status = 'open' OR buyer_id = auth.uid()));
CREATE POLICY "farmer creates lots" ON public.lots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = farmer_id AND status = 'open' AND buyer_id IS NULL AND public.has_role(auth.uid(), 'farmer'));
CREATE POLICY "farmer cancels open lots" ON public.lots FOR UPDATE TO authenticated
  USING (auth.uid() = farmer_id AND status = 'open') WITH CHECK (auth.uid() = farmer_id AND status IN ('open','cancelled'));

CREATE OR REPLACE FUNCTION public.place_order(_lot_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bname text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'buyer') THEN RAISE EXCEPTION 'only buyers can order'; END IF;
  SELECT COALESCE(NULLIF(org_name, ''), full_name) INTO bname FROM public.profiles WHERE id = auth.uid();
  UPDATE public.lots SET status = 'escrow', buyer_id = auth.uid(), buyer_name = bname, ordered_at = now()
  WHERE id = _lot_id AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'lot is no longer available'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.place_order(uuid) TO authenticated;

-- Buyer confirms delivery by scanning the farmer's QR; escrow is released.
CREATE OR REPLACE FUNCTION public.confirm_delivery(_lot_id uuid, _utr text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.lots SET status = 'settled', utr = _utr, settled_at = now()
  WHERE id = _lot_id AND status = 'escrow' AND buyer_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'cannot confirm this lot'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(uuid, text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lots;