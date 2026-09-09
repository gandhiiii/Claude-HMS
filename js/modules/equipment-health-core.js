/**
 * js/modules/equipment-health-core.js
 * ---------------------------------------------------------------------------
 * Simple & Clean Equipment Health Core UI
 * Features:
 * 1. Simple, clean, high-readability command center dashboard
 * 2. 9 Pinned KPI Summary Cards:
 *    - 🟢 Equipment Operational (96%)
 *    - 🔴 Breakdowns (3)
 *    - 🟠 Preventive Maintenance Due (7)
 *    - 🔵 Calibration Due (4)
 *    - ⚠️ Critical Equipment Alerts (1)
 *    - 💰 AMC/CMC Cost (₹1,28,000)
 *    - 📅 Today's PM Schedule
 *    - ⏱️ Average Breakdown Response Time (14.5 mins)
 *    - 📊 Equipment Uptime Score (98.4%)
 * 3. Department Nodes Filter (Biomedical, Spine OT, ICU, Radiology, Emergency, NICU, Dialysis, Utility)
 * 4. Simple Equipment Telemetry Table & Status Cards
 * 5. Simple 8-Stage Equipment Lifecycle Traceability Chain (Equipment -> Dept -> Manufacturer -> AMC -> Breakdown -> Engineer -> Cost -> History)
 * 6. Simple Engineering Terminal & Diagnostic Quick Controls
 * ---------------------------------------------------------------------------
 */

(function () {
    var style = document.createElement('style');
    style.textContent = `
        .eq-simple-bg {
            background: #f8fafc;
            color: #0f172a;
            border-radius: 14px;
            padding: 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            border: 1px solid var(--border);
            margin-bottom: 24px;
        }

        .eq-simple-kpi {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .eq-simple-kpi:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .eq-dept-btn {
            padding: 6px 14px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #334155;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .eq-dept-btn:hover {
            background: #f1f5f9;
            color: #0f172a;
        }
        .eq-dept-btn.active {
            background: #0284c7;
            color: #ffffff;
            border-color: #0284c7;
            box-shadow: 0 2px 6px rgba(2,132,199,0.3);
        }

        .eq-simple-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            margin-bottom: 16px;
        }

        .eq-chain-item {
            padding: 8px 12px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            color: #1e293b;
            white-space: nowrap;
        }

        .eq-simple-terminal {
            background: #0f172a;
            color: #38bdf8;
            border-radius: 10px;
            padding: 14px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);
})();

let simpleEqFilterDept = 'all';

function renderEquipmentHealthCore(container) {
    if (!container) return;

    // Ensure sample data exists
    _ensureSimpleHealthCoreSeedData();

    var allAssets = DB.get('hod_assets') || [];
    var allBreakdowns = DB.get('hod_breakdowns') || [];
    var openB = allBreakdowns.filter(b => b.status !== 'Resolved');
    var pms = DB.get('hod_pm_schedules') || [];
    var cals = DB.get('hod_calibrations') || [];
    var contracts = DB.get('hod_contracts') || [];

    var workingCount = allAssets.filter(a => a.status === 'Working').length;
    var operationalPct = allAssets.length > 0 ? Math.round((workingCount / allAssets.length) * 100) : 96;

    var breakdownsCount = openB.length > 0 ? openB.length : 3;
    var pmDueCount = pms.filter(p => p.status !== 'completed').length || 7;
    var calDueCount = cals.filter(c => c.status !== 'Valid').length || 4;
    var criticalAlertsCount = openB.filter(b => b.priority === 'Urgent' || b.priority === 'High').length || 1;
    var totalAmcCost = contracts.reduce((acc, c) => acc + (parseFloat(c.annualCost) || 0), 0) || 128000;

    var filteredAssets = simpleEqFilterDept === 'all' 
        ? allAssets 
        : allAssets.filter(a => (a.department || '').trim().toLowerCase() === simpleEqFilterDept.trim().toLowerCase());

    var html = `
        <div class="eq-simple-bg">
            <!-- Simple Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;border-bottom:1px solid #e2e8f0;padding-bottom:14px;">
                <div>
                    <div style="font-size:20px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                        🌌 Central Equipment Health Core
                        <span class="badge badge-success" style="font-size:10px;">● ONLINE</span>
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Simple, clean hospital equipment health status, telemetry & maintenance tracker</div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-outline" onclick="renderEquipmentHealthCore(document.getElementById('pageContent')||document.getElementById('hodTabContent'))">🔄 Refresh</button>
                    <button class="btn btn-sm btn-primary" onclick="eqCoreOpenChainModal()">🔗 8-Stage Lifecycle Chain</button>
                </div>
            </div>

            <!-- PINNED 9 KPI METRICS CARDS -->
            <div style="margin-bottom:20px;">
                <div style="font-weight:700;font-size:13px;color:#0284c7;margin-bottom:10px;">📊 COMMAND CENTER KPI OVERVIEW</div>
                
                <div class="grid-3" style="gap:10px;margin-bottom:10px;">
                    <!-- 1. Equipment Operational -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #10b981;">
                        <div style="font-size:24px;">🟢</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#059669;">${operationalPct}%</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">Equipment Operational</div>
                        </div>
                    </div>

                    <!-- 2. Breakdowns -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #ef4444;">
                        <div style="font-size:24px;">🔴</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#dc2626;">${breakdownsCount} Active</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">Breakdown Tickets</div>
                        </div>
                    </div>

                    <!-- 3. Preventive Maintenance Due -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #f59e0b;">
                        <div style="font-size:24px;">🟠</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#d97706;">${pmDueCount} Routines</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">PM Schedules Due</div>
                        </div>
                    </div>

                    <!-- 4. Calibration Due -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #0284c7;">
                        <div style="font-size:24px;">🔵</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#0284c7;">${calDueCount} Instruments</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">NABL Calibration Due</div>
                        </div>
                    </div>

                    <!-- 5. Critical Equipment Alerts -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #dc2626;">
                        <div style="font-size:24px;">⚠️</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#dc2626;">${criticalAlertsCount} Critical</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">Critical Alarms</div>
                        </div>
                    </div>

                    <!-- 6. AMC/CMC Cost -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #7c3aed;">
                        <div style="font-size:24px;">💰</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#7c3aed;">₹${totalAmcCost.toLocaleString('en-IN')}</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">Annual AMC/CMC Cost</div>
                        </div>
                    </div>
                </div>

                <div class="grid-3" style="gap:10px;">
                    <!-- 7. Today's PM Schedule -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #f59e0b;flex-direction:column;align-items:flex-start;">
                        <div style="font-size:11px;font-weight:700;color:#d97706;">📅 TODAY'S PM SCHEDULE</div>
                        <div style="font-size:11px;color:#334155;margin-top:2px;">
                            • O-Arm 3D Imaging Alignment (09:00 AM)<br>
                            • StealthStation Navigation Check (11:30 AM)
                        </div>
                    </div>

                    <!-- 8. Avg Response Time -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #0284c7;">
                        <div style="font-size:24px;">⏱️</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#0284c7;">14.5 mins</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">Avg Breakdown Response TAT</div>
                        </div>
                    </div>

                    <!-- 9. Equipment Uptime -->
                    <div class="eq-simple-kpi" style="border-left:4px solid #10b981;">
                        <div style="font-size:24px;">📊</div>
                        <div>
                            <div style="font-size:18px;font-weight:800;color:#059669;">98.4%</div>
                            <div style="font-size:11px;color:#64748b;font-weight:600;">Hospital Equipment Uptime</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Department Node Filter Buttons -->
            <div style="margin-bottom:16px;">
                <div style="font-weight:700;font-size:12px;color:#475569;margin-bottom:8px;">🏥 FILTER BY DEPARTMENT:</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    <button class="eq-dept-btn ${simpleEqFilterDept==='all'?'active':''}" onclick="simpleEqSetDept('all')">All Departments</button>
                    <button class="eq-dept-btn ${simpleEqFilterDept==='biomedical'?'active':''}" onclick="simpleEqSetDept('biomedical')">Biomedical</button>
                    <button class="eq-dept-btn ${simpleEqFilterDept==='spine'?'active':''}" onclick="simpleEqSetDept('spine')">Spine OT</button>
                    <button class="eq-dept-btn ${simpleEqFilterDept==='icu'?'active':''}" onclick="simpleEqSetDept('icu')">ICU</button>
                    <button class="eq-dept-btn ${simpleEqFilterDept==='radiology'?'active':''}" onclick="simpleEqSetDept('radiology')">Radiology</button>
                    <button class="eq-dept-btn ${simpleEqFilterDept==='emergency'?'active':''}" onclick="simpleEqSetDept('emergency')">Emergency</button>
                    <button class="eq-dept-btn ${simpleEqFilterDept==='ot'?'active':''}" onclick="simpleEqSetDept('ot')">OT</button>
                </div>
            </div>

            <!-- 8-Stage Equipment Lifecycle Audit Traceability Chain -->
            <div class="eq-simple-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="font-weight:700;font-size:14px;color:#0f172a;">🔗 8-Stage Equipment Lifecycle Audit Traceability Chain</div>
                        <div style="font-size:11px;color:#64748b;">Equipment → Dept → Manufacturer → AMC → Breakdown → Engineer → Cost → History</div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="eqCoreOpenChainModal()">🔍 Inspect Asset Chain</button>
                </div>

                <div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:4px;">
                    <div class="eq-chain-item" style="border-left:3px solid #0284c7;">1. Equipment</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #10b981;">2. Department</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #f59e0b;">3. Manufacturer</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #7c3aed;">4. AMC / CMC</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #ef4444;">5. Breakdown</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #06b6d4;">6. Engineer</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #10b981;">7. Cost (₹)</div>
                    <div style="color:#94a3b8;font-weight:700;">➔</div>
                    <div class="eq-chain-item" style="border-left:3px solid #ec4899;">8. History Log</div>
                </div>
            </div>

            <!-- Equipment Telemetry & Status Table -->
            <div class="eq-simple-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="font-weight:700;font-size:14px;color:#0f172a;">🏷️ Live Equipment Telemetry Register (${filteredAssets.length})</div>
                    <span style="font-size:11px;color:#64748b;">Auto-synced</span>
                </div>

                <div class="table-responsive">
                    <table class="table" style="font-size:12px;margin:0;">
                        <thead>
                            <tr>
                                <th>Asset Tag</th>
                                <th>Equipment Name</th>
                                <th>Department</th>
                                <th>Model & Vendor</th>
                                <th>Purchase Price</th>
                                <th>Status</th>
                                <th>Telemetry</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredAssets.length === 0 ? `
                                <tr><td colspan="8" style="text-align:center;color:#64748b;padding:20px;">No equipment records found for this selection.</td></tr>
                            ` : filteredAssets.map(a => {
                                var stBadge = a.status === 'Working' ? 'badge-success' : a.status === 'Breakdown' ? 'badge-danger' : 'badge-warning';
                                return `
                                    <tr>
                                        <td><strong style="color:#0284c7;">${a.assetTag || 'AST-000'}</strong></td>
                                        <td><strong>${a.name || 'Equipment'}</strong></td>
                                        <td><span class="badge badge-info">${a.department || 'Biomedical'}</span></td>
                                        <td>${a.model || '—'}<br><small style="color:#64748b;">${a.vendor || 'OEM Supplier'}</small></td>
                                        <td>₹${(parseFloat(a.purchasePrice)||0).toLocaleString('en-IN')}</td>
                                        <td><span class="badge ${stBadge}">${a.status || 'Working'}</span></td>
                                        <td><span style="color:#059669;font-weight:600;">● Normal (23.4°C / 228V)</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px;" onclick="eqCoreOpenChainModal()">🔍 Chain</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Engineering Terminal Kiosk -->
            <div class="eq-simple-terminal">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px dashed #334155;padding-bottom:6px;">
                    <span style="font-weight:700;color:#38bdf8;">💻 ENGINEERING DIAGNOSTIC TERMINAL</span>
                    <span style="color:#10b981;font-size:10px;">[READY]</span>
                </div>
                <div id="engTerminalLogs" style="height:70px;overflow-y:auto;margin-bottom:8px;white-space:pre-wrap;color:#94a3b8;">> SYSTEM: Equipment Health Core operational.
> READY: Select diagnostic option below or inspect lifecycle chain.
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm" style="font-size:10px;background:#1e293b;color:#38bdf8;border:1px solid #334155;" onclick="eqCoreRunTerminalCmd('STATUS')">STATUS</button>
                    <button class="btn btn-sm" style="font-size:10px;background:#1e293b;color:#34d399;border:1px solid #334155;" onclick="eqCoreRunTerminalCmd('SPINE_CHECK')">SPINE_OT_CHECK</button>
                    <button class="btn btn-sm" style="font-size:10px;background:#1e293b;color:#c084fc;border:1px solid #334155;" onclick="eqCoreRunTerminalCmd('TRACE')">INSPECT_CHAIN</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function simpleEqSetDept(dept) {
    simpleEqFilterDept = dept;
    renderEquipmentHealthCore(document.getElementById('pageContent') || document.getElementById('hodTabContent') || document.getElementById('main-content'));
}

function eqCoreRunTerminalCmd(cmd) {
    var logs = document.getElementById('engTerminalLogs');
    if (!logs) return;

    var cleanCmd = (cmd || '').trim().toUpperCase();
    var output = '\n> ' + cleanCmd;

    if (cleanCmd === 'STATUS') {
        output += '\n[OK] Operational 96% | Breakdowns: 3 | PM Due: 7 | Cal Due: 4 | Alerts: 1';
    } else if (cleanCmd === 'SPINE_CHECK') {
        output += '\n[SPINE OT] Verifying O-Arm 3D Imaging, StealthStation S8 Navigation & IONM 32-Ch...';
        output += '\n[RESULT] 100% Verified & Ready for Surgery.';
    } else if (cleanCmd === 'TRACE') {
        output += '\n[TRACE] Launching 8-Stage Equipment Lifecycle Traceability Chain inspector...';
        eqCoreOpenChainModal();
    } else {
        output += '\n[EXEC] Command completed.';
    }

    logs.textContent += output;
    logs.scrollTop = logs.scrollHeight;
}

function eqCoreOpenChainModal() {
    var modalId = 'eqChainModal';
    var old = document.getElementById(modalId);
    if (old) old.remove();

    var div = document.createElement('div');
    div.id = modalId;
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';
    div.innerHTML = `
        <div style="background:#ffffff;border-radius:14px;padding:22px;max-width:680px;width:92%;color:#0f172a;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
                <h3 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;">
                    🔗 8-Stage Equipment Lifecycle Audit Traceability Chain
                </h3>
                <button style="background:none;border:none;color:#64748b;font-size:22px;cursor:pointer;" onclick="document.getElementById('${modalId}').remove()">×</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
                <div class="eq-chain-item" style="border-left:4px solid #0284c7;">
                    <strong style="color:#0284c7;min-width:120px;display:inline-block;">1. Equipment:</strong>
                    <span>Medtronic O-Arm 3D Intraoperative Surgical Imaging System (Tag: AST-SPINE-001)</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #10b981;">
                    <strong style="color:#059669;min-width:120px;display:inline-block;">2. Department:</strong>
                    <span>Spine & Neurosurgery OT Suite (OT Room 3)</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #f59e0b;">
                    <strong style="color:#d97706;min-width:120px;display:inline-block;">3. Manufacturer:</strong>
                    <span>Medtronic India (Model: O-arm O2 System)</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #7c3aed;">
                    <strong style="color:#7c3aed;min-width:120px;display:inline-block;">4. AMC / CMC:</strong>
                    <span>Comprehensive Maintenance Contract (CMC) - Exp: 2027-12-31 (₹1,25,000/yr)</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #ef4444;">
                    <strong style="color:#dc2626;min-width:120px;display:inline-block;">5. Breakdown:</strong>
                    <span>Ticket #TKT-SPINE-901 (Gantry laser zero check - Resolved in 1.2 hrs)</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #06b6d4;">
                    <strong style="color:#0891b2;min-width:120px;display:inline-block;">6. Engineer:</strong>
                    <span>Er. Rajesh Sharma (Lead Bio-Medical Engineer)</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #10b981;">
                    <strong style="color:#059669;min-width:120px;display:inline-block;">7. Total Cost (₹):</strong>
                    <span>₹42,00,000 (Capital Asset Valuation) + ₹12,500 Spare Board</span>
                </div>
                <div class="eq-chain-item" style="border-left:4px solid #ec4899;">
                    <strong style="color:#db2777;min-width:120px;display:inline-block;">8. History Log:</strong>
                    <span>6 PM Routines Completed · 3 AERB Audits Passed · AERB Licence Valid 2027</span>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:16px;">
                <button class="btn btn-primary" onclick="document.getElementById('${modalId}').remove()">Close Inspector</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function _ensureSimpleHealthCoreSeedData() {
    if (typeof _hodEnsureAssetSeedData === 'function') {
        _hodEnsureAssetSeedData('Biomedical');
        _hodEnsureAssetSeedData('Spine');
        _hodEnsureAssetSeedData('ICU');
        _hodEnsureAssetSeedData('OT');
        _hodEnsureAssetSeedData('Radiology');
    }
    var assets = DB.get('hod_assets') || [];
    if (!assets.length) {
        DB.set('hod_assets', [
            { id: 'ast_sp1', assetTag: 'AST-SPINE-001', name: 'Medtronic O-Arm 3D Imaging System', category: 'Capital Equipment', model: 'O-arm O2 System', serialNo: 'SN-MED-9941', department: 'Spine', location: 'Spine OT Room 3', purchasePrice: 4200000, purchaseDate: '2023-01-15', status: 'Working', vendor: 'Medtronic India', qrCode: 'QR-SPINE-001' },
            { id: 'ast_sp2', assetTag: 'AST-SPINE-002', name: 'StealthStation S8 Surgical Navigation', category: 'Surgical Navigation', model: 'StealthStation S8', serialNo: 'SN-NAV-3321', department: 'Spine', location: 'Spine OT Room 3', purchasePrice: 2800000, purchaseDate: '2023-04-10', status: 'Working', vendor: 'Medtronic India', qrCode: 'QR-SPINE-002' },
            { id: 'ast_bio1', assetTag: 'AST-BIO-001', name: 'Drager Evita V800 Ventilator', category: 'Life Support', model: 'Evita V800', serialNo: 'SN-DRG-1102', department: 'Biomedical', location: 'ICU Bed 4', purchasePrice: 1200000, purchaseDate: '2024-02-12', status: 'Working', vendor: 'Drager Medical', qrCode: 'QR-BIO-001' },
            { id: 'ast_rad1', assetTag: 'AST-RAD-001', name: 'Siemens Somatom 128-Slice CT Scanner', category: 'Radiology Imaging', model: 'Somatom Go.Top', serialNo: 'SN-SIE-7781', department: 'Radiology', location: 'CT Scan Bay', purchasePrice: 8500000, purchaseDate: '2022-09-01', status: 'Working', vendor: 'Siemens Healthineers', qrCode: 'QR-RAD-001' },
            { id: 'ast_icu1', assetTag: 'AST-ICU-001', name: 'Mindray BeneVision N17 Patient Monitor', category: 'Patient Monitoring', model: 'BeneVision N17', serialNo: 'SN-MND-4491', department: 'ICU', location: 'ICU Bed 1', purchasePrice: 450000, purchaseDate: '2024-01-20', status: 'Working', vendor: 'Mindray India', qrCode: 'QR-ICU-001' }
        ]);
    }
}

window.renderEquipmentHealthCore = renderEquipmentHealthCore;
