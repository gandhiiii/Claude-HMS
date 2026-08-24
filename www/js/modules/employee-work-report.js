/**
 * Employee Work Performance & Detailed Checklist Report Module
 * Generates comprehensive work reports including:
 * - KPI Overview & Overall Performance Score
 * - Detailed Checklist Breakdown (All Points, Fill Status, Values/Notes, Timestamps)
 * - Assigned & Completed Tasks
 * - Problems & Support Tickets
 * - Personal & Assigned To-Do Items
 * - Material Requisitions
 * - Quarterly Priorities & Goals
 * 
 * Accessible by both HODs (for team members) and Employees (for themselves).
 * Supports On-screen Preview Modal, PDF Download, Excel Export, and Printing.
 */
(function() {
    const EmpWorkReport = {
        getEmployeeData(targetUsername, periodFilter) {
            const currentUser = typeof AUTH !== 'undefined' ? AUTH.currentUser() : null;
            let empUser = null;
            const users = (typeof DB !== 'undefined' && DB.get('users')) || [];

            if (targetUsername) {
                empUser = users.find(u => u.username === targetUsername || u.id === targetUsername || u.fullName === targetUsername);
            }
            if (!empUser && currentUser) {
                empUser = currentUser;
            }
            if (!empUser) {
                empUser = { username: 'user', fullName: 'Employee', role: 'employee', department: 'General' };
            }

            const username = empUser.username;
            const period = periodFilter || 'all';

            // Filter date boundaries
            const now = new Date();
            let startDate = null;
            if (period === 'today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            } else if (period === 'week') {
                const day = now.getDay() || 7;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            }

            const isAfterStart = (dStr) => {
                if (!startDate || !dStr) return true;
                return new Date(dStr) >= startDate;
            };

            // 1. Fetch Tasks
            const allTasks = (typeof DB !== 'undefined' && DB.get('tasks')) || [];
            const empTasks = allTasks.filter(t => (t.assignedTo === username || t.createdBy === username || (t.assignedUsers && t.assignedUsers.includes(username))) && isAfterStart(t.createdAt || t.deadline));
            const tasksCompleted = empTasks.filter(t => t.status === 'completed');
            const taskRate = empTasks.length > 0 ? Math.round((tasksCompleted.length / empTasks.length) * 100) : 100;

            // 2. Fetch Problems
            const allProbs = (typeof DB !== 'undefined' && DB.get('problems')) || [];
            const empProbs = allProbs.filter(p => (p.assignedTo === username || p.createdBy === username || p.assignedToName === empUser.fullName) && isAfterStart(p.createdAt));
            const probsResolved = empProbs.filter(p => p.status === 'resolved');
            const probRate = empProbs.length > 0 ? Math.round((probsResolved.length / empProbs.length) * 100) : 100;

            // 3. Fetch To-Do Items
            const allTodos = (typeof DB !== 'undefined' && DB.get('todos')) || empUser.todos || [];
            const empTodos = (Array.isArray(allTodos) ? allTodos : []).filter(t => (t.username === username || t.userId === username || !t.username) && isAfterStart(t.createdAt || t.date));
            const todosCompleted = empTodos.filter(t => t.status === 'completed' || t.done);
            const todoRate = empTodos.length > 0 ? Math.round((todosCompleted.length / empTodos.length) * 100) : 100;

            // 4. Fetch Material Requisitions
            const allReqs = (typeof DB !== 'undefined' && DB.get('materialRequests')) || [];
            const empReqs = allReqs.filter(r => (r.createdBy === username || r.createdByName === empUser.fullName) && isAfterStart(r.createdAt));

            // 5. Fetch Quarterly Priorities / Goals
            const allQP = (typeof DB !== 'undefined' && DB.get('quarterly_priorities')) || [];
            const empQP = allQP.filter(q => q.memberUsername === username || q.createdBy === username);

            // 6. Fetch Checklists & Detailed Points
            const checklistPoints = [];
            const checklistSummaries = [];

            // A. Admin Checklists
            const adminCLs = (typeof DB !== 'undefined' && DB.get('adminChecklists')) || [];
            adminCLs.forEach(cl => {
                if (cl.department && empUser.department && cl.department !== empUser.department && cl.assignedUser !== username) return;
                const items = cl.items || cl.points || [];
                let filledCount = 0;
                items.forEach(pt => {
                    const isFilled = pt.status === 'completed' || pt.status === 'done' || pt.done === true || Boolean(pt.value);
                    if (isFilled) filledCount++;
                    checklistPoints.push({
                        checklistTitle: cl.title || 'Admin Checklist',
                        category: 'Admin Checklist',
                        pointTitle: pt.task || pt.title || pt.name || 'Checklist Item',
                        status: isFilled ? 'FILLED' : 'PENDING',
                        valueNote: pt.value || pt.note || (isFilled ? 'Done' : 'Not filled'),
                        unit: pt.unit || '',
                        timestamp: pt.completedAt || pt.updatedAt || cl.updatedAt || cl.createdAt || '-'
                    });
                });
                checklistSummaries.push({
                    title: cl.title || 'Admin Checklist',
                    category: 'Admin Checklist',
                    totalPoints: items.length,
                    filledPoints: filledCount,
                    rate: items.length > 0 ? Math.round((filledCount / items.length) * 100) : 100
                });
            });

            // B. Departmental Checklists
            const deptCLs = (typeof DB !== 'undefined' && DB.get('departmental_checklists')) || [];
            deptCLs.filter(c => c.department === empUser.department || c.assignedTo === username).forEach(cl => {
                const items = cl.items || cl.points || [];
                let filledCount = 0;
                items.forEach(pt => {
                    const isFilled = pt.status === 'completed' || pt.status === 'done' || pt.done === true || Boolean(pt.value);
                    if (isFilled) filledCount++;
                    checklistPoints.push({
                        checklistTitle: cl.title || 'Departmental Checklist',
                        category: 'Departmental Checklist',
                        pointTitle: pt.task || pt.title || pt.name || 'Checklist Item',
                        status: isFilled ? 'FILLED' : 'PENDING',
                        valueNote: pt.value || pt.note || (isFilled ? 'Done' : 'Not filled'),
                        unit: pt.unit || '',
                        timestamp: pt.completedAt || pt.updatedAt || cl.updatedAt || cl.createdAt || '-'
                    });
                });
                checklistSummaries.push({
                    title: cl.title || 'Departmental Checklist',
                    category: 'Departmental Checklist',
                    totalPoints: items.length,
                    filledPoints: filledCount,
                    rate: items.length > 0 ? Math.round((filledCount / items.length) * 100) : 100
                });
            });

            // C. Filled Checklist Entries (Log History)
            const clEntries = (typeof DB !== 'undefined' && DB.get('checklist_entries')) || [];
            clEntries.filter(e => (e.filledBy === username || e.filledByName === empUser.fullName || e.username === username) && isAfterStart(e.filledAt || e.createdAt)).forEach(e => {
                const items = e.items || e.answers || [];
                items.forEach(pt => {
                    const isFilled = pt.status === 'completed' || pt.status === 'done' || pt.done === true || Boolean(pt.value);
                    checklistPoints.push({
                        checklistTitle: e.checklistTitle || e.title || 'Checklist Log',
                        category: 'Checklist Log Entry',
                        pointTitle: pt.task || pt.title || pt.name || pt.question || 'Point',
                        status: isFilled ? 'FILLED' : 'PENDING',
                        valueNote: pt.value || pt.note || pt.answer || (isFilled ? 'Filled' : 'Pending'),
                        unit: pt.unit || '',
                        timestamp: e.filledAt || e.createdAt || '-'
                    });
                });
            });

            // D. Room Checklists
            const roomCLs = (typeof DB !== 'undefined' && DB.get('roomChecklists')) || [];
            roomCLs.filter(r => (r.assignedStaff === username || r.cleanedBy === username || r.staffName === empUser.fullName) && isAfterStart(r.cleanedAt || r.createdAt)).forEach(r => {
                const items = r.items || r.tasks || [];
                let filledCount = 0;
                items.forEach(pt => {
                    const isFilled = pt.status === 'completed' || pt.status === 'done' || pt.done === true;
                    if (isFilled) filledCount++;
                    checklistPoints.push({
                        checklistTitle: `Room ${r.roomNo || r.roomId || ''} Cleaning Checklist`,
                        category: 'Room Cleaning',
                        pointTitle: pt.task || pt.title || 'Cleaning Point',
                        status: isFilled ? 'FILLED' : 'PENDING',
                        valueNote: isFilled ? 'Cleaned & Verified' : 'Pending cleaning',
                        unit: '',
                        timestamp: r.cleanedAt || r.updatedAt || r.createdAt || '-'
                    });
                });
                checklistSummaries.push({
                    title: `Room ${r.roomNo || r.roomId || ''} Cleaning`,
                    category: 'Room Cleaning',
                    totalPoints: items.length,
                    filledPoints: filledCount,
                    rate: items.length > 0 ? Math.round((filledCount / items.length) * 100) : 100
                });
            });

            const totalCLPoints = checklistPoints.length;
            const filledCLPoints = checklistPoints.filter(p => p.status === 'FILLED').length;
            const checklistFillRate = totalCLPoints > 0 ? Math.round((filledCLPoints / totalCLPoints) * 100) : 100;

            // Overall KPI Composite Score (weighted score out of 100)
            const overallScore = Math.round(
                (taskRate * 0.40) +
                (checklistFillRate * 0.30) +
                (probRate * 0.15) +
                (todoRate * 0.15)
            );

            return {
                user: empUser,
                period: period,
                generatedAt: new Date().toISOString(),
                stats: {
                    overallScore,
                    tasksTotal: empTasks.length,
                    tasksCompleted: tasksCompleted.length,
                    taskRate,
                    probsTotal: empProbs.length,
                    probsResolved: probsResolved.length,
                    probRate,
                    todosTotal: empTodos.length,
                    todosCompleted: todosCompleted.length,
                    todoRate,
                    reqsTotal: empReqs.length,
                    qpTotal: empQP.length,
                    totalCLPoints,
                    filledCLPoints,
                    checklistFillRate
                },
                tasks: empTasks,
                probs: empProbs,
                todos: empTodos,
                reqs: empReqs,
                qp: empQP,
                checklistSummaries,
                checklistPoints
            };
        },

        openModal(targetUsername, periodFilter) {
            const data = this.getEmployeeData(targetUsername, periodFilter);

            let existingModal = document.getElementById('empWorkReportModal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.id = 'empWorkReportModal';
            modal.className = 'modal active';
            modal.style.zIndex = '1100';

            const periodOptions = [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' }
            ].map(p => `<option value="${p.id}" ${p.id === (periodFilter || 'all') ? 'selected' : ''}>${p.label}</option>`).join('');

            modal.innerHTML = `
                <div class="modal-content modal-lg" style="max-width:920px;max-height:90vh;display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:12px;">
                    <!-- Modal Header -->
                    <div style="background:linear-gradient(135deg, #1a73e8, #1557b0);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div>
                            <div style="font-size:18px;font-weight:700;">📄 Employee Work Performance & Checklist Report</div>
                            <div style="font-size:12px;opacity:0.9;margin-top:2px;">Employee: <strong>${data.user.fullName}</strong> (${data.user.username}) · Dept: <strong>${data.user.department || 'General'}</strong></div>
                        </div>
                        <button class="modal-close" style="color:#fff;font-size:24px;" onclick="document.getElementById('empWorkReportModal').remove()">&times;</button>
                    </div>

                    <!-- Filter Controls & Action Bar -->
                    <div style="background:#f8f9fa;padding:12px 20px;border-bottom:1px solid #dadce0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <label style="font-size:13px;font-weight:600;margin:0;">Time Period:</label>
                            <select id="empReportPeriodSelect" class="form-control" style="width:auto;font-size:13px;padding:4px 8px;min-height:34px;" onchange="EmpWorkReport.openModal('${data.user.username}', this.value)">
                                ${periodOptions}
                            </select>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button class="btn btn-sm" style="background:#1e7e34;color:#fff;" onclick="EmpWorkReport.exportExcel('${data.user.username}', '${data.period}')">📊 Export Excel</button>
                            <button class="btn btn-sm" style="background:#c82333;color:#fff;" onclick="EmpWorkReport.exportPDF('${data.user.username}', '${data.period}')">📄 Export PDF</button>
                            <button class="btn btn-sm btn-secondary" onclick="EmpWorkReport.print('${data.user.username}', '${data.period}')">🖨️ Print</button>
                        </div>
                    </div>

                    <!-- Modal Body Printable Container -->
                    <div id="empWorkReportPrintBody" style="padding:20px;overflow-y:auto;flex:1;">
                        <!-- KPI Score Cards -->
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;margin-bottom:20px;">
                            <div style="background:#e8f0fe;border:1px solid #c2d7f8;border-left:4px solid #1a73e8;border-radius:8px;padding:12px;text-align:center;">
                                <div style="font-size:24px;font-weight:800;color:#1a73e8;">${data.stats.overallScore}%</div>
                                <div style="font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;">Overall Work Score</div>
                            </div>
                            <div style="background:#e6f4ea;border:1px solid #b7e1cd;border-left:4px solid #34a853;border-radius:8px;padding:12px;text-align:center;">
                                <div style="font-size:22px;font-weight:700;color:#34a853;">${data.stats.tasksCompleted} / ${data.stats.tasksTotal}</div>
                                <div style="font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;">Tasks (${data.stats.taskRate}%)</div>
                            </div>
                            <div style="background:#fef7e0;border:1px solid #fce8b2;border-left:4px solid #fbbc04;border-radius:8px;padding:12px;text-align:center;">
                                <div style="font-size:22px;font-weight:700;color:#e37400;">${data.stats.filledCLPoints} / ${data.stats.totalCLPoints}</div>
                                <div style="font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;">Checklist Points (${data.stats.checklistFillRate}%)</div>
                            </div>
                            <div style="background:#fce8e6;border:1px solid #f5c6c2;border-left:4px solid #ea4335;border-radius:8px;padding:12px;text-align:center;">
                                <div style="font-size:22px;font-weight:700;color:#ea4335;">${data.stats.probsResolved} / ${data.stats.probsTotal}</div>
                                <div style="font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;">Problems (${data.stats.probRate}%)</div>
                            </div>
                            <div style="background:#f3e8ff;border:1px solid #e9d5ff;border-left:4px solid #7e22ce;border-radius:8px;padding:12px;text-align:center;">
                                <div style="font-size:22px;font-weight:700;color:#7e22ce;">${data.stats.todosCompleted} / ${data.stats.todosTotal}</div>
                                <div style="font-size:11px;font-weight:600;color:#5f6368;text-transform:uppercase;">To-Do Items (${data.stats.todoRate}%)</div>
                            </div>
                        </div>

                        <!-- 1. CHECKLIST DETAILED BREAKDOWN WITH ALL POINTS & FILL STATUS -->
                        <div class="card" style="padding:16px;margin-bottom:20px;border-top:3px solid #fbbc04;">
                            <div style="font-size:15px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                                <span>📑 Checklist Detailed Points & Fill Status (${data.stats.filledCLPoints}/${data.stats.totalCLPoints} Filled)</span>
                                <span class="badge ${data.stats.checklistFillRate >= 80 ? 'badge-success' : 'badge-warning'}">${data.stats.checklistFillRate}% Filled</span>
                            </div>
                            ${data.checklistPoints.length === 0 ? '<div class="empty-state">No checklist points found for this period.</div>' : `
                                <div class="table-responsive">
                                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                        <thead>
                                            <tr style="background:#f8f9fa;">
                                                <th style="padding:8px 10px;">Checklist / Source</th>
                                                <th style="padding:8px 10px;">Point / Item Description</th>
                                                <th style="padding:8px 10px;text-align:center;">Fill Status</th>
                                                <th style="padding:8px 10px;">Filled Value / Note</th>
                                                <th style="padding:8px 10px;text-align:right;">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.checklistPoints.map(pt => `
                                                <tr style="border-bottom:1px solid #dadce0;">
                                                    <td style="padding:8px 10px;font-weight:600;">${pt.checklistTitle} <div style="font-size:10px;color:var(--gray);font-weight:normal;">${pt.category}</div></td>
                                                    <td style="padding:8px 10px;">${pt.pointTitle}</td>
                                                    <td style="padding:8px 10px;text-align:center;">
                                                        <span class="badge ${pt.status === 'FILLED' ? 'badge-success' : 'badge-warning'}" style="font-size:10px;padding:3px 8px;">
                                                            ${pt.status === 'FILLED' ? '✅ FILLED' : '⏳ PENDING'}
                                                        </span>
                                                    </td>
                                                    <td style="padding:8px 10px;font-size:12px;">${pt.valueNote || '-'}</td>
                                                    <td style="padding:8px 10px;text-align:right;font-size:11px;color:var(--gray);">${pt.timestamp !== '-' ? (typeof APP !== 'undefined' ? APP.formatDate(pt.timestamp) : pt.timestamp) : '-'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

                        <!-- 2. TASKS & WORK ASSIGNMENTS -->
                        <div class="card" style="padding:16px;margin-bottom:20px;border-top:3px solid #1a73e8;">
                            <div style="font-size:15px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                                <span>📋 Assigned & Completed Tasks (${data.stats.tasksCompleted}/${data.stats.tasksTotal})</span>
                                <span class="badge ${data.stats.taskRate >= 80 ? 'badge-success' : 'badge-info'}">${data.stats.taskRate}% Rate</span>
                            </div>
                            ${data.tasks.length === 0 ? '<div class="empty-state">No tasks assigned or created.</div>' : `
                                <div class="table-responsive">
                                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                        <thead>
                                            <tr style="background:#f8f9fa;">
                                                <th style="padding:8px 10px;">Task Title</th>
                                                <th style="padding:8px 10px;text-align:center;">Priority</th>
                                                <th style="padding:8px 10px;text-align:center;">Status</th>
                                                <th style="padding:8px 10px;">Deadline</th>
                                                <th style="padding:8px 10px;text-align:right;">Assigned / Created By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.tasks.map(t => `
                                                <tr style="border-bottom:1px solid #dadce0;">
                                                    <td style="padding:8px 10px;font-weight:600;">${t.title || 'Task'} ${t.description ? `<div style="font-size:11px;color:var(--gray);font-weight:normal;">${t.description.substring(0, 90)}</div>` : ''}</td>
                                                    <td style="padding:8px 10px;text-align:center;">
                                                        <span class="badge ${t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info'}" style="font-size:10px;">${(t.priority || 'normal').toUpperCase()}</span>
                                                    </td>
                                                    <td style="padding:8px 10px;text-align:center;">
                                                        <span class="badge ${t.status === 'completed' ? 'badge-success' : t.status === 'in-progress' ? 'badge-info' : 'badge-warning'}" style="font-size:10px;">${(t.status || 'pending').toUpperCase()}</span>
                                                    </td>
                                                    <td style="padding:8px 10px;font-size:12px;">${t.deadline ? (typeof APP !== 'undefined' ? APP.formatDate(t.deadline) : t.deadline) : '-'}</td>
                                                    <td style="padding:8px 10px;text-align:right;font-size:12px;color:var(--gray);">${t.createdBy || 'System'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

                        <!-- 3. PROBLEMS & SUPPORT TICKETS -->
                        <div class="card" style="padding:16px;margin-bottom:20px;border-top:3px solid #ea4335;">
                            <div style="font-size:15px;font-weight:700;margin-bottom:12px;">🔧 Problems & Support Issues (${data.stats.probsResolved}/${data.stats.probsTotal})</div>
                            ${data.probs.length === 0 ? '<div class="empty-state">No problems logged or assigned.</div>' : `
                                <div class="table-responsive">
                                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                        <thead>
                                            <tr style="background:#f8f9fa;">
                                                <th style="padding:8px 10px;">Issue Title</th>
                                                <th style="padding:8px 10px;">Category</th>
                                                <th style="padding:8px 10px;text-align:center;">Status</th>
                                                <th style="padding:8px 10px;text-align:right;">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.probs.map(p => `
                                                <tr style="border-bottom:1px solid #dadce0;">
                                                    <td style="padding:8px 10px;font-weight:600;">${p.title || 'Issue'}</td>
                                                    <td style="padding:8px 10px;font-size:12px;">${p.category || 'General'}</td>
                                                    <td style="padding:8px 10px;text-align:center;">
                                                        <span class="badge ${p.status === 'resolved' ? 'badge-success' : 'badge-danger'}" style="font-size:10px;">${(p.status || 'open').toUpperCase()}</span>
                                                    </td>
                                                    <td style="padding:8px 10px;text-align:right;font-size:12px;color:var(--gray);">${p.createdAt ? (typeof APP !== 'undefined' ? APP.formatDate(p.createdAt) : p.createdAt) : '-'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

                        <!-- 4. TO-DO ITEMS & MATERIAL REQUISITIONS -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="card" style="padding:16px;margin:0;border-top:3px solid #7e22ce;">
                                <div style="font-size:14px;font-weight:700;margin-bottom:10px;">✅ Personal & Assigned To-Do Items (${data.stats.todosCompleted}/${data.stats.todosTotal})</div>
                                ${data.todos.length === 0 ? '<div style="font-size:12px;color:var(--gray);text-align:center;padding:10px;">No to-do items.</div>' : `
                                    <ul style="list-style:none;padding:0;margin:0;">
                                        ${data.todos.map(t => `
                                            <li style="padding:6px 0;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;font-size:12px;">
                                                <span>${t.status === 'completed' || t.done ? '✅' : '⭕'} <strong>${t.title || t.text || 'Item'}</strong></span>
                                                <span class="badge ${t.status === 'completed' || t.done ? 'badge-success' : 'badge-warning'}" style="font-size:9px;">${t.status || 'pending'}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                `}
                            </div>
                            <div class="card" style="padding:16px;margin:0;border-top:3px solid #34a853;">
                                <div style="font-size:14px;font-weight:700;margin-bottom:10px;">📦 Material Requisitions (${data.stats.reqsTotal})</div>
                                ${data.reqs.length === 0 ? '<div style="font-size:12px;color:var(--gray);text-align:center;padding:10px;">No material requisitions.</div>' : `
                                    <ul style="list-style:none;padding:0;margin:0;">
                                        ${data.reqs.map(r => `
                                            <li style="padding:6px 0;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;font-size:12px;">
                                                <span>📦 <strong>${r.title || 'Requisition'}</strong></span>
                                                <span class="badge badge-info" style="font-size:9px;">${r.status || 'pending'}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div style="background:#f8f9fa;padding:12px 20px;border-top:1px solid #dadce0;display:flex;justify-content:flex-end;">
                        <button class="btn btn-secondary" onclick="document.getElementById('empWorkReportModal').remove()">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        },

        exportExcel(targetUsername, periodFilter) {
            if (typeof XLSX === 'undefined') {
                if (typeof APP !== 'undefined') APP.notify('Excel library not loaded', 'error');
                return;
            }

            const data = this.getEmployeeData(targetUsername, periodFilter);
            const wb = XLSX.utils.book_new();

            // Sheet 1: Employee KPI Summary
            const kpiRows = [
                ['EMPLOYEE WORK PERFORMANCE & CHECKLIST REPORT'],
                ['Employee Name', data.user.fullName],
                ['Username', data.user.username],
                ['Department', data.user.department || 'General'],
                ['Role', data.user.role || 'Employee'],
                ['Report Period', data.period.toUpperCase()],
                ['Generated Date', new Date().toLocaleString('en-IN')],
                [''],
                ['KPI METRIC', 'COMPLETED / FILLED', 'TOTAL', 'COMPLETION RATE'],
                ['Overall Work Score', '-', '-', data.stats.overallScore + '%'],
                ['Tasks Completed', data.stats.tasksCompleted, data.stats.tasksTotal, data.stats.taskRate + '%'],
                ['Checklist Points Filled', data.stats.filledCLPoints, data.stats.totalCLPoints, data.stats.checklistFillRate + '%'],
                ['Problems Resolved', data.stats.probsResolved, data.stats.probsTotal, data.stats.probRate + '%'],
                ['To-Do Items Completed', data.stats.todosCompleted, data.stats.todosTotal, data.stats.todoRate + '%'],
                ['Material Requisitions', data.stats.reqsTotal, data.stats.reqsTotal, '-']
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'KPI Overview');

            // Sheet 2: Detailed Checklist Points & Fill Status
            const clRows = [['Checklist Title', 'Category', 'Point / Item Description', 'Fill Status', 'Filled Value / Note', 'Timestamp']];
            data.checklistPoints.forEach(pt => {
                clRows.push([
                    pt.checklistTitle,
                    pt.category,
                    pt.pointTitle,
                    pt.status,
                    pt.valueNote,
                    pt.timestamp
                ]);
            });
            if (data.checklistPoints.length === 0) clRows.push(['No checklist points found', '-', '-', '-', '-', '-']);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clRows), 'Checklist Points');

            // Sheet 3: Tasks Breakdown
            const taskRows = [['Task Title', 'Description', 'Priority', 'Status', 'Deadline', 'Created By']];
            data.tasks.forEach(t => {
                taskRows.push([
                    t.title || 'Task',
                    t.description || '',
                    (t.priority || 'normal').toUpperCase(),
                    (t.status || 'pending').toUpperCase(),
                    t.deadline || '-',
                    t.createdBy || 'System'
                ]);
            });
            if (data.tasks.length === 0) taskRows.push(['No tasks found', '-', '-', '-', '-', '-']);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(taskRows), 'Tasks');

            // Sheet 4: Problems & Tickets
            const probRows = [['Title', 'Category', 'Priority', 'Status', 'Created Date']];
            data.probs.forEach(p => {
                probRows.push([
                    p.title || 'Issue',
                    p.category || 'General',
                    (p.priority || 'medium').toUpperCase(),
                    (p.status || 'open').toUpperCase(),
                    p.createdAt || '-'
                ]);
            });
            if (data.probs.length === 0) probRows.push(['No problems found', '-', '-', '-', '-']);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(probRows), 'Problems');

            // Sheet 5: To-Do Items
            const todoRows = [['Description', 'Priority', 'Status', 'Completed Date']];
            data.todos.forEach(t => {
                todoRows.push([
                    t.title || t.text || 'Item',
                    (t.priority || 'normal').toUpperCase(),
                    (t.status || 'pending').toUpperCase(),
                    t.completedAt || '-'
                ]);
            });
            if (data.todos.length === 0) todoRows.push(['No to-do items found', '-', '-', '-']);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(todoRows), 'To-Do Items');

            const fileName = `Work_Report_${data.user.username}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            if (typeof APP !== 'undefined') APP.notify('Excel Work Report downloaded successfully!', 'success');
        },

        exportPDF(targetUsername, periodFilter) {
            const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
            if (!jsPDF) {
                if (typeof APP !== 'undefined') APP.notify('PDF library not loaded', 'error');
                return;
            }

            const data = this.getEmployeeData(targetUsername, periodFilter);
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageW = doc.internal.pageSize.getWidth();

            // Header Banner
            doc.setFillColor(26, 115, 232);
            doc.rect(0, 0, pageW, 26, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.setFont(undefined, 'bold');
            doc.text('STAVYA INTELLIGENCE — WORK PERFORMANCE REPORT', 14, 12);
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text(`Employee: ${data.user.fullName} (${data.user.username}) | Dept: ${data.user.department || 'General'} | Period: ${data.period.toUpperCase()}`, 14, 20);

            let startY = 32;

            // KPI Table Summary
            doc.setFontSize(11);
            doc.setTextColor(26, 115, 232);
            doc.setFont(undefined, 'bold');
            doc.text('1. KPI Performance Overview (Overall Score: ' + data.stats.overallScore + '%)', 14, startY);
            startY += 4;

            doc.autoTable({
                head: [['KPI Metric', 'Completed / Filled', 'Total Count', 'Compliance Rate %']],
                body: [
                    ['Overall Work Score', '-', '-', data.stats.overallScore + '%'],
                    ['Task Completion', data.stats.tasksCompleted, data.stats.tasksTotal, data.stats.taskRate + '%'],
                    ['Checklist Points Filled', data.stats.filledCLPoints, data.stats.totalCLPoints, data.stats.checklistFillRate + '%'],
                    ['Problem Resolution', data.stats.probsResolved, data.stats.probsTotal, data.stats.probRate + '%'],
                    ['To-Do Completion', data.stats.todosCompleted, data.stats.todosTotal, data.stats.todoRate + '%']
                ],
                startY: startY,
                styles: { fontSize: 8, cellPadding: 2.5 },
                headStyles: { fillColor: [26, 115, 232], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 248, 255] }
            });
            startY = doc.lastAutoTable.finalY + 8;

            // Checklist Points Table
            doc.setFontSize(11);
            doc.setTextColor(26, 115, 232);
            doc.setFont(undefined, 'bold');
            doc.text('2. Detailed Checklist Points & Fill Status (' + data.stats.filledCLPoints + '/' + data.stats.totalCLPoints + ' Filled)', 14, startY);
            startY += 4;

            const clBody = data.checklistPoints.length > 0
                ? data.checklistPoints.map(pt => [pt.checklistTitle, pt.pointTitle, pt.status, pt.valueNote || '-', pt.timestamp !== '-' ? pt.timestamp.slice(0, 10) : '-'])
                : [['(No checklist points logged for this period)', '-', '-', '-', '-']];

            doc.autoTable({
                head: [['Checklist Title', 'Point Description', 'Fill Status', 'Filled Value / Note', 'Date']],
                body: clBody,
                startY: startY,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [251, 188, 4], textColor: 0, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [254, 252, 240] },
                didParseCell: function(dataCell) {
                    if (dataCell.section === 'body' && dataCell.column.index === 2) {
                        if (dataCell.cell.raw === 'FILLED') {
                            dataCell.cell.styles.textColor = [46, 125, 50];
                            dataCell.cell.styles.fontStyle = 'bold';
                        } else if (dataCell.cell.raw === 'PENDING') {
                            dataCell.cell.styles.textColor = [230, 81, 0];
                        }
                    }
                }
            });
            startY = doc.lastAutoTable.finalY + 8;

            // Tasks Table
            if (startY > 230) { doc.addPage(); startY = 20; }
            doc.setFontSize(11);
            doc.setTextColor(26, 115, 232);
            doc.setFont(undefined, 'bold');
            doc.text('3. Assigned & Completed Tasks (' + data.stats.tasksCompleted + '/' + data.stats.tasksTotal + ')', 14, startY);
            startY += 4;

            const taskBody = data.tasks.length > 0
                ? data.tasks.map(t => [t.title || 'Task', (t.priority || 'normal').toUpperCase(), (t.status || 'pending').toUpperCase(), t.deadline || '-', t.createdBy || 'System'])
                : [['(No tasks assigned for this period)', '-', '-', '-', '-']];

            doc.autoTable({
                head: [['Task Title', 'Priority', 'Status', 'Deadline', 'Assigned By']],
                body: taskBody,
                startY: startY,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [26, 115, 232], textColor: 255, fontStyle: 'bold' }
            });
            startY = doc.lastAutoTable.finalY + 8;

            // Page numbers footer
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${totalPages} — Stavya Intelligence HMS Confidential Report`, 14, doc.internal.pageSize.getHeight() - 8);
            }

            const fileName = `Work_Report_${data.user.username}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
            if (typeof APP !== 'undefined') APP.notify('PDF Work Report downloaded successfully!', 'success');
        },

        print(targetUsername, periodFilter) {
            this.openModal(targetUsername, periodFilter);
            setTimeout(() => {
                const printContent = document.getElementById('empWorkReportPrintBody');
                if (!printContent) return;
                const win = window.open('', '', 'width=900,height=700');
                win.document.write(`
                    <html>
                        <head>
                            <title>Work Report - ${targetUsername || 'Employee'}</title>
                            <style>
                                body { font-family: sans-serif; padding: 20px; color: #202124; }
                                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                                th, td { padding: 8px 10px; border: 1px solid #dadce0; font-size: 12px; text-align: left; }
                                th { background: #f8f9fa; }
                                .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                                .badge-success { background: #e6f4ea; color: #34a853; }
                                .badge-warning { background: #fef7e0; color: #e37400; }
                                .card { border: 1px solid #dadce0; padding: 12px; margin-bottom: 16px; border-radius: 8px; }
                            </style>
                        </head>
                        <body>
                            ${printContent.innerHTML}
                        </body>
                    </html>
                `);
                win.document.close();
                win.focus();
                win.print();
                win.close();
            }, 300);
        }
    };

    window.EmpWorkReport = EmpWorkReport;
})();
