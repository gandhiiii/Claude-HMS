let invView = 'items';

function invStatusLabel(status) {
    if (status === 'in-stock') return T('invmod_status_in_stock');
    if (status === 'low-stock') return T('invmod_status_low_stock');
    return T('invmod_status_out_of_stock');
}

const INV_CATEGORY_KEYS = {
    'Medical Equipment': 'invmod_cat_medical_equipment',
    'Medicine': 'invmod_cat_medicine',
    'Surgical': 'invmod_cat_surgical',
    'Laboratory': 'invmod_cat_laboratory',
    'Office Supplies': 'invmod_cat_office_supplies',
    'Cleaning': 'invmod_cat_cleaning',
    'Bedding': 'invmod_cat_bedding',
    'Food': 'invmod_cat_food',
    'Other': 'invmod_cat_other'
};

function invCategoryLabel(cat) {
    const key = INV_CATEGORY_KEYS[cat];
    return key ? T(key) : cat;
}

function renderInventory(container) {
    container.innerHTML = `
        <div class="tabs" style="margin-bottom:16px;">
            <button class="tab-btn active" onclick="switchInvView('items',this)">${T('invmod_tab_items')}</button>
            <button class="tab-btn" onclick="switchInvView('dept',this)">${T('invmod_tab_dept')}</button>
            <button class="tab-btn" onclick="switchInvView('movements',this)">${T('invmod_tab_movements')}</button>
        </div>
        <div id="invContent">
            ${renderInvItemsTab()}
        </div>
    `;
    setTimeout(() => renderInvList(), 50);
}

function switchInvView(view, btn) {
    invView = view;
    document.querySelectorAll('#pageContent .tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const content = document.getElementById('invContent');
    if (!content) return;
    if (view === 'items') {
        content.innerHTML = renderInvItemsTab();
        setTimeout(() => renderInvList(), 50);
    } else if (view === 'dept') {
        content.innerHTML = renderInvDeptTab();
        setTimeout(() => renderInvDeptView(), 50);
    } else if (view === 'movements') {
        content.innerHTML = renderInvMovementsTab();
        setTimeout(() => renderInvMovementsView(), 50);
    }
}

function renderInvItemsTab() {
    return `
        <div class="flex-between mb-4" style="flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:8px;flex:2;min-width:200px;align-items:center;flex-wrap:wrap;">
                <input type="text" class="form-control" id="invSearch" placeholder="${T('invmod_placeholder_search')}" oninput="renderInvList()" style="flex:1;min-width:140px;max-width:300px;">
                <div style="display:flex;align-items:center;gap:4px;">
                    <span style="font-size:13px;font-weight:600;white-space:nowrap;">${T('invmod_label_dept')}</span>
                    <span style="width:160px;">${deptDropdown('invDeptDropdown', invDeptFilter)}</span>
                </div>
                <button class="btn btn-sm btn-outline" onclick="setInvDeptFilter('')" style="${!invDeptFilter ? 'display:none;' : ''}">${T('invmod_btn_clear')}</button>
            </div>
            <button class="btn btn-primary btn-sm" onclick="showInvForm()">${T('invmod_btn_add_item')}</button>
        </div>

        <div class="card" style="padding:12px 16px;margin-bottom:16px;background:#f0f6ff;border:1px solid #c2d7f8;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:14px;">${T('invmod_label_scan_barcode')}</span>
                <input type="text" id="barcodeScanInput" class="form-control" placeholder="${T('invmod_placeholder_scan_barcode')}" style="flex:1;min-width:180px;"
                    onkeydown="if(event.key==='Enter')handleBarcodeScan()">
                <button class="btn btn-primary btn-sm" onclick="handleBarcodeScan()">${T('invmod_btn_find')}</button>
                <span id="barcodeScanResult" style="font-size:13px;color:var(--gray);"></span>
            </div>
        </div>

        <div class="flex-between mb-2" style="align-items:center;">
            <div id="invDeptFilters" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
        </div>

        <div class="grid-4 mb-4" id="invStats"></div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>${T('invmod_th_barcode')}</th><th>${T('invmod_th_item_name')}</th><th>${T('invmod_th_category')}</th><th>${T('invmod_th_department')}</th><th>${T('invmod_th_qty')}</th>
                        <th>${T('invmod_th_unit_price')}</th><th>${T('invmod_th_value')}</th><th>${T('invmod_th_expiry')}</th><th>${T('invmod_th_lifecycle')}</th><th>${T('invmod_th_status')}</th><th>${T('invmod_th_actions')}</th>
                    </tr></thead>
                    <tbody id="invTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
}

let invDeptFilter = '';

function renderInvDeptFilters() {
    const items = DB.get('inventory');
    const depts = [...new Set(items.map(i => i.department).filter(Boolean))];
    const el = document.getElementById('invDeptFilters');
    if (!el) return;
    let html = `<button class="btn btn-sm ${!invDeptFilter ? 'btn-primary' : 'btn-outline'}" onclick="setInvDeptFilter('')">${T('invmod_btn_all')}</button>`;
    depts.forEach(d => {
        html += `<button class="btn btn-sm ${invDeptFilter === d ? 'btn-primary' : 'btn-outline'}" onclick="setInvDeptFilter('${d}')">${d}</button>`;
    });
    el.innerHTML = html;
}

function setInvDeptFilter(dept) {
    invDeptFilter = dept;
    renderInvDeptFilters();
    renderInvList();
}

function renderInvList() {
    const items = DB.get('inventory');
    const search = (document.getElementById('invSearch')?.value || '').toLowerCase();

    // Sync dropdown value with current filter
    const deptDropdown = document.querySelector('[name="invDeptDropdown"]');
    if (deptDropdown) {
        if (!deptDropdown._listener) {
            deptDropdown.addEventListener('change', function() {
                setInvDeptFilter(this.value);
            });
            deptDropdown._listener = true;
        }
        if (deptDropdown.value !== invDeptFilter) {
            deptDropdown.value = invDeptFilter || '';
        }
    }

    let filtered = items.filter(i =>
        i.name.toLowerCase().includes(search) ||
        i.category.toLowerCase().includes(search) ||
        (i.barcode || '').toLowerCase().includes(search)
    );
    if (invDeptFilter) {
        filtered = filtered.filter(i => i.department === invDeptFilter);
    }

    renderInvDeptFilters();

    const total = items.length;
    const lowStock = items.filter(i => parseInt(i.quantity) < 10).length;
    const expiring = items.filter(i => {
        if (!i.expiryDate) return false;
        const days = APP.daysBetween(new Date().toISOString(), i.expiryDate);
        return days >= 0 && days <= 30;
    }).length;
    const outOfStock = items.filter(i => parseInt(i.quantity) === 0).length;

    const statsEl = document.getElementById('invStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card" style="border-left-color:var(--primary)"><div class="stat-value">${total}</div><div class="stat-label">${T('invmod_stat_total_items')}</div></div>
            <div class="stat-card" style="border-left-color:var(--warning)"><div class="stat-value">${lowStock}</div><div class="stat-label">${T('invmod_stat_low_stock')}</div></div>
            <div class="stat-card" style="border-left-color:var(--danger)"><div class="stat-value">${expiring}</div><div class="stat-label">${T('invmod_stat_expiring')}</div></div>
            <div class="stat-card" style="border-left-color:var(--gray)"><div class="stat-value">${outOfStock}</div><div class="stat-label">${T('invmod_stat_out_of_stock')}</div></div>
        `;
    }

    const tbody = document.getElementById('invTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(i => {
        const qty = parseInt(i.quantity);
        const lifecyclePct = (i.purchaseDate && i.expiryDate) ? APP.lifecyclePercent(i.purchaseDate, i.expiryDate) : 0;
        const lifecycleColor = APP.lifecycleColor(lifecyclePct);
        const status = qty === 0 ? 'out-of-stock' : (qty < 10 ? 'low-stock' : 'in-stock');
        const barcode = i.barcode || i.id.slice(-10);

        return `<tr>
            <td>
                <div class="barcode-cell" style="cursor:pointer;" onclick="printBarcode('${i.id}')" title="Click to print barcode">
                    <svg class="barcode-svg" id="barcode_${i.id}" style="width:100px;height:28px;"></svg>
                    <div style="font-size:9px;color:var(--gray);text-align:center;">${barcode}</div>
                </div>
            </td>
            <td><strong>${i.name}</strong></td>
            <td>${i.category}</td>
            <td><span class="badge badge-info">${i.department || T('invmod_opt_all')}</span></td>
            <td>${qty} ${i.unit || 'pcs'}</td>
            <td style="font-size:12px;">${i.price ? '₹' + parseFloat(i.price).toFixed(2) : '-'}</td>
            <td style="font-size:12px;font-weight:600;">${i.price ? '₹' + (qty * parseFloat(i.price)).toFixed(2) : '-'}</td>
            <td style="font-size:12px;">${i.expiryDate ? APP.formatDate(i.expiryDate) : '-'}
                ${i.expiryDate && APP.daysBetween(new Date().toISOString(), i.expiryDate) <= 30 && APP.daysBetween(new Date().toISOString(), i.expiryDate) >= 0 ? ' ⚠️' : ''}
                ${i.expiryDate && APP.daysBetween(new Date().toISOString(), i.expiryDate) < 0 ? ' ❌' : ''}
            </td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill ${lifecycleColor}" style="width:${lifecyclePct}%"></div>
                </div>
                <div class="progress-label">${lifecyclePct}% used</div>
            </td>
            <td><span class="badge ${status === 'in-stock' ? 'badge-success' : status === 'low-stock' ? 'badge-warning' : 'badge-danger'}">${invStatusLabel(status)}</span></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="receiveInvStock('${i.id}')">${T('invmod_btn_in')}</button>
                <button class="btn btn-sm btn-warning" onclick="issueInvStock('${i.id}')" style="color:#fff;">${T('invmod_btn_out')}</button>
                <button class="btn btn-sm btn-primary" onclick="editInv('${i.id}')">${T('invmod_btn_edit')}</button>
                <button class="btn btn-sm btn-info" onclick="printBarcode('${i.id}')">🏷️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteInv('${i.id}')">${T('invmod_btn_del')}</button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="11" class="empty-state">' + T('invmod_no_items') + '</td></tr>';

    setTimeout(generateBarcodeSvgs, 100);
}

/* ─── Department Inventory View ─── */

function renderInvDeptTab() {
    return `
        <div class="flex-between mb-4">
            <div>
                <h3 style="margin:0;">${T('invmod_dept_view_title')}</h3>
                <span style="font-size:13px;color:var(--gray);">${T('invmod_dept_view_subtitle')}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:13px;font-weight:600;white-space:nowrap;">${T('invmod_label_jump_to')}</span>
                <span style="width:180px;">${deptDropdown('invDeptJump', '')}</span>
            </div>
        </div>
        <div id="invDeptView"></div>
    `;
}

function renderInvDeptView() {
    const items = DB.get('inventory');

    // Jump-to-department dropdown
    const jumpDropdown = document.querySelector('[name="invDeptJump"]');
    if (jumpDropdown && !jumpDropdown._listener) {
        jumpDropdown.addEventListener('change', function() {
            if (this.value) {
                const deptSection = document.getElementById('deptSection_' + this.value.replace(/\s+/g, '_'));
                if (deptSection) deptSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        jumpDropdown._listener = true;
    }

    const deptMap = {};
    items.forEach(i => {
        const d = i.department || 'Unassigned';
        if (!deptMap[d]) deptMap[d] = [];
        deptMap[d].push(i);
    });

    const depts = Object.keys(deptMap).sort();
    const el = document.getElementById('invDeptView');
    if (!el) return;
    if (depts.length === 0) {
        el.innerHTML = '<div class="card"><div class="empty-state">' + T('invmod_no_dept_inventory') + '</div></div>';
        return;
    }
    el.innerHTML = depts.map(d => {
        const data = deptMap[d];
        const totalItems = data.length;
        const totalQty = data.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
        const totalValue = data.reduce((s, i) => s + ((parseInt(i.quantity) || 0) * (parseFloat(i.price) || 0)), 0);
        return `<div class="card" style="margin-bottom:12px;" id="deptSection_${d.replace(/\s+/g, '_')}">
            <div class="card-header">
                <div class="flex-between">
                    <h3>🏢 ${d}</h3>
                    <span style="font-size:13px;color:var(--gray);">${totalItems}${T('invmod_items_sep')}${totalQty}${T('invmod_qty_sep')}${totalValue.toFixed(2)}${T('invmod_value_suffix')}</span>
                </div>
            </div>
            ${totalItems === 0 ? '<div class="empty-state">' + T('invmod_no_items_assigned') + '</div>' :
            `<div class="table-responsive">
                <table>
                    <thead><tr><th>${T('invmod_th_item')}</th><th>${T('invmod_th_category')}</th><th>${T('invmod_th_qty')}</th><th>${T('invmod_th_unit_price')}</th><th>${T('invmod_th_value')}</th><th>${T('invmod_th_status')}</th><th>${T('invmod_th_actions')}</th></tr></thead>
                    <tbody>${data.map(i => {
                        const qty = parseInt(i.quantity);
                        const price = parseFloat(i.price) || 0;
                        const value = qty * price;
                        const status = qty === 0 ? 'out-of-stock' : (qty < 10 ? 'low-stock' : 'in-stock');
                        return `<tr>
                            <td><strong>${i.name}</strong></td>
                            <td>${i.category}</td>
                            <td>${qty} ${i.unit || 'pcs'}</td>
                            <td>${price ? '₹' + price.toFixed(2) : '-'}</td>
                            <td style="font-weight:600;">${value ? '₹' + value.toFixed(2) : '-'}</td>
                            <td><span class="badge ${status === 'in-stock' ? 'badge-success' : status === 'low-stock' ? 'badge-warning' : 'badge-danger'}">${invStatusLabel(status)}</span></td>
                            <td><button class="btn btn-sm btn-success" onclick="receiveInvStock('${i.id}')">${T('invmod_btn_in')}</button> <button class="btn btn-sm btn-warning" onclick="issueInvStock('${i.id}')" style="color:#fff;">${T('invmod_btn_out')}</button> <button class="btn btn-sm btn-primary" onclick="editInv('${i.id}')">${T('invmod_btn_edit')}</button></td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>`}
        </div>`;
    }).join('');
}

function receiveInvStock(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const modal = showModal(`
        <div class="modal-header">
            <h3>${T('invmod_receive_stock_prefix')}${item.name}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px;">
            <div>
                <div style="font-size:13px;color:var(--gray);">${T('invmod_label_current_stock')}<strong>${item.quantity} ${item.unit || 'pcs'}</strong></div>
                <div style="font-size:13px;color:var(--gray);">${T('invmod_label_current_price')}${item.price ? '₹' + parseFloat(item.price).toFixed(2) : T('invmod_not_set')}</div>
            </div>
        </div>
        <div class="grid-2">
            <div class="form-group">
                <label>${T('invmod_label_qty_received')}</label>
                <input type="number" id="recQty" class="form-control" min="1" value="1">
            </div>
            <div class="form-group">
                <label>${T('invmod_label_unit_price_req')}</label>
                <input type="number" id="recPrice" class="form-control" step="0.01" min="0" value="${item.price || ''}" placeholder="${T('invmod_placeholder_cost_per_unit')}">
            </div>
        </div>
        <div class="form-group">
            <label>${T('invmod_label_supplier_source')}</label>
            <input type="text" id="recSource" class="form-control" placeholder="${T('invmod_placeholder_vendor_example')}">
        </div>
        <button class="btn btn-success btn-lg" style="width:100%;margin-top:8px;" onclick="saveReceiveStock('${id}')">${T('invmod_btn_record_receipt')}</button>
    `, false);
}

function saveReceiveStock(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const qty = parseInt(document.getElementById('recQty').value);
    const price = parseFloat(document.getElementById('recPrice').value);
    const source = document.getElementById('recSource').value || '';

    if (!qty || qty < 1) { APP.notify(T('invmod_msg_enter_valid_qty'), 'error'); return; }
    if (!price || price < 0) { APP.notify(T('invmod_msg_enter_valid_price'), 'error'); return; }

    const oldQty = parseInt(item.quantity) || 0;
    const oldPrice = parseFloat(item.price) || 0;
    const newQty = oldQty + qty;
    // Weighted average price
    const totalValue = (oldQty * oldPrice) + (qty * price);
    const avgPrice = newQty > 0 ? totalValue / newQty : price;

    DB.update('inventory', id, { quantity: newQty, price: avgPrice.toFixed(2) });

    // Record inbound transaction for reference
    DB.add('inventory_receipts', {
        itemId: id, itemName: item.name, quantity: qty, unitPrice: price, total: qty * price, source,
        department: item.department || ''
    });
    // Record in movement log for history and prediction
    const rcvUser = AUTH.currentUser();
    DB.add('inventory_movements', {
        itemId: id, itemName: item.name, type: 'in',
        qty: qty, unit: item.unit || 'pcs',
        unitPrice: price, totalValue: qty * price,
        dept: item.department || '', by: rcvUser ? rcvUser.fullName : 'Admin',
        notes: source ? T('invmod_source_prefix') + source : '', date: new Date().toISOString()
    });

    APP.notify(`${T('invmod_msg_received_prefix')}${qty} ${item.unit || 'pcs'}${T('invmod_msg_received_of')}${item.name} (₹${(qty * price).toFixed(2)})`, 'success');
    renderInvList();
    document.querySelector('.modal.active')?.remove();
}

/* ═══ STOCK OUT (ISSUE) ═══ */
function issueInvStock(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const depts = DB.get('departments') || [];
    const deptOpts = depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    showModal(`
        <div class="modal-header"><h3>${T('invmod_issue_stock_prefix')}${item.name}</h3></div>
        <div class="modal-body">
            <p style="font-size:13px;color:var(--gray);margin-bottom:12px;">${T('invmod_label_current_stock_issue')}<strong>${item.quantity || 0} ${item.unit || 'pcs'}</strong>${T('invmod_mid_unit_price')}<strong>₹${parseFloat(item.price || 0).toFixed(2)}</strong></p>
            <div class="form-group">
                <label>${T('invmod_label_qty_to_issue')}</label>
                <input type="number" id="issueQty" class="form-control" placeholder="${T('invmod_placeholder_e_g_10')}" min="1" max="${item.quantity || 0}">
            </div>
            <div class="form-group">
                <label>${T('invmod_label_issue_to_dept')}</label>
                <select id="issueDept" class="form-control"><option value="">${T('invmod_opt_select_department')}</option>${deptOpts}</select>
            </div>
            <div class="form-group">
                <label>${T('invmod_label_notes_purpose')}</label>
                <input type="text" id="issueNotes" class="form-control" placeholder="${T('invmod_placeholder_notes_example')}">
            </div>
            <button class="btn btn-warning btn-lg" style="width:100%;margin-top:8px;color:#fff;" onclick="saveIssueStock('${id}')">${T('invmod_btn_confirm_issue')}</button>
        </div>
    `, false);
}

function saveIssueStock(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const qty = parseInt(document.getElementById('issueQty').value);
    const dept = (document.getElementById('issueDept').value || '').trim();
    const notes = document.getElementById('issueNotes').value || '';
    if (!qty || qty < 1) { APP.notify(T('invmod_msg_enter_valid_qty'), 'error'); return; }
    const currentQty = parseInt(item.quantity) || 0;
    if (qty > currentQty) { APP.notify(`${T('invmod_msg_only_available_prefix')}${currentQty} ${item.unit || 'pcs'}${T('invmod_msg_available_suffix')}`, 'error'); return; }
    const user = AUTH.currentUser();
    const unitPrice = parseFloat(item.price) || 0;
    DB.update('inventory', id, { quantity: currentQty - qty });
    DB.add('inventory_movements', {
        itemId: id, itemName: item.name, type: 'out',
        qty: qty, unit: item.unit || 'pcs',
        unitPrice: unitPrice, totalValue: qty * unitPrice,
        dept: dept, by: user ? user.fullName : 'Admin',
        notes: notes, date: new Date().toISOString()
    });
    APP.notify(`${T('invmod_msg_issued_prefix')}${qty} ${item.unit || 'pcs'}${T('invmod_msg_issued_of')}${item.name}` + (dept ? `${T('invmod_msg_issued_to')}${dept}` : ''), 'success');
    renderInvList();
    document.querySelector('.modal.active')?.remove();
}

/* ═══ MOVEMENTS TAB ═══ */
function renderInvMovementsTab() {
    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
            <div style="font-weight:700;font-size:15px;">${T('invmod_movements_title')}</div>
            <div style="font-size:12px;color:var(--gray);">${T('invmod_movements_subtitle')}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select id="movTypeFilter" class="form-control" style="width:110px;" onchange="renderInvMovementsView()">
                <option value="">${T('invmod_opt_all_types')}</option>
                <option value="in">${T('invmod_opt_in_only')}</option>
                <option value="out">${T('invmod_opt_out_only')}</option>
            </select>
            <input type="text" id="movSearch" class="form-control" style="width:180px;" placeholder="${T('invmod_placeholder_search_movements')}" oninput="renderInvMovementsView()">
        </div>
    </div>
    <div id="movContent"></div>`;
}

function renderInvMovementsView() {
    const movements = (DB.get('inventory_movements') || []).slice().reverse();
    const typeF = (document.getElementById('movTypeFilter') || {}).value || '';
    const search = ((document.getElementById('movSearch') || {}).value || '').toLowerCase();
    const filtered = movements.filter(m => {
        if (typeF && m.type !== typeF) return false;
        if (search) {
            const hay = ((m.itemName || '') + (m.dept || '') + (m.by || '')).toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });
    const el = document.getElementById('movContent');
    if (!el) return;
    const _cu = AUTH.currentUser();
    const isAdmin = _cu && (_cu.role === 'admin' || _cu.role === 'super_admin');
    if (filtered.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray);">' + T('invmod_no_movements') + '</div>';
        return;
    }
    const totalIn  = filtered.filter(m => m.type === 'in').reduce((s,m) => s + (m.totalValue||0), 0);
    const totalOut = filtered.filter(m => m.type === 'out').reduce((s,m) => s + (m.totalValue||0), 0);
    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;">
        <div style="background:#e8f5e9;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:20px;">📥</div>
            <div style="font-size:16px;font-weight:700;color:#2e7d32;">${filtered.filter(m=>m.type==='in').length}</div>
            <div style="font-size:11px;color:var(--gray);">${T('invmod_label_in_movements')}</div>
            <div style="font-size:13px;font-weight:600;color:#2e7d32;">₹${totalIn.toFixed(2)}</div>
        </div>
        <div style="background:#fff3e0;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:20px;">📤</div>
            <div style="font-size:16px;font-weight:700;color:#e65100;">${filtered.filter(m=>m.type==='out').length}</div>
            <div style="font-size:11px;color:var(--gray);">${T('invmod_label_out_movements')}</div>
            <div style="font-size:13px;font-weight:600;color:#e65100;">₹${totalOut.toFixed(2)}</div>
        </div>
        <div style="background:#e3f2fd;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:20px;">📊</div>
            <div style="font-size:16px;font-weight:700;color:#1565c0;">${filtered.length}</div>
            <div style="font-size:11px;color:var(--gray);">${T('invmod_label_total_transactions')}</div>
            <div style="font-size:13px;font-weight:600;color:#1565c0;">₹${Math.abs(totalIn - totalOut).toFixed(2)}${T('invmod_net_suffix')}</div>
        </div>
    </div>
    <div class="table-responsive"><table class="data-table" style="font-size:13px;">
        <thead><tr><th>${T('invmod_th_date')}</th><th>${T('invmod_th_type')}</th><th>${T('invmod_th_item')}</th><th>${T('invmod_th_qty')}</th><th>${T('invmod_th_unit_price')}</th><th>${T('invmod_th_total_value')}</th><th>${T('invmod_th_dept_to')}</th><th>${T('invmod_th_by')}</th><th>${T('invmod_th_notes')}</th>${isAdmin ? '<th>' + T('invmod_th_action') + '</th>' : ''}</tr></thead>
        <tbody>`;
    filtered.forEach(m => {
        const isIn = m.type === 'in';
        html += `<tr>
            <td style="white-space:nowrap;">${APP.formatDate(m.date)}</td>
            <td><span class="badge ${isIn ? 'badge-success' : 'badge-warning'}" style="${isIn ? '' : 'color:#fff;background:#e65100;'}">${isIn ? T('invmod_badge_in') : T('invmod_badge_out')}</span></td>
            <td style="font-weight:600;">${m.itemName || '-'}</td>
            <td>${m.qty || 0} ${m.unit || ''}</td>
            <td>₹${parseFloat(m.unitPrice || 0).toFixed(2)}</td>
            <td style="font-weight:600;color:${isIn ? '#2e7d32' : '#e65100'};">${isIn ? '+' : '-'}₹${parseFloat(m.totalValue || 0).toFixed(2)}</td>
            <td>${m.dept || '-'}</td>
            <td>${m.by || '-'}</td>
            <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;">${m.notes || '-'}</td>
            ${isAdmin ? `<td><button onclick="deleteInvMovement('${m.id}')" class="btn btn-sm" style="background:#e53935;color:#fff;padding:3px 10px;border-radius:6px;font-size:12px;">${T('invmod_btn_delete_movement')}</button></td>` : ''}
        </tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
}

function deleteInvMovement(id) {
    const cu = AUTH.currentUser();
    if (!cu || (cu.role !== 'admin' && cu.role !== 'super_admin')) {
        APP.notify(T('invmod_msg_permission_denied'), 'error'); return;
    }
    if (!confirm(T('invmod_confirm_delete_movement'))) return;
    DB.delete('inventory_movements', id);
    APP.notify(T('invmod_msg_movement_deleted'), 'success');
    renderInvMovementsView();
}

function generateBarcodeSvgs() {
    if (typeof JsBarcode === 'undefined') return;
    document.querySelectorAll('.barcode-svg').forEach(el => {
        const id = el.id.replace('barcode_', '');
        const item = DB.getById('inventory', id);
        if (item) {
            const code = item.barcode || item.id.slice(-10);
            try {
                JsBarcode(el, code, {
                    format: 'CODE128', width: 1.2, height: 24,
                    displayValue: false, background: 'transparent', margin: 0
                });
            } catch(e) {}
        }
    });
}

function handleBarcodeScan() {
    const input = document.getElementById('barcodeScanInput');
    const result = document.getElementById('barcodeScanResult');
    const code = (input?.value || '').trim();
    if (!code) { result.textContent = T('invmod_msg_enter_scan_barcode'); return; }

    const items = DB.get('inventory');
    const item = items.find(i => (i.barcode || i.id.slice(-10)) === code);
    if (item) {
        result.innerHTML = `${T('invmod_found_prefix')}<strong>${item.name}</strong>${T('invmod_qty_prefix')}${item.quantity}) <button class="btn btn-sm btn-primary" onclick="editInv('${item.id}');document.getElementById('barcodeScanResult').textContent=''">${T('invmod_btn_edit')}</button>`;
        input.value = '';
    } else {
        result.innerHTML = `${T('invmod_not_found_prefix')}${code}${T('invmod_not_found_suffix')}`;
    }
}

function showInvForm(item) {
    const depts = DB.get('departments');
    const categories = ['Medical Equipment', 'Medicine', 'Surgical', 'Laboratory', 'Office Supplies', 'Cleaning', 'Bedding', 'Food', 'Other'];
    const barcode = item?.barcode || item?.id?.slice(-10) || '';
    const isNew = !item;

    const form = `
        <form id="invForm">
            <input type="hidden" name="id" value="${item?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('invmod_label_item_name')}</label>
                    <input type="text" name="name" class="form-control" value="${item?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_category')}</label>
                    <select name="category" class="form-control" required>
                        <option value="">${T('invmod_opt_select')}</option>
                        ${categories.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${invCategoryLabel(c)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_barcode_sku')}</label>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <input type="text" name="barcode" class="form-control" value="${barcode}" placeholder="${T('invmod_placeholder_auto_generated')}" style="font-family:monospace;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="generateBarcodeInput()">${T('invmod_btn_generate')}</button>
                    </div>
                    <div id="barcodePreview" style="margin-top:4px;"></div>
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_quantity')}</label>
                    <input type="number" name="quantity" class="form-control" value="${item?.quantity || 0}" min="0" required>
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_unit')}</label>
                    <select name="unit" class="form-control">
                        <option value="pcs" ${item?.unit === 'pcs' ? 'selected' : ''}>${T('invmod_unit_pieces')}</option>
                        <option value="box" ${item?.unit === 'box' ? 'selected' : ''}>${T('invmod_unit_box')}</option>
                        <option value="kg" ${item?.unit === 'kg' ? 'selected' : ''}>${T('invmod_unit_kg')}</option>
                        <option value="ltr" ${item?.unit === 'ltr' ? 'selected' : ''}>${T('invmod_unit_litre')}</option>
                        <option value="pack" ${item?.unit === 'pack' ? 'selected' : ''}>${T('invmod_unit_pack')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_unit_price')}</label>
                    <input type="number" name="price" class="form-control" step="0.01" min="0" value="${item?.price || ''}" placeholder="${T('invmod_placeholder_cost_per_unit')}">
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_purchase_date')}</label>
                    <input type="date" name="purchaseDate" class="form-control" value="${item?.purchaseDate ? item.purchaseDate.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_expiry_date')}</label>
                    <input type="date" name="expiryDate" class="form-control" value="${item?.expiryDate ? item.expiryDate.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_warranty_until')}</label>
                    <input type="date" name="warrantyDate" class="form-control" value="${item?.warrantyDate ? item.warrantyDate.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_supplier')}</label>
                    <input type="text" name="supplier" class="form-control" value="${item?.supplier || ''}">
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_department')}</label>
                    <select name="department" class="form-control">
                        <option value="">${T('invmod_opt_all')}</option>
                        ${depts.map(d => `<option value="${d.name}" ${item?.department === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_location_rack')}</label>
                    <input type="text" name="location" class="form-control" value="${item?.location || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>${T('invmod_label_notes')}</label>
                <textarea name="notes" class="form-control">${item?.notes || ''}</textarea>
            </div>
        </form>
    `;
    openFormModal(item ? T('invmod_modal_edit_item') : T('invmod_modal_add_item'), form, `saveInv()`, true);
    setTimeout(() => {
        const bcInput = document.querySelector('[name="barcode"]');
        if (bcInput) { bcInput.oninput = () => previewBarcode(); previewBarcode(); }
    }, 200);
}

function generateBarcodeInput() {
    const input = document.querySelector('[name="barcode"]');
    if (!input) return;
    const code = 'HMS' + Date.now().toString(36).slice(-6).toUpperCase();
    input.value = code;
    previewBarcode();
}

function previewBarcode() {
    const input = document.querySelector('[name="barcode"]');
    const preview = document.getElementById('barcodePreview');
    if (!input || !preview) return;
    const code = input.value.trim();
    preview.innerHTML = '';
    if (code && typeof JsBarcode !== 'undefined') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.width = '160px'; svg.style.height = '36px';
        preview.appendChild(svg);
        try { JsBarcode(svg, code, { format: 'CODE128', width: 1.5, height: 30, displayValue: false, margin: 0 }); }
        catch(e) {}
        preview.innerHTML += `<div style="font-size:10px;color:var(--gray);font-family:monospace;text-align:center;">${code}</div>`;
    }
}

function saveInv() {
    const form = document.getElementById('invForm');
    const data = {};
    form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });
    if (!data.name || !data.category) { APP.notify(T('invmod_msg_name_category_required'), 'error'); return; }

    if (!data.barcode) {
        data.barcode = 'HMS' + Date.now().toString(36).slice(-6).toUpperCase();
    }

    if (data.id) {
        DB.update('inventory', data.id, data);
        APP.notify(T('invmod_msg_item_updated_barcode_prefix') + data.barcode, 'success');
    } else {
        DB.add('inventory', data);
        APP.notify(T('invmod_msg_item_added_barcode_prefix') + data.barcode, 'success');
    }
    renderInvList();
}

function editInv(id) {
    const item = DB.getById('inventory', id);
    if (item) showInvForm(item);
}

function deleteInv(id) {
    confirmAction(T('invmod_confirm_delete_item'), () => {
        DB.delete('inventory', id);
        APP.notify(T('invmod_msg_item_deleted'), 'success');
        renderInvList();
    });
}

function printBarcode(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const code = item.barcode || item.id.slice(-10);

    const win = window.open('', '_blank', 'width=300,height=200');
    win.document.write(`
        <html><head>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        <style>body{text-align:center;padding:20px;font-family:Arial;margin:0;}
        .label{border:1px dashed #999;padding:12px;display:inline-block;margin:10px;}
        .name{font-size:13px;margin-bottom:4px;font-weight:600;}
        .code{font-size:10px;color:#666;font-family:monospace;margin-top:2px;}
        @media print{body{padding:0;}.label{border:none;}}
        <\/style></head><body>
        <div class="label">
            <div class="name">${item.name}</div>
            <svg id="bcPrint" style="width:200px;height:40px;"></svg>
            <div class="code">${code}</div>
            <div style="font-size:10px;color:#999;">${item.category} | ${item.location || ''}</div>
        </div>
        <script>
            try { JsBarcode(document.getElementById('bcPrint'), '${code}', {format:'CODE128',width:1.8,height:35,displayValue:false,margin:0}); } catch(e){}
            setTimeout(() => { window.print(); window.close(); }, 500);
        <\/script>
        </body></html>
    `);
    win.document.close();
}
