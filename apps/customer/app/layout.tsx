import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Antrian",
  description: "Ambil nomor antrian",
  manifest: "/manifest.webmanifest",
  // iOS: Web Push hanya jalan bila PWA di-install ke Home Screen.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Antrian" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1F6F50",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
