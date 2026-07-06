'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, MousePointer2 } from 'lucide-react';

export default function AnalyticsPage() {
  const stats = [
    { label: 'Engagement Rate', value: '4.8%', change: '+1.2%', icon: TrendingUp },
    { label: 'Followers Gained', value: '1,204', change: '+12%', icon: Users },
    { label: 'Click-through Rate', value: '2.4%', change: '-0.4%', icon: MousePointer2 },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-2">Track your automation performance and engagement metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-premium border border-slate-50"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg">
                <stat.icon className="w-5 h-5 text-slate-400" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-20 rounded-3xl border border-slate-100 shadow-premium text-center">
        <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">Advanced Analytics</h3>
        <p className="text-slate-500">Detailed charts and historical data will appear here as your automations run.</p>
      </div>
    </div>
  );
}
