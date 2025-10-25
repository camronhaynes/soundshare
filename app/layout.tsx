import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "soundshare - your audio, your vibe",
  description: "Upload and stream your sound clips, loops, and recordings with retro aesthetic vibes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <div className="min-h-screen pt-20">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
