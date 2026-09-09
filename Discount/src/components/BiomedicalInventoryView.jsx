import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Cpu, 
  Building2, 
  Clock, 
  DollarSign, 
  X,
  FileCheck,
  Stethoscope,
  Box
} from 'lucide-react';

export const BiomedicalInventoryView = () => {
  const { biomedicalEquipment, addBiomedicalEquipment, updateBiomedicalEquipment, deleteBiomedicalEquipment } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Equipment Form State
  const [formData, setFormData] = useState({
    name: '',
    department: 'Spine OT',
    serialNo: '',
    model: '',
    manufacturer: '',
    location: '',
    amcContract: 'Active AMC',
    assignedEngineer: '',
    cost: ''
  });

  // Calculate Metrics
  const totalEquipments = biomedicalEquipment.length;
  const operationalCount = biomedicalEquipment.filter(e => e.status === 'Operational').length;
  const breakdownCount = biomedicalEquipment.filter(e => e.status === 'Breakdown').length;
  const maintenanceCount = biomedicalEquipment.filter(e => e.status === 'Maintenance').length;
  const pendingCalibrations = biomedicalEquipment.filter(e => e.calibrationStatus === 'Pending').length;

  const operationalPercentage = totalEquipments > 0 ? Math.round((operationalCount / totalEquipments) * 100) : 100;

  // Filtered Equipment List
  const filteredEquipment = biomedicalEquipment.filter(eq => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.location && eq.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDept = selectedDept === 'ALL' || eq.department === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || eq.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.serialNo) return;
    addBiomedicalEquipment({
      ...formData,
      cost: Number(formData.cost) || 0
    });
    setFormData({
      name: '',
      department: 'Spine OT',
      serialNo: '',
      model: '',
      manufacturer: '',
      location: '',
      amcContract: 'Active AMC',
      assignedEngineer: '',
      cost: ''
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-xl backdrop-blur-md">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Biomedical Engineering Command
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
                Biomedical Equipment & Implant Inventory
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Stavya Spine Hospital — Asset Lifecycle, Breakdown Faults, PM Schedules & NABH Safety Register
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-400 hover:from-indigo-400 hover:to-sky-300 text-slate-950 font-black text-sm shadow-xl shadow-indigo-500/25 transition-all active:scale-95 flex-shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Register Equipment
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Assets</span>
            <Box className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-2">{totalEquipments}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active Medical Register</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Operational Score</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-300 mt-2">{operationalPercentage}%</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">{operationalCount} Ready for Surgery</div>
        </div>

        <div className={`glass-card p-4 rounded-2xl border shadow-lg ${breakdownCount > 0 ? 'border-rose-500/50 bg-rose-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${breakdownCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Breakdowns</span>
            <AlertTriangle className={`w-5 h-5 ${breakdownCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-3xl font-extrabold mt-2 ${breakdownCount > 0 ? 'text-rose-300' : 'text-slate-100'}`}>{breakdownCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Unresolved Fault Tickets</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">PM & Service</span>
            <Wrench className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-300 mt-2">{maintenanceCount}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Under Maintenance</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">Pending Calibrations</span>
            <FileCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300 mt-2">{pendingCalibrations}</div>
          <div className="text-[11px] text-purple-400/80 mt-1">NABH Safety Status</div>
        </div>

      </div>

      {/* Filter Controls & Search */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search equipment, model, SN, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-100">All Departments</option>
              <option value="Spine OT" className="bg-slate-900 text-slate-100">Spine OT</option>
              <option value="ICU" className="bg-slate-900 text-slate-100">ICU</option>
              <option value="Radiology & OT" className="bg-slate-900 text-slate-100">Radiology & OT</option>
              <option value="Implant Store" className="bg-slate-900 text-slate-100">Implant Store</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-100">All Status</option>
              <option value="Operational" className="bg-slate-900 text-slate-100">Operational</option>
              <option value="Breakdown" className="bg-slate-900 text-slate-100">Breakdown</option>
              <option value="Maintenance" className="bg-slate-900 text-slate-100">Maintenance</option>
            </select>
          </div>
        </div>

      </div>

      {/* Equipment List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full glass-card p-12 rounded-3xl border border-slate-800 text-center text-slate-400">
            <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No equipment records found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search terms or filter selections.</p>
          </div>
        ) : (
          filteredEquipment.map((eq) => {
            const isBreakdown = eq.status === 'Breakdown';
            const isMaintenance = eq.status === 'Maintenance';

            return (
              <div 
                key={eq.id}
                className={`glass-card rounded-2xl border p-5 transition-all duration-200 hover:border-indigo-500/50 flex flex-col justify-between ${
                  isBreakdown 
                    ? 'border-rose-500/40 bg-rose-950/10' 
                    : isMaintenance 
                    ? 'border-amber-500/40 bg-amber-950/10' 
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div>
                  {/* Status Badge & Dept */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {eq.department}
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                      isBreakdown
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isMaintenance
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isBreakdown && <AlertTriangle className="w-3 h-3" />}
                      {isMaintenance && <Wrench className="w-3 h-3" />}
                      {!isBreakdown && !isMaintenance && <CheckCircle2 className="w-3 h-3" />}
                      {eq.status}
                    </span>
                  </div>

                  {/* Name & Serial */}
                  <h3 className="font-extrabold text-slate-100 text-base leading-snug">
                    {eq.name}
                  </h3>
                  <div className="text-xs text-indigo-300 font-mono mt-1 font-semibold">
                    SN: {eq.serialNo} {eq.model && `• Model: ${eq.model}`}
                  </div>

                  {/* Specs / Meta Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Manufacturer:</span>
                      <span className="font-medium text-slate-300">{eq.manufacturer || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="font-medium text-slate-300">{eq.location || 'Central Store'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Contract:</span>
                      <span className="font-medium text-teal-400">{eq.amcContract || 'Active AMC'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Next PM Due:</span>
                      <span className="font-semibold text-amber-300">{eq.nextPmDue || 'Scheduled'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Calibration:</span>
                      <span className={`font-semibold ${eq.calibrationStatus === 'Pending' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {eq.calibrationStatus || 'Valid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {eq.status === 'Operational' ? (
                      <button
                        onClick={() => updateBiomedicalEquipment(eq.id, { status: 'Breakdown' })}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-colors"
                        title="Mark Fault / Breakdown"
                      >
                        Log Breakdown
                      </button>
                    ) : (
                      <button
                        onClick={() => updateBiomedicalEquipment(eq.id, { status: 'Operational' })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-colors"
                        title="Mark Resolved & Operational"
                      >
                        Set Operational
                      </button>
                    )}

                    <button
                      onClick={() => updateBiomedicalEquipment(eq.id, { calibrationStatus: 'Valid', nextCalibrationDue: '2027-03-31' })}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition-colors"
                      title="Mark NABH Calibrated"
                    >
                      Calibrate
                    </button>
                  </div>

                  <button
                    onClick={() => deleteBiomedicalEquipment(eq.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add New Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full rounded-3xl border border-indigo-500/30 bg-slate-900/95 p-6 shadow-2xl animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-extrabold text-slate-100">Register New Biomedical Equipment</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spine OT Surgical Microscope"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SN-XXXX-9900"
                    value={formData.serialNo}
                    onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. M530 OH6"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Spine OT">Spine OT</option>
                    <option value="ICU">ICU</option>
                    <option value="Radiology & OT">Radiology & OT</option>
                    <option value="Implant Store">Implant Store</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leica / Mindray"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Hospital Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OT-2 Bed 1"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    AMC / CMC Contract
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Active AMC"
                    value={formData.amcContract}
                    onChange={(e) => setFormData({ ...formData, amcContract: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-400 hover:from-indigo-400 hover:to-sky-300 text-slate-950 font-black text-xs shadow-lg shadow-indigo-500/20"
                >
                  Save Equipment
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
