import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Aglometer",
  description: "Landing page — szablon do dalszej edycji",
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
      </body>
    </html>
  );
}
