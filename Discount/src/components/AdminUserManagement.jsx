import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Percent, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  UserCircle,
  AlertCircle,
  Building,
  Info,
  Sparkles,
  Stethoscope
} from 'lucide-react';

export const AdminUserManagement = () => {
  const { 
    users, 
    addUser, 
    updateUser, 
    deleteUser, 
    activeUser, 
    setActiveUser,
    departments,
    addDepartment,
    deleteDepartment,
    services,
    addService,
    deleteService,
    getDepartmentForService,
    doctors,
    addDoctor,
    deleteDoctor,
    clearAllDoctors,
    getRoleMeta
  } = useApp();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');

  const [editingDesignationId, setEditingDesignationId] = useState(null);
  const [editingDesignationText, setEditingDesignationText] = useState('');

  const isAdmin = activeUser?.role === 'ADMIN';

  // New user form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'CHIEF_ACCOUNTANT',
    designation: '',
    department: 'Billing & Accounts',
    email: '',
    phone: ''
  });

  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [showFormPassword, setShowFormPassword] = useState(false);

  const toggleCardPassword = (userId) => {
    setShowPasswordMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleNameChange = (nameVal) => {
    const autoUsername = nameVal.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    setFormData(prev => ({
      ...prev,
      name: nameVal,
      username: prev.username || autoUsername,
      email: prev.email || (autoUsername ? `${autoUsername}@carepulse.com` : ''),
      phone: prev.phone || '+1 (555) 000-1122'
    }));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.name || !formData.name.trim()) {
      triggerToast('Please provide a name for the new user.', 'warning');
      return;
    }

    const cleanName = formData.name.trim();
    const autoUsername = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const username = (formData.username && formData.username.trim()) ? formData.username.trim() : autoUsername;
    const password = (formData.password && formData.password.trim()) ? formData.password.trim() : 'Pass@123';
    const designation = (formData.designation && formData.designation.trim()) ? formData.designation.trim() : (formData.role || 'Staff');
    const email = (formData.email && formData.email.trim()) ? formData.email.trim() : `${username}@carepulse.com`;
    const phone = (formData.phone && formData.phone.trim()) ? formData.phone.trim() : '+1 (555) 000-1122';

    const userPayload = {
      name: cleanName,
      username,
      password,
      role: formData.role || 'CHIEF_ACCOUNTANT',
      designation,
      department: formData.department || 'Billing & Accounts',
      email,
      phone
    };

    if (editingUserId) {
      updateUser(editingUserId, userPayload);
      setEditingUserId(null);
    } else {
      addUser(userPayload);
    }

    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'CHIEF_ACCOUNTANT',
      designation: '',
      department: 'Billing & Accounts',
      email: '',
      phone: ''
    });
    setShowAddModal(false);
  };

  const handleEdit = (user) => {
    if (!isAdmin) return;
    setFormData({
      username: user.username || '',
      password: user.password || '',
      name: user.name,
      role: user.role,
      designation: user.designation,
      department: user.department,
      email: user.email,
      phone: user.phone
    });
    setEditingUserId(user.id);
    setShowAddModal(true);
  };

  // If logged in user is NOT Admin, restrict access
  if (!isAdmin) {
    const adminUser = users.find(u => u.role === 'ADMIN');
    return (
      <div className="glass-card p-12 text-center rounded-3xl border border-rose-500/30 max-w-2xl mx-auto my-12 shadow-2xl">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Admin Authorization Required</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
          Only an authorized <strong>System Administrator (ADMIN)</strong> can create, edit, or assign multi-tier authority roles to users.
        </p>
        <div className="mt-6">
          <button
            onClick={() => {
              if (adminUser) setActiveUser(adminUser);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-rose-500/20 hover:from-rose-400 hover:to-amber-400 transition-all"
          >
            Switch to Admin Role ({adminUser ? adminUser.name : 'System Admin'})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner Notice */}
      <div className="glass-card p-6 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold text-slate-100">Multi-Tier Role Hierarchy & Department Control</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Configure Chief Accountant, CFO, MD, Vice Chairman, Chairman, and Billing Department users for permission routing.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingUserId(null);
              setFormData({
                username: '',
                password: '',
                name: '',
                role: 'CHIEF_ACCOUNTANT',
                designation: '',
                department: departments[0] || 'Billing & Accounts',
                email: '',
                phone: ''
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20 hover:from-teal-300 hover:to-emerald-300 transition-all active:scale-95 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            Create Authority User
          </button>
        </div>
      </div>

      {/* Visual Role Hierarchy Card */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-base text-slate-100">Hospital Billing & Discount Role Hierarchy Structure</h3>
          </div>
          <span className="text-xs text-teal-400 font-mono font-semibold">6-Tier Multi-Level Workflow</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-cyan-400">Tier 1 Approval</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-extrabold">Up to ₹25,000/-</span>
              </div>
              <p className="font-extrabold text-sm text-slate-100 mt-2">FINANCE MANAGER</p>
              <p className="text-xs text-cyan-300 font-medium">Finance Manager / Chief Accountant Desk</p>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">All Department requests up to ₹25,000/- routed for approval</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/40 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-purple-400">Tier 2 Approval</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold">₹25,000/- to ₹2,00,000/-</span>
              </div>
              <p className="font-extrabold text-sm text-slate-100 mt-2">CFO</p>
              <p className="text-xs text-purple-300 font-medium">Chief Financial Officer (CFO)</p>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">All Department requests above ₹25,000/- to ₹2,00,000/-</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-amber-400">Tier 3 Executive</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold">Above ₹2,00,000/-</span>
              </div>
              <p className="font-extrabold text-sm text-slate-100 mt-2">MD / VICE CHAIRMAN / CHAIRMAN / DIRECTOR</p>
              <p className="text-xs text-amber-300 font-medium">Executive Management Board</p>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">All Department requests exceeding ₹2,00,000/- & Direct Grants</p>
          </div>
        </div>
      </div>

      {/* Admin Department Control Box */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-base text-slate-100">Hospital Departments Directory</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{departments.length} Departments Active</span>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newDeptName.trim()) {
              addDepartment(newDeptName);
              setNewDeptName('');
            }
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            required
            placeholder="Type new department name (e.g. Cardiology, Neurosurgery, ICU)..."
            value={newDeptName}
            onChange={e => setNewDeptName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all active:scale-95"
          >
            + Add Department
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {departments.map((dept) => (
            <div 
              key={dept}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200"
            >
              <span>{dept}</span>
              <button
                type="button"
                onClick={() => deleteDepartment(dept)}
                className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                title="Remove Department"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Hospital Services Control Box */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-slate-100">Hospital Billing Services Directory</h3>
          </div>
          <span className="text-xs text-cyan-400 font-mono font-semibold">{services.length} Services Configured</span>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newServiceName.trim()) {
              addService(newServiceName);
              setNewServiceName('');
            }
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            required
            placeholder="Type new service name (e.g. Consultation Fees, Pathology, MRI, Open MRI, Pharmacy, IPD)..."
            value={newServiceName}
            onChange={e => setNewServiceName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all active:scale-95"
          >
            + Add Service
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {services.map((srv) => (
            <div 
              key={srv}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-semibold text-cyan-200"
            >
              <span>{srv}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-normal">
                {getDepartmentForService ? getDepartmentForService(srv) : 'General'}
              </span>
              <button
                type="button"
                onClick={() => deleteService(srv)}
                className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                title="Remove Service"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Hospital Doctors Control Box */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-slate-100">Hospital Doctors Directory</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-400 font-mono font-semibold">{doctors?.length || 0} Attending Doctors</span>
            {doctors && doctors.length > 0 && (
              <button
                type="button"
                onClick={clearAllDoctors}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all"
              >
                Clear All Preset Doctors
              </button>
            )}
          </div>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newDoctorName.trim()) {
              addDoctor(newDoctorName);
              setNewDoctorName('');
            }
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            required
            placeholder="Type new doctor name (e.g. Dr. Sarah Jenkins, Dr. Rajesh Kumar, Dr. Elena Rostova)..."
            value={newDoctorName}
            onChange={e => setNewDoctorName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95"
          >
            + Add Doctor
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {doctors?.map((doc) => (
            <div 
              key={doc}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs font-semibold text-emerald-200"
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              <span>{doc}</span>
              <button
                type="button"
                onClick={() => deleteDoctor(doc)}
                className="text-slate-500 hover:text-rose-400 text-xs font-bold ml-1"
                title="Remove Doctor"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Procedure Financial Threshold Reference Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Hospital Approval Procedure Financial Limits
          </h3>
          <span className="text-[10px] text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30 font-semibold">
            Official Routing Limits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/30 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Tier 1 Approval</span>
            <span className="text-lg font-extrabold text-teal-400 block">Up to ₹10,000/-</span>
            <span className="text-xs text-teal-300 font-semibold block">Trf to Finance Manager</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Tier 2 Approval</span>
            <span className="text-lg font-extrabold text-amber-400 block">Above ₹10,000/- - ₹2,00,000/-</span>
            <span className="text-xs text-amber-300 font-semibold block">Trf to CFO</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Tier 3 Approval</span>
            <span className="text-lg font-extrabold text-rose-400 block">Above ₹2,00,000/-</span>
            <span className="text-xs text-rose-300 font-semibold block">Director (Managing Director)</span>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map(user => {
          const isChairman = user.role === 'CHAIRMAN';
          const isVChairman = user.role === 'VICE_CHAIRMAN';
          const isMD = user.role === 'MD';
          const isCFO = user.role === 'CFO';
          const isCA = user.role === 'CHIEF_ACCOUNTANT';
          const isRec = user.role === 'RECEPTIONIST';

          return (
            <div 
              key={user.id} 
              className={`glass-card p-5 rounded-2xl relative transition-all duration-200 hover:border-teal-500/40 ${
                user.id === activeUser.id ? 'ring-2 ring-teal-500/80 bg-slate-900/90' : ''
              }`}
            >
              {user.id === activeUser.id && (
                <span className="absolute top-4 right-4 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-teal-400 text-slate-950">
                  Logged In As
                </span>
              )}

              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-slate-100 truncate">{user.name}</h3>
                  
                  {editingDesignationId === user.id ? (
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingDesignationText}
                        onChange={e => setEditingDesignationText(e.target.value)}
                        onBlur={() => {
                          if (editingDesignationText.trim()) {
                            updateUser(user.id, { designation: editingDesignationText.trim() });
                          }
                          setEditingDesignationId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (editingDesignationText.trim()) {
                              updateUser(user.id, { designation: editingDesignationText.trim() });
                            }
                            setEditingDesignationId(null);
                          }
                        }}
                        className="bg-slate-950 border border-teal-500 rounded px-2 py-0.5 text-xs text-teal-300 font-bold focus:outline-none w-full"
                      />
                    </div>
                  ) : (
                    <p 
                      onClick={() => {
                        if (isAdmin) {
                          setEditingDesignationId(user.id);
                          setEditingDesignationText(user.designation || '');
                        }
                      }}
                      className="text-xs text-slate-400 font-medium hover:text-teal-300 cursor-pointer flex items-center gap-1 group/desig"
                      title="Click to edit Designation"
                    >
                      <span className="truncate">{user.designation || 'Click to set Designation'}</span>
                      <Edit3 className="w-3 h-3 opacity-0 group-hover/desig:opacity-100 text-teal-400 flex-shrink-0" />
                    </p>
                  )}
                  
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleMeta(user.role).color}`}>
                      {user.role} ({getRoleMeta(user.role).tier})
                    </span>

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {user.department}
                    </span>
                  </div>
                </div>
              </div>

              {/* Login Credentials Strip (Admin Viewable) */}
              <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">User ID / Username:</span>
                  <span className="font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {user.username || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Password:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-amber-300">
                      {showPasswordMap[user.id] ? user.password || 'Pass@123' : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCardPassword(user.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 underline ml-1"
                    >
                      {showPasswordMap[user.id] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Info for Notifications */}
              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEdit(user)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Edit Limits & Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {user.role !== 'ADMIN' && (
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Adding / Editing Authority User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-lg text-slate-100">
                  {editingUserId ? 'Edit Authority Profile' : 'Create Authority User'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert Hoffman"
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">User ID / Username</label>
                  <input
                    type="text"
                    placeholder="e.g. ca_robert (auto-generated if empty)"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3.5 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">Account Password</label>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    placeholder="Enter password (default: Pass@123)"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl pl-3.5 pr-20 py-2 text-sm text-amber-200 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200 font-semibold"
                  >
                    {showFormPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Chief Accountant"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role Hierarchy</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="DOCTOR">DOCTOR (Attending Doctor Signatory & Confirmation)</option>
                    <option value="BILLING_CLERK">BILLING_CLERK (Junior Billing Person)</option>
                    <option value="RECEPTIONIST">RECEPTIONIST (Senior Billing Officer)</option>
                    <option value="BILLING_MANAGER">BILLING_MANAGER (Finance Manager - Up to ₹25,000/-)</option>
                    <option value="CFO">CFO (Chief Financial Officer - Above ₹25,000/- to ₹2,00,000/-)</option>
                    <option value="MD">MD / DIRECTOR (Managing Director - Above ₹2,00,000/-)</option>
                    <option value="VICE_CHAIRMAN">VICE_CHAIRMAN (Executive Board)</option>
                    <option value="CHAIRMAN">CHAIRMAN (Hospital Chairman)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone (For SMS)</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. official@hospital.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-teal-500/20"
                >
                  {editingUserId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
