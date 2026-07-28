/**
 * js/checklists-seed-it.js
 * ---------------------------------------------------------------------------
 * One-time seeder for the IT department's BASIC checklists, generated from the
 * uploaded "IT checklistt.txt" (11 floors, 384 points).
 *
 * WHAT IT DOES
 *   - Creates any missing floors: B3, B2, B1, GF, First..Seventh Floor.
 *   - Creates one template per floor: "IT Basic Checklist \u2014 <floor>".
 *   - Adds that floor's points as type 'fixed' (the basic list).
 *   - IDEMPOTENT: floors/templates that already exist are skipped, so calling
 *     it repeatedly (e.g. on every dashboard load) is safe.
 *
 * SOURCE NORMALIZATIONS (disclosed, verbatim otherwise):
 *   - "Forth floor" \u2192 "Fourth Floor" (spelling), floor names title-cased.
 *   - Trailing " ALL" \u2192 " (ALL)" for consistency.
 *   - 28 bare device lines (e.g. "Telephone (PRI)" with no location) were
 *     prefixed with their section's location (e.g. "Server room Telephone
 *     (PRI)") so every point is self-describing on its own row.
 *
 * USAGE (after js/data.js and js/checklists.js are loaded):
 *   var summary = SEED_IT_CHECKLIST.run(currentUser);   // admin or IT HOD
 *   console.log(summary);
 *
 * NOTE: if a departments master exists, the department named in IT_DEPARTMENT
 * must exist in it first (createTemplate validates this). Adjust the constant
 * if your department is named differently (e.g. 'I.T.').
 * ---------------------------------------------------------------------------
 */
(function (global) {
    'use strict';

    var IT_DEPARTMENT = 'IT';   // adjust to the exact department name

    var DATA = [
    {
        "floor": "B3",
        "items": [
            "Parking Camera Alignment (ALL)",
            "Parking Speakers (ALL)",
            "Parking Fire detector (ALL)",
            "Parking Fire alarm (ALL)",
            "Parking Wi-Fi Router (ALL)",
            "Canteen Store room camera Alignment (ALL)",
            "Canteen Store room Access point",
            "Canteen Store room Fire alarm",
            "Canteen Store room Speaker",
            "Canteen Store room Telephone",
            "Canteen Store room Wi-Fi Router (ALL)",
            "Housekeeping & other Store room camera Alignment (ALL)",
            "Housekeeping & other Store room Access point",
            "Housekeeping & other Store room Fire alarm",
            "Housekeeping & other Store room Speaker",
            "Housekeeping & other Store room Telephone",
            "Housekeeping & other Store room Wi-Fi Router (ALL)",
            "stationery Store room camera Alignment (ALL)",
            "stationery Store room Access point",
            "stationery Store room Fire alarm",
            "stationery Store room Speaker",
            "stationery Store room Telephone",
            "stationery Store room Wi-Fi Router (ALL)",
            "Linen Store room camera Alignment (ALL)",
            "Linen Store room Access point",
            "Linen Store room Fire alarm",
            "Linen Store room Speaker",
            "Linen Store room Telephone",
            "Linen Store room Wi-Fi Router (ALL)",
            "Account Store room camera Alignment (ALL)",
            "Account Store room Access point",
            "Account Store room Fire alarm",
            "Account Store room Speaker",
            "Account Store room Telephone",
            "Account Store room Wi-Fi Router (ALL)",
            "Entrance Store room camera Alignment (ALL)",
            "Entrance Store room Access point",
            "Entrance Store room Fire alarm",
            "Entrance Store room Speaker",
            "Entrance Store room Telephone",
            "Entrance Store room Wi-Fi Router (ALL)",
            "Entrance Store room Computers and Accessories (ALL)",
            "General Store room camera Alignment (ALL)",
            "General Store room Access point",
            "General Store room Fire alarm",
            "General Store room Speaker",
            "General Store room Telephone",
            "General Store room Wi-Fi Router (ALL)",
            "Maintenance & IT Store room camera Alignment (ALL)",
            "Maintenance & IT Store room Access point",
            "Maintenance & IT Store room Fire alarm",
            "Maintenance & IT Store room Speaker",
            "Maintenance & IT Store room Telephone",
            "Maintenance & IT Store room Wi-Fi Router (ALL)"
        ]
    },
    {
        "floor": "B2",
        "items": [
            "Parking Camera Alignment (ALL)",
            "Parking Speakers (ALL)",
            "Parking Fire detector (ALL)",
            "Parking Fire alarm (ALL)",
            "Parking Wi-Fi Router (ALL)",
            "MEDICAL Store room camera Alignment (ALL)",
            "MEDICAL Store room Access point",
            "MEDICAL Store room MEDICAL Fire alarm",
            "MEDICAL Store room Speaker",
            "MEDICAL Store room Telephone",
            "MEDICAL Store room Wi-Fi Router (ALL)",
            "OT Store room camera Alignment (ALL)",
            "OT Store room Access point",
            "OT Store room Fire alarm",
            "OT Store room Speaker",
            "OT Store room Telephone",
            "OT Store room Wi-Fi Router (ALL)",
            "Physiotherapy Store room camera Alignment (ALL)",
            "Physiotherapy Store room Access point",
            "Physiotherapy Store room Fire alarm",
            "Physiotherapy Store room Speaker",
            "Physiotherapy Store room Telephone",
            "Physiotherapy Store room Wi-Fi Router (ALL)"
        ]
    },
    {
        "floor": "B1",
        "items": [
            "Parking Camera Alignment (ALL)",
            "Parking Speakers (ALL)",
            "Parking Fire detector (ALL)",
            "Parking Fire alarm (ALL)",
            "Parking Wi-Fi Router (ALL)",
            "Radiology Store room camera Alignment (ALL)",
            "Radiology Store room Access point",
            "Radiology Store room Fire alarm",
            "Radiology Store room Speaker",
            "Radiology Store room Telephone",
            "Radiology Store room Wi-Fi Router (ALL)",
            "Research Store room camera Alignment (ALL)",
            "Research Store room Access point",
            "Research Store room Fire alarm",
            "Research Store room Speaker",
            "Research Store room Telephone",
            "Research Store room Wi-Fi Router (ALL)"
        ]
    },
    {
        "floor": "GF",
        "items": [
            "Entrance Ramp Camera Alignment (ALL)",
            "Entrance Ramp Speakers (ALL)",
            "Entrance Ramp Fire detector (ALL)",
            "Entrance Ramp Fire alarm (ALL)",
            "Entrance Ramp Wi-Fi Router (ALL)",
            "Medical GAS station side Camera Alignment (ALL)",
            "Medical GAS station side Speakers (ALL)",
            "Medical GAS station side Fire detector (ALL)",
            "Medical GAS station side Fire alarm (ALL)",
            "Medical GAS station side Wi-Fi Router (ALL)",
            "Back side Two Wheeler parking Side Camera Alignment (ALL)",
            "Back side Two Wheeler parking side Speakers (ALL)",
            "Back side Two Wheeler parking side Fire detector (ALL)",
            "Back side Two Wheeler parking side Fire alarm (ALL)",
            "Back side Two Wheeler parking side Wi-Fi Router (ALL)",
            "Phase 2 side Camera Alignment (ALL)",
            "Phase 2 side Speakers (ALL)",
            "Phase 2 side Fire detector (ALL)",
            "Phase 2 side Fire alarm (ALL)",
            "Phase 2 side Wi-Fi Router (ALL)",
            "Entrance Gate Camera Alignment (ALL)",
            "Entrance Gate Speakers (ALL)",
            "Entrance Gate Fire detector (ALL)",
            "Entrance Gate Fire alarm (ALL)",
            "Entrance Gate Wi-Fi Router (ALL)",
            "Reception & Lobby Camera Alignment (ALL)",
            "Reception & Lobby Speakers (ALL)",
            "Reception & Lobby Fire detector (ALL)",
            "Reception & Lobby Fire alarm (ALL)",
            "Reception & Lobby Wi-Fi Router (ALL)",
            "Reception & Lobby Internet (LAN) (ALL)",
            "Reception & Lobby Telephone (PRI)",
            "Reception & Lobby Telephone (LAN)",
            "Reception & Lobby Computers and Accessories (ALL)",
            "Medical Store Camera Alignment (ALL)",
            "Medical Store Speakers (ALL)",
            "Medical Store Fire detector (ALL)",
            "Medical Store Fire alarm (ALL)",
            "Medical Store Wi-Fi Router (ALL)",
            "Medical Store Internet (LAN) (ALL)",
            "Medical Store Telephone (PRI)",
            "Medical Store Telephone (LAN)",
            "Medical Store Computers and Accessories (ALL)",
            "Physiotherapy & Gym Camera Alignment (ALL)",
            "Physiotherapy & Gym Speakers (ALL)",
            "Physiotherapy & Gym Fire detector (ALL)",
            "Physiotherapy & Gym Fire alarm (ALL)",
            "Physiotherapy & Gym Wi-Fi Router (ALL)",
            "Physiotherapy & Gym Internet (LAN) (ALL)",
            "Physiotherapy & Gym Telephone (PRI)",
            "Physiotherapy & Gym Telephone (LAN)",
            "Physiotherapy Computers and Accessories (ALL)",
            "Canteen Camera Alignment (ALL)",
            "Canteen Store Speakers (ALL)",
            "Canteen Store Fire detector (ALL)",
            "Canteen Store Fire alarm (ALL)",
            "Canteen Store Wi-Fi Router (ALL)",
            "Canteen Internet (LAN) (ALL)",
            "Canteen Telephone (PRI)",
            "Canteen Telephone (LAN)",
            "Canteen Computers and Accessories (ALL)"
        ]
    },
    {
        "floor": "First Floor",
        "items": [
            "Lobby Camera Alignment (ALL)",
            "Lobby Speakers (ALL)",
            "Lobby Fire detector (ALL)",
            "Lobby Fire alarm (ALL)",
            "Lobby Wi-Fi Router (ALL)",
            "Admission Camera Alignment (ALL)",
            "Admission Speakers (ALL)",
            "Admission Fire detector (ALL)",
            "Admission Fire alarm (ALL)",
            "Admission Wi-Fi Router (ALL)",
            "Admission Internet (LAN) (ALL)",
            "Admission Telephone (PRI)",
            "Admission Telephone (LAN)",
            "Admission Computers and Accessories (ALL)",
            "Discharge Camera Alignment (ALL)",
            "Discharge Speakers (ALL)",
            "Discharge Fire detector (ALL)",
            "Discharge Fire alarm (ALL)",
            "Discharge Wi-Fi Router (ALL)",
            "Discharge Internet (LAN) (ALL)",
            "Discharge Telephone (PRI)",
            "Discharge Telephone (LAN)",
            "Discharge Computers and Accessories (ALL)",
            "Call center Camera Alignment (ALL)",
            "Call center Speakers (ALL)",
            "Call center Fire detector (ALL)",
            "Call center Fire alarm (ALL)",
            "Call center Wi-Fi Router (ALL)",
            "Call center Internet (LAN) (ALL)",
            "Call center Telephone (PRI)",
            "Call center Telephone (LAN)",
            "Call center Computers and Accessories (ALL)",
            "Account & Other Department Camera Alignment (ALL)",
            "Account & Other Department Speakers (ALL)",
            "Account & Other Department Fire detector (ALL)",
            "Account & Other Department Fire alarm (ALL)",
            "Account & Other Department Wi-Fi Router (ALL)",
            "Account & Other Department Internet (LAN) (ALL)",
            "Account & Other Department Telephone (PRI)",
            "Account & Other Department Telephone (LAN)",
            "Account & Other Department Computers and Accessories (ALL)",
            "Server room Camera Alignment (ALL)",
            "Server room Speakers (ALL)",
            "Server room Fire detector (ALL)",
            "Server room Fire alarm (ALL)",
            "Server room Wi-Fi Router (ALL)",
            "Server room Internet (LAN) (ALL)",
            "Server room Telephone (PRI)",
            "Server room Telephone (LAN)",
            "Server room Server Storage",
            "Server room Computers and Accessories (ALL)",
            "Radiology Department Camera Alignment (ALL)",
            "Radiology Department Speakers (ALL)",
            "Radiology Department Fire detector (ALL)",
            "Radiology Department Fire alarm (ALL)",
            "Radiology Department Wi-Fi Router (ALL)",
            "Radiology Department Internet (LAN) (ALL)",
            "Radiology Department Telephone (PRI)",
            "Radiology Department Telephone (LAN)",
            "Radiology Department Computers and Accessories (ALL)"
        ]
    },
    {
        "floor": "Second Floor",
        "items": [
            "Reception & Lobby Camera Alignment (ALL)",
            "Reception & Lobby Speakers (ALL)",
            "Reception & Lobby Fire detector (ALL)",
            "Reception & Lobby Fire alarm (ALL)",
            "Reception & Lobby Wi-Fi Router (ALL)",
            "Reception & Lobby Internet (LAN) (ALL)",
            "Reception & Lobby Telephone (PRI)",
            "Reception & Lobby Telephone (LAN)",
            "Reception & Lobby Computers and Accessories (ALL)",
            "OPD & Back side Speakers (ALL)",
            "OPD & Back side Fire detector (ALL)",
            "OPD & Back side Fire alarm (ALL)",
            "OPD & Back side Wi-Fi Router (ALL)",
            "OPD & Back side Internet (LAN) (ALL)",
            "OPD & Back side Telephone (PRI)",
            "OPD & Back side Telephone (LAN)",
            "OPD & Back side Computers and Accessories (ALL)",
            "Research Room Camera Alignment (ALL)",
            "Research Room Speakers (ALL)",
            "Research Room Fire detector (ALL)",
            "Research Room Fire alarm (ALL)",
            "Research Room Wi-Fi Router (ALL)",
            "Research Room Internet (LAN) (ALL)",
            "Research Room Telephone (PRI)",
            "Research Room Telephone (LAN)",
            "Research Room Computers and Accessories (ALL)",
            "Doctor Room Camera Alignment (ALL)",
            "Doctor Room Speakers (ALL)",
            "Doctor Room Fire detector (ALL)",
            "Doctor Room Fire alarm (ALL)",
            "Doctor Room Wi-Fi Router (ALL)",
            "Doctor Room Internet (LAN) (ALL)",
            "Doctor Room Telephone (PRI)",
            "Doctor Room Telephone (LAN)",
            "Doctor Room Computers and Accessories (ALL)"
        ]
    },
    {
        "floor": "Third Floor",
        "items": [
            "Doctor Room Camera Alignment (ALL)",
            "Doctor Room Speakers (ALL)",
            "Doctor Room Fire detector (ALL)",
            "Doctor Room Fire alarm (ALL)",
            "Doctor Room Wi-Fi Router (ALL)",
            "Doctor Room Internet (LAN) (ALL)",
            "Doctor Room Telephone (PRI)",
            "Doctor Room Telephone (LAN)",
            "Doctor Room Computers and Accessories (ALL)",
            "OT Speakers (ALL)",
            "OT Fire detector (ALL)",
            "OT Fire alarm (ALL)",
            "OT Wi-Fi Router (ALL)",
            "OT Internet (LAN) (ALL)",
            "OT Telephone (PRI)",
            "OT side Telephone (LAN)",
            "OT side Computers and Accessories (ALL)",
            "CSSD Speakers (ALL)",
            "CSSD Fire detector (ALL)",
            "CSSD Fire alarm (ALL)",
            "CSSD Wi-Fi Router (ALL)",
            "CSSD Internet (LAN) (ALL)",
            "CSSD Telephone (PRI)",
            "CSSD side Telephone (LAN)",
            "CSSD side Computers and Accessories (ALL)",
            "HDU Speakers (ALL)",
            "HDU Fire detector (ALL)",
            "HDU Fire alarm (ALL)",
            "HDU Wi-Fi Router (ALL)",
            "HDU Internet (LAN) (ALL)",
            "HDU Telephone (PRI)",
            "HDU side Telephone (LAN)",
            "HDU side Computers and Accessories (ALL)",
            "OT Staff Room Speakers (ALL)",
            "OT Staff Room Fire detector (ALL)",
            "OT Staff Room Fire alarm (ALL)",
            "OT Staff Room Wi-Fi Router (ALL)",
            "OT Staff Room Internet (LAN) (ALL)",
            "OT Staff Room Telephone (PRI)",
            "OT Staff Room side Telephone (LAN)",
            "OT Staff Room side Computers and Accessories (ALL)"
        ]
    },
    {
        "floor": "Fourth Floor",
        "items": [
            "Reception & Lobby Camera Alignment (ALL)",
            "Reception & Lobby Speakers (ALL)",
            "Reception & Lobby Fire detector (ALL)",
            "Reception & Lobby Fire alarm (ALL)",
            "Reception & Lobby Wi-Fi Router (ALL)",
            "Reception & Lobby Internet (LAN) (ALL)",
            "Reception & Lobby Telephone (PRI)",
            "Reception & Lobby Telephone (LAN)",
            "Reception & Lobby Computers and Accessories (ALL)",
            "Nursing Room Camera Alignment (ALL)",
            "Nursing Room Speakers (ALL)",
            "Nursing Room Fire detector (ALL)",
            "Nursing Room Fire alarm (ALL)",
            "Nursing Room Wi-Fi Router (ALL)",
            "Nursing Room Internet (LAN) (ALL)",
            "Nursing Room Telephone (PRI)",
            "Nursing Room Telephone (LAN)",
            "Nursing Room Computers and Accessories (ALL)",
            "Doctors Lift and Linen Passage Camera Alignment (ALL)",
            "Doctors Lift and Linen Passage Speakers (ALL)",
            "Doctors Lift and Linen Passage Fire detector (ALL)",
            "Doctors Lift and Linen Passage Fire alarm (ALL)",
            "Doctors Lift and Linen Passage Wi-Fi Router (ALL)",
            "Room Speakers (ALL)",
            "Room Fire detector (ALL)",
            "Room Wi-Fi Router (ALL)",
            "Room Internet (LAN) (ALL)",
            "Room Telephone (LAN)"
        ]
    },
    {
        "floor": "Fifth Floor",
        "items": [
            "Reception & Lobby Camera Alignment (ALL)",
            "Reception & Lobby Speakers (ALL)",
            "Reception & Lobby Fire detector (ALL)",
            "Reception & Lobby Fire alarm (ALL)",
            "Reception & Lobby Wi-Fi Router (ALL)",
            "Reception & Lobby Internet (LAN) (ALL)",
            "Reception & Lobby Telephone (PRI)",
            "Reception & Lobby Telephone (LAN)",
            "Reception & Lobby Computers and Accessories (ALL)",
            "Doctors Lift and Linen Passage Camera Alignment (ALL)",
            "Doctors Lift and Linen Passage Speakers (ALL)",
            "Doctors Lift and Linen Passage Fire detector (ALL)",
            "Doctors Lift and Linen Passage Fire alarm (ALL)",
            "Doctors Lift and Linen Passage Wi-Fi Router (ALL)",
            "Nursing Room Camera Alignment (ALL)",
            "Nursing Room Speakers (ALL)",
            "Nursing Room Fire detector (ALL)",
            "Nursing Room Fire alarm (ALL)",
            "Nursing Room Wi-Fi Router (ALL)",
            "Nursing Room Internet (LAN) (ALL)",
            "Nursing Room Telephone (PRI)",
            "Nursing Room Telephone (LAN)",
            "Nursing Room Computers and Accessories (ALL)",
            "Room Speakers (ALL)",
            "Room Fire detector (ALL)",
            "Room Wi-Fi Router (ALL)",
            "Room Internet (LAN) (ALL)",
            "Room Telephone (LAN)"
        ]
    },
    {
        "floor": "Sixth Floor",
        "items": [
            "Reception & Lobby Camera Alignment (ALL)",
            "Reception & Lobby Speakers (ALL)",
            "Reception & Lobby Fire detector (ALL)",
            "Reception & Lobby Fire alarm (ALL)",
            "Reception & Lobby Wi-Fi Router (ALL)",
            "Reception & Lobby Internet (LAN) (ALL)",
            "Reception & Lobby Telephone (PRI)",
            "Reception & Lobby Telephone (LAN)",
            "Reception & Lobby Computers and Accessories (ALL)",
            "Nursing Room Camera Alignment (ALL)",
            "Nursing Room Speakers (ALL)",
            "Nursing Room Fire detector (ALL)",
            "Nursing Room Fire alarm (ALL)",
            "Nursing Room Wi-Fi Router (ALL)",
            "Nursing Room Internet (LAN) (ALL)",
            "Nursing Room Telephone (PRI)",
            "Nursing Room Telephone (LAN)",
            "Nursing Room Computers and Accessories (ALL)",
            "Doctors Lift and Linen Passage Camera Alignment (ALL)",
            "Doctors Lift and Linen Passage Speakers (ALL)",
            "Doctors Lift and Linen Passage Fire detector (ALL)",
            "Doctors Lift and Linen Passage Fire alarm (ALL)",
            "Doctors Lift and Linen Passage Wi-Fi Router (ALL)",
            "Room Speakers (ALL)",
            "Room Fire detector (ALL)",
            "Room Wi-Fi Router (ALL)",
            "Room Internet (LAN) (ALL)",
            "Room Telephone (LAN)"
        ]
    },
    {
        "floor": "Seventh Floor",
        "items": [
            "Terrace Camera Alignment (ALL)",
            "Terrace Speakers (ALL)",
            "Terrace Fire detector (ALL)",
            "Terrace Fire alarm (ALL)",
            "Terrace Wi-Fi Router (ALL)",
            "Terrace Internet (LAN) (ALL)",
            "Terrace Telephone (PRI)",
            "Terrace Telephone (LAN)",
            "Terrace Computers and Accessories (ALL)"
        ]
    }
];

    function run(user) {
        if (typeof CHECKLISTS === 'undefined' || typeof DB === 'undefined') {
            return { success: false, message: 'checklists.js and data.js must be loaded first.' };
        }
        var C = CHECKLISTS;
        var summary = { success: true, created: [], skipped: [], errors: [] };

        DATA.forEach(function (fl) {
            // 1. Ensure the floor exists
            var floor = C.listFloors().find(function (f) { return f.name === fl.floor; });
            if (!floor) {
                var fr = C.addFloor(user, fl.floor);
                if (!fr.success) { summary.errors.push(fl.floor + ': ' + fr.message); return; }
                floor = fr.floor;
            }

            // 2. Ensure the template exists (idempotency check)
            var title = 'IT Basic Checklist \u2014 ' + fl.floor;
            var existing = C.listTemplates(user).find(function (t) {
                return t.department === IT_DEPARTMENT && t.title === title;
            });
            if (existing) { summary.skipped.push(title); return; }

            var tr = C.createTemplate(user, IT_DEPARTMENT, title, floor.id);
            if (!tr.success) { summary.errors.push(title + ': ' + tr.message); return; }

            // 3. Seed the basic points
            var added = 0;
            fl.items.forEach(function (label) {
                var ir = C.addItem(user, tr.template.id, { label: label, type: 'fixed' });
                if (ir.success) added++;
                else summary.errors.push(title + ' / "' + label + '": ' + ir.message);
            });
            summary.created.push({ title: title, floor: fl.floor, points: added });
        });

        summary.success = summary.errors.length === 0;
        return summary;
    }

    global.SEED_IT_CHECKLIST = { run: run, DATA: DATA, IT_DEPARTMENT: IT_DEPARTMENT };
})(window);
