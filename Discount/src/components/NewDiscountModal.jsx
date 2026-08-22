import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, 
  User, 
  IndianRupee, 
  Percent, 
  AlertCircle, 
  ShieldAlert, 
  ShieldCheck,
  UploadCloud, 
  CheckCircle,
  Building,
  Stethoscope,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const NewDiscountModal = ({ onClose }) => {
  const { createDiscountRequest, createDirectExecutiveGrant, getRequiredAuthorityForDiscount, activeUser, users, departments, services, doctors, getDepartmentForService } = useApp();

  const isExecutive = ['CHAIRMAN', 'VICE_CHAIRMAN', 'MD'].includes(activeUser?.role);
  const [isDirectGrantMode, setIsDirectGrantMode] = useState(isExecutive);

  const defaultService = (services && services[0]) || 'Consultation Fees';
  const defaultDept = getDepartmentForService ? getDepartmentForService(defaultService) : (departments[0] || 'OPD');

  const [formData, setFormData] = useState({
    patientId: 'PT-' + Math.floor(10000 + Math.random() * 90000),
    patientName: '',
    patientAge: 45,
    patientGender: 'Male',
    department: defaultDept,
    serviceName: defaultService,
    doctorName: (doctors && doctors[0]) || 'Dr. Michael Chang',
    receiptNo: 'RCP-' + Math.floor(10000 + Math.random() * 90000),
    billDate: new Date().toISOString().split('T')[0],
    opdIpdNo: 'OPD-' + Math.floor(1000 + Math.random() * 9000),
    referenceName: 'Dr. Michael Chang',
    relativeName: '',
    particulars: 'Consultation & Clinical Procedure Particulars',
    totalBillAmount: 25000,
    requestedDiscountType: 'PERCENTAGE',
    requestedDiscountVal: 20,
    targetApprovalRole: 'CFO',
    reasonCategory: 'Below Poverty Line / Emergency Charity',
    detailedReason: '',
    proofFileName: ''
  });

  // Calculate live financials
  const bill = Number(formData.totalBillAmount) || 0;
  let discountVal = Number(formData.requestedDiscountVal) || 0;
  let calculatedDiscount = 0;

  if (formData.requestedDiscountType === 'FIXED') {
    calculatedDiscount = discountVal;
    discountVal = bill > 0 ? Number(((calculatedDiscount / bill) * 100).toFixed(1)) : 0;
  } else {
    calculatedDiscount = Number(((bill * discountVal) / 100).toFixed(2));
  }

  const netPayable = Math.max(0, bill - calculatedDiscount);

  // Determine required authority level & target user
  const authorityTarget = getRequiredAuthorityForDiscount(discountVal, calculatedDiscount, formData.targetApprovalRole);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.detailedReason) return;

    if (isDirectGrantMode && isExecutive) {
      createDirectExecutiveGrant({
        ...formData,
        requestedDiscountVal: discountVal,
        calculatedDiscountAmount: calculatedDiscount,
        finalPayableAmount: netPayable
      });
    } else {
      createDiscountRequest({
        ...formData,
        requestedDiscountVal: discountVal,
        calculatedDiscountAmount: calculatedDiscount,
        finalPayableAmount: netPayable
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative my-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100">
                {isDirectGrantMode ? 'Issue Direct Executive Discount to Patient' : 'Submit Discount Permission Request'}
              </h3>
              <p className="text-xs text-slate-400">
                {isDirectGrantMode 
                  ? 'Directly grants discount to patient with CFO & Chief Accountant assistance (Immediately active on Billing Desk)'
                  : 'Submitted at payment time ➔ Chief Accountant permission ➔ CFO (if High) ➔ MD/Chairman (if Too High)'}
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

        {/* Executive Direct Mode Switcher if user is Executive */}
        {isExecutive && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-200 block">Executive Board Action</span>
                <span className="text-[11px] text-amber-300/80">Logged in as {activeUser.name} ({activeUser.role})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDirectGrantMode(!isDirectGrantMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                isDirectGrantMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              {isDirectGrantMode ? 'Direct Executive Grant Active' : 'Switch to Standard Billing Request'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Patient Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient ID</label>
              <input
                type="text"
                required
                value={formData.patientId}
                onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Robert Chen"
                value={formData.patientName}
                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Age</label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.patientAge}
                onChange={e => setFormData({ ...formData, patientAge: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
              <select
                value={formData.patientGender}
                onChange={e => setFormData({ ...formData, patientGender: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-teal-400 mb-1">
                Hospital Service
              </label>
              <select
                value={formData.serviceName}
                onChange={e => {
                  const sName = e.target.value;
                  const mappedDept = getDepartmentForService ? getDepartmentForService(sName) : formData.department;
                  setFormData({ ...formData, serviceName: sName, department: mappedDept });
                }}
                className="w-full bg-slate-900 border border-teal-500/50 rounded-xl px-3 py-2 text-sm text-teal-300 font-semibold focus:outline-none focus:border-teal-400"
              >
                {services.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Attending Doctor</label>
              <select
                value={formData.doctorName}
                onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {(doctors || []).map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Receipt & Registration Particulars Section */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Receipt Particulars & Patient Reference Info
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RCP-2026-9042"
                  value={formData.receiptNo}
                  onChange={e => setFormData({ ...formData, receiptNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bill Date / Receipt Date</label>
                <input
                  type="date"
                  required
                  value={formData.billDate}
                  onChange={e => setFormData({ ...formData, billDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">OPD / IPD No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OPD-88210 / IPD-4412"
                  value={formData.opdIpdNo}
                  onChange={e => setFormData({ ...formData, opdIpdNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Staff / Doctor / Reference Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Michael Chang / Nurse Sarah"
                  value={formData.referenceName}
                  onChange={e => setFormData({ ...formData, referenceName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Name / Relative Name</label>
                <input
                  type="text"
                  placeholder="e.g. Robert Chen (Father: James Chen)"
                  value={formData.relativeName}
                  onChange={e => setFormData({ ...formData, relativeName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Particulars (Billing Item Particulars)</label>
              <input
                type="text"
                placeholder="e.g. MRI Brain Scan + OPD Consultation Charge Waiver"
                value={formData.particulars}
                onChange={e => setFormData({ ...formData, particulars: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Financials & Discount Calculator */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4" />
              Bill Payment & Discount Waiver Calculation (INR ₹)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Bill Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.totalBillAmount}
                  onChange={e => setFormData({ ...formData, totalBillAmount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Mode</label>
                <select
                  value={formData.requestedDiscountType}
                  onChange={e => setFormData({ ...formData, requestedDiscountType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-300 mb-1">
                  {formData.requestedDiscountType === 'PERCENTAGE' ? 'Requested Discount (%)' : 'Requested Discount (₹)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={formData.requestedDiscountType === 'PERCENTAGE' ? 100 : bill}
                  required
                  value={formData.requestedDiscountVal}
                  onChange={e => setFormData({ ...formData, requestedDiscountVal: e.target.value })}
                  className="w-full bg-slate-950 border border-teal-500/60 rounded-xl px-3.5 py-2 text-sm font-extrabold text-teal-300 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {/* Quick Discount Matrix Select Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Discount Matrix Preset Tiers:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        requestedDiscountType: 'PERCENTAGE',
                        requestedDiscountVal: pct
                      });
                    }}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      Number(formData.requestedDiscountVal) === pct && formData.requestedDiscountType === 'PERCENTAGE'
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-lg shadow-teal-500/20 scale-[1.02]'
                        : 'bg-slate-950 text-teal-300 border-slate-800 hover:border-teal-500/50 hover:bg-slate-900'
                    }`}
                  >
                    <span>{pct}%</span>
                    <span className="text-[9px] opacity-75 font-normal">
                      {pct === 10 ? '(Routine)' : pct === 25 ? '(Staff/Doc)' : pct === 50 ? '(Hardship)' : '(100% BPL)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Breakdown Display */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Patient Bill</span>
                <span className="text-sm font-extrabold text-slate-200">₹{bill.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-teal-400 uppercase font-bold block">Calculated Waiver</span>
                <span className="text-sm font-extrabold text-teal-400">-₹{calculatedDiscount.toLocaleString('en-IN')} ({discountVal}%)</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">Final Payable at Billing</span>
                <span className="text-sm font-extrabold text-emerald-400">₹{netPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Target Approval Authority Selector & Dynamic Visualizer */}
          {!isDirectGrantMode && (
            <div className="p-4.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Target Approval Authority</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Select required approver or let system calculate based on waiver amount
                  </p>
                </div>

                <select
                  value={formData.targetApprovalRole}
                  onChange={e => setFormData({ ...formData, targetApprovalRole: e.target.value })}
                  className="bg-slate-950 border border-purple-500/50 text-purple-200 font-extrabold rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="BILLING_MANAGER">Finance Manager (Up to ₹25,000/-)</option>
                  <option value="CFO">CFO (Above ₹25,000/- to ₹2,00,000/-)</option>
                  <option value="MD">MD / Vice Chairman / Chairman / Director (Above ₹2,00,000/-)</option>
                </select>
              </div>

              {/* Stepper Preview */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800 font-semibold text-slate-300">
                <div className={`flex items-center gap-1.5 ${authorityTarget.role === 'BILLING_MANAGER' ? 'text-teal-300 font-bold' : 'text-slate-400'}`}>
                  <span className={`h-5 w-5 rounded-full font-bold flex items-center justify-center text-[10px] ${authorityTarget.role === 'BILLING_MANAGER' ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
                  <span>Finance Manager</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                
                <div className={`flex items-center gap-1.5 ${authorityTarget.role === 'CHIEF_ACCOUNTANT' ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                  <span className={`h-5 w-5 rounded-full font-bold flex items-center justify-center text-[10px] ${authorityTarget.role === 'CHIEF_ACCOUNTANT' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
                  <span>Chief Accountant</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

                <div className={`flex items-center gap-1.5 ${authorityTarget.role === 'CFO' ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                  <span className={`h-5 w-5 rounded-full font-bold flex items-center justify-center text-[10px] ${authorityTarget.role === 'CFO' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>3</span>
                  <span>CFO</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

                <div className={`flex items-center gap-1.5 ${['MD', 'DIRECTOR', 'EXECUTIVE'].includes(authorityTarget.role) ? 'text-rose-300 font-extrabold' : 'text-slate-400'}`}>
                  <span className={`h-5 w-5 rounded-full font-bold flex items-center justify-center text-[10px] ${['MD', 'DIRECTOR', 'EXECUTIVE'].includes(authorityTarget.role) ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>4</span>
                  <span>Director / MD</span>
                </div>
              </div>
            </div>
          )}

          {/* Justification & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason Category</label>
              <select
                value={formData.reasonCategory}
                onChange={e => setFormData({ ...formData, reasonCategory: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="Below Poverty Line / Emergency Charity">Below Poverty Line / Emergency Charity</option>
                <option value="Staff / Relative Welfare">Staff / Relative Welfare</option>
                <option value="Management Special Grant">Management Special Grant</option>
                <option value="Package Adjustment / Routine">Package Adjustment / Routine</option>
                <option value="Disputed Billing Correction">Disputed Billing Correction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Attach Proof / Order Document</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. BPL_Verification_Card.pdf"
                  value={formData.proofFileName}
                  onChange={e => setFormData({ ...formData, proofFileName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                />
                <UploadCloud className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Detailed Case Justification & Notes (Mandatory)
            </label>
            <textarea
              rows={3}
              required
              placeholder="Provide detailed reasons for asking discount during patient payment time..."
              value={formData.detailedReason}
              onChange={e => setFormData({ ...formData, detailedReason: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-slate-950 font-black text-sm shadow-xl transition-all active:scale-95 ${
                isDirectGrantMode
                  ? 'bg-gradient-to-r from-amber-300 to-emerald-300 hover:from-amber-200 hover:to-emerald-200 shadow-amber-500/25'
                  : 'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-teal-500/25'
              }`}
            >
              {isDirectGrantMode ? 'Grant Executive Discount Directly to Patient' : 'Dispatch Permission Request'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
