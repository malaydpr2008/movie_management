"use client";

import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, DollarSign, Plus, X, Briefcase, Shield } from 'lucide-react';
import { toast } from '@/stores/useToastStore';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  department: string;
  union_affiliation: string;
  day_rate: number;
  email: string | null;
  phone: string | null;
}

export default function CrewRosterBoard({ projectId }: { projectId: string }) {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCrew();
  }, [projectId]);

  const fetchCrew = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/studio/projects/${projectId}/crew`);
      if (res.ok) {
        const data = await res.json();
        setCrew(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupedCrew = crew.reduce((acc, member) => {
    if (!acc[member.department]) acc[member.department] = [];
    acc[member.department].push(member);
    return acc;
  }, {} as Record<string, CrewMember[]>);

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-studio-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 p-5 bg-studio-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Crew Roster</h3>
            <p className="text-xs text-slate-400">Total Members: {crew.length}</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Crew Member
        </button>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400">
            <span className="font-mono text-sm animate-pulse">Loading Roster...</span>
          </div>
        ) : Object.keys(groupedCrew).length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-3 border border-dashed border-white/10 rounded-xl m-2 bg-white/5">
            <Briefcase className="w-8 h-8 opacity-50" />
            <span className="text-sm">No crew members added yet.</span>
          </div>
        ) : (
          Object.entries(groupedCrew).map(([department, members]) => (
            <div key={department} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <h4 className="font-bold text-emerald-400 uppercase tracking-widest text-xs">
                  {department}
                </h4>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {members.length}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-black/20 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Name & Role</th>
                      <th className="px-4 py-3">Union Status</th>
                      <th className="px-4 py-3">Day Rate</th>
                      <th className="px-4 py-3 text-right">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{member.name}</div>
                          <div className="text-xs text-slate-400">{member.role}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-studio-950 text-slate-300 text-xs font-mono border border-white/10">
                            <Shield className="w-3 h-3 text-emerald-500" />
                            {member.union_affiliation}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                            <DollarSign className="w-3 h-3" />
                            {member.day_rate.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 text-slate-400">
                            {member.phone && (
                              <a href={`tel:${member.phone}`} title={member.phone} className="hover:text-emerald-400 transition-colors bg-white/5 p-1.5 rounded-lg border border-white/5">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                            {member.email && (
                              <a href={`mailto:${member.email}`} title={member.email} className="hover:text-emerald-400 transition-colors bg-white/5 p-1.5 rounded-lg border border-white/5">
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <AddCrewModal
          projectId={projectId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newMember: CrewMember) => {
            setCrew([...crew, newMember]);
            setIsModalOpen(false);
            toast.success("Crew Member Added", `${newMember.name} has been added to ${newMember.department}.`);
          }}
        />
      )}
    </div>
  );
}

function AddCrewModal({ projectId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: 'Camera',
    union_affiliation: 'Non-Union',
    day_rate: 0,
    email: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/studio/projects/${projectId}/crew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        onSuccess(data);
      } else {
        toast.error("Error", "Failed to add crew member.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error", "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-studio-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-studio-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            Add Crew Member
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name *</label>
              <input
                required
                type="text"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Role *</label>
              <input
                required
                type="text"
                placeholder="e.g. Gaffer"
                value={formData.role}
                onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Department *</label>
              <input
                required
                type="text"
                placeholder="e.g. Grip & Electric"
                value={formData.department}
                onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Union Affiliation</label>
              <input
                type="text"
                placeholder="e.g. IATSE Local 600"
                value={formData.union_affiliation}
                onChange={(e) => setFormData(p => ({ ...p, union_affiliation: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-xs text-slate-400 block mb-1">Day Rate ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.day_rate}
                onChange={(e) => setFormData(p => ({ ...p, day_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div className="col-span-2 flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="555-0199"
                  value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={saving || !formData.name || !formData.role || !formData.department} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
              {saving ? 'Saving...' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
