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
  title: "XWORKS - Live Curated Workshops for Every Curious Mind",
  description: "Live hands-on workshops in tech, creativity, wellness. Learn from experts.",
  alternates: {
    canonical: "https://xworks.celtm.com/",
  },
  openGraph: {
    title: "XWORKS - Curated Live Workshops",
    description: "Live hands-on workshops in tech, creativity, wellness. Learn from experts.",
    url: "https://xworks.celtm.com/",
    siteName: "XWORKS",
    images: [
      {
        url: "https://xworks.celtm.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "XWORKS Curated Live Workshops",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XWORKS - Curated Live Workshops",
    description: "Live hands-on workshops in tech, creativity, wellness. Learn from experts.",
    images: ["https://xworks.celtm.com/og-image.png"],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "XWORKS",
                "url": "https://xworks.celtm.com",
                "logo": "https://xworks.celtm.com/favicon.svg",
                "sameAs": [
                  "https://twitter.com/xworks"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "XWORKS",
                "url": "https://xworks.celtm.com",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://xworks.celtm.com/catalogue?search={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              }
            ])
          }}
        />
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
