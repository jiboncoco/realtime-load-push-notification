// Runner migrasi dependency-free: jalankan file .sql terurut, catat di schema_migrations.
// Pakai: `bun run migrate`
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./client.ts";

const MIGRATIONS_DIR = join(import.meta.dir, "migrations");

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function appliedSet(): Promise<Set<string>> {
  const rows = await sql<{ name: string }[]>`SELECT name FROM schema_migrations`;
  return new Set(rows.map((r) => r.name));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await appliedSet();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001_, 002_, ... → urutan leksikografis = urutan eksekusi

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const path = join(MIGRATIONS_DIR, file);
    const content = await Bun.file(path).text();

    // Satu transaksi per file: semua-atau-tidak.
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });

    console.log(`✓ applied ${file}`);
    count++;
  }

  console.log(count === 0 ? "Sudah up-to-date." : `Selesai: ${count} migrasi.`);
  await sql.end();
}

run().catch((err) => {
  console.error("Migrasi gagal:", err);
  process.exit(1);
});
