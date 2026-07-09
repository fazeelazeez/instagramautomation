'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  ChevronRight,
  MessageSquare,
  Send,
  Zap,
  X,
  Check,
  Instagram,
  FileText,
  UserCheck,
  Clock,
  ArrowRight,
  Link as LinkIcon,
  Activity,
  AlertCircle,
  ChevronDown,
  Globe,
  Sparkles,
  Image as ImageIcon,
  LayoutGrid,
  Bell,
  Loader2
} from 'lucide-react';
import { Card, Button } from '@/components/ui/core';

import { createFlow, getFlows, toggleFlowActive, deleteFlow } from '@/app/actions/flows';

// Helper to safely parse JSON names
function parseFlowName(rawName: string) {
  try {
    const parsed = JSON.parse(rawName);
    if (parsed && typeof parsed === 'object' && parsed.flowGroupId) {
      return {
        flowGroupId: parsed.flowGroupId,
        name: parsed.name || 'Untitled Automation',
        scope: parsed.scope || 'all',
        postId: parsed.postId || null
      };
    }
  } catch (e) {}
  return {
    flowGroupId: rawName,
    name: rawName || 'Untitled Automation',
    scope: 'all',
    postId: null
  };
}

// Group flows by flowGroupId
function groupFlows(rawFlows: any[]) {
  const groups: { [key: string]: any } = {};

  rawFlows.forEach(flow => {
    const meta = parseFlowName(flow.name);
    const groupId = meta.flowGroupId;

    if (!groups[groupId]) {
      let dmText = flow.response_dm || '';
      let greetingFormat = 'quick_reply';
      let quickReplyLabel = 'Show me more';
      let requireFollow = false;
      let followUp = false;
      let followUpText = '';

      if (flow.response_dm && (flow.response_dm.startsWith('{') || flow.response_dm.startsWith('['))) {
        try {
          const parsedDM = JSON.parse(flow.response_dm);
          dmText = parsedDM.text || '';
          greetingFormat = parsedDM.greetingFormat || 'quick_reply';
          quickReplyLabel = parsedDM.quickReplyLabel || 'Show me more';
          requireFollow = !!parsedDM.requireFollow;
          followUp = !!parsedDM.followUp;
          followUpText = parsedDM.followUpText || '';
        } catch (e) {}
      }

      const templates = flow.response_comment 
        ? flow.response_comment.split('|||').map((t: string) => t.trim()).filter(Boolean)
        : [];

      groups[groupId] = {
        flowGroupId: groupId,
        name: meta.name,
        scope: meta.scope,
        postId: meta.postId,
        is_active: flow.is_active,
        commentTemplates: templates,
        dmText,
        greetingFormat,
        quickReplyLabel,
        requireFollow,
        followUp,
        followUpText,
        keywords: [],
        dbFlows: []
      };
    }

    groups[groupId].keywords.push(flow.trigger_keyword);
    groups[groupId].dbFlows.push(flow);
    if (flow.is_active) {
      groups[groupId].is_active = true;
    }
  });

  return Object.values(groups);
}

// Scope config
const SCOPE_OPTIONS = [
  { 
    value: 'all', 
    label: 'All Posts', 
    description: 'Applies to all existing & future posts',
    icon: Globe,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    badge: 'bg-purple-100 text-purple-700',
  },
  { 
    value: 'next', 
    label: 'Upcoming New Post',
    description: 'Activates only for your very next post',
    icon: Sparkles,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  { 
    value: 'single', 
    label: 'Single Post',
    description: 'Targets one specific post via link',
    icon: ImageIcon,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-700',
  },
];

function getScopeConfig(scope: string) {
  return SCOPE_OPTIONS.find(s => s.value === scope) || SCOPE_OPTIONS[0];
}

export default function FlowsPage() {
  const [flowGroups, setFlowGroups] = useState<any[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedScope, setSelectedScope] = useState<'all' | 'next' | 'single'>('all');
  const [instagramLink, setInstagramLink] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');
  const [matchType, setMatchType] = useState<'specific' | 'any'>('specific');
  const [keywordInput, setKeywordInput] = useState('');
  const [enableCommentReply, setEnableCommentReply] = useState(true);
  const [commentTemplates, setCommentTemplates] = useState<string[]>(['Check your DMs! 📬']);
  const [newTemplateInput, setNewTemplateInput] = useState('');
  const [replyEveryTime, setReplyEveryTime] = useState(false);
  const [ignoreOwnComments, setIgnoreOwnComments] = useState(true);

  const [enableDM, setEnableDM] = useState(true);
  const [greetingFormat, setGreetingFormat] = useState<'card' | 'quick_reply'>('quick_reply');
  const [dmText, setDMText] = useState("Hey! Thanks for being part of my community 😊\n\nClick below and I'll send you the details in just a sec ✨");
  const [quickReplyLabel, setQuickReplyLabel] = useState('Show me more');
  const [requireFollow, setRequireFollow] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState("Hey, just checking in to see if you got a chance to check the link? Let me know if you have any questions! 💬");

  const [successModal, setSuccessModal] = useState({ show: false, title: '', message: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'active' | 'paused' }>({ show: false, message: '', type: 'active' });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadData() {
      const rawFlows = await getFlows();
      setFlowGroups(groupFlows(rawFlows));
      setIsLoadingFlows(false);
    }
    loadData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startNewFlow = (scope: 'all' | 'next' | 'single' = 'all') => {
    setSelectedScope(scope);
    setInstagramLink('');
    setFlowName('');
    setMatchType('specific');
    setKeywordInput('');
    setEnableCommentReply(true);
    setCommentTemplates(['Check your DMs! 📬']);
    setReplyEveryTime(false);
    setIgnoreOwnComments(true);
    setEnableDM(true);
    setGreetingFormat('quick_reply');
    setDMText("Hey! Thanks for being part of my community 😊\n\nClick below and I'll send you the details in just a sec ✨");
    setQuickReplyLabel('Show me more');
    setRequireFollow(false);
    setFollowUp(false);
    setFollowUpText("Hey, just checking in to see if you got a chance to check the link? Let me know if you have any questions! 💬");
    setEditingGroupId(null);
    setWizardStep(1);
    setIsWizardOpen(true);
    setDropdownOpen(false);
  };

  const startEditFlow = (group: any) => {
    setEditingGroupId(group.flowGroupId);
    setSelectedScope(group.scope);
    setInstagramLink(group.postId || '');
    setFlowName(group.name);
    const isAnyWord = group.keywords.includes('*') || group.keywords.includes('ANY_WORD');
    setMatchType(isAnyWord ? 'any' : 'specific');
    setKeywordInput(isAnyWord ? '' : group.keywords.join(', '));
    setEnableCommentReply(group.commentTemplates.length > 0);
    setCommentTemplates(group.commentTemplates.length > 0 ? group.commentTemplates : ['Check your DMs! 📬']);
    setReplyEveryTime(false);
    setIgnoreOwnComments(true);
    setEnableDM(!!group.dmText);
    setGreetingFormat(group.greetingFormat || 'quick_reply');
    setDMText(group.dmText || '');
    setQuickReplyLabel(group.quickReplyLabel || 'Show me more');
    setRequireFollow(group.requireFollow || false);
    setFollowUp(group.followUp || false);
    setFollowUpText(group.followUpText || "Hey, just checking in to see if you got a chance to check the link? Let me know if you have any questions! 💬");
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setEditingGroupId(null);
  };

  const handleSaveFlow = async () => {
    const resolvedFlowGroupId = editingGroupId || crypto.randomUUID();
    const scopeLabel = selectedScope === 'all' ? 'All Posts' : selectedScope === 'next' ? 'Next Post' : 'Single Post';
    const finalName = flowName.trim() || `${scopeLabel} - ${matchType === 'any' ? 'Any Comment' : keywordInput}`;

    let keywords: string[] = ['*'];
    if (matchType === 'specific' && keywordInput.trim()) {
      keywords = keywordInput.split(',').map(k => k.trim().toUpperCase()).filter(Boolean);
    }
    if (keywords.length === 0) keywords = ['*'];

    const nameMeta = JSON.stringify({
      flowGroupId: resolvedFlowGroupId,
      name: finalName,
      scope: selectedScope,
      postId: selectedScope === 'single' ? instagramLink.trim() : null
    });

    const joinedComments = enableCommentReply ? commentTemplates.join('|||') : '';
    const dmConfig = JSON.stringify({
      text: dmText,
      greetingFormat,
      quickReplyLabel,
      requireFollow,
      followUp,
      followUpText: followUp ? followUpText : ''
    });

    if (editingGroupId) {
      const groupToDelete = flowGroups.find(g => g.flowGroupId === editingGroupId);
      if (groupToDelete && groupToDelete.dbFlows) {
        for (const f of groupToDelete.dbFlows) {
          await deleteFlow(f.id);
        }
      }
    }

    let firstResult: any = null;
    for (const keyword of keywords) {
      const result = await createFlow({ name: nameMeta, keyword, comment: joinedComments, dm: dmConfig });
      if (!firstResult) firstResult = result;
    }

    if (firstResult && firstResult.success) {
      const rawFlows = await getFlows();
      setFlowGroups(groupFlows(rawFlows));
      closeWizard();
      setSuccessModal({
        show: true,
        title: editingGroupId ? 'Automation Updated!' : 'Automation Created!',
        message: editingGroupId
          ? `Your changes to "${finalName}" have been saved.`
          : `"${finalName}" is now active and monitoring comments.`
      });
    } else {
      alert('Failed to save automation flow.');
    }
  };

  const showToast = (message: string, type: 'active' | 'paused') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const handleToggleGroup = async (group: any) => {
    setTogglingGroupId(group.flowGroupId);
    try {
      const nextStatus = !group.is_active;
      for (const dbFlow of group.dbFlows) {
        await toggleFlowActive(dbFlow.id, !nextStatus);
      }
      setFlowGroups(flowGroups.map(g =>
        g.flowGroupId === group.flowGroupId ? { ...g, is_active: nextStatus } : g
      ));
      showToast(
        nextStatus ? `"${group.name}" is now live` : `"${group.name}" paused`,
        nextStatus ? 'active' : 'paused'
      );
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingGroupId(null);
    }
  };

  const triggerDeleteGroup = (groupId: string) => setDeleteConfirmId(groupId);

  const handleDeleteGroup = async () => {
    if (!deleteConfirmId) return;
    const groupToDelete = flowGroups.find(g => g.flowGroupId === deleteConfirmId);
    if (groupToDelete && groupToDelete.dbFlows) {
      for (const dbFlow of groupToDelete.dbFlows) {
        await deleteFlow(dbFlow.id);
      }
    }
    setFlowGroups(flowGroups.filter(g => g.flowGroupId !== deleteConfirmId));
    setDeleteConfirmId(null);
    setSuccessModal({ show: true, title: 'Automation Deleted', message: 'All connected keyword rules have been stopped.' });
  };

  const handleQuickAddKeyword = (word: string) => {
    if (!keywordInput.trim()) {
      setKeywordInput(word);
    } else {
      const existing = keywordInput.split(',').map(s => s.trim());
      if (!existing.includes(word)) setKeywordInput([...existing, word].join(', '));
    }
  };

  const handleQuickAddTemplate = (text: string) => {
    if (!commentTemplates.includes(text)) setCommentTemplates([...commentTemplates, text]);
  };

  const handleAddCustomTemplate = () => {
    if (newTemplateInput.trim()) {
      setCommentTemplates([...commentTemplates, newTemplateInput.trim()]);
      setNewTemplateInput('');
    }
  };

  const handleRemoveTemplate = (idx: number) => {
    if (commentTemplates.length > 1) setCommentTemplates(commentTemplates.filter((_, i) => i !== idx));
  };

  // Group flows by scope for sectioned display
  const allPostsFlows = flowGroups.filter(g => g.scope === 'all');
  const upcomingFlows = flowGroups.filter(g => g.scope === 'next');
  const singlePostFlows = flowGroups.filter(g => g.scope === 'single');

  const selectedScopeConfig = getScopeConfig(selectedScope);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full min-h-screen">

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md"
            style={{
              background: toast.type === 'active'
                ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderColor: toast.type === 'active' ? '#86efac' : '#e2e8f0',
            }}
          >
            {toast.type === 'active' ? (
              <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <Play className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            ) : (
              <div className="w-7 h-7 bg-slate-400 rounded-full flex items-center justify-center shrink-0">
                <Pause className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            )}
            <div>
              <p className={`text-xs font-extrabold uppercase tracking-wider ${toast.type === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                {toast.type === 'active' ? 'Flow Activated' : 'Flow Paused'}
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(t => ({ ...t, show: false }))}
              className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" /> Automation Flows
          </h1>
          <p className="text-slate-500 mt-1">Automate comment replies and DMs based on keywords and post targeting.</p>
        </div>

        {/* Create Flow button with dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
          >
            <Plus className="w-5 h-5" /> Create Flow
            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100/80 overflow-hidden z-50"
              >
                <div className="p-3 border-b border-slate-50">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2">Select Flow Type</p>
                </div>
                {SCOPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => startNewFlow(opt.value as any)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left group"
                    >
                      <div className={`w-9 h-9 ${opt.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${opt.color}`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{opt.label}</p>
                        <p className="text-[11px] text-slate-400">{opt.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sectioned Flow Lists */}
      {isLoadingFlows ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-premium animate-pulse text-slate-400">
          Loading automation flows...
        </div>
      ) : flowGroups.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-premium flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No automations yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mt-1 mb-6">Create your first automation to start auto-replying to Instagram comments.</p>
          <button
            onClick={() => setDropdownOpen(true)}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-hover transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Flow
          </button>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── All Posts Section ── */}
          <FlowSection
            title="All Posts"
            description="Applies to every post on your account"
            icon={Globe}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            flows={allPostsFlows}
            onEdit={startEditFlow}
            onToggle={handleToggleGroup}
            onDelete={triggerDeleteGroup}
            emptyLabel="No all-post automations"
            onAdd={() => startNewFlow('all')}
            togglingGroupId={togglingGroupId}
          />

          {/* ── Upcoming New Post Section ── */}
          <FlowSection
            title="Upcoming New Post"
            description="Activates only for your next published post"
            icon={Sparkles}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            flows={upcomingFlows}
            onEdit={startEditFlow}
            onToggle={handleToggleGroup}
            onDelete={triggerDeleteGroup}
            emptyLabel="No upcoming post automations"
            onAdd={() => startNewFlow('next')}
            togglingGroupId={togglingGroupId}
          />

          {/* ── Single Post Section ── */}
          <FlowSection
            title="Single Post"
            description="Targeted to one specific Instagram post"
            icon={ImageIcon}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            flows={singlePostFlows}
            onEdit={startEditFlow}
            onToggle={handleToggleGroup}
            onDelete={triggerDeleteGroup}
            emptyLabel="No single-post automations"
            onAdd={() => startNewFlow('single')}
            showPostLink
            togglingGroupId={togglingGroupId}
          />

        </div>
      )}

      {/* ══════════════════════════════════════
          4-Step Wizard Modal
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100/50 flex flex-col max-h-[90vh]"
            >
              {/* Wizard Header */}
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-8 h-8 ${selectedScopeConfig.bg} rounded-xl flex items-center justify-center`}>
                      <selectedScopeConfig.icon className={`w-4 h-4 ${selectedScopeConfig.color}`} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {editingGroupId ? 'Edit Automation' : 'Create Automation Flow'}
                    </h2>
                  </div>
                  <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">
                    {wizardStep === 1 && 'STEP 1 — TRIGGER TYPE'}
                    {wizardStep === 2 && 'STEP 2 — MATCHING & REPLIES'}
                    {wizardStep === 3 && 'STEP 3 — RESPONSE CONFIG'}
                    {wizardStep === 4 && 'STEP 4 — REVIEW & SAVE'}
                  </p>
                </div>
                <button onClick={closeWizard} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="px-8 pt-4 pb-2 flex gap-2">
                {[1, 2, 3, 4].map(step => (
                  <div
                    key={step}
                    className={`h-1.5 flex-grow rounded-full transition-all duration-300 ${step <= wizardStep ? 'bg-primary' : 'bg-slate-100'}`}
                  />
                ))}
              </div>

              {/* Wizard Body */}
              <div className="p-8 overflow-y-auto flex-grow space-y-6">

                {/* ── STEP 1: SELECT TRIGGER TYPE ── */}
                {wizardStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 mb-1">Select flow type</h3>
                      <p className="text-sm text-slate-400">Choose which Instagram posts this automation will trigger on.</p>
                    </div>

                    <div className="space-y-3">
                      {SCOPE_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isSelected = selectedScope === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSelectedScope(opt.value as any);
                              if (opt.value !== 'single') setInstagramLink('');
                            }}
                            className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                              isSelected
                                ? `border-primary bg-blue-50/20`
                                : 'border-slate-100 hover:border-slate-200 bg-white'
                            }`}
                          >
                            <div className={`w-11 h-11 ${opt.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                              <Icon className={`w-5 h-5 ${opt.color}`} />
                            </div>
                            <div className="flex-grow">
                              <p className="font-bold text-slate-900">{opt.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* URL input for Single Post */}
                    <AnimatePresence>
                      {selectedScope === 'single' && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-2 pt-2"
                        >
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Instagram Post Link</label>
                          <div className="relative">
                            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                            <input
                              type="text"
                              placeholder="e.g. https://www.instagram.com/p/C-xyz..."
                              className="w-full p-4 pl-11 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 text-sm font-semibold"
                              value={instagramLink}
                              onChange={(e) => setInstagramLink(e.target.value)}
                            />
                          </div>
                          <p className="text-[10px] font-medium text-slate-400">Paste the URL of the specific Instagram post you want to automate.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── STEP 2: KEYWORDS & COMMENT REPLIES ── */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 mb-1">When someone comments...</h3>
                      <p className="text-sm text-slate-400">Set matching keywords and public comment replies.</p>
                    </div>

                    {/* Keyword Options */}
                    <div className="space-y-3">
                      {/* Specific words */}
                      <div
                        onClick={() => setMatchType('specific')}
                        className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-start gap-4 ${
                          matchType === 'specific' ? 'border-primary bg-blue-50/10' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${matchType === 'specific' ? 'border-primary' : 'border-slate-300'}`}>
                          {matchType === 'specific' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                        <div className="flex-grow space-y-4">
                          <h4 className="font-bold text-slate-950">A specific word or words</h4>
                          {matchType === 'specific' && (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Enter a word or multiple..."
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 text-sm font-semibold"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                              />
                              <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">USE COMMAS TO SEPARATE WORDS</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {['Price', 'Link', 'Shop', 'Info'].map(word => (
                                  <button
                                    key={word}
                                    type="button"
                                    onClick={() => handleQuickAddKeyword(word)}
                                    className="px-4 py-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all"
                                  >
                                    + {word}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Any word */}
                      <div
                        onClick={() => setMatchType('any')}
                        className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                          matchType === 'any' ? 'border-primary bg-blue-50/10' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${matchType === 'any' ? 'border-primary' : 'border-slate-300'}`}>
                          {matchType === 'any' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                        <h4 className="font-bold text-slate-950">Any word</h4>
                      </div>
                    </div>

                    {/* Public Comment Reply toggle */}
                    <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Public reply to comments</h4>
                            <p className="text-slate-400 text-xs">Randomly picks from your templates</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnableCommentReply(!enableCommentReply)}
                          className={`w-12 h-6 rounded-full transition-colors relative outline-none ${enableCommentReply ? 'bg-primary' : 'bg-slate-200'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${enableCommentReply ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>

                      {enableCommentReply && (
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">REPLY TEMPLATES ({commentTemplates.length})</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-full">Random pick per reply</span>
                          </div>

                          <div className="space-y-2">
                            {commentTemplates.map((template, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-extrabold">{idx + 1}</span>
                                  {template}
                                </span>
                                {commentTemplates.length > 1 && (
                                  <button onClick={() => handleRemoveTemplate(idx)} className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type a reply template..."
                              className="flex-grow p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-slate-700 text-xs focus:ring-2 focus:ring-primary/20"
                              value={newTemplateInput}
                              onChange={(e) => setNewTemplateInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTemplate()}
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomTemplate}
                              className="bg-primary/10 hover:bg-primary/20 text-primary font-bold px-4 rounded-xl text-xs transition-colors shrink-0"
                            >
                              + Add
                            </button>
                          </div>

                          <div className="space-y-2 pt-2">
                            <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">QUICK ADD</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                'Just sent you a message! ✉️',
                                'Sent! Check your inbox 🔥',
                                'DM sent! Go check it out ✨',
                                "You've got mail! 📩"
                              ].map(txt => (
                                <button
                                  key={txt}
                                  type="button"
                                  onClick={() => handleQuickAddTemplate(txt)}
                                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 rounded-full text-xs font-bold transition-all"
                                >
                                  + {txt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── STEP 3: DM RESPONSE & FOLLOW-UP ── */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 mb-1">Response configuration</h3>
                      <p className="text-sm text-slate-400">Configure private DMs, access gates, and follow-ups.</p>
                    </div>

                    {/* DM toggle */}
                    <div className="p-5 border border-slate-100 rounded-2xl space-y-5 bg-slate-50/30">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Send className="w-5 h-5 text-primary" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">Private DM Response</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnableDM(!enableDM)}
                          className={`w-12 h-6 rounded-full transition-colors relative outline-none ${enableDM ? 'bg-primary' : 'bg-slate-200'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${enableDM ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>

                      {enableDM && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          {/* Greeting format */}
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">GREETING FORMAT</span>
                            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 w-fit">
                              {[
                                { val: 'card', icon: FileText, label: 'Card' },
                                { val: 'quick_reply', icon: MessageSquare, label: 'Quick Reply' }
                              ].map(({ val, icon: Icon, label }) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setGreetingFormat(val as any)}
                                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    greetingFormat === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" /> {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <textarea
                            placeholder="Write your automated message here..."
                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 text-sm h-32 resize-none"
                            value={dmText}
                            onChange={(e) => setDMText(e.target.value.substring(0, 640))}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CHARACTER COUNT</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{dmText.length}/640</span>
                          </div>

                          {greetingFormat === 'quick_reply' && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">QUICK REPLY LABEL</span>
                              <input
                                type="text"
                                maxLength={20}
                                placeholder="Show me more"
                                className="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none text-slate-700 text-sm text-center font-bold text-primary max-w-md focus:ring-2 focus:ring-primary/20"
                                value={quickReplyLabel}
                                onChange={(e) => setQuickReplyLabel(e.target.value)}
                              />
                              <p className="text-[10px] font-medium text-slate-400">Max 20 characters.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Require Follow */}
                    <div className="flex justify-between items-center p-5 border border-slate-100 rounded-2xl bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                          <Instagram className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">Require Follow First</h4>
                          <p className="text-slate-400 text-xs">Users must follow to unlock content</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRequireFollow(!requireFollow)}
                        className={`w-12 h-6 rounded-full transition-colors relative outline-none ${requireFollow ? 'bg-primary' : 'bg-slate-200'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${requireFollow ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Follow-up after 24h */}
                    <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Bell className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Follow-up after 24h</h4>
                            <p className="text-slate-400 text-xs">Re-engage leads who didn't click</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFollowUp(!followUp)}
                          className={`w-12 h-6 rounded-full transition-colors relative outline-none ${followUp ? 'bg-primary' : 'bg-slate-200'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${followUp ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {followUp && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-4 border-t border-slate-50 space-y-2"
                          >
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Follow-up Message</label>
                            <textarea
                              placeholder="Type the follow-up message to send after 24 hours..."
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 text-sm h-24 resize-none"
                              value={followUpText}
                              onChange={(e) => setFollowUpText(e.target.value)}
                            />
                            <p className="text-[10px] font-medium text-slate-400">Sent if they don't click within 24 hours of the first DM.</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: REVIEW & SAVE ── */}
                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 mb-1">Review your automation</h3>
                      <p className="text-sm text-slate-400">Everything look good? Give it a name and save.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AUTOMATION NAME</label>
                        <input
                          type="text"
                          placeholder="e.g. Summer Promo Code"
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-slate-700 text-sm font-bold focus:ring-2 focus:ring-primary/20"
                          value={flowName}
                          onChange={(e) => setFlowName(e.target.value)}
                        />
                      </div>

                      <div className="p-5 border border-slate-100 rounded-2xl space-y-0 bg-slate-50/50 divide-y divide-slate-100">
                        <ReviewRow label="Flow Type">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${selectedScopeConfig.badge}`}>
                            {selectedScopeConfig.label}
                          </span>
                          {selectedScope === 'single' && instagramLink && (
                            <p className="text-[10px] text-blue-600 font-semibold mt-1 max-w-[250px] truncate">{instagramLink}</p>
                          )}
                        </ReviewRow>
                        <ReviewRow label="Trigger Keywords">
                          <span className="font-bold text-slate-800 text-xs">
                            {matchType === 'any' ? 'Any Word' : keywordInput.split(',').map(s => `"${s.trim()}"`).join(', ')}
                          </span>
                        </ReviewRow>
                        <ReviewRow label="Comment Replies">
                          <span className="font-bold text-slate-800 text-xs">
                            {enableCommentReply ? `${commentTemplates.length} template${commentTemplates.length > 1 ? 's' : ''} (random)` : 'Disabled'}
                          </span>
                        </ReviewRow>
                        <ReviewRow label="Private DM">
                          <span className="font-bold text-slate-800 text-xs">
                            {enableDM ? `Enabled — ${greetingFormat === 'quick_reply' ? 'Quick Reply' : 'Card'}` : 'Disabled'}
                          </span>
                        </ReviewRow>
                        {followUp && (
                          <ReviewRow label="24h Follow-up">
                            <span className="font-bold text-amber-600 text-xs">Active</span>
                            <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">"{followUpText}"</p>
                          </ReviewRow>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Footer */}
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-6 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl text-sm transition-all"
                  >
                    ← Back
                  </button>
                )}
                {wizardStep < 4 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1 && selectedScope === 'single' && !instagramLink.trim()) {
                        alert('Please enter your Instagram post link.');
                        return;
                      }
                      if (wizardStep === 2 && matchType === 'specific' && !keywordInput.trim()) {
                        alert('Please enter at least one keyword.');
                        return;
                      }
                      setWizardStep(wizardStep + 1);
                    }}
                    className="flex-grow py-3 bg-primary text-white hover:bg-primary-hover font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSaveFlow}
                    className="flex-grow py-3 bg-primary text-white hover:bg-primary-hover font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4" /> {editingGroupId ? 'Update Automation' : 'Save & Activate'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successModal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100/50 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100/50">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{successModal.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{successModal.message}</p>
              </div>
              <div className="p-4 bg-slate-50">
                <Button
                  onClick={() => setSuccessModal({ show: false, title: '', message: '' })}
                  className="w-full py-3 text-xs font-bold bg-primary text-white hover:bg-primary-hover rounded-xl shadow-md"
                >
                  Okay, great!
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100/50 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Automation?</h3>
                <p className="text-slate-500 text-xs leading-relaxed">This will permanently stop all keyword rules connected to this automation.</p>
              </div>
              <div className="flex border-t border-slate-100">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 p-4 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-100">
                  Cancel
                </button>
                <button onClick={handleDeleteGroup} className="flex-1 p-4 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sub-components ─── */

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-3 gap-4">
      <span className="font-medium text-slate-500 text-sm shrink-0">{label}:</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function FlowSection({
  title, description, icon: Icon, iconBg, iconColor,
  flows, onEdit, onToggle, onDelete, emptyLabel, onAdd, showPostLink, togglingGroupId
}: {
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  flows: any[];
  onEdit: (g: any) => void;
  onToggle: (g: any) => void;
  onDelete: (id: string) => void;
  emptyLabel: string;
  onAdd: () => void;
  showPostLink?: boolean;
  togglingGroupId: string | null;
}) {
  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          {flows.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
              {flows.length}
            </span>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors border border-blue-100/50"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Section Content */}
      {flows.length === 0 ? (
        <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl py-8 text-center">
          <p className="text-sm text-slate-400 font-medium">{emptyLabel}</p>
          <button
            onClick={onAdd}
            className="mt-2 text-xs text-primary font-bold hover:underline"
          >
            + Create one now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map(group => (
            <FlowCard
              key={group.flowGroupId}
              group={group}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
              showPostLink={showPostLink}
              isToggling={togglingGroupId === group.flowGroupId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FlowCard({ group, onEdit, onToggle, onDelete, showPostLink, isToggling }: {
  group: any;
  onEdit: (g: any) => void;
  onToggle: (g: any) => void;
  onDelete: (id: string) => void;
  showPostLink?: boolean;
  isToggling?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-grow space-y-3">
            {/* Name + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900">{group.name}</h3>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                group.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' : 'bg-slate-100 text-slate-500'
              }`}>
                {group.is_active ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Paused
                  </>
                )}
              </span>
            </div>

            {/* Post link for single */}
            {showPostLink && group.postId && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 w-fit max-w-full">
                <LinkIcon className="w-3 h-3 text-blue-500 shrink-0" />
                <a href={group.postId} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline truncate max-w-[300px]">
                  {group.postId}
                </a>
              </div>
            )}

            {/* Details row */}
            <div className="flex flex-wrap gap-3 text-xs">
              {/* Keywords */}
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100/50 rounded-full px-3 py-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="font-bold text-amber-800">
                  {group.keywords.includes('*') ? 'Any word' : group.keywords.join(', ')}
                </span>
              </div>

              {/* Comment templates */}
              {group.commentTemplates.length > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100/50 rounded-full px-3 py-1">
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                  <span className="font-bold text-blue-800">{group.commentTemplates.length} reply template{group.commentTemplates.length > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* DM */}
              {group.dmText && (
                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100/50 rounded-full px-3 py-1">
                  <Send className="w-3 h-3 text-purple-500" />
                  <span className="font-bold text-purple-800">DM: {group.greetingFormat === 'quick_reply' ? 'Quick Reply' : 'Card'}</span>
                </div>
              )}
            </div>

            {/* 24hr follow-up message preview */}
            {group.followUp && group.followUpText && (
              <div className="flex items-start gap-2.5 bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                <Bell className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block mb-0.5">24H FOLLOW-UP MESSAGE</span>
                  <p className="text-xs text-slate-600 italic line-clamp-2">"{group.followUpText}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <button
              onClick={() => onToggle(group)}
              disabled={isToggling}
              className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 border border-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[38px] min-h-[38px]"
              title={group.is_active ? 'Pause' : 'Activate'}
            >
              {isToggling ? (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              ) : group.is_active ? (
                <Pause className="w-4 h-4 text-slate-600" />
              ) : (
                <Play className="w-4 h-4 text-emerald-500" />
              )}
            </button>
            <button
              onClick={() => onEdit(group)}
              className="p-2.5 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-primary border border-slate-100 transition-colors"
              title="Edit"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(group.flowGroupId)}
              className="p-2.5 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 border border-slate-100 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
