"use client";

import { useState } from "react";
import {
  quickOptions,
  upcomingDays,
  hebrewDateLabel,
  TIME_OF_DAY,
  applyTimeOfDay,
  timeOfDayLabel,
  type TimeOfDay,
} from "@/lib/plus/hebrewDate";

/**
 * Two-step callback scheduler:
 *  1) pick a day — quick defaults (היום/מחר/אחרי ה-10) + a scrollable list of
 *     upcoming days with Hebrew (Jewish-calendar) labels.
 *  2) pick a time of day (בוקר/צהריים/ערב) — optional.
 * Returns the resolved Date + a human label for the reminder/SMS.
 */
export default function CallbackPicker({
  onConfirm,
}: {
  onConfirm: (date: Date, label: string, tod: TimeOfDay) => void;
}) {
  const [step, setStep] = useState<"day" | "time">("day");
  const [day, setDay] = useState<Date | null>(null);
  const quicks = quickOptions();
  const days = upcomingDays(21);

  const pickDay = (d: Date) => {
    setDay(d);
    setStep("time");
  };

  const confirm = (tod: TimeOfDay) => {
    if (!day) return;
    const resolved = applyTimeOfDay(day, tod);
    const label = `${hebrewDateLabel(day)}${tod !== "any" ? " · " + timeOfDayLabel(tod) : ""}`;
    onConfirm(resolved, label, tod);
  };

  if (step === "time" && day) {
    return (
      <div>
        <button onClick={() => setStep("day")} className="text-sm text-muted mb-3">→ חזרה לבחירת יום</button>
        <div className="card p-3 mb-4 text-center" style={{ background: "var(--bg)" }}>
          <div className="font-semibold">{hebrewDateLabel(day)}</div>
        </div>
        <div className="text-sm font-medium mb-2">באיזו שעה? (רשות)</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {TIME_OF_DAY.map((t) => (
            <button
              key={t.key}
              onClick={() => confirm(t.key)}
              className="py-4 rounded-xl font-semibold text-white"
              style={{ background: "var(--secondary)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => confirm("any")} className="btn-ghost w-full py-3 rounded-xl font-medium" style={{ borderColor: "var(--border)" }}>
          ללא שעה — שמור ליום הזה
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-medium mb-2">ברירות מחדל</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {quicks.map((q) => (
          <button
            key={q.key}
            onClick={() => pickDay(q.date)}
            className="py-3 px-2 rounded-xl font-semibold text-white text-sm leading-tight"
            style={{ background: "var(--primary)" }}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="text-sm font-medium mb-2">או בחר יום מהרשימה</div>
      <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: "var(--border)" }}>
        {days.map((d) => (
          <button
            key={d.toISOString()}
            onClick={() => pickDay(d)}
            className="w-full text-right px-4 py-3 hover:opacity-80 flex items-center justify-between"
          >
            <span>{hebrewDateLabel(d)}</span>
            <span className="text-muted">←</span>
          </button>
        ))}
      </div>
    </div>
  );
}
