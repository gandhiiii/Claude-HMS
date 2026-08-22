import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, User, Lock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginModal = ({ onClose }) => {
  const { users, setActiveUser, triggerToast } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    const matchedUser = users.find(u => {
      const matchIdentifier = (
        (u.username && u.username.trim().toLowerCase() === inputUser) ||
        (u.email && u.email.trim().toLowerCase() === inputUser) ||
        (u.name && u.name.trim().toLowerCase() === inputUser) ||
        (u.id && u.id.trim().toLowerCase() === inputUser)
      );

      const matchPassword = !u.password || u.password.trim() === inputPass;

      return matchIdentifier && matchPassword;
    });

    if (matchedUser) {
      setActiveUser(matchedUser);
      triggerToast(`Successfully authenticated as ${matchedUser.name} (${matchedUser.role})!`, 'success');
      onClose();
    } else {
      setErrorMsg(`Invalid login details for "${username}". Please check credentials or select a user from the directory below.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">User Credentials Login</h3>
              <p className="text-xs text-slate-400">Authenticate using User ID, Email, or Name & Password</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">User ID / Username / Email</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. admin_sys, md_evelyn, or email..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Enter account password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 active:scale-95"
            >
              Authenticate & Login
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
