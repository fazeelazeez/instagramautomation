'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <>
      {!isLoginPage && (
        <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center h-16 items-center">
              <Link href="/" className="flex items-center gap-3 group">
                <img src="/logo.png" alt="SilQueen Designs Logo" className="h-10 w-auto group-hover:scale-105 transition-transform" />
              </Link>
            </div>
          </div>
        </nav>
      )}
      {children}
    </>
  );
}
