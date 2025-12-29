import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/providers";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";

const font = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Captain Dashboard - Uber Clone",
  description: "Captain dashboard for ride-hailing app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <body className={`${font.className}`}>
          {children}
          <Toaster position="top-center" />
        </body>
      </Providers>
    </html>
  );
}
