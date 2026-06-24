"use client";

import { useMemo, useRef, useState } from "react";
import { useStore, descendantCampaignIds } from "@/lib/plus/store";
import { useRequireRole } from "@/lib/plus/useAuth";
import AppShell from "@/components/plus/AppShell";
import ThemeRoot from "@/components/plus/ThemeRoot";
import ManagerNav from "@/components/plus/ManagerNav";
import { StatusBadge } from "@/components/plus/ui";

export default function FilterPage() {
  const session = useRequireRole(["manager"]);
  const rootId = session?.campaign_id ?? null;
  const campaigns = useStore((s) => s.campaigns);
  const leads = useStore((s) => s.leads);
  const setCallDecision = useStore((s) => s.setCallDecision);

  const treeIds = useMemo(() => (rootId ? descendantCampaignIds(campaigns, rootId) : []), [campaigns, rootId]);
  const queue = useMemo(
    () => leads.filter((l) => treeIds.includes(l.campaign_id) && l.call_decision === undefined),
    [leads, treeIds]
  );

  const decided = leads.filter((l) => treeIds.includes(l.campaign_id) && l.call_decision !== undefined);
  const yesCount = decided.filter((l) => l.call_decision === "yes").length;
  const noCount = decided.filter((l) => l.call_decision === "no").length;

  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const current = queue[0];

  const decide = (d: "yes" | "no") => {
    if (!current) return;
    setDrag(0);
    setCallDecision(current.id, d);
  };

  const onStart = (x: number) => (startX.current = x);
  const onMove = (x: number) => {
    if (startX.current === null) return;
    setDrag(x - startX.current);
  };
  const onEnd = () => {
    if (startX.current === null) return;
    if (drag > 80) decide("yes");
    else if (drag < -80) decide("no");
    else setDrag(0);
    startX.current = null;
  };

  if (!session) return null;

  return (
    <ThemeRoot campaignId={rootId}>
      <AppShell subtitle="סינון — למי להתקשר">
        <ManagerNav />

        <div className="flex justify-center gap-6 mb-4 text-center">
          <div><div className="text-2xl font-bold" style={{ color: "#16a34a" }}>{yesCount}</div><div className="text-xs text-muted">כן</div></div>
          <div><div className="text-2xl font-bold" style={{ color: "#dc2626" }}>{noCount}</div><div className="text-xs text-muted">לא</div></div>
          <div><div className="text-2xl font-bold">{queue.length}</div><div className="text-xs text-muted">נותרו</div></div>
        </div>

        {!current ? (
          <div className="card p-8 text-center max-w-md mx-auto">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold">סיימת לסנן את כל הרשימה!</p>
            <p className="text-sm text-muted mt-1">{yesCount} סומנו להתקשרות. המשך ל<b>שיוך</b>.</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto select-none">
            <div className="relative h-72">
              {/* next card peek */}
              {queue[1] && (
                <div className="absolute inset-0 card scale-95 opacity-50" />
              )}
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
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{current.full_name}</h2>
                      {current.is_vip && <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-bold">VIP</span>}
                    </div>
                    <div className="text-lg text-muted mt-1" dir="ltr">{current.phone}</div>
                  </div>
                  {current.needs_review && <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "#f59e0b" }}>לבדיקה</span>}
                </div>

                <div className="text-sm space-y-1">
                  {current.donation_history.length > 0 && (
                    <div>תרומה קודמת: <b>{current.donation_history[current.donation_history.length - 1].amount.toLocaleString("he-IL")} ₪</b></div>
                  )}
                  {current.address && <div className="text-muted">{current.address}</div>}
                  <div><StatusBadge status={current.status} /></div>
                </div>

                {/* swipe hints */}
                <div className="flex justify-between text-sm font-bold">
                  <span style={{ color: drag < -40 ? "#dc2626" : "var(--muted)" }}>✕ לא להתקשר</span>
                  <span style={{ color: drag > 40 ? "#16a34a" : "var(--muted)" }}>להתקשר ✓</span>
                </div>
              </div>
            </div>

            {/* big tap buttons (mobile-first, single tap) */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => decide("no")} className="py-5 rounded-2xl text-white text-xl font-bold" style={{ background: "#dc2626" }}>
                ✕ דלג
              </button>
              <button onClick={() => decide("yes")} className="py-5 rounded-2xl text-white text-xl font-bold" style={{ background: "#16a34a" }}>
                ✓ התקשר
              </button>
            </div>
            <p className="text-center text-xs text-muted mt-3">החלק ימינה לכן · שמאלה ללא · או הקש על כפתור</p>
          </div>
        )}
      </AppShell>
    </ThemeRoot>
  );
}
