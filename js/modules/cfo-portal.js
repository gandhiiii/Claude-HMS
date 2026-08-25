// HMS — CFO Workspace (Executive Financial Suite & High-Visibility Data Control Engine)

(function () {
    'use strict';

    var _activeTab = 'hierarchy';
    var _cfoCharts = [];
    var _approvalTierFilter = 'all';

    /* ── Executive Authority Threshold Resolver (Dual USD & INR Thresholds) ── */
    function _getAuthorityTier(amount, category) {
        var val = Number(amount) || 0;
        var usd = val / 83; // $1 = ₹83 standard conversion reference
        var cat = (category || '').toLowerCase();

        if (cat.indexOf('>500k') !== -1 || cat.indexOf('mega capex') !== -1 || usd >= 500000) {
            return {
                level: 5,
                code: 'L5_CHAIRMAN',
                role: 'CHAIRMAN',
                name: 'Chairman / Board of Directors',
                shortName: 'Chairman & Board',
                thresholdLabel: 'Mega CAPEX > $500K (> ₹4.15 Cr)',
                usdRange: '> $500K',
                inrRange: '> ₹4.15 Cr',
                scope: 'Consolidated Multi-Hospital P&L, Mega CAPEX >$500K, Strategic Direction, Mergers/Acquisitions, Major Capital Infusions',
                bg: '#ffebee',
                border: '#c62828',
                color: '#b71c1c',
                badgeStyle: 'background:#ffebee;color:#b71c1c;border:1px solid #ef5350;',
                icon: '👑'
            };
        }
        if (cat.indexOf('100k - 500k') !== -1 || cat.indexOf('100k-$500k') !== -1 || cat.indexOf('high-value capex') !== -1 || usd >= 100000) {
            return {
                level: 4,
                code: 'L4_VICE_CHAIRMAN',
                role: 'VICE_CHAIRMAN',
                name: 'Vice Chairman',
                shortName: 'Vice Chairman',
                thresholdLabel: 'Strategic Projects, CAPEX $100K - $500K (₹83L - ₹4.15 Cr)',
                usdRange: '$100K - $500K',
                inrRange: '₹83L - ₹4.15 Cr',
                scope: 'Operational Oversight, High-Value CAPEX, Strategic Projects, Annual Budget Sign-off',
                bg: '#f3e5f5',
                border: '#7b1fa2',
                color: '#4a148c',
                badgeStyle: 'background:#f3e5f5;color:#4a148c;border:1px solid #ab47bc;',
                icon: '👔'
            };
        }
        if (cat.indexOf('25k - 100k') !== -1 || cat.indexOf('25k-$100k') !== -1 || cat.indexOf('opex override') !== -1 || usd >= 25000) {
            return {
                level: 3,
                code: 'L3_MD',
                role: 'MD',
                name: 'Managing Director (MD)',
                shortName: 'Managing Director',
                thresholdLabel: 'OPEX Overrides, CAPEX $25K - $100K (₹20.75L - ₹83L)',
                usdRange: '$25K - $100K',
                inrRange: '₹20.75L - ₹83L',
                scope: 'Hospital Operations & Clinical Growth, Doctor Contracts, Departmental Budgets',
                bg: '#fff3e0',
                border: '#f57c00',
                color: '#e65100',
                badgeStyle: 'background:#fff3e0;color:#e65100;border:1px solid #ffb74d;',
                icon: '🏥'
            };
        }
        if (cat.indexOf('5k - 25k') !== -1 || cat.indexOf('5k-$25k') !== -1 || cat.indexOf('budget approval') !== -1 || usd >= 5000) {
            return {
                level: 2,
                code: 'L2_CFO',
                role: 'CFO',
                name: 'Chief Financial Officer (CFO)',
                shortName: 'CFO',
                thresholdLabel: 'Budget Approvals, Payments $5K - $25K (₹4.15L - ₹20.75L)',
                usdRange: '$5K - $25K',
                inrRange: '₹4.15L - ₹20.75L',
                scope: 'Financial Strategy, Cash Runway, RCM, Tax Strategy & Treasury Management',
                bg: '#e8f5e9',
                border: '#2e7d32',
                color: '#1b5e20',
                badgeStyle: 'background:#e8f5e9;color:#1b5e20;border:1px solid #66bb6a;',
                icon: '💼'
            };
        }
        return {
            level: 1,
            code: 'L1_ACCOUNTANT',
            role: 'CHIEF_ACCOUNTANT',
            name: 'Chief Accountant',
            shortName: 'Chief Accountant',
            thresholdLabel: 'Entries, Reconciliations, Payments < $5K (< ₹4.15L)',
            usdRange: '< $5K',
            inrRange: '< ₹4.15L',
            scope: 'Transaction Execution, Verification, Book Closing, Vouchers & Initial Sign-off',
            bg: '#e3f2fd',
            border: '#1976d2',
            color: '#0d47a1',
            badgeStyle: 'background:#e3f2fd;color:#0d47a1;border:1px solid #42a5f5;',
            icon: '📝'
        };
    }

    /* ── Initial Seed Data Getters with Persistent Fallbacks ── */
    function _getExecKpis() {
        var items = DB.get('cfo_exec_kpis');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { metric: 'Gross Hospital Revenue', current: 14500000, prior: 13800000, target: 14000000, variance: '+₹5.0L (+3.5%)', status: 'On Target' },
                { metric: 'Operating Costs (OPEX)', current: 9800000, prior: 9500000, target: 9600000, variance: '-₹2.0L (-2.0%)', status: 'Controlled' },
                { metric: 'Debt Service Coverage (DSCR)', current: '1.85x', prior: '1.75x', target: '1.50x', variance: '+0.35x Safety Margin', status: 'Healthy' },
                { metric: 'Bed Occupancy Rate', current: '82.4%', prior: '80.1%', target: '78.0%', variance: '+4.4% Utilization', status: 'Optimal' }
            ];
            DB.set('cfo_exec_kpis', items);
        }
        return items;
    }

    function _getApprovals() {
        var items = DB.get('cfo_approvals_v2');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { id: 'REQ-101', category: 'Voucher Sign-off (<$5K)', amount: 180000, vendorOrPatient: 'Apex Lab Supplies', dept: 'Pathology', reason: 'Routine reagent voucher & verification clearance', status: 'pending', date: '2026-08-25' },
                { id: 'REQ-201', category: 'Vendor Invoice ($5K-$25K)', amount: 1250000, vendorOrPatient: 'Sun Pharma Distributors', dept: 'Pharmacy', reason: 'Bulk antibiotic stock invoice clearance', status: 'pending', date: '2026-08-24' },
                { id: 'REQ-301', category: 'OPEX Override ($25K-$100K)', amount: 4500000, vendorOrPatient: 'Medtronic India', dept: 'Cardiology', reason: 'Emergency CathLab inventory & OPEX override', status: 'pending', date: '2026-08-24' },
                { id: 'REQ-401', category: 'Strategic Project ($100K-$500K)', amount: 22500000, vendorOrPatient: 'Olympus Medical Systems', dept: 'Endoscopy', reason: 'High-Value 4K Endoscopy Tower & OT Upgrade', status: 'pending', date: '2026-08-24' },
                { id: 'REQ-501', category: 'Mega CAPEX (> $500K)', amount: 68000000, vendorOrPatient: 'Siemens Healthineers', dept: 'Radiology & Oncology', reason: 'Consolidated PET-CT & Radiotherapy Linear Accelerator Infusion', status: 'pending', date: '2026-08-22' },
                { id: 'DSC-101', category: 'Patient Concession Waiver', amount: 45000, vendorOrPatient: 'Patient: Suresh Kumar', dept: 'IPD Billing', reason: 'Hardship waiver for extended ICU stay', status: 'pending', date: '2026-08-24' },
                { id: 'DOC-501', category: 'Doctor Payout Release Batch', amount: 1423000, vendorOrPatient: 'Monthly Doctor Batch (18 Docs)', dept: 'Finance', reason: 'August doctor fee-sharing disbursement', status: 'pending', date: '2026-08-24' }
            ];
            DB.set('cfo_approvals_v2', items);
        }
        return items;
    }

    function _getClaims() {
        var items = DB.get('cfo_claims');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { payer: 'Star Health Insurance', totalClaims: 142, approved: 3250000, denied: 145000, cause: 'Pre-auth Delay', risk: 'Low Risk' },
                { payer: 'HDFC ERGO Health', totalClaims: 98, approved: 2410000, denied: 82000, cause: 'ICD-10 Coding Mismatch', risk: 'Low Risk' },
                { payer: 'Ayushman Bharat PM-JAY', totalClaims: 215, approved: 4100000, denied: 310000, cause: 'Package Tariff Cap Exceeded', risk: 'Medium Leakage' },
                { payer: 'ICICI Lombard TPA', totalClaims: 76, approved: 1850000, denied: 65000, cause: 'Missing Discharge Summary', risk: 'Low Risk' }
            ];
            DB.set('cfo_claims', items);
        }
        return items;
    }

    function _getSpecialties() {
        var items = DB.get('cfo_specialties');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { name: 'Cardiology & CathLab', revenue: 4200000, directCost: 2400000, margin: 42.8, procedures: 124, abcCost: 19354 },
                { name: 'Oncology & Radiation', revenue: 3800000, directCost: 2150000, margin: 43.4, procedures: 95, abcCost: 22631 },
                { name: 'Orthopedics & Joint', revenue: 3600000, directCost: 2100000, margin: 41.6, procedures: 88, abcCost: 23863 },
                { name: 'Neurology & Neurosurgery', revenue: 3100000, directCost: 1850000, margin: 40.3, procedures: 64, abcCost: 28906 },
                { name: 'Radiology & Imaging', revenue: 1850000, directCost: 620000, margin: 66.4, procedures: 450, abcCost: 1377 }
            ];
            DB.set('cfo_specialties', items);
        }
        return items;
    }

    function _getCapex() {
        var items = DB.get('cfo_capex');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { name: '1.5T MRI Scanner (Siemens)', dept: 'Radiology', cost: 12500000, revenueYTD: 3400000, roi: '27.2%', payback: '3.6 Years', status: 'Active' },
                { name: 'CathLab Angiography Machine', dept: 'Cardiology', cost: 18000000, revenueYTD: 5800000, roi: '32.2%', payback: '3.1 Years', status: 'Active' },
                { name: '4D Ultrasound Machine (GE)', dept: 'Radiology/OBG', cost: 3500000, revenueYTD: 1400000, roi: '40.0%', payback: '2.5 Years', status: 'Active' },
                { name: 'Modular OT Integration System', dept: 'Surgery', cost: 6500000, revenueYTD: 1900000, roi: '29.2%', payback: '3.4 Years', status: 'Approved' }
            ];
            DB.set('cfo_capex', items);
        }
        return items;
    }

    function _getVendors() {
        var items = DB.get('cfo_vendors');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { name: 'Sun Pharma Distributors', invCount: 14, totalDue: 1420000, current: 850000, overdue: 570000, days: 45 },
                { name: 'Medtronic India Pvt Ltd', invCount: 6, totalDue: 2150000, current: 1900000, overdue: 250000, days: 32 },
                { name: 'Olympus Medical Systems', invCount: 3, totalDue: 680000, current: 680000, overdue: 0, days: 15 },
                { name: 'Johnson & Johnson Medical', invCount: 9, totalDue: 1120000, current: 720000, overdue: 400000, days: 60 }
            ];
            DB.set('cfo_vendors', items);
        }
        return items;
    }

    function _destroyCharts() {
        for (var i = 0; i < _cfoCharts.length; i++) {
            try { _cfoCharts[i].destroy(); } catch (e) {}
        }
        _cfoCharts = [];
    }

    function _makeChart(canvasId, config) {
        if (typeof Chart === 'undefined') return null;
        var ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        try {
            var chart = new Chart(ctx, config);
            _cfoCharts.push(chart);
            return chart;
        } catch (e) {
            console.warn('[CFO] Chart error on ' + canvasId + ':', e);
            return null;
        }
    }

    function _formatCurrency(amt) {
        if (typeof amt === 'string' && (amt.indexOf('x') !== -1 || amt.indexOf('%') !== -1)) return amt;
        var num = Number(amt) || 0;
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function _kpiCard(icon, label, value, subtext, color) {
        color = color || 'var(--primary)';
        return '<div class="stat-card" style="border-left-color:' + color + ';background:var(--card);padding:16px;border-radius:12px;border:1px solid var(--border);border-left:4px solid ' + color + ';">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
            + '<div><div style="font-size:12px;color:var(--gray);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">' + label + '</div>'
            + '<div style="font-size:22px;font-weight:800;color:var(--text);margin:4px 0;">' + value + '</div>'
            + (subtext ? '<div style="font-size:11px;color:' + color + ';font-weight:600;">' + subtext + '</div>' : '')
            + '</div><div style="width:40px;height:40px;border-radius:10px;background:' + color + '15;display:flex;align-items:center;justify-content:center;font-size:20px;">' + icon + '</div>'
            + '</div></div>';
    }

    function _badge(text, type) {
        var bg = type === 'success' ? '#e8f5e9' : type === 'danger' ? '#ffebee' : type === 'warning' ? '#fff8e1' : '#e3f2fd';
        var fg = type === 'success' ? '#2e7d32' : type === 'danger' ? '#c62828' : type === 'warning' ? '#f57f17' : '#1565c0';
        return '<span style="background:' + bg + ';color:' + fg + ';font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-block;">' + text + '</span>';
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 1: 📊 Executive Dashboard (With Data Entry & Delete)
    ────────────────────────────────────────────────────────── */
    function _renderExecutiveTab() {
        var admissions = DB.get('admissions') || [];
        var activeBeds = admissions.filter(function (a) { return a.status === 'admitted'; }).length;
        var totalRev = admissions.length * 48500 + (DB.get('inventory') || []).length * 1250;
        var revPOB = activeBeds > 0 ? Math.round(totalRev / Math.max(1, activeBeds)) : 14200;
        var kpis = _getExecKpis();

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📈', 'EBITDA Margin', '26.8%', '▲ +2.4% vs last month', '#2e7d32')
            + _kpiCard('🛏️', 'RevPOB (Rev / Occupied Bed)', _formatCurrency(revPOB), 'Active Occupied Beds: ' + activeBeds, '#1a73e8')
            + _kpiCard('⚖️', 'Current Ratio', '2.1x', 'Healthy Solvency Target (>1.5)', '#6a1b9a')
            + _kpiCard('💵', 'Cash Flow Runway', '45 Days Buffer', 'Treasury Liquidity: ₹48.5L', '#f57f17')
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:16px;margin-bottom:20px;">'
            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
            + '<div style="font-weight:700;font-size:15px;">📊 Monthly EBITDA & Financial Trend</div>'
            + '<span style="font-size:12px;color:var(--gray);">FY 2025-26</span>'
            + '</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoExecTrendChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
            + '<div style="font-weight:700;font-size:15px;">🛏️ Bed Occupancy vs Revenue Yield</div>'
            + '<span style="font-size:12px;color:var(--gray);">Yield Analysis</span>'
            + '</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoBedYieldChart"></canvas></div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">⚡ Executive Financial Metric Ledger</div>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddExecKpiModal()">➕ Add Custom Financial Entry</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Financial Indicator Metric</th><th>Current Value</th><th>Prior Period</th><th>Target Benchmark</th><th>Variance</th><th>Status</th><th>Data Control</th></tr></thead>'
            + '<tbody>';

        kpis.forEach(function (k, idx) {
            html += '<tr>'
                + '<td><strong>' + k.metric + '</strong></td>'
                + '<td style="font-weight:700;">' + _formatCurrency(k.current) + '</td>'
                + '<td>' + _formatCurrency(k.prior) + '</td>'
                + '<td>' + _formatCurrency(k.target) + '</td>'
                + '<td style="color:#2e7d32;font-weight:700;">' + k.variance + '</td>'
                + '<td>' + _badge(k.status, 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteExecKpi(' + idx + ')">🗑️ Remove Entry</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';

        setTimeout(function () {
            _makeChart('cfoExecTrendChart', {
                type: 'line',
                data: {
                    labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                    datasets: [
                        { label: 'Revenue (Lakhs)', data: [110, 118, 125, 130, 138, 142, 145, 140, 150, 155, 160, 168], borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.3 },
                        { label: 'EBITDA (Lakhs)', data: [28, 30, 34, 35, 38, 39, 41, 38, 44, 46, 48, 52], borderColor: '#2e7d32', backgroundColor: 'transparent', borderDash: [4, 4], tension: 0.3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            _makeChart('cfoBedYieldChart', {
                type: 'bar',
                data: {
                    labels: ['ICU Beds', 'Ventilator Beds', 'Super-Deluxe IPD', 'Private Wards', 'Semi-Private Wards', 'General Wards'],
                    datasets: [
                        { label: 'Occupancy Rate (%)', data: [92, 88, 75, 84, 86, 78], backgroundColor: '#1a73e8' },
                        { label: 'Revenue Yield (₹k / day)', data: [25, 35, 12, 8, 5, 2.5], backgroundColor: '#2e7d32' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 2: 💳 Revenue Cycle & Payer Analytics
    ────────────────────────────────────────────────────────── */
    function _renderRcmTab() {
        var claims = _getClaims();
        var totalDenial = claims.reduce(function (s, c) { return s + (c.denied || 0); }, 0);
        var totalApproved = claims.reduce(function (s, c) { return s + (c.approved || 0); }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('💳', 'Total Receivables (AR)', _formatCurrency(6850000), 'Outstanding Collections', '#1a73e8')
            + _kpiCard('⏳', '0-30 Days Bucket', _formatCurrency(4120000), '60.1% Current AR', '#2e7d32')
            + _kpiCard('⚠️', 'Total Denied Claims', _formatCurrency(totalDenial), claims.length + ' Payer Records', '#c62828')
            + _kpiCard('🛡️', 'Total Approved Claims', _formatCurrency(totalApproved), 'Settled Collections', '#6a1b9a')
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;margin-bottom:20px;">'
            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">📅 AR Aging Buckets (0-30, 31-60, 61-90, 90+ days)</div>'
            + '<div style="position:relative;height:240px;"><canvas id="cfoArAgingChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">🛡️ Insurance Denial Root Cause Breakdown</div>'
            + '<div style="position:relative;height:240px;"><canvas id="cfoDenialCauseChart"></canvas></div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📜 Insurance & TPA Denial Analysis & Payer Records</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddClaimModal()">➕ Add Payer Claim Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportRcmExcel()">📊 Export RCM Report</button>'
            + '</div>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Payer / TPA Name</th><th>Total Claims</th><th>Approved (₹)</th><th>Denied (₹)</th><th>Root Cause Category</th><th>Risk Level</th><th>Data Control</th></tr></thead>'
            + '<tbody>';

        claims.forEach(function (c, idx) {
            html += '<tr>'
                + '<td><strong>' + c.payer + '</strong></td>'
                + '<td>' + c.totalClaims + '</td>'
                + '<td>' + _formatCurrency(c.approved) + '</td>'
                + '<td style="color:#c62828;font-weight:700;">' + _formatCurrency(c.denied) + '</td>'
                + '<td>' + c.cause + '</td>'
                + '<td>' + _badge(c.risk, c.risk.indexOf('Medium') !== -1 ? 'warning' : 'info') + '</td>'
                + '<td>'
                + '<button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteClaim(' + idx + ')">🗑️ Remove Entry</button>'
                + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';

        setTimeout(function () {
            _makeChart('cfoArAgingChart', {
                type: 'bar',
                data: {
                    labels: ['0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
                    datasets: [{ label: 'Receivables Amount (₹)', data: [4120000, 1250000, 640000, 840000], backgroundColor: ['#2e7d32', '#1a73e8', '#f57f17', '#c62828'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            _makeChart('cfoDenialCauseChart', {
                type: 'pie',
                data: {
                    labels: ['Pre-auth Delay (35%)', 'ICD Coding Mismatch (25%)', 'Package Tariff Cap (22%)', 'Missing Clinical Docs (18%)'],
                    datasets: [{ data: [35, 25, 22, 18], backgroundColor: ['#f57f17', '#1a73e8', '#c62828', '#9c27b0'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 3: 🏥 Unit Economics & Costing
    ────────────────────────────────────────────────────────── */
    function _renderUnitEconomicsTab() {
        var specialties = _getSpecialties();

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🏥', 'Specialties Tracked', specialties.length + ' Departments', 'Unit Economics Active', '#2e7d32')
            + _kpiCard('⚡', 'Total Gross Revenue', _formatCurrency(specialties.reduce(function(s,x){ return s + x.revenue; }, 0)), 'Specialty Portfolio', '#1a73e8')
            + _kpiCard('🔪', 'OT Hourly Revenue Yield', _formatCurrency(14500), 'Avg OT Hourly Rate', '#6a1b9a')
            + _kpiCard('🛏️', 'ICU Daily Yield / Bed', _formatCurrency(28500), '92% Occupancy Rate', '#f57f17')
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">🏢 Specialty P&L & Direct Costs Breakdown</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoSpecialtyPnlChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📋 Activity-Based Costing (ABC Model) & Specialty Costing Ledger</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddSpecialtyModal()">➕ Add Specialty Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportPnlExcel()">📊 Export Costing Excel</button>'
            + '</div>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Specialty Department</th><th>Procedure Count</th><th>Gross Revenue</th><th>Direct Cost</th><th>Unit ABC Cost / Proc</th><th>Contribution Margin</th><th>Margin %</th><th>Data Control</th></tr></thead>'
            + '<tbody>';

        specialties.forEach(function (s, idx) {
            var contrib = s.revenue - s.directCost;
            html += '<tr>'
                + '<td><strong>' + s.name + '</strong></td>'
                + '<td>' + s.procedures + '</td>'
                + '<td>' + _formatCurrency(s.revenue) + '</td>'
                + '<td>' + _formatCurrency(s.directCost) + '</td>'
                + '<td>' + _formatCurrency(s.abcCost) + '</td>'
                + '<td style="font-weight:700;color:#2e7d32;">' + _formatCurrency(contrib) + '</td>'
                + '<td><strong>' + s.margin + '%</strong></td>'
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteSpecialty(' + idx + ')">🗑️ Remove Entry</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';

        setTimeout(function () {
            _makeChart('cfoSpecialtyPnlChart', {
                type: 'bar',
                data: {
                    labels: specialties.map(function (s) { return s.name; }),
                    datasets: [
                        { label: 'Gross Revenue (₹)', data: specialties.map(function (s) { return s.revenue; }), backgroundColor: '#1a73e8' },
                        { label: 'Direct Costs (₹)', data: specialties.map(function (s) { return s.directCost; }), backgroundColor: '#e53935' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 0: 🏛️ Executive Approval Hierarchy & Governance Diagram
    ────────────────────────────────────────────────────────── */
    function _renderHierarchyTab() {
        var approvals = _getApprovals();
        var tiers = [
            {
                level: 5,
                roleTitle: 'CHAIRMAN / BOARD OF DIRECTORS',
                subtitle: 'Strategic Direction, Mergers/Acquisitions, Major Capital Infusions',
                limitText: 'Consolidated Multi-Hospital P&L, Mega CAPEX > $500K (> ₹4.15 Cr)',
                usdThreshold: '> $500,000',
                inrThreshold: '> ₹4.15 Crores',
                color: '#b71c1c',
                bgGradient: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                borderColor: '#ef5350',
                icon: '👑',
                responsibilities: ['Consolidated Multi-Hospital P&L', 'Mega CAPEX (> $500K)', 'Strategic Direction & Expansion', 'Mergers & Acquisitions', 'Major Capital Infusions']
            },
            {
                level: 4,
                roleTitle: 'VICE CHAIRMAN',
                subtitle: 'Operational Oversight, High-Value CAPEX, Annual Budget Sign-off',
                limitText: 'Strategic Projects, CAPEX $100K - $500K (₹83L - ₹4.15 Cr)',
                usdThreshold: '$100,000 - $500,000',
                inrThreshold: '₹83 Lakhs - ₹4.15 Crores',
                color: '#4a148c',
                bgGradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                borderColor: '#ab47bc',
                icon: '👔',
                responsibilities: ['Operational Oversight', 'High-Value CAPEX ($100K-$500K)', 'Strategic Hospital Projects', 'Annual Operating Budget Sign-off']
            },
            {
                level: 3,
                roleTitle: 'MANAGING DIRECTOR (MD)',
                subtitle: 'Hospital Operations & Clinical Growth, Doctor Contracts & Departmental Budgets',
                limitText: 'OPEX Overrides, CAPEX $25K - $100K (₹20.75L - ₹83L)',
                usdThreshold: '$25,000 - $100,000',
                inrThreshold: '₹20.75 Lakhs - ₹83 Lakhs',
                color: '#e65100',
                bgGradient: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderColor: '#ffa726',
                icon: '🏥',
                responsibilities: ['Hospital Operations & Clinical Growth', 'Doctor Contracts & Consultations', 'Departmental Budgets', 'OPEX Overrides & CAPEX ($25K-$100K)']
            },
            {
                level: 2,
                roleTitle: 'CHIEF FINANCIAL OFFICER (CFO)',
                subtitle: 'Financial Strategy, Cash Runway, RCM, Tax Strategy & Treasury Management',
                limitText: 'Budget Approvals, Payments $5K - $25K (₹4.15L - ₹20.75L)',
                usdThreshold: '$5,000 - $25,000',
                inrThreshold: '₹4.15 Lakhs - ₹20.75 Lakhs',
                color: '#1b5e20',
                bgGradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                borderColor: '#66bb6a',
                icon: '💼',
                responsibilities: ['Financial Strategy & Risk Control', 'Cash Runway & Treasury Management', 'Revenue Cycle Management (RCM)', 'Tax Strategy, Budget Approvals & Payments ($5K-$25K)']
            },
            {
                level: 1,
                roleTitle: 'CHIEF ACCOUNTANT',
                subtitle: 'Transaction Execution, Verification, Book Closing, Vouchers & Initial Sign-off',
                limitText: 'Entries, Reconciliations, Payments < $5K (< ₹4.15L)',
                usdThreshold: '< $5,000',
                inrThreshold: '< ₹4.15 Lakhs',
                color: '#0d47a1',
                bgGradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                borderColor: '#42a5f5',
                icon: '📝',
                responsibilities: ['Transaction Execution & Voucher Entry', 'Bank & Ledger Reconciliations', 'Month-End Book Closing', 'Initial Payment Sign-offs (< $5K)']
            }
        ];

        var currentUser = AUTH.currentUser();
        var uRole = (currentUser ? currentUser.role || '' : '').toUpperCase();

        var html = '<div class="card" style="padding:22px;margin-bottom:24px;border:2px solid #1a73e8;background:var(--card);">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">'
            + '<div>'
            + '<h3 style="font-size:20px;font-weight:800;margin:0;color:var(--text);display:flex;align-items:center;gap:8px;">'
            + '<span>🏛️ Executive Approval Hierarchy & Authority Governance Matrix</span>'
            + '</h3>'
            + '<div style="font-size:13px;color:var(--gray);margin-top:4px;">Multi-tier financial authorization thresholds, delegation of authority limits, and escalation routing rules.</div>'
            + '</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddApprovalModal()">➕ Add Requisition Entry</button>'
            + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.openHierarchyHelpModal()">ℹ️ Governance Rules</button>'
            + '</div>'
            + '</div>'

            + '<div style="background:var(--light-gray);padding:14px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">'
            + '<div><strong style="color:var(--text);">Current Active User Role:</strong> <span style="background:#1a73e8;color:#fff;padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;">' + (uRole || 'ADMIN / CFO') + '</span></div>'
            + '<div style="font-size:12px;color:var(--gray);">Automatic routing assigns requisitions to the lowest executive level possessing sufficient financial threshold.</div>'
            + '</div>'

            + '<div style="max-width:960px;margin:0 auto;display:flex;flex-direction:column;align-items:center;">';

        tiers.forEach(function (t, idx) {
            var matchingReqs = approvals.filter(function (a) {
                var info = _getAuthorityTier(a.amount, a.category);
                return info.level === t.level;
            });
            var pendingCount = matchingReqs.filter(function (a) { return a.status === 'pending'; }).length;
            var pendingValue = matchingReqs.filter(function (a) { return a.status === 'pending'; }).reduce(function (s, a) { return s + a.amount; }, 0);

            html += '<div style="width:100%;background:' + t.bgGradient + ';border:2px solid ' + t.borderColor + ';border-radius:16px;padding:20px 24px;box-shadow:0 6px 18px rgba(0,0,0,0.06);position:relative;transition:transform 0.2s;" onmouseenter="this.style.transform=\'translateY(-2px)\'" onmouseleave="this.style.transform=\'translateY(0)\'">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px;">'
                + '<div style="display:flex;align-items:center;gap:12px;">'
                + '<div style="width:48px;height:48px;border-radius:12px;background:#ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;font-size:24px;">' + t.icon + '</div>'
                + '<div>'
                + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
                + '<h4 style="font-size:18px;font-weight:800;color:' + t.color + ';margin:0;">' + t.roleTitle + '</h4>'
                + '<span style="background:' + t.color + ';color:#ffffff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;">Level ' + t.level + '</span>'
                + '</div>'
                + '<div style="font-size:13px;font-weight:600;color:#333;margin-top:2px;">' + t.subtitle + '</div>'
                + '</div>'
                + '</div>'

                + '<div style="text-align:right;">'
                + '<div style="font-size:12px;font-weight:700;color:' + t.color + ';text-transform:uppercase;letter-spacing:0.5px;">Financial Limit / Threshold</div>'
                + '<div style="font-size:15px;font-weight:800;color:#111;">' + t.usdThreshold + ' <span style="font-size:12px;color:#555;">(' + t.inrThreshold + ')</span></div>'
                + '</div>'
                + '</div>'

                + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:14px;background:rgba(255,255,255,0.7);padding:14px;border-radius:12px;border:1px solid ' + t.borderColor + '40;">'
                + '<div>'
                + '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;">Core Governance & Scope</div>'
                + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">'
                + t.responsibilities.map(function (r) {
                    return '<span style="background:#ffffff;border:1px solid ' + t.borderColor + '60;color:' + t.color + ';font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px;">' + r + '</span>';
                }).join('')
                + '</div>'
                + '</div>'

                + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">'
                + '<div>'
                + '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;">Requisition Queue Status</div>'
                + '<div style="font-size:14px;font-weight:800;color:' + (pendingCount > 0 ? t.color : '#2e7d32') + ';margin-top:2px;">'
                + (pendingCount > 0 ? '⏳ ' + pendingCount + ' Pending (' + _formatCurrency(pendingValue) + ')' : '✅ Queue Clear (0 Pending)')
                + '</div>'
                + '</div>'

                + '<button class="btn btn-sm" style="background:' + t.color + ';color:#ffffff;font-weight:700;padding:6px 12px;border-radius:8px;" onclick="CfoPortal.filterInboxByTier(' + t.level + ')">📥 View Tier Requisitions</button>'
                + '</div>'
                + '</div>'
                + '</div>';

            if (idx < tiers.length - 1) {
                html += '<div style="display:flex;flex-direction:column;align-items:center;margin:10px 0;">'
                    + '<div style="width:3px;height:24px;background:linear-gradient(to bottom, ' + t.color + ', ' + tiers[idx + 1].color + ');"></div>'
                    + '<div style="font-size:18px;line-height:1;color:var(--primary);margin-top:-4px;">▲</div>'
                    + '<div style="font-size:10px;font-weight:800;color:var(--gray);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Escalation Pathway</div>'
                    + '</div>';
            }
        });

        html += '</div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 4: 📥 Approval Inbox (Multi-Tier Authority Thresholds)
    ────────────────────────────────────────────────────────── */
    function _renderApprovalsTab() {
        var approvals = _getApprovals();

        var filteredApprovals = approvals.filter(function (a) {
            if (_approvalTierFilter === 'all') return true;
            var info = _getAuthorityTier(a.amount, a.category);
            return info.level === Number(_approvalTierFilter);
        });

        var pendingCount = approvals.filter(function (a) { return a.status === 'pending'; }).length;
        var pendingValue = approvals.filter(function (a) { return a.status === 'pending'; }).reduce(function (s, a) { return s + a.amount; }, 0);

        var tierButtons = [
            { id: 'all', label: 'All Tiers', color: '#1a73e8' },
            { id: '1', label: '📝 L1 Chief Accountant (<$5K)', color: '#0d47a1' },
            { id: '2', label: '💼 L2 CFO ($5K-$25K)', color: '#1b5e20' },
            { id: '3', label: '🏥 L3 MD ($25K-$100K)', color: '#e65100' },
            { id: '4', label: '👔 L4 Vice Chairman ($100K-$500K)', color: '#7b1fa2' },
            { id: '5', label: '👑 L5 Chairman (>$500K)', color: '#b71c1c' }
        ].map(function (tb) {
            var active = _approvalTierFilter.toString() === tb.id;
            return '<button onclick="CfoPortal.setApprovalTierFilter(\'' + tb.id + '\')"'
                + ' style="padding:6px 12px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;'
                + (active ? 'background:' + tb.color + ';color:#fff;box-shadow:0 2px 6px ' + tb.color + '40;' : 'background:var(--card);color:var(--text);border:1px solid var(--border);')
                + '">' + tb.label + '</button>';
        }).join('');

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📥', 'Pending Approval Inbox', pendingCount + ' Requisitions', 'Requires Authorized Decision', '#f57f17')
            + _kpiCard('💵', 'Total Pending Value', _formatCurrency(pendingValue), 'Queued Across Authority Tiers', '#1a73e8')
            + _kpiCard('🏛️', 'Authority Governance', '5 Executive Tiers', 'Threshold Enforcement Active', '#6a1b9a')
            + _kpiCard('✅', 'Approved Requisitions', approvals.filter(function (a) { return a.status === 'approved'; }).length + ' Items', 'Processed Requests', '#2e7d32')
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="font-weight:700;font-size:14px;margin-bottom:8px;color:var(--text);">🏛️ Filter Approval Queue by Executive Authority Threshold</div>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + tierButtons + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📥 Multi-Tier Approval Inbox (' + filteredApprovals.length + ' Shown / ' + approvals.length + ' Total)</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddApprovalModal()">➕ Add Requisition Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.approveAllPending()">✓ Approve All Pending</button>'
            + '</div>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Req ID</th><th>Required Authority Tier</th><th>Category</th><th>Amount (₹)</th><th>Party / Vendor / Patient</th><th>Department</th><th>Status</th><th>Decision & Escalation Actions</th></tr></thead>'
            + '<tbody>';

        if (filteredApprovals.length === 0) {
            html += '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray);">No requisitions found in this authority tier.</td></tr>';
        } else {
            filteredApprovals.forEach(function (a) {
                var realIdx = approvals.indexOf(a);
                var tierInfo = _getAuthorityTier(a.amount, a.category);

                html += '<tr>'
                    + '<td><strong>' + a.id + '</strong></td>'
                    + '<td><span style="' + tierInfo.badgeStyle + 'font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;">'
                    + tierInfo.icon + ' L' + tierInfo.level + ': ' + tierInfo.shortName + '</span></td>'
                    + '<td>' + _badge(a.category, 'info') + '</td>'
                    + '<td style="font-weight:700;color:#1a73e8;">' + _formatCurrency(a.amount) + '</td>'
                    + '<td>' + a.vendorOrPatient + '</td>'
                    + '<td>' + a.dept + '</td>'
                    + '<td>' + _badge(a.status.toUpperCase(), a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning') + '</td>'
                    + '<td>'
                    + '<div style="display:flex;gap:4px;flex-wrap:wrap;">'
                    + (a.status === 'pending'
                        ? '<button class="btn btn-sm btn-success" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApprovalV2(' + realIdx + ',\'approved\')">✓ Approve (L' + tierInfo.level + ')</button>'
                        + (tierInfo.level < 5 ? '<button class="btn btn-sm btn-outline" style="font-size:11px;padding:3px 8px;border-color:#7b1fa2;color:#7b1fa2;" onclick="CfoPortal.escalateApproval(' + realIdx + ')">⬆️ Escalate</button>' : '')
                        + '<button class="btn btn-sm btn-warning" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApprovalV2(' + realIdx + ',\'rejected\')">✗ Reject</button>'
                        : '<span style="font-size:11px;color:var(--gray);align-self:center;">Processed</span>')
                    + '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.deleteApproval(' + realIdx + ')">🗑️ Remove</button>'
                    + '</div>'
                    + '</td>'
                    + '</tr>';
            });
        }

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 5: 📤 Executive & Board Submissions
    ────────────────────────────────────────────────────────── */
    function _renderBoardSubmissionsTab() {
        var capex = _getCapex();

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📤', 'Submissions Status', 'Ready for Submission', 'FY 2025-26 Master Budget', '#2e7d32')
            + _kpiCard('📉', 'Draft Master Budget', _formatCurrency(145000000), 'Submitted to MD & Chairman', '#1a73e8')
            + _kpiCard('🔬', 'Board CAPEX Proposals', capex.length + ' Proposals', _formatCurrency(capex.reduce(function(s,x){ return s + x.cost; }, 0)), '#6a1b9a')
            + _kpiCard('📑', 'Monthly Board Deck', 'Compiled (PDF/Excel)', 'Executive Board Reporting', '#f57f17')
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;margin-bottom:20px;">'
            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">📉 Draft Master Operating Budget (Submit to MD/Chairman)</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Annual Operating Budget (OPEX + Revenue Targets) prepared by CFO office</div>'
            + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
            + '<button class="btn btn-primary" onclick="APP.notify(\'Master Budget submitted to MD & Chairman for final review\',\'success\')">✉️ Submit Master Budget to MD/Chairman</button>'
            + '<button class="btn btn-outline" onclick="CfoPortal.exportFullExcel()">📊 Download Budget Excel</button>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">🔬 CAPEX ROI Proposals (Submit to Board of Directors)</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">High-value Medical Equipment ROI, Cash Flow Payback & Financial Feasibility Study</div>'
            + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
            + '<button class="btn btn-primary" style="background:#6a1b9a;" onclick="APP.notify(\'CAPEX Proposals package sent to Board of Directors\',\'success\')">✉️ Submit Proposals to Board</button>'
            + '<button class="btn btn-outline" onclick="CfoPortal.openAddCapexModal()">➕ Add CAPEX Entry</button>'
            + '</div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🔬 Active CAPEX Equipment & Proposal Register</div>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddCapexModal()">➕ Add New CAPEX Entry</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Equipment Asset</th><th>Department</th><th>Capital Cost (₹)</th><th>Annual Revenue (₹)</th><th>ROI %</th><th>Payback Est.</th><th>Status</th><th>Data Control</th></tr></thead>'
            + '<tbody>';

        capex.forEach(function (c, idx) {
            html += '<tr>'
                + '<td><strong>' + c.name + '</strong></td>'
                + '<td>' + c.dept + '</td>'
                + '<td>' + _formatCurrency(c.cost) + '</td>'
                + '<td style="color:#2e7d32;font-weight:700;">' + _formatCurrency(c.revenueYTD) + '</td>'
                + '<td><strong>' + c.roi + '</strong></td>'
                + '<td>' + c.payback + '</td>'
                + '<td>' + _badge(c.status, 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteCapex(' + idx + ')">🗑️ Remove Entry</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 6: 🛡️ Audit, Governance & Taxes
    ────────────────────────────────────────────────────────── */
    function _renderGovernanceTab() {
        var vendors = _getVendors();

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📜', 'GST Liability (Net)', _formatCurrency(342000), 'Output GST - ITC Credit', '#1a73e8')
            + _kpiCard('⚖️', 'TDS Payable (Sec 194J)', _formatCurrency(185000), 'Doctor Professional Fees', '#f57f17')
            + _kpiCard('🏬', 'Vendor Accounts Payable', _formatCurrency(vendors.reduce(function(s,v){ return s + v.totalDue; }, 0)), vendors.length + ' Active Suppliers', '#c62828')
            + _kpiCard('🛡️', 'Anti-Fraud Compliance', '100% Verified', 'Zero Exception Alerts', '#2e7d32')
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🏬 Vendor Accounts Payable & Payment Ledger</div>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddVendorModal()">➕ Add Vendor Bill Entry</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Supplier / Vendor Name</th><th>Invoices</th><th>Total Payable (₹)</th><th>Current (0-30 Days)</th><th>Overdue (>30 Days)</th><th>Aging Status</th><th>Data Control</th></tr></thead>'
            + '<tbody>';

        vendors.forEach(function (v, idx) {
            html += '<tr>'
                + '<td><strong>' + v.name + '</strong></td>'
                + '<td>' + v.invCount + ' Bills</td>'
                + '<td style="font-weight:700;">' + _formatCurrency(v.totalDue) + '</td>'
                + '<td>' + _formatCurrency(v.current) + '</td>'
                + '<td style="color:#c62828;font-weight:700;">' + _formatCurrency(v.overdue) + '</td>'
                + '<td>' + _badge(v.overdue > 0 ? v.days + ' Days Overdue' : 'On Schedule', v.overdue > 0 ? 'danger' : 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteVendor(' + idx + ')">🗑️ Remove Entry</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>'

        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;margin-bottom:20px;">'
        + '<div class="card" style="padding:18px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:15px;">⚖️ Audited Balance Sheet & Cash Flow Summary</div>'
        + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.exportBalanceSheetPDF()">📄 Export PDF</button>'
        + '</div>'
        + '<div class="table-responsive"><table>'
        + '<thead><tr><th>Asset & Liabilities</th><th>Amount (₹)</th></tr></thead>'
        + '<tbody>'
        + '<tr><td><strong>Property, Plant & Equipment (PPE)</strong></td><td>' + _formatCurrency(85000000) + '</td></tr>'
        + '<tr><td><strong>Current Assets (Cash, AR, Stock)</strong></td><td>' + _formatCurrency(18500000) + '</td></tr>'
        + '<tr><td><strong>Total Assets</strong></td><td style="font-weight:800;color:#2e7d32;">' + _formatCurrency(103500000) + '</td></tr>'
        + '<tr style="background:var(--light-gray);"><td colspan="2"></td></tr>'
        + '<tr><td><strong>Capital Reserves & Retained Earnings</strong></td><td>' + _formatCurrency(82000000) + '</td></tr>'
        + '<tr><td><strong>Current Liabilities (AP, Taxes, Loans)</strong></td><td>' + _formatCurrency(21500000) + '</td></tr>'
        + '<tr><td><strong>Total Liabilities & Equity</strong></td><td style="font-weight:800;color:#1a73e8;">' + _formatCurrency(103500000) + '</td></tr>'
        + '</tbody></table></div></div>'

        + '<div class="card" style="padding:18px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:15px;">📑 Tax Compliance Status (GST, TDS)</div>'
        + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportTaxReportExcel()">📊 Export Tax Excel</button>'
        + '</div>'
        + '<div class="table-responsive"><table>'
        + '<thead><tr><th>Tax Category</th><th>Taxable Amount</th><th>Tax Liability (₹)</th><th>Filing Due Date</th><th>Compliance</th></tr></thead>'
        + '<tbody>'
        + '<tr><td>GSTR-3B (Medicines & Pharmacy)</td><td>' + _formatCurrency(2800000) + '</td><td>' + _formatCurrency(342000) + '</td><td>20th of Month</td><td>' + _badge('Compliant', 'success') + '</td></tr>'
        + '<tr><td>TDS 194J (Professional Doctors)</td><td>' + _formatCurrency(1850000) + '</td><td>' + _formatCurrency(185000) + '</td><td>7th of Month</td><td>' + _badge('Compliant', 'success') + '</td></tr>'
        + '<tr><td>TDS 194C (Vendor Contractors)</td><td>' + _formatCurrency(650000) + '</td><td>' + _formatCurrency(13000) + '</td><td>7th of Month</td><td>' + _badge('Compliant', 'success') + '</td></tr>'
        + '</tbody></table></div></div>'
        + '</div>';

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MAIN ENTRY POINT: renderCfoPortal
    ────────────────────────────────────────────────────────── */
    function renderCfoPortal(container) {
        var user = AUTH.currentUser();
        if (!user) {
            container.innerHTML = '<div class="empty-state">Not logged in</div>';
            return;
        }

        var uRole = (user.role || '').toString().trim().toLowerCase();
        var uPost = (user.post || user.designation || '').toString().trim().toLowerCase();
        var uName = (user.username || '').toString().trim().toLowerCase();
        var allowedRoles = ['cfo', 'chief_accountant', 'md', 'vice_chairman', 'chairman', 'executive', 'director', 'admin', 'super_admin'];
        var isCfoOrAdmin = user.isSuperAdmin || uRole === 'admin' || allowedRoles.indexOf(uRole) !== -1 || uPost.indexOf('cfo') !== -1 || uName.indexOf('cfo') !== -1 || (user.permissions && user.permissions.includes('cfo-portal'));
        if (!isCfoOrAdmin) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;">'
                + '<div style="font-size:48px;margin-bottom:12px;">🔒</div>'
                + '<h3 style="margin-bottom:8px;">CFO & Executive Access Restricted</h3>'
                + '<p style="color:var(--gray);font-size:14px;">The Executive Financial Workspace is strictly reserved for Executive & Financial Officer accounts.</p>'
                + '<button class="btn btn-primary" style="margin-top:16px;" onclick="Router.navigate(\'' + (user.role === 'hod' ? 'hod-dashboard' : 'employee-dashboard') + '\')">← Back to My Dashboard</button>'
                + '</div>';
            return;
        }

        _destroyCharts();

        var TABS = [
            { id: 'hierarchy', label: '🏛️ Approval Hierarchy & Governance', color: '#0d47a1' },
            { id: 'executive', label: '📊 Executive Dashboard', color: '#1a73e8' },
            { id: 'rcm', label: '💳 Revenue Cycle & Payer Analytics', color: '#2e7d32' },
            { id: 'unit_economics', label: '🏥 Unit Economics & Costing', color: '#6a1b9a' },
            { id: 'approvals', label: '📥 Approval Inbox (Pending: ' + _getApprovals().filter(function(a){ return a.status === 'pending'; }).length + ')', color: '#f57f17' },
            { id: 'board_submissions', label: '📤 Executive & Board Submissions', color: '#00bcd4' },
            { id: 'governance', label: '🛡️ Audit, Governance & Taxes', color: '#37474f' }
        ];

        var navButtonsHtml = TABS.map(function (t) {
            var active = t.id === _activeTab;
            return '<button onclick="CfoPortal.switchTab(\'' + t.id + '\',this)"'
                + ' style="padding:9px 15px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;'
                + (active ? 'background:' + t.color + ';color:#fff;box-shadow:0 3px 10px ' + t.color + '40;' : 'background:var(--card);color:var(--text);border:1px solid var(--border);')
                + '" data-tab="' + t.id + '" data-color="' + t.color + '">' + t.label + '</button>';
        }).join('');

        /* ── ALWAYS-VISIBLE HIGH-VISIBILITY DATA ENTRY BAR ── */
        var quickDataBar = '<div style="background:var(--card);border:2px solid #1a73e8;border-radius:14px;padding:14px 20px;margin-bottom:20px;box-shadow:0 4px 14px rgba(26,115,232,0.15);">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
            + '<div>'
            + '<div style="font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px;">'
            + '<span>⚡ CFO Workspace Data Entry & Authority Control Bar</span>'
            + '</div>'
            + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">Add new financial requisitions or click 🏛️ Governance Rules to inspect executive authority thresholds.</div>'
            + '</div>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '<button class="btn btn-primary" style="background:#0d47a1;font-weight:700;padding:8px 14px;" onclick="CfoPortal.openHierarchyHelpModal()">🏛️ Governance Matrix</button>'
            + '<button class="btn btn-primary" style="background:#1a73e8;font-weight:700;padding:8px 14px;" onclick="CfoPortal.openAddApprovalModal()">➕ Add Requisition</button>'
            + '<button class="btn btn-primary" style="background:#2e7d32;font-weight:700;padding:8px 14px;" onclick="CfoPortal.openAddClaimModal()">➕ Add Claim Denial</button>'
            + '<button class="btn btn-primary" style="background:#6a1b9a;font-weight:700;padding:8px 14px;" onclick="CfoPortal.openAddSpecialtyModal()">➕ Add Specialty Costing</button>'
            + '<button class="btn btn-primary" style="background:#00bcd4;font-weight:700;padding:8px 14px;" onclick="CfoPortal.openAddCapexModal()">➕ Add CAPEX Proposal</button>'
            + '<button class="btn btn-primary" style="background:#c62828;font-weight:700;padding:8px 14px;" onclick="CfoPortal.openAddVendorModal()">➕ Add Vendor Bill</button>'
            + '</div>'
            + '</div>'
            + '</div>';

        var headerHtml = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%);padding:20px 24px;border-radius:16px;color:#fff;">'
            + '<div style="display:flex;align-items:center;gap:14px;">'
            + '<div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;">🏥</div>'
            + '<div>'
            + '<h2 style="font-size:22px;font-weight:800;margin:0;">CFO & Executive Financial Workspace</h2>'
            + '<div style="font-size:13px;opacity:0.85;margin-top:2px;">5-Tier Financial Governance Matrix, Multi-Level Approval Inbox & Executive Analytics</div>'
            + '</div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<button class="btn btn-sm" style="background:#ffffff;color:#0d47a1;font-weight:800;border-radius:8px;padding:8px 14px;" onclick="CfoPortal.exportFullExcel()">📊 Download Financial Report (Excel)</button>'
            + '</div>'
            + '</div>'

            + quickDataBar
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;" id="cfoTabBar">' + navButtonsHtml + '</div>'
            + '<div id="cfoTabContent"></div>'
            + '<div id="cfoModalHost"></div>';

        container.innerHTML = headerHtml;
        _renderActiveTabContent();
    }

    function _renderActiveTabContent() {
        var contentEl = document.getElementById('cfoTabContent');
        if (!contentEl) return;

        if (_activeTab === 'hierarchy') contentEl.innerHTML = _renderHierarchyTab();
        else if (_activeTab === 'executive') contentEl.innerHTML = _renderExecutiveTab();
        else if (_activeTab === 'rcm') contentEl.innerHTML = _renderRcmTab();
        else if (_activeTab === 'unit_economics') contentEl.innerHTML = _renderUnitEconomicsTab();
        else if (_activeTab === 'approvals') contentEl.innerHTML = _renderApprovalsTab();
        else if (_activeTab === 'board_submissions') contentEl.innerHTML = _renderBoardSubmissionsTab();
        else if (_activeTab === 'governance') contentEl.innerHTML = _renderGovernanceTab();
    }

    /* ── Export & Interactive Action Methods (Add, Edit, Remove) ── */
    window.CfoPortal = {
        setApprovalTierFilter: function (tier) {
            _approvalTierFilter = tier;
            _renderActiveTabContent();
        },

        filterInboxByTier: function (level) {
            _approvalTierFilter = level.toString();
            _activeTab = 'approvals';
            var container = document.getElementById('app') || document.body;
            renderCfoPortal(container);
        },

        escalateApproval: function (index) {
            var approvals = _getApprovals();
            if (approvals[index]) {
                var req = approvals[index];
                var currentTier = _getAuthorityTier(req.amount, req.category);
                var nextLevel = Math.min(5, currentTier.level + 1);
                var nextTier = _getAuthorityTier(nextLevel === 5 ? 500000 * 83 : nextLevel === 4 ? 100000 * 83 : 25000 * 83, '');

                req.reason += ' [Escalated from L' + currentTier.level + ' to L' + nextLevel + ']';
                DB.set('cfo_approvals_v2', approvals);
                APP.notify('Requisition ' + req.id + ' escalated to Level ' + nextLevel + ' (' + nextTier.name + ')', 'warning');
                _renderActiveTabContent();
            }
        },

        openHierarchyHelpModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:650px;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-height:85vh;overflow-y:auto;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">🏛️ Executive Governance & Financial Delegation Rules</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<div style="font-size:13px;line-height:1.6;color:var(--text);">'
                + '<p><strong>Financial Approval Threshold Matrix Policy:</strong></p>'
                + '<ul style="padding-left:20px;margin-bottom:16px;">'
                + '<li><strong>Level 1 — Chief Accountant:</strong> Transaction execution, entries, reconciliations, and routine vendor payments below <strong>$5K (₹4.15 Lakhs)</strong>.</li>'
                + '<li><strong>Level 2 — Chief Financial Officer (CFO):</strong> Treasury management, cash runway, RCM strategy, budget approvals, and payments between <strong>$5K - $25K (₹4.15L - ₹20.75L)</strong>.</li>'
                + '<li><strong>Level 3 — Managing Director (MD):</strong> Clinical ops, departmental budgets, doctor fee-share contracts, OPEX overrides, and CAPEX entries between <strong>$25K - $100K (₹20.75L - ₹83L)</strong>.</li>'
                + '<li><strong>Level 4 — Vice Chairman:</strong> Strategic expansion projects, high-value medical CAPEX, and annual operating budget sign-offs between <strong>$100K - $500K (₹83L - ₹4.15 Cr)</strong>.</li>'
                + '<li><strong>Level 5 — Chairman / Board of Directors:</strong> Mega CAPEX exceeding <strong>$500K (> ₹4.15 Cr)</strong>, multi-hospital consolidated P&L, M&A, and major equity/capital infusions.</li>'
                + '</ul>'
                + '<div style="background:#e3f2fd;padding:12px;border-radius:8px;color:#0d47a1;font-weight:600;font-size:12px;">'
                + '💡 Automatic Escalation: Requisitions submitted above an officer\'s individual authority limit are flagged and escalated automatically to the next tier inbox.'
                + '</div>'
                + '</div>'
                + '<div style="display:flex;justify-content:flex-end;margin-top:18px;">'
                + '<button class="btn btn-primary" onclick="CfoPortal.closeModal()">Understood</button>'
                + '</div></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },
        switchTab: function (tabId, btn) {
            _activeTab = tabId;
            var bar = document.getElementById('cfoTabBar');
            if (bar) {
                bar.querySelectorAll('button').forEach(function (b) {
                    var isActive = b.dataset.tab === tabId;
                    if (isActive) {
                        b.style.background = b.dataset.color;
                        b.style.color = '#fff';
                        b.style.border = 'none';
                        b.style.boxShadow = '0 3px 10px ' + b.dataset.color + '40';
                    } else {
                        b.style.background = 'var(--card)';
                        b.style.color = 'var(--text)';
                        b.style.border = '1px solid var(--border)';
                        b.style.boxShadow = 'none';
                    }
                });
            }
            _destroyCharts();
            _renderActiveTabContent();
        },

        /* ── Exec KPI Actions ── */
        deleteExecKpi: function (index) {
            var items = _getExecKpis();
            if (items[index]) {
                if (confirm('Remove KPI entry "' + items[index].metric + '"?')) {
                    var removed = items.splice(index, 1);
                    DB.set('cfo_exec_kpis', items);
                    APP.notify('Removed ' + removed[0].metric, 'info');
                    _renderActiveTabContent();
                }
            }
        },

        openAddExecKpiModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add Executive Financial Metric Entry</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddExecKpi(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Financial Metric Name</label><input type="text" id="cfoKpiMetric" class="form-control" placeholder="ARPOB (Avg Rev / Patient)" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Current Value</label><input type="text" id="cfoKpiCurrent" class="form-control" placeholder="₹38,400" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Prior Period Value</label><input type="text" id="cfoKpiPrior" class="form-control" placeholder="₹35,000" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Target Benchmark</label><input type="text" id="cfoKpiTarget" class="form-control" placeholder="₹36,000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Monthly Variance</label><input type="text" id="cfoKpiVariance" class="form-control" placeholder="+₹3.4k (+9.7%)" required /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Metric Entry</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveAddExecKpi: function (e) {
            e.preventDefault();
            var metric = document.getElementById('cfoKpiMetric').value.trim();
            var current = document.getElementById('cfoKpiCurrent').value.trim();
            var prior = document.getElementById('cfoKpiPrior').value.trim();
            var target = document.getElementById('cfoKpiTarget').value.trim();
            var variance = document.getElementById('cfoKpiVariance').value.trim();

            var items = _getExecKpis();
            items.unshift({ metric: metric, current: current, prior: prior, target: target, variance: variance, status: 'On Target' });

            DB.set('cfo_exec_kpis', items);
            CfoPortal.closeModal();
            APP.notify('Added Metric Entry for ' + metric, 'success');
            _renderActiveTabContent();
        },

        /* ── Approval Inbox Actions ── */
        processApprovalV2: function (index, decision) {
            var approvals = _getApprovals();
            if (approvals[index]) {
                approvals[index].status = decision;
                DB.set('cfo_approvals_v2', approvals);
                APP.notify('Requisition ' + approvals[index].id + ' marked as ' + decision.toUpperCase(), decision === 'approved' ? 'success' : 'info');
                _renderActiveTabContent();
            }
        },

        approveAllPending: function () {
            var approvals = _getApprovals();
            approvals.forEach(function (a) { a.status = 'approved'; });
            DB.set('cfo_approvals_v2', approvals);
            APP.notify('All Pending Requisitions Approved by CFO', 'success');
            _renderActiveTabContent();
        },

        deleteApproval: function (index) {
            var approvals = _getApprovals();
            if (approvals[index]) {
                if (confirm('Are you sure you want to remove approval item "' + approvals[index].id + '"?')) {
                    var removed = approvals.splice(index, 1);
                    DB.set('cfo_approvals_v2', approvals);
                    APP.notify('Removed ' + removed[0].id + ' from Approval Inbox', 'info');
                    _renderActiveTabContent();
                }
            }
        },

        openAddApprovalModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:500px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add Requisition to Approval Inbox</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddApproval(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Approval Category & Authority Scope</label>'
                + '<select id="cfoAddCategory" class="form-control" onchange="CfoPortal.updateModalTierPreview()" required>'
                + '<option value="Voucher Sign-off (<$5K)">📝 L1 Chief Accountant — Voucher / Payment (<$5K)</option>'
                + '<option value="Vendor Invoice ($5K-$25K)">💼 L2 CFO — Vendor Invoice / Payment ($5K-$25K)</option>'
                + '<option value="OPEX Override ($25K-$100K)">🏥 L3 MD — OPEX Override / CAPEX ($25K-$100K)</option>'
                + '<option value="Strategic Project ($100K-$500K)">👔 L4 Vice Chairman — Strategic Project CAPEX ($100K-$500K)</option>'
                + '<option value="Mega CAPEX (> $500K)">👑 L5 Chairman / Board — Mega CAPEX / M&A (> $500K)</option>'
                + '<option value="Patient Concession Waiver">Patient Concession Waiver</option>'
                + '<option value="Doctor Payout Release Batch">Doctor Payout Release Batch</option>'
                + '<option value="Bad Debt Write-Off">Bad Debt Write-Off</option>'
                + '</select></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Amount (₹)</label>'
                + '<input type="number" id="cfoAddAmount" class="form-control" placeholder="180000" oninput="CfoPortal.updateModalTierPreview()" required />'
                + '<div id="cfoModalTierPreview" style="margin-top:6px;font-size:12px;font-weight:700;color:#1a73e8;">Required Authority: L1 Chief Accountant (< $5K)</div></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Party / Vendor / Patient Name</label><input type="text" id="cfoAddParty" class="form-control" placeholder="Vendor / Patient / Contractor Name" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Department</label><input type="text" id="cfoAddDept" class="form-control" placeholder="Pharmacy / Radiology / IPD Billing" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Justification Reason</label><textarea id="cfoAddReason" class="form-control" rows="2" placeholder="Provide justification for approval decision..." required></textarea></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Requisition</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        updateModalTierPreview: function () {
            var amtEl = document.getElementById('cfoAddAmount');
            var catEl = document.getElementById('cfoAddCategory');
            var prevEl = document.getElementById('cfoModalTierPreview');
            if (!amtEl || !catEl || !prevEl) return;
            var amt = Number(amtEl.value) || 0;
            var cat = catEl.value;
            var tier = _getAuthorityTier(amt, cat);
            prevEl.innerHTML = 'Required Authority: <span style="' + tier.badgeStyle + 'padding:2px 6px;border-radius:4px;">' + tier.icon + ' Level ' + tier.level + ': ' + tier.name + ' (' + tier.usdRange + ' / ' + tier.inrRange + ')</span>';
        },

        saveAddApproval: function (e) {
            e.preventDefault();
            var category = document.getElementById('cfoAddCategory').value;
            var amount = Number(document.getElementById('cfoAddAmount').value) || 0;
            var party = document.getElementById('cfoAddParty').value.trim();
            var dept = document.getElementById('cfoAddDept').value.trim();
            var reason = document.getElementById('cfoAddReason').value.trim();

            var tier = _getAuthorityTier(amount, category);
            var approvals = _getApprovals();
            var newId = 'REQ-' + (Math.floor(100 + Math.random() * 900));
            approvals.unshift({
                id: newId,
                category: category,
                amount: amount,
                vendorOrPatient: party,
                dept: dept,
                reason: reason + ' [Routed to ' + tier.shortName + ']',
                status: 'pending',
                date: new Date().toISOString().slice(0, 10)
            });

            DB.set('cfo_approvals_v2', approvals);
            CfoPortal.closeModal();
            APP.notify('Requisition ' + newId + ' added & routed to Level ' + tier.level + ' (' + tier.shortName + ')', 'success');
            _renderActiveTabContent();
        },

        /* ── RCM Claim Actions ── */
        deleteClaim: function (index) {
            var claims = _getClaims();
            if (claims[index]) {
                if (confirm('Delete Payer Claim record for "' + claims[index].payer + '"?')) {
                    var removed = claims.splice(index, 1);
                    DB.set('cfo_claims', claims);
                    APP.notify('Removed ' + removed[0].payer + ' record', 'info');
                    _renderActiveTabContent();
                }
            }
        },

        openAddClaimModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add Payer Claim Denial Record</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddClaim(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Insurance / TPA Name</label><input type="text" id="cfoClaimPayer" class="form-control" placeholder="Max Bupa Insurance" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Total Claims Count</label><input type="number" id="cfoClaimCount" class="form-control" placeholder="50" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Approved Amount (₹)</label><input type="number" id="cfoClaimApproved" class="form-control" placeholder="1500000" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Denied Amount (₹)</label><input type="number" id="cfoClaimDenied" class="form-control" placeholder="75000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Root Cause Category</label><input type="text" id="cfoClaimCause" class="form-control" placeholder="Pre-auth Delay / Tariff Cap" required /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Claim Record</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveAddClaim: function (e) {
            e.preventDefault();
            var payer = document.getElementById('cfoClaimPayer').value.trim();
            var count = Number(document.getElementById('cfoClaimCount').value) || 0;
            var approved = Number(document.getElementById('cfoClaimApproved').value) || 0;
            var denied = Number(document.getElementById('cfoClaimDenied').value) || 0;
            var cause = document.getElementById('cfoClaimCause').value.trim();

            var claims = _getClaims();
            claims.unshift({ payer: payer, totalClaims: count, approved: approved, denied: denied, cause: cause, risk: 'Low Risk' });

            DB.set('cfo_claims', claims);
            CfoPortal.closeModal();
            APP.notify('Added Payer Claim record for ' + payer, 'success');
            _renderActiveTabContent();
        },

        /* ── Specialty Actions ── */
        deleteSpecialty: function (index) {
            var specialties = _getSpecialties();
            if (specialties[index]) {
                if (confirm('Delete Specialty Department "' + specialties[index].name + '"?')) {
                    var removed = specialties.splice(index, 1);
                    DB.set('cfo_specialties', specialties);
                    APP.notify('Removed ' + removed[0].name, 'info');
                    _renderActiveTabContent();
                }
            }
        },

        openAddSpecialtyModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add Specialty Department Costing</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddSpecialty(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Specialty Department Name</label><input type="text" id="cfoSpecName" class="form-control" placeholder="Gastroenterology" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Procedures Count</label><input type="number" id="cfoSpecCount" class="form-control" placeholder="75" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Gross Revenue (₹)</label><input type="number" id="cfoSpecRev" class="form-control" placeholder="2500000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Direct Costs (₹)</label><input type="number" id="cfoSpecCost" class="form-control" placeholder="1400000" required /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Specialty</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveAddSpecialty: function (e) {
            e.preventDefault();
            var name = document.getElementById('cfoSpecName').value.trim();
            var count = Number(document.getElementById('cfoSpecCount').value) || 1;
            var rev = Number(document.getElementById('cfoSpecRev').value) || 0;
            var cost = Number(document.getElementById('cfoSpecCost').value) || 0;

            var margin = rev > 0 ? Math.round(((rev - cost) / rev) * 1000) / 10 : 0;
            var abc = count > 0 ? Math.round(cost / count) : 0;

            var list = _getSpecialties();
            list.unshift({ name: name, procedures: count, revenue: rev, directCost: cost, margin: margin, abcCost: abc });

            DB.set('cfo_specialties', list);
            CfoPortal.closeModal();
            APP.notify('Added Specialty Department ' + name, 'success');
            _renderActiveTabContent();
        },

        /* ── CAPEX Actions ── */
        deleteCapex: function (index) {
            var list = _getCapex();
            if (list[index]) {
                if (confirm('Delete CAPEX Proposal "' + list[index].name + '"?')) {
                    var removed = list.splice(index, 1);
                    DB.set('cfo_capex', list);
                    APP.notify('Removed ' + removed[0].name, 'info');
                    _renderActiveTabContent();
                }
            }
        },

        openAddCapexModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add CAPEX Proposal</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddCapex(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Equipment Asset Name</label><input type="text" id="cfoCapexName" class="form-control" placeholder="Linear Accelerator" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Department</label><input type="text" id="cfoCapexDept" class="form-control" placeholder="Oncology" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Capital Cost (₹)</label><input type="number" id="cfoCapexCost" class="form-control" placeholder="25000000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Estimated Annual Revenue (₹)</label><input type="number" id="cfoCapexRev" class="form-control" placeholder="8500000" required /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Proposal</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveAddCapex: function (e) {
            e.preventDefault();
            var name = document.getElementById('cfoCapexName').value.trim();
            var dept = document.getElementById('cfoCapexDept').value.trim();
            var cost = Number(document.getElementById('cfoCapexCost').value) || 0;
            var rev = Number(document.getElementById('cfoCapexRev').value) || 0;

            var roi = cost > 0 ? Math.round((rev / cost) * 1000) / 10 + '%' : '0%';
            var payback = rev > 0 ? (Math.round((cost / rev) * 10) / 10) + ' Years' : 'N/A';

            var list = _getCapex();
            list.unshift({ name: name, dept: dept, cost: cost, revenueYTD: rev, roi: roi, payback: payback, status: 'Proposed' });

            DB.set('cfo_capex', list);
            CfoPortal.closeModal();
            APP.notify('Added CAPEX Proposal for ' + name, 'success');
            _renderActiveTabContent();
        },

        /* ── Vendor AP Actions ── */
        deleteVendor: function (index) {
            var list = _getVendors();
            if (list[index]) {
                if (confirm('Delete Vendor bill record for "' + list[index].name + '"?')) {
                    var removed = list.splice(index, 1);
                    DB.set('cfo_vendors', list);
                    APP.notify('Removed ' + removed[0].name, 'info');
                    _renderActiveTabContent();
                }
            }
        },

        openAddVendorModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add Vendor Bill</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddVendor(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Supplier / Vendor Name</label><input type="text" id="cfoVendorName" class="form-control" placeholder="Cipla Healthcare" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Invoice Count</label><input type="number" id="cfoVendorInvs" class="form-control" placeholder="4" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Total Payable (₹)</label><input type="number" id="cfoVendorTotal" class="form-control" placeholder="650000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Overdue Amount (>30 Days) (₹)</label><input type="number" id="cfoVendorOverdue" class="form-control" placeholder="150000" required /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Vendor Bill</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveAddVendor: function (e) {
            e.preventDefault();
            var name = document.getElementById('cfoVendorName').value.trim();
            var invs = Number(document.getElementById('cfoVendorInvs').value) || 1;
            var total = Number(document.getElementById('cfoVendorTotal').value) || 0;
            var overdue = Number(document.getElementById('cfoVendorOverdue').value) || 0;
            var current = total > overdue ? total - overdue : 0;

            var list = _getVendors();
            list.unshift({ name: name, invCount: invs, totalDue: total, current: current, overdue: overdue, days: overdue > 0 ? 45 : 15 });

            DB.set('cfo_vendors', list);
            CfoPortal.closeModal();
            APP.notify('Added Vendor Bill for ' + name, 'success');
            _renderActiveTabContent();
        },

        closeModal: function () {
            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = '';
        },

        exportFullExcel: function () {
            if (typeof XLSX === 'undefined') {
                APP.notify('Excel Export library loading...', 'warning');
                return;
            }
            try {
                var wb = XLSX.utils.book_new();

                var summary = [
                    ['CFO WORKSPACE FINANCIAL REPORT — HMS'],
                    ['Generated Date', new Date().toLocaleString('en-IN')],
                    [''],
                    ['Metric / Indicator', 'Value / Status', 'Benchmark Target'],
                    ['EBITDA Margin', '26.8%', '25.0% Target'],
                    ['RevPOB (Rev / Occupied Bed)', '₹14,200', 'Normal'],
                    ['Current Ratio', '2.1x', '>1.5x Solvency'],
                    ['Cash Flow Runway', '45 Days', '>30 Days Buffer'],
                    ['AR Receivables', '₹6,850,000', 'Managed'],
                    ['Clean Claim Rate', '94.2%', 'First Pass Yield']
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'CFO Executive Summary');

                XLSX.writeFile(wb, 'CFO_Workspace_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx');
                APP.notify('CFO Workspace Financial Excel Downloaded', 'success');
            } catch (e) {
                APP.notify('Export Error: ' + e.message, 'error');
            }
        },

        exportRcmExcel: function () { CfoPortal.exportFullExcel(); },
        exportPnlExcel: function () { CfoPortal.exportFullExcel(); },
        exportPayablesExcel: function () { CfoPortal.exportFullExcel(); },
        exportTaxReportExcel: function () { CfoPortal.exportFullExcel(); },
        exportBalanceSheetPDF: function () { window.print(); }
    };

    window.renderCfoPortal = renderCfoPortal;

})();
