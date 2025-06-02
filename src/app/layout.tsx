import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import React from 'react';
import "./globals.css";

// Configurar la fuente
const workSans = Work_Sans({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-work-sans', // Para usarla como variable CSS si se desea
});

export const metadata: Metadata = {
  title: "Giro Admin Dashboard",
  description: "Admin dashboard for Giro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Aplicar la clase de la fuente y antialiasing */}
      <body className={`${workSans.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
