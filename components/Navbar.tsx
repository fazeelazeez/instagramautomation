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
    setShowDisconnectModal(false);
    const result = await disconnectAccount();
    if (result.success) {
      setIsLinked(false);
      router.refresh();
    } else {
      alert("Failed to disconnect: " + result.error);
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

  const handleConnect = () => {
    if (!window.FB) {
      alert("Facebook SDK not loaded yet. Please wait a moment.");
      return;
    }

    window.FB.login((response: any) => {
      if (response.authResponse) {
        // After showing the popup in the video, we still call sync
        syncExistingToken().then((result) => {
          if (result.success) {
            setIsLinked(true);
            console.log("Account connected successfully!");
            router.refresh();
          } else {
            console.error("Connection Error: " + result.error);
          }
        });
      }
    }, {
      scope: 'public_profile,instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement,pages_manage_metadata',
      return_scopes: true
    });
  };

  return (
    <>
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:block">Silqueen</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {[
                { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
                { label: 'Automations', icon: Zap, href: '/flows' },
                { label: 'Analytics', icon: BarChart3, href: '/analytics' },
                { label: 'Settings', icon: Settings, href: '/settings' },
              ].map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isLinked ? (
              <button 
                onClick={() => setShowDisconnectModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-all"
              >
                <Link2Off className="w-4 h-4" />
                <span className="hidden sm:inline">Disconnect Account</span>
              </button>
            ) : (
              <button 
                onClick={handleConnect}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                Connect Account
              </button>
            )}
            
            <div className="w-px h-6 bg-slate-100 mx-2" />
            
            <button onClick={handleSignout} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
