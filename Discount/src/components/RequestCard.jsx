import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  FileText, 
  UserCheck, 
  ChevronRight, 
  Download, 
  MessageSquare, 
  Lock,
  Building,
  IndianRupee,
  Sparkles,
  ArrowRight,
  Trash2
} from 'lucide-react';

export const RequestCard = ({ request, onSelect }) => {
  const { activeUser, approveRequest, rejectRequest, escalateRequest, deleteRequest } = useApp();
  const [showQuickReject, setShowQuickReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isPending = request.status?.startsWith('PENDING');
  const isApproved = request.status === 'APPROVED';
  const isRejected = request.status === 'REJECTED';

  // Role permissions check for quick actions
  const userRole = activeUser?.role || '';
  const isBMgr = userRole === 'BILLING_MANAGER';
  const isCA = userRole === 'CHIEF_ACCOUNTANT';
  const isCFO = userRole === 'CFO';
  const isExecutive = ['CHAIRMAN', 'VICE_CHAIRMAN', 'MD'].includes(userRole);
  const isAdmin = userRole === 'ADMIN';

  const canBMgrAction = (isBMgr || isAdmin) && (request.status === 'PENDING_BMGR' || request.status === 'PENDING');
  const canCAAction = (isCA || isAdmin) && (request.status === 'PENDING_CA' || request.status === 'PENDING_BMGR' || request.status === 'PENDING');
  const canCFOAction = (isCFO || isAdmin) && (request.status === 'PENDING_CFO' || request.status === 'PENDING_CA' || request.status === 'PENDING_BMGR' || request.status === 'PENDING');
  const canExecAction = (isExecutive || isAdmin) && isPending;

  const canAction = canBMgrAction || canCAAction || canCFOAction || canExecAction;

  const handleConfirmReject = (e) => {
    e.stopPropagation();
    if (rejectRequest(request.id, rejectReason)) {
      setShowQuickReject(false);
      setRejectReason('');
    }
  };

  // Status text formatter
  const getStatusDisplay = () => {
    if (isApproved) return 'APPROVED';
    if (isRejected) return 'REJECTED';
    if (request.status === 'PENDING_BMGR') return 'PENDING BILLING MGR (MINOR)';
    if (request.status === 'PENDING_CA') return 'PENDING CA PERMISSION';
    if (request.status === 'PENDING_CFO') return 'PENDING CFO (HIGH)';
    if (request.status === 'PENDING_EXECUTIVE') return 'PENDING MD/CHAIRMAN (TOO HIGH)';
    return request.status || 'PENDING';
  };

  return (
    <div 
      onClick={() => onSelect(request)}
      className={`glass-card p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
        isApproved 
          ? 'border-emerald-500/30 hover:border-emerald-500/50' 
          : isRejected 
          ? 'border-rose-500/30 hover:border-rose-500/50' 
          : 'border-amber-500/30 hover:border-amber-500/50'
      }`}
    >
      {/* Top Bar: Code & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-teal-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            #{request.requestCode}
          </span>
          {request.isDirectExecutiveGrant && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Direct Grant
            </span>
          )}
        </div>

        {/* Status Pill & Admin Delete Button */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
            isApproved 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : isRejected 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 pulse-badge'
          }`}>
            {isApproved && <CheckCircle2 className="w-3.5 h-3.5" />}
            {isRejected && <XCircle className="w-3.5 h-3.5" />}
            {isPending && <Clock className="w-3.5 h-3.5" />}
            {getStatusDisplay()}
          </span>

          {activeUser && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete discount request #${request.requestCode} permanently?`)) {
                  deleteRequest(request.id);
                }
              }}
              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all active:scale-95 ml-1"
              title="Remove Request"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Patient & Financial Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-bold text-base text-slate-100 group-hover:text-teal-300 transition-colors">
              {request.patientName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span>ID: {request.patientId}</span>
              <span>•</span>
              <span>{request.department}</span>
              {request.serviceName && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                    {request.serviceName}
                  </span>
                </>
              )}
              {request.receiptNo && (
                <>
                  <span>•</span>
                  <span className="font-mono text-cyan-300">Rcpt: {request.receiptNo}</span>
                </>
              )}
              {request.opdIpdNo && (
                <>
                  <span>•</span>
                  <span className="font-mono text-amber-300">{request.opdIpdNo}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Requested Waiver</span>
            <span className="text-lg font-extrabold text-teal-300">
              {request.requestedDiscountVal}%
            </span>
          </div>
        </div>

        {/* Financial Numbers Bar */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gross Bill</span>
            <span className="font-bold text-slate-200">₹{Number(request.totalBillAmount).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] text-teal-400 uppercase font-semibold block">Waiver Amt</span>
            <span className="font-extrabold text-teal-400">-₹{Number(request.calculatedDiscountAmount).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Net Payable</span>
            <span className="font-bold text-emerald-400">₹{Number(request.finalPayableAmount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Reason snippet */}
        <div className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 line-clamp-2">
          <strong className="text-slate-400 font-semibold">{request.reasonCategory}:</strong> {request.detailedReason}
        </div>
      </div>

      {/* Target Permission Level Info */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Permission Level: <strong className="text-slate-200">{request.requiredAuthorityRole}</strong></span>
        </div>

        <span className="text-teal-400 hover:underline font-semibold flex items-center gap-0.5">
          Details <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Quick Approver Action Strip (Shown when pending & user authorized) */}
      {isPending && canAction && (
        <div 
          onClick={e => e.stopPropagation()} 
          className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-end gap-2"
        >
          {showQuickReject ? (
            <div className="w-full space-y-2">
              <input
                type="text"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full bg-slate-900 border border-rose-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickReject(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold whitespace-nowrap shadow-md"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowQuickReject(true)}
                className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
              >
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>Reject</span>
              </button>

              {(canBMgrAction && !isCA && !isCFO && !isExecutive) && (
                <button
                  type="button"
                  onClick={() => escalateRequest(request.id, 'CHIEF_ACCOUNTANT', 'Amount exceeds Billing Manager threshold. Escalating to Chief Accountant.')}
                  className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Escalate CA</span>
                </button>
              )}

              {(canCAAction && !isCFO && !isExecutive) && (
                <button
                  type="button"
                  onClick={() => escalateRequest(request.id, 'CFO', 'Amount is High. Chief Accountant escalating to CFO.')}
                  className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Escalate CFO</span>
                </button>
              )}

              {(canCFOAction && !isExecutive) && (
                <button
                  type="button"
                  onClick={() => escalateRequest(request.id, 'EXECUTIVE', 'Amount is Too High. CFO escalating to Executive Board.')}
                  className="py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Escalate MD</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => approveRequest(request.id, 'Approved via Quick Action')}
                className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 whitespace-nowrap ml-auto"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5] flex-shrink-0 text-slate-950" />
                <span>Approve Now</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Signature badge if approved */}
      {isApproved && (
        <div className="mt-2 text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Authorized by {request.approvedBy}</span>
        </div>
      )}
    </div>
  );
};
