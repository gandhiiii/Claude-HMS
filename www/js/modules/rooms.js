/* ═════════════════════════════════════════════════════════════════════════════
   ROOMS MANAGEMENT MODULE (js/modules/rooms.js)
   Full feature for creating, viewing, editing, and removing hospital rooms.
   ═════════════════════════════════════════════════════════════════════════════ */

function getRoomsList() {
    var rooms = DB.get('rooms') || [];
    if (!Array.isArray(rooms) || rooms.length === 0) {
        rooms = [
            { id: 'room_101', roomNo: '101', floor: 1, category: 'Deluxe Special', beds: ['A', 'B'], status: 'active' },
            { id: 'room_102', roomNo: '102', floor: 1, category: 'Semi Special', beds: ['A', 'B'], status: 'active' },
            { id: 'room_103', roomNo: '103', floor: 1, category: 'Twin Sharing', beds: ['A', 'B'], status: 'active' },
            { id: 'room_201', roomNo: '201', floor: 2, category: 'Super Deluxe', beds: ['A'], status: 'active' },
            { id: 'room_ICU1', roomNo: 'ICU-1', floor: 2, category: 'ICU', beds: ['A', 'B', 'C', 'D'], status: 'active' }
        ];
        DB.set('rooms', rooms);
    }
    return rooms;
}

function saveRoomsList(list) {
    DB.set('rooms', list);
    if (typeof WS_NOTIFY !== 'undefined' && WS_NOTIFY.push) {
        WS_NOTIFY.push('🏥 Room Master Updated', 'Hospital room configuration updated.', 'info', 'rooms');
    }
}

function renderRooms(container) {
    if (!container) container = document.getElementById('mainContent');
    if (!container) return;

    var html = `
        <div class="flex-between mb-4" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <div>
                <h2 style="margin:0;font-size:22px;font-weight:700;display:flex;align-items:center;gap:8px;">
                    🏥 Room & Ward Management
                </h2>
                <div style="font-size:13px;color:var(--gray);margin-top:2px;">Create, manage, filter, and remove hospital rooms and bed configurations</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="showRoomCreateModal()" style="display:flex;align-items:center;gap:6px;font-weight:600;">
                    ➕ Create New Room
                </button>
                <button class="btn btn-outline" onclick="exportRoomsToExcel()" style="display:flex;align-items:center;gap:4px;">
                    📥 Export Excel
                </button>
            </div>
        </div>

        <div class="card mb-4" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;align-items:end;">
                <div>
                    <label style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;display:block;">🔍 Search Room No or Category</label>
                    <input type="text" id="roomsSearchInput" class="form-control" placeholder="Search Room No, Ward, Type..." oninput="renderRoomsTable()">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;display:block;">🏢 Filter by Floor</label>
                    <select id="roomsFloorFilter" class="form-control" onchange="renderRoomsTable()">
                        <option value="">All Floors</option>
                        <option value="Ground">Ground Floor</option>
                        <option value="1">1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                        <option value="4">4th Floor</option>
                        <option value="5">5th Floor</option>
                        <option value="6">6th Floor</option>
                        <option value="7">7th Floor</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:4px;display:block;">🏷️ Room Type / Category</label>
                    <select id="roomsCategoryFilter" class="form-control" onchange="renderRoomsTable()">
                        <option value="">All Categories</option>
                        <option value="Deluxe">Deluxe / Super Deluxe</option>
                        <option value="Special">Special / Semi Special</option>
                        <option value="Twin">Twin Sharing</option>
                        <option value="ICU">ICU / Critical Care</option>
                        <option value="General">General Ward</option>
                        <option value="OT">Operation Theatre (OT)</option>
                    </select>
                </div>
                <div>
                    <button class="btn btn-outline" style="width:100%;" onclick="resetRoomsFilter()">🔄 Reset Filters</button>
                </div>
            </div>
        </div>

        <div class="card" style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
            <div class="table-responsive">
                <table class="table" style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:var(--light-gray, #f8fafc);border-bottom:2px solid var(--border);">
                            <th style="padding:12px;text-align:left;">#</th>
                            <th style="padding:12px;text-align:left;">Room No</th>
                            <th style="padding:12px;text-align:left;">Floor</th>
                            <th style="padding:12px;text-align:left;">Category / Type</th>
                            <th style="padding:12px;text-align:left;">Configured Beds</th>
                            <th style="padding:12px;text-align:center;">Bed Count</th>
                            <th style="padding:12px;text-align:center;">Status</th>
                            <th style="padding:12px;text-align:center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="roomsTableBody"></tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    renderRoomsTable();
}

function renderRoomsTable() {
    var tbody = document.getElementById('roomsTableBody');
    if (!tbody) return;

    var rooms = getRoomsList();
    var search = (document.getElementById('roomsSearchInput')?.value || '').trim().toLowerCase();
    var floorF = (document.getElementById('roomsFloorFilter')?.value || '').trim().toLowerCase();
    var catF   = (document.getElementById('roomsCategoryFilter')?.value || '').trim().toLowerCase();

    var filtered = rooms.filter(function(r) {
        if (!r) return false;
        var rNo = String(r.roomNo || '').toLowerCase();
        var cat = String(r.category || '').toLowerCase();
        var fl  = String(r.floor != null ? r.floor : '').toLowerCase();

        if (search && (rNo.indexOf(search) === -1 && cat.indexOf(search) === -1 && fl.indexOf(search) === -1)) return false;
        if (floorF && fl !== floorF && fl.indexOf(floorF) === -1) return false;
        if (catF && cat.indexOf(catF) === -1) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:32px;color:var(--gray);">
                    <div style="font-size:32px;margin-bottom:8px;">🏥</div>
                    <div style="font-size:15px;font-weight:600;">No rooms found matching filters</div>
                    <div style="font-size:12px;margin-top:4px;">Click "Create New Room" above to add a room.</div>
                </td>
            </tr>
        `;
        return;
    }

    filtered.sort(function(a, b) {
        return (parseInt(a.floor) || 0) - (parseInt(b.floor) || 0) || String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true });
    });

    tbody.innerHTML = filtered.map(function(r, idx) {
        var beds = Array.isArray(r.beds) ? r.beds : (r.beds ? String(r.beds).split(',').map(s=>s.trim()) : ['A']);
        var bedsBadges = beds.map(function(b) {
            return `<span class="badge badge-info" style="font-size:11px;margin-right:3px;">Bed ${b}</span>`;
        }).join('');

        var statusClass = r.status === 'maintenance' ? 'badge-warning' : r.status === 'inactive' ? 'badge-danger' : 'badge-success';
        var statusLabel = r.status === 'maintenance' ? 'Maintenance' : r.status === 'inactive' ? 'Inactive' : 'Available';

        return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:12px;font-weight:600;color:var(--gray);">${idx + 1}</td>
                <td style="padding:12px;">
                    <span style="font-size:14px;font-weight:700;color:var(--primary);background:var(--primary-light, #e0e7ff);padding:3px 10px;border-radius:8px;">
                        Room ${r.roomNo || 'N/A'}
                    </span>
                </td>
                <td style="padding:12px;">
                    <strong>Floor ${r.floor != null ? r.floor : '-'}</strong>
                </td>
                <td style="padding:12px;">
                    <span style="font-weight:600;">${r.category || 'General'}</span>
                </td>
                <td style="padding:12px;">${bedsBadges}</td>
                <td style="padding:12px;text-align:center;font-weight:700;font-size:14px;">${beds.length}</td>
                <td style="padding:12px;text-align:center;">
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </td>
                <td style="padding:12px;text-align:center;">
                    <div style="display:flex;gap:4px;justify-content:center;">
                        <button class="btn btn-sm btn-outline" style="font-size:11px;padding:3px 8px;" onclick="showRoomEditModal('${r.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" style="font-size:11px;padding:3px 8px;" onclick="removeRoom('${r.id}')">🗑️ Remove</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function resetRoomsFilter() {
    if (document.getElementById('roomsSearchInput')) document.getElementById('roomsSearchInput').value = '';
    if (document.getElementById('roomsFloorFilter')) document.getElementById('roomsFloorFilter').value = '';
    if (document.getElementById('roomsCategoryFilter')) document.getElementById('roomsCategoryFilter').value = '';
    renderRoomsTable();
}

function showRoomCreateModal() {
    var modalHtml = `
        <form id="createRoomForm" onsubmit="event.preventDefault(); saveNewRoom();">
            <div class="form-group mb-3">
                <label style="font-weight:600;margin-bottom:4px;display:block;">Room Number / Identifier *</label>
                <input type="text" name="roomNo" class="form-control" placeholder="e.g. 101, 205, ICU-1" required>
            </div>
            <div class="grid-2 mb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label style="font-weight:600;margin-bottom:4px;display:block;">Floor *</label>
                    <select name="floor" class="form-control" required>
                        <option value="Ground">Ground Floor</option>
                        <option value="1" selected>1st Floor</option>
                        <option value="2">2nd Floor</option>
                        <option value="3">3rd Floor</option>
                        <option value="4">4th Floor</option>
                        <option value="5">5th Floor</option>
                        <option value="6">6th Floor</option>
                        <option value="7">7th Floor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="font-weight:600;margin-bottom:4px;display:block;">Room Category / Ward Type *</label>
                    <select name="category" class="form-control" required>
                        <option value="Deluxe Special">Deluxe Special</option>
                        <option value="Super Deluxe">Super Deluxe</option>
                        <option value="Semi Special">Semi Special</option>
                        <option value="Twin Sharing">Twin Sharing</option>
                        <option value="General Ward">General Ward</option>
                        <option value="ICU">ICU (Intensive Care)</option>
                        <option value="OT">Operation Theatre (OT)</option>
                        <option value="Day Care">Day Care</option>
                        <option value="Isolation Ward">Isolation Ward</option>
                    </select>
                </div>
            </div>
            <div class="form-group mb-3">
                <label style="font-weight:600;margin-bottom:4px;display:block;">Beds Configuration (comma separated) *</label>
                <input type="text" name="beds" class="form-control" placeholder="e.g. A, B or Bed-1, Bed-2" value="A, B" required>
                <small style="color:var(--gray);font-size:11px;">Specify bed identifiers separated by commas (e.g. A, B, C)</small>
            </div>
            <div class="form-group mb-3">
                <label style="font-weight:600;margin-bottom:4px;display:block;">Room Operational Status</label>
                <select name="status" class="form-control">
                    <option value="active">Available / Operational</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
        </form>
    `;

    openFormModal('🏥 Create New Hospital Room', modalHtml, 'saveNewRoom()', false);
}

function saveNewRoom() {
    var form = document.getElementById('createRoomForm');
    if (!form) return;

    var roomNo = (form.querySelector('[name="roomNo"]').value || '').trim();
    var floor  = (form.querySelector('[name="floor"]').value || '').trim();
    var cat    = (form.querySelector('[name="category"]').value || '').trim();
    var bedsStr = (form.querySelector('[name="beds"]').value || '').trim();
    var status = (form.querySelector('[name="status"]').value || 'active');

    if (!roomNo) {
        if (typeof APP !== 'undefined' && APP.notify) APP.notify('Please enter a valid Room Number', 'error');
        return;
    }

    var rooms = getRoomsList();
    var exists = rooms.some(function(r){ return String(r.roomNo).toLowerCase() === roomNo.toLowerCase(); });
    if (exists) {
        if (typeof APP !== 'undefined' && APP.notify) APP.notify('Room Number "' + roomNo + '" already exists!', 'error');
        return;
    }

    var beds = bedsStr.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if (beds.length === 0) beds = ['A'];

    var newRoom = {
        id: 'room_' + roomNo.replace(/\s+/g, '_') + '_' + Date.now(),
        roomNo: roomNo,
        floor: floor,
        category: cat,
        beds: beds,
        status: status,
        createdAt: new Date().toISOString()
    };

    rooms.push(newRoom);
    saveRoomsList(rooms);

    closeFormModal();
    if (typeof APP !== 'undefined' && APP.notify) APP.notify('Room "' + roomNo + '" created successfully!', 'success');
    renderRoomsTable();
}

function showRoomEditModal(id) {
    var rooms = getRoomsList();
    var room = rooms.find(function(r){ return String(r.id) === String(id); });
    if (!room) return;

    var bedsStr = Array.isArray(room.beds) ? room.beds.join(', ') : (room.beds || 'A');

    var modalHtml = `
        <form id="editRoomForm">
            <input type="hidden" name="id" value="${room.id}">
            <div class="form-group mb-3">
                <label style="font-weight:600;margin-bottom:4px;display:block;">Room Number / Identifier *</label>
                <input type="text" name="roomNo" class="form-control" value="${room.roomNo || ''}" required>
            </div>
            <div class="grid-2 mb-3" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label style="font-weight:600;margin-bottom:4px;display:block;">Floor *</label>
                    <input type="text" name="floor" class="form-control" value="${room.floor != null ? room.floor : '1'}" required>
                </div>
                <div class="form-group">
                    <label style="font-weight:600;margin-bottom:4px;display:block;">Room Category / Ward Type *</label>
                    <input type="text" name="category" class="form-control" value="${room.category || 'Deluxe Special'}" required>
                </div>
            </div>
            <div class="form-group mb-3">
                <label style="font-weight:600;margin-bottom:4px;display:block;">Beds Configuration (comma separated) *</label>
                <input type="text" name="beds" class="form-control" value="${bedsStr}" required>
            </div>
            <div class="form-group mb-3">
                <label style="font-weight:600;margin-bottom:4px;display:block;">Room Operational Status</label>
                <select name="status" class="form-control">
                    <option value="active" ${room.status === 'active' || !room.status ? 'selected' : ''}>Available / Operational</option>
                    <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Under Maintenance</option>
                    <option value="inactive" ${room.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        </form>
    `;

    openFormModal('✏️ Edit Hospital Room', modalHtml, 'updateRoom()', false);
}

function updateRoom() {
    var form = document.getElementById('editRoomForm');
    if (!form) return;

    var id     = (form.querySelector('[name="id"]').value || '').trim();
    var roomNo = (form.querySelector('[name="roomNo"]').value || '').trim();
    var floor  = (form.querySelector('[name="floor"]').value || '').trim();
    var cat    = (form.querySelector('[name="category"]').value || '').trim();
    var bedsStr = (form.querySelector('[name="beds"]').value || '').trim();
    var status = (form.querySelector('[name="status"]').value || 'active');

    if (!id || !roomNo) return;

    var rooms = getRoomsList();
    var room = rooms.find(function(r){ return String(r.id) === String(id); });
    if (!room) return;

    var beds = bedsStr.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if (beds.length === 0) beds = ['A'];

    room.roomNo = roomNo;
    room.floor = floor;
    room.category = cat;
    room.beds = beds;
    room.status = status;
    room.updatedAt = new Date().toISOString();

    saveRoomsList(rooms);
    closeFormModal();
    if (typeof APP !== 'undefined' && APP.notify) APP.notify('Room "' + roomNo + '" updated successfully!', 'success');
    renderRoomsTable();
}

function removeRoom(id) {
    var rooms = getRoomsList();
    var room = rooms.find(function(r){ return String(r.id) === String(id); });
    if (!room) return;

    if (!confirm('Are you sure you want to remove Room ' + (room.roomNo || '') + '? This action cannot be undone.')) return;

    rooms = rooms.filter(function(r){ return String(r.id) !== String(id); });
    saveRoomsList(rooms);

    if (typeof APP !== 'undefined' && APP.notify) APP.notify('Room "' + (room.roomNo || '') + '" removed successfully!', 'success');
    renderRoomsTable();
}

function exportRoomsToExcel() {
    var rooms = getRoomsList();
    if (rooms.length === 0) {
        if (typeof APP !== 'undefined' && APP.notify) APP.notify('No room records to export', 'error');
        return;
    }

    var csv = 'Room No,Floor,Category,Beds,Total Beds,Status\n';
    rooms.forEach(function(r) {
        var bedsStr = Array.isArray(r.beds) ? r.beds.join('; ') : (r.beds || 'A');
        var bedCount = Array.isArray(r.beds) ? r.beds.length : 1;
        csv += `"${r.roomNo || ''}","${r.floor != null ? r.floor : ''}","${r.category || ''}","${bedsStr}",${bedCount},"${r.status || 'active'}"\n`;
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Hospital_Rooms_Master_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
}
