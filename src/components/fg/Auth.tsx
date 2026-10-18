import { useState } from "react";
import { BadgeCheck, Landmark, Lock, ShieldCheck, Sprout, Store } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useStore } from "@/lib/store";
import { Btn, Crest, Field, inputCls } from "./ui";

const schema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(72) });

export function Auth() {
  const { t } = useStore();
  const [mode, setMode] = useState<"login" | "reg">("login");
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = schema.safeParse({ email, password });
    if (!p.success) return setMsg({ ok: false, text: t("Enter a valid email and a password of at least 8 characters", "सही ईमेल और कम से कम 8 अक्षर का पासवर्ड डालें") });
    if (mode === "reg" && name.trim().length < 2) return setMsg({ ok: false, text: t("Enter your full name", "पूरा नाम डालें") });
    setBusy(true); setMsg(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      if (error) setMsg({ ok: false, text: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim(), role } } });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: t("Check your email and click the confirmation link to finish signing up.", "पुष्टि के लिए अपना ईमेल देखें।") });
    }
    setBusy(false);
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg({ ok: false, text: r.error.message ?? "Google sign-in failed" });
  };
  const reset = async () => {
    if (!z.string().email().safeParse(email.trim()).success) return setMsg({ ok: false, text: t("Enter your email above first", "पहले ईमेल डालें") });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("Password reset link sent to your email.", "पासवर्ड रीसेट लिंक भेजा गया।") });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 flex w-fit"><Crest size={48} /></div>
        <h1 className="text-2xl font-semibold text-foreground">FreshGrid</h1>
        <p className="text-sm text-muted-foreground">Scan, store and sell your harvest</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Farmer Producer Organisation Portal", "किसान उत्पादक संगठन पोर्टल")}</p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(["login", "reg"] as const).map((m, i) => (
          <button key={m} onClick={() => { setMode(m); setMsg(null); }} className={`rounded-md py-2 text-sm font-medium ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {m === "login" ? t("Log in", "लॉग इन") : t("Create account", "पंजीकरण")}
          </button>
        ))}
      </div>
      <div className="card-classic space-y-4 p-5">
        {mode === "reg" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {([["farmer", Sprout, t("I am a Farmer", "मैं किसान हूँ")], ["buyer", Store, t("I am a Buyer", "मैं खरीदार हूँ")]] as const).map(([k, I, l]) => (
                <button key={k} onClick={() => setRole(k)} className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-bold ${role === k ? "border-primary bg-accent text-primary" : "border-border"}`}><I className="h-6 w-6" />{l}</button>
              ))}
            </div>
            <Field label={role === "farmer" ? t("Full Name", "पूरा नाम") : t("Your Name", "आपका नाम")}><input className={inputCls} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kishan Lal" /></Field>
          </>
        )}
        <Field label={t("Email", "ईमेल")}><input className={inputCls} type="email" autoComplete="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kishan@example.com" /></Field>
        <Field label={t("Password", "पासवर्ड")}><input className={inputCls} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
        {msg && <p className={`text-xs font-semibold ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
        <Btn className="w-full" onClick={submit} disabled={busy}><Lock className="h-4 w-4" />{mode === "login" ? t("Secure Log In", "सुरक्षित लॉग इन") : t("Create Account", "खाता बनाएँ")}</Btn>
        {mode === "login" && <button onClick={reset} className="w-full text-center text-xs font-semibold text-primary underline">{t("Forgot password?", "पासवर्ड भूल गए?")}</button>}
        <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground"><span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" /></div>
        <Btn v="outline" className="w-full" onClick={google}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.6L6.4 14zM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" /></svg>
          {t("Continue with Google", "Google से जारी रखें")}
        </Btn>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[0.68rem] font-semibold text-primary">
        {[[ShieldCheck, "100% Secure UPI Payout"], [BadgeCheck, "Registered FPO Partner"], [Landmark, "e-NAM & Govt ID Linked"]].map(([I, l]) => {
          const Icon = I as typeof ShieldCheck;
          return <div key={l as string} className="seal flex flex-col items-center gap-1 rounded-xl px-1 py-2"><Icon className="h-5 w-5" /><span className="text-primary">{l as string}</span></div>;
        })}
      </div>
    </div>
  );
}
