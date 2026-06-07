// Dijalankan sebelum test (bunfig.toml [test].preload). Sediakan env minimal
// agar lib/env.ts tidak gagal saat import; test service tidak menyentuh DB.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET ||= "test-secret";
process.env.PORT ||= "3001";
