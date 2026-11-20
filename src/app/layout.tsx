import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Walammi — Read Stories Online", template: "%s · Walammi" },
  description:
    "Walammi is a read-only story library. Follow series, read every part online, react and discuss — no downloads.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
