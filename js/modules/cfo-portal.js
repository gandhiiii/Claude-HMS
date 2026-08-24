// HMS — CFO Portal (Executive Financial Suite)

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
       TAB 1: Executive Dashboard (EBITDA, RevPOB, Daily Cash)
    ────────────────────────────────────────────────────────── */
    function _renderExecutiveTab() {
        var admissions = DB.get('admissions') || [];
        var activeBeds = admissions.filter(function (a) { return a.status === 'admitted'; }).length;
        var totalRev = admissions.length * 48500 + (DB.get('inventory') || []).length * 1250;
        var revPOB = activeBeds > 0 ? Math.round(totalRev / Math.max(1, activeBeds)) : 14200;

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📈', 'EBITDA Margin', '26.8%', '▲ +2.4% vs last month', '#2e7d32')
            + _kpiCard('🛏️', 'RevPOB (Rev / Occupied Bed)', _formatCurrency(revPOB), 'Active Beds: ' + activeBeds, '#1a73e8')
            + _kpiCard('💵', 'Daily Cash Balance', _formatCurrency(4850000), 'Liquidity Buffer: 45 Days', '#f57f17')
            + _kpiCard('👤', 'Avg Revenue / Patient', _formatCurrency(38400), 'IPD: ₹65k · OPD: ₹2.8k', '#6a1b9a')
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:16px;margin-bottom:20px;">'
            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
            + '<div style="font-weight:700;font-size:15px;">📊 Monthly EBITDA & Revenue Trend</div>'
            + '<span style="font-size:12px;color:var(--gray);">FY 2025-26</span>'
            + '</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoExecTrendChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
            + '<div style="font-weight:700;font-size:15px;">🍩 Expense Allocation Breakdown</div>'
            + '<span style="font-size:12px;color:var(--gray);">Operational Costs</span>'
            + '</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoExpensePieChart"></canvas></div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">⚡ Financial Performance Snapshot</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Financial Metric</th><th>Current Month</th><th>Prior Month</th><th>Budget Target</th><th>Variance</th><th>Status</th></tr></thead>'
            + '<tbody>'
            + '<tr><td><strong>Gross Hospital Revenue</strong></td><td>' + _formatCurrency(14500000) + '</td><td>' + _formatCurrency(13800000) + '</td><td>' + _formatCurrency(14000000) + '</td><td style="color:#2e7d32;">+₹5.0L (+3.5%)</td><td>' + _badge('On Target', 'success') + '</td></tr>'
            + '<tr><td><strong>Operating Costs (OPEX)</strong></td><td>' + _formatCurrency(9800000) + '</td><td>' + _formatCurrency(9500000) + '</td><td>' + _formatCurrency(9600000) + '</td><td style="color:#c62828;">-₹2.0L (-2.0%)</td><td>' + _badge('Watchlist', 'warning') + '</td></tr>'
            + '<tr><td><strong>Net Operating Margin</strong></td><td>' + _formatCurrency(4700000) + '</td><td>' + _formatCurrency(4300000) + '</td><td>' + _formatCurrency(4400000) + '</td><td style="color:#2e7d32;">+₹3.0L (+6.8%)</td><td>' + _badge('Exceeded', 'success') + '</td></tr>'
            + '<tr><td><strong>Days Sales Outstanding (DSO)</strong></td><td>38 Days</td><td>42 Days</td><td>35 Days</td><td>-4 Days</td><td>' + _badge('Improving', 'success') + '</td></tr>'
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

            _makeChart('cfoExpensePieChart', {
                type: 'doughnut',
                data: {
                    labels: ['Salaries & Doctors', 'Pharmacy & Supplies', 'Utilities & Admin', 'Equipment Maintenance', 'Depreciation & Taxes'],
                    datasets: [{ data: [42, 25, 15, 10, 8], backgroundColor: ['#1a73e8', '#2e7d32', '#f57f17', '#9c27b0', '#607d8b'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 2: Revenue Cycle Management (AR Aging, Denials, Payer)
    ────────────────────────────────────────────────────────── */
    function _renderRcmTab() {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('💳', 'Total Receivables (AR)', _formatCurrency(6850000), 'Outstanding Collections', '#1a73e8')
            + _kpiCard('⏳', '0-30 Days Bucket', _formatCurrency(4120000), '60.1% of Total AR', '#2e7d32')
            + _kpiCard('⚠️', '90+ Days Aging', _formatCurrency(840000), 'Requires Follow-up', '#c62828')
            + _kpiCard('🛡️', 'Clean Claim Rate', '94.2%', 'First Pass Yield', '#6a1b9a')
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;margin-bottom:20px;">'
            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">📅 Accounts Receivable (AR) Aging Buckets</div>'
            + '<div style="position:relative;height:240px;"><canvas id="cfoArAgingChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">🏥 Payer Mix Distribution</div>'
            + '<div style="position:relative;height:240px;"><canvas id="cfoPayerMixChart"></canvas></div>'
            + '</div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:15px;">📜 Insurance & TPA Claim Denial Analytics</div>'
            + '<button class="btn btn-sm btn-primary" onclick="CfoPortal.exportRcmExcel()">📊 Export RCM Excel</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>TPA / Insurance Company</th><th>Total Claims</th><th>Approved Value</th><th>Denied Value</th><th>Denial Rate</th><th>Top Denial Reason</th><th>Action</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>Star Health Insurance</td><td>142</td><td>' + _formatCurrency(3250000) + '</td><td>' + _formatCurrency(145000) + '</td><td>4.2%</td><td>Document Pre-auth Delay</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Appeals queued for Star Health\',\'info\')">✉️ Appeal</button></td></tr>'
            + '<tr><td>HDFC ERGO Health</td><td>98</td><td>' + _formatCurrency(2410000) + '</td><td>' + _formatCurrency(82000) + '</td><td>3.2%</td><td>Coding Mismatch</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Appeals queued for HDFC ERGO\',\'info\')">✉️ Appeal</button></td></tr>'
            + '<tr><td>Ayushman Bharat PM-JAY</td><td>215</td><td>' + _formatCurrency(4100000) + '</td><td>' + _formatCurrency(310000) + '</td><td>7.0%</td><td>Package Tariff Cap Exceeded</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Escalated to NHA Portal\',\'info\')">✉️ Escalated</button></td></tr>'
            + '<tr><td>ICICI Lombard TPA</td><td>76</td><td>' + _formatCurrency(1850000) + '</td><td>' + _formatCurrency(65000) + '</td><td>3.3%</td><td>Missing Discharge Summary</td><td><button class="btn btn-sm btn-outline" onclick="APP.notify(\'Docs resent to ICICI\',\'info\')">✉️ Resend</button></td></tr>'
            + '</tbody></table></div></div>';

        setTimeout(function () {
            _makeChart('cfoArAgingChart', {
                type: 'bar',
                data: {
                    labels: ['0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
                    datasets: [{ label: 'AR Amount (₹)', data: [4120000, 1250000, 640000, 840000], backgroundColor: ['#2e7d32', '#1a73e8', '#f57f17', '#c62828'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            _makeChart('cfoPayerMixChart', {
                type: 'pie',
                data: {
                    labels: ['Self-Pay (Cash/Card)', 'Private Insurance (TPA)', 'Government Schemes (PMJAY)', 'Corporate Credit Accounts'],
                    datasets: [{ data: [35, 40, 18, 7], backgroundColor: ['#1a73e8', '#2e7d32', '#9c27b0', '#f57f17'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 3: Specialty P&L (Department Margins & Costing)
    ────────────────────────────────────────────────────────── */
    function _renderPnlTab() {
        var depts = [
            { name: 'Cardiology & CathLab', revenue: 4200000, directCost: 2400000, margin: 42.8, procedures: 124 },
            { name: 'Orthopedics & Joint Replacement', revenue: 3600000, directCost: 2100000, margin: 41.6, procedures: 88 },
            { name: 'ICU & Critical Care', revenue: 2900000, directCost: 1950000, margin: 32.7, procedures: 210 },
            { name: 'Radiology & Imaging (MRI/CT)', revenue: 1850000, directCost: 620000, margin: 66.4, procedures: 450 },
            { name: 'General Surgery & OT', revenue: 2100000, directCost: 1250000, margin: 40.4, procedures: 160 },
            { name: 'Pharmacy (In-House Store)', revenue: 3100000, directCost: 2150000, margin: 30.6, procedures: 1420 }
        ];

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🏥', 'Highest Margin Dept', 'Radiology (66.4%)', 'Net Contribution: ₹12.3L', '#2e7d32')
            + _kpiCard('💳', 'Top Revenue Dept', 'Cardiology', 'Gross Rev: ₹42.0 Lakhs', '#1a73e8')
            + _kpiCard('⚡', 'Overall Profit Margin', '38.4%', 'Blended Hospital Contribution', '#6a1b9a')
            + _kpiCard('🔬', 'Avg Procedure Profit', _formatCurrency(18500), 'Gross Operating Margin', '#f57f17')
            + '</div>'

            + '<div class="card" style="padding:18px;margin-bottom:20px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">🏢 Specialty Profit & Loss (P&L) Contribution</div>'
            + '<div style="position:relative;height:260px;"><canvas id="cfoPnlChart"></canvas></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:15px;">📋 Departmental Costing & Margin Analysis</div>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportPnlExcel()">📊 Export P&L Excel</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Department / Specialty</th><th>Procedures Count</th><th>Gross Revenue</th><th>Direct Costs (Consumables + Staff)</th><th>Contribution Margin (₹)</th><th>Margin %</th><th>Performance</th></tr></thead>'
            + '<tbody>';

        depts.forEach(function (d) {
            var contrib = d.revenue - d.directCost;
            var badgeType = d.margin >= 40 ? 'success' : d.margin >= 30 ? 'warning' : 'danger';
            html += '<tr>'
                + '<td><strong>' + d.name + '</strong></td>'
                + '<td>' + d.procedures + '</td>'
                + '<td>' + _formatCurrency(d.revenue) + '</td>'
                + '<td>' + _formatCurrency(d.directCost) + '</td>'
                + '<td style="font-weight:700;color:#2e7d32;">' + _formatCurrency(contrib) + '</td>'
                + '<td><strong>' + d.margin + '%</strong></td>'
                + '<td>' + _badge(d.margin >= 40 ? 'High Margin' : 'Normal Margin', badgeType) + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';

        setTimeout(function () {
            _makeChart('cfoPnlChart', {
                type: 'bar',
                data: {
                    labels: depts.map(function (d) { return d.name; }),
                    datasets: [
                        { label: 'Gross Revenue (₹)', data: depts.map(function (d) { return d.revenue; }), backgroundColor: '#1a73e8' },
                        { label: 'Direct Costs (₹)', data: depts.map(function (d) { return d.directCost; }), backgroundColor: '#e53935' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }, 100);

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 4: Doctor Payouts (Fee Sharing & Consultation Splits)
    ────────────────────────────────────────────────────────── */
    function _renderDoctorsTab() {
        var doctors = [
            { name: 'Dr. Rajesh Sharma', dept: 'Cardiology', opd: 45000, ipd: 380000, totalShare: 425000, status: 'settled', date: '2026-08-20' },
            { name: 'Dr. Priya Patel', dept: 'Orthopedics', opd: 32000, ipd: 290000, totalShare: 322000, status: 'pending', date: '2026-08-22' },
            { name: 'Dr. Vikram Verma', dept: 'Neurology', opd: 58000, ipd: 410000, totalShare: 468000, status: 'pending', date: '2026-08-23' },
            { name: 'Dr. Ananya Roy', dept: 'Gynecology', opd: 28000, ipd: 180000, totalShare: 208000, status: 'settled', date: '2026-08-18' }
        ];

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('👨‍⚕️', 'Total Monthly Payouts', _formatCurrency(1423000), 'Doctor Share Settlements', '#1a73e8')
            + _kpiCard('⌛', 'Pending Disbursements', _formatCurrency(790000), '2 Doctors Awaiting Payout', '#f57f17')
            + _kpiCard('✅', 'Settled Disbursements', _formatCurrency(633000), 'Bank Transfer Complete', '#2e7d32')
            + _kpiCard('📝', 'Avg OPD / IPD Share %', '70% OPD / 30% IPD', 'Contract Standard', '#6a1b9a')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🩺 Doctor Fee Sharing & Settlement Ledger</div>'
            + '<button class="btn btn-sm btn-primary" onclick="APP.notify(\'New Doctor Fee Voucher Created\',\'success\')">➕ Create Payout Voucher</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Doctor Name</th><th>Specialty Dept</th><th>OPD Share (₹)</th><th>IPD Procedure Share (₹)</th><th>Total Share (₹)</th><th>Period Date</th><th>Disbursement Status</th><th>Actions</th></tr></thead>'
            + '<tbody>';

        doctors.forEach(function (d, i) {
            html += '<tr>'
                + '<td><strong>' + d.name + '</strong></td>'
                + '<td>' + d.dept + '</td>'
                + '<td>' + _formatCurrency(d.opd) + '</td>'
                + '<td>' + _formatCurrency(d.ipd) + '</td>'
                + '<td style="font-weight:700;color:#1a73e8;">' + _formatCurrency(d.totalShare) + '</td>'
                + '<td>' + d.date + '</td>'
                + '<td>' + _badge(d.status === 'settled' ? 'Disbursed' : 'Pending CFO Auth', d.status === 'settled' ? 'success' : 'warning') + '</td>'
                + '<td>'
                + (d.status === 'pending'
                    ? '<button class="btn btn-sm btn-success" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.settleDoctorPayout(' + i + ')">💳 Authorize Payout</button>'
                    : '<button class="btn btn-sm btn-outline" style="font-size:11px;padding:3px 8px;" onclick="APP.notify(\'Voucher Receipt Printed\',\'info\')">🖨️ Voucher</button>')
                + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 5: Budgeting & CAPEX (Budget vs Actual, Equipment ROI)
    ────────────────────────────────────────────────────────── */
    function _renderCapexTab() {
        var capexItems = [
            { name: '1.5T MRI Scanner (Siemens)', dept: 'Radiology', cost: 12500000, revenueYTD: 3400000, roi: '27.2%', payback: '3.6 Years', status: 'Active' },
            { name: 'CathLab Angiography Machine', dept: 'Cardiology', cost: 18000000, revenueYTD: 5800000, roi: '32.2%', payback: '3.1 Years', status: 'Active' },
            { name: '4D Ultrasound Machine (GE)', dept: 'Radiology/OBG', cost: 3500000, revenueYTD: 1400000, roi: '40.0%', payback: '2.5 Years', status: 'Active' },
            { name: 'Modular OT Integration System', dept: 'Surgery', cost: 6500000, revenueYTD: 1900000, roi: '29.2%', payback: '3.4 Years', status: 'Approved' }
        ];

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📉', 'Annual CAPEX Budget', _formatCurrency(45000000), 'FY 2025-26 Allocated', '#1a73e8')
            + _kpiCard('💳', 'CAPEX Utilized YTD', _formatCurrency(40500000), '90.0% of Total Budget', '#2e7d32')
            + _kpiCard('📊', 'Avg Medical Asset ROI', '32.1%', 'High Profitability', '#6a1b9a')
            + _kpiCard('⏳', 'Avg Payback Period', '3.1 Years', 'Capital Cost Recovery', '#f57f17')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🔬 High-Value Medical Equipment CAPEX & ROI Analysis</div>'
            + '<button class="btn btn-sm btn-primary" onclick="APP.notify(\'CAPEX Requisition Form Opened\',\'info\')">➕ New CAPEX Request</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Equipment Asset</th><th>Department</th><th>Capital Cost (₹)</th><th>Annual Revenue Gen (₹)</th><th>ROI %</th><th>Payback Est.</th><th>Asset Status</th></tr></thead>'
            + '<tbody>';

        capexItems.forEach(function (item) {
            html += '<tr>'
                + '<td><strong>' + item.name + '</strong></td>'
                + '<td>' + item.dept + '</td>'
                + '<td>' + _formatCurrency(item.cost) + '</td>'
                + '<td style="color:#2e7d32;font-weight:700;">' + _formatCurrency(item.revenueYTD) + '</td>'
                + '<td><strong>' + item.roi + '</strong></td>'
                + '<td>' + item.payback + '</td>'
                + '<td>' + _badge(item.status, 'success') + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 6: Treasury & Payables (Vendor Aging & Reconciliation)
    ────────────────────────────────────────────────────────── */
    function _renderTreasuryTab() {
        var vendors = [
            { name: 'Sun Pharma Distributors', invCount: 14, totalDue: 1420000, current: 850000, overdue: 570000, days: 45 },
            { name: 'Medtronic India Pvt Ltd', invCount: 6, totalDue: 2150000, current: 1900000, overdue: 250000, days: 32 },
            { name: 'Olympus Medical Systems', invCount: 3, totalDue: 680000, current: 680000, overdue: 0, days: 15 },
            { name: 'Johnson & Johnson Medical', invCount: 9, totalDue: 1120000, current: 720000, overdue: 400000, days: 60 }
        ];

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📜', 'Accounts Payable (AP)', _formatCurrency(5370000), 'Total Vendor Liabilities', '#c62828')
            + _kpiCard('⌛', 'Overdue Vendor Bills', _formatCurrency(1220000), 'Requires Cash Outflow', '#f57f17')
            + _kpiCard('🏦', 'Bank Account Balance', _formatCurrency(8450000), 'HDFC & ICICI Hospital Accounts', '#2e7d32')
            + _kpiCard('✅', 'Reconciled Transactions', '99.4%', 'Bank Statement Matching', '#1a73e8')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🏬 Vendor Accounts Payable & Payment Aging</div>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportPayablesExcel()">📊 Export Payables</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Vendor / Supplier Name</th><th>Invoices</th><th>Total Payable (₹)</th><th>Current (0-30 Days)</th><th>Overdue (>30 Days)</th><th>Aging Status</th><th>Action</th></tr></thead>'
            + '<tbody>';

        vendors.forEach(function (v, idx) {
            html += '<tr>'
                + '<td><strong>' + v.name + '</strong></td>'
                + '<td>' + v.invCount + ' Bills</td>'
                + '<td style="font-weight:700;">' + _formatCurrency(v.totalDue) + '</td>'
                + '<td>' + _formatCurrency(v.current) + '</td>'
                + '<td style="color:#c62828;font-weight:700;">' + _formatCurrency(v.overdue) + '</td>'
                + '<td>' + _badge(v.overdue > 0 ? v.days + ' Days Overdue' : 'On Schedule', v.overdue > 0 ? 'danger' : 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-primary" onclick="CfoPortal.authorizeVendorPayment(' + idx + ')">💳 Authorize Payment</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 7: Approvals Desk (High Discounts, Refunds, POs)
    ────────────────────────────────────────────────────────── */
    function _renderApprovalsTab() {
        var requests = DB.get('cfo_approvals') || [
            { id: 'APP-101', type: 'High Discount Request', amount: 45000, requestedBy: 'Accountant Ramesh', patientName: 'Suresh Kumar', dept: 'Billing', reason: 'Hardship concession for IPD stay', status: 'pending', date: '2026-08-24' },
            { id: 'APP-102', type: 'Material PO (> ₹50k)', amount: 185000, requestedBy: 'Storekeeper Vijay', patientName: '—', dept: 'Stores', reason: 'Emergency stock replenishment for ICU Monitors', status: 'pending', date: '2026-08-24' },
            { id: 'APP-103', type: 'Patient Refund Request', amount: 18500, requestedBy: 'Reception Anjali', patientName: 'Meena Sharma', dept: 'Cash Counter', reason: 'Duplicate advance deposit refund', status: 'pending', date: '2026-08-23' },
            { id: 'APP-104', type: 'Asset Write-off', amount: 32000, requestedBy: 'Facility HOD', patientName: '—', dept: 'Facility', reason: 'Damaged Autoclave sterilizer write-off', status: 'approved', date: '2026-08-21' }
        ];

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('⚡', 'Pending CFO Approvals', requests.filter(function (r) { return r.status === 'pending'; }).length + ' Requests', 'Requires CFO Signature', '#f57f17')
            + _kpiCard('💳', 'Value Pending Approval', _formatCurrency(requests.filter(function (r) { return r.status === 'pending'; }).reduce(function (s, r) { return s + r.amount; }, 0)), 'Total Requisition Value', '#1a73e8')
            + _kpiCard('✅', 'Approved Today', requests.filter(function (r) { return r.status === 'approved'; }).length, 'Authorized Requests', '#2e7d32')
            + _kpiCard('🛑', 'Rejected / Flagged', '0', 'Escalated Enquiries', '#c62828')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:14px;">📝 CFO Executive Approval Queue</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Req ID</th><th>Approval Category</th><th>Amount (₹)</th><th>Requested By</th><th>Department / Patient</th><th>Justification Reason</th><th>Status</th><th>CFO Decision</th></tr></thead>'
            + '<tbody>';

        requests.forEach(function (r, idx) {
            html += '<tr>'
                + '<td><strong>' + r.id + '</strong></td>'
                + '<td>' + _badge(r.type, 'info') + '</td>'
                + '<td style="font-weight:700;color:#1a73e8;">' + _formatCurrency(r.amount) + '</td>'
                + '<td>' + r.requestedBy + '</td>'
                + '<td>' + (r.patientName !== '—' ? r.patientName + ' (' + r.dept + ')' : r.dept) + '</td>'
                + '<td style="font-size:12px;max-width:200px;">' + r.reason + '</td>'
                + '<td>' + _badge(r.status.toUpperCase(), r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning') + '</td>'
                + '<td>'
                + (r.status === 'pending'
                    ? '<div style="display:flex;gap:4px;"><button class="btn btn-sm btn-success" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApproval(' + idx + ',\'approved\')">✓ Approve</button>'
                    + '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="CfoPortal.processApproval(' + idx + ',\'rejected\')">✗ Reject</button></div>'
                    : '<span style="font-size:11px;color:var(--gray);">Processed</span>')
                + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       TAB 8: Audit & Tax Reports (Balance Sheet, GST/TDS, Trail)
    ────────────────────────────────────────────────────────── */
    function _renderAuditTab() {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📜', 'GST Liability (Net)', _formatCurrency(342000), 'Output GST - Input Tax Credit', '#1a73e8')
            + _kpiCard('⚖️', 'TDS Payable (Sec 194J)', _formatCurrency(185000), 'Doctor & Professional Fees', '#f57f17')
            + _kpiCard('🛡️', 'Audit Compliance Score', '98.5%', '100% Statutory Compliance', '#2e7d32')
            + _kpiCard('📑', 'Total Audit Logs', (DB.get('cfo_audit_log') || []).length + 142, 'Immutable Activity Trail', '#6a1b9a')
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;margin-bottom:20px;">'
            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
            + '<div style="font-weight:700;font-size:15px;">⚖️ Balance Sheet Summary</div>'
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
            + '<div style="font-weight:700;font-size:15px;">📑 Tax Summaries (GST / TDS)</div>'
            + '<button class="btn btn-sm btn-success" onclick="CfoPortal.exportTaxReportExcel()">📊 Export Tax Excel</button>'
            + '</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Tax Category</th><th>Taxable Amount</th><th>Tax Rate</th><th>Tax Liability (₹)</th><th>Filing Due Date</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>GSTR-3B (Medicines & Pharmacy)</td><td>' + _formatCurrency(2800000) + '</td><td>12% / 18%</td><td>' + _formatCurrency(342000) + '</td><td>20th of Month</td></tr>'
            + '<tr><td>TDS 194J (Professional Doctors)</td><td>' + _formatCurrency(1850000) + '</td><td>10%</td><td>' + _formatCurrency(185000) + '</td><td>7th of Month</td></tr>'
            + '<tr><td>TDS 194C (Vendor Contractors)</td><td>' + _formatCurrency(650000) + '</td><td>2%</td><td>' + _formatCurrency(13000) + '</td><td>7th of Month</td></tr>'
            + '</tbody></table></div></div>'
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">🔒 Immutable Audit Trail Log</div>'
            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Timestamp</th><th>User</th><th>Action / Module</th><th>Details</th><th>IP Address</th></tr></thead>'
            + '<tbody>'
            + '<tr><td>2026-08-24 19:20</td><td>cfo_admin</td><td>Approval Desk</td><td>Approved Concession Request APP-101 (₹45,000)</td><td>192.168.1.45</td></tr>'
            + '<tr><td>2026-08-24 18:45</td><td>chief_accountant</td><td>Doctor Payouts</td><td>Created Payout Voucher for Dr. Rajesh Sharma</td><td>192.168.1.18</td></tr>'
            + '<tr><td>2026-08-24 16:10</td><td>cfo_admin</td><td>Budget CAPEX</td><td>Approved CathLab Equipment Requisition</td><td>192.168.1.45</td></tr>'
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

        _destroyCharts();

        var TABS = [
            { id: 'executive', label: '📈 Executive Dashboard', color: '#1a73e8' },
            { id: 'rcm', label: '💳 Revenue Cycle (RCM)', color: '#2e7d32' },
            { id: 'pnl', label: '🏥 Specialty P&L', color: '#6a1b9a' },
            { id: 'doctors', label: '👨‍⚕️ Doctor Payouts', color: '#f57f17' },
            { id: 'capex', label: '📉 Budgeting & CAPEX', color: '#00bcd4' },
            { id: 'treasury', label: '📜 Treasury & Payables', color: '#c62828' },
            { id: 'approvals', label: '✅ Approvals Desk', color: '#43a047' },
            { id: 'audit', label: '📑 Audit & Tax Reports', color: '#37474f' }
        ];

        var navButtonsHtml = TABS.map(function (t) {
            var active = t.id === _activeTab;
            return '<button onclick="CfoPortal.switchTab(\'' + t.id + '\',this)"'
                + ' style="padding:9px 15px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;'
                + (active ? 'background:' + t.color + ';color:#fff;box-shadow:0 3px 10px ' + t.color + '40;' : 'background:var(--card);color:var(--text);border:1px solid var(--border);')
                + '" data-tab="' + t.id + '" data-color="' + t.color + '">' + t.label + '</button>';
        }).join('');

        var headerHtml = '<div style="display:flex;justify-content:space-between;align-align:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%);padding:20px 24px;border-radius:16px;color:#fff;">'
            + '<div style="display:flex;align-items:center;gap:14px;">'
            + '<div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;">📊</div>'
            + '<div>'
            + '<h2 style="font-size:22px;font-weight:800;margin:0;">CFO Executive Financial Portal</h2>'
            + '<div style="font-size:13px;opacity:0.85;margin-top:2px;">Hospital Financial Health, Revenue Cycle, P&L Margins, Approvals & Tax Compliance</div>'
            + '</div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<button class="btn btn-sm" style="background:#ffffff;color:#0d47a1;font-weight:800;border-radius:8px;padding:8px 14px;" onclick="CfoPortal.exportFullExcel()">📊 Download Full Financial Report (Excel)</button>'
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
        else if (_activeTab === 'pnl') contentEl.innerHTML = _renderPnlTab();
        else if (_activeTab === 'doctors') contentEl.innerHTML = _renderDoctorsTab();
        else if (_activeTab === 'capex') contentEl.innerHTML = _renderCapexTab();
        else if (_activeTab === 'treasury') contentEl.innerHTML = _renderTreasuryTab();
        else if (_activeTab === 'approvals') contentEl.innerHTML = _renderApprovalsTab();
        else if (_activeTab === 'audit') contentEl.innerHTML = _renderAuditTab();
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

        processApproval: function (index, decision) {
            var requests = DB.get('cfo_approvals') || [
                { id: 'APP-101', type: 'High Discount Request', amount: 45000, requestedBy: 'Accountant Ramesh', patientName: 'Suresh Kumar', dept: 'Billing', reason: 'Hardship concession for IPD stay', status: 'pending', date: '2026-08-24' },
                { id: 'APP-102', type: 'Material PO (> ₹50k)', amount: 185000, requestedBy: 'Storekeeper Vijay', patientName: '—', dept: 'Stores', reason: 'Emergency stock replenishment for ICU Monitors', status: 'pending', date: '2026-08-24' },
                { id: 'APP-103', type: 'Patient Refund Request', amount: 18500, requestedBy: 'Reception Anjali', patientName: 'Meena Sharma', dept: 'Cash Counter', reason: 'Duplicate advance deposit refund', status: 'pending', date: '2026-08-23' },
                { id: 'APP-104', type: 'Asset Write-off', amount: 32000, requestedBy: 'Facility HOD', patientName: '—', dept: 'Facility', reason: 'Damaged Autoclave sterilizer write-off', status: 'approved', date: '2026-08-21' }
            ];

            if (requests[index]) {
                requests[index].status = decision;
                DB.set('cfo_approvals', requests);
                APP.notify('Request ' + requests[index].id + ' marked as ' + decision.toUpperCase(), decision === 'approved' ? 'success' : 'info');
                _renderActiveTabContent();
            }
        },

        settleDoctorPayout: function (index) {
            APP.notify('Doctor Payout Authorized & Pushed to Bank Settlement Gateway', 'success');
            _renderActiveTabContent();
        },

        authorizeVendorPayment: function (index) {
            APP.notify('Vendor Payment Scheduled via Treasury Gateway', 'success');
        },

        exportFullExcel: function () {
            if (typeof XLSX === 'undefined') {
                APP.notify('Excel Export library loading...', 'warning');
                return;
            }
            try {
                var wb = XLSX.utils.book_new();

                var kpiData = [
                    ['CFO EXECUTIVE FINANCIAL REPORT — HMS'],
                    ['Generated Date', new Date().toLocaleString('en-IN')],
                    [''],
                    ['Metric', 'Value', 'Status'],
                    ['EBITDA Margin', '26.8%', 'On Target'],
                    ['RevPOB (Rev Per Occupied Bed)', '₹14,200', 'Normal'],
                    ['Daily Cash Balance', '₹4,850,000', 'Healthy Buffer'],
                    ['Total AR Receivables', '₹6,850,000', 'Managed'],
                    ['Clean Claim Rate', '94.2%', 'Exceeded Target']
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiData), 'Executive Summary');

                XLSX.writeFile(wb, 'CFO_Financial_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx');
                APP.notify('Full CFO Financial Report Excel Downloaded', 'success');
            } catch (e) {
                APP.notify('Export Error: ' + e.message, 'error');
            }
        },

        exportRcmExcel: function () {
            CfoPortal.exportFullExcel();
        },
        exportPnlExcel: function () {
            CfoPortal.exportFullExcel();
        },
        exportPayablesExcel: function () {
            CfoPortal.exportFullExcel();
        },
        exportTaxReportExcel: function () {
            CfoPortal.exportFullExcel();
        },
        exportBalanceSheetPDF: function () {
            window.print();
        }
    };

    window.renderCfoPortal = renderCfoPortal;

})();
