// HMS — Reports & Analytics Module

var _reportTab = 'overview';
var _reportCharts = [];

function _rDestroyCharts() {
    for (var i = 0; i < _reportCharts.length; i++) {
        try { _reportCharts[i].destroy(); } catch(e) {}
    }
    _reportCharts = [];
}

function _rMakeChart(canvasId, config) {
    if (typeof Chart === 'undefined') return null;
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    try {
        var chart = new Chart(ctx, config);
        _reportCharts.push(chart);
        return chart;
    } catch(e) {
        console.warn('Chart error on ' + canvasId + ':', e);
        return null;
    }
}

var R_COLORS = ['#1a73e8','#34a853','#ea4335','#fbbc04','#9c27b0','#00bcd4','#ff9800','#78909c','#3f51b5','#e91e63'];

function _rKpi(val, label, color, icon, sub) {
    return '<div class="stat-card" style="border-left-color:' + color + ';min-width:0;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
        + '<div><div class="stat-value" style="color:' + color + ';">' + val + '</div>'
        + '<div class="stat-label">' + label + '</div>'
        + (sub ? '<div style="font-size:11px;color:var(--gray);margin-top:3px;">' + sub + '</div>' : '')
        + '</div><span style="font-size:28px;opacity:0.55;">' + icon + '</span></div></div>';
}

function _rChartCard(title, id, h) {
    h = h || 230;
    return '<div class="card" style="padding:16px;">'
        + '<div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">' + title + '</div>'
        + '<div style="position:relative;height:' + h + 'px;"><canvas id="' + id + '"></canvas></div>'
        + '</div>';
}

function renderReports(container) {
    var user = AUTH.currentUser();
    var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');
    var TABS = [
        { id: 'overview',    label: '📊 Overview',    color: '#1a73e8' },
        { id: 'tasks',       label: '✅ Tasks',        color: '#34a853' },
        { id: 'admissions',  label: '🏥 Admissions',  color: '#00bcd4' },
        { id: 'problems',    label: '🔧 Problems',     color: '#ea4335' },
        { id: 'materials',   label: '📦 Materials',    color: '#ff9800' },
        { id: 'departments', label: '🏢 Departments',  color: '#9c27b0' },
        { id: 'checklists',  label: '📋 Checklists',   color: '#fbbc04' },
        { id: 'download',    label: '⬇️ Download',     color: '#455a64' }
    ];
    if (isAdmin) TABS.splice(TABS.length - 1, 0, { id: 'budget', label: '💰 Budget', color: '#2e7d32' });

    var btnHtml = TABS.map(function(t) {
        var active = t.id === _reportTab;
        return '<button onclick="switchReportTab(\'' + t.id + '\',this)"'
            + ' style="padding:8px 14px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;'
            + (active ? 'background:' + t.color + ';color:#fff;' : 'background:var(--card-bg);color:var(--text);border:1px solid var(--light-gray);')
            + '" data-tab="' + t.id + '" data-color="' + t.color + '">' + t.label + '</button>';
    }).join('');

    container.innerHTML =
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;" id="rTabBar">' + btnHtml + '</div>'
        + '<div id="rContent"></div>';

    _renderReportTab(_reportTab);
}

function switchReportTab(tab, btn) {
    _reportTab = tab;
    var bar = document.getElementById('rTabBar');
    if (bar) {
        bar.querySelectorAll('button').forEach(function(b) {
            var isActive = b.dataset.tab === tab;
            if (isActive) {
                b.style.background = b.dataset.color;
                b.style.color = '#fff';
                b.style.border = 'none';
            } else {
                b.style.background = 'var(--card-bg)';
                b.style.color = 'var(--text)';
                b.style.border = '1px solid var(--light-gray)';
            }
        });
    }
    _renderReportTab(tab);
}

function _renderReportTab(tab) {
    _rDestroyCharts();
    var el = document.getElementById('rContent');
    if (!el) return;
    var map = {
        overview:    _rOverview,
        tasks:       _rTasks,
        admissions:  _rAdmissions,
        problems:    _rProblems,
        materials:   _rMaterials,
        departments: _rDepartments,
        checklists:  _rChecklists,
        budget:      _rBudgetReport,
        download:    _rDownload
    };
    if (map[tab]) map[tab](el);
}

// role filter helper
function _rRoleFilter(items, user) {
    if (!user || user.isSuperAdmin || user.role === 'admin') return items;
    return items.filter(function(item) {
        if (user.role === 'hod') return item.department === user.department || item.createdBy === user.username;
        return item.createdBy === user.username || item.assignedTo === user.fullName;
    });
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════
function _rOverview(el) {
    var user = AUTH.currentUser();
    var tasks      = _rRoleFilter(DB.get('tasks') || [], user);
    var problems   = _rRoleFilter(DB.get('problems') || [], user);
    var adms       = _rRoleFilter(DB.get('admissions') || [], user);
    var matReqs    = _rRoleFilter(DB.get('material_requests') || [], user);
    var complaints = _rRoleFilter(DB.get('complaints') || [], user);
    var users      = DB.get('users') || [];
    var depts      = DB.get('departments') || [];
    var inventory  = DB.get('inventory') || [];

    var tasksDone  = tasks.filter(function(t){ return t.status === 'completed'; }).length;
    var openProbs  = problems.filter(function(p){ return p.status !== 'resolved'; }).length;
    var curPat     = adms.filter(function(a){ return a.status === 'admitted'; }).length;
    var pendReqs   = matReqs.filter(function(r){ return r.status === 'pending'; }).length;
    var lowStock   = inventory.filter(function(i){ return (i.quantity || 0) < 5; }).length;
    var openComps  = complaints.filter(function(c){ return c.status !== 'resolved'; }).length;
    var staff      = users.filter(function(u){ return u.role !== 'admin'; }).length;

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(tasks.length, 'Total Tasks', '#1a73e8', '✅', Math.round(tasksDone / Math.max(tasks.length,1) * 100) + '% completed')
        + _rKpi(openProbs, 'Open Problems', '#ea4335', '🔧', (problems.length - openProbs) + ' resolved')
        + _rKpi(curPat, 'Current Patients', '#00bcd4', '🏥', adms.length + ' total admissions')
        + _rKpi(pendReqs, 'Pending Requests', '#ff9800', '📦', matReqs.length + ' total')
        + '</div>'
        + '<div class="grid-4 mb-4">'
        + _rKpi(staff, 'Total Staff', '#9c27b0', '👥', depts.length + ' departments')
        + _rKpi(tasksDone, 'Completed Tasks', '#34a853', '✔️', 'of ' + tasks.length)
        + _rKpi(openComps, 'Open Complaints', '#fbbc04', '📝', complaints.length + ' total')
        + _rKpi(lowStock, 'Low Stock Items', '#ea4335', '⚠️', 'qty < 5')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:16px;">'
        + _rChartCard('Task Status', 'rc_taskStatus', 220)
        + _rChartCard('Admissions by Type', 'rc_admType', 220)
        + _rChartCard('Problems by Category', 'rc_probCat', 220)
        + _rChartCard('Request Status', 'rc_matStatus', 220)
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'
        + _rChartCard('Tasks by Department', 'rc_taskDept', 240)
        + _rChartCard('Staff by Department', 'rc_staffDept', 240)
        + '</div>';

    setTimeout(function() {
        _rMakeChart('rc_taskStatus', {
            type: 'doughnut',
            data: {
                labels: ['Pending','In Progress','Completed'],
                datasets: [{ data: [
                    tasks.filter(function(t){ return t.status==='pending'; }).length,
                    tasks.filter(function(t){ return t.status==='in-progress'; }).length,
                    tasksDone
                ], backgroundColor: ['#fbbc04','#1a73e8','#34a853'], borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
        _rMakeChart('rc_admType', {
            type: 'pie',
            data: {
                labels: ['Regular','Emergency','ICU'],
                datasets: [{ data: [
                    adms.filter(function(a){ return a.type==='regular'; }).length,
                    adms.filter(function(a){ return a.type==='emergency'; }).length,
                    adms.filter(function(a){ return a.type==='icu'; }).length
                ], backgroundColor: ['#34a853','#ea4335','#fbbc04'], borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
        var probCats = {};
        problems.forEach(function(p){ var c = p.category || 'Other'; probCats[c] = (probCats[c]||0)+1; });
        var catK = Object.keys(probCats);
        _rMakeChart('rc_probCat', {
            type: 'pie',
            data: {
                labels: catK.length ? catK : ['No Data'],
                datasets: [{ data: catK.length ? Object.values(probCats) : [1], backgroundColor: R_COLORS, borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
        _rMakeChart('rc_matStatus', {
            type: 'doughnut',
            data: {
                labels: ['Pending','Approved','Rejected'],
                datasets: [{ data: [
                    matReqs.filter(function(r){ return r.status==='pending'; }).length,
                    matReqs.filter(function(r){ return r.status==='approved'; }).length,
                    matReqs.filter(function(r){ return r.status==='rejected'; }).length
                ], backgroundColor: ['#fbbc04','#34a853','#ea4335'], borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
        var tByDept = {};
        tasks.forEach(function(t){ var d = t.department||'Unassigned'; tByDept[d]=(tByDept[d]||0)+1; });
        var tdK = Object.keys(tByDept);
        _rMakeChart('rc_taskDept', {
            type: 'bar',
            data: {
                labels: tdK.length ? tdK : ['No Data'],
                datasets: [{ label: 'Tasks', data: tdK.length ? Object.values(tByDept) : [0], backgroundColor: '#1a73e8', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
        var sByDept = {};
        users.filter(function(u){ return u.role!=='admin'; }).forEach(function(u){ var d=u.department||'Unassigned'; sByDept[d]=(sByDept[d]||0)+1; });
        var sdK = Object.keys(sByDept);
        _rMakeChart('rc_staffDept', {
            type: 'bar',
            data: {
                labels: sdK.length ? sdK : ['No Data'],
                datasets: [{ label: 'Staff', data: sdK.length ? Object.values(sByDept) : [0], backgroundColor: '#9c27b0', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════
function _rTasks(el) {
    var user = AUTH.currentUser();
    var tasks = _rRoleFilter((DB.get('tasks')||[]).concat(DB.get('hodTasks')||[]), user);
    var total     = tasks.length;
    var pending   = tasks.filter(function(t){ return t.status==='pending'; }).length;
    var inProg    = tasks.filter(function(t){ return t.status==='in-progress'; }).length;
    var completed = tasks.filter(function(t){ return t.status==='completed'; }).length;
    var overdue   = tasks.filter(function(t){ return t.status!=='completed' && t.deadline && new Date(t.deadline)<new Date(); }).length;
    var hiPri     = tasks.filter(function(t){ return t.priority==='high'; }).length;
    var medPri    = tasks.filter(function(t){ return t.priority==='medium'; }).length;
    var lowPri    = tasks.filter(function(t){ return t.priority==='low'; }).length;

    var deptMap = {};
    tasks.forEach(function(t) {
        var d = t.department || 'Unassigned';
        if (!deptMap[d]) deptMap[d] = { pending:0, inProgress:0, completed:0 };
        if (t.status==='pending') deptMap[d].pending++;
        else if (t.status==='in-progress') deptMap[d].inProgress++;
        else if (t.status==='completed') deptMap[d].completed++;
    });
    var dL = Object.keys(deptMap);

    var overdueRows = tasks.filter(function(t){ return t.status!=='completed' && t.deadline && new Date(t.deadline)<new Date(); })
        .map(function(t){
            return '<tr><td><strong>' + (t.title||'') + '</strong></td>'
                + '<td>' + (t.assignedTo||'-') + '</td>'
                + '<td>' + (t.department||'-') + '</td>'
                + '<td style="color:#ea4335;">' + APP.formatDate(t.deadline) + '</td>'
                + '<td><span class="badge badge-' + (t.priority==='high'?'danger':t.priority==='medium'?'warning':'info') + '">' + (t.priority||'low') + '</span></td></tr>';
        }).join('');

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(total, 'Total Tasks', '#1a73e8', '📋', '')
        + _rKpi(pending, 'Pending', '#fbbc04', '⏳', '')
        + _rKpi(inProg, 'In Progress', '#00bcd4', '▶️', '')
        + _rKpi(completed, 'Completed', '#34a853', '✅', Math.round(completed/Math.max(total,1)*100) + '% rate')
        + '</div>'
        + '<div class="grid-4 mb-4">'
        + _rKpi(overdue, 'Overdue', '#ea4335', '⚠️', 'need attention')
        + _rKpi(hiPri, 'High Priority', '#ea4335', '🔴', '')
        + _rKpi(medPri, 'Medium Priority', '#fbbc04', '🟡', '')
        + _rKpi(lowPri, 'Low Priority', '#34a853', '🟢', '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Task Status', 'rt_status', 240)
        + _rChartCard('Task Priority', 'rt_priority', 240)
        + '</div>'
        + '<div style="margin-bottom:16px;">'
        + _rChartCard('Tasks by Department (Stacked)', 'rt_dept', 260)
        + '</div>'
        + (overdue > 0 ?
            '<div class="card" style="padding:16px;border-left:4px solid #ea4335;">'
            + '<div style="font-size:14px;font-weight:700;color:#ea4335;margin-bottom:12px;">⚠️ Overdue Tasks (' + overdue + ')</div>'
            + '<div class="table-responsive"><table><thead><tr><th>Task</th><th>Assigned To</th><th>Dept</th><th>Deadline</th><th>Priority</th></tr></thead>'
            + '<tbody>' + overdueRows + '</tbody></table></div></div>' : '');

    setTimeout(function() {
        _rMakeChart('rt_status', {
            type: 'doughnut',
            data: { labels: ['Pending','In Progress','Completed'], datasets: [{ data: [pending,inProg,completed], backgroundColor: ['#fbbc04','#1a73e8','#34a853'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('rt_priority', {
            type: 'doughnut',
            data: { labels: ['High','Medium','Low'], datasets: [{ data: [hiPri,medPri,lowPri], backgroundColor: ['#ea4335','#fbbc04','#34a853'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('rt_dept', {
            type: 'bar',
            data: {
                labels: dL.length ? dL : ['No Data'],
                datasets: [
                    { label: 'Pending',     data: dL.map(function(d){ return deptMap[d].pending; }),    backgroundColor: '#fbbc04', borderRadius: 4 },
                    { label: 'In Progress', data: dL.map(function(d){ return deptMap[d].inProgress; }), backgroundColor: '#1a73e8', borderRadius: 4 },
                    { label: 'Completed',   data: dL.map(function(d){ return deptMap[d].completed; }),  backgroundColor: '#34a853', borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// ADMISSIONS
// ══════════════════════════════════════════════════════════════
function _rAdmissions(el) {
    var user = AUTH.currentUser();
    var adms = _rRoleFilter(DB.get('admissions') || [], user);
    var admitted   = adms.filter(function(a){ return a.status==='admitted'; });
    var discharged = adms.filter(function(a){ return a.status==='discharged'; });
    var emergency  = adms.filter(function(a){ return a.type==='emergency'; });
    var icu        = adms.filter(function(a){ return a.type==='icu'; });

    var staySum = 0, stayCnt = 0;
    discharged.forEach(function(a) {
        if (a.admissionDate && a.dischargeDate) { staySum += APP.daysBetween(a.admissionDate, a.dischargeDate); stayCnt++; }
    });
    var avgStay = stayCnt > 0 ? (staySum/stayCnt).toFixed(1) : 0;
    var totalBill = adms.reduce(function(s,a){ return s+(parseFloat(a.billAmount)||0); }, 0);

    var byMonth = {};
    adms.forEach(function(a) {
        if (!a.admissionDate) return;
        var m = a.admissionDate.substring(0,7);
        byMonth[m] = (byMonth[m]||0)+1;
    });
    var mKeys = Object.keys(byMonth).sort().slice(-12);

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(adms.length, 'Total Admissions', '#1a73e8', '📋', '')
        + _rKpi(admitted.length, 'Currently Admitted', '#00bcd4', '🏥', '')
        + _rKpi(discharged.length, 'Discharged', '#34a853', '✅', '')
        + _rKpi(emergency.length, 'Emergency Cases', '#ea4335', '🚨', '')
        + '</div>'
        + '<div class="grid-4 mb-4">'
        + _rKpi(icu.length, 'ICU Cases', '#fbbc04', '⚕️', '')
        + _rKpi(avgStay, 'Avg Stay (days)', '#9c27b0', '📅', '')
        + _rKpi('₹' + totalBill.toLocaleString('en-IN'), 'Total Revenue', '#34a853', '💰', '')
        + _rKpi(adms.filter(function(a){ return a.paymentStatus==='pending'; }).length, 'Payment Pending', '#ea4335', '💳', '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Admission by Type', 'ra_type', 240)
        + _rChartCard('Admission Status', 'ra_status', 240)
        + '</div>'
        + '<div style="margin-bottom:16px;">'
        + _rChartCard('Monthly Admission Trend', 'ra_monthly', 240)
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'
        + _rChartCard('Payment Status', 'ra_payment', 220)
        + _rChartCard('Gender Distribution', 'ra_gender', 220)
        + '</div>';

    setTimeout(function() {
        _rMakeChart('ra_type', {
            type: 'pie',
            data: { labels: ['Regular','Emergency','ICU'],
                datasets: [{ data: [adms.filter(function(a){ return a.type==='regular'; }).length, emergency.length, icu.length],
                backgroundColor: ['#34a853','#ea4335','#fbbc04'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('ra_status', {
            type: 'doughnut',
            data: { labels: ['Admitted','Discharged'],
                datasets: [{ data: [admitted.length, discharged.length], backgroundColor: ['#1a73e8','#34a853'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('ra_monthly', {
            type: 'bar',
            data: { labels: mKeys.length ? mKeys : ['No Data'],
                datasets: [{ label: 'Admissions', data: mKeys.length ? mKeys.map(function(m){ return byMonth[m]; }) : [0],
                backgroundColor: '#00bcd4', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
        var paid = adms.filter(function(a){ return a.paymentStatus==='paid'; }).length;
        var payP = adms.filter(function(a){ return a.paymentStatus==='pending'; }).length;
        var payT = adms.filter(function(a){ return a.paymentStatus==='partial'; }).length;
        _rMakeChart('ra_payment', {
            type: 'doughnut',
            data: { labels: ['Paid','Pending','Partial'],
                datasets: [{ data: [paid,payP,payT], backgroundColor: ['#34a853','#ea4335','#fbbc04'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
        var male   = adms.filter(function(a){ return (a.gender||'').toLowerCase()==='male'; }).length;
        var female = adms.filter(function(a){ return (a.gender||'').toLowerCase()==='female'; }).length;
        var other  = adms.length - male - female;
        _rMakeChart('ra_gender', {
            type: 'pie',
            data: { labels: ['Male','Female','Other'],
                datasets: [{ data: [male,female,other], backgroundColor: ['#1a73e8','#e91e63','#78909c'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// PROBLEMS
// ══════════════════════════════════════════════════════════════
function _rProblems(el) {
    var user = AUTH.currentUser();
    var probs = _rRoleFilter(DB.get('problems') || [], user);
    var open     = probs.filter(function(p){ return p.status==='open'; }).length;
    var inProg   = probs.filter(function(p){ return p.status==='in-progress'; }).length;
    var resolved = probs.filter(function(p){ return p.status==='resolved'; }).length;
    var hiPri    = probs.filter(function(p){ return p.priority==='high'; }).length;
    var medPri   = probs.filter(function(p){ return p.priority==='medium'; }).length;
    var lowPri   = probs.filter(function(p){ return p.priority==='low'; }).length;

    var byCat  = {};
    probs.forEach(function(p){ var c=p.category||'Other'; byCat[c]=(byCat[c]||0)+1; });
    var byDept = {};
    probs.forEach(function(p){ var d=p.department||'Unassigned'; byDept[d]=(byDept[d]||0)+1; });
    var catK  = Object.keys(byCat);
    var deptK = Object.keys(byDept);

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(probs.length, 'Total Problems', '#1a73e8', '📋', '')
        + _rKpi(open, 'Open', '#ea4335', '🔴', 'require action')
        + _rKpi(inProg, 'In Progress', '#00bcd4', '🔵', '')
        + _rKpi(resolved, 'Resolved', '#34a853', '✅', Math.round(resolved/Math.max(probs.length,1)*100) + '% rate')
        + '</div>'
        + '<div class="grid-4 mb-4">'
        + _rKpi(hiPri, 'High Priority', '#ea4335', '🚨', '')
        + _rKpi(medPri, 'Medium Priority', '#fbbc04', '⚠️', '')
        + _rKpi(lowPri, 'Low Priority', '#34a853', '✔️', '')
        + _rKpi(catK.length, 'Categories', '#9c27b0', '🏷️', '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Problems by Category', 'rp_cat', 250)
        + _rChartCard('Problems by Status', 'rp_status', 250)
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'
        + _rChartCard('Problems by Priority', 'rp_pri', 220)
        + _rChartCard('Problems by Department', 'rp_dept', 220)
        + '</div>';

    setTimeout(function() {
        _rMakeChart('rp_cat', {
            type: 'pie',
            data: { labels: catK.length ? catK : ['No Data'],
                datasets: [{ data: catK.length ? Object.values(byCat) : [1], backgroundColor: R_COLORS, borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('rp_status', {
            type: 'doughnut',
            data: { labels: ['Open','In Progress','Resolved'],
                datasets: [{ data: [open,inProg,resolved], backgroundColor: ['#ea4335','#1a73e8','#34a853'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('rp_pri', {
            type: 'bar',
            data: { labels: ['High','Medium','Low'],
                datasets: [{ label: 'Count', data: [hiPri,medPri,lowPri], backgroundColor: ['#ea4335','#fbbc04','#34a853'], borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
        _rMakeChart('rp_dept', {
            type: 'bar',
            data: { labels: deptK.length ? deptK : ['No Data'],
                datasets: [{ label: 'Problems', data: deptK.length ? Object.values(byDept) : [0], backgroundColor: '#ea4335', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// MATERIALS
// ══════════════════════════════════════════════════════════════
function _rMaterials(el) {
    var user = AUTH.currentUser();
    var reqs = _rRoleFilter(DB.get('material_requests') || [], user);
    var pending  = reqs.filter(function(r){ return r.status==='pending'; }).length;
    var approved = reqs.filter(function(r){ return r.status==='approved'; }).length;
    var rejected = reqs.filter(function(r){ return r.status==='rejected'; }).length;
    var byDept = {};
    reqs.forEach(function(r){ var d=r.department||'Unassigned'; byDept[d]=(byDept[d]||0)+1; });
    var dK = Object.keys(byDept);
    var inv = DB.get('inventory') || [];
    var lowStock = inv.filter(function(i){ return (i.quantity||0)<5; });

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(reqs.length, 'Total Requests', '#1a73e8', '📦', '')
        + _rKpi(pending, 'Pending', '#fbbc04', '⏳', 'awaiting approval')
        + _rKpi(approved, 'Approved', '#34a853', '✅', '')
        + _rKpi(rejected, 'Rejected', '#ea4335', '❌', '')
        + '</div>'
        + '<div class="grid-4 mb-4">'
        + _rKpi(inv.length, 'Inventory Items', '#9c27b0', '🗂️', '')
        + _rKpi(lowStock.length, 'Low Stock Items', '#ea4335', '⚠️', 'qty < 5')
        + _rKpi(Math.round(approved/Math.max(reqs.length,1)*100) + '%', 'Approval Rate', '#34a853', '📊', '')
        + _rKpi(dK.length, 'Requesting Depts', '#78909c', '🏢', '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Request Status', 'rm_status', 250)
        + _rChartCard('Requests by Department', 'rm_dept', 250)
        + '</div>'
        + (lowStock.length > 0 ?
            '<div class="card" style="padding:16px;border-left:4px solid #ea4335;">'
            + '<div style="font-size:14px;font-weight:700;color:#ea4335;margin-bottom:12px;">⚠️ Low Stock Alerts</div>'
            + '<div class="table-responsive"><table><thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit</th></tr></thead><tbody>'
            + lowStock.map(function(i){
                return '<tr><td><strong>'+(i.name||'')+'</strong></td><td>'+(i.category||'-')+'</td>'
                    + '<td style="color:#ea4335;font-weight:700;">'+(i.quantity||0)+'</td><td>'+(i.unit||'pcs')+'</td></tr>';
              }).join('')
            + '</tbody></table></div></div>' : '');

    setTimeout(function() {
        _rMakeChart('rm_status', {
            type: 'doughnut',
            data: { labels: ['Pending','Approved','Rejected'],
                datasets: [{ data: [pending,approved,rejected], backgroundColor: ['#fbbc04','#34a853','#ea4335'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('rm_dept', {
            type: 'bar',
            data: { labels: dK.length ? dK : ['No Data'],
                datasets: [{ label: 'Requests', data: dK.length ? Object.values(byDept) : [0], backgroundColor: '#ff9800', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// DEPARTMENTS
// ══════════════════════════════════════════════════════════════
function _rDepartments(el) {
    var user = AUTH.currentUser();
    var depts   = DB.get('departments') || [];
    var tasks   = _rRoleFilter((DB.get('tasks')||[]).concat(DB.get('hodTasks')||[]), user);
    var probs   = _rRoleFilter(DB.get('problems') || [], user);
    var matReqs = _rRoleFilter(DB.get('material_requests') || [], user);
    var users   = DB.get('users') || [];

    var stats = {};
    depts.forEach(function(d) {
        var nm  = d.name;
        var dt  = tasks.filter(function(t){ return t.department===nm; });
        var dp  = probs.filter(function(p){ return p.department===nm; });
        var dr  = matReqs.filter(function(r){ return r.department===nm; });
        var dst = users.filter(function(u){ return u.department===nm; });
        var dtDone = dt.filter(function(t){ return t.status==='completed'; }).length;
        var dpOpen = dp.filter(function(p){ return p.status!=='resolved'; }).length;
        var tScore = dt.length > 0 ? Math.round(dtDone/dt.length*100) : 0;
        var pScore = dp.length > 0 ? Math.round((dp.length-dpOpen)/dp.length*100) : 100;
        stats[nm] = { tasks: dt.length, done: dtDone, tScore: tScore, probs: dp.length, open: dpOpen, pScore: pScore, requests: dr.length, staff: dst.length, score: Math.round((tScore+pScore)/2) };
    });
    var dNames = Object.keys(stats);

    var cardsHtml = dNames.map(function(nm) {
        var s   = stats[nm];
        var sc  = s.score  >= 75 ? '#34a853' : s.score  >= 50 ? '#fbbc04' : '#ea4335';
        var tsC = s.tScore >= 75 ? '#34a853' : s.tScore >= 50 ? '#fbbc04' : '#ea4335';
        var psC = s.pScore >= 75 ? '#34a853' : s.pScore >= 50 ? '#fbbc04' : '#ea4335';
        return '<div class="card" style="padding:16px;border-left:4px solid ' + sc + ';">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
            + '<div style="font-size:15px;font-weight:700;">' + nm + '</div>'
            + '<div style="text-align:center;"><div style="font-size:26px;font-weight:800;color:' + sc + ';">' + s.score + '%</div>'
            + '<div style="font-size:10px;color:var(--gray);">Score</div></div></div>'
            + '<div style="margin-bottom:8px;">'
            + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
            + '<span>Task Completion</span><span style="font-weight:600;">' + s.done + '/' + s.tasks + '</span></div>'
            + '<div style="height:7px;background:var(--light-gray);border-radius:4px;overflow:hidden;">'
            + '<div style="height:100%;width:' + s.tScore + '%;background:' + tsC + ';border-radius:4px;transition:width .5s;"></div></div></div>'
            + '<div style="margin-bottom:8px;">'
            + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
            + '<span>Problem Resolution</span><span style="font-weight:600;">' + (s.probs-s.open) + '/' + s.probs + '</span></div>'
            + '<div style="height:7px;background:var(--light-gray);border-radius:4px;overflow:hidden;">'
            + '<div style="height:100%;width:' + s.pScore + '%;background:' + psC + ';border-radius:4px;transition:width .5s;"></div></div></div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;">'
            + '<div style="text-align:center;padding:5px;background:var(--bg);border-radius:6px;"><div style="font-size:16px;font-weight:700;color:#9c27b0;">' + s.staff + '</div><div style="font-size:10px;color:var(--gray);">Staff</div></div>'
            + '<div style="text-align:center;padding:5px;background:var(--bg);border-radius:6px;"><div style="font-size:16px;font-weight:700;color:#ff9800;">' + s.requests + '</div><div style="font-size:10px;color:var(--gray);">Requests</div></div>'
            + '</div></div>';
    }).join('');

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(depts.length, 'Total Departments', '#9c27b0', '🏢', '')
        + _rKpi(depts.filter(function(d){ return d.active!==false; }).length, 'Active Depts', '#34a853', '✅', '')
        + _rKpi(users.filter(function(u){ return u.role!=='admin'; }).length, 'Total Staff', '#1a73e8', '👥', '')
        + _rKpi(dNames.filter(function(n){ return stats[n].score>=75; }).length, 'High Performing', '#34a853', '🏆', 'score ≥ 75%')
        + '</div>'
        + (dNames.length > 0
            ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:20px;">' + cardsHtml + '</div>'
            : '<div class="card"><div class="empty-state">No departments found. Add departments first.</div></div>')
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Task Completion Rate by Dept (%)', 'rd_trate', 250)
        + _rChartCard('Open Problems by Dept', 'rd_openp', 250)
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'
        + _rChartCard('Staff Count by Dept', 'rd_staff', 220)
        + _rChartCard('Material Requests by Dept', 'rd_reqs', 220)
        + '</div>';

    setTimeout(function() {
        if (!dNames.length) return;
        _rMakeChart('rd_trate', {
            type: 'bar',
            data: { labels: dNames,
                datasets: [{ label: 'Completion %', data: dNames.map(function(n){ return stats[n].tScore; }),
                backgroundColor: dNames.map(function(n){ var s=stats[n].tScore; return s>=75?'#34a853':s>=50?'#fbbc04':'#ea4335'; }),
                borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { callback: function(v){ return v+'%'; } } } } }
        });
        _rMakeChart('rd_openp', {
            type: 'bar',
            data: { labels: dNames,
                datasets: [{ label: 'Open Problems', data: dNames.map(function(n){ return stats[n].open; }), backgroundColor: '#ea4335', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
        _rMakeChart('rd_staff', {
            type: 'bar',
            data: { labels: dNames,
                datasets: [{ label: 'Staff', data: dNames.map(function(n){ return stats[n].staff; }), backgroundColor: '#9c27b0', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
        _rMakeChart('rd_reqs', {
            type: 'bar',
            data: { labels: dNames,
                datasets: [{ label: 'Requests', data: dNames.map(function(n){ return stats[n].requests; }), backgroundColor: '#ff9800', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// CHECKLISTS
// ══════════════════════════════════════════════════════════════
function _rChecklists(el) {
    var user = AUTH.currentUser();
    var allCl = (DB.get('checklists')||[]).concat(DB.get('adminChecklist')||[]);
    var cl = _rRoleFilter(allCl, user);
    var done    = cl.filter(function(c){ return c.status==='completed'; }).length;
    var pending = cl.length - done;

    var byDept = {};
    var dDone  = {};
    cl.forEach(function(c) {
        var d = c.department || 'General';
        byDept[d] = (byDept[d]||0)+1;
        dDone[d]  = (dDone[d]||0) + (c.status==='completed' ? 1 : 0);
    });
    var bdK = Object.keys(byDept);

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(cl.length, 'Total Checklists', '#1a73e8', '📋', '')
        + _rKpi(done, 'Completed', '#34a853', '✅', Math.round(done/Math.max(cl.length,1)*100) + '% rate')
        + _rKpi(pending, 'Pending', '#fbbc04', '⏳', '')
        + _rKpi(bdK.length, 'Departments', '#9c27b0', '🏢', '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Completion Rate', 'rcl_status', 250)
        + _rChartCard('Checklists by Department', 'rcl_dept', 250)
        + '</div>'
        + '<div style="margin-bottom:16px;">'
        + _rChartCard('Completed vs Pending by Department', 'rcl_drate', 260)
        + '</div>';

    setTimeout(function() {
        _rMakeChart('rcl_status', {
            type: 'doughnut',
            data: { labels: ['Completed','Pending'],
                datasets: [{ data: [done,pending], backgroundColor: ['#34a853','#fbbc04'], borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        _rMakeChart('rcl_dept', {
            type: 'bar',
            data: { labels: bdK.length ? bdK : ['No Data'],
                datasets: [{ label: 'Checklists', data: bdK.length ? Object.values(byDept) : [0], backgroundColor: '#00bcd4', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
        _rMakeChart('rcl_drate', {
            type: 'bar',
            data: { labels: bdK.length ? bdK : ['No Data'],
                datasets: [
                    { label: 'Completed', data: bdK.map(function(d){ return dDone[d]||0; }),                backgroundColor: '#34a853', borderRadius: 4 },
                    { label: 'Pending',   data: bdK.map(function(d){ return (byDept[d]||0)-(dDone[d]||0); }), backgroundColor: '#fbbc04', borderRadius: 4 }
                ] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// BUDGET REPORT (admin-only)
// ══════════════════════════════════════════════════════════════
function _rBudgetReport(el) {
    var user = AUTH.currentUser();
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
        el.innerHTML = '<div class="card"><div class="empty-state">🔒 Budget report is restricted to administrators.</div></div>';
        return;
    }

    var budgets  = DB.get('budgets')  || [];
    var expenses = DB.get('budget_expenses') || [];

    // Latest budget per dept
    var latestBudget = {};
    budgets.forEach(function(b) {
        if (!latestBudget[b.department] || b.createdAt > latestBudget[b.department].createdAt)
            latestBudget[b.department] = b;
    });
    var deptSpent = {};
    expenses.forEach(function(e) {
        deptSpent[e.department] = (deptSpent[e.department] || 0) + (parseFloat(e.amount) || 0);
    });
    var allDepts = Object.keys(Object.assign({}, latestBudget, deptSpent));

    var totalBudget = Object.values(latestBudget).reduce(function(s,b){ return s+(parseFloat(b.amount)||0); }, 0);
    var totalSpent  = expenses.reduce(function(s,e){ return s+(parseFloat(e.amount)||0); }, 0);
    var remaining   = totalBudget - totalSpent;
    var utilPct     = totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0;

    // Category totals
    var catMap = {};
    expenses.forEach(function(e){ catMap[e.category||'Other'] = (catMap[e.category||'Other']||0)+(parseFloat(e.amount)||0); });
    var catK = Object.keys(catMap);

    // Monthly trend (last 12)
    var monthMap = {};
    expenses.forEach(function(e) {
        var m = (e.expenseDate||e.createdAt||'').substring(0,7);
        if (m) monthMap[m] = (monthMap[m]||0)+(parseFloat(e.amount)||0);
    });
    var mKeys = Object.keys(monthMap).sort().slice(-12);

    function bFmt(n){ return '₹' + Number(n||0).toLocaleString('en-IN'); }

    // Dept rows
    var deptRows = allDepts.map(function(nm) {
        var bAmt  = latestBudget[nm] ? (parseFloat(latestBudget[nm].amount)||0) : 0;
        var spent = deptSpent[nm] || 0;
        var pct   = bAmt > 0 ? Math.round(spent/bAmt*100) : (spent>0?100:0);
        var rem   = bAmt - spent;
        var col   = pct>=90?'#ea4335':pct>=70?'#fbbc04':'#34a853';
        return '<tr>'
            + '<td><strong>' + nm + '</strong></td>'
            + '<td>' + bFmt(bAmt) + '</td>'
            + '<td style="color:#ea4335;font-weight:600;">' + bFmt(spent) + '</td>'
            + '<td style="color:' + (rem<0?'#ea4335':'#34a853') + ';font-weight:700;">' + bFmt(rem) + (rem<0?' ⚠️':'') + '</td>'
            + '<td style="min-width:140px;">'
            + '<div style="display:flex;align-items:center;gap:6px;">'
            + '<div style="flex:1;height:8px;background:var(--light-gray);border-radius:4px;overflow:hidden;">'
            + '<div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + col + ';border-radius:4px;"></div></div>'
            + '<span style="font-size:12px;font-weight:700;color:' + col + ';">' + pct + '%</span></div></td>'
            + '</tr>';
    }).join('');

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _rKpi(bFmt(totalBudget), 'Total Budget',  '#2e7d32', '💰', allDepts.length + ' departments')
        + _rKpi(bFmt(totalSpent),  'Total Spent',   '#ea4335', '💸', utilPct + '% utilized')
        + _rKpi(bFmt(remaining),   'Remaining',     remaining >= 0 ? '#34a853' : '#ea4335', '🏦', remaining < 0 ? '⚠️ Over budget' : 'available')
        + _rKpi(utilPct + '%',     'Utilization',   utilPct>=90?'#ea4335':utilPct>=70?'#fbbc04':'#34a853', '📊', 'of total budget')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + _rChartCard('Budget vs Expenses by Department', 'rbg_dept', 260)
        + _rChartCard('Expense Category Breakdown', 'rbg_cat', 260)
        + '</div>'
        + '<div style="margin-bottom:16px;">'
        + _rChartCard('Monthly Expense Trend', 'rbg_monthly', 230)
        + '</div>'
        + '<div class="card">'
        + '<div style="font-size:14px;font-weight:700;padding:12px 16px;border-bottom:1px solid var(--light-gray);">Department Budget Utilization</div>'
        + '<div class="table-responsive"><table><thead><tr>'
        + '<th>Department</th><th>Allocated</th><th>Spent</th><th>Remaining</th><th>Utilization</th>'
        + '</tr></thead><tbody>'
        + (deptRows || '<tr><td colspan="5" class="empty-state">No budget data. Use the Budget module to set department budgets and log expenses.</td></tr>')
        + '</tbody></table></div></div>';

    setTimeout(function() {
        if (allDepts.length) {
            _rMakeChart('rbg_dept', {
                type: 'bar',
                data: {
                    labels: allDepts,
                    datasets: [
                        { label: 'Budget', data: allDepts.map(function(n){ return latestBudget[n]?(parseFloat(latestBudget[n].amount)||0):0; }), backgroundColor: '#2e7d32', borderRadius: 4 },
                        { label: 'Spent',  data: allDepts.map(function(n){ return deptSpent[n]||0; }), backgroundColor: '#ea4335', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '₹'+v.toLocaleString('en-IN'); } } } } }
            });
        }
        if (catK.length) {
            _rMakeChart('rbg_cat', {
                type: 'doughnut',
                data: { labels: catK, datasets: [{ data: Object.values(catMap), backgroundColor: R_COLORS, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }
        if (mKeys.length) {
            _rMakeChart('rbg_monthly', {
                type: 'bar',
                data: { labels: mKeys, datasets: [{ label: 'Expenses', data: mKeys.map(function(m){ return monthMap[m]; }), backgroundColor: '#ff9800', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '₹'+v.toLocaleString('en-IN'); } } } } }
            });
        }
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// DOWNLOAD TAB
// ══════════════════════════════════════════════════════════════

var _rSections = [
    {
        id: 'tasks', label: 'Tasks', icon: '✅', color: '#34a853', dbKey: 'tasks',
        headers: ['Title','Status','Priority','Department','Assigned To','Deadline','Created By','Date'],
        getRow: function(t){ return [t.title||'', t.status||'', t.priority||'', t.department||'', t.assignedTo||'', t.deadline||'', t.createdByName||t.createdBy||'', APP.formatDate(t.createdAt)]; }
    },
    {
        id: 'problems', label: 'Problems', icon: '🔧', color: '#ea4335', dbKey: 'problems',
        headers: ['Title','Category','Status','Priority','Department','Reported By','Date'],
        getRow: function(p){ return [p.title||'', p.category||'', p.status||'', p.priority||'', p.department||'', p.reportedBy||p.createdByName||'', APP.formatDate(p.createdAt)]; }
    },
    {
        id: 'admissions', label: 'Admissions', icon: '🏥', color: '#00bcd4', dbKey: 'admissions',
        headers: ['Patient Name','Age','Gender','Type','Status','Ward','Admission Date','Discharge Date','Bill Amount','Payment Status'],
        getRow: function(a){ return [a.patientName||'', a.age||'', a.gender||'', a.type||'', a.status||'', a.ward||'', a.admissionDate||'', a.dischargeDate||'', a.billAmount||'', a.paymentStatus||'']; }
    },
    {
        id: 'complaints', label: 'Complaints', icon: '📝', color: '#fbbc04', dbKey: 'complaints',
        headers: ['Patient Name','Room','Category','Priority','Status','Department','Date','Resolved By'],
        getRow: function(c){ return [c.patientName||'', c.roomNo||'', c.category||'', c.priority||'', c.status||'', c.department||'', APP.formatDate(c.createdAt), c.resolvedBy||'']; }
    },
    {
        id: 'materials', label: 'Material Requests', icon: '📦', color: '#ff9800', dbKey: 'material_requests',
        headers: ['Title','Department','Status','Requested By','Date','Approved By'],
        getRow: function(r){ return [r.title||'', r.department||'', r.status||'', r.createdByName||r.createdBy||'', APP.formatDate(r.createdAt), r.approvedBy||'']; }
    },
    {
        id: 'inventory', label: 'Inventory', icon: '🗂️', color: '#9c27b0', dbKey: 'inventory',
        headers: ['Item Name','Category','Quantity','Unit','Department','Last Updated'],
        getRow: function(i){ return [i.name||'', i.category||'', i.quantity||0, i.unit||'pcs', i.department||'', APP.formatDate(i.updatedAt||i.createdAt)]; }
    },
    {
        id: 'suggestions', label: 'Suggestions', icon: '💡', color: '#1a73e8', dbKey: 'suggestions',
        headers: ['Title','Description','Department','Submitted By','Date'],
        getRow: function(s){ return [s.title||'', (s.description||'').substring(0,120), s.department||'', s.createdByName||s.createdBy||'', APP.formatDate(s.createdAt)]; }
    },
    {
        id: 'lostfound', label: 'Lost & Found', icon: '🔍', color: '#78909c', dbKey: 'lostfound',
        headers: ['Item Name','Type','Category','Location','Reported By','Status','Date'],
        getRow: function(i){ return [i.itemName||'', i.type||'', i.category||'', i.location||'', i.reportedBy||'', i.status||'', APP.formatDate(i.createdAt)]; }
    },
    {
        id: 'staff', label: 'Staff Directory', icon: '👥', color: '#3f51b5', dbKey: 'users',
        headers: ['Full Name','Username','Role','Department','Email','Phone'],
        getRow: function(u){ return [u.fullName||'', u.username||'', u.role||'', u.department||'', u.email||'', u.phone||'']; }
    },
    {
        id: 'departments', label: 'Departments', icon: '🏢', color: '#e91e63', dbKey: 'departments',
        headers: ['Name','Status','HOD','Created At'],
        getRow: function(d){ return [d.name||'', d.active===false?'Inactive':'Active', d.hod||'', APP.formatDate(d.createdAt)]; }
    }
];

function _rDownload(el) {
    var user = AUTH.currentUser();

    var cardsHtml = _rSections.map(function(s) {
        var raw   = DB.get(s.dbKey) || [];
        var items = (s.id === 'staff' || s.id === 'departments' || s.id === 'inventory')
            ? raw : _rRoleFilter(raw, user);
        var count = items.length;
        return '<div class="card" style="padding:16px;border-top:3px solid ' + s.color + ';">'
            + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
            + '<span style="font-size:24px;">' + s.icon + '</span>'
            + '<div><div style="font-size:14px;font-weight:700;">' + s.label + '</div>'
            + '<div style="font-size:12px;color:var(--gray);">' + count + ' record' + (count !== 1 ? 's' : '') + '</div></div></div>'
            + '<div style="display:flex;gap:6px;">'
            + '<button class="btn btn-sm" style="flex:1;background:#1e7e34;color:#fff;font-size:12px;" '
            + 'onclick="rDownloadReport(\'' + s.id + '\',\'excel\')">📊 Excel</button>'
            + '<button class="btn btn-sm" style="flex:1;background:#c82333;color:#fff;font-size:12px;" '
            + 'onclick="rDownloadReport(\'' + s.id + '\',\'pdf\')">📄 PDF</button>'
            + '</div></div>';
    }).join('');

    el.innerHTML =
        '<div class="card" style="padding:18px 20px;margin-bottom:20px;background:linear-gradient(135deg,#37474f 0%,#263238 100%);color:#fff;border-radius:10px;">'
        + '<div style="font-size:18px;font-weight:700;margin-bottom:4px;">⬇️ Download Reports</div>'
        + '<div style="opacity:0.8;font-size:13px;">Export any module\'s data as an Excel spreadsheet (.xlsx) or PDF document.</div>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;">'
        + cardsHtml
        + '</div>';
}

function rDownloadReport(sectionId, format) {
    var cfg = null;
    for (var i = 0; i < _rSections.length; i++) {
        if (_rSections[i].id === sectionId) { cfg = _rSections[i]; break; }
    }
    if (!cfg) { APP.notify('Unknown section', 'error'); return; }

    var user = AUTH.currentUser();
    var raw   = DB.get(cfg.dbKey) || [];
    var items = (sectionId === 'staff' || sectionId === 'departments' || sectionId === 'inventory')
        ? raw : _rRoleFilter(raw, user);
    var rows  = items.map(cfg.getRow);

    if (rows.length === 0) { APP.notify('No data to export', 'info'); return; }

    if (format === 'excel') {
        _rExportExcel(cfg.label, cfg.headers, rows);
    } else {
        _rExportPDF(cfg.label, cfg.headers, rows);
    }
}

function _rExportExcel(title, headers, rows) {
    if (typeof XLSX === 'undefined') {
        APP.notify('Excel library not loaded yet — please wait a moment and retry', 'error');
        return;
    }
    var wb = XLSX.utils.book_new();
    var wsData = [headers].concat(rows);
    var ws = XLSX.utils.aoa_to_sheet(wsData);

    // auto column widths
    ws['!cols'] = headers.map(function(h, ci) {
        var max = h.length;
        rows.forEach(function(r) {
            var cell = r[ci] != null ? String(r[ci]) : '';
            if (cell.length > max) max = cell.length;
        });
        return { wch: Math.min(max + 2, 45) };
    });

    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    var fname = title.replace(/\s+/g, '_') + '_' + new Date().toISOString().substring(0, 10) + '.xlsx';
    XLSX.writeFile(wb, fname);
    APP.notify('Downloaded: ' + fname, 'success');
}

function _rExportPDF(title, headers, rows) {
    if (typeof window.jspdf === 'undefined') {
        APP.notify('PDF library not loaded yet — please wait a moment and retry', 'error');
        return;
    }
    var jsPDF = window.jspdf.jsPDF;
    var orientation = headers.length > 6 ? 'l' : 'p';
    var doc = new jsPDF(orientation, 'mm', 'a4');
    var pageW = doc.internal.pageSize.getWidth();

    // Title block
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Hospital Management System', 14, 10);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(title + ' Report', 14, 17);

    // Meta line
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    var dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text('Generated: ' + dateStr + '   |   Records: ' + rows.length, 14, 29);

    // Table
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 33,
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [26, 115, 232], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [240, 246, 255] },
        margin: { left: 14, right: 14 },
        didDrawPage: function(data) {
            // page footer
            doc.setFontSize(7);
            doc.setTextColor(160, 160, 160);
            var pg = doc.internal.getCurrentPageInfo().pageNumber;
            var total = doc.internal.getNumberOfPages();
            doc.text('Page ' + pg + ' of ' + total, pageW - 28, doc.internal.pageSize.getHeight() - 8);
            doc.text('HMS — Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        }
    });

    var fname = title.replace(/\s+/g, '_') + '_' + new Date().toISOString().substring(0, 10) + '.pdf';
    doc.save(fname);
    APP.notify('Downloaded: ' + fname, 'success');
}
