"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shown on plus.kafool.com when the signed-in Google account isn't a Kafool+
// account — usually picking the wrong account from a multi-account browser.
export default function NotEntitled({ email }: { email?: string | null }) {
  const router = useRouter();
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, #0f1830 0%, #16223f 45%, #21376a 100%)" }}>
      <div className="rounded-3xl p-7 shadow-2xl text-center max-w-md w-full" style={{ background: "rgba(255,255,255,0.97)" }}>
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-xl font-black text-gray-900">החשבון הזה אינו מחובר ל-Kafool+</h1>
        <p className="text-sm text-gray-500 mt-2">
          {email ? <><b dir="ltr">{email}</b> — </> : null}
          החשבון לא רשום כמשתמש Kafool+. אם יש לך כמה חשבונות Google בדפדפן, ייתכן שנבחר החשבון הלא נכון.
        </p>
        <button
          onClick={async () => { await createClient().auth.signOut(); router.push("/kafool-plus-login"); }}
          className="mt-5 w-full py-3 rounded-2xl font-bold text-white"
          style={{ background: "linear-gradient(135deg,#21376a,#2a4a8c)" }}
        >
          התנתק והתחבר עם חשבון אחר
        </button>
      </div>
    </div>
  );
}
