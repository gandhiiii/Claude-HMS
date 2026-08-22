import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, Copy, Check, ExternalLink, QrCode, Settings, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';

export const CommonLinkModal = ({ onClose }) => {
  const { getCommonAppUrl, copyCommonAppUrl, openCommonAppUrl, commonIp, setCommonIp, copyToClipboard, triggerToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(commonIp || '192.168.7.6');
  const [showSettings, setShowSettings] = useState(false);

  const commonUrl = getCommonAppUrl ? getCommonAppUrl() : 'http://192.168.7.6:3000';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(commonUrl)}`;

  const handleCopy = async () => {
    if (copyCommonAppUrl) {
      await copyCommonAppUrl();
    } else {
      await copyToClipboard(commonUrl);
      triggerToast(`Common App Link (${commonUrl}) copied to clipboard!`, 'success');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpen = () => {
    if (openCommonAppUrl) {
      openCommonAppUrl();
    } else {
      window.open(commonUrl, '_blank');
    }
  };

  const handleSaveIp = (e) => {
    e.preventDefault();
    if (customIpInput) {
      setCommonIp(customIpInput);
      setShowSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto font-sans">
      <div className="glass-card w-full max-w-lg rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                Common Opening Link
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  Network Online
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Share & access CarePulse Hospital OS from any phone or PC on LAN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">

          {/* Prominent URL Display Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                Network Opening URL
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-[11px] font-semibold text-slate-400 hover:text-cyan-300 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showSettings ? 'Hide IP Config' : 'Change IP'}</span>
              </button>
            </div>

            {/* Editable Host IP Settings Form */}
            {showSettings ? (
              <form onSubmit={handleSaveIp} className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2 animate-fadeIn">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Configure Local Network Host IP / Address:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customIpInput}
                    onChange={(e) => setCustomIpInput(e.target.value)}
                    placeholder="e.g. 192.168.7.6 or myhospital.local"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-400 transition-all"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between font-mono text-sm text-cyan-300 font-bold select-all overflow-x-auto">
                <span className="truncate">{commonUrl}</span>
                <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-800 flex-shrink-0 ml-2 font-sans font-medium">
                  HTTP LAN
                </span>
              </div>
            )}

            {/* Action Buttons: Open & Copy */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
              >
                {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Opening Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpen}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>Open Link Now</span>
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" />
              Scan QR Code to Open on Phone
            </h4>

            <div className="bg-white p-2.5 rounded-2xl inline-block shadow-lg mx-auto border-4 border-slate-800">
              <img 
                src={qrCodeUrl} 
                alt="Common Opening Link QR Code" 
                className="w-36 h-36 object-contain mx-auto"
              />
            </div>

            <p className="text-[11px] text-slate-300 max-w-xs mx-auto leading-relaxed">
              Scan this QR code with any smartphone camera connected to Wi-Fi to open CarePulse Hospital OS instantly.
            </p>
          </div>

          {/* Status Note */}
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-[11px]">
              <b>Vite Server Active</b> • Listening on all network interfaces (<code className="text-cyan-300">0.0.0.0:3000</code>).
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
