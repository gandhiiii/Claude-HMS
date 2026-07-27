/* Department Meetings — Admin/HOD create; team members view agenda */
var K_MEETINGS = 'departmentMeetings';

function renderDeptMeetings(el) {
    var user = AUTH.currentUser();
    if (!user) return;
    var meetings = DB.get(K_MEETINGS) || [];
    var canManage = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    var dept = user.department || '';

    // Admin sees all; HOD/employee see own department
    var filtered = user.role === 'admin' || user.isSuperAdmin ? meetings
        : meetings.filter(function(m) { return m.department === dept; });

    var today = new Date().toISOString().slice(0, 10);
    var upcoming = filtered.filter(function(m) { return m.date >= today && m.status === 'scheduled'; });
    var past = filtered.filter(function(m) { return m.date < today || m.status !== 'scheduled'; });
    upcoming.sort(function(a,b) { return a.date.localeCompare(b.date) || a.time.localeCompare(b.time); });
    past.sort(function(a,b) { return b.date.localeCompare(a.date) || b.time.localeCompare(a.time); });

    el.innerHTML = ''
        + '<div style="margin-bottom:16px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'
        + '<div><div style="font-weight:700;font-size:18px;">' + T('dmtg_title') + '</div>'
        + '<div style="font-size:12px;color:var(--gray);">' + filtered.length + ' meeting(s)' + (dept && user.role !== 'admin' ? ' · ' + dept : '') + '</div></div>'
        + (canManage ? '<button class="btn btn-primary" onclick="dmtgShowForm()">' + T('dmtg_new_meeting') + '</button>' : '')
        + '</div></div>';

    if (filtered.length === 0) {
        el.innerHTML += '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;font-size:13px;color:var(--gray);">' + T('dmtg_no_meetings') + '</div>';
        return;
    }

    if (upcoming.length > 0) {
        el.innerHTML += '<div style="font-weight:600;font-size:14px;color:var(--primary);margin-bottom:8px;">' + T('dmtg_upcoming') + ' (' + upcoming.length + ')</div>';
        upcoming.forEach(function(m) { el.innerHTML += dmtgCard(m, user, canManage); });
    }
    if (past.length > 0) {
        el.innerHTML += '<div style="font-weight:600;font-size:14px;color:var(--gray);margin:16px 0 8px;">' + T('dmtg_past') + ' (' + past.length + ')</div>';
        past.forEach(function(m) { el.innerHTML += dmtgCard(m, user, canManage); });
    }
}

function dmtgCard(m, user, canManage) {
    var today = new Date().toISOString().slice(0, 10);
    var isToday = m.date === today;
    var agendaCount = (m.agenda || []).length;
    var statusBadge = m.status === 'completed' ? 'badge-success'
        : m.status === 'cancelled' ? 'badge-danger' : 'badge-info';

    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;flex-wrap:wrap;gap:6px;" onclick="dmtgToggle(this)">'
        + '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:160px;">'
        + '<div style="width:40px;height:40px;border-radius:8px;background:' + (isToday ? 'var(--primary)' : 'var(--light-gray)') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;color:' + (isToday ? '#fff' : 'var(--text)') + ';font-size:11px;font-weight:700;line-height:1.2;">'
        + (isToday ? '<span>' + T('dmtg_today') + '</span>' : '<span>' + new Date(m.date).getDate() + '</span><span style="font-size:9px;opacity:.7;">' + new Date(m.date).toLocaleString('en',{month:'short'}) + '</span>')
        + '</div>'
        + '<div><div style="font-size:14px;font-weight:700;">' + (m.title || '') + '</div>'
        + '<div style="font-size:12px;color:var(--gray);">🕐 ' + (m.time || '--:--') + (m.location ? ' · 📍 ' + m.location : '') + '</div></div></div>'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<span class="badge ' + statusBadge + '" style="font-size:10px;">' + (m.status || 'scheduled') + '</span>'
        + (agendaCount > 0 ? '<span class="badge badge-primary" style="font-size:10px;">📋 ' + agendaCount + '</span>' : '')
        + '<span style="font-size:18px;color:var(--gray);transition:.2s;">▶</span>'
        + '</div></div>'
        + '<div class="dmtg-detail" style="display:none;border-top:1px solid var(--border);padding:12px 16px;">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:10px;">'
        + '<div><span style="color:var(--gray);">' + T('dmtg_date') + ':</span> ' + APP.formatDate(m.date) + (isToday ? ' <span style="color:var(--primary);font-weight:600;">(' + T('dmtg_today') + ')</span>' : '') + '</div>'
        + '<div><span style="color:var(--gray);">' + T('dmtg_time') + ':</span> ' + (m.time || '--:--') + '</div>'
        + '<div><span style="color:var(--gray);">' + T('dmtg_location') + ':</span> ' + (m.location || '—') + '</div>'
        + '<div><span style="color:var(--gray);">' + T('dmtg_created_by') + ':</span> ' + (m.createdByName || '—') + '</div>'
        + '</div>'
        // Agenda section
        + '<div style="font-weight:600;font-size:13px;margin-bottom:6px;">' + T('dmtg_agenda') + '</div>'
        + '<div id="dmtgAgenda_' + m.id + '">';
    var agHtml = '';
    var agenda = m.agenda || [];
    if (agenda.length === 0) {
        agHtml += '<div style="font-size:12px;color:var(--gray);padding:4px 0;">' + T('dmtg_no_agenda') + '</div>';
    } else {
        agenda.forEach(function(a, i) {
            agHtml += '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid var(--light-gray);font-size:13px;">'
                + '<span style="color:var(--primary);font-weight:700;">' + (i+1) + '.</span>'
                + '<div style="flex:1;"><div>' + a.item + '</div>'
                + '<div style="font-size:11px;color:var(--gray);">' + T('dmtg_created_by') + ': ' + (a.addedByName || '—') + ' · ' + APP.formatDate(a.addedAt) + '</div></div>'
                + (canManage ? '<button class="btn btn-sm btn-danger" style="font-size:11px;padding:2px 6px;" onclick="event.stopPropagation();dmtgRemoveAgenda(\'' + m.id + '\',\'' + a.id + '\')">✕</button>' : '')
                + '</div>';
        });
    }
    agHtml += '</div>'
        + (canManage ? '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">'
            + '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();dmtgAddAgenda(\'' + m.id + '\')">' + T('dmtg_add_agenda') + '</button>'
            + (m.status === 'scheduled' ? '<button class="btn btn-sm btn-success" onclick="event.stopPropagation();dmtgSetStatus(\'' + m.id + '\',\'completed\')">' + T('dmtg_status_completed') + '</button>' : '')
            + '<button class="btn btn-sm btn-warning" onclick="event.stopPropagation();dmtgSetStatus(\'' + m.id + '\',\'cancelled\')">' + T('dmtg_status_cancelled') + '</button>'
            + '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();dmtgDelete(\'' + m.id + '\')">' + T('dmtg_confirm_delete') + '</button>'
            + '</div>' : '')
        + '</div></div>';
}

function dmtgToggle(header) {
    var detail = header.nextElementSibling;
    var arrow = header.querySelector('span:last-child');
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(90deg)';
    } else {
        detail.style.display = 'none';
        if (arrow) arrow.style.transform = '';
    }
}

/* ── Create / Edit form ── */
function dmtgShowForm(existing) {
    var user = AUTH.currentUser();
    var canManage = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    if (!canManage) { APP.notify('Only Admin and HOD can manage meetings', 'error'); return; }

    var depts = DB.get('departments') || [];
    var isEdit = !!existing;
    var m = existing || {};

    var html = '<form id="dmtgForm" style="display:grid;gap:12px;">'
        + '<div><label style="font-size:12px;font-weight:600;">' + T('dmtg_meeting_title') + ' *</label>'
        + '<input type="text" name="title" class="form-control" value="' + (m.title || '') + '" required></div>'
        + (user.role === 'admin' || user.isSuperAdmin
            ? '<div><label style="font-size:12px;font-weight:600;">' + T('dmtg_department') + ' *</label>'
                + '<select name="department" class="form-control">'
                + depts.map(function(d) {
                    var val = d.name || d;
                    return '<option value="' + val + '" ' + ((m.department || user.department) === val ? 'selected' : '') + '>' + val + '</option>';
                }).join('')
                + '</select></div>'
            : '<input type="hidden" name="department" value="' + (m.department || user.department || '') + '">')
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
        + '<div><label style="font-size:12px;font-weight:600;">' + T('dmtg_date') + ' *</label>'
        + '<input type="date" name="date" class="form-control" value="' + (m.date || new Date().toISOString().slice(0,10)) + '" required></div>'
        + '<div><label style="font-size:12px;font-weight:600;">' + T('dmtg_time') + ' *</label>'
        + '<input type="time" name="time" class="form-control" value="' + (m.time || '10:00') + '" required></div>'
        + '</div>'
        + '<div><label style="font-size:12px;font-weight:600;">' + T('dmtg_location') + '</label>'
        + '<input type="text" name="location" class="form-control" value="' + (m.location || '') + '" placeholder="e.g. Conference Room"></div>'
        + '</form>';

    openFormModal(isEdit ? T('dmtg_edit_meeting') : T('dmtg_new_meeting'), html, 'dmtgSave()', true);
}

function dmtgSave() {
    var user = AUTH.currentUser();
    var canManage = user.role === 'admin' || user.isSuperAdmin || user.role === 'hod';
    if (!canManage) return;

    var form = document.getElementById('dmtgForm');
    if (!form) return;
    var title = form.querySelector('[name="title"]')?.value?.trim();
    var department = form.querySelector('[name="department"]')?.value?.trim();
    var date = form.querySelector('[name="date"]')?.value;
    var time = form.querySelector('[name="time"]')?.value;
    var location = form.querySelector('[name="location"]')?.value?.trim();

    if (!title || !department || !date || !time) {
        APP.notify('Title, department, date and time are required', 'error');
        return;
    }

    var meetings = DB.get(K_MEETINGS) || [];
    var existing = null;
    var existingIdx = -1;
    // Check if editing: look for a form with data-id
    if (form.dataset.id) {
        existingIdx = meetings.findIndex(function(m) { return m.id === form.dataset.id; });
        if (existingIdx >= 0) existing = meetings[existingIdx];
    }

    if (existing) {
        existing.title = title;
        existing.department = department;
        existing.date = date;
        existing.time = time;
        existing.location = location || '';
        meetings[existingIdx] = existing;
    } else {
        meetings.push({
            id: 'dmtg_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
            department: department,
            title: title,
            date: date,
            time: time,
            location: location || '',
            status: 'scheduled',
            createdBy: user.id,
            createdByName: user.fullName || user.username,
            createdAt: new Date().toISOString(),
            agenda: []
        });
    }
    DB.set(K_MEETINGS, meetings);
    APP.notify(T('dmtg_saved'), 'success');
    closeModal();
    var content = document.getElementById('pageContent');
    if (content) renderDeptMeetings(content);
}

/* ── Agenda management ── */
function dmtgAddAgenda(meetingId) {
    var item = prompt(T('dmtg_enter_agenda'));
    if (!item || !item.trim()) return;
    var user = AUTH.currentUser();
    var meetings = DB.get(K_MEETINGS) || [];
    var m = meetings.find(function(x) { return x.id === meetingId; });
    if (!m) { APP.notify('Meeting not found', 'error'); return; }
    if (!m.agenda) m.agenda = [];
    m.agenda.push({
        id: 'dag_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
        item: item.trim(),
        addedBy: user.id,
        addedByName: user.fullName || user.username,
        addedAt: new Date().toISOString()
    });
    DB.set(K_MEETINGS, meetings);
    APP.notify(T('dmtg_saved'), 'success');
    var content = document.getElementById('pageContent');
    if (content) renderDeptMeetings(content);
}

function dmtgRemoveAgenda(meetingId, agendaId) {
    var meetings = DB.get(K_MEETINGS) || [];
    var m = meetings.find(function(x) { return x.id === meetingId; });
    if (!m) return;
    m.agenda = (m.agenda || []).filter(function(a) { return a.id !== agendaId; });
    DB.set(K_MEETINGS, meetings);
    var content = document.getElementById('pageContent');
    if (content) renderDeptMeetings(content);
}

/* ── Status / Delete ── */
function dmtgSetStatus(meetingId, status) {
    var meetings = DB.get(K_MEETINGS) || [];
    var m = meetings.find(function(x) { return x.id === meetingId; });
    if (!m) return;
    m.status = status;
    DB.set(K_MEETINGS, meetings);
    APP.notify(status === 'completed' ? T('dmtg_completed') : T('dmtg_cancelled'), 'success');
    var content = document.getElementById('pageContent');
    if (content) renderDeptMeetings(content);
}

function dmtgDelete(meetingId) {
    confirmAction(T('dmtg_confirm_delete'), function() {
        var meetings = DB.get(K_MEETINGS) || [];
        DB.set(K_MEETINGS, meetings.filter(function(m) { return m.id !== meetingId; }));
        APP.notify(T('dmtg_deleted'), 'success');
        var content = document.getElementById('pageContent');
        if (content) renderDeptMeetings(content);
    });
}
