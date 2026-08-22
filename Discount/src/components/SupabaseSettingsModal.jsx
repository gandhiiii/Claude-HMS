import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabaseClient';
import { Radio, Database, Copy, Check, ShieldCheck, Key } from 'lucide-react';

export const SupabaseSettingsModal = ({ onClose }) => {
  const { supabaseConfig, setSupabaseConfig, triggerToast } = useApp();
  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [copied, setCopied] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (url && anonKey) {
      setSupabaseConfig({
        url,
        anonKey,
        isConnected: true
      });
      triggerToast('Custom Supabase cloud database connected successfully!', 'success');
    } else {
      setSupabaseConfig({
        url: '',
        anonKey: '',
        isConnected: false
      });
      triggerToast('Using built-in WebSocket reactive engine with local cache.', 'info');
    }
    onClose();
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    triggerToast('Supabase SQL Schema copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-xl rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Supabase & WebSocket Realtime Config</h3>
              <p className="text-xs text-slate-400">Configure Cloud Database Connection or SQL Schema</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supabase Project URL</label>
            <input
              type="text"
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supabase Anon Public Key</label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={e => setAnonKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* SQL Schema Generator Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Supabase PostgreSQL Schema SQL Script
              </span>
              <button
                type="button"
                onClick={handleCopySchema}
                className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy SQL Schema'}
              </button>
            </div>
            
            <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-36 scrollbar-thin">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Save Configuration
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
