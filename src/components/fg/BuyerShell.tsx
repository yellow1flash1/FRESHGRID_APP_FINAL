import { useState } from "react";
import { CheckCircle2, PackageCheck, ShoppingBasket } from "lucide-react";
import { api } from "@/lib/api";
import { cropBy, useStore } from "@/lib/store";
import { CropSelect } from "./CropSelect";
import { useInvalidate, useLots, useRate, useSettings, type Lot } from "@/lib/data";
import { inr } from "@/lib/income";
import { Badge, Btn, Modal, SectionTitle, inputCls } from "./ui";
import { TopBar } from "./TopBar";
import { UpiPay } from "./UpiPay";
import { RatePrompt, RepsProvider, UserRep } from "./KrishiSaakh";

export function BuyerShell() {
  const { s, t, session } = useStore();
  const lots = useLots();
  const rate = useRate();
  const inv = useInvalidate();
  const [tab, setTab] = useState<"market" | "orders">("market");
  const [crop, setCrop] = useState("all");
  const [buy, setBuy] = useState<Lot | null>(null);
  const [confirm, setConfirm] = useState<Lot | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const all = lots.data ?? [];
  const prefs = useSettings().data?.settings;
  const liked = (l: Lot) =>
    (prefs?.buyCrops?.includes(l.crop) ? 2 : 0) +
    (l.farmer_district && prefs?.buyDistricts?.includes(l.farmer_district) ? 1 : 0);
  // Lots matching the buyer's crops and districts (Settings) come first.
  const market = all
    .filter((l) => l.status === "open" && (crop === "all" || l.crop === crop))
    .sort((a, b) => liked(b) - liked(a));
  const mine = all.filter((l) => l.buyer_id === session?.user.id);
  const desktop = s.mode === "desktop";

  const order = async (l: Lot) => {
    const { error } = await api.placeOrder(l.id);
    setBuy(null);
    if (error) return setErr(error.message);
    inv("lots");
    setTab("orders");
  };
  const confirmDelivery = async () => {
    if (!confirm) return;
    setErr("");
    // The code is checked in the database; the buyer's app never sees the real code.
    const { data, error } = await api.confirmDelivery(confirm.id, code.trim());
    if (error) return setErr(error.message);
    const r = data as {
      status: "ok" | "wrong_code" | "locked";
      utr?: string;
      attempts_left?: number;
    };
    if (r.status === "wrong_code")
      return setErr(
        t(
          `Wrong code — ${r.attempts_left} attempt(s) left`,
          `गलत कोड — ${r.attempts_left} कोशिश बाकी`,
        ),
      );
    if (r.status === "locked")
      return setErr(
        t(
          "Too many wrong attempts. Ask the farmer to generate a new code.",
          "बहुत गलत कोशिशें। किसान से नया कोड बनवाएँ।",
        ),
      );
    setDone(r.utr ?? "");
    inv("lots");
  };

  return (
    <RepsProvider ids={(lots.data ?? []).map((l) => l.farmer_id)}>
      <div className="min-h-screen">
        <TopBar />
        <div className={`mx-auto px-4 py-4 ${desktop ? "max-w-5xl" : "max-w-lg"}`}>
          <RatePrompt />
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
            {(
              [
                ["market", ShoppingBasket, t("Market", "बाज़ार")],
                ["orders", PackageCheck, t("My Orders", "मेरे ऑर्डर")],
              ] as const
            ).map(([k, I, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex items-center justify-center gap-1 rounded-md py-2 text-sm font-medium ${tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <I className="h-4 w-4" />
                {l}
              </button>
            ))}
          </div>
          {err && (
            <p className="mb-3 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </p>
          )}
          {tab === "market" && (
            <>
              <SectionTitle
                icon={ShoppingBasket}
                title={t("Graded Lots from Farmers", "किसानों के लॉट")}
                sub={t(
                  "Orders are paid into escrow and released to the farmer on delivery",
                  "भुगतान डिलीवरी पर जारी",
                )}
              />
              <CropSelect className="mb-4" value={crop} onChange={setCrop} allowAll />
              {market.length === 0 && (
                <p className="card-classic p-4 text-sm text-muted-foreground">
                  {t(
                    "No open lots right now. New lots appear here instantly when farmers list them.",
                    "अभी कोई लॉट नहीं।",
                  )}
                </p>
              )}
              <div className={`grid gap-3 ${desktop ? "grid-cols-2" : ""}`}>
                {market.map((l) => {
                  const m = rate(l.crop, 0);
                  const total = Math.round(l.kg * Number(l.price_per_kg));
                  return (
                    <div key={l.id} className="card-classic p-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-lg font-bold text-primary">
                            {cropBy(l.crop).emoji} {cropBy(l.crop).en} ·{" "}
                            {l.kg.toLocaleString("en-IN")} kg
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {l.farmer_name} · {l.farmer_district} · {l.lot_code}
                          </p>
                          <div className="mt-1">
                            <UserRep id={l.farmer_id} flow={2} />
                          </div>
                        </div>
                        <Badge tone={l.grade === "A" ? "green" : l.grade === "B" ? "amber" : "red"}>
                          Grade {l.grade}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-sm">₹{Number(l.price_per_kg)}/kg</p>
                          {m.live && (
                            <p className="text-[0.65rem] text-muted-foreground">
                              Mandi today: ₹{m.rate}/kg
                            </p>
                          )}
                        </div>
                        <p className="text-xl font-semibold text-primary">{inr(total)}</p>
                      </div>
                      <Btn
                        className="mt-3 w-full"
                        onClick={() => {
                          setErr("");
                          setBuy(l);
                        }}
                      >
                        {t("Order & Pay into Escrow", "ऑर्डर करें")}
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {tab === "orders" && (
            <>
              <SectionTitle
                icon={PackageCheck}
                title={t("My Orders", "मेरे ऑर्डर")}
                sub={t(
                  "Confirm delivery with the farmer's code to release payment",
                  "डिलीवरी कोड से भुगतान जारी करें",
                )}
              />
              {mine.length === 0 && (
                <p className="card-classic p-4 text-sm text-muted-foreground">
                  {t("No orders yet.", "अभी कोई ऑर्डर नहीं।")}
                </p>
              )}
              <div className="space-y-3">
                {mine.map((l) => (
                  <div key={l.id} className="card-classic p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold text-primary">
                          {cropBy(l.crop).emoji} {l.kg.toLocaleString("en-IN")} kg{" "}
                          {cropBy(l.crop).en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.farmer_name} · {l.lot_code}
                        </p>
                      </div>
                      <Badge tone={l.status === "settled" ? "green" : "amber"}>
                        {l.status === "settled"
                          ? t("Delivered", "डिलीवर")
                          : t("Awaiting delivery", "डिलीवरी बाकी")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm">
                      {inr(Math.round(l.kg * Number(l.price_per_kg)))}
                      {l.utr ? ` · Ref ${l.utr}` : ""}
                    </p>
                    {l.status === "escrow" && (
                      <Btn
                        className="mt-3 w-full"
                        onClick={() => {
                          setErr("");
                          setCode("");
                          setDone(null);
                          setConfirm(l);
                        }}
                      >
                        {t("Confirm Delivery & Release Payment", "डिलीवरी पक्की करें")}
                      </Btn>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <Modal
          open={!!buy}
          onClose={() => setBuy(null)}
          title={t("Pay into Escrow", "एस्क्रो भुगतान")}
        >
          {buy && (
            <UpiPay
              amount={Math.round(buy.kg * Number(buy.price_per_kg))}
              payee={`Escrow · ${buy.farmer_name}`}
              onPaid={() => order(buy)}
            />
          )}
        </Modal>
        <Modal
          open={!!confirm}
          onClose={() => setConfirm(null)}
          title={t("Confirm Delivery", "डिलीवरी पुष्टि")}
        >
          {confirm &&
            (done ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
                <p className="mt-2 text-xl font-bold text-success">
                  {t("Payment released to farmer", "किसान को भुगतान जारी")}
                </p>
                <p className="font-mono text-sm">Ref: {done}</p>
                <Btn className="mt-4 w-full" onClick={() => setConfirm(null)}>
                  Done
                </Btn>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  {t(
                    "Ask the farmer for the 6-digit delivery code shown in their app:",
                    "किसान से 6 अंकों का डिलीवरी कोड लें:",
                  )}
                </p>
                <input
                  className={inputCls + " font-mono tracking-[0.3em]"}
                  inputMode="numeric"
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
                {err && <p className="text-xs text-destructive">{err}</p>}
                <Btn className="w-full" onClick={confirmDelivery}>
                  {t("Confirm & Release", "पुष्टि करें")}
                </Btn>
              </div>
            ))}
        </Modal>
      </div>
    </RepsProvider>
  );
}
