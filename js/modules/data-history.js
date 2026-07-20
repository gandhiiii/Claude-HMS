function renderDataHistory(container) {
    var cu = AUTH.currentUser();
    if (!cu || (cu.role !== 'admin' && !cu.isSuperAdmin)) {
        container.innerHTML = '<div class="empty-state">Admin access only.</div>';
        return;
    }
    _renderDataHistoryContent(container);
}

function _renderDataHistoryContent(container) {
    var idx = DB.getBackupIndex(); // newest-first
    var used = idx.length;
    var max  = DB._MAX_BK_SLOTS;

    var rowsHtml = '';
    if (used === 0) {
        rowsHtml = '<tr><td colspan="3" class="empty-state">No backups yet. Every data change auto-saves one (max once per 3 min).</td></tr>';
    } else {
        idx.forEach(function(entry) {
            var ts = new Date(entry.ts).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
            var lbl = entry.label || 'auto';
            var lc  = lbl.startsWith('before-') ? '#1976d2'
                    : lbl.startsWith('pre-update') ? '#7b1fa2'
                    : lbl.startsWith('manual') ? '#388e3c'
                    : lbl.startsWith('hourly') ? '#0288d1'
                    : '#546e7a';
            rowsHtml += '<tr style="border-bottom:1px solid var(--border);">'
                + '<td style="padding:9px 10px;font-size:13px;">' + ts + '</td>'
                + '<td style="padding:9px 10px;">'
                + '<span style="background:' + lc + ';color:#fff;font-size:11px;padding:2px 9px;border-radius:20px;display:inline-block;">'
                + lbl.replace(/</g, '&lt;').replace(/&/g, '&amp;')
                + '</span></td>'
                + '<td style="padding:9px 10px;white-space:nowrap;">'
                + '<button class="btn btn-sm btn-warning" style="margin-right:4px;" onclick="dataHistoryRestore(' + entry.n + ')">Restore</button>'
                + '<button class="btn btn-sm btn-outline" onclick="dataHistoryDownload(' + entry.n + ')">Download</button>'
                + '</td></tr>';
        });
    }

    container.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
            <button class="btn btn-primary" onclick="dataHistorySnapNow()">+ Save Backup Now</button>
            <button class="btn btn-outline" onclick="DB.exportAll('manual-export')">Export All Data (JSON)</button>
            <label class="btn btn-outline" style="cursor:pointer;margin:0;">
                Import / Restore from File
                <input type="file" accept=".json" style="display:none;" onchange="dataHistoryImportFile(this)">
            </label>
        </div>

        <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <h2>🕐 Backup History</h2>
                <span style="font-size:12px;color:var(--gray);">${used} / ${max} slots used &nbsp;·&nbsp; Auto-saves before every change (max once per 3 min)</span>
            </div>
            <div class="table-responsive">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:var(--light-gray);">
                            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);">Saved At</th>
                            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);">Trigger / Label</th>
                            <th style="padding:8px 10px;text-align:left;border-bottom:2px solid var(--border);">Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        </div>

        <div class="card" style="margin-top:14px;border-left:4px solid #f59e0b;padding:12px 16px;font-size:13px;">
            <strong>Restore replaces ALL current data</strong> with the snapshot.
            Download a fresh backup first if you want to keep the current state.
        </div>
    `;
}

function dataHistorySnapNow() {
    var label = 'manual-' + new Date().toISOString().slice(0, 16).replace('T', ' ');
    DB.autoBackup(label);
    APP.notify('Backup saved', 'success');
    APP.refreshCurrent();
}

function dataHistoryRestore(n) {
    confirmAction('Restore this backup? ALL current data will be replaced. This cannot be undone.', function() {
        var result = DB.restoreFromSlot(n);
        if (result.success) {
            APP.notify('Restored successfully — reloading…', 'success');
            setTimeout(function() { window.location.reload(); }, 1200);
        } else {
            APP.notify('Restore failed: ' + (result.error || 'unknown error'), 'error');
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
        confirmAction('Import this file? Records with matching IDs will be overwritten, others preserved.', function() {
            var result = DB.importAll(e.target.result, false);
            if (result.success) {
                APP.notify('Import successful (' + result.count + ' stores). Reloading…', 'success');
                setTimeout(function() { window.location.reload(); }, 1200);
            } else {
                APP.notify('Import failed: ' + (result.error || 'unknown error'), 'error');
            }
        });
    };
    reader.readAsText(file);
    input.value = '';
}
