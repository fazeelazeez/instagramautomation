import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FacebookSDK from "@/components/FacebookSDK";

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
        <FacebookSDK />
        <div className="min-h-screen bg-[#f8fafc]">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
