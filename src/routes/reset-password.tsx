import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Crest, Field, inputCls } from "@/components/fg/ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — FreshGrid" },
      { name: "description", content: "Set a new password for your FreshGrid farmer or buyer account." },
      { property: "og:title", content: "Reset Password — FreshGrid" },
      { property: "og:description", content: "Set a new password for your FreshGrid account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const save = async () => {
    if (pw.length < 8) return setMsg("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg(error.message);
    nav({ to: "/", replace: true });
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="mx-auto mb-3"><Crest size={60} /></div>
      <div className="card-classic space-y-3 p-5">
        <h1 className="text-xl font-bold text-primary">Set a new password (नया पासवर्ड)</h1>
        <Field label="New password"><input type="password" className={inputCls} value={pw} maxLength={72} onChange={(e) => setPw(e.target.value)} /></Field>
        {msg && <p className="text-xs text-destructive">{msg}</p>}
        <Btn className="w-full" onClick={save}>Save password</Btn>
      </div>
    </div>
  );
}
