import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Profile,
  ColdRoom,
  Scan,
  Booking,
  Lot,
  Role,
  Transport,
  Vehicle,
  District,
  OwnerDashboard,
  TransporterDashboard,
} from "./types";
import { useStore } from "./store";
import { getMandiPrices } from "./mandi.functions";
import {
  getMe,
  getColdRooms,
  getScans,
  getBookings,
  getLots,
  saveProfile,
  getTransports,
  getTransportMeta,
  getOwnerDashboard,
  getTransporterDashboard,
  getRateables,
  getReputation,
  getPendingReveal,
  getFarm,
} from "./app.functions";
import type { FlowId, FlowRep } from "./krishisaakh";
import {
  getSettings,
  getMyReviews,
  isAdmin,
  getAdminData,
  type Settings,
} from "./account.functions";
export type { Settings };

export type { Profile, ColdRoom, Scan, Booking, Lot, Role, Transport, Vehicle, District };

const uid = (s: ReturnType<typeof useStore>["session"]) => s?.user.id ?? "";

export function useMe() {
  const { session } = useStore();
  const id = uid(session);
  return useQuery({
    queryKey: ["me", id],
    enabled: !!id,
    queryFn: async () => (await getMe()) as { profile: Profile | null; role: Role | null },
  });
}

export function useColdRooms() {
  return useQuery({
    queryKey: ["cold_rooms"],
    queryFn: async () => {
      const { rooms, free } = await getColdRooms();
      const m = new Map(free.map((f) => [f.cold_room_id, f.free]));
      return (rooms as unknown as Omit<ColdRoom, "free">[]).map((r) => ({
        ...r,
        free: m.get(r.id) ?? r.total_slots,
      })) as ColdRoom[];
    },
  });
}

export function useScans() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["scans", uid(session)],
    enabled: !!session,
    queryFn: async () => (await getScans()) as unknown as Scan[],
  });
}
export function useBookings() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["bookings", uid(session)],
    enabled: !!session,
    queryFn: async () => (await getBookings()) as unknown as Booking[],
  });
}

/** Farmer: own lots. Buyer: open lots + lots they bought (the server decides). Refreshes every 8 s. */
export function useLots() {
  const { session } = useStore();
  const id = uid(session);
  return useQuery({
    queryKey: ["lots", id],
    enabled: !!id,
    refetchInterval: 8000, // replaces the old realtime subscription
    queryFn: async () => (await getLots()) as unknown as Lot[],
  });
}

export function useTransports() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["transports", uid(session)],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => (await getTransports()) as unknown as Transport[],
  });
}
export function useTransportMeta() {
  return useQuery({
    queryKey: ["transport_meta"],
    staleTime: Infinity,
    queryFn: async () =>
      (await getTransportMeta()) as unknown as { vehicles: Vehicle[]; districts: District[] },
  });
}

/** Cold room owner dashboard. Neon has no push channel, so it re-checks every 5 s while the tab is open. */
export function useOwnerDashboard() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["owner", uid(session)],
    enabled: !!session,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryFn: async () => (await getOwnerDashboard()) as unknown as OwnerDashboard,
  });
}

/** Transporter dashboard: nearby requests, own trips and earnings. Re-checks every 8 s for new requests. */
export function useTransporterDashboard() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["driver", uid(session)],
    enabled: !!session,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    queryFn: async () => (await getTransporterDashboard()) as unknown as TransporterDashboard,
  });
}

/** KrishiSaakh reputations for a set of users, fetched in one request. */
export function useReps(ids: (string | null | undefined)[]) {
  const { session } = useStore();
  const list = [...new Set(ids.filter((x): x is string => !!x))].sort();
  return useQuery({
    queryKey: ["rep", ...list],
    enabled: !!session && list.length > 0,
    staleTime: 60_000,
    queryFn: async () =>
      (await getReputation({ data: { ids: list } })) as Record<
        string,
        Partial<Record<FlowId, FlowRep>>
      >,
  });
}
/** The farmer's saved FasalNiti farm details (null until they fill the form). */
export function useFarm() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["farm", uid(session)],
    enabled: !!session,
    queryFn: () => getFarm(),
  });
}
/** Account-level settings (notifications, crops, alerts…) plus transporter online flag and owner palledari. */
export function useSettings() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["settings", uid(session)],
    enabled: !!session,
    queryFn: () => getSettings(),
  });
}
export function useMyReviews() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["reviews", uid(session)],
    enabled: !!session,
    queryFn: () => getMyReviews(),
  });
}
export function useIsAdmin() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["is-admin", uid(session)],
    enabled: !!session,
    staleTime: Infinity,
    queryFn: () => isAdmin(),
  });
}
export function useAdminData(enabled: boolean) {
  return useQuery({ queryKey: ["admin"], enabled, queryFn: () => getAdminData() });
}
/** True when alert sounds are allowed now (sound on, and not inside quiet hours). */
export function soundAllowed(s: Settings | undefined) {
  const n = s?.notify;
  if (n?.sound === false) return false;
  if (!n?.quiet || !n.quietFrom || !n.quietTo) return true;
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = n.quietFrom.split(":").map(Number);
  const [th, tm] = n.quietTo.split(":").map(Number);
  const from = fh! * 60 + fm!,
    to = th! * 60 + tm!;
  return from <= to ? !(m >= from && m < to) : !(m >= from || m < to);
}

export function useRateables() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["rateables", uid(session)],
    enabled: !!session,
    refetchInterval: 30_000,
    queryFn: () => getRateables(),
  });
}
export function usePendingReveal() {
  const { session } = useStore();
  return useQuery({
    queryKey: ["reveal", uid(session)],
    enabled: !!session,
    queryFn: () => getPendingReveal(),
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
    return p
      ? { rate: p.modalPerKg, live: true, market: p.market, date: p.date }
      : { rate: fallback, live: false, market: "", date: "" };
  };
}

export function useSaveProfile() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (p: Partial<Profile> & { role?: Role; consent?: true }) => {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
      await saveProfile({ data: rest as never });
    },
    onSuccess: () => inv("me"),
  });
}
