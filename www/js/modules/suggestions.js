function renderSuggestions(container) {
    var user = AUTH.currentUser();
    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box">'
        + '<input type="text" class="form-control" id="sugSearch" placeholder="' + T('sgmod_search_placeholder') + '" oninput="renderSugList()">'
        + '</div>'
        + '<div style="display:flex;gap:6px;align-items:center;">'
        + '<span id="sugCount" style="font-size:13px;color:var(--gray);">0 ' + T('sgmod_suggestions_label') + '</span>'
        + '<button class="btn btn-primary" onclick="showSugForm()">' + T('sgmod_new_btn') + '</button>'
        + '</div></div>'
        + '<div id="sugView"></div>';
    renderSugList();
}

function renderSugList() {
    try {
        var user = AUTH.currentUser();
        var all = DB.get('suggestions') || [];
        var search = (document.getElementById('sugSearch')?.value || '').toLowerCase();

        var list = [];
        for (var i = 0; i < all.length; i++) {
            var s = all[i];
            if (!s) continue;
            var isAdmin = user.isSuperAdmin || user.role === 'admin';
            if (!isAdmin) {
                if (user.role === 'hod') {
                    if (s.department !== user.department && s.createdBy !== user.username) continue;
                } else {
                    if (s.createdBy !== user.username) continue;
                }
            }
            if (search && (s.title || '').toLowerCase().indexOf(search) < 0 && (s.description || '').toLowerCase().indexOf(search) < 0) continue;
            list.push(s);
        }

        document.getElementById('sugCount').textContent = all.length + ' ' + T('sgmod_suggestions_label');

        if (list.length === 0) {
            document.getElementById('sugView').innerHTML = '<div class="card"><div class="empty-state">' + T('sgmod_no_results') + '</div></div>';
            return;
        }

        var html = '<div class="card"><div class="table-responsive"><table><thead><tr>'
            + '<th>' + T('sgmod_th_title') + '</th><th>' + T('sgmod_th_description') + '</th><th>' + T('sgmod_th_department') + '</th><th>' + T('sgmod_th_date') + '</th><th>' + T('sgmod_th_actions') + '</th>'
            + '</tr></thead><tbody>';

        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var isOwner = s.createdBy === user.username;
            html += '<tr>'
                + '<td><strong>' + (s.title || '') + '</strong></td>'
                + '<td style="font-size:13px;max-width:300px;word-break:break-word;">' + (s.description || '').replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</td>'
                + '<td>' + (s.department || '-') + '</td>'
                + '<td>' + APP.formatDate(s.createdAt) + '</td>'
                + '<td>'
                + (isOwner ? '<button class="btn btn-sm btn-danger" onclick="deleteSug(\'' + s.id + '\')">' + T('sgmod_del_btn') + '</button>' : '')
                + '</td></tr>';
        }

        html += '</tbody></table></div></div>';
        document.getElementById('sugView').innerHTML = html;
    } catch (e) {
        console.warn('renderSugList error:', e);
    }
}

function showSugForm() {
    var user = AUTH.currentUser();
    var isAdmin = !user || user.isSuperAdmin || user.role === 'admin';
    var depts = DB.get('departments') || [];
    var deptField;
    if (isAdmin) {
        var deptOpts = '';
        for (var i = 0; i < depts.length; i++) {
            var d = depts[i];
            if (!d || d.active === false) continue;
            deptOpts += '<option value="' + d.name.replace(/"/g,'&quot;') + '">' + d.name + '</option>';
        }
        deptField = '<select name="department" class="form-control">' + deptOpts + '</select>';
    } else {
        deptField = '<input type="text" name="department" class="form-control" value="' + (user.department || '').replace(/"/g,'&quot;') + '" readonly style="background:var(--light-gray);">';
    }

    var html = '<form id="sugForm">'
        + '<div class="form-group"><label>' + T('sgmod_form_title_label') + '</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>' + T('sgmod_th_department') + '</label>' + deptField + '</div>'
        + '<div class="form-group"><label>' + T('sgmod_form_description_label') + '</label><textarea name="description" class="form-control" rows="4" required></textarea></div>'
        + '</form>';

    openFormModal(T('sgmod_modal_new_title'), html, 'saveSug()');
    document.getElementById('sugForm').addEventListener('submit', function(e) { e.preventDefault(); saveSug(); });
}

function saveSug() {
    var form = document.getElementById('sugForm');
    if (!form) return false;
    var title = (form.querySelector('[name="title"]')?.value || '').trim();
    var description = (form.querySelector('[name="description"]')?.value || '').trim();
    var department = form.querySelector('[name="department"]')?.value || '';

    if (!title || !description) { APP.notify(T('sgmod_fill_required'), 'error'); return false; }

    var user = AUTH.currentUser();
    DB.add('suggestions', {
        title: title,
        description: description,
        department: department || user.department || '',
        createdBy: user.username,
        createdByName: user.fullName
    });
    APP.notify(T('sgmod_submitted'), 'success');
    renderSugList();
    return true;
}

function deleteSug(id) {
    confirmAction(T('sgmod_confirm_delete'), function() {
        DB.delete('suggestions', id);
        renderSugList();
    });
}
