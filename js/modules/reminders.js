// HMS Reminders — in-app banners + browser push notifications
// Handles: weekly/monthly checklist reminders for employees;
//          own-work reminders (tasks + checklists) for HODs.

var _HMS_REM_TIMER = null;

var HMS_REM = {

    /* ── localStorage helpers ── */
    _key: 'hms_rem',

    _today: function () {
        return new Date().toISOString().split('T')[0];
    },

    _isDismissed: function (key) {
        try {
            var d = JSON.parse(localStorage.getItem(this._key) || '{}');
            return d[key] === this._today();
        } catch (e) { return false; }
    },

    dismiss: function (key) {
        try {
            var d = JSON.parse(localStorage.getItem(this._key) || '{}');
            d[key] = this._today();
            // Prune entries older than 8 days
            var cutoff = new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0];
            Object.keys(d).forEach(function (k) { if (d[k] < cutoff) delete d[k]; });
            localStorage.setItem(this._key, JSON.stringify(d));
        } catch (e) {}
        var el = document.getElementById('hmsr_' + key);
        if (el) el.style.display = 'none';
    },

    /* ── Period helpers ── */
    _weekKey: function () {
        var now = new Date();
        var dow = now.getDay();
        var mon = new Date(now);
        mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        var wy = mon.getFullYear();
        var wk = Math.ceil((((mon - new Date(wy, 0, 1)) / 86400000) + new Date(wy, 0, 1).getDay() + 1) / 7);
        return wy + '-W' + ('0' + wk).slice(-2);
    },

    _monthKey: function () {
        var now = new Date();
        return now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
    },

    _daysUntilReset: function (freq) {
        var now = new Date();
        var reset;
        var t5 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);
        if (now >= t5) t5.setDate(t5.getDate() + 1);
        if (freq === 'weekly') {
            var dow = now.getDay();
            var dm = dow === 0 ? 1 : 8 - dow;
            reset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dm, 5, 0, 0);
        } else if (freq === 'monthly') {
            reset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 5, 0, 0);
        } else {
            reset = t5;
        }
        return Math.max(1, Math.ceil((reset - now) / 86400000));
    },

    /* ── Banner builder ── */
    _banner: function (key, icon, title, body, urgency, actions) {
        if (this._isDismissed(key)) return '';
        var s = urgency === 'high'
            ? { bg: '#fff3cd', border: '#ffc107', text: '#7d5300' }
            : urgency === 'medium'
            ? { bg: '#fff8e1', border: '#ffb74d', text: '#6d4c41' }
            : { bg: '#e8f0fe', border: '#90caf9', text: '#1a237e' };
        return '<div id="hmsr_' + key + '" style="background:' + s.bg + ';border:1.5px solid ' + s.border + ';border-radius:10px;padding:11px 14px;margin-bottom:10px;display:flex;align-items:flex-start;gap:10px;">'
            + '<span style="font-size:20px;flex-shrink:0;margin-top:1px;">' + icon + '</span>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-weight:700;font-size:13px;color:' + s.text + ';">' + title + '</div>'
            + '<div style="font-size:12px;color:' + s.text + ';margin-top:3px;line-height:1.5;">' + body + '</div>'
            + (actions ? '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">' + actions + '</div>' : '')
            + '</div>'
            + '<button onclick="HMS_REM.dismiss(\'' + key + '\')" title="' + T('remmod_dismiss_title') + '" '
            + 'style="border:none;background:rgba(0,0,0,.07);border-radius:4px;cursor:pointer;font-size:12px;padding:2px 7px;color:' + s.text + ';flex-shrink:0;">✕</button>'
            + '</div>';
    },

    /* ══════════════════════════════════════════
       EMPLOYEE REMINDERS
    ══════════════════════════════════════════ */
    checkEmployee: function (user, checklists, tasks) {
        var html = '';
        var self = this;
        var now  = new Date();
        var today = self._today();

        // 1. Browser notification permission nag (show once per session)
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            html += self._banner('notif_perm', '🔔',
                T('remmod_notif_title'),
                T('remmod_notif_body_emp'),
                'low',
                '<button class="btn btn-sm btn-primary" onclick="HMS_REM.enableNotif()" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_enable_notifications') + '</button>'
            );
        }

        // 2. Weekly checklist reminders — show Thursday through Sunday
        var dow = now.getDay(); // 0=Sun
        checklists.forEach(function (cl) {
            if (cl.frequency !== 'weekly') return;
            if (cl.periodSubmitted) return;
            var daysLeft = self._daysUntilReset('weekly');
            if (daysLeft > 4) return; // too early (Mon/Tue/Wed)
            var done  = (cl.items || []).filter(function (i) { return i.status && i.status !== 'pending'; }).length;
            var total = (cl.items || []).length;
            var key   = 'emp_wcl_' + cl.id + '_' + self._weekKey();
            var urg   = daysLeft <= 1 ? 'high' : daysLeft <= 2 ? 'medium' : 'low';
            var when  = daysLeft <= 1 ? T('remmod_reset_tomorrow_5am') : T('remmod_resets_in_prefix') + daysLeft + T('remmod_days_suffix');
            html += self._banner(key, '📅',
                T('remmod_weekly_checklist_prefix') + cl.title,
                done + '/' + total + T('remmod_items_done_suffix') + when + T('remmod_submit_report_hod_suffix'),
                urg,
                '<button class="btn btn-sm btn-primary" onclick="empTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_go_to_checklists') + '</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_submit_now') + '</button>'
            );
        });

        // 3. Monthly checklist reminders — show last 5 days of month
        checklists.forEach(function (cl) {
            if (cl.frequency !== 'monthly') return;
            if (cl.periodSubmitted) return;
            var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if (now.getDate() < lastDay - 4) return;
            var daysLeft = self._daysUntilReset('monthly');
            var done  = (cl.items || []).filter(function (i) { return i.status && i.status !== 'pending'; }).length;
            var total = (cl.items || []).length;
            var key   = 'emp_mcl_' + cl.id + '_' + self._monthKey();
            var urg   = daysLeft <= 2 ? 'high' : daysLeft <= 3 ? 'medium' : 'low';
            var when  = daysLeft <= 1 ? T('remmod_reset_tomorrow') : T('remmod_resets_in_prefix') + daysLeft + T('remmod_days_month_suffix');
            html += self._banner(key, '🗓️',
                T('remmod_monthly_checklist_prefix') + cl.title,
                done + '/' + total + T('remmod_items_done_suffix') + when + T('remmod_submit_monthly_report_suffix'),
                urg,
                '<button class="btn btn-sm btn-primary" onclick="empTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_go_to_checklists') + '</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_submit_now') + '</button>'
            );
        });

        // 4. Task deadline reminder — tasks due today or tomorrow
        var urgentTasks = tasks.filter(function (t) {
            if (t.status === 'completed') return false;
            if (!t.deadline) return false;
            var d = Math.ceil((new Date(t.deadline) - now) / 86400000);
            return d >= 0 && d <= 1;
        });
        if (urgentTasks.length > 0) {
            var key2 = 'emp_tasks_' + today;
            html += self._banner(key2, '⏰',
                urgentTasks.length + T('remmod_tasks_due_soon_suffix'),
                urgentTasks.map(function (t) {
                    var d = Math.ceil((new Date(t.deadline) - now) / 86400000);
                    return '• ' + t.title + (d === 0 ? ' <strong>(' + T('remmod_today_label') + ')</strong>' : ' (' + T('remmod_tomorrow_label') + ')');
                }).join('<br>'),
                'high',
                '<button class="btn btn-sm btn-primary" onclick="empTabSwitch(\'work\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_view_my_work') + '</button>'
            );
        }

        return html;
    },

    /* ══════════════════════════════════════════
       HOD REMINDERS (own work only)
    ══════════════════════════════════════════ */
    checkHod: function (user, ownTasks, ownChecklists) {
        var html = '';
        var self = this;
        var now  = new Date();
        var today = self._today();

        // 1. Browser notification permission nag
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            html += self._banner('notif_perm_hod', '🔔',
                T('remmod_notif_title'),
                T('remmod_notif_body_hod'),
                'low',
                '<button class="btn btn-sm btn-primary" onclick="HMS_REM.enableNotif()" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_enable_notifications') + '</button>'
            );
        }

        // 2. HOD own tasks approaching deadline (0-2 days)
        var urgentTasks = ownTasks.filter(function (t) {
            if (t.status === 'completed') return false;
            if (!t.deadline) return false;
            var d = Math.ceil((new Date(t.deadline) - now) / 86400000);
            return d >= 0 && d <= 2;
        });
        if (urgentTasks.length > 0) {
            var key1 = 'hod_tasks_' + today;
            var anyToday = urgentTasks.some(function (t) { return Math.ceil((new Date(t.deadline) - now) / 86400000) === 0; });
            html += self._banner(key1, '⏰',
                urgentTasks.length + T('remmod_tasks_need_attention_suffix'),
                urgentTasks.map(function (t) {
                    var d = Math.ceil((new Date(t.deadline) - now) / 86400000);
                    return '• ' + t.title + (d === 0 ? ' <strong>(' + T('remmod_today_label') + ')</strong>' : d === 1 ? ' (' + T('remmod_tomorrow_label') + ')' : ' (' + d + T('remmod_days_paren_suffix'));
                }).join('<br>'),
                anyToday ? 'high' : 'medium',
                '<button class="btn btn-sm btn-primary" onclick="hodTabSwitch(\'tasks\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_view_tasks') + '</button>'
            );
        }

        // 3. HOD own weekly checklists — show Thu-Sun
        ownChecklists.forEach(function (cl) {
            if (cl.frequency !== 'weekly') return;
            if (cl.periodSubmitted) return;
            var daysLeft = self._daysUntilReset('weekly');
            if (daysLeft > 4) return;
            var done  = (cl.items || []).filter(function (i) { return i.status && i.status !== 'pending'; }).length;
            var total = (cl.items || []).length;
            var key   = 'hod_wcl_' + cl.id + '_' + self._weekKey();
            var urg   = daysLeft <= 1 ? 'high' : daysLeft <= 2 ? 'medium' : 'low';
            var when  = daysLeft <= 1 ? T('remmod_reset_tomorrow_5am') : T('remmod_resets_in_prefix') + daysLeft + T('remmod_days_suffix');
            html += self._banner(key, '📅',
                T('remmod_your_weekly_checklist_prefix') + cl.title,
                done + '/' + total + T('remmod_items_done_suffix') + when + '.',
                urg,
                '<button class="btn btn-sm btn-primary" onclick="hodTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_view_checklists') + '</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_submit') + '</button>'
            );
        });

        // 4. HOD own monthly checklists — show last 5 days of month
        ownChecklists.forEach(function (cl) {
            if (cl.frequency !== 'monthly') return;
            if (cl.periodSubmitted) return;
            var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            if (now.getDate() < lastDay - 4) return;
            var daysLeft = self._daysUntilReset('monthly');
            var done  = (cl.items || []).filter(function (i) { return i.status && i.status !== 'pending'; }).length;
            var total = (cl.items || []).length;
            var key   = 'hod_mcl_' + cl.id + '_' + self._monthKey();
            var urg   = daysLeft <= 2 ? 'high' : daysLeft <= 3 ? 'medium' : 'low';
            html += self._banner(key, '🗓️',
                T('remmod_your_monthly_checklist_prefix') + cl.title,
                done + '/' + total + T('remmod_items_done_suffix') + T('remmod_resets_in_prefix') + daysLeft + T('remmod_days_paren2_suffix'),
                urg,
                '<button class="btn btn-sm btn-primary" onclick="hodTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_view_checklists') + '</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">' + T('remmod_btn_submit') + '</button>'
            );
        });

        return html;
    },

    /* ══════════════════════════════════════════
       BROWSER NOTIFICATIONS
    ══════════════════════════════════════════ */
    enableNotif: function () {
        this.dismiss('notif_perm');
        this.dismiss('notif_perm_hod');
        if (typeof Notification === 'undefined') {
            APP.notify(T('remmod_msg_notif_not_supported'), 'error');
            return;
        }
        Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') {
                APP.notify(T('remmod_msg_notif_enabled'), 'success');
                try { new Notification(T('remmod_notif_enabled_title'), { body: T('remmod_notif_enabled_body') }); } catch (e) {}
            } else {
                APP.notify(T('remmod_msg_notif_denied'), 'warning');
            }
        });
    },

    push: function (title, body) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try { new Notification(T('remmod_push_title_prefix') + title, { body: body }); } catch (e) {}
        }
    },

    // Background push check — called by setInterval every 30 min
    _periodicPush: function (user) {
        var self = this;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        var now  = new Date();
        var pushed = {};
        try { pushed = JSON.parse(localStorage.getItem('hms_rem_pushed') || '{}'); } catch (e) {}
        var today = self._today();

        var checklists = DB.get('checklists') || [];
        var mine = checklists.filter(function (c) {
            return c.assignedTo === user.fullName || c.assignedTo === 'common';
        });

        mine.forEach(function (cl) {
            if (cl.periodSubmitted) return;
            var freq = cl.frequency;
            if (!freq || freq === 'daily') return;
            var daysLeft = self._daysUntilReset(freq);
            if (freq === 'weekly' && daysLeft > 4) return;
            if (freq === 'monthly') {
                var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                if (now.getDate() < lastDay - 4) return;
            }
            var pushKey = 'push_' + freq + '_' + cl.id + '_' + today;
            if (pushed[pushKey]) return;
            pushed[pushKey] = true;
            self.push(
                (freq === 'weekly' ? T('remmod_freq_weekly') : T('remmod_freq_monthly')) + T('remmod_checklist_reminder_suffix'),
                cl.title + ' — ' + daysLeft + T('remmod_days_left_suffix')
            );
        });

        try { localStorage.setItem('hms_rem_pushed', JSON.stringify(pushed)); } catch (e) {}
    },

    // Start the 30-minute background check (only once per session)
    scheduleCheck: function (user) {
        if (_HMS_REM_TIMER) return;
        var self = this;
        // Immediate check after 3 seconds (let page settle first)
        setTimeout(function () { self._periodicPush(user); }, 3000);
        // Then every 30 minutes
        _HMS_REM_TIMER = setInterval(function () { self._periodicPush(user); }, 30 * 60 * 1000);
    }
};
