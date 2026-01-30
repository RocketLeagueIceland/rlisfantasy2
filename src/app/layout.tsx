import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RLIS Fantasy League",
  description: "Fantasy league for the Icelandic Rocket League league (RLIS)",
  metadataBase: new URL("https://fantasy.rlis.is"),
  icons: {
    icon: "/rlis_logo.png",
    apple: "/rlis_logo.png",
  },
  openGraph: {
    title: "RLIS Fantasy League",
    description: "Build your dream Rocket League team and compete in the Icelandic Rocket League fantasy league!",
    siteName: "RLIS Fantasy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RLIS Fantasy League",
    description: "Build your dream Rocket League team and compete in the Icelandic Rocket League fantasy league!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <Header />
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
