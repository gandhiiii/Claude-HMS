// Problems — Department-routed issue tracking with assignment workflow
// Flow: open → assigned (HOD assigns to team member) → in_progress → resolved

function renderProblems(container) {
    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box"><input type="text" class="form-control" id="probSearch" placeholder="Search problems..." oninput="renderProbList()"></div>'
        + '<button class="btn btn-primary" onclick="showProbForm()">+ Report Problem</button>'
        + '</div>'
        + '<div class="tabs">'
        + '<button class="tab-btn active" onclick="switchProbTab(\'all\',this)">All</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'open\',this)">Open</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'assigned\',this)">Assigned</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'in_progress\',this)">In Progress</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'resolved\',this)">Resolved</button>'
        + '</div>'
        + '<div class="card"><div class="table-responsive"><table>'
        + '<thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Routed To</th><th>Reported By</th><th>Date</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>'
        + '<tbody id="probTableBody"></tbody></table></div></div>';
    renderProbList();
}

var probFilter = 'all';

function switchProbTab(filter, btn) {
    probFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    renderProbList();
}

function renderProbList() {
    var user = AUTH.currentUser();
    var problems = DB.get('problems') || [];
    var search = (document.getElementById('probSearch') ? document.getElementById('probSearch').value : '').toLowerCase();

    var filtered = problems.filter(function(p) {
        if (!user) return false;
        if (user.isSuperAdmin || user.role === 'admin') return true;
        if (user.role === 'hod') {
            // HOD sees problems routed to their department
            return p.routedTo === user.department || (!p.routedTo && p.department === user.department);
        }
        // Employee sees own reports + problems assigned to them
        return p.createdBy === user.username || p.assignedTo === user.username;
    });

    if (search) {
        filtered = filtered.filter(function(p) {
            return (p.title || '').toLowerCase().indexOf(search) >= 0 ||
                   (p.category || '').toLowerCase().indexOf(search) >= 0 ||
                   (p.reportedBy || '').toLowerCase().indexOf(search) >= 0 ||
                   (p.routedTo || '').toLowerCase().indexOf(search) >= 0;
        });
    }

    if (probFilter !== 'all') {
        filtered = filtered.filter(function(p) { return p.status === probFilter; });
    }

    var tbody = document.getElementById('probTableBody');
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No problems found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.slice().reverse().map(function(p) {
        var priBadge = p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info';
        var statusBadge = p.status === 'resolved' ? 'badge-success'
            : p.status === 'in_progress' ? 'badge-info'
            : p.status === 'assigned' ? 'badge-warning'
            : 'badge-danger';

        var isHodOfDept = user && user.role === 'hod' && p.routedTo === user.department;
        var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');
        var canAssign = (isAdmin || isHodOfDept) && p.status !== 'resolved';
        var canResolve = p.status !== 'resolved' && (isAdmin || isHodOfDept || (p.assignedTo && p.assignedTo === user.username));

        return '<tr>'
            + '<td><strong>#' + p.id.slice(-6) + '</strong></td>'
            + '<td>' + (p.title || '') + '</td>'
            + '<td>' + (p.category || '-') + '</td>'
            + '<td><span style="font-size:12px;color:var(--primary);font-weight:600;">' + (p.routedTo || p.department || '-') + '</span></td>'
            + '<td>' + (p.reportedBy || '-') + '</td>'
            + '<td>' + APP.formatDate(p.createdAt) + '</td>'
            + '<td><span class="badge ' + priBadge + '">' + (p.priority || 'low') + '</span></td>'
            + '<td><span class="badge ' + statusBadge + '">' + (p.status || 'open').replace('_', ' ') + '</span>'
            + (p.assignedToName ? '<br><span style="font-size:10px;color:var(--gray);">→ ' + p.assignedToName + '</span>' : '')
            + '</td>'
            + '<td style="white-space:nowrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="viewProb(\'' + p.id + '\')">View</button>'
            + (canAssign ? ' <button class="btn btn-sm btn-warning" onclick="showAssignProbForm(\'' + p.id + '\')">Assign</button>' : '')
            + (canResolve ? ' <button class="btn btn-sm btn-success" onclick="resolveProb(\'' + p.id + '\')">Resolve</button>' : '')
            + '</td></tr>';
    }).join('');
}

function showProbForm() {
    var user = AUTH.currentUser();
    var isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    var depts = DB.get('departments') || [];
    var activeDepts = depts.filter(function(d) { return d.active !== false; });

    var reportedByField = isAdmin
        ? '<input type="text" name="reportedBy" class="form-control" required>'
        : '<input type="text" name="reportedBy" class="form-control" value="' + (user ? user.fullName : '') + '" readonly style="background:var(--light-gray);">';

    var deptField = isAdmin
        ? '<input type="text" name="department" class="form-control" placeholder="Reporting department">'
        : '<input type="text" name="department" class="form-control" value="' + (user ? (user.department || '') : '') + '" readonly style="background:var(--light-gray);">';

    var deptOpts = activeDepts.map(function(d) {
        return '<option value="' + d.name.replace(/"/g, '&quot;') + '">' + d.name + '</option>';
    }).join('');

    var form = '<form id="probForm">'
        + '<div class="grid-2">'
        + '<div class="form-group"><label>Problem Title *</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Category *</label><select name="category" class="form-control" required>'
        + '<option value="">Select</option>'
        + '<option value="Electrical">Electrical</option>'
        + '<option value="Plumbing">Plumbing</option>'
        + '<option value="Equipment">Equipment</option>'
        + '<option value="IT System">IT System</option>'
        + '<option value="Infrastructure">Infrastructure</option>'
        + '<option value="Medical">Medical</option>'
        + '<option value="Security">Security</option>'
        + '<option value="Housekeeping">Housekeeping</option>'
        + '<option value="Other">Other</option>'
        + '</select></div>'
        + '<div class="form-group"><label>Route To Department *</label>'
        + '<select name="routedTo" class="form-control" required>'
        + '<option value="">-- Which dept should handle this? --</option>'
        + deptOpts
        + '</select>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">The selected department HOD will receive this problem</div></div>'
        + '<div class="form-group"><label>Priority</label><select name="priority" class="form-control">'
        + '<option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option>'
        + '</select></div>'
        + '<div class="form-group"><label>Reported By</label>' + reportedByField + '</div>'
        + '<div class="form-group"><label>From Department</label>' + deptField + '</div>'
        + '<div class="form-group"><label>Location</label><input type="text" name="location" class="form-control" placeholder="Ward / Room / Area"></div>'
        + '</div>'
        + '<div class="form-group"><label>Description *</label><textarea name="description" class="form-control" rows="3" required></textarea></div>'
        + '</form>';

    openFormModal('Report Problem', form, 'saveProb()');
}

function saveProb() {
    var user = AUTH.currentUser();
    var data = getFormData('probForm');
    if (!data.title || !data.category || !data.reportedBy || !data.description) {
        APP.notify('Please fill all required fields', 'error'); return false;
    }
    if (!data.routedTo) {
        APP.notify('Please select which department should handle this problem', 'error'); return false;
    }
    data.status = 'open';
    data.createdBy = user ? user.username : '';
    data.createdByName = user ? user.fullName : '';
    data.reportedBy = data.reportedBy || (user ? user.fullName : '');
    data.department = data.department || (user ? user.department || '' : '');
    data.solution = '';
    data.resolvedBy = '';
    data.resolvedAt = '';
    data.assignedTo = '';
    data.assignedToName = '';
    DB.add('problems', data);
    APP.notify('Problem reported and routed to ' + data.routedTo + ' department', 'success');
    renderProbList();
    return true;
}

function showAssignProbForm(id) {
    var p = DB.getById('problems', id);
    if (!p) return;
    var user = AUTH.currentUser();
    var allUsers = DB.get('users') || [];
    var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');

    // HOD assigns within their dept; admin assigns within the routed-to dept
    var targetDept = (p.routedTo || p.department);
    var teamMembers = allUsers.filter(function(u) {
        return u.department === targetDept && u.role !== 'admin' && u.role !== 'super_admin' && u.username !== user.username;
    });

    if (!teamMembers.length) {
        APP.notify('No team members in ' + targetDept + ' to assign', 'error');
        return;
    }

    var form = '<form id="assignProbForm">'
        + '<input type="hidden" id="assignProbId" value="' + id + '">'
        + '<div class="form-group"><label>Assign To *</label>'
        + '<select id="assignProbMember" class="form-control" required>'
        + '<option value="">Select team member</option>'
        + teamMembers.map(function(m) {
            return '<option value="' + m.username + '|' + m.fullName.replace(/"/g, '&quot;') + '">' + m.fullName + ' (' + (m.role || 'employee') + ')</option>';
        }).join('')
        + '</select></div>'
        + '<div class="form-group"><label>Instructions (optional)</label>'
        + '<textarea id="assignProbNote" class="form-control" rows="2" placeholder="What needs to be done..."></textarea></div>'
        + '</form>';

    openFormModal('Assign: ' + p.title, form, 'saveAssignProb()', false);
}

function saveAssignProb() {
    var user = AUTH.currentUser();
    var probId = (document.getElementById('assignProbId') || {}).value;
    var memberVal = (document.getElementById('assignProbMember') || {}).value;
    var note = (document.getElementById('assignProbNote') || {}).value || '';

    if (!memberVal) { APP.notify('Select a team member', 'error'); return false; }
    var parts = memberVal.split('|');
    var assignUsername = parts[0];
    var assignName = parts.slice(1).join('|');

    DB.update('problems', probId, {
        status: 'assigned',
        assignedTo: assignUsername,
        assignedToName: assignName,
        assignedBy: user ? user.username : '',
        assignedByName: user ? user.fullName : '',
        assignedAt: new Date().toISOString(),
        assignNote: note
    });
    APP.notify('Problem assigned to ' + assignName, 'success');
    renderProbList();
    return true;
}

function viewProb(id) {
    var p = DB.getById('problems', id);
    if (!p) return;
    var user = AUTH.currentUser();
    var priBadge = p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info';
    var statusBadge = p.status === 'resolved' ? 'badge-success'
        : p.status === 'in_progress' ? 'badge-info'
        : p.status === 'assigned' ? 'badge-warning' : 'badge-danger';

    var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');
    var isHodOfDept = user && user.role === 'hod' && p.routedTo === user.department;
    var canMarkInProgress = p.status === 'assigned' && user && p.assignedTo === user.username;
    var canResolve = p.status !== 'resolved' && (isAdmin || isHodOfDept || (user && p.assignedTo === user.username));

    var html = '<div class="modal-header">'
        + '<h3>#' + p.id.slice(-6) + ' — ' + (p.title || '') + '</h3>'
        + '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">&times;</button>'
        + '</div>'
        + '<div class="grid-2" style="gap:12px;margin-bottom:14px;">'
        + '<div><strong>Category:</strong> ' + (p.category || '-') + '</div>'
        + '<div><strong>Priority:</strong> <span class="badge ' + priBadge + '">' + (p.priority || 'low') + '</span></div>'
        + '<div><strong>Reported By:</strong> ' + (p.reportedBy || '-') + '</div>'
        + '<div><strong>From Dept:</strong> ' + (p.department || '-') + '</div>'
        + '<div><strong>Routed To:</strong> <strong style="color:var(--primary);">' + (p.routedTo || '-') + '</strong></div>'
        + '<div><strong>Location:</strong> ' + (p.location || '-') + '</div>'
        + '<div><strong>Status:</strong> <span class="badge ' + statusBadge + '">' + (p.status || 'open').replace('_', ' ') + '</span></div>'
        + '<div><strong>Reported:</strong> ' + APP.formatDate(p.createdAt) + '</div>'
        + (p.assignedToName ? '<div><strong>Assigned To:</strong> ' + p.assignedToName + '</div><div><strong>Assigned At:</strong> ' + APP.formatDate(p.assignedAt) + '</div>' : '')
        + (p.resolvedAt ? '<div><strong>Resolved:</strong> ' + APP.formatDate(p.resolvedAt) + '</div><div><strong>Resolved By:</strong> ' + (p.resolvedBy || '-') + '</div>' : '')
        + '</div>'
        + '<div style="margin-bottom:12px;"><strong>Description:</strong>'
        + '<div style="background:var(--light-gray);border-radius:6px;padding:10px;margin-top:6px;">' + (p.description || '') + '</div></div>'
        + (p.assignNote ? '<div style="margin-bottom:12px;"><strong>Assignment Instructions:</strong>'
            + '<div style="background:#fff3e0;border-radius:6px;padding:8px;font-size:12px;margin-top:4px;">' + p.assignNote + '</div></div>' : '')
        + (p.solution ? '<div style="margin-bottom:12px;"><strong>Resolution:</strong>'
            + '<div style="background:#e8f5e9;border-radius:6px;padding:8px;margin-top:4px;">' + p.solution + '</div></div>' : '');

    if (canMarkInProgress && p.status === 'assigned') {
        html += '<button class="btn btn-info" style="margin-bottom:10px;" onclick="markProbInProgress(\'' + p.id + '\')">Mark In Progress</button> ';
    }
    if (canResolve) {
        html += '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">'
            + '<label style="font-weight:600;">Resolution Details *</label>'
            + '<textarea id="solutionText" class="form-control" rows="2" style="margin:6px 0;" placeholder="Describe how the problem was resolved..."></textarea>'
            + '<button class="btn btn-success" onclick="resolveProbDirect(\'' + p.id + '\')">Mark Resolved</button></div>';
    }

    showModal(html);
}

function markProbInProgress(id) {
    DB.update('problems', id, { status: 'in_progress' });
    APP.notify('Marked in progress', 'info');
    var modal = document.querySelector('.modal.active');
    if (modal) modal.remove();
    renderProbList();
}

function resolveProb(id) {
    var p = DB.getById('problems', id);
    if (!p || p.status === 'resolved') { APP.notify('Already resolved', 'info'); return; }
    var user = AUTH.currentUser();
    var solution = prompt('Describe how the problem was resolved:');
    if (solution === null) return;
    if (!solution.trim()) { APP.notify('Please describe the solution', 'error'); return; }
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user ? user.fullName : '',
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Problem resolved', 'success');
    renderProbList();
}

function resolveProbDirect(id) {
    var solution = (document.getElementById('solutionText') || {}).value || '';
    if (!solution.trim()) { APP.notify('Please enter resolution details', 'error'); return; }
    var user = AUTH.currentUser();
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user ? user.fullName : '',
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Problem resolved', 'success');
    var modal = document.querySelector('.modal.active');
    if (modal) modal.remove();
    renderProbList();
}
