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

function _clPeriodKey(freq, refDate) {
    // "Day" starts at 5:00 AM — subtract 5 h so anything before 5 AM still counts as yesterday
    var base = refDate ? new Date(refDate) : new Date();
    var adj = new Date(base.getTime() - 5 * 60 * 60 * 1000);
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

function _clPeriodLabel(freq, refDate) {
    var base = refDate ? new Date(refDate) : new Date();
    var adj = new Date(base.getTime() - 5 * 60 * 60 * 1000);
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
    var clSnapshot = items.map(function(item){
        return {checklist:cl.title, frequency:cl.frequency||'', item:item.task||'', status:item.status||'pending', value:item.value||'', unit:item.unit||''};
    });
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
        _checklistItems: clSnapshot,
        _taskList: [],
        _problemList: [],
        _requestList: [],
        _todoList: [],
        _qpAllotted: [],
        _qpOwn: [],
        createdAt: new Date().toISOString(),
        status: 'sent'
    });
}

function _checkAndResetChecklists(checklists, user) {
    checklists.forEach(function(cl) {
        if (!cl.frequency) return; // legacy checklists without frequency skip auto-reset
        var refDate = (cl.frequency === 'weekly' && cl.weekDate) ? new Date(cl.weekDate) : null;
        var expected = _clPeriodKey(cl.frequency, refDate);
        var stored   = cl.periodKey || '';
        if (!stored) {
            // Legacy checklist with no periodKey yet. If it has leftover done
            // items or was left 'completed', roll it into the fresh period so
            // the OK/fault dropdowns show again; a brand-new empty checklist
            // just gets its periodKey recorded.
            var leftover = cl.status === 'completed' || (cl.items || []).some(function(item) {
                return item.status && item.status !== 'pending';
            });
            var updates = { periodKey: expected, periodSubmitted: false };
            if (leftover) {
                updates.items = (cl.items || []).map(function(item) {
                    return { task: item.task, unit: item.unit || '', status: 'pending', value: '' };
                });
                updates.status = 'active';
            }
            DB.update('checklists', cl.id, updates);
            cl.periodKey = expected; cl.periodSubmitted = false;
            if (leftover) { cl.items = updates.items; cl.status = 'active'; }
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
    var isAdmin = user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin';
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

    var allTodos = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===u; });
    var todoPend = allTodos.filter(function(t){ return t.status!=='completed'; }).length;

    var dNorm = (dept || '').trim().toLowerCase();

    var isAccountGrp   = ['account', 'accounts', 'finance', 'billing', 'accounts & finance', 'billing & accounts'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isReceptionGrp = ['reception', 'front desk', 'admission', 'admissions', 'opd', 'help desk', 'billing & reception'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isNursingGrp   = ['nursing', 'icu', 'ward', 'ot', 'casualty', 'emergency', 'clinical'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isDoctorGrp    = ['doctor', 'doctors', 'medical', 'consultant', 'physician', 'surgeon'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isPharmacyGrp  = ['pharmacy', 'chemist', 'drug store'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isStoreGrp     = ['store', 'stores', 'inventory', 'warehouse'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isItGrp        = ['it', 'computer', 'computers', 'biomedical', 'software'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isFacilityGrp  = ['facility', 'maintenance', 'housekeeping', 'security', 'engineering'].some(function(x){ return dNorm.indexOf(x) !== -1; });
    var isHrGrp        = ['hr', 'personnel', 'admin', 'human resource'].some(function(x){ return dNorm.indexOf(x) !== -1; });

    var pendingDiscountsCount = (DB.get('discountRequests') || []).filter(function(r){ return r.status === 'pending'; }).length;
    var pendingReqsCount     = _empData.myRequests.filter(function(r){ return r.status === 'pending'; }).length;
    var openProblemsCount    = (DB.get('problems') || []).filter(function(p){ return p.status !== 'resolved'; }).length;

    var tabs = [];

    if (isAccountGrp) {
        tabs = [
            { id: 'overview',    label: T('empd2_tab_overview') },
            { id: 'discounts',   label: '🏷️ Discounts & Approvals', badge: pendingDiscountsCount, badgeClass: 'badge-warning' },
            { id: 'purchases',   label: '💰 Daily Purchases & Expenses' },
            { id: 'matrequests', label: '📦 Material Requisitions', badge: pendingReqsCount },
            { id: 'checklists',  label: '📑 Account Audit Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
            { id: 'todo',        label: T('empd2_tab_todo'), badge: todoPend, badgeClass: 'badge-warning' },
            { id: 'reports',     label: T('empd2_tab_reports') },
            { id: 'performance', label: T('empd2_tab_performance') }
        ];
    } else if (isReceptionGrp) {
        tabs = [
            { id: 'overview',    label: T('empd2_tab_overview') },
            { id: 'admissions',  label: '🏥 Patient Admissions & Beds' },
            { id: 'discounts',   label: '🏷️ Discount Requests' },
            { id: 'lostfound',   label: '🔍 Lost & Found Registry' },
            { id: 'complaints',  label: '📝 Patient Complaints' },
            { id: 'patientshift', label: '🚑 Patient Shifting' },
            { id: 'checklists',  label: '✅ Front Desk Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
            { id: 'todo',        label: T('empd2_tab_todo'), badge: todoPend, badgeClass: 'badge-warning' }
        ];
    } else if (isNursingGrp) {
        tabs = [
            { id: 'overview',    label: '📊 Ward Overview' },
            { id: 'admissions',  label: '🏥 Ward Census & Patients' },
            { id: 'cleaning',    label: '🧹 Room & Bed Cleaning', badge: _empData.pendingCleaning.length, badgeClass: 'badge-danger' },
            { id: 'patientshift', label: '🚑 Patient Shifting' },
            { id: 'handover',    label: '🔄 Shift Handover' },
            { id: 'matrequests', label: '📦 Supplies & Requisitions' },
            { id: 'equipbackdown', label: '📉 Equipment Breakdowns' },
            { id: 'checklists',  label: '✅ Clinical Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length }
        ];
    } else if (isDoctorGrp) {
        tabs = [
            { id: 'overview',    label: '📊 Clinical Overview' },
            { id: 'admissions',  label: '🏥 Inpatient Census' },
            { id: 'discounts',   label: '🏷️ Discount Endorsements' },
            { id: 'problems',    label: '🔧 Equipment & IT Requests' },
            { id: 'suggestions', label: '💡 Clinical Feedback' },
            { id: 'checklists',  label: '✅ Clinical Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
            { id: 'reports',     label: '📈 Case Reports' }
        ];
    } else if (isPharmacyGrp) {
        tabs = [
            { id: 'overview',    label: '📊 Pharmacy Overview' },
            { id: 'inventory',   label: '📦 Stock & Medicine Inventory' },
            { id: 'matrequests', label: '📦 Stock Requisitions' },
            { id: 'equipbackdown', label: '📉 Cold Chain & Breakdowns' },
            { id: 'checklists',  label: '✅ Pharmacy Daily Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length }
        ];
    } else if (isStoreGrp) {
        tabs = [
            { id: 'overview',    label: '📊 Store Overview' },
            { id: 'inventory',   label: '📦 Inventory Master' },
            { id: 'matrequests', label: '📦 Department Requisitions', badge: pendingReqsCount },
            { id: 'scrap',       label: '🗑️ Scrap & Disposal' },
            { id: 'checklists',  label: '✅ Store Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length }
        ];
    } else if (isItGrp) {
        tabs = [
            { id: 'overview',    label: '📊 IT Overview' },
            { id: 'problems',    label: '🔧 Problem Tickets', badge: openProblemsCount, badgeClass: 'badge-danger' },
            { id: 'equipbackdown', label: '📉 Hardware & Server Breakdowns' },
            { id: 'handover',    label: '🔄 IT Shift Handover' },
            { id: 'checklists',  label: '✅ System & Backup Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
            { id: 'todo',        label: T('empd2_tab_todo'), badge: todoPend, badgeClass: 'badge-warning' }
        ];
    } else if (isFacilityGrp) {
        tabs = [
            { id: 'overview',    label: T('empd2_tab_overview') },
            { id: 'staffdeploy', label: '🧹 Staff Deployment' },
            { id: 'securitydeploy', label: '🛡️ Security Deployment' },
            { id: 'cleaning',    label: '🧹 Room & Floor Cleaning', badge: _empData.pendingCleaning.length, badgeClass: 'badge-danger' },
            { id: 'scrap',       label: '🗑️ Waste & Scrap Disposal' },
            { id: 'handover',    label: '🔄 Shift Handover' },
            { id: 'equipbackdown', label: '📉 Equipment Breakdowns' },
            { id: 'checklists',  label: '✅ Maintenance Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length }
        ];
    } else if (isHrGrp) {
        tabs = [
            { id: 'overview',    label: '📊 HR Overview' },
            { id: 'staffdeploy', label: '🧹 Staff Deployment Logs' },
            { id: 'complaints',  label: '📝 Grievances & Complaints' },
            { id: 'suggestions', label: '💡 Staff Suggestions' },
            { id: 'checklists',  label: '✅ HR Checklists' },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length }
        ];
    } else {
        tabs = [
            { id: 'overview',    label: T('empd2_tab_overview') },
            { id: 'work',        label: T('empd2_tab_work'), badge: _empData.myTasks.filter(function(t){return t.status!=='completed';}).length },
            { id: 'todo',        label: T('empd2_tab_todo'), badge: todoPend, badgeClass: 'badge-warning' },
            { id: 'checklists',  label: T('empd2_tab_checklists') },
            { id: 'matrequests', label: '📦 Material Requisitions' },
            { id: 'reports',     label: T('empd2_tab_reports') },
            { id: 'performance', label: T('empd2_tab_performance') },
            { id: 'qgoals',      label: T('empd2_tab_qgoals') }
        ];
    }

    // Admin Feature Control: Filter tabs so ONLY options given by Admin are displayed
    tabs = tabs.filter(function(t) {
        if (t.id === 'overview' || t.id === 'work' || t.id === 'todo' || t.id === 'performance' || t.id === 'qgoals') return true;
        var permKey = t.id === 'matrequests' ? 'material-requests'
            : t.id === 'lostfound' ? 'lost-found'
            : t.id === 'staffdeploy' ? 'staff-deployment'
            : t.id === 'securitydeploy' ? 'security-deployment'
            : t.id === 'patientshift' ? 'patient-shifting'
            : t.id === 'equipbackdown' ? 'problems'
            : t.id === 'cleaning' ? 'cleaning'
            : t.id;
        return AUTH.hasPermission(user, permKey);
    });

    var canSeeCleaning = (isNursingGrp || isFacilityGrp) || AUTH.hasPermission(user, 'cleaning') || AUTH.hasPermission(user, 'room-checklist');

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
        + _kpiCard('📅', T('empd2_kpi_due_today'),  todayTasks.length, '#fff3e0', '#e65100', 'work')
        + _kpiCard('📆', T('empd2_kpi_due_week'),   weekTasks.length,  '#e3f2fd', 'var(--primary)', 'work')
        + (AUTH.hasPermission(user, 'checklists') ? _kpiCard('✅', T('empd2_kpi_checklist'), clPct + '%', '#e8f5e9', 'var(--secondary)', 'checklists') : '')
        + (AUTH.hasPermission(user, 'problems') ? _kpiCard('🔧', T('empd2_kpi_issues'), openProbs.length, '#fce4ec', 'var(--danger)', 'reports') : '')
        + (AUTH.hasPermission(user, 'projects') || _empData.myProjects.length > 0 ? _kpiCard('📋', T('empd2_kpi_projects'), _empData.myProjects.length, '#f3e5f5', '#7b1fa2', 'work') : '')
        + _kpiCard('📝', T('empd2_kpi_todo'), todoPend, '#fff8e1', '#f57f17', 'todo')
        + '</div>'

        // ── Quarterly strip ──
        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:18px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:15px;">📅 ' + q.name + ' ' + T('empd2_qprogress') + '</div>'
        + '<div style="font-size:13px;color:var(--gray);">' + qDone.length + ' ' + T('empd2_done_lbl') + ' · ' + qInProg.length + ' ' + T('empd2_in_progress_lbl') + ' · ' + qTasks.length + ' ' + T('empd2_total_lbl') + '</div>'
        + '</div>'
        + '<div style="margin-bottom:6px;">'
        // Stacked bar: green = done, blue = in-progress
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);margin-bottom:3px;">'
        + '<span>' + T('empd2_task_completion') + '</span>'
        + '<span style="font-weight:600;color:' + (qPct >= 80 ? 'var(--success)' : qPct >= 50 ? 'var(--warning)' : (qInProgPct > 0 ? 'var(--primary)' : 'var(--danger)')) + ';">'
        + qPct + '% ' + T('empd2_done_lbl') + (qInProgPct > 0 ? ' · ' + qInProgPct + '% ' + T('empd2_in_progress_lbl') : '') + '</span></div>'
        + '<div class="q-progress-track" style="position:relative;">'
        + '<div style="position:absolute;left:0;top:0;height:100%;width:' + Math.min(100, qPct + qInProgPct) + '%;background:var(--primary);opacity:0.35;border-radius:8px;"></div>'
        + '<div class="q-progress-fill" style="width:' + qPct + '%;background:' + (qPct >= 80 ? 'var(--success)' : qPct >= 50 ? 'var(--warning)' : 'var(--secondary)') + ';position:relative;z-index:1;"></div>'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:12px;font-size:11px;color:var(--gray);margin-top:6px;flex-wrap:wrap;">'
        + '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--secondary);display:inline-block;"></span>' + T('empd2_grp_completed') + ' (' + qDone.length + ')</span>'
        + (qInProg.length > 0 ? '<span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--primary);opacity:0.5;display:inline-block;"></span>' + T('empd2_status_inprogress') + ' (' + qInProg.length + ')</span>' : '')
        + '<span style="margin-left:auto;">' + q.start.toLocaleDateString('en-IN',{month:'short',day:'numeric'}) + ' – ' + q.end.toLocaleDateString('en-IN',{month:'short',day:'numeric'}) + '</span>'
        + '</div>'
        + '</div>'

        // ── Cleaning alert (only shown to staff with explicit cleaning rights or Nursing/Facility department) ──
        + (canSeeCleaning && _empData.pendingCleaning.length > 0
            ? '<div style="background:#fff3e0;border:2px solid var(--warning);border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="empTabSwitch(\'cleaning\',this)">'
              + '<span style="font-size:24px;">🧹</span><div style="flex:1;"><div style="font-weight:700;color:#e65100;">' + _empData.pendingCleaning.length + ' ' + T('empd2_rooms_cleaning') + '</div>'
              + '<div style="font-size:12px;color:var(--gray);">' + T('empd2_tap_view') + '</div></div><span style="color:#e65100;">›</span></div>'
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
    if (tab === 'todo')        { renderEmpTodoTab(el); return; }
    if (tab === 'checklists')  { renderEmpChecklistsTab(el); return; }
    if (tab === 'reports')     { renderEmpReportsTab(el); return; }
    if (tab === 'cleaning')    { renderEmpCleaningSection(el); return; }
    if (tab === 'handover')    { renderEmpHandoverTab(el); return; }
    if (tab === 'staffdeploy') { if (typeof StaffDeployment !== 'undefined') { StaffDeployment.renderTab(el); } else { el.innerHTML = '<div class="empty-state">Staff Deployment module not loaded</div>'; } return; }
    if (tab === 'securitydeploy') { if (typeof SecurityDeployment !== 'undefined') { SecurityDeployment.renderTab(el); } else { el.innerHTML = '<div class="empty-state">Security Deployment module not loaded</div>'; } return; }
    if (tab === 'patientshift') { if (typeof PatientShifting !== 'undefined') { PatientShifting.renderTab(el); } else { el.innerHTML = '<div class="empty-state">Patient Shifting module not loaded</div>'; } return; }
    if (tab === 'performance') { renderEmpPerformanceTab(el); return; }
    if (tab === 'qgoals')     { renderEmpQGoalsTab(el); return; }
    if (tab === 'equipbackdown') { renderEmpBreakdownTab(el); return; }
    if (tab === 'discounts') {
        if (typeof global !== 'undefined' && typeof global.renderDiscounts === 'function') global.renderDiscounts(el);
        else if (typeof renderDiscounts === 'function') renderDiscounts(el);
        else el.innerHTML = '<div class="empty-state">Discounts module not loaded</div>';
        return;
    }
    if (tab === 'purchases') {
        if (typeof renderHodPurchases === 'function') renderHodPurchases(el);
        else el.innerHTML = '<div class="empty-state">Purchases module not loaded</div>';
        return;
    }
    if (tab === 'admissions') {
        if (typeof renderAdmissions === 'function') renderAdmissions(el);
        else el.innerHTML = '<div class="empty-state">Admissions module not loaded</div>';
        return;
    }
    if (tab === 'inventory') {
        if (typeof renderInventory === 'function') renderInventory(el);
        else el.innerHTML = '<div class="empty-state">Inventory module not loaded</div>';
        return;
    }
    if (tab === 'scrap') {
        if (typeof renderScrap === 'function') renderScrap(el);
        else el.innerHTML = '<div class="empty-state">Scrap Disposal module not loaded</div>';
        return;
    }
    if (tab === 'lostfound') {
        if (typeof renderLostFound === 'function') renderLostFound(el);
        else el.innerHTML = '<div class="empty-state">Lost & Found module not loaded</div>';
        return;
    }
    if (tab === 'complaints') {
        if (typeof renderComplaints === 'function') renderComplaints(el);
        else el.innerHTML = '<div class="empty-state">Complaints module not loaded</div>';
        return;
    }
    if (tab === 'suggestions') {
        if (typeof renderSuggestions === 'function') renderSuggestions(el);
        else el.innerHTML = '<div class="empty-state">Suggestions module not loaded</div>';
        return;
    }
    if (tab === 'matrequests') {
        if (typeof renderMaterialRequests === 'function') renderMaterialRequests(el);
        else el.innerHTML = '<div class="empty-state">Material Requests module not loaded</div>';
        return;
    }
    if (tab === 'problems') {
        if (typeof renderProblems === 'function') renderProblems(el);
        else el.innerHTML = '<div class="empty-state">Problems module not loaded</div>';
        return;
    }
}

function renderEmpQGoalsTab(el) {
    var user = AUTH.currentUser();
    if (!user) return;
    if (typeof renderEmpQP === 'function') {
        renderEmpQP(el, user.username, user.fullName);
    } else {
        el.innerHTML = '<div class="empty-state">' + T('empd2_qgoals_not_loaded') + '</div>';
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
            + '<strong style="color:var(--danger);">⚠️ ' + overdueTasks.length + ' ' + T('empd2_overdue_alert') + '</strong> &nbsp;'
            + overdueTasks.slice(0,2).map(function(t){ return '<span style="color:var(--danger);">' + t.title + '</span>'; }).join(', ')
            + (overdueTasks.length > 2 ? ' +' + (overdueTasks.length - 2) + ' more' : '')
            + ' &nbsp;<button class="btn btn-sm btn-danger" onclick="empTabSwitch(\'work\')">' + T('empd2_btn_view_all') + '</button></div>';
    }

    // Today's focus
    html += '<div style="margin-bottom:18px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">🎯 ' + T('empd2_todays_focus') + '</div>';
    if (todayTasks.length === 0 && recentCl.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;padding:16px;text-align:center;background:var(--light-gray);border-radius:8px;">' + T('empd2_nothing_today') + '</div>';
    } else {
        if (todayTasks.length > 0) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">' + T('empd2_tasks_due_today') + '</div>';
            todayTasks.slice(0, 5).forEach(function(t) {
                html += _workItem(t, d.adminNames, true);
            });
        }
        // Departmental CHECKLISTS API assignments
        var _myDchkAssignments = [];
        if (typeof CHECKLISTS !== 'undefined') {
            _myDchkAssignments = CHECKLISTS.myAssignments(d.user);
        }
        var _todayStr = new Date().toISOString().slice(0, 10);
        var _pendingDchk = _myDchkAssignments.filter(function(a) {
            return !CHECKLISTS.hasAssignmentEntry(a.id, _todayStr);
        });
        if (_pendingDchk.length > 0) {
            html += '<div style="background:#fff3e0;border:1px solid #ffcc80;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">'
                + '<span style="font-size:13px;font-weight:600;">📋 ' + _pendingDchk.length + ' departmental checklist(s) pending today</span>'
                + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'departmental-checklist\')">Fill Now</button>'
                + '</div>';
        }

        // TODO items for today
        var _myTodos = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===d.user.username; });
        var _todayStr2 = new Date().toISOString().slice(0,10);
        var _todayTodos = _myTodos.filter(function(t){ return (t.date===_todayStr2||t.category==='daily') && t.status!=='completed'; });
        if (_todayTodos.length > 0) {
            html += '<div style="margin-top:8px;">'
                + '<div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;">' + T('empd2_todo_today_section', {n: _todayTodos.length}) + '</div>';
            _todayTodos.slice(0,4).forEach(function(t){
                var priColor = {low:'var(--secondary)',medium:'#e65100',high:'var(--danger)'}[t.priority]||'var(--gray)';
                html += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;">'
                    + '<input type="checkbox" onchange="empToggleTodo(\''+t.id+'\')" style="cursor:pointer;">'
                    + '<span>' + t.title + '</span>'
                    + '<span style="width:6px;height:6px;border-radius:50%;background:' + priColor + ';display:inline-block;"></span>'
                    + '</div>';
            });
            if (_todayTodos.length > 4) html += '<div style="font-size:11px;color:var(--primary);cursor:pointer;" onclick="empTabSwitch(\'todo\')">' + T('empd2_todo_more', {n: _todayTodos.length-4}) + '</div>';
            html += '</div>';
        }

        if (recentCl.length > 0 && AUTH.hasPermission(d.user, 'checklists')) {
            html += '<div style="font-size:12px;font-weight:600;color:var(--gray);margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px;">' + T('empd2_open_checklists') + '</div>';
            recentCl.slice(0, 3).forEach(function(cl) {
                var total = cl.items ? cl.items.length : 0;
                var done  = cl.items ? cl.items.filter(function(i){ return i.status === 'ok'; }).length : 0;
                var pct   = total > 0 ? Math.round((done/total)*100) : 0;
                html += '<div class="work-item"><div style="flex:1;">'
                    + '<div style="font-size:13px;font-weight:600;">' + cl.title + '</div>'
                    + '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">'
                    + '<div style="flex:1;max-width:180px;height:5px;background:var(--light-gray);border-radius:3px;"><div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:3px;"></div></div>'
                    + '<span style="font-size:11px;color:var(--gray);">' + done + '/' + total + '</span></div></div>'
                    + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">' + T('empd2_btn_open') + '</button></div>';
            });
        }
    }
    html += '</div>';

    // Two-column: recent tasks + quick actions
    html += '<div class="grid-2" style="gap:16px;">'
        + '<div>'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">📝 ' + T('empd2_recent_tasks') + '</div>';
    if (recentTasks.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">' + T('empd2_no_tasks_yet') + '</div>';
    } else {
        recentTasks.forEach(function(t) { html += _workItem(t, d.adminNames, false); });
    }
    html += '</div>';

    var user = d.user;
    var qaList = [
        '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'work\')">📝 ' + T('empd2_btn_view_tasks') + '</button>',
        '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'qgoals\')">🎯 Quarterly Goals & Priorities</button>',
        '<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'todo\')">📋 ' + T('empd2_tab_todo') + '</button>'
    ];
    if (AUTH.hasPermission(user, 'discounts')) {
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'discounts\')">🏷️ Discounts & Approvals</button>');
    }
    if (AUTH.hasPermission(user, 'purchases')) {
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'purchases\')">💰 Daily Purchases & Expenses</button>');
    }
    if (AUTH.hasPermission(user, 'checklists')) {
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empTabSwitch(\'checklists\')">✅ ' + T('empd2_btn_open_cl') + '</button>');
    }
    if (AUTH.hasPermission(user, 'problems')) {
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="Router.navigate(\'problems\')">🔧 ' + T('empd2_btn_report_prob') + '</button>');
    }
    if (AUTH.hasPermission(user, 'material-requests')) {
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empShowMatReqForm()">📦 ' + T('empd2_btn_mat_request') + '</button>');
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="empCreateReturn()">🔄 ' + T('empd2_btn_return_mat') + '</button>');
    }
    if (AUTH.hasPermission(user, 'reports')) {
        qaList.push('<button class="btn btn-outline" style="justify-content:flex-start;gap:8px;text-align:left;" onclick="showReportForm()">📈 ' + T('empd2_btn_submit_rep') + '</button>');
    }

    html += '<div>'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">⚡ ' + T('empd2_quick_actions') + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;">'
        + qaList.join('')
        + '</div>'
        + (pendingReqs.length > 0
            ? '<div style="margin-top:14px;"><div style="font-weight:600;font-size:13px;margin-bottom:6px;color:var(--gray);">' + T('empd2_pending_requests') + '</div>'
              + pendingReqs.map(function(r){ return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--light-gray);">' + (r.title||'Request') + ' <span class="badge badge-warning" style="font-size:10px;">' + T('empd2_pending_lbl') + '</span></div>'; }).join('')
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
        + '<div style="font-weight:700;font-size:16px;">📝 ' + T('empd2_my_tasks') + ' (' + d.myTasks.length + ')</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<span class="badge badge-warning" style="padding:5px 10px;">' + pending.length + ' ' + T('empd2_pending_lbl') + '</span>'
        + '<span class="badge badge-success" style="padding:5px 10px;">' + completed.length + ' ' + T('empd2_done_lbl') + '</span>'
        + '</div></div>';

    if (d.myTasks.length === 0) {
        html += '<div style="text-align:center;padding:32px;color:var(--gray);font-size:13px;">' + T('empd2_no_tasks') + '</div>';
    } else {
        var groups = [
            { label: T('empd2_grp_overdue'),  items: pending.filter(function(t){ return t.deadline && new Date(t.deadline) < new Date(); }) },
            { label: T('empd2_grp_today'),    items: pending.filter(function(t){ return _isToday(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date()); }) },
            { label: T('empd2_grp_week'),     items: pending.filter(function(t){ return _isThisWeek(t.deadline) && !_isToday(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date()); }) },
            { label: T('empd2_grp_later'),    items: pending.filter(function(t){ return !t.deadline || (!_isThisWeek(t.deadline) && !(t.deadline && new Date(t.deadline) < new Date())); }) },
            { label: T('empd2_grp_completed'),items: completed }
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
                    + (t.priority === 'high' ? '<span class="badge badge-danger" style="font-size:10px;">' + T('empd2_status_high') + '</span>' : t.priority === 'medium' ? '<span class="badge badge-warning" style="font-size:10px;">' + T('status_med') + '</span>' : '')
                    + '</div>'
                    + (t.description ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + t.description.substring(0,80) + (t.description.length>80?'…':'') + '</div>' : '')
                    + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">'
                    + (t.deadline ? (isOverdue ? '<span style="color:var(--danger);">⚠️ ' + T('empd2_due_lbl') + ' ' : '📅 ' + T('empd2_due_lbl') + ' ') + APP.formatDate(t.deadline) + (isOverdue?'</span>':'') : '')
                    + (t.createdBy ? ' &nbsp;·&nbsp; ' + T('empd2_from_lbl') + ' ' + t.createdBy : '')
                    + '</div></div>'
                    + '<span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status||'pending') + '</span>'
                    + (t.status !== 'completed'
                        ? '<button class="btn btn-sm btn-success" onclick="empUpdateTaskStatus(\'' + t.id + '\',\'' + (t._store||'tasks') + '\')" style="white-space:nowrap;">'
                          + (t.status === 'in-progress' ? T('empd2_status_mark_done') : T('empd2_status_start')) + '</button>'
                        : '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'tasks\')">' + T('empd2_btn_view') + '</button>')
                    + '</div>';
            });
            html += '</div>';
        });
    }

    // Projects
    if (d.myProjects.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">📋 ' + T('empd2_my_projects') + ' (' + d.myProjects.length + ')</div>';
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
        'pending':           { label: T('empd2_mr_waiting_hod'),  badge: 'badge-warning' },
        'hod_approved':      { label: T('empd2_mr_hod_approved'), badge: 'badge-info' },
        'hod_rejected':      { label: T('mr_hod_rejected'), badge: 'badge-danger' },
        'facility_approved': { label: T('mr_fac_approved'), badge: 'badge-info' },
        'facility_rejected': { label: T('mr_fac_rejected'), badge: 'badge-danger' },
        'store_fulfilled':   { label: T('mr_ready'),        badge: 'badge-success' },
        'confirmed':         { label: T('empd2_mr_confirmed'),    badge: 'badge-success' },
        'partial':           { label: T('empd2_mr_partial'),      badge: 'badge-warning' },
        'approved':          { label: T('mr_approved'),     badge: 'badge-success' },
        'rejected':          { label: T('empd2_mr_rejected'),     badge: 'badge-danger' }
    };
    if (d.myRequests.length > 0) {
        var storeFulfilledReqs = d.myRequests.filter(function(r){ return r.status === 'store_fulfilled'; });
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
            + '<div style="font-weight:700;font-size:15px;">&#128230; ' + T('empd2_my_mat_requests') + ' (' + d.myRequests.length + ')</div>'
            + '<button class="btn btn-sm btn-primary" onclick="empShowMatReqForm()">' + T('empd2_btn_new_request') + '</button></div>';
        if (storeFulfilledReqs.length > 0) {
            html += '<div style="background:#e8f5e9;border:2px solid var(--success);border-radius:8px;padding:10px 14px;margin-bottom:10px;">'
                + '<strong style="color:var(--success);">&#128230; ' + storeFulfilledReqs.length + ' ' + T('empd2_ready_collect') + '</strong></div>';
        }
        d.myRequests.slice().reverse().slice(0, 6).forEach(function(r) {
            var stInfo = empMatStatusMap[r.status] || { label: r.status || T('empd2_mr_waiting_hod'), badge: 'badge-warning' };
            var canConfirm = r.status === 'store_fulfilled';
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (r.title || T('mr_request')) + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + APP.formatDate(r.createdAt) + '</div>'
                + '</div>'
                + '<span class="badge ' + stInfo.badge + '" style="font-size:11px;">' + stInfo.label + '</span>'
                + (canConfirm
                    ? '<button class="btn btn-sm btn-success" onclick="empConfirmMatReq(\'' + r.id + '\',false)">' + T('empd2_btn_confirm') + '</button>'
                    + '<button class="btn btn-sm btn-warning" onclick="empConfirmMatReq(\'' + r.id + '\',true)">' + T('empd2_btn_partial') + '</button>'
                    : '')
                + '</div>';
        });
        html += '</div>';
    }

    // Problems assigned to me
    var assignedProbs = d.myProblems.filter(function(p) { return p.assignedTo === d.user.username && p.status !== 'resolved'; });
    if (assignedProbs.length > 0) {
        html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">'
            + '<div style="font-weight:700;font-size:15px;margin-bottom:10px;">&#128295; ' + T('empd2_prob_assigned') + ' (' + assignedProbs.length + ')</div>';
        assignedProbs.forEach(function(p) {
            var statusBadge = p.status === 'in_progress' ? 'badge-info' : 'badge-warning';
            html += '<div class="work-item" style="flex-wrap:wrap;gap:6px;">'
                + '<div style="flex:1;min-width:180px;">'
                + '<div style="font-size:13px;font-weight:600;">' + (p.title || '') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin-top:2px;">'
                + T('empd2_prob_category') + ' ' + (p.category || '-') + ' &middot; ' + APP.formatDate(p.createdAt)
                + (p.assignNote ? '<br>' + T('empd2_prob_note') + ' ' + p.assignNote : '')
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

    // Also load assignments from the CHECKLISTS API (new departmental system)
    var myAssignments = [];
    var empAsgnFreqMap = {};
    if (typeof CHECKLISTS !== 'undefined') {
        myAssignments = CHECKLISTS.myAssignments(user);
        myAssignments.forEach(function(a) {
            var freq = 'daily';
            if (a.refs && a.refs.length > 0) {
                var tpl = CHECKLISTS.getTemplate(a.refs[0].templateId);
                if (tpl && tpl.frequency) freq = tpl.frequency;
            }
            empAsgnFreqMap[a.id] = freq;
        });
    }
    window._empMyAssignments = myAssignments;
    window._empAsgnFreqMap = empAsgnFreqMap;

    var daily   = myChecklists.filter(function(c){ return !c.frequency || c.frequency === 'daily'; });
    var weekly  = myChecklists.filter(function(c){ return c.frequency === 'weekly'; });
    var monthly = myChecklists.filter(function(c){ return c.frequency === 'monthly'; });

    // Frequency counts including CHECKLISTS API assignments
    var ad = 0, aw = 0, am = 0;
    myAssignments.forEach(function(a) {
        var f = empAsgnFreqMap[a.id] || 'daily';
        if (f === 'daily') ad++; else if (f === 'weekly') aw++; else if (f === 'monthly') am++;
    });

    var html = '';

    var totalAll = myChecklists.length + myAssignments.length;
    var totalDaily = daily.length + ad;
    var totalWeekly = weekly.length + aw;
    var totalMonthly = monthly.length + am;

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'
        + '<div style="font-weight:700;font-size:16px;">✅ ' + T('empd2_cl_my_checklists')
        + ' <span class="badge badge-primary" style="font-size:11px;margin-left:4px;">' + totalAll + '</span></div>'
        + '</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;">'
        + '<button class="tab-btn active" onclick="filterEmpCl(\'all\',this)">' + T('empd2_cl_all') + ' (' + totalAll + ')</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'daily\',this)">' + T('empd2_cl_daily') + ' (' + totalDaily + ')</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'weekly\',this)">' + T('empd2_cl_weekly') + ' (' + totalWeekly + ')</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'monthly\',this)">' + T('empd2_cl_monthly') + ' (' + totalMonthly + ')</button>'
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
    var user = AUTH.currentUser();
    var myAssignments = window._empMyAssignments || [];
    var empAsgnFreqMap = window._empAsgnFreqMap || {};

    // Filter assignments by frequency too
    var filteredAsgns = myAssignments.filter(function(a) {
        var freq = empAsgnFreqMap[a.id] || 'daily';
        if (_empClFilter === 'daily')   return freq === 'daily';
        if (_empClFilter === 'weekly')  return freq === 'weekly';
        if (_empClFilter === 'monthly') return freq === 'monthly';
        return true;
    });

    // Floor detection for floor-based departments (e.g. IT)
    var needsFloor = typeof CHECKLISTS !== 'undefined' && CHECKLISTS.requiresFloor(user.department);
    var allFloors = [];
    if (needsFloor && filteredAsgns.length > 0) {
        filteredAsgns.forEach(function(a) {
            var items = CHECKLISTS.resolveAssignmentItems(a);
            items.forEach(function(it) {
                if (it.floorName && allFloors.indexOf(it.floorName) === -1) {
                    allFloors.push(it.floorName);
                }
            });
        });
        allFloors.sort();
    }

    var selectedFloor = window._empClAsgnFloor || (allFloors.length > 0 ? allFloors[0] : '');

    // Filter assignments by floor
    if (needsFloor && selectedFloor && filteredAsgns.length > 0) {
        filteredAsgns = filteredAsgns.filter(function(a) {
            var items = CHECKLISTS.resolveAssignmentItems(a);
            return items.some(function(it) { return it.floorName === selectedFloor; });
        });
    }

    // Old checklists filtered by frequency
    var filtered = checklists.filter(function(cl) {
        if (_empClFilter === 'daily')   return !cl.frequency || cl.frequency === 'daily';
        if (_empClFilter === 'weekly')  return cl.frequency === 'weekly';
        if (_empClFilter === 'monthly') return cl.frequency === 'monthly';
        return true;
    });

    // Shared empty state when both are empty
    if (filtered.length === 0 && filteredAsgns.length === 0) {
        var freqWordMap = { daily: T('empd2_freq_daily_cap'), weekly: T('empd2_freq_weekly_cap'), monthly: T('empd2_freq_monthly_cap') };
        var msg = _empClFilter === 'all'
            ? T('empd2_cl_none_all')
            : T('empd2_cl_none_filter').replace('{f}', freqWordMap[_empClFilter] || _empClFilter);
        el.innerHTML = '<div style="color:var(--gray);font-size:13px;padding:24px;text-align:center;background:var(--light-gray);border-radius:8px;">' + msg + '</div>';
        return;
    }

    var today = (typeof CHECKLISTS !== 'undefined' && CHECKLISTS.operDate) ? CHECKLISTS.operDate() : new Date().toISOString().slice(0, 10);
    var html = '';

    /* ─── Render CHECKLISTS API assignments ─── */
    if (filteredAsgns.length > 0) {
        if (needsFloor && allFloors.length > 1) {
            html += '<div class="form-group" style="margin-bottom:12px;max-width:300px;">'
                + '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">📍 ' + T('dchk_select_floor') + '</label>'
                + '<select class="form-control" onchange="window._empClAsgnFloor=this.value;_renderEmpChecklists(window._empChecklists||[])">';
            allFloors.forEach(function(f) {
                html += '<option value="' + f + '" ' + (f === selectedFloor ? 'selected' : '') + '>' + f + '</option>';
            });
            html += '</select></div>';
        }
        html += '<div style="margin-bottom:14px;">'
            + '<div style="font-weight:700;font-size:14px;margin-bottom:8px;">📋 ' + T('empd2_dept_assignments') + '</div>';

        var empStatusColors = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', report: '#fd7e14', pending: '#e9ecef' };
        var empStatusBgs  = { ok: '#f0faf0', fault: '#fff5f5', na: '#f5f5f5', report: '#fff8f0', pending: 'var(--bg)' };

        var empFreqBg   = { daily:'#e3f2fd', weekly:'#f3e5f5', monthly:'#e8f5e9' };
        var empFreqClr  = { daily:'#1565c0', weekly:'#6a1b9a', monthly:'#2e7d32' };
        var empFreqIcon = { daily:'🔄', weekly:'📅', monthly:'🗓️' };
        var empFreqCap  = { daily: T('empd2_freq_daily_cap'), weekly: T('empd2_freq_weekly_cap'), monthly: T('empd2_freq_monthly_cap') };

        filteredAsgns.forEach(function(a) {
            var items = CHECKLISTS.resolveAssignmentItems(a);
            var submitted = CHECKLISTS.hasAssignmentEntry(a.id, today);
            var asgnFloor = '';
            if (needsFloor && items.length > 0) {
                asgnFloor = items[0].floorName || '';
            }

            var af = empAsgnFreqMap[a.id] || 'daily';
            var afBg = empFreqBg[af] || '#e3f2fd';
            var afCl = empFreqClr[af] || '#1565c0';
            var afIc = empFreqIcon[af] || '🔄';

            if (!window._empClAsgnState) window._empClAsgnState = {};
            var draftKey = 'hms_draft_asgn_' + a.id;
            if (!window._empClAsgnState[a.id]) {
                var savedDraft = null;
                try { savedDraft = JSON.parse(localStorage.getItem(draftKey)); } catch(e) {}
                if (savedDraft && typeof savedDraft === 'object') {
                    window._empClAsgnState[a.id] = savedDraft;
                } else {
                    var st = {};
                    items.forEach(function(it) { st[it.itemId] = { status: 'pending', value: '', remarks: '' }; });
                    window._empClAsgnState[a.id] = st;
                }
            }

            html += '<div class="card" style="margin-bottom:10px;' + (submitted ? 'opacity:0.6;' : '') + '">'
                + '<div class="card-header" style="padding:8px 12px;">'
                + '<h3 style="font-size:14px;margin:0;">' + a.title
                + (asgnFloor ? ' <span style="font-size:12px;color:var(--gray);font-weight:400;">📍 ' + asgnFloor + '</span>' : '')
                + ' <span style="background:' + afBg + ';color:' + afCl + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">' + afIc + ' ' + (empFreqCap[af] || af) + '</span>'
                + '</h3>'
                + (submitted ? '<span class="badge badge-success" style="font-size:10px;">✓ ' + T('empd2_cl_submitted') + '</span>' : '')
                + '</div>'
                + '<div style="max-height:250px;overflow-y:auto;padding:4px 12px;">';

            items.forEach(function(it) {
                var st = (window._empClAsgnState[a.id] && window._empClAsgnState[a.id][it.itemId]) || { status: 'pending', value: '', remarks: '' };
                var sel = st.status || 'pending';
                var val = st.value || '';
                var rem = st.remarks || '';
                var sc = empStatusColors[sel] || '#e9ecef';
                var sbg = empStatusBgs[sel] || 'var(--bg)';
                var opts = ['ok','fault','report','na'].map(function(s) { return '<option value="' + s + '" ' + (sel === s ? 'selected' : '') + '>' + s.toUpperCase() + '</option>'; }).join('');
                html += '<div class="empClItem" data-status="' + sel + '" data-item-id="' + it.itemId + '" data-key="' + a.id + '" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:' + sbg + ';font-size:13px;flex-wrap:wrap;">'
                    + '<span style="display:inline-block;min-width:70px;text-align:center;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:' + sc + ';flex-shrink:0;">' + (sel !== 'pending' ? sel.toUpperCase() : 'PENDING') + '</span>'
                    + '<span style="flex:1;min-width:120px;">' + it.label + '</span>'
                    + (it.unit ? '<input type="number" step="any" value="' + val + '" ' + (submitted ? 'disabled' : '') + ' onchange="window._empClAsgnState[\'' + a.id + '\'][\'' + it.itemId + '\'].value=this.value;try{localStorage.setItem(\'' + draftKey + '\',JSON.stringify(window._empClAsgnState[\'' + a.id + '\']))}catch(e){}" style="width:80px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:12px;text-align:right;" placeholder="0">' : '')
                    + (it.unit ? '<span style="font-size:11px;font-weight:600;color:var(--gray);background:var(--card);padding:2px 7px;border-radius:4px;border:1px solid var(--border);flex-shrink:0;">' + it.unit + '</span>' : '')
                    + '<select ' + (submitted ? 'disabled' : '') + ' onchange="window._empClAsgnState[\'' + a.id + '\'][\'' + it.itemId + '\'].status=this.value;try{localStorage.setItem(\'' + draftKey + '\',JSON.stringify(window._empClAsgnState[\'' + a.id + '\']))}catch(e){};_renderEmpChecklists(window._empChecklists||[])" style="width:auto;padding:3px 4px;border:1px solid var(--border);border-radius:4px;font-size:12px;flex-shrink:0;">' + opts + '</select>'
                    + '</div>';
            });

            html += '</div>'
                + (!submitted ? '<div style="padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap;">'
                    + '<button class="btn btn-sm btn-success" onclick="empSubmitDeptAsgn(\'' + a.id + '\')" style="font-size:11px;padding:3px 8px;">📤 ' + T('empd2_cl_submit') + '</button>'
                    + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'departmental-checklist\')" style="font-size:11px;padding:3px 8px;">' + T('empd2_cl_open') + '</button>'
                    + '</div>' : '')
                + '</div>';
        });

        html += '</div>';
    }

    /* ─── Render old DB checklists ─── */
    if (filtered.length > 0) {
        var freqBg   = { daily:'#e3f2fd', weekly:'#f3e5f5', monthly:'#e8f5e9' };
        var freqClr  = { daily:'#1565c0', weekly:'#6a1b9a', monthly:'#2e7d32' };
        var freqIcon = { daily:'🔄', weekly:'📅', monthly:'🗓️' };
        var empStatusColors = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', problem: '#fd7e14', pending: '#e9ecef' };
        var empStatusBgs  = { ok: '#f0faf0', fault: '#fff5f5', na: '#f5f5f5', problem: '#fff8f0', pending: 'var(--bg)' };
        filtered.forEach(function(cl) {
            var freq  = cl.frequency || 'daily';
            var total = cl.items ? cl.items.length : 0;
            var done  = cl.items ? cl.items.filter(function(i){ return i.status && i.status !== 'pending'; }).length : 0;
            var pct   = total > 0 ? Math.round((done / total) * 100) : 0;
            var isDue = cl.deadline && _isToday(cl.deadline);
            var bg    = freqBg[freq]  || '#e3f2fd';
            var clr   = freqClr[freq] || '#1565c0';
            var icon  = freqIcon[freq]|| '🔄';
            var freqCap = { daily: T('empd2_freq_daily_cap'), weekly: T('empd2_freq_weekly_cap'), monthly: T('empd2_freq_monthly_cap') }[freq] || (freq.charAt(0).toUpperCase() + freq.slice(1));
            var periodRef = (freq === 'weekly' && cl.weekDate) ? new Date(cl.weekDate) : null;
            var periodLabel = _clPeriodLabel(freq, periodRef);
            var timeLeft    = _clTimeUntil(_clNextReset(freq));
            var submitted   = !!cl.periodSubmitted;

            html += '<div class="work-item' + (isDue ? ' urgent' : '') + '" style="flex-direction:column;align-items:stretch;gap:8px;border-left:4px solid ' + clr + ';">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">'
                + '<div>'
                + '<div style="font-size:14px;font-weight:600;">' + (cl.title || '') + (cl.floor ? ' <span style="font-size:11px;color:var(--gray);">· ' + cl.floor + '</span>' : '') + '</div>'
                + '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:4px;">'
                + '<span style="background:' + bg + ';color:' + clr + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">' + icon + ' ' + freqCap + '</span>'
                + '<span style="font-size:11px;color:var(--gray);">' + periodLabel + '</span>'
                + (periodRef ? '<span style="background:#ede7f6;color:#4527a0;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">📅 ' + new Date(cl.weekDate).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) + ' (set by HOD/Admin)</span>' : '')
                + (periodRef ? '' : '<span style="font-size:11px;color:var(--gray);">' + T('empd2_cl_resets_in') + ' ' + timeLeft + '</span>')
                + (submitted ? '<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">' + T('empd2_cl_submitted') + '</span>' : '')
                + '</div>'
                + '</div>'
                + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'
                + '<span class="badge ' + (cl.status === 'completed' ? 'badge-success' : 'badge-info') + '" style="font-size:11px;">' + (cl.status || 'active') + '</span>'
                + (!submitted ? '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">' + T('empd2_cl_submit') + '</button>' : '')
                + '<button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')" style="font-size:11px;padding:3px 8px;">' + T('empd2_cl_open') + '</button>'
                + '</div></div>'
                + '<div style="display:flex;align-items:center;gap:8px;">'
                + '<div style="flex:1;height:8px;background:var(--light-gray);border-radius:4px;"><div style="height:100%;width:' + pct + '%;background:' + (pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)') + ';border-radius:4px;transition:width .3s;"></div></div>'
                + '<span style="font-size:12px;color:var(--gray);min-width:55px;">' + done + '/' + total + ' ' + T('empd2_done_word') + '</span>'
                + '</div>'
                + (cl.deadline ? '<div style="font-size:11px;color:' + (isDue ? 'var(--warning)' : 'var(--gray)') + ';">' + T('empd2_cl_deadline') + APP.formatDate(cl.deadline) + '</div>' : '');

            if (cl.items && cl.items.length > 0) {
                html += '<div style="max-height:220px;overflow-y:auto;margin-top:6px;padding:4px;border-top:1px solid var(--border);">';
                cl.items.forEach(function(item, idx) {
                    var sel = item.status || 'pending';
                    var val = item.value !== undefined ? item.value : '';
                    var sc = empStatusColors[sel] || '#e9ecef';
                    var sbg = empStatusBgs[sel] || 'var(--bg)';
                    var opts = ['ok','fault','problem','na'].map(function(s) { return '<option value="' + s + '" ' + (sel === s ? 'selected' : '') + '>' + s.toUpperCase() + '</option>'; }).join('');
                    html += '<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;margin-bottom:4px;border-radius:4px;background:' + sbg + ';font-size:12px;flex-wrap:wrap;">'
                        + '<span style="display:inline-block;min-width:60px;text-align:center;padding:2px 4px;border-radius:3px;font-size:10px;font-weight:600;color:white;background:' + sc + ';flex-shrink:0;">' + (sel !== 'pending' ? sel.toUpperCase() : 'PENDING') + '</span>'
                        + '<span style="flex:1;min-width:110px;">' + item.task + '</span>'
                        + (item.unit ? '<input type="number" step="any" value="' + val + '" ' + (submitted ? 'disabled' : '') + ' onchange="updateClItemValue(\'' + cl.id + '\',' + idx + ',this.value)" style="width:75px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;font-size:11px;text-align:right;" placeholder="0">' : '')
                        + (item.unit ? '<span style="font-size:10px;font-weight:600;color:var(--gray);background:var(--card);padding:2px 5px;border-radius:3px;border:1px solid var(--border);flex-shrink:0;">' + item.unit + '</span>' : '')
                        + '<select ' + (submitted ? 'disabled' : '') + ' onchange="updateClItemStatus(\'' + cl.id + '\',' + idx + ',this.value)" style="width:auto;padding:2px 4px;border:1px solid var(--border);border-radius:4px;font-size:11px;flex-shrink:0;">' + opts + '</select>'
                        + '</div>';
                });
                html += '</div>';
            }

            html += '</div>';
        });
    }

    el.innerHTML = html;
    try {
        el.querySelectorAll('.empClItem[data-status="report"]').forEach(function(el2) {
            var itemId = el2.dataset.itemId;
            var key = el2.dataset.key;
            if (!itemId || !key) return;
            var existing = el2.querySelector('.empClProblemDesc');
            if (existing) { existing.remove(); }
            var div = document.createElement('div');
            div.className = 'empClProblemDesc';
            div.style.cssText = 'width:100%;margin-top:6px;padding:8px;background:#fff3e0;border:1px solid #ffcc02;border-radius:6px;';
            div.innerHTML = '<div style="font-size:11px;font-weight:600;color:#e65100;margin-bottom:4px;">⚠️ Problem Description</div>'
                + '<textarea rows="2" placeholder="Describe the problem in detail..." style="width:100%;padding:8px;border:1px solid #ffb300;border-radius:4px;font-size:13px;resize:vertical;background:#fff;color:#333;">'
                + ((window._empClAsgnState[key] && window._empClAsgnState[key][itemId] && window._empClAsgnState[key][itemId].remarks) || '')
                + '</textarea>';
            var ta = div.querySelector('textarea');
            ta.oninput = function() {
                if (window._empClAsgnState[key] && window._empClAsgnState[key][itemId]) {
                    window._empClAsgnState[key][itemId].remarks = this.value;
                    try { localStorage.setItem('hms_draft_asgn_' + key, JSON.stringify(window._empClAsgnState[key])); } catch(e) {}
                }
            };
            el2.appendChild(div);
        });
    } catch(e) {
        if (el) el.insertAdjacentHTML('afterbegin', '<div style="background:#ffebee;color:#c62828;padding:4px;font-size:11px;">Error rendering: ' + e.message + '</div>');
    }
}

async function empHandlePhotoUpload(asgnId, itemId, input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (typeof APP !== 'undefined') APP.notify('Compressing & uploading photo...', 'info');
    try {
        var photoObj = await window.uploadChecklistPhoto(file, { subfolder: 'checklists/' + asgnId });
        if (!window._empClAsgnState) window._empClAsgnState = {};
        if (!window._empClAsgnState[asgnId]) window._empClAsgnState[asgnId] = {};
        if (!window._empClAsgnState[asgnId][itemId]) window._empClAsgnState[asgnId][itemId] = { status: 'pending', value: '', remarks: '', photos: [] };
        if (!window._empClAsgnState[asgnId][itemId].photos) window._empClAsgnState[asgnId][itemId].photos = [];
        window._empClAsgnState[asgnId][itemId].photos.push(photoObj);

        var draftKey = 'hms_draft_asgn_' + asgnId;
        try { localStorage.setItem(draftKey, JSON.stringify(window._empClAsgnState[asgnId])); } catch(e) {}

        if (typeof APP !== 'undefined') APP.notify('Photo attached ✓', 'success');
        _renderEmpChecklists(window._empChecklists || []);
    } catch (err) {
        console.error('[HMS Photo] Upload error:', err);
        if (typeof APP !== 'undefined') APP.notify('Failed to attach photo: ' + err.message, 'error');
    }
}

function empRemovePhoto(asgnId, itemId, photoIdx) {
    if (window._empClAsgnState && window._empClAsgnState[asgnId] && window._empClAsgnState[asgnId][itemId] && window._empClAsgnState[asgnId][itemId].photos) {
        window._empClAsgnState[asgnId][itemId].photos.splice(photoIdx, 1);
        var draftKey = 'hms_draft_asgn_' + asgnId;
        try { localStorage.setItem(draftKey, JSON.stringify(window._empClAsgnState[asgnId])); } catch(e) {}
        _renderEmpChecklists(window._empChecklists || []);
    }
}

function empSubmitDeptAsgn(assignmentId) {
    if (!window.CHECKLISTS) return;
    var user = AUTH.currentUser();
    var today = (typeof CHECKLISTS !== 'undefined' && CHECKLISTS.operDate) ? CHECKLISTS.operDate() : new Date().toISOString().slice(0, 10);
    var asgn = CHECKLISTS.getAssignment(assignmentId);
    var items = asgn ? CHECKLISTS.resolveAssignmentItems(asgn) : [];
    var draftKey = 'hms_draft_asgn_' + assignmentId;
    var state = (window._empClAsgnState && window._empClAsgnState[assignmentId]) || {};
    if (!Object.keys(state).length) {
        try { state = JSON.parse(localStorage.getItem(draftKey)) || {}; } catch(e) {}
    }

    var pendingCount = 0;
    items.forEach(function(it) {
        var key = it.itemId || it.id;
        var s = state[key] || state[it.itemId] || state[it.id] || {};
        if (!s.status || s.status === 'pending') pendingCount++;
    });

    if (items.length > 0 && pendingCount === items.length) {
        APP.notify('Please fill out the checklist items before submitting.', 'error');
        return;
    }
    if (pendingCount > 0) {
        if (!confirm('You have ' + pendingCount + ' item(s) still pending. Do you want to submit anyway?')) {
            return;
        }
    }

    var startResult = CHECKLISTS.startAssignmentEntry(user, assignmentId, today);
    if (!startResult.success) { APP.notify(startResult.message, 'error'); return; }
    var entry = startResult.entry;
    entry.items.forEach(function(it) {
        var s = state[it.itemId] || state[it.id] || {};
        if (entry.results[it.itemId]) {
            entry.results[it.itemId].status = s.status || 'pending';
            entry.results[it.itemId].value = s.value || '';
            entry.results[it.itemId].remarks = s.remarks || '';
        }
    });
    var submitResult = CHECKLISTS.submitAssignmentEntry(user, entry);
    if (!submitResult.success) { APP.notify(submitResult.message, 'error'); return; }
    APP.notify(T('dchk_assigned_ok'), 'success');
    _renderEmpChecklists(window._empChecklists || []);
}

function empSubmitClPeriod(id) {
    var user = AUTH.currentUser();
    if (!user) return;
    var cl = DB.getById('checklists', id);
    if (!cl) return;
    var freq = cl.frequency || 'daily';
    var refDate = (freq === 'weekly' && cl.weekDate) ? new Date(cl.weekDate) : null;
    var periodKey = _clPeriodKey(freq, refDate);
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
   TODO TAB (daily + future tasks)
══════════════════════════════════════════ */
var _empTodoReminderTimers = [];

function loadEmpTodos(user) {
    return (DB.get('employeeTodos') || []).filter(function(t){ return t.createdBy === user.username; });
}

function empAddTodo() {
    var inp = document.getElementById('empTodoInput');
    if (!inp) return;
    var title = inp.value.trim();
    if (!title) { APP.notify('Enter a task', 'error'); return; }
    var user = AUTH.currentUser();
    if (!user) return;
    var today = new Date().toISOString().slice(0,10);
    DB.add('employeeTodos', {
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
        completedAt: null,
        sortOrder: Date.now()
    });
    inp.value = '';
    APP.notify('TODO added ✓', 'success');
    renderEmpTodoTab(document.getElementById('empTabContent'));
}

function empToggleTodo(id) {
    var todo = DB.getById('employeeTodos', id);
    if (!todo) return;
    var newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    var updates = { status: newStatus };
    if (newStatus === 'completed') updates.completedAt = new Date().toISOString();
    else updates.completedAt = null;
    DB.update('employeeTodos', id, updates);
    APP.notify(newStatus === 'completed' ? 'Marked done ✓' : 'Reopened', newStatus === 'completed' ? 'success' : 'info');
    renderEmpTodoTab(document.getElementById('empTabContent'));
}

function empDeleteTodo(id) {
    if (!confirm('Delete this TODO?')) return;
    DB.delete('employeeTodos', id);
    APP.notify('Deleted', 'info');
    renderEmpTodoTab(document.getElementById('empTabContent'));
}

function empSaveFutureTodo() {
    var user = AUTH.currentUser();
    if (!user) return;
    var title = (document.getElementById('empFutureTodoTitle')||{}).value || '';
    var desc  = (document.getElementById('empFutureTodoDesc')||{}).value || '';
    var date  = (document.getElementById('empFutureTodoDate')||{}).value || '';
    var priority = (document.getElementById('empFutureTodoPriority')||{}).value || 'medium';
    var reminder = (document.getElementById('empFutureTodoReminder')||{}).checked || false;
    var reminderMin = parseInt((document.getElementById('empFutureTodoReminderMin')||{}).value) || 30;
    if (!title.trim()) { APP.notify('Enter a title', 'error'); return; }
    if (!date) { APP.notify('Select a due date', 'error'); return; }
    DB.add('employeeTodos', {
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
        completedAt: null,
        sortOrder: Date.now()
    });
    APP.notify('Future TODO saved ✓', 'success');
    renderEmpTodoTab(document.getElementById('empTabContent'));
}

function empCheckTodoReminders(todos, user) {
    var now = new Date();
    var today = now.toISOString().slice(0,10);
    todos.forEach(function(t) {
        if (t.status === 'completed') return;
        if (t.reminder && t.date === today) {
            var due = new Date(t.dueDate + 'T' + (t.dueTime || '17:00'));
            var diffMs = due - now;
            if (diffMs > 0 && diffMs < t.reminderMinutes * 60 * 1000) {
                if (typeof HMS_REM !== 'undefined' && HMS_REM.requestPermission()) {
                    HMS_REM.schedule('TODO Reminder', '"' + t.title + '" is due soon!', diffMs);
                }
            }
        }
    });
}

function renderEmpTodoTab(el) {
    var user = AUTH.currentUser();
    if (!user) return;
    var todos = loadEmpTodos(user);
    var today = new Date().toISOString().slice(0,10);

    // Split into daily (today) and future
    var dailyTodos = todos.filter(function(t){ return t.category === 'daily' || t.date === today; });
    var futureTodos = todos.filter(function(t){ return t.category === 'future' && t.date !== today; });
    var pendingDaily = dailyTodos.filter(function(t){ return t.status !== 'completed'; });
    var completedDaily = dailyTodos.filter(function(t){ return t.status === 'completed'; });
    var pendingFuture = futureTodos.filter(function(t){ return t.status !== 'completed'; });

    // Check reminders
    empCheckTodoReminders(todos, user);

    function todoItem(t, isFuture) {
        var priColor = { low:'var(--secondary)', medium:'#e65100', high:'var(--danger)' }[t.priority] || 'var(--gray)';
        var checked = t.status === 'completed' ? 'checked' : '';
        var opacity = t.status === 'completed' ? 'opacity:0.6;' : '';
        var dueLabel = isFuture ? '<span style="font-size:10px;color:var(--gray);margin-left:6px;">📅 ' + APP.formatDate(t.date) + '</span>' : '';
        var remLabel = t.reminder ? '<span style="font-size:10px;color:var(--primary);margin-left:4px;">🔔 ' + t.reminderMinutes + 'min</span>' : '';
        var descHtml = t.description ? '<div style="font-size:11px;color:var(--gray);margin-top:2px;">' + t.description.substring(0,80) + '</div>' : '';
        return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:4px;' + opacity + '">'
            + '<input type="checkbox" ' + checked + ' onchange="empToggleTodo(\'' + t.id + '\')" style="margin-top:3px;cursor:pointer;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">'
            + '<span style="font-size:13px;font-weight:' + (t.status==='completed'?'400':'600') + ';' + (t.status==='completed'?'text-decoration:line-through;':'') + '">' + t.title + '</span>'
            + '<span style="width:8px;height:8px;border-radius:50%;background:' + priColor + ';display:inline-block;"></span>'
            + dueLabel + remLabel
            + '</div>' + descHtml
            + '</div>'
            + '<button class="btn btn-sm" style="background:transparent;color:var(--danger);padding:2px 6px;font-size:14px;" onclick="empDeleteTodo(\'' + t.id + '\')" title="' + T('empd2_todo_delete_title') + '">✕</button>'
            + '</div>';
    }

    var html = '';

    // ── Daily TODO section ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
        + '<div style="font-weight:700;font-size:15px;">' + T('empd2_todo_title_today', {n: pendingDaily.length}) + '</div>'
        + '<span style="font-size:11px;color:var(--gray);">' + new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long'}) + '</span>'
        + '</div>'
        // Quick add
        + '<div style="display:flex;gap:6px;margin-bottom:12px;">'
        + '<input type="text" id="empTodoInput" placeholder="' + T('empd2_todo_add_placeholder') + '" style="flex:1;padding:8px 12px;border:2px solid var(--border);border-radius:8px;font-size:13px;outline:none;" onkeydown="if(event.key===\'Enter\')empAddTodo()">'
        + '<button class="btn btn-sm btn-primary" onclick="empAddTodo()" style="padding:8px 16px;">' + T('empd2_todo_btn_add') + '</button>'
        + '</div>';

    if (pendingDaily.length === 0 && completedDaily.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:20px;">' + T('empd2_todo_empty_today') + '</div>';
    } else {
        pendingDaily.forEach(function(t){ html += todoItem(t, false); });
        if (completedDaily.length > 0) {
            html += '<div style="margin-top:10px;font-size:11px;color:var(--gray);cursor:pointer;" onclick="var n=this.nextElementSibling;n.style.display=n.style.display===\'none\'?\'block\':\'none\'">' + T('empd2_todo_completed_count', {n: completedDaily.length}) + '</div>'
                + '<div style="display:none;margin-top:4px;">';
            completedDaily.forEach(function(t){ html += todoItem(t, false); });
            html += '</div>';
        }
    }
    html += '</div>';

    // ── Future TODO section ──
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">' + T('empd2_todo_title_future', {n: pendingFuture.length}) + '</div>'
        // Add form
        + '<div style="background:var(--light-gray);border-radius:8px;padding:12px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
        + '<input type="text" id="empFutureTodoTitle" placeholder="' + T('empd2_todo_future_title_placeholder') + '" style="grid-column:1/-1;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;outline:none;">'
        + '<textarea id="empFutureTodoDesc" placeholder="' + T('empd2_todo_future_desc_placeholder') + '" style="grid-column:1/-1;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;outline:none;resize:vertical;min-height:50px;"></textarea>'
        + '<div><label style="font-size:11px;color:var(--gray);display:block;margin-bottom:2px;">' + T('empd2_todo_future_due_label') + '</label><input type="date" id="empFutureTodoDate" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;"></div>'
        + '<div><label style="font-size:11px;color:var(--gray);display:block;margin-bottom:2px;">' + T('empd2_todo_future_priority_label') + '</label><select id="empFutureTodoPriority" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;">'
        + '<option value="low">' + T('empd2_todo_future_priority_low') + '</option><option value="medium" selected>' + T('empd2_todo_future_priority_medium') + '</option><option value="high">' + T('empd2_todo_future_priority_high') + '</option></select></div>'
        + '<div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="empFutureTodoReminder" style="cursor:pointer;"> <label for="empFutureTodoReminder" style="font-size:12px;cursor:pointer;">' + T('empd2_todo_future_reminder') + '</label></div>'
        + '<div><select id="empFutureTodoReminderMin" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;">'
        + '<option value="15">' + T('empd2_todo_future_reminder_15') + '</option><option value="30" selected>' + T('empd2_todo_future_reminder_30') + '</option><option value="60">' + T('empd2_todo_future_reminder_60') + '</option><option value="1440">' + T('empd2_todo_future_reminder_1440') + '</option></select></div>'
        + '<button class="btn btn-sm btn-primary" onclick="empSaveFutureTodo()" style="grid-column:1/-1;padding:8px;">' + T('empd2_todo_btn_add_future') + '</button>'
        + '</div>';

    if (pendingFuture.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;text-align:center;padding:16px;">' + T('empd2_todo_empty_future') + '</div>';
    } else {
        // Group by date
        var dateGroups = {};
        pendingFuture.concat(futureTodos.filter(function(t){ return t.status === 'completed'; })).forEach(function(t){
            var g = t.date || 'unscheduled';
            if (!dateGroups[g]) dateGroups[g] = { label: g, items: [] };
            dateGroups[g].items.push(t);
        });
        var sortedDates = Object.keys(dateGroups).sort();
        sortedDates.forEach(function(d) {
            if (d === 'unscheduled') return;
            var grp = dateGroups[d];
            var grpDone = grp.items.filter(function(t){ return t.status === 'completed'; }).length;
            html += '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;">📅 ' + APP.formatDate(d) + ' (' + grpDone + '/' + grp.items.length + ')</div>';
            grp.items.forEach(function(t){ html += todoItem(t, true); });
            html += '</div>';
        });
    }
    html += '</div>';

    el.innerHTML = html;
    document.getElementById('empFutureTodoDate').valueAsDate = new Date(new Date().getTime() + 86400000);
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
    var myTodos  = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===d.user.username; });
    var todoDone = myTodos.filter(function(t){ return t.status==='completed'; }).length;
    var todoPend = myTodos.length - todoDone;

    function _sBox(val, lbl, color) {
        return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center;min-width:90px;">'
            + '<div style="font-size:20px;font-weight:700;color:' + color + ';">' + val + '</div>'
            + '<div style="font-size:10px;color:var(--gray);margin-top:2px;">' + lbl + '</div></div>';
    }

    var html = '';

    // ── Comprehensive Report Actions ──
    html += '<div style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);border-radius:12px;padding:16px 20px;color:#fff;margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">'
        + '<div><div style="font-size:16px;font-weight:700;">📊 ' + T('empd2_rep_comprehensive') + '</div>'
        + '<div style="font-size:12px;opacity:0.8;margin-top:2px;">' + d.user.fullName + ' &nbsp;·&nbsp; ' + (d.dept||'No Dept') + ' &nbsp;·&nbsp; ' + new Date().toLocaleDateString('en-IN') + '</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
        + '<button class="btn btn-sm" style="background:#fff;color:#1a237e;padding:6px 12px;font-weight:600;" onclick="showReportForm()">' + T('empd2_rep_send_hod') + '</button>'
        + '<button class="btn btn-sm" style="background:#25D366;color:#fff;border:none;padding:6px 12px;font-weight:600;" onclick="empShareFullWorkReport()">💬 ' + T('empd2_rep_whatsapp') + '</button>'
        + '<button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.4);padding:6px 12px;" onclick="empDownloadFullReport()">' + T('empd2_rep_excel') + '</button>'
        + '</div></div>'
        // Stats row
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px;margin-top:12px;">'
        + _sBox(tDone+'/'+tasks.length,  T('empd2_rep_tasks'),         '#a5d6a7')
        + _sBox(tOverdue,                T('empd2_rep_overdue'),       '#ef9a9a')
        + _sBox(pOpen,                   T('empd2_rep_issues'),        '#ef9a9a')
        + _sBox(clRate+'%',              T('empd2_rep_checklist'),     '#80cbc4')
        + _sBox(reqs.length,             T('empd2_rep_requests'),      '#b39ddb')
        + _sBox(todoPend,                T('empd2_rep_todo_pending'),  '#fff176')
        + _sBox(todoDone,                T('empd2_rep_todo_done'),     '#a5d6a7')
        + '</div></div>';

    // Problems section
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-weight:700;font-size:15px;">🔧 ' + T('empd2_rep_my_problems', {n: probs.length}) + '</div>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'problems\')">' + T('empd2_btn_report_problem') + '</button></div>';
    if (probs.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;margin-bottom:16px;">' + T('empd2_rep_no_problems') + '</div>';
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
        + '<div style="font-weight:700;font-size:15px;">📋 ' + T('empd2_rep_my_reports', {n: d.myReports.length}) + '</div>'
        + '<button class="btn btn-sm btn-primary" onclick="showReportForm()">' + T('empd2_btn_new_report') + '</button></div>';
    if (d.myReports.length === 0) {
        html += '<div style="color:var(--gray);font-size:13px;">' + T('empd2_rep_no_reports') + '</div>';
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

    var html = '<div style="font-weight:700;font-size:16px;margin-bottom:16px;">📊 ' + T('empd2_perf_my_performance') + ' — ' + q.name + '</div>'

        + '<div class="grid-2" style="gap:20px;margin-bottom:24px;">'
        + _perfCard(T('empd2_perf_task_completion'), tasksDone, d.myTasks.length, taskRate, 'var(--success)')
        + _perfCard(T('empd2_perf_problem_resolution'), probsSolved, d.myProblems.length, probRate, 'var(--info)')
        + _perfCard(T('empd2_perf_request_approval'), reqApproved, d.myRequests.length, reqRate, 'var(--warning)')
        + _perfCard(T('empd2_perf_checklist_compliance'), clDone, d.myChecklists.length, clRate, 'var(--primary)')
        + '</div>'

        + '<div style="background:var(--light-gray);border-radius:10px;padding:16px;">'
        + '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">' + T('empd2_perf_q_summary') + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">'
        + _summaryNum(d.myTasks.length, T('empd2_perf_total_tasks'))
        + _summaryNum(tasksDone, T('empd2_perf_completed'))
        + _summaryNum(d.myTasks.filter(function(t){return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed';}).length, T('empd2_perf_overdue'), 'var(--danger)')
        + _summaryNum(d.myChecklists.length, T('empd2_perf_checklists'))
        + _summaryNum(d.myProblems.length, T('empd2_perf_issues_raised'))
        + _summaryNum(d.myRequests.length, T('empd2_perf_requests_sent'))
        + '</div></div>';

    el.innerHTML = html;
}

function _perfCard(label, done, total, pct, color) {
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;">'
        + '<div style="font-size:13px;font-weight:600;margin-bottom:10px;">' + label + '</div>'
        + '<div class="q-progress-track" style="height:20px;margin-bottom:6px;"><div class="q-progress-fill" style="width:' + pct + '%;background:' + color + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">' + (pct > 10 ? pct + '%' : '') + '</div></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray);">'
        + '<span>' + done + ' ' + T('empd2_done_word') + '</span><span>' + total + ' ' + T('empd2_total_word') + '</span></div></div>';
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
            + '<div><div style="font-weight:700;font-size:15px;color:#e65100;">' + T('empd2_clean_rooms_need').replace('{n}', pending.length) + '</div>'
            + '<div style="font-size:13px;color:var(--gray);">' + T('empd2_clean_discharged_sub') + '</div></div></div>';
    } else {
        html += '<div style="background:#e8f5e9;border:2px solid var(--secondary);border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">'
            + '<span style="font-size:28px;">✅</span>'
            + '<div><div style="font-weight:700;font-size:15px;color:var(--secondary);">' + T('empd2_clean_all_clean') + '</div>'
            + '<div style="font-size:13px;color:var(--gray);">' + T('empd2_clean_none_sub') + '</div></div></div>';
    }

    if (pending.length > 0) {
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:20px;">';
        pending.forEach(function(t) {
            var since  = t.dischargedAt ? Math.max(0, APP.daysBetween(t.dischargedAt, new Date().toISOString())) : 0;
            var urgency = since >= 1 ? '#ffebee' : '#fff8e1';
            var border  = since >= 1 ? 'var(--danger)' : 'var(--warning)';
            html += '<div style="background:' + urgency + ';border:2px solid ' + border + ';border-radius:10px;padding:14px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
                + '<span style="font-size:22px;font-weight:700;">' + T('empd2_clean_room') + ' ' + t.roomNo + '</span>'
                + '<span class="badge ' + (t.status==='in-progress'?'badge-info':'badge-warning') + '">' + t.status + '</span></div>'
                + '<div style="font-size:12px;color:var(--gray);margin-bottom:6px;">'
                + (t.floor?T('empd2_clean_floor')+' '+t.floor+' | ':'') + (t.category||'') + (t.bedId?' | '+T('empd2_clean_bed')+' '+t.bedId:'')
                + '</div>'
                + '<div style="font-size:13px;margin-bottom:4px;">👤 <strong>' + t.patientName + '</strong></div>'
                + '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">'
                + T('empd2_clean_discharged') + (t.dischargedAt ? new Date(t.dischargedAt).toLocaleDateString('en-IN') : '—')
                + (since > 0 ? ' &nbsp;·&nbsp; <span style="color:var(--danger);font-weight:600;">' + since + T('empd2_clean_d_ago') + '</span>' : ' &nbsp;·&nbsp; ' + T('empd2_clean_today'))
                + '</div>'
                + (t.assignedTo ? '<div style="font-size:12px;margin-bottom:6px;">👷 ' + t.assignedTo + '</div>' : '')
                + '<div style="display:flex;gap:6px;">'
                + (t.status==='pending' ? '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="empStartCleaning(\'' + t.id + '\')">' + T('empd2_clean_start') + '</button>' : '')
                + '<button class="btn btn-sm btn-success" onclick="empCompleteCleaning(\'' + t.id + '\')">' + T('empd2_clean_mark') + '</button>'
                + '</div></div>';
        });
        html += '</div>';
    }

    if (myDone.length > 0) {
        html += '<div style="font-weight:600;font-size:14px;color:var(--gray);margin-bottom:8px;">' + T('empd2_clean_by_you') + '</div>'
            + '<div class="table-responsive"><table><thead><tr><th>' + T('empd2_clean_room') + '</th><th>' + T('empd2_clean_th_patient') + '</th><th>' + T('empd2_clean_th_completed') + '</th></tr></thead><tbody>';
        myDone.slice().reverse().slice(0,10).forEach(function(t) {
            html += '<tr><td><strong>' + t.roomNo + '</strong></td><td>' + t.patientName + '</td>'
                + '<td>' + (t.completedAt ? APP.formatDateTime(t.completedAt) : '—') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    el.innerHTML = html || '<div class="empty-state">' + T('empd2_clean_no_tasks') + '</div>';
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
    var todos  = (DB.get('employeeTodos') || []).filter(function(t){ return t.createdBy === d.user.username; });

    var tDone  = tasks.filter(function(t){ return t.status==='completed'; });
    var tProg  = tasks.filter(function(t){ return t.status==='in-progress'; });
    var tPend  = tasks.filter(function(t){ return t.status==='pending'; });
    var tOver  = tasks.filter(function(t){ return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed'; });
    var pOpen  = probs.filter(function(p){ return p.status!=='resolved'; });
    var pRes   = probs.filter(function(p){ return p.status==='resolved'; });
    var clDone = cls.filter(function(c){ return c.status==='completed'; });
    var clRate = cls.length > 0 ? Math.round(clDone.length/cls.length*100) : 0;
    var todoDone = todos.filter(function(t){ return t.status==='completed'; });
    var todoPend = todos.filter(function(t){ return t.status!=='completed'; });

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

    lines.push('');
    lines.push('── TODO ──');
    lines.push('Total: ' + todos.length + ' | Done: ' + todoDone.length + ' | Pending: ' + todoPend.length);
    if (todoPend.length > 0) {
        lines.push('');
        lines.push('Pending Items:');
        todoPend.forEach(function(t, i){
            lines.push('  ' + (i+1) + '. ' + t.title + (t.date === new Date().toISOString().slice(0,10) ? ' (Today)' : ' (Due: ' + APP.formatDate(t.date) + ')'));
        });
    }
    if (todoDone.length > 0) {
        lines.push('');
        lines.push('Completed:');
        todoDone.slice(0,5).forEach(function(t, i){
            lines.push('  ' + (i+1) + '. ' + t.title + (t.completedAt ? ' ✓' : ''));
        });
        if (todoDone.length > 5) lines.push('  ... and ' + (todoDone.length-5) + ' more completed');
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
    // Attach comprehensive snapshot including checklist items with individual status
    var d = _empData;
    if (d && d.myTasks) {
        data._tasksDone    = (d.myTasks.filter(function(t){ return t.status==='completed'; })).length;
        data._tasksTotal   = d.myTasks.length;
        data._probsOpen    = (d.myProblems||[]).filter(function(p){ return p.status!=='resolved'; }).length;
        data._probsTotal   = (d.myProblems||[]).length;
        data._reqsTotal    = (d.myRequests||[]).length;
        data._clRate       = d.myChecklists&&d.myChecklists.length>0 ? Math.round(d.myChecklists.filter(function(c){ return c.status==='completed'; }).length/d.myChecklists.length*100) : 0;
        var _myTodos = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===d.user.username; });
        data._todoDone    = _myTodos.filter(function(t){ return t.status==='completed'; }).length;
        data._todoTotal   = _myTodos.length;
        // Store all checklist items with individual status
        data._checklistItems = [];
        (d.myChecklists||[]).forEach(function(cl){
            (cl.items||[]).forEach(function(item){
                data._checklistItems.push({
                    checklist: cl.title,
                    frequency: cl.frequency||'',
                    item: item.task||'',
                    status: item.status||'pending',
                    value: item.value||'',
                    unit: item.unit||''
                });
            });
        });
        // Store all task titles
        data._taskList = (d.myTasks||[]).map(function(t){ return {title:t.title,status:t.status,priority:t.priority,deadline:t.deadline,tat:t.tat||''}; });
        // Store all problem titles
        data._problemList = (d.myProblems||[]).map(function(p){ return {title:p.title,category:p.category,status:p.status}; });
        // Store all request titles
        data._requestList = (d.myRequests||[]).map(function(r){ return {title:r.title,status:r.status}; });
        // Store all TODO titles
        data._todoList = _myTodos.map(function(t){ return {title:t.title,status:t.status,priority:t.priority,date:t.date}; });
        // Store Q goals
        var _qpAll = DB.get('quarterly_priorities')||[];
        data._qpAllotted = _qpAll.filter(function(q){ return q.memberUsername===user.username && !q.selfOwn; }).map(function(q){
            return {quarter:(q.quarter||'')+'-'+(q.year||''),items:(q.items||[]).map(function(it){ return {task:it.task,status:it.status,note:it.note}; })};
        });
        data._qpOwn = _qpAll.filter(function(q){ return q.memberUsername===user.username && q.selfOwn; }).map(function(q){
            return {quarter:(q.quarter||'')+'-'+(q.year||''),items:(q.items||[]).map(function(it){ return {task:it.task,status:it.status,note:it.note}; })};
        });
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

/* Share the employee's FULL work report (all sections) via WhatsApp */
function empShareFullWorkReport() {
    var d = _empData;
    if (!d || !d.user) { APP.notify('View your dashboard first', 'error'); return; }
    var user = d.user;
    var today = new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
    var L = '━━━━━━━━━━━━━━━━━━━━━\n';

    var tasks    = d.myTasks     || [];
    var probs    = d.myProblems  || [];
    var cls      = d.myChecklists|| [];
    var reqs     = d.myRequests  || [];
    var myTodos  = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===user.username; });

    var tDone = tasks.filter(function(t){ return t.status==='completed'; }).length;
    var tPend = tasks.filter(function(t){ return t.status!=='completed'; }).length;
    var tOver = tasks.filter(function(t){ return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed'; }).length;
    var pOpen = probs.filter(function(p){ return p.status!=='resolved' && p.status!=='closed'; }).length;
    var pRes  = probs.filter(function(p){ return p.status==='resolved'||p.status==='closed'; }).length;
    var clDone= cls.filter(function(c){ return c.status==='completed'; }).length;
    var clRate= cls.length>0?Math.round(clDone/cls.length*100):0;
    var reqPend=reqs.filter(function(r){ return r.status==='pending'||r.status==='hod_approved'; }).length;
    var tdDone = myTodos.filter(function(t){ return t.status==='completed'; }).length;
    var tdPend = myTodos.length - tdDone;

    function _bar(p){
        p = Math.max(0, Math.min(100, Math.round(p)));
        var f = Math.round(p/10);
        return '█'.repeat(f) + '░'.repeat(10-f) + ' ' + p + '%';
    }

    var text = '🏥 *HOSPITAL MANAGEMENT SYSTEM*\n'
        + '*COMPREHENSIVE WORK REPORT*\n'
        + L
        + '👤 *Employee:* ' + (user.fullName||user.username) + '\n'
        + '🏢 *Department:* ' + (d.dept||'—') + '\n'
        + '📅 *Report Date:* ' + today + '\n'
        + L
        + '📊 *OVERVIEW*\n'
        + '📋 *Tasks:* ' + tDone + '/' + tasks.length + ' done · ' + tOver + ' overdue (' + _bar(tasks.length?Math.round(tDone/tasks.length*100):0) + ')\n'
        + '🔧 *Problems:* ' + pRes + ' resolved · ' + pOpen + ' open (' + _bar(probs.length?Math.round(pRes/probs.length*100):0) + ')\n'
        + '✅ *Checklists:* ' + clDone + '/' + cls.length + ' completed (' + _bar(clRate) + ')\n'
        + '📦 *Requests:* ' + reqs.length + ' total · ' + reqPend + ' pending\n'
        + '📝 *TODOs:* ' + tdDone + ' done · ' + tdPend + ' pending (' + _bar(myTodos.length?Math.round(tdDone/myTodos.length*100):0) + ')\n'
        + L;

    if (tasks.length > 0) {
        text += '📋 *TASKS*\n';
        tasks.slice().reverse().slice(0,10).forEach(function(t){
            text += '• ' + (t.title||'') + ' — ' + (t.status||'') + (t.deadline?' (due '+APP.formatDate(t.deadline)+')':'') + '\n';
        });
        if (tasks.length > 10) text += '… +' + (tasks.length-10) + ' more\n';
        text += L;
    }

    if (probs.length > 0) {
        text += '🔧 *PROBLEMS*\n';
        probs.slice().reverse().slice(0,10).forEach(function(p){
            text += '• ' + (p.title||'') + ' — ' + (p.status||'') + '\n';
        });
        if (probs.length > 10) text += '… +' + (probs.length-10) + ' more\n';
        text += L;
    }

    if (cls.length > 0) {
        text += '✅ *CHECKLIST STATUS*\n';
        cls.slice().reverse().slice(0,10).forEach(function(cl){
            var tot = cl.items?cl.items.length:0;
            var dn  = cl.items?cl.items.filter(function(i){ return i.status && i.status!=='pending'; }).length:0;
            text += '• ' + (cl.title||'') + ' — ' + dn + '/' + tot + (cl.weekDate?' (week '+APP.formatDate(cl.weekDate)+')':'') + '\n';
        });
        if (cls.length > 10) text += '… +' + (cls.length-10) + ' more\n';
        text += L;
    }

    if (reqs.length > 0) {
        text += '📦 *MATERIAL REQUESTS*\n';
        reqs.slice().reverse().slice(0,10).forEach(function(r){
            text += '• ' + (r.title||r.itemName||'') + ' — ' + (r.status||'') + '\n';
        });
        if (reqs.length > 10) text += '… +' + (reqs.length-10) + ' more\n';
        text += L;
    }

    if (myTodos.length > 0) {
        text += '📝 *TODOs*\n';
        myTodos.slice().reverse().slice(0,10).forEach(function(t){
            text += '• ' + (t.title||'') + ' — ' + (t.status||'') + '\n';
        });
        if (myTodos.length > 10) text += '… +' + (myTodos.length-10) + ' more\n';
        text += L;
    }

    text += '_Generated by ' + (user.fullName||user.username) + ' on ' + today + '_';
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
}

function empExportReportExcel(id) {
    var r = (DB.get('reports') || []).find(function(x){ return x.id === id; });
    if (!r) { APP.notify('Report not found', 'error'); return; }
    var user = AUTH.currentUser();
    var d = _empData;
    if (!d || !d.user) { APP.notify('Please view your dashboard first', 'error'); return; }
    try {
        var wb = XLSX.utils.book_new();
        var _bar = function(p){var f=Math.round(p/10);return '█'.repeat(f)+'░'.repeat(10-f)+' '+p+'%';};

        // Use snapshot data from report if available, else fall back to live data
        var _tasks = r._taskList || (d.myTasks||[]).map(function(t){ return {title:t.title,status:t.status,priority:t.priority,deadline:t.deadline,tat:t.tat||''}; });
        var _probs = r._problemList || (d.myProblems||[]).map(function(p){ return {title:p.title,category:p.category,status:p.status}; });
        var _reqs = r._requestList || (d.myRequests||[]).map(function(r2){ return {title:r2.title,status:r2.status}; });
        var _myTodos = r._todoList || (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===d.user.username; }).map(function(t){ return {title:t.title,date:t.date,priority:t.priority,status:t.status,completedAt:t.completedAt}; });
        var _clItems = r._checklistItems || [];
        if (_clItems.length===0) {
            (d.myChecklists||[]).forEach(function(cl){
                (cl.items||[]).forEach(function(item){
                    _clItems.push({checklist:cl.title,frequency:cl.frequency||'',item:item.task||'',status:item.status||'pending',value:item.value||'',unit:item.unit||''});
                });
            });
        }
        var _allotted = r._qpAllotted || [];
        var _own = r._qpOwn || [];

        // ── Sheet 1: Report Info ──
        var tDone = _tasks.filter(function(t){return t.status==='completed';}).length;
        var tTot = _tasks.length;
        var pOpen = _probs.filter(function(p){return p.status!=='resolved';}).length;
        var pRes = _probs.filter(function(p){return p.status==='resolved';}).length;
        var clDone = _clItems.filter(function(i){return i.status==='ok'||i.status==='completed';}).length;
        var clTot = _clItems.length;
        var clRate = clTot>0?Math.round(clDone/clTot*100):0;
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
            ['Tasks Completed', tDone+'/'+tTot],
            ['Task Rate', tTot>0?Math.round(tDone/tTot*100)+'%':'0%'],
            ['Checklist Items Done', clDone+'/'+clTot],
            ['Checklist Rate', clRate+'%'],
            ['Problems Resolved', pRes+'/'+_probs.length],
            ['Material Requests', _reqs.length],
            ['TODOs', _myTodos.length],
            [],
            ['DESCRIPTION'],
            [r.description||'']
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Report Info');

        // ── Sheet 2: KPI Dashboard ──
        var rApp = _reqs.filter(function(r2){return r2.status==='approved';}).length;
        var rTot = _reqs.length;
        var tdDone = _myTodos.filter(function(t){return t.status==='completed';}).length;
        var tdTot = _myTodos.length;
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
        _tasks.forEach(function(t){
            taskRows.push([t.title||'', t.status||'', t.priority||'', t.deadline||'', t.tat||'']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), 'Tasks');

        // ── Sheet 4: Tasks with TAT ──
        var _tatTasks = _tasks.filter(function(t){ return t.tat; });
        var tatRows = [['Title','TAT (hours)','Status','Priority','Deadline']];
        _tatTasks.forEach(function(t){
            tatRows.push([t.title||'', t.tat, t.status||'', t.priority||'', t.deadline||'']);
        });
        if (_tatTasks.length===0) tatRows.push(['(No tasks with TAT)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tatRows), 'Tasks with TAT');

        // ── Sheet 5: Checklist Items (each point with individual status) ──
        var clRows = [['Checklist','Frequency','Item','Status','Value','Unit']];
        _clItems.forEach(function(i){
            clRows.push([i.checklist||'', i.frequency||'', i.item||'', i.status||'pending', i.value||'', i.unit||'']);
        });
        if (_clItems.length===0) clRows.push(['(No checklist items)','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clRows), 'Checklist Items');

        // ── Sheet 6: Problems ──
        var probRows = [['Title','Category','Status']];
        _probs.forEach(function(p){
            probRows.push([p.title||'', p.category||'', p.status||'']);
        });
        if (_probs.length===0) probRows.push(['(No problems)','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(probRows), 'Problems');

        // ── Sheet 7: Material Requests ──
        var reqRows = [['Title','Status']];
        _reqs.forEach(function(req){
            reqRows.push([req.title||'', req.status||'']);
        });
        if (_reqs.length===0) reqRows.push(['(No material requests)','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reqRows), 'Material Requests');

        // ── Sheet 8: TODO ──
        var todoRows = [['Title','Date','Priority','Status']];
        _myTodos.forEach(function(t){
            todoRows.push([t.title||'', t.date||'', t.priority||'', t.status||'']);
        });
        if (_myTodos.length===0) todoRows.push(['(No TODOs)','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(todoRows), 'TODO');

        // ── Sheet 9: Q Goals ──
        var qpRows = [['Type','Quarter','Goal / Item','Status','Note']];
        (_allotted||[]).forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Allotted',q.quarter||'', it.task||'', it.status||'pending', it.note||'']); }); });
        (_own||[]).forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Own Goal',q.quarter||'', it.task||'', it.status||'pending', it.note||'']); }); });
        if ((!_allotted||_allotted.length===0) && (!_own||_own.length===0)) qpRows.push(['(No quarterly goals found)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qpRows), 'Q Goals');

        var fname = ((r.title||'Work_Report').replace(/[^a-z0-9]/gi,'_')) + '.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('Excel downloaded: ' + fname, 'success');
    } catch(e) {
        APP.notify('Excel export failed: ' + e.message, 'error');
    }
}

function empDownloadFullReport() {
    var d = _empData;
    if (!d || !d.user) { APP.notify('View your dashboard first', 'error'); return; }
    try {
        var wb = XLSX.utils.book_new();
        var user = d.user;
        var today = new Date().toISOString().slice(0,10);
        var nowLabel = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'});

        // Sheet 1: Cover / Summary
        var cover = [
            ['COMPREHENSIVE WORK REPORT'],
            [''],
            ['Employee', user.fullName],
            ['Department', d.dept||'—'],
            ['Username', user.username],
            ['Report Date', nowLabel],
            [''],
            ['── OVERVIEW ──'],
            [''],
        ];
        var tDone = d.myTasks.filter(function(t){ return t.status==='completed'; }).length;
        var tTot  = d.myTasks.length;
        var tOver = d.myTasks.filter(function(t){ return t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='completed'; }).length;
        var pOpen = d.myProblems.filter(function(p){ return p.status!=='resolved'; }).length;
        var pRes  = d.myProblems.filter(function(p){ return p.status==='resolved'; }).length;
        var pTot  = d.myProblems.length;
        var clDone= d.myChecklists.filter(function(c){ return c.status==='completed'; }).length;
        var clTot = d.myChecklists.length;
        var clRate= clTot>0?Math.round(clDone/clTot*100):0;
        var myTodos = (DB.get('employeeTodos')||[]).filter(function(t){ return t.createdBy===user.username; });
        var tdDone = myTodos.filter(function(t){ return t.status==='completed'; }).length;
        var tdPend = myTodos.length - tdDone;
        cover.push(['Tasks: Completed', tDone, 'Total', tTot, 'Overdue', tOver]);
        cover.push(['Problems: Resolved', pRes, 'Open', pOpen, 'Total', pTot]);
        cover.push(['Checklists: Done', clDone, 'Total', clTot, 'Rate', clRate+'%']);
        cover.push(['TODO: Done', tdDone, 'Pending', tdPend, 'Total', myTodos.length]);
        cover.push(['Material Requests:', d.myRequests.length]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), 'Summary');

        // Sheet 2: Tasks
        var tRows = [['Title','Status','Priority','Deadline','Department']];
        d.myTasks.forEach(function(t){ tRows.push([t.title||'', t.status||'', t.priority||'', t.deadline||'', t.department||'']); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tRows), 'Tasks');

        // Sheet 3: Problems
        var pRows = [['Title','Category','Status','Created At']];
        d.myProblems.forEach(function(p){ pRows.push([p.title||'', p.category||'', p.status||'', p.createdAt?APP.formatDate(p.createdAt):'']); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pRows), 'Problems');

        // Sheet 4: Checklists
        var cRows = [['Title','Assigned To','Status','Frequency']];
        d.myChecklists.forEach(function(c){ cRows.push([c.title||'', c.assignedTo||'', c.status||'', c.frequency||'']); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cRows), 'Checklists');

        // Sheet 5: TODO
        var todoRows = [['Title','Date','Priority','Status','Completed At']];
        myTodos.forEach(function(t){ todoRows.push([t.title||'', t.date||'', t.priority||'', t.status||'', t.completedAt?APP.formatDate(t.completedAt):'']); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(todoRows), 'TODO');

        // Sheet 6: Material Requests
        var reqRows = [['Title','Status','Created At']];
        d.myRequests.forEach(function(r){ reqRows.push([r.title||'', r.status||'', r.createdAt?APP.formatDate(r.createdAt):'']); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reqRows), 'Material Requests');

        // Sheet 7: KPI Dashboard
        var tTot=d.myTasks.length, tDone=d.myTasks.filter(function(t){return t.status==='completed';}).length, tRate=tTot>0?Math.round(tDone/tTot*100):0;
        var pTot=d.myProblems.length, pRes=d.myProblems.filter(function(p){return p.status==='resolved';}).length, pRate=pTot>0?Math.round(pRes/pTot*100):0;
        var cTot=d.myChecklists.length, cDone=d.myChecklists.filter(function(c){return c.status==='completed';}).length, cRate=cTot>0?Math.round(cDone/cTot*100):0;
        var rTot=d.myRequests.length, rApp=d.myRequests.filter(function(r){return r.status==='approved';}).length, rRate=rTot>0?Math.round(rApp/rTot*100):0;
        var tdTot=myTodos.length, tdDone=myTodos.filter(function(t){return t.status==='completed';}).length, tdRate=tdTot>0?Math.round(tdDone/tdTot*100):0;
        var _bar=function(p){var f=Math.round(p/10);return '█'.repeat(f)+'░'.repeat(10-f)+' '+p+'%';};
        var kpiRows = [
            ['KPI DASHBOARD'],
            [''],
            ['Metric','Done','Total','Rate','Progress Bar'],
            ['Task Completion',tDone,tTot,tRate+'%',_bar(tRate)],
            ['Problem Resolution',pRes,pTot,pRate+'%',_bar(pRate)],
            ['Checklist Compliance',cDone,cTot,cRate+'%',_bar(cRate)],
            ['Request Approval',rApp,rTot,rRate+'%',_bar(rRate)],
            ['TODO Completion',tdDone,tdTot,tdRate+'%',_bar(tdRate)],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPI Dashboard');

        // Sheet 8: Today's Checklist with Status
        var clRows = [['Checklist','Item','Status','Value/Unit']];
        (d.myChecklists||[]).forEach(function(cl){
            (cl.items||[]).forEach(function(item){
                var v = (item.value!==undefined&&item.value!=='')?' = '+item.value+(item.unit?' '+item.unit:''):'';
                clRows.push([cl.title, item.task||'', item.status||'pending', v]);
            });
            if (!cl.items||cl.items.length===0) clRows.push([cl.title,'(no items)','-','']);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clRows), 'Today Checklists');

        // Sheet 9: Tasks with TAT
        var _tatTasks = d.myTasks.filter(function(t){ return t.tat; });
        var tatRows = [['Title','TAT (hours)','Status','Priority','Deadline','Elapsed (est.)']];
        _tatTasks.forEach(function(t) {
            var el = t.createdAt ? ((new Date() - new Date(t.createdAt)) / 3600000).toFixed(1)+'h' : '-';
            tatRows.push([t.title||'', t.tat, t.status||'', t.priority||'', t.deadline||'', t.status==='completed'?'Done':el]);
        });
        if (_tatTasks.length===0) tatRows.push(['(No tasks with TAT)','','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tatRows), 'Tasks with TAT');

        // Sheet 10: Q Goals (Allotted + Own)
        var _qpAll = DB.get('quarterly_priorities')||[];
        var _allotted = _qpAll.filter(function(q){ return q.memberUsername===user.username && !q.selfOwn; });
        var _own = _qpAll.filter(function(q){ return q.memberUsername===user.username && q.selfOwn; });
        var qpRows = [['Type','Quarter','Goal / Item','Status','Note']];
        _allotted.forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Allotted',(q.quarter||'')+'-'+(q.year||''), it.task||'', it.status||'pending', it.note||'']); }); });
        _own.forEach(function(q){ (q.items||[]).forEach(function(it){ qpRows.push(['Own Goal',(q.quarter||'')+'-'+(q.year||''), it.task||'', it.status||'pending', it.note||'']); }); });
        if (_allotted.length===0 && _own.length===0) qpRows.push(['(No quarterly goals found)','','','','']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qpRows), 'Q Goals');

        var fname = 'Work_Report_' + user.username + '_' + today + '.xlsx';
        XLSX.writeFile(wb, fname);
        APP.notify('Full report downloaded: ' + fname, 'success');
    } catch(e) {
        APP.notify('Export failed: ' + e.message, 'error');
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

function empShowMatReqForm() {
    var user = AUTH.currentUser();
    var dept = (user ? user.department : '') || '';
    var deptLow = dept.trim().toLowerCase();
    var inventory = DB.get('inventory') || [];
    var deptInv = inventory.filter(function(i) { return (i.department || '').trim().toLowerCase() === deptLow; });
    var itemOpts = '';
    for (var i = 0; i < deptInv.length; i++) {
        var inv = deptInv[i];
        itemOpts += '<option value="' + inv.name.replace(/"/g, '&quot;') + '" data-unit="' + (inv.unit || 'pcs') + '">' + inv.name + '</option>';
    }
    var deptField = '<input type="text" name="department" class="form-control" value="' + (dept || '').replace(/"/g, '&quot;') + '" readonly style="background:var(--light-gray);">';
    var html = '<form id="empMatReqForm" style="min-width:420px;">'
        + '<div class="form-group"><label>' + T('mreqmod_label_request_title') + '</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>' + T('mreqmod_label_department') + '</label>' + deptField + '</div>'
        + '<div class="form-group"><label>' + T('mreqmod_label_reason_justification') + '</label><textarea name="reason" class="form-control" rows="2"></textarea></div>'
        + '<div class="form-group"><div class="flex-between"><label style="font-weight:600;">' + T('mreqmod_label_items') + '</label><button type="button" class="btn btn-sm btn-primary" onclick="empMatReqAddItem()">+ ' + T('mreqmod_btn_add') + '</button></div>'
        + '<div id="empMatReqItems"><div class="mat-item-row" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">'
        + '<select class="mat-item-select form-control" style="flex:1;font-size:12px;padding:3px 6px;" onchange="empMatReqAutoUnit(this)">' + itemOpts + '</select>'
        + '<input type="number" class="mat-item-qty form-control" style="width:70px;font-size:12px;padding:3px 6px;" placeholder="' + T('mreqmod_placeholder_qty') + '" value="1" min="1">'
        + '<input type="text" class="mat-item-unit form-control" style="width:70px;font-size:12px;padding:3px 6px;" readonly>'
        + '</div></div></div>'
        + '</form>';
    openFormModal(T('empd2_btn_new_request'), html, 'empSaveMatReq()', true);
    setTimeout(function() {
        var sel = document.querySelector('.mat-item-select');
        if (sel) empMatReqAutoUnit(sel);
    }, 50);
}

function empSaveMatReq() {
    var form = document.getElementById('empMatReqForm');
    if (!form) return;
    var title = form.querySelector('[name="title"]')?.value?.trim();
    var department = form.querySelector('[name="department"]')?.value || '';
    var reason = form.querySelector('[name="reason"]')?.value?.trim() || '';
    if (!title) { APP.notify(T('mreqmod_msg_enter_request_title'), 'error'); return; }
    var items = [];
    var rows = form.querySelectorAll('.mat-item-row');
    for (var i = 0; i < rows.length; i++) {
        var name = (rows[i].querySelector('.mat-item-select') || {}).value || '';
        var qty = parseInt((rows[i].querySelector('.mat-item-qty') || {}).value) || 1;
        var unit = (rows[i].querySelector('.mat-item-unit') || {}).value || 'pcs';
        if (name) items.push({ name: name, qty: qty, unit: unit });
    }
    if (!items.length) { APP.notify(T('mreqmod_msg_add_one_item'), 'error'); return; }
    var user = AUTH.currentUser();
    DB.add('material_requests', {
        title: title,
        department: department || (user ? user.department : '') || '',
        reason: reason,
        items: items,
        status: 'pending',
        _source: 'employee',
        createdBy: user ? user.username : '',
        createdByName: user ? user.fullName : ''
    });
    APP.notify(T('mreqmod_msg_submitted_waiting_hod'), 'success');
    closeModal();
    Router.navigate('employee-dashboard');
}

function empMatReqAddItem() {
    var container = document.getElementById('empMatReqItems');
    if (!container) return;
    var user = AUTH.currentUser();
    var dept = (user ? user.department : '') || '';
    var deptLow = dept.trim().toLowerCase();
    var inventory = DB.get('inventory') || [];
    var deptInv = inventory.filter(function(i) { return (i.department || '').trim().toLowerCase() === deptLow; });
    var itemOpts = '';
    for (var i = 0; i < deptInv.length; i++) {
        var inv = deptInv[i];
        itemOpts += '<option value="' + inv.name.replace(/"/g, '&quot;') + '" data-unit="' + (inv.unit || 'pcs') + '">' + inv.name + '</option>';
    }
    var row = document.createElement('div');
    row.className = 'mat-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    row.innerHTML = '<select class="mat-item-select form-control" style="flex:1;font-size:12px;padding:3px 6px;" onchange="empMatReqAutoUnit(this)">' + itemOpts + '</select>'
        + '<input type="number" class="mat-item-qty form-control" style="width:70px;font-size:12px;padding:3px 6px;" placeholder="' + T('mreqmod_placeholder_qty') + '" value="1" min="1">'
        + '<input type="text" class="mat-item-unit form-control" style="width:70px;font-size:12px;padding:3px 6px;" readonly>'
        + '<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="padding:2px 6px;font-size:11px;">✕</button>';
    container.appendChild(row);
}

function empMatReqAutoUnit(sel) {
    if (!sel) return;
    var row = sel.closest('.mat-item-row');
    if (!row) return;
    var unitInput = row.querySelector('.mat-item-unit');
    if (unitInput) {
        var opt = sel.options[sel.selectedIndex];
        unitInput.value = opt ? (opt.getAttribute('data-unit') || 'pcs') : 'pcs';
    }
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

/* ═══════════════════════════════════════════════
   EMPLOYEE HANDOVER TAB (Facility/IT/Maintenance)
   ═══════════════════════════════════════════════ */
function _empCanManageHandover(user) {
    if (!user) return false;
    if (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin') return true;
    if (user.role === 'hod') {
        var managed = user.managedDepartments || (user.department ? [user.department] : []);
        return managed.some(function(d){ return ['it','facility','maintenance'].indexOf((d||'').trim().toLowerCase()) !== -1; });
    }
    return false;
}

function renderEmpHandoverTab(el) {
    try {
        if (!el) el = document.getElementById('empTabContent');
        if (!el) return;
        var user = AUTH.currentUser();
        if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
        var dept = user.department || '';
        var canManage = _empCanManageHandover(user);

        var allHandovers = (DB.get('handovers') || []).filter(function(h) {
            return (h.department||'').trim().toLowerCase() === (dept||'').trim().toLowerCase();
        });
        var mine = allHandovers.filter(function(h){ return h.employeeUsername === user.username; });

        var shifts = ['Morning', 'Evening', 'Night'];

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:16px;">🔄 ' + T('empd2_handover_title') + '</div>'
            + (canManage ? '<button class="btn btn-sm btn-primary" onclick="empHandoverShowForm()">+ ' + T('empd2_handover_new') + '</button>' : '')
            + '</div>';

        // ── Submit handover form (Facility HOD / admin only) ──
        if (canManage) {
            html += '<div id="empHandoverFormWrap" style="display:block;background:var(--light-gray);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;">'
                + '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">📤 ' + T('empd2_handover_submit_title') + '</div>'
                + '<div class="form-group"><label style="font-size:13px;font-weight:600;">👤 ' + T('empd2_handover_name') + ' *</label>'
                + '<input type="text" id="empHandoverName" class="form-control" value="' + _escHtml(user.fullName || user.username || '') + '" placeholder="' + T('empd2_handover_name_ph') + '" style="width:100%;padding:9px 12px;font-size:14px;"></div>'
                + '<div class="grid-2">'
                + '<div class="form-group"><label>' + T('empd2_handover_shift') + ' *</label>'
                + '<select id="empHandoverShift" class="form-control">'
                + shifts.map(function(s){ return '<option value="' + s + '">' + s + '</option>'; }).join('')
                + '</select></div>'
                + '<div class="form-group"><label>' + T('empd2_handover_date') + ' *</label>'
                + '<input type="date" id="empHandoverDate" class="form-control" value="' + new Date().toISOString().slice(0,10) + '"></div>'
                + '</div>'
                + '<div class="form-group"><label>' + T('empd2_handover_summary') + '</label>'
                + '<textarea id="empHandoverSummary" rows="3" class="form-control" placeholder="' + T('empd2_handover_summary_ph') + '"></textarea></div>'
                + '<div class="form-group"><label>' + T('empd2_handover_pending') + '</label>'
                + '<textarea id="empHandoverPending" rows="3" class="form-control" placeholder="' + T('empd2_handover_pending_ph') + '"></textarea></div>'
                + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
                + '<button class="btn btn-sm btn-success" onclick="empHandoverSubmit()">📤 ' + T('empd2_handover_btn_submit') + '</button>'
                + '<button class="btn btn-sm btn-outline" onclick="empHandoverHideForm()">' + T('empd2_handover_btn_cancel') + '</button>'
                + '</div></div>';
        }

        // ── My recent handovers ──
        html += '<div style="font-weight:600;font-size:14px;margin-bottom:8px;">👤 ' + T('empd2_handover_mine') + ' (' + mine.length + ')</div>';
        if (mine.length === 0) {
            html += '<div style="color:var(--gray);font-size:13px;padding:12px;background:var(--light-gray);border-radius:8px;margin-bottom:16px;">' + T('empd2_handover_none') + '</div>';
        } else {
            html += mine.slice().sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0,5).map(function(h) {
                return '<div class="work-item" style="flex-direction:column;align-items:stretch;gap:4px;margin-bottom:8px;border-left-color:#7b1fa2;">'
                    + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">'
                    + '<div style="font-weight:600;font-size:13px;">' + _escHtml(h.employeeName || '') + ' · ' + _escHtml(h.shift || '') + ' · ' + (h.date || (h.createdAt||'').slice(0,10)) + '</div>'
                    + '<span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--gray);">' + APP.formatDate(h.createdAt)
                    + (canManage ? '<button class="btn btn-sm btn-outline" style="font-size:10px;color:var(--danger);border-color:var(--danger);padding:1px 7px;" onclick="empHandoverDelete(\'' + h.id + '\')">🗑 ' + T('empd2_handover_delete') + '</button>' : '')
                    + '</span></div>'
                    + (h.summary ? '<div style="font-size:12px;color:var(--text);white-space:pre-wrap;">' + _escHtml(h.summary) + '</div>' : '')
                    + (h.pending ? '<div style="font-size:12px;color:#e65100;white-space:pre-wrap;background:#fff3e0;border-radius:6px;padding:6px 8px;"><strong>⏳ ' + T('empd2_handover_pending') + ':</strong> ' + _escHtml(h.pending) + '</div>' : '')
                    + '</div>';
            }).join('');
        }

        // ── Team handovers ──
        html += '<div style="font-weight:600;font-size:14px;margin-bottom:8px;">🏢 ' + T('empd2_handover_team') + ' (' + allHandovers.length + ')</div>';
        if (allHandovers.length === 0) {
            html += '<div style="color:var(--gray);font-size:13px;padding:12px;background:var(--light-gray);border-radius:8px;">' + T('empd2_handover_team_none') + '</div>';
        } else {
            html += allHandovers.slice().sort(function(a,b){ return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0,10).map(function(h) {
                return '<div class="work-item" style="flex-direction:column;align-items:stretch;gap:4px;margin-bottom:8px;">'
                    + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">'
                    + '<div style="font-weight:600;font-size:13px;">' + _escHtml(h.employeeName || '') + ' · ' + _escHtml(h.shift || '') + ' · ' + (h.date || (h.createdAt||'').slice(0,10)) + '</div>'
                    + '<span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--gray);">' + APP.formatDate(h.createdAt)
                    + (canManage ? '<button class="btn btn-sm btn-outline" style="font-size:10px;color:var(--danger);border-color:var(--danger);padding:1px 7px;" onclick="empHandoverDelete(\'' + h.id + '\')">🗑 ' + T('empd2_handover_delete') + '</button>' : '')
                    + '</span></div>'
                    + (h.summary ? '<div style="font-size:12px;color:var(--text);white-space:pre-wrap;">' + _escHtml(h.summary) + '</div>' : '')
                    + (h.pending ? '<div style="font-size:12px;color:#e65100;white-space:pre-wrap;background:#fff3e0;border-radius:6px;padding:6px 8px;"><strong>⏳ ' + T('empd2_handover_pending') + ':</strong> ' + _escHtml(h.pending) + '</div>' : '')
                    + '</div>';
            }).join('');
        }

        el.innerHTML = html;
    } catch (e) {
        if (el) el.innerHTML = '<div style="background:#ffebee;color:#c62828;padding:8px;font-size:12px;">Error: ' + _escHtml(e.message) + '</div>';
    }
}

function _escHtml(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function empHandoverShowForm() {
    var wrap = document.getElementById('empHandoverFormWrap');
    if (wrap) wrap.style.display = 'block';
    var sc = wrap ? wrap.querySelector('#empHandoverDate') : null;
    if (sc && !sc.value) sc.value = new Date().toISOString().slice(0, 10);
}
function empHandoverHideForm() {
    var wrap = document.getElementById('empHandoverFormWrap');
    if (wrap) wrap.style.display = 'none';
}
function empHandoverSubmit() {
    var user = AUTH.currentUser();
    if (!user) return;
    if (!_empCanManageHandover(user)) {
        APP.notify(T('empd2_handover_no_perm'), 'error');
        return;
    }
    var name = document.getElementById('empHandoverName')?.value?.trim() || '';
    var shift = document.getElementById('empHandoverShift')?.value || '';
    var date  = document.getElementById('empHandoverDate')?.value || new Date().toISOString().slice(0, 10);
    var summary = document.getElementById('empHandoverSummary')?.value?.trim() || '';
    var pending = document.getElementById('empHandoverPending')?.value?.trim() || '';
    if (!name || !shift || (!summary && !pending)) {
        APP.notify(T('empd2_handover_required'), 'error');
        return;
    }
    DB.add('handovers', {
        employeeName: name,
        employeeUsername: user.username || '',
        department: user.department || '',
        shift: shift,
        date: date,
        summary: summary,
        pending: pending,
        status: 'open'
    });
    // Notify Facility/IT/Maintenance HODs and admins (broadcast; receiver-side relevance filters)
    if (typeof WS_NOTIFY !== 'undefined' && WS_NOTIFY.push) {
        WS_NOTIFY.push('🔄 ' + T('empd2_handover_notif_title'),
            (user.fullName || user.username) + ' — ' + shift + ' (' + date + ')' + (summary ? ': ' + summary.slice(0, 120) : ''),
            'info', 'handovers');
    } else if (typeof APP !== 'undefined' && APP.notify) {
        APP.notify(T('empd2_handover_saved'), 'success');
    }
    APP.notify(T('empd2_handover_saved'), 'success');
    empHandoverHideForm();
    renderEmpHandoverTab();
}

function empHandoverDelete(id) {
    var user = AUTH.currentUser();
    if (!user || !_empCanManageHandover(user)) {
        APP.notify(T('empd2_handover_no_perm'), 'error');
        return;
    }
    if (!confirm(T('empd2_handover_confirm_delete'))) return;
    DB.delete('handovers', id);
    APP.notify(T('empd2_handover_deleted'), 'success');
    if (typeof WS_NOTIFY !== 'undefined' && WS_NOTIFY.push) {
        WS_NOTIFY.push(T('empd2_handover_deleted'),
            T('empd2_handover_deleted'), 'info', 'handovers');
    }
    renderEmpHandoverTab();
}

/* ═══════════════════════════════════════════════
   EMPLOYEE BREAKDOWN TAB
   ═══════════════════════════════════════════════ */
function renderEmpBreakdownTab(el) {
    try {
        if (!el) el = document.getElementById('empTabContent');
        if (!el) return;
        var user = AUTH.currentUser();
        if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
        var dept = user.department || '';
    var _isAdmin = user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin';
    var _EMP_ALLOWED = ['IT', 'Facility', 'Maintenance'];
    var _canManage = _isAdmin || _EMP_ALLOWED.some(function(x){ return x.toLowerCase() === (dept||'').trim().toLowerCase(); });
    if (!_canManage) {
        var _dd = (DB.get('departments') || []).find(function(d){ return (d.name||'').trim().toLowerCase() === (dept||'').trim().toLowerCase(); });
        if (_dd && _dd.features && _dd.features.indexOf('equipment-breakdown') !== -1) _canManage = true;
    }
    var all = (DB.get('hodEquipmentBackdowns') || []).filter(function(b){ return _isAdmin || true; });

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:16px;">📉 Equipment Breakdowns</div>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
            + (_canManage ? '<button class="btn btn-sm btn-primary" onclick="empBreakdownAdd()">+ Record Breakdown</button>' : '')
            + '<button class="btn btn-sm btn-outline" style="font-size:11px;" onclick="empDownloadBreakdownReport()">📥 Excel</button>'
            + '<button class="btn btn-sm btn-outline" style="font-size:11px;" onclick="empDownloadBreakdownPdf()">📕 PDF</button>'
            + '<span style="font-size:12px;color:var(--gray);line-height:30px;">' + all.length + ' record(s)</span>'
            + '</div></div>';

        if (all.length === 0) {
            html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
                + '<div style="font-size:32px;margin-bottom:8px;">📉</div>'
                + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No breakdown records yet</div>'
                + (_canManage ? '<div style="font-size:13px;color:var(--gray);margin-bottom:14px;">Click the button above to record a breakdown.</div>' : '')
                + '</div>';
            el.innerHTML = html;
            return;
        }

        all.slice().sort(function(a,b){ return (b.backdownDate||'').localeCompare(a.backdownDate||''); }).forEach(function(b){
            html += '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid #6a1b9a;border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">'
                + '<span style="font-size:14px;font-weight:700;">' + (b.assetName || 'Equipment') + '</span>'
                + '<span class="badge badge-secondary" style="font-size:10px;">' + (b.assetCode || '-') + '</span>'
                + '<span style="font-size:10px;color:#fff;background:#6a1b9a;padding:2px 8px;border-radius:8px;">Breakdown</span>'
                + '</div>'
                + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;font-size:13px;">'
                + '<div><span style="color:var(--gray);">Date:</span> <strong>' + (b.backdownDate ? APP.formatDate(b.backdownDate) : '-') + '</strong></div>'
                + '<div><span style="color:var(--gray);">Reason:</span> <strong>' + (b.reason || '-') + '</strong></div>'
                + (b.warrantyInfo ? '<div><span style="color:var(--gray);">Warranty:</span> <strong>' + b.warrantyInfo + '</strong></div>' : '')
                + (b.servicePeriod ? '<div><span style="color:var(--gray);">Service Period:</span> <strong>' + b.servicePeriod + '</strong></div>' : '')
                + (b.notes ? '<div style="grid-column:1/-1;"><span style="color:var(--gray);">Notes:</span> ' + b.notes + '</div>' : '')
                + '</div>'
                + '<div style="display:flex;gap:4px;margin-top:6px;">'
                + (_canManage ? '<button class="btn btn-sm btn-outline" style="font-size:10px;color:var(--primary);border-color:var(--primary);padding:2px 8px;" onclick="empBreakdownEdit(\'' + b.id + '\')">✏️ Edit</button>' : '')
                + (_canManage ? '<button class="btn btn-sm btn-outline" style="font-size:10px;color:var(--danger);border-color:var(--danger);padding:2px 8px;" onclick="empBreakdownDelete(\'' + b.id + '\')">🗑 Delete</button>' : '')
                + '</div>'
                + '</div>';
        });

        el.innerHTML = html;
    } catch(e) {
        el.innerHTML = '<div class="empty-state">Error: ' + e.message + '</div>';
    }
}

function empBreakdownSelectService(sel) {
    var id = sel && sel.value;
    var f = document.getElementById('empBreakdownForm');
    if (!f) return;
    if (!id) {
        f.querySelector('[name="assetCode"]').value = '';
        f.querySelector('[name="assetName"]').value = '';
        f.querySelector('[name="serviceType"]').value = '';
        f.querySelector('[name="lastServiceDate"]').value = '';
        f.querySelector('[name="nextServiceDue"]').value = '';
        f.querySelector('[name="serviceId"]').value = '';
        return;
    }
    var all = DB.get('hodEquipmentServices') || [];
    var svc = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { svc = all[i]; break; } }
    if (!svc) return;
    f.querySelector('[name="assetCode"]').value = svc.assetCode || '';
    f.querySelector('[name="assetName"]').value = svc.assetName || '';
    f.querySelector('[name="serviceType"]').value = svc.serviceType || '';
    f.querySelector('[name="lastServiceDate"]').value = svc.lastServiceDate || '';
    f.querySelector('[name="nextServiceDue"]').value = svc.nextServiceDue || '';
    f.querySelector('[name="serviceId"]').value = svc.id || '';
    f.querySelector('[name="warrantyInfo"]').value = svc.warrantyInfo || '';
}

function empBreakdownAdd() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department || '';
    var _isAdmin = user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin';
    if (!_isAdmin) {
        var _EMP_ALLOWED = ['IT', 'Facility', 'Maintenance'];
        var _allowed = _EMP_ALLOWED.some(function(x){ return x.toLowerCase() === (dept||'').trim().toLowerCase(); });
        if (!_allowed) {
            var _dd = (DB.get('departments') || []).find(function(d){ return (d.name||'').trim().toLowerCase() === (dept||'').trim().toLowerCase(); });
            if (!_dd || !_dd.features || _dd.features.indexOf('equipment-breakdown') === -1) {
                APP.notify('This feature is not available for your department', 'error');
                return;
            }
        }
    }
    var services = (DB.get('hodEquipmentServices') || []).filter(function(s){ return (_isAdmin || (s.department||'').trim().toLowerCase() === dept.trim().toLowerCase()) && s.status !== 'backdown'; });
    var today = new Date().toISOString().slice(0,10);
    var form = '<form id="empBreakdownForm">'
        + '<div class="form-group"><label>Select Equipment (from Service Records)</label>'
        + '<select class="form-control" onchange="empBreakdownSelectService(this)">'
        + '<option value="">— Manual Entry —</option>';
    services.forEach(function(s){
        form += '<option value="' + s.id + '">' + esc(s.assetName || '') + ' (' + esc(s.assetCode || '') + ')</option>';
    });
    form += '</select></div>'
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
        + '<div class="form-group"><label>Breakdown Date *</label><input type="date" name="backdownDate" class="form-control" required value="' + today + '"></div>'
        + '<div class="form-group"><label>Warranty Info</label><input type="text" name="warrantyInfo" class="form-control" placeholder="e.g. Warranty valid until 2028-01-01"></div>'
        + '<div class="form-group"><label>Service Period</label><input type="text" name="servicePeriod" class="form-control" placeholder="e.g. Jan 2023 - Jun 2026"></div>'
        + '<div class="form-group"><label>Reason for Breakdown *</label>'
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
    openFormModal('📉 Record Equipment Breakdown', form, 'empBreakdownSave()', false);
}

function empBreakdownSave() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('empBreakdownForm');
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
    if (data.serviceId) {
        DB.update('hodEquipmentServices', data.serviceId, { status: 'backdown' });
    }
    APP.notify('Breakdown record saved!', 'success');
    renderEmpBreakdownTab();
    return true;
}

function empBreakdownEdit(id) {
    var b = DB.getById('hodEquipmentBackdowns', id);
    if (!b) { APP.notify('Record not found', 'error'); return; }
    var today = new Date().toISOString().slice(0,10);
    var form = '<form id="empBreakdownForm">'
        + '<div class="form-group"><label>Asset Code *</label><input type="text" name="assetCode" class="form-control" required value="' + esc(b.assetCode||'') + '"></div>'
        + '<div class="form-group"><label>Asset Name *</label><input type="text" name="assetName" class="form-control" required value="' + esc(b.assetName||'') + '"></div>'
        + '<div class="form-group"><label>Service Type</label>'
        + '<select name="serviceType" class="form-control">'
        + '<option value="">N/A</option>'
        + '<option value="weekly"' + (b.serviceType==='weekly'?' selected':'') + '>Weekly</option>'
        + '<option value="monthly"' + (b.serviceType==='monthly'?' selected':'') + '>Monthly</option>'
        + '<option value="quarterly"' + (b.serviceType==='quarterly'?' selected':'') + '>Quarterly</option>'
        + '<option value="yearly"' + (b.serviceType==='yearly'?' selected':'') + '>Yearly</option>'
        + '<option value="custom"' + (b.serviceType==='custom'?' selected':'') + '>Custom</option>'
        + '</select></div>'
        + '<div class="grid-2" style="gap:10px;">'
        + '<div class="form-group"><label>Last Service Date</label><input type="date" name="lastServiceDate" class="form-control" value="' + (b.lastServiceDate||'') + '"></div>'
        + '<div class="form-group"><label>Next Service Due</label><input type="date" name="nextServiceDue" class="form-control" value="' + (b.nextServiceDue||'') + '"></div>'
        + '</div>'
        + '<hr style="margin:12px 0;border-color:var(--border);">'
        + '<div class="form-group"><label>Breakdown Date *</label><input type="date" name="backdownDate" class="form-control" required value="' + (b.backdownDate||today) + '"></div>'
        + '<div class="form-group"><label>Warranty Info</label><input type="text" name="warrantyInfo" class="form-control" value="' + esc(b.warrantyInfo||'') + '"></div>'
        + '<div class="form-group"><label>Service Period</label><input type="text" name="servicePeriod" class="form-control" value="' + esc(b.servicePeriod||'') + '"></div>'
        + '<div class="form-group"><label>Reason for Breakdown *</label>'
        + '<select name="reason" class="form-control" required>'
        + '<option value="">Select reason...</option>'
        + '<option value="End of life"' + (b.reason==='End of life'?' selected':'') + '>End of life</option>'
        + '<option value="Upgraded / Replaced"' + (b.reason==='Upgraded / Replaced'?' selected':'') + '>Upgraded / Replaced</option>'
        + '<option value="Damaged / Beyond repair"' + (b.reason==='Damaged / Beyond repair'?' selected':'') + '>Damaged / Beyond repair</option>'
        + '<option value="No longer needed"' + (b.reason==='No longer needed'?' selected':'') + '>No longer needed</option>'
        + '<option value="Transferred to another department"' + (b.reason==='Transferred to another department'?' selected':'') + '>Transferred to another department</option>'
        + '<option value="Lost / Stolen"' + (b.reason==='Lost / Stolen'?' selected':'') + '>Lost / Stolen</option>'
        + '<option value="other"' + (b.reason!=='End of life'&&b.reason!=='Upgraded / Replaced'&&b.reason!=='Damaged / Beyond repair'&&b.reason!=='No longer needed'&&b.reason!=='Transferred to another department'&&b.reason!=='Lost / Stolen'?' selected':'') + '>Other</option>'
        + '</select></div>'
        + '<div class="form-group"><label>Additional Notes</label><textarea name="notes" class="form-control" rows="2">' + esc(b.notes||'') + '</textarea></div>'
        + '<input type="hidden" name="serviceId" value="' + (b.serviceId||'') + '">'
        + '</form>';
    openFormModal('✏️ Edit Breakdown Record', form, 'empBreakdownUpdate(\'' + id + '\')', false);
}

function empBreakdownUpdate(id) {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('empBreakdownForm');
    if (!data.assetCode || !data.assetName || !data.backdownDate || !data.reason) {
        APP.notify('Fill all required fields', 'error'); return false;
    }
    DB.update('hodEquipmentBackdowns', id, {
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
        serviceId: data.serviceId || ''
    });
    APP.notify('Breakdown record updated!', 'success');
    renderEmpBreakdownTab();
    return true;
}

function empBreakdownDelete(id) {
    confirmAction('Delete this breakdown record?', function(){
        DB.delete('hodEquipmentBackdowns', id);
        APP.notify('Breakdown record deleted', 'success');
        renderEmpBreakdownTab();
    });
}

function empDownloadBreakdownReport() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department || '';
    var all = (DB.get('hodEquipmentBackdowns') || []).filter(function(b){ return b.department === dept; });
    var wb = XLSX.utils.book_new();
    var dashData = [
        ['Equipment Breakdown Report'],
        ['Department', dept],
        ['Generated', new Date().toLocaleString('en-IN')],
        [],
        ['Metric', 'Value'],
        ['Total Breakdowns', all.length]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dashData), 'Dashboard');
    var headers = ['Asset Code','Asset Name','Service Type','Breakdown Date','Reason','Warranty Info','Service Period','Last Service','Next Service Due','Notes','Created By','Created At'];
    var rows = all.map(function(b){
        return [b.assetCode||'', b.assetName||'', b.serviceType||'', b.backdownDate||'', b.reason||'', b.warrantyInfo||'', b.servicePeriod||'', b.lastServiceDate||'', b.nextServiceDue||'', b.notes||'', b.createdByName||'', b.createdAt?APP.formatDate(b.createdAt):''];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers].concat(rows)), 'All Breakdowns');
    XLSX.writeFile(wb, 'Breakdown_Report_' + dept + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
    APP.notify('Breakdown Report downloaded!', 'success');
}

function empDownloadBreakdownPdf() {
    var user = AUTH.currentUser();
    if (!user) return;
    var dept = user.department || '';
    if (typeof window.jspdf==='undefined'){ APP.notify('PDF library not loaded','error'); return; }
    var all = (DB.get('hodEquipmentBackdowns') || []).filter(function(b){ return b.department === dept; });
    var doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Equipment Breakdown Report — ' + dept, 14, 15);
    doc.setFontSize(9);
    doc.text('Generated: ' + new Date().toLocaleString('en-IN') + '   Total Records: ' + all.length, 14, 22);
    var headers = ['Asset Code','Asset Name','Service Type','Breakdown Date','Reason','Warranty Info','Service Period','Last Service','Next Service Due','Notes','Created By'];
    var rows = all.map(function(b){
        return [b.assetCode||'', b.assetName||'', b.serviceType||'', b.backdownDate||'', b.reason||'', b.warrantyInfo||'', b.servicePeriod||'', b.lastServiceDate||'', b.nextServiceDue||'', b.notes||'', b.createdByName||''];
    });
    doc.autoTable({ head:[headers], body:rows, startY:27, styles:{fontSize:7}, headStyles:{fillColor:[106,27,154]} });
    doc.save('Breakdown_Report_' + dept + '_' + new Date().toISOString().slice(0,10) + '.pdf');
    APP.notify('PDF downloaded', 'success');
}


