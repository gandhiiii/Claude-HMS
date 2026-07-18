// Material Requests — 5-Stage Approval Workflow
// Stage 1: pending       → Dept HOD approval
// Stage 2: hod_approved  → Facility HOD approval
// Stage 3: facility_approved → Storekeeper fulfillment
// Stage 4: store_fulfilled  → Creator confirmation
// Stage 5: confirmed / partial → Closed

var _matStatusMap = {
    'pending':            { label: 'Pending HOD',       badge: 'badge-warning' },
    'hod_approved':       { label: 'HOD Approved',      badge: 'badge-info' },
    'hod_rejected':       { label: 'HOD Rejected',      badge: 'badge-danger' },
    'facility_approved':  { label: 'Facility Approved', badge: 'badge-info' },
    'facility_rejected':  { label: 'Facility Rejected', badge: 'badge-danger' },
    'store_fulfilled':    { label: 'Ready to Collect',  badge: 'badge-success' },
    'confirmed':          { label: 'Confirmed',         badge: 'badge-success' },
    'partial':            { label: 'Partial',           badge: 'badge-warning' },
    'approved':           { label: 'Approved',          badge: 'badge-success' },   // backward compat
    'rejected':           { label: 'Rejected',          badge: 'badge-danger' }     // backward compat
};

function _matStatusInfo(r) {
    return _matStatusMap[r.status] || { label: r.status || 'pending', badge: 'badge-warning' };
}

function _matProcurementDept() {
    var depts = DB.get('departments') || [];
    var fac = null;
    for (var i = 0; i < depts.length; i++) {
        if (depts[i].active === false) continue;
        if (depts[i].isProcurement || depts[i].name.toLowerCase() === 'facility') { fac = depts[i]; break; }
    }
    return fac ? fac.name : 'Facility';
}

function renderMaterialRequests(container) {
    var user = AUTH.currentUser();
    var isStorekeeper = user && user.role === 'storekeeper';
    var procDept = _matProcurementDept();

    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box"><input type="text" class="form-control" id="matSearch" placeholder="Search requests..." oninput="renderMatList()"></div>'
        + '<div style="display:flex;gap:6px;align-items:center;">'
        + '<span id="matCount" style="font-size:13px;color:var(--gray);">0 requests</span>'
        + (!isStorekeeper ? '<button class="btn btn-primary" onclick="showMatForm()">+ New Request</button>' : '')
        + '</div></div>'
        + '<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-bottom:14px;background:var(--light-gray);border-radius:8px;padding:10px 14px;font-size:11px;">'
        + '<span style="font-weight:700;margin-right:6px;font-size:12px;">Approval Flow:</span>'
        + '<span class="badge badge-warning">1 Submit</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-info">2 Dept HOD</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-info">3 ' + procDept + ' HOD</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-success">4 Storekeeper</span>'
        + '<span style="color:var(--gray);margin:0 3px;">→</span>'
        + '<span class="badge badge-success">5 Confirm</span>'
        + '</div>'
        + '<div id="matView"></div>';

    renderMatList();
}

function renderMatList() {
    try {
        var user = AUTH.currentUser();
        if (!user) return;
        var isAdmin = user.isSuperAdmin || user.role === 'admin';
        var isStorekeeper = user.role === 'storekeeper';
        var procDept = _matProcurementDept();
        var isFacilityHod = user.role === 'hod' && user.department === procDept;
        var isRegularHod = user.role === 'hod' && !isFacilityHod;

        var all = DB.get('material_requests') || [];
        var search = (document.getElementById('matSearch') ? document.getElementById('matSearch').value : '').toLowerCase();

        var requests = all.filter(function(r) {
            if (!r) return false;
            if (isAdmin) return true;
            if (isStorekeeper) return r.status === 'facility_approved';
            if (isFacilityHod) {
                // Facility HOD sees: requests needing their approval + their own dept's requests
                return r.status === 'hod_approved' || r.department === user.department;
            }
            if (isRegularHod) return r.department === user.department;
            return r.createdBy === user.username;
        });

        if (search) {
            requests = requests.filter(function(r) {
                return (r.title || '').toLowerCase().indexOf(search) >= 0
                    || (r.reason || '').toLowerCase().indexOf(search) >= 0
                    || (r.department || '').toLowerCase().indexOf(search) >= 0
                    || (r.createdByName || '').toLowerCase().indexOf(search) >= 0;
            });
        }

        var countEl = document.getElementById('matCount');
        if (countEl) countEl.textContent = requests.length + ' request' + (requests.length !== 1 ? 's' : '');

        var viewEl = document.getElementById('matView');
        if (!viewEl) return;

        if (!requests.length) {
            viewEl.innerHTML = '<div class="card"><div class="empty-state">No requests found</div></div>';
            return;
        }

        var html = '';
        var sorted = requests.slice().reverse();
        for (var i = 0; i < sorted.length; i++) {
            var r = sorted[i];
            var st = _matStatusInfo(r);
            var items = r.items || [];
            var itemStr = items.map(function(it) {
                return it.name + ' &times;' + it.qty + (it.unit ? ' ' + it.unit : '');
            }).join(', ');

            var canHodApprove = isRegularHod && r.status === 'pending' && r.department === user.department;
            var canFacHodApprovePending = isFacilityHod && r.status === 'pending' && r.department === user.department;
            var canFacApprove = isFacilityHod && r.status === 'hod_approved';
            var canStoreFulfill = isStorekeeper && r.status === 'facility_approved';
            var canConfirm = r.createdBy === user.username && r.status === 'store_fulfilled';
            var canDelete = r.createdBy === user.username && r.status === 'pending';
            var canAdminOverride = isAdmin && (r.status === 'pending' || r.status === 'hod_approved');

            html += '<div class="card" style="padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
                + '<div>'
                + '<div style="font-size:14px;font-weight:700;">' + (r.title || 'Request') + '</div>'
                + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">'
                + 'From: <strong>' + (r.createdByName || r.createdBy || '?') + '</strong>'
                + ' &nbsp;&middot;&nbsp; Dept: <strong>' + (r.department || '-') + '</strong>'
                + ' &nbsp;&middot;&nbsp; ' + APP.formatDate(r.createdAt)
                + '</div></div>'
                + '<span class="badge ' + st.badge + '" style="font-size:12px;">' + st.label + '</span>'
                + '</div>'

                + '<div style="font-size:12px;background:var(--light-gray);border-radius:6px;padding:8px;margin-bottom:10px;">'
                + '<strong>Items:</strong> ' + (itemStr || '—')
                + (r.reason ? '<br><strong>Reason:</strong> ' + r.reason : '')
                + '</div>'

                + _matTimeline(r, procDept)

                + (r.hodRejectionNote || r.facilityRejectionNote ? '<div style="background:#ffebee;border-radius:6px;padding:8px;font-size:12px;margin-bottom:8px;">'
                    + '<strong style="color:var(--danger);">Rejection Note:</strong> ' + (r.hodRejectionNote || r.facilityRejectionNote || '')
                    + '</div>' : '')

                + (r.confirmationNote ? '<div style="background:#e8f5e9;border-radius:6px;padding:8px;font-size:12px;margin-bottom:8px;">'
                    + '<strong>Confirmation Note:</strong> ' + r.confirmationNote
                    + '</div>' : '')

                + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'
                + (canHodApprove
                    ? '<button class="btn btn-sm btn-success" onclick="hodApproveMatReq(\'' + r.id + '\')">&#10003; Approve</button>'
                    + '<button class="btn btn-sm btn-danger" onclick="hodRejectMatReq(\'' + r.id + '\')">&#10007; Reject</button>'
                    : '')
                + (canFacHodApprovePending
                    ? '<button class="btn btn-sm btn-success" onclick="facilityApproveOwnDept(\'' + r.id + '\')">&#10003; Approve (skip to Storekeeper)</button>'
                    + '<button class="btn btn-sm btn-danger" onclick="hodRejectMatReq(\'' + r.id + '\')">&#10007; Reject</button>'
                    : '')
                + (canFacApprove
                    ? '<button class="btn btn-sm btn-success" onclick="facilityApproveMatReq(\'' + r.id + '\')">&#10003; Facility Approve</button>'
                    + '<button class="btn btn-sm btn-danger" onclick="facilityRejectMatReq(\'' + r.id + '\')">&#10007; Reject</button>'
                    : '')
                + (canStoreFulfill
                    ? '<button class="btn btn-sm btn-success" onclick="storeFulfillMatReq(\'' + r.id + '\')">&#128230; Mark Fulfilled</button>'
                    : '')
                + (canConfirm
                    ? '<button class="btn btn-sm btn-success" onclick="confirmMatReq(\'' + r.id + '\',false)">&#10003; Confirm Full Receipt</button>'
                    + '<button class="btn btn-sm btn-warning" onclick="confirmMatReq(\'' + r.id + '\',true)">Partial Receipt</button>'
                    : '')
                + (canDelete
                    ? '<button class="btn btn-sm btn-danger" onclick="deleteMatReq(\'' + r.id + '\')">Delete</button>'
                    : '')
                + (canAdminOverride
                    ? '<button class="btn btn-sm btn-outline" onclick="adminPushMatReq(\'' + r.id + '\')" title="Admin: push through all pending stages">&#9889; Push to Storekeeper</button>'
                    : '')
                + '</div></div>';
        }

        viewEl.innerHTML = html;
    } catch (e) {
        console.warn('renderMatList error:', e);
    }
}

function _matTimeline(r, procDept) {
    var steps = [
        { label: 'Submitted',             done: true,   rejected: false, by: r.createdByName,          at: r.createdAt },
        { label: 'Dept HOD',              done: ['hod_approved','facility_approved','store_fulfilled','confirmed','partial','approved'].indexOf(r.status) >= 0,
                                          rejected: r.status === 'hod_rejected',
                                          by: r.hodApprovedByName,                                      at: r.hodApprovedAt },
        { label: (procDept || 'Facility') + ' HOD',
                                          done: ['facility_approved','store_fulfilled','confirmed','partial'].indexOf(r.status) >= 0,
                                          rejected: r.status === 'facility_rejected',
                                          by: r.facilityApprovedByName,                                 at: r.facilityApprovedAt },
        { label: 'Storekeeper',           done: ['store_fulfilled','confirmed','partial'].indexOf(r.status) >= 0,
                                          rejected: false,
                                          by: r.fulfilledByName,                                        at: r.fulfilledAt },
        { label: 'Confirmed',             done: r.status === 'confirmed' || r.status === 'partial',
                                          rejected: false,
                                          by: r.confirmedByName,                                        at: r.confirmedAt }
    ];

    var html = '<div style="display:flex;align-items:flex-start;gap:2px;flex-wrap:wrap;margin:8px 0 4px;">';
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var color = s.rejected ? '#c62828' : s.done ? '#2e7d32' : '#9e9e9e';
        var icon = s.rejected ? '&times;' : s.done ? '&#10003;' : (i + 1).toString();
        html += '<div style="display:flex;align-items:center;gap:0;">'
            + '<div style="text-align:center;font-size:10px;min-width:52px;">'
            + '<div style="width:22px;height:22px;border-radius:50%;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:0 auto;">' + icon + '</div>'
            + '<div style="color:' + color + ';font-weight:' + (s.done || s.rejected ? '700' : '400') + ';margin-top:2px;line-height:1.2;">' + s.label + '</div>'
            + (s.done && s.by ? '<div style="color:var(--gray);font-size:9px;overflow:hidden;text-overflow:ellipsis;max-width:52px;white-space:nowrap;">' + (s.by || '') + '</div>' : '')
            + '</div>'
            + (i < steps.length - 1 ? '<div style="width:16px;height:2px;background:' + (s.done && !s.rejected ? '#2e7d32' : 'var(--border)') + ';margin:0 1px;margin-bottom:14px;flex-shrink:0;"></div>' : '')
            + '</div>';
    }
    return html + '</div>';
}

function showMatForm() {
    var user = AUTH.currentUser();
    var inventory = DB.get('inventory') || [];
    var itemOpts = '';
    for (var i = 0; i < inventory.length; i++) {
        var inv = inventory[i];
        itemOpts += '<option value="' + inv.name.replace(/"/g, '&quot;') + '" data-unit="' + (inv.unit || 'pcs') + '">' + inv.name + ' (' + (inv.quantity || 0) + ' ' + (inv.unit || 'pcs') + ')</option>';
    }

    var isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    var depts = DB.get('departments') || [];
    var deptField;
    if (isAdmin) {
        var deptOpts = '';
        for (var i = 0; i < depts.length; i++) {
            var d = depts[i];
            if (!d || d.active === false) continue;
            deptOpts += '<option value="' + d.name.replace(/"/g, '&quot;') + '">' + d.name + '</option>';
        }
        deptField = '<select name="department" class="form-control">' + deptOpts + '</select>';
    } else {
        deptField = '<input type="text" name="department" class="form-control" value="' + (user.department || '').replace(/"/g, '&quot;') + '" readonly style="background:var(--light-gray);">';
    }

    var html = '<form id="matForm">'
        + '<div class="form-group"><label>Request Title *</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Department</label>' + deptField + '</div>'
        + '<div class="form-group"><label>Reason / Justification</label><textarea name="reason" class="form-control" rows="2"></textarea></div>'
        + '<div class="form-group"><label>Items from Inventory</label>'
        + '<div id="matItemsContainer"><div class="mat-item-row" style="display:flex;gap:6px;margin-bottom:4px;">'
        + '<select class="form-control mat-item-select" style="flex:2;">' + itemOpts + '</select>'
        + '<input type="number" class="form-control mat-item-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control mat-item-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-success" onclick="addMatItemRow()">+</button>'
        + '</div></div></div>'
        + '<div class="form-group"><label>Custom Item (not in inventory)</label>'
        + '<div style="display:flex;gap:6px;">'
        + '<input type="text" id="matCustomName" class="form-control" placeholder="Item name" style="flex:2;">'
        + '<input type="number" id="matCustomQty" class="form-control" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<button type="button" class="btn btn-sm btn-primary" onclick="addMatCustomItem()">Add</button>'
        + '</div></div>'
        + '</form>';

    openFormModal('New Material Request', html, 'saveMatReq()', true);
    var f = document.getElementById('matForm');
    if (f) f.addEventListener('submit', function(e) { e.preventDefault(); saveMatReq(); });
}

var matCustomItems = [];

function addMatItemRow() {
    var inventory = DB.get('inventory') || [];
    var itemOpts = '';
    for (var i = 0; i < inventory.length; i++) {
        var inv = inventory[i];
        itemOpts += '<option value="' + inv.name.replace(/"/g, '&quot;') + '">' + inv.name + '</option>';
    }
    var container = document.getElementById('matItemsContainer');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'mat-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';
    row.innerHTML = '<select class="form-control mat-item-select" style="flex:2;">' + itemOpts + '</select>'
        + '<input type="number" class="form-control mat-item-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control mat-item-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
}

function addMatCustomItem() {
    var nameEl = document.getElementById('matCustomName');
    var qtyEl = document.getElementById('matCustomQty');
    var name = nameEl ? nameEl.value.trim() : '';
    var qty = parseInt(qtyEl ? qtyEl.value : '1') || 1;
    if (!name) { APP.notify('Enter item name', 'error'); return; }
    matCustomItems.push({ name: name, qty: qty, unit: 'pcs' });
    if (nameEl) nameEl.value = '';
    if (qtyEl) qtyEl.value = '1';
    APP.notify('Added: ' + name + ' \xd7' + qty, 'success');
}

function saveMatReq() {
    var form = document.getElementById('matForm');
    if (!form) return false;
    var title = (form.querySelector('[name="title"]') || {}).value;
    title = title ? title.trim() : '';
    var department = (form.querySelector('[name="department"]') || {}).value || '';
    var reason = (form.querySelector('[name="reason"]') || {}).value || '';
    if (!title) { APP.notify('Enter a request title', 'error'); return false; }

    var items = [];
    var rows = document.querySelectorAll('.mat-item-row');
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var name = (row.querySelector('.mat-item-select') || {}).value || '';
        var qty = parseInt((row.querySelector('.mat-item-qty') || {}).value) || 1;
        var unit = (row.querySelector('.mat-item-unit') || {}).value || 'pcs';
        if (name) items.push({ name: name, qty: qty, unit: unit });
    }
    for (var i = 0; i < matCustomItems.length; i++) {
        items.push(matCustomItems[i]);
    }
    if (!items.length) { APP.notify('Add at least one item', 'error'); return false; }

    var user = AUTH.currentUser();
    DB.add('material_requests', {
        title: title,
        department: department || (user ? user.department : '') || '',
        reason: reason,
        items: items,
        status: 'pending',
        createdBy: user ? user.username : '',
        createdByName: user ? user.fullName : ''
    });
    matCustomItems = [];
    APP.notify('Request submitted — waiting for HOD approval', 'success');
    renderMatList();
    return true;
}

function deleteMatReq(id) {
    confirmAction('Delete this request?', function() {
        DB.delete('material_requests', id);
        renderMatList();
    });
}

/* ── Stage 2: Dept HOD Approval ── */
function hodApproveMatReq(id) {
    var user = AUTH.currentUser();
    var now = new Date().toISOString();
    DB.update('material_requests', id, {
        status: 'hod_approved',
        hodApprovedBy: user.username,
        hodApprovedByName: user.fullName,
        hodApprovedAt: now
    });
    APP.notify('Approved — request sent to Facility HOD', 'success');
    renderMatList();
}

function hodRejectMatReq(id) {
    var note = prompt('Reason for rejection (optional):');
    if (note === null) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'hod_rejected',
        hodRejectedBy: user.username,
        hodRejectedByName: user.fullName,
        hodRejectedAt: new Date().toISOString(),
        hodRejectionNote: note || ''
    });
    APP.notify('Request rejected', 'info');
    renderMatList();
}

/* ── Facility HOD approving their own dept request (skip to facility_approved) ── */
function facilityApproveOwnDept(id) {
    var user = AUTH.currentUser();
    var now = new Date().toISOString();
    DB.update('material_requests', id, {
        status: 'facility_approved',
        hodApprovedBy: user.username,
        hodApprovedByName: user.fullName,
        hodApprovedAt: now,
        facilityApprovedBy: user.username,
        facilityApprovedByName: user.fullName,
        facilityApprovedAt: now
    });
    APP.notify('Approved — request sent to Storekeeper', 'success');
    renderMatList();
}

/* ── Stage 3: Facility HOD Approval ── */
function facilityApproveMatReq(id) {
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'facility_approved',
        facilityApprovedBy: user.username,
        facilityApprovedByName: user.fullName,
        facilityApprovedAt: new Date().toISOString()
    });
    APP.notify('Approved — request sent to Storekeeper', 'success');
    renderMatList();
}

function facilityRejectMatReq(id) {
    var note = prompt('Reason for rejection (optional):');
    if (note === null) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'facility_rejected',
        facilityRejectedBy: user.username,
        facilityRejectedByName: user.fullName,
        facilityRejectedAt: new Date().toISOString(),
        facilityRejectionNote: note || ''
    });
    APP.notify('Request rejected by Facility HOD', 'info');
    renderMatList();
}

/* ── Stage 4: Storekeeper Fulfillment ── */
function storeFulfillMatReq(id) {
    if (!confirm('Mark this request as fulfilled? The requester will be notified to confirm receipt.')) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'store_fulfilled',
        fulfilledBy: user.username,
        fulfilledByName: user.fullName,
        fulfilledAt: new Date().toISOString()
    });
    APP.notify('Marked as fulfilled — awaiting creator confirmation', 'success');
    renderMatList();
}

/* ── Stage 5: Creator Confirmation ── */
function confirmMatReq(id, partial) {
    var note = prompt(partial ? 'Describe what was partially received:' : 'Any notes about the receipt? (optional):');
    if (note === null) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: partial ? 'partial' : 'confirmed',
        confirmedBy: user.username,
        confirmedByName: user.fullName,
        confirmedAt: new Date().toISOString(),
        confirmationNote: note || ''
    });
    APP.notify(partial ? 'Marked as partially fulfilled' : 'Request confirmed and closed!', 'success');
    renderMatList();
}

/* ── Admin Override: push all pending stages ── */
function adminPushMatReq(id) {
    var user = AUTH.currentUser();
    var now = new Date().toISOString();
    DB.update('material_requests', id, {
        status: 'facility_approved',
        hodApprovedBy: user.username, hodApprovedByName: user.fullName, hodApprovedAt: now,
        facilityApprovedBy: user.username, facilityApprovedByName: user.fullName, facilityApprovedAt: now
    });
    APP.notify('All stages approved — request sent to Storekeeper', 'success');
    renderMatList();
}

// Backward compat aliases
function approveMatReq(id) { hodApproveMatReq(id); }
function rejectMatReq(id) { hodRejectMatReq(id); }
