var _usersView = 'list'; // 'list' | 'teams'

function renderUsers(container) {
    var users = DB.get('users');
    var cu = AUTH.currentUser();
    var isAdmin = cu && (cu.isSuperAdmin || cu.role === 'admin');

    container.innerHTML = `
        <div class="flex-between mb-4" style="flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:4px;background:var(--light-gray);border-radius:10px;padding:4px;">
                <button id="viewListBtn" class="btn btn-sm ${_usersView==='list'?'btn-primary':'btn-outline'}" style="border-radius:7px;font-weight:600;" onclick="usersSetView('list')">👤 All Users</button>
                <button id="viewTeamsBtn" class="btn btn-sm ${_usersView==='teams'?'btn-primary':'btn-outline'}" style="border-radius:7px;font-weight:600;" onclick="usersSetView('teams')">👥 Manage Teams</button>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <div class="search-box" id="userSearchBox" style="${_usersView==='teams'?'display:none':''}">
                    <input type="text" class="form-control" id="userSearch" placeholder="Search users..." oninput="renderUsersList()">
                </div>
                <span id="userCount" style="font-size:13px;color:var(--gray);">${users.length} users</span>
                <button class="btn btn-primary" onclick="showUserForm()">+ Add User</button>
                ${isAdmin ? '<button class="btn btn-danger" onclick="removeAllEmployees()">🗑️ Remove All</button>' : ''}
            </div>
        </div>
        <div id="usersMainContent"></div>
    `;
    _renderUsersContent();
}

function usersSetView(view) {
    _usersView = view;
    var listBtn  = document.getElementById('viewListBtn');
    var teamsBtn = document.getElementById('viewTeamsBtn');
    var searchBox = document.getElementById('userSearchBox');
    if (listBtn)  { listBtn.className  = 'btn btn-sm ' + (view==='list'  ? 'btn-primary' : 'btn-outline'); listBtn.style.borderRadius='6px'; }
    if (teamsBtn) { teamsBtn.className = 'btn btn-sm ' + (view==='teams' ? 'btn-primary' : 'btn-outline'); teamsBtn.style.borderRadius='6px'; }
    if (searchBox) searchBox.style.display = view==='teams' ? 'none' : '';
    _renderUsersContent();
}

function _renderUsersContent() {
    var el = document.getElementById('usersMainContent');
    if (!el) return;
    if (_usersView === 'teams') {
        _renderTeamsView(el);
    } else {
        el.innerHTML = `<div class="card"><div class="table-responsive"><table>
            <thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Phone</th>
            <th>Role</th><th>Department</th><th>Permissions</th><th>Actions</th></tr></thead>
            <tbody id="usersTableBody"></tbody></table></div></div>`;
        renderUsersList();
    }
}

function _renderTeamsView(el) {
    var users = DB.get('users') || [];
    var depts = DB.get('departments') || [];

    // Group all users by department
    var groups = {};
    users.forEach(function(u) {
        var d = u.department || '(No Department)';
        if (!groups[d]) groups[d] = [];
        groups[d].push(u);
    });

    // Also include empty departments from dept list
    depts.forEach(function(d) {
        if (!groups[d.name]) groups[d.name] = [];
    });

    var deptKeys = Object.keys(groups).sort();
    if (deptKeys.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray);">No departments or users yet.</div>';
        return;
    }

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;">';
    deptKeys.forEach(function(dept) {
        var members = groups[dept];
        var hodList   = members.filter(function(u){ return u.role==='hod'; });
        var empList   = members.filter(function(u){ return u.role==='employee'||u.role==='storekeeper'||u.role==='ambulance_employee'; });
        var adminList = members.filter(function(u){ return u.role==='admin'||u.role==='super_admin'; });

        html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">'
            // Dept header
            + '<div style="background:linear-gradient(135deg,#3949ab,#1a237e);color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">'
            + '<div><div style="font-size:15px;font-weight:700;">🏢 ' + dept + '</div>'
            + '<div style="font-size:11px;opacity:.8;">' + members.length + ' member' + (members.length!==1?'s':'') + '</div></div>'
            + '<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3);font-size:12px;" onclick="adminAddToTeam(\'' + dept.replace(/'/g,"\\'") + '\')">+ Add</button></div>'
            + '<div style="padding:12px;">';

        if (members.length === 0) {
            html += '<div style="font-size:12px;color:var(--gray);text-align:center;padding:10px 0;">No members yet</div>';
        } else {
            // HOD(s)
            hodList.forEach(function(u) {
                html += _teamMemberRow(u, '👔', '#f3e5f5', '#6a1b9a');
            });
            adminList.forEach(function(u) {
                html += _teamMemberRow(u, '🔑', '#e3f2fd', '#1565c0');
            });
            empList.forEach(function(u) {
                html += _teamMemberRow(u, '👤', 'var(--light-gray)', 'var(--text)');
            });
        }

        html += '</div></div>';
    });

    html += '</div>';
    el.innerHTML = html;
}

function _teamMemberRow(u, icon, bg, color) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:' + bg + ';margin-bottom:5px;">'
        + '<span style="font-size:16px;">' + icon + '</span>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:600;color:' + color + ';">' + (u.fullName||u.username) + '</div>'
        + '<div style="font-size:10px;color:var(--gray);">@' + u.username + ' · ' + (u.role||'employee').replace(/_/g,' ').toUpperCase() + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:4px;">'
        + '<button class="btn btn-sm btn-outline" style="font-size:10px;padding:2px 7px;" onclick="editUser(\'' + u.id + '\')">Edit</button>'
        + (!u.isSuperAdmin ? '<button class="btn btn-sm btn-danger" style="font-size:10px;padding:2px 7px;" onclick="deleteUser(\'' + u.id + '\')">Del</button>' : '')
        + '</div></div>';
}

function adminAddToTeam(dept) {
    // Pre-fill showUserForm with the dept locked
    var depts = DB.get('departments') || [];
    var roles = ['employee', 'hod', 'storekeeper', 'ambulance_employee'];
    var deptField = '<input type="hidden" name="department" value="' + dept + '">'
        + '<div style="background:#e3f2fd;border-radius:6px;padding:8px 12px;font-size:12px;color:#1565c0;margin-top:4px;">'
        + '🏢 Adding to: <strong>' + dept + '</strong></div>';

    var form = '<form id="userForm">'
        + '<input type="hidden" name="id" value="">'
        + '<div class="grid-2">'
        + '<div class="form-group"><label>Username *</label><input type="text" name="username" class="form-control" required></div>'
        + '<div class="form-group"><label>Password *</label><input type="text" name="password" class="form-control" required></div>'
        + '<div class="form-group"><label>Full Name *</label><input type="text" name="fullName" class="form-control" required></div>'
        + '<div class="form-group"><label>Email <span style="font-size:11px;color:var(--gray);">(optional)</span></label><input type="email" name="email" class="form-control" placeholder="staff@hospital.com"></div>'
        + '<div class="form-group"><label>Phone <span style="font-size:11px;color:var(--gray);">(optional)</span></label><input type="text" name="phone" class="form-control" placeholder="Mobile number"></div>'
        + '<div class="form-group"><label>Role *</label><select name="role" class="form-control" onchange="onRoleChange(this)">'
        + roles.map(function(r){ return '<option value="'+r+'">'+ r.replace(/_/g,' ').toUpperCase() +'</option>'; }).join('')
        + '</select></div>'
        + '</div>'
        + deptField
        + '<div class="form-group" style="margin-top:10px;"><label>Permissions</label>'
        + '<div class="permission-grid" id="permissionsGrid">' + renderPermissionCheckboxes([], []) + '</div></div>'
        + '</form>';
    openFormModal('Add Member to ' + dept, form, 'saveUser()', true);
}

function renderUsersList() {
    try {
        var users = DB.get('users') || [];

        var searchInput = document.getElementById('userSearch');
        var search = '';
        if (searchInput) search = searchInput.value.toLowerCase();

        var rows = '';
        var sanitized = [];  // all non-null valid objects (for DB cleanup only)
        var displayed = 0;   // count of search-matching rows shown

        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            if (!u || typeof u !== 'object') continue;

            var fullName = typeof u.fullName === 'string' ? u.fullName : '';
            var username = typeof u.username === 'string' ? u.username : '';
            var email = typeof u.email === 'string' ? u.email : '';
            var role = typeof u.role === 'string' ? u.role : 'employee';
            var department = typeof u.department === 'string' ? u.department : '';
            var phone = typeof u.phone === 'string' ? u.phone : '';
            var uid = typeof u.id === 'string' ? u.id : '';
            var isSuperAdmin = !!u.isSuperAdmin;
            var permissions = Array.isArray(u.permissions) ? u.permissions : [];

            sanitized.push(u);  // collect ALL valid objects regardless of search

            var match = fullName.toLowerCase().includes(search) ||
                username.toLowerCase().includes(search) ||
                email.toLowerCase().includes(search) ||
                role.includes(search) ||
                department.toLowerCase().includes(search);

            if (!match) continue;
            displayed++;

            var deptFeatures = typeof getDepartmentFeatures === 'function' ? getDepartmentFeatures(department) : [];
            var totalPerms = new Set(deptFeatures.concat(permissions)).size;

            rows += '<tr>'
                + '<td><strong>' + username.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</strong></td>'
                + '<td>' + fullName.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
                + '<td>' + email.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
                + '<td>' + phone.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
                + '<td><span class="badge ' + APP.getRoleBadge(role) + '">' + role.toUpperCase() + '</span></td>'
                + '<td>' + (department || '-') + '</td>'
                + '<td style="font-size:12px;"><span class="badge badge-info">' + totalPerms + ' modules</span>'
                + (deptFeatures.length > 0 ? '<span style="color:var(--gray);display:block;">' + deptFeatures.length + ' from dept</span>' : '')
                + '</td>'
                + '<td><button class="btn btn-sm btn-primary" onclick="editUser(\'' + uid.replace(/'/g,'') + '\')">Edit</button> '
                + '<button class="btn btn-sm btn-danger" onclick="deleteUser(\'' + uid.replace(/'/g,'') + '\')"' + (isSuperAdmin ? ' disabled' : '') + '>Del</button></td>'
                + '</tr>';
        }

        // Only sanitize null/corrupt entries — never filter by search when saving
        if (sanitized.length !== users.length) {
            DB.set('users', sanitized);
        }

        var tbody = document.getElementById('usersTableBody');
        if (tbody) tbody.innerHTML = rows || '<tr><td colspan="8" class="empty-state">No users found</td></tr>';

        var countEl = document.getElementById('userCount');
        if (countEl) countEl.textContent = (search ? displayed + ' of ' + sanitized.length : sanitized.length) + ' users';
    } catch (e) {
        console.warn('renderUsersList error:', e.message, e.stack);
        if (typeof APP !== 'undefined' && APP.notify) APP.notify('Error loading users: ' + e.message, 'error');
        var tbody = document.getElementById('usersTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading users</td></tr>';
    }
}

function showUserForm(user) {
    const depts = DB.get('departments').filter(d => d.active !== false);
    const roles = ['admin', 'hod', 'storekeeper', 'employee', 'ambulance_employee'];
    const isEdit = !!user;

    const userDept = user?.department || '';
    const deptFeatures = getDepartmentFeatures(userDept);
    const userPerms = user?.permissions || [];

    // Department field: dropdown if depts exist, text input otherwise
    const deptField = depts.length > 0
        ? `<select name="department" class="form-control" onchange="onDeptChange(this)">
               <option value="">-- Select Department --</option>
               ${depts.map(d => `<option value="${d.name}" ${userDept === d.name ? 'selected' : ''} data-features='${JSON.stringify(d.features || [])}'>${d.name}</option>`).join('')}
           </select>`
        : `<input type="text" name="department" class="form-control" value="${userDept}" placeholder="e.g. Housekeeping">`;

    const form = `
        <form id="userForm">
            <input type="hidden" name="id" value="${user?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" name="username" class="form-control" value="${user?.username || ''}" ${isEdit ? 'readonly' : ''} required>
                </div>
                <div class="form-group">
                    <label>${isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                    <input type="text" name="password" class="form-control" value="" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Leave blank to keep current' : ''}">
                </div>
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="fullName" class="form-control" value="${user?.fullName || ''}" required>
                </div>
                <div class="form-group">
                    <label>Email <span style="color:var(--gray);font-size:11px;">(optional)</span></label>
                    <input type="email" name="email" class="form-control" value="${user?.email || ''}" placeholder="staff@hospital.com">
                </div>
                <div class="form-group">
                    <label>Phone <span style="color:var(--gray);font-size:11px;">(optional)</span></label>
                    <input type="text" name="phone" class="form-control" value="${user?.phone || ''}" placeholder="Mobile number">
                </div>
                <div class="form-group">
                    <label>Role *</label>
                    <select name="role" class="form-control" required onchange="onRoleChange(this)">
                        ${roles.map(r => `<option value="${r}" ${user?.role === r ? 'selected' : ''}>${r.replace('_',' ').toUpperCase()}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    ${deptField}
                </div>
            </div>
            <div class="form-group">
                <label>Permissions</label>
                <div style="font-size:12px;color:var(--gray);margin-bottom:8px;">
                    <span class="badge badge-info">Inherited from department</span> = auto-granted based on department feature rights.
                    <span class="badge badge-success">Extra user rights</span> = manually assigned.
                </div>
                <div class="permission-grid" id="permissionsGrid">
                    ${renderPermissionCheckboxes(deptFeatures, userPerms)}
                </div>
            </div>
        </form>
    `;

    openFormModal(isEdit ? 'Edit User' : 'Add New User', form, `saveUser()`, true);
}

function renderPermissionCheckboxes(deptFeatures, userPerms) {
    const allFeatures = [
        'dashboard', 'users', 'departments', 'inventory', 'gate-security',
        'projects', 'ambulance', 'problems', 'tasks', 'complaints',
        'room-checklist', 'admissions', 'lost-found', 'checklists', 'admin-checklists'
    ];

    const inheritedSet = new Set(deptFeatures || []);
    const userSet = new Set(userPerms || []);

    return allFeatures.map(f => {
        const fromDept = inheritedSet.has(f);
        const checkedByUser = userSet.has(f);
        const checked = fromDept || checkedByUser;
        return `<label class="permission-item" style="${fromDept ? 'background:#e8f0fe;border:1px solid #c2d7f8;' : 'background:var(--bg);'}">
            <input type="checkbox" name="permissions" value="${f}" ${checked ? 'checked' : ''}>
            <span>${f.replace('-', ' ')}</span>
            ${fromDept ? '<span style="font-size:10px;color:var(--primary);margin-left:auto;">dept</span>' : ''}
        </label>`;
    }).join('');
}

function onDeptChange(select) {
    const selectedOption = select.options[select.selectedIndex];
    let deptFeatures = [];
    try {
        deptFeatures = JSON.parse(selectedOption?.getAttribute('data-features') || '[]');
    } catch(e) { deptFeatures = []; }

    const grid = document.getElementById('permissionsGrid');
    if (!grid) return;

    const form = document.getElementById('userForm');
    const currentPerms = Array.from(form.querySelectorAll('[name="permissions"]:checked')).map(cb => cb.value);

    grid.innerHTML = renderPermissionCheckboxes(deptFeatures, currentPerms);
}

function onRoleChange(select) {
    const role = select.value;
    const grid = document.getElementById('permissionsGrid');
    if (!grid) return;
    const allCbs = document.querySelectorAll('[name="permissions"]');
    const rolePerms = {
        hod: ['dashboard','employee-dashboard','material-requests','suggestions','tasks','checklists','complaints','problems'],
        employee: ['employee-dashboard','material-requests','suggestions'],
        storekeeper: ['dashboard','inventory','material-requests','employee-dashboard'],
        ambulance_employee: ['ambulance']
    };
    const perms = rolePerms[role];
    if (perms) {
        allCbs.forEach(cb => cb.checked = perms.indexOf(cb.value) > -1);
    }
    if (!rolePerms[role]) {
        allCbs.forEach(cb => cb.checked = false);
    }
}

function saveUser() {
    const form = document.getElementById('userForm');
    const data = { fullName: '', username: '', password: '', email: '', phone: '', role: 'employee', department: '' };
    form.querySelectorAll('[name]').forEach(el => {
        if (el.name !== 'permissions') data[el.name] = el.value;
    });
    data.permissions = Array.from(form.querySelectorAll('[name="permissions"]:checked')).map(cb => cb.value);

    if (!data.fullName || !data.username) {
        APP.notify('Username and Full Name are required', 'error'); return false;
    }

    const existing = DB.get('users');
    if (data.id) {
        const updateData = { fullName: data.fullName, email: data.email, phone: data.phone, role: data.role, department: data.department, permissions: data.permissions };
        if (data.password) updateData.password = data.password;
        DB.update('users', data.id, updateData);
        APP.notify('User updated successfully', 'success');
    } else {
        if (!data.password) { APP.notify('Password is required', 'error'); return false; }
        if (existing.find(u => u.username === data.username)) {
            APP.notify('Username already exists', 'error'); return false;
        }
        DB.add('users', {
            username: data.username, password: data.password,
            fullName: data.fullName, email: data.email, phone: data.phone,
            role: data.role, department: data.department, permissions: data.permissions,
            isSuperAdmin: false
        });
        APP.notify('User created successfully! ID & Password: ' + data.username + ' / ' + data.password, 'success');
    }
    var searchInput = document.getElementById('userSearch');
    if (searchInput) searchInput.value = '';
    renderUsersList();
    return true;
}

function editUser(id) {
    const user = DB.getById('users', id);
    if (user) showUserForm(user);
}

function removeAllEmployees() {
    const user = AUTH.currentUser();
    if (!user || (!user.isSuperAdmin && user.role !== 'admin')) {
        APP.notify('Only admins can remove all employees', 'error');
        return;
    }
    const allUsers = DB.get('users');
    const employees = allUsers.filter(u => u.role === 'employee');
    if (employees.length === 0) {
        APP.notify('No employees found', 'info');
        return;
    }
    confirmAction(`Remove ALL ${employees.length} employee(s)? This cannot be undone.`, () => {
        employees.forEach(e => DB.delete('users', e.id));
        APP.notify(`Removed ${employees.length} employee(s)`, 'success');
        renderUsersList();
    });
}

function deleteUser(id) {
    const user = DB.getById('users', id);
    if (!user || user.isSuperAdmin) { APP.notify('Cannot delete super admin', 'error'); return; }
    confirmAction(`Delete user "${user.fullName}"?`, () => {
        DB.delete('users', id);
        APP.notify('User deleted', 'success');
        renderUsersList();
    });
}
