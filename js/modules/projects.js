function renderProjects(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="projSearch" placeholder="${T('projmod_search_placeholder')}" oninput="renderProjList()">
            </div>
            <button class="btn btn-primary" onclick="showProjForm()">${T('projmod_new_btn')}</button>
        </div>

        <div id="projStats" class="grid-4 mb-4"></div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>${T('projmod_th_name')}</th><th>${T('projmod_th_category')}</th><th>${T('projmod_th_budget')}</th><th>${T('projmod_th_spent')}</th>
                        <th>${T('projmod_th_start_date')}</th><th>${T('projmod_th_end_date')}</th><th>${T('projmod_th_status')}</th><th>${T('projmod_th_progress')}</th><th>${T('projmod_th_actions')}</th>
                    </tr></thead>
                    <tbody id="projTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderProjList();
}

function renderProjList() {
    const projects = DB.get('projects');
    const search = (document.getElementById('projSearch')?.value || '').toLowerCase();
    const filtered = projects.filter(p => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));

    const total = projects.length;
    const active = projects.filter(p => p.status === 'in-progress').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);

    const statsEl = document.getElementById('projStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card" style="border-left-color:var(--primary)"><div class="stat-value">${total}</div><div class="stat-label">${T('projmod_stat_total')}</div></div>
            <div class="stat-card" style="border-left-color:var(--info)"><div class="stat-value">${active}</div><div class="stat-label">${T('projmod_stat_inprogress')}</div></div>
            <div class="stat-card" style="border-left-color:var(--success)"><div class="stat-value">${completed}</div><div class="stat-label">${T('projmod_stat_completed')}</div></div>
            <div class="stat-card" style="border-left-color:var(--warning)"><div class="stat-value">₹${totalBudget.toLocaleString()}</div><div class="stat-label">${T('projmod_stat_budget')}</div></div>
        `;
    }

    const tbody = document.getElementById('projTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(p => {
        const budget = parseFloat(p.budget) || 0;
        const spent = parseFloat(p.spent) || 0;
        const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        return `<tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.category || '-'}</td>
            <td>₹${budget.toLocaleString()}</td>
            <td>₹${spent.toLocaleString()}</td>
            <td>${APP.formatDate(p.startDate)}</td>
            <td>${APP.formatDate(p.endDate)}</td>
            <td><span class="badge ${APP.getStatusBadge(p.status)}">${p.status}</span></td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill ${pct > 80 ? 'green' : pct > 50 ? 'yellow' : 'red'}" style="width:${Math.min(100, pct)}%"></div>
                </div>
                <div class="progress-label">${pct}% ${T('projmod_pct_spent')} (₹${spent.toLocaleString()})</div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProj('${p.id}')">${T('projmod_edit_btn')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProj('${p.id}')">${T('projmod_del_btn')}</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="9" class="empty-state">${T('projmod_no_items')}</td></tr>`;
}

function showProjForm(proj) {
    const form = `
        <form id="projForm">
            <input type="hidden" name="id" value="${proj?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('projmod_form_name')}</label>
                    <input type="text" name="name" class="form-control" value="${proj?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('projmod_th_category')}</label>
                    <select name="category" class="form-control">
                        <option value="Infrastructure" ${proj?.category === 'Infrastructure' ? 'selected' : ''}>${T('projmod_cat_infrastructure')}</option>
                        <option value="Medical Equipment" ${proj?.category === 'Medical Equipment' ? 'selected' : ''}>${T('projmod_cat_medical_equipment')}</option>
                        <option value="IT Systems" ${proj?.category === 'IT Systems' ? 'selected' : ''}>${T('projmod_cat_it_systems')}</option>
                        <option value="Renovation" ${proj?.category === 'Renovation' ? 'selected' : ''}>${T('projmod_cat_renovation')}</option>
                        <option value="Expansion" ${proj?.category === 'Expansion' ? 'selected' : ''}>${T('projmod_cat_expansion')}</option>
                        <option value="Other" ${proj?.category === 'Other' ? 'selected' : ''}>${T('projmod_cat_other')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('projmod_form_budget')}</label>
                    <input type="number" name="budget" class="form-control" value="${proj?.budget || 0}" required>
                </div>
                <div class="form-group">
                    <label>${T('projmod_form_spent')}</label>
                    <input type="number" name="spent" class="form-control" value="${proj?.spent || 0}">
                </div>
                <div class="form-group">
                    <label>${T('projmod_form_start_date')}</label>
                    <input type="date" name="startDate" class="form-control" value="${proj?.startDate ? proj.startDate.split('T')[0] : ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('projmod_form_end_date')}</label>
                    <input type="date" name="endDate" class="form-control" value="${proj?.endDate ? proj.endDate.split('T')[0] : ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('projmod_th_status')}</label>
                    <select name="status" class="form-control">
                        <option value="planning" ${proj?.status === 'planning' ? 'selected' : ''}>${T('projmod_status_planning')}</option>
                        <option value="in-progress" ${proj?.status === 'in-progress' ? 'selected' : ''}>${T('projmod_stat_inprogress')}</option>
                        <option value="completed" ${proj?.status === 'completed' ? 'selected' : ''}>${T('projmod_stat_completed')}</option>
                        <option value="on-hold" ${proj?.status === 'on-hold' ? 'selected' : ''}>${T('projmod_status_onhold')}</option>
                        <option value="cancelled" ${proj?.status === 'cancelled' ? 'selected' : ''}>${T('projmod_status_cancelled')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('projmod_form_assigned_to')}</label>
                    <input type="text" name="assignedTo" class="form-control" value="${proj?.assignedTo || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>${T('projmod_form_description')}</label>
                <textarea name="description" class="form-control" rows="3">${proj?.description || ''}</textarea>
            </div>
        </form>
    `;
    openFormModal(proj ? T('projmod_modal_edit') : T('projmod_modal_new'), form, `saveProj()`);
}

function saveProj() {
    const data = getFormData('projForm');
    if (!data.name || !data.budget || !data.startDate || !data.endDate) {
        APP.notify(T('projmod_fill_required'), 'error'); return;
    }
    if (data.id) {
        DB.update('projects', data.id, data);
        APP.notify(T('projmod_updated'), 'success');
    } else {
        DB.add('projects', data);
        APP.notify(T('projmod_created'), 'success');
    }
    renderProjList();
}

function editProj(id) {
    const proj = DB.getById('projects', id);
    if (proj) showProjForm(proj);
}

function deleteProj(id) {
    confirmAction(T('projmod_confirm_delete'), () => {
        DB.delete('projects', id);
        APP.notify(T('projmod_deleted'), 'success');
        renderProjList();
    });
}
