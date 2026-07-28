function getFRList() {
    return DB.get('featureRights');
}

function setFRList(list) {
    DB.set('featureRights', list);
}

function isFAdmin() {
    const user = AUTH.currentUser();
    return user && (user.isSuperAdmin || user.role === 'admin');
}

function renderFeatureRights(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <h3 style="margin:0;">${T('featmod_title')}</h3>
        </div>
        <div class="tabs" style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:16px;">
            <button class="tab-btn active" data-tab="features" style="padding:8px 20px;border:none;background:var(--bg);cursor:pointer;font-size:14px;border-bottom:2px solid var(--primary);margin-bottom:-2px;font-weight:600;">${T('featmod_tab_features')}</button>
            <button class="tab-btn" data-tab="departments" style="padding:8px 20px;border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--gray);">${T('featmod_tab_departments')}</button>
        </div>
        <div id="frTabContent"></div>
    `;
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            container.querySelectorAll('.tab-btn').forEach(b => {
                b.style.borderBottom = 'none';
                b.style.background = 'transparent';
                b.style.color = 'var(--gray)';
                b.style.fontWeight = '400';
                b.classList.remove('active');
            });
            btn.style.borderBottom = '2px solid var(--primary)';
            btn.style.background = 'var(--bg)';
            btn.style.color = 'inherit';
            btn.style.fontWeight = '600';
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            if (tab === 'features') renderFRFeaturesTab();
            else if (tab === 'departments') renderFRDeptsTab();
        };
    });
    renderFRFeaturesTab();
}

function renderFRFeaturesTab() {
    const el = document.getElementById('frTabContent');
    if (!el) return;
    const isAdmin = isFAdmin();
    el.innerHTML = `
        <div class="card">
            <div class="card-body" style="padding:16px;">
                ${isAdmin ? `
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
                    <strong style="font-size:14px;">${T('featmod_add_new_feature')}</strong>
                    <input type="text" id="frNewName" class="form-control" style="width:200px;" placeholder="${T('featmod_feature_placeholder')}">
                    <button class="btn btn-sm btn-primary" id="frAddBtn">${T('featmod_add_btn')}</button>
                </div>` : ''}
                <div id="frTagList" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
            </div>
        </div>
    `;
    renderFRTags();
    if (isAdmin) {
        document.getElementById('frAddBtn').onclick = () => {
            const input = document.getElementById('frNewName');
            const name = input.value.trim().toLowerCase().replace(/\s+/g, '-');
            if (!name) { APP.notify(T('featmod_enter_feature_name'), 'error'); return; }
            let list = getFRList();
            if (list.includes(name)) { APP.notify(T('featmod_feature_exists'), 'error'); return; }
            list.push(name);
            setFRList(list);
            input.value = '';
            APP.notify(T('featmod_feature_added_prefix') + name + T('featmod_feature_added_suffix'), 'success');
            renderFRTags();
        };
    }
}

function renderFRTags() {
    const list = getFRList();
    const el = document.getElementById('frTagList');
    if (!el) return;
    const isAdmin = isFAdmin();
    el.innerHTML = list.map(f => `
        <span style="display:inline-flex;align-items:center;gap:4px;background:var(--primary);color:white;padding:3px 10px;border-radius:12px;font-size:12px;">
            ${f.replace(/-/g, ' ')}
            ${isAdmin ? `<button class="fr-remove" data-feature="${f}" style="background:none;border:none;color:white;cursor:pointer;font-size:14px;line-height:1;padding:0;" title="${T('featmod_remove_tooltip')}">&times;</button>` : ''}
        </span>
    `).join('');
    if (isAdmin) {
        el.querySelectorAll('.fr-remove').forEach(btn => {
            btn.onclick = () => deleteFR(btn.dataset.feature);
        });
    }
}

function deleteFR(feature) {
    confirmAction(T('featmod_remove_feature_confirm_prefix') + feature.replace(/-/g, ' ') + T('featmod_remove_feature_confirm_suffix'), () => {
        let list = getFRList().filter(f => f !== feature);
        setFRList(list);
        const depts = DB.get('departments');
        depts.forEach(d => {
            if (d.features && d.features.includes(feature)) {
                d.features = d.features.filter(f => f !== feature);
            }
        });
        DB.set('departments', depts);
        const users = DB.get('users');
        users.forEach(u => {
            if (u.permissions && u.permissions.includes(feature)) {
                u.permissions = u.permissions.filter(p => p !== feature);
            }
        });
        DB.set('users', users);
        APP.notify(T('featmod_feature_removed_prefix') + feature + T('featmod_feature_removed_suffix'), 'success');
        renderFRTags();
    });
}

function renderFRDeptsTab() {
    const el = document.getElementById('frTabContent');
    if (!el) return;
    const isAdmin = isFAdmin();
    let depts = DB.get('departments');
    const valid = depts.filter(d => d && d.name);
    if (valid.length !== depts.length) { DB.set('departments', valid); depts = valid; }
    const features = getFRList();
    el.innerHTML = `
        ${isAdmin ? `
        <div class="card" style="margin-bottom:16px;">
            <div class="card-body" style="padding:16px;">
                <strong style="font-size:14px;">${T('featmod_add_department')}</strong>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">
                    <div class="form-group">
                        <label>${T('featmod_dept_name_label')}</label>
                        <input type="text" id="frDeptName" class="form-control" placeholder="${T('featmod_dept_name_placeholder')}">
                    </div>
                    <div class="form-group">
                        <label>${T('featmod_dept_code_label')}</label>
                        <input type="text" id="frDeptCode" class="form-control" placeholder="${T('featmod_dept_code_placeholder')}">
                    </div>
                    <div class="form-group">
                        <label>${T('featmod_dept_head_label')}</label>
                        <input type="text" id="frDeptHead" class="form-control" placeholder="${T('featmod_dept_head_placeholder')}">
                    </div>
                    <div class="form-group">
                        <label>${T('featmod_description_label')}</label>
                        <input type="text" id="frDeptDesc" class="form-control" placeholder="${T('featmod_optional_placeholder')}">
                    </div>
                </div>
                <button class="btn btn-primary mt-2" id="frAddDeptBtn">${T('featmod_create_department')}</button>
            </div>
        </div>` : ''}
        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr><th>${T('featmod_th_code')}</th><th>${T('featmod_th_name')}</th><th>${T('featmod_th_head')}</th><th>${T('featmod_tab_features')}</th><th>${T('featmod_th_status')}</th></tr></thead>
                    <tbody id="frDeptTableBody">
                        ${depts.map(d => `
                            <tr>
                                <td><strong>${d.code}</strong></td>
                                <td>${d.name}</td>
                                <td>${d.head || '-'}</td>
                                <td>
                                    ${(d.features || []).map(f =>
                                        `<span style="display:inline-block;background:var(--primary-light, #e0e7ff);padding:1px 8px;border-radius:8px;font-size:11px;margin:1px;">${f.replace(/-/g, ' ')}</span>`
                                    ).join('') || '<span style="color:var(--gray);font-size:12px;">' + T('featmod_none') + '</span>'}
                                </td>
                                <td><span class="badge ${d.active !== false ? 'badge-success' : 'badge-danger'}">${d.active !== false ? T('featmod_active') : T('featmod_inactive')}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    if (isAdmin) {
        document.getElementById('frAddDeptBtn').onclick = () => {
            const name = document.getElementById('frDeptName').value.trim();
            const code = document.getElementById('frDeptCode').value.trim();
            if (!name || !code) { APP.notify(T('featmod_name_code_required'), 'error'); return; }
            const exists = depts.some(d => d.name === name || d.code === code);
            if (exists) { APP.notify(T('featmod_dept_exists'), 'error'); return; }
            DB.add('departments', {
                name, code, head: document.getElementById('frDeptHead').value.trim(),
                description: document.getElementById('frDeptDesc').value.trim(),
                active: true, features: []
            });
            APP.notify(T('featmod_dept_created_prefix') + name + T('featmod_dept_created_suffix'), 'success');
            renderFRDeptsTab();
        };
    }
}
