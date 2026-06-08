// Device token anonim (mode tanpa login). Disimpan di localStorage, dikirim
// saat ambil antrian agar tiket bisa dikaitkan ke perangkat ini.
const KEY = "qms.device_token";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}
