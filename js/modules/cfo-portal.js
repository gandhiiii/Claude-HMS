// HMS — CFO Workspace (Executive Financial Suite)

(function () {
    'use strict';

    var _activeTab = 'executive';
    var _cfoCharts = [];

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
       (Financial KPIs: EBITDA, RevPOB, Current Ratio | Cash Flow Runway | Bed Yield)
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
       MODULE 2: 💳 Revenue Cycle & Payer Analytics
       (AR Aging | Insurance Denials & Root Causes | Revenue Leakage)
    ────────────────────────────────────────────────────────── */
    function _renderRcmTab() {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('💳', 'Total Receivables (AR)', _formatCurrency(6850000), 'Outstanding Collections', '#1a73e8')
            + _kpiCard('⏳', '0-30 Days Bucket', _formatCurrency(4120000), '60.1% Current AR', '#2e7d32')
            + _kpiCard('⚠️', '90+ Days Aging', _formatCurrency(840000), 'High Risk Follow-up', '#c62828')
            + _kpiCard('📉', 'Unbilled Bed Days Leakage', _formatCurrency(315000), '14 Pending Discharge Clearance', '#f57f17')
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
            + '<div style="font-weight:700;font-size:15px;">📜 Insurance & TPA Denial Analysis & Revenue Leakage Audit</div>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.exportRcmExcel()">📊 Export RCM Report</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Payer / TPA</th><th>Total Claims</th><th>Approved (₹)</th><th>Denied (₹)</th><th>Root Cause Category</th><th>Revenue Leakage Risk</th><th>Action</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>Star Health Insurance</td><td>142</td><td>' + _formatCurrency(3250000) + '</td><td>' + _formatCurrency(145000) + '</td><td>Pre-auth Delay</td><td>' + _badge('Low Risk', 'info') + '</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Appeal sent to Star Health\',\'info\')">✉️ Appeal</button></td></tr>'
            + '<tr><td>HDFC ERGO Health</td><td>98</td><td>' + _formatCurrency(2410000) + '</td><td>' + _formatCurrency(82000) + '</td><td>ICD-10 Coding Mismatch</td><td>' + _badge('Low Risk', 'info') + '</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Coding appeal submitted\',\'info\')">✉️ Appeal</button></td></tr>'
            + '<tr><td>Ayushman Bharat PM-JAY</td><td>215</td><td>' + _formatCurrency(4100000) + '</td><td>' + _formatCurrency(310000) + '</td><td>Package Tariff Cap Exceeded</td><td>' + _badge('Medium Leakage', 'warning') + '</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Escalated to NHA Portal\',\'info\')">✉️ Escalated</button></td></tr>'
            + '<tr><td>ICICI Lombard TPA</td><td>76</td><td>' + _formatCurrency(1850000) + '</td><td>' + _formatCurrency(65000) + '</td><td>Missing Discharge Summary</td><td>' + _badge('Low Risk', 'info') + '</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Docs submitted\',\'info\')">✉️ Resend</button></td></tr>'
            + '</tbody></table></div></div>';

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
       (Specialty P&L: Cardio, Onco, Ortho, Neuro | ABC Costing | OT/ICU Yield)
    ────────────────────────────────────────────────────────── */
    function _renderUnitEconomicsTab() {
        var specialties = [
            { name: 'Cardiology & CathLab', revenue: 4200000, directCost: 2400000, margin: 42.8, procedures: 124, abcCost: 19354 },
            { name: 'Oncology & Radiation', revenue: 3800000, directCost: 2150000, margin: 43.4, procedures: 95, abcCost: 22631 },
            { name: 'Orthopedics & Joint', revenue: 3600000, directCost: 2100000, margin: 41.6, procedures: 88, abcCost: 23863 },
            { name: 'Neurology & Neurosurgery', revenue: 3100000, directCost: 1850000, margin: 40.3, procedures: 64, abcCost: 28906 },
            { name: 'Radiology & Imaging', revenue: 1850000, directCost: 620000, margin: 66.4, procedures: 450, abcCost: 1377 }
        ];

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🏥', 'Highest Margin Specialty', 'Radiology (66.4%)', 'Net Contribution: ₹12.3L', '#2e7d32')
            + _kpiCard('⚡', 'Top Yield Specialty', 'Cardiology (₹42.0L)', '124 CathLab Surgeries', '#1a73e8')
            + _kpiCard('🔪', 'OT Hourly Revenue Yield', _formatCurrency(14500), 'Avg OT Hourly Rate', '#6a1b9a')
            + _kpiCard('🛏️', 'ICU Daily Yield / Bed', _formatCurrency(28500), '92% Occupancy Rate', '#f57f17')
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">🏢 Specialty P&L (Cardio, Onco, Ortho, Neuro) & ABC Costing</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoSpecialtyPnlChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📋 Activity-Based Costing (ABC Model) & Yield Analysis</div>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportPnlExcel()">📊 Export Costing Excel</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Specialty Department</th><th>Procedure Count</th><th>Gross Revenue</th><th>Direct Cost</th><th>Unit ABC Cost / Proc</th><th>Contribution Margin</th><th>Margin %</th></tr></thead>'
            + '<tbody>';

        specialties.forEach(function (s) {
            var contrib = s.revenue - s.directCost;
            html += '<tr>'
                + '<td><strong>' + s.name + '</strong></td>'
                + '<td>' + s.procedures + '</td>'
                + '<td>' + _formatCurrency(s.revenue) + '</td>'
                + '<td>' + _formatCurrency(s.directCost) + '</td>'
                + '<td>' + _formatCurrency(s.abcCost) + '</td>'
                + '<td style="font-weight:700;color:#2e7d32;">' + _formatCurrency(contrib) + '</td>'
                + '<td><strong>' + s.margin + '%</strong></td>'
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
       MODULE 4: 📥 Approval Inbox (Pending: 7)
       (Vendor Invoices [3] | Patient Discounts [2] | Doctor Release [1] | Bad Debt [1])
    ────────────────────────────────────────────────────────── */
    function _renderApprovalsTab() {
        var approvals = DB.get('cfo_approvals_v2') || [
            { id: 'PO-301', category: 'Vendor Invoice ($5K-$25K)', amount: 450000, vendorOrPatient: 'Sun Pharma Distributors', dept: 'Pharmacy', reason: 'Bulk antibiotic stock invoice clearance', status: 'pending', date: '2026-08-24' },
            { id: 'PO-302', category: 'Vendor Invoice ($5K-$25K)', amount: 1250000, vendorOrPatient: 'Medtronic India', dept: 'Cardiology', reason: 'Stent inventory invoice payment', status: 'pending', date: '2026-08-24' },
            { id: 'PO-303', category: 'Vendor Invoice ($5K-$25K)', amount: 680000, vendorOrPatient: 'Olympus Medical', dept: 'Endoscopy', reason: 'Endoscope maintenance contract', status: 'pending', date: '2026-08-24' },
            { id: 'DSC-101', category: 'Patient Discount Request', amount: 45000, vendorOrPatient: 'Patient: Suresh Kumar', dept: 'IPD Billing', reason: 'Hardship waiver for extended ICU stay', status: 'pending', date: '2026-08-24' },
            { id: 'DSC-102', category: 'Patient Discount Request', amount: 18500, vendorOrPatient: 'Patient: Meena Sharma', dept: 'OPD Billing', reason: 'Staff relative concession', status: 'pending', date: '2026-08-23' },
            { id: 'DOC-501', category: 'Doctor Payout Release Batch', amount: 1423000, vendorOrPatient: 'Monthly Doctor Batch (18 Docs)', dept: 'Finance', reason: 'August doctor fee-sharing disbursement', status: 'pending', date: '2026-08-24' },
            { id: 'WRT-201', category: 'Bad Debt Write-Off', amount: 32000, vendorOrPatient: 'Patient: Unknown / Default', dept: 'Emergency', reason: 'Uncollectible MLC emergency care debt write-off', status: 'pending', date: '2026-08-22' }
        ];

        var pendingCount = approvals.filter(function (a) { return a.status === 'pending'; }).length;
        var pendingValue = approvals.filter(function (a) { return a.status === 'pending'; }).reduce(function (s, a) { return s + a.amount; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📥', 'Pending Approval Inbox', pendingCount + ' Requisitions', 'Requires CFO Decision', '#f57f17')
            + _kpiCard('💵', 'Total Pending Value', _formatCurrency(pendingValue), 'CFO Financial Requisitions', '#1a73e8')
            + _kpiCard('🏢', 'Vendor Invoices [3]', _formatCurrency(2380000), 'Bills $5K - $25K', '#6a1b9a')
            + _kpiCard('🏷️', 'Discounts & Write-Offs', _formatCurrency(95500), 'Concessions Queue', '#c62828')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📥 CFO Approval Inbox (Pending Queue: ' + pendingCount + ')</div>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.approveAllPending()">✓ Approve All Pending</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Req ID</th><th>Approval Category</th><th>Amount (₹)</th><th>Party / Vendor / Patient</th><th>Department</th><th>Justification Reason</th><th>Status</th><th>CFO Decision</th></tr></thead>'
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
                + (a.status === 'pending'
                    ? '<div style="display:flex;gap:4px;"><button class="btn btn-sm btn-success" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApprovalV2(' + idx + ',\'approved\')">✓ Approve</button>'
                    + '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApprovalV2(' + idx + ',\'rejected\')">✗ Reject</button></div>'
                    : '<span style="font-size:11px;color:var(--gray);">Processed</span>')
                + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 5: 📤 Executive & Board Submissions
       (Master Budget to MD/Chairman | CAPEX Proposals to Board | Board Deck Exporter)
    ────────────────────────────────────────────────────────── */
    function _renderBoardSubmissionsTab() {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📤', 'Submissions Status', 'Ready for Submission', 'FY 2025-26 Master Budget', '#2e7d32')
            + _kpiCard('📉', 'Draft Master Budget', _formatCurrency(145000000), 'Submitted to MD & Chairman', '#1a73e8')
            + _kpiCard('🔬', 'Board CAPEX Proposals', _formatCurrency(45000000), '3 Major Equipment Additions', '#6a1b9a')
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
            + '<button class="btn btn-outline" onclick="CfoPortal.exportFullExcel()">📄 Download Proposal PDF</button>'
            + '</div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📊 Monthly Executive Board Deck Exporter</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportFullExcel()">📊 Export Board Deck (Excel)</button>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.exportBalanceSheetPDF()">📄 Export Board Deck (PDF)</button>'
            + '</div>'
            + '</div>'
            + '<div style="font-size:13px;color:var(--text);line-height:1.6;">'
            + 'The Executive Board Deck aggregates financial statements, EBITDA performance, AR aging, specialty P&L margins, and statutory tax compliance into a single presentation-ready report for the Board of Directors.'
            + '</div></div>';

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE 6: 🛡️ Audit, Governance & Taxes
       (Balance Sheet, P&L, Cash Flow | Tax Compliance GST/TDS | Anti-Fraud Audit)
    ────────────────────────────────────────────────────────── */
    function _renderGovernanceTab() {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📜', 'GST Liability (Net)', _formatCurrency(342000), 'Output GST - ITC Credit', '#1a73e8')
            + _kpiCard('⚖️', 'TDS Payable (Sec 194J)', _formatCurrency(185000), 'Doctor Professional Fees', '#f57f17')
            + _kpiCard('🛡️', 'Anti-Fraud Compliance', '100% Verified', 'Zero Exception Alerts', '#2e7d32')
            + _kpiCard('🔒', 'Audit Activity Logs', (DB.get('cfo_audit_log') || []).length + 142, 'Immutable Audit Trail', '#6a1b9a')
            + '</div>'

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
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">🛡️ Anti-Fraud & Exception Audit Logs</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Timestamp</th><th>User Account</th><th>Module / Action</th><th>Audit Event Details</th><th>Risk Level</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>2026-08-24 19:20</td><td>cfo_admin</td><td>Approval Inbox</td><td>Approved Vendor Invoice PO-302 (₹12,50,000)</td><td>' + _badge('Normal', 'info') + '</td></tr>'
            + '<tr><td>2026-08-24 18:45</td><td>chief_accountant</td><td>Doctor Payouts</td><td>Authorized Fee-Sharing Batch Release (₹14,23,000)</td><td>' + _badge('Verified', 'success') + '</td></tr>'
            + '<tr><td>2026-08-24 16:10</td><td>cfo_admin</td><td>Board Submissions</td><td>Submitted Draft Master Budget to MD & Chairman</td><td>' + _badge('Verified', 'success') + '</td></tr>'
            + '</tbody></table></div></div>';

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

        var isCfoOrAdmin = user.role === 'CFO' || user.role === 'admin' || user.isSuperAdmin || (user.permissions && user.permissions.includes('cfo-portal'));
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
            { id: 'approvals', label: '📥 Approval Inbox (Pending: 7)', color: '#f57f17' },
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
            + '<div id="cfoTabContent"></div>';

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

    /* ── Export & Action Helpers ── */
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

        processApprovalV2: function (index, decision) {
            var approvals = DB.get('cfo_approvals_v2') || [
                { id: 'PO-301', category: 'Vendor Invoice ($5K-$25K)', amount: 450000, vendorOrPatient: 'Sun Pharma Distributors', dept: 'Pharmacy', reason: 'Bulk antibiotic stock invoice clearance', status: 'pending', date: '2026-08-24' },
                { id: 'PO-302', category: 'Vendor Invoice ($5K-$25K)', amount: 1250000, vendorOrPatient: 'Medtronic India', dept: 'Cardiology', reason: 'Stent inventory invoice payment', status: 'pending', date: '2026-08-24' },
                { id: 'PO-303', category: 'Vendor Invoice ($5K-$25K)', amount: 680000, vendorOrPatient: 'Olympus Medical', dept: 'Endoscopy', reason: 'Endoscope maintenance contract', status: 'pending', date: '2026-08-24' },
                { id: 'DSC-101', category: 'Patient Discount Request', amount: 45000, vendorOrPatient: 'Patient: Suresh Kumar', dept: 'IPD Billing', reason: 'Hardship waiver for extended ICU stay', status: 'pending', date: '2026-08-24' },
                { id: 'DSC-102', category: 'Patient Discount Request', amount: 18500, vendorOrPatient: 'Patient: Meena Sharma', dept: 'OPD Billing', reason: 'Staff relative concession', status: 'pending', date: '2026-08-23' },
                { id: 'DOC-501', category: 'Doctor Payout Release Batch', amount: 1423000, vendorOrPatient: 'Monthly Doctor Batch (18 Docs)', dept: 'Finance', reason: 'August doctor fee-sharing disbursement', status: 'pending', date: '2026-08-24' },
                { id: 'WRT-201', category: 'Bad Debt Write-Off', amount: 32000, vendorOrPatient: 'Patient: Unknown / Default', dept: 'Emergency', reason: 'Uncollectible MLC emergency care debt write-off', status: 'pending', date: '2026-08-22' }
            ];

            if (approvals[index]) {
                approvals[index].status = decision;
                DB.set('cfo_approvals_v2', approvals);
                APP.notify('Requisition ' + approvals[index].id + ' marked as ' + decision.toUpperCase(), decision === 'approved' ? 'success' : 'info');
                _renderActiveTabContent();
            }
        },

        approveAllPending: function () {
            var approvals = DB.get('cfo_approvals_v2') || [];
            approvals.forEach(function (a) { a.status = 'approved'; });
            DB.set('cfo_approvals_v2', approvals);
            APP.notify('All 7 Pending Requisitions Approved by CFO', 'success');
            _renderActiveTabContent();
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
