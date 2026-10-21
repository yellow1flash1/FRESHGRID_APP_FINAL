import { useState } from "react";
import { ArrowLeft, BadgeCheck, ChevronRight, Landmark, ShieldCheck } from "lucide-react";
import { SignIn, SignUp } from "@clerk/tanstack-react-start";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Crest } from "./ui";
import { ROLES, getPickedRole, roleInfo, setPickedRole } from "./roles";

/** Signed-out flow: pick who you are first, then log in or create an account. */
export function Auth() {
  const [role, setRole] = useState<Role | null>(getPickedRole);
  const pick = (r: Role | null) => {
    setPickedRole(r);
    setRole(r);
  };
  return role ? <SignInPanel role={role} onBack={() => pick(null)} /> : <Welcome onPick={pick} />;
}

function LangSwitch() {
  const { s, set } = useStore();
  return (
    <button
      className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      onClick={() => set((x) => ({ ...x, lang: x.lang === "en" ? "hi" : "en" }))}
    >
      {s.lang === "en" ? "हिन्दी" : "English"}
    </button>
  );
}

function Welcome({ onPick }: { onPick: (r: Role) => void }) {
  const { t } = useStore();
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6">
      <div className="flex justify-end">
        <LangSwitch />
      </div>
      <div className="mb-8 mt-4 text-center">
        <div className="mx-auto mb-3 flex w-fit">
          <Crest size={56} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">FreshGrid</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Scan, store, move and sell your harvest", "फसल की जाँच, भंडारण, ढुलाई और बिक्री")}
        </p>
      </div>
      <h2 className="mb-3 text-center text-lg font-medium text-foreground">
        {t("Who are you?", "आप कौन हैं?")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map(({ k, I, en, hi, descEn, descHi }) => (
          <button
            key={k}
            onClick={() => onPick(k)}
            className="card-classic group flex items-center gap-4 p-4 text-left transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <I className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">{t(en, hi)}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {t(descEn, descHi)}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
      <TrustSeals />
    </div>
  );
}

function SignInPanel({ role, onBack }: { role: Role; onBack: () => void }) {
  const { t } = useStore();
  const [mode, setMode] = useState<"login" | "reg">("login");
  const r = roleInfo(role);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Back", "वापस")}
        </button>
        <LangSwitch />
      </div>
      <div className="mb-5 mt-2 text-center">
        <div className="mx-auto mb-2 flex w-fit">
          <Crest size={44} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">FreshGrid</h1>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
          <r.I className="h-3.5 w-3.5" />
          {t(r.en, r.hi)}
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(["login", "reg"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md py-2 text-sm font-medium ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {m === "login" ? t("Log in", "लॉग इन") : t("Create account", "पंजीकरण")}
          </button>
        ))}
      </div>
      <div className="flex justify-center">
        {mode === "login" ? <SignIn routing="hash" /> : <SignUp routing="hash" />}
      </div>
      <TrustSeals />
    </div>
  );
}

function TrustSeals() {
  const { t } = useStore();
  // Kept factual: payments are still in test mode.
  const items = [
    [ShieldCheck, t("Secure sign-in", "सुरक्षित लॉगिन")],
    [BadgeCheck, t("Built for FPOs", "FPO के लिए बना")],
    [Landmark, t("Test-mode payments for now", "अभी टेस्ट मोड भुगतान")],
  ] as const;
  return (
    <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-3 gap-2 text-center text-[0.68rem] font-semibold text-primary">
      {items.map(([Icon, l]) => (
        <div key={l} className="seal flex flex-col items-center gap-1 rounded-xl px-1 py-2">
          <Icon className="h-5 w-5" />
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}
