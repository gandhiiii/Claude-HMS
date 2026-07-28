// Storekeeper Dashboard
// - Fulfill facility_approved material requests
// - Create own requests → goes to Facility HOD
// - HOD-created requests appear directly for fulfillment
// - Inventory status with department-wise stock and predictions

var _skTab = 'overview';
var _skData = {};
var _skCustomItems = [];

function renderStorekeeperDashboard(container) {
    var user = AUTH.currentUser();
    if (!user) { container.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }

    var pendingFulfill = (DB.get('material_requests') || []).filter(function(r) {
        return r.status === 'facility_approved';
    });
    var myRequests = (DB.get('material_requests') || []).filter(function(r) {
        return r.createdBy === user.username;
    });
    var inventory = DB.get('inventory') || [];
    var lowStock   = inventory.filter(function(i) { return parseInt(i.quantity) > 0 && parseInt(i.quantity) < 10; });
    var outOfStock = inventory.filter(function(i) { return parseInt(i.quantity) === 0; });
    var pendingReturns = (DB.get('material_returns') || []).filter(function(r) {
        return r.status === 'pending';
    });

    _skData = { user: user, pendingFulfill: pendingFulfill, myRequests: myRequests,
                inventory: inventory, lowStock: lowStock, outOfStock: outOfStock,
                pendingReturns: pendingReturns };

    var tabs = [
        { id: 'overview',    label: '📊 Overview' },
        { id: 'fulfill',     label: '✅ Fulfill Requests', badge: pendingFulfill.length, bc: 'badge-warning' },
        { id: 'myrequests',  label: '📦 My Requests', badge: myRequests.filter(function(r){ return r.status !== 'confirmed' && r.status !== 'partial'; }).length, bc: 'badge-info' },
        { id: 'inventory',   label: '🏪 Inventory Status', badge: outOfStock.length, bc: 'badge-danger' },
        { id: 'returns',     label: '↩️ Returns', badge: pendingReturns.length, bc: 'badge-warning' },
        { id: 'reports',     label: '📈 Reports' }
    ];

    var html = '<div style="background:linear-gradient(135deg,#1a6b3c,#2e7d32);border-radius:14px;padding:20px 24px;color:#fff;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">'
        + '<div style="display:flex;align-items:center;gap:14px;">'
        + '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:26px;">🏪</div>'
        + '<div><div style="font-size:20px;font-weight:700;">' + (user.fullName || user.username) + '</div>'
        + '<div style="font-size:13px;opacity:.85;">Storekeeper' + (user.department ? ' — ' + user.department : '') + '</div></div></div>'
        + '<div style="text-align:right;font-size:12px;opacity:.8;">'
        + new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'})
        + '</div></div>'

        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + _skKpi('✅', 'To Fulfill',   pendingFulfill.length,                                                    '#e8f5e9', '#2e7d32',      'fulfill')
        + _skKpi('🔢', 'Total Stock',  inventory.reduce(function(s,i){ return s+(parseInt(i.quantity)||0); },0), '#f3e5f5', '#6a1b9a',      'inventory')
        + _skKpi('📦', 'My Requests',  myRequests.length,                                                        '#e3f2fd', '#1565c0',      'myrequests')
        + _skKpi('⚠️', 'Low Stock',    lowStock.length,                                                          '#fff3e0', '#e65100',      'inventory')
        + _skKpi('❌', 'Out of Stock',  outOfStock.length,                                                       '#ffebee', 'var(--danger)', 'inventory')
        + '</div>'

        + (pendingFulfill.length > 0
            ? '<div style="background:#fff3e0;border:1px solid var(--warning);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
              + '<span style="font-size:13px;font-weight:600;color:#e65100;">📋 ' + pendingFulfill.length + ' request(s) approved and awaiting fulfillment</span>'
              + '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="skTabSwitch(\'fulfill\')">Fulfill Now</button></div>' : '')
        + (outOfStock.length > 0
            ? '<div style="background:#ffebee;border:1px solid var(--danger);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
              + '<span style="font-size:13px;font-weight:600;color:var(--danger);">🚨 ' + outOfStock.length + ' item(s) completely out of stock</span>'
              + '<button class="btn btn-sm btn-danger" onclick="skTabSwitch(\'inventory\')">View</button></div>' : '')
        + (pendingReturns.length > 0
            ? '<div style="background:#e8f5e9;border:1px solid var(--secondary);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
              + '<span style="font-size:13px;font-weight:600;color:#2e7d32;">↩️ ' + pendingReturns.length + ' material return(s) awaiting your processing</span>'
              + '<button class="btn btn-sm btn-success" onclick="skTabSwitch(\'returns\')">Process</button></div>' : '')

        + '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px 12px 0 0;padding:4px 4px 0;display:flex;flex-wrap:wrap;gap:2px;border-bottom:none;">'
        + tabs.map(function(t) {
            var lbl = t.label + (t.badge > 0 ? ' <span class="badge ' + (t.bc || 'badge-primary') + '" style="font-size:10px;margin-left:2px;">' + t.badge + '</span>' : '');
            return '<button class="hod-tab-btn' + (t.id === 'overview' ? ' active' : '') + '" data-sktab="' + t.id + '" onclick="skTabSwitch(\'' + t.id + '\')">' + lbl + '</button>';
        }).join('')
        + '</div>'
        + '<div style="background:var(--card);border:1px solid var(--border);border-top:3px solid #2e7d32;border-radius:0 0 12px 12px;padding:18px;" id="skTabContent"></div>';

    container.innerHTML = html;
    _skTab = 'overview';
    _renderSkTab('overview');
}

function _skKpi(icon, label, val, bg, color, tab) {
    return '<div class="hod-kpi" onclick="skTabSwitch(\'' + tab + '\')">'
        + '<div class="hod-kpi-icon" style="background:' + bg + ';">' + icon + '</div>'
        + '<div><div class="hod-kpi-val" style="color:' + color + ';">' + val + '</div>'
        + '<div class="hod-kpi-lbl">' + label + '</div></div></div>';
}

function skTabSwitch(tab) {
    _skTab = tab;
    document.querySelectorAll('[data-sktab]').forEach(function(el) {
        el.classList.toggle('active', el.dataset.sktab === tab);
    });
    _renderSkTab(tab);
}

function _renderSkTab(tab) {
    var el = document.getElementById('skTabContent');
    if (!el) return;
    var map = { overview: _skOverview, fulfill: _skFulfill, myrequests: _skMyRequests, inventory: _skInventory,
                returns: _skReturns, reports: _skReports };
    if (map[tab]) map[tab](el);
}

/* ═══ OVERVIEW ═══ */
function _skOverview(el) {
    var d = _skData;
    var recentMoves = (DB.get('inventory_movements') || []).slice(-6).reverse();
    var urgentFulfill = d.pendingFulfill.slice(0, 4);

    var html = '<div class="grid-2" style="gap:16px;">'
        + '<div><div style="font-weight:700;font-size:14px;margin-bottom:10px;">📋 Next to Fulfill</div>';

    if (urgentFulfill.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:20px;text-align:center;font-size:13px;color:var(--gray);">Nothing pending ✓</div>';
    } else {
        urgentFulfill.forEach(function(r) {
            var items = (r.items || []).map(function(i){ return i.name + ' ×' + i.qty; }).join(', ');
            var srcTag = r._source === 'hod' ? '<span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 5px;border-radius:4px;">HOD</span> ' : '';
            html += '<div style="background:var(--light-gray);border-radius:8px;padding:10px 12px;margin-bottom:6px;">'
                + '<div style="font-size:13px;font-weight:700;">' + srcTag + (r.title || 'Request') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">From: ' + (r.createdByName || '-') + ' · ' + (r.department || '-') + '</div>'
                + '<div style="font-size:11px;margin-top:2px;color:var(--text);">' + (items || '-') + '</div>'
                + '<button class="btn btn-sm btn-success" style="margin-top:6px;" onclick="skStoreFulfill(\'' + r.id + '\')">✅ Fulfill</button></div>';
        });
    }
    html += '</div>'
        + '<div><div style="font-weight:700;font-size:14px;margin-bottom:10px;">📊 Recent Stock Movements</div>';
    if (recentMoves.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:20px;text-align:center;font-size:13px;color:var(--gray);">No movements recorded yet</div>';
    } else {
        recentMoves.forEach(function(m) {
            html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;background:var(--light-gray);margin-bottom:4px;">'
                + '<span style="font-size:18px;">' + (m.type === 'in' ? '📥' : '📤') + '</span>'
                + '<div style="flex:1;min-width:0;">'
                + '<div style="font-size:12px;font-weight:600;">' + (m.itemName || '-') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + (m.type === 'in' ? 'IN' : 'OUT') + ' ' + (m.qty || 0)
                + (m.dept ? ' → ' + m.dept : '') + (m.unitPrice ? ' · ₹' + parseFloat(m.unitPrice).toFixed(2) + '/unit' : '') + '</div>'
                + '</div>'
                + '<span style="font-size:10px;color:var(--gray);white-space:nowrap;">' + APP.formatDate(m.date) + '</span>'
                + '</div>';
        });
    }
    html += '</div></div>'
        + '<div style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px;">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">⚡ Quick Actions</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:8px;">'
        + '<button class="btn btn-primary" onclick="skCreateRequest()">📦 Request Materials</button>'
        + '<button class="btn btn-outline" onclick="skTabSwitch(\'fulfill\')">✅ Fulfill Requests</button>'
        + '<button class="btn btn-outline" onclick="skTabSwitch(\'returns\')">↩️ Process Returns</button>'
        + '<button class="btn btn-outline" onclick="skTabSwitch(\'reports\')">📈 Send Report</button>'
        + '<button class="btn btn-outline" onclick="Router.navigate(\'inventory\')">📦 Full Inventory</button>'
        + '<button class="btn btn-outline" onclick="Router.navigate(\'problems\')">🔧 Report Problem</button>'
        + '</div></div>';

    el.innerHTML = html;
}

/* ═══ FULFILL REQUESTS ═══ */
function _skFulfill(el) {
    var requests = (DB.get('material_requests') || []).filter(function(r) {
        return r.status === 'facility_approved';
    }).slice().reverse();
    _skData.pendingFulfill = requests;

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:16px;">✅ Fulfill Material Requests</div>'
        + '<div style="font-size:12px;color:var(--gray);">Requests approved and ready for you to fulfill</div></div>'
        + '<span style="font-size:13px;color:var(--gray);">' + requests.length + ' pending</span></div>';

    if (requests.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">✅</div>'
            + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">All caught up!</div>'
            + '<div style="font-size:13px;color:var(--gray);">No approved requests pending fulfillment.</div></div>';
    } else {
        requests.forEach(function(r) {
            var itemsHtml = (r.items || []).map(function(i) {
                return '<span style="background:var(--light-gray);border-radius:4px;padding:2px 7px;font-size:11px;margin-right:4px;margin-bottom:2px;display:inline-block;">'
                    + i.name + ' ×' + i.qty + (i.unit ? ' ' + i.unit : '') + '</span>';
            }).join('');
            var srcBadge = r._source === 'hod'
                ? '<span style="background:#e3f2fd;color:#1565c0;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px;">👔 From HOD</span>'
                : (r._source === 'storekeeper' ? '<span style="background:#e8f5e9;color:#2e7d32;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px;">🏪 Own Request</span>' : '');
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">'
                + '<div><div style="font-size:14px;font-weight:700;">' + (r.title || 'Request') + srcBadge + '</div>'
                + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">From: <strong>' + (r.createdByName || r.createdBy || '?') + '</strong>'
                + ' · ' + (r.department || '-') + ' · ' + APP.formatDate(r.createdAt) + '</div></div>'
                + '<span class="badge badge-info">Ready to Fulfill</span></div>'
                + '<div style="margin-bottom:8px;flex-wrap:wrap;">' + (itemsHtml || '<span style="font-size:12px;color:var(--gray);">No items listed</span>') + '</div>'
                + (r.reason ? '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">📝 ' + r.reason + '</div>' : '')
                + '<button class="btn btn-sm btn-success" onclick="skStoreFulfill(\'' + r.id + '\')">📦 Mark Fulfilled</button></div>';
        });
    }
    el.innerHTML = html;
}

var _skFulfillId = null;

function skStoreFulfill(id) {
    var r = DB.getById('material_requests', id);
    if (!r) { APP.notify('Request not found', 'error'); return; }
    _skFulfillId = id;
    var inventory = DB.get('inventory') || [];

    // Build per-item rows with dropdown to pick the matching inventory item
    var allOpts = '<option value="">-- Skip (no stock deduction) --</option>'
        + inventory.map(function(inv) {
            return '<option value="' + inv.id + '">' + inv.name + ' (Stock: ' + (inv.quantity || 0) + ' ' + (inv.unit || 'pcs') + ')</option>';
        }).join('');

    var itemRows = (r.items || []).map(function(item, i) {
        // Try to pre-select matching inventory item
        var nameLow = (item.name || '').trim().toLowerCase();
        var matched = inventory.find(function(inv) {
            return (inv.name || '').trim().toLowerCase() === nameLow;
        });

        var opts = '<option value="">-- Skip (no stock deduction) --</option>'
            + inventory.map(function(inv) {
                var sel = (matched && inv.id === matched.id) ? ' selected' : '';
                return '<option value="' + inv.id + '"' + sel + '>' + inv.name + ' (Stock: ' + (inv.quantity || 0) + ' ' + (inv.unit || 'pcs') + ')</option>';
            }).join('');

        var matchBadge = matched
            ? '<span style="background:#e8f5e9;color:#2e7d32;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;">✓ matched</span>'
            : '<span style="background:#fff3e0;color:#e65100;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;">⚠ no auto-match — select below</span>';

        return '<div style="background:var(--light-gray);border-radius:8px;padding:12px;margin-bottom:8px;">'
            + '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">'
            + item.name + ' ×' + item.qty + (item.unit ? ' ' + item.unit : '') + matchBadge + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;">'
            + '<select class="form-control sk-fulfill-inv" data-idx="' + i + '" data-req-name="' + (item.name || '').replace(/"/g, '') + '" data-req-qty="' + item.qty + '" data-req-unit="' + (item.unit || 'pcs') + '">'
            + opts + '</select>'
            + '<input type="number" class="form-control sk-fulfill-qty" data-idx="' + i + '" value="' + item.qty + '" min="0" style="width:80px;" title="Qty to deduct">'
            + '</div>'
            + '<div style="font-size:11px;color:var(--gray);margin-top:4px;">Select inventory item to deduct from, and adjust quantity if needed</div>'
            + '</div>';
    }).join('');

    var html = '<div>'
        + '<p style="font-size:13px;color:var(--gray);margin-bottom:12px;">Request from: <strong>' + (r.createdByName || r.createdBy) + '</strong> · ' + (r.department || '-') + '</p>'
        + (r.reason ? '<p style="font-size:12px;color:var(--gray);margin-bottom:10px;">Reason: ' + r.reason + '</p>' : '')
        + itemRows
        + '<p style="font-size:11px;color:var(--gray);margin-top:4px;">Items set to "Skip" will not reduce stock. Quantity can be adjusted before confirming.</p>'
        + '</div>';

    openFormModal('📦 Fulfill: ' + (r.title || 'Request'), html, 'skDoFulfill()', false);
}

function skDoFulfill() {
    var id = _skFulfillId;
    if (!id) return false;
    var r = DB.getById('material_requests', id);
    if (!r) { APP.notify('Request not found', 'error'); return false; }
    var user = AUTH.currentUser();
    var now  = new Date().toISOString();

    var deducted = 0, skipped = 0;
    document.querySelectorAll('.sk-fulfill-inv').forEach(function(sel, i) {
        var invId = sel.value;
        if (!invId) { skipped++; return; }
        var qtyInput = document.querySelectorAll('.sk-fulfill-qty')[i];
        var issueQty = parseInt((qtyInput || {}).value) || 0;
        if (issueQty <= 0) { skipped++; return; }

        var inv = DB.getById('inventory', invId);
        if (!inv) { skipped++; return; }
        var newQty = Math.max(0, (parseInt(inv.quantity) || 0) - issueQty);
        DB.update('inventory', invId, { quantity: newQty });
        DB.add('inventory_movements', {
            itemId: invId, itemName: inv.name, type: 'out',
            qty: issueQty, unit: inv.unit || 'pcs',
            unitPrice: parseFloat(inv.price) || 0,
            totalValue: issueQty * (parseFloat(inv.price) || 0),
            dept: r.department || '', by: user.fullName,
            notes: 'Request fulfilled: ' + (r.title || ''), date: now
        });
        deducted++;
    });

    DB.update('material_requests', id, {
        status: 'store_fulfilled',
        fulfilledBy: user.username,
        fulfilledByName: user.fullName,
        fulfilledAt: now
    });

    var msg = 'Fulfilled! ' + deducted + ' item(s) deducted from stock';
    if (skipped > 0) msg += ', ' + skipped + ' skipped';
    APP.notify(msg, 'success');
    _skData.pendingFulfill = (DB.get('material_requests') || []).filter(function(r) { return r.status === 'facility_approved'; });
    _renderSkTab('fulfill');
    return true;
}

/* ═══ MY REQUESTS ═══ */
function _skMyRequests(el) {
    var user = _skData.user;
    var requests = (DB.get('material_requests') || []).filter(function(r) {
        return r.createdBy === user.username;
    }).slice().reverse();
    _skData.myRequests = requests;

    var stMap = {
        'hod_approved':      { label: 'Awaiting Facility HOD', badge: 'badge-warning' },
        'facility_approved': { label: 'HOD Approved — Being Fulfilled', badge: 'badge-info' },
        'store_fulfilled':   { label: 'Ready to Collect ✓', badge: 'badge-success' },
        'confirmed':         { label: 'Confirmed & Closed', badge: 'badge-success' },
        'partial':           { label: 'Partially Fulfilled', badge: 'badge-warning' },
        'facility_rejected': { label: 'Rejected by HOD', badge: 'badge-danger' },
        'hod_rejected':      { label: 'Rejected by HOD', badge: 'badge-danger' }
    };

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:16px;">📦 My Material Requests</div>'
        + '<div style="font-size:12px;color:var(--gray);">Requests you submitted — routed to Facility HOD for approval</div></div>'
        + '<button class="btn btn-primary btn-sm" onclick="skCreateRequest()">+ New Request</button></div>';

    if (requests.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:13px;color:var(--gray);margin-bottom:10px;">No requests yet.</div>'
            + '<button class="btn btn-primary" onclick="skCreateRequest()">+ Create First Request</button></div>';
    } else {
        requests.forEach(function(r) {
            var st = stMap[r.status] || { label: r.status || 'pending', badge: 'badge-warning' };
            var items = (r.items || []).map(function(i){ return i.name + ' ×' + i.qty; }).join(', ');
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:6px;">'
                + '<div><div style="font-size:14px;font-weight:700;">' + (r.title || 'Request') + '</div>'
                + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">' + APP.formatDate(r.createdAt) + (items ? ' · ' + items.substring(0, 80) : '') + '</div>'
                + (r.reason ? '<div style="font-size:12px;color:var(--gray);">Reason: ' + r.reason + '</div>' : '')
                + (r.hodRejectionNote || r.facilityRejectionNote ? '<div style="font-size:12px;color:var(--danger);margin-top:4px;">⛔ ' + (r.hodRejectionNote || r.facilityRejectionNote) + '</div>' : '')
                + '</div>'
                + '<span class="badge ' + st.badge + '">' + st.label + '</span></div>'
                + (r.status === 'store_fulfilled'
                    ? '<button class="btn btn-sm btn-success" onclick="skConfirmReceipt(\'' + r.id + '\')">✅ Confirm Receipt</button>'
                    : '')
                + '</div>';
        });
    }
    el.innerHTML = html;
}

function skConfirmReceipt(id) {
    var note = prompt('Any notes about the receipt? (optional):');
    if (note === null) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'confirmed',
        confirmedBy: user.username,
        confirmedByName: user.fullName,
        confirmedAt: new Date().toISOString(),
        confirmationNote: note || ''
    });
    APP.notify('Receipt confirmed!', 'success');
    _skData.myRequests = (DB.get('material_requests') || []).filter(function(r){ return r.createdBy === user.username; });
    _renderSkTab('myrequests');
}

/* ═══ INVENTORY STATUS ═══ */
function _skInventory(el) {
    var inventory = DB.get('inventory') || [];
    var movements  = DB.get('inventory_movements') || [];
    var thirtyAgo  = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    // Per-item prediction (based on last-30-day out movements)
    function _predict(item) {
        var outQty = movements.filter(function(m) {
            return m.itemId === item.id && m.type === 'out' && (m.date || '') >= thirtyAgo;
        }).reduce(function(s, m) { return s + (parseFloat(m.qty) || 0); }, 0);
        var rate = outQty / 30;
        return { rate: rate, days: rate > 0 ? Math.floor(parseInt(item.quantity) / rate) : null };
    }

    // Department-wise totals
    var deptMap = {};
    inventory.forEach(function(i) {
        var d = i.department || 'Unassigned';
        if (!deptMap[d]) deptMap[d] = { items: 0, qty: 0, value: 0 };
        deptMap[d].items++;
        deptMap[d].qty   += parseInt(i.quantity) || 0;
        deptMap[d].value += (parseInt(i.quantity) || 0) * (parseFloat(i.price) || 0);
    });

    var totalValue = inventory.reduce(function(s,i){ return s + (parseInt(i.quantity)||0)*(parseFloat(i.price)||0); }, 0);
    var totalQty   = inventory.reduce(function(s,i){ return s + (parseInt(i.quantity)||0); }, 0);
    var lowStock   = inventory.filter(function(i){ return parseInt(i.quantity) < 10; });
    var critical   = lowStock.filter(function(i){ var p=_predict(i); return p.days !== null && p.days <= 7; });

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + _skKpi('📦', 'Total Items',    inventory.length,             '#e3f2fd', '#1565c0',      'inventory')
        + _skKpi('🔢', 'Total Qty',      totalQty,                     '#f3e5f5', '#6a1b9a',      'inventory')
        + _skKpi('💰', 'Total Value',    '₹' + totalValue.toFixed(0), '#e8f5e9', '#2e7d32',      'inventory')
        + _skKpi('⚠️', 'Low Stock',      lowStock.length,              '#fff3e0', '#e65100',      'inventory')
        + _skKpi('🚨', 'Critical ≤7d',   critical.length,              '#ffebee', 'var(--danger)', 'inventory')
        + '</div>';

    // Department-wise
    html += '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🏢 Stock by Department</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:18px;">';
    Object.keys(deptMap).sort().forEach(function(d) {
        var ds = deptMap[d];
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:12px;">'
            + '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">' + d + '</div>'
            + '<div style="font-size:12px;color:var(--gray);">' + ds.items + ' items · ' + ds.qty + ' units</div>'
            + '<div style="font-size:14px;font-weight:700;color:var(--primary);">₹' + ds.value.toFixed(2) + '</div>'
            + '</div>';
    });
    html += '</div>';

    // Low stock + predictions
    if (lowStock.length > 0) {
        html += '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">⚠️ Low Stock &amp; Future Predictions</div>';
        lowStock.forEach(function(i) {
            var p   = _predict(i);
            var qty = parseInt(i.quantity);
            var daysColor = 'var(--gray)';
            var daysText  = 'No usage data yet';
            if (qty === 0) { daysText = '🚨 Out of stock'; daysColor = 'var(--danger)'; }
            else if (p.days !== null) {
                daysText  = p.days + ' day' + (p.days !== 1 ? 's' : '') + ' remaining (≈' + p.rate.toFixed(1) + '/day)';
                daysColor = p.days <= 3 ? 'var(--danger)' : p.days <= 7 ? '#e65100' : '#f59e0b';
            }
            html += '<div style="background:var(--card);border:1px solid ' + (qty===0 ? 'var(--danger)' : '#f59e0b') + ';border-left:4px solid ' + daysColor + ';border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
                + '<div><div style="font-size:13px;font-weight:700;">' + i.name + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + (i.department || '-') + ' · ' + qty + ' ' + (i.unit || 'pcs') + ' in stock</div>'
                + '<div style="font-size:12px;font-weight:600;color:' + daysColor + ';margin-top:2px;">' + daysText + '</div>'
                + '</div>'
                + '<button class="btn btn-sm btn-primary" onclick="skCreateRequest()">📦 Request More</button>'
                + '</div>';
        });
    } else {
        html += '<div style="background:#e8f5e9;border-radius:8px;padding:16px;text-align:center;font-size:13px;color:#2e7d32;">All items are adequately stocked ✓</div>';
    }

    el.innerHTML = html;
}

/* ═══ CREATE STOREKEEPER REQUEST ═══ */
function skCreateRequest() {
    var inventory = DB.get('inventory') || [];
    var itemOpts = inventory.map(function(inv) {
        return '<option value="' + (inv.name || '').replace(/"/g, '&quot;') + '">' + inv.name + ' (Stock: ' + (inv.quantity || 0) + ' ' + (inv.unit || 'pcs') + ')</option>';
    }).join('');
    if (!itemOpts) itemOpts = '<option value="">No inventory items yet</option>';

    var html = '<form id="skReqForm">'
        + '<div class="form-group"><label>Request Title *</label><input type="text" name="title" class="form-control" required placeholder="e.g. Restock surgical gloves"></div>'
        + '<div class="form-group"><label>Reason / Justification</label><textarea name="reason" class="form-control" rows="2" placeholder="Why are these materials needed?"></textarea></div>'
        + '<div class="form-group"><label>Items from Inventory</label>'
        + '<div id="skItemsContainer"><div class="mat-item-row" style="display:flex;gap:6px;margin-bottom:4px;">'
        + '<select class="form-control mat-item-select" style="flex:2;">' + itemOpts + '</select>'
        + '<input type="number" class="form-control mat-item-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control mat-item-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-success" onclick="addMatItemRow()">+</button>'
        + '</div></div></div>'
        + '<div class="form-group"><label>Custom Item (not in inventory)</label>'
        + '<div style="display:flex;gap:6px;">'
        + '<input type="text" id="skCustomName" class="form-control" placeholder="Item name" style="flex:2;">'
        + '<input type="number" id="skCustomQty" class="form-control" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<button type="button" class="btn btn-sm btn-primary" onclick="skAddCustomItem()">Add</button>'
        + '</div></div>'
        + '</form>';

    _skCustomItems = [];
    openFormModal('New Material Request → Facility HOD', html, 'skSaveRequest()', true);
}

function skAddCustomItem() {
    var name = (document.getElementById('skCustomName') || {}).value;
    name = name ? name.trim() : '';
    var qty = parseInt((document.getElementById('skCustomQty') || {}).value) || 1;
    if (!name) { APP.notify('Enter item name', 'error'); return; }
    _skCustomItems.push({ name: name, qty: qty, unit: 'pcs' });
    if (document.getElementById('skCustomName'))  document.getElementById('skCustomName').value = '';
    if (document.getElementById('skCustomQty'))   document.getElementById('skCustomQty').value  = '1';
    APP.notify('Added: ' + name + ' ×' + qty, 'success');
}

function skSaveRequest() {
    var user = AUTH.currentUser();
    var form = document.getElementById('skReqForm');
    if (!form) return false;
    var title = ((form.querySelector('[name="title"]') || {}).value || '').trim();
    var reason = (form.querySelector('[name="reason"]') || {}).value || '';
    if (!title) { APP.notify('Enter a request title', 'error'); return false; }

    var items = [];
    document.querySelectorAll('.mat-item-row').forEach(function(row) {
        var name = (row.querySelector('.mat-item-select') || {}).value || '';
        var qty  = parseInt((row.querySelector('.mat-item-qty')   || {}).value) || 1;
        var unit = (row.querySelector('.mat-item-unit')  || {}).value || 'pcs';
        if (name) items.push({ name: name, qty: qty, unit: unit });
    });
    _skCustomItems.forEach(function(ci) { items.push(ci); });
    if (!items.length) { APP.notify('Add at least one item', 'error'); return false; }

    // Storekeeper request bypasses Dept HOD — goes straight to Facility HOD
    DB.add('material_requests', {
        title: title,
        department: user.department || 'Store',
        reason: reason,
        items: items,
        status: 'hod_approved',        // already past dept HOD stage
        _source: 'storekeeper',
        createdBy: user.username,
        createdByName: user.fullName,
        hodApprovedBy: user.fullName,   // storekeeper self-approved dept stage
        hodApprovedAt: new Date().toISOString()
    });
    _skCustomItems = [];
    APP.notify('Request sent to Facility HOD for approval', 'success');
    _skData.myRequests = (DB.get('material_requests') || []).filter(function(r) { return r.createdBy === user.username; });
    _renderSkTab('myrequests');
    return true;
}

/* ═══ RETURNS TAB ═══ */
function _skReturns(el) {
    var returns = (DB.get('material_returns') || []).slice().reverse();
    _skData.pendingReturns = returns.filter(function(r){ return r.status === 'pending'; });

    var stMap = {
        'pending':   { label: 'Awaiting Processing', badge: 'badge-warning' },
        'received':  { label: 'Processed', badge: 'badge-success' }
    };

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:16px;">↩️ Material Returns</div>'
        + '<div style="font-size:12px;color:var(--gray);">Returns submitted by employees and HODs — process each to update inventory</div></div>'
        + '<span style="font-size:13px;color:var(--gray);">' + _skData.pendingReturns.length + ' pending</span></div>';

    if (returns.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            + '<div style="font-size:32px;margin-bottom:8px;">↩️</div>'
            + '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No returns yet</div>'
            + '<div style="font-size:13px;color:var(--gray);">Employees and HODs can submit material return requests from their dashboards.</div></div>';
    } else {
        returns.forEach(function(r) {
            var st = stMap[r.status] || { label: r.status, badge: 'badge-warning' };
            var itemsHtml = (r.items || []).map(function(i) {
                return '<span style="background:var(--light-gray);border-radius:4px;padding:2px 7px;font-size:11px;margin-right:4px;display:inline-block;">'
                    + i.name + ' ×' + i.qty + (i.unit ? ' ' + i.unit : '') + '</span>';
            }).join('');

            html += '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid '
                + (r.status === 'pending' ? 'var(--warning)' : 'var(--secondary)') + ';border-radius:10px;padding:14px;margin-bottom:10px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">'
                + '<div><div style="font-size:14px;font-weight:700;">' + (r.title || 'Return') + '</div>'
                + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">From: <strong>' + (r.createdByName || r.createdBy) + '</strong>'
                + ' · ' + (r.department || '-') + ' · ' + APP.formatDate(r.createdAt) + '</div>'
                + (r.reason ? '<div style="font-size:12px;color:var(--gray);margin-top:2px;">Reason: ' + r.reason + '</div>' : '')
                + '</div><span class="badge ' + st.badge + '">' + st.label + '</span></div>'
                + '<div style="margin-bottom:8px;flex-wrap:wrap;">' + (itemsHtml || '-') + '</div>';

            if (r.status === 'pending') {
                html += '<button class="btn btn-sm btn-success" onclick="skReceiveReturn(\'' + r.id + '\')">↩️ Receive &amp; Process</button>';
            } else {
                // Show processed details
                var detailHtml = (r.itemDetails || []).map(function(d) {
                    var condColor = d.condition === 'good' ? '#2e7d32' : d.condition === 'damaged' ? 'var(--danger)' : '#e65100';
                    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--light-gray);border-radius:6px;margin-bottom:4px;font-size:12px;">'
                        + '<span>' + d.name + '</span>'
                        + '<span>Returned: ' + d.returnedQty + (d.unit ? ' ' + d.unit : '') + '</span>'
                        + '<span style="color:' + condColor + ';font-weight:700;">' + (d.condition || '-') + '</span>'
                        + (d.addedBackToInventory ? '<span style="background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:4px;font-size:10px;">Back in stock ✓</span>' : '')
                        + '</div>';
                }).join('');
                html += '<div style="margin-top:6px;">'
                    + '<div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;">Processed by ' + (r.receivedByName || r.receivedBy) + ' on ' + APP.formatDate(r.receivedAt) + '</div>'
                    + detailHtml
                    + (r.generalNotes ? '<div style="font-size:11px;color:var(--gray);margin-top:4px;">Notes: ' + r.generalNotes + '</div>' : '')
                    + '</div>';
            }
            html += '</div>';
        });
    }
    el.innerHTML = html;
}

var _skReturnId = null;

function skReceiveReturn(id) {
    _skReturnId = id;
    var ret = DB.getById('material_returns', id);
    if (!ret) { APP.notify('Return not found', 'error'); return; }

    var condOpts = ['good', 'damaged', 'partial', 'expired'].map(function(c) {
        return '<option value="' + c + '">' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>';
    }).join('');

    var itemRows = (ret.items || []).map(function(item, i) {
        return '<div style="background:var(--light-gray);border-radius:8px;padding:12px;margin-bottom:8px;">'
            + '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">📦 ' + item.name + ' (requested: ' + item.qty + ' ' + (item.unit || 'pcs') + ')</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
            + '<div class="form-group" style="margin:0;">'
            + '<label style="font-size:11px;">Qty Actually Returned</label>'
            + '<input type="number" class="form-control sk-ret-qty" data-idx="' + i + '" data-name="' + item.name + '" data-unit="' + (item.unit || 'pcs') + '" min="0" value="' + item.qty + '" style="margin-top:2px;">'
            + '</div>'
            + '<div class="form-group" style="margin:0;">'
            + '<label style="font-size:11px;">Condition</label>'
            + '<select class="form-control sk-ret-cond" data-idx="' + i + '">' + condOpts + '</select>'
            + '</div></div>'
            + '<div class="form-group" style="margin-top:6px;margin-bottom:0;">'
            + '<label style="font-size:11px;">Notes (optional)</label>'
            + '<input type="text" class="form-control sk-ret-notes" data-idx="' + i + '" placeholder="e.g. slightly torn packaging">'
            + '</div></div>';
    }).join('');

    var html = '<div><p style="font-size:13px;color:var(--gray);margin-bottom:12px;">Returned by: <strong>' + (ret.createdByName || ret.createdBy) + '</strong> · ' + (ret.department || '-') + '</p>'
        + (ret.reason ? '<p style="font-size:12px;color:var(--gray);margin-bottom:10px;">Reason: ' + ret.reason + '</p>' : '')
        + itemRows
        + '<div class="form-group"><label>General Notes (optional)</label><textarea id="skRetGeneralNotes" class="form-control" rows="2" placeholder="Overall notes about this return batch"></textarea></div>'
        + '<p style="font-size:11px;color:var(--gray);margin-top:4px;">Items with <strong>Good</strong> condition will be automatically added back to inventory.</p>'
        + '</div>';

    openFormModal('↩️ Receive Return: ' + (ret.title || 'Return'), html, 'skSaveReturnDetails()', false);
}

function skSaveReturnDetails() {
    var ret = DB.getById('material_returns', _skReturnId);
    if (!ret) { APP.notify('Return not found', 'error'); return false; }
    var user = AUTH.currentUser();
    var now  = new Date().toISOString();

    var itemDetails = [];
    var qtyInputs   = document.querySelectorAll('.sk-ret-qty');
    var condInputs  = document.querySelectorAll('.sk-ret-cond');
    var notesInputs = document.querySelectorAll('.sk-ret-notes');
    var addedBack   = 0;

    qtyInputs.forEach(function(inp, i) {
        var name      = inp.dataset.name;
        var unit      = inp.dataset.unit || 'pcs';
        var qty       = parseInt(inp.value) || 0;
        var condition = (condInputs[i] || {}).value || 'good';
        var notes     = (notesInputs[i] || {}).value || '';
        var addBack   = (condition === 'good' && qty > 0);

        if (addBack) {
            var nameLow = name.trim().toLowerCase();
            var inv = (DB.get('inventory') || []).find(function(i) {
                return (i.name || '').trim().toLowerCase() === nameLow;
            });
            if (inv) {
                var newQty = (parseInt(inv.quantity) || 0) + qty;
                DB.update('inventory', inv.id, { quantity: newQty });
                DB.add('inventory_movements', {
                    itemId: inv.id, itemName: inv.name, type: 'in',
                    qty: qty, unit: unit,
                    unitPrice: parseFloat(inv.price) || 0,
                    totalValue: qty * (parseFloat(inv.price) || 0),
                    dept: ret.department || '', by: user.fullName,
                    notes: 'Return received — condition: good (from ' + (ret.createdByName || ret.createdBy) + ')', date: now
                });
                addedBack++;
            }
        }
        itemDetails.push({ name: name, returnedQty: qty, unit: unit, condition: condition,
                           addedBackToInventory: addBack, notes: notes });
    });

    var generalNotes = (document.getElementById('skRetGeneralNotes') || {}).value || '';

    DB.update('material_returns', _skReturnId, {
        status: 'received',
        receivedBy: user.username,
        receivedByName: user.fullName,
        receivedAt: now,
        itemDetails: itemDetails,
        generalNotes: generalNotes
    });

    APP.notify('Return processed! ' + addedBack + ' item(s) added back to inventory.', 'success');
    _skData.pendingReturns = (DB.get('material_returns') || []).filter(function(r){ return r.status === 'pending'; });
    _renderSkTab('returns');
    return true;
}

/* ═══ REPORTS TAB ═══ */
function _skReports(el) {
    var today    = new Date();
    var fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    var toDate   = today.toISOString().split('T')[0];
    var sentList = (DB.get('sk_reports') || []).filter(function(r) {
        return r.createdBy === (_skData.user || {}).username;
    }).slice().reverse();

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:16px;">📈 Storekeeper Reports</div>'
        + '<div style="font-size:12px;color:var(--gray);">Generate and send detailed reports to your HOD</div></div>'
        + '</div>'

        + '<div style="background:var(--light-gray);border-radius:10px;padding:16px;margin-bottom:18px;">'
        + '<div style="font-weight:600;font-size:14px;margin-bottom:12px;">📋 Generate New Report</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
        + '<div class="form-group" style="margin:0;"><label style="font-size:11px;">From Date</label>'
        + '<input type="date" id="skRptFrom" class="form-control" value="' + fromDate + '" style="margin-top:3px;"></div>'
        + '<div class="form-group" style="margin:0;"><label style="font-size:11px;">To Date</label>'
        + '<input type="date" id="skRptTo" class="form-control" value="' + toDate + '" style="margin-top:3px;"></div>'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-primary" onclick="skPreviewReport()">📊 Preview Summary</button>'
        + '<button class="btn btn-success" onclick="skSendReportToHOD()">📤 Send to HOD</button>'
        + '<button class="btn btn-outline" onclick="skExportExcel()">📥 Export Excel</button>'
        + '</div></div>'

        + '<div id="skRptPreview"></div>'

        + '<div style="font-weight:600;font-size:14px;margin-bottom:10px;margin-top:4px;">📬 Sent Reports History</div>';

    if (sentList.length === 0) {
        html += '<div style="background:var(--light-gray);border-radius:8px;padding:20px;text-align:center;font-size:13px;color:var(--gray);">No reports sent yet.</div>';
    } else {
        sentList.forEach(function(rpt) {
            html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
                + '<div><div style="font-size:13px;font-weight:700;">' + (rpt.title || 'Report') + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">Sent on ' + APP.formatDate(rpt.createdAt)
                + ' · Period: ' + (rpt.fromDate || '-') + ' → ' + (rpt.toDate || '-') + '</div></div>'
                + '<span class="badge badge-success">Sent to HOD</span></div>'
                + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px;">'
                + _skRptStat('✅', 'Fulfilled', rpt.summary.fulfilled, '#e8f5e9', '#2e7d32')
                + _skRptStat('↩️', 'Returns', rpt.summary.returns, '#fff3e0', '#e65100')
                + _skRptStat('📥', 'Stock IN', rpt.summary.stockIn, '#e3f2fd', '#1565c0')
                + _skRptStat('📤', 'Stock OUT', rpt.summary.stockOut, '#fce4ec', 'var(--danger)')
                + '</div></div>';
        });
    }

    el.innerHTML = html;
}

function _skRptStat(icon, label, val, bg, color) {
    return '<div style="background:' + bg + ';border-radius:8px;padding:10px;text-align:center;">'
        + '<div style="font-size:18px;">' + icon + '</div>'
        + '<div style="font-size:16px;font-weight:700;color:' + color + ';">' + (val || 0) + '</div>'
        + '<div style="font-size:10px;color:var(--gray);">' + label + '</div>'
        + '</div>';
}

function _skBuildReportData() {
    var from = (document.getElementById('skRptFrom') || {}).value || '';
    var to   = (document.getElementById('skRptTo')   || {}).value || '';
    if (!from || !to) { APP.notify('Select date range first', 'error'); return null; }
    var fromDT = from + 'T00:00:00.000Z';
    var toDT   = to   + 'T23:59:59.999Z';

    var fulfilled = (DB.get('material_requests') || []).filter(function(r) {
        return r.status === 'store_fulfilled' || r.status === 'confirmed' || r.status === 'partial';
    }).filter(function(r) { return r.fulfilledAt >= fromDT && r.fulfilledAt <= toDT; });

    var returns = (DB.get('material_returns') || []).filter(function(r) {
        return r.status === 'received';
    }).filter(function(r) { return r.receivedAt >= fromDT && r.receivedAt <= toDT; });

    var movements = (DB.get('inventory_movements') || []).filter(function(m) {
        return m.date >= fromDT && m.date <= toDT;
    });
    var stockIn  = movements.filter(function(m){ return m.type === 'in'; });
    var stockOut = movements.filter(function(m){ return m.type === 'out'; });

    return { from: from, to: to, fulfilled: fulfilled, returns: returns,
             movements: movements, stockIn: stockIn, stockOut: stockOut };
}

function skPreviewReport() {
    var data = _skBuildReportData();
    if (!data) return;
    var el = document.getElementById('skRptPreview');
    if (!el) return;

    var totalInQty  = data.stockIn.reduce(function(s,m){ return s + (parseInt(m.qty)||0); }, 0);
    var totalOutQty = data.stockOut.reduce(function(s,m){ return s + (parseInt(m.qty)||0); }, 0);
    var totalInVal  = data.stockIn.reduce(function(s,m){ return s + (parseFloat(m.totalValue)||0); }, 0);
    var totalOutVal = data.stockOut.reduce(function(s,m){ return s + (parseFloat(m.totalValue)||0); }, 0);
    var addedBack   = 0;
    data.returns.forEach(function(r) {
        (r.itemDetails || []).forEach(function(d){ if (d.addedBackToInventory) addedBack++; });
    });

    el.innerHTML = '<div style="background:var(--card);border:1px solid var(--secondary);border-radius:10px;padding:16px;margin-bottom:16px;">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:12px;">📊 Report Preview — ' + data.from + ' to ' + data.to + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px;">'
        + _skRptStat('✅', 'Fulfilled Requests', data.fulfilled.length, '#e8f5e9', '#2e7d32')
        + _skRptStat('↩️', 'Returns Received', data.returns.length, '#fff3e0', '#e65100')
        + _skRptStat('📥', 'Items Back to Stock', addedBack, '#e3f2fd', '#1565c0')
        + _skRptStat('📤', 'Stock OUT Qty', totalOutQty, '#fce4ec', 'var(--danger)')
        + _skRptStat('📥', 'Stock IN Qty', totalInQty, '#e8f5e9', '#2e7d32')
        + _skRptStat('💰', 'OUT Value', '₹' + totalOutVal.toFixed(0), '#fff3e0', '#e65100')
        + '</div></div>';
}

function skSendReportToHOD() {
    var data = _skBuildReportData();
    if (!data) return;
    var user = AUTH.currentUser();
    var totalInQty  = data.stockIn.reduce(function(s,m){ return s + (parseInt(m.qty)||0); }, 0);
    var totalOutQty = data.stockOut.reduce(function(s,m){ return s + (parseInt(m.qty)||0); }, 0);
    var totalInVal  = data.stockIn.reduce(function(s,m){ return s + (parseFloat(m.totalValue)||0); }, 0);
    var totalOutVal = data.stockOut.reduce(function(s,m){ return s + (parseFloat(m.totalValue)||0); }, 0);
    var addedBack   = 0;
    data.returns.forEach(function(r) {
        (r.itemDetails || []).forEach(function(d){ if (d.addedBackToInventory) addedBack++; });
    });

    DB.add('sk_reports', {
        title: 'Storekeeper Report: ' + data.from + ' to ' + data.to,
        fromDate: data.from,
        toDate:   data.to,
        createdBy: user.username,
        createdByName: user.fullName,
        department: user.department || 'Store',
        createdAt: new Date().toISOString(),
        summary: {
            fulfilled: data.fulfilled.length,
            returns:   data.returns.length,
            addedBack: addedBack,
            stockIn:   totalInQty,
            stockOut:  totalOutQty,
            valueIn:   totalInVal,
            valueOut:  totalOutVal
        },
        fulfilledIds:  data.fulfilled.map(function(r){ return r.id; }),
        returnIds:     data.returns.map(function(r){ return r.id; }),
        movementCount: data.movements.length
    });

    APP.notify('Report sent to HOD successfully!', 'success');
    _renderSkTab('reports');
}

function skExportExcel() {
    var data = _skBuildReportData();
    if (!data) return;
    var user = AUTH.currentUser();

    if (typeof XLSX === 'undefined') { APP.notify('Excel library not loaded', 'error'); return; }

    var wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    var summaryRows = [
        ['Storekeeper Report', data.from + ' to ' + data.to],
        ['Generated By', user.fullName || user.username],
        ['Generated At', new Date().toLocaleString('en-IN')],
        [],
        ['Metric', 'Count / Value'],
        ['Fulfilled Requests', data.fulfilled.length],
        ['Returns Received', data.returns.length],
        ['Stock IN Movements', data.stockIn.length],
        ['Stock OUT Movements', data.stockOut.length],
        ['Total IN Qty', data.stockIn.reduce(function(s,m){ return s+(parseInt(m.qty)||0); }, 0)],
        ['Total OUT Qty', data.stockOut.reduce(function(s,m){ return s+(parseInt(m.qty)||0); }, 0)],
        ['Total IN Value (₹)', data.stockIn.reduce(function(s,m){ return s+(parseFloat(m.totalValue)||0); }, 0).toFixed(2)],
        ['Total OUT Value (₹)', data.stockOut.reduce(function(s,m){ return s+(parseFloat(m.totalValue)||0); }, 0).toFixed(2)]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

    // Sheet 2: Fulfilled Requests
    var fulfRows = [['Title', 'Department', 'Requested By', 'Items', 'Fulfilled At', 'Status']];
    data.fulfilled.forEach(function(r) {
        var items = (r.items || []).map(function(i){ return i.name + ' x' + i.qty; }).join(', ');
        fulfRows.push([r.title||'-', r.department||'-', r.createdByName||r.createdBy||'-', items, r.fulfilledAt||'-', r.status||'-']);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fulfRows), 'Fulfilled Requests');

    // Sheet 3: Material Returns
    var retRows = [['Title', 'From', 'Department', 'Items Returned', 'Received At', 'Items Back to Stock']];
    data.returns.forEach(function(r) {
        var items = (r.itemDetails || []).map(function(d){ return d.name + ' x' + d.returnedQty + ' (' + (d.condition||'-') + ')'; }).join(', ');
        var addedBack = (r.itemDetails || []).filter(function(d){ return d.addedBackToInventory; }).map(function(d){ return d.name; }).join(', ');
        retRows.push([r.title||'-', r.createdByName||r.createdBy||'-', r.department||'-', items, r.receivedAt||'-', addedBack||'None']);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(retRows), 'Material Returns');

    // Sheet 4: Stock Movements
    var movRows = [['Date', 'Type', 'Item', 'Qty', 'Unit', 'Dept', 'Unit Price (₹)', 'Total Value (₹)', 'By', 'Notes']];
    data.movements.forEach(function(m) {
        movRows.push([m.date||'-', (m.type||'').toUpperCase(), m.itemName||'-', m.qty||0,
                      m.unit||'-', m.dept||'-', parseFloat(m.unitPrice||0).toFixed(2),
                      parseFloat(m.totalValue||0).toFixed(2), m.by||'-', m.notes||'-']);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movRows), 'Stock Movements');

    // Sheet 5: Current Inventory
    var inv = DB.get('inventory') || [];
    var invRows = [['Item Name', 'Category', 'Department', 'Quantity', 'Unit', 'Price (₹)', 'Total Value (₹)']];
    inv.forEach(function(i) {
        var qty = parseInt(i.quantity) || 0;
        var price = parseFloat(i.price) || 0;
        invRows.push([i.name||'-', i.category||'-', i.department||'-', qty, i.unit||'pcs', price.toFixed(2), (qty*price).toFixed(2)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invRows), 'Current Inventory');

    XLSX.writeFile(wb, 'SK_Report_' + data.from + '_to_' + data.to + '.xlsx');
    APP.notify('Excel report downloaded!', 'success');
}
