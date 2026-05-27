import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <div id="app-layout-container" style={{ display: "contents" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
