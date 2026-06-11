"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { OutletWithPlatforms } from "@/lib/outlets";

const CUSTOMER_BASE =
  process.env.NEXT_PUBLIC_CUSTOMER_BASE ?? "http://localhost:3002";

// QR code outlet → halaman ambil antrian customer (/o/{id}). Bisa diunduh PNG
// & dicetak untuk ditempel di outlet (PRD CUS-2 "akses via QR").
export function QrCard({ outlet }: { outlet: OutletWithPlatforms }) {
  const url = `${CUSTOMER_BASE}/o/${outlet.id}`;
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    // Resolusi tinggi (cetak tajam); tampilan tinggal di-scale CSS.
    QRCode.toDataURL(url, { width: 600, margin: 2 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${outlet.code}.png`;
    a.click();
  }

  function print() {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    w.document.write(`
      <html><head><title>QR ${outlet.name}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:32px;color:#0f172a}
        h1{font-size:22px;margin:0 0 4px}
        .code{font-family:monospace;font-weight:700;letter-spacing:2px;font-size:20px;color:#1F6F50}
        p{color:#64748b;margin:6px 0 20px;font-size:13px}
        img{width:340px;height:340px}
      </style></head>
      <body>
        <h1>${outlet.name}</h1>
        <div class="code">${outlet.code_display}</div>
        <p>Pindai untuk ambil nomor antrian</p>
        <img src="${dataUrl}" />
        <script>window.onload=()=>{window.print()}</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">QR Outlet</h2>
        <span className="font-mono text-sm font-semibold text-brand">
          {outlet.code_display}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR ${outlet.name}`}
            className="h-44 w-44 rounded-xl border border-slate-100"
          />
        ) : (
          <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-slate-100 text-sm text-slate-400">
            Membuat QR…
          </div>
        )}

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-sm text-slate-500">
            QR mengarah ke halaman ambil antrian outlet ini. Tempel/cetak di
            lokasi agar customer langsung scan.
          </p>
          <p className="break-all text-xs text-slate-400">{url}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              onClick={download}
              disabled={!dataUrl}
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              Unduh PNG
            </button>
            <button
              onClick={print}
              disabled={!dataUrl}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
