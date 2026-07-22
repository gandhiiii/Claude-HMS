let gateSection = 'goods';

function isUserHodOfDept(deptName) {
    const user = AUTH.currentUser();
    return user && user.role === 'hod' && user.department && user.department === deptName;
}

function isHod() {
    const user = AUTH.currentUser();
    return user && user.role === 'hod';
}

function getHodDepartments() {
    const user = AUTH.currentUser();
    return user && user.department ? [user.department] : [];
}

function renderGateSecurity(container) {
    const user = AUTH.currentUser();
    container.innerHTML = `
        <div class="flex-between mb-4">
            <h3 style="margin:0;">${T('gsmod_title')}</h3>
        </div>
        <div class="tabs" style="margin-bottom:16px;">
            <button class="tab-btn ${gateSection === 'goods' ? 'active' : ''}" onclick="switchGateSection('goods',this)">🚚 ${T('gsmod_tab_goods')}</button>
            <button class="tab-btn ${gateSection === 'patients' ? 'active' : ''}" onclick="switchGateSection('patients',this)">🧑 ${T('gsmod_tab_patients')}</button>
            <button class="tab-btn ${gateSection === 'doctors' ? 'active' : ''}" onclick="switchGateSection('doctors',this)">🩺 ${T('gsmod_tab_doctors')}</button>
            <button class="tab-btn ${gateSection === 'passes' ? 'active' : ''}" onclick="switchGateSection('passes',this)">🎫 ${T('gsmod_tab_passes')}</button>
            <button class="tab-btn ${gateSection === 'approvals' ? 'active' : ''}" onclick="switchGateSection('approvals',this)">🔄 ${T('gsmod_tab_approvals')}</button>
        </div>
        <div id="gateContent"></div>
    `;
    renderGateSection();
}

function switchGateSection(section, btn) {
    gateSection = section;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGateSection();
}

function renderGateSection() {
    if (gateSection === 'goods') renderGoodsSection();
    else if (gateSection === 'patients') renderPatientsSection();
    else if (gateSection === 'doctors') renderDoctorsSection();
    else if (gateSection === 'approvals') renderApprovalsSection();
    else renderPassGenerator();
}

/* ==================== GOODS (existing) ==================== */

function renderGoodsSection() {
    const el = document.getElementById('gateContent');
    if (!el) return;
    el.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="gateSearch" placeholder="${T('gsmod_search_entries')}" oninput="renderGateList()">
            </div>
            <div>
                <button class="btn btn-success" onclick="showGateForm('in')">+ ${T('gsmod_goods_in')}</button>
                <button class="btn btn-warning" onclick="showGateForm('out')">+ ${T('gsmod_goods_out')}</button>
            </div>
        </div>
        <div class="tabs" style="margin-bottom:8px;">
            <button class="tab-btn active" onclick="switchGateTab('all',this)">${T('gsmod_f_all')}</button>
            <button class="tab-btn" onclick="switchGateTab('pending',this)">${T('gsmod_f_pending')}</button>
            <button class="tab-btn" onclick="switchGateTab('approved',this)">${T('gsmod_f_approved')}</button>
            <button class="tab-btn" onclick="switchGateTab('rejected',this)">${T('gsmod_f_rejected')}</button>
        </div>
        <div class="card"><div class="table-responsive"><table>
            <thead><tr><th>${T('gsmod_th_datetime')}</th><th>${T('gsmod_th_item')}</th><th>${T('gsmod_th_direction')}</th><th>${T('gsmod_th_department')}</th><th>${T('gsmod_th_vehicle')}</th><th>${T('gsmod_th_driver')}</th><th>${T('gsmod_th_purpose')}</th><th>${T('gsmod_th_submitted')}</th><th>${T('gsmod_th_approved')}</th><th>${T('gsmod_th_status')}</th><th>${T('gsmod_th_actions')}</th></tr></thead>
            <tbody id="gateTableBody"></tbody>
        </table></div></div>
    `;
    renderGateList();
}

let gateFilter = 'all';

function switchGateTab(filter, btn) {
    gateFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGateList();
}

function renderGateList() {
    const entries = DB.get('gatesecurity');
    const search = (document.getElementById('gateSearch')?.value || '').toLowerCase();
    const user = AUTH.currentUser();
    let filtered = entries.filter(e =>
        e.itemName.toLowerCase().includes(search) ||
        e.vehicleNo.toLowerCase().includes(search) ||
        e.driverName.toLowerCase().includes(search) ||
        (e.department || '').toLowerCase().includes(search)
    );
    if (gateFilter !== 'all') filtered = filtered.filter(e => e.status === gateFilter);
    const tbody = document.getElementById('gateTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(e => `
        <tr ${e.status === 'rejected' ? 'style="background:rgba(220,53,69,0.08);"' : ''}>
            <td>${APP.formatDateTime(e.createdAt)}</td>
            <td><strong>${e.itemName}</strong></td>
            <td><span class="badge ${e.direction === 'in' ? 'badge-success' : 'badge-danger'}">${e.direction.toUpperCase()}</span></td>
            <td>${e.department || '-'}</td>
            <td>${e.vehicleNo || '-'}</td>
            <td>${e.driverName || '-'} ${e.driverPhone ? '('+e.driverPhone+')' : ''}</td>
            <td>${e.purpose || '-'}</td>
            <td>${e.submittedBy || '-'}</td>
            <td>${e.approvedBy || (e.status === 'rejected' ? '<span style="color:red;">' + T('gsmod_rejected_by') + ' ' + (e.rejectedBy || 'N/A') + '</span>' : '-')}</td>
            <td><span class="badge ${e.status === 'rejected' ? 'badge-danger' : APP.getStatusBadge(e.status)}" style="${e.status === 'rejected' ? 'background:var(--danger);color:#fff;' : ''}">${e.status.toUpperCase()}</span></td>
            <td>
                ${e.status === 'pending' && isUserHodOfDept(e.department) ? `
                    <button class="btn btn-sm btn-success" onclick="approveGateEntry('${e.id}')">${T('gsmod_approve')}</button>
                    <button class="btn btn-sm btn-danger" onclick="showRejectReason('gatesecurity','${e.id}')">${T('gsmod_reject')}</button>
                ` : ''}
                <button class="btn btn-sm btn-primary" onclick="viewGateEntry('${e.id}')">${T('gsmod_view')}</button>
                ${e.status === 'approved' ? `<button class="btn btn-sm btn-info" onclick="printGoodsPass('${e.id}')">🖨️</button>` : ''}
                ${e.status === 'rejected' ? '<span style="color:var(--danger);font-size:11px;font-weight:600;">⛔ ' + T('gsmod_rejected_cap') + '</span>' : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="11" class="empty-state">' + T('gsmod_no_gate_entries') + '</td></tr>';
}

function showGateForm(direction) {
    const form = `
        <form id="gateForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('gsmod_lbl_item')}</label>
                    <input type="text" name="itemName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_direction')}</label>
                    <input type="text" class="form-control" value="${direction.toUpperCase()}" readonly>
                    <input type="hidden" name="direction" value="${direction}">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_vehicle_no_req')}</label>
                    <input type="text" name="vehicleNo" class="form-control" placeholder="${T('gsmod_ph_vehicle')}" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_driver_name')}</label>
                    <input type="text" name="driverName" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_driver_phone')}</label>
                    <input type="text" name="driverPhone" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_quantity')}</label>
                    <input type="text" name="quantity" class="form-control" placeholder="${T('gsmod_ph_quantity')}">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_vendor')}</label>
                    <input type="text" name="vendor" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_department')}</label>
                    ${deptDropdown('department')}
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_gatepass')}</label>
                    <input type="text" name="gatePassNo" class="form-control" value="GP-${Date.now().toString(36).toUpperCase()}">
                </div>
            </div>
            <div class="form-group">
                <label>${T('gsmod_lbl_purpose_details')}</label>
                <textarea name="purpose" class="form-control" required></textarea>
            </div>
            <div class="form-group">
                <label>${T('gsmod_lbl_remarks')}</label>
                <textarea name="remarks" class="form-control"></textarea>
            </div>
        </form>
    `;
    openFormModal(`${direction === 'in' ? T('gsmod_goods_inward') : T('gsmod_goods_outward')} ${T('gsmod_entry_word')}`, form, `saveGateEntry()`);
}

function saveGateEntry() {
    const data = getFormData('gateForm');
    if (!data.itemName || !data.vehicleNo || !data.purpose) {
        APP.notify(T('gsmod_fill_required'), 'error'); return;
    }
    const user = AUTH.currentUser();
    data.status = 'pending';
    data.approvedBy = '';
    data.approvedAt = '';
    data.submittedBy = user ? user.fullName : 'Unknown';
    data.rejectionReason = '';
    DB.add('gatesecurity', data);
    APP.notify(T('gsmod_msg_gate_recorded'), 'success');
    renderGateList();
}

function approveGateEntry(id) {
    const entry = DB.getById('gatesecurity', id);
    if (!entry) return;
    if (!isUserHodOfDept(entry.department)) {
        APP.notify(T('gsmod_only_hod_pre') + ' ' + entry.department + ' ' + T('gsmod_only_hod_approve'), 'error');
        return;
    }
    const user = AUTH.currentUser();
    DB.update('gatesecurity', id, { status: 'approved', approvedBy: user.fullName, approvedAt: new Date().toISOString() });
    APP.notify(T('gsmod_msg_entry_approved'), 'success');
    renderGateList();
    renderApprovalsList();
}

function rejectGateEntry(id, reason) {
    const entry = DB.getById('gatesecurity', id);
    if (!entry) return;
    if (!isUserHodOfDept(entry.department)) {
        APP.notify(T('gsmod_only_hod_pre') + ' ' + entry.department + ' ' + T('gsmod_only_hod_reject'), 'error');
        return;
    }
    DB.update('gatesecurity', id, { status: 'rejected', rejectionReason: reason || 'No reason provided', rejectedBy: AUTH.currentUser()?.fullName || 'Unknown' });
    APP.notify(T('gsmod_msg_entry_rejected'), 'info');
    renderGateList();
    renderApprovalsList();
}

function printGoodsPass(id) {
    const e = DB.getById('gatesecurity', id);
    if (!e) return;
    if (e.status !== 'approved') { APP.notify('Entry is not approved yet', 'error'); return; }
    const win = window.open('', '_blank', 'width=500,height=700');
    win.document.write('<html><head><title>Gate Pass - ' + e.itemName + '</title>' +
        '<style>body{font-family:Arial;margin:0;padding:20px;text-align:center;}' +
        '.pass{border:2px dashed #333;border-radius:12px;padding:20px;max-width:380px;margin:0 auto;}' +
        '.header{font-size:11px;color:#666;margin-bottom:4px;}' +
        '.title{font-size:20px;font-weight:700;margin-bottom:12px;}' +
        '.info{border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;}' +
        '.info div{margin-bottom:3px;}' +
        '.stamp{color:green;font-size:28px;font-weight:700;border:3px solid green;border-radius:8px;padding:8px 16px;display:inline-block;margin:8px 0;transform:rotate(-5deg);}' +
        '@media print{body{padding:10px;}.pass{border-color:#999;}}' +
        '<\/style></head><body>' +
        '<div class="pass">' +
        '<div class="header">HOSPITAL MANAGEMENT SYSTEM</div>' +
        '<div class="title">GATE PASS</div>' +
        '<div class="stamp">APPROVED</div>' +
        '<div style="font-size:14px;font-weight:700;margin:8px 0;">' + e.itemName + '</div>' +
        '<div class="info">' +
        '<div><strong>Direction:</strong> ' + e.direction.toUpperCase() + '</div>' +
        '<div><strong>Department:</strong> ' + (e.department || '-') + '</div>' +
        '<div><strong>Vehicle:</strong> ' + (e.vehicleNo || '-') + '</div>' +
        '<div><strong>Driver:</strong> ' + (e.driverName || '-') + ' ' + (e.driverPhone || '') + '</div>' +
        '<div><strong>Quantity:</strong> ' + (e.quantity || '-') + '</div>' +
        '<div><strong>Vendor:</strong> ' + (e.vendor || '-') + '</div>' +
        '<div><strong>Gate Pass No:</strong> ' + (e.gatePassNo || '-') + '</div>' +
        '<div><strong>Purpose:</strong> ' + (e.purpose || '-') + '</div>' +
        '<div><strong>Approved By:</strong> ' + (e.approvedBy || '-') + '</div>' +
        '<div style="font-size:11px;color:#666;margin-top:4px;">Date: ' + APP.formatDateTime(e.createdAt) + '</div>' +
        '</div></div>' +
        '<script>setTimeout(function(){window.print();window.close();},200);<\/script></body></html>');
    win.document.close();
}

function viewGateEntry(id) {
    const e = DB.getById('gatesecurity', id);
    if (!e) return;
    showModal(`
        <div class="modal-header"><h3>${T('gsmod_gate_details')}</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div class="grid-2">
            <div><strong>${T('gsmod_f_item')}</strong> ${e.itemName}</div>
            <div><strong>${T('gsmod_f_direction')}</strong> <span class="badge ${e.direction === 'in' ? 'badge-success' : 'badge-danger'}">${e.direction.toUpperCase()}</span></div>
            <div><strong>${T('gsmod_f_department')}</strong> ${e.department || '-'}</div>
            <div><strong>${T('gsmod_f_vehicle')}</strong> ${e.vehicleNo || '-'}</div>
            <div><strong>${T('gsmod_f_driver')}</strong> ${e.driverName || '-'} ${e.driverPhone ? '('+e.driverPhone+')' : ''}</div>
            <div><strong>${T('gsmod_f_quantity')}</strong> ${e.quantity || '-'}</div>
            <div><strong>${T('gsmod_f_vendor')}</strong> ${e.vendor || '-'}</div>
            <div><strong>${T('gsmod_f_gatepass')}</strong> ${e.gatePassNo || '-'}</div>
            <div><strong>${T('gsmod_f_submitted')}</strong> ${e.submittedBy || '-'}</div>
            <div><strong>${T('gsmod_f_status')}</strong> <span class="badge ${e.status === 'rejected' ? 'badge-danger' : APP.getStatusBadge(e.status)}">${e.status.toUpperCase()}</span></div>
            <div><strong>${T('gsmod_f_approved')}</strong> ${e.approvedBy || (e.status === 'rejected' ? '<span style="color:red;">' + T('gsmod_rejected_by') + ' ' + (e.rejectedBy || 'N/A') + '</span>' : T('gsmod_pending_word'))}</div>
            <div><strong>${T('gsmod_f_date')}</strong> ${APP.formatDateTime(e.createdAt)}</div>
        </div>
        <div class="mt-4"><strong>${T('gsmod_f_purpose')}</strong><br>${e.purpose || '-'}</div>
        <div class="mt-2"><strong>${T('gsmod_f_remarks')}</strong><br>${e.remarks || '-'}</div>
        ${e.rejectionReason ? '<div class="mt-2" style="background:rgba(220,53,69,0.1);padding:8px 12px;border-radius:6px;border-left:3px solid var(--danger);"><strong style="color:var(--danger);">' + T('gsmod_f_rejection_reason') + '</strong><br>' + e.rejectionReason + '</div>' : ''}
    `);
}

/* ==================== PATIENT VISITS ==================== */

function generatePatientCode() {
    return 'PT-' + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function renderPatientsSection() {
    const el = document.getElementById('gateContent');
    if (!el) return;
    el.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="ptSearch" placeholder="${T('gsmod_search_patient')}" oninput="renderPatientList()">
            </div>
            <div style="display:flex;gap:6px;">
                <button class="btn btn-primary" onclick="showPatientForm()">+ ${T('gsmod_new_patient_visit')}</button>
                <button class="btn btn-info" onclick="showScanModal()">📷 ${T('gsmod_scan_code')}</button>
            </div>
        </div>
        <div class="tabs" style="margin-bottom:8px;">
            <button class="tab-btn active" onclick="switchPatientTab('all',this)">${T('gsmod_f_all')}</button>
            <button class="tab-btn" onclick="switchPatientTab('active',this)">${T('gsmod_f_inside')}</button>
            <button class="tab-btn" onclick="switchPatientTab('completed',this)">${T('gsmod_f_checkedout')}</button>
        </div>
        <div class="card"><div class="table-responsive"><table>
            <thead><tr><th>${T('gsmod_th_code')}</th><th>${T('gsmod_th_patient_name')}</th><th>${T('gsmod_th_phone')}</th><th>${T('gsmod_th_purpose')}</th><th>${T('gsmod_th_entry')}</th><th>${T('gsmod_th_exit')}</th><th>${T('gsmod_th_status')}</th><th>${T('gsmod_th_actions')}</th></tr></thead>
            <tbody id="ptTableBody"></tbody>
        </table></div></div>
    `;
    renderPatientList();
}

let ptFilter = 'all';

function switchPatientTab(filter, btn) {
    ptFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPatientList();
}

function renderPatientList() {
    const visits = DB.get('patientVisits');
    const search = (document.getElementById('ptSearch')?.value || '').toLowerCase();
    let filtered = visits.filter(v =>
        v.patientName.toLowerCase().includes(search) ||
        v.uniqueCode.toLowerCase().includes(search) ||
        v.phone.includes(search)
    );
    if (ptFilter === 'active') filtered = filtered.filter(v => v.status === 'active');
    else if (ptFilter === 'completed') filtered = filtered.filter(v => v.status === 'completed');
    const tbody = document.getElementById('ptTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(v => `
        <tr>
            <td><strong style="font-family:monospace;font-size:13px;">${v.uniqueCode}</strong></td>
            <td>${v.patientName} ${v.age ? '('+v.age+')' : ''}</td>
            <td>${v.phone}</td>
            <td>${v.purpose || '-'}</td>
            <td>${APP.formatDateTime(v.entryTime)}</td>
            <td>${v.exitTime ? APP.formatDateTime(v.exitTime) : '<span style="color:var(--gray);">-</span>'}</td>
            <td><span class="badge ${v.status === 'active' ? 'badge-success' : 'badge-secondary'}">${v.status === 'active' ? T('gsmod_in') : T('gsmod_out')}</span></td>
            <td style="white-space:nowrap;">
                <button class="btn btn-sm btn-primary" onclick="viewPatientPass('${v.id}')">${T('gsmod_pass')}</button>
                ${v.status === 'active' ? `<button class="btn btn-sm btn-warning" onclick="checkOutPatient('${v.id}')">${T('gsmod_checkout')}</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deletePass('visitor','${v.id}','${(v.patientName||'').replace(/'/g,"\\'")}','${v.uniqueCode}')">🗑</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">' + T('gsmod_no_patient_visits') + '</td></tr>';
}

function capturePhotoHtml(inputName, previewId) {
    return `<div style="margin-bottom:12px;">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">📷 ${T('gsmod_visitor_photo')}</label>
        <div style="display:flex;gap:12px;align-items:center;">
            <div style="width:100px;height:100px;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);flex-shrink:0;" id="${previewId}">
                <span style="font-size:11px;color:var(--gray);text-align:center;">${T('gsmod_no_photo')}</span>
            </div>
            <div>
                <button type="button" class="btn btn-sm btn-primary" onclick="openPhotoCamera('${previewId}')">📸 ${T('gsmod_capture_photo')}</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="openPhotoUpload('${previewId}')">📁 ${T('gsmod_upload')}</button>
                <div style="font-size:11px;color:var(--gray);margin-top:4px;" id="${previewId}_status">${T('gsmod_camera_or_upload')}</div>
            </div>
        </div>
        <input type="hidden" name="${inputName}_data" id="${previewId}_data" value="">
    </div>`;
}

function openPhotoCamera(previewId) {
    const status = document.getElementById(previewId + '_status');
    if (!status) return;
    // Use getUserMedia for live camera capture
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.innerHTML = '<span style="color:red;">' + T('gsmod_camera_not_supported') + '</span>';
        return;
    }
    const modal = showModal(`
        <div class="modal-header">
            <h3>📸 ${T('gsmod_capture_photo')}</h3>
            <button class="modal-close" onclick="stopPhotoStream();this.closest('.modal').remove()">&times;</button>
        </div>
        <div style="text-align:center;padding:12px;">
            <div style="position:relative;width:100%;max-width:400px;margin:0 auto;background:#000;border-radius:8px;overflow:hidden;">
                <video id="photoVideo" autoplay playsinline style="width:100%;height:auto;display:block;"></video>
                <canvas id="photoCanvas" style="display:none;"></canvas>
                <div id="photoCaptureOverlay" style="display:none;">
                    <img id="photoCapturedImg" style="width:100%;display:block;">
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
                <button id="btnCapture" class="btn btn-primary btn-lg" onclick="capturePhoto('${previewId}')">📸 ${T('gsmod_btn_capture')}</button>
                <button id="btnRetake" class="btn btn-warning" style="display:none;" onclick="retakePhoto()">🔄 ${T('gsmod_btn_retake')}</button>
                <button id="btnUsePhoto" class="btn btn-success" style="display:none;" onclick="usePhoto('${previewId}')">✅ ${T('gsmod_btn_use_photo')}</button>
                <button class="btn btn-danger" onclick="stopPhotoStream();this.closest('.modal').remove()">${T('gsmod_cancel')}</button>
            </div>
        </div>
    `);

    setTimeout(() => {
        const video = document.getElementById('photoVideo');
        if (video) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } })
                .then(stream => {
                    window._photoStream = stream;
                    video.srcObject = stream;
                })
                .catch(() => {
                    status.innerHTML = '<span style="color:red;">' + T('gsmod_camera_denied') + '</span>';
                });
        }
    }, 300);
}

function capturePhoto(previewId) {
    const video = document.getElementById('photoVideo');
    const canvas = document.getElementById('photoCanvas');
    if (!video || !canvas) return;
    const w = video.videoWidth || video.clientWidth || 640;
    const h = video.videoHeight || video.clientHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Store on canvas so usePhoto can read it without a global variable
    canvas.dataset.photoData = dataUrl;

    const overlay = document.getElementById('photoCaptureOverlay');
    const capturedImg = document.getElementById('photoCapturedImg');
    if (overlay) overlay.style.display = 'block';
    if (capturedImg) capturedImg.src = dataUrl;
    video.style.display = 'none';
    const btnCapture = document.getElementById('btnCapture');
    const btnRetake = document.getElementById('btnRetake');
    const btnUse = document.getElementById('btnUsePhoto');
    if (btnCapture) btnCapture.style.display = 'none';
    if (btnRetake) btnRetake.style.display = 'inline-block';
    if (btnUse) btnUse.style.display = 'inline-block';
    stopPhotoStream();
}

function retakePhoto() {
    const canvas = document.getElementById('photoCanvas');
    if (canvas) canvas.dataset.photoData = '';
    const overlay = document.getElementById('photoCaptureOverlay');
    const video = document.getElementById('photoVideo');
    if (overlay) overlay.style.display = 'none';
    if (video) video.style.display = 'block';
    const btnCapture = document.getElementById('btnCapture');
    const btnRetake = document.getElementById('btnRetake');
    const btnUse = document.getElementById('btnUsePhoto');
    if (btnCapture) btnCapture.style.display = 'inline-block';
    if (btnRetake) btnRetake.style.display = 'none';
    if (btnUse) btnUse.style.display = 'none';

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } })
        .then(stream => {
            window._photoStream = stream;
            if (video) video.srcObject = stream;
        })
        .catch(() => {});
}

function stopPhotoStream() {
    if (window._photoStream) {
        window._photoStream.getTracks().forEach(t => t.stop());
        window._photoStream = null;
    }
}

function usePhoto(previewId) {
    const canvas = document.getElementById('photoCanvas');
    const photoData = canvas && canvas.dataset.photoData;
    if (!photoData) {
        APP.notify(T('gsmod_no_photo_captured'), 'error');
        return;
    }
    const preview = document.getElementById(previewId);
    const hidden  = document.getElementById(previewId + '_data');
    const status  = document.getElementById(previewId + '_status');
    if (preview) preview.innerHTML = '<img src="' + photoData + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">';
    if (hidden)  hidden.value = photoData;
    if (status)  status.innerHTML = '<span style="color:var(--secondary);">✅ ' + T('gsmod_photo_added') + '</span>';
    stopPhotoStream();
    // Close only the camera modal — not the patient/doctor form behind it
    const videoEl = document.getElementById('photoVideo');
    if (videoEl) videoEl.closest('.modal').remove();
}

function openPhotoUpload(previewId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function() {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            const preview = document.getElementById(previewId);
            const hidden = document.getElementById(previewId + '_data');
            const status = document.getElementById(previewId + '_status');
            if (preview) {
                preview.innerHTML = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">';
            }
            if (hidden) hidden.value = dataUrl;
            if (status) status.innerHTML = '<span style="color:green;">✅ ' + T('gsmod_photo_uploaded') + '</span>';
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function showPatientForm() {
    const form = `
        <form id="ptForm">
            ${capturePhotoHtml('visitorPhoto', 'ptPhotoPreview')}
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('gsmod_lbl_patient_name')}</label>
                    <input type="text" name="patientName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_age')}</label>
                    <input type="number" name="age" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_gender')}</label>
                    <select name="gender" class="form-control" required>
                        <option value="">${T('gsmod_opt_select')}</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_phone_req')}</label>
                    <input type="text" name="phone" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_address')}</label>
                    <textarea name="address" class="form-control" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_purpose_reason')}</label>
                    <select name="purpose" class="form-control" required>
                        <option value="">${T('gsmod_opt_select')}</option>
                        <option value="Visit">Visit</option>
                        <option value="Appointment">Appointment</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Delivery">Delivery</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_department')}</label>
                    ${deptDropdown('department')}
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_doctor_name')}</label>
                    <input type="text" name="doctorName" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_attendant_name')}</label>
                    <input type="text" name="attendantName" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_attendant_phone')}</label>
                    <input type="text" name="attendantPhone" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label>${T('gsmod_lbl_notes')}</label>
                <textarea name="notes" class="form-control" rows="2"></textarea>
            </div>
        </form>
    `;
    openFormModal(T('gsmod_new_patient_visit'), form, 'savePatientVisit()', true);
}

function savePatientVisit() {
    const data = getFormData('ptForm');
    if (!data.patientName || !data.age || !data.gender || !data.phone || !data.purpose) {
        APP.notify(T('gsmod_fill_all_required'), 'error'); return;
    }
    const photoData = document.getElementById('ptPhotoPreview_data')?.value || '';
    const code = generatePatientCode();
    data.uniqueCode = code;
    data.photo = photoData;
    data.entryTime = new Date().toISOString();
    data.exitTime = '';
    data.status = 'active';
    const visit = DB.add('patientVisits', data);
    renderPatientList();
    if (document.getElementById('genPassBody')) renderGenPassList();
    showModal(`
        <div class="modal-header">
            <h3>✅ ${T('gsmod_visitor_pass_generated')}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div style="text-align:center;padding:16px;">
            <div style="background:#f0f6ff;border:2px dashed var(--primary);border-radius:12px;padding:20px;display:inline-block;max-width:350px;">
                <div style="font-size:12px;color:var(--gray);margin-bottom:4px;">HOSPITAL MANAGEMENT SYSTEM</div>
                <div style="font-size:18px;font-weight:700;margin-bottom:12px;">VISITOR PASS</div>
                <div id="qrPassContainer" style="display:flex;justify-content:center;margin-bottom:8px;"></div>
                <div style="font-family:monospace;font-size:22px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">${code}</div>
                ${photoData ? '<div style="margin:8px auto;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #ddd;"><img src="' + photoData + '" style="width:100%;height:100%;object-fit:cover;"></div>' : ''}
                <div style="border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;">
                    <div><strong>Patient:</strong> ${data.patientName} (${data.age}y, ${data.gender})</div>
                    <div><strong>Phone:</strong> ${data.phone}</div>
                    <div><strong>Purpose:</strong> ${data.purpose}</div>
                    ${data.department ? '<div><strong>Dept:</strong> ' + data.department + '</div>' : ''}
                    ${data.doctorName ? '<div><strong>Doctor:</strong> ' + data.doctorName + '</div>' : ''}
                    ${data.attendantName ? '<div><strong>Attendant:</strong> ' + data.attendantName + ' ' + (data.attendantPhone||'') + '</div>' : ''}
                    <div style="font-size:11px;color:var(--gray);margin-top:4px;">Entry: ${APP.formatDateTime(data.entryTime)}</div>
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
                <button class="btn btn-primary" onclick="printPatientPass('${visit.id}')">🖨️ ${T('gsmod_print_pass')}</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${T('gsmod_close')}</button>
            </div>
        </div>
    `);
    setTimeout(() => {
        const c = document.getElementById('qrPassContainer');
        if (c && typeof QRCode !== 'undefined') {
            c.innerHTML = '';
            new QRCode(c, { text: code, width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
        }
    }, 200);
}

function viewPatientPass(id) {
    const v = DB.getById('patientVisits', id);
    if (!v) return;
    showModal(`
        <div class="modal-header">
            <h3>${T('gsmod_visitor_pass')}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div style="text-align:center;padding:16px;">
            <div style="background:#f0f6ff;border:2px dashed var(--primary);border-radius:12px;padding:20px;display:inline-block;max-width:350px;">
                <div style="font-size:12px;color:var(--gray);margin-bottom:4px;">HOSPITAL MANAGEMENT SYSTEM</div>
                <div style="font-size:18px;font-weight:700;margin-bottom:12px;">VISITOR PASS</div>
                <div id="qrPassView" style="display:flex;justify-content:center;margin-bottom:8px;"></div>
                <div style="font-family:monospace;font-size:22px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">${v.uniqueCode}</div>
                ${v.photo ? '<div style="margin:8px auto;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #ddd;"><img src="'+v.photo+'" style="width:100%;height:100%;object-fit:cover;"></div>' : ''}
                <div style="border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;">
                    <div><strong>Patient:</strong> ${v.patientName} (${v.age}y, ${v.gender})</div>
                    <div><strong>Phone:</strong> ${v.phone}</div>
                    <div><strong>Purpose:</strong> ${v.purpose || '-'}</div>
                    ${v.department ? '<div><strong>Dept:</strong> '+v.department+'</div>' : ''}
                    ${v.doctorName ? '<div><strong>Doctor:</strong> '+v.doctorName+'</div>' : ''}
                    ${v.attendantName ? '<div><strong>Attendant:</strong> '+v.attendantName+' '+(v.attendantPhone||'')+'</div>' : ''}
                    <div style="font-size:11px;color:var(--gray);margin-top:4px;">Entry: ${APP.formatDateTime(v.entryTime)}</div>
                    ${v.exitTime ? '<div style="font-size:11px;color:var(--gray);">Exit: '+APP.formatDateTime(v.exitTime)+'</div>' : ''}
                    <div style="margin-top:6px;"><span class="badge ${v.status === 'active' ? 'badge-success' : 'badge-secondary'}">${v.status === 'active' ? 'ACTIVE - Inside' : 'CHECKED OUT'}</span></div>
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
                <button class="btn btn-primary" onclick="printPatientPass('${v.id}')">🖨️ ${T('gsmod_print_pass')}</button>
                ${v.status === 'active' ? '<button class="btn btn-danger" onclick="checkOutPatient(\''+v.id+'\');this.closest(\'.modal\').remove()">' + T('gsmod_checkout') + '</button>' : ''}
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${T('gsmod_close')}</button>
            </div>
        </div>
    `);
    setTimeout(() => {
        const c = document.getElementById('qrPassView');
        if (c && typeof QRCode !== 'undefined') {
            c.innerHTML = '';
            new QRCode(c, { text: v.uniqueCode, width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
        }
    }, 200);
}

function printPatientPass(id) {
    const v = DB.getById('patientVisits', id);
    if (!v) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write('<html><head><title>Visitor Pass</title>' +
        '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>' +
        '<style>body{font-family:Arial;margin:0;padding:20px;text-align:center;} ' +
        '.pass{border:2px dashed #333;border-radius:12px;padding:20px;max-width:320px;margin:0 auto;} ' +
        '.header{font-size:11px;color:#666;margin-bottom:4px;} ' +
        '.title{font-size:20px;font-weight:700;margin-bottom:12px;} ' +
        '.code{font-family:monospace;font-size:24px;font-weight:700;letter-spacing:3px;margin:8px 0;} ' +
        '.info{border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;} ' +
        '.info div{margin-bottom:3px;} ' +
        '@media print{body{padding:10px;}.pass{border-color:#999;}}' +
        '<\/style></head><body>' +
        '<div class="pass">' +
        '<div class="header">HOSPITAL MANAGEMENT SYSTEM</div>' +
        '<div class="title">VISITOR PASS</div>' +
        '<div id="qrPrint" style="display:flex;justify-content:center;margin-bottom:8px;"></div>' +
        '<div class="code">' + v.uniqueCode + '</div>' +
        (v.photo ? '<div style="margin:8px auto;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #ddd;"><img src="' + v.photo + '" style="width:100%;height:100%;object-fit:cover;"></div>' : '') +
        '<div class="info">' +
        '<div><strong>Patient:</strong> ' + v.patientName + ' (' + v.age + 'y, ' + v.gender + ')</div>' +
        '<div><strong>Phone:</strong> ' + v.phone + '</div>' +
        '<div><strong>Purpose:</strong> ' + (v.purpose || '-') + '</div>' +
        (v.department ? '<div><strong>Dept:</strong> ' + v.department + '</div>' : '') +
        (v.doctorName ? '<div><strong>Doctor:</strong> ' + v.doctorName + '</div>' : '') +
        (v.attendantName ? '<div><strong>Attendant:</strong> ' + v.attendantName + ' ' + (v.attendantPhone || '') + '</div>' : '') +
        '<div style="font-size:11px;color:#666;margin-top:4px;">Entry: ' + APP.formatDateTime(v.entryTime) + '</div>' +
        (v.exitTime ? '<div style="font-size:11px;color:#666;">Exit: ' + APP.formatDateTime(v.exitTime) + '</div>' : '') +
        '</div></div>' +
        '<script>' +
        'setTimeout(function(){' +
        'var c=document.getElementById("qrPrint");' +
        'if(c && typeof QRCode!=="undefined"){' +
        'new QRCode(c,{text:"' + v.uniqueCode + '",width:130,height:130,colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.H});' +
        'setTimeout(function(){window.print();window.close();},500);' +
        '}' +
        '},200);' +
        '<\/script></body></html>');
    win.document.close();
}

function checkOutPatient(id) {
    const v = DB.getById('patientVisits', id);
    if (!v) return;
    if (v.status === 'completed') { APP.notify(T('gsmod_already_checkedout'), 'info'); return; }
    if (v.status !== 'active') { APP.notify(T('gsmod_only_active_checkout'), 'error'); return; }
    confirmAction(T('gsmod_confirm_checkout_pt_pre') + ' "' + v.patientName + '" (' + T('gsmod_code_label') + ' ' + v.uniqueCode + ')' + T('gsmod_confirm_checkout_post'), () => {
        DB.update('patientVisits', id, { status: 'completed', exitTime: new Date().toISOString() });
        APP.notify(T('gsmod_patient_word') + ' "' + v.patientName + '" ' + T('gsmod_checked_out_deactivated'), 'success');
        renderPatientList();
        if (document.getElementById('genPassBody')) renderGenPassList();
    });
}

function showScanModal() {
    showModal(`
        <div class="modal-header">
            <h3>📷 ${T('gsmod_scan_qr_title')}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div style="padding:16px;text-align:center;">
            <p style="font-size:13px;color:var(--gray);margin-bottom:12px;">${T('gsmod_scan_instr_patient')}</p>
            <input type="text" id="scanCodeInput" class="form-control" style="max-width:300px;margin:0 auto 12px;text-align:center;font-family:monospace;font-size:18px;letter-spacing:2px;" placeholder="${T('gsmod_ph_enter_code_pt')}" autofocus>
            <div><button class="btn btn-primary" onclick="processScanCode()">${T('gsmod_verify_checkout')}</button></div>
            <div id="scanResult" style="margin-top:12px;font-size:14px;"></div>
        </div>
    `);
    setTimeout(() => {
        const inp = document.getElementById('scanCodeInput');
        if (inp) {
            inp.focus();
            inp.onkeydown = (e) => { if (e.key === 'Enter') processScanCode(); };
        }
    }, 200);
}

function processScanCode() {
    const code = (document.getElementById('scanCodeInput')?.value || '').trim().toUpperCase();
    const result = document.getElementById('scanResult');
    if (!code) { result.innerHTML = '<span style="color:red;">' + T('gsmod_enter_code') + '</span>'; return; }
    const visits = DB.get('patientVisits');
    const visit = visits.find(v => v.uniqueCode.toUpperCase() === code);
    if (!visit) { result.innerHTML = '<span style="color:red;">❌ ' + T('gsmod_no_visit_found') + ' "' + code + '"</span>'; return; }
    if (visit.status === 'completed') { result.innerHTML = '<span style="color:orange;">⚠️ ' + T('gsmod_pass_already_used') + ' ' + APP.formatDateTime(visit.exitTime) + '.</span>'; return; }
    result.innerHTML = '<span style="color:green;">✅ ' + T('gsmod_found') + ': ' + visit.patientName + ' (' + T('gsmod_entered') + ' ' + APP.formatDateTime(visit.entryTime) + ')</span>' +
        '<div style="margin-top:8px;"><button class="btn btn-danger" onclick="checkOutPatient(\'' + visit.id + '\');document.getElementById(\'scanCodeInput\').value=\'\';document.getElementById(\'scanResult\').innerHTML=\'<span style=color:green;>✓ Checked out</span>\';">' + T('gsmod_confirm_checkout') + '</button></div>';
}

/* ==================== DOCTOR VISITS ==================== */

function generateDoctorCode() {
    return 'DR-' + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function renderDoctorsSection() {
    const el = document.getElementById('gateContent');
    if (!el) return;
    el.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="drSearch" placeholder="${T('gsmod_search_doctor')}" oninput="renderDoctorList()">
            </div>
            <div style="display:flex;gap:6px;">
                <button class="btn btn-primary" onclick="showDoctorForm()">+ ${T('gsmod_new_doctor_visit')}</button>
                <button class="btn btn-info" onclick="showDoctorScanModal()">📷 ${T('gsmod_scan_code')}</button>
            </div>
        </div>
        <div class="tabs" style="margin-bottom:8px;">
            <button class="tab-btn active" onclick="switchDoctorTab('all',this)">${T('gsmod_f_all')}</button>
            <button class="tab-btn" onclick="switchDoctorTab('pending',this)">${T('gsmod_f_pending')}</button>
            <button class="tab-btn" onclick="switchDoctorTab('active',this)">${T('gsmod_f_inside')}</button>
            <button class="tab-btn" onclick="switchDoctorTab('completed',this)">${T('gsmod_f_checkedout')}</button>
        </div>
        <div class="card"><div class="table-responsive"><table>
            <thead><tr><th>${T('gsmod_th_code')}</th><th>${T('gsmod_th_doctor_name')}</th><th>${T('gsmod_th_specialization')}</th><th>${T('gsmod_th_phone')}</th><th>${T('gsmod_th_purpose')}</th><th>${T('gsmod_th_entry')}</th><th>${T('gsmod_th_approved')}</th><th>${T('gsmod_th_status')}</th><th>${T('gsmod_th_actions')}</th></tr></thead>
            <tbody id="drTableBody"></tbody>
        </table></div></div>
    `;
    renderDoctorList();
}

let drFilter = 'all';

function switchDoctorTab(filter, btn) {
    drFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDoctorList();
    renderApprovalsList();
}

function renderDoctorList() {
    const visits = DB.get('doctorVisits');
    const search = (document.getElementById('drSearch')?.value || '').toLowerCase();
    let filtered = visits.filter(v =>
        v.doctorName.toLowerCase().includes(search) ||
        v.uniqueCode.toLowerCase().includes(search) ||
        v.phone.includes(search)
    );
    if (drFilter === 'all') filtered = filtered;
    else if (drFilter === 'active') filtered = filtered.filter(v => v.status === 'active');
    else if (drFilter === 'pending') filtered = filtered.filter(v => v.status === 'pending');
    else if (drFilter === 'completed') filtered = filtered.filter(v => v.status === 'completed');
    const tbody = document.getElementById('drTableBody');
    if (!tbody) return;

    const statusBadge = (s) => {
        if (s === 'active') return 'badge-success';
        if (s === 'pending') return 'badge-warning';
        if (s === 'rejected') return 'badge-danger';
        return 'badge-secondary';
    };
    const statusLabel = (s) => {
        if (s === 'active') return T('gsmod_st_approved');
        if (s === 'pending') return T('gsmod_st_pending');
        if (s === 'rejected') return T('gsmod_st_rejected');
        if (s === 'completed') return T('gsmod_st_checkedout');
        return s.toUpperCase();
    };

    tbody.innerHTML = filtered.slice().reverse().map(v => `
        <tr ${v.status === 'rejected' ? 'style="background:rgba(220,53,69,0.08);"' : ''}>
            <td><strong style="font-family:monospace;font-size:13px;">${v.uniqueCode}</strong></td>
            <td>${v.doctorName}</td>
            <td>${v.specialization || '-'}</td>
            <td>${v.phone}</td>
            <td>${v.purpose || '-'}</td>
            <td>${APP.formatDateTime(v.entryTime)}</td>
            <td>${v.approvedBy || (v.status === 'rejected' ? '<span style="color:red;">' + T('gsmod_rejected_by') + ' '+(v.rejectedBy||'N/A')+'</span>' : v.status === 'pending' ? '<span style="color:var(--warning);">⏳ ' + T('gsmod_pending_word') + '</span>' : '-')}</td>
            <td><span class="badge ${statusBadge(v.status)}">${statusLabel(v.status)}</span></td>
            <td style="white-space:nowrap;">
                ${v.status === 'pending' && isUserHodOfDept(v.department) ? `
                    <button class="btn btn-sm btn-success" onclick="approveDoctorEntry('${v.id}')">${T('gsmod_approve')}</button>
                    <button class="btn btn-sm btn-danger" onclick="showRejectReason('doctorVisits','${v.id}')">${T('gsmod_reject')}</button>
                ` : ''}
                ${v.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="viewDoctorPass('${v.id}')">${T('gsmod_pass')}</button>` : ''}
                ${v.status === 'pending' ? `<button class="btn btn-sm btn-info" onclick="viewDoctorPass('${v.id}')">${T('gsmod_view')}</button>` : ''}
                ${v.status === 'active' ? `<button class="btn btn-sm btn-warning" onclick="checkOutDoctor('${v.id}')">${T('gsmod_checkout')}</button>` : ''}
                ${v.status === 'rejected' ? '<span style="color:var(--danger);font-size:11px;font-weight:600;">⛔ ' + T('gsmod_rejected_cap') + '</span>' : ''}
                <button class="btn btn-sm btn-danger" onclick="deletePass('doctor','${v.id}','${(v.doctorName||'').replace(/'/g,"\\'")}','${v.uniqueCode}')">🗑</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="9" class="empty-state">' + T('gsmod_no_doctor_visits') + '</td></tr>';
}

function showDoctorForm() {
    const form = `
        <form id="drForm">
            ${capturePhotoHtml('doctorPhoto', 'drPhotoPreview')}
            <div class="grid-2">
                <div class="form-group">
                    <label>${T('gsmod_lbl_doctor_name_req')}</label>
                    <input type="text" name="doctorName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_specialization')}</label>
                    <input type="text" name="specialization" class="form-control" placeholder="${T('gsmod_ph_specialization')}" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_phone_req')}</label>
                    <input type="text" name="phone" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_email')}</label>
                    <input type="email" name="email" class="form-control">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_hospital')}</label>
                    <input type="text" name="hospital" class="form-control" placeholder="${T('gsmod_ph_hospital')}">
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_dept_visiting')}</label>
                    ${deptDropdown('department')}
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_purpose_req')}</label>
                    <select name="purpose" class="form-control" required>
                        <option value="">${T('gsmod_opt_select')}</option>
                        <option value="Consultation">Consultation</option>
                        <option value="Surgery">Surgery</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Round">Round</option>
                        <option value="Lecture">Lecture</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${T('gsmod_lbl_vehicle_no')}</label>
                    <input type="text" name="vehicleNo" class="form-control" placeholder="${T('gsmod_ph_vehicle')}">
                </div>
            </div>
            <div class="form-group">
                <label>${T('gsmod_lbl_notes')}</label>
                <textarea name="notes" class="form-control" rows="2"></textarea>
            </div>
        </form>
    `;
    openFormModal(T('gsmod_new_doctor_visit'), form, 'saveDoctorVisit()', true);
}

function saveDoctorVisit() {
    const data = getFormData('drForm');
    if (!data.doctorName || !data.specialization || !data.phone || !data.purpose) {
        APP.notify(T('gsmod_fill_all_required'), 'error'); return;
    }
    const user = AUTH.currentUser();
    const photoData = document.getElementById('drPhotoPreview_data')?.value || '';
    const code = generateDoctorCode();
    data.uniqueCode = code;
    data.photo = photoData;
    data.entryTime = new Date().toISOString();
    data.exitTime = '';
    data.status = 'pending';
    data.approvedBy = '';
    data.approvedAt = '';
    data.rejectionReason = '';
    data.submittedBy = user ? user.fullName : 'Unknown';
    const visit = DB.add('doctorVisits', data);
    renderDoctorList();
    if (document.getElementById('genPassBody')) renderGenPassList();
    APP.notify(T('gsmod_msg_doctor_submitted'), 'success');
    showModal(`
        <div class="modal-header"><h3>✅ ${T('gsmod_request_submitted')}</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div style="text-align:center;padding:16px;">
            <div style="font-size:48px;margin-bottom:8px;">⏳</div>
            <p style="font-size:15px;">${T('gsmod_doctor_entry_for')} <strong>${data.doctorName}</strong> ${T('gsmod_has_been_submitted')}</p>
            <p style="font-size:13px;color:var(--gray);">${T('gsmod_waiting_hod_of')} ${data.department || T('gsmod_the_department')}.</p>
            <p style="font-family:monospace;font-size:18px;font-weight:700;">${code}</p>
            <p style="font-size:12px;color:var(--gray);">${T('gsmod_receive_pass')}</p>
            <div style="margin-top:12px;"><button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${T('gsmod_ok')}</button></div>
        </div>
    `);
}

function showDoctorPassModal(id) {
    const v = DB.getById('doctorVisits', id);
    if (!v) return;
    if (v.status !== 'active') {
        viewDoctorPass(id);
        return;
    }
    showModal(`
        <div class="modal-header"><h3>✅ ${T('gsmod_doctor_pass_generated')}</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div style="text-align:center;padding:16px;">
            <div style="background:#f0f6ff;border:2px dashed var(--primary);border-radius:12px;padding:20px;display:inline-block;max-width:350px;">
                <div style="font-size:12px;color:var(--gray);margin-bottom:4px;">HOSPITAL MANAGEMENT SYSTEM</div>
                <div style="font-size:18px;font-weight:700;margin-bottom:12px;">DOCTOR PASS</div>
                <div id="drQr${v.id}" style="display:flex;justify-content:center;margin-bottom:8px;"></div>
                <div style="font-family:monospace;font-size:22px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">${v.uniqueCode}</div>
                ${v.photo ? '<div style="margin:8px auto;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #ddd;"><img src="'+v.photo+'" style="width:100%;height:100%;object-fit:cover;"></div>' : ''}
                <div style="border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;">
                    <div><strong>Doctor:</strong> ${v.doctorName} (${v.specialization})</div>
                    <div><strong>Phone:</strong> ${v.phone}</div>
                    <div><strong>Hospital:</strong> ${v.hospital || '-'}</div>
                    <div><strong>Purpose:</strong> ${v.purpose}</div>
                    ${v.department ? '<div><strong>Dept:</strong> '+v.department+'</div>' : ''}
                    <div style="font-size:11px;color:var(--gray);margin-top:4px;">Entry: ${APP.formatDateTime(v.entryTime)}</div>
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
                <button class="btn btn-primary" onclick="printDoctorPass('${v.id}')">🖨️ ${T('gsmod_print_pass')}</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${T('gsmod_close')}</button>
            </div>
        </div>
    `);
    setTimeout(() => {
        const c = document.getElementById('drQr' + v.id);
        if (c && typeof QRCode !== 'undefined') {
            new QRCode(c, { text: v.uniqueCode, width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
        }
    }, 200);
}

function viewDoctorPass(id) {
    const v = DB.getById('doctorVisits', id);
    if (!v) return;

    const statusBadge = (s) => {
        if (s === 'active') return 'badge-success';
        if (s === 'pending') return 'badge-warning';
        if (s === 'rejected') return 'badge-danger';
        return 'badge-secondary';
    };
    const statusLabel = (s) => {
        if (s === 'active') return '✅ APPROVED';
        if (s === 'pending') return '⏳ PENDING APPROVAL';
        if (s === 'rejected') return '⛔ REJECTED';
        if (s === 'completed') return 'CHECKED OUT';
        return s.toUpperCase();
    };

    const showPassContent = v.status === 'active';
    showModal(`
        <div class="modal-header"><h3>${T('gsmod_doctor_word')} ${showPassContent ? T('gsmod_pass_word') : T('gsmod_entry_details')}</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div style="text-align:center;padding:16px;">
            <div style="background:${v.status === 'rejected' ? '#fff0f0' : v.status === 'pending' ? '#fffbe6' : '#f0f6ff'};border:2px dashed ${v.status === 'rejected' ? 'var(--danger)' : v.status === 'pending' ? 'var(--warning)' : 'var(--primary)'};border-radius:12px;padding:20px;display:inline-block;max-width:350px;">
                <div style="font-size:12px;color:var(--gray);margin-bottom:4px;">HOSPITAL MANAGEMENT SYSTEM</div>
                <div style="font-size:18px;font-weight:700;margin-bottom:12px;">${showPassContent ? 'DOCTOR PASS' : 'DOCTOR ENTRY'}</div>
                ${showPassContent ? '<div id="drQrView'+v.id+'" style="display:flex;justify-content:center;margin-bottom:8px;"></div>' : ''}
                ${showPassContent ? '<div style="font-family:monospace;font-size:22px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">'+v.uniqueCode+'</div>' : ''}
                ${v.photo ? '<div style="margin:8px auto;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #ddd;"><img src="'+v.photo+'" style="width:100%;height:100%;object-fit:cover;"></div>' : ''}
                <div style="border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;">
                    <div><strong>Doctor:</strong> ${v.doctorName} (${v.specialization})</div>
                    <div><strong>Phone:</strong> ${v.phone}</div>
                    <div><strong>Hospital:</strong> ${v.hospital || '-'}</div>
                    <div><strong>Purpose:</strong> ${v.purpose || '-'}</div>
                    ${v.department ? '<div><strong>Dept:</strong> '+v.department+'</div>' : ''}
                    ${v.vehicleNo ? '<div><strong>Vehicle:</strong> '+v.vehicleNo+'</div>' : ''}
                    <div style="font-size:11px;color:var(--gray);margin-top:4px;">Entry: ${APP.formatDateTime(v.entryTime)}</div>
                    ${v.exitTime ? '<div style="font-size:11px;color:var(--gray);">Exit: '+APP.formatDateTime(v.exitTime)+'</div>' : ''}
                    <div style="margin-top:6px;"><span class="badge ${statusBadge(v.status)}">${statusLabel(v.status)}</span></div>
                    ${v.approvedBy ? '<div style="font-size:11px;color:var(--gray);margin-top:4px;">Approved by: '+v.approvedBy+'</div>' : ''}
                    ${v.rejectionReason ? '<div style="margin-top:6px;padding:6px 8px;background:rgba(220,53,69,0.1);border-radius:4px;border-left:3px solid var(--danger);"><strong style="color:var(--danger);font-size:12px;">Rejection Reason:</strong><br><span style="font-size:12px;">'+v.rejectionReason+'</span></div>' : ''}
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
                ${showPassContent ? '<button class="btn btn-primary" onclick="printDoctorPass(\''+v.id+'\')">🖨️ ' + T('gsmod_print_pass') + '</button>' : ''}
                ${v.status === 'active' ? '<button class="btn btn-danger" onclick="checkOutDoctor(\''+v.id+'\');this.closest(\'.modal\').remove()">' + T('gsmod_checkout') + '</button>' : ''}
                ${v.status === 'pending' ? '<span style="font-size:13px;color:var(--warning);font-weight:600;">⏳ ' + T('gsmod_waiting_hod') + '</span>' : ''}
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${T('gsmod_close')}</button>
            </div>
        </div>
    `);
    if (showPassContent) {
        setTimeout(() => {
            const c = document.getElementById('drQrView' + v.id);
            if (c && typeof QRCode !== 'undefined') {
                new QRCode(c, { text: v.uniqueCode, width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
            }
        }, 200);
    }
}

function printDoctorPass(id) {
    const v = DB.getById('doctorVisits', id);
    if (!v) return;
    if (v.status !== 'active') { APP.notify('Pass is not yet approved. Cannot print.', 'error'); return; }
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write('<html><head><title>Doctor Pass</title>' +
        '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>' +
        '<style>body{font-family:Arial;margin:0;padding:20px;text-align:center;} ' +
        '.pass{border:2px dashed #333;border-radius:12px;padding:20px;max-width:320px;margin:0 auto;} ' +
        '.header{font-size:11px;color:#666;margin-bottom:4px;} ' +
        '.title{font-size:20px;font-weight:700;margin-bottom:12px;} ' +
        '.code{font-family:monospace;font-size:24px;font-weight:700;letter-spacing:3px;margin:8px 0;} ' +
        '.info{border-top:1px solid #ddd;padding-top:8px;font-size:13px;text-align:left;} ' +
        '.info div{margin-bottom:3px;} ' +
        '@media print{body{padding:10px;}.pass{border-color:#999;}}' +
        '<\/style></head><body>' +
        '<div class="pass">' +
        '<div class="header">HOSPITAL MANAGEMENT SYSTEM</div>' +
        '<div class="title">DOCTOR PASS</div>' +
        '<div id="qrPrint" style="display:flex;justify-content:center;margin-bottom:8px;"></div>' +
        '<div class="code">' + v.uniqueCode + '</div>' +
        (v.photo ? '<div style="margin:8px auto;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #ddd;"><img src="' + v.photo + '" style="width:100%;height:100%;object-fit:cover;"></div>' : '') +
        '<div class="info">' +
        '<div><strong>Doctor:</strong> ' + v.doctorName + ' (' + v.specialization + ')</div>' +
        '<div><strong>Phone:</strong> ' + v.phone + '</div>' +
        '<div><strong>Hospital:</strong> ' + (v.hospital || '-') + '</div>' +
        '<div><strong>Purpose:</strong> ' + (v.purpose || '-') + '</div>' +
        (v.department ? '<div><strong>Dept:</strong> ' + v.department + '</div>' : '') +
        (v.vehicleNo ? '<div><strong>Vehicle:</strong> ' + v.vehicleNo + '</div>' : '') +
        '<div style="font-size:11px;color:#666;margin-top:4px;">Entry: ' + APP.formatDateTime(v.entryTime) + '</div>' +
        (v.exitTime ? '<div style="font-size:11px;color:#666;">Exit: ' + APP.formatDateTime(v.exitTime) + '</div>' : '') +
        '</div></div>' +
        '<script>' +
        'setTimeout(function(){' +
        'var c=document.getElementById("qrPrint");' +
        'if(c && typeof QRCode!=="undefined"){' +
        'new QRCode(c,{text:"' + v.uniqueCode + '",width:130,height:130,colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.H});' +
        'setTimeout(function(){window.print();window.close();},500);' +
        '}' +
        '},200);' +
        '<\/script></body></html>');
    win.document.close();
}

function approveDoctorEntry(id) {
    const entry = DB.getById('doctorVisits', id);
    if (!entry) return;
    if (!isUserHodOfDept(entry.department)) {
        APP.notify(T('gsmod_only_hod_pre') + ' ' + entry.department + ' ' + T('gsmod_only_hod_approve'), 'error');
        return;
    }
    const user = AUTH.currentUser();
    DB.update('doctorVisits', id, { status: 'active', approvedBy: user.fullName, approvedAt: new Date().toISOString() });
    APP.notify(T('gsmod_msg_doctor_approved'), 'success');
    renderDoctorList();
    renderApprovalsList();
}

function rejectDoctorEntry(id, reason) {
    const entry = DB.getById('doctorVisits', id);
    if (!entry) return;
    if (!isUserHodOfDept(entry.department)) {
        APP.notify(T('gsmod_only_hod_pre') + ' ' + entry.department + ' ' + T('gsmod_only_hod_reject'), 'error');
        return;
    }
    DB.update('doctorVisits', id, { status: 'rejected', rejectionReason: reason || 'No reason provided', rejectedBy: AUTH.currentUser()?.fullName || 'Unknown' });
    APP.notify(T('gsmod_msg_doctor_rejected'), 'info');
    renderDoctorList();
    renderApprovalsList();
}

function showRejectReason(store, id) {
    showModal(`
        <div class="modal-header"><h3>⛔ ${T('gsmod_reject_request')}</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div style="padding:16px;">
            <p style="font-size:13px;color:var(--gray);margin-bottom:12px;">${T('gsmod_provide_reason')}</p>
            <textarea id="rejectReasonInput" class="form-control" rows="3" placeholder="${T('gsmod_ph_reject_reason')}" style="margin-bottom:12px;"></textarea>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${T('gsmod_cancel')}</button>
                <button class="btn btn-danger" onclick="confirmReject('${store}','${id}')">${T('gsmod_confirm_reject')}</button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('rejectReasonInput')?.focus(), 200);
}

function confirmReject(store, id) {
    const reason = document.getElementById('rejectReasonInput')?.value?.trim() || 'No reason provided';
    if (store === 'gatesecurity') {
        rejectGateEntry(id, reason);
    } else if (store === 'doctorVisits') {
        rejectDoctorEntry(id, reason);
    }
    document.querySelector('.modal.active')?.remove();
}

/* ═══════════════════════════════════════════
   APPROVALS — Unified HOD approval dashboard
   ═══════════════════════════════════════════ */

function renderApprovalsSection() {
    const el = document.getElementById('gateContent');
    if (!el) return;
    const user = AUTH.currentUser();
    const isHodUser = isHod();
    el.innerHTML = `
        <div class="flex-between mb-4">
            <div>
                <h3 style="margin:0;">🔄 ${T('gsmod_approvals_dashboard')}</h3>
                <span style="font-size:13px;color:var(--gray);">${isHodUser ? T('gsmod_hod_sub') : T('gsmod_user_sub')}</span>
            </div>
        </div>
        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr><th>${T('gsmod_th_date')}</th><th>${T('gsmod_th_type')}</th><th>${T('gsmod_th_details')}</th><th>${T('gsmod_th_department')}</th><th>${T('gsmod_th_submitted')}</th><th>${T('gsmod_th_status')}</th><th>${T('gsmod_th_actions')}</th></tr></thead>
                    <tbody id="approvalsTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderApprovalsList();
}

function renderApprovalsList() {
    const tbody = document.getElementById('approvalsTableBody');
    if (!tbody) return;
    const user = AUTH.currentUser();
    const isHodUser = isHod();
    const hodDepts = getHodDepartments();

    const goods = (DB.get('gatesecurity') || []).map(g => ({
        ...g, _type: 'goods', _typeLabel: '🚚 ' + T('gsmod_tab_goods'), _details: g.itemName + ' (' + g.direction + ')', _idField: 'id'
    }));
    const doctors = (DB.get('doctorVisits') || []).map(d => ({
        ...d, _type: 'doctor', _typeLabel: '🩺 ' + T('gsmod_doctor_word'), _details: d.doctorName + ' (' + (d.specialization || '-') + ')', _idField: 'id'
    }));

    let all = [...goods, ...doctors];

    if (isHodUser) {
        all = all.filter(item => hodDepts.includes(item.department));
    } else {
        all = all.filter(item => item.submittedBy === user.fullName);
    }

    all.sort((a, b) => new Date(b.createdAt || b.entryTime) - new Date(a.createdAt || a.entryTime));

    const statusBadge = (s) => {
        if (s === 'approved' || s === 'active') return 'badge-success';
        if (s === 'pending') return 'badge-warning';
        if (s === 'rejected') return 'badge-danger';
        return 'badge-secondary';
    };
    const statusLabel = (s) => {
        if (s === 'active') return T('gsmod_st_approved');
        if (s === 'pending') return T('gsmod_st_pending');
        if (s === 'rejected') return T('gsmod_st_rejected');
        if (s === 'completed') return T('gsmod_st_checkedout');
        return s.toUpperCase();
    };

    tbody.innerHTML = all.map(item => `
        <tr ${item.status === 'rejected' ? 'style="background:rgba(220,53,69,0.08);"' : ''}>
            <td style="font-size:12px;">${APP.formatDateTime(item.createdAt || item.entryTime)}</td>
            <td><span class="badge ${item._type === 'goods' ? 'badge-info' : 'badge-primary'}">${item._typeLabel}</span></td>
            <td><strong>${item._details}</strong>${item.uniqueCode ? '<br><span style="font-family:monospace;font-size:11px;color:var(--gray);">'+item.uniqueCode+'</span>' : ''}</td>
            <td>${item.department || '-'}</td>
            <td>${item.submittedBy || '-'}</td>
            <td><span class="badge ${statusBadge(item.status)}">${statusLabel(item.status)}</span></td>
            <td>
                ${item.status === 'pending' && isHodUser ? `
                    <button class="btn btn-sm btn-success" onclick="${item._type === 'goods' ? 'approveGateEntry' : 'approveDoctorEntry'}('${item.id}')">${T('gsmod_approve')}</button>
                    <button class="btn btn-sm btn-danger" onclick="showRejectReason('${item._type === 'goods' ? 'gatesecurity' : 'doctorVisits'}','${item.id}')">${T('gsmod_reject')}</button>
                ` : ''}
                ${item._type === 'doctor' && item.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="viewDoctorPass('${item.id}')">${T('gsmod_pass')}</button>` : ''}
                ${item._type === 'doctor' && item.status === 'pending' ? `<button class="btn btn-sm btn-info" onclick="viewDoctorPass('${item.id}')">${T('gsmod_view')}</button>` : ''}
                ${item._type === 'goods' ? `<button class="btn btn-sm btn-info" onclick="viewGateEntry('${item.id}')">${T('gsmod_view')}</button>` : ''}
                ${item.status === 'rejected' ? '<span style="color:var(--danger);font-size:11px;font-weight:600;">⛔ ' + T('gsmod_rejected_cap') + '</span>' : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty-state">' + T('gsmod_no_requests') + '</td></tr>';
}

function checkOutDoctor(id) {
    const v = DB.getById('doctorVisits', id);
    if (!v) return;
    if (v.status === 'completed') { APP.notify(T('gsmod_already_checkedout'), 'info'); return; }
    if (v.status !== 'active') { APP.notify(T('gsmod_only_approved_checkout'), 'error'); return; }
    confirmAction(T('gsmod_confirm_checkout_dr_pre') + ' "' + v.doctorName + '" (' + T('gsmod_code_label') + ' ' + v.uniqueCode + ')' + T('gsmod_confirm_checkout_post'), () => {
        DB.update('doctorVisits', id, { status: 'completed', exitTime: new Date().toISOString() });
        APP.notify(T('gsmod_doctor_word') + ' "' + v.doctorName + '" ' + T('gsmod_checked_out_deactivated'), 'success');
        renderDoctorList();
        if (document.getElementById('genPassBody')) renderGenPassList();
    });
}

function showDoctorScanModal() {
    showModal(`
        <div class="modal-header"><h3>📷 ${T('gsmod_scan_qr_title')}</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div style="padding:16px;text-align:center;">
            <p style="font-size:13px;color:var(--gray);margin-bottom:12px;">${T('gsmod_scan_instr_doctor')}</p>
            <input type="text" id="drScanInput" class="form-control" style="max-width:300px;margin:0 auto 12px;text-align:center;font-family:monospace;font-size:18px;letter-spacing:2px;" placeholder="${T('gsmod_ph_enter_code_dr')}" autofocus>
            <div><button class="btn btn-primary" onclick="processDoctorScan()">${T('gsmod_verify_checkout')}</button></div>
            <div id="drScanResult" style="margin-top:12px;font-size:14px;"></div>
        </div>
    `);
    setTimeout(() => {
        const inp = document.getElementById('drScanInput');
        if (inp) { inp.focus(); inp.onkeydown = (e) => { if (e.key === 'Enter') processDoctorScan(); }; }
    }, 200);
}

function processDoctorScan() {
    const code = (document.getElementById('drScanInput')?.value || '').trim().toUpperCase();
    const result = document.getElementById('drScanResult');
    if (!code) { result.innerHTML = '<span style="color:red;">' + T('gsmod_enter_code') + '</span>'; return; }
    const visits = DB.get('doctorVisits');
    const visit = visits.find(v => v.uniqueCode.toUpperCase() === code);
    if (!visit) { result.innerHTML = '<span style="color:red;">❌ ' + T('gsmod_no_doctor_found') + ' "' + code + '"</span>'; return; }
    if (visit.status === 'completed') { result.innerHTML = '<span style="color:orange;">⚠️ ' + T('gsmod_already_checkedout_at') + ' ' + APP.formatDateTime(visit.exitTime) + '.</span>'; return; }
    if (visit.status !== 'active') { result.innerHTML = '<span style="color:red;">⛔ ' + T('gsmod_visit_not_approved') + ' ' + visit.status.toUpperCase() + '</span>'; return; }
    result.innerHTML = '<span style="color:green;">✅ ' + T('gsmod_found') + ': Dr. ' + visit.doctorName + ' (' + visit.specialization + ', ' + T('gsmod_entered') + ' ' + APP.formatDateTime(visit.entryTime) + ')</span>' +
        '<div style="margin-top:8px;"><button class="btn btn-danger" onclick="checkOutDoctor(\'' + visit.id + '\');document.getElementById(\'drScanInput\').value=\'\';document.getElementById(\'drScanResult\').innerHTML=\'<span style=color:green;>✓ Checked out</span>\';">' + T('gsmod_confirm_checkout') + '</button></div>';
}

/* ═══════════════════════════════════════════
   PASS GENERATOR — Unified tab
   ═══════════════════════════════════════════ */

function renderPassGenerator() {
    const el = document.getElementById('gateContent');
    if (!el) return;
    const patients = DB.get('patientVisits') || [];
    const doctors = DB.get('doctorVisits') || [];
    el.innerHTML = `
        <div class="flex-between mb-4">
            <div>
                <h3 style="margin:0;">🎫 ${T('gsmod_pass_generator')}</h3>
                <span style="font-size:13px;color:var(--gray);">${T('gsmod_passgen_sub')}</span>
            </div>
            <div style="display:flex;gap:6px;">
                <button class="btn btn-primary" onclick="showGenPassForm('patient')">+ ${T('gsmod_visitor_pass')}</button>
                <button class="btn btn-info" onclick="showGenPassForm('doctor')">+ ${T('gsmod_doctor_pass')}</button>
            </div>
        </div>
        <div class="grid-4 mb-4">
            <div class="stat-card"><div class="stat-value">${patients.length + doctors.length}</div><div class="stat-label">${T('gsmod_stat_total_entries')}</div><div style="font-size:11px;color:var(--gray);">${doctors.filter(d => d.status === 'pending').length} ${T('gsmod_pending_lower')}</div></div>
            <div class="stat-card" style="border-left-color:var(--success);"><div class="stat-value">${patients.filter(p => p.status === 'active').length + doctors.filter(d => d.status === 'active').length}</div><div class="stat-label">${T('gsmod_stat_active')}</div></div>
            <div class="stat-card" style="border-left-color:var(--secondary);"><div class="stat-value">${patients.filter(p => p.status === 'completed').length + doctors.filter(d => d.status === 'completed').length}</div><div class="stat-label">${T('gsmod_stat_checkedout')}</div></div>
            <div class="stat-card" style="border-left-color:var(--info);"><div class="stat-value">${patients.length}</div><div class="stat-label">${T('gsmod_stat_visitors')}</div><div style="font-size:11px;color:var(--gray);">${doctors.length} ${T('gsmod_doctors_word')} (${doctors.filter(d => d.status === 'pending').length} ${T('gsmod_pending_lower')})</div></div>
        </div>
        <div class="card">
            <div class="flex-between mb-2" style="padding:0 0 8px 0;">
                <div class="search-box">
                    <input type="text" class="form-control" id="genPassSearch" placeholder="${T('gsmod_search_name')}" oninput="renderGenPassList()">
                </div>
                <div class="tabs" style="margin:0;">
                    <button class="tab-btn active" onclick="switchGenPassFilter('all',this)">${T('gsmod_f_all')}</button>
                    <button class="tab-btn" onclick="switchGenPassFilter('active',this)">${T('gsmod_f_active')}</button>
                    <button class="tab-btn" onclick="switchGenPassFilter('completed',this)">${T('gsmod_f_checkedout')}</button>
                    <button class="tab-btn" onclick="switchGenPassFilter('visitor',this)">${T('gsmod_f_visitors')}</button>
                    <button class="tab-btn" onclick="switchGenPassFilter('doctor',this)">${T('gsmod_f_doctors')}</button>
                </div>
            </div>
            <div class="table-responsive">
                <table>
                    <thead><tr><th>${T('gsmod_th_code')}</th><th>${T('gsmod_th_type')}</th><th>${T('gsmod_th_name')}</th><th>${T('gsmod_th_phone')}</th><th>${T('gsmod_th_purpose')}</th><th>${T('gsmod_th_entry')}</th><th>${T('gsmod_th_status')}</th><th>${T('gsmod_th_actions')}</th></tr></thead>
                    <tbody id="genPassBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderGenPassList();
}

let genPassFilter = 'all';

function switchGenPassFilter(filter, btn) {
    genPassFilter = filter;
    document.querySelectorAll('#gateContent .tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGenPassList();
}

function renderGenPassList() {
    const patients = DB.get('patientVisits') || [];
    const doctors = DB.get('doctorVisits') || [];
    const search = (document.getElementById('genPassSearch')?.value || '').toLowerCase();

    let allPasses = [
        ...patients.map(p => ({ ...p, _type: 'visitor', _name: p.patientName, _typeLabel: T('gsmod_visitor_word') })),
        ...doctors.map(d => ({ ...d, _type: 'doctor', _name: d.doctorName, _typeLabel: T('gsmod_doctor_word') }))
    ];

    if (genPassFilter === 'active') allPasses = allPasses.filter(p => p.status === 'active');
    else if (genPassFilter === 'completed') allPasses = allPasses.filter(p => p.status === 'completed');
    else if (genPassFilter === 'visitor') allPasses = allPasses.filter(p => p._type === 'visitor');
    else if (genPassFilter === 'doctor') allPasses = allPasses.filter(p => p._type === 'doctor');

    if (search) {
        allPasses = allPasses.filter(p =>
            (p._name || '').toLowerCase().includes(search) ||
            (p.uniqueCode || '').toLowerCase().includes(search) ||
            (p.phone || '').includes(search)
        );
    }

    const statusBadge = (s) => {
        if (s === 'active') return 'badge-success';
        if (s === 'pending') return 'badge-warning';
        if (s === 'rejected') return 'badge-danger';
        return 'badge-secondary';
    };
    const statusLabel = (s) => {
        if (s === 'active') return T('gsmod_st_approved');
        if (s === 'pending') return T('gsmod_st_pending');
        if (s === 'rejected') return T('gsmod_st_rejected');
        if (s === 'completed') return T('gsmod_out');
        return s.toUpperCase();
    };

    const tbody = document.getElementById('genPassBody');
    if (!tbody) return;
    tbody.innerHTML = allPasses.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime)).map(p => `
        <tr ${p.status === 'rejected' ? 'style="background:rgba(220,53,69,0.08);"' : ''}>
            <td><strong style="font-family:monospace;font-size:12px;">${p.uniqueCode}</strong></td>
            <td><span class="badge ${p._type === 'visitor' ? 'badge-info' : 'badge-primary'}">${p._typeLabel}</span></td>
            <td>${p._name}${p._type === 'visitor' && p.age ? ' ('+p.age+'y)' : ''}</td>
            <td>${p.phone}</td>
            <td style="font-size:12px;">${p.purpose || '-'}</td>
            <td style="font-size:12px;">${APP.formatDateTime(p.entryTime)}</td>
            <td><span class="badge ${statusBadge(p.status)}">${statusLabel(p.status)}</span></td>
            <td style="white-space:nowrap;">
                ${p._type === 'visitor' && p.status === 'active' ? `<button class="btn btn-sm btn-primary" onclick="viewPatientPass('${p.id}')">${T('gsmod_pass')}</button>` : ''}
                ${p._type === 'doctor' ? `<button class="btn btn-sm ${p.status === 'active' ? 'btn-primary' : 'btn-info'}" onclick="viewDoctorPass('${p.id}')">${p.status === 'active' ? T('gsmod_pass') : p.status === 'pending' ? T('gsmod_pending_word') : T('gsmod_view')}</button>` : ''}
                ${p.status === 'active' ? `<button class="btn btn-sm btn-info" onclick="${p._type === 'visitor' ? 'printPatientPass' : 'printDoctorPass'}('${p.id}')">🖨️</button>` : ''}
                ${p.status === 'active' ? `<button class="btn btn-sm btn-warning" onclick="${p._type === 'visitor' ? 'checkOutPatient' : 'checkOutDoctor'}('${p.id}')">${T('gsmod_checkout')}</button>` : ''}
                ${p.status === 'rejected' ? '<span style="color:var(--danger);font-size:11px;font-weight:600;">⛔ ' + T('gsmod_rejected_cap') + '</span>' : ''}
                <button class="btn btn-sm btn-danger" onclick="deletePass('${p._type}','${p.id}','${(p._name||'').replace(/'/g,"\\'")}','${p.uniqueCode}')">🗑</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">' + T('gsmod_no_passes') + '</td></tr>';
}

function deletePass(type, id, name, code) {
    var cu = AUTH.currentUser();
    if (!cu || (cu.role !== 'admin' && !cu.isSuperAdmin)) { APP.notify(T('gsmod_only_admin_delete'), 'error'); return; }
    var label = name ? '"' + name + '" (' + code + ')' : code;
    confirmAction(T('gsmod_delete_pass_pre') + ' ' + label + T('gsmod_delete_pass_post'), function() {
        var key = type === 'visitor' ? 'patientVisits' : 'doctorVisits';
        DB.delete(key, id);
        APP.notify(T('gsmod_msg_pass_deleted'), 'success');
        renderPatientList();
        renderDoctorList();
        if (document.getElementById('genPassBody')) renderGenPassList();
    });
}

function showGenPassForm(type) {
    if (type === 'visitor' || type === 'patient') {
        showPatientForm();
    } else {
        showDoctorForm();
    }
}
