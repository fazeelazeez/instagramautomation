'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Zap, BarChart3, Settings, LogOut, Link2Off } from 'lucide-react';
import { isAccountLinked, disconnectAccount, syncExistingToken } from '@/app/actions/accounts';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLinked, setIsLinked] = React.useState<boolean>(true); // Default to true to avoid flash

  React.useEffect(() => {
    async function checkStatus() {
      const status = await isAccountLinked();
      setIsLinked(status);
      
      // Debug check for SDK
      setTimeout(() => {
        if (!window.FB) {
          console.warn("Facebook SDK not detected after 3 seconds.");
        } else {
          console.log("Facebook SDK is ready.");
        }
      }, 3000);
    }
    checkStatus();
  }, []);

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect your Instagram account? This will stop all automations.")) {
      const result = await disconnectAccount();
      if (result.success) {
        setIsLinked(false);
        router.refresh();
      } else {
        alert("Failed to disconnect: " + result.error);
      }
    }
  };

  // Navbar now only renders for dashboard pages due to Route Group layout
  // We can simplify the logic here

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Automations', href: '/flows', icon: Zap },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleSignout = () => {
    // Clear the isLoggedIn cookie
    document.cookie = "isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/login');
    router.refresh();
  };

  const handleConnect = async () => {
    const result = await syncExistingToken();
    if (result.success) {
      setIsLinked(true);
      alert("Account connected successfully!");
      router.refresh();
    } else {
      alert("Connection failed: " + result.error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="SilQueen Designs Logo" className="h-10 w-auto group-hover:scale-105 transition-transform" />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'text-primary bg-blue-50' 
                      : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {isLinked ? (
              <button 
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Disconnect Instagram"
              >
                <Link2Off className="w-4 h-4" />
                <span className="hidden lg:inline">Disconnect Account</span>
              </button>
            ) : (
              <button 
                onClick={handleConnect}
                className="insta-button text-sm hidden sm:block"
              >
                Connect Account
              </button>
            )}
            <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
            <button 
              onClick={handleSignout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group relative"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
              <span className="sr-only">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
