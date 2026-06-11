# CLAUDE.md — Queue Management System

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Taruh di root repo. Konteks permanen untuk Claude (Code/Project).
> Dokumen detail (baca sebelum implementasi):
> - PRD (requirement & acceptance): `docs/01-PRD-queue-management.md`
> - TDD (data model, API, logika inti): `docs/02-TDD-queue-management.md`
> - System design (diagram & sequence): `docs/03-system-design-queue-management.md`
> - Mockup acuan UI: `reference-design/ref1.png`, `reference-design/ref2.png`

---

## Working Agreement — WAJIB

1. Di AWAL setiap sesi, baca `docs/PROGRESS.md` lebih dulu sebelum
   mengerjakan apa pun. File itu adalah sumber kebenaran: task terakhir,
   task berikutnya, keputusan teknis, dan blocker.
2. Setelah menyelesaikan SETIAP task atau sub-task bermakna, update
   `docs/PROGRESS.md`:
   - Tambah entri baru di "Task Log" (append-only, JANGAN hapus entri lama).
   - Perbarui blok "Current State" di paling atas.
3. Saat saya mengetik `/handoff`, tutup sesi dengan menulis ringkasan
   serah-terima untuk sesi Claude berikutnya.

## 0. Repository State & Tooling (CURRENT)

- **Status**: **7 modul §9 SELESAI** (MVP Phase 1 fitur lengkap) — **Auth**, **Outlet/Platform**, **User/Operator**, **Queue Booking**, **Queue Call & Skip**, **Monitor+TV** (WS realtime + app TV), **Notifications (Web Push)**. Ada: `backend/` (Bun+Hono), `apps/cms/` (admin+operator, :3000), `apps/customer/` (booking+PWA, :3002), `apps/tv/` (display, :3003), `docker-compose.yml` (Postgres :55432), `Caddyfile`, `README.md`. Migrasi: `001_init.sql`, `002_tickets_booking_day.sql`, `003_push_subscription_unique.sql`, `004_outlet_status_hours.sql`. **Revisi T-005**: outlet punya `code` pendek + `accepting` (toggle) + jam operasional (`outlet_hours`). Kandidat berikutnya (di luar §9): infra/deploy Lightsail, Auth Customer (Google OAuth, kini 501), polish. Catat progress di `docs/PROGRESS.MD` (lihat Working Agreement).
- **Call & Skip**: `POST /tickets/:id/{call,serve,complete,skip}` + `GET /outlets/:id/queue` + `GET /me/outlets` di `tickets/ticketops.*` (requireAuth, **admin & operator**; scoping di service: lintas-tenant→404, operator tak-assign→403). State machine PURE di `ticket.actions.ts` (skip guard `call_count≥3`); mutasi pakai optimistic guard + audit `ticket_events` + `broadcast`. Operator panel CMS: `/queue`, `/queue/[outletId]` (nav per-role).
- **Realtime (Monitor+TV)**: WS di `ws/handlers.ts` (Bun pub/sub), client kirim `{subscribe:"outlet:{id}"|"ticket:{id}"}` — **subscribe publik** (mutasi tetap auth). Event = sinyal "ada perubahan" → client `useRealtime` hook invalidate query + refetch (polling jadi fallback). `GET /outlets/:id/display` publik (data TV). App TV `apps/tv` (:3003). Tambah broadcast baru? cukup panggil `broadcast(topic,data)` dari service.
- **Booking publik**: `POST /outlets/:id/tickets` & `GET /tickets/:id` di `tickets/` TANPA auth — route admin di `outletRoutes` pakai middleware **per-route** (bukan `use("*")`) agar tak menelan route booking. Penomoran atomik: `pg_advisory_xact_lock` per-outlet + `UNIQUE(platform_id,booking_day,number)`; `booking_day` = WIB via `ticket.label.ts:wibDay`. Realtime: panggil `broadcast(topic,data)` dari `ws/broadcast.ts` (no-op sampai modul Monitor+TV mengaktifkan `/ws`).
- **Notifications (Web Push)**: domain `push/` (sender bungkus `web-push`, repo, service factory, handler, routes PUBLIK). Endpoint `POST /tickets/:id/push-subscribe` + `GET /push/vapid-public-key`. Trigger dari `ticketops.service.act` via **hook no-op** `push/push.notify.ts` (pola sama `ws/broadcast.ts`, di-wire di `index.ts`) → `onTicketCalled` ("ready"/CUS-6) & `onQueueAdvanced` (reminder "sisa 3"/CUS-5, dikirim saat posisi-di-depan ≤3, idempoten via `tickets.reminded_3` di-klaim ATOMIK). Push **fire-and-forget + try/catch** (gagal push tak menggagalkan aksi); endpoint gone (404/410) auto-dihapus. **VAPID OPSIONAL** di env (`VAPID_*`) → kosong = push auto-nonaktif. Customer PWA: `public/{sw.js,manifest.webmanifest,icons}` + `lib/push.ts` + tombol `PushButton` di `/t/[ticketId]`. **iOS**: push hanya jalan bila PWA di-install ke Home Screen; in-app WS banner tetap jalur utama.
- **Outlet status & jam (T-005)**: status buka/tutup **DIHITUNG** di `outlets/outlet.status.ts:computeOpen` (PURE) = `accepting AND dalam jam WIB hari ini` — TANPA cron. Tanpa baris `outlet_hours` utk hari itu = buka 24 jam; toggle `accepting` hanya bisa MENUTUP. Kode pendek di `outlet.code.ts` (alfabet tanpa O/0/I/1/L). Endpoint publik (lintas-client, asumsi satu bisnis): `GET /outlets/public`, `GET /outlets/:id/info`, `GET /outlets/code/:code`; admin: `PATCH /outlets/:id {accepting}` & `PUT /outlets/:id/hours`. Booking di-guard `OUTLET_CLOSED` (409) di `ticket.repo.book`. Service meng-enrich outlet dgn `code_display/open/open_reason/today_hours`.
- **Mulai modul baru**: tunjukkan data model + endpoint dulu (§2) sebelum menulis kode. Skema DB lengkap (§3 TDD) sudah ada di `backend/src/db/migrations/001_init.sql` — modul berikut umumnya tinggal nambah kode, bukan tabel.

**Struktur & layering**
- `backend/src/<domain>/` per domain (`auth/`, lalu `outlets/`, `users/`, dst.). Pola: `*.routes.ts → *.handler.ts → *.service.ts → *.repo.ts`. Service menerima repo via factory (`createXService(repo)`) agar bisa di-unit-test tanpa DB (lihat `auth/auth.service.test.ts`).
- Helper lintas modul di `backend/src/lib/`: `response.ts` (`AppError` + sentinel `Errors`, helper `ok/fail`, konvensi `{ data, error }`), `jwt.ts` (`signSession/verifySession`, claims `{ sub, client_id, role }`, HS256), `env.ts` (validasi env, gagal cepat).
- Error handling: lempar `AppError`/`Errors.*` di service/repo; `app.ts` `onError` menerjemahkan ke response sentinel. Jangan `c.json` error manual di handler.
- Scoping multi-tenant ditegakkan di **repo layer** (filter `client_id`/`operator_outlets`) — disiplin wajib.

**Perintah (sudah konkret)**
```bash
# Database (host port 55432 → container 5432; 5432/5433 dipakai Postgres lokal lain)
docker compose up -d postgres

# Backend  (cwd: backend/)
cp .env.example .env        # sekali; isi JWT_SECRET dll
bun install
bun run migrate             # jalankan migrasi SQL terurut (runner sendiri di db/migrate.ts)
bun run seed                # client + admin demo (admin@demo.test / admin12345)
bun run dev                 # API http://localhost:3001 (Bun.serve: HTTP + /ws stub)
bun test                    # unit test service layer

# CMS  (cwd: apps/cms/)
cp .env.example .env.local
bun install
bun run dev                 # http://localhost:3000  (build: bun run build)
```
- **Bun di-install di `~/.bun/bin`**; jika shell non-interaktif tak menemukannya: `export PATH="$HOME/.bun/bin:$PATH"`.
- Migrasi: tambah file `backend/src/db/migrations/00N_nama.sql` (urut leksikografis); runner mencatat di tabel `schema_migrations`, idempoten.

---

## 1. Project Overview (WHY)

- **Nama**: Queue Management System (antrian digital).
- **Masalah**: outlet mengelola antrian manual; customer menunggu tanpa kepastian posisi.
- **Tujuan**: antrian real-time — client kelola antrian per outlet, operator panggil/skip, customer ambil nomor + notifikasi tanpa menunggu di loket.
- **Dua aplikasi**: **CMS Web App** (client + operator) & **Customer Web App**.
- **Tahap**: greenfield, MVP Phase 1.

---

## 2. Working Protocol (BAGAIMANA kamu bersikap)

- **Sebelum menulis kode**: ringkas pemahaman, sebut asumsi, ajukan pertanyaan bila ambigu. Sebagian besar keputusan sudah final (§ bawah), beberapa masih `⚠️ ASUMSI` (PRD §9).
- **Per modul besar**: tunjukkan data model + endpoint dulu, tunggu konfirmasi sebelum implementasi.
- **Boleh tidak setuju**: tunjukkan risiko (konkurensi, scoping multi-tenant tanpa RLS, batasan iOS push) + alternatif.
- **Patuhi stack & konvensi** (§4–§5). Jangan tambah dependency tanpa alasan.
- **Kerjakan per modul**, jangan generate seluruh sistem sekaligus.

---

## 3. Reference Design (HOW)

Acuan dari 2 mockup app yang dilampirkan tim.
- **Visual**: clean, modern, **mobile-first**, kartu **rounded-2xl/3xl**, tombol **pill**, banyak whitespace, bayangan halus.
- **Warna**: primary **deep green** (`#1F6F50`), aksen **oranye/amber** untuk CTA, surface putih.
- **Komponen**: **shadcn/ui** + **TailwindCSS**.
- **Customer app**: layar fokus (ambil antrian → status), tombol besar, nomor antrian besar & jelas.
- **CMS**: dashboard responsif; panel operator simpel (list + tombol Panggil/Skip besar).
- **TV**: tipografi sangat besar, kontras tinggi; satu layar per outlet, nomor "sedang dipanggil" per platform.

---

## 4. Tech Stack & Spec (HOW) — FINAL

```
Frontend : Next.js (App Router) + TypeScript + TailwindCSS + shadcn/ui
           TanStack Query; Customer app = PWA (service worker untuk Web Push)
Backend  : Bun + Hono (REST + Auth JWT + WebSocket pub/sub + Web Push sender)
Database : PostgreSQL di AWS Lightsail
           Opsi A (MVP): Postgres dalam Docker di instance yang sama
           Opsi B (nanti): Lightsail Managed Database
Auth     : Dibangun sendiri.
           - CMS (client/operator): email+password, TANPA register. Hash via Bun.password, sesi JWT.
           - Customer: Google OAuth (opsional) + mode anonim (device token).
Realtime : Bun native WebSocket + pub/sub (topic outlet:{id} & ticket:{id}). BUKAN Supabase.
Push     : Web Push API + Service Worker + VAPID (TANPA third-party). Uji web-push di Bun.
Infra    : SEMUA di AWS Lightsail via Docker Compose (Caddy + Next.js + Bun + Postgres).
           Caddy untuk TLS otomatis. Backup: Lightsail snapshot + cron pg_dump.
           (Opsional: Next.js boleh ke Vercel free tier.)
```

**Konvensi**
- REST, response `{ data, error }`; error sentinel + wrapping.
- Folder backend per domain: `auth/`, `outlets/`, `platforms/`, `users/`, `tickets/`, `push/`, `ws/`.
- Layered: `handler → service → repo`.
- **Scoping multi-tenant DI APLIKASI** (tanpa RLS): semua query difilter `client_id` & `operator_outlets`. Wajib disiplin di repo layer.
- **Penomoran antrian & auto-assign platform HARUS atomic** (1 transaksi).
- Unit test wajib untuk service layer logika antrian.

---

## 5. Arsitektur (HOW)

```
Next.js (CMS/Customer/TV) ──REST/WS──► Caddy ──► Bun+Hono ──SQL──► PostgreSQL
                                                   │  └─WebSocket pub/sub─► clients
                                                   └─ Web Push (VAPID) ─► Customer
Customer ── Google OAuth ──► Bun (callback)
```
Detail diagram & sequence: `docs/03-system-design`.

---

## 6. Feature & Module Breakdown (WHAT)

### Module: Auth (CMS + Customer)
- CMS: `POST /auth/login` (email+pw → JWT). Tanpa register; akun dibuat di CMS.
- Customer: `GET /auth/google` + callback (opsional); anonim via device token.
- **Acceptance**: password ter-hash; JWT memuat role & client_id; tak ada endpoint register publik.

### Module: Outlet & Platform Management (CMS, role admin)
- **Tujuan**: client membuat outlet & platform.
- **Aturan**: **outlet wajib punya ≥1 platform**; tak bisa hapus platform terakhir.
- **Acceptance**: CRUD outlet & platform; platform punya `code` & `name`.
- **Entitas**: `clients, outlets, platforms`. **Endpoint**: `POST /outlets`, `POST /outlets/:id/platforms`, `DELETE /platforms/:id` (guard).

### Module: User & Operator Management (CMS, role admin)
- **Tujuan**: client membuat user (admin/operator) & assign operator ke outlet.
- **Acceptance**: operator hanya akses outlet yang di-assign (scoping aplikasi).
- **Entitas**: `users, operator_outlets`. **Endpoint**: `POST /users`.
- **Dependency**: Outlet, Auth.

### Module: Queue Engine — Booking & Auto-assign (Customer + inti)
- **Tujuan**: customer ambil antrian; sistem **auto-assign ke platform paling kosong**.
- **Aturan**: platform dipilih = WAITING paling sedikit (tie-break code ASC); nomor & assign dalam 1 transaksi.
- **Acceptance**: nomor unik per platform/hari; label `A-012`; aman dari race condition.
- **Entitas**: `tickets`. **Endpoint**: `POST /outlets/:id/tickets`, `GET /tickets/:id`.
- **Dependency**: Outlet, Platform.

### Module: Queue Engine — Call & Skip (CMS, role operator)
- **State machine**: `WAITING → CALLED → SERVING → COMPLETED`, jalur `→ SKIPPED`.
- **Aturan**: `call` menaikkan `call_count`; `skip` aktif saat `call_count ≥ 3`. Manual (tanpa timer).
- **Skip → ambil ulang**: customer SKIPPED tidak di-requeue; booking ulang → **nomor baru**.
- **Acceptance**: pemanggilan broadcast ke TV + customer; skip valid hanya bila `call_count ≥ 3`; aksi tercatat di `ticket_events`.
- **Endpoint**: `POST /tickets/:id/call|serve|complete|skip`.

### Module: Live Monitor + TV Display (CMS)
- **Tujuan**: monitor real-time; TV publik per outlet.
- **Acceptance**: update tanpa reload via WebSocket; halaman TV read-only.
- **Endpoint**: `GET /outlets/:id/queue`, `GET /outlets/:id/display`, `GET /ws`.

### Module: Notifications — Web Push (Customer)
- **Tujuan**: reminder "sisa 3" (CUS-5) & notifikasi "ready" (CUS-6).
- **Acceptance**: Web Push via SW + VAPID tanpa third-party; reminder idempoten (`reminded_3`); "ready" saat operator `call`.
- **Catatan**: iOS butuh PWA terinstall; in-app banner (WebSocket) jalur utama, push fallback.
- **Entitas**: `push_subscriptions`. **Endpoint**: `POST /tickets/:id/push-subscribe`.

---

## 7. Scope

- **In scope**: Auth, Outlet/Platform, User/Operator, Queue Engine (booking+auto-assign, call/skip), Monitor+TV, Web Push.
- **Out of scope**: estimasi waktu tunggu, auto-skip timer, analitik historis, pembayaran/POS, SMS/WA/email, app native.

---

## 8. Definition of Done

- Memenuhi acceptance criteria modul.
- Penomoran + auto-assign aman dari race condition (ada test).
- Scoping multi-tenant ditegakkan & teruji (operator tak bisa lintas-outlet).
- Realtime jalan di CMS, TV, customer (Bun WebSocket).
- Web push jalan di Android/desktop; perilaku iOS terdokumentasi.
- Lint & test CI hijau; README cara menjalankan tiap app + `docker compose`.

---

## 9. Keputusan Final & Urutan Kerja

**Final (sudah diputuskan):**
- Auto-assign platform paling kosong; outlet wajib ≥1 platform.
- CMS login email+password tanpa register; role admin (kelola semua) vs operator (hanya antrian).
- Skip → ambil ulang dapat nomor baru; booking boleh dari mana saja.
- Semua infra di AWS Lightsail (tanpa Supabase); Auth & Realtime dibangun sendiri.

**Urutan implementasi**: Auth → Outlet & Platform → User/Operator → Queue Engine (booking+auto-assign, lalu call/skip) → Monitor+TV → Notifications.

**Masih konfirmasi (PRD §9)**: reset harian & format nomor, satu TV per outlet, target skala, dukungan iOS push.
