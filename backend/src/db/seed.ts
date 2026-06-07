// Seed bootstrap: 1 client + 1 admin user (tanpa register publik, CLAUDE.md §6).
// Idempoten: aman dijalankan ulang (admin di-upsert by email).
// Pakai: `bun run seed`
import { sql } from "./client.ts";
import { env } from "../lib/env.ts";

async function run() {
  const passwordHash = await Bun.password.hash(env.seed.adminPassword);

  await sql.begin(async (tx) => {
    // Cari/buat client demo by name.
    const [existingClient] = await tx<{ id: string }[]>`
      SELECT id FROM clients WHERE name = ${env.seed.clientName} LIMIT 1
    `;
    const clientId =
      existingClient?.id ??
      (
        await tx<{ id: string }[]>`
          INSERT INTO clients (name) VALUES (${env.seed.clientName}) RETURNING id
        `
      )[0]!.id;

    // Upsert admin by email (email UNIQUE).
    await tx`
      INSERT INTO users (client_id, email, password_hash, role, name)
      VALUES (${clientId}, ${env.seed.adminEmail}, ${passwordHash}, 'admin', ${env.seed.adminName})
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            role = 'admin',
            is_active = true
    `;
  });

  console.log(`✓ seed selesai`);
  console.log(`  client : ${env.seed.clientName}`);
  console.log(`  admin  : ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  await sql.end();
}

run().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
