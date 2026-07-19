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
            + '<button onclick="HMS_REM.dismiss(\'' + key + '\')" title="Dismiss for today" '
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
                'Enable reminders?',
                'Allow browser notifications to get reminders about weekly/monthly checklists even when this tab is in the background.',
                'low',
                '<button class="btn btn-sm btn-primary" onclick="HMS_REM.enableNotif()" style="font-size:11px;padding:3px 8px;">Enable Notifications</button>'
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
            var when  = daysLeft <= 1 ? 'Resets TOMORROW at 5 AM' : 'Resets in ' + daysLeft + ' days';
            html += self._banner(key, '📅',
                'Weekly Checklist: ' + cl.title,
                done + '/' + total + ' items done. ' + when + ' — submit your report to HOD before then.',
                urg,
                '<button class="btn btn-sm btn-primary" onclick="empTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">Go to Checklists</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">📤 Submit Now</button>'
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
            var when  = daysLeft <= 1 ? 'Resets TOMORROW' : 'Resets in ' + daysLeft + ' days (1st of next month)';
            html += self._banner(key, '🗓️',
                'Monthly Checklist: ' + cl.title,
                done + '/' + total + ' items done. ' + when + ' at 5 AM — submit your monthly report!',
                urg,
                '<button class="btn btn-sm btn-primary" onclick="empTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">Go to Checklists</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">📤 Submit Now</button>'
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
                urgentTasks.length + ' task(s) due very soon',
                urgentTasks.map(function (t) {
                    var d = Math.ceil((new Date(t.deadline) - now) / 86400000);
                    return '• ' + t.title + (d === 0 ? ' <strong>(TODAY)</strong>' : ' (tomorrow)');
                }).join('<br>'),
                'high',
                '<button class="btn btn-sm btn-primary" onclick="empTabSwitch(\'work\')" style="font-size:11px;padding:3px 8px;">View My Work</button>'
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
                'Enable reminders?',
                'Receive browser notifications for your tasks and checklist deadlines.',
                'low',
                '<button class="btn btn-sm btn-primary" onclick="HMS_REM.enableNotif()" style="font-size:11px;padding:3px 8px;">Enable Notifications</button>'
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
                urgentTasks.length + ' of your task(s) need attention',
                urgentTasks.map(function (t) {
                    var d = Math.ceil((new Date(t.deadline) - now) / 86400000);
                    return '• ' + t.title + (d === 0 ? ' <strong>(TODAY)</strong>' : d === 1 ? ' (tomorrow)' : ' (' + d + ' days)');
                }).join('<br>'),
                anyToday ? 'high' : 'medium',
                '<button class="btn btn-sm btn-primary" onclick="hodTabSwitch(\'tasks\')" style="font-size:11px;padding:3px 8px;">View Tasks</button>'
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
            var when  = daysLeft <= 1 ? 'Resets TOMORROW at 5 AM' : 'Resets in ' + daysLeft + ' days';
            html += self._banner(key, '📅',
                'Your Weekly Checklist: ' + cl.title,
                done + '/' + total + ' items done. ' + when + '.',
                urg,
                '<button class="btn btn-sm btn-primary" onclick="hodTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">View Checklists</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">📤 Submit</button>'
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
                'Your Monthly Checklist: ' + cl.title,
                done + '/' + total + ' items done. Resets in ' + daysLeft + ' day(s).',
                urg,
                '<button class="btn btn-sm btn-primary" onclick="hodTabSwitch(\'checklists\')" style="font-size:11px;padding:3px 8px;">View Checklists</button>'
                + '<button class="btn btn-sm btn-success" onclick="empSubmitClPeriod(\'' + cl.id + '\')" style="font-size:11px;padding:3px 8px;">📤 Submit</button>'
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
            APP.notify('Browser notifications not supported', 'error');
            return;
        }
        Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') {
                APP.notify('Notifications enabled! You will be reminded about checklist deadlines.', 'success');
                try { new Notification('🏥 HMS Reminders enabled', { body: 'You will receive alerts for weekly/monthly checklist deadlines.' }); } catch (e) {}
            } else {
                APP.notify('Notification permission denied. In-app banners will still show.', 'warning');
            }
        });
    },

    push: function (title, body) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try { new Notification('🏥 HMS — ' + title, { body: body }); } catch (e) {}
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
                (freq === 'weekly' ? '📅 Weekly' : '🗓️ Monthly') + ' Checklist Reminder',
                cl.title + ' — ' + daysLeft + ' day(s) left. Open HMS to submit your report!'
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
