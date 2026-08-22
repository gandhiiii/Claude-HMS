/**
 * js/checklists.js
 * ---------------------------------------------------------------------------
 * Department-wise checklists for Stavya Intelligence, filled PER HOSPITAL UNIT.
 *
 * CONCEPTS
 *   Unit      — a hospital unit/ward (ICU, NICU, OT, General Ward, OPD, …).
 *               Master list managed by ADMIN. The "units box" on the checklist
 *               is a dropdown of ALL units; one filled checklist is recorded
 *               per unit per day.
 *   Floor     — building floor (Ground, 1st, 2nd, …). Master list managed by
 *               ADMIN. Departments listed in FLOOR_DEPARTMENTS (default: IT)
 *               MUST pick a floor when CREATING a checklist template — the
 *               template is floor-specific (e.g. "IT Daily Checklist — 2nd
 *               Floor"). All other departments have no floor field at all.
 *               Use the department's exact name string in FLOOR_DEPARTMENTS.
 *   Template  — a department's checklist definition (e.g. "IT Basic
 *               Checklist — GF"). Contains ITEMS of two types:
 *                 'fixed'  — the BASIC points (e.g. seeded from the IT
 *                            checklist document).
 *                 'custom' — extra points added later.
 *               RULE (revised 2026-07-24, superseding the earlier admin-only
 *               rule for fixed points): BOTH types are added/removed by ADMIN
 *               (any department) or the department's HOD (own department
 *               only). Managers/employees cannot modify points.
 *   Assignment— a separate checklist GIVEN TO ONE EMPLOYEE, composed of
 *               points selected OUT OF the basic templates (refs by
 *               templateId+itemId). Created/revoked by ADMIN or the
 *               department's HOD. The assigned employee fills their own
 *               assignment (one entry per assignment per date). Refs resolve
 *               LIVE: a point removed from the basic list disappears from all
 *               assignments referencing it; already-submitted entries keep
 *               their snapshots.
 *   Entry     — one filled-out instance of a template for ONE unit on ONE
 *               date (e.g. IT Daily Checklist / ICU / 2026-07-24). Items are
 *               SNAPSHOTTED into the entry at start so later template edits
 *               can never rewrite history — entries are audit records.
 *               Duplicate submissions (same template + unit + date) are
 *               rejected.
 *
 * PERMISSION MATRIX (departmental scoping)
 *   admin / isSuperAdmin : manage templates+points (fixed & custom) for ALL
 *                          departments; manage units/floors masters; create/
 *                          revoke assignments anywhere; fill any checklist.
 *   hod                  : manage templates+points (fixed & custom) and
 *                          create/revoke assignments for OWN department only;
 *                          fill own department's checklists.
 *   manager / employee   : fill own department's checklists and their own
 *                          assignments; cannot modify points or assign.
 *
 * IMPORTANT — ROLE STRINGS: adjust ROLES below to the exact role values used
 * in js/data.js if they differ ('hod' vs 'HOD' vs 'head', etc.).
 *
 * SECURITY NOTE: these checks run in the browser and are UX-level guardrails
 * only. Real enforcement requires proper cloud Auth + database security rules
 * (see the security review). Do not treat this module as access control.
 *
 * SYNC NOTE: persistence goes through DB.set (whole-array writes), so this
 * module inherits the app's existing last-write-wins behaviour. When sync is
 * moved to per-record writes, only load()/save() below need to change.
 *
 * RESULT SHAPE: every mutating call returns
 *   { success: boolean, code: 'OK'|'ERR_*', message: string, ...payload }
 * `code` is stable for i18n mapping; `message` is the English fallback.
 * ---------------------------------------------------------------------------
 */
(function (global) {
    'use strict';

    var ROLES = { ADMIN: 'admin', HOD: 'hod', MANAGER: 'manager', EMPLOYEE: 'employee' };

    var K_TEMPLATES   = 'checklistTemplates';
    var K_ENTRIES     = 'checklistEntries';
    var K_UNITS       = 'hospitalUnits';
    var K_FLOORS      = 'floors';
    var K_ASSIGNMENTS = 'checklistAssignments';

    // Departments whose checklist CREATION requires selecting a floor.
    // Exposed on CHECKLISTS.FLOOR_DEPARTMENTS — adjust to match the exact
    // department name(s) the admin created (e.g. 'I.T.' instead of 'IT').
    var FLOOR_DEPARTMENTS = ['IT', 'I.T.', 'Information Technology', 'It'];  // exact matches (case-insensitive lookup used in requiresFloor)

    /* ─────────────────────────── infrastructure ─────────────────────────── */

    function db() {
        if (typeof DB === 'undefined') throw new Error('DB (js/data.js) must be loaded before checklists.js');
        return DB;
    }
    function load(key) { return db().get(key) || []; }
    function save(key, arr) { db().set(key, arr); }

    function newId(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }
    function now() { return new Date().toISOString(); }

    /**
     * Operating-day string (YYYY-MM-DD) using the same 5:00 AM local boundary
     * as the app's daily checklist reset. Every per-day entry key below uses
     * this so the "can I fill again" check flips at 5 AM exactly. If entries
     * were keyed by the raw UTC date, a device east of UTC would show an
     * assignment as "already submitted today" for up to several hours after
     * the 5 AM reset (e.g. 00:00–05:29 in UTC +5:30), which locks the
     * OK/fault options and makes the checklist unfillable after the reset.
     */
    function operDate(refDate) {
        var base = refDate ? new Date(refDate) : new Date();
        var adj = new Date(base.getTime() - 5 * 60 * 60 * 1000);
        return adj.getFullYear() + '-' + ('0' + (adj.getMonth() + 1)).slice(-2) + '-' + ('0' + adj.getDate()).slice(-2);
    }

    function ok(payload) {
        var r = { success: true, code: 'OK', message: 'OK' };
        if (payload) Object.keys(payload).forEach(function (k) { r[k] = payload[k]; });
        return r;
    }
    function err(code, message) { return { success: false, code: code, message: message }; }

    /* ───────────────────────────── permissions ──────────────────────────── */

    function isAdmin(user) {
        return !!user && (user.role === ROLES.ADMIN || user.isSuperAdmin === true);
    }
    function isHodOf(user, department) {
        return !!user && user.role === ROLES.HOD && user.department === department;
    }
    /** May this user create templates / manage custom items for `department`? */
    function canManage(user, department) {
        return isAdmin(user) || isHodOf(user, department);
    }
    /** May this user manage FIXED/basic points of `department`?
     *  REVISED policy per requirements ("add and remove by admin and HOD
     *  only"): admin, or the department's own HOD. Kept as a named function
     *  so the policy lives in exactly one place if it changes again. */
    function canManageFixed(user, department) { return canManage(user, department); }
    /** May this user fill/complete checklists of `department`? */
    function canFill(user, department) {
        return isAdmin(user) || (!!user && user.department === department);
    }

    /* ─────────────────────── hospital units (wards) ─────────────────────────
     * No default seeding: every hospital's wards differ, so the master starts
     * empty and the admin defines the real ones (ICU, NICU, OT, OPD, …).
     * The fill-checklist UI should render ALL of these in the unit dropdown.
     */
    function listHospitalUnits() { return load(K_UNITS); }

    function getUnit(unitId) {
        return listHospitalUnits().find(function (u) { return u.id === unitId; }) || null;
    }

    function addHospitalUnit(user, name) {
        if (!isAdmin(user)) return err('ERR_PERMISSION', 'Only an administrator can manage hospital units.');
        name = (name || '').trim();
        if (!name) return err('ERR_VALIDATION', 'Unit name is required.');
        var units = listHospitalUnits();
        if (units.some(function (u) { return u.name.toLowerCase() === name.toLowerCase(); })) {
            return err('ERR_DUPLICATE', 'A unit with that name already exists.');
        }
        var unit = { id: newId('hu'), name: name, createdAt: now() };
        units.push(unit); save(K_UNITS, units);
        return ok({ unit: unit });
    }

    function removeHospitalUnit(user, unitId) {
        if (!isAdmin(user)) return err('ERR_PERMISSION', 'Only an administrator can manage hospital units.');
        // Units referenced by submitted entries are part of the audit trail
        // and must not be deleted out from under them.
        var inUse = load(K_ENTRIES).some(function (e) { return e.unitId === unitId; });
        if (inUse) return err('ERR_IN_USE', 'Unit has submitted checklists and cannot be removed.');
        save(K_UNITS, listHospitalUnits().filter(function (u) { return u.id !== unitId; }));
        return ok();
    }

    /* ─────────────────────────── floors master ──────────────────────────────
     * Building floors, admin-managed like units. Starts empty — the admin
     * defines the real floors (Ground, 1st, 2nd, Basement, …). Only the
     * departments in FLOOR_DEPARTMENTS use these (see createTemplate).
     */
    function listFloors() { return load(K_FLOORS); }

    function getFloor(floorId) {
        return listFloors().find(function (f) { return f.id === floorId; }) || null;
    }

    /** Does checklist creation in this department require a floor selection? */
    function requiresFloor(department) {
        if (!department) return false;
        var dept = department.toLowerCase().trim();
        return FLOOR_DEPARTMENTS.some(function (f) { return f.toLowerCase() === dept; });
    }

    function addFloor(user, name) {
        if (!isAdmin(user)) return err('ERR_PERMISSION', 'Only an administrator can manage floors.');
        name = (name || '').trim();
        if (!name) return err('ERR_VALIDATION', 'Floor name is required.');
        var floors = listFloors();
        if (floors.some(function (f) { return f.name.toLowerCase() === name.toLowerCase(); })) {
            return err('ERR_DUPLICATE', 'A floor with that name already exists.');
        }
        var floor = { id: newId('fl'), name: name, createdAt: now() };
        floors.push(floor); save(K_FLOORS, floors);
        return ok({ floor: floor });
    }

    function removeFloor(user, floorId) {
        if (!isAdmin(user)) return err('ERR_PERMISSION', 'Only an administrator can manage floors.');
        // Floors referenced by templates or by submitted entries are part of
        // live definitions / the audit trail and must not be deleted.
        var inTemplates = load(K_TEMPLATES).some(function (t) { return t.floorId === floorId; });
        var inEntries   = load(K_ENTRIES).some(function (e) { return e.floorId === floorId; });
        if (inTemplates || inEntries) {
            return err('ERR_IN_USE', 'Floor is used by checklists and cannot be removed.');
        }
        save(K_FLOORS, listFloors().filter(function (f) { return f.id !== floorId; }));
        return ok();
    }

    /* ───────────────────────────── templates ────────────────────────────── */

    function getTemplate(templateId) {
        return load(K_TEMPLATES).find(function (t) { return t.id === templateId; }) || null;
    }

    /** Templates visible to this user: admin sees all, others their department. */
    function listTemplates(user) {
        var all = load(K_TEMPLATES);
        if (isAdmin(user)) return all;
        if (!user) return [];
        return all.filter(function (t) { return t.department === user.department; });
    }

    /**
     * createTemplate(user, department, title, floorId?)
     * For departments in FLOOR_DEPARTMENTS (default: IT), floorId is REQUIRED
     * and the template becomes floor-specific. For every other department,
     * passing a floorId is rejected — the strictness catches UI wiring
     * mistakes instead of silently ignoring them.
     */
    function createTemplate(user, department, title, floorId) {
        department = (department || '').trim(); title = (title || '').trim();
        if (!department || !title) return err('ERR_VALIDATION', 'Department and checklist title are required.');
        if (!canManage(user, department)) {
            return err('ERR_PERMISSION', 'You can only create checklists for your own department.');
        }
        // If the admin maintains a departments master, validate against it so a
        // typo can't create an orphan checklist for a nonexistent department.
        var departments = load('departments');
        if (departments.length > 0) {
            var exists = departments.some(function (d) { return d === department || d.name === department; });
            if (!exists) return err('ERR_NOT_FOUND', 'Department "' + department + '" does not exist.');
        }

        var floor = null;
        if (requiresFloor(department)) {
            if (!floorId) return err('ERR_VALIDATION', 'Please select a floor for this checklist.');
            floor = getFloor(floorId);
            if (!floor) return err('ERR_NOT_FOUND', 'Selected floor does not exist.');
        } else if (floorId) {
            return err('ERR_VALIDATION', 'Floor selection is not applicable for the ' + department + ' department.');
        }

        var templates = load(K_TEMPLATES);
        var tpl = {
            id: newId('cl'), department: department, title: title,
            floorId: floor ? floor.id : null,
            floorName: floor ? floor.name : null,   // snapshot for display/audit
            items: [], createdBy: user.id, createdAt: now(), updatedAt: now()
        };
        templates.push(tpl); save(K_TEMPLATES, templates);
        return ok({ template: tpl });
    }

    /* ─────────────────────────────── items ──────────────────────────────── */
    /**
     * addItem(user, templateId, {label, type})
     *   type 'fixed' (basic) or 'custom' — BOTH manageable by admin, or by
     *   the HOD of the template's department (revised policy). The type is
     *   still recorded to distinguish seeded basic points from later additions.
     */
    function addItem(user, templateId, opts) {
        opts = opts || {};
        var label = (opts.label || '').trim();
        var type = opts.type === 'fixed' ? 'fixed' : 'custom';
        if (!label) return err('ERR_VALIDATION', 'Checklist point text is required.');

        var templates = load(K_TEMPLATES);
        var tpl = templates.find(function (t) { return t.id === templateId; });
        if (!tpl) return err('ERR_NOT_FOUND', 'Checklist not found.');

        if (!canManageFixed(user, tpl.department)) {
            return err('ERR_PERMISSION', 'Only the administrator or this department\u2019s HOD can modify checklist points.');
        }

        var item = {
            id: newId('ci'), label: label, type: type,
            createdBy: user.id, createdAt: now()
        };
        tpl.items.push(item); tpl.updatedAt = now();
        save(K_TEMPLATES, templates);
        return ok({ item: item });
    }

    function updateItem(user, templateId, itemId, patch) {
        var templates = load(K_TEMPLATES);
        var tpl = templates.find(function (t) { return t.id === templateId; });
        if (!tpl) return err('ERR_NOT_FOUND', 'Checklist not found.');
        var item = tpl.items.find(function (i) { return i.id === itemId; });
        if (!item) return err('ERR_NOT_FOUND', 'Checklist point not found.');

        var allowed = canManageFixed(user, tpl.department);
        if (!allowed) return err('ERR_PERMISSION', 'You do not have permission to modify this point.');

        if (patch.label !== undefined) {
            var label = String(patch.label).trim();
            if (!label) return err('ERR_VALIDATION', 'Checklist point text is required.');
            item.label = label;
        }
        // item.type is intentionally immutable — a custom point cannot be
        // promoted to fixed (or vice versa) after creation.
        tpl.updatedAt = now();
        save(K_TEMPLATES, templates);
        return ok({ item: item });
    }

    function removeItem(user, templateId, itemId) {
        var templates = load(K_TEMPLATES);
        var tpl = templates.find(function (t) { return t.id === templateId; });
        if (!tpl) return err('ERR_NOT_FOUND', 'Checklist not found.');
        var item = tpl.items.find(function (i) { return i.id === itemId; });
        if (!item) return err('ERR_NOT_FOUND', 'Checklist point not found.');

        var allowed = canManageFixed(user, tpl.department);
        if (!allowed) return err('ERR_PERMISSION', 'You do not have permission to remove this point.');

        tpl.items = tpl.items.filter(function (i) { return i.id !== itemId; });
        tpl.updatedAt = now();
        save(K_TEMPLATES, templates);
        return ok();
    }

    /* ─────────────────────────────── entries ────────────────────────────── */

    /** Has this template already been submitted for this unit on this date? */
    function hasEntry(templateId, unitId, dateStr) {
        return load(K_ENTRIES).some(function (e) {
            return e.templateId === templateId && e.unitId === unitId && e.date === dateStr;
        });
    }

    /**
     * Begin filling a checklist for ONE unit. Items are DEEP-COPIED into the
     * entry so the record remains exactly what the filler saw, forever (audit
     * integrity). The entry is returned but NOT persisted until submitEntry().
     */
    function startEntry(user, templateId, unitId, dateStr) {
        var tpl = getTemplate(templateId);
        if (!tpl) return err('ERR_NOT_FOUND', 'Checklist not found.');
        if (!canFill(user, tpl.department)) {
            return err('ERR_PERMISSION', 'You can only fill checklists for your own department.');
        }
        var unit = getUnit(unitId);
        if (!unit) return err('ERR_NOT_FOUND', 'Please select a valid hospital unit.');

        var date = dateStr || operDate();
        if (hasEntry(templateId, unitId, date)) {
            return err('ERR_DUPLICATE', 'This checklist is already submitted for ' + unit.name + ' on ' + date + '.');
        }

        var entry = {
            id: newId('ce'),
            templateId: tpl.id,
            templateTitle: tpl.title,
            department: tpl.department,
            floorId: tpl.floorId || null,      // inherited from the template
            floorName: tpl.floorName || null,
            unitId: unit.id,
            unitName: unit.name,               // snapshotted for audit display
            date: date,
            filledBy: user.id,
            filledByName: user.fullName || user.username,
            startedAt: now(),
            submittedAt: null,
            items: JSON.parse(JSON.stringify(tpl.items)),   // snapshot
            results: {}
        };
        entry.items.forEach(function (it) {
            entry.results[it.id] = { checked: false, remarks: '', photos: [] };
        });
        return ok({ entry: entry });
    }

    /** Pure helper: update one point's result on an in-progress entry. */
    function setItemResult(entry, itemId, patch) {
        if (!entry || !entry.results || !entry.results[itemId]) {
            return err('ERR_NOT_FOUND', 'Checklist point not found on this entry.');
        }
        var r = entry.results[itemId];
        if (patch.checked !== undefined) r.checked = !!patch.checked;
        if (patch.remarks !== undefined) r.remarks = String(patch.remarks);
        if (patch.photos !== undefined) r.photos = Array.isArray(patch.photos) ? patch.photos : [];
        return ok({ entry: entry });
    }

    /** Validate and persist a completed entry (re-checks the duplicate guard,
     *  since another device may have submitted between start and submit). */
    function submitEntry(user, entry) {
        if (!entry || !entry.templateId || !entry.unitId) return err('ERR_VALIDATION', 'Invalid entry.');
        if (!canFill(user, entry.department)) {
            return err('ERR_PERMISSION', 'You can only submit checklists for your own department.');
        }
        if (hasEntry(entry.templateId, entry.unitId, entry.date)) {
            return err('ERR_DUPLICATE', 'This checklist is already submitted for ' + entry.unitName + ' on ' + entry.date + '.');
        }
        entry.submittedAt = now();
        var entries = load(K_ENTRIES);
        entries.push(entry);
        save(K_ENTRIES, entries);
        return ok({ entry: entry });
    }

    /** Entries visible to this user: admin all; others own department. */
    function listEntries(user, filter) {
        filter = filter || {};
        var all = load(K_ENTRIES);
        var visible = isAdmin(user) ? all
            : all.filter(function (e) { return user && e.department === user.department; });
        if (filter.department) visible = visible.filter(function (e) { return e.department === filter.department; });
        if (filter.templateId) visible = visible.filter(function (e) { return e.templateId === filter.templateId; });
        if (filter.unitId)     visible = visible.filter(function (e) { return e.unitId === filter.unitId; });
        if (filter.date)       visible = visible.filter(function (e) { return e.date === filter.date; });
        return visible;
    }

    /**
     * Per-unit completion overview for one template on one date:
     * which units have submitted, which haven't. Drives the "all units"
     * status view (e.g. today's IT checklist: ICU ✓, OT ✗, OPD ✓ …).
     * @returns {{success, units: [{unit, filled, entryId, filledByName, submittedAt}]}}
     */
    function unitStatus(user, templateId, dateStr) {
        var tpl = getTemplate(templateId);
        if (!tpl) return err('ERR_NOT_FOUND', 'Checklist not found.');
        if (!canFill(user, tpl.department)) {
            return err('ERR_PERMISSION', 'You can only view checklists for your own department.');
        }
        var date = dateStr || operDate();
        var entries = load(K_ENTRIES).filter(function (e) {
            return e.templateId === templateId && e.date === date;
        });
        var rows = listHospitalUnits().map(function (u) {
            var e = entries.find(function (x) { return x.unitId === u.id; }) || null;
            return {
                unit: u,
                filled: !!e,
                entryId: e ? e.id : null,
                filledByName: e ? e.filledByName : null,
                submittedAt: e ? e.submittedAt : null
            };
        });
        return ok({ date: date, units: rows });
    }

    /* ───────────────────── employee assignments ─────────────────────────────
     * "HOD and Admin can give separate checklist out of basic to IT
     * department Employee": an assignment references points OUT OF the basic
     * templates ({templateId, itemId} pairs). References resolve LIVE, so a
     * point removed from the basic list disappears from every assignment;
     * already-submitted entries keep their snapshots (audit).
     */

    function getAssignment(assignmentId) {
        return load(K_ASSIGNMENTS).find(function (a) { return a.id === assignmentId; }) || null;
    }

    /**
     * assignToEmployee(user, {employeeId, title, refs:[{templateId,itemId}]})
     * All refs must belong to templates of ONE department; the employee must
     * belong to that department; the assigner must be admin or that
     * department's HOD. Every ref is validated NOW (fail fast on bad wiring).
     */
    function assignToEmployee(user, opts) {
        opts = opts || {};
        var title = (opts.title || '').trim();
        var refs = Array.isArray(opts.refs) ? opts.refs : [];
        if (!title) return err('ERR_VALIDATION', 'Assignment title is required.');
        if (refs.length === 0) return err('ERR_VALIDATION', 'Select at least one point from the basic checklist.');

        var employee = load('users').find(function (u) { return u.id === opts.employeeId; });
        if (!employee) return err('ERR_NOT_FOUND', 'Employee not found.');

        var department = null;
        for (var i = 0; i < refs.length; i++) {
            var tpl = getTemplate(refs[i].templateId);
            if (!tpl) return err('ERR_NOT_FOUND', 'Referenced checklist not found.');
            if (department === null) department = tpl.department;
            else if (department !== tpl.department) {
                return err('ERR_VALIDATION', 'All selected points must belong to one department.');
            }
            var itemOk = tpl.items.some(function (it) { return it.id === refs[i].itemId; });
            if (!itemOk) return err('ERR_NOT_FOUND', 'A selected point no longer exists in the basic checklist.');
        }
        if (!canManage(user, department)) {
            return err('ERR_PERMISSION', 'You can only assign checklists within your own department.');
        }
        if (employee.department !== department) {
            return err('ERR_VALIDATION', 'Employee must belong to the ' + department + ' department.');
        }

        var assignments = load(K_ASSIGNMENTS);
        var assignment = {
            id: newId('as'),
            department: department,
            employeeId: employee.id,
            employeeName: employee.fullName || employee.username,
            title: title,
            refs: JSON.parse(JSON.stringify(refs)),
            active: true,
            assignedBy: user.id,
            assignedAt: now(),
            revokedBy: null,
            revokedAt: null
        };
        assignments.push(assignment); save(K_ASSIGNMENTS, assignments);
        return ok({ assignment: assignment });
    }

    /** Resolve an assignment's refs to LIVE basic points; dangling refs
     *  (point/template removed since assigning) are skipped. */
    function resolveAssignmentItems(assignmentOrId) {
        var a = typeof assignmentOrId === 'string' ? getAssignment(assignmentOrId) : assignmentOrId;
        if (!a) return [];
        var items = [];
        (a.refs || []).forEach(function (ref) {
            var tpl = getTemplate(ref.templateId);
            if (!tpl) return;
            var it = tpl.items.find(function (x) { return x.id === ref.itemId; });
            if (!it) return;
            items.push({
                templateId: tpl.id,
                templateTitle: tpl.title,
                floorName: tpl.floorName || null,
                itemId: it.id,
                label: it.label,
                type: it.type,
                unit: it.unit || ''
            });
        });
        return items;
    }

    /** Assignments visible to this user: admin all; HOD own department;
     *  everyone else only their own. */
    function listAssignments(user, filter) {
        filter = filter || {};
        var all = load(K_ASSIGNMENTS);
        var visible;
        if (isAdmin(user)) visible = all;
        else if (user && user.role === ROLES.HOD) {
            visible = all.filter(function (a) { return a.department === user.department; });
        } else if (user) {
            visible = all.filter(function (a) { return a.employeeId === user.id; });
        } else visible = [];
        if (filter.employeeId) visible = visible.filter(function (a) { return a.employeeId === filter.employeeId; });
        if (filter.activeOnly) visible = visible.filter(function (a) { return a.active; });
        return visible;
    }

    /** The logged-in employee's own active assignments. */
    function myAssignments(user) {
        if (!user) return [];
        return load(K_ASSIGNMENTS).filter(function (a) {
            return a.active && a.employeeId === user.id;
        });
    }

    /** Revoke (deactivate) an assignment — kept, not deleted, for audit. */
    function revokeAssignment(user, assignmentId) {
        var assignments = load(K_ASSIGNMENTS);
        var a = assignments.find(function (x) { return x.id === assignmentId; });
        if (!a) return err('ERR_NOT_FOUND', 'Assignment not found.');
        if (!canManage(user, a.department)) {
            return err('ERR_PERMISSION', 'You can only revoke assignments within your own department.');
        }
        a.active = false; a.revokedBy = user.id; a.revokedAt = now();
        save(K_ASSIGNMENTS, assignments);
        return ok({ assignment: a });
    }

    /** Has this assignment already been submitted for this date? */
    function hasAssignmentEntry(assignmentId, dateStr) {
        return load(K_ENTRIES).some(function (e) {
            return e.assignmentId === assignmentId && e.date === dateStr;
        });
    }

    /**
     * The assigned employee (or admin) begins filling their assignment.
     * Points are resolved LIVE from the basic templates, then SNAPSHOTTED
     * into the entry. One entry per assignment per date.
     */
    function startAssignmentEntry(user, assignmentId, dateStr) {
        var a = getAssignment(assignmentId);
        if (!a) return err('ERR_NOT_FOUND', 'Assignment not found.');
        if (!a.active) return err('ERR_INACTIVE', 'This assignment has been revoked.');
        if (!(isAdmin(user) || isHodOf(user, a.department) || (user && String(user.id) === String(a.employeeId)))) {
            return err('ERR_PERMISSION', 'Only the assigned employee or HOD can fill this checklist.');
        }
        var items = resolveAssignmentItems(a);
        if (items.length === 0) return err('ERR_VALIDATION', 'This assignment has no remaining points.');

        var date = dateStr || operDate();
        if (hasAssignmentEntry(a.id, date)) {
            return err('ERR_DUPLICATE', 'This assigned checklist is already submitted for ' + date + '.');
        }

        var entry = {
            id: newId('ce'),
            entryType: 'assignment',
            assignmentId: a.id,
            assignmentTitle: a.title,
            department: a.department,
            date: date,
            filledBy: user.id,
            filledByName: user.fullName || user.username,
            startedAt: now(),
            submittedAt: null,
            items: items,      // resolveAssignmentItems returns fresh objects
            results: {}
        };
        entry.items.forEach(function (it) {
            var k = it.itemId || it.id;
            entry.results[k] = { status: 'pending', value: '', remarks: '', photos: [] };
        });
        return ok({ entry: entry });
    }

    /** Validate and persist a completed assignment entry. */
    function submitAssignmentEntry(user, entry) {
        if (!entry || !entry.assignmentId) return err('ERR_VALIDATION', 'Invalid entry.');
        var a = getAssignment(entry.assignmentId);
        if (!a) return err('ERR_NOT_FOUND', 'Assignment not found.');
        if (!a.active) return err('ERR_INACTIVE', 'This assignment has been revoked.');
        if (!(isAdmin(user) || isHodOf(user, a.department) || (user && String(user.id) === String(a.employeeId)))) {
            return err('ERR_PERMISSION', 'Only the assigned employee or HOD can submit this checklist.');
        }
        if (hasAssignmentEntry(entry.assignmentId, entry.date)) {
            return err('ERR_DUPLICATE', 'This assigned checklist is already submitted for ' + entry.date + '.');
        }
        entry.submittedAt = now();
        var entries = load(K_ENTRIES);
        entries.push(entry);
        save(K_ENTRIES, entries);
        return ok({ entry: entry });
    }

    /**
     * HOD/admin oversight: for one department and date, every ACTIVE
     * assignment with whether its employee has submitted.
     */
    function assignmentStatus(user, department, dateStr) {
        if (!canManage(user, department)) {
            return err('ERR_PERMISSION', 'You can only view assignment status for your own department.');
        }
        var date = dateStr || operDate();
        var entries = load(K_ENTRIES).filter(function (e) {
            return e.entryType === 'assignment' && e.date === date;
        });
        var rows = load(K_ASSIGNMENTS)
            .filter(function (a) { return a.department === department && a.active; })
            .map(function (a) {
                var e = entries.find(function (x) { return x.assignmentId === a.id; }) || null;
                return {
                    assignment: { id: a.id, title: a.title, employeeId: a.employeeId, employeeName: a.employeeName },
                    filled: !!e,
                    entryId: e ? e.id : null,
                    filledByName: e ? e.filledByName : null,
                    submittedAt: e ? e.submittedAt : null
                };
            });
        return ok({ date: date, assignments: rows });
    }

    global.CHECKLISTS = {
        ROLES: ROLES,
        FLOOR_DEPARTMENTS: FLOOR_DEPARTMENTS,
        operDate: operDate,
        requiresFloor: requiresFloor,
        listFloors: listFloors,
        addFloor: addFloor,
        removeFloor: removeFloor,
        canManage: canManage,
        canManageFixed: canManageFixed,
        canFill: canFill,
        listHospitalUnits: listHospitalUnits,
        addHospitalUnit: addHospitalUnit,
        removeHospitalUnit: removeHospitalUnit,
        listTemplates: listTemplates,
        getTemplate: getTemplate,
        createTemplate: createTemplate,
        addItem: addItem,
        updateItem: updateItem,
        removeItem: removeItem,
        hasEntry: hasEntry,
        startEntry: startEntry,
        setItemResult: setItemResult,
        submitEntry: submitEntry,
        listEntries: listEntries,
        unitStatus: unitStatus,
        getAssignment: getAssignment,
        assignToEmployee: assignToEmployee,
        resolveAssignmentItems: resolveAssignmentItems,
        listAssignments: listAssignments,
        myAssignments: myAssignments,
        revokeAssignment: revokeAssignment,
        hasAssignmentEntry: hasAssignmentEntry,
        startAssignmentEntry: startAssignmentEntry,
        submitAssignmentEntry: submitAssignmentEntry,
        assignmentStatus: assignmentStatus
    };
})(window);
