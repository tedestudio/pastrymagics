import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pastry Magiccs — Custom Cakes & Fresh Bakes",
  description:
    "Design your perfect cake and place instant dine-in orders. Freshly baked delights crafted with love at Pastry Magiccs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable right-click context menu
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
              });
              
              // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
              document.addEventListener('keydown', function(e) {
                if (e.keyCode === 123 || // F12
                    (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
                    (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
                    (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
                  e.preventDefault();
                }
              });
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased select-none`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
