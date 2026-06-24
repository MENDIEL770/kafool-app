"use client";

import { useEffect } from "react";

export function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function Progress({ value, goal }: { value: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{value.toLocaleString("he-IL")} ₪</span>
        <span>{pct}% מתוך {goal.toLocaleString("he-IL")} ₪</span>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="card w-full sm:max-w-lg max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted text-xl leading-none">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 ${props.className ?? ""}`}
      style={{ borderColor: "var(--border)", ...(props.style ?? {}) }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 rounded-lg border bg-transparent outline-none focus:ring-2 ${props.className ?? ""}`}
      style={{ borderColor: "var(--border)", ...(props.style ?? {}) }}
    />
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: "חדש", color: "#64748b" },
  no_answer: { label: "אין מענה", color: "#f59e0b" },
  busy: { label: "תפוס", color: "#f97316" },
  wrong_number: { label: "מספר שגוי", color: "#ef4444" },
  not_interested: { label: "לא מעוניין", color: "#dc2626" },
  removed: { label: "להסרה", color: "#7f1d1d" },
  callback: { label: "חזור אליו", color: "#3b82f6" },
  promised: { label: "הבטיח", color: "#8b5cf6" },
  donated: { label: "תרם", color: "#16a34a" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "#64748b" };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: m.color }}>
      {m.label}
    </span>
  );
}

export const STATUS_LIST = STATUS_META;
