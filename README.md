# Iyin-Ekiti TechFest powered by Fiesu and FUTES Gotham Mafians

Next.js 16 + Tailwind 4 + React Three Fiber + Supabase + Groq + Paystack + Resend.

## Setup
1. `npm install`
2. Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
3. In Supabase Auth, disable public sign-ups, create your admin user, then run:
   `insert into admins (user_id) values ('USER-UUID');`
4. Copy `.env.example` to `.env.local` and fill in every value.
5. `npm run dev`, then open `/admin/login`.

## Env vars
- Supabase: URL, anon key, service role key (Project Settings, API)
- `GROQ_API_KEY` (console.groq.com), `GROQ_MODEL` optional
- `PAYSTACK_SECRET_KEY`. Set the webhook to `https://YOUR-SITE/api/paystack/webhook`
- `RESEND_API_KEY` and `EMAIL_FROM` (verify your domain in Resend to email anyone)
- `NEXT_PUBLIC_SITE_URL` the live URL (used in emails and QR links)

## Admin
- Page builder: add, remove, reorder and edit every section, live preview, draft and publish, version restore
- Buy tickets: add the "Buy tickets" section and publish to turn sales on. Remove it and publish to turn them off
- Chatbot: edit the knowledge base text, or load a .txt/.md file
- Subscribers: send broadcasts, or tick "Email subscribers" when publishing
- Registrations: view and export CSV. Check-in: scan or type ticket codes

## Deploy
Push to GitHub, import into Vercel, add the env vars, deploy.
