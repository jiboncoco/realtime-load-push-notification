-- 003: subscribe push idempoten. Satu (tiket, endpoint) hanya boleh sekali —
-- re-subscribe perangkat sama = upsert (ON CONFLICT), bukan baris dobel.
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_subs_ticket_endpoint
  ON push_subscriptions (ticket_id, endpoint);
