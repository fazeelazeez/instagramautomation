'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Zap, 
  Shield, 
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { getFlows } from '@/app/actions/flows';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [flows, setFlows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalComments: 0,
    dmsSent: 0,
    automationHits: 0,
  });

  useEffect(() => {
    async function loadAll() {
      try {
        // ── Load flows ──────────────────────────────────────────
        const data = await getFlows();
        const groups: { [key: string]: any } = {};
        data.forEach((flow: any) => {
          let nameMeta = flow.name;
          let scope = 'all';
          let flowGroupId = flow.id;
          try {
            const parsed = JSON.parse(flow.name);
            if (parsed?.flowGroupId) {
              nameMeta = parsed.name || 'Untitled';
              scope = parsed.scope || 'all';
              flowGroupId = parsed.flowGroupId;
            }
          } catch (e) {}
          if (!groups[flowGroupId]) {
            groups[flowGroupId] = { name: nameMeta, scope, keywords: [], is_active: false };
          }
          groups[flowGroupId].keywords.push(flow.trigger_keyword);
          if (flow.is_active) groups[flowGroupId].is_active = true;
        });
        setFlows(Object.values(groups));

        // ── Load logs for stats ─────────────────────────────────
        const { data: logs } = await supabase
          .from('automation_logs')
          .select('*')
          .neq('action_taken', 'RAW_WEBHOOK_RECEIVED')
          .order('created_at', { ascending: false })
          .limit(200);

        if (logs) {
          const hits = logs.filter((l: any) => l.status === 'processed').length;
          const dms = logs.filter(
            (l: any) => l.action_taken === 'both' || l.action_taken === 'dm'
          ).length;
          const comments = logs.filter(
            (l: any) => l.action_taken === 'both' || l.action_taken === 'comment'
          ).length;

          setStats({ totalComments: comments, dmsSent: dms, automationHits: hits });
          setRecentLogs(logs.slice(0, 6));
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

  const statCards = [
    { label: 'Total Comments', value: isLoading ? '...' : stats.totalComments, icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'DMs Sent', value: isLoading ? '...' : stats.dmsSent, icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Automation Hits', value: isLoading ? '...' : stats.automationHits, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Safety Score', value: '100%', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    return `${diffD}d ago`;
  };

  const getActionLabel = (action: string) => {
    if (action === 'both') return 'Comment + DM sent';
    if (action === 'dm') return 'DM sent';
    if (action === 'comment') return 'Comment replied';
    return action;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full">
        {/* Welcome Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-slate-900"
            >
              Welcome back, Creator
            </motion.h1>
            <p className="text-slate-500 mt-2">Manage your Instagram engagement and automation flows.</p>
          </div>
          <Link href="/flows">
            <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl text-xs shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Sparkles className="w-4 h-4 text-yellow-300" /> Go To Automations
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white p-6 rounded-2xl shadow-premium border border-slate-50 flex items-center gap-4"
            >
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`${stat.color} w-6 h-6`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className={`text-2xl font-bold text-slate-900 ${isLoading && stat.label !== 'Safety Score' ? 'animate-pulse' : ''}`}>
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Automations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Active Automations</h2>
              <Link href="/flows" className="flex items-center gap-2 text-sm font-semibold text-primary hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Configure
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-50 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : flows.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                <Zap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No active automations</p>
                <p className="text-slate-400 text-xs mt-1 mb-4">Set up comment replies to get started.</p>
                <Link href="/flows">
                  <button className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition-colors">
                    Create Reply Flow
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {flows.map((flow) => (
                  <div key={flow.name} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm">{flow.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            flow.scope === 'all' ? 'bg-purple-100 text-purple-700'
                              : flow.scope === 'next' ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {flow.scope === 'all' ? 'All' : flow.scope === 'next' ? 'Next' : 'Single'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Keywords: {flow.keywords.join(', ')}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      flow.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {flow.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity from real logs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
              <Link href="/analytics">
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Live Log</p>
                {recentLogs.length > 0 && (
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {isLoading ? (
                  <div className="p-4 space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-full shrink-0" />
                        <div className="flex-grow space-y-1">
                          <div className="h-3 bg-slate-100 rounded w-2/3" />
                          <div className="h-2 bg-slate-50 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentLogs.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-slate-400">No recent activity</p>
                  </div>
                ) : (
                  recentLogs.map((log, idx) => (
                    <div key={log.id || idx} className="flex items-start gap-3 p-4 hover:bg-slate-50/30 transition-colors">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-extrabold text-slate-500 uppercase shrink-0 mt-0.5">
                        {(log.sender_handle || '?')[0]}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900 text-xs truncate">
                            @{log.sender_handle || 'unknown'}
                          </p>
                          <span className={`shrink-0 ${log.status === 'processed' ? 'text-emerald-500' : 'text-slate-300'}`}>
                            {log.status === 'processed'
                              ? <CheckCircle2 className="w-3.5 h-3.5" />
                              : <AlertCircle className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{getActionLabel(log.action_taken)}</p>
                        <p className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {formatTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link href="/analytics" className="block text-center w-full p-3 text-sm font-medium text-primary hover:bg-blue-50 border-t border-slate-50 transition-colors">
                View Full Logs →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
