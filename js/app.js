const Router = {
    currentModule: 'dashboard',
    init() {
        const user = AUTH.currentUser();
        if (!user) { window.location.href = 'index.html'; return; }
        this.renderHeader();
        this.renderSidebar();

        // Restore last visited module or use role default
        const defaultModule = user.role === 'ambulance_employee' ? 'ambulance'
            : user.role === 'employee' ? 'employee-dashboard'
            : user.role === 'hod' ? 'hod-dashboard'
            : user.role === 'storekeeper' ? 'storekeeper-dashboard'
            : 'dashboard';
        const saved = localStorage.getItem('hms_lastModule');
        const startModule = saved || defaultModule;
        this.navigate(startModule);

        // Mobile: hamburger toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.onclick = () => {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.toggle('open');
                const overlay = document.getElementById('sidebarOverlay');
                if (overlay) overlay.classList.toggle('active');
            };
        }

        // Mobile: overlay click closes sidebar
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.onclick = () => {
                document.getElementById('sidebar').classList.remove('open');
                overlay.classList.remove('active');
            };
        }
    },
    renderHeader() {
        const user = AUTH.currentUser();
        const header = document.getElementById('mainHeader');
        if (!header) return;
        header.innerHTML = `
            <div class="header-left">
                <button id="menuToggle" class="menu-toggle" aria-label="Toggle menu">&#9776;</button>
                <h3 id="pageTitle" style="font-size:18px;font-weight:600;">Dashboard</h3>
            </div>
            <div class="header-right">
                <span id="liveIndicator" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--success);padding:3px 8px;border-radius:12px;background:rgba(52,168,83,0.1);border:1px solid rgba(52,168,83,0.3);"><span style="width:7px;height:7px;border-radius:50%;background:var(--success);animation:pulse 1.5s infinite;"></span>LIVE</span>
                ${(user.role === 'admin' || user.isSuperAdmin) ? `<button id="syncNowBtn" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:rgba(52,168,83,0.1);border:1px solid rgba(52,168,83,0.4);color:var(--secondary);" onclick="APP._syncNow()" title="Upload all local data to cloud database">☁ Sync</button><button class="btn btn-sm" style="font-size:11px;padding:4px 10px;" onclick="APP._mobileSetup()" title="Get QR code to set up login on mobile">📱 Mobile</button>` : ''}
                <span class="role-badge" style="font-size:13px;color:var(--gray);">${user.role.toUpperCase()}</span>
                <div class="header-user" onclick="Router.showProfile()">
                    <div class="avatar">${user.fullName.charAt(0).toUpperCase()}</div>
                    <span class="user-name" style="font-size:14px;">${user.fullName}</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="Router.logout()">Logout</button>
            </div>
        `;
    },
    renderSidebar() {
        const user = AUTH.currentUser();
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;
        const items = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊', permission: 'dashboard' },
            { id: 'users', label: 'User Management', icon: '👥', permission: 'users' },
            { id: 'departments', label: 'Departments', icon: '🏢', permission: 'departments' },
            { id: 'feature-rights', label: 'Feature Rights', icon: '🔐', permission: 'departments' },
            { id: 'inventory', label: 'Inventory', icon: '📦', permission: 'inventory' },
            { id: 'gate-security', label: 'Gate Security', icon: '🛡️', permission: 'gate-security' },
            { id: 'phase2', label: 'Phase 2 Infra', icon: '🏗️', permission: 'projects' },
            { id: 'projects', label: 'Projects', icon: '📋', permission: 'projects' },
            { id: 'ambulance', label: 'Ambulance', icon: '🚑', permission: 'ambulance' },
            { id: 'problems', label: 'Problems & Solutions', icon: '🔧', permission: 'problems' },
            { id: 'tasks', label: 'Tasks', icon: '✅', permission: 'tasks' },
            { id: 'complaints', label: 'Complaints', icon: '📝', permission: 'complaints' },
            { id: 'room-checklist', label: 'Room Checklist', icon: '🧹', permission: 'room-checklist' },
            { id: 'admissions', label: 'Admissions', icon: '🏥', permission: 'admissions' },
            { id: 'lost-found', label: 'Lost & Found', icon: '🔍', permission: 'lost-found' },
            { id: 'admin-checklists', label: 'Admin Checklists', icon: '🔖', permission: 'admin-checklists' },
            { id: 'material-requests', label: 'Material Requests', icon: '📦', permission: 'material-requests' },
            { id: 'suggestions', label: 'Suggestions', icon: '💡', permission: 'suggestions' },
            { id: 'budget', label: 'Budget', icon: '💰', permission: 'budget', adminOnly: true },
            { id: 'quarterly-priorities', label: 'Quarterly Priorities', icon: '🎯', permission: 'quarterly-priorities', adminOnly: true },
            { id: 'data-history', label: 'Data History', icon: '🕐', permission: 'dashboard', adminOnly: true },
            { id: 'reports', label: 'Reports & Analytics', icon: '📈', permission: 'reports' },
            { id: 'hod-dashboard', label: 'In-Charge Dashboard', icon: '👔', permission: 'hod-dashboard' },
            { id: 'employee-dashboard', label: 'My Dashboard', icon: '📊', permission: 'employee-dashboard' },
            { id: 'storekeeper-dashboard', label: 'Storekeeper Dashboard', icon: '🏪', permission: 'storekeeper-dashboard' },
            { id: 'checklists', label: 'Checklists', icon: '✅', permission: 'checklists' }
        ];
        let html = '';
        items.forEach(item => {
            if (item.adminOnly && !(user.isSuperAdmin || user.role === 'admin')) return;
            if (AUTH.hasPermission(user, item.permission)) {
                html += `<div class="nav-item" onclick="Router.navigate('${item.id}')" data-module="${item.id}">
                    <span>${item.icon}</span> <span>${item.label}</span>
                </div>`;
            }
        });
        nav.innerHTML = html;
    },
    navigate(module) {
        var u = AUTH.currentUser();
        if (!u) { window.location.href = 'index.html'; return; }
        if (module === 'dashboard' && u && u.role === 'employee') module = 'employee-dashboard';
        if (module === 'dashboard' && u && u.role === 'hod') module = 'hod-dashboard';
        if (module === 'dashboard' && u && u.role === 'storekeeper') module = 'storekeeper-dashboard';
        // HOD and employees must not access admin-only modules directly
        var _adminOnly = ['reports', 'data-history', 'budget', 'quarterly-priorities', 'feature-rights'];
        if (_adminOnly.indexOf(module) !== -1 && u.role !== 'admin' && !u.isSuperAdmin) {
            if (u.role === 'hod') { module = 'hod-dashboard'; }
            else if (u.role === 'storekeeper') { module = 'storekeeper-dashboard'; }
            else { module = 'employee-dashboard'; }
        }

        // Cleanup ambulance tracking when leaving that module
        if (APP.currentModule === 'ambulance' && module !== 'ambulance') {
            try {
                if (typeof ambTrackingInterval !== 'undefined' && ambTrackingInterval) {
                    clearInterval(ambTrackingInterval);
                    ambTrackingInterval = null;
                }
            } catch(e) {}
        }

        APP.currentModule = module;
        // Persist last module for refresh restoration
        try { localStorage.setItem('hms_lastModule', module); } catch(e) {}

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-module="${module}"]`);
        if (navItem) {
            navItem.classList.add('active');
            // Scroll nav item into view on mobile
            try { navItem.scrollIntoView({ block: 'nearest' }); } catch(e) {}
        }

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.remove('active');

        const titles = {
            dashboard: 'Dashboard', users: 'User Management', departments: 'Departments',
            'feature-rights': 'Feature Rights', inventory: 'Inventory Management',
            'gate-security': 'Gate Security', phase2: 'Phase 2 Infra & Development',
            projects: 'Projects & Plans', ambulance: 'Ambulance Tracking',
            problems: 'Problems & Solutions', tasks: 'Task Management',
            complaints: 'Complaints', 'room-checklist': 'Room Checklist',
            admissions: 'Admissions & Discharges', 'lost-found': 'Lost & Found',
            'admin-checklists': 'Admin Checklists', checklists: 'Checklists',
            'material-requests': 'Material Requests', suggestions: 'Suggestions',
            budget: 'Budget Management',
            'quarterly-priorities': 'Quarterly Priorities',
            reports: 'Reports & Analytics',
            'data-history': 'Data History & Backups',
            'employee-dashboard': 'My Dashboard',
            'hod-dashboard': 'In-Charge Dashboard',
            'storekeeper-dashboard': 'Storekeeper Dashboard'
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[module] || module;

        const content = document.getElementById('pageContent');
        if (!content) return;

        const renderers = {
            dashboard: renderDashboard,
            users: renderUsers,
            departments: renderDepartments,
            'feature-rights': renderFeatureRights,
            inventory: renderInventory,
            'gate-security': renderGateSecurity,
            phase2: renderPhase2,
            projects: renderProjects,
            ambulance: renderAmbulance,
            problems: renderProblems,
            tasks: renderTasks,
            complaints: renderComplaints,
            'room-checklist': renderRoomChecklist,
            admissions: renderAdmissions,
            'lost-found': renderLostFound,
            'admin-checklists': renderAdminChecklists,
            checklists: renderChecklists,
            'material-requests': renderMaterialRequests,
            suggestions: renderSuggestions,
            budget: renderBudget,
            'quarterly-priorities': renderQPriorities,
            reports: renderReports,
            'data-history': renderDataHistory,
            'employee-dashboard': renderEmployeeDashboard,
            'hod-dashboard': renderHodDashboard,
            'storekeeper-dashboard': renderStorekeeperDashboard
        };
        if (renderers[module]) {
            content.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p style="color:var(--gray);margin-top:8px;">Loading...</p></div>';
            setTimeout(() => {
                if (renderers[module]) renderers[module](content);
            }, 80);
        }
    },
    showProfile() {
        const user = AUTH.currentUser();
        if (!user) return;
        const html = `
            <div class="modal active" id="profileModal">
                <div class="modal-content" style="max-width:400px;">
                    <div class="modal-header">
                        <h3>My Profile</h3>
                        <button class="modal-close" onclick="document.getElementById('profileModal').remove()">&times;</button>
                    </div>
                    <div style="text-align:center;margin-bottom:16px;">
                        <div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin:0 auto 8px;">${user.fullName.charAt(0).toUpperCase()}</div>
                        <h3>${user.fullName}</h3>
                        <span class="badge ${APP.getRoleBadge(user.role)}">${user.role.toUpperCase()}</span>
                    </div>
                    <div class="grid-2">
                        <div><strong>Username:</strong><br>${user.username}</div>
                        <div><strong>Email:</strong><br>${user.email || '-'}</div>
                        <div><strong>Phone:</strong><br>${user.phone || '-'}</div>
                        <div><strong>Department:</strong><br>${user.department || '-'}</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="document.getElementById('profileModal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    _mobileSetup() {
        const users = DB.get('users') || [];
        if (users.length === 0) { APP.notify('No user data found', 'error'); return; }
        try {
            const payload = btoa(encodeURIComponent(JSON.stringify({ users: users })));
            const base = window.location.href.replace('dashboard.html', 'index.html').split('#')[0].split('?')[0];
            const url = base + '#import=' + payload;

            const isLocalhost = base.includes('localhost') || base.includes('127.0.0.1');
            const localhostWarn = isLocalhost ? `
                <div style="background:#fff3e0;border:1px solid #ffcc80;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#e65100;text-align:left;">
                    ⚠ You are running on <strong>localhost</strong>. This link will only work on <em>this computer</em>, not on mobile.<br>
                    Open the app from <strong>GitHub Pages</strong> on your PC, then use the 📱 Mobile button there.
                </div>` : '';

            const userListHtml = users.map(function(u){
                const badge = (u.role === 'admin' || u.isSuperAdmin) ? 'admin' : u.role;
                return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--light-gray);font-size:13px;">
                    <span style="font-weight:600;">${u.username}</span>
                    <span style="color:var(--gray);font-size:11px;">${badge}</span>
                </div>`;
            }).join('');

            const waLink = 'https://wa.me/?text=' + encodeURIComponent('Open this link on your mobile to set up HMS login:\n' + url);

            const html = `
                <div class="modal-overlay" id="mobileSetupModal" onclick="if(event.target===this)this.remove()">
                    <div class="modal-content" style="max-width:420px;">
                        <h3 style="margin-bottom:6px;text-align:center;">📱 Mobile Setup for All Users</h3>
                        <p style="font-size:13px;color:var(--gray);margin-bottom:12px;text-align:center;">Share this link with <strong>all users</strong>. Opening it on mobile imports every account so each person can log in with their own username &amp; password.</p>

                        ${localhostWarn}

                        <div style="background:var(--bg);border-radius:8px;padding:10px 12px;margin-bottom:12px;max-height:140px;overflow-y:auto;">
                            <p style="font-size:11px;font-weight:700;color:var(--gray);margin-bottom:4px;">ACCOUNTS INCLUDED (${users.length}):</p>
                            ${userListHtml}
                        </div>

                        <div id="mobileQrBox" style="display:flex;justify-content:center;margin-bottom:12px;"></div>

                        <p style="font-size:11px;color:var(--gray);margin-bottom:4px;text-align:center;">Can't scan? Copy &amp; share the link:</p>
                        <div id="mobileImportUrl" style="font-size:10px;word-break:break-all;background:var(--bg);padding:8px;border-radius:6px;margin-bottom:10px;max-height:48px;overflow:auto;">${url}</div>

                        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                            <button class="btn btn-sm btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('mobileImportUrl').textContent).then(function(){APP.notify('Link copied!','success')})">📋 Copy Link</button>
                            <a href="${waLink}" target="_blank" class="btn btn-sm btn-success" style="text-decoration:none;">💬 Share via WhatsApp</a>
                        </div>
                        <div class="modal-footer">
                            <button class="btn" onclick="document.getElementById('mobileSetupModal').remove()">Close</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            setTimeout(function () {
                try {
                    new QRCode(document.getElementById('mobileQrBox'), { text: url, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.L });
                } catch (e) {
                    document.getElementById('mobileQrBox').innerHTML = '<p style="color:var(--gray);font-size:12px;">QR unavailable — use the link above.</p>';
                }
            }, 100);
        } catch (e) { APP.notify('Could not generate setup: ' + e.message, 'error'); }
    },
    _syncNow() {
        if (!window.FB_DB) { APP.notify('No database connection', 'error'); return; }
        const btn = document.getElementById('syncNowBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⟳ Syncing…'; }
        try { SYNC.pushAll(); } catch (e) {}
        setTimeout(function () {
            if (btn) { btn.disabled = false; btn.textContent = '☁ Sync'; }
            APP.notify('All data uploaded to database ✓', 'success');
        }, 2000);
    },
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            AUTH.logout();
            window.location.replace('index.html');
        }
    }
};

function showModal(html, large) {
    const m = document.createElement('div');
    m.className = 'modal active';
    m.innerHTML = `<div class="modal-content ${large ? 'modal-lg' : ''}">${html}</div>`;
    m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    return m;
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.remove());
}

function openFormModal(title, formHtml, onSave, large) {
    const m = showModal(`
        <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div id="modalFormBody">${formHtml}</div>
        <div class="modal-footer">
            <button class="btn btn-danger" onclick="this.closest('.modal').remove()">Cancel</button>
            <button class="btn btn-primary" id="modalSaveBtn" onclick="__modalSave(this,'${onSave}')">Save</button>
        </div>
    `, large);
    return m;
}

function __modalSave(btn, fnCall) {
    const result = eval(fnCall);
    if (result instanceof Promise) {
        result.then(r => { if (r !== false) btn.closest('.modal').remove(); });
    } else if (result !== false) {
        btn.closest('.modal').remove();
    }
}

function getFormData(id) {
    const form = document.getElementById(id);
    if (!form) return {};
    const data = {};
    form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });
    return data;
}

function confirmAction(msg, cb) {
    if (confirm(msg)) cb();
}

function deptDropdown(name, selected) {
    const depts = DB.get('departments');
    if (!depts || depts.length === 0) {
        return '<input type="text" name="' + name + '" class="form-control" placeholder="e.g. Cardiology" value="' + (selected || '') + '">';
    }
    return '<select name="' + name + '" class="form-control">' +
        '<option value="">Select Department</option>' +
        depts.map(d => '<option value="' + d.name + '" ' + (selected === d.name ? 'selected' : '') + '>' + d.name + '</option>').join('') +
        '</select>';
}
