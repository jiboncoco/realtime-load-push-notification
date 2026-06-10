// Hook notifikasi push, pola sama dengan ws/broadcast.ts: service domain antrian
// memanggil fungsi-fungsi ini tanpa tahu implementasinya. Default NO-OP, sehingga
// unit test ticketops (repo palsu) tetap bebas DB/push. Implementasi nyata
// (pushService) di-pasang index.ts saat startup.
export type TicketCalled = { id: string; label: string; platformName: string };

type Handlers = {
  ticketCalled: (t: TicketCalled) => void;
  queueAdvanced: (platformId: string) => void;
};

let handlers: Handlers = {
  ticketCalled: () => {},
  queueAdvanced: () => {},
};

export function setPushHandlers(h: Handlers) {
  handlers = h;
}

// Dipanggil saat operator memanggil tiket (action "call") → notifikasi "ready".
export function onTicketCalled(t: TicketCalled) {
  handlers.ticketCalled(t);
}

// Dipanggil saat tiket keluar dari WAITING (call/skip) → cek reminder "sisa 3"
// untuk tiket yang tersisa di platform itu.
export function onQueueAdvanced(platformId: string) {
  handlers.queueAdvanced(platformId);
}
