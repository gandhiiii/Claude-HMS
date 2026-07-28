function renderDataHistory(container) {
    var cu = AUTH.currentUser();
    if (!cu || (cu.role !== 'admin' && !cu.isSuperAdmin)) {
        container.innerHTML = '<div class="empty-state">' + T('dhmod_admin_only') + '</div>';
        return;
    }
    _renderDataHistoryContent(container);
}

function _renderDataHistoryContent(container) {
    var fb = !!window.FB_DB;

    /* ── Cloud Sync Section ── */
    var cloudHtml = '';
    if (fb) {
        cloudHtml = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 14px;border-radius:10px;background:rgba(52,168,83,0.08);border:1px solid rgba(52,168,83,0.25);">
            <span style="width:10px;height:10px;border-radius:50%;background:#34a853;animation:pulse 2s ease-in-out infinite;flex-shrink:0;display:inline-block;"></span>
            <span style="font-weight:700;color:#34a853;font-size:13px;">${T('dhmod_live_database')}</span>
            <span style="font-size:12px;color:var(--gray);">${T('dhmod_live_database_desc')}</span>
        </div>`;
    } else {
        cloudHtml = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 14px;border-radius:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);">
            <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;flex-shrink:0;display:inline-block;"></span>
            <span style="font-weight:700;color:#b45309;font-size:13px;">${T('dhmod_connecting')}</span>
            <span style="font-size:12px;color:var(--gray);">${T('dhmod_connecting_desc')}</span>
        </div>`;
    }

    /* ── Backup History Section ── */
    var idx  = DB.getBackupIndex();
    var used = idx.length;
    var max  = DB._MAX_BK_SLOTS;

    var rowsHtml = '';
    if (used === 0) {
        rowsHtml = '<tr><td colspan="3" class="empty-state">' + T('dhmod_no_backups') + '</td></tr>';
    } else {
        idx.forEach(function(entry) {
            var ts = new Date(entry.ts).toLocaleString('en-IN', {
                day:'numeric', month:'short', year:'numeric',
                hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true
            });
            var lbl = entry.label || 'auto';
            var lc  = lbl.startsWith('before-') ? '#1976d2'
                    : lbl.startsWith('pre-update') ? '#7b1fa2'
                    : lbl.startsWith('manual') ? '#388e3c'
                    : lbl.startsWith('hourly') ? '#0288d1'
                    : '#546e7a';
            rowsHtml += '<tr style="border-bottom:1px solid var(--border);">'
                + '<td style="padding:9px 10px;font-size:13px;">' + ts + '</td>'
                + '<td style="padding:9px 10px;"><span style="background:' + lc + ';color:#fff;font-size:11px;padding:2px 9px;border-radius:20px;display:inline-block;">'
                + lbl.replace(/</g,'&lt;').replace(/&/g,'&amp;') + '</span></td>'
                + '<td style="padding:9px 10px;white-space:nowrap;">'
                + '<button class="btn btn-sm btn-warning" style="margin-right:4px;" onclick="dataHistoryRestore(' + entry.n + ')">' + T('dhmod_btn_restore') + '</button>'
                + '<button class="btn btn-sm btn-outline" onclick="dataHistoryDownload(' + entry.n + ')">' + T('dhmod_btn_download') + '</button>'
                + '</td></tr>';
        });
    }

    container.innerHTML = cloudHtml + `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="btn btn-primary" onclick="dataHistorySnapNow()">${T('dhmod_btn_save_backup_now')}</button>
            <button class="btn btn-outline" onclick="DB.exportAll('manual-export')">${T('dhmod_btn_export_all')}</button>
            <label class="btn btn-outline" style="cursor:pointer;margin:0;">
                ${T('dhmod_btn_import_restore')}
                <input type="file" accept=".json" style="display:none;" onchange="dataHistoryImportFile(this)">
            </label>
        </div>

        <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h2>${T('dhmod_heading_local_backup_history')}</h2>
                <span style="font-size:12px;color:var(--gray);">${used} / ${max}${T('dhmod_slots_used_suffix')} &nbsp;·&nbsp; ${T('dhmod_autosave_note')}</span>
            </div>
            <div class="table-responsive">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:var(--light-gray);">
                            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);">${T('dhmod_th_saved_at')}</th>
                            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);">${T('dhmod_th_trigger_label')}</th>
                            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);">${T('dhmod_th_actions')}</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>

        <div class="card" style="margin-top:14px;border-left:4px solid #f59e0b;padding:12px 16px;font-size:13px;">
            <strong>${T('dhmod_restore_warning_strong')}</strong> ${T('dhmod_restore_warning_rest')}
        </div>
    `;
}

/* ── Cross-device Firebase config sharing ── */
function _dataHistoryGetCfg() {
    var cfg = window.HMS_FB_CFG || null;
    if (!cfg) { try { cfg = JSON.parse(localStorage.getItem('hms_firebase_cfg')); } catch(e) {} }
    return (cfg && cfg.apiKey) ? cfg : null;
}

function dataHistoryShareConfig() {
    var cfg = _dataHistoryGetCfg();
    if (!cfg) { APP.notify(T('dhmod_msg_fb_config_unavailable'), 'error'); return; }
    try {
        var encoded = btoa(JSON.stringify(cfg));
        var href = window.location.href.replace(/#.*$/, '');
        var base = href.substring(0, href.lastIndexOf('/') + 1);
        var url = base + 'dashboard.html#fbcfg=' + encoded;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                APP.notify(T('dhmod_msg_link_copied_auto'), 'success');
            });
        } else {
            var ta = document.createElement('textarea');
            ta.value = url; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
            APP.notify(T('dhmod_msg_link_copied'), 'success');
        }
    } catch(e) { APP.notify(T('dhmod_msg_error_prefix') + e.message, 'error'); }
}

function dataHistoryShowQR() {
    var cfg = _dataHistoryGetCfg();
    if (!cfg) { APP.notify(T('dhmod_msg_fb_config_unavailable'), 'error'); return; }
    try {
        var encoded = btoa(JSON.stringify(cfg));
        var href = window.location.href.replace(/#.*$/, '');
        var base = href.substring(0, href.lastIndexOf('/') + 1);
        var url = base + 'dashboard.html#fbcfg=' + encoded;
        var escapedUrl = url.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        openFormModal(T('dhmod_modal_scan_qr_title'),
            '<div style="text-align:center;padding:8px 0;">'
            + '<div id="fbConfigQR" style="display:inline-block;margin-bottom:12px;border:6px solid #fff;border-radius:4px;"></div>'
            + '<p style="font-size:12px;color:var(--gray);margin-bottom:10px;">' + T('dhmod_qr_instructions') + '</p>'
            + '<p style="font-size:12px;color:var(--gray);margin-bottom:6px;">' + T('dhmod_or_copy_link') + '</p>'
            + '<input type="text" value="' + escapedUrl + '" readonly class="form-control" style="font-size:11px;" onclick="this.select()">'
            + '</div>',
            null, false);
        setTimeout(function() {
            var qrEl = document.getElementById('fbConfigQR');
            if (qrEl && typeof QRCode !== 'undefined') {
                new QRCode(qrEl, { text: url, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
            } else if (qrEl) {
                qrEl.textContent = T('dhmod_qr_lib_not_loaded');
            }
        }, 150);
    } catch(e) { APP.notify(T('dhmod_msg_error_prefix') + e.message, 'error'); }
}

function dataHistoryDownloadFbConfig() {
    var cfg = _dataHistoryGetCfg();
    if (!cfg) { APP.notify(T('dhmod_msg_fb_config_unavailable'), 'error'); return; }
    function esc(s) { return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
    var content = [
        '// ═══════════════════════════════════════════════════════════════════',
        '// HMS — Firebase Configuration (Generated ' + new Date().toLocaleString() + ')',
        '// Replace js/firebase-config.js with this file, then push to GitHub',
        '// so ALL devices automatically connect to Firebase.',
        '// ═══════════════════════════════════════════════════════════════════',
        '',
        'var firebaseConfig = {',
        '    apiKey:            "' + esc(cfg.apiKey) + '",',
        '    authDomain:        "' + esc(cfg.authDomain || '') + '",',
        '    databaseURL:       "' + esc(cfg.databaseURL || '') + '",',
        '    projectId:         "' + esc(cfg.projectId || '') + '",',
        '    storageBucket:     "' + esc(cfg.storageBucket || '') + '",',
        '    messagingSenderId: "' + esc(cfg.messagingSenderId || '') + '",',
        '    appId:             "' + esc(cfg.appId || '') + '"',
        '};',
        '',
        '(function () {',
        '    try {',
        '        if (typeof firebase === \'undefined\') { window.FB_DB = null; window.FB_CONFIGURED = false; return; }',
        '        // Hash-fragment sharing: dashboard.html#fbcfg=BASE64',
        '        try {',
        '            var m = (window.location.hash||\'\').match(/[#&]fbcfg=([A-Za-z0-9+\\/=%-]+)/);',
        '            if (m) {',
        '                var d = JSON.parse(atob(decodeURIComponent(m[1])));',
        '                if (d && d.apiKey && !d.apiKey.startsWith(\'REPLACE_\')) {',
        '                    localStorage.setItem(\'hms_firebase_cfg\', JSON.stringify(d));',
        '                    try { history.replaceState(null,null,location.pathname+location.search); } catch(e2){}',
        '                    firebaseConfig = d;',
        '                }',
        '            }',
        '        } catch(e) {}',
        '        // localStorage override',
        '        try {',
        '            var s = JSON.parse(localStorage.getItem(\'hms_firebase_cfg\')||\'null\');',
        '            if (s && s.apiKey && !s.apiKey.startsWith(\'REPLACE_\')) firebaseConfig = s;',
        '        } catch(e) {}',
        '        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);',
        '        window.FB_DB = firebase.database();',
        '        window.FB_CONFIGURED = true;',
        '        window.FB_PROJECT_ID = firebaseConfig.projectId;',
        '        window.HMS_FB_CFG = firebaseConfig;',
        '        console.info(\'[HMS] Firebase connected ✓\');',
        '    } catch(e) {',
        '        console.warn(\'[HMS] Firebase init failed:\', e.message);',
        '        window.FB_DB = null; window.FB_CONFIGURED = false;',
        '    }',
        '})();'
    ].join('\n');
    try {
        var blob = new Blob([content], { type: 'text/javascript' });
        var bUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = bUrl; a.download = 'firebase-config.js';
        document.body.appendChild(a); a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(bUrl); }, 200);
        APP.notify(T('dhmod_msg_downloaded_fb_config'), 'success');
    } catch(e) { APP.notify(T('dhmod_msg_download_failed_prefix') + e.message, 'error'); }
}

/* ── Firebase setup ── */
function dataHistorySaveFbConfig() {
    var cfg = {
        apiKey:            (document.getElementById('fb_apiKey')            || {}).value || '',
        authDomain:        (document.getElementById('fb_authDomain')        || {}).value || '',
        databaseURL:       (document.getElementById('fb_databaseURL')       || {}).value || '',
        projectId:         (document.getElementById('fb_projectId')         || {}).value || '',
        storageBucket:     (document.getElementById('fb_storageBucket')     || {}).value || '',
        messagingSenderId: (document.getElementById('fb_messagingSenderId') || {}).value || '',
        appId:             (document.getElementById('fb_appId')             || {}).value || ''
    };
    var msgEl = document.getElementById('fbSetupMsg');
    if (!cfg.apiKey || !cfg.databaseURL || !cfg.projectId || !cfg.appId) {
        if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = T('dhmod_msg_fb_fields_required'); }
        return;
    }
    try {
        localStorage.setItem('hms_firebase_cfg', JSON.stringify(cfg));
        if (msgEl) { msgEl.style.color = 'var(--secondary)'; msgEl.textContent = T('dhmod_msg_fb_config_saved'); }
        setTimeout(function() { window.location.reload(); }, 1200);
    } catch(e) {
        if (msgEl) { msgEl.style.color = 'var(--danger)'; msgEl.textContent = T('dhmod_msg_save_error_prefix') + e.message; }
    }
}

function dataHistoryClearFbConfig() {
    if (!confirm(T('dhmod_confirm_clear_fb_config'))) return;
    localStorage.removeItem('hms_firebase_cfg');
    APP.notify(T('dhmod_msg_fb_config_cleared'), 'info');
    setTimeout(function() { window.location.reload(); }, 800);
}

/* ── Cloud push / pull ── */
function dataHistoryPushToCloud() {
    confirmAction(T('dhmod_confirm_push_cloud'), function() {
        try { SYNC.pushAll(); } catch(e) { APP.notify(T('dhmod_msg_push_failed_prefix') + e.message, 'error'); }
    });
}

function dataHistoryPullFromCloud() {
    confirmAction(T('dhmod_confirm_pull_cloud'), function() {
        try {
            SYNC.pullNow(function(ok) {
                if (ok) setTimeout(function() { APP.refreshCurrent(); }, 400);
            });
        } catch(e) { APP.notify(T('dhmod_msg_pull_failed_prefix') + e.message, 'error'); }
    });
}

/* ── Local backup actions ── */
function dataHistorySnapNow() {
    var label = 'manual-' + new Date().toISOString().slice(0,16).replace('T',' ');
    DB.autoBackup(label);
    APP.notify(T('dhmod_msg_backup_saved'), 'success');
    APP.refreshCurrent();
}

function dataHistoryRestore(n) {
    confirmAction(T('dhmod_confirm_restore_backup'), function() {
        var result = DB.restoreFromSlot(n);
        if (result.success) {
            APP.notify(T('dhmod_msg_restored_reloading'), 'success');
            setTimeout(function() { window.location.reload(); }, 1200);
        } else {
            APP.notify(T('dhmod_msg_restore_failed_prefix') + (result.error || T('dhmod_unknown')), 'error');
        }
    });
}

function dataHistoryDownload(n) {
    DB.downloadBackupSlot(n);
}

function dataHistoryImportFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        confirmAction(T('dhmod_confirm_import_file'), function() {
            var result = DB.importAll(e.target.result, false);
            if (result.success) {
                APP.notify(T('dhmod_msg_import_success_prefix') + result.count + T('dhmod_msg_import_success_suffix'), 'success');
                setTimeout(function() { window.location.reload(); }, 1200);
            } else {
                APP.notify(T('dhmod_msg_import_failed_prefix') + (result.error || T('dhmod_unknown')), 'error');
            }
        });
    };
    reader.readAsText(file);
    input.value = '';
}
