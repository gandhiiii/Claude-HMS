// Problems — Department-routed issue tracking with assignment workflow
// Flow: open → assigned (HOD assigns to team member) → in_progress → resolved

function _genTicketId() {
    var now = new Date();
    var d = now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2) + ('0' + now.getDate()).slice(-2);
    var rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    return 'TKT-' + d + '-' + (rand || 'XXXX');
}

function _probStatusLabel(status) {
    var map = {
        open: T('probmod_status_open'),
        assigned: T('probmod_status_assigned'),
        in_progress: T('probmod_status_inprogress'),
        resolved: T('probmod_status_resolved')
    };
    return map[status] || map.open;
}

function _probPriorityLabel(priority) {
    var map = {
        low: T('probmod_priority_low'),
        medium: T('probmod_priority_medium'),
        high: T('probmod_priority_high')
    };
    return map[priority] || map.low;
}

function renderProblems(container) {
    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box"><input type="text" class="form-control" id="probSearch" placeholder="' + T('probmod_search_placeholder') + '" oninput="renderProbList()"></div>'
        + '<button class="btn btn-primary" onclick="showProbForm()">' + T('probmod_btn_report_problem') + '</button>'
        + '</div>'
        + '<div class="tabs">'
        + '<button class="tab-btn active" onclick="switchProbTab(\'all\',this)">' + T('probmod_tab_all') + '</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'open\',this)">' + T('probmod_tab_open') + '</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'assigned\',this)">' + T('probmod_tab_assigned') + '</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'in_progress\',this)">' + T('probmod_tab_in_progress') + '</button>'
        + '<button class="tab-btn" onclick="switchProbTab(\'resolved\',this)">' + T('probmod_tab_resolved') + '</button>'
        + '</div>'
        + '<div class="card"><div class="table-responsive"><table>'
        + '<thead><tr><th>' + T('probmod_th_ticket_id') + '</th><th>' + T('probmod_th_title') + '</th><th>' + T('probmod_th_category') + '</th><th>' + T('probmod_th_routed_to') + '</th><th>' + T('probmod_th_reported_by') + '</th><th>' + T('probmod_th_date') + '</th><th>' + T('probmod_th_priority') + '</th><th>' + T('probmod_th_status') + '</th><th>' + T('probmod_th_actions') + '</th></tr></thead>'
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
        // Storekeeper and employees see only their own reports + problems assigned to them
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
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">' + T('probmod_no_problems_found') + '</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.slice().reverse().map(function(p) {
        var priBadge = p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info';
        var statusBadge = p.status === 'resolved' ? 'badge-success'
            : p.status === 'in_progress' ? 'badge-info'
            : p.status === 'assigned' ? 'badge-warning'
            : 'badge-danger';

        var isHodOfDept = user && user.role === 'hod' &&
            (p.routedTo === user.department || (!p.routedTo && p.department === user.department));
        var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');
        var canAssign  = (isAdmin || isHodOfDept) && p.status !== 'resolved';
        var canResolve = p.status !== 'resolved' && (isAdmin || isHodOfDept || (p.assignedTo && p.assignedTo === user.username));

        return '<tr>'
            + '<td><strong style="color:var(--primary);font-size:12px;">' + (p.ticketId || '#' + p.id.slice(-6)) + '</strong>'
            + (p.source === 'checklist' ? '<br><span style="font-size:10px;color:var(--gray);">' + T('probmod_checklist_badge') + '</span>' : '') + '</td>'
            + '<td>' + (p.title || '') + '</td>'
            + '<td>' + (p.category || '-') + '</td>'
            + '<td><span style="font-size:12px;color:var(--primary);font-weight:600;">' + (p.routedTo || p.department || '-') + '</span></td>'
            + '<td>' + (p.reportedBy || '-') + '</td>'
            + '<td>' + APP.formatDate(p.createdAt) + '</td>'
            + '<td><span class="badge ' + priBadge + '">' + _probPriorityLabel(p.priority || 'low') + '</span></td>'
            + '<td><span class="badge ' + statusBadge + '">' + _probStatusLabel(p.status || 'open') + '</span>'
            + (p.assignedToName ? '<br><span style="font-size:10px;color:var(--gray);">→ ' + p.assignedToName + '</span>' : '')
            + '</td>'
            + '<td style="white-space:nowrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="viewProb(\'' + p.id + '\')">' + T('probmod_btn_view') + '</button>'
            + (canAssign ? ' <button class="btn btn-sm btn-warning" onclick="showAssignProbForm(\'' + p.id + '\')">' + T('probmod_btn_assign') + '</button>' : '')
            + (canResolve ? ' <button class="btn btn-sm btn-success" onclick="resolveProb(\'' + p.id + '\')">' + T('probmod_btn_solve') + '</button>' : '')
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
        ? '<input type="text" name="department" class="form-control" placeholder="' + T('probmod_placeholder_reporting_dept') + '">'
        : '<input type="text" name="department" class="form-control" value="' + (user ? (user.department || '') : '') + '" readonly style="background:var(--light-gray);">';

    var deptOpts = activeDepts.map(function(d) {
        return '<option value="' + d.name.replace(/"/g, '&quot;') + '">' + d.name + '</option>';
    }).join('');

    var form = '<form id="probForm">'
        + '<div class="grid-2">'
        + '<div class="form-group"><label>' + T('probmod_label_problem_title') + '</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>' + T('probmod_label_category') + '</label><select name="category" class="form-control" required>'
        + '<option value="">' + T('probmod_opt_select') + '</option>'
        + '<option value="Electrical">' + T('probmod_cat_electrical') + '</option>'
        + '<option value="Plumbing">' + T('probmod_cat_plumbing') + '</option>'
        + '<option value="Equipment">' + T('probmod_cat_equipment') + '</option>'
        + '<option value="IT System">' + T('probmod_cat_it_system') + '</option>'
        + '<option value="Infrastructure">' + T('probmod_cat_infrastructure') + '</option>'
        + '<option value="Medical">' + T('probmod_cat_medical') + '</option>'
        + '<option value="Security">' + T('probmod_cat_security') + '</option>'
        + '<option value="Housekeeping">' + T('probmod_cat_housekeeping') + '</option>'
        + '<option value="Other">' + T('probmod_cat_other') + '</option>'
        + '</select></div>'
        + '<div class="form-group"><label>' + T('probmod_label_route_to') + '</label>'
        + '<select name="routedTo" class="form-control" required>'
        + '<option value="">' + T('probmod_opt_which_dept') + '</option>'
        + deptOpts
        + '</select>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">' + T('probmod_hint_hod_receive') + '</div></div>'
        + '<div class="form-group"><label>' + T('probmod_label_priority') + '</label><select name="priority" class="form-control">'
        + '<option value="low">' + T('probmod_priority_low') + '</option><option value="medium" selected>' + T('probmod_priority_medium') + '</option><option value="high">' + T('probmod_priority_high') + '</option>'
        + '</select></div>'
        + '<div class="form-group"><label>' + T('probmod_label_reported_by') + '</label>' + reportedByField + '</div>'
        + '<div class="form-group"><label>' + T('probmod_label_from_department') + '</label>' + deptField + '</div>'
        + '<div class="form-group"><label>' + T('probmod_label_location') + '</label><input type="text" name="location" class="form-control" placeholder="' + T('probmod_placeholder_location') + '"></div>'
        + '</div>'
        + '<div class="form-group"><label>' + T('probmod_label_description') + '</label><textarea name="description" class="form-control" rows="3" required></textarea></div>'
        + '</form>';

    openFormModal(T('probmod_modal_report_problem'), form, 'saveProb()');
}

function saveProb() {
    var user = AUTH.currentUser();
    var data = getFormData('probForm');
    if (!data.title || !data.category || !data.reportedBy || !data.description) {
        APP.notify(T('probmod_msg_fill_required'), 'error'); return false;
    }
    if (!data.routedTo) {
        APP.notify(T('probmod_msg_select_dept'), 'error'); return false;
    }
    data.status = 'open';
    data.ticketId = _genTicketId();
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
    APP.notify(T('probmod_msg_reported_routed_prefix') + data.routedTo + T('probmod_msg_reported_routed_suffix'), 'success');
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
        APP.notify(T('probmod_msg_no_team_members_prefix') + targetDept + T('probmod_msg_no_team_members_suffix'), 'error');
        return;
    }

    var form = '<form id="assignProbForm">'
        + '<input type="hidden" id="assignProbId" value="' + id + '">'
        + '<div class="form-group"><label>' + T('probmod_label_assign_to') + '</label>'
        + '<select id="assignProbMember" class="form-control" required>'
        + '<option value="">' + T('probmod_opt_select_team_member') + '</option>'
        + teamMembers.map(function(m) {
            return '<option value="' + m.username + '|' + m.fullName.replace(/"/g, '&quot;') + '">' + m.fullName + ' (' + (m.role || 'employee') + ')</option>';
        }).join('')
        + '</select></div>'
        + '<div class="form-group"><label>' + T('probmod_label_instructions_optional') + '</label>'
        + '<textarea id="assignProbNote" class="form-control" rows="2" placeholder="' + T('probmod_placeholder_what_needs_done') + '"></textarea></div>'
        + '</form>';

    openFormModal(T('probmod_modal_assign_prefix') + p.title, form, 'saveAssignProb()', false);
}

function saveAssignProb() {
    var user = AUTH.currentUser();
    var probId = (document.getElementById('assignProbId') || {}).value;
    var memberVal = (document.getElementById('assignProbMember') || {}).value;
    var note = (document.getElementById('assignProbNote') || {}).value || '';

    if (!memberVal) { APP.notify(T('probmod_msg_select_team_member'), 'error'); return false; }
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
    APP.notify(T('probmod_msg_assigned_to_prefix') + assignName, 'success');
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
    var isHodOfDept = user && user.role === 'hod' &&
        (p.routedTo === user.department || (!p.routedTo && p.department === user.department));
    var canMarkInProgress = p.status === 'assigned' && user && p.assignedTo === user.username;
    var canResolve = p.status !== 'resolved' && (isAdmin || isHodOfDept || (user && p.assignedTo === user.username));

    var html = '<div class="modal-header">'
        + '<h3>' + (p.title || '') + '</h3>'
        + '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">&times;</button>'
        + '</div>'
        + '<div style="background:#fff3e0;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">'
        + '<span style="font-size:16px;font-weight:800;color:#e65100;">' + (p.ticketId || '#' + p.id.slice(-6)) + '</span>'
        + '<span class="badge ' + statusBadge + '" style="font-size:12px;">' + _probStatusLabel(p.status || 'open') + '</span>'
        + (p.source === 'checklist' ? '<span style="font-size:12px;color:var(--primary);">' + T('probmod_from_checklist_prefix') + (p.checklistTitle || '') + '</span>' : '')
        + '</div>'
        + '<div class="grid-2" style="gap:12px;margin-bottom:14px;">'
        + '<div><strong>' + T('probmod_view_category') + '</strong> ' + (p.category || '-') + '</div>'
        + '<div><strong>' + T('probmod_view_priority') + '</strong> <span class="badge ' + priBadge + '">' + _probPriorityLabel(p.priority || 'low') + '</span></div>'
        + '<div><strong>' + T('probmod_view_reported_by') + '</strong> ' + (p.reportedBy || '-') + '</div>'
        + '<div><strong>' + T('probmod_view_from_dept') + '</strong> ' + (p.department || '-') + '</div>'
        + '<div><strong>' + T('probmod_view_routed_to') + '</strong> <strong style="color:var(--primary);">' + (p.routedTo || '-') + '</strong></div>'
        + '<div><strong>' + T('probmod_view_location') + '</strong> ' + (p.location || '-') + '</div>'
        + '<div><strong>' + T('probmod_view_status') + '</strong> <span class="badge ' + statusBadge + '">' + _probStatusLabel(p.status || 'open') + '</span></div>'
        + '<div><strong>' + T('probmod_view_reported') + '</strong> ' + APP.formatDate(p.createdAt) + '</div>'
        + (p.assignedToName ? '<div><strong>' + T('probmod_view_assigned_to') + '</strong> ' + p.assignedToName + '</div><div><strong>' + T('probmod_view_assigned_at') + '</strong> ' + APP.formatDate(p.assignedAt) + '</div>' : '')
        + (p.resolvedAt ? '<div><strong>' + T('probmod_view_resolved') + '</strong> ' + APP.formatDate(p.resolvedAt) + '</div><div><strong>' + T('probmod_view_resolved_by') + '</strong> ' + (p.resolvedBy || '-') + '</div>' : '')
        + '</div>'
        + '<div style="margin-bottom:12px;"><strong>' + T('probmod_view_description') + '</strong>'
        + '<div style="background:var(--light-gray);border-radius:6px;padding:10px;margin-top:6px;">' + (p.description || '') + '</div></div>'
        + (p.assignNote ? '<div style="margin-bottom:12px;"><strong>' + T('probmod_view_assignment_instructions') + '</strong>'
            + '<div style="background:#fff3e0;border-radius:6px;padding:8px;font-size:12px;margin-top:4px;">' + p.assignNote + '</div></div>' : '')
        + (p.solution ? '<div style="margin-bottom:12px;"><strong>' + T('probmod_view_resolution') + '</strong>'
            + '<div style="background:#e8f5e9;border-radius:6px;padding:8px;margin-top:4px;">' + p.solution + '</div></div>' : '');

    if (canMarkInProgress && p.status === 'assigned') {
        html += '<button class="btn btn-info" style="margin-bottom:10px;" onclick="markProbInProgress(\'' + p.id + '\')">' + T('probmod_btn_mark_in_progress') + '</button> ';
    }
    if (canResolve) {
        html += '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">'
            + '<label style="font-weight:600;">' + T('probmod_label_resolution_details') + '</label>'
            + '<textarea id="solutionText" class="form-control" rows="2" style="margin:6px 0;" placeholder="' + T('probmod_placeholder_describe_resolution') + '"></textarea>'
            + '<button class="btn btn-success" onclick="resolveProbDirect(\'' + p.id + '\')">' + T('probmod_btn_mark_resolved') + '</button></div>';
    }

    showModal(html);
}

function markProbInProgress(id) {
    DB.update('problems', id, { status: 'in_progress' });
    APP.notify(T('probmod_msg_marked_in_progress'), 'info');
    var modal = document.querySelector('.modal.active');
    if (modal) modal.remove();
    renderProbList();
}

function resolveProb(id) {
    var p = DB.getById('problems', id);
    if (!p || p.status === 'resolved') { APP.notify(T('probmod_msg_already_resolved'), 'info'); return; }
    var tkt = p.ticketId || ('#' + p.id.slice(-6));
    var form = '<form id="solveProbForm">'
        + '<input type="hidden" id="solveProbId" value="' + id + '">'
        + '<div style="background:#fff3e0;border-radius:8px;padding:10px 14px;margin-bottom:14px;">'
        + '<div style="font-size:14px;font-weight:800;color:#e65100;">' + tkt + '</div>'
        + '<div style="font-size:13px;font-weight:600;margin-top:2px;">' + (p.title || '') + '</div>'
        + '</div>'
        + '<div class="form-group"><label>' + T('probmod_label_resolution_solution') + '</label>'
        + '<textarea id="solveProbSolution" class="form-control" rows="3" required placeholder="' + T('probmod_placeholder_describe_resolution') + '"></textarea></div>'
        + '</form>';
    openFormModal(T('probmod_modal_solve_prefix') + tkt, form, 'saveProbSolution()', false);
}

function saveProbSolution() {
    var id       = (document.getElementById('solveProbId') || {}).value;
    var solution = ((document.getElementById('solveProbSolution') || {}).value || '').trim();
    if (!solution) { APP.notify(T('probmod_msg_describe_solution'), 'error'); return false; }
    var user = AUTH.currentUser();
    var p    = DB.getById('problems', id);
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user ? user.fullName : '',
        resolvedAt: new Date().toISOString()
    });
    var tkt = p ? (p.ticketId || '#' + p.id.slice(-6)) : '';
    APP.notify(T('probmod_msg_problem_solved_prefix') + tkt + T('probmod_msg_problem_solved_suffix'), 'success');
    var modal = document.querySelector('.modal');
    if (modal) modal.remove();
    renderProbList();
    return true;
}

function resolveProbDirect(id) {
    var solution = (document.getElementById('solutionText') || {}).value || '';
    if (!solution.trim()) { APP.notify(T('probmod_msg_enter_resolution_details'), 'error'); return; }
    var user = AUTH.currentUser();
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user ? user.fullName : '',
        resolvedAt: new Date().toISOString()
    });
    APP.notify(T('probmod_msg_problem_resolved'), 'success');
    var modal = document.querySelector('.modal.active');
    if (modal) modal.remove();
    renderProbList();
}
