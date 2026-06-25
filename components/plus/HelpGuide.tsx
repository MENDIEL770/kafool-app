"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/plus/ui";

type View = "menu" | "device" | "iphone" | "android" | "home";

/** Help button → contacts-import guide (device chooser + interactive guide) +
 *  "add to home screen" instructions. */
export default function HelpGuide({ label = "❓ עזרה", className }: { label?: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [device, setDevice] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    setDevice(/iPad|iPhone|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "other");
  }, []);

  const openMenu = () => { setView("menu"); setOpen(true); };
  const back = () => setView(view === "iphone" || view === "android" ? "device" : "menu");

  const guideSrc = view === "iphone" ? "/guides/contacts-iphone.html" : "/guides/contacts-android.html";
  const title =
    view === "iphone" ? "מדריך — אייפון" :
    view === "android" ? "מדריך — אנדרואיד" :
    view === "home" ? "הוספה למסך הבית" :
    view === "device" ? "איזה מכשיר יש לך?" : "עזרה";

  return (
    <>
      <button onClick={openMenu} className={className ?? "btn-ghost text-sm px-3 py-1.5 rounded-lg font-medium"} style={className ? undefined : { borderColor: "var(--border)" }}>
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {view === "menu" && (
          <div className="space-y-2">
            <button onClick={() => setView("device")} className="w-full text-right card p-4 flex items-center justify-between gap-2">
              <span className="font-semibold">📖 איך מייבאים את האנשי קשר שלי מהטלפון?</span>
              <span className="text-muted">›</span>
            </button>
            <button onClick={() => setView("home")} className="w-full text-right card p-4 flex items-center justify-between gap-2">
              <span className="font-semibold">📱 הוספת האפליקציה למסך הבית</span>
              <span className="text-muted">›</span>
            </button>
          </div>
        )}

        {view === "device" && (
          <div className="space-y-2">
            <p className="text-sm text-muted mb-2">בחר את סוג המכשיר שלך כדי לראות מדריך מותאם:</p>
            <button onClick={() => setView("iphone")} className="w-full card p-4 text-center font-bold text-lg">
              📱 אייפון (iPhone){device === "ios" ? " — המכשיר שלך" : ""}
            </button>
            <button onClick={() => setView("android")} className="w-full card p-4 text-center font-bold text-lg">
              🤖 אנדרואיד{device === "android" ? " — המכשיר שלך" : ""}
            </button>
          </div>
        )}

        {(view === "iphone" || view === "android") && (
          <div>
            <button onClick={back} className="btn-ghost text-sm px-3 py-1.5 rounded-lg mb-2" style={{ borderColor: "var(--border)" }}>← חזרה</button>
            <iframe src={guideSrc} title="מדריך" className="w-full rounded-lg border" style={{ height: "65vh", borderColor: "var(--border)" }} />
          </div>
        )}

        {view === "home" && (
          <div className="space-y-3">
            <button onClick={() => setView("menu")} className="btn-ghost text-sm px-3 py-1.5 rounded-lg mb-1" style={{ borderColor: "var(--border)" }}>← חזרה</button>
            <p className="text-sm text-muted">שמירת Kafool+ כאייקון במסך הבית — כמו אפליקציה אמיתית:</p>
            <div className="card p-4">
              <div className="font-bold mb-1">📱 אייפון (Safari)</div>
              <ol className="text-sm space-y-1 list-decimal pr-5 text-muted">
                <li>פתח את <b>plus.kafool.com</b> ב-<b>Safari</b>.</li>
                <li>לחץ על כפתור <b>השיתוף</b> ⬆️ בתחתית המסך.</li>
                <li>גלול ובחר <b>"הוסף למסך הבית"</b>.</li>
                <li>לחץ <b>"הוסף"</b> — האייקון יופיע במסך הבית.</li>
              </ol>
            </div>
            <div className="card p-4">
              <div className="font-bold mb-1">🤖 אנדרואיד (Chrome)</div>
              <ol className="text-sm space-y-1 list-decimal pr-5 text-muted">
                <li>פתח את <b>plus.kafool.com</b> ב-<b>Chrome</b>.</li>
                <li>לחץ על תפריט <b>⋮</b> בפינה.</li>
                <li>בחר <b>"הוסף למסך הבית"</b> / <b>"התקן אפליקציה"</b>.</li>
                <li>אשר — האייקון יופיע במסך הבית.</li>
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
