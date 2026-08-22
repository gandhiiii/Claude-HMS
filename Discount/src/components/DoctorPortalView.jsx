import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestCard } from './RequestCard';
import { 
  Stethoscope, 
  PlusCircle, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Search, 
  Building, 
  Filter, 
  ShieldCheck,
  UserCheck,
  FileText
} from 'lucide-react';

export const DoctorPortalView = ({ onSelectRequest, onOpenNewModal }) => {
  const { requests, activeUser, createDiscountRequest, triggerToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  const doctorName = activeUser?.name || 'Attending Doctor';

  // Filter requests ONLY for this specific doctor's patients
  const doctorRequests = requests.filter(r => {
    const isMyPatient = (
      (r.doctorName && r.doctorName.toLowerCase().includes(doctorName.toLowerCase())) ||
      (r.referenceName && r.referenceName.toLowerCase().includes(doctorName.toLowerCase())) ||
      (r.requestedBy && r.requestedBy.toLowerCase().includes(doctorName.toLowerCase()))
    );

    const matchesSearch = (
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requestCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = 
      statusFilter === 'ALL' || 
      r.status === statusFilter || 
      (statusFilter === 'PENDING' && r.status?.startsWith('PENDING'));

    return isMyPatient && matchesSearch && matchesStatus;
  });

  // Doctor's Own Patient KPI Statistics
  const totalPatientRequestsCount = doctorRequests.length;
  const approvedDoctorRequests = doctorRequests.filter(r => r.status === 'APPROVED');
  const pendingDoctorRequests = doctorRequests.filter(r => r.status?.startsWith('PENDING'));
  
  const totalConcessionsAmount = approvedDoctorRequests.reduce(
    (sum, r) => sum + Number(r.calculatedDiscountAmount || 0), 0
  );
  const pendingConcessionsAmount = pendingDoctorRequests.reduce(
    (sum, r) => sum + Number(r.calculatedDiscountAmount || 0), 0
  );

  // Doctor Direct Concession Modal Form State
  const [docFormData, setDocFormData] = useState({
    patientName: '',
    patientId: `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    patientAge: '45',
    patientGender: 'Male',
    targetDepartment: 'OPD',
    targetPlace: 'OPD Reception',
    totalBillAmount: '12500',
    discountVal: '15',
    reasonCategory: 'Management Special Grant',
    detailedReason: 'Consultant doctor recommended concession for patient medical treatment.'
  });

  const handleCreateDoctorConcession = (e) => {
    e.preventDefault();
    if (!docFormData.patientName.trim()) {
      triggerToast('Please provide patient name.', 'warning');
      return;
    }

    const payload = {
      patientName: docFormData.patientName.trim(),
      patientId: docFormData.patientId.trim(),
      patientAge: docFormData.patientAge,
      patientGender: docFormData.patientGender,
      department: docFormData.targetDepartment,
      serviceName: docFormData.targetPlace,
      doctorName: doctorName,
      particulars: `Doctor Concession for ${docFormData.targetPlace} (${docFormData.targetDepartment})`,
      totalBillAmount: Number(docFormData.totalBillAmount),
      requestedDiscountType: 'PERCENTAGE',
      requestedDiscountVal: Number(docFormData.discountVal),
      reasonCategory: docFormData.reasonCategory,
      detailedReason: docFormData.detailedReason,
      targetApprovalRole: 'BILLING_MANAGER'
    };

    createDiscountRequest(payload);
    setShowDoctorModal(false);
    setDocFormData({
      patientName: '',
      patientId: `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientAge: '45',
      patientGender: 'Male',
      targetDepartment: 'OPD',
      targetPlace: 'OPD Reception',
      totalBillAmount: '12500',
      discountVal: '15',
      reasonCategory: 'Management Special Grant',
      detailedReason: 'Consultant doctor recommended concession for patient medical treatment.'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Doctor Header Banner */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> Consultant Doctor Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {activeUser.username || activeUser.id}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
              Welcome, {doctorName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Viewing own patient discount requests, amounts, and direct concession requests routed to OPD, IPD, Physiotherapy, Rehab & Support.
            </p>
          </div>

          <button
            onClick={() => setShowDoctorModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 hover:from-emerald-300 hover:to-teal-300 transition-all active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            + Issue Direct Patient Concession
          </button>
        </div>
      </div>

      {/* Doctor Own Patient Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Patient Count */}
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              My Patient Requests Count
            </span>
            <span className="text-2xl font-black text-slate-100 mt-1 block">
              {totalPatientRequestsCount} Patients
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
              {approvedDoctorRequests.length} Approved / {pendingDoctorRequests.length} Pending
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Concessions Amount */}
        <div className="glass-card p-5 rounded-2xl border border-teal-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              My Total Concessions Granted
            </span>
            <span className="text-2xl font-black text-teal-300 mt-1 block">
              ₹{totalConcessionsAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-teal-400 font-semibold block mt-0.5">
              Cumulative Waiver Amount
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div className="glass-card p-5 rounded-2xl border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              My Pending Concessions
            </span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              ₹{pendingConcessionsAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-amber-400 font-semibold block mt-0.5">
              {pendingDoctorRequests.length} Requests Awaiting Clearance
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Executive Visibility Seal */}
        <div className="glass-card p-5 rounded-2xl border border-purple-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Executive Board Audit
            </span>
            <span className="text-sm font-extrabold text-purple-300 mt-1 block">
              Visible to MD & Chairman
            </span>
            <span className="text-[11px] text-purple-400 font-semibold block mt-0.5">
              Access Granted by Admin
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={`Search ${doctorName}'s patient requests by name, UHID, or code...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-emerald-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved Concessions</option>
            <option value="REJECTED">Declined Requests</option>
          </select>
        </div>
      </div>

      {/* Doctor's Own Requests Grid */}
      {doctorRequests.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-slate-800 space-y-3">
          <Stethoscope className="w-12 h-12 text-emerald-400/50 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Patient Discount Requests Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You do not have any patient discount requests matching the selected filters for {doctorName}. Click below to create a direct concession!
          </p>
          <button
            onClick={() => setShowDoctorModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Issue Patient Concession
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctorRequests.map(req => (
            <RequestCard 
              key={req.id} 
              request={req} 
              onSelect={onSelectRequest} 
            />
          ))}
        </div>
      )}

      {/* Modal for Direct Doctor Concession Creation */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 border border-emerald-500/40 shadow-2xl relative my-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">
                    Direct Doctor Concession Request
                  </h3>
                  <p className="text-xs text-emerald-300 font-semibold">{doctorName}</p>
                </div>
              </div>

              <button
                onClick={() => setShowDoctorModal(false)}
                className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoctorConcession} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Shah"
                    value={docFormData.patientName}
                    onChange={e => setDocFormData({ ...docFormData, patientName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">UHID / Patient ID</label>
                  <input
                    type="text"
                    placeholder="UHID-2026-8801"
                    value={docFormData.patientId}
                    onChange={e => setDocFormData({ ...docFormData, patientId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Target Department / Billing Desk Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    Target Department / Place *
                  </label>
                  <select
                    value={docFormData.targetDepartment}
                    onChange={e => setDocFormData({ ...docFormData, targetDepartment: e.target.value })}
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-emerald-200 font-bold focus:outline-none focus:border-emerald-400"
                  >
                    <option value="OPD">OPD Reception</option>
                    <option value="Clinical Operation">IPD Billing Desk</option>
                    <option value="Advance Modality Center">Physiotherapy (AMC)</option>
                    <option value="Advance Modality Center">Rehab Center (AMC)</option>
                    <option value="Pharmcy">Pharmacy</option>
                    <option value="F&B">F&B / Canteen</option>
                    <option value="Radiology">Radiology (MRI/CT)</option>
                    <option value="Other Support Service">Other Support Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">
                    Specific Service Place
                  </label>
                  <select
                    value={docFormData.targetPlace}
                    onChange={e => setDocFormData({ ...docFormData, targetPlace: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-cyan-200 font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="OPD Reception">OPD Reception Counter</option>
                    <option value="IPD Billing Desk">IPD Room & Surgery Billing</option>
                    <option value="Physiotherapy">Physiotherapy Session</option>
                    <option value="Rehab">Spine Rehab Concession</option>
                    <option value="Pharmcy">Pharmacy Medicines</option>
                    <option value="MRI">MRI / CT Scan</option>
                    <option value="Consultation Fees">Consultation Fees Waiver</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gross Bill Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={docFormData.totalBillAmount}
                    onChange={e => setDocFormData({ ...docFormData, totalBillAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-teal-300 mb-1">Concession (% Required)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={docFormData.discountVal}
                    onChange={e => setDocFormData({ ...docFormData, discountVal: e.target.value })}
                    className="w-full bg-slate-900 border border-teal-500/50 rounded-xl px-3.5 py-2 text-xs text-teal-300 font-bold focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical / Concession Reason</label>
                <textarea
                  rows={2}
                  required
                  value={docFormData.detailedReason}
                  onChange={e => setDocFormData({ ...docFormData, detailedReason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  Submit Doctor Concession
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
