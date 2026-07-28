const ALL_FEATURES = [
    'dashboard', 'users', 'departments', 'inventory', 'gate-security',
    'projects', 'ambulance', 'problems', 'tasks', 'complaints',
    'room-checklist', 'admissions', 'lost-found', 'checklists', 'admin-checklists'
];

function renderDepartments(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="deptSearch" placeholder="${T('deptmod_search_placeholder')}" oninput="renderDeptList()">
            </div>
            <button class="btn btn-primary" id="addDeptBtn">${T('deptmod_add_btn')}</button>
        </div>
        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr><th>${T('deptmod_th_code')}</th><th>${T('deptmod_th_name')}</th><th>${T('deptmod_th_head')}</th><th>${T('deptmod_th_feature_rights')}</th><th>${T('deptmod_th_status')}</th><th>${T('deptmod_th_actions')}</th></tr></thead>
                    <tbody id="deptTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('addDeptBtn').onclick = () => showDeptForm();
    container.onclick = function(e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn || btn.disabled) return;
        const tr = btn.closest('tr[data-dept-id]');
        if (!tr) return;
        const id = tr.dataset.deptId;
        const action = btn.dataset.action;
        if (action === 'edit') editDept(id);
        else if (action === 'toggle') toggleDept(id);
        else if (action === 'delete') deleteDept(id);
    };
    renderDeptList();
}

function renderDeptList() {
    let depts = DB.get('departments');
    let changed = false;
    const valid = depts.filter(d => d && d.name);
    if (valid.length !== depts.length) { depts = valid; changed = true; }
    depts.forEach((d, i) => {
        if (!d.id) { d.id = 'dept_' + (100 + i); changed = true; }
        if (!d.code) { d.code = (d.name || '').toUpperCase().replace(/\s+/g, '_').substring(0, 20); changed = true; }
    });
    if (changed) DB.set('departments', depts);
    const search = (document.getElementById('deptSearch')?.value || '').toLowerCase();
    const filtered = depts.filter(d => (d.name || '').toLowerCase().includes(search) || (d.code || '').toLowerCase().includes(search));
    const tbody = document.getElementById('deptTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(d => {
        const features = d.features || [];
        const count = features.length;
        const allEnabled = count === ALL_FEATURES.length;
        return `<tr data-dept-id="${d.id}">
            <td><strong>${d.code}</strong></td>
            <td>${d.name}</td>
            <td>${d.head || '-'}</td>
            <td>
                <span class="badge ${allEnabled ? 'badge-success' : count > 0 ? 'badge-info' : 'badge-danger'}">${count}/${ALL_FEATURES.length}</span>
                ${count > 0 ? `<span style="font-size:11px;color:var(--gray);display:block;">${features.map(f => f.replace('-',' ')).join(', ')}</span>` : ''}
            </td>
            <td><span class="badge ${d.active ? 'badge-success' : 'badge-danger'}">${d.active ? T('deptmod_active') : T('deptmod_inactive')}</span></td>
            <td class="dept-actions">
                <button class="btn btn-sm btn-primary" data-action="edit">${T('deptmod_edit_btn')}</button>
                <button class="btn btn-sm ${d.active ? 'btn-warning' : 'btn-success'}" data-action="toggle">${d.active ? T('deptmod_deactivate_btn') : T('deptmod_activate_btn')}</button>
                <button class="btn btn-sm btn-danger" data-action="delete" ${d.system ? `disabled title="${T('deptmod_delete_disabled_title')}"` : ''}>${T('deptmod_delete_btn')}</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="6" class="empty-state">${T('deptmod_no_items')}</td></tr>`;
}

function showDeptForm(dept) {
    const features = dept?.features || [];
    const allChecked = features.length === ALL_FEATURES.length;
    const form = `
        <form id="deptForm">
            <input type="hidden" name="id" value="${dept?.id || ''}">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label>${T('deptmod_form_name')}</label>
                    <input type="text" name="name" class="form-control" value="${dept?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('deptmod_form_code')}</label>
                    <input type="text" name="code" class="form-control" value="${dept?.code || ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('deptmod_form_head')}</label>
                    <input type="text" name="head" class="form-control" value="${dept?.head || ''}">
                </div>
                <div class="form-group">
                    <label>${T('deptmod_th_status')}</label>
                    <select name="active" class="form-control">
                        <option value="true" ${dept?.active !== false ? 'selected' : ''}>${T('deptmod_active')}</option>
                        <option value="false" ${dept?.active === false ? 'selected' : ''}>${T('deptmod_inactive')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${T('deptmod_form_description')}</label>
                <textarea name="description" class="form-control" rows="2">${dept?.description || ''}</textarea>
            </div>

            <div style="border:2px solid var(--primary);border-radius:var(--radius-lg);padding:16px;background:#f0f6ff;margin-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <label style="font-size:15px;font-weight:700;color:var(--primary-dark);">${T('deptmod_feature_rights_title')}</label>
                    <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                        <input type="checkbox" onchange="document.querySelectorAll('[name=features]').forEach(c=>c.checked=this.checked)" ${allChecked ? 'checked' : ''}>
                        ${T('deptmod_select_all')}
                    </label>
                </div>
                <p style="font-size:12px;color:var(--gray);margin-bottom:10px;">
                    ${T('deptmod_feature_rights_desc')}
                </p>
                <div class="permission-grid" id="deptFeaturesGrid">
                    ${ALL_FEATURES.map(f => `
                        <label class="permission-item" style="background:white;border:1px solid #d0d7e0;">
                            <input type="checkbox" name="features" value="${f}" ${features.includes(f) ? 'checked' : ''}>
                            <span>${f.replace('-', ' ')}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        </form>
    `;
    openFormModal(dept ? T('deptmod_modal_edit') : T('deptmod_modal_add'), form, `saveDept()`, true);
}

function saveDept() {
    const form = document.getElementById('deptForm');
    const data = {};
    form.querySelectorAll('[name]').forEach(el => {
        if (el.name !== 'features') data[el.name] = el.value;
    });
    data.features = Array.from(form.querySelectorAll('[name="features"]:checked')).map(cb => cb.value);
    data.active = data.active === 'true';

    if (!data.name || !data.code) { APP.notify(T('deptmod_fill_required'), 'error'); return; }

    if (data.id) {
        DB.update('departments', data.id, data);
        APP.notify(T('deptmod_updated_with') + ' ' + data.features.length + ' ' + T('deptmod_feature_rights_suffix'), 'success');
    } else {
        DB.add('departments', data);
        APP.notify(T('deptmod_added_with') + ' ' + data.features.length + ' ' + T('deptmod_feature_rights_suffix'), 'success');
    }
    renderDeptList();
}

function editDept(id) {
    let dept = DB.getById('departments', id);
    if (!dept) {
        const all = DB.get('departments');
        APP.notify(T('deptmod_not_found') + ' "' + id + '", ' + T('deptmod_available') + ' ' + JSON.stringify(all.map(d => ({ id: d.id, name: d.name }))), 'error');
        return;
    }
    showDeptForm(dept);
}

function toggleDept(id) {
    const dept = DB.getById('departments', id);
    if (dept) {
        DB.update('departments', id, { active: !dept.active });
        renderDeptList();
    }
}

function deleteDept(id) {
    const dept = DB.getById('departments', id);
    if (!dept) return;
    if (dept.system) { APP.notify(T('deptmod_predefined_no_delete'), 'error'); return; }
    const users = DB.get('users').filter(u => u.department === dept.name);
    const items = DB.get('inventory').filter(i => i.department === dept.name);
    let msg = `${T('deptmod_confirm_delete')} "${dept.name}"?`;
    if (users.length > 0) msg += `\n⚠️ ${users.length} ${T('deptmod_users_unlink_suffix')}`;
    if (items.length > 0) msg += `\n⚠️ ${items.length} ${T('deptmod_items_linked_suffix')}`;
    confirmAction(msg, () => {
        users.forEach(u => DB.update('users', u.id, { department: '' }));
        DB.delete('departments', id);
        APP.notify(`${T('deptmod_deptword')} "${dept.name}" ${T('deptmod_deleted_suffix')}`, 'success');
        renderDeptList();
    });
}

function getDepartmentFeatures(deptName) {
    const depts = DB.get('departments');
    const dept = depts.find(d => d.name === deptName);
    return dept?.features || [];
}
