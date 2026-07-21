const CL_STATUSES = ['ok', 'fault', 'na', 'problem'];
const CL_UNITS = ['', 'V', '°C', '%', 'bar', 'A', 'kW', 'L/min', 'psi', 'ppm', 'mm', 'Hz', 'kWh'];

function renderChecklists(container) {
    const user = AUTH.currentUser();
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="clSearch" placeholder="${T('chkmod_search_placeholder')}" oninput="renderClList()">
            </div>
            <div>
                ${user.role === 'admin' || user.isSuperAdmin ? `<button class="btn btn-primary" onclick="showClForm()">${T('chkmod_new_checklist_btn')}</button>` : ''}
            </div>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchClTab('all',this)">${T('chkmod_tab_all')}</button>
            <button class="tab-btn" onclick="switchClTab('my',this)">${user.role === 'admin' || user.isSuperAdmin ? T('chkmod_tab_assigned_by_me') : T('chkmod_tab_my_checklists')}</button>
            <button class="tab-btn" onclick="switchClTab('common',this)">${T('chkmod_tab_common')}</button>
            <button class="tab-btn" onclick="switchClTab('completed',this)">${T('chkmod_completed')}</button>
        </div>
        <div id="clGrid" class="grid-2"></div>
    `;
    renderClList();
}

let clFilter = 'all';

function switchClTab(filter, btn) {
    clFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderClList();
}

function statusColor(s) {
    const m = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', problem: '#fd7e14', pending: '#e9ecef' };
    return m[s] || '#e9ecef';
}
function statusText(s) {
    return s ? s.toUpperCase() : 'PENDING';
}

function renderClList() {
    const user = AUTH.currentUser();
    const allChecklists = DB.get('checklists');
    const search = (document.getElementById('clSearch')?.value || '').toLowerCase();

    let scopeFiltered = allChecklists.filter(c => {
        if (user.role === 'admin' || user.isSuperAdmin) return true;
        if (user.role === 'hod') return c.department === user.department || c.assignedBy === user.fullName;
        return c.assignedTo === user.fullName || c.assignedTo === 'common';
    });

    let filtered = scopeFiltered;
    if (clFilter === 'my') {
        if (user.role === 'admin' || user.isSuperAdmin) {
            filtered = scopeFiltered.filter(c => c.assignedBy === user.fullName);
        } else {
            filtered = scopeFiltered.filter(c => c.assignedTo === user.fullName);
        }
    } else if (clFilter === 'common') {
        filtered = scopeFiltered.filter(c => c.assignedTo === 'common');
    } else if (clFilter === 'completed') {
        filtered = scopeFiltered.filter(c => c.status === 'completed');
    }
    if (search) {
        filtered = filtered.filter(c => c.title.toLowerCase().includes(search) || (c.assignedTo || '').toLowerCase().includes(search));
    }
    const grid = document.getElementById('clGrid');
    if (!grid) return;
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' + T('chkmod_no_checklists_found') + '</div>';
        return;
    }
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;
    const canEdit = (c) => isAdmin || c.assignedBy === user.fullName;
    const isAssignee = (c) => c.assignedTo === user.fullName || c.assignedTo === 'common';

    grid.innerHTML = filtered.slice().reverse().map(c => {
        const items = c.items || [];
        const total = items.length;
        const done = items.filter(i => i.status && i.status !== 'pending').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const barColor = pct === 100 ? 'green' : pct > 50 ? 'yellow' : 'red';
        return `<div class="card" style="${c.status === 'completed' ? 'opacity:0.7;' : ''}">
            <div class="flex-between" style="margin-bottom:8px;">
                <div>
                    <strong style="font-size:15px;">${c.title}</strong>
                    <span style="font-size:12px;color:var(--gray);display:block;">
                        ${c.assignedTo === 'common' ? T('chkmod_common_badge') : '👤 ' + c.assignedTo}
                        ${c.floor ? ' | 📍 ' + c.floor : ''}
                        ${c.deadline ? ' | ' + T('chkmod_due_label') + APP.formatDate(c.deadline) : ''}
                        ${c.deadline && APP.daysBetween(new Date().toISOString(), c.deadline) < 0 && c.status !== 'completed' ? ' ' + T('chkmod_overdue_label') : ''}
                        ${c.frequency === 'weekly' ? ' | ' + T('chkmod_freq_weekly') : c.frequency === 'monthly' ? ' | ' + T('chkmod_freq_monthly') : ' | ' + T('chkmod_freq_daily')}
                    </span>
                </div>
                <div style="text-align:right;">
                    <span class="badge ${c.status === 'completed' ? 'badge-success' : 'badge-info'}">${c.status}</span>
                    <div style="font-size:11px;color:var(--gray);margin-top:2px;">${T('chkmod_by_prefix')}${c.assignedBy}</div>
                </div>
            </div>
            <div class="progress-bar" style="margin-bottom:8px;">
                <div class="progress-fill ${barColor}" style="width:${pct}%"></div>
            </div>
            <div style="font-size:12px;color:var(--gray);margin-bottom:8px;">${done}/${total}${T('chkmod_done_suffix')}${pct}%)</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                ${items.map((item, idx) => {
                    const st = item.status || 'pending';
                    const canFill = isAssignee(c) && c.status !== 'completed';
                    const bgColor = st === 'ok' ? '#f0faf0' : st === 'fault' ? '#fff5f5' : st === 'problem' ? '#fff8f0' : st === 'na' ? '#f5f5f5' : 'var(--bg)';
                    return `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:${bgColor};font-size:13px;flex-wrap:wrap;">
                        <span style="display:inline-block;min-width:70px;text-align:center;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:${statusColor(st)};flex-shrink:0;">${statusText(st)}</span>
                        <span style="flex:1;min-width:120px;">${item.task}</span>
                        ${item.unit ? (canFill
                            ? `<input type="number" step="any" class="form-control" style="width:80px;padding:3px 6px;font-size:12px;text-align:right;" value="${item.value !== undefined && item.value !== '' ? item.value : ''}" placeholder="0" title="${T('chkmod_enter_reading_prefix')}${item.unit}" onchange="updateClItemValue('${c.id}',${idx},this.value)">`
                            : (item.value !== undefined && item.value !== '' ? `<span style="font-size:12px;font-weight:700;color:var(--text);">${item.value}</span>` : '')
                        ) : ''}
                        ${item.unit ? `<span style="font-size:11px;color:var(--gray);background:var(--card);padding:2px 7px;border-radius:4px;border:1px solid var(--border);font-weight:600;flex-shrink:0;">${item.unit}</span>` : ''}
                        ${canFill ? `
                            <select class="form-control" style="width:auto;padding:3px 4px;font-size:12px;flex-shrink:0;" onchange="updateClItemStatus('${c.id}',${idx},this.value)">
                                <option value="">${T('chkmod_opt_status')}</option>
                                ${CL_STATUSES.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
                            </select>
                        ` : ''}
                    </div>`;
                }).join('')}
            </div>
            ${c.description ? '<div style="font-size:12px;color:var(--gray);margin-top:6px;padding:4px 8px;background:var(--bg);border-radius:4px;">📝 ' + c.description + '</div>' : ''}
            ${canEdit(c) ? '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">' +
                '<button class="btn btn-sm btn-primary" onclick="editCl(\'' + c.id + '\')">' + T('chkmod_btn_edit') + '</button>' +
                (c.status !== 'completed' ? '<button class="btn btn-sm btn-success" onclick="completeCl(\'' + c.id + '\')">' + T('chkmod_btn_mark_complete') + '</button>' : '') +
                '<button class="btn btn-sm btn-danger" onclick="deleteCl(\'' + c.id + '\',\'' + (c.title||'').replace(/'/g,"\\'") + '\')">' + T('chkmod_btn_delete') + '</button>' +
            '</div>' : ''}
        </div>`;
    }).join('');
}

function showClForm(cl) {
    const user = AUTH.currentUser();
    let users = DB.get('users').filter(u => !u.isSuperAdmin);
    const floors = DB.get('floorItems');
    const existingItems = cl?.items || [];
    const isEdit = !!cl;
    if (user.role === 'hod') {
        users = users.filter(u => u.department === user.department && u.role !== 'admin');
        if (cl) users = users.concat(DB.get('users').filter(u => u.fullName === cl.assignedTo));
    }
    const depts = DB.get('departments');
    const form = `
        <form id="clForm">
            <input type="hidden" name="id" value="${cl?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('chkmod_label_title')}</label>
                    <input type="text" name="title" class="form-control" value="${cl?.title || ''}" required placeholder="${T('chkmod_placeholder_title_example')}">
                </div>
                <div class="form-group" ${user.role === 'hod' ? 'style="display:none;"' : ''}>
                    <label>${T('chkmod_label_department')}</label>
                    <select name="department" class="form-control">
                        <option value="">${T('chkmod_opt_all_departments')}</option>
                        ${depts.map(d => '<option value="' + d.name + '" ' + (cl?.department === d.name || (user.role === 'hod' && d.name === user.department) ? 'selected' : '') + '>' + d.name + '</option>').join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('chkmod_label_assign_to')}</label>
                    <select name="assignedTo" class="form-control" required>
                        <option value="common" ${cl?.assignedTo === 'common' ? 'selected' : ''}>${T('chkmod_opt_common_everyone')}</option>
                        <optgroup label="${T('chkmod_optgroup_employees')}">
                            ${users.map(u => '<option value="' + u.fullName + '" ' + (cl?.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + ' (' + u.role.replace('_',' ') + ')</option>').join('')}
                        </optgroup>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('chkmod_label_floor_area')}</label>
                    <select name="floor" class="form-control" onchange="loadFloorItems(this)" ${isEdit ? 'disabled' : ''}>
                        <option value="">${T('chkmod_opt_select_floor')}</option>
                        ${floors.map(f => '<option value="' + f.floor + '" ' + (cl?.floor === f.floor ? 'selected' : '') + '>' + f.floor + ' (' + f.items.length + T('chkmod_items_suffix') + '</option>').join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('chkmod_label_deadline')}</label>
                    <input type="date" name="deadline" class="form-control" value="${cl?.deadline ? cl.deadline.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label>${T('chkmod_label_frequency')}</label>
                    <select name="frequency" class="form-control">
                        <option value="daily"   ${(cl?.frequency||'daily')==='daily'  ?'selected':''}>${T('chkmod_freq_opt_daily')}</option>
                        <option value="weekly"  ${cl?.frequency==='weekly' ?'selected':''}>${T('chkmod_freq_opt_weekly')}</option>
                        <option value="monthly" ${cl?.frequency==='monthly'?'selected':''}>${T('chkmod_freq_opt_monthly')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${T('chkmod_label_description')}</label>
                <textarea name="description" class="form-control" rows="2">${cl?.description || ''}</textarea>
            </div>
            <div class="form-group" style="${isEdit ? '' : 'display:none;'}" id="clStatusGroup">
                <label>${T('chkmod_label_status')}</label>
                <select name="status" class="form-control">
                    <option value="active" ${cl?.status !== 'completed' ? 'selected' : ''}>${T('chkmod_active')}</option>
                    <option value="completed" ${cl?.status === 'completed' ? 'selected' : ''}>${T('chkmod_completed')}</option>
                </select>
            </div>
            <div class="form-group">
                <div class="flex-between" style="margin-bottom:8px;">
                    <label style="font-weight:600;">${T('chkmod_label_checklist_items')}</label>
                    <button type="button" class="btn btn-sm btn-primary" onclick="addClItem()">${T('chkmod_btn_add_item')}</button>
                </div>
                <p style="font-size:12px;color:var(--gray);margin-bottom:8px;">${T('chkmod_items_hint')}</p>
                <div id="clItemsContainer">
                    ${existingItems.map((item, i) => renderClItemRow(i, item.task, item.unit)).join('')}
                </div>
            </div>
        </form>
    `;
    openFormModal(isEdit ? T('chkmod_modal_edit') : T('chkmod_modal_new'), form, 'saveCl()', true);
}

function renderClItemRow(idx, task, unit) {
    return '<div class="cl-item-row" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">' +
        '<input type="text" class="form-control" name="cl_item_' + idx + '" value="' + (task || '') + '" placeholder="' + T('chkmod_placeholder_item_desc') + '" style="flex:1;">' +
        '<select name="cl_unit_' + idx + '" class="form-control" style="width:80px;font-size:12px;">' +
        CL_UNITS.map(u => '<option value="' + u + '" ' + (unit === u ? 'selected' : '') + '>' + (u || T('chkmod_opt_none')) + '</option>').join('') +
        '</select>' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="removeClItem(this)" ' + (idx === 0 ? 'disabled' : '') + '>✕</button>' +
    '</div>';
}

function loadFloorItems(select) {
    const floorName = select.value;
    if (!floorName) return;
    const floors = DB.get('floorItems');
    const floor = floors.find(f => f.floor === floorName);
    if (!floor) return;
    const container = document.getElementById('clItemsContainer');
    if (!container) return;
    container.innerHTML = floor.items.map((item, i) => renderClItemRow(i, item.name, item.unit)).join('');
}

function addClItem() {
    const container = document.getElementById('clItemsContainer');
    if (!container) return;
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'cl-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    row.innerHTML = '<input type="text" class="form-control" name="cl_item_' + idx + '" value="" placeholder="' + T('chkmod_placeholder_item_desc') + '" style="flex:1;">' +
        '<select name="cl_unit_' + idx + '" class="form-control" style="width:80px;font-size:12px;">' +
        CL_UNITS.map(u => '<option value="' + u + '">' + (u || T('chkmod_opt_none')) + '</option>').join('') +
        '</select>' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="removeClItem(this)">✕</button>';
    container.appendChild(row);
}

function removeClItem(btn) {
    const container = document.getElementById('clItemsContainer');
    if (container.children.length <= 1) return;
    btn.closest('.cl-item-row').remove();
    const rows = container.querySelectorAll('.cl-item-row');
    rows.forEach((row, i) => {
        const inp = row.querySelector('input');
        const sel = row.querySelector('select');
        if (inp) inp.name = 'cl_item_' + i;
        if (sel) sel.name = 'cl_unit_' + i;
    });
}

function saveCl() {
    const user = AUTH.currentUser();
    const form = document.getElementById('clForm');
    const id = form.querySelector('[name="id"]')?.value;
    const title = form.querySelector('[name="title"]')?.value;
    const assignedTo = form.querySelector('[name="assignedTo"]')?.value;
    const floor = form.querySelector('[name="floor"]')?.value;
    const deadline = form.querySelector('[name="deadline"]')?.value;
    const status = form.querySelector('[name="status"]')?.value || 'active';
    const description = form.querySelector('[name="description"]')?.value;
    const department = form.querySelector('[name="department"]')?.value || user.department || '';
    const frequency  = form.querySelector('[name="frequency"]')?.value  || 'daily';
    if (!title || !assignedTo) { APP.notify(T('chkmod_msg_title_assignment_required'), 'error'); return; }
    const items = [];
    const rows = form.querySelectorAll('.cl-item-row');
    rows.forEach((row, i) => {
        const task = row.querySelector('[name^="cl_item_"]')?.value?.trim();
        const unit = row.querySelector('[name^="cl_unit_"]')?.value || '';
        if (task) items.push({ task, unit, status: 'pending' });
    });
    if (items.length === 0) { APP.notify(T('chkmod_msg_add_one_item'), 'error'); return; }
    if (id) {
        const existing = DB.getById('checklists', id);
        const statusMap = {};
        (existing?.items || []).forEach(item => { statusMap[item.task] = item.status; });
        items.forEach(item => {
            if (statusMap[item.task] !== undefined) item.status = statusMap[item.task];
        });
        DB.update('checklists', id, { title, assignedTo, floor, deadline, description, items, status, department, frequency });
        APP.notify(T('chkmod_msg_updated'), 'success');
    } else {
        DB.add('checklists', {
            title, assignedTo, floor: floor || '', deadline: deadline || '', description: description || '',
            department, items, status: 'active', assignedBy: user.fullName, frequency
        });
        APP.notify(T('chkmod_msg_created'), 'success');
    }
    // Allow caller (e.g. HOD dashboard) to override the post-save refresh
    if (typeof window._clSaveCallback === 'function') {
        var cb = window._clSaveCallback;
        window._clSaveCallback = null;
        cb();
    } else {
        renderClList();
    }
}

function editCl(id) {
    const cl = DB.getById('checklists', id);
    if (cl) showClForm(cl);
}

function deleteCl(id, title) {
    var msg = title ? T('chkmod_confirm_delete_named_prefix') + title + T('chkmod_confirm_delete_named_suffix') : T('chkmod_confirm_delete_generic');
    confirmAction(msg, () => {
        DB.delete('checklists', id);
        APP.notify(T('chkmod_msg_deleted'), 'success');
        renderClList();
    });
}

function updateClItemStatus(id, idx, value) {
    if (!value) return;
    const cl = DB.getById('checklists', id);
    if (!cl || !cl.items[idx]) return;
    cl.items[idx].status = value;
    cl.items[idx].updatedAt = new Date().toISOString();
    cl.items[idx].updatedBy = AUTH.currentUser()?.fullName || '';
    const allDone = cl.items.every(i => i.status && i.status !== 'pending');
    if (allDone && cl.status !== 'completed') {
        cl.status = 'completed';
        cl.completedAt = new Date().toISOString();
    }
    DB.update('checklists', id, { items: cl.items, status: cl.status, completedAt: cl.completedAt });
    // Auto-create a problem ticket when item is flagged as "problem"
    if (value === 'problem') _autoCreateProblemFromCl(id, idx);
    APP.notify(T('chkmod_msg_item_set_to_prefix') + value.toUpperCase(), 'success');
    renderClList();
}

function _autoCreateProblemFromCl(clId, idx) {
    const cl = DB.getById('checklists', clId);
    if (!cl || !cl.items[idx]) return;
    const item = cl.items[idx];
    const user = AUTH.currentUser();
    // Prevent duplicate: if an open ticket already exists for this item, skip
    const existing = (DB.get('problems') || []).find(function(p) {
        return p.source === 'checklist' && p.checklistId === clId &&
               p.itemIdx === idx && p.status !== 'resolved';
    });
    if (existing) {
        APP.notify(T('chkmod_msg_ticket_prefix') + (existing.ticketId || '') + T('chkmod_msg_ticket_already_open_suffix'), 'info');
        return;
    }
    const dept = cl.department || (user ? user.department : '') || '';
    const ticketId = (typeof _genTicketId === 'function') ? _genTicketId() : ('TKT-' + Date.now());
    const desc = 'Problem flagged in checklist "' + cl.title + '"'
        + '\nItem: ' + item.task
        + (item.value !== undefined && item.value !== '' ? '\nReading: ' + item.value + (item.unit ? ' ' + item.unit : '') : '')
        + '\nFlagged by: ' + (user ? user.fullName : 'Unknown')
        + '\nFloor/Area: ' + (cl.floor || 'N/A');
    DB.add('problems', {
        title: '[CL] ' + cl.title + ' — ' + item.task,
        category: 'Checklist',
        description: desc,
        routedTo: dept,
        department: user ? (user.department || dept) : dept,
        priority: 'medium',
        reportedBy: user ? user.fullName : '',
        location: cl.floor || '',
        createdBy: user ? user.username : '',
        createdByName: user ? user.fullName : '',
        status: 'open',
        ticketId: ticketId,
        source: 'checklist',
        checklistId: clId,
        checklistTitle: cl.title,
        itemIdx: idx,
        itemTask: item.task,
        solution: '', resolvedBy: '', resolvedAt: '', assignedTo: '', assignedToName: ''
    });
    APP.notify(T('chkmod_msg_ticket_created_prefix') + ticketId + T('chkmod_msg_ticket_created_suffix'), 'warning');
}

function updateClItemValue(id, idx, value) {
    const cl = DB.getById('checklists', id);
    if (!cl || !cl.items[idx]) return;
    cl.items[idx].value = value;
    cl.items[idx].updatedAt = new Date().toISOString();
    cl.items[idx].updatedBy = AUTH.currentUser()?.fullName || '';
    // Save quietly — no re-render so the input keeps focus
    DB.update('checklists', id, { items: cl.items });
}

function completeCl(id) {
    const cl = DB.getById('checklists', id);
    if (!cl) return;
    const items = (cl.items || []).map(i => ({ ...i, status: i.status || 'ok' }));
    DB.update('checklists', id, { items, status: 'completed', completedAt: new Date().toISOString() });
    APP.notify(T('chkmod_msg_marked_complete'), 'success');
    renderClList();
}
