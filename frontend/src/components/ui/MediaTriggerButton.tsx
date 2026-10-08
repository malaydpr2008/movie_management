import React from 'react';
import { Paperclip } from 'lucide-react';

interface MediaTriggerProps {
  appLabel: string;
  modelName: string;
  objectId: string;
  onOpenMedia: (data: { appLabel: string; modelName: string; objectId: string }) => void;
}

export default function MediaTriggerButton({ appLabel, modelName, objectId, onOpenMedia }: MediaTriggerProps) {
  return (
    <button 
      onClick={() => onOpenMedia({ appLabel, modelName, objectId })} 
      className="p-1.5 bg-studio-800 hover:bg-studio-700 rounded text-slate-400 hover:text-sky-400 transition-colors ml-2"
      title="Attach Media"
    >
      <Paperclip className="w-4 h-4"/>
    </button>
  );
}
