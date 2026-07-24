# Kafool — כפול

פלטפורמת גיוס תרומות לעמותות, בתי חב״ד, מוסדות חינוך וקהילות: דפי גיוס מעוצבים,
סליקה מאובטחת בתוך האתר (iFrame), ניהול קמפיינים, טלפנים וקבוצות, אוטומציות
(תודות ותזכורות ב-SMS/מייל/WhatsApp), וסקירת תנועה בזמן אמת.

A fundraising platform (Next.js + Supabase, RTL Hebrew). Campaign pages, in-page
secure checkout (Kesher / Nedarim Plus), donor & lead management, and messaging
automations.

## Tech

- **Next.js 16** (App Router, Turbopack) — note: a modified build; see `AGENTS.md`.
- **Supabase** (Postgres + Auth + Storage)
- **Tailwind CSS v4**, RTL
- Deployed on **Vercel**

## Getting started

```bash
npm install            # or: npm ci
cp .env.example .env.local   # then fill in real values
npm run dev            # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Required to boot:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `NEXT_PUBLIC_BASE_URL` | Public site URL (e.g. https://www.kafool.com) |

Optional, per feature (see `.env.example` for the full grouped list):

- **Email** (thank-you / recovery): `RESEND_API_KEY`, `EMAIL_FROM`
- **SMS** (Yemot): `YEMOT_API_KEY`, `SMS_SENDER`, …
- **WhatsApp** (Meta Cloud API): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_THANKS_TEMPLATE`, `WHATSAPP_ABANDON_TEMPLATE`, `NEXT_PUBLIC_WEBHOOK_KEY`
- **Incoming payment-webhook auth**: `WEBHOOK_SECRET` (+ `?key=` on the provider callback URLs), `CRON_SECRET`
- **Kafool+ outgoing sync**: `KAFOOL_WEBHOOK_SECRET`
- **Payment providers**: `KESHER_*`, `GROW_*`

## Notes

- `AGENTS.md` / `CLAUDE.md` — repo conventions (this is a modified Next.js; read the
  bundled docs before changing framework behavior). Routing is via `proxy.ts`.
- DB schema changes are applied via SQL run against Supabase (see `supabase/`).
- `.env.local` is gitignored and must never be committed.
