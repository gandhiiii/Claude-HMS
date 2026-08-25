// HMS — Chief Accountant Portal (Level 1 Financial Execution & Reconciliations Engine)

(function () {
    'use strict';

    var T = (typeof window !== 'undefined' && typeof window.T === 'function') ? window.T : (typeof I18N !== 'undefined' && typeof I18N.t === 'function' ? I18N.t : function (k) { return k; });
    var _caActiveTab = 'general_ledger';
    var _caCharts = [];

    /* ──────────────────────────────────────────────────────────
       SEED DATA GETTERS WITH PERSISTENT FALLBACKS
    ────────────────────────────────────────────────────────── */
    function _getGLVouchers() {
        var items = DB.get('ca_gl_vouchers');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { id: 'JV-2026-001', type: 'Journal Voucher (JV)', date: '2026-08-25', debitAccount: 'Pharmacy Stock Expense', creditAccount: 'Sun Pharma Accounts Payable', amount: 180000, narration: 'Correction voucher for antibiotic inventory batch adjustment', status: 'Verified', preparedBy: 'Ramesh Patel' },
                { id: 'REC-2026-084', type: 'Receipt Voucher', date: '2026-08-25', debitAccount: 'HDFC Main Bank A/c', creditAccount: 'Star Health Insurance AR', amount: 325000, narration: 'NEFT credit batch receipt against claim settlement #STAR-9812', status: 'Posted', preparedBy: 'Ramesh Patel' },
                { id: 'PAY-2026-112', type: 'Payment Voucher', date: '2026-08-24', debitAccount: 'Bio-Medical Waste Expense', creditAccount: 'Petty Cash Account', amount: 14500, narration: 'Biweekly hazardous waste disposal fee cash clearance', status: 'Posted', preparedBy: 'Ramesh Patel' },
                { id: 'CON-2026-019', type: 'Contra Voucher', date: '2026-08-24', debitAccount: 'SBI Cash-in-Hand Counter', creditAccount: 'ICICI Main Operational A/c', amount: 100000, narration: 'Inter-account cash transfer for main pharmacy counter float replenishment', status: 'Posted', preparedBy: 'Ramesh Patel' }
            ];
            DB.set('ca_gl_vouchers', items);
        }
        return items;
    }

    function _getApInvoices() {
        var items = DB.get('ca_ap_invoices');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { invNo: 'INV-SP-901', vendor: 'Sun Pharma Distributors', dept: 'Pharmacy', invDate: '2026-08-20', dueDate: '2026-09-04', amount: 180000, verifiedQty: 'Matched 100%', status: 'Verified (<$5K)', canApproveDirectly: true },
                { invNo: 'INV-MED-441', vendor: 'Medtronic India Pvt Ltd', dept: 'Cardiology', invDate: '2026-08-18', dueDate: '2026-09-02', amount: 1250000, verifiedQty: 'Matched 100%', status: 'Escalated to CFO ($5K-$25K)', canApproveDirectly: false },
                { invNo: 'INV-OLY-209', vendor: 'Olympus Medical Systems', dept: 'Endoscopy', invDate: '2026-08-22', dueDate: '2026-09-06', amount: 68000, verifiedQty: 'Matched 100%', status: 'Verified (<$5K)', canApproveDirectly: true },
                { invNo: 'INV-JJ-883', vendor: 'Johnson & Johnson Medical', dept: 'Surgery', invDate: '2026-08-15', dueDate: '2026-08-30', amount: 340000, verifiedQty: 'Matched 100%', status: 'Verified (<$5K)', canApproveDirectly: true }
            ];
            DB.set('ca_ap_invoices', items);
        }
        return items;
    }

    function _getArSettlements() {
        var items = DB.get('ca_ar_settlements');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { claimId: 'CLM-ST-401', payer: 'Star Health Insurance', patient: 'Rajesh Shah', billedAmt: 285000, approvedAmt: 265000, deductionAmt: 20000, deductionReason: 'Package Tariff Cap Exceeded', status: 'Reconciled', date: '2026-08-24' },
                { claimId: 'CLM-HD-119', payer: 'HDFC ERGO Health', patient: 'Sunita Verma', billedAmt: 142000, approvedAmt: 142000, deductionAmt: 0, deductionReason: 'Nil', status: 'Settled 100%', date: '2026-08-24' },
                { claimId: 'CLM-AY-902', payer: 'Ayushman Bharat PM-JAY', patient: 'Karan Patel', billedAmt: 95000, approvedAmt: 78000, deductionAmt: 17000, deductionReason: 'Pre-auth non-covered room upgrade', status: 'Pending Approval', date: '2026-08-23' },
                { claimId: 'CLM-IC-305', payer: 'ICICI Lombard TPA', patient: 'Meena Sharma', billedAmt: 185000, approvedAmt: 170000, deductionAmt: 15000, deductionReason: 'Consumable non-payable deduction', status: 'Reconciled', date: '2026-08-22' }
            ];
            DB.set('ca_ar_settlements', items);
        }
        return items;
    }

    function _getCashierEod() {
        var items = DB.get('ca_cashier_eod');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { counter: 'Main OPD Counter #1', cashier: 'Anand Kumar', systemReceipts: 145800, physicalCash: 145800, variance: 0, status: 'EOD Balanced & Locked', date: '2026-08-24' },
                { counter: 'Emergency / Billing Counter', cashier: 'Priya Joshi', systemReceipts: 98500, physicalCash: 98500, variance: 0, status: 'EOD Balanced & Locked', date: '2026-08-24' },
                { counter: 'IPD Discharge Counter #2', cashier: 'Vikram Singh', systemReceipts: 312000, physicalCash: 311500, variance: -500, status: 'Variance Flagged', date: '2026-08-24' },
                { counter: 'Pharmacy Night Counter', cashier: 'Sanjay Mehta', systemReceipts: 64200, physicalCash: 64200, variance: 0, status: 'EOD Balanced & Locked', date: '2026-08-24' }
            ];
            DB.set('ca_cashier_eod', items);
        }
        return items;
    }

    function _getDocTds() {
        var items = DB.get('ca_doc_tds');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { docName: 'Dr. Arvind Sharma (Cardiology)', grossShare: 450000, tdsRate: '10% (Sec 194J)', tdsAmount: 45000, netPayable: 405000, panNo: 'ABCPS1234F', status: 'Calculated' },
                { docName: 'Dr. Meera Nambiar (Oncology)', grossShare: 380000, tdsRate: '10% (Sec 194J)', tdsAmount: 38000, netPayable: 342000, panNo: 'BNMPS5678K', status: 'Calculated' },
                { docName: 'Dr. Suresh R. Patel (Orthopedics)', grossShare: 320000, tdsRate: '10% (Sec 194J)', tdsAmount: 32000, netPayable: 288000, panNo: 'CKLPR9101M', status: 'Calculated' },
                { docName: 'Dr. Ananya Roy (Neurosurgery)', grossShare: 275000, tdsRate: '10% (Sec 194J)', tdsAmount: 27500, netPayable: 247500, panNo: 'DLKPA4321P', status: 'Calculated' }
            ];
            DB.set('ca_doc_tds', items);
        }
        return items;
    }

    function _getFixedAssets() {
        var items = DB.get('ca_fixed_assets');
        if (!Array.isArray(items) || items.length === 0) {
            items = [
                { assetCode: 'AST-MED-011', assetName: '1.5T MRI Scanner (Siemens)', dept: 'Radiology', purchaseDate: '2023-04-10', cost: 12500000, depMethod: 'SLM 10%', accumDep: 2500000, wdv: 10000000, status: 'Active' },
                { assetCode: 'AST-MED-042', assetName: 'CathLab Angiography Machine', dept: 'Cardiology', purchaseDate: '2022-11-15', cost: 18000000, depMethod: 'SLM 10%', accumDep: 5400000, wdv: 12600000, status: 'Active' },
                { assetCode: 'AST-MED-089', assetName: '4D Ultrasound Unit (GE)', dept: 'Radiology/OBG', purchaseDate: '2024-01-20', cost: 3500000, depMethod: 'SLM 15%', accumDep: 787500, wdv: 2712500, status: 'Active' },
                { assetCode: 'AST-IT-105', assetName: 'Core Hospital Server Cluster', dept: 'IT', purchaseDate: '2023-09-01', cost: 1450000, depMethod: 'SLM 33.33%', accumDep: 966570, wdv: 483430, status: 'Active' }
            ];
            DB.set('ca_fixed_assets', items);
        }
        return items;
    }

    /* ── Helper Functions ── */
    function _formatCurrency(amt) {
        var num = Number(amt) || 0;
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function _kpiCard(icon, label, value, subtext, color) {
        color = color || '#0d47a1';
        return '<div class="stat-card" style="border-left-color:' + color + ';background:var(--card);padding:16px;border-radius:12px;border:1px solid var(--border);border-left:4px solid ' + color + ';">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
            + '<div><div style="font-size:12px;color:var(--gray);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">' + label + '</div>'
            + '<div style="font-size:20px;font-weight:800;color:var(--text);margin:4px 0;">' + value + '</div>'
            + (subtext ? '<div style="font-size:11px;color:' + color + ';font-weight:600;">' + subtext + '</div>' : '')
            + '</div><div style="width:40px;height:40px;border-radius:10px;background:' + color + '15;display:flex;align-items:center;justify-content:center;font-size:20px;">' + icon + '</div>'
            + '</div></div>';
    }

    function _badge(text, type) {
        var bg = type === 'success' ? '#e8f5e9' : type === 'danger' ? '#ffebee' : type === 'warning' ? '#fff8e1' : '#e3f2fd';
        var fg = type === 'success' ? '#2e7d32' : type === 'danger' ? '#c62828' : type === 'warning' ? '#f57f17' : '#1565c0';
        return '<span style="background:' + bg + ';color:' + fg + ';font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-block;">' + text + '</span>';
    }

    function _destroyCharts() {
        for (var i = 0; i < _caCharts.length; i++) {
            try { _caCharts[i].destroy(); } catch (e) {}
        }
        _caCharts = [];
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 1: 📒 General Ledger & Journal Vouchers
    ────────────────────────────────────────────────────────── */
    function _renderGLTab() {
        var vouchers = _getGLVouchers();
        var totalDebits = vouchers.reduce(function (s, v) { return s + v.amount; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📒', 'Total Vouchers', vouchers.length + ' Entries', 'Active Ledger Books', '#0d47a1')
            + _kpiCard('💵', 'Total Journal Volume', _formatCurrency(totalDebits), 'Balanced Debit/Credit', '#1a73e8')
            + _kpiCard('⚖️', 'Trial Balance Status', '100% Balanced', 'Zero Variance Detected', '#2e7d32')
            + _kpiCard('📝', 'Verification Level', 'Level 1 Signed', 'Chief Accountant Desk', '#6a1b9a')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📒 General Ledger & Journal Vouchers Register</div>'
            + '<div style="display:flex;gap:8px;">'
            + '<button class="btn btn-sm btn-primary" style="background:#0d47a1;" onclick="ChiefAccountantPortal.openAddVoucherModal()">➕ Create New Voucher</button>'
            + '</div>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Voucher Ref</th><th>Type</th><th>Posting Date</th><th>Debit Account</th><th>Credit Account</th><th>Amount (₹)</th><th>Narration</th><th>Status</th><th>Action</th></tr></thead>'
            + '<tbody>';

        vouchers.forEach(function (v, idx) {
            html += '<tr>'
                + '<td><strong>' + v.id + '</strong></td>'
                + '<td>' + _badge(v.type, 'info') + '</td>'
                + '<td>' + v.date + '</td>'
                + '<td><span style="color:#0d47a1;font-weight:700;">' + v.debitAccount + '</span></td>'
                + '<td><span style="color:#c62828;font-weight:700;">' + v.creditAccount + '</span></td>'
                + '<td style="font-weight:800;color:#1a73e8;">' + _formatCurrency(v.amount) + '</td>'
                + '<td style="font-size:12px;max-width:200px;">' + v.narration + '</td>'
                + '<td>' + _badge(v.status, 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="ChiefAccountantPortal.deleteVoucher(' + idx + ')">🗑️ Delete</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 2: 🏢 Accounts Payable (AP) & Verification
    ────────────────────────────────────────────────────────── */
    function _renderAPTab() {
        var invoices = _getApInvoices();
        var totalAp = invoices.reduce(function (s, i) { return s + i.amount; }, 0);
        var directApprovable = invoices.filter(function (i) { return i.canApproveDirectly; }).length;

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🏢', 'Accounts Payable (AP)', _formatCurrency(totalAp), invoices.length + ' Vendor Bills', '#c62828')
            + _kpiCard('✅', 'CA Signing Limit (<$5K)', directApprovable + ' Bills Ready', 'Within Chief Accountant Signing Limit', '#2e7d32')
            + _kpiCard('⬆️', 'Escalation to CFO (>$5K)', (invoices.length - directApprovable) + ' High-Value Bills', 'Requires Level 2 CFO Approval', '#f57f17')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🏢 Accounts Payable (AP) Verification & Sign-off Ledger</div>'
            + '<button class="btn btn-sm btn-primary" style="background:#0d47a1;" onclick="ChiefAccountantPortal.openAddApModal()">➕ Verify New Vendor Invoice</button>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Invoice No</th><th>Supplier / Vendor</th><th>Dept</th><th>Inv Date</th><th>Amount (₹)</th><th>Matching</th><th>Approval Status</th><th>Actions</th></tr></thead>'
            + '<tbody>';

        invoices.forEach(function (inv, idx) {
            html += '<tr>'
                + '<td><strong>' + inv.invNo + '</strong></td>'
                + '<td>' + inv.vendor + '</td>'
                + '<td>' + inv.dept + '</td>'
                + '<td>' + inv.invDate + '</td>'
                + '<td style="font-weight:800;color:#1a73e8;">' + _formatCurrency(inv.amount) + '</td>'
                + '<td>' + _badge(inv.verifiedQty, 'success') + '</td>'
                + '<td>' + _badge(inv.status, inv.canApproveDirectly ? 'success' : 'warning') + '</td>'
                + '<td>'
                + '<div style="display:flex;gap:4px;">'
                + (inv.canApproveDirectly
                    ? '<button class="btn btn-sm btn-success" style="font-size:11px;padding:3px 8px;" onclick="ChiefAccountantPortal.approveApBill(' + idx + ')">✓ Approve (<$5K)</button>'
                    : '<button class="btn btn-sm btn-warning" style="font-size:11px;padding:3px 8px;" onclick="ChiefAccountantPortal.escalateApToCfo(' + idx + ')">⬆️ Escalate to CFO</button>')
                + '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="ChiefAccountantPortal.deleteApBill(' + idx + ')">🗑️ Remove</button>'
                + '</div></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 3: 📥 Accounts Receivable (AR) & TPA
    ────────────────────────────────────────────────────────── */
    function _renderARTab() {
        var claims = _getArSettlements();
        var totalBilled = claims.reduce(function (s, c) { return s + c.billedAmt; }, 0);
        var totalApproved = claims.reduce(function (s, c) { return s + c.approvedAmt; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📥', 'Total Claim Submissions', _formatCurrency(totalBilled), claims.length + ' Payer Files', '#1a73e8')
            + _kpiCard('💵', 'Approved Receipts', _formatCurrency(totalApproved), 'Settled & Realized', '#2e7d32')
            + _kpiCard('📉', 'TPA Deductions / Leakage', _formatCurrency(totalBilled - totalApproved), 'Reconciled Audit Discrepancies', '#c62828')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">📥 AR TPA Settlement & Claim Reconciliation Desk</div>'
            + '<button class="btn btn-sm btn-primary" style="background:#0d47a1;" onclick="ChiefAccountantPortal.openAddArModal()">➕ Add Claim Settlement</button>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Claim ID</th><th>Insurance / TPA Payer</th><th>Patient Name</th><th>Billed Amt (₹)</th><th>Approved Amt (₹)</th><th>Deduction (₹)</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>'
            + '<tbody>';

        claims.forEach(function (c, idx) {
            html += '<tr>'
                + '<td><strong>' + c.claimId + '</strong></td>'
                + '<td>' + c.payer + '</td>'
                + '<td>' + c.patient + '</td>'
                + '<td>' + _formatCurrency(c.billedAmt) + '</td>'
                + '<td style="font-weight:700;color:#2e7d32;">' + _formatCurrency(c.approvedAmt) + '</td>'
                + '<td style="font-weight:700;color:#c62828;">' + _formatCurrency(c.deductionAmt) + '</td>'
                + '<td style="font-size:12px;">' + c.deductionReason + '</td>'
                + '<td>' + _badge(c.status, 'success') + '</td>'
                + '<td><button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="ChiefAccountantPortal.deleteArClaim(' + idx + ')">🗑️ Remove</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 4: 🏦 Daily Cashier & EOD Closing
    ────────────────────────────────────────────────────────── */
    function _renderCashierTab() {
        var eods = _getCashierEod();
        var totalCash = eods.reduce(function (s, c) { return s + c.physicalCash; }, 0);
        var totalVariance = eods.reduce(function (s, c) { return s + c.variance; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🏦', 'Physical Cash Collected', _formatCurrency(totalCash), eods.length + ' Active Counters', '#2e7d32')
            + _kpiCard('⚖️', 'Counter Cash Variance', _formatCurrency(totalVariance), totalVariance === 0 ? 'Exact Match' : 'Investigation Required', totalVariance === 0 ? '#2e7d32' : '#c62828')
            + _kpiCard('🔒', 'EOD Status', 'Day-End Locked', 'Bank Safe Handover Ready', '#0d47a1')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🏦 Daily Cashier Reconciliation & Day-End (EOD) Closing</div>'
            + '<button class="btn btn-sm btn-success" onclick="APP.notify(\'Day-End (EOD) Cash Book locked & Bank Vault transfer recorded\',\'success\')">🔒 Lock Day-End Cash Book</button>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Counter Location</th><th>Cashier Officer</th><th>System Receipts (₹)</th><th>Physical Count (₹)</th><th>Variance (₹)</th><th>Status</th><th>Sign-off</th></tr></thead>'
            + '<tbody>';

        eods.forEach(function (e, idx) {
            html += '<tr>'
                + '<td><strong>' + e.counter + '</strong></td>'
                + '<td>' + e.cashier + '</td>'
                + '<td>' + _formatCurrency(e.systemReceipts) + '</td>'
                + '<td style="font-weight:700;color:#1a73e8;">' + _formatCurrency(e.physicalCash) + '</td>'
                + '<td style="font-weight:700;color:' + (e.variance === 0 ? '#2e7d32' : '#c62828') + ';">' + _formatCurrency(e.variance) + '</td>'
                + '<td>' + _badge(e.status, e.variance === 0 ? 'success' : 'danger') + '</td>'
                + '<td><button class="btn btn-sm btn-primary" style="font-size:11px;padding:3px 8px;" onclick="APP.notify(\'EOD verified for ' + e.counter + '\',\'success\')">✓ Verify EOD</button></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 5: 🩺 Doctor Payout & TDS Computation
    ────────────────────────────────────────────────────────── */
    function _renderDocTdsTab() {
        var docs = _getDocTds();
        var totalGross = docs.reduce(function (s, d) { return s + d.grossShare; }, 0);
        var totalTds = docs.reduce(function (s, d) { return s + d.tdsAmount; }, 0);
        var totalNet = docs.reduce(function (s, d) { return s + d.netPayable; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🩺', 'Gross Doctor Fee Share', _formatCurrency(totalGross), docs.length + ' Senior Consultants', '#6a1b9a')
            + _kpiCard('⚖️', 'TDS Withheld (10% 194J)', _formatCurrency(totalTds), 'Deposit to Govt Treasury', '#f57f17')
            + _kpiCard('💵', 'Net Bank Disbursement', _formatCurrency(totalNet), 'NEFT Payout Batch Ready', '#2e7d32')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🩺 Doctor Fee-Share Payout & Section 194J TDS Ledger</div>'
            + '<button class="btn btn-sm btn-primary" style="background:#0d47a1;" onclick="APP.notify(\'Doctor Payout Batch sent to CFO for final disbursement sign-off\',\'success\')">✉️ Send Payout Batch to CFO</button>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Consultant Doctor</th><th>PAN Number</th><th>Gross Fee Share (₹)</th><th>TDS Rate</th><th>TDS Deducted (₹)</th><th>Net Payable (₹)</th><th>Status</th></tr></thead>'
            + '<tbody>';

        docs.forEach(function (d) {
            html += '<tr>'
                + '<td><strong>' + d.docName + '</strong></td>'
                + '<td><code>' + d.panNo + '</code></td>'
                + '<td style="font-weight:700;">' + _formatCurrency(d.grossShare) + '</td>'
                + '<td>' + d.tdsRate + '</td>'
                + '<td style="font-weight:700;color:#f57f17;">' + _formatCurrency(d.tdsAmount) + '</td>'
                + '<td style="font-weight:800;color:#2e7d32;">' + _formatCurrency(d.netPayable) + '</td>'
                + '<td>' + _badge(d.status, 'success') + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 6: 🏗️ Fixed Asset Register & Depreciation
    ────────────────────────────────────────────────────────── */
    function _renderAssetsTab() {
        var assets = _getFixedAssets();
        var totalCost = assets.reduce(function (s, a) { return s + a.cost; }, 0);
        var totalDep = assets.reduce(function (s, a) { return s + a.accumDep; }, 0);
        var totalWdv = assets.reduce(function (s, a) { return s + a.wdv; }, 0);

        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('🏗️', 'Original Asset Cost', _formatCurrency(totalCost), assets.length + ' Capital Equipment Tags', '#1a73e8')
            + _kpiCard('📉', 'Accumulated Depreciation', _formatCurrency(totalDep), 'SLM Depreciation Run', '#f57f17')
            + _kpiCard('🏢', 'Net Book Value (WDV)', _formatCurrency(totalWdv), 'Audited Balance Sheet Value', '#2e7d32')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">🏗️ Fixed Asset Register & Depreciation Schedule</div>'
            + '<button class="btn btn-sm btn-primary" style="background:#0d47a1;" onclick="APP.notify(\'Monthly Straight Line Depreciation posted to General Ledger\',\'success\')">⚙️ Run Depreciation Posting</button>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Asset Tag Code</th><th>Equipment / Asset Name</th><th>Dept</th><th>Purchase Date</th><th>Original Cost (₹)</th><th>Dep Method</th><th>Accum. Dep (₹)</th><th>Net WDV (₹)</th><th>Status</th></tr></thead>'
            + '<tbody>';

        assets.forEach(function (a) {
            html += '<tr>'
                + '<td><code>' + a.assetCode + '</code></td>'
                + '<td><strong>' + a.assetName + '</strong></td>'
                + '<td>' + a.dept + '</td>'
                + '<td>' + a.purchaseDate + '</td>'
                + '<td>' + _formatCurrency(a.cost) + '</td>'
                + '<td>' + a.depMethod + '</td>'
                + '<td style="color:#c62828;">' + _formatCurrency(a.accumDep) + '</td>'
                + '<td style="font-weight:800;color:#2e7d32;">' + _formatCurrency(a.wdv) + '</td>'
                + '<td>' + _badge(a.status, 'success') + '</td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 7: ⚖️ Statutory Taxes (GST, TDS)
    ────────────────────────────────────────────────────────── */
    function _renderTaxesTab() {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px;">'
            + _kpiCard('📜', 'GSTR-3B Net Liability', _formatCurrency(342000), 'Filing Due: 20th of Month', '#1a73e8')
            + _kpiCard('⚖️', 'TDS Section 194J (Doctors)', _formatCurrency(145000), 'Filing Due: 7th of Month', '#f57f17')
            + _kpiCard('👷', 'TDS Section 194C (Vendors)', _formatCurrency(18500), 'Contractor Withholding', '#2e7d32')
            + _kpiCard('🛡️', 'Compliance Rating', '100% Compliant', 'Zero Penalty Risk', '#0d47a1')
            + '</div>'

            + '<div class="card" style="padding:18px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
            + '<div style="font-weight:700;font-size:15px;">⚖️ Statutory Taxes & Regulatory Return Filing Register</div>'
            + '<button class="btn btn-sm btn-success" onclick="APP.notify(\'TDS Challan 281 generated for treasury payment\',\'success\')">📄 Generate Tax Challan 281</button>'
            + '</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Tax Type / Section</th><th>Taxable Base (₹)</th><th>Output Tax (₹)</th><th>Input Tax Credit (ITC)</th><th>Net Payable (₹)</th><th>Due Date</th><th>Filing Status</th></tr></thead>'
            + '<tbody>'
            + '<tr><td><strong>GST Output (Medicines & Consumables)</strong></td><td>' + _formatCurrency(2850000) + '</td><td>' + _formatCurrency(342000) + '</td><td>' + _formatCurrency(125000) + '</td><td style="font-weight:800;color:#1a73e8;">' + _formatCurrency(217000) + '</td><td>20th Monthly</td><td>' + _badge('Compliant', 'success') + '</td></tr>'
            + '<tr><td><strong>TDS 194J Professional Doctors</strong></td><td>' + _formatCurrency(1450000) + '</td><td>' + _formatCurrency(145000) + '</td><td>N/A</td><td style="font-weight:800;color:#f57f17;">' + _formatCurrency(145000) + '</td><td>7th Monthly</td><td>' + _badge('Ready for Challan', 'info') + '</td></tr>'
            + '<tr><td><strong>TDS 194C Vendor Contractors</strong></td><td>' + _formatCurrency(925000) + '</td><td>' + _formatCurrency(18500) + '</td><td>N/A</td><td style="font-weight:800;color:#2e7d32;">' + _formatCurrency(18500) + '</td><td>7th Monthly</td><td>' + _badge('Ready for Challan', 'info') + '</td></tr>'
            + '</tbody></table></div></div>';

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 8: 🔒 Financial Closing Desk
    ────────────────────────────────────────────────────────── */
    function _renderClosingTab() {
        var html = '<div class="card" style="padding:22px;max-width:850px;margin:0 auto;border:2px solid #0d47a1;">'
            + '<div style="font-size:20px;font-weight:800;color:#0d47a1;margin-bottom:6px;">🔒 Month-End / Year-End Financial Closing Controls</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:20px;">Chief Accountant period-end lockdown checklist and Trial Balance validation.</div>'

            + '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">'
            + '<div style="background:var(--light-gray);padding:14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">'
            + '<div><strong>1. Bank Reconciliation Statement (BRS)</strong><div style="font-size:12px;color:var(--gray);">Verify all uncleared cheques & bank credits</div></div>'
            + _badge('Completed & Reconciled', 'success')
            + '</div>'
            + '<div style="background:var(--light-gray);padding:14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">'
            + '<div><strong>2. General Ledger Trial Balance Audit</strong><div style="font-size:12px;color:var(--gray);">Confirm Debit equals Credit across all 48 GL heads</div></div>'
            + _badge('100% Balanced', 'success')
            + '</div>'
            + '<div style="background:var(--light-gray);padding:14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">'
            + '<div><strong>3. Doctor TDS & Vendor Accruals</strong><div style="font-size:12px;color:var(--gray);">Calculate unbilled expense provisions</div></div>'
            + _badge('Provisioned', 'success')
            + '</div>'
            + '<div style="background:var(--light-gray);padding:14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">'
            + '<div><strong>4. August 2026 Accounting Period Lockdown</strong><div style="font-size:12px;color:var(--gray);">Prevent backdated JV posting after closure</div></div>'
            + '<button class="btn btn-sm btn-danger" onclick="APP.notify(\'August 2026 Accounting Period locked permanently by Chief Accountant\',\'success\')">🔒 Lock Period</button>'
            + '</div>'
            + '</div></div>';

        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MODULE TAB 9: 📤 Escalation to CFO Desk
    ────────────────────────────────────────────────────────── */
    function _renderEscalationTab() {
        var approvals = DB.get('cfo_approvals_v2') || [];
        var escalated = approvals.filter(function (a) {
            var val = Number(a.amount) || 0;
            return (val / 83) >= 5000;
        });

        var html = '<div class="card" style="padding:22px;margin-bottom:20px;border:2px solid #f57f17;">'
            + '<div style="font-size:20px;font-weight:800;color:#f57f17;margin-bottom:6px;">📤 Requisition Escalation Desk (Send to Level 2: CFO)</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:16px;">Requisitions exceeding Chief Accountant signing limit ($5K / ₹4.15L) are automatically routed here for escalation sign-off.</div>'

            + '<div class="table-responsive"><table>'
            + '<thead><tr><th>Req ID</th><th>Category</th><th>Amount (₹)</th><th>Party / Vendor</th><th>Department</th><th>Reason</th><th>Required Tier</th><th>Escalation Action</th></tr></thead>'
            + '<tbody>';

        if (escalated.length === 0) {
            html += '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray);">No high-value items waiting for CFO escalation.</td></tr>';
        } else {
            escalated.forEach(function (e, idx) {
                html += '<tr>'
                    + '<td><strong>' + e.id + '</strong></td>'
                    + '<td>' + _badge(e.category, 'info') + '</td>'
                    + '<td style="font-weight:800;color:#1a73e8;">' + _formatCurrency(e.amount) + '</td>'
                    + '<td>' + e.vendorOrPatient + '</td>'
                    + '<td>' + e.dept + '</td>'
                    + '<td style="font-size:12px;">' + e.reason + '</td>'
                    + '<td>' + _badge('Level 2: CFO (>$5K)', 'warning') + '</td>'
                    + '<td><button class="btn btn-sm btn-warning" style="font-weight:700;" onclick="ChiefAccountantPortal.escalateToCfo(' + idx + ')">⬆️ Escalate to CFO Workspace</button></td>'
                    + '</tr>';
            });
        }

        html += '</tbody></table></div></div>';
        return html;
    }

    /* ──────────────────────────────────────────────────────────
       MAIN ENTRY POINT: renderChiefAccountantPortal
    ────────────────────────────────────────────────────────── */
    function renderChiefAccountantPortal(container) {
        var user = AUTH.currentUser();
        if (!user) {
            container.innerHTML = '<div class="empty-state">Not logged in</div>';
            return;
        }

        _destroyCharts();

        var TABS = [
            { id: 'general_ledger', label: '📒 General Ledger & JVs', color: '#0d47a1' },
            { id: 'ap_verification', label: '🏢 Accounts Payable (AP)', color: '#c62828' },
            { id: 'ar_tpa', label: '📥 Accounts Receivable (AR)', color: '#1a73e8' },
            { id: 'cashier_eod', label: '🏦 Daily Cashier & EOD', color: '#2e7d32' },
            { id: 'doc_tds', label: '🩺 Doctor Payout & TDS', color: '#6a1b9a' },
            { id: 'fixed_assets', label: '🏗️ Fixed Asset Register', color: '#00bcd4' },
            { id: 'taxes', label: '⚖️ Statutory Taxes (GST/TDS)', color: '#f57f17' },
            { id: 'closing', label: '🔒 Month-End Closing', color: '#37474f' },
            { id: 'escalations', label: '📤 Escalation to CFO', color: '#e65100' }
        ];

        var navButtonsHtml = TABS.map(function (t) {
            var active = t.id === _caActiveTab;
            return '<button onclick="ChiefAccountantPortal.switchTab(\'' + t.id + '\',this)"'
                + ' style="padding:9px 14px;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;'
                + (active ? 'background:' + t.color + ';color:#fff;box-shadow:0 3px 10px ' + t.color + '40;' : 'background:var(--card);color:var(--text);border:1px solid var(--border);')
                + '" data-tab="' + t.id + '" data-color="' + t.color + '">' + t.label + '</button>';
        }).join('');

        var headerHtml = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%);padding:20px 24px;border-radius:16px;color:#fff;">'
            + '<div style="display:flex;align-items:center;gap:14px;">'
            + '<div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;">📁</div>'
            + '<div>'
            + '<h2 style="font-size:22px;font-weight:800;margin:0;">Chief Accountant Portal</h2>'
            + '<div style="font-size:13px;opacity:0.85;margin-top:2px;">Level 1 Financial Execution: General Ledger, AP/AR, Cashier EOD, Doctor TDS, Assets & CFO Escalation</div>'
            + '</div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<button class="btn btn-sm" style="background:#ffffff;color:#0d47a1;font-weight:800;border-radius:8px;padding:8px 14px;" onclick="Router.navigate(\'cfo-portal\')">🏛️ CFO Workspace →</button>'
            + '</div>'
            + '</div>'

            + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;" id="caTabBar">' + navButtonsHtml + '</div>'
            + '<div id="caTabContent"></div>'
            + '<div id="caModalHost"></div>';

        container.innerHTML = headerHtml;
        _renderCaActiveTab();
    }

    function _renderCaActiveTab() {
        var contentEl = document.getElementById('caTabContent');
        if (!contentEl) return;

        if (_caActiveTab === 'general_ledger') contentEl.innerHTML = _renderGLTab();
        else if (_caActiveTab === 'ap_verification') contentEl.innerHTML = _renderAPTab();
        else if (_caActiveTab === 'ar_tpa') contentEl.innerHTML = _renderARTab();
        else if (_caActiveTab === 'cashier_eod') contentEl.innerHTML = _renderCashierTab();
        else if (_caActiveTab === 'doc_tds') contentEl.innerHTML = _renderDocTdsTab();
        else if (_caActiveTab === 'fixed_assets') contentEl.innerHTML = _renderAssetsTab();
        else if (_caActiveTab === 'taxes') contentEl.innerHTML = _renderTaxesTab();
        else if (_caActiveTab === 'closing') contentEl.innerHTML = _renderClosingTab();
        else if (_caActiveTab === 'escalations') contentEl.innerHTML = _renderEscalationTab();
    }

    /* ── Action Handlers ── */
    window.ChiefAccountantPortal = {
        switchTab: function (tabId, btn) {
            _caActiveTab = tabId;
            var bar = document.getElementById('caTabBar');
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
            _renderCaActiveTab();
        },

        closeModal: function () {
            var host = document.getElementById('caModalHost');
            if (host) host.innerHTML = '';
        },

        openAddVoucherModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Create New Journal Voucher (JV)</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="ChiefAccountantPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="ChiefAccountantPortal.saveVoucher(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Voucher Type</label>'
                + '<select id="caVoucherType" class="form-control" required><option>Journal Voucher (JV)</option><option>Payment Voucher</option><option>Receipt Voucher</option><option>Contra Voucher</option></select></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Debit Account</label><input type="text" id="caDebitAcc" class="form-control" placeholder="Pharmacy Stock / Expenses" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Credit Account</label><input type="text" id="caCreditAcc" class="form-control" placeholder="Vendor Payable / Cash" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Amount (₹)</label><input type="number" id="caVoucherAmt" class="form-control" placeholder="45000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Narration</label><textarea id="caVoucherNarration" class="form-control" rows="2" placeholder="Audit narration..." required></textarea></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="ChiefAccountantPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary" style="background:#0d47a1;">Post Voucher</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('caModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveVoucher: function (e) {
            e.preventDefault();
            var type = document.getElementById('caVoucherType').value;
            var debit = document.getElementById('caDebitAcc').value.trim();
            var credit = document.getElementById('caCreditAcc').value.trim();
            var amount = Number(document.getElementById('caVoucherAmt').value) || 0;
            var narration = document.getElementById('caVoucherNarration').value.trim();

            var vouchers = _getGLVouchers();
            var newId = 'JV-' + (Math.floor(100 + Math.random() * 900));
            vouchers.unshift({
                id: newId,
                type: type,
                date: new Date().toISOString().slice(0, 10),
                debitAccount: debit,
                creditAccount: credit,
                amount: amount,
                narration: narration,
                status: 'Verified',
                preparedBy: 'Chief Accountant'
            });

            DB.set('ca_gl_vouchers', vouchers);
            ChiefAccountantPortal.closeModal();
            APP.notify('Journal Voucher ' + newId + ' posted successfully', 'success');
            _renderCaActiveTab();
        },

        deleteVoucher: function (index) {
            var vouchers = _getGLVouchers();
            if (vouchers[index]) {
                if (confirm('Delete voucher entry "' + vouchers[index].id + '"?')) {
                    vouchers.splice(index, 1);
                    DB.set('ca_gl_vouchers', vouchers);
                    APP.notify('Voucher deleted', 'info');
                    _renderCaActiveTab();
                }
            }
        },

        openAddApModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Verify New Vendor Invoice (AP)</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="ChiefAccountantPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="ChiefAccountantPortal.saveApInvoice(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Invoice Number</label><input type="text" id="caApInvNo" class="form-control" placeholder="INV-SP-902" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Supplier / Vendor</label><input type="text" id="caApVendor" class="form-control" placeholder="Sun Pharma Distributors" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Department</label><input type="text" id="caApDept" class="form-control" placeholder="Pharmacy / Surgery" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Amount (₹)</label><input type="number" id="caApAmount" class="form-control" placeholder="180000" required /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="ChiefAccountantPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary" style="background:#c62828;">Verify Invoice</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('caModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveApInvoice: function (e) {
            e.preventDefault();
            var invNo = document.getElementById('caApInvNo').value.trim();
            var vendor = document.getElementById('caApVendor').value.trim();
            var dept = document.getElementById('caApDept').value.trim();
            var amount = Number(document.getElementById('caApAmount').value) || 0;

            var invoices = _getApInvoices();
            var usd = amount / 83;
            var canDirect = usd < 5000;
            invoices.unshift({
                invNo: invNo,
                vendor: vendor,
                dept: dept,
                invDate: new Date().toISOString().slice(0, 10),
                dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                amount: amount,
                verifiedQty: 'Matched 100%',
                status: canDirect ? 'Verified (<$5K)' : 'Escalated to CFO ($5K-$25K)',
                canApproveDirectly: canDirect
            });

            DB.set('ca_ap_invoices', invoices);
            ChiefAccountantPortal.closeModal();
            APP.notify('Invoice ' + invNo + ' verified & recorded', 'success');
            _renderCaActiveTab();
        },

        openAddArModal: function () {
            var modalHtml = '<div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;">'
                + '<div class="modal-card" style="background:var(--card);padding:24px;border-radius:16px;width:100%;max-width:480px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;font-weight:700;">➕ Add AR TPA Claim Settlement</h3>'
                + '<button class="btn btn-sm btn-outline" onclick="ChiefAccountantPortal.closeModal()">✕</button>'
                + '</div>'
                + '<form onsubmit="ChiefAccountantPortal.saveArClaim(event)">'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Insurance / TPA Payer</label><input type="text" id="caArPayer" class="form-control" placeholder="Star Health Insurance" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Patient Name</label><input type="text" id="caArPatient" class="form-control" placeholder="Rajesh Shah" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Billed Amount (₹)</label><input type="number" id="caArBilled" class="form-control" placeholder="285000" required /></div>'
                + '<div class="form-group" style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;">Approved Amount (₹)</label><input type="number" id="caArApproved" class="form-control" placeholder="265000" required /></div>'
                + '<div class="form-group" style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;">Deduction Reason</label><input type="text" id="caArReason" class="form-control" placeholder="Tariff Cap Exceeded" /></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button type="button" class="btn btn-outline" onclick="ChiefAccountantPortal.closeModal()">Cancel</button>'
                + '<button type="submit" class="btn btn-primary" style="background:#1a73e8;">Save Settlement</button>'
                + '</div></form></div></div>';

            var host = document.getElementById('caModalHost');
            if (host) host.innerHTML = modalHtml;
        },

        saveArClaim: function (e) {
            e.preventDefault();
            var payer = document.getElementById('caArPayer').value.trim();
            var patient = document.getElementById('caArPatient').value.trim();
            var billed = Number(document.getElementById('caArBilled').value) || 0;
            var approved = Number(document.getElementById('caArApproved').value) || 0;
            var reason = document.getElementById('caArReason').value.trim() || 'Nil';
            var deduction = Math.max(0, billed - approved);

            var claims = _getArSettlements();
            var newId = 'CLM-ST-' + (Math.floor(100 + Math.random() * 900));
            claims.unshift({
                claimId: newId,
                payer: payer,
                patient: patient,
                billedAmt: billed,
                approvedAmt: approved,
                deductionAmt: deduction,
                deductionReason: reason,
                status: 'Reconciled',
                date: new Date().toISOString().slice(0, 10)
            });

            DB.set('ca_ar_settlements', claims);
            ChiefAccountantPortal.closeModal();
            APP.notify('Claim settlement ' + newId + ' recorded', 'success');
            _renderCaActiveTab();
        },

        approveApBill: function (index) {
            var invoices = _getApInvoices();
            if (invoices[index]) {
                invoices[index].status = 'Approved (<$5K Signed)';
                DB.set('ca_ap_invoices', invoices);
                APP.notify('Invoice ' + invoices[index].invNo + ' signed off by Chief Accountant', 'success');
                _renderCaActiveTab();
            }
        },

        escalateApToCfo: function (index) {
            var invoices = _getApInvoices();
            if (invoices[index]) {
                invoices[index].status = 'Escalated to CFO ($5K-$25K)';
                DB.set('ca_ap_invoices', invoices);
                APP.notify('Invoice ' + invoices[index].invNo + ' escalated to Level 2 CFO Approval Inbox', 'warning');
                _renderCaActiveTab();
            }
        },

        deleteApBill: function (index) {
            var invoices = _getApInvoices();
            if (invoices[index]) {
                invoices.splice(index, 1);
                DB.set('ca_ap_invoices', invoices);
                APP.notify('Invoice entry removed', 'info');
                _renderCaActiveTab();
            }
        },

        deleteArClaim: function (index) {
            var claims = _getArSettlements();
            if (claims[index]) {
                claims.splice(index, 1);
                DB.set('ca_ar_settlements', claims);
                APP.notify('Claim settlement record removed', 'info');
                _renderCaActiveTab();
            }
        },

        escalateToCfo: function (index) {
            var approvals = DB.get('cfo_approvals_v2') || [];
            var escalated = approvals.filter(function (a) { return (Number(a.amount) || 0) / 83 >= 5000; });
            if (escalated[index]) {
                APP.notify('Requisition ' + escalated[index].id + ' escalated to CFO Workspace Queue', 'success');
            }
        }
    };

    window.renderChiefAccountantPortal = renderChiefAccountantPortal;
})();
