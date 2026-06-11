-- 004: status outlet (kode pendek + toggle buka/tutup) + jam operasional per hari.
-- Status efektif (open) DIHITUNG di aplikasi dari `accepting` + jam WIB sekarang
-- vs outlet_hours (TANPA cron pembalik kolom). Lihat outlets/outlet.status.ts.

-- Kode pendek ramah-manusia (mis. "K7Q9PT"), ditampilkan "K7Q-9PT".
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS code text;
-- Toggle manual: false = ditutup manual (jeda/darurat). Hanya bisa MENUTUP;
-- buka tetap digate jam operasional.
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS accepting boolean NOT NULL DEFAULT true;

-- Backfill kode unik untuk outlet lama. Alfabet tanpa karakter ambigu
-- (tanpa O/0, I/1, L) agar tak salah baca/ketik. Sinkron dengan outlet.code.ts.
DO $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  r record;
  newcode text;
BEGIN
  FOR r IN SELECT id FROM outlets WHERE code IS NULL LOOP
    LOOP
      newcode := '';
      FOR i IN 1..6 LOOP
        newcode := newcode || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM outlets WHERE code = newcode);
    END LOOP;
    UPDATE outlets SET code = newcode WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE outlets ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_outlets_code ON outlets (code);

-- Jam operasional per hari (0=Minggu .. 6=Sabtu, sesuai EXTRACT(DOW)).
-- Tidak ada baris untuk suatu hari = TIDAK ada batasan jam hari itu (buka 24 jam,
-- selama `accepting`). is_closed = hari libur rutin.
CREATE TABLE IF NOT EXISTS outlet_hours (
  outlet_id  uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  weekday    smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_closed  boolean NOT NULL DEFAULT false,
  open_time  time,
  close_time time,
  PRIMARY KEY (outlet_id, weekday),
  -- Bila buka, jam wajib lengkap.
  CHECK (is_closed OR (open_time IS NOT NULL AND close_time IS NOT NULL))
);
