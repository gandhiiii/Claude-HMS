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

    // Checklists: admin-assigned to dept + HOD-created for team members
    var allCl       = DB.get('checklists') || [];
    var teamFullNames = (DB.get('users') || [])
        .filter(function(m){ return m.department === dept && m.role !== 'admin' && m.role !== 'super_admin'; })
        .map(function(m){ return m.fullName; });
    var myCl = allCl.filter(function (c) {
        return c.department === dept ||
               c.assignedTo === 'common' ||
               c.assignedBy === u ||
               teamFullNames.indexOf(c.assignedTo) !== -1;
    });

    // HOD material requests for this dept
    var allReqs     = DB.get('hodRequests') || [];
    var myReqs      = allReqs.filter(function (r) { return r.department === dept; });

    // Material requests from material_requests that need this HOD's approval
    var isFacHod = typeof _matProcurementDept === 'function' && dept === _matProcurementDept();
    var pendingMatApprovals = (DB.get('material_requests') || []).filter(function (r) {
        if (isFacHod) return r.status === 'hod_approved';
        return r.status === 'pending' && (r.department || '').trim().toLowerCase() === (dept || '').trim().toLowerCase();
    });

    // Gate security pending approvals for this HOD's dept (goods in/out + doctor visits)
    var _deptLow = (dept || '').trim().toLowerCase();
    var pendingGoodsApprovals = (DB.get('gatesecurity') || []).filter(function (g) {
        return g.status === 'pending' && (g.department || '').trim().toLowerCase() === _deptLow;
    });
    var pendingDoctorApprovals = (DB.get('doctorVisits') || []).filter(function (d) {
        return d.status === 'pending' && (d.department || '').trim().toLowerCase() === _deptLow;
    });
    var pendingGateApprovals = pendingGoodsApprovals.map(function(g){ return Object.assign({}, g, {_gateType:'goods'}); })
        .concat(pendingDoctorApprovals.map(function(d){ return Object.assign({}, d, {_gateType:'doctor'}); }));

    // Problems routed to this department
    var routedProblems = (DB.get('problems') || []).filter(function (p) {
        return (p.routedTo === dept || (!p.routedTo && p.department === dept)) && p.status !== 'resolved';
    });

    // Admissions for this dept context
    var allAdm      = DB.get('admissions') || [];
    var cleaning    = (DB.get('roomCleaningTasks') || []).filter(function (t) { return t.status !== 'done'; });

    // Admin-created tasks assigned to this dept
    var adminTasks = (DB.get('tasks') || []).filter(function (t) { return t.department === dept; })
        .map(function (t) { return Object.assign({}, t, { _source: 'admin' }); });
    var allDeptTasks = myTasks.concat(adminTasks);

    // Employee reports sent to this HOD's department
    var teamReports = (DB.get('reports') || []).filter(function (r) {
        return (r.sentTo === 'hod' || r.sentTo === 'both') &&
               r.department === dept &&
               r.createdBy !== user.username;
    });

    _hodData = {
        user: user, dept: dept, u: u,
        team: team, teamNames: teamNames,
        myTasks: myTasks,
        adminTasks: adminTasks,
        allDeptTasks: allDeptTasks,
        pendingTasks:   allDeptTasks.filter(function (t) { return t.status !== 'completed'; }),
        overdueTasks:   allDeptTasks.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }),
        overTatTasks:   allDeptTasks.filter(function (t) {
            var ti = _tatInfo(t);
            return ti && ti.overTAT && t.status !== 'completed';
        }),
        myCl: myCl,
        myReqs: myReqs,
        pendingMatApprovals: pendingMatApprovals,
        pendingGateApprovals: pendingGateApprovals,
        routedProblems: routedProblems,
        cleaning: cleaning,
        allAdm: allAdm,
        teamReports: teamReports
    };

    var pendingCl  = myCl.filter(function (c) { return c.status !== 'completed'; }).length;
    var pendingReq = myReqs.filter(function (r) { return r.status === 'pending'; }).length + pendingMatApprovals.length + pendingGateApprovals.length;
    var openProblems = routedProblems.length;

    var tabs = [
        { id: 'overview',    label: 'Overview' },
        { id: 'admissions',  label: 'Admissions' },
        { id: 'tasks',       label: 'Tasks', badge: _hodData.overdueTasks.length, bc: 'badge-danger' },
        { id: 'team',        label: '👥 My Team', badge: team.length, bc: 'badge-success' },
        { id: 'checklists',  label: 'Checklists', badge: pendingCl, bc: 'badge-info' },
        { id: 'requests',    label: '🔧 Problems & Requests', badge: pendingReq + openProblems, bc: 'badge-danger' },
        { id: 'performance', label: 'Performance' },
        { id: 'hodreports',  label: '📤 Reports', badge: teamReports.length, bc: 'badge-danger' },
        { id: 'hodqp',       label: '🎯 Q Priorities' }
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

        + (openProblems > 0
            ? '<div style="background:#fce4ec;border:1px solid var(--danger);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;" onclick="hodTabSwitch(\'requests\')">'
              + '<span style="font-size:13px;font-weight:600;color:var(--danger);">🔧 ' + openProblems + ' open problem(s) need your attention — click to Solve</span>'
              + '<button class="btn btn-sm btn-danger">View & Solve</button></div>'
            : '')

        // Tab bar — flex-wrap so all tabs are always visible on any screen width
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px 12px 0 0;padding:4px 4px 0;display:flex;flex-wrap:wrap;gap:2px;border-bottom:none;">'
        + tabs.map(function (t) {
            var lbl = t.label + (t.badge > 0 ? ' <span class="badge ' + (t.bc || 'badge-primary') + '" style="font-size:10px;margin-left:2px;">' + t.badge + '</span>' : '');
            return '<button class="hod-tab-btn' + (t.id === 'overview' ? ' active' : '') + '" data-tab="' + t.id + '" onclick="hodTabSwitch(\'' + t.id + '\')">' + lbl + '</button>';
        }).join('')
        + '</div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-top:3px solid #6a1b9a;border-radius:0 0 12px 12px;padding:18px;" id="hodTabContent"></div>';

    container.innerHTML = html;
    _hodTab = 'overview';
    _renderHodTab('overview');

    // Start background browser-notification check (30-min interval, once per session)
    if (typeof HMS_REM !== 'undefined') HMS_REM.scheduleCheck(user);
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
    var map = { overview: _hodOverview, admissions: _hodAdmissions, tasks: _hodTasks,
                team: _hodTeam, checklists: _hodChecklists, requests: _hodRequests,
                performance: _hodPerformance, hodreports: _hodReports, hodqp: _hodQP };
    if (map[tab]) map[tab](el);
}

/* ═══════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════ */
function _hodOverview(el) {
    var d = _hodData;

    // Reminder banners for HOD's own work (tasks assigned to HOD + own checklists)
    var hodOwnCl    = (d.myCl || []).filter(function (c) { return c.assignedTo === d.u || c.assignedTo === 'common'; });
    var hodOwnTasks = (d.allDeptTasks || []).filter(function (t) { return t.assignedTo === d.u || t.assignedTo === d.user.username; });
    var remHtml = typeof HMS_REM !== 'undefined' ? HMS_REM.checkHod(d.user, hodOwnTasks, hodOwnCl) : '';

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
        html += '<div style="background:linear-gradient(135deg,#f3e5f5,#e8eaf6);border:2px dashed #9c27b0;border-radius:10px;padding:20px;text-align:center;">'
            + '<div style="font-size:28px;margin-bottom:6px;">👥</div>'
            + '<div style="font-weight:700;font-size:14px;color:#6a1b9a;margin-bottom:4px;">No team members yet</div>'
            + '<div style="font-size:12px;color:var(--gray);margin-bottom:12px;">Add staff to your department to assign tasks & track work</div>'
            + '<button class="btn btn-primary" style="background:#6a1b9a;border:none;" onclick="hodTabSwitch(\'team\')">👥 Set Up My Team</button>'
            + '</div>';
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

    el.innerHTML = remHtml + html;
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
   TASKS TAB — HOD + Admin tasks for this dept
═══════════════════════════════════════════════ */
function _hodTasks(el) {
    var d   = _hodData;
    var all = d.allDeptTasks;

    var filters = [
        { id: 'all',        label: 'All (' + all.length + ')' },
        { id: 'hod',        label: '👔 By HOD (' + d.myTasks.length + ')' },
        { id: 'admin',      label: '🔑 By Admin (' + d.adminTasks.length + ')' },
        { id: 'pending',    label: 'Pending' },
        { id: 'inprogress', label: 'In Progress' },
        { id: 'overdue',    label: 'Overdue' },
        { id: 'done',       label: 'Completed' }
    ];

    var filtered = all.filter(function (t) {
        if (_hodFilter === 'all')        return true;
        if (_hodFilter === 'hod')        return !t._source || t._source === 'hod';
        if (_hodFilter === 'admin')      return t._source === 'admin';
        if (_hodFilter === 'pending')    return t.status === 'pending';
        if (_hodFilter === 'inprogress') return t.status === 'in-progress';
        if (_hodFilter === 'overdue')    return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
        if (_hodFilter === 'over-tat')   { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; }
        if (_hodFilter === 'done')       return t.status === 'completed';
        return true;
    });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div>'
        + '<div style="font-weight:700;font-size:16px;">📝 Department Tasks</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">Tasks assigned by HOD and Admin for ' + d.dept + '</div>'
        + '</div>'
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
            var isAdmin  = t._source === 'admin';
            var srcBadge = isAdmin
                ? '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#fff3e0;color:#e65100;font-weight:700;">🔑 Admin</span>'
                : '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#f3e5f5;color:#6a1b9a;font-weight:700;">👔 HOD</span>';

            html += '<div class="hod-task-card ' + cls + '">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">'
                + '<span style="font-size:14px;font-weight:700;">' + t.title + '</span>'
                + srcBadge + '</div>'
                + (t.description ? '<div style="font-size:12px;color:var(--gray);margin-top:2px;">' + t.description.substring(0, 90) + (t.description.length > 90 ? '…' : '') + '</div>' : '')
                + '<div style="font-size:11px;color:var(--gray);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px;">'
                + '<span>→ <strong>' + (t.assignedTo || 'Unassigned') + '</strong></span>'
                + (t.priority ? '<span class="badge ' + (t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info') + '" style="font-size:10px;">' + t.priority + '</span>' : '')
                + (t.deadline ? '<span>📅 ' + APP.formatDate(t.deadline) + '</span>' : '')
                + (isAdmin && t.createdByName ? '<span>From: ' + t.createdByName + '</span>' : '')
                + '</div>'
                + _tatBar(t)
                + '</div>'
                + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">'
                + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status || 'pending') + '</span>'
                + (!isAdmin ? '<button class="btn btn-sm btn-outline" style="font-size:11px;" onclick="hodEditTask(\'' + t.id + '\')">Edit</button>' : '')
                + (t.status !== 'completed'
                    ? '<button class="btn btn-sm btn-success" style="font-size:11px;" onclick="hodMarkTaskDone(\'' + t.id + '\',\'' + (isAdmin ? 'tasks' : 'hodTasks') + '\')">✓ Done</button>'
                    : '')
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

function hodMarkTaskDone(taskId, dbKey) {
    dbKey = dbKey || 'hodTasks';
    DB.update(dbKey, taskId, { status: 'completed', completedAt: new Date().toISOString() });
    APP.notify('Task marked complete', 'success');
    _hodRefreshTasks();
    _renderHodTab('tasks');
}

function _hodRefreshTasks() {
    var dept = _hodData.dept;
    _hodData.myTasks     = (DB.get('hodTasks') || []).filter(function (t) { return t.department === dept; });
    _hodData.adminTasks  = (DB.get('tasks')    || []).filter(function (t) { return t.department === dept; })
                            .map(function (t) { return Object.assign({}, t, { _source: 'admin' }); });
    _hodData.allDeptTasks = _hodData.myTasks.concat(_hodData.adminTasks);
    _hodData.pendingTasks = _hodData.allDeptTasks.filter(function (t) { return t.status !== 'completed'; });
    _hodData.overdueTasks = _hodData.allDeptTasks.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; });
    _hodData.overTatTasks = _hodData.allDeptTasks.filter(function (t) { var ti = _tatInfo(t); return ti && ti.overTAT && t.status !== 'completed'; });
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
    _hodRefreshTasks();
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
    _hodRefreshTasks();
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
var _hodClView = 'all'; // 'all' | 'member'

function _hodChecklists(el) {
    var d    = _hodData;
    var user = d.user;
    var cls  = d.myCl;
    var pending   = cls.filter(function(c){ return c.status !== 'completed'; });
    var completed = cls.filter(function(c){ return c.status === 'completed'; });

    var html = ''
        // ── Header ──
        + '<div style="background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%);border-radius:12px;padding:16px 20px;color:#fff;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">'
        + '<div><div style="font-size:15px;font-weight:700;">✅ Checklists — ' + d.dept + '</div>'
        + '<div style="font-size:12px;opacity:0.8;margin-top:2px;">'
        + cls.length + ' total &nbsp;·&nbsp; '
        + pending.length + ' active &nbsp;·&nbsp; '
        + completed.length + ' completed</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);" onclick="hodNewChecklist(\'\')">+ Assign Checklist</button>'
        + '</div></div></div>'

        // ── View toggle ──
        + '<div style="display:flex;gap:4px;margin-bottom:14px;">'
        + '<button class="tab-btn' + (_hodClView==='all'?' active':'') + '" onclick="hodClView(\'all\',this)">All Checklists</button>'
        + '<button class="tab-btn' + (_hodClView==='member'?' active':'') + '" onclick="hodClView(\'member\',this)">By Team Member</button>'
        + '</div>';

    if (_hodClView === 'member') {
        // ── Per-member view ──
        var allMembers = d.team.slice();
        // Add a "Common" bucket
        var buckets = [{ name: 'Common (Everyone)', key: 'common' }]
            .concat(allMembers.map(function(m){ return { name: m.fullName, key: m.fullName }; }));

        buckets.forEach(function(bucket) {
            var memberCls = cls.filter(function(c){
                return bucket.key === 'common' ? c.assignedTo === 'common' : c.assignedTo === bucket.key;
            });
            var isTeamMember = bucket.key !== 'common';
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);">'
                + '<div style="display:flex;align-items:center;gap:10px;">'
                + (isTeamMember ? _avatar(bucket.name, 30) : '<div style="width:30px;height:30px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-size:16px;">👥</div>')
                + '<div>'
                + '<div style="font-size:13px;font-weight:700;">' + bucket.name + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + memberCls.length + ' checklist' + (memberCls.length!==1?'s':'') + '</div>'
                + '</div></div>'
                + '<button class="btn btn-sm btn-primary" style="font-size:12px;" onclick="hodNewChecklist(\'' + bucket.key.replace(/'/g,"\\'") + '\')">+ Add</button>'
                + '</div>'
                + '<div style="padding:10px 14px;">';

            if (memberCls.length === 0) {
                html += '<div style="font-size:12px;color:var(--gray);padding:8px 0;">No checklists assigned — click + Add to create one.</div>';
            } else {
                memberCls.forEach(function(cl) {
                    html += _hodClCard(cl, user);
                });
            }
            html += '</div></div>';
        });

    } else {
        // ── Flat all view ──
        if (cls.length === 0) {
            html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
                + '<div style="font-size:32px;margin-bottom:8px;">✅</div>'
                + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No checklists yet</div>'
                + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Create and assign checklists to your team members.</div>'
                + '<button class="btn btn-primary" onclick="hodNewChecklist(\'\')">+ Assign First Checklist</button>'
                + '</div>';
        } else {
            if (pending.length > 0) {
                html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Active (' + pending.length + ')</div>';
                pending.forEach(function(cl) { html += _hodClCard(cl, user); });
            }
            if (completed.length > 0) {
                html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px;">Completed (' + completed.length + ')</div>';
                completed.forEach(function(cl) { html += _hodClCard(cl, user); });
            }
        }
    }

    el.innerHTML = html;
}

function hodClView(v, btn) {
    _hodClView = v;
    document.querySelectorAll('.tabs .tab-btn, .tab-btn').forEach(function(b){
        if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf('hodClView') !== -1) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    _renderHodTab('checklists');
}

function _hodClCard(cl, user) {
    var total   = cl.items ? cl.items.length : 0;
    var done    = cl.items ? cl.items.filter(function(i){ return i.status && i.status !== 'pending'; }).length : 0;
    var pct     = total > 0 ? Math.round(done / total * 100) : 0;
    var isOverdue = cl.deadline && new Date(cl.deadline) < new Date() && cl.status !== 'completed';
    var canManage = user && (user.isSuperAdmin || user.role === 'admin' || cl.assignedBy === user.fullName);

    return '<div style="background:var(--card);border:1px solid var(--border);' + (isOverdue?'border-left:4px solid var(--danger);':'') + 'border-radius:10px;padding:12px 14px;margin-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
        + '<div style="flex:1;min-width:180px;">'
        + '<div style="font-size:13px;font-weight:700;">' + (cl.title || '') + '</div>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
        + '👤 ' + (cl.assignedTo === 'common' ? 'Everyone' : cl.assignedTo)
        + (cl.floor ? ' &nbsp;·&nbsp; 📍 ' + cl.floor : '')
        + (cl.deadline ? ' &nbsp;·&nbsp; 📅 ' + APP.formatDate(cl.deadline) + (isOverdue?' <span style="color:var(--danger);font-weight:600;">⚠ Overdue</span>':'') : '')
        + ' &nbsp;·&nbsp; by ' + (cl.assignedBy || '—')
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;">'
        + '<div class="hq-bar" style="width:120px;"><div class="hq-fill" style="width:' + pct + '%;background:' + (pct===100?'var(--success)':pct>=50?'var(--warning)':'var(--danger)') + ';"></div></div>'
        + '<span style="font-size:11px;color:var(--gray);">' + done + '/' + total + ' items</span>'
        + '<span class="badge ' + (cl.status==='completed'?'badge-success':'badge-info') + '" style="font-size:10px;">' + (cl.status||'active') + '</span>'
        + '</div></div>'
        + '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;">'
        + (canManage
            ? '<button class="btn btn-sm btn-primary" onclick="hodEditCl(\'' + cl.id + '\')">Edit</button>'
              + (cl.status !== 'completed' ? '<button class="btn btn-sm btn-success" onclick="hodCompleteCl(\'' + cl.id + '\')">Done</button>' : '')
              + '<button class="btn btn-sm btn-danger" onclick="hodDeleteCl(\'' + cl.id + '\')">Remove</button>'
            : '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">View</button>')
        + '</div></div></div>';
}

/* ── HOD Checklist Actions ── */
function hodNewChecklist(preAssign) {
    // Pre-select the team member in the form, then refresh HOD tab on save
    window._clSaveCallback = function() { _hodRefreshCl(); };
    var user = AUTH.currentUser();
    if (!user) return;
    // Build a stub "cl" object so showClForm pre-selects the right assignee
    var stub = preAssign ? { assignedTo: preAssign, department: user.department } : null;
    if (typeof showClForm === 'function') {
        showClForm(stub);
    } else {
        APP.notify('Checklist module not loaded', 'error');
    }
}

function hodEditCl(id) {
    window._clSaveCallback = function() { _hodRefreshCl(); };
    var cl = DB.getById('checklists', id);
    if (cl && typeof showClForm === 'function') {
        showClForm(cl);
    } else {
        APP.notify('Checklist not found', 'error');
    }
}

function hodDeleteCl(id) {
    var cl = DB.getById('checklists', id);
    if (!cl) { APP.notify('Checklist not found', 'error'); return; }
    var user = AUTH.currentUser();
    if (cl.assignedBy !== (user && user.fullName) && !(user && (user.isSuperAdmin || user.role === 'admin'))) {
        APP.notify('You can only remove checklists you created', 'error'); return;
    }
    confirmAction('Remove checklist "' + cl.title + '" from ' + (cl.assignedTo === 'common' ? 'everyone' : cl.assignedTo) + '?', function() {
        DB.delete('checklists', id);
        APP.notify('Checklist removed', 'success');
        _hodRefreshCl();
    });
}

function hodCompleteCl(id) {
    DB.update('checklists', id, { status: 'completed' });
    APP.notify('Checklist marked complete', 'success');
    _hodRefreshCl();
}

function _hodRefreshCl() {
    // Refresh myCl in _hodData then re-render checklists tab
    var d    = _hodData;
    var dept = d.dept;
    var u    = d.u;
    var teamFullNames = (DB.get('users') || [])
        .filter(function(m){ return m.department === dept && m.role !== 'admin' && m.role !== 'super_admin'; })
        .map(function(m){ return m.fullName; });
    d.myCl = (DB.get('checklists') || []).filter(function(c) {
        return c.department === dept ||
               c.assignedTo === 'common' ||
               c.assignedBy === u ||
               teamFullNames.indexOf(c.assignedTo) !== -1;
    });
    _renderHodTab('checklists');
}

/* ═══════════════════════════════════════════════
   REQUESTS TAB — HOD's own material requests
═══════════════════════════════════════════════ */
function _hodRequests(el) {
    var d    = _hodData;
    var dept = d.dept;
    var isFacHod = typeof _matProcurementDept === 'function' && dept === _matProcurementDept();

    // Always re-read fresh from DB so requests submitted after page load are visible
    var deptLow = (dept || '').trim().toLowerCase();

    var matApprovals = (DB.get('material_requests') || []).filter(function (r) {
        if (isFacHod) return r.status === 'hod_approved';
        return r.status === 'pending' && (r.department || '').trim().toLowerCase() === deptLow;
    });
    d.pendingMatApprovals = matApprovals;

    // Gate security: goods in/out + doctor visits pending for this dept
    var gateGoods = (DB.get('gatesecurity') || []).filter(function (g) {
        return g.status === 'pending' && (g.department || '').trim().toLowerCase() === deptLow;
    }).map(function(g){ return Object.assign({}, g, {_gateType:'goods'}); });
    var gateDoctors = (DB.get('doctorVisits') || []).filter(function (dv) {
        return dv.status === 'pending' && (dv.department || '').trim().toLowerCase() === deptLow;
    }).map(function(dv){ return Object.assign({}, dv, {_gateType:'doctor'}); });
    var gateApprovals = gateGoods.concat(gateDoctors);
    d.pendingGateApprovals = gateApprovals;

    var routedProbs = (DB.get('problems') || []).filter(function (p) {
        return (p.routedTo === dept || (!p.routedTo && p.department === dept)) && p.status !== 'resolved';
    });
    d.routedProblems = routedProbs;

    // HOD's own material requests — read from material_requests (single source of truth)
    var hodUser = d.user || AUTH.currentUser();
    var reqs = (DB.get('material_requests') || []).filter(function (r) {
        return r._source === 'hod' && r.createdBy === (hodUser ? hodUser.username : '');
    });
    d.myReqs = reqs;

    var hodReturns = (DB.get('material_returns') || []).filter(function(r) {
        return r.createdBy === (hodUser ? hodUser.username : '');
    }).slice().reverse();
    d.myReturns = hodReturns;

    var skReports = (DB.get('sk_reports') || []).filter(function(rpt) {
        return (rpt.department || '') === dept;
    }).slice().reverse();
    d.skReports = skReports;

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:16px;">📦 Requests &amp; Approvals</div>'
        + '<div style="font-size:12px;color:var(--gray);">Your dept requests + pending approvals for ' + d.dept + '</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        + '<button class="btn btn-primary btn-sm" onclick="hodCreateRequest()">+ New Request</button>'
        + '<button class="btn btn-outline btn-sm" onclick="hodCreateReturn()">↩️ Return Materials</button>'
        + '</div></div>';

    // ── Pending material request approvals ──
    if (matApprovals.length > 0) {
        html += '<div style="background:#fff3e0;border:2px solid var(--warning);border-radius:10px;padding:14px;margin-bottom:16px;">'
            + '<div style="font-weight:700;font-size:14px;color:#e65100;margin-bottom:10px;">&#9888; ' + matApprovals.length + ' Material Request(s) Awaiting Your Approval</div>';
        matApprovals.forEach(function (r) {
            var items = (r.items || []).map(function (i) { return i.name + ' \xd7' + i.qty; }).join(', ');
            var isFacHod = d.isFacHod || (typeof _matProcurementDept === 'function' && d.dept === _matProcurementDept());
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">'
                + '<div>'
                + '<div style="font-size:13px;font-weight:700;">' + (r.title || 'Request') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
                + 'From: <strong>' + (r.createdByName || r.createdBy || '?') + '</strong>'
                + ' &middot; Dept: <strong>' + (r.department || '-') + '</strong>'
                + ' &middot; ' + APP.formatDate(r.createdAt)
                + '</div>'
                + (items ? '<div style="font-size:11px;color:var(--text);margin-top:3px;">Items: ' + items + '</div>' : '')
                + (r.reason ? '<div style="font-size:11px;color:var(--gray);">Reason: ' + r.reason + '</div>' : '')
                + '</div>'
                + '<div style="display:flex;gap:6px;">'
                + (isFacHod && r.status === 'hod_approved'
                    ? '<button class="btn btn-sm btn-success" onclick="facilityApproveMatReq(\'' + r.id + '\');_hodRefreshAndShow()">&#10003; Approve</button>'
                    + '<button class="btn btn-sm btn-danger" onclick="facilityRejectMatReq(\'' + r.id + '\');_hodRefreshAndShow()">&#10007; Reject</button>'
                    : '<button class="btn btn-sm btn-success" onclick="hodApproveMatReq(\'' + r.id + '\');_hodRefreshAndShow()">&#10003; Approve</button>'
                    + '<button class="btn btn-sm btn-danger" onclick="hodRejectMatReq(\'' + r.id + '\');_hodRefreshAndShow()">&#10007; Reject</button>')
                + '</div></div></div>';
        });
        html += '</div>';
    }

    // ── Gate security pending approvals (goods in/out + doctor visits) ──
    if (gateApprovals.length > 0) {
        html += '<div style="background:#e3f2fd;border:2px solid #1976d2;border-radius:10px;padding:14px;margin-bottom:16px;">'
            + '<div style="font-weight:700;font-size:14px;color:#1565c0;margin-bottom:10px;">🔐 ' + gateApprovals.length + ' Gate Security Request(s) Awaiting Your Approval</div>';
        gateApprovals.forEach(function (g) {
            var isGoods  = g._gateType === 'goods';
            var title    = isGoods ? ('🚚 Goods ' + (g.direction === 'in' ? 'IN' : 'OUT') + ': ' + (g.itemName || '-')) : ('🩺 Doctor Visit: ' + (g.doctorName || '-'));
            var detail   = isGoods
                ? 'Vehicle: ' + (g.vehicleNo || '-') + (g.vendor ? ' · Vendor: ' + g.vendor : '') + (g.quantity ? ' · Qty: ' + g.quantity : '')
                : (g.specialization || '') + (g.hospital ? ' · ' + g.hospital : '') + ' · Purpose: ' + (g.purpose || '-');
            var submittedBy = g.submittedBy || '-';
            var store    = isGoods ? 'gatesecurity' : 'doctorVisits';
            var approveCmd = isGoods
                ? 'hodApproveGateEntry(\'' + store + '\',\'' + g.id + '\');_hodRefreshAndShow()'
                : 'hodApproveGateEntry(\'' + store + '\',\'' + g.id + '\');_hodRefreshAndShow()';
            var rejectCmd  = 'hodRejectGateEntry(\'' + store + '\',\'' + g.id + '\');_hodRefreshAndShow()';
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:13px;font-weight:700;">' + title + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + detail + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">Submitted by: <strong>' + submittedBy + '</strong> &middot; ' + APP.formatDate(g.createdAt || g.entryTime) + '</div>'
                + (g.purpose && isGoods ? '<div style="font-size:11px;color:var(--gray);">Purpose: ' + g.purpose + '</div>' : '')
                + '</div>'
                + '<div style="display:flex;gap:6px;flex-shrink:0;">'
                + '<button class="btn btn-sm btn-success" onclick="' + approveCmd + '">&#10003; Approve</button>'
                + '<button class="btn btn-sm btn-danger" onclick="' + rejectCmd + '">&#10007; Reject</button>'
                + '</div></div></div>';
        });
        html += '</div>';
    }

    // ── Problems routed to this dept ──
    var openProbs = routedProbs.filter(function (p) { return p.status !== 'resolved'; });
    if (openProbs.length > 0) {
        html += '<div style="background:#fce4ec;border:2px solid var(--danger);border-radius:10px;padding:14px;margin-bottom:16px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">'
            + '<div style="font-weight:700;font-size:14px;color:var(--danger);">🔧 ' + openProbs.length + ' Problem(s) Routed to ' + d.dept + '</div>'
            + '<a onclick="Router.navigate(\'problems\')" style="cursor:pointer;color:var(--primary);font-size:12px;">View all →</a></div>';
        openProbs.slice(0, 8).forEach(function (p) {
            var statusBadgeClr = p.status === 'in_progress' ? '#1565c0' : p.status === 'assigned' ? '#e65100' : 'var(--danger)';
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
                + '<span style="font-size:11px;font-weight:700;background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:10px;white-space:nowrap;">' + (p.ticketId || '#' + p.id.slice(-6)) + '</span>'
                + '<span style="background:' + statusBadgeClr + ';color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;">' + (p.status || 'open').replace('_', ' ').toUpperCase() + '</span>'
                + (p.priority === 'high' ? '<span style="background:var(--danger);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;">HIGH</span>' : '')
                + '</div>'
                + '<div style="font-size:13px;font-weight:600;">' + (p.title || '') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">Category: ' + (p.category || '-') + ' · Reported by: ' + (p.reportedBy || '-') + ' · ' + APP.formatDate(p.createdAt) + '</div>'
                + (p.source === 'checklist' ? '<div style="font-size:11px;color:var(--primary);margin-top:2px;">📋 Checklist: ' + (p.checklistTitle || '') + ' — ' + (p.itemTask || '') + '</div>' : '')
                + (p.assignedToName ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">→ Assigned to: ' + p.assignedToName + '</div>' : '')
                + '</div>'
                + '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">'
                + '<button class="btn btn-sm btn-success" onclick="hodSolveProb(\'' + p.id + '\')" style="font-size:11px;">✓ Solve</button>'
                + '<button class="btn btn-sm btn-warning" onclick="showAssignProbForm(\'' + p.id + '\')" style="font-size:11px;">Assign</button>'
                + '</div></div></div>';
        });
        html += '</div>';
    }

    if (reqs.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:10px;">No requests yet. Click + New Request to submit one.</div>'
            + '<button class="btn btn-primary" onclick="hodCreateRequest()">+ New Request</button></div>';
    } else {
        var _reqStatMap = {
            'facility_approved': { label: 'Sent to Storekeeper', badge: 'badge-info' },
            'store_fulfilled':   { label: 'Ready to Collect ✓', badge: 'badge-success' },
            'confirmed':         { label: 'Confirmed & Closed', badge: 'badge-success' },
            'partial':           { label: 'Partially Fulfilled', badge: 'badge-warning' },
            'facility_rejected': { label: 'Rejected', badge: 'badge-danger' }
        };
        reqs.slice().reverse().forEach(function (r) {
            var st = _reqStatMap[r.status] || { label: r.status || 'Sent to Storekeeper', badge: 'badge-info' };
            var items = '';
            if (r.items) r.items.forEach(function (i) { items += i.name + ' \xd7' + i.qty + ', '; });
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:6px;">'
                + '<div><div style="font-size:14px;font-weight:700;">' + (r.title || 'Request') + '</div>'
                + (items ? '<div style="font-size:12px;color:var(--gray);margin-top:2px;">' + items.replace(/,\s*$/, '') + '</div>' : '')
                + '<div style="font-size:11px;color:var(--gray);margin-top:4px;">' + APP.formatDate(r.createdAt)
                + (r.reason ? ' · ' + r.reason : '') + '</div>'
                + '</div>'
                + '<span class="badge ' + st.badge + '" style="font-size:12px;padding:6px 10px;">' + st.label + '</span></div>'
                + (r.status === 'store_fulfilled'
                    ? '<button class="btn btn-sm btn-success" onclick="hodConfirmReceipt(\'' + r.id + '\')">✅ Confirm Receipt</button>'
                    : '')
                + '</div>';
        });
    }

    // ── HOD's own material returns ──
    html += '<div style="border-top:1px solid var(--border);margin-top:18px;padding-top:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:15px;">↩️ My Material Returns</div>'
        + '<button class="btn btn-outline btn-sm" onclick="hodCreateReturn()">+ New Return</button></div>';

    var retStMap = {
        'pending':  { label: 'Awaiting Storekeeper', badge: 'badge-warning' },
        'received': { label: 'Processed', badge: 'badge-success' }
    };
    if (!hodReturns || hodReturns.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:16px;text-align:center;font-size:13px;color:var(--gray);">No returns submitted yet.</div>';
    } else {
        hodReturns.forEach(function(r) {
            var rst = retStMap[r.status] || { label: r.status, badge: 'badge-warning' };
            var items = (r.items || []).map(function(i){ return i.name + ' ×' + i.qty; }).join(', ');
            html += '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid '
                + (r.status === 'pending' ? 'var(--warning)' : 'var(--secondary)') + ';border-radius:8px;padding:12px;margin-bottom:8px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">'
                + '<div><div style="font-size:13px;font-weight:700;">' + (r.title || 'Return') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + APP.formatDate(r.createdAt) + (items ? ' · ' + items : '') + '</div>'
                + (r.reason ? '<div style="font-size:11px;color:var(--gray);">Reason: ' + r.reason + '</div>' : '')
                + '</div><span class="badge ' + rst.badge + '">' + rst.label + '</span></div>'
                + (r.status === 'received' && r.itemDetails && r.itemDetails.length > 0
                    ? '<div style="margin-top:8px;">'
                      + (r.itemDetails || []).map(function(d) {
                          var condColor = d.condition === 'good' ? '#2e7d32' : 'var(--danger)';
                          return '<span style="display:inline-block;background:var(--light-gray);border-radius:4px;padding:2px 7px;font-size:11px;margin:2px;">'
                              + d.name + ' — <span style="color:' + condColor + ';font-weight:600;">' + (d.condition||'-') + '</span>'
                              + (d.addedBackToInventory ? ' ✓ restocked' : '') + '</span>';
                      }).join('')
                      + '</div>'
                    : '')
                + '</div>';
        });
    }

    // ── Storekeeper reports received ──
    html += '</div><div style="border-top:1px solid var(--border);margin-top:18px;padding-top:16px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">📈 Storekeeper Reports Received</div>';
    if (!skReports || skReports.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:16px;text-align:center;font-size:13px;color:var(--gray);">No storekeeper reports received yet.</div>';
    } else {
        skReports.forEach(function(rpt) {
            var s = rpt.summary || {};
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;">'
                + '<div><div style="font-size:13px;font-weight:700;">' + (rpt.title || 'Report') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">Sent by ' + (rpt.createdByName || rpt.createdBy) + ' · ' + APP.formatDate(rpt.createdAt) + '</div>'
                + '</div><span class="badge badge-info">Received</span></div>'
                + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;font-size:12px;">'
                + '<div style="background:#e8f5e9;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:700;color:#2e7d32;">' + (s.fulfilled||0) + '</div><div style="color:var(--gray);font-size:10px;">Fulfilled</div></div>'
                + '<div style="background:#fff3e0;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:700;color:#e65100;">' + (s.returns||0) + '</div><div style="color:var(--gray);font-size:10px;">Returns</div></div>'
                + '<div style="background:#e3f2fd;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:700;color:#1565c0;">' + (s.stockIn||0) + '</div><div style="color:var(--gray);font-size:10px;">IN Qty</div></div>'
                + '<div style="background:#fce4ec;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:16px;font-weight:700;color:var(--danger);">' + (s.stockOut||0) + '</div><div style="color:var(--gray);font-size:10px;">OUT Qty</div></div>'
                + '<div style="background:#fff3e0;border-radius:6px;padding:8px;text-align:center;"><div style="font-size:14px;font-weight:700;color:#e65100;">₹' + parseFloat(s.valueOut||0).toFixed(0) + '</div><div style="color:var(--gray);font-size:10px;">OUT Value</div></div>'
                + '</div></div>';
        });
    }
    html += '</div>';

    el.innerHTML = html;
}

function hodSolveProb(id) {
    var p = DB.getById('problems', id);
    if (!p) return;
    var tkt = p.ticketId || ('#' + p.id.slice(-6));
    var form = '<form id="hodSolveProbForm">'
        + '<input type="hidden" id="hodSolveProbId" value="' + id + '">'
        + '<div style="background:#fff3e0;border-radius:8px;padding:10px 14px;margin-bottom:14px;">'
        + '<div style="font-size:13px;font-weight:800;color:#e65100;margin-bottom:2px;">' + tkt + '</div>'
        + '<div style="font-size:14px;font-weight:600;">' + (p.title || '') + '</div>'
        + (p.source === 'checklist' ? '<div style="font-size:12px;color:var(--primary);margin-top:4px;">📋 From: ' + (p.checklistTitle || '') + ' — ' + (p.itemTask || '') + '</div>' : '')
        + '</div>'
        + '<div class="form-group"><label>Resolution / Solution *</label>'
        + '<textarea id="hodSolveSolution" class="form-control" rows="3" required placeholder="Describe how the problem was resolved and what action was taken..."></textarea></div>'
        + '</form>';
    openFormModal('Solve Problem — ' + tkt, form, 'hodSaveSolution()', false);
}

function hodSaveSolution() {
    var id       = (document.getElementById('hodSolveProbId') || {}).value;
    var solution = ((document.getElementById('hodSolveSolution') || {}).value || '').trim();
    if (!solution) { APP.notify('Please describe the solution', 'error'); return false; }
    var user = AUTH.currentUser();
    var p    = DB.getById('problems', id);
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user ? user.fullName : '',
        resolvedAt: new Date().toISOString()
    });
    var tkt = p ? (p.ticketId || '#' + p.id.slice(-6)) : '';
    APP.notify('Problem ' + tkt + ' solved ✓', 'success');
    var modal = document.querySelector('.modal');
    if (modal) modal.remove();
    // Refresh data and re-render
    var dept = _hodData.dept;
    _hodData.routedProblems = (DB.get('problems') || []).filter(function (pb) {
        return (pb.routedTo === dept || (!pb.routedTo && pb.department === dept)) && pb.status !== 'resolved';
    });
    _renderHodTab('requests');
    return true;
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

function _hodRefreshAndShow() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = _hodData.dept;
    var deptLow = (dept || '').trim().toLowerCase();
    var isFacHod = typeof _matProcurementDept === 'function' && dept === _matProcurementDept();
    _hodData.pendingMatApprovals = (DB.get('material_requests') || []).filter(function (r) {
        if (isFacHod) return r.status === 'hod_approved';
        return r.status === 'pending' && (r.department || '').trim().toLowerCase() === deptLow;
    });
    var rg = (DB.get('gatesecurity') || []).filter(function (g) {
        return g.status === 'pending' && (g.department || '').trim().toLowerCase() === deptLow;
    }).map(function(g){ return Object.assign({}, g, {_gateType:'goods'}); });
    var rd = (DB.get('doctorVisits') || []).filter(function (dv) {
        return dv.status === 'pending' && (dv.department || '').trim().toLowerCase() === deptLow;
    }).map(function(dv){ return Object.assign({}, dv, {_gateType:'doctor'}); });
    _hodData.pendingGateApprovals = rg.concat(rd);
    _hodData.routedProblems = (DB.get('problems') || []).filter(function (p) {
        return (p.routedTo === dept || (!p.routedTo && p.department === dept)) && p.status !== 'resolved';
    });
    _hodData.myReqs = (DB.get('hodRequests') || []).filter(function (r) { return r.department === dept; });
    _renderHodTab('requests');
}

function hodApproveGateEntry(store, id) {
    var user = AUTH.currentUser();
    if (!user) return;
    var entry = DB.getById(store, id);
    if (!entry) { APP.notify('Entry not found', 'error'); return; }
    if (store === 'gatesecurity') {
        DB.update(store, id, { status: 'approved', approvedBy: user.fullName, approvedAt: new Date().toISOString() });
        APP.notify('Goods entry approved', 'success');
    } else {
        DB.update(store, id, { status: 'active', approvedBy: user.fullName, approvedAt: new Date().toISOString() });
        APP.notify('Doctor visit approved — pass is now active', 'success');
    }
}

function hodRejectGateEntry(store, id) {
    var reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    var user = AUTH.currentUser();
    if (!user) return;
    DB.update(store, id, {
        status: 'rejected',
        rejectionReason: reason || 'Rejected by HOD',
        rejectedBy: user.fullName,
        rejectedAt: new Date().toISOString()
    });
    APP.notify('Entry rejected', 'info');
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

    var now = new Date().toISOString();
    // HOD requests skip all approval stages → go directly to storekeeper for fulfillment
    DB.add('material_requests', {
        title:              data.title,
        reason:             data.reason || '',
        priority:           data.priority || 'normal',
        items:              items,
        department:         user.department,
        status:             'facility_approved',
        _source:            'hod',
        createdBy:          user.username,
        createdByName:      user.fullName,
        createdAt:          now,
        hodApprovedBy:      user.fullName,
        hodApprovedAt:      now,
        facilityApprovedBy: user.fullName,
        facilityApprovedAt: now
    });
    APP.notify('Request sent directly to Storekeeper for fulfillment', 'success');
    _hodData.myReqs = (DB.get('material_requests') || []).filter(function (r) {
        return r._source === 'hod' && r.createdBy === user.username;
    });
    _renderHodTab('requests');
    return true;
}

function hodConfirmReceipt(id) {
    var note = prompt('Any notes about the receipt? (optional):');
    if (note === null) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'confirmed',
        confirmedBy: user ? user.username : '',
        confirmedByName: user ? user.fullName : '',
        confirmedAt: new Date().toISOString(),
        confirmationNote: note || ''
    });
    APP.notify('Receipt confirmed!', 'success');
    if (user) {
        _hodData.myReqs = (DB.get('material_requests') || []).filter(function (r) {
            return r._source === 'hod' && r.createdBy === user.username;
        });
    }
    _renderHodTab('requests');
}

/* ═══════════════════════════════════════════════
   PERFORMANCE TAB
═══════════════════════════════════════════════ */
function _hodPerformance(el) {
    var d   = _hodData;
    var all = d.allDeptTasks;

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
   REPORTS TAB — Excel / PDF / WhatsApp / Email
═══════════════════════════════════════════════ */
function _hodReports(el) {
    var d    = _hodData;
    var all  = d.allDeptTasks;
    var done = all.filter(function(t){ return t.status==='completed'; }).length;
    var pend = all.filter(function(t){ return t.status==='pending'; }).length;
    var prog = all.filter(function(t){ return t.status==='in-progress'; }).length;
    var ovd  = d.overdueTasks.length;
    var rate = all.length>0 ? Math.round(done/all.length*100) : 0;
    var teamReps = d.teamReports || [];
    var reqs  = d.myReqs || [];
    var clTotal = 0, clDone2 = 0;
    (d.myCl||[]).forEach(function(cl){ var items=cl.items||[]; clTotal+=items.length; clDone2+=items.filter(function(i){return i.done||i.status==='ok';}).length; });
    var clRate = clTotal > 0 ? Math.round(clDone2/clTotal*100) : 0;

    function kBox(v,l,c){
        return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">'
            +'<div style="font-size:22px;font-weight:700;color:'+c+';">'+v+'</div>'
            +'<div style="font-size:11px;color:var(--gray);margin-top:2px;">'+l+'</div></div>';
    }

    var html = '';

    // ── Team Reports Inbox (top priority) ──
    html += '<div style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);border-radius:12px;padding:16px 20px;color:#fff;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-size:15px;font-weight:700;">📬 Team Reports Inbox</div>'
        + '<div style="font-size:12px;opacity:0.8;margin-top:2px;">Reports sent by team members to HOD — ' + d.dept + '</div></div>'
        + '<span class="badge" style="background:rgba(255,255,255,0.25);color:#fff;font-size:12px;padding:4px 10px;">' + teamReps.length + ' report' + (teamReps.length!==1?'s':'') + '</span>'
        + '</div></div>';

    if (teamReps.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:16px;text-align:center;font-size:13px;color:var(--gray);margin-bottom:16px;">'
            + 'No reports from team members yet. When employees submit reports to HOD they will appear here.</div>';
    } else {
        teamReps.slice().reverse().forEach(function(r) {
            var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '-';
            html += '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid #1a73e8;border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
                + '<div style="flex:1;min-width:200px;">'
                + '<div style="font-size:14px;font-weight:700;">' + (r.title||'Report') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">👤 ' + (r.createdByName||r.createdBy||'') + ' &nbsp;·&nbsp; 📅 ' + date + ' &nbsp;·&nbsp; ' + (r.category||'report').charAt(0).toUpperCase()+(r.category||'report').slice(1) + '</div>'
                + (r._tasksTotal !== undefined
                    ? '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--gray);">'
                    + '<span>✅ Tasks: <strong>' + r._tasksDone + '/' + r._tasksTotal + '</strong></span>'
                    + '<span>🔧 Issues: <strong>' + r._probsTotal + '</strong> (' + r._probsOpen + ' open)</span>'
                    + '<span>📋 Checklist: <strong>' + r._clRate + '%</strong></span>'
                    + '<span>📦 Requests: <strong>' + r._reqsTotal + '</strong></span>'
                    + '</div>'
                    : '')
                + (r.description ? '<div style="font-size:12px;color:var(--text);margin-top:6px;line-height:1.5;background:var(--light-gray);padding:8px;border-radius:6px;">' + r.description.substring(0,250) + (r.description.length>250?'…':'') + '</div>' : '')
                + '</div>'
                + '<div style="display:flex;flex-direction:column;gap:4px;">'
                + '<button class="btn btn-sm" style="background:#25D366;color:#fff;padding:4px 8px;white-space:nowrap;" onclick="hodShareReport(\'' + r.id + '\',\'whatsapp\')">💬 WA</button>'
                + '<button class="btn btn-sm" style="background:#1a73e8;color:#fff;padding:4px 8px;white-space:nowrap;" onclick="hodShareReport(\'' + r.id + '\',\'email\')">✉️ Email</button>'
                + '</div></div></div>';
        });
    }

    // ── Dept Work Summary ──
    html += '<div style="font-weight:700;font-size:16px;margin-bottom:4px;">📤 Department Reports — '+d.dept+'</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-bottom:12px;">Generate and share task performance reports for your department</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:20px;">'
        +kBox(all.length,'Total Tasks','var(--text)')
        +kBox(done,'Completed','var(--success)')
        +kBox(pend,'Pending','#ff9800')
        +kBox(ovd,'Overdue','var(--danger)')
        +kBox(reqs.length,'Requests','#9c27b0')
        +kBox(clRate+'%','Checklist', clRate>=80?'var(--success)':clRate>=50?'#ff9800':'var(--danger)')
        +'</div>'

        // report cards
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">'
        +'<div class="card" style="padding:18px;border-top:3px solid #1a73e8;">'
        +'<div style="font-size:15px;font-weight:700;margin-bottom:4px;">✅ Task Report</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-bottom:14px;">All tasks assigned to '+d.dept+' (HOD + Admin)</div>'
        +'<div style="display:flex;flex-direction:column;gap:8px;">'
        +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-sm" style="flex:1;background:#1e7e34;color:#fff;" onclick="hodExportTasks(\'excel\')">📊 Excel</button>'
        +'<button class="btn btn-sm" style="flex:1;background:#c82333;color:#fff;" onclick="hodExportTasks(\'pdf\')">📄 PDF</button>'
        +'</div>'
        +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;" onclick="hodShareTasks(\'whatsapp\')">💬 WhatsApp</button>'
        +'<button class="btn btn-sm" style="flex:1;background:#1a73e8;color:#fff;" onclick="hodShareTasks(\'email\')">✉️ Email</button>'
        +'</div></div></div>'
        +'<div class="card" style="padding:18px;border-top:3px solid #9c27b0;">'
        +'<div style="font-size:15px;font-weight:700;margin-bottom:4px;">📊 Performance Report</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-bottom:14px;">Per-member task completion breakdown</div>'
        +'<div style="display:flex;flex-direction:column;gap:8px;">'
        +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-sm" style="flex:1;background:#1e7e34;color:#fff;" onclick="hodExportPerformance(\'excel\')">📊 Excel</button>'
        +'<button class="btn btn-sm" style="flex:1;background:#c82333;color:#fff;" onclick="hodExportPerformance(\'pdf\')">📄 PDF</button>'
        +'</div>'
        +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;" onclick="hodSharePerformance(\'whatsapp\')">💬 WhatsApp</button>'
        +'<button class="btn btn-sm" style="flex:1;background:#1a73e8;color:#fff;" onclick="hodSharePerformance(\'email\')">✉️ Email</button>'
        +'</div></div></div>'
        +'<div class="card" style="padding:18px;border-top:3px solid #37474f;">'
        +'<div style="font-size:15px;font-weight:700;margin-bottom:4px;">📑 Summary Report</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-bottom:14px;">Combined dept summary: tasks, requests & checklists</div>'
        +'<div style="display:flex;flex-direction:column;gap:8px;">'
        +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-sm" style="flex:1;background:#1e7e34;color:#fff;" onclick="hodExportSummary(\'excel\')">📊 Excel</button>'
        +'<button class="btn btn-sm" style="flex:1;background:#c82333;color:#fff;" onclick="hodExportSummary(\'pdf\')">📄 PDF</button>'
        +'</div>'
        +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;" onclick="hodShareSummary(\'whatsapp\')">💬 WhatsApp</button>'
        +'<button class="btn btn-sm" style="flex:1;background:#1a73e8;color:#fff;" onclick="hodShareSummary(\'email\')">✉️ Email</button>'
        +'</div></div></div>'
        +'</div>';

    // send to admin form with auto-generated summary
    var autoSummary = _genHodWorkSummary();
    var today = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});
    html += '<div class="card" style="margin-top:16px;padding:18px;border-top:3px solid #6a1b9a;">'
        +'<div style="font-size:15px;font-weight:700;margin-bottom:12px;">📬 Send Report to Admin</div>'
        +'<form id="hodReportForm2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
        +'<div class="form-group"><label>Report Title *</label><input type="text" name="title" class="form-control" value="' + (d.dept+' Report — '+today).replace(/"/g,'&quot;') + '" required></div>'
        +'<div class="form-group"><label>Period</label><select name="category" class="form-control"><option value="daily">Daily</option><option value="weekly" selected>Weekly</option><option value="monthly">Monthly</option></select></div>'
        +'<div class="form-group" style="grid-column:1/-1;"><label>Work Summary (auto-generated — edit as needed)</label>'
        +'<textarea name="description" class="form-control" rows="10" required style="font-family:monospace;font-size:12px;">' + autoSummary.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea></div>'
        +'</form>'
        +'<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">'
        +'<button class="btn btn-primary" onclick="hodSaveReport2()">📤 Send to Admin</button>'
        +'<button class="btn btn-sm" style="background:#25D366;color:#fff;" onclick="hodShareFormReport(\'whatsapp\')">💬 WhatsApp</button>'
        +'<button class="btn btn-sm" style="background:#1a73e8;color:#fff;" onclick="hodShareFormReport(\'email\')">✉️ Email</button>'
        +'</div></div>';

    // submitted reports history
    var deptReports = (DB.get('reports')||[]).filter(function(r){ return r.department === d.dept; }).slice().reverse().slice(0,10);
    if (deptReports.length) {
        var rows = deptReports.map(function(r){
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">'
                +'<div style="flex:1;min-width:160px;"><div style="font-size:13px;font-weight:600;">' + (r.title||'') + '</div>'
                +'<div style="font-size:11px;color:var(--gray);">' + (r.category||'') + ' · ' + (r.createdByName||r.createdBy||'') + ' · ' + APP.formatDate(r.createdAt) + '</div></div>'
                +'<span class="badge badge-success" style="font-size:10px;">sent</span>'
                +'<button class="btn btn-sm" style="background:#25D366;color:#fff;padding:3px 7px;" onclick="hodShareReport(\'' + r.id + '\',\'whatsapp\')">💬</button>'
                +'<button class="btn btn-sm" style="background:#1a73e8;color:#fff;padding:3px 7px;" onclick="hodShareReport(\'' + r.id + '\',\'email\')">✉️</button>'
                +'</div>';
        }).join('');
        html += '<div class="card" style="margin-top:16px;padding:18px;">'
            +'<div style="font-size:14px;font-weight:700;margin-bottom:10px;">📋 Recent Submitted Reports</div>'
            + rows +'</div>';
    }

    el.innerHTML = html;
}

/* ── HOD work summary generator ── */
function _genHodWorkSummary() {
    var d   = _hodData;
    if (!d || !d.user) return '';
    var now = new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
    var all = d.allDeptTasks || [];
    var done= all.filter(function(t){ return t.status==='completed'; });
    var pend= all.filter(function(t){ return t.status==='pending'; });
    var prog= all.filter(function(t){ return t.status==='in-progress'; });
    var ovd = d.overdueTasks || [];
    var reqs= d.myReqs || [];
    var probs= d.routedProblems || [];

    var lines = [];
    lines.push('DEPARTMENT WORK SUMMARY REPORT');
    lines.push('HOD: ' + d.user.fullName + ' | Department: ' + (d.dept||'—') + ' | Date: ' + now);
    lines.push('Team Members: ' + (d.team||[]).length);
    lines.push('');

    lines.push('── TASK SUMMARY ──');
    lines.push('Total: ' + all.length + ' | Completed: ' + done.length + ' | In Progress: ' + prog.length + ' | Pending: ' + pend.length + ' | Overdue: ' + ovd.length);
    var rate = all.length > 0 ? Math.round(done.length/all.length*100) : 0;
    lines.push('Completion Rate: ' + rate + '%');

    if ((d.team||[]).length > 0) {
        lines.push('');
        lines.push('── TEAM PERFORMANCE ──');
        (d.team||[]).forEach(function(m) {
            var mt   = all.filter(function(t){ return t.assignedTo===m.fullName; });
            var md   = mt.filter(function(t){ return t.status==='completed'; }).length;
            var mo   = mt.filter(function(t){ return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed'; }).length;
            lines.push('  ' + m.fullName + ': ' + md + '/' + mt.length + ' done' + (mo>0?' | '+mo+' overdue':''));
        });
    }

    lines.push('');
    lines.push('── MATERIAL REQUESTS ──');
    lines.push('Total: ' + reqs.length + ' | Pending: ' + reqs.filter(function(r){return r.status==='pending';}).length + ' | Approved: ' + reqs.filter(function(r){return r.status==='approved';}).length);

    lines.push('');
    lines.push('── OPEN ISSUES / PROBLEMS ──');
    lines.push('Routed to Dept: ' + probs.length);
    if (probs.length > 0) {
        probs.slice(0,5).forEach(function(p,i){ lines.push('  '+(i+1)+'. ['+((p.status||'open').toUpperCase())+'] '+p.title); });
        if (probs.length > 5) lines.push('  ... and ' + (probs.length-5) + ' more');
    }

    lines.push('');
    lines.push('── CHECKLISTS ──');
    var clTotal=0, clDone=0;
    (d.myCl||[]).forEach(function(cl){ var items=cl.items||[]; clTotal+=items.length; clDone+=items.filter(function(i){return i.done||i.status==='ok';}).length; });
    lines.push('Items: ' + clDone + '/' + clTotal + ' (' + (clTotal>0?Math.round(clDone/clTotal*100):0) + '% complete)');

    return lines.join('\n');
}

/* ── Export helpers ── */
function _hodTaskRows() {
    return (_hodData.allDeptTasks || []).map(function(t) {
        return [
            t.title||'', t._source==='admin'?'Admin':'HOD',
            t.assignedTo||'', t.status||'', t.priority||'',
            t.deadline ? APP.formatDate(t.deadline) : '',
            t.createdByName||t.createdBy||'', APP.formatDate(t.createdAt),
            t.completedAt ? APP.formatDate(t.completedAt) : ''
        ];
    });
}

function _hodPerfRows() {
    var d = _hodData;
    return (d.team||[]).map(function(m) {
        var mt   = (d.allDeptTasks||[]).filter(function(t){ return t.assignedTo===m.fullName; });
        var done = mt.filter(function(t){ return t.status==='completed'; }).length;
        var ovd  = mt.filter(function(t){ return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed'; }).length;
        var rate = mt.length>0?Math.round(done/mt.length*100):0;
        return [m.fullName, mt.length, done, mt.length-done, ovd, rate+'%'];
    });
}

function hodExportTasks(fmt) {
    var d = _hodData;
    var headers = ['Title','Source','Assigned To','Status','Priority','Deadline','Created By','Created','Completed'];
    var rows = _hodTaskRows();
    if (rows.length===0){ APP.notify('No tasks to export','info'); return; }
    fmt==='excel' ? _hodExcelExport(d.dept+' Task Report', headers, rows)
                  : _hodPdfExport(d.dept+' Task Report', headers, rows);
}

function hodExportPerformance(fmt) {
    var d = _hodData;
    var headers = ['Member','Assigned','Completed','Pending','Overdue','Completion Rate'];
    var rows = _hodPerfRows();
    if (rows.length===0){ APP.notify('No team data to export','info'); return; }
    fmt==='excel' ? _hodExcelExport(d.dept+' Performance Report', headers, rows)
                  : _hodPdfExport(d.dept+' Performance Report', headers, rows);
}

function hodExportSummary(fmt) {
    var d = _hodData;
    var all = d.allDeptTasks||[];
    var done= all.filter(function(t){return t.status==='completed';}).length;
    var reqs= (d.myReqs||[]);
    var reqPend=reqs.filter(function(r){return r.status==='pending';}).length;
    var clTotal=0,clDone=0;
    (d.myCl||[]).forEach(function(cl){ var items=cl.items||[]; clTotal+=items.length; clDone+=items.filter(function(i){return i.done||i.status==='ok';}).length; });
    var headers = ['Category','Metric','Value'];
    var rows = [
        ['Tasks','Total Tasks', all.length],
        ['Tasks','Completed', done],
        ['Tasks','Pending', all.filter(function(t){return t.status==='pending';}).length],
        ['Tasks','Overdue', d.overdueTasks.length],
        ['Tasks','Completion Rate', (all.length>0?Math.round(done/all.length*100):0)+'%'],
        ['Material Requests','Total Requests', reqs.length],
        ['Material Requests','Pending Approval', reqPend],
        ['Material Requests','Approved', reqs.filter(function(r){return r.status==='approved';}).length],
        ['Checklists','Total Items', clTotal],
        ['Checklists','Completed Items', clDone],
        ['Checklists','Completion Rate', (clTotal>0?Math.round(clDone/clTotal*100):0)+'%'],
        ['Team','Members', (d.team||[]).length]
    ];
    fmt==='excel' ? _hodExcelExport(d.dept+' Summary Report', headers, rows)
                  : _hodPdfExport(d.dept+' Summary Report', headers, rows);
}

function _hodExcelExport(title, headers, rows) {
    if (typeof XLSX==='undefined'){ APP.notify('Excel library not loaded','error'); return; }
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
    ws['!cols'] = headers.map(function(h,ci){
        var max=h.length;
        rows.forEach(function(r){ var v=r[ci]!=null?String(r[ci]):''; if(v.length>max) max=v.length; });
        return { wch: Math.min(max+4,40) };
    });
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0,31));
    XLSX.writeFile(wb, title.replace(/[^a-z0-9]/gi,'_')+'.xlsx');
    APP.notify('Excel downloaded', 'success');
}

function _hodPdfExport(title, headers, rows) {
    if (typeof window.jspdf==='undefined'){ APP.notify('PDF library not loaded','error'); return; }
    var doc = new window.jspdf.jsPDF({ orientation: rows[0] && rows[0].length > 6 ? 'landscape' : 'portrait' });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text('Department: '+(_hodData.dept||'')+'   Generated: '+new Date().toLocaleDateString('en-IN'), 14, 22);
    doc.autoTable({ head:[headers], body:rows, startY:27, styles:{fontSize:8}, headStyles:{fillColor:[106,27,154]} });
    doc.save(title.replace(/[^a-z0-9]/gi,'_')+'.pdf');
    APP.notify('PDF downloaded', 'success');
}

/* ── Share helpers ── */
function _hodBuildText(title, headers, rows) {
    var d = _hodData;
    var lines = ['*'+title+'*','Department: '+d.dept,'Generated: '+new Date().toLocaleDateString('en-IN'),''];
    lines.push(headers.join(' | '));
    rows.forEach(function(r){ lines.push(r.join(' | ')); });
    return lines.join('\n');
}

function hodShareTasks(via) {
    var text = _hodBuildText(_hodData.dept+' Task Report',
        ['Title','Source','Assigned To','Status','Priority','Deadline'],
        _hodTaskRows().map(function(r){ return r.slice(0,6); }));
    _hodShare(via, _hodData.dept+' Task Report', text);
}

function hodSharePerformance(via) {
    var text = _hodBuildText(_hodData.dept+' Performance Report',
        ['Member','Assigned','Completed','Pending','Overdue','Rate'], _hodPerfRows());
    _hodShare(via, _hodData.dept+' Performance Report', text);
}

function hodShareSummary(via) {
    var d = _hodData, all = d.allDeptTasks||[];
    var done= all.filter(function(t){return t.status==='completed';}).length;
    var rate= all.length>0?Math.round(done/all.length*100):0;
    var text = '*'+d.dept+' Summary Report*\nDate: '+new Date().toLocaleDateString('en-IN')
        +'\n\n*Tasks*\nTotal: '+all.length+'\nCompleted: '+done+'\nPending: '+all.filter(function(t){return t.status==='pending';}).length
        +'\nOverdue: '+d.overdueTasks.length+'\nCompletion Rate: '+rate+'%'
        +'\n\n*Material Requests*\nTotal: '+(d.myReqs||[]).length+'\nPending: '+(d.myReqs||[]).filter(function(r){return r.status==='pending';}).length
        +'\n\n*Team Members*: '+(d.team||[]).length;
    _hodShare(via, d.dept+' Summary Report', text);
}

function _hodShare(via, subject, text) {
    if (via==='whatsapp') {
        window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(text), '_blank');
    } else {
        window.location.href = 'mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
    }
}

// Share a previously saved report from the history list
function hodShareReport(id, via) {
    var r = (DB.get('reports')||[]).find(function(x){ return x.id === id; });
    if (!r) { APP.notify('Report not found','error'); return; }
    var dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '-';
    var text = '🏥 *HOSPITAL MANAGEMENT SYSTEM*\n'
        + '*' + (r.title||'Report') + '*\n'
        + '━━━━━━━━━━━━━━━━━━━━━\n'
        + '👤 *From:* ' + (r.createdByName||r.createdBy||'') + '\n'
        + '🏢 *Department:* ' + (r.department||'—') + '\n'
        + '📅 *Date:* ' + dateStr + '\n'
        + '📂 *Period:* ' + (r.category||'—') + '\n'
        + '📨 *Sent To:* ' + (r.sentTo||'HOD/Admin') + '\n';
    if (r._tasksTotal !== undefined) {
        text += '━━━━━━━━━━━━━━━━━━━━━\n'
            + '📋 *Tasks:* ' + r._tasksDone + '/' + r._tasksTotal + ' done'
            + (r._tasksTotal>0?' ('+Math.round(r._tasksDone/r._tasksTotal*100)+'%)':'') + '\n'
            + '🔧 *Issues:* ' + r._probsTotal + ' total, ' + r._probsOpen + ' open\n'
            + '✅ *Checklist:* ' + r._clRate + '% compliance\n'
            + '📦 *Requests:* ' + r._reqsTotal + '\n';
    }
    text += '━━━━━━━━━━━━━━━━━━━━━\n\n' + (r.description||'');
    _hodShare(via, r.title||'Report', text);
}

// Share the content currently in the Send-to-Admin form without saving
function hodShareFormReport(via) {
    var form = document.getElementById('hodReportForm2');
    if (!form) { APP.notify('Fill the form first','error'); return; }
    var title = form.querySelector('[name="title"]') ? form.querySelector('[name="title"]').value : '';
    var desc  = form.querySelector('[name="description"]') ? form.querySelector('[name="description"]').value : '';
    var cat   = form.querySelector('[name="category"]') ? form.querySelector('[name="category"]').value : '';
    if (!title && !desc) { APP.notify('Fill the report form first','error'); return; }
    var user = AUTH.currentUser();
    var text = '*' + (title||'Report') + '*'
        + '\nFrom: ' + (user ? user.fullName : '')
        + (user && user.department ? ' — ' + user.department : '')
        + '\nDate: ' + new Date().toLocaleDateString('en-IN')
        + '\nPeriod: ' + (cat||'-')
        + '\n\n' + (desc||'');
    _hodShare(via, title||'Report', text);
}

function hodSaveReport2() {
    var user = AUTH.currentUser();
    if (!user) return;
    var data = getFormData('hodReportForm2');
    if (!data.title || !data.description) { APP.notify('Title and summary required','error'); return; }
    DB.add('reports', {
        title: data.title, category: data.category, description: data.description,
        createdBy: user.username, createdByName: user.fullName,
        department: user.department, status: 'sent', createdAt: new Date().toISOString()
    });
    APP.notify('Report sent to admin', 'success');
    document.getElementById('hodReportForm2').reset();
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

/* ═══════════════════════════════════════════════
   QUARTERLY PRIORITIES TAB
═══════════════════════════════════════════════ */
function _hodQP(el) {
    el.innerHTML = '<div id="hodQPContent"></div>';
    if (typeof renderHodQP === 'function') {
        renderHodQP(document.getElementById('hodQPContent'), _hodData.dept);
    } else {
        el.innerHTML = '<div class="empty-state">Quarterly Priorities module not loaded.</div>';
    }
}

/* ═══════════════════════════════════════════════
   HOD MATERIAL RETURN
═══════════════════════════════════════════════ */
var _hodReturnItems = [];

function hodCreateReturn() {
    _hodReturnItems = [];
    var user = AUTH.currentUser();
    var myReqs = (DB.get('material_requests') || []).filter(function(r) {
        return r._source === 'hod' && r.createdBy === user.username
            && (r.status === 'store_fulfilled' || r.status === 'confirmed');
    });

    var reqOpts = '<option value="">-- None --</option>'
        + myReqs.map(function(r) {
            return '<option value="' + r.id + '">' + (r.title || 'Request') + ' (' + APP.formatDate(r.createdAt) + ')</option>';
        }).join('');

    var form = '<form id="hodReturnForm">'
        + '<div class="form-group"><label>Return Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Returning unused masks"></div>'
        + '<div class="form-group"><label>Reason for Return</label><textarea name="reason" class="form-control" rows="2"></textarea></div>'
        + '<div class="form-group"><label>Linked Request (optional)</label><select name="linkedReqId" class="form-control">' + reqOpts + '</select></div>'
        + '<div class="form-group"><label>Items to Return</label>'
        + '<div id="hodRetItemsContainer">'
        + '<div class="hod-ret-row" style="display:flex;gap:6px;margin-bottom:4px;">'
        + '<input type="text" class="form-control hod-ret-name" placeholder="Item name" style="flex:2;">'
        + '<input type="number" class="form-control hod-ret-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control hod-ret-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-success" onclick="hodAddReturnRow()">+</button>'
        + '</div></div></div>'
        + '</form>';

    openFormModal('↩️ Return Materials to Storekeeper', form, 'hodSaveReturn()', false);
}

function hodAddReturnRow() {
    var container = document.getElementById('hodRetItemsContainer');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'hod-ret-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';
    row.innerHTML = '<input type="text" class="form-control hod-ret-name" placeholder="Item name" style="flex:2;">'
        + '<input type="number" class="form-control hod-ret-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control hod-ret-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">−</button>';
    container.appendChild(row);
}

function hodSaveReturn() {
    var user = AUTH.currentUser();
    var form = document.getElementById('hodReturnForm');
    if (!form) return false;
    var title  = ((form.querySelector('[name="title"]') || {}).value || '').trim();
    var reason = (form.querySelector('[name="reason"]') || {}).value || '';
    var linkedReqId = (form.querySelector('[name="linkedReqId"]') || {}).value || '';
    if (!title) { APP.notify('Enter a return title', 'error'); return false; }

    var items = [];
    document.querySelectorAll('.hod-ret-row').forEach(function(row) {
        var name = ((row.querySelector('.hod-ret-name') || {}).value || '').trim();
        var qty  = parseInt((row.querySelector('.hod-ret-qty') || {}).value) || 1;
        var unit = ((row.querySelector('.hod-ret-unit') || {}).value || '').trim() || 'pcs';
        if (name) items.push({ name: name, qty: qty, unit: unit });
    });
    if (!items.length) { APP.notify('Add at least one item to return', 'error'); return false; }

    DB.add('material_returns', {
        title: title,
        reason: reason,
        linkedReqId: linkedReqId || null,
        department: user.department || '',
        createdBy: user.username,
        createdByName: user.fullName,
        createdAt: new Date().toISOString(),
        items: items,
        status: 'pending'
    });

    APP.notify('Return request submitted to Storekeeper!', 'success');
    _hodData.myReturns = (DB.get('material_returns') || []).filter(function(r) {
        return r.createdBy === user.username;
    }).slice().reverse();
    _renderHodTab('requests');
    return true;
}
