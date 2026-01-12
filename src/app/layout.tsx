import type { Metadata } from "next";
import { Playfair_Display_SC, Quicksand } from "next/font/google"; // New Fonts
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner"; // Toast Notifications

// Quantum Light Typography
const playfair = Playfair_Display_SC({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-serif", // Map to font-serif
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-sans", // Map to font-sans
});

export const metadata: Metadata = {
  title: "Quantum Light | Energy Healing Sanctuary",
  description: "Magical, Grounded, Inviting, Natural, Kind. A deep forest sanctuary for energy restoration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased bg-mystical-gradient",
        playfair.variable,
        quicksand.variable
      )}>
        {/* Mystical Noise Overlay */}
        <div className="noise-overlay" />

        {/* Ambient Glow Effects */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-40 pointer-events-none" />

        {children}
        <Toaster />
      </body>
    </html>
  );
}
