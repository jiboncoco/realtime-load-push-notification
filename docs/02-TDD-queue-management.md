# TDD — Queue Management System

> Technical Design Document · MVP Phase 1 · **Stack: Next.js + Bun + PostgreSQL (AWS Lightsail)**
> Auth & Realtime dibangun sendiri di backend (tanpa Supabase).

---

## 1. Keputusan Stack & Rasional

### 1.1 Backend — Bun ✅
**Verdict: layak.** Bun cepat dan punya fitur yang langsung berguna di sini:
- **Framework**: **Hono** (ringan, matang, jalan mulus di Bun).
- **Password hashing native**: `Bun.password.hash/verify` (argon2/bcrypt) — tak perlu lib tambahan.
- **WebSocket native + pub/sub**: `Bun.serve({ websocket })` dengan `ws.subscribe(topic)` & `server.publish(topic, data)` — fondasi realtime kita (§6).
- **Catatan**: uji lib `web-push` di Bun lebih dulu (fallback VAPID manual bila ada isu crypto).

### 1.2 Database — PostgreSQL di AWS Lightsail
**Konsekuensi keluar dari Supabase**: kita kehilangan Auth & Realtime bawaan → keduanya dibangun sendiri (lihat §6 & §8). Sebagai gantinya: tanpa vendor, semua di Lightsail, kontrol penuh.

**Dua opsi hosting Postgres (pilih sesuai prioritas):**

| Opsi | Cara | Biaya | Trade-off |
|------|------|-------|-----------|
| **A. Self-host (rekomendasi MVP)** | Postgres dalam **Docker** di instance Lightsail yang sama dengan API | Termurah (ikut harga 1 instance) | Anda urus backup sendiri → aktifkan **Lightsail snapshot** + cron `pg_dump`. |
| **B. Lightsail Managed Database** | Lightsail Database (Postgres) terpisah | ~$15/bln (micro) | Backup & failover dikelola AWS; ops lebih ringan. |

**Rekomendasi**: mulai **Opsi A** (Docker Compose: Bun + Postgres + Caddy dalam 1 instance) untuk hemat; siapkan migrasi ke **Opsi B** saat butuh keandalan lebih. Driver: `postgres` (postgres.js) atau `pg`; query type-safe via `kysely`/`sqlc`-style; migrasi via `node-pg-migrate`/`dbmate`.

### 1.3 Realtime — Bun Native WebSocket (pub/sub)
Tanpa Supabase Realtime, backend Bun menyiarkan event sendiri:
- **Topic `outlet:{id}`** → CMS monitor + TV.
- **Topic `ticket:{id}`** → customer (status & posisi).
- Auth saat koneksi WS (validasi JWT/token di handler `open`).
- Saat API mengubah `tickets`, ia memanggil `server.publish(topic, payload)`.

### 1.4 Auth — Dibangun di Backend
- **CMS (client & operator)**: email+password, **tanpa registrasi publik**. Hash `Bun.password`, sesi via **JWT** (middleware `hono/jwt`). Akun client awal di-seed; client membuat user/operator dari CMS.
- **Customer**: **Google OAuth** (authorization-code flow langsung ke Google, mis. via `@hono/oauth-providers` atau `arctic`) — opsional. Mode anonim memakai **device token** (disimpan di localStorage, dikirim saat ambil antrian).

### 1.5 Docker & Deployment — Semua di Lightsail
**Docker Compose** dalam 1 instance Lightsail:
```
caddy (HTTPS otomatis) ─► next.js (CMS) ┐
                          next.js (cust) ├─► bun-api ─► postgres
                                         ┘
```
- **Caddy** sebagai reverse proxy + TLS gratis.
- **Frontend Next.js** bisa ikut di instance ini (Docker) — sesuai keinginan "semua Lightsail".
  *(Opsional hemat: offload frontend ke Vercel free tier bila ingin mengurangi beban instance — tetap kompatibel.)*
- **Backup**: Lightsail automatic snapshots + cron `pg_dump` ke storage.

**Estimasi biaya MVP**: 1 instance Lightsail (2–4GB, ~$12–24/bln) + snapshot kecil ≈ **$12–28/bln**, semuanya di Lightsail.

---

## 2. Arsitektur Tingkat Tinggi

```
┌────────────┐   REST    ┌────────────────────────┐
│ Next.js    │ ────────► │  Bun + Hono            │
│ CMS /      │ ◄──────── │  API + Auth(JWT)       │ ──SQL──► PostgreSQL
│ Customer / │  WebSocket│  + WebSocket pub/sub    │          (Lightsail)
│ TV         │ ◄════════►│  + Web Push (VAPID)     │
└─────┬──────┘           └───────────┬────────────┘
      │  Web Push (background)        │ Google OAuth (customer)
      └◄─────────────────────────────┘
```

---

## 3. Data Model

```sql
clients        (id, name, created_at)

users          (id, client_id, email UNIQUE, password_hash,
                role text,            -- 'admin' | 'operator'
                name, is_active, created_at)

outlets        (id, client_id, name, address, created_at,
                code text UNIQUE,      -- kode pendek 6-kar ramah-baca, mis. 'K7Q9PT' (T-005)
                accepting bool default true)  -- toggle buka/tutup manual (T-005)

outlet_hours   (outlet_id, weekday smallint,  -- 0=Min..6=Sab (EXTRACT(DOW)); PK(outlet_id,weekday)
                is_closed bool default false, -- hari libur rutin
                open_time time null, close_time time null)  -- jam operasional per hari (T-005)

platforms      (id, outlet_id, code, name, created_at)   -- 'A','B','C'; outlet wajib >=1
operator_outlets (user_id, outlet_id)                     -- scoping operator

customers      (id, google_sub UNIQUE null, email null, name null, created_at) -- hanya jika login Google

tickets        (id, outlet_id, platform_id,
                number int,            -- urut per platform per hari
                label text,            -- 'A-012'
                status text,           -- WAITING|CALLED|SERVING|COMPLETED|SKIPPED
                call_count int default 0,
                customer_id uuid null, -- null jika anonim
                device_token text null,
                reminded_3 bool default false, -- idempotensi reminder
                created_at, called_at, completed_at)

ticket_events  (id, ticket_id, type, actor_user_id, created_at)  -- audit call/skip/...

push_subscriptions (id, ticket_id, endpoint, p256dh, auth, created_at)
```

**Index**: `tickets(outlet_id, platform_id, status, number)`.

---

## 4. Logika Inti

### 4.1 Auto-assign Platform + Penomoran (CUS-1) — *atomic*
Saat customer ambil antrian (hanya pilih outlet), dalam **satu transaksi**:
1. Pilih **platform paling kosong** di outlet: platform dengan jumlah ticket `WAITING` paling sedikit; tie-break `code ASC`.
2. Generate `number` = `MAX(number)+1` untuk (platform, tanggal hari ini) dengan `FOR UPDATE`/sequence.
3. Insert ticket `WAITING`, susun `label` = `{code}-{number3digit}`.
4. Publish ke `outlet:{id}` (CMS/TV) & beri customer channel `ticket:{id}`.

> Transaksi mencegah dua customer mendapat nomor sama atau salah pilih platform saat bersamaan.

### 4.2 Call & Skip (CMS-4)
- **Panggil**: `status=CALLED`, `call_count++`, `called_at=now`; publish `outlet:{id}` (TV) & `ticket:{id}`; trigger push "ready".
- **Panggil ulang**: `call_count++` (2, 3).
- **Skip** (guard `call_count ≥ 3`): `status=SKIPPED`; lanjut ticket berikutnya.
- **Layani/Selesai**: `SERVING` → `COMPLETED`.
- Customer `SKIPPED` cukup booking ulang → ticket & nomor baru (§4.1).

### 4.3 Sisa antrian di depan (CUS-4)
`COUNT(*) FROM tickets WHERE platform_id=? AND status='WAITING' AND number < my_number`.

### 4.4 Status buka/tutup outlet (CMS-9 / CUS-0) — *dihitung, tanpa cron*
Status efektif **dihitung saat dibaca/booking** (`outlets/outlet.status.ts:computeOpen`, PURE) — TIDAK ada job pembalik kolom:
```
open = accepting AND (
  tidak ada outlet_hours hari ini  → buka 24 jam (NO_SCHEDULE)
  | is_closed hari ini             → tutup (DAY_CLOSED)
  | jam WIB sekarang ∈ [open_time, close_time) → buka, selain itu BEFORE_OPEN/AFTER_CLOSE )
```
- Hari & jam dihitung zona **WIB** (`wibNowParts`), konsisten dengan `booking_day`.
- Toggle `accepting` hanya bisa **menutup** (buka tetap digate jam). Overnight (tutup<buka) tidak didukung.
- **Guard booking**: di transaksi `ticket.repo.book`, bila `!computeOpen(...).open` → tolak `OUTLET_CLOSED` (409).
- Service meng-*enrich* outlet dengan `code_display` (mis. `K7Q-9PT`), `open`, `open_reason`, `today_hours`.

---

## 5. Desain API (Bun + Hono)

```
# Auth
POST   /auth/login                 email+password → JWT (admin/operator)
GET    /auth/google                mulai OAuth Google (customer)
GET    /auth/google/callback       callback OAuth

# Client/Admin (role: admin)
POST   /outlets                    buat outlet (+ minimal 1 platform); kode auto-generate
PATCH  /outlets/:id                ubah name/address/accepting (toggle buka-tutup)   (T-005)
PUT    /outlets/:id/hours          ganti jadwal jam operasional (replace-all 0..7 hari) (T-005)
POST   /outlets/:id/platforms      tambah platform
DELETE /platforms/:id              tolak bila platform terakhir di outlet
POST   /users                      buat user/operator (+ assign outlet)

# Operator (role: operator, scoped outlet)
POST   /tickets/:id/call|serve|complete|skip   (skip guard: call_count>=3)
GET    /outlets/:id/queue          snapshot (fallback non-realtime)

# Customer (public / optional auth)
GET    /outlets/public             daftar outlet + status buka/tutup (single-tenant)   (T-005)
GET    /outlets/:id/info           info 1 outlet + status                              (T-005)
GET    /outlets/code/:code         cari outlet via kode (input dinormalisasi)          (T-005)
POST   /outlets/:id/tickets        ambil antrian (auto-assign platform) → {label, id}; tolak OUTLET_CLOSED bila tutup
GET    /tickets/:id                status + sisa di depan
POST   /tickets/:id/push-subscribe simpan subscription
GET    /push/vapid-public-key      VAPID public key (push aktif/tidak)

# TV (public)
GET    /outlets/:id/display        data layar TV

# WebSocket
GET    /ws                         upgrade; client subscribe topic outlet:{id} / ticket:{id}
```

---

## 6. Realtime (Bun WebSocket)

- Koneksi `/ws`, autentikasi pada `open` (JWT untuk CMS/operator; token ticket untuk customer).
- Client kirim `{subscribe: "outlet:123"}` atau `{subscribe: "ticket:abc"}` → server `ws.subscribe(topic)`.
- Mutasi data → `server.publish("outlet:123", {...})`.
- Fallback: bila WS putus, polling `GET /outlets/:id/queue`.

---

## 7. Web Push Tanpa Third-Party (CUS-5/6)

Web Push API + Service Worker + **VAPID** (tanpa Firebase/OneSignal).

**Alur:** SW (`sw.js`) tangani event `push`; minta izin `Notification.requestPermission()`; `pushManager.subscribe({userVisibleOnly:true, applicationServerKey: VAPID_PUBLIC})`; kirim subscription ke `POST /tickets/:id/push-subscribe`; backend kirim push ber-VAPID (`web-push`, uji di Bun).

**Trigger:**
- **Sisa 3 (CUS-5)**: tiap antrian platform berkurang (call/skip), hitung posisi; jika `posisi ≤ 3` & `reminded_3=false` → push, set `reminded_3=true` (idempoten). *(≤ 3, bukan tepat 3, agar aman bila antrian melompat — revisi T-004; klaim atomik via `UPDATE ... RETURNING`)*.
- **Ready (CUS-6)**: saat `call` → push "Giliran Anda → Platform X".

**Caveat iOS**: Web Push hanya jalan bila web app **di-install sebagai PWA** (iOS 16.4+). Gunakan **in-app banner via WebSocket** sebagai jalur utama saat tab terbuka; push sebagai fallback background.

---

## 8. Auth & Roles (detail)

- JWT berisi `{ sub, client_id, role }`. Middleware Hono verifikasi + cek role.
- **Scoping multi-tenant ditegakkan di aplikasi** (tak ada RLS Supabase): setiap query operator difilter `client_id` & `operator_outlets`. **Wajib disiplin** di repo layer.
- Operator: hanya endpoint queue pada outlet assigned. Admin: manajemen penuh dalam client-nya.
- Customer anonim: identitas = `device_token`; bila login Google → `customer_id`.

---

## 9. Keamanan

- Hash password `Bun.password`; jangan simpan plaintext.
- Validasi kepemilikan outlet di setiap mutasi (cegah akses lintas-tenant).
- Rate-limit endpoint ambil antrian (cegah spam).
- `skip` hanya bila `call_count >= 3`.
- Simpan VAPID private key & JWT secret sebagai env, jangan di repo.

---

## 10. Deployment & Biaya (Semua Lightsail)

| Komponen | Cara | Biaya |
|----------|------|-------|
| Next.js (CMS/Customer/TV) | Docker @ Lightsail (opsional Vercel free) | ikut instance |
| Bun API + WebSocket + Push | Docker @ Lightsail | ikut instance |
| PostgreSQL | Docker @ Lightsail (Opsi A) atau Lightsail Managed DB (Opsi B) | A: ikut instance · B: ~$15/bln |
| Reverse proxy + TLS | Caddy (Docker) | gratis |
| Backup | Lightsail snapshot + cron pg_dump | kecil |
| **Total MVP** | | **~$12–28/bln** |

CI: build image → deploy ke Lightsail (mis. `docker compose pull && up -d`).
