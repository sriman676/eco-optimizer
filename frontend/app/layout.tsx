import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoOptimizer — Sustainability NCV Dashboard",
  description: "Real-time environmental optimization engine powered by NCV minimization",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#020617] text-white antialiased">{children}</body>
    </html>
  );
}
