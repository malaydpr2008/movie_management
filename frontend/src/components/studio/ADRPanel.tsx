'use client';

import React, { useState, useEffect } from 'react';
import { api, SceneTreeNode } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'RECORDED': 'bg-blue-100 text-blue-800 border-blue-200',
  'APPROVED': 'bg-green-100 text-green-800 border-green-200',
};

interface ADRCue {
  id: string;
  scene_id: string;
  character_name: string;
  line_text: string;
  timecode: string | null;
  reason: string;
  status: string;
}

interface Props {
  projectId: string;
  sceneId?: string;
}

export default function ADRPanel({ projectId, sceneId }: Props) {
  const [cues, setCues] = useState<ADRCue[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string>(sceneId || '');
  const [scenes, setScenes] = useState<SceneTreeNode[]>([]);
  const [characterName, setCharacterName] = useState('');
  const [lineText, setLineText] = useState('');
  const [timecode, setTimecode] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sceneId) {
      api.getProjectTree(projectId).then(tree => {
        const allScenes = tree.acts.flatMap(act => act.sequences.flatMap(seq => seq.scenes));
        setScenes(allScenes);
        if (allScenes.length > 0 && !activeSceneId) setActiveSceneId(allScenes[0].id);
      }).catch(console.error);
    } else {
      setActiveSceneId(sceneId);
    }
  }, [projectId, sceneId]);

  useEffect(() => {
    if (activeSceneId) {
      fetchCues(activeSceneId);
    }
  }, [projectId, activeSceneId]);

  const fetchCues = async (sid: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/scenes/${sid}/adr`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/scenes/${activeSceneId}/adr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: characterName,
          line_text: lineText,
          timecode: timecode || null,
          reason: reason
        })
      });

      if (res.ok) {
        const newCue = await res.json();
        setCues([...cues, newCue]);
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

  const updateStatus = async (cueId: string, newStatus: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/adr/${cueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const updatedCue = await res.json();
        setCues(cues.map(c => c.id === cueId ? updatedCue : c));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 w-full">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-900">ADR & Sound Cues</h3>
        {!sceneId && scenes.length > 0 && (
          <select 
            value={activeSceneId}
            onChange={(e) => setActiveSceneId(e.target.value)}
            className="border border-gray-300 rounded-md text-sm p-1.5 focus:border-indigo-500 focus:ring-indigo-500 max-w-[200px] truncate"
          >
            {scenes.map(s => (
              <option key={s.id} value={s.id}>Scene {s.scene_number} - {s.int_ext} {s.set_name}</option>
            ))}
          </select>
        )}
      </div>
      
      {!activeSceneId ? (
        <p className="text-sm text-gray-500 italic text-center py-4">Select a scene to manage ADR cues.</p>
      ) : (
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
              placeholder="e.g., John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timecode (Optional)</label>
            <input 
              type="text" 
              value={timecode}
              onChange={(e) => setTimecode(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder="01:04:22:10"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dialogue Line</label>
          <textarea 
            required
            value={lineText}
            onChange={(e) => setLineText(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border min-h-[60px]"
            placeholder="The exact line that needs re-recording..."
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
            placeholder="e.g., Airplane noise, Mumbled, Script Change"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Flag Dialogue for ADR'}
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
            {cues.map(cue => (
              <div key={cue.id} className="flex flex-col md:flex-row gap-3 border rounded-md p-3 shadow-sm items-start md:items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-gray-900">{cue.character_name}</span>
                    {cue.timecode && (
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        TC: {cue.timecode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 italic border-l-2 border-gray-300 pl-2 my-1">
                    "{cue.line_text}"
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-semibold">Reason:</span> {cue.reason}
                  </p>
                </div>
                
                <div className="shrink-0 flex items-center">
                  <select 
                    value={cue.status}
                    onChange={(e) => updateStatus(cue.id, e.target.value)}
                    className={`text-xs font-bold rounded-full px-2 py-1 border shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 ${STATUS_COLORS[cue.status] || STATUS_COLORS['PENDING']}`}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="RECORDED">RECORDED</option>
                    <option value="APPROVED">APPROVED</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
