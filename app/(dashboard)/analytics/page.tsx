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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Filter,
  ExternalLink
} from 'lucide-react';
import { getAnalyticsLogs } from '@/app/actions/logs';
import { Preset, PRESET_LABELS, getDateRange } from '@/lib/dates';


export default function AnalyticsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { from, to } = getDateRange(preset, customFrom, customTo);
      const res = await getAnalyticsLogs({ from, to, page, pageSize });

      if (res && !res.error && Array.isArray(res.data)) {
        setLogs(res.data);
        if (typeof res.count === 'number') setTotalCount(res.count);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching logs in analytics:', err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [preset, customFrom, customTo, page]);

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
    if (action === 'comment_only' || action === 'comment') return 'Comment Reply';
    if (action === 'dm_only' || action === 'dm') return 'DM Sent';
    if (action === 'customer_replied') return 'Customer Replied';
    if (action === 'ai_comment_reply') return 'AI Comment Reply';
    if (action === 'followup_sent') return '24h Follow-up DM';
    if (action === 'DIRECT_SHARE_PENDING_20M') return 'Reel Share Prompt (Pending 20m)';
    if (action === 'DIRECT_SHARE_COMPLETED_20M') return '20m Direct Price DM Sent';
    if (action === 'DIRECT_SHARE_COMMENTED_CANCELLED') return 'Reel Share (User Commented)';
    return action || '—';
  };

  const getDMPreview = (log: any) => {
    const flow = log.automation_flows;
    if (!flow || !flow.response_dm) return null;
    let text = flow.response_dm;
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        text = parsed.text || text;
      } catch (e) {}
    }
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
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
                onClick={() => setSelectedLog(log)}
                className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                {/* Mobile layout */}
                <div className="md:hidden flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {log.sender_handle?.match(/^\d+$/) ? `ID: ${log.sender_handle}` : `@${log.sender_handle || 'unknown'}`}
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
                        {log.sender_handle?.match(/^\d+$/) ? `ID: ${log.sender_handle}` : `@${log.sender_handle || 'unknown'}`}
                      </span>
                  </div>

                  {/* Action */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action_taken)}
                      <span className="text-sm text-slate-600 font-medium">{getActionLabel(log.action_taken)}</span>
                    </div>
                    {getDMPreview(log) && (
                      <span className="text-[11px] text-slate-400 font-normal truncate max-w-xs mt-0.5" title={getDMPreview(log)!}>
                        💬 "{getDMPreview(log)}"
                      </span>
                    )}
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

        {/* Pagination Bar */}
        {totalCount > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalCount}</span> logs
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-xs font-bold text-slate-600 px-2">
                Page {page} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => (p * pageSize < totalCount ? p + 1 : p))}
                disabled={page * pageSize >= totalCount}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Popup Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Automation Trigger Details</h3>
                    <p className="text-xs text-slate-400">Triggered for @{selectedLog.sender_handle || 'user'} • {formatTime(selectedLog.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">USER</span>
                    <span className="font-bold text-slate-900 text-sm">@{selectedLog.sender_handle || 'unknown'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ACTION PERFORMED</span>
                    <span className="font-bold text-slate-900 text-sm">{getActionLabel(selectedLog.action_taken)}</span>
                  </div>
                </div>

                {/* Target Post / Reel Link */}
                {(() => {
                  let postUrl = null;
                  const rawPostId = selectedLog.instagram_post_id;
                  const flowPostId = selectedLog.automation_flows?.post_id;

                  if (rawPostId) {
                    if (rawPostId.startsWith('http://') || rawPostId.startsWith('https://')) {
                      postUrl = rawPostId;
                    } else if (flowPostId && (flowPostId.startsWith('http://') || flowPostId.startsWith('https://'))) {
                      postUrl = flowPostId;
                    } else {
                      postUrl = `https://www.instagram.com/p/${rawPostId}/`;
                    }
                  } else if (flowPostId && (flowPostId.startsWith('http://') || flowPostId.startsWith('https://'))) {
                    postUrl = flowPostId;
                  }

                  if (!postUrl) return null;

                  return (
                    <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-pink-50/80 via-purple-50/50 to-blue-50/80 border border-pink-100 rounded-2xl text-xs shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-600 shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-pink-600 uppercase tracking-wider block">TRIGGER POST / REEL LINK</span>
                          <p className="font-semibold text-slate-700 truncate max-w-[220px] sm:max-w-[280px] text-xs">
                            {postUrl}
                          </p>
                        </div>
                      </div>
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-white border border-pink-200 text-pink-600 font-extrabold text-xs rounded-xl hover:bg-pink-600 hover:text-white transition-all shadow-sm shrink-0 flex items-center gap-1"
                      >
                        View Post ↗
                      </a>
                    </div>
                  );
                })()}

                {/* Comment Reply Sent Section */}
                {selectedLog.automation_flows?.response_comment && (
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-500" /> Public Comment Reply Sent
                    </span>
                    <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-slate-800 text-sm font-medium leading-relaxed">
                      "{selectedLog.automation_flows.response_comment.split('|||')[0].trim()}"
                    </div>
                  </div>
                )}

                {/* Direct Message (DM) Sent Section */}
                {(() => {
                  const flow = selectedLog.automation_flows;
                  if (!flow || !flow.response_dm) return null;
                  let dmText = flow.response_dm;
                  let followUpText = null;
                  if (dmText.startsWith('{') || dmText.startsWith('[')) {
                    try {
                      const parsed = JSON.parse(dmText);
                      dmText = parsed.text || dmText;
                      if (parsed.followUpText) followUpText = parsed.followUpText;
                    } catch (e) {}
                  }

                  return (
                    <>
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-purple-500" /> Direct Message (DM) Sent to Inbox
                        </span>
                        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl text-slate-800 text-sm font-medium whitespace-pre-wrap leading-relaxed">
                          {dmText}
                        </div>
                      </div>

                      {followUpText && (
                        <div className="space-y-2">
                          <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500" /> Scheduled 24h Follow-up DM
                          </span>
                          <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl text-slate-800 text-xs italic leading-relaxed">
                            "{followUpText}"
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-hover transition-colors shadow-lg shadow-blue-500/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
