function renderComplaints(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="compSearch" placeholder="${T('cmpmod_search_placeholder')}" oninput="renderCompList()">
            </div>
            <button class="btn btn-primary" onclick="showCompForm()">${T('cmpmod_new_complaint_btn')}</button>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchCompTab('all',this)">${T('cmpmod_tab_all')}</button>
            <button class="tab-btn" onclick="switchCompTab('open',this)">${T('cmpmod_status_open')}</button>
            <button class="tab-btn" onclick="switchCompTab('in-progress',this)">${T('cmpmod_status_inprogress')}</button>
            <button class="tab-btn" onclick="switchCompTab('resolved',this)">${T('cmpmod_status_resolved')}</button>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>${T('cmpmod_th_id')}</th><th>${T('cmpmod_th_patient')}</th><th>${T('cmpmod_th_room')}</th><th>${T('cmpmod_th_category')}</th>
                        <th>${T('cmpmod_th_date')}</th><th>${T('cmpmod_th_priority')}</th><th>${T('cmpmod_th_status')}</th><th>${T('cmpmod_th_actions')}</th>
                    </tr></thead>
                    <tbody id="compTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderCompList();
}

let compFilter = 'all';

function cmpPriorityLabel(p) {
    var m = { low: T('cmpmod_priority_low'), medium: T('cmpmod_priority_medium'), high: T('cmpmod_priority_high') };
    return m[p] || m.low;
}

function cmpStatusLabel(s) {
    var m = { open: T('cmpmod_status_open'), 'in-progress': T('cmpmod_status_inprogress'), resolved: T('cmpmod_status_resolved') };
    return m[s] || m.open;
}

function switchCompTab(filter, btn) {
    compFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCompList();
}

function renderCompList() {
    const user = AUTH.currentUser();
    const complaints = DB.get('complaints');
    const search = (document.getElementById('compSearch')?.value || '').toLowerCase();
    let filtered = complaints.filter(c => {
        if (user.role === 'admin') return true;
        if (user.role === 'hod') return c.department === user.department;
        return c.createdBy === user.username;
    });
    filtered = filtered.filter(c =>
        c.patientName.toLowerCase().includes(search) ||
        c.category.toLowerCase().includes(search) ||
        c.roomNo.toLowerCase().includes(search)
    );
    if (compFilter !== 'all') filtered = filtered.filter(c => c.status === compFilter);

    const tbody = document.getElementById('compTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(c => `
        <tr>
            <td><strong>#${c.id.slice(-6)}</strong></td>
            <td>${c.patientName}</td>
            <td>${c.roomNo || '-'}</td>
            <td>${c.category}</td>
            <td>${APP.formatDate(c.createdAt)}</td>
            <td><span class="badge ${c.priority === 'high' ? 'badge-danger' : c.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${cmpPriorityLabel(c.priority)}</span></td>
            <td><span class="badge ${APP.getStatusBadge(c.status)}">${cmpStatusLabel(c.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewComp('${c.id}')">${T('cmpmod_btn_view')}</button>
                <button class="btn btn-sm btn-success" onclick="resolveComp('${c.id}')">${T('cmpmod_btn_resolve')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteComp('${c.id}')">${T('cmpmod_btn_del')}</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">' + T('cmpmod_no_complaints') + '</td></tr>';
}

function showCompForm() {
    const user = AUTH.currentUser();
    const form = `
        <form id="compForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('cmpmod_th_patient')} *</label>
                    <input type="text" name="patientName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('cmpmod_label_room')}</label>
                    <input type="text" name="roomNo" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('cmpmod_th_category')} *</label>
                    <select name="category" class="form-control" required>
                        <option value="">${T('cmpmod_cat_select')}</option>
                        <option value="Food">${T('cmpmod_cat_food')}</option>
                        <option value="Cleanliness">${T('cmpmod_cat_cleanliness')}</option>
                        <option value="Staff Behavior">${T('cmpmod_cat_staff_behavior')}</option>
                        <option value="Medical Care">${T('cmpmod_cat_medical_care')}</option>
                        <option value="Facilities">${T('cmpmod_cat_facilities')}</option>
                        <option value="Billing">${T('cmpmod_cat_billing')}</option>
                        <option value="Other">${T('cmpmod_cat_other')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('cmpmod_th_priority')}</label>
                    <select name="priority" class="form-control">
                        <option value="low">${T('cmpmod_priority_low')}</option>
                        <option value="medium" selected>${T('cmpmod_priority_medium')}</option>
                        <option value="high">${T('cmpmod_priority_high')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${T('cmpmod_label_department')}</label>
                ${(user.isSuperAdmin || user.role === 'admin')
                    ? deptDropdown('department', user.department)
                    : `<input type="text" name="department" class="form-control" value="${(user.department || '').replace(/"/g,'&quot;')}" readonly style="background:var(--light-gray);">`}
            </div>
            <div class="form-group">
                <label>${T('cmpmod_label_details')} *</label>
                <textarea name="description" class="form-control" rows="3" required></textarea>
            </div>
        </form>
    `;
    openFormModal(T('cmpmod_modal_new_complaint'), form, `saveComp()`);
}

function saveComp() {
    const data = getFormData('compForm');
    if (!data.patientName || !data.category || !data.description) {
        APP.notify(T('cmpmod_msg_fill_required'), 'error'); return;
    }
    const user = AUTH.currentUser();
    data.status = 'open';
    data.createdBy = user.username;
    data.createdByName = user.fullName;
    data.department = data.department || user.department || '';
    data.actionTaken = '';
    data.resolvedBy = '';
    data.resolvedAt = '';
    DB.add('complaints', data);
    APP.notify(T('cmpmod_msg_registered'), 'success');
    renderCompList();
}

function viewComp(id) {
    const c = DB.getById('complaints', id);
    if (!c) return;
    showModal(`
        <div class="modal-header">
            <h3>#${c.id.slice(-6)} - ${c.patientName}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>${T('cmpmod_th_category')}:</strong> ${c.category}</div>
            <div><strong>${T('cmpmod_detail_room')}:</strong> ${c.roomNo || '-'}</div>
            <div><strong>${T('cmpmod_th_priority')}:</strong> <span class="badge ${c.priority === 'high' ? 'badge-danger' : c.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${cmpPriorityLabel(c.priority)}</span></div>
            <div><strong>${T('cmpmod_th_status')}:</strong> <span class="badge ${APP.getStatusBadge(c.status)}">${cmpStatusLabel(c.status)}</span></div>
            <div><strong>${T('cmpmod_th_date')}:</strong> ${APP.formatDateTime(c.createdAt)}</div>
            <div><strong>${T('cmpmod_detail_resolved')}:</strong> ${c.resolvedAt ? APP.formatDateTime(c.resolvedAt) : '-'}</div>
        </div>
        <div class="mt-4"><strong>${T('cmpmod_detail_complaint')}:</strong><br>${c.description}</div>
        ${c.actionTaken ? `<div class="mt-4"><strong>${T('cmpmod_detail_action_taken')}:</strong><br>${c.actionTaken}</div>` : ''}
        ${c.status !== 'resolved' ? `
            <div class="mt-4">
                <h4>${T('cmpmod_heading_take_action')}</h4>
                <textarea id="actionText" class="form-control" rows="2" placeholder="${T('cmpmod_placeholder_action')}"></textarea>
                <button class="btn btn-success mt-2" onclick="resolveCompDirect('${id}')">${T('cmpmod_btn_mark_resolved')}</button>
            </div>
        ` : ''}
    `);
}

function resolveComp(id) {
    const c = DB.getById('complaints', id);
    if (!c || c.status === 'resolved') { APP.notify(T('cmpmod_msg_already_resolved'), 'info'); return; }
    const action = prompt(T('cmpmod_prompt_action_taken'));
    if (!action) return;
    const user = AUTH.currentUser();
    DB.update('complaints', id, {
        status: 'resolved',
        actionTaken: action,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify(T('cmpmod_msg_resolved'), 'success');
    renderCompList();
}

function resolveCompDirect(id) {
    const action = document.getElementById('actionText')?.value;
    if (!action) { APP.notify(T('cmpmod_msg_describe_action'), 'error'); return; }
    const user = AUTH.currentUser();
    DB.update('complaints', id, {
        status: 'resolved',
        actionTaken: action,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify(T('cmpmod_msg_resolved'), 'success');
    document.querySelector('.modal.active')?.remove();
    renderCompList();
}

function deleteComp(id) {
    confirmAction(T('cmpmod_confirm_delete'), () => {
        DB.delete('complaints', id);
        APP.notify(T('cmpmod_msg_deleted'), 'success');
        renderCompList();
    });
}
