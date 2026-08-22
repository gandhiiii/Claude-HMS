import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Copy, Check, QrCode, Download, Upload, ShieldCheck, Sparkles, Globe } from 'lucide-react';

export const MobileSyncModal = ({ onClose }) => {
  const { getMobileSyncUrl, importSystemSyncData, triggerToast, copyCommonAppUrl, getCommonAppUrl } = useApp();
  const [copied, setCopied] = useState(false);
  const [copiedCommon, setCopiedCommon] = useState(false);
  const [pasteToken, setPasteToken] = useState('');
  const [qrMode, setQrMode] = useState('APP'); // 'APP' (Short URL, 100% scannable) or 'DATA' (Full Payload)

  const commonUrl = getCommonAppUrl ? getCommonAppUrl() : 'http://192.168.7.6:3000';
  const mobileSyncUrl = getMobileSyncUrl ? getMobileSyncUrl() : window.location.href;
  const targetQrValue = qrMode === 'APP' ? mobileSyncUrl : commonUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileSyncUrl);
    setCopied(true);
    triggerToast('Mobile Sync Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyCommon = () => {
    if (copyCommonAppUrl) {
      copyCommonAppUrl();
    } else {
      navigator.clipboard.writeText(commonUrl);
      triggerToast(`Common App Link (${commonUrl}) copied to clipboard!`, 'success');
    }
    setCopiedCommon(true);
    setTimeout(() => setCopiedCommon(false), 3000);
  };

  const handleImport = (e) => {
    e.preventDefault();
    if (!pasteToken) return;
    const ok = importSystemSyncData(pasteToken);
    if (ok) {
      setPasteToken('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Desktop ➔ Mobile Sync
                <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                  Cross-Device
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Scan QR Code with any phone camera to launch Stavya Spine Hospital on Mobile.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* QR Code & Direct Link Section */}
        <div className="space-y-6">
          
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-4">
            
            {/* Mode Switcher Buttons */}
            <div className="flex items-center justify-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setQrMode('APP')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  qrMode === 'APP'
                    ? 'bg-teal-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Instant App QR (Fast Scan)
              </button>
              <button
                type="button"
                onClick={() => setQrMode('DATA')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  qrMode === 'DATA'
                    ? 'bg-teal-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full Data Payload QR
              </button>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" />
              {qrMode === 'APP' ? 'Scan to Open Mobile Web App' : 'Scan Full Data Payload'}
            </h4>

            {/* Ultra High Contrast Scannable SVG QR Code */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl mx-auto border-4 border-slate-800">
              <QRCodeSVG 
                value={targetQrValue} 
                size={210}
                level="L"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-teal-300 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800 inline-block max-w-full truncate">
                {targetQrValue}
              </p>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed pt-1">
                Open Camera app on your phone (connected to Wi-Fi) and point at the QR code above.
              </p>
            </div>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98]"
              >
                {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Mobile Sync Link Copied!' : 'Copy Mobile Sync Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCommon}
                className="py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {copiedCommon ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Globe className="w-4 h-4 text-cyan-400" />}
                <span>{copiedCommon ? 'Common Link Copied!' : 'Copy Common App Link'}</span>
              </button>
            </div>
          </div>

          {/* Paste Sync Token Section */}
          <form onSubmit={handleImport} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Upload className="w-4 h-4" />
              Or Paste Sync Link / Token Manually
            </h4>

            <div>
              <input
                type="text"
                placeholder="Paste mobile sync URL or token here..."
                value={pasteToken}
                onChange={e => setPasteToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={!pasteToken}
              className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
            >
              Import System Data to Mobile
            </button>
          </form>

          {/* Instructions Guide */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <span className="font-bold text-slate-200 block uppercase tracking-wider text-[10px]">How It Works</span>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>When you create a user or request on Desktop, click <b>Copy Mobile Sync Link</b>.</li>
              <li>Open the copied link on your phone (e.g. via WhatsApp, Email, or Browser).</li>
              <li>Your phone will automatically load all desktop users, roles, and requests!</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
