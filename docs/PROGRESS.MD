# Progress Report

## Current State
- Last updated : 2026-06-10
- Branch aktif : main (T-004 ter-commit 06ab86c; T-005 Outlet Status & Jam Operasional SELESAI, BELUM di-commit)
- Sudah jadi   : Auth, Outlet & Platform (+status/jam), User & Operator, Queue Booking (+guard buka/tutup), Queue Call & Skip, Monitor+TV (WS realtime + TV app), Notifications (Web Push), Customer app/PWA (+daftar outlet), DB schema
- Sedang jalan : — (7 modul §9 + revisi T-005 selesai)
- Task BERIKUT : — kandidat: infra/deploy Lightsail (push butuh HTTPS), Auth Customer (Google OAuth, masih 501), polish/test e2e.
- Keputusan tertunda (perlu kamu putuskan):
    1. WS auth: subscribe topic display tetap PUBLIK (data TV memang publik). Bila butuh
       privasi lebih, perketat ke JWT-per-koneksi nanti.
    2. Push iOS: hanya jalan bila PWA di-install ke Home Screen (sudah didokumentasikan di UI
       PushButton + caveat). In-app banner via WS tetap jalur utama, push = fallback.
    3. VAPID keypair dev sudah di-generate & ada di backend/.env (gitignored). PRODUKSI: generate
       keypair baru, jangan pakai yang dev.

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

### [2026-06-10] T-005 — Outlet Status & Jam Operasional (revisi dari user)
- Tujuan     : (1) kode pendek outlet di CMS untuk diberitahu ke customer; (2) customer lihat daftar outlet
               yang BUKA & bisa ambil antrian; (3) CMS toggle buka/tutup + jam operasional → di luar jam auto-tutup
- Keputusan user : single-tenant (daftar publik tampilkan semua outlet); kode pendek 6-kar alfanumerik (alfabet
               tanpa O/0/I/1/L), tampil "K7Q-9PT"; jam operasional PER HARI (Min–Sab, bisa libur); toggle manual
               HANYA bisa menutup (buka = dalam-jam DAN accepting). Status DIHITUNG (computeOpen), TANPA cron.
- Dikerjakan : migrasi 004 (outlets.code UNIQUE + accepting + tabel outlet_hours; backfill kode plpgsql);
               outlet.code.ts (generate/normalize/format), outlet.status.ts (computeOpen PURE + wibNowParts) + test 8;
               outlet.repo/service: code+accepting+hours, enrich withStatus (code_display/open/open_reason/today_hours),
               method publik listPublic/getPublicInfo/findByCode; endpoint publik GET /outlets/public, /outlets/code/:code,
               /outlets/:id/info; admin PATCH +accepting & PUT /outlets/:id/hours; guard booking OUTLET_CLOSED (409) di
               ticket.repo.book (cek accepting + jam WIB hari ini); broadcast outlet:{id} saat toggle/ubah jam;
               CMS: badge buka/tutup + kode di list, StatusCard (kode + toggle terima antrian) + HoursCard (editor 7 hari) di detail;
               Customer: home = daftar outlet (buka klik / tutup disabled + jam) + fallback input kode, /o/[id] tampil nama+status+guard
- File berubah : backend/src/db/migrations/004_*.sql, outlets/{outlet.code.ts,outlet.status.ts(+test),outlet.repo.ts,
               outlet.service.ts(+test),outlet.handler.ts,outlet.routes.ts}, tickets/ticket.repo.ts;
               apps/cms/{lib/api.ts,lib/outlets.ts,lib/outletStatus.ts,app/outlets/page.tsx,app/outlets/[id]/page.tsx};
               apps/customer/{lib/outlets.ts,app/page.tsx,app/o/[outletId]/page.tsx}
- Verifikasi : tsc bersih (backend+cms+customer); bun test 50 pass (7 file, +outlet.status 8);
               e2e: public list (code_display+open), code lookup ternormalisasi (jgf-5gv→JGF5GV), booking buka=201;
               accepting=false → booking 409 OUTLET_CLOSED & info MANUAL_CLOSED; PUT hours semua-libur → DAY_CLOSED,
               buka-24jam → 201, validasi buka>=tutup → 400; semua halaman render 200. DB: 2 outlet ter-backfill kode.
- Status     : ✅ done (BELUM di-commit)
- Catatan    : scope di luar PRD asli (jam operasional) — penambahan resmi. Hari libur insidental/tanggal merah
               belum ada (pakai toggle manual). Overnight (tutup<buka) tak didukung (MVP).
- Next        : commit T-005; lalu infra/deploy atau OAuth customer.

### [2026-06-10] T-004 — Notifications (Web Push: VAPID + Service Worker + PWA)
- Tujuan     : reminder "sisa 3" (CUS-5) & notifikasi "ready" (CUS-6) via Web Push tanpa third-party; PWA customer
- Dikerjakan : backend domain push/ (sender bungkus web-push, repo, service factory, notify hook no-op ala broadcast.ts,
               handler, routes PUBLIK); endpoint POST /tickets/:id/push-subscribe + GET /push/vapid-public-key;
               trigger di ticketops.service.act → onTicketCalled (action call) + onQueueAdvanced (keluar dari WAITING);
               migrasi 003 UNIQUE(ticket_id,endpoint) utk upsert idempoten; reminder "sisa 3" idempoten via reminded_3
               di-klaim ATOMIK (UPDATE..RETURNING, anti balapan); cleanup endpoint gone (404/410);
               customer PWA: manifest.webmanifest + icons (generator PNG) + sw.js (push/notificationclick) +
               lib/push.ts (register SW + PushManager.subscribe) + PushButton di /t/[ticketId]; meta iOS di layout
- File berubah : backend/src/push/* (6 file + test), backend/src/lib/env.ts, backend/src/app.ts, backend/src/index.ts,
               backend/src/tickets/ticketops.service.ts, backend/src/db/migrations/003_*.sql, backend/.env(.example);
               apps/customer/{public/{sw.js,manifest.webmanifest,icons/*},lib/push.ts,app/t/[ticketId]/{page.tsx,PushButton.tsx},
               app/layout.tsx,.env.example,.env.local}, package.json (web-push)
- Keputusan  : lib web-push (jalan di Bun, terverifikasi); VAPID OPSIONAL di env → push auto-nonaktif bila kosong
               (booking/call tetap jalan); reminder dikirim saat posisi-di-depan ≤ 3 (aman bila antrian melompat);
               push = fire-and-forget + try/catch (gagal push tak pernah menggagalkan aksi operator);
               notify pakai hook no-op ala broadcast.ts agar unit test ticketops tetap bebas DB/push
- Verifikasi : tsc bersih; bun test 42 pass (6 file, +push.service.test); customer build sukses;
               e2e: vapid-key enabled; subscribe 404 (tiket ngawur)/400 (body buruk)/201 (happy); re-subscribe = upsert (1 row);
               call → notifyReady terkirim (fake endpoint gagal anggun, aksi tetap 200);
               claimRemindThree REAL DB: 7 waiting → A-003..A-006 (ahead 0-3) reminded, A-007 (ahead4) tidak; advance lagi → A-007 flip, sisanya idempoten (tak dobel). DB dibersihkan ke baseline (0/0/0)
- Status     : ✅ done (siap commit)
- Next        : — semua modul §9 selesai. Kandidat: infra/deploy, Auth Customer (OAuth), polish.

### [2026-06-10] T-003 — Monitor + TV display (WebSocket realtime penuh + app TV)
- Tujuan     : aktifkan /ws pub/sub (yang tadinya stub), layar TV publik per outlet, ganti polling jadi realtime
- Dikerjakan : backend ws/handlers.ts (subscribe/unsubscribe topic outlet:/ticket:, validasi format) + wire ke Bun.serve (index.ts);
               GET /outlets/:id/display (publik) = "sedang dipanggil" per platform + waiting (display.service.ts);
               app baru apps/tv (:3003) layar besar/kontras tinggi, subscribe outlet:{id};
               hook useRealtime (cms/customer/tv): WS event → invalidate query, auto-reconnect, polling jadi fallback;
               CMS panel & Customer status pindah ke WS (interval fallback 12s/15s); customer subscribe outlet:{outlet_id} agar "sisa di depan" ikut update
- File berubah : backend/src/ws/handlers.ts, backend/src/index.ts, backend/src/tickets/display.service.ts,
               ticket.handler.ts, ticket.routes.ts; apps/tv/* (baru); apps/{cms,customer}/lib/useRealtime.ts;
               apps/cms/app/queue/[outletId]/page.tsx, apps/customer/app/t/[ticketId]/page.tsx
- Keputusan  : subscribe topic display PUBLIK (TV terpasang di tempat umum; ticket id = UUID); mutasi tetap butuh auth;
               event WS = sinyal "ada perubahan" → client refetch snapshot (bukan rekonstruksi state dari delta) → sederhana & konsisten
- Verifikasi : backend tsc bersih, bun test 35 pass; ws client: booking→event outlet, call→event outlet+ticket;
               display reflect CALLED; tv/cms/customer build sukses; semua app serve 200; TV page 200 utk outlet nyata. DB bersih.
- Status     : ✅ done (belum di-commit)
- Next        : T-004 — Notifications (Web Push)

### [2026-06-08] T-002 — Queue Engine: Call & Skip (Backend + panel operator CMS)
- Tujuan     : operator/admin jalankan state machine antrian (call/serve/complete/skip) + lihat antrian aktif
- Dikerjakan : ticket.actions.ts (nextState PURE); ticketops.{repo,service,handler,routes,test}.ts;
               endpoint POST /tickets/:id/{call,serve,complete,skip}, GET /outlets/:id/queue, GET /me/outlets (terproteksi);
               applyAction TX + optimistic guard (status+call_count) + audit ticket_events + broadcast outlet:/ticket:;
               CMS: nav per-role (operator hanya 'Antrian'), /queue (pilih outlet), /queue/[outletId] panel kolom-per-platform
               dengan tombol Panggil/Panggil ulang/Layani/Selesai/Skip (skip disabled <3x), polling 3s
- File berubah : backend/src/tickets/ticket.actions.ts, ticketops.* (5 file), backend/src/app.ts;
               apps/cms/lib/queue.ts, components/RequireAuth.tsx, app/dashboard/page.tsx, app/queue/* (2 file)
- Keputusan  : otorisasi operator(assigned)+admin(client penuh), scoping di service (lintas-tenant→404, operator tak assign→403);
               skip guard call_count≥3; transisi tak valid→409; requireAuth PER-ROUTE (router di-mount "/" agar tak menelan booking publik)
- Verifikasi : bun test 35 pass; tsc bersih; lifecycle call→serve→complete OK; skip<3→SKIP_NOT_ALLOWED, skip@3→SKIPPED;
               complete ulang→INVALID_TRANSITION; op-off→403, no-token→401; queue snapshot akurat; /me/outlets per-role benar;
               ticket_events tercatat (call:4/serve:1/complete:1/skip:1); booking publik tetap 201; CMS build + pages 200. DB bersih.
- Status     : ✅ done (belum di-commit)
- Next        : T-003 — Monitor + TV display (WebSocket realtime penuh)

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