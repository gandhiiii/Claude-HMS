// HMS — Reports & Analytics Module

var _reportTab = 'summary';
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
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
        container.innerHTML = '<div class="card" style="text-align:center;padding:40px;">'
            + '<div style="font-size:48px;margin-bottom:12px;">🔒</div>'
            + '<h3 style="margin-bottom:8px;">Admin Access Only</h3>'
            + '<p style="color:var(--gray);font-size:14px;">Reports & Analytics is restricted to administrators.<br>Please use your dashboard for department reports.</p>'
            + '<button class="btn btn-primary" style="margin-top:16px;" onclick="Router.navigate(\'' + (user && user.role === 'hod' ? 'hod-dashboard' : 'employee-dashboard') + '\')">← Back to My Dashboard</button>'
            + '</div>';
        return;
    }
    var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');
    var TABS = [
        { id: 'summary',     label: '📑 Summary',     color: '#37474f' },
        { id: 'overview',    label: '📊 Overview',    color: '#1a73e8' },
        { id: 'tasks',       label: '✅ Tasks',        color: '#34a853' },
        { id: 'admissions',  label: '🏥 Admissions',  color: '#00bcd4' },
        { id: 'problems',    label: '🔧 Problems',     color: '#ea4335' },
        { id: 'materials',   label: '📦 Materials',    color: '#ff9800' },
        { id: 'departments', label: '🏢 Departments',  color: '#9c27b0' },
        { id: 'checklists',  label: '📋 Checklists',   color: '#fbbc04' },
        { id: 'submitted',   label: '📬 Submitted',    color: '#6a1b9a' },
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
        summary:     _rSummary,
        overview:    _rOverview,
        tasks:       _rTasks,
        admissions:  _rAdmissions,
        problems:    _rProblems,
        materials:   _rMaterials,
        departments: _rDepartments,
        checklists:  _rChecklists,
        submitted:   _rSubmittedReports,
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
// SUMMARY (all-modules consolidated)
// ══════════════════════════════════════════════════════════════
function _rSummary(el) {
    var user      = AUTH.currentUser();
    var isAdmin   = user && (user.isSuperAdmin || user.role === 'admin');

    // ── raw data ──
    var tasks      = _rRoleFilter(DB.get('tasks') || [], user);
    var hodTasks   = _rRoleFilter(DB.get('hodTasks') || [], user);
    var allTasks   = tasks.concat(hodTasks);
    var problems   = _rRoleFilter(DB.get('problems') || [], user);
    var adms       = _rRoleFilter(DB.get('admissions') || [], user);
    var matReqs    = _rRoleFilter(DB.get('material_requests') || [], user);
    var complaints = _rRoleFilter(DB.get('complaints') || [], user);
    var checklists = DB.get('checklists') || [];
    var inventory  = DB.get('inventory') || [];
    var users      = DB.get('users') || [];
    var depts      = DB.get('departments') || [];
    var budgets    = DB.get('budgets') || [];
    var expenses   = DB.get('budget_expenses') || [];
    var lostFound  = _rRoleFilter(DB.get('lostfound') || [], user);
    var suggestions= DB.get('suggestions') || [];

    // ── derived numbers ──
    var tDone   = allTasks.filter(function(t){ return t.status==='completed'; }).length;
    var tOver   = allTasks.filter(function(t){ return t.status!=='completed'&&t.deadline&&new Date(t.deadline)<new Date(); }).length;
    var pOpen   = problems.filter(function(p){ return p.status!=='resolved'; }).length;
    var pRes    = problems.length - pOpen;
    var aCur    = adms.filter(function(a){ return a.status==='admitted'; }).length;
    var aDis    = adms.filter(function(a){ return a.status==='discharged'; }).length;
    var mPend   = matReqs.filter(function(r){ return r.status==='pending'; }).length;
    var mApp    = matReqs.filter(function(r){ return r.status==='approved'; }).length;
    var cOpen   = complaints.filter(function(c){ return c.status!=='resolved'; }).length;
    var lowStk  = inventory.filter(function(i){ return (i.quantity||0)<5; }).length;
    var staff   = users.filter(function(u){ return u.role!=='admin'; }).length;

    // checklist completion
    var clTotal = 0, clDone = 0;
    checklists.forEach(function(cl) {
        var items = cl.items || [];
        clTotal += items.length;
        clDone  += items.filter(function(i){ return i.done; }).length;
    });
    var clPct = clTotal > 0 ? Math.round(clDone/clTotal*100) : 0;

    // budget (admin only)
    var latestBudget = {};
    budgets.forEach(function(b) {
        if (!latestBudget[b.department] || b.createdAt > latestBudget[b.department].createdAt)
            latestBudget[b.department] = b;
    });
    var totalBudget = Object.values(latestBudget).reduce(function(s,b){ return s+(parseFloat(b.amount)||0); },0);
    var totalSpent  = expenses.reduce(function(s,e){ return s+(parseFloat(e.amount)||0); },0);
    var utilPct     = totalBudget>0 ? Math.round(totalSpent/totalBudget*100) : 0;

    function bFmt(n){ return '₹'+Number(n||0).toLocaleString('en-IN'); }
    function pct(a,b){ return b>0?Math.round(a/b*100):0; }

    // ── department performance matrix ──
    var deptNames = depts.length
        ? depts.map(function(d){ return d.name; })
        : Array.from(new Set(
            allTasks.map(function(t){ return t.department; })
            .concat(problems.map(function(p){ return p.department; }))
            .filter(Boolean)
          ));

    var deptRows = deptNames.map(function(nm) {
        var dT  = allTasks.filter(function(t){ return t.department===nm; });
        var dTD = dT.filter(function(t){ return t.status==='completed'; }).length;
        var dP  = problems.filter(function(p){ return p.department===nm; });
        var dPR = dP.filter(function(p){ return p.status==='resolved'; }).length;
        var dM  = matReqs.filter(function(r){ return r.department===nm; }).length;
        var dS  = users.filter(function(u){ return u.department===nm&&u.role!=='admin'; }).length;
        var tp  = pct(dTD, dT.length);
        var pp  = dP.length>0 ? pct(dPR,dP.length) : null;
        var tCol= tp>=80?'#34a853':tp>=50?'#fbbc04':'#ea4335';
        var pCol= pp===null?'var(--gray)':pp>=80?'#34a853':pp>=50?'#fbbc04':'#ea4335';

        function bar(p,c) {
            return '<div style="display:flex;align-items:center;gap:5px;">'
                +'<div style="flex:1;height:7px;background:var(--light-gray);border-radius:4px;overflow:hidden;">'
                +'<div style="height:100%;width:'+Math.min(p||0,100)+'%;background:'+c+';border-radius:4px;"></div></div>'
                +'<span style="font-size:11px;font-weight:700;color:'+c+';">'+(p!==null?p+'%':'—')+'</span></div>';
        }
        return '<tr>'
            +'<td><strong>'+nm+'</strong></td>'
            +'<td style="text-align:center;">'+dS+'</td>'
            +'<td style="min-width:110px;">'+bar(tp,tCol)+'<div style="font-size:10px;color:var(--gray);">'+dTD+'/'+dT.length+' done</div></td>'
            +'<td style="min-width:110px;">'+bar(pp,pCol)+'<div style="font-size:10px;color:var(--gray);">'+(dP.length>0?dPR+'/'+dP.length+' resolved':'No issues')+'</div></td>'
            +'<td style="text-align:center;">'+dM+'</td>'
            +'</tr>';
    }).join('');

    // ── module status cards ──
    function _mCard(icon, label, color, lines) {
        return '<div class="card" style="padding:14px;border-top:3px solid '+color+';">'
            +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'
            +'<span style="font-size:22px;">'+icon+'</span>'
            +'<span style="font-size:13px;font-weight:700;color:var(--text);">'+label+'</span></div>'
            +'<div style="display:flex;flex-direction:column;gap:5px;">'
            +lines.map(function(l){
                return '<div style="display:flex;justify-content:space-between;font-size:12px;">'
                    +'<span style="color:var(--gray);">'+l[0]+'</span>'
                    +'<span style="font-weight:700;color:'+(l[2]||'var(--text)')+';">'+l[1]+'</span></div>';
            }).join('')
            +'</div></div>';
    }

    // ── recent activity across all modules (last 5 items by date) ──
    var activity = [];
    allTasks.slice(-3).forEach(function(t){ activity.push({ icon:'✅', label: t.title||'Task', sub: t.department||'', date: t.createdAt, color:'#34a853' }); });
    problems.slice(-3).forEach(function(p){ activity.push({ icon:'🔧', label: p.title||'Problem', sub: p.category||'', date: p.createdAt, color:'#ea4335' }); });
    adms.slice(-2).forEach(function(a){ activity.push({ icon:'🏥', label: a.patientName||'Patient', sub: a.type||'', date: a.createdAt||a.admissionDate, color:'#00bcd4' }); });
    matReqs.slice(-2).forEach(function(r){ activity.push({ icon:'📦', label: r.title||'Request', sub: r.department||'', date: r.createdAt, color:'#ff9800' }); });
    complaints.slice(-2).forEach(function(c){ activity.push({ icon:'📝', label: c.patientName||'Complaint', sub: c.category||'', date: c.createdAt, color:'#fbbc04' }); });
    activity.sort(function(a,b){ return (b.date||'') > (a.date||'') ? 1 : -1; });
    var recentRows = activity.slice(0,8).map(function(a){
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--light-gray);">'
            +'<span style="width:28px;height:28px;border-radius:50%;background:'+a.color+'22;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">'+a.icon+'</span>'
            +'<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+a.label+'</div>'
            +'<div style="font-size:11px;color:var(--gray);">'+a.sub+'</div></div>'
            +'<div style="font-size:11px;color:var(--gray);white-space:nowrap;">'+APP.formatDate(a.date)+'</div>'
            +'</div>';
    }).join('') || '<div style="color:var(--gray);font-size:13px;padding:12px 0;">No recent activity.</div>';

    el.innerHTML =
        // header banner
        '<div style="background:linear-gradient(135deg,#37474f 0%,#263238 100%);color:#fff;border-radius:10px;padding:18px 22px;margin-bottom:20px;">'
        +'<div style="font-size:18px;font-weight:700;">📑 Hospital Summary Report</div>'
        +'<div style="opacity:.75;font-size:13px;margin-top:3px;">Consolidated view across all modules • Generated '+new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+'</div>'
        +'</div>'

        // KPI grid — row 1
        +'<div class="grid-4 mb-4">'
        +_rKpi(allTasks.length, 'Total Tasks', '#1a73e8', '✅', tDone+' completed · '+tOver+' overdue')
        +_rKpi(problems.length, 'Problems', '#ea4335', '🔧', pOpen+' open · '+pRes+' resolved')
        +_rKpi(adms.length, 'Admissions', '#00bcd4', '🏥', aCur+' current · '+aDis+' discharged')
        +_rKpi(matReqs.length, 'Material Reqs', '#ff9800', '📦', mPend+' pending · '+mApp+' approved')
        +'</div>'
        // KPI grid — row 2
        +'<div class="grid-4 mb-4">'
        +_rKpi(staff, 'Staff', '#9c27b0', '👥', depts.length+' departments')
        +_rKpi(complaints.length, 'Complaints', '#fbbc04', '📝', cOpen+' open')
        +_rKpi(clPct+'%', 'Checklist Done', '#34a853', '📋', clDone+'/'+clTotal+' items')
        +_rKpi(lowStk, 'Low Stock', '#ea4335', '⚠️', inventory.length+' total items')
        +'</div>'

        // module status grid
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px;">'
        +_mCard('✅','Tasks','#34a853',[
            ['Total', allTasks.length],
            ['Completed', tDone, '#34a853'],
            ['Overdue', tOver, tOver>0?'#ea4335':'#34a853'],
            ['Completion Rate', pct(tDone,allTasks.length)+'%', pct(tDone,allTasks.length)>=70?'#34a853':'#ea4335']
        ])
        +_mCard('🏥','Admissions','#00bcd4',[
            ['Total', adms.length],
            ['Currently Admitted', aCur, '#00bcd4'],
            ['Discharged', aDis],
            ['Emergency', adms.filter(function(a){ return a.type==='emergency'; }).length, '#ea4335']
        ])
        +_mCard('🔧','Problems','#ea4335',[
            ['Total', problems.length],
            ['Open', pOpen, pOpen>0?'#ea4335':'#34a853'],
            ['Resolved', pRes, '#34a853'],
            ['Resolution Rate', pct(pRes,problems.length)+'%', pct(pRes,problems.length)>=70?'#34a853':'#fbbc04']
        ])
        +_mCard('📦','Materials','#ff9800',[
            ['Requests', matReqs.length],
            ['Pending', mPend, mPend>0?'#ff9800':'var(--text)'],
            ['Approved', mApp, '#34a853'],
            ['Rejected', matReqs.filter(function(r){ return r.status==='rejected'; }).length, '#ea4335']
        ])
        +_mCard('📝','Complaints','#fbbc04',[
            ['Total', complaints.length],
            ['Open', cOpen, cOpen>0?'#fbbc04':'#34a853'],
            ['Resolved', complaints.length-cOpen, '#34a853'],
            ['High Priority', complaints.filter(function(c){ return c.priority==='high'; }).length, '#ea4335']
        ])
        +_mCard('📋','Checklists','#fbbc04',[
            ['Total Checklists', checklists.length],
            ['Total Items', clTotal],
            ['Completed', clDone, '#34a853'],
            ['Completion Rate', clPct+'%', clPct>=80?'#34a853':clPct>=50?'#fbbc04':'#ea4335']
        ])
        +_mCard('🗂️','Inventory','#9c27b0',[
            ['Total Items', inventory.length],
            ['Low Stock (<5)', lowStk, lowStk>0?'#ea4335':'#34a853'],
            ['Categories', Array.from(new Set(inventory.map(function(i){ return i.category; }).filter(Boolean))).length]
        ])
        +_mCard('🔍','Lost & Found','#78909c',[
            ['Total', lostFound.length],
            ['Lost', lostFound.filter(function(i){ return i.type==='lost'; }).length],
            ['Found', lostFound.filter(function(i){ return i.type==='found'; }).length],
            ['Returned', lostFound.filter(function(i){ return i.status==='returned'; }).length, '#34a853']
        ])
        +(isAdmin
            ? _mCard('💰','Budget','#2e7d32',[
                ['Total Budget', bFmt(totalBudget)],
                ['Total Spent', bFmt(totalSpent), totalSpent>totalBudget?'#ea4335':'#34a853'],
                ['Remaining', bFmt(totalBudget-totalSpent), (totalBudget-totalSpent)<0?'#ea4335':'#34a853'],
                ['Utilization', utilPct+'%', utilPct>=90?'#ea4335':utilPct>=70?'#fbbc04':'#34a853']
            ])
            : '')
        +'</div>'

        // charts row
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">'
        +_rChartCard('Task Completion by Status','rsum_task',220)
        +_rChartCard('Admission Type Breakdown','rsum_adm',220)
        +_rChartCard('Problems: Open vs Resolved','rsum_prob',220)
        +'</div>'

        // department matrix + recent activity
        +'<div style="display:grid;grid-template-columns:1fr 380px;gap:16px;">'

        // dept matrix
        +'<div class="card" style="padding:0;overflow:hidden;">'
        +'<div style="padding:12px 16px;font-size:14px;font-weight:700;border-bottom:1px solid var(--light-gray);">🏢 Department Performance Matrix</div>'
        +'<div class="table-responsive"><table>'
        +'<thead><tr><th>Department</th><th style="text-align:center;">Staff</th><th>Task Progress</th><th>Problem Resolution</th><th style="text-align:center;">Material Reqs</th></tr></thead>'
        +'<tbody>'+(deptRows||'<tr><td colspan="5" class="empty-state">No department data.</td></tr>')+'</tbody>'
        +'</table></div></div>'

        // recent activity feed
        +'<div class="card" style="padding:16px;">'
        +'<div style="font-size:14px;font-weight:700;margin-bottom:10px;">🕐 Recent Activity</div>'
        +recentRows
        +'</div>'

        +'</div>';

    setTimeout(function() {
        _rMakeChart('rsum_task', {
            type: 'doughnut',
            data: { labels: ['Pending','In Progress','Completed','Overdue'],
                datasets: [{ data: [
                    allTasks.filter(function(t){ return t.status==='pending'; }).length,
                    allTasks.filter(function(t){ return t.status==='in-progress'; }).length,
                    tDone, tOver
                ], backgroundColor: ['#fbbc04','#1a73e8','#34a853','#ea4335'], borderWidth: 2 }] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 } } } } }
        });
        _rMakeChart('rsum_adm', {
            type: 'pie',
            data: { labels: ['Regular','Emergency','ICU'],
                datasets: [{ data: [
                    adms.filter(function(a){ return a.type==='regular'; }).length,
                    adms.filter(function(a){ return a.type==='emergency'; }).length,
                    adms.filter(function(a){ return a.type==='icu'; }).length
                ], backgroundColor: ['#34a853','#ea4335','#fbbc04'], borderWidth: 2 }] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 } } } } }
        });
        _rMakeChart('rsum_prob', {
            type: 'doughnut',
            data: { labels: ['Open','Resolved'],
                datasets: [{ data: [pOpen, pRes], backgroundColor: ['#ea4335','#34a853'], borderWidth: 2 }] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 } } } } }
        });
    }, 50);
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
    },
    {
        id: 'budget_allocations', label: 'Budget Allocations', icon: '💰', color: '#2e7d32', dbKey: 'budgets',
        adminOnly: true,
        headers: ['Department','Amount (₹)','Period','Period Type','Set By','Date'],
        getRow: function(b){ return [b.department||'', b.amount||0, b.period||'', b.periodType||'', b.createdByName||b.createdBy||'', APP.formatDate(b.createdAt)]; }
    },
    {
        id: 'budget_expenses', label: 'Budget Expenses', icon: '💸', color: '#c62828', dbKey: 'budget_expenses',
        adminOnly: true,
        headers: ['Department','Category','Amount (₹)','Description','Date','Added By'],
        getRow: function(e){ return [e.department||'', e.category||'', e.amount||0, e.description||'', e.expenseDate||APP.formatDate(e.createdAt), e.createdByName||e.createdBy||'']; }
    }
];

function _rDownload(el) {
    var user = AUTH.currentUser();
    var isAdmin = user && (user.isSuperAdmin || user.role === 'admin');

    var cardsHtml = _rSections.filter(function(s) {
        return !s.adminOnly || isAdmin;
    }).map(function(s) {
        var raw   = DB.get(s.dbKey) || [];
        var items = (s.id === 'staff' || s.id === 'departments' || s.id === 'inventory' || s.adminOnly)
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

    // Auto-backup info
    var lastTs  = localStorage.getItem('hms_backup_ts');
    var lastVer = localStorage.getItem('hms_app_version');
    var hasB1   = !!localStorage.getItem('hms_backup_1');
    var hasB2   = !!localStorage.getItem('hms_backup_2');
    var hasB3   = !!localStorage.getItem('hms_backup_3');
    var lastBackupStr = lastTs
        ? new Date(lastTs).toLocaleString('en-IN', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
        : 'Never';

    var safetyHtml = '<div class="card" style="padding:20px;margin-bottom:20px;border-top:4px solid #1a73e8;">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">'
        + '<div><div style="font-size:16px;font-weight:700;">💾 Data Safety & Backup</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">All app data is stored in your browser\'s localStorage. Back up regularly to avoid data loss.</div></div>'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<span style="width:10px;height:10px;background:' + (hasB1 ? 'var(--success)' : 'var(--danger)') + ';border-radius:50%;display:inline-block;"></span>'
        + '<span style="font-size:12px;color:var(--gray);">Auto-backup: <strong>' + lastBackupStr + '</strong></span>'
        + '</div></div>'

        // Status row
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;">'
        + '<div style="background:var(--light-gray);border-radius:8px;padding:12px;text-align:center;">'
        + '<div style="font-size:18px;font-weight:700;color:var(--success);">' + (hasB1 ? '✓' : '—') + '</div>'
        + '<div style="font-size:11px;color:var(--gray);">Backup 1 (latest)</div>'
        + (hasB1 && lastTs ? '<div style="font-size:10px;color:var(--gray);">' + lastBackupStr + '</div>' : '')
        + '</div>'
        + '<div style="background:var(--light-gray);border-radius:8px;padding:12px;text-align:center;">'
        + '<div style="font-size:18px;font-weight:700;color:' + (hasB2 ? 'var(--success)' : 'var(--gray)') + ';">' + (hasB2 ? '✓' : '—') + '</div>'
        + '<div style="font-size:11px;color:var(--gray);">Backup 2</div>'
        + '</div>'
        + '<div style="background:var(--light-gray);border-radius:8px;padding:12px;text-align:center;">'
        + '<div style="font-size:18px;font-weight:700;color:' + (hasB3 ? 'var(--success)' : 'var(--gray)') + ';">' + (hasB3 ? '✓' : '—') + '</div>'
        + '<div style="font-size:11px;color:var(--gray);">Backup 3 (oldest)</div>'
        + '</div>'
        + '<div style="background:var(--light-gray);border-radius:8px;padding:12px;text-align:center;">'
        + '<div style="font-size:18px;font-weight:700;color:var(--primary);">' + (lastVer || '—') + '</div>'
        + '<div style="font-size:11px;color:var(--gray);">App Version</div>'
        + '</div>'
        + '</div>'

        // Action buttons
        + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">'
        + '<button class="btn btn-primary" onclick="rExportAllData()">📥 Export Full Backup (JSON)</button>'
        + '<button class="btn btn-sm btn-outline" onclick="rTriggerImport()">📤 Import / Restore from File</button>'
        + '<input type="file" id="rImportFile" accept=".json" style="display:none;" onchange="rImportFile(this)">'
        + (hasB1 ? '<button class="btn btn-sm btn-outline" onclick="rRestoreAutoBackup(1)">🔄 Restore Auto-Backup 1</button>' : '')
        + (hasB2 ? '<button class="btn btn-sm btn-outline" onclick="rRestoreAutoBackup(2)">🔄 Restore Backup 2</button>' : '')
        + (hasB3 ? '<button class="btn btn-sm btn-outline" onclick="rRestoreAutoBackup(3)">🔄 Restore Backup 3</button>' : '')
        + '<button class="btn btn-sm btn-outline" onclick="rForceAutoBackup()">💾 Backup Now</button>'
        + '</div>'

        // Warning
        + '<div style="background:#fff3e0;border:1px solid #ff9800;border-radius:8px;padding:10px 14px;font-size:12px;color:#e65100;">'
        + '<strong>⚠️ Important:</strong> Data is stored in this browser only. '
        + 'Export a JSON backup regularly and keep it safe. '
        + 'Clearing browser data / cache will wipe all records. '
        + 'To sync across devices, configure Firebase in <code>js/firebase-config.js</code>.'
        + '</div></div>';

    el.innerHTML = safetyHtml
        + '<div class="card" style="padding:18px 20px;margin-bottom:20px;background:linear-gradient(135deg,#37474f 0%,#263238 100%);color:#fff;border-radius:10px;">'
        + '<div style="font-size:18px;font-weight:700;margin-bottom:4px;">⬇️ Download Reports</div>'
        + '<div style="opacity:0.8;font-size:13px;">Export any module\'s data as an Excel spreadsheet (.xlsx) or PDF document.</div>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;">'
        + cardsHtml
        + '</div>';
}

function rExportAllData() {
    var ok = DB.exportAll('manual');
    if (ok) {
        APP.notify('Backup file downloaded!', 'success');
    } else {
        APP.notify('Export failed — check browser console', 'error');
    }
}

function rTriggerImport() {
    var input = document.getElementById('rImportFile');
    if (input) input.click();
}

function rImportFile(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var json = e.target.result;
        if (confirm('This will MERGE the backup data with current data (local-only records are preserved). Continue?')) {
            var result = DB.importAll(json, false);
            if (result.success) {
                APP.notify('Restored ' + result.keys + ' data stores successfully!', 'success');
                setTimeout(function() { Router.navigate('reports'); }, 500);
            } else {
                APP.notify('Import failed: ' + result.error, 'error');
            }
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function rRestoreAutoBackup(n) {
    var raw = localStorage.getItem('hms_backup_' + n);
    if (!raw) { APP.notify('Backup ' + n + ' not found', 'error'); return; }
    try {
        var meta = JSON.parse(raw)._meta || {};
        var dateStr = meta.exportedAt ? new Date(meta.exportedAt).toLocaleString('en-IN') : 'unknown time';
        var label   = meta.label || 'auto';
        if (confirm('Restore backup from ' + dateStr + ' (' + label + ')?\n\nLocal-only records not in the backup will be preserved.')) {
            var result = DB.importAll(raw, false);
            if (result.success) {
                APP.notify('Backup ' + n + ' restored (' + result.keys + ' stores)!', 'success');
                setTimeout(function() { Router.navigate('reports'); }, 500);
            } else {
                APP.notify('Restore failed: ' + result.error, 'error');
            }
        }
    } catch(e) {
        APP.notify('Invalid backup data', 'error');
    }
}

function rForceAutoBackup() {
    var ok = DB.autoBackup('manual-trigger');
    APP.notify(ok ? 'Backup saved to browser storage!' : 'Backup failed', ok ? 'success' : 'error');
    var el = document.getElementById('hodTabContent') || document.getElementById('pageContent');
    // Re-render download tab to refresh timestamps
    setTimeout(function() { Router.navigate('reports'); }, 300);
}

function rDownloadReport(sectionId, format) {
    var cfg = null;
    for (var i = 0; i < _rSections.length; i++) {
        if (_rSections[i].id === sectionId) { cfg = _rSections[i]; break; }
    }
    if (!cfg) { APP.notify('Unknown section', 'error'); return; }

    var user = AUTH.currentUser();
    if (cfg.adminOnly && !(user && (user.isSuperAdmin || user.role === 'admin'))) {
        APP.notify('Access denied', 'error'); return;
    }
    var raw   = DB.get(cfg.dbKey) || [];
    var items = (sectionId === 'staff' || sectionId === 'departments' || sectionId === 'inventory' || cfg.adminOnly)
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
    doc.text('Stavya Intelligence', 14, 10);
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

/* ══════════════════════════════════════════════════
   SUBMITTED REPORTS INBOX — all employee/HOD reports
══════════════════════════════════════════════════ */
function _rSubmittedReports(el) {
    var user = AUTH.currentUser();
    var all  = DB.get('reports') || [];

    // Role-filter: admin sees all; HOD sees own dept + own; employee sees own
    var visible = all.filter(function(r) {
        if (!user || user.isSuperAdmin || user.role === 'admin') return true;
        if (user.role === 'hod') return r.department === user.department || r.createdBy === user.username;
        return r.createdBy === user.username;
    }).slice().reverse();

    var depts  = Array.from(new Set(visible.map(function(r){ return r.department||'—'; }))).sort();
    var filter = document.getElementById('rSubmitFilter') ? document.getElementById('rSubmitFilter').value : 'all';

    var filtered = filter === 'all' ? visible : visible.filter(function(r){ return (r.department||'—') === filter; });

    var filterHtml = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">'
        + '<label style="font-size:13px;font-weight:600;">Department:</label>'
        + '<select id="rSubmitFilter" class="form-control" style="width:auto;min-width:140px;" onchange="_renderReportTab(\'submitted\')">'
        + '<option value="all">All Departments</option>'
        + depts.map(function(d){ return '<option value="' + d + '"' + (filter===d?' selected':'') + '>' + d + '</option>'; }).join('')
        + '</select>'
        + '<span style="font-size:12px;color:var(--gray);">' + filtered.length + ' report' + (filtered.length!==1?'s':'') + '</span>'
        + '</div>';

    var rows = filtered.map(function(r) {
        return '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:200px;">'
            + '<div style="font-size:14px;font-weight:600;">' + (r.title||'Untitled') + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-top:3px;">'
            + (r.createdByName||r.createdBy||'Unknown')
            + (r.department ? ' &nbsp;·&nbsp; <span style="color:var(--primary);">' + r.department + '</span>' : '')
            + ' &nbsp;·&nbsp; ' + (r.category||'-')
            + (r.sentTo ? ' &nbsp;·&nbsp; To: ' + r.sentTo : '')
            + ' &nbsp;·&nbsp; ' + APP.formatDate(r.createdAt)
            + '</div>'
            + (r.description ? '<div style="font-size:12px;margin-top:5px;color:var(--text);line-height:1.5;">' + r.description.substring(0,200) + (r.description.length>200?'…':'') + '</div>' : '')
            + '</div>'
            + '<div style="display:flex;gap:6px;flex-shrink:0;margin-top:2px;">'
            + '<span class="badge badge-success" style="font-size:10px;align-self:flex-start;">sent</span>'
            + '<button class="btn btn-sm" style="background:#25D366;color:#fff;padding:4px 9px;white-space:nowrap;" onclick="rShareReport(\'' + r.id + '\',\'whatsapp\')">💬 WhatsApp</button>'
            + '<button class="btn btn-sm" style="background:#1a73e8;color:#fff;padding:4px 9px;white-space:nowrap;" onclick="rShareReport(\'' + r.id + '\',\'email\')">✉️ Email</button>'
            + '</div></div>';
    }).join('') || '<div style="padding:24px;text-align:center;color:var(--gray);">No reports submitted yet</div>';

    el.innerHTML =
        '<div style="font-weight:700;font-size:17px;margin-bottom:4px;">📬 Submitted Reports</div>'
        + '<div style="font-size:12px;color:var(--gray);margin-bottom:16px;">All reports submitted by employees and HODs</div>'
        + filterHtml
        + '<div class="card" style="padding:0 18px;">' + rows + '</div>';
}

function rShareReport(id, via) {
    var r = (DB.get('reports')||[]).find(function(x){ return x.id === id; });
    if (!r) { APP.notify('Report not found','error'); return; }
    var text = '*' + (r.title||'Report') + '*'
        + '\nFrom: ' + (r.createdByName||r.createdBy||'')
        + (r.department ? ' — ' + r.department : '')
        + '\nDate: ' + (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '-')
        + '\nPeriod: ' + (r.category||'-')
        + (r.sentTo ? '\nSent To: ' + r.sentTo : '')
        + '\n\n' + (r.description||'');
    if (via === 'whatsapp') {
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
    } else {
        window.location.href = 'mailto:?subject=' + encodeURIComponent(r.title||'Report') + '&body=' + encodeURIComponent(text);
    }
}
