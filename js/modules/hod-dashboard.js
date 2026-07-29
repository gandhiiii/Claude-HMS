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
var _hodInvDeptFilter = null; // null = current HOD dept, '__all__' = all departments
var _hodEditingPurchaseId;
var HOD_PURCHASE_DEPTS = ['IT', 'Facility'];
var HOD_SERVICE_DEPTS = ['IT', 'Facility'];
var HOD_BACKDOWN_DEPTS = ['IT', 'Facility'];

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
        teamReports: teamReports,
        deptPurchases: deptPurchases,
        pendingPurchases: pendingPurchases,
        hodTodosList: hodTodosList,
        hodPendingTodos: hodPendingTodos
    };

    var pendingCl  = myCl.filter(function (c) { return c.status !== 'completed'; }).length;
    var hodTodosList = (DB.get('hodTodos') || []).filter(function (t) { return t.createdBy === u || t.department === dept; });
    var hodPendingTodos = hodTodosList.filter(function (t) { return t.status !== 'completed'; }).length;
    var deptPurchases = (DB.get('hodPurchases') || []).filter(function (p) { return p.department === dept; });
    var pendingPurchases = deptPurchases.filter(function (p) { return p.status === 'pending'; }).length;
    var pendingReq = myReqs.filter(function (r) { return r.status === 'pending'; }).length + pendingMatApprovals.length + pendingGateApprovals.length;
    var openProblems = routedProblems.length;
    var deptInventory = (DB.get('inventory') || []).filter(function (i) {
        return (i.department || '').trim().toLowerCase() === (dept || '').trim().toLowerCase();
    });
    var lowStockCount = deptInventory.filter(function (i) { return parseFloat(i.quantity) <= 5; }).length;
    var invTotalValue = deptInventory.reduce(function (sum, i) {
        return sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0);
    }, 0);

    var canPurchases = HOD_PURCHASE_DEPTS.indexOf(dept) !== -1;
    var canService = HOD_SERVICE_DEPTS.indexOf(dept) !== -1;
    var canBackdown = HOD_BACKDOWN_DEPTS.indexOf(dept) !== -1;
    var equipServices = canService ? (DB.get('hodEquipmentServices') || []) : [];
    var dueServices = equipServices.filter(function(e){ return e.status !== 'done' && e.nextServiceDue && new Date(e.nextServiceDue) <= new Date(); });
    var upcomingServices = equipServices.filter(function(e){ return e.status !== 'done' && e.nextServiceDue && new Date(e.nextServiceDue) > new Date(); });
    var backdowns = canBackdown ? (DB.get('hodEquipmentBackdowns') || []) : [];

    var tabs = [
        { id: 'overview',    label: 'Overview' },
        { id: 'admissions',  label: 'Admissions' },
        { id: 'tasks',       label: 'Tasks', badge: _hodData.overdueTasks.length, bc: 'badge-danger' },
        { id: 'team',        label: '👥 My Team', badge: team.length, bc: 'badge-success' },
        { id: 'checklists',  label: 'Checklists', badge: pendingCl, bc: 'badge-info' },
        { id: 'dept-checklist', label: '📋 Dept Checklists' },
        { id: 'inventory',   label: '📦 Inventory', badge: lowStockCount, bc: 'badge-warning' },
        { id: 'requests',    label: '🔧 Problems & Requests', badge: pendingReq + openProblems, bc: 'badge-danger' },
        { id: 'performance', label: 'Performance' },
        { id: 'hodreports',  label: '📤 Reports', badge: teamReports.length, bc: 'badge-danger' },
        { id: 'hodqp',       label: '🎯 Q Priorities' },
        { id: 'hodtodo',     label: '📋 My TODOs', badge: hodPendingTodos, bc: 'badge-danger' },
        { id: 'hodworkreport', label: '📊 Work Report' }
    ];
    if (canPurchases) {
        tabs.splice(12, 0, { id: 'purchases', label: '💰 Purchases', badge: pendingPurchases, bc: 'badge-warning' });
    }
    if (canService) {
        tabs.splice(13, 0, { id: 'equipservice', label: '🔧 Equipment Service', badge: dueServices.length, bc: 'badge-danger' });
    }
    if (canBackdown) {
        tabs.splice(14, 0, { id: 'equipbackdown', label: '📉 Backdowns', badge: backdowns.length, bc: 'badge-secondary' });
    }

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
        + _hKpi('📦', 'Inventory Items', deptInventory.length,                '#e0f2f1', '#00796b', 'inventory')
        + _hKpi('🧹', 'Rooms to Clean', cleaning.length,                      '#fce4ec', 'var(--danger)', 'admissions')
        + (canPurchases ? _hKpi('💰', 'Purchase Requests', deptPurchases.length, '#e8f5e9', '#2e7d32', 'purchases') : '')
        + (canService ? _hKpi('🔧', 'Service Due', dueServices.length, '#ffebee', 'var(--danger)', 'equipservice') : '')
        + _hKpi('📋', 'My TODOs', hodPendingTodos,                             '#fce4ec', '#e91e63', 'hodtodo')
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
                performance: _hodPerformance, hodreports: _hodReports, hodqp: _hodQP,
                inventory: _hodInventoryReport,
                'dept-checklist': _hodDeptChecklists,
                purchases: _hodPurchases,
                equipservice: _hodEquipService,
                equipbackdown: _hodEquipBackdown,
                hodtodo: _hodTodo,
                hodworkreport: _hodWorkReport };
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
        + '<button class="btn btn-sm" style="background:#1a237e;color:#fff;border:none;" onclick="hodDownloadMasterReport()">📊 Master Report</button>'
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
        return (p.routedTo === dept || (!p.routedTo && p.department === dept)) && p.status !== 'resolved' && p.status !== 'closed';
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
                + (p.rca && p.rca.rootCauseDetails
                    ? '<button class="btn btn-sm" style="background:#1a237e;color:#fff;font-size:11px;" onclick="hodViewRCA(\'' + p.id + '\')">📋 View RCA</button>'
                    : '<button class="btn btn-sm" style="background:#2e7d32;color:#fff;font-size:11px;" onclick="hodShowRCAForm(\'' + p.id + '\')">🔍 RCA</button>')
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

function hodShowRCAForm(id) {
    var p = DB.getById('problems', id);
    if (!p) return;
    var tkt = p.ticketId || ('#' + p.id.slice(-6));
    var existing = p.rca || {};
    var isEdit = existing && existing.rootCause;

    var html = '<form id="hodRCAForm"><input type="hidden" id="hodRCAProbId" value="' + id + '">'
        + '<div style="background:#fff3e0;border-radius:8px;padding:10px 14px;margin-bottom:14px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:800;color:#e65100;">' + tkt + '</span>'
        + '<span style="font-size:11px;background:#e8eaf6;color:#1a237e;padding:2px 10px;border-radius:10px;">RCA & GEMBA</span></div>'
        + '<div style="font-size:14px;font-weight:600;margin-top:4px;">' + (p.title || '') + '</div>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">Category: ' + (p.category||'-') + ' · Reported: ' + APP.formatDate(p.createdAt) + ' · By: ' + (p.reportedBy||'-') + '</div>'
        + (p.source === 'checklist' ? '<div style="font-size:11px;color:var(--primary);margin-top:2px;">📋 ' + (p.checklistTitle||'') + ' — ' + (p.itemTask||'') + '</div>' : '')
        + '</div>'

        // ─── GEMBA Section ───
        + '<div style="background:#e8f5e9;border-radius:8px;padding:12px;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:14px;color:#2e7d32;margin-bottom:8px;">🏭 GEMBA — Go & See</div>'
        + '<div class="form-group"><label>Gemba Date</label><input type="date" id="hodRCAgembaDate" class="form-control" value="' + (existing.gembaDate||new Date().toISOString().slice(0,10)) + '"></div>'
        + '<div class="form-group"><label>Location / Area Observed *</label><input type="text" id="hodRCAgembaLocation" class="form-control" value="' + (existing.gembaLocation||'') + '" placeholder="e.g. 3rd Floor Nurse Station"></div>'
        + '<div class="form-group"><label>Actual Condition Observed *</label><textarea id="hodRCAgembaObservation" class="form-control" rows="3" placeholder="Describe what you actually saw at the location...">' + (existing.gembaObservation||'') + '</textarea></div>'
        + '</div>'

        // ─── RCA Section ───
        + '<div style="background:#e3f2fd;border-radius:8px;padding:12px;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:14px;color:#1565c0;margin-bottom:8px;">🔍 Root Cause Analysis</div>'
        + '<div class="form-group"><label>Root Cause Category</label><select id="hodRCAcauseCat" class="form-control">'
        + ['People','Process','Equipment','Material','Environment','Other'].map(function(c){
            return '<option value="' + c + '"' + (existing.causeCategory===c?' selected':'') + '>' + c + '</option>';
        }).join('') + '</select></div>'
        + '<div class="form-group"><label>Immediate Cause *</label><textarea id="hodRCAimmCause" class="form-control" rows="2" placeholder="What directly caused the problem?">' + (existing.immediateCause||'') + '</textarea></div>'
        + '<div class="form-group"><label>Root Cause (5 Whys) *</label><textarea id="hodRCArcDetails" class="form-control" rows="4" placeholder="Dig deeper &mdash; ask why 5 times to find the true root cause...">' + (existing.rootCauseDetails||'') + '</textarea></div>'
        + '<div style="font-size:11px;color:var(--gray);margin-top:-8px;margin-bottom:10px;">💡 Ask <strong>Why</strong> repeatedly until the fundamental process or system failure is identified.</div>'
        + '</div>'

        // ─── Action Plan ───
        + '<div style="background:#fff8e1;border-radius:8px;padding:12px;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:14px;color:#e65100;margin-bottom:8px;">📋 Corrective & Preventive Action (CAPA)</div>'
        + '<div class="form-group"><label>Immediate Corrective Action *</label><textarea id="hodRCAimmAction" class="form-control" rows="2" placeholder="What was done right away to contain the problem?">' + (existing.immediateAction||'') + '</textarea></div>'
        + '<div class="form-group"><label>Preventive Action *</label><textarea id="hodRCAprevAction" class="form-control" rows="3" placeholder="What systemic change prevents recurrence?">' + (existing.preventiveAction||'') + '</textarea></div>'
        + '<div class="form-group"><label>Responsible Person</label><input type="text" id="hodRCArespPerson" class="form-control" value="' + (existing.responsiblePerson||'') + '" placeholder="Name of person responsible"></div>'
        + '<div class="form-group"><label>Target Completion Date</label><input type="date" id="hodRCAtargetDate" class="form-control" value="' + (existing.targetDate||'') + '"></div>'
        + '</div>'

        + '</form>';
    openFormModal((isEdit?'Edit':'New') + ' RCA Report — ' + tkt, html, 'hodSaveRCA()', false);
}

function hodSaveRCA() {
    var id = (document.getElementById('hodRCAProbId') || {}).value;
    if (!id) { APP.notify('Problem ID missing', 'error'); return false; }
    var gembaDate = ((document.getElementById('hodRCAgembaDate') || {}).value || '').trim();
    var gembaLocation = ((document.getElementById('hodRCAgembaLocation') || {}).value || '').trim();
    var gembaObservation = ((document.getElementById('hodRCAgembaObservation') || {}).value || '').trim();
    var causeCategory = ((document.getElementById('hodRCAcauseCat') || {}).value || '').trim();
    var immediateCause = ((document.getElementById('hodRCAimmCause') || {}).value || '').trim();
    var rootCauseDetails = ((document.getElementById('hodRCArcDetails') || {}).value || '').trim();
    var immediateAction = ((document.getElementById('hodRCAimmAction') || {}).value || '').trim();
    var preventiveAction = ((document.getElementById('hodRCAprevAction') || {}).value || '').trim();
    var responsiblePerson = ((document.getElementById('hodRCArespPerson') || {}).value || '').trim();
    var targetDate = ((document.getElementById('hodRCAtargetDate') || {}).value || '').trim();

    if (!gembaLocation || !gembaObservation || !immediateCause || !rootCauseDetails || !immediateAction || !preventiveAction) {
        APP.notify('Please fill all required fields (marked with *)', 'error'); return false;
    }

    var user = AUTH.currentUser();
    var p = DB.getById('problems', id);
    var rcaData = {
        gembaDate: gembaDate,
        gembaLocation: gembaLocation,
        gembaObservation: gembaObservation,
        causeCategory: causeCategory,
        immediateCause: immediateCause,
        rootCauseDetails: rootCauseDetails,
        immediateAction: immediateAction,
        preventiveAction: preventiveAction,
        responsiblePerson: responsiblePerson,
        targetDate: targetDate,
        rcaDoneBy: user ? user.fullName : '',
        rcaDoneAt: new Date().toISOString()
    };

    DB.update('problems', id, {
        status: 'rca_completed',
        solution: 'RCA completed. Root cause: ' + immediateCause + '. Action: ' + immediateAction,
        resolvedBy: user ? user.fullName : '',
        resolvedAt: new Date().toISOString(),
        rca: rcaData
    });

    var tkt = p ? (p.ticketId || '#' + p.id.slice(-6)) : '';
    APP.notify('RCA report saved for ' + tkt + ' ✓', 'success');
    var modal = document.querySelector('.modal');
    if (modal) modal.remove();
    var dept = _hodData.dept;
    _hodData.routedProblems = (DB.get('problems') || []).filter(function (pb) {
        return (pb.routedTo === dept || (!pb.routedTo && pb.department === dept)) && pb.status !== 'resolved' && pb.status !== 'closed';
    });
    _renderHodTab('requests');
    return true;
}

function hodViewRCA(id) {
    var p = DB.getById('problems', id);
    if (!p) return;
    var r = p.rca;
    if (!r || !r.rootCauseDetails) { APP.notify('No RCA report found for this problem. Create one first.', 'info'); return; }
    var tkt = p.ticketId || ('#' + p.id.slice(-6));

    function _s(label, val) {
        return '<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--gray);font-weight:600;">' + label + '</span><div style="font-size:13px;background:var(--light-gray);padding:6px 10px;border-radius:6px;margin-top:2px;">' + (val||'—') + '</div></div>';
    }

    var html = '<div style="max-height:70vh;overflow-y:auto;padding:4px;">'
        + '<div style="background:linear-gradient(135deg,#1a237e,#283593);color:#fff;border-radius:10px;padding:16px;margin-bottom:14px;">'
        + '<div style="font-size:16px;font-weight:700;">📋 RCA Report — ' + tkt + '</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + (p.title||'') + '</div></div>'

        + '<div style="background:#e8f5e9;border-radius:8px;padding:12px;margin-bottom:12px;">'
        + '<div style="font-weight:700;font-size:14px;color:#2e7d32;margin-bottom:6px;">🏭 GEMBA — Go & See</div>'
        + _s('Date', r.gembaDate ? APP.formatDate(r.gembaDate) : '—')
        + _s('Location', r.gembaLocation)
        + _s('Observation', r.gembaObservation)
        + '</div>'

        + '<div style="background:#e3f2fd;border-radius:8px;padding:12px;margin-bottom:12px;">'
        + '<div style="font-weight:700;font-size:14px;color:#1565c0;margin-bottom:6px;">🔍 Root Cause Analysis</div>'
        + _s('Category', r.causeCategory)
        + _s('Immediate Cause', r.immediateCause)
        + _s('Root Cause (5 Whys)', r.rootCauseDetails)
        + _s('RCA Done By', r.rcaDoneBy)
        + _s('RCA Date', r.rcaDoneAt ? APP.formatDate(r.rcaDoneAt) : '—')
        + '</div>'

        + '<div style="background:#fff8e1;border-radius:8px;padding:12px;margin-bottom:12px;">'
        + '<div style="font-weight:700;font-size:14px;color:#e65100;margin-bottom:6px;">📋 CAPA — Corrective & Preventive Action</div>'
        + _s('Immediate Action', r.immediateAction)
        + _s('Preventive Action', r.preventiveAction)
        + _s('Responsible', r.responsiblePerson)
        + _s('Target Date', r.targetDate ? APP.formatDate(r.targetDate) : '—')
        + '</div>'

        + '<div style="display:flex;gap:8px;margin-top:8px;">'
        + '<button class="btn btn-sm btn-primary" onclick="document.querySelector(\'.modal\').remove();hodShowRCAForm(\'' + id + '\')">✏️ Edit</button>'
        + '<button class="btn btn-sm" style="background:#1e7e34;color:#fff;" onclick="document.querySelector(\'.modal\').remove();hodDownloadRCAReport(\'' + id + '\')">📥 Download</button>'
        + '</div></div>';
    openFormModal('RCA Report — ' + tkt, html, null, false);
}

function hodDownloadRCAReport(id) {
    var p = DB.getById('problems', id);
    if (!p || !p.rca) { APP.notify('No RCA data found', 'error'); return; }
    var r = p.rca;
    var user = AUTH.currentUser();
    var tkt = p.ticketId || ('#' + p.id.slice(-6));
    try {
        var wb = XLSX.utils.book_new();

        var info = [
            ['RCA & GEMBA REPORT'],
            [''],
            ['Ticket', tkt],
            ['Problem', p.title||''],
            ['Category', p.category||''],
            ['Reported By', p.reportedBy||''],
            ['Department', p.department||''],
            ['Location', p.location||''],
            ['Reported Date', p.createdAt ? APP.formatDate(p.createdAt) : ''],
            ['Status', p.status||''],
            [''],
            ['── GEMBA ──'],
            ['Gemba Date', r.gembaDate ? APP.formatDate(r.gembaDate) : ''],
            ['Location Observed', r.gembaLocation||''],
            ['Actual Condition', r.gembaObservation||''],
            [''],
            ['── ROOT CAUSE ANALYSIS ──'],
            ['Cause Category', r.causeCategory||''],
            ['Immediate Cause', r.immediateCause||''],
            ['Root Cause (5 Whys)', r.rootCauseDetails||''],
            ['RCA Done By', r.rcaDoneBy||''],
            ['RCA Date', r.rcaDoneAt ? APP.formatDate(r.rcaDoneAt) : ''],
            [''],
            ['── CORRECTIVE & PREVENTIVE ACTION ──'],
            ['Immediate Action', r.immediateAction||''],
            ['Preventive Action', r.preventiveAction||''],
            ['Responsible Person', r.responsiblePerson||''],
            ['Target Date', r.targetDate ? APP.formatDate(r.targetDate) : ''],
            [''],
            ['── RESOLUTION ──'],
            ['Resolved By', p.resolvedBy||''],
            ['Resolved At', p.resolvedAt ? APP.formatDate(p.resolvedAt) : ''],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'RCA Report');

        var fname = 'RCA_Report_' + tkt.replace(/[^a-z0-9]/gi,'_') + '.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('RCA report downloaded: ' + fname, 'success');
    } catch(e) {
        APP.notify('RCA download failed: ' + e.message, 'error');
    }
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
        return (p.routedTo === dept || (!p.routedTo && p.department === dept)) && p.status !== 'resolved' && p.status !== 'closed';
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
   PURCHASES TAB — Daily Purchase & Expense Requests
═══════════════════════════════════════════════ */
function _hodPurchases(el) {
    var user = AUTH.currentUser();
    if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || '';
    if (HOD_PURCHASE_DEPTS.indexOf(dept) === -1) {
        el.innerHTML = '<div class="empty-state">Purchases module is only available for IT and Facility departments.</div>';
        return;
    }

    var allPurchases = DB.get('hodPurchases') || [];
    var purchases = allPurchases.filter(function (p) { return p.department === dept; }).slice().reverse();
    var pendingP = purchases.filter(function (p) { return p.status === 'pending'; });
    var approved = purchases.filter(function (p) { return p.status === 'approved'; });
    var rejected = purchases.filter(function (p) { return p.status === 'rejected'; });

    var totalVal = purchases.reduce(function (s, p) { return s + (parseFloat(p.total) || 0); }, 0);

    function pBadge(status) {
        if (status === 'approved') return '<span class="badge badge-success" style="font-size:10px;">✓ Approved</span>';
        if (status === 'rejected') return '<span class="badge badge-danger" style="font-size:10px;">✗ Rejected</span>';
        return '<span class="badge badge-warning" style="font-size:10px;">⏳ Pending</span>';
    }

    var html = ''

        // Header
        + '<div style="background:linear-gradient(135deg,#1b5e20,#2e7d32);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
        + '<div><div style="font-size:18px;font-weight:700;">💰 Daily Purchases & Expenses — ' + dept + '</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + purchases.length + ' requests · ₹' + totalVal.toFixed(2) + ' total</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodCreatePurchase()">+ New Purchase Request</button>'
        + '</div></div>'

        // KPI cards
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#2e7d32;">' + purchases.length + '</div><div style="font-size:11px;color:var(--gray);">Total Requests</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#e65100;">' + pendingP.length + '</div><div style="font-size:11px;color:var(--gray);">Pending</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#2e7d32;">' + approved.length + '</div><div style="font-size:11px;color:var(--gray);">Approved</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#c62828;">' + rejected.length + '</div><div style="font-size:11px;color:var(--gray);">Rejected</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#6a1b9a;">₹' + totalVal.toFixed(2) + '</div><div style="font-size:11px;color:var(--gray);">Total Value</div></div>'
        + '</div>';

    if (purchases.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">💰</div>'
            + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No purchase requests yet</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Click "+ New Purchase Request" to submit one for approval.</div>'
            + '<button class="btn btn-primary" onclick="hodCreatePurchase()">+ New Purchase Request</button></div>';
    } else {
        // ── Daily Report Summary ──
        var todayStr = new Date().toISOString().slice(0,10);
        var todayPurchases = purchases.filter(function(p){ return p.createdAt && p.createdAt.slice(0,10) === todayStr; });
        var todayPending = todayPurchases.filter(function(p){ return p.status === 'pending'; });
        var todayApproved = todayPurchases.filter(function(p){ return p.status === 'approved'; });
        var todayVal = todayPurchases.reduce(function(s,p){ return s + (parseFloat(p.total)||0); }, 0);
        var approvedVal = approved.reduce(function(s,p){ return s + (parseFloat(p.total)||0); }, 0);
        var pendingVal = pendingP.reduce(function(s,p){ return s + (parseFloat(p.total)||0); }, 0);

        html += '<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:12px;padding:16px;margin-bottom:16px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
            + '<div><div style="font-weight:700;font-size:15px;">📊 Daily Purchases & Expenses Report</div>'
            + '<div style="font-size:12px;color:var(--gray);">' + new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + '</div></div>'
            + '<button class="btn btn-sm" style="background:#1b5e20;color:#fff;border:none;padding:6px 14px;font-size:12px;" onclick="hodDownloadPurchasesReport()">📥 Download Report</button>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">'
            + '<div style="background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #c8e6c9;"><div style="font-size:20px;font-weight:700;color:#2e7d32;">' + purchases.length + '</div><div style="font-size:11px;color:var(--gray);">All Time Requests</div></div>'
            + '<div style="background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #c8e6c9;"><div style="font-size:20px;font-weight:700;color:#1565c0;">' + todayPurchases.length + '</div><div style="font-size:11px;color:var(--gray);">Today\'s Requests</div></div>'
            + '<div style="background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #c8e6c9;"><div style="font-size:20px;font-weight:700;color:#2e7d32;">₹' + approvedVal.toFixed(2) + '</div><div style="font-size:11px;color:var(--gray);">Approved Value</div></div>'
            + '<div style="background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #c8e6c9;"><div style="font-size:20px;font-weight:700;color:#e65100;">₹' + pendingVal.toFixed(2) + '</div><div style="font-size:11px;color:var(--gray);">Pending Value</div></div>'
            + '</div></div>';
        // Pending section
        if (pendingP.length > 0) {
            html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px;">⏳ Pending Approval (' + pendingP.length + ')</div>';
            pendingP.forEach(function (p) { html += _hodPurchaseCard(p, user); });
        }
        // Approved section
        if (approved.length > 0) {
            html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:18px 0 8px;">✓ Approved (' + approved.length + ')</div>';
            approved.forEach(function (p) { html += _hodPurchaseCard(p, user); });
        }
        // Rejected section
        if (rejected.length > 0) {
            html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:18px 0 8px;">✗ Rejected (' + rejected.length + ')</div>';
            rejected.forEach(function (p) { html += _hodPurchaseCard(p, user); });
        }
    }

    el.innerHTML = html;
}

function _hodPurchaseCard(p, user) {
    var canManage = user && (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin');
    var canEdit = canManage || (user.role === 'hod');
    var statusBadge = p.status === 'approved' ? '<span class="badge badge-success" style="font-size:10px;">✓ Approved</span>'
        : p.status === 'rejected' ? '<span class="badge badge-danger" style="font-size:10px;">✗ Rejected</span>'
        : '<span class="badge badge-warning" style="font-size:10px;">⏳ Pending</span>';

    var approvalHtml = '';
    if (p.approvalType === 'none') {
        approvalHtml = '<span style="font-size:11px;color:var(--gray);">✅ No approval needed</span>';
    } else if (p.approvalType === 'pre-approved') {
        approvalHtml = '<span style="font-size:11px;color:#2e7d32;">✅ Pre-approved by ' + (p.preApprovedBy || 'Unknown') + '</span>';
    } else if (p.status === 'pending') {
        var label = p.approvalOther || p.approvalType || 'Unknown';
        approvalHtml = '<span style="font-size:11px;color:#e65100;">⏳ Awaiting: ' + label + '</span>';
    } else {
        var label = p.approvalOther || p.approvalType || '';
        approvalHtml = '<span style="font-size:11px;color:#2e7d32;">✓ Approved' + (label ? ' by ' + label : '') + '</span>';
    }

    return '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid '
        + (p.status === 'approved' ? 'var(--success)' : p.status === 'rejected' ? 'var(--danger)' : 'var(--warning)')
        + ';border-radius:10px;padding:14px;margin-bottom:10px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
        + '<div style="flex:1;min-width:180px;">'
        + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
        + '<span style="font-size:14px;font-weight:700;">' + (p.title || 'Purchase') + '</span>'
        + statusBadge
        + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin-top:6px;font-size:13px;">'
        + '<div><span style="color:var(--gray);">Item:</span> <strong>' + (p.itemName || '-') + '</strong></div>'
        + '<div><span style="color:var(--gray);">Qty:</span> <strong>' + (p.quantity || 1) + '</strong></div>'
        + '<div><span style="color:var(--gray);">Price:</span> <strong>₹' + (parseFloat(p.price) || 0).toFixed(2) + '</strong></div>'
        + '<div><span style="color:var(--gray);">Total:</span> <strong>₹' + (parseFloat(p.total) || parseFloat(p.price) * (p.quantity || 1)).toFixed(2) + '</strong></div>'
        + (p.location ? '<div><span style="color:var(--gray);">Location:</span> <strong>' + p.location + '</strong></div>' : '')
        + (p.vendor ? '<div><span style="color:var(--gray);">Vendor:</span> <strong>' + p.vendor + '</strong></div>' : '')
        + '</div>'
        + '<div style="margin-top:6px;">' + approvalHtml + '</div>'
        + (p.description ? '<div style="font-size:12px;color:var(--text);margin-top:4px;background:var(--light-gray);padding:6px 10px;border-radius:6px;">📝 ' + p.description + '</div>' : '')
        + '<div style="font-size:11px;color:var(--gray);margin-top:6px;">👤 ' + (p.createdByName || p.createdBy || '-') + ' · ' + APP.formatDate(p.createdAt)
        + (p.approvedBy && p.approvalType !== 'none' && p.approvalType !== 'pre-approved' ? ' · ✓ Approved by ' + p.approvedBy : '')
        + (p.rejectedBy ? ' · ✗ Rejected by ' + p.rejectedBy : '')
        + '</div></div>'
        + '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">'
        + (canManage && p.status === 'pending'
            ? '<button class="btn btn-sm btn-success" onclick="hodApprovePurchase(\'' + p.id + '\')">✓ Approve</button>'
              + '<button class="btn btn-sm btn-danger" onclick="hodRejectPurchase(\'' + p.id + '\')">✗ Reject</button>'
            : '')
        + (canEdit
            ? '<button class="btn btn-sm btn-outline" style="font-size:11px;color:var(--primary);border-color:var(--primary);" onclick="hodEditPurchase(\'' + p.id + '\')">✎ Edit</button>'
            : '')
        + (canEdit && p.status === 'pending'
            ? '<button class="btn btn-sm btn-outline" style="font-size:11px;color:var(--danger);border-color:var(--danger);" onclick="hodDeletePurchase(\'' + p.id + '\')">🗑 Delete</button>'
            : '')
        + '</div></div></div>';
}

function hodPurchaseCalcTotal() {
    var qty = document.querySelector('#hodPurchaseForm [name="quantity"]');
    var prc = document.querySelector('#hodPurchaseForm [name="price"]');
    var tot = document.getElementById('hodPurchaseTotal');
    if (!qty || !prc || !tot) return;
    var q = parseFloat(qty.value) || 1;
    var p = parseFloat(prc.value) || 0;
    tot.value = '₹' + (q * p).toFixed(2);
}

function hodToggleApprovalFields() {
    var sel = document.querySelector('#hodPurchaseForm [name="approvalType"], #hodPurchaseEditForm [name="approvalType"]');
    if (!sel) return;
    var v = sel.value;
    var otherWrap = document.getElementById('hodApprovalOtherWrap');
    var preWrap = document.getElementById('hodPreApprovedWrap');
    if (otherWrap) otherWrap.style.display = v === 'other' ? '' : 'none';
    if (preWrap) preWrap.style.display = v === 'pre-approved' ? '' : 'none';
}

function hodCreatePurchase() {
    var form = '<form id="hodPurchaseForm">'
        + '<div class="form-group"><label>Request Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Purchase of cleaning supplies"></div>'
        + '<div class="form-group"><label>Item / Goods Name *</label><input type="text" name="itemName" class="form-control" required placeholder="e.g. Floor disinfectant 5L"></div>'
        + '<div class="grid-3" style="gap:10px;">'
        + '<div class="form-group"><label>Quantity</label><input type="number" name="quantity" class="form-control" min="1" value="1" oninput="hodPurchaseCalcTotal()"></div>'
        + '<div class="form-group"><label>Price per Unit (₹) *</label><input type="number" name="price" class="form-control" step="0.01" min="0" required placeholder="e.g. 450" oninput="hodPurchaseCalcTotal()"></div>'
        + '<div class="form-group"><label>Total (auto-calc)</label><input type="text" id="hodPurchaseTotal" class="form-control" readonly style="background:var(--light-gray);font-weight:700;"></div>'
        + '</div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Location / Store *</label><input type="text" name="location" class="form-control" required placeholder="e.g. General Store, Counter 3"></div>'
        + '<div class="form-group"><label>Vendor / Supplier</label><input type="text" name="vendor" class="form-control" placeholder="e.g. ABC Traders"></div>'
        + '</div>'
        + '<div class="form-group"><label>Description / Purpose *</label><textarea name="description" class="form-control" rows="3" required placeholder="Why is this purchase needed? How will it be used?"></textarea></div>'
        + '<hr style="margin:12px 0;border-color:var(--border);">'
        + '<div class="form-group"><label>Approval Required <span style="font-size:11px;color:var(--gray);">(who needs to approve this?)</span></label>'
        + '<select name="approvalType" class="form-control" onchange="hodToggleApprovalFields()" style="margin-bottom:8px;">'
        + '<option value="none">No approval needed (direct purchase)</option>'
        + '<option value="pre-approved">Already approved — enter who approved</option>'
        + '<option value="MD">MD</option>'
        + '<option value="Chairman">Chairman</option>'
        + '<option value="Vice Chairman">Vice Chairman</option>'
        + '<option value="MD+Chairman">MD + Chairman</option>'
        + '<option value="MD+Vice Chairman">MD + Vice Chairman</option>'
        + '<option value="Chairman+Vice Chairman">Chairman + Vice Chairman</option>'
        + '<option value="All">All (MD, Chairman, Vice Chairman)</option>'
        + '<option value="other">Other (specify)</option>'
        + '</select>'
        + '<div id="hodApprovalOtherWrap" style="display:none;"><input type="text" name="approvalOther" class="form-control" placeholder="e.g. Board of Directors"></div>'
        + '<div id="hodPreApprovedWrap" style="display:none;"><input type="text" name="preApprovedBy" class="form-control" placeholder="Who already approved this? e.g. MD"></div>'
        + '</div>'
        + '</form>';
    openFormModal('💰 New Purchase / Expense Request', form, 'hodSavePurchase()', true);
}

function hodSavePurchase() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodPurchaseForm');
    if (!data.title || !data.itemName || !data.price || !data.location || !data.description) {
        APP.notify('Please fill all required fields', 'error'); return false;
    }
    var qty = parseFloat(data.quantity) || 1;
    var price = parseFloat(data.price) || 0;
    if (price <= 0) { APP.notify('Enter a valid price', 'error'); return false; }
    var approvalType = data.approvalType || 'none';
    var approvalOther = data.approvalOther || '';
    var preApprovedBy = data.preApprovedBy || '';
    var recStatus = approvalType === 'none' ? 'approved' : (approvalType === 'pre-approved' ? 'approved' : 'pending');
    DB.add('hodPurchases', {
        title: data.title,
        itemName: data.itemName,
        quantity: qty,
        price: price,
        total: qty * price,
        location: data.location,
        vendor: data.vendor || '',
        description: data.description,
        department: user.department,
        status: recStatus,
        approvalType: approvalType,
        approvalOther: approvalOther,
        preApprovedBy: preApprovedBy,
        approvedBy: recStatus === 'approved' ? (preApprovedBy || (approvalType === 'none' ? 'No approval needed' : '')) : '',
        approvedAt: recStatus === 'approved' ? new Date().toISOString() : '',
        createdBy: user.username,
        createdByName: user.fullName,
        createdAt: new Date().toISOString()
    });
    APP.notify('Purchase request submitted for approval!', 'success');
    _hodData.deptPurchases = (DB.get('hodPurchases') || []).filter(function (p) { return p.department === user.department; });
    _hodData.pendingPurchases = _hodData.deptPurchases.filter(function (p) { return p.status === 'pending'; }).length;
    _renderHodTab('purchases');
    return true;
}

function hodApprovePurchase(id) {
    var user = AUTH.currentUser();
    if (!user) return;
    confirmAction('Approve this purchase request?', function () {
        DB.update('hodPurchases', id, {
            status: 'approved',
            approvedBy: user.fullName,
            approvedAt: new Date().toISOString()
        });
        APP.notify('Purchase request approved', 'success');
        _hodData.deptPurchases = (DB.get('hodPurchases') || []).filter(function (p) { return p.department === user.department; });
        _hodData.pendingPurchases = _hodData.deptPurchases.filter(function (p) { return p.status === 'pending'; }).length;
        _renderHodTab('purchases');
    });
}

function hodRejectPurchase(id) {
    var user = AUTH.currentUser();
    if (!user) return;
    var reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    DB.update('hodPurchases', id, {
        status: 'rejected',
        rejectedBy: user.fullName,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || ''
    });
    APP.notify('Purchase request rejected', 'info');
    _hodData.deptPurchases = (DB.get('hodPurchases') || []).filter(function (p) { return p.department === user.department; });
    _hodData.pendingPurchases = _hodData.deptPurchases.filter(function (p) { return p.status === 'pending'; }).length;
    _renderHodTab('purchases');
}

function hodDeletePurchase(id) {
    var user = AUTH.currentUser();
    if (!user) return;
    var p = DB.getById('hodPurchases', id);
    if (!p) { APP.notify('Request not found', 'error'); return; }
    if (p.createdBy !== user.username && !user.isSuperAdmin && user.role !== 'admin' && user.role !== 'super_admin') {
        APP.notify('You can only delete your own requests', 'error'); return;
    }
    confirmAction('Delete this purchase request?', function () {
        DB.delete('hodPurchases', id);
        APP.notify('Purchase request deleted', 'success');
        _hodData.deptPurchases = (DB.get('hodPurchases') || []).filter(function (p) { return p.department === user.department; });
        _hodData.pendingPurchases = _hodData.deptPurchases.filter(function (p) { return p.status === 'pending'; }).length;
        _renderHodTab('purchases');
    });
}

function hodEditPurchase(id) {
    var p = DB.getById('hodPurchases', id);
    if (!p) { APP.notify('Request not found', 'error'); return; }
    _hodEditingPurchaseId = id;
    var esc = function(v){ return String(v||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var form = '<form id="hodPurchaseEditForm">'
        + '<div class="form-group"><label>Request Title *</label><input type="text" name="title" class="form-control" required value="' + esc(p.title) + '"></div>'
        + '<div class="form-group"><label>Item / Goods Name *</label><input type="text" name="itemName" class="form-control" required value="' + esc(p.itemName) + '"></div>'
        + '<div class="grid-3" style="gap:10px;">'
        + '<div class="form-group"><label>Quantity</label><input type="number" name="quantity" class="form-control" min="1" value="' + (p.quantity||1) + '" oninput="hodPurchaseCalcTotalEdit()"></div>'
        + '<div class="form-group"><label>Price per Unit (₹) *</label><input type="number" name="price" class="form-control" step="0.01" min="0" required value="' + (parseFloat(p.price)||0) + '" oninput="hodPurchaseCalcTotalEdit()"></div>'
        + '<div class="form-group"><label>Total (auto-calc)</label><input type="text" id="hodPurchaseEditTotal" class="form-control" readonly style="background:var(--light-gray);font-weight:700;" value="₹' + (parseFloat(p.total)||0).toFixed(2) + '"></div>'
        + '</div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Location / Store *</label><input type="text" name="location" class="form-control" required value="' + esc(p.location) + '"></div>'
        + '<div class="form-group"><label>Vendor / Supplier</label><input type="text" name="vendor" class="form-control" value="' + esc(p.vendor) + '"></div>'
        + '</div>'
        + '<div class="form-group"><label>Description / Purpose *</label><textarea name="description" class="form-control" rows="3" required>' + esc(p.description) + '</textarea></div>'
        + '<hr style="margin:12px 0;border-color:var(--border);">'
        + '<div class="form-group"><label>Approval Required</label>'
        + '<select name="approvalType" class="form-control" onchange="hodToggleApprovalFields()" style="margin-bottom:8px;">'
        + '<option value="none"' + (p.approvalType==='none'?' selected':'') + '>No approval needed (direct purchase)</option>'
        + '<option value="pre-approved"' + (p.approvalType==='pre-approved'?' selected':'') + '>Already approved — enter who approved</option>'
        + '<option value="MD"' + (p.approvalType==='MD'?' selected':'') + '>MD</option>'
        + '<option value="Chairman"' + (p.approvalType==='Chairman'?' selected':'') + '>Chairman</option>'
        + '<option value="Vice Chairman"' + (p.approvalType==='Vice Chairman'?' selected':'') + '>Vice Chairman</option>'
        + '<option value="MD+Chairman"' + (p.approvalType==='MD+Chairman'?' selected':'') + '>MD + Chairman</option>'
        + '<option value="MD+Vice Chairman"' + (p.approvalType==='MD+Vice Chairman'?' selected':'') + '>MD + Vice Chairman</option>'
        + '<option value="Chairman+Vice Chairman"' + (p.approvalType==='Chairman+Vice Chairman'?' selected':'') + '>Chairman + Vice Chairman</option>'
        + '<option value="All"' + (p.approvalType==='All'?' selected':'') + '>All (MD, Chairman, Vice Chairman)</option>'
        + '<option value="other"' + (p.approvalType==='other'?' selected':'') + '>Other (specify)</option>'
        + '</select>'
        + '<div id="hodApprovalOtherWrap" style="display:' + (p.approvalType==='other'?'':'none') + ';"><input type="text" name="approvalOther" class="form-control" placeholder="e.g. Board of Directors" value="' + esc(p.approvalOther) + '"></div>'
        + '<div id="hodPreApprovedWrap" style="display:' + (p.approvalType==='pre-approved'?'':'none') + ';"><input type="text" name="preApprovedBy" class="form-control" placeholder="Who already approved this?" value="' + esc(p.preApprovedBy) + '"></div>'
        + '</div>'
        + '</form>';
    openFormModal('✎ Edit Purchase / Expense Request', form, 'hodUpdatePurchase()', false);
}

function hodPurchaseCalcTotalEdit() {
    var qty = document.querySelector('#hodPurchaseEditForm [name="quantity"]');
    var prc = document.querySelector('#hodPurchaseEditForm [name="price"]');
    var tot = document.getElementById('hodPurchaseEditTotal');
    if (!qty || !prc || !tot) return;
    var q = parseFloat(qty.value) || 1;
    var p = parseFloat(prc.value) || 0;
    tot.value = '₹' + (q * p).toFixed(2);
}

function hodUpdatePurchase() {
    var id = _hodEditingPurchaseId;
    if (!id) { APP.notify('Edit session expired', 'error'); return false; }
    var data = getFormData('hodPurchaseEditForm');
    if (!data.title || !data.itemName || !data.price || !data.location || !data.description) {
        APP.notify('Please fill all required fields', 'error'); return false;
    }
    var qty = parseFloat(data.quantity) || 1;
    var price = parseFloat(data.price) || 0;
    if (price <= 0) { APP.notify('Enter a valid price', 'error'); return false; }
    var approvalType = data.approvalType || 'none';
    var approvalOther = data.approvalOther || '';
    var preApprovedBy = data.preApprovedBy || '';
    var upd = {
        title: data.title,
        itemName: data.itemName,
        quantity: qty,
        price: price,
        total: qty * price,
        location: data.location,
        vendor: data.vendor || '',
        description: data.description,
        approvalType: approvalType,
        approvalOther: approvalOther,
        preApprovedBy: preApprovedBy,
        editedAt: new Date().toISOString(),
        editedBy: user.fullName
    };
    if (approvalType === 'none' || approvalType === 'pre-approved') {
        upd.status = 'approved';
        upd.approvedBy = preApprovedBy || 'No approval needed';
        upd.approvedAt = new Date().toISOString();
    }
    DB.update('hodPurchases', id, upd);
    APP.notify('Purchase request updated!', 'success');
    _hodData.deptPurchases = (DB.get('hodPurchases') || []).filter(function (p) { return p.department === user.department; });
    _hodData.pendingPurchases = _hodData.deptPurchases.filter(function (p) { return p.status === 'pending'; }).length;
    _renderHodTab('purchases');
    return true;
}

/* Download Daily Purchases & Expenses Report as Excel */
function hodDownloadPurchasesReport() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department || '';
    if (HOD_PURCHASE_DEPTS.indexOf(dept) === -1) return;
    var allPurchases = (DB.get('hodPurchases') || []).filter(function(p){ return p.department === dept; });

    var todayStr = new Date().toISOString().slice(0,10);
    var today = allPurchases.filter(function(p){ return p.createdAt && p.createdAt.slice(0,10) === todayStr; });
    var approved = allPurchases.filter(function(p){ return p.status === 'approved'; });
    var pending = allPurchases.filter(function(p){ return p.status === 'pending'; });
    var rejected = allPurchases.filter(function(p){ return p.status === 'rejected'; });
    var approvedVal = approved.reduce(function(s,p){ return s+(parseFloat(p.total)||0); },0);
    var pendingVal = pending.reduce(function(s,p){ return s+(parseFloat(p.total)||0); },0);

    var wb = XLSX.utils.book_new();

    // ── Dashboard sheet ──
    var dashData = [
        ['Daily Purchases & Expenses Report'],
        ['Department', dept],
        ['Generated', new Date().toLocaleString('en-IN')],
        [],
        ['Metric', 'Value'],
        ['All Time Requests', allPurchases.length],
        ['Approved', approved.length],
        ['Pending', pending.length],
        ['Rejected', rejected.length],
        ['Approved Value (₹)', approvedVal.toFixed(2)],
        ['Pending Value (₹)', pendingVal.toFixed(2)],
        ['Total Value (₹)', allPurchases.reduce(function(s,p){ return s+(parseFloat(p.total)||0); },0).toFixed(2)],
        [],
        ['Today (' + todayStr + ')'],
        ['Today\'s Requests', today.length],
        ['Today\'s Approved', today.filter(function(p){ return p.status==='approved'; }).length],
        ['Today\'s Pending', today.filter(function(p){ return p.status==='pending'; }).length],
        ['Today\'s Value (₹)', today.reduce(function(s,p){ return s+(parseFloat(p.total)||0); },0).toFixed(2)]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashData), 'Dashboard');

    // ── All Records sheet ──
    var headers = ['Date','Title','Item','Qty','Unit Price','Total','Location','Vendor','Status','Approval','Created By','Approved/Rejected By','Description'];
    var rows = allPurchases.map(function(p){
        var approvedBy = p.approvedBy || p.rejectedBy || '';
        var approvalLabel = p.approvalType === 'none' ? 'No approval needed'
            : p.approvalType === 'pre-approved' ? 'Pre-approved by ' + (p.preApprovedBy||'')
            : p.approvalOther || p.approvalType || '';
        return [
            APP.formatDate(p.createdAt), p.title||'', p.itemName||'', p.quantity||1,
            parseFloat(p.price)||0, parseFloat(p.total)||0, p.location||'', p.vendor||'',
            p.status, approvalLabel, p.createdByName||p.createdBy||'', approvedBy, p.description||''
        ];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers].concat(rows)), 'All Records');

    // ── Today Summary sheet ──
    var todayHeaders = ['Title','Item','Qty','Total','Status','Created By','Time'];
    var todayRows = today.map(function(p){
        return [p.title||'', p.itemName||'', p.quantity||1, parseFloat(p.total)||0, p.status, p.createdByName||p.createdBy||'', p.createdAt ? p.createdAt.slice(11,16) : ''];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([todayHeaders].concat(todayRows)), 'Today');

    XLSX.writeFile(wb, 'Daily_Purchases_Report_' + dept + '_' + todayStr + '.xlsx');
    APP.notify('Daily Purchases Report downloaded!', 'success');
}

/* ═══════════════════════════════════════════════
   EQUIPMENT SERVICE TAB — Service records & tracking
═══════════════════════════════════════════════ */
function _hodEquipService(el) {
    var user = AUTH.currentUser();
    if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || '';
    if (HOD_SERVICE_DEPTS.indexOf(dept) === -1) {
        el.innerHTML = '<div class="empty-state">Equipment Service is only available for IT and Facility departments.</div>';
        return;
    }

    var all = DB.get('hodEquipmentServices') || [];
    var done = all.filter(function(e){ return e.status === 'done'; });
    var overdue = all.filter(function(e){ return e.status !== 'done' && e.nextServiceDue && new Date(e.nextServiceDue) < new Date(); });
    var upcoming = all.filter(function(e){ return e.status !== 'done' && e.nextServiceDue && new Date(e.nextServiceDue) >= new Date(); });
    var noDate = all.filter(function(e){ return e.status !== 'done' && !e.nextServiceDue; });
    var today = new Date();

    function serviceBar(e) {
        var daysUntil = 365;
        if (e.nextServiceDue) {
            var due = new Date(e.nextServiceDue);
            daysUntil = Math.ceil((due - today) / (1000*60*60*24));
        }
        var pct, color;
        if (e.status === 'done') {
            pct = 100;
            color = '#2e7d32';
        } else if (daysUntil <= 0) {
            pct = 100;
            color = '#c62828';
        } else if (daysUntil <= 7) {
            pct = 75 + Math.round((1 - daysUntil/7) * 25);
            color = '#e65100';
        } else if (daysUntil <= 30) {
            pct = 50 + Math.round((1 - (daysUntil-7)/23) * 25);
            color = '#f9a825';
        } else {
            pct = Math.min(Math.round((1 - daysUntil/365) * 50), 50);
            color = '#2e7d32';
        }
        return '<div style="margin-top:6px;background:#e0e0e0;border-radius:6px;height:8px;overflow:hidden;position:relative;">'
            + '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:6px;transition:width .3s;"></div>'
            + '</div>'
            + '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--gray);margin-top:2px;">'
            + '<span>' + (e.lastServiceDate ? 'Last: ' + APP.formatDate(e.lastServiceDate) : 'No record') + '</span>'
            + '<span style="font-weight:600;color:' + color + ';">'
            + (e.status === 'done' ? '✓ Done' : daysUntil <= 0 ? Math.abs(daysUntil)+' day(s) overdue' : daysUntil + ' day(s) left')
            + '</span>'
            + '</div>';
    }

    function equipCard(e) {
        var dueDate = e.nextServiceDate || e.nextServiceDue || '';
        var statusColor = e.status === 'done' ? 'var(--success)' : (overdue.indexOf(e)!==-1 ? 'var(--danger)' : 'var(--warning)');
        return '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid ' + statusColor + ';border-radius:10px;padding:14px;margin-bottom:10px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:180px;">'
            + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
            + '<span style="font-size:14px;font-weight:700;">' + (e.assetName || 'Equipment') + '</span>'
            + '<span class="badge badge-secondary" style="font-size:10px;">' + (e.assetCode || '-') + '</span>'
            + '<span class="badge" style="font-size:10px;background:' + statusColor + ';color:#fff;">' + (e.status==='done'?'Done': overdue.indexOf(e)!==-1?'Overdue':'Upcoming') + '</span>'
            + '<span style="font-size:10px;color:var(--gray);background:var(--light-gray);padding:2px 8px;border-radius:8px;">' + (e.serviceType || 'N/A') + '</span>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin-top:6px;font-size:13px;">'
            + '<div><span style="color:var(--gray);">Asset Code:</span> <strong>' + (e.assetCode || '-') + '</strong></div>'
            + '<div><span style="color:var(--gray);">Service:</span> <strong>' + (e.serviceType || '-') + '</strong></div>'
            + '<div><span style="color:var(--gray);">Due:</span> <strong>' + (dueDate ? APP.formatDate(dueDate) : 'Not set') + '</strong></div>'
            + (e.notes ? '<div style="grid-column:1/-1;"><span style="color:var(--gray);">Notes:</span> ' + e.notes + '</div>' : '')
            + '</div>'
            + serviceBar(e)
            + '<div style="font-size:11px;color:var(--gray);margin-top:6px;">👤 ' + (e.createdByName || e.createdBy || '-') + ' · ' + APP.formatDate(e.createdAt) + '</div>'
            + '</div>'
            + '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">'
            + (e.status !== 'done' && e.status !== 'backdown' ? '<button class="btn btn-sm btn-success" style="font-size:11px;" onclick="hodServiceMarkDone(\'' + e.id + '\')">✓ Mark Done</button>' : '')
            + (e.status !== 'backdown' ? '<button class="btn btn-sm btn-outline" style="font-size:11px;color:#6a1b9a;border-color:#6a1b9a;" onclick="hodBackdownFromService(\'' + e.id + '\')">⬇ Backdown</button>' : '')
            + '<button class="btn btn-sm btn-outline" style="font-size:11px;color:var(--danger);border-color:var(--danger);" onclick="hodServiceDelete(\'' + e.id + '\')">🗑 Delete</button>'
            + '</div></div></div>';
    }

    var html = ''
        + '<div style="background:linear-gradient(135deg,#0d47a1,#1565c0);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
        + '<div><div style="font-size:18px;font-weight:700;">🔧 Equipment Service Records — ' + dept + '</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + all.length + ' equipment · ' + overdue.length + ' overdue · ' + upcoming.length + ' upcoming</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodServiceAdd()">+ Add Equipment</button>'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodDownloadServiceReport()">📥 Report</button>'
        + '</div></div>'

        // KPI cards
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#1565c0;">' + all.length + '</div><div style="font-size:11px;color:var(--gray);">Total Equipment</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#c62828;">' + overdue.length + '</div><div style="font-size:11px;color:var(--gray);">Overdue Service</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#f9a825;">' + upcoming.length + '</div><div style="font-size:11px;color:var(--gray);">Upcoming</div></div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#2e7d32;">' + done.length + '</div><div style="font-size:11px;color:var(--gray);">Completed</div></div>'
        + '</div>';

    if (all.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">🔧</div>'
            + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No equipment registered yet</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Add equipment to start tracking service schedules.</div>'
            + '<button class="btn btn-primary" onclick="hodServiceAdd()">+ Add Equipment</button></div>';
        el.innerHTML = html;
        return;
    }

    // Overdue section
    if (overdue.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px;">🔴 Overdue Service (' + overdue.length + ')</div>';
        overdue.forEach(function(e){ html += equipCard(e); });
    }

    // Upcoming section
    if (upcoming.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:18px 0 8px;">🟡 Upcoming Service (' + upcoming.length + ')</div>';
        upcoming.forEach(function(e){ html += equipCard(e); });
    }

    // No date section
    if (noDate.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:18px 0 8px;">⚪ No Due Date Set (' + noDate.length + ')</div>';
        noDate.forEach(function(e){ html += equipCard(e); });
    }

    // Completed section
    if (done.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:.5px;margin:18px 0 8px;">✅ Completed Service (' + done.length + ')</div>';
        done.slice().reverse().forEach(function(e){ html += equipCard(e); });
    }

    el.innerHTML = html;
}

function hodServiceAdd() {
    var today = new Date().toISOString().slice(0,10);
    var form = '<form id="hodServiceForm">'
        + '<div class="form-group"><label>Asset Code *</label><input type="text" name="assetCode" class="form-control" required placeholder="e.g. EQ-001"></div>'
        + '<div class="form-group"><label>Asset Name *</label><input type="text" name="assetName" class="form-control" required placeholder="e.g. MRI Machine"></div>'
        + '<div class="form-group"><label>Service Type *</label>'
        + '<select name="serviceType" class="form-control" required>'
        + '<option value="weekly">Weekly</option>'
        + '<option value="monthly">Monthly</option>'
        + '<option value="yearly">Yearly</option>'
        + '<option value="quarterly">Quarterly</option>'
        + '<option value="custom">Custom</option>'
        + '</select></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Last Service Date</label><input type="date" name="lastServiceDate" class="form-control" value="' + today + '"></div>'
        + '<div class="form-group"><label>Next Service Due Date *</label><input type="date" name="nextServiceDue" class="form-control" required></div>'
        + '</div>'
        + '<div class="form-group"><label>Notes</label><textarea name="notes" class="form-control" rows="2" placeholder="e.g. Service contract details, vendor info"></textarea></div>'
        + '</form>';
    openFormModal('🔧 Add Equipment Service Record', form, 'hodServiceSave()', false);
}

function hodServiceSave() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodServiceForm');
    if (!data.assetCode || !data.assetName || !data.serviceType || !data.nextServiceDue) {
        APP.notify('Fill all required fields', 'error'); return false;
    }
    DB.add('hodEquipmentServices', {
        assetCode: data.assetCode,
        assetName: data.assetName,
        serviceType: data.serviceType,
        lastServiceDate: data.lastServiceDate || '',
        nextServiceDue: data.nextServiceDue,
        status: 'upcoming',
        notes: data.notes || '',
        department: user.department,
        createdBy: user.username,
        createdByName: user.fullName,
        createdAt: new Date().toISOString()
    });
    APP.notify('Equipment service record added!', 'success');
    _renderHodTab('equipservice');
    return true;
}

function hodServiceMarkDone(id) {
    var user = AUTH.currentUser();
    if (!user) return;
    var p = DB.getById('hodEquipmentServices', id);
    if (!p) { APP.notify('Record not found', 'error'); return; }
    var today = new Date().toISOString().slice(0,10);
    var nextDue = '';
    if (p.serviceType === 'weekly') {
        var d = new Date(); d.setDate(d.getDate() + 7); nextDue = d.toISOString().slice(0,10);
    } else if (p.serviceType === 'monthly') {
        var d = new Date(); d.setMonth(d.getMonth() + 1); nextDue = d.toISOString().slice(0,10);
    } else if (p.serviceType === 'quarterly') {
        var d = new Date(); d.setMonth(d.getMonth() + 3); nextDue = d.toISOString().slice(0,10);
    } else if (p.serviceType === 'yearly') {
        var d = new Date(); d.setFullYear(d.getFullYear() + 1); nextDue = d.toISOString().slice(0,10);
    }
    var upd = {
        status: 'done',
        lastServiceDate: today,
        completedAt: new Date().toISOString(),
        completedBy: user.fullName
    };
    if (nextDue) upd.nextServiceDue = nextDue;
    DB.update('hodEquipmentServices', id, upd);
    APP.notify('Service marked as done! Next due: ' + (nextDue || 'not set'), 'success');
    _renderHodTab('equipservice');
}

function hodServiceDelete(id) {
    confirmAction('Delete this equipment service record?', function(){
        DB.delete('hodEquipmentServices', id);
        APP.notify('Record deleted', 'success');
        _renderHodTab('equipservice');
    });
}

/* ═══════════════════════════════════════════════
   EQUIPMENT BACKDOWN TAB
═══════════════════════════════════════════════ */
function _hodEquipBackdown(el) {
    var user = AUTH.currentUser();
    if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || '';
    if (HOD_BACKDOWN_DEPTS.indexOf(dept) === -1) {
        el.innerHTML = '<div class="empty-state">Backdowns are only available for IT and Facility departments.</div>';
        return;
    }

    var all = DB.get('hodEquipmentBackdowns') || [];

    function backdownCard(b) {
        return '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid #6a1b9a;border-radius:10px;padding:14px;margin-bottom:10px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:180px;">'
            + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
            + '<span style="font-size:14px;font-weight:700;">' + (b.assetName || 'Equipment') + '</span>'
            + '<span class="badge badge-secondary" style="font-size:10px;">' + (b.assetCode || '-') + '</span>'
            + '<span style="font-size:10px;color:#fff;background:#6a1b9a;padding:2px 8px;border-radius:8px;">Backdown</span>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin-top:6px;font-size:13px;">'
            + '<div><span style="color:var(--gray);">Asset Code:</span> <strong>' + (b.assetCode || '-') + '</strong></div>'
            + '<div><span style="color:var(--gray);">Service Type:</span> <strong>' + (b.serviceType || '-') + '</strong></div>'
            + '<div><span style="color:var(--gray);">Backdown Date:</span> <strong>' + (b.backdownDate ? APP.formatDate(b.backdownDate) : '-') + '</strong></div>'
            + (b.warrantyInfo ? '<div><span style="color:var(--gray);">Warranty:</span> <strong>' + b.warrantyInfo + '</strong></div>' : '')
            + (b.servicePeriod ? '<div><span style="color:var(--gray);">Service Period:</span> <strong>' + b.servicePeriod + '</strong></div>' : '')
            + (b.lastServiceDate ? '<div><span style="color:var(--gray);">Last Service:</span> <strong>' + APP.formatDate(b.lastServiceDate) + '</strong></div>' : '')
            + (b.nextServiceDue ? '<div><span style="color:var(--gray);">Next Service Due:</span> <strong>' + APP.formatDate(b.nextServiceDue) + '</strong></div>' : '')
            + (b.reason ? '<div style="grid-column:1/-1;"><span style="color:var(--gray);">Reason:</span> ' + b.reason + '</div>' : '')
            + (b.notes ? '<div style="grid-column:1/-1;"><span style="color:var(--gray);">Notes:</span> ' + b.notes + '</div>' : '')
            + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-top:6px;">👤 ' + (b.createdByName || b.createdBy || '-') + ' · ' + APP.formatDate(b.createdAt) + '</div>'
            + '</div>'
            + '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">'
            + '<button class="btn btn-sm btn-outline" style="font-size:11px;color:var(--danger);border-color:var(--danger);" onclick="hodBackdownDelete(\'' + b.id + '\')">🗑 Delete</button>'
            + '</div></div></div>';
    }

    var html = ''
        + '<div style="background:linear-gradient(135deg,#6a1b9a,#4a148c);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
        + '<div><div style="font-size:18px;font-weight:700;">📉 Equipment Backdown Records — ' + dept + '</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + all.length + ' total backdown(s)</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodBackdownAdd()">+ Record Backdown</button>'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodDownloadBackdownReport()">📥 Report</button>'
        + '</div></div>'

        // KPI cards
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:700;color:#6a1b9a;">' + all.length + '</div><div style="font-size:11px;color:var(--gray);">Total Backdowns</div></div>'
        + '</div>';

    if (all.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">📉</div>'
            + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No backdown records yet</div>'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Backdown equipment from the Equipment Service tab or use the button above.</div>'
            + '<button class="btn btn-primary" onclick="hodBackdownAdd()">+ Record Backdown</button></div>';
        el.innerHTML = html;
        return;
    }

    // Sort by backdown date desc
    all.slice().sort(function(a,b){ return (b.backdownDate||'').localeCompare(a.backdownDate||''); }).forEach(function(b){
        html += backdownCard(b);
    });

    el.innerHTML = html;
}

function hodBackdownFromService(serviceId) {
    var svc = DB.getById('hodEquipmentServices', serviceId);
    if (!svc) { APP.notify('Equipment service record not found', 'error'); return; }
    var today = new Date().toISOString().slice(0,10);
    var form = '<form id="hodBackdownForm">'
        + '<div class="form-group"><label>Asset Code *</label><input type="text" name="assetCode" class="form-control" required value="' + (svc.assetCode||'') + '"></div>'
        + '<div class="form-group"><label>Asset Name *</label><input type="text" name="assetName" class="form-control" required value="' + (svc.assetName||'') + '"></div>'
        + '<div class="form-group"><label>Service Type</label><input type="text" name="serviceType" class="form-control" readonly style="background:var(--light-gray);" value="' + (svc.serviceType||'') + '"></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Last Service Date</label><input type="text" name="lastServiceDate" class="form-control" readonly style="background:var(--light-gray);" value="' + (svc.lastServiceDate||'') + '"></div>'
        + '<div class="form-group"><label>Next Service Due</label><input type="text" name="nextServiceDue" class="form-control" readonly style="background:var(--light-gray);" value="' + (svc.nextServiceDue||'') + '"></div>'
        + '</div>'
        + '<hr style="margin:12px 0;border-color:var(--border);">'
        + '<div class="form-group"><label>Backdown Date *</label><input type="date" name="backdownDate" class="form-control" required value="' + today + '"></div>'
        + '<div class="form-group"><label>Warranty Info</label><input type="text" name="warrantyInfo" class="form-control" placeholder="e.g. Warranty valid until 2028-01-01"></div>'
        + '<div class="form-group"><label>Service Period</label><input type="text" name="servicePeriod" class="form-control" placeholder="e.g. Jan 2023 - Jun 2026"></div>'
        + '<div class="form-group"><label>Reason for Backdown *</label>'
        + '<select name="reason" class="form-control" required>'
        + '<option value="">Select reason...</option>'
        + '<option value="End of life">End of life</option>'
        + '<option value="Upgraded / Replaced">Upgraded / Replaced</option>'
        + '<option value="Damaged / Beyond repair">Damaged / Beyond repair</option>'
        + '<option value="No longer needed">No longer needed</option>'
        + '<option value="Transferred to another department">Transferred to another department</option>'
        + '<option value="Lost / Stolen">Lost / Stolen</option>'
        + '<option value="other">Other</option>'
        + '</select></div>'
        + '<div class="form-group"><label>Additional Notes</label><textarea name="notes" class="form-control" rows="2" placeholder="Any additional details"></textarea></div>'
        + '<input type="hidden" name="serviceId" value="' + serviceId + '">'
        + '</form>';
    openFormModal('⬇ Backdown Equipment — ' + svc.assetName, form, 'hodBackdownSave()', false);
}

function hodBackdownAdd() {
    var today = new Date().toISOString().slice(0,10);
    var form = '<form id="hodBackdownForm">'
        + '<div class="form-group"><label>Asset Code *</label><input type="text" name="assetCode" class="form-control" required placeholder="e.g. EQ-001"></div>'
        + '<div class="form-group"><label>Asset Name *</label><input type="text" name="assetName" class="form-control" required placeholder="e.g. MRI Machine"></div>'
        + '<div class="form-group"><label>Service Type</label>'
        + '<select name="serviceType" class="form-control">'
        + '<option value="">N/A</option>'
        + '<option value="weekly">Weekly</option>'
        + '<option value="monthly">Monthly</option>'
        + '<option value="quarterly">Quarterly</option>'
        + '<option value="yearly">Yearly</option>'
        + '<option value="custom">Custom</option>'
        + '</select></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Last Service Date</label><input type="date" name="lastServiceDate" class="form-control"></div>'
        + '<div class="form-group"><label>Next Service Due</label><input type="date" name="nextServiceDue" class="form-control"></div>'
        + '</div>'
        + '<hr style="margin:12px 0;border-color:var(--border);">'
        + '<div class="form-group"><label>Backdown Date *</label><input type="date" name="backdownDate" class="form-control" required value="' + today + '"></div>'
        + '<div class="form-group"><label>Warranty Info</label><input type="text" name="warrantyInfo" class="form-control" placeholder="e.g. Warranty valid until 2028-01-01"></div>'
        + '<div class="form-group"><label>Service Period</label><input type="text" name="servicePeriod" class="form-control" placeholder="e.g. Jan 2023 - Jun 2026"></div>'
        + '<div class="form-group"><label>Reason for Backdown *</label>'
        + '<select name="reason" class="form-control" required>'
        + '<option value="">Select reason...</option>'
        + '<option value="End of life">End of life</option>'
        + '<option value="Upgraded / Replaced">Upgraded / Replaced</option>'
        + '<option value="Damaged / Beyond repair">Damaged / Beyond repair</option>'
        + '<option value="No longer needed">No longer needed</option>'
        + '<option value="Transferred to another department">Transferred to another department</option>'
        + '<option value="Lost / Stolen">Lost / Stolen</option>'
        + '<option value="other">Other</option>'
        + '</select></div>'
        + '<div class="form-group"><label>Additional Notes</label><textarea name="notes" class="form-control" rows="2" placeholder="Any additional details"></textarea></div>'
        + '<input type="hidden" name="serviceId" value="">'
        + '</form>';
    openFormModal('📉 Record Equipment Backdown', form, 'hodBackdownSave()', false);
}

function hodBackdownSave() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('hodBackdownForm');
    if (!data.assetCode || !data.assetName || !data.backdownDate || !data.reason) {
        APP.notify('Fill all required fields', 'error'); return false;
    }
    DB.add('hodEquipmentBackdowns', {
        assetCode: data.assetCode,
        assetName: data.assetName,
        serviceType: data.serviceType || '',
        lastServiceDate: data.lastServiceDate || '',
        nextServiceDue: data.nextServiceDue || '',
        backdownDate: data.backdownDate,
        warrantyInfo: data.warrantyInfo || '',
        servicePeriod: data.servicePeriod || '',
        reason: data.reason === 'other' ? (data.notes || 'Other') : data.reason,
        notes: data.reason === 'other' ? (data.notes || '') : (data.notes || ''),
        serviceId: data.serviceId || '',
        status: 'backdown',
        department: user.department,
        createdBy: user.username,
        createdByName: user.fullName,
        createdAt: new Date().toISOString()
    });
    // Update the linked equipment service status to 'backdown'
    if (data.serviceId) {
        DB.update('hodEquipmentServices', data.serviceId, { status: 'backdown' });
    }
    APP.notify('Backdown record saved!', 'success');
    _renderHodTab('equipbackdown');
    return true;
}

function hodBackdownDelete(id) {
    confirmAction('Delete this backdown record?', function(){
        DB.delete('hodEquipmentBackdowns', id);
        APP.notify('Backdown record deleted', 'success');
        _renderHodTab('equipbackdown');
    });
}

function hodDownloadServiceReport() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department || '';
    if (HOD_SERVICE_DEPTS.indexOf(dept) === -1) return;
    var all = DB.get('hodEquipmentServices') || [];
    var wb = XLSX.utils.book_new();
    var dashData = [
        ['Equipment Service Report'],
        ['Department', dept],
        ['Generated', new Date().toLocaleString('en-IN')],
        [],
        ['Metric', 'Value'],
        ['Total Equipment', all.length],
        ['Overdue', all.filter(function(e){return e.status!=='done'&&e.status!=='backdown'&&e.nextServiceDue&&new Date(e.nextServiceDue)<new Date();}).length],
        ['Upcoming', all.filter(function(e){return e.status!=='done'&&e.status!=='backdown'&&e.nextServiceDue&&new Date(e.nextServiceDue)>=new Date();}).length],
        ['Completed', all.filter(function(e){return e.status==='done';}).length],
        ['Backdown', all.filter(function(e){return e.status==='backdown';}).length]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashData), 'Dashboard');
    var headers = ['Asset Code','Asset Name','Service Type','Last Service Date','Next Service Due','Status','Notes','Created By','Created At'];
    var rows = all.map(function(e){
        return [e.assetCode||'', e.assetName||'', e.serviceType||'', e.lastServiceDate||'', e.nextServiceDue||'', e.status||'', e.notes||'', e.createdByName||'', e.createdAt?APP.formatDate(e.createdAt):''];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers].concat(rows)), 'All Records');
    XLSX.writeFile(wb, 'Equipment_Service_Report_' + dept + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
    APP.notify('Equipment Service Report downloaded!', 'success');
}

function hodDownloadBackdownReport() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department || '';
    if (HOD_BACKDOWN_DEPTS.indexOf(dept) === -1) return;
    var all = DB.get('hodEquipmentBackdowns') || [];
    var wb = XLSX.utils.book_new();
    var dashData = [
        ['Equipment Backdown Report'],
        ['Department', dept],
        ['Generated', new Date().toLocaleString('en-IN')],
        [],
        ['Metric', 'Value'],
        ['Total Backdowns', all.length]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashData), 'Dashboard');
    var headers = ['Asset Code','Asset Name','Service Type','Backdown Date','Reason','Warranty Info','Service Period','Last Service','Next Service Due','Notes','Created By','Created At'];
    var rows = all.map(function(b){
        return [b.assetCode||'', b.assetName||'', b.serviceType||'', b.backdownDate||'', b.reason||'', b.warrantyInfo||'', b.servicePeriod||'', b.lastServiceDate||'', b.nextServiceDue||'', b.notes||'', b.createdByName||'', b.createdAt?APP.formatDate(b.createdAt):''];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers].concat(rows)), 'All Backdowns');
    XLSX.writeFile(wb, 'Equipment_Backdown_Report_' + dept + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
    APP.notify('Equipment Backdown Report downloaded!', 'success');
}

/* ═══════════════════════════════════════════════
   HOD TODO TAB — HOD's own personal work tasks
═══════════════════════════════════════════════ */
function _hodTodo(el) {
    var user = AUTH.currentUser();
    if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var todos = (DB.get('hodTodos') || []).filter(function (t) { return t.createdBy === user.username; });
    var today = new Date().toISOString().slice(0, 10);

    var dailyTodos = todos.filter(function (t) { return t.category === 'daily' || t.date === today; });
    var futureTodos = todos.filter(function (t) { return t.category === 'future' && t.date !== today; });
    var pendingDaily = dailyTodos.filter(function (t) { return t.status !== 'completed'; });
    var completedDaily = dailyTodos.filter(function (t) { return t.status === 'completed'; });
    var pendingFuture = futureTodos.filter(function (t) { return t.status !== 'completed'; });

    function todoCard(t, isFuture) {
        var priColor = { low: 'var(--secondary)', medium: '#e65100', high: 'var(--danger)' }[t.priority] || 'var(--gray)';
        var checked = t.status === 'completed' ? 'checked' : '';
        var opacity = t.status === 'completed' ? 'opacity:0.55;' : '';
        var dueLabel = isFuture ? '<span style="font-size:10px;color:var(--gray);margin-left:6px;">📅 ' + APP.formatDate(t.date) + '</span>' : '';
        var remLabel = t.reminder ? '<span style="font-size:10px;color:var(--primary);margin-left:4px;">🔔 ' + t.reminderMinutes + 'min</span>' : '';
        var descHtml = t.description ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + t.description.substring(0, 100) + '</div>' : '';
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:4px;' + opacity + '">'
            + '<input type="checkbox" ' + checked + ' onchange="hodToggleTodo(\'' + t.id + '\')" style="margin-top:3px;cursor:pointer;width:16px;height:16px;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">'
            + '<span style="font-size:13px;font-weight:' + (t.status === 'completed' ? '400' : '600') + ';' + (t.status === 'completed' ? 'text-decoration:line-through;' : '') + '">' + t.title + '</span>'
            + '<span style="width:8px;height:8px;border-radius:50%;background:' + priColor + ';display:inline-block;"></span>'
            + dueLabel + remLabel
            + '</div>' + descHtml
            + '</div>'
            + '<button class="btn btn-sm" style="background:transparent;color:var(--danger);padding:2px 8px;font-size:14px;" onclick="hodDeleteTodo(\'' + t.id + '\')" title="Delete">✕</button>'
            + '</div>';
    }

    var html = '';

    // ── Header ──
    html += '<div style="background:linear-gradient(135deg,#ad1457,#e91e63);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
        + '<div><div style="font-size:18px;font-weight:700;">📋 HOD TODO — ' + (user.fullName || user.username) + '</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + todos.length + ' total · ' + pendingDaily.length + ' pending today</div></div>'
        + '<div style="display:flex;gap:6px;"><span class="badge badge-danger" style="font-size:11px;padding:6px 12px;">' + pendingDaily.length + ' due today</span></div></div>';

    // ── Daily TODO section ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
        + '<div style="font-weight:700;font-size:15px;">📌 Today — ' + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>'
        + '<span style="font-size:11px;color:var(--gray);">' + pendingDaily.length + ' pending</span>'
        + '</div>'
        // Quick add
        + '<div style="display:flex;gap:6px;margin-bottom:12px;">'
        + '<input type="text" id="hodTodoInput" placeholder="Add a task for today…" style="flex:1;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;outline:none;" onkeydown="if(event.key===\'Enter\')hodAddTodo()">'
        + '<button class="btn btn-sm" style="background:#e91e63;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;" onclick="hodAddTodo()">+ Add</button>'
        + '</div>';

    if (pendingDaily.length === 0 && completedDaily.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:20px;">Nothing for today yet. Add a task above!</div>';
    } else {
        pendingDaily.forEach(function (t) { html += todoCard(t, false); });
        if (completedDaily.length > 0) {
            html += '<div style="margin-top:10px;font-size:11px;color:var(--gray);cursor:pointer;" onclick="var n=this.nextElementSibling;n.style.display=n.style.display===\'none\'?\'block\':\'none\'">▼ ' + completedDaily.length + ' completed</div>'
                + '<div style="display:none;margin-top:4px;">';
            completedDaily.forEach(function (t) { html += todoCard(t, false); });
            html += '</div>';
        }
    }
    html += '</div>';

    // ── Future TODO section ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">📅 Future Tasks (' + pendingFuture.length + ')</div>'
        // Add form
        + '<div style="background:var(--light-gray);border-radius:8px;padding:12px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
        + '<input type="text" id="hodFutureTodoTitle" placeholder="Task title…" style="grid-column:1/-1;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;outline:none;">'
        + '<textarea id="hodFutureTodoDesc" placeholder="Description (optional)…" style="grid-column:1/-1;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;outline:none;resize:vertical;min-height:50px;"></textarea>'
        + '<div><label style="font-size:11px;color:var(--gray);display:block;margin-bottom:2px;">Due Date</label><input type="date" id="hodFutureTodoDate" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;"></div>'
        + '<div><label style="font-size:11px;color:var(--gray);display:block;margin-bottom:2px;">Priority</label><select id="hodFutureTodoPriority" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;">'
        + '<option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>'
        + '<div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="hodFutureTodoReminder" style="cursor:pointer;"> <label for="hodFutureTodoReminder" style="font-size:12px;cursor:pointer;">Set reminder</label></div>'
        + '<div><select id="hodFutureTodoReminderMin" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;">'
        + '<option value="15">15 min before</option><option value="30" selected>30 min before</option><option value="60">1 hr before</option><option value="1440">1 day before</option></select></div>'
        + '<button class="btn btn-sm" style="grid-column:1/-1;background:#e91e63;color:#fff;padding:8px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;" onclick="hodSaveFutureTodo()">+ Add Future Task</button>'
        + '</div>';

    if (pendingFuture.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:16px;">No future tasks planned.</div>';
    } else {
        var dateGroups = {};
        pendingFuture.concat(futureTodos.filter(function (t) { return t.status === 'completed'; })).forEach(function (t) {
            var g = t.date || 'unscheduled';
            if (!dateGroups[g]) dateGroups[g] = { label: g, items: [] };
            dateGroups[g].items.push(t);
        });
        Object.keys(dateGroups).sort().forEach(function (d) {
            if (d === 'unscheduled') return;
            var grp = dateGroups[d];
            var grpDone = grp.items.filter(function (t) { return t.status === 'completed'; }).length;
            html += '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;">📅 ' + APP.formatDate(d) + ' (' + grpDone + '/' + grp.items.length + ' done)</div>';
            grp.items.forEach(function (t) { html += todoCard(t, true); });
            html += '</div>';
        });
    }
    html += '</div>';

    el.innerHTML = html;
}

function hodAddTodo() {
    var inp = document.getElementById('hodTodoInput');
    if (!inp) return;
    var title = inp.value.trim();
    if (!title) { APP.notify('Enter a task title', 'error'); return; }
    var user = AUTH.currentUser();
    if (!user) return;
    var today = new Date().toISOString().slice(0, 10);
    DB.add('hodTodos', {
        title: title,
        description: '',
        date: today,
        dueDate: today,
        priority: 'medium',
        status: 'pending',
        category: 'daily',
        reminder: false,
        reminderMinutes: 0,
        createdBy: user.username,
        createdByName: user.fullName,
        department: user.department,
        completedAt: null,
        sortOrder: Date.now()
    });
    inp.value = '';
    APP.notify('TODO added ✓', 'success');
    var el = document.getElementById('hodTabContent');
    if (el) _hodTodo(el);
}

function hodToggleTodo(id) {
    var todo = DB.getById('hodTodos', id);
    if (!todo) return;
    var newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    var updates = { status: newStatus };
    if (newStatus === 'completed') updates.completedAt = new Date().toISOString();
    else updates.completedAt = null;
    DB.update('hodTodos', id, updates);
    APP.notify(newStatus === 'completed' ? '✓ Marked done' : 'Reopened', newStatus === 'completed' ? 'success' : 'info');
    var el = document.getElementById('hodTabContent');
    if (el) _hodTodo(el);
}

function hodDeleteTodo(id) {
    if (!confirm('Delete this TODO?')) return;
    DB.delete('hodTodos', id);
    APP.notify('Deleted', 'info');
    var el = document.getElementById('hodTabContent');
    if (el) _hodTodo(el);
}

function hodSaveFutureTodo() {
    var user = AUTH.currentUser();
    if (!user) return;
    var title = (document.getElementById('hodFutureTodoTitle') || {}).value || '';
    var desc = (document.getElementById('hodFutureTodoDesc') || {}).value || '';
    var date = (document.getElementById('hodFutureTodoDate') || {}).value || '';
    var priority = (document.getElementById('hodFutureTodoPriority') || {}).value || 'medium';
    var reminder = (document.getElementById('hodFutureTodoReminder') || {}).checked || false;
    var reminderMin = parseInt((document.getElementById('hodFutureTodoReminderMin') || {}).value) || 30;
    if (!title.trim()) { APP.notify('Enter a title', 'error'); return; }
    if (!date) { APP.notify('Select a due date', 'error'); return; }
    DB.add('hodTodos', {
        title: title.trim(),
        description: desc.trim(),
        date: date,
        dueDate: date,
        priority: priority,
        status: 'pending',
        category: 'future',
        reminder: reminder,
        reminderMinutes: reminderMin,
        createdBy: user.username,
        createdByName: user.fullName,
        department: user.department,
        completedAt: null,
        sortOrder: Date.now()
    });
    APP.notify('Future task saved ✓', 'success');
    var el = document.getElementById('hodTabContent');
    if (el) _hodTodo(el);
}

/* ═══════════════════════════════════════════════
   HOD WORK REPORT TAB — HOD + Team KPI dashboard
═══════════════════════════════════════════════ */
function _hodWorkReport(el) {
    var user = AUTH.currentUser();
    if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }

    var d = _hodData;

    // ── HOD's own TODO data ──
    var hodTodos = (DB.get('hodTodos') || []).filter(function (t) { return t.createdBy === user.username; });
    var hodTodoDone = hodTodos.filter(function (t) { return t.status === 'completed'; }).length;
    var hodTodoPend = hodTodos.filter(function (t) { return t.status !== 'completed'; }).length;
    var hodTodoRate = hodTodos.length > 0 ? Math.round(hodTodoDone / hodTodos.length * 100) : 0;

    // ── Team task data ──
    var teamTasks = d.allDeptTasks || [];
    var teamDone = teamTasks.filter(function (t) { return t.status === 'completed'; }).length;
    var teamPend = teamTasks.filter(function (t) { return t.status === 'pending'; }).length;
    var teamProg = teamTasks.filter(function (t) { return t.status === 'in-progress'; }).length;
    var teamOverdue = d.overdueTasks || [];
    var teamRate = teamTasks.length > 0 ? Math.round(teamDone / teamTasks.length * 100) : 0;

    // ── Combined ──
    var combinedTotal = hodTodos.length + teamTasks.length;
    var combinedDone = hodTodoDone + teamDone;
    var combinedRate = combinedTotal > 0 ? Math.round(combinedDone / combinedTotal * 100) : 0;

    // ── Per-member breakdown ──
    var team = d.team || [];
    var memberRows = team.map(function (m) {
        var mt = teamTasks.filter(function (t) { return t.assignedTo === m.fullName; });
        var mtDone = mt.filter(function (t) { return t.status === 'completed'; }).length;
        var mtPend = mt.filter(function (t) { return t.status === 'pending'; }).length;
        var mtProg = mt.filter(function (t) { return t.status === 'in-progress'; }).length;
        var mtOvd = mt.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
        var mtRate = mt.length > 0 ? Math.round(mtDone / mt.length * 100) : 0;
        return { name: m.fullName, total: mt.length, done: mtDone, pend: mtPend, prog: mtProg, overdue: mtOvd, rate: mtRate };
    });

    // CSS for charts canvas
    var s = document.getElementById('hodWorkReportCss');
    if (!s) {
        s = document.createElement('style');
        s.id = 'hodWorkReportCss';
        s.textContent = '#hodWorkReportTab .wr-canvas-wrap{position:relative;width:100%;max-height:200px;}';
        document.head.appendChild(s);
    }

    function kBox(val, label, color) {
        return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">'
            + '<div style="font-size:22px;font-weight:700;color:' + color + ';">' + val + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + label + '</div></div>';
    }

    var html = '';

    // ── Header ──
    html += '<div id="hodWorkReportTab" style="min-height:200px;">'
        + '<div style="background:linear-gradient(135deg,#283593,#1565c0);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
        + '<div><div style="font-size:18px;font-weight:700;">📊 Work Report — ' + (user.department || 'All') + '</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + combinedTotal + ' total items · ' + combinedDone + ' done (' + combinedRate + '%)</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodDownloadWorkReportPdf()">📄 PDF</button>'
        + '<button class="btn btn-sm" style="background:#1a237e;color:#fff;border:none;padding:6px 14px;font-size:12px;" onclick="hodDownloadMasterReport()">📊 Master Report</button>'
        + '<span class="badge badge-success" style="font-size:11px;padding:6px 12px;">✓ ' + combinedDone + ' done</span>'
        + '<span class="badge badge-danger" style="font-size:11px;padding:6px 12px;">⚠ ' + teamOverdue.length + ' overdue</span>'
        + '</div></div>';

    // ── KPI cards ──
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + kBox(combinedTotal, 'Total Work Items', 'var(--text)')
        + kBox(combinedDone, 'Completed', 'var(--success)')
        + kBox(combinedRate + '%', 'Overall Rate', combinedRate >= 80 ? 'var(--success)' : combinedRate >= 50 ? '#e65100' : 'var(--danger)')
        + kBox(teamTasks.length, 'Team Tasks', '#1565c0')
        + kBox(hodTodos.length, 'HOD TODOs', '#e91e63')
        + kBox(teamOverdue.length, 'Overdue Tasks', 'var(--danger)')
        + '</div>';

    // ── HOD's own TODO card ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid #e91e63;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-size:15px;font-weight:700;">👤 HOD Work Summary — ' + (user.fullName || user.username) + '</div>'
        + '<span class="badge badge-info" style="font-size:10px;">' + hodTodoRate + '% completion</span></div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">'
        + kBox(hodTodos.length, 'Total TODOs', '#e91e63')
        + kBox(hodTodoDone, 'Done', 'var(--success)')
        + kBox(hodTodoPend, 'Pending', '#e65100')
        + kBox(hodTodoRate + '%', 'Completion Rate', hodTodoRate >= 80 ? 'var(--success)' : hodTodoRate >= 50 ? '#e65100' : 'var(--danger)')
        + '</div>'
        + '<div style="margin-top:10px;"><div class="hq-bar" style="height:10px;"><div class="hq-fill" style="width:' + hodTodoRate + '%;background:' + (hodTodoRate >= 80 ? 'var(--success)' : hodTodoRate >= 50 ? '#e65100' : 'var(--danger)') + ';"></div></div></div>'
        + '</div>';

    // ── Team work summary card ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid #1565c0;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-size:15px;font-weight:700;">👥 Team Work Summary — ' + (user.department || '') + '</div>'
        + '<span class="badge badge-info" style="font-size:10px;">' + teamRate + '% completion</span></div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">'
        + kBox(teamTasks.length, 'Total Tasks', '#1565c0')
        + kBox(teamDone, 'Completed', 'var(--success)')
        + kBox(teamPend, 'Pending', '#e65100')
        + kBox(teamProg, 'In Progress', '#ff6f00')
        + kBox(teamOverdue.length, 'Overdue', 'var(--danger)')
        + kBox(teamRate + '%', 'Completion Rate', teamRate >= 80 ? 'var(--success)' : teamRate >= 50 ? '#e65100' : 'var(--danger)')
        + '</div>'
        + '<div style="margin-top:10px;"><div class="hq-bar" style="height:10px;"><div class="hq-fill" style="width:' + teamRate + '%;background:' + (teamRate >= 80 ? 'var(--success)' : teamRate >= 50 ? '#e65100' : 'var(--danger)') + ';"></div></div></div>'
        + '</div>';

    // ── Combined progress bar ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">'
        + '<div style="font-size:15px;font-weight:700;margin-bottom:8px;">📊 Overall Progress</div>'
        + '<div style="display:flex;align-items:center;gap:12px;">'
        + '<div class="hq-bar" style="flex:1;height:14px;"><div class="hq-fill" style="width:' + combinedRate + '%;background:' + (combinedRate >= 80 ? 'var(--success)' : combinedRate >= 50 ? '#e65100' : 'var(--danger)') + ';"></div></div>'
        + '<span style="font-size:16px;font-weight:700;color:' + (combinedRate >= 80 ? 'var(--success)' : combinedRate >= 50 ? '#e65100' : 'var(--danger)') + ';min-width:50px;">' + combinedRate + '%</span>'
        + '</div>'
        + '<div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--gray);">'
        + '<span>📋 HOD TODO: ' + hodTodoDone + '/' + hodTodos.length + ' (' + hodTodoRate + '%)</span>'
        + '<span>👥 Team: ' + teamDone + '/' + teamTasks.length + ' (' + teamRate + '%)</span>'
        + '</div></div>';

    // ── Charts row ──
    html += '<div class="grid-2" style="gap:16px;margin-bottom:16px;">'
        + '<div class="card"><div class="card-header"><h3>📊 Task Status Distribution</h3></div><div style="padding:8px;"><canvas id="hodWrStatusChart" height="200"></canvas></div></div>'
        + '<div class="card"><div class="card-header"><h3>📊 Per-Member Completion</h3></div><div style="padding:8px;"><canvas id="hodWrMemberChart" height="200"></canvas></div></div>'
        + '</div>';

    // ── Per-member breakdown table ──
    if (memberRows.length > 0) {
        html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>👥 Per-Member Task Breakdown</h3></div>'
            + '<div class="table-responsive"><table><thead><tr><th>Member</th><th>Total</th><th>Done</th><th>Pending</th><th>In Progress</th><th>Overdue</th><th>Rate</th></tr></thead><tbody>'
            + memberRows.map(function (m) {
                return '<tr>'
                    + '<td><strong>' + m.name + '</strong></td>'
                    + '<td>' + m.total + '</td>'
                    + '<td style="color:var(--success);font-weight:600;">' + m.done + '</td>'
                    + '<td>' + m.pend + '</td>'
                    + '<td>' + m.prog + '</td>'
                    + '<td style="color:' + (m.overdue > 0 ? 'var(--danger)' : 'var(--gray)') + ';">' + m.overdue + '</td>'
                    + '<td><div style="display:flex;align-items:center;gap:6px;"><div class="hq-bar" style="width:50px;"><div class="hq-fill" style="width:' + m.rate + '%;background:' + (m.rate >= 80 ? 'var(--success)' : m.rate >= 50 ? '#e65100' : 'var(--danger)') + ';"></div></div><span style="font-size:11px;">' + m.rate + '%</span></div></td>'
                    + '</tr>';
            }).join('')
            + '<tr style="background:#e8eaf6;font-weight:700;"><td>HOD (You)</td><td>' + hodTodos.length + '</td><td style="color:var(--success);">' + hodTodoDone + '</td><td>' + hodTodoPend + '</td><td>0</td><td>0</td><td><div style="display:flex;align-items:center;gap:6px;"><div class="hq-bar" style="width:50px;"><div class="hq-fill" style="width:' + hodTodoRate + '%;background:' + (hodTodoRate >= 80 ? 'var(--success)' : hodTodoRate >= 50 ? '#e65100' : 'var(--danger)') + ';"></div></div><span style="font-size:11px;">' + hodTodoRate + '%</span></div></td></tr>'
            + '</tbody></table></div></div>';
    }

    html += '</div>';

    el.innerHTML = html;

    // ── Render charts ──
    setTimeout(function () {
        if (typeof Chart === 'undefined') return;

        // Status distribution doughnut
        var statusCanvas = document.getElementById('hodWrStatusChart');
        if (statusCanvas) {
            var ctx = statusCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Done', 'In Progress', 'Pending', 'Overdue'],
                    datasets: [{
                        data: [combinedDone, teamProg, (combinedTotal - combinedDone - teamProg), teamOverdue.length],
                        backgroundColor: ['#2e7d32', '#ff8f00', '#ffa000', '#c62828'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } }
                    }
                }
            });
        }

        // Per-member completion bar chart
        var memberCanvas = document.getElementById('hodWrMemberChart');
        if (memberCanvas && memberRows.length > 0) {
            var labels = memberRows.map(function (m) { return m.name.split(' ')[0]; });
            var doneData = memberRows.map(function (m) { return m.done; });
            var pendData = memberRows.map(function (m) { return m.pend; });
            var ctx2 = memberCanvas.getContext('2d');
            new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Done', data: doneData, backgroundColor: '#2e7d32', borderRadius: 3 },
                        { label: 'Pending', data: pendData, backgroundColor: '#ffa000', borderRadius: 3 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 } } },
                        y: { stacked: true, beginAtZero: true, grid: { display: false } }
                    },
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } }
                }
            });
        }
    }, 150);
}

function hodDownloadWorkReportPdf() {
    if (typeof window.jspdf === 'undefined') { APP.notify('PDF library not loaded', 'error'); return; }
    var user = AUTH.currentUser();
    if (!user) return;
    var d = _hodData;
    if (!d) { APP.notify('Data not loaded', 'error'); return; }

    var hodTodos = (DB.get('hodTodos') || []).filter(function (t) { return t.createdBy === user.username; });
    var hodTodoDone = hodTodos.filter(function (t) { return t.status === 'completed'; }).length;
    var hodTodoPend = hodTodos.filter(function (t) { return t.status !== 'completed'; }).length;
    var hodTodoRate = hodTodos.length > 0 ? Math.round(hodTodoDone / hodTodos.length * 100) : 0;

    var teamTasks = d.allDeptTasks || [];
    var teamDone = teamTasks.filter(function (t) { return t.status === 'completed'; }).length;
    var teamPend = teamTasks.filter(function (t) { return t.status === 'pending'; }).length;
    var teamProg = teamTasks.filter(function (t) { return t.status === 'in-progress'; }).length;
    var teamOverdue = (d.overdueTasks || []).length;
    var teamRate = teamTasks.length > 0 ? Math.round(teamDone / teamTasks.length * 100) : 0;

    var combinedTotal = hodTodos.length + teamTasks.length;
    var combinedDone = hodTodoDone + teamDone;
    var combinedRate = combinedTotal > 0 ? Math.round(combinedDone / combinedTotal * 100) : 0;

    var team = d.team || [];
    var today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    var doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var margin = 14;
    var y = 15;

    // ── Page 1: Title + Summary + Charts ──

    // Title
    doc.setFontSize(16);
    doc.setTextColor(40, 53, 147);
    doc.text('Work Report — ' + (user.department || 'All'), margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('HOD: ' + (user.fullName || user.username) + '   Generated: ' + today, margin, y);
    y += 12;

    // Summary stats
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text('Total Items: ' + combinedTotal + '   Completed: ' + combinedDone + '   Rate: ' + combinedRate + '%', margin, y);
    y += 6;
    doc.text('HOD TODOs: ' + hodTodos.length + ' (' + hodTodoDone + ' done, ' + hodTodoPend + ' pending, ' + hodTodoRate + '%)', margin, y);
    y += 6;
    doc.text('Team Tasks: ' + teamTasks.length + ' (' + teamDone + ' done, ' + teamPend + ' pending, ' + teamProg + ' in-progress, ' + teamOverdue + ' overdue, ' + teamRate + '%)', margin, y);
    y += 10;

    // Separator line
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Progress bar (drawn using rect)
    var barW = pageW - margin * 2;
    var barH = 14;
    var fillW = (combinedRate / 100) * barW;
    doc.setDrawColor(200);
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin, y, barW, barH, 3, 3, 'F');
    doc.setFillColor(combinedRate >= 80 ? 52 : combinedRate >= 50 ? 251 : 234, combinedRate >= 80 ? 168 : combinedRate >= 50 ? 188 : 67, combinedRate >= 80 ? 83 : combinedRate >= 50 ? 4 : 53);
    doc.roundedRect(margin, y, fillW, barH, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255);
    doc.text(combinedRate + '%', margin + 4, y + 10);
    y += barH + 6;

    // Stats bars for HOD TODO + Team
    doc.setFontSize(8);
    var stats = [
        { label: 'HOD TODO', rate: hodTodoRate, done: hodTodoDone, total: hodTodos.length },
        { label: 'Team Tasks', rate: teamRate, done: teamDone, total: teamTasks.length }
    ];
    stats.forEach(function (s) {
        var sw = barW * (s.rate / 100);
        doc.setDrawColor(200);
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(margin, y, barW, 8, 2, 2, 'F');
        doc.setFillColor(s.label === 'HOD TODO' ? 233 : 21, s.label === 'HOD TODO' ? 30 : 101, s.label === 'HOD TODO' ? 99 : 192);
        doc.roundedRect(margin, y, sw, 8, 2, 2, 'F');
        doc.setTextColor(60);
        doc.text(s.label + ': ' + s.done + '/' + s.total + ' (' + s.rate + '%)', margin + barW + 4, y + 6);
        y += 12;
    });
    y += 4;

    // Capture charts from the DOM
    var statusCanvas = document.getElementById('hodWrStatusChart');
    var memberCanvas = document.getElementById('hodWrMemberChart');
    var chartImgW = (pageW - margin * 2 - 8) / 2;
    var chartImgH = 55;

    function _addChartToDoc(canvas, x, yPos, w, h) {
        if (!canvas) return;
        try {
            var dataUrl = canvas.toDataURL('image/png');
            doc.addImage(dataUrl, 'PNG', x, yPos, w, h);
        } catch(e) { /* skip if canvas fails */ }
    }

    // Check if charts fit on current page, add page if needed
    if (y + 60 > pageH) { doc.addPage(); y = margin; }

    if (statusCanvas || memberCanvas) {
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(margin, y, chartImgW + 8, chartImgH + 16, 3, 3, 'F');
        doc.setTextColor(40);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Task Status Distribution', margin + 4, y + 8);
        doc.setFont('helvetica', 'normal');
        _addChartToDoc(statusCanvas, margin + 4, y + 10, chartImgW, chartImgH);

        var x2 = margin + chartImgW + 16;
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(x2, y, chartImgW + 8, chartImgH + 16, 3, 3, 'F');
        doc.setTextColor(40);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Per-Member Completion', x2 + 4, y + 8);
        doc.setFont('helvetica', 'normal');
        _addChartToDoc(memberCanvas, x2 + 4, y + 10, chartImgW, chartImgH);

        y += chartImgH + 24;
    }

    // ── If not enough space for table, new page ──
    if (team.length > 0) {
        var tableStartY = y + 6;
        if (tableStartY + 40 > pageH) { doc.addPage(); tableStartY = margin; }

        var headers = [['Member', 'Total', 'Done', 'Pending', 'In-Progress', 'Overdue', 'Rate']];
        var rows = team.map(function (m) {
            var mt = teamTasks.filter(function (t) { return t.assignedTo === m.fullName; });
            var mtDone = mt.filter(function (t) { return t.status === 'completed'; }).length;
            var mtPend = mt.filter(function (t) { return t.status === 'pending'; }).length;
            var mtProg = mt.filter(function (t) { return t.status === 'in-progress'; }).length;
            var mtOvd = mt.filter(function (t) { return t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'; }).length;
            var mtRate = mt.length > 0 ? Math.round(mtDone / mt.length * 100) : 0;
            return [m.fullName, mt.length, mtDone, mtPend, mtProg, mtOvd, mtRate + '%'];
        });
        rows.push([user.fullName + ' (HOD)', hodTodos.length, hodTodoDone, hodTodoPend, 0, 0, hodTodoRate + '%']);

        doc.autoTable({
            head: headers,
            body: rows,
            startY: tableStartY,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [40, 53, 147], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 240, 248] },
            margin: { left: margin, right: margin }
        });
    }

    doc.save('Work_Report_' + (user.department || 'All').replace(/[^a-z0-9]/gi, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf');
    APP.notify('Work Report PDF downloaded!', 'success');
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
                + '<button class="btn btn-sm" style="background:#1e7e34;color:#fff;padding:4px 8px;white-space:nowrap;" onclick="hodExportEmployeeReport(\'' + (r.createdByName||r.createdBy||'').replace(/'/g,"\\'") + '\')">📊 Employee</button>'
                + '<button class="btn btn-sm" style="background:#6a1b9a;color:#fff;padding:4px 8px;white-space:nowrap;" onclick="hodDownloadReportExcel(\'' + r.id + '\')">📋 Full Excel</button>'
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
        // Per-employee report download
        +'<div class="card" style="padding:18px;border-top:3px solid #e65100;">'
        +'<div style="font-size:15px;font-weight:700;margin-bottom:4px;">👤 Employee Report</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-bottom:14px;">Download detailed report for a team member</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        +'<select id="hodEmpReportSelect" style="flex:1;min-width:140px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;">'
        +'<option value="">— Select employee —</option>'
        + (d.team||[]).map(function(m){ return '<option value="' + m.fullName.replace(/"/g,'&quot;') + '">' + m.fullName + '</option>'; }).join('')
        +'</select>'
        +'<button class="btn btn-sm" style="background:#1e7e34;color:#fff;" onclick="var s=document.getElementById(\'hodEmpReportSelect\');if(s.value)hodExportEmployeeReport(s.value);else APP.notify(\'Select an employee\',\'error\')">📥 Download</button>'
        +'</div></div>'
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

function hodDownloadMasterReport() {
    var d = _hodData;
    if (!d || !d.user) { APP.notify('Data not loaded', 'error'); return; }
    var user = d.user;
    try {
        var wb = XLSX.utils.book_new();
        var nowLabel = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});
        var dept = d.dept || 'All';

        // ── Data ──
        var team = d.team || [];
        var allDeptTasks = d.allDeptTasks || [];
        var hodTodos = (DB.get('hodTodos') || []).filter(function (t) { return t.createdBy === user.username; });
        var hodPurchases = d.deptPurchases || [];
        var inventory = (DB.get('inventory') || []).filter(function (i) {
            return (i.department || '').trim().toLowerCase() === (dept || '').trim().toLowerCase();
        });
        var matReqs = (DB.get('material_requests') || []).filter(function (r) {
            return (r.department || '').trim().toLowerCase() === (dept || '').trim().toLowerCase();
        });
        var problems = d.routedProblems || [];
        var reports = d.teamReports || [];
        var qpAll = DB.get('quarterly_priorities') || [];
        var hodQpAllotted = qpAll.filter(function (q) { return q.memberUsername === user.username && !q.selfOwn; });
        var hodQpOwn = qpAll.filter(function (q) { return q.memberUsername === user.username && q.selfOwn; });
        var empTodosAll = DB.get('employeeTodos') || [];

        // ── Computed KPIs ──
        var tDone = allDeptTasks.filter(function (t){return t.status==='completed';}).length;
        var tTot  = allDeptTasks.length;
        var tOver = d.overdueTasks.length;
        var tOtat = d.overTatTasks.length;
        var tRate = tTot > 0 ? Math.round(tDone/tTot*100) : 0;
        var hDone = hodTodos.filter(function (t){return t.status==='completed';}).length;
        var hTot  = hodTodos.length;
        var hRate = hTot > 0 ? Math.round(hDone/hTot*100) : 0;
        var pDone = problems.filter(function (p){return p.status==='resolved';}).length;
        var pTot  = problems.length;
        var pRate = pTot > 0 ? Math.round(pDone/pTot*100) : 0;
        var invLow = inventory.filter(function (i){return parseFloat(i.quantity) <= 5;}).length;
        var invTot = inventory.length;

        var _bar = function(p){var f=Math.round(p/10);return '█'.repeat(f)+'░'.repeat(10-f)+' '+p+'%';};

        // ══════════ SHEET 1: DASHBOARD ══════════
        var dash = [
            ['MASTER REPORT — ' + dept.toUpperCase() + ' DEPARTMENT'],
            [''],
            ['HOD', user.fullName || user.username],
            ['Department', dept],
            ['Generated', nowLabel],
            ['Team Members', team.length],
            [''],
            ['── DEPARTMENT OVERVIEW ──'],
            [''],
            ['Metric','Value','Details'],
            ['Total Tasks', tTot, tDone + ' done, ' + tOver + ' overdue, ' + tOtat + ' over TAT'],
            ['Task Completion Rate', tRate + '%', _bar(tRate)],
            ['HOD TODOs', hTot, hDone + ' done (' + hRate + '%)'],
            ['Problems / Issues', pTot, pDone + ' resolved (' + pRate + '%)'],
            ['Inventory Items', invTot, invLow + ' low stock'],
            ['Material Requests', matReqs.length, matReqs.filter(function(r){return r.status==='pending';}).length + ' pending'],
            ['Purchase Requests', hodPurchases.length, hodPurchases.filter(function(p){return p.status==='pending';}).length + ' pending'],
            ['Employee Reports', reports.length, 'submitted'],
            ['Q Goals (Allotted)', hodQpAllotted.reduce(function(s,q){return s+(q.items||[]).length;},0), hodQpAllotted.reduce(function(s,q){return s+(q.items||[]).filter(function(i){return i.status==='completed';}).length;},0) + ' done'],
            ['Q Goals (Self)', hodQpOwn.reduce(function(s,q){return s+(q.items||[]).length;},0), hodQpOwn.reduce(function(s,q){return s+(q.items||[]).filter(function(i){return i.status==='completed';}).length;},0) + ' done'],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dash), 'Dashboard');

        // ══════════ SHEET 2: KPI ══════════
        var kpiRows = [
            ['KPI DASHBOARD — ' + dept],
            [''],
            ['Metric','Done','Total','Rate','Progress Bar'],
            ['Task Completion', tDone, tTot, tRate+'%', _bar(tRate)],
            ['HOD TODO Completion', hDone, hTot, hRate+'%', _bar(hRate)],
            ['Problem Resolution', pDone, pTot, pRate+'%', _bar(pRate)],
            ['Inventory Items', invTot - invLow, invTot, invTot>0?Math.round((invTot-invLow)/invTot*100)+'%':'0%', _bar(invTot>0?Math.round((invTot-invLow)/invTot*100):0)],
            ['TAT Compliance', tTot>0?tTot-tOtat:0, tTot, tTot>0?Math.round((tTot-tOtat)/tTot*100)+'%':'0%', _bar(tTot>0?Math.round((tTot-tOtat)/tTot*100):0)],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPI');

        // ══════════ SHEET 3: HOD WORK ══════════
        var hodWRows = [['Section','Title','Status','Priority','Date/Deadline','Details']];
        // HOD tasks assigned to HOD
        var hodOwnTasks = allDeptTasks.filter(function (t){return t.assignedTo === user.fullName || t.assignedTo === user.username;});
        hodOwnTasks.forEach(function(t){
            hodWRows.push(['Task',t.title||'',t.status||'',t.priority||'',t.deadline||'','TAT: '+(t.tat||'-')+'h']);
        });
        hodTodos.forEach(function(t){
            hodWRows.push(['TODO',t.title||'',t.status||'',t.priority||'',t.date||'',(t.reminder?'Reminder: '+t.reminder:'')]);
        });
        hodPurchases.forEach(function(p){
            var approvalLabel = p.approvalType === 'none' ? 'Direct'
                : p.approvalType === 'pre-approved' ? 'Pre-approved by '+ (p.preApprovedBy||'')
                : p.approvalOther || p.approvalType || '-';
            hodWRows.push(['Purchase',p.title||'',p.status||'',approvalLabel,p.createdAt?APP.formatDate(p.createdAt):'','₹'+(p.total||p.amount||'0')]);
        });
        if (hodWRows.length === 1) hodWRows.push(['(No HOD work items found)','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hodWRows), 'HOD Work');

        // ══════════ SHEET 4: Q GOALS ══════════
        var qpRows = [['Type','Quarter','Goal / Item','Status','Note']];
        hodQpAllotted.forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Allotted',(q.quarter||'')+'-'+(q.year||''), it.task||'', it.status||'pending', it.note||'']); }); });
        hodQpOwn.forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Self Goal',(q.quarter||'')+'-'+(q.year||''), it.task||'', it.status||'pending', it.note||'']); }); });
        if (hodQpAllotted.length===0 && hodQpOwn.length===0) qpRows.push(['(No quarterly goals)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qpRows), 'Q Goals');

        // ══════════ SHEET 5: TEAM TASKS ══════════
        var ttRows = [['Assigned To','Title','Status','Priority','Deadline','TAT','Source','Created At']];
        allDeptTasks.forEach(function(t){
            ttRows.push([t.assignedTo||'', t.title||'', t.status||'', t.priority||'', t.deadline||'', (t.tat||'-')+'h', t._source||'hod', t.createdAt?APP.formatDate(t.createdAt):'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ttRows), 'Team Tasks');

        // ══════════ SHEET 6: PER-MEMBER BREAKDOWN ══════════
        var mbRows = [['Member','Total Tasks','Done','Pending','In Progress','Overdue','Over TAT','Rate','TODOs','TODO Done','TODO Rate']];
        team.forEach(function(m){
            var mt = allDeptTasks.filter(function(t){return t.assignedTo===m.fullName;});
            var md = mt.filter(function(t){return t.status==='completed';}).length;
            var mp = mt.filter(function(t){return t.status==='pending';}).length;
            var mg = mt.filter(function(t){return t.status==='in-progress';}).length;
            var mo = mt.filter(function(t){return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed';}).length;
            var mtat = mt.filter(function(t){var ti=_tatInfo(t);return ti&&ti.overTAT&&t.status!=='completed';}).length;
            var mr = mt.length>0?Math.round(md/mt.length*100):0;
            var mempTodos = empTodosAll.filter(function(t){return t.createdBy===m.username;});
            var med = mempTodos.filter(function(t){return t.status==='completed';}).length;
            var mer = mempTodos.length>0?Math.round(med/mempTodos.length*100):0;
            mbRows.push([m.fullName, mt.length, md, mp, mg, mo, mtat, mr+'%', mempTodos.length, med, mer+'%']);
        });
        // HOD row
        var hodMed = hodTodos.filter(function(t){return t.status==='completed';}).length;
        var hodMer = hodTodos.length>0?Math.round(hodMed/hodTodos.length*100):0;
        mbRows.push([user.fullName+' (HOD)', hodOwnTasks.length, hodOwnTasks.filter(function(t){return t.status==='completed';}).length, hodOwnTasks.filter(function(t){return t.status==='pending';}).length, hodOwnTasks.filter(function(t){return t.status==='in-progress';}).length, 0, 0, Math.round(hodOwnTasks.length>0?hodOwnTasks.filter(function(t){return t.status==='completed';}).length/hodOwnTasks.length*100:0)+'%', hodTodos.length, hodMed, hodMer+'%']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mbRows), 'Per-Member Breakdown');

        // ══════════ SHEET 7: INVENTORY ══════════
        var invRows = [['Name','Quantity','Unit','Price','Value','Expiry','Low Stock']];
        inventory.forEach(function(i){
            var q = parseFloat(i.quantity)||0;
            var p = parseFloat(i.price)||0;
            invRows.push([i.name||'', q, i.unit||'', p, q*p, i.expiry||'', q<=5?'YES':'']);
        });
        if (inventory.length===0) invRows.push(['(No inventory items)','','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invRows), 'Inventory');

        // ══════════ SHEET 8: MATERIAL REQUESTS ══════════
        var mrRows = [['Title','Requested By','Status','Created At','Items']];
        matReqs.forEach(function(r){
            var itemsStr = (r.items||[]).map(function(it){return (it.name||'')+' x'+(it.qty||1);}).join(', ');
            mrRows.push([r.title||'', r.createdByName||r.createdBy||'', r.status||'', r.createdAt?APP.formatDate(r.createdAt):'', itemsStr]);
        });
        if (matReqs.length===0) mrRows.push(['(No material requests)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mrRows), 'Material Requests');

        // ══════════ SHEET 9: PROBLEMS ══════════
        var prRows = [['Title','Category','Status','Created By','Created At']];
        problems.forEach(function(p){
            prRows.push([p.title||'', p.category||'', p.status||'', p.createdBy||'', p.createdAt?APP.formatDate(p.createdAt):'']);
        });
        if (problems.length===0) prRows.push(['(No problems)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prRows), 'Problems');

        // ══════════ SHEET 10: EMPLOYEE REPORTS ══════════
        var repRows = [['Title','Employee','Category','Status','Sent To','Date']];
        reports.forEach(function(r){
            repRows.push([r.title||'', r.createdByName||r.createdBy||'', r.category||'', r.status||'', r.sentTo||'', r.createdAt?APP.formatDate(r.createdAt):'']);
        });
        if (reports.length===0) repRows.push(['(No reports)','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(repRows), 'Employee Reports');

        var fname = 'Master_Report_' + dept.replace(/[^a-z0-9]/gi,'_') + '_' + new Date().toISOString().slice(0,10) + '.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('Master Report downloaded: ' + fname, 'success');
    } catch(e) {
        APP.notify('Master Report export failed: ' + e.message, 'error');
    }
}

function hodDownloadReportExcel(reportId) {
    var r = (DB.get('reports') || []).find(function(x){ return x.id === reportId; });
    if (!r) { APP.notify('Report not found', 'error'); return; }
    try {
        var wb = XLSX.utils.book_new();
        var _bar = function(p){var f=Math.round(p/10);return '█'.repeat(f)+'░'.repeat(10-f)+' '+p+'%';};

        var _tasks = r._taskList || [];
        var _probs = r._problemList || [];
        var _reqs = r._requestList || [];
        var _myTodos = r._todoList || [];
        var _clItems = r._checklistItems || [];
        var _allotted = r._qpAllotted || [];
        var _own = r._qpOwn || [];

        // ── Sheet 1: Report Info ──
        var tDone = _tasks.filter(function(t){return t.status==='completed';}).length;
        var tTot = _tasks.length;
        var pRes = _probs.filter(function(p){return p.status==='resolved';}).length;
        var clDone = _clItems.filter(function(i){return i.status==='ok'||i.status==='completed';}).length;
        var clTot = _clItems.length;
        var clRate = clTot>0?Math.round(clDone/clTot*100):0;
        var info = [
            ['WORK REPORT — HOD VIEW'],
            ['Title', r.title||''],
            ['Employee', r.createdByName||r.createdBy||''],
            ['Department', r.department||''],
            ['Date', r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''],
            ['Category', r.category||''],
            ['Sent To', r.sentTo||''],
            ['Status', r.status||''],
            (r.autoSubmitted?['Auto-Submitted','Yes']:['','']),
            [],
            ['SUMMARY'],
            ['Tasks Completed', tDone+'/'+tTot],
            ['Task Rate', tTot>0?Math.round(tDone/tTot*100)+'%':'0%'],
            ['Checklist Items Done', clDone+'/'+clTot],
            ['Checklist Rate', clRate+'%'],
            ['Problems Resolved', pRes+'/'+_probs.length],
            ['Material Requests', _reqs.length],
            ['TODOs', _myTodos.length],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Report Info');

        // ── Sheet 2: KPI Dashboard ──
        var tdDone = _myTodos.filter(function(t){return t.status==='completed';}).length;
        var tdTot = _myTodos.length;
        var rApp = _reqs.filter(function(r2){return r2.status==='approved';}).length;
        var rTot = _reqs.length;
        var kpiRows = [
            ['KPI DASHBOARD'],
            [''],
            ['Metric','Done','Total','Rate','Progress Bar'],
            ['Task Completion',tDone,tTot,tTot>0?Math.round(tDone/tTot*100)+'%':'0%',_bar(tTot>0?Math.round(tDone/tTot*100):0)],
            ['Checklist Completion',clDone,clTot,clRate+'%',_bar(clRate)],
            ['Problem Resolution',pRes,_probs.length,_probs.length>0?Math.round(pRes/_probs.length*100)+'%':'0%',_bar(_probs.length>0?Math.round(pRes/_probs.length*100):0)],
            ['Request Approval',rApp,rTot,rTot>0?Math.round(rApp/rTot*100)+'%':'0%',_bar(rTot>0?Math.round(rApp/rTot*100):0)],
            ['TODO Completion',tdDone,tdTot,tdTot>0?Math.round(tdDone/tdTot*100)+'%':'0%',_bar(tdTot>0?Math.round(tdDone/tdTot*100):0)],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPI Dashboard');

        // ── Sheet 3: Tasks ──
        var taskRows = [['Title','Status','Priority','Deadline','TAT']];
        _tasks.forEach(function(t){ taskRows.push([t.title||'', t.status||'', t.priority||'', t.deadline||'', t.tat||'']); });
        if (_tasks.length===0) taskRows.push(['(No tasks)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), 'Tasks');

        // ── Sheet 4: Tasks with TAT ──
        var _tatTasks = _tasks.filter(function(t){ return t.tat; });
        var tatRows = [['Title','TAT (hours)','Status','Priority','Deadline']];
        _tatTasks.forEach(function(t){ tatRows.push([t.title||'', t.tat, t.status||'', t.priority||'', t.deadline||'']); });
        if (_tatTasks.length===0) tatRows.push(['(No tasks with TAT)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tatRows), 'Tasks with TAT');

        // ── Sheet 5: Checklist Items (each point with individual status) ──
        var clRows = [['Checklist','Frequency','Item','Status','Value','Unit']];
        _clItems.forEach(function(i){ clRows.push([i.checklist||'', i.frequency||'', i.item||'', i.status||'pending', i.value||'', i.unit||'']); });
        if (_clItems.length===0) clRows.push(['(No checklist items)','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clRows), 'Checklist Items');

        // ── Sheet 6: Problems ──
        var probRows = [['Title','Category','Status']];
        _probs.forEach(function(p){ probRows.push([p.title||'', p.category||'', p.status||'']); });
        if (_probs.length===0) probRows.push(['(No problems)','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(probRows), 'Problems');

        // ── Sheet 7: Material Requests ──
        var reqRows = [['Title','Status']];
        _reqs.forEach(function(req){ reqRows.push([req.title||'', req.status||'']); });
        if (_reqs.length===0) reqRows.push(['(No material requests)','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reqRows), 'Material Requests');

        // ── Sheet 8: TODO ──
        var todoRows = [['Title','Date','Priority','Status']];
        _myTodos.forEach(function(t){ todoRows.push([t.title||'', t.date||'', t.priority||'', t.status||'']); });
        if (_myTodos.length===0) todoRows.push(['(No TODOs)','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(todoRows), 'TODO');

        // ── Sheet 9: Q Goals ──
        var qpRows = [['Type','Quarter','Goal / Item','Status','Note']];
        (_allotted||[]).forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Allotted',q.quarter||'', it.task||'', it.status||'pending', it.note||'']); }); });
        (_own||[]).forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Own Goal',q.quarter||'', it.task||'', it.status||'pending', it.note||'']); }); });
        if ((!_allotted||_allotted.length===0) && (!_own||_own.length===0)) qpRows.push(['(No quarterly goals)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qpRows), 'Q Goals');

        var fname = ((r.title||'Report').replace(/[^a-z0-9]/gi,'_')) + '_Full.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('Full report Excel downloaded', 'success');
    } catch(e) {
        APP.notify('Export failed: ' + e.message, 'error');
    }
}

function hodExportEmployeeReport(employeeName) {
    var d = _hodData;
    if (!d || !d.user) { APP.notify('Data not loaded', 'error'); return; }
    var allUsers = DB.get('users') || [];
    var emp = allUsers.find(function(u){ return u.fullName === employeeName; });
    if (!emp) { APP.notify('Employee not found', 'error'); return; }
    try {
        var wb = XLSX.utils.book_new();
        var today = new Date().toISOString().slice(0,10);
        var nowLabel = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});

        // Employee's data
        var empTasks = (d.allDeptTasks||[]).filter(function(t){ return t.assignedTo === emp.fullName; });
        var empReports = (d.teamReports||[]).filter(function(r){ return r.createdBy === emp.username || r.createdByName === emp.fullName; });
        var empProbs = (d.routedProblems||[]).filter(function(p){ return p.createdBy === emp.username || p.createdBy === emp.fullName; });
        var empCl = (d.myCl||[]).filter(function(c){ return c.assignedTo === emp.fullName; });
        var empTodos = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy === emp.username; });
        var empReqs = (DB.get('material_requests')||[]).filter(function(r){ return r.createdBy === emp.username || r.createdByName === emp.fullName; });

        // Sheet 1: Cover / Summary
        var empDone = empTasks.filter(function(t){return t.status==='completed';}).length;
        var empTotal = empTasks.length;
        var empOver = empTasks.filter(function(t){return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed';}).length;
        var empRate = empTotal > 0 ? Math.round(empDone/empTotal*100) : 0;
        var cover = [
            ['EMPLOYEE REPORT — ' + employeeName],
            [''],
            ['Employee', employeeName],
            ['Department', d.dept||'—'],
            ['Report Date', nowLabel],
            [''],
            ['── OVERVIEW ──'],
            ['Tasks: ' + empTotal + ' total, ' + empDone + ' done, ' + empOver + ' overdue (' + empRate + '%)'],
            ['Problems: ' + empProbs.length + ' total'],
            ['Checklists: ' + empCl.length + ' total'],
            ['TODO: ' + empTodos.length + ' total, ' + empTodos.filter(function(t){return t.status==='completed';}).length + ' done'],
            ['Material Requests: ' + empReqs.length + ' total'],
            ['Reports Submitted: ' + empReports.length],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), 'Summary');

        // Sheet 2: KPI Dashboard
        var pTot=empProbs.length, pRes=empProbs.filter(function(p){return p.status==='resolved';}).length, pRate=pTot>0?Math.round(pRes/pTot*100):0;
        var cTot=empCl.length, cDone=empCl.filter(function(c){return c.status==='completed';}).length, cRate=cTot>0?Math.round(cDone/cTot*100):0;
        var rTot=empReqs.length, rApp=empReqs.filter(function(r){return r.status==='approved';}).length, rRate=rTot>0?Math.round(rApp/rTot*100):0;
        var tdTot=empTodos.length, tdDone=empTodos.filter(function(t){return t.status==='completed';}).length, tdRate=tdTot>0?Math.round(tdDone/tdTot*100):0;
        var _bar=function(p){var f=Math.round(p/10);return '█'.repeat(f)+'░'.repeat(10-f)+' '+p+'%';};
        var kpiRows = [
            ['KPI DASHBOARD'],
            [''],
            ['Metric','Done','Total','Rate','Progress Bar'],
            ['Task Completion',empDone,empTotal,empRate+'%',_bar(empRate)],
            ['Problem Resolution',pRes,pTot,pRate+'%',_bar(pRate)],
            ['Checklist Compliance',cDone,cTot,cRate+'%',_bar(cRate)],
            ['Request Approval',rApp,rTot,rRate+'%',_bar(rRate)],
            ['TODO Completion',tdDone,tdTot,tdRate+'%',_bar(tdRate)],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPI Dashboard');

        // Sheet 3: Tasks
        var tRows = [['Title','Priority','Status','Deadline','Source']];
        empTasks.forEach(function(t){
            tRows.push([t.title||'', t.priority||'', t.status||'', t.deadline||'', t._source||'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tRows), 'Tasks');

        // Sheet 4: Tasks with TAT
        var _tatTasks = empTasks.filter(function(t){ return t.tat; });
        var tatRows = [['Title','TAT (hours)','Status','Priority','Deadline','Elapsed (est.)']];
        _tatTasks.forEach(function(t) {
            var el = t.createdAt ? ((new Date() - new Date(t.createdAt)) / 3600000).toFixed(1)+'h' : '-';
            tatRows.push([t.title||'', t.tat, t.status||'', t.priority||'', t.deadline||'', t.status==='completed'?'Done':el]);
        });
        if (_tatTasks.length===0) tatRows.push(['(No tasks with TAT)','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tatRows), 'Tasks with TAT');

        // Sheet 5: Problems
        var pRows = [['Title','Category','Status','Created At']];
        empProbs.forEach(function(p){
            pRows.push([p.title||'', p.category||'', p.status||'', p.createdAt?APP.formatDate(p.createdAt):'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pRows), 'Problems');

        // Sheet 6: Material Requests
        var reqRows = [['Title','Status','Created At','Department']];
        empReqs.forEach(function(req){
            reqRows.push([req.title||'', req.status||'', req.createdAt?APP.formatDate(req.createdAt):'', req.department||'']);
        });
        if (empReqs.length===0) reqRows.push(['(No material requests)','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reqRows), 'Material Requests');

        // Sheet 7: TODO
        var todoRows = [['Title','Date','Priority','Status','Completed At']];
        empTodos.forEach(function(t){
            todoRows.push([t.title||'', t.date||'', t.priority||'', t.status||'', t.completedAt?APP.formatDate(t.completedAt):'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(todoRows), 'TODO');

        // Sheet 8: Reports
        var repRows = [['Title','Category','Sent To','Date']];
        empReports.forEach(function(r){
            repRows.push([r.title||'', r.category||'', r.sentTo||'', r.createdAt?APP.formatDate(r.createdAt):'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(repRows), 'Reports');

        // Sheet 9: Today's Checklist with Status
        var clRows = [['Checklist','Item','Status','Value/Unit']];
        empCl.forEach(function(cl){
            (cl.items||[]).forEach(function(item){
                var v = (item.value!==undefined&&item.value!=='')?' = '+item.value+(item.unit?' '+item.unit:''):'';
                clRows.push([cl.title, item.task||'', item.status||'pending', v]);
            });
            if (!cl.items||cl.items.length===0) clRows.push([cl.title,'(no items)','-','']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clRows), 'Today Checklists');

        // Sheet 10: Q Goals (Allotted + Own)
        var _qpAll = DB.get('quarterly_priorities')||[];
        var _allotted = _qpAll.filter(function(q){ return q.memberUsername===emp.username && !q.selfOwn; });
        var _own = _qpAll.filter(function(q){ return q.memberUsername===emp.username && q.selfOwn; });
        var qpRows = [['Type','Quarter','Goal / Item','Status','Note']];
        _allotted.forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Allotted',(q.quarter||'')+'-'+(q.year||''), it.task||'', it.status||'pending', it.note||'']); }); });
        _own.forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Own Goal',(q.quarter||'')+'-'+(q.year||''), it.task||'', it.status||'pending', it.note||'']); }); });
        if (_allotted.length===0 && _own.length===0) qpRows.push(['(No quarterly goals found)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qpRows), 'Q Goals');

        var fname = employeeName.replace(/[^a-z0-9]/gi,'_') + '_Report.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('Employee report downloaded: ' + fname, 'success');
    } catch(e) {
        APP.notify('Export failed: ' + e.message, 'error');
    }
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

/* ═══════════════════════════════════════════════
   INVENTORY REPORT TAB
═══════════════════════════════════════════════ */
function _hodInventoryReport(el) {
    var user = AUTH.currentUser();
    var myDept = (user.department || '').trim().toLowerCase();
    var allInv = DB.get('inventory') || [];

    // Determine which department(s) to show
    var filter = _hodInvDeptFilter; // null=my dept, '__all__'=all, otherwise a dept name
    var activeDept = filter === '__all__' ? '__all__' : (filter || myDept);
    var items = activeDept === '__all__'
        ? allInv
        : allInv.filter(function (i) { return (i.department || '').trim().toLowerCase() === activeDept; });
    var isAllDepts = activeDept === '__all__';

    var now = new Date().toISOString();

    function daysBetween(from, to) {
        if (!from || !to) return null;
        var d1 = new Date(from), d2 = new Date(to);
        return Math.round((d2 - d1) / 86400000);
    }

    function stockStatus(item) {
        var qty = parseInt(item.quantity) || 0;
        if (qty === 0) return { label: 'NO STOCK', color: '#212121', bg: '#f5f5f5' };
        if (qty <= 10) return { label: 'LOW STOCK', color: '#e65100', bg: '#fff3e0' };
        return { label: 'IN STOCK', color: '#2e7d32', bg: '#e8f5e9' };
    }

    function expStatus(item) {
        if (!item.expiryDate) return null;
        var days = daysBetween(now, item.expiryDate);
        if (days < 0) return { label: 'EXPIRED', color: '#c62828', bg: '#ffebee' };
        if (days <= 30) return { label: 'NEAR EXPIRE', color: '#e65100', bg: '#fff3e0' };
        return { label: 'VALID', color: '#2e7d32', bg: '#e8f5e9' };
    }

    var totalItems = items.length;
    var totalQty = items.reduce(function (s, i) { return s + (parseFloat(i.quantity) || 0); }, 0);
    var totalValue = items.reduce(function (s, i) {
        return s + (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0);
    }, 0);
    var lowStock = items.filter(function (i) { return parseInt(i.quantity) > 0 && parseInt(i.quantity) <= 10; });
    var noStock = items.filter(function (i) { return parseInt(i.quantity) === 0; });
    var expired = items.filter(function (i) {
        return i.expiryDate && daysBetween(now, i.expiryDate) < 0;
    });
    var nearExpire = items.filter(function (i) {
        var d = i.expiryDate ? daysBetween(now, i.expiryDate) : null;
        return d !== null && d >= 0 && d <= 30;
    });

    // Movements (filtered by selected dept or all)
    var targetDept = activeDept === '__all__' ? null : activeDept;
    var allMoves = (DB.get('inventory_movements') || []).filter(function (m) {
        return !targetDept || (m.dept || '').trim().toLowerCase() === targetDept;
    });
    var movesIn = allMoves.filter(function (m) { return m.type === 'in'; });
    var movesOut = allMoves.filter(function (m) { return m.type === 'out'; });
    var totalInQty = movesIn.reduce(function (s, m) { return s + (parseFloat(m.qty) || 0); }, 0);
    var totalOutQty = movesOut.reduce(function (s, m) { return s + (parseFloat(m.qty) || 0); }, 0);
    var totalInVal = movesIn.reduce(function (s, m) { return s + (parseFloat(m.totalValue) || 0); }, 0);
    var totalOutVal = movesOut.reduce(function (s, m) { return s + (parseFloat(m.totalValue) || 0); }, 0);
    var recentMoves = allMoves.slice().reverse().slice(0, 20);

    // Material requests
    var matReqs = (DB.get('material_requests') || []).filter(function (r) {
        return !targetDept || (r.department || '').trim().toLowerCase() === targetDept;
    }).slice().reverse().slice(0, 20);

    // Department-wise inventory summary (all depts)
    var deptSummary = {};
    allInv.forEach(function (i) {
        var d = i.department || 'Unassigned';
        if (!deptSummary[d]) deptSummary[d] = { items: 0, qty: 0, value: 0, low: 0, noStock: 0, expired: 0, nearExpire: 0 };
        deptSummary[d].items++;
        var q = parseFloat(i.quantity) || 0;
        deptSummary[d].qty += q;
        deptSummary[d].value += q * (parseFloat(i.price) || 0);
        if (q > 0 && q <= 10) deptSummary[d].low++;
        if (q === 0) deptSummary[d].noStock++;
        if (i.expiryDate && daysBetween(now, i.expiryDate) < 0) deptSummary[d].expired++;
    });
    var deptKeys = Object.keys(deptSummary).sort();

    // Global totals
    var globalTotalItems = allInv.length;
    var globalTotalQty = allInv.reduce(function (s, i) { return s + (parseFloat(i.quantity) || 0); }, 0);
    var globalTotalValue = allInv.reduce(function (s, i) { return s + (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0); }, 0);

    // Category map for charts
    var catMap = {};
    items.forEach(function (i) {
        var cat = i.category || 'Uncategorized';
        if (!catMap[cat]) catMap[cat] = { count: 0, qty: 0, value: 0 };
        catMap[cat].count++;
        catMap[cat].qty += parseFloat(i.quantity) || 0;
        catMap[cat].value += (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0);
    });
    var catKeys = Object.keys(catMap);

    // All departments for filter dropdown
    var allDeptNames = deptKeys.slice();

    var s = document.getElementById('hodInvCss');
    if (!s) {
        s = document.createElement('style');
        s.id = 'hodInvCss';
        s.textContent = '.inv-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;}.inv-stat-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;align-items:center;gap:10px;}.inv-stat-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}.inv-stat-val{font-size:20px;font-weight:700;line-height:1;}.inv-stat-lbl{font-size:11px;color:var(--gray);margin-top:2px;}';
        document.head.appendChild(s);
    }

    // Build dept filter dropdown
    var deptOpts = '<option value="__all__">🏢 All Departments</option>'
        + allDeptNames.map(function (d) {
            var sel = d.trim().toLowerCase() === activeDept ? ' selected' : '';
            return '<option value="' + d.replace(/"/g, '&quot;') + '"' + sel + '>' + d + '</option>';
        }).join('');

    var displayDeptName = isAllDepts ? 'All Departments' : (activeDept.charAt(0).toUpperCase() + activeDept.slice(1));
    var displaySubtitle = isAllDepts
        ? globalTotalItems + ' items across ' + allDeptNames.length + ' departments'
        : items.length + ' items in ' + activeDept;

    var html = ''
        // ═══════════ DASHBOARD HEADER ═══════════
        + '<div style="background:linear-gradient(135deg,#004d40,#00695c);border-radius:14px;padding:18px 22px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
        + '<div><div style="font-size:18px;font-weight:700;">📦 Inventory Dashboard</div>'
        + '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + displayDeptName + ' · ' + displaySubtitle + ' · ' + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">'
        + '<select id="hodInvDeptSelect" class="form-control" style="padding:6px 10px;font-size:12px;border-radius:6px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.15);color:#fff;min-width:160px;" onchange="hodInvDeptChanged(this.value)">'
        + deptOpts
        + '</select>'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodDownloadInvExcel()">📥 Excel</button>'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);padding:6px 14px;font-size:12px;" onclick="hodDownloadInvPdf()">📄 PDF</button>'
        + '</div></div>'

        // ═══════════ GLOBAL / DEPT KPI CARDS ═══════════
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + '<div class="inv-stat-card"><div class="inv-stat-icon" style="background:#e0f2f1;color:#00796b;">📦</div><div><div class="inv-stat-val">' + totalItems + '</div><div class="inv-stat-lbl">' + (isAllDepts ? 'Total Items (All)' : 'Total Items') + '</div></div></div>'
        + '<div class="inv-stat-card"><div class="inv-stat-icon" style="background:#e8f5e9;color:#2e7d32;">🔢</div><div><div class="inv-stat-val">' + totalQty + '</div><div class="inv-stat-lbl">Total Quantity</div></div></div>'
        + '<div class="inv-stat-card"><div class="inv-stat-icon" style="background:#fff3e0;color:#e65100;">💰</div><div><div class="inv-stat-val">₹' + totalValue.toFixed(2) + '</div><div class="inv-stat-lbl">Total Value</div></div></div>'
        + '<div class="inv-stat-card"><div class="inv-stat-icon" style="background:#e8f5e9;color:#2e7d32;">📥</div><div><div class="inv-stat-val">' + totalInQty + '</div><div class="inv-stat-lbl">Stock IN</div></div></div>'
        + '<div class="inv-stat-card"><div class="inv-stat-icon" style="background:#ffebee;color:#c62828;">📤</div><div><div class="inv-stat-val">' + totalOutQty + '</div><div class="inv-stat-lbl">Stock OUT</div></div></div>'
        + '</div>'

        // ═══════════ STATUS WARNING CARDS ═══════════
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;">'
        + '<div style="background:#fff3e0;border:1px solid #ffb300;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:13px;font-weight:700;color:#e65100;">⚠️ Low Stock</div><div style="font-size:22px;font-weight:700;margin:4px 0;">' + lowStock.length + '</div><div style="font-size:11px;color:var(--gray);">Items with quantity ≤ 10</div></div>'
        + '<div style="background:#f5f5f5;border:1px solid #9e9e9e;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:13px;font-weight:700;color:#212121;">⛔ No Stock</div><div style="font-size:22px;font-weight:700;margin:4px 0;">' + noStock.length + '</div><div style="font-size:11px;color:var(--gray);">Items with quantity = 0</div></div>'
        + '<div style="background:#fff8e1;border:1px solid #ff6f00;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:13px;font-weight:700;color:#e65100;">⏳ Near Expire</div><div style="font-size:22px;font-weight:700;margin:4px 0;">' + nearExpire.length + '</div><div style="font-size:11px;color:var(--gray);">Expiring within 30 days</div></div>'
        + '<div style="background:#ffebee;border:1px solid #ef5350;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:13px;font-weight:700;color:#c62828;">❌ Expired</div><div style="font-size:22px;font-weight:700;margin:4px 0;">' + expired.length + '</div><div style="font-size:11px;color:var(--gray);">Past expiry date</div></div>'
        + '</div>';

    // ═══════════ GLOBAL DASHBOARD (when viewing all depts) ═══════════
    if (isAllDepts) {
        var totalLowAll = allInv.filter(function (i) { return parseInt(i.quantity) > 0 && parseInt(i.quantity) <= 10; }).length;
        var totalNoStockAll = allInv.filter(function (i) { return parseInt(i.quantity) === 0; }).length;
        var totalExpiredAll = allInv.filter(function (i) { return i.expiryDate && daysBetween(now, i.expiryDate) < 0; }).length;
        var totalNearExpireAll = allInv.filter(function (i) {
            var d = i.expiryDate ? daysBetween(now, i.expiryDate) : null;
            return d !== null && d >= 0 && d <= 30;
        }).length;

        html += '<div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #2e7d32;">'
            + '<div class="card-header"><h3>🌐 Global Inventory Overview</h3></div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:12px;">'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#004d40;">' + globalTotalItems + '</div><div style="font-size:11px;color:var(--gray);">Total Items (All Depts)</div></div>'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#2e7d32;">' + globalTotalQty + '</div><div style="font-size:11px;color:var(--gray);">Total Quantity</div></div>'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#e65100;">₹' + globalTotalValue.toFixed(2) + '</div><div style="font-size:11px;color:var(--gray);">Total Value</div></div>'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#e65100;">' + totalLowAll + '</div><div style="font-size:11px;color:var(--gray);">Low Stock</div></div>'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#212121;">' + totalNoStockAll + '</div><div style="font-size:11px;color:var(--gray);">No Stock</div></div>'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#e65100;">' + totalNearExpireAll + '</div><div style="font-size:11px;color:var(--gray);">Near Expire</div></div>'
            + '<div style="text-align:center;padding:10px;background:var(--card);border-radius:8px;"><div style="font-size:24px;font-weight:700;color:#c62828;">' + totalExpiredAll + '</div><div style="font-size:11px;color:var(--gray);">Expired</div></div>'
            + '</div></div>';
    }

    // ═══════════ DEPARTMENT-WISE SUMMARY ═══════════
    html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>🏢 Department-wise Inventory</h3></div>'
        + '<div class="table-responsive"><table><thead><tr><th>Department</th><th>Items</th><th>Total Qty</th><th>Total Value</th><th>Low Stock</th><th>No Stock</th><th>Near Expire</th><th>Expired</th></tr></thead><tbody>'
        + deptKeys.map(function (d) {
            var ds = deptSummary[d];
            var isActive = d.trim().toLowerCase() === activeDept;
            var nearExp = allInv.filter(function (i) {
                if ((i.department || '').trim().toLowerCase() !== d.trim().toLowerCase()) return false;
                var dd = i.expiryDate ? daysBetween(now, i.expiryDate) : null;
                return dd !== null && dd >= 0 && dd <= 30;
            }).length;
            return '<tr' + (isActive ? ' style="background:#e0f2f1;font-weight:600;cursor:pointer;"' : ' style="cursor:pointer;"') + ' onclick="hodInvDeptChanged(\'' + d.replace(/'/g, "\\'") + '\')">'
                + '<td><strong>' + d + '</strong>' + (isActive ? ' <span style="font-size:10px;color:#00796b;">(viewing)</span>' : '') + '</td>'
                + '<td>' + ds.items + '</td>'
                + '<td>' + ds.qty + '</td>'
                + '<td>₹' + ds.value.toFixed(2) + '</td>'
                + '<td>' + (ds.low > 0 ? '<span class="inv-badge" style="background:#fff3e0;color:#e65100;">' + ds.low + '</span>' : '0') + '</td>'
                + '<td>' + (ds.noStock > 0 ? '<span class="inv-badge" style="background:#f5f5f5;color:#212121;">' + ds.noStock + '</span>' : '0') + '</td>'
                + '<td>' + (nearExp > 0 ? '<span class="inv-badge" style="background:#fff8e1;color:#e65100;">' + nearExp + '</span>' : '0') + '</td>'
                + '<td>' + (ds.expired > 0 ? '<span class="inv-badge" style="background:#ffebee;color:#c62828;">' + ds.expired + '</span>' : '0') + '</td></tr>';
        }).join('')
        + '</tbody></table></div></div>';

    // ═══════════ CHARTS ROW ═══════════
    html += '<div class="grid-2" style="gap:16px;margin-bottom:16px;">'
        + '<div class="card"><div class="card-header"><h3>📊 Category Distribution (Value)</h3></div><div style="padding:8px;"><canvas id="hodInvCatChart" height="200"></canvas></div></div>'
        + '<div class="card"><div class="card-header"><h3>📊 Stock In vs Out (Qty)</h3></div><div style="padding:8px;"><canvas id="hodInvMovChart" height="200"></canvas></div></div>'
        + '</div>';

    // ═══════════ CATEGORY BREAKDOWN ═══════════
    if (catKeys.length > 0) {
        html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>📊 Category Breakdown</h3></div>'
            + '<div class="table-responsive"><table><thead><tr><th>Category</th><th>Items</th><th>Quantity</th><th>Value</th><th>% of Total</th></tr></thead><tbody>'
            + catKeys.map(function (cat) {
                var c = catMap[cat];
                var pct = totalValue > 0 ? (c.value / totalValue * 100).toFixed(1) : 0;
                return '<tr><td><strong>' + cat + '</strong></td><td>' + c.count + '</td><td>' + c.qty + '</td><td>₹' + c.value.toFixed(2) + '</td><td><div style="display:flex;align-items:center;gap:6px;"><div class="hq-bar" style="width:60px;"><div class="hq-fill" style="width:' + pct + '%;background:#00796b;"></div></div><span style="font-size:11px;color:var(--gray);">' + pct + '%</span></div></td></tr>';
            }).join('')
            + '</tbody></table></div></div>';
    }

    // ═══════════ IN & OUT MOVEMENTS ═══════════
    html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>📥 In & Out Movements <span style="font-size:12px;color:var(--gray);font-weight:400;">(last 20)</span></h3></div>'
        + '<div class="table-responsive"><table><thead><tr><th>Date</th><th>Type</th><th>Item</th><th>Qty</th><th>Value</th><th>By</th></tr></thead><tbody>'
        + (recentMoves.length === 0
            ? '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:20px;">No movements found.</td></tr>'
            : recentMoves.map(function (m) {
                var isIn = m.type === 'in';
                var lbl = isIn ? 'IN' : 'OUT';
                var clr = isIn ? '#2e7d32' : '#c62828';
                var bg = isIn ? '#e8f5e9' : '#ffebee';
                return '<tr style="background:' + bg + ';">'
                    + '<td>' + APP.formatDate(m.date || m.createdAt) + '</td>'
                    + '<td><span class="inv-badge" style="background:' + clr + ';color:#fff;">' + lbl + '</span></td>'
                    + '<td>' + (m.itemName || '-') + '</td>'
                    + '<td><strong>' + (parseFloat(m.qty) || 0) + '</strong> ' + (m.unit || '') + '</td>'
                    + '<td>₹' + (parseFloat(m.totalValue) || 0).toFixed(2) + '</td>'
                    + '<td>' + (m.by || '-') + '</td></tr>';
            }).join(''))
        + '</tbody></table></div></div>';

    // ═══════════ ITEM DETAILS TABLE (color-coded) ═══════════
    html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>📋 Item Details — Color-Coded</h3></div>'
        + '<div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
        + '<input type="text" id="hodInvSearch" class="form-control" placeholder="🔍 Search items..." style="max-width:250px;padding:6px 10px;font-size:13px;" oninput="_hodInvFilter(this.value)">'
        + '<span class="inv-badge" style="background:#e8f5e9;color:#2e7d32;font-size:11px;padding:4px 10px;">IN STOCK</span>'
        + '<span class="inv-badge" style="background:#fff3e0;color:#e65100;font-size:11px;padding:4px 10px;">LOW STOCK</span>'
        + '<span class="inv-badge" style="background:#f5f5f5;color:#212121;font-size:11px;padding:4px 10px;">NO STOCK</span>'
        + '<span class="inv-badge" style="background:#fff8e1;color:#e65100;font-size:11px;padding:4px 10px;">NEAR EXPIRE</span>'
        + '<span class="inv-badge" style="background:#ffebee;color:#c62828;font-size:11px;padding:4px 10px;">EXPIRED</span>'
        + '</div>'
        + '<div class="table-responsive"><table id="hodInvTable"><thead><tr><th>#</th><th>Barcode</th><th>Item Name</th><th>Category</th><th>Dept</th><th>Qty</th><th>Unit</th><th>Price</th><th>Value</th><th>Stock</th><th>Expiry</th></tr></thead><tbody>'
        + (items.length === 0
            ? '<tr><td colspan="11" style="text-align:center;color:var(--gray);padding:20px;">No inventory items found for this department.</td></tr>'
            : items.map(function (i, idx) {
                var qty = parseInt(i.quantity) || 0;
                var price = parseFloat(i.price) || 0;
                var ss = stockStatus(i);
                var es = expStatus(i);
                var rowBg = qty === 0 ? '#f5f5f5' : (qty <= 10 ? '#fff3e0' : '');
                if (es && es.label === 'EXPIRED') rowBg = '#ffebee';
                else if (es && es.label === 'NEAR EXPIRE' && rowBg !== '#fff3e0') rowBg = '#fff8e1';
                var expBadge = es ? '<span class="inv-badge" style="background:' + es.bg + ';color:' + es.color + ';">' + es.label + '</span>' : '<span style="font-size:11px;color:var(--gray);">—</span>';
                return '<tr style="background:' + rowBg + ';">'
                    + '<td>' + (idx + 1) + '</td>'
                    + '<td style="font-size:10px;font-family:monospace;color:var(--gray);">' + (i.barcode || i.id.slice(-10)) + '</td>'
                    + '<td><strong>' + (i.name || '-') + '</strong></td>'
                    + '<td>' + (i.category || '-') + '</td>'
                    + '<td><span class="badge badge-info" style="font-size:9px;">' + (i.department || '-') + '</span></td>'
                    + '<td><strong>' + qty + '</strong></td>'
                    + '<td>' + (i.unit || 'pcs') + '</td>'
                    + '<td>₹' + price.toFixed(2) + '</td>'
                    + '<td>₹' + (qty * price).toFixed(2) + '</td>'
                    + '<td><span class="inv-badge" style="background:' + ss.bg + ';color:' + ss.color + ';border:1px solid ' + ss.color + ';">' + ss.label + '</span></td>'
                    + '<td>' + expBadge + '</td></tr>';
            }).join(''))
        + '</tbody></table></div></div>';

    // ═══════════ RECENT MATERIAL REQUESTS ═══════════
    html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>📥 Recent Material Requests</h3></div>'
        + '<div class="table-responsive"><table><thead><tr><th>#</th><th>Title</th><th>Item</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead><tbody>'
        + (matReqs.length === 0
            ? '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:20px;">No material requests found.</td></tr>'
            : matReqs.map(function (r, idx) {
                var stCls = r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning';
                var itemsStr = (r.items || []).map(function (it) { return it.name + ' ×' + it.qty; }).join(', ') || (r.itemName || r.item || '-');
                return '<tr><td>' + (idx + 1) + '</td><td>' + (r.title || '-') + '</td><td>' + itemsStr + '</td><td>' + (r.quantity || (r.items || []).reduce(function (s, it) { return s + (parseInt(it.qty) || 0); }, 0)) + '</td><td><span class="badge ' + stCls + '">' + (r.status || 'pending') + '</span></td><td>' + APP.formatDate(r.createdAt) + '</td></tr>';
            }).join(''))
        + '</tbody></table></div></div>';

    // ═══════════ ALERTS ═══════════
    var alerts = [];
    if (lowStock.length > 0) alerts.push('⚠️ ' + lowStock.length + ' item(s) with low stock (≤10) need replenishment');
    if (noStock.length > 0) alerts.push('⛔ ' + noStock.length + ' item(s) are out of stock');
    if (nearExpire.length > 0) alerts.push('⏳ ' + nearExpire.length + ' item(s) expiring within 30 days');
    if (expired.length > 0) alerts.push('❌ ' + expired.length + ' item(s) have expired');

    if (alerts.length > 0) {
        html = '<div style="margin-bottom:12px;">'
            + alerts.map(function (a) {
                var bg = a.indexOf('❌') >= 0 ? '#ffebee' : a.indexOf('⛔') >= 0 ? '#f5f5f5' : a.indexOf('⏳') >= 0 ? '#fff8e1' : '#fff3e0';
                var bd = a.indexOf('❌') >= 0 ? '#ef5350' : a.indexOf('⛔') >= 0 ? '#9e9e9e' : a.indexOf('⏳') >= 0 ? '#ff6f00' : '#ffb300';
                return '<div style="background:' + bg + ';border:1px solid ' + bd + ';border-radius:8px;padding:8px 14px;margin-bottom:4px;font-size:13px;font-weight:600;color:#333;">' + a + '</div>';
            }).join('')
            + '</div>' + html;
    }

    el.innerHTML = html;

    // Charts
    setTimeout(function () {
        if (typeof Chart === 'undefined') return;
        var catCanvas = document.getElementById('hodInvCatChart');
        if (catCanvas && catKeys.length > 0) {
            var catColors = ['#00796b','#2e7d32','#e65100','#1565c0','#6a1b9a','#c62828','#283593','#00838f','#f57f17','#4e342e'];
            new Chart(catCanvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: catKeys,
                    datasets: [{ data: catKeys.map(function (k) { return catMap[k].value; }), backgroundColor: catColors.slice(0, catKeys.length) }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } } }
            });
        }
        var movCanvas = document.getElementById('hodInvMovChart');
        if (movCanvas) {
            new Chart(movCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Stock In', 'Stock Out'],
                    datasets: [{
                        label: 'Quantity',
                        data: [totalInQty, totalOutQty],
                        backgroundColor: ['#2e7d32', '#c62828'],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { display: false } } }
                }
            });
        }
    }, 100);
}

function hodInvDeptChanged(val) {
    _hodInvDeptFilter = val === '__all__' ? '__all__' : val.toLowerCase();
    var el = document.getElementById('hodTabContent');
    if (el) _hodInventoryReport(el);
    // Also update the download function's dept filter reference
}

function _hodInvFilter(val) {
    var tbody = document.querySelector('#hodInvTable tbody');
    if (!tbody) return;
    var q = val.toLowerCase().trim();
    tbody.querySelectorAll('tr').forEach(function (tr) {
        tr.style.display = q === '' ? '' : (tr.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none');
    });
}

function hodDownloadInvExcel() {
    var user = AUTH.currentUser();
    var deptFilter = _hodInvDeptFilter || (user.department || '');
    var allInv = DB.get('inventory') || [];
    var items = deptFilter === '__all__'
        ? allInv
        : allInv.filter(function (i) { return (i.department || '').trim().toLowerCase() === deptFilter.trim().toLowerCase(); });
    if (items.length === 0) { APP.notify('No inventory data to download', 'info'); return; }
    if (typeof XLSX === 'undefined') { APP.notify('Excel library not loaded', 'error'); return; }

    var now = new Date().toISOString();
    function daysBetween(from, to) {
        if (!from || !to) return null;
        return Math.round((new Date(to) - new Date(from)) / 86400000);
    }
    function stockLabel(qty) {
        qty = parseInt(qty) || 0;
        if (qty === 0) return 'NO STOCK';
        if (qty <= 10) return 'LOW STOCK';
        return 'IN STOCK';
    }
    function expiryLabel(expDate) {
        if (!expDate) return '—';
        var d = daysBetween(now, expDate);
        if (d === null) return '—';
        if (d < 0) return 'EXPIRED';
        if (d <= 30) return 'NEAR EXPIRE';
        return 'VALID';
    }

    // ── Sheet 1: Items (color-coded statuses) ──
    var headers1 = ['#', 'Barcode', 'Item Name', 'Category', 'Department', 'Quantity', 'Unit', 'Price/Unit', 'Total Value', 'Stock Status', 'Expiry Date', 'Expiry Status'];
    var rows1 = items.map(function (i, idx) {
        var qty = parseFloat(i.quantity) || 0;
        var price = parseFloat(i.price) || 0;
        var ss = stockLabel(qty);
        var es = expiryLabel(i.expiryDate);
        return [idx + 1, i.barcode || i.id.slice(-10), i.name || '-', i.category || '-', i.department || '-', qty, i.unit || 'pcs', price, qty * price, ss, i.expiryDate ? APP.formatDate(i.expiryDate) : '-', es];
    });

    var wb = XLSX.utils.book_new();
    var ws1 = XLSX.utils.aoa_to_sheet([headers1].concat(rows1));
    ws1['!cols'] = headers1.map(function (h, ci) {
        var max = h.length;
        rows1.forEach(function (r) { var v = r[ci] != null ? String(r[ci]) : ''; if (v.length > max) max = v.length; });
        return { wch: Math.min(max + 3, 45) };
    });
    XLSX.utils.book_append_sheet(wb, ws1, 'Items');

    // ── Sheet 2: Department-wise Summary ──
    var deptSummary = {};
    var filterDepts = deptFilter === '__all__' ? allInv : items;
    filterDepts.forEach(function (i) {
        var d = i.department || 'Unassigned';
        if (!deptSummary[d]) deptSummary[d] = { items: 0, qty: 0, value: 0, low: 0, noStock: 0, expired: 0, nearExpire: 0 };
        deptSummary[d].items++;
        var q = parseFloat(i.quantity) || 0;
        deptSummary[d].qty += q;
        deptSummary[d].value += q * (parseFloat(i.price) || 0);
        if (q > 0 && q <= 10) deptSummary[d].low++;
        if (q === 0) deptSummary[d].noStock++;
        if (i.expiryDate) {
            var d2 = daysBetween(now, i.expiryDate);
            if (d2 !== null && d2 < 0) deptSummary[d].expired++;
            if (d2 !== null && d2 >= 0 && d2 <= 30) deptSummary[d].nearExpire++;
        }
    });
    var deptKeys = Object.keys(deptSummary).sort();
    var headers2 = ['Department', 'Items', 'Total Qty', 'Total Value', 'Low Stock', 'No Stock', 'Near Expire', 'Expired'];
    var rows2 = deptKeys.map(function (d) {
        var ds = deptSummary[d];
        return [d, ds.items, ds.qty, Math.round(ds.value * 100) / 100, ds.low, ds.noStock, ds.nearExpire, ds.expired];
    });
    // Grand total row
    var gt = { items: 0, qty: 0, value: 0, low: 0, noStock: 0, expired: 0, nearExpire: 0 };
    deptKeys.forEach(function (d) { var ds = deptSummary[d]; gt.items += ds.items; gt.qty += ds.qty; gt.value += ds.value; gt.low += ds.low; gt.noStock += ds.noStock; gt.expired += ds.expired; gt.nearExpire += ds.nearExpire; });
    rows2.push(['GRAND TOTAL', gt.items, gt.qty, Math.round(gt.value * 100) / 100, gt.low, gt.noStock, gt.nearExpire, gt.expired]);

    var ws2 = XLSX.utils.aoa_to_sheet([headers2].concat(rows2));
    ws2['!cols'] = headers2.map(function (h, ci) {
        var max = h.length;
        rows2.forEach(function (r) { var v = r[ci] != null ? String(r[ci]) : ''; if (v.length > max) max = v.length; });
        return { wch: Math.min(max + 3, 30) };
    });
    XLSX.utils.book_append_sheet(wb, ws2, 'Dept Summary');

    // ── Sheet 3: Movements (IN / OUT color-coded) ──
    var allMoves = (DB.get('inventory_movements') || []).slice().reverse().slice(0, 100);
    if (deptFilter !== '__all__') {
        var dfl = deptFilter.trim().toLowerCase();
        allMoves = allMoves.filter(function (m) { return (m.dept || '').trim().toLowerCase() === dfl; });
    }
    var headers3 = ['Date', 'Type', 'Item', 'Quantity', 'Unit', 'Unit Price', 'Total Value', 'Department', 'By', 'Notes'];
    var rows3 = allMoves.map(function (m) {
        var isIn = m.type === 'in';
        return [
            APP.formatDate(m.date || m.createdAt),
            isIn ? 'IN' : 'OUT',
            m.itemName || '-',
            parseFloat(m.qty) || 0,
            m.unit || 'pcs',
            parseFloat(m.unitPrice) || 0,
            parseFloat(m.totalValue) || 0,
            m.dept || '-',
            m.by || '-',
            m.notes || '-'
        ];
    });
    if (rows3.length === 0) rows3 = [['No movements data available']];
    var ws3 = XLSX.utils.aoa_to_sheet([headers3].concat(rows3));
    ws3['!cols'] = headers3.map(function (h, ci) {
        var max = h.length;
        rows3.forEach(function (r) { var v = r[ci] != null ? String(r[ci]) : ''; if (v.length > max) max = v.length; });
        return { wch: Math.min(max + 3, 30) };
    });
    XLSX.utils.book_append_sheet(wb, ws3, 'Movements');

    var title = (deptFilter === '__all__' ? 'All_Departments' : deptFilter) + '_Inventory_Report_' + new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, title + '.xlsx');
    APP.notify('Color-coded inventory report downloaded!', 'success');
}

function hodDownloadInvPdf() {
    var user = AUTH.currentUser();
    var dept = (user.department || '').trim().toLowerCase();
    var items = (DB.get('inventory') || []).filter(function (i) {
        return (i.department || '').trim().toLowerCase() === dept;
    });
    if (items.length === 0) { APP.notify('No inventory data to download', 'info'); return; }
    var headers = ['#', 'Item Name', 'Category', 'Quantity', 'Unit', 'Price/Unit', 'Total Value'];
    var rows = items.map(function (i, idx) {
        var qty = parseFloat(i.quantity) || 0;
        var price = parseFloat(i.price) || 0;
        return [idx + 1, i.name || '-', i.category || '-', qty, i.unit || 'pcs', '₹' + price, '₹' + (qty * price).toFixed(2)];
    });
    _hodPdfExport(dept + ' Inventory Report', headers, rows);
}

/* ═══════════════════════════════════════════════
   DEPT CHECKLISTS TAB (uses CHECKLISTS API)
═══════════════════════════════════════════════ */
var _hodDchkSubTab = 'templates';

function _hodDeptChecklists(el) {
    var user = AUTH.currentUser();
    if (!user || !user.department) {
        el.innerHTML = '<div style="padding:20px;color:var(--gray);">No department assigned.</div>';
        return;
    }
    var dept = user.department;
    var templates = (typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listTemplates(user) : [])
        .filter(function(t){ return t.department === dept; });
    var units = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listHospitalUnits() : [];
    var floors = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listFloors() : [];
    var assignments = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listAssignments(user, { activeOnly: true }) : [];
    var team = _hodData && _hodData.team ? _hodData.team : [];

    var html = ''
        + '<div style="font-weight:700;font-size:16px;margin-bottom:4px;">📋 Departmental Checklists — ' + dept + '</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-bottom:14px;">' + templates.length + ' template(s) · ' + assignments.length + ' active assignment(s)</div>'
        // Sub-tabs
        + '<div style="display:flex;gap:4px;margin-bottom:14px;">'
        + '<button class="tab-btn' + (_hodDchkSubTab==='templates'?' active':'') + '" onclick="hodDchkSubSwitch(\'templates\',this)">Templates</button>'
        + '<button class="tab-btn' + (_hodDchkSubTab==='assign'?' active':'') + '" onclick="hodDchkSubSwitch(\'assign\',this)">Assign</button>'
        + '<button class="tab-btn' + (_hodDchkSubTab==='oversight'?' active':'') + '" onclick="hodDchkSubSwitch(\'oversight\',this)">Oversight</button>'
        + '</div>'
        + '<div id="hodDchkSubContent">';

    el.innerHTML = html + '</div>';
    _hodDchkRenderSub(user, dept, templates, units, floors, assignments, team);
}

function hodDchkSubSwitch(tab, btn) {
    _hodDchkSubTab = tab;
    document.querySelectorAll('#hodTabContent .tab-btn').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department;
    var templates = (typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listTemplates(user) : []).filter(function(t){ return t.department === dept; });
    var units = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listHospitalUnits() : [];
    var floors = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listFloors() : [];
    var assignments = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listAssignments(user, { activeOnly: true }) : [];
    var team = _hodData && _hodData.team ? _hodData.team : [];
    _hodDchkRenderSub(user, dept, templates, units, floors, assignments, team);
}

function _hodDchkRenderSub(user, dept, templates, units, floors, assignments, team) {
    var subEl = document.getElementById('hodDchkSubContent');
    if (!subEl) return;
    if (_hodDchkSubTab === 'templates') _hodDchkTemplates(subEl, user, dept, templates, units, floors);
    else if (_hodDchkSubTab === 'assign') _hodDchkAssign(subEl, user, dept, templates, assignments, team);
    else if (_hodDchkSubTab === 'oversight') _hodDchkOversight(subEl, user, dept, assignments, team);
}

/* ── TEMPLATES SUB-TAB ── */
function _hodDchkTemplates(el, user, dept, templates, units, floors) {
    var html = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:600;font-size:14px;">Checklist Templates</div>'
        + '<button class="btn btn-sm btn-primary" onclick="hodDchkNewTemplate()">+ New Template</button>'
        + '</div>';

    if (templates.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;font-size:13px;color:var(--gray);">No templates yet. Click "+ New Template" to create one.</div>';
        el.innerHTML = html;
        return;
    }

    templates.forEach(function(tpl){
        var items = tpl.items || [];
        var fixedItems = items.filter(function(i){ return i.type === 'fixed'; });
        var customItems = items.filter(function(i){ return i.type === 'custom'; });
        html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;margin-bottom:12px;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:6px;">'
            + '<div><div style="font-size:14px;font-weight:700;">' + (tpl.title || '') + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">'
            + (tpl.floorName ? '📍 ' + tpl.floorName + ' · ' : '')
            + items.length + ' point(s)'
            + (fixedItems.length ? ' · ' + fixedItems.length + ' fixed' : '')
            + (customItems.length ? ' · ' + customItems.length + ' custom' : '')
            + '</div></div>'
            + '<button class="btn btn-sm btn-outline" onclick="hodDchkManageItems(\'' + tpl.id + '\')">Manage Items</button>'
            + '</div>'
            + '<div style="padding:10px 16px 14px;">';

        if (items.length === 0) {
            html += '<div style="font-size:12px;color:var(--gray);padding:4px 0;">No points yet.</div>';
        } else {
            items.forEach(function(it){
                html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;">'
                    + '<span style="color:var(--gray);font-size:11px;">' + (it.type === 'fixed' ? '🔵' : '🟢') + '</span>'
                    + '<span style="flex:1;">' + it.label + '</span>'
                    + (it.unit ? '<span style="font-size:11px;color:var(--gray);background:var(--light-gray);padding:1px 6px;border-radius:4px;">' + it.unit + '</span>' : '')
                    + '</div>';
            });
        }
        html += '</div></div>';
    });

    el.innerHTML = html;
}

function hodDchkNewTemplate() {
    var user = AUTH.currentUser();
    if (!user || !user.department) return;
    var dept = user.department;
    var title = prompt('Enter checklist title (e.g. "IT Daily Checklist"):');
    if (!title || !title.trim()) return;
    title = title.trim();

    var floors = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listFloors() : [];
    var needsFloor = typeof CHECKLISTS !== 'undefined' && CHECKLISTS.requiresFloor(dept);
    var floorId = null;

    if (needsFloor && floors.length > 0) {
        var floorOpts = floors.map(function(f,i){ return (i+1) + '. ' + f.name; }).join('\n');
        var choice = prompt('Select floor (enter number):\n' + floorOpts);
        var idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < floors.length) floorId = floors[idx].id;
    }

    var result = CHECKLISTS.createTemplate(user, dept, title, floorId);
    if (result.success) {
        APP.notify('Template created', 'success');
        hodDchkSubSwitch('templates', document.querySelector('.tab-btn'));
    } else {
        APP.notify(result.message, 'error');
    }
}

function hodDchkManageItems(tplId) {
    var user = AUTH.currentUser();
    if (!user) return;
    var tpl = CHECKLISTS.getTemplate(tplId);
    if (!tpl) { APP.notify('Template not found', 'error'); return; }

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.onclick = function(e){ if(e.target===modal) modal.remove(); };

    var items = tpl.items || [];
    var units = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.listHospitalUnits() : [];
    var unitOptions = units.map(function(u){ return u.name; }).join(',');

    var html = '<div style="background:var(--card);border-radius:12px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;padding:20px;" onclick="event.stopPropagation()">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-weight:700;font-size:15px;">Manage Items — ' + tpl.title + '</div>'
        + '<button class="btn btn-sm btn-outline" onclick="this.closest(\'[style*=\\"z-index\\"]\').remove()">✕</button>'
        + '</div>'
        // Add item form
        + '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">'
        + '<input type="text" id="hodDchkNewItemLabel" placeholder="New point text" style="flex:1;min-width:140px;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;">'
        + '<select id="hodDchkNewItemUnit" style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--card);">'
        + '<option value="">No unit</option>'
        + units.map(function(u){ return '<option value="' + u.name + '">' + u.name + '</option>'; }).join('')
        + '</select>'
        + '<button class="btn btn-sm btn-primary" onclick="hodDchkDoAddItem(\'' + tplId + '\')">+ Add</button>'
        + '</div>'
        // Items list
        + '<div style="max-height:300px;overflow-y:auto;">';

    if (items.length === 0) {
        html += '<div style="font-size:12px;color:var(--gray);text-align:center;padding:16px;">No items yet.</div>';
    } else {
        items.forEach(function(it){
            html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);font-size:13px;">'
                + '<span style="font-size:11px;color:var(--gray);width:40px;">' + (it.type==='fixed'?'🔵':'🟢') + '</span>'
                + '<span style="flex:1;">' + it.label + '</span>'
                + (it.unit ? '<span style="font-size:11px;color:var(--gray);background:var(--light-gray);padding:1px 6px;border-radius:4px;">' + it.unit + '</span>' : '<span style="font-size:11px;color:var(--gray);">—</span>')
                + '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 8px;" onclick="hodDchkDoRemoveItem(\'' + tplId + '\',\'' + it.id + '\')">✕</button>'
                + '</div>';
        });
    }
    html += '</div></div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function hodDchkDoAddItem(tplId) {
    var user = AUTH.currentUser();
    if (!user) return;
    var input = document.getElementById('hodDchkNewItemLabel');
    if (!input) return;
    var label = input.value.trim();
    if (!label) { APP.notify('Enter point text', 'error'); return; }
    var unitEl = document.getElementById('hodDchkNewItemUnit');
    var opts = { label: label, type: 'custom' };
    if (unitEl && unitEl.value) opts.unit = unitEl.value;
    var result = CHECKLISTS.addItem(user, tplId, opts);
    if (result.success) {
        APP.notify('Point added', 'success');
        input.value = '';
        hodDchkManageItems(tplId);
    } else {
        APP.notify(result.message, 'error');
    }
}

function hodDchkDoRemoveItem(tplId, itemId) {
    var user = AUTH.currentUser();
    if (!user) return;
    confirmAction('Remove this point?', function(){
        var r = CHECKLISTS.removeItem(user, tplId, itemId);
        if (r.success) { APP.notify('Point removed', 'success'); hodDchkManageItems(tplId); }
        else APP.notify(r.message, 'error');
    });
}

/* ── ASSIGN SUB-TAB ── */
function _hodDchkAssign(el, user, dept, templates, assignments, team) {
    var html = '<div style="font-weight:600;font-size:14px;margin-bottom:12px;">Assign Checklist to Team Member</div>';

    if (templates.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;font-size:13px;color:var(--gray);">No templates yet. Create one first.</div>';
        el.innerHTML = html;
        return;
    }
    if (team.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;font-size:13px;color:var(--gray);">No team members yet. Add your team first.</div>';
        el.innerHTML = html;
        return;
    }

    html += '<div style="display:grid;gap:12px;">'
        + '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Template</label>'
        + '<select id="hodDchkAssignTpl" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--card);" onchange="hodDchkAssignTplChanged()">'
        + '<option value="">— Select —</option>'
        + templates.map(function(t){ return '<option value="' + t.id + '">' + t.title + (t.floorName ? ' (' + t.floorName + ')' : '') + '</option>'; }).join('')
        + '</select></div>'
        + '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Team Member</label>'
        + '<select id="hodDchkAssignEmp" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--card);">'
        + '<option value="">— Select —</option>'
        + team.map(function(m){ return '<option value="' + m.id + '">' + m.fullName + '</option>'; }).join('')
        + '</select></div>'
        + '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Title (optional)</label>'
        + '<input type="text" id="hodDchkAssignTitle" placeholder="e.g. IT Daily Checks" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>'
        + '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Select Points</label>'
        + '<div id="hodDchkAssignItems" style="border:1px solid var(--border);border-radius:6px;padding:8px;max-height:200px;overflow-y:auto;font-size:13px;">'
        + '<div style="color:var(--gray);font-size:12px;">Select a template first</div>'
        + '</div></div>'
        + '<button class="btn btn-primary" onclick="hodDchkDoAssign()">Assign Checklist</button>'
        + '</div>';

    // Existing assignments for this department
    if (assignments.length > 0) {
        html += '<div style="font-weight:600;font-size:14px;margin:20px 0 10px;">Active Assignments</div>';
        assignments.forEach(function(a){
            var emp = team.find(function(m){ return m.id === a.employeeId; });
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">'
                + '<div><div style="font-size:13px;font-weight:600;">' + a.title + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">👤 ' + (emp ? emp.fullName : a.employeeName) + ' · ' + (a.refs ? a.refs.length : 0) + ' point(s)</div></div>'
                + '<button class="btn btn-sm btn-danger" onclick="hodDchkDoRevoke(\'' + a.id + '\')">Revoke</button>'
                + '</div>';
        });
    }

    el.innerHTML = html;
}

function hodDchkAssignTplChanged() {
    var sel = document.getElementById('hodDchkAssignTpl');
    var container = document.getElementById('hodDchkAssignItems');
    if (!sel || !container) return;
    var tplId = sel.value;
    if (!tplId) {
        container.innerHTML = '<div style="color:var(--gray);font-size:12px;">Select a template first</div>';
        return;
    }
    var tpl = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.getTemplate(tplId) : null;
    if (!tpl || !tpl.items) {
        container.innerHTML = '<div style="color:var(--gray);font-size:12px;">No items in this template.</div>';
        return;
    }
    var html = '';
    tpl.items.forEach(function(it){
        html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;">'
            + '<input type="checkbox" class="hodDchkItemCb" value="' + it.id + '" data-tpl="' + tplId + '">'
            + '<span>' + it.label + '</span>'
            + (it.unit ? '<span style="font-size:11px;color:var(--gray);background:var(--light-gray);padding:1px 6px;border-radius:4px;">' + it.unit + '</span>' : '')
            + '</label>';
    });
    container.innerHTML = html;
}

function hodDchkDoAssign() {
    var user = AUTH.currentUser();
    if (!user) return;
    var tplId = document.getElementById('hodDchkAssignTpl').value;
    var empId = document.getElementById('hodDchkAssignEmp').value;
    var title = document.getElementById('hodDchkAssignTitle').value.trim() || 'Checklist Assignment';

    if (!tplId) { APP.notify('Select a template', 'error'); return; }
    if (!empId) { APP.notify('Select a team member', 'error'); return; }

    var cbs = document.querySelectorAll('#hodDchkAssignItems .hodDchkItemCb:checked');
    if (cbs.length === 0) { APP.notify('Select at least one point', 'error'); return; }

    var refs = [];
    cbs.forEach(function(cb){
        refs.push({ templateId: cb.dataset.tpl, itemId: cb.value });
    });

    var result = CHECKLISTS.assignToEmployee(user, {
        employeeId: empId,
        title: title,
        refs: refs
    });

    if (result.success) {
        APP.notify('Checklist assigned', 'success');
        hodDchkSubSwitch('assign', document.querySelectorAll('.tab-btn')[1]);
    } else {
        APP.notify(result.message, 'error');
    }
}

function hodDchkDoRevoke(assignmentId) {
    var user = AUTH.currentUser();
    if (!user) return;
    confirmAction('Revoke this assignment? The employee will no longer see it.', function(){
        var r = CHECKLISTS.revokeAssignment(user, assignmentId);
        if (r.success) { APP.notify('Assignment revoked', 'success'); hodDchkSubSwitch('assign', document.querySelectorAll('.tab-btn')[1]); }
        else APP.notify(r.message, 'error');
    });
}

/* ── OVERSIGHT SUB-TAB ── */
function _hodDchkOversight(el, user, dept, assignments, team) {
    var dateStr = new Date().toISOString().slice(0,10);

    var html = '<div style="font-weight:600;font-size:14px;margin-bottom:8px;">Oversight — ' + APP.formatDate(dateStr) + '</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-bottom:14px;">Whether each team member has submitted their assigned checklist today.</div>';

    var statusResult = typeof CHECKLISTS !== 'undefined' ? CHECKLISTS.assignmentStatus(user, dept, dateStr) : null;
    var rows = statusResult && statusResult.success ? statusResult.assignments : [];

    if (rows.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;font-size:13px;color:var(--gray);">No active assignments for today.</div>';
        el.innerHTML = html;
        return;
    }

    var submitted = rows.filter(function(r){ return r.filled; });
    var pending = rows.filter(function(r){ return !r.filled; });

    html += '<div style="font-size:12px;color:var(--gray);margin-bottom:10px;">'
        + submitted.length + '/' + rows.length + ' submitted today</div>';

    if (pending.length > 0) {
        html += '<div style="font-size:12px;font-weight:700;color:var(--danger);margin-bottom:6px;">Pending (' + pending.length + ')</div>';
        pending.forEach(function(r){
            var emp = team.find(function(m){ return m.id === r.assignment.employeeId; });
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;border-left:3px solid var(--danger);">'
                + '<div><div style="font-size:13px;">' + r.assignment.title + '</div><div style="font-size:11px;color:var(--gray);">👤 ' + (emp ? emp.fullName : r.assignment.employeeName) + '</div></div>'
                + '<span class="badge badge-danger" style="font-size:10px;">Pending</span></div>';
        });
    }

    if (submitted.length > 0) {
        html += '<div style="font-size:12px;font-weight:700;color:var(--success);margin:12px 0 6px;">Submitted (' + submitted.length + ')</div>';
        submitted.forEach(function(r){
            var emp = team.find(function(m){ return m.id === r.assignment.employeeId; });
            var time = r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;border-left:3px solid var(--success);">'
                + '<div><div style="font-size:13px;">' + r.assignment.title + '</div><div style="font-size:11px;color:var(--gray);">👤 ' + (emp ? emp.fullName : r.assignment.employeeName) + ' · ' + time + '</div></div>'
                + '<span class="badge badge-success" style="font-size:10px;">✓ Done</span></div>';
        });
    }

    el.innerHTML = html;
}
