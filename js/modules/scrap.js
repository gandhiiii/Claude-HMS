// HMS — Scrap / Disposal Module
// Records scrap removal with category + unit + quantity.
// Access: Admin (super_admin/admin) + Facility/Maintenance/IT HOD only.

var SCRAP_UNITS_DEFAULT = ['KG', 'Gram', 'Ton', 'Piece', 'Parts', 'Machine', 'Carton', 'Bag', 'Litre', 'Other'];
var SCRAP_CATEGORIES_DEFAULT = [
    'Cardboard', 'Paper', 'Steel', 'MS', 'Aluminium', 'Plastics', 'Glass',
    'Wood', 'Copper', 'Wire / Cable', 'Electronics', 'Machine', 'Parts',
    'Furniture', 'Packaging', 'Iron', 'Foam', 'Rubber', 'Other'
];

function _scrapConfig() {
    var cfg = DB.get('scrapConfig');
    return cfg && typeof cfg === 'object' ? cfg : { units: [], categories: [] };
}

function _scrapUnits() {
    var custom = (_scrapConfig().units || []).filter(Boolean);
    var merged = custom.slice();
    SCRAP_UNITS_DEFAULT.forEach(function (u) { if (merged.indexOf(u) === -1) merged.push(u); });
    return merged;
}

function _scrapCategories() {
    var custom = (_scrapConfig().categories || []).filter(Boolean);
    var merged = custom.slice();
    SCRAP_CATEGORIES_DEFAULT.forEach(function (c) { if (merged.indexOf(c) === -1) merged.push(c); });
    return merged;
}

function renderScrap(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="scrapSearch" placeholder="🔍 Search category / unit / location…" oninput="renderScrapList()">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm" onclick="showScrapManage()" title="Add / remove categories & units">⚙️ Manage</button>
                <button class="btn btn-primary" onclick="showScrapForm()">➕ Record Scrap Removal</button>
            </div>
        </div>

        <div class="grid-3 mb-4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
            <div class="card stat-card"><div class="stat-label">Total Scrap Entries</div><div class="stat-value" id="scrapStatTotal">0</div></div>
            <div class="card stat-card"><div class="stat-label">Total Quantity</div><div class="stat-value" id="scrapStatQty">0</div></div>
            <div class="card stat-card"><div class="stat-label">This Week</div><div class="stat-value" id="scrapStatWeek">0</div></div>
        </div>

        <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <h4 style="margin:0;">🗑️ Scrap Removal Records</h4>
            </div>
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>Date</th><th>Category</th><th>Unit</th><th>Quantity</th>
                        <th>Location / Department</th><th>Recorded By</th><th>Note</th><th>Actions</th>
                    </tr></thead>
                    <tbody id="scrapTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderScrapList();
}

var _scrapSearch = '';

function renderScrapList() {
    const user = AUTH.currentUser();
    const items = DB.get('scraps') || [];
    _scrapSearch = (document.getElementById('scrapSearch')?.value || '').toLowerCase();

    const filtered = items.filter(i =>
        (i.category || '').toLowerCase().includes(_scrapSearch) ||
        (i.unit || '').toLowerCase().includes(_scrapSearch) ||
        (i.location || '').toLowerCase().includes(_scrapSearch) ||
        (i.recordedBy || '').toLowerCase().includes(_scrapSearch) ||
        (i.note || '').toLowerCase().includes(_scrapSearch)
    ).sort((a, b) => (b.disposalDate || b.createdAt || '').localeCompare(a.disposalDate || a.createdAt || ''));

    const totalQty = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const weekQty = items.filter(i => new Date(i.createdAt || i.disposalDate) >= weekStart).reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);

    const totalEl = document.getElementById('scrapStatTotal'); if (totalEl) totalEl.textContent = items.length;
    const qtyEl = document.getElementById('scrapStatQty'); if (qtyEl) qtyEl.textContent = totalQty.toLocaleString();
    const weekEl = document.getElementById('scrapStatWeek'); if (weekEl) weekEl.textContent = weekQty.toLocaleString();

    const tbody = document.getElementById('scrapTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(i => `
        <tr>
            <td>${APP.formatDate(i.disposalDate || i.createdAt)}</td>
            <td><span class="badge badge-info">${_escScrap(i.category || '-')}</span></td>
            <td>${_escScrap(i.unit || '-')}</td>
            <td><strong>${_escScrap(i.quantity)}</strong></td>
            <td>${_escScrap(i.location || '-')}</td>
            <td>${_escScrap(i.recordedBy || '-')}</td>
            <td style="max-width:180px;">${_escScrap(i.note || '-')}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewScrap('${i.id}')">👁️ View</button>
                <button class="btn btn-sm btn-danger" onclick="confirmScrapDelete('${i.id}')">🗑️ Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">No scrap records yet. Click "Record Scrap Removal" to add one.</td></tr>';
}

function _escScrap(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showScrapForm() {
    const catOptions = _scrapCategories().map(c => `<option value="${c}">${c}</option>`).join('');
    const unitOptions = _scrapUnits().map(u => `<option value="${u}">${u}</option>`).join('');
    const form = `
        <form id="scrapForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>Category <span style="color:var(--danger);">*</span></label>
                    <select name="category" class="form-control" required onchange="scrapCategoryToggled(this)">
                        ${catOptions}
                        <option value="__other">Other / Custom…</option>
                    </select>
                </div>
                <div class="form-group" id="scrapCustomCatGroup" style="display:none;">
                    <label>Custom Category</label>
                    <input type="text" name="customCategory" class="form-control" placeholder="e.g. Brass">
                </div>
                <div class="form-group">
                    <label>Unit <span style="color:var(--danger);">*</span></label>
                    <select name="unit" class="form-control" required onchange="scrapUnitToggled(this)">
                        ${unitOptions}
                        <option value="__other">Other / Custom…</option>
                    </select>
                </div>
                <div class="form-group" id="scrapCustomUnitGroup" style="display:none;">
                    <label>Custom Unit</label>
                    <input type="text" name="customUnit" class="form-control" placeholder="e.g. Boxes">
                </div>
                <div class="form-group">
                    <label>Quantity <span style="color:var(--danger);">*</span></label>
                    <input type="number" step="any" min="0" name="quantity" class="form-control" placeholder="e.g. 50" required>
                </div>
                <div class="form-group">
                    <label>Disposal Date</label>
                    <input type="date" name="disposalDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Location / Department</label>
                    <input type="text" name="location" class="form-control" placeholder="e.g. Store Room 2F">
                </div>
                <div class="form-group">
                    <label>Approximately Value (₹)</label>
                    <input type="number" step="any" min="0" name="approxValue" class="form-control" placeholder="Optional scrap value">
                </div>
            </div>
            <div class="form-group">
                <label>Note / Description</label>
                <textarea name="note" class="form-control" rows="2" placeholder="e.g. Old pipes removed during renovation"></textarea>
            </div>
        </form>
    `;
    openFormModal('🗑️ Record Scrap Removal', form, `saveScrapItem()`);
}

function scrapCategoryToggled(sel) {
    const isOther = sel.value === '__other';
    document.getElementById('scrapCustomCatGroup').style.display = isOther ? 'block' : 'none';
    const input = document.getElementById('scrapCustomCatGroup').querySelector('input');
    if (isOther) input.required = true; else { input.required = false; input.value = ''; }
}

function scrapUnitToggled(sel) {
    const isOther = sel.value === '__other';
    document.getElementById('scrapCustomUnitGroup').style.display = isOther ? 'block' : 'none';
    const input = document.getElementById('scrapCustomUnitGroup').querySelector('input');
    if (isOther) input.required = true; else { input.required = false; input.value = ''; }
}

function saveScrapItem() {
    const user = AUTH.currentUser();
    const data = getFormData('scrapForm');
    if (!data.category || data.category === '__other') data.category = (data.customCategory || '').trim() || 'Other';
    if (!data.unit || data.unit === '__other') data.unit = (data.customUnit || '').trim() || 'Other';
    const qty = parseFloat(data.quantity);
    if (isNaN(qty) || qty <= 0) {
        APP.notify('Please enter a valid quantity', 'error');
        return false;
    }
    data.quantity = qty;
    data.approxValue = (data.approxValue && data.approxValue !== '') ? parseFloat(data.approxValue) : null;
    data.createdBy = user ? (user.username || '') : '';
    data.recordedBy = user ? (user.fullName || user.username || 'Admin') : 'Admin';
    data.department = user ? (user.department || '') : '';
    data.createdAt = new Date().toISOString();
    DB.add('scraps', data);
    APP.notify('Scrap removal recorded ✓', 'success');
    renderScrapList();
}

function viewScrap(id) {
    const i = DB.getById('scraps', id);
    if (!i) return;
    showModal(`
        <div class="modal-header">
            <h3>🗑️ Scrap Record</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>Category:</strong> <span class="badge badge-info">${_escScrap(i.category)}</span></div>
            <div><strong>Unit:</strong> ${_escScrap(i.unit)}</div>
            <div><strong>Quantity:</strong> ${_escScrap(i.quantity)}</div>
            <div><strong>Disposal Date:</strong> ${APP.formatDate(i.disposalDate || i.createdAt)}</div>
            <div><strong>Location:</strong> ${_escScrap(i.location || '-')}</div>
            <div><strong>Recorded By:</strong> ${_escScrap(i.recordedBy || '-')}</div>
            ${i.approxValue != null ? `<div><strong>Approx Value:</strong> ₹${_escScrap(i.approxValue)}</div>` : ''}
            ${i.department ? `<div><strong>Department:</strong> ${_escScrap(i.department)}</div>` : ''}
        </div>
        ${i.note ? `<div class="mt-4"><strong>Note:</strong><br>${_escScrap(i.note)}</div>` : ''}
        <div class="mt-4" style="font-size:11px;color:var(--gray);">Recorded ${APP.formatDateTime(i.createdAt)}</div>
    `);
}

function confirmScrapDelete(id) {
    confirmAction('Delete this scrap record?', () => {
        DB.delete('scraps', id);
        APP.notify('Scrap record deleted', 'success');
        renderScrapList();
    });
}

/* ── Manage categories & units (synced to cloud via scrapConfig) ── */
function showScrapManage() {
    const cats = _scrapCategories();
    const units = _scrapUnits();
    const catChips = cats.map((c, i) => `
        <span style="display:inline-flex;align-items:center;gap:6px;background:#eef2fb;border:1px solid #c5cee8;border-radius:14px;padding:4px 10px;font-size:12px;">
            ${_escScrap(c)}
            <button onclick="scrapRemoveCat('${_escScrap(c).replace(/'/g, "\\'")}')" style="border:none;background:none;cursor:pointer;color:#e53935;font-size:13px;line-height:1;" title="Remove">×</button>
        </span>`).join('');
    const unitChips = units.map((u, i) => `
        <span style="display:inline-flex;align-items:center;gap:6px;background:#e8f5e9;border:1px solid #bfdcc4;border-radius:14px;padding:4px 10px;font-size:12px;">
            ${_escScrap(u)}
            <button onclick="scrapRemoveUnit('${_escScrap(u).replace(/'/g, "\\'")}')" style="border:none;background:none;cursor:pointer;color:#e53935;font-size:13px;line-height:1;" title="Remove">×</button>
        </span>`).join('');
    const html = `
        <div class="modal-header">
            <h3>⚙️ Manage Scrap Categories & Units</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <p style="font-size:12px;color:var(--gray);margin-bottom:12px;">Add or remove the values available in the scrap form. Changes sync to the cloud for all devices.</p>
        <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                <strong style="font-size:13px;">Categories</strong>
                <input type="text" id="scrapNewCat" class="form-control" style="width:160px;" placeholder="e.g. Brass">
                <button class="btn btn-sm btn-primary" onclick="scrapAddCat()">➕ Add</button>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${catChips || '<span style="color:#aaa;font-size:12px;">No categories</span>'}</div>
        </div>
        <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                <strong style="font-size:13px;">Units</strong>
                <input type="text" id="scrapNewUnit" class="form-control" style="width:160px;" placeholder="e.g. Boxes">
                <button class="btn btn-sm btn-primary" onclick="scrapAddUnit()">➕ Add</button>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${unitChips || '<span style="color:#aaa;font-size:12px;">No units</span>'}</div>
        </div>
        <div style="display:flex;justify-content:flex-end;">
            <button class="btn" onclick="this.closest('.modal').remove()">Close</button>
        </div>`;
    showModal(html);
}

function _scrapSaveConfig(next) {
    DB.set('scrapConfig', next);
}

function scrapAddCat() {
    const val = (document.getElementById('scrapNewCat').value || '').trim();
    if (!val) { APP.notify('Enter a category name', 'error'); return; }
    const cfg = _scrapConfig();
    if (!cfg.categories) cfg.categories = [];
    if (cfg.categories.indexOf(val) === -1 && SCRAP_CATEGORIES_DEFAULT.indexOf(val) === -1) {
        cfg.categories.push(val);
        _scrapSaveConfig(cfg);
        APP.notify('Category added', 'success');
    } else {
        APP.notify('Category already exists', 'warning');
    }
    showScrapManage();
}

function scrapRemoveCat(name) {
    const cfg = _scrapConfig();
    cfg.categories = (cfg.categories || []).filter(c => c !== name);
    _scrapSaveConfig(cfg);
    APP.notify('Category removed', 'success');
    showScrapManage();
}

function scrapAddUnit() {
    const val = (document.getElementById('scrapNewUnit').value || '').trim();
    if (!val) { APP.notify('Enter a unit name', 'error'); return; }
    const cfg = _scrapConfig();
    if (!cfg.units) cfg.units = [];
    if (cfg.units.indexOf(val) === -1 && SCRAP_UNITS_DEFAULT.indexOf(val) === -1) {
        cfg.units.push(val);
        _scrapSaveConfig(cfg);
        APP.notify('Unit added', 'success');
    } else {
        APP.notify('Unit already exists', 'warning');
    }
    showScrapManage();
}

function scrapRemoveUnit(name) {
    const cfg = _scrapConfig();
    cfg.units = (cfg.units || []).filter(u => u !== name);
    _scrapSaveConfig(cfg);
    APP.notify('Unit removed', 'success');
    showScrapManage();
}