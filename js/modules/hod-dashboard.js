// HOD (Head of Department / In-Charge) Dashboard
// - Uses hodTasks (separate from admin tasks) so work never mixes
// - Uses hodRequests (separate from admin supply chain)
// - All views filtered strictly by user.department — HODs are fully isolated
// - HOD can add team members, assign tasks with TAT, and fulfill admin checklists

(function () {
    var s = document.createElement('style');
    s.textContent = [
        '.hod-tab-btn{padding:9px 18px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--gray);border-bottom:3px solid transparent;transition:0.2s;white-space:nowrap;}',
        '.hod-tab-btn.active{color:#6a1b9a;border-bottom-color:#6a1b9a;font-weight:700;}',
        '.hod-tab-btn:hover:not(.active){color:var(--text);background:var(--light-gray);}',
        '.hod-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:.15s;}',
        '.hod-kpi:hover{box-shadow:0 2px 8px rgba(0,0,0,.1);}',
        '.hod-kpi-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
        '.hod-kpi-val{font-size:22px;font-weight:700;line-height:1;}',
        '.hod-kpi-lbl{font-size:11px;color:var(--gray);margin-top:2px;}',
        '.hod-task-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;}',
        '.hod-task-card.overdue{border-left:4px solid var(--danger);}',
        '.hod-task-card.over-tat{border-left:4px solid #ff6f00;}',
        '.hod-task-card.done{opacity:.65;}',
        '.tat-bar{height:5px;border-radius:3px;background:var(--light-gray);overflow:hidden;margin-top:4px;}',
        '.tat-fill{height:100%;border-radius:3px;transition:width .4s;}',
        '.member-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;border:1px solid var(--border);cursor:pointer;font-size:12px;background:var(--card);transition:.15s;margin:2px;}',
        '.member-chip:hover,.member-chip.selected{background:#6a1b9a;color:#fff;border-color:#6a1b9a;}',
        '.hq-bar{background:var(--light-gray);border-radius:4px;height:7px;overflow:hidden;}',
        '.hq-fill{height:100%;border-radius:4px;}',
        '.member-card2{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;}',
    ].join('');
    document.head.appendChild(s);
})();

var _hodTab    = 'overview';
var _hodData   = {};
var _hodFilter = 'all';

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function _getHodTeam(user) {
    var allUsers = DB.get('users') || [];
    return allUsers.filter(function (m) {
        return m.department === user.department &&
               m.role !== 'admin' && m.role !== 'super_admin' &&
               m.username !== user.username;
    });
}

function _tatInfo(task) {
    if (!task.tat || !task.createdAt) return null;
    var created     = new Date(task.createdAt);
    var now         = new Date();
    var elapsed     = (now - created) / 3600000; // hours
    var tatH        = parseFloat(task.tat);
    var pct         = Math.min(100, Math.round(elapsed / tatH * 100));
    var overTAT     = elapsed > tatH && task.status !== 'completed';
    var color       = task.status === 'completed' ? 'var(--success)'
                    : overTAT ? 'var(--danger)'
                    : pct > 80 ? '#ff6f00' : 'var(--success)';
    var remaining   = tatH - elapsed;
    var label       = task.status === 'completed'
                    ? 'Done (' + elapsed.toFixed(1) + 'h)'
                    : overTAT
                    ? Math.abs(remaining).toFixed(1) + 'h over TAT'
                    : remaining.toFixed(1) + 'h left';
    return { pct: pct, color: color, label: label, overTAT: overTAT, elapsed: elapsed, tatH: tatH };
}

function _tatBar(task) {
    var t = _tatInfo(task);
    if (!t) return '';
    return '<div style="margin-top:6px;">'
        + '<div style="display:flex;justify-content:space-between;font-size:10px;color:' + t.color + ';margin-bottom:2px;">'
        + '<span>TAT ' + task.tat + 'h</span><span>' + t.label + '</span></div>'
        + '<div class="tat-bar"><div class="tat-fill" style="width:' + t.pct + '%;background:' + t.color + ';"></div></div></div>';
}

function _avatar(name, size) {
    size = size || 36;
    var init = (name || '?').split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();
    var palette = ['#e91e63','#9c27b0','#3f51b5','#009688','#ff5722','#795548','#00acc1','#43a047'];
    var bg = palette[(name || '').charCodeAt(0) % palette.length];
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + bg + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.38) + 'px;font-weight:700;flex-shrink:0;">' + init + '</div>';
}

/* ═══════════════════════════════════════════════
   MAIN RENDER
═══════════════════════════════════════════════ */
function renderHodDashboard(container) {
    var user = AUTH.currentUser();
    if (!user) { container.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || '';
    var u    = user.fullName || user.username;

    var team        = _getHodTeam(user);
    var teamNames   = team.map(function (m) { return m.fullName; });

    // HOD's own tasks (dept-scoped, created by this HOD)
    var allHodTasks = DB.get('hodTasks') || [];
    var myTasks     = allHodTasks.filter(function (t) { return t.department === dept; });

    // Checklists assigned to this dept by admin
    var allCl       = DB.get('checklists') || [];
    var myCl        = allCl.filter(function (c) { return c.department === dept || c.assignedTo === 'common'; });

    // HOD material requests for this dept
    var allReqs     = DB.get('hodRequests') || [];
    var myReqs      = allReqs.filter(function (r) { return r.department === dept; });

    // Admissions for this dept context
    var allAdm      = DB.get('admissions') || [];
    var cleaning    = (DB.get('roomCleaningTasks') || []).filter(function (t) { return t.status !== 'done'; });

    _hodData = {
        user: user, dept: dept, u: u,
        team: team, teamNames: teamNames,
        myTasks: myTasks,
        pendingTasks:   myTasks.filter(function (t) { return t.status !== 'completed'; }),
        overdueTasks:   myTasks.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }),
        overTatTasks:   myTasks.filter(function (t) {
            var ti = _tatInfo(t);
            return ti && ti.overTAT && t.status !== 'completed';
        }),
        myCl: myCl,
        myReqs: myReqs,
        cleaning: cleaning,
        allAdm: allAdm
    };

    var pendingCl  = myCl.filter(function (c) { return c.status !== 'completed'; }).length;
    var pendingReq = myReqs.filter(function (r) { return r.status === 'pending'; }).length;

    var tabs = [
        { id: 'overview',    label: '📊 Overview' },
        { id: 'admissions',  label: '🏥 Admissions' },
        { id: 'tasks',       label: '📝 Team Tasks', badge: _hodData.overdueTasks.length, bc: 'badge-danger' },
        { id: 'team',        label: '👥 My Team (' + team.length + ')' },
        { id: 'checklists',  label: '✅ Checklists', badge: pendingCl, bc: 'badge-info' },
        { id: 'requests',    label: '📦 Requests', badge: pendingReq, bc: 'badge-warning' },
        { id: 'performance', label: '📊 Performance' }
    ];

    var html = ''
        + '<div style="background:linear-gradient(135deg,#6a1b9a,#4a148c);border-radius:14px;padding:20px 24px;color:#fff;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">'
        + '<div style="display:flex;align-items:center;gap:14px;">'
        + '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:26px;">👔</div>'
        + '<div><div style="font-size:20px;font-weight:700;">' + u + '</div>'
        + '<div style="font-size:13px;opacity:.85;">' + (dept || 'No Department') + ' In-Charge (HOD)</div></div></div>'
        + '<div style="text-align:right;font-size:12px;opacity:.8;">'
        + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        + '<div style="margin-top:2px;">Team: ' + team.length + ' member' + (team.length !== 1 ? 's' : '') + '</div></div></div>'

        // KPI strip
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + _hKpi('👥', 'Team',           team.length,                         '#f3e5f5', '#6a1b9a', 'team')
        + _hKpi('📝', 'Pending Tasks',  _hodData.pendingTasks.length,         '#fff3e0', '#e65100', 'tasks')
        + _hKpi('⚠️', 'Overdue',        _hodData.overdueTasks.length,         '#ffebee', 'var(--danger)', 'tasks')
        + _hKpi('⏱️', 'Over TAT',       _hodData.overTatTasks.length,         '#fff8e1', '#ff6f00', 'tasks')
        + _hKpi('✅', 'Checklists Due', pendingCl,                            '#e8f5e9', 'var(--secondary)', 'checklists')
        + _hKpi('🧹', 'Rooms to Clean', cleaning.length,                      '#fce4ec', 'var(--danger)', 'admissions')
        + '</div>'

        // Cleaning / overdue alert
        + (_hodData.overdueTasks.length > 0
            ? '<div style="background:#ffebee;border:1px solid var(--danger);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
              + '<span style="font-size:13px;font-weight:600;color:var(--danger);">⚠️ ' + _hodData.overdueTasks.length + ' overdue task(s) in your team</span>'
              + '<button class="btn btn-sm btn-danger" onclick="hodTabSwitch(\'tasks\')">View</button></div>'
            : '')
        + (cleaning.length > 0
            ? '<div style="background:#fff3e0;border:1px solid var(--warning);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;" onclick="hodTabSwitch(\'admissions\')">'
              + '<span style="font-size:13px;font-weight:600;color:#e65100;">🧹 ' + cleaning.length + ' room(s) awaiting cleaning</span>'
              + '<button class="btn btn-sm btn-warning" style="color:#fff;">Manage</button></div>'
            : '')

        // Tab bar
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px 12px 0 0;padding:0 4px;display:flex;overflow-x:auto;border-bottom:none;">'
        + tabs.map(function (t) {
            var lbl = t.label + (t.badge ? ' <span class="badge ' + (t.bc || 'badge-primary') + '" style="font-size:10px;margin-left:2px;">' + t.badge + '</span>' : '');
            return '<button class="hod-tab-btn' + (t.id === 'overview' ? ' active' : '') + '" data-tab="' + t.id + '" onclick="hodTabSwitch(\'' + t.id + '\')">' + lbl + '</button>';
        }).join('')
        + '</div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-top:3px solid #6a1b9a;border-radius:0 0 12px 12px;padding:18px;" id="hodTabContent"></div>';

    container.innerHTML = html;
    _hodTab = 'overview';
    _renderHodTab('overview');
}

function _hKpi(icon, label, val, bg, color, tab) {
    return '<div class="hod-kpi" onclick="hodTabSwitch(\'' + tab + '\')">'
        + '<div class="hod-kpi-icon" style="background:' + bg + ';">' + icon + '</div>'
        + '<div><div class="hod-kpi-val" style="color:' + color + ';">' + val + '</div><div class="hod-kpi-lbl">' + label + '</div></div></div>';
}

function hodTabSwitch(tab) {
    _hodTab = tab;
    document.querySelectorAll('.hod-tab-btn').forEach(function (el) {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    _renderHodTab(tab);
}

function _renderHodTab(tab) {
    var el = document.getElementById('hodTabContent');
    if (!el) return;
    ({ overview: _hodOverview, admissions: _hodAdmissions, tasks: _hodTasks,
       team: _hodTeam, checklists: _hodChecklists, requests: _hodRequests,
       performance: _hodPerformance })[tab]
        ? ({ overview: _hodOverview, admissions: _hodAdmissions, tasks: _hodTasks,
             team: _hodTeam, checklists: _hodChecklists, requests: _hodRequests,
             performance: _hodPerformance })[tab](el) : null;
}

/* ═══════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════ */
function _hodOverview(el) {
    var d = _hodData;
    var urgent = d.pendingTasks.filter(function (t) {
        var ti = _tatInfo(t);
        var isToday = t.deadline && (function() {
            var dd = new Date(t.deadline), n = new Date();
            return dd.toDateString() === n.toDateString();
        })();
        return isToday || (ti && ti.overTAT);
    }).slice(0, 5);

    var html = '<div class="grid-2" style="gap:16px;">'

        // Left: urgent work
        + '<div><div style="font-weight:700;font-size:14px;margin-bottom:10px;">🎯 Urgent Today</div>';
    if (urgent.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:16px;text-align:center;font-size:13px;color:var(--gray);">Nothing urgent right now ✓</div>';
    } else {
        urgent.forEach(function (t) {
            var ti = _tatInfo(t);
            html += '<div class="hod-task-card ' + (d.overdueTasks.indexOf(t) >= 0 ? 'overdue' : ti && ti.overTAT ? 'over-tat' : '') + '">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;">'
                + '<strong style="font-size:13px;">' + t.title + '</strong>'
                + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:10px;">' + (t.status || 'pending') + '</span></div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">→ ' + (t.assignedTo || 'Unassigned') + (t.deadline ? ' · Due: ' + APP.formatDate(t.deadline) : '') + '</div>'
                + _tatBar(t) + '</div>';
        });
    }
    html += '</div>'

        // Right: team snapshot
        + '<div><div style="font-weight:700;font-size:14px;margin-bottom:10px;">👥 Team Status</div>';
    if (d.team.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:16px;font-size:13px;color:var(--gray);">No team members yet. Go to <strong>My Team</strong> tab to add members.</div>';
    } else {
        d.team.forEach(function (m) {
            var mt   = d.myTasks.filter(function (t) { return t.assignedTo === m.fullName; });
            var done = mt.filter(function (t) { return t.status === 'completed'; }).length;
            var ovd  = mt.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
            var otat = mt.filter(function (t) { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; }).length;
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:var(--light-gray);margin-bottom:6px;">'
                + _avatar(m.fullName, 32)
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:13px;font-weight:600;">' + m.fullName + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + mt.length + ' tasks · ' + done + ' done'
                + (ovd > 0 ? ' · <span style="color:var(--danger);">' + ovd + ' overdue</span>' : '')
                + (otat > 0 ? ' · <span style="color:#ff6f00;">' + otat + ' over TAT</span>' : '') + '</div></div>'
                + '<span class="badge ' + (ovd > 0 ? 'badge-danger' : otat > 0 ? 'badge-warning' : 'badge-success') + '" style="font-size:10px;">'
                + (ovd > 0 ? '⚠️' : otat > 0 ? '⏱' : '✓') + '</span>'
                + '</div>';
        });
    }
    html += '</div></div>'

        // Quick actions
        + '<div style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px;">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">⚡ Quick Actions</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:8px;">'
        + '<button class="btn btn-primary" onclick="hodCreateTask()">📝 Assign Task</button>'
        + '<button class="btn btn-outline" onclick="hodTabSwitch(\'admissions\')">🏥 Admissions</button>'
        + '<button class="btn btn-outline" onclick="hodTabSwitch(\'team\')">👥 Add Member</button>'
        + '<button class="btn btn-outline" onclick="hodCreateRequest()">📦 Material Request</button>'
        + '<button class="btn btn-outline" onclick="hodShowReportForm()">📋 Send Report</button>'
        + '</div></div>';

    el.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   ADMISSIONS TAB
═══════════════════════════════════════════════ */
function _hodAdmissions(el) {
    var cleaning = _hodData.cleaning;
    var html = '<div style="margin-bottom:16px;">'
        + '<div style="font-weight:700;font-size:16px;margin-bottom:4px;">🏥 Admissions & Discharges</div>'
        + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Manage patient admissions and discharges from the main Admissions module.</div>'
        + '<button class="btn btn-primary" style="margin-right:8px;" onclick="Router.navigate(\'admissions\')">Open Admissions Module →</button>'
        + '</div>'

        + '<div style="border-top:1px solid var(--border);padding-top:16px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">🧹 Room Cleaning Queue (' + cleaning.length + ')</div>';

    if (cleaning.length === 0) {
        html += '<div style="background:#e8f5e9;border-radius:8px;padding:14px;text-align:center;font-size:13px;">All rooms are clean ✓</div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;">';
        cleaning.forEach(function (t) {
            var since  = t.dischargedAt ? Math.max(0, APP.daysBetween(t.dischargedAt, new Date().toISOString())) : 0;
            html += '<div style="background:' + (since >= 1 ? '#ffebee' : '#fff8e1') + ';border:2px solid ' + (since >= 1 ? 'var(--danger)' : 'var(--warning)') + ';border-radius:10px;padding:12px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
                + '<strong style="font-size:16px;">Room ' + t.roomNo + '</strong>'
                + '<span class="badge ' + (t.status === 'in-progress' ? 'badge-info' : 'badge-warning') + '">' + t.status + '</span></div>'
                + '<div style="font-size:12px;color:var(--gray);">' + (t.floor ? 'Fl ' + t.floor + ' · ' : '') + (t.category || '') + '</div>'
                + '<div style="font-size:12px;margin:4px 0;">👤 ' + t.patientName + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">'
                + 'Discharged: ' + (t.dischargedAt ? new Date(t.dischargedAt).toLocaleDateString('en-IN') : '—')
                + (since > 0 ? ' · <span style="color:var(--danger);font-weight:600;">' + since + 'd ago</span>' : ' · Today') + '</div>'

                // Assign to team member
                + '<div style="margin-top:8px;">'
                + '<div style="font-size:10px;font-weight:600;color:var(--gray);margin-bottom:4px;">ASSIGN TO:</div>'
                + '<div style="display:flex;flex-wrap:wrap;gap:3px;">'
                + (_hodData.team.length === 0
                    ? '<span style="font-size:12px;color:var(--gray);">No team members</span>'
                    : _hodData.team.map(function (m) {
                        var sel = t.assignedTo === m.fullName;
                        return '<span class="member-chip' + (sel ? ' selected' : '') + '" onclick="hodAssignCleaning(\'' + t.id + '\',\'' + m.fullName.replace(/'/g, "\\'") + '\')">' + m.fullName.split(' ')[0] + '</span>';
                    }).join(''))
                + '</div></div>'

                + '<div style="display:flex;gap:6px;margin-top:8px;">'
                + (t.status === 'pending' ? '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="hodCleanStart(\'' + t.id + '\')">▶ Start</button>' : '')
                + '<button class="btn btn-sm btn-success" onclick="hodCleanDone(\'' + t.id + '\')">✅ Mark Clean</button>'
                + '</div></div>';
        });
        html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

function hodAssignCleaning(taskId, memberName) {
    DB.update('roomCleaningTasks', taskId, { assignedTo: memberName });
    APP.notify('Assigned to ' + memberName, 'success');
    _renderHodTab('admissions');
}
function hodCleanStart(taskId) {
    var user = AUTH.currentUser();
    DB.update('roomCleaningTasks', taskId, { status: 'in-progress', startedAt: new Date().toISOString(), startedBy: user ? user.fullName : '' });
    APP.notify('Marked in-progress', 'info');
    _renderHodTab('admissions');
}
function hodCleanDone(taskId) {
    var user = AUTH.currentUser();
    var task = DB.getById('roomCleaningTasks', taskId);
    DB.update('roomCleaningTasks', taskId, { status: 'done', completedAt: new Date().toISOString(), completedBy: user ? user.fullName : 'HOD' });
    if (task) {
        var ov = DB.get('roomStatus') || [];
        DB.set('roomStatus', ov.filter(function (r) { return r.roomNo !== task.roomNo; }));
    }
    APP.notify('Room ' + (task ? task.roomNo : '') + ' now available!', 'success');
    _hodData.cleaning = (DB.get('roomCleaningTasks') || []).filter(function (t) { return t.status !== 'done'; });
    _renderHodTab('admissions');
}

/* ═══════════════════════════════════════════════
   TASKS TAB — HOD-created tasks only
═══════════════════════════════════════════════ */
function _hodTasks(el) {
    var d   = _hodData;
    var all = d.myTasks;

    var filters = [
        { id: 'all',       label: 'All (' + all.length + ')' },
        { id: 'pending',   label: 'Pending' },
        { id: 'inprogress',label: 'In Progress' },
        { id: 'overdue',   label: 'Overdue' },
        { id: 'over-tat',  label: 'Over TAT' },
        { id: 'done',      label: 'Completed' }
    ];

    var filtered = all.filter(function (t) {
        if (_hodFilter === 'all')        return true;
        if (_hodFilter === 'pending')    return t.status === 'pending';
        if (_hodFilter === 'inprogress') return t.status === 'in-progress';
        if (_hodFilter === 'overdue')    return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
        if (_hodFilter === 'over-tat')   { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; }
        if (_hodFilter === 'done')       return t.status === 'completed';
        return true;
    });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">📝 Team Tasks</div>'
        + '<button class="btn btn-primary btn-sm" onclick="hodCreateTask()">+ Assign Task</button></div>'

        + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px;">'
        + filters.map(function (f) {
            return '<button class="tab-btn' + (f.id === _hodFilter ? ' active' : '') + '" onclick="hodTaskFilter(\'' + f.id + '\',this)">' + f.label + '</button>';
        }).join('') + '</div>';

    if (filtered.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--gray);font-size:13px;">No tasks in this category</div>';
    } else {
        filtered.forEach(function (t) {
            var ti       = _tatInfo(t);
            var isOvd    = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
            var isOvTat  = ti && ti.overTAT && t.status !== 'completed';
            var cls      = t.status === 'completed' ? 'done' : isOvd ? 'overdue' : isOvTat ? 'over-tat' : '';
            html += '<div class="hod-task-card ' + cls + '">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:14px;font-weight:700;">' + t.title + '</div>'
                + (t.description ? '<div style="font-size:12px;color:var(--gray);margin-top:2px;">' + t.description.substring(0, 80) + (t.description.length > 80 ? '…' : '') + '</div>' : '')
                + '<div style="font-size:11px;color:var(--gray);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px;">'
                + '<span>→ <strong>' + (t.assignedTo || 'Unassigned') + '</strong></span>'
                + (t.priority ? '<span class="badge ' + (t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info') + '" style="font-size:10px;">' + t.priority + '</span>' : '')
                + (t.deadline ? '<span>📅 ' + APP.formatDate(t.deadline) + '</span>' : '')
                + '</div>'
                + _tatBar(t)
                + '</div>'
                + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">'
                + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status || 'pending') + '</span>'
                + '<button class="btn btn-sm btn-outline" onclick="hodEditTask(\'' + t.id + '\')">Edit</button>'
                + (t.status !== 'completed' ? '<button class="btn btn-sm btn-success" style="font-size:11px;" onclick="hodMarkTaskDone(\'' + t.id + '\')">✓ Done</button>' : '')
                + '</div></div></div>';
        });
    }

    el.innerHTML = html;
}

function hodTaskFilter(f, btn) {
    _hodFilter = f;
    if (btn && btn.parentNode) {
        btn.parentNode.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
    }
    _renderHodTab('tasks');
}

function hodMarkTaskDone(taskId) {
    DB.update('hodTasks', taskId, { status: 'completed', completedAt: new Date().toISOString() });
    APP.notify('Task marked complete', 'success');
    _hodData.myTasks = (DB.get('hodTasks') || []).filter(function (t) { return t.department === _hodData.dept; });
    _hodData.pendingTasks = _hodData.myTasks.filter(function (t) { return t.status !== 'completed'; });
    _hodData.overdueTasks = _hodData.myTasks.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; });
    _renderHodTab('tasks');
}

/* ─ Create / Edit Task ─ */
function hodCreateTask() {
    var team = _hodData.team;
    var form = '<form id="hodTaskForm">'
        + '<div class="form-group"><label>Task Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Clean OT corridor"></div>'
        + '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="2" placeholder="Optional details"></textarea></div>'
        + '<div class="form-group"><label>Assign To *</label><select name="assignedTo" class="form-control" required>'
        + '<option value="">-- Select team member --</option>'
        + team.map(function (m) { return '<option value="' + m.fullName + '">' + m.fullName + '</option>'; }).join('')
        + '</select></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Priority</label><select name="priority" class="form-control"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>'
        + '<div class="form-group"><label>TAT (target hours)</label><input type="number" name="tat" class="form-control" min="0.5" step="0.5" placeholder="e.g. 4"></div>'
        + '</div>'
        + '<div class="form-group"><label>Deadline</label><input type="datetime-local" name="deadline" class="form-control"></div>'
        + '</form>';
    openFormModal('Assign Task to Team Member', form, 'hodSaveTask()', false);
}

function hodSaveTask() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodTaskForm');
    if (!data.title || !data.assignedTo) { APP.notify('Title and assignee required', 'error'); return false; }
    data.department   = user.department;
    data.createdBy    = user.fullName;
    data.createdByRole = 'hod';
    data.status       = 'pending';
    data.createdAt    = new Date().toISOString();
    if (data.tat) data.tat = parseFloat(data.tat);
    DB.add('hodTasks', data);
    APP.notify('Task assigned to ' + data.assignedTo, 'success');
    _hodData.myTasks = (DB.get('hodTasks') || []).filter(function (t) { return t.department === user.department; });
    _hodData.pendingTasks = _hodData.myTasks.filter(function (t) { return t.status !== 'completed'; });
    _renderHodTab('tasks');
    return true;
}

function hodEditTask(taskId) {
    var task = DB.getById('hodTasks', taskId);
    if (!task) return;
    var team = _hodData.team;
    var dl   = task.deadline ? task.deadline.substring(0, 16) : '';
    var form = '<form id="hodTaskEditForm">'
        + '<div class="form-group"><label>Task Title *</label><input type="text" name="title" class="form-control" required value="' + (task.title || '') + '"></div>'
        + '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="2">' + (task.description || '') + '</textarea></div>'
        + '<div class="form-group"><label>Assign To *</label><select name="assignedTo" class="form-control">'
        + team.map(function (m) { return '<option value="' + m.fullName + '"' + (m.fullName === task.assignedTo ? ' selected' : '') + '>' + m.fullName + '</option>'; }).join('')
        + '</select></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Status</label><select name="status" class="form-control">'
        + ['pending','in-progress','completed'].map(function (s) { return '<option value="' + s + '"' + (s === task.status ? ' selected' : '') + '>' + s + '</option>'; }).join('')
        + '</select></div>'
        + '<div class="form-group"><label>Priority</label><select name="priority" class="form-control">'
        + ['low','medium','high'].map(function (p) { return '<option value="' + p + '"' + (p === task.priority ? ' selected' : '') + '>' + p + '</option>'; }).join('')
        + '</select></div></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>TAT (hours)</label><input type="number" name="tat" class="form-control" value="' + (task.tat || '') + '" min="0.5" step="0.5"></div>'
        + '<div class="form-group"><label>Deadline</label><input type="datetime-local" name="deadline" class="form-control" value="' + dl + '"></div></div>'
        + '</form>';
    openFormModal('Edit Task', form, 'hodUpdateTask(\'' + taskId + '\')', false);
}

function hodUpdateTask(taskId) {
    var data = getFormData('hodTaskEditForm');
    if (!data.title) { APP.notify('Title required', 'error'); return false; }
    if (data.tat) data.tat = parseFloat(data.tat);
    DB.update('hodTasks', taskId, data);
    APP.notify('Task updated', 'success');
    var user = AUTH.currentUser();
    _hodData.myTasks = (DB.get('hodTasks') || []).filter(function (t) { return t.department === (user ? user.department : ''); });
    _hodData.pendingTasks = _hodData.myTasks.filter(function (t) { return t.status !== 'completed'; });
    _hodData.overdueTasks = _hodData.myTasks.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; });
    _renderHodTab('tasks');
    return true;
}

/* ═══════════════════════════════════════════════
   MY TEAM TAB — view + add members
═══════════════════════════════════════════════ */
function _hodTeam(el) {
    var d    = _hodData;
    var team = d.team;
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">👥 My Team — ' + d.dept + ' (' + team.length + ' members)</div>'
        + '<button class="btn btn-primary btn-sm" onclick="hodAddMember()">+ Add Member</button></div>';

    if (team.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">👥</div>'
            + '<div style="font-weight:600;margin-bottom:6px;">No team members yet</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Add employees to your department to assign them tasks.</div>'
            + '<button class="btn btn-primary" onclick="hodAddMember()">+ Add First Member</button></div>';
    } else {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">';
        team.forEach(function (m) {
            var mt   = d.myTasks.filter(function (t) { return t.assignedTo === m.fullName; });
            var done = mt.filter(function (t) { return t.status === 'completed'; }).length;
            var ovd  = mt.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
            var otat = mt.filter(function (t) { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; }).length;
            var rate = mt.length > 0 ? Math.round(done / mt.length * 100) : 0;
            html += '<div class="member-card2">'
                + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
                + _avatar(m.fullName, 40)
                + '<div><div style="font-size:14px;font-weight:700;">' + m.fullName + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + (m.role || 'employee').replace(/_/g, ' ')
                + (m.phone ? ' · ' + m.phone : '') + '</div></div></div>'
                + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;font-size:12px;text-align:center;">'
                + '<div style="background:var(--light-gray);border-radius:6px;padding:6px;"><div style="font-weight:700;">' + mt.length + '</div><div style="color:var(--gray);">Assigned</div></div>'
                + '<div style="background:var(--light-gray);border-radius:6px;padding:6px;"><div style="font-weight:700;color:var(--success);">' + done + '</div><div style="color:var(--gray);">Done</div></div>'
                + '<div style="background:var(--light-gray);border-radius:6px;padding:6px;"><div style="font-weight:700;color:' + (ovd > 0 ? 'var(--danger)' : 'var(--gray)') + ';">' + ovd + '</div><div style="color:var(--gray);">Overdue</div></div>'
                + '</div>'
                + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">'
                + '<div class="hq-bar" style="flex:1;"><div class="hq-fill" style="width:' + rate + '%;background:' + (rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)') + ';"></div></div>'
                + '<span style="font-size:11px;color:var(--gray);min-width:32px;">' + rate + '%</span></div>'
                + '<div style="display:flex;gap:6px;">'
                + '<button class="btn btn-sm btn-primary" onclick="hodCreateTaskFor(\'' + m.fullName.replace(/'/g, "\\'") + '\')">📝 Assign Task</button>'
                + '<button class="btn btn-sm btn-outline" onclick="hodRemoveMember(\'' + m.username + '\',\'' + m.fullName.replace(/'/g, "\\'") + '\')">Remove</button>'
                + '</div></div>';
        });
        html += '</div>';
    }
    el.innerHTML = html;
}

function hodAddMember() {
    var user  = AUTH.currentUser();
    var isAdmin = user && (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin');
    var depts  = DB.get('departments') || [];

    // Department field: admin gets a dropdown; HOD gets a locked display
    var deptField;
    if (isAdmin) {
        var opts = depts.filter(function(d){ return d.active !== false; })
                        .map(function(d){ return '<option value="' + d.name + '">' + d.name + '</option>'; }).join('');
        deptField = '<div class="form-group"><label>Department *</label>'
            + '<select name="department" class="form-control" required>'
            + '<option value="">-- Select Department --</option>' + opts
            + '</select></div>';
    } else {
        deptField = '<input type="hidden" name="department" value="' + (user ? user.department : '') + '">'
            + '<div style="background:#f3e5f5;border-radius:6px;padding:8px 12px;font-size:12px;color:#6a1b9a;margin-top:4px;">'
            + '👔 Department: <strong>' + (user ? user.department : '') + '</strong> · Role: <strong>Employee</strong></div>';
    }

    var form = '<form id="hodMemberForm">'
        + '<div class="form-group"><label>Full Name *</label><input type="text" name="fullName" class="form-control" required></div>'
        + '<div class="form-group"><label>Username *</label><input type="text" name="username" class="form-control" required placeholder="login username"></div>'
        + '<div class="form-group"><label>Password *</label><input type="password" name="password" class="form-control" required></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Phone</label><input type="text" name="phone" class="form-control"></div>'
        + '<div class="form-group"><label>Email</label><input type="email" name="email" class="form-control"></div>'
        + '</div>'
        + deptField
        + '</form>';
    openFormModal('Add Team Member', form, 'hodSaveMember()', false);
}

function hodSaveMember() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodMemberForm');
    if (!data.fullName || !data.username || !data.password) {
        APP.notify('Name, username and password required', 'error'); return false;
    }
    // Admin picks dept from form; HOD always uses their own dept
    var targetDept = data.department || user.department;
    if (!targetDept) { APP.notify('Department is required', 'error'); return false; }

    var users = DB.get('users') || [];
    if (users.find(function (u) { return u.username === data.username; })) {
        APP.notify('Username already exists', 'error'); return false;
    }
    var rights = DB.get('featureRights') || [];
    var empPerms = rights.filter(function (p) {
        return ['tasks','problems','checklists','material-requests','suggestions','employee-dashboard','complaints'].indexOf(p) !== -1;
    });
    users.push({
        id: Date.now().toString(),
        fullName:    data.fullName,
        username:    data.username,
        password:    data.password,
        phone:       data.phone || '',
        email:       data.email || '',
        role:        'employee',
        department:  targetDept,
        permissions: empPerms,
        createdBy:   user.username,
        createdAt:   new Date().toISOString()
    });
    DB.set('users', users);
    APP.notify(data.fullName + ' added to ' + targetDept, 'success');
    _hodData.team = _getHodTeam(user);
    _hodData.teamNames = _hodData.team.map(function (m) { return m.fullName; });
    _renderHodTab('team');
    return true;
}

function hodCreateTaskFor(memberName) {
    var team = _hodData.team;
    var form = '<form id="hodTaskForm">'
        + '<div class="form-group"><label>Task Title *</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="2"></textarea></div>'
        + '<div class="form-group"><label>Assign To</label><select name="assignedTo" class="form-control">'
        + team.map(function (m) { return '<option value="' + m.fullName + '"' + (m.fullName === memberName ? ' selected' : '') + '>' + m.fullName + '</option>'; }).join('')
        + '</select></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Priority</label><select name="priority" class="form-control"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>'
        + '<div class="form-group"><label>TAT (hours)</label><input type="number" name="tat" class="form-control" min="0.5" step="0.5" placeholder="e.g. 4"></div>'
        + '</div>'
        + '<div class="form-group"><label>Deadline</label><input type="datetime-local" name="deadline" class="form-control"></div>'
        + '</form>';
    openFormModal('Assign Task to ' + memberName, form, 'hodSaveTask()', false);
}

function hodRemoveMember(username, fullName) {
    if (!confirm('Remove ' + fullName + ' from your team? This will not delete their tasks.')) return;
    var users = DB.get('users') || [];
    DB.set('users', users.filter(function (u) { return u.username !== username; }));
    APP.notify(fullName + ' removed from team', 'info');
    var user = AUTH.currentUser();
    _hodData.team = _getHodTeam(user);
    _hodData.teamNames = _hodData.team.map(function (m) { return m.fullName; });
    _renderHodTab('team');
}

/* ═══════════════════════════════════════════════
   CHECKLISTS TAB — from admin, fulfilled by HOD
═══════════════════════════════════════════════ */
function _hodChecklists(el) {
    var d   = _hodData;
    var cls = d.myCl;
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div>'
        + '<div style="font-weight:700;font-size:16px;">✅ Checklists — ' + d.dept + '</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">Checklists assigned by Admin to your department</div>'
        + '</div>'
        + '<a class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">Manage →</a></div>';

    if (cls.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;font-size:13px;color:var(--gray);">No checklists assigned to ' + d.dept + ' yet.<br>Admin will assign checklists that will appear here.</div>';
    } else {
        var pending   = cls.filter(function (c) { return c.status !== 'completed'; });
        var completed = cls.filter(function (c) { return c.status === 'completed'; });
        if (pending.length > 0) {
            html += '<div style="font-size:12px;font-weight:700;color:var(--gray);text-transform:uppercase;margin-bottom:8px;">Pending (' + pending.length + ')</div>';
            pending.forEach(function (cl) { html += _clCard(cl); });
        }
        if (completed.length > 0) {
            html += '<div style="font-size:12px;font-weight:700;color:var(--gray);text-transform:uppercase;margin:16px 0 8px;">Completed (' + completed.length + ')</div>';
            completed.forEach(function (cl) { html += _clCard(cl); });
        }
    }
    el.innerHTML = html;
}

function _clCard(cl) {
    var total = cl.items ? cl.items.length : 0;
    var done  = cl.items ? cl.items.filter(function (i) { return i.status === 'ok'; }).length : 0;
    var pct   = total > 0 ? Math.round(done / total * 100) : 0;
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<div><div style="font-size:14px;font-weight:700;">' + (cl.title || '') + '</div>'
        + (cl.deadline ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">Due: ' + APP.formatDate(cl.deadline) + '</div>' : '')
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span class="badge ' + (cl.status === 'completed' ? 'badge-success' : 'badge-info') + '" style="font-size:11px;">' + (cl.status || 'active') + '</span>'
        + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">Open</button></div></div>'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<div class="hq-bar" style="flex:1;"><div class="hq-fill" style="width:' + pct + '%;background:' + (pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)') + ';"></div></div>'
        + '<span style="font-size:12px;color:var(--gray);">' + done + '/' + total + ' items</span></div>'
        + '</div>';
}

/* ═══════════════════════════════════════════════
   REQUESTS TAB — HOD's own material requests
═══════════════════════════════════════════════ */
function _hodRequests(el) {
    var d    = _hodData;
    var reqs = d.myReqs;
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:16px;">📦 Material Requests</div>'
        + '<div style="font-size:12px;color:var(--gray);">Requests submitted to Admin for ' + d.dept + '</div></div>'
        + '<button class="btn btn-primary btn-sm" onclick="hodCreateRequest()">+ New Request</button></div>';

    if (reqs.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:10px;">No requests yet. Click + New Request to submit one.</div>'
            + '<button class="btn btn-primary" onclick="hodCreateRequest()">+ New Request</button></div>';
    } else {
        reqs.slice().reverse().forEach(function (r) {
            var badge = r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning';
            var items = '';
            if (r.items) r.items.forEach(function (i) { items += i.name + ' ×' + i.qty + ', '; });
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
                + '<div><div style="font-size:14px;font-weight:700;">' + (r.title || 'Request') + '</div>'
                + (items ? '<div style="font-size:12px;color:var(--gray);margin-top:2px;">' + items.replace(/,\s*$/, '') + '</div>' : '')
                + '<div style="font-size:11px;color:var(--gray);margin-top:4px;">'
                + APP.formatDate(r.createdAt)
                + (r.approvedBy ? ' · Reviewed by: ' + r.approvedBy : '')
                + (r.notes ? ' · Note: ' + r.notes : '') + '</div>'
                + (r.reason ? '<div style="font-size:12px;margin-top:4px;color:var(--text);">Reason: ' + r.reason + '</div>' : '')
                + '</div>'
                + '<span class="badge ' + badge + '" style="font-size:12px;padding:6px 10px;">' + (r.status || 'pending') + '</span></div></div>';
        });
    }
    el.innerHTML = html;
}

function hodCreateRequest() {
    var form = '<form id="hodReqForm">'
        + '<div class="form-group"><label>Request Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Cleaning supplies for Q3"></div>'
        + '<div class="form-group"><label>Reason / Justification</label><textarea name="reason" class="form-control" rows="2" placeholder="Why do you need this?"></textarea></div>'
        + '<div class="form-group"><label>Items Needed</label><div id="reqItemsArea"><div class="req-item-row" style="display:flex;gap:6px;margin-bottom:6px;"><input type="text" name="item_name_1" class="form-control" placeholder="Item name"><input type="number" name="item_qty_1" class="form-control" placeholder="Qty" style="max-width:80px;"></div></div>'
        + '<button type="button" class="btn btn-sm btn-outline" onclick="hodAddReqItem()">+ Add Item</button></div>'
        + '<div class="form-group"><label>Priority</label><select name="priority" class="form-control"><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div>'
        + '</form>';
    openFormModal('New Material Request', form, 'hodSaveRequest()', false);
}

var _hodReqItemCount = 1;
function hodAddReqItem() {
    _hodReqItemCount++;
    var area = document.getElementById('reqItemsArea');
    if (!area) return;
    var row = document.createElement('div');
    row.className = 'req-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
    row.innerHTML = '<input type="text" name="item_name_' + _hodReqItemCount + '" class="form-control" placeholder="Item name"><input type="number" name="item_qty_' + _hodReqItemCount + '" class="form-control" placeholder="Qty" style="max-width:80px;">';
    area.appendChild(row);
}

function hodSaveRequest() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodReqForm');
    if (!data.title) { APP.notify('Title required', 'error'); return false; }

    // Collect items
    var items = [];
    for (var i = 1; i <= 20; i++) {
        var n = data['item_name_' + i];
        var q = data['item_qty_' + i];
        if (n) items.push({ name: n, qty: q || 1 });
    }

    DB.add('hodRequests', {
        title:       data.title,
        reason:      data.reason || '',
        priority:    data.priority || 'normal',
        items:       items,
        department:  user.department,
        createdBy:   user.fullName,
        createdAt:   new Date().toISOString(),
        status:      'pending'
    });
    APP.notify('Request submitted to Admin', 'success');
    _hodData.myReqs = (DB.get('hodRequests') || []).filter(function (r) { return r.department === user.department; });
    _renderHodTab('requests');
    return true;
}

/* ═══════════════════════════════════════════════
   PERFORMANCE TAB
═══════════════════════════════════════════════ */
function _hodPerformance(el) {
    var d   = _hodData;
    var all = d.myTasks;

    var done    = all.filter(function (t) { return t.status === 'completed'; }).length;
    var overdue = d.overdueTasks.length;
    var otat    = d.overTatTasks.length;
    var rate    = all.length > 0 ? Math.round(done / all.length * 100) : 0;
    var tatComp = all.filter(function (t) { return t.tat; }).length > 0
        ? Math.round(all.filter(function (t) {
            if (!t.tat) return false;
            var ti = _tatInfo(t);
            return !ti || !ti.overTAT;
        }).length / all.filter(function (t) { return t.tat; }).length * 100) : 100;

    var html = '<div style="font-weight:700;font-size:16px;margin-bottom:16px;">📊 Department Performance — ' + d.dept + '</div>'

        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px;">'
        + _pBox(all.length, 'Tasks Assigned', 'var(--text)')
        + _pBox(done, 'Completed', 'var(--success)')
        + _pBox(overdue, 'Overdue', 'var(--danger)')
        + _pBox(otat, 'Over TAT', '#ff6f00')
        + _pBox(rate + '%', 'Completion Rate', rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)')
        + _pBox(tatComp + '%', 'TAT Compliance', tatComp >= 80 ? 'var(--success)' : 'var(--warning)')
        + '</div>';

    if (d.team.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:20px;">No team members to show breakdown for</div>';
        el.innerHTML = html; return;
    }

    html += '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">Per-Member Breakdown</div>'
        + '<div class="table-responsive"><table style="width:100%;"><thead><tr>'
        + '<th>Member</th><th>Assigned</th><th>Done</th><th>Overdue</th><th>Over TAT</th><th>Rate</th><th>TAT Compliance</th>'
        + '</tr></thead><tbody>';

    d.team.forEach(function (m) {
        var mt    = all.filter(function (t) { return t.assignedTo === m.fullName; });
        var md    = mt.filter(function (t) { return t.status === 'completed'; }).length;
        var mo    = mt.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
        var mot   = mt.filter(function (t) { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; }).length;
        var mr    = mt.length > 0 ? Math.round(md / mt.length * 100) : 0;
        var tatT  = mt.filter(function (t) { return t.tat; }).length;
        var tatOK = tatT > 0 ? Math.round((tatT - mt.filter(function (t) { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; }).length) / tatT * 100) : 100;
        var bar   = '<div style="display:flex;align-items:center;gap:4px;"><div class="hq-bar" style="width:50px;"><div class="hq-fill" style="width:' + mr + '%;background:' + (mr >= 80 ? 'var(--success)' : mr >= 50 ? 'var(--warning)' : 'var(--danger)') + ';"></div></div><span style="font-size:11px;">' + mr + '%</span></div>';
        html += '<tr><td><div style="display:flex;align-items:center;gap:6px;">' + _avatar(m.fullName, 28) + '<strong>' + m.fullName + '</strong></div></td>'
            + '<td>' + mt.length + '</td>'
            + '<td style="color:var(--success);">' + md + '</td>'
            + '<td style="color:' + (mo > 0 ? 'var(--danger)' : 'var(--gray)') + ';">' + mo + '</td>'
            + '<td style="color:' + (mot > 0 ? '#ff6f00' : 'var(--gray)') + ';">' + mot + '</td>'
            + '<td>' + bar + '</td>'
            + '<td><span style="font-size:12px;color:' + (tatOK >= 80 ? 'var(--success)' : 'var(--warning)') + ';">' + tatOK + '%</span></td></tr>';
    });

    html += '</tbody></table></div>';
    el.innerHTML = html;
}

function _pBox(val, label, color) {
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">'
        + '<div style="font-size:22px;font-weight:700;color:' + color + ';">' + val + '</div>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + label + '</div></div>';
}

/* ═══════════════════════════════════════════════
   SEND REPORT TO ADMIN
═══════════════════════════════════════════════ */
function hodShowReportForm() {
    var form = '<form id="hodReportForm">'
        + '<div class="form-group"><label>Report Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Weekly Housekeeping Summary"></div>'
        + '<div class="form-group"><label>Period</label><select name="category" class="form-control"><option value="daily">Daily</option><option value="weekly" selected>Weekly</option><option value="monthly">Monthly</option></select></div>'
        + '<div class="form-group"><label>Send To</label><select name="sentTo" class="form-control"><option value="admin">Admin</option><option value="both">Admin & Director</option></select></div>'
        + '<div class="form-group"><label>Summary *</label><textarea name="description" class="form-control" rows="5" required placeholder="Summarise team performance, issues, highlights…"></textarea></div>'
        + '</form>';
    openFormModal('Send Report to Admin', form, 'hodSaveReport()', false);
}

function hodSaveReport() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodReportForm');
    if (!data.title || !data.description) { APP.notify('Title and summary required', 'error'); return false; }
    DB.add('reports', {
        title:          data.title,
        category:       data.category,
        sentTo:         data.sentTo,
        description:    data.description,
        createdBy:      user.username,
        createdByName:  user.fullName,
        department:     user.department,
        status:         'sent',
        createdAt:      new Date().toISOString()
    });
    APP.notify('Report sent to admin', 'success');
    return true;
}
