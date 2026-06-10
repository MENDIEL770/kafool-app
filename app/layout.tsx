import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import GlobalEffects from "@/components/ui/GlobalEffects";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-rubik",
});

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
    <html lang="he" dir="rtl" className={rubik.className}>
      <body className="min-h-full flex flex-col antialiased">
        <GlobalEffects />
        {children}
      </body>
    </html>
  );
}
