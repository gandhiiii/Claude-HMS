import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestCard } from './RequestCard';
import { 
  PlusCircle, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  UserCheck, 
  Building, 
  ShieldAlert,
  Inbox,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const EmployeeView = ({ onSelectRequest, onOpenNewModal }) => {
  const { requests, activeUser, isBillingRole } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter requests relevant to front desk & billing department
  const employeeRequests = requests.filter(r => {
    const isMineOrDirect = (activeUser?.name && r.requestedBy?.includes(activeUser.name)) || isBillingRole(activeUser?.role) || r.isDirectExecutiveGrant;
    const matchesSearch = (
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requestCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter || (statusFilter === 'APPROVED' && r.status === 'APPROVED');

    return isMineOrDirect && matchesSearch && matchesStatus;
  });

  const pendingCount = employeeRequests.filter(r => r.status?.startsWith('PENDING')).length;
  const approvedCount = employeeRequests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = employeeRequests.filter(r => r.status === 'REJECTED').length;
  const directGrantCount = employeeRequests.filter(r => r.isDirectExecutiveGrant).length;

  return (
    <div className="space-y-6">
      
      {/* Top Billing Department Desk Banner */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-teal-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Billing & Counter Operations Desk
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {activeUser.username || activeUser.email}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-1">
              Welcome, {activeUser.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit patient discount requests at billing payment time (Chief Accountant ➔ CFO ➔ MD/Chairman) & receive live direct grants.
            </p>
          </div>

          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-teal-500/25 hover:from-teal-400 hover:to-emerald-400 transition-all active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            Ask Discount at Billing
          </button>
        </div>
      </div>

      {/* Direct Executive Discount Live Alert Notice */}
      {directGrantCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-amber-200 block">
                {directGrantCount} Direct Executive Discount Grant(s) Active on Billing Desk!
              </span>
              <p className="text-[11px] text-amber-300/80">
                Chairman, Vice Chairman, or MD issued direct discounts directly to patients. Apply immediately during payment settlement.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Ready to Apply
          </span>
        </div>
      )}

      {/* Quick Status Pill Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Pending Permissions</span>
              <span className="text-xl font-extrabold text-amber-300">{pendingCount}</span>
            </div>
          </div>
          <span className="text-[10px] text-amber-400/80 font-bold uppercase">CA / CFO / Exec</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Approved Waivers</span>
              <span className="text-xl font-extrabold text-emerald-400">{approvedCount}</span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-bold uppercase">Ready for Bill</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Direct Exec Grants</span>
              <span className="text-xl font-extrabold text-purple-300">{directGrantCount}</span>
            </div>
          </div>
          <span className="text-[10px] text-purple-400/80 font-bold uppercase">Chairman/MD</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Rejected Requests</span>
              <span className="text-xl font-extrabold text-rose-400">{rejectedCount}</span>
            </div>
          </div>
          <span className="text-[10px] text-rose-400/80 font-bold uppercase">Declined</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search patient name, ID, or request code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['ALL', 'PENDING_CA', 'PENDING_CFO', 'PENDING_EXECUTIVE', 'APPROVED', 'REJECTED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === st 
                    ? 'bg-teal-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('PENDING_', '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Grid */}
      {employeeRequests.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-slate-800">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-slate-300">No discount requests found</h4>
          <p className="text-xs text-slate-500 mt-1">Click "Ask Discount at Billing" to submit a new waiver for Chief Accountant & CFO permission.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employeeRequests.map(req => (
            <RequestCard key={req.id} request={req} onSelect={onSelectRequest} />
          ))}
        </div>
      )}

    </div>
  );
};
