"use client";

import { useEffect } from "react";

export function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-4 kp-fade">
      <div className="kp-stat-num" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>{value}</div>
      <div className="kp-stat-label text-muted">{label}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

/** Compact stat used on dark headers (number over label, no card). */
export function HeaderStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kp-stat">
      <div className="kp-stat-num">{value}</div>
      <div className="kp-stat-label">{label}</div>
    </div>
  );
}

export function Progress({ value, goal, light }: { value: number; goal: number; light?: boolean }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="kp-track" style={light ? { background: "rgba(255,255,255,.18)" } : undefined}>
        <div className="kp-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs mt-1.5" style={{ color: light ? "rgba(255,255,255,.8)" : "var(--muted)" }}>
        <span>{value.toLocaleString("he-IL")} ₪</span>
        <span>{pct}% מתוך {goal.toLocaleString("he-IL")} ₪</span>
      </div>
    </div>
  );
}

/** Stacked icon+label action tile (e.g. תרומות / החזרות / תסריט). */
export function ActionTile({ icon, label, onClick, accentColor }: { icon: React.ReactNode; label: string; onClick?: () => void; accentColor?: string }) {
  return (
    <button type="button" onClick={onClick} className="kp-tile">
      <span style={{ color: accentColor ?? "var(--primary)" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/** Quick-status pill with an icon. */
export function StatusChip({ icon, label, onClick, color }: { icon?: React.ReactNode; label: string; onClick?: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick} className="kp-chip">
      {icon && <span style={{ color: color ?? "var(--muted)" }}>{icon}</span>}
      {label}
    </button>
  );
}

export function Modal({ open, onClose, title, help, children }: { open: boolean; onClose: () => void; title: string; help?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="card w-full sm:max-w-lg max-h-[92vh] overflow-auto rounded-t-3xl sm:rounded-3xl kp-fade"
        style={{ boxShadow: "var(--shadow-md)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <button onClick={onClose} aria-label="סגור" className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-muted hover:bg-black/5 transition-colors">✕</button>
          <h3 className="font-extrabold text-lg flex-1 text-center">{title}</h3>
          <span title={help} className="w-8 h-8 rounded-full flex items-center justify-center text-muted" style={{ visibility: help ? "visible" : "hidden" }}>?</span>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 transition ${props.className ?? ""}`}
      style={{ borderColor: "var(--border)", ...(props.style ?? {}) }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border bg-transparent outline-none focus:ring-2 transition ${props.className ?? ""}`}
      style={{ borderColor: "var(--border)", ...(props.style ?? {}) }}
    />
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: "חדש", color: "#16a34a" },
  no_answer: { label: "אין מענה", color: "#f59e0b" },
  busy: { label: "תפוס", color: "#f97316" },
  wrong_number: { label: "מספר שגוי", color: "#ef4444" },
  not_interested: { label: "לא מעוניין", color: "#dc2626" },
  removed: { label: "להסרה", color: "#7f1d1d" },
  callback: { label: "חזור אליו", color: "#2563eb" },
  promised: { label: "הבטיח", color: "#8b5cf6" },
  donated: { label: "תרם", color: "#16a34a" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "#64748b" };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: m.color }}>
      {m.label}
    </span>
  );
}

export const STATUS_LIST = STATUS_META;
