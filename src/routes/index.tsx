import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { useMe } from "@/lib/data";
import { Auth } from "@/components/fg/Auth";
import { Shell } from "@/components/fg/Shell";
import { BuyerShell } from "@/components/fg/BuyerShell";
import { Onboarding } from "@/components/fg/Onboarding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreshGrid — Scan · Store · Sell | FPO Agri-Tech Portal" },
      { name: "description", content: "AI crate grading, cold room booking on a live map, live mandi prices, buyer escrow and Kisan khata for Indian farmers and FPOs." },
      { property: "og:title", content: "FreshGrid — Scan · Store · Sell" },
      { property: "og:description", content: "AI crate grading, cold storage booking, live mandi prices and buyer escrow for Indian farmers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}

function App() {
  const { session, authReady } = useStore();
  const me = useMe();
  if (!authReady) return <Loading />;
  if (!session) return <Auth />;
  if (me.isLoading || !me.data) return <Loading />;
  const { profile, role } = me.data;
  const complete = role === "farmer" ? !!(profile?.village && profile?.upi_id && profile?.phone) : role === "buyer" ? !!(profile?.org_name && profile?.phone) : false;
  if (!complete) return <Onboarding profile={profile ?? null} role={role} />;
  return role === "buyer" ? <BuyerShell /> : <Shell />;
}

function Index() {
  return <StoreProvider><App /></StoreProvider>;
}
