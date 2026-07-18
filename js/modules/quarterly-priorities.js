// Quarterly Priorities — Admin & HOD set goals per member per quarter
// Employee fulfils them from their own dashboard

(function() {
    var s = document.createElement('style');
    s.textContent = [
        '.qp-tab-btn{padding:8px 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;border:1px solid var(--light-gray);background:var(--card-bg);color:var(--text);}',
        '.qp-tab-btn.active{background:#e65100;color:#fff;border-color:#e65100;}',
        '.qp-item-row{display:grid;grid-template-columns:1fr 110px 32px;gap:8px;align-items:center;margin-bottom:8px;}',
        '.qp-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;}',
        '.qp-member-card{background:var(--light-gray);border-radius:10px;padding:14px;}',
        '.qp-pbar{height:8px;background:var(--border);border-radius:4px;overflow:hidden;flex:1;}',
        '.qp-pfill{height:100%;border-radius:4px;transition:width .4s;}',
        '.qp-badge-h{background:#ffebee;color:#c62828;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;}',
        '.qp-badge-m{background:#fff8e1;color:#f57f17;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;}',
        '.qp-badge-l{background:#e8f5e9;color:#2e7d32;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;}',
    ].join('');
    document.head.appendChild(s);
})();

var _qpAdminTab = 'overview';
var _qpHodMember = '';

/* ═══ HELPERS ═══════════════════════════════════════════════ */
function _qpCurQ() {
    var m = new Date().getMonth();
    return m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4';
}
function _qpPriBadge(p) {
    return p === 'high' ? '<span class="qp-badge-h">High</span>'
         : p === 'low'  ? '<span class="qp-badge-l">Low</span>'
         : '<span class="qp-badge-m">Medium</span>';
}
function _qpColor(pct) { return pct >= 80 ? '#34a853' : pct >= 50 ? '#fbbc04' : '#ea4335'; }
function _qpBar(pct) {
    return '<div style="display:flex;align-items:center;gap:8px;">'
        + '<div class="qp-pbar"><div class="qp-pfill" style="width:' + pct + '%;background:' + _qpColor(pct) + ';"></div></div>'
        + '<span style="font-size:12px;font-weight:700;color:' + _qpColor(pct) + ';min-width:34px;">' + pct + '%</span></div>';
}
function _qpKpi(val, label, color, icon) {
    return '<div class="stat-card" style="border-left-color:' + color + ';min-width:0;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
        + '<div><div class="stat-value" style="color:' + color + ';">' + val + '</div>'
        + '<div class="stat-label">' + label + '</div></div>'
        + '<span style="font-size:26px;opacity:.5;">' + icon + '</span></div></div>';
}
function _qpStats(items) {
    var total = items.length;
    var done  = items.filter(function(i){ return i.status === 'completed'; }).length;
    var pct   = total > 0 ? Math.round(done / total * 100) : 0;
    return { total: total, done: done, pct: pct };
}

/* ═══ ADMIN STANDALONE MODULE ════════════════════════════════ */
function renderQPriorities(container) {
    var user = AUTH.currentUser();
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
        container.innerHTML = '<div class="card"><div class="empty-state">🔒 Admin access only</div></div>'; return;
    }
    var TABS = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'set',      label: '✏️ Set Priorities' },
        { id: 'progress', label: '📈 Progress' }
    ];
    var btnHtml = TABS.map(function(t) {
        return '<button class="qp-tab-btn' + (t.id === _qpAdminTab ? ' active' : '') + '" data-tab="' + t.id
            + '" onclick="qpAdminSwitch(\'' + t.id + '\',this)">' + t.label + '</button>';
    }).join('');
    container.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">' + btnHtml + '</div><div id="qpAdminContent"></div>';
    _qpAdminRender(_qpAdminTab);
}

function qpAdminSwitch(tab, btn) {
    _qpAdminTab = tab;
    if (btn && btn.parentNode) btn.parentNode.querySelectorAll('.qp-tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    _qpAdminRender(tab);
}

function _qpAdminRender(tab) {
    var el = document.getElementById('qpAdminContent');
    if (!el) return;
    ({ overview: _qpAdminOverview, set: _qpAdminSet, progress: _qpAdminProgress })[tab](el);
}

function _qpAdminOverview(el) {
    var allQP = DB.get('quarterly_priorities') || [];
    var members = new Set(allQP.map(function(q){ return q.memberUsername; }));
    var totalItems = 0, doneItems = 0;
    allQP.forEach(function(qp){ var s = _qpStats(qp.items||[]); totalItems += s.total; doneItems += s.done; });
    var rate = totalItems > 0 ? Math.round(doneItems / totalItems * 100) : 0;

    // Dept breakdown
    var dMap = {};
    allQP.forEach(function(qp) {
        var d = qp.department || 'Unknown';
        if (!dMap[d]) dMap[d] = { mSet: new Set(), total: 0, done: 0 };
        dMap[d].mSet.add(qp.memberUsername);
        var s = _qpStats(qp.items||[]); dMap[d].total += s.total; dMap[d].done += s.done;
    });
    var deptRows = Object.keys(dMap).map(function(dept) {
        var d = dMap[dept], pct = d.total > 0 ? Math.round(d.done / d.total * 100) : 0;
        return '<tr><td><strong>' + dept + '</strong></td><td>' + d.mSet.size + '</td><td>' + d.total + '</td><td>' + d.done + '</td><td>' + _qpBar(pct) + '</td></tr>';
    }).join('');

    el.innerHTML = '<div class="grid-4 mb-4">'
        + _qpKpi(allQP.length, 'Priority Sets', '#e65100', '🎯')
        + _qpKpi(members.size, 'Members Covered', '#1a73e8', '👥')
        + _qpKpi(totalItems, 'Total Items', '#9c27b0', '📋')
        + _qpKpi(rate + '%', 'Overall Completion', _qpColor(rate), '✅')
        + '</div>'
        + (deptRows
            ? '<div class="card"><div style="font-size:14px;font-weight:700;padding:12px 16px;border-bottom:1px solid var(--light-gray);">📊 Department Breakdown</div>'
              + '<div class="table-responsive"><table><thead><tr><th>Department</th><th>Members</th><th>Total Items</th><th>Done</th><th>Progress</th></tr></thead><tbody>' + deptRows + '</tbody></table></div></div>'
            : '<div class="card"><div class="empty-state">No quarterly priorities set yet.<br>Go to <strong>Set Priorities</strong> to get started.</div></div>');
}

function _qpAdminSet(el) {
    var depts = DB.get('departments') || [];
    var year = new Date().getFullYear();
    el.innerHTML = '<div class="card" style="padding:18px;">'
        + '<div style="font-size:15px;font-weight:700;margin-bottom:16px;">✏️ Set Quarterly Priorities for a Member</div>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px;">'
        + '<div class="form-group"><label>Quarter *</label><select id="qpAQ" class="form-control" onchange="qpAdminLoadMembers()">'
        + ['Q1','Q2','Q3','Q4'].map(function(q){ return '<option value="'+q+'"'+( q===_qpCurQ()?' selected':'')+'>'+q+'</option>'; }).join('')
        + '</select></div>'
        + '<div class="form-group"><label>Year *</label><select id="qpAY" class="form-control" onchange="qpAdminLoadMembers()">'
        + [year-1,year,year+1].map(function(y){ return '<option value="'+y+'"'+(y===year?' selected':'')+'>'+y+'</option>'; }).join('')
        + '</select></div>'
        + '<div class="form-group"><label>Department</label><select id="qpADept" class="form-control" onchange="qpAdminLoadMembers()">'
        + '<option value="">All Departments</option>'
        + depts.map(function(d){ return '<option value="'+d.name+'">'+d.name+'</option>'; }).join('')
        + '</select></div>'
        + '<div class="form-group"><label>Team Member *</label><select id="qpAMember" class="form-control" onchange="qpAdminMemberChanged()"><option value="">-- Select --</option></select></div>'
        + '</div>'
        + '<div id="qpAExistBanner"></div>'
        + '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Priority Items</div>'
        + '<div id="qpAItemsList">'
        + _qpBlankItemRow(true)
        + '</div>'
        + '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">'
        + '<button class="btn btn-primary" onclick="qpAdminSave()">💾 Save Priorities</button>'
        + '<button class="btn btn-outline" onclick="qpAdminAddItem()">+ Add Item</button>'
        + '</div>'
        + '</div>'
        + '<div id="qpAMemberHistory" style="margin-top:16px;"></div>';

    qpAdminLoadMembers();
}

function _qpBlankItemRow(last) {
    return '<div class="qp-item-row">'
        + '<input type="text" class="form-control qp-item-title" placeholder="e.g. Achieve 95% checklist completion">'
        + '<select class="form-control qp-item-pri"><option value="high">🔴 High</option><option value="medium" selected>🟡 Medium</option><option value="low">🟢 Low</option></select>'
        + (last ? '<span></span>' : '<button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button>')
        + '</div>';
}

function qpAdminAddItem() {
    var list = document.getElementById('qpAItemsList');
    if (!list) return;
    var div = document.createElement('div');
    div.innerHTML = '<div class="qp-item-row">'
        + '<input type="text" class="form-control qp-item-title" placeholder="Priority item">'
        + '<select class="form-control qp-item-pri"><option value="high">🔴 High</option><option value="medium" selected>🟡 Medium</option><option value="low">🟢 Low</option></select>'
        + '<button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button>'
        + '</div>';
    list.appendChild(div.firstChild);
}

function qpAdminLoadMembers() {
    var dept = (document.getElementById('qpADept') || {}).value || '';
    var users = DB.get('users') || [];
    var members = users.filter(function(u){ return u.role === 'employee' || u.role === 'hod'; });
    if (dept) members = members.filter(function(u){ return u.department === dept; });
    var sel = document.getElementById('qpAMember');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Member --</option>'
        + members.map(function(m){
            return '<option value="'+m.username+'|'+m.fullName+'|'+(m.department||'')+'">'
                +m.fullName+' ('+( m.department||'—')+')</option>';
        }).join('');
    qpAdminMemberChanged();
}

function qpAdminMemberChanged() {
    var sel = document.getElementById('qpAMember');
    if (!sel || !sel.value) { document.getElementById('qpAExistBanner').innerHTML=''; document.getElementById('qpAMemberHistory').innerHTML=''; return; }
    var parts = sel.value.split('|'); var uname=parts[0],fname=parts[1];
    var q  = (document.getElementById('qpAQ')||{}).value;
    var y  = (document.getElementById('qpAY')||{}).value;
    var allQP = DB.get('quarterly_priorities') || [];
    var existing = allQP.find(function(qp){ return qp.memberUsername===uname&&qp.quarter===q&&String(qp.year)===String(y); });
    var banner = document.getElementById('qpAExistBanner');
    if (existing) {
        banner.innerHTML = '<div style="background:#fff3e0;border:1px solid #ff9800;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;">'
            +'⚠️ <strong>'+fname+'</strong> already has '+( existing.items||[]).length+' priorities for '+q+' '+y+'. Saving will replace them.</div>';
        var list = document.getElementById('qpAItemsList');
        if (list) list.innerHTML = (existing.items||[]).map(function(it){
            return '<div class="qp-item-row">'
                +'<input type="text" class="form-control qp-item-title" value="'+it.title.replace(/"/g,'&quot;')+'">'
                +'<select class="form-control qp-item-pri">'
                +['high','medium','low'].map(function(p){ return '<option value="'+p+'"'+(p===it.priority?' selected':'')+'>'+{'high':'🔴 High','medium':'🟡 Medium','low':'🟢 Low'}[p]+'</option>'; }).join('')
                +'</select>'
                +'<button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button>'
                +'</div>';
        }).join('') + _qpBlankItemRow(true);
    } else {
        banner.innerHTML = '';
    }
    // History
    var hist = allQP.filter(function(qp){ return qp.memberUsername===uname; });
    var histEl = document.getElementById('qpAMemberHistory');
    if (histEl && hist.length>0) {
        histEl.innerHTML = '<div class="card" style="padding:16px;">'
            +'<div style="font-size:13px;font-weight:700;margin-bottom:10px;">📋 '+fname+'\'s Priority History</div>'
            +hist.map(function(qp){
                var s = _qpStats(qp.items||[]);
                return '<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--light-gray);border-radius:8px;margin-bottom:6px;">'
                    +'<span style="font-weight:700;color:#e65100;min-width:60px;">'+qp.quarter+' '+qp.year+'</span>'
                    +_qpBar(s.pct)
                    +'<span style="font-size:11px;color:var(--gray);white-space:nowrap;">'+s.done+'/'+s.total+'</span>'
                    +'<button class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px;" onclick="qpDeleteSet(\''+qp.id+'\',\'admin\')">✕</button>'
                    +'</div>';
            }).join('')+'</div>';
    } else if (histEl) { histEl.innerHTML=''; }
}

function qpAdminSave() {
    var sel = document.getElementById('qpAMember');
    if (!sel||!sel.value) { APP.notify('Select a team member','error'); return; }
    var parts = sel.value.split('|'); var uname=parts[0],fname=parts[1],dept=parts[2];
    var q = document.getElementById('qpAQ').value;
    var y = parseInt(document.getElementById('qpAY').value);
    var items = _qpCollectItems('qpAItemsList');
    if (!items.length) { APP.notify('Add at least one priority item','error'); return; }
    var user = AUTH.currentUser();
    _qpSaveSet(uname,fname,dept,q,y,items,user);
    APP.notify('Priorities saved for '+fname+' — '+q+' '+y,'success');
    qpAdminMemberChanged();
    _qpAdminRender('progress');
    qpAdminSwitch('progress', document.querySelector('.qp-tab-btn[data-tab="progress"]'));
}

function _qpAdminProgress(el) {
    var allQP = DB.get('quarterly_priorities') || [];
    if (!allQP.length) { el.innerHTML='<div class="card"><div class="empty-state">No quarterly priorities created yet.</div></div>'; return; }
    var year = new Date().getFullYear();
    var quarters = [];
    var seen = {};
    allQP.forEach(function(qp){ var k=qp.quarter+'-'+qp.year; if(!seen[k]){ seen[k]=true; quarters.push(k); } });
    quarters.sort().reverse();
    var curQ = _qpCurQ()+'-'+year;

    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;">'
        +'<label style="font-size:13px;font-weight:600;">Filter Quarter:</label>'
        +'<select id="qpAProgQ" class="form-control" style="max-width:160px;" onchange="qpAdminProgressRedraw()">'
        +'<option value="all">All Quarters</option>'
        +quarters.map(function(q){ return '<option value="'+q+'"'+(q===curQ?' selected':'')+'>'+q+'</option>'; }).join('')
        +'</select></div>'
        +'<div id="qpAProgBody"></div>';
    qpAdminProgressRedraw();
}

function qpAdminProgressRedraw() {
    var filterQ = (document.getElementById('qpAProgQ')||{}).value || 'all';
    var allQP = DB.get('quarterly_priorities') || [];
    var filtered = filterQ==='all' ? allQP : allQP.filter(function(qp){ return qp.quarter+'-'+qp.year===filterQ; });
    var body = document.getElementById('qpAProgBody');
    if (!body) return;
    if (!filtered.length) { body.innerHTML='<div class="card"><div class="empty-state">No data for selected quarter.</div></div>'; return; }
    body.innerHTML = filtered.map(function(qp){ return _qpMemberCard(qp, true); }).join('');
}

function _qpMemberCard(qp, adminMode) {
    var items = qp.items || [];
    var s = _qpStats(items);
    var canEdit = adminMode;
    return '<div class="qp-card" style="border-left:3px solid '+_qpColor(s.pct)+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
        +'<div><div style="font-size:14px;font-weight:700;">'+qp.memberName+'</div>'
        +'<div style="font-size:11px;color:var(--gray);">'+qp.department+' &nbsp;·&nbsp; '+qp.quarter+' '+qp.year
        +(qp.createdByName?' &nbsp;·&nbsp; Set by: '+qp.createdByName:'')+'</div></div>'
        +(canEdit?'<button class="btn btn-sm btn-danger" onclick="qpDeleteSet(\''+qp.id+'\',\'admin\')">Delete</button>':'')
        +'</div>'
        +_qpBar(s.pct)
        +'<div style="font-size:11px;color:var(--gray);margin:4px 0 10px;">'+s.done+'/'+s.total+' items completed</div>'
        +items.map(function(it){
            return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--light-gray);">'
                +'<span>'+( it.status==='completed'?'✅':'⭕')+'</span>'
                +'<span style="flex:1;font-size:13px;'+(it.status==='completed'?'text-decoration:line-through;color:var(--gray)':'')+'">'+it.title+'</span>'
                +_qpPriBadge(it.priority||'medium')
                +(it.note?'<span style="font-size:10px;color:var(--gray);font-style:italic;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+it.note+'</span>':'')
                +'</div>';
        }).join('')
        +'</div>';
}

/* ═══ SHARED SAVE/DELETE ═════════════════════════════════════ */
function _qpSaveSet(uname, fname, dept, q, y, items, user) {
    var allQP = DB.get('quarterly_priorities') || [];
    allQP = allQP.filter(function(qp){ return !(qp.memberUsername===uname&&qp.quarter===q&&qp.year===y); });
    allQP.push({
        id: Date.now().toString(36)+Math.random().toString(36).substr(2,6),
        quarter:q, year:y,
        memberUsername:uname, memberName:fname, department:dept,
        createdBy:user.username, createdByName:user.fullName, createdByRole:user.role,
        createdAt:new Date().toISOString(), items:items
    });
    DB.set('quarterly_priorities', allQP);
}

function _qpCollectItems(listId) {
    var list = document.getElementById(listId);
    if (!list) return [];
    var items = [];
    list.querySelectorAll('.qp-item-row').forEach(function(row) {
        var titleEl = row.querySelector('.qp-item-title');
        var priEl   = row.querySelector('.qp-item-pri');
        var title   = titleEl ? titleEl.value.trim() : '';
        if (title) items.push({
            id: Date.now().toString(36)+Math.random().toString(36).substr(2,5),
            title:title, priority: priEl?priEl.value:'medium',
            status:'pending', completedAt:null, note:''
        });
    });
    return items;
}

function qpDeleteSet(id, ctx) {
    if (!confirm('Delete this priority set? This cannot be undone.')) return;
    var allQP = DB.get('quarterly_priorities') || [];
    DB.set('quarterly_priorities', allQP.filter(function(qp){ return qp.id!==id; }));
    APP.notify('Priority set deleted','info');
    if (ctx==='admin') { _qpAdminRender(_qpAdminTab); qpAdminMemberChanged && qpAdminMemberChanged(); }
    else if (ctx==='emp') {
        var u = AUTH.currentUser();
        renderEmpQP(document.getElementById('empTabContent'), u.username, u.fullName);
        empQPSubSwitch('own', u.username, u.fullName);
    }
    else { renderHodQP(document.getElementById('hodQPContent'), _hodData.dept); hodQPSubSwitch(_hodQPSubTab); }
}

/* ═══ HOD VIEW (called from hod-dashboard.js tab) ════════════
   Two sections:
   1. My Priorities  — HOD sets goals for their own work
   2. Team Priorities — HOD sets individual goals for each team member
══════════════════════════════════════════════════════════════ */
var _hodQPSubTab = 'mine';

function renderHodQP(el, dept) {
    if (!el) return;
    var user = AUTH.currentUser();
    var year = new Date().getFullYear();
    var curQ = _qpCurQ();
    var allQP = DB.get('quarterly_priorities') || [];

    // HOD's own QP (self-created)
    var ownQP = allQP.filter(function(qp){ return qp.memberUsername === user.username && qp.selfOwn; });
    // Team QPs (HOD → members, not self)
    var teamQP = allQP.filter(function(qp){ return qp.department === dept && !qp.selfOwn; });
    var teamMembers = new Set(teamQP.map(function(qp){ return qp.memberUsername; }));

    var ownItems=0,ownDone=0; ownQP.forEach(function(qp){ var s=_qpStats(qp.items||[]); ownItems+=s.total; ownDone+=s.done; });
    var teamItems=0,teamDone=0; teamQP.forEach(function(qp){ var s=_qpStats(qp.items||[]); teamItems+=s.total; teamDone+=s.done; });

    el.innerHTML =
        // KPI strip
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">'
        +_qpKpi(ownItems,'My Total Items','#6a1b9a','👔')
        +_qpKpi(ownDone,'My Done','#34a853','✅')
        +_qpKpi(teamQP.length,'Team Sets','#e65100','🎯')
        +_qpKpi(teamMembers.size,'Members Covered','#1a73e8','👥')
        +'</div>'

        // Sub-tab bar
        +'<div style="display:flex;gap:0;border-bottom:2px solid var(--light-gray);margin-bottom:16px;">'
        +'<button class="hod-tab-btn'+(  _hodQPSubTab==='mine'?' active':'')+'" onclick="hodQPSubSwitch(\'mine\')"  style="border-bottom-color:'+(  _hodQPSubTab==='mine'?'#6a1b9a':'transparent')+'">👔 My Own Priorities</button>'
        +'<button class="hod-tab-btn'+(_hodQPSubTab==='team'?' active':'')+'" onclick="hodQPSubSwitch(\'team\')" style="border-bottom-color:'+(_hodQPSubTab==='team'?'#e65100':'transparent')+'">👥 Team Member Priorities</button>'
        +'</div>'
        +'<div id="hodQPSubContent"></div>'
        +'<div id="hodQPFormArea"></div>';

    hodQPSubRender(_hodQPSubTab);
}

function hodQPSubSwitch(tab) {
    _hodQPSubTab = tab;
    document.querySelectorAll('#hodQPContent .hod-tab-btn').forEach(function(b){
        var active = b.textContent.includes(tab === 'mine' ? 'Own' : 'Team');
        b.classList.toggle('active', active);
        b.style.borderBottomColor = active ? (tab==='mine'?'#6a1b9a':'#e65100') : 'transparent';
    });
    document.getElementById('hodQPFormArea').innerHTML = '';
    hodQPSubRender(tab);
}

function hodQPSubRender(tab) {
    var el = document.getElementById('hodQPSubContent');
    if (!el) return;
    if (tab === 'mine') hodQPRenderOwn(el);
    else hodQPRenderTeam(el);
}

/* ── MY OWN PRIORITIES (HOD self) ── */
function hodQPRenderOwn(el) {
    var user  = AUTH.currentUser();
    var year  = new Date().getFullYear();
    var curQ  = _qpCurQ();
    var allQP = DB.get('quarterly_priorities') || [];
    var mine  = allQP.filter(function(qp){ return qp.memberUsername === user.username && qp.selfOwn; });
    var quarters = []; var seen = {};
    mine.forEach(function(qp){ var k=qp.quarter+'-'+qp.year; if(!seen[k]){seen[k]=true;quarters.push(k);} });
    quarters.sort().reverse();
    var curKey = curQ+'-'+year;

    el.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        +'<div style="font-size:14px;font-weight:700;color:#6a1b9a;">👔 My Quarterly Priorities</div>'
        +'<button class="btn btn-sm" style="background:#6a1b9a;color:#fff;" onclick="hodQPShowOwnForm()">+ Add My Priorities</button></div>'
        +(quarters.length > 0
            ? '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
              +'<label style="font-size:13px;font-weight:600;">Quarter:</label>'
              +'<select id="hodQPOwnFilter" class="form-control" style="max-width:160px;" onchange="hodQPOwnRedraw()">'
              +quarters.map(function(q){ return '<option value="'+q+'"'+(q===curKey?' selected':'')+'>'+q+'</option>'; }).join('')
              +'</select></div>'
            : '')
        +'<div id="hodQPOwnCards">'
        +(mine.length===0
            ? '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;">'
              +'<div style="font-size:28px;margin-bottom:6px;">👔</div>'
              +'<div style="font-weight:600;margin-bottom:4px;">Set your own quarterly priorities</div>'
              +'<div style="font-size:12px;color:var(--gray);">Track your personal work goals for each quarter</div>'
              +'</div>'
            : '')
        +'</div>';

    if (mine.length > 0) hodQPOwnRedraw();
}

function hodQPOwnRedraw() {
    var user  = AUTH.currentUser();
    var filterQ = (document.getElementById('hodQPOwnFilter')||{}).value;
    var allQP = DB.get('quarterly_priorities') || [];
    var mine  = allQP.filter(function(qp){ return qp.memberUsername===user.username && qp.selfOwn; });
    var qp = filterQ ? mine.find(function(q){ return q.quarter+'-'+q.year===filterQ; }) : mine[0];
    var cards = document.getElementById('hodQPOwnCards');
    if (!cards) return;
    if (!qp) { cards.innerHTML='<div class="card"><div class="empty-state">No priorities for this quarter.</div></div>'; return; }
    var items = qp.items||[];
    var s = _qpStats(items);
    cards.innerHTML = '<div class="card" style="padding:16px;border-left:3px solid #6a1b9a;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        +'<div style="font-size:14px;font-weight:700;">'+qp.quarter+' '+qp.year+' — My Goals</div>'
        +'<div style="display:flex;gap:6px;">'
        +'<span style="font-size:16px;font-weight:700;color:'+_qpColor(s.pct)+';">'+s.pct+'%</span>'
        +'<button class="btn btn-sm btn-outline" onclick="hodQPEditOwn(\''+qp.id+'\')">Edit</button>'
        +'<button class="btn btn-sm btn-danger" style="padding:2px 8px;" onclick="qpDeleteSet(\''+qp.id+'\',\'hod\')">✕</button>'
        +'</div></div>'
        +_qpBar(s.pct)
        +'<div style="margin-top:12px;">'
        +items.map(function(it, idx){
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--light-gray);">'
                +'<input type="checkbox" style="width:16px;height:16px;cursor:pointer;"'+(it.status==='completed'?' checked':'')
                +' onchange="hodQPOwnToggle(\''+qp.id+'\','+idx+',this.checked)">'
                +'<span style="flex:1;font-size:13px;'+(it.status==='completed'?'text-decoration:line-through;color:var(--gray)':'')+'">'+it.title+'</span>'
                +_qpPriBadge(it.priority||'medium')
                +(it.status==='completed'&&it.completedAt?'<span style="font-size:10px;color:var(--success);">'+APP.formatDate(it.completedAt)+'</span>':'')
                +'</div>';
        }).join('')
        +'</div></div>';
}

function hodQPOwnToggle(qpId, idx, checked) {
    var allQP = DB.get('quarterly_priorities') || [];
    var qp = allQP.find(function(q){ return q.id===qpId; });
    if (!qp) return;
    qp.items[idx].status = checked ? 'completed' : 'pending';
    qp.items[idx].completedAt = checked ? new Date().toISOString() : null;
    DB.set('quarterly_priorities', allQP);
    APP.notify(checked ? '✅ Done!' : 'Marked pending', checked?'success':'info');
    hodQPOwnRedraw();
}

function hodQPShowOwnForm(existingId) {
    var user = AUTH.currentUser();
    var year = new Date().getFullYear();
    var allQP = DB.get('quarterly_priorities') || [];
    var existing = existingId ? allQP.find(function(q){ return q.id===existingId; }) : null;
    var formArea = document.getElementById('hodQPFormArea');
    if (!formArea) return;
    formArea.innerHTML = '<div class="card" style="padding:18px;border-top:3px solid #6a1b9a;margin-top:12px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        +'<div style="font-size:14px;font-weight:700;">👔 '+(existing?'Edit':'Set')+' My Quarterly Priorities</div>'
        +'<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'hodQPFormArea\').innerHTML=\'\'">Close</button></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">'
        +'<div class="form-group"><label>Quarter *</label><select id="hodQPOwnQ" class="form-control">'
        +['Q1','Q2','Q3','Q4'].map(function(q){ return '<option value="'+q+'"'+(q===(existing?existing.quarter:_qpCurQ())?' selected':'')+'>'+q+'</option>'; }).join('')
        +'</select></div>'
        +'<div class="form-group"><label>Year *</label><select id="hodQPOwnY" class="form-control">'
        +[year-1,year,year+1].map(function(y){ return '<option value="'+y+'"'+(y===(existing?existing.year:year)?' selected':'')+'>'+y+'</option>'; }).join('')
        +'</select></div></div>'
        +'<div style="font-size:13px;font-weight:600;margin-bottom:8px;">My Priority Items</div>'
        +'<div id="hodQPOwnItemsList">'
        +(existing ? (existing.items||[]).map(function(it){
            return '<div class="qp-item-row">'
                +'<input type="text" class="form-control qp-item-title" value="'+it.title.replace(/"/g,'&quot;')+'">'
                +'<select class="form-control qp-item-pri">'+['high','medium','low'].map(function(p){ return '<option value="'+p+'"'+(p===it.priority?' selected':'')+'>'+{'high':'🔴 High','medium':'🟡 Medium','low':'🟢 Low'}[p]+'</option>'; }).join('')+'</select>'
                +'<button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button>'
                +'</div>';
        }).join('') : '')
        +_qpBlankItemRow(true)
        +'</div>'
        +'<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">'
        +'<button class="btn btn-primary" style="background:#6a1b9a;border-color:#6a1b9a;" onclick="hodQPSaveOwn('+(existing?'\''+existing.id+'\'':'null')+')">💾 Save My Priorities</button>'
        +'<button class="btn btn-outline" onclick="hodQPOwnAddItem()">+ Item</button>'
        +'</div></div>';
}

function hodQPEditOwn(id) { hodQPShowOwnForm(id); }

function hodQPOwnAddItem() {
    var list = document.getElementById('hodQPOwnItemsList');
    if (!list) return;
    var div = document.createElement('div');
    div.innerHTML = '<div class="qp-item-row"><input type="text" class="form-control qp-item-title" placeholder="Priority item"><select class="form-control qp-item-pri"><option value="high">🔴 High</option><option value="medium" selected>🟡 Medium</option><option value="low">🟢 Low</option></select><button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button></div>';
    list.appendChild(div.firstChild);
}

function hodQPSaveOwn(existingId) {
    var user  = AUTH.currentUser();
    var q     = document.getElementById('hodQPOwnQ').value;
    var y     = parseInt(document.getElementById('hodQPOwnY').value);
    var items = _qpCollectItems('hodQPOwnItemsList');
    if (!items.length) { APP.notify('Add at least one priority item','error'); return; }
    // Preserve status of existing items when editing
    if (existingId) {
        var oldQP = (DB.get('quarterly_priorities')||[]).find(function(qp){ return qp.id===existingId; });
        if (oldQP) {
            items = items.map(function(it){
                var prev = (oldQP.items||[]).find(function(o){ return o.title===it.title; });
                return prev ? Object.assign({},it,{status:prev.status,completedAt:prev.completedAt}) : it;
            });
        }
    }
    var allQP = DB.get('quarterly_priorities') || [];
    if (existingId) allQP = allQP.filter(function(qp){ return qp.id!==existingId; });
    else allQP = allQP.filter(function(qp){ return !(qp.memberUsername===user.username&&qp.quarter===q&&qp.year===y&&qp.selfOwn); });
    allQP.push({
        id: existingId || Date.now().toString(36)+Math.random().toString(36).substr(2,6),
        quarter:q, year:y, selfOwn:true,
        memberUsername:user.username, memberName:user.fullName, department:user.department,
        createdBy:user.username, createdByName:user.fullName, createdByRole:user.role,
        createdAt:new Date().toISOString(), items:items
    });
    DB.set('quarterly_priorities', allQP);
    APP.notify('Your priorities saved — '+q+' '+y,'success');
    document.getElementById('hodQPFormArea').innerHTML='';
    renderHodQP(document.getElementById('hodQPContent'), _hodData.dept);
    hodQPSubSwitch('mine');
}

/* ── TEAM MEMBER PRIORITIES (HOD → members) ── */
function hodQPRenderTeam(el) {
    var dept  = _hodData.dept;
    var year  = new Date().getFullYear();
    var curQ  = _qpCurQ();
    var allQP = DB.get('quarterly_priorities') || [];
    var teamQP = allQP.filter(function(qp){ return qp.department===dept && !qp.selfOwn; });
    var quarters = []; var seen = {};
    teamQP.forEach(function(qp){ var k=qp.quarter+'-'+qp.year; if(!seen[k]){seen[k]=true;quarters.push(k);} });
    quarters.sort().reverse();
    var selQ = curQ+'-'+year;

    el.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        +'<div style="font-size:14px;font-weight:700;color:#e65100;">👥 Team Member Priorities</div>'
        +'<button class="btn btn-sm btn-primary" onclick="hodQPShowTeamForm()">+ Set for a Member</button></div>'
        +(quarters.length > 0
            ? '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
              +'<label style="font-size:13px;font-weight:600;">Quarter:</label>'
              +'<select id="hodQPTeamFilter" class="form-control" style="max-width:160px;" onchange="hodQPTeamRedraw(\''+dept+'\')">'
              +'<option value="all">All</option>'
              +quarters.map(function(q){ return '<option value="'+q+'"'+(q===selQ?' selected':'')+'>'+q+'</option>'; }).join('')
              +'</select></div>'
            : '')
        +'<div id="hodQPTeamCards">'
        +(teamQP.length===0
            ? '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;">'
              +'<div style="font-size:28px;margin-bottom:6px;">👥</div>'
              +'<div style="font-weight:600;margin-bottom:4px;">No team priorities set yet</div>'
              +'<div style="font-size:12px;color:var(--gray);">Each team member gets their own individual set of quarterly priorities</div>'
              +'</div>'
            : '')
        +'</div>';

    if (teamQP.length > 0) hodQPTeamRedraw(dept);
}

function hodQPTeamRedraw(dept) {
    var filterQ = (document.getElementById('hodQPTeamFilter')||{}).value || 'all';
    var allQP = (DB.get('quarterly_priorities')||[]).filter(function(qp){ return qp.department===dept && !qp.selfOwn; });
    var filtered = filterQ==='all' ? allQP : allQP.filter(function(qp){ return qp.quarter+'-'+qp.year===filterQ; });
    var cards = document.getElementById('hodQPTeamCards');
    if (!cards) return;
    if (!filtered.length) { cards.innerHTML='<div class="card"><div class="empty-state">No priorities for this quarter.</div></div>'; return; }
    cards.innerHTML = filtered.map(function(qp){ return _qpMemberCard(qp, false); }).join('');
}

function hodQPShowTeamForm() {
    var dept = _hodData.dept;
    var team = _getHodTeam(_hodData.user);
    var year = new Date().getFullYear();
    var formArea = document.getElementById('hodQPFormArea');
    if (!formArea) return;
    formArea.innerHTML = '<div class="card" style="padding:18px;border-top:3px solid #e65100;margin-top:12px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        +'<div style="font-size:14px;font-weight:700;">👥 Set Priorities for a Team Member</div>'
        +'<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'hodQPFormArea\').innerHTML=\'\'">Close</button></div>'

        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;">'
        +'<div class="form-group"><label>Quarter *</label><select id="hodQPQ" class="form-control">'
        +['Q1','Q2','Q3','Q4'].map(function(q){ return '<option value="'+q+'"'+(q===_qpCurQ()?' selected':'')+'>'+q+'</option>'; }).join('')
        +'</select></div>'
        +'<div class="form-group"><label>Year *</label><select id="hodQPY" class="form-control">'
        +[year-1,year,year+1].map(function(y){ return '<option value="'+y+'"'+(y===year?' selected':'')+'>'+y+'</option>'; }).join('')
        +'</select></div>'
        +'<div class="form-group"><label>Select Member *</label>'
        +(team.length===0
            ? '<div style="font-size:12px;color:var(--gray);padding:8px;">No team members. Add members first.</div>'
            : '<select id="hodQPMember" class="form-control"><option value="">-- Select Member --</option>'
              +team.map(function(m){ return '<option value="'+m.username+'|'+m.fullName+'">'+m.fullName+'</option>'; }).join('')
              +'</select>')
        +'</div></div>'
        +'<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Priority Items for this Member</div>'
        +'<div id="hodQPItemsList">'+_qpBlankItemRow(true)+'</div>'
        +'<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">'
        +'<button class="btn btn-primary" onclick="hodQPSaveTeam(\''+dept+'\')">💾 Save</button>'
        +'<button class="btn btn-outline" onclick="hodQPAddItem()">+ Item</button>'
        +'</div></div>';
}

function hodQPAddItem() {
    var list = document.getElementById('hodQPItemsList');
    if (!list) return;
    var div = document.createElement('div');
    div.innerHTML = '<div class="qp-item-row"><input type="text" class="form-control qp-item-title" placeholder="Priority item"><select class="form-control qp-item-pri"><option value="high">🔴 High</option><option value="medium" selected>🟡 Medium</option><option value="low">🟢 Low</option></select><button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button></div>';
    list.appendChild(div.firstChild);
}

function hodQPSaveTeam(dept) {
    var selM = document.getElementById('hodQPMember');
    if (!selM||!selM.value) { APP.notify('Select a team member','error'); return; }
    var parts=selM.value.split('|'); var uname=parts[0],fname=parts[1];
    var q = document.getElementById('hodQPQ').value;
    var y = parseInt(document.getElementById('hodQPY').value);
    var items = _qpCollectItems('hodQPItemsList');
    if (!items.length) { APP.notify('Add at least one priority item','error'); return; }
    var user = AUTH.currentUser();
    _qpSaveSet(uname,fname,dept,q,y,items,user);
    APP.notify('Priorities saved for '+fname+' — '+q+' '+y,'success');
    document.getElementById('hodQPFormArea').innerHTML='';
    renderHodQP(document.getElementById('hodQPContent'), dept);
    hodQPSubSwitch('team');
}

/* ═══ EMPLOYEE VIEW ══════════════════════════════════════════
   Two sub-sections:
   1. Assigned to Me  — from HOD/Admin (selfOwn is falsy)
   2. My Own Goals    — self-created (selfOwn: true)
══════════════════════════════════════════════════════════════ */
var _empQPSubTab = 'assigned';

function renderEmpQP(el, username, fullName) {
    if (!el) return;
    var allQP   = DB.get('quarterly_priorities') || [];
    var assigned = allQP.filter(function(qp){ return qp.memberUsername===username && !qp.selfOwn; });
    var ownGoals = allQP.filter(function(qp){ return qp.memberUsername===username &&  qp.selfOwn; });
    var aItems=0,aDone=0; assigned.forEach(function(qp){ var s=_qpStats(qp.items||[]); aItems+=s.total; aDone+=s.done; });
    var oItems=0,oDone=0; ownGoals.forEach(function(qp){ var s=_qpStats(qp.items||[]); oItems+=s.total; oDone+=s.done; });

    el.innerHTML =
        // KPI strip
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">'
        +_qpKpi(aItems,'Assigned Items','#1a73e8','📋')
        +_qpKpi(aDone,'Assigned Done','#34a853','✅')
        +_qpKpi(oItems,'My Goal Items','#e65100','🎯')
        +_qpKpi(oDone,'My Goals Done','#6a1b9a','⭐')
        +'</div>'
        // Sub-tab bar
        +'<div style="display:flex;gap:0;border-bottom:2px solid var(--light-gray);margin-bottom:16px;">'
        +'<button class="hod-tab-btn'+(_empQPSubTab==='assigned'?' active':'')+'" onclick="empQPSubSwitch(\'assigned\',\''+username+'\',\''+fullName+'\')" style="border-bottom-color:'+(_empQPSubTab==='assigned'?'#1a73e8':'transparent')+'">📋 Assigned to Me</button>'
        +'<button class="hod-tab-btn"+(_empQPSubTab===\'own\'?\' active\':\'\')+" onclick="empQPSubSwitch(\'own\',\''+username+'\',\''+fullName+'\')" style="border-bottom-color:"+(_empQPSubTab===\'own\'?\'#e65100\':\'transparent\')+">🎯 My Own Goals</button>'
        +'</div>'
        +'<div id="empQPSubContent"></div>'
        +'<div id="empQPOwnFormArea"></div>';

    // Fix the dynamic class by rebuilding — simpler to just set innerHTML with correct values
    var ownActive = _empQPSubTab === 'own';
    el.innerHTML =
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">'
        +_qpKpi(aItems,'Assigned Items','#1a73e8','📋')
        +_qpKpi(aDone,'Assigned Done','#34a853','✅')
        +_qpKpi(oItems,'My Goal Items','#e65100','🎯')
        +_qpKpi(oDone,'My Goals Done','#6a1b9a','⭐')
        +'</div>'
        +'<div style="display:flex;gap:0;border-bottom:2px solid var(--light-gray);margin-bottom:16px;">'
        +'<button class="hod-tab-btn'+(!ownActive?' active':'')+'" onclick="empQPSubSwitch(\'assigned\',\''+username+'\',\''+fullName+'\')" style="border-bottom-color:'+(!ownActive?'#1a73e8':'transparent')+'">📋 Assigned to Me</button>'
        +'<button class="hod-tab-btn'+(ownActive?' active':'')+'" onclick="empQPSubSwitch(\'own\',\''+username+'\',\''+fullName+'\')" style="border-bottom-color:'+(ownActive?'#e65100':'transparent')+'">🎯 My Own Goals</button>'
        +'</div>'
        +'<div id="empQPSubContent"></div>'
        +'<div id="empQPOwnFormArea"></div>';

    empQPSubRender(_empQPSubTab, username, fullName);
}

function empQPSubSwitch(tab, username, fullName) {
    _empQPSubTab = tab;
    var btns = document.querySelectorAll('#empTabContent .hod-tab-btn');
    if (btns.length >= 2) {
        btns[0].classList.toggle('active', tab==='assigned');
        btns[0].style.borderBottomColor = tab==='assigned' ? '#1a73e8' : 'transparent';
        btns[1].classList.toggle('active', tab==='own');
        btns[1].style.borderBottomColor = tab==='own' ? '#e65100' : 'transparent';
    }
    document.getElementById('empQPOwnFormArea').innerHTML = '';
    empQPSubRender(tab, username, fullName);
}

function empQPSubRender(tab, username, fullName) {
    var el = document.getElementById('empQPSubContent');
    if (!el) return;
    if (tab === 'assigned') _empQPRenderAssigned(el, username, fullName);
    else _empQPRenderOwn(el, username, fullName);
}

/* ── ASSIGNED TO ME ── */
function _empQPRenderAssigned(el, username, fullName) {
    var allQP   = DB.get('quarterly_priorities') || [];
    var assigned = allQP.filter(function(qp){ return qp.memberUsername===username && !qp.selfOwn; });
    var year  = new Date().getFullYear();
    var curQ  = _qpCurQ();
    var curKey= curQ+'-'+year;

    if (!assigned.length) {
        el.innerHTML = '<div style="background:var(--light-gray);border-radius:10px;padding:32px;text-align:center;">'
            +'<div style="font-size:32px;margin-bottom:8px;">📋</div>'
            +'<div style="font-weight:600;margin-bottom:6px;">No Assigned Priorities Yet</div>'
            +'<div style="font-size:13px;color:var(--gray);">Your HOD or Admin will assign quarterly priorities.<br>They will appear here once set.</div>'
            +'</div>';
        return;
    }

    var quarters = []; var seen = {};
    assigned.forEach(function(qp){ var k=qp.quarter+'-'+qp.year; if(!seen[k]){seen[k]=true;quarters.push(k);} });
    quarters.sort().reverse();
    var selQ = quarters.indexOf(curKey) >= 0 ? curKey : quarters[0];

    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">'
        +'<label style="font-size:13px;font-weight:600;">Quarter:</label>'
        +'<select id="empQPAssignedFilter" class="form-control" style="max-width:160px;" onchange="empQPAssignedRedraw(\''+username+'\',\''+fullName+'\')">'
        +quarters.map(function(q){ return '<option value="'+q+'"'+(q===selQ?' selected':'')+'>'+q+'</option>'; }).join('')
        +'</select></div>'
        +'<div id="empQPAssignedCards"></div>';

    empQPAssignedRedraw(username, fullName);
}

function empQPAssignedRedraw(username, fullName) {
    var filterQ = (document.getElementById('empQPAssignedFilter')||{}).value;
    var allQP   = DB.get('quarterly_priorities') || [];
    var qp = allQP.find(function(q){ return q.memberUsername===username&&!q.selfOwn&&(q.quarter+'-'+q.year)===filterQ; });
    var cards = document.getElementById('empQPAssignedCards');
    if (!cards) return;
    if (!qp) { cards.innerHTML='<div class="card"><div class="empty-state">No priorities set for this quarter.</div></div>'; return; }

    var items = qp.items || [];
    var s = _qpStats(items);

    cards.innerHTML = '<div class="card" style="padding:18px;border-left:3px solid #1a73e8;">'
        +'<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
        +'<div><div style="font-size:15px;font-weight:700;">📋 '+qp.quarter+' '+qp.year+' — Assigned Priorities</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-top:2px;">Set by: '+qp.createdByName+' on '+APP.formatDate(qp.createdAt)+'</div></div>'
        +'<div style="text-align:right;">'
        +'<div style="font-size:18px;font-weight:700;color:'+_qpColor(s.pct)+';">'+s.pct+'%</div>'
        +'<div style="font-size:11px;color:var(--gray);">'+s.done+'/'+s.total+' done</div></div></div>'
        +_qpBar(s.pct)
        +'<div style="margin-top:14px;">'
        +items.map(function(it, idx) {
            var isDone = it.status==='completed';
            return '<div style="background:var(--light-gray);border-radius:8px;padding:12px;margin-bottom:8px;">'
                +'<div style="display:flex;align-items:flex-start;gap:10px;">'
                +'<input type="checkbox" style="margin-top:3px;width:16px;height:16px;cursor:pointer;"'+(isDone?' checked':'')+' onchange="empQPToggleItem(\''+qp.id+'\','+idx+',this.checked,false)">'
                +'<div style="flex:1;">'
                +'<div style="font-size:13px;font-weight:600;'+(isDone?'text-decoration:line-through;color:var(--gray)':'')+'">'+it.title+'</div>'
                +(isDone&&it.completedAt?'<div style="font-size:11px;color:var(--success);margin-top:2px;">Completed on '+APP.formatDate(it.completedAt)+'</div>':'')
                +(it.note?'<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:3px;">Note: '+it.note+'</div>':'')
                +'</div>'
                +_qpPriBadge(it.priority||'medium')
                +(isDone?'':'<button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 8px;" onclick="empQPAddNote(\''+qp.id+'\','+idx+')">Note</button>')
                +'</div></div>';
        }).join('')
        +'</div></div>';
}

/* ── MY OWN GOALS (employee self-created) ── */
function _empQPRenderOwn(el, username, fullName) {
    var allQP   = DB.get('quarterly_priorities') || [];
    var ownGoals = allQP.filter(function(qp){ return qp.memberUsername===username && qp.selfOwn; });
    var year  = new Date().getFullYear();
    var curQ  = _qpCurQ();
    var curKey= curQ+'-'+year;
    var quarters = []; var seen = {};
    ownGoals.forEach(function(qp){ var k=qp.quarter+'-'+qp.year; if(!seen[k]){seen[k]=true;quarters.push(k);} });
    quarters.sort().reverse();
    var selQ = quarters.indexOf(curKey) >= 0 ? curKey : (quarters[0]||curKey);

    el.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">'
        +'<div style="font-size:14px;font-weight:700;color:#e65100;">🎯 My Own Quarterly Goals</div>'
        +'<button class="btn btn-sm" style="background:#e65100;color:#fff;" onclick="empQPShowOwnForm(null,\''+username+'\',\''+fullName+'\')">+ Add My Goals</button></div>'
        +(quarters.length > 0
            ? '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
              +'<label style="font-size:13px;font-weight:600;">Quarter:</label>'
              +'<select id="empQPOwnFilter" class="form-control" style="max-width:160px;" onchange="empQPOwnRedraw(\''+username+'\',\''+fullName+'\')">'
              +quarters.map(function(q){ return '<option value="'+q+'"'+(q===selQ?' selected':'')+'>'+q+'</option>'; }).join('')
              +'</select></div>'
            : '')
        +'<div id="empQPOwnCards">'
        +(ownGoals.length===0
            ? '<div style="background:var(--light-gray);border-radius:10px;padding:24px;text-align:center;">'
              +'<div style="font-size:28px;margin-bottom:6px;">🎯</div>'
              +'<div style="font-weight:600;margin-bottom:4px;">Set your own quarterly goals</div>'
              +'<div style="font-size:12px;color:var(--gray);">Track your personal work goals — independent from what your HOD assigns</div>'
              +'</div>'
            : '')
        +'</div>';

    if (ownGoals.length > 0) empQPOwnRedraw(username, fullName);
}

function empQPOwnRedraw(username, fullName) {
    var filterQ = (document.getElementById('empQPOwnFilter')||{}).value;
    var allQP   = DB.get('quarterly_priorities') || [];
    var qp = allQP.find(function(q){ return q.memberUsername===username&&q.selfOwn&&(q.quarter+'-'+q.year)===filterQ; });
    var cards = document.getElementById('empQPOwnCards');
    if (!cards) return;
    if (!qp) { cards.innerHTML='<div class="card"><div class="empty-state">No goals set for this quarter yet. Click "+ Add My Goals" above.</div></div>'; return; }

    var items = qp.items || [];
    var s = _qpStats(items);

    cards.innerHTML = '<div class="card" style="padding:18px;border-left:3px solid #e65100;">'
        +'<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;">'
        +'<div><div style="font-size:15px;font-weight:700;">🎯 '+qp.quarter+' '+qp.year+' — My Goals</div>'
        +'<div style="font-size:12px;color:var(--gray);margin-top:2px;">Self-created on '+APP.formatDate(qp.createdAt)+'</div></div>'
        +'<div style="display:flex;align-items:center;gap:8px;">'
        +'<div style="text-align:right;">'
        +'<div style="font-size:18px;font-weight:700;color:'+_qpColor(s.pct)+';">'+s.pct+'%</div>'
        +'<div style="font-size:11px;color:var(--gray);">'+s.done+'/'+s.total+' done</div></div>'
        +'<button class="btn btn-sm btn-outline" onclick="empQPShowOwnForm(\''+qp.id+'\',\''+username+'\',\''+fullName+'\')">Edit</button>'
        +'<button class="btn btn-sm btn-danger" style="padding:2px 8px;" onclick="qpDeleteSet(\''+qp.id+'\',\'emp\')">✕</button>'
        +'</div></div>'
        +_qpBar(s.pct)
        +'<div style="margin-top:14px;">'
        +items.map(function(it, idx) {
            var isDone = it.status==='completed';
            return '<div style="background:var(--light-gray);border-radius:8px;padding:12px;margin-bottom:8px;">'
                +'<div style="display:flex;align-items:flex-start;gap:10px;">'
                +'<input type="checkbox" style="margin-top:3px;width:16px;height:16px;cursor:pointer;"'+(isDone?' checked':'')+' onchange="empQPToggleItem(\''+qp.id+'\','+idx+',this.checked,true)">'
                +'<div style="flex:1;">'
                +'<div style="font-size:13px;font-weight:600;'+(isDone?'text-decoration:line-through;color:var(--gray)':'')+'">'+it.title+'</div>'
                +(isDone&&it.completedAt?'<div style="font-size:11px;color:var(--success);margin-top:2px;">Completed on '+APP.formatDate(it.completedAt)+'</div>':'')
                +(it.note?'<div style="font-size:12px;color:var(--gray);font-style:italic;margin-top:3px;">Note: '+it.note+'</div>':'')
                +'</div>'
                +_qpPriBadge(it.priority||'medium')
                +(isDone?'':'<button class="btn btn-sm btn-outline" style="font-size:11px;padding:2px 8px;" onclick="empQPAddNote(\''+qp.id+'\','+idx+')">Note</button>')
                +'</div></div>';
        }).join('')
        +'</div></div>';
}

function empQPShowOwnForm(existingId, username, fullName) {
    var user = AUTH.currentUser();
    var year = new Date().getFullYear();
    var allQP = DB.get('quarterly_priorities') || [];
    var existing = existingId ? allQP.find(function(q){ return q.id===existingId; }) : null;
    var formArea = document.getElementById('empQPOwnFormArea');
    if (!formArea) return;
    formArea.innerHTML = '<div class="card" style="padding:18px;border-top:3px solid #e65100;margin-top:12px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        +'<div style="font-size:14px;font-weight:700;">🎯 '+(existing?'Edit':'Set')+' My Own Goals</div>'
        +'<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'empQPOwnFormArea\').innerHTML=\'\'">Close</button></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">'
        +'<div class="form-group"><label>Quarter *</label><select id="empQPOwnFQ" class="form-control">'
        +['Q1','Q2','Q3','Q4'].map(function(q){ return '<option value="'+q+'"'+(q===(existing?existing.quarter:_qpCurQ())?' selected':'')+'>'+q+'</option>'; }).join('')
        +'</select></div>'
        +'<div class="form-group"><label>Year *</label><select id="empQPOwnFY" class="form-control">'
        +[year-1,year,year+1].map(function(y){ return '<option value="'+y+'"'+(y===(existing?existing.year:year)?' selected':'')+'>'+y+'</option>'; }).join('')
        +'</select></div></div>'
        +'<div style="font-size:13px;font-weight:600;margin-bottom:8px;">My Goal Items</div>'
        +'<div id="empQPOwnFItems">'
        +(existing ? (existing.items||[]).map(function(it){
            return '<div class="qp-item-row"><input type="text" class="form-control qp-item-title" value="'+it.title.replace(/"/g,'&quot;')+'"><select class="form-control qp-item-pri">'+['high','medium','low'].map(function(p){ return '<option value="'+p+'"'+(p===it.priority?' selected':'')+'>'+{'high':'🔴 High','medium':'🟡 Medium','low':'🟢 Low'}[p]+'</option>'; }).join('')+'</select><button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button></div>';
        }).join('') : '')
        +_qpBlankItemRow(true)
        +'</div>'
        +'<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">'
        +'<button class="btn btn-primary" style="background:#e65100;border-color:#e65100;" onclick="empQPSaveOwn('+(existing?'\''+existingId+'\'':'null')+',\''+username+'\',\''+fullName+'\')">💾 Save My Goals</button>'
        +'<button class="btn btn-outline" onclick="empQPOwnFAddItem()">+ Item</button>'
        +'</div></div>';
}

function empQPOwnFAddItem() {
    var list = document.getElementById('empQPOwnFItems');
    if (!list) return;
    var div = document.createElement('div');
    div.innerHTML = '<div class="qp-item-row"><input type="text" class="form-control qp-item-title" placeholder="Goal item"><select class="form-control qp-item-pri"><option value="high">🔴 High</option><option value="medium" selected>🟡 Medium</option><option value="low">🟢 Low</option></select><button class="btn btn-sm btn-danger" style="padding:0 6px;height:32px;" onclick="this.closest(\'.qp-item-row\').remove()">✕</button></div>';
    list.appendChild(div.firstChild);
}

function empQPSaveOwn(existingId, username, fullName) {
    var user  = AUTH.currentUser();
    var q     = document.getElementById('empQPOwnFQ').value;
    var y     = parseInt(document.getElementById('empQPOwnFY').value);
    var items = _qpCollectItems('empQPOwnFItems');
    if (!items.length) { APP.notify('Add at least one goal item','error'); return; }
    if (existingId) {
        var oldQP = (DB.get('quarterly_priorities')||[]).find(function(qp){ return qp.id===existingId; });
        if (oldQP) {
            items = items.map(function(it){
                var prev = (oldQP.items||[]).find(function(o){ return o.title===it.title; });
                return prev ? Object.assign({},it,{status:prev.status,completedAt:prev.completedAt,note:prev.note}) : it;
            });
        }
    }
    var allQP = DB.get('quarterly_priorities') || [];
    if (existingId) allQP = allQP.filter(function(qp){ return qp.id!==existingId; });
    else allQP = allQP.filter(function(qp){ return !(qp.memberUsername===username&&qp.selfOwn&&qp.quarter===q&&qp.year===y); });
    allQP.push({
        id: existingId || Date.now().toString(36)+Math.random().toString(36).substr(2,6),
        quarter:q, year:y, selfOwn:true,
        memberUsername:username, memberName:fullName, department:user.department,
        createdBy:username, createdByName:fullName, createdByRole:user.role,
        createdAt:new Date().toISOString(), items:items
    });
    DB.set('quarterly_priorities', allQP);
    APP.notify('Your goals saved — '+q+' '+y,'success');
    document.getElementById('empQPOwnFormArea').innerHTML='';
    renderEmpQP(document.getElementById('empTabContent'), username, fullName);
    empQPSubSwitch('own', username, fullName);
}

function empQPToggleItem(qpId, idx, checked, isOwn) {
    var allQP = DB.get('quarterly_priorities') || [];
    var qp = allQP.find(function(q){ return q.id===qpId; });
    if (!qp) return;
    qp.items[idx].status = checked ? 'completed' : 'pending';
    qp.items[idx].completedAt = checked ? new Date().toISOString() : null;
    DB.set('quarterly_priorities', allQP);
    APP.notify(checked ? '✅ Marked complete!' : 'Marked pending', checked?'success':'info');
    if (isOwn) empQPOwnRedraw(qp.memberUsername, qp.memberName);
    else empQPAssignedRedraw(qp.memberUsername, qp.memberName);
}

function empQPRedraw(username, fullName) {
    if (_empQPSubTab === 'own') empQPOwnRedraw(username, fullName);
    else empQPAssignedRedraw(username, fullName);
}

function empQPAddNote(qpId, idx) {
    var note = prompt('Add a completion note (optional):');
    if (note === null) return;
    var allQP = DB.get('quarterly_priorities') || [];
    var qp = allQP.find(function(q){ return q.id===qpId; });
    if (!qp) return;
    qp.items[idx].note = note;
    DB.set('quarterly_priorities', allQP);
    APP.notify('Note saved','success');
    if (qp.selfOwn) empQPOwnRedraw(qp.memberUsername, qp.memberName);
    else empQPAssignedRedraw(qp.memberUsername, qp.memberName);
}
