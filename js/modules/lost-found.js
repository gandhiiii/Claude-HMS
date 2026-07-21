function renderLostFound(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="lostSearch" placeholder="${T('lfmod_search_placeholder')}" oninput="renderLostList()">
            </div>
            <div>
                <button class="btn btn-primary" onclick="showLostForm('lost')">${T('lfmod_btn_report_lost')}</button>
                <button class="btn btn-success" onclick="showLostForm('found')">${T('lfmod_btn_report_found')}</button>
            </div>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchLostTab('all',this)">${T('lfmod_tab_all')}</button>
            <button class="tab-btn" onclick="switchLostTab('lost',this)">${T('lfmod_tab_lost')}</button>
            <button class="tab-btn" onclick="switchLostTab('found',this)">${T('lfmod_tab_found')}</button>
            <button class="tab-btn" onclick="switchLostTab('returned',this)">${T('lfmod_tab_returned')}</button>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>${T('lfmod_th_item_name')}</th><th>${T('lfmod_th_type')}</th><th>${T('lfmod_th_description')}</th><th>${T('lfmod_th_date')}</th>
                        <th>${T('lfmod_th_location')}</th><th>${T('lfmod_th_reported_by')}</th><th>${T('lfmod_th_status')}</th><th>${T('lfmod_th_actions')}</th>
                    </tr></thead>
                    <tbody id="lostTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderLostList();
}

let lostFilter = 'all';

function switchLostTab(filter, btn) {
    lostFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLostList();
}

function renderLostList() {
    const user = AUTH.currentUser();
    const isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    const items = DB.get('lostfound');
    const search = (document.getElementById('lostSearch')?.value || '').toLowerCase();
    let roleFiltered = isAdmin ? items : items.filter(i => {
        if (user.role === 'hod') return i.department === user.department || i.createdBy === user.username;
        return i.createdBy === user.username;
    });
    let filtered = roleFiltered.filter(i =>
        (i.itemName || '').toLowerCase().includes(search) ||
        (i.description || '').toLowerCase().includes(search) ||
        (i.location || '').toLowerCase().includes(search) ||
        (i.reportedBy || '').toLowerCase().includes(search)
    );
    if (lostFilter !== 'all') filtered = filtered.filter(i => i.type === lostFilter || (lostFilter === 'returned' && i.status === 'returned'));

    const tbody = document.getElementById('lostTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(i => `
        <tr>
            <td><strong>${i.itemName}</strong></td>
            <td><span class="badge ${i.type === 'lost' ? 'badge-danger' : 'badge-success'}">${i.type.toUpperCase()}</span></td>
            <td>${i.description.substring(0, 50)}${i.description.length > 50 ? '...' : ''}</td>
            <td>${APP.formatDate(i.createdAt)}</td>
            <td>${i.location || '-'}</td>
            <td>${i.reportedBy}</td>
            <td><span class="badge ${i.status === 'returned' ? 'badge-success' : i.type === 'found' ? 'badge-info' : 'badge-danger'}">${i.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewLostItem('${i.id}')">${T('lfmod_btn_view')}</button>
                ${i.status !== 'returned' ? `<button class="btn btn-sm btn-success" onclick="markReturned('${i.id}')">${T('lfmod_btn_mark_returned')}</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteLostItem('${i.id}')">${T('lfmod_btn_delete')}</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">' + T('lfmod_empty_state') + '</td></tr>';
}

function showLostForm(type) {
    const user = AUTH.currentUser();
    const isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    const reportedByField = isAdmin
        ? `<input type="text" name="reportedBy" class="form-control" required>`
        : `<input type="text" name="reportedBy" class="form-control" value="${user.fullName}" readonly style="background:var(--light-gray);">`;
    const form = `
        <form id="lostForm">
            <input type="hidden" name="type" value="${type}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('lfmod_item_name_label')}</label>
                    <input type="text" name="itemName" class="form-control" placeholder="${type === 'lost' ? T('lfmod_placeholder_item_lost') : T('lfmod_placeholder_item_found')}" required>
                </div>
                <div class="form-group">
                    <label>${T('lfmod_reported_by_label')}</label>
                    ${reportedByField}
                </div>
                <div class="form-group">
                    <label>${T('lfmod_location_label')}</label>
                    <input type="text" name="location" class="form-control" placeholder="${T('lfmod_location_placeholder')}" required>
                </div>
                <div class="form-group">
                    <label>${T('lfmod_incident_date_label')}</label>
                    <input type="date" name="incidentDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>${T('lfmod_contact_info_label')}</label>
                    <input type="text" name="contactInfo" class="form-control" placeholder="${T('lfmod_contact_placeholder')}">
                </div>
                <div class="form-group">
                    <label>${T('lfmod_category_label')}</label>
                    <select name="category" class="form-control">
                        <option value="Personal">${T('lfmod_cat_personal')}</option>
                        <option value="Electronics">${T('lfmod_cat_electronics')}</option>
                        <option value="Document">${T('lfmod_cat_document')}</option>
                        <option value="Clothing">${T('lfmod_cat_clothing')}</option>
                        <option value="Jewelry">${T('lfmod_cat_jewelry')}</option>
                        <option value="Money">${T('lfmod_cat_money')}</option>
                        <option value="Medical">${T('lfmod_cat_medical')}</option>
                        <option value="Other">${T('lfmod_cat_other')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${T('lfmod_description_label')}</label>
                <textarea name="description" class="form-control" rows="3" required></textarea>
            </div>
            <div class="form-group">
                <label>${T('lfmod_action_taken_label')}</label>
                <textarea name="actionTaken" class="form-control" rows="2" placeholder="${T('lfmod_action_taken_placeholder')}"></textarea>
            </div>
        </form>
    `;
    openFormModal((type === 'lost' ? T('lfmod_title_report_lost') : T('lfmod_title_report_found')), form, `saveLostItem()`);
}

function saveLostItem() {
    const user = AUTH.currentUser();
    const data = getFormData('lostForm');
    if (!data.itemName || !data.location || !data.description) {
        APP.notify(T('lfmod_fill_required'), 'error'); return;
    }
    data.status = data.type === 'lost' ? 'lost' : 'found';
    data.returnedTo = '';
    data.returnedAt = '';
    data.createdBy = user ? user.username : 'admin';
    data.createdByName = user ? user.fullName : 'Admin';
    data.department = user ? (user.department || '') : '';
    data.reportedBy = data.reportedBy || (user ? user.fullName : 'Unknown');
    DB.add('lostfound', data);
    APP.notify((data.type === 'lost' ? T('lfmod_lost_item_word') : T('lfmod_found_item_word')) + T('lfmod_reported_suffix'), 'success');
    renderLostList();
}

function viewLostItem(id) {
    const i = DB.getById('lostfound', id);
    if (!i) return;
    showModal(`
        <div class="modal-header">
            <h3>${i.itemName}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>${T('lfmod_type_colon')}</strong> <span class="badge ${i.type === 'lost' ? 'badge-danger' : 'badge-success'}">${i.type.toUpperCase()}</span></div>
            <div><strong>${T('lfmod_category_colon')}</strong> ${i.category || '-'}</div>
            <div><strong>${T('lfmod_location_colon')}</strong> ${i.location}</div>
            <div><strong>${T('lfmod_date_colon')}</strong> ${APP.formatDate(i.incidentDate || i.createdAt)}</div>
            <div><strong>${T('lfmod_reported_by_colon')}</strong> ${i.reportedBy}</div>
            <div><strong>${T('lfmod_contact_colon')}</strong> ${i.contactInfo || '-'}</div>
            <div><strong>${T('lfmod_status_colon')}</strong> <span class="badge ${i.status === 'returned' ? 'badge-success' : 'badge-danger'}">${i.status.toUpperCase()}</span></div>
            ${i.returnedTo ? `<div><strong>${T('lfmod_returned_to_colon')}</strong> ${i.returnedTo}</div>` : ''}
            ${i.returnedAt ? `<div><strong>${T('lfmod_returned_at_colon')}</strong> ${APP.formatDateTime(i.returnedAt)}</div>` : ''}
        </div>
        <div class="mt-4"><strong>${T('lfmod_description_colon')}</strong><br>${i.description}</div>
        ${i.actionTaken ? `<div class="mt-2"><strong>${T('lfmod_action_taken_colon')}</strong><br>${i.actionTaken}</div>` : ''}
    `);
}

function markReturned(id) {
    const item = DB.getById('lostfound', id);
    if (!item) return;
    const name = prompt(T('lfmod_prompt_returned_to'));
    if (!name) return;
    DB.update('lostfound', id, {
        status: 'returned',
        returnedTo: name,
        returnedAt: new Date().toISOString()
    });
    APP.notify(T('lfmod_marked_returned'), 'success');
    renderLostList();
}

function deleteLostItem(id) {
    confirmAction(T('lfmod_delete_confirm'), () => {
        DB.delete('lostfound', id);
        renderLostList();
    });
}
