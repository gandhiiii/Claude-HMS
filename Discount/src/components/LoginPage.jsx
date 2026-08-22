import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CommonLinkModal } from './CommonLinkModal';
import { 
  Building2, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2,
  Stethoscope,
  Sparkles,
  Globe,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

export const LoginPage = () => {
  const { users, login, triggerToast, getRoleMeta, copyCommonAppUrl, getCommonAppUrl, openCommonAppUrl } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCommonModal, setShowCommonModal] = useState(false);

  const handleCopyCommon = () => {
    if (copyCommonAppUrl) {
      copyCommonAppUrl();
    } else {
      const url = getCommonAppUrl ? getCommonAppUrl() : 'http://192.168.7.6:3000';
      try {
        navigator.clipboard.writeText(url);
      } catch (e) {}
      triggerToast(`Common App Link (${url}) copied to clipboard!`, 'success');
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const success = login(username, password);
      setIsLoading(false);
      if (!success) {
        setErrorMsg('Invalid User ID or Password. Please verify your credentials.');
      }
    }, 400);
  };

  const handleSelectDemoUser = (u) => {
    setUsername(u.username || u.email || u.name);
    setPassword(u.password || 'Pass@123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Background Gradients & Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 right-10 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Navbar Brand Bar */}
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/25 text-slate-950 font-extrabold text-xl">
            <Building2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-slate-100 tracking-tight flex items-center gap-2">
              Stavya Spine Hospital <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">Stavya Intelligence</span>
            </h1>
            <p className="text-xs text-slate-400">Research Institute Pvt. Ltd. • Discount Permission Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-badge"></span>
            <span>Stavya System Active • Live Sync</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCommonModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="Open Common Access Link Options for Network Devices"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Common Opening Link</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-md">
          
          <div className="glass-panel p-8 md:p-10 rounded-3xl border border-slate-800/90 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-100">Stavya Intelligence Portal</h2>
              <p className="text-xs text-slate-400 mt-1">
                Stavya Spine Hospital & Research Institute Pvt. Ltd. Login Portal
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  User ID / Username / Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Enter your User ID or Username..."
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition-all placeholder:text-slate-500"
                  />
                  <User className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Enter account password..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pl-10 pr-11 py-3 text-sm text-slate-100 font-mono focus:outline-none focus:border-teal-500 transition-all placeholder:text-slate-500"
                  />
                  <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input 
                    type="checkbox" 
                    defaultChecked
                    className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500" 
                  />
                  <span>Remember my session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Common Opening Link Access Banner */}
            <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow-inner">
              <div 
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                onClick={() => setShowCommonModal(true)}
              >
                <div className="h-7 w-7 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block -mb-0.5">
                    Common Network Opening Link
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-300 truncate block hover:underline">
                    {getCommonAppUrl ? getCommonAppUrl() : 'http://192.168.7.6:3000'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCommon}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                  title="Copy Link to Clipboard"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCommonAppUrl ? openCommonAppUrl() : window.open(getCommonAppUrl ? getCommonAppUrl() : 'http://192.168.7.6:3000', '_blank')}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold transition-all active:scale-95"
                  title="Open Link Directly in New Tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-5 text-center text-xs text-slate-500">
              CarePulse Hospital OS • Official Authorization Platform
            </div>
          </div>

        </div>
      </main>

      {/* Common Link Modal */}
      {showCommonModal && (
        <CommonLinkModal onClose={() => setShowCommonModal(false)} />
      )}

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-500 relative z-10">
        © 2026 CarePulse Hospital Systems. Built with React, Tailwind CSS, Supabase & WebSockets.
      </footer>

    </div>
  );
};
