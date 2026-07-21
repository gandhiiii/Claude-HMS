/* ══════════════════════════════════════════
   HMS i18n — Employee-facing translations
   Reports always rendered in English (en).
   Supported: en, hi (Hindi), gu (Gujarati)
══════════════════════════════════════════ */
var LANG = (function () {

    var _dict = {
        en: {
            /* Tabs */
            tab_overview:    '📊 Overview',
            tab_work:        '📝 My Work',
            tab_checklists:  '✅ Checklists',
            tab_reports:     '📋 Reports',
            tab_cleaning:    '🧹 Cleaning',
            tab_performance: '📊 Performance',
            tab_qgoals:      '🎯 Q Goals',

            /* KPI labels */
            kpi_due_today:    'Due Today',
            kpi_due_week:     'Due This Week',
            kpi_checklist:    'Checklist Rate',
            kpi_issues:       'Open Issues',
            kpi_projects:     'My Projects',

            /* Section headings */
            today_focus:      "Today's Focus',",
            todays_focus:     "Today's Focus",
            recent_tasks:     'Recent Tasks',
            quick_actions:    'Quick Actions',
            my_tasks:         'My Tasks',
            my_projects:      'My Projects',
            my_requests:      'My Material Requests',
            open_checklists:  'Open Checklists',
            tasks_due_today:  'Tasks Due Today',
            pending_requests: 'Pending Requests',
            prob_assigned:    'Problems Assigned to Me',
            qprogress:        'Work Progress',
            task_completion:  'Task Completion',

            /* Status & badges */
            status_pending:   'Pending',
            status_inprogress:'In Progress',
            status_completed: 'Completed',
            status_overdue:   'Overdue',
            status_start:     'Start',
            status_mark_done: 'Mark Done',
            status_high:      'High',
            status_med:       'Med',

            /* Buttons */
            btn_view_all:     'View All',
            btn_open:         'Open',
            btn_confirm:      'Confirm',
            btn_partial:      'Partial',
            btn_submit_report:'Submit Report',
            btn_new_request:  '+ New Request',
            btn_view_tasks:   '📝 View All My Tasks',
            btn_open_cl:      '✅ Open Checklists',
            btn_report_prob:  '🔧 Report a Problem',
            btn_mat_request:  '📦 New Material Request',
            btn_return_mat:   '↩️ Return Materials',
            btn_submit_rep:   '📋 Submit Report',
            btn_view:         'View',
            btn_start:        'Start',

            /* Task groups */
            grp_overdue:      '🔴 Overdue',
            grp_today:        '📅 Due Today',
            grp_week:         '📆 Due This Week',
            grp_later:        '📋 Later',
            grp_completed:    '✅ Completed',

            /* Messages */
            nothing_today:    "Nothing due today — you're all caught up! 🎉",
            no_tasks:         'No tasks assigned to you',
            no_tasks_yet:     'No tasks yet',
            overdue_alert:    'overdue task(s)',
            rooms_cleaning:   'room(s) need cleaning',
            tap_view:         'Tap to view tasks',
            done_lbl:         'done',
            in_progress_lbl:  'in progress',
            total_lbl:        'total',
            ready_collect:    'request(s) ready to collect — please confirm receipt!',
            from_lbl:         'From:',
            due_lbl:          'Due:',
            category_lbl:     'Category:',
            pending_lbl:      'pending',
            done_badge:       'done',
            complete_lbl:     'completed',

            /* Language selector */
            lang_label:       'Language',

            /* Material request statuses */
            mr_waiting_hod:   'Waiting HOD',
            mr_hod_approved:  'HOD Approved',
            mr_hod_rejected:  'HOD Rejected',
            mr_fac_approved:  'Facility Approved',
            mr_fac_rejected:  'Facility Rejected',
            mr_ready:         'Ready to Collect',
            mr_confirmed:     'Confirmed',
            mr_partial:       'Partial',
            mr_approved:      'Approved',
            mr_rejected:      'Rejected',
            mr_request:       'Request',
            my_mat_requests:  'My Material Requests',
            prob_start:       'Start',
            prob_view:        'View',
            prob_category:    'Category:',
            prob_note:        'Note:',
        },

        hi: {
            tab_overview:    '📊 सारांश',
            tab_work:        '📝 मेरा काम',
            tab_checklists:  '✅ जाँच सूची',
            tab_reports:     '📋 रिपोर्ट',
            tab_cleaning:    '🧹 सफाई',
            tab_performance: '📊 प्रदर्शन',
            tab_qgoals:      '🎯 त्रैमासिक लक्ष्य',

            kpi_due_today:    'आज की समय सीमा',
            kpi_due_week:     'इस सप्ताह देय',
            kpi_checklist:    'जाँच सूची दर',
            kpi_issues:       'खुली समस्याएँ',
            kpi_projects:     'मेरे प्रोजेक्ट',

            todays_focus:     'आज का लक्ष्य',
            recent_tasks:     'हाल के कार्य',
            quick_actions:    'त्वरित क्रियाएँ',
            my_tasks:         'मेरे कार्य',
            my_projects:      'मेरे प्रोजेक्ट',
            my_requests:      'मेरी सामग्री अनुरोध',
            open_checklists:  'खुली जाँच सूचियाँ',
            tasks_due_today:  'आज के देय कार्य',
            pending_requests: 'लंबित अनुरोध',
            prob_assigned:    'मुझे सौंपी गई समस्याएँ',
            qprogress:        'कार्य प्रगति',
            task_completion:  'कार्य पूर्णता',

            status_pending:   'लंबित',
            status_inprogress:'प्रगति में',
            status_completed: 'पूर्ण',
            status_overdue:   'विलंबित',
            status_start:     'शुरू करें',
            status_mark_done: 'पूर्ण करें',
            status_high:      'उच्च',
            status_med:       'मध्यम',

            btn_view_all:     'सभी देखें',
            btn_open:         'खोलें',
            btn_confirm:      'पुष्टि करें',
            btn_partial:      'आंशिक',
            btn_submit_report:'रिपोर्ट जमा करें',
            btn_new_request:  '+ नया अनुरोध',
            btn_view_tasks:   '📝 सभी कार्य देखें',
            btn_open_cl:      '✅ जाँच सूचियाँ',
            btn_report_prob:  '🔧 समस्या रिपोर्ट करें',
            btn_mat_request:  '📦 सामग्री अनुरोध',
            btn_return_mat:   '↩️ सामग्री वापस करें',
            btn_submit_rep:   '📋 रिपोर्ट जमा करें',
            btn_view:         'देखें',
            btn_start:        'शुरू',

            grp_overdue:      '🔴 विलंबित',
            grp_today:        '📅 आज देय',
            grp_week:         '📆 इस सप्ताह देय',
            grp_later:        '📋 बाद में',
            grp_completed:    '✅ पूर्ण',

            nothing_today:    'आज कुछ देय नहीं — सब कुछ पूरा हो गया! 🎉',
            no_tasks:         'आपको कोई कार्य नहीं सौंपा गया',
            no_tasks_yet:     'अभी कोई कार्य नहीं',
            overdue_alert:    'विलंबित कार्य',
            rooms_cleaning:   'कमरे(ओं) की सफाई आवश्यक है',
            tap_view:         'कार्य देखने के लिए टैप करें',
            done_lbl:         'पूर्ण',
            in_progress_lbl:  'प्रगति में',
            total_lbl:        'कुल',
            ready_collect:    'अनुरोध(ों) को एकत्र करने के लिए तैयार',
            from_lbl:         'प्रेषक:',
            due_lbl:          'देय:',
            category_lbl:     'श्रेणी:',
            pending_lbl:      'लंबित',
            done_badge:       'पूर्ण',
            complete_lbl:     'पूर्ण',

            lang_label:       'भाषा',

            mr_waiting_hod:   'HOD की प्रतीक्षा',
            mr_hod_approved:  'HOD स्वीकृत',
            mr_hod_rejected:  'HOD अस्वीकृत',
            mr_fac_approved:  'सुविधा स्वीकृत',
            mr_fac_rejected:  'सुविधा अस्वीकृत',
            mr_ready:         'लेने के लिए तैयार',
            mr_confirmed:     'पुष्टि हुई',
            mr_partial:       'आंशिक',
            mr_approved:      'स्वीकृत',
            mr_rejected:      'अस्वीकृत',
            mr_request:       'अनुरोध',
            my_mat_requests:  'मेरी सामग्री अनुरोध',
            prob_start:       'शुरू करें',
            prob_view:        'देखें',
            prob_category:    'श्रेणी:',
            prob_note:        'टिप्पणी:',
        },

        gu: {
            tab_overview:    '📊 સારાંશ',
            tab_work:        '📝 મારું કામ',
            tab_checklists:  '✅ ચેકલિસ્ટ',
            tab_reports:     '📋 અહેવાલ',
            tab_cleaning:    '🧹 સફાઈ',
            tab_performance: '📊 કામગીરી',
            tab_qgoals:      '🎯 ત્રિમાસિક લક્ષ્ય',

            kpi_due_today:    'આજે બાકી',
            kpi_due_week:     'આ સપ્તાહ બાકી',
            kpi_checklist:    'ચેકલિસ્ટ દર',
            kpi_issues:       'ખુલ્લી સમસ્યાઓ',
            kpi_projects:     'મારા પ્રોજેક્ટ',

            todays_focus:     'આજનો ધ્યેય',
            recent_tasks:     'તાજેતરના કાર્ય',
            quick_actions:    'ઝડપી ક્રિયાઓ',
            my_tasks:         'મારા કાર્ય',
            my_projects:      'મારા પ્રોજેક્ટ',
            my_requests:      'મારી સામગ્રી વિનંતી',
            open_checklists:  'ખુલ્લી ચેકલિસ્ટ',
            tasks_due_today:  'આજના બાકી કાર્ય',
            pending_requests: 'બાકી વિનંતી',
            prob_assigned:    'મને સોંપાયેલ સમસ્યાઓ',
            qprogress:        'કાર્ય પ્રગતિ',
            task_completion:  'કાર્ય પૂર્ણતા',

            status_pending:   'બાકી',
            status_inprogress:'પ્રગતિ માં',
            status_completed: 'પૂર્ણ',
            status_overdue:   'વિલંબ',
            status_start:     'શરૂ કરો',
            status_mark_done: 'પૂર્ણ કરો',
            status_high:      'ઉચ્ચ',
            status_med:       'મધ્યમ',

            btn_view_all:     'બધું જુઓ',
            btn_open:         'ખોલો',
            btn_confirm:      'પુષ્ટિ કરો',
            btn_partial:      'આંશિક',
            btn_submit_report:'અહેવાલ સબમિટ',
            btn_new_request:  '+ નવી વિનંતી',
            btn_view_tasks:   '📝 બધા કાર્ય જુઓ',
            btn_open_cl:      '✅ ચેકલિસ્ટ ખોલો',
            btn_report_prob:  '🔧 સમસ્યા નોંધો',
            btn_mat_request:  '📦 સામગ્રી વિનંતી',
            btn_return_mat:   '↩️ સામગ્રી પાછી આપો',
            btn_submit_rep:   '📋 અહેવાલ સબમિટ',
            btn_view:         'જુઓ',
            btn_start:        'શરૂ',

            grp_overdue:      '🔴 વિલંબ',
            grp_today:        '📅 આજે બાકી',
            grp_week:         '📆 આ સપ્તાહ',
            grp_later:        '📋 પાછળ',
            grp_completed:    '✅ પૂર્ણ',

            nothing_today:    'આજે કંઈ બાકી નથી — બધું પૂર્ણ! 🎉',
            no_tasks:         'તમને કોઈ કાર્ય સોંપ્યું નથી',
            no_tasks_yet:     'હજી કોઈ કાર્ય નથી',
            overdue_alert:    'વિલંબ કાર્ય',
            rooms_cleaning:   'ઓરડા(ઓ)ની સફાઈ જરૂરી',
            tap_view:         'કાર્ય જોવા ટૅપ કરો',
            done_lbl:         'પૂર્ણ',
            in_progress_lbl:  'પ્રગતિ માં',
            total_lbl:        'કુલ',
            ready_collect:    'વિનંતી(ઓ) એકત્ર કરવા તૈયાર',
            from_lbl:         'પ્રેષક:',
            due_lbl:          'બાકી:',
            category_lbl:     'શ્રેણી:',
            pending_lbl:      'બાકી',
            done_badge:       'પૂર્ણ',
            complete_lbl:     'પૂર્ણ',

            lang_label:       'ભાષા',

            mr_waiting_hod:   'HOD ની રાહ',
            mr_hod_approved:  'HOD મંજૂર',
            mr_hod_rejected:  'HOD નકાર્યું',
            mr_fac_approved:  'સુવિધા મંજૂર',
            mr_fac_rejected:  'સુવિધા નકાર્યું',
            mr_ready:         'લેવા માટે તૈયાર',
            mr_confirmed:     'પુષ્ટિ થઈ',
            mr_partial:       'આંશિક',
            mr_approved:      'મંજૂર',
            mr_rejected:      'નકાર્યું',
            mr_request:       'વિનંતી',
            my_mat_requests:  'મારી સામગ્રી વિનંતી',
            prob_start:       'શરૂ કરો',
            prob_view:        'જુઓ',
            prob_category:    'શ્રેણી:',
            prob_note:        'નોંધ:',
        }
    };

    var _supported = ['en', 'hi', 'gu'];

    function _key() {
        try {
            var u = AUTH.currentUser();
            return u ? 'hms_lang_' + u.username : 'hms_lang_guest';
        } catch(e) { return 'hms_lang_guest'; }
    }

    function getCurrent() {
        try { var l = localStorage.getItem(_key()); if (_supported.indexOf(l) !== -1) return l; } catch(e) {}
        return 'en';
    }

    function set(lang) {
        if (_supported.indexOf(lang) === -1) return;
        try { localStorage.setItem(_key(), lang); } catch(e) {}
    }

    function t(key) {
        var lang = getCurrent();
        var dict = _dict[lang] || _dict.en;
        return dict[key] !== undefined ? dict[key] : (_dict.en[key] || key);
    }

    /* Render language switcher HTML */
    function switcher() {
        var cur = getCurrent();
        var labels = { en: 'EN', hi: 'हिं', gu: 'ગુ' };
        var html = '<div style="display:flex;align-items:center;gap:6px;">';
        _supported.forEach(function(l) {
            var active = l === cur;
            html += '<button onclick="LANG.switchTo(\'' + l + '\')" style="'
                + 'padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid '
                + (active ? 'var(--primary)' : 'var(--border)')
                + ';background:' + (active ? 'var(--primary)' : 'transparent')
                + ';color:' + (active ? '#fff' : 'var(--text)')
                + ';">' + labels[l] + '</button>';
        });
        html += '</div>';
        return html;
    }

    function switchTo(lang) {
        set(lang);
        /* Refresh header (switcher itself) and whatever module is currently on screen */
        try { if (typeof Router !== 'undefined') Router.renderHeader(); } catch(e) {}
        try {
            if (typeof APP !== 'undefined' && APP.currentModule && typeof Router !== 'undefined') {
                Router.navigate(APP.currentModule);
            }
        } catch(e) {}
    }

    return { t: t, getCurrent: getCurrent, set: set, switcher: switcher, switchTo: switchTo };
})();

/* Global shorthand */
function T(key) { return LANG.t(key); }
