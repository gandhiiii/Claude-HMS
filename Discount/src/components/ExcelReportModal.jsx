import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/excelExporter';
import { FileSpreadsheet, Download, Calendar, Filter, CheckCircle } from 'lucide-react';

export const ExcelReportModal = ({ onClose }) => {
  const { requests, users } = useApp();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authorityFilter, setAuthorityFilter] = useState('ALL');
  const [reportTitle, setReportTitle] = useState('Hospital Discount Audit Report');

  const handleExport = () => {
    const filtered = requests.filter(r => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchAuth = authorityFilter === 'ALL' || r.requiredAuthorityRole === authorityFilter;
      return matchStatus && matchAuth;
    });

    exportToExcel(filtered, users, `${reportTitle} (${statusFilter} - ${authorityFilter})`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="glass-card w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 border border-slate-700 shadow-2xl relative custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Export Formatted Excel Report (.xlsx)</h3>
              <p className="text-xs text-slate-400">Generates comprehensive spreadsheet audit report</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Report Header Title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={e => setReportTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses (Pending, Approved, Rejected)</option>
                <option value="APPROVED">Approved Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Filter by Approver Role</label>
              <select
                value={authorityFilter}
                onChange={e => setAuthorityFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Approval Tiers</option>
                <option value="CHAIRMAN">Chairman Tier Only</option>
                <option value="MD">MD Tier Only</option>
                <option value="MANAGER">Manager Tier Only</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <span className="font-bold text-emerald-400 block">Included Excel Columns:</span>
            <p className="text-slate-400 leading-relaxed">
              Request Code, Timestamp, Patient ID, Patient Name, Age/Gender, Department, Doctor, Total Bill ($), Discount Type, Requested %, Discount Amount ($), Net Payable ($), Reason Category, Detailed Justification, Requested By, Required Authority, Approver Name, Status, Remarks.
            </p>
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
              onClick={handleExport}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Generate & Download Excel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
