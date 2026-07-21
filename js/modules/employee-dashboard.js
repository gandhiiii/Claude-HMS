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
        '.work-item.in-progress{border-left:4px solid var(--primary);background:var(--primary-light,#f0f4ff);}',
        '.work-item.done{opacity:0.6;}',
        '.hod-tag{background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;}',
    ].join('');
    document.head.appendChild(s);
})();

/* ══════════════════════════════════════════
   CHECKLIST PERIOD HELPERS (5 AM boundary)
══════════════════════════════════════════ */
function _clPad(n) { return ('0' + n).slice(-2); }

function _clPeriodKey(freq) {
    // "Day" starts at 5:00 AM — subtract 5 h so anything before 5 AM still counts as yesterday
    var adj = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    var y = adj.getFullYear(), m = adj.getMonth(), d = adj.getDate();
    if (freq === 'weekly') {
        var dow = adj.getDay();
        var mon = new Date(adj); mon.setDate(d - (dow === 0 ? 6 : dow - 1));
        var wy = mon.getFullYear();
        var wk = Math.ceil((((mon - new Date(wy, 0, 1)) / 86400000) + new Date(wy, 0, 1).getDay() + 1) / 7);
        return wy + '-W' + _clPad(wk);
    }
    if (freq === 'monthly') return y + '-' + _clPad(m + 1);
    return y + '-' + _clPad(m + 1) + '-' + _clPad(d);
}

function _clPeriodLabel(freq) {
    var adj = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    if (freq === 'weekly')  return 'Week of ' + adj.toLocaleDateString('en-IN', {month:'short', day:'numeric'});
    if (freq === 'monthly') return adj.toLocaleDateString('en-IN', {month:'long', year:'numeric'});
    return 'Today (' + adj.toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'}) + ')';
}

function _clNextReset(freq) {
    var now = new Date();
    var t5 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);
    if (now >= t5) t5.setDate(t5.getDate() + 1);
    if (freq === 'daily') return t5;
    if (freq === 'weekly') {
        var dow = now.getDay();
        var daysToMon = dow === 0 ? 1 : 8 - dow;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMon, 5, 0, 0);
    }
    if (freq === 'monthly') return new Date(now.getFullYear(), now.getMonth() + 1, 1, 5, 0, 0);
    return t5;
}

function _clTimeUntil(date) {
    var ms = date - new Date();
    if (ms <= 0) return 'now';
    var h = Math.floor(ms / 3600000), min = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) { var days = Math.floor(h / 24); return days + 'd ' + (h % 24) + 'h'; }
    return h + 'h ' + min + 'm';
}

function _clAutoReport(cl, user, periodKey) {
    var items = cl.items || [];
    var done = items.filter(function(i){ return i.status && i.status !== 'pending'; }).length;
    var pct  = items.length ? Math.round(done / items.length * 100) : 0;
    var lines = [
        'Auto-submitted checklist report',
        'Period: ' + periodKey + ' (' + (cl.frequency || 'daily') + ')',
        'Submitted by: system (employee did not submit before reset)',
        'Completion: ' + done + '/' + items.length + ' items (' + pct + '%)',
        ''
    ];
    items.forEach(function(item, i) {
        var v = (item.value !== undefined && item.value !== '') ? ' = ' + item.value + (item.unit ? ' ' + item.unit : '') : '';
        lines.push((i + 1) + '. ' + item.task + ': ' + (item.status || 'pending').toUpperCase() + v);
    });
    // Include any problem tickets raised from this checklist
    var clTickets = (DB.get('problems') || []).filter(function(p){ return p.checklistId === cl.id; });
    if (clTickets.length > 0) {
        lines.push('');
        lines.push('PROBLEM TICKETS:');
        clTickets.forEach(function(p){
            lines.push((p.ticketId || ('#'+p.id.slice(-6))) + ' — ' + (p.itemTask || p.title) + ' [' + (p.status || 'open').toUpperCase() + ']');
        });
    }
    DB.add('reports', {
        title: '[Auto] ' + cl.title + ' — ' + periodKey,
        description: lines.join('\n'),
        type: 'checklist-auto',
        frequency: cl.frequency || 'daily',
        periodKey: periodKey,
        checklistId: cl.id,
        checklistTitle: cl.title,
        department: cl.department || user.department,
        sentTo: 'hod',
        createdBy: user.username,
        createdByName: user.fullName || user.username,
        autoSubmitted: true,
        _tasksDone: done, _tasksTotal: items.length, _clRate: pct,
        createdAt: new Date().toISOString(),
        status: 'sent'
    });
}

function _checkAndResetChecklists(checklists, user) {
    checklists.forEach(function(cl) {
        if (!cl.frequency) return; // legacy checklists without frequency skip auto-reset
        var expected = _clPeriodKey(cl.frequency);
        var stored   = cl.periodKey || '';
        if (!stored) {
            DB.update('checklists', cl.id, { periodKey: expected, periodSubmitted: false });
            cl.periodKey = expected; cl.periodSubmitted = false;
            return;
        }
        if (stored === expected) return; // same period, nothing to do
        // Period crossed — auto-report if employee didn't submit, then reset items
        if (!cl.periodSubmitted) _clAutoReport(cl, user, stored);
        var resetItems = (cl.items || []).map(function(item) {
            return { task: item.task, unit: item.unit || '', status: 'pending', value: '' };
        });
        DB.update('checklists', cl.id, {
            items: resetItems, periodKey: expected, periodSubmitted: false, status: 'active'
        });
        cl.items = resetItems; cl.periodKey = expected; cl.periodSubmitted = false; cl.status = 'active';
    });
}

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
    var qTasks    = _empData.myTasks.filter(function(t) { return _inRange(t.deadline, q.start, q.end); });
    var qDone     = qTasks.filter(function(t) { return t.status === 'completed'; });
    var qInProg   = qTasks.filter(function(t) { return t.status === 'in-progress'; });
    var qPct      = qTasks.length > 0 ? Math.round((qDone.length / qTasks.length) * 100) : 0;
    var qInProgPct= qTasks.length > 0 ? Math.round((qInProg.length / qTasks.length) * 100) : 0;
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
        { id: 'overview',    label: T('tab_overview') },
        { id: 'work',        label: T('tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
        { id: 'checklists',  label: T('tab_checklists') },
        { id: 'reports',     label: T('tab_reports') },
        { id: 'cleaning',    label: T('tab_cleaning'), badge: _empData.pendingCleaning.length, badgeClass: 'badge-danger' },
        { id: 'performance', label: T('tab_performance') },
        { id: 'qgoals',      label: T('tab_qgoals') }
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
        + _kpiCard('📅', T('kpi_due_today'),  todayTasks.length, '#fff3e0', '#e65100', 'work')
        + _kpiCard('📆', T('kpi_due_week'),   weekTasks.length,  '#e3f2fd', 'var(--primary)', 'work')
        + _kpiCard('✅', T('kpi_checklist'),  clPct + '%',       '#e8f5e9', 'var(--secondary)', 'checklists')
        + _kpiCard('🔧', T('kpi_issues'),     openProbs.length,  '#fce4ec', 'var(--danger)', 'reports')
        + _kpiCard('📋', T('kpi_projects'),   _empData.myProjects.length, '#f3e5f5', '#7b1fa2', 'work')
        + '</div>'

        // ── Quarterly strip ──
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:18px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:15px;">📅 ' + q.name + ' ' + T('qprogress') + '</div>'
        + '<div style="font-size:13px;color:var(--gray);">' + qDone.length + ' ' + T('done_lbl') + ' · ' + qInProg.length + ' ' + T('in_progress_lbl') + ' · ' + qTasks.length + ' ' + T('total_lbl') + '</div>'
        + '</div>'
        + '<div style="margin-bottom:6px;">'
        // Stacked bar: green = done, blue = in-progress
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);margin-bottom:3px;">'
        + '<span>' + T('task_completion') + '</span>'
        + '<span style="font-weight:600;color:' + (qPct >= 80 ? 'var(--success)' : qPct >= 50 ? 'var(--warning)' : (qInProgPct > 0 ? 'var(--primary)' : 'var(--danger)')) + ';">'
        + qPct + '% ' + T('done_lbl') + (qInProgPct > 0 ? ' · ' + qInProgPct + '% ' + T('in_progress_lbl') : '') + '</span></div>'
        + '<div class="q-progress-track" style="position:relative;">'
        + '<div style="position:absolute;left:0;top:0;height:100%;width:' + Math.min(100, qPct + qInProgPct) + '%;background:var(--primary);opacity:0.35;border-radius:8px;"></div>'
        + '<div class="q-progress-fill" style="width:' + qPct + '%;background:' + (qPct >= 80 ? 'var(--success)' : qPct >= 50 ? 'var(--warning)' : 'var(--secondary)') + ';position:relative;z-index:1;"></div>'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:12px;font-size:11px;color:var(--gray);margin-top:6px;flex-wrap:wrap;">'
        + '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--secondary);display:inline-block;"></span>' + T('grp_completed') + ' (' + qDone.length + ')</span>'
        + (qInProg.length > 0 ? '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--primary);opacity:0.5;display:inline-block;"></span>' + T('status_inprogress') + ' (' + qInProg.length + ')</span>' : '')
        + '<span style="margin-left:auto;">' + q.start.toLocaleDateString('en-IN',{month:'short',day:'numeric'}) + ' – ' + q.end.toLocaleDateString('en-IN',{month:'short',day:'numeric'}) + '</span>'
        + '</div>'
        + '</div>'

        // ── Cleaning alert ──
        + (_empData.pendingCleaning.length > 0
            ? '<div style="background:#fff3e0;border:2px solid var(--warning);border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="empTabSwitch(\'cleaning\',this)">'
              + '<span style="font-size:24px;">🧹</span><div style="flex:1;"><div style="font-weight:700;color:#e65100;">' + _empData.pendingCleaning.length + ' ' + T('rooms_cleaning') + '</div>'
              + '<div style="font-size:12px;color:var(--gray);">' + T('tap_view') + '</div></div><span style="color:#e65100;">›</span></div>'
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

    // Start background browser-notification check (30-min interval, once per session)
    if (typeof HMS_REM !== 'undefined') HMS_REM.scheduleCheck(user);
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

    // Reminder banners (weekly/monthly checklists, urgent tasks)
    if (typeof HMS_REM !== 'undefined') {
        html += HMS_REM.checkEmployee(d.user, d.myChecklists || [], d.myTasks || []);
    }

    // Overdue alert
    if (overdueTasks.length > 0) {
        html += '<div style="background:#ffebee;border:1px solid var(--danger);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;">'
            + '<strong style="color:var(--danger);">⚠️ ' + overdueTasks.length + ' ' + T('overdue_alert') + '</strong> &nbsp;'
            + overdueTasks.slice(0,2).map(function(t){ return '<span style="color:var(--danger);">' + t.title + '</span>'; }).join(', ')
            + (overdueTasks.length > 2 ? ' +' + (overdueTasks.length - 2) + ' more' : '')
            + ' &nbsp;<button class="btn btn-sm btn-danger" onclick="empTabSwitch(\'work\')">' + T('btn_view_all') + '</button></div>';
    }

    // Today's focus
    html += '<div style="margin-bottom:18px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">🎯 ' + T('todays_focus') + '</div>';
    if (todayTasks.length === 0 && recentCl.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;padding:16px;text-align:center;background:var(--light-gray);border-radius:8px;">' + T('nothing_today') + '</div>';
    } else {
        if (todayTasks.length > 0) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">' + T('tasks_due_today') + '</div>';
            todayTasks.slice(0, 5).forEach(function(t) {
                html += _workItem(t, d.adminNames, true);
            });
        }
        if (recentCl.length > 0) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--gray);margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">' + T('open_checklists') + '</div>';
            recentCl.slice(0, 3).forEach(function(cl) {
                var total = cl.items ? cl.items.length : 0;
                var done  = cl.items ? cl.items.filter(function(i){ return i.status === 'ok'; }).length : 0;
                var pct   = total > 0 ? Math.round((done/total)*100) : 0;
                html += '<div class="work-item"><div style="flex:1;">'
                    + '<div style="font-size:13px;font-weight:600;">' + cl.title + '</div>'
                    + '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">'
                    + '<div style="flex:1;max-width:180px;height:5px;background:var(--light-gray);border-radius:3px;"><div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:3px;"></div></div>'
                    + '<span style="font-size:11px;color:var(--gray);">' + done + '/' + total + '</span></div></div>'
                    + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">' + T('btn_open') + '</button></div>';
            });
        }
    }
    html += '</div>';

    // Two-column: recent tasks + quick actions
    html += '<div class="grid-2" style="gap:16px;">'
        + '<div>'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">📝 ' + T('recent_tasks') + '</div>';
    if (recentTasks.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">' + T('no_tasks_yet') + '</div>';
    } else {
        recentTasks.forEach(function(t) { html += _workItem(t, d.adminNames, false); });
    }
    html += '</div>'
        + '<div>'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">⚡ ' + T('quick_actions') + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;">'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'work\')">' + T('btn_view_tasks') + '</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'checklists\')">' + T('btn_open_cl') + '</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="Router.navigate(\'problems\')">' + T('btn_report_prob') + '</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="Router.navigate(\'material-requests\')">' + T('btn_mat_request') + '</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empCreateReturn()">' + T('btn_return_mat') + '</button>'
        + '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="showReportForm()">' + T('btn_submit_rep') + '</button>'
        + '</div>'
        + (pendingReqs.length > 0
            ? '<div style="margin-top:14px;"><div style="font-weight:600;font-size:13px;margin-bottom:6px;color:var(--gray);">' + T('pending_requests') + '</div>'
              + pendingReqs.map(function(r){ return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--light-gray);">' + (r.title||'Request') + ' <span class="badge badge-warning" style="font-size:10px;">' + T('pending_lbl') + '</span></div>'; }).join('')
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
        + '<div style="font-weight:700;font-size:16px;">📝 ' + T('my_tasks') + ' (' + d.myTasks.length + ')</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<span class="badge badge-warning" style="padding:5px 10px;">' + pending.length + ' ' + T('pending_lbl') + '</span>'
        + '<span class="badge badge-success" style="padding:5px 10px;">' + completed.length + ' ' + T('done_lbl') + '</span>'
        + '</div></div>';

    if (d.myTasks.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--gray);font-size:13px;">' + T('no_tasks') + '</div>';
    } else {
        var groups = [
            { label: T('grp_overdue'),  items: pending.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date(); }) },
            { label: T('grp_today'),    items: pending.filter(function(t){ return _isToday(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date()); }) },
            { label: T('grp_week'),     items: pending.filter(function(t){ return _isThisWeek(t.deadline) && !_isToday(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date()); }) },
            { label: T('grp_later'),    items: pending.filter(function(t){ return !t.deadline || (!_isThisWeek(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date())); }) },
            { label: T('grp_completed'),items: completed }
        ];

        groups.forEach(function(g) {
            if (g.items.length === 0) return;
            html += '<div style="margin-bottom:16px;">'
                + '<div style="font-size:12px;font-weight:700;color:var(--gray);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">' + g.label + ' (' + g.items.length + ')</div>';
            g.items.forEach(function(t) {
                var fromAdmin = t.createdBy && d.adminNames[t.createdBy];
                var roleLabel = fromAdmin === 'hod' ? 'HOD' : (fromAdmin === 'admin' || fromAdmin === 'super_admin') ? 'Admin' : null;
                var isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed';
                html += '<div class="work-item ' + (t.status==='completed'?'done':isOverdue?'overdue':t.status==='in-progress'?'in-progress':t.priority==='high'?'urgent':'') + '" style="flex-wrap:wrap;gap:6px;">'
                    + '<div style="flex:1;min-width:200px;">'
                    + '<div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
                    + '<span>' + (t.title||'') + '</span>'
                    + (roleLabel ? '<span class="hod-tag">' + roleLabel + '</span>' : '')
                    + (t.priority === 'high' ? '<span class="badge badge-danger" style="font-size:10px;">' + T('status_high') + '</span>' : t.priority === 'medium' ? '<span class="badge badge-warning" style="font-size:10px;">' + T('status_med') + '</span>' : '')
                    + '</div>'
                    + (t.description ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + t.description.substring(0,80) + (t.description.length>80?'…':'') + '</div>' : '')
                    + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">'
                    + (t.deadline ? (isOverdue ? '<span style="color:var(--danger);">⚠️ ' + T('due_lbl') + ' ' : '📅 ' + T('due_lbl') + ' ') + APP.formatDate(t.deadline) + (isOverdue?'</span>':'') : '')
                    + (t.createdBy ? ' &nbsp;·&nbsp; ' + T('from_lbl') + ' ' + t.createdBy : '')
                    + '</div></div>'
                    + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status||'pending') + '</span>'
                    + (t.status !== 'completed'
                        ? '<button class="btn btn-sm btn-success" onclick="empUpdateTaskStatus(\'' + t.id + '\',\'' + (t._store||'tasks') + '\')" style="white-space:nowrap;">'
                          + (t.status === 'in-progress' ? T('status_mark_done') : T('status_start')) + '</button>'
                        : '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'tasks\')">' + T('btn_view') + '</button>')
                    + '</div>';
            });
            html += '</div>';
        });
    }

    // Projects
    if (d.myProjects.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">📋 ' + T('my_projects') + ' (' + d.myProjects.length + ')</div>';
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
        'pending':           { label: T('mr_waiting_hod'),  badge: 'badge-warning' },
        'hod_approved':      { label: T('mr_hod_approved'), badge: 'badge-info' },
        'hod_rejected':      { label: T('mr_hod_rejected'), badge: 'badge-danger' },
        'facility_approved': { label: T('mr_fac_approved'), badge: 'badge-info' },
        'facility_rejected': { label: T('mr_fac_rejected'), badge: 'badge-danger' },
        'store_fulfilled':   { label: T('mr_ready'),        badge: 'badge-success' },
        'confirmed':         { label: T('mr_confirmed'),    badge: 'badge-success' },
        'partial':           { label: T('mr_partial'),      badge: 'badge-warning' },
        'approved':          { label: T('mr_approved'),     badge: 'badge-success' },
        'rejected':          { label: T('mr_rejected'),     badge: 'badge-danger' }
    };
    if (d.myRequests.length > 0) {
        var storeFulfilledReqs = d.myRequests.filter(function(r){ return r.status === 'store_fulfilled'; });
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
            + '<div style="font-weight:700;font-size:15px;">&#128230; ' + T('my_mat_requests') + ' (' + d.myRequests.length + ')</div>'
            + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'material-requests\')">' + T('btn_new_request') + '</button></div>';
        if (storeFulfilledReqs.length > 0) {
            html += '<div style="background:#e8f5e9;border:2px solid var(--success);border-radius:8px;padding:10px 14px;margin-bottom:10px;">'
                + '<strong style="color:var(--success);">&#128230; ' + storeFulfilledReqs.length + ' ' + T('ready_collect') + '</strong></div>';
        }
        d.myRequests.slice().reverse().slice(0, 6).forEach(function(r) {
            var stInfo = empMatStatusMap[r.status] || { label: r.status || T('mr_waiting_hod'), badge: 'badge-warning' };
            var canConfirm = r.status === 'store_fulfilled';
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (r.title || T('mr_request')) + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + APP.formatDate(r.createdAt) + '</div>'
                + '</div>'
                + '<span class="badge ' + stInfo.badge + '" style="font-size:11px;">' + stInfo.label + '</span>'
                + (canConfirm
                    ? '<button class="btn btn-sm btn-success" onclick="empConfirmMatReq(\'' + r.id + '\',false)">' + T('btn_confirm') + '</button>'
                    + '<button class="btn btn-sm btn-warning" onclick="empConfirmMatReq(\'' + r.id + '\',true)">' + T('btn_partial') + '</button>'
                    : '')
                + '</div>';
        });
        html += '</div>';
    }

    // Problems assigned to me
    var assignedProbs = d.myProblems.filter(function(p) { return p.assignedTo === d.user.username && p.status !== 'resolved'; });
    if (assignedProbs.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">&#128295; ' + T('prob_assigned') + ' (' + assignedProbs.length + ')</div>';
        assignedProbs.forEach(function(p) {
            var statusBadge = p.status === 'in_progress' ? 'badge-info' : 'badge-warning';
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (p.title || '') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
                + T('prob_category') + ' ' + (p.category || '-') + ' &middot; ' + APP.formatDate(p.createdAt)
                + (p.assignNote ? '<br>' + T('prob_note') + ' ' + p.assignNote : '')
                + '</div></div>'
                + '<span class="badge ' + statusBadge + '" style="font-size:11px;">' + (p.status || 'assigned').replace('_', ' ') + '</span>'
                + (p.status === 'assigned' ? '<button class="btn btn-sm btn-info" onclick="empMarkProbInProgress(\'' + p.id + '\')">' + T('prob_start') + '</button>' : '')
                + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'problems\')">' + T('prob_view') + '</button>'
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
    var user = AUTH.currentUser();
    if (!user) return;

    // Always re-read from DB — catches checklists assigned after the dashboard loaded
    var allCl = DB.get('checklists') || [];
    var myChecklists = allCl.filter(function(c) {
        return c.assignedTo === user.fullName || c.assignedTo === 'common';
    });
    if (_empData) _empData.myChecklists = myChecklists;

    // Check for period crossings — auto-report and reset items as needed
    _checkAndResetChecklists(myChecklists, user);

    var daily   = myChecklists.filter(function(c){ return !c.frequency || c.frequency === 'daily'; });
    var weekly  = myChecklists.filter(function(c){ return c.frequency === 'weekly'; });
    var monthly = myChecklists.filter(function(c){ return c.frequency === 'monthly'; });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">✅ My Checklists'
        + ' <span class="badge badge-primary" style="font-size:11px;margin-left:4px;">' + myChecklists.length + '</span></div>'
        + '</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;">'
        + '<button class="tab-btn active" onclick="filterEmpCl(\'all\',this)">All (' + myChecklists.length + ')</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'daily\',this)">🔄 Daily (' + daily.length + ')</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'weekly\',this)">📅 Weekly (' + weekly.length + ')</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'monthly\',this)">🗓️ Monthly (' + monthly.length + ')</button>'
        + '</div>';

    html += '<div id="empClListNew"></div>';
    el.innerHTML = html;
    _empClFilter = 'all';
    window._empChecklists = myChecklists;
    _renderEmpChecklists(myChecklists);
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
        if (_empClFilter === 'daily')   return !cl.frequency || cl.frequency === 'daily';
        if (_empClFilter === 'weekly')  return cl.frequency === 'weekly';
        if (_empClFilter === 'monthly') return cl.frequency === 'monthly';
        return true; // 'all'
    });
    if (filtered.length === 0) {
        var msg = _empClFilter === 'all'
            ? 'No checklists assigned yet. Your HOD or Admin will assign them here.'
            : 'No ' + _empClFilter + ' checklists assigned.';
        el.innerHTML = '<div style="color:var(--gray);font-size:13px;padding:24px;text-align:center;background:var(--light-gray);border-radius:8px;">' + msg + '</div>';
        return;
    }
    var freqBg   = { daily:'#e3f2fd', weekly:'#f3e5f5', monthly:'#e8f5e9' };
    var freqClr  = { daily:'#1565c0', weekly:'#6a1b9a', monthly:'#2e7d32' };
    var freqIcon = { daily:'🔄', weekly:'📅', monthly:'🗓️' };
    var html = '';
    filtered.forEach(function(cl) {
        var freq  = cl.frequency || 'daily';
        var total = cl.items ? cl.items.length : 0;
        var done  = cl.items ? cl.items.filter(function(i){ return i.status && i.status !== 'pending'; }).length : 0;
        var pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        var isDue = cl.deadline && _isToday(cl.deadline);
        var bg    = freqBg[freq]  || '#e3f2fd';
        var clr   = freqClr[freq] || '#1565c0';
        var icon  = freqIcon[freq]|| '🔄';
        var periodLabel = _clPeriodLabel(freq);
        var timeLeft    = _clTimeUntil(_clNextReset(freq));
        var submitted   = !!cl.periodSubmitted;

        html += '<div class="work-item' + (isDue ? ' urgent' : '') + '" style="flex-direction:column;align-items:stretch;gap:8px;border-left:4px solid ' + clr + ';">'
            // Title + actions row
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">'
            + '<div>'
            + '<div style="font-size:14px;font-weight:600;">' + (cl.title || '') + (cl.floor ? ' <span style="font-size:11px;color:var(--gray);">· ' + cl.floor + '</span>' : '') + '</div>'
            + '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:4px;">'
            + '<span style="background:' + bg + ';color:' + clr + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">' + icon + ' ' + freq.charAt(0).toUpperCase() + freq.slice(1) + '</span>'
            + '<span style="font-size:11px;color:var(--gray);">' + periodLabel + '</span>'
            + '<span style="font-size:11px;color:var(--gray);">⏱ Resets in ' + timeLeft + '</span>'
            + (submitted ? '<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">✓ Submitted</span>' : '')
            + '</div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
            + '<span class="badge ' + (cl.status === 'completed' ? 'badge-success' : 'badge-info') + '" style="font-size:11px;">' + (cl.status || 'active') + '</span>'
            + (!submitted ? '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">📤 Submit</button>' : '')
            + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')" style="font-size:11px;padding:3px 8px;">Open</button>'
            + '</div></div>'
            // Progress bar
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<div style="flex:1;height:8px;background:var(--light-gray);border-radius:4px;"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)') + ';border-radius:4px;transition:width .3s;"></div></div>'
            + '<span style="font-size:12px;color:var(--gray);min-width:55px;">' + done + '/' + total + ' done</span>'
            + '</div>'
            + (cl.deadline ? '<div style="font-size:11px;color:' + (isDue ? 'var(--warning)' : 'var(--gray)') + ';">📅 Deadline: ' + APP.formatDate(cl.deadline) + '</div>' : '')
            + '</div>';
    });
    el.innerHTML = html;
}

function empSubmitClPeriod(id) {
    var user = AUTH.currentUser();
    if (!user) return;
    var cl = DB.getById('checklists', id);
    if (!cl) return;
    var freq = cl.frequency || 'daily';
    var periodKey = _clPeriodKey(freq);
    var items = cl.items || [];
    var done  = items.filter(function(i){ return i.status && i.status !== 'pending'; }).length;
    var pct   = items.length ? Math.round(done / items.length * 100) : 0;
    var lines = [
        'Checklist Report submitted by ' + (user.fullName || user.username),
        'Period: ' + periodKey + ' (' + freq + ')',
        'Completion: ' + done + '/' + items.length + ' items (' + pct + '%)',
        ''
    ];
    items.forEach(function(item, i) {
        var v = (item.value !== undefined && item.value !== '') ? ' = ' + item.value + (item.unit ? ' ' + item.unit : '') : '';
        lines.push((i + 1) + '. ' + item.task + ': ' + (item.status || 'pending').toUpperCase() + v);
    });
    // Include problem tickets for this checklist
    var clTickets = (DB.get('problems') || []).filter(function(p){ return p.checklistId === id; });
    if (clTickets.length > 0) {
        lines.push('');
        lines.push('PROBLEM TICKETS:');
        clTickets.forEach(function(p){
            lines.push((p.ticketId || ('#'+p.id.slice(-6))) + ' — ' + (p.itemTask || p.title) + ' [' + (p.status || 'open').toUpperCase() + ']');
        });
    }
    DB.add('reports', {
        title: cl.title + ' — ' + periodKey,
        description: lines.join('\n'),
        type: 'checklist-report',
        frequency: freq,
        periodKey: periodKey,
        checklistId: id,
        checklistTitle: cl.title,
        department: cl.department || user.department,
        sentTo: 'hod',
        createdBy: user.username,
        createdByName: user.fullName || user.username,
        autoSubmitted: false,
        _tasksDone: done, _tasksTotal: items.length, _clRate: pct,
        createdAt: new Date().toISOString(),
        status: 'sent'
    });
    DB.update('checklists', id, { periodSubmitted: true, periodKey: periodKey });
    APP.notify('Checklist report submitted to HOD ✓', 'success');
    renderEmpChecklistsTab(document.getElementById('empTabContent'));
}

/* ══════════════════════════════════════════
   REPORTS TAB (reports + problems)
══════════════════════════════════════════ */
function renderEmpReportsTab(el) {
    var d = _empData;
    var tasks    = d.myTasks     || [];
    var probs    = d.myProblems  || [];
    var reqs     = d.myRequests  || [];
    var cls      = d.myChecklists|| [];

    var tDone    = tasks.filter(function(t){ return t.status==='completed'; }).length;
    var tPend    = tasks.filter(function(t){ return t.status==='pending'; }).length;
    var tOverdue = tasks.filter(function(t){ return t.deadline && new Date(t.deadline)<new Date() && t.status!=='completed'; }).length;
    var pOpen    = probs.filter(function(p){ return p.status!=='resolved'; }).length;
    var pRes     = probs.filter(function(p){ return p.status==='resolved'; }).length;
    var clDone   = cls.filter(function(c){ return c.status==='completed'; }).length;
    var clRate   = cls.length > 0 ? Math.round(clDone/cls.length*100) : 0;
    var reqPend  = reqs.filter(function(r){ return r.status==='pending'||r.status==='hod_approved'; }).length;

    function _sBox(val, lbl, color) {
        return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;min-width:90px;">'
            + '<div style="font-size:20px;font-weight:700;color:' + color + ';">' + val + '</div>'
            + '<div style="font-size:10px;color:var(--gray);margin-top:2px;">' + lbl + '</div></div>';
    }

    var html = '<div style="background:linear-gradient(135deg,#6a1b9a 0%,#4a148c 100%);border-radius:12px;padding:16px 20px;color:#fff;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">'
        + '<div><div style="font-size:16px;font-weight:700;">📊 My Work Summary</div>'
        + '<div style="font-size:12px;opacity:0.8;margin-top:2px;">' + d.user.fullName + ' &nbsp;·&nbsp; ' + (d.dept||'No Dept') + ' &nbsp;·&nbsp; ' + new Date().toLocaleDateString('en-IN') + '</div></div>'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);" onclick="showReportForm()">+ Submit Report</button>'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">'
        + _sBox(tDone,     'Tasks Done',    '#a5d6a7')
        + _sBox(tPend,     'Pending',       '#fff176')
        + _sBox(tOverdue,  'Overdue',       '#ef9a9a')
        + _sBox(pOpen,     'Open Issues',   '#ef9a9a')
        + _sBox(pRes,      'Issues Fixed',  '#a5d6a7')
        + _sBox(clRate+'%','Checklist',     '#80cbc4')
        + _sBox(reqs.length,'Requests',     '#b39ddb')
        + '</div></div>';

    // Problems section
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-weight:700;font-size:15px;">🔧 My Problems (' + probs.length + ')</div>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'problems\')">+ Report Problem</button></div>';
    if (probs.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;margin-bottom:16px;">No problems reported</div>';
    } else {
        probs.slice().reverse().slice(0,5).forEach(function(p) {
            html += '<div class="work-item">'
                + '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + (p.title||'') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + (p.category||'') + (p.createdAt?' · '+APP.formatDate(p.createdAt):'') + '</div></div>'
                + '<span class="badge ' + APP.getStatusBadge(p.status) + '" style="font-size:11px;">' + (p.status||'open') + '</span>'
                + '</div>';
        });
        html += '<div style="margin-bottom:16px;"></div>';
    }

    // Reports section
    html += '<div style="border-top:1px solid var(--border);padding-top:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-weight:700;font-size:15px;">📋 My Reports (' + d.myReports.length + ')</div>'
        + '<button class="btn btn-sm btn-primary" onclick="showReportForm()">+ New Report</button></div>';
    if (d.myReports.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">No reports submitted yet. Click "+ New Report" to send a detailed work summary to your HOD/Admin.</div>';
    } else {
        d.myReports.slice().reverse().forEach(function(r) {
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;"><div style="font-size:13px;font-weight:600;">' + (r.title||'') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + (r.category||'') + ' · To: ' + (r.sentTo||'-') + ' · ' + APP.formatDate(r.createdAt) + '</div>'
                + (r.description ? '<div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.4;">' + r.description.substring(0,100) + (r.description.length>100?'…':'') + '</div>' : '')
                + '</div>'
                + '<span class="badge ' + (r.status==='sent'?'badge-success':'badge-warning') + '" style="font-size:10px;">' + (r.status||'draft') + '</span>'
                + '<button class="btn btn-sm" style="background:#25D366;color:#fff;padding:4px 8px;" title="Share via WhatsApp" onclick="empShareReport(\'' + r.id + '\',\'whatsapp\')">💬</button>'
                + '<button class="btn btn-sm" style="background:#1a73e8;color:#fff;padding:4px 8px;" title="Share via Email" onclick="empShareReport(\'' + r.id + '\',\'email\')">✉️</button>'
                + '<button class="btn btn-sm" style="background:#1e7e34;color:#fff;padding:4px 8px;" title="Download Excel" onclick="empExportReportExcel(\'' + r.id + '\')">📊</button>'
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
function _genEmpWorkSummary() {
    var d = _empData;
    if (!d || !d.user) return '';
    var now = new Date().toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    var tasks  = d.myTasks    || [];
    var probs  = d.myProblems || [];
    var reqs   = d.myRequests || [];
    var cls    = d.myChecklists || [];

    var tDone  = tasks.filter(function(t){ return t.status==='completed'; });
    var tProg  = tasks.filter(function(t){ return t.status==='in-progress'; });
    var tPend  = tasks.filter(function(t){ return t.status==='pending'; });
    var tOver  = tasks.filter(function(t){ return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed'; });
    var pOpen  = probs.filter(function(p){ return p.status!=='resolved'; });
    var pRes   = probs.filter(function(p){ return p.status==='resolved'; });
    var clDone = cls.filter(function(c){ return c.status==='completed'; });
    var clRate = cls.length > 0 ? Math.round(clDone.length/cls.length*100) : 0;

    var lines = [];
    lines.push('WORK SUMMARY REPORT');
    lines.push('Employee: ' + d.user.fullName + ' | Department: ' + (d.dept||'—') + ' | Date: ' + now);
    lines.push('');

    lines.push('── TASKS ──');
    lines.push('Completed: ' + tDone.length + ' | In Progress: ' + tProg.length + ' | Pending: ' + tPend.length + ' | Overdue: ' + tOver.length);
    if (tDone.length > 0) {
        lines.push('');
        lines.push('Completed Tasks:');
        tDone.forEach(function(t, i){ lines.push('  ' + (i+1) + '. ' + t.title + (t.deadline?' (Due: '+new Date(t.deadline).toLocaleDateString('en-IN')+')':'')); });
    }
    if (tProg.length > 0) {
        lines.push('');
        lines.push('In Progress:');
        tProg.forEach(function(t, i){ lines.push('  ' + (i+1) + '. ' + t.title); });
    }
    if (tPend.length > 0) {
        lines.push('');
        lines.push('Pending Tasks:');
        tPend.forEach(function(t, i){ lines.push('  ' + (i+1) + '. ' + t.title + (tOver.some(function(o){return o.id===t.id;})?'  ⚠ OVERDUE':'')); });
    }

    lines.push('');
    lines.push('── PROBLEMS / ISSUES ──');
    lines.push('Total: ' + probs.length + ' | Resolved: ' + pRes.length + ' | Open: ' + pOpen.length);
    if (probs.length > 0) {
        probs.slice(0,5).forEach(function(p, i){
            lines.push('  ' + (i+1) + '. [' + (p.status||'open').toUpperCase() + '] ' + p.title + (p.category?' ('+p.category+')':''));
        });
        if (probs.length > 5) lines.push('  ... and ' + (probs.length-5) + ' more');
    } else {
        lines.push('  None reported');
    }

    lines.push('');
    lines.push('── CHECKLISTS ──');
    lines.push('Total: ' + cls.length + ' | Done: ' + clDone.length + ' | Compliance: ' + clRate + '%');

    lines.push('');
    lines.push('── MATERIAL REQUESTS ──');
    lines.push('Total: ' + reqs.length);
    if (reqs.length > 0) {
        reqs.slice(0,5).forEach(function(r, i){
            lines.push('  ' + (i+1) + '. ' + (r.title||'Request') + ' — ' + (r.status||'pending'));
        });
        if (reqs.length > 5) lines.push('  ... and ' + (reqs.length-5) + ' more');
    } else {
        lines.push('  None');
    }

    return lines.join('\n');
}

function showReportForm() {
    var user = AUTH.currentUser();
    if (!user) return;
    var summary = _genEmpWorkSummary();
    var today = new Date().toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'});
    var defaultTitle = 'Work Report — ' + today;
    var html = '<form id="reportForm">'
        + '<div class="form-group"><label>Report Title</label><input type="text" name="title" class="form-control" value="' + defaultTitle.replace(/"/g,'&quot;') + '" required></div>'
        + '<div class="form-group"><label>Category</label><select name="category" class="form-control"><option value="daily">Daily Report</option><option value="weekly">Weekly Report</option><option value="monthly">Monthly Report</option><option value="custom">Custom Report</option></select></div>'
        + '<div class="form-group"><label>Send To</label><select name="sentTo" class="form-control"><option value="hod">HOD</option><option value="admin">Admin</option><option value="both">Both HOD & Admin</option></select></div>'
        + '<div class="form-group"><label>Work Summary (auto-generated — edit as needed)</label>'
        + '<textarea name="description" class="form-control" rows="12" required style="font-family:monospace;font-size:12px;">' + summary.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea></div>'
        + '</form>';
    openFormModal('Submit Work Report', html, 'saveReport()', false);
}

function saveReport() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('reportForm');
    if (!data.title || !data.description) { APP.notify('Title and description required', 'error'); return false; }
    data.createdBy      = user.username;
    data.createdByName  = user.fullName;
    data.department     = user.department || '';
    data.status         = 'sent';
    // Attach snapshot stats for HOD inbox display
    var d = _empData;
    if (d && d.myTasks) {
        data._tasksDone    = (d.myTasks.filter(function(t){ return t.status==='completed'; })).length;
        data._tasksTotal   = d.myTasks.length;
        data._probsOpen    = (d.myProblems||[]).filter(function(p){ return p.status!=='resolved'; }).length;
        data._probsTotal   = (d.myProblems||[]).length;
        data._reqsTotal    = (d.myRequests||[]).length;
        data._clRate       = d.myChecklists&&d.myChecklists.length>0 ? Math.round(d.myChecklists.filter(function(c){ return c.status==='completed'; }).length/d.myChecklists.length*100) : 0;
    }
    DB.add('reports', data);
    APP.notify('Report submitted! Share it using 💬 ✉️ 📊 buttons in My Reports.', 'success');
    Router.navigate('employee-dashboard');
    setTimeout(function(){ empTabSwitch('reports'); }, 80);
}

function empShareReport(id, via) {
    var r = (DB.get('reports') || []).find(function(x){ return x.id === id; });
    if (!r) { APP.notify('Report not found', 'error'); return; }
    var user = AUTH.currentUser();
    var dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '-';
    var text = '🏥 *HOSPITAL MANAGEMENT SYSTEM*\n'
        + '*' + (r.title||'Work Report') + '*\n'
        + '━━━━━━━━━━━━━━━━━━━━━\n'
        + '👤 *Employee:* ' + (r.createdByName||(user&&user.fullName)||'') + '\n'
        + '🏢 *Department:* ' + (r.department||user&&user.department||'—') + '\n'
        + '📅 *Date:* ' + dateStr + '\n'
        + '📂 *Category:* ' + (r.category||'—').charAt(0).toUpperCase()+(r.category||'—').slice(1) + '\n'
        + '📨 *Sent To:* ' + (r.sentTo||'—') + '\n'
        + '━━━━━━━━━━━━━━━━━━━━━\n';
    if (r._tasksTotal !== undefined) {
        text += '📋 *Tasks:* ' + r._tasksDone + '/' + r._tasksTotal + ' done'
            + (r._tasksTotal > 0 ? ' (' + Math.round(r._tasksDone/r._tasksTotal*100) + '%)' : '') + '\n'
            + '🔧 *Issues:* ' + (r._tasksTotal!==undefined ? r._probsTotal : '—') + ' total, ' + r._probsOpen + ' open\n'
            + '✅ *Checklist:* ' + r._clRate + '% compliance\n'
            + '📦 *Material Requests:* ' + r._reqsTotal + '\n'
            + '━━━━━━━━━━━━━━━━━━━━━\n';
    }
    text += '\n' + (r.description||'');
    if (via === 'whatsapp') {
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
    } else {
        window.location.href = 'mailto:?subject=' + encodeURIComponent(r.title||'Work Report') + '&body=' + encodeURIComponent(text);
    }
}

function empExportReportExcel(id) {
    var r = (DB.get('reports') || []).find(function(x){ return x.id === id; });
    if (!r) { APP.notify('Report not found', 'error'); return; }
    var user = AUTH.currentUser();
    var d = _empData;
    if (!d || !d.user) { APP.notify('Please view your dashboard first', 'error'); return; }
    try {
        var wb = XLSX.utils.book_new();

        // Sheet 1: Report Info
        var info = [
            ['WORK REPORT'],
            ['Title', r.title||''],
            ['Employee', r.createdByName||''],
            ['Department', r.department||''],
            ['Date', r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''],
            ['Category', r.category||''],
            ['Sent To', r.sentTo||''],
            ['Status', r.status||''],
            [],
            ['SUMMARY'],
            ['Tasks Completed', r._tasksDone!==undefined ? r._tasksDone : '—'],
            ['Total Tasks', r._tasksTotal!==undefined ? r._tasksTotal : '—'],
            ['Open Issues', r._probsOpen!==undefined ? r._probsOpen : '—'],
            ['Total Issues', r._probsTotal!==undefined ? r._probsTotal : '—'],
            ['Checklist Compliance', r._clRate!==undefined ? r._clRate+'%' : '—'],
            ['Material Requests', r._reqsTotal!==undefined ? r._reqsTotal : '—'],
            [],
            ['DESCRIPTION'],
            [r.description||'']
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Report Info');

        // Sheet 2: Tasks
        var taskRows = [['Title','Status','Priority','Deadline','Department','Created By']];
        (d.myTasks||[]).forEach(function(t){
            taskRows.push([t.title||'', t.status||'', t.priority||'', t.deadline||'', t.department||'', t.createdBy||'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), 'Tasks');

        // Sheet 3: Problems
        var probRows = [['Title','Category','Status','Created At']];
        (d.myProblems||[]).forEach(function(p){
            probRows.push([p.title||'', p.category||'', p.status||'', p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(probRows), 'Problems');

        // Sheet 4: Material Requests
        var reqRows = [['Title','Status','Created At']];
        (d.myRequests||[]).forEach(function(req){
            reqRows.push([req.title||'', req.status||'', req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : '']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reqRows), 'Material Requests');

        var fname = ((r.title||'Work_Report').replace(/[^a-z0-9]/gi,'_')) + '.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('Excel downloaded: ' + fname, 'success');
    } catch(e) {
        APP.notify('Excel export failed: ' + e.message, 'error');
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

/* ═══ MATERIAL RETURN ═══ */
var _empReturnItems = [];

function empCreateReturn() {
    _empReturnItems = [];
    var user = AUTH.currentUser();
    var myReqs = (DB.get('material_requests') || []).filter(function(r) {
        return (r.createdBy === user.username) && (r.status === 'store_fulfilled' || r.status === 'confirmed');
    });

    var reqOpts = '<option value="">-- None --</option>'
        + myReqs.map(function(r) {
            return '<option value="' + r.id + '">' + (r.title || 'Request') + ' (' + APP.formatDate(r.createdAt) + ')</option>';
        }).join('');

    var form = '<form id="empReturnForm">'
        + '<div class="form-group"><label>Return Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Returning unused gloves from Ward A"></div>'
        + '<div class="form-group"><label>Reason for Return</label><textarea name="reason" class="form-control" rows="2" placeholder="Why are you returning these items?"></textarea></div>'
        + '<div class="form-group"><label>Linked Request (optional)</label><select name="linkedReqId" class="form-control">' + reqOpts + '</select></div>'
        + '<div class="form-group"><label>Items to Return</label>'
        + '<div id="empRetItemsContainer">'
        + '<div class="emp-ret-row" style="display:flex;gap:6px;margin-bottom:4px;">'
        + '<input type="text" class="form-control emp-ret-name" placeholder="Item name" style="flex:2;">'
        + '<input type="number" class="form-control emp-ret-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control emp-ret-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-success" onclick="empAddReturnRow()">+</button>'
        + '</div></div></div>'
        + '</form>';

    openFormModal('↩️ Return Materials to Storekeeper', form, 'empSaveReturn()', false);
}

function empAddReturnRow() {
    var container = document.getElementById('empRetItemsContainer');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'emp-ret-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';
    row.innerHTML = '<input type="text" class="form-control emp-ret-name" placeholder="Item name" style="flex:2;">'
        + '<input type="number" class="form-control emp-ret-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control emp-ret-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">−</button>';
    container.appendChild(row);
}

function empSaveReturn() {
    var user = AUTH.currentUser();
    var form = document.getElementById('empReturnForm');
    if (!form) return false;
    var title  = ((form.querySelector('[name="title"]') || {}).value || '').trim();
    var reason = (form.querySelector('[name="reason"]') || {}).value || '';
    var linkedReqId = (form.querySelector('[name="linkedReqId"]') || {}).value || '';
    if (!title) { APP.notify('Enter a return title', 'error'); return false; }

    var items = [];
    document.querySelectorAll('.emp-ret-row').forEach(function(row) {
        var name = ((row.querySelector('.emp-ret-name') || {}).value || '').trim();
        var qty  = parseInt((row.querySelector('.emp-ret-qty') || {}).value) || 1;
        var unit = ((row.querySelector('.emp-ret-unit') || {}).value || '').trim() || 'pcs';
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
    return true;
}
