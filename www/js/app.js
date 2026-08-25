if (typeof window.T !== 'function') {
    window.T = typeof I18N !== 'undefined' && typeof I18N.t === 'function' ? I18N.t : function (k) { return k; };
}
var T = window.T;

const Router = {
    currentModule: 'dashboard',
    init() {
        const user = AUTH.currentUser();
        if (!user) { window.location.href = 'index.html'; return; }
        this.renderHeader();
        this.renderSidebar();

        // Restore last visited module or use role default
        const isAdmin = user.isSuperAdmin || user.role === 'admin';
        const uRole = (user.role || '').toString().trim().toLowerCase();

        const defaultModule = isAdmin ? 'dashboard'
            : uRole === 'hod' ? 'hod-dashboard'
            : uRole === 'storekeeper' ? 'storekeeper-dashboard'
            : uRole === 'ambulance_employee' ? 'ambulance'
            : 'employee-dashboard';
        const saved = localStorage.getItem('hms_lastModule');
        let startModule = saved || defaultModule;
        if (startModule === 'chief-accountant-portal' || startModule === 'cfo-portal' || (!isAdmin && startModule === 'dashboard')) {
            startModule = defaultModule;
            try { localStorage.setItem('hms_lastModule', defaultModule); } catch (e) {}
        }
        this.navigate(startModule);

        // Mobile: overlay click closes sidebar
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.onclick = () => { Router.closeMobileMenu(); };
        }
    },
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.toggle('active');
    },
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.remove('active');
    },
    renderHeader() {
        const user = AUTH.currentUser();
        const header = document.getElementById('mainHeader');
        if (!header) return;
        const hs = getHospitalSettings();
        header.innerHTML = `
            <div class="header-left">
                <button id="menuToggle" class="menu-toggle" aria-label="Toggle menu" onclick="Router.toggleMobileMenu()">&#9776;</button>
                <div style="display:flex;flex-direction:column;gap:1px;">
                    <span id="headerHospitalName" style="font-size:11px;color:var(--primary);font-weight:700;letter-spacing:0.3px;line-height:1;">${hs.name || 'Stavya Intelligence'}</span>
                    <h3 id="pageTitle" style="font-size:17px;font-weight:600;margin:0;">Dashboard</h3>
                </div>
            </div>
            <div class="header-right">
                <span id="liveIndicator" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--success);padding:3px 8px;border-radius:12px;background:rgba(52,168,83,0.1);border:1px solid rgba(52,168,83,0.3);"><span style="width:7px;height:7px;border-radius:50%;background:var(--success);animation:pulse 1.5s infinite;"></span>${typeof T === 'function' ? T('ui_live') : 'LIVE'}</span>
                ${(user.role === 'admin' || user.isSuperAdmin) ? `<button id="syncNowBtn" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:rgba(52,168,83,0.1);border:1px solid rgba(52,168,83,0.4);color:var(--secondary);" onclick="APP._syncNow()" title="Upload all local data to cloud database">☁ Sync</button><button class="btn btn-sm btn-mobile-setup" style="font-size:11px;padding:4px 10px;" onclick="APP._mobileSetup()" title="Get QR code to set up login on mobile">📱 Mobile</button>` : ''}
                ${typeof LANG !== 'undefined' ? LANG.switcher() : ''}
                ${typeof WS_NOTIFY !== 'undefined' ? WS_NOTIFY.bellHTML() : ''}
                <span class="role-badge" style="font-size:13px;color:var(--gray);">${user.role.toUpperCase()}</span>
                <div class="header-user" onclick="Router.showProfile()">
                    <div class="avatar">${user.fullName.charAt(0).toUpperCase()}</div>
                    <span class="user-name" style="font-size:14px;">${user.fullName}</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="Router.logout()">${typeof T === 'function' ? T('ui_logout') : 'Logout'}</button>
            </div>
        `;
    },
    renderSidebar() {
        const user = AUTH.currentUser();
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;
        const _t = typeof T === 'function' ? T : function(k){ return k; };
        const items = [
            { id: 'dashboard', label: _t('nav_dashboard'), icon: '📊', permission: 'dashboard', adminOnly: true },
            { id: 'users', label: _t('nav_users'), icon: '👥', permission: 'users', adminOnly: true },
            { id: 'departments', label: _t('nav_departments'), icon: '🏢', permission: 'departments', adminOnly: true },
            { id: 'feature-rights', label: _t('nav_feature_rights'), icon: '🔐', permission: 'feature-rights', adminOnly: true },
            { id: 'inventory', label: _t('nav_inventory'), icon: '📦', permission: 'inventory' },
            { id: 'scrap', label: '🗑️ Scrap / Disposal', icon: '🗑️', permission: 'scrap' },
            { id: 'gate-security', label: _t('nav_gate_security'), icon: '🛡️', permission: 'gate-security' },
            { id: 'phase2', label: _t('nav_phase2'), icon: '🏗️', permission: 'projects' },
            { id: 'projects', label: _t('nav_projects'), icon: '📋', permission: 'projects' },
            { id: 'ambulance', label: _t('nav_ambulance'), icon: '🚑', permission: 'ambulance' },
            { id: 'problems', label: _t('nav_problems'), icon: '🔧', permission: 'problems' },
            { id: 'tasks', label: _t('nav_tasks'), icon: '✅', permission: 'tasks' },
            { id: 'complaints', label: _t('nav_complaints'), icon: '📝', permission: 'complaints' },
            { id: 'room-checklist', label: _t('nav_room_checklist'), icon: '🧹', permission: 'room-checklist' },
            { id: 'rooms', label: '🏥 Rooms Master', icon: '🏥', permission: 'rooms' },
            { id: 'admissions', label: _t('nav_admissions'), icon: '🏥', permission: 'admissions' },
            { id: 'lost-found', label: _t('nav_lost_found'), icon: '🔍', permission: 'lost-found' },
            { id: 'admin-checklists', label: _t('nav_admin_checklists'), icon: '🔖', permission: 'admin-checklists', adminOnly: true },
            { id: 'material-requests', label: _t('nav_material_requests'), icon: '📦', permission: 'material-requests' },
            { id: 'discounts', label: _t('nav_discounts'), icon: '🏷️', permission: 'discounts' },
            { id: 'suggestions', label: _t('nav_suggestions'), icon: '💡', permission: 'suggestions' },
            { id: 'budget', label: _t('nav_budget'), icon: '💰', permission: 'budget', adminOnly: true },
            { id: 'quarterly-priorities', label: _t('nav_quarterly'), icon: '🎯', permission: 'quarterly-priorities', adminOnly: true },
            { id: 'data-history', label: _t('nav_data_history'), icon: '🕐', permission: 'dashboard', adminOnly: true },
            { id: 'hospital-settings', label: _t('nav_hospital_settings'), icon: '⚙️', permission: 'dashboard', adminOnly: true },
            { id: 'reports', label: _t('nav_reports'), icon: '📈', permission: 'reports' },
            { id: 'md-report', label: _t('nav_md_report'), icon: '📋', permission: 'md-report' },
            { id: 'purchases', label: '💰 Daily Purchases', icon: '💰', permission: 'purchases' },
            { id: 'hod-dashboard', label: _t('nav_hod_dashboard'), icon: '👔', permission: 'hod-dashboard' },
            { id: 'employee-dashboard', label: _t('nav_employee_dashboard'), icon: '📊', permission: 'employee-dashboard' },
            { id: 'storekeeper-dashboard', label: _t('nav_storekeeper_dashboard'), icon: '🏪', permission: 'storekeeper-dashboard' },
            { id: 'checklists', label: _t('nav_checklists'), icon: '✅', permission: 'checklists' },
            { id: 'departmental-checklist', label: _t('nav_departmental_checklist'), icon: '📋', permission: 'departmental-checklist' },
            { id: 'department-meetings', label: _t('nav_department_meetings'), icon: '🤝', permission: 'department-meetings' },
            { id: 'staff-deployment', label: '🧹 Staff Deployment', icon: '🧹', permission: 'staff-deployment' },
            { id: 'security-deployment', label: '🛡️ Security Deployment', icon: '🛡️', permission: 'security-deployment' },
            { id: 'patient-shifting', label: '🚑 Patient Shifting', icon: '🚑', permission: 'patient-shifting' }
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
        var isAdmin = u.isSuperAdmin || u.role === 'admin';

        if (module === 'purchases') {
            window._hodTargetTab = 'purchases';
            module = 'hod-dashboard';
        }

        // Strict role-based dashboard guard:
        if (module === 'chief-accountant-portal' || module === 'cfo-portal' || (module === 'dashboard' && !isAdmin)) {
            if (u.role === 'hod') module = 'hod-dashboard';
            else if (u.role === 'storekeeper') module = 'storekeeper-dashboard';
            else if (u.role === 'ambulance_employee') module = 'ambulance';
            else module = 'employee-dashboard';
        }

        // Non-admin staff must not access admin-only modules directly
        var _adminOnly = ['dashboard', 'users', 'departments', 'feature-rights', 'admin-checklists', 'data-history', 'budget', 'quarterly-priorities', 'hospital-settings'];
        if (_adminOnly.indexOf(module) !== -1 && !isAdmin) {
            var requestedModule = module;
            if (u.role === 'hod') {
                module = 'hod-dashboard';
                if (requestedModule === 'reports') window._hodTargetTab = 'hodreports';
            }
            else if (u.role === 'storekeeper') { module = 'storekeeper-dashboard'; }
            else if (u.role === 'ambulance_employee') { module = 'ambulance'; }
            else {
                module = 'employee-dashboard';
                if (requestedModule === 'reports') window._targetEmpTab = 'reports';
            }
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

        const navKeyMap = {
            dashboard: 'nav_dashboard', users: 'nav_users', departments: 'nav_departments',
            'feature-rights': 'nav_feature_rights', inventory: 'nav_inventory',
            scrap: 'Scrap / Disposal',
            'gate-security': 'nav_gate_security', phase2: 'nav_phase2',
            projects: 'nav_projects', ambulance: 'nav_ambulance',
            problems: 'nav_problems', tasks: 'nav_tasks',
            complaints: 'nav_complaints', 'room-checklist': 'nav_room_checklist',
            admissions: 'nav_admissions', 'lost-found': 'nav_lost_found',
            'admin-checklists': 'nav_admin_checklists', checklists: 'nav_checklists',
            'departmental-checklist': 'nav_departmental_checklist',
            'department-meetings': 'nav_department_meetings',
            'staff-deployment': 'nav_staff_deployment',
            'security-deployment': 'nav_security_deployment',
            'patient-shifting': 'nav_patient_shifting',
            'material-requests': 'nav_material_requests', discounts: 'nav_discounts', suggestions: 'nav_suggestions',
            budget: 'nav_budget',
            'quarterly-priorities': 'nav_quarterly',
            reports: 'nav_reports',
            'md-report': 'nav_md_report',
            'data-history': 'nav_data_history',
            'hospital-settings': 'nav_hospital_settings',
            'employee-dashboard': 'nav_employee_dashboard',
            'hod-dashboard': 'nav_hod_dashboard',
            'storekeeper-dashboard': 'nav_storekeeper_dashboard'
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) {
            const _tt = typeof T === 'function' ? T : function(k){ return k; };
            const navKey = navKeyMap[module];
            titleEl.textContent = navKey ? _tt(navKey) : module;
        }

        const content = document.getElementById('pageContent');
        if (!content) return;

        const getRenderer = (mod) => {
            if (!mod) return null;

            // 1. Direct camelCase window function lookup (e.g. window.renderDashboard, window.renderHodDashboard, window.renderEmployeeDashboard)
            const parts = mod.split('-');
            const camelName = 'render' + parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            if (typeof window[camelName] === 'function') return window[camelName];

            // 2. Direct exact window function lookup
            if (typeof window['render' + mod] === 'function') return window['render' + mod];

            // 3. Dynamic lookup on window for module-specific renderer maps safely
            const safeWindowGet = (fnName) => typeof window[fnName] === 'function' ? window[fnName] : null;

            switch (mod) {
                case 'dashboard': return safeWindowGet('renderDashboard') || (typeof DashboardModule !== 'undefined' && DashboardModule.render ? (c) => DashboardModule.render(c) : null);
                case 'users': return safeWindowGet('renderUsers');
                case 'departments': return safeWindowGet('renderDepartments');
                case 'feature-rights': return safeWindowGet('renderFeatureRights');
                case 'inventory': return safeWindowGet('renderInventory');
                case 'scrap': return safeWindowGet('renderScrap');
                case 'gate-security': return safeWindowGet('renderGateSecurity');
                case 'phase2': return safeWindowGet('renderPhase2');
                case 'projects': return safeWindowGet('renderProjects');
                case 'ambulance': return safeWindowGet('renderAmbulance');
                case 'problems': return safeWindowGet('renderProblems');
                case 'tasks': return safeWindowGet('renderTasks');
                case 'complaints': return safeWindowGet('renderComplaints');
                case 'room-checklist': return safeWindowGet('renderRoomChecklist');
                case 'rooms': return safeWindowGet('renderRooms') || (typeof RoomsModule !== 'undefined' ? (c) => RoomsModule.render(c) : (c) => { c.innerHTML = '<div class="empty-state">Rooms module not loaded</div>'; });
                case 'admissions': return safeWindowGet('renderAdmissions');
                case 'lost-found': return safeWindowGet('renderLostFound');
                case 'admin-checklists': return safeWindowGet('renderAdminChecklists');
                case 'checklists': return safeWindowGet('renderChecklists');
                case 'departmental-checklist': return safeWindowGet('renderDeptChecklists');
                case 'department-meetings': return safeWindowGet('renderDeptMeetings');
                case 'staff-deployment': return safeWindowGet('renderStaffDeployment') || (typeof StaffDeployment !== 'undefined' ? (c) => StaffDeployment.renderFull(c) : null);
                case 'security-deployment': return safeWindowGet('renderSecurityDeployment') || (typeof SecurityDeployment !== 'undefined' ? (c) => SecurityDeployment.renderFull(c) : null);
                case 'patient-shifting': return safeWindowGet('renderPatientShifting') || (typeof PatientShifting !== 'undefined' ? (c) => PatientShifting.renderFull(c) : null);
                case 'material-requests': return safeWindowGet('renderMaterialRequests');
                case 'discounts': return safeWindowGet('renderDiscounts');
                case 'suggestions': return safeWindowGet('renderSuggestions');
                case 'budget': return safeWindowGet('renderBudget');
                case 'quarterly-priorities': return safeWindowGet('renderQPriorities');
                case 'reports': return safeWindowGet('renderReports');
                case 'md-report': return safeWindowGet('renderMdReport');
                case 'data-history': return safeWindowGet('renderDataHistory');
                case 'employee-dashboard': return safeWindowGet('renderEmployeeDashboard');
                case 'hod-dashboard': return safeWindowGet('renderHodDashboard');
                case 'storekeeper-dashboard': return safeWindowGet('renderStorekeeperDashboard');
                case 'hospital-settings': return safeWindowGet('renderHospitalSettings');
                default: return null;
            }
        };

        const initialRenderer = getRenderer(module);
        if (!initialRenderer) {
            const fallbackModule = isAdmin ? 'dashboard'
                : u.role === 'hod' ? 'hod-dashboard'
                : u.role === 'storekeeper' ? 'storekeeper-dashboard'
                : u.role === 'ambulance_employee' ? 'ambulance'
                : 'employee-dashboard';
            if (module !== fallbackModule) {
                try { localStorage.setItem('hms_lastModule', fallbackModule); } catch (e) {}
                this.navigate(fallbackModule);
                return;
            }
        }

        if (initialRenderer || module) {
            content.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p style="color:var(--gray);margin-top:8px;">Loading...</p></div>';
            setTimeout(() => {
                try {
                    const activeRenderer = getRenderer(module);
                    if (typeof activeRenderer === 'function') {
                        activeRenderer(content);
                    } else {
                        content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray);"><div style="font-size:40px;margin-bottom:8px;">📂</div><p style="font-weight:600;">Module loading or under maintenance</p><p style="font-size:13px;margin-top:4px;">Could not load module renderer for "' + module + '".</p><button class="btn btn-sm btn-primary" style="margin-top:12px;" onclick="Router.navigate(\'' + module + '\')">Retry</button></div>';
                    }
                } catch (e) {
                    content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger);"><div style="font-size:40px;margin-bottom:8px;">⚠️</div><p style="font-weight:600;">Page failed to load</p><p style="font-size:13px;margin-top:4px;">' + (e.message || e) + '</p><button class="btn btn-sm btn-primary" style="margin-top:12px;" onclick="Router.navigate(\'' + module + '\')">Retry</button></div>';
                    console.error('[Router] render error:', e);
                }
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
        if (!window.SB_DB) { APP.notify('No database connection', 'error'); return; }
        const btn = document.getElementById('syncNowBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⟳ Syncing…'; }
        try { SYNC.pushAll(); } catch (e) {}
        setTimeout(function () {
            if (btn) { btn.disabled = false; btn.textContent = '☁ Sync'; }
            APP.notify('All data uploaded to database ✓', 'success');
        }, 2000);
    },
    refreshCurrent() {
        if (this.currentModule) {
            this.navigate(this.currentModule);
        }
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
            <button class="btn btn-primary" id="modalSaveBtn">Save</button>
        </div>
    `, large);
    const saveBtn = m.querySelector('#modalSaveBtn');
    if (saveBtn) {
        saveBtn.onclick = function() {
            __modalSave(this, onSave);
        };
    }
    return m;
}

function __modalSave(btn, fnCall) {
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.style.opacity = '0.6';
    try {
        const result = typeof fnCall === 'function' ? fnCall() : eval(fnCall);
        if (result instanceof Promise) {
            result.then(r => {
                if (r === false) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                } else {
                    const m = btn.closest('.modal');
                    if (m) m.remove();
                }
            }).catch(err => {
                console.error('[__modalSave] Promise error:', err);
                if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            });
        } else if (result === false) {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            const m = btn.closest('.modal');
            if (m) m.remove();
        }
    } catch (err) {
        console.error('[__modalSave] Execution error:', err);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
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

/* ── Hospital Settings helpers ── */
function getHospitalSettings() {
    var s = DB.get('hospital_settings');
    return s || { name: 'Stavya Intelligence', logo: 'assets/stavya-logo.png' };
}

function renderHospitalSettings(container) {
    var s = getHospitalSettings();
    var logoPreview = s.logo
        ? (s.logo.startsWith('data:') ? s.logo : s.logo)
        : 'assets/stavya-logo.png';
    container.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:24px 0;">
        <h2 style="margin-bottom:20px;">⚙️ Hospital Settings</h2>
        <div class="card" style="padding:28px;">
            <div class="form-group">
                <label style="font-weight:600;">Hospital Name</label>
                <input id="hsName" class="form-control" value="${(s.name||'').replace(/"/g,'&quot;')}" placeholder="Enter hospital name">
            </div>
            <div class="form-group" style="margin-top:18px;">
                <label style="font-weight:600;">Logo</label>
                <div style="margin:10px 0;background:#f9f9f9;border:1px dashed #ccc;border-radius:10px;padding:16px;text-align:center;">
                    <img id="hsLogoPreview" src="${logoPreview}" alt="Logo" style="max-height:90px;max-width:220px;object-fit:contain;">
                </div>
                <label class="btn btn-sm" style="cursor:pointer;background:var(--primary);color:#fff;display:inline-block;margin-top:6px;">
                    📁 Choose New Logo
                    <input type="file" id="hsLogoFile" accept="image/*" style="display:none;" onchange="hsPreviewLogo(this)">
                </label>
                <span id="hsLogoStatus" style="font-size:12px;color:var(--gray);margin-left:10px;"></span>
            </div>
            <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="hsSave()">💾 Save Changes</button>
                <button class="btn" onclick="hsResetLogo()" style="background:#fff3e0;color:#e65100;">↩️ Reset to Default Logo</button>
            </div>
        </div>
        <p style="font-size:12px;color:var(--gray);margin-top:12px;">Changes appear on the login page and sidebar immediately after saving.</p>
    </div>`;
}

function hsPreviewLogo(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 500 * 1024) {
        APP.notify('Logo must be under 500 KB', 'error'); return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('hsLogoPreview').src = e.target.result;
        document.getElementById('hsLogoStatus').textContent = file.name;
        window._hsPendingLogo = e.target.result;
    };
    reader.readAsDataURL(file);
}

function hsSave() {
    var name = (document.getElementById('hsName').value || '').trim();
    if (!name) { APP.notify('Hospital name cannot be empty', 'error'); return; }
    var s = getHospitalSettings();
    s.name = name;
    if (window._hsPendingLogo) { s.logo = window._hsPendingLogo; window._hsPendingLogo = null; }
    DB.set('hospital_settings', s);
    hsApplyBranding(s);
    APP.notify('Settings saved!', 'success');
}

function hsResetLogo() {
    var s = getHospitalSettings();
    s.logo = 'assets/stavya-logo.png';
    delete s._logoIsBase64;
    DB.set('hospital_settings', s);
    document.getElementById('hsLogoPreview').src = s.logo;
    document.getElementById('hsLogoStatus').textContent = 'Reset to default';
    window._hsPendingLogo = null;
    hsApplyBranding(s);
    APP.notify('Logo reset to default', 'success');
}

function hsApplyBranding(s) {
    var name = s.name || 'Stavya Intelligence';
    /* Sidebar */
    var sidebarLogo = document.getElementById('sidebarLogoImg');
    var sidebarName = document.getElementById('sidebarHospitalName');
    if (sidebarLogo && s.logo) sidebarLogo.src = s.logo;
    if (sidebarName) sidebarName.textContent = name;
    /* Top header (rebuilt on every navigate, so also update live element) */
    var headerName = document.getElementById('headerHospitalName');
    if (headerName) headerName.textContent = name;
    /* Browser tab title */
    document.title = name + ' - Management System';
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

/**
 * Universal Image Lightbox Modal
 * Opens a full-resolution modal preview for uploaded photos.
 */
function openImageModal(src, title) {
    if (!src) return;
    title = title || 'Checklist Photograph';
    var modalId = 'hmsImageLightboxModal';
    var existing = document.getElementById(modalId);
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;backdrop-filter:blur(4px);';

    overlay.innerHTML = `
        <div style="position:relative;max-width:90vw;max-height:85vh;display:flex;flex-direction:column;align-items:center;">
            <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;color:#fff;">
                <span style="font-size:14px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${title}</span>
                <div style="display:flex;gap:8px;align-items:center;">
                    <a href="${src}" download="checklist-photo.jpg" target="_blank" class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;border:none;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:12px;">⬇️ Download</a>
                    <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:rgba(255,255,255,0.25);color:#fff;border:none;width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;line-height:1;">✕</button>
                </div>
            </div>
            <img src="${src}" alt="${title}" style="max-width:100%;max-height:78vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);">
        </div>
    `;

    overlay.onclick = function (e) {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
}
window.openImageModal = openImageModal;

