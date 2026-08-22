import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  getNotificationGatewayConfig, 
  saveNotificationGatewayConfig, 
  sendRealTwilioSms, 
  sendRealEmailJS 
} from '../utils/notificationEngine';
import { Phone, Mail, Send, CheckCircle2, AlertCircle, ShieldAlert, Key, MessageSquare } from 'lucide-react';

export const NotificationSettingsModal = ({ onClose }) => {
  const { triggerToast } = useApp();

  const [config, setConfig] = useState(() => getNotificationGatewayConfig());
  const [testPhone, setTestPhone] = useState('+91');
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    saveNotificationGatewayConfig(config);
    triggerToast('Notification Gateway Settings saved successfully!', 'success');
    onClose();
  };

  const handleSendTestSms = async () => {
    if (!testPhone || testPhone.length < 10) {
      triggerToast('Please enter a valid phone number (e.g. +91 9876543210)', 'warning');
      return;
    }

    setIsSendingTestSms(true);
    const msg = `CarePulse Test Alert: Live SMS Gateway is operational! Sent at ${new Date().toLocaleTimeString()}`;

    if (config.enableRealSms && config.twilioAccountSid) {
      const res = await sendRealTwilioSms(testPhone, msg);
      if (res.success) {
        triggerToast(`Real SMS dispatched to ${testPhone} via Twilio!`, 'success');
      } else {
        triggerToast(`Twilio SMS Failed: ${res.reason}`, 'warning');
      }
    } else {
      // Direct Web Launcher for device SMS / WhatsApp
      const cleanPhone = testPhone.replace(/[^0-9+]/g, '');
      const encodedMsg = encodeURIComponent(msg);
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
      triggerToast(`Opened WhatsApp Web / Device SMS to send message directly to ${testPhone}`, 'info');
    }
    setIsSendingTestSms(false);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      triggerToast('Please enter a valid email address.', 'warning');
      return;
    }

    setIsSendingTestEmail(true);
    const subject = 'CarePulse Live Email Test';
    const body = `This is a real live test email from CarePulse Hospital Billing System. Timestamp: ${new Date().toLocaleString()}`;

    if (config.enableRealEmail && config.emailJsServiceId) {
      const res = await sendRealEmailJS(testEmail, 'Test Recipient', subject, body);
      if (res.success) {
        triggerToast(`Real Email dispatched to ${testEmail} via EmailJS!`, 'success');
      } else {
        triggerToast(`EmailJS Failed: ${res.reason}`, 'warning');
      }
    } else {
      window.open(`mailto:${testEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
      triggerToast(`Opened default email client to send email to ${testEmail}`, 'info');
    }
    setIsSendingTestEmail(false);
  };

  // Request native browser notifications permission
  const requestBrowserPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          triggerToast('Browser push notifications enabled!', 'success');
        } else {
          triggerToast('Browser notification permission denied.', 'warning');
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Live SMS & Email Gateway Configuration</h3>
              <p className="text-xs text-slate-400">Configure Twilio SMS API, EmailJS API, or Direct Handset Launchers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Twilio SMS Gateway */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                Twilio Real SMS Gateway (Live Mobile Delivery)
              </span>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={config.enableRealSms}
                  onChange={e => setConfig({ ...config, enableRealSms: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-amber-400 font-bold">Enable Live Twilio SMS</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Twilio Account SID</label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxx..."
                  value={config.twilioAccountSid}
                  onChange={e => setConfig({ ...config, twilioAccountSid: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Twilio Auth Token</label>
                <input
                  type="password"
                  placeholder="Auth Token..."
                  value={config.twilioAuthToken}
                  onChange={e => setConfig({ ...config, twilioAuthToken: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sender Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (888) 000-0000"
                  value={config.twilioFromPhone}
                  onChange={e => setConfig({ ...config, twilioFromPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Test SMS Dispatcher */}
            <div className="pt-2 flex items-center gap-3">
              <input
                type="text"
                placeholder="Enter mobile number to test (e.g. +91 9876543210)..."
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                disabled={isSendingTestSms}
                onClick={handleSendTestSms}
                className="px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTestSms ? 'Sending...' : 'Send Test SMS / WhatsApp'}
              </button>
            </div>
          </div>

          {/* Section 2: EmailJS Gateway */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                EmailJS / SMTP Real Email Gateway
              </span>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={config.enableRealEmail}
                  onChange={e => setConfig({ ...config, enableRealEmail: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-indigo-400 font-bold">Enable Live Email API</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Service ID</label>
                <input
                  type="text"
                  placeholder="service_xxxxx"
                  value={config.emailJsServiceId}
                  onChange={e => setConfig({ ...config, emailJsServiceId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Template ID</label>
                <input
                  type="text"
                  placeholder="template_xxxxx"
                  value={config.emailJsTemplateId}
                  onChange={e => setConfig({ ...config, emailJsTemplateId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Public Key / User Key</label>
                <input
                  type="text"
                  placeholder="user_xxxxx"
                  value={config.emailJsPublicKey}
                  onChange={e => setConfig({ ...config, emailJsPublicKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Test Email Dispatcher */}
            <div className="pt-2 flex items-center gap-3">
              <input
                type="email"
                placeholder="Enter email to test (e.g. doctor@hospital.com)..."
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                disabled={isSendingTestEmail}
                onClick={handleSendTestEmail}
                className="px-4 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTestEmail ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>

          {/* Native Browser Push Notifications Button */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Desktop & Device Native Push Notifications</span>
              <span className="text-[11px] text-slate-400">Triggers pop-up banners on phone or desktop screen when new requests arrive</span>
            </div>
            <button
              type="button"
              onClick={requestBrowserPermission}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all"
            >
              Enable Browser Alerts
            </button>
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95"
            >
              Save Gateway Configuration
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
