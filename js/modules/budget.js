// HMS — Budget Management Module (Admin-only)

var _budgetTab = 'overview';
var _budgetCharts = [];

function _bDestroyCharts() {
    _budgetCharts.forEach(function(c){ try { c.destroy(); } catch(e){} });
    _budgetCharts = [];
}

function _bMakeChart(id, cfg) {
    if (typeof Chart === 'undefined') return;
    var ctx = document.getElementById(id);
    if (!ctx) return;
    try { var ch = new Chart(ctx, cfg); _budgetCharts.push(ch); return ch; } catch(e) {}
}

function _bFmt(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function _bKpi(val, label, color, icon, sub) {
    return '<div class="stat-card" style="border-left-color:' + color + ';min-width:0;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
        + '<div><div class="stat-value" style="color:' + color + ';">' + val + '</div>'
        + '<div class="stat-label">' + label + '</div>'
        + (sub ? '<div style="font-size:11px;color:var(--gray);margin-top:3px;">' + sub + '</div>' : '')
        + '</div><span style="font-size:28px;opacity:0.55;">' + icon + '</span></div></div>';
}

function renderBudget(container) {
    var user = AUTH.currentUser();
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
        container.innerHTML = '<div class="card"><div class="empty-state" style="padding:40px;">🔒 Access Denied — Budget is restricted to administrators only.</div></div>';
        return;
    }

    var TABS = [
        { id: 'overview',    label: '📊 Overview',    color: '#1a73e8' },
        { id: 'set-budget',  label: '💰 Set Budgets',  color: '#34a853' },
        { id: 'expenses',    label: '📋 Expenses',     color: '#ea4335' },
        { id: 'reports',     label: '📈 Reports',      color: '#9c27b0' }
    ];

    var btnHtml = TABS.map(function(t) {
        var active = t.id === _budgetTab;
        return '<button onclick="switchBudgetTab(\'' + t.id + '\',this)"'
            + ' style="padding:8px 14px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;'
            + (active ? 'background:' + t.color + ';color:#fff;' : 'background:var(--card-bg);color:var(--text);border:1px solid var(--light-gray);')
            + '" data-tab="' + t.id + '" data-color="' + t.color + '">' + t.label + '</button>';
    }).join('');

    container.innerHTML =
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;" id="budgetTabBar">' + btnHtml + '</div>'
        + '<div id="budgetContent"></div>';

    _renderBudgetTab(_budgetTab);
}

function switchBudgetTab(tab, btn) {
    _budgetTab = tab;
    var bar = document.getElementById('budgetTabBar');
    if (bar) {
        bar.querySelectorAll('button').forEach(function(b) {
            var active = b.dataset.tab === tab;
            b.style.background = active ? b.dataset.color : 'var(--card-bg)';
            b.style.color      = active ? '#fff' : 'var(--text)';
            b.style.border     = active ? 'none' : '1px solid var(--light-gray)';
        });
    }
    _renderBudgetTab(tab);
}

function _renderBudgetTab(tab) {
    _bDestroyCharts();
    var el = document.getElementById('budgetContent');
    if (!el) return;
    var map = {
        'overview':   _bOverview,
        'set-budget': _bSetBudgets,
        'expenses':   _bExpenses,
        'reports':    _bReports
    };
    if (map[tab]) map[tab](el);
}

// ════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════
function _bOverview(el) {
    var budgets  = DB.get('budgets')  || [];
    var expenses = DB.get('budget_expenses') || [];

    var totalBudget = budgets.reduce(function(s,b){ return s+(parseFloat(b.amount)||0); }, 0);
    var totalSpent  = expenses.reduce(function(s,e){ return s+(parseFloat(e.amount)||0); }, 0);
    var remaining   = totalBudget - totalSpent;
    var utilPct     = totalBudget > 0 ? Math.round(totalSpent/totalBudget*100) : 0;

    // Per-dept summary: use latest budget per dept
    var latestBudget = {};
    budgets.forEach(function(b) {
        if (!latestBudget[b.department] || b.createdAt > latestBudget[b.department].createdAt)
            latestBudget[b.department] = b;
    });
    var deptSpent = {};
    expenses.forEach(function(e) {
        deptSpent[e.department] = (deptSpent[e.department]||0) + (parseFloat(e.amount)||0);
    });

    // Build combined dept list
    var allDepts = Object.keys(Object.assign({}, latestBudget, deptSpent));

    var deptCards = allDepts.map(function(nm) {
        var bAmt  = latestBudget[nm] ? (parseFloat(latestBudget[nm].amount)||0) : 0;
        var spent = deptSpent[nm] || 0;
        var pct   = bAmt > 0 ? Math.round(spent/bAmt*100) : (spent>0?100:0);
        var rem   = bAmt - spent;
        var col   = pct >= 90 ? '#ea4335' : pct >= 70 ? '#fbbc04' : '#34a853';
        return '<div class="card" style="padding:16px;border-left:4px solid ' + col + ';">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
            + '<div style="font-size:14px;font-weight:700;">' + nm + '</div>'
            + '<span style="font-size:15px;font-weight:800;color:' + col + ';">' + pct + '%</span></div>'
            + '<div style="font-size:12px;color:var(--gray);display:flex;justify-content:space-between;margin-bottom:6px;">'
            + '<span>Budget: <strong style="color:var(--text);">' + _bFmt(bAmt) + '</strong></span>'
            + '<span>Spent: <strong style="color:' + (pct>80?'#ea4335':'var(--text)') + ';">' + _bFmt(spent) + '</strong></span>'
            + '</div>'
            + '<div style="height:8px;background:var(--light-gray);border-radius:4px;overflow:hidden;margin-bottom:6px;">'
            + '<div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + col + ';border-radius:4px;transition:width .5s;"></div></div>'
            + '<div style="font-size:11px;color:var(--gray);">Remaining: <strong style="color:' + (rem<0?'#ea4335':'#34a853') + ';">' + _bFmt(rem) + '</strong>'
            + (rem < 0 ? ' <span style="color:#ea4335;font-weight:700;">⚠️ Overspent</span>' : '') + '</div>'
            + '</div>';
    }).join('');

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _bKpi(_bFmt(totalBudget), 'Total Budget',  '#1a73e8', '💰', allDepts.length + ' departments')
        + _bKpi(_bFmt(totalSpent),  'Total Spent',   '#ea4335', '💸', utilPct + '% utilized')
        + _bKpi(_bFmt(remaining),   'Remaining',     remaining >= 0 ? '#34a853' : '#ea4335', '🏦', remaining < 0 ? '⚠️ Over budget' : 'available')
        + _bKpi(utilPct + '%',      'Utilization',   utilPct >= 90 ? '#ea4335' : utilPct >= 70 ? '#fbbc04' : '#34a853', '📊', 'of total budget')
        + '</div>'
        + (allDepts.length > 0
            ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:20px;">' + deptCards + '</div>'
            : '<div class="card" style="margin-bottom:16px;"><div class="empty-state">No budgets set yet. Go to <strong>Set Budgets</strong> to allocate department budgets.</div></div>')
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'
        + '<div class="card" style="padding:16px;"><div style="font-size:14px;font-weight:700;margin-bottom:12px;">Budget vs Expenses by Department</div><div style="position:relative;height:260px;"><canvas id="bo_deptBar"></canvas></div></div>'
        + '<div class="card" style="padding:16px;"><div style="font-size:14px;font-weight:700;margin-bottom:12px;">Expenses by Category</div><div style="position:relative;height:260px;"><canvas id="bo_catPie"></canvas></div></div>'
        + '</div>';

    setTimeout(function() {
        if (allDepts.length) {
            _bMakeChart('bo_deptBar', {
                type: 'bar',
                data: {
                    labels: allDepts,
                    datasets: [
                        { label: 'Budget', data: allDepts.map(function(n){ return latestBudget[n]?(parseFloat(latestBudget[n].amount)||0):0; }), backgroundColor: '#1a73e8', borderRadius: 4 },
                        { label: 'Spent',  data: allDepts.map(function(n){ return deptSpent[n]||0; }),  backgroundColor: '#ea4335', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '₹'+v.toLocaleString('en-IN'); } } } } }
            });
        }
        var catMap = {};
        expenses.forEach(function(e){ catMap[e.category||'Other']=(catMap[e.category||'Other']||0)+(parseFloat(e.amount)||0); });
        var catK = Object.keys(catMap);
        if (catK.length) {
            _bMakeChart('bo_catPie', {
                type: 'doughnut',
                data: { labels: catK, datasets: [{ data: Object.values(catMap), backgroundColor: ['#1a73e8','#34a853','#ea4335','#fbbc04','#9c27b0','#00bcd4','#ff9800','#78909c'], borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }
    }, 50);
}

// ════════════════════════════════════════════════
// SET BUDGETS
// ════════════════════════════════════════════════
function _bSetBudgets(el) {
    var budgets = DB.get('budgets') || [];
    var depts   = (DB.get('departments') || []).filter(function(d){ return d.active !== false; });

    var latestBudget = {};
    budgets.forEach(function(b) {
        if (!latestBudget[b.department] || b.createdAt > latestBudget[b.department].createdAt)
            latestBudget[b.department] = b;
    });

    var deptRows = depts.map(function(d) {
        var b = latestBudget[d.name];
        return '<tr>'
            + '<td><strong>' + d.name + '</strong></td>'
            + '<td>' + (b ? '<strong style="color:#1a73e8;">' + _bFmt(b.amount) + '</strong>' : '<span style="color:var(--gray);">Not set</span>') + '</td>'
            + '<td>' + (b ? (b.period||'-') : '-') + '</td>'
            + '<td>' + (b ? (b.periodLabel||'-') : '-') + '</td>'
            + '<td style="max-width:200px;font-size:12px;color:var(--gray);">' + (b&&b.notes ? b.notes : '-') + '</td>'
            + '<td>' + (b ? APP.formatDate(b.updatedAt||b.createdAt) : '-') + '</td>'
            + '<td style="white-space:nowrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="showBudgetForm(\'' + d.name.replace(/'/g,"\\'") + '\')">' + (b ? '✏️ Update' : '+ Set') + '</button>'
            + (b ? ' <button class="btn btn-sm btn-danger" onclick="deleteBudgetEntry(\'' + b.id + '\')">Del</button>' : '')
            + '</td></tr>';
    }).join('');

    var histRows = budgets.slice().reverse().slice(0, 20).map(function(b) {
        return '<tr><td>' + b.department + '</td><td>' + _bFmt(b.amount) + '</td>'
            + '<td>' + (b.period||'-') + '</td><td>' + (b.periodLabel||'-') + '</td>'
            + '<td>' + APP.formatDate(b.createdAt) + '</td></tr>';
    }).join('');

    el.innerHTML =
        '<div class="flex-between mb-4">'
        + '<div style="font-size:13px;color:var(--gray);">Allocate budgets per department. The latest budget per department is used for tracking.</div>'
        + '<button class="btn btn-primary" onclick="showBudgetForm(null)">+ Set Budget</button>'
        + '</div>'
        + '<div class="card mb-4"><div class="table-responsive"><table><thead><tr>'
        + '<th>Department</th><th>Budget Amount</th><th>Period Type</th><th>Period</th><th>Notes</th><th>Last Set</th><th>Actions</th>'
        + '</tr></thead><tbody>'
        + (deptRows || '<tr><td colspan="7" class="empty-state">No departments found. Add departments first.</td></tr>')
        + '</tbody></table></div></div>'
        + (budgets.length > 0
            ? '<div class="card"><div style="font-size:14px;font-weight:700;padding:12px 16px;border-bottom:1px solid var(--light-gray);">Budget History (last 20)</div>'
            + '<div class="table-responsive"><table><thead><tr><th>Department</th><th>Amount</th><th>Type</th><th>Period</th><th>Date Set</th></tr></thead>'
            + '<tbody>' + histRows + '</tbody></table></div></div>'
            : '');
}

function showBudgetForm(dept) {
    var depts = (DB.get('departments') || []).filter(function(d){ return d.active !== false; });
    var deptOpts = depts.map(function(d) {
        return '<option value="' + d.name.replace(/"/g,'&quot;') + '"' + (dept === d.name ? ' selected' : '') + '>' + d.name + '</option>';
    }).join('');
    var today = new Date();
    var currMonth = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0');
    var currYear  = today.getFullYear();

    var html = '<form id="budgetForm">'
        + '<div class="grid-2">'
        + '<div class="form-group"><label>Department *</label>'
        + '<select name="department" class="form-control" required><option value="">Select department</option>' + deptOpts + '</select></div>'
        + '<div class="form-group"><label>Budget Amount (₹) *</label>'
        + '<input type="number" name="amount" class="form-control" placeholder="e.g. 500000" min="1" step="100" required></div>'
        + '<div class="form-group"><label>Period Type</label>'
        + '<select name="period" class="form-control" onchange="bTogglePeriod(this)">'
        + '<option value="monthly">Monthly</option>'
        + '<option value="quarterly">Quarterly</option>'
        + '<option value="annual">Annual</option>'
        + '</select></div>'
        + '<div class="form-group" id="bMonthGroup"><label>Month</label>'
        + '<input type="month" name="periodMonth" class="form-control" value="' + currMonth + '"></div>'
        + '<div class="form-group" id="bYearGroup" style="display:none;"><label>Year</label>'
        + '<input type="number" name="periodYear" class="form-control" value="' + currYear + '" min="2020" max="2040"></div>'
        + '</div>'
        + '<div class="form-group"><label>Notes / Remarks</label>'
        + '<textarea name="notes" class="form-control" rows="2" placeholder="e.g. Q3 allocation, includes equipment budget..."></textarea></div>'
        + '</form>';

    openFormModal('Set Department Budget', html, 'saveBudget()', true);
}

function bTogglePeriod(sel) {
    var mg = document.getElementById('bMonthGroup');
    var yg = document.getElementById('bYearGroup');
    if (!mg || !yg) return;
    if (sel.value === 'annual' || sel.value === 'quarterly') { mg.style.display='none'; yg.style.display=''; }
    else { mg.style.display=''; yg.style.display='none'; }
}

function saveBudget() {
    var data = getFormData('budgetForm');
    if (!data.department) { APP.notify('Select a department', 'error'); return false; }
    var amount = parseFloat(data.amount);
    if (!amount || amount <= 0) { APP.notify('Enter a valid amount', 'error'); return false; }

    var periodLabel = '';
    if (data.period === 'annual' || data.period === 'quarterly') {
        periodLabel = String(data.periodYear || new Date().getFullYear());
        if (data.period === 'quarterly') periodLabel = 'FY ' + periodLabel;
    } else {
        var m = data.periodMonth || '';
        if (m) { var pts = m.split('-'); periodLabel = new Date(pts[0], pts[1]-1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }); }
    }

    var user = AUTH.currentUser();
    DB.add('budgets', {
        department:  data.department,
        amount:      amount,
        period:      data.period || 'monthly',
        periodLabel: periodLabel,
        notes:       data.notes || '',
        createdBy:   user.username
    });
    APP.notify('Budget set for ' + data.department, 'success');
    _bSetBudgets(document.getElementById('budgetContent'));
    return true;
}

function deleteBudgetEntry(id) {
    confirmAction('Delete this budget entry?', function() {
        DB.delete('budgets', id);
        APP.notify('Budget entry deleted', 'info');
        _bSetBudgets(document.getElementById('budgetContent'));
    });
}

// ════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════
function _bExpenses(el) {
    var expenses = DB.get('budget_expenses') || [];
    var total    = expenses.reduce(function(s,e){ return s+(parseFloat(e.amount)||0); }, 0);
    var thisM    = new Date().toISOString().substring(0,7);
    var monthAmt = expenses.filter(function(e){ return (e.expenseDate||e.createdAt||'').substring(0,7)===thisM; })
                           .reduce(function(s,e){ return s+(parseFloat(e.amount)||0); }, 0);
    var deptSet  = new Set(expenses.map(function(e){ return e.department; }));

    el.innerHTML =
        '<div class="grid-4 mb-4">'
        + _bKpi(expenses.length, 'Total Entries', '#1a73e8', '📋', '')
        + _bKpi(_bFmt(total), 'Total Spent', '#ea4335', '💸', 'all time')
        + _bKpi(_bFmt(monthAmt), 'This Month', '#ff9800', '📅', new Date().toLocaleString('en-IN',{month:'long',year:'numeric'}))
        + _bKpi(deptSet.size, 'Departments', '#9c27b0', '🏢', 'with expenses')
        + '</div>'
        + '<div class="flex-between mb-4">'
        + '<div class="search-box"><input type="text" class="form-control" id="expSearch" placeholder="Search by description, dept, category..." oninput="renderExpList()"></div>'
        + '<button class="btn btn-primary" onclick="showExpenseForm()">+ Add Expense</button>'
        + '</div>'
        + '<div class="card"><div class="table-responsive"><table><thead><tr>'
        + '<th>Date</th><th>Description</th><th>Department</th><th>Category</th><th>Amount</th><th>Reference</th><th>Added By</th><th>Actions</th>'
        + '</tr></thead><tbody id="expTableBody"></tbody></table></div></div>';

    renderExpList();
}

function renderExpList() {
    var expenses = DB.get('budget_expenses') || [];
    var search   = (document.getElementById('expSearch') ? document.getElementById('expSearch').value : '').toLowerCase();
    var filtered = search ? expenses.filter(function(e) {
        return (e.description||'').toLowerCase().indexOf(search) > -1 ||
               (e.department||'').toLowerCase().indexOf(search) > -1 ||
               (e.category||'').toLowerCase().indexOf(search) > -1;
    }) : expenses;

    var rows = filtered.slice().reverse().map(function(e) {
        return '<tr>'
            + '<td>' + APP.formatDate(e.expenseDate||e.createdAt) + '</td>'
            + '<td><strong>' + (e.description||'') + '</strong>'
            + (e.notes ? '<br><span style="font-size:11px;color:var(--gray);">' + e.notes + '</span>' : '') + '</td>'
            + '<td>' + (e.department||'-') + '</td>'
            + '<td><span class="badge badge-info" style="font-size:11px;">' + (e.category||'Other') + '</span></td>'
            + '<td style="font-weight:700;color:#ea4335;white-space:nowrap;">' + _bFmt(e.amount) + '</td>'
            + '<td style="font-size:12px;color:var(--gray);">' + (e.reference||'-') + '</td>'
            + '<td style="font-size:12px;">' + (e.createdBy||'-') + '</td>'
            + '<td><button class="btn btn-sm btn-danger" onclick="deleteExpense(\'' + e.id + '\')">Del</button></td>'
            + '</tr>';
    }).join('');

    var tbody = document.getElementById('expTableBody');
    if (tbody) tbody.innerHTML = rows || '<tr><td colspan="8" class="empty-state">No expenses logged yet</td></tr>';
}

function showExpenseForm() {
    var depts   = (DB.get('departments')||[]).filter(function(d){ return d.active!==false; });
    var deptOpts = depts.map(function(d){ return '<option value="' + d.name.replace(/"/g,'&quot;') + '">' + d.name + '</option>'; }).join('');
    var today    = new Date().toISOString().split('T')[0];

    var html = '<form id="expenseForm">'
        + '<div class="grid-2">'
        + '<div class="form-group"><label>Department *</label>'
        + '<select name="department" class="form-control" required><option value="">Select</option>' + deptOpts + '</select></div>'
        + '<div class="form-group"><label>Amount (₹) *</label>'
        + '<input type="number" name="amount" class="form-control" placeholder="e.g. 25000" min="0.01" step="0.01" required></div>'
        + '<div class="form-group"><label>Category *</label>'
        + '<select name="category" class="form-control" required>'
        + '<option value="Maintenance">Maintenance</option>'
        + '<option value="Equipment">Equipment</option>'
        + '<option value="Medicine & Supplies">Medicine & Supplies</option>'
        + '<option value="Staff">Staff</option>'
        + '<option value="Utilities">Utilities</option>'
        + '<option value="Renovation">Renovation</option>'
        + '<option value="Technology">Technology</option>'
        + '<option value="Other">Other</option>'
        + '</select></div>'
        + '<div class="form-group"><label>Expense Date *</label>'
        + '<input type="date" name="expenseDate" class="form-control" value="' + today + '" required></div>'
        + '</div>'
        + '<div class="form-group"><label>Description *</label>'
        + '<input type="text" name="description" class="form-control" placeholder="Brief description of the expense" required></div>'
        + '<div class="grid-2">'
        + '<div class="form-group"><label>Invoice / Reference No.</label>'
        + '<input type="text" name="reference" class="form-control" placeholder="e.g. INV-2026-001"></div>'
        + '<div class="form-group"><label>Notes</label>'
        + '<input type="text" name="notes" class="form-control" placeholder="Optional additional notes"></div>'
        + '</div>'
        + '</form>';

    openFormModal('Add Expense Entry', html, 'saveExpense()', true);
}

function saveExpense() {
    var data = getFormData('expenseForm');
    if (!data.department || !data.amount || !data.description || !data.expenseDate || !data.category) {
        APP.notify('Please fill all required fields', 'error'); return false;
    }
    var amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) { APP.notify('Enter a valid amount', 'error'); return false; }

    var user = AUTH.currentUser();
    DB.add('budget_expenses', {
        department:  data.department,
        amount:      amount,
        category:    data.category,
        description: data.description,
        expenseDate: data.expenseDate,
        reference:   data.reference || '',
        notes:       data.notes || '',
        createdBy:   user.username
    });
    APP.notify('Expense recorded — ' + _bFmt(amount), 'success');
    _bExpenses(document.getElementById('budgetContent'));
    return true;
}

function deleteExpense(id) {
    confirmAction('Delete this expense entry?', function() {
        DB.delete('budget_expenses', id);
        APP.notify('Expense deleted', 'info');
        renderExpList();
    });
}

// ════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════
function _bReports(el) {
    var budgets  = DB.get('budgets')  || [];
    var expenses = DB.get('budget_expenses') || [];

    // Latest budget per dept
    var latestBudget = {};
    budgets.forEach(function(b) {
        if (!latestBudget[b.department] || b.createdAt > latestBudget[b.department].createdAt)
            latestBudget[b.department] = b;
    });
    var deptSpent = {};
    expenses.forEach(function(e){ deptSpent[e.department] = (deptSpent[e.department]||0)+(parseFloat(e.amount)||0); });

    var allDepts = Object.keys(Object.assign({}, latestBudget, deptSpent));

    // Category totals
    var catMap = {};
    expenses.forEach(function(e){ catMap[e.category||'Other']=(catMap[e.category||'Other']||0)+(parseFloat(e.amount)||0); });
    var catK = Object.keys(catMap);

    // Monthly trend (last 12 months)
    var monthMap = {};
    expenses.forEach(function(e) {
        var m = (e.expenseDate||e.createdAt||'').substring(0,7);
        if (m) monthMap[m] = (monthMap[m]||0)+(parseFloat(e.amount)||0);
    });
    var mKeys = Object.keys(monthMap).sort().slice(-12);

    // Dept summary table rows
    var deptRows = allDepts.map(function(nm) {
        var bAmt  = latestBudget[nm] ? (parseFloat(latestBudget[nm].amount)||0) : 0;
        var spent = deptSpent[nm] || 0;
        var pct   = bAmt > 0 ? Math.round(spent/bAmt*100) : (spent>0?100:0);
        var rem   = bAmt - spent;
        var col   = pct>=90?'#ea4335':pct>=70?'#fbbc04':'#34a853';
        return '<tr>'
            + '<td><strong>' + nm + '</strong></td>'
            + '<td>' + _bFmt(bAmt) + '</td>'
            + '<td style="color:#ea4335;font-weight:600;">' + _bFmt(spent) + '</td>'
            + '<td style="color:' + (rem<0?'#ea4335':'#34a853') + ';font-weight:700;">' + _bFmt(rem) + (rem<0?' ⚠️':'') + '</td>'
            + '<td style="min-width:140px;">'
            + '<div style="display:flex;align-items:center;gap:6px;">'
            + '<div style="flex:1;height:8px;background:var(--light-gray);border-radius:4px;overflow:hidden;">'
            + '<div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + col + ';border-radius:4px;"></div></div>'
            + '<span style="font-size:12px;font-weight:700;color:' + col + ';">' + pct + '%</span></div></td>'
            + '</tr>';
    }).join('');

    el.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
        + '<div class="card" style="padding:16px;"><div style="font-size:14px;font-weight:700;margin-bottom:12px;">Budget vs Expenses by Department</div><div style="position:relative;height:260px;"><canvas id="br_deptBar"></canvas></div></div>'
        + '<div class="card" style="padding:16px;"><div style="font-size:14px;font-weight:700;margin-bottom:12px;">Expense Category Distribution</div><div style="position:relative;height:260px;"><canvas id="br_catPie"></canvas></div></div>'
        + '</div>'
        + '<div style="margin-bottom:16px;">'
        + '<div class="card" style="padding:16px;"><div style="font-size:14px;font-weight:700;margin-bottom:12px;">Monthly Expense Trend</div><div style="position:relative;height:220px;"><canvas id="br_monthly"></canvas></div></div>'
        + '</div>'
        + '<div class="card">'
        + '<div style="font-size:14px;font-weight:700;padding:12px 16px;border-bottom:1px solid var(--light-gray);">Department Budget Summary</div>'
        + '<div class="table-responsive"><table><thead><tr>'
        + '<th>Department</th><th>Allocated Budget</th><th>Total Spent</th><th>Remaining</th><th>Utilization</th>'
        + '</tr></thead><tbody>'
        + (deptRows || '<tr><td colspan="5" class="empty-state">No data available. Set budgets and log expenses to see reports.</td></tr>')
        + '</tbody></table></div></div>';

    setTimeout(function() {
        if (allDepts.length) {
            _bMakeChart('br_deptBar', {
                type: 'bar',
                data: {
                    labels: allDepts,
                    datasets: [
                        { label: 'Budget', data: allDepts.map(function(n){ return latestBudget[n]?(parseFloat(latestBudget[n].amount)||0):0; }), backgroundColor: '#1a73e8', borderRadius: 4 },
                        { label: 'Spent',  data: allDepts.map(function(n){ return deptSpent[n]||0; }), backgroundColor: '#ea4335', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '₹'+v.toLocaleString('en-IN'); } } } } }
            });
        }
        if (catK.length) {
            _bMakeChart('br_catPie', {
                type: 'doughnut',
                data: { labels: catK, datasets: [{ data: Object.values(catMap), backgroundColor: ['#1a73e8','#34a853','#ea4335','#fbbc04','#9c27b0','#00bcd4','#ff9800','#78909c'], borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }
        if (mKeys.length) {
            _bMakeChart('br_monthly', {
                type: 'bar',
                data: { labels: mKeys, datasets: [{ label: 'Expenses', data: mKeys.map(function(m){ return monthMap[m]; }), backgroundColor: '#ff9800', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '₹'+v.toLocaleString('en-IN'); } } } } }
            });
        }
    }, 50);
}
