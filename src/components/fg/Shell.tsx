import { useCallback } from "react";
import {
  Bot,
  Home,
  IndianRupee,
  ScanLine,
  Snowflake,
  Sprout,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import { useStore, type Tab } from "@/lib/store";
import { useTabEvents } from "@/lib/nav";
import { TopBar } from "./TopBar";
import { HomeTab } from "./HomeTab";
import { ScanTab } from "./ScanTab";
import { ColdTab } from "./ColdTab";
import { PayTab } from "./PayTab";
import { TransportTab } from "./TransportTab";
import { IncomeTab } from "./IncomeTab";
import { AssistTab } from "./AssistTab";
import { FasalNitiTab } from "./FasalNitiTab";
import { RatePrompt } from "./KrishiSaakh";

type Group = {
  k: string;
  en: string;
  hi: string;
  I: typeof Home;
  tabs: { k: Tab; en: string; hi: string; I: typeof Home }[];
};
// Five groups keep the phone bar readable; groups with two screens get a switch at the top.
const GROUPS: Group[] = [
  {
    k: "home",
    en: "Home",
    hi: "होम",
    I: Home,
    tabs: [
      { k: "home", en: "Home", hi: "होम", I: Home },
      { k: "scan", en: "Scan crate", hi: "क्रेट स्कैन", I: ScanLine },
    ],
  },
  {
    k: "fasal",
    en: "FasalNiti",
    hi: "फसलनीति",
    I: Sprout,
    tabs: [{ k: "fasal", en: "FasalNiti", hi: "फसलनीति", I: Sprout }],
  },
  {
    k: "store",
    en: "Store/Truck",
    hi: "भंडार/ट्रक",
    I: Warehouse,
    tabs: [
      { k: "cold", en: "Cold rooms", hi: "कोल्ड स्टोर", I: Snowflake },
      { k: "transport", en: "Truck", hi: "ट्रक", I: Truck },
    ],
  },
  {
    k: "money",
    en: "Money",
    hi: "पैसा",
    I: IndianRupee,
    tabs: [
      { k: "pay", en: "Payments", hi: "भुगतान", I: IndianRupee },
      { k: "income", en: "Income", hi: "आय", I: TrendingUp },
    ],
  },
  {
    k: "help",
    en: "Help",
    hi: "सहायक",
    I: Bot,
    tabs: [{ k: "assist", en: "Kisan assistant", hi: "किसान सहायक", I: Bot }],
  },
];

export function Shell() {
  const { s, set, t } = useStore();
  const go = useCallback(
    (k: Tab) => {
      set((x) => ({ ...x, tab: k }));
      window.scrollTo({ top: 0 });
    },
    [set],
  );
  useTabEvents(
    useCallback(
      (k: string) => {
        if (GROUPS.some((g) => g.tabs.some((x) => x.k === k))) go(k as Tab);
      },
      [go],
    ),
  );
  const desktop = s.mode === "desktop";
  const group = GROUPS.find((g) => g.tabs.some((x) => x.k === s.tab)) ?? GROUPS[0]!;
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className={`mx-auto ${desktop ? "flex max-w-6xl gap-8 px-4 py-6" : "max-w-lg pb-24"}`}>
        {desktop && (
          <nav
            className="sticky top-20 h-fit w-56 shrink-0 space-y-3"
            aria-label={t("Sections", "भाग")}
          >
            {GROUPS.map((g) => (
              <div key={g.k}>
                {g.tabs.length > 1 && (
                  <p className="mb-1 px-3 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(g.en, g.hi)}
                  </p>
                )}
                {g.tabs.map(({ k, en, hi, I }) => (
                  <button
                    key={k}
                    onClick={() => go(k)}
                    aria-current={s.tab === k ? "page" : undefined}
                    className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md border-l-4 px-3 py-2.5 text-left text-sm ${s.tab === k ? "border-l-saffron bg-accent font-medium text-primary" : "border-l-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <I className="h-4 w-4 shrink-0" />
                    {t(en, hi)}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        )}
        <main className={`min-w-0 flex-1 ${desktop ? "" : "px-4 pt-4"}`}>
          {!desktop && group.tabs.length > 1 && (
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
              {group.tabs.map(({ k, en, hi, I }) => (
                <button
                  key={k}
                  onClick={() => go(k)}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md text-sm font-medium ${s.tab === k ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  <I className="h-4 w-4" />
                  {t(en, hi)}
                </button>
              ))}
            </div>
          )}
          {s.tab !== "home" && s.tab !== "fasal" && s.tab !== "assist" && <RatePrompt />}
          {s.tab === "home" && <HomeTab />}
          {s.tab === "fasal" && <FasalNitiTab />}
          {s.tab === "scan" && <ScanTab />}
          {s.tab === "cold" && <ColdTab />}
          {s.tab === "transport" && <TransportTab />}
          {s.tab === "pay" && <PayTab />}
          {s.tab === "income" && <IncomeTab />}
          {s.tab === "assist" && <AssistTab />}
        </main>
      </div>
      {!desktop && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
          aria-label={t("Sections", "भाग")}
        >
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {GROUPS.map((g) => {
              const on = g === group;
              return (
                <button
                  key={g.k}
                  onClick={() => go(g.tabs[0]!.k)}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs ${on ? "font-semibold text-primary" : "text-muted-foreground"}`}
                >
                  {on && (
                    <span className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-saffron" />
                  )}
                  <g.I className="h-6 w-6" />
                  <span className="leading-none">{t(g.en, g.hi)}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
