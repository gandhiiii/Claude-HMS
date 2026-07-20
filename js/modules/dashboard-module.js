var _dashProbActiveTab = 'daily';

function _dashProbPeriodStart(freq) {
    var now = new Date();
    var base = now.getHours() < 5
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var y = base.getFullYear(), m = base.getMonth(), d = base.getDate();
    if (freq === 'weekly') {
        var dow = base.getDay();
        var diff = dow === 0 ? 6 : dow - 1;
        var mon = new Date(y, m, d - diff);
        return new Date(mon.getFullYear(), mon.getMonth(), mon.getDate(), 5, 0, 0, 0);
    }
    if (freq === 'monthly') return new Date(y, m, 1, 5, 0, 0, 0);
    if (freq === 'yearly')  return new Date(y, 0, 1, 5, 0, 0, 0);
    return new Date(y, m, d, 5, 0, 0, 0); // daily
}

function _dashProbPeriodLabel(freq) {
    var s = _dashProbPeriodStart(freq);
    if (freq === 'daily')   return 'Today (' + s.toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short'}) + ')';
    if (freq === 'weekly')  return 'Week of ' + s.toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'});
    if (freq === 'monthly') return s.toLocaleDateString('en-IN', {month:'long',year:'numeric'});
    return s.getFullYear().toString();
}

function _checkProbArchive() {
    var now = new Date();
    var base = now.getHours() < 5
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var todayKey = base.getFullYear() + '-' + ('0'+(base.getMonth()+1)).slice(-2) + '-' + ('0'+base.getDate()).slice(-2);
    var lastKey = localStorage.getItem('hms_lastProbArchiveKey') || '';
    if (lastKey === todayKey) return;
    if (lastKey) {
        var log = DB.get('problemDailyLog') || [];
        if (!log.find(function(l){ return l.date === lastKey; })) {
            var parts = lastKey.split('-');
            var prevStart = new Date(+parts[0], +parts[1]-1, +parts[2], 5, 0, 0, 0);
            var prevEnd   = _dashProbPeriodStart('daily');
            var probs = (DB.get('problems') || []).filter(function(p) {
                if (!p.createdAt) return false;
                var cd = new Date(p.createdAt);
                return cd >= prevStart && cd < prevEnd;
            });
            DB.add('problemDailyLog', {
                date:     lastKey,
                raised:   probs.length,
                resolved: probs.filter(function(p){ return p.status === 'resolved'; }).length,
                open:     probs.filter(function(p){ return p.status !== 'resolved'; }).length
            });
        }
    }
    localStorage.setItem('hms_lastProbArchiveKey', todayKey);
}

function renderDashboard(container) {
    const user = AUTH.currentUser();
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;

    const users = DB.get('users');
    const departments = DB.get('departments');
    const inventory = DB.get('inventory');
    const admissions = DB.get('admissions');
    const tasks = DB.get('tasks');
    const complaints = DB.get('complaints');
    const problems = DB.get('problems');
    const projects = DB.get('projects');
    const lost = DB.get('lostfound');
    const gate = DB.get('gatesecurity');
    const ambulance = DB.get('ambulance');
    const checklists = DB.get('checklists');
    const adminTasks = DB.get('adminChecklist') || [];
    const p2Tasks = DB.get('phase2Tasks') || [];
    const trips = DB.get('ambulance_trips');

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const isThisMonth = d => { const dt = new Date(d); return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear; };

    const activeAdmissions = admissions.filter(a => a.status === 'admitted').length;
    const totalAdmitted = admissions.length;
    const monthAdmissions = admissions.filter(a => isThisMonth(a.createdAt)).length;
    const monthDischarges = admissions.filter(a => a.status === 'discharged' && isThisMonth(a.dischargeDate)).length;
    const avgStay = admissions.filter(a => a.status === 'discharged' && a.dischargeDate)
        .reduce((sum, a) => sum + APP.daysBetween(a.admissionDate, a.dischargeDate), 0) / Math.max(1, admissions.filter(a => a.status === 'discharged').length);

    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const openComplaints = complaints.filter(c => c.status === 'open' || c.status === 'in-progress').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
    const totalComplaints = complaints.length;
    const compRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

    const openProblems = problems.filter(p => p.status === 'open').length;
    const resolvedProblems = problems.filter(p => p.status === 'resolved').length;
    const totalProblems = problems.length;
    const probRate = totalProblems > 0 ? Math.round((resolvedProblems / totalProblems) * 100) : 0;

    const lowStock = inventory.filter(i => parseInt(i.quantity) < 10).length;
    const outOfStock = inventory.filter(i => parseInt(i.quantity) === 0).length;
    const expiringSoon = inventory.filter(i => {
        if (!i.expiryDate) return false;
        const days = APP.daysBetween(new Date().toISOString(), i.expiryDate);
        return days >= 0 && days <= 30;
    }).length;

    const pendingGate = gate.filter(g => g.status === 'pending').length;
    const approvedGate = gate.filter(g => g.status === 'approved').length;
    const totalGate = gate.length;

    const totalAmb = ambulance.length;
    const dutyAmb = ambulance.filter(a => a.status === 'on-duty').length;
    const availAmb = ambulance.filter(a => a.status === 'available').length;

    const activeProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'planning').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0);
    const totalSpent = projects.reduce((s, p) => s + (parseFloat(p.spent) || 0), 0);
    const budgetUtil = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const totalTrips = trips.length;
    const monthTrips = trips.filter(t => isThisMonth(t.createdAt)).length;
    const totalKm = trips.reduce((s, t) => s + (parseFloat(t.kilometers) || 0), 0);
    const totalFare = trips.reduce((s, t) => s + (parseFloat(t.fare) || 0), 0);

    const pendingPwReqs = isAdmin ? (DB.get('pwResetRequests') || []).filter(function(r){ return r.status === 'pending'; }) : [];
    const pwReqAlert = pendingPwReqs.length > 0
        ? `<div class="card" style="border-left:4px solid #f59e0b;margin-bottom:16px;padding:14px 16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:22px;">🔑</span>
                    <div>
                        <div style="font-weight:700;font-size:15px;">Password Reset Requests</div>
                        <div style="font-size:13px;color:var(--gray);">${pendingPwReqs.length} pending — staff waiting for password reset</div>
                    </div>
                </div>
                <button class="btn btn-warning" onclick="Router.navigate('users')" style="white-space:nowrap;">View &amp; Resolve</button>
            </div>
            <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                ${pendingPwReqs.map(function(r){
                    var safeU = (r.username||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
                    var safeN = (r.fullName||'-').replace(/&/g,'&amp;').replace(/</g,'&lt;');
                    var safeD = (r.department||'-').replace(/&/g,'&amp;').replace(/</g,'&lt;');
                    var when = r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-';
                    return '<div style="background:var(--bg);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'
                        + '<div>'
                        + '<div style="font-weight:600;font-size:14px;">'+safeN+' <span style="color:var(--gray);font-size:12px;">@'+safeU+'</span></div>'
                        + '<div style="font-size:12px;color:var(--gray);">'+safeD+' &bull; '+when+'</div>'
                        + '</div>'
                        + '<div style="display:flex;gap:6px;">'
                        + '<button class="btn btn-sm btn-primary" onclick="adminResetUserPw(\''+r.id+'\')">Reset</button>'
                        + '<button class="btn btn-sm btn-outline" onclick="adminDismissPwReq(\''+r.id+'\')">Dismiss</button>'
                        + '</div></div>';
                }).join('')}
            </div>
           </div>`
        : '';

    container.innerHTML = `
        ${pwReqAlert}
        <div style="margin-bottom:20px;">
            <h2 style="font-size:20px;font-weight:700;">👋 Welcome, ${user.fullName}</h2>
            <p style="font-size:13px;color:var(--gray);">Hospital overview & Key Performance Indicators</p>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));">
            <div class="stat-card"><div class="stat-icon">🏥</div><div class="stat-value">${activeAdmissions}</div><div class="stat-label">In-Patients</div></div>
            <div class="stat-card"><div class="stat-icon">📥</div><div class="stat-value">${monthAdmissions}</div><div class="stat-label">Admitted (Month)</div></div>
            <div class="stat-card"><div class="stat-icon">📤</div><div class="stat-value">${monthDischarges}</div><div class="stat-label">Discharged (Month)</div></div>
            <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">${avgStay.toFixed(1)}d</div><div class="stat-label">Avg Stay</div></div>
            <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${completedTasks}/${totalTasks}</div><div class="stat-label">Tasks Done</div></div>
            <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${resolvedComplaints}/${totalComplaints}</div><div class="stat-label">Complaints Resolved</div></div>
            <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-value">${resolvedProblems}/${totalProblems}</div><div class="stat-label">Problems Solved</div></div>
            <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-value">${lowStock}</div><div class="stat-label">Low Stock</div></div>
            <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value">${expiringSoon}</div><div class="stat-label">Expiring ≤30d</div></div>
            <div class="stat-card"><div class="stat-icon">🛡️</div><div class="stat-value">${pendingGate}</div><div class="stat-label">Pending Gates</div></div>
            <div class="stat-card"><div class="stat-icon">🚑</div><div class="stat-value">${dutyAmb}/${totalAmb}</div><div class="stat-label">Ambulances On Duty</div></div>
            <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">${activeProjects}</div><div class="stat-label">Active Projects</div></div>
        </div>

        ${isAdmin ? `
        <div class="card" style="margin-top:20px;">
            <div class="card-header"><h2>📊 KPI Performance Meters</h2></div>
            <div class="grid-2">
                <div>
                    <div class="flex-between"><span style="font-size:13px;">Task Completion</span><span style="font-size:13px;font-weight:600;">${taskRate}%</span></div>
                    <div class="progress-bar"><div class="progress-fill ${taskRate > 70 ? 'green' : taskRate > 40 ? 'yellow' : 'red'}" style="width:${taskRate}%"></div></div>
                </div>
                <div>
                    <div class="flex-between"><span style="font-size:13px;">Complaint Resolution</span><span style="font-size:13px;font-weight:600;">${compRate}%</span></div>
                    <div class="progress-bar"><div class="progress-fill ${compRate > 70 ? 'green' : compRate > 40 ? 'yellow' : 'red'}" style="width:${compRate}%"></div></div>
                </div>
                <div>
                    <div class="flex-between"><span style="font-size:13px;">Problem Resolution</span><span style="font-size:13px;font-weight:600;">${probRate}%</span></div>
                    <div class="progress-bar"><div class="progress-fill ${probRate > 70 ? 'green' : probRate > 40 ? 'yellow' : 'red'}" style="width:${probRate}%"></div></div>
                </div>
                <div>
                    <div class="flex-between"><span style="font-size:13px;">Budget Utilization</span><span style="font-size:13px;font-weight:600;">${budgetUtil}%</span></div>
                    <div class="progress-bar"><div class="progress-fill ${budgetUtil > 80 ? 'yellow' : budgetUtil > 50 ? 'green' : 'green'}" style="width:${Math.min(100,budgetUtil)}%"></div></div>
                </div>
                <div>
                    <div class="flex-between"><span style="font-size:13px;">Gate Approval Rate</span><span style="font-size:13px;font-weight:600;">${totalGate > 0 ? Math.round((approvedGate/totalGate)*100) : 0}%</span></div>
                    <div class="progress-bar"><div class="progress-fill green" style="width:${totalGate > 0 ? Math.round((approvedGate/totalGate)*100) : 0}%"></div></div>
                </div>
                <div>
                    <div class="flex-between"><span style="font-size:13px;">Inventory In-Stock</span><span style="font-size:13px;font-weight:600;">${inventory.length > 0 ? Math.round(((inventory.length - outOfStock)/inventory.length)*100) : 0}%</span></div>
                    <div class="progress-bar"><div class="progress-fill ${outOfStock > 0 ? 'yellow' : 'green'}" style="width:${inventory.length > 0 ? Math.round(((inventory.length - outOfStock)/inventory.length)*100) : 0}%"></div></div>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h2>👥 Employee KPI — Task Performance</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead><tr><th>Employee</th><th>Role</th><th>Tasks Done</th><th>Total</th><th>Rate</th><th>Complaints</th></tr></thead>
                        <tbody>${renderEmployeeKPI(users, tasks, complaints)}</tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h2>🏢 Department KPIs</h2></div>
                <div class="table-responsive">
                    <table>
                        <thead><tr><th>Department</th><th>Users</th><th>Tasks</th><th>Complaints</th><th>Checklists</th></tr></thead>
                        <tbody>${renderDeptKPI(departments, users, tasks, complaints, checklists)}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h2>🚑 Ambulance KPI</h2></div>
                <div class="grid-3" style="margin-bottom:12px;">
                    <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;"><div style="font-size:24px;font-weight:700;">${totalTrips}</div><div style="font-size:12px;color:var(--gray);">Total Trips</div></div>
                    <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;"><div style="font-size:24px;font-weight:700;">${monthTrips}</div><div style="font-size:12px;color:var(--gray);">This Month</div></div>
                    <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;"><div style="font-size:24px;font-weight:700;">${Math.round(totalFare)}</div><div style="font-size:12px;color:var(--gray);">Total Fare (₹)</div></div>
                </div>
                <div style="font-size:13px;color:var(--gray);">Total KM Driven: <strong>${Math.round(totalKm)} km</strong></div>
            </div>
            <div class="card">
                <div class="card-header"><h2>🏗️ Projects KPI</h2></div>
                <div class="grid-3" style="margin-bottom:12px;">
                    <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;"><div style="font-size:24px;font-weight:700;">${projects.length}</div><div style="font-size:12px;color:var(--gray);">Total Projects</div></div>
                    <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;"><div style="font-size:24px;font-weight:700;">${completedProjects}</div><div style="font-size:12px;color:var(--gray);">Completed</div></div>
                    <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;"><div style="font-size:24px;font-weight:700;">₹${(totalBudget/100000).toFixed(1)}L</div><div style="font-size:12px;color:var(--gray);">Total Budget</div></div>
                </div>
                <div style="font-size:13px;color:var(--gray);">Budget Used: <strong>₹${(totalSpent/100000).toFixed(1)}L</strong> of ₹${(totalBudget/100000).toFixed(1)}L</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>📈 Admission Trends</h2></div>
            <div class="grid-4">
                <div style="text-align:center;padding:16px;background:#e8f0fe;border-radius:8px;">
                    <div style="font-size:28px;font-weight:700;color:var(--primary);">${admissions.filter(a=>a.type==='emergency').length}</div>
                    <div style="font-size:12px;color:var(--gray);">Emergency</div>
                </div>
                <div style="text-align:center;padding:16px;background:#e6f4ea;border-radius:8px;">
                    <div style="font-size:28px;font-weight:700;color:var(--secondary);">${admissions.filter(a=>a.type==='regular').length}</div>
                    <div style="font-size:12px;color:var(--gray);">Regular</div>
                </div>
                <div style="text-align:center;padding:16px;background:#fef7e0;border-radius:8px;">
                    <div style="font-size:28px;font-weight:700;color:#e37400;">${admissions.filter(a=>a.type==='icu').length}</div>
                    <div style="font-size:12px;color:var(--gray);">ICU</div>
                </div>
                <div style="text-align:center;padding:16px;background:#fce8e6;border-radius:8px;">
                    <div style="font-size:28px;font-weight:700;color:var(--danger);">${admissions.filter(a=>a.status==='discharged').length}</div>
                    <div style="font-size:12px;color:var(--gray);">Discharged Total</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>🔖 Admin Checklist — My Tasks</h2></div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <input type="text" id="dashAdmTaskInput" class="form-control" placeholder="Quick task..." style="flex:1;">
                <button class="btn btn-sm btn-primary" onclick="addDashAdmTask()">Add</button>
            </div>
            <div id="dashAdmTaskList" style="max-height:180px;overflow-y:auto;"></div>
        </div>

        ${renderP2DashboardWidget(p2Tasks)}
        ${renderInvValueWidget()}
        <div class="card" style="margin-top:20px;">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h2>🔧 Problems &amp; Solutions Log</h2>
                <span style="font-size:12px;color:var(--gray);">Resets daily at 5:00 AM</span>
            </div>
            <div id="dashProbTodayBar"></div>
            <div style="display:flex;gap:4px;margin:10px 0 14px;background:var(--light-gray);border-radius:10px;padding:4px;width:fit-content;">
                <button id="dashProbBtnDaily"   class="btn btn-sm btn-primary" style="border-radius:7px;font-weight:600;" onclick="dashProbTab('daily')">Daily</button>
                <button id="dashProbBtnWeekly"  class="btn btn-sm btn-outline" style="border-radius:7px;font-weight:600;" onclick="dashProbTab('weekly')">Weekly</button>
                <button id="dashProbBtnMonthly" class="btn btn-sm btn-outline" style="border-radius:7px;font-weight:600;" onclick="dashProbTab('monthly')">Monthly</button>
                <button id="dashProbBtnYearly"  class="btn btn-sm btn-outline" style="border-radius:7px;font-weight:600;" onclick="dashProbTab('yearly')">Yearly</button>
            </div>
            <div id="dashProbContent"></div>
        </div>
        ` : ''}

        <div class="grid-2" style="margin-top:20px;">
            <div class="card">
                <div class="card-header"><h2>⚡ Quick Actions</h2></div>
                <div class="grid-2">
                    <button class="btn btn-primary" onclick="Router.navigate('admissions')">New Admission</button>
                    <button class="btn btn-success" onclick="Router.navigate('inventory')">Add Inventory</button>
                    <button class="btn btn-warning" onclick="Router.navigate('gate-security')">Gate Entry</button>
                    <button class="btn btn-info" onclick="Router.navigate('ambulance')">Ambulance</button>
                    <button class="btn btn-primary" onclick="Router.navigate('tasks')">New Task</button>
                    <button class="btn btn-primary" onclick="Router.navigate('complaints')">New Complaint</button>
                    <button class="btn btn-primary" onclick="Router.navigate('projects')">New Project</button>
                    <button class="btn btn-primary" onclick="Router.navigate('checklists')">New Checklist</button>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h2>🕐 Recent Activity</h2></div>
                <div class="timeline" id="activityTimeline"></div>
            </div>
        </div>
    `;

    const timeline = document.getElementById('activityTimeline');
    const activities = [];
    admissions.forEach(a => activities.push({ date: a.createdAt || a.admissionDate, text: `${a.patientName} ${a.status === 'admitted' ? 'admitted' : 'discharged'} (${a.type})` }));
    tasks.forEach(t => activities.push({ date: t.createdAt, text: `Task: ${t.title} → ${t.assignedTo} [${t.status}]` }));
    complaints.forEach(c => activities.push({ date: c.createdAt, text: `Complaint: ${c.patientName} — ${c.status}` }));
    gate.forEach(g => activities.push({ date: g.createdAt, text: `Gate: ${g.itemName} ${g.direction} ${g.status}` }));
    trips.forEach(t => activities.push({ date: t.createdAt, text: `Trip: ${t.patientName} ${t.vehicleNo} ${t.kilometers}km` }));
    checklists.forEach(c => activities.push({ date: c.createdAt, text: `Checklist: ${c.title} → ${c.assignedTo}` }));
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = activities.slice(0, 8);
    timeline.innerHTML = recent.map(a => `
        <div class="timeline-item">
            <div class="time">${APP.formatDateTime(a.date)}</div>
            <div style="font-size:13px;">${a.text}</div>
        </div>
    `).join('') || '<div class="empty-state">No recent activity</div>';

    if (isAdmin) renderDashAdmTasks();
    if (isAdmin) { _checkProbArchive(); _renderDashProbContent('daily'); }
}

function renderDashAdmTasks() {
    const user = AUTH.currentUser();
    if (!user) return;
    const all = DB.get('adminChecklist') || [];
    const items = all.filter(i => i.createdBy === user.fullName && !i.done);
    const list = document.getElementById('dashAdmTaskList');
    if (!list) return;
    if (items.length === 0) {
        list.innerHTML = '<div style="font-size:13px;color:var(--gray);padding:8px 0;">No pending tasks 🎉</div>';
        return;
    }
    list.innerHTML = items.slice().reverse().map(i => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);font-size:13px;">
            <input type="checkbox" onchange="dashToggleAdmTask('${i.id}')" style="width:16px;height:16px;">
            <span style="flex:1;">${i.text}</span>
            <span style="font-size:11px;color:var(--gray);">${APP.formatDate(i.createdAt)}</span>
        </div>
    `).join('');
}

function addDashAdmTask() {
    const input = document.getElementById('dashAdmTaskInput');
    const text = input?.value?.trim();
    if (!text) { APP.notify('Enter a task', 'error'); return; }
    DB.add('adminChecklist', { text, done: false, createdBy: AUTH.currentUser().fullName });
    input.value = '';
    renderDashAdmTasks();
    APP.notify('Task added', 'success');
}

function dashToggleAdmTask(id) {
    const item = DB.getById('adminChecklist', id);
    if (!item) return;
    DB.update('adminChecklist', id, { done: !item.done });
    renderDashAdmTasks();
}

function renderEmployeeKPI(users, tasks, complaints) {
    const employees = users.filter(u => u.role !== 'admin' && !u.isSuperAdmin);
    if (employees.length === 0) return '<tr><td colspan="6" class="empty-state">No employees</td></tr>';

    return employees.map(e => {
        const empTasks = tasks.filter(t => t.assignedTo === e.fullName);
        const done = empTasks.filter(t => t.status === 'completed').length;
        const total = empTasks.length;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;
        const empComplaints = complaints.filter(c => c.patientName === e.fullName || c.resolvedBy === e.fullName);
        const handled = empComplaints.filter(c => c.status === 'resolved').length;
        return `<tr>
            <td><strong>${e.fullName}</strong></td>
            <td><span class="badge ${APP.getRoleBadge(e.role)}">${e.role.replace('_',' ')}</span></td>
            <td>${done}</td>
            <td>${total}</td>
            <td>
                <div class="progress-bar" style="width:60px;display:inline-block;">
                    <div class="progress-fill ${rate > 70 ? 'green' : rate > 40 ? 'yellow' : 'red'}" style="width:${rate}%"></div>
                </div>
                <span style="font-size:11px;margin-left:4px;">${rate}%</span>
            </td>
            <td>${handled}/${empComplaints.length}</td>
        </tr>`;
    }).join('');
}

function renderDeptKPI(departments, users, tasks, complaints, checklists) {
    return departments.filter(d => d.active !== false).map(d => {
        const deptUsers = users.filter(u => u.department === d.name).length;
        const deptTasks = tasks.filter(t => t.department === d.name).length;
        const deptComplaints = complaints.filter(c => c.category === d.name || c.roomNo?.startsWith(d.name)).length;
        const deptChecklists = checklists.filter(c => c.assignedTo === d.name).length;
        return `<tr>
            <td><strong>${d.name}</strong></td>
            <td>${deptUsers}</td>
            <td>${deptTasks}</td>
            <td>${deptComplaints}</td>
            <td>${deptChecklists}</td>
        </tr>`;
    }).join('');
}

function renderP2DashboardWidget(p2Tasks) {
    const total = p2Tasks.length;
    if (total === 0) return '';

    const completed = p2Tasks.filter(t => t.status === 'completed').length;
    const inProgress = p2Tasks.filter(t => t.status === 'in-progress').length;
    const delayed = p2Tasks.filter(t => t.status === 'delayed').length;
    let weightedProgress = 0;
    p2Tasks.forEach(t => {
        if (t.status === 'completed') weightedProgress += 100;
        else if (t.status === 'in-progress' || t.status === 'delayed') weightedProgress += (t.progress || 0);
    });
    const overallPct = Math.round(weightedProgress / total);
    const barColor = overallPct > 70 ? 'green' : overallPct > 40 ? 'yellow' : 'red';

    return `<div class="card">
        <div class="card-header"><h2>🏗️ Phase 2 Infra Status</h2></div>
        <div class="grid-4" style="margin-bottom:8px;">
            <div style="text-align:center;"><div style="font-size:22px;font-weight:700;">${total}</div><div style="font-size:11px;color:var(--gray);">Total Tasks</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:700;color:var(--success);">${completed}</div><div style="font-size:11px;color:var(--gray);">Done</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:700;color:var(--info);">${inProgress}</div><div style="font-size:11px;color:var(--gray);">Active</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:700;color:var(--danger);">${delayed}</div><div style="font-size:11px;color:var(--gray);">Delayed</div></div>
        </div>
        <div class="flex-between"><span style="font-size:13px;">Overall Progress</span><span style="font-size:13px;font-weight:600;">${overallPct}%</span></div>
        <div class="progress-bar"><div class="progress-fill ${barColor}" style="width:${overallPct}%"></div></div>
        <div style="margin-top:8px;text-align:right;">
            <button class="btn btn-sm btn-outline" onclick="Router.navigate('phase2')">View Details →</button>
        </div>
    </div>`;
}

function renderInvValueWidget() {
    const items = DB.get('inventory');
    if (items.length === 0) return '';

    const deptMap = {};
    items.forEach(i => {
        const d = i.department || 'Unassigned';
        if (!deptMap[d]) deptMap[d] = [];
        deptMap[d].push(i);
    });

    const totalValue = items.reduce((s, i) => s + ((parseInt(i.quantity) || 0) * (parseFloat(i.price) || 0)), 0);
    const totalQty = items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);

    let deptRows = Object.entries(deptMap).sort().map(([dept, data]) => {
        const deptVal = data.reduce((s, i) => s + ((parseInt(i.quantity) || 0) * (parseFloat(i.price) || 0)), 0);
        const deptQty = data.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
        const pct = totalValue > 0 ? Math.round((deptVal / totalValue) * 100) : 0;
        return `<tr>
            <td><strong>${dept}</strong></td>
            <td>${data.length}</td>
            <td>${deptQty}</td>
            <td style="font-weight:600;">₹${deptVal.toFixed(2)}</td>
            <td><div class="progress-bar" style="width:60px;display:inline-block;"><div class="progress-fill green" style="width:${pct}%"></div></div> ${pct}%</td>
        </tr>`;
    }).join('');

    return `<div class="card">
        <div class="card-header"><h2>📦 Inventory Stock Value</h2></div>
        <div class="grid-4" style="margin-bottom:8px;">
            <div style="text-align:center;"><div style="font-size:22px;font-weight:700;">${items.length}</div><div style="font-size:11px;color:var(--gray);">Items</div></div>
            <div style="text-align:center;"><div style="font-size:22px;font-weight:700;">${totalQty}</div><div style="font-size:11px;color:var(--gray);">Total Qty</div></div>
            <div style="text-align:center;grid-column:span 2;"><div style="font-size:22px;font-weight:700;color:var(--success);">₹${totalValue.toFixed(2)}</div><div style="font-size:11px;color:var(--gray);">Total Stock Value</div></div>
        </div>
        <div class="table-responsive" style="max-height:240px;overflow-y:auto;">
            <table>
                <thead><tr><th>Department</th><th>Items</th><th>Qty</th><th>Value</th><th>% Share</th></tr></thead>
                <tbody>${deptRows || '<tr><td colspan="5" class="empty-state">No department data</td></tr>'}</tbody>
            </table>
        </div>
        <div style="margin-top:8px;text-align:right;">
            <button class="btn btn-sm btn-outline" onclick="Router.navigate('inventory')">Manage Inventory →</button>
        </div>
    </div>`;
}

function dashProbTab(freq) {
    _dashProbActiveTab = freq;
    ['daily','weekly','monthly','yearly'].forEach(function(f) {
        var btn = document.getElementById('dashProbBtn' + f.charAt(0).toUpperCase() + f.slice(1));
        if (!btn) return;
        btn.className = 'btn btn-sm ' + (f === freq ? 'btn-primary' : 'btn-outline');
        btn.style.borderRadius = '7px';
        btn.style.fontWeight   = '600';
    });
    _renderDashProbContent(freq);
}

function _renderDashProbContent(freq) {
    var el = document.getElementById('dashProbContent');
    if (!el) return;
    var problems = DB.get('problems') || [];
    var start    = _dashProbPeriodStart(freq);
    var label    = _dashProbPeriodLabel(freq);

    var filtered = problems.filter(function(p) {
        return p.createdAt && new Date(p.createdAt) >= start;
    }).sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var raised   = filtered.length;
    var resolved = filtered.filter(function(p) { return p.status === 'resolved'; }).length;
    var inprog   = filtered.filter(function(p) { return p.status === 'in-progress'; }).length;
    var open     = raised - resolved;
    var rate     = raised > 0 ? Math.round((resolved / raised) * 100) : 0;

    // Always update the summary bar (regardless of freq)
    var barEl = document.getElementById('dashProbTodayBar');
    if (barEl) {
        var barColor = rate > 70 ? 'green' : rate > 40 ? 'yellow' : 'red';
        barEl.innerHTML = '<div style="display:flex;gap:20px;align-items:center;padding:10px 0 8px;border-bottom:1px solid var(--border);margin-bottom:6px;flex-wrap:wrap;">'
            + '<div style="text-align:center;"><div style="font-size:24px;font-weight:700;color:var(--danger);">'  + open     + '</div><div style="font-size:11px;color:var(--gray);">Open</div></div>'
            + '<div style="text-align:center;"><div style="font-size:24px;font-weight:700;color:#f59e0b;">'        + inprog   + '</div><div style="font-size:11px;color:var(--gray);">In Progress</div></div>'
            + '<div style="text-align:center;"><div style="font-size:24px;font-weight:700;color:var(--secondary);">'+ resolved + '</div><div style="font-size:11px;color:var(--gray);">Resolved</div></div>'
            + '<div style="text-align:center;"><div style="font-size:24px;font-weight:700;color:var(--primary);">' + raised   + '</div><div style="font-size:11px;color:var(--gray);">Total</div></div>'
            + '<div style="flex:1;min-width:140px;">'
            + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>Resolve Rate</span><span style="font-weight:600;">' + rate + '%</span></div>'
            + '<div class="progress-bar"><div class="progress-fill ' + barColor + '" style="width:' + rate + '%"></div></div>'
            + '</div></div>';
    }

    if (filtered.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray);">No problems recorded for ' + label + '.</div>';
        return;
    }

    var html = '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">'
        + label + ' &nbsp;·&nbsp; ' + raised + ' raised &nbsp;·&nbsp; '
        + resolved + ' resolved &nbsp;·&nbsp; ' + open + ' open</div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">'
        + '<thead><tr style="background:var(--light-gray);">'
        + '<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Ticket ID</th>'
        + '<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Title</th>'
        + '<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Department</th>'
        + '<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Raised On</th>'
        + '<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Status</th>'
        + '<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);">Solution</th>'
        + '</tr></thead><tbody>';

    filtered.forEach(function(p) {
        var sc = p.status === 'resolved' ? 'var(--secondary)' : p.status === 'in-progress' ? '#f59e0b' : 'var(--danger)';
        var sl = (p.status || 'open').replace(/-/g,' ').toUpperCase();
        var ticket   = p.ticketId || ('#' + (p.id || '').slice(-6));
        var dept     = (p.routedTo || p.department || '-').replace(/&/g,'&amp;').replace(/</g,'&lt;');
        var title    = (p.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
        if (title.length > 60) title = title.slice(0, 60) + '…';
        var solution = (p.solution || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
        if (solution.length > 90) solution = solution.slice(0, 90) + '…';
        var raisedOn = p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}) : '-';
        html += '<tr style="border-bottom:1px solid var(--border);">'
            + '<td style="padding:7px 8px;font-family:monospace;font-size:11px;white-space:nowrap;">' + ticket + '</td>'
            + '<td style="padding:7px 8px;">' + title + '</td>'
            + '<td style="padding:7px 8px;font-size:12px;">' + dept + '</td>'
            + '<td style="padding:7px 8px;font-size:11px;color:var(--gray);white-space:nowrap;">' + raisedOn + '</td>'
            + '<td style="padding:7px 8px;"><span style="background:' + sc + ';color:#fff;font-size:10px;padding:2px 7px;border-radius:20px;white-space:nowrap;">' + sl + '</span></td>'
            + '<td style="padding:7px 8px;font-size:12px;color:' + (solution ? 'var(--text)' : 'var(--gray)') + ';">' + (solution || '—') + '</td>'
            + '</tr>';
    });

    html += '</tbody></table></div>';
    el.innerHTML = html;
}
