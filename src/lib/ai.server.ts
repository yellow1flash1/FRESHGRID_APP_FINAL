// Server-only: Kisan Assistant chat (streamed). Uses Google Gemini directly via GEMINI_API_KEY,
// so it works on any host (Vercel, etc.) with no Lovable dependency.
const MODEL = "gemini-3.8-flash";

async function verifyUser(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = process.env["SUPABASE_URL"]; const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || !url || !key) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  return r.ok;
}

const SYSTEM = `You are "Kisan Sahayak", the FreshGrid FPO & agri-expert assistant for Indian smallholder farmers.
- Reply in the user's language: Hindi (Devanagari) if they write Hindi/Hinglish, else simple English with key terms also in Hindi in brackets.
- Be practical and short (under 180 words) with bullet points. Use ₹ and kg.
- You know post-harvest handling, cold storage temperatures, grading (A export/retail, B local retail, C processing), e-NAM, Agmarknet, PM-Kisan, KCC, UPI.
- Use the FARMER CONTEXT below (their real scans, bookings, lots, nearby cold rooms, live mandi prices) when relevant. Never invent numbers not in the context; say when data is unavailable.
- FreshGrid payments in this app are test payments (no real money moves yet) — say so if asked about real payouts.`;

export async function handleChat(request: Request) {
  if (!(await verifyUser(request))) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_API_KEY"];
  if (!apiKey) {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (lovableKey) return gatewayChat(request, lovableKey);
    return Response.json({ error: "Kisan Assistant is not set up yet." }, { status: 500 });
  }
  return geminiChat(request, apiKey);
}

async function geminiChat(request: Request, apiKey: string) {
  let body: { messages?: { role: string; content: string }[]; context?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const msgs = (body.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).slice(-20)
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 2000) }] }));
  while (msgs.length && msgs[0]?.role !== "user") msgs.shift(); // Gemini needs the first turn to be the user
  if (!msgs.length || msgs[msgs.length - 1]?.role !== "user") return Response.json({ error: "Empty message" }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM}\n\nFARMER CONTEXT:\n${(body.context ?? "").slice(0, 6000)}` }] },
        contents: msgs,
      }),
    });
  } catch (e) {
    // Client disconnected or network hiccup before Gemini answered — not a server error.
    if (e instanceof Error && (e.name === "AbortError" || e.message === "aborted")) return new Response(null, { status: 499 });
    throw e;
  }
  if (!upstream.ok || !upstream.body) {
    let msg = "The assistant is unavailable right now.";
    if (upstream.status === 429) msg = "Too many requests (Gemini free-tier limit) — please wait a moment and try again.";
    try {
      const j = (await upstream.json()) as { error?: { message?: string } };
      if (upstream.status === 400 || upstream.status === 401 || upstream.status === 403) msg = `Gemini error: ${j.error?.message ?? "the API key was rejected."}`;
    } catch { /* ignore */ }
    return Response.json({ error: msg }, { status: upstream.status });
  }
  // Convert Gemini SSE into a plain text stream of answer deltas.
  const dec = new TextDecoder(); const enc = new TextEncoder(); let buf = "";
  const handle = (line: string, ctrl: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith("data:")) return;
    const d = line.slice(5).trim(); if (!d) return;
    try {
      const ev = JSON.parse(d) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
      const c = ev.candidates?.[0];
      const send = (t: string) => { try { ctrl.enqueue(enc.encode(t)); } catch { /* client gone */ } };
      for (const part of c?.content?.parts ?? []) if (part.text && !part.thought) send(part.text);
      if (ev.promptFeedback?.blockReason || c?.finishReason === "SAFETY") send("\n\n⚠ The assistant could not answer this question.");
    } catch { /* partial */ }
  };
  const out = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
      let i;
      while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); handle(line, ctrl); }
    },
    flush(ctrl) { if (buf) handle(buf, ctrl); },
  }));
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}

// Fallback: Lovable AI Gateway (OpenAI-compatible streaming) when no Gemini key is set.
async function gatewayChat(request: Request, apiKey: string) {
  let body: { messages?: { role: string; content: string }[]; context?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const msgs = (body.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!msgs.length || msgs[msgs.length - 1]?.role !== "user") return Response.json({ error: "Empty message" }, { status: 400 });
  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning_effort: "low",
      messages: [{ role: "system", content: `${SYSTEM}\n\nFARMER CONTEXT:\n${(body.context ?? "").slice(0, 6000)}` }, ...msgs],
    }),
  });
  if (!upstream.ok || !upstream.body) {
    const msg = upstream.status === 429 ? "Too many requests — please wait a moment and try again." : upstream.status === 402 ? "AI credits are used up for this workspace." : "The assistant is unavailable right now.";
    return Response.json({ error: msg }, { status: upstream.status });
  }
  const dec = new TextDecoder(); const enc = new TextEncoder(); let buf = "";
  const handle = (line: string, ctrl: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith("data:")) return;
    const d = line.slice(5).trim(); if (!d || d === "[DONE]") return;
    try {
      const ev = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
      const t = ev.choices?.[0]?.delta?.content;
      if (t) ctrl.enqueue(enc.encode(t));
    } catch { /* partial */ }
  };
  const out = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
      let i;
      while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); handle(line, ctrl); }
    },
    flush(ctrl) { if (buf) handle(buf, ctrl); },
  }));
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}
