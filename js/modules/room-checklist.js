function renderRoomChecklist(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="roomSearch" placeholder="${T('rcmod_search_placeholder')}" oninput="renderRoomList()">
            </div>
            <button class="btn btn-primary" onclick="showRoomForm('pre-admission')">${T('rcmod_btn_pre_admission')}</button>
            <button class="btn btn-info" onclick="showRoomForm('post-discharge')">${T('rcmod_btn_post_discharge')}</button>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchRoomTab('all',this)">${T('rcmod_tab_all')}</button>
            <button class="tab-btn" onclick="switchRoomTab('pre-admission',this)">${T('rcmod_tab_pre_admission')}</button>
            <button class="tab-btn" onclick="switchRoomTab('post-discharge',this)">${T('rcmod_tab_post_discharge')}</button>
            <button class="tab-btn" onclick="switchRoomTab('completed',this)">${T('rcmod_tab_completed')}</button>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>${T('rcmod_th_room_no')}</th><th>${T('rcmod_th_type')}</th><th>${T('rcmod_th_checked_by')}</th><th>${T('rcmod_th_date')}</th>
                        <th>${T('rcmod_th_items_ok')}</th><th>${T('rcmod_th_issues')}</th><th>${T('rcmod_th_status')}</th><th>${T('rcmod_th_actions')}</th>
                    </tr></thead>
                    <tbody id="roomTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderRoomList();
}

let roomFilter = 'all';

function switchRoomTab(filter, btn) {
    roomFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRoomList();
}

const ROOM_ITEMS = {
    'pre-admission': [
        'Bed sheet clean', 'Pillow available', 'Blanket clean', 'IV stand working',
        'Bedside table clean', 'Call bell working', 'Lighting working', 'AC/Fan working',
        'TV remote working', 'Bathroom clean', 'Water supply', 'Soap/Towel placed',
        'Dustbin empty', 'Floor mopped', 'Window clean', 'Curtain clean',
        'Emergency button working', 'Medical gas outlet', 'Suction outlet', 'Oxygen outlet'
    ],
    'post-discharge': [
        'Bed sheet removed', 'Pillow cover removed', 'Blanket collected', 'IV stand cleaned',
        'Bedside table cleaned', 'Call bell checked', 'Lighting checked', 'AC/Fan checked',
        'TV remote collected', 'Bathroom disinfected', 'Water supply off', 'Soap/Towel removed',
        'Dustbin emptied', 'Floor disinfected', 'Window cleaned', 'Curtain removed for wash',
        'Emergency button tested', 'Medical gas off', 'Suction off', 'Oxygen off',
        'Mattress disinfected', 'Bed disinfected', 'Personal items collected', 'Lost & found checked'
    ]
};

// Translation keys parallel to ROOM_ITEMS (same order/length); the ROOM_ITEMS strings
// themselves remain the canonical English identifiers used for storage (checkbox value
// and DB item keys) so saved records stay consistent across languages.
const ROOM_ITEM_KEYS = {
    'pre-admission': [
        'rcmod_pi_bedsheet_clean', 'rcmod_pi_pillow_available', 'rcmod_pi_blanket_clean', 'rcmod_pi_iv_stand_working',
        'rcmod_pi_bedside_table_clean', 'rcmod_pi_call_bell_working', 'rcmod_pi_lighting_working', 'rcmod_pi_ac_fan_working',
        'rcmod_pi_tv_remote_working', 'rcmod_pi_bathroom_clean', 'rcmod_pi_water_supply', 'rcmod_pi_soap_towel_placed',
        'rcmod_pi_dustbin_empty', 'rcmod_pi_floor_mopped', 'rcmod_pi_window_clean', 'rcmod_pi_curtain_clean',
        'rcmod_pi_emergency_button_working', 'rcmod_pi_medical_gas_outlet', 'rcmod_pi_suction_outlet', 'rcmod_pi_oxygen_outlet'
    ],
    'post-discharge': [
        'rcmod_pd_bedsheet_removed', 'rcmod_pd_pillow_cover_removed', 'rcmod_pd_blanket_collected', 'rcmod_pd_iv_stand_cleaned',
        'rcmod_pd_bedside_table_cleaned', 'rcmod_pd_call_bell_checked', 'rcmod_pd_lighting_checked', 'rcmod_pd_ac_fan_checked',
        'rcmod_pd_tv_remote_collected', 'rcmod_pd_bathroom_disinfected', 'rcmod_pd_water_supply_off', 'rcmod_pd_soap_towel_removed',
        'rcmod_pd_dustbin_emptied', 'rcmod_pd_floor_disinfected', 'rcmod_pd_window_cleaned', 'rcmod_pd_curtain_removed_wash',
        'rcmod_pd_emergency_button_tested', 'rcmod_pd_medical_gas_off', 'rcmod_pd_suction_off', 'rcmod_pd_oxygen_off',
        'rcmod_pd_mattress_disinfected', 'rcmod_pd_bed_disinfected', 'rcmod_pd_personal_items_collected', 'rcmod_pd_lost_found_checked'
    ]
};

function renderRoomList() {
    const checklists = DB.get('roomchecklists');
    const search = (document.getElementById('roomSearch')?.value || '').toLowerCase();
    let filtered = checklists.filter(r =>
        r.roomNo.toLowerCase().includes(search) ||
        r.checkedBy.toLowerCase().includes(search)
    );
    if (roomFilter !== 'all') {
        if (roomFilter === 'completed') {
            filtered = filtered.filter(r => r.status === 'completed');
        } else {
            filtered = filtered.filter(r => r.type === roomFilter);
        }
    }

    const tbody = document.getElementById('roomTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(r => {
        const items = r.items || {};
        const totalItems = Object.keys(items).length;
        const okItems = Object.values(items).filter(v => v === true).length;
        const issues = Object.entries(items).filter(([k, v]) => v === false).map(([k]) => k);
        const pct = totalItems > 0 ? Math.round((okItems / totalItems) * 100) : 0;

        return `<tr>
            <td><strong>${r.roomNo}</strong></td>
            <td><span class="badge ${r.type === 'pre-admission' ? 'badge-info' : 'badge-warning'}">${r.type === 'pre-admission' ? T('rcmod_tab_pre_admission') : T('rcmod_tab_post_discharge')}</span></td>
            <td>${r.checkedBy}</td>
            <td>${APP.formatDate(r.createdAt)}</td>
            <td>${okItems}/${totalItems}</td>
            <td>${issues.length > 0 ? `<span style="color:var(--danger)">${issues.length} ${T('rcmod_issues_word')}</span>` : '<span style="color:var(--secondary)">' + T('rcmod_none') + '</span>'}</td>
            <td><span class="badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewRoomChecklist('${r.id}')">${T('rcmod_btn_view')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoomChecklist('${r.id}')">${T('rcmod_btn_delete')}</button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="8" class="empty-state">' + T('rcmod_empty_state') + '</td></tr>';
}

function showRoomForm(type) {
    const items = ROOM_ITEMS[type] || [];
    const itemKeys = ROOM_ITEM_KEYS[type] || [];
    let itemsHtml = items.map((item, idx) => `
        <label class="permission-item" style="background:var(--white);border:1px solid var(--light-gray);">
            <input type="checkbox" name="checkItem" value="${item}" checked>
            <span>${T(itemKeys[idx])}</span>
        </label>
    `).join('');

    const form = `
        <form id="roomForm">
            <input type="hidden" name="type" value="${type}">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('rcmod_room_ward_label')}</label>
                    <input type="text" name="roomNo" class="form-control" placeholder="${T('rcmod_room_placeholder')}" required>
                </div>
                <div class="form-group">
                    <label>${T('rcmod_checked_by_label')}</label>
                    <input type="text" name="checkedBy" class="form-control" required>
                </div>
            </div>
            <div class="form-group">
                <label>${T('rcmod_checklist_items_label')}</label>
                <div class="permission-grid">${itemsHtml}</div>
            </div>
            <div class="form-group">
                <label>${T('rcmod_remarks_label')}</label>
                <textarea name="remarks" class="form-control" rows="2"></textarea>
            </div>
        </form>
    `;
    openFormModal((type === 'pre-admission' ? T('rcmod_tab_pre_admission') : T('rcmod_tab_post_discharge')) + T('rcmod_room_checklist_suffix'), form, `saveRoomChecklist()`, true);
}

function saveRoomChecklist() {
    const form = document.getElementById('roomForm');
    const roomNo = form.querySelector('[name="roomNo"]')?.value;
    const checkedBy = form.querySelector('[name="checkedBy"]')?.value;
    const type = form.querySelector('[name="type"]')?.value;
    const remarks = form.querySelector('[name="remarks"]')?.value || '';

    if (!roomNo || !checkedBy) { APP.notify(T('rcmod_room_checker_required'), 'error'); return; }

    const items = {};
    form.querySelectorAll('[name="checkItem"]').forEach(cb => {
        items[cb.value] = cb.checked;
    });

    DB.add('roomchecklists', {
        roomNo, checkedBy, type, items, remarks,
        status: 'completed'
    });
    APP.notify(T('rcmod_checklist_completed'), 'success');
    renderRoomList();
}

function viewRoomChecklist(id) {
    const r = DB.getById('roomchecklists', id);
    if (!r) return;
    const items = r.items || {};
    const okItems = Object.entries(items).filter(([, v]) => v === true);
    const issues = Object.entries(items).filter(([, v]) => v === false);

    let itemsHtml = '';
    if (okItems.length > 0) {
        itemsHtml += `<div class="mt-2"><strong>${T('rcmod_passed_prefix')}${okItems.length}${T('rcmod_passed_suffix')}</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">`;
        itemsHtml += okItems.map(([k]) => `<span style="background:#e6f4ea;padding:2px 8px;border-radius:4px;font-size:12px;">${k}</span>`).join('');
        itemsHtml += `</div></div>`;
    }
    if (issues.length > 0) {
        itemsHtml += `<div class="mt-2"><strong>${T('rcmod_failed_prefix')}${issues.length}${T('rcmod_failed_suffix')}</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">`;
        itemsHtml += issues.map(([k]) => `<span style="background:#fce8e6;padding:2px 8px;border-radius:4px;font-size:12px;">${k}</span>`).join('');
        itemsHtml += `</div></div>`;
    }

    showModal(`
        <div class="modal-header">
            <h3>${T('rcmod_room_prefix')}${r.roomNo} - ${r.type === 'pre-admission' ? T('rcmod_tab_pre_admission') : T('rcmod_tab_post_discharge')}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>${T('rcmod_checked_by_colon')}</strong> ${r.checkedBy}</div>
            <div><strong>${T('rcmod_date_colon')}</strong> ${APP.formatDateTime(r.createdAt)}</div>
            <div><strong>${T('rcmod_status_colon')}</strong> <span class="badge badge-success">${r.status.toUpperCase()}</span></div>
            <div><strong>${T('rcmod_overall_colon')}</strong> ${okItems.length}/${Object.keys(items).length}${T('rcmod_items_passed_suffix')}</div>
        </div>
        ${itemsHtml}
        ${r.remarks ? `<div class="mt-4"><strong>${T('rcmod_remarks_colon')}</strong><br>${r.remarks}</div>` : ''}
    `, true);
}

function deleteRoomChecklist(id) {
    confirmAction(T('rcmod_delete_confirm'), () => {
        DB.delete('roomchecklists', id);
        renderRoomList();
    });
}
