import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
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
export function Btn({ v = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { v?: V }) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50", vs[v], className)} />;
}
export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "amber" | "red" | "muted" }) {
  const m = { gold: "bg-secondary text-primary", green: "bg-success/10 text-success", amber: "bg-warning/10 text-warning", red: "bg-destructive/10 text-destructive", muted: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", m[tone])}>{children}</span>;
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className={cn("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5 shadow-xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm text-muted-foreground">{label}</span>{children}</label>;
}
export const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/15";
export function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return <div className="mb-4"><h2 className="text-xl font-semibold text-foreground">{title}</h2>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>;
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
        {[22, 29, 36].map((y) => (<g key={y}><ellipse cx="27" cy={y} rx="5" ry="2.4" transform={`rotate(-35 27 ${y})`} /><ellipse cx="37" cy={y} rx="5" ry="2.4" transform={`rotate(35 37 ${y})`} /></g>))}
      </g>
    </svg>
  );
}
