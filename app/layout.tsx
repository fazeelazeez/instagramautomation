import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InstaAuto | Premium Instagram Automation",
  description: "Next-gen comment and DM automation for Instagram Business accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-[#f8fafc]">
          {children}
        </div>
      </body>
    </html>
  );
}
