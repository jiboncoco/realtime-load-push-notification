-- 001_init: skema awal Queue Management System (TDD §3).
-- Idempoten: aman dijalankan ulang.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- untuk gen_random_uuid()

-- Tenant (client = penyewa/brand yang punya outlet).
CREATE TABLE IF NOT EXISTS clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User CMS: admin (kelola penuh) atau operator (hanya antrian outlet assigned).
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'operator')),
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outlets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       text NOT NULL,
  address    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Outlet wajib >=1 platform (guard ditegakkan di service layer).
CREATE TABLE IF NOT EXISTS platforms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id  uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  code       text NOT NULL, -- 'A','B','C'
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, code)
);

-- Scoping operator ke outlet tertentu (multi-tenant di aplikasi).
CREATE TABLE IF NOT EXISTS operator_outlets (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, outlet_id)
);

-- Hanya terisi bila customer login Google; anonim pakai device_token di tickets.
CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text UNIQUE,
  email      text,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id    uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  platform_id  uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  number       integer NOT NULL,             -- urut per platform per hari
  label        text NOT NULL,                -- 'A-012'
  status       text NOT NULL DEFAULT 'WAITING'
                 CHECK (status IN ('WAITING','CALLED','SERVING','COMPLETED','SKIPPED')),
  call_count   integer NOT NULL DEFAULT 0,
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  device_token text,
  reminded_3   boolean NOT NULL DEFAULT false, -- idempotensi reminder "sisa 3"
  created_at   timestamptz NOT NULL DEFAULT now(),
  called_at    timestamptz,
  completed_at timestamptz
);

-- Index utama untuk query antrian (TDD §3).
CREATE INDEX IF NOT EXISTS idx_tickets_queue
  ON tickets (outlet_id, platform_id, status, number);

-- Audit aksi call/skip/serve/complete (TDD §4.2).
CREATE TABLE IF NOT EXISTS ticket_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type          text NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
