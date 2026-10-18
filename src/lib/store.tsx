import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "hi";
export type Tab = "scan" | "cold" | "pay" | "income" | "assist";

export { CROPS, cropBy, type Crop } from "./crops";

export const rid = (p: string, n = 4) => `${p}${Math.floor(10 ** (n - 1) + Math.random() * 9 * 10 ** (n - 1))}`;
export const utr = () => String(Math.floor(100000000000 + Math.random() * 899999999999));

interface Prefs { lang: Lang; scale: number; mode: "mobile" | "desktop"; tab: Tab; prefillCrop: string | null }
const DEFAULT: Prefs = { lang: "en", scale: 16, mode: "mobile", tab: "scan", prefillCrop: null };
const KEY = "freshgrid-prefs-v2";

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
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS({ ...DEFAULT, ...JSON.parse(raw), prefillCrop: null }); } catch { /* ignore */ }
    setReady(true);
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => { setSession(sess); setAuthReady(true); });
    supabase.auth.getSession().then(({ data: d }) => { setSession(d.session); setAuthReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, ready]);
  useEffect(() => { document.documentElement.style.setProperty("--fg-scale", `${s.scale}px`); }, [s.scale]);
  const t = (en: string, hi: string) => (s.lang === "hi" ? hi : en);
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); setS((x) => ({ ...x, tab: "scan" })); };
  if (!ready) return null;
  return <C.Provider value={{ s, set: setS, t, session, authReady, signOut }}>{children}</C.Provider>;
}
export function useStore() { const c = useContext(C); if (!c) throw new Error("no store"); return c; }
