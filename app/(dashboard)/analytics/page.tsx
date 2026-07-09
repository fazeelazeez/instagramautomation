'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  MessageSquare,
  Send,
  Zap,
  Calendar,
  ChevronDown,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Date filter presets ──────────────────────────────────────────
type Preset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

function getDateRange(preset: Preset, customFrom?: string, customTo?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'today') {
    const s = fmt(now);
    return { from: s + 'T00:00:00', to: s + 'T23:59:59' };
  }
  if (preset === 'this_week') {
    const day = now.getDay(); // 0=Sun
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    return { from: fmt(start) + 'T00:00:00', to: fmt(now) + 'T23:59:59' };
  }
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start) + 'T00:00:00', to: fmt(now) + 'T23:59:59' };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(start) + 'T00:00:00', to: fmt(end) + 'T23:59:59' };
  }
  if (preset === 'custom' && customFrom && customTo) {
    return { from: customFrom + 'T00:00:00', to: customTo + 'T23:59:59' };
  }
  // fallback — all time (large range)
  return { from: '2024-01-01T00:00:00', to: fmt(now) + 'T23:59:59' };
}

const PRESET_LABELS: Record<Preset, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom Range',
};

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    const { from, to } = getDateRange(preset, customFrom, customTo);

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      // Filter out raw webhook noise
      const filtered = data.filter(
        (l) => l.action_taken !== 'RAW_WEBHOOK_RECEIVED'
      );
      setLogs(filtered);
    }
    setIsLoading(false);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Stats derived from logs
  const totalHits = logs.length;
  const successCount = logs.filter((l) => l.status === 'processed').length;
  const uniqueUsers = new Set(logs.map((l) => l.sender_handle).filter(Boolean)).size;
  const successRate = totalHits > 0 ? Math.round((successCount / totalHits) * 100) : 0;

  const handlePreset = (p: Preset) => {
    setPreset(p);
    setShowCustom(p === 'custom');
    if (p !== 'custom') setDropdownOpen(false);
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      setDropdownOpen(false);
      fetchLogs();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getActionIcon = (action: string) => {
    if (action === 'both') return <Zap className="w-3.5 h-3.5 text-amber-500" />;
    if (action?.includes('dm') || action?.includes('DM')) return <Send className="w-3.5 h-3.5 text-purple-500" />;
    if (action?.includes('comment')) return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
  };

  const getActionLabel = (action: string) => {
    if (action === 'both') return 'Comment + DM';
    if (action === 'comment') return 'Comment Reply';
    if (action === 'dm') return 'DM Sent';
    return action || '—';
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" /> Automation Logs
          </h1>
          <p className="text-slate-500 mt-1">Track every triggered automation in real time.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-primary/40 transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4 text-primary" />
              {PRESET_LABELS[preset]}
              {preset === 'custom' && customFrom && customTo && (
                <span className="text-xs text-slate-400 font-normal">
                  ({customFrom} → {customTo})
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                >
                  <div className="p-2">
                    {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePreset(p)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          preset === p
                            ? 'bg-primary text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {PRESET_LABELS[p]}
                        {preset === p && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>

                  {/* Custom date inputs */}
                  <AnimatePresence>
                    {showCustom && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 p-4 space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">From</label>
                          <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">To</label>
                          <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <button
                          onClick={applyCustom}
                          disabled={!customFrom || !customTo}
                          className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-sm disabled:opacity-50 hover:bg-primary-hover transition-colors"
                        >
                          Apply Filter
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Triggers', value: totalHits, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Successful', value: successCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Unique Users', value: uniqueUsers, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Success Rate', value: `${successRate}%`, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
          >
            <div className={`${stat.bg} p-3 rounded-xl`}>
              <stat.icon className={`${stat.color} w-5 h-5`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
              <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">
              {logs.length} log{logs.length !== 1 ? 's' : ''} — {PRESET_LABELS[preset]}
            </span>
          </div>
          {isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400 animate-pulse text-sm">
            Fetching logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <Clock className="w-10 h-10 text-slate-200" />
            <p className="text-sm font-semibold text-slate-700">No logs in this period</p>
            <p className="text-xs text-slate-400">Automations triggered in this date range will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-slate-50/50">
              {['User', 'Action', 'Status', 'Time', ''].map((h) => (
                <span key={h} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{h}</span>
              ))}
            </div>

            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="px-6 py-4 hover:bg-slate-50/40 transition-colors"
              >
                {/* Mobile layout */}
                <div className="md:hidden flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      @{log.sender_handle || 'unknown'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      log.status === 'processed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {getActionIcon(log.action_taken)}
                    <span>{getActionLabel(log.action_taken)}</span>
                    <span>·</span>
                    <span>{formatTime(log.created_at)}</span>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-center">
                  {/* User */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-extrabold text-slate-500 uppercase shrink-0">
                      {(log.sender_handle || '?')[0]}
                    </div>
                    <span className="font-bold text-slate-900 text-sm truncate">
                      @{log.sender_handle || 'unknown'}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-2">
                    {getActionIcon(log.action_taken)}
                    <span className="text-sm text-slate-600 font-medium">{getActionLabel(log.action_taken)}</span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      log.status === 'processed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : log.status === 'received'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {log.status === 'processed'
                        ? <CheckCircle2 className="w-3 h-3" />
                        : <AlertCircle className="w-3 h-3" />}
                      {log.status}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(log.created_at)}
                  </div>

                  {/* Post ID (truncated) */}
                  <div className="text-[10px] text-slate-300 font-mono truncate max-w-[80px]" title={log.instagram_post_id}>
                    {log.instagram_post_id?.slice(-8)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
