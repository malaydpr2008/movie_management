'use client';

import React, { useState, useEffect } from 'react';
import { Mic2, CheckCircle2, CircleDashed, PlayCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'RECORDED': 'bg-blue-100 text-blue-800 border-blue-200',
  'APPROVED': 'bg-green-100 text-green-800 border-green-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'PENDING': <CircleDashed className="w-3 h-3 mr-1" />,
  'RECORDED': <PlayCircle className="w-3 h-3 mr-1" />,
  'APPROVED': <CheckCircle2 className="w-3 h-3 mr-1" />,
};

interface ADRCue {
  id: string;
  character_name: string;
  line_text: string;
  timecode: string;
  reason: string;
  status: string;
}

interface Props {
  projectId: string;
  sceneId: string;
}

export default function ADRPanel({ projectId, sceneId }: Props) {
  const [cues, setCues] = useState<ADRCue[]>([]);
  const [characterName, setCharacterName] = useState('');
  const [lineText, setLineText] = useState('');
  const [timecode, setTimecode] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCues();
  }, [projectId, sceneId]);

  const fetchCues = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/scenes/${sceneId}/adr`);
      if (res.ok) {
        const data = await res.json();
        setCues(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch ADR cues", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim() || !lineText.trim() || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/scenes/${sceneId}/adr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: characterName,
          line_text: lineText,
          timecode: timecode,
          reason: reason,
          status: 'PENDING'
        })
      });

      if (res.ok) {
        const newCue = await res.json();
        setCues([newCue, ...cues]);
        setCharacterName('');
        setLineText('');
        setTimecode('');
        setReason('');
      }
    } catch (err) {
      console.error("Failed to add ADR cue", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (cueId: string, newStatus: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/adr/${cueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCues(cues.map(c => c.id === cueId ? { ...c, status: newStatus } : c));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 w-full">
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        <Mic2 className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">ADR & Sound Manager</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Character Name</label>
            <input 
              type="text" 
              required
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder="e.g., JOHN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timecode</label>
            <input 
              type="text" 
              value={timecode}
              onChange={(e) => setTimecode(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono"
              placeholder="e.g., 01:23:45:12"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dialogue Line</label>
          <textarea 
            required
            rows={2}
            value={lineText}
            onChange={(e) => setLineText(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="The exact line that needs to be re-recorded..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for ADR</label>
          <input 
            type="text" 
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="e.g., Airplane noise, Mumbled delivery, Line change"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Flagging Cue...' : 'Flag ADR Cue'}
        </button>
      </form>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">Scene ADR Cues ({cues.length})</h4>
        {cues.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
            No dialogue flagged for ADR.
          </p>
        ) : (
          <div className="space-y-3">
            {cues.map(cue => {
              const colorClass = STATUS_COLORS[cue.status] || STATUS_COLORS['PENDING'];
              return (
                <div key={cue.id} className="border border-gray-200 rounded-md p-3 bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900">{cue.character_name}</span>
                      {cue.timecode && (
                        <span className="font-mono text-xs px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded">
                          {cue.timecode}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 italic mb-2">"{cue.line_text}"</p>
                    <p className="text-xs text-gray-500 font-medium">Reason: <span className="font-normal">{cue.reason}</span></p>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2">
                    <select
                      value={cue.status}
                      onChange={(e) => handleStatusChange(cue.id, e.target.value)}
                      className={`text-xs font-semibold py-1 pl-2 pr-6 rounded border shadow-sm outline-none appearance-none cursor-pointer ${colorClass}`}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="RECORDED">RECORDED</option>
                      <option value="APPROVED">APPROVED</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
