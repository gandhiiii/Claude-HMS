import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DoctorBiometricModal } from './DoctorBiometricModal';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  ShieldCheck, 
  User, 
  Download, 
  MessageSquare, 
  Calendar,
  Building,
  Award,
  ArrowUpRight,
  Printer,
  Sparkles,
  ShieldAlert,
  Trash2,
  Fingerprint
} from 'lucide-react';

export const RequestDetailModal = ({ request, onClose }) => {
  const { activeUser, approveRequest, rejectRequest, escalateRequest, deleteRequest } = useApp();
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState('APPROVE'); // 'APPROVE', 'ESCALATE_CFO', 'ESCALATE_EXEC', 'REJECT'
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  if (!request) return null;

  const isPending = request.status?.startsWith('PENDING');
  const isApproved = request.status === 'APPROVED';
  const isRejected = request.status === 'REJECTED';

  // Role permissions checks
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

  const handleExecuteAction = () => {
    if (actionType === 'APPROVE') {
      setShowBiometricModal(true);
    } else if (actionType === 'ESCALATE_CA') {
      if (escalateRequest(request.id, 'CHIEF_ACCOUNTANT', comments || 'Amount exceeds Billing Manager limit. Escalating to Chief Accountant.')) {
        onClose();
      }
    } else if (actionType === 'ESCALATE_CFO') {
      if (escalateRequest(request.id, 'CFO', comments || 'Amount is High. Escalating to CFO for permission.')) {
        onClose();
      }
    } else if (actionType === 'ESCALATE_EXEC') {
      if (escalateRequest(request.id, 'EXECUTIVE', comments || 'Amount is Too High. Escalating to MD / Vice Chairman / Chairman.')) {
        onClose();
      }
    } else if (actionType === 'REJECT') {
      if (rejectRequest(request.id, comments)) {
        onClose();
      }
    }
  };

  const handleBiometricVerified = (authData) => {
    const finalRemark = `${comments ? comments + ' ' : ''}[✓ Verified via ${authData.method} by ${request.doctorName || activeUser.name}]`;
    approveRequest(request.id, finalRemark);
    setShowBiometricModal(false);
    onClose();
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-auto custom-scrollbar">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center font-mono font-extrabold text-sm">
              #{request.requestCode.split('-')[1]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-100">{request.requestCode}</h3>
                {request.isDirectExecutiveGrant && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Direct Executive Grant
                  </span>
                )}
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                  isApproved 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : isRejected 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                  {request.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">Created: {new Date(request.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete discount request #${request.requestCode} permanently?`)) {
                    deleteRequest(request.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Delete Request (Admin Only)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Request</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workflow Progress Stepper Timeline (Billing ➔ CA ➔ CFO ➔ MD/Chairman) */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-6">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-teal-400 block mb-3">
            Multi-Tier Discount Permission Workflow Timeline
          </span>
          
          <div className="grid grid-cols-4 gap-2 text-center relative">
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0"></div>

            {/* Step 1: Billing Desk */}
            <div className="flex flex-col items-center relative z-10">
              <div className="h-8 w-8 rounded-full bg-teal-500 text-slate-950 font-extrabold flex items-center justify-center text-xs shadow-md">
                1
              </div>
              <span className="text-[11px] font-bold text-slate-200 mt-1">Billing Dept</span>
              <span className="text-[9px] text-slate-400">Discount Asked</span>
            </div>

            {/* Step 2: Chief Accountant */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full font-bold flex items-center justify-center text-xs border ${
                request.status === 'PENDING_CA' 
                  ? 'bg-amber-500 text-slate-950 animate-pulse' 
                  : request.approvalChain?.some(c => c.role === 'CHIEF_ACCOUNTANT') || isApproved
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                2
              </div>
              <span className="text-[11px] font-bold text-slate-200 mt-1">Chief Accountant</span>
              <span className="text-[9px] text-slate-400">Standard Permission</span>
            </div>

            {/* Step 3: CFO */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full font-bold flex items-center justify-center text-xs border ${
                request.status === 'PENDING_CFO'
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : request.approvalChain?.some(c => c.role === 'CFO') || (isApproved && request.requiredAuthorityRole === 'CFO')
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                3
              </div>
              <span className="text-[11px] font-bold text-slate-200 mt-1">CFO Permission</span>
              <span className="text-[9px] text-slate-400">High Amount</span>
            </div>

            {/* Step 4: MD / Vice Chairman / Chairman */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`h-8 w-8 rounded-full font-bold flex items-center justify-center text-xs border ${
                isApproved 
                  ? 'bg-emerald-500 text-slate-950' 
                  : isRejected 
                  ? 'bg-rose-500 text-white' 
                  : request.status === 'PENDING_EXECUTIVE'
                  ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                4
              </div>
              <span className="text-[11px] font-bold text-slate-200 mt-1">MD / Chairman</span>
              <span className="text-[9px] text-slate-400">Too High Amount</span>
            </div>

          </div>
        </div>

        {/* Patient Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name</span>
            <span className="font-bold text-sm text-slate-100">{request.patientName}</span>
            <span className="text-xs text-slate-400 block font-mono">ID: {request.patientId}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Age & Gender</span>
            <span className="font-semibold text-sm text-slate-200">{request.patientAge} Yrs / {request.patientGender}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Department & Service</span>
            <span className="font-semibold text-sm text-teal-300">{request.department}</span>
            <span className="text-xs font-semibold text-cyan-300 block">{request.serviceName || 'Consultation Fees'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Treating Doctor</span>
            <span className="font-semibold text-sm text-slate-200">{request.doctorName}</span>
          </div>
        </div>

        {/* Billing Receipt & Custom Fields Specifications Table */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Billing Receipt Particulars & Reference Specifications
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Receipt No</span>
              <span className="font-bold text-cyan-300 font-mono">{request.receiptNo || 'N/A'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Bill Date / Receipt Date</span>
              <span className="font-semibold text-slate-200">{request.billDate || 'N/A'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">OPD / IPD No</span>
              <span className="font-bold text-amber-300 font-mono">{request.opdIpdNo || 'N/A'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Staff / Doctor / Reference Name</span>
              <span className="font-semibold text-slate-200">{request.referenceName || request.doctorName || 'N/A'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 md:col-span-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name / Relative Name</span>
              <span className="font-semibold text-slate-200">{request.relativeName || request.patientName || 'N/A'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Particulars</span>
            <span className="text-slate-200 leading-relaxed block">{request.particulars || 'Standard Billing Item Particulars'}</span>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 mb-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Billing Settlement (INR ₹)</h4>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Patient Bill</span>
              <span className="text-lg font-extrabold text-slate-100">₹{Number(request.totalBillAmount).toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30">
              <span className="text-[10px] text-teal-400 uppercase font-bold block">Waiver Granted ({request.requestedDiscountVal}%)</span>
              <span className="text-lg font-extrabold text-teal-300">-₹{Number(request.calculatedDiscountAmount).toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Net Payable Amount</span>
              <span className="text-lg font-extrabold text-emerald-400">₹{Number(request.finalPayableAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Complete Step-by-Step Approval Chain Log */}
        {request.approvalChain && request.approvalChain.length > 0 && (
          <div className="mb-6 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Permission Escalation & Approval Audit Trail
            </h4>

            <div className="space-y-2">
              {request.approvalChain.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{item.step}. {item.title}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                        item.action === 'APPROVED' || item.action === 'DIRECT_GRANT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : item.action === 'ESCALATED'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : item.action === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      }`}>
                        {item.action}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      <strong>Actor:</strong> {item.actor} | <strong>Comments:</strong> {item.comments}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Case Justification */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
          <span className="text-xs font-bold text-teal-400 block mb-1">
            Reason Category: {request.reasonCategory}
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {request.detailedReason}
          </p>
          {request.proofFileName && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Attachment: <strong className="text-slate-200">{request.proofFileName}</strong></span>
              <button 
                onClick={() => alert(`Viewing attachment: ${request.proofFileName}`)}
                className="text-teal-400 hover:underline font-semibold"
              >
                View Proof
              </button>
            </div>
          )}
        </div>

        {/* Interactive Action Control Panel for CA / CFO / MD / Chairman */}
        {isPending && canAction && (
          <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/40 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Authority Action Panel - Active User: {activeUser.name} ({activeUser.role})
              </h4>
            </div>

            {/* Action Choice Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActionType('APPROVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                ✓ Grant Permission / Final Approve
              </button>

              {(isBMgr || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setActionType('ESCALATE_CA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    actionType === 'ESCALATE_CA'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  ➔ Escalate to Chief Accountant
                </button>
              )}

              {(isCA || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setActionType('ESCALATE_CFO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    actionType === 'ESCALATE_CFO'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  ➔ Escalate to CFO (High Amount)
                </button>
              )}

              {(isCFO || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setActionType('ESCALATE_EXEC')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    actionType === 'ESCALATE_EXEC'
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  ➔ Escalate to Executive (MD / Chairman - Too High)
                </button>
              )}

              <button
                type="button"
                onClick={() => setActionType('REJECT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  actionType === 'REJECT'
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                ✕ Decline / Reject
              </button>
            </div>

            <textarea
              rows={2}
              placeholder={`Enter official remarks for ${actionType}...`}
              value={comments}
              onChange={e => setComments(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={handleExecuteAction}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/25 transition-all active:scale-95"
              >
                Execute Action ({actionType})
              </button>
            </div>
          </div>
        )}

        {/* Print Receipt Action for Billing Department when Approved */}
        {isApproved && (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>
                <strong>Discount Active & Verified:</strong> Ready for final billing payment settlement!
              </span>
            </div>

            <button
              onClick={handlePrintReceipt}
              className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:bg-emerald-300 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Billing Settlement Receipt
            </button>
          </div>
        )}

        {/* Dedicated Official Printable Receipt (Hidden on web UI screen, Visible on print - 1 Page Enforced) */}
        <div id="printable-settlement-receipt" className="hidden print:block text-slate-950 bg-white p-5 max-w-3xl mx-auto font-sans leading-snug text-xs">
          {/* Official Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3 flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-lg">
                SS
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-950">STAVYA SPINE HOSPITAL & RESEARCH INSTITUTE</h1>
                <p className="text-[11px] text-slate-600 font-medium">Opp. Gulmohar Park, Satellite, Ahmedabad | Phone: +91 (79) 2692-0000</p>
                <p className="text-[10px] text-slate-500">Reg No: STAVYA-SPINE-9902 | Spine & Orthopedic Super Specialty Division</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-rose-100 text-rose-950 font-black text-[10px] px-2.5 py-0.5 rounded border border-rose-300 uppercase tracking-wider mb-0.5">
                INTERNAL OFFICE COPY ONLY
              </span>
              <p className="text-xs font-mono font-bold text-slate-800">Voucher No: VOUCH-{request.requestCode}</p>
              <p className="text-[10px] text-slate-600">Issued Date: {new Date(request.approvalTimestamp || request.createdTimestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Office Use Warning Banner */}
          <div className="text-center py-1 px-3 bg-amber-100 border border-amber-300 text-amber-950 font-black text-[10px] uppercase tracking-widest rounded mb-3">
            🔒 STAVYA SPINE INTERNAL ACCOUNTS AUDIT USE ONLY — STRICTLY NOT FOR PATIENT DISTRIBUTION
          </div>

          {/* Title Banner */}
          <div className="text-center bg-slate-100 py-1.5 px-3 rounded border border-slate-300 mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              STAVYA SPINE HOSPITAL - INTERNAL BILLING DISCOUNT AUTHORIZATION SLIP
            </h2>
            <p className="text-[10px] text-slate-600">Hospital Cash Counter & Spine OPD Waiver Reconciliation Voucher</p>
          </div>

          {/* Patient & Billing Info Table */}
          <div className="grid grid-cols-2 gap-3 mb-3 border border-slate-300 rounded p-3 bg-slate-50/50">
            <div className="space-y-0.5 text-[11px]">
              <p><span className="font-semibold text-slate-500">Patient Name:</span> <strong className="text-slate-900 font-bold">{request.patientName}</strong></p>
              <p><span className="font-semibold text-slate-500">Patient UHID / ID:</span> <strong className="font-mono text-slate-900">{request.patientId}</strong></p>
              <p><span className="font-semibold text-slate-500">Age / Gender:</span> <span className="text-slate-900">{request.patientAge || 45} Yrs / {request.patientGender || 'Male'}</span></p>
              <p><span className="font-semibold text-slate-500">Department:</span> <span className="text-slate-900">{request.department}</span></p>
            </div>
            <div className="space-y-0.5 text-[11px] text-right">
              <p><span className="font-semibold text-slate-500">Bill Receipt No:</span> <strong className="font-mono text-slate-900">{request.receiptNo || 'RCP-99102'}</strong></p>
              <p><span className="font-semibold text-slate-500">OPD / IPD File No:</span> <strong className="font-mono text-slate-900">{request.opdIpdNo || 'OPD-5501'}</strong></p>
              <p><span className="font-semibold text-slate-500">Attending Doctor:</span> <span className="text-slate-900">{request.doctorName || 'Dr. Michael Chang'}</span></p>
              <p><span className="font-semibold text-slate-500">Service Particulars:</span> <span className="text-slate-900">{request.serviceName || 'Consultation & Diagnostics'}</span></p>
            </div>
          </div>

          {/* Financial Waiver Summary Table */}
          <table className="w-full text-[11px] border-collapse border border-slate-400 mb-3">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold text-left border-b border-slate-400">
                <th className="p-2 border-r border-slate-400">Financial Particulars</th>
                <th className="p-2 text-center border-r border-slate-400">Waiver (%)</th>
                <th className="p-2 text-right border-r border-slate-400">Gross Total (₹)</th>
                <th className="p-2 text-right border-r border-slate-400">Discount Granted (₹)</th>
                <th className="p-2 text-right">Net Bill Payable (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="p-2 border-r border-slate-300 font-semibold">{request.particulars || 'Medical Procedure & Hospital Services'}</td>
                <td className="p-2 text-center border-r border-slate-300 font-bold text-teal-800">{request.requestedDiscountVal}%</td>
                <td className="p-2 text-right border-r border-slate-300">₹{Number(request.totalBillAmount).toLocaleString('en-IN')}</td>
                <td className="p-2 text-right border-r border-slate-300 font-bold text-teal-700">-₹{Number(request.calculatedDiscountAmount).toLocaleString('en-IN')}</td>
                <td className="p-2 text-right font-black text-xs text-slate-950">₹{Number(request.finalPayableAmount).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          {/* Waiver Justification Category */}
          <div className="mb-3 border-l-4 border-teal-600 bg-teal-50/60 p-2.5 rounded text-[11px]">
            <p className="font-bold text-teal-950 mb-0.5">Approved Concession Reason & Category:</p>
            <p className="text-slate-800"><strong>{request.reasonCategory}:</strong> {request.detailedReason || 'Financial concession granted per hospital administrative waiver guidelines.'}</p>
            {request.approverComments && (
              <p className="text-slate-700 mt-0.5 italic"><strong>Official Approver Remarks:</strong> "{request.approverComments}"</p>
            )}
          </div>

          {/* Verification Seal & Approval Authority Signatures */}
          <div className="mt-4 pt-3 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-[11px]">
            <div>
              <p className="font-semibold text-slate-500 mb-0.5">Requested By (Billing):</p>
              <p className="font-bold text-slate-900">{request.requestedBy || 'Front Desk Staff'}</p>
              <p className="text-[10px] text-slate-500">Billing Counter Officer</p>
            </div>

            <div className="text-center">
              <div className="inline-block border-2 border-emerald-700 text-emerald-800 px-2.5 py-0.5 rounded font-black text-[10px] tracking-wider uppercase mb-0.5">
                ✓ VERIFIED & APPROVED
              </div>
              <p className="font-bold text-slate-900 mt-0.5">{request.approvedBy || 'Chief Financial Officer'}</p>
              <p className="text-[10px] text-slate-500">Authorized Financial Signatory</p>
            </div>

            <div className="text-right">
              <p className="font-semibold text-slate-500 mb-4">Accounts & Audit Verification:</p>
              <div className="border-b border-slate-400 w-32 ml-auto"></div>
              <p className="text-[10px] text-slate-500 mt-0.5">Accounts Officer / Date</p>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-0.5">
            <p>CONFIDENTIAL: Internal hospital financial waiver voucher for accounts reconciliation and revenue audit only.</p>
            <p>Security Verification ID: INTERNAL-AUTH-{request.requestCode}-{new Date().getTime().toString().substr(-6)}</p>
          </div>
        </div>

        {/* Doctor Biometric & Passcode Verification Modal */}
        <DoctorBiometricModal 
          isOpen={showBiometricModal}
          doctorName={request.doctorName || activeUser.name}
          request={request}
          onVerified={handleBiometricVerified}
          onCancel={() => setShowBiometricModal(false)}
        />

      </div>
    </div>
  );
};
