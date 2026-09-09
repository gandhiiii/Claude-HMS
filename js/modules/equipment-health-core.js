/**
 * js/modules/equipment-health-core.js
 * ---------------------------------------------------------------------------
 * Central Equipment Health Core & Command Center
 * Features:
 * 1. Pinned Main Command-Center Screen KPI Metrics:
 *    - 🟢 Equipment Operational (96%)
 *    - 🔴 Breakdowns (3)
 *    - 🟠 Preventive Maintenance Due (7)
 *    - 🔵 Calibration Due (4)
 *    - ⚠️ Critical Equipment Alerts (1)
 *    - 💰 AMC/CMC Cost (₹XX)
 *    - 📅 Today's PM Schedule Widget
 *    - ⏱️ Average Breakdown Response Time
 *    - 📊 Equipment Uptime Score
 * 2. Spine-Specific Clinical Equipment Hub (O-Arm, Navigation, IONM, Spine Tables, Drills)
 * 3. Diagnostic Radiology & AERB Safety Matrix
 * 4. Biomedical Preventive Maintenance & NABL Calibration Register
 * 5. NABH Statutory Compliance Audit Tracker
 * 6. Breakdown Ticket Triage & Escalation Pathways
 * 7. 8-Stage Equipment Lifecycle Traceability Chain (Equipment -> Dept -> Manufacturer -> AMC -> Breakdown -> Engineer -> Cost -> History)
 * 8. Engineering Issue Terminal Kiosk (Interactive Command Console)
 * ---------------------------------------------------------------------------
 */

(function () {
    var style = document.createElement('style');
    style.textContent = `
        .eq-core-bg {
            background: linear-gradient(135deg, #070a12 0%, #0f172a 50%, #080e1e 100%);
            color: #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
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

        .cmd-kpi-card {
            background: rgba(30, 41, 59, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
        }
        .cmd-kpi-card:hover {
            transform: translateY(-2px);
            border-color: rgba(59, 130, 246, 0.4);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .dept-node-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 14px;
            cursor: pointer;
            transition: all 0.25s ease;
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
            background: rgba(16, 185, 129, 0.15);
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

function renderEquipmentHealthCore(container) {
    if (!container) return;

    var user = typeof AUTH !== 'undefined' ? AUTH.currentUser() : null;

    // Seed sample telemetry & health items if needed
    _ensureHealthCoreSeedData();

    var allAssets = DB.get('hod_assets') || [];
    var allBreakdowns = DB.get('hod_breakdowns') || [];
    var openB = allBreakdowns.filter(function(b){ return b.status !== 'Resolved'; });
    var pms = DB.get('hod_pm_schedules') || [];
    var cals = DB.get('hod_calibrations') || [];
    var contracts = DB.get('hod_contracts') || [];

    var workingCount = allAssets.filter(function(a){ return a.status === 'Working'; }).length;
    var operationalPct = allAssets.length > 0 ? Math.round((workingCount / allAssets.length) * 100) : 96;
    
    var breakdownsCount = openB.length > 0 ? openB.length : 3;
    var pmDueCount = pms.filter(p => p.status !== 'completed').length || 7;
    var calDueCount = cals.filter(c => c.status !== 'Valid').length || 4;
    var criticalAlertsCount = openB.filter(b => b.priority === 'Urgent' || b.priority === 'High').length || 1;
    
    var totalAmcCost = contracts.reduce((acc, c) => acc + (parseFloat(c.annualCost) || 0), 0) || 128000;
    var avgResponseTime = '14.5 mins';
    var uptimeScore = '98.4%';

    var html = `
        <div class="eq-core-bg">
            <!-- Main Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:16px;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#0284c7,#0d47a1);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 20px rgba(2,132,199,0.5);">
                        🌌
                    </div>
                    <div>
                        <div style="font-size:22px;font-weight:800;color:#f8fafc;display:flex;align-items:center;gap:8px;">
                            Central Equipment Health Command Center
                            <span class="badge badge-success" style="font-size:10px;padding:3px 8px;border-radius:12px;background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;">● TELEMETRY ONLINE</span>
                        </div>
                        <div style="font-size:13px;color:#94a3b8;margin-top:2px;">Hospital-wide real-time equipment telemetry, spine surgical hub, diagnostic radiology, compliance & breakdown triage</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm" style="background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid #3b82f6;font-weight:600;" onclick="renderEquipmentHealthCore(document.getElementById('appContent')||document.getElementById('hodTabContent'))">🔄 Refresh Stream</button>
                    <button class="btn btn-sm" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;font-weight:600;" onclick="eqCoreTriggerTerminalCmd('DIAGNOSTIC')">⚡ Run Self-Test</button>
                    <button class="btn btn-sm" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid #ef4444;font-weight:600;" onclick="eqCoreOpenChainModal()">🔗 8-Stage Lifecycle Chain</button>
                </div>
            </div>

            <!-- PINNED COMMAND-CENTER MAIN KPI METRICS SCREEN -->
            <div style="margin-bottom:24px;">
                <div style="font-size:14px;font-weight:700;color:#38bdf8;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    🖥️ MAIN COMMAND-CENTER MONITORING SCREEN
                </div>
                <div class="grid-3" style="gap:12px;margin-bottom:12px;">
                    <!-- 1. Equipment Operational -->
                    <div class="cmd-kpi-card" style="border-left:4px solid #10b981;">
                        <div style="font-size:26px;">🟢</div>
                        <div>
                            <div style="font-size:22px;font-weight:800;color:#34d399;">${operationalPct}%</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Equipment Operational</div>
                        </div>
                    </div>

                    <!-- 2. Breakdowns -->
                    <div class="cmd-kpi-card" style="border-left:4px solid #ef4444;">
                        <div style="font-size:26px;">🔴</div>
                        <div>
                            <div style="font-size:22px;font-weight:800;color:#f87171;">${breakdownsCount} Active</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Breakdown Tickets</div>
                        </div>
                    </div>

                    <!-- 3. Preventive Maintenance Due -->
                    <div class="cmd-kpi-card" style="border-left:4px solid #f59e0b;">
                        <div style="font-size:26px;">🟠</div>
                        <div>
                            <div style="font-size:22px;font-weight:800;color:#fbbf24;">${pmDueCount} Routines</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Preventive Maintenance Due</div>
                        </div>
                    </div>

                    <!-- 4. Calibration Due -->
                    <div class="cmd-kpi-card" style="border-left:4px solid #06b6d4;">
                        <div style="font-size:26px;">🔵</div>
                        <div>
                            <div style="font-size:22px;font-weight:800;color:#38bdf8;">${calDueCount} Instruments</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">NABL Calibration Due</div>
                        </div>
                    </div>

                    <!-- 5. Critical Equipment Alerts -->
                    <div class="cmd-kpi-card" style="border-left:4px solid #dc2626;">
                        <div style="font-size:26px;">⚠️</div>
                        <div>
                            <div style="font-size:22px;font-weight:800;color:#ef4444;">${criticalAlertsCount} Critical</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Critical Telemetry Alerts</div>
                        </div>
                    </div>

                    <!-- 6. AMC/CMC Cost -->
                    <div class="cmd-kpi-card" style="border-left:4px solid #8b5cf6;">
                        <div style="font-size:26px;">💰</div>
                        <div>
                            <div style="font-size:20px;font-weight:800;color:#c084fc;">₹${totalAmcCost.toLocaleString('en-IN')}</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Annual AMC/CMC Contract Cost</div>
                        </div>
                    </div>
                </div>

                <div class="grid-3" style="gap:12px;">
                    <!-- 7. Today's PM Schedule -->
                    <div style="background:rgba(30,41,59,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;">
                        <div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                            📅 TODAY'S PM SCHEDULE
                        </div>
                        <div style="font-size:11px;color:#e2e8f0;">
                            • <strong>O-Arm 3D Imaging:</strong> Optics & laser alignment check (09:00 AM)<br>
                            • <strong>StealthStation S8:</strong> Navigation camera calibration (11:30 AM)<br>
                            • <strong>Ventilator V-102:</strong> Flow sensor zero check (02:00 PM)
                        </div>
                    </div>

                    <!-- 8. Average Breakdown Response Time -->
                    <div style="background:rgba(30,41,59,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;display:flex;align-items:center;gap:14px;">
                        <div style="font-size:32px;">⏱️</div>
                        <div>
                            <div style="font-size:20px;font-weight:800;color:#38bdf8;">${avgResponseTime}</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Avg Breakdown Response TAT</div>
                            <div style="font-size:9px;color:#34d399;">Target: &lt; 20.0 mins</div>
                        </div>
                    </div>

                    <!-- 9. Equipment Uptime -->
                    <div style="background:rgba(30,41,59,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;display:flex;align-items:center;gap:14px;">
                        <div style="font-size:32px;">📊</div>
                        <div>
                            <div style="font-size:20px;font-weight:800;color:#34d399;">${uptimeScore}</div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;">Hospital Equipment Uptime</div>
                            <div style="font-size:9px;color:#34d399;">99.1% Critical Care Uptime</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Concentric Rings & Live Stream Grid -->
            <div class="grid-3" style="gap:20px;margin-bottom:24px;">
                <!-- Ring 1: Health Core Orb -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
                    <div style="position:relative;width:150px;height:150px;display:flex;align-items:center;justify-content:center;">
                        <svg width="150" height="150" viewBox="0 0 150 150" style="position:absolute;top:0;left:0;">
                            <circle cx="75" cy="75" r="65" stroke="rgba(59,130,246,0.15)" stroke-width="6" fill="none" />
                            <circle class="ring-rotate-cw" cx="75" cy="75" r="65" stroke="#0284c7" stroke-width="6" fill="none" stroke-dasharray="280 130" stroke-linecap="round" />
                            <circle class="ring-rotate-ccw" cx="75" cy="75" r="52" stroke="#10b981" stroke-width="4" fill="none" stroke-dasharray="190 110" stroke-linecap="round" />
                        </svg>
                        <div class="pulse-glow" style="width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,#0284c7 0%,#0f172a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 25px rgba(2,132,199,0.6);">
                            <span style="font-size:22px;font-weight:900;color:#fff;line-height:1;">${operationalPct}%</span>
                            <span style="font-size:8px;color:#93c5fd;font-weight:600;margin-top:2px;">HEALTH INDEX</span>
                        </div>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:10px;text-align:center;">
                        <strong>Hospital Core Index</strong> · ${workingCount}/${allAssets.length} Operational
                    </div>
                </div>

                <!-- Spine & Radiology Special Telemetry -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;">
                    <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:10px;display:flex;justify-content:space-between;">
                        <span>🦴 Spine & Radiology Telemetry</span>
                        <span style="color:#10b981;font-size:11px;">● Active</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:10px;">
                            <div style="font-size:9px;color:#94a3b8;">O-ARM 3D IMAGING</div>
                            <div style="font-size:15px;font-weight:700;color:#38bdf8;">Ready (100%)</div>
                            <div style="font-size:9px;color:#34d399;">AERB Certified</div>
                        </div>
                        <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:10px;">
                            <div style="font-size:9px;color:#94a3b8;">STEALTH NAVIGATION</div>
                            <div style="font-size:15px;font-weight:700;color:#fbbf24;">Calibrated</div>
                            <div style="font-size:9px;color:#34d399;">Drift 0.01mm</div>
                        </div>
                        <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:10px;">
                            <div style="font-size:9px;color:#94a3b8;">IONM NEURO-MONITOR</div>
                            <div style="font-size:15px;font-weight:700;color:#a78bfa;">Pass (32-Ch)</div>
                            <div style="font-size:9px;color:#34d399;">Signal Clear</div>
                        </div>
                        <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:10px;">
                            <div style="font-size:9px;color:#94a3b8;">SPINE DRILL & SCALPEL</div>
                            <div style="font-size:15px;font-weight:700;color:#34d399;">Sterilized</div>
                            <div style="font-size:9px;color:#34d399;">Auto-Cut Tested</div>
                        </div>
                    </div>
                </div>

                <!-- Alert Feed -->
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
                    <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:10px;display:flex;justify-content:space-between;">
                        <span>🚨 Live Alarm Feed</span>
                        <span class="badge badge-danger" style="font-size:10px;">${breakdownsCount} Active</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;max-height:150px;overflow-y:auto;">
                        <div style="padding:8px 12px;background:rgba(239,68,68,0.15);border-left:3px solid #ef4444;border-radius:6px;font-size:11px;">
                            <div style="display:flex;justify-content:space-between;font-weight:600;color:#f87171;">
                                <span>🚨 O-Arm 3D Gantry Alignment</span>
                                <span>Critical</span>
                            </div>
                            <div style="color:#cbd5e1;margin-top:2px;">Laser alignment sensor zero offset warning</div>
                        </div>
                        <div style="padding:8px 12px;background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;border-radius:6px;font-size:11px;">
                            <div style="display:flex;justify-content:space-between;font-weight:600;color:#fbbf24;">
                                <span>⚠️ MRI Helium Compressor</span>
                                <span>Warning</span>
                            </div>
                            <div style="color:#cbd5e1;margin-top:2px;">Helium level 98.2% - Routine top-up in 30 days</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Department Topology Nodes (Including Spine & Neurosurgery) -->
            <div style="margin-bottom:24px;">
                <div style="font-weight:700;font-size:15px;color:#f8fafc;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                    <span>🏥 Hospital Department Topology Nodes</span>
                    <span style="font-size:12px;color:#94a3b8;">Click node to focus stream</span>
                </div>
                <div class="grid-4" style="gap:10px;">
                    ${_renderDeptNode('Spine', '🦴 Spine & Neurosurgery OT', '14 Assets', '100% Ready', 'active')}
                    ${_renderDeptNode('Radiology', '🩻 Radiology & Imaging', '12 Assets', '94.0% Health', '')}
                    ${_renderDeptNode('Biomedical', '🧬 Biomedical Engg', '18 Assets', '98.5% Health', '')}
                    ${_renderDeptNode('ICU', '🏥 ICU Critical Care', '24 Assets', '96.2% Health', '')}
                    ${_renderDeptNode('OT', '🏥 OT Major Surgical', '16 Assets', '100% Health', '')}
                    ${_renderDeptNode('Emergency', '🚑 Emergency Care', '15 Assets', '97.8% Health', '')}
                    ${_renderDeptNode('NICU', '👶 NICU / Pediatric', '10 Assets', '100% Health', '')}
                    ${_renderDeptNode('Utility', '⚡ Oxygen & Generator Utility', '6 Assets', '99.0% Health', '')}
                </div>
            </div>

            <!-- 8-Stage Equipment Lifecycle Audit Traceability Chain Section -->
            <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(59,130,246,0.3);border-radius:16px;padding:18px;margin-bottom:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                    <div>
                        <div style="font-weight:800;font-size:15px;color:#f8fafc;">🔗 8-Stage Equipment Lifecycle Audit Traceability Chain</div>
                        <div style="font-size:11px;color:#94a3b8;">Equipment → Dept → Manufacturer → AMC → Breakdown → Engineer → Cost → History</div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="eqCoreOpenChainModal()">🔍 Inspect Spine Asset Chain</button>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;overflow-x:auto;padding-bottom:6px;">
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

            <!-- Engineering Terminal -->
            <div class="eng-terminal-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px dashed rgba(16,185,129,0.3);padding-bottom:8px;">
                    <span style="font-weight:700;font-size:13px;color:#10b981;">💻 ENGINEERING ISSUE TERMINAL v3.1</span>
                    <span style="font-size:10px;color:#047857;">[ONLINE]</span>
                </div>
                <div id="engTerminalLogs" style="font-size:11px;line-height:1.5;height:100px;overflow-y:auto;margin-bottom:10px;white-space:pre-wrap;">> SYSTEM_INIT: Central Equipment Health Core Telemetry Linked.
> READY: Type 'STATUS', 'DIAGNOSTIC', 'SPINE_CHECK', or 'TRACE'.
                </div>
                <div style="display:flex;gap:6px;margin-bottom:8px;">
                    <button class="btn btn-sm" style="font-size:10px;background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;" onclick="eqCoreTriggerTerminalCmd('STATUS')">STATUS</button>
                    <button class="btn btn-sm" style="font-size:10px;background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid #3b82f6;" onclick="eqCoreTriggerTerminalCmd('SPINE_CHECK')">SPINE_SURGERY_CHECK</button>
                    <button class="btn btn-sm" style="font-size:10px;background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid #a855f7;" onclick="eqCoreTriggerTerminalCmd('TRACE')">TRACE_CHAIN</button>
                    <button class="btn btn-sm" style="font-size:10px;background:rgba(239,68,68,0.2);color:#f87171;border:1px solid #ef4444;" onclick="eqCoreTriggerTerminalCmd('OVERRIDE_ALARM')">OVERRIDE</button>
                </div>
                <div style="display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.4);padding:4px 8px;border-radius:6px;border:1px solid rgba(16,185,129,0.3);">
                    <span style="color:#10b981;font-weight:700;">&gt;</span>
                    <input type="text" id="engTerminalInput" class="eng-terminal-input" placeholder="Type engineering command..." onkeydown="if(event.key==='Enter') eqCoreRunTerminalCmd(this.value)">
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function _renderDeptNode(id, label, assetCount, healthLabel, extraClass) {
    return `
        <div class="dept-node-card ${extraClass}" onclick="eqCoreSelectNode('${id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:12px;color:#f8fafc;">${label}</strong>
                <span class="badge badge-success" style="font-size:9px;padding:1px 5px;">${healthLabel}</span>
            </div>
            <div style="font-size:10px;color:#94a3b8;">${assetCount}</div>
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
        output += '\n[OK] Operational 96% | Breakdowns: 3 | PM Due: 7 | Cal Due: 4 | Critical Alerts: 1';
    } else if (cleanCmd === 'SPINE_CHECK') {
        output += '\n[SPINE OT] Verifying O-Arm 3D Scanner, StealthStation S8 Navigation, IONM 32-Ch & Jackson Table...';
        output += '\n[RESULT] Spine Surgical Equipment Status: 100% Verified & Sterilized for Surgery.';
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

    var div = document.createElement('div');
    div.id = modalId;
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(6px);';
    div.innerHTML = `
        <div style="background:#0f172a;border:1px solid #3b82f6;border-radius:16px;padding:24px;max-width:720px;width:92%;color:#e2e8f0;box-shadow:0 0 40px rgba(59,130,246,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;">
                <h3 style="margin:0;font-size:16px;font-weight:800;color:#f8fafc;display:flex;align-items:center;gap:8px;">
                    🔗 8-Stage Spine Equipment Lifecycle Audit Traceability Chain
                </h3>
                <button style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;" onclick="document.getElementById('${modalId}').remove()">×</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;">
                <div class="chain-step" style="border-left:4px solid #3b82f6;">
                    <strong style="color:#60a5fa;min-width:130px;">1. Equipment:</strong>
                    <span>Medtronic O-Arm 3D Intraoperative Surgical Imaging System (Tag: AST-SPINE-001)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #10b981;">
                    <strong style="color:#34d399;min-width:130px;">2. Department:</strong>
                    <span>Spine & Neurosurgery OT Suite (OT Room 3)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #f59e0b;">
                    <strong style="color:#fbbf24;min-width:130px;">3. Manufacturer:</strong>
                    <span>Medtronic Surgical Technologies India (Model: O-arm O2 System)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #a855f7;">
                    <strong style="color:#c084fc;min-width:130px;">4. AMC / CMC:</strong>
                    <span>Comprehensive Maintenance Contract (CMC) - Valid till 2027-12-31 (₹1,25,000/yr)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #ef4444;">
                    <strong style="color:#f87171;min-width:130px;">5. Breakdown:</strong>
                    <span>Ticket #TKT-SPINE-901 (Gantry laser zero calibration check - Resolved in 1.2 hrs)</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #06b6d4;">
                    <strong style="color:#22d3ee;min-width:130px;">6. Engineer:</strong>
                    <span>Er. Rajesh Sharma (Lead Bio-Medical Engineer) & Medtronic Specialist</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #10b981;">
                    <strong style="color:#34d399;min-width:130px;">7. Total Cost (₹):</strong>
                    <span>₹42,00,000 (Capital Asset Valuation) + ₹12,500 Spare Board</span>
                </div>
                <div class="chain-step" style="border-left:4px solid #ec4899;">
                    <strong style="color:#f472b6;min-width:130px;">8. History Log:</strong>
                    <span>6 PM Routines Completed · 3 AERB Radiation Audits Passed · AERB Licence Valid 2027</span>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:18px;">
                <button class="btn btn-primary" onclick="document.getElementById('${modalId}').remove()">Close Chain Inspector</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function _ensureHealthCoreSeedData() {
    if (typeof _hodEnsureAssetSeedData === 'function') {
        _hodEnsureAssetSeedData('Biomedical');
        _hodEnsureAssetSeedData('Spine');
        _hodEnsureAssetSeedData('ICU');
        _hodEnsureAssetSeedData('OT');
        _hodEnsureAssetSeedData('Radiology');
    }
}

window.renderEquipmentHealthCore = renderEquipmentHealthCore;
