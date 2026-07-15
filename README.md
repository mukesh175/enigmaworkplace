# Enigma Workplace

A self-hosted agency operating system: **Clients & CRM · Projects & Tasks · Time tracking · Invoicing · Team/HR & attendance · Dashboard · Chat · Files.**

Built with Next.js 14 (App Router), Prisma, NextAuth (credentials login), and Postgres — designed to run on **Vercel** with a **Neon** database.

> This is an original build modeled on a typical agency-workplace tool, not a reverse-engineered copy of dev.amoni.io — that product is behind a login wall I don't have access to. Tell me what's different about the real thing and I'll adjust any module.

---

## 1. What's inside

| Module | Where |
|---|---|
| Auth (email/password) | `/login`, NextAuth credentials provider |
| Dashboard | `/dashboard` |
| Clients & CRM | `/clients`, `/clients/[id]` |
| Projects & Tasks (kanban) | `/projects`, `/projects/[id]` |
| Time tracking | `/time` |
| Invoicing | `/invoices`, `/invoices/[id]` |
| Team & attendance | `/team` |
| Chat (1:1 DMs + read receipts) | `/chat`, `/chat/[id]` |
| Files (linked assets) | `/files` |

Roles: `ADMIN`, `MANAGER`, `MEMBER`. Admins can invite teammates and mark attendance; everyone can manage clients, projects, tasks, time and invoices.

**Files module note:** it stores file *metadata + URL*, not raw uploads (there's no storage credential to wire up yet). Point it at a Google Drive/Dropbox link today, or connect [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) later — the `addFile` action in `src/lib/actions/files.ts` is where you'd drop in the upload call.

---

## 2. Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in DATABASE_URL (see step 3 below for Neon)
cp .env.example .env

# 3. Push the schema to your database
npx prisma db push

# 4. Seed demo data (creates admin@enigma.work / admin123)
npm run db:seed

# 5. Run it
npm run dev
```

Open http://localhost:3000 and sign in with `admin@enigma.work` / `admin123`.

---

## 3. Create the Neon database

1. Go to https://neon.tech → **New Project** → name it `enigma-workplace`.
2. Once created, copy the **pooled connection string** it gives you (starts with `postgresql://...`).
3. Paste it into `.env` as `DATABASE_URL`, and also generate a secret for NextAuth:

```bash
openssl rand -base64 32
```

Put that value in `NEXTAUTH_SECRET`.

Your `.env` should look like:

```
DATABASE_URL="postgresql://<user>:<password>@<host>.neon.tech/enigma-workplace?sslmode=require"
NEXTAUTH_SECRET="<the random string from openssl>"
NEXTAUTH_URL="http://localhost:3000"
```

Then run:

```bash
npx prisma db push
npm run db:seed
```

---

## 4. Push the code to your GitHub repo

Your repo `mukesh175/enigmaworkplace` is currently empty, so:

```bash
cd enigma-workplace
git init
git add .
git commit -m "Initial commit: Enigma Workplace"
git branch -M main
git remote add origin https://github.com/mukesh175/enigmaworkplace.git
git push -u origin main
```

(If you're prompted for credentials, use a GitHub [personal access token](https://github.com/settings/tokens) as the password, or push via SSH if you have a key set up.)

---

## 5. Deploy to Vercel

**Option A — CLI:**

```bash
npm i -g vercel
vercel login
cd enigma-workplace
vercel link          # follow prompts, create a new project
vercel env add DATABASE_URL production      # paste your Neon connection string
vercel env add NEXTAUTH_SECRET production   # paste your generated secret
vercel env add NEXTAUTH_URL production      # e.g. https://enigmaworkplace.vercel.app
vercel --prod
```

**Option B — Dashboard:**
1. Go to https://vercel.com/new and import `mukesh175/enigmaworkplace`.
2. In **Environment Variables**, add `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (use your final `https://<project>.vercel.app` URL).
3. Click **Deploy**.

After the first deploy, run the schema push once against the Neon database (from your machine, with `.env` pointed at the *same* Neon URL you gave Vercel):

```bash
npx prisma db push
npm run db:seed
```

Then visit your Vercel URL and sign in with `admin@enigma.work` / `admin123`. **Change that password (or create your own admin user and delete the seed one) before sharing the link with your team.**

---

## 6. Project structure

```
src/
  app/
    login/
    (app)/                 ← authenticated shell (sidebar + topbar)
      dashboard/
      clients/[id]/
      projects/[id]/
      time/
      invoices/[id]/
      team/
      chat/
      files/
    api/auth/[...nextauth]/
  components/               ← Sidebar, Topbar, status selects
  lib/
    actions/                ← server actions (create/update/delete per module)
    auth.ts                 ← NextAuth config
    prisma.ts                ← Prisma client singleton
prisma/
  schema.prisma
  seed.ts
```

---

## 7. Next steps you may want

- Real file uploads via Vercel Blob or S3.
- Real-time chat (currently refresh-based) via Pusher/Ably or a WebSocket.
- Email invites/notifications (Resend or Postmark).
- PDF invoice export.
- Granular per-role permissions (currently role is stored but only lightly enforced).

Tell me which of these matter most and I'll build them next.
