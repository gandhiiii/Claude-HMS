/**
 * js/modules/biomedical-inventory.js
 * ---------------------------------------------------------------------------
 * Comprehensive Biomedical Equipment & Department Operations Module
 * Features:
 * 1. Equipment Master (Asset Tag, S/N, Model, Department/Room, Status)
 * 2. Implant Inventory & Patient Usage / Implantation Tracking
 * 3. Purchase Entry, Invoice & Commissioning Register
 * 4. AMC (Annual Maintenance Contract) & CMC (Comprehensive) & Warranty Monitor
 * 5. Maintenance, PM Schedule, Calibration & Breakdown Logs
 * 6. Department Staff Meetings & Minutes of Meeting (MoM) Action Items
 * 7. Biomedical Task & To-Do List Manager
 * 8. Safety, Sterilization & Operational Checklists & Audit Logs
 * ---------------------------------------------------------------------------
 */

let bioInvTab = 'items'; // 'items'|'implants'|'purchases'|'contracts'|'history'|'meetings'|'todos'|'checklists'
let bioInvSearch = '';
let bioInvDeptFilter = '';
let bioInvContractFilter = '';
let bioInvStatusFilter = '';
let bioImplantSearch = '';
let bioImplantCatFilter = '';
let bioActiveChecklistId = null;

const BIO_EQUIPMENT_TYPES = [
    'Major Equipment',
    'Minor Equipment',
    'Instrument',
    'Accessories',
    'Implant',
    'Spare Part',
    'Other'
];

const BIO_CATEGORIES = [
    // ── Clinical Equipment ──
    'Life Support Equipment',
    'Diagnostic & Imaging',
    'Patient Monitoring',
    'Surgical & OT Equipment',
    'Laboratory & Pathology',
    'Therapeutic & Rehabilitation',
    'Dental & Ophthalmic',
    'Central Sterilization (CSSD)',
    'Radiology & X-Ray',
    'Endoscopy & Laparoscopy',
    'Physiotherapy & Rehab',
    'Cardiology Equipment',
    'Neurology Equipment',
    'Neonatal & Pediatric Equipment',
    'Anaesthesia Equipment',
    // ── Instruments ──
    'Surgical Instruments',
    'Diagnostic Instruments',
    'OT Instruments',
    // ── Accessories ──
    'Equipment Accessories',
    'Cables & Sensors',
    'Electrodes & Probes',
    'Batteries & Power Accessories',
    // ── Other ──
    'Spare Parts & Components',
    'IT & Biomedical Software',
    'Other Biomedical'
];

// Categories specifically for the Consumables & Disposables section
const BIO_CONSUMABLE_CATEGORIES = [
    'Consumable Supplies',
    'Disposable Items',
    'Sutures & Wound Care',
    'IV & Infusion Supplies',
    'Gloves & PPE',
    'Syringes & Needles',
    'Bandages & Dressings',
    'Catheters & Tubes',
    'Surgical Drapes & Covers',
    'Sterilization Pouches',
    'Diagnostic Strips & Reagents',
    'Other Consumable'
];

const IMPLANT_CATEGORIES = [
    'Orthopedic & Joint Prosthesis',
    'Cardiovascular & Pacemakers',
    'Vascular Stents & Grafts',
    'Ophthalmic Intraocular Lenses (IOL)',
    'Dental & Maxillofacial Implants',
    'Spinal Implants & Screws',
    'Surgical Mesh & Biological Grafts',
    'Other Medical Implants'
];

/* ── Initial Seed Data Generator ── */
function initBiomedicalSeedData() {
    // 1. Equipment seed
    let equip = DB.get('biomedical_inventory') || [];
    if (!equip.length) {
        equip = [
            {
                id: 'bio_eq_101',
                assetTag: 'BIO-EQ-1001',
                name: 'Biphasic Defibrillator Monitor',
                category: 'Life Support Equipment',
                model: 'BeneHeart D3',
                serialNo: 'SN-9948210',
                department: 'ICU',
                location: 'ICU Room 102',
                purchasePrice: 350000,
                contractType: 'CMC',
                status: 'Working',
                warrantyStart: '2024-01-15',
                warrantyExpiry: '2025-01-14',
                amcCmcStart: '2025-01-15',
                amcCmcExpiry: '2027-01-14',
                amcCmcCost: 35000,
                manufacturer: 'Mindray Medical',
                vendorName: 'MedTech Solutions India',
                vendorContact: 'Mr. Rajesh Sharma',
                vendorPhone: '+91 98765 43210',
                vendorEmail: 'service@medtechsolutions.in',
                lastServiceDate: '2026-06-10',
                nextPmDue: '2026-12-10',
                calibrationDue: '2026-12-15',
                notes: 'Transducer probe replaced in June 2026. Battery test passed.'
            },
            {
                id: 'bio_eq_102',
                assetTag: 'BIO-EQ-1002',
                name: 'High-End C-Arm Surgical Imaging System',
                category: 'Diagnostic & Imaging',
                model: 'Ziehm Solo FD',
                serialNo: 'SN-7782109',
                department: 'Operation Theatre',
                location: 'OT-2 Major Surgical',
                purchasePrice: 4200000,
                contractType: 'Warranty',
                status: 'Working',
                warrantyStart: '2026-02-01',
                warrantyExpiry: '2027-01-31',
                amcCmcStart: '',
                amcCmcExpiry: '',
                amcCmcCost: 0,
                manufacturer: 'Ziehm Imaging',
                vendorName: 'Zeiss Health Ltd',
                vendorContact: 'Eng. Suresh Patel',
                vendorPhone: '+91 98220 11223',
                vendorEmail: 'support@zeisshealth.com',
                lastServiceDate: '2026-08-01',
                nextPmDue: '2026-11-01',
                calibrationDue: '2026-11-05',
                notes: 'Factory warranty active. Image intensifier tube checked.'
            },
            {
                id: 'bio_eq_103',
                assetTag: 'BIO-EQ-1003',
                name: 'Anesthesia Workstation with Ventilator',
                category: 'Surgical & OT Equipment',
                model: 'Primus IE',
                serialNo: 'SN-3319088',
                department: 'Operation Theatre',
                location: 'OT-1 Anesthesia',
                purchasePrice: 2800000,
                contractType: 'AMC',
                status: 'Under Maintenance',
                warrantyStart: '2023-05-10',
                warrantyExpiry: '2024-05-09',
                amcCmcStart: '2024-05-10',
                amcCmcExpiry: '2026-10-15',
                amcCmcCost: 85000,
                manufacturer: 'Drager Medical',
                vendorName: 'Drager India Pvt Ltd',
                vendorContact: 'Mr. Amit Verma',
                vendorPhone: '+91 99100 44332',
                vendorEmail: 'service@drager.com',
                lastServiceDate: '2026-05-12',
                nextPmDue: '2026-09-15',
                calibrationDue: '2026-09-20',
                notes: 'Flow sensor error reported. Technician scheduled for replacement.'
            },
            {
                id: 'bio_eq_104',
                assetTag: 'BIO-EQ-1004',
                name: 'ICU Multi-Para Patient Monitor',
                category: 'Patient Monitoring',
                model: 'IntelliVue MX450',
                serialNo: 'SN-1109923',
                department: 'NICU',
                location: 'NICU Bed 4',
                purchasePrice: 450000,
                contractType: 'CMC',
                status: 'Working',
                warrantyStart: '2022-03-01',
                warrantyExpiry: '2023-02-28',
                amcCmcStart: '2025-03-01',
                amcCmcExpiry: '2026-09-30',
                amcCmcCost: 40000,
                manufacturer: 'Philips Healthcare',
                vendorName: 'Philips Med Systems',
                vendorContact: 'Ms. Neha Gupta',
                vendorPhone: '+91 97112 88990',
                vendorEmail: 'neha@philips.com',
                lastServiceDate: '2026-03-01',
                nextPmDue: '2026-09-25',
                calibrationDue: '2026-09-30',
                notes: 'AMC expiring soon. Renewal quote requested.'
            }
        ];
        DB.set('biomedical_inventory', equip);
    }

    // 2. Implants seed
    let implants = DB.get('biomedical_implants') || [];
    if (!implants.length) {
        implants = [
            {
                id: 'imp_101',
                code: 'IMP-ORTHO-01',
                name: 'Cobalt-Chrome Total Knee Joint Replacement Prosthesis',
                category: 'Orthopedic & Joint Prosthesis',
                batchNo: 'B-77492',
                serialNo: 'SN-KNEE-901',
                manufacturer: 'Stryker Orthopedics',
                vendorName: 'Surgical India Distributors',
                quantity: 4,
                reorderLevel: 2,
                unitCost: 85000,
                expiryDate: '2028-12-31',
                storageTemp: 'Room Temp (Sterile Sealed)',
                sterileStatus: 'Sterile',
                consignmentType: 'Hospital Owned',
                recalled: false,
                notes: 'Size #3 Femoral Component included'
            },
            {
                id: 'imp_102',
                code: 'IMP-CARD-02',
                name: 'Dual-Chamber DDDR Pacemaker Pulse Generator',
                category: 'Cardiovascular & Pacemakers',
                batchNo: 'LOT-99120',
                serialNo: 'SN-PACE-554',
                manufacturer: 'Medtronic',
                vendorName: 'CardioLife Devices',
                quantity: 2,
                reorderLevel: 2,
                unitCost: 145000,
                expiryDate: '2027-06-30',
                storageTemp: 'Cool Dry (15-25°C)',
                sterileStatus: 'Sterile',
                consignmentType: 'Vendor Consignment',
                recalled: false,
                notes: 'Vendor consignment stock. Billed upon patient usage.'
            },
            {
                id: 'imp_103',
                code: 'IMP-OPH-03',
                name: 'Foldable Hydrophobic Acrylic Intraocular Lens (+21.5D)',
                category: 'Ophthalmic Intraocular Lenses (IOL)',
                batchNo: 'B-44109',
                serialNo: 'SN-IOL-3012',
                manufacturer: 'Alcon Surgical',
                vendorName: 'Vision Care Supplies',
                quantity: 12,
                reorderLevel: 5,
                unitCost: 6500,
                expiryDate: '2029-01-15',
                storageTemp: 'Ambient Sterile Box',
                sterileStatus: 'Sterile',
                consignmentType: 'Hospital Owned',
                recalled: false,
                notes: 'Phacoemulsification premium lens'
            }
        ];
        DB.set('biomedical_implants', implants);
    }

    // 3. Implantation Logs seed
    let impLogs = DB.get('biomedical_implantation_logs') || [];
    if (!impLogs.length) {
        impLogs = [
            {
                id: 'implog_1',
                implantId: 'imp_101',
                implantName: 'Cobalt-Chrome Total Knee Joint Replacement Prosthesis',
                batchNo: 'B-77492',
                serialNo: 'SN-KNEE-901',
                patientId: 'P-9021',
                patientName: 'Ramesh Patel',
                surgeryDate: '2026-08-20',
                otRoom: 'OT-1 Ortho',
                surgeonName: 'Dr. Vikram Shah',
                nurseName: 'Sr. Mary Kurien',
                quantityUsed: 1,
                notes: 'Successful Left TKR surgery. Implant verification checklist signed.'
            }
        ];
        DB.set('biomedical_implantation_logs', impLogs);
    }

    // 4. Purchases seed
    let purchases = DB.get('biomedical_purchases') || [];
    if (!purchases.length) {
        purchases = [
            {
                id: 'pur_101',
                poNumber: 'PO-BIO-2026-044',
                invoiceNumber: 'INV-MT-8819',
                purchaseDate: '2026-07-15',
                vendorName: 'MedTech Solutions India',
                vendorContact: 'Mr. Rajesh Sharma (+91 98765 43210)',
                itemName: 'Ultrasound Doppler Color Diagnostic System',
                modelNo: 'Mindray DC-70 Exp',
                category: 'Diagnostic & Imaging',
                quantity: 1,
                unitPrice: 1850000,
                totalPrice: 1850000,
                warrantyMonths: 24,
                installationDate: '2026-07-20',
                acceptanceStatus: 'Accepted & Commissioned',
                invoiceFileUrl: '',
                notes: 'Commissioning safety certificate signed by BME HOD.'
            }
        ];
        DB.set('biomedical_purchases', purchases);
    }

    // 5. Meetings seed
    let meetings = DB.get('biomedical_meetings') || [];
    if (!meetings.length) {
        meetings = [
            {
                id: 'mtg_101',
                title: 'Monthly Biomedical Equipment Performance & Safety Review',
                meetingDate: '2026-09-02T10:30',
                chairperson: 'Er. Hardik Shah (HOD Biomedical)',
                attendees: 'Er. Hardik Shah, Er. Anita Patel, OT Nursing Incharge, ICU Supervisor',
                agenda: '1. Breakdown analysis of OT-1 Anesthesia Workstation\n2. Review AMC expiry contracts for Q3\n3. Pre-Op Implant verification protocol compliance',
                minutes: 'Discussed replacement part delivery for Drager Primus workstation. Approved AMC renewal quote for Philips monitors.',
                actionItems: [
                    { id: 'act_1', task: 'Follow up with Drager vendor for flow sensor replacement part', assignedTo: 'Er. Anita Patel', dueDate: '2026-09-10', status: 'In Progress' },
                    { id: 'act_2', task: 'Submit Philips monitor AMC renewal file to Accounts HOD', assignedTo: 'Er. Hardik Shah', dueDate: '2026-09-12', status: 'Pending' }
                ],
                createdAt: new Date().toISOString()
            }
        ];
        DB.set('biomedical_meetings', meetings);
    }

    // 6. To-Do seed
    let todos = DB.get('biomedical_todos') || [];
    if (!todos.length) {
        todos = [
            {
                id: 'todo_101',
                title: 'Calibrate ICU Defibrillator Energy Output & Battery Test',
                category: 'Calibration',
                priority: 'High',
                assignedTo: 'Er. Anita Patel',
                dueDate: '2026-09-12',
                status: 'Pending',
                notes: 'Annual electrical safety analyzer and energy output calibration test required.'
            },
            {
                id: 'todo_102',
                title: 'Audit OT Implant Expiry & Sterile Seal Verification',
                category: 'Stock Audit',
                priority: 'Medium',
                assignedTo: 'Er. Hardik Shah',
                dueDate: '2026-09-15',
                status: 'In Progress',
                notes: 'Check all cardiac stents and orthopedic plates in OT storage cabinet.'
            }
        ];
        DB.set('biomedical_todos', todos);
    }

    // 7. Checklists seed logs
    let chkLogs = DB.get('biomedical_checklist_logs') || [];
    if (!chkLogs.length) {
        chkLogs = [
            {
                id: 'chklog_1',
                checklistType: 'shift_handover',
                title: 'Shift Handover & OT/ICU Equipment Safety Check',
                executedBy: 'Er. Anita Patel',
                executedAt: '2026-09-08T08:00',
                shift: 'Morning Shift',
                passCount: 5,
                failCount: 0,
                items: [
                    { name: 'ICU Defibrillator Charged & Self-Test OK', pass: true, remarks: 'Self-test passed at 08:00 AM' },
                    { name: 'OT-1 & OT-2 Central Medical Gas Pressure Normal', pass: true, remarks: 'O2 and Vacuum at 4.2 Bar' },
                    { name: 'Suction Pumps & Aspirators Tested', pass: true, remarks: 'Working smoothly' },
                    { name: 'Emergency Backup Ventilator Power Checked', pass: true, remarks: 'Battery fully charged' },
                    { name: 'High-Risk Breakdown Alerts Cleared', pass: true, remarks: 'No open breakdown alerts' }
                ],
                notes: 'All ICU & OT emergency life-support equipment verified in functional state.'
            }
        ];
        DB.set('biomedical_checklist_logs', chkLogs);
    }
}

/* ── Helper: Contract / Warranty status info ── */
function bioGetContractStatusInfo(equip) {
    if (!equip) return { badge: '<span class="badge badge-secondary">N/A</span>', text: 'N/A', daysLeft: null, state: 'none' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cType = equip.contractType || 'None';
    let wExpiry = equip.warrantyExpiry ? new Date(equip.warrantyExpiry) : null;
    let cExpiry = equip.amcCmcExpiry ? new Date(equip.amcCmcExpiry) : null;

    let isWarrantyActive = false;
    let wDaysLeft = null;
    if (wExpiry && !isNaN(wExpiry.getTime())) {
        wExpiry.setHours(0, 0, 0, 0);
        wDaysLeft = Math.ceil((wExpiry - today) / (1000 * 60 * 60 * 24));
        if (wDaysLeft >= 0) isWarrantyActive = true;
    }

    let cDaysLeft = null;
    if (cExpiry && !isNaN(cExpiry.getTime())) {
        cExpiry.setHours(0, 0, 0, 0);
        cDaysLeft = Math.ceil((cExpiry - today) / (1000 * 60 * 60 * 24));
    }

    if (cType === 'Warranty' || isWarrantyActive) {
        if (wDaysLeft !== null && wDaysLeft >= 0) {
            if (wDaysLeft <= 30) {
                return {
                    badge: `<span class="badge badge-warning" style="background:#fff3e0;color:#e65100;border:1px solid #ffb74d;">🛡️ Warranty Expiring (${wDaysLeft}d)</span>`,
                    text: `Warranty Expiring in ${wDaysLeft} days`,
                    daysLeft: wDaysLeft,
                    state: 'expiring',
                    type: 'Warranty'
                };
            }
            return {
                badge: `<span class="badge badge-success" style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;">🛡️ Active Warranty (${wDaysLeft}d left)</span>`,
                text: `Active Warranty (${wDaysLeft} days left)`,
                daysLeft: wDaysLeft,
                state: 'active',
                type: 'Warranty'
            };
        } else if (wDaysLeft !== null && wDaysLeft < 0) {
            if (cType === 'Warranty') {
                return {
                    badge: `<span class="badge badge-danger" style="background:#ffebee;color:#c62828;border:1px solid #ef9a9a;">🛡️ Warranty Expired</span>`,
                    text: 'Warranty Expired',
                    daysLeft: wDaysLeft,
                    state: 'expired',
                    type: 'Warranty'
                };
            }
        }
    }

    if (cType === 'CMC' || cType === 'AMC') {
        const typeLabel = cType;
        if (cDaysLeft !== null && cDaysLeft >= 0) {
            if (cDaysLeft <= 30) {
                return {
                    badge: `<span class="badge badge-warning" style="background:#fff3e0;color:#e65100;border:1px solid #ffb74d;">📜 ${typeLabel} Expiring (${cDaysLeft}d)</span>`,
                    text: `${typeLabel} Expiring in ${cDaysLeft} days`,
                    daysLeft: cDaysLeft,
                    state: 'expiring',
                    type: typeLabel
                };
            }
            return {
                badge: `<span class="badge badge-info" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;">📜 ${typeLabel} Active (${cDaysLeft}d left)</span>`,
                text: `${typeLabel} Active (${cDaysLeft} days left)`,
                daysLeft: cDaysLeft,
                state: 'active',
                type: typeLabel
            };
        } else if (cDaysLeft !== null && cDaysLeft < 0) {
            return {
                badge: `<span class="badge badge-danger" style="background:#ffebee;color:#c62828;border:1px solid #ef9a9a;">🔴 ${typeLabel} Expired</span>`,
                text: `${typeLabel} Expired`,
                daysLeft: cDaysLeft,
                state: 'expired',
                type: typeLabel
            };
        }
    }

    if (cType === 'Out of Warranty') {
        return {
            badge: `<span class="badge badge-secondary" style="background:#f5f5f5;color:#616161;border:1px solid #e0e0e0;">Out of Warranty</span>`,
            text: 'Out of Warranty',
            daysLeft: null,
            state: 'expired',
            type: 'Out of Warranty'
        };
    }

    return {
        badge: `<span class="badge badge-secondary">No Contract</span>`,
        text: 'No Active Contract',
        daysLeft: null,
        state: 'none',
        type: 'None'
    };
}

function bioGetStatusBadge(status) {
    if (status === 'Working') {
        return `<span class="badge badge-success" style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;">🟢 Working</span>`;
    } else if (status === 'Under Maintenance') {
        return `<span class="badge badge-warning" style="background:#fff8e1;color:#f57f17;border:1px solid #ffe082;">🛠️ Under Service</span>`;
    } else if (status === 'Breakdown') {
        return `<span class="badge badge-danger" style="background:#ffebee;color:#c62828;border:1px solid #ef9a9a;">🔴 Breakdown</span>`;
    } else if (status === 'Standby') {
        return `<span class="badge badge-info" style="background:#e0f7fa;color:#00838f;border:1px solid #80deea;">⏸️ Standby</span>`;
    }
    return `<span class="badge badge-secondary">${status || 'Working'}</span>`;
}

/* ── Main Renderer ── */
function renderBiomedicalInventory(container) {
    if (!container) return;
    initBiomedicalSeedData();

    const u = AUTH.currentUser();
    if (u && typeof AUTH.hasPermission === 'function' && !AUTH.hasPermission(u, 'biomedical-inventory')) {
        container.innerHTML = `
            <div class="card" style="padding:32px 20px;text-align:center;max-width:520px;margin:40px auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
                <div style="font-size:48px;margin-bottom:12px;">🔒</div>
                <h3 style="margin:0 0 8px 0;color:var(--danger);font-weight:700;">Restricted Module Access</h3>
                <p style="color:var(--gray);font-size:13px;line-height:1.5;margin-bottom:20px;">
                    The Biomedical Equipment &amp; Department Operations module is strictly reserved for <strong>Biomedical Department staff members, Biomedical HODs, and System Administrators</strong>.
                </p>
                <button class="btn btn-primary" onclick="Router.navigate('${u.role === 'hod' ? 'hod-dashboard' : u.role === 'storekeeper' ? 'storekeeper-dashboard' : 'employee-dashboard'}')">Back to My Dashboard</button>
            </div>
        `;
        return;
    }

    if (u && u.department && u.department.toLowerCase().includes('biomedical') && !bioInvDeptFilter) {
        bioInvDeptFilter = u.department;
    }

    container.innerHTML = `
        <div class="biomedical-inventory-module">
            <!-- Top Bar / Header -->
            <div class="flex-between mb-4" style="flex-wrap:wrap;gap:12px;align-items:center;">
                <div>
                    <h2 style="margin:0;display:flex;align-items:center;gap:8px;">
                        <span>🧬</span> Biomedical Equipment &amp; Department Operations
                    </h2>
                    <p style="margin:2px 0 0 0;font-size:13px;color:var(--gray);">
                        Track Medical Equipment, Implant Inventory, Purchase Entries, AMC/CMC Contracts, Staff Meetings, To-Dos &amp; Safety Checklists
                    </p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${bioInvTab === 'items' ? `<button class="btn btn-primary btn-sm" onclick="showBioEquipForm()">➕ Add Equipment</button>` : ''}
                    ${bioInvTab === 'implants' ? `<button class="btn btn-primary btn-sm" onclick="showBioImplantForm()">➕ Add Implant Item</button><button class="btn btn-success btn-sm" onclick="showBioLogImplantationModal()">🦴 Log Patient Implantation</button>` : ''}
                    ${bioInvTab === 'purchases' ? `<button class="btn btn-primary btn-sm" onclick="showBioPurchaseForm()">➕ Add Purchase Entry</button>` : ''}
                    ${bioInvTab === 'consumables' ? `<button class="btn btn-primary btn-sm" onclick="showBioConsumableForm()">➕ Add Consumable / Disposable</button>` : ''}
                    ${bioInvTab === 'condemnation' ? `<button class="btn btn-danger btn-sm" onclick="showBioCondemnForm()">❌ Condemn Item</button>` : ''}
                    ${bioInvTab === 'training' ? `<button class="btn btn-primary btn-sm" onclick="showBioTrainingForm()">➕ Add Training Record</button>` : ''}
                    ${bioInvTab === 'meetings' ? `<button class="btn btn-primary btn-sm" onclick="showBioMeetingForm()">➕ Schedule Meeting</button>` : ''}
                    ${bioInvTab === 'todos' ? `<button class="btn btn-primary btn-sm" onclick="showBioTodoForm()">➕ Add Biomedical Task</button>` : ''}
                    <button class="btn btn-sm" style="background:#1e7e34;color:#fff;" onclick="bioInvDownloadExcel()">📥 Excel Export</button>
                    <button class="btn btn-sm" style="background:#c82333;color:#fff;" onclick="bioInvDownloadPdf()">📄 PDF Export</button>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid-4 mb-4" id="bioInvStats"></div>

            <!-- Tab Navigation (8 Tabs) -->
            <div class="tabs mb-4" style="border-bottom:2px solid var(--border);display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;">
                <button class="tab-btn ${bioInvTab === 'items' ? 'active' : ''}" onclick="switchBioInvTab('items', this)">
                    📦 Equipment Master
                </button>
                <button class="tab-btn ${bioInvTab === 'implants' ? 'active' : ''}" onclick="switchBioInvTab('implants', this)">
                    🦴 Implant Inventory &amp; Usage
                </button>
                <button class="tab-btn ${bioInvTab === 'purchases' ? 'active' : ''}" onclick="switchBioInvTab('purchases', this)">
                    Receipt &amp; Gate Entry
                </button>
                <button class="tab-btn ${bioInvTab === 'contracts' ? 'active' : ''}" onclick="switchBioInvTab('contracts', this)">
                    📜 AMC / CMC &amp; Warranty Monitor
                </button>
                <button class="tab-btn ${bioInvTab === 'history' ? 'active' : ''}" onclick="switchBioInvTab('history', this)">
                    🛠️ Service &amp; Breakdown Log
                </button>
                <button class="tab-btn ${bioInvTab === 'meetings' ? 'active' : ''}" onclick="switchBioInvTab('meetings', this)">
                    📅 Staff Meetings
                </button>
                <button class="tab-btn ${bioInvTab === 'consumables' ? 'active' : ''}" onclick="switchBioInvTab('consumables', this)">
                    🧴 Consumables & Disposables
                </button>
                <button class="tab-btn ${bioInvTab === 'todos' ? 'active' : ''}" onclick="switchBioInvTab('todos', this)">
                    ✅ Biomedical To-Do List
                </button>
                <button class="tab-btn ${bioInvTab === 'checklists' ? 'active' : ''}" onclick="switchBioInvTab('checklists', this)">
                    📋 Safety Checklists
                </button>
                <button class="tab-btn ${bioInvTab === 'condemnation' ? 'active' : ''}" onclick="switchBioInvTab('condemnation', this)" style="color:#dc2626;">
                    ❌ Condemnation
                </button>
                <button class="tab-btn ${bioInvTab === 'training' ? 'active' : ''}" onclick="switchBioInvTab('training', this)" style="color:#0369a1;">
                    🎓 Training
                </button>
            </div>

            <!-- Barcode Scanner Quick Box for Equipment / Implants -->
            ${(bioInvTab === 'items' || bioInvTab === 'implants') ? `
            <div class="card mb-4" style="padding:12px 16px;background:#f0f6ff;border:1px solid #c2d7f8;">
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:4px;">
                        📷 Barcode / Tag Quick Lookup:
                    </span>
                    <input type="text" id="bioBarcodeScanInput" class="form-control" placeholder="Scan or enter Asset Tag / Barcode / Serial No / Batch..." style="flex:1;min-width:200px;max-width:360px;" onkeydown="if(event.key==='Enter')handleBioBarcodeScan()">
                    <button class="btn btn-primary btn-sm" onclick="handleBioBarcodeScan()">Lookup</button>
                    <span id="bioBarcodeScanResult" style="font-size:12px;color:var(--gray);"></span>
                </div>
            </div>
            ` : ''}

            <!-- Main Tab Content Container -->
            <div id="bioInvContent"></div>
        </div>
    `;

    renderBioInvStats();
    renderBioInvTabContent();
}

function switchBioInvTab(tab, btn) {
    bioInvTab = tab;
    document.querySelectorAll('.biomedical-inventory-module .tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Re-render header buttons & content
    renderBiomedicalInventory(document.getElementById('pageContent'));
}

/* ── Render KPI Stats Bar ── */
function renderBioInvStats() {
    const items = DB.get('biomedical_inventory') || [];
    const implants = DB.get('biomedical_implants') || [];
    const purchases = DB.get('biomedical_purchases') || [];
    const todos = DB.get('biomedical_todos') || [];

    const statsEl = document.getElementById('bioInvStats');
    if (!statsEl) return;

    let totalVal = 0;
    let activeWarrantyCount = 0;
    let activeAmcCmcCount = 0;
    let expiringCount = 0;
    let breakdownCount = 0;

    items.forEach(equip => {
        if (equip.purchasePrice) totalVal += parseFloat(equip.purchasePrice) || 0;
        if (equip.status === 'Breakdown' || equip.status === 'Under Maintenance') breakdownCount++;

        const info = bioGetContractStatusInfo(equip);
        if (info.state === 'expiring') expiringCount++;
        if (info.type === 'Warranty' && info.state === 'active') activeWarrantyCount++;
        if ((info.type === 'AMC' || info.type === 'CMC') && info.state === 'active') activeAmcCmcCount++;
    });

    let pendingTodos = todos.filter(t => t.status !== 'Completed').length;
    let lowImplantStock = implants.filter(i => (parseFloat(i.quantity)||0) <= (parseFloat(i.reorderLevel)||0)).length;

    statsEl.innerHTML = `
        <div class="card" style="padding:14px;border-left:4px solid var(--primary);">
            <div style="font-size:11px;color:var(--gray);font-weight:600;text-transform:uppercase;">Total Equipment</div>
            <div style="font-size:22px;font-weight:700;margin-top:2px;">${items.length}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px;">Value: ₹${totalVal.toLocaleString('en-IN')}</div>
        </div>
        <div class="card" style="padding:14px;border-left:4px solid #2e7d32;">
            <div style="font-size:11px;color:var(--gray);font-weight:600;text-transform:uppercase;">🦴 Implant Stock &amp; Receipts</div>
            <div style="font-size:22px;font-weight:700;color:#2e7d32;margin-top:2px;">${implants.length} items</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px;">${lowImplantStock ? `<span style="color:#d32f2f;font-weight:600;">⚠️ ${lowImplantStock} low stock</span>` : 'Stock Levels Normal'}</div>
        </div>
        <div class="card" style="padding:14px;border-left:4px solid #1565c0;">
            <div style="font-size:11px;color:var(--gray);font-weight:600;text-transform:uppercase;">📜 Active AMC / CMC / Warranty</div>
            <div style="font-size:22px;font-weight:700;color:#1565c0;margin-top:2px;">${activeWarrantyCount + activeAmcCmcCount}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px;">Contracts in Active Coverage</div>
        </div>
        <div class="card" style="padding:14px;border-left:4px solid #e65100;">
            <div style="font-size:11px;color:var(--gray);font-weight:600;text-transform:uppercase;">⚠️ Breakdown / Tasks Pending</div>
            <div style="font-size:22px;font-weight:700;color:#c62828;margin-top:2px;">${breakdownCount + pendingTodos}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px;">${breakdownCount} breakdowns &bull; ${pendingTodos} tasks</div>
        </div>
    `;
}

/* ── Filter Helpers ── */
function getFilteredBioItems() {
    let items = DB.get('biomedical_inventory') || [];
    const search = bioInvSearch.trim().toLowerCase();

    return items.filter(equip => {
        if (search) {
            const matches = (equip.name || '').toLowerCase().includes(search) ||
                (equip.model || '').toLowerCase().includes(search) ||
                (equip.serialNo || '').toLowerCase().includes(search) ||
                (equip.assetTag || '').toLowerCase().includes(search) ||
                (equip.vendorName || '').toLowerCase().includes(search) ||
                (equip.department || '').toLowerCase().includes(search) ||
                (equip.location || '').toLowerCase().includes(search);
            if (!matches) return false;
        }

        if (bioInvDeptFilter && equip.department !== bioInvDeptFilter) return false;

        if (bioInvContractFilter) {
            const info = bioGetContractStatusInfo(equip);
            if (bioInvContractFilter === 'Warranty' && info.type !== 'Warranty') return false;
            if (bioInvContractFilter === 'AMC' && equip.contractType !== 'AMC') return false;
            if (bioInvContractFilter === 'CMC' && equip.contractType !== 'CMC') return false;
            if (bioInvContractFilter === 'Expiring' && info.state !== 'expiring') return false;
            if (bioInvContractFilter === 'Expired' && info.state !== 'expired') return false;
        }

        if (bioInvStatusFilter && equip.status !== bioInvStatusFilter) return false;

        return true;
    });
}

function getFilteredImplants() {
    let implants = DB.get('biomedical_implants') || [];
    const search = bioImplantSearch.trim().toLowerCase();

    return implants.filter(imp => {
        if (search) {
            const matches = (imp.name || '').toLowerCase().includes(search) ||
                (imp.code || '').toLowerCase().includes(search) ||
                (imp.batchNo || '').toLowerCase().includes(search) ||
                (imp.serialNo || '').toLowerCase().includes(search) ||
                (imp.manufacturer || '').toLowerCase().includes(search);
            if (!matches) return false;
        }
        if (bioImplantCatFilter && imp.category !== bioImplantCatFilter) return false;
        return true;
    });
}

/* ── Render Active Tab Content ── */
function renderBioInvTabContent() {
    const content = document.getElementById('bioInvContent');
    if (!content) return;

    if (bioInvTab === 'items') content.innerHTML = renderBioItemsTab();
    else if (bioInvTab === 'implants') content.innerHTML = renderBioImplantsTab();
    else if (bioInvTab === 'purchases') content.innerHTML = renderBioPurchasesTab();
    else if (bioInvTab === 'contracts') content.innerHTML = renderBioContractsTab();
    else if (bioInvTab === 'history') content.innerHTML = renderBioHistoryTab();
    else if (bioInvTab === 'consumables') content.innerHTML = renderBioConsumablesTab();
    else if (bioInvTab === 'meetings') content.innerHTML = renderBioMeetingsTab();
    else if (bioInvTab === 'todos') content.innerHTML = renderBioTodosTab();
    else if (bioInvTab === 'checklists') content.innerHTML = renderBioChecklistsTab();
    else if (bioInvTab === 'condemnation') content.innerHTML = renderBioCondemnationTab();
    else if (bioInvTab === 'training') content.innerHTML = renderBioTrainingTab();
}

/* ===========================================================================
   TAB 1: Equipment Master
   =========================================================================== */
function renderBioItemsTab() {
    const depts = DB.get('departments') || [];
    const deptOpts = depts.map(d => `<option value="${d.name}" ${bioInvDeptFilter === d.name ? 'selected' : ''}>${d.name}</option>`).join('');
    const filtered = getFilteredBioItems();

    const rows = filtered.map(equip => {
        const cInfo = bioGetContractStatusInfo(equip);
        const sBadge = bioGetStatusBadge(equip.status);
        const costStr = equip.purchasePrice ? '₹' + (parseFloat(equip.purchasePrice) || 0).toLocaleString('en-IN') : '-';

        return `
            <tr data-equip-id="${equip.id}">
                <td>
                    <span style="font-weight:700;color:var(--primary);font-family:monospace;font-size:12px;">
                        ${equip.assetTag || equip.id}
                    </span>
                    ${equip.serialNo ? `<div style="font-size:10px;color:var(--gray);">S/N: ${equip.serialNo}</div>` : ''}
                </td>
                <td>
                    <strong>${equip.name}</strong>
                    <div style="font-size:11px;color:var(--gray);">${equip.model || 'Model N/A'} &bull; ${equip.category || 'General'}</div>
                </td>
                <td>
                    <span class="badge badge-light" style="background:#f4f6f8;color:#333;">${equip.department || 'Biomedical'}</span>
                    ${equip.location ? `<div style="font-size:11px;color:var(--gray);margin-top:2px;">📍 ${equip.location}</div>` : ''}
                </td>
                <td>
                    <div><strong>${equip.vendorName || '-'}</strong></div>
                    ${equip.vendorPhone ? `<div style="font-size:11px;color:var(--gray);">📞 ${equip.vendorPhone}</div>` : ''}
                </td>
                <td>${costStr}</td>
                <td>
                    ${cInfo.badge}
                    <div style="font-size:10px;color:var(--gray);margin-top:2px;">
                        ${equip.warrantyExpiry ? `Exp: ${equip.warrantyExpiry}` : equip.amcCmcExpiry ? `Contract Exp: ${equip.amcCmcExpiry}` : ''}
                    </div>
                </td>
                <td>${sBadge}</td>
                <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px;" onclick="showBioEquipDetailsModal('${equip.id}')">👁️ View</button>
                        <button class="btn btn-sm btn-primary" style="font-size:11px;padding:2px 6px;" onclick="showBioEquipForm('${equip.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-warning" style="font-size:11px;padding:2px 6px;" onclick="showBioRenewContractModal('${equip.id}')">📜 Contract</button>
                        <button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 6px;" onclick="deleteBioEquip('${equip.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:12px 16px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                <input type="text" class="form-control" id="bioSearchInput" placeholder="Search equipment name, model, serial no, vendor, room..." value="${bioInvSearch}" oninput="bioInvSearch = this.value; renderBioInvTabContent();" style="flex:2;min-width:200px;">

                <select class="form-control" onchange="bioInvDeptFilter = this.value; renderBioInvTabContent();" style="flex:1;min-width:140px;">
                    <option value="">All Departments</option>
                    ${deptOpts}
                </select>

                <select class="form-control" onchange="bioInvContractFilter = this.value; renderBioInvTabContent();" style="flex:1;min-width:140px;">
                    <option value="">All Contracts</option>
                    <option value="Warranty" ${bioInvContractFilter === 'Warranty' ? 'selected' : ''}>🛡️ Warranty Active</option>
                    <option value="AMC" ${bioInvContractFilter === 'AMC' ? 'selected' : ''}>📜 AMC Active</option>
                    <option value="CMC" ${bioInvContractFilter === 'CMC' ? 'selected' : ''}>📜 CMC Active</option>
                    <option value="Expiring" ${bioInvContractFilter === 'Expiring' ? 'selected' : ''}>⚠️ Expiring in 30 Days</option>
                    <option value="Expired" ${bioInvContractFilter === 'Expired' ? 'selected' : ''}>🔴 Expired Contract</option>
                </select>

                <select class="form-control" onchange="bioInvStatusFilter = this.value; renderBioInvTabContent();" style="flex:1;min-width:140px;">
                    <option value="">All Operating Status</option>
                    <option value="Working" ${bioInvStatusFilter === 'Working' ? 'selected' : ''}>🟢 Working</option>
                    <option value="Under Maintenance" ${bioInvStatusFilter === 'Under Maintenance' ? 'selected' : ''}>🛠️ Under Service</option>
                    <option value="Breakdown" ${bioInvStatusFilter === 'Breakdown' ? 'selected' : ''}>🔴 Breakdown</option>
                    <option value="Standby" ${bioInvStatusFilter === 'Standby' ? 'selected' : ''}>⏸️ Standby</option>
                </select>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Asset Tag / S/N</th>
                            <th>Equipment Name &amp; Model</th>
                            <th>Dept / Location</th>
                            <th>Vendor / Supplier</th>
                            <th>Value (₹)</th>
                            <th>Warranty / Contract</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="8" class="empty-state">No biomedical equipment matching filters.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ===========================================================================
   TAB 2: Implant Inventory & Usage Register
   =========================================================================== */
function renderBioImplantsTab() {
    const filtered = getFilteredImplants();
    const impLogs = DB.get('biomedical_implantation_logs') || [];

    const catOpts = IMPLANT_CATEGORIES.map(c => `<option value="${c}" ${bioImplantCatFilter === c ? 'selected' : ''}>${c}</option>`).join('');

    const rows = filtered.map(imp => {
        const qty = parseFloat(imp.quantity) || 0;
        const reorder = parseFloat(imp.reorderLevel) || 0;
        const isLow = qty <= reorder;

        return `
            <tr>
                <td>
                    <span style="font-weight:700;color:var(--primary);font-family:monospace;font-size:12px;">${imp.code || imp.id}</span>
                    <div style="font-weight:600;margin-top:2px;">${imp.name}</div>
                    <div style="font-size:11px;color:var(--gray);">${imp.category || 'Implant'}</div>
                </td>
                <td>
                    <div><strong>Batch:</strong> ${imp.batchNo || '-'}</div>
                    ${imp.serialNo ? `<div style="font-size:11px;color:var(--gray);">S/N: ${imp.serialNo}</div>` : ''}
                    ${imp.expiryDate ? `<div style="font-size:11px;color:${new Date(imp.expiryDate) < new Date() ? 'red' : 'var(--gray)'}">Exp: ${imp.expiryDate}</div>` : ''}
                </td>
                <td>
                    <span class="badge" style="background:${isLow ? '#ffebee' : '#e8f5e9'};color:${isLow ? '#c62828' : '#2e7d32'};font-weight:700;font-size:13px;">
                        ${qty} units
                    </span>
                    ${isLow ? `<div style="font-size:10px;color:#c62828;margin-top:2px;">⚠️ Below Reorder (${reorder})</div>` : ''}
                </td>
                <td>₹${(parseFloat(imp.unitCost) || 0).toLocaleString('en-IN')}</td>
                <td>
                    <div><strong>${imp.manufacturer || '-'}</strong></div>
                    <div style="font-size:11px;color:var(--gray);">${imp.consignmentType || 'Hospital Owned'}</div>
                </td>
                <td>
                    <span class="badge badge-success" style="background:#e8f5e9;color:#2e7d32;">${imp.sterileStatus || 'Sterile'}</span>
                    ${imp.recalled ? `<span class="badge badge-danger">RECALLED</span>` : ''}
                </td>
                <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-success" style="font-size:11px;padding:2px 6px;" onclick="showBioLogImplantationModal('${imp.id}')" title="Log Usage for Patient Surgery">🦴 Use in OT</button>
                        <button class="btn btn-sm btn-primary" style="font-size:11px;padding:2px 6px;" onclick="showBioImplantForm('${imp.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 6px;" onclick="deleteBioImplant('${imp.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Recent Patient Implantation Register rows
    const logRows = impLogs.slice().reverse().map(l => `
        <tr>
            <td><strong>${l.surgeryDate || '-'}</strong></td>
            <td>
                <div style="font-weight:600;">${l.patientName} (${l.patientId})</div>
                <div style="font-size:11px;color:var(--gray);">${l.otRoom || 'OT'} &bull; Surg: ${l.surgeonName || 'Dr.'}</div>
            </td>
            <td>
                <strong>${l.implantName}</strong>
                <div style="font-size:11px;color:var(--gray);">Batch: ${l.batchNo || '-'} &bull; S/N: ${l.serialNo || '-'}</div>
            </td>
            <td><span class="badge badge-info">${l.quantityUsed || 1} Used</span></td>
            <td><span style="font-size:12px;color:var(--gray);">${l.notes || '-'}</span></td>
        </tr>
    `).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#f5faff;border:1px solid #c8e1ff;">
            <h4 style="margin:0 0 6px 0;">🦴 Medical &amp; Surgical Implant Inventory Register</h4>
            <p style="margin:0;font-size:13px;color:var(--gray);">
                Track high-value medical implants (Orthopedic prostheses, Cardiac pacemakers &amp; stents, IOL lenses), monitor sterile expiration, vendor consignment stock, and maintain complete Patient Implantation traceability.
            </p>
        </div>

        <!-- Filter Controls -->
        <div class="card mb-4" style="padding:12px 16px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                <input type="text" class="form-control" placeholder="Search implant name, batch no, serial no, manufacturer..." value="${bioImplantSearch}" oninput="bioImplantSearch = this.value; renderBioInvTabContent();" style="flex:2;min-width:220px;">

                <select class="form-control" onchange="bioImplantCatFilter = this.value; renderBioInvTabContent();" style="flex:1;min-width:180px;">
                    <option value="">All Implant Categories</option>
                    ${catOpts}
                </select>
            </div>
        </div>

        <!-- Implant Master Table -->
        <div class="card mb-4">
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <h4 style="margin:0;">📦 Current Implant Stock</h4>
                <button class="btn btn-sm btn-primary" onclick="showBioImplantForm()">➕ Add Implant Stock</button>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Code &amp; Implant Name</th>
                            <th>Batch &amp; Expiry</th>
                            <th>Available Stock</th>
                            <th>Unit Cost</th>
                            <th>Manufacturer &amp; Stock Type</th>
                            <th>Sterile Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="7" class="empty-state">No implants matching filter.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Patient Implantation Log -->
        <div class="card">
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <h4 style="margin:0;">🏥 Patient Implantation History Log</h4>
                <button class="btn btn-sm btn-success" onclick="showBioLogImplantationModal()">🦴 Record Patient Usage</button>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Surgery Date</th>
                            <th>Patient &amp; OT Room</th>
                            <th>Implant Item &amp; Batch No</th>
                            <th>Qty</th>
                            <th>Surgical Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logRows || `<tr><td colspan="5" class="empty-state">No patient implantation records logged yet.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ===========================================================================
   TAB 3: Purchase Entry & Gate Receipts
   =========================================================================== */
function renderBioPurchasesTab() {
    const purchases = DB.get('biomedical_purchases') || [];

    const rows = purchases.map(p => {
        return `
            <tr>
                <td>
                    <span style="font-weight:700;color:var(--primary);font-family:monospace;font-size:12px;">${p.poNumber || '-'}</span>
                    <div style="font-size:11px;color:var(--gray);">Inv: ${p.invoiceNumber || '-'}</div>
                    <div style="font-size:10px;color:var(--gray);">${p.purchaseDate || '-'}</div>
                </td>
                <td>
                    <strong>${p.itemName}</strong>
                    <div style="font-size:11px;color:var(--gray);">${p.modelNo || ''} &bull; ${p.category || ''}</div>
                </td>
                <td>
                    <div><strong>${p.vendorName || '-'}</strong></div>
                    <div style="font-size:11px;color:var(--gray);">${p.vendorContact || ''}</div>
                </td>
                <td>
                    <span style="font-weight:700;">₹${(parseFloat(p.totalPrice) || 0).toLocaleString('en-IN')}</span>
                    <div style="font-size:10px;color:var(--gray);">${p.quantity || 1} Unit(s) @ ₹${(parseFloat(p.unitPrice) || 0).toLocaleString('en-IN')}</div>
                </td>
                <td>${p.warrantyMonths ? `${p.warrantyMonths} Months Warranty` : 'No Warranty'}</td>
                <td>
                    <span class="badge badge-success" style="background:#e8f5e9;color:#2e7d32;">${p.acceptanceStatus || 'Accepted'}</span>
                    ${p.installationDate ? `<div style="font-size:10px;color:var(--gray);margin-top:2px;">Installed: ${p.installationDate}</div>` : ''}
                </td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-sm btn-outline" style="font-size:11px;" onclick="convertPurchaseToEquipment('${p.id}')" title="Add as Equipment Asset in Master">📦 Create Equipment Asset</button>
                        <button class="btn btn-sm btn-danger" style="font-size:11px;" onclick="deleteBioPurchase('${p.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#fefefe;border:1px solid #e0e0e0;">
            <h4 style="margin:0 0 6px 0;">🧾 Biomedical Purchase &amp; Commissioning Register</h4>
            <p style="margin:0;font-size:13px;color:var(--gray);">
                Record capital equipment &amp; biomedical purchases, track PO numbers, supplier invoice amounts, warranty commitments, and commissioning signoffs.
            </p>
        </div>

        <div class="card">
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <h4 style="margin:0;">Purchased Goods &amp; Equipment Entries</h4>
                <button class="btn btn-sm btn-primary" onclick="showBioPurchaseForm()">➕ New Purchase Entry</button>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>PO &amp; Invoice No</th>
                            <th>Equipment / Item Details</th>
                            <th>Supplier / Vendor</th>
                            <th>Total Cost (₹)</th>
                            <th>Warranty Period</th>
                            <th>Commissioning Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="7" class="empty-state">No purchase entries recorded.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ===========================================================================
   TAB 4: AMC / CMC & Warranty Monitor
   =========================================================================== */
function renderBioContractsTab() {
    const items = DB.get('biomedical_inventory') || [];

    const rows = items.map(equip => {
        const cInfo = bioGetContractStatusInfo(equip);
        const wStart = equip.warrantyStart || '-';
        const wEnd = equip.warrantyExpiry || '-';
        const cStart = equip.amcCmcStart || '-';
        const cEnd = equip.amcCmcExpiry || '-';
        const costStr = equip.amcCmcCost ? '₹' + (parseFloat(equip.amcCmcCost) || 0).toLocaleString('en-IN') : '-';

        return `
            <tr>
                <td>
                    <span style="font-weight:700;font-family:monospace;font-size:12px;">${equip.assetTag || equip.id}</span>
                    <div style="font-weight:600;">${equip.name}</div>
                    <div style="font-size:11px;color:var(--gray);">${equip.department || 'Biomedical'}</div>
                </td>
                <td>
                    <div style="font-weight:600;">${equip.contractType || 'None'}</div>
                    ${cInfo.badge}
                </td>
                <td>
                    <div><strong>Start:</strong> ${wStart}</div>
                    <div><strong>Expiry:</strong> ${wEnd}</div>
                </td>
                <td>
                    <div><strong>Start:</strong> ${cStart}</div>
                    <div><strong>Expiry:</strong> ${cEnd}</div>
                </td>
                <td>${costStr}</td>
                <td>
                    <div style="font-weight:600;">${equip.vendorName || '-'}</div>
                    ${equip.vendorContact ? `<div style="font-size:11px;color:var(--gray);">Contact: ${equip.vendorContact}</div>` : ''}
                    ${equip.vendorPhone ? `<div style="font-size:11px;color:var(--gray);">Phone: ${equip.vendorPhone}</div>` : ''}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showBioRenewContractModal('${equip.id}')">
                        📝 Renew / Update
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#eef7ff;border:1px solid #b3d7ff;">
            <h4 style="margin:0 0 6px 0;">📜 AMC, CMC &amp; Warranty Contract Monitor</h4>
            <p style="margin:0;font-size:13px;color:var(--gray);">
                Monitor contract start &amp; expiry dates, annual contract values, vendor contact details, and execute prompt renewals before expiration.
            </p>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Equipment / Asset</th>
                            <th>Contract Type &amp; Status</th>
                            <th>Warranty Period</th>
                            <th>AMC / CMC Period</th>
                            <th>Annual Cost</th>
                            <th>Vendor Details</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="7" class="empty-state">No equipment contracts registered.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ===========================================================================
   TAB 5: Maintenance & Breakdown Log
   =========================================================================== */
function renderBioHistoryTab() {
    const items = DB.get('biomedical_inventory') || [];

    const rows = items.map(equip => {
        const lastSvc = equip.lastServiceDate || 'Not recorded';
        const nextPm = equip.nextPmDue || 'Not set';
        const calibDue = equip.calibrationDue || 'Not set';
        const sBadge = bioGetStatusBadge(equip.status);

        return `
            <tr>
                <td>
                    <span style="font-weight:700;font-family:monospace;font-size:12px;">${equip.assetTag || equip.id}</span>
                    <div style="font-weight:600;">${equip.name}</div>
                    <div style="font-size:11px;color:var(--gray);">${equip.department || 'Biomedical'} &bull; ${equip.location || ''}</div>
                </td>
                <td>${sBadge}</td>
                <td>${lastSvc}</td>
                <td><span style="font-weight:600;">${nextPm}</span></td>
                <td>${calibDue}</td>
                <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        <button class="btn btn-sm btn-success" style="font-size:11px;" onclick="showBioLogServiceModal('${equip.id}', 'service')">
                            🛠️ Log PM / Service
                        </button>
                        <button class="btn btn-sm btn-danger" style="font-size:11px;" onclick="showBioLogServiceModal('${equip.id}', 'breakdown')">
                            🚨 Report Breakdown
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#fefefe;border:1px solid #e0e0e0;">
            <h4 style="margin:0 0 6px 0;">🛠️ Preventive Maintenance &amp; Calibration Schedule</h4>
            <p style="margin:0;font-size:13px;color:var(--gray);">
                Record regular PM services, track upcoming calibration due dates, and issue instant breakdown notifications for Biomedical equipment.
            </p>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Equipment / Asset</th>
                            <th>Current Status</th>
                            <th>Last Service Date</th>
                            <th>Next PM Due Date</th>
                            <th>Calibration Due Date</th>
                            <th>Service Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="6" class="empty-state">No equipment maintenance records found.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ===========================================================================
   TAB 6: Staff Meetings & MoM
   =========================================================================== */
function renderBioMeetingsTab() {
    const meetings = DB.get('biomedical_meetings') || [];

    const cards = meetings.slice().reverse().map(m => {
        const actionItems = m.actionItems || [];
        const actionRows = actionItems.map(a => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px dashed #eee;font-size:12px;">
                <div>
                    <strong>• ${a.task}</strong>
                    <span style="color:var(--gray);margin-left:6px;">(${a.assignedTo} &bull; Due: ${a.dueDate})</span>
                </div>
                <span class="badge ${a.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${a.status}</span>
            </div>
        `).join('');

        return `
            <div class="card mb-3 p-3">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 4px 0;color:var(--primary);">${m.title}</h3>
                        <div style="font-size:12px;color:var(--gray);">
                            📅 Date: <strong>${m.meetingDate ? new Date(m.meetingDate).toLocaleString() : '-'}</strong> &bull; Chair: <strong>${m.chairperson || '-'}</strong>
                        </div>
                        <div style="font-size:12px;color:var(--gray);margin-top:2px;">
                            👥 Attendees: ${m.attendees || 'Biomedical Department Team'}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteBioMeeting('${m.id}')">🗑️ Delete</button>
                </div>

                <hr style="margin:12px 0;border:0;border-top:1px solid var(--border);">

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                        <h4 style="margin:0 0 4px 0;font-size:13px;color:var(--secondary);">📌 Agenda</h4>
                        <pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;background:#f8f9fa;padding:8px;border-radius:4px;margin:0;">${m.agenda || 'None'}</pre>
                    </div>
                    <div>
                        <h4 style="margin:0 0 4px 0;font-size:13px;color:var(--secondary);">📝 Minutes of Meeting (MoM)</h4>
                        <pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;background:#f8f9fa;padding:8px;border-radius:4px;margin:0;">${m.minutes || 'None'}</pre>
                    </div>
                </div>

                ${actionItems.length ? `
                    <div style="margin-top:12px;">
                        <h4 style="margin:0 0 6px 0;font-size:13px;color:var(--primary);">🎯 Action Items (${actionItems.length})</h4>
                        ${actionRows}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#f4f6ff;border:1px solid #d0d7ff;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h4 style="margin:0 0 4px 0;">📅 Biomedical Department Meetings &amp; Action Tracker</h4>
                    <p style="margin:0;font-size:13px;color:var(--gray);">
                        Document staff meetings, record minutes of meeting (MoM), assign breakdown resolution action items, and track team deadlines.
                    </p>
                </div>
                <button class="btn btn-primary" onclick="showBioMeetingForm()">➕ Schedule Meeting</button>
            </div>
        </div>

        <div>
            ${cards || `<div class="card p-4 text-center empty-state">No biomedical department meetings scheduled yet.</div>`}
        </div>
    `;
}

/* ===========================================================================
   TAB 7: Biomedical To-Do List
   =========================================================================== */
function renderBioTodosTab() {
    const todos = DB.get('biomedical_todos') || [];

    const rows = todos.map(t => {
        const isDone = t.status === 'Completed';
        const pBadge = t.priority === 'High' ? '<span class="badge badge-danger">High</span>'
                     : t.priority === 'Medium' ? '<span class="badge badge-warning">Medium</span>'
                     : '<span class="badge badge-secondary">Low</span>';

        return `
            <tr style="${isDone ? 'opacity:0.6;text-decoration:line-through;' : ''}">
                <td>
                    <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleBioTodoStatus('${t.id}')">
                </td>
                <td>
                    <strong>${t.title}</strong>
                    <div style="font-size:11px;color:var(--gray);">${t.notes || ''}</div>
                </td>
                <td><span class="badge badge-light">${t.category || 'General'}</span></td>
                <td>${pBadge}</td>
                <td><strong>${t.assignedTo || 'Unassigned'}</strong></td>
                <td>${t.dueDate || '-'}</td>
                <td>
                    <span class="badge ${isDone ? 'badge-success' : 'badge-info'}">${t.status || 'Pending'}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" style="font-size:11px;" onclick="deleteBioTodo('${t.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#fefefe;border:1px solid #e0e0e0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h4 style="margin:0 0 4px 0;">✅ Biomedical Operations To-Do &amp; Task Manager</h4>
                    <p style="margin:0;font-size:13px;color:var(--gray);">
                        Manage daily biomedical engineer tasks, calibration reminders, vendor follow-ups, and equipment safety audit preparations.
                    </p>
                </div>
                <button class="btn btn-primary" onclick="showBioTodoForm()">➕ Add Task</button>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width:40px;">Done</th>
                            <th>Task Description</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Assigned Staff</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="8" class="empty-state">No biomedical tasks in list.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ===========================================================================
   TAB 8: Checklists & Audit Logs
   =========================================================================== */
const BIO_CHECKLIST_TEMPLATES = [
    {
        id: 'shift_handover',
        name: '🔄 Shift Handover & OT/ICU Equipment Check',
        desc: 'Daily shift change safety verification for ICU, OT, and Emergency life support units.',
        items: [
            'ICU Biphasic Defibrillators Charged & Self-Test Passed',
            'Central Medical Gas & Vacuum Manifold Pressure Normal',
            'Portable Oxygen Cylinders Full & Pressure Gauges Operational',
            'Emergency Backup Transport Ventilators Functioning',
            'Suction Pumps & Aspirator Canisters Clean & Ready',
            'High-Risk Breakdown Alert Board Reviewed'
        ]
    },
    {
        id: 'daily_safety',
        name: '⚡ Daily Equipment Safety & Alarm Verification',
        desc: 'Routine daily check of alarm limits, power cords, and grounding.',
        items: [
            'ECG & Multi-Para Monitor Cables Intact & Sensors Cleaned',
            'Infusion & Syringe Pump Rate Accuracy Check',
            'Surgical Diathermy / Cautery Unit Grounding Plate Verified',
            'Anesthesia Machine Gas Leakage Test Conducted',
            'Sterilizer Pressure & Temperature Gauges Normal'
        ]
    },
    {
        id: 'cssd_sterilization',
        name: '🧪 CSSD Autoclave & Sterilization Monitoring Log',
        desc: 'Sterilization efficacy verification log for OT surgical trays and implants.',
        items: [
            'Bowie-Dick Air Removal Test Completed for Steam Sterilizer',
            'Chemical Indicator Strips Placed in All Implant Packs',
            'Biological Indicator Ampoule Incubated & Logged',
            'Autoclave Cycle Temperature Recorded at 134°C / 3.5 min',
            'Sterile Pack Storage Cabinet Humidity & Temp Monitored'
        ]
    },
    {
        id: 'preop_implant',
        name: '🦴 Pre-Operative Implant Verification Checklist',
        desc: 'Surgical implant identification and sterility verification before incision.',
        items: [
            'Implant Sterile Packaging Seal Intact & Expiry Date Verified',
            'Implant Model, Size & Serial/Lot Number Matches Surgeon Order',
            'Consignment vs Hospital Owned Stock Billed Log Registered',
            'Back-up Implant Size Available in OT Storage',
            'Implant Patient Traceability Form Ready for Signoff'
        ]
    },
    {
        id: 'safety_audit',
        name: '🛡️ Annual Biomedical Electrical Safety Audit Checklist',
        desc: 'Comprehensive electrical safety & leakage current testing audit.',
        items: [
            'Chassis Leakage Current Test Passed (<100µA)',
            'Patient Lead Isolation Test Passed (<10µA)',
            'Ground Wire Continuity & Resistance Test (<0.2 Ohm)',
            'UPS Emergency Power Switchover Test Conducted',
            'AERB Radiation Safety Signage Displayed for X-Ray Units'
        ]
    }
];

function renderBioChecklistsTab() {
    const logs = DB.get('biomedical_checklist_logs') || [];

    const templatesHtml = BIO_CHECKLIST_TEMPLATES.map(tmpl => `
        <div class="card mb-3 p-3" style="border-left:4px solid var(--primary);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                    <h4 style="margin:0 0 2px 0;">${tmpl.name}</h4>
                    <p style="margin:0;font-size:12px;color:var(--gray);">${tmpl.desc}</p>
                    <div style="font-size:11px;color:var(--primary);margin-top:4px;">📋 ${tmpl.items.length} Check Points</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="showExecuteChecklistModal('${tmpl.id}')">
                    ▶️ Run Checklist
                </button>
            </div>
        </div>
    `).join('');

    const logRows = logs.slice().reverse().map(l => {
        return `
            <tr>
                <td><strong>${l.executedAt ? new Date(l.executedAt).toLocaleString() : '-'}</strong></td>
                <td>
                    <strong>${l.title}</strong>
                    <div style="font-size:11px;color:var(--gray);">${l.shift || 'General Shift'}</div>
                </td>
                <td>${l.executedBy || 'Engineer'}</td>
                <td>
                    <span class="badge badge-success">${l.passCount || 0} Passed</span>
                    ${l.failCount ? `<span class="badge badge-danger">${l.failCount} Failed</span>` : ''}
                </td>
                <td><span style="font-size:12px;color:var(--gray);">${l.notes || '-'}</span></td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card mb-4" style="padding:16px;background:#f5faff;border:1px solid #c8e1ff;">
            <h4 style="margin:0 0 4px 0;">📋 Biomedical Operational &amp; Safety Checklists</h4>
            <p style="margin:0;font-size:13px;color:var(--gray);">
                Execute standard biomedical safety checklists for OT, ICU, CSSD sterilization, and annual electrical safety audits.
            </p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div>
                <h4 style="margin-bottom:12px;">Standard Checklist Templates</h4>
                ${templatesHtml}
            </div>

            <div>
                <h4 style="margin-bottom:12px;">Saved Checklist Audit Logs</h4>
                <div class="card">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Executed At</th>
                                    <th>Checklist Name</th>
                                    <th>Engineer</th>
                                    <th>Result</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logRows || `<tr><td colspan="5" class="empty-state">No checklist logs saved.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ===========================================================================
   MODALS & FORMS HANDLERS
   =========================================================================== */

/* ── 1. Equipment Form Modal ── */
function showBioEquipForm(equipId) {
    const equip = equipId ? DB.getById('biomedical_inventory', equipId) : null;
    const isEdit = !!equip;

    const depts = DB.get('departments') || [];
    const deptOpts = depts.map(d =>
        `<option value="${d.name}" ${equip?.department === d.name ? 'selected' : ''}>${d.name}</option>`
    ).join('');

    const catOpts = BIO_CATEGORIES.map(c =>
        `<option value="${c}" ${equip?.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const formHtml = `
        <form id="bioEquipForm">
            <input type="hidden" name="id" value="${equip?.id || ''}">
            
            <h4 style="margin-bottom:10px;color:var(--primary);">1. Basic Equipment Details</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Equipment Name *</label>
                    <input type="text" name="name" class="form-control" value="${equip?.name || ''}" placeholder="e.g. Biphasic Defibrillator" required>
                </div>
                <div class="form-group">
                    <label>Asset Tag / Barcode ID *</label>
                    <input type="text" name="assetTag" class="form-control" value="${equip?.assetTag || 'BIO-EQ-' + Math.floor(1000 + Math.random()*9000)}" required>
                </div>
                <div class="form-group">
                    <label>Equipment Type</label>
                    <select name="equipType" class="form-control">
                        <option value="">-- Select Type --</option>
                        ${BIO_EQUIPMENT_TYPES.map(t => `<option value="${t}" ${equip?.equipType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="form-control">
                        <option value="">-- Select Category --</option>
                        ${catOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Model Number</label>
                    <input type="text" name="model" class="form-control" value="${equip?.model || ''}" placeholder="e.g. BeneHeart D3">
                </div>
                <div class="form-group">
                    <label>Serial Number (S/N)</label>
                    <input type="text" name="serialNo" class="form-control" value="${equip?.serialNo || ''}" placeholder="e.g. SN-9948210">
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <select name="department" class="form-control">
                        <option value="Biomedical">Biomedical</option>
                        ${deptOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Room / Specific Location</label>
                    <input type="text" name="location" class="form-control" value="${equip?.location || ''}" placeholder="e.g. ICU - Room 102 / OT 2">
                </div>
                <div class="form-group">
                    <label>Purchase Price (₹)</label>
                    <input type="number" name="purchasePrice" class="form-control" value="${equip?.purchasePrice || ''}" placeholder="e.g. 350000">
                </div>
            </div>

            <h4 style="margin:16px 0 10px 0;color:var(--primary);">2. Contract &amp; Warranty Details (AMC / CMC / Warranty)</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Contract Type *</label>
                    <select name="contractType" class="form-control" id="bioContractTypeSelect">
                        <option value="CMC" ${equip?.contractType === 'CMC' ? 'selected' : ''}>Comprehensive Maintenance Contract (CMC)</option>
                        <option value="AMC" ${equip?.contractType === 'AMC' ? 'selected' : ''}>Annual Maintenance Contract (AMC)</option>
                        <option value="Warranty" ${equip?.contractType === 'Warranty' || !equip ? 'selected' : ''}>In Factory Warranty</option>
                        <option value="Out of Warranty" ${equip?.contractType === 'Out of Warranty' ? 'selected' : ''}>Out of Warranty / Expired</option>
                        <option value="None" ${equip?.contractType === 'None' ? 'selected' : ''}>None</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Operating Status</label>
                    <select name="status" class="form-control">
                        <option value="Working" ${equip?.status === 'Working' || !equip ? 'selected' : ''}>🟢 Working</option>
                        <option value="Under Maintenance" ${equip?.status === 'Under Maintenance' ? 'selected' : ''}>🛠️ Under Service</option>
                        <option value="Breakdown" ${equip?.status === 'Breakdown' ? 'selected' : ''}>🔴 Breakdown</option>
                        <option value="Standby" ${equip?.status === 'Standby' ? 'selected' : ''}>⏸️ Standby</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Warranty Start Date</label>
                    <input type="date" name="warrantyStart" class="form-control" value="${equip?.warrantyStart || ''}">
                </div>
                <div class="form-group">
                    <label>Warranty Expiry Date</label>
                    <input type="date" name="warrantyExpiry" class="form-control" value="${equip?.warrantyExpiry || ''}">
                </div>

                <div class="form-group">
                    <label>AMC / CMC Start Date</label>
                    <input type="date" name="amcCmcStart" class="form-control" value="${equip?.amcCmcStart || ''}">
                </div>
                <div class="form-group">
                    <label>AMC / CMC Expiry Date</label>
                    <input type="date" name="amcCmcExpiry" class="form-control" value="${equip?.amcCmcExpiry || ''}">
                </div>

                <div class="form-group">
                    <label>Annual Contract Cost (₹)</label>
                    <input type="number" name="amcCmcCost" class="form-control" value="${equip?.amcCmcCost || ''}" placeholder="e.g. 35000">
                </div>
                <div class="form-group">
                    <label>Manufacturer Name</label>
                    <input type="text" name="manufacturer" class="form-control" value="${equip?.manufacturer || ''}" placeholder="e.g. GE / Mindray / Siemens">
                </div>
            </div>

            <h4 style="margin:16px 0 10px 0;color:var(--primary);">3. Vendor &amp; Service Information</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Vendor / Supplier Name</label>
                    <input type="text" name="vendorName" class="form-control" value="${equip?.vendorName || ''}" placeholder="e.g. MedTech Solutions India">
                </div>
                <div class="form-group">
                    <label>Vendor Contact Person</label>
                    <input type="text" name="vendorContact" class="form-control" value="${equip?.vendorContact || ''}" placeholder="e.g. Mr. Rajesh Sharma">
                </div>
                <div class="form-group">
                    <label>Vendor Phone</label>
                    <input type="text" name="vendorPhone" class="form-control" value="${equip?.vendorPhone || ''}" placeholder="+91 98765 43210">
                </div>
                <div class="form-group">
                    <label>Vendor Email</label>
                    <input type="email" name="vendorEmail" class="form-control" value="${equip?.vendorEmail || ''}" placeholder="service@vendor.com">
                </div>
                <div class="form-group">
                    <label>Last PM / Service Date</label>
                    <input type="date" name="lastServiceDate" class="form-control" value="${equip?.lastServiceDate || ''}">
                </div>
                <div class="form-group">
                    <label>Next PM Due Date</label>
                    <input type="date" name="nextPmDue" class="form-control" value="${equip?.nextPmDue || ''}">
                </div>
                <div class="form-group">
                    <label>Calibration Due Date</label>
                    <input type="date" name="calibrationDue" class="form-control" value="${equip?.calibrationDue || ''}">
                </div>
                <div class="form-group">
                    <label>Remarks / Notes</label>
                    <input type="text" name="notes" class="form-control" value="${equip?.notes || ''}" placeholder="e.g. Battery replaced recently">
                </div>
            </div>
        </form>
    `;

    openFormModal(isEdit ? '✏️ Edit Biomedical Equipment' : '➕ Add Biomedical Equipment', formHtml, () => {
        const formData = getFormData('bioEquipForm');
        if (!formData.name) {
            APP.notify('Equipment Name is required', 'error');
            return false;
        }

        if (formData.id) {
            DB.update('biomedical_inventory', formData.id, formData);
            APP.notify('Biomedical equipment updated successfully!', 'success');
        } else {
            DB.add('biomedical_inventory', formData);
            APP.notify('Biomedical equipment added successfully!', 'success');
        }

        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    }, true);
}

/* ── 2. Implant Form Modal ── */
function showBioImplantForm(implantId) {
    const imp = implantId ? DB.getById('biomedical_implants', implantId) : null;
    const isEdit = !!imp;

    const catOpts = IMPLANT_CATEGORIES.map(c =>
        `<option value="${c}" ${imp?.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const formHtml = `
        <form id="bioImplantForm">
            <input type="hidden" name="id" value="${imp?.id || ''}">
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Implant Item Name *</label>
                    <input type="text" name="name" class="form-control" value="${imp?.name || ''}" placeholder="e.g. Dual-Chamber DDDR Pacemaker" required>
                </div>
                <div class="form-group">
                    <label>Implant Code / SKU *</label>
                    <input type="text" name="code" class="form-control" value="${imp?.code || 'IMP-' + Math.floor(1000 + Math.random()*9000)}" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="form-control">
                        ${catOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Batch / Lot Number *</label>
                    <input type="text" name="batchNo" class="form-control" value="${imp?.batchNo || ''}" placeholder="e.g. B-77492" required>
                </div>
                <div class="form-group">
                    <label>Serial Number (S/N)</label>
                    <input type="text" name="serialNo" class="form-control" value="${imp?.serialNo || ''}" placeholder="e.g. SN-PACE-9021">
                </div>
                <div class="form-group">
                    <label>Manufacturer</label>
                    <input type="text" name="manufacturer" class="form-control" value="${imp?.manufacturer || ''}" placeholder="e.g. Stryker / Medtronic / Alcon">
                </div>
                <div class="form-group">
                    <label>Vendor Name</label>
                    <input type="text" name="vendorName" class="form-control" value="${imp?.vendorName || ''}" placeholder="e.g. CardioLife Devices">
                </div>
                <div class="form-group">
                    <label>Available Quantity (Units) *</label>
                    <input type="number" name="quantity" class="form-control" value="${imp?.quantity || 1}" required>
                </div>
                <div class="form-group">
                    <label>Reorder Alert Level</label>
                    <input type="number" name="reorderLevel" class="form-control" value="${imp?.reorderLevel || 2}">
                </div>
                <div class="form-group">
                    <label>Unit Cost (₹)</label>
                    <input type="number" name="unitCost" class="form-control" value="${imp?.unitCost || ''}" placeholder="e.g. 85000">
                </div>
                <div class="form-group">
                    <label>Sterile Expiry Date</label>
                    <input type="date" name="expiryDate" class="form-control" value="${imp?.expiryDate || ''}">
                </div>
                <div class="form-group">
                    <label>Storage Temperature / Conditions</label>
                    <input type="text" name="storageTemp" class="form-control" value="${imp?.storageTemp || 'Room Temp (Sterile Sealed)'}">
                </div>
                <div class="form-group">
                    <label>Sterile Status</label>
                    <select name="sterileStatus" class="form-control">
                        <option value="Sterile" ${imp?.sterileStatus === 'Sterile' || !imp ? 'selected' : ''}>Sterile &amp; Sealed</option>
                        <option value="Unsterile" ${imp?.sterileStatus === 'Unsterile' ? 'selected' : ''}>Unsterile</option>
                        <option value="Expired" ${imp?.sterileStatus === 'Expired' ? 'selected' : ''}>Expired</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Stock Ownership Type</label>
                    <select name="consignmentType" class="form-control">
                        <option value="Hospital Owned" ${imp?.consignmentType === 'Hospital Owned' || !imp ? 'selected' : ''}>Hospital Owned Stock</option>
                        <option value="Vendor Consignment" ${imp?.consignmentType === 'Vendor Consignment' ? 'selected' : ''}>Vendor Consignment Stock</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label>Remarks / Notes</label>
                <input type="text" name="notes" class="form-control" value="${imp?.notes || ''}" placeholder="Storage location, specific size notes...">
            </div>
        </form>
    `;

    openFormModal(isEdit ? '✏️ Edit Implant Item' : '➕ Add Implant Item', formHtml, () => {
        const formData = getFormData('bioImplantForm');
        if (!formData.name || !formData.batchNo) {
            APP.notify('Implant Name & Batch No are required', 'error');
            return false;
        }

        if (formData.id) {
            DB.update('biomedical_implants', formData.id, formData);
            APP.notify('Implant item updated!', 'success');
        } else {
            DB.add('biomedical_implants', formData);
            APP.notify('Implant item added to stock!', 'success');
        }

        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    }, true);
}

function bioOnImplantSelectChange(selectEl) {
    if (!selectEl) return;
    var opt = selectEl.options[selectEl.selectedIndex];
    if (!opt) return;

    var name = opt.getAttribute('data-name');
    var type = opt.getAttribute('data-type');
    var batch = opt.getAttribute('data-batch');
    var serial = opt.getAttribute('data-serial');

    if (name) {
        var nameInput = document.getElementById('bioImplantNameInput');
        if (nameInput) nameInput.value = name;
    }
    if (type) {
        var typeSelect = document.getElementById('bioImplantTypeSelect');
        if (typeSelect) typeSelect.value = type;
    }
    if (batch) {
        var batchInput = document.getElementById('bioImplantBatchInput');
        if (batchInput) batchInput.value = batch;
    }
    if (serial) {
        var serialInput = document.getElementById('bioImplantSerialInput');
        if (serialInput) serialInput.value = serial;
    }
}
window.bioOnImplantSelectChange = bioOnImplantSelectChange;

function showBioLogImplantationModal(implantId) {
    const user = AUTH.currentUser();
    const isHodOrAdmin = !user || (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin' || user.role === 'hod');

    const implants = DB.get('biomedical_implants') || [];
    const impOpts = implants.map(i =>
        `<option value="${i.id}" ${implantId === i.id ? 'selected' : ''} data-name="${(i.name||'').replace(/"/g, '&quot;')}" data-type="${(i.category||'').replace(/"/g, '&quot;')}" data-batch="${(i.batchNo||'').replace(/"/g, '&quot;')}" data-serial="${(i.serialNo||'').replace(/"/g, '&quot;')}">${i.name} (Batch: ${i.batchNo} | Qty: ${i.quantity})</option>`
    ).join('');

    const selectedImp = implantId ? implants.find(i => i.id === implantId) : null;
    const initialName = selectedImp ? selectedImp.name : '';
    const initialType = selectedImp ? (selectedImp.category || 'Orthopedic & Joint Prosthesis') : 'Orthopedic & Joint Prosthesis';
    const initialBatch = selectedImp ? (selectedImp.batchNo || '') : '';
    const initialSerial = selectedImp ? (selectedImp.serialNo || '') : '';

    const formHtml = `
        <form id="bioLogImplantForm">
            <div style="background:#f8fafc;padding:12px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:14px;">
                <div class="form-group mb-2">
                    <label style="font-weight:700;font-size:12px;color:#334155;">Select Existing Inventory Implant (Optional Auto-Fill)</label>
                    <select name="implantId" id="bioImplantSelect" class="form-control" onchange="bioOnImplantSelectChange(this)">
                        <option value="">-- Choose Existing Implant (or Enter Custom Implant Below) --</option>
                        ${impOpts}
                    </select>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div class="form-group" style="grid-column: span 2;">
                    <label style="font-weight:700;color:#0f172a;">Implant Name * ${isHodOrAdmin ? '<span class="badge badge-info" style="font-size:10px;margin-left:4px;">HOD/Admin Edit Enabled</span>' : ''}</label>
                    <input type="text" name="implantName" id="bioImplantNameInput" class="form-control" value="${initialName.replace(/"/g, '&quot;')}" placeholder="e.g. Cobalt-Chrome Total Knee Joint Replacement Prosthesis" required>
                    <small style="font-size:11px;color:#64748b;">HOD and Admin can directly specify or edit the exact Implant Name for surgical logging.</small>
                </div>

                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Implant Type / Category *</label>
                    <select name="implantType" id="bioImplantTypeSelect" class="form-control" required>
                        <option value="Orthopedic & Joint Prosthesis" ${initialType==='Orthopedic & Joint Prosthesis'?'selected':''}>Orthopedic & Joint Prosthesis</option>
                        <option value="Cardiovascular & Pacemakers" ${initialType==='Cardiovascular & Pacemakers'?'selected':''}>Cardiovascular & Pacemakers</option>
                        <option value="Ophthalmic Intraocular Lenses (IOL)" ${initialType==='Ophthalmic Intraocular Lenses (IOL)'?'selected':''}>Ophthalmic Intraocular Lenses (IOL)</option>
                        <option value="Spine & Neurosurgical Implants" ${initialType==='Spine & Neurosurgical Implants'?'selected':''}>Spine & Neurosurgical Implants</option>
                        <option value="Dental & Maxillofacial" ${initialType==='Dental & Maxillofacial'?'selected':''}>Dental & Maxillofacial</option>
                        <option value="Vascular Stents & Grafts" ${initialType==='Vascular Stents & Grafts'?'selected':''}>Vascular Stents & Grafts</option>
                        <option value="General Surgical Implants" ${initialType==='General Surgical Implants'?'selected':''}>General Surgical Implants</option>
                        <option value="Other Custom Implant" ${initialType==='Other Custom Implant'?'selected':''}>Other Custom Implant</option>
                    </select>
                </div>

                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Batch / Lot Number</label>
                    <input type="text" name="batchNo" id="bioImplantBatchInput" class="form-control" value="${initialBatch.replace(/"/g, '&quot;')}" placeholder="e.g. B-77492">
                </div>

                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Serial Number</label>
                    <input type="text" name="serialNo" id="bioImplantSerialInput" class="form-control" value="${initialSerial.replace(/"/g, '&quot;')}" placeholder="e.g. SN-KNEE-901">
                </div>

                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Quantity Used *</label>
                    <input type="number" name="quantityUsed" class="form-control" value="1" min="1" required>
                </div>
            </div>

            <div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Patient ID (UHID / IPD) *</label>
                    <input type="text" name="patientId" class="form-control" placeholder="e.g. P-9021" required>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Patient Full Name *</label>
                    <input type="text" name="patientName" class="form-control" placeholder="e.g. Ramesh Patel" required>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Date of Surgery *</label>
                    <input type="date" name="surgeryDate" class="form-control" value="${new Date().toISOString().slice(0, 10)}" required>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">OT Suite / Room Number</label>
                    <input type="text" name="otRoom" class="form-control" placeholder="e.g. OT-1 Ortho">
                </div>
                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Operating Surgeon Name</label>
                    <input type="text" name="surgeonName" class="form-control" placeholder="e.g. Dr. Vikram Shah">
                </div>
                <div class="form-group">
                    <label style="font-weight:700;color:#0f172a;">Scrub Nurse / BME Officer</label>
                    <input type="text" name="nurseName" class="form-control" placeholder="e.g. Sr. Mary Kurien">
                </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label style="font-weight:700;color:#0f172a;">Surgical & Implantation Notes</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="Positioning notes, sterile package check, surgeon verification signed..."></textarea>
            </div>
        </form>
    `;

    openFormModal('🦴 Record Patient Implantation (OT Usage)', formHtml, () => {
        const formData = getFormData('bioLogImplantForm');
        if (!formData.implantName || !formData.patientName) {
            APP.notify('Implant Name and Patient Name are required', 'error');
            return false;
        }

        const qtyUsed = parseFloat(formData.quantityUsed) || 1;

        if (formData.implantId) {
            const targetImp = DB.getById('biomedical_implants', formData.implantId);
            if (targetImp) {
                const currentStock = parseFloat(targetImp.quantity) || 0;
                if (currentStock < qtyUsed) {
                    APP.notify(`Insufficient implant stock! Only ${currentStock} unit(s) available.`, 'error');
                    return false;
                }
                // Deduct stock
                DB.update('biomedical_implants', targetImp.id, {
                    quantity: currentStock - qtyUsed
                });
            }
        }

        // Add log entry
        DB.add('biomedical_implantation_logs', {
            implantId: formData.implantId || ('imp_cust_' + Date.now()),
            implantName: formData.implantName,
            implantType: formData.implantType || 'Orthopedic & Joint Prosthesis',
            batchNo: formData.batchNo || '',
            serialNo: formData.serialNo || '',
            patientId: formData.patientId || '',
            patientName: formData.patientName,
            surgeryDate: formData.surgeryDate,
            otRoom: formData.otRoom || '',
            surgeonName: formData.surgeonName || '',
            nurseName: formData.nurseName || '',
            quantityUsed: qtyUsed,
            notes: formData.notes || ''
        });

        APP.notify(`Patient implantation recorded: ${formData.implantName} (${formData.implantType})`, 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    });
}

/* ── 4. Purchase Entry Form Modal ── */
function showBioPurchaseForm(purId) {
    const p = purId ? DB.getById('biomedical_purchases', purId) : null;
    const isEdit = !!p;

    const catOpts = BIO_CATEGORIES.map(c =>
        `<option value="${c}" ${p?.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const formHtml = `
        <form id="bioPurchaseForm">
            <input type="hidden" name="id" value="${p?.id || ''}">
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>PO Number *</label>
                    <input type="text" name="poNumber" class="form-control" value="${p?.poNumber || 'PO-BIO-' + new Date().getFullYear() + '-' + Math.floor(10 + Math.random()*90)}" required>
                </div>
                <div class="form-group">
                    <label>Supplier Invoice Number *</label>
                    <input type="text" name="invoiceNumber" class="form-control" value="${p?.invoiceNumber || ''}" placeholder="e.g. INV-MT-8819" required>
                </div>
                <div class="form-group">
                    <label>Purchase Date *</label>
                    <input type="date" name="purchaseDate" class="form-control" value="${p?.purchaseDate || new Date().toISOString().slice(0, 10)}" required>
                </div>
                <div class="form-group">
                    <label>Vendor / Supplier Name *</label>
                    <input type="text" name="vendorName" class="form-control" value="${p?.vendorName || ''}" placeholder="e.g. MedTech Solutions India" required>
                </div>
                <div class="form-group">
                    <label>Vendor Contact Phone / Email</label>
                    <input type="text" name="vendorContact" class="form-control" value="${p?.vendorContact || ''}" placeholder="e.g. Mr. Rajesh (+91 98765 43210)">
                </div>
                <div class="form-group">
                    <label>Equipment / Item Description *</label>
                    <input type="text" name="itemName" class="form-control" value="${p?.itemName || ''}" placeholder="e.g. Ultrasound Doppler System" required>
                </div>
                <div class="form-group">
                    <label>Model Number</label>
                    <input type="text" name="modelNo" class="form-control" value="${p?.modelNo || ''}" placeholder="e.g. Mindray DC-70">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="form-control">
                        ${catOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" class="form-control" value="${p?.quantity || 1}" min="1">
                </div>
                <div class="form-group">
                    <label>Unit Price (₹)</label>
                    <input type="number" name="unitPrice" class="form-control" value="${p?.unitPrice || ''}" placeholder="e.g. 1850000">
                </div>
                <div class="form-group">
                    <label>Total Price (₹)</label>
                    <input type="number" name="totalPrice" class="form-control" value="${p?.totalPrice || ''}" placeholder="e.g. 1850000">
                </div>
                <div class="form-group">
                    <label>Warranty Period (Months)</label>
                    <input type="number" name="warrantyMonths" class="form-control" value="${p?.warrantyMonths || 12}" placeholder="e.g. 24">
                </div>
                <div class="form-group">
                    <label>Commissioning Date</label>
                    <input type="date" name="installationDate" class="form-control" value="${p?.installationDate || ''}">
                </div>
                <div class="form-group">
                    <label>Acceptance Status</label>
                    <select name="acceptanceStatus" class="form-control">
                        <option value="Accepted & Commissioned" ${p?.acceptanceStatus === 'Accepted & Commissioned' || !p ? 'selected' : ''}>Accepted &amp; Commissioned</option>
                        <option value="Pending Inspection" ${p?.acceptanceStatus === 'Pending Inspection' ? 'selected' : ''}>Pending Inspection</option>
                        <option value="Rejected" ${p?.acceptanceStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
            </div>
        </form>
    `;

    openFormModal(isEdit ? '✏️ Edit Purchase Entry' : '➕ Add Biomedical Purchase Entry', formHtml, () => {
        const formData = getFormData('bioPurchaseForm');
        if (!formData.poNumber || !formData.itemName) {
            APP.notify('PO Number & Item Name are required', 'error');
            return false;
        }

        if (!formData.totalPrice && formData.unitPrice && formData.quantity) {
            formData.totalPrice = (parseFloat(formData.unitPrice)||0) * (parseFloat(formData.quantity)||1);
        }

        if (formData.id) {
            DB.update('biomedical_purchases', formData.id, formData);
            APP.notify('Purchase entry updated!', 'success');
        } else {
            DB.add('biomedical_purchases', formData);
            APP.notify('Purchase entry saved!', 'success');
        }

        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    }, true);
}

function convertPurchaseToEquipment(purId) {
    const p = DB.getById('biomedical_purchases', purId);
    if (!p) return;

    // Auto populate equipment form from purchase entry
    const wMonths = parseFloat(p.warrantyMonths) || 12;
    const wStart = p.installationDate || p.purchaseDate || new Date().toISOString().slice(0, 10);
    const wExpDate = new Date(wStart);
    wExpDate.setMonth(wExpDate.getMonth() + wMonths);

    const equipData = {
        name: p.itemName,
        assetTag: 'BIO-EQ-' + Math.floor(1000 + Math.random()*9000),
        category: p.category || 'Other Biomedical',
        model: p.modelNo || '',
        serialNo: 'SN-PUR-' + Math.floor(10000 + Math.random()*90000),
        department: 'Biomedical',
        location: 'Central Storage',
        purchasePrice: p.totalPrice || p.unitPrice || 0,
        contractType: 'Warranty',
        status: 'Working',
        warrantyStart: wStart,
        warrantyExpiry: wExpDate.toISOString().slice(0, 10),
        vendorName: p.vendorName || '',
        vendorContact: p.vendorContact || '',
        notes: `Auto-registered from PO: ${p.poNumber} (Inv: ${p.invoiceNumber})`
    };

    DB.add('biomedical_inventory', equipData);
    APP.notify(`Equipment Asset created from PO ${p.poNumber}! Transferred to Equipment Master.`, 'success');
    
    // Switch to items tab
    bioInvTab = 'items';
    renderBiomedicalInventory(document.getElementById('pageContent'));
}

/* ── 5. Renew Contract Modal ── */
function showBioRenewContractModal(equipId) {
    const equip = DB.getById('biomedical_inventory', equipId);
    if (!equip) return;

    const formHtml = `
        <form id="bioRenewContractForm">
            <input type="hidden" name="id" value="${equip.id}">
            
            <div style="background:#eef7ff;padding:12px;border-radius:8px;margin-bottom:16px;">
                <h4 style="margin:0;">${equip.name}</h4>
                <div style="font-size:12px;color:var(--gray);">Tag: ${equip.assetTag || equip.id} &bull; S/N: ${equip.serialNo || '-'} &bull; Dept: ${equip.department || 'Biomedical'}</div>
            </div>

            <div class="form-group mb-3">
                <label>Updated Contract Type *</label>
                <select name="contractType" class="form-control">
                    <option value="CMC" ${equip.contractType === 'CMC' ? 'selected' : ''}>CMC (Comprehensive Maintenance Contract)</option>
                    <option value="AMC" ${equip.contractType === 'AMC' ? 'selected' : ''}>AMC (Annual Maintenance Contract)</option>
                    <option value="Warranty" ${equip.contractType === 'Warranty' ? 'selected' : ''}>In Warranty</option>
                    <option value="Out of Warranty" ${equip.contractType === 'Out of Warranty' ? 'selected' : ''}>Out of Warranty</option>
                </select>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Contract Start Date</label>
                    <input type="date" name="amcCmcStart" class="form-control" value="${equip.amcCmcStart || new Date().toISOString().slice(0, 10)}">
                </div>
                <div class="form-group">
                    <label>Contract Expiry Date</label>
                    <input type="date" name="amcCmcExpiry" class="form-control" value="${equip.amcCmcExpiry || ''}">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
                <div class="form-group">
                    <label>Annual Contract Cost (₹)</label>
                    <input type="number" name="amcCmcCost" class="form-control" value="${equip.amcCmcCost || ''}" placeholder="e.g. 45000">
                </div>
                <div class="form-group">
                    <label>Vendor / Supplier</label>
                    <input type="text" name="vendorName" class="form-control" value="${equip.vendorName || ''}" placeholder="Vendor Name">
                </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label>Renewal / Vendor Contact Details</label>
                <input type="text" name="vendorContact" class="form-control" value="${equip.vendorContact || ''}" placeholder="Contact Person / Phone">
            </div>
        </form>
    `;

    openFormModal('📜 Renew / Update Contract', formHtml, () => {
        const formData = getFormData('bioRenewContractForm');
        DB.update('biomedical_inventory', equip.id, formData);
        APP.notify('Contract renewed & updated!', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    });
}

/* ── 6. Log PM Service / Breakdown Modal ── */
function showBioLogServiceModal(equipId, type) {
    const equip = DB.getById('biomedical_inventory', equipId);
    if (!equip) return;

    const isBreakdown = type === 'breakdown';
    const formHtml = `
        <form id="bioLogServiceForm">
            <input type="hidden" name="id" value="${equip.id}">
            
            <div style="background:${isBreakdown ? '#ffebee' : '#e8f5e9'};padding:12px;border-radius:8px;margin-bottom:16px;">
                <h4 style="margin:0;color:${isBreakdown ? '#c62828' : '#2e7d32'};">
                    ${isBreakdown ? '🚨 Report Equipment Breakdown' : '🛠️ Log Preventive Maintenance / Service'}
                </h4>
                <div style="font-size:12px;color:var(--gray);margin-top:2px;">
                    ${equip.name} (${equip.assetTag || equip.id}) &bull; ${equip.department || 'Biomedical'}
                </div>
            </div>

            <div class="form-group mb-3">
                <label>Operating Status</label>
                <select name="status" class="form-control">
                    <option value="Under Maintenance" ${isBreakdown ? '' : 'selected'}>🛠️ Under Maintenance</option>
                    <option value="Breakdown" ${isBreakdown ? 'selected' : ''}>🔴 Breakdown</option>
                    <option value="Working">🟢 Working / Restored</option>
                </select>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Service / Event Date</label>
                    <input type="date" name="lastServiceDate" class="form-control" value="${new Date().toISOString().slice(0, 10)}">
                </div>
                <div class="form-group">
                    <label>Next PM Due Date</label>
                    <input type="date" name="nextPmDue" class="form-control" value="${equip.nextPmDue || ''}">
                </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label>Issue Description / Service Notes</label>
                <textarea name="notes" class="form-control" rows="3" placeholder="${isBreakdown ? 'Describe breakdown symptom, alarm code, or failed component...' : 'PM checklist completed, sensors calibrated, filters cleaned...'}"></textarea>
            </div>
        </form>
    `;

    openFormModal(isBreakdown ? '🚨 Log Equipment Breakdown' : '🛠️ Log Maintenance Record', formHtml, () => {
        const formData = getFormData('bioLogServiceForm');
        DB.update('biomedical_inventory', equip.id, {
            status: formData.status,
            lastServiceDate: formData.lastServiceDate,
            nextPmDue: formData.nextPmDue,
            notes: formData.notes ? (equip.notes ? equip.notes + '\n[Service ' + formData.lastServiceDate + ']: ' + formData.notes : formData.notes) : equip.notes
        });

        APP.notify(isBreakdown ? 'Breakdown logged!' : 'Service record saved!', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    });
}

/* ── 7. Staff Meeting Form Modal ── */
function showBioMeetingForm() {
    const u = AUTH.currentUser();
    const formHtml = `
        <form id="bioMeetingForm">
            <div class="form-group mb-3">
                <label>Meeting Title *</label>
                <input type="text" name="title" class="form-control" placeholder="e.g. Monthly Maintenance & Breakdown Review" required>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Meeting Date &amp; Time *</label>
                    <input type="datetime-local" name="meetingDate" class="form-control" value="${new Date().toISOString().slice(0, 16)}" required>
                </div>
                <div class="form-group">
                    <label>Chairperson / Lead *</label>
                    <input type="text" name="chairperson" class="form-control" value="${u ? u.fullName : 'HOD Biomedical'}" required>
                </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label>Attendees List</label>
                <input type="text" name="attendees" class="form-control" placeholder="Names of biomedical engineers, technicians, OT/ICU staff present...">
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label>Meeting Agenda</label>
                <textarea name="agenda" class="form-control" rows="2" placeholder="1. Breakdown review&#10;2. AMC renewals&#10;3. Calibration schedule"></textarea>
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label>Minutes of Meeting (MoM) / Key Decisions</label>
                <textarea name="minutes" class="form-control" rows="3" placeholder="Summary of discussions, solutions agreed upon..."></textarea>
            </div>
        </form>
    `;

    openFormModal('📅 Schedule Biomedical Staff Meeting', formHtml, () => {
        const formData = getFormData('bioMeetingForm');
        if (!formData.title || !formData.meetingDate) {
            APP.notify('Meeting Title & Date are required', 'error');
            return false;
        }

        DB.add('biomedical_meetings', {
            ...formData,
            actionItems: []
        });

        APP.notify('Biomedical department meeting scheduled!', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    });
}

/* ── 8. To-Do Form Modal ── */
function showBioTodoForm() {
    const u = AUTH.currentUser();
    const formHtml = `
        <form id="bioTodoForm">
            <div class="form-group mb-3">
                <label>Task Description *</label>
                <input type="text" name="title" class="form-control" placeholder="e.g. Calibrate Defibrillator #4 output" required>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>Category</label>
                    <select name="category" class="form-control">
                        <option value="PM">PM / Service</option>
                        <option value="Calibration">Calibration</option>
                        <option value="Repair">Breakdown Repair</option>
                        <option value="Vendor Followup">Vendor Follow-up</option>
                        <option value="Stock Audit">Stock Audit</option>
                        <option value="General">General</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority" class="form-control">
                        <option value="High">High</option>
                        <option value="Medium" selected>Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Assigned Staff</label>
                    <input type="text" name="assignedTo" class="form-control" value="${u ? u.fullName : ''}" placeholder="Engineer Name">
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" name="dueDate" class="form-control" value="${new Date().toISOString().slice(0, 10)}">
                </div>
            </div>

            <div class="form-group" style="margin-top:12px;">
                <label>Notes / Instructions</label>
                <input type="text" name="notes" class="form-control" placeholder="Additional details...">
            </div>
        </form>
    `;

    openFormModal('✅ Add Biomedical Task', formHtml, () => {
        const formData = getFormData('bioTodoForm');
        if (!formData.title) {
            APP.notify('Task Title is required', 'error');
            return false;
        }

        DB.add('biomedical_todos', {
            ...formData,
            status: 'Pending'
        });

        APP.notify('Biomedical task added!', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    });
}

function toggleBioTodoStatus(todoId) {
    const t = DB.getById('biomedical_todos', todoId);
    if (!t) return;

    const newStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
    DB.update('biomedical_todos', todoId, { status: newStatus });
    APP.notify(`Task marked as ${newStatus}`, 'info');
    renderBiomedicalInventory(document.getElementById('pageContent'));
}

function deleteBioTodo(todoId) {
    DB.delete('biomedical_todos', todoId);
    APP.notify('Task deleted', 'success');
    renderBiomedicalInventory(document.getElementById('pageContent'));
}

/* ── 9. Execute Checklist Modal ── */
function showExecuteChecklistModal(tmplId) {
    const tmpl = BIO_CHECKLIST_TEMPLATES.find(t => t.id === tmplId);
    if (!tmpl) return;

    const u = AUTH.currentUser();

    const itemsHtml = tmpl.items.map((itemText, idx) => `
        <div style="padding:10px;background:#f8f9fa;border-radius:6px;margin-bottom:8px;border:1px solid #e9ecef;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>${idx + 1}. ${itemText}</strong>
                <div style="display:flex;gap:12px;">
                    <label style="cursor:pointer;color:#2e7d32;font-weight:600;display:flex;align-items:center;gap:4px;">
                        <input type="radio" name="item_${idx}" value="pass" checked> ✅ Pass
                    </label>
                    <label style="cursor:pointer;color:#c62828;font-weight:600;display:flex;align-items:center;gap:4px;">
                        <input type="radio" name="item_${idx}" value="fail"> ❌ Fail
                    </label>
                </div>
            </div>
            <input type="text" id="remark_${idx}" class="form-control mt-2" placeholder="Remarks / observations (optional)" style="font-size:12px;">
        </div>
    `).join('');

    const formHtml = `
        <form id="bioChecklistForm">
            <div style="background:#eef7ff;padding:12px;border-radius:8px;margin-bottom:16px;">
                <h4 style="margin:0;">${tmpl.name}</h4>
                <div style="font-size:12px;color:var(--gray);">${tmpl.desc}</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div class="form-group">
                    <label>Inspector / BME Engineer *</label>
                    <input type="text" name="executedBy" class="form-control" value="${u ? u.fullName : ''}" required>
                </div>
                <div class="form-group">
                    <label>Shift / Location *</label>
                    <input type="text" name="shift" class="form-control" value="Morning Shift - OT / ICU" required>
                </div>
            </div>

            <h4 style="margin-bottom:10px;">Checklist Verification Items</h4>
            ${itemsHtml}

            <div class="form-group" style="margin-top:16px;">
                <label>Overall Safety Summary / Notes</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="General observation notes for biomedical audit..."></textarea>
            </div>
        </form>
    `;

    openFormModal(`📋 Run: ${tmpl.name}`, formHtml, () => {
        const formData = getFormData('bioChecklistForm');
        
        let passCount = 0;
        let failCount = 0;
        const resultItems = tmpl.items.map((itemText, idx) => {
            const rad = document.querySelector(`input[name="item_${idx}"]:checked`);
            const val = rad ? rad.value : 'pass';
            const rem = document.getElementById(`remark_${idx}`)?.value || '';
            if (val === 'pass') passCount++;
            else failCount++;

            return {
                name: itemText,
                pass: val === 'pass',
                remarks: rem
            };
        });

        DB.add('biomedical_checklist_logs', {
            checklistType: tmpl.id,
            title: tmpl.name,
            executedBy: formData.executedBy,
            shift: formData.shift,
            executedAt: new Date().toISOString(),
            passCount,
            failCount,
            items: resultItems,
            notes: formData.notes
        });

        APP.notify(`Checklist completed & saved! (${passCount} Passed, ${failCount} Failed)`, failCount > 0 ? 'warning' : 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
        return true;
    }, true);
}

/* ── View Details Modal ── */
function showBioEquipDetailsModal(equipId) {
    const equip = DB.getById('biomedical_inventory', equipId);
    if (!equip) return;

    const cInfo = bioGetContractStatusInfo(equip);
    const sBadge = bioGetStatusBadge(equip.status);

    const html = `
        <div class="modal active" id="bioDetailsModal">
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header" style="border-bottom:1px solid var(--border);padding-bottom:12px;">
                    <div>
                        <span style="font-size:11px;font-family:monospace;background:var(--primary);color:#fff;padding:2px 8px;border-radius:4px;">
                            ${equip.assetTag || equip.id}
                        </span>
                        <h3 style="margin:4px 0 0 0;">${equip.name}</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('bioDetailsModal').remove()">&times;</button>
                </div>

                <div style="padding:16px 0;">
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        ${sBadge}
                        ${cInfo.badge}
                        <span class="badge badge-light" style="background:#f4f6f8;color:#333;">Category: ${equip.category || 'General'}</span>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;" class="card mb-3 p-3">
                        <div><strong>Model:</strong> ${equip.model || '-'}</div>
                        <div><strong>Serial Number (S/N):</strong> ${equip.serialNo || '-'}</div>
                        <div><strong>Department:</strong> ${equip.department || 'Biomedical'}</div>
                        <div><strong>Location / Room:</strong> ${equip.location || '-'}</div>
                        <div><strong>Purchase Value:</strong> ${equip.purchasePrice ? '₹' + parseFloat(equip.purchasePrice).toLocaleString('en-IN') : '-'}</div>
                        <div><strong>Manufacturer:</strong> ${equip.manufacturer || '-'}</div>
                    </div>

                    <h4 style="margin-bottom:8px;color:var(--primary);">📜 Contract &amp; Warranty Specification</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;" class="card mb-3 p-3">
                        <div><strong>Contract Type:</strong> ${equip.contractType || 'None'}</div>
                        <div><strong>Contract Status:</strong> ${cInfo.text}</div>
                        <div><strong>Warranty Start:</strong> ${equip.warrantyStart || '-'}</div>
                        <div><strong>Warranty Expiry:</strong> ${equip.warrantyExpiry || '-'}</div>
                        <div><strong>AMC / CMC Start:</strong> ${equip.amcCmcStart || '-'}</div>
                        <div><strong>AMC / CMC Expiry:</strong> ${equip.amcCmcExpiry || '-'}</div>
                        <div><strong>Annual Contract Cost:</strong> ${equip.amcCmcCost ? '₹' + parseFloat(equip.amcCmcCost).toLocaleString('en-IN') : '-'}</div>
                        <div><strong>Vendor Name:</strong> ${equip.vendorName || '-'}</div>
                        <div><strong>Vendor Contact:</strong> ${equip.vendorContact || '-'}</div>
                        <div><strong>Vendor Phone / Email:</strong> ${equip.vendorPhone || '-'} ${equip.vendorEmail ? '(' + equip.vendorEmail + ')' : ''}</div>
                    </div>

                    <h4 style="margin-bottom:8px;color:var(--primary);">🛠️ Maintenance &amp; PM Status</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;" class="card p-3">
                        <div><strong>Last Service Date:</strong> ${equip.lastServiceDate || '-'}</div>
                        <div><strong>Next PM Due:</strong> ${equip.nextPmDue || '-'}</div>
                        <div><strong>Calibration Due:</strong> ${equip.calibrationDue || '-'}</div>
                        <div><strong>Notes / Logs:</strong> ${equip.notes || 'None'}</div>
                    </div>
                </div>

                <div class="modal-footer" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <button class="btn btn-warning btn-sm" onclick="document.getElementById('bioDetailsModal').remove(); showBioRenewContractModal('${equip.id}')">📜 Renew Contract</button>
                    <div>
                        <button class="btn btn-primary btn-sm" onclick="document.getElementById('bioDetailsModal').remove(); showBioEquipForm('${equip.id}')">✏️ Edit</button>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('bioDetailsModal').remove()">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/* ── Delete Helpers ── */
function deleteBioEquip(id) {
    confirmAction('Are you sure you want to delete this Biomedical Equipment?', () => {
        DB.delete('biomedical_inventory', id);
        APP.notify('Equipment deleted.', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
    });
}

function deleteBioImplant(id) {
    confirmAction('Are you sure you want to delete this Implant record?', () => {
        DB.delete('biomedical_implants', id);
        APP.notify('Implant record deleted.', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
    });
}

function deleteBioPurchase(id) {
    confirmAction('Are you sure you want to delete this purchase entry?', () => {
        DB.delete('biomedical_purchases', id);
        APP.notify('Purchase entry deleted.', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
    });
}

function deleteBioMeeting(id) {
    confirmAction('Are you sure you want to delete this staff meeting record?', () => {
        DB.delete('biomedical_meetings', id);
        APP.notify('Meeting record deleted.', 'success');
        renderBiomedicalInventory(document.getElementById('pageContent'));
    });
}

/* ── Barcode Scanner Lookup ── */
function handleBioBarcodeScan() {
    const input = document.getElementById('bioBarcodeScanInput');
    const resultEl = document.getElementById('bioBarcodeScanResult');
    if (!input || !resultEl) return;

    const query = input.value.trim().toLowerCase();
    if (!query) {
        resultEl.textContent = 'Please enter or scan a barcode/tag ID.';
        resultEl.style.color = 'var(--danger)';
        return;
    }

    const items = DB.get('biomedical_inventory') || [];
    const implants = DB.get('biomedical_implants') || [];

    const foundEquip = items.find(i =>
        (i.assetTag || '').toLowerCase() === query ||
        (i.serialNo || '').toLowerCase() === query ||
        (i.id || '').toLowerCase() === query ||
        (i.name || '').toLowerCase().includes(query)
    );

    if (foundEquip) {
        resultEl.textContent = `✓ Found Equipment: ${foundEquip.name} (${foundEquip.assetTag || foundEquip.id})`;
        resultEl.style.color = 'var(--success)';
        showBioEquipDetailsModal(foundEquip.id);
        return;
    }

    const foundImp = implants.find(i =>
        (i.code || '').toLowerCase() === query ||
        (i.batchNo || '').toLowerCase() === query ||
        (i.serialNo || '').toLowerCase() === query ||
        (i.name || '').toLowerCase().includes(query)
    );

    if (foundImp) {
        resultEl.textContent = `✓ Found Implant: ${foundImp.name} (Batch: ${foundImp.batchNo})`;
        resultEl.style.color = 'var(--success)';
        showBioImplantForm(foundImp.id);
        return;
    }

    resultEl.textContent = `❌ No matching Biomedical item found for "${query}"`;
    resultEl.style.color = 'var(--danger)';
}

/* ── Excel Export ── */
function bioInvDownloadExcel() {
    const items = DB.get('biomedical_inventory') || [];
    const implants = DB.get('biomedical_implants') || [];
    const purchases = DB.get('biomedical_purchases') || [];

    if (!items.length && !implants.length && !purchases.length) {
        APP.notify('No biomedical data to export', 'error');
        return;
    }

    const equipData = items.map(i => {
        const cInfo = bioGetContractStatusInfo(i);
        return {
            'Asset Tag': i.assetTag || i.id,
            'Equipment Name': i.name,
            'Model': i.model || '',
            'Serial No': i.serialNo || '',
            'Category': i.category || '',
            'Department': i.department || 'Biomedical',
            'Location': i.location || '',
            'Purchase Price': i.purchasePrice || 0,
            'Contract Type': i.contractType || '',
            'Contract Status': cInfo.text,
            'Warranty Start': i.warrantyStart || '',
            'Warranty Expiry': i.warrantyExpiry || '',
            'AMC/CMC Expiry': i.amcCmcExpiry || '',
            'Annual Cost': i.amcCmcCost || 0,
            'Vendor Name': i.vendorName || '',
            'Operating Status': i.status || 'Working',
            'Next PM Due': i.nextPmDue || ''
        };
    });

    const impData = implants.map(i => ({
        'Code': i.code || i.id,
        'Implant Name': i.name,
        'Category': i.category || '',
        'Batch No': i.batchNo || '',
        'Serial No': i.serialNo || '',
        'Quantity': i.quantity || 0,
        'Unit Cost': i.unitCost || 0,
        'Manufacturer': i.manufacturer || '',
        'Sterile Expiry': i.expiryDate || '',
        'Ownership': i.consignmentType || ''
    }));

    if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();
        if (equipData.length) {
            const ws1 = XLSX.utils.json_to_sheet(equipData);
            XLSX.utils.book_append_sheet(wb, ws1, 'Equipment Master');
        }
        if (impData.length) {
            const ws2 = XLSX.utils.json_to_sheet(impData);
            XLSX.utils.book_append_sheet(wb, ws2, 'Implant Stock');
        }
        XLSX.writeFile(wb, 'Biomedical_Department_Report.xlsx');
    } else {
        // Fallback CSV
        let csv = '=== EQUIPMENT MASTER ===\n' + Object.keys(equipData[0] || {}).join(',') + '\n';
        equipData.forEach(row => {
            csv += Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Biomedical_Department_Report.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
}

/* ── PDF Export ── */
function bioInvDownloadPdf() {
    const items = DB.get('biomedical_inventory') || [];
    if (!items.length) {
        APP.notify('No biomedical equipment data to export', 'error');
        return;
    }

    if (typeof jspdf === 'undefined') {
        APP.notify('PDF export library not loaded', 'error');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('Biomedical Department Equipment & Maintenance Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Items: ${items.length}`, 14, 22);

    const rows = items.map(i => {
        const cInfo = bioGetContractStatusInfo(i);
        return [
            i.assetTag || i.id,
            i.name,
            i.model || '-',
            i.department || 'Biomedical',
            i.contractType || '-',
            cInfo.text,
            i.vendorName || '-',
            i.status || 'Working',
            i.nextPmDue || '-'
        ];
    });

    doc.autoTable({
        startY: 26,
        head: [['Tag/S/N', 'Equipment', 'Model', 'Department', 'Contract', 'Warranty / AMC Status', 'Vendor', 'Status', 'Next PM']],
        body: rows,
        styles: { fontSize: 8 }
    });

    doc.save('Biomedical_Department_Report.pdf');
}

/* ===========================================================================
   CONSUMABLES & DISPOSABLES TAB
   =========================================================================== */
function renderBioConsumablesTab() {
    const items = DB.get('bio_consumables') || [];
    let catFilter = window._bioConsCatFilter || '';
    let searchFilter = window._bioConsSearch || '';

    const filtered = items.filter(i => {
        const matchCat = !catFilter || i.category === catFilter;
        const matchSearch = !searchFilter ||
            (i.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
            (i.itemCode || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
            (i.vendor || '').toLowerCase().includes(searchFilter.toLowerCase());
        return matchCat && matchSearch;
    });

    const catOpts = BIO_CONSUMABLE_CATEGORIES.map(c =>
        `<option value="${c}" ${catFilter === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const totalItems = items.length;
    const lowStock = items.filter(i => parseFloat(i.quantity) <= parseFloat(i.reorderLevel || 10)).length;
    const totalValue = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
    const expiringSoon = items.filter(i => {
        if (!i.expiryDate) return false;
        const d = new Date(i.expiryDate);
        const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
    }).length;

    const rows = filtered.length ? filtered.map(i => {
        const isLow = parseFloat(i.quantity) <= parseFloat(i.reorderLevel || 10);
        const expiry = i.expiryDate ? new Date(i.expiryDate) : null;
        const isExpired = expiry && expiry < new Date();
        const expiringSoonFlag = expiry && !isExpired && ((expiry - new Date()) / 86400000) <= 30;
        return `<tr>
            <td><span style="font-weight:700;font-family:monospace;color:#6366f1;font-size:12px;">${i.itemCode || '-'}</span></td>
            <td>
                <strong>${i.name}</strong>
                <div style="font-size:11px;color:var(--gray);">${i.category || 'General'} ${i.subType ? '• ' + i.subType : ''}</div>
            </td>
            <td><span class="badge badge-light">${i.unit || 'Nos'}</span></td>
            <td>
                <span style="font-weight:700;color:${isLow ? '#dc2626' : '#16a34a'};">${i.quantity || 0}</span>
                ${isLow ? '<span class="badge" style="background:#fef2f2;color:#dc2626;font-size:10px;margin-left:4px;">Low Stock</span>' : ''}
                <div style="font-size:10px;color:var(--gray);">Reorder @ ${i.reorderLevel || 10}</div>
            </td>
            <td>₹${parseFloat(i.unitPrice || 0).toLocaleString('en-IN')}</td>
            <td>
                ${expiry ? `<span style="font-size:12px;color:${isExpired ? '#dc2626' : expiringSoonFlag ? '#d97706' : '#16a34a'};font-weight:600;">
                    ${isExpired ? '⚠️ Expired' : expiringSoonFlag ? '⏳ ' + i.expiryDate : '✅ ' + i.expiryDate}
                </span>` : '<span style="color:var(--gray);">—</span>'}
            </td>
            <td>${i.vendor || '-'}</td>
            <td>${i.location || '-'}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-sm btn-primary" style="font-size:11px;padding:2px 8px;" onclick="showBioConsumableForm('${i.id}')">✏️ Edit</button>
                <button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 8px;" onclick="deleteBioConsumable('${i.id}')">🗑️ Del</button>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray);">No consumables / disposables recorded yet.<br><small>Click ➕ Add Consumable / Disposable to get started.</small></td></tr>`;

    return `
    <div>
        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#1d4ed8;">${totalItems}</div>
                <div style="font-size:11px;color:#1e40af;font-weight:600;">Total Items</div>
            </div>
            <div style="background:${lowStock > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${lowStock > 0 ? '#fca5a5' : '#bbf7d0'};border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:${lowStock > 0 ? '#dc2626' : '#16a34a'};">${lowStock}</div>
                <div style="font-size:11px;color:${lowStock > 0 ? '#b91c1c' : '#15803d'};font-weight:600;">Low Stock Alerts</div>
            </div>
            <div style="background:${expiringSoon > 0 ? '#fffbeb' : '#f0fdf4'};border:1px solid ${expiringSoon > 0 ? '#fde68a' : '#bbf7d0'};border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:${expiringSoon > 0 ? '#d97706' : '#16a34a'};">${expiringSoon}</div>
                <div style="font-size:11px;color:${expiringSoon > 0 ? '#92400e' : '#15803d'};font-weight:600;">Expiring in 30 Days</div>
            </div>
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#7c3aed;">₹${totalValue.toLocaleString('en-IN')}</div>
                <div style="font-size:11px;color:#6d28d9;font-weight:600;">Stock Value</div>
            </div>
        </div>

        <!-- Filters -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">
            <input type="text" class="form-control" placeholder="🔍 Search item, code, vendor..." style="flex:1;min-width:200px;"
                value="${searchFilter}" oninput="window._bioConsSearch=this.value;renderBioInvTabContent()">
            <select class="form-control" style="width:220px;" onchange="window._bioConsCatFilter=this.value;renderBioInvTabContent()">
                <option value="">All Categories</option>
                ${catOpts}
            </select>
        </div>

        <!-- Table -->
        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th>Item Code</th>
                        <th>Name & Category</th>
                        <th>Unit</th>
                        <th>Qty in Stock</th>
                        <th>Unit Price</th>
                        <th>Expiry Date</th>
                        <th>Vendor / Supplier</th>
                        <th>Storage Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

function showBioConsumableForm(itemId) {
    const item = itemId ? (DB.get('bio_consumables') || []).find(i => i.id === itemId) : null;
    const isEdit = !!item;
    const catOpts = BIO_CONSUMABLE_CATEGORIES.map(c =>
        `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const html = `
    <form id="bioConsumableForm">
        <input type="hidden" name="id" value="${item?.id || ''}"><br>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
                <label>Item Name *</label>
                <input type="text" name="name" class="form-control" value="${item?.name || ''}" placeholder="e.g. Surgical Gloves" required>
            </div>
            <div class="form-group">
                <label>Item Code / SKU</label>
                <input type="text" name="itemCode" class="form-control" value="${item?.itemCode || 'CONS-' + Math.floor(1000 + Math.random()*9000)}" placeholder="e.g. CONS-1001">
            </div>
            <div class="form-group">
                <label>Category *</label>
                <select name="category" class="form-control" required>
                    <option value="">-- Select Category --</option>
                    ${catOpts}
                </select>
            </div>
            <div class="form-group">
                <label>Type</label>
                <select name="subType" class="form-control">
                    <option value="Consumable" ${item?.subType === 'Consumable' ? 'selected' : ''}>Consumable</option>
                    <option value="Disposable" ${item?.subType === 'Disposable' ? 'selected' : ''}>Disposable</option>
                    <option value="Single Use" ${item?.subType === 'Single Use' ? 'selected' : ''}>Single Use</option>
                    <option value="Reusable" ${item?.subType === 'Reusable' ? 'selected' : ''}>Reusable</option>
                </select>
            </div>
            <div class="form-group">
                <label>Quantity in Stock *</label>
                <input type="number" name="quantity" class="form-control" value="${item?.quantity || ''}" placeholder="e.g. 500" required min="0">
            </div>
            <div class="form-group">
                <label>Unit of Measure</label>
                <select name="unit" class="form-control">
                    ${['Nos','Box','Pairs','Rolls','Packets','Strips','Vials','Litres','Ml','Kg','Gm'].map(u =>
                        `<option value="${u}" ${item?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Unit Price (₹)</label>
                <input type="number" name="unitPrice" class="form-control" value="${item?.unitPrice || ''}" placeholder="e.g. 25.50" min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>Reorder Level</label>
                <input type="number" name="reorderLevel" class="form-control" value="${item?.reorderLevel || 10}" placeholder="e.g. 50" min="0">
            </div>
            <div class="form-group">
                <label>Batch / Lot Number</label>
                <input type="text" name="batchNo" class="form-control" value="${item?.batchNo || ''}" placeholder="e.g. BATCH-2024-01">
            </div>
            <div class="form-group">
                <label>Expiry Date</label>
                <input type="date" name="expiryDate" class="form-control" value="${item?.expiryDate || ''}">
            </div>
            <div class="form-group">
                <label>Vendor / Supplier</label>
                <input type="text" name="vendor" class="form-control" value="${item?.vendor || ''}" placeholder="e.g. Medline India">
            </div>
            <div class="form-group">
                <label>Storage Location</label>
                <input type="text" name="location" class="form-control" value="${item?.location || ''}" placeholder="e.g. Store Room B, Shelf 3">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Remarks / Notes</label>
                <textarea name="remarks" class="form-control" rows="2" placeholder="Any special storage conditions, notes...">${item?.remarks || ''}</textarea>
            </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button type="button" class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 ${isEdit ? 'Update' : 'Save'} Item</button>
        </div>
    </form>`;

    APP.openModal(`${isEdit ? 'Edit' : 'Add'} Consumable / Disposable Item`, html, { width: '700px' });

    setTimeout(() => {
        const form = document.getElementById('bioConsumableForm');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const fd = new FormData(form);
            const data = {};
            fd.forEach((v, k) => { data[k] = v.trim(); });
            if (!data.name || !data.category) { alert('Please fill required fields.'); return; }
            const items = DB.get('bio_consumables') || [];
            if (data.id) {
                const idx = items.findIndex(i => i.id === data.id);
                if (idx !== -1) { items[idx] = Object.assign(items[idx], data, { updatedAt: new Date().toISOString() }); }
            } else {
                data.id = 'cons_' + Date.now();
                data.createdAt = new Date().toISOString();
                items.push(data);
            }
            DB.set('bio_consumables', items);
            APP.closeModal();
            APP.notify((data.id ? 'Updated' : 'Added') + ' consumable item successfully!', 'success');
            bioInvTab = 'consumables';
            renderBiomedicalInventory(document.getElementById('pageContent') || document.getElementById('bioHodInventoryContainer'));
        });
    }, 100);
}

function deleteBioConsumable(id) {
    if (!confirm('Delete this consumable / disposable item?')) return;
    const items = (DB.get('bio_consumables') || []).filter(i => i.id !== id);
    DB.set('bio_consumables', items);
    APP.notify('Item deleted.', 'success');
    renderBioInvTabContent();
}

// Global window bindings
window.renderBiomedicalInventory = renderBiomedicalInventory;
window.renderBiomedical = renderBiomedicalInventory;
window.renderBiomedicalModule = renderBiomedicalInventory;
window.showBioEquipForm = showBioEquipForm;
window.showBioImplantForm = showBioImplantForm;
window.showBioLogImplantationModal = showBioLogImplantationModal;
window.showBioPurchaseForm = showBioPurchaseForm;
window.convertPurchaseToEquipment = convertPurchaseToEquipment;
window.showBioRenewContractModal = showBioRenewContractModal;
window.showBioLogServiceModal = showBioLogServiceModal;
window.showBioMeetingForm = showBioMeetingForm;
window.showBioTodoForm = showBioTodoForm;
window.toggleBioTodoStatus = toggleBioTodoStatus;
window.deleteBioTodo = deleteBioTodo;
window.showExecuteChecklistModal = showExecuteChecklistModal;
window.showBioEquipDetailsModal = showBioEquipDetailsModal;
window.deleteBioEquip = deleteBioEquip;
window.deleteBioImplant = deleteBioImplant;
window.deleteBioPurchase = deleteBioPurchase;
window.deleteBioMeeting = deleteBioMeeting;
window.handleBioBarcodeScan = handleBioBarcodeScan;
window.bioInvDownloadExcel = bioInvDownloadExcel;
window.bioInvDownloadPdf = bioInvDownloadPdf;
window.showBioConsumableForm = showBioConsumableForm;
window.deleteBioConsumable = deleteBioConsumable;
window.showBioCondemnForm = showBioCondemnForm;
window.deleteBioCondemn = deleteBioCondemn;
window.showBioTrainingForm = showBioTrainingForm;
window.deleteBioTraining = deleteBioTraining;
window.toggleBioTrainingAttendance = toggleBioTrainingAttendance;

/* ===========================================================================
   CONDEMNATION SECTION
   Write-off Equipment / Implants / Spare Parts / Consumables with committee approval
   =========================================================================== */
function renderBioCondemnationTab() {
    const records = DB.get('bio_condemnation') || [];
    const searchQ = (window._bioCondemnSearch || '').toLowerCase();
    const typeF   = window._bioCondemnType || '';
    const statusF = window._bioCondemnStatus || '';

    const filtered = records.filter(r => {
        const matchS = !searchQ || (r.itemName||'').toLowerCase().includes(searchQ) || (r.itemCode||'').toLowerCase().includes(searchQ);
        const matchT = !typeF   || r.itemType === typeF;
        const matchSt= !statusF || r.status === statusF;
        return matchS && matchT && matchSt;
    });

    const total      = records.length;
    const pending    = records.filter(r => r.status === 'Pending Approval').length;
    const approved   = records.filter(r => r.status === 'Approved').length;
    const disposed   = records.filter(r => r.status === 'Disposed').length;

    const itemTypes  = ['Major Equipment','Minor Equipment','Instrument','Implant','Spare Part','Consumable','Disposable','Other'];
    const statuses   = ['Pending Approval','Approved','Rejected','Disposed'];

    const typeOpts   = itemTypes.map(t  => `<option value="${t}"  ${typeF   === t  ? 'selected':''} >${t}</option>`).join('');
    const statusOpts = statuses.map(s   => `<option value="${s}"  ${statusF === s  ? 'selected':''} >${s}</option>`).join('');

    const rows = filtered.length ? filtered.map(r => {
        const statusColor = r.status === 'Approved' ? '#16a34a' : r.status === 'Rejected' ? '#dc2626' : r.status === 'Disposed' ? '#6b7280' : '#d97706';
        return `<tr>
            <td><span style="font-family:monospace;font-weight:700;color:#6366f1;font-size:12px;">${r.condemRef || r.id.slice(-6).toUpperCase()}</span></td>
            <td>
                <strong>${r.itemName}</strong>
                <div style="font-size:11px;color:var(--gray);">${r.itemCode || ''} • ${r.itemType}</div>
            </td>
            <td><span class="badge badge-light">${r.itemType}</span></td>
            <td style="font-size:12px;max-width:180px;">${r.reason || '-'}</td>
            <td style="font-size:12px;">${r.condemDate || '-'}</td>
            <td style="font-size:12px;">${r.committeeMembers || '-'}</td>
            <td><span style="font-weight:700;color:${statusColor};font-size:12px;">${r.status}</span></td>
            <td style="white-space:nowrap;">
                <button class="btn btn-sm btn-primary" style="font-size:11px;padding:2px 8px;" onclick="showBioCondemnForm('${r.id}')">&#9998; Edit</button>
                <button class="btn btn-sm btn-danger"  style="font-size:11px;padding:2px 8px;" onclick="deleteBioCondemn('${r.id}')">&#128465; Del</button>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray);">No condemnation records yet.<br><small>Click ❌ Condemn Item to record a write-off.</small></td></tr>`;

    return `<div>
        <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border-radius:14px;padding:16px 20px;color:#fff;margin-bottom:16px;display:flex;align-items:center;gap:14px;">
            <span style="font-size:32px;">❌</span>
            <div>
                <div style="font-size:17px;font-weight:800;">Condemnation Register</div>
                <div style="font-size:12px;opacity:.85;">Official write-off records for Equipment, Implants, Spare Parts, Consumables &amp; Disposables with Committee Approval</div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#dc2626;">${total}</div>
                <div style="font-size:11px;color:#b91c1c;font-weight:600;">Total Records</div>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#d97706;">${pending}</div>
                <div style="font-size:11px;color:#92400e;font-weight:600;">Pending Approval</div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#16a34a;">${approved}</div>
                <div style="font-size:11px;color:#15803d;font-weight:600;">Approved</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#475569;">${disposed}</div>
                <div style="font-size:11px;color:#64748b;font-weight:600;">Disposed</div>
            </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <input type="text" class="form-control" placeholder="🔍 Search item name or code..." style="flex:1;min-width:200px;"
                value="${window._bioCondemnSearch||''}" oninput="window._bioCondemnSearch=this.value;renderBioInvTabContent()">
            <select class="form-control" style="width:180px;" onchange="window._bioCondemnType=this.value;renderBioInvTabContent()">
                <option value="">All Types</option>${typeOpts}
            </select>
            <select class="form-control" style="width:180px;" onchange="window._bioCondemnStatus=this.value;renderBioInvTabContent()">
                <option value="">All Statuses</option>${statusOpts}
            </select>
        </div>

        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;">
                <thead><tr style="background:#fef2f2;">
                    <th>Ref No.</th><th>Item Details</th><th>Type</th><th>Reason</th>
                    <th>Condemn Date</th><th>Committee</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

function showBioCondemnForm(recId) {
    const rec    = recId ? (DB.get('bio_condemnation') || []).find(r => r.id === recId) : null;
    const isEdit = !!rec;
    const itemTypes = ['Major Equipment','Minor Equipment','Instrument','Implant','Spare Part','Consumable','Disposable','Other'];
    const statuses  = ['Pending Approval','Approved','Rejected','Disposed'];

    const html = `<form id="bioCondemnForm">
        <input type="hidden" name="id" value="${rec?.id||''}"><br>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
                <label>Item Name *</label>
                <input type="text" name="itemName" class="form-control" value="${rec?.itemName||''}" placeholder="e.g. Defibrillator Monitor" required>
            </div>
            <div class="form-group">
                <label>Item Code / Asset Tag</label>
                <input type="text" name="itemCode" class="form-control" value="${rec?.itemCode||''}" placeholder="e.g. BIO-EQ-1001">
            </div>
            <div class="form-group">
                <label>Item Type *</label>
                <select name="itemType" class="form-control" required>
                    <option value="">-- Select Type --</option>
                    ${itemTypes.map(t => `<option value="${t}" ${rec?.itemType===t?'selected':''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Condemnation Date *</label>
                <input type="date" name="condemDate" class="form-control" value="${rec?.condemDate||new Date().toISOString().slice(0,10)}" required>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Reason for Condemnation *</label>
                <textarea name="reason" class="form-control" rows="2" placeholder="e.g. Beyond economical repair, Obsolete technology, Physical damage..." required>${rec?.reason||''}</textarea>
            </div>
            <div class="form-group">
                <label>Committee Members</label>
                <input type="text" name="committeeMembers" class="form-control" value="${rec?.committeeMembers||''}" placeholder="e.g. Dr. Sharma, Mr. Patel, HOD Bio">
            </div>
            <div class="form-group">
                <label>Approved By (HOD / Admin)</label>
                <input type="text" name="approvedBy" class="form-control" value="${rec?.approvedBy||''}" placeholder="e.g. HOD Biomedical">
            </div>
            <div class="form-group">
                <label>Condemnation Reference No.</label>
                <input type="text" name="condemRef" class="form-control" value="${rec?.condemRef||'COND-'+Date.now().toString().slice(-6)}">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                    ${statuses.map(s => `<option value="${s}" ${rec?.status===s?'selected':s==='Pending Approval'&&!rec?'selected':''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Disposal Method</label>
                <select name="disposalMethod" class="form-control">
                    ${['Auction / Scrap Sale','Incineration','Return to Vendor','Donated','Written Off','Other'].map(m => `<option value="${m}" ${rec?.disposalMethod===m?'selected':''}>${m}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Scrap / Disposal Value (&#8377;)</label>
                <input type="number" name="scrapValue" class="form-control" value="${rec?.scrapValue||''}" placeholder="e.g. 500" min="0">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Remarks</label>
                <textarea name="remarks" class="form-control" rows="2" placeholder="Additional notes...">${rec?.remarks||''}</textarea>
            </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button type="button" class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-danger">💾 ${isEdit?'Update':'Submit'} Condemnation</button>
        </div>
    </form>`;

    APP.openModal(`${isEdit?'Edit':'New'} Condemnation Record`, html, { width: '720px' });
    setTimeout(() => {
        const form = document.getElementById('bioCondemnForm');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const fd = new FormData(form);
            const data = {};
            fd.forEach((v,k) => { data[k] = v.trim(); });
            if (!data.itemName || !data.itemType || !data.reason) { alert('Please fill required fields.'); return; }
            const recs = DB.get('bio_condemnation') || [];
            if (data.id) {
                const idx = recs.findIndex(r => r.id === data.id);
                if (idx !== -1) recs[idx] = Object.assign(recs[idx], data, { updatedAt: new Date().toISOString() });
            } else {
                data.id = 'cond_' + Date.now();
                data.createdAt = new Date().toISOString();
                recs.push(data);
            }
            DB.set('bio_condemnation', recs);
            APP.closeModal();
            APP.notify('Condemnation record saved!', 'success');
            bioInvTab = 'condemnation';
            renderBiomedicalInventory(document.getElementById('pageContent') || document.getElementById('bioHodInventoryContainer'));
        });
    }, 100);
}

function deleteBioCondemn(id) {
    if (!confirm('Delete this condemnation record?')) return;
    DB.set('bio_condemnation', (DB.get('bio_condemnation') || []).filter(r => r.id !== id));
    APP.notify('Record deleted.', 'success');
    renderBioInvTabContent();
}

/* ===========================================================================
   TRAINING SECTION
   HOD adds training records. Department employees can view.
   Categories: Equipment, Instrument, DRM (Daily Rhythm Meeting), O&O (Obstacles & Opportunities)
   =========================================================================== */
function renderBioTrainingTab() {
    const records  = DB.get('bio_training') || [];
    const searchQ  = (window._bioTrainSearch || '').toLowerCase();
    const catF     = window._bioTrainCat || '';

    const filtered = records.filter(r => {
        const matchS = !searchQ || (r.topic||'').toLowerCase().includes(searchQ) || (r.trainer||'').toLowerCase().includes(searchQ);
        const matchC = !catF || r.category === catF;
        return matchS && matchC;
    });

    const total     = records.length;
    const equipment = records.filter(r => r.category === 'Equipment').length;
    const instrument= records.filter(r => r.category === 'Instrument').length;
    const drn       = records.filter(r => r.category === 'DRM').length;
    const obo       = records.filter(r => r.category === 'O&O').length;

    const categories = ['Equipment','Instrument','DRM','O&O','Safety & Compliance','NABH Orientation','Other'];
    const catOpts    = categories.map(c => `<option value="${c}" ${catF===c?'selected':''}>${c}</option>`).join('');

    const catBadgeColor = { Equipment:'#3b82f6', Instrument:'#8b5cf6', DRM:'#f59e0b', 'O&O':'#10b981', 'Safety & Compliance':'#ef4444', 'NABH Orientation':'#06b6d4', Other:'#6b7280' };

    const rows = filtered.length ? filtered.map(r => {
        const bg = catBadgeColor[r.category] || '#6b7280';
        const attendees = (r.attendees || '').split(',').filter(Boolean);
        return `<tr>
            <td>
                <strong style="font-size:13px;">${r.topic}</strong>
                <div style="font-size:11px;color:var(--gray);margin-top:2px;">${r.description||''}</div>
            </td>
            <td><span style="background:${bg}18;color:${bg};border:1px solid ${bg}40;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">${r.category}</span></td>
            <td style="font-size:12px;">${r.trainingDate || '-'}</td>
            <td style="font-size:12px;">${r.trainer || '-'}</td>
            <td style="font-size:12px;">
                <span style="font-weight:700;">${attendees.length}</span> staff
                ${attendees.length ? `<div style="font-size:10px;color:var(--gray);">${attendees.slice(0,2).join(', ')}${attendees.length>2?' +' + (attendees.length-2)+' more':''}</div>` : ''}
            </td>
            <td style="font-size:12px;">${r.venue || '-'}</td>
            <td style="font-size:12px;">${r.duration || '-'}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-sm btn-primary" style="font-size:11px;padding:2px 8px;" onclick="showBioTrainingForm('${r.id}')">&#9998; Edit</button>
                <button class="btn btn-sm btn-danger"  style="font-size:11px;padding:2px 8px;" onclick="deleteBioTraining('${r.id}')">&#128465; Del</button>
            </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray);">No training records yet.<br><small>HOD can click ➕ Add Training Record to get started.</small></td></tr>`;

    return `<div>
        <div style="background:linear-gradient(135deg,#0c4a6e,#0369a1);border-radius:14px;padding:16px 20px;color:#fff;margin-bottom:16px;display:flex;align-items:center;gap:14px;">
            <span style="font-size:32px;">🎓</span>
            <div>
                <div style="font-size:17px;font-weight:800;">Training &amp; Skill Development Register</div>
                <div style="font-size:12px;opacity:.85;">Equipment | Instrument | DRM (Daily Rhythm Meeting) | O&O (Obstacles & Opportunities) | NABH Compliance Training</div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#0369a1;">${total}</div>
                <div style="font-size:11px;color:#075985;font-weight:600;">Total Sessions</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#3b82f6;">${equipment}</div>
                <div style="font-size:11px;color:#1d4ed8;font-weight:600;">Equipment</div>
            </div>
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#8b5cf6;">${instrument}</div>
                <div style="font-size:11px;color:#6d28d9;font-weight:600;">Instrument</div>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#f59e0b;">${drn}</div>
                <div style="font-size:11px;color:#92400e;font-weight:600;">DRM</div>
            </div>
            <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#10b981;">${obo}</div>
                <div style="font-size:11px;color:#065f46;font-weight:600;">O&amp;O</div>
            </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
            <input type="text" class="form-control" placeholder="🔍 Search topic or trainer..." style="flex:1;min-width:200px;"
                value="${window._bioTrainSearch||''}" oninput="window._bioTrainSearch=this.value;renderBioInvTabContent()">
            <select class="form-control" style="width:200px;" onchange="window._bioTrainCat=this.value;renderBioInvTabContent()">
                <option value="">All Categories</option>${catOpts}
            </select>
        </div>

        <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%;">
                <thead><tr style="background:#f0f9ff;">
                    <th>Topic / Description</th><th>Category</th><th>Date</th>
                    <th>Trainer</th><th>Attendees</th><th>Venue</th><th>Duration</th><th>Actions</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

function showBioTrainingForm(recId) {
    const rec    = recId ? (DB.get('bio_training') || []).find(r => r.id === recId) : null;
    const isEdit = !!rec;
    const user   = AUTH.currentUser();
    const categories = ['Equipment','Instrument','DRM','O&O','Safety & Compliance','NABH Orientation','Other'];
    const deptUsers  = (DB.get('users') || []).filter(u => (u.department||'').trim().toLowerCase() === 'biomedical' || (u.role === 'hod' && (u.department||'').trim().toLowerCase() === 'biomedical'));
    const staffList  = deptUsers.map(u => u.fullName || u.username).filter(Boolean);
    const attendeesSaved = (rec?.attendees || '').split(',').map(s => s.trim()).filter(Boolean);

    const staffCheckboxes = staffList.length
        ? staffList.map(name => `
            <label style="display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;margin:2px;">
                <input type="checkbox" name="attendee_cb" value="${name}" ${attendeesSaved.includes(name)?'checked':''}> ${name}
            </label>`).join('')
        : `<input type="text" name="attendees" class="form-control" value="${rec?.attendees||''}" placeholder="e.g. Rahul Kumar, Priya Singh">`;

    const html = `<form id="bioTrainingForm">
        <input type="hidden" name="id" value="${rec?.id||''}"><br>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Training Topic *</label>
                <input type="text" name="topic" class="form-control" value="${rec?.topic||''}" placeholder="e.g. Ventilator Operation &amp; Safety Protocol" required>
            </div>
            <div class="form-group">
                <label>Category *</label>
                <select name="category" class="form-control" required>
                    <option value="">-- Select Category --</option>
                    ${categories.map(c => `<option value="${c}" ${rec?.category===c?'selected':''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Training Date *</label>
                <input type="date" name="trainingDate" class="form-control" value="${rec?.trainingDate||new Date().toISOString().slice(0,10)}" required>
            </div>
            <div class="form-group">
                <label>Trainer / Facilitator</label>
                <input type="text" name="trainer" class="form-control" value="${rec?.trainer||user?.fullName||''}" placeholder="e.g. Biomedical HOD / Vendor Expert">
            </div>
            <div class="form-group">
                <label>Duration</label>
                <input type="text" name="duration" class="form-control" value="${rec?.duration||''}" placeholder="e.g. 2 Hours, Half Day">
            </div>
            <div class="form-group">
                <label>Venue / Location</label>
                <input type="text" name="venue" class="form-control" value="${rec?.venue||''}" placeholder="e.g. Conference Hall / Biomedical Dept">
            </div>
            <div class="form-group">
                <label>Equipment / Instrument Covered</label>
                <input type="text" name="equipmentCovered" class="form-control" value="${rec?.equipmentCovered||''}" placeholder="e.g. Ventilator, Defibrillator, BP Monitor">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Description / Agenda</label>
                <textarea name="description" class="form-control" rows="2" placeholder="Training agenda, key points covered...">${rec?.description||''}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Attendees (Department Staff)</label>
                <div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px;border:1px solid var(--border);border-radius:6px;max-height:140px;overflow-y:auto;background:#fafafa;" id="bioTrainAttBox">
                    ${staffCheckboxes}
                </div>
                ${!staffList.length ? '' : `<div style="font-size:11px;color:var(--gray);margin-top:4px;">Or type manually if staff not listed:</div><input type="text" name="attendeesManual" class="form-control" style="margin-top:4px;" value="${rec?.attendeesManual||''}" placeholder="Additional attendees (comma separated)">`}
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Remarks / Outcome</label>
                <textarea name="remarks" class="form-control" rows="2" placeholder="Training outcome, follow-up action items...">${rec?.remarks||''}</textarea>
            </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button type="button" class="btn btn-secondary" onclick="APP.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 ${isEdit?'Update':'Save'} Training Record</button>
        </div>
    </form>`;

    APP.openModal(`${isEdit?'Edit':'Add'} Training Record`, html, { width: '720px' });
    setTimeout(() => {
        const form = document.getElementById('bioTrainingForm');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const fd = new FormData(form);
            const data = {};
            fd.forEach((v,k) => {
                if (k === 'attendee_cb') return;
                data[k] = (data[k] ? data[k] + ',' : '') + v.trim();
            });
            // Collect checked attendees
            const checked = Array.from(form.querySelectorAll('[name="attendee_cb"]:checked')).map(cb => cb.value);
            data.attendees = [...checked, ...(data.attendeesManual||'').split(',').map(s=>s.trim()).filter(Boolean)].join(', ');
            if (!data.topic || !data.category) { alert('Please fill required fields.'); return; }
            const recs = DB.get('bio_training') || [];
            if (data.id) {
                const idx = recs.findIndex(r => r.id === data.id);
                if (idx !== -1) recs[idx] = Object.assign(recs[idx], data, { updatedAt: new Date().toISOString() });
            } else {
                data.id = 'train_' + Date.now();
                data.createdAt = new Date().toISOString();
                recs.push(data);
            }
            DB.set('bio_training', recs);
            APP.closeModal();
            APP.notify('Training record saved!', 'success');
            bioInvTab = 'training';
            renderBiomedicalInventory(document.getElementById('pageContent') || document.getElementById('bioHodInventoryContainer'));
        });
    }, 100);
}

function deleteBioTraining(id) {
    if (!confirm('Delete this training record?')) return;
    DB.set('bio_training', (DB.get('bio_training') || []).filter(r => r.id !== id));
    APP.notify('Training record deleted.', 'success');
    renderBioInvTabContent();
}

function toggleBioTrainingAttendance(recId, name) {
    const recs = DB.get('bio_training') || [];
    const rec  = recs.find(r => r.id === recId);
    if (!rec) return;
    const list = (rec.attendees || '').split(',').map(s => s.trim()).filter(Boolean);
    const idx  = list.indexOf(name);
    if (idx === -1) list.push(name); else list.splice(idx, 1);
    rec.attendees = list.join(', ');
    DB.set('bio_training', recs);
    renderBioInvTabContent();
}


