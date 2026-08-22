import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  ShieldAlert, 
  UserCheck, 
  PlusCircle, 
  FileSpreadsheet, 
  Bell, 
  Radio,
  Settings,
  Users,
  LogOut,
  RotateCcw,
  Smartphone,
  Globe,
  Link2
} from 'lucide-react';

export const Header = ({ 
  onOpenNewModal, 
  onOpenExcelModal, 
  onOpenNotifDrawer, 
  onOpenSupabaseModal,
  onOpenMobileSyncModal,
  onOpenCommonLinkModal,
  onOpenLoginModal,
  activeTab,
  setActiveTab 
}) => {
  const { users, activeUser, setActiveUser, notifications, supabaseConfig, logout, isBillingRole, getRoleMeta, resetSystemDefaults, copyCommonAppUrl, getCommonAppUrl, manualSync } = useApp();

  const isBillingStaff = isBillingRole(activeUser?.role);
  const roleMeta = getRoleMeta(activeUser?.role);

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-slate-800/80 px-4 lg:px-8 py-3.5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Connection Badge */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-sky-500 via-teal-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/25 text-slate-950 font-extrabold text-xl">
            <Building2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-slate-100 tracking-tight">Stavya Spine Hospital & Research Institute Pvt. Ltd.</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-lg font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                Stavya Intelligence
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1.5 text-teal-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-teal-400 pulse-badge"></span>
                {supabaseConfig.isConnected ? 'Supabase Realtime Active' : 'Spine OPD Software Online'}
              </span>
              <span>•</span>
              <span className="font-mono text-cyan-300">Hospital ID: #STAVYA-SPINE-9902</span>
            </div>
          </div>
        </div>

        {/* Center Tabs: Show to Admin, SuperAdmin, HOD & Account roles */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-lg text-xs transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200 font-semibold'
            }`}
          >
            OPD Dashboard & Waivers
          </button>

          {['ADMIN', 'SUPERADMIN'].includes(activeUser?.role) && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200 font-semibold'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Admin Directory & User Control</span>
            </button>
          )}
        </div>

        {/* Right Actions & Active Role Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          
          {/* Active Logged-In User Badge & Quick Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
            <UserCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block -mb-0.5">
                Active User Session
              </span>
              <select
                value={activeUser?.id || activeUser?.role}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const targetUser = users.find(u => u.id === selectedId || u.role === selectedId || u.username === selectedId);
                  if (targetUser) {
                    setActiveUser(targetUser);
                  }
                }}
                className="bg-transparent text-xs font-extrabold text-teal-300 focus:outline-none cursor-pointer hover:text-teal-200 transition-colors max-w-[180px] truncate"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100 font-sans">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* New Request Button */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            New Discount
          </button>

          {/* Export Excel Button */}
          {!isBillingStaff && (
            <button
              onClick={onOpenExcelModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-all active:scale-95"
              title="Download Formatted Excel Report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}

          {/* Common Opening Link Button */}
          <button
            onClick={onOpenCommonLinkModal || copyCommonAppUrl}
            className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title={`Open Common Access Link (${getCommonAppUrl ? getCommonAppUrl() : 'http://192.168.7.6:3000'}) Options`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Common Link</span>
          </button>

          {/* Mobile Sync Trigger Button */}
          <button
            onClick={onOpenMobileSyncModal}
            className="px-3 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="Mobile Sync & QR Code"
          >
            <Smartphone className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">Mobile Sync</span>
          </button>

          {/* Quick Manual Sync Refresh Button */}
          <button
            onClick={() => {
              if (manualSync) manualSync();
            }}
            className="px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-teal-300 border border-slate-800 font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
            title="Instant Live Network Sync & Refresh"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Sync Data</span>
          </button>

          {/* Supabase Config Modal Trigger (Admin Only) */}
          {activeUser.role === 'ADMIN' && (
            <button
              onClick={onOpenSupabaseModal}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
              title="Supabase & Realtime Settings"
            >
              <Radio className="w-4 h-4 text-cyan-400" />
            </button>
          )}

          {/* Live Notification Drawer Trigger */}
          <button
            onClick={onOpenNotifDrawer}
            className="relative p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            title="Live SMS & Email Activity Feed"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Reset System Defaults Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset all roles, services, and requests to default system configuration?')) {
                resetSystemDefaults();
              }
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-teal-500/30 transition-all"
            title="Reset System Data to Defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
            title="Logout Session"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
