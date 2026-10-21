import { useMemo } from "react";
import {
  BellRing,
  ChevronRight,
  Home,
  IndianRupee,
  ScanLine,
  Snowflake,
  Sprout,
  Truck,
} from "lucide-react";
import { cropBy, useStore, type Tab } from "@/lib/store";
import {
  useBookings,
  useColdRooms,
  useFarm,
  useLots,
  useMe,
  useRate,
  useSettings,
  useTransports,
} from "@/lib/data";
import { inr } from "@/lib/income";
import { pickCards, scoreFarm } from "@/lib/fasalniti";
import { Badge, Empty, SectionTitle } from "./ui";
import { RatePrompt } from "./KrishiSaakh";

const DAY = 86_400_000;

/** Farmer home: quick actions, today's prices, alerts and everything in progress, at a glance. */
export function HomeTab() {
  const { s, set, t } = useStore();
  const { data: me } = useMe();
  const st = useSettings();
  const rate = useRate();
  const bookings = useBookings();
  const trips = useTransports();
  const lots = useLots();
  const farm = useFarm();
  const rooms = useColdRooms();
  const go = (tab: Tab) => {
    set((x) => ({ ...x, tab }));
    window.scrollTo({ top: 0 });
  };
  const name = (k: string) => (s.lang === "hi" ? cropBy(k).hi : cropBy(k).en);

  const settings = st.data?.settings ?? {};
  const myCrops = settings.crops?.length ? settings.crops : ["tomato", "potato", "apple"];
  const prices = myCrops.slice(0, 6).map((k) => ({ k, ...rate(k, cropBy(k).rate) }));
  const alerts = (settings.priceAlerts ?? [])
    .map((a) => ({ a, r: rate(a.crop, 0) }))
    .filter(({ a, r }) => r.live && (a.dir === "above" ? r.rate >= a.price : r.rate <= a.price));

  const uid = me?.profile?.id;
  const activeBookings = (bookings.data ?? []).filter(
    (b) => new Date(b.created_at).getTime() + b.days * DAY > Date.now(),
  );
  const activeTrips = (trips.data ?? []).filter(
    (x) => x.status === "requested" || x.status === "assigned" || x.status === "in_transit",
  );
  const myLots = (lots.data ?? []).filter((l) => l.farmer_id === uid);
  const escrow = myLots.filter((l) => l.status === "escrow").reduce((a, l) => a + l.net_amount, 0);
  const dues = (bookings.data ?? []).filter((b) => !b.paid).reduce((a, b) => a + b.amount, 0);

  const pick = useMemo(() => {
    const f = farm.data;
    if (!f) return null;
    const near = (rooms.data ?? []).some((r) => r.district === me?.profile?.district);
    const res = scoreFarm({
      sowDate: f.sowDate,
      acres: f.acres,
      budget: f.budget,
      waterMm: f.waterMm,
      deficitPct: 0,
      surgePct: 0,
      ph: f.ph ?? 7.5,
      ec: f.ec ?? 1,
      prevCrop: f.prevCrop,
      gammaInfra: f.coldNearby === "yes" ? 1.2 : f.coldNearby === "no" ? 0.8 : near ? 1.1 : 0.9,
    });
    return pickCards(res).safe;
  }, [farm.data, rooms.data, me?.profile?.district]);

  const actions: [Tab, typeof ScanLine, string, string, string][] = [
    [
      "scan",
      ScanLine,
      t("Scan crate", "क्रेट स्कैन"),
      t("AI grade", "एआई ग्रेड"),
      "bg-accent text-primary",
    ],
    [
      "cold",
      Snowflake,
      t("Cold room", "कोल्ड रूम"),
      t("Book storage", "भंडारण बुक"),
      "bg-navy-soft text-navy",
    ],
    [
      "transport",
      Truck,
      t("Book truck", "ट्रक बुक"),
      t("Farm to mandi", "खेत से मंडी"),
      "bg-saffron-soft text-saffron-strong",
    ],
    [
      "pay",
      IndianRupee,
      t("Money", "पैसा"),
      t("Sales and dues", "बिक्री और बकाया"),
      "bg-accent text-primary",
    ],
  ];

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={Home}
        title={t(
          `Namaste${me?.profile?.full_name ? `, ${me.profile.full_name.split(" ")[0]}` : ""}`,
          `नमस्ते${me?.profile?.full_name ? `, ${me.profile.full_name.split(" ")[0]}` : ""}`,
        )}
        sub={t("Everything about your harvest, in one place", "आपकी फसल की हर जानकारी, एक जगह")}
      />
      <RatePrompt />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map(([k, I, l, d, c]) => (
          <button
            key={k}
            onClick={() => go(k)}
            className="card-classic flex min-h-24 flex-col items-start gap-2 p-3 text-left transition hover:border-primary/40"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-md ${c}`}>
              <I className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{l}</span>
              <span className="block text-xs text-muted-foreground">{d}</span>
            </span>
          </button>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(({ a, r }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-saffron bg-saffron-soft p-3 text-sm"
            >
              <BellRing className="h-5 w-5 shrink-0 text-saffron-strong" />
              <span className="flex-1 text-foreground">
                <b>
                  {cropBy(a.crop).emoji} {name(a.crop)} ₹{r.rate}/kg
                </b>{" "}
                {t(
                  `at ${r.market} is ${a.dir} your ₹${a.price} alert`,
                  `${r.market} में आपके ₹${a.price} अलर्ट से ${a.dir === "above" ? "ऊपर" : "नीचे"}`,
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card-classic p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-foreground">
            {t("Today's mandi prices", "आज के मंडी भाव")}
          </p>
          <span className="text-[0.68rem] text-muted-foreground">
            {prices.some((p) => p.live) ? "Agmarknet" : t("indicative", "अनुमानित")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {prices.map((p) => (
            <div key={p.k} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
              <span className="text-2xl">{cropBy(p.k).emoji}</span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  ₹{p.rate}
                  <span className="text-xs font-normal">/kg</span>
                </span>
                <span className="block text-xs text-muted-foreground">{name(p.k)}</span>
              </span>
            </div>
          ))}
        </div>
        {!settings.crops?.length && (
          <p className="mt-2 text-[0.68rem] text-muted-foreground">
            {t(
              "Choose your crops in Settings → My farm.",
              "अपनी फसलें सेटिंग → मेरा खेत में चुनें।",
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            [t("In escrow", "एस्क्रो में"), inr(escrow), "pay"],
            [t("Storage dues", "भंडारण बकाया"), inr(dues), "pay"],
            [t("Active trips", "चालू ट्रिप"), String(activeTrips.length), "transport"],
          ] as const
        ).map(([l, v, tab]) => (
          <button
            key={l}
            onClick={() => go(tab)}
            className="card-classic p-3 text-center hover:border-primary/40"
          >
            <b className="block text-base text-foreground">{v}</b>
            <span className="text-[0.7rem] text-muted-foreground">{l}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => go("fasal")}
        className="card-classic flex w-full items-center gap-3 border-l-4 border-l-primary-2 p-4 text-left hover:border-primary/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          <Sprout className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block text-xs font-medium text-primary">FasalNiti</span>
          {pick ? (
            <span className="block text-sm text-foreground">
              {t("Safest crop for you now:", "अभी आपके लिए सबसे सुरक्षित फसल:")}{" "}
              <b>
                {pick.emoji} {t(pick.en, pick.hi)}
              </b>{" "}
              <Badge tone="green">{pick.total.safe.toFixed(0)}/100</Badge>
            </span>
          ) : (
            <span className="block text-sm text-foreground">
              {t(
                "Tell us about your farm to see what to sow this season",
                "इस मौसम क्या बोएँ, यह जानने के लिए अपने खेत के बारे में बताएँ",
              )}
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {t("In progress", "चल रहा है")}
        </p>
        {activeBookings.length + activeTrips.length === 0 ? (
          <Empty
            icon={Snowflake}
            title={t("Nothing in progress", "अभी कुछ नहीं चल रहा")}
            sub={t(
              "Book a cold room or a truck and it will show up here.",
              "कोल्ड रूम या ट्रक बुक करें, यहाँ दिखेगा।",
            )}
          />
        ) : (
          <div className="card-classic divide-y divide-border">
            {activeBookings.slice(0, 3).map((b) => (
              <button
                key={b.id}
                onClick={() => go("cold")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary/60"
              >
                <Snowflake className="h-4 w-4 text-navy" />
                <span className="flex-1">
                  {b.pass_no} · {b.crates} {t("crates", "क्रेट")} {cropBy(b.crop).emoji}
                </span>
                <Badge tone={b.paid ? "green" : "amber"}>
                  {b.paid ? t("Paid", "भुगतान") : t("Due", "बकाया")}
                </Badge>
              </button>
            ))}
            {activeTrips.slice(0, 3).map((x) => (
              <button
                key={x.id}
                onClick={() => go("transport")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary/60"
              >
                <Truck className="h-4 w-4 text-saffron-strong" />
                <span className="flex-1">
                  {x.trip_code} · {x.from_district} → {x.to_label}
                </span>
                <Badge tone="gold">
                  {x.status === "requested"
                    ? t("Finding driver", "ड्राइवर खोज रहे")
                    : x.status === "assigned"
                      ? t("Driver assigned", "ड्राइवर तय")
                      : t("On the way", "रास्ते में")}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
