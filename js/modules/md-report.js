// MD Report — Facility HOD report for the Managing Director (MD)
// Two admission report categories (full + occupancy/discharge), plus an
// all-in-one department report and a WhatsApp shareable summary.
// Period selector: Today / This Week / This Month.

var _mdrState = { period: 'today', tab: 'overview' };

function _mdrAccessOk(user) {
    if (!user) return false;
    if (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin') return true;
    if (user.role !== 'hod') return false;
    var d = (user.department || '').trim().toLowerCase();
    return d === 'facility' || d === 'it' || d === 'maintenance';
}

function _mdrScope() {
    var u = AUTH.currentUser();
    if (u && (u.isSuperAdmin || u.role === 'admin' || u.role === 'super_admin')) return 'all';
    return (u && u.department) || '';
}

function _mdrEsc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _mdrPeriodLabel() {
    var map = { today: T('mdr_period_today'), week: T('mdr_period_week'), month: T('mdr_period_month') };
    return map[_mdrState.period] || map.today;
}

function _mdrRange() {
    var p = _mdrState.period;
    var now = new Date();
    var from, to;
    if (p === 'today') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
    else if (p === 'week') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); }
    else { from = new Date(now.getFullYear(), now.getMonth(), 1); }
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: from.getTime(), to: to.getTime() };
}

function _mdrInRange(ts) {
    var r = _mdrRange();
    var t = ts ? new Date(ts).getTime() : 0;
    return t >= r.from && t <= r.to;
}

function _mdrInDept(deptVal) {
    var scope = _mdrScope();
    if (scope === 'all') return true;
    return (deptVal || '').trim().toLowerCase() === scope.toLowerCase();
}

function _mdrOccupancy() {
    var rooms = DB.get('rooms') || [];
    var adms = DB.get('admissions') || [];
    var overrides = DB.get('roomStatus') || [];
    var cleaningTasks = (DB.get('roomCleaningTasks') || []).filter(function (t) { return t.status !== 'done'; });
    var totalBeds = 0;
    rooms.forEach(function (r) { totalBeds += ((r.beds && r.beds.length) ? r.beds.length : 1); });
    var occMap = {}, occupied = 0;
    adms.forEach(function (a) {
        if (a.status === 'admitted') {
            var key = a.roomNo + '|' + (a.bedId || 'A');
            if (!occMap[key]) { occMap[key] = true; occupied++; }
        }
    });
    var cleaning = cleaningTasks.length;
    var maintenance = overrides.filter(function (o) { return o.status === 'maintenance'; }).length;
    var pct = totalBeds ? Math.round(occupied / totalBeds * 100) : 0;
    return { totalBeds: totalBeds, occupied: occupied, pct: pct, cleaning: cleaning, maintenance: maintenance };
}

function _mdrAdmissions() {
    return (DB.get('admissions') || []).filter(function (a) { return _mdrInRange(a.admissionDate); });
}

function _mdrDischarges() {
    return (DB.get('admissions') || []).filter(function (a) { return a.status === 'discharged' && _mdrInRange(a.dischargeDate); });
}

function _mdrProblems() {
    return (DB.get('problems') || []).filter(function (p) {
        return _mdrInRange(p.createdAt);
    });
}

function _mdrComplaints() {
    return (DB.get('complaints') || []).filter(function (c) { return _mdrInRange(c.createdAt); });
}

function _mdrTrips() {
    return (DB.get('ambulance_trips') || []).filter(function (t) { return _mdrInRange(t.createdAt); });
}

function _mdrReceipts() {
    return (DB.get('inventory_receipts') || []).filter(function (r) { return _mdrInRange(r.createdAt); });
}

function _mdrSecurity() {
    return (DB.get('security_incidents') || []).filter(function (g) { return _mdrInRange(g.createdAt || g.incidentDate); });
}

function _mdrSecurityAll() {
    return (DB.get('security_incidents') || []);
}

function _mdrRoomChecklists() {
    return (DB.get('roomchecklists') || []).filter(function (c) { return _mdrInRange(c.createdAt); });
}

function _mdrMaterialReqs() {
    return (DB.get('material_requests') || []).filter(function (r) { return _mdrInRange(r.createdAt) && _mdrInDept(r.department); });
}

function _mdrPurchases() {
    return (DB.get('hodPurchases') || []).filter(function (x) { return _mdrInRange(x.createdAt) && _mdrInDept(x.department); });
}

function _mdrDeptTasks() {
    var all = (DB.get('tasks') || []).concat(DB.get('hodTasks') || []);
    return all.filter(function (x) { return _mdrInRange(x.createdAt) && _mdrInDept(x.department); });
}

function _mdrQp() {
    return (DB.get('quarterly_priorities') || []).filter(function (q) { return _mdrInDept(q.department); });
}

function _mdrBreakdowns() {
    var all = (DB.get('hodEquipmentBackdowns') || []).concat(
        (DB.get('hodEquipmentServices') || []).filter(function (s) { return s.status === 'backdown'; })
    );
    return all.filter(function (b) {
        var d = b.backdownDate || b.createdAt;
        return _mdrInRange(d) && _mdrInDept(b.department);
    });
}

function _mdrReports() {
    return (DB.get('reports') || []).filter(function (r) { return _mdrInRange(r.createdAt) && _mdrInDept(r.department); });
}

function _mdrTeam() {
    var scope = _mdrScope();
    return (DB.get('users') || []).filter(function (u) {
        if (u.isSuperAdmin || u.role === 'admin') return false;
        if (scope === 'all') return true;
        return (u.department || '').trim().toLowerCase() === scope.toLowerCase();
    });
}

function _mdrStat(value, label, color) {
    return '<div class="stat-card" style="border-left-color:' + (color || 'var(--primary)') + ';"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
}

function _mdrCard(title, bodyHtml) {
    return '<div class="card"><div class="card-header"><h3>' + title + '</h3></div><div style="padding:14px;">' + bodyHtml + '</div></div>';
}

/* ═══════════════════════════════════════════════
   MAIN RENDERER
   ═══════════════════════════════════════════════ */
function renderMdReport(container) {
    var user = AUTH.currentUser();
    if (!_mdrAccessOk(user)) {
        container.innerHTML = '<div class="card" style="text-align:center;padding:40px;">'
            + '<div style="font-size:48px;margin-bottom:12px;">🔒</div>'
            + '<h3 style="margin-bottom:8px;">' + T('mdr_access_denied') + '</h3>'
            + '<p style="color:var(--gray);font-size:14px;">' + T('mdr_access_denied_msg') + '</p>'
            + '<button class="btn btn-primary" style="margin-top:16px;" onclick="Router.navigate(\'hod-dashboard\')">← ' + T('mdr_back') + '</button>'
            + '</div>';
        return;
    }

    var hs = (typeof getHospitalSettings === 'function') ? getHospitalSettings() : {};
    var periods = [['today', T('mdr_period_today')], ['week', T('mdr_period_week')], ['month', T('mdr_period_month')]];
    var periodBtns = periods.map(function (p) {
        var active = _mdrState.period === p[0];
        return '<button class="btn btn-sm mdr-period-btn' + (active ? ' btn-primary' : '') + '" style="' + (active ? '' : 'background:var(--card-bg);border:1px solid var(--light-gray);') + '" onclick="mdRptSetPeriod(\'' + p[0] + '\',this)">' + p[1] + '</button>';
    }).join('');

    var tabs = [
        ['overview', T('mdr_tab_overview')],
        ['admissions', T('mdr_tab_admissions')],
        ['occupancy', T('mdr_tab_occupancy')],
        ['incidents', T('mdr_tab_incidents')],
        ['dept', T('mdr_tab_dept')],
        ['whatsapp', T('mdr_tab_whatsapp')]
    ];
    var tabBtns = tabs.map(function (t) {
        var active = _mdrState.tab === t[0];
        return '<button class="btn btn-sm mdr-tab' + (active ? ' btn-primary' : '') + '" style="' + (active ? '' : 'background:var(--card-bg);border:1px solid var(--light-gray);') + '" onclick="mdRptSwitchTab(\'' + t[0] + '\',this)">' + t[1] + '</button>';
    }).join('');

    container.innerHTML =
        '<div class="card" style="margin-bottom:14px;">'
        + '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">'
        + '<div><h3 style="margin:0;">📋 ' + T('mdr_title') + '</h3>'
        + '<div style="font-size:12px;color:var(--gray);margin-top:2px;">' + _mdrEsc(hs.name || 'Stavya Intelligence') + ' · ' + APP.formatDate(new Date()) + '</div></div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-sm btn-success" onclick="mdRptShareWhatsApp()">📲 ' + T('mdr_btn_whatsapp') + '</button>'
        + '<button class="btn btn-sm btn-primary" onclick="mdRptSendToMD()">📤 ' + T('mdr_btn_send_md') + '</button>'
        + '</div></div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px 0;">' + periodBtns + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">' + tabBtns + '</div>'
        + '<div id="mdRptContent"></div>';

    _mdrRenderTab();
}

function mdRptSetPeriod(p, btn) {
    _mdrState.period = p;
    document.querySelectorAll('.mdr-period-btn').forEach(function (b) {
        b.classList.remove('btn-primary');
        b.style.cssText = 'background:var(--card-bg);border:1px solid var(--light-gray);';
    });
    if (btn) { btn.classList.add('btn-primary'); btn.style.cssText = ''; }
    _mdrRenderTab();
}

function mdRptSwitchTab(tab, btn) {
    _mdrState.tab = tab;
    document.querySelectorAll('.mdr-tab').forEach(function (b) {
        b.classList.remove('btn-primary');
        b.style.cssText = 'background:var(--card-bg);border:1px solid var(--light-gray);';
    });
    if (btn) { btn.classList.add('btn-primary'); btn.style.cssText = ''; }
    _mdrRenderTab();
}

function _mdrRenderTab() {
    var content = document.getElementById('mdRptContent');
    if (!content) return;
    var tab = _mdrState.tab;
    if (tab === 'admissions') _mdrAdmissionsTab(content);
    else if (tab === 'occupancy') _mdrOccupancyTab(content);
    else if (tab === 'incidents') _mdrIncidentsTab(content);
    else if (tab === 'dept') _mdrDeptTab(content);
    else if (tab === 'whatsapp') _mdrWhatsAppTab(content);
    else _mdrOverviewTab(content);
}

/* ═══════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════ */
function _mdrOverviewTab(el) {
    var occ = _mdrOccupancy();
    var adms = _mdrAdmissions();
    var discharges = _mdrDischarges();
    var problems = _mdrProblems();
    var complaints = _mdrComplaints();
    var trips = _mdrTrips();
    var receipts = _mdrReceipts();
    var security = _mdrSecurity();
    var privileged = adms.filter(function (a) { return a.privileged === 'yes'; }).length;
    var openProbs = problems.filter(function (p) { return p.status !== 'resolved'; }).length;
    var resolvedProbs = problems.filter(function (p) { return p.status === 'resolved'; }).length;

    var html = '<div class="card" style="margin-bottom:14px;">'
        + '<div class="card-header"><h3>' + T('mdr_ov_hospital_ops') + ' — ' + _mdrPeriodLabel() + '</h3></div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:14px;">'
        + _mdrStat(occ.pct + '%', T('mdr_ov_occupancy'), 'var(--primary)')
        + _mdrStat(adms.length, T('mdr_ov_admissions'), 'var(--info)')
        + _mdrStat(discharges.length, T('mdr_ov_discharges'), 'var(--secondary)')
        + _mdrStat(privileged, T('mdr_ov_privileged'), 'var(--warning)')
        + _mdrStat(problems.length, T('mdr_ov_problems'), 'var(--danger)')
        + _mdrStat(complaints.length, T('mdr_ov_indoor'), 'var(--danger)')
        + _mdrStat(trips.length, T('mdr_ov_trips'), 'var(--info)')
        + _mdrStat(receipts.length, T('mdr_ov_purchases'), 'var(--success)')
        + _mdrStat(security.length, T('mdr_ov_security'), 'var(--warning)')
        + '</div></div>';

    html += _mdrCard(T('mdr_ov_quick_view'), ''
        + '<div style="font-size:13px;line-height:1.9;">'
        + '<div>🛏 <strong>' + T('mdr_ov_occupancy') + ':</strong> ' + occ.pct + '% · ' + T('mdr_ov_cleaning') + ': ' + occ.cleaning + ' · ' + T('mdr_ov_maintenance') + ': ' + occ.maintenance + '</div>'
        + '<div>🚪 <strong>' + T('mdr_ov_discharges') + ':</strong> ' + discharges.length + '</div>'
        + '<div>🔧 <strong>' + T('mdr_ov_problems') + ':</strong> ' + openProbs + ' ' + T('mdr_ov_open') + ' · ' + resolvedProbs + ' ' + T('mdr_ov_resolved') + '</div>'
        + '<div>🚑 <strong>' + T('mdr_ov_trips') + ':</strong> ' + trips.length + '</div>'
        + '<div>📦 <strong>' + T('mdr_ov_purchases') + ':</strong> ' + receipts.length + '</div>'
        + '<div>🛡 <strong>' + T('mdr_ov_security') + ':</strong> ' + security.length + ' · 📝 ' + T('mdr_ov_indoor') + ': ' + complaints.length + '</div>'
        + '</div>');

    el.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   TAB 1 — ADMISSION REPORT (FULL)
   ═══════════════════════════════════════════════ */
function _mdrAdmissionsTab(el) {
    var rows = _mdrAdmissions();
    var discharges = _mdrDischarges();
    var admitted = rows.filter(function (r) { return r.status === 'admitted'; }).length;
    var emergency = rows.filter(function (r) { return r.type === 'emergency'; }).length;
    var totalBill = rows.reduce(function (s, r) { return s + (parseFloat(r.billAmount) || 0); }, 0);

    var sumHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;">'
        + _mdrStat(rows.length, T('mdr_ov_admissions'), 'var(--primary)')
        + _mdrStat(admitted, T('mdr_ov_currently_admitted'), 'var(--info)')
        + _mdrStat(discharges.length, T('mdr_ov_discharges'), 'var(--secondary)')
        + _mdrStat(emergency, T('mdr_ov_emergency'), 'var(--danger)')
        + _mdrStat('₹' + totalBill.toLocaleString('en-IN'), T('mdr_ov_revenue'), 'var(--success)')
        + '</div>';

    var html = _mdrCard(T('mdr_tab_admissions') + ' — ' + _mdrPeriodLabel(), sumHtml);
    html += '<div class="card"><div class="card-header"><h3>' + T('mdr_adm_full_table') + '</h3></div>';
    if (rows.length === 0) {
        html += '<div class="empty-state" style="padding:40px;text-align:center;color:var(--gray);">' + T('mdr_no_records') + '</div>';
    } else {
        html += '<div class="table-responsive"><table><thead><tr>'
            + '<th>#</th><th>' + T('mdr_th_patient') + '</th><th>' + T('mdr_th_id') + '</th><th>' + T('mdr_th_age_gender') + '</th>'
            + '<th>' + T('mdr_th_room') + '</th><th>' + T('mdr_th_doctor') + '</th><th>' + T('mdr_th_type') + '</th>'
            + '<th>' + T('mdr_th_admitted') + '</th><th>' + T('mdr_th_discharged') + '</th><th>' + T('mdr_th_stay') + '</th>'
            + '<th>' + T('mdr_th_bill') + '</th><th>' + T('mdr_th_payment') + '</th><th>' + T('mdr_th_status') + '</th></tr></thead><tbody>';
        rows.slice().sort(function (a, b) { return new Date(b.admissionDate) - new Date(a.admissionDate); }).forEach(function (a, i) {
            var stay = a.status === 'discharged' && a.dischargeDate
                ? APP.daysBetween(a.admissionDate, a.dischargeDate)
                : (a.status === 'admitted' ? APP.daysBetween(a.admissionDate, new Date().toISOString()) : '—');
            var bedLabel = a.bedId ? ' (' + a.bedId + ')' : '';
            html += '<tr>'
                + '<td>' + (i + 1) + '</td>'
                + '<td><strong>' + _mdrEsc(a.patientName) + '</strong></td>'
                + '<td>' + _mdrEsc(a.patientId || '#' + a.id.slice(-6)) + '</td>'
                + '<td>' + _mdrEsc(a.age || '—') + ' / ' + _mdrEsc(a.gender || '—') + '</td>'
                + '<td>' + _mdrEsc(a.roomNo) + _mdrEsc(bedLabel) + '</td>'
                + '<td>' + _mdrEsc(a.doctorName || '—') + '</td>'
                + '<td><span class="badge ' + (a.type === 'emergency' ? 'badge-danger' : a.type === 'icu' ? 'badge-warning' : 'badge-info') + '">' + _mdrEsc(a.type) + '</span></td>'
                + '<td>' + APP.formatDate(a.admissionDate) + '</td>'
                + '<td>' + (a.dischargeDate ? APP.formatDate(a.dischargeDate) : '—') + '</td>'
                + '<td>' + stay + '</td>'
                + '<td>' + (a.billAmount ? '₹' + parseFloat(a.billAmount).toLocaleString('en-IN') : '—') + '</td>'
                + '<td><span class="badge ' + (a.paymentStatus === 'paid' ? 'badge-success' : a.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger') + '">' + _mdrEsc(a.paymentStatus || '—') + '</span></td>'
                + '<td><span class="badge ' + APP.getStatusBadge(a.status) + '">' + _mdrEsc(a.status) + '</span></td>'
                + '</tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   TAB 2 — OCCUPANCY & DISCHARGE SUMMARY
   ═══════════════════════════════════════════════ */
function _mdrOccupancyTab(el) {
    var occ = _mdrOccupancy();
    var discharges = _mdrDischarges();
    var cls = _mdrRoomChecklists();
    var problems = _mdrProblems();
    var overrides = DB.get('roomStatus') || [];
    var maintRooms = overrides.filter(function (o) { return o.status === 'maintenance'; });

    function clFaults(c) {
        var items = c.items || {};
        return Object.keys(items).filter(function (k) { return items[k] === false; }).length;
    }
    var pre = cls.filter(function (c) { return c.type === 'pre-admission'; });
    var post = cls.filter(function (c) { return c.type === 'post-discharge'; });
    var preFaults = pre.reduce(function (s, c) { return s + clFaults(c); }, 0);
    var postFaults = post.reduce(function (s, c) { return s + clFaults(c); }, 0);
    var openProbs = problems.filter(function (p) { return p.status !== 'resolved'; }).length;

    var html = '<div class="card" style="margin-bottom:14px;">'
        + '<div class="card-header"><h3>' + T('mdr_occ_title') + '</h3></div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;padding:14px;">'
        + _mdrStat(occ.pct + '%', T('mdr_ov_occupancy'), 'var(--primary)')
        + _mdrStat(discharges.length, T('mdr_ov_discharges'), 'var(--secondary)')
        + _mdrStat(occ.cleaning, T('mdr_ov_cleaning'), 'var(--warning)')
        + _mdrStat(maintRooms.length, T('mdr_ov_maintenance'), 'var(--danger)')
        + _mdrStat(openProbs, T('mdr_occ_open_problems'), 'var(--danger)')
        + '</div></div>';

    // Discharge list
    var disHtml = '';
    if (discharges.length === 0) {
        disHtml = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--gray);">' + T('mdr_no_records') + '</div>';
    } else {
        disHtml = '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_th_patient') + '</th><th>' + T('mdr_th_room') + '</th><th>' + T('mdr_th_admitted') + '</th><th>' + T('mdr_th_discharged') + '</th><th>' + T('mdr_th_stay') + '</th><th>' + T('mdr_th_bill') + '</th><th>' + T('mdr_th_payment') + '</th></tr></thead><tbody>';
        discharges.slice().sort(function (a, b) { return new Date(b.dischargeDate) - new Date(a.dischargeDate); }).forEach(function (a) {
            var stay = a.dischargeDate ? APP.daysBetween(a.admissionDate, a.dischargeDate) : '—';
            disHtml += '<tr><td><strong>' + _mdrEsc(a.patientName) + '</strong></td><td>' + _mdrEsc(a.roomNo) + '</td><td>' + APP.formatDate(a.admissionDate) + '</td><td>' + APP.formatDate(a.dischargeDate) + '</td><td>' + stay + '</td><td>' + (a.billAmount ? '₹' + parseFloat(a.billAmount).toLocaleString('en-IN') : '—') + '</td><td><span class="badge ' + (a.paymentStatus === 'paid' ? 'badge-success' : a.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger') + '">' + _mdrEsc(a.paymentStatus || '—') + '</span></td></tr>';
        });
        disHtml += '</tbody></table></div>';
    }

    // Room checklist summary
    var clHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">'
        + _mdrStat(pre.length + ' / ' + preFaults, T('mdr_cl_pre_total') + ' / ' + T('mdr_cl_faults'), 'var(--info)')
        + _mdrStat(post.length + ' / ' + postFaults, T('mdr_cl_post_total') + ' / ' + T('mdr_cl_faults'), 'var(--secondary)')
        + '</div>';
    if (cls.length === 0) {
        clHtml += '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>';
    } else {
        clHtml += '<div class="table-responsive" style="margin-top:10px;"><table><thead><tr><th>' + T('mdr_th_room') + '</th><th>' + T('mdr_cl_type') + '</th><th>' + T('mdr_cl_checked_by') + '</th><th>' + T('mdr_th_date') + '</th><th>' + T('mdr_cl_faults') + '</th></tr></thead><tbody>';
        cls.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).forEach(function (c) {
            var f = clFaults(c);
            clHtml += '<tr><td>' + _mdrEsc(c.roomNo) + '</td><td><span class="badge ' + (c.type === 'pre-admission' ? 'badge-info' : 'badge-warning') + '">' + (c.type === 'pre-admission' ? T('mdr_cl_pre') : T('mdr_cl_post')) + '</span></td><td>' + _mdrEsc(c.checkedBy) + '</td><td>' + APP.formatDate(c.createdAt) + '</td><td>' + (f > 0 ? '<span style="color:var(--danger);font-weight:700;">' + f + '</span>' : '<span style="color:var(--success);">0</span>') + '</td></tr>';
        });
        clHtml += '</tbody></table></div>';
    }

    // Maintenance rooms
    var maintHtml = maintRooms.length === 0
        ? '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>'
        : '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + maintRooms.map(function (o) {
            return '<span class="badge badge-danger" style="padding:6px 10px;">' + _mdrEsc(o.roomNo) + (o.maintenanceReason ? ' — ' + _mdrEsc(o.maintenanceReason) : '') + '</span>';
        }).join('') + '</div>';

    // Problems during period
    var probHtml = problems.length === 0
        ? '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>'
        : '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_th_ticket') + '</th><th>' + T('mdr_th_title') + '</th><th>' + T('mdr_th_category') + '</th><th>' + T('mdr_th_priority') + '</th><th>' + T('mdr_th_status') + '</th></tr></thead><tbody>' + problems.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).map(function (p) {
            return '<tr><td>' + _mdrEsc(p.ticketId || '#') + '</td><td>' + _mdrEsc(p.title) + '</td><td>' + _mdrEsc(p.category || '—') + '</td><td><span class="badge ' + (p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + _mdrEsc(p.priority) + '</span></td><td><span class="badge ' + APP.getStatusBadge(p.status) + '">' + _mdrEsc(p.status) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>';

    html += _mdrCard(T('mdr_occ_discharges'), disHtml)
        + _mdrCard(T('mdr_cl_room_checklists'), clHtml)
        + _mdrCard(T('mdr_ov_maintenance'), maintHtml)
        + _mdrCard(T('mdr_occ_problems'), probHtml);

    el.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   SECURITY INCIDENTS — add/remove by Facility HOD
   ═══════════════════════════════════════════════ */
function _mdrIncidentsTab(el) {
    var user = AUTH.currentUser();
    var canManage = _mdrAccessOk(user);
    var incidents = _mdrSecurityAll().slice().sort(function (a, b) {
        return new Date(b.createdAt || b.incidentDate || 0) - new Date(a.createdAt || a.incidentDate || 0);
    });

    var openCount = incidents.filter(function (i) { return (i.status || 'open') !== 'resolved'; }).length;
    var resolvedCount = incidents.filter(function (i) { return i.status === 'resolved'; }).length;

    var html = '<div class="card" style="margin-bottom:14px;">'
        + '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
        + '<h3 style="margin:0;">🛡 ' + T('mdr_tab_incidents') + '</h3>'
        + (canManage ? '<button class="btn btn-sm btn-primary" onclick="mdRptAddIncident()">+ ' + T('mdr_inc_add') + '</button>' : '')
        + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;padding:14px;">'
        + _mdrStat(incidents.length, T('mdr_ov_security'), 'var(--warning)')
        + _mdrStat(openCount, T('mdr_inc_open'), 'var(--danger)')
        + _mdrStat(resolvedCount, T('mdr_inc_resolved'), 'var(--success)')
        + '</div></div>';

    html += '<div class="card"><div class="card-header"><h3>' + T('mdr_inc_list') + '</h3></div>';
    if (incidents.length === 0) {
        html += '<div class="empty-state" style="padding:40px;text-align:center;color:var(--gray);">' + T('mdr_no_records') + '</div>';
    } else {
        html += '<div class="table-responsive"><table><thead><tr>'
            + '<th>' + T('mdr_th_date') + '</th><th>' + T('mdr_inc_title') + '</th><th>' + T('mdr_th_category') + '</th>'
            + '<th>' + T('mdr_th_location') + '</th><th>' + T('mdr_th_priority') + '</th><th>' + T('mdr_th_status') + '</th>'
            + '<th>' + T('mdr_inc_description') + '</th><th>' + T('mdr_th_solution') + '</th><th>' + T('mdr_th_actions') + '</th></tr></thead><tbody>';
        incidents.forEach(function (i) {
            var sol = i.solution || '';
            var solCell = i.status === 'resolved'
                ? '<span style="color:var(--success);font-size:12px;">' + _mdrEsc(sol) + '</span>'
                : (sol
                    ? '<span style="font-size:12px;">' + _mdrEsc(sol) + '</span>'
                    : '<span style="color:var(--gray);font-size:12px;">' + T('mdr_inc_no_solution') + '</span>');
            html += '<tr>'
                + '<td>' + APP.formatDate(i.incidentDate || i.createdAt) + '</td>'
                + '<td><strong>' + _mdrEsc(i.title) + '</strong></td>'
                + '<td>' + _mdrEsc(i.category || '—') + '</td>'
                + '<td>' + _mdrEsc(i.location || '—') + '</td>'
                + '<td><span class="badge ' + (i.priority === 'high' ? 'badge-danger' : i.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + _mdrEsc(i.priority || 'low') + '</span></td>'
                + '<td><span class="badge ' + APP.getStatusBadge(i.status || 'open') + '">' + _mdrEsc(i.status || 'open') + '</span></td>'
                + '<td style="font-size:12px;max-width:200px;">' + _mdrEsc(i.description || '—') + '</td>'
                + '<td style="max-width:220px;">' + solCell + '</td>'
                + '<td style="white-space:nowrap;">'
                + (canManage ? '<button class="btn btn-sm btn-info" onclick="mdRptSolveIncident(\'' + i.id + '\')">✏️ ' + T('mdr_inc_solution') + '</button> '
                    + '<button class="btn btn-sm btn-danger" onclick="mdRptDeleteIncident(\'' + i.id + '\')">' + T('mdr_inc_delete') + '</button>' : '')
                + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

function mdRptAddIncident() {
    var user = AUTH.currentUser();
    if (!_mdrAccessOk(user)) { APP.notify(T('mdr_access_denied'), 'error'); return; }
    var form = '<form id="incidentForm">'
        + '<div class="grid-2"><div class="form-group"><label>' + T('mdr_inc_title') + ' *</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>' + T('mdr_th_category') + '</label><select name="category" class="form-control"><option value="Theft">Theft</option><option value="Unauthorized Entry">Unauthorized Entry</option><option value="Damage">Damage</option><option value="Fire">Fire</option><option value="Medical Emergency">Medical Emergency</option><option value="Visitor Issue">Visitor Issue</option><option value="Other">Other</option></select></div></div>'
        + '<div class="grid-2"><div class="form-group"><label>' + T('mdr_th_location') + '</label><input type="text" name="location" class="form-control" placeholder="' + T('mdr_inc_loc_ph') + '"></div>'
        + '<div class="form-group"><label>' + T('mdr_th_priority') + '</label><select name="priority" class="form-control"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div></div>'
        + '<div class="form-group"><label>' + T('mdr_inc_date') + '</label><input type="date" name="incidentDate" class="form-control" value="' + new Date().toISOString().split('T')[0] + '"></div>'
        + '<div class="form-group"><label>' + T('mdr_inc_description') + ' *</label><textarea name="description" class="form-control" rows="3" required placeholder="' + T('mdr_inc_desc_ph') + '"></textarea></div>'
        + '</form>';
    openFormModal(T('mdr_inc_add'), form, 'mdRptSaveIncident()', false);
}

function mdRptSaveIncident() {
    var user = AUTH.currentUser();
    if (!_mdrAccessOk(user)) { APP.notify(T('mdr_access_denied'), 'error'); return; }
    var form = document.getElementById('incidentForm');
    if (!form) return;
    var data = getFormData('incidentForm');
    if (!data.title || !data.description) { APP.notify(T('mdr_inc_required'), 'error'); return; }
    DB.add('security_incidents', {
        title: data.title,
        category: data.category,
        location: data.location,
        priority: data.priority,
        status: 'open',
        description: data.description,
        solution: '',
        incidentDate: data.incidentDate || new Date().toISOString().split('T')[0],
        createdBy: user ? user.username : '',
        createdByName: user ? user.fullName : ''
    });
    APP.notify(T('mdr_inc_added'), 'success');
    closeModal();
    _mdrRenderTab();
}

function mdRptSolveIncident(id) {
    var user = AUTH.currentUser();
    if (!_mdrAccessOk(user)) { APP.notify(T('mdr_access_denied'), 'error'); return; }
    var inc = DB.getById('security_incidents', id);
    if (!inc) { APP.notify(T('mdr_inc_not_found'), 'error'); return; }
    var form = '<form id="solveIncidentForm">'
        + '<div style="font-size:13px;color:var(--gray);margin-bottom:12px;">' + T('mdr_inc_for') + ' <strong>' + _mdrEsc(inc.title) + '</strong></div>'
        + '<div class="form-group"><label>' + T('mdr_th_solution') + ' *</label><textarea name="solution" class="form-control" rows="3" required>' + _mdrEsc(inc.solution || '') + '</textarea></div>'
        + '<div class="form-group"><label>' + T('mdr_th_status') + '</label><select name="status" class="form-control"><option value="in_progress" ' + (inc.status === 'in_progress' ? 'selected' : '') + '>In Progress</option><option value="resolved" ' + (inc.status === 'resolved' ? 'selected' : '') + '>Resolved</option></select></div>'
        + '</form>';
    openFormModal(T('mdr_inc_solution'), form, 'mdRptSaveSolution(\'' + id + '\')', false);
}

function mdRptSaveSolution(id) {
    var user = AUTH.currentUser();
    if (!_mdrAccessOk(user)) { APP.notify(T('mdr_access_denied'), 'error'); return; }
    var form = document.getElementById('solveIncidentForm');
    if (!form) return;
    var data = getFormData('solveIncidentForm');
    if (!data.solution) { APP.notify(T('mdr_inc_required'), 'error'); return; }
    DB.update('security_incidents', id, {
        solution: data.solution,
        status: data.status || 'resolved',
        resolvedAt: data.status === 'resolved' ? new Date().toISOString() : (DB.getById('security_incidents', id) || {}).resolvedAt,
        resolvedBy: data.status === 'resolved' ? (user ? user.fullName : '') : (DB.getById('security_incidents', id) || {}).resolvedBy
    });
    APP.notify(T('mdr_inc_updated'), 'success');
    closeModal();
    _mdrRenderTab();
}

function mdRptDeleteIncident(id) {
    var user = AUTH.currentUser();
    if (!_mdrAccessOk(user)) { APP.notify(T('mdr_access_denied'), 'error'); return; }
    var inc = DB.getById('security_incidents', id);
    confirmAction(T('mdr_inc_confirm_del') + (inc && inc.title ? ' "' + inc.title + '"?' : ''), function () {
        DB.delete('security_incidents', id);
        APP.notify(T('mdr_inc_deleted'), 'success');
        _mdrRenderTab();
    });
}

/* ═══════════════════════════════════════════════
   TAB 3 — ALL-IN-ONE DEPARTMENT REPORT
   ═══════════════════════════════════════════════ */
function _mdrDeptTab(el) {
    var user = AUTH.currentUser();
    var team = _mdrTeam();
    var tasks = _mdrDeptTasks();
    var reqs = _mdrMaterialReqs();
    var purchases = _mdrPurchases();
    var qp = _mdrQp();
    var breakdowns = _mdrBreakdowns();
    var reports = _mdrReports();
    var problems = _mdrProblems();

    var doneTasks = tasks.filter(function (t) { return t.status === 'completed'; }).length;
    var pendingTasks = tasks.filter(function (t) { return t.status === 'pending'; }).length;
    var inProgTasks = tasks.filter(function (t) { return t.status === 'in_progress'; }).length;
    var taskRate = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0;
    var overdueTasks = tasks.filter(function (t) { return t.status !== 'completed' && t.deadline && APP.daysBetween(new Date().toISOString(), t.deadline) < 0; }).length;

    var pendingReqs = reqs.filter(function (r) { return r.status === 'pending' || r.status === 'hod_approved'; }).length;
    var fulfilledReqs = reqs.filter(function (r) { return r.status === 'store_fulfilled' || r.status === 'confirmed'; }).length;

    var approvedPurchases = purchases.filter(function (x) { return x.status === 'approved' || x.status === 'pending'; }).length;

    var qpTotal = 0, qpDone = 0;
    qp.forEach(function (q) { (q.items || []).forEach(function (it) { qpTotal++; if (it.status === 'completed') qpDone++; }); });
    var qpRate = qpTotal ? Math.round(qpDone / qpTotal * 100) : 0;

    var resolvedProbs = problems.filter(function (p) { return p.status === 'resolved'; }).length;
    var openProbs = problems.filter(function (p) { return p.status !== 'resolved'; }).length;

    // Employee work table
    var empHtml = '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_emp_name') + '</th><th>' + T('mdr_emp_tasks') + '</th><th>' + T('mdr_emp_completed') + '</th><th>' + T('mdr_emp_rate') + '</th><th>' + T('mdr_emp_reports') + '</th></tr></thead><tbody>';
    if (team.length === 0) {
        empHtml += '<tr><td colspan="5" class="empty-state">' + T('mdr_no_records') + '</td></tr>';
    } else {
        team.forEach(function (m) {
            var mt = tasks.filter(function (t) { return (t.assignedTo === m.fullName) || (t.assignedTo === m.name); });
            var md = mt.filter(function (t) { return t.status === 'completed'; }).length;
            var mr = reports.filter(function (r) { return r.createdBy === m.username || r.createdByName === m.fullName; }).length;
            empHtml += '<tr><td><strong>' + _mdrEsc(m.fullName) + '</strong></td><td>' + mt.length + '</td><td>' + md + '</td><td>' + (mt.length ? Math.round(md / mt.length * 100) : 0) + '%</td><td>' + mr + '</td></tr>';
        });
    }
    empHtml += '</tbody></table></div>';

    // Problems & solutions
    var probHtml = '';
    if (problems.length === 0) {
        probHtml = '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>';
    } else {
        probHtml = '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_th_ticket') + '</th><th>' + T('mdr_th_title') + '</th><th>' + T('mdr_th_status') + '</th><th>' + T('mdr_th_solution') + '</th></tr></thead><tbody>';
        problems.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).forEach(function (p) {
            probHtml += '<tr><td>' + _mdrEsc(p.ticketId || '#') + '</td><td>' + _mdrEsc(p.title) + '</td><td><span class="badge ' + APP.getStatusBadge(p.status) + '">' + _mdrEsc(p.status) + '</span></td><td style="font-size:12px;">' + _mdrEsc(p.solution || '—') + '</td></tr>';
        });
        probHtml += '</tbody></table></div>';
    }

    // Purchases
    var purHtml = purchases.length === 0
        ? '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>'
        : '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_th_title') + '</th><th>' + T('mdr_th_item') + '</th><th>' + T('mdr_th_qty') + '</th><th>' + T('mdr_th_status') + '</th></tr></thead><tbody>' + purchases.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).map(function (x) {
            return '<tr><td>' + _mdrEsc(x.title) + '</td><td>' + _mdrEsc(x.itemName || '—') + '</td><td>' + _mdrEsc(x.quantity || '—') + '</td><td><span class="badge ' + APP.getStatusBadge(x.status) + '">' + _mdrEsc(x.status) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>';

    // Material requests
    var reqHtml = reqs.length === 0
        ? '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>'
        : '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_th_title') + '</th><th>' + T('mdr_th_status') + '</th><th>' + T('mdr_th_date') + '</th></tr></thead><tbody>' + reqs.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).map(function (r) {
            return '<tr><td>' + _mdrEsc(r.title) + '</td><td><span class="badge ' + APP.getStatusBadge(r.status) + '">' + _mdrEsc(r.status) + '</span></td><td>' + APP.formatDate(r.createdAt) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

    // Tasks
    var taskHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;">'
        + _mdrStat(tasks.length, T('mdr_ov_tasks'), 'var(--primary)')
        + _mdrStat(doneTasks + '/' + tasks.length + ' (' + taskRate + '%)', T('mdr_ov_completed'), 'var(--success)')
        + _mdrStat(pendingTasks + inProgTasks, T('mdr_ov_pending'), 'var(--warning)')
        + _mdrStat(overdueTasks, T('mdr_ov_overdue'), 'var(--danger)')
        + '</div>';

    // Q Priorities
    var qpHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;">'
        + _mdrStat(qpTotal, T('mdr_ov_qp_total'), 'var(--primary)')
        + _mdrStat(qpDone + '/' + qpTotal + ' (' + qpRate + '%)', T('mdr_ov_completed'), 'var(--success)')
        + '</div>';

    // Breakdowns
    var brkHtml = breakdowns.length === 0
        ? '<div class="empty-state" style="padding:16px;text-align:center;color:var(--gray);font-size:13px;">' + T('mdr_no_records') + '</div>'
        : '<div class="table-responsive"><table><thead><tr><th>' + T('mdr_th_asset') + '</th><th>' + T('mdr_th_asset_name') + '</th><th>' + T('mdr_th_reason') + '</th><th>' + T('mdr_th_date') + '</th></tr></thead><tbody>' + breakdowns.slice().sort(function (a, b) { return new Date(b.backdownDate || b.createdAt) - new Date(a.backdownDate || a.createdAt); }).map(function (b) {
            return '<tr><td>' + _mdrEsc(b.assetCode || '—') + '</td><td>' + _mdrEsc(b.assetName || '—') + '</td><td>' + _mdrEsc(b.reason || '—') + '</td><td>' + APP.formatDate(b.backdownDate || b.createdAt) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

    // Employee reports summary card row
    var html = _mdrCard(T('mdr_dept_employee_work') + ' — ' + (user ? user.department : ''), empHtml)
        + _mdrCard(T('mdr_ov_problems') + ' & ' + T('mdr_th_solution') + ' (' + openProbs + ' ' + T('mdr_ov_open') + ' · ' + resolvedProbs + ' ' + T('mdr_ov_resolved') + ')', probHtml)
        + _mdrCard(T('mdr_ov_purchases') + ' (' + approvedPurchases + ' ' + T('mdr_ov_pending') + ')', purHtml)
        + _mdrCard(T('mdr_ov_material_reqs') + ' (' + pendingReqs + ' ' + T('mdr_ov_pending') + ' · ' + fulfilledReqs + ' ' + T('mdr_ov_fulfilled') + ')', reqHtml)
        + _mdrCard(T('mdr_ov_tasks'), taskHtml)
        + _mdrCard(T('mdr_ov_qpriorities'), qpHtml)
        + _mdrCard(T('mdr_ov_breakdowns'), brkHtml);

    el.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   TAB 4 — WHATSAPP SUMMARY
   ═══════════════════════════════════════════════ */
function _mdrBuildWhatsApp() {
    var u = AUTH.currentUser();
    var occ = _mdrOccupancy();
    var problems = _mdrProblems();
    var trips = _mdrTrips();
    var receipts = _mdrReceipts();
    var security = _mdrSecurity();
    var complaints = _mdrComplaints();
    var discharges = _mdrDischarges();
    var privileged = _mdrAdmissions().filter(function (a) { return a.privileged === 'yes'; }).length;
    var openProbs = problems.filter(function (p) { return p.status !== 'resolved'; }).length;
    var resolvedProbs = problems.filter(function (p) { return p.status === 'resolved'; }).length;
    var totalKm = trips.reduce(function (s, t) { return s + (parseFloat(t.kilometers) || 0); }, 0);
    var hs = (typeof getHospitalSettings === 'function') ? getHospitalSettings() : {};

    return '🏥 *' + (hs.name || 'Stavya Intelligence') + ' — MD Report*\n'
        + '📅 ' + _mdrPeriodLabel() + ' | ' + APP.formatDate(new Date()) + '\n'
        + '━━━━━━━━━━━━━━━\n'
        + '🛏 ' + T('mdr_ov_occupancy') + ': ' + occ.pct + '%\n'
        + '🚪 ' + T('mdr_ov_discharges') + ': ' + discharges.length + '\n'
        + '🔧 ' + T('mdr_ov_problems') + ': ' + problems.length + ' (' + openProbs + ' ' + T('mdr_ov_open') + ', ' + resolvedProbs + ' ' + T('mdr_ov_resolved') + ')\n'
        + '🚑 ' + T('mdr_ov_trips') + ': ' + trips.length + ' (' + totalKm.toFixed(1) + ' km)\n'
        + '📦 ' + T('mdr_ov_purchases') + ': ' + receipts.length + '\n'
        + '🛡 ' + T('mdr_ov_security') + ': ' + security.length + '\n'
        + '📝 ' + T('mdr_ov_indoor') + ': ' + complaints.length + '\n'
        + '⭐ ' + T('mdr_ov_privileged') + ': ' + privileged + '\n'
        + '━━━━━━━━━━━━━━━\n'
        + '👤 ' + (u ? u.fullName : '') + (u && u.department ? ' — ' + u.department : '');
}

function _mdrWhatsAppTab(el) {
    var text = _mdrBuildWhatsApp();
    el.innerHTML =
        '<div class="card" style="margin-bottom:14px;">'
        + '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
        + '<h3 style="margin:0;">📲 ' + T('mdr_btn_whatsapp') + '</h3>'
        + '<div style="display:flex;gap:8px;">'
        + '<button class="btn btn-sm btn-success" onclick="mdRptShareWhatsApp()">' + T('mdr_btn_send_now') + '</button>'
        + '<button class="btn btn-sm btn-primary" onclick="mdRptShareEmail()">✉️ ' + T('mdr_btn_email') + '</button>'
        + '</div></div>'
        + '<div style="padding:14px;font-size:12px;color:var(--gray);">' + T('mdr_whatsapp_hint') + '</div>'
        + '</div>'
        + '<div class="card"><div class="card-header"><h3>' + T('mdr_whatsapp_preview') + '</h3></div>'
        + '<div style="padding:14px;"><pre style="background:#f7f8fa;border:1px solid var(--light-gray);border-radius:8px;padding:14px;font-family:inherit;font-size:13px;white-space:pre-wrap;line-height:1.7;margin:0;">' + _mdrEsc(text) + '</pre></div></div>';
}

function mdRptShareWhatsApp() {
    var text = _mdrBuildWhatsApp();
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
}

function mdRptShareEmail() {
    var text = _mdrBuildWhatsApp();
    window.location.href = 'mailto:?subject=' + encodeURIComponent(T('mdr_title') + ' — ' + _mdrPeriodLabel()) + '&body=' + encodeURIComponent(text);
}

/* ═══════════════════════════════════════════════
   SEND TO MD (saves into reports store, sentTo=MD)
   ═══════════════════════════════════════════════ */
function mdRptSendToMD() {
    var u = AUTH.currentUser();
    var text = _mdrBuildWhatsApp();
    DB.add('reports', {
        title: T('mdr_title') + ' (' + _mdrPeriodLabel() + ')',
        category: _mdrState.period,
        sentTo: 'MD',
        description: text,
        createdBy: u ? u.username : '',
        createdByName: u ? u.fullName : '',
        department: u ? u.department : '',
        status: 'sent',
        createdAt: new Date().toISOString()
    });
    APP.notify(T('mdr_msg_sent'), 'success');
    _mdrRenderTab();
}
