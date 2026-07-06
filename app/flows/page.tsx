'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  ChevronRight,
  MessageSquare,
  Send,
  Zap,
  X
} from 'lucide-react';
import { Card, Button } from '@/components/ui/core';

import { createFlow, getFlows, toggleFlowActive, deleteFlow, updateFlow } from '@/app/actions/flows';

export default function FlowsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [newFlow, setNewFlow] = useState({ name: '', keyword: '', comment: '', dm: '' });
  const [flows, setFlows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch flows on load
  useEffect(() => {
    async function loadFlows() {
      const data = await getFlows();
      setFlows(data);
      setIsLoading(false);
    }
    loadFlows();
  }, []);

  const handleEdit = (flow: any) => {
    setNewFlow({
      name: flow.name,
      keyword: flow.trigger_keyword,
      comment: flow.response_comment,
      dm: flow.response_dm
    });
    setEditingFlowId(flow.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!newFlow.name || !newFlow.keyword) return;
    
    let result;
    if (editingFlowId) {
      result = await updateFlow(editingFlowId, newFlow);
    } else {
      result = await createFlow(newFlow);
    }

    if (result.success) {
      const updatedFlows = await getFlows();
      setFlows(updatedFlows);
      closeModal();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFlowId(null);
    setNewFlow({ name: '', keyword: '', comment: '', dm: '' });
  };

  const handleToggle = async (id: string, active: boolean) => {
    const result = await toggleFlowActive(id, active);
    if (result.success) {
      setFlows(flows.map(f => f.id === id ? { ...f, is_active: !active } : f));
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteFlow(id);
    if (result.success) {
      setFlows(flows.filter(f => f.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Automation Flows</h1>
          <p className="text-slate-500 mt-1">Create and manage your auto-response triggers.</p>
        </div>
        <Button 
          className="flex items-center gap-2 px-6"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-5 h-5" /> Create New Flow
        </Button>
      </div>

      {/* Flow Modal (New or Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {editingFlowId ? 'Edit Automation Flow' : 'New Automation Flow'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Flow Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Summer Sale Promo"
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={newFlow.name}
                  onChange={(e) => setNewFlow({...newFlow, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Trigger Keyword</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-3.5 w-4 h-4 text-amber-500" />
                  <input 
                    type="text" 
                    placeholder="e.g. INFO"
                    className="w-full p-3 pl-10 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={newFlow.keyword}
                    onChange={(e) => setNewFlow({...newFlow, keyword: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Public Comment Reply</label>
                  <textarea 
                    placeholder="Check your DM!"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all h-24 resize-none"
                    value={newFlow.comment}
                    onChange={(e) => setNewFlow({...newFlow, comment: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Private DM Response</label>
                  <textarea 
                    placeholder="Hey! Here is the info..."
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all h-24 resize-none"
                    value={newFlow.dm}
                    onChange={(e) => setNewFlow({...newFlow, dm: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <Button 
                className="flex-grow py-3"
                onClick={handleSave}
              >
                {editingFlowId ? 'Update Automation' : 'Save Automation'}
              </Button>
              <button 
                onClick={closeModal}
                className="px-6 py-3 font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="space-y-6">
        {flows.map((flow) => (
          <motion.div
            key={flow.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="hover:border-primary/20 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{flow.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      flow.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {flow.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Keyword: <b>"{flow.trigger_keyword}"</b></span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span className="truncate">Reply: "{flow.response_comment}"</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                      <Send className="w-4 h-4 text-purple-500" />
                      <span className="truncate">DM: "{flow.response_dm}"</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                  <button 
                    onClick={() => handleToggle(flow.id, flow.is_active)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {flow.is_active ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 text-emerald-500" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(flow.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleEdit(flow)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State Illustration Placeholder */}
      {flows.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-slate-200" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No flows created yet</h3>
          <p className="text-slate-500 mb-6">Create your first automation to start saving time.</p>
          <Button className="px-8" onClick={() => setIsModalOpen(true)}>Get Started</Button>
        </div>
      )}
    </div>
  );
}
