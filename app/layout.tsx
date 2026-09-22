import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://modelriskradar-genlayer.galaxthoo.chatgpt.site"),
  title: "ModelRiskRadar for GenLayer",
  description:
    "A GenLayer-powered model risk tool that binds evidence snapshots and produces consensus risk verdicts for AI model, API, and safety-policy changes.",
  openGraph: {
    title: "ModelRiskRadar for GenLayer",
    description:
      "Consensus-reviewed model risk signals with durable evidence commitments.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ModelRiskRadar for GenLayer preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ModelRiskRadar for GenLayer",
    description:
      "Consensus-reviewed model risk signals with durable evidence commitments.",
    images: ["/og.png"],
  },
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
