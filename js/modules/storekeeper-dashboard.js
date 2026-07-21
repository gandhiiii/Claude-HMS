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

    _skData = { user: user, pendingFulfill: pendingFulfill, myRequests: myRequests,
                inventory: inventory, lowStock: lowStock, outOfStock: outOfStock };

    var tabs = [
        { id: 'overview',    label: '📊 Overview' },
        { id: 'fulfill',     label: '✅ Fulfill Requests', badge: pendingFulfill.length, bc: 'badge-warning' },
        { id: 'myrequests',  label: '📦 My Requests', badge: myRequests.filter(function(r){ return r.status !== 'confirmed' && r.status !== 'partial'; }).length, bc: 'badge-info' },
        { id: 'inventory',   label: '🏪 Inventory Status', badge: outOfStock.length, bc: 'badge-danger' }
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
        + _skKpi('✅', 'To Fulfill',  pendingFulfill.length, '#e8f5e9', '#2e7d32',      'fulfill')
        + _skKpi('📦', 'My Requests', myRequests.length,     '#e3f2fd', '#1565c0',      'myrequests')
        + _skKpi('⚠️', 'Low Stock',   lowStock.length,       '#fff3e0', '#e65100',      'inventory')
        + _skKpi('❌', 'Out of Stock', outOfStock.length,    '#ffebee', 'var(--danger)', 'inventory')
        + '</div>'

        + (pendingFulfill.length > 0
            ? '<div style="background:#fff3e0;border:1px solid var(--warning);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
              + '<span style="font-size:13px;font-weight:600;color:#e65100;">📋 ' + pendingFulfill.length + ' request(s) approved and awaiting fulfillment</span>'
              + '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="skTabSwitch(\'fulfill\')">Fulfill Now</button></div>' : '')
        + (outOfStock.length > 0
            ? '<div style="background:#ffebee;border:1px solid var(--danger);border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'
              + '<span style="font-size:13px;font-weight:600;color:var(--danger);">🚨 ' + outOfStock.length + ' item(s) completely out of stock</span>'
              + '<button class="btn btn-sm btn-danger" onclick="skTabSwitch(\'inventory\')">View</button></div>' : '')

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
    var map = { overview: _skOverview, fulfill: _skFulfill, myrequests: _skMyRequests, inventory: _skInventory };
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

function skStoreFulfill(id) {
    var r = DB.getById('material_requests', id);
    if (!r) { APP.notify('Request not found', 'error'); return; }
    if (!confirm('Mark "' + (r.title || 'this request') + '" as fulfilled?\nThe requester will be asked to confirm receipt.')) return;
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'store_fulfilled',
        fulfilledBy: user.username,
        fulfilledByName: user.fullName,
        fulfilledAt: new Date().toISOString()
    });
    // Record stock-out movements for each item
    (r.items || []).forEach(function(item) {
        var inv = (DB.get('inventory') || []).find(function(i) { return i.name === item.name; });
        if (inv) {
            var newQty = Math.max(0, (parseInt(inv.quantity) || 0) - (parseInt(item.qty) || 0));
            DB.update('inventory', inv.id, { quantity: newQty });
            DB.add('inventory_movements', {
                itemId: inv.id, itemName: inv.name, type: 'out',
                qty: parseInt(item.qty) || 0, unit: inv.unit || item.unit || 'pcs',
                unitPrice: inv.price || 0,
                totalValue: (parseInt(item.qty) || 0) * (parseFloat(inv.price) || 0),
                dept: r.department || '', by: user.fullName,
                notes: 'Fulfilled: ' + (r.title || ''), date: new Date().toISOString()
            });
        }
    });
    APP.notify('Marked as fulfilled — waiting for requester confirmation', 'success');
    _skData.pendingFulfill = (DB.get('material_requests') || []).filter(function(r) { return r.status === 'facility_approved'; });
    _renderSkTab('fulfill');
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
    var lowStock   = inventory.filter(function(i){ return parseInt(i.quantity) < 10; });
    var critical   = lowStock.filter(function(i){ var p=_predict(i); return p.days !== null && p.days <= 7; });

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        + _skKpi('📦', 'Total Items',    inventory.length,   '#e3f2fd', '#1565c0', 'inventory')
        + _skKpi('💰', 'Total Value',    '₹' + totalValue.toFixed(0), '#e8f5e9', '#2e7d32', 'inventory')
        + _skKpi('⚠️', 'Low Stock',      lowStock.length,    '#fff3e0', '#e65100', 'inventory')
        + _skKpi('🚨', 'Critical ≤7d',   critical.length,   '#ffebee', 'var(--danger)', 'inventory')
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
