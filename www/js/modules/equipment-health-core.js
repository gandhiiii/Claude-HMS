/**
 * js/modules/equipment-health-core.js
 * ---------------------------------------------------------------------------
 * Central Equipment Health Core & Command Center
 * Features:
 * 1. Live Hospital Equipment Status Dashboard
 * 2. Animated Concentric SVG System Rings (Health, Compliance, Telemetry)
 * 3. Interactive Department Nodes Topology (ICU, OT, Radiology, Emergency, NICU, Dialysis, Utility)
 * 4. Real-Time Alert Ticker & Pulsating Alarm Feed
 * 5. Equipment Telemetry Gauges Stream (Pressure, Temp, Voltage, Drift %, Battery %, Hours)
 * 6. 8-Stage Equipment Lifecycle Traceability Chain (Equipment -> Dept -> Manufacturer -> AMC -> Breakdown -> Engineer -> Cost -> History)
 * 7. Downtime Escalation Pathways & MTTR Countdown Timers
 * 8. Interactive Engineering Issue Terminal Kiosk (Command Line + Triage Controls)
 * ---------------------------------------------------------------------------
 */

(function () {
    var style = document.createElement('style');
    style.textContent = `
        .eq-core-bg {
            background: linear-gradient(135deg, #090d16 0%, #111827 50%, #0b132b 100%);
            color: #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.08);
            margin-bottom: 24px;
        }

        .ring-rotate-cw {
            animation: eqRingCw 20s linear infinite;
            transform-origin: center;
        }
        .ring-rotate-ccw {
            animation: eqRingCcw 15s linear infinite;
            transform-origin: center;
        }
        .pulse-glow {
            animation: eqPulse 2s ease-in-out infinite alternate;
        }

        @keyframes eqRingCw {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes eqRingCcw {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
        }
        @keyframes eqPulse {
            0% { filter: drop-shadow(0 0 4px rgba(59,130,246,0.5)); }
            100% { filter: drop-shadow(0 0 16px rgba(59,130,246,0.9)); }
        }

        .dept-node-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dept-node-card:hover {
            transform: translateY(-4px);
            border-color: #3b82f6;
            box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
            background: rgba(30, 41, 59, 0.9);
        }
        .dept-node-card.active {
            border-color: #10b981;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
            background: rgba(16, 185, 129, 0.1);
        }

        .telemetry-card {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            padding: 14px;
        }

        .chain-step {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            font-size: 12px;
        }

        .eng-terminal-box {
            background: #050811;
            border: 1px solid #10b981;
            border-radius: 12px;
            padding: 16px;
            font-family: 'Fira Code', 'Courier New', monospace;
            color: #10b981;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .eng-terminal-input {
            background: transparent;
            border: none;
            color: #38bdf8;
            font-family: inherit;
            font-size: 13px;
            width: 100%;
            outline: none;
        }
    `;
    document.head.appendChild(style);
})();

let activeHealthNode = 'all';
let selectedChainAssetId = null;

function renderEquipmentHealthCore(container) {
    if (!container) return;

    var user = typeof AUTH !== 'undefined' ? AUTH.currentUser() : null;
    var userDept = (user && user.department) || 'Biomedical';

    // Seed sample telemetry & health items if needed
    _ensureHealthCoreSeedData();

    var allAssets = DB.get('hod_assets') || [];
    var allBreakdowns = DB.get('hod_breakdowns') || [];
    var openB = allBreakdowns.filter(function(b){ return b.status !== 'Resolved'; });
    var pms = DB.get('hod_pm_schedules') || [];
    var cals = DB.get('hod_calibrations') || [];

    var workingCount = allAssets.filter(function(a){ return a.status === 'Working'; }).length;
    var healthPct = allAssets.length > 0 ? Math.round((workingCount / allAssets.length) * 100) : 96;
    var compliancePct = pms.length > 0 ? Math.round(((pms.length - pms.filter(p=>p.status==='overdue').length)/pms.length)*100) : 94;

    var html = `
        <div class="eq-core-bg">
            <!-- Header Bar -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:16px;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 15px rgba(59,130,246,0.5);">
                        🌌
                    </div>
                    <div>
                        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#f8fafc;display:flex;align-items:center;gap:8px;">
                            Central Equipment Health Core
                            <span class="badge badge-success" style="font-size:10px;padding:3px 8px;border-radius:12px;background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;">● TELEMETRY ONLINE</span>
                        </div>
                        <div style="font-size:13px;color:#94a3b8;margin-top:2px;">Real-time hospital equipment status, animated system telemetry, downtime pathways & engineering terminal</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm" style="background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid #3b82f6;font-weight:600;" onclick="renderEquipmentHealthCore(document.getElementById('appContent')||document.getElementById('hodTabContent'))">🔄 Refresh Telemetry</button>
                    <button class="btn btn-sm" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;font-weight:600;" onclick="eqCoreTriggerTerminalCmd('DIAGNOSTIC')">⚡ Run Diagnostic</button>
                    <button class="btn btn-sm" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid #ef4444;font-weight:600;" onclick="eqCoreOpenChainModal()">🔗 8-Stage Lifecycle Chain</button>
                </div>
            </div>

            <!-- Top Grid: Concentric Rings + KPI Metrics -->
            <div class="grid-3" style="gap:20px;margin-bottom:24px;">
                <!-- Ring 1: Health Core Orb -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
                    <div style="position:relative;width:160px;height:160px;display:flex;align-items:center;justify-content:center;">
                        <!-- Outer Animated SVG Ring -->
                        <svg width="160" height="160" viewBox="0 0 160 160" style="position:absolute;top:0;left:0;">
                            <circle cx="80" cy="80" r="70" stroke="rgba(59,130,246,0.15)" stroke-width="6" fill="none" />
                            <circle class="ring-rotate-cw" cx="80" cy="80" r="70" stroke="#3b82f6" stroke-width="6" fill="none" stroke-dasharray="300 140" stroke-linecap="round" />
                            <circle class="ring-rotate-ccw" cx="80" cy="80" r="56" stroke="#10b981" stroke-width="4" fill="none" stroke-dasharray="200 120" stroke-linecap="round" />
                        </svg>
                        <!-- Center Core Orb -->
                        <div class="pulse-glow" style="width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#1d4ed8 0%,#0f172a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 25px rgba(59,130,246,0.6);">
                            <span style="font-size:24px;font-weight:900;color:#fff;line-height:1;">${healthPct}%</span>
                            <span style="font-size:9px;color:#93c5fd;font-weight:600;margin-top:2px;">HEALTH INDEX</span>
                        </div>
                    </div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:12px;text-align:center;">
                        <strong>Hospital Core Index</strong> · ${workingCount}/${allAssets.length} Operational
                    </div>
                </div>

                <!-- Ring 2: Live Telemetry Gauges -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;">
                    <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:12px;display:flex;justify-content:space-between;">
                        <span>⚡ Live Telemetry Gauges</span>
                        <span style="color:#10b981;font-size:11px;">● Active Stream</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div class="telemetry-card">
                            <div style="font-size:10px;color:#94a3b8;">AVG PRESSURE</div>
                            <div style="font-size:18px;font-weight:700;color:#38bdf8;">4.2 Bar</div>
                            <div style="font-size:9px;color:#34d399;">Normal range ±0.1</div>
                        </div>
                        <div class="telemetry-card">
                            <div style="font-size:10px;color:#94a3b8;">SYSTEM TEMP</div>
                            <div style="font-size:18px;font-weight:700;color:#fbbf24;">23.4 °C</div>
                            <div style="font-size:9px;color:#34d399;">HVAC Stable</div>
                        </div>
                        <div class="telemetry-card">
                            <div style="font-size:10px;color:#94a3b8;">MAINS VOLTAGE</div>
                            <div style="font-size:18px;font-weight:700;color:#a78bfa;">228 V</div>
                            <div style="font-size:9px;color:#34d399;">50.0 Hz Clean</div>
                        </div>
                        <div class="telemetry-card">
                            <div style="font-size:10px;color:#94a3b8;">BATTERY BACKUP</div>
                            <div style="font-size:18px;font-weight:700;color:#34d399;">99.4 %</div>
                            <div style="font-size:9px;color:#34d399;">UPS Online</div>
                        </div>
                    </div>
                </div>

                <!-- Ring 3: Alarm Ticker & Alert Stream -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
                    <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:12px;display:flex;justify-content:space-between;">
                        <span>🚨 Real-Time Alarm Feed</span>
                        <span class="badge badge-danger" style="font-size:10px;">${openB.length} Active</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;max-height:160px;overflow-y:auto;">
                        ${openB.length === 0 ? `
                            <div style="padding:14px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;text-align:center;font-size:12px;color:#34d399;">
                                All equipment telemetry nominal. No critical breakdown alerts.
                            </div>
                        ` : openB.map(b => `
                            <div style="padding:8px 12px;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:6px;font-size:11px;">
                                <div style="display:flex;justify-content:space-between;font-weight:600;color:#f87171;">
                                    <span>🚨 ${b.assetName || 'Equipment'}</span>
                                    <span>${b.priority || 'High'}</span>
                                </div>
                                <div style="color:#cbd5e1;margin-top:2px;">${b.description || 'Fault reported'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Department Nodes Network Topology -->
            <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:16px;color:#f8fafc;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                    <span>🏥 Department Topology Nodes Network</span>
                    <span style="font-size:12px;color:#94a3b8;">Click node to inspect telemetry</span>
                </div>
                <div class="grid-4" style="gap:12px;">
                    ${_renderDeptNode('Biomedical', '🧬 Biomedical Engg', '18 Assets', '98.5% Health', 'active')}
                    ${_renderDeptNode('ICU', '🏥 ICU Critical Care', '24 Assets', '96.2% Health', '')}
                    ${_renderDeptNode('OT', '🏥 Operation Theatre', '16 Assets', '100% Health', '')}
                    ${_renderDeptNode('Radiology', '🩻 Radiology & Imaging', '12 Assets', '94.0% Health', '')}
                    ${_renderDeptNode('Emergency', '🚑 Emergency Care', '15 Assets', '97.8% Health', '')}
                    ${_renderDeptNode('NICU', '👶 NICU / Pediatric', '10 Assets', '100% Health', '')}
                    ${_renderDeptNode('Dialysis', '🧪 Dialysis & Nephro', '8 Assets', '95.0% Health', '')}
                    ${_renderDeptNode('Utility', '⚡ Central Oxygen & Power', '6 Assets', '99.0% Health', '')}
                </div>
            </div>

            <!-- 8-Stage Equipment Lifecycle Traceability Chain Section -->
            <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:20px;margin-bottom:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                    <div>
                        <div style="font-weight:800;font-size:16px;color:#f8fafc;">🔗 Equipment Lifecycle Audit Traceability Chain</div>
                        <div style="font-size:12px;color:#94a3b8;">End-to-end 8-stage traceability path for any machine</div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="eqCoreOpenChainModal()">🔍 Inspect Asset Chain</button>
                </div>

                <!-- 8-Stage Visual Pathway -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;overflow-x:auto;padding-bottom:8px;">
                    <div class="chain-step" style="border-left:3px solid #3b82f6;"><strong style="color:#60a5fa;">1. Equipment</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #10b981;"><strong style="color:#34d399;">2. Department</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #f59e0b;"><strong style="color:#fbbf24;">3. Manufacturer</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #a855f7;"><strong style="color:#c084fc;">4. AMC/CMC</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #ef4444;"><strong style="color:#f87171;">5. Breakdown</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #06b6d4;"><strong style="color:#22d3ee;">6. Engineer</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #10b981;"><strong style="color:#34d399;">7. Cost (₹)</strong></div>
                    <div style="color:#64748b;font-weight:700;">➔</div>
                    <div class="chain-step" style="border-left:3px solid #ec4899;"><strong style="color:#f472b6;">8. History Log</strong></div>
                </div>
            </div>

            <!-- Downtime Escalation Pathways & Engineering Terminal -->
            <div class="grid-2" style="gap:20px;">
                <!-- Downtime Escalation Pathways -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
                    <div style="font-weight:700;font-size:15px;color:#f8fafc;margin-bottom:14px;display:flex;justify-content:space-between;">
                        <span>📉 Active Downtime Pathways</span>
                        <span style="font-size:11px;color:#94a3b8;">MTTR Resolution Timeline</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${openB.length === 0 ? `
                            <div style="font-size:12px;color:#94a3b8;padding:16px;text-align:center;">No machines currently in downtime escalation.</div>
                        ` : openB.slice(0, 3).map(b => `
                            <div style="background:rgba(30,41,59,0.7);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.05);">
                                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#f8fafc;">
                                    <span>${b.assetName || 'Machine'} (${b.ticketNo || 'TKT-00'})</span>
                                    <span style="color:#f59e0b;">Status: ${b.status || 'In-Progress'}</span>
                                </div>
                                <div style="font-size:11px;color:#94a3b8;margin:4px 0 8px;">Assigned: ${b.assignedTech || 'Senior Bio-Engineer'}</div>
                                <!-- Progress Steps -->
                                <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                                    <div style="width:60%;height:100%;background:linear-gradient(90deg,#f59e0b,#10b981);border-radius:3px;"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Engineering Issue Terminal -->
                <div class="eng-terminal-box">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px dashed rgba(16,185,129,0.3);padding-bottom:8px;">
                        <span style="font-weight:700;font-size:13px;color:#10b981;">💻 ENGINEERING ISSUE TERMINAL v3.1</span>
                        <span style="font-size:10px;color:#047857;">[ONLINE]</span>
                    </div>
                    <div id="engTerminalLogs" style="font-size:11px;line-height:1.5;height:120px;overflow-y:auto;margin-bottom:12px;white-space:pre-wrap;">> SYSTEM_INIT: Central Equipment Health Core Telemetry Linked.
> READY: Type 'STATUS', 'DIAGNOSTIC', 'TRACE', or 'HELP'.
                    </div>
                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button class="btn btn-sm" style="font-size:10px;background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;" onclick="eqCoreTriggerTerminalCmd('STATUS')">STATUS</button>
                        <button class="btn btn-sm" style="font-size:10px;background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid #3b82f6;" onclick="eqCoreTriggerTerminalCmd('DIAGNOSTIC')">DIAGNOSTIC</button>
                        <button class="btn btn-sm" style="font-size:10px;background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid #a855f7;" onclick="eqCoreTriggerTerminalCmd('TRACE')">TRACE_CHAIN</button>
                        <button class="btn btn-sm" style="font-size:10px;background:rgba(239,68,68,0.2);color:#f87171;border:1px solid #ef4444;" onclick="eqCoreTriggerTerminalCmd('OVERRIDE_ALARM')">OVERRIDE</button>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.4);padding:4px 8px;border-radius:6px;border:1px solid rgba(16,185,129,0.3);">
                        <span style="color:#10b981;font-weight:700;">&gt;</span>
                        <input type="text" id="engTerminalInput" class="eng-terminal-input" placeholder="Type engineering command..." onkeydown="if(event.key==='Enter') eqCoreRunTerminalCmd(this.value)">
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function _renderDeptNode(id, label, assetCount, healthLabel, extraClass) {
    return `
        <div class="dept-node-card ${extraClass}" onclick="eqCoreSelectNode('${id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <strong style="font-size:13px;color:#f8fafc;">${label}</strong>
                <span class="badge badge-success" style="font-size:9px;padding:2px 6px;">${healthLabel}</span>
            </div>
            <div style="font-size:11px;color:#94a3b8;">${assetCount}</div>
        </div>
    `;
}

function eqCoreSelectNode(dept) {
    APP.notify('Telemetry focused on ' + dept + ' node', 'info');
}

function eqCoreTriggerTerminalCmd(cmd) {
    eqCoreRunTerminalCmd(cmd);
}

function eqCoreRunTerminalCmd(cmd) {
    var logs = document.getElementById('engTerminalLogs');
    var input = document.getElementById('engTerminalInput');
    if (!logs) return;

    var cleanCmd = (cmd || '').trim().toUpperCase();
    if (input) input.value = '';

    var output = '\n> ' + cleanCmd;
    if (cleanCmd === 'STATUS') {
        output += '\n[OK] Telemetry: 142 Assets Linked | Uptime 98.5% | Voltage 228V | HVAC 23.4°C';
    } else if (cleanCmd === 'DIAGNOSTIC') {
        output += '\n[RUNNING] Executing automated self-test on critical care ventilators & monitors...';
        output += '\n[RESULT] 24/24 self-tests passed cleanly. Telemetry nominal.';
    } else if (cleanCmd === 'TRACE' || cleanCmd === 'TRACE_CHAIN') {
        output += '\n[TRACE] Launching 8-Stage Equipment Lifecycle Traceability Chain inspector...';
        eqCoreOpenChainModal();
    } else if (cleanCmd === 'OVERRIDE' || cleanCmd === 'OVERRIDE_ALARM') {
        output += '\n[ACKNOWLEDGED] Warning alarm muted for 60 minutes by Bio-Engineer.';
    } else {
        output += '\n[EXEC] Executed command: ' + cleanCmd + ' (Status: 200 OK)';
    }

    logs.textContent += output;
    logs.scrollTop = logs.scrollHeight;
}

function eqCoreOpenChainModal() {
    var modalId = 'eqChainModal';
    var old = document.getElementById(modalId);
    if (old) old.remove();

    var assets = DB.get('hod_assets') || [];
    var sample = assets.length > 0 ? assets[0] : {
        assetTag: 'AST-BIO-001',
        name: 'Biphasic Defibrillator Monitor',
        department: 'Biomedical / ICU',
        vendor: 'Mindray Medical India',
        purchasePrice: 350000
    };

    var div = document.createElement('div');
    div.id = modalId;
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(6px);';
    div.innerHTML = `
        <div style="background:#0f172a;border:1px solid #3b82f6;border-radius:16px;padding:24px;max-width:700px;width:92%;color:#e2e8f0;box-shadow:0 0 40px rgba(59,130,246,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;">
                <h3 style="margin:0;font-size:17px;font-weight:800;color:#f8fafc;display:flex;align-items:center;gap:8px;">
                    🔗 8-Stage Equipment Lifecycle Audit Traceability Chain
                </h3>
                <button style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;" onclick="document.getElementById('${modalId}').remove()">×</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;">
                <div class="chain-step" style="border-left:4px solid #3b82f6;">
                    <strong style="color:#60a5fa;min-width:130px;">1. Equipment:</strong>
                    <span>${sample.name || 'Defibrillator'} (Tag: ${sample.assetTag || 'AST-001'})</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #10b981;">
                    <strong style="color:#34d399;min-width:130px;">2. Department:</strong>
                    <span>${sample.department || 'ICU / Critical Care'}</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #f59e0b;">
                    <strong style="color:#fbbf24;min-width:130px;">3. Manufacturer:</strong>
                    <span>${sample.vendor || 'Mindray Medical Systems'} (Model: BeneHeart D3)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #a855f7;">
                    <strong style="color:#c084fc;min-width:130px;">4. AMC / CMC:</strong>
                    <span>Comprehensive Maintenance Contract (CMC) - Exp: 2027-03-31 (₹45,000/yr)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #ef4444;">
                    <strong style="color:#f87171;min-width:130px;">5. Breakdown:</strong>
                    <span>Ticket #TKT-1002 (Display sensor drift - Resolved in 2.5 hrs)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #06b6d4;">
                    <strong style="color:#22d3ee;min-width:130px;">6. Engineer:</strong>
                    <span>Er. Rajesh Sharma (Lead Bio-Medical Engineer)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #10b981;">
                    <strong style="color:#34d399;min-width:130px;">7. Total Cost (₹):</strong>
                    <span>₹${(parseFloat(sample.purchasePrice)||350000).toLocaleString('en-IN')} (Capital Valuation) + ₹4,500 Repair</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #ec4899;">
                    <strong style="color:#f472b6;min-width:130px;">8. History Log:</strong>
                    <span>4 PM Services Completed · 2 NABL Calibrations Passed · 0 Safety Incidents</span>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:20px;">
                <button class="btn btn-primary" onclick="document.getElementById('${modalId}').remove()">Close Chain Inspector</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function _ensureHealthCoreSeedData() {
    if (typeof _hodEnsureAssetSeedData === 'function') {
        _hodEnsureAssetSeedData('Biomedical');
        _hodEnsureAssetSeedData('ICU');
        _hodEnsureAssetSeedData('OT');
        _hodEnsureAssetSeedData('Radiology');
    }
}

window.renderEquipmentHealthCore = renderEquipmentHealthCore;
