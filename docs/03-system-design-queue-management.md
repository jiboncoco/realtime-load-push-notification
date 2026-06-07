# System Design — Queue Management System

> Pendamping: `01-PRD`, `02-TDD`. Stack: **Next.js + Bun + PostgreSQL (AWS Lightsail)**. Auth & Realtime dibangun sendiri.

---

## 1. Arsitektur Komponen

```mermaid
flowchart TB
    subgraph Client["Browser"]
        CMS["CMS Web App<br/>(Next.js)"]
        CUS["Customer Web App<br/>(Next.js + PWA/SW)"]
        TV["TV Display<br/>(Next.js, read-only)"]
    end

    subgraph Lightsail["AWS Lightsail (Docker Compose)"]
        CADDY["Caddy<br/>(reverse proxy + TLS)"]
        API["Bun + Hono<br/>REST + Auth(JWT)<br/>+ WebSocket pub/sub<br/>+ Web Push (VAPID)"]
        DB[("PostgreSQL")]
    end

    GOOG["Google OAuth"]

    CMS -->|REST + WS| CADDY
    CUS -->|REST + WS| CADDY
    TV  -->|REST + WS| CADDY
    CADDY --> API
    API --> DB
    API -.->|Web Push background| CUS
    CUS -->|login opsional| GOOG
    GOOG -.->|callback| API
```

---

## 2. Tanggung Jawab Komponen

| Komponen | Tanggung jawab |
|----------|----------------|
| **CMS Web App** | Manajemen outlet/platform/user/operator, monitor live, panel operator (call/skip). |
| **Customer Web App** | Ambil antrian (web/QR) dengan auto-assign platform, tampilkan posisi, daftar push, terima notifikasi. |
| **TV Display** | Layar publik per outlet: nomor "sedang dipanggil" per platform, update live. |
| **Caddy** | Reverse proxy + HTTPS otomatis. |
| **Bun API** | Semua mutasi & logika: auto-assign platform, penomoran atomic, state machine, JWT auth, WebSocket pub/sub, trigger push. |
| **PostgreSQL** | Penyimpanan data (di Docker pada instance, atau Lightsail Managed DB). |

---

## 3. Alur Data Utama

### 3.1 Ambil Antrian + Auto-assign Platform (CUS-1)

```mermaid
sequenceDiagram
    participant C as Customer
    participant A as Bun API
    participant DB as Postgres
    C->>A: POST /outlets/:id/tickets (device_token)
    A->>DB: TX: pilih platform WAITING paling sedikit
    A->>DB: number = MAX(number)+1 (platform/hari) FOR UPDATE
    DB-->>A: ticket {label "A-012", id}
    A-->>C: {label, id}
    A->>A: publish outlet:{id} (CMS/TV)
    Note over C: subscribe WS ticket:{id}
```

### 3.2 Operator Memanggil (CMS-4 → CUS-6)

```mermaid
sequenceDiagram
    participant O as Operator (CMS)
    participant A as Bun API
    participant DB as Postgres
    participant C as Customer
    participant TV as TV
    O->>A: POST /tickets/:id/call (JWT operator)
    A->>DB: status=CALLED, call_count++
    A->>A: publish outlet:{id} -> TV tampil "A-012"
    A->>A: publish ticket:{id} -> banner in-app
    A->>C: Web Push "Giliran Anda -> Platform A"
```

### 3.3 Reminder "Sisa 3" (CUS-5)

```mermaid
sequenceDiagram
    participant A as Bun API
    participant DB as Postgres
    participant C as Customer
    Note over A: tiap antrian platform berkurang
    A->>DB: hitung posisi WAITING
    DB-->>A: ticket X posisi=3 & reminded_3=false
    A->>DB: set reminded_3=true (idempoten)
    A->>C: Web Push "Sebentar lagi giliran Anda (sisa 3)"
```

### 3.4 Skip & Ambil Ulang (CMS-4 / CUS-7)

```mermaid
flowchart LR
    W[WAITING] -->|Panggil| C1[CALLED count=1]
    C1 -->|ulang| C2[count=2]
    C2 -->|ulang| C3[count=3]
    C3 -->|datang| S[SERVING]
    C3 -->|no-show| SK[SKIPPED]
    SK -->|booking ulang| NEW[Ticket baru + nomor baru]
    C1 -->|datang| S
    S -->|Selesai| D[COMPLETED]
```

---

## 4. Strategi Realtime (Bun WebSocket)

- **CMS & TV** subscribe topic `outlet:{id}` → semua perubahan ticket outlet itu.
- **Customer** subscribe topic `ticket:{id}` → status & posisi dirinya.
- Auth pada koneksi: JWT (CMS/operator) / token ticket (customer).
- **Web Push** menutup kasus tab tertutup/background.

---

## 5. Konkurensi & Keandalan

- **Auto-assign + penomoran atomic** (TX + `FOR UPDATE`/sequence) → tak ada nomor dobel / salah platform saat bersamaan.
- **Idempotensi reminder** via flag `reminded_3`.
- **Fallback snapshot** `GET /outlets/:id/queue` bila WS putus.
- **Audit** di `ticket_events`.
- **Scoping multi-tenant di aplikasi** (tanpa RLS) — wajib difilter `client_id`/`operator_outlets` di repo layer.

---

## 6. Topologi Infrastruktur (Semua Lightsail, Hemat)

```mermaid
flowchart LR
    User((User)) --> Caddy[Caddy + TLS]
    subgraph LS["AWS Lightsail - 1 instance, Docker Compose"]
        Caddy --> Next[Next.js apps]
        Caddy --> Bun[Bun API + WS + Push]
        Bun --> PG[(PostgreSQL)]
    end
    Bun -. snapshot/pg_dump .-> Backup[(Backup)]
```

- Semua service dalam 1 instance Lightsail via Docker Compose.
- Backup: Lightsail automatic snapshots + cron `pg_dump`.
- Scale Phase 2: pisahkan Postgres ke Lightsail Managed DB; tambah instance + load balancer.
- *(Opsional)*: Next.js dapat dipindah ke Vercel free tier untuk mengurangi beban instance.
