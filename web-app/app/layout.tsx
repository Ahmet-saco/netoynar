import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Net Oynar - Türkiye'nin Dijital Scouting Platformu",
  description: "Yeteneklerin karanlıkta kalmasın. Videonu yükle, Net Oynar ekibimiz seni vitrine çıkartsın. Türkiye'nin ilk dijital futbol scouting platformu.",
  keywords: ["futbol", "scouting", "yetenek keşfi", "amatör futbol", "futbolcu başvurusu", "net oynar", "dijital scouting"],
  authors: [{ name: "Net Oynar" }],
  creator: "Net Oynar",
  publisher: "Net Oynar",
  metadataBase: new URL('https://www.netoynar.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Net Oynar - Saha Senin, Vitrin Bizim",
    description: "Yeteneklerin karanlıkta kalmasın. Videonu yükle, Net Oynar ekibimiz seni vitrine çıkartsın.",
    url: 'https://www.netoynar.com',
    siteName: 'Net Oynar',
    images: [
      {
        url: '/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Net Oynar - Dijital Scouting Platformu',
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Net Oynar - Saha Senin, Vitrin Bizim",
    description: "Yeteneklerin karanlıkta kalmasın. Videonu yükle, Net Oynar ekibimiz seni vitrine çıkartsın.",
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Next.js otomatik olarak app/icon.jpg ve app/apple-icon.jpg dosyalarını kullanır
  // Manuel icon tanımına gerek yok
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
