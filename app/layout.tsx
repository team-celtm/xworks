import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--fd",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--fb",
});

export const metadata: Metadata = {
  title: "XWORKS — Sign In",
  description: "Learn something extraordinary today",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
