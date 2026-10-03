import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { RejestracjaSW } from "@/components/pwa/rejestracja-sw";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "AgloSat",
  description: "AgloSat wskazuje miastu, które niewiadome o chodnikach sprawdzić najpierw, bo od nich zależy najwięcej dojść do usług.",
  applicationName: "AgloSat",
  // Nazwa na ekranie początkowym iPhone'a; iOS nie czyta short_name z manifestu.
  appleWebApp: { capable: true, title: "AgloSat", statusBarStyle: "default" },
  icons: { apple: "/ikony/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Bez maximumScale i userScalable: powiększanie strony musi zostać dostępne (WCAG 1.4.4).
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={cn("h-full antialiased", "font-sans", inter.variable)}>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white font-sans text-gray-950">
        {children}
        <RejestracjaSW />
      </body>
    </html>
  );
}
