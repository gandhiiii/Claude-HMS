// HMS Inventory — Dedicated Linen & Uniform Sub-System
// Comprehensive support for Scrubs, Colors, Sizes (S to XXXXL + Custom), Date/Year, Price, Qty,
// Dual Barcode Tracking, 50x25mm Sticker Printing, and Department-wise In & Out.

const UNIFORM_SCRUB_TYPES = [
    'Scrub Suit (Top + Pants)',
    'Scrub Top',
    'Scrub Pants',
    'Doctor Apron / Coat',
    'Nurse Uniform (Full Set)',
    'OT Scrub (Sterile)',
    'ICU Scrub',
    'Security Guard Uniform',
    'Housekeeping Uniform',
    'Technician Coat',
    'Ward Attendant Uniform',
    'Other (Custom Uniform)'
];

const UNIFORM_COLORS = [
    { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Ceil Blue', hex: '#38bdf8' },
    { name: 'Teal Green', hex: '#0d9488' },
    { name: 'Hospital Green', hex: '#15803d' },
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Surgical Blue', hex: '#0284c7' },
    { name: 'Maroon / Wine', hex: '#831843' },
    { name: 'White', hex: '#f8fafc', border: '#cbd5e1' },
    { name: 'Black', hex: '#0f172a' },
    { name: 'Charcoal Grey', hex: '#475569' },
    { name: 'Lavender', hex: '#a855f7' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Other / Custom', hex: '#6b7280' }
];

const UNIFORM_STANDARD_SIZES = [
    'Small (S)',
    'Medium (M)',
    'Large (L)',
    'XL',
    'XXL',
    'XXXL',
    'XXXXL'
];

const LINEN_ITEMS_PRESET = [
    'Cotton Bed Sheet (White)',
    'Bed Sheet (Hospital Green)',
    'Bed Sheet (Sky Blue)',
    'Pillow Cover (White)',
    'Pillow Cover (Green)',
    'ICU Blanket (Heavy Woolen)',
    'Thermal Blanket',
    'Patient Gown (Adult)',
    'Patient Gown (Pediatric)',
    'Surgeon Gown (OT)',
    'OT Drape Sheet',
    'Bath Towel',
    'Hand Towel',
    'Mattress Protector (Waterproof)',
    'Quilt / Duvet',
    'Other (Custom Linen)'
];

const LINEN_COLORS = [
    { name: 'Hospital White', hex: '#ffffff', border: '#cbd5e1' },
    { name: 'Hospital Green (OT)', hex: '#15803d' },
    { name: 'Sea Green / Mint', hex: '#10b981' },
    { name: 'Sky Blue (Ward)', hex: '#38bdf8' },
    { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Teal / Turquoise', hex: '#0d9488' },
    { name: 'Pink / Maternity', hex: '#ec4899' },
    { name: 'Peach / Apricot', hex: '#fb923c' },
    { name: 'Lavender / Lilac', hex: '#a855f7' },
    { name: 'Light Yellow / Cream', hex: '#fef08a', border: '#e2e8f0' },
    { name: 'Beige / Khaki', hex: '#d4b996' },
    { name: 'Charcoal Grey', hex: '#475569' },
    { name: 'Wine / Maroon', hex: '#831843' },
    { name: 'Purple / Violet', hex: '#7e22ce' },
    { name: 'Striped (Blue & White)', hex: '#60a5fa' },
    { name: 'Striped (Green & White)', hex: '#4ade80' },
    { name: 'Printed / Floral', hex: '#f472b6' },
    { name: 'Other / Custom', hex: '#64748b' }
];

const LINEN_STANDARD_SIZES = [
    'Single Bed (60" × 90")',
    'Double Bed (90" × 100")',
    'ICU Bed (Special Size)',
    'Stretcher Size (45" × 80")',
    'Pillow Standard (18" × 27")',
    'Small (S)',
    'Medium (M)',
    'Large (L)',
    'XL',
    'XXL'
];

function getCustomUniformSizes() {
    return DB.get('customUniformSizes') || [];
}

function saveCustomUniformSize(size) {
    if (!size || typeof size !== 'string') return;
    size = size.trim();
    if (!size || size === '__custom__') return;
    const list = getCustomUniformSizes();
    if (!UNIFORM_STANDARD_SIZES.includes(size) && !list.includes(size)) {
        list.push(size);
        DB.set('customUniformSizes', list);
    }
}

function getCustomLinenSizes() {
    return DB.get('customLinenSizes') || [];
}

function saveCustomLinenSize(size) {
    if (!size || typeof size !== 'string') return;
    size = size.trim();
    if (!size || size === '__custom__') return;
    const list = getCustomLinenSizes();
    if (!LINEN_STANDARD_SIZES.includes(size) && !list.includes(size)) {
        list.push(size);
        DB.set('customLinenSizes', list);
    }
}

// Auto seed sample uniform and linen items if empty
function ensureUniformAndLinenSeed() {
    const inv = DB.get('inventory') || [];
    const hasUniform = inv.some(i => i.category === 'Uniform' || i.isUniform);
    if (!hasUniform) {
        const seedYear = new Date().getFullYear();
        const sampleUniforms = [
            {
                id: 'inv_uni_1',
                name: 'Scrub Suit (Top + Pants)',
                category: 'Uniform',
                isUniform: true,
                color: 'Navy Blue',
                size: 'Large (L)',
                department: 'OT',
                quantity: 45,
                unit: 'sets',
                price: '950.00',
                purchaseDate: new Date().toISOString().slice(0, 10),
                year: seedYear,
                inBarcode: 'VEN-SCR-01',
                outBarcode: 'HMS-UNI-101',
                barcode: 'HMS-UNI-101',
                supplier: 'MedWear Healthcare Apparels',
                location: 'OT Linen Wardrobe Rack A'
            },
            {
                id: 'inv_uni_2',
                name: 'Scrub Suit (Top + Pants)',
                category: 'Uniform',
                isUniform: true,
                color: 'Ceil Blue',
                size: 'Medium (M)',
                department: 'ICU',
                quantity: 38,
                unit: 'sets',
                price: '950.00',
                purchaseDate: new Date().toISOString().slice(0, 10),
                year: seedYear,
                inBarcode: 'VEN-SCR-02',
                outBarcode: 'HMS-UNI-102',
                barcode: 'HMS-UNI-102',
                supplier: 'MedWear Healthcare Apparels',
                location: 'ICU Staff Locker Room'
            },
            {
                id: 'inv_uni_3',
                name: 'OT Scrub (Sterile)',
                category: 'Uniform',
                isUniform: true,
                color: 'Teal Green',
                size: 'XL',
                department: 'OT',
                quantity: 24,
                unit: 'sets',
                price: '1100.00',
                purchaseDate: new Date().toISOString().slice(0, 10),
                year: seedYear,
                inBarcode: 'VEN-SCR-03',
                outBarcode: 'HMS-UNI-103',
                barcode: 'HMS-UNI-103',
                supplier: 'SterileTex India',
                location: 'OT Sterile Dressing'
            },
            {
                id: 'inv_uni_4',
                name: 'Doctor Apron / Coat',
                category: 'Uniform',
                isUniform: true,
                color: 'White',
                size: 'Medium (M)',
                department: 'Doctor / Clinical',
                quantity: 30,
                unit: 'pcs',
                price: '650.00',
                purchaseDate: new Date().toISOString().slice(0, 10),
                year: seedYear,
                inBarcode: 'VEN-DOC-04',
                outBarcode: 'HMS-UNI-104',
                barcode: 'HMS-UNI-104',
                supplier: 'DoctorCare Garments',
                location: 'Doctors Lounge Cabinet 2'
            },
            {
                id: 'inv_uni_5',
                name: 'Nurse Uniform (Full Set)',
                category: 'Uniform',
                isUniform: true,
                color: 'Hospital Green',
                size: 'Small (S)',
                department: 'Nursing',
                quantity: 40,
                unit: 'sets',
                price: '850.00',
                purchaseDate: new Date().toISOString().slice(0, 10),
                year: seedYear,
                inBarcode: 'VEN-NUR-05',
                outBarcode: 'HMS-UNI-105',
                barcode: 'HMS-UNI-105',
                supplier: 'MedWear Healthcare Apparels',
                location: 'Nursing Station Locker'
            }
        ];
        sampleUniforms.forEach(u => inv.push(u));
        DB.set('inventory', inv);
    }
}

/* ═══════════════════════════════════════════════════════════
   UNIFORM SECTION (Scrubs, Colors, Sizes S-XXXXL, Barcode In/Out)
══════════════════════════════════════════════════════════════ */
let uniSearchText = '';
let uniDeptFilter = '';
let uniSizeFilter = '';
let uniColorFilter = '';

function renderInvUniformTab() {
    ensureUniformAndLinenSeed();
    const depts = (DB.get('departments') || []).map(d => d.name).filter(Boolean);
    const standardDepts = ['Nursing', 'OT', 'ICU', 'Emergency', 'Biomedical', 'Housekeeping', 'Security', 'OPD', 'Doctor / Clinical', 'General Ward'];
    const allDepts = Array.from(new Set([...standardDepts, ...depts]));

    return `
        <div class="card" style="padding:16px 20px;margin-bottom:16px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#fff;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.12);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h3 style="margin:0;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;">
                        👔 Uniform &amp; Scrub Inventory Management
                    </h3>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">
                        Hospital scrubs, doctor aprons, nursing attire, sizing (Small to XXXXL + Custom), and department-wise In &amp; Out tracking
                    </p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="showNewUniformForm()" style="background:#2563eb;border-color:#2563eb;font-weight:600;padding:7px 14px;">
                        ➕ New Uniform Entry
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="showUniformInOutModal()" style="font-weight:600;padding:7px 14px;color:#fff;">
                        ⇄ Uniform In / Out (Barcode)
                    </button>
                    <button class="btn btn-sm" onclick="invDownloadUniformExcel()" style="background:#16a34a;color:#fff;border:none;padding:7px 12px;font-weight:600;">
                        📥 Excel
                    </button>
                    <button class="btn btn-sm" onclick="invDownloadUniformPdf()" style="background:#dc2626;color:#fff;border:none;padding:7px 12px;font-weight:600;">
                        📄 PDF
                    </button>
                </div>
            </div>
        </div>

        <div class="card mb-3" style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px 16px;border-radius:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#166534;">
                    📷 TVS USB Barcode Scanner (Uniform In &amp; Out)
                </div>
                <div style="font-size:11px;color:#15803d;">
                    Scan any uniform sticker to instantly launch Department In/Out transaction
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input type="text" id="uniformScanInput" class="form-control" placeholder="Scan or enter uniform barcode (e.g. HMS-UNI-101)" 
                       style="flex:1;min-width:240px;font-family:monospace;background:#fff;border:1px solid #86efac;font-size:13px;"
                       onkeydown="if(event.key==='Enter')handleUniformBarcodeScan(this.value)">
                <button class="btn btn-sm btn-success" onclick="handleUniformBarcodeScan(document.getElementById('uniformScanInput').value)" style="padding:6px 16px;font-weight:600;">
                    🔍 Lookup / In-Out
                </button>
                <span id="uniformScanStatus" style="font-size:12px;font-weight:600;"></span>
            </div>
        </div>

        <div class="grid-4 mb-4" id="uniformKpiGrid"></div>

        <div class="card mb-3" style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <input type="text" id="uniSearch" class="form-control" placeholder="Search by scrub type, color, size, barcode..." 
                       value="${uniSearchText}" oninput="uniSearchText=this.value;renderInvUniformView()" style="flex:2;min-width:180px;">
                
                <select id="uniDeptSelect" class="form-control" style="flex:1;min-width:140px;" onchange="uniDeptFilter=this.value;renderInvUniformView()">
                    <option value="">All Departments</option>
                    ${allDepts.map(d => `<option value="${d}" ${uniDeptFilter===d?'selected':''}>${d}</option>`).join('')}
                </select>

                <select id="uniSizeSelect" class="form-control" style="flex:1;min-width:130px;" onchange="uniSizeFilter=this.value;renderInvUniformView()">
                    <option value="">All Sizes</option>
                    ${UNIFORM_STANDARD_SIZES.map(s => `<option value="${s}" ${uniSizeFilter===s?'selected':''}>${s}</option>`).join('')}
                    ${getCustomUniformSizes().map(s => `<option value="${s}" ${uniSizeFilter===s?'selected':''}>${s} (Custom)</option>`).join('')}
                </select>

                <select id="uniColorSelect" class="form-control" style="flex:1;min-width:130px;" onchange="uniColorFilter=this.value;renderInvUniformView()">
                    <option value="">All Colors</option>
                    ${UNIFORM_COLORS.map(c => `<option value="${c.name}" ${uniColorFilter===c.name?'selected':''}>${c.name}</option>`).join('')}
                </select>

                <button class="btn btn-sm btn-outline" onclick="uniSearchText='';uniDeptFilter='';uniSizeFilter='';uniColorFilter='';renderInvUniformView()">
                    Reset
                </button>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <h4 style="margin:0;font-size:14px;font-weight:700;">👔 Uniform Items &amp; Stock Balance</h4>
                <span id="uniCountBadge" class="badge badge-info" style="font-size:12px;"></span>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th style="width:130px;">Barcode &amp; Sticker</th>
                            <th>Scrub / Uniform Type</th>
                            <th>Color</th>
                            <th>Size</th>
                            <th>Department</th>
                            <th>In-Stock Qty</th>
                            <th>Price / Unit</th>
                            <th>Total Value</th>
                            <th>Date &amp; Year</th>
                            <th>Status</th>
                            <th style="width:170px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="uniformTableBody"></tbody>
                </table>
            </div>
        </div>

        <div class="grid-2 mb-4">
            <div class="card">
                <div class="card-header">
                    <h4 style="margin:0;font-size:14px;font-weight:700;">🏥 Department-wise Uniform Allocation</h4>
                </div>
                <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                    <table class="table-sm">
                        <thead><tr><th>Department</th><th>Active Items</th><th>Total Qty</th><th>Valuation</th></tr></thead>
                        <tbody id="uniDeptBreakdownBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h4 style="margin:0;font-size:14px;font-weight:700;">🕒 Recent In &amp; Out Movements</h4>
                </div>
                <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                    <table class="table-sm">
                        <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Department</th></tr></thead>
                        <tbody id="uniRecentMovementsBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderInvUniformView() {
    ensureUniformAndLinenSeed();
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Uniform' || i.isUniform);
    const search = uniSearchText.toLowerCase();

    const filtered = items.filter(i => {
        const matchSearch = !search || 
            (i.name || '').toLowerCase().includes(search) || 
            (i.color || '').toLowerCase().includes(search) || 
            (i.size || '').toLowerCase().includes(search) || 
            (i.outBarcode || i.barcode || '').toLowerCase().includes(search) || 
            (i.department || '').toLowerCase().includes(search);
        const matchDept = !uniDeptFilter || i.department === uniDeptFilter;
        const matchSize = !uniSizeFilter || i.size === uniSizeFilter;
        const matchColor = !uniColorFilter || i.color === uniColorFilter;
        return matchSearch && matchDept && matchSize && matchColor;
    });

    // KPIs
    const totalItems = items.length;
    const totalQty = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);
    const lowStock = items.filter(i => (parseInt(i.quantity) || 0) < (parseInt(i.minQty) || 10)).length;
    const totalVal = items.reduce((sum, i) => sum + ((parseInt(i.quantity) || 0) * (parseFloat(i.price) || 0)), 0);

    const kpi = document.getElementById('uniformKpiGrid');
    if (kpi) {
        kpi.innerHTML = `
            <div class="stat-card" style="border-left-color:#2563eb;">
                <div class="stat-value">${totalItems}</div>
                <div class="stat-label">Uniform Variants</div>
            </div>
            <div class="stat-card" style="border-left-color:#16a34a;">
                <div class="stat-value">${totalQty}</div>
                <div class="stat-label">Total In-Stock Qty</div>
            </div>
            <div class="stat-card" style="border-left-color:#ea580c;">
                <div class="stat-value">${lowStock}</div>
                <div class="stat-label">Low Stock Alerts</div>
            </div>
            <div class="stat-card" style="border-left-color:#9333ea;">
                <div class="stat-value">₹${totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="stat-label">Total Inventory Valuation</div>
            </div>
        `;
    }

    const badge = document.getElementById('uniCountBadge');
    if (badge) badge.textContent = `${filtered.length} of ${items.length} items`;

    const tbody = document.getElementById('uniformTableBody');
    if (tbody) {
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:28px;color:#64748b;">No uniform items found matching the selected filters. Click "+ New Uniform Entry" to add scrubs or uniforms.</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map(i => {
                const qty = parseInt(i.quantity) || 0;
                const price = parseFloat(i.price) || 0;
                const val = qty * price;
                const outCode = i.outBarcode || i.barcode || i.id;
                const isOutOfStock = qty === 0;
                const isLowStock = !isOutOfStock && qty < (parseInt(i.minQty) || 10);
                const status = isOutOfStock ? 'out-of-stock' : (isLowStock ? 'low-stock' : 'in-stock');
                const statusLabel = isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock');
                const statusClass = isOutOfStock ? 'badge-danger' : (isLowStock ? 'badge-warning' : 'badge-success');

                const colorObj = UNIFORM_COLORS.find(c => c.name.toLowerCase() === (i.color || '').toLowerCase()) || { hex: '#475569' };
                const rowStyle = isOutOfStock ? 'background:#fff8f8;border-left:3px solid #ef4444;' : (isLowStock ? 'background:#fffdfa;border-left:3px solid #f59e0b;' : '');

                return `
                    <tr class="${isOutOfStock ? 'inv-row-out-of-stock' : (isLowStock ? 'inv-row-low-stock' : '')}" style="${rowStyle}">
                        <td>
                            <div class="barcode-cell" style="cursor:pointer;" onclick="printBarcodeSticker('${i.id}')" title="Click to print 50×25mm Sticker with 8mm roll gap">
                                <svg class="barcode-svg" id="barcode_${i.id}" style="width:105px;height:26px;"></svg>
                                <div style="font-size:10px;font-weight:700;color:#1e3a8a;text-align:center;font-family:monospace;">${outCode}</div>
                            </div>
                        </td>
                        <td>
                            <strong style="${isOutOfStock ? 'color:#b91c1c;' : (isLowStock ? 'color:#92400e;' : '')}">${i.name}</strong>
                            ${i.fabric ? `<div style="font-size:11px;color:#64748b;">${i.fabric}</div>` : ''}
                        </td>
                        <td>
                            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:12px;background:#f1f5f9;font-size:12px;font-weight:600;">
                                <span style="width:10px;height:10px;border-radius:50%;background:${colorObj.hex};border:1px solid ${colorObj.border || 'rgba(0,0,0,0.1)'};"></span>
                                ${i.color || 'Standard'}
                            </span>
                        </td>
                        <td>
                            <span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:700;font-size:11px;">
                                ${i.size || 'Free Size'}
                            </span>
                        </td>
                        <td><span class="badge badge-info">${i.department || 'All Departments'}</span></td>
                        <td>
                            <div style="display:flex;align-items:center;gap:5px;">
                                <button class="btn btn-xs" style="padding:1px 6px;min-width:22px;" onclick="quickUniformQtyAdjust('${i.id}', -1)">−</button>
                                <strong style="font-size:13px;min-width:24px;text-align:center;${isOutOfStock ? 'color:#dc2626;' : (isLowStock ? 'color:#d97706;' : '')}">${qty}</strong>
                                <button class="btn btn-xs" style="padding:1px 6px;min-width:22px;" onclick="quickUniformQtyAdjust('${i.id}', 1)">+</button>
                                <span style="font-size:11px;color:#64748b;">${i.unit || 'pcs'}</span>
                            </div>
                        </td>
                        <td style="font-size:12px;">₹${price.toFixed(2)}</td>
                        <td style="font-size:12px;font-weight:600;">₹${val.toFixed(2)}</td>
                        <td style="font-size:11px;color:#475569;">
                            <div>${i.purchaseDate ? APP.formatDate(i.purchaseDate) : '-'}</div>
                            ${i.year ? `<span style="font-size:10px;color:#64748b;">Yr: ${i.year}</span>` : ''}
                        </td>
                        <td style="text-align:center;">
                            ${isOutOfStock ? `
                                <div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 12px;border-radius:14px;background:#fef2f2;color:#ef4444;font-size:10px;font-weight:700;line-height:1.2;text-align:center;border:1px solid #fee2e2;letter-spacing:0.3px;white-space:nowrap;box-shadow:0 1px 2px rgba(239,68,68,0.06);">
                                    <span>OUT OF</span>
                                    <span>STOCK</span>
                                </div>
                            ` : (isLowStock ? `
                                <div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 12px;border-radius:14px;background:#fffbeb;color:#d97706;font-size:10px;font-weight:700;line-height:1.2;text-align:center;border:1px solid #fef3c7;letter-spacing:0.3px;white-space:nowrap;box-shadow:0 1px 2px rgba(217,119,6,0.06);">
                                    <span>LOW</span>
                                    <span>STOCK</span>
                                </div>
                            ` : `<span class="badge ${statusClass}">${statusLabel}</span>`)}
                        </td>
                        <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                <button class="btn btn-xs btn-warning" onclick="showUniformInOutModal('${i.id}')" title="Department-wise In/Out">⇄ In/Out</button>
                                <button class="btn btn-xs" style="background:#15803d;color:#fff;" onclick="printBarcodeSticker('${i.id}')" title="Print 50×25mm sticker">🖨️</button>
                                <button class="btn btn-xs btn-outline" onclick="showNewUniformForm(DB.getById('inventory','${i.id}'))" title="Edit">✏️</button>
                                <button class="btn btn-xs btn-danger" onclick="deleteInv('${i.id}')" title="Delete">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Render department breakdown
    renderUniformDepartmentBreakdown(items);
    renderUniformRecentMovements();
    generateBarcodeSvgs();
}

function renderUniformDepartmentBreakdown(items) {
    const tbody = document.getElementById('uniDeptBreakdownBody');
    if (!tbody) return;

    const deptMap = {};
    items.forEach(i => {
        const d = i.department || 'General / Unassigned';
        if (!deptMap[d]) deptMap[d] = { count: 0, qty: 0, val: 0 };
        const q = parseInt(i.quantity) || 0;
        const p = parseFloat(i.price) || 0;
        deptMap[d].count += 1;
        deptMap[d].qty += q;
        deptMap[d].val += q * p;
    });

    const entries = Object.entries(deptMap);
    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;">No department records yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = entries.map(([dept, d]) => `
        <tr>
            <td><strong>${dept}</strong></td>
            <td>${d.count}</td>
            <td><strong>${d.qty}</strong></td>
            <td>₹${d.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
        </tr>
    `).join('');
}

function renderUniformRecentMovements() {
    const tbody = document.getElementById('uniRecentMovementsBody');
    if (!tbody) return;

    const movs = (DB.get('inventory_movements') || [])
        .filter(m => m.category === 'Uniform' || (m.notes && m.notes.toLowerCase().includes('uniform')) || (m.notes && m.notes.toLowerCase().includes('scrub')))
        .slice(-8)
        .reverse();

    if (movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#64748b;">No recent movements recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = movs.map(m => `
        <tr>
            <td style="font-size:11px;">${new Date(m.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td><strong style="font-size:12px;">${m.itemName || '-'}</strong></td>
            <td><span class="badge ${m.type === 'in' ? 'badge-success' : 'badge-danger'}" style="font-size:10px;">${(m.type || '').toUpperCase()}</span></td>
            <td><strong>${m.qty}</strong></td>
            <td><span class="badge badge-info" style="font-size:10px;">${m.dept || '-'}</span></td>
        </tr>
    `).join('');
}

function quickUniformQtyAdjust(id, delta) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const current = parseInt(item.quantity) || 0;
    const newQty = Math.max(0, current + delta);
    DB.update('inventory', id, { quantity: newQty });
    
    // Log movement
    DB.add('inventory_movements', {
        itemId: id,
        itemName: item.name,
        type: delta > 0 ? 'in' : 'out',
        qty: Math.abs(delta),
        unit: item.unit || 'pcs',
        dept: item.department || '',
        category: 'Uniform',
        by: AUTH.currentUser() ? AUTH.currentUser().fullName : 'Admin',
        notes: `Quick count adjustment (${delta > 0 ? '+1' : '-1'})`,
        date: new Date().toISOString()
    });

    renderInvUniformView();
}

function handleUniformBarcodeScan(code) {
    code = (code || '').trim();
    if (!code) return;
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Uniform' || i.isUniform);
    const found = items.find(i => 
        (i.outBarcode && i.outBarcode.toLowerCase() === code.toLowerCase()) ||
        (i.barcode && i.barcode.toLowerCase() === code.toLowerCase()) ||
        (i.inBarcode && i.inBarcode.toLowerCase() === code.toLowerCase()) ||
        i.id === code
    );

    const statusEl = document.getElementById('uniformScanStatus');
    if (found) {
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#15803d;">✓ Found: ${found.name} (${found.color || ''} - ${found.size || ''})</span>`;
        }
        playAudioFeedback(true);
        showUniformInOutModal(found.id);
    } else {
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#dc2626;">✗ No uniform matching "${code}"</span>`;
        }
        playAudioFeedback(false);
    }
}

/* ═══════════════════════════════════════════════════════════
   UNIFORM MODAL: NEW / EDIT UNIFORM ENTRY
══════════════════════════════════════════════════════════════ */
function showNewUniformForm(item) {
    const isEdit = !!(item && item.id);
    const depts = (DB.get('departments') || []).map(d => d.name).filter(Boolean);
    const standardDepts = ['Nursing', 'OT', 'ICU', 'Emergency', 'Biomedical', 'Housekeeping', 'Security', 'OPD', 'Doctor / Clinical', 'General Ward'];
    const allDepts = Array.from(new Set([...standardDepts, ...depts]));

    const defaultYear = new Date().getFullYear();
    const today = new Date().toISOString().slice(0, 10);
    const outCode = item?.outBarcode || item?.barcode || ('HMS-UNI-' + Math.floor(1000 + Math.random() * 9000));
    const inCode = item?.inBarcode || '';

    const customSizes = getCustomUniformSizes();
    const allSizes = [...UNIFORM_STANDARD_SIZES, ...customSizes];
    const isCustomSize = item?.size && !UNIFORM_STANDARD_SIZES.includes(item.size);

    const html = `
        <form id="newUniformForm" onsubmit="event.preventDefault();saveUniformItem();">
            <input type="hidden" name="id" value="${item?.id || ''}">
            <input type="hidden" name="category" value="Uniform">
            <input type="hidden" name="isUniform" value="true">

            <div class="card mb-3" style="background:#f8fafc;padding:12px 16px;border:1px solid #cbd5e1;border-radius:8px;">
                <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    🏷️ Barcode Dual-Tracking &amp; 50×25mm Sticker Preview
                </div>
                <div class="grid-2" style="gap:10px;">
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:12px;font-weight:600;color:#334155;">Incoming Vendor Barcode (Optional)</label>
                        <input type="text" name="inBarcode" class="form-control" value="${inCode}" placeholder="e.g. VEN-SCRUB-101" style="font-family:monospace;background:#fff;">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:12px;font-weight:600;color:#334155;">Hospital Barcode (50×25mm Sticker Code) *</label>
                        <div style="display:flex;gap:6px;">
                            <input type="text" id="uniFormOutBarcode" name="outBarcode" class="form-control" value="${outCode}" required style="font-family:monospace;" oninput="updateUniformBarcodePreview(this.value)">
                            <button type="button" class="btn btn-sm btn-outline" onclick="generateUniformBarcode()">Auto</button>
                        </div>
                    </div>
                </div>
                <div id="uniBarcodePreviewBox" style="margin-top:8px;text-align:center;">
                    <svg id="uniModalBarcodeSvg" style="height:28px;"></svg>
                    <div id="uniModalBarcodeStr" style="font-size:11px;font-family:monospace;font-weight:700;color:#1e3a8a;">${outCode}</div>
                </div>
                <div style="margin-top:8px;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" id="uniAutoPrintSticker" ${!isEdit ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                    <label for="uniAutoPrintSticker" style="font-size:12px;font-weight:600;color:#15803d;cursor:pointer;margin:0;">
                        🖨️ Auto-print 50×25mm sticker on save (Roll gap 8mm ready)
                    </label>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label>Scrub / Uniform Type *</label>
                    <select id="uniTypeSelect" name="namePreset" class="form-control" onchange="toggleCustomUniformName(this.value)" required>
                        <option value="">Select uniform type</option>
                        ${UNIFORM_SCRUB_TYPES.map(t => `<option value="${t}" ${item?.name === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                    <div id="uniCustomNameBox" style="display:${(item && !UNIFORM_SCRUB_TYPES.includes(item.name)) || item?.name === 'Other (Custom Uniform)' ? 'block' : 'none'};margin-top:6px;">
                        <input type="text" id="uniCustomNameInput" name="nameCustom" class="form-control" value="${item && !UNIFORM_SCRUB_TYPES.includes(item.name) ? item.name : ''}" placeholder="Enter specific scrub / uniform name">
                    </div>
                </div>

                <div class="form-group">
                    <label>Color *</label>
                    <select id="uniColorSelectInput" name="colorPreset" class="form-control" onchange="toggleCustomUniformColor(this.value)" required>
                        <option value="">Select color</option>
                        ${UNIFORM_COLORS.map(c => `<option value="${c.name}" ${item?.color === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                    <div id="uniCustomColorBox" style="display:${item?.color && !UNIFORM_COLORS.some(c => c.name === item.color) ? 'block' : 'none'};margin-top:6px;">
                        <input type="text" id="uniCustomColorInput" name="colorCustom" class="form-control" value="${item?.color || ''}" placeholder="Enter custom color name / shade">
                    </div>
                </div>

                <div class="form-group">
                    <label>Size (Small to XXXXL &amp; Custom) *</label>
                    <select id="uniSizeSelectInput" name="sizePreset" class="form-control" onchange="toggleCustomUniformSize(this)" required>
                        <option value="">Select size</option>
                        ${UNIFORM_STANDARD_SIZES.map(s => `<option value="${s}" ${item?.size === s ? 'selected' : ''}>${s}</option>`).join('')}
                        ${customSizes.map(s => `<option value="${s}" ${item?.size === s ? 'selected' : ''}>${s} (Custom)</option>`).join('')}
                        <option value="__custom__" style="color:#2563eb;font-weight:700;">+ Add Custom Size...</option>
                    </select>
                    <div id="uniCustomSizeBox" style="display:${isCustomSize ? 'block' : 'none'};margin-top:6px;">
                        <input type="text" id="uniCustomSizeInput" name="sizeCustom" class="form-control" value="${isCustomSize ? item.size : ''}" placeholder="e.g. Chest 42 / Waist 36, or Tailored 44">
                        <small style="color:#64748b;font-size:10px;">Custom sizes are saved automatically for future reuse.</small>
                    </div>
                </div>

                <div class="form-group">
                    <label>Department *</label>
                    <select name="department" class="form-control" required>
                        <option value="">Select Department</option>
                        ${allDepts.map(d => `<option value="${d}" ${item?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Purchase Date *</label>
                    <input type="date" name="purchaseDate" class="form-control" value="${item?.purchaseDate ? item.purchaseDate.split('T')[0] : today}" required>
                </div>

                <div class="form-group">
                    <label>Procurement Year *</label>
                    <input type="number" name="year" class="form-control" min="2020" max="2035" value="${item?.year || defaultYear}" required>
                </div>

                <div class="form-group">
                    <label>Unit Purchase Price (₹) *</label>
                    <input type="number" id="uniUnitPrice" name="price" class="form-control" step="0.01" min="0" value="${item?.price || ''}" placeholder="e.g. 950.00" required oninput="calcUniformTotalValue()">
                </div>

                <div class="form-group">
                    <label>Quantity In-Stock *</label>
                    <div style="display:flex;gap:6px;">
                        <input type="number" id="uniQuantity" name="quantity" class="form-control" min="0" value="${item?.quantity || 1}" required oninput="calcUniformTotalValue()">
                        <select name="unit" class="form-control" style="width:100px;">
                            <option value="sets" ${item?.unit==='sets'?'selected':''}>sets</option>
                            <option value="pcs" ${item?.unit==='pcs'?'selected':''}>pcs</option>
                            <option value="pairs" ${item?.unit==='pairs'?'selected':''}>pairs</option>
                        </select>
                    </div>
                    <div id="uniTotalValueCalc" style="font-size:11px;font-weight:600;color:#16a34a;margin-top:3px;"></div>
                </div>

                <div class="form-group">
                    <label>Fabric / Material</label>
                    <select name="fabric" class="form-control">
                        <option value="Poly-Cotton Blend" ${item?.fabric==='Poly-Cotton Blend'?'selected':''}>Poly-Cotton Blend (Breathable)</option>
                        <option value="100% Cotton" ${item?.fabric==='100% Cotton'?'selected':''}>100% Pure Cotton</option>
                        <option value="Spandex Stretch Blend" ${item?.fabric==='Spandex Stretch Blend'?'selected':''}>Spandex Stretch Blend (Comfort OT)</option>
                        <option value="Anti-Microbial Treated" ${item?.fabric==='Anti-Microbial Treated'?'selected':''}>Anti-Microbial Treated</option>
                        <option value="Heavy Duty Twill" ${item?.fabric==='Heavy Duty Twill'?'selected':''}>Heavy Duty Twill (Security/HK)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Supplier / Vendor</label>
                    <input type="text" name="supplier" class="form-control" value="${item?.supplier || ''}" placeholder="e.g. MedWear Garments">
                </div>

                <div class="form-group">
                    <label>Storage Location / Rack</label>
                    <input type="text" name="location" class="form-control" value="${item?.location || ''}" placeholder="e.g. OT Locker Room Rack 2">
                </div>

                <div class="form-group">
                    <label>Min Stock Alert Level</label>
                    <input type="number" name="minQty" class="form-control" min="1" value="${item?.minQty || 10}">
                </div>
            </div>

            <div class="form-group">
                <label>Notes / Specification</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="e.g. With embroidered hospital crest, extra deep pocket">${item?.notes || ''}</textarea>
            </div>

            <div class="modal-footer" style="padding-top:12px;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" style="font-weight:600;">💾 Save Uniform Entry</button>
            </div>
        </form>
    `;

    showModal(`
        <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Uniform / Scrub' : '➕ New Uniform Entry'}</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">${html}</div>
    `, true);

    setTimeout(() => {
        updateUniformBarcodePreview(outCode);
        calcUniformTotalValue();
    }, 50);
}

function toggleCustomUniformName(val) {
    const box = document.getElementById('uniCustomNameBox');
    if (box) box.style.display = (val === 'Other (Custom Uniform)') ? 'block' : 'none';
}

function toggleCustomUniformColor(val) {
    const box = document.getElementById('uniCustomColorBox');
    if (box) box.style.display = (val === 'Other / Custom') ? 'block' : 'none';
}

function toggleCustomUniformSize(selectEl) {
    const box = document.getElementById('uniCustomSizeBox');
    if (!box) return;
    if (selectEl.value === '__custom__') {
        box.style.display = 'block';
        const inp = document.getElementById('uniCustomSizeInput');
        if (inp) inp.focus();
    } else {
        box.style.display = 'none';
    }
}

function generateUniformBarcode() {
    const code = 'HMS-UNI-' + Math.floor(1000 + Math.random() * 9000);
    const inp = document.getElementById('uniFormOutBarcode');
    if (inp) inp.value = code;
    updateUniformBarcodePreview(code);
}

function updateUniformBarcodePreview(code) {
    code = (code || '').trim();
    const svg = document.getElementById('uniModalBarcodeSvg');
    const str = document.getElementById('uniModalBarcodeStr');
    if (str) str.textContent = code;
    if (svg && code && typeof JsBarcode !== 'undefined') {
        try {
            JsBarcode(svg, code, {
                format: 'CODE128',
                width: 1.4,
                height: 28,
                displayValue: false,
                margin: 0
            });
        } catch(e) {}
    }
}

function calcUniformTotalValue() {
    const qty = parseFloat(document.getElementById('uniQuantity')?.value) || 0;
    const price = parseFloat(document.getElementById('uniUnitPrice')?.value) || 0;
    const valEl = document.getElementById('uniTotalValueCalc');
    if (valEl) {
        valEl.textContent = `Total Valuation: ₹${(qty * price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function saveUniformItem() {
    const form = document.getElementById('newUniformForm');
    if (!form) return;

    const data = {};
    form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });

    let name = data.namePreset;
    if (name === 'Other (Custom Uniform)' || !name) {
        name = (data.nameCustom || '').trim() || 'Hospital Scrub Suit';
    }

    let color = data.colorPreset;
    if (color === 'Other / Custom' || !color) {
        color = (data.colorCustom || '').trim() || 'Standard';
    }

    let size = data.sizePreset;
    if (size === '__custom__' || !size) {
        size = (data.sizeCustom || '').trim() || 'Free Size';
        saveCustomUniformSize(size);
    }

    const outBarcode = (data.outBarcode || '').trim() || ('HMS-UNI-' + Math.floor(1000 + Math.random() * 9000));
    const autoPrint = document.getElementById('uniAutoPrintSticker')?.checked;

    const itemPayload = {
        name: name,
        category: 'Uniform',
        isUniform: true,
        color: color,
        size: size,
        department: data.department || 'OT',
        purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
        year: parseInt(data.year) || new Date().getFullYear(),
        price: parseFloat(data.price) || 0,
        quantity: parseInt(data.quantity) || 0,
        unit: data.unit || 'sets',
        fabric: data.fabric || 'Poly-Cotton Blend',
        supplier: data.supplier || '',
        location: data.location || '',
        minQty: parseInt(data.minQty) || 10,
        notes: data.notes || '',
        inBarcode: data.inBarcode || '',
        outBarcode: outBarcode,
        barcode: outBarcode
    };

    let savedId = data.id;
    if (data.id) {
        DB.update('inventory', data.id, itemPayload);
        APP.notify(`Uniform "${name}" updated (${outBarcode})`, 'success');
    } else {
        const newItem = DB.add('inventory', itemPayload);
        savedId = newItem ? newItem.id : data.id;
        APP.notify(`New uniform added (${outBarcode})`, 'success');
    }

    closeModal();
    renderInvUniformView();

    if (autoPrint && savedId) {
        setTimeout(() => {
            printBarcodeSticker(savedId);
        }, 300);
    }
}

/* ═══════════════════════════════════════════════════════════
   UNIFORM IN / OUT MODAL (DEPARTMENT-WISE WITH BARCODE)
══════════════════════════════════════════════════════════════ */
function showUniformInOutModal(uniformId, defaultDirection = 'out') {
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Uniform' || i.isUniform);
    if (items.length === 0) {
        APP.notify('Please add uniform items first', 'error');
        return;
    }

    const selectedItem = uniformId ? items.find(i => i.id === uniformId) : items[0];
    const depts = (DB.get('departments') || []).map(d => d.name).filter(Boolean);
    const standardDepts = ['Nursing', 'OT', 'ICU', 'Emergency', 'Biomedical', 'Housekeeping', 'Security', 'OPD', 'Doctor / Clinical', 'General Ward', 'Deluxe Ward'];
    const allDepts = Array.from(new Set([...standardDepts, ...depts]));

    const html = `
        <form id="uniformInOutForm" onsubmit="event.preventDefault();saveUniformInOut();">
            <div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin-bottom:14px;border:1px solid #cbd5e1;">
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-weight:700;font-size:12px;color:#1e293b;">Select Uniform by Barcode / Item Name</label>
                    <select id="uniInOutItemSelect" class="form-control" onchange="updateUniformInOutDetails(this.value)" required>
                        ${items.map(i => `
                            <option value="${i.id}" ${selectedItem && selectedItem.id === i.id ? 'selected' : ''}>
                                [${i.outBarcode || i.barcode || 'NO-BARCODE'}] ${i.name} - ${i.color || ''} (${i.size || ''}) - Stock: ${i.quantity || 0}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div id="uniInOutDetailBox" style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
                    <div>
                        <span id="uniInOutName" style="font-weight:700;color:#0f172a;">${selectedItem?.name || ''}</span>
                        <div id="uniInOutSub" style="color:#64748b;font-size:11px;">Color: ${selectedItem?.color || '-'} · Size: ${selectedItem?.size || '-'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px;color:#64748b;">Current Stock</div>
                        <span id="uniInOutCurrentQty" style="font-size:16px;font-weight:700;color:#2563eb;">${selectedItem?.quantity || 0} ${selectedItem?.unit || 'sets'}</span>
                    </div>
                </div>
            </div>

            <div class="form-group mb-3">
                <label style="font-weight:700;font-size:13px;">Movement Direction *</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="display:flex;align-items:center;gap:8px;padding:10px;border:2px solid #bbf7d0;background:#f0fdf4;border-radius:8px;cursor:pointer;">
                        <input type="radio" name="uniDirection" value="in" ${defaultDirection === 'in' ? 'checked' : ''} onchange="toggleUniformDirection(this.value)">
                        <div>
                            <strong style="color:#166534;font-size:13px;">🟢 IN (Stock In)</strong>
                            <div style="font-size:11px;color:#15803d;">New arrival / Return from laundry / Return from staff</div>
                        </div>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;padding:10px;border:2px solid #fecaca;background:#fef2f2;border-radius:8px;cursor:pointer;">
                        <input type="radio" name="uniDirection" value="out" ${defaultDirection === 'out' ? 'checked' : ''} onchange="toggleUniformDirection(this.value)">
                        <div>
                            <strong style="color:#991b1b;font-size:13px;">🔴 OUT (Issue to Dept)</strong>
                            <div style="font-size:11px;color:#b91c1c;">Issue to hospital department or staff</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label id="uniDeptLabel" style="font-weight:700;">Department (Target) *</label>
                    <select id="uniInOutDept" name="dept" class="form-control" required>
                        <option value="">Select Department</option>
                        ${allDepts.map(d => `<option value="${d}" ${selectedItem?.department===d ? 'selected':''}>${d}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label style="font-weight:700;">Quantity *</label>
                    <input type="number" id="uniInOutQty" name="qty" class="form-control" min="1" value="1" required>
                </div>

                <div class="form-group">
                    <label>Staff / Employee Name &amp; ID</label>
                    <input type="text" id="uniInOutStaff" name="staffName" class="form-control" placeholder="e.g. Nurse Priya Patel (EMP-104)">
                </div>

                <div class="form-group">
                    <label>Date &amp; Time</label>
                    <input type="datetime-local" name="date" class="form-control" value="${new Date().toISOString().slice(0, 16)}">
                </div>
            </div>

            <div class="form-group">
                <label>Purpose / Remarks / Laundry Batch</label>
                <input type="text" id="uniInOutNotes" name="notes" class="form-control" placeholder="e.g. Annual uniform issuance for OT nurses, or Returned clean from laundry">
            </div>

            <div class="modal-footer" style="padding-top:12px;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" style="font-weight:700;padding:8px 18px;">
                    Confirm Uniform Movement
                </button>
            </div>
        </form>
    `;

    showModal(`
        <div class="modal-header">
            <h3>⇄ Uniform Department In / Out</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">${html}</div>
    `, false);
}

function updateUniformInOutDetails(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const nameEl = document.getElementById('uniInOutName');
    const subEl = document.getElementById('uniInOutSub');
    const qtyEl = document.getElementById('uniInOutCurrentQty');
    const deptEl = document.getElementById('uniInOutDept');

    if (nameEl) nameEl.textContent = item.name;
    if (subEl) subEl.textContent = `Color: ${item.color || '-'} · Size: ${item.size || '-'} · Barcode: ${item.outBarcode || item.barcode || '-'}`;
    if (qtyEl) qtyEl.textContent = `${item.quantity || 0} ${item.unit || 'sets'}`;
    if (deptEl && item.department) deptEl.value = item.department;
}

function toggleUniformDirection(val) {
    const lbl = document.getElementById('uniDeptLabel');
    if (lbl) {
        lbl.textContent = val === 'in' ? 'Received From Department / Vendor *' : 'Issue To Department *';
    }
}

function saveUniformInOut() {
    const form = document.getElementById('uniformInOutForm');
    if (!form) return;

    const itemId = document.getElementById('uniInOutItemSelect').value;
    const item = DB.getById('inventory', itemId);
    if (!item) {
        APP.notify('Uniform item not found', 'error');
        return;
    }

    const direction = form.querySelector('input[name="uniDirection"]:checked')?.value || 'out';
    const dept = (document.getElementById('uniInOutDept')?.value || '').trim();
    const qty = parseInt(document.getElementById('uniInOutQty')?.value) || 0;
    const staffName = (document.getElementById('uniInOutStaff')?.value || '').trim();
    const notes = (document.getElementById('uniInOutNotes')?.value || '').trim();

    if (!dept) {
        APP.notify('Please select a department', 'error');
        return;
    }
    if (qty <= 0) {
        APP.notify('Please enter a valid quantity', 'error');
        return;
    }

    const currentQty = parseInt(item.quantity) || 0;
    if (direction === 'out' && qty > currentQty) {
        APP.notify(`Only ${currentQty} ${item.unit || 'sets'} available in stock!`, 'error');
        return;
    }

    const newQty = direction === 'out' ? (currentQty - qty) : (currentQty + qty);
    DB.update('inventory', itemId, { quantity: newQty });

    const user = AUTH.currentUser();
    const unitPrice = parseFloat(item.price) || 0;

    // Record universal inventory movement
    DB.add('inventory_movements', {
        itemId: itemId,
        itemName: item.name,
        type: direction,
        qty: qty,
        unit: item.unit || 'sets',
        unitPrice: unitPrice,
        totalValue: qty * unitPrice,
        dept: dept,
        by: user ? user.fullName : 'Admin',
        staffName: staffName,
        barcode: item.outBarcode || item.barcode || '',
        category: 'Uniform',
        size: item.size || '',
        color: item.color || '',
        notes: notes ? `${notes} (Staff: ${staffName || 'N/A'})` : `Staff: ${staffName || 'N/A'}`,
        date: new Date().toISOString()
    });

    APP.notify(`${direction === 'out' ? 'Issued' : 'Received'} ${qty} ${item.unit || 'sets'} of ${item.name} (${dept}) ✓`, 'success');
    closeModal();
    renderInvUniformView();
}

function invDownloadUniformExcel() {
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Uniform' || i.isUniform);
    if (items.length === 0) { APP.notify('No uniform items to export', 'info'); return; }
    if (typeof XLSX === 'undefined') { APP.notify('Excel library not loaded', 'error'); return; }

    const headers = ['Barcode', 'Uniform / Scrub', 'Color', 'Size', 'Department', 'Quantity', 'Unit', 'Price (₹)', 'Total Value (₹)', 'Purchase Date', 'Procurement Year', 'Supplier', 'Location'];
    const rows = items.map(i => {
        const q = parseInt(i.quantity) || 0;
        const p = parseFloat(i.price) || 0;
        return [
            i.outBarcode || i.barcode || '',
            i.name || '',
            i.color || '',
            i.size || '',
            i.department || '',
            q,
            i.unit || 'pcs',
            p.toFixed(2),
            (q * p).toFixed(2),
            i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString('en-IN') : '',
            i.year || '',
            i.supplier || '',
            i.location || ''
        ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
    XLSX.utils.book_append_sheet(wb, ws, 'Uniforms');
    XLSX.writeFile(wb, `HMS_Uniform_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function invDownloadUniformPdf() {
    window.print();
}

/* ═══════════════════════════════════════════════════════════
   LINEN SECTION (Bedding, Sizes, Colors, Barcode In/Out)
══════════════════════════════════════════════════════════════ */
let linenSearchText = '';
let linenDeptFilter = '';
let linenSizeFilter = '';
let linenColorFilter = '';

function renderInvLinenTab() {
    ensureUniformAndLinenSeed();
    const depts = (DB.get('departments') || []).map(d => d.name).filter(Boolean);
    const standardDepts = ['Nursing', 'OT', 'ICU', 'General Ward', 'Deluxe Ward', 'Emergency', 'OPD', 'Facility', 'Laundry'];
    const allDepts = Array.from(new Set([...standardDepts, ...depts]));

    return `
        <div class="card" style="padding:16px 20px;margin-bottom:16px;background:linear-gradient(135deg,#581c87 0%,#3b0764 100%);color:#fff;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.12);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h3 style="margin:0;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;">
                        🛏️ Hospital Linen &amp; Bedding Inventory
                    </h3>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#d8b4fe;">
                        Bedsheets, pillow covers, blankets, OT drapes, patient gowns, sizing, and department-wise In &amp; Out circulation
                    </p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm" onclick="showNewLinenForm()" style="background:#fff;color:#581c87;font-weight:700;padding:7px 14px;border:none;">
                        ➕ New Linen Entry
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="showLinenInOutModal()" style="font-weight:600;padding:7px 14px;color:#fff;">
                        ⇄ Linen In / Out (Barcode)
                    </button>
                    <button class="btn btn-sm" onclick="invDownloadLinenExcel()" style="background:#16a34a;color:#fff;border:none;padding:7px 12px;font-weight:600;">
                        📥 Excel
                    </button>
                    <button class="btn btn-sm" onclick="invDownloadLinenPdf()" style="background:#dc2626;color:#fff;border:none;padding:7px 12px;font-weight:600;">
                        📄 PDF
                    </button>
                </div>
            </div>
        </div>

        <div class="card mb-3" style="background:#fdf4ff;border:1px solid #f0abfc;padding:12px 16px;border-radius:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#86198f;">
                    📷 TVS USB Barcode Scanner (Linen Tracking)
                </div>
                <div style="font-size:11px;color:#a21caf;">
                    Scan linen barcode to quickly record In / Out or laundry circulation
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input type="text" id="linenScanInput" class="form-control" placeholder="Scan or enter linen barcode (e.g. LIN-1001, HMS-LIN-101)" 
                       style="flex:1;min-width:240px;font-family:monospace;background:#fff;border:1px solid #e879f9;font-size:13px;"
                       onkeydown="if(event.key==='Enter')handleLinenBarcodeScan(this.value)">
                <button class="btn btn-sm" onclick="handleLinenBarcodeScan(document.getElementById('linenScanInput').value)" style="background:#86198f;color:#fff;padding:6px 16px;font-weight:600;">
                    🔍 Lookup / In-Out
                </button>
                <span id="linenScanStatus" style="font-size:12px;font-weight:600;"></span>
            </div>
        </div>

        <div class="grid-4 mb-4" id="linenKpiGrid"></div>

        <div class="card mb-3" style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <input type="text" id="linenSearch" class="form-control" placeholder="Search by linen name, size, color, barcode..." 
                       value="${linenSearchText}" oninput="linenSearchText=this.value;renderInvLinenView()" style="flex:2;min-width:180px;">
                
                <select id="linenDeptSelect" class="form-control" style="flex:1;min-width:140px;" onchange="linenDeptFilter=this.value;renderInvLinenView()">
                    <option value="">All Departments</option>
                    ${allDepts.map(d => `<option value="${d}" ${linenDeptFilter===d?'selected':''}>${d}</option>`).join('')}
                </select>

                <select id="linenSizeSelect" class="form-control" style="flex:1;min-width:140px;" onchange="linenSizeFilter=this.value;renderInvLinenView()">
                    <option value="">All Sizes</option>
                    ${LINEN_STANDARD_SIZES.map(s => `<option value="${s}" ${linenSizeFilter===s?'selected':''}>${s}</option>`).join('')}
                    ${getCustomLinenSizes().map(s => `<option value="${s}" ${linenSizeFilter===s?'selected':''}>${s} (Custom)</option>`).join('')}
                </select>

                <select id="linenColorSelect" class="form-control" style="flex:1;min-width:140px;" onchange="linenColorFilter=this.value;renderInvLinenView()">
                    <option value="">All Colors</option>
                    ${LINEN_COLORS.map(c => `<option value="${c.name}" ${linenColorFilter===c.name?'selected':''}>${c.name}</option>`).join('')}
                </select>

                <button class="btn btn-sm btn-outline" onclick="linenSearchText='';linenDeptFilter='';linenSizeFilter='';linenColorFilter='';renderInvLinenView()">
                    Reset
                </button>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <h4 style="margin:0;font-size:14px;font-weight:700;">🛏️ Linen &amp; Bedding Stock</h4>
                <span id="linenCountBadge" class="badge badge-info" style="font-size:12px;"></span>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th style="width:130px;">Barcode &amp; Sticker</th>
                            <th>Linen Item Name</th>
                            <th>Size</th>
                            <th>Color</th>
                            <th>Department</th>
                            <th>In-Stock Qty</th>
                            <th>Price / Unit</th>
                            <th>Total Value</th>
                            <th>Purchase Date</th>
                            <th>Status</th>
                            <th style="width:170px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="linenTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderInvLinenView() {
    ensureUniformAndLinenSeed();
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Linen' || i.category === 'Bedding' || i.department === 'Linen' || i.isLinen);
    const search = linenSearchText.toLowerCase();

    const filtered = items.filter(i => {
        const matchSearch = !search || 
            (i.name || '').toLowerCase().includes(search) || 
            (i.color || '').toLowerCase().includes(search) || 
            (i.size || '').toLowerCase().includes(search) || 
            (i.outBarcode || i.barcode || '').toLowerCase().includes(search) || 
            (i.department || '').toLowerCase().includes(search);
        const matchDept = !linenDeptFilter || i.department === linenDeptFilter;
        const matchSize = !linenSizeFilter || i.size === linenSizeFilter;
        const matchColor = !linenColorFilter || (i.color || '').toLowerCase().includes(linenColorFilter.toLowerCase()) || (linenColorFilter.toLowerCase().includes((i.color || '').toLowerCase()));
        return matchSearch && matchDept && matchSize && matchColor;
    });

    const totalItems = items.length;
    const totalQty = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);
    const lowStock = items.filter(i => (parseInt(i.quantity) || 0) < 15).length;
    const totalVal = items.reduce((sum, i) => sum + ((parseInt(i.quantity) || 0) * (parseFloat(i.price) || 0)), 0);

    const kpi = document.getElementById('linenKpiGrid');
    if (kpi) {
        kpi.innerHTML = `
            <div class="stat-card" style="border-left-color:#8b5cf6;">
                <div class="stat-value">${totalItems}</div>
                <div class="stat-label">Linen Variants</div>
            </div>
            <div class="stat-card" style="border-left-color:#10b981;">
                <div class="stat-value">${totalQty}</div>
                <div class="stat-label">Total In-Stock Pieces</div>
            </div>
            <div class="stat-card" style="border-left-color:#f59e0b;">
                <div class="stat-value">${lowStock}</div>
                <div class="stat-label">Low Stock Alerts</div>
            </div>
            <div class="stat-card" style="border-left-color:#ec4899;">
                <div class="stat-value">₹${totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <div class="stat-label">Linen Inventory Valuation</div>
            </div>
        `;
    }

    const badge = document.getElementById('linenCountBadge');
    if (badge) badge.textContent = `${filtered.length} of ${items.length} items`;

    const tbody = document.getElementById('linenTableBody');
    if (tbody) {
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:28px;color:#64748b;">No linen items found matching the selected filters. Click "+ New Linen Entry" to record sheets, towels, or blankets.</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map(i => {
                const qty = parseInt(i.quantity) || 0;
                const price = parseFloat(i.price) || 0;
                const val = qty * price;
                const outCode = i.outBarcode || i.barcode || i.id;
                const isOutOfStock = qty === 0;
                const isLowStock = !isOutOfStock && qty < 15;
                const statusClass = isOutOfStock ? 'badge-danger' : (isLowStock ? 'badge-warning' : 'badge-success');
                const statusLabel = isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock');

                const colorObj = LINEN_COLORS.find(c => (i.color || '').toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes((i.color || '').toLowerCase())) || { hex: '#475569' };
                const rowStyle = isOutOfStock ? 'background:#fff8f8;border-left:3px solid #ef4444;' : (isLowStock ? 'background:#fffdfa;border-left:3px solid #f59e0b;' : '');

                return `
                    <tr class="${isOutOfStock ? 'inv-row-out-of-stock' : (isLowStock ? 'inv-row-low-stock' : '')}" style="${rowStyle}">
                        <td>
                            <div class="barcode-cell" style="cursor:pointer;" onclick="printBarcodeSticker('${i.id}')" title="Click to print 50×25mm sticker">
                                <svg class="barcode-svg" id="barcode_${i.id}" style="width:105px;height:26px;"></svg>
                                <div style="font-size:10px;font-weight:700;color:#1e3a8a;text-align:center;font-family:monospace;">${outCode}</div>
                            </div>
                        </td>
                        <td>
                            <strong style="${isOutOfStock ? 'color:#b91c1c;' : (isLowStock ? 'color:#92400e;' : '')}">${i.name}</strong>
                            ${i.fabric ? `<div style="font-size:11px;color:#64748b;">${i.fabric}</div>` : ''}
                        </td>
                        <td><span class="badge" style="background:#f3e8ff;color:#6b21a8;font-weight:600;">${i.size || 'Standard'}</span></td>
                        <td>
                            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:12px;background:#f1f5f9;font-size:12px;font-weight:600;">
                                <span style="width:10px;height:10px;border-radius:50%;background:${colorObj.hex};border:1px solid ${colorObj.border || 'rgba(0,0,0,0.1)'};"></span>
                                ${i.color || 'Hospital White'}
                            </span>
                        </td>
                        <td><span class="badge badge-info">${i.department || 'Linen'}</span></td>
                        <td>
                            <div style="display:flex;align-items:center;gap:5px;">
                                <button class="btn btn-xs" style="padding:1px 6px;min-width:22px;" onclick="quickLinenQtyAdjust('${i.id}', -1)">−</button>
                                <strong style="font-size:13px;min-width:24px;text-align:center;${isOutOfStock ? 'color:#dc2626;' : (isLowStock ? 'color:#d97706;' : '')}">${qty}</strong>
                                <button class="btn btn-xs" style="padding:1px 6px;min-width:22px;" onclick="quickLinenQtyAdjust('${i.id}', 1)">+</button>
                                <span style="font-size:11px;color:#64748b;">${i.unit || 'pcs'}</span>
                            </div>
                        </td>
                        <td style="font-size:12px;">₹${price.toFixed(2)}</td>
                        <td style="font-size:12px;font-weight:600;">₹${val.toFixed(2)}</td>
                        <td style="font-size:11px;color:#475569;">${i.purchaseDate ? APP.formatDate(i.purchaseDate) : '-'}</td>
                        <td style="text-align:center;">
                            ${isOutOfStock ? `
                                <div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 12px;border-radius:14px;background:#fef2f2;color:#ef4444;font-size:10px;font-weight:700;line-height:1.2;text-align:center;border:1px solid #fee2e2;letter-spacing:0.3px;white-space:nowrap;box-shadow:0 1px 2px rgba(239,68,68,0.06);">
                                    <span>OUT OF</span>
                                    <span>STOCK</span>
                                </div>
                            ` : (isLowStock ? `
                                <div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;padding:5px 12px;border-radius:14px;background:#fffbeb;color:#d97706;font-size:10px;font-weight:700;line-height:1.2;text-align:center;border:1px solid #fef3c7;letter-spacing:0.3px;white-space:nowrap;box-shadow:0 1px 2px rgba(217,119,6,0.06);">
                                    <span>LOW</span>
                                    <span>STOCK</span>
                                </div>
                            ` : `<span class="badge ${statusClass}">${statusLabel}</span>`)}
                        </td>
                        <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                <button class="btn btn-xs btn-warning" onclick="showLinenInOutModal('${i.id}')" title="Linen In/Out">⇄ In/Out</button>
                                <button class="btn btn-xs" style="background:#15803d;color:#fff;" onclick="printBarcodeSticker('${i.id}')" title="Print 50×25mm sticker">🖨️</button>
                                <button class="btn btn-xs btn-outline" onclick="showNewLinenForm(DB.getById('inventory','${i.id}'))" title="Edit">✏️</button>
                                <button class="btn btn-xs btn-danger" onclick="deleteInv('${i.id}')" title="Delete">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
    generateBarcodeSvgs();
}

function quickLinenQtyAdjust(id, delta) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const current = parseInt(item.quantity) || 0;
    const newQty = Math.max(0, current + delta);
    DB.update('inventory', id, { quantity: newQty });

    DB.add('inventory_movements', {
        itemId: id,
        itemName: item.name,
        type: delta > 0 ? 'in' : 'out',
        qty: Math.abs(delta),
        unit: item.unit || 'pcs',
        dept: item.department || 'Linen',
        category: 'Linen',
        by: AUTH.currentUser() ? AUTH.currentUser().fullName : 'Admin',
        notes: `Quick linen count adjustment (${delta > 0 ? '+1' : '-1'})`,
        date: new Date().toISOString()
    });

    renderInvLinenView();
}

function handleLinenBarcodeScan(code) {
    code = (code || '').trim();
    if (!code) return;
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Linen' || i.category === 'Bedding' || i.department === 'Linen' || i.isLinen);
    const found = items.find(i => 
        (i.outBarcode && i.outBarcode.toLowerCase() === code.toLowerCase()) ||
        (i.barcode && i.barcode.toLowerCase() === code.toLowerCase()) ||
        (i.inBarcode && i.inBarcode.toLowerCase() === code.toLowerCase()) ||
        i.id === code
    );

    const statusEl = document.getElementById('linenScanStatus');
    if (found) {
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#15803d;">✓ Found: ${found.name} (${found.size || ''})</span>`;
        }
        playAudioFeedback(true);
        showLinenInOutModal(found.id);
    } else {
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#dc2626;">✗ No linen item matching "${code}"</span>`;
        }
        playAudioFeedback(false);
    }
}

/* ═══════════════════════════════════════════════════════════
   LINEN MODAL: NEW / EDIT LINEN ENTRY
══════════════════════════════════════════════════════════════ */
function showNewLinenForm(item) {
    const isEdit = !!(item && item.id);
    const depts = (DB.get('departments') || []).map(d => d.name).filter(Boolean);
    const standardDepts = ['Linen', 'Nursing', 'OT', 'ICU', 'General Ward', 'Deluxe Ward', 'Emergency', 'OPD', 'Facility', 'Laundry'];
    const allDepts = Array.from(new Set([...standardDepts, ...depts]));

    const defaultYear = new Date().getFullYear();
    const today = new Date().toISOString().slice(0, 10);
    const outCode = item?.outBarcode || item?.barcode || ('HMS-LIN-' + Math.floor(1000 + Math.random() * 9000));
    const inCode = item?.inBarcode || '';

    const customSizes = getCustomLinenSizes();
    const isCustomSize = item?.size && !LINEN_STANDARD_SIZES.includes(item.size);

    const html = `
        <form id="newLinenForm" onsubmit="event.preventDefault();saveLinenItem();">
            <input type="hidden" name="id" value="${item?.id || ''}">
            <input type="hidden" name="category" value="Linen">
            <input type="hidden" name="isLinen" value="true">

            <div class="card mb-3" style="background:#fdf4ff;padding:12px 16px;border:1px solid #f0abfc;border-radius:8px;">
                <div style="font-weight:700;font-size:13px;color:#701a75;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    🏷️ Barcode Dual-Tracking &amp; 50×25mm Sticker Preview
                </div>
                <div class="grid-2" style="gap:10px;">
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:12px;font-weight:600;color:#334155;">Incoming Vendor Barcode (Optional)</label>
                        <input type="text" name="inBarcode" class="form-control" value="${inCode}" placeholder="e.g. VEN-LIN-101" style="font-family:monospace;background:#fff;">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:12px;font-weight:600;color:#334155;">Hospital Barcode (50×25mm Sticker Code) *</label>
                        <div style="display:flex;gap:6px;">
                            <input type="text" id="linenFormOutBarcode" name="outBarcode" class="form-control" value="${outCode}" required style="font-family:monospace;" oninput="updateLinenBarcodePreview(this.value)">
                            <button type="button" class="btn btn-sm btn-outline" onclick="generateLinenBarcode()">Auto</button>
                        </div>
                    </div>
                </div>
                <div id="linenBarcodePreviewBox" style="margin-top:8px;text-align:center;">
                    <svg id="linenModalBarcodeSvg" style="height:28px;"></svg>
                    <div id="linenModalBarcodeStr" style="font-size:11px;font-family:monospace;font-weight:700;color:#1e3a8a;">${outCode}</div>
                </div>
                <div style="margin-top:8px;display:flex;align-items:center;gap:6px;">
                    <input type="checkbox" id="linenAutoPrintSticker" ${!isEdit ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                    <label for="linenAutoPrintSticker" style="font-size:12px;font-weight:600;color:#15803d;cursor:pointer;margin:0;">
                        🖨️ Auto-print 50×25mm sticker on save (Roll gap 8mm ready)
                    </label>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label>Linen Item Name *</label>
                    <select id="linenNameSelect" name="namePreset" class="form-control" onchange="toggleCustomLinenName(this.value)" required>
                        <option value="">Select linen item</option>
                        ${LINEN_ITEMS_PRESET.map(t => `<option value="${t}" ${item?.name === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                    <div id="linenCustomNameBox" style="display:${(item && !LINEN_ITEMS_PRESET.includes(item.name)) || item?.name === 'Other (Custom Linen)' ? 'block' : 'none'};margin-top:6px;">
                        <input type="text" id="linenCustomNameInput" name="nameCustom" class="form-control" value="${item && !LINEN_ITEMS_PRESET.includes(item.name) ? item.name : ''}" placeholder="Enter specific linen name">
                    </div>
                </div>

                <div class="form-group">
                    <label>Color / Shade *</label>
                    <select id="linenColorSelectInput" name="colorPreset" class="form-control" onchange="toggleCustomLinenColor(this.value)" required>
                        <option value="">Select linen color</option>
                        ${LINEN_COLORS.map(c => `<option value="${c.name}" ${(item?.color === c.name) || (!item?.color && c.name === 'Hospital White') ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>

                    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;align-items:center;">
                        <span style="font-size:10px;color:#64748b;font-weight:600;">Palette:</span>
                        ${LINEN_COLORS.slice(0, 14).map(c => `
                            <button type="button" class="btn btn-xs" style="padding:2px 6px;font-size:10px;display:inline-flex;align-items:center;gap:3px;background:#f8fafc;border:1px solid #cbd5e1;cursor:pointer;border-radius:10px;"
                                onclick="pickQuickLinenColor('${c.name}')" title="${c.name}">
                                <span style="width:8px;height:8px;border-radius:50%;background:${c.hex};border:1px solid ${c.border || 'rgba(0,0,0,0.2)'};"></span>
                                ${c.name.split(' ')[0]}
                            </button>
                        `).join('')}
                    </div>

                    <div id="linenCustomColorBox" style="display:${(item?.color && !LINEN_COLORS.some(c => c.name === item.color)) || item?.color === 'Other / Custom' ? 'block' : 'none'};margin-top:6px;">
                        <input type="text" id="linenCustomColorInput" name="colorCustom" class="form-control" value="${item?.color && !LINEN_COLORS.some(c => c.name === item.color) ? item.color : ''}" placeholder="Enter specific linen color or pattern (e.g. Light Mint Green, Lavender Floral)">
                    </div>
                </div>

                <div class="form-group">
                    <label>Size / Dimensions *</label>
                    <select id="linenSizeSelectInput" name="sizePreset" class="form-control" onchange="toggleCustomLinenSize(this)" required>
                        <option value="">Select size</option>
                        ${LINEN_STANDARD_SIZES.map(s => `<option value="${s}" ${item?.size === s ? 'selected' : ''}>${s}</option>`).join('')}
                        ${customSizes.map(s => `<option value="${s}" ${item?.size === s ? 'selected' : ''}>${s} (Custom)</option>`).join('')}
                        <option value="__custom__" style="color:#7e22ce;font-weight:700;">+ Add Custom Size...</option>
                    </select>
                    <div id="linenCustomSizeBox" style="display:${isCustomSize ? 'block' : 'none'};margin-top:6px;">
                        <input type="text" id="linenCustomSizeInput" name="sizeCustom" class="form-control" value="${isCustomSize ? item.size : ''}" placeholder="e.g. Special ICU 50x80 inches">
                    </div>
                </div>

                <div class="form-group">
                    <label>Department / Ward *</label>
                    <select name="department" class="form-control" required>
                        <option value="">Select Department</option>
                        ${allDepts.map(d => `<option value="${d}" ${item?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Purchase Date *</label>
                    <input type="date" name="purchaseDate" class="form-control" value="${item?.purchaseDate ? item.purchaseDate.split('T')[0] : today}" required>
                </div>

                <div class="form-group">
                    <label>Procurement Year *</label>
                    <input type="number" name="year" class="form-control" min="2020" max="2035" value="${item?.year || defaultYear}" required>
                </div>

                <div class="form-group">
                    <label>Unit Purchase Price (₹) *</label>
                    <input type="number" id="linenUnitPrice" name="price" class="form-control" step="0.01" min="0" value="${item?.price || ''}" placeholder="e.g. 450.00" required>
                </div>

                <div class="form-group">
                    <label>Quantity In-Stock *</label>
                    <div style="display:flex;gap:6px;">
                        <input type="number" name="quantity" class="form-control" min="0" value="${item?.quantity || 50}" required>
                        <select name="unit" class="form-control" style="width:100px;">
                            <option value="pcs" ${item?.unit==='pcs'?'selected':''}>pcs</option>
                            <option value="sets" ${item?.unit==='sets'?'selected':''}>sets</option>
                            <option value="pairs" ${item?.unit==='pairs'?'selected':''}>pairs</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Fabric / Material</label>
                    <select name="fabric" class="form-control">
                        <option value="100% Cotton" ${item?.fabric==='100% Cotton'?'selected':''}>100% Pure Cotton (High Thread Count)</option>
                        <option value="Poly-Cotton Blend" ${item?.fabric==='Poly-Cotton Blend'?'selected':''}>Poly-Cotton Blend (Commercial Laundry Safe)</option>
                        <option value="Heavy Woolen" ${item?.fabric==='Heavy Woolen'?'selected':''}>Heavy Woolen (Blankets)</option>
                        <option value="Waterproof Vinyl" ${item?.fabric==='Waterproof Vinyl'?'selected':''}>Waterproof Vinyl / PU (Protectors)</option>
                        <option value="Disposable Non-Woven" ${item?.fabric==='Disposable Non-Woven'?'selected':''}>Disposable Non-Woven</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Supplier / Mill</label>
                    <input type="text" name="supplier" class="form-control" value="${item?.supplier || ''}" placeholder="e.g. Bombay Dyeing Hospital Linen">
                </div>
            </div>

            <div class="form-group">
                <label>Storage Rack / Laundry Notes</label>
                <textarea name="notes" class="form-control" rows="2" placeholder="e.g. Autoclave compatible, Ward 3 rack">${item?.notes || ''}</textarea>
            </div>

            <div class="modal-footer" style="padding-top:12px;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" style="font-weight:600;background:#7e22ce;border-color:#7e22ce;">💾 Save Linen Entry</button>
            </div>
        </form>
    `;

    showModal(`
        <div class="modal-header">
            <h3>${isEdit ? '✏️ Edit Linen Item' : '➕ New Linen Entry'}</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">${html}</div>
    `, true);

    setTimeout(() => {
        updateLinenBarcodePreview(outCode);
    }, 50);
}

function toggleCustomLinenName(val) {
    const box = document.getElementById('linenCustomNameBox');
    if (box) box.style.display = (val === 'Other (Custom Linen)') ? 'block' : 'none';
}

function toggleCustomLinenColor(val) {
    const box = document.getElementById('linenCustomColorBox');
    if (box) box.style.display = (val === 'Other / Custom') ? 'block' : 'none';
}

function pickQuickLinenColor(colorName) {
    const select = document.getElementById('linenColorSelectInput');
    if (select) {
        select.value = colorName;
        toggleCustomLinenColor(colorName);
    }
}

function toggleCustomLinenSize(selectEl) {
    const box = document.getElementById('linenCustomSizeBox');
    if (!box) return;
    if (selectEl.value === '__custom__') {
        box.style.display = 'block';
        const inp = document.getElementById('linenCustomSizeInput');
        if (inp) inp.focus();
    } else {
        box.style.display = 'none';
    }
}

function generateLinenBarcode() {
    const code = 'HMS-LIN-' + Math.floor(1000 + Math.random() * 9000);
    const inp = document.getElementById('linenFormOutBarcode');
    if (inp) inp.value = code;
    updateLinenBarcodePreview(code);
}

function updateLinenBarcodePreview(code) {
    code = (code || '').trim();
    const svg = document.getElementById('linenModalBarcodeSvg');
    const str = document.getElementById('linenModalBarcodeStr');
    if (str) str.textContent = code;
    if (svg && code && typeof JsBarcode !== 'undefined') {
        try {
            JsBarcode(svg, code, {
                format: 'CODE128',
                width: 1.4,
                height: 28,
                displayValue: false,
                margin: 0
            });
        } catch(e) {}
    }
}

function saveLinenItem() {
    const form = document.getElementById('newLinenForm');
    if (!form) return;

    const data = {};
    form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });

    let name = data.namePreset;
    if (name === 'Other (Custom Linen)' || !name) {
        name = (data.nameCustom || '').trim() || 'Hospital Bed Sheet';
    }

    let color = data.colorPreset;
    if (color === 'Other / Custom' || !color) {
        color = (data.colorCustom || '').trim() || 'Hospital White';
    }

    let size = data.sizePreset;
    if (size === '__custom__' || !size) {
        size = (data.sizeCustom || '').trim() || 'Standard';
        saveCustomLinenSize(size);
    }

    const outBarcode = (data.outBarcode || '').trim() || ('HMS-LIN-' + Math.floor(1000 + Math.random() * 9000));
    const autoPrint = document.getElementById('linenAutoPrintSticker')?.checked;

    const itemPayload = {
        name: name,
        category: 'Linen',
        isLinen: true,
        color: color,
        size: size,
        department: data.department || 'Linen',
        purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
        year: parseInt(data.year) || new Date().getFullYear(),
        price: parseFloat(data.price) || 0,
        quantity: parseInt(data.quantity) || 0,
        unit: data.unit || 'pcs',
        fabric: data.fabric || '100% Cotton',
        supplier: data.supplier || '',
        notes: data.notes || '',
        inBarcode: data.inBarcode || '',
        outBarcode: outBarcode,
        barcode: outBarcode
    };

    let savedId = data.id;
    if (data.id) {
        DB.update('inventory', data.id, itemPayload);
        APP.notify(`Linen "${name}" updated (${outBarcode})`, 'success');
    } else {
        const newItem = DB.add('inventory', itemPayload);
        savedId = newItem ? newItem.id : data.id;
        APP.notify(`New linen added (${outBarcode})`, 'success');
    }

    closeModal();
    renderInvLinenView();

    if (autoPrint && savedId) {
        setTimeout(() => {
            printBarcodeSticker(savedId);
        }, 300);
    }
}

/* ═══════════════════════════════════════════════════════════
   LINEN IN / OUT MODAL (DEPARTMENT-WISE WITH BARCODE)
══════════════════════════════════════════════════════════════ */
function showLinenInOutModal(linenId, defaultDirection = 'out') {
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Linen' || i.category === 'Bedding' || i.department === 'Linen' || i.isLinen);
    if (items.length === 0) {
        APP.notify('Please add linen items first', 'error');
        return;
    }

    const selectedItem = linenId ? items.find(i => i.id === linenId) : items[0];
    const depts = (DB.get('departments') || []).map(d => d.name).filter(Boolean);
    const standardDepts = ['Nursing', 'OT', 'ICU', 'General Ward', 'Deluxe Ward', 'Emergency', 'OPD', 'Facility', 'Laundry'];
    const allDepts = Array.from(new Set([...standardDepts, ...depts]));

    const html = `
        <form id="linenInOutForm" onsubmit="event.preventDefault();saveLinenInOut();">
            <div style="background:#fdf4ff;border-radius:8px;padding:12px 16px;margin-bottom:14px;border:1px solid #f0abfc;">
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-weight:700;font-size:12px;color:#701a75;">Select Linen Item by Barcode</label>
                    <select id="linenInOutItemSelect" class="form-control" onchange="updateLinenInOutDetails(this.value)" required>
                        ${items.map(i => `
                            <option value="${i.id}" ${selectedItem && selectedItem.id === i.id ? 'selected' : ''}>
                                [${i.outBarcode || i.barcode || 'NO-BARCODE'}] ${i.name} - Size: ${i.size || '-'} - Stock: ${i.quantity || 0}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div id="linenInOutDetailBox" style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px 12px;border-radius:6px;border:1px solid #f5d0fe;font-size:12px;">
                    <div>
                        <span id="linenInOutName" style="font-weight:700;color:#581c87;">${selectedItem?.name || ''}</span>
                        <div id="linenInOutSub" style="color:#7e22ce;font-size:11px;">Size: ${selectedItem?.size || '-'} · Barcode: ${selectedItem?.outBarcode || selectedItem?.barcode || '-'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px;color:#64748b;">Current Stock</div>
                        <span id="linenInOutCurrentQty" style="font-size:16px;font-weight:700;color:#7e22ce;">${selectedItem?.quantity || 0} ${selectedItem?.unit || 'pcs'}</span>
                    </div>
                </div>
            </div>

            <div class="form-group mb-3">
                <label style="font-weight:700;font-size:13px;">Movement Direction *</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <label style="display:flex;align-items:center;gap:8px;padding:10px;border:2px solid #bbf7d0;background:#f0fdf4;border-radius:8px;cursor:pointer;">
                        <input type="radio" name="linenDirection" value="in" ${defaultDirection === 'in' ? 'checked' : ''} onchange="toggleLinenDirection(this.value)">
                        <div>
                            <strong style="color:#166534;font-size:13px;">🟢 IN (Returned / Washed)</strong>
                            <div style="font-size:11px;color:#15803d;">Laundry return / Cleaned stock receipt</div>
                        </div>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;padding:10px;border:2px solid #fecaca;background:#fef2f2;border-radius:8px;cursor:pointer;">
                        <input type="radio" name="linenDirection" value="out" ${defaultDirection === 'out' ? 'checked' : ''} onchange="toggleLinenDirection(this.value)">
                        <div>
                            <strong style="color:#991b1b;font-size:13px;">🔴 OUT (Issue to Ward / Dept)</strong>
                            <div style="font-size:11px;color:#b91c1c;">Dispatch clean linen to ward or OT</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label id="linenDeptLabel" style="font-weight:700;">Ward / Department *</label>
                    <select id="linenInOutDept" name="dept" class="form-control" required>
                        <option value="">Select Ward / Department</option>
                        ${allDepts.map(d => `<option value="${d}" ${selectedItem?.department===d ? 'selected':''}>${d}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label style="font-weight:700;">Quantity *</label>
                    <input type="number" id="linenInOutQty" name="qty" class="form-control" min="1" value="5" required>
                </div>

                <div class="form-group">
                    <label>Nurse / In-charge Staff</label>
                    <input type="text" id="linenInOutStaff" name="staffName" class="form-control" placeholder="e.g. Sister Anjali (Ward 4 In-charge)">
                </div>

                <div class="form-group">
                    <label>Date &amp; Time</label>
                    <input type="datetime-local" name="date" class="form-control" value="${new Date().toISOString().slice(0, 16)}">
                </div>
            </div>

            <div class="form-group">
                <label>Remarks / Ward Bed Range / Laundry Slip No.</label>
                <input type="text" id="linenInOutNotes" name="notes" class="form-control" placeholder="e.g. Beds 201-215 daily change">
            </div>

            <div class="modal-footer" style="padding-top:12px;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" style="font-weight:700;background:#7e22ce;border-color:#7e22ce;">
                    Confirm Linen Circulation
                </button>
            </div>
        </form>
    `;

    showModal(`
        <div class="modal-header">
            <h3>⇄ Linen Ward Circulation (In / Out)</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">${html}</div>
    `, false);
}

function updateLinenInOutDetails(id) {
    const item = DB.getById('inventory', id);
    if (!item) return;
    const nameEl = document.getElementById('linenInOutName');
    const subEl = document.getElementById('linenInOutSub');
    const qtyEl = document.getElementById('linenInOutCurrentQty');
    const deptEl = document.getElementById('linenInOutDept');

    if (nameEl) nameEl.textContent = item.name;
    if (subEl) subEl.textContent = `Size: ${item.size || '-'} · Barcode: ${item.outBarcode || item.barcode || '-'}`;
    if (qtyEl) qtyEl.textContent = `${item.quantity || 0} ${item.unit || 'pcs'}`;
    if (deptEl && item.department) deptEl.value = item.department;
}

function toggleLinenDirection(val) {
    const lbl = document.getElementById('linenDeptLabel');
    if (lbl) {
        lbl.textContent = val === 'in' ? 'Received From Ward / Laundry *' : 'Issue To Ward / Department *';
    }
}

function saveLinenInOut() {
    const form = document.getElementById('linenInOutForm');
    if (!form) return;

    const itemId = document.getElementById('linenInOutItemSelect').value;
    const item = DB.getById('inventory', itemId);
    if (!item) {
        APP.notify('Linen item not found', 'error');
        return;
    }

    const direction = form.querySelector('input[name="linenDirection"]:checked')?.value || 'out';
    const dept = (document.getElementById('linenInOutDept')?.value || '').trim();
    const qty = parseInt(document.getElementById('linenInOutQty')?.value) || 0;
    const staffName = (document.getElementById('linenInOutStaff')?.value || '').trim();
    const notes = (document.getElementById('linenInOutNotes')?.value || '').trim();

    if (!dept) {
        APP.notify('Please select a department / ward', 'error');
        return;
    }
    if (qty <= 0) {
        APP.notify('Please enter a valid quantity', 'error');
        return;
    }

    const currentQty = parseInt(item.quantity) || 0;
    if (direction === 'out' && qty > currentQty) {
        APP.notify(`Only ${currentQty} ${item.unit || 'pcs'} available in stock!`, 'error');
        return;
    }

    const newQty = direction === 'out' ? (currentQty - qty) : (currentQty + qty);
    DB.update('inventory', itemId, { quantity: newQty });

    const user = AUTH.currentUser();
    const unitPrice = parseFloat(item.price) || 0;

    DB.add('inventory_movements', {
        itemId: itemId,
        itemName: item.name,
        type: direction,
        qty: qty,
        unit: item.unit || 'pcs',
        unitPrice: unitPrice,
        totalValue: qty * unitPrice,
        dept: dept,
        by: user ? user.fullName : 'Admin',
        staffName: staffName,
        barcode: item.outBarcode || item.barcode || '',
        category: 'Linen',
        size: item.size || '',
        notes: notes ? `${notes} (Nurse/Staff: ${staffName || 'N/A'})` : `Nurse/Staff: ${staffName || 'N/A'}`,
        date: new Date().toISOString()
    });

    APP.notify(`${direction === 'out' ? 'Issued' : 'Received'} ${qty} ${item.unit || 'pcs'} of ${item.name} (${dept}) ✓`, 'success');
    closeModal();
    renderInvLinenView();
}

function invDownloadLinenExcel() {
    const items = (DB.get('inventory') || []).filter(i => i.category === 'Linen' || i.category === 'Bedding' || i.department === 'Linen' || i.isLinen);
    if (items.length === 0) { APP.notify('No linen items to export', 'info'); return; }
    if (typeof XLSX === 'undefined') { APP.notify('Excel library not loaded', 'error'); return; }

    const headers = ['Barcode', 'Linen Name', 'Size', 'Color', 'Department', 'Quantity', 'Unit', 'Price (₹)', 'Total Value (₹)', 'Purchase Date', 'Fabric', 'Supplier'];
    const rows = items.map(i => {
        const q = parseInt(i.quantity) || 0;
        const p = parseFloat(i.price) || 0;
        return [
            i.outBarcode || i.barcode || '',
            i.name || '',
            i.size || '',
            i.color || '',
            i.department || '',
            q,
            i.unit || 'pcs',
            p.toFixed(2),
            (q * p).toFixed(2),
            i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString('en-IN') : '',
            i.fabric || '',
            i.supplier || ''
        ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
    XLSX.utils.book_append_sheet(wb, ws, 'Linen');
    XLSX.writeFile(wb, `HMS_Linen_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function invDownloadLinenPdf() {
    window.print();
}

// Window exports for HTML onclick handlers
window.renderInvUniformTab = renderInvUniformTab;
window.renderInvUniformView = renderInvUniformView;
window.showNewUniformForm = showNewUniformForm;
window.saveUniformItem = saveUniformItem;
window.showUniformInOutModal = showUniformInOutModal;
window.saveUniformInOut = saveUniformInOut;
window.quickUniformQtyAdjust = quickUniformQtyAdjust;
window.handleUniformBarcodeScan = handleUniformBarcodeScan;
window.toggleCustomUniformName = toggleCustomUniformName;
window.toggleCustomUniformColor = toggleCustomUniformColor;
window.toggleCustomUniformSize = toggleCustomUniformSize;
window.generateUniformBarcode = generateUniformBarcode;
window.updateUniformBarcodePreview = updateUniformBarcodePreview;
window.calcUniformTotalValue = calcUniformTotalValue;
window.invDownloadUniformExcel = invDownloadUniformExcel;
window.invDownloadUniformPdf = invDownloadUniformPdf;

window.renderInvLinenTab = renderInvLinenTab;
window.renderInvLinenView = renderInvLinenView;
window.showNewLinenForm = showNewLinenForm;
window.saveLinenItem = saveLinenItem;
window.showLinenInOutModal = showLinenInOutModal;
window.saveLinenInOut = saveLinenInOut;
window.quickLinenQtyAdjust = quickLinenQtyAdjust;
window.handleLinenBarcodeScan = handleLinenBarcodeScan;
window.toggleCustomLinenName = toggleCustomLinenName;
window.toggleCustomLinenColor = toggleCustomLinenColor;
window.pickQuickLinenColor = pickQuickLinenColor;
window.toggleCustomLinenSize = toggleCustomLinenSize;
window.generateLinenBarcode = generateLinenBarcode;
window.updateLinenBarcodePreview = updateLinenBarcodePreview;
window.invDownloadLinenExcel = invDownloadLinenExcel;
window.invDownloadLinenPdf = invDownloadLinenPdf;
