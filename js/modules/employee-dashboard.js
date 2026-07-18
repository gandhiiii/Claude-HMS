// Employee Dashboard — personal work view, distinct from admin
// All sections are data-driven; no department hard-coding.

var _empTab = 'overview';
var _empClFilter = 'daily';
var _empData = {};

/* ── Quarter helpers ── */
function _getQuarter() {
    var now = new Date();
    var q = Math.floor(now.getMonth() / 3);
    var qStart = new Date(now.getFullYear(), q * 3, 1);
    var qEnd   = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
    return { name: 'Q' + (q + 1) + ' ' + now.getFullYear(), start: qStart, end: qEnd, idx: q };
}
function _inRange(dateStr, start, end) {
    if (!dateStr) return false;
    var d = new Date(dateStr);
    return d >= start && d <= end;
}
function _isToday(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function _isThisWeek(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr), n = new Date();
    var weekStart = new Date(n); weekStart.setDate(n.getDate() - n.getDay());
    var weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    return d >= weekStart && d <= weekEnd;
}

/* ── Style injection (once) ── */
(function() {
    var s = document.createElement('style');
    s.textContent = [
        '.emp-tab-btn{padding:9px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--gray);border-bottom:3px solid transparent;transition:0.2s;white-space:nowrap;}',
        '.emp-tab-btn.active{color:var(--primary);border-bottom-color:var(--primary);font-weight:700;}',
        '.emp-tab-btn:hover:not(.active){color:var(--text);background:var(--light-gray);}',
        '.emp-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:0.15s;}',
        '.emp-kpi:hover{box-shadow:0 2px 8px rgba(0,0,0,.1);}',
        '.emp-kpi-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
        '.emp-kpi-val{font-size:22px;font-weight:700;line-height:1;}',
        '.emp-kpi-lbl{font-size:11px;color:var(--gray);margin-top:2px;}',
        '.q-progress-track{background:var(--light-gray);border-radius:8px;height:10px;overflow:hidden;}',
        '.q-progress-fill{height:100%;border-radius:8px;transition:width .5s;}',
        '.work-item{padding:10px 14px;border-radius:8px;background:var(--card);border:1px solid var(--border);margin-bottom:8px;display:flex;align-items:center;gap:12px;}',
        '.work-item.overdue{border-left:4px solid var(--danger);}',
        '.work-item.urgent{border-left:4px solid var(--warning);}',
        '.work-item.done{opacity:0.6;}',
        '.hod-tag{background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;}',
    ].join('');
    document.head.appendChild(s);
})();

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderEmployeeDashboard(container) {
    var user = AUTH.currentUser();
    if (!user) { container.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || '';
    var u    = user.fullName || user.username;
    var q    = _getQuarter();

    // Merge admin tasks + HOD-assigned tasks, tagging each with its source store
    var tasks = (DB.get('tasks') || []).map(function(t){ return Object.assign({}, t, {_store: 'tasks'}); })
               .concat((DB.get('hodTasks') || []).map(function(t){ return Object.assign({}, t, {_store: 'hodTasks'}); }));
    var problems      = DB.get('problems') || [];
    var requests      = DB.get('material_requests') || [];
    var checklists    = DB.get('checklists') || [];
    var inventory     = DB.get('inventory') || [];
    var projects      = DB.get('projects') || [];
    var reports       = DB.get('reports') || [];
    var cleaningTasks = DB.get('roomCleaningTasks') || [];
    var users         = DB.get('users') || [];

    // Identify admin/HOD usernames for tagging
    var adminNames = {};
    users.forEach(function(us) {
        if (us.role === 'admin' || us.role === 'super_admin' || us.role === 'hod') {
            adminNames[us.fullName] = us.role;
            adminNames[us.username] = us.role;
        }
    });

    _empData = {
        user: user, dept: dept, u: u, q: q, adminNames: adminNames,
        myTasks: tasks.filter(function(t) {
            return t.assignedTo === u || t.assignedTo === user.fullName || t.assignedTo === user.username ||
                   (!t.assignedTo && t.department === dept);
        }),
        myProblems: problems.filter(function(p) {
            return p.createdBy === user.username || p.createdBy === user.fullName || p.assignedTo === user.username;
        }),
        myRequests: requests.filter(function(r) {
            return r.createdBy === user.username || r.createdBy === user.fullName;
        }),
        myChecklists: checklists.filter(function(c) {
            return c.assignedTo === user.fullName || c.assignedTo === 'common';
        }),
        myProjects: projects.filter(function(p) {
            return p.assignedTo === u || p.assignedTo === user.fullName || p.assignedTo === user.username;
        }),
        myReports: reports.filter(function(r) {
            return r.createdBy === user.username || r.createdBy === user.fullName;
        }),
        pendingCleaning: cleaningTasks.filter(function(t) { return t.status !== 'done'; }),
        doneCleaning:    cleaningTasks.filter(function(t) { return t.status === 'done'; })
    };

    // Quarter-scoped tasks
    var qTasks = _empData.myTasks.filter(function(t) { return _inRange(t.deadline, q.start, q.end); });
    var qDone  = qTasks.filter(function(t) { return t.status === 'completed'; });
    var qPct   = qTasks.length > 0 ? Math.round((qDone.length / qTasks.length) * 100) : 0;
    // Quarter progress (how far into the quarter are we)
    var qElapsed = Math.max(0, Math.min(100, Math.round(((new Date() - q.start) / (q.end - q.start)) * 100)));

    _empData.qTasks = qTasks; _empData.qDone = qDone; _empData.qPct = qPct;

    // Quick KPI counts
    var todayTasks = _empData.myTasks.filter(function(t) { return _isToday(t.deadline) && t.status !== 'completed'; });
    var weekTasks  = _empData.myTasks.filter(function(t) { return _isThisWeek(t.deadline) && t.status !== 'completed'; });
    var openProbs  = _empData.myProblems.filter(function(p) { return p.status !== 'resolved'; });
    var clTotal    = _empData.myChecklists.length;
    var clDone     = _empData.myChecklists.filter(function(c) { return c.status === 'completed'; }).length;
    var clPct      = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 100;

    var tabs = [
        { id: 'overview',    label: '📊 Overview' },
        { id: 'work',        label: '📝 My Work', badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
        { id: 'checklists',  label: '✅ Checklists' },
        { id: 'reports',     label: '📋 Reports' },
        { id: 'cleaning',    label: '🧹 Cleaning', badge: _empData.pendingCleaning.length, badgeClass: 'badge-danger' },
        { id: 'performance', label: '📊 Performance' },
        { id: 'qgoals',      label: '🎯 Q Goals' }
    ];

    var html = ''
        // ── Profile header ──
        + '<div style="background:linear-gradient(135deg,var(--primary) 0%,#1a6bcc 100%);border-radius:14px;padding:20px 24px;color:#fff;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">'
        + '<div style="display:flex;align-items:center;gap:16px;">'
        + '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:24px;">👤</div>'
        + '<div><div style="font-size:20px;font-weight:700;">' + u + '</div>'
        + '<div style="font-size:13px;opacity:0.85;">' + (dept || 'No Department') + ' &nbsp;·&nbsp; ' + (user.role || 'employee').replace(/_/g,' ') + '</div></div></div>'
        + '<div style="text-align:right;opacity:0.85;font-size:13px;">'
        + new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'})
        + '</div></div>'

        // ── KPI strip ──
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px;">'
        + _kpiCard('📅', 'Due Today',    todayTasks.length, '#fff3e0', '#e65100', 'work')
        + _kpiCard('📆', 'Due This Week', weekTasks.length,  '#e3f2fd', 'var(--primary)', 'work')
        + _kpiCard('✅', 'Checklist Rate', clPct + '%',       '#e8f5e9', 'var(--secondary)', 'checklists')
        + _kpiCard('🔧', 'Open Issues',   openProbs.length,   '#fce4ec', 'var(--danger)', 'reports')
        + _kpiCard('📋', 'My Projects',   _empData.myProjects.length, '#f3e5f5', '#7b1fa2', 'work')
        + '</div>'

        // ── Quarterly strip ──
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:18px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:15px;">📅 ' + q.name + ' Work Progress</div>'
        + '<div style="font-size:13px;color:var(--gray);">' + qDone.length + ' / ' + qTasks.length + ' tasks completed this quarter</div>'
        + '</div>'
        + '<div style="margin-bottom:6px;">'
        // Task completion bar
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);margin-bottom:3px;"><span>Task completion</span><span style="font-weight:600;color:' + (qPct >= 80 ? 'var(--success)' : qPct >= 50 ? 'var(--warning)' : 'var(--danger)') + ';">' + qPct + '%</span></div>'
        + '<div class="q-progress-track"><div class="q-progress-fill" style="width:' + qPct + '%;background:' + (qPct >= 80 ? 'var(--success)' : qPct >= 50 ? 'var(--warning)' : 'var(--danger)') + ';"></div></div>'
        + '</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray);margin-top:6px;">'
        + '<span>' + q.start.toLocaleDateString('en-IN',{month:'short',day:'numeric'}) + '</span>'
        + '<span>' + q.end.toLocaleDateString('en-IN',{month:'short',day:'numeric'}) + '</span></div>'
        + '</div>'

        // ── Cleaning alert ──
        + (_empData.pendingCleaning.length > 0
            ? '<div style="background:#fff3e0;border:2px solid var(--warning);border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="empTabSwitch(\'cleaning\',this)">'
              + '<span style="font-size:24px;">🧹</span><div style="flex:1;"><div style="font-weight:700;color:#e65100;">' + _empData.pendingCleaning.length + ' room(s) need cleaning</div>'
              + '<div style="font-size:12px;color:var(--gray);">Tap to view tasks</div></div><span style="color:#e65100;">›</span></div>'
            : '')

        // ── Tab bar ──
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px 12px 0 0;padding:0 4px;display:flex;overflow-x:auto;gap:2px;border-bottom:none;">'
        + tabs.map(function(t) {
            var label = t.label + (t.badge > 0 ? ' <span class="badge ' + (t.badgeClass || 'badge-primary') + '" style="font-size:10px;margin-left:2px;">' + t.badge + '</span>' : '');
            return '<button class="emp-tab-btn' + (t.id === 'overview' ? ' active' : '') + '" data-tab="' + t.id + '" onclick="empTabSwitch(\'' + t.id + '\',this)">' + label + '</button>';
        }).join('')
        + '</div>'

        // ── Tab content ──
        + '<div style="background:var(--card);border:1px solid var(--border);border-top:3px solid var(--primary);border-radius:0 0 12px 12px;padding:18px;" id="empTabContent">'
        + '</div>';

    container.innerHTML = html;

    _empTab = 'overview';
    _renderEmpTab('overview');
}

function _kpiCard(icon, label, val, bg, color, tab) {
    return '<div class="emp-kpi" onclick="empTabSwitch(\'' + tab + '\')">'
        + '<div class="emp-kpi-icon" style="background:' + bg + ';">' + icon + '</div>'
        + '<div><div class="emp-kpi-val" style="color:' + color + ';">' + val + '</div><div class="emp-kpi-lbl">' + label + '</div></div>'
        + '</div>';
}

function empTabSwitch(tab, btn) {
    _empTab = tab;
    document.querySelectorAll('.emp-tab-btn').forEach(function(el) {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    _renderEmpTab(tab);
}

function _renderEmpTab(tab) {
    var el = document.getElementById('empTabContent');
    if (!el) return;
    if (tab === 'overview')    { renderEmpOverview(el); return; }
    if (tab === 'work')        { renderEmpWorkTab(el); return; }
    if (tab === 'checklists')  { renderEmpChecklistsTab(el); return; }
    if (tab === 'reports')     { renderEmpReportsTab(el); return; }
    if (tab === 'cleaning')    { renderEmpCleaningSection(el); return; }
    if (tab === 'performance') { renderEmpPerformanceTab(el); return; }
    if (tab === 'qgoals')     { renderEmpQGoalsTab(el); return; }
}

function renderEmpQGoalsTab(el) {
    var user = AUTH.currentUser();
    if (!user) return;
    if (typeof renderEmpQP === 'function') {
        renderEmpQP(el, user.username, user.fullName);
    } else {
        el.innerHTML = '<div class="empty-state">Q Goals module not loaded.</div>';
    }
}

/* ══════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════ */
function renderEmpOverview(el) {
    var d = _empData;
    var q = d.q;
    if (!el) el = document.getElementById('empTabContent');
    if (!el) return;

    var tasksPending = d.myTasks.filter(function(t) { return t.status !== 'completed'; });
    var todayTasks   = tasksPending.filter(function(t) { return _isToday(t.deadline); });
    var overdueTasks = tasksPending.filter(function(t) { return t.deadline && new Date(t.deadline) < new Date(); });

    // Recent items
    var recentTasks    = d.myTasks.slice().sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); }).slice(0, 4);
    var recentCl       = d.myChecklists.filter(function(c){ return c.status !== 'completed'; }).slice(0, 4);
    var pendingReqs    = d.myRequests.filter(function(r){ return r.status === 'pending'; }).slice(0, 4);

    var html = '';

    // Overdue alert
    if (overdueTasks.length > 0) {
        html += '<div style="background:#ffebee;border:1px solid var(--danger);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;">'
            + '<strong style="color:var(--danger);">⚠️ ' + overdueTasks.length + ' overdue task(s)</strong> &nbsp;'
            + overdueTasks.slice(0,2).map(function(t){ return '<span style="color:var(--danger);">' + t.title + '</span>'; }).join(', ')
            + (overdueTasks.length > 2 ? ' +' + (overdueTasks.length - 2) + ' more' : '')
            + ' &nbsp;<button class="btn btn-sm btn-danger" onclick="empTabSwitch(\'work\')">View All</button></div>';
    }

    // Today's focus
    html += '<div style="margin-bottom:18px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">🎯 Today\'s Focus</div>';
    if (todayTasks.length === 0 && recentCl.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;padding:16px;text-align:center;background:var(--light-gray);border-radius:8px;">Nothing due today — you\'re all caught up! 🎉</div>';
    } else {
        if (todayTasks.length > 0) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Tasks Due Today</div>';
            todayTasks.slice(0, 5).forEach(function(t) {
                html += _workItem(t, d.adminNames, true);
            });
        }
        if (recentCl.length > 0) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--gray);margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">Open Checklists</div>';
            recentCl.slice(0, 3).forEach(function(cl) {
                var total = cl.items ? cl.items.length : 0;
                var done  = cl.items ? cl.items.filter(function(i){ return i.status === 'ok'; }).length : 0;
                var pct   = total > 0 ? Math.round((done/total)*100) : 0;
                html += '<div class="work-item"><div style="flex:1;">'
                    + '<div style="font-size:13px;font-weight:600;">' + cl.title + '</div>'
                    + '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">'
                    + '<div style="flex:1;max-width:180px;height:5px;background:var(--light-gray);border-radius:3px;"><div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:3px;"></div></div>'
                    + '<span style="font-size:11px;color:var(--gray);">' + done + '/' + total + '</span></div></div>'
                    + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">Open</button></div>';
            });
        }
    }
    html += '</div>';

    // Two-column: recent tasks + quick actions
    html += '<div class="grid-2" style="gap:16px;">'
        + '<div>'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">📝 Recent Tasks</div>';
    if (recentTasks.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">No tasks yet</div>';
    } else {
        recentTasks.forEach(function(t) { html += _workItem(t, d.adminNames, false); });
    }
    html += '</div>'
        + '<div>'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">⚡ Quick Actions</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;">'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'work\')">📝 View All My Tasks</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'checklists\')">✅ Open Checklists</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="Router.navigate(\'problems\')">🔧 Report a Problem</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="Router.navigate(\'material-requests\')">📦 New Material Request</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="showReportForm()">📋 Submit Report</button>'
        + '</div>'
        + (pendingReqs.length > 0
            ? '<div style="margin-top:14px;"><div style="font-weight:600;font-size:13px;margin-bottom:6px;color:var(--gray);">Pending Requests</div>'
              + pendingReqs.map(function(r){ return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--light-gray);">' + (r.title||'Request') + ' <span class="badge badge-warning" style="font-size:10px;">pending</span></div>'; }).join('')
              + '</div>'
            : '')
        + '</div></div>';

    el.innerHTML = html;
}

function _workItem(t, adminNames, showDate) {
    var isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
    var cls = t.status === 'completed' ? 'done' : isOverdue ? 'overdue' : t.priority === 'high' ? 'urgent' : '';
    var fromAdmin = t.createdBy && adminNames[t.createdBy];
    var roleLabel = fromAdmin === 'hod' ? 'HOD' : (fromAdmin === 'admin' || fromAdmin === 'super_admin') ? 'Admin' : null;
    return '<div class="work-item ' + cls + '">'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
        + '<span>' + (t.title || '') + '</span>'
        + (roleLabel ? '<span class="hod-tag">' + roleLabel + '</span>' : '')
        + (t.priority === 'high' ? '<span style="color:var(--danger);font-size:11px;">● High</span>' : '')
        + '</div>'
        + (showDate && t.deadline ? '<div style="font-size:11px;color:' + (isOverdue ? 'var(--danger)' : 'var(--gray)') + ';margin-top:2px;">' + (isOverdue ? '⚠️ Overdue: ' : '📅 ') + APP.formatDate(t.deadline) + '</div>' : '')
        + '</div>'
        + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:10px;flex-shrink:0;">' + (t.status || 'pending') + '</span>'
        + '</div>';
}

/* ══════════════════════════════════════════
   MY WORK TAB (tasks + projects)
══════════════════════════════════════════ */
function renderEmpWorkTab(el) {
    var d = _empData;
    var pending   = d.myTasks.filter(function(t){ return t.status !== 'completed'; });
    var completed = d.myTasks.filter(function(t){ return t.status === 'completed'; });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">📝 My Tasks (' + d.myTasks.length + ')</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<span class="badge badge-warning" style="padding:5px 10px;">' + pending.length + ' pending</span>'
        + '<span class="badge badge-success" style="padding:5px 10px;">' + completed.length + ' done</span>'
        + '</div></div>';

    if (d.myTasks.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--gray);font-size:13px;">No tasks assigned to you</div>';
    } else {
        // Group: due today, this week, later, completed
        var groups = [
            { label: '🔴 Overdue',      items: pending.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date(); }) },
            { label: '📅 Due Today',    items: pending.filter(function(t){ return _isToday(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date()); }) },
            { label: '📆 Due This Week',items: pending.filter(function(t){ return _isThisWeek(t.deadline) && !_isToday(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date()); }) },
            { label: '📋 Later',        items: pending.filter(function(t){ return !t.deadline || (!_isThisWeek(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date())); }) },
            { label: '✅ Completed',    items: completed }
        ];

        groups.forEach(function(g) {
            if (g.items.length === 0) return;
            html += '<div style="margin-bottom:16px;">'
                + '<div style="font-size:12px;font-weight:700;color:var(--gray);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">' + g.label + ' (' + g.items.length + ')</div>';
            g.items.forEach(function(t) {
                var fromAdmin = t.createdBy && d.adminNames[t.createdBy];
                var roleLabel = fromAdmin === 'hod' ? 'HOD' : (fromAdmin === 'admin' || fromAdmin === 'super_admin') ? 'Admin' : null;
                var isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
                html += '<div class="work-item ' + (t.status==='completed'?'done':isOverdue?'overdue':t.priority==='high'?'urgent':'') + '" style="flex-wrap:wrap;gap:6px;">'
                    + '<div style="flex:1;min-width:200px;">'
                    + '<div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
                    + '<span>' + (t.title||'') + '</span>'
                    + (roleLabel ? '<span class="hod-tag">' + roleLabel + '</span>' : '')
                    + (t.priority === 'high' ? '<span class="badge badge-danger" style="font-size:10px;">High</span>' : t.priority === 'medium' ? '<span class="badge badge-warning" style="font-size:10px;">Med</span>' : '')
                    + '</div>'
                    + (t.description ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + t.description.substring(0,80) + (t.description.length>80?'…':'') + '</div>' : '')
                    + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">'
                    + (t.deadline ? (isOverdue ? '<span style="color:var(--danger);">⚠️ Due: ' : '📅 Due: ') + APP.formatDate(t.deadline) + (isOverdue?'</span>':'') : '')
                    + (t.createdBy ? ' &nbsp;·&nbsp; From: ' + t.createdBy : '')
                    + '</div></div>'
                    + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status||'pending') + '</span>'
                    + (t.status !== 'completed'
                        ? '<button class="btn btn-sm btn-success" onclick="empUpdateTaskStatus(\'' + t.id + '\',\'' + (t._store||'tasks') + '\')" style="white-space:nowrap;">'
                          + (t.status === 'in-progress' ? 'Mark Done' : 'Start') + '</button>'
                        : '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'tasks\')">View</button>')
                    + '</div>';
            });
            html += '</div>';
        });
    }

    // Projects
    if (d.myProjects.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">📋 My Projects (' + d.myProjects.length + ')</div>';
        d.myProjects.forEach(function(p) {
            var pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
            html += '<div class="work-item" style="flex-wrap:wrap;gap:10px;">'
                + '<div style="flex:1;min-width:200px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (p.name||'') + '</div>'
                + (p.description ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + p.description.substring(0,80) + '</div>' : '')
                + '</div>'
                + '<span class="badge ' + APP.getStatusBadge(p.status) + '" style="font-size:11px;">' + (p.status||'planning') + '</span>'
                + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'projects\')">Open</button>'
                + '</div>';
        });
        html += '</div>';
    }

    // Material requests with new multi-stage status display
    var empMatStatusMap = {
        'pending':           { label: 'Waiting HOD',      badge: 'badge-warning' },
        'hod_approved':      { label: 'HOD Approved',     badge: 'badge-info' },
        'hod_rejected':      { label: 'HOD Rejected',     badge: 'badge-danger' },
        'facility_approved': { label: 'Facility Approved',badge: 'badge-info' },
        'facility_rejected': { label: 'Facility Rejected',badge: 'badge-danger' },
        'store_fulfilled':   { label: 'Ready to Collect', badge: 'badge-success' },
        'confirmed':         { label: 'Confirmed',        badge: 'badge-success' },
        'partial':           { label: 'Partial',          badge: 'badge-warning' },
        'approved':          { label: 'Approved',         badge: 'badge-success' },
        'rejected':          { label: 'Rejected',         badge: 'badge-danger' }
    };
    if (d.myRequests.length > 0) {
        var storeFulfilledReqs = d.myRequests.filter(function(r){ return r.status === 'store_fulfilled'; });
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
            + '<div style="font-weight:700;font-size:15px;">&#128230; My Material Requests (' + d.myRequests.length + ')</div>'
            + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'material-requests\')">+ New Request</button></div>';
        if (storeFulfilledReqs.length > 0) {
            html += '<div style="background:#e8f5e9;border:2px solid var(--success);border-radius:8px;padding:10px 14px;margin-bottom:10px;">'
                + '<strong style="color:var(--success);">&#128230; ' + storeFulfilledReqs.length + ' request(s) ready to collect — please confirm receipt!</strong></div>';
        }
        d.myRequests.slice().reverse().slice(0, 6).forEach(function(r) {
            var stInfo = empMatStatusMap[r.status] || { label: r.status || 'pending', badge: 'badge-warning' };
            var canConfirm = r.status === 'store_fulfilled';
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (r.title || 'Request') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + APP.formatDate(r.createdAt) + '</div>'
                + '</div>'
                + '<span class="badge ' + stInfo.badge + '" style="font-size:11px;">' + stInfo.label + '</span>'
                + (canConfirm
                    ? '<button class="btn btn-sm btn-success" onclick="empConfirmMatReq(\'' + r.id + '\',false)">Confirm</button>'
                    + '<button class="btn btn-sm btn-warning" onclick="empConfirmMatReq(\'' + r.id + '\',true)">Partial</button>'
                    : '')
                + '</div>';
        });
        html += '</div>';
    }

    // Problems assigned to me
    var assignedProbs = d.myProblems.filter(function(p) { return p.assignedTo === d.user.username && p.status !== 'resolved'; });
    if (assignedProbs.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">&#128295; Problems Assigned to Me (' + assignedProbs.length + ')</div>';
        assignedProbs.forEach(function(p) {
            var statusBadge = p.status === 'in_progress' ? 'badge-info' : 'badge-warning';
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (p.title || '') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
                + 'Category: ' + (p.category || '-') + ' &middot; ' + APP.formatDate(p.createdAt)
                + (p.assignNote ? '<br>Note: ' + p.assignNote : '')
                + '</div></div>'
                + '<span class="badge ' + statusBadge + '" style="font-size:11px;">' + (p.status || 'assigned').replace('_', ' ') + '</span>'
                + (p.status === 'assigned' ? '<button class="btn btn-sm btn-info" onclick="empMarkProbInProgress(\'' + p.id + '\')">Start</button>' : '')
                + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'problems\')">View</button>'
                + '</div>';
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   CHECKLISTS TAB
══════════════════════════════════════════ */
function renderEmpChecklistsTab(el) {
    var d = _empData;
    var clPending   = d.myChecklists.filter(function(c){ return c.status !== 'completed'; });
    var clCompleted = d.myChecklists.filter(function(c){ return c.status === 'completed'; });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">✅ My Checklists</div>'
        + '<div style="display:flex;gap:4px;">'
        + '<button class="tab-btn active" onclick="filterEmpCl(\'daily\',this)">Daily</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'weekly\',this)">Weekly</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'monthly\',this)">Monthly</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'all\',this)">All</button>'
        + '</div></div>';

    html += '<div id="empClListNew"></div>';
    el.innerHTML = html;
    _empClFilter = 'daily';
    window._empChecklists = d.myChecklists;
    _renderEmpChecklists(d.myChecklists);
}

function filterEmpCl(filter, btn) {
    _empClFilter = filter;
    btn.parentNode.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    _renderEmpChecklists(window._empChecklists || []);
}

function _renderEmpChecklists(checklists) {
    var el = document.getElementById('empClListNew');
    if (!el) return;
    var filtered = checklists.filter(function(cl) {
        if (_empClFilter === 'all') return true;
        return (cl.title || '').toLowerCase().indexOf(_empClFilter) !== -1;
    });
    if (filtered.length === 0) {
        el.innerHTML = '<div style="color:var(--gray);font-size:13px;padding:20px;text-align:center;">No ' + _empClFilter + ' checklists assigned</div>';
        return;
    }
    var html = '';
    filtered.forEach(function(cl) {
        var total = cl.items ? cl.items.length : 0;
        var done  = cl.items ? cl.items.filter(function(i){ return i.status === 'ok'; }).length : 0;
        var pct   = total > 0 ? Math.round((done/total)*100) : 0;
        var isDue = cl.deadline && _isToday(cl.deadline);
        html += '<div class="work-item' + (isDue?' urgent':'') + '" style="flex-direction:column;align-items:stretch;gap:8px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;">'
            + '<div style="font-size:14px;font-weight:600;">' + (cl.title||'') + (cl.floor ? ' <span style="font-size:11px;color:var(--gray);">· ' + cl.floor + '</span>' : '') + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<span class="badge ' + (cl.status==='completed'?'badge-success':'badge-info') + '" style="font-size:11px;">' + (cl.status||'active') + '</span>'
            + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">Open</button>'
            + '</div></div>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<div style="flex:1;height:8px;background:var(--light-gray);border-radius:4px;"><div style="height:100%;width:' + pct + '%;background:' + (pct===100?'var(--success)':pct>=50?'var(--warning)':'var(--danger)') + ';border-radius:4px;"></div></div>'
            + '<span style="font-size:12px;color:var(--gray);min-width:50px;">' + done + '/' + total + ' items</span>'
            + '</div>'
            + (cl.deadline ? '<div style="font-size:11px;color:' + (isDue?'var(--warning)':'var(--gray)') + ';">📅 Due: ' + APP.formatDate(cl.deadline) + '</div>' : '')
            + '</div>';
    });
    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   REPORTS TAB (reports + problems)
══════════════════════════════════════════ */
function renderEmpReportsTab(el) {
    var d = _empData;

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:16px;">🔧 My Problems (' + d.myProblems.length + ')</div>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'problems\')">+ Report Problem</button></div>';

    if (d.myProblems.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;margin-bottom:20px;">No problems reported</div>';
    } else {
        d.myProblems.slice().reverse().forEach(function(p) {
            html += '<div class="work-item">'
                + '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + (p.title||'') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + (p.category||'') + (p.createdAt?' · '+APP.formatDate(p.createdAt):'') + '</div></div>'
                + '<span class="badge ' + APP.getStatusBadge(p.status) + '" style="font-size:11px;">' + (p.status||'open') + '</span>'
                + '</div>';
        });
    }

    html += '<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:16px;">📋 My Reports (' + d.myReports.length + ')</div>'
        + '<button class="btn btn-sm btn-primary" onclick="showReportForm()">+ New Report</button></div>';

    if (d.myReports.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">No reports submitted yet</div>';
    } else {
        d.myReports.slice().reverse().forEach(function(r) {
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;"><div style="font-size:13px;font-weight:600;">' + (r.title||'') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + (r.category||'') + ' · To: ' + (r.sentTo||'-') + ' · ' + APP.formatDate(r.createdAt) + '</div></div>'
                + '<span class="badge ' + (r.status==='sent'?'badge-success':'badge-warning') + '" style="font-size:11px;">' + (r.status||'draft') + '</span>'
                + '<button class="btn btn-sm" style="background:#25D366;color:#fff;padding:4px 8px;" title="Share via WhatsApp" onclick="empShareReport(\'' + r.id + '\',\'whatsapp\')">💬</button>'
                + '<button class="btn btn-sm" style="background:#1a73e8;color:#fff;padding:4px 8px;" title="Share via Email" onclick="empShareReport(\'' + r.id + '\',\'email\')">✉️</button>'
                + '</div>';
        });
    }
    html += '</div>';
    el.innerHTML = html;
}

/* ══════════════════════════════════════════
   PERFORMANCE TAB
══════════════════════════════════════════ */
function renderEmpPerformanceTab(el) {
    var d  = _empData;
    var q  = d.q;

    var tasksDone    = d.myTasks.filter(function(t){ return t.status==='completed'; }).length;
    var probsSolved  = d.myProblems.filter(function(p){ return p.status==='resolved'; }).length;
    var reqApproved  = d.myRequests.filter(function(r){ return r.status==='approved'; }).length;
    var clDone       = d.myChecklists.filter(function(c){ return c.status==='completed'; }).length;

    var taskRate  = d.myTasks.length > 0 ? Math.round(tasksDone/d.myTasks.length*100) : 0;
    var probRate  = d.myProblems.length > 0 ? Math.round(probsSolved/d.myProblems.length*100) : 0;
    var reqRate   = d.myRequests.length > 0 ? Math.round(reqApproved/d.myRequests.length*100) : 0;
    var clRate    = d.myChecklists.length > 0 ? Math.round(clDone/d.myChecklists.length*100) : 0;

    function pBar(pct, color) {
        return '<div class="q-progress-track" style="height:20px;"><div class="q-progress-fill" style="width:' + pct + '%;background:' + color + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">' + (pct > 10 ? pct + '%' : '') + '</div></div>';
    }

    var html = '<div style="font-weight:700;font-size:16px;margin-bottom:16px;">📊 My Performance — ' + q.name + '</div>'

        + '<div class="grid-2" style="gap:20px;margin-bottom:24px;">'
        + _perfCard('Task Completion', tasksDone, d.myTasks.length, taskRate, 'var(--success)')
        + _perfCard('Problem Resolution', probsSolved, d.myProblems.length, probRate, 'var(--info)')
        + _perfCard('Request Approval Rate', reqApproved, d.myRequests.length, reqRate, 'var(--warning)')
        + _perfCard('Checklist Compliance', clDone, d.myChecklists.length, clRate, 'var(--primary)')
        + '</div>'

        + '<div style="background:var(--light-gray);border-radius:10px;padding:16px;">'
        + '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">Q Summary Metrics</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">'
        + _summaryNum(d.myTasks.length, 'Total Tasks')
        + _summaryNum(tasksDone, 'Completed')
        + _summaryNum(d.myTasks.filter(function(t){return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed';}).length, 'Overdue', 'var(--danger)')
        + _summaryNum(d.myChecklists.length, 'Checklists')
        + _summaryNum(d.myProblems.length, 'Issues Raised')
        + _summaryNum(d.myRequests.length, 'Requests Sent')
        + '</div></div>';

    el.innerHTML = html;
}

function _perfCard(label, done, total, pct, color) {
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;">'
        + '<div style="font-size:13px;font-weight:600;margin-bottom:10px;">' + label + '</div>'
        + '<div class="q-progress-track" style="height:20px;margin-bottom:6px;"><div class="q-progress-fill" style="width:' + pct + '%;background:' + color + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">' + (pct > 10 ? pct + '%' : '') + '</div></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);">'
        + '<span>' + done + ' done</span><span>' + total + ' total</span></div></div>';
}

function _summaryNum(val, label, color) {
    return '<div style="background:var(--card);border-radius:8px;padding:12px;text-align:center;">'
        + '<div style="font-size:22px;font-weight:700;color:' + (color||'var(--text)') + ';">' + val + '</div>'
        + '<div style="font-size:11px;color:var(--gray);">' + label + '</div></div>';
}

/* ══════════════════════════════════════════
   CLEANING SECTION
══════════════════════════════════════════ */
function renderEmpCleaningSection(el) {
    if (!el) el = document.getElementById('empTabContent');
    if (!el) return;
    var user  = AUTH.currentUser();
    var tasks = DB.get('roomCleaningTasks') || [];
    var pending = tasks.filter(function(t){ return t.status !== 'done'; });
    var done    = tasks.filter(function(t){ return t.status === 'done'; });
    var myDone  = done.filter(function(t){ return t.completedBy === (user ? user.fullName : ''); });

    var html = '';
    if (pending.length > 0) {
        html += '<div style="background:#fff3e0;border:2px solid var(--warning);border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">'
            + '<span style="font-size:28px;">🧹</span>'
            + '<div><div style="font-weight:700;font-size:15px;color:#e65100;">' + pending.length + ' Room' + (pending.length>1?'s':'') + ' Need Cleaning</div>'
            + '<div style="font-size:13px;color:var(--gray);">Discharged patients\' rooms waiting to be cleaned.</div></div></div>';
    } else {
        html += '<div style="background:#e8f5e9;border:2px solid var(--secondary);border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">'
            + '<span style="font-size:28px;">✅</span>'
            + '<div><div style="font-weight:700;font-size:15px;color:var(--secondary);">All Rooms Clean</div>'
            + '<div style="font-size:13px;color:var(--gray);">No pending cleaning tasks right now.</div></div></div>';
    }

    if (pending.length > 0) {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:20px;">';
        pending.forEach(function(t) {
            var since  = t.dischargedAt ? Math.max(0, APP.daysBetween(t.dischargedAt, new Date().toISOString())) : 0;
            var urgency = since >= 1 ? '#ffebee' : '#fff8e1';
            var border  = since >= 1 ? 'var(--danger)' : 'var(--warning)';
            html += '<div style="background:' + urgency + ';border:2px solid ' + border + ';border-radius:10px;padding:14px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
                + '<span style="font-size:22px;font-weight:700;">Room ' + t.roomNo + '</span>'
                + '<span class="badge ' + (t.status==='in-progress'?'badge-info':'badge-warning') + '">' + t.status + '</span></div>'
                + '<div style="font-size:12px;color:var(--gray);margin-bottom:6px;">'
                + (t.floor?'Floor '+t.floor+' | ':'') + (t.category||'') + (t.bedId?' | Bed '+t.bedId:'')
                + '</div>'
                + '<div style="font-size:13px;margin-bottom:4px;">👤 <strong>' + t.patientName + '</strong></div>'
                + '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">'
                + 'Discharged: ' + (t.dischargedAt ? new Date(t.dischargedAt).toLocaleDateString('en-IN') : '—')
                + (since > 0 ? ' &nbsp;·&nbsp; <span style="color:var(--danger);font-weight:600;">' + since + 'd ago</span>' : ' &nbsp;·&nbsp; Today')
                + '</div>'
                + (t.assignedTo ? '<div style="font-size:12px;margin-bottom:6px;">👷 ' + t.assignedTo + '</div>' : '')
                + '<div style="display:flex;gap:6px;">'
                + (t.status==='pending' ? '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="empStartCleaning(\'' + t.id + '\')">▶ Start</button>' : '')
                + '<button class="btn btn-sm btn-success" onclick="empCompleteCleaning(\'' + t.id + '\')">✅ Mark Clean</button>'
                + '</div></div>';
        });
        html += '</div>';
    }

    if (myDone.length > 0) {
        html += '<div style="font-weight:600;font-size:14px;color:var(--gray);margin-bottom:8px;">✅ Cleaned by You</div>'
            + '<div class="table-responsive"><table><thead><tr><th>Room</th><th>Patient</th><th>Completed At</th></tr></thead><tbody>';
        myDone.slice().reverse().slice(0,10).forEach(function(t) {
            html += '<tr><td><strong>' + t.roomNo + '</strong></td><td>' + t.patientName + '</td>'
                + '<td>' + (t.completedAt ? APP.formatDateTime(t.completedAt) : '—') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    el.innerHTML = html || '<div class="empty-state">No cleaning tasks</div>';
}

function empStartCleaning(taskId) {
    var user = AUTH.currentUser();
    DB.update('roomCleaningTasks', taskId, {
        status: 'in-progress',
        assignedTo: user ? user.fullName : 'Unknown',
        startedAt: new Date().toISOString()
    });
    APP.notify('Cleaning started', 'info');
    renderEmpCleaningSection();
    try { updateCleaningBadge(); } catch(e) {}
}

function empCompleteCleaning(taskId) {
    if (typeof completeCleaning === 'function') {
        completeCleaning(taskId);
    } else {
        var user = AUTH.currentUser();
        var task = DB.getById('roomCleaningTasks', taskId);
        DB.update('roomCleaningTasks', taskId, {
            status: 'done', completedAt: new Date().toISOString(),
            completedBy: user ? user.fullName : 'Unknown'
        });
        if (task) {
            var overrides = DB.get('roomStatus') || [];
            DB.set('roomStatus', overrides.filter(function(r){ return r.roomNo !== task.roomNo; }));
        }
        APP.notify('Room marked clean — now available!', 'success');
    }
    renderEmpCleaningSection();
}

/* ══════════════════════════════════════════
   REPORT FORM
══════════════════════════════════════════ */
function showReportForm() {
    var user = AUTH.currentUser();
    if (!user) return;
    var html = '<form id="reportForm">'
        + '<div class="form-group"><label>Report Title</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Category</label><select name="category" class="form-control"><option value="daily">Daily Report</option><option value="weekly">Weekly Report</option><option value="monthly">Monthly Report</option><option value="custom">Custom Report</option></select></div>'
        + '<div class="form-group"><label>Send To</label><select name="sentTo" class="form-control"><option value="hod">HOD</option><option value="admin">Admin</option><option value="both">Both HOD & Admin</option></select></div>'
        + '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="5" required></textarea></div>'
        + '</form>';
    openFormModal('Submit Report', html, 'saveReport()', false);
}

function saveReport() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('reportForm');
    if (!data.title || !data.description) { APP.notify('Title and description required', 'error'); return false; }
    data.createdBy = user.username;
    data.createdByName = user.fullName;
    data.status = 'sent';
    var saved = DB.add('reports', data);
    APP.notify('Report submitted! Share it using 💬 ✉️ buttons in My Reports.', 'success');
    // Navigate to employee dashboard and open Reports tab
    Router.navigate('employee-dashboard');
    setTimeout(function(){ empTabSwitch('reports'); }, 80);
}

function empShareReport(id, via) {
    var r = (DB.get('reports') || []).find(function(x){ return x.id === id; });
    if (!r) { APP.notify('Report not found', 'error'); return; }
    var user = AUTH.currentUser();
    var text = '*' + (r.title || 'Report') + '*'
        + '\nFrom: ' + (r.createdByName || (user && user.fullName) || '')
        + (r.department ? ' (' + r.department + ')' : '')
        + '\nDate: ' + (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '-')
        + '\nCategory: ' + (r.category || '-')
        + (r.sentTo ? '\nSent To: ' + r.sentTo : '')
        + '\n\n' + (r.description || '');
    if (via === 'whatsapp') {
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
    } else {
        window.location.href = 'mailto:?subject=' + encodeURIComponent(r.title || 'Report') + '&body=' + encodeURIComponent(text);
    }
}

function empConfirmMatReq(id, partial) {
    var note = prompt(partial ? 'What was partially received? Describe:' : 'Any notes about full receipt? (optional):');
    if (note === null) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: partial ? 'partial' : 'confirmed',
        confirmedBy: user ? user.username : '',
        confirmedByName: user ? user.fullName : '',
        confirmedAt: new Date().toISOString(),
        confirmationNote: note || ''
    });
    APP.notify(partial ? 'Marked as partially received' : 'Request confirmed and closed!', 'success');
    Router.navigate('employee-dashboard');
}

function empMarkProbInProgress(id) {
    DB.update('problems', id, { status: 'in_progress' });
    APP.notify('Problem marked in progress', 'info');
    Router.navigate('employee-dashboard');
}

function empUpdateTaskStatus(id, store) {
    // Resolve correct store: use passed store, then search both
    var s = store || (DB.getById('tasks', id) ? 'tasks' : (DB.getById('hodTasks', id) ? 'hodTasks' : null));
    if (!s) { APP.notify('Task not found', 'error'); return; }
    var task = DB.getById(s, id);
    if (!task) { APP.notify('Task not found', 'error'); return; }
    var statusFlow = { 'pending': 'in-progress', 'in-progress': 'completed', 'completed': 'pending' };
    var newStatus = statusFlow[task.status] || 'in-progress';
    var user = AUTH.currentUser();
    DB.update(s, id, {
        status: newStatus,
        updatedBy: user ? user.username : '',
        updatedAt: new Date().toISOString()
    });
    APP.notify('Task ' + (newStatus === 'completed' ? 'marked done!' : 'started!'), newStatus === 'completed' ? 'success' : 'info');
    // Update _empData in-place and re-render work tab without full dashboard rebuild
    if (_empData && _empData.myTasks) {
        var idx = _empData.myTasks.findIndex(function(t){ return t.id === id; });
        if (idx !== -1) _empData.myTasks[idx].status = newStatus;
        _renderEmpTab('work');
    }
}
