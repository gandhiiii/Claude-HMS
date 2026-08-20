let dchkTab = 'templates';
const DCHK_UNITS = ['', 'V', '°C', '%', 'bar', 'A', 'kW', 'L/min', 'psi', 'ppm', 'mm', 'Hz', 'kWh', 'kg', 'm', 'L'];


function renderDeptChecklists(container) {
    const user = AUTH.currentUser();
    const isMgmt = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    // Non-mgmt users start on Fill tab
    if (!isMgmt && (dchkTab === 'templates' || dchkTab === 'assign' || dchkTab === 'oversight')) {
        dchkTab = 'fill';
    }
    container.innerHTML = `
        <div class="flex-between mb-4">
            <h2 style="font-size:18px;font-weight:700;">${T('dchk_nav')}</h2>
        </div>
        <div class="tabs">
            ${isMgmt ? `<button class="tab-btn ${dchkTab === 'templates' ? 'active' : ''}" onclick="dchkSwitchTab('templates',this)">${T('dchk_tab_templates')}</button>` : ''}
            ${isMgmt ? `<button class="tab-btn ${dchkTab === 'assign' ? 'active' : ''}" onclick="dchkSwitchTab('assign',this)">${T('dchk_tab_assign')}</button>` : ''}
            <button class="tab-btn ${dchkTab === 'fill' ? 'active' : ''}" onclick="dchkSwitchTab('fill',this)">${T('dchk_tab_fill')}</button>
            ${isMgmt ? `<button class="tab-btn ${dchkTab === 'oversight' ? 'active' : ''}" onclick="dchkSwitchTab('oversight',this)">${T('dchk_tab_oversight')}</button>` : ''}
            <button class="tab-btn ${dchkTab === 'history' ? 'active' : ''}" onclick="dchkSwitchTab('history',this)">📜 ${T('dchk_tab_history') || 'Submission History'}</button>
        </div>
        <div id="dchkContent"></div>
    `;
    dchkRenderTab();
}

function dchkSwitchTab(tab, btn) {
    dchkTab = tab;
    document.querySelectorAll('#pageContent .tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    dchkRenderTab();
}

function dchkRenderTab() {
    if (dchkTab === 'templates') dchkRenderTemplates();
    else if (dchkTab === 'assign') dchkRenderAssign();
    else if (dchkTab === 'fill') dchkRenderFill();
    else if (dchkTab === 'oversight') dchkRenderOversight();
    else if (dchkTab === 'history') dchkRenderHistory();
}

/* ═══════════════════════ TEMPLATES TAB ═══════════════════════ */

function dchkRenderTemplates() {
    const content = document.getElementById('dchkContent');
    if (!content) return;
    const user = AUTH.currentUser();
    const isMgmt = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    const templates = (window.CHECKLISTS ? CHECKLISTS.listTemplates(user) : []);
    content.innerHTML = `
        ${isMgmt ? `<div style="margin-bottom:16px;"><button class="btn btn-primary" onclick="dchkShowTemplateForm()">${T('dchk_new_template')}</button></div>` : ''}
        <div id="dchkTemplateList">${dchkRenderTemplateList(templates, user)}</div>
    `;
}

function dchkRenderTemplateList(templates, user) {
    if (templates.length === 0) return '<div class="empty-state">' + T('dchk_no_templates') + '</div>';
    const isMgmt = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    return templates.slice().reverse().map(t => `
        <div class="card" style="margin-bottom:12px;">
            <div class="flex-between" style="margin-bottom:8px;">
                <div>
                    <strong style="font-size:15px;">${t.title}</strong>
                    <span style="font-size:12px;color:var(--gray);display:block;">
                        ${t.department}${t.floorName ? ' | ' + t.floorName : ''} | ${t.items.length} ${T('dchk_items_count')}
                    </span>
                </div>
                <div style="display:flex;gap:4px;">
                    ${isMgmt ? `<button class="btn btn-sm btn-primary" onclick="dchkShowItems('${t.id}')">${T('dchk_manage_items')}</button>` : ''}
                    ${isMgmt ? `<button class="btn btn-sm btn-danger" onclick="dchkDeleteTemplate('${t.id}')">✕</button>` : ''}
                </div>
            </div>
            ${t.items.length > 0 ? `
            <div style="max-height:120px;overflow-y:auto;font-size:13px;border-top:1px solid var(--border);padding-top:6px;">
                ${t.items.map(it => `<div style="padding:2px 0;">• ${it.label}${it.unit ? ' <span style="font-size:11px;font-weight:600;color:var(--gray);">[' + it.unit + ']</span>' : ''} <span style="font-size:10px;color:var(--gray);">(${it.type})</span></div>`).join('')}
            </div>` : ''}
        </div>
    `).join('');
}

function dchkEnsureFloors(user) {
    if (!window.CHECKLISTS) return [];
    var floors = CHECKLISTS.listFloors();
    if (floors.length === 0 && (user.role === 'admin' || user.isSuperAdmin)) {
        var names = ['B3','B2','B1','GF','1st Floor','2nd Floor','3rd Floor','4th Floor','5th Floor','6th Floor','7th Floor'];
        var store = [];
        names.forEach(function(n) {
            store.push({ id: 'fl_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), name: n, createdAt: new Date().toISOString() });
        });
        DB.set('floors', store);
        floors = CHECKLISTS.listFloors();
    }
    return floors;
}

function dchkShowTemplateForm(existing) {
    const user = AUTH.currentUser();
    const depts = DB.get('departments') || [];
    const floors = dchkEnsureFloors(user);
    const isEdit = !!existing;
    const freqOpts = ['daily', 'weekly', 'monthly'];
    const freqLabels = { daily: T('dchk_freq_daily'), weekly: T('dchk_freq_weekly'), monthly: T('dchk_freq_monthly') };
    const form = `
        <form id="dchkTemplateForm">
            <input type="hidden" name="id" value="${existing ? existing.id : ''}">
            <div class="form-group">
                <label>${T('dchk_dept_label')} *</label>
                <select name="department" class="form-control" onchange="dchkDeptChanged(this)">
                    <option value="">${T('dchk_select_dept')}</option>
                    ${depts.map(d => {
                        const val = d.name || d;
                        return '<option value="' + val + '" ' + (existing && existing.department === val ? 'selected' : '') + '>' + val + '</option>';
                    }).join('')}
                </select>
            </div>
            <div class="form-group" id="dchkFloorGroup">
                <label>${T('dchk_floor_label')}</label>
                <select name="floorId" class="form-control">
                    <option value="">${T('dchk_select_floor')}</option>
                    ${floors.map(f => '<option value="' + f.id + '" ' + (existing && existing.floorId === f.id ? 'selected' : '') + '>' + f.name + '</option>').join('')}
                </select>
            </div>
            <div class="form-group">
                <label>${T('dchk_title_label')} *</label>
                <input type="text" name="title" class="form-control" value="${existing ? existing.title : ''}" required>
            </div>
            <div class="form-group">
                <label>${T('dchk_freq_label')}</label>
                <select name="frequency" class="form-control">
                    ${freqOpts.map(f => '<option value="' + f + '" ' + ((existing && existing.frequency === f) ? 'selected' : '') + '>' + freqLabels[f] + '</option>').join('')}
                </select>
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label>${T('dchk_upload_file')}</label>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="file" id="dchkFileInput" accept=".csv,.txt" class="form-control" style="flex:1;" onchange="dchkParseFile(this)">
                    <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('dchkFileInput').click()">${T('dchk_upload_btn')}</button>
                </div>
            </div>
            <div class="form-group" style="margin-top:8px;">
                <div class="flex-between"><label>${T('dchk_parsed_points')}</label>
                    <div style="display:flex;gap:4px;">
                        <input type="text" id="dchkManualPoint" placeholder="${T('dchk_manual_point')}" class="form-control" style="width:200px;padding:4px 8px;font-size:13px;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="dchkAddManualPoint()">${T('dchk_add_point_btn')}</button>
                    </div>
                </div>
                <div id="dchkPointList" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:8px;margin-top:4px;">
                    <div style="color:var(--gray);font-size:13px;">${T('dchk_no_points')}</div>
                </div>
            </div>
        </form>
    `;
    openFormModal(isEdit ? T('dchk_edit_template') : T('dchk_new_template'), form, 'dchkSaveTemplate()', true);
    setTimeout(function() {
        const sel = document.querySelector('#dchkTemplateForm [name="department"]');
        if (sel) dchkDeptChanged(sel);
        if (existing && existing.items && existing.items.length > 0) {
            dchkSetPoints(existing.items);
        }
    }, 50);
}

function dchkDeptChanged(sel) {
    // floor visibility is always on
}

function dchkParseFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith(','));
        const points = lines.map(l => l.replace(/^["']|["']$/g, '').trim()).filter(l => l.length > 0);
        dchkSetPoints(points);
    };
    reader.readAsText(file);
}

function dchkSetPoints(points) {
    const container = document.getElementById('dchkPointList');
    if (!container) return;
    if (points.length === 0) {
        container.innerHTML = '<div style="color:var(--gray);font-size:13px;">' + T('dchk_no_points') + '</div>';
        return;
    }
    container.innerHTML = points.map((p, i) => `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <span style="flex:1;min-width:100px;">${i + 1}. ${p}</span>
            <select class="form-control dchk-point-unit" style="width:80px;font-size:12px;padding:2px 4px;">
                ${DCHK_UNITS.map(u => '<option value="' + u + '">' + (u || 'none') + '</option>').join('')}
            </select>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('div').remove()" style="padding:2px 6px;font-size:11px;">✕</button>
        </div>
    `).join('');
}

function dchkAddManualPoint() {
    const input = document.getElementById('dchkManualPoint');
    const text = input?.value?.trim();
    if (!text) { APP.notify(T('dchk_point_required'), 'error'); return; }
    const container = document.getElementById('dchkPointList');
    if (!container) return;
    const count = container.querySelectorAll('.dchk-point-unit').length + 1;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px;';
    var unitOpts = DCHK_UNITS.map(function(u) { return '<option value="' + u + '">' + (u || 'none') + '</option>'; }).join('');
    div.innerHTML = '<span style="flex:1;min-width:100px;">' + count + '. ' + text + '</span>'
        + '<select class="form-control dchk-point-unit" style="width:80px;font-size:12px;padding:2px 4px;">' + unitOpts + '</select>'
        + '<button type="button" class="btn btn-sm btn-danger" onclick="this.closest(\'div\').remove()" style="padding:2px 6px;font-size:11px;">✕</button>';
    container.appendChild(div);
    input.value = '';
}

function dchkCollectPoints() {
    const container = document.getElementById('dchkPointList');
    if (!container) return [];
    const points = [];
    container.querySelectorAll('div').forEach(function(div) {
        var span = div.querySelector('span');
        var unitSel = div.querySelector('.dchk-point-unit');
        if (span) {
            var txt = span.textContent.replace(/^\d+\.\s*/, '').trim();
            var unit = unitSel ? unitSel.value : '';
            if (txt) points.push({ label: txt, unit: unit });
        }
    });
    return points;
}

function dchkSaveTemplate() {
    if (!window.CHECKLISTS) { APP.notify('Checklist system not loaded', 'error'); return false; }
    const user = AUTH.currentUser();
    const form = document.getElementById('dchkTemplateForm');
    if (!form) return false;
    const id = form.querySelector('[name="id"]')?.value;
    const department = form.querySelector('[name="department"]')?.value;
    const title = form.querySelector('[name="title"]')?.value?.trim();
    const floorId = form.querySelector('[name="floorId"]')?.value;
    const frequency = form.querySelector('[name="frequency"]')?.value || 'daily';
    if (!department || !title) { APP.notify('Department and title required', 'error'); return false; }

    const points = dchkCollectPoints();
    if (points.length === 0) { APP.notify('Add at least one point', 'error'); return false; }

    if (id) {
        const templates = DB.get('checklistTemplates') || [];
        const tpl = templates.find(function(t) { return t.id === id; });
        if (tpl) {
            tpl.department = department;
            tpl.title = title.includes('(') ? title : (title + ' (' + frequency + ')');
            tpl.frequency = frequency;
            if (floorId) {
                tpl.floorId = floorId;
                const floor = window.CHECKLISTS ? CHECKLISTS.getFloor(floorId) : null;
                if (floor) tpl.floorName = floor.name;
            }
            tpl.items = points.map(function(p, i) {
                var existingItem = (tpl.items || [])[i];
                return {
                    id: existingItem ? existingItem.id : ('ci_' + Date.now() + '_' + i),
                    label: p.label || p,
                    type: existingItem ? existingItem.type : 'fixed',
                    unit: p.unit || ''
                };
            });
            tpl.updatedAt = new Date().toISOString();
            DB.set('checklistTemplates', templates);
        }
        APP.notify(T('dchk_template_saved'), 'success');
        closeModal();
        dchkRenderTemplates();
        return true;
    }

    const needsFloor = window.CHECKLISTS && CHECKLISTS.requiresFloor(department);
    const result = CHECKLISTS.createTemplate(user, department, title + ' (' + frequency + ')', needsFloor ? (floorId || undefined) : undefined);
    if (!result.success) { APP.notify(result.message, 'error'); return false; }
    const tpl = result.template;
    points.forEach(function(p) {
        var itemResult = CHECKLISTS.addItem(user, tpl.id, { label: p.label || p, type: 'fixed' });
        if (itemResult.success && p.unit) {
            var templates = DB.get('checklistTemplates') || [];
            var t = templates.find(function(x) { return x.id === tpl.id; });
            if (t) {
                var it = t.items.find(function(x) { return x.id === itemResult.item.id; });
                if (it) { it.unit = p.unit; }
                DB.set('checklistTemplates', templates);
            }
        }
    });
    tpl.frequency = frequency;
    const templates = DB.get('checklistTemplates') || [];
    const idx = templates.findIndex(function(t) { return t.id === tpl.id; });
    if (idx >= 0) { templates[idx].frequency = frequency; DB.set('checklistTemplates', templates); }

    APP.notify(T('dchk_template_saved'), 'success');
    closeModal();
    dchkRenderTemplates();
    return true;
}

function dchkShowItems(templateId) {
    if (!window.CHECKLISTS) return;
    const user = AUTH.currentUser();
    const tpl = CHECKLISTS.getTemplate(templateId);
    if (!tpl) return;
    const canEdit = CHECKLISTS.canManage(user, tpl.department);
    const html = `
        <div style="margin-bottom:12px;">
            <strong>${tpl.title}</strong>
            <span style="display:block;font-size:12px;color:var(--gray);">${tpl.department}${tpl.floorName ? ' | ' + tpl.floorName : ''} | ${tpl.items.length} ${T('dchk_items_count')}</span>
        </div>
        ${canEdit ? `
        <div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;">
            <input type="text" id="dchkNewItemInput" class="form-control" placeholder="${T('dchk_manual_point')}" style="flex:1;min-width:120px;">
            <select id="dchkNewItemUnit" class="form-control" style="width:80px;font-size:12px;">
                ${DCHK_UNITS.map(u => '<option value="' + u + '">' + (u || 'none') + '</option>').join('')}
            </select>
            <button class="btn btn-sm btn-primary" onclick="dchkAddItemToTemplate('${templateId}')">${T('dchk_add_item')}</button>
        </div>` : ''}
        <div style="max-height:400px;overflow-y:auto;">
            ${tpl.items.length === 0 ? '<div class="empty-state">' + T('dchk_no_points') + '</div>' :
            tpl.items.map(it => `
                <div style="display:flex;align-items:center;gap:6px;padding:6px 4px;border-bottom:1px solid var(--border);font-size:13px;">
                    <span style="flex:1;">• ${it.label}</span>
                    ${it.unit ? '<span style="font-size:11px;font-weight:600;color:var(--text);padding:2px 7px;background:var(--card);border-radius:4px;border:1px solid var(--border);">' + it.unit + '</span>' : ''}
                    <span style="font-size:10px;color:var(--gray);padding:2px 6px;background:var(--bg);border-radius:4px;">${it.type === 'fixed' ? T('dchk_type_fixed') : T('dchk_type_custom')}</span>
                    ${canEdit ? `<button class="btn btn-sm btn-danger" onclick="dchkRemoveItem('${templateId}','${it.id}')" style="padding:2px 6px;font-size:11px;">✕</button>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    openFormModal(T('dchk_edit_items_title') + ' ' + tpl.title, html, null, false);
}

function dchkAddItemToTemplate(templateId) {
    if (!window.CHECKLISTS) return;
    const user = AUTH.currentUser();
    const input = document.getElementById('dchkNewItemInput');
    const unitSel = document.getElementById('dchkNewItemUnit');
    const label = input?.value?.trim();
    if (!label) { APP.notify(T('dchk_point_required'), 'error'); return; }
    const result = CHECKLISTS.addItem(user, templateId, { label: label, type: 'custom' });
    if (!result.success) { APP.notify(result.message, 'error'); return; }
    if (unitSel && unitSel.value) {
        var templates = DB.get('checklistTemplates') || [];
        var t = templates.find(function(x) { return x.id === templateId; });
        if (t) {
            var it = t.items.find(function(x) { return x.id === result.item.id; });
            if (it) { it.unit = unitSel.value; }
            DB.set('checklistTemplates', templates);
        }
    }
    APP.notify('Point added', 'success');
    input.value = '';
    dchkShowItems(templateId);
}

function dchkRemoveItem(templateId, itemId) {
    if (!window.CHECKLISTS) return;
    const user = AUTH.currentUser();
    const result = CHECKLISTS.removeItem(user, templateId, itemId);
    if (!result.success) { APP.notify(result.message, 'error'); return; }
    APP.notify('Point removed', 'success');
    dchkShowItems(templateId);
}

function dchkDeleteTemplate(templateId) {
    if (!window.CHECKLISTS) return;
    confirmAction(T('dchk_confirm_delete_template'), function() {
        const user = AUTH.currentUser();
        const tpl = CHECKLISTS.getTemplate(templateId);
        if (!tpl) return;
        const templates = DB.get('checklistTemplates') || [];
        DB.set('checklistTemplates', templates.filter(function(t) { return t.id !== templateId; }));
        APP.notify(T('dchk_template_deleted'), 'success');
        dchkRenderTemplates();
    });
}

/* ═══════════════════════ ASSIGN TAB ═══════════════════════ */

function dchkRenderAssign() {
    const content = document.getElementById('dchkContent');
    if (!content) return;
    const user = AUTH.currentUser();
    const templates = window.CHECKLISTS ? CHECKLISTS.listTemplates(user) : [];
    const users = DB.get('users') || [];
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;
    const empOptions = users.filter(function(u) { return !u.isSuperAdmin && u.role !== 'admin'; });
    content.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header"><h3>${T('dchk_assign_title')}</h3></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
                <div class="form-group" style="flex:1;min-width:180px;">
                    <label style="font-size:13px;">${T('dchk_select_template')}</label>
                    <select id="dchkAssignTemplate" class="form-control" onchange="dchkUpdateAssignEmployees()">
                        <option value="">${T('dchk_select_template')}</option>
                        ${templates.map(t => '<option value="' + t.id + '">' + t.title + ' (' + t.department + ')</option>').join('')}
                    </select>
                </div>
                <div class="form-group" style="flex:1;min-width:180px;">
                    <label style="font-size:13px;">${T('dchk_select_employee')}</label>
                    <select id="dchkAssignEmployee" class="form-control">
                        <option value="">${T('dchk_select_employee')}</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="dchkDoAssign()">${T('dchk_assign_btn')}</button>
            </div>
        </div>
        <div id="dchkAssignmentsList">${dchkRenderAssignments(user)}</div>
    `;
}

function dchkUpdateAssignEmployees() {
    const tplId = document.getElementById('dchkAssignTemplate')?.value;
    const empSelect = document.getElementById('dchkAssignEmployee');
    if (!empSelect || !tplId || !window.CHECKLISTS) return;
    const tpl = CHECKLISTS.getTemplate(tplId);
    if (!tpl) { empSelect.innerHTML = '<option value="">' + T('dchk_select_employee') + '</option>'; return; }
    const dept = tpl.department;
    const users = DB.get('users') || [];
    const inDept = users.filter(function(u) { return !u.isSuperAdmin && u.role !== 'admin' && u.department === dept; });
    if (inDept.length === 0) {
        empSelect.innerHTML = '<option value="">' + T('dchk_no_employees') + '</option>';
        return;
    }
    empSelect.innerHTML = '<option value="">' + T('dchk_select_employee') + '</option>' +
        inDept.map(u => '<option value="' + u.id + '">' + u.fullName + '</option>').join('');
}

function dchkDoAssign() {
    if (!window.CHECKLISTS) { APP.notify('Checklist system not loaded', 'error'); return; }
    const user = AUTH.currentUser();
    const tplId = document.getElementById('dchkAssignTemplate')?.value;
    const empId = document.getElementById('dchkAssignEmployee')?.value;
    if (!tplId || !empId) { APP.notify('Select template and employee', 'error'); return; }
    const tpl = CHECKLISTS.getTemplate(tplId);
    if (!tpl) return;
    const refs = tpl.items.map(function(it) { return { templateId: tplId, itemId: it.id }; });
    if (refs.length === 0) { APP.notify('Template has no items', 'error'); return; }
    const result = CHECKLISTS.assignToEmployee(user, {
        title: tpl.title,
        employeeId: empId,
        refs: refs
    });
    if (!result.success) { APP.notify(result.message, 'error'); return; }
    APP.notify(T('dchk_assigned_ok'), 'success');
    dchkRenderAssign();
}

function dchkRenderAssignments(user) {
    if (!window.CHECKLISTS) return '<div class="empty-state">System not loaded</div>';
    const assignments = CHECKLISTS.listAssignments(user, { activeOnly: true });
    if (assignments.length === 0) return '<div class="empty-state">' + T('dchk_no_templates') + '</div>';
    const canRevoke = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    return assignments.map(a => `
        <div class="card" style="margin-bottom:8px;">
            <div class="flex-between">
                <div>
                    <strong>${a.title}</strong>
                    <span style="display:block;font-size:12px;color:var(--gray);">${T('dchk_employee')}: ${a.employeeName} | ${a.department}</span>
                </div>
                ${canRevoke ? `<button class="btn btn-sm btn-danger" onclick="dchkRevokeAssignment('${a.id}')">${T('dchk_revoke_btn')}</button>` : ''}
            </div>
        </div>
    `).join('');
}

function dchkRevokeAssignment(assignmentId) {
    if (!window.CHECKLISTS) return;
    const user = AUTH.currentUser();
    const result = CHECKLISTS.revokeAssignment(user, assignmentId);
    if (!result.success) { APP.notify(result.message, 'error'); return; }
    APP.notify(T('dchk_revoked'), 'success');
    dchkRenderAssign();
}

/* ═══════════════════════ FILL TAB ═══════════════════════ */

const DCHK_STATUSES = ['ok', 'fault', 'report', 'na'];

let dchkFillState = {};

function dchkRenderFill() {
    const content = document.getElementById('dchkContent');
    if (!content) return;
    const user = AUTH.currentUser();
    if (!window.CHECKLISTS) {
        content.innerHTML = '<div class="empty-state">System not loaded</div>';
        return;
    }
    const myAssignments = CHECKLISTS.myAssignments(user);
    const dateStr = (typeof CHECKLISTS !== 'undefined' && CHECKLISTS.operDate) ? CHECKLISTS.operDate() : new Date().toISOString().slice(0, 10);

    if (myAssignments.length === 0) {
        content.innerHTML = '<div class="empty-state">' + T('dchk_no_assignments') + '</div>';
        return;
    }

    const needsFloor = CHECKLISTS.requiresFloor(user.department);

    let allFloors = [];
    if (needsFloor) {
        myAssignments.forEach(function(a) {
            var items = CHECKLISTS.resolveAssignmentItems(a);
            items.forEach(function(it) {
                if (it.floorName && allFloors.indexOf(it.floorName) === -1) {
                    allFloors.push(it.floorName);
                }
            });
        });
        allFloors.sort();
    }

    const selectedFloor = dchkFillState._selectedFloor || (allFloors.length > 0 ? allFloors[0] : '');

    var filtered = myAssignments;
    if (needsFloor && selectedFloor) {
        filtered = myAssignments.filter(function(a) {
            var items = CHECKLISTS.resolveAssignmentItems(a);
            return items.some(function(it) { return it.floorName === selectedFloor; });
        });
    }

    let html = '<h3 style="margin-bottom:12px;">' + T('dchk_fill_title') + '</h3>';

    if (needsFloor && allFloors.length > 1) {
        html += '<div class="form-group" style="margin-bottom:14px;max-width:300px;">';
        html += '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">📍 ' + T('dchk_select_floor') + '</label>';
        html += '<select class="form-control" onchange="dchkFillState._selectedFloor=this.value;dchkRenderFill()">';
        allFloors.forEach(function(f) {
            html += '<option value="' + f + '" ' + (f === selectedFloor ? 'selected' : '') + '>' + f + '</option>';
        });
        html += '</select></div>';
    }

    var dchkStatusColors = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', report: '#fd7e14', pending: '#e9ecef' };
    var dchkStatusBgs  = { ok: '#f0faf0', fault: '#fff5f5', na: '#f5f5f5', report: '#fff8f0', pending: 'var(--bg)' };

    var dchkFreqBg = { daily:'#e3f2fd', weekly:'#f3e5f5', monthly:'#e8f5e9' };
    var dchkFreqCl = { daily:'#1565c0', weekly:'#6a1b9a', monthly:'#2e7d32' };
    var dchkFreqIc = { daily:'🔄', weekly:'📅', monthly:'🗓️' };

    filtered.forEach(function(a) {
        const items = CHECKLISTS.resolveAssignmentItems(a);
        const alreadySubmitted = CHECKLISTS.hasAssignmentEntry(a.id, dateStr);
        const key = a.id;
        const draftKey = 'hms_dchk_draft_' + key;
        if (!dchkFillState[key]) {
            var savedDraft = null;
            try { savedDraft = JSON.parse(localStorage.getItem(draftKey)); } catch(e) {}
            if (savedDraft && typeof savedDraft === 'object') {
                dchkFillState[key] = savedDraft;
            } else {
                dchkFillState[key] = {};
                items.forEach(function(it) {
                    dchkFillState[key][it.itemId] = { status: 'pending', value: '', remarks: '' };
                });
            }
        }

        // Get frequency from template
        var af = 'daily';
        if (a.refs && a.refs.length > 0) {
            var t = CHECKLISTS.getTemplate(a.refs[0].templateId);
            if (t && t.frequency) af = t.frequency;
        }
        var afBg = dchkFreqBg[af] || '#e3f2fd';
        var afCl = dchkFreqCl[af] || '#1565c0';
        var afIc = dchkFreqIc[af] || '🔄';

        var assignmentFloor = '';
        if (needsFloor && items.length > 0) {
            assignmentFloor = items[0].floorName || '';
        }

        html += `
            <div class="card" style="margin-bottom:12px;${alreadySubmitted ? 'opacity:0.6;' : ''}">
                <div class="card-header">
                    <h3>${a.title} ${assignmentFloor ? '<span style="font-size:12px;color:var(--gray);font-weight:400;">📍 ' + assignmentFloor + '</span>' : ''} <span style="background:' + afBg + ';color:' + afCl + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">' + afIc + ' ' + (af.charAt(0).toUpperCase() + af.slice(1)) + '</span> <span style="font-size:12px;color:var(--gray);font-weight:400;">(${T('dchk_date_label')}: ${dateStr})</span></h3>
                    ${alreadySubmitted ? '<span class="badge badge-success">' + T('dchk_already_submitted') + '</span>' : ''}
                </div>
                <div style="max-height:300px;overflow-y:auto;">
                    ${items.length === 0 ? '<div class="empty-state">' + T('dchk_no_points') + '</div>' :
                    items.map(function(it) {
                        var st = dchkFillState[key][it.itemId] || { status: 'pending', value: '', remarks: '' };
                        var sel = st.status || 'pending';
                        var val = st.value || '';
                        var rem = st.remarks || '';
                        var sc = dchkStatusColors[sel] || '#e9ecef';
                        var sbg = dchkStatusBgs[sel] || 'var(--bg)';
                        var opts = DCHK_STATUSES.map(function(s) { return '<option value="' + s + '" ' + (sel === s ? 'selected' : '') + '>' + s.toUpperCase() + '</option>'; }).join('');
                        return '<div class="dchk-item" data-status="' + sel + '" data-item-id="' + it.itemId + '" data-key="' + key + '" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:' + sbg + ';font-size:13px;flex-wrap:wrap;">' +
                            '<span style="display:inline-block;min-width:70px;text-align:center;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:' + sc + ';flex-shrink:0;">' + (sel !== 'pending' ? sel.toUpperCase() : 'PENDING') + '</span>' +
                            '<span style="flex:1;min-width:120px;">' + it.label + '</span>' +
                            (it.unit ? '<input type="number" step="any" value="' + val + '" ' + (alreadySubmitted ? 'disabled' : '') + ' onchange="dchkFillState[\'' + key + '\'][\'' + it.itemId + '\'].value=this.value;try{localStorage.setItem(\'' + draftKey + '\',JSON.stringify(dchkFillState[\'' + key + '\']))}catch(e){}" style="width:80px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:12px;text-align:right;" placeholder="0">' : '') +
                            (it.unit ? '<span style="font-size:11px;font-weight:600;color:var(--gray);background:var(--card);padding:2px 7px;border-radius:4px;border:1px solid var(--border);flex-shrink:0;">' + it.unit + '</span>' : '') +
                            '<select ' + (alreadySubmitted ? 'disabled' : '') + ' onchange="dchkFillState[\'' + key + '\'][\'' + it.itemId + '\'].status=this.value;try{localStorage.setItem(\'' + draftKey + '\',JSON.stringify(dchkFillState[\'' + key + '\']))}catch(e){};dchkRenderFill()" style="width:auto;padding:3px 4px;border:1px solid var(--border);border-radius:4px;font-size:12px;flex-shrink:0;">' + opts + '</select>' +
                            '</div>';
                    }).join('')}
                </div>
                ${!alreadySubmitted ? '<div style="margin-top:10px;"><button class="btn btn-sm btn-success" onclick="dchkSubmitFill(\'' + a.id + '\')" style="font-size:11px;padding:3px 8px;">📤 ' + T('dchk_submit_btn') + '</button></div>' : ''}
            </div>`;
    });

    if (needsFloor && filtered.length === 0) {
        html += '<div class="empty-state">' + T('dchk_no_assignments') + '</div>';
    }

    content.innerHTML = html;
    try {
        content.querySelectorAll('.dchk-item[data-status="report"]').forEach(function(el) {
            var itemId = el.dataset.itemId;
            var key = el.dataset.key;
            if (!itemId || !key) return;
            var existing = el.querySelector('.dchk-problem-desc');
            if (existing) existing.remove();
            var div = document.createElement('div');
            div.className = 'dchk-problem-desc';
            div.style.cssText = 'width:100%;margin-top:6px;padding:8px;background:#fff3e0;border:1px solid #ffcc02;border-radius:6px;';
            div.innerHTML = '<div style="font-size:11px;font-weight:600;color:#e65100;margin-bottom:4px;">⚠️ Problem Description</div>'
                + '<textarea rows="2" placeholder="Describe the problem in detail..." style="width:100%;padding:8px;border:1px solid #ffb300;border-radius:4px;font-size:13px;resize:vertical;background:#fff;color:#333;">'
                + ((dchkFillState[key] && dchkFillState[key][itemId] && dchkFillState[key][itemId].remarks) || '')
                + '</textarea>';
            var ta = div.querySelector('textarea');
            ta.oninput = function() {
                if (dchkFillState[key] && dchkFillState[key][itemId]) {
                    dchkFillState[key][itemId].remarks = this.value;
                    try { localStorage.setItem('hms_dchk_draft_' + key, JSON.stringify(dchkFillState[key])); } catch(e) {}
                }
            };
            el.appendChild(div);
        });
    } catch(e) {
        if (content) content.insertAdjacentHTML('afterbegin', '<div style="background:#ffebee;color:#c62828;padding:4px;font-size:11px;">Error rendering: ' + e.message + '</div>');
    }
}

function dchkSubmitFill(assignmentId) {
    if (!window.CHECKLISTS) return;
    const user = AUTH.currentUser();
    const dateStr = (typeof CHECKLISTS !== 'undefined' && CHECKLISTS.operDate) ? CHECKLISTS.operDate() : new Date().toISOString().slice(0, 10);
    const draftKey = 'hms_dchk_draft_' + assignmentId;
    let state = dchkFillState[assignmentId] || {};
    if (!Object.keys(state).length) {
        try { state = JSON.parse(localStorage.getItem(draftKey)) || {}; } catch(e) {}
    }

    const items = CHECKLISTS.resolveAssignmentItems(assignmentId);
    let pendingCount = 0;
    items.forEach(function(it) {
        const key = it.itemId || it.id;
        const s = state[key] || state[it.itemId] || state[it.id] || {};
        if (!s.status || s.status === 'pending') pendingCount++;
    });

    if (items.length > 0 && pendingCount === items.length) {
        APP.notify('Please fill out the checklist items before submitting.', 'error');
        return;
    }
    if (pendingCount > 0) {
        if (!confirm('You have ' + pendingCount + ' item(s) still pending. Do you want to submit anyway?')) {
            return;
        }
    }

    const startResult = CHECKLISTS.startAssignmentEntry(user, assignmentId, dateStr);
    if (!startResult.success) { APP.notify(startResult.message, 'error'); return; }
    const entry = startResult.entry;
    entry.items.forEach(function(it) {
        var key = it.itemId || it.id;
        var resKey = entry.results[key] !== undefined ? key : (entry.results[it.itemId] !== undefined ? it.itemId : it.id);
        if (entry.results[resKey] !== undefined) {
            var s = state[key] || state[it.itemId] || state[it.id] || {};
            entry.results[resKey].status = s.status || 'pending';
            entry.results[resKey].value = s.value !== undefined ? s.value : '';
            entry.results[resKey].remarks = s.remarks || '';
        }
    });
    const submitResult = CHECKLISTS.submitAssignmentEntry(user, entry);
    if (!submitResult.success) { APP.notify(submitResult.message, 'error'); return; }
    try { localStorage.removeItem(draftKey); } catch(e) {}
    APP.notify(T('dchk_assigned_ok'), 'success');
    delete dchkFillState[assignmentId];
    dchkRenderFill();
}

/* ═══════════════════════ OVERSIGHT TAB ═══════════════════════ */

/* ═══════════════════════ OVERSIGHT TAB ═══════════════════════ */

function dchkRenderOversight() {
    const content = document.getElementById('dchkContent');
    if (!content) return;
    const user = AUTH.currentUser();
    if (!window.CHECKLISTS) {
        content.innerHTML = '<div class="empty-state">System not loaded</div>';
        return;
    }
    const depts = DB.get('departments') || [];
    const defaultDate = (typeof CHECKLISTS !== 'undefined' && CHECKLISTS.operDate) ? CHECKLISTS.operDate() : new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('dchkOversightDate');
    const dateStr = (dateInput && dateInput.value) ? dateInput.value : (dchkRenderOversight._dateStr || defaultDate);
    dchkRenderOversight._dateStr = dateStr;
    const selectedDept = document.getElementById('dchkOversightDept')?.value || '';

    content.innerHTML = `
        <div class="flex-between mb-4 flex-wrap" style="gap:12px;">
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:13px;font-weight:600;">${T('dchk_dept_filter')}</label>
                <select id="dchkOversightDept" class="form-control" onchange="dchkRenderOversight()">
                    <option value="">${T('dchk_select_dept')}</option>
                    ${depts.map(function(d) {
                        const val = d.name || d;
                        return '<option value="' + val + '" ' + (selectedDept === val ? 'selected' : '') + '>' + val + '</option>';
                    }).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:13px;font-weight:600;">📅 Date</label>
                <input type="date" id="dchkOversightDate" class="form-control" value="${dateStr}" onchange="dchkRenderOversight._dateStr=this.value;dchkRenderOversight()">
            </div>
        </div>
        <div id="dchkOversightBody">${selectedDept ? dchkRenderOversightDept(user, selectedDept, dateStr) : '<div class="empty-state">Select a department above to view oversight.</div>'}</div>
    `;
}

function dchkRenderOversightDept(user, dept, dateStr) {
    const asResult = CHECKLISTS.assignmentStatus(user, dept, dateStr);
    if (!asResult.success) return '<div class="empty-state">' + asResult.message + '</div>';
    const rows = asResult.assignments || [];
    const users = DB.get('users') || [];
    const empMap = {};
    users.forEach(function(u) { empMap[u.id] = u; });

    let html = '<div class="grid-2" style="margin-bottom:16px;">';
    if (rows.length === 0) {
        html += '<div class="empty-state" style="grid-column:1/-1;">' + T('dchk_no_templates') + '</div>';
    } else {
        rows.forEach(function(row) {
            const cls = row.filled ? 'badge-success' : 'badge-warning';
            const label = row.filled ? T('dchk_status_submitted') : T('dchk_status_pending');
            html += '<div class="card" style="padding:12px;">' +
                '<div><strong>' + (row.assignment.title || '') + '</strong></div>' +
                '<div style="font-size:12px;color:var(--gray);">' + T('dchk_employee') + ': ' + (row.assignment.employeeName || '') + '</div>' +
                '<div style="margin-top:6px;"><span class="badge ' + cls + '">' + label + '</span>' +
                (row.filledByName ? '<span style="font-size:11px;color:var(--gray);margin-left:6px;">by ' + row.filledByName + '</span>' : '') +
                '</div></div>';
        });
    }
    html += '</div>';

    const empAssignments = {};
    rows.forEach(function(r) {
        const eid = r.assignment.employeeId;
        if (!empAssignments[eid]) empAssignments[eid] = { name: r.assignment.employeeName || '?', total: 0, done: 0 };
        empAssignments[eid].total++;
        if (r.filled) empAssignments[eid].done++;
    });
    const empIds = Object.keys(empAssignments);
    if (empIds.length > 0) {
        html += '<div class="card"><div class="card-header"><h3>' + T('dchk_employee_summary') + '</h3></div><div class="table-responsive"><table><thead><tr>' +
            '<th>' + T('dchk_employee') + '</th><th>' + T('dchk_total_assigned') + '</th><th>' + T('dchk_completed') + '</th><th>' + T('dchk_rate') + '</th></tr></thead><tbody>';
        empIds.forEach(function(eid) {
            const e = empAssignments[eid];
            const rate = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
            html += '<tr><td><strong>' + e.name + '</strong></td><td>' + e.total + '</td><td>' + e.done + '</td><td>' +
                '<div class="progress-bar" style="width:60px;display:inline-block;"><div class="progress-fill ' + (rate > 70 ? 'green' : rate > 40 ? 'yellow' : 'red') + '" style="width:' + rate + '%;"></div></div>' +
                '<span style="margin-left:4px;font-size:12px;">' + rate + '%</span></td></tr>';
        });
        html += '</tbody></table></div></div>';
    }
    return html;
}

/* ═══════════════════════ SUBMISSION HISTORY TAB ═══════════════════════ */

function dchkRenderHistory() {
    const content = document.getElementById('dchkContent');
    if (!content) return;
    const user = AUTH.currentUser();
    const entries = DB.get('checklistEntries') || [];
    const depts = DB.get('departments') || [];

    const selectedDept = document.getElementById('dchkHistDept')?.value || '';
    const selectedDate = document.getElementById('dchkHistDate')?.value || '';

    let filtered = entries.slice();
    if (user.role !== 'admin' && !user.isSuperAdmin) {
        filtered = filtered.filter(e => e.department === user.department);
    }
    if (selectedDept) {
        filtered = filtered.filter(e => e.department === selectedDept);
    }
    if (selectedDate) {
        filtered = filtered.filter(e => e.date === selectedDate);
    }

    content.innerHTML = `
        <div class="flex-between mb-4 flex-wrap" style="gap:12px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:13px;font-weight:600;">Department Filter</label>
                    <select id="dchkHistDept" class="form-control" onchange="dchkRenderHistory()">
                        <option value="">All Departments</option>
                        ${depts.map(d => `<option value="${d.name || d}" ${selectedDept === (d.name || d) ? 'selected' : ''}>${d.name || d}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:13px;font-weight:600;">📅 Select Date</label>
                    <input type="date" id="dchkHistDate" class="form-control" value="${selectedDate}" onchange="dchkRenderHistory()">
                </div>
                ${selectedDate || selectedDept ? `<button class="btn btn-sm btn-secondary" style="margin-top:18px;" onclick="document.getElementById('dchkHistDept').value='';document.getElementById('dchkHistDate').value='';dchkRenderHistory();">Reset Filters</button>` : ''}
            </div>
            <div style="font-size:13px;color:var(--gray);margin-top:18px;">Total Submissions Found: <strong>${filtered.length}</strong></div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Department</th>
                            <th>Checklist Title</th>
                            <th>Submitted By</th>
                            <th>Submitted At</th>
                            <th>Items Count</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.length === 0 ? `<tr><td colspan="7" class="empty-state">No checklist submissions found matching selected filters.</td></tr>` :
                        filtered.slice().reverse().map(e => `
                            <tr>
                                <td><strong>${e.date || 'N/A'}</strong></td>
                                <td><span class="badge badge-info">${e.department || 'General'}</span></td>
                                <td>${e.assignmentTitle || e.templateTitle || 'Checklist'}</td>
                                <td>${e.filledByName || 'Staff'}</td>
                                <td>${APP.formatDateTime(e.submittedAt || e.startedAt)}</td>
                                <td>${(e.items || []).length} items</td>
                                <td><button class="btn btn-sm btn-primary" onclick="dchkViewEntryDetail('${e.id}')">View Details</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function dchkViewEntryDetail(id) {
    const entries = DB.get('checklistEntries') || [];
    const entry = entries.find(e => String(e.id) === String(id));
    if (!entry) { APP.notify('Checklist entry not found', 'error'); return; }

    const items = entry.items || [];
    const results = entry.results || {};

    let html = `
        <div class="modal-header">
            <h3>${entry.assignmentTitle || entry.templateTitle || 'Checklist Details'}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2 mb-4">
            <div><strong>Date:</strong> ${entry.date}</div>
            <div><strong>Submitted By:</strong> ${entry.filledByName || 'Staff'}</div>
            <div><strong>Department:</strong> ${entry.department || '-'}</div>
            <div><strong>Submitted At:</strong> ${APP.formatDateTime(entry.submittedAt || entry.startedAt)}</div>
        </div>
        <div class="card" style="padding:12px;max-height:300px;overflow-y:auto;">
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Checklist Item</th>
                            <th>Status</th>
                            <th>Value / Value Specified</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(it => {
                            const key = it.itemId || it.id;
                            const res = results[key] || results[it.itemId] || results[it.id] || {};
                            const st = res.status || 'pending';
                            const badgeCls = st === 'ok' ? 'badge-success' : (st === 'fault' ? 'badge-danger' : (st === 'report' ? 'badge-warning' : 'badge-secondary'));
                            return `
                                <tr>
                                    <td><strong>${it.label || it.name || key}</strong> ${it.unit ? '<span style="font-size:11px;color:var(--gray);">[' + it.unit + ']</span>' : ''}</td>
                                    <td><span class="badge ${badgeCls}">${st.toUpperCase()}</span></td>
                                    <td>${res.value !== undefined && res.value !== '' ? res.value + (it.unit ? ' ' + it.unit : '') : '-'}</td>
                                    <td>${res.remarks || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    showModal(html, true);
}
