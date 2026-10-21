import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Droplets,
  Settings2,
  ShieldCheck,
  Sprout,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useColdRooms, useFarm, useInvalidate, useMandi, useMe } from "@/lib/data";
import type { FarmInput } from "@/lib/app.functions";
import { inr } from "@/lib/income";
import {
  BENCHMARK_PROFILE,
  CATCH_MAX_DAYS,
  PREV_CROPS,
  SUB_KEYS,
  WEIGHTS,
  pickCards,
  scoreBenchmark,
  scoreFarm,
  waterAvail,
  type CardKey,
  type FarmProfile,
  type Scored,
  type SubKey,
} from "@/lib/fasalniti";
import { Badge, Btn, Field, Label, SectionTitle, inputCls } from "./ui";

const CARDS: {
  k: CardKey;
  I: typeof ShieldCheck;
  en: string;
  hi: string;
  descEn: string;
  descHi: string;
}[] = [
  {
    k: "safe",
    I: ShieldCheck,
    en: "Safe & Guaranteed",
    hi: "सुरक्षित और पक्का",
    descEn: "MSP cushion, stable prices, low weather risk",
    descHi: "MSP सहारा, स्थिर भाव, कम मौसम जोखिम",
  },
  {
    k: "profit",
    I: TrendingUp,
    en: "High Profit / Balanced",
    hi: "ज़्यादा मुनाफ़ा / संतुलित",
    descEn: "Best expected net profit with sensible risk",
    descHi: "समझदारी भरे जोखिम के साथ सबसे ज़्यादा मुनाफ़ा",
  },
  {
    k: "catch",
    I: Timer,
    en: "Short-Duration Cash Crop",
    hi: "कम अवधि की नकदी फसल",
    descEn: `Ready in ${CATCH_MAX_DAYS} days or less`,
    descHi: `${CATCH_MAX_DAYS} दिन या कम में तैयार`,
  },
];
const SUB: Record<SubKey, { en: string; hi: string }> = {
  roi: { en: "Net profit", hi: "शुद्ध मुनाफ़ा" },
  climate: { en: "Monsoon & climate", hi: "मानसून व मौसम" },
  market: { en: "Market & MSP", hi: "बाज़ार व MSP" },
  glut: { en: "Anti-glut", hi: "अधिक बुवाई जोखिम" },
  soil: { en: "Soil & rotation", hi: "मिट्टी व फसल चक्र" },
  storage: { en: "Post-harvest", hi: "भंडारण क्षमता" },
};
const GATE: Record<keyof Scored["gates"], { en: string; hi: string }> = {
  season: { en: "Outside sowing window", hi: "बुवाई का समय नहीं" },
  budget: { en: "Inputs cost more than budget", hi: "लागत बजट से ज़्यादा" },
  water: { en: "Not enough water (<70% need)", hi: "पानी कम (<70%)" },
  soil: { en: "Soil pH / salinity unsuitable", hi: "मिट्टी pH / खारापन अनुपयुक्त" },
};

// Typical soil pH by state, used when the farmer picks "I don't know".
const STATE_PH: Record<string, number> = {
  Haryana: 7.8,
  Punjab: 7.8,
  "Uttar Pradesh": 7.5,
  Maharashtra: 7.2,
  Delhi: 7.8,
  Rajasthan: 8.0,
};
const WATER_MM: Record<Exclude<FarmInput["waterSource"], "custom">, number> = {
  rainfed: 180,
  borewell: 400,
  canal: 600,
};

export function FasalNitiTab() {
  const { t } = useStore();
  const { data: me } = useMe();
  const farm = useFarm();
  const rooms = useColdRooms();
  const mandi = useMandi(me?.profile?.state);
  const live = useMemo(
    () => Object.fromEntries((mandi.data?.prices ?? []).map((m) => [m.crop, m.modalPerKg * 100])),
    [mandi.data],
  );
  const nearCold = (rooms.data ?? []).some((r) => r.district === me?.profile?.district);
  const [mode, setMode] = useState<"farm" | "bench">("farm");
  const [card, setCard] = useState<CardKey>("safe");
  const [deficit, setDeficit] = useState(0);
  const [surge, setSurge] = useState(0);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const f = farm.data ?? null;
  const switchMode = (k: "farm" | "bench") => {
    setMode(k);
    setSel(null);
    // the example comes with its own scenario; your farm starts from a normal year
    setDeficit(k === "bench" ? BENCHMARK_PROFILE.deficitPct : 0);
    setSurge(k === "bench" ? BENCHMARK_PROFILE.surgePct : 0);
  };

  const profile: FarmProfile | null = f && {
    sowDate: f.sowDate,
    acres: f.acres,
    budget: f.budget,
    waterMm: f.waterMm,
    deficitPct: deficit,
    surgePct: surge,
    ph: f.ph ?? STATE_PH[me?.profile?.state ?? ""] ?? 7.5,
    ec: f.ec ?? 1,
    prevCrop: f.prevCrop,
    gammaInfra: f.coldNearby === "yes" ? 1.2 : f.coldNearby === "no" ? 0.8 : nearCold ? 1.1 : 0.9,
  };
  const list = useMemo(
    () =>
      mode === "bench"
        ? scoreBenchmark(deficit, surge)
        : profile
          ? scoreFarm(profile, undefined, live)
          : [],
    [mode, deficit, surge, JSON.stringify(profile), live], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const winners = pickCards(list);
  const ranked = useMemo(() => {
    const eligible = (x: Scored) => x.ok && (card !== "catch" || x.maturity <= CATCH_MAX_DAYS);
    return [...list].sort(
      (a, b) => Number(eligible(b)) - Number(eligible(a)) || b.total[card] - a.total[card],
    );
  }, [list, card]);
  const focus = list.find((x) => x.key === sel) ?? winners[card] ?? ranked[0];
  const name = (x: { en: string; hi: string }) => t(x.en, x.hi);
  const acres = mode === "farm" ? (f?.acres ?? 1) : 2;

  const tabs = (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
      {(
        [
          ["farm", t("My farm", "मेरा खेत")],
          ["bench", t("Example: Rabi benchmark", "उदाहरण: रबी बेंचमार्क")],
        ] as const
      ).map(([k, l]) => (
        <button
          key={k}
          onClick={() => switchMode(k)}
          className={`rounded-md py-2 text-sm font-medium ${mode === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
  const header = (
    <SectionTitle
      icon={Sprout}
      title="FasalNiti"
      sub={t(
        "Pre-sowing crop & profit advisor: what to sow this season, and why",
        "बुवाई से पहले फसल व मुनाफ़ा सलाहकार: इस मौसम क्या बोएँ और क्यों",
      )}
    />
  );

  if (mode === "farm" && farm.isLoading)
    return (
      <div className="space-y-5">
        {header}
        {tabs}
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("Loading…", "लोड हो रहा है…")}
        </p>
      </div>
    );
  if (mode === "farm" && farm.isError)
    return (
      <div className="space-y-5">
        {header}
        {tabs}
        <p className="card-classic p-4 text-sm text-destructive">
          {t("Could not load your farm details.", "आपके खेत की जानकारी लोड नहीं हुई।")}{" "}
          {(farm.error as Error)?.message}
        </p>
      </div>
    );
  if (mode === "farm" && (!f || editing))
    return (
      <div className="space-y-5">
        {header}
        {tabs}
        <FarmSetup
          initial={f}
          state={me?.profile?.state ?? null}
          nearCold={nearCold}
          onDone={() => setEditing(false)}
          onCancel={f ? () => setEditing(false) : undefined}
        />
      </div>
    );

  return (
    <div className="space-y-5">
      {header}
      {tabs}

      {/* Profile */}
      <div className={`card-classic p-4 ${mode === "bench" ? "border-dashed" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {mode === "bench" ? (
              <>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Badge tone="muted">{t("Sample data", "नमूना डेटा")}</Badge>
                  {t("Example farm, not your data", "उदाहरण खेत, आपका डेटा नहीं")}
                </p>
                {t(
                  `2 acres · Borewell, ${deficit}% water deficit · Budget ₹22,000/acre · Previous crop: Paddy · Regional alert: potato sowing +${surge}%`,
                  `2 एकड़ · बोरवेल, ${deficit}% पानी कमी · बजट ₹22,000/एकड़ · पिछली फसल: धान · क्षेत्रीय चेतावनी: आलू बुवाई +${surge}%`,
                )}
              </>
            ) : (
              f &&
              profile && (
                <>
                  <p className="mb-1 text-sm font-medium text-foreground">
                    {t("Your farm", "आपका खेत")}
                    {Object.keys(live).length > 0 && (
                      <Badge tone="green">
                        {t(
                          `Live mandi prices for ${Object.keys(live).length} crops`,
                          `${Object.keys(live).length} फसलों के आज के मंडी भाव`,
                        )}
                      </Badge>
                    )}
                  </p>
                  {`${f.acres} ${t("acres", "एकड़")} · ${t("sowing", "बुवाई")} ${f.sowDate} · ₹${f.budget.toLocaleString("en-IN")}/${t("acre", "एकड़")} · ${Math.round(waterAvail(profile))} mm ${t("water", "पानी")} · pH ${profile.ph}${f.ph === null ? ` (${t("typical", "अनुमानित")})` : ""} · ${t("after", "पिछली")} ${name(PREV_CROPS.find((x) => x.key === f.prevCrop) ?? PREV_CROPS[PREV_CROPS.length - 1]!)}`}
                </>
              )
            )}
          </div>
          {mode === "farm" && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-primary"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t("Edit", "बदलें")}
            </button>
          )}
        </div>
      </div>

      {/* Three cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {CARDS.map(({ k, I, en, hi, descEn, descHi }) => {
          const w = winners[k];
          return (
            <button
              key={k}
              onClick={() => {
                setCard(k);
                setSel(w?.key ?? null);
              }}
              className={`card-classic p-4 text-left transition ${card === k ? "ring-2 ring-primary" : "hover:border-primary/40"}`}
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <I className="h-4 w-4" />
                {t(en, hi)}
              </p>
              <p className="mb-2 text-[0.68rem] text-muted-foreground">{t(descEn, descHi)}</p>
              {w ? (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    {w.emoji} {name(w)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-semibold text-foreground">
                      {w.total[k].toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                    {w.glutAlert && (
                      <Badge tone="red">
                        <AlertTriangle className="h-3 w-3" />
                        {t("Red Glut Alert", "अधिक बुवाई चेतावनी")}
                      </Badge>
                    )}
                  </div>
                  {w.profitPerAcre !== null && (
                    <p className="mt-1 text-xs text-success">
                      {t("Est. profit", "अनुमानित मुनाफ़ा")} {inr(w.profitPerAcre)}/
                      {t("acre", "एकड़")} · {inr(Math.round(w.profitPerAcre * acres))}{" "}
                      {t("total", "कुल")}
                    </p>
                  )}
                  <p className="mt-1 text-[0.68rem] text-muted-foreground">
                    {w.maturity} {t("days to harvest", "दिन में कटाई")}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "No crop qualifies for this card right now.",
                    "अभी इस कार्ड के लिए कोई फसल योग्य नहीं।",
                  )}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Simulator */}
      <div className="card-classic space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-foreground">
            {t("Interactive scoring simulator", "स्कोरिंग सिम्युलेटर")}
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 text-xs">
            {CARDS.map(({ k }, i) => (
              <button
                key={k}
                onClick={() => setCard(k)}
                className={`rounded-md px-3 py-1.5 font-medium ${card === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {t(`Card ${i + 1}`, `कार्ड ${i + 1}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider
            label={t("Regional cash-crop over-sowing surge", "क्षेत्र में नकदी फसल की अधिक बुवाई")}
            value={surge}
            max={50}
            onChange={setSurge}
            suffix="%"
          />
          <Slider
            label={t("Monsoon / irrigation water deficit", "मानसून / सिंचाई पानी की कमी")}
            value={deficit}
            max={40}
            onChange={setDeficit}
            suffix="%"
            icon={<Droplets className="h-3.5 w-3.5" />}
          />
        </div>
        <p className="text-[0.68rem] text-muted-foreground">
          {t("Weights", "भार")}:{" "}
          {SUB_KEYS.map(
            (k) => `${t(SUB[k].en, SUB[k].hi)} ${Math.round(WEIGHTS[card][k] * 100)}%`,
          ).join(" · ")}
        </p>

        <div className="space-y-1.5" role="list">
          {ranked.map((x) => {
            const out = !x.ok
              ? Object.entries(x.gates)
                  .filter(([, v]) => !v)
                  .map(([g]) => name(GATE[g as keyof Scored["gates"]]))
                  .join(", ")
              : card === "catch" && x.maturity > CATCH_MAX_DAYS
                ? t(
                    `${x.maturity} days (> ${CATCH_MAX_DAYS})`,
                    `${x.maturity} दिन (> ${CATCH_MAX_DAYS})`,
                  )
                : "";
            const win = winners[card]?.key === x.key;
            const score = out ? 0 : x.total[card];
            return (
              <button
                key={x.key}
                role="listitem"
                onClick={() => setSel(x.key)}
                className={`grid w-full grid-cols-[7.5rem_1fr_3rem] items-center gap-2 rounded-md px-1 py-1 text-left text-xs sm:grid-cols-[10rem_1fr_3.5rem] ${focus?.key === x.key ? "bg-secondary" : "hover:bg-secondary/60"}`}
              >
                <span
                  className={`truncate ${out ? "text-muted-foreground line-through" : "font-medium text-foreground"}`}
                >
                  {x.emoji} {name(x)}
                </span>
                <span className="relative h-5 overflow-hidden rounded bg-secondary">
                  {out ? (
                    <span className="absolute inset-0 flex items-center px-2 text-[0.65rem] text-muted-foreground">
                      {out}
                    </span>
                  ) : (
                    <span
                      className={`absolute inset-y-0 left-0 rounded ${win ? "bg-primary" : x.glutAlert ? "bg-destructive/70" : "bg-primary/45"} transition-all duration-300`}
                      style={{ width: `${score}%` }}
                    />
                  )}
                  {!out && x.glutAlert && (
                    <span className="absolute right-1 top-0.5 rounded bg-destructive px-1 text-[0.6rem] font-semibold text-destructive-foreground">
                      GLUT
                    </span>
                  )}
                </span>
                <span
                  className={`text-right tabular-nums ${win ? "font-semibold text-primary" : "text-foreground"}`}
                >
                  {out ? "—" : score.toFixed(1)}
                  {win && <Check className="ml-0.5 inline h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>

        {focus && <Breakdown x={focus} card={card} />}
      </div>

      <p className="text-[0.68rem] text-muted-foreground">
        {t(
          "Method: 3-stage hybrid MCDA. Stage 1 hard gates (season, budget, water ≥70% of need, soil pH/EC). Stage 2 six 0–100 sub-scores. Stage 3 weighted cards with de-duplication; card 3 only considers crops of 75 days or less. Prices and costs are indicative 2025-26 figures; check with your local KVK before sowing.",
          "तरीका: 3-चरण MCDA। चरण 1 अनिवार्य जाँच (मौसम, बजट, पानी ≥70%, मिट्टी)। चरण 2 छह उप-स्कोर। चरण 3 भारित कार्ड। भाव व लागत 2025-26 के अनुमान हैं; बुवाई से पहले स्थानीय KVK से पुष्टि करें।",
        )}
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  max,
  onChange,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  suffix: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <b className="tabular-nums text-foreground">
          {value}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-primary"
      />
      <span className="flex justify-between text-[0.6rem] text-muted-foreground">
        <span>0{suffix}</span>
        <span>
          {max}
          {suffix}
        </span>
      </span>
    </label>
  );
}

function Breakdown({ x, card }: { x: Scored; card: CardKey }) {
  const { t } = useStore();
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {x.emoji} {t(x.en, x.hi)} · {t("score breakdown", "स्कोर विवरण")}
        </p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(x.gates) as (keyof Scored["gates"])[]).map((g) => (
            <Badge key={g} tone={x.gates[g] ? "green" : "red"}>
              {x.gates[g] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {t(
                { season: "Season", budget: "Budget", water: "Water", soil: "Soil" }[g],
                { season: "मौसम", budget: "बजट", water: "पानी", soil: "मिट्टी" }[g],
              )}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {SUB_KEYS.map((k) => {
          const w = WEIGHTS[card][k];
          return (
            <div key={k} className="grid grid-cols-[7rem_1fr_6.5rem] items-center gap-2 text-xs">
              <span className="text-muted-foreground">{t(SUB[k].en, SUB[k].hi)}</span>
              <span className="h-2 overflow-hidden rounded bg-secondary">
                <span
                  className={`block h-full rounded ${k === "glut" && x.glutAlert ? "bg-destructive" : "bg-primary/70"}`}
                  style={{ width: `${x.sub[k]}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-foreground">
                {x.sub[k].toFixed(0)} × {w.toFixed(2)} = <b>{(x.sub[k] * w).toFixed(1)}</b>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">
        {t("Total", "कुल")}{" "}
        <b className="text-sm text-foreground">
          {x.ok ? x.total[card].toFixed(1) : "0 (gated out)"}
        </b>
      </p>
      {x.glutAlert && (
        <p className="mt-2 flex items-start gap-1.5 rounded bg-destructive/10 p-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t(
            `Red Glut Alert: area is up ${Math.round(x.deltaA * 100)}% over normal in your region. Prices usually crash at harvest when everyone sows the same crop.`,
            `अधिक बुवाई चेतावनी: आपके क्षेत्र में रकबा सामान्य से ${Math.round(x.deltaA * 100)}% ज़्यादा है। सबके एक ही फसल बोने पर कटाई पर भाव गिरते हैं।`,
          )}
        </p>
      )}
    </div>
  );
}

function FarmSetup({
  initial,
  state,
  nearCold,
  onDone,
  onCancel,
}: {
  initial: FarmInput | null;
  state: string | null;
  nearCold: boolean;
  onDone: () => void;
  onCancel?: (() => void) | undefined;
}) {
  const { t } = useStore();
  const inv = useInvalidate();
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const [f, setF] = useState({
    acres: initial ? String(initial.acres) : "",
    budget: initial ? String(initial.budget) : "",
    waterSource: initial?.waterSource ?? ("" as FarmInput["waterSource"] | ""),
    waterMm: initial ? String(initial.waterMm) : "",
    ph: initial?.ph != null ? String(initial.ph) : "",
    phUnknown: initial ? initial.ph === null : false,
    ec: initial?.ec != null ? String(initial.ec) : "",
    ecUnknown: initial ? initial.ec === null : true,
    prevCrop: initial?.prevCrop ?? "",
    sowDate: initial?.sowDate ?? today,
    coldNearby: initial?.coldNearby ?? ("auto" as FarmInput["coldNearby"]),
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const u = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const typicalPh = STATE_PH[state ?? ""] ?? 7.5;

  const save = async () => {
    const acres = parseFloat(f.acres),
      budget = Math.round(parseFloat(f.budget));
    const waterMm =
      f.waterSource === "custom"
        ? Math.round(parseFloat(f.waterMm))
        : f.waterSource
          ? WATER_MM[f.waterSource]
          : NaN;
    const ph = f.phUnknown ? null : parseFloat(f.ph),
      ec = f.ecUnknown ? null : parseFloat(f.ec);
    if (!(acres >= 0.1)) return setErr(t("Enter your land in acres", "ज़मीन एकड़ में डालें"));
    if (!(budget >= 0))
      return setErr(
        t(
          "Enter how much you can spend per acre (cash + KCC)",
          "प्रति एकड़ खर्च की रकम डालें (नकद + KCC)",
        ),
      );
    if (!f.waterSource) return setErr(t("Choose your water source", "पानी का स्रोत चुनें"));
    if (!(waterMm >= 50))
      return setErr(
        t("Enter water available in mm (at least 50)", "पानी mm में डालें (कम से कम 50)"),
      );
    if (ph !== null && !(ph >= 3 && ph <= 11))
      return setErr(
        t(
          "Soil pH should be between 3 and 11, or tick “I don't know”",
          "मिट्टी pH 3 से 11 के बीच हो, या “पता नहीं” चुनें",
        ),
      );
    if (ec !== null && !(ec >= 0 && ec <= 20))
      return setErr(
        t(
          "Water EC should be between 0 and 20, or tick “I don't know”",
          "EC 0 से 20 के बीच हो, या “पता नहीं” चुनें",
        ),
      );
    if (!f.prevCrop)
      return setErr(t("Choose the crop you grew last season", "पिछले मौसम की फसल चुनें"));
    setErr("");
    setBusy(true);
    const r = await api.saveFarm({
      acres,
      budget,
      waterSource: f.waterSource,
      waterMm,
      ph,
      ec,
      prevCrop: f.prevCrop,
      sowDate: f.sowDate,
      coldNearby: f.coldNearby,
    });
    setBusy(false);
    if (r.error) return setErr(r.error.message);
    inv("farm");
    onDone();
  };

  return (
    <div className="card-classic space-y-4 p-4">
      <div>
        <p className="font-semibold text-foreground">
          {initial
            ? t("Edit your farm", "अपने खेत की जानकारी बदलें")
            : t("Tell us about your farm", "अपने खेत के बारे में बताएँ")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t(
            "Takes a minute. We use this only to suggest crops for you, and it is saved to your account.",
            "एक मिनट लगेगा। इसका इस्तेमाल सिर्फ़ आपके लिए फसल सुझाने में होगा, और यह आपके खाते में सेव रहेगा।",
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Land (acres) *", "ज़मीन (एकड़) *")}>
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            step={0.25}
            className={inputCls}
            value={f.acres}
            onChange={(e) => u("acres", e.target.value)}
            placeholder="e.g. 2.5"
          />
        </Field>
        <Field label={t("Money to spend per acre *", "प्रति एकड़ खर्च *")}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            className={inputCls}
            value={f.budget}
            onChange={(e) => u("budget", e.target.value)}
            placeholder={t("cash + KCC, ₹", "नकद + KCC, ₹")}
          />
        </Field>
      </div>
      <div>
        <Label>{t("Water source *", "पानी का स्रोत *")}</Label>
        <div className="flex flex-wrap gap-2">
          {(["rainfed", "borewell", "canal", "custom"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => u("waterSource", k)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${f.waterSource === k ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground"}`}
            >
              {
                {
                  rainfed: t("Rain only", "सिर्फ़ बारिश"),
                  borewell: t("Borewell / tubewell", "बोरवेल / ट्यूबवेल"),
                  canal: t("Canal", "नहर"),
                  custom: t("I know the mm", "mm पता है"),
                }[k]
              }
            </button>
          ))}
        </div>
        {f.waterSource === "custom" && (
          <input
            type="number"
            min={50}
            max={3000}
            className={`${inputCls} mt-2`}
            value={f.waterMm}
            onChange={(e) => u("waterMm", e.target.value)}
            placeholder={t(
              "Rain + irrigation for the season, in mm",
              "मौसम में बारिश + सिंचाई, mm में",
            )}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field label={t("Soil pH", "मिट्टी pH")}>
            <input
              type="number"
              step={0.1}
              min={3}
              max={11}
              disabled={f.phUnknown}
              className={inputCls}
              value={f.phUnknown ? "" : f.ph}
              onChange={(e) => u("ph", e.target.value)}
              placeholder={
                f.phUnknown
                  ? t(`typical ${typicalPh}`, `अनुमानित ${typicalPh}`)
                  : t("from soil health card", "मृदा कार्ड से")
              }
            />
          </Field>
          <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={f.phUnknown}
              onChange={(e) => u("phUnknown", e.target.checked)}
            />
            {t("I don't know", "पता नहीं")}
          </label>
        </div>
        <div>
          <Field label={t("Water salinity EC (dS/m)", "पानी खारापन EC")}>
            <input
              type="number"
              step={0.1}
              min={0}
              max={20}
              disabled={f.ecUnknown}
              className={inputCls}
              value={f.ecUnknown ? "" : f.ec}
              onChange={(e) => u("ec", e.target.value)}
              placeholder={f.ecUnknown ? t("typical 1.0", "अनुमानित 1.0") : ""}
            />
          </Field>
          <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={f.ecUnknown}
              onChange={(e) => u("ecUnknown", e.target.checked)}
            />
            {t("I don't know", "पता नहीं")}
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Last season's crop *", "पिछले मौसम की फसल *")}>
          <select
            className={inputCls}
            value={f.prevCrop}
            onChange={(e) => u("prevCrop", e.target.value)}
          >
            <option value="" disabled>
              {t("Choose", "चुनें")}
            </option>
            {PREV_CROPS.map((c) => (
              <option key={c.key} value={c.key}>
                {t(c.en, c.hi)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Planned sowing date", "बुवाई की तारीख")}>
          <input
            type="date"
            className={inputCls}
            value={f.sowDate}
            onChange={(e) => u("sowDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("Cold storage / FPO nearby", "पास में कोल्ड स्टोर / FPO")}>
        <select
          className={inputCls}
          value={f.coldNearby}
          onChange={(e) => u("coldNearby", e.target.value as FarmInput["coldNearby"])}
        >
          <option value="auto">
            {t(
              `Work it out (${nearCold ? "one is listed in your district" : "none listed in your district"})`,
              `अपने-आप (${nearCold ? "आपके ज़िले में है" : "आपके ज़िले में नहीं"})`,
            )}
          </option>
          <option value="yes">{t("Yes, close by", "हाँ, पास में")}</option>
          <option value="no">{t("No, far away", "नहीं, दूर")}</option>
        </select>
      </Field>
      {err && <p className="text-xs font-semibold text-destructive">{err}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <Btn v="outline" onClick={onCancel}>
            {t("Cancel", "रद्द करें")}
          </Btn>
        )}
        <Btn className="flex-1" disabled={busy} onClick={save}>
          {busy ? "…" : t("Save and show my crops", "सेव करें और मेरी फसलें दिखाएँ")}
        </Btn>
      </div>
    </div>
  );
}
