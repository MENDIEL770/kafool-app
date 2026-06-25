"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/plus/store";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import { Field, Input } from "@/components/plus/ui";
import { Loader2, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function PlusSettingsPage() {
  const router = useRouter();
  const session = useStore((s) => s.session);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setDone(null);
    if (next.length < 6) { setError("הסיסמה החדשה חייבת להכיל לפחות 6 תווים"); return; }
    if (next !== confirm) { setError("הסיסמאות אינן תואמות"); return; }
    if (!session?.email) { setError("לא מחובר"); return; }

    setLoading(true);
    const supabase = createClient();

    // 1) verify the current password (אימות) by re-authenticating.
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: session.email, password: current });
    if (verifyErr) { setError("הסיסמה הנוכחית שגויה"); setLoading(false); return; }

    // 2) update to the new password.
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    if (updErr) { setError(updErr.message); setLoading(false); return; }

    // 3) notify the member (email + SMS) with their login details.
    const res = await fetch("/api/plus/notify-credentials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }).then(r => r.json()).catch(() => ({}));

    setLoading(false);
    setCurrent(""); setNext(""); setConfirm("");
    const channels = [res.emailSent && "אימייל", res.smsSent && "SMS"].filter(Boolean).join(" + ");
    setDone(channels ? `הסיסמה עודכנה — נשלחו פרטי ההתחברות ב-${channels}.` : "הסיסמה עודכנה בהצלחה.");
  }

  return (
    <ThemeRoot campaignId={session?.campaign_id ?? null}>
      <AppShell subtitle="הגדרות חשבון">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm mb-3 opacity-80 hover:opacity-100" style={{ color: "var(--text)" }}>
          <ArrowRight className="w-4 h-4" /> חזרה
        </button>

        <div className="kp-card max-w-md mx-auto p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-violet-600" /></div>
            <div>
              <h1 className="font-black text-lg">שינוי סיסמה</h1>
              {session?.email && <p className="text-xs opacity-60" dir="ltr">{session.email}</p>}
            </div>
          </div>
          <p className="text-[13px] opacity-70 mb-4">לאחר העדכון יישלחו אליך פרטי ההתחברות באימייל וב-SMS.</p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
          {done && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {done}
            </p>
          )}

          <form onSubmit={save} className="space-y-3">
            <Field label="סיסמה נוכחית (אימות)">
              <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} required dir="ltr" autoComplete="current-password" placeholder="••••••••" />
            </Field>
            <Field label="סיסמה חדשה">
              <Input type="password" value={next} onChange={e => setNext(e.target.value)} required dir="ltr" autoComplete="new-password" placeholder="לפחות 6 תווים" />
            </Field>
            <Field label="אימות סיסמה חדשה">
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required dir="ltr" autoComplete="new-password" placeholder="הקלד/י שוב" />
            </Field>
            <Field label="טלפון לקבלת SMS (אופציונלי)">
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="05X-XXXXXXX" />
            </Field>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "var(--brand, #21376a)" }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "עדכן סיסמה"}
            </button>
          </form>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
