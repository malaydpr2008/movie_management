import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "CineFlow Studio | Dual-Tree Film Production Management",
  description: "Advanced film production architecture: narrative outliner, screenplays, shot coverage, breakdown, and scheduling engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-studio-950 text-slate-100 min-h-screen selection:bg-sky-500/30 selection:text-sky-200">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
