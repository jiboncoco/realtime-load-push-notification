# Queue Management System

Antrian digital real-time. Lihat `CLAUDE.md` (konteks) & `docs/` (PRD, TDD, system design).

Status: **MVP Phase 1** — fondasi monorepo + modul **Auth** selesai. Modul berikutnya per `CLAUDE.md §9`: Outlet/Platform → User/Operator → Queue Engine → Monitor+TV → Notifications.

## Prasyarat

- [Bun](https://bun.sh) (backend & tooling)
- Docker + Docker Compose (Postgres)
- Node-compatible env untuk Next.js (dijalankan via Bun/npm)

## Struktur

```
backend/   Bun + Hono (REST + Auth JWT + WS stub)
apps/cms/  Next.js CMS (App Router + Tailwind)
docs/      PRD / TDD / system design
docker-compose.yml  Postgres (host port 55432 → 5432)
```

## Menjalankan (dev lokal)

```bash
# 1. Database
docker compose up -d postgres

# 2. Backend
cd backend
cp .env.example .env
bun install
bun run migrate     # buat skema (TDD §3)
bun run seed        # buat client + admin demo
bun run dev         # API di http://localhost:3001

# 3. CMS (terminal lain)
cd apps/cms
cp .env.example .env.local
bun install
bun run dev         # CMS di http://localhost:3000
```

Login demo: `admin@demo.test` / `admin12345` (ubah via env seed).

## Menjalankan (Docker — seluruh stack)

Menjalankan semua (backend + 3 app + Postgres) di belakang Caddy sebagai 1 pintu masuk.

```bash
cp .env.docker.example .env     # isi JWT_SECRET & VAPID_* (samakan dgn backend/.env)
docker compose up -d --build
```

Akses (Caddy di host :8080; host :80 sering terpakai):
- Customer : http://app.localhost:8080
- CMS      : http://cms.localhost:8080
- TV       : http://tv.localhost:8080
- API/WS   : http://api.localhost:8080

> `*.localhost` otomatis resolve ke 127.0.0.1 di Chrome/Edge/Firefox. **Safari** perlu
> `/etc/hosts`: `127.0.0.1 api.localhost app.localhost cms.localhost tv.localhost`.
> `NEXT_PUBLIC_*` di-*bake* saat build → bila ganti domain, `docker compose build` ulang.

Seed admin awal (sekali, bila DB kosong): `docker compose exec backend bun run seed`.

## Test

```bash
cd backend && bun test
```

## Catatan

- Port host Postgres = **55432** (5432/5433 sering dipakai Postgres lokal lain). Ubah di `docker-compose.yml` + `backend/.env` bila perlu.
- Google OAuth customer masih stub (**Phase 2**). WebSocket realtime & Web Push sudah aktif.
