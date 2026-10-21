import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { Volume2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type V = "primary" | "gold" | "outline" | "ghost" | "danger";
const vs: Record<V, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-2",
  // "gold" is kept as a name for compatibility; it is now the quiet secondary button.
  gold: "border border-primary/25 bg-card text-primary hover:bg-secondary",
  outline: "border border-border bg-card text-primary hover:bg-secondary",
  ghost: "text-primary hover:bg-secondary",
  danger: "bg-destructive text-destructive-foreground hover:opacity-90",
};
export function Btn({
  v = "primary",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { v?: V }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
        vs[v],
        className,
      )}
    />
  );
}
export function Badge({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "green" | "amber" | "red" | "muted";
}) {
  const m = {
    gold: "bg-secondary text-primary",
    green: "bg-success/10 text-success",
    amber: "bg-warning/10 text-warning",
    red: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        m[tone],
      )}
    >
      {children}
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 shadow-xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
export const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/15";
/** Boxed page header with a thin tricolour strip; every tab of every role starts with one. */
export function SectionTitle({
  title,
  sub,
  icon: Icon,
  right,
}: {
  title: string;
  sub?: string | undefined;
  icon?: ComponentType<{ className?: string }> | undefined;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-md border border-border bg-card">
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-1 bg-saffron" />
        <span className="flex flex-1 items-center justify-center bg-card">
          <span className="h-1.5 w-1.5 rounded-full bg-navy" />
        </span>
        <span className="flex-1 bg-primary-2" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-soft text-navy">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight text-foreground">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
        </div>
        <ReadAloud text={`${title}. ${sub ?? ""}`} />
        {right}
      </div>
    </div>
  );
}
/** Speaker button (shown when "Read screens aloud" is on in Settings). */
export function ReadAloud({ text }: { text: string }) {
  const { s, t } = useStore();
  if (!s.readAloud || typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const say = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = s.lang === "hi" ? "hi-IN" : "en-IN";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  return (
    <button
      type="button"
      onClick={say}
      aria-label={t("Read aloud", "पढ़कर सुनाएँ")}
      className="shrink-0 rounded-md p-2 text-navy hover:bg-navy-soft"
    >
      <Volume2 className="h-5 w-5" />
    </button>
  );
}
/** Grey placeholder shapes while data loads. */
export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
/** Friendly empty state with an optional next step. */
export function Empty({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-classic flex flex-col items-center gap-2 p-6 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {sub && <p className="max-w-sm text-sm text-muted-foreground">{sub}</p>}
      {action}
    </div>
  );
}
/** Small label above a list or group. Sentence case, no tracking. */
export function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm font-medium text-muted-foreground">{children}</p>;
}
/** Simple wheat mark. Kept as "Crest" so existing imports keep working. */
export function Crest({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <g className="text-primary-foreground" fill="currentColor">
        <path d="M32 16 v32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {[22, 29, 36].map((y) => (
          <g key={y}>
            <ellipse cx="27" cy={y} rx="5" ry="2.4" transform={`rotate(-35 27 ${y})`} />
            <ellipse cx="37" cy={y} rx="5" ry="2.4" transform={`rotate(35 37 ${y})`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
