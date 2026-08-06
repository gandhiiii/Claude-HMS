// Patient Shifting — daily log of patients moved from one place/location to another
// Add/edit/remove by facility-department employees (tab) and HOD/Admin (module).
// Data key: patientShiftings  (synced via SYNC.SHARED_KEYS)

var PatientShifting = (function () {
    var KEY = 'patientShiftings';
    var _placesCache = null;
    var _state = { from: '', to: '' };
    var _mode = 'module';

    var CATEGORIES = ['Attendant', 'Nurse', 'PCA', 'Technician', 'Facility In-charge'];

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

    function _places() {
        if (_placesCache) return _placesCache;
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
        try {
            _all().forEach(function (e) {
                var p = (e.fromPlace || '').trim(); if (p && names.indexOf(p) === -1) names.push(p);
                var q = (e.toPlace || '').trim();  if (q && names.indexOf(q) === -1) names.push(q);
            });
        } catch (e) {}
        if (names.length === 0) {
            names = ['Basement', 'Ground Floor', 'First Floor', 'Second Floor', 'ICU',
                     'OT Complex', 'Third Floor', 'Fourth Floor'];
        }
        _placesCache = names;
        return names;
    }

    function _namesForCategory(cat) {
        var seen = [], map = {};
        _all().forEach(function (e) {
            if (e.category !== cat) return;
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

    function _filter(fromDate, toDate) {
        var out = _all().filter(function (e) {
            if (fromDate && (e.date || '') < fromDate) return false;
            if (toDate && (e.date || '') > toDate) return false;
            return true;
        });
        return out.sort(function (a, b) {
            var ka = (a.date || '') + '|' + (a.time || '') + '|' + (a.createdAt || '');
            var kb = (b.date || '') + '|' + (b.time || '') + '|' + (b.createdAt || '');
            return kb.localeCompare(ka);
        });
    }

    function _addEntry(data) {
        var user = AUTH.currentUser();
        var date  = data.date || _dateStr();
        var time  = data.time || '';
        var staffName = (data.staffName || '').trim();
        var category  = (data.category || '').trim();
        var fromPlace = (data.fromPlace || '').trim();
        var toPlace   = (data.toPlace || '').trim();
        if (!fromPlace) { APP.notify('Enter the place/room you are shifting from', 'error'); return null; }
        if (!toPlace) { APP.notify('Enter the place/room you are shifting to', 'error'); return null; }
        if (!staffName) { APP.notify('Enter the staff name', 'error'); return null; }
        if (!time) { APP.notify('Enter the time', 'error'); return null; }
        var entry = DB.add(KEY, {
            date: date,
            time: time,
            staffName: staffName,
            category: category || 'Attendant',
            fromPlace: fromPlace,
            toPlace: toPlace,
            createdBy: user ? user.username : '',
            createdByName: user ? (user.fullName || user.username) : ''
        });
        APP.notify('Patient shifting added ✓', 'success');
        return entry;
    }

    function _editEntry(id, data) {
        var user = AUTH.currentUser();
        if (!_canEdit(user)) { APP.notify('Only HOD/Admin can edit entries', 'error'); return null; }
        var entry = DB.getById(KEY, id);
        if (!entry) { APP.notify('Entry not found', 'error'); return null; }
        var updates = {
            date: data.date || entry.date,
            time: (data.time || '').trim(),
            staffName: (data.staffName || '').trim(),
            category: (data.category || '').trim(),
            fromPlace: (data.fromPlace || '').trim(),
            toPlace: (data.toPlace || '').trim()
        };
        if (!updates.fromPlace) { APP.notify('Enter the place/room you are shifting from', 'error'); return null; }
        if (!updates.toPlace) { APP.notify('Enter the place/room you are shifting to', 'error'); return null; }
        if (!updates.staffName) { APP.notify('Enter the staff name', 'error'); return null; }
        if (!updates.time) { APP.notify('Enter the time', 'error'); return null; }
        var updated = DB.update(KEY, id, updates);
        if (updated) APP.notify('Entry updated ✓', 'success');
        return updated;
    }

    function _removeEntry(id) {
        var user = AUTH.currentUser();
        var entry = DB.getById(KEY, id);
        if (!entry) { APP.notify('Entry not found', 'error'); return; }
        if (!_canRemove(user, entry)) { APP.notify('Only HOD/Admin or the person who added it can remove this entry', 'error'); return; }
        if (confirm('Remove this patient shifting entry?')) {
            DB.delete(KEY, id);
            APP.notify('Entry removed', 'success');
        }
    }

    function _export(fromDate, toDate) {
        if (typeof XLSX === 'undefined') {
            APP.notify('Excel library not loaded yet — please retry in a moment', 'error');
            return;
        }
        var rows = _filter(fromDate, toDate);
        if (rows.length === 0) { APP.notify('No data to export', 'info'); return; }
        var headers = ['Date', 'Time', 'Staff Name', 'Staff Category', 'From Place', 'To Place', 'Added By'];
        var data = rows.map(function (e) {
            return [e.date || '', e.time || '', e.staffName || '', e.category || '',
                    e.fromPlace || '', e.toPlace || '', e.createdByName || e.createdBy || ''];
        });
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
        ws['!cols'] = [12, 10, 24, 18, 24, 24, 22].map(function (w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, ws, 'Patient Shifting');
        var range = (fromDate || 'all') + '_to_' + (toDate || 'all');
        XLSX.writeFile(wb, 'Patient_Shifting_' + range + '.xlsx');
        APP.notify('Excel report downloaded ✓', 'success');
    }

    function _categorySelHtml(current) {
        return CATEGORIES.map(function (c) {
            return '<option value="' + _esc(c) + '"' + (c === current ? ' selected' : '') + '>' + _esc(c) + '</option>';
        }).join('');
    }

    function _addFormHtml() {
        var places = _places();
        return '<div class="grid-2">'
            + '<div class="form-group"><label style="font-size:12px;">Date *</label>'
            + '<input type="date" id="psDate" class="form-control" value="' + _dateStr() + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Time *</label>'
            + '<input type="time" id="psTime" class="form-control"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Name *</label>'
            + '<input type="text" id="psStaffName" list="psStaffList" class="form-control" placeholder="Staff name">'
            + '<datalist id="psStaffList"></datalist></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Category *</label>'
            + '<select id="psCategory" class="form-control" onchange="PatientShifting.updateStaffList()">'
            + _categorySelHtml() + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">From Place / Room *</label>'
            + '<input type="text" id="psFromPlace" list="psPlaceList" class="form-control" placeholder="e.g. Second Floor, Ward 4">'
            + '</div>'
            + '<div class="form-group"><label style="font-size:12px;">To Place / Room *</label>'
            + '<input type="text" id="psToPlace" list="psPlaceList" class="form-control" placeholder="e.g. ICU, OT Complex">'
            + '</div>'
            + '<div style="grid-column:1/-1;">'
            + '<datalist id="psPlaceList">' + places.map(function (f) { return '<option value="' + _esc(f) + '">'; }).join('') + '</datalist></div>'
            + '</div>'
            + '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-success" onclick="PatientShifting.submitAdd()">✓ Save Entry</button>'
            + '<button class="btn btn-sm btn-outline" onclick="PatientShifting.toggleAdd()">Cancel</button>'
            + '</div>';
    }

    function _editFormHtml(e) {
        var places = _places();
        return '<div class="grid-2">'
            + '<div class="form-group"><label style="font-size:12px;">Date *</label>'
            + '<input type="date" id="psEditDate" class="form-control" value="' + _esc(e.date || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Time *</label>'
            + '<input type="time" id="psEditTime" class="form-control" value="' + _esc(e.time || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Name *</label>'
            + '<input type="text" id="psEditStaffName" class="form-control" value="' + _esc(e.staffName || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">Staff Category *</label>'
            + '<select id="psEditCategory" class="form-control">' + _categorySelHtml(e.category) + '</select></div>'
            + '<div class="form-group"><label style="font-size:12px;">From Place / Room *</label>'
            + '<input type="text" id="psEditFrom" list="psEditPlaceList" class="form-control" value="' + _esc(e.fromPlace || '') + '"></div>'
            + '<div class="form-group"><label style="font-size:12px;">To Place / Room *</label>'
            + '<input type="text" id="psEditTo" list="psEditPlaceList" class="form-control" value="' + _esc(e.toPlace || '') + '"></div>'
            + '<div style="grid-column:1/-1;">'
            + '<datalist id="psEditPlaceList">' + places.map(function (f) { return '<option value="' + _esc(f) + '">'; }).join('') + '</datalist></div>'
            + '</div>'
            + '<input type="hidden" id="psEditId" value="' + _esc(e.id) + '">';
    }

    function _entriesTable(rows, user) {
        var canEdit = _canEdit(user);
        var html = '<div class="card" style="margin-bottom:16px;border-top:3px solid #00695c;">'
            + '<div class="card-header"><h3>🚑 Patient Shifting Entries <span class="badge badge-primary" style="font-size:11px;">' + rows.length + '</span></h3></div>';
        if (rows.length === 0) {
            html += '<div style="color:var(--gray);font-size:13px;padding:14px;">No entries.</div>';
        } else {
            html += '<div class="table-responsive"><table><thead><tr>'
                + '<th>Date</th><th>Time</th><th>Staff</th><th>Category</th><th>From</th><th>To</th><th>Added By</th><th></th>'
                + '</tr></thead><tbody>';
            rows.forEach(function (e) {
                var actions = '';
                if (canEdit) {
                    actions += '<button class="btn btn-sm btn-primary" style="padding:2px 8px;font-size:11px;" onclick="PatientShifting.openEdit(\'' + e.id + '\')">✏️ Edit</button> ';
                }
                if (_canRemove(user, e)) {
                    actions += '<button class="btn btn-sm btn-danger" style="padding:2px 8px;font-size:11px;" onclick="PatientShifting.removeEntry(\'' + e.id + '\')">✕</button>';
                }
                html += '<tr>'
                    + '<td>' + _esc(e.date || '') + '</td>'
                    + '<td>' + _esc(e.time || '') + '</td>'
                    + '<td><strong>' + _esc(e.staffName || '') + '</strong></td>'
                    + '<td>' + _esc(e.category || '') + '</td>'
                    + '<td><span style="display:inline-block;background:#e0f2f1;color:#00695c;border-radius:6px;padding:2px 8px;font-size:12px;">' + _esc(e.fromPlace || '') + '</span></td>'
                    + '<td><span style="display:inline-block;background:#e3f2fd;color:#1565c0;border-radius:6px;padding:2px 8px;font-size:12px;">' + _esc(e.toPlace || '') + '</span></td>'
                    + '<td>' + _esc(e.createdByName || e.createdBy || '') + '</td>'
                    + '<td>' + actions + '</td>'
                    + '</tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';
        return html;
    }

    function _summaryCards(rows) {
        var today = _dateStr();
        var todayCount = rows.filter(function (e) { return e.date === today; }).length;
        var catMap = {};
        rows.forEach(function (e) {
            var c = e.category || 'Attendant';
            if (!catMap[c]) catMap[c] = 0;
            catMap[c]++;
        });
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">'
            + '<div style="background:#e0f2f1;border-radius:10px;padding:12px;text-align:center;border:1px solid #80cbc4;">'
            + '<div style="font-size:22px;font-weight:700;color:#00695c;">' + rows.length + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">Total shifts</div></div>'
            + '<div style="background:#e3f2fd;border-radius:10px;padding:12px;text-align:center;border:1px solid #90caf9;">'
            + '<div style="font-size:22px;font-weight:700;color:#1565c0;">' + todayCount + '</div>'
            + '<div style="font-size:11px;color:var(--gray);">Today</div></div>'
            + '<div style="background:#f3e5f5;border-radius:10px;padding:12px;text-align:center;border:1px solid #ce93d8;grid-column:1/-1;">'
            + '<div style="font-size:11px;color:var(--gray);margin-bottom:6px;">👥 By staff category</div>';
        var catKeys = Object.keys(catMap);
        if (catKeys.length === 0) {
            html += '<div style="font-size:13px;color:var(--gray);">No entries yet</div>';
        } else {
            html += catKeys.map(function (c) {
                return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:5px 10px;margin:3px;font-size:12px;">'
                    + '<strong>' + _esc(c) + '</strong><span>' + catMap[c] + '</span></div>';
            }).join('');
        }
        html += '</div></div>';
        return html;
    }

    /* ── Full module page (HOD / Admin) ── */
    function renderFull(container) {
        _mode = 'module';
        var today = _dateStr();
        var lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 6);
        var lastWeekStr = _dateStr(lastWeek);
        _state.from = _state.from || lastWeekStr;
        _state.to   = _state.to || today;

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">'
            + '<h2 style="font-size:18px;font-weight:700;">🚑 Patient Shifting</h2>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="PatientShifting.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="PatientShifting.exportCurrent()">📊 Download Excel</button>'
            + '</div></div>'

            + '<div class="card" style="padding:14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:end;">'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">From</label>'
            + '<input type="date" id="psFrom" class="form-control" value="' + _state.from + '" style="padding:6px 8px;"></div>'
            + '<div class="form-group" style="margin:0;"><label style="font-size:12px;">To</label>'
            + '<input type="date" id="psToFilter" class="form-control" value="' + _state.to + '" style="padding:6px 8px;"></div>'
            + '<button class="btn btn-sm btn-primary" onclick="PatientShifting.applyFilter()">Apply</button>'
            + '<button class="btn btn-sm btn-outline" onclick="PatientShifting.setToday()">Today</button>'
            + '</div>'

            + '<div id="psAddWrap" style="display:none;">' + _addFormHtml() + '</div>'

            + '<div id="psSummary"></div>'
            + '<div id="psTables"></div>';

        container.innerHTML = html;
        PatientShifting.updateStaffList();
        renderResults();
    }

    function renderResults() {
        var from = _state.from, to = _state.to;
        var rows = _filter(from, to);
        var user = AUTH.currentUser();
        var sumEl = document.getElementById('psSummary');
        if (sumEl) sumEl.innerHTML = _summaryCards(rows);
        var tabEl = document.getElementById('psTables');
        if (tabEl) tabEl.innerHTML = _entriesTable(rows, user);
    }

    /* ── Employee dashboard tab ── */
    function renderTab(el) {
        var user = AUTH.currentUser();
        if (!user) { el.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
        _mode = 'tab';
        var today = _dateStr();

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
            + '<div style="font-weight:700;font-size:16px;">🚑 Patient Shifting — ' + today + '</div>'
            + '<div style="display:flex;gap:6px;">'
            + '<button class="btn btn-sm btn-primary" onclick="PatientShifting.toggleAdd()">➕ Add Entry</button>'
            + '<button class="btn btn-sm btn-success" onclick="PatientShifting.exportToday()">📊 Excel</button>'
            + '</div></div>'
            + '<div id="psAddWrap" style="display:none;margin-bottom:14px;">' + _addFormHtml() + '</div>'
            + '<div id="psTabBody"></div>';

        el.innerHTML = html;
        renderTabResults(today);
    }

    function renderTabResults(today) {
        var user = AUTH.currentUser();
        var body = document.getElementById('psTabBody');
        if (!body) return;
        var rows = _filter(today, today);
        if (!_isManager(user)) {
            rows = rows.filter(function (e) { return e.createdBy === (user ? user.username : ''); });
        }
        body.innerHTML = _summaryCards(rows) + _entriesTable(rows, user);
    }

    return {
        renderFull: renderFull,
        renderTab: renderTab,
        updateStaffList: function () {
            var cat = (document.getElementById('psCategory') || {}).value || 'Attendant';
            var dl = document.getElementById('psStaffList');
            if (!dl) return;
            dl.innerHTML = _namesForCategory(cat).map(function (n) {
                return '<option value="' + _esc(n) + '">';
            }).join('');
        },
        updateCategoryList: function () {
            PatientShifting.updateStaffList();
        },
        toggleAdd: function () {
            var wrap = document.getElementById('psAddWrap');
            if (!wrap) return;
            var isHidden = wrap.style.display === 'none';
            wrap.style.display = isHidden ? 'block' : 'none';
            var d = document.getElementById('psDate');
            if (d && !d.value) d.value = _dateStr();
            PatientShifting.updateStaffList();
        },
        submitAdd: function () {
            var date = (document.getElementById('psDate') || {}).value || _dateStr();
            var time = (document.getElementById('psTime') || {}).value || '';
            var staffName = (document.getElementById('psStaffName') || {}).value || '';
            var category = (document.getElementById('psCategory') || {}).value || 'Attendant';
            var fromPlace = (document.getElementById('psFromPlace') || {}).value || '';
            var toPlace = (document.getElementById('psToPlace') || {}).value || '';
            var entry = _addEntry({
                date: date, time: time, staffName: staffName,
                category: category, fromPlace: fromPlace, toPlace: toPlace
            });
            if (!entry) return;
            var s = document.getElementById('psStaffName'); if (s) s.value = '';
            var f = document.getElementById('psFromPlace'); if (f) f.value = '';
            var t = document.getElementById('psToPlace'); if (t) t.value = '';
            var tm = document.getElementById('psTime'); if (tm) tm.value = '';
            PatientShifting.updateStaffList();
            if (_mode === 'module') renderPatientShifting(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        openEdit: function (id) {
            var user = AUTH.currentUser();
            if (!_canEdit(user)) { APP.notify('Only HOD/Admin can edit entries', 'error'); return; }
            var e = DB.getById(KEY, id);
            if (!e) { APP.notify('Entry not found', 'error'); return; }
            openFormModal('✏️ Edit Patient Shifting Entry', _editFormHtml(e), 'PatientShifting.submitEdit()');
        },
        submitEdit: function () {
            var id = (document.getElementById('psEditId') || {}).value || '';
            if (!id) return false;
            var updated = _editEntry(id, {
                date: (document.getElementById('psEditDate') || {}).value || '',
                time: (document.getElementById('psEditTime') || {}).value || '',
                staffName: (document.getElementById('psEditStaffName') || {}).value || '',
                category: (document.getElementById('psEditCategory') || {}).value || 'Attendant',
                fromPlace: (document.getElementById('psEditFrom') || {}).value || '',
                toPlace: (document.getElementById('psEditTo') || {}).value || ''
            });
            if (!updated) return false;
            if (_mode === 'module') renderPatientShifting(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        removeEntry: function (id) {
            _removeEntry(id);
            if (_mode === 'module') renderPatientShifting(document.getElementById('pageContent'));
            else { var tabEl = document.getElementById('empTabContent'); if (tabEl) renderTab(tabEl); }
        },
        applyFilter: function () {
            _state.from = (document.getElementById('psFrom') || {}).value || '';
            _state.to = (document.getElementById('psToFilter') || {}).value || '';
            renderResults();
        },
        setToday: function () {
            var t = _dateStr();
            _state.from = t; _state.to = t;
            var f = document.getElementById('psFrom'); if (f) f.value = t;
            var t2 = document.getElementById('psToFilter'); if (t2) t2.value = t;
            renderResults();
        },
        exportCurrent: function () {
            _export(_state.from, _state.to);
        },
        exportToday: function () {
            _export(_dateStr(), _dateStr());
        }
    };
})();

/* Router entry point (registered in app.js renderers) */
function renderPatientShifting(container) {
    PatientShifting.renderFull(container);
}