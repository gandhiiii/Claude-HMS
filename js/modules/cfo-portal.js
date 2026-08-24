// HMS — CFO Workspace (Executive Financial Suite & Data Management Engine)

(function () {
    'use strict';

    var _activeTab = 'executive';
    var _cfoCharts = [];

    /* ── Initial Seed Data Getters with Persistent Fallbacks ── */
    function _getApprovals() {
        var items = DB.get('cfo_approvals_v2');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { id: 'PO-301', category: 'Vendor Invoice ($5K-$25K)', amount: 450000, vendorOrPatient: 'Sun Pharma Distributors', dept: 'Pharmacy', reason: 'Bulk antibiotic stock invoice clearance', status: 'pending', date: '2026-08-24' },
                { id: 'PO-302', category: 'Vendor Invoice ($5K-$25K)', amount: 1250000, vendorOrPatient: 'Medtronic India', dept: 'Cardiology', reason: 'Stent inventory invoice payment', status: 'pending', date: '2026-08-24' },
                { id: 'PO-303', category: 'Vendor Invoice ($5K-$25K)', amount: 680000, vendorOrPatient: 'Olympus Medical', dept: 'Endoscopy', reason: 'Endoscope maintenance contract', status: 'pending', date: '2026-08-24' },
                { id: 'DSC-101', category: 'Patient Discount Request', amount: 45000, vendorOrPatient: 'Patient: Suresh Kumar', dept: 'IPD Billing', reason: 'Hardship waiver for extended ICU stay', status: 'pending', date: '2026-08-24' },
                { id: 'DSC-102', category: 'Patient Discount Request', amount: 18500, vendorOrPatient: 'Patient: Meena Sharma', dept: 'OPD Billing', reason: 'Staff relative concession', status: 'pending', date: '2026-08-23' },
                { id: 'DOC-501', category: 'Doctor Payout Release Batch', amount: 1423000, vendorOrPatient: 'Monthly Doctor Batch (18 Docs)', dept: 'Finance', reason: 'August doctor fee-sharing disbursement', status: 'pending', date: '2026-08-24' },
                { id: 'WRT-201', category: 'Bad Debt Write-Off', amount: 32000, vendorOrPatient: 'Patient: Unknown / Default', dept: 'Emergency', reason: 'Uncollectible MLC emergency care debt write-off', status: 'pending', date: '2026-08-22' }
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
       MODULE 1: 📊 Executive Dashboard
    ────────────────────────────────────────────────────────── */
    function _renderExecutiveTab() {
        var admissions = DB.get('admissions') || [];
        var activeBeds = admissions.filter(function (a) { return a.status === 'admitted'; }).length;
        var totalRev = admissions.length * 48500 + (DB.get('inventory') || []).length * 1250;
        var revPOB = activeBeds > 0 ? Math.round(totalRev / Math.max(1, activeBeds)) : 14200;

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
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">⚡ Executive Financial Health Summary</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Financial Indicator</th><th>Current Status</th><th>Target Benchmark</th><th>Monthly Variance</th><th>Status</th></tr></thead>'
            + '<tbody>'
            + '<tr><td><strong>Gross Hospital Revenue</strong></td><td>' + _formatCurrency(14500000) + '</td><td>' + _formatCurrency(14000000) + '</td><td style="color:#2e7d32;">+₹5.0L (+3.5%)</td><td>' + _badge('On Target', 'success') + '</td></tr>'
            + '<tr><td><strong>Operating Expense (OPEX)</strong></td><td>' + _formatCurrency(9800000) + '</td><td>' + _formatCurrency(9600000) + '</td><td style="color:#c62828;">-₹2.0L (-2.0%)</td><td>' + _badge('Controlled', 'warning') + '</td></tr>'
            + '<tr><td><strong>Debt Service Coverage (DSCR)</strong></td><td>1.85x</td><td>1.50x Target</td><td>+0.35x Safety Margin</td><td>' + _badge('Healthy', 'success') + '</td></tr>'
            + '<tr><td><strong>Bed Occupancy Rate</strong></td><td>82.4%</td><td>78.0% Target</td><td>+4.4% Capacity Utilization</td><td>' + _badge('Optimal', 'success') + '</td></tr>'
            + '</tbody></table></div></div>';

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
       MODULE 2: 💳 Revenue Cycle & Payer Analytics (With Add & Delete)
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
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddClaimModal()">➕ Add Payer Claim Record</button>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportRcmExcel()">📊 Export RCM Report</button>'
            + '</div>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Payer / TPA Name</th><th>Total Claims</th><th>Approved (₹)</th><th>Denied (₹)</th><th>Root Cause Category</th><th>Risk Level</th><th>Actions / Data Control</th></tr></thead>'
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
                + '<button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteClaim(' + idx + ')">🗑️ Delete</button>'
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
       MODULE 3: 🏥 Unit Economics & Costing (With Add & Delete)
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
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddSpecialtyModal()">➕ Add Specialty Department</button>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportPnlExcel()">📊 Export Costing Excel</button>'
            + '</div>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Specialty Department</th><th>Procedure Count</th><th>Gross Revenue</th><th>Direct Cost</th><th>Unit ABC Cost / Proc</th><th>Contribution Margin</th><th>Margin %</th><th>Actions</th></tr></thead>'
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
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteSpecialty(' + idx + ')">🗑️ Delete</button></td>'
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
       MODULE 4: 📥 Approval Inbox (With Add, Edit, Delete Data Control)
    ────────────────────────────────────────────────────────── */
    function _renderApprovalsTab() {
        var approvals = _getApprovals();
        var pendingCount = approvals.filter(function (a) { return a.status === 'pending'; }).length;
        var pendingValue = approvals.filter(function (a) { return a.status === 'pending'; }).reduce(function (s, a) { return s + a.amount; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📥', 'Pending Approval Inbox', pendingCount + ' Requisitions', 'Requires CFO Decision', '#f57f17')
            + _kpiCard('💵', 'Total Pending Value', _formatCurrency(pendingValue), 'CFO Financial Requisitions', '#1a73e8')
            + _kpiCard('🏢', 'Total Requisitions', approvals.length + ' Items', 'Active Approval Queue', '#6a1b9a')
            + _kpiCard('✅', 'Approved Requisitions', approvals.filter(function (a) { return a.status === 'approved'; }).length + ' Items', 'Processed Requests', '#2e7d32')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📥 CFO Approval Inbox (Queue: ' + approvals.length + ')</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddApprovalModal()">➕ Add Requisition</button>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.approveAllPending()">✓ Approve All Pending</button>'
            + '</div>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Req ID</th><th>Approval Category</th><th>Amount (₹)</th><th>Party / Vendor / Patient</th><th>Department</th><th>Justification Reason</th><th>Status</th><th>CFO Decision / Data Control</th></tr></thead>'
            + '<tbody>';

        approvals.forEach(function (a, idx) {
            html += '<tr>'
                + '<td><strong>' + a.id + '</strong></td>'
                + '<td>' + _badge(a.category, 'info') + '</td>'
                + '<td style="font-weight:700;color:#1a73e8;">' + _formatCurrency(a.amount) + '</td>'
                + '<td>' + a.vendorOrPatient + '</td>'
                + '<td>' + a.dept + '</td>'
                + '<td style="font-size:12px;max-width:220px;">' + a.reason + '</td>'
                + '<td>' + _badge(a.status.toUpperCase(), a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning') + '</td>'
                + '<td>'
                + '<div style="display:flex;gap:4px;flex-wrap:wrap;">'
                + (a.status === 'pending'
                    ? '<button class="btn btn-sm btn-success" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApprovalV2(' + idx + ',\'approved\')">✓ Approve</button>'
                    + '<button class="btn btn-sm btn-warning" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApprovalV2(' + idx + ',\'rejected\')">✗ Reject</button>'
                    : '<span style="font-size:11px;color:var(--gray);align-self:center;">Processed</span>')
                + '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.deleteApproval(' + idx + ')">🗑️ Remove</button>'
                + '</div>'
                + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 5: 📤 Executive & Board Submissions (With Add & Delete CAPEX)
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
            + '<button class="btn btn-outline" onclick="CfoPortal.openAddCapexModal()">➕ Add CAPEX Proposal</button>'
            + '</div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🔬 Active CAPEX Equipment & Proposal Register</div>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddCapexModal()">➕ Add New CAPEX Proposal</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Equipment Asset</th><th>Department</th><th>Capital Cost (₹)</th><th>Annual Revenue (₹)</th><th>ROI %</th><th>Payback Est.</th><th>Status</th><th>Actions</th></tr></thead>'
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
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteCapex(' + idx + ')">🗑️ Delete</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 6: 🛡️ Audit, Governance & Taxes (With Add & Delete Vendor AP)
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
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.openAddVendorModal()">➕ Add Vendor Bill</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Supplier / Vendor Name</th><th>Invoices</th><th>Total Payable (₹)</th><th>Current (0-30 Days)</th><th>Overdue (>30 Days)</th><th>Aging Status</th><th>Actions</th></tr></thead>'
            + '<tbody>';

        vendors.forEach(function (v, idx) {
            html += '<tr>'
                + '<td><strong>' + v.name + '</strong></td>'
                + '<td>' + v.invCount + ' Bills</td>'
                + '<td style="font-weight:700;">' + _formatCurrency(v.totalDue) + '</td>'
                + '<td>' + _formatCurrency(v.current) + '</td>'
                + '<td style="color:#c62828;font-weight:700;">' + _formatCurrency(v.overdue) + '</td>'
                + '<td>' + _badge(v.overdue > 0 ? v.days + ' Days Overdue' : 'On Schedule', v.overdue > 0 ? 'danger' : 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-danger" style="padding:3px 8px;font-size:11px;" onclick="CfoPortal.deleteVendor(' + idx + ')">🗑️ Delete</button></td>'
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
        var isCfoOrAdmin = uRole === 'cfo' || uRole.indexOf('cfo') !== -1 || uPost.indexOf('cfo') !== -1 || uName.indexOf('cfo') !== -1 || uRole === 'admin' || user.isSuperAdmin || (user.permissions && user.permissions.includes('cfo-portal'));
        if (!isCfoOrAdmin) {
            container.innerHTML = '<div class="card" style="text-align:center;padding:40px;">'
                + '<div style="font-size:48px;margin-bottom:12px;">🔒</div>'
                + '<h3 style="margin-bottom:8px;">CFO Access Restricted</h3>'
                + '<p style="color:var(--gray);font-size:14px;">The CFO Workspace is strictly reserved for Chief Financial Officer (CFO) accounts.</p>'
                + '<button class="btn btn-primary" style="margin-top:16px;" onclick="Router.navigate(\'' + (user.role === 'hod' ? 'hod-dashboard' : 'employee-dashboard') + '\')">← Back to My Dashboard</button>'
                + '</div>';
            return;
        }

        _destroyCharts();

        var TABS = [
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

        var headerHtml = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%);padding:20px 24px;border-radius:16px;color:#fff;">'
            + '<div style="display:flex;align-items:center;gap:14px;">'
            + '<div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;">🏥</div>'
            + '<div>'
            + '<h2 style="font-size:22px;font-weight:800;margin:0;">CFO Workspace</h2>'
            + '<div style="font-size:13px;opacity:0.85;margin-top:2px;">Executive Dashboard, Revenue Cycle, Unit Economics, Approvals Inbox, Board Submissions & Governance</div>'
            + '</div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<button class="btn btn-sm" style="background:#ffffff;color:#0d47a1;font-weight:800;border-radius:8px;padding:8px 14px;" onclick="CfoPortal.exportFullExcel()">📊 Download Financial Report (Excel)</button>'
            + '</div>'
            + '</div>'

            + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;" id="cfoTabBar">' + navButtonsHtml + '</div>'
            + '<div id="cfoTabContent"></div>'
            + '<div id="cfoModalHost"></div>';

        container.innerHTML = headerHtml;
        _renderActiveTabContent();
    }

    function _renderActiveTabContent() {
        var contentEl = document.getElementById('cfoTabContent');
        if (!contentEl) return;

        if (_activeTab === 'executive') contentEl.innerHTML = _renderExecutiveTab();
        else if (_activeTab === 'rcm') contentEl.innerHTML = _renderRcmTab();
        else if (_activeTab === 'unit_economics') contentEl.innerHTML = _renderUnitEconomicsTab();
        else if (_activeTab === 'approvals') contentEl.innerHTML = _renderApprovalsTab();
        else if (_activeTab === 'board_submissions') contentEl.innerHTML = _renderBoardSubmissionsTab();
        else if (_activeTab === 'governance') contentEl.innerHTML = _renderGovernanceTab();
    }

    /* ── Export & Interactive Action Methods (Add, Edit, Remove) ── */
    window.CfoPortal = {
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
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add Requisition to Approval Inbox</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="CfoPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="CfoPortal.saveAddApproval(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Category</label>'
                + '<select id="cfoAddCategory" class="form-control" required><option>Vendor Invoice ($5K-$25K)</option><option>Patient Discount Request</option><option>Doctor Payout Release Batch</option><option>Bad Debt Write-Off</option></select></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Amount (₹)</label><input type="number" id="cfoAddAmount" class="form-control" placeholder="45000" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Party / Vendor / Patient Name</label><input type="text" id="cfoAddParty" class="form-control" placeholder="Vendor / Patient Name" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Department</label><input type="text" id="cfoAddDept" class="form-control" placeholder="Pharmacy / Billing" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Justification Reason</label><textarea id="cfoAddReason" class="form-control" rows="2" placeholder="Brief reason..." required></textarea></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="CfoPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary">Save Requisition</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('cfoModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveAddApproval: function (e) {
            e.preventDefault();
            var category = document.getElementById('cfoAddCategory').value;
            var amount = Number(document.getElementById('cfoAddAmount').value) || 0;
            var party = document.getElementById('cfoAddParty').value.trim();
            var dept = document.getElementById('cfoAddDept').value.trim();
            var reason = document.getElementById('cfoAddReason').value.trim();

            var approvals = _getApprovals();
            var newId = 'REQ-' + (Math.floor(100 + Math.random() * 900));
            approvals.unshift({ id: newId, category: category, amount: amount, vendorOrPatient: party, dept: dept, reason: reason, status: 'pending', date: new Date().toISOString().slice(0, 10) });

            DB.set('cfo_approvals_v2', approvals);
            CfoPortal.closeModal();
            APP.notify('Requisition ' + newId + ' added to Approval Inbox', 'success');
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
