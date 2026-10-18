import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CROPS } from "./crops";

export interface MandiPrice { crop: string; commodity: string; market: string; district: string; modalPerKg: number; minPerKg: number; maxPerKg: number; date: string }

// Government of India Agmarknet daily prices via data.gov.in (public data, needs a free API key).
const RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";

export const getMandiPrices = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ state: z.string().trim().min(2).max(40) }).parse(d))
  .handler(async ({ data }): Promise<{ available: boolean; reason?: string; prices: MandiPrice[] }> => {
    const key = process.env["DATA_GOV_IN_API_KEY"];
    if (!key) return { available: false, reason: "no_key", prices: [] };
    const fetchState = async (state: string) => {
      const url = `https://api.data.gov.in/resource/${RESOURCE}?api-key=${encodeURIComponent(key)}&format=json&limit=1000&filters[state]=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`mandi ${res.status}`);
      const j = (await res.json()) as { records?: Record<string, string>[] };
      return j.records ?? [];
    };
    try {
      let recs = await fetchState(data.state);
      if (!recs.length && data.state !== "Haryana") recs = await fetchState("Haryana");
      const prices: MandiPrice[] = [];
      for (const c of CROPS) {
        const rows = recs.filter((r) => c.agmark.some((a) => (r["commodity"] ?? "").toLowerCase() === a.toLowerCase()));
        if (!rows.length) continue;
        const modal = rows.map((r) => Number(r["modal_price"])).filter((n) => n > 0).sort((a, b) => a - b);
        const mid = modal[Math.floor(modal.length / 2)];
        const pick = rows.find((r) => Number(r["modal_price"]) === mid) ?? rows[0]!;
        if (!mid) continue;
        prices.push({
          crop: c.key, commodity: pick["commodity"] ?? c.en, market: pick["market"] ?? "", district: pick["district"] ?? "",
          modalPerKg: Math.round(mid / 100), minPerKg: Math.round(Number(pick["min_price"]) / 100), maxPerKg: Math.round(Number(pick["max_price"]) / 100),
          date: pick["arrival_date"] ?? "",
        });
      }
      return { available: true, prices };
    } catch (e) {
      console.error("mandi fetch failed", e);
      return { available: false, reason: "fetch_failed", prices: [] };
    }
  });
