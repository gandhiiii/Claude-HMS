// Discount Approvals Module — Department‑isolated with Reception desk & User CRUD
// Roles that are allowed to create / manage discounts:
//   CFO, CHIEF_ACCOUNTANT, RECEPTIONIST, MD, EXECUTIVE (Vice Chairman/Chairman), DIRECTOR, doctor
// The module stores requests per department and gates creation/approval by role.

(function (global) {
    "use strict";

    // -------------------------------------------------------------
    // 1.  Configuration – departments & allowed roles
    // -------------------------------------------------------------
    var DEPARTMENTS = {
        admission:   "Admission",
        account:     "Accounting",
        radiology:   "Radiology",
        reception:   "Reception"
    };

    // Roles that are permitted to initiate a discount request.
    // The system will only allow `createDiscount` if the caller's role is in this list.
    var ALLOWED_CREATION_ROLES = [
        "CFO",
        "CHIEF_ACCOUNTANT",
        "RECEPTIONIST",
        "MD",
        "EXECUTIVE",
        "CHAIRMAN",
        "VICE_CHAIRMAN",
        "DIRECTOR",
        "doctor"
    ];

    // Roles that are permitted to approve / reject / escalate discounts.
    // (You may keep the same set or narrow it further.)
    var ALLOWED_APPROVER_ROLES = [
        "CFO",
        "CHIEF_ACCOUNTANT",
        "MD",
        "EXECUTIVE",
        "CHAIRMAN",
        "VICE_CHAIRMAN",
        "DIRECTOR"
    ];

    // -------------------------------------------------------------
    // 2.  In‑memory DB (per‑department) – persisted to localStorage
    // -------------------------------------------------------------
    var DB = {
        // internal key pattern: "discountRequests_<deptKey>"
        _db: function (deptKey) { return "discountRequests_" + deptKey; },

        // --- per‑department get / set ---
        get: function (deptKey) {
            var raw = localStorage.getItem(this._db(deptKey));
            return raw ? JSON.parse(raw) : [];
        },
        set: function (deptKey, arr) {
            localStorage.setItem(this._db(deptKey), JSON.stringify(arr));
            this._emit(deptKey, "set", arr);
        },

        // --- add a single request (used by the reception module)
        add: function (deptKey, request) {
            var list = this.get(deptKey);
            // assign a simple numeric id if missing
            if (!request.id) request.id = "REQ-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
            list.push(request);
            this.set(deptKey, list);
            this._emit(deptKey, "add", request);
            return request;
        },

        // --- remove a request by id (admin / super‑admin only)
        remove: function (deptKey, id) {
            var list = this.get(deptKey).filter(function (r) { return r.id !== id; });
            if (list.length !== this.get(deptKey).length) {
                this.set(deptKey, list);
                this._emit(deptKey, "remove", id);
            }
        },

        // --- helper: emit a change event (for future WS‑NOTIFY wiring)
        _emit: function (deptKey, action, data) {
            // placeholder – can be connected to WS_NOTIFY later
            // global console.log("[discounts] " + deptKey + " " + action + ":", data);
        }
    };

    // -------------------------------------------------------------
    // 3.  Utility functions
    // -------------------------------------------------------------
    var _ = {
        // Return the department key from the DEPARTMENTS map.
        deptKey: function (deptName) {
            for (var k in DEPARTMENTS) if (DEPARTMENTS[k] === deptName) return k;
            return null;
        },

        // Return the department name from the map.
        deptName: function (deptKey) {
            return DEPARTMENTS[deptKey] || "Unknown";
        },

        // -----------------------------------------------------------------
        // Role checking
        // -----------------------------------------------------------------
        // Returns true if `role` is in the given array.
        hasRole: function (role, arr) {
            if (!role) return false;
            return arr.some(function (r) { return r && r.toUpperCase() === role.toUpperCase(); });
        },

        // Is the caller allowed to create a discount request?
        // The caller's role (passed as string) must be in ALLOWED_CREATION_ROLES.
        canCreate: function (callerRole) {
            return _.hasRole(callerRole, ALLOWED_CREATION_ROLES);
        },

        // Is the caller allowed to act on a discount (approve/reject/etc.)?
        canApprove: function (callerRole, discount) {
            if (!discount) return false;
            // Super‑admin / admin bypass – you may widen this as you wish.
            if (discount.createdBy === global.user?.username) return true; // creator always sees their own
            return _.hasRole(callerRole, ALLOWED_APPROVER_ROLES);
        },

        // -----------------------------------------------------------------
        // Discount‑type helpers (mirror the Discount app logic)
        // -----------------------------------------------------------------
        calcDiscount: function (type, val, total) {
            var pct = Number(val) || 0;
            var totalNum = Number(total) || 0;
            if (type === "FIXED") {
                var disc = Math.min(val, totalNum);
                return { pct: Number((disc / totalNum * 100).toFixed(1)), disc: disc, final: Number((totalNum - disc).toFixed(2)) };
            } else {
                var disc = Number((totalNum * pct / 100).toFixed(2));
                return { pct: pct, disc: disc, final: Number((totalNum - disc).toFixed(2)) };
            }
        },

        // -----------------------------------------------------------------
        // T‑function stub – replace with your global `T` if you wish
        // -----------------------------------------------------------------
        T: function (k) { return k; }  // <-- replace with window.T or your i18n function
    };

    // -------------------------------------------------------------
    // 4.  Global API exposed to the HTML page
    // -------------------------------------------------------------
    // You can call these from inline onclick handlers or from other JS files.
    // Example: createDiscount("admission", {...});
    global.createDiscount = function (deptName, formData) {
        var key = _.deptKey(deptName);
        if (!key) { global.alert("Unknown department"); return; }

        // 1️⃣ Validate that the caller (global.user) has a permitted role.
        var callerRole = (global.user && global.user.role) ? global.user.role : "";
        if (!_.canCreate(callerRole)) {
            global.alert("You are not authorised to create a discount request.");
            return;
        }

        // 2️⃣ Basic form validation
        if (!formData.patientName) { global.alert("Patient name is required"); return; }
        if (!formData.totalBillAmount) { global.alert("Total bill amount is required"); return; }
        if (!formData.detailedReason) { global.alert("Detailed reason is required"); return; }

        // 2️⃣ Compute discount figures
        var calc = _.calcDiscount(formData.discountType, formData.discountValue, formData.totalBillAmount);

        var routing = resolveApprovalRouting(calc.disc, formData.isBypass);

        // 3️⃣ Build the request object
        var now = new Date().toISOString();
        var request = {
            id: "REQ-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
            department: deptName,
            requestCode: "DISC-" + Math.floor(1000 + Math.random() * 9000),
            patientId: formData.patientId || ("UHID-" + Math.floor(10000 + Math.random() * 90000)),
            patientName: formData.patientName,
            patientAge: formData.patientAge || "N/A",
            patientGender: formData.patientGender || "N/A",
            department: deptName,
            serviceName: formData.serviceName || "Consultation Fees",
            doctorName: formData.doctorName || "",
            particulars: formData.particulars || "Standard billing item",
            referenceName: formData.referenceName || "",
            relativeName: formData.relativeName || "",
            receiptNo: formData.receiptNo || "RCP-" + Math.floor(10000 + Math.random() * 90000),
            billDate: formData.billDate || now.split("T")[0],
            opdIpdNo: formData.opdIpdNo || "OPD-" + Math.floor(1000 + Math.random() * 9000),
            totalBillAmount: Number(formData.totalBillAmount),
            requestedDiscountType: formData.discountType || "PERCENTAGE",
            requestedDiscountVal: Number(formData.discountValue || 0),
            calculatedDiscountAmount: calc.disc,
            finalPayableAmount: calc.final,
            reasonCategory: formData.reasonCategory || "Package Adjustment / Routine",
            detailedReason: formData.detailedReason,
            proofFileName: formData.proofFileName || "Supporting_Document.pdf",
            requestedBy: global.user ? global.user.username : "anonymous",
            requestedByName: global.user ? (global.user.fullName || global.user.name || "") : "",
            requestedByRole: global.user ? global.user.role : "",
            requiredAuthorityRole: routing.requiredRole,
            currentApproverRole: routing.requiredRole,
            status: routing.status,
            isDirectExecutiveGrant: !!formData.isBypass,
            approverComments: formData.isBypass ? "Approved via Executive Direct Grant" : "",
            approvedBy: formData.isBypass ? (global.user ? (global.user.fullName || global.user.username) : "Executive Admin") : "",
            approvalTimestamp: formData.isBypass ? now : null,
            createdAt: now,
            approvalChain: [
                {
                    step: 1,
                    title: formData.isBypass ? "Direct Executive Grant Approval (Bypassed)" : "Discount Asked at Billing Desk",
                    actor: (global.user ? global.user.fullName + " (" + global.user.role + ")" : "Anonymous"),
                    actorUsername: global.user ? global.user.username : "anonymous",
                    role: global.user ? global.user.role : "",
                    action: formData.isBypass ? "APPROVED_BYPASS" : "SUBMITTED",
                    comments: formData.isBypass 
                        ? "Bypassed Approval Matrix — Direct Waiver Granted: ₹" + calc.disc.toLocaleString('en-IN')
                        : "Discount of " + (calc.pct).toFixed(1) + "% (₹" + calc.disc.toLocaleString('en-IN') + ") routed to " + routing.requiredRoleLabel,
                    timestamp: now
                }
            ]
        };

        // 4️⃣ Persist the request to the department‑specific store
        DB.add(key, request);

        // 5️⃣ Notify the approver (very simple toast – replace with WS_NOTIFY later)
        if (global.APP && global.APP.notify) {
            global.APP.notify(
                "New discount request – " + request.requestCode,
                (request.patientName || "") + " – " + global.currency(calc.disc) + " discount needs approval from " + ALLOWED_CREATION_ROLES[0]
            );
        }

        // 5️⃣ Refresh the department list so the UI can show the new item
        global.renderDiscountList(key);

        return request;
    };

    // -------------------------------------------------------------
    // Approval Procedure Matrix Configurator (Admin Only to Edit)
    // -------------------------------------------------------------
    function getApprovalMatrix() {
        var matrix = DB.get('approvalMatrix');
        if (!matrix || typeof matrix !== 'object' || !matrix.tier1Limit) {
            matrix = {
                tier1Limit: 25000,
                tier2Limit: 200000,
                tier1Role: 'BILLING_MANAGER',
                tier1Label: 'Finance Manager',
                tier2Role: 'CFO',
                tier2Label: 'CFO',
                tier3Role: 'MD',
                tier3Label: 'Director'
            };
            DB.set('approvalMatrix', matrix);
        }
        return matrix;
    }

    global.openApprovalMatrixEditModal = function(focusTier) {
        var user = getLoggedInUser();
        if (!isSystemAdmin(user)) {
            if (global.APP && global.APP.notify) global.APP.notify('Only System Administrators can configure the Approval Procedure Matrix.', 'error');
            else alert('Only System Administrators can configure the Approval Procedure Matrix.');
            return;
        }

        var matrix = getApprovalMatrix();
        var existingModal = document.getElementById('approvalMatrixEditModal');
        if (existingModal) existingModal.remove();

        var modal = document.createElement('div');
        modal.id = 'approvalMatrixEditModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
        
        modal.innerHTML = 
            '<div style="background:#fff;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:540px;overflow:hidden;border:1px solid #e2e8f0;animation:fadeIn 0.2s ease-out;">'
            + '  <div style="background:linear-gradient(135deg, #0f172a, #1e293b);padding:16px 20px;color:#fff;display:flex;justify-content:space-between;align-items:center;">'
            + '    <div>'
            + '      <h3 style="margin:0;font-size:16px;font-weight:700;">⚖️ Edit Approval Matrix & Role Routing</h3>'
            + '      <p style="margin:2px 0 0 0;font-size:12px;color:#94a3b8;">Set amounts & assigned roles for 3 Approval Tiers</p>'
            + '    </div>'
            + '    <button onclick="document.getElementById(\'approvalMatrixEditModal\').remove()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">✕</button>'
            + '  </div>'
            + '  <div style="padding:20px;max-height:75vh;overflow-y:auto;display:flex;flex-direction:column;gap:16px;">'

            // Tier 1 Section
            + '    <div style="background:#f8fafc;border:2px solid ' + (focusTier === 'tier1' ? '#3b82f6' : '#e2e8f0') + ';padding:14px;border-radius:12px;">'
            + '      <div style="font-weight:700;font-size:13px;color:#1e40af;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">'
            + '        <span>1️⃣ Tier 1 Approval (First Level)</span>'
            + '        <span style="font-size:11px;background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;">Up to Tier 1 Limit</span>'
            + '      </div>'
            + '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
            + '        <div>'
            + '          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Max Amount Limit (₹):</label>'
            + '          <input type="number" id="mat_t1Limit" value="' + (matrix.tier1Limit || 25000) + '" class="form-control" style="font-size:12px;padding:6px 10px;font-weight:700;">'
            + '        </div>'
            + '        <div>'
            + '          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Assigned Role Title:</label>'
            + '          <input type="text" id="mat_t1Label" value="' + (matrix.tier1Label || 'Finance Manager') + '" class="form-control" style="font-size:12px;padding:6px 10px;">'
            + '        </div>'
            + '      </div>'
            + '    </div>'

            // Tier 2 Section
            + '    <div style="background:#f8fafc;border:2px solid ' + (focusTier === 'tier2' ? '#f59e0b' : '#e2e8f0') + ';padding:14px;border-radius:12px;">'
            + '      <div style="font-weight:700;font-size:13px;color:#b45309;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">'
            + '        <span>2️⃣ Tier 2 Approval (Mid Level)</span>'
            + '        <span style="font-size:11px;background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;">Tier 1 Max to Tier 2 Max</span>'
            + '      </div>'
            + '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
            + '        <div>'
            + '          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Max Amount Limit (₹):</label>'
            + '          <input type="number" id="mat_t2Limit" value="' + (matrix.tier2Limit || 200000) + '" class="form-control" style="font-size:12px;padding:6px 10px;font-weight:700;">'
            + '        </div>'
            + '        <div>'
            + '          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Assigned Role Title:</label>'
            + '          <input type="text" id="mat_t2Label" value="' + (matrix.tier2Label || 'CFO') + '" class="form-control" style="font-size:12px;padding:6px 10px;">'
            + '        </div>'
            + '      </div>'
            + '    </div>'

            // Tier 3 Section
            + '    <div style="background:#f8fafc;border:2px solid ' + (focusTier === 'tier3' ? '#ef4444' : '#e2e8f0') + ';padding:14px;border-radius:12px;">'
            + '      <div style="font-weight:700;font-size:13px;color:#b91c1c;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">'
            + '        <span>3️⃣ Tier 3 Approval (Highest Level)</span>'
            + '        <span style="font-size:11px;background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;">Above Tier 2 Max</span>'
            + '      </div>'
            + '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
            + '        <div>'
            + '          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Min Threshold (₹):</label>'
            + '          <input type="text" value="Above Tier 2 Max" disabled class="form-control" style="font-size:12px;padding:6px 10px;background:#f1f5f9;color:#94a3b8;">'
            + '        </div>'
            + '        <div>'
            + '          <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Assigned Role Title:</label>'
            + '          <input type="text" id="mat_t3Label" value="' + (matrix.tier3Label || 'Director') + '" class="form-control" style="font-size:12px;padding:6px 10px;">'
            + '        </div>'
            + '      </div>'
            + '    </div>'

            + '  </div>'
            + '  <div style="background:#f8fafc;padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;">'
            + '    <button type="button" class="btn btn-outline" style="font-size:12px;padding:6px 14px;" onclick="document.getElementById(\'approvalMatrixEditModal\').remove()">Cancel</button>'
            + '    <button type="button" class="btn btn-primary" style="font-size:12px;padding:6px 16px;font-weight:700;" onclick="saveApprovalMatrixModal()">💾 Save & Apply Matrix</button>'
            + '  </div>'
            + '</div>';

        document.body.appendChild(modal);
    };

    global.saveApprovalMatrixModal = function() {
        var t1 = Number(document.getElementById('mat_t1Limit').value);
        var t2 = Number(document.getElementById('mat_t2Limit').value);
        var t1Label = document.getElementById('mat_t1Label').value.trim() || 'Finance Manager';
        var t2Label = document.getElementById('mat_t2Label').value.trim() || 'CFO';
        var t3Label = document.getElementById('mat_t3Label').value.trim() || 'Director';

        if (isNaN(t1) || t1 <= 0) { alert('Please enter a valid Tier 1 Max Amount limit (> 0).'); return; }
        if (isNaN(t2) || t2 <= t1) { alert('Tier 2 Max Amount limit must be greater than Tier 1 Max Amount (₹' + t1 + ').'); return; }

        var matrix = getApprovalMatrix();
        matrix.tier1Limit = t1;
        matrix.tier2Limit = t2;
        matrix.tier1Label = t1Label;
        matrix.tier2Label = t2Label;
        matrix.tier3Label = t3Label;

        DB.set('approvalMatrix', matrix);

        if (global.APP && global.APP.notify) global.APP.notify('Approval Matrix amounts and role routing updated successfully!', 'success');
        else alert('Approval Matrix amounts and role routing updated successfully!');

        var el = document.getElementById('approvalMatrixEditModal');
        if (el) el.remove();

        var container = document.getElementById('pageContent') || document.querySelector('.page-content');
        if (container && typeof global.renderDiscounts === 'function') global.renderDiscounts(container);
    };

    global.editApprovalMatrixPrompt = function() {
        global.openApprovalMatrixEditModal('tier1');
    };

    function resolveApprovalRouting(discountAmount, isBypass) {
        var matrix = getApprovalMatrix();
        var disc = Number(discountAmount) || 0;

        if (isBypass) {
            return {
                requiredRole: 'ADMIN_BYPASS',
                requiredRoleLabel: 'Direct Executive Grant (Bypassed)',
                status: 'APPROVED',
                statusLabel: 'APPROVED (Direct Grant)'
            };
        }

        if (disc <= matrix.tier1Limit) {
            return {
                requiredRole: matrix.tier1Role,
                requiredRoleLabel: matrix.tier1Label,
                status: 'PENDING_BMGR',
                statusLabel: 'PENDING (Finance Manager)'
            };
        } else if (disc <= matrix.tier2Limit) {
            return {
                requiredRole: matrix.tier2Role,
                requiredRoleLabel: matrix.tier2Label,
                status: 'PENDING_CFO',
                statusLabel: 'PENDING (CFO)'
            };
        } else {
            return {
                requiredRole: matrix.tier3Role,
                requiredRoleLabel: matrix.tier3Label,
                status: 'PENDING_MD',
                statusLabel: 'PENDING (Director)'
            };
        }
    }

    function userCanBypass(user) {
        if (!user) return false;
        var role = String(user.role || '').toLowerCase();
        var uname = String(user.username || '').toLowerCase();
        var isSysAdmin = user.isSuperAdmin || uname === 'admin' || uname === 'superadmin' || role === 'admin' || role === 'superadmin';
        if (isSysAdmin) return true;

        // Check DB users array
        var users = DB.get('users') || [];
        var targetUser = users.find(function(u){ 
            return (u.username && u.username.toLowerCase() === uname) || (u.id && u.id === user.id); 
        });
        if (targetUser && targetUser.canBypassApproval) return true;
        if (user.canBypassApproval) return true;

        return false;
    }

    global.toggleUserPermissionRight = function(uname, permKey) {
        var currentUser = getLoggedInUser();
        var isAdmin = isSystemAdmin(currentUser);
        if (!isAdmin) {
            if (global.APP && global.APP.notify) global.APP.notify('Only System Administrator can configure user permissions.', 'error');
            else alert('Only System Administrator can configure user permissions.');
            return;
        }

        var users = DB.get('users') || [];
        var target = users.find(function(u){ return (u.username && u.username.toLowerCase() === uname.toLowerCase()) || u.id === uname; });
        if (target) {
            target[permKey] = !target[permKey];
            DB.set('users', users);
            var label = permKey === 'canManageDoctors' ? 'Doctor Master' : permKey === 'canManageServices' ? 'Service Master' : 'Bypass Matrix';
            var statusText = target[permKey] ? 'GRANTED' : 'REVOKED';
            if (global.APP && global.APP.notify) global.APP.notify('Permission "' + label + '" ' + statusText + ' for user "' + (target.fullName || target.username) + '".', 'success');
            renderUserPermissionBadges();
            var container = document.getElementById('pageContent') || document.querySelector('.page-content');
            if (container && typeof global.renderDiscounts === 'function') global.renderDiscounts(container);
        }
    };

    function renderUserPermissionBadges() {
        var el = document.getElementById('userBypassDirectoryBadges');
        if (!el) return;
        var users = DB.get('users') || [];
        if (!users.length) {
            el.innerHTML = '<span style="font-size:12px;color:var(--gray);">No users registered in system.</span>';
            return;
        }

        el.innerHTML = users.map(function(u) {
            var uname = u.username || u.id;
            var name = u.fullName || u.name || uname;
            var isSysAdmin = u.isSuperAdmin || String(u.role || '').toLowerCase() === 'admin' || String(u.username || '').toLowerCase() === 'admin';

            var hasBypass = isSysAdmin || !!u.canBypassApproval;
            var hasDocs = isSysAdmin || !!u.canManageDoctors;
            var hasSvcs = isSysAdmin || !!u.canManageServices;

            return '<div style="background:var(--white,#fff);border:1px solid var(--border);padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px;">'
                + '<div>'
                + '  <strong style="font-size:13px;display:block;color:var(--dark);">' + name + ' <small style="color:var(--gray);">(' + (u.role || 'USER') + ' — ' + (u.department || 'General') + ')</small></strong>'
                + '  <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">'
                + '    <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:' + (hasDocs ? '#e8f5e9;color:#2e7d32;' : '#f5f5f5;color:#757575;') + '">🩺 Docs: ' + (hasDocs ? 'Active' : 'Hidden') + '</span>'
                + '    <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:' + (hasSvcs ? '#e3f2fd;color:#1565c0;' : '#f5f5f5;color:#757575;') + '">🔬 Services: ' + (hasSvcs ? 'Active' : 'Hidden') + '</span>'
                + '    <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:' + (hasBypass ? '#fff3e0;color:#e65100;' : '#f5f5f5;color:#757575;') + '">⚡ Bypass: ' + (hasBypass ? 'Active' : 'Standard') + '</span>'
                + '  </div>'
                + '</div>'
                + (isSysAdmin 
                    ? '<span style="font-size:11px;background:#e8f5e9;color:#2e7d32;padding:4px 10px;border-radius:6px;font-weight:bold;">Admin Full Access</span>'
                    : '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
                        + '<button type="button" class="btn btn-sm ' + (hasDocs ? 'btn-outline-danger' : 'btn-outline-primary') + '" style="font-size:11px;padding:2px 8px;" onclick="toggleUserPermissionRight(\'' + uname.replace(/'/g, "\\'") + '\', \'canManageDoctors\')">' + (hasDocs ? 'Revoke Docs' : 'Grant Docs') + '</button>'
                        + '<button type="button" class="btn btn-sm ' + (hasSvcs ? 'btn-outline-danger' : 'btn-outline-primary') + '" style="font-size:11px;padding:2px 8px;" onclick="toggleUserPermissionRight(\'' + uname.replace(/'/g, "\\'") + '\', \'canManageServices\')">' + (hasSvcs ? 'Revoke Svcs' : 'Grant Svcs') + '</button>'
                        + '<button type="button" class="btn btn-sm ' + (hasBypass ? 'btn-outline-danger' : 'btn-outline-warning') + '" style="font-size:11px;padding:2px 8px;" onclick="toggleUserPermissionRight(\'' + uname.replace(/'/g, "\\'") + '\', \'canBypassApproval\')">' + (hasBypass ? 'Revoke Bypass' : 'Grant Bypass') + '</button>'
                      + '</div>')
                + '</div>';
        }).join('');
    }

    global.bypassApproveDiscountRequest = function(deptKey, reqId) {
        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        if (!userCanBypass(user)) {
            if (global.APP && global.APP.notify) global.APP.notify('You are not authorized to bypass approval matrix. Only Admin or users granted Bypass Privilege can perform direct executive approvals.', 'error');
            else alert('You are not authorized to bypass approval matrix. Only Admin or users granted Bypass Privilege can perform direct executive approvals.');
            return;
        }

        if (!confirm('Are you sure you want to BYPASS approval matrix and approve this discount request immediately?')) return;

        var list = DB.get(deptKey) || [];
        var req = list.find(function(r){ return r.id === reqId; });
        if (req) {
            var now = new Date().toISOString();
            req.status = 'APPROVED';
            req.isDirectExecutiveGrant = true;
            req.approvedBy = user ? (user.fullName || user.username) : 'System Admin';
            req.approvalTimestamp = now;
            req.approverComments = 'Approved via Direct Executive Bypass';
            if (!req.approvalChain) req.approvalChain = [];
            req.approvalChain.push({
                step: req.approvalChain.length + 1,
                title: 'Executive Bypass Approval',
                actor: user ? (user.fullName || user.username) : 'System Admin',
                action: 'APPROVED_BYPASS',
                comments: 'Direct Approval Grant (Bypassed Matrix)',
                timestamp: now
            });
            DB.set(deptKey, list);
            if (global.APP && global.APP.notify) global.APP.notify('Request ' + req.requestCode + ' approved via Executive Bypass!', 'success');
            global.renderDiscountList(deptKey);
        }
    };

    // -------------------------------------------------------------
    // Doctor & Services Master Helpers (Account HOD & Admin permission)
    // -------------------------------------------------------------
    var DEFAULT_SERVICES = [
        { name: 'Consultation Fees', department: 'OPD' },
        { name: 'Pathology', department: 'Other Support Service' },
        { name: 'MRI', department: 'Radiology' },
        { name: 'Open MRI', department: 'Radiology' },
        { name: 'X-ray', department: 'Radiology' },
        { name: 'DXA', department: 'Radiology' },
        { name: 'CT Scan', department: 'Radiology' },
        { name: 'Sonography / USG', department: 'Radiology' },
        { name: 'Physiotherapy', department: 'Advance Modality Center' },
        { name: 'EMG/NCV', department: 'Advance Modality Center' },
        { name: 'Rehability', department: 'Advance Modality Center' },
        { name: 'Canteen', department: 'F&B' },
        { name: 'Pharmcy', department: 'Pharmcy' },
        { name: 'IPD', department: 'Clinical Operation' },
        { name: 'Ambulance', department: 'Other Support Service' },
        { name: 'Pain Management', department: 'Other Support Service' }
    ];

    function getServicesList() {
        var services = DB.get('servicesList');
        if (!Array.isArray(services) || services.length === 0) {
            services = DEFAULT_SERVICES;
            DB.set('servicesList', services);
        }
        return services;
    }

    function getDoctorsList() {
        var docs = DB.get('doctorsList');
        if (!Array.isArray(docs) || docs.length === 0) {
            docs = ['Dr. Michael Chang', 'Dr. Sarah Jenkins', 'Dr. Rajesh Sharma', 'Dr. Ananya Patel', 'Dr. Vikram Mehta', 'Dr. Suresh Kumar', 'Dr. Priya Nair'];
            DB.set('doctorsList', docs);
        }
        return docs;
    }

    function getLoggedInUser() {
        var u = null;
        if (global.AUTH && typeof global.AUTH.currentUser === 'function') {
            u = global.AUTH.currentUser();
        }
        if (!u && global.user) u = global.user;
        if (!u) {
            try {
                var raw = localStorage.getItem('hms_currentUser');
                if (raw) u = JSON.parse(raw);
            } catch(e) {}
        }
        if (!u) {
            try {
                var rawAct = localStorage.getItem('carepulse_active_user');
                if (rawAct) {
                    var users = DB.get('users') || [];
                    u = users.find(function(usr){ return usr.id === rawAct || usr.username === rawAct; });
                }
            } catch(e) {}
        }
        return u;
    }

    function isSystemAdmin(user) {
        if (!user) return false;
        if (user.isSuperAdmin === true) return true;
        var role = String(user.role || '').toLowerCase();
        var uname = String(user.username || '').toLowerCase();
        return uname === 'admin' || uname === 'superadmin' || role === 'admin' || role === 'superadmin';
    }

    function canManageDoctors(user) {
        if (!user) return false;
        if (isSystemAdmin(user)) return true;
        var uname = String(user.username || '').toLowerCase();
        var users = DB.get('users') || [];
        var targetUser = users.find(function(u){ 
            return (u.username && u.username.toLowerCase() === uname) || (u.id && u.id === user.id); 
        });
        if (targetUser && targetUser.canManageDoctors) return true;
        if (user.canManageDoctors) return true;
        return false;
    }

    function canManageServices(user) {
        if (!user) return false;
        if (isSystemAdmin(user)) return true;
        var uname = String(user.username || '').toLowerCase();
        var users = DB.get('users') || [];
        var targetUser = users.find(function(u){ 
            return (u.username && u.username.toLowerCase() === uname) || (u.id && u.id === user.id); 
        });
        if (targetUser && targetUser.canManageServices) return true;
        if (user.canManageServices) return true;
        return false;
    }

    global.removeDoctorByName = function(docName) {
        if (!confirm('Are you sure you want to remove "' + docName + '" from the Doctor Directory?')) return;
        var docs = getDoctorsList();
        docs = docs.filter(function(d){ return d !== docName; });
        DB.set('doctorsList', docs);
        if (global.APP && global.APP.notify) global.APP.notify('Doctor "' + docName + '" removed!', 'info');
        renderDoctorBadges();
    };

    global.addDoctorFromInlineInput = function() {
        var input = document.getElementById('newDoctorInputInline');
        if (!input || !input.value.trim()) return;
        var cleanName = input.value.trim();
        var docs = getDoctorsList();
        if (docs.indexOf(cleanName) === -1) {
            docs.push(cleanName);
            DB.set('doctorsList', docs);
            if (global.APP && global.APP.notify) global.APP.notify('Doctor "' + cleanName + '" added successfully!', 'success');
            input.value = '';
            renderDoctorBadges();
        } else {
            if (global.APP && global.APP.notify) global.APP.notify('Doctor already exists.', 'warning');
        }
    };

    function renderDoctorBadges() {
        var el = document.getElementById('doctorDirectoryBadges');
        if (!el) return;
        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        var canAddDoc = canManageDoctors(user);
        var docs = getDoctorsList();

        if (docs.length === 0) {
            el.innerHTML = '<span style="font-size:12px;color:var(--gray);">No doctors added yet.</span>';
            return;
        }

        el.innerHTML = docs.map(function(d) {
            return '<span class="badge" style="background:var(--white,#fff);border:1px solid var(--border);color:var(--dark);padding:4px 8px;border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">'
                + '🩺 ' + d
                + (canAddDoc ? ' <button type="button" onclick="removeDoctorByName(\'' + d.replace(/'/g, "\\'") + '\')" style="background:none;border:none;color:var(--danger);font-weight:bold;cursor:pointer;padding:0;margin-left:4px;font-size:12px;" title="Remove Doctor">✕</button>' : '')
                + '</span>';
        }).join('');
    }

    global.removeServiceByName = function(svcName) {
        if (!confirm('Are you sure you want to remove service "' + svcName + '"?')) return;
        var list = getServicesList();
        list = list.filter(function(s){ return (typeof s === 'object' ? s.name : s) !== svcName; });
        DB.set('servicesList', list);
        if (global.APP && global.APP.notify) global.APP.notify('Service "' + svcName + '" removed!', 'info');
        renderServiceBadges();
    };

    global.addServiceFromInlineInput = function() {
        var nameInput = document.getElementById('newServiceNameInline');
        var deptInput = document.getElementById('newServiceDeptInline');
        if (!nameInput || !nameInput.value.trim()) return;
        var name = nameInput.value.trim();
        var dept = (deptInput && deptInput.value.trim()) ? deptInput.value.trim() : 'General';
        var list = getServicesList();
        if (!list.some(function(s){ return (typeof s === 'object' ? s.name : s).toLowerCase() === name.toLowerCase(); })) {
            list.push({ name: name, department: dept });
            DB.set('servicesList', list);
            if (global.APP && global.APP.notify) global.APP.notify('Service "' + name + '" added successfully!', 'success');
            nameInput.value = '';
            if (deptInput) deptInput.value = '';
            renderServiceBadges();
        } else {
            if (global.APP && global.APP.notify) global.APP.notify('Service already exists.', 'warning');
        }
    };

    function renderServiceBadges() {
        var el = document.getElementById('serviceDirectoryBadges');
        if (!el) return;
        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        var canAddDoc = canManageDoctors(user);
        var list = getServicesList();

        if (list.length === 0) {
            el.innerHTML = '<span style="font-size:12px;color:var(--gray);">No services added yet.</span>';
            return;
        }

        el.innerHTML = list.map(function(s) {
            var sName = typeof s === 'object' ? s.name : s;
            var sDept = typeof s === 'object' ? (s.department || 'General') : 'General';
            return '<span class="badge" style="background:var(--white,#fff);border:1px solid var(--border);color:var(--dark);padding:4px 8px;border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">'
                + '🔬 <strong>' + sName + '</strong> <small style="color:var(--gray);">(' + sDept + ')</small>'
                + (canAddDoc ? ' <button type="button" onclick="removeServiceByName(\'' + sName.replace(/'/g, "\\'") + '\')" style="background:none;border:none;color:var(--danger);font-weight:bold;cursor:pointer;padding:0;margin-left:4px;font-size:12px;" title="Remove Service">✕</button>' : '')
                + '</span>';
        }).join('');
    }

    global.addNewDoctorPrompt = function() {
        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        if (!canManageDoctors(user)) {
            if (global.APP && global.APP.notify) global.APP.notify('Only Accounts HOD and Admins are authorized to add new doctors.', 'error');
            else alert('Only Accounts HOD and Admins are authorized to add new doctors.');
            return;
        }
        var name = prompt('Enter new Doctor Name (e.g. Dr. Ramesh Gupta):');
        if (name && name.trim()) {
            var docs = getDoctorsList();
            var cleanName = name.trim();
            if (docs.indexOf(cleanName) === -1) {
                docs.push(cleanName);
                DB.set('doctorsList', docs);
                if (global.APP && global.APP.notify) global.APP.notify('Doctor "' + cleanName + '" added to master list!', 'success');
                var sel = document.querySelector('select[name="doctorName"]');
                if (sel) {
                    var opt = document.createElement('option');
                    opt.value = cleanName;
                    opt.textContent = cleanName;
                    opt.selected = true;
                    sel.appendChild(opt);
                }
                renderDoctorBadges();
            } else {
                if (global.APP && global.APP.notify) global.APP.notify('Doctor already exists in master list.', 'warning');
            }
        }
    };

    global.addNewServicePrompt = function() {
        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        if (!canManageDoctors(user)) {
            if (global.APP && global.APP.notify) global.APP.notify('Only Accounts HOD and Admins are authorized to add new services.', 'error');
            else alert('Only Accounts HOD and Admins are authorized to add new services.');
            return;
        }
        var name = prompt('Enter new Service Name (e.g. MRI Scan, Pathology):');
        if (name && name.trim()) {
            var dept = prompt('Enter Department for this Service (e.g. Radiology, OPD):', 'General');
            var list = getServicesList();
            var cleanName = name.trim();
            var cleanDept = (dept && dept.trim()) ? dept.trim() : 'General';
            if (!list.some(function(s){ return (typeof s === 'object' ? s.name : s).toLowerCase() === cleanName.toLowerCase(); })) {
                list.push({ name: cleanName, department: cleanDept });
                DB.set('servicesList', list);
                if (global.APP && global.APP.notify) global.APP.notify('Service "' + cleanName + '" added to master list!', 'success');
                var sel = document.querySelector('select[name="serviceName"]');
                if (sel) {
                    var opt = document.createElement('option');
                    opt.value = cleanName;
                    opt.textContent = cleanName + ' (' + cleanDept + ')';
                    opt.selected = true;
                    sel.appendChild(opt);
                }
                renderServiceBadges();
            } else {
                if (global.APP && global.APP.notify) global.APP.notify('Service already exists in master list.', 'warning');
            }
        }
    };

    global.setDiscountPresetPct = function(pct) {
        var form = document.getElementById('receptionForm');
        if (!form) return;
        var typeSel = form.querySelector('[name="discountType"]');
        var valInput = form.querySelector('[name="discountValue"]');
        if (typeSel) typeSel.value = 'PERCENTAGE';
        if (valInput) valInput.value = pct;
        global.updateDiscountLiveCalc();
    };

    global.updateDiscountLiveCalc = function() {
        var form = document.getElementById('receptionForm');
        if (!form) return;
        var totalBill = Number(form.querySelector('[name="totalBillAmount"]').value) || 0;
        var discType = form.querySelector('[name="discountType"]').value || 'PERCENTAGE';
        var discVal = Number(form.querySelector('[name="discountValue"]').value) || 0;

        var discAmt = 0;
        if (discType === 'FIXED') {
            discAmt = Math.min(discVal, totalBill);
        } else {
            discAmt = Number((totalBill * discVal / 100).toFixed(2));
        }
        var payable = Math.max(0, Number((totalBill - discAmt).toFixed(2)));

        var discEl = document.getElementById('liveCalcDiscountAmt');
        var payableEl = document.getElementById('liveCalcPayableAmt');
        if (discEl) discEl.textContent = '₹' + discAmt.toLocaleString('en-IN');
        if (payableEl) payableEl.textContent = '₹' + payable.toLocaleString('en-IN');
    };

    // -------------------------------------------------------------
    // 5.  Reception module – for employees (uses createDiscount above)
    // -------------------------------------------------------------
    global.showReceptionDiscountForm = function () {
        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        var docs = getDoctorsList();
        var docOptions = docs.map(function(d){ return '<option value="' + d + '">' + d + '</option>'; }).join('');

        var services = getServicesList();
        var serviceOptions = services.map(function(s){
            var sName = typeof s === 'object' ? s.name : s;
            var sDept = typeof s === 'object' ? (s.department || 'General') : 'General';
            return '<option value="' + sName + '">' + sName + ' (' + sDept + ')</option>';
        }).join('');

        var canAddDoc = canManageDoctors(user);

        var autoPatientId = 'UHID-' + Math.floor(10000 + Math.random() * 90000);

        var html = [
            '<form id="receptionForm">',
            '<div class="form-group mb-3">',
            '  <label style="font-weight:600;margin-bottom:4px;display:block;">Patient ID / UHID No. *</label>',
            '  <input type="text" name="patientId" class="form-control" value="' + autoPatientId + '" required>',
            '</div>',
            '<div class="form-group mb-3">',
            '  <label style="font-weight:600;margin-bottom:4px;display:block;">Patient Full Name *</label>',
            '  <input type="text" name="patientName" class="form-control" placeholder="e.g. Ramesh Kumar" required>',
            '</div>',
            '<div class="form-group mb-3">',
            '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">',
            '    <label style="font-weight:600;margin:0;">Hospital Service / Category *</label>',
            (canAddDoc ? '    <button type="button" class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 8px;" onclick="addNewServicePrompt()">➕ Add Service (Account HOD/Admin)</button>' : '<small style="color:var(--gray);font-size:11px;">Managed by Accounts HOD/Admin</small>'),
            '  </div>',
            '  <select name="serviceName" class="form-control" required>',
            serviceOptions,
            '  </select>',
            '</div>',
            '<div class="form-group mb-3">',
            '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">',
            '    <label style="font-weight:600;margin:0;">Attending Doctor Name *</label>',
            (canAddDoc ? '    <button type="button" class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 8px;" onclick="addNewDoctorPrompt()">➕ Add Doctor (Account HOD/Admin)</button>' : '<small style="color:var(--gray);font-size:11px;">Managed by Accounts HOD/Admin</small>'),
            '  </div>',
            '  <select name="doctorName" class="form-control" required>',
            docOptions,
            '  </select>',
            '</div>',
            '<div class="grid-2 mb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">',
            '  <div class="form-group">',
            '    <label style="font-weight:600;margin-bottom:4px;display:block;">Total Bill Amount <small>₹</small> *</label>',
            '    <input type="number" name="totalBillAmount" class="form-control" step="0.01" placeholder="e.g. 15000" oninput="updateDiscountLiveCalc()" required>',
            '  </div>',
            '  <div class="form-group">',
            '    <label style="font-weight:600;margin-bottom:4px;display:block;">Discount Type</label>',
            '    <select name="discountType" class="form-control" onchange="updateDiscountLiveCalc()">',
            '      <option value="PERCENTAGE">Percentage (%)</option>',
            '      <option value="FIXED">Fixed Amount (₹)</option>',
            '    </select>',
            '  </div>',
            '</div>',
            '<div class="form-group mb-3">',
            '  <label style="font-weight:600;margin-bottom:4px;display:block;">Discount Percentage Quick Select Range</label>',
            '  <div style="display:flex;gap:6px;flex-wrap:wrap;">',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(5)">5%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(10)">10%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(15)">15%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(20)">20%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(25)">25%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(30)">30%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(50)">50%</button>',
            '    <button type="button" class="btn btn-sm btn-outline" style="font-size:12px;padding:4px 10px;font-weight:bold;color:var(--primary);" onclick="setDiscountPresetPct(100)">100%</button>',
            '  </div>',
            '</div>',
            '<div class="form-group mb-3">',
            '  <label style="font-weight:600;margin-bottom:4px;display:block;">Discount Value *</label>',
            '  <input type="number" name="discountValue" class="form-control" min="0" step="0.01" placeholder="e.g. 15" oninput="updateDiscountLiveCalc()" required>',
            '</div>',
            '<div style="background:#e8f5e9;border:1px solid #c8e6c9;padding:10px 14px;border-radius:8px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;">',
            '  <div>',
            '    <span style="font-size:11px;color:#2e7d32;font-weight:600;display:block;">Discount Waiver Amount</span>',
            '    <strong id="liveCalcDiscountAmt" style="font-size:16px;color:#2e7d32;">₹0</strong>',
            '  </div>',
            '  <div>',
            '    <span style="font-size:11px;color:#1b5e20;font-weight:700;display:block;">Net Amount Payable After Discount</span>',
            '    <strong id="liveCalcPayableAmt" style="font-size:16px;color:#1b5e20;">₹0</strong>',
            '  </div>',
            '</div>',
            '<div class="form-group mb-3">',
            '  <label style="font-weight:600;margin-bottom:4px;display:block;">Detailed Reason for Concession *</label>',
            '  <textarea name="detailedReason" class="form-control" rows="3" placeholder="Enter reason for discount request..." required></textarea>',
            '</div>',
            (userCanBypass(user) ? 
              '<div class="form-group mb-3" style="background:#fff3e0;border:1px solid #ffe0b2;padding:10px 12px;border-radius:8px;">'
              + '  <label style="display:flex;align-items:center;gap:8px;font-weight:700;color:#e65100;cursor:pointer;margin:0;font-size:13px;">'
              + '    <input type="checkbox" name="isBypass" style="width:16px;height:16px;accent-color:#e65100;">'
              + '    <span>⚡ Bypass Approval Matrix (Direct Executive Grant)</span>'
              + '  </label>'
              + '  <small style="display:block;color:#bf360c;margin-top:2px;font-size:11px;">Directly approves request immediately (Admin-granted privilege for user: ' + (user ? (user.fullName || user.username) : 'Admin') + ').</small>'
              + '</div>'
             :
              '<div class="form-group mb-3" style="background:#f5f5f5;border:1px solid #e0e0e0;padding:8px 12px;border-radius:8px;">'
              + '  <small style="color:var(--gray);font-size:11px;">🔒 Standard Approval Procedure Matrix applies. (Bypass Approval permission is managed by Admin per user).</small>'
              + '</div>'
            ),
            '</form>'
        ].join("");

        global.openFormModal("🏷️ New Discount Request", html, "submitDiscountFormFromModal()", false);
    };

    global.submitDiscountFormFromModal = function() {
        var form = document.getElementById('receptionForm');
        if (!form) return;

        var patientId   = (form.querySelector('[name="patientId"]').value || '').trim();
        var patientName = (form.querySelector('[name="patientName"]').value || '').trim();
        var serviceName = (form.querySelector('[name="serviceName"]').value || '').trim();
        var doctorName  = (form.querySelector('[name="doctorName"]').value || '').trim();
        var totalBill   = (form.querySelector('[name="totalBillAmount"]').value || '').trim();
        var discType    = (form.querySelector('[name="discountType"]').value || 'PERCENTAGE');
        var discVal     = (form.querySelector('[name="discountValue"]').value || '').trim();
        var reason      = (form.querySelector('[name="detailedReason"]').value || '').trim();
        var isBypass    = form.querySelector('[name="isBypass"]') ? form.querySelector('[name="isBypass"]').checked : false;

        if (!patientId || !patientName || !totalBill || !discVal || !reason) {
            if (global.APP && global.APP.notify) global.APP.notify('Please fill out all required fields.', 'error');
            else alert('Please fill out all required fields.');
            return;
        }

        var formData = {
            patientId: patientId,
            patientName: patientName,
            serviceName: serviceName,
            doctorName: doctorName,
            totalBillAmount: Number(totalBill),
            discountType: discType,
            discountValue: Number(discVal),
            detailedReason: reason,
            isBypass: isBypass
        };

        global.createDiscount("reception", formData);
        global.closeFormModal();
    };

    // -------------------------------------------------------------
    // 6.  Department‑specific list renderers
    // -------------------------------------------------------------
    global.renderDiscountList = function (deptKey) {
        var list = DB.get(deptKey) || [];
        var container = document.getElementById("discountList_" + deptKey);
        if (!container) return;

        if (!list.length) {
            container.innerHTML = "<p style='color:var(--gray);font-size:14px;padding:16px;text-align:center;'>No discount requests for " + _.deptName(deptKey) + ".</p>";
            return;
        }

        var user = (global.AUTH && global.AUTH.currentUser) ? global.AUTH.currentUser() : null;
        var isAdmin = !user || user.isSuperAdmin || ['admin', 'superadmin', 'md', 'director', 'chairman', 'executive', 'cfo'].indexOf(String(user.role || '').toLowerCase()) !== -1;

        var html = "<div class='table-responsive'><table class='table' style='width:100%;font-size:13px;border-collapse:collapse;'><thead><tr style='background:var(--light-gray);'>"
            + "<th style='padding:10px;'>Code</th><th style='padding:10px;'>Patient ID</th><th style='padding:10px;'>Patient Name</th><th style='padding:10px;'>Service</th><th style='padding:10px;'>Doctor Name</th><th style='padding:10px;'>Total Bill</th><th style='padding:10px;'>Discount</th><th style='padding:10px;'>Payable</th><th style='padding:10px;'>Requested By</th><th style='padding:10px;text-align:center;'>Status</th><th style='padding:10px;text-align:center;'>Actions</th>"
            + "</tr></thead><tbody>";
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            var isApproved = r.status === 'APPROVED';
            var statusBadge = isApproved 
                ? "<span class='badge badge-success' style='background:#2e7d32;color:#fff;'>APPROVED" + (r.isDirectExecutiveGrant ? " (Grant)" : "") + "</span>" 
                : "<span class='badge badge-warning'>" + (r.status || "PENDING") + "</span>";

            var actionBtns = "";
            if (!isApproved && isAdmin) {
                actionBtns = "<button type='button' class='btn btn-sm btn-outline' style='font-size:11px;padding:3px 8px;color:#e65100;border-color:#ffe0b2;' onclick='bypassApproveDiscountRequest(\"" + deptKey + "\", \"" + r.id + "\")'>⚡ Bypass & Approve</button>";
            } else if (isApproved) {
                actionBtns = "<span style='color:var(--success);font-weight:bold;font-size:11px;'>✓ Approved</span>";
            } else {
                actionBtns = "<span style='color:var(--gray);font-size:11px;'>In Routing</span>";
            }

            html += "<tr style='border-bottom:1px solid var(--border);'>"
                + "<td style='padding:10px;'><strong>" + (r.requestCode || "—") + "</strong></td>"
                + "<td style='padding:10px;'><span class='badge badge-info' style='font-size:11px;'>" + (r.patientId || "—") + "</span></td>"
                + "<td style='padding:10px;font-weight:600;'>" + (r.patientName || "—") + "</td>"
                + "<td style='padding:10px;'><span class='badge' style='background:#e3f2fd;color:#0d47a1;font-size:11px;'>" + (r.serviceName || "Consultation Fees") + "</span></td>"
                + "<td style='padding:10px;'>" + (r.doctorName || "—") + "</td>"
                + "<td style='padding:10px;font-weight:700;'>₹" + (r.totalBillAmount || 0).toLocaleString('en-IN') + "</td>"
                + "<td style='padding:10px;color:var(--primary);font-weight:700;'>₹" + (r.calculatedDiscountAmount || 0).toLocaleString('en-IN') + " (" + (r.requestedDiscountVal || 0) + (r.requestedDiscountType === 'PERCENTAGE' ? '%' : '₹') + ")</td>"
                + "<td style='padding:10px;font-weight:700;color:var(--success);'>₹" + (r.finalPayableAmount || 0).toLocaleString('en-IN') + "</td>"
                + "<td style='padding:10px;color:var(--gray);'>" + (r.requestedByName || r.requestedBy || "—") + "</td>"
                + "<td style='padding:10px;text-align:center;'>" + statusBadge + "</td>"
                + "<td style='padding:10px;text-align:center;'>" + actionBtns + "</td>"
                + "</tr>";
        }
        html += "</tbody></table></div>";
        container.innerHTML = html;
    };

    // Main module renderer called by Router.navigate('discounts')
    global.renderDiscounts = function (container) {
        if (!container) return;
        var user = getLoggedInUser();
        var canAddDoc = canManageDoctors(user);
        var canAddSvc = canManageServices(user);
        var matrix = getApprovalMatrix();
        var isAdmin = isSystemAdmin(user);

        container.innerHTML = 
            '<div class="card">'
            + '<div class="flex-between mb-4" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">'
            + '  <div>'
            + '    <h2 style="margin:0;font-size:20px;font-weight:700;">🏷️ Discount Permission System</h2>'
            + '    <p style="font-size:13px;color:var(--gray);margin:4px 0 0 0;">Manage and approve department discount requests across Admission, Accounting, Radiology, and Reception</p>'
            + '  </div>'
            + '  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
            + (canAddSvc ? '    <button class="btn btn-outline btn-sm" onclick="addNewServicePrompt()">➕ Add Service</button>' : '')
            + (canAddDoc ? '    <button class="btn btn-outline btn-sm" onclick="addNewDoctorPrompt()">➕ Add Doctor</button>' : '')
            + '    <button class="btn btn-primary btn-sm" onclick="showReceptionDiscountForm()">+ New Request</button>'
            + '  </div>'
            + '</div>'

            // Approval Procedure Matrix Card (Interactive Edit for Admin)
            + '<div style="background:var(--light-gray,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:12px;">'
            + '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">'
            + '    <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;">⚖️ Approval Procedure - All Department <small style="font-weight:normal;color:var(--gray);">(Amount-Based Routing & Matrix)</small></div>'
            + (isAdmin ? '    <button class="btn btn-sm btn-outline" style="font-size:11px;padding:3px 8px;font-weight:700;" onclick="openApprovalMatrixEditModal(\'tier1\')">✏️ Edit Matrix & Roles (Admin Only)</button>' : '')
            + '  </div>'
            + '  <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;font-size:12px;">'
            + '    <div ' + (isAdmin ? 'onclick="openApprovalMatrixEditModal(\'tier1\')" title="Click to edit Tier 1 Amount & Role" style="background:var(--white,#fff);border:1.5px dashed var(--primary);padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;" class="hover-card"' : 'style="background:var(--white,#fff);border:1px solid var(--border);padding:10px 12px;border-radius:8px;"') + '>'
            + '      <div style="display:flex;justify-content:space-between;align-items:center;">'
            + '        <span style="color:var(--gray);font-size:11px;font-weight:600;">Tier 1 Approval</span>'
            + (isAdmin ? '        <small style="color:var(--primary);font-size:10px;font-weight:bold;">✏️ Edit</small>' : '')
            + '      </div>'
            + '      <strong style="color:var(--primary);font-size:13px;display:block;margin-top:2px;">Up to ₹' + (matrix.tier1Limit || 25000).toLocaleString('en-IN') + '/-</strong>'
            + '      <span style="display:block;color:var(--dark);font-size:11px;font-weight:600;margin-top:2px;">Trf to ' + (matrix.tier1Label || 'Finance Manager') + '</span>'
            + '    </div>'
            + '    <div ' + (isAdmin ? 'onclick="openApprovalMatrixEditModal(\'tier2\')" title="Click to edit Tier 2 Amount & Role" style="background:var(--white,#fff);border:1.5px dashed #ed6c02;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;" class="hover-card"' : 'style="background:var(--white,#fff);border:1px solid var(--border);padding:10px 12px;border-radius:8px;"') + '>'
            + '      <div style="display:flex;justify-content:space-between;align-items:center;">'
            + '        <span style="color:var(--gray);font-size:11px;font-weight:600;">Tier 2 Approval</span>'
            + (isAdmin ? '        <small style="color:#ed6c02;font-size:10px;font-weight:bold;">✏️ Edit</small>' : '')
            + '      </div>'
            + '      <strong style="color:#ed6c02;font-size:13px;display:block;margin-top:2px;">Above ₹' + (matrix.tier1Limit || 25000).toLocaleString('en-IN') + '/- - ₹' + (matrix.tier2Limit || 200000).toLocaleString('en-IN') + '/-</strong>'
            + '      <span style="display:block;color:var(--dark);font-size:11px;font-weight:600;margin-top:2px;">Trf to ' + (matrix.tier2Label || 'CFO') + '</span>'
            + '    </div>'
            + '    <div ' + (isAdmin ? 'onclick="openApprovalMatrixEditModal(\'tier3\')" title="Click to edit Tier 3 Role" style="background:var(--white,#fff);border:1.5px dashed #d32f2f;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;" class="hover-card"' : 'style="background:var(--white,#fff);border:1px solid var(--border);padding:10px 12px;border-radius:8px;"') + '>'
            + '      <div style="display:flex;justify-content:space-between;align-items:center;">'
            + '        <span style="color:var(--gray);font-size:11px;font-weight:600;">Tier 3 Approval</span>'
            + (isAdmin ? '        <small style="color:#d32f2f;font-size:10px;font-weight:bold;">✏️ Edit</small>' : '')
            + '      </div>'
            + '      <strong style="color:#d32f2f;font-size:13px;display:block;margin-top:2px;">Above ₹' + (matrix.tier2Limit || 200000).toLocaleString('en-IN') + '/-</strong>'
            + '      <span style="display:block;color:var(--dark);font-size:11px;font-weight:600;margin-top:2px;">Trf to ' + (matrix.tier3Label || 'Director') + '</span>'
            + '    </div>'
            + '  </div>'
            + '</div>'
            + (canAddSvc ? 
                '<div style="background:var(--light-gray,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:12px;">'
                + '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
                + '    <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;">🔬 Services Directory Control <small style="font-weight:normal;color:var(--gray);">(Admin-Granted Permission)</small></div>'
                + '    <div style="display:flex;gap:6px;">'
                + '      <input type="text" id="newServiceNameInline" placeholder="Service Name..." class="form-control" style="width:140px;font-size:12px;padding:4px 8px;">'
                + '      <input type="text" id="newServiceDeptInline" placeholder="Department..." class="form-control" style="width:120px;font-size:12px;padding:4px 8px;">'
                + '      <button class="btn btn-sm btn-primary" style="font-size:12px;padding:4px 10px;" onclick="addServiceFromInlineInput()">➕ Add Service</button>'
                + '    </div>'
                + '  </div>'
                + '  <div id="serviceDirectoryBadges" style="display:flex;flex-wrap:wrap;gap:6px;"></div>'
                + '</div>'
              : '')
            + (canAddDoc ?
                '<div style="background:var(--light-gray,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:16px;">'
                + '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
                + '    <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;">🩺 Doctor Directory Control <small style="font-weight:normal;color:var(--gray);">(Admin-Granted Permission)</small></div>'
                + '    <div style="display:flex;gap:6px;">'
                + '      <input type="text" id="newDoctorInputInline" placeholder="New Doctor Name..." class="form-control" style="width:180px;font-size:12px;padding:4px 8px;">'
                + '      <button class="btn btn-sm btn-primary" style="font-size:12px;padding:4px 10px;" onclick="addDoctorFromInlineInput()">➕ Add Doctor</button>'
                + '    </div>'
                + '  </div>'
                + '  <div id="doctorDirectoryBadges" style="display:flex;flex-wrap:wrap;gap:6px;"></div>'
                + '</div>'
              : '')
            + '<div class="tab-container" style="display:flex;gap:8px;border-bottom:1px solid var(--border-color);margin-bottom:16px;">'
            + '  <button class="tab-btn active" onclick="switchDiscountTab(\'admission\', this)">Admission</button>'
            + '  <button class="tab-btn" onclick="switchDiscountTab(\'account\', this)">Accounting</button>'
            + '  <button class="tab-btn" onclick="switchDiscountTab(\'radiology\', this)">Radiology</button>'
            + '  <button class="tab-btn" onclick="switchDiscountTab(\'reception\', this)">Reception</button>'
            + '</div>'
            + '<div id="discountList_admission"></div>'
            + '<div id="discountList_account" style="display:none;"></div>'
            + '<div id="discountList_radiology" style="display:none;"></div>'
            + '<div id="discountList_reception" style="display:none;"></div>'
            + '</div>';

        if (canAddSvc) renderServiceBadges();
        if (canAddDoc) renderDoctorBadges();

        global.switchDiscountTab = function(deptKey, btnEl) {
            ['admission', 'account', 'radiology', 'reception'].forEach(function(dk) {
                var el = document.getElementById('discountList_' + dk);
                if (el) el.style.display = (dk === deptKey) ? 'block' : 'none';
            });
            if (btnEl && btnEl.parentElement) {
                var btns = btnEl.parentElement.querySelectorAll('.tab-btn');
                btns.forEach(function(b) { b.classList.remove('active'); });
                btnEl.classList.add('active');
            }
            global.renderDiscountList(deptKey);
        };

        global.renderDiscountList('admission');
        global.renderDiscountList('account');
        global.renderDiscountList('radiology');
        global.renderDiscountList('reception');
    };

    // -------------------------------------------------------------
    // 7.  Initialisation – run once when the page loads
    // -------------------------------------------------------------
    try {
        for (var dk in DEPARTMENTS) {
            if (document.getElementById("discountList_" + dk)) {
                global.renderDiscountList(dk);
            }
        }
    } catch(e) {}

    // (c) Expose a couple of tiny helpers for the console / dev tools
    global.DISCOUNT_MODULE = {
        departments: DEPARTMENTS,
        allowedCreationRoles: ALLOWED_CREATION_ROLES,
        allowedApproverRoles: ALLOWED_APPROVER_ROLES,
        db: DB,
        calc: _.calcDiscount,
        T: _
    };

})(window);