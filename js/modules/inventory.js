let invView = 'items';

const INV_ITEM_NAME_MAP = {
    'surgical gloves': { hi: 'सर्जिकल ग्लव्स', gu: 'સર્જિકલ ગ્લોવ્સ' },
    'examination gloves': { hi: 'एग्जामिनेशन ग्लव्स', gu: 'એક્ઝામિનેશન ગ્લોવ્સ' },
    'sterile gloves': { hi: 'स्टेरिल ग्लव्स', gu: 'સ્ટેરાઈલ ગ્લોવ્સ' },
    'paracetamol': { hi: 'पैरासिटामोल', gu: 'પેરાસિટામોલ' },
    'paracetamol 500mg': { hi: 'पैरासिटामोल 500mg', gu: 'પેરાસિટામોલ 500mg' },
    'paracetamol 650mg': { hi: 'पैरासिटामोल 650mg', gu: 'પેરાસિટામોલ 650mg' },
    'syringe 5ml': { hi: 'सिरिंज 5ml', gu: 'સિરિંજ 5ml' },
    'syringe 10ml': { hi: 'सिरिंज 10ml', gu: 'સિરિંજ 10ml' },
    'syringe 2ml': { hi: 'सिरिंज 2ml', gu: 'સિરિંજ 2ml' },
    'syringe': { hi: 'सिरिंज', gu: 'સિરિંજ' },
    'n95 mask': { hi: 'N95 मास्क', gu: 'N95 માસ્ક' },
    'surgical mask': { hi: 'सर्जिकल मास्क', gu: 'સર્જિકલ માસ્ક' },
    'mask': { hi: 'मास्क', gu: 'માસ્ક' },
    'cotton roll': { hi: 'कॉटन रोल (रूई)', gu: 'કોટન રોલ (રૂ)' },
    'bandage': { hi: 'पट्टी (बैंडेज)', gu: 'પટ્ટી (બેન્ડેજ)' },
    'bandage 4 inch': { hi: 'पट्टी 4 इंच', gu: 'પટ્ટી 4 ઈંચ' },
    'oxygen cylinder': { hi: 'ऑक्सीजन सिलेंडर', gu: 'ઓક્સિજન સિલિન્ડર' },
    'stethoscope': { hi: 'स्टेथोस्कोप (आला)', gu: 'સ્ટેથોસ્કોપ' },
    'wheelchair': { hi: 'व्हीलचेयर', gu: 'વ્હીલચેર' },
    'icu bed sheet': { hi: 'ICU बेड शीट', gu: 'ICU બેડ શીટ' },
    'bed sheet': { hi: 'बेड शीट (चादर)', gu: 'બેડ શીટ (ચાદર)' },
    'hand sanitizer': { hi: 'हैंड सैनिटाइज़र', gu: 'હેન્ડ સેનિટાઈઝર' },
    'hand sanitizer 500ml': { hi: 'हैंड सैनिटाइज़र 500ml', gu: 'હેન્ડ સેનિટાઈઝર 500ml' },
    'iv set': { hi: 'IV सेट (ड्रिप)', gu: 'IV સેટ (ડ્રિપ)' },
    'thermometer': { hi: 'थर्मामीटर (तापमापी)', gu: 'થર્મોમીટર' },
    'digital thermometer': { hi: 'डिजिटल थर्मामीटर', gu: 'ડિજિટલ થર્મોમીટર' },
    'ecg paper roll': { hi: 'ECG पेपर रोल', gu: 'ECG પેપર રોલ' },
    'face shield': { hi: 'फेस शील्ड', gu: 'ફેસ શીલ્ડ' },
    'surgical blade': { hi: 'सर्जिकल ब्लेड', gu: 'સર્જિકલ બ્લેડ' },
    'catheter': { hi: 'कैथेटर', gu: 'કેથેટર' },
    'gauze swab': { hi: 'गौज स्वैब (पट्टी)', gu: 'ગોઝ સ્વેબ' },
    'adhesive tape': { hi: 'मेडिकल टेप', gu: 'મેડિકલ ટેપ' },
    'bp monitor': { hi: 'बीपी मॉनिटर', gu: 'BP મોનિટર' },
    'pulse oximeter': { hi: 'पल्स ऑक्सीमीटर', gu: 'પલ્સ ઓક્સિમીટર' },
    'disinfectant fluid': { hi: 'कीटाणुनाशक तरल', gu: 'જીવાણુનાશક પ્રવાહી' },
    'office paper a4': { hi: 'ऑफिस पेपर A4', gu: 'ઓફિસ પેપર A4' },
    'surgical scissors': { hi: 'सर्जिकल कैंची', gu: 'સર્જિકલ કાતર' },
    'saline water': { hi: 'सलाइन वाटर 500ml', gu: 'સેલાઈન વોટર 500ml' },
    'nebulizer kit': { hi: 'नेबुलाइजर किट', gu: 'નેબ્યુલાઈઝર કિટ' },
    'suction tube': { hi: 'सक्शन ट्यूब', gu: 'સક્શન ટ્યુબ' }
};

function getInvItemName(itemOrName, langOverride) {
    if (!itemOrName) return '';
    const lang = langOverride || (typeof I18N !== 'undefined' && typeof I18N.getLang === 'function' ? I18N.getLang() : 'en');
    
    let rawName = typeof itemOrName === 'object' ? (itemOrName.name || '') : String(itemOrName);
    if (!rawName) return '';

    if (lang === 'en') return rawName;

    if (typeof itemOrName === 'object') {
        if (lang === 'hi' && itemOrName.name_hi) return itemOrName.name_hi;
        if (lang === 'gu' && itemOrName.name_gu) return itemOrName.name_gu;
    }

    const key = rawName.trim().toLowerCase();
    if (INV_ITEM_NAME_MAP[key] && INV_ITEM_NAME_MAP[key][lang]) {
        return INV_ITEM_NAME_MAP[key][lang];
    }

    let translated = rawName;
    const words = [
        { en: 'surgical', hi: 'सर्जिकल', gu: 'સર્જિકલ' },
        { en: 'gloves', hi: 'ग्लव्स', gu: 'ગ્લોવ્સ' },
        { en: 'syringe', hi: 'सिरिंज', gu: 'સિરિંજ' },
        { en: 'mask', hi: 'मास्क', gu: 'માસ્ક' },
        { en: 'bandage', hi: 'बैंडेज', gu: 'બેન્ડેજ' },
        { en: 'cotton', hi: 'रूई (कॉटन)', gu: 'રૂ (કોટન)' },
        { en: 'needle', hi: 'सुई (नीडल)', gu: 'સોય (નીડલ)' },
        { en: 'paper', hi: 'पेपर', gu: 'પેપર' },
        { en: 'roll', hi: 'रोल', gu: 'રોલ' },
        { en: 'medicine', hi: 'दवा', gu: 'દવા' },
        { en: 'tablet', hi: 'टैबलेट', gu: 'ટેબ્લેટ' },
        { en: 'capsule', hi: 'कैप्सूल', gu: 'કેપ્સ્યુલ' },
        { en: 'injection', hi: 'इंजेक्शन', gu: 'ઇન્જેક્શન' },
        { en: 'sheet', hi: 'शीट', gu: 'શીટ' },
        { en: 'sanitizer', hi: 'सैनिटाइज़र', gu: 'સેનિટાઈઝર' }
    ];

    words.forEach(w => {
        const regex = new RegExp('\\b' + w.en + '\\b', 'gi');
        if (regex.test(translated) && w[lang]) {
            translated = translated.replace(regex, w[lang]);
        }
    });

    return translated;
}

if (typeof window !== 'undefined') {
    window.getInvItemName = getInvItemName;
}

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
    const u = AUTH.currentUser();
    const canBio = u && AUTH.hasPermission(u, 'biomedical-inventory');

    container.innerHTML = `
        <div class="tabs" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button class="tab-btn active" onclick="switchInvView('items',this)">${T('invmod_tab_items')}</button>
            <button class="tab-btn" onclick="switchInvView('stockout',this)">${T('invmod_tab_stock_out')}</button>
            <button class="tab-btn" onclick="switchInvView('dept',this)">${T('invmod_tab_dept')}</button>
            <button class="tab-btn" onclick="switchInvView('movements',this)">${T('invmod_tab_movements')}</button>
        </div>
        <div id="invContent">
            ${renderInvItemsTab()}
        </div>
    `;
    setTimeout(() => {
        renderInvList();
        initGlobalBarcodeScanner();
    }, 50);
}

function switchInvView(view, btn) {
    invView = view;
    document.querySelectorAll('#pageContent .tabs .tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
    });
    btn.classList.add('active');
    const content = document.getElementById('invContent');
    if (!content) return;
    if (view === 'items') {
        content.innerHTML = renderInvItemsTab();
        setTimeout(() => {
            renderInvList();
            initGlobalBarcodeScanner();
        }, 50);
    } else if (view === 'stockout') {
        content.innerHTML = renderInvStockOutTab();
        setTimeout(() => {
            renderInvStockOutView();
            initGlobalBarcodeScanner();
            const input = document.getElementById('quickStockOutScanInput');
            if (input) input.focus();
        }, 50);
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
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm" onclick="showInvForm()">${T('invmod_btn_add_item')}</button>
                <button class="btn btn-sm" style="background:#1e7e34;color:#fff;" onclick="invDownloadExcel()">📥 Excel</button>
                <button class="btn btn-sm" style="background:#c82333;color:#fff;" onclick="invDownloadPdf()">📄 PDF</button>
            </div>
        </div>

        <div class="card" style="padding:14px 18px;margin-bottom:16px;background:linear-gradient(135deg, #f0f7ff 0%, #e6f0fa 100%);border:1px solid #b8d5f3;box-shadow:0 2px 8px rgba(0,0,0,0.04);border-radius:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:700;font-size:15px;color:#1e40af;">${T('invmod_label_scan_barcode')}</span>
                    <span class="badge badge-success" style="font-size:11px;padding:3px 8px;border-radius:12px;">${T('invmod_scanner_status')}</span>
                </div>
                <div style="font-size:12px;color:#475569;font-weight:500;">
                    ${T('invmod_dual_barcode_hint')}
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <input type="text" id="barcodeScanInput" class="form-control" placeholder="${T('invmod_placeholder_scan_barcode')}" style="flex:1;min-width:220px;font-family:monospace;font-size:14px;border:1px solid #93c5fd;"
                    onkeydown="if(event.key==='Enter')handleBarcodeScan()">
                <button class="btn btn-primary btn-sm" style="padding:7px 16px;font-weight:600;" onclick="handleBarcodeScan()">${T('invmod_btn_find')}</button>
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
        const outCode = i.outBarcode || i.barcode || i.id.slice(-10);
        const inCode = i.inBarcode || '';

        return `<tr>
            <td>
                <div class="barcode-cell" style="cursor:pointer;" onclick="printBarcodeSticker('${i.id}')" title="${T('invmod_btn_print_sticker')}">
                    <svg class="barcode-svg" id="barcode_${i.id}" style="width:100px;height:26px;"></svg>
                    <div style="font-size:10px;font-weight:700;color:#1e3a8a;text-align:center;font-family:monospace;">${outCode}</div>
                    ${inCode ? `<div style="font-size:8px;color:#64748b;text-align:center;font-family:monospace;">IN: ${inCode}</div>` : ''}
                </div>
            </td>
            <td><strong>${getInvItemName(i)}</strong></td>
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
                <button class="btn btn-sm btn-info" onclick="printBarcodeSticker('${i.id}')" title="${T('invmod_btn_print_sticker')}">🖨️ Sticker</button>
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
                            <td><strong>${getInvItemName(i)}</strong></td>
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
            <h3>${T('invmod_receive_stock_prefix')}${getInvItemName(item)}</h3>
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
        <div class="modal-header"><h3>${T('invmod_issue_stock_prefix')}${getInvItemName(item)}</h3></div>
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
            <td style="font-weight:600;">${getInvItemName(m.itemName) || '-'}</td>
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

let scannerBuffer = '';
let scannerLastKeyTime = 0;
let stockOutSessionLogs = [];

function initGlobalBarcodeScanner() {
    if (window._inventoryScannerInitialized) return;
    window._inventoryScannerInitialized = true;

    window.addEventListener('keydown', (e) => {
        if (!document.getElementById('barcodeScanInput') && !document.getElementById('quickStockOutScanInput')) return;
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' && 
            document.activeElement.id !== 'barcodeScanInput' && 
            document.activeElement.id !== 'quickStockOutScanInput' && 
            document.activeElement.name !== 'inBarcode' && 
            document.activeElement.name !== 'outBarcode') {
            return;
        }

        const now = Date.now();
        if (now - scannerLastKeyTime > 150) {
            scannerBuffer = '';
        }
        scannerLastKeyTime = now;

        if (e.key === 'Enter') {
            if (scannerBuffer.length >= 3) {
                const code = scannerBuffer;
                scannerBuffer = '';
                e.preventDefault();
                if (invView === 'stockout') {
                    executeQuickStockOut(code);
                } else {
                    handleBarcodeScan(code);
                }
            }
        } else if (e.key.length === 1) {
            scannerBuffer += e.key;
        }
    });
}

function playAudioFeedback(success = true) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (success) {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else {
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch(e) {}
}

function renderInvStockOutTab() {
    const depts = DB.get('departments') || [];
    const deptOpts = depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('');

    return `
        <div class="card" style="padding:20px;margin-bottom:20px;background:linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);border:1px solid #fed7aa;border-radius:10px;box-shadow:0 4px 12px rgba(234, 88, 12, 0.08);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                <div>
                    <div style="font-weight:800;font-size:18px;color:#c2410c;display:flex;align-items:center;gap:8px;">
                        ${T('invmod_title_stock_out_tab')}
                        <span class="badge badge-warning" style="font-size:11px;padding:3px 8px;border-radius:12px;">${T('invmod_scanner_status')}</span>
                    </div>
                    <div style="font-size:13px;color:#7c2d12;margin-top:2px;">${T('invmod_subtitle_stock_out_tab')}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(255,255,255,0.7);padding:8px 14px;border-radius:8px;border:1px solid #ffedd5;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;font-weight:700;color:#9a3412;">${T('invmod_label_default_dept')}</span>
                        <select id="quickOutDept" class="form-control form-control-sm" style="width:140px;background:#fff;border-color:#fdba74;font-size:12px;">
                            <option value="">${T('invmod_opt_all')}</option>
                            ${deptOpts}
                        </select>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;font-weight:700;color:#9a3412;">${T('invmod_label_qty_per_scan')}</span>
                        <input type="number" id="quickOutQty" class="form-control form-control-sm" value="1" min="1" style="width:60px;background:#fff;border-color:#fdba74;text-align:center;font-weight:bold;">
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:10px;align-items:center;margin-top:14px;">
                <div style="position:relative;flex:1;">
                    <input type="text" id="quickStockOutScanInput" class="form-control form-control-lg" 
                        placeholder="${T('invmod_placeholder_scan_out')}" 
                        style="width:100%;font-family:monospace;font-size:16px;font-weight:bold;padding:12px 16px;border:2px solid #f97316;border-radius:8px;box-shadow:0 0 0 3px rgba(249,115,22,0.15);"
                        onkeydown="if(event.key==='Enter')executeQuickStockOut()">
                </div>
                <button class="btn btn-warning btn-lg" style="padding:10px 24px;font-weight:700;color:#fff;background:#ea580c;border:none;" onclick="executeQuickStockOut()">
                    📤 Auto-OUT
                </button>
            </div>

            <div id="quickOutBanner" style="margin-top:12px;display:none;"></div>
        </div>

        <div class="card" style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
                <div style="font-weight:700;font-size:15px;color:#1e293b;">${T('invmod_recent_out_log')}</div>
                <button class="btn btn-sm btn-outline" onclick="clearStockOutSessionLog()">Clear Log</button>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Item Name</th>
                            <th>OUT Barcode</th>
                            <th>Qty Issued</th>
                            <th>Issued To (Dept)</th>
                            <th>Issued By</th>
                            <th>Remaining Stock</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="quickOutLogBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function executeQuickStockOut(scannedCode) {
    const input = document.getElementById('quickStockOutScanInput');
    const banner = document.getElementById('quickOutBanner');
    const code = (scannedCode || input?.value || '').trim();
    if (!code) return;

    const dept = document.getElementById('quickOutDept')?.value || '';
    const issueQty = parseInt(document.getElementById('quickOutQty')?.value || '1') || 1;

    const items = DB.get('inventory') || [];
    const lowerCode = code.toLowerCase();

    // Match item by outBarcode, barcode, inBarcode, or id slice
    const item = items.find(i => 
        (i.outBarcode && i.outBarcode.toLowerCase() === lowerCode) || 
        (i.barcode && i.barcode.toLowerCase() === lowerCode) ||
        (i.inBarcode && i.inBarcode.toLowerCase() === lowerCode) ||
        (i.id && i.id.slice(-10).toLowerCase() === lowerCode)
    );

    if (!item) {
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `<div class="alert alert-danger" style="margin:0;padding:10px 14px;font-weight:600;">❌ No inventory item found with barcode "${code}". Scan a valid barcode.</div>`;
        }
        playAudioFeedback(false);
        if (input) input.value = '';
        return;
    }

    const currentQty = parseInt(item.quantity) || 0;
    if (currentQty < issueQty) {
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `<div class="alert alert-warning" style="margin:0;padding:10px 14px;font-weight:600;">⚠️ Cannot issue stock for "${getInvItemName(item)}": Only ${currentQty} ${item.unit || 'pcs'} available in inventory!</div>`;
        }
        playAudioFeedback(false);
        if (input) input.value = '';
        return;
    }

    // Process Stock OUT!
    const newQty = currentQty - issueQty;
    const user = AUTH.currentUser();
    const unitPrice = parseFloat(item.price) || 0;

    DB.update('inventory', item.id, { quantity: newQty });

    // Record movement
    const movement = DB.add('inventory_movements', {
        itemId: item.id,
        itemName: item.name,
        type: 'out',
        qty: issueQty,
        unit: item.unit || 'pcs',
        unitPrice: unitPrice,
        totalValue: issueQty * unitPrice,
        dept: dept || item.department || '',
        by: user ? user.fullName : 'Admin',
        notes: 'Quick Barcode Scan OUT',
        date: new Date().toISOString()
    });

    // Save session log
    const logEntry = {
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        id: item.id,
        name: item.name,
        name_hi: item.name_hi,
        name_gu: item.name_gu,
        barcode: item.outBarcode || item.barcode || item.id.slice(-10),
        qty: issueQty,
        unit: item.unit || 'pcs',
        dept: dept || item.department || 'General',
        by: user ? user.fullName : 'Admin',
        remQty: newQty,
        movementId: movement ? movement.id : null
    };
    stockOutSessionLogs.unshift(logEntry);

    // Banner notification
    if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<div class="alert alert-success" style="margin:0;padding:10px 14px;font-size:14px;font-weight:700;background:#dcfce7;color:#15803d;border:1px solid #86efac;">
            🎉 ${T('invmod_msg_out_success')} <strong>${issueQty} ${item.unit || 'pcs'}</strong> of <strong>${getInvItemName(item)}</strong> issued ${dept ? 'to ' + dept : ''}! (${newQty} ${item.unit || 'pcs'} ${T('invmod_msg_out_rem_stock')})
        </div>`;
    }

    playAudioFeedback(true);
    if (input) {
        input.value = '';
        input.focus();
    }

    renderInvStockOutView();
}

function renderInvStockOutView() {
    const tbody = document.getElementById('quickOutLogBody');
    if (!tbody) return;

    if (stockOutSessionLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray);">No stock issued out in this session. Scan any OUT barcode above to issue stock instantly.</td></tr>`;
        return;
    }

    tbody.innerHTML = stockOutSessionLogs.map((log, idx) => `
        <tr style="${idx === 0 ? 'background:#f0fdf4;' : ''}">
            <td style="font-size:12px;color:#64748b;">${log.time}</td>
            <td><strong>${getInvItemName(log)}</strong></td>
            <td><span style="font-family:monospace;font-size:11px;background:#e2e8f0;padding:2px 6px;border-radius:4px;font-weight:bold;">${log.barcode}</span></td>
            <td><span class="badge badge-warning" style="font-size:12px;font-weight:bold;">-${log.qty} ${log.unit}</span></td>
            <td><span class="badge badge-info">${log.dept}</span></td>
            <td style="font-size:12px;">${log.by}</td>
            <td><span class="badge ${log.remQty > 10 ? 'badge-success' : log.remQty > 0 ? 'badge-warning' : 'badge-danger'}">${log.remQty} ${log.unit}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 6px;" onclick="undoQuickStockOut(${idx})">↩️ Undo</button>
            </td>
        </tr>
    `).join('');
}

function clearStockOutSessionLog() {
    stockOutSessionLogs = [];
    renderInvStockOutView();
}

function undoQuickStockOut(index) {
    const log = stockOutSessionLogs[index];
    if (!log) return;
    const item = DB.getById('inventory', log.id);
    if (item) {
        const currentQty = parseInt(item.quantity) || 0;
        DB.update('inventory', item.id, { quantity: currentQty + log.qty });
        if (log.movementId) {
            DB.delete('inventory_movements', log.movementId);
        }
        APP.notify(`Restored +${log.qty} ${log.unit} to ${log.name}`, 'info');
    }
    stockOutSessionLogs.splice(index, 1);
    renderInvStockOutView();
}

function handleBarcodeScan(scannedCode) {
    const input = document.getElementById('barcodeScanInput');
    const result = document.getElementById('barcodeScanResult');
    const code = (scannedCode || input?.value || '').trim();
    if (!code) {
        if (result) result.textContent = T('invmod_msg_enter_scan_barcode');
        return;
    }

    const items = DB.get('inventory') || [];
    const lowerCode = code.toLowerCase();

    // 1. Check OUT Barcode match (2nd scan -> Issue / Stock OUT)
    const outItem = items.find(i => 
        (i.outBarcode && i.outBarcode.toLowerCase() === lowerCode) || 
        (i.barcode && i.barcode.toLowerCase() === lowerCode) ||
        (i.id && i.id.slice(-10).toLowerCase() === lowerCode)
    );

    if (outItem) {
        if (result) result.innerHTML = `📤 <strong>${T('invmod_label_out_barcode')}:</strong> ${outItem.name} (${outItem.quantity} ${outItem.unit || 'pcs'})`;
        if (input) input.value = '';
        APP.notify(`📤 OUT Barcode Matched: ${outItem.name}. Opening Stock OUT dialog...`, 'info');
        issueInvStock(outItem.id);
        return;
    }

    // 2. Check IN Barcode match (Existing item incoming shipment)
    const inItem = items.find(i => i.inBarcode && i.inBarcode.toLowerCase() === lowerCode);

    if (inItem) {
        if (result) result.innerHTML = `📥 <strong>${T('invmod_label_in_barcode')}:</strong> ${inItem.name} (${inItem.quantity} ${inItem.unit || 'pcs'})`;
        if (input) input.value = '';
        APP.notify(`📥 Incoming IN Barcode Matched: ${inItem.name}. Record received stock & print OUT sticker.`, 'info');
        receiveInvStock(inItem.id);
        return;
    }

    // 3. New Barcode Scanned for the 1st time! Open Add Item modal with IN barcode pre-filled
    if (result) result.innerHTML = `🆕 <strong>New Barcode:</strong> "${code}" — Opening Add Item Form...`;
    if (input) input.value = '';
    APP.notify(`🆕 New Material Barcode Scanned: "${code}". Fill item details & save to print OUT sticker!`, 'success');
    showInvForm({ inBarcode: code });
}

function showInvForm(item) {
    const depts = DB.get('departments') || [];
    const categories = ['Medical Equipment', 'Medicine', 'Surgical', 'Laboratory', 'Office Supplies', 'Cleaning', 'Bedding', 'Food', 'Other'];
    const isEdit = item && item.id;
    const inBarcodeVal = item?.inBarcode || (!isEdit && item?.inBarcode ? item.inBarcode : '');
    const outBarcodeVal = item?.outBarcode || item?.barcode || ('HMS-OUT-' + Date.now().toString(36).slice(-6).toUpperCase());

    const form = `
        <form id="invForm">
            <input type="hidden" name="id" value="${item?.id || ''}">
            
            <div class="card mb-3" style="background:#f8fafc;padding:12px;border:1px solid #cbd5e1;border-radius:6px;">
                <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    🏷️ Barcode Dual-Tracking System (TVS Scanner Ready)
                </div>
                <div class="grid-2" style="gap:10px;">
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:12px;font-weight:600;color:#334155;">${T('invmod_label_in_barcode')}</label>
                        <input type="text" name="inBarcode" class="form-control" value="${inBarcodeVal}" placeholder="Scanned incoming supplier barcode" style="font-family:monospace;background:#ffffff;">
                        <div style="font-size:10px;color:#64748b;margin-top:2px;">Scanned 1st time when new material arrives</div>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:12px;font-weight:600;color:#334155;">${T('invmod_label_out_barcode')}</label>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <input type="text" name="outBarcode" class="form-control" value="${outBarcodeVal}" placeholder="Auto-generated OUT sticker barcode" style="font-family:monospace;">
                            <button type="button" class="btn btn-sm btn-primary" onclick="generateBarcodeInput()">${T('invmod_btn_generate')}</button>
                        </div>
                        <div style="font-size:10px;color:#64748b;margin-top:2px;">Printed on sticker & scanned for Stock OUT</div>
                    </div>
                </div>
                <div id="barcodePreview" style="margin-top:8px;text-align:center;"></div>
                <div style="margin-top:8px;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" id="autoPrintSticker" ${!isEdit ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                    <label for="autoPrintSticker" style="font-size:13px;font-weight:600;color:#15803d;cursor:pointer;margin:0;">
                        🖨️ ${T('invmod_chk_auto_print_sticker')}
                    </label>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label>${T('invmod_label_item_name')} (English) *</label>
                    <input type="text" name="name" class="form-control" value="${item?.name || ''}" placeholder="e.g. Surgical Gloves" required>
                </div>
                <div class="form-group">
                    <label>Item Name (हिन्दी - Hindi)</label>
                    <input type="text" name="name_hi" class="form-control" value="${item?.name_hi || ''}" placeholder="उदा. सर्जिकल ग्लव्स (ऑटो/वैकल्पिक)">
                </div>
                <div class="form-group">
                    <label>Item Name (ગુજરાતી - Gujarati)</label>
                    <input type="text" name="name_gu" class="form-control" value="${item?.name_gu || ''}" placeholder="ઉદા. સર્જિકલ ગ્લોવ્સ (ઓટો/વૈકલ્પિક)">
                </div>
                <div class="form-group">
                    <label>${T('invmod_label_category')}</label>
                    <select name="category" class="form-control" required>
                        <option value="">${T('invmod_opt_select')}</option>
                        ${categories.map(c => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${invCategoryLabel(c)}</option>`).join('')}
                    </select>
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
    openFormModal(isEdit ? T('invmod_modal_edit_item') : T('invmod_modal_add_item'), form, `saveInv()`, true);
    setTimeout(() => {
        const bcInput = document.querySelector('[name="outBarcode"]');
        if (bcInput) { bcInput.oninput = () => previewBarcode(); previewBarcode(); }
    }, 200);
}

function generateBarcodeInput() {
    const input = document.querySelector('[name="outBarcode"]');
    if (!input) return;
    const code = 'HMS-OUT-' + Date.now().toString(36).slice(-6).toUpperCase();
    input.value = code;
    previewBarcode();
}

function previewBarcode() {
    const input = document.querySelector('[name="outBarcode"]');
    const preview = document.getElementById('barcodePreview');
    if (!input || !preview) return;
    const code = input.value.trim();
    preview.innerHTML = '';
    if (code && typeof JsBarcode !== 'undefined') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.width = '180px'; svg.style.height = '36px';
        preview.appendChild(svg);
        try { JsBarcode(svg, code, { format: 'CODE128', width: 1.5, height: 30, displayValue: false, margin: 0 }); }
        catch(e) {}
        preview.innerHTML += `<div style="font-size:10px;color:var(--gray);font-family:monospace;text-align:center;">${code}</div>`;
    }
}

function saveInv() {
    const form = document.getElementById('invForm');
    if (!form) return;
    const data = {};
    form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });
    if (!data.name || !data.category) { APP.notify(T('invmod_msg_name_category_required'), 'error'); return; }

    if (!data.outBarcode) {
        data.outBarcode = 'HMS-OUT-' + Date.now().toString(36).slice(-6).toUpperCase();
    }
    data.barcode = data.outBarcode;

    const autoPrint = document.getElementById('autoPrintSticker')?.checked;
    let savedId = data.id;

    if (data.id) {
        DB.update('inventory', data.id, data);
        APP.notify(T('invmod_msg_item_updated_barcode_prefix') + data.outBarcode, 'success');
    } else {
        const newItem = DB.add('inventory', data);
        savedId = newItem ? newItem.id : data.id;
        APP.notify(T('invmod_msg_item_added_barcode_prefix') + data.outBarcode, 'success');
    }

    renderInvList();

    if (autoPrint && savedId) {
        setTimeout(() => {
            printBarcodeSticker(savedId);
        }, 300);
    }
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

/* ═══ DOWNLOAD ═══ */
function invDownloadExcel() {
    const items = DB.get('inventory');
    if (!items || items.length === 0) { APP.notify('No inventory data', 'info'); return; }
    if (typeof XLSX === 'undefined') { APP.notify('Excel library not loaded', 'error'); return; }
    const headers = ['OUT Barcode', 'IN Barcode', 'Item Name', 'Category', 'Department', 'Quantity', 'Unit', 'Price/Unit', 'Total Value', 'Expiry', 'Status'];
    const rows = items.map(function (i) {
        var qty = parseFloat(i.quantity) || 0;
        var price = parseFloat(i.price) || 0;
        return [i.outBarcode || i.barcode || '', i.inBarcode || '', i.name || '', i.category || '', i.department || '', qty, i.unit || 'pcs', price, (qty * price).toFixed(2), i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('en-IN') : '-', i.status || 'in-stock'];
    });
    var title = 'Inventory_Report_' + new Date().toISOString().slice(0, 10);
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
    ws['!cols'] = headers.map(function (h, ci) {
        var max = h.length;
        rows.forEach(function (r) { var v = r[ci] != null ? String(r[ci]) : ''; if (v.length > max) max = v.length; });
        return { wch: Math.min(max + 3, 40) };
    });
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, title + '.xlsx');
    APP.notify('Inventory Excel downloaded!', 'success');
}

function invDownloadPdf() {
    const items = DB.get('inventory');
    if (!items || items.length === 0) { APP.notify('No inventory data', 'info'); return; }
    if (typeof window.jspdf === 'undefined') { APP.notify('PDF library not loaded', 'error'); return; }
    var doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Inventory Report', 14, 15);
    doc.setFontSize(9);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-IN'), 14, 22);
    var headers = [['OUT Barcode', 'IN Barcode', 'Item Name', 'Category', 'Department', 'Qty', 'Unit', 'Price', 'Value', 'Expiry', 'Status']];
    var rows = items.map(function (i) {
        var qty = parseFloat(i.quantity) || 0;
        var price = parseFloat(i.price) || 0;
        return [i.outBarcode || i.barcode || '', i.inBarcode || '', i.name || '', i.category || '', i.department || '', qty, i.unit || 'pcs', '₹' + price, '₹' + (qty * price).toFixed(2), i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('en-IN') : '-', i.status || 'in-stock'];
    });
    doc.autoTable({ head: headers, body: rows, startY: 27, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 126, 52] } });
    doc.save('Inventory_Report_' + new Date().toISOString().slice(0, 10) + '.pdf');
    APP.notify('Inventory PDF downloaded!', 'success');
}

function printBarcodeSticker(id, copies = 1) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const outCode = item.outBarcode || item.barcode || item.id.slice(-10);
    const inCode = item.inBarcode || '';

    const win = window.open('', '_blank', 'width=450,height=340');
    win.document.write(`
        <!DOCTYPE html>
        <html><head>
        <title>Sticker Print - ${getInvItemName(item)}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        <style>
            @page { size: 50mm 25mm; margin: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 6px; text-align: center; background: #fff; color: #000; }
            .sticker-card {
                border: 1px dashed #64748b;
                padding: 6px 8px;
                border-radius: 4px;
                display: inline-block;
                width: 220px;
                box-sizing: border-box;
                margin: 6px auto;
                background: #fff;
            }
            .header { font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; }
            .item-name { font-size: 12px; font-weight: 700; line-height: 1.2; max-height: 28px; overflow: hidden; margin-bottom: 4px; word-break: break-word; color: #0f172a; }
            .bcStickerSvg { width: 190px; height: 36px; margin: 2px 0; }
            .code-str { font-size: 11px; font-weight: bold; font-family: monospace; letter-spacing: 1px; color: #1e3a8a; }
            .sub-info { font-size: 8px; color: #475569; margin-top: 3px; display: flex; justify-content: space-between; font-weight: 500; }
            @media print {
                body { padding: 0; }
                .sticker-card { border: none; width: 100%; margin: 0; padding: 2mm; page-break-after: always; }
                .no-print { display: none !important; }
            }
        </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom:12px;padding:8px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;gap:10px;">
                <button onclick="window.print()" style="padding:6px 16px;background:#15803d;color:#fff;border:none;border-radius:4px;font-weight:bold;cursor:pointer;">🖨️ Print Label (${copies} Copy)</button>
                <button onclick="window.close()" style="padding:6px 12px;background:#64748b;color:#fff;border:none;border-radius:4px;cursor:pointer;">Close</button>
            </div>
            ${Array.from({length: copies}).map(() => `
                <div class="sticker-card">
                    <div class="header">STAVYA HMS · INVENTORY STICKER</div>
                    <div class="item-name">${getInvItemName(item)}</div>
                    <svg class="bcStickerSvg"></svg>
                    <div class="code-str">${outCode}</div>
                    <div class="sub-info">
                        <span>${inCode ? 'IN Ref: ' + inCode : item.category || ''}</span>
                        <span>${item.price ? '₹' + parseFloat(item.price).toFixed(2) : ''}</span>
                    </div>
                </div>
            `).join('')}
            <script>
                document.querySelectorAll('.bcStickerSvg').forEach(svg => {
                    try {
                        JsBarcode(svg, '${outCode}', { format: 'CODE128', width: 1.6, height: 32, displayValue: false, margin: 0 });
                    } catch(e) {}
                });
                setTimeout(() => { window.print(); }, 400);
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

function printBarcode(id) {
    printBarcodeSticker(id, 1);
}
