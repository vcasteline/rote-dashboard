import type { Metadata } from "next";
import localFont from "next/font/local";
import { Playfair_Display } from "next/font/google";
import React from 'react';
import "./globals.css";

// Fuente principal - Gotham
const gotham = localFont({
  src: [
    {
      path: '../../public/fonts/Gotham Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Gotham Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-gotham',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

// Fuente decorativa - Similar a Avigea (serif elegante para títulos)
// Nota: Si tienes la fuente Avigea, puedes reemplazarla cargándola localmente
const avigea = Playfair_Display({
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '700'],
  variable: '--font-avigea',
});

export const metadata: Metadata = {
  title: "RÔTÈ Admin Dashboard",
  description: "Panel de administración RÔTÈ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${gotham.variable} ${avigea.variable}`}>
      <body className={`${gotham.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
