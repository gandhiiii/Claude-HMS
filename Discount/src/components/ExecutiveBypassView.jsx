import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, ShieldAlert, Zap, CheckCircle2, UserCheck, Lock } from 'lucide-react';

export const ExecutiveBypassView = ({ onSelectRequest }) => {
  const { requests, activeUser, users, updateUser, directApproveDiscountRequest, triggerToast } = useApp();

  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(activeUser?.role) || activeUser?.username === 'admin' || !!activeUser?.isSuperAdmin;
  const userHasBypassRight = isAdmin || !!activeUser?.canBypassApproval || ['CHAIRMAN', 'VICE_CHAIRMAN', 'MD'].includes(activeUser?.role);

  const pendingRequests = requests.filter(r => r.status && r.status.startsWith('PENDING'));

  const handleBypassApprove = (reqId) => {
    if (!userHasBypassRight) {
      triggerToast('You are not authorized to bypass approval matrix. Admin must grant you Bypass Privilege.', 'warning');
      return;
    }
    if (window.confirm('Are you sure you want to BYPASS approval matrix and approve this discount request immediately?')) {
      directApproveDiscountRequest(reqId, 'Approved via Direct Executive Grant (Bypassed Matrix)');
      triggerToast('Discount request approved via Executive Bypass!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-bold text-slate-100">Executive Bypass Approval Matrix</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Direct Executive Bypass allows authorized users to approve discount requests immediately, bypassing standard 3-tier routing.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Bypass Privilege:</span>
            <span className={`text-xs font-black uppercase ${userHasBypassRight ? 'text-amber-400' : 'text-slate-500'}`}>
              {userHasBypassRight ? '⚡ Active (Granted)' : '🔒 Restricted'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin User Rights Directory Panel */}
      {isAdmin && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-400" />
                Admin User Bypass Privilege Directory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Select individual user accounts below to grant or revoke Executive Bypass Approval rights.</p>
            </div>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Admin Control Panel
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => {
              const isSysAdmin = u.role === 'ADMIN' || u.username === 'admin' || u.isSuperAdmin;
              const hasBypass = isSysAdmin || !!u.canBypassApproval;

              return (
                <div key={u.id || u.username} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{u.name || u.fullName || u.username}</h4>
                    <span className="text-[10px] text-slate-400 block">{u.role || 'USER'} • {u.department || 'General'}</span>
                    <span className={`text-[10px] font-extrabold mt-1 block ${hasBypass ? 'text-amber-400' : 'text-slate-500'}`}>
                      {hasBypass ? '⚡ Bypass Privilege Active' : '🔒 Standard Routing Only'}
                    </span>
                  </div>

                  {isSysAdmin ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                      Admin
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateUser(u.id, { canBypassApproval: !u.canBypassApproval })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                        u.canBypassApproval
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {u.canBypassApproval ? 'Revoke Bypass' : 'Grant Bypass'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Requests Table Available for Bypass */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-200">
          📋 Pending Requests Available for Executive Bypass Approval
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No pending discount requests currently requiring bypass approval.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-900/50">
                  <th className="p-3">Request Code</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Discount Waiver</th>
                  <th className="p-3">Net Payable</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Bypass Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-sky-400">{req.requestCode}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      {req.patientName}
                      <span className="block text-[10px] text-slate-500 font-mono">{req.patientId}</span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{req.department}</td>
                    <td className="p-3 font-bold text-sky-300">
                      ₹{Number(req.calculatedDiscountAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-bold text-emerald-400">
                      ₹{Number(req.finalPayableAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {userHasBypassRight ? (
                        <button
                          type="button"
                          onClick={() => handleBypassApprove(req.id)}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] hover:opacity-90 transition-opacity shadow-md"
                        >
                          ⚡ Bypass & Approve
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" /> No Bypass Right
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
