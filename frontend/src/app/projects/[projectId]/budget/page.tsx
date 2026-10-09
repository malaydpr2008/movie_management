"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, BudgetSummary, BudgetAccountIn, LineItemIn, LineItemOut } from '@/lib/api';
import { useBudgetSummary } from '@/hooks/useBudgeting';
import { toast } from '@/stores/useToastStore';
import { DollarSign, Plus, ChevronDown, ChevronRight, Loader2, X, Pencil, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { id: 'ATL', label: 'ABOVE-THE-LINE (ATL)' },
  { id: 'BTL_PRODUCTION', label: 'BELOW-THE-LINE (PRODUCTION)' },
  { id: 'BTL_POST', label: 'BELOW-THE-LINE (POST)' },
  { id: 'OTHER', label: 'OTHER' },
];

export default function BudgetPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const queryClient = useQueryClient();
  const [activeAccount, setActiveAccount] = useState<{ id: string, name: string } | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ATL: true,
    BTL_PRODUCTION: true,
    BTL_POST: true,
    OTHER: true,
  });

  const { data: summary, isLoading } = useBudgetSummary(projectId);

  const toggleSection = (cat: string) => {
    setExpandedSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const calculateTotal = (type: 'estimated' | 'actual') => {
    if (!summary) return 0;
    return (
      summary.ATL[type] +
      summary.BTL_PRODUCTION[type] +
      summary.BTL_POST[type] +
      summary.OTHER[type]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-studio-950 text-white overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10 bg-studio-950 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-emerald-400">
            <DollarSign className="w-6 h-6" />
            Budget Top Sheet
          </h1>
          <p className="text-slate-400 text-sm">Financials, estimated budgets, and actual costs ledger.</p>
        </div>
        <button
          onClick={() => setIsAddAccountOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span>Loading ledger...</span>
          </div>
        ) : !summary ? (
          <div className="text-center text-slate-400 py-10">Failed to load budget summary.</div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Grand Total Header */}
            <div className="bg-studio-900 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-emerald-500/10">
              <div>
                <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Total Estimated Budget</h2>
                <div className="text-4xl font-black text-white">{formatCurrency(calculateTotal('estimated'))}</div>
              </div>
              <div className="text-right">
                <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Total Actual Costs</h2>
                <div className="text-4xl font-black text-emerald-400">{formatCurrency(calculateTotal('actual'))}</div>
              </div>
              <div className="text-right pl-8 border-l border-white/10">
                <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Variance</h2>
                <div className={`text-4xl font-black ${calculateTotal('estimated') - calculateTotal('actual') >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                  {formatCurrency(calculateTotal('estimated') - calculateTotal('actual'))}
                </div>
              </div>
            </div>

            <div className="bg-studio-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-studio-950 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1">Acct #</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-right">Est. Budget</div>
                <div className="col-span-2 text-right">Actual Cost</div>
                <div className="col-span-2 text-right">Variance</div>
              </div>

              <div className="divide-y divide-white/5">
                {CATEGORIES.map(category => {
                  const catAccounts = summary.accounts.filter(a => a.category === category.id).sort((a, b) => a.account_number.localeCompare(b.account_number));
                  if (catAccounts.length === 0) return null;
                  
                  const catEst = summary[category.id as keyof typeof summary] as { estimated: number, actual: number };
                  const isExpanded = expandedSections[category.id];

                  return (
                    <div key={category.id} className="bg-studio-900">
                      {/* Section Header */}
                      <button 
                        onClick={() => toggleSection(category.id)}
                        className="w-full grid grid-cols-12 gap-4 px-6 py-4 bg-studio-800/50 hover:bg-studio-800 transition-colors items-center text-left"
                      >
                        <div className="col-span-6 flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-emerald-500" /> : <ChevronRight className="w-5 h-5 text-emerald-500" />}
                          <span className="font-black tracking-widest text-emerald-400 text-sm">{category.label}</span>
                        </div>
                        <div className="col-span-2 text-right font-bold text-slate-300">{formatCurrency(catEst.estimated)}</div>
                        <div className="col-span-2 text-right font-bold text-emerald-400">{formatCurrency(catEst.actual)}</div>
                        <div className="col-span-2 text-right font-bold text-slate-400">{formatCurrency(catEst.estimated - catEst.actual)}</div>
                      </button>

                      {/* Section Rows */}
                      {isExpanded && (
                        <div className="divide-y divide-white/5 bg-studio-900/50">
                          {catAccounts.map(account => (
                            <button
                              key={account.id}
                              onClick={() => setActiveAccount({ id: account.id, name: `${account.account_number} - ${account.description}` })}
                              className="w-full grid grid-cols-12 gap-4 px-6 py-3 hover:bg-studio-800/80 transition-colors items-center text-left text-sm group"
                            >
                              <div className="col-span-1 font-mono text-slate-400">{account.account_number}</div>
                              <div className="col-span-5 font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">{account.description}</div>
                              <div className="col-span-2 text-right text-slate-400">{formatCurrency(account.estimated)}</div>
                              <div className="col-span-2 text-right text-slate-400">{formatCurrency(account.actual)}</div>
                              <div className={`col-span-2 text-right font-medium ${account.estimated - account.actual >= 0 ? 'text-slate-500' : 'text-rose-400'}`}>
                                {formatCurrency(account.estimated - account.actual)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {isAddAccountOpen && (
        <AddAccountModal
          projectId={projectId}
          onClose={() => setIsAddAccountOpen(false)}
        />
      )}

      {activeAccount && (
        <LineItemDrawer
          accountId={activeAccount.id}
          accountName={activeAccount.name}
          projectId={projectId}
          isOpen={Boolean(activeAccount)}
          onClose={() => setActiveAccount(null)}
        />
      )}
    </div>
  );
}

function AddAccountModal({ projectId, onClose }: { projectId: string, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<BudgetAccountIn>({
    account_number: '',
    category: 'ATL',
    description: ''
  });

  const createMutation = useMutation({
    mutationFn: (payload: BudgetAccountIn) => api.createBudgetAccount(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
      toast.success('Account Added', 'Budget account created.');
      onClose();
    },
    onError: (err: any) => toast.error('Error', err.message)
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-studio-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" />
            Add Budget Account
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Acct Number *</label>
              <input
                required
                type="text"
                placeholder="e.g. 1000"
                value={formData.account_number}
                onChange={(e) => setFormData(p => ({ ...p, account_number: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Description *</label>
            <input
              required
              type="text"
              placeholder="e.g. Writers, Camera Operations"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || !formData.account_number || !formData.description} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LineItemDrawer({ accountId, accountName, projectId, isOpen, onClose }: any) {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['lineItems', accountId],
    queryFn: () => api.getLineItems(accountId),
    enabled: isOpen,
  });

  const [formData, setFormData] = useState<LineItemIn>({
    description: '',
    amount: 0,
    is_actual: false,
    currency: 'USD'
  });

  const createMutation = useMutation({
    mutationFn: (payload: LineItemIn) => api.createLineItem(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineItems', accountId] });
      queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
      setFormData({ description: '', amount: 0, is_actual: false, currency: 'USD' });
      toast.success('Saved', 'Line item added.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLineItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineItems', accountId] });
      queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-studio-900 border-l border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-studio-950">
        <div>
          <h3 className="font-bold text-white">{accountName}</h3>
          <p className="text-xs text-slate-400">Detail Line Items</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded bg-studio-900 border border-white/5">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 bg-studio-950 border-b border-white/10">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Description</label>
            <input required type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full bg-studio-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" placeholder="e.g. Sony Venice Rental" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount (USD)</label>
              <input required type="number" step="0.01" min="0" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="w-full bg-studio-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${formData.is_actual ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${formData.is_actual ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {formData.is_actual ? 'Actual Cost' : 'Est. Budget'}
                </span>
              </label>
              <input type="checkbox" checked={formData.is_actual} onChange={e => setFormData(p => ({ ...p, is_actual: e.target.checked }))} className="hidden" />
            </div>
          </div>
          <button type="submit" disabled={createMutation.isPending || !formData.description} className="w-full py-2 bg-studio-800 hover:bg-studio-700 border border-white/10 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Line Item
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-10 border border-dashed border-white/10 rounded-xl">No line items in this account yet.</div>
        ) : (
          items.map((item: LineItemOut) => (
            <div key={item.id} className="bg-studio-950 border border-white/5 rounded-xl p-3 flex items-center justify-between group">
              <div>
                <p className="text-sm font-medium text-white">{item.description}</p>
                <p className={`text-xs font-bold mt-1 ${item.is_actual ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {item.is_actual ? 'ACTUAL' : 'EST'} • {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency }).format(item.amount)}
                </p>
              </div>
              <button onClick={() => deleteMutation.mutate(item.id)} className="p-1.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
