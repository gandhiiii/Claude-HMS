// Discount Request & Approval — Billing Desk → Billing Manager / CFO / MD / Executive Board
// Ported from the F:\Discount React app into the vanilla-JS HMS module system.
// Data store key: discountRequests (synced to cloud via SYNC.SHARED_KEYS).

var _discStatusMap = {
    'PENDING_BMGR':      { key: 'discmod_status_pending_bmgr', badge: 'badge-warning' },
    'PENDING_CA':        { key: 'discmod_status_pending_ca',   badge: 'badge-warning' },
    'PENDING_CFO':       { key: 'discmod_status_pending_cfo',  badge: 'badge-warning' },
    'PENDING_EXECUTIVE': { key: 'discmod_status_pending_exec', badge: 'badge-danger' },
    'APPROVED':          { key: 'discmod_status_approved',     badge: 'badge-success' },
    'REJECTED':          { key: 'discmod_status_rejected',     badge: 'badge-danger' }
};

var _discRoleMeta = {
    'BILLING_CLERK':    { label: 'discmod_role_billing_clerk',     tier: 'discmod_tier_desk' },
    'RECEPTIONIST':     { label: 'discmod_role_receptionist',      tier: 'discmod_tier_desk' },
    'BILLING_MANAGER':  { label: 'discmod_role_billing_manager',   tier: 'discmod_tier_up_25k' },
    'CHIEF_ACCOUNTANT': { label: 'discmod_role_chief_accountant',  tier: 'discmod_tier_up_25k' },
    'CFO':              { label: 'discmod_role_cfo',               tier: 'discmod_tier_25k_200k' },
    'MD':               { label: 'discmod_role_md',                tier: 'discmod_tier_above_200k' },
    'DIRECTOR':         { label: 'discmod_role_director',          tier: 'discmod_tier_above_200k' },
    'EXECUTIVE':        { label: 'discmod_role_executive',         tier: 'discmod_tier_above_200k' },
    'CHAIRMAN':         { label: 'discmod_role_chairman',          tier: 'discmod_tier_above_200k' },
    'VICE_CHAIRMAN':    { label: 'discmod_role_vice_chairman',     tier: 'discmod_tier_above_200k' },
    'ADMIN':            { label: 'discmod_role_admin',             tier: 'discmod_tier_admin' }
};

var _discExecRoles = ['MD', 'DIRECTOR', 'EXECUTIVE', 'CHAIRMAN', 'VICE_CHAIRMAN'];
var _discTab = 'all';

function _discUserRole(user) {
    return (user && user.role) ? String(user.role).toUpperCase() : '';
}
function _discIsApproverRole(role) {
    return !!_discRoleMeta[role];
}
function _discIsExec(role) {
    return _discExecRoles.indexOf(role) !== -1;
}
function _discMatchesApproverRole(required, userRole) {
    if (!required) return false;
    if (required === userRole) return true;
    if (required === 'EXECUTIVE' && _discIsExec(userRole)) return true;
    return false;
}
function _discIsAdmin(user) {
    return !!user && (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin');
}
function _discNum(v) { return Number(v) || 0; }
function _discINR(v) {
    return '₹' + _discNum(v).toLocaleString('en-IN');
}
function _discRoleLabel(role) {
    var m = _discRoleMeta[role];
    return m ? T(m.label) : (role || 'STAFF');
}
function _discRoleTier(role) {
    var m = _discRoleMeta[role];
    return m ? T(m.tier) : '';
}
function _discStatusBadge(status) {
    var m = _discStatusMap[status];
    return m ? m.badge : 'badge-warning';
}
function _discStatusLabel(status) {
    var m = _discStatusMap[status];
    return m ? T(m.key) : (status || '');
}
function _discFullName(user) {
    if (!user) return '';
    return user.fullName || user.name || user.username || '';
}

// Determine required approval authority based on requested discount % and amount.
// Billing Manager (up to ₹25,000) → CFO (₹25,000 - ₹2,00,000) → Executive Board (above ₹2,00,000 or >50%).
function _discRequiredAuthority(discountPercent, discountAmount, targetRoleOverride) {
    var pct = Number(discountPercent) || 0;
    var amt = Number(discountAmount) || 0;
    var role = 'BILLING_MANAGER';
    var level = 'UP_TO_25K';

    if (targetRoleOverride) {
        if (targetRoleOverride === 'BILLING_MANAGER') { role = 'BILLING_MANAGER'; level = 'UP_TO_25K'; }
        else if (targetRoleOverride === 'CHIEF_ACCOUNTANT') { role = 'CHIEF_ACCOUNTANT'; level = 'UP_TO_25K'; }
        else if (targetRoleOverride === 'CFO') { role = 'CFO'; level = 'ABOVE_25K_TO_200K'; }
        else if (_discIsExec(targetRoleOverride) || targetRoleOverride === 'MD' || targetRoleOverride === 'DIRECTOR') { role = 'EXECUTIVE'; level = 'ABOVE_200K'; }
    } else if (amt > 200000 || pct > 50) {
        role = 'EXECUTIVE'; level = 'ABOVE_200K';
    } else if (amt > 25000) {
        role = 'CFO'; level = 'ABOVE_25K_TO_200K';
    }

    var users = DB.get('users') || [];
    var targetUser = null;
    for (var i = 0; i < users.length; i++) {
        if (_discUserRole(users[i]) === role && users[i].active !== false) { targetUser = users[i]; break; }
    }
    if (!targetUser) {
        for (var j = 0; j < users.length; j++) {
            if (_discIsExec(_discUserRole(users[j])) && users[j].active !== false) { targetUser = users[j]; break; }
        }
    }
    if (!targetUser) targetUser = users[0] || null;

    return { role: role, level: level, targetUser: targetUser };
}

function _discInitialStatus(role) {
    if (role === 'BILLING_MANAGER') return 'PENDING_BMGR';
    if (role === 'CHIEF_ACCOUNTANT') return 'PENDING_CA';
    if (role === 'CFO') return 'PENDING_CFO';
    return 'PENDING_EXECUTIVE';
}

function _discNotify(title, body) {
    try {
        if (typeof WS_NOTIFY !== 'undefined' && WS_NOTIFY && typeof WS_NOTIFY.broadcast === 'function') {
            WS_NOTIFY.broadcast({ title: title, body: body, notifType: 'info', key: 'discountRequests' });
        }
    } catch (e) {}
}

function _discCanAct(r, user) {
    if (!r || !user) return false;
    if (_discIsAdmin(user)) return true;
    if (String(r.status).indexOf('PENDING') !== 0) return false;
    return _discMatchesApproverRole(r.currentApproverRole, _discUserRole(user));
}

/* ── Render module ── */
function renderDiscounts(container) {
    var user = AUTH.currentUser();
    var isAdmin = _discIsAdmin(user);
    var isExec = _discIsExec(_discUserRole(user));

    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box"><input type="text" class="form-control" id="discSearch" placeholder="' + T('discmod_search_placeholder') + '" oninput="renderDiscList()"></div>'
        + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span id="discCount" style="font-size:13px;color:var(--gray);">0 ' + T('discmod_request_plural') + '</span>'
        + (isExec || isAdmin ? '<button class="btn btn-success" onclick="showDiscDirectGrant()">' + T('discmod_btn_direct_grant') + '</button>' : '')
        + '<button class="btn btn-primary" onclick="showDiscForm()">' + T('discmod_btn_new_request') + '</button>'
        + '</div></div>'
        + '<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:14px;background:var(--light-gray);border-radius:8px;padding:10px 14px;font-size:11px;">'
        + '<span style="font-weight:700;margin-right:6px;font-size:12px;">' + T('discmod_flow_label') + '</span>'
        + '<span class="badge badge-warning">' + T('discmod_flow_step1') + '</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-warning">' + T('discmod_flow_step2') + '</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-info">' + T('discmod_flow_step3') + '</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-danger">' + T('discmod_flow_step4') + '</span>'
        + '</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;">'
        + _discTabBtn('all', T('discmod_tab_all'))
        + _discTabBtn('pending', T('discmod_tab_pending'))
        + _discTabBtn('approved', T('discmod_tab_approved'))
        + _discTabBtn('rejected', T('discmod_tab_rejected'))
        + '</div>'
        + '<div id="discView"></div>';

    renderDiscList();
}

function _discTabBtn(id, label) {
    return '<button class="btn btn-sm ' + (_discTab === id ? 'btn-primary' : 'btn-outline') + '" onclick="discSetTab(\'' + id + '\')">' + label + '</button>';
}

function discSetTab(tab) {
    _discTab = tab;
    renderDiscList();
}

function renderDiscList() {
    try {
        var user = AUTH.currentUser();
        if (!user) return;
        var isAdmin = _discIsAdmin(user);
        var myRole = _discUserRole(user);
        var myRoleCanApprove = _discIsApproverRole(myRole);

        var all = DB.get('discountRequests') || [];
        var search = (document.getElementById('discSearch') ? document.getElementById('discSearch').value : '').toLowerCase();

        var requests = all.filter(function(r) {
            if (!r) return false;
            if (isAdmin) return true;
            if (r.createdBy === user.username) return true;
            if (r.requestedBy === user.username) return true;
            if (myRoleCanApprove && _discMatchesApproverRole(r.currentApproverRole, myRole)) return true;
            var chain = r.approvalChain || [];
            for (var i = 0; i < chain.length; i++) {
                if (chain[i].actorUsername === user.username) return true;
            }
            return false;
        });

        if (_discTab === 'pending') requests = requests.filter(function(r) { return String(r.status || '').indexOf('PENDING') === 0; });
        else if (_discTab === 'approved') requests = requests.filter(function(r) { return r.status === 'APPROVED'; });
        else if (_discTab === 'rejected') requests = requests.filter(function(r) { return r.status === 'REJECTED'; });

        if (search) {
            requests = requests.filter(function(r) {
                return (r.requestCode || '').toLowerCase().indexOf(search) >= 0
                    || (r.patientName || '').toLowerCase().indexOf(search) >= 0
                    || (r.patientId || '').toLowerCase().indexOf(search) >= 0
                    || (r.department || '').toLowerCase().indexOf(search) >= 0
                    || (r.opdIpdNo || '').toLowerCase().indexOf(search) >= 0
                    || (r.doctorName || '').toLowerCase().indexOf(search) >= 0
                    || (r.receiptNo || '').toLowerCase().indexOf(search) >= 0;
            });
        }

        var countEl = document.getElementById('discCount');
        if (countEl) countEl.textContent = requests.length + ' ' + (requests.length !== 1 ? T('discmod_request_plural') : T('discmod_request_singular'));

        var viewEl = document.getElementById('discView');
        if (!viewEl) return;

        if (!requests.length) {
            viewEl.innerHTML = '<div class="card"><div class="empty-state">' + T('discmod_no_requests_found') + '</div></div>';
            return;
        }

        var html = '';
        var sorted = requests.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        for (var i = 0; i < sorted.length; i++) {
            html += _discCard(sorted[i], user, isAdmin, myRole);
        }
        viewEl.innerHTML = html;
    } catch (e) {
        console.warn('renderDiscList error:', e);
    }
}

function _discCard(r, user, isAdmin, myRole) {
    var canAct = _discCanAct(r, user);
    var isExec = _discIsExec(myRole);
    var canDelete = isAdmin;

    var discTypeLabel = r.requestedDiscountType === 'FIXED'
        ? T('discmod_type_fixed') + ' ' + _discINR(r.requestedDiscountVal)
        : T('discmod_type_percent') + ' ' + _discNum(r.requestedDiscountVal).toFixed(1) + '%';

    var html = '<div class="card" style="padding:14px;margin-bottom:10px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
        + '<div>'
        + '<div style="font-size:14px;font-weight:700;">' + esc(r.requestCode || r.id) + '</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">'
        + '<strong>' + esc(r.patientName || '?') + '</strong>'
        + (r.patientAge && r.patientAge !== 'N/A' ? ' · ' + esc(r.patientAge) : '')
        + (r.patientGender && r.patientGender !== 'N/A' ? ' · ' + esc(r.patientGender) : '')
        + (r.patientId ? ' · ' + T('discmod_label_patient_id') + ' ' + esc(r.patientId) : '')
        + ' &nbsp;&middot;&nbsp; ' + (r.opdIpdNo ? esc(r.opdIpdNo) : '')
        + ' &nbsp;&middot;&nbsp; ' + APP.formatDate(r.createdAt)
        + '</div>'
        + (r.department ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + T('discmod_label_dept') + ' ' + esc(r.department) + (r.serviceName ? ' · ' + esc(r.serviceName) : '') + '</div>' : '')
        + '</div>'
        + '<span class="badge ' + _discStatusBadge(r.status) + '" style="font-size:12px;">' + esc(_discStatusLabel(r.status)) + '</span>'
        + '</div>'

        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">'
        + '<div style="flex:1;min-width:160px;background:var(--light-gray);border-radius:6px;padding:8px;font-size:12px;">'
        + '<div style="color:var(--gray);font-size:10px;text-transform:uppercase;">' + T('discmod_label_total_bill') + '</div>'
        + '<div style="font-size:15px;font-weight:700;">' + _discINR(r.totalBillAmount) + '</div>'
        + '</div>'
        + '<div style="flex:1;min-width:160px;background:var(--light-gray);border-radius:6px;padding:8px;font-size:12px;">'
        + '<div style="color:var(--gray);font-size:10px;text-transform:uppercase;">' + T('discmod_label_requested_discount') + '</div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--danger);">' + esc(discTypeLabel) + ' (' + _discINR(r.calculatedDiscountAmount) + ')</div>'
        + '</div>'
        + '<div style="flex:1;min-width:160px;background:var(--light-gray);border-radius:6px;padding:8px;font-size:12px;">'
        + '<div style="color:var(--gray);font-size:10px;text-transform:uppercase;">' + T('discmod_label_final_payable') + '</div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--success);">' + _discINR(r.finalPayableAmount) + '</div>'
        + '</div>'
        + '</div>'

        + '<div style="font-size:12px;background:var(--light-gray);border-radius:6px;padding:8px;margin-bottom:10px;">'
        + '<strong>' + T('discmod_label_requested_by') + '</strong> ' + esc(r.requestedByName || r.requestedBy || '-')
        + (r.requestedByRole ? ' (' + esc(_discRoleLabel(String(r.requestedByRole).toUpperCase())) + ')' : '')
        + '<br><strong>' + T('discmod_label_authority_required') + '</strong> ' + esc(_discRoleLabel(r.requiredAuthorityRole || 'BILLING_MANAGER'))
        + (r.requiredAuthorityRole ? ' <span style="color:var(--gray);">(' + esc(_discRoleTier(r.requiredAuthorityRole)) + ')</span>' : '')
        + (r.reasonCategory ? '<br><strong>' + T('discmod_label_reason_category') + '</strong> ' + esc(r.reasonCategory) : '')
        + (r.detailedReason ? '<br><strong>' + T('discmod_label_detailed_reason') + '</strong> ' + esc(r.detailedReason) : '')
        + (r.doctorName ? '<br><strong>' + T('discmod_label_doctor') + '</strong> ' + esc(r.doctorName) : '')
        + (r.proofFileName ? '<br><strong>' + T('discmod_label_proof') + '</strong> ' + esc(r.proofFileName) : '')
        + '</div>'

        + _discTimeline(r)

        + (r.approverComments && r.status === 'REJECTED' ? '<div style="background:#ffebee;border-radius:6px;padding:8px;font-size:12px;margin-bottom:8px;"><strong style="color:var(--danger);">' + T('discmod_label_rejection_note') + '</strong> ' + esc(r.approverComments) + '</div>' : '')
        + (r.approverComments && r.status === 'APPROVED' ? '<div style="background:#e8f5e9;border-radius:6px;padding:8px;font-size:12px;margin-bottom:8px;"><strong>' + T('discmod_label_approval_note') + '</strong> ' + esc(r.approverComments) + (r.approvedBy ? ' — ' + esc(r.approvedBy) : '') + '</div>' : '')

        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'
        + (canAct
            ? '<button class="btn btn-sm btn-success" onclick="discApprove(\'' + r.id + '\')">&#10003; ' + T('discmod_btn_approve') + '</button>'
            + '<button class="btn btn-sm btn-danger" onclick="discReject(\'' + r.id + '\')">&#10007; ' + T('discmod_btn_reject') + '</button>'
            : '')
        + (canAct && r.status === 'PENDING_BMGR' ? '<button class="btn btn-sm btn-outline" onclick="showDiscEscalateForm(\'' + r.id + '\')">' + T('discmod_btn_escalate') + '</button>' : '')
        + (canDelete ? '<button class="btn btn-sm btn-outline" onclick="deleteDiscReq(\'' + r.id + '\')">' + T('discmod_btn_delete') + '</button>' : '')
        + '</div></div>';

    return html;
}

function _discTimeline(r) {
    var chain = r.approvalChain || [];
    if (!chain.length) return '';
    var html = '<div style="margin:8px 0 4px;">';
    for (var i = 0; i < chain.length; i++) {
        var c = chain[i];
        var color = c.action === 'REJECTED' ? '#c62828' : c.action === 'APPROVED' ? '#2e7d32' : c.action === 'ESCALATED' ? '#ef6c00' : '#1565c0';
        html += '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">'
            + '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';flex-shrink:0;margin-top:3px;"></div>'
            + '<div style="font-size:11px;line-height:1.4;">'
            + '<div style="font-weight:700;color:' + color + ';">' + esc(c.title || c.action || '') + ' <span style="color:var(--gray);font-weight:400;">· ' + esc(c.actor || '') + '</span></div>'
            + (c.comments ? '<div style="color:var(--gray);">' + esc(c.comments) + '</div>' : '')
            + '<div style="color:var(--gray);font-size:10px;">' + APP.formatDate(c.timestamp) + '</div>'
            + '</div></div>';
    }
    return html + '</div>';
}

/* ── New Discount Request modal ── */
function showDiscForm() {
    var user = AUTH.currentUser();
    var isExec = _discIsExec(_discUserRole(user)) || _discIsAdmin(user);

    var depts = DB.get('departments') || [];
    var deptOpts = '';
    for (var i = 0; i < depts.length; i++) {
        var d = depts[i];
        if (!d || d.active === false) continue;
        deptOpts += '<option value="' + String(d.name).replace(/"/g, '&quot;') + '"' + (user.department === d.name ? ' selected' : '') + '>' + esc(d.name) + '</option>';
    }
    var deptField = deptOpts
        ? '<select name="department" class="form-control">' + deptOpts + '</select>'
        : '<input type="text" name="department" class="form-control" value="' + String(user.department || '').replace(/"/g, '&quot;') + '">';

    var html = '<form id="discForm">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        + '<div class="form-group"><label>' + T('discmod_label_patient_name') + ' *</label><input type="text" name="patientName" class="form-control" required></div>'
        + '<div class="form-group"><label>' + T('discmod_label_patient_id') + '</label><input type="text" name="patientId" class="form-control" placeholder="PAT-…"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_patient_age') + '</label><input type="number" name="patientAge" class="form-control" min="0"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_patient_gender') + '</label><select name="patientGender" class="form-control"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>'
        + '<div class="form-group"><label>' + T('discmod_label_department') + '</label>' + deptField + '</div>'
        + '<div class="form-group"><label>' + T('discmod_label_service') + '</label><input type="text" name="serviceName" class="form-control" placeholder="' + T('discmod_placeholder_consultation') + '"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_doctor') + '</label><input type="text" name="doctorName" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_particulars') + '</label><input type="text" name="particulars" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_reference_name') + '</label><input type="text" name="referenceName" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_relative_name') + '</label><input type="text" name="relativeName" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_receipt_no') + '</label><input type="text" name="receiptNo" class="form-control" placeholder="RCP-…"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_bill_date') + '</label><input type="date" name="billDate" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_opd_ipd_no') + '</label><input type="text" name="opdIpdNo" class="form-control" placeholder="OPD-…"></div>'
        + '</div>'
        + '<div class="form-group"><label>' + T('discmod_label_total_bill') + ' *</label><input type="number" name="totalBillAmount" class="form-control" min="0" step="0.01" required></div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        + '<div class="form-group"><label>' + T('discmod_label_discount_type') + '</label><select name="requestedDiscountType" class="form-control"><option value="PERCENTAGE">' + T('discmod_type_percent') + '</option><option value="FIXED">' + T('discmod_type_fixed_amount') + '</option></select></div>'
        + '<div class="form-group"><label>' + T('discmod_label_discount_value') + ' *</label><input type="number" name="requestedDiscountVal" class="form-control" min="0" step="0.01" required></div>'
        + '</div>'
        + '<div class="form-group"><label>' + T('discmod_label_reason_category') + '</label><select name="reasonCategory" class="form-control">'
        + '<option value="Below Poverty Line / Emergency Charity">' + T('discmod_reason_bpl') + '</option>'
        + '<option value="Staff / Relative Welfare">' + T('discmod_reason_staff_welfare') + '</option>'
        + '<option value="Management Special Grant">' + T('discmod_reason_mgmt_grant') + '</option>'
        + '<option value="Package Adjustment / Routine">' + T('discmod_reason_package') + '</option>'
        + '<option value="Disputed Billing Correction">' + T('discmod_reason_disputed') + '</option>'
        + '</select></div>'
        + '<div class="form-group"><label>' + T('discmod_label_detailed_reason') + ' *</label><textarea name="detailedReason" class="form-control" rows="2" required></textarea></div>'
        + '<div class="form-group"><label>' + T('discmod_label_proof') + '</label><input type="text" name="proofFileName" class="form-control" placeholder="e.g. BPL_Verification_Card.pdf"></div>'
        + (isExec
            ? '<div class="form-group"><label>' + T('discmod_label_target_role') + '</label><select name="targetApprovalRole" class="form-control"><option value="">' + T('discmod_target_auto') + '</option><option value="BILLING_MANAGER">' + T('discmod_role_billing_manager') + '</option><option value="CHIEF_ACCOUNTANT">' + T('discmod_role_chief_accountant') + '</option><option value="CFO">' + T('discmod_role_cfo') + '</option><option value="MD">' + T('discmod_role_md') + '</option><option value="EXECUTIVE">' + T('discmod_role_executive') + '</option></select></div>'
            : '')
        + '</form>';

    openFormModal(T('discmod_modal_new_request'), html, 'saveDiscReq()', true);
    var f = document.getElementById('discForm');
    if (f) f.addEventListener('submit', function(e) { e.preventDefault(); saveDiscReq(); });
}

function saveDiscReq() {
    var form = document.getElementById('discForm');
    if (!form) return false;
    var d = getFormData('discForm');

    var totalBill = _discNum(d.totalBillAmount);
    var discVal = _discNum(d.requestedDiscountVal);
    if (totalBill <= 0) { APP.notify(T('discmod_msg_enter_bill'), 'error'); return false; }
    if (discVal <= 0) { APP.notify(T('discmod_msg_enter_discount'), 'error'); return false; }
    if (d.requestedDiscountType === 'PERCENTAGE' && discVal > 100) { APP.notify(T('discmod_msg_pct_max100'), 'error'); return false; }
    if (!d.patientName || !d.patientName.trim()) { APP.notify(T('discmod_msg_enter_patient'), 'error'); return false; }
    if (!d.detailedReason || !d.detailedReason.trim()) { APP.notify(T('discmod_msg_enter_reason'), 'error'); return false; }

    var user = AUTH.currentUser();
    if (!user) return false;

    var calcDisc;
    if (d.requestedDiscountType === 'FIXED') {
        calcDisc = Math.min(discVal, totalBill);
        discVal = totalBill > 0 ? Number(((calcDisc / totalBill) * 100).toFixed(1)) : 0;
    } else {
        calcDisc = Number(((totalBill * discVal) / 100).toFixed(2));
    }
    var finalPayable = Math.max(0, Number((totalBill - calcDisc).toFixed(2)));
    var authInfo = _discRequiredAuthority(discVal, calcDisc, d.targetApprovalRole || '');
    var nowIso = new Date().toISOString();
    var status = _discInitialStatus(authInfo.role);

    var req = {
        id: 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        requestCode: 'DISC-' + Math.floor(1000 + Math.random() * 9000),
        patientId: d.patientId || '',
        patientName: d.patientName,
        patientAge: d.patientAge || 'N/A',
        patientGender: d.patientGender || 'N/A',
        department: d.department || '',
        serviceName: d.serviceName || 'Consultation Fees',
        doctorName: d.doctorName || '',
        particulars: d.particulars || 'Standard Billing Item Particulars',
        referenceName: d.referenceName || d.doctorName || 'N/A',
        relativeName: d.relativeName || 'N/A',
        receiptNo: d.receiptNo || 'RCP-' + Math.floor(10000 + Math.random() * 90000),
        billDate: d.billDate || nowIso.split('T')[0],
        opdIpdNo: d.opdIpdNo || 'OPD-' + Math.floor(1000 + Math.random() * 9000),
        totalBillAmount: totalBill,
        requestedDiscountType: d.requestedDiscountType || 'PERCENTAGE',
        requestedDiscountVal: discVal,
        calculatedDiscountAmount: Number(calcDisc.toFixed(2)),
        finalPayableAmount: finalPayable,
        reasonCategory: d.reasonCategory || 'Package Adjustment / Routine',
        detailedReason: d.detailedReason,
        proofFileName: d.proofFileName || 'Supporting_Document.pdf',
        requestedBy: user.username,
        requestedByName: _discFullName(user) || user.username,
        requestedByRole: user.role,
        requiredAuthorityRole: authInfo.role,
        currentApproverRole: status === 'PENDING_CA' ? 'CHIEF_ACCOUNTANT' : authInfo.role,
        status: status,
        isDirectExecutiveGrant: false,
        approverComments: '',
        approvedBy: '',
        approvalTimestamp: null,
        createdAt: nowIso,
        approvalChain: [{
            step: 1,
            title: T('discmod_chain_submitted'),
            actor: _discFullName(user) + (user.designation ? ' (' + user.designation + ')' : ''),
            actorUsername: user.username,
            role: user.role,
            action: 'SUBMITTED',
            comments: T('discmod_chain_submit_comment') + ' ' + discVal.toFixed(1) + '% (' + _discINR(calcDisc) + ')',
            timestamp: nowIso
        }]
    };

    var list = DB.get('discountRequests') || [];
    list.unshift(req);
    DB.set('discountRequests', list);

    _discNotify('Discount ' + req.requestCode + ' — ' + req.patientName,
        T('discmod_notify_new_body') + ' ' + _discRoleLabel(authInfo.role));
    APP.notify(T('discmod_msg_created_prefix') + ' ' + req.requestCode + ' → ' + _discRoleLabel(authInfo.role), 'success');
    renderDiscList();
    return true;
}

/* ── Approve / Reject / Escalate ── */
function discApprove(id) {
    var r = DB.getById('discountRequests', id);
    var user = AUTH.currentUser();
    if (!r || !_discCanAct(r, user)) return;
    var comment = prompt(T('discmod_prompt_approve_comment'));
    if (comment === null) return;
    var nowIso = new Date().toISOString();
    var chain = (r.approvalChain || []).slice();
    chain.push({
        step: chain.length + 1,
        title: T('discmod_chain_approved'),
        actor: _discFullName(user) + (user.designation ? ' (' + user.designation + ')' : ''),
        actorUsername: user.username,
        role: user.role,
        action: 'APPROVED',
        comments: comment || T('discmod_chain_approved_default'),
        timestamp: nowIso
    });
    DB.update('discountRequests', id, {
        status: 'APPROVED',
        approverComments: comment || T('discmod_chain_approved_default'),
        approvedBy: _discFullName(user) || user.username,
        approvalTimestamp: nowIso,
        approvalChain: chain
    });
    _discNotify('Discount ' + r.requestCode + ' APPROVED',
        r.patientName + ': ' + _discINR(r.calculatedDiscountAmount) + ' approved by ' + (_discFullName(user) || user.username));
    APP.notify(T('discmod_msg_approved_prefix') + ' ' + r.requestCode, 'success');
    renderDiscList();
}

function discReject(id) {
    var r = DB.getById('discountRequests', id);
    var user = AUTH.currentUser();
    if (!r || !_discCanAct(r, user)) return;
    var reason = prompt(T('discmod_prompt_reject_reason'));
    if (reason === null) return;
    reason = (reason && reason.trim()) ? reason.trim() : T('discmod_reject_default');
    var nowIso = new Date().toISOString();
    var chain = (r.approvalChain || []).slice();
    chain.push({
        step: chain.length + 1,
        title: T('discmod_chain_rejected'),
        actor: _discFullName(user) + (user.designation ? ' (' + user.designation + ')' : ''),
        actorUsername: user.username,
        role: user.role,
        action: 'REJECTED',
        comments: reason,
        timestamp: nowIso
    });
    DB.update('discountRequests', id, {
        status: 'REJECTED',
        approverComments: reason,
        approvedBy: _discFullName(user) || user.username,
        approvalTimestamp: nowIso,
        approvalChain: chain
    });
    _discNotify('Discount ' + r.requestCode + ' REJECTED',
        r.patientName + ': ' + T('discmod_notify_rejected_body') + ' ' + (_discFullName(user) || user.username));
    APP.notify(T('discmod_msg_rejected_prefix') + ' ' + r.requestCode, 'warning');
    renderDiscList();
}

function showDiscEscalateForm(id) {
    var r = DB.getById('discountRequests', id);
    if (!r) return;
    var html = '<div style="font-size:13px;margin-bottom:10px;">' + T('discmod_escalate_hint') + ' <strong>' + esc(r.requestCode) + '</strong></div>'
        + '<div class="form-group"><label>' + T('discmod_label_target_role') + '</label>'
        + '<select id="discEscalateRole" class="form-control">'
        + '<option value="CHIEF_ACCOUNTANT">' + T('discmod_role_chief_accountant') + '</option>'
        + '<option value="CFO">' + T('discmod_role_cfo') + '</option>'
        + '<option value="EXECUTIVE">' + T('discmod_role_executive') + '</option>'
        + '</select></div>'
        + '<div class="form-group"><label>' + T('discmod_label_comments') + '</label><textarea id="discEscalateComments" class="form-control" rows="2"></textarea></div>';
    openFormModal(T('discmod_modal_escalate'), html, 'discEscalate(\'' + r.id + '\')');
}

function discEscalate(id) {
    var r = DB.getById('discountRequests', id);
    var user = AUTH.currentUser();
    if (!r || !_discCanAct(r, user)) return false;
    var targetRole = document.getElementById('discEscalateRole') ? document.getElementById('discEscalateRole').value : 'CFO';
    var commentsEl = document.getElementById('discEscalateComments');
    var comments = commentsEl ? commentsEl.value : '';

    var nowIso = new Date().toISOString();
    var newStatus = 'PENDING_EXECUTIVE';
    var targetUserRole = 'EXECUTIVE';
    if (targetRole === 'CHIEF_ACCOUNTANT') { newStatus = 'PENDING_CA'; targetUserRole = 'CHIEF_ACCOUNTANT'; }
    else if (targetRole === 'CFO') { newStatus = 'PENDING_CFO'; targetUserRole = 'CFO'; }

    var chain = (r.approvalChain || []).slice();
    chain.push({
        step: chain.length + 1,
        title: T('discmod_chain_escalated') + ' ' + _discRoleLabel(targetUserRole),
        actor: _discFullName(user) + (user.designation ? ' (' + user.designation + ')' : ''),
        actorUsername: user.username,
        role: user.role,
        action: 'ESCALATED',
        comments: comments || T('discmod_escalate_default') + ' ' + _discRoleLabel(targetUserRole) + '.',
        timestamp: nowIso
    });

    DB.update('discountRequests', id, {
        status: newStatus,
        currentApproverRole: targetUserRole,
        approvalChain: chain
    });
    _discNotify('Discount ' + r.requestCode + ' escalated',
        r.patientName + ': ' + T('discmod_notify_escalated_body') + ' ' + _discRoleLabel(targetUserRole));
    APP.notify(T('discmod_msg_escalated_prefix') + ' ' + r.requestCode + ' → ' + _discRoleLabel(targetUserRole), 'info');
    renderDiscList();
    return true;
}

function deleteDiscReq(id) {
    confirmAction(T('discmod_confirm_delete'), function() {
        DB.delete('discountRequests', id);
        renderDiscList();
    });
}

/* ── Direct Executive Grant ── */
function showDiscDirectGrant() {
    var html = '<form id="discGrantForm">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        + '<div class="form-group"><label>' + T('discmod_label_patient_name') + ' *</label><input type="text" name="patientName" class="form-control" required></div>'
        + '<div class="form-group"><label>' + T('discmod_label_patient_id') + '</label><input type="text" name="patientId" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_doctor') + '</label><input type="text" name="doctorName" class="form-control"></div>'
        + '<div class="form-group"><label>' + T('discmod_label_total_bill') + ' *</label><input type="number" name="totalBillAmount" class="form-control" min="0" step="0.01" required></div>'
        + '<div class="form-group"><label>' + T('discmod_label_discount_type') + '</label><select name="requestedDiscountType" class="form-control"><option value="PERCENTAGE">' + T('discmod_type_percent') + '</option><option value="FIXED">' + T('discmod_type_fixed_amount') + '</option></select></div>'
        + '<div class="form-group"><label>' + T('discmod_label_discount_value') + ' *</label><input type="number" name="requestedDiscountVal" class="form-control" min="0" step="0.01" required></div>'
        + '<div class="form-group"><label>' + T('discmod_label_reason_category') + '</label><select name="reasonCategory" class="form-control">'
        + '<option value="Management Special Grant">' + T('discmod_reason_mgmt_grant') + '</option>'
        + '<option value="Below Poverty Line / Emergency Charity">' + T('discmod_reason_bpl') + '</option>'
        + '<option value="Staff / Relative Welfare">' + T('discmod_reason_staff_welfare') + '</option>'
        + '<option value="Package Adjustment / Routine">' + T('discmod_reason_package') + '</option>'
        + '<option value="Disputed Billing Correction">' + T('discmod_reason_disputed') + '</option>'
        + '</select></div>'
        + '</div>'
        + '<div class="form-group"><label>' + T('discmod_label_detailed_reason') + ' *</label><textarea name="detailedReason" class="form-control" rows="2" required></textarea></div>'
        + '</form>';
    openFormModal(T('discmod_modal_direct_grant'), html, 'saveDiscDirectGrant()', true);
    var f = document.getElementById('discGrantForm');
    if (f) f.addEventListener('submit', function(e) { e.preventDefault(); saveDiscDirectGrant(); });
}

function saveDiscDirectGrant() {
    var form = document.getElementById('discGrantForm');
    if (!form) return false;
    var d = getFormData('discGrantForm');
    var totalBill = _discNum(d.totalBillAmount);
    var discVal = _discNum(d.requestedDiscountVal);
    if (totalBill <= 0) { APP.notify(T('discmod_msg_enter_bill'), 'error'); return false; }
    if (discVal <= 0) { APP.notify(T('discmod_msg_enter_discount'), 'error'); return false; }
    if (!d.patientName || !d.patientName.trim()) { APP.notify(T('discmod_msg_enter_patient'), 'error'); return false; }
    if (!d.detailedReason || !d.detailedReason.trim()) { APP.notify(T('discmod_msg_enter_reason'), 'error'); return false; }

    var user = AUTH.currentUser();
    if (!user) return false;

    var calcDisc;
    if (d.requestedDiscountType === 'FIXED') {
        calcDisc = Math.min(discVal, totalBill);
        discVal = totalBill > 0 ? Number(((calcDisc / totalBill) * 100).toFixed(1)) : 0;
    } else {
        calcDisc = Number(((totalBill * discVal) / 100).toFixed(2));
    }
    var finalPayable = Math.max(0, Number((totalBill - calcDisc).toFixed(2)));
    var nowIso = new Date().toISOString();

    var req = {
        id: 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        requestCode: 'DISC-EXEC-' + Math.floor(1000 + Math.random() * 9000),
        patientId: d.patientId || '',
        patientName: d.patientName,
        patientAge: 'N/A',
        patientGender: 'N/A',
        department: user.department || '',
        serviceName: 'Consultation Fees',
        doctorName: d.doctorName || '',
        particulars: 'Standard Billing Item Particulars',
        referenceName: d.doctorName || 'N/A',
        relativeName: 'N/A',
        receiptNo: 'RCP-' + Math.floor(10000 + Math.random() * 90000),
        billDate: nowIso.split('T')[0],
        opdIpdNo: 'OPD-' + Math.floor(1000 + Math.random() * 9000),
        totalBillAmount: totalBill,
        requestedDiscountType: d.requestedDiscountType || 'PERCENTAGE',
        requestedDiscountVal: discVal,
        calculatedDiscountAmount: Number(calcDisc.toFixed(2)),
        finalPayableAmount: finalPayable,
        reasonCategory: d.reasonCategory || 'Management Special Grant',
        detailedReason: d.detailedReason,
        proofFileName: 'Executive_Order.pdf',
        requestedBy: user.username,
        requestedByName: _discFullName(user) || user.username,
        requestedByRole: user.role,
        requiredAuthorityRole: 'EXECUTIVE',
        currentApproverRole: 'EXECUTIVE',
        status: 'APPROVED',
        isDirectExecutiveGrant: true,
        approverComments: T('discmod_chain_approved_default'),
        approvedBy: _discFullName(user) || user.username,
        approvalTimestamp: nowIso,
        createdAt: nowIso,
        approvalChain: [
            { step: 1, title: T('discmod_chain_submitted'), actor: _discFullName(user) + (user.designation ? ' (' + user.designation + ')' : ''), actorUsername: user.username, role: user.role, action: 'SUBMITTED', comments: T('discmod_chain_submit_comment') + ' ' + discVal.toFixed(1) + '% (' + _discINR(calcDisc) + ')', timestamp: nowIso },
            { step: 2, title: T('discmod_chain_approved'), actor: _discFullName(user) + (user.designation ? ' (' + user.designation + ')' : ''), actorUsername: user.username, role: user.role, action: 'APPROVED', comments: T('discmod_chain_approved_default'), timestamp: nowIso }
        ]
    };

    var list = DB.get('discountRequests') || [];
    list.unshift(req);
    DB.set('discountRequests', list);

    _discNotify('Direct Executive Grant ' + req.requestCode,
        req.patientName + ': ' + _discINR(calcDisc) + ' discount granted by ' + (_discFullName(user) || user.username));
    APP.notify(T('discmod_msg_granted_prefix') + ' ' + req.requestCode, 'success');
    renderDiscList();
    return true;
}
