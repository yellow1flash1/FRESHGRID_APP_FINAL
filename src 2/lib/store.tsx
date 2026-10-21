import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth, useClerk, useUser } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";

export interface Session {
  user: { id: string; email: string | null };
}
export type Lang = "en" | "hi";
export type Tab = "home" | "fasal" | "scan" | "cold" | "transport" | "pay" | "income" | "assist";

export { CROPS, cropBy, type Crop } from "./crops";

export const rid = (p: string, n = 4) =>
  `${p}${Math.floor(10 ** (n - 1) + Math.random() * 9 * 10 ** (n - 1))}`;
export const utr = () => String(Math.floor(100000000000 + Math.random() * 899999999999));

export type Layout = "auto" | "mobile" | "desktop";
export type Theme = "system" | "light" | "dark";
// Device-only preferences (kept in this browser). Account-level settings live in the database.
interface Prefs {
  lang: Lang;
  scale: number;
  layout: Layout;
  theme: Theme;
  readAloud: boolean;
  tab: Tab;
  prefillCrop: string | null;
  mode: "mobile" | "desktop"; // derived from `layout` and the screen width; never stored
}
const DEFAULT: Prefs = {
  lang: "en",
  scale: 16,
  layout: "auto",
  theme: "light",
  readAloud: false,
  tab: "home",
  prefillCrop: null,
  mode: "mobile",
};
const KEY = "freshgrid-prefs-v3";

interface Ctx {
  s: Prefs;
  set: (fn: (s: Prefs) => Prefs) => void;
  t: (en: string, hi: string) => string;
  session: Session | null;
  authReady: boolean;
  signOut: () => Promise<void>;
}
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [s, setS] = useState<Prefs>(DEFAULT);
  const [ready, setReady] = useState(false);
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const session: Session | null =
    isSignedIn && userId
      ? { user: { id: userId, email: user?.primaryEmailAddress?.emailAddress ?? null } }
      : null;
  const authReady = isLoaded;
  const [wide, setWide] = useState(false);
  const [darkOs, setDarkOs] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULT, ...JSON.parse(raw), prefillCrop: null });
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia("(min-width: 1024px)"),
      dq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      setWide(mq.matches);
      setDarkOs(dq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    dq.addEventListener("change", sync);
    setReady(true);
    return () => {
      mq.removeEventListener("change", sync);
      dq.removeEventListener("change", sync);
    };
  }, []);
  useEffect(() => {
    if (ready) {
      const { mode: _m, ...keep } = s;
      try {
        localStorage.setItem(KEY, JSON.stringify(keep));
      } catch {
        /* storage blocked */
      }
    }
  }, [s, ready]);
  useEffect(() => {
    document.documentElement.style.setProperty("--fg-scale", `${s.scale}px`);
  }, [s.scale]);
  const dark = s.theme === "dark" || (s.theme === "system" && darkOs);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const eff: Prefs = { ...s, mode: s.layout === "auto" ? (wide ? "desktop" : "mobile") : s.layout };
  const t = (en: string, hi: string) => (s.lang === "hi" ? hi : en);
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    try {
      sessionStorage.removeItem("freshgrid-picked-role");
    } catch {
      /* storage blocked */
    }
    await clerk.signOut();
    setS((x) => ({ ...x, tab: "home" }));
  };
  if (!ready) return null;
  return (
    <C.Provider value={{ s: eff, set: setS, t, session, authReady, signOut }}>
      {children}
    </C.Provider>
  );
}
export function useStore() {
  const c = useContext(C);
  if (!c) throw new Error("no store");
  return c;
}
