import { useEffect, useRef, useState } from "react";
import { LogOut, Minus, Monitor, Plus, Smartphone, UserCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMe } from "@/lib/data";
import { Crest } from "./ui";

/** One quiet row: brand, language switch, and a profile menu that holds the less-used settings. */
export function TopBar() {
  const { s, set, t, signOut } = useStore();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const desktop = s.mode === "desktop";
  const p = me?.profile;
  const buyer = me?.role === "buyer";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className={`mx-auto flex items-center gap-3 px-4 py-2.5 ${desktop ? "max-w-6xl" : "max-w-lg"}`}>
        <div className="flex items-center gap-2">
          <Crest size={26} />
          <span className="text-base font-semibold text-foreground">FreshGrid</span>
          {buyer && <span className="text-sm text-muted-foreground">{t("Buyer", "खरीदार")}</span>}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => set((x) => ({ ...x, lang: x.lang === "en" ? "hi" : "en" }))}>
            {s.lang === "en" ? "हिंदी" : "English"}
          </button>
          <div className="relative" ref={menu}>
            <button aria-label={t("Account and settings", "खाता और सेटिंग")} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <UserCircle2 className="h-6 w-6" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card p-2 text-sm shadow-lg">
                <div className="border-b border-border px-2 pb-2">
                  <p className="font-medium text-foreground">{(buyer ? p?.org_name : p?.full_name) || "—"}</p>
                  <p className="text-xs text-muted-foreground">{buyer ? t("Buyer account", "खरीदार खाता") : `${t("FPO ID", "FPO आईडी")}: ${p?.fpo_id ?? "—"}`}</p>
                </div>
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-muted-foreground">{t("Text size", "अक्षर का आकार")}</span>
                  <div className="flex items-center gap-1">
                    <button aria-label={t("Smaller text", "छोटे अक्षर")} className="rounded-md border border-border p-1 hover:bg-secondary" onClick={() => set((x) => ({ ...x, scale: Math.max(13, x.scale - 1) }))}><Minus className="h-3.5 w-3.5" /></button>
                    <button aria-label={t("Larger text", "बड़े अक्षर")} className="rounded-md border border-border p-1 hover:bg-secondary" onClick={() => set((x) => ({ ...x, scale: Math.min(21, x.scale + 1) }))}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-secondary" onClick={() => { set((x) => ({ ...x, mode: desktop ? "mobile" : "desktop" })); setOpen(false); }}>
                  {desktop ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                  {desktop ? t("Switch to phone layout", "फ़ोन लेआउट") : t("Switch to desktop layout", "डेस्कटॉप लेआउट")}
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-destructive hover:bg-secondary" onClick={() => { setOpen(false); signOut(); }}>
                  <LogOut className="h-4 w-4" />{t("Sign out", "लॉग आउट")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
