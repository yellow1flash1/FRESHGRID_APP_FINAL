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
      {
        name: "description",
        content:
          "AI crate grading, cold room booking on a live map, live mandi prices, buyer escrow and Kisan khata for Indian farmers and FPOs.",
      },
      { property: "og:title", content: "FreshGrid — Scan · Store · Sell" },
      {
        property: "og:description",
        content:
          "AI crate grading, cold storage booking, live mandi prices and buyer escrow for Indian farmers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { signOut, t } = useStore();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">
        {t("Couldn't load your account", "आपका खाता लोड नहीं हुआ")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t(
          "Check your internet connection and try again. If this keeps happening, share this message with support:",
          "इंटरनेट जाँचें और फिर कोशिश करें। समस्या बनी रहे तो यह संदेश भेजें:",
        )}
      </p>
      <p className="w-full break-words rounded-lg bg-secondary p-3 font-mono text-xs">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("Try again", "फिर कोशिश करें")}
        </button>
        <button
          onClick={() => signOut()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          {t("Sign out", "लॉग आउट")}
        </button>
      </div>
    </div>
  );
}

function App() {
  const { session, authReady } = useStore();
  const me = useMe();
  if (!authReady) return <Loading />;
  if (!session) return <Auth />;
  // If loading the profile fails (e.g. the database tables don't exist yet), show the reason
  // instead of spinning forever.
  if (me.isError)
    return (
      <LoadError
        message={(me.error as { message?: string })?.message ?? "Unknown error"}
        onRetry={() => me.refetch()}
      />
    );
  if (me.isLoading || !me.data) return <Loading />;
  const { profile, role } = me.data;
  const complete =
    role === "farmer"
      ? !!(profile?.village && profile?.upi_id && profile?.phone)
      : role === "buyer"
        ? !!(profile?.org_name && profile?.phone)
        : false;
  if (!complete) return <Onboarding profile={profile ?? null} role={role} />;
  return role === "buyer" ? <BuyerShell /> : <Shell />;
}

function Index() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
