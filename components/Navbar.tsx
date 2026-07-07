'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Zap, 
  BarChart3, 
  Settings, 
  LogOut, 
  Link2Off,
  Instagram,
  CheckCircle 
} from 'lucide-react';
import { isAccountLinked, disconnectAccount, syncExistingToken } from '@/app/actions/accounts';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLinked, setIsLinked] = React.useState<boolean>(true); // Default to true to avoid flash
  const [showDisconnectModal, setShowDisconnectModal] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

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
            setShowSuccessModal(true);
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
            <Link href="/" className="flex items-center group">
              <div className="relative w-40 h-12 overflow-hidden group-hover:scale-105 transition-transform">
                <img 
                  src="/logo.png" 
                  alt="Silqueen Logo" 
                  className="w-full h-full object-contain object-left"
                />
              </div>
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
      </nav>

      {/* Disconnect Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowDisconnectModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md relative z-10 overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Link2Off className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Disconnect Instagram?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                This will stop all your automated replies and DMs immediately. You can reconnect at any time.
              </p>
            </div>
            <div className="flex border-t border-slate-50">
              <button 
                onClick={() => setShowDisconnectModal(false)}
                className="flex-1 p-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDisconnect}
                className="flex-1 p-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
              >
                Yes, Disconnect
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowSuccessModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md relative z-10 overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Account Linked!</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your Instagram account has been successfully connected to Silqueen. Your automations are now active!
              </p>
            </div>
            <div className="p-4 bg-slate-50/50">
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg transition-all"
              >
                Great, let's go!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
