import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DSRPT — Parametric Depeg Cover",
  description: "Futuristic one-page demo UI for parametric risk insurance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        {children}
      </body>
    </html>
  );
}
