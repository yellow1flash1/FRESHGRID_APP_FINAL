import { useEffect, useRef, useState } from "react";
import { LogOut, Settings2, ThumbsUp, UserCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMe } from "@/lib/data";
import { Crest } from "./ui";
import { KrishiSaakhHost, MyRatingSummary, openKrishiSaakh } from "./KrishiSaakh";
import { SettingsHost, openSettings } from "./Settings";

const ROLE_CHIP = {
  farmer: ["Farmer", "किसान", "bg-accent text-primary"],
  transporter: ["Transporter", "ट्रांसपोर्टर", "bg-navy-soft text-navy"],
  buyer: ["Buyer", "खरीदार", "bg-saffron-soft text-saffron-strong"],
  owner: ["Cold room owner", "कोल्ड रूम मालिक", "bg-navy-soft text-navy"],
} as const;

/** Brand row with a thin tricolour edge, language switch, and the profile menu (rating, settings, sign out). */
export function TopBar() {
  const { s, set, t, signOut } = useStore();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const desktop = s.mode === "desktop";
  const p = me?.profile;
  const role = me?.role ?? null;
  const business = role === "buyer" || role === "owner";
  const chip = role ? ROLE_CHIP[role] : null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left hover:bg-secondary";
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-1" aria-hidden>
          <span className="flex-1 bg-saffron" />
          <span className="flex-1 bg-card" />
          <span className="flex-1 bg-primary-2" />
        </div>
        <div
          className={`mx-auto flex items-center gap-3 px-4 py-2.5 ${desktop ? "max-w-6xl" : "max-w-lg"}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Crest size={28} />
            <span className="text-base font-semibold text-foreground">FreshGrid</span>
            {chip && (
              <span className={`truncate rounded-md px-2 py-0.5 text-xs font-medium ${chip[2]}`}>
                {t(chip[0], chip[1])}
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              className="rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => set((x) => ({ ...x, lang: x.lang === "en" ? "hi" : "en" }))}
            >
              {s.lang === "en" ? "हिंदी" : "English"}
            </button>
            <div className="relative" ref={menu}>
              <button
                aria-label={t("Profile, rating and settings", "प्रोफ़ाइल, रेटिंग और सेटिंग")}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <UserCircle2 className="h-7 w-7" />
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card p-2 text-sm shadow-lg">
                  <div className="border-b border-border px-2 pb-2">
                    <p className="font-medium text-foreground">
                      {(business ? p?.org_name : p?.full_name) || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {role === "farmer"
                        ? `${t("FPO ID", "FPO आईडी")}: ${p?.fpo_id ?? "—"}`
                        : chip
                          ? t(`${chip[0]} account`, `${chip[1]} खाता`)
                          : ""}
                    </p>
                    <MyRatingSummary onOpen={() => setOpen(false)} />
                  </div>
                  <button
                    className={item}
                    onClick={() => {
                      setOpen(false);
                      openSettings();
                    }}
                  >
                    <Settings2 className="h-4 w-4 text-navy" />
                    {t("Settings", "सेटिंग")}
                  </button>
                  <button
                    className={item}
                    onClick={() => {
                      setOpen(false);
                      openKrishiSaakh("rate");
                    }}
                  >
                    <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                    {t("Rate my partners", "साथियों को रेट करें")}
                  </button>
                  <button
                    className={`${item} text-destructive`}
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("Sign out", "लॉग आउट")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <KrishiSaakhHost />
      <SettingsHost />
    </>
  );
}
