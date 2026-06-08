# Progress Report

## Current State
- Last updated : 2026-06-08
- Branch aktif : feat/user-operator (perubahan Queue belum di-commit; rencana commit ke feat/queue-booking)
- Sudah jadi   : Auth CMS, Outlet & Platform, User & Operator, Queue Booking & Auto-assign, Customer app (booking+status), DB schema
- Sedang jalan : — (4 dari 7 modul §9 selesai)
- Task BERIKUT : T-002 — Queue Engine: Call & Skip (state machine WAITING→CALLED→SERVING→COMPLETED / SKIPPED)
- Keputusan tertunda (perlu kamu putuskan):
    1. Strategi merge: semua kerja masih di feature branch terpisah, main masih kosong.
       Mau merge dulu ke main atau lanjut per-branch?
    2. Realtime: broadcast() sudah dipanggil saat booking tapi /ws masih stub
       (belum ada subscriber). Aktifkan WS penuh di modul Monitor+TV.

## Baseline — kondisi awal saat tracking dimulai (2026-06-08)
<!-- ditulis sekali, tidak diubah lagi -->

Arsitektur : Bun API (app.ts) + PostgreSQL (001_init.sql, 9 tabel) + apps/cms (Next.js).
Endpoint aktif : /auth /outlets /platforms /users /health.
Test : 3 file service, 15 pass (auth, outlet, user).
Riwayat git : scaffold+Auth → Outlet/Platform → User/Operator (4 commit).

Status modul (per §9 PRD):
- ✅ Auth CMS (login JWT)            — backend + UI + test
- ✅ Outlet & Platform management     — full CRUD + guard ≥1 platform & last-platform
- ✅ User & Operator management       — full CRUD + guard LAST_ADMIN
- ✅ DB schema                        — 9 tabel + index (mendahului kode, by design)
- 🚧 Realtime WebSocket pub/sub       — /ws ter-wire tapi handler masih stub (TODO)
- 🚧 Auth Customer (OAuth + anonim)   — /auth/google* return 501; device-token belum ada
- 🚧 Infra lokal                      — postgres jalan; Caddy + container app masih template
- ⬜ Queue Engine — Booking & Auto-assign
- ⬜ Queue Engine — Call & Skip
- ⬜ Monitor + TV display
- ⬜ Notifications — Web Push
- ⬜ Customer Web App (PWA) & TV app

Folder placeholder (.gitkeep, belum diisi): platforms/  tickets/  push/  ws/

## Task Log
<!-- append-only, entri terbaru di ATAS -->

### [2026-06-08] T-001 — Queue Engine: Booking & Auto-assign (Backend + Customer app)
- Tujuan     : customer ambil antrian → auto-assign platform paling kosong + nomor unik/hari, atomic & anti race-condition
- Dikerjakan : migrasi 002 (tickets.booking_day + UNIQUE(platform_id,booking_day,number));
               domain backend/src/tickets/ (label util, repo TX advisory-lock, service, handler, routes publik);
               ws/broadcast.ts + wiring di index.ts; mount publik di app.ts (POST /outlets/:id/tickets, GET /tickets/:id);
               refactor outlet.routes.ts → middleware admin PER-ROUTE (agar tak menelan route booking publik);
               scaffold apps/customer (Next.js, port 3002): home, /o/[outletId] (ambil nomor), /t/[ticketId] (status+ahead, poll 5s)
- File berubah : backend/src/db/migrations/002_*.sql, backend/src/tickets/* (6 file), backend/src/ws/broadcast.ts,
               backend/src/index.ts, backend/src/app.ts, backend/src/outlets/outlet.routes.ts, apps/customer/* (baru)
- Keputusan  : reset penomoran HARIAN zona WIB (Asia/Jakarta); identitas customer = device_token anonim;
               anti-race = advisory_xact_lock per-outlet + UNIQUE index (defense-in-depth);
               booking_day kolom biasa (bukan generated — AT TIME ZONE tidak immutable)
- Verifikasi : bun test 22 pass; tsc bersih; booking sekuensial A-001/B-001/C-001/A-002…;
               CONCURRENCY 50 serempak → 50 label unik, 0 nomor dobel, sebaran 17/17/16; ahead count tepat;
               outlet/tiket tak ada → 404; customer build bersih + pages 200; booking e2e via app jalan. DB dibersihkan ke baseline.
- Status     : ✅ done (belum di-commit)
- Next        : T-002 — Queue Engine: Call & Skip

### [2026-06-08] T-000 — Baseline established
- Tujuan     : mulai pencatatan progress di project yang sudah ~setengah jalan
- Dikerjakan : audit codebase + git log; petakan 3 modul selesai, 3 stub/sebagian,
               5 belum mulai
- Keputusan  : log append-only mulai dari titik ini; riwayat lama TIDAK direkonstruksi
- Status     : ✅ done
- Next        : T-001 — Queue Engine: Booking & Auto-assign

<!-- TEMPLATE entri baru:
### [YYYY-MM-DD] T-00X — <judul>
- Tujuan     :
- Dikerjakan :
- File berubah :
- Keputusan  : <+ alasan>
- Status     : ✅ done / 🚧 in progress / ⬜ belum
- Next        :
-->