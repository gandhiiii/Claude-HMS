function renderTasks(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="taskSearch" placeholder="${T('taskmod_search_placeholder')}" oninput="renderTaskList()">
            </div>
            <button class="btn btn-primary" onclick="showTaskForm()">${T('taskmod_assign_btn')}</button>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTaskTab('all',this)">${T('taskmod_tab_all')}</button>
            <button class="tab-btn" onclick="switchTaskTab('pending',this)">${T('taskmod_status_pending')}</button>
            <button class="tab-btn" onclick="switchTaskTab('in-progress',this)">${T('taskmod_status_inprogress')}</button>
            <button class="tab-btn" onclick="switchTaskTab('completed',this)">${T('taskmod_status_completed')}</button>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>${T('taskmod_th_title')}</th><th>${T('taskmod_th_assigned')}</th><th>${T('taskmod_th_department')}</th>
                        <th>${T('taskmod_th_deadline')}</th><th>${T('taskmod_th_priority')}</th><th>${T('taskmod_th_status')}</th><th>${T('taskmod_th_actions')}</th>
                    </tr></thead>
                    <tbody id="taskTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderTaskList();
}

let taskFilter = 'all';

function taskPriorityLabel(p) {
    var m = { low: T('taskmod_priority_low'), medium: T('taskmod_priority_medium'), high: T('taskmod_priority_high') };
    return m[p] || m.low;
}

function taskStatusLabel(s) {
    var m = { pending: T('taskmod_status_pending'), 'in-progress': T('taskmod_status_inprogress'), completed: T('taskmod_status_completed') };
    return m[s] || m.pending;
}

function switchTaskTab(filter, btn) {
    taskFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTaskList();
}

function renderTaskList() {
    const user = AUTH.currentUser();
    // Merge admin tasks + HOD tasks so all roles see complete picture
    const adminTasks = (DB.get('tasks') || []).map(t => Object.assign({}, t, {_store: 'tasks'}));
    const hodTaskItems = (DB.get('hodTasks') || []).map(t => Object.assign({}, t, {_store: 'hodTasks'}));
    const allTasks = adminTasks.concat(hodTaskItems);
    const search = (document.getElementById('taskSearch')?.value || '').toLowerCase();
    let filtered = allTasks.filter(t => {
        if (!user || user.isSuperAdmin || user.role === 'admin') return true;
        if (user.role === 'hod') return t.department === user.department;
        // Employee: match by fullName, username, or if no assignee, by department
        return t.assignedTo === user.fullName || t.assignedTo === user.username ||
               t.createdBy === user.username;
    });
    filtered = filtered.filter(t =>
        (t.title || '').toLowerCase().includes(search) ||
        (t.assignedTo || '').toLowerCase().includes(search)
    );
    if (taskFilter !== 'all') filtered = filtered.filter(t => t.status === taskFilter);

    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    const isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    tbody.innerHTML = filtered.slice().reverse().map(t => `
        <tr>
            <td><strong>${t.title}</strong>${t._store === 'hodTasks' ? ' <span class="badge badge-info" style="font-size:10px;">' + T('taskmod_badge_hod') + '</span>' : ''}</td>
            <td>${t.assignedTo || '-'}</td>
            <td>${t.department || '-'}</td>
            <td>${t.deadline ? APP.formatDate(t.deadline) : '-'}
                ${t.deadline && t.status !== 'completed' && APP.daysBetween(new Date().toISOString(), t.deadline) < 0 ? ' ' + T('taskmod_overdue_label') : ''}
            </td>
            <td><span class="badge ${t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${taskPriorityLabel(t.priority)}</span></td>
            <td><span class="badge ${APP.getStatusBadge(t.status)}">${taskStatusLabel(t.status)}</span></td>
            <td>
                ${isAdmin || user.role === 'hod' ? `<button class="btn btn-sm btn-primary" onclick="editTask('${t.id}','${t._store}')">${T('taskmod_btn_edit')}</button>` : ''}
                <button class="btn btn-sm btn-success" onclick="updateTaskStatus('${t.id}','${t._store}')">${T('taskmod_btn_next')}</button>
                ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}','${t._store}')">${T('taskmod_btn_del')}</button>` : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty-state">' + T('taskmod_no_tasks') + '</td></tr>';
}

function showTaskForm(task) {
    const user = AUTH.currentUser();
    const users = DB.get('users') || [];
    const depts = DB.get('departments') || [];
    const isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    // Only include users with a valid fullName and exclude admin/super_admin roles
    let assignableUsers = users.filter(u => u && u.fullName && u.role !== 'admin' && u.role !== 'super_admin');
    if (user.role === 'hod') {
        assignableUsers = assignableUsers.filter(u => u.department === user.department);
        if (task) {
            const already = assignableUsers.some(u => u.fullName === task.assignedTo);
            if (!already) assignableUsers = assignableUsers.concat(users.filter(u => u.fullName === task.assignedTo));
        }
    } else if (!isAdmin) {
        // employees can only assign to themselves
        assignableUsers = [user];
    }
    const deptValue = task?.department || (isAdmin ? '' : (user.department || ''));
    const deptField = isAdmin
        ? `<select name="department" class="form-control">
                <option value="">${T('taskmod_opt_select')}</option>
                ${depts.map(d => `<option value="${d.name}" ${deptValue === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
           </select>`
        : `<input type="text" name="department" class="form-control" value="${deptValue}" readonly style="background:var(--light-gray);">`;
    const form = `
        <form id="taskForm">
            <input type="hidden" name="id" value="${task?.id || ''}">
            <input type="hidden" name="_store" value="${task?._store || 'tasks'}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('taskmod_label_title')} *</label>
                    <input type="text" name="title" class="form-control" value="${task?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('taskmod_th_assigned')} *</label>
                    <select name="assignedTo" class="form-control" required>
                        <option value="">${T('taskmod_opt_select_employee')}</option>
                        ${assignableUsers.map(u =>
                            `<option value="${u.fullName}" ${(task?.assignedTo === u.fullName || (!task && !isAdmin && u.username === user.username)) ? 'selected' : ''}>${u.fullName} (${u.role})</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('taskmod_th_department')}</label>
                    ${deptField}
                </div>
                <div class="form-group">
                    <label>${T('taskmod_th_deadline')}</label>
                    <input type="date" name="deadline" class="form-control" value="${task?.deadline ? task.deadline.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label>${T('taskmod_th_priority')}</label>
                    <select name="priority" class="form-control">
                        <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>${T('taskmod_priority_low')}</option>
                        <option value="medium" ${task?.priority === 'medium' || !task ? 'selected' : ''}>${T('taskmod_priority_medium')}</option>
                        <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>${T('taskmod_priority_high')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('taskmod_th_status')}</label>
                    <select name="status" class="form-control">
                        <option value="pending" ${task?.status === 'pending' || !task ? 'selected' : ''}>${T('taskmod_status_pending')}</option>
                        <option value="in-progress" ${task?.status === 'in-progress' ? 'selected' : ''}>${T('taskmod_status_inprogress')}</option>
                        <option value="completed" ${task?.status === 'completed' ? 'selected' : ''}>${T('taskmod_status_completed')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${T('taskmod_label_description')}</label>
                <textarea name="description" class="form-control" rows="3">${task?.description || ''}</textarea>
            </div>
        </form>
    `;
    openFormModal(task ? T('taskmod_modal_edit_task') : T('taskmod_modal_new_task'), form, `saveTask()`);
}

function saveTask() {
    const user = AUTH.currentUser();
    const data = getFormData('taskForm');
    if (!data.title || !data.assignedTo) {
        APP.notify(T('taskmod_msg_title_assignee_required'), 'error'); return;
    }
    const store = data._store || 'tasks';
    delete data._store; // don't persist UI metadata
    if (!data.id) {
        data.createdBy = user.username;
        data.createdByName = user.fullName;
        if (!data.department) data.department = user.department || '';
    }
    if (data.id) {
        DB.update(store, data.id, data);
        APP.notify(T('taskmod_msg_task_updated'), 'success');
    } else {
        DB.add('tasks', data);
        APP.notify(T('taskmod_msg_task_assigned'), 'success');
    }
    renderTaskList();
}

function editTask(id, store) {
    var s = store || 'tasks';
    var task = DB.getById(s, id) || DB.getById('tasks', id) || DB.getById('hodTasks', id);
    if (task) showTaskForm(Object.assign({}, task, {_store: s}));
}

function deleteTask(id, store) {
    confirmAction(T('taskmod_confirm_delete_task'), () => {
        var s = store || (DB.getById('tasks', id) ? 'tasks' : 'hodTasks');
        DB.delete(s, id);
        APP.notify(T('taskmod_msg_task_deleted'), 'success');
        renderTaskList();
    });
}

function updateTaskStatus(id, store) {
    var s = store || (DB.getById('tasks', id) ? 'tasks' : (DB.getById('hodTasks', id) ? 'hodTasks' : null));
    if (!s) { APP.notify(T('taskmod_msg_task_not_found'), 'error'); return; }
    const task = DB.getById(s, id);
    if (!task) { APP.notify(T('taskmod_msg_task_not_found'), 'error'); return; }
    const statusFlow = { 'pending': 'in-progress', 'in-progress': 'completed', 'completed': 'pending' };
    const newStatus = statusFlow[task.status] || 'pending';
    DB.update(s, id, { status: newStatus });
    APP.notify(T('taskmod_msg_task_status') + ' ' + taskStatusLabel(newStatus), 'info');
    renderTaskList();
}
