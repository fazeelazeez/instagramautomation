'use client';

import React from 'react';
import { Settings, Shield, Bell, CreditCard, User } from 'lucide-react';

export default function SettingsPage() {
  const sections = [
    { title: 'Profile', icon: User, description: 'Manage your account details and preferences.' },
    { title: 'Security', icon: Shield, description: 'Update your password and security settings.' },
    { title: 'Notifications', icon: Bell, description: 'Configure how you want to be notified.' },
    { title: 'Billing', icon: CreditCard, description: 'Manage your subscription and payment methods.' },
  ];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-slate-400" />
          Settings
        </h1>
        <p className="text-slate-500 mt-2">Configure your account and automation preferences.</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div 
            key={section.title}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-6"
          >
            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-white transition-colors">
              <section.icon className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex-grow">
              <h3 className="font-bold text-slate-900">{section.title}</h3>
              <p className="text-sm text-slate-500">{section.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 bg-slate-900 rounded-2xl text-white">
        <h3 className="font-bold mb-2">Need help?</h3>
        <p className="text-slate-400 text-sm mb-4">Check our documentation or contact support for assistance with your setup.</p>
        <button className="bg-white text-slate-900 px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
          View Documentation
        </button>
      </div>
    </div>
  );
}
