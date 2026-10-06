"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CrewMemberOut, CrewMemberIn } from '@/lib/api';
import { toast } from '@/stores/useToastStore';
import { Users, Plus, Pencil, Trash2, Loader2, X, Search } from 'lucide-react';

export default function CrewRosterPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMemberOut | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: crewList = [], isLoading } = useQuery<CrewMemberOut[]>({
    queryKey: ['crew', projectId],
    queryFn: () => api.getCrew(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CrewMemberIn) => api.createCrewMember(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew', projectId] });
      toast.success('Crew Added', 'Successfully added crew member.');
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CrewMemberIn }) => api.updateCrewMember(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew', projectId] });
      toast.success('Crew Updated', 'Successfully updated crew member.');
      setEditingCrew(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCrewMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew', projectId] });
      toast.info('Crew Removed', 'Crew member deleted.');
    }
  });

  // Group by department
  const filteredCrew = crewList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const departments = Array.from(new Set(filteredCrew.map(c => c.department))).sort();

  return (
    <div className="flex-1 flex flex-col h-full bg-studio-950 text-white overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10 bg-studio-950 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-500" />
            Crew Roster
          </h1>
          <p className="text-slate-400 text-sm">Manage physical production team and departments.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search roster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-studio-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg shadow-lg shadow-sky-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Crew Member
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span>Loading roster...</span>
          </div>
        ) : filteredCrew.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-300">No Crew Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">
              Start building your physical production team by adding members.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {departments.map(dept => (
              <div key={dept} className="bg-studio-900/50 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-3 bg-studio-900 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-sky-400 tracking-wider uppercase text-sm">{dept}</h3>
                  <span className="text-xs font-mono text-slate-500 bg-studio-950 px-2 py-0.5 rounded-full border border-white/5">
                    {filteredCrew.filter(c => c.department === dept).length} members
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {filteredCrew.filter(c => c.department === dept).map(crew => (
                    <div key={crew.id} className="flex items-center justify-between px-6 py-4 hover:bg-studio-800/50 transition-colors group">
                      <div className="grid grid-cols-4 gap-4 flex-1">
                        <div className="col-span-1">
                          <p className="font-bold text-sm">{crew.name}</p>
                          <p className="text-xs text-slate-400">{crew.role}</p>
                        </div>
                        <div className="col-span-2 flex items-center gap-4 text-sm text-slate-300">
                          {crew.email && <span className="truncate" title={crew.email}>{crew.email}</span>}
                        </div>
                        <div className="col-span-1 flex items-center justify-end gap-2 text-sm text-slate-400">
                          {crew.phone && <span>{crew.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingCrew(crew)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 rounded bg-studio-950 border border-white/5"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(crew.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded bg-studio-950 border border-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(isModalOpen || editingCrew) && (
        <CrewModal
          isOpen={true}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCrew(null);
          }}
          initialData={editingCrew}
          onSave={(payload) => {
            if (editingCrew) {
              updateMutation.mutate({ id: editingCrew.id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function CrewModal({ isOpen, onClose, initialData, onSave, isPending }: any) {
  const [formData, setFormData] = useState<CrewMemberIn>({
    name: initialData?.name || '',
    department: initialData?.department || '',
    role: initialData?.role || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-studio-950">
          <h2 className="text-lg font-bold text-white">
            {initialData ? 'Edit Crew Member' : 'Add Crew Member'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Name *</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Department *</label>
              <input
                required
                type="text"
                placeholder="e.g. Camera"
                value={formData.department}
                onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Role *</label>
              <input
                required
                type="text"
                placeholder="e.g. 1st AC"
                value={formData.role}
                onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.name || !formData.department || !formData.role}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
