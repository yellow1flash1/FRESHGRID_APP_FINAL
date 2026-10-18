import { Bot, IndianRupee, ScanLine, Snowflake, TrendingUp } from "lucide-react";
import { useStore, type Tab } from "@/lib/store";
import { TopBar } from "./TopBar";
import { ScanTab } from "./ScanTab";
import { ColdTab } from "./ColdTab";
import { PayTab } from "./PayTab";
import { IncomeTab } from "./IncomeTab";
import { AssistTab } from "./AssistTab";

export function Shell() {
  const { s, set, t } = useStore();
  // `short` labels are used in the phone bottom bar so nothing gets cut off.
  const tabs: { k: Tab; en: string; hi: string; shortEn: string; shortHi: string; I: typeof ScanLine }[] = [
    { k: "scan", en: "Scan crate", hi: "क्रेट स्कैन", shortEn: "Scan", shortHi: "स्कैन", I: ScanLine },
    { k: "cold", en: "Cold rooms", hi: "कोल्ड स्टोर", shortEn: "Store", shortHi: "भंडार", I: Snowflake },
    { k: "pay", en: "Payments", hi: "भुगतान और खाता", shortEn: "Pay", shortHi: "भुगतान", I: IndianRupee },
    { k: "income", en: "Income", hi: "मेरी आय", shortEn: "Income", shortHi: "आय", I: TrendingUp },
    { k: "assist", en: "Kisan assistant", hi: "किसान सहायक", shortEn: "Help", shortHi: "सहायक", I: Bot },
  ];
  const go = (k: Tab) => { set((x) => ({ ...x, tab: k })); window.scrollTo({ top: 0 }); };
  const desktop = s.mode === "desktop";
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className={`mx-auto ${desktop ? "flex max-w-6xl gap-8 px-4 py-6" : "max-w-lg pb-24"}`}>
        {desktop && (
          <nav className="sticky top-20 h-fit w-52 shrink-0" aria-label={t("Sections", "भाग")}>
            {tabs.map(({ k, en, hi, I }) => (
              <button key={k} onClick={() => go(k)} aria-current={s.tab === k ? "page" : undefined} className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${s.tab === k ? "bg-secondary font-medium text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <I className="h-4 w-4 shrink-0" />{t(en, hi)}
              </button>
            ))}
          </nav>
        )}
        <main className={`min-w-0 flex-1 ${desktop ? "" : "px-4 pt-5"}`}>
          {s.tab === "scan" && <ScanTab />}{s.tab === "cold" && <ColdTab />}{s.tab === "pay" && <PayTab />}{s.tab === "income" && <IncomeTab />}{s.tab === "assist" && <AssistTab />}
        </main>
      </div>
      {!desktop && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur" aria-label={t("Sections", "भाग")}>
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {tabs.map(({ k, shortEn, shortHi, I }) => {
              const on = s.tab === k;
              return (
                <button key={k} onClick={() => go(k)} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center gap-1 py-2.5 text-xs ${on ? "font-medium text-primary" : "text-muted-foreground"}`}>
                  {on && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gold" />}
                  <I className="h-5 w-5" /><span>{s.lang === "hi" ? shortHi : shortEn}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
