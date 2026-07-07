'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Zap, 
  Shield, 
  BarChart3, 
  Settings,
  Plus,
  Instagram
} from 'lucide-react';

export default function Home() {
  const stats = [
    { label: 'Total Comments', value: '0', icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'DMs Sent', value: '0', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Automation Hits', value: '0', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Safety Score', value: '100%', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const recentActivity: any[] = [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}

      <main className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full">
        {/* Welcome Header */}
        <div className="mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-slate-900"
          >
            Welcome back, Creator
          </motion.h1>
          <p className="text-slate-500 mt-2">Manage your Instagram engagement and automation flows.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-premium border border-slate-50 flex items-center gap-4"
            >
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`${stat.color} w-6 h-6`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Flows */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Active Automations</h2>
              <button className="flex items-center gap-2 text-sm font-semibold text-primary hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> New Flow
              </button>
            </div>
            
            {[
              { name: 'Keyword "PRICE" → DM', status: 'Paused', hits: 0, lastRun: 'Never' },
            ].map((flow) => (
              <div key={flow.name} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{flow.name}</h3>
                    <p className="text-xs text-slate-400">Last triggered {flow.lastRun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right hidden sm:block">
                    <p className="font-medium text-slate-900">{flow.hits} hits</p>
                    <p className="text-xs text-slate-400">Total volume</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    flow.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {flow.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions / Recent Logs */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                <p className="text-sm font-semibold text-slate-700">Live Log</p>
              </div>
              <div className="p-4 space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{log.user}</p>
                        <p className="text-xs text-slate-500">{log.action}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{log.time}</span>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full p-3 text-sm font-medium text-primary hover:bg-blue-50 border-t border-slate-50 transition-colors">
                View Full Logs
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
