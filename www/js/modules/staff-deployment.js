// Staff Deployment — daily, floor-wise Housekeeping & PCA entry log
// Add/remove by facility-department employees (tab) and HOD/Admin (module).
// Data key: staffDeployment  (synced via SYNC.SHARED_KEYS)

var StaffDeployment = (function () {
    var KEY = 'staffDeployment';
    var _floorsCache = null;
    var _state = { from: '', to: '', type: 'all' };
    var _mode = 'module';

    function _p(n) { return (n < 10 ? '0' : '') + n; }

    function _dateStr(d) {
        d = d || new Date();
        return d.getFullYear() + '-' + _p(d.getMonth() + 1) + '-' + _p(d.getDate());
    }

    function _esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _all() {
        try { return DB.get(KEY) || []; } catch (e) { return []; }
    }

    function _floors() {
        if (_floorsCache) return _floorsCache;
        var names = [];
        try {
            if (typeof CHECKLISTS !== 'undefined' && CHECKLISTS.listFloors) {
                CHECKLISTS.listFloors().forEach(function (f) {
                    if (f && f.name && names.indexOf(f.name) === -1) names.push(f.name);
                });
            }
        } catch (e) {}
        try {
            (DB.get('floorItems') || []).forEach(function (f) {
                if (f && f.floor && names.indexOf(f.floor) === -1) names.push(f.floor);
            });
        } catch (e) {}
        if (names.length === 0) {
            names = ['Basement', 'Ground Floor', 'First Floor', 'Second Floor',
                     'Third Floor', 'Fourth Floor', 'Fifth Floor', 'Sixth Floor'];
        }
        _floorsCache = names;
        return names;
    }

    function _namesForType(type) {
        var seen = [], map = {};
        _all().forEach(function (e) {
            if (e.staffType !== type) return;
            var n = (e.staffName || '').trim();
            if (n && !map[n]) { map[n] = true; seen.push(n); }
        });
        return seen;
    }

    function _canRemove(user, e) {
        if (!user) return false;
        if (user.isSuperAdmin || user.role === 'admin' || user.role === 'hod') return true;
        return e.createdBy === user.username;
    }

    function _filter(fromDate, toDate, type) {
        var out = _all().filter(function (e) {
            if (type && type !== 'all' && e.staffType !== type) return false;
            if (fromDate && (e.date || '') < fromDate) return false;
            if (toDate && (e.date || '') > toDate) return false;
            return true;
        });
        return out.sort(function (a, b) {
            return ((b.date || '') + '|' + (b.createdAt || ''))
                   .localeCompare((a.date || '') + '|' + (a.createdAt || ''));
        });
    }

    function _summary(rows) {
        var s = { housekeeping: 0, pca: 0, floors: {} };
        rows.forEach(function (e) {
            if (e.staffType === 'pca') s.pca++; else s.housekeeping++;
            var f = e.floor || 'Other';
            if (!s.floors[f]) s.floors[f] = { housekeeping: 0, pca: 0, total: 0 };
            s.floors[f].total++;
            if (e.staffType === 'pca') s.floors[f].pca++; else s.floors[f].housekeeping++;
        });
        return s;
    }

    function _labelType(e) {
        return e.staffType === 'pca' ? 'PCA' : 'Housekeeping';
    }

    function _addEntry(data) {
        var user = AUTH.currentUser();
        var staffType = data.staffType === 'pca' ? 'pca' : 'housekeeping';
        var date  = data.date || _dateStr();
        var floor = (data.floor || '').trim();
        var staffName = (data.staffName || '').trim();
        var shift = data.shift || 'Morning';
        var duty  = (data.duty || '').trim();
        if (!floor) { APP.notify('Enter the floor', 'error'); return null; }
        if (!staffName) { APP.notify('Enter the staff name', 'error'); return null; }
        var entry = DB.add(KEY, {
            staffType: staffType,
            date: date,
            floor: floor,
            staffName: staffName,
            shift: shift,
            duty: duty,
            createdBy: user ? user.username : '',
            createdByName: user ? (user.fullName || user.username) : ''
        });
        APP.notify('Staff deployment added ✓', 'success');
        return entry;
    }

    function _removeEntry(id) {
        var user = AUTH.currentUser();
        var entry = DB.getById(KEY, id);
        if (!entry) { APP.notify('Entry not found', 'error'); return; }
        if (!_canRemove(user, entry)) { APP.notify('Only HOD/Admin or the person who added it can remove this entry', 'error'); return; }
        if (confirm('Remove this staff deployment entry?')) {
            DB.delete(KEY, id);
            APP.notify('Entry removed', 'success');
        }
    }

    function _export(fromDate, toDate, type) {
        if (typeof XLSX === 'undefined') {
            APP.notify('Excel library not loaded yet — please retry in a moment', 'error');
            return;
        }
        var rows = _filter(fromDate, toDate, type);
        if (rows.length === 0) { APP.notify('No data to export', 'info'); return; }
        var headers = ['Date', 'Staff Type', 'Floor', 'Staff Name', 'Shift', 'Duty / Remarks', 'Added By'];
        var data = rows.map(function (e) {
            return [e.date || '', _labelType(e), e.floor || '', e.staffName || '',
                    e.shift || '', e.duty || '', e.createdByName || e.createdBy || ''];
        });
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
        ws['!cols'] = [12, 16, 18, 24, 12, 30, 22].map(function (w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, ws, 'Staff Deployment');
        var range = (fromDate || 'all') + '_to_' + (toDate || 'all');
        XLSX.writeFile(wb, 'Staff_Deployment_' + range + '.xlsx');
        APP.notify('Excel report downloaded ✓', 'success');
    }

    /* ── Shared add-entry form ── */
    function _addFormHtml(typeSel, withFilterWrap) {
        var floors = _floors();
        var html = '';
        if (withFilterWrap) html += '<div class="card" style="padding:16px;margin-bottom:16px;border-top:3px solid #00796b;">';
        html += '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">➕ ' + 'Add Daily Staff Deployment Entry' + '</div>'
            + '<div class="grid-2">'
            + '<div class="form-group"><label style="font-size:12px;">Staff Type *</label>'
            + '<select id="sdpType" class="form-control" onchange="StaffDeployment.updateStaffList()">'
            + '<option value="housekeeping">Housekeeping</option>'
            + '<option value="pca">PCA (Patient Care Assistant)</option>'
            + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">Date *</label>'
            + '<input type="date" id="sdpDate" class="form-control" value="' + _dateStr() + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Floor *</label>'
            + '<input type="text" id="sdpFloor" list="sdpFloorList" class="form-control" placeholder="e.g. Second Floor">'
            + '<datalist id="sdpFloorList">' + floors.map(function (f) { return '<option value="' + _esc(f) + '">'; }).join('') + '</datalist></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Name *</label>'
            + '<input type="text" id="sdpStaffName" list="sdpStaffList" class="form-control" placeholder="Staff name">'
            + '<datalist id="sdpStaffList"></datalist></div>'
            + '<div class="form-group"><label style="font-size:12px;">Shift</label>'
            + '<select id="sdpShift" class="form-control">'
            + '<option value="Morning">Morning</option><option value="Evening">Evening</option><option value="Night">Night</option>'
            + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">Duty / Remarks</label>'
            + '<input type="text" id="sdpDuty" class="form-control" placeholder="e.g. Room cleaning, Linen"></div>'
            + '</div>'
            + '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-success" onclick="StaffDeployment.submitAdd()">✓ Save Entry</button>'
            + '<button class="btn btn-sm btn-outline" onclick="StaffDeployment.toggleAdd()">Cancel</button>'
            + '</div>';
        if (withFilterWrap) html += '</div>';
        return html;
    }

    function _entriesTable(rows, title, color, user) {
        var html = '<div class="card" style="margin-bottom:16px;border-top:3px solid ' + color + ';">'
            + '<div class="card-header"><h3>' + title + ' <span class="badge badge-primary" style="font-size:11px;">' + rows.length + '</span></h3></div>';
        if (rows.length === 0) {
            html += '<div style="color:var(--gray);font-size:13px;padding:14px;">No entries.</div>';
        } else {
            html += '<div class="table-responsive"><table><thead><tr>'
                + '<th>Date</th><th>Floor</th><th>Staff Name</th><th>Shift</th><th>Duty</th><th>Added By</th><th></th>'
                + '</tr></thead><tbody>';
            rows.forEach(function (e) {
                html += '<tr>'
                    + '<td>' + _esc(e.date || '') + '</td>'
                    + '<td><strong>' + _esc(e.floor || '') + '</strong></td>'
                    + '<td>' + _esc(e.staffName || '') + '</td>'
                    + '<td>' + _esc(e.shift || '') + '</td>'
                    + '<td>' + _esc(e.duty || '') + '</td>'
                    + '<td>' + _esc(e.createdByName || e.createdBy || '') + '</td>'
                    + '<td>' + (_canRemove(user, e)
                        ? '<button class="btn btn-sm btn-danger" style="padding:2px 8px;font-size:11px;" onclick="StaffDeployment.removeEntry(\'' + e.id + '\')">✕</button>'
                        : '') + '</td>'
                    + '</tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';
        return html;
    }

    function _summaryCards(sm) {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">'
            + '<div style="background:#e8f5e9;border-radius:10px;padding:12px;text-align:center;border:1px solid #a5d6a7;">'
            + '<div style="font-size:22px;font-weight:700;color:#2e7d32;">' + sm.housekeeping + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">🧹 Housekeeping</div></div>'
            + '<div style="background:#e3f2fd;border-radius:10px;padding:12px;text-align:center;border:1px solid #90caf9;">'
            + '<div style="font-size:22px;font-weight:700;color:#1565c0;">' + sm.pca + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">🤝 PCA</div></div>'
            + '<div style="background:#fff8e1;border-radius:10px;padding:12px;text-align:center;border:1px solid #ffe082;grid-column:1/-1;">'
            + '<div style="font-size:11px;color:var(--gray);margin-bottom:6px;">📋 Floor-wise today</div>';
        var floorKeys = Object.keys(sm.floors);
        if (floorKeys.length === 0) {
            html += '<div style="font-size:13px;color:var(--gray);">No entries yet</div>';
        } else {
            html += floorKeys.sort().map(function (f) {
                var fl = sm.floors[f];
                return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:5px 10px;margin:3px;font-size:12px;">'
                    + '<strong>' + _esc(f) + '</strong>'
                    + '<span>🧹 ' + fl.housekeeping + '</span>'
                    + '<span>🤝 ' + fl.pca + '</span>'
                    + '</div>';
            }).join('');
        }
        html += '</div></div>';
        return html;
    }

    /* ── Full module page (HOD / Admin) ── */
    function renderFull(container) {
        var user = AUTH.currentUser();
        _mode = 'module';
        var today = _dateStr();
        var lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 6);
        var lastWeekStr = _dateStr(lastWeek);
        _state.from = _state.from || lastWeekStr;
        _state.to   = _state.to || today;
        _state.type = _state.type || 'all';

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">'
            + '<h2 style="font-size:18px;font-weight:700;">🧹 Staff Deployment — Housekeeping &amp; PCA</h2>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="StaffDeployment.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="StaffDeployment.exportCurrent()">📊 Download Excel</button>'
            + '</div></div>'

            // Filters
            + '<div class="card" style="padding:14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:end;">'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">From</label>'
            + '<input type="date" id="sdpFrom" class="form-control" value="' + _state.from + '" style="padding:6px 8px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">To</label>'
            + '<input type="date" id="sdpTo" class="form-control" value="' + _state.to + '" style="padding:6px 8px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">Staff Type</label>'
            + '<select id="sdpTypeFilter" class="form-control" style="padding:6px 8px;">'
            + '<option value="all">All</option><option value="housekeeping">Housekeeping</option><option value="pca">PCA</option>'
            + '</select></div>'
            + '<button class="btn btn-sm btn-primary" onclick="StaffDeployment.applyFilter()">Apply</button>'
            + '<button class="btn btn-sm btn-outline" onclick="StaffDeployment.setToday()">Today</button>'
            + '</div>'

            // Add form (hidden)
            + '<div id="sdpAddWrap" style="display:none;">' + _addFormHtml() + '</div>'

            // Summary
            + '<div id="sdpSummary"></div>'

            // Tables
            + '<div id="sdpTables"></div>';

        container.innerHTML = html;
        document.getElementById('sdpTypeFilter').value = _state.type;
        StaffDeployment.updateStaffList();
        renderResults();
    }

    function renderResults() {
        var from = _state.from, to = _state.to, type = _state.type;
        var rows = _filter(from, to, type);
        var user = AUTH.currentUser();
        var sm = _summary(rows);

        var sumEl = document.getElementById('sdpSummary');
        if (sumEl) sumEl.innerHTML = _summaryCards(sm);

        var tabEl = document.getElementById('sdpTables');
        if (!tabEl) return;
        var hk = rows.filter(function (e) { return e.staffType !== 'pca'; });
        var pca = rows.filter(function (e) { return e.staffType === 'pca'; });
        tabEl.innerHTML = _entriesTable(hk, '🧹 Housekeeping', '#2e7d32', user)
            + _entriesTable(pca, '🤝 PCA (Patient Care Assistant)', '#1565c0', user);
    }

    /* ── Employee dashboard tab ── */
    function renderTab(el) {
        var user = AUTH.currentUser();
        if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
        _mode = 'tab';
        var today = _dateStr();

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:16px;">🧹 Staff Deployment — ' + today + '</div>'
            + '<div style="display:flex;gap:6px;">'
            + '<button class="btn btn-sm btn-primary" onclick="StaffDeployment.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="StaffDeployment.exportToday()">📊 Excel</button>'
            + '</div></div>'
            + '<div id="sdpAddWrap" style="display:none;margin-bottom:14px;">' + _addFormHtml() + '</div>'
            + '<div id="sdpTabBody"></div>';

        el.innerHTML = html;
        renderTabResults(today);
    }

    function renderTabResults(today) {
        var user = AUTH.currentUser();
        var body = document.getElementById('sdpTabBody');
        if (!body) return;
        var rows = _filter(today, today, 'all');
        var sm = _summary(rows);
        var hk = rows.filter(function (e) { return e.staffType !== 'pca'; });
        var pca = rows.filter(function (e) { return e.staffType === 'pca'; });
        body.innerHTML = _summaryCards(sm)
            + _entriesTable(hk, '🧹 Housekeeping', '#2e7d32', user)
            + _entriesTable(pca, '🤝 PCA (Patient Care Assistant)', '#1565c0', user);
    }

    return {
        renderFull: renderFull,
        renderTab: renderTab,
        updateStaffList: function () {
            var type = (document.getElementById('sdpType') || {}).value || 'housekeeping';
            var dl = document.getElementById('sdpStaffList');
            if (!dl) return;
            dl.innerHTML = _namesForType(type).map(function (n) {
                return '<option value="' + _esc(n) + '">';
            }).join('');
        },
        toggleAdd: function () {
            var wrap = document.getElementById('sdpAddWrap');
            if (!wrap) return;
            var isHidden = wrap.style.display === 'none';
            wrap.style.display = isHidden ? 'block' : 'none';
            var d = document.getElementById('sdpDate');
            if (d && !d.value) d.value = _dateStr();
            StaffDeployment.updateStaffList();
        },
        submitAdd: function () {
            var type = (document.getElementById('sdpType') || {}).value || 'housekeeping';
            var date = (document.getElementById('sdpDate') || {}).value || _dateStr();
            var floor = (document.getElementById('sdpFloor') || {}).value || '';
            var staffName = (document.getElementById('sdpStaffName') || {}).value || '';
            var shift = (document.getElementById('sdpShift') || {}).value || 'Morning';
            var duty = (document.getElementById('sdpDuty') || {}).value || '';
            var entry = _addEntry({
                staffType: type, date: date, floor: floor,
                staffName: staffName, shift: shift, duty: duty
            });
            if (!entry) return;
            if (document.getElementById('sdpFloor')) {
                var f = document.getElementById('sdpFloor'); if (f) f.value = '';
                var s = document.getElementById('sdpStaffName'); if (s) s.value = '';
                var du = document.getElementById('sdpDuty'); if (du) du.value = '';
                StaffDeployment.updateStaffList();
            }
            if (_mode === 'module') renderStaffDeployment(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        removeEntry: function (id) {
            _removeEntry(id);
            if (_mode === 'module') renderStaffDeployment(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        applyFilter: function () {
            _state.from = (document.getElementById('sdpFrom') || {}).value || '';
            _state.to = (document.getElementById('sdpTo') || {}).value || '';
            _state.type = (document.getElementById('sdpTypeFilter') || {}).value || 'all';
            renderResults();
        },
        setToday: function () {
            var t = _dateStr();
            _state.from = t; _state.to = t;
            var f = document.getElementById('sdpFrom'); if (f) f.value = t;
            var t2 = document.getElementById('sdpTo'); if (t2) t2.value = t;
            renderResults();
        },
        exportCurrent: function () {
            _export(_state.from, _state.to, _state.type);
        },
        exportToday: function () {
            _export(_dateStr(), _dateStr(), 'all');
        }
    };
})();

/* Router entry point (registered in app.js renderers) */
function renderStaffDeployment(container) {
    StaffDeployment.renderFull(container);
}
