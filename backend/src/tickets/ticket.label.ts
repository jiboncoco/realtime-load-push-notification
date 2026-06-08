// Util pure modul antrian (mudah diunit-test, tanpa DB).

// Label tiket: {code}-{nomor minimal 3 digit}. mis. A + 12 → "A-012", 1000 → "A-1000".
export function formatLabel(code: string, number: number): string {
  return `${code}-${String(number).padStart(3, "0")}`;
}

// Tanggal "hari ini" dalam zona WIB (Asia/Jakarta) sebagai 'YYYY-MM-DD'.
// Dipakai sebagai booking_day → basis reset penomoran harian.
export function wibDay(now: Date = new Date()): string {
  // en-CA menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
