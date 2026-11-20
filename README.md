# Walammi

Walammi is a read-only PDF story reading platform. Readers follow **series** made of **parts**, read them in a secure in-browser viewer, react and comment — while the source PDFs live in **Cloudflare R2** and are never downloadable. Ships with a full **admin dashboard** (content, users, comments, analytics) and runs on **Neon Postgres**, ready to deploy on **Vercel**.

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 15 (App Router pages + Pages Router API routes), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Neon Postgres via Prisma ORM |
| Auth | NextAuth v4 (credentials, bcrypt, JWT sessions, roles: `READER` / `EDITOR` / `ADMIN`) |
| PDF viewer | pdf.js 4.10 (self-hosted in `public/vendor/`), canvas rendering |
| Storage | Cloudflare R2 (public links or private bucket mode) |
| Charts | Recharts |

## Features

**Reader side**
- Home page with featured series + library stats, browse with search & genre filter.
- Series pages listing parts with reads/comments/reaction counts.
- Read-only PDF viewer: pages render to `<canvas>` (no native PDF plugin), per-page watermark with the reader's name, no download/print/copy controls, right-click & `Ctrl+S/P/U/A/C` blocked with a toast, print stylesheet stub, prev/next part navigation, zoom levels, responsive fit-width that re-renders on resize.
- Reactions: 👍 Like, ❤️ Love, 😮 Wow, 😢 Sad, 🔥 Fire — one per user per part per kind.
- Threaded comments (up to 5 levels) in a slide-in drawer.
- Accounts: register, sign in, account page with reading history.

**Admin dashboard** (`/admin`, role `ADMIN` or `EDITOR`)
- **Overview**: 6 stat cards (users, reads, series, comments, reactions, blocked download attempts), 14-day traffic chart (reads + signups), most-read parts bar chart, reactions pie breakdown, newest users, recent activity feed.
- **Series & Parts**: create series (title/author/genre/status/cover/featured), add parts by pasting an **R2 public link**, edit/publish/unpublish/reorder/delete parts, delete series.
- **Users**: search, change role, ban/unban (banned users can't sign in).
- **Comments**: search/filter, hide/unhide, delete.

**Analytics**
- Every part read logs a `PartView` + `READ_START` event; blocked download/copy attempts log `DOWNLOAD_ATTEMPT` events (visible in the Overview cards and activity feed).

## Quick start (local)

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    edit DATABASE_URL to point at any Postgres (Neon or local)

# 3. Schema + demo data (2 series, 6 parts using the bundled sample PDFs,
#    demo users, comments, reactions, a week of traffic)
npm run db:setup

# 4. Run
npm run dev          # development
# or
npm run build && npm run start   # production
```

Demo accounts created by the seed:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@walammi.test` | `admin1234` |
| Reader | `mara@example.com` (and 3 more) | `reader1234` |

> The seeded parts point at `http://localhost:3000/samples/*.pdf`, so the dev server must be running when you seed. To re-seed against another origin, set `SAMPLE_PDF_BASE` first.

## Cloudflare R2 setup

### Mode 1 — public links (simplest)
1. In the R2 dashboard create a bucket and enable **Public access** (either the `https://pub-<id>.r2.dev` subdomain or a custom domain on a Cloudflare zone).
2. Upload your PDFs, e.g. `stories/my-series/part-1.pdf`.
3. In the admin dashboard: create a series → **Add a part from an R2 public link** → paste e.g. `https://pub-xxxx.r2.dev/stories/my-series/part-1.pdf`.
4. Readers get the PDF streamed through the server-side proxy at `/api/pdf/<partId>` — the browser only ever talks to your app, and the PDF is served inline with `no-store`.

### Mode 2 — private bucket (strongest no-download posture)
1. Create an R2 **API token** with `Object Read` permission for the bucket.
2. Fill in `.env`:
   ```
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=the_token_access_key
   R2_SECRET_ACCESS_KEY=the_token_secret
   R2_BUCKET=your-bucket-name
   ```
   You can also set `R2_PUBLIC_BASE=https://cdn.yourdomain.com` if you later want public cover images from the same bucket (optional, not used for PDFs).
3. When R2 keys are present, the app automatically:
   - stores the **object key** extracted from any public-style URL you paste (or you can paste a plain key path like `stories/my-series/part-1.pdf` — it is accepted as `stories/...` only when it doesn't parse as a URL, otherwise https is required),
   - fetches PDFs from `https://<account>.r2.cloudflarestorage.com/<bucket>/<key>` through the proxy,
   - never exposes the bucket URL to browsers.

## Neon setup

1. Create a project at [neon.tech](https://neon.tech) → copy the **pooled** connection string (the `-pooler` host).
2. Put it in `.env` / Vercel env vars as `DATABASE_URL` (keep `?sslmode=require`).
3. Run `npx prisma db push` once from your machine (or `npm run db:setup` to also seed).

Neon's autoscaling/pause works fine with Prisma; on serverless, connection pooling via the pooled endpoint is required.

## Deploy to Vercel

1. Push this folder to a Git repo.
2. In Vercel: **Add New → Project** → import the repo (framework auto-detects Next.js).
3. Set environment variables:
   - `DATABASE_URL` — Neon pooled connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://your-app.vercel.app` (or your custom domain)
   - `R2_*` — only if you want private-bucket mode
4. Deploy. First build runs `prisma generate` automatically (`postinstall`).
5. Run `npx prisma db push` against Neon once (locally with the prod `DATABASE_URL`, or via a CI step).
6. Create your admin: register through the UI, then in Neon's SQL editor run
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```
   (or seed locally with `prisma/seed.mjs` adjusted to your admin email — the seeded admin is `admin@walammi.test` / `admin1234`; **change this password before going live**).

## Project layout

```
prisma/schema.prisma     # data model (Series, Part, User, Comment, Reaction, PartView, AnalyticsEvent…)
prisma/seed.mjs          # demo data
public/vendor/           # self-hosted pdf.js + worker (no CDN dependency)
public/samples/          # 6 sample story PDFs used by the seed
src/app/                 # reader pages (home, browse, series, read, login, register, account)
src/app/admin/           # admin dashboard (overview, series, users, comments)
src/pages/api/           # REST endpoints: pdf proxy, auth, comments, reactions, analytics, admin/*
src/components/          # PdfReader, CommentSection, ReactionBar, admin components
src/lib/                 # prisma client, auth options, r2 helpers, utils
```

## Read-only enforcement details

- PDFs are streamed by `/api/pdf/[partId]` (auth required) and rendered to canvas by pdf.js — the file is never attached or linked.
- `Content-Disposition: inline`, `Cache-Control: no-store`.
- Copy, cut, right-click, drag, `Ctrl/Cmd+S/P/U/A/C` are intercepted with a visible "disabled" toast; each attempt is logged to analytics.
- `@media print` hides the reader and shows a notice instead.
- Per-page translucent watermark with the signed-in reader's name.
- In private-R2 mode the bucket URL is never exposed client-side.

No client-side measure is absolute (a determined user can screenshot); the watermark + auth + no-store posture is designed to make casual redistribution impractical. For DRM-grade protection you would need a dedicated service.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | serve the production build |
| `npm run db:push` | push schema to the database in `DATABASE_URL` |
| `npm run db:seed` | seed demo content |
| `npm run db:setup` | push + seed |
