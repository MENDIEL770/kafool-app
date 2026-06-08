import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import GlobalEffects from "@/components/ui/GlobalEffects";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kafool — Fundraising Operating System",
  description: "ניהול קמפיינים, גיוס תרומות וטלפנים במקום אחד",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={geist.className}>
      <body className="min-h-full flex flex-col antialiased">
        <GlobalEffects />
        {children}
      </body>
    </html>
  );
}
