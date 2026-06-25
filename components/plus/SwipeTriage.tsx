"use client";

import { useEffect, useRef, useState } from "react";
import type { Lead } from "@/lib/plus/types";
import { StatusBadge } from "@/components/plus/ui";
import { isIsraeliPhone } from "@/lib/plus/phone";

/** Tinder-style swipe to pick who to call (right = yes, left = skip). */
export default function SwipeTriage({
  queue, onDecide, onBatch, doneMessage,
}: {
  queue: Lead[];
  onDecide?: (id: string, d: "yes" | "no") => void;
  // batched persistence — preferred for large queues (buffer + flush in chunks)
  onBatch?: (items: { id: string; decision: "yes" | "no" }[]) => void;
  doneMessage?: string;
}) {
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  // Freeze the queue once: swiping is driven by a LOCAL index, so it stays instant
  // even with thousands of leads (no global re-render / server call per swipe).
  const [snapshot] = useState<Lead[]>(queue);
  const [i, setI] = useState(0);
  const buffer = useRef<{ id: string; decision: "yes" | "no" }[]>([]);
  const current = snapshot[i];
  const remaining = Math.max(0, snapshot.length - i);

  const flush = () => {
    if (!buffer.current.length) return;
    const items = buffer.current;
    buffer.current = [];
    if (onBatch) onBatch(items);
    else if (onDecide) for (const it of items) onDecide(it.id, it.decision);
  };
  // flush the tail when the screen closes / unmounts
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = (d: "yes" | "no") => {
    if (!current) return;
    setDrag(0);
    buffer.current.push({ id: current.id, decision: d });
    if (buffer.current.length >= 20) flush();
    setI((x) => x + 1);
  };
  const onStart = (x: number) => (startX.current = x);
  const onMove = (x: number) => { if (startX.current === null) return; setDrag(x - startX.current); };
  const onEnd = () => {
    if (startX.current === null) return;
    if (drag > 80) decide("yes");
    else if (drag < -80) decide("no");
    else setDrag(0);
    startX.current = null;
  };

  if (!current) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <div className="text-4xl mb-2">✅</div>
        <p className="font-semibold">סיימת לסנן!</p>
        {doneMessage && <p className="text-sm text-muted mt-1">{doneMessage}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="text-center mb-3">
        <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: "var(--bg)" }}>
          נותרו לסינון: <b>{remaining}</b>
        </span>
      </div>
      <div className="relative h-72">
        {snapshot[i + 1] && <div className="absolute inset-0 card scale-95 opacity-50" />}
        <div
          className="absolute inset-0 card p-6 flex flex-col justify-between cursor-grab active:cursor-grabbing"
          style={{
            transform: `translateX(${drag}px) rotate(${drag / 20}deg)`,
            transition: startX.current === null ? "transform 0.25s ease" : "none",
            borderColor: drag > 40 ? "#16a34a" : drag < -40 ? "#dc2626" : "var(--border)",
            borderWidth: 2,
          }}
          onMouseDown={(e) => onStart(e.clientX)}
          onMouseMove={(e) => startX.current !== null && onMove(e.clientX)}
          onMouseUp={onEnd}
          onMouseLeave={() => startX.current !== null && onEnd()}
          onTouchStart={(e) => onStart(e.touches[0].clientX)}
          onTouchMove={(e) => onMove(e.touches[0].clientX)}
          onTouchEnd={onEnd}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-4xl font-extrabold leading-tight">{current.full_name}</h2>
                {current.is_vip && <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-bold">VIP</span>}
                {!isIsraeliPhone(current.phone) && <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ background: "#0ea5e9" }}>🌍 חו״ל</span>}
              </div>
              <div className="text-lg text-muted mt-1" dir="ltr">{current.phone}</div>
            </div>
          </div>
          <div className="text-sm space-y-1">
            {current.donation_history.length > 0 && (
              <div>תרומה קודמת: <b>{current.donation_history[current.donation_history.length - 1].amount.toLocaleString("he-IL")} ₪</b></div>
            )}
            {current.address && <div className="text-muted">{current.address}</div>}
            <div><StatusBadge status={current.status} /></div>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span style={{ color: drag < -40 ? "#dc2626" : "var(--muted)" }}>✕ לא להתקשר</span>
            <span style={{ color: drag > 40 ? "#16a34a" : "var(--muted)" }}>להתקשר ✓</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={() => decide("no")} className="py-5 rounded-2xl text-white text-xl font-bold" style={{ background: "#dc2626" }}>✕ דלג</button>
        <button onClick={() => decide("yes")} className="py-5 rounded-2xl text-white text-xl font-bold" style={{ background: "#16a34a" }}>✓ התקשר</button>
      </div>
      <p className="text-center text-xs text-muted mt-3">החלק ימינה לכן · שמאלה ללא · או הקש על כפתור</p>
    </div>
  );
}
