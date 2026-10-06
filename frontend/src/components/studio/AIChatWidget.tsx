"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Bot, User } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatWidgetProps {
  projectId: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function AIChatWidget({ projectId }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => api.sendChatMessage(projectId, message),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'ai', content: data.reply }]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Error: ${error instanceof Error ? error.message : 'Something went wrong.'}` },
      ]);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    sendMessageMutation.mutate(userMessage);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 z-50 flex items-center justify-center group"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-studio-900 border border-white/10 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden shadow-indigo-500/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-studio-950 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Universal Studio Agent</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-studio-900/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Sparkles className="w-12 h-12 text-indigo-400" />
            <p className="text-sm text-slate-300">
              I'm your AI Studio Copilot.<br />
              Ask me to analyze the script, schedule scenes, or query documents.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm overflow-x-auto ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-sm'
                    : 'bg-studio-800 text-slate-200 border border-white/5 rounded-tl-sm'
                }`}
              >
                {msg.role === 'ai' ? (
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none break-words" remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 text-sky-400">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        
        {sendMessageMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-studio-800 text-slate-400 rounded-2xl rounded-tl-sm p-3 px-4 text-sm border border-white/5 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-studio-950 border-t border-white/10">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask the Studio Agent..."
            className="w-full bg-studio-900 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner shadow-black/20"
            disabled={sendMessageMutation.isPending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
            className="absolute right-2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors bg-studio-800 hover:bg-studio-700 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
