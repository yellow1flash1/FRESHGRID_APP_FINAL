// FasalNiti: pre-sowing crop & profit advisor.
// 3-stage hybrid MCDA: (1) hard feasibility gates, (2) six 0–100 sub-scores, (3) three weighted
// "cards" with de-duplication. Pure functions only, so the UI and tests can share them.
// Crop numbers are indicative 2025-26 values per acre (₹, quintals, mm); edit them here.

export type SubKey = "roi" | "climate" | "market" | "glut" | "soil" | "storage";
export type CardKey = "safe" | "profit" | "catch";
export const SUB_KEYS: SubKey[] = ["roi", "climate", "market", "glut", "soil", "storage"];

export const WEIGHTS: Record<CardKey, Record<SubKey, number>> = {
  safe: { roi: 0.15, climate: 0.25, market: 0.3, glut: 0.1, soil: 0.1, storage: 0.1 },
  profit: { roi: 0.4, climate: 0.2, market: 0.1, glut: 0.15, soil: 0.1, storage: 0.05 },
  catch: { roi: 0.35, climate: 0.25, market: 0.1, glut: 0.15, soil: 0.1, storage: 0.05 },
};
export const CATCH_MAX_DAYS = 75;
export const GLUT_ALERT = 0.25;

export type Family =
  "cereal" | "legume" | "oilseed" | "tuber" | "allium" | "fibre" | "sugar" | "none";
type MD = `${number}-${number}`; // month-day, e.g. "10-25"

export interface CropParams {
  key: string;
  en: string;
  hi: string;
  emoji: string;
  sow: [MD, MD][]; // sowing windows: earliest → latest viable late-sown date (may wrap the year end)
  iMin: number;
  iCost: number; // ₹/acre: minimum upfront inputs, total cost (seed, NPK, pesticide, irrigation, labour)
  yieldQ: number; // quintals/acre
  msp: number | null;
  wMsp: number;
  spot: number;
  ratio: number; // ₹/qtl; ratio = avg harvest-month / sowing-month price
  wReq: number;
  wOpt: number;
  rShock: number; // mm; probability of a weather shock
  ph: [number, number];
  ecMax: number; // soil pH range, max water salinity (dS/m)
  cv: number;
  mMsp: number; // 5-yr price CV; MSP cushion (1 assured, 0.5 partial, 0 none)
  deltaA: number;
  cash?: boolean; // area over-sowing vs history; cash crops follow the regional surge slider
  dNpk: number;
  family: Family;
  deep: boolean; // fertiliser deficit penalty 0–40; rotation family; deep-rooted
  shelfDays: number;
  maturity: number; // ambient shelf life; days to maturity
}

export interface FarmProfile {
  sowDate: string; // yyyy-mm-dd
  acres: number;
  budget: number; // cash + KCC credit, ₹/acre
  waterMm: number; // projected rain + irrigation capacity in a normal year
  deficitPct: number; // monsoon / irrigation water deficit 0–40
  surgePct: number; // regional cash-crop over-sowing surge 0–50
  ph: number;
  ec: number;
  prevCrop: string; // key from PREV_CROPS
  gammaInfra: number; // 0.8–1.2: cold storage / FPO proximity
}

export const PREV_CROPS: { key: string; en: string; hi: string; family: Family; deep: boolean }[] =
  [
    { key: "paddy", en: "Paddy", hi: "धान", family: "cereal", deep: false },
    { key: "wheat", en: "Wheat", hi: "गेहूँ", family: "cereal", deep: false },
    { key: "maize", en: "Maize", hi: "मक्का", family: "cereal", deep: false },
    { key: "bajra", en: "Bajra", hi: "बाजरा", family: "cereal", deep: false },
    { key: "cotton", en: "Cotton", hi: "कपास", family: "fibre", deep: true },
    { key: "soybean", en: "Soybean", hi: "सोयाबीन", family: "legume", deep: true },
    { key: "moong", en: "Moong", hi: "मूँग", family: "legume", deep: false },
    { key: "mustard", en: "Mustard", hi: "सरसों", family: "oilseed", deep: true },
    { key: "potato", en: "Potato", hi: "आलू", family: "tuber", deep: false },
    { key: "sugarcane", en: "Sugarcane", hi: "गन्ना", family: "sugar", deep: true },
    { key: "fallow", en: "Fallow / none", hi: "परती / कुछ नहीं", family: "none", deep: false },
  ];

export const FARM_CROPS: CropParams[] = [
  {
    key: "wheat",
    en: "Wheat (HD-3086)",
    hi: "गेहूँ (HD-3086)",
    emoji: "🌾",
    sow: [["10-25", "12-31"]],
    iMin: 12000,
    iCost: 21000,
    yieldQ: 20,
    msp: 2425,
    wMsp: 1,
    spot: 2450,
    ratio: 0.95,
    wReq: 380,
    wOpt: 450,
    rShock: 0.1,
    ph: [6, 8.5],
    ecMax: 6,
    cv: 0.08,
    mMsp: 1,
    deltaA: 0.03,
    dNpk: 20,
    family: "cereal",
    deep: false,
    shelfDays: 365,
    maturity: 140,
  },
  {
    key: "mustard",
    en: "Mustard (RH-725)",
    hi: "सरसों (RH-725)",
    emoji: "🌼",
    sow: [["10-01", "11-15"]],
    iMin: 7000,
    iCost: 12000,
    yieldQ: 8,
    msp: 5950,
    wMsp: 0.9,
    spot: 6200,
    ratio: 0.97,
    wReq: 220,
    wOpt: 280,
    rShock: 0.08,
    ph: [6, 8.5],
    ecMax: 8,
    cv: 0.14,
    mMsp: 0.5,
    deltaA: 0.06,
    dNpk: 10,
    family: "oilseed",
    deep: true,
    shelfDays: 300,
    maturity: 125,
  },
  {
    key: "chana",
    en: "Chana (desi gram)",
    hi: "चना (देसी)",
    emoji: "🫘",
    sow: [["10-10", "11-30"]],
    iMin: 8000,
    iCost: 13000,
    yieldQ: 8,
    msp: 5650,
    wMsp: 0.9,
    spot: 5800,
    ratio: 0.98,
    wReq: 200,
    wOpt: 260,
    rShock: 0.1,
    ph: [6, 8],
    ecMax: 4,
    cv: 0.12,
    mMsp: 0.5,
    deltaA: 0.03,
    dNpk: 5,
    family: "legume",
    deep: true,
    shelfDays: 300,
    maturity: 130,
  },
  {
    key: "potato",
    en: "Potato (Kufri)",
    hi: "आलू (कुफरी)",
    emoji: "🥔",
    sow: [["10-01", "11-30"]],
    iMin: 35000,
    iCost: 60000,
    yieldQ: 100,
    msp: null,
    wMsp: 0,
    spot: 1100,
    ratio: 0.75,
    wReq: 400,
    wOpt: 500,
    rShock: 0.15,
    ph: [5, 7.5],
    ecMax: 2.5,
    cv: 0.45,
    mMsp: 0,
    deltaA: 0,
    cash: true,
    dNpk: 25,
    family: "tuber",
    deep: false,
    shelfDays: 30,
    maturity: 95,
  },
  {
    key: "toria",
    en: "Toria (catch oilseed)",
    hi: "तोरिया",
    emoji: "🌼",
    sow: [["09-01", "10-31"]],
    iMin: 5000,
    iCost: 9000,
    yieldQ: 5.5,
    msp: 5950,
    wMsp: 0.8,
    spot: 5600,
    ratio: 0.97,
    wReq: 180,
    wOpt: 230,
    rShock: 0.1,
    ph: [6, 8.5],
    ecMax: 6,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0.05,
    dNpk: 10,
    family: "oilseed",
    deep: true,
    shelfDays: 240,
    maturity: 70,
  },
  {
    key: "barley",
    en: "Barley",
    hi: "जौ",
    emoji: "🌾",
    sow: [["10-25", "12-15"]],
    iMin: 7000,
    iCost: 12000,
    yieldQ: 16,
    msp: 1980,
    wMsp: 1,
    spot: 2100,
    ratio: 0.98,
    wReq: 250,
    wOpt: 300,
    rShock: 0.1,
    ph: [6.5, 9],
    ecMax: 10,
    cv: 0.1,
    mMsp: 0.5,
    deltaA: 0,
    dNpk: 15,
    family: "cereal",
    deep: false,
    shelfDays: 365,
    maturity: 120,
  },
  {
    key: "masur",
    en: "Masur (lentil)",
    hi: "मसूर",
    emoji: "🫘",
    sow: [["10-15", "11-30"]],
    iMin: 6500,
    iCost: 11000,
    yieldQ: 5,
    msp: 6700,
    wMsp: 0.9,
    spot: 6500,
    ratio: 1,
    wReq: 180,
    wOpt: 250,
    rShock: 0.1,
    ph: [6, 8],
    ecMax: 4,
    cv: 0.13,
    mMsp: 0.5,
    deltaA: 0.02,
    dNpk: 5,
    family: "legume",
    deep: false,
    shelfDays: 300,
    maturity: 120,
  },
  {
    key: "peas",
    en: "Green peas",
    hi: "हरी मटर",
    emoji: "🫛",
    sow: [["10-15", "11-30"]],
    iMin: 15000,
    iCost: 25000,
    yieldQ: 35,
    msp: null,
    wMsp: 0,
    spot: 2500,
    ratio: 0.8,
    wReq: 200,
    wOpt: 280,
    rShock: 0.12,
    ph: [6, 7.5],
    ecMax: 3,
    cv: 0.35,
    mMsp: 0,
    deltaA: 0.05,
    dNpk: 10,
    family: "legume",
    deep: false,
    shelfDays: 7,
    maturity: 75,
  },
  {
    key: "onion",
    en: "Onion (rabi)",
    hi: "प्याज़ (रबी)",
    emoji: "🧅",
    sow: [["11-15", "01-15"]],
    iMin: 30000,
    iCost: 55000,
    yieldQ: 100,
    msp: null,
    wMsp: 0,
    spot: 1500,
    ratio: 0.8,
    wReq: 350,
    wOpt: 450,
    rShock: 0.15,
    ph: [6, 7.5],
    ecMax: 2,
    cv: 0.55,
    mMsp: 0,
    deltaA: 0,
    cash: true,
    dNpk: 20,
    family: "allium",
    deep: false,
    shelfDays: 120,
    maturity: 130,
  },
  {
    key: "garlic",
    en: "Garlic",
    hi: "लहसुन",
    emoji: "🧄",
    sow: [["10-01", "11-15"]],
    iMin: 40000,
    iCost: 70000,
    yieldQ: 40,
    msp: null,
    wMsp: 0,
    spot: 6000,
    ratio: 0.7,
    wReq: 300,
    wOpt: 400,
    rShock: 0.12,
    ph: [6, 7.5],
    ecMax: 3,
    cv: 0.5,
    mMsp: 0,
    deltaA: 0,
    cash: true,
    dNpk: 20,
    family: "allium",
    deep: false,
    shelfDays: 180,
    maturity: 150,
  },
  {
    key: "paddy",
    en: "Paddy",
    hi: "धान",
    emoji: "🌾",
    sow: [["06-01", "07-31"]],
    iMin: 15000,
    iCost: 28000,
    yieldQ: 25,
    msp: 2369,
    wMsp: 1,
    spot: 2300,
    ratio: 0.97,
    wReq: 900,
    wOpt: 1200,
    rShock: 0.15,
    ph: [5, 8.5],
    ecMax: 4,
    cv: 0.07,
    mMsp: 1,
    deltaA: 0.02,
    dNpk: 20,
    family: "cereal",
    deep: false,
    shelfDays: 365,
    maturity: 130,
  },
  {
    key: "maize",
    en: "Maize",
    hi: "मक्का",
    emoji: "🌽",
    sow: [["06-15", "07-31"]],
    iMin: 9000,
    iCost: 16000,
    yieldQ: 22,
    msp: 2400,
    wMsp: 0.8,
    spot: 2200,
    ratio: 0.95,
    wReq: 400,
    wOpt: 550,
    rShock: 0.15,
    ph: [5.5, 8],
    ecMax: 4,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0.1,
    dNpk: 20,
    family: "cereal",
    deep: false,
    shelfDays: 240,
    maturity: 95,
  },
  {
    key: "bajra",
    en: "Bajra",
    hi: "बाजरा",
    emoji: "🌾",
    sow: [["06-15", "07-31"]],
    iMin: 5000,
    iCost: 9000,
    yieldQ: 10,
    msp: 2775,
    wMsp: 0.8,
    spot: 2400,
    ratio: 0.97,
    wReq: 250,
    wOpt: 350,
    rShock: 0.1,
    ph: [6.5, 8.5],
    ecMax: 8,
    cv: 0.12,
    mMsp: 0.5,
    deltaA: 0,
    dNpk: 10,
    family: "cereal",
    deep: false,
    shelfDays: 300,
    maturity: 80,
  },
  {
    key: "soybean",
    en: "Soybean",
    hi: "सोयाबीन",
    emoji: "🫘",
    sow: [["06-15", "07-15"]],
    iMin: 9000,
    iCost: 15000,
    yieldQ: 9,
    msp: 5328,
    wMsp: 0.9,
    spot: 4600,
    ratio: 0.97,
    wReq: 400,
    wOpt: 500,
    rShock: 0.15,
    ph: [6, 7.5],
    ecMax: 4,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0.05,
    dNpk: 5,
    family: "legume",
    deep: true,
    shelfDays: 240,
    maturity: 100,
  },
  {
    key: "cotton",
    en: "Cotton",
    hi: "कपास",
    emoji: "☁️",
    sow: [["04-20", "06-15"]],
    iMin: 18000,
    iCost: 32000,
    yieldQ: 9,
    msp: 7710,
    wMsp: 0.9,
    spot: 7200,
    ratio: 0.98,
    wReq: 600,
    wOpt: 750,
    rShock: 0.15,
    ph: [6, 8.5],
    ecMax: 8,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0.05,
    dNpk: 20,
    family: "fibre",
    deep: true,
    shelfDays: 365,
    maturity: 170,
  },
  {
    key: "groundnut",
    en: "Groundnut",
    hi: "मूँगफली",
    emoji: "🥜",
    sow: [["06-15", "07-15"]],
    iMin: 15000,
    iCost: 25000,
    yieldQ: 9,
    msp: 7263,
    wMsp: 0.9,
    spot: 6800,
    ratio: 0.97,
    wReq: 350,
    wOpt: 500,
    rShock: 0.12,
    ph: [6, 7.5],
    ecMax: 3,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0.03,
    dNpk: 5,
    family: "legume",
    deep: false,
    shelfDays: 240,
    maturity: 110,
  },
  {
    key: "arhar",
    en: "Arhar (tur)",
    hi: "अरहर",
    emoji: "🫘",
    sow: [["06-01", "07-15"]],
    iMin: 8000,
    iCost: 13000,
    yieldQ: 6,
    msp: 8000,
    wMsp: 0.9,
    spot: 7500,
    ratio: 1,
    wReq: 400,
    wOpt: 600,
    rShock: 0.12,
    ph: [6.5, 8],
    ecMax: 4,
    cv: 0.2,
    mMsp: 0.5,
    deltaA: 0.02,
    dNpk: 0,
    family: "legume",
    deep: true,
    shelfDays: 300,
    maturity: 160,
  },
  {
    key: "urad",
    en: "Urad",
    hi: "उड़द",
    emoji: "🫘",
    sow: [["06-15", "07-31"]],
    iMin: 6000,
    iCost: 10000,
    yieldQ: 4.5,
    msp: 7800,
    wMsp: 0.9,
    spot: 7200,
    ratio: 1,
    wReq: 250,
    wOpt: 350,
    rShock: 0.15,
    ph: [6.5, 8],
    ecMax: 3,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0,
    dNpk: 0,
    family: "legume",
    deep: false,
    shelfDays: 300,
    maturity: 75,
  },
  {
    key: "moong",
    en: "Moong",
    hi: "मूँग",
    emoji: "🫘",
    sow: [
      ["03-01", "04-15"],
      ["06-15", "07-31"],
    ],
    iMin: 6000,
    iCost: 10000,
    yieldQ: 4,
    msp: 8768,
    wMsp: 0.9,
    spot: 7800,
    ratio: 1,
    wReq: 250,
    wOpt: 350,
    rShock: 0.12,
    ph: [6.5, 8],
    ecMax: 3,
    cv: 0.15,
    mMsp: 0.5,
    deltaA: 0.03,
    dNpk: 0,
    family: "legume",
    deep: false,
    shelfDays: 300,
    maturity: 65,
  },
  {
    key: "sugarcane",
    en: "Sugarcane",
    hi: "गन्ना",
    emoji: "🎋",
    sow: [
      ["02-01", "03-31"],
      ["10-01", "10-31"],
    ],
    iMin: 30000,
    iCost: 55000,
    yieldQ: 320,
    msp: 355,
    wMsp: 1,
    spot: 355,
    ratio: 1,
    wReq: 1400,
    wOpt: 1800,
    rShock: 0.1,
    ph: [6.5, 8],
    ecMax: 6,
    cv: 0.05,
    mMsp: 1,
    deltaA: 0.02,
    dNpk: 30,
    family: "sugar",
    deep: true,
    shelfDays: 1,
    maturity: 330,
  },
];

export const BENCHMARK_PROFILE: FarmProfile = {
  sowDate: new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10),
  acres: 2,
  budget: 22000,
  waterMm: 400,
  deficitPct: 25,
  surgePct: 35, // sowDate = today in IST
  ph: 7.4,
  ec: 1.2,
  prevCrop: "paddy",
  gammaInfra: 1,
};

/* ---------------- Stage 1: gates ---------------- */
export interface Gates {
  season: boolean;
  budget: boolean;
  water: boolean;
  soil: boolean;
}
const doy = (md: string) => {
  const [m, d] = md.split("-").map(Number);
  return (m! - 1) * 31 + d!;
}; // monotonic day index is enough for ordering
export function inWindow(dateIso: string, windows: [MD, MD][]) {
  const x = doy(dateIso.slice(5, 10));
  return windows.some(([a, b]) => {
    const s = doy(a),
      e = doy(b);
    return s <= e ? x >= s && x <= e : x >= s || x <= e;
  });
}
export const waterAvail = (p: FarmProfile) => p.waterMm * (1 - p.deficitPct / 100);

/* ---------------- Stage 2: sub-scores ---------------- */
export const climateScore = (wAvail: number, wOpt: number, rShock: number) =>
  100 * Math.max(0, 1 - 0.7 * (Math.abs(wAvail - wOpt) / wOpt) - 0.5 * rShock);
export const marketScore = (cv: number, mMsp: number) =>
  100 * (0.6 * (1 - Math.min(1, cv)) + 0.4 * mMsp);
export const glutScore = (deltaA: number) => 100 * Math.exp(-2.5 * Math.max(0, deltaA));
export const storageScore = (shelfDays: number, gamma: number) =>
  Math.min(100, ((100 * Math.log(shelfDays + 1)) / Math.log(180)) * gamma);
export function rotationBonus(prev: string, c: { family: Family; deep: boolean }) {
  const p = PREV_CROPS.find((x) => x.key === prev);
  if (!p || p.family === "none") return 0;
  if (p.family === c.family) return -30; // same family again
  if (c.family === "legume" && p.family === "cereal") return 20; // nitrogen-fixer after a cereal
  if (
    (c.family === "oilseed" && c.deep && p.family === "cereal") ||
    (c.family === "cereal" && p.family === "oilseed")
  )
    return 10;
  return 0;
}
export const soilScore = (dNpk: number, bRot: number) =>
  Math.min(100, Math.max(0, 80 - dNpk + bRot));

/* ---------------- Stage 3: cards ---------------- */
export interface Scored {
  key: string;
  en: string;
  hi: string;
  emoji: string;
  maturity: number;
  gates: Gates;
  ok: boolean;
  sub: Record<SubKey, number>;
  total: Record<CardKey, number>;
  deltaA: number;
  glutAlert: boolean;
  profitPerAcre: number | null;
}
export const totalFor = (sub: Record<SubKey, number>, card: CardKey) =>
  SUB_KEYS.reduce((a, k) => a + WEIGHTS[card][k] * sub[k], 0);
const withTotals = (x: Omit<Scored, "total">): Scored => ({
  ...x,
  total: {
    safe: x.ok ? totalFor(x.sub, "safe") : 0,
    profit: x.ok ? totalFor(x.sub, "profit") : 0,
    catch: x.ok ? totalFor(x.sub, "catch") : 0,
  },
});

export function pickCards(list: Scored[]): Record<CardKey, Scored | null> {
  const ok = list.filter((x) => x.ok);
  const best = (pool: Scored[], card: CardKey) =>
    pool.reduce<Scored | null>((b, x) => (!b || x.total[card] > b.total[card] ? x : b), null);
  const safe = best(ok, "safe");
  const profit = best(
    ok.filter((x) => x !== safe),
    "profit",
  );
  const catchW = best(
    ok.filter((x) => x !== safe && x !== profit && x.maturity <= CATCH_MAX_DAYS),
    "catch",
  );
  return { safe, profit, catch: catchW };
}

/** Full pipeline from raw crop parameters and a farm profile. */
/** `livePrices` (₹/quintal by crop key) replaces the built-in spot price when today's mandi rate is known. */
export function scoreFarm(
  p: FarmProfile,
  crops: CropParams[] = FARM_CROPS,
  livePrices: Record<string, number> = {},
): Scored[] {
  const wAvail = waterAvail(p);
  const pre = crops.map((c) => {
    const gates: Gates = {
      season: inWindow(p.sowDate, c.sow),
      budget: c.iMin <= p.budget,
      water: wAvail >= 0.7 * c.wReq,
      soil: p.ph >= c.ph[0] && p.ph <= c.ph[1] && p.ec <= c.ecMax,
    };
    // Soil-adjusted yield: a little lower near the edge of the pH range or with salty water.
    const edge = p.ph < c.ph[0] + 0.5 || p.ph > c.ph[1] - 0.5;
    const yAdj = c.yieldQ * (edge ? 0.9 : 1) * (p.ec > 0.7 * c.ecMax ? 0.9 : 1);
    const pHarvest = Math.max(c.wMsp * (c.msp ?? 0), (livePrices[c.key] ?? c.spot) * c.ratio);
    const deltaA = c.cash ? p.surgePct / 100 : c.deltaA;
    return {
      c,
      gates,
      ok: gates.season && gates.budget && gates.water && gates.soil,
      profit: yAdj * pHarvest - c.iCost,
      deltaA,
    };
  });
  const survivors = pre.filter((x) => x.ok).map((x) => x.profit);
  const lo = Math.min(...survivors),
    hi = Math.max(...survivors);
  return pre.map(({ c, gates, ok, profit, deltaA }) =>
    withTotals({
      key: c.key,
      en: c.en,
      hi: c.hi,
      emoji: c.emoji,
      maturity: c.maturity,
      gates,
      ok,
      deltaA,
      glutAlert: deltaA >= GLUT_ALERT,
      profitPerAcre: Math.round(profit),
      sub: {
        roi: !ok ? 0 : hi > lo ? (100 * (profit - lo)) / (hi - lo) : 100,
        climate: climateScore(wAvail, c.wOpt, c.rShock),
        market: marketScore(c.cv, c.mMsp),
        glut: glutScore(deltaA),
        soil: soilScore(c.dNpk, rotationBonus(p.prevCrop, c)),
        storage: storageScore(c.shelfDays, p.gammaInfra),
      },
    }),
  );
}

/* ---------------- Rabi benchmark (pre-loaded) ---------------- */
// ROI, market, soil and storage are the published benchmark values. Climate and glut are recomputed
// from water and sowing data so the simulator sliders move them; at 25% deficit and +35% potato
// surge they reproduce the benchmark exactly (W_avail = 300 mm).
interface BenchCrop {
  key: string;
  en: string;
  hi: string;
  emoji: string;
  maturity: number;
  roi: number;
  market: number;
  soil: number;
  storage: number;
  glut0: number;
  wOpt: number;
  wReq: number;
  rShock: number;
  cash?: boolean;
}
export const BENCHMARK: BenchCrop[] = [
  {
    key: "wheat",
    en: "Wheat (HD-3086)",
    hi: "गेहूँ (HD-3086)",
    emoji: "🌾",
    maturity: 140,
    roi: 62,
    market: 95,
    soil: 50,
    storage: 100,
    glut0: 90,
    wOpt: 300 / (1 - 0.17 / 0.7),
    wReq: 380,
    rShock: 0.1,
  },
  {
    key: "mustard",
    en: "Mustard (RH-725)",
    hi: "सरसों (RH-725)",
    emoji: "🌼",
    maturity: 125,
    roi: 82,
    market: 72,
    soil: 90,
    storage: 95,
    glut0: 85,
    wOpt: 300 / (1 + 0.055 / 0.7),
    wReq: 240,
    rShock: 0.05,
  },
  {
    key: "chana",
    en: "Chana (desi gram)",
    hi: "चना (देसी)",
    emoji: "🫘",
    maturity: 130,
    roi: 70,
    market: 75,
    soil: 100,
    storage: 100,
    glut0: 92,
    wOpt: 300 / 1.1,
    wReq: 220,
    rShock: 0.1,
  },
  {
    key: "potato",
    en: "Potato (Kufri)",
    hi: "आलू (कुफरी)",
    emoji: "🥔",
    maturity: 95,
    roi: 95,
    market: 30,
    soil: 75,
    storage: 48,
    glut0: 42,
    wOpt: 300 / (1 - 0.225 / 0.7),
    wReq: 400,
    rShock: 0.15,
    cash: true,
  },
  {
    key: "toria",
    en: "Toria (catch oilseed)",
    hi: "तोरिया",
    emoji: "🌼",
    maturity: 70,
    roi: 58,
    market: 65,
    soil: 85,
    storage: 90,
    glut0: 88,
    wOpt: 300 / (1 + 0.1 / 0.7),
    wReq: 200,
    rShock: 0.1,
  },
];

export function scoreBenchmark(deficitPct: number, surgePct: number, waterMm = 400): Scored[] {
  const wAvail = waterMm * (1 - deficitPct / 100);
  return BENCHMARK.map((c) => {
    const deltaA = c.cash ? surgePct / 100 : -Math.log(c.glut0 / 100) / 2.5;
    const gates: Gates = { season: true, budget: true, water: wAvail >= 0.7 * c.wReq, soil: true };
    return withTotals({
      key: c.key,
      en: c.en,
      hi: c.hi,
      emoji: c.emoji,
      maturity: c.maturity,
      gates,
      ok: gates.water,
      deltaA,
      glutAlert: deltaA >= GLUT_ALERT,
      profitPerAcre: null,
      sub: {
        roi: c.roi,
        climate: climateScore(wAvail, c.wOpt, c.rShock),
        market: c.market,
        glut: glutScore(deltaA),
        soil: c.soil,
        storage: c.storage,
      },
    });
  });
}
