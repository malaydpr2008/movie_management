"use client";

import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin } from 'lucide-react';
import { api, ShootDayDetail } from '@/lib/api';

interface AddShootDayModalProps {
  projectId: string;
  nextDayNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (day: ShootDayDetail) => void;
}

export default function AddShootDayModal({
  projectId,
  nextDayNumber,
  isOpen,
  onClose,
  onCreated,
}: AddShootDayModalProps) {
  const [dayNumber, setDayNumber] = useState(nextDayNumber);
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalCrewCall, setGeneralCrewCall] = useState('06:00');
  const [shootingCall, setShootingCall] = useState('07:30');
  const [hospitalAddress, setHospitalAddress] = useState('Metro Emergency Trauma Center (10 mins away)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newDay = await api.createShootDay({
        project_id: projectId,
        day_number: Number(dayNumber),
        calendar_date: calendarDate,
        general_crew_call: generalCrewCall,
        shooting_call: shootingCall,
        hospital_address: hospitalAddress,
      });
      onCreated(newDay);
      onClose();
    } catch (err) {
      console.error('Failed to create shoot day', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-studio-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-studio-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
              +
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Add Production Shoot Day</h3>
              <p className="text-xs text-slate-400">Initialize a new shooting call and stripboard container</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Day Number
              </label>
              <input
                type="number"
                min="1"
                required
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" /> Date
              </label>
              <input
                type="date"
                required
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
                className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Crew Call Time
              </label>
              <input
                type="time"
                value={generalCrewCall}
                onChange={(e) => setGeneralCrewCall(e.target.value)}
                className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Shooting Call
              </label>
              <input
                type="time"
                value={shootingCall}
                onChange={(e) => setShootingCall(e.target.value)}
                className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> Nearest Hospital & Emergency Contact
            </label>
            <input
              type="text"
              value={hospitalAddress}
              onChange={(e) => setHospitalAddress(e.target.value)}
              placeholder="Hospital name, address, distance..."
              className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Day...' : 'Create Shoot Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
