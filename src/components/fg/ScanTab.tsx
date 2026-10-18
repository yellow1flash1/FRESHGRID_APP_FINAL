import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Handshake, ScanLine, Snowflake } from "lucide-react";
import * as tmImage from "@teachablemachine/image";
import { supabase } from "@/integrations/supabase/client";
import { CROPS, cropBy, rid, useStore } from "@/lib/store";
import { useInvalidate, useMe, useRate, useScans, type Scan } from "@/lib/data";
import { inr } from "@/lib/income";
import { Badge, Btn, Field, Label, Modal, SectionTitle, inputCls } from "./ui";

export function ScanTab() {
  const { s, set, t, session } = useStore();
  const { data: me } = useMe();
  const scans = useScans();
  const rate = useRate();
  const inv = useInvalidate();
  const [crop, setCrop] = useState("tomato");
  const [cam, setCam] = useState(false);
  const [camErr, setCamErr] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cert, setCert] = useState<Scan | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listed, setListed] = useState(false);
  const [predLabel, setPredLabel] = useState("");
  const vid = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const tmModels = useRef<tmImage.CustomMobileNet[]>([]);
  const tmLoading = useRef<Promise<tmImage.CustomMobileNet[]> | null>(null);
  // Two trained models: apple grader + tomato/potato grader.
  const TM_URLS = [
    "https://teachablemachine.withgoogle.com/models/fkI59uWMx/", // apple
    "https://teachablemachine.withgoogle.com/models/lbYne4pD3/", // tomato & potato
  ];
  const loadModels = () => {
    if (tmModels.current.length) return Promise.resolve(tmModels.current);
    if (!tmLoading.current) {
      tmLoading.current = Promise.all(TM_URLS.map((u) => tmImage.load(u + "model.json", u + "metadata.json"))).then((ms) => { tmModels.current = ms; return ms; });
    }
    return tmLoading.current;
  };
  const stop = () => { stream.current?.getTracks().forEach((x) => x.stop()); stream.current = null; setCam(false); };
  useEffect(() => stop, []);
  const startCam = async () => {
    setCamErr("");
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.current = st; setCam(true);
      setTimeout(() => { if (vid.current) { vid.current.srcObject = st; vid.current.play().catch(() => {}); } }, 50);
    } catch { setCamErr(t("Camera unavailable — using simulated scan", "कैमरा उपलब्ध नहीं — सिमुलेशन मोड")); }
  };
  const scan = () => {
    setCert(null); setListed(false); setScanning(true); setCamErr("");
    setTimeout(async () => {
      let grade = "B"; let confidence = 0; let label = ""; let finalCrop = crop;
      let usedModel = false;
      if (cam && vid.current) {
        try {
          const model = await loadModels();
          // Predict with every model, keep the most confident result across both.
          let best: { className: string; probability: number } | null = null;
          for (const m of model) {
            const preds = await m.predict(vid.current);
            const top = preds.reduce((a, b) => (b.probability > a.probability ? b : a));
            if (!best || top.probability > best.probability) best = top;
          }
          if (!best) throw new Error("no prediction");
          label = best.className; confidence = Math.round(best.probability * 100); usedModel = true;
          setPredLabel(`${label} · ${confidence}%`);
          const L = label.toLowerCase().trim();
          // Class names from the two Teachable Machine models:
          // apple:   "grade a apple", "grade b or c apple"
          // tomato:  "grade a tomato", "grade b tomato", "grade c tomato", "others"
          // potato:  "potato good condition", "potato grade b bad condition", "potato grade c bad conditon"
          let detectedCrop: string | null = null;
          if (L === "grade a apple") { detectedCrop = "apple"; grade = "A"; }
          else if (L === "grade b or c apple") { detectedCrop = "apple"; grade = confidence >= 80 ? "B" : "C"; }
          else if (L === "grade a tomato") { detectedCrop = "tomato"; grade = "A"; }
          else if (L === "grade b tomato") { detectedCrop = "tomato"; grade = "B"; }
          else if (L === "grade c tomato" || L === "class 3") { detectedCrop = "tomato"; grade = "C"; }
          else if (L === "potato good condition") { detectedCrop = "potato"; grade = "A"; }
          else if (L === "potato grade b bad condition") { detectedCrop = "potato"; grade = "B"; }
          else if (L.startsWith("potato grade c")) { detectedCrop = "potato"; grade = "C"; }
          else grade = confidence >= 90 ? "A" : confidence >= 75 ? "B" : "C"; // "others" or unknown
          if (detectedCrop && detectedCrop !== crop) { setCrop(detectedCrop); finalCrop = detectedCrop; }
        } catch {
          setCamErr(t("AI model failed to load — using simulated scan", "एआई मॉडल नहीं चला — सिमुलेशन मोड"));
        }
      }
      if (!usedModel) {
        const r = Math.random(); grade = r > 0.25 ? "A" : r > 0.08 ? "B" : "C";
        confidence = grade === "A" ? 94 : grade === "B" ? 88 : 81;
      }
      const row = { farmer_id: session!.user.id, batch_code: rid("#FG-CR-"), crop: finalCrop, grade, confidence, uniformity: grade === "A" ? 91 : grade === "B" ? 82 : 70, spoilage: grade === "A" ? "Low (<3%)" : grade === "B" ? "Moderate (5–8%)" : "High (>12%)", shelf_no: grade === "A" ? 3 : 2, shelf_cold: grade === "A" ? 18 : grade === "B" ? 12 : 6 };
      const { data, error } = await supabase.from("scans").insert(row).select().single();
      setScanning(false);
      if (error) return setCamErr(error.message);
      setCert(data); inv("scans");
      if (label) setCamErr("");
    }, 2500);
  };
  return (
    <div>
      <SectionTitle title={t("Scan Crate", "क्रेट स्कैन")} sub={t("Quality grading before storage or sale", "भंडारण या बिक्री से पहले गुणवत्ता जाँच")} />
      <Label>{t("Choose crop", "फसल चुनें")}</Label>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {CROPS.map((x) => { const r = rate(x.key, x.rate); return (
          <button key={x.key} onClick={() => setCrop(x.key)} className={`card-classic p-2.5 text-center transition ${crop === x.key ? "ring-2 ring-primary" : ""}`}>
            <div className="text-3xl">{x.emoji}</div>
            <p className="text-sm font-bold text-primary">{s.lang === "hi" ? x.hi : x.en}</p>
            <p className="text-xs font-semibold text-success">₹{r.rate}/kg{r.live ? "" : "*"}</p>
            <p className="text-[0.65rem] text-muted-foreground">❄ {x.temp}</p>
          </button>); })}
      </div>
      <p className="-mt-3 mb-4 text-[0.65rem] text-muted-foreground">{rate("tomato", 0).live ? t("Prices: today's Agmarknet mandi modal price", "आज का मंडी भाव") : t("* Indicative price — live mandi prices not connected yet", "* अनुमानित भाव")}</p>
      <div className="card-classic overflow-hidden p-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-primary">
          {cam ? <video ref={vid} muted playsInline className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-8xl opacity-90">{cropBy(crop).emoji}{cropBy(crop).emoji}</div>}
          <div className="pointer-events-none absolute inset-5 rounded border border-dashed border-white/30">
            {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "left-0 bottom-0 border-l-4 border-b-4", "right-0 bottom-0 border-r-4 border-b-4"].map((p) => <span key={p} className={`absolute h-6 w-6 border-border ${p}`} />)}
            {scanning && <span className="animate-laser absolute inset-x-0 h-0.5 bg-gold shadow-[0_0_8px_1px] shadow-gold/60" />}
          </div>
          <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-[0.65rem] font-bold text-primary">{cam ? "● Live camera" : "Simulated view"}</span>
          {predLabel && <span className="absolute right-2 top-2 rounded bg-background/90 px-2 py-0.5 text-[0.65rem] font-bold text-success">AI: {predLabel}</span>}
          {scanning && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-background/90 px-3 py-1 text-xs font-bold text-primary">{t("Analysing colour, size, bruises…", "जाँच हो रही है…")}</span>}
        </div>
        {camErr && <p className="mt-2 text-xs text-warning">{camErr}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {cam ? <Btn v="outline" onClick={stop}><CameraOff className="h-4 w-4" />{t("Stop Camera", "कैमरा बंद")}</Btn> : <Btn v="outline" onClick={startCam}><Camera className="h-4 w-4" />{t("Use Camera", "कैमरा")}</Btn>}
          <Btn onClick={scan} disabled={scanning}><ScanLine className="h-4 w-4" />{scanning ? "…" : cam ? t("Start Scan", "स्कैन शुरू") : t("Simulate Crate Scan", "सिमुलेट स्कैन")}</Btn>
        </div>
      </div>
      {cert && (
        <div className="certificate relative mt-5 p-5">
          <div className="text-center"><p className="text-xs text-muted-foreground">FreshGrid quality check</p><h3 className="text-xl font-semibold text-primary">{t("Crate Quality Certificate", "गुणवत्ता प्रमाणपत्र")}</h3><p className="text-xs text-muted-foreground">Batch ID: <b>{cert.batch_code}</b> · {cert.created_at.slice(0, 10)} · {cropBy(cert.crop).en} · {me?.profile?.full_name}</p></div>
          <span className={`stamp absolute right-4 top-4 px-2 py-1 ${cert.grade === "C" ? "!bg-destructive/10 !text-destructive" : cert.grade === "B" ? "!bg-warning/10 !text-warning" : ""}`}>Grade {cert.grade}</span>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Row k="Detected Grade" v={`Grade ${cert.grade} ${cert.grade === "A" ? "(Export/Retail)" : cert.grade === "B" ? "(Retail/Local)" : "(Processing)"}`} />
            <Row k="Confidence" v={`${cert.confidence}%`} /><Row k="Uniformity" v={`${cert.uniformity}%`} /><Row k="Spoilage Risk" v={cert.spoilage} />
            <Row k="Shelf-life (no cooling)" v={`${cert.shelf_no} days`} /><Row k="With Cold Room" v={`${cert.shelf_cold} days`} green />
          </dl>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Btn onClick={() => set((x) => ({ ...x, prefillCrop: cert.crop, tab: "cold" }))}><Snowflake className="h-4 w-4" />{t("Reserve Cold Room", "कोल्ड रूम बुक करें")}</Btn>
            <Btn v="gold" onClick={() => setListOpen(true)} disabled={listed}><Handshake className="h-4 w-4" />{listed ? t("Listed for buyers", "सूचीबद्ध") : t("List for Buyer Sale", "खरीदार को बेचें")}</Btn>
          </div>
          {listed && <button onClick={() => set((x) => ({ ...x, tab: "pay" }))} className="mt-2 w-full text-center text-xs font-semibold text-primary underline">{t("Open Payments & Khata →", "भुगतान देखें →")}</button>}
        </div>
      )}
      {cert && <ListLotModal open={listOpen} onClose={() => setListOpen(false)} crop={cert.crop} grade={cert.grade} onDone={() => { setListOpen(false); setListed(true); }} />}
      <div className="mt-6"><Label>{t("Recent scans", "हाल के स्कैन")}</Label>
        {scans.data?.length === 0 && <p className="text-xs text-muted-foreground">{t("No scans yet.", "अभी कोई स्कैन नहीं।")}</p>}
        <div className="space-y-2">{scans.data?.slice(0, 5).map((x) => <div key={x.id} className="card-classic flex items-center justify-between px-3 py-2 text-sm"><span>{cropBy(x.crop).emoji} {x.batch_code} · <span className="text-xs text-muted-foreground">{x.created_at.slice(0, 10)}</span></span><Badge tone={x.grade === "A" ? "green" : x.grade === "B" ? "amber" : "red"}>Grade {x.grade}</Badge></div>)}</div>
      </div>
    </div>
  );
}

export function ListLotModal({ open, onClose, crop, grade, onDone, preset }: { open: boolean; onClose: () => void; crop: string; grade: string; onDone: () => void; preset?: { kg: number; price: number; cold: number; transport: number } }) {
  const { t, session } = useStore();
  const { data: me } = useMe();
  const rate = useRate();
  const inv = useInvalidate();
  const [kg, setKg] = useState(preset?.kg ?? 200);
  const [price, setPrice] = useState(preset?.price ?? rate(crop, cropBy(crop).rate).rate);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const gross = Math.round(kg * price);
  const cold = preset?.cold ?? 0; const transport = preset?.transport ?? Math.round(kg * 2.2);
  const net = gross - cold - transport;
  const submit = async () => {
    if (kg < 1 || kg > 100000 || price <= 0 || price > 1000) return setErr(t("Enter a valid quantity and price", "सही मात्रा और भाव डालें"));
    setBusy(true);
    // lot_code, farmer name/district, gross and net are recomputed by the lots_before_insert trigger;
    // the values sent here are only for display consistency and are ignored by the database.
    const { error } = await supabase.from("lots").insert({ lot_code: rid("LOT-"), farmer_id: session!.user.id, farmer_name: me?.profile?.full_name ?? "Farmer", farmer_district: me?.profile?.district ?? null, crop, kg, grade, price_per_kg: price, gross, cold_deduction: cold, transport_deduction: transport, net_amount: net });
    setBusy(false);
    if (error) return setErr(error.message);
    inv("lots"); onDone();
  };
  return (
    <Modal open={open} onClose={onClose} title={t("List lot for buyers", "खरीदारों के लिए लॉट")}>
      <div className="space-y-3">
        <p className="text-sm">{cropBy(crop).emoji} {cropBy(crop).en} · Grade {grade}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("Quantity (kg)", "मात्रा")}><input type="number" className={inputCls} value={kg} onChange={(e) => setKg(Math.max(0, +e.target.value))} /></Field>
          <Field label={t("Asking price ₹/kg", "भाव")}><input type="number" className={inputCls} value={price} onChange={(e) => setPrice(Math.max(0, +e.target.value))} /></Field>
        </div>
        <div className="rounded-lg bg-popover p-3 text-xs"><div className="flex justify-between"><span>Gross</span><b>{inr(gross)}</b></div><div className="flex justify-between"><span>Cold room deduction</span><span>− {inr(cold)}</span></div><div className="flex justify-between"><span>Pooled transport (₹2.2/kg)</span><span>− {inr(transport)}</span></div><div className="mt-1 flex justify-between border-t border-border pt-1 text-sm"><span>Your net payout</span><b className="text-success">{inr(net)}</b></div></div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Btn className="w-full" onClick={submit} disabled={busy}>{t("Publish to Buyer Market", "बाज़ार में डालें")}</Btn>
        <p className="text-center text-[0.65rem] text-muted-foreground">{t("Registered buyers can see this lot and place an order into escrow.", "पंजीकृत खरीदार यह लॉट देख सकेंगे।")}</p>
      </div>
    </Modal>
  );
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return <div className="border-b border-dotted border-border pb-1"><dt className="text-xs text-muted-foreground">{k}</dt><dd className={`font-bold ${green ? "text-success" : "text-primary"}`}>{v}</dd></div>;
}
