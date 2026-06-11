// Kode pendek outlet ramah-manusia. Alfabet tanpa karakter ambigu
// (tanpa O/0, I/1, L) — sinkron dengan backfill di migrasi 004.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

// Hasilkan kode acak 6 karakter (disimpan polos, mis. "K7Q9PT").
export function generateOutletCode(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

// Normalisasi input user → bentuk simpan: uppercase, buang non-alfanumerik
// (mis. tanda hubung tampilan "K7Q-9PT" → "K7Q9PT").
export function normalizeOutletCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Format tampilan: "K7Q9PT" → "K7Q-9PT".
export function formatOutletCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}
