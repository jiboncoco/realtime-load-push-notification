-- 002: penomoran antrian per platform per hari (reset harian, zona WIB).
-- booking_day diisi aplikasi (wibDay) saat insert; UNIQUE jadi pengaman ganda
-- agar nomor dobel mustahil di level DB sekalipun ada bug logika.
-- Catatan: tidak memakai generated column karena ekspresi AT TIME ZONE tidak
-- immutable → ditolak Postgres untuk GENERATED ALWAYS.

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS booking_day date;

-- Backfill baris lama (jika ada) dari created_at dalam zona WIB.
UPDATE tickets
SET booking_day = (created_at AT TIME ZONE 'Asia/Jakarta')::date
WHERE booking_day IS NULL;

ALTER TABLE tickets ALTER COLUMN booking_day SET NOT NULL;

-- Nomor unik per platform per hari.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_platform_day_number
  ON tickets (platform_id, booking_day, number);
