# PRD — Queue Management System (Antrian)

> Product Requirements Document · MVP Phase 1
> Stack final: **Next.js + Bun + PostgreSQL (AWS Lightsail)**. Auth & Realtime dibangun sendiri (tanpa Supabase).

---

## 1. Ringkasan

| | |
|---|---|
| **Nama** | Queue Management System (placeholder: *Antrico*) |
| **Masalah** | Outlet mengelola antrian manual; customer menunggu tanpa kepastian posisi; tak ada visibilitas real-time. |
| **Tujuan** | Antrian digital real-time: client kelola antrian per outlet, operator memanggil/skip antrian, customer ambil nomor & dapat notifikasi tanpa menunggu di loket. |
| **Tipe sistem** | 2 web app: **CMS (client/operator)** + **Customer web app** |
| **Tahap** | Greenfield, MVP. |

### Definisi Istilah
- **Client** — pemilik bisnis (tenant). Login via CMS (email+password).
- **Outlet** — cabang/lokasi milik client. **Wajib memiliki minimal 1 platform.**
- **Platform** — jalur/loket antrian di outlet (A, B, C). Customer **tidak memilih** platform — sistem **auto-assign**.
- **Operator** — staf yang memanggil/skip antrian. Di-assign per outlet. Hanya memantau & mengelola antrian.
- **Ticket / Antrian** — nomor antrian milik 1 customer pada 1 platform.

---

## 2. Personas & Hak Akses (DECIDED)

| Peran | Hak akses |
|-------|-----------|
| **Client (admin)** | Buat/kelola user & operator; buat/kelola outlet & platform; monitor antrian semua outlet. |
| **Operator** | Hanya **memantau & mengelola antrian** (call/serve/complete/skip) pada outlet yang di-assign. Tidak bisa buat outlet/operator. |
| **Customer** | Ambil antrian via web/QR, pantau posisi, terima notifikasi. **Tidak wajib login**; tersedia login Google. |

> **Tidak ada registrasi publik.** Akun client & operator dibuat di dalam CMS. Akun client awal di-*seed* oleh super-admin/skrip.

---

## 3. Lingkup Sistem

```
Client Admin ─┐
              ├─►  CMS Web App  ──► Bun API ──► PostgreSQL (Lightsail)
Operator    ─┘                        ▲
                                      │ WebSocket (Bun pub/sub)
Customer    ────►  Customer Web App ──┘
TV Display  ────►  CMS (mode TV, read-only)
```

---

## 4. Functional Requirements — CMS Web App

| ID | Fitur | User Story | Acceptance Criteria |
|----|-------|------------|---------------------|
| CMS-1 | Manajemen Outlet & Platform | Sebagai client, saya menambah outlet & platform per outlet | CRUD outlet & platform; **outlet wajib punya ≥1 platform** (tak bisa hapus platform terakhir). |
| CMS-2 | Live Queue Monitor | Sebagai client, saya melihat antrian real-time per outlet | Dashboard menampilkan jumlah & isi antrian per platform; update otomatis (WebSocket). |
| CMS-3 | Manajemen User/Operator | Sebagai client, saya membuat user & operator | Client buat akun (role admin/operator) tanpa registrasi publik; operator di-assign ke ≥1 outlet. |
| CMS-4 | Call & Skip Antrian | Sebagai operator, saya memanggil antrian berurutan & skip jika 3x tidak hadir | Lihat §6. Tombol Panggil/Panggil ulang/Layani/Selesai/Skip. Skip aktif saat `call_count = 3`. |
| CMS-5 | Realtime Refresh | CMS auto-update saat ada antrian baru | Antrian baru muncul di list operator & monitor tanpa reload (WebSocket). |
| CMS-6 | Operator per Outlet | Operator hanya akses outlet yang di-assign | Scoping ditegakkan di aplikasi (service layer + query). |
| CMS-7 | TV Display | Antrian tampil di TV per outlet | Halaman publik read-only; tampilkan "sedang dipanggil" per platform; update real-time; layout besar. |
| CMS-8 | Kode Outlet | Sebagai operator, saya memberitahu customer outlet mana yang harus dipilih | Tiap outlet punya **kode pendek unik** (6 karakter ramah-baca, tampil `K7Q-9PT`); tampil di CMS untuk dibacakan/diketik customer. UUID tetap dipakai internal. |
| CMS-9 | Buka/Tutup & Jam Operasional | Sebagai client, saya menutup outlet sementara & mengatur jam operasional | Toggle **"terima antrian"** (tutup manual mis. istirahat/darurat); **jam operasional per hari** (Min–Sab, tiap hari bisa diisi jam atau ditandai libur); **di luar jam → outlet otomatis tutup** & antrian tak bisa diambil. Status buka/tutup **dihitung real-time** (bukan timer/cron). Toggle manual hanya bisa **menutup**; buka tetap mengikuti jam. |

---

## 5. Functional Requirements — Customer Web App

| ID | Fitur | User Story | Acceptance Criteria |
|----|-------|------------|---------------------|
| CUS-0 | Daftar Outlet + Status Buka/Tutup | Customer melihat outlet mana yang buka & bisa diambil antriannya | Home menampilkan **daftar outlet** + status buka/tutup + jam hari ini; outlet **buka** bisa dipilih, **tutup** di-disable. Fallback: cari outlet via **kode** (dari operator). |
| CUS-1 | Booking + Auto-assign Platform | Customer ambil antrian | Pilih outlet → **sistem auto-assign ke platform paling kosong**; customer dapat nomor unik. **Ditolak (`OUTLET_CLOSED`) bila outlet tutup** (di luar jam / ditutup manual). |
| CUS-2 | Akses via QR | Customer buka booking via QR di lokasi | QR membawa ke halaman booking dengan outlet ter-preselect. |
| CUS-3 | Login Opsional + Google | Tidak wajib login; sediakan login Google | Bisa ambil antrian tanpa login (device token); login Google opsional untuk lintas-device. |
| CUS-4 | Status Antrian | Customer lihat nomornya & sisa antrian di depannya | Tampilkan nomor + jumlah antrian di depan (per platform); update real-time. |
| CUS-5 | Reminder "3 lagi" | Saat sisa 3 antrian, kirim web push otomatis | Web Push API/VAPID tanpa third-party (TDD §7). |
| CUS-6 | Notifikasi "Ready" | Saat operator memanggil nomornya, customer dapat notifikasi | Push + in-app banner "Giliran Anda — menuju Platform X". |
| CUS-7 | Ambil Ulang Setelah Skip | Customer yang di-skip boleh antri lagi | Mendapat **nomor baru** (ticket baru), auto-assign platform ulang. Booking boleh dari mana saja. |

---

## 6. Siklus Hidup Antrian

```
WAITING ──Panggil──► CALLED ──Layani──► SERVING ──Selesai──► COMPLETED
   │                   │
   │            Panggil ulang (call_count++)
   │                   │
   └───────────────────┴──(call_count = 3 & no-show)──► SKIPPED
                                                          │
                                          (boleh ambil antrian baru → nomor baru)
```

- `call_count` bertambah tiap "Panggil"/"Panggil ulang".
- "Skip" diaktifkan saat `call_count ≥ 3`.
- Customer yang `SKIPPED` **tidak di-requeue**; ia cukup booking ulang dan dapat nomor baru.
- Alur digerakkan operator (manual), bukan timer otomatis (MVP).

---

## 7. Non-Functional Requirements

- **Real-time** <2 detik (WebSocket Bun).
- **Mobile-first** untuk customer; dashboard responsif untuk CMS.
- **Concurrency-safe**: penomoran & auto-assign platform atomic (tak ada nomor dobel).
- **Cost-efficient**: seluruh infra di AWS Lightsail.
- **Multi-tenant scoping** ditegakkan di aplikasi (tanpa RLS Supabase).
- **TV**: teks besar, kontras tinggi.

---

## 8. MVP Scope

**In scope:** semua FR §4 & §5, TV display, realtime, web push, auth CMS (email+pw) & customer (Google opsional + anonim), **kode outlet, daftar outlet publik, buka/tutup manual + jam operasional per hari** (revisi T-005).

**Out of scope:** estimasi waktu tunggu, auto-skip timer, analitik historis, pembayaran/POS, SMS/WA/email, app native, **libur insidental/tanggal merah** (pakai toggle manual), **jam operasional lewat tengah malam / overnight** (tutup < buka).

---

## 9. Keputusan & Pertanyaan Tersisa

**Sudah diputuskan (DECIDED):**
1. Platform → **auto-assign ke platform paling kosong**; outlet wajib ≥1 platform.
2. Auth CMS → **email+password, tanpa register** (akun dibuat di CMS). Role: client(admin) vs operator.
3. Skip → customer **ambil ulang dapat nomor baru**; booking boleh dari mana saja.
8. **Customer app single-tenant** → daftar outlet publik menampilkan **semua outlet** (lintas-client). Bila berkembang multi-bisnis, di-scope per client (kode jadi unik per-client). *(revisi T-005)*
9. **Status outlet** → kode pendek **6 karakter** (alfabet tanpa O/0/I/1/L); **jam operasional per hari**; **toggle manual hanya bisa menutup** (buka = dalam-jam DAN accepting); status **dihitung** dari jam WIB (tanpa cron). *(revisi T-005)*
10. **Reminder "sisa 3" (CUS-5)** → dikirim saat posisi-di-depan **≤ 3** (bukan tepat 3) agar aman bila antrian melompat; idempoten via `reminded_3`. *(revisi T-004)*

**Masih perlu konfirmasi:**
4. **Reset antrian** — nomor reset tiap hari? Format `A-001`? (`⚠️ ASUMSI`: reset harian per platform, format `A-012`.)
5. **TV** — satu TV per outlet menampilkan semua platform? (`⚠️ ASUMSI`: ya.)
6. **Skala MVP** — berapa outlet & customer konkuren? (memengaruhi sizing instance Lightsail.)
7. **iOS push** — target iOS Safari? (Web Push butuh PWA terinstall, iOS 16.4+.)
