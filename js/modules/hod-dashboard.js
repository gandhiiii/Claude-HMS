// HOD (Head of Department / In-Charge) Dashboard
// Shows department team overview, work assignment, and team performance.
// Generic — works for any HOD regardless of department.

(function() {
    var s = document.createElement('style');
    s.textContent = [
        '.hod-tab-btn{padding:9px 18px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--gray);border-bottom:3px solid transparent;transition:0.2s;white-space:nowrap;}',
        '.hod-tab-btn.active{color:#7b1fa2;border-bottom-color:#7b1fa2;font-weight:700;}',
        '.hod-tab-btn:hover:not(.active){color:var(--text);background:var(--light-gray);}',
        '.hod-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 14px;display:flex;align-items:center;gap:12px;}',
        '.hod-kpi-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
        '.hod-kpi-val{font-size:22px;font-weight:700;line-height:1;}',
        '.hod-kpi-lbl{font-size:11px;color:var(--gray);margin-top:2px;}',
        '.member-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:flex-start;gap:12px;}',
        '.member-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;}',
        '.task-row{padding:10px 14px;border-radius:8px;background:var(--card);border:1px solid var(--border);margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
        '.task-row.overdue{border-left:4px solid var(--danger);}',
        '.assign-chip{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;border:1px solid var(--border);cursor:pointer;background:var(--card);transition:0.15s;}',
        '.assign-chip:hover,.assign-chip.selected{background:#7b1fa2;color:#fff;border-color:#7b1fa2;}',
        '.q-bar{background:var(--light-gray);border-radius:6px;height:8px;overflow:hidden;}',
        '.q-fill{height:100%;border-radius:6px;transition:width .4s;}',
    ].join('');
    document.head.appendChild(s);
})();

var _hodTab = 'overview';
var _hodData = {};

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderHodDashboard(container) {
    var user = AUTH.currentUser();
    if (!user) { container.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || '';
    var u    = user.fullName || user.username;

    var allUsers      = DB.get('users') || [];
    var tasks         = DB.get('tasks') || [];
    var problems      = DB.get('problems') || [];
    var requests      = DB.get('material_requests') || [];
    var checklists    = DB.get('checklists') || [];
    var cleaningTasks = DB.get('roomCleaningTasks') || [];
    var reports       = DB.get('reports') || [];

    // Team = employees in same department (not admin/super_admin)
    var team = allUsers.filter(function(m) {
        return m.department === dept && m.role !== 'admin' && m.role !== 'super_admin' && m.username !== user.username;
    });
    var teamNames = team.map(function(m){ return m.fullName; });

    // Department tasks (assigned to team members OR dept tag)
    var deptTasks = tasks.filter(function(t) {
        return teamNames.indexOf(t.assignedTo) !== -1 || (!t.assignedTo && t.department === dept);
    });

    var pendingCleaning = cleaningTasks.filter(function(t){ return t.status !== 'done'; });
    var myReports = reports.filter(function(r){ return r.createdBy === user.username || r.createdBy === user.fullName; });

    _hodData = {
        user: user, dept: dept, u: u,
        team: team, teamNames: teamNames,
        deptTasks: deptTasks,
        pendingCleaning: pendingCleaning,
        allCleaning: cleaningTasks,
        deptChecklists: checklists.filter(function(c){ return c.department === dept || c.assignedTo === 'common'; }),
        deptProblems: problems.filter(function(p){ return p.department === dept || teamNames.indexOf(p.createdBy) !== -1; }),
        deptRequests: requests.filter(function(r){ return r.department === dept || teamNames.indexOf(r.createdBy) !== -1; }),
        myReports: myReports
    };

    // KPIs
    var pendingTasks  = deptTasks.filter(function(t){ return t.status !== 'completed'; }).length;
    var doneTasks     = deptTasks.filter(function(t){ return t.status === 'completed'; }).length;
    var overdueTasks  = deptTasks.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
    var openProblems  = _hodData.deptProblems.filter(function(p){ return p.status !== 'resolved'; }).length;
    var pendingReqs   = _hodData.deptRequests.filter(function(r){ return r.status === 'pending'; }).length;

    var tabs = [
        { id: 'overview',    label: '📊 Overview' },
        { id: 'cleaning',    label: '🧹 Cleaning', badge: pendingCleaning.length, badgeClass: 'badge-danger' },
        { id: 'team',        label: '👥 My Team (' + team.length + ')' },
        { id: 'tasks',       label: '📝 Team Tasks', badge: overdueTasks > 0 ? overdueTasks + ' overdue' : null, badgeClass: 'badge-danger' },
        { id: 'checklists',  label: '✅ Checklists' },
        { id: 'requests',    label: '📦 Requests', badge: pendingReqs || null, badgeClass: 'badge-warning' },
        { id: 'performance', label: '📊 Performance' }
    ];

    var html = ''
        // Header
        + '<div style="background:linear-gradient(135deg,#6a1b9a 0%,#4a148c 100%);border-radius:14px;padding:20px 24px;color:#fff;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">'
        + '<div style="display:flex;align-items:center;gap:16px;">'
        + '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;">👔</div>'
        + '<div><div style="font-size:20px;font-weight:700;">' + u + '</div>'
        + '<div style="font-size:13px;opacity:0.85;">' + (dept||'No Department') + ' &nbsp;·&nbsp; In-Charge / HOD</div></div></div>'
        + '<div style="text-align:right;font-size:13px;opacity:0.85;">'
        + new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
        + '<div style="font-size:12px;margin-top:2px;opacity:0.75;">Team of ' + team.length + ' member' + (team.length!==1?'s':'') + '</div>'
        + '</div></div>'

        // KPI strip
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px;">'
        + _hodKpi('👥', 'Team Members',    team.length,           '#f3e5f5', '#7b1fa2', 'team')
        + _hodKpi('📝', 'Pending Tasks',   pendingTasks,          '#fff3e0', '#e65100', 'tasks')
        + _hodKpi('✅', 'Tasks Done',      doneTasks,             '#e8f5e9', 'var(--secondary)', 'tasks')
        + _hodKpi('🧹', 'Rooms to Clean',  pendingCleaning.length,'#fce4ec', 'var(--danger)', 'cleaning')
        + _hodKpi('⚠️', 'Overdue Tasks',   overdueTasks,          '#ffebee', 'var(--danger)', 'tasks')
        + _hodKpi('📦', 'Pending Requests',pendingReqs,           '#e3f2fd', 'var(--primary)', 'requests')
        + '</div>'

        // Cleaning urgent banner
        + (pendingCleaning.length > 0
            ? '<div style="background:#fff3e0;border:2px solid var(--warning);border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="hodTabSwitch(\'cleaning\')">'
              + '<span style="font-size:22px;">🧹</span>'
              + '<div style="flex:1;"><strong style="color:#e65100;">' + pendingCleaning.length + ' room(s) need cleaning</strong>'
              + '<div style="font-size:12px;color:var(--gray);">Tap to assign & manage cleaning tasks</div></div>'
              + '<button class="btn btn-sm btn-warning" style="color:#fff;flex-shrink:0;" onclick="hodTabSwitch(\'cleaning\')">Manage →</button></div>'
            : '')

        // Tab bar
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px 12px 0 0;padding:0 4px;display:flex;overflow-x:auto;gap:2px;border-bottom:none;">'
        + tabs.map(function(t) {
            var lbl = t.label + (t.badge ? ' <span class="badge ' + (t.badgeClass||'badge-primary') + '" style="font-size:10px;margin-left:2px;">' + t.badge + '</span>' : '');
            return '<button class="hod-tab-btn' + (t.id==='overview'?' active':'') + '" data-tab="' + t.id + '" onclick="hodTabSwitch(\'' + t.id + '\')">' + lbl + '</button>';
        }).join('')
        + '</div>'

        + '<div style="background:var(--card);border:1px solid var(--border);border-top:3px solid #7b1fa2;border-radius:0 0 12px 12px;padding:18px;" id="hodTabContent"></div>';

    container.innerHTML = html;
    _hodTab = 'overview';
    _renderHodTab('overview');
}

function _hodKpi(icon, label, val, bg, color, tab) {
    return '<div class="hod-kpi" style="cursor:pointer;" onclick="hodTabSwitch(\'' + tab + '\')">'
        + '<div class="hod-kpi-icon" style="background:' + bg + ';">' + icon + '</div>'
        + '<div><div class="hod-kpi-val" style="color:' + color + ';">' + val + '</div><div class="hod-kpi-lbl">' + label + '</div></div>'
        + '</div>';
}

function hodTabSwitch(tab) {
    _hodTab = tab;
    document.querySelectorAll('.hod-tab-btn').forEach(function(el) {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    _renderHodTab(tab);
}

function _renderHodTab(tab) {
    var el = document.getElementById('hodTabContent');
    if (!el) return;
    if (tab === 'overview')    { _hodOverview(el); return; }
    if (tab === 'cleaning')    { _hodCleaning(el); return; }
    if (tab === 'team')        { _hodTeam(el); return; }
    if (tab === 'tasks')       { _hodTasks(el); return; }
    if (tab === 'checklists')  { _hodChecklists(el); return; }
    if (tab === 'requests')    { _hodRequests(el); return; }
    if (tab === 'performance') { _hodPerformance(el); return; }
}

/* ══════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════ */
function _hodOverview(el) {
    var d = _hodData;
    var todayPending = d.deptTasks.filter(function(t) {
        if (t.status === 'completed') return false;
        if (!t.deadline) return false;
        var dd = new Date(t.deadline), n = new Date();
        return dd.getFullYear()===n.getFullYear() && dd.getMonth()===n.getMonth() && dd.getDate()===n.getDate();
    });
    var overdue = d.deptTasks.filter(function(t) {
        return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
    });

    var html = '';

    // Overdue alert
    if (overdue.length > 0) {
        html += '<div style="background:#ffebee;border:1px solid var(--danger);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
            + '<span style="font-size:13px;font-weight:600;color:var(--danger);">⚠️ ' + overdue.length + ' overdue task(s) in your team</span>'
            + '<button class="btn btn-sm btn-danger" onclick="hodTabSwitch(\'tasks\')">View</button></div>';
    }

    // Two-column: today's tasks + team snapshot
    html += '<div class="grid-2" style="gap:16px;margin-bottom:20px;">'
        // Today's work
        + '<div><div style="font-weight:700;font-size:14px;margin-bottom:10px;">📅 Today\'s Team Tasks</div>';
    if (todayPending.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;padding:12px;background:var(--light-gray);border-radius:8px;text-align:center;">No tasks due today</div>';
    } else {
        todayPending.slice(0,5).forEach(function(t) {
            html += '<div class="task-row">'
                + '<div style="flex:1;font-size:13px;"><strong>' + (t.title||'') + '</strong>'
                + '<div style="font-size:11px;color:var(--gray);">→ ' + (t.assignedTo||'Unassigned') + '</div></div>'
                + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:10px;">' + (t.status||'pending') + '</span></div>';
        });
    }
    html += '</div>'

        // Team snapshot
        + '<div><div style="font-weight:700;font-size:14px;margin-bottom:10px;">👥 Team Snapshot</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;">';

    d.team.forEach(function(m) {
        var myTasks = d.deptTasks.filter(function(t){ return t.assignedTo === m.fullName; });
        var myDone  = myTasks.filter(function(t){ return t.status === 'completed'; }).length;
        var myOvd   = myTasks.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
        var initials = m.fullName ? m.fullName.split(' ').map(function(n){ return n[0]; }).join('').substring(0,2).toUpperCase() : '?';
        var colors = ['#e91e63','#9c27b0','#3f51b5','#009688','#ff5722','#795548'];
        var color  = colors[m.fullName.charCodeAt(0) % colors.length];
        html += '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:var(--light-gray);">'
            + '<div style="width:32px;height:32px;border-radius:50%;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">' + initials + '</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + m.fullName + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">' + myTasks.length + ' tasks &nbsp;·&nbsp; ' + myDone + ' done' + (myOvd > 0 ? ' &nbsp;·&nbsp; <span style="color:var(--danger);">' + myOvd + ' overdue</span>' : '') + '</div>'
            + '</div>'
            + '<span class="badge ' + (myOvd > 0 ? 'badge-danger' : 'badge-success') + '" style="font-size:10px;">' + (myOvd > 0 ? '⚠️' : '✓') + '</span>'
            + '</div>';
    });

    if (d.team.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">No team members in ' + d.dept + '</div>';
    }

    html += '</div></div></div>';

    // Recent cleaning
    if (d.pendingCleaning.length > 0) {
        html += '<div style="border-top:1px solid var(--border);padding-top:16px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
            + '<div style="font-weight:700;font-size:14px;">🧹 Pending Cleaning (' + d.pendingCleaning.length + ')</div>'
            + '<button class="btn btn-sm btn-outline" onclick="hodTabSwitch(\'cleaning\')">Manage All →</button></div>'
            + '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
        d.pendingCleaning.slice(0,4).forEach(function(t) {
            html += '<div style="background:#fff3e0;border:1px solid var(--warning);border-radius:8px;padding:10px 14px;min-width:140px;">'
                + '<div style="font-size:15px;font-weight:700;">Room ' + t.roomNo + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + (t.category||'') + '</div>'
                + '<div style="font-size:11px;margin-top:4px;">👷 ' + (t.assignedTo || '<span style="color:var(--warning);font-weight:600;">Unassigned</span>') + '</div>'
                + '<span class="badge badge-warning" style="font-size:10px;margin-top:6px;display:inline-block;">' + t.status + '</span>'
                + '</div>';
        });
        html += '</div></div>';
    }

    // Quick actions
    html += '<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px;">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">⚡ Quick Actions</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-primary" onclick="Router.navigate(\'tasks\')">📝 Assign Task</button>'
        + '<button class="btn btn-outline" onclick="Router.navigate(\'checklists\')">✅ View Checklists</button>'
        + '<button class="btn btn-outline" onclick="hodTabSwitch(\'cleaning\')">🧹 Cleaning Board</button>'
        + '<button class="btn btn-outline" onclick="hodShowReportForm()">📋 Send Report to Admin</button>'
        + '<button class="btn btn-outline" onclick="Router.navigate(\'problems\')">🔧 Problems</button>'
        + '</div></div>';

    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   CLEANING TAB — assign + manage
══════════════════════════════════════════ */
function _hodCleaning(el) {
    var d = _hodData;
    var pending  = d.pendingCleaning;
    var done     = d.allCleaning.filter(function(t){ return t.status === 'done'; });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">🧹 Cleaning Task Board</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<span class="badge badge-warning" style="padding:5px 10px;">' + pending.length + ' pending</span>'
        + '<span class="badge badge-success" style="padding:5px 10px;">' + done.length + ' done</span>'
        + '</div></div>';

    if (pending.length === 0) {
        html += '<div style="background:#e8f5e9;border:2px solid var(--secondary);border-radius:10px;padding:20px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">✅</div>'
            + '<div style="font-weight:700;color:var(--secondary);">All rooms are clean!</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-top:4px;">No pending cleaning tasks</div></div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:20px;">';
        pending.forEach(function(t) {
            var since = t.dischargedAt ? Math.max(0, APP.daysBetween(t.dischargedAt, new Date().toISOString())) : 0;
            var bg     = since >= 1 ? '#ffebee' : '#fff8e1';
            var border = since >= 1 ? 'var(--danger)' : 'var(--warning)';

            html += '<div style="background:' + bg + ';border:2px solid ' + border + ';border-radius:12px;padding:16px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
                + '<span style="font-size:20px;font-weight:700;">Room ' + t.roomNo + '</span>'
                + '<span class="badge ' + (t.status==='in-progress'?'badge-info':'badge-warning') + '">' + t.status + '</span></div>'
                + '<div style="font-size:12px;color:var(--gray);margin-bottom:4px;">'
                + (t.floor?'Floor '+t.floor+' · ':'') + (t.category||'') + (t.bedId?' · Bed '+t.bedId:'') + '</div>'
                + '<div style="font-size:13px;margin-bottom:4px;">👤 <strong>' + t.patientName + '</strong></div>'
                + '<div style="font-size:12px;color:var(--gray);margin-bottom:10px;">'
                + 'Discharged: ' + (t.dischargedAt ? new Date(t.dischargedAt).toLocaleDateString('en-IN') : '—')
                + (since > 0 ? ' &nbsp;·&nbsp; <span style="color:var(--danger);font-weight:600;">' + since + 'd ago</span>' : ' &nbsp;·&nbsp; Today') + '</div>'

                // Assign to team member
                + '<div style="margin-bottom:10px;">'
                + '<div style="font-size:11px;font-weight:600;color:var(--gray);margin-bottom:5px;">ASSIGN TO:</div>'
                + '<div style="display:flex;flex-wrap:wrap;gap:4px;">'
                + d.team.map(function(m) {
                    var isCurrent = t.assignedTo === m.fullName;
                    return '<span class="assign-chip' + (isCurrent?' selected':'') + '" onclick="hodAssignCleaning(\'' + t.id + '\',\'' + m.fullName.replace(/'/g,'\\\'') + '\')">' + m.fullName.split(' ')[0] + '</span>';
                  }).join('')
                + (d.team.length === 0 ? '<span style="font-size:12px;color:var(--gray);">No team members</span>' : '')
                + '</div></div>'

                + '<div style="display:flex;gap:6px;">'
                + (t.status==='pending'
                    ? '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="hodMarkInProgress(\'' + t.id + '\')">▶ Start</button>'
                    : '')
                + '<button class="btn btn-sm btn-success" onclick="hodMarkClean(\'' + t.id + '\')">✅ Mark Clean</button>'
                + '</div></div>';
        });
        html += '</div>';
    }

    // Done today
    var todayDone = done.filter(function(t) {
        if (!t.completedAt) return false;
        var d2 = new Date(t.completedAt), n = new Date();
        return d2.getFullYear()===n.getFullYear() && d2.getMonth()===n.getMonth() && d2.getDate()===n.getDate();
    });
    if (todayDone.length > 0) {
        html += '<div style="border-top:1px solid var(--border);padding-top:14px;">'
            + '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">✅ Cleaned Today (' + todayDone.length + ')</div>'
            + '<div class="table-responsive"><table><thead><tr><th>Room</th><th>Patient</th><th>Cleaned By</th><th>Completed At</th></tr></thead><tbody>';
        todayDone.forEach(function(t) {
            html += '<tr><td><strong>' + t.roomNo + '</strong></td><td>' + t.patientName + '</td>'
                + '<td>' + (t.completedBy||'—') + '</td>'
                + '<td>' + (t.completedAt ? APP.formatDateTime(t.completedAt) : '—') + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    el.innerHTML = html;
}

function hodAssignCleaning(taskId, memberName) {
    DB.update('roomCleaningTasks', taskId, { assignedTo: memberName });
    APP.notify('Assigned to ' + memberName, 'success');
    _hodCleaning(document.getElementById('hodTabContent'));
}

function hodMarkInProgress(taskId) {
    var user = AUTH.currentUser();
    DB.update('roomCleaningTasks', taskId, { status: 'in-progress', startedAt: new Date().toISOString(), startedBy: user ? user.fullName : '' });
    APP.notify('Marked in-progress', 'info');
    _hodCleaning(document.getElementById('hodTabContent'));
}

function hodMarkClean(taskId) {
    var user = AUTH.currentUser();
    var task = DB.getById('roomCleaningTasks', taskId);
    DB.update('roomCleaningTasks', taskId, {
        status: 'done', completedAt: new Date().toISOString(),
        completedBy: user ? user.fullName : 'HOD'
    });
    if (task) {
        var overrides = DB.get('roomStatus') || [];
        DB.set('roomStatus', overrides.filter(function(r){ return r.roomNo !== task.roomNo; }));
    }
    APP.notify('Room ' + (task ? task.roomNo : '') + ' marked clean — now available!', 'success');
    _hodCleaning(document.getElementById('hodTabContent'));
}

/* ══════════════════════════════════════════
   TEAM TAB
══════════════════════════════════════════ */
function _hodTeam(el) {
    var d = _hodData;
    var html = '<div style="font-weight:700;font-size:16px;margin-bottom:16px;">👥 Team — ' + d.dept + ' (' + d.team.length + ' members)</div>';

    if (d.team.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:32px;">No team members found in ' + d.dept + ' department</div>';
        el.innerHTML = html; return;
    }

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">';
    d.team.forEach(function(m) {
        var myTasks  = d.deptTasks.filter(function(t){ return t.assignedTo === m.fullName; });
        var myDone   = myTasks.filter(function(t){ return t.status === 'completed'; }).length;
        var myOvd    = myTasks.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
        var myPend   = myTasks.filter(function(t){ return t.status !== 'completed'; }).length;
        var myClean  = d.allCleaning.filter(function(t){ return t.completedBy === m.fullName; }).length;
        var taskRate = myTasks.length > 0 ? Math.round(myDone / myTasks.length * 100) : 0;
        var initials = m.fullName ? m.fullName.split(' ').map(function(n){ return n[0]; }).join('').substring(0,2).toUpperCase() : '?';
        var colors = ['#e91e63','#9c27b0','#3f51b5','#009688','#ff5722','#795548'];
        var color  = colors[m.fullName.charCodeAt(0) % colors.length];

        html += '<div class="member-card">'
            + '<div class="member-avatar" style="background:' + color + ';">' + initials + '</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:14px;font-weight:700;">' + m.fullName + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-bottom:8px;">' + (m.role||'employee').replace(/_/g,' ') + (m.phone ? ' &nbsp;·&nbsp; ' + m.phone : '') + '</div>'
            + '<div style="display:flex;gap:10px;font-size:12px;margin-bottom:8px;flex-wrap:wrap;">'
            + '<span style="color:var(--warning);">📝 ' + myPend + ' pending</span>'
            + '<span style="color:var(--success);">✅ ' + myDone + ' done</span>'
            + (myOvd > 0 ? '<span style="color:var(--danger);">⚠️ ' + myOvd + ' overdue</span>' : '')
            + '<span style="color:#7b1fa2;">🧹 ' + myClean + ' rooms cleaned</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:6px;">'
            + '<div style="flex:1;height:6px;background:var(--light-gray);border-radius:3px;">'
            + '<div style="height:100%;width:' + taskRate + '%;background:' + (taskRate>=80?'var(--success)':taskRate>=50?'var(--warning)':'var(--danger)') + ';border-radius:3px;"></div></div>'
            + '<span style="font-size:11px;color:var(--gray);min-width:32px;">' + taskRate + '%</span></div>'
            + '</div></div>';
    });

    html += '</div>';
    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   TASKS TAB — team tasks
══════════════════════════════════════════ */
function _hodTasks(el) {
    var d = _hodData;
    var overdue   = d.deptTasks.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; });
    var pending   = d.deptTasks.filter(function(t){ return t.status !== 'completed' && !(t.deadline && new Date(t.deadline) < new Date()); });
    var completed = d.deptTasks.filter(function(t){ return t.status === 'completed'; });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">📝 Team Tasks — ' + d.dept + '</div>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'tasks\')">+ Assign New Task</button></div>';

    if (d.deptTasks.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--gray);">No tasks assigned in ' + d.dept + ' yet</div>';
        el.innerHTML = html; return;
    }

    var groups = [
        { label: '🔴 Overdue', items: overdue, cls: 'overdue' },
        { label: '📋 In Progress / Pending', items: pending, cls: '' },
        { label: '✅ Completed', items: completed, cls: 'done' }
    ];

    groups.forEach(function(g) {
        if (g.items.length === 0) return;
        html += '<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">' + g.label + ' (' + g.items.length + ')</div>';
        g.items.forEach(function(t) {
            var isOvd = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
            html += '<div class="task-row ' + (isOvd?'overdue':'') + '">'
                + '<div style="flex:1;min-width:160px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (t.title||'') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
                + '→ ' + (t.assignedTo||'Unassigned')
                + (t.deadline ? ' &nbsp;·&nbsp; Due: ' + APP.formatDate(t.deadline) : '')
                + (t.priority ? ' &nbsp;·&nbsp; ' + t.priority : '')
                + '</div></div>'
                + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status||'pending') + '</span>'
                + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'tasks\')">Edit</button>'
                + '</div>';
        });
        html += '</div>';
    });

    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   CHECKLISTS TAB
══════════════════════════════════════════ */
function _hodChecklists(el) {
    var d = _hodData;
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:16px;">✅ Dept Checklists (' + d.deptChecklists.length + ')</div>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'checklists\')">Manage All</button></div>';

    if (d.deptChecklists.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:32px;">No checklists for ' + d.dept + '</div>';
        el.innerHTML = html; return;
    }

    d.deptChecklists.forEach(function(cl) {
        var total = cl.items ? cl.items.length : 0;
        var done  = cl.items ? cl.items.filter(function(i){ return i.status === 'ok'; }).length : 0;
        var pct   = total > 0 ? Math.round(done/total*100) : 0;
        html += '<div class="task-row" style="flex-wrap:wrap;gap:10px;">'
            + '<div style="flex:1;min-width:200px;">'
            + '<div style="font-size:13px;font-weight:600;">' + (cl.title||'') + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">Assigned to: ' + (cl.assignedTo==='common'?'Everyone':cl.assignedTo) + (cl.deadline?' · Due: '+APP.formatDate(cl.deadline):'') + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;">'
            + '<div class="q-bar" style="flex:1;max-width:200px;"><div class="q-fill" style="width:' + pct + '%;background:' + (pct===100?'var(--success)':pct>=50?'var(--warning)':'var(--danger)') + ';"></div></div>'
            + '<span style="font-size:11px;color:var(--gray);">' + done + '/' + total + '</span>'
            + '</div></div>'
            + '<span class="badge ' + (cl.status==='completed'?'badge-success':'badge-info') + '" style="font-size:11px;">' + (cl.status||'active') + '</span>'
            + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">Open</button>'
            + '</div>';
    });

    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   REQUESTS TAB
══════════════════════════════════════════ */
function _hodRequests(el) {
    var d = _hodData;
    var html = '<div style="font-weight:700;font-size:16px;margin-bottom:14px;">📦 Team Material Requests (' + d.deptRequests.length + ')</div>';

    if (d.deptRequests.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:32px;">No material requests from ' + d.dept + '</div>';
        el.innerHTML = html; return;
    }

    d.deptRequests.slice().reverse().forEach(function(r) {
        var badge = r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning';
        var items = '';
        if (r.items) r.items.forEach(function(i){ items += i.name + ' ×' + i.qty + ', '; });
        html += '<div class="task-row" style="flex-wrap:wrap;gap:8px;">'
            + '<div style="flex:1;min-width:160px;">'
            + '<div style="font-size:13px;font-weight:600;">' + (r.title||'Request') + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
            + 'By: ' + (r.createdBy||'?') + ' &nbsp;·&nbsp; ' + APP.formatDate(r.createdAt)
            + (items ? ' &nbsp;·&nbsp; ' + items.replace(/,\s*$/,'') : '')
            + (r.approvedBy ? ' &nbsp;·&nbsp; Reviewed by: ' + r.approvedBy : '')
            + '</div></div>'
            + '<span class="badge ' + badge + '" style="font-size:11px;">' + (r.status||'pending') + '</span>'
            + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'material-requests\')">Open</button>'
            + '</div>';
    });

    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   PERFORMANCE TAB
══════════════════════════════════════════ */
function _hodPerformance(el) {
    var d = _hodData;

    var html = '<div style="font-weight:700;font-size:16px;margin-bottom:16px;">📊 Team Performance — ' + d.dept + '</div>';

    if (d.team.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:32px;">No team members to analyse</div>';
        el.innerHTML = html; return;
    }

    // Department totals
    var total   = d.deptTasks.length;
    var done    = d.deptTasks.filter(function(t){ return t.status==='completed'; }).length;
    var overdue = d.deptTasks.filter(function(t){ return t.deadline && new Date(t.deadline)<new Date() && t.status!=='completed'; }).length;
    var cleanDone = d.allCleaning.filter(function(t){ return t.status==='done'; }).length;
    var clTotal = d.deptChecklists.length;
    var clDone  = d.deptChecklists.filter(function(c){ return c.status==='completed'; }).length;
    var clPct   = clTotal > 0 ? Math.round(clDone/clTotal*100) : 0;
    var doneRate = total > 0 ? Math.round(done/total*100) : 0;

    // Dept summary bar
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">'
        + _hodStatBox(total, 'Total Tasks', 'var(--text)')
        + _hodStatBox(done, 'Completed', 'var(--success)')
        + _hodStatBox(overdue, 'Overdue', 'var(--danger)')
        + _hodStatBox(cleanDone, 'Rooms Cleaned', '#7b1fa2')
        + _hodStatBox(clDone + '/' + clTotal, 'Checklists Done', 'var(--primary)')
        + _hodStatBox(doneRate + '%', 'Completion Rate', doneRate>=80?'var(--success)':doneRate>=50?'var(--warning)':'var(--danger)')
        + '</div>';

    // Per-member table
    html += '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">Per-Member Breakdown</div>'
        + '<div class="table-responsive"><table><thead><tr><th>Name</th><th>Assigned</th><th>Done</th><th>Overdue</th><th>Rooms Cleaned</th><th>Rate</th></tr></thead><tbody>';

    d.team.forEach(function(m) {
        var mt  = d.deptTasks.filter(function(t){ return t.assignedTo===m.fullName; });
        var md  = mt.filter(function(t){ return t.status==='completed'; }).length;
        var mo  = mt.filter(function(t){ return t.deadline && new Date(t.deadline)<new Date() && t.status!=='completed'; }).length;
        var mc  = d.allCleaning.filter(function(t){ return t.completedBy===m.fullName; }).length;
        var mr  = mt.length > 0 ? Math.round(md/mt.length*100) : 0;
        var bar = '<div style="display:flex;align-items:center;gap:4px;">'
            + '<div class="q-bar" style="width:60px;"><div class="q-fill" style="width:' + mr + '%;background:' + (mr>=80?'var(--success)':mr>=50?'var(--warning)':'var(--danger)') + ';"></div></div>'
            + '<span style="font-size:11px;">' + mr + '%</span></div>';
        html += '<tr><td><strong>' + m.fullName + '</strong></td>'
            + '<td>' + mt.length + '</td>'
            + '<td style="color:var(--success);">' + md + '</td>'
            + '<td style="color:' + (mo>0?'var(--danger)':'var(--gray)') + ';">' + mo + '</td>'
            + '<td style="color:#7b1fa2;">' + mc + '</td>'
            + '<td>' + bar + '</td></tr>';
    });

    html += '</tbody></table></div>';
    el.innerHTML = html;
}

function _hodStatBox(val, label, color) {
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">'
        + '<div style="font-size:22px;font-weight:700;color:' + color + ';">' + val + '</div>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + label + '</div></div>';
}

/* ══════════════════════════════════════════
   REPORT FORM
══════════════════════════════════════════ */
function hodShowReportForm() {
    var user = AUTH.currentUser();
    if (!user) return;
    var html = '<form id="hodReportForm">'
        + '<div class="form-group"><label>Report Title</label><input type="text" name="title" class="form-control" required placeholder="e.g. Weekly Housekeeping Summary"></div>'
        + '<div class="form-group"><label>Period</label><select name="category" class="form-control"><option value="daily">Daily</option><option value="weekly" selected>Weekly</option><option value="monthly">Monthly</option></select></div>'
        + '<div class="form-group"><label>Send To</label><select name="sentTo" class="form-control"><option value="admin">Admin</option><option value="both">Admin & Director</option></select></div>'
        + '<div class="form-group"><label>Summary</label><textarea name="description" class="form-control" rows="5" required placeholder="Summarise team performance, issues, highlights..."></textarea></div>'
        + '</form>';
    openFormModal('Send Report to Admin', html, 'hodSaveReport()', false);
}

function hodSaveReport() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodReportForm');
    if (!data.title || !data.description) { APP.notify('Title and description required', 'error'); return false; }
    data.createdBy = user.username;
    data.createdByName = user.fullName;
    data.department = user.department;
    data.status = 'sent';
    DB.add('reports', data);
    APP.notify('Report sent to admin', 'success');
    Router.navigate('hod-dashboard');
}
