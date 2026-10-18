import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Droplets, LocateFixed, MapPin, Navigation, Printer, Search, Thermometer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CROPS, cropBy, useStore } from "@/lib/store";
import { useBookings, useColdRooms, useInvalidate, useMe, type Booking, type ColdRoom } from "@/lib/data";
import { inr } from "@/lib/income";
import { Badge, Btn, Field, Label, Modal, SectionTitle, inputCls } from "./ui";
import { UpiPay } from "./UpiPay";

const ColdMap = lazy(() => import("./ColdMap"));
const FILTERS = [["all", "All"], ["solar", "Solar Powered"], ["247", "24/7"], ["bulk", "Bulk Dock"]] as const;
export const DISTRICT_LL: Record<string, [number, number]> = {
  Sonipat: [28.9931, 77.0151], Karnal: [29.6857, 76.9905], Panipat: [29.3909, 76.9635], Hisar: [29.1492, 75.7217], Kurukshetra: [29.9695, 76.8783],
  Ludhiana: [30.901, 75.8573], Amritsar: [31.634, 74.8723], Patiala: [30.3398, 76.3869], Jalandhar: [31.326, 75.5762],
  Meerut: [28.9845, 77.7064], Agra: [27.1767, 78.0081], Lucknow: [26.8467, 80.9462], Saharanpur: [29.968, 77.5552],
  Nashik: [19.9975, 73.7898], Pune: [18.5204, 73.8567], Nagpur: [21.1458, 79.0882], Satara: [17.6805, 74.0183],
  "North West Delhi": [28.7, 77.1], "North Delhi": [28.68, 77.22], Jaipur: [26.9124, 75.7873], Alwar: [27.553, 76.6346], Kota: [25.2138, 75.8648],
};
const km = (a: [number, number], b: [number, number]) => {
  const R = 6371, dLat = ((b[0] - a[0]) * Math.PI) / 180, dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export function ColdTab() {
  const { s, t } = useStore();
  const { data: me } = useMe();
  const rooms = useColdRooms();
  const [q, setQ] = useState("");
  const [fl, setFl] = useState<string>("all");
  const [gps, setGps] = useState<[number, number] | null>(null);
  const [gpsMsg, setGpsMsg] = useState("");
  const [hub, setHub] = useState<ColdRoom | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const here: [number, number] = gps ?? DISTRICT_LL[me?.profile?.district ?? ""] ?? DISTRICT_LL["Sonipat"]!;
  const locate = () => {
    if (!navigator.geolocation) return setGpsMsg(t("GPS not available on this device", "GPS उपलब्ध नहीं"));
    setGpsMsg(t("Locating…", "स्थान खोज रहे हैं…"));
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps([p.coords.latitude, p.coords.longitude]); setGpsMsg(t("📍 Using your GPS location", "📍 आपका GPS स्थान")); },
      () => setGpsMsg(t("Location permission denied — using your district", "अनुमति नहीं मिली — ज़िले से दूरी")),
      { timeout: 8000 },
    );
  };
  const list = useMemo(() => (rooms.data ?? [])
    .map((r) => ({ ...r, km: km(here, [r.lat, r.lng]) }))
    .filter((h) => (fl === "all" || h.tags.includes(fl)) && (!q || `${h.name} ${h.address} ${h.district} ${h.pin}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.km - b.km), [rooms.data, here, fl, q]);
  return (
    <div>
      <SectionTitle title={t("Cold Rooms", "कोल्ड स्टोर")} sub={t("Book FPO cold storage near you", "नज़दीकी कोल्ड स्टोर बुक करें")} />
      <div className="card-classic mb-3 overflow-hidden p-2">
        {mounted ? <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}><ColdMap rooms={list} me={here} onPick={setHub} /></Suspense> : <div className="h-64 rounded-lg bg-muted" />}
      </div>
      <div className="relative mb-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className={inputCls + " pl-9"} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Village, town, district or PIN", "गाँव, शहर या पिन")} /></div>
      <Btn v="outline" className="mb-2 w-full" onClick={locate}><LocateFixed className="h-4 w-4" />{t("Use My Location (GPS)", "मेरा स्थान")}</Btn>
      {gpsMsg && <p className="mb-2 text-xs text-success">{gpsMsg}</p>}
      <div className="mb-4 flex flex-wrap gap-2">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setFl(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${fl === k ? "border-primary/30 bg-accent text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>)}</div>
      <div className="space-y-3">
        {rooms.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!rooms.isLoading && list.length === 0 && <p className="card-classic p-4 text-center text-sm text-muted-foreground">{t("No cold rooms match. Try another search.", "कोई कोल्ड रूम नहीं मिला")}</p>}
        {list.map((h) => (
          <div key={h.id} className="card-classic p-4">
            <div className="flex items-start justify-between gap-2"><div><h3 className="text-base font-semibold text-foreground">{s.lang === "hi" && h.name_hi ? h.name_hi : h.name}</h3><p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{h.address}, {h.district} · {h.pin} · <b>{h.km.toFixed(1)} km</b></p></div><div className="text-right"><p className="text-lg font-bold text-primary">₹{h.rate_per_crate_day}</p><p className="text-[0.65rem] text-muted-foreground">/crate/day</p></div></div>
            <div className="my-3 grid grid-cols-3 gap-2 rounded-lg bg-popover p-2 text-center text-xs">
              <div><Thermometer className="mx-auto h-4 w-4 text-primary-2" /><b>{Number(h.temp_c).toFixed(1)}°C</b></div>
              <div><Droplets className="mx-auto h-4 w-4 text-primary-2" /><b>{h.humidity}% RH</b></div>
              <div><span className="block text-base font-bold text-success">{h.free}</span>slots free</div>
            </div>
            <div className="mb-3 flex flex-wrap gap-1">{h.badges.map((b) => <Badge key={b}>{b}</Badge>)}</div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <a className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-3 text-sm font-semibold text-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" />{t("Directions", "रास्ता")}</a>
              <Btn onClick={() => setHub(h)} disabled={h.free < 1}>{t("Book Slot & Pay", "स्लॉट बुक करें")}</Btn>
            </div>
          </div>
        ))}
      </div>
      <MyBookings />
      {hub && <BookModal hub={hub} onClose={() => setHub(null)} />}
    </div>
  );
}

function BookModal({ hub, onClose }: { hub: ColdRoom; onClose: () => void }) {
  const { s, set, t } = useStore();
  const inv = useInvalidate();
  const [crop, setCrop] = useState(s.prefillCrop ?? "tomato");
  const [crates, setCrates] = useState(10);
  const [days, setDays] = useState(1);
  const [mode, setMode] = useState<"upi" | "credit">("upi");
  const [step, setStep] = useState<"form" | "pay" | "pass">("form");
  const [pass, setPass] = useState<Booking | null>(null);
  const [err, setErr] = useState("");
  const total = crates * days * hub.rate_per_crate_day;
  const valid = crates >= 1 && crates <= hub.free && days >= 1 && days <= 60;
  const confirm = async (u?: string, method?: string) => {
    // Amount, pass no., bay and the free-slot check are all decided by the database (create_booking).
    const { data, error } = await supabase.rpc("create_booking", { _cold_room_id: hub.id, _crop: crop, _crates: crates, _days: days, _pay_mode: mode, ...(u ? { _utr: u } : {}), ...(method ? { _pay_method: method } : {}) });
    if (error || !data) { setErr(error?.message ?? "Booking failed"); setStep("form"); inv("cold_rooms"); return; }
    set((x) => ({ ...x, prefillCrop: null })); inv("bookings", "cold_rooms");
    setPass(data); setStep("pass");
  };
  return (
    <Modal open onClose={onClose} title={step === "pass" ? t("Cold Storage Gate Pass", "गेट पास") : hub.name}>
      {step === "form" && (
        <div className="space-y-3">
          <Field label={t("Choose Crop", "फसल चुनें")}><select className={inputCls} value={crop} onChange={(e) => setCrop(e.target.value)}>{CROPS.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.en}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("Number of Crates", "क्रेट संख्या")}><input type="number" min={1} max={hub.free} className={inputCls} value={crates} onChange={(e) => setCrates(Math.max(0, +e.target.value))} /></Field>
            <Field label={t("Duration (days)", "दिन")}><input type="number" min={1} max={60} className={inputCls} value={days} onChange={(e) => setDays(Math.max(0, +e.target.value))} /></Field>
          </div>
          {!valid && <p className="text-xs text-destructive">{t(`Crates 1–${hub.free}, days 1–60`, "मान्य संख्या डालें")}</p>}
          <div className="space-y-2">
            {([["upi", t("Pay Now via UPI", "अभी UPI से भुगतान"), inr(total)], ["credit", t("Pay Later from Harvest Sale (FPO Credit)", "बिक्री से बाद में"), "₹0 upfront"]] as const).map(([k, l, v]) => (
              <button key={k} onClick={() => setMode(k)} className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left text-sm ${mode === k ? "border-primary bg-accent" : "border-border"}`}><span className="font-semibold">{l}</span><b className="text-primary">{v}</b></button>
            ))}
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-sm"><span>{crates} × {days} × ₹{hub.rate_per_crate_day}</span><b className="text-lg text-primary">{inr(total)}</b></div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Btn className="w-full" disabled={!valid} onClick={() => (mode === "upi" ? setStep("pay") : confirm())}>{mode === "upi" ? t("Proceed to UPI", "UPI पर जाएँ") : t("Confirm Booking", "बुकिंग पक्की करें")}</Btn>
        </div>
      )}
      {step === "pay" && <UpiPay amount={total} payee={hub.name} onPaid={(u, m) => confirm(u, m)} />}
      {step === "pass" && pass && <GatePass b={pass} room={hub} />}
    </Modal>
  );
}

export function GatePass({ b, room }: { b: Booking; room?: ColdRoom }) {
  const { data: me } = useMe();
  const rooms = useColdRooms();
  const hub = room ?? rooms.data?.find((h) => h.id === b.cold_room_id);
  return (
    <div className="print-area certificate p-4 text-sm">
      <p className="text-center text-xs text-muted-foreground">FreshGrid gate pass</p>
      <h4 className="text-center text-lg font-semibold text-primary">{hub?.name}</h4>
      <p className="text-center text-xs text-muted-foreground">{hub?.address}, {hub?.district}</p>
      <div className="my-3 flex justify-center"><div className="rounded bg-popover p-2"><QRCodeSVG value={`FG|${b.pass_no}|${b.bay}|${b.crates}|${me?.profile?.fpo_id}`} size={140} fgColor="#1B4332" bgColor="transparent" /></div></div>
      <div className="grid grid-cols-2 gap-y-1"><span>Pass No.</span><b>{b.pass_no}</b><span>Slot / Bay</span><b className="text-success">Bay {b.bay}</b><span>Farmer</span><b>{me?.profile?.full_name}</b><span>Crop</span><b>{cropBy(b.crop).en}</b><span>Crates × Days</span><b>{b.crates} × {b.days}</b><span>Amount</span><b>{inr(b.amount)} {b.paid ? "(Paid)" : "(FPO Credit)"}</b><span>Date</span><b>{b.created_at.slice(0, 10)}</b></div>
      <Btn v="outline" className="mt-3 w-full" onClick={() => window.print()}><Printer className="h-4 w-4" />Print Pass</Btn>
    </div>
  );
}

function MyBookings() {
  const { t } = useStore();
  const bookings = useBookings();
  const [open, setOpen] = useState<Booking | null>(null);
  if (!bookings.data?.length) return null;
  return (
    <div className="mt-6"><Label>{t("Your gate passes", "मेरे गेट पास")}</Label>
      <div className="space-y-2">{bookings.data.map((b) => <button key={b.id} onClick={() => setOpen(b)} className="card-classic flex w-full items-center justify-between px-3 py-2 text-left text-sm"><span>{cropBy(b.crop).emoji} {b.pass_no} · Bay {b.bay} · <span className="text-xs text-muted-foreground">{b.created_at.slice(0, 10)}</span></span><Badge tone={b.paid ? "green" : "amber"}>{b.paid ? "Paid" : "Credit"}</Badge></button>)}</div>
      <Modal open={!!open} onClose={() => setOpen(null)} title="Gate Pass">{open && <GatePass b={open} />}</Modal>
    </div>
  );
}
