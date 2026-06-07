// Koneksi Postgres via postgres.js (TDD §1.2). Satu pool dipakai seluruh app.
import postgres from "postgres";
import { env } from "../lib/env.ts";

export const sql = postgres(env.databaseUrl, {
  max: 10,
  // Matikan transform agar nama kolom snake_case apa adanya.
});

export type Sql = typeof sql;
