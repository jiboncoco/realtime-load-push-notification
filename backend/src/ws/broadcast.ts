// Hook broadcast realtime. Service memanggil broadcast(topic, data); publisher
// di-set oleh index.ts ke server.publish (Bun WebSocket). Tanpa subscriber =
// no-op aman. Logika pub/sub penuh menyusul di modul Monitor+TV.
type Publisher = (topic: string, data: unknown) => void;

let publisher: Publisher = () => {};

export function setPublisher(fn: Publisher) {
  publisher = fn;
}

export function broadcast(topic: string, data: unknown) {
  publisher(topic, data);
}
