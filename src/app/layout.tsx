import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yarey Spa & Wellness | Premium Spa, Sauna & Ice Bath in Kathu, Phuket",
  description: "Yarey Spa & Wellness in Kathu, Phuket — premium Thai massage, Finnish sauna, ice bath cold plunge, herbal compress therapy, and guided thermal rituals. Located at Areca Resort. Open daily 10:30–22:30. ☎ +66 84 846 9393",
  keywords: [
    "spa phuket", "spa kathu phuket", "massage phuket", "thai massage kathu",
    "sauna phuket", "ice bath phuket", "cold plunge phuket", "wellness phuket",
    "herbal compress massage", "aromatherapy massage phuket",
    "spa near me phuket", "day spa kathu", "best spa phuket",
    "thermal therapy phuket", "contrast therapy", "Finnish sauna phuket",
    "Yarey Spa", "Yarey Wellness", "Areca Resort spa",
    "สปาภูเก็ต", "นวดภูเก็ต", "ซาวน่าภูเก็ต", "อ่างน้ำแข็ง",
  ],
  metadataBase: new URL("https://yareywellness.com"),
  alternates: {
    canonical: "https://yareywellness.com",
  },
  openGraph: {
    title: "Yarey Spa & Wellness | Kathu, Phuket",
    description: "Premium spa, Thai massage, Finnish sauna & ice bath cold plunge. Guided thermal rituals at Areca Resort, Kathu. Open daily 10:30–22:30.",
    type: "website",
    url: "https://yareywellness.com",
    siteName: "Yarey Spa & Wellness",
    locale: "en_US",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Yarey Spa & Wellness — Premium Thermal Sanctuary in Phuket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yarey Spa & Wellness | Phuket",
    description: "Premium Thai massage, Finnish sauna & ice bath cold plunge in Kathu, Phuket. Guided thermal rituals designed for deep restoration.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "geo.region": "TH-83",
    "geo.placename": "Kathu, Phuket, Thailand",
    "geo.position": "7.9089;98.3483",
    "ICBM": "7.9089, 98.3483",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* DNS Preconnect — start TLS handshake early for LIFF, LINE APIs, Firestore */}
        <link rel="preconnect" href="https://api.line.me" />
        <link rel="preconnect" href="https://static.line-scdn.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.line.me" />
        <link rel="dns-prefetch" href="https://static.line-scdn.net" />
        <link rel="dns-prefetch" href="https://liff.line.me" />
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased bg-mystical-gradient",
        cormorant.variable,
        outfit.variable
      )}>
        {/* Film Grain */}
        <div className="noise-overlay" />

        {children}
        <Toaster />
      </body>
    </html>
  );
}
