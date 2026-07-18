import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pik Flyer Android — 免費試用下載",
  description:
    "Pik Flyer Android 免費試用版。用明信片骰子、城市散步、地標分類與懸浮視窗探索真實世界地標。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
