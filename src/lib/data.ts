import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useStore } from "./store";
import { getMandiPrices } from "./mandi.functions";

export type Profile = Tables<"profiles">;
export type ColdRoom = Tables<"cold_rooms"> & { free: number };
export type Scan = Tables<"scans">;
export type Booking = Tables<"bookings">;
export type Lot = Tables<"lots">;
export type Role = "farmer" | "buyer";

const uid = (s: ReturnType<typeof useStore>["session"]) => s?.user.id ?? "";

export function useMe() {
  const { session } = useStore();
  const id = uid(session);
  return useQuery({
    queryKey: ["me", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: profile, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      return { profile, role: (roles?.[0]?.role ?? null) as Role | null };
    },
  });
}

export function useColdRooms() {
  return useQuery({
    queryKey: ["cold_rooms"],
    queryFn: async () => {
      const [{ data: rooms, error }, { data: free }] = await Promise.all([
        supabase.from("cold_rooms").select("*").order("rate_per_crate_day"),
        supabase.rpc("cold_room_free_slots"),
      ]);
      if (error) throw error;
      const m = new Map((free ?? []).map((f) => [f.cold_room_id, f.free]));
      return (rooms ?? []).map((r) => ({ ...r, free: m.get(r.id) ?? r.total_slots })) as ColdRoom[];
    },
  });
}

export function useScans() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["scans", uid(session)], enabled: !!session,
    queryFn: async () => { const { data, error } = await supabase.from("scans").select("*").order("created_at", { ascending: false }).limit(20); if (error) throw error; return data; },
  });
}
export function useBookings() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["bookings", uid(session)], enabled: !!session,
    queryFn: async () => { const { data, error } = await supabase.from("bookings").select("*").eq("farmer_id", uid(session)).order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
}

/** Farmer: own lots. Buyer: open lots + lots they bought (RLS decides). Live-updates via realtime. */
export function useLots() {
  const { session } = useStore();
  const qc = useQueryClient();
  const id = uid(session);
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`lots-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "lots" }, () => qc.invalidateQueries({ queryKey: ["lots", id] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);
  return useQuery({
    queryKey: ["lots", id], enabled: !!id,
    queryFn: async () => { const { data, error } = await supabase.from("lots").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useMandi(state: string | null | undefined) {
  return useQuery({
    queryKey: ["mandi", state ?? "Haryana"],
    staleTime: 30 * 60 * 1000,
    queryFn: () => getMandiPrices({ data: { state: state || "Haryana" } }),
  });
}

/** ₹/kg for a crop: live mandi modal price if available, else fallback. */
export function useRate() {
  const { data: me } = useMe();
  const { data: m } = useMandi(me?.profile?.state);
  return (key: string, fallback: number) => {
    const p = m?.prices?.find((x) => x.crop === key);
    return p ? { rate: p.modalPerKg, live: true, market: p.market, date: p.date } : { rate: fallback, live: false, market: "", date: "" };
  };
}

export function useSaveProfile() {
  const { session } = useStore();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: Partial<Profile> & { role?: Role }) => {
      const { role, ...rest } = p;
      if (role) { const { error } = await supabase.rpc("claim_role", { _role: role }); if (error) throw error; }
      const { error } = await supabase.from("profiles").upsert({ id: uid(session), ...rest, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => inv("me"),
  });
}
