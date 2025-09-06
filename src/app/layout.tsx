import "./globals.css";
import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "DSRPT • Parametric Depeg Cover",
  description: "On-chain parametric risk cover for stablecoin depegs.",
  metadataBase: new URL("https://www.dsrpt.finance"),
  openGraph: {
    title: "DSRPT • Parametric Depeg Cover",
    description: "Instant, rules-based payouts on depeg.",
    url: "https://www.dsrpt.finance",
    siteName: "DSRPT",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
