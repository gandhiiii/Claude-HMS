// Security Deployment — daily, location-wise Security Guard & Supervisor duty log
// Add/edit/remove by facility-department employees (tab) and HOD/Admin (module).
// Data key: securityDeployment  (synced via SYNC.SHARED_KEYS)

var SecurityDeployment = (function () {
    var KEY = 'securityDeployment';
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
            names = ['Main Gate', 'Emergency Gate', 'Ground Floor', 'First Floor',
                     'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor'];
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

    function _isManager(user) {
        return !!(user && (user.isSuperAdmin || user.role === 'admin' || user.role === 'hod'));
    }

    function _canEdit(user) {
        return _isManager(user);
    }

    function _canRemove(user, e) {
        if (_isManager(user)) return true;
        return !!(user && e.createdBy === user.username);
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
        var s = { guards: 0, supervisors: 0, floors: {} };
        rows.forEach(function (e) {
            if (e.staffType === 'supervisor') s.supervisors++; else s.guards++;
            var f = e.floor || 'Other';
            if (!s.floors[f]) s.floors[f] = { guards: 0, supervisors: 0, total: 0 };
            s.floors[f].total++;
            if (e.staffType === 'supervisor') s.floors[f].supervisors++; else s.floors[f].guards++;
        });
        return s;
    }

    function _labelType(e) {
        return e.staffType === 'supervisor' ? 'Supervisor' : 'Guard';
    }

    function _addEntry(data) {
        var user = AUTH.currentUser();
        var staffType = data.staffType === 'supervisor' ? 'supervisor' : 'guard';
        var date  = data.date || _dateStr();
        var floor = (data.floor || '').trim();
        var staffName = (data.staffName || '').trim();
        var shift = data.shift || 'Morning';
        var duty  = (data.duty || '').trim();
        var time  = (data.time || '').trim();
        var place = (data.place || '').trim();
        if (!floor) { APP.notify('Enter the floor / gate', 'error'); return null; }
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
        APP.notify('Security deployment added ✓', 'success');
        return entry;
    }

    function _editEntry(id, data) {
        var user = AUTH.currentUser();
        if (!_canEdit(user)) { APP.notify('Only HOD/Admin can edit entries', 'error'); return null; }
        var entry = DB.getById(KEY, id);
        if (!entry) { APP.notify('Entry not found', 'error'); return null; }
        var updates = {
            staffType: data.staffType === 'supervisor' ? 'supervisor' : 'guard',
            date: data.date || entry.date,
            floor: (data.floor || '').trim(),
            staffName: (data.staffName || '').trim(),
            shift: data.shift || entry.shift,
            duty: (data.duty || '').trim(),
            time: (data.time || '').trim(),
            place: (data.place || '').trim()
        };
        if (!updates.floor) { APP.notify('Enter the floor / gate', 'error'); return null; }
        if (!updates.staffName) { APP.notify('Enter the staff name', 'error'); return null; }
        var updated = DB.update(KEY, id, updates);
        if (updated) APP.notify('Entry updated ✓', 'success');
        return updated;
    }

    function _removeEntry(id) {
        var user = AUTH.currentUser();
        var entry = DB.getById(KEY, id);
        if (!entry) { APP.notify('Entry not found', 'error'); return; }
        if (!_canRemove(user, entry)) { APP.notify('Only HOD/Admin or the person who added it can remove this entry', 'error'); return; }
        if (confirm('Remove this security deployment entry?')) {
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
        var data = rows.map(function (e) {
            return [e.date || '', _labelType(e), e.floor || '', e.place || '', e.time || '',
                    e.staffName || '', e.shift || '', e.duty || '', e.createdByName || e.createdBy || ''];
        });
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
        ws['!cols'] = [12, 16, 18, 24, 10, 24, 12, 30, 22].map(function (w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, ws, 'Security Deployment');
        var range = (fromDate || 'all') + '_to_' + (toDate || 'all');
        XLSX.writeFile(wb, 'Security_Deployment_' + range + '.xlsx');
        APP.notify('Excel report downloaded ✓', 'success');
    }

    /* ── Shared add-entry form ── */
    function _addFormHtml(withFilterWrap) {
        var floors = _floors();
        var html = '';
        if (withFilterWrap) html += '<div class="card" style="padding:16px;margin-bottom:16px;border-top:3px solid #b71c1c;">';
        html += '<div style="font-weight:600;font-size:14px;margin-bottom:10px;">➕ ' + 'Add Security Deployment Entry' + '</div>'
            + '<div class="grid-2">'
            + '<div class="form-group"><label style="font-size:12px;">Staff Type *</label>'
            + '<select id="sedType" class="form-control" onchange="SecurityDeployment.updateStaffList()">'
            + '<option value="guard">Security Guard</option>'
            + '<option value="supervisor">Security Supervisor</option>'
            + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">Date *</label>'
            + '<input type="date" id="sedDate" class="form-control" value="' + _dateStr() + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Floor / Gate *</label>'
            + '<input type="text" id="sedFloor" list="sedFloorList" class="form-control" placeholder="e.g. Main Gate, First Floor">'
            + '<datalist id="sedFloorList">' + floors.map(function (f) { return '<option value="' + _esc(f) + '">'; }).join('') + '</datalist></div>'
            + '<div class="form-group"><label style="font-size:12px;">Time</label>'
            + '<input type="time" id="sedTime" class="form-control"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Place / Location</label>'
            + '<input type="text" id="sedPlace" class="form-control" placeholder="e.g. Reception, OT Corridor"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Name *</label>'
            + '<input type="text" id="sedStaffName" list="sedStaffList" class="form-control" placeholder="Staff name">'
            + '<datalist id="sedStaffList"></datalist></div>'
            + '<div class="form-group"><label style="font-size:12px;">Shift</label>'
            + '<select id="sedShift" class="form-control">'
            + '<option value="Morning">Morning</option><option value="Evening">Evening</option><option value="Night">Night</option>'
            + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">Duty / Remarks</label>'
            + '<input type="text" id="sedDuty" class="form-control" placeholder="e.g. Gate duty, Patrol"></div>'
            + '</div>'
            + '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-success" onclick="SecurityDeployment.submitAdd()">✓ Save Entry</button>'
            + '<button class="btn btn-sm btn-outline" onclick="SecurityDeployment.toggleAdd()">Cancel</button>'
            + '</div>';
        if (withFilterWrap) html += '</div>';
        return html;
    }

    /* ── Shared edit form (modal) ── */
    function _editFormHtml(e) {
        var floors = _floors();
        var typeGuard = e.staffType !== 'supervisor' ? ' selected' : '';
        var typeSup   = e.staffType === 'supervisor' ? ' selected' : '';
        return '<div class="grid-2">'
            + '<div class="form-group"><label style="font-size:12px;">Staff Type *</label>'
            + '<select id="sedEditType" class="form-control">'
            + '<option value="guard"' + typeGuard + '>Security Guard</option>'
            + '<option value="supervisor"' + typeSup + '>Security Supervisor</option>'
            + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">Date *</label>'
            + '<input type="date" id="sedEditDate" class="form-control" value="' + _esc(e.date || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Floor / Gate *</label>'
            + '<input type="text" id="sedEditFloor" list="sedEditFloorList" class="form-control" value="' + _esc(e.floor || '') + '">'
            + '<datalist id="sedEditFloorList">' + floors.map(function (f) { return '<option value="' + _esc(f) + '">'; }).join('') + '</datalist></div>'
            + '<div class="form-group"><label style="font-size:12px;">Time</label>'
            + '<input type="time" id="sedEditTime" class="form-control" value="' + _esc(e.time || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Place / Location</label>'
            + '<input type="text" id="sedEditPlace" class="form-control" value="' + _esc(e.place || '') + '" placeholder="e.g. Reception, OT Corridor"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Name *</label>'
            + '<input type="text" id="sedEditStaffName" class="form-control" value="' + _esc(e.staffName || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Shift</label>'
            + '<select id="sedEditShift" class="form-control">'
            + '<option value="Morning"' + (e.shift === 'Morning' ? ' selected' : '') + '>Morning</option>'
            + '<option value="Evening"' + (e.shift === 'Evening' ? ' selected' : '') + '>Evening</option>'
            + '<option value="Night"' + (e.shift === 'Night' ? ' selected' : '') + '>Night</option>'
            + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">Duty / Remarks</label>'
            + '<input type="text" id="sedEditDuty" class="form-control" value="' + _esc(e.duty || '') + '"></div>'
            + '</div>'
            + '<input type="hidden" id="sedEditId" value="' + _esc(e.id) + '">';
    }

    function _entriesTable(rows, title, color, user) {
        var canEdit = _canEdit(user);
        var html = '<div class="card" style="margin-bottom:16px;border-top:3px solid ' + color + ';">'
            + '<div class="card-header"><h3>' + title + ' <span class="badge badge-primary" style="font-size:11px;">' + rows.length + '</span></h3></div>';
        if (rows.length === 0) {
            html += '<div style="color:var(--gray);font-size:13px;padding:14px;">No entries.</div>';
        } else {
            html += '<div class="table-responsive"><table><thead><tr>'
                + '<th>Date</th><th>Floor / Place</th><th>Time</th><th>Staff Name</th><th>Shift</th><th>Duty</th><th>Added By</th><th></th>'
                + '</tr></thead><tbody>';
            rows.forEach(function (e) {
                var actions = '';
                if (canEdit) {
                    actions += '<button class="btn btn-sm btn-primary" style="padding:2px 8px;font-size:11px;" onclick="SecurityDeployment.openEdit(\'' + e.id + '\')">✏️ Edit</button> ';
                }
                if (_canRemove(user, e)) {
                    actions += '<button class="btn btn-sm btn-danger" style="padding:2px 8px;font-size:11px;" onclick="SecurityDeployment.removeEntry(\'' + e.id + '\')">✕</button>';
                }
                html += '<tr>'
                    + '<td>' + _esc(e.date || '') + '</td>'
                    + '<td><strong>' + _esc(e.floor || '') + '</strong>'
                    + (e.place ? '<div style="font-size:11px;color:var(--gray);">' + _esc(e.place) + '</div>' : '') + '</td>'
                    + '<td>' + _esc(e.time || '') + '</td>'
                    + '<td>' + _esc(e.staffName || '') + '</td>'
                    + '<td>' + _esc(e.shift || '') + '</td>'
                    + '<td>' + _esc(e.duty || '') + '</td>'
                    + '<td>' + _esc(e.createdByName || e.createdBy || '') + '</td>'
                    + '<td>' + actions + '</td>'
                    + '</tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';
        return html;
    }

    function _summaryCards(sm) {
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">'
            + '<div style="background:#eceff1;border-radius:10px;padding:12px;text-align:center;border:1px solid #b0bec5;">'
            + '<div style="font-size:22px;font-weight:700;color:#37474f;">' + sm.guards + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">🛡️ Guards</div></div>'
            + '<div style="background:#e3f2fd;border-radius:10px;padding:12px;text-align:center;border:1px solid #90caf9;">'
            + '<div style="font-size:22px;font-weight:700;color:#1565c0;">' + sm.supervisors + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">👮 Supervisors</div></div>'
            + '<div style="background:#fff8e1;border-radius:10px;padding:12px;text-align:center;border:1px solid #ffe082;grid-column:1/-1;">'
            + '<div style="font-size:11px;color:var(--gray);margin-bottom:6px;">📍 Post-wise today</div>';
        var floorKeys = Object.keys(sm.floors);
        if (floorKeys.length === 0) {
            html += '<div style="font-size:13px;color:var(--gray);">No entries yet</div>';
        } else {
            html += floorKeys.sort().map(function (f) {
                var fl = sm.floors[f];
                return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:5px 10px;margin:3px;font-size:12px;">'
                    + '<strong>' + _esc(f) + '</strong>'
                    + '<span>🛡️ ' + fl.guards + '</span>'
                    + '<span>👮 ' + fl.supervisors + '</span>'
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
            + '<h2 style="font-size:18px;font-weight:700;">🛡️ Security Deployment</h2>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="SecurityDeployment.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="SecurityDeployment.exportCurrent()">📊 Download Excel</button>'
            + '</div></div>'

            // Filters
            + '<div class="card" style="padding:14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:end;">'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">From</label>'
            + '<input type="date" id="sedFrom" class="form-control" value="' + _state.from + '" style="padding:6px 8px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">To</label>'
            + '<input type="date" id="sedTo" class="form-control" value="' + _state.to + '" style="padding:6px 8px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">Staff Type</label>'
            + '<select id="sedTypeFilter" class="form-control" style="padding:6px 8px;">'
            + '<option value="all">All</option><option value="guard">Guard</option><option value="supervisor">Supervisor</option>'
            + '</select></div>'
            + '<button class="btn btn-sm btn-primary" onclick="SecurityDeployment.applyFilter()">Apply</button>'
            + '<button class="btn btn-sm btn-outline" onclick="SecurityDeployment.setToday()">Today</button>'
            + '</div>'

            // Add form (hidden)
            + '<div id="sedAddWrap" style="display:none;">' + _addFormHtml() + '</div>'

            // Summary
            + '<div id="sedSummary"></div>'

            // Tables
            + '<div id="sedTables"></div>';

        container.innerHTML = html;
        document.getElementById('sedTypeFilter').value = _state.type;
        SecurityDeployment.updateStaffList();
        renderResults();
    }

    function renderResults() {
        var from = _state.from, to = _state.to, type = _state.type;
        var rows = _filter(from, to, type);
        var user = AUTH.currentUser();
        var sm = _summary(rows);

        var sumEl = document.getElementById('sedSummary');
        if (sumEl) sumEl.innerHTML = _summaryCards(sm);

        var tabEl = document.getElementById('sedTables');
        if (!tabEl) return;
        var guards = rows.filter(function (e) { return e.staffType !== 'supervisor'; });
        var supervisors = rows.filter(function (e) { return e.staffType === 'supervisor'; });
        tabEl.innerHTML = _entriesTable(guards, '🛡️ Security Guards', '#37474f', user)
            + _entriesTable(supervisors, '👮 Security Supervisors', '#1565c0', user);
    }

    /* ── Employee dashboard tab ── */
    function renderTab(el) {
        var user = AUTH.currentUser();
        if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
        _mode = 'tab';
        var today = _dateStr();

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:16px;">🛡️ Security Deployment — ' + today + '</div>'
            + '<div style="display:flex;gap:6px;">'
            + '<button class="btn btn-sm btn-primary" onclick="SecurityDeployment.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="SecurityDeployment.exportToday()">📊 Excel</button>'
            + '</div></div>'
            + '<div id="sedAddWrap" style="display:none;margin-bottom:14px;">' + _addFormHtml() + '</div>'
            + '<div id="sedTabBody"></div>';

        el.innerHTML = html;
        renderTabResults(today);
    }

    function renderTabResults(today) {
        var user = AUTH.currentUser();
        var body = document.getElementById('sedTabBody');
        if (!body) return;
        var rows = _filter(today, today, 'all');
        if (!_isManager(user)) {
            rows = rows.filter(function (e) { return e.createdBy === (user ? user.username : ''); });
        }
        var sm = _summary(rows);
        var guards = rows.filter(function (e) { return e.staffType !== 'supervisor'; });
        var supervisors = rows.filter(function (e) { return e.staffType === 'supervisor'; });
        body.innerHTML = _summaryCards(sm)
            + _entriesTable(guards, '🛡️ Security Guards', '#37474f', user)
            + _entriesTable(supervisors, '👮 Security Supervisors', '#1565c0', user);
    }

    return {
        renderFull: renderFull,
        renderTab: renderTab,
        updateStaffList: function () {
            var type = (document.getElementById('sedType') || {}).value || 'guard';
            var dl = document.getElementById('sedStaffList');
            if (!dl) return;
            dl.innerHTML = _namesForType(type).map(function (n) {
                return '<option value="' + _esc(n) + '">';
            }).join('');
        },
        toggleAdd: function () {
            var wrap = document.getElementById('sedAddWrap');
            if (!wrap) return;
            var isHidden = wrap.style.display === 'none';
            wrap.style.display = isHidden ? 'block' : 'none';
            var d = document.getElementById('sedDate');
            if (d && !d.value) d.value = _dateStr();
            SecurityDeployment.updateStaffList();
        },
        submitAdd: function () {
            var type = (document.getElementById('sedType') || {}).value || 'guard';
            var date = (document.getElementById('sedDate') || {}).value || _dateStr();
            var floor = (document.getElementById('sedFloor') || {}).value || '';
            var staffName = (document.getElementById('sedStaffName') || {}).value || '';
            var shift = (document.getElementById('sedShift') || {}).value || 'Morning';
            var duty = (document.getElementById('sedDuty') || {}).value || '';
            var time = (document.getElementById('sedTime') || {}).value || '';
            var place = (document.getElementById('sedPlace') || {}).value || '';
            var entry = _addEntry({
                staffType: type, date: date, floor: floor,
                staffName: staffName, shift: shift, duty: duty,
                time: time, place: place
            });
            if (!entry) return;
            if (document.getElementById('sedFloor')) {
                var f = document.getElementById('sedFloor'); if (f) f.value = '';
                var s = document.getElementById('sedStaffName'); if (s) s.value = '';
                var du = document.getElementById('sedDuty'); if (du) du.value = '';
                var t = document.getElementById('sedTime'); if (t) t.value = '';
                var pl = document.getElementById('sedPlace'); if (pl) pl.value = '';
                SecurityDeployment.updateStaffList();
            }
            if (_mode === 'module') renderSecurityDeployment(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        openEdit: function (id) {
            var user = AUTH.currentUser();
            if (!_canEdit(user)) { APP.notify('Only HOD/Admin can edit entries', 'error'); return; }
            var e = DB.getById(KEY, id);
            if (!e) { APP.notify('Entry not found', 'error'); return; }
            openFormModal('✏️ Edit Security Deployment Entry', _editFormHtml(e), 'SecurityDeployment.submitEdit()');
        },
        submitEdit: function () {
            var id = (document.getElementById('sedEditId') || {}).value || '';
            if (!id) return false;
            var updated = _editEntry(id, {
                staffType: (document.getElementById('sedEditType') || {}).value || 'guard',
                date: (document.getElementById('sedEditDate') || {}).value || '',
                floor: (document.getElementById('sedEditFloor') || {}).value || '',
                staffName: (document.getElementById('sedEditStaffName') || {}).value || '',
                shift: (document.getElementById('sedEditShift') || {}).value || 'Morning',
                duty: (document.getElementById('sedEditDuty') || {}).value || '',
                time: (document.getElementById('sedEditTime') || {}).value || '',
                place: (document.getElementById('sedEditPlace') || {}).value || ''
            });
            if (!updated) return false;
            if (_mode === 'module') renderSecurityDeployment(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        removeEntry: function (id) {
            _removeEntry(id);
            if (_mode === 'module') renderSecurityDeployment(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        applyFilter: function () {
            _state.from = (document.getElementById('sedFrom') || {}).value || '';
            _state.to = (document.getElementById('sedTo') || {}).value || '';
            _state.type = (document.getElementById('sedTypeFilter') || {}).value || 'all';
            renderResults();
        },
        setToday: function () {
            var t = _dateStr();
            _state.from = t; _state.to = t;
            var f = document.getElementById('sedFrom'); if (f) f.value = t;
            var t2 = document.getElementById('sedTo'); if (t2) t2.value = t;
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
function renderSecurityDeployment(container) {
    SecurityDeployment.renderFull(container);
}
