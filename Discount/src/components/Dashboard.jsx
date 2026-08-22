import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestCard } from './RequestCard';
import { 
  IndianRupee, 
  Percent, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Search, 
  Filter, 
  ShieldAlert, 
  FileSpreadsheet,
  PieChart as PieIcon,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export const Dashboard = ({ onSelectRequest, onOpenNewModal, onOpenExcelModal }) => {
  const { requests, activeUser, services } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authorityFilter, setAuthorityFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [matrixFilter, setMatrixFilter] = useState('ALL');

  // Key KPI metrics calculations
  const totalBillSum = requests.reduce((acc, r) => acc + Number(r.totalBillAmount || 0), 0);
  const approvedRequests = requests.filter(r => r.status === 'APPROVED');
  const pendingRequests = requests.filter(r => r.status?.startsWith('PENDING'));
  const rejectedRequests = requests.filter(r => r.status === 'REJECTED');
  const directGrantRequests = requests.filter(r => r.isDirectExecutiveGrant);

  const totalDiscountGranted = approvedRequests.reduce((acc, r) => acc + Number(r.calculatedDiscountAmount || 0), 0);
  const pendingDiscountValue = pendingRequests.reduce((acc, r) => acc + Number(r.calculatedDiscountAmount || 0), 0);
  
  const approvalRate = requests.length > 0 ? ((approvedRequests.length / requests.length) * 100).toFixed(0) : 0;

  // Chart Data 1: Departmental Breakdown
  const deptDataMap = requests.reduce((acc, r) => {
    const dept = r.department.split(' ')[0];
    const val = Number(r.calculatedDiscountAmount || 0);
    acc[dept] = (acc[dept] || 0) + val;
    return acc;
  }, {});

  const departmentChartData = Object.keys(deptDataMap).map(dept => ({
    department: dept,
    discountAmount: deptDataMap[dept]
  }));

  // Chart Data 2: Reason Distribution
  const reasonDataMap = requests.reduce((acc, r) => {
    const reason = r.reasonCategory.split('/')[0].trim();
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];
  const reasonChartData = Object.keys(reasonDataMap).map(reason => ({
    name: reason,
    value: reasonDataMap[reason]
  }));

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch = (
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requestCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = 
      statusFilter === 'ALL' || 
      r.status === statusFilter || 
      (statusFilter === 'PENDING' && r.status?.startsWith('PENDING')) ||
      (statusFilter === 'PENDING_CFO' && (r.status === 'PENDING_CFO' || (r.requiredAuthorityRole === 'CFO' && r.status?.startsWith('PENDING'))));

    const matchesAuthority = 
      authorityFilter === 'ALL' || 
      r.requiredAuthorityRole === authorityFilter || 
      r.currentApproverRole === authorityFilter ||
      (authorityFilter === 'CFO' && (r.requiredAuthorityRole === 'CFO' || r.status === 'PENDING_CFO'));
    const matchesService = serviceFilter === 'ALL' || r.serviceName === serviceFilter;
    const matchesMatrix = matrixFilter === 'ALL' || Number(r.requestedDiscountVal) === Number(matrixFilter);

    return matchesSearch && matchesStatus && matchesAuthority && matchesService && matchesMatrix;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            Stavya Spine Hospital & Research Institute Pvt. Ltd.
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold uppercase tracking-wider">
              Stavya Intelligence
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Stavya Billing Desk ➔ Chief Accountant ➔ CFO Permission ➔ MD/Chairman Approval • Live Sync
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenExcelModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 border-l-4 border-l-teal-500 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Discount Authorized</span>
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-teal-300">
              ₹{totalDiscountGranted.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Out of ₹{totalBillSum.toLocaleString('en-IN')} gross billings</span>
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 border-l-4 border-l-amber-500 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Permissions</span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-amber-300">{pendingRequests.length}</h3>
              <span className="text-xs text-amber-400 font-bold">(₹{pendingDiscountValue.toLocaleString('en-IN')})</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Chief Accountant / CFO / MD / Chairman</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 border-l-4 border-l-emerald-500 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approval Ratio</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-emerald-400">{approvalRate}%</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {approvedRequests.length} approved • {rejectedRequests.length} rejected
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 border-l-4 border-l-indigo-500 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Exec Grants</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-purple-300">{directGrantRequests.length}</h3>
            <p className="text-[11px] font-semibold text-teal-400 mt-1">
              Direct MD / Chairman Patient Waivers
            </p>
          </div>
        </div>

      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Discount Value by Department */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-sm text-slate-200">Discount Waiver Granted by Department (₹)</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Live Analytics</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '12px', fontSize: '12px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Discount Waiver']}
                />
                <Bar dataKey="discountAmount" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Reason Breakdown */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm text-slate-200">Requests Breakdown by Reason Category</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Proportion</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reasonChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reasonChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '12px', fontSize: '12px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(val, name) => [`${val} Request(s)`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search patient, ID, doctor, or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {['ALL', 'PENDING', 'PENDING_CFO', 'APPROVED', 'REJECTED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st 
                      ? 'bg-teal-500 text-slate-950 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'PENDING_CFO' ? 'Pending CFO' : st}
                </button>
              ))}
            </div>

            {/* Authority Target Filter */}
            <select
              value={authorityFilter}
              onChange={e => setAuthorityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-semibold"
            >
              <option value="ALL">All Approval Procedure Tiers</option>
              <option value="BILLING_MANAGER">Finance Manager (Up to ₹25,000/-)</option>
              <option value="CFO">CFO (Above ₹25,000/- - ₹2,00,000/-)</option>
              <option value="MD">MD / Vice Chairman / Chairman / Director (Above ₹2,00,000/-)</option>
            </select>

            {/* Hospital Service Filter */}
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="bg-slate-900 border border-teal-500/40 text-teal-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none font-semibold"
            >
              <option value="ALL">All Hospital Services</option>
              {services.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Discount Matrix Filter */}
            <select
              value={matrixFilter}
              onChange={e => setMatrixFilter(e.target.value)}
              className="bg-slate-900 border border-cyan-500/50 text-cyan-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none font-bold"
            >
              <option value="ALL">All Matrix Tiers</option>
              <option value="10">10% Matrix</option>
              <option value="25">25% Matrix</option>
              <option value="50">50% Matrix</option>
              <option value="100">100% Matrix (Full Charity)</option>
            </select>

          </div>

        </div>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-slate-800">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-slate-300">No discount requests found</h4>
          <p className="text-xs text-slate-500 mt-1">Try resetting search filters or submit a new discount request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequests.map(req => (
            <RequestCard key={req.id} request={req} onSelect={onSelectRequest} />
          ))}
        </div>
      )}

    </div>
  );
};
