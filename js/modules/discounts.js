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

        // 3️⃣ Build the request object
        var now = new Date().toISOString();
        var request = {
            id: "REQ-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
            department: deptName,
            requestCode: "DISC-" + Math.floor(1000 + Math.random() * 9000),
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
            requiredAuthorityRole: ALLOWED_CREATION_ROLES[0], // will be resolved by the role‑check above
            currentApproverRole: ALLOWED_CREATION_ROLES[0],
            status: "PENDING_BMGR",           // first‑step status
            isDirectExecutiveGrant: false,
            approverComments: "",
            approvedBy: "",
            approvalTimestamp: null,
            createdAt: now,
            approvalChain: [
                {
                    step: 1,
                    title: "Discount Asked at Billing Desk",
                    actor: (global.user ? global.user.fullName + " (" + global.user.role + ")" : "Anonymous"),
                    actorUsername: global.user ? global.user.username : "anonymous",
                    role: global.user ? global.user.role : "",
                    action: "SUBMITTED",
                    comments: "Discount of " + (calc.pct).toFixed(1) + "% (" + global.currency(calc.disc) + ") requested during billing payment.",
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
    // 5.  Reception module – for employees (uses createDiscount above)
    // -------------------------------------------------------------
    global.showReceptionDiscountForm = function () {
        // Very simple form – in a real app you’d use a proper modal library.
        var dept = DEPARTMENTS.reception;
        var html = [
            '<form id="receptionForm">',
            '<div class="form-group">',
            '  <label>Patient Name *</label>',
            '  <input type="text" name="patientName" required>',
            '</div>',
            '<div class="form-group">',
            '  <label>Total Bill <small>₹</small> *</label>',
            '  <input type="number" name="totalBillAmount" step="0.01" required>',
            '</div>',
            '<div class="form-group">',
            '  <label>Discount Type</label>',
            '  <select name="discountType">',
            '    <option value="PERCENTAGE">Percentage</option>',
            '    <option value="FIXED">Fixed Amount</option>',
            '</select>',
            '</div>',
            '<div class="form-group">',
            '  <label>Discount Value *</label>',
            '  <input type="number" name="discountValue" min="0" step="0.01" required>',
            '</div>',
            '<div class="form-group">',
            '  <label>Detailed Reason *</label>',
            '  <textarea name="detailedReason" rows="3" required></textarea>',
            '</div>',
            '</form>',
            '<div style="margin-top:12px;">',
            '  <button type="button" onclick="createDiscount(\"reception\", window.formData)" class="btn btn-primary">Submit Discount Request</button>',
            '  <button type="button" onclick="document.getElementById(\'receptionForm\').reset()" class="btn btn-secondary">Reset</button>',
            '</div>'
        ].join("");

        global.openFormModal("New Discount Request (Reception)", html, function () {
            // form was submitted inside createDiscount – nothing extra needed here
        });
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

        var html = "<div class='table-responsive'><table><thead><tr>"
            + "<th>Code</th><th>Patient</th><th>Amount</th><th>Discount</th><th>Payable</th><th>Requested By</th><th>Status</th>"
            + "</tr></thead><tbody>";
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            var statusBadge = "<span class='badge badge-warning'>" + (r.status || "PENDING") + "</span>";
            html += "<tr>"
                + "<td><strong>" + (r.requestCode || "—") + "</strong></td>"
                + "<td>" + (r.patientName || "—") + "</td>"
                + "<td>₹" + (r.totalBillAmount || 0) + "</td>"
                + "<td>₹" + (r.calculatedDiscountAmount || 0) + " (" + (r.requestedDiscountVal || 0) + (r.requestedDiscountType === 'PERCENTAGE' ? '%' : '₹') + ")</td>"
                + "<td>₹" + (r.finalPayableAmount || 0) + "</td>"
                + "<td>" + (r.requestedByName || r.requestedBy || "—") + "</td>"
                + "<td>" + statusBadge + "</td>"
                + "</tr>";
        }
        html += "</tbody></table></div>";
        container.innerHTML = html;
    };

    // Main module renderer called by Router.navigate('discounts')
    global.renderDiscounts = function (container) {
        if (!container) return;
        container.innerHTML = 
            '<div class="card">'
            + '<div class="flex-between mb-4">'
            + '  <div>'
            + '    <h2 style="margin:0;font-size:20px;font-weight:700;">🏷️ Discount Permission System</h2>'
            + '    <p style="font-size:13px;color:var(--gray);margin:4px 0 0 0;">Manage and approve department discount requests across Admission, Accounting, Radiology, and Reception</p>'
            + '  </div>'
            + '  <div style="display:flex;gap:8px;">'
            + '    <button class="btn btn-primary btn-sm" onclick="showReceptionDiscountForm()">+ New Request</button>'
            + '  </div>'
            + '</div>'
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