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

    function _periodRange(period, ref) {
        var now = ref || new Date();
        var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
        var start, end;
        if (period === 'today') {
            start = new Date(y, m, d);
            end = new Date(y, m, d);
        } else if (period === 'weekly') {
            var dow = now.getDay() || 7; // Mon=1..Sun=7
            start = new Date(y, m, d - dow + 1);
            end = new Date(y, m, d + (7 - dow));
        } else if (period === 'monthly') {
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0);
        } else {
            start = new Date(y, m, d);
            end = new Date(y, m, d);
        }
        return { from: _dateStr(start), to: _dateStr(end) };
    }

    function _periodLabel(period) {
        if (period === 'today') return 'Today';
        if (period === 'weekly') return 'This Week';
        if (period === 'monthly') return 'This Month';
        return 'Period';
    }

    function _periodRows(period, type) {
        var r = _periodRange(period);
        return _filter(r.from, r.to, type || 'all');
    }

    // Today / Weekly / Monthly report section with per-period Excel download
    function _reportSectionHtml() {
        var periods = ['today', 'weekly', 'monthly'];
        var cards = periods.map(function (p) {
            var rows = _periodRows(p, _state.type);
            var sm = _summary(rows);
            return '<div class="card" style="flex:1;min-width:150px;border-top:3px solid #00695c;padding:14px;">'
                + '<div style="font-size:13px;font-weight:700;color:#00695c;">📅 ' + _periodLabel(p) + '</div>'
                + '<div style="font-size:11px;color:var(--gray);margin:2px 0 10px;">' + rows.length + ' entries · '
                + '🧹 ' + sm.housekeeping + ' · 🤝 ' + sm.pca + '</div>'
                + '<button class="btn btn-sm btn-success" style="width:100%;font-size:12px;" '
                + 'onclick="StaffDeployment.exportPeriod(\'' + p + '\')">📊 Excel</button></div>';
        }).join('');
        return '<div class="card" style="padding:16px;margin-bottom:16px;border-top:3px solid #0097a7;">'
            + '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">📊 Today · Weekly · Monthly Report</div>'
            + '<div style="display:flex;gap:12px;flex-wrap:wrap;">' + cards + '</div></div>';
    }

    function _addEntry(data) {
        var user = AUTH.currentUser();
        var staffType = data.staffType === 'pca' ? 'pca' : 'housekeeping';
        var date  = data.date || _dateStr();
        var floor = (data.floor || '').trim();
        var staffName = (data.staffName || '').trim();
        var shift = data.shift || 'Morning';
        var duty  = (data.duty || '').trim();
        var time  = (data.time || '').trim();
        var place = (data.place || '').trim();
        if (!floor) { APP.notify('Enter the floor', 'error'); return null; }
        if (!staffName) { APP.notify('Enter the staff name', 'error'); return null; }
        var entry = DB.add(KEY, {
            staffType: staffType,
            date: date,
            floor: floor,
            staffName: staffName,
            shift: shift,
            duty: duty,
            time: time,
            place: place,
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
        var headers = ['Date', 'Staff Type', 'Floor', 'Place / Location', 'Time', 'Staff Name', 'Shift', 'Duty / Remarks', 'Added By'];
        function _sheetRows(list) {
            return list.map(function (e) {
                return [e.date || '', _labelType(e), e.floor || '', e.place || '', e.time || '',
                        e.staffName || '', e.shift || '', e.duty || '', e.createdByName || e.createdBy || ''];
            });
        }
        function _widths(sheet) { sheet['!cols'] = [12, 16, 18, 24, 10, 24, 12, 30, 22].map(function (w) { return { wch: w }; }); }

        var wb = XLSX.utils.book_new();
        var hk = rows.filter(function (e) { return e.staffType !== 'pca'; });
        var pca = rows.filter(function (e) { return e.staffType === 'pca'; });

        // Category-wise tabs (Housekeeping, PCA, plus an All tab)
        if (hk.length > 0) {
            var wsHk = XLSX.utils.aoa_to_sheet([headers].concat(_sheetRows(hk)));
            _widths(wsHk);
            XLSX.utils.book_append_sheet(wb, wsHk, 'Housekeeping');
        }
        if (pca.length > 0) {
            var wsPca = XLSX.utils.aoa_to_sheet([headers].concat(_sheetRows(pca)));
            _widths(wsPca);
            XLSX.utils.book_append_sheet(wb, wsPca, 'PCA');
        }
        var wsAll = XLSX.utils.aoa_to_sheet([headers].concat(_sheetRows(rows)));
        _widths(wsAll);
        XLSX.utils.book_append_sheet(wb, wsAll, 'All');

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
            + '<div class="form-group"><label style="font-size:12px;">Time</label>'
            + '<input type="time" id="sdpTime" class="form-control"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Place / Location</label>'
            + '<input type="text" id="sdpPlace" class="form-control" placeholder="e.g. Room 201, Corridor B"></div>'
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
                + '<th>Date</th><th>Floor / Place</th><th>Time</th><th>Staff Name</th><th>Shift</th><th>Duty</th><th>Added By</th><th></th>'
                + '</tr></thead><tbody>';
            rows.forEach(function (e) {
                html += '<tr>'
                    + '<td>' + _esc(e.date || '') + '</td>'
                    + '<td><strong>' + _esc(e.floor || '') + '</strong>'
                    + (e.place ? '<div style="font-size:11px;color:var(--gray);">' + _esc(e.place) + '</div>' : '') + '</td>'
                    + '<td>' + _esc(e.time || '') + '</td>'
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

            // Today / Weekly / Monthly report section
            + '<div id="sdpReports">' + _reportSectionHtml() + '</div>'

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
    var _tabState = { from: '', to: '', type: 'all' };

    function renderTab(el) {
        var user = AUTH.currentUser();
        if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
        _mode = 'tab';
        var today = _dateStr();
        if (!_tabState.from && !_tabState.to) {
            _tabState.from = today;
            _tabState.to = today;
        }

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:16px;">🧹 Staff Deployment</div>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="StaffDeployment.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="StaffDeployment.exportTab()">📊 Export Excel</button>'
            + '</div></div>'

            // Date & Filter controls for employee tab
            + '<div class="card" style="padding:12px;margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:end;background:var(--light-gray);">'
            + '<div class="form-group" style="margin:0;"><label style="font-size:11px;font-weight:600;">From Date</label>'
            + '<input type="date" id="sdpTabFrom" class="form-control" value="' + (_tabState.from || '') + '" style="padding:5px 8px;font-size:12px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:11px;font-weight:600;">To Date</label>'
            + '<input type="date" id="sdpTabTo" class="form-control" value="' + (_tabState.to || '') + '" style="padding:5px 8px;font-size:12px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:11px;font-weight:600;">Type</label>'
            + '<select id="sdpTabType" class="form-control" style="padding:5px 8px;font-size:12px;">'
            + '<option value="all"' + (_tabState.type === 'all' ? ' selected' : '') + '>All Staff</option>'
            + '<option value="housekeeping"' + (_tabState.type === 'housekeeping' ? ' selected' : '') + '>Housekeeping</option>'
            + '<option value="pca"' + (_tabState.type === 'pca' ? ' selected' : '') + '>PCA</option>'
            + '</select></div>'
            + '<button class="btn btn-sm btn-primary" style="font-size:12px;" onclick="StaffDeployment.applyTabFilter()">🔍 Filter</button>'
            + '<button class="btn btn-sm btn-outline" style="font-size:12px;" onclick="StaffDeployment.setTabRange(\'today\')">Today</button>'
            + '<button class="btn btn-sm btn-outline" style="font-size:12px;" onclick="StaffDeployment.setTabRange(\'week\')">This Week</button>'
            + '<button class="btn btn-sm btn-outline" style="font-size:12px;" onclick="StaffDeployment.setTabRange(\'month\')">This Month</button>'
            + '<button class="btn btn-sm btn-outline" style="font-size:12px;" onclick="StaffDeployment.setTabRange(\'all\')">All Time</button>'
            + '</div>'

            + '<div id="sdpAddWrap" style="display:none;margin-bottom:14px;">' + _addFormHtml() + '</div>'
            + _reportSectionHtml()
            + '<div id="sdpTabBody"></div>';

        el.innerHTML = html;
        renderTabResults();
    }

    function renderTabResults() {
        var user = AUTH.currentUser();
        var body = document.getElementById('sdpTabBody');
        if (!body) return;
        var rows = _filter(_tabState.from, _tabState.to, _tabState.type || 'all');
        var sm = _summary(rows);
        var hk = rows.filter(function (e) { return e.staffType !== 'pca'; });
        var pca = rows.filter(function (e) { return e.staffType === 'pca'; });
        body.innerHTML = _summaryCards(sm)
            + _entriesTable(hk, '🧹 Housekeeping (' + hk.length + ')', '#2e7d32', user)
            + _entriesTable(pca, '🤝 PCA (Patient Care Assistant) (' + pca.length + ')', '#1565c0', user);
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
            var time = (document.getElementById('sdpTime') || {}).value || '';
            var place = (document.getElementById('sdpPlace') || {}).value || '';
            var entry = _addEntry({
                staffType: type, date: date, floor: floor,
                staffName: staffName, shift: shift, duty: duty,
                time: time, place: place
            });
            if (!entry) return;
            if (document.getElementById('sdpFloor')) {
                var f = document.getElementById('sdpFloor'); if (f) f.value = '';
                var s = document.getElementById('sdpStaffName'); if (s) s.value = '';
                var du = document.getElementById('sdpDuty'); if (du) du.value = '';
                var t = document.getElementById('sdpTime'); if (t) t.value = '';
                var pl = document.getElementById('sdpPlace'); if (pl) pl.value = '';
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
        },
        exportTab: function () {
            _export(_tabState.from, _tabState.to, _tabState.type || 'all');
        },
        applyTabFilter: function () {
            _tabState.from = (document.getElementById('sdpTabFrom') || {}).value || '';
            _tabState.to = (document.getElementById('sdpTabTo') || {}).value || '';
            _tabState.type = (document.getElementById('sdpTabType') || {}).value || 'all';
            renderTabResults();
        },
        setTabRange: function (range) {
            var now = new Date();
            var today = _dateStr();
            if (range === 'today') {
                _tabState.from = today; _tabState.to = today;
            } else if (range === 'week') {
                var r = _periodRange('weekly');
                _tabState.from = r.from; _tabState.to = r.to;
            } else if (range === 'month') {
                var r2 = _periodRange('monthly');
                _tabState.from = r2.from; _tabState.to = r2.to;
            } else if (range === 'all') {
                _tabState.from = ''; _tabState.to = '';
            }
            var f = document.getElementById('sdpTabFrom'); if (f) f.value = _tabState.from;
            var t = document.getElementById('sdpTabTo'); if (t) t.value = _tabState.to;
            renderTabResults();
        },
        exportPeriod: function (period) {
            var r = _periodRange(period);
            _export(r.from, r.to, _state.type);
        }
    };
})();

/* Router entry point (registered in app.js renderers) */
function renderStaffDeployment(container) {
    StaffDeployment.renderFull(container);
}
