let ambMap = null;
let ambMarkers = [];
let ambTrackingInterval = null;
let ambRouteLine = null;

function renderAmbulance(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="ambSearch" placeholder="${T('ambmod_search_placeholder')}" oninput="renderAmbList()">
            </div>
            <button class="btn btn-primary" onclick="showAmbForm()">${T('ambmod_add_ambulance')}</button>
        </div>

        <div id="ambStats" class="grid-4 mb-4"></div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchAmbTab('map',this)">🗺️ ${T('ambmod_tab_live_map')}</button>
            <button class="tab-btn" onclick="switchAmbTab('ambulances',this)">🚑 ${T('ambmod_tab_ambulances')}</button>
            <button class="tab-btn" onclick="switchAmbTab('trips',this)">📋 ${T('ambmod_tab_trips')}</button>
        </div>

        <div id="ambMapTab" class="tab-content active">
            <div class="card">
                <div class="card-header">
                    <h2>${T('ambmod_live_gps_tracking')}</h2>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <span id="ambLastUpdate" style="font-size:12px;color:var(--gray);"></span>
                        <button class="btn btn-sm btn-primary" onclick="simulateAmbulanceMovement()">${T('ambmod_simulate_move')}</button>
                        <button class="btn btn-sm btn-success" onclick="centerMapOnAmbulances()">${T('ambmod_center_all')}</button>
                    </div>
                </div>
                <div id="ambMapContainer" style="height:420px;border-radius:8px;border:1px solid var(--light-gray);"></div>
                <div id="ambCoordDisplay" style="font-size:12px;color:var(--gray);margin-top:8px;text-align:center;"></div>
            </div>

            <div class="card">
                <div class="card-header"><h2>📍 ${T('ambmod_find_destination')}</h2></div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <input type="text" id="ambDestSearch" class="form-control" placeholder="${T('ambmod_dest_search_placeholder')}" style="flex:1;min-width:200px;">
                    <button class="btn btn-primary" onclick="searchDestination()">🔍 ${T('ambmod_search')}</button>
                    <button class="btn btn-success" onclick="useCurrentLocation()">📍 ${T('ambmod_my_location')}</button>
                </div>
                <div id="ambDestResults" style="margin-top:8px;"></div>
            </div>
        </div>

        <div id="ambAmbTab" class="tab-content">
            <div class="card">
                <div class="table-responsive">
                    <table>
                        <thead><tr>
                            <th>${T('ambmod_th_vehicle_no')}</th><th>${T('ambmod_th_driver')}</th><th>${T('ambmod_th_phone')}</th><th>${T('ambmod_th_status')}</th>
                            <th>${T('ambmod_th_location')}</th><th>${T('ambmod_th_speed')}</th><th>${T('ambmod_th_last_updated')}</th><th>${T('ambmod_th_actions')}</th>
                        </tr></thead>
                        <tbody id="ambTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="ambTripTab" class="tab-content">
            <div class="flex-between mb-4">
                <h3 style="font-size:16px;">${T('ambmod_trip_history')}</h3>
                <button class="btn btn-primary" onclick="showTripForm()">${T('ambmod_new_trip')}</button>
            </div>
            <div class="card">
                <div class="table-responsive">
                    <table>
                        <thead><tr>
                            <th>${T('ambmod_th_date')}</th><th>${T('ambmod_th_vehicle')}</th><th>${T('ambmod_th_driver')}</th><th>${T('ambmod_th_patient')}</th>
                            <th>${T('ambmod_th_pickup_drop')}</th><th>${T('ambmod_th_km')}</th><th>${T('ambmod_th_status')}</th><th>${T('ambmod_th_actions')}</th>
                        </tr></thead>
                        <tbody id="ambTripBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    renderAmbList();
    renderTripList();
    setTimeout(() => initAmbulanceMap(), 300);
    startAmbulanceTracking();
}

function switchAmbTab(tab, btn) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#ambMapTab,#ambAmbTab,#ambTripTab').forEach(t => t.classList.remove('active'));
    document.getElementById('ambMapTab').classList.toggle('active', tab === 'map');
    document.getElementById('ambAmbTab').classList.toggle('active', tab === 'ambulances');
    document.getElementById('ambTripTab').classList.toggle('active', tab === 'trips');
    if (tab === 'map') {
        if (!ambMap) setTimeout(() => initAmbulanceMap(), 300);
        else setTimeout(() => ambMap.invalidateSize(), 200);
    }
}

function initAmbulanceMap() {
    const el = document.getElementById('ambMapContainer');
    if (!el) return;
    if (ambMap) { ambMap.remove(); ambMap = null; }
    if (typeof L === 'undefined') {
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:var(--gray);background:#f8f9fa;border-radius:8px;"><div style="font-size:40px;">🗺️</div><div style="font-size:16px;font-weight:600;margin:8px 0;">' + T('ambmod_map_load_failed') + '</div><div style="font-size:13px;">' + T('ambmod_map_load_desc') + '</div><button class="btn btn-primary mt-4" onclick="initAmbulanceMap()">' + T('ambmod_retry') + '</button></div>';
        return;
    }
    ambMap = L.map('ambMapContainer').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(ambMap);
    ambMarkers = [];
    updateMapMarkers();
}

function updateMapMarkers() {
    if (!ambMap) return;
    ambMarkers.forEach(m => ambMap.removeLayer(m));
    ambMarkers = [];
    const ambulances = DB.get('ambulance');
    const active = ambulances.filter(a => a.latitude && a.longitude);
    active.forEach(a => {
        const color = a.status === 'on-duty' ? 'red' : a.status === 'available' ? 'green' : 'orange';
        const icon = L.divIcon({
            html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚑</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        const marker = L.marker([a.latitude, a.longitude], { icon }).addTo(ambMap);
        marker.bindPopup(`
            <b>${a.vehicleNo}</b><br>
            ${T('ambmod_popup_driver')}: ${a.driverName || 'N/A'}<br>
            ${T('ambmod_popup_status')}: ${a.status}<br>
            ${T('ambmod_popup_speed')}: ${a.speed || 0} km/h<br>
            ${T('ambmod_popup_phone')}: ${a.driverPhone || '-'}
        `);
        ambMarkers.push(marker);
    });
    if (active.length > 0 && !ambRouteLine) centerMapOnAmbulances();
}

function centerMapOnAmbulances() {
    if (!ambMap || ambMarkers.length === 0) return;
    const group = L.featureGroup(ambMarkers);
    ambMap.fitBounds(group.getBounds().pad(0.2));
}

function searchDestination() {
    const q = document.getElementById('ambDestSearch')?.value.trim();
    const resultsEl = document.getElementById('ambDestResults');
    if (!q) { resultsEl.innerHTML = '<span style="color:var(--danger);font-size:13px;">' + T('ambmod_enter_dest_name') + '</span>'; return; }
    resultsEl.innerHTML = '<span style="font-size:13px;color:var(--gray);">' + T('ambmod_searching') + '</span>';
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=in`)
        .then(r => r.json())
        .then(data => {
            if (!data || data.length === 0) {
                resultsEl.innerHTML = '<span style="color:var(--danger);font-size:13px;">' + T('ambmod_no_results') + '</span>';
                return;
            }
            resultsEl.innerHTML = data.map((r, i) => `
                <div style="padding:8px 12px;border:1px solid var(--light-gray);border-radius:6px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:white;"
                     onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='white'"
                     onclick="selectDestination(${r.lat},${r.lon},'${r.display_name.replace(/'/g,"\\'")}')">
                    <span style="font-size:13px;">${r.display_name}</span>
                    <button class="btn btn-sm btn-primary">${T('ambmod_select')}</button>
                </div>
            `).join('');
        })
        .catch(() => { resultsEl.innerHTML = '<span style="color:var(--danger);font-size:13px;">' + T('ambmod_search_failed') + '</span>'; });
}

function selectDestination(lat, lon, name) {
    if (!ambMap) return;
    if (ambRouteLine) ambMap.removeLayer(ambRouteLine);
    const marker = L.marker([lat, lon]).addTo(ambMap);
    marker.bindPopup(`<b>${T('ambmod_destination')}</b><br>${name.substring(0, 60)}...`).openPopup();
    ambMap.setView([lat, lon], 14);
    ambMarkers.push(marker);
    document.getElementById('ambDestResults').innerHTML = `<div style="padding:8px 12px;background:#e6f4ea;border-radius:6px;font-size:13px;color:var(--secondary);">✅ ${T('ambmod_selected')} ${name.substring(0, 80)}</div>`;
    document.getElementById('ambDestSearch').value = name.substring(0, 60);
}

function useCurrentLocation() {
    if (!navigator.geolocation) { APP.notify(T('ambmod_geolocation_not_supported'), 'error'); return; }
    navigator.geolocation.getCurrentPosition(
        pos => {
            if (!ambMap) return;
            ambMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
            L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(ambMap)
                .bindPopup('<b>' + T('ambmod_your_location') + '</b>').openPopup();
        },
        () => APP.notify(T('ambmod_could_not_get_location'), 'error')
    );
}

function renderAmbList() {
    const ambulances = DB.get('ambulance');
    const search = (document.getElementById('ambSearch')?.value || '').toLowerCase();
    const filtered = ambulances.filter(a =>
        a.vehicleNo.toLowerCase().includes(search) ||
        a.driverName.toLowerCase().includes(search)
    );

    const total = ambulances.length;
    const available = ambulances.filter(a => a.status === 'available').length;
    const onDuty = ambulances.filter(a => a.status === 'on-duty').length;
    const maintenance = ambulances.filter(a => a.status === 'maintenance').length;
    const statsEl = document.getElementById('ambStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card" style="border-left-color:var(--primary)"><div class="stat-value">${total}</div><div class="stat-label">${T('ambmod_stat_total')}</div></div>
            <div class="stat-card" style="border-left-color:var(--secondary)"><div class="stat-value">${available}</div><div class="stat-label">${T('ambmod_stat_available')}</div></div>
            <div class="stat-card" style="border-left-color:var(--info)"><div class="stat-value">${onDuty}</div><div class="stat-label">${T('ambmod_stat_on_duty')}</div></div>
            <div class="stat-card" style="border-left-color:var(--warning)"><div class="stat-value">${maintenance}</div><div class="stat-label">${T('ambmod_stat_maintenance')}</div></div>
        `;
    }

    const tbody = document.getElementById('ambTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(a => `
        <tr>
            <td><strong>${a.vehicleNo}</strong></td>
            <td>${a.driverName || '-'}</td>
            <td>${a.driverPhone || '-'}</td>
            <td><span class="badge ${a.status === 'available' ? 'badge-success' : a.status === 'on-duty' ? 'badge-info' : 'badge-warning'}">${a.status}</span></td>
            <td>${a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : T('ambmod_not_tracked')}</td>
            <td>${a.speed || 0} km/h</td>
            <td>${a.lastUpdated ? APP.formatDateTime(a.lastUpdated) : '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editAmb('${a.id}')">${T('ambmod_edit')}</button>
                <button class="btn btn-sm btn-success" onclick="updateAmbStatus('${a.id}')">${T('ambmod_status_btn')}</button>
                <button class="btn btn-sm btn-info" onclick="startTripFromAmb('${a.id}')">${T('ambmod_trip_btn')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAmb('${a.id}')">${T('ambmod_del')}</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="8" class="empty-state">${T('ambmod_no_ambulances')}</td></tr>`;
}

function showAmbForm(amb) {
    const depts = DB.get('departments');
    const form = `
        <form id="ambForm">
            <input type="hidden" name="id" value="${amb?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('ambmod_lbl_vehicle_number')}</label>
                    <input type="text" name="vehicleNo" class="form-control" value="${amb?.vehicleNo || ''}" required>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_driver_name')}</label>
                    <input type="text" name="driverName" class="form-control" value="${amb?.driverName || ''}">
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_driver_phone')}</label>
                    <input type="text" name="driverPhone" class="form-control" value="${amb?.driverPhone || ''}">
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_department')}</label>
                    <select name="department" class="form-control">
                        <option value="Transportation">${T('ambmod_opt_transportation')}</option>
                        <option value="Emergency" ${amb?.department === 'Emergency' ? 'selected' : ''}>${T('ambmod_opt_emergency')}</option>
                        ${depts.filter(d => d.active !== false).map(d => `<option value="${d.name}" ${amb?.department === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_status')}</label>
                    <select name="status" class="form-control">
                        <option value="available" ${amb?.status === 'available' ? 'selected' : ''}>${T('ambmod_opt_available')}</option>
                        <option value="on-duty" ${amb?.status === 'on-duty' ? 'selected' : ''}>${T('ambmod_opt_on_duty')}</option>
                        <option value="maintenance" ${amb?.status === 'maintenance' ? 'selected' : ''}>${T('ambmod_opt_maintenance')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_ambulance_type')}</label>
                    <select name="ambType" class="form-control">
                        <option value="basic" ${amb?.ambType === 'basic' ? 'selected' : ''}>${T('ambmod_opt_basic')}</option>
                        <option value="advanced" ${amb?.ambType === 'advanced' ? 'selected' : ''}>${T('ambmod_opt_advanced')}</option>
                        <option value="mobile" ${amb?.ambType === 'mobile' ? 'selected' : ''}>${T('ambmod_opt_mobile_icu')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_latitude')}</label>
                    <input type="number" name="latitude" step="0.0001" class="form-control" value="${amb?.latitude || 12.9716}">
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_longitude')}</label>
                    <input type="number" name="longitude" step="0.0001" class="form-control" value="${amb?.longitude || 77.5946}">
                </div>
            </div>
            <div class="form-group">
                <label>${T('ambmod_lbl_equipment')}</label>
                <textarea name="equipment" class="form-control">${amb?.equipment || ''}</textarea>
            </div>
        </form>
    `;
    openFormModal(amb ? T('ambmod_edit_ambulance') : T('ambmod_add_ambulance_title'), form, `saveAmb()`, true);
}

function saveAmb() {
    const data = getFormData('ambForm');
    if (!data.vehicleNo) { APP.notify(T('ambmod_vehicle_number_required'), 'error'); return; }
    data.speed = 0;
    data.lastUpdated = new Date().toISOString();
    if (data.latitude) data.latitude = parseFloat(data.latitude);
    if (data.longitude) data.longitude = parseFloat(data.longitude);
    if (data.id) {
        DB.update('ambulance', data.id, data);
        APP.notify(T('ambmod_ambulance_updated'), 'success');
    } else {
        DB.add('ambulance', data);
        APP.notify(T('ambmod_ambulance_added'), 'success');
    }
    renderAmbList();
    updateMapMarkers();
}

function editAmb(id) {
    const amb = DB.getById('ambulance', id);
    if (amb) showAmbForm(amb);
}

function deleteAmb(id) {
    confirmAction(T('ambmod_confirm_delete_ambulance'), () => {
        DB.delete('ambulance', id);
        APP.notify(T('ambmod_ambulance_deleted'), 'success');
        renderAmbList();
        updateMapMarkers();
    });
}

function updateAmbStatus(id) {
    const amb = DB.getById('ambulance', id);
    if (!amb) return;
    const statuses = ['available', 'on-duty', 'maintenance'];
    const nextIdx = (statuses.indexOf(amb.status) + 1) % statuses.length;
    DB.update('ambulance', id, { status: statuses[nextIdx], lastUpdated: new Date().toISOString() });
    APP.notify(`${T('ambmod_status_changed_to')} ${statuses[nextIdx]}`, 'info');
    renderAmbList();
    updateMapMarkers();
}

function startAmbulanceTracking() {
    if (ambTrackingInterval) clearInterval(ambTrackingInterval);
    const updateDisplay = () => {
        const ambulances = DB.get('ambulance');
        const onDuty = ambulances.filter(a => a.status === 'on-duty');
        const coordsEl = document.getElementById('ambCoordDisplay');
        const updateEl = document.getElementById('ambLastUpdate');
        if (coordsEl) {
            if (onDuty.length > 0) {
                coordsEl.innerHTML = onDuty.map(a =>
                    `🚑 ${a.vehicleNo}: ${a.latitude?.toFixed(4) || 'N/A'}, ${a.longitude?.toFixed(4) || 'N/A'} | Speed: ${a.speed || 0} km/h`
                ).join(' &nbsp;|&nbsp; ');
            } else {
                coordsEl.innerHTML = T('ambmod_no_on_duty_tracking');
            }
        }
        if (updateEl) updateEl.textContent = T('ambmod_updated_prefix') + ' ' + new Date().toLocaleTimeString();
        updateMapMarkers();
    };
    updateDisplay();
    ambTrackingInterval = setInterval(updateDisplay, 4000);
}

function simulateAmbulanceMovement() {
    const ambulances = DB.get('ambulance');
    const onDuty = ambulances.filter(a => a.status === 'on-duty');
    if (onDuty.length === 0) {
        APP.notify(T('ambmod_no_on_duty_simulate'), 'warning');
        return;
    }
    onDuty.forEach(a => {
        const lat = (a.latitude || 12.9716) + (Math.random() - 0.5) * 0.008;
        const lng = (a.longitude || 77.5946) + (Math.random() - 0.5) * 0.008;
        const speed = Math.round(15 + Math.random() * 65);
        DB.update('ambulance', a.id, {
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lng.toFixed(6)),
            speed,
            lastUpdated: new Date().toISOString()
        });
    });
    APP.notify(`${T('ambmod_updated_position_1')} ${onDuty.length} ${T('ambmod_updated_position_2')}`, 'success');
    renderAmbList();
    updateMapMarkers();
}

function startTripFromAmb(ambId) {
    const amb = DB.getById('ambulance', ambId);
    if (!amb) return;
    showTripForm(amb);
}

function showTripForm(prefillAmb) {
    const ambulances = DB.get('ambulance').filter(a => a.status !== 'maintenance');
    const form = `
        <form id="tripForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('ambmod_lbl_ambulance')}</label>
                    <select name="ambulanceId" class="form-control" required>
                        <option value="">${T('ambmod_select_ambulance')}</option>
                        ${ambulances.map(a => `<option value="${a.id}" ${prefillAmb?.id === a.id ? 'selected' : ''}>${a.vehicleNo} - ${a.driverName || T('ambmod_no_driver')}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_driver_name')}</label>
                    <input type="text" name="driverName" class="form-control" value="${prefillAmb?.driverName || ''}">
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_patient_name')}</label>
                    <input type="text" name="patientName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_patient_age')}</label>
                    <input type="number" name="patientAge" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_pickup_location')}</label>
                    <input type="text" name="pickupLocation" class="form-control" placeholder="${T('ambmod_ph_address_landmark')}" required>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_drop_location')}</label>
                    <input type="text" name="dropLocation" class="form-control" placeholder="${T('ambmod_ph_hospital_dest')}" required>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_total_km')}</label>
                    <input type="number" name="kilometers" class="form-control" step="0.1" min="0" placeholder="${T('ambmod_ph_km_example')}" required>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_trip_type')}</label>
                    <select name="tripType" class="form-control">
                        <option value="emergency">${T('ambmod_opt_trip_emergency')}</option>
                        <option value="transfer">${T('ambmod_opt_patient_transfer')}</option>
                        <option value="discharge">${T('ambmod_opt_discharge_drop')}</option>
                        <option value="other">${T('ambmod_opt_other')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_fare')}</label>
                    <input type="number" name="fare" class="form-control" min="0" value="0">
                </div>
                <div class="form-group">
                    <label>${T('ambmod_lbl_payment_mode')}</label>
                    <select name="paymentMode" class="form-control">
                        <option value="cash">${T('ambmod_opt_cash')}</option>
                        <option value="card">${T('ambmod_opt_card')}</option>
                        <option value="online">${T('ambmod_opt_online')}</option>
                        <option value="free">${T('ambmod_opt_free')}</option>
                        <option value="pending">${T('ambmod_opt_pending')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${T('ambmod_lbl_notes_obs')}</label>
                <textarea name="notes" class="form-control" rows="2"></textarea>
            </div>
        </form>
    `;
    openFormModal(T('ambmod_record_trip'), form, `saveTrip()`, true);
}

function saveTrip() {
    const data = getFormData('tripForm');
    if (!data.ambulanceId || !data.patientName || !data.pickupLocation || !data.dropLocation || !data.kilometers) {
        APP.notify(T('ambmod_fill_required'), 'error'); return;
    }
    const amb = DB.getById('ambulance', data.ambulanceId);
    if (amb) {
        data.vehicleNo = amb.vehicleNo;
        if (!data.driverName) data.driverName = amb.driverName || '';
        DB.update('ambulance', data.ambulanceId, { status: 'on-duty', lastUpdated: new Date().toISOString() });
    }
    data.status = 'completed';
    DB.add('ambulance_trips', data);
    APP.notify(T('ambmod_trip_recorded'), 'success');
    renderTripList();
    renderAmbList();
    updateMapMarkers();
}

function renderTripList() {
    const trips = DB.get('ambulance_trips');
    const tbody = document.getElementById('ambTripBody');
    if (!tbody) return;
    tbody.innerHTML = trips.slice().reverse().map(t => `
        <tr>
            <td>${APP.formatDateTime(t.createdAt)}</td>
            <td>${t.vehicleNo || '-'}</td>
            <td>${t.driverName || '-'}</td>
            <td><strong>${t.patientName}</strong>${t.patientAge ? ' ('+t.patientAge+')' : ''}</td>
            <td style="font-size:12px;">${t.pickupLocation} → ${t.dropLocation}</td>
            <td>${t.kilometers} km</td>
            <td><span class="badge ${t.status === 'completed' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewTrip('${t.id}')">${T('ambmod_view')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTrip('${t.id}')">${T('ambmod_del')}</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="8" class="empty-state">${T('ambmod_no_trips')}</td></tr>`;
}

function viewTrip(id) {
    const t = DB.getById('ambulance_trips', id);
    if (!t) return;
    showModal(`
        <div class="modal-header">
            <h3>${T('ambmod_trip_title')} ${t.patientName}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>${T('ambmod_lbl_vehicle')}</strong> ${t.vehicleNo || '-'}</div>
            <div><strong>${T('ambmod_lbl_driver')}</strong> ${t.driverName || '-'}</div>
            <div><strong>${T('ambmod_lbl_patient')}</strong> ${t.patientName} ${t.patientAge ? '('+t.patientAge+')' : ''}</div>
            <div><strong>${T('ambmod_lbl_date')}</strong> ${APP.formatDateTime(t.createdAt)}</div>
            <div><strong>${T('ambmod_lbl_pickup')}</strong> ${t.pickupLocation}</div>
            <div><strong>${T('ambmod_lbl_drop')}</strong> ${t.dropLocation}</div>
            <div><strong>${T('ambmod_lbl_kilometers')}</strong> ${t.kilometers} km</div>
            <div><strong>${T('ambmod_lbl_type')}</strong> ${t.tripType || 'emergency'}</div>
            <div><strong>${T('ambmod_lbl_fare_view')}</strong> ₹${t.fare || 0}</div>
            <div><strong>${T('ambmod_lbl_payment')}</strong> ${t.paymentMode || 'cash'}</div>
        </div>
        ${t.notes ? `<div class="mt-4"><strong>${T('ambmod_lbl_notes')}</strong><br>${t.notes}</div>` : ''}
        <div class="modal-footer"><button class="btn btn-primary" onclick="this.closest('.modal').remove()">${T('ambmod_close')}</button></div>
    `);
}

function deleteTrip(id) {
    confirmAction(T('ambmod_confirm_delete_trip'), () => {
        DB.delete('ambulance_trips', id);
        APP.notify(T('ambmod_trip_deleted'), 'success');
        renderTripList();
    });
}
