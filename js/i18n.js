/**
 * js/i18n.js
 * ---------------------------------------------------------------------------
 * Lightweight internationalisation layer for Stavya Intelligence.
 *
 * Design notes:
 * - Translation KEYS live in markup via `data-i18n` / `data-i18n-placeholder` /
 *   `data-i18n-html` attributes. JS-authored strings (validation errors, status
 *   messages) call I18N.t('key', {vars}) instead of hardcoding English text.
 * - Language preference is persisted to localStorage under 'hms_lang' so it
 *   survives reloads on this device. If/when this is tied to a logged-in
 *   user's profile (so it follows them across devices via the existing
 *   Firebase sync), that should live in the user record and be read into
 *   localStorage at login time — the API below (getLang/setLang) doesn't need
 *   to change for that.
 * - IMPORTANT SCOPE NOTE: messages that originate from AUTH.* / DB.* calls
 *   (js/data.js, js/firebase-config.js) are NOT translated here because their
 *   English strings are generated in those files, not this one. Translating
 *   them requires either (a) refactoring those functions to return a message
 *   *code* (e.g. 'ERR_INVALID_CREDENTIALS') that this layer maps to text, or
 *   (b) adding their literal strings to the dictionaries below once visible.
 *   Until then, those specific messages will still render in English.
 * ---------------------------------------------------------------------------
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'hms_lang';
    var DEFAULT_LANG = 'en';
    var SUPPORTED = ['en', 'hi', 'gu'];

    var translations = {
        en: {
            titleSuffix: 'Login',
            subtitle: 'Login Portal',
            hospitalLogoAlt: 'Hospital Logo',
            usernameLabel: 'Username',
            usernamePlaceholder: 'Enter username',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter password',
            signInBtn: 'Sign In',
            forgotPassword: 'Forgot Password?',
            newDeviceSetup: 'New device? Setup',

            resetTitle: 'Reset Password',
            resetSubtitle: 'Enter your username, email, or phone number.',
            resetIdentifierLabel: 'Username / Email / Phone',
            resetIdentifierPlaceholder: 'Enter username, email or phone',
            sendResetLinkBtn: 'Send Reset Link',
            backToLogin: 'Back to Login',
            resetTokenGenerated: 'Reset Token Generated',
            resetTokenPrefix: 'Token: {token}',
            newPasswordLabel: 'New Password',
            newPasswordPlaceholder: 'Enter new password',
            setNewPasswordBtn: 'Set New Password',

            deviceSetupBadge: 'DEVICE SETUP',
            setupTitle: 'Set Up This Device',
            setupSubtitleHtml: 'Enter the <strong>same username and password</strong> you use on your other device.',
            fullNameLabel: 'Full Name',
            fullNamePlaceholder: 'e.g. Hospital Administrator',
            setupUsernamePlaceholder: 'Your username',
            setupPasswordPlaceholder: 'Min 6 characters',
            confirmPasswordLabel: 'Confirm Password',
            confirmPasswordPlaceholder: 'Re-enter password',
            createSignInBtn: 'Create & Sign In',
            backToLoginArrow: '← Back to login',

            msgImportSuccess: '✅ Accounts imported! Please log in.',
            msgNoCloud: '⚠ No cloud configured. Use "New device? Setup" below.',
            msgLoadingCloud: '⏳ Loading accounts from cloud…',
            msgCloudTimeout: '⚠ Cloud timeout. Check internet or use "New device? Setup".',
            msgNoCloudAccounts: '⚠ No accounts in cloud yet. Use "New device? Setup".',
            msgAccountsLoaded: '✅ {count} account(s) loaded. Please log in.',
            msgCloudError: '⚠ Cloud error: {msg} — use "New device? Setup".',
            msgEnterCredentials: 'Please enter username and password.',
            msgLoginError: 'Login error: {msg}',

            errFullNameRequired: 'Full name is required.',
            errUsernameMin: 'Username must be at least 3 characters.',
            errPasswordMin: 'Password must be at least 6 characters.',
            errPasswordMismatch: 'Passwords do not match.',
            errSetup: 'Setup error: {msg}',
            errNoMatchingAccount: 'No matching account found for "{uname}". Double-check the username and password, or wait a moment for cloud sync to finish and try again.',

            resetErrEnterIdentifier: 'Please enter username, email or phone.',
            resetErrNoAccount: 'No account found.',
            resetPending: 'A request is already pending. Please wait for the administrator.',
            resetRequestSent: 'Request sent to administrator.',
            resetErrGeneric: 'Error: {msg}',
            resetPassMinLength: 'Password must be at least 4 characters.',
            tokenVerifiedPrompt: 'Token verified! Set your new password below.',
            tokenVerifiedSuccess: 'Token verified successfully!',

            // ── Checklist page (checklists.html) ──
            clPageTitle: 'Checklists',
            clBackToDashboard: '← Dashboard',
            clTabChecklists: 'Checklists',
            clTabAssignments: 'Assignments',
            clTabSetup: 'Setup',
            clSelectChecklist: 'Select checklist',
            clNoTemplates: 'No checklists found for your department yet.',
            clPoints: 'Points',
            clBasicBadge: 'Basic',
            clCustomBadge: 'Custom',
            clAddPointPlaceholder: 'New checklist point…',
            clAdd: 'Add',
            clRemove: 'Remove',
            clFillForUnit: 'Fill for a unit',
            clSelectUnit: 'Select unit',
            clDate: 'Date',
            clLoadChecklist: 'Open checklist',
            clRemarksPlaceholder: 'Remarks (optional)',
            clSubmit: 'Submit',
            clUnitStatusTitle: 'Unit status for selected date',
            clFilledBy: 'Filled by {name}',
            clNotFilled: 'Not filled',
            clMyAssignments: 'My assigned checklists',
            clNoAssignments: 'No checklists assigned to you.',
            clFill: 'Fill',
            clPointsCount: '{count} points',
            clCreateAssignment: 'Give checklist to employee',
            clDepartment: 'Department',
            clSelectEmployee: 'Select employee',
            clAssignmentTitlePlaceholder: 'Checklist name (e.g. Ravi — B3 round)',
            clSelectPoints: 'Select points from the basic checklists',
            clAssign: 'Assign',
            clExistingAssignments: 'Given checklists',
            clRevoke: 'Revoke',
            clRevoked: 'Revoked',
            clTodayStatus: 'Today\'s status',
            clFloors: 'Floors',
            clUnits: 'Hospital Units',
            clAddFloorPlaceholder: 'Floor name (e.g. GF)',
            clAddUnitPlaceholder: 'Unit name (e.g. ICU)',
            clRunSeeder: 'Load IT Basic Checklists (one-time)',
            clSeedDone: 'Created {created} checklists, skipped {skipped} (already present).',

            // ── Dashboard navigation (restored after i18n.js replacement) ──
            nav_dashboard: 'Dashboard',
            nav_users: 'Users',
            nav_departments: 'Departments',
            nav_feature_rights: 'Feature Rights',
            nav_inventory: 'Inventory',
            nav_gate_security: 'Gate Security',
            nav_phase2: 'Phase 2',
            nav_projects: 'Projects',
            nav_ambulance: 'Ambulance',
            nav_problems: 'Problems',
            nav_tasks: 'Tasks',
            nav_complaints: 'Complaints',
            nav_room_checklist: 'Room Checklist',
            nav_admissions: 'Admissions',
            nav_lost_found: 'Lost & Found',
            nav_admin_checklists: 'Admin Checklists',
            nav_material_requests: 'Material Requests',
            nav_suggestions: 'Suggestions',
            nav_budget: 'Budget',
            nav_quarterly: 'Quarterly',
            nav_data_history: 'Data History',
            nav_hospital_settings: 'Hospital Settings',
            nav_reports: 'Reports',
            nav_md_report: 'MD Report',
            nav_hod_dashboard: 'HOD Dashboard',
            nav_employee_dashboard: 'Employee Dashboard',
            nav_storekeeper_dashboard: 'Storekeeper Dashboard',
            nav_checklists: 'Checklists',
            nav_departmental_checklist: 'Departmental Checklist',
            nav_department_meetings: 'Department Meetings',
            nav_staff_deployment: 'Staff Deployment',
            nav_security_deployment: 'Security Deployment',
            ui_live: 'LIVE',
            ui_logout: 'Logout',

            clTitle: 'Checklists', clTabFill: 'Fill Checklist', clTabStatus: 'Status',
            clTabHistory: 'History', clTabManage: 'Manage', clTabMasters: 'Masters',
            clBackToDashboard: '\u2190 Dashboard', clChecklist: 'Checklist', clUnit: 'Unit',
            clDate: 'Date', clFloorLabel: 'Floor', clDepartment: 'Department',
            clTitleLabel: 'Title', clName: 'Name', clEmployee: 'Employee',
            clMyAssignedOnly: 'Fill only my assigned points', clRemarksPh: 'Remarks (optional)',
            clSubmit: 'Submit Checklist', clSubmitted: '\u2705 Checklist submitted.',
            clNoChecklists: 'No checklists for your department yet.',
            clNoUnits: 'No hospital units defined yet \u2014 ask the administrator to add them.',
            clSelectPrompt: 'Select a checklist, unit and date to begin.',
            clPoints: 'points', clBasic: 'Basic', clCustom: 'Custom',
            clAddPoint: 'Add new point', clAdd: 'Add', clRemove: 'Remove', clCreate: 'Create',
            clNewChecklist: 'New checklist', clPointsHeading: 'Checklist points',
            clAssignTitle: 'Assign separate checklist to employee',
            clSelectPoints: 'Select points to assign', clAssign: 'Assign', clRevoke: 'Revoke',
            clActiveAssignments: 'Active assignments', clStatusHeading: 'Unit completion status',
            clFilled: 'Filled', clNotFilled: 'Not filled', clBy: 'by',
            clHistoryHeading: 'Submitted checklists', clNoEntries: 'No submitted checklists yet.',
            clView: 'View', clClose: 'Close', clUnitsHeading: 'Hospital Units',
            clFloorsHeading: 'Floors', clSeedBtn: 'Load IT basic checklists (one-time)',
            code_ERR_PERMISSION: 'You do not have permission for this action.',
            code_ERR_NOT_FOUND: 'Requested item was not found.',
            code_ERR_VALIDATION: 'Please check the entered details.',
            code_ERR_DUPLICATE: 'Duplicate \u2014 already exists or already submitted.',
            code_ERR_IN_USE: 'This is in use and cannot be removed.',
            clNoFloors: 'No floors defined yet \u2014 the administrator must add floors in Masters, or press \u201cLoad IT basic checklists\u201d once.'
        },
        hi: {
            titleSuffix: 'लॉगिन',
            subtitle: 'लॉगिन पोर्टल',
            hospitalLogoAlt: 'अस्पताल का लोगो',
            usernameLabel: 'उपयोगकर्ता नाम',
            usernamePlaceholder: 'उपयोगकर्ता नाम दर्ज करें',
            passwordLabel: 'पासवर्ड',
            passwordPlaceholder: 'पासवर्ड दर्ज करें',
            signInBtn: 'साइन इन करें',
            forgotPassword: 'पासवर्ड भूल गए?',
            newDeviceSetup: 'नया डिवाइस? सेटअप करें',

            resetTitle: 'पासवर्ड रीसेट करें',
            resetSubtitle: 'अपना उपयोगकर्ता नाम, ईमेल या फ़ोन नंबर दर्ज करें।',
            resetIdentifierLabel: 'उपयोगकर्ता नाम / ईमेल / फ़ोन',
            resetIdentifierPlaceholder: 'उपयोगकर्ता नाम, ईमेल या फ़ोन दर्ज करें',
            sendResetLinkBtn: 'रीसेट लिंक भेजें',
            backToLogin: 'लॉगिन पर वापस जाएं',
            resetTokenGenerated: 'रीसेट टोकन जनरेट हुआ',
            resetTokenPrefix: 'टोकन: {token}',
            newPasswordLabel: 'नया पासवर्ड',
            newPasswordPlaceholder: 'नया पासवर्ड दर्ज करें',
            setNewPasswordBtn: 'नया पासवर्ड सेट करें',

            deviceSetupBadge: 'डिवाइस सेटअप',
            setupTitle: 'इस डिवाइस को सेट करें',
            setupSubtitleHtml: 'वही <strong>उपयोगकर्ता नाम और पासवर्ड</strong> दर्ज करें जो आप अपने दूसरे डिवाइस पर उपयोग करते हैं।',
            fullNameLabel: 'पूरा नाम',
            fullNamePlaceholder: 'उदा. अस्पताल प्रशासक',
            setupUsernamePlaceholder: 'आपका उपयोगकर्ता नाम',
            setupPasswordPlaceholder: 'न्यूनतम 6 अक्षर',
            confirmPasswordLabel: 'पासवर्ड की पुष्टि करें',
            confirmPasswordPlaceholder: 'पासवर्ड फिर से दर्ज करें',
            createSignInBtn: 'बनाएं और साइन इन करें',
            backToLoginArrow: '← लॉगिन पर वापस जाएं',

            msgImportSuccess: '✅ खाते आयात हो गए! कृपया लॉगिन करें।',
            msgNoCloud: '⚠ कोई क्लाउड कॉन्फ़िगर नहीं है। नीचे "नया डिवाइस? सेटअप करें" का उपयोग करें।',
            msgLoadingCloud: '⏳ क्लाउड से खाते लोड हो रहे हैं…',
            msgCloudTimeout: '⚠ क्लाउड टाइमआउट। इंटरनेट जांचें या "नया डिवाइस? सेटअप करें" का उपयोग करें।',
            msgNoCloudAccounts: '⚠ अभी तक क्लाउड में कोई खाता नहीं है। "नया डिवाइस? सेटअप करें" का उपयोग करें।',
            msgAccountsLoaded: '✅ {count} खाता/खाते लोड हुए। कृपया लॉगिन करें।',
            msgCloudError: '⚠ क्लाउड त्रुटि: {msg} — "नया डिवाइस? सेटअप करें" का उपयोग करें।',
            msgEnterCredentials: 'कृपया उपयोगकर्ता नाम और पासवर्ड दर्ज करें।',
            msgLoginError: 'लॉगिन त्रुटि: {msg}',

            errFullNameRequired: 'पूरा नाम आवश्यक है।',
            errUsernameMin: 'उपयोगकर्ता नाम कम से कम 3 अक्षर का होना चाहिए।',
            errPasswordMin: 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए।',
            errPasswordMismatch: 'पासवर्ड मेल नहीं खाते।',
            errSetup: 'सेटअप त्रुटि: {msg}',
            errNoMatchingAccount: '"{uname}" के लिए कोई मेल खाता खाता नहीं मिला। उपयोगकर्ता नाम और पासवर्ड जांचें, या क्लाउड सिंक पूरा होने का इंतज़ार करके पुनः प्रयास करें।',

            resetErrEnterIdentifier: 'कृपया उपयोगकर्ता नाम, ईमेल या फ़ोन दर्ज करें।',
            resetErrNoAccount: 'कोई खाता नहीं मिला।',
            resetPending: 'एक अनुरोध पहले से लंबित है। कृपया प्रशासक की प्रतीक्षा करें।',
            resetRequestSent: 'अनुरोध प्रशासक को भेज दिया गया।',
            resetErrGeneric: 'त्रुटि: {msg}',
            resetPassMinLength: 'पासवर्ड कम से कम 4 अक्षर का होना चाहिए।',
            tokenVerifiedPrompt: 'टोकन सत्यापित हुआ! नीचे अपना नया पासवर्ड सेट करें।',
            tokenVerifiedSuccess: 'टोकन सफलतापूर्वक सत्यापित हुआ!',

            // ── Checklist page (checklists.html) ──
            clPageTitle: 'चेकलिस्ट',
            clBackToDashboard: '← डैशबोर्ड',
            clTabChecklists: 'चेकलिस्ट',
            clTabAssignments: 'सौंपी गई चेकलिस्ट',
            clTabSetup: 'सेटअप',
            clSelectChecklist: 'चेकलिस्ट चुनें',
            clNoTemplates: 'आपके विभाग के लिए अभी कोई चेकलिस्ट नहीं है।',
            clPoints: 'बिंदु',
            clBasicBadge: 'मूल',
            clCustomBadge: 'अतिरिक्त',
            clAddPointPlaceholder: 'नया चेकलिस्ट बिंदु…',
            clAdd: 'जोड़ें',
            clRemove: 'हटाएं',
            clFillForUnit: 'यूनिट के लिए भरें',
            clSelectUnit: 'यूनिट चुनें',
            clDate: 'तारीख',
            clLoadChecklist: 'चेकलिस्ट खोलें',
            clRemarksPlaceholder: 'टिप्पणी (वैकल्पिक)',
            clSubmit: 'जमा करें',
            clUnitStatusTitle: 'चुनी गई तारीख के लिए यूनिट स्थिति',
            clFilledBy: '{name} द्वारा भरा गया',
            clNotFilled: 'नहीं भरा गया',
            clMyAssignments: 'मुझे सौंपी गई चेकलिस्ट',
            clNoAssignments: 'आपको कोई चेकलिस्ट नहीं सौंपी गई है।',
            clFill: 'भरें',
            clPointsCount: '{count} बिंदु',
            clCreateAssignment: 'कर्मचारी को चेकलिस्ट दें',
            clDepartment: 'विभाग',
            clSelectEmployee: 'कर्मचारी चुनें',
            clAssignmentTitlePlaceholder: 'चेकलिस्ट का नाम (उदा. रवि — B3 राउंड)',
            clSelectPoints: 'मूल चेकलिस्ट से बिंदु चुनें',
            clAssign: 'सौंपें',
            clExistingAssignments: 'दी गई चेकलिस्ट',
            clRevoke: 'वापस लें',
            clRevoked: 'वापस ली गई',
            clTodayStatus: 'आज की स्थिति',
            clFloors: 'मंज़िलें',
            clUnits: 'अस्पताल यूनिट',
            clAddFloorPlaceholder: 'मंज़िल का नाम (उदा. GF)',
            clAddUnitPlaceholder: 'यूनिट का नाम (उदा. ICU)',
            clRunSeeder: 'IT मूल चेकलिस्ट लोड करें (एक बार)',
            clSeedDone: '{created} चेकलिस्ट बनाई गईं, {skipped} छोड़ी गईं (पहले से मौजूद)।',

            // ── Dashboard navigation (restored after i18n.js replacement) ──
            nav_dashboard: 'डैशबोर्ड',
            nav_users: 'उपयोगकर्ता',
            nav_departments: 'विभाग',
            nav_feature_rights: 'फ़ीचर अधिकार',
            nav_inventory: 'इन्वेंटरी',
            nav_gate_security: 'गेट सुरक्षा',
            nav_phase2: 'फेज़ 2',
            nav_projects: 'परियोजनाएं',
            nav_ambulance: 'एम्बुलेंस',
            nav_problems: 'समस्याएं',
            nav_tasks: 'कार्य',
            nav_complaints: 'शिकायतें',
            nav_room_checklist: 'रूम चेकलिस्ट',
            nav_admissions: 'एडमिशन',
            nav_lost_found: 'खोया-पाया',
            nav_admin_checklists: 'एडमिन चेकलिस्ट',
            nav_material_requests: 'सामग्री अनुरोध',
            nav_suggestions: 'सुझाव',
            nav_budget: 'बजट',
            nav_quarterly: 'त्रैमासिक',
            nav_data_history: 'डेटा इतिहास',
            nav_hospital_settings: 'अस्पताल सेटिंग्स',
            nav_reports: 'रिपोर्ट',
            nav_md_report: 'MD रिपोर्ट',
            nav_hod_dashboard: 'HOD डैशबोर्ड',
            nav_employee_dashboard: 'कर्मचारी डैशबोर्ड',
            nav_storekeeper_dashboard: 'स्टोरकीपर डैशबोर्ड',
            nav_checklists: 'चेकलिस्ट',
            nav_departmental_checklist: 'विभागीय चेकलिस्ट',
            nav_department_meetings: 'विभागीय बैठकें',
            nav_staff_deployment: 'स्टाफ तैनाती',
            nav_security_deployment: 'सुरक्षा तैनाती',
            ui_live: 'लाइव',
            ui_logout: 'लॉगआउट',

            clTitle: 'चेकलिस्ट', clTabFill: 'चेकलिस्ट भरें', clTabStatus: 'स्थिति',
            clTabHistory: 'इतिहास', clTabManage: 'प्रबंधन', clTabMasters: 'मास्टर्स',
            clBackToDashboard: '\u2190 डैशबोर्ड', clChecklist: 'चेकलिस्ट', clUnit: 'यूनिट',
            clDate: 'तारीख', clFloorLabel: 'मंज़िल', clDepartment: 'विभाग',
            clTitleLabel: 'शीर्षक', clName: 'नाम', clEmployee: 'कर्मचारी',
            clMyAssignedOnly: 'केवल मुझे सौंपे गए पॉइंट भरें', clRemarksPh: 'टिप्पणी (वैकल्पिक)',
            clSubmit: 'चेकलिस्ट जमा करें', clSubmitted: '\u2705 चेकलिस्ट जमा हो गई।',
            clNoChecklists: 'आपके विभाग के लिए अभी कोई चेकलिस्ट नहीं है।',
            clNoUnits: 'अभी कोई अस्पताल यूनिट नहीं है \u2014 प्रशासक से जोड़ने के लिए कहें।',
            clSelectPrompt: 'शुरू करने के लिए चेकलिस्ट, यूनिट और तारीख चुनें।',
            clPoints: 'पॉइंट', clBasic: 'बेसिक', clCustom: 'कस्टम',
            clAddPoint: 'नया पॉइंट जोड़ें', clAdd: 'जोड़ें', clRemove: 'हटाएं', clCreate: 'बनाएं',
            clNewChecklist: 'नई चेकलिस्ट', clPointsHeading: 'चेकलिस्ट पॉइंट',
            clAssignTitle: 'कर्मचारी को अलग चेकलिस्ट सौंपें',
            clSelectPoints: 'सौंपने के लिए पॉइंट चुनें', clAssign: 'सौंपें', clRevoke: 'रद्द करें',
            clActiveAssignments: 'सक्रिय असाइनमेंट', clStatusHeading: 'यूनिट पूर्णता स्थिति',
            clFilled: 'भरी गई', clNotFilled: 'नहीं भरी गई', clBy: 'द्वारा',
            clHistoryHeading: 'जमा की गई चेकलिस्ट', clNoEntries: 'अभी कोई जमा चेकलिस्ट नहीं है।',
            clView: 'देखें', clClose: 'बंद करें', clUnitsHeading: 'अस्पताल यूनिट',
            clFloorsHeading: 'मंज़िलें', clSeedBtn: 'IT बेसिक चेकलिस्ट लोड करें (एक बार)',
            code_ERR_PERMISSION: 'आपको इस कार्य की अनुमति नहीं है।',
            code_ERR_NOT_FOUND: 'मांगी गई चीज़ नहीं मिली।',
            code_ERR_VALIDATION: 'कृपया भरी गई जानकारी जांचें।',
            code_ERR_DUPLICATE: 'डुप्लिकेट \u2014 पहले से मौजूद है या जमा हो चुकी है।',
            code_ERR_IN_USE: 'यह उपयोग में है और हटाई नहीं जा सकती।',
            clNoFloors: 'अभी कोई मंज़िल नहीं है \u2014 प्रशासक Masters में मंज़िलें जोड़ें, या एक बार \u201cIT बेसिक चेकलिस्ट लोड करें\u201d दबाएं।'
        },
        gu: {
            titleSuffix: 'લૉગિન',
            subtitle: 'લૉગિન પોર્ટલ',
            hospitalLogoAlt: 'હોસ્પિટલનો લોગો',
            usernameLabel: 'વપરાશકર્તા નામ',
            usernamePlaceholder: 'વપરાશકર્તા નામ દાખલ કરો',
            passwordLabel: 'પાસવર્ડ',
            passwordPlaceholder: 'પાસવર્ડ દાખલ કરો',
            signInBtn: 'સાઇન ઇન કરો',
            forgotPassword: 'પાસવર્ડ ભૂલી ગયા?',
            newDeviceSetup: 'નવું ડિવાઇસ? સેટઅપ કરો',

            resetTitle: 'પાસવર્ડ રીસેટ કરો',
            resetSubtitle: 'તમારું વપરાશકર્તા નામ, ઈમેલ અથવા ફોન નંબર દાખલ કરો.',
            resetIdentifierLabel: 'વપરાશકર્તા નામ / ઈમેલ / ફોન',
            resetIdentifierPlaceholder: 'વપરાશકર્તા નામ, ઈમેલ અથવા ફોન દાખલ કરો',
            sendResetLinkBtn: 'રીસેટ લિંક મોકલો',
            backToLogin: 'લૉગિન પર પાછા જાઓ',
            resetTokenGenerated: 'રીસેટ ટોકન જનરેટ થયું',
            resetTokenPrefix: 'ટોકન: {token}',
            newPasswordLabel: 'નવો પાસવર્ડ',
            newPasswordPlaceholder: 'નવો પાસવર્ડ દાખલ કરો',
            setNewPasswordBtn: 'નવો પાસવર્ડ સેટ કરો',

            deviceSetupBadge: 'ડિવાઇસ સેટઅપ',
            setupTitle: 'આ ડિવાઇસ સેટ કરો',
            setupSubtitleHtml: 'તમે તમારા બીજા ડિવાઇસ પર જે <strong>વપરાશકર્તા નામ અને પાસવર્ડ</strong> વાપરો છો તે જ દાખલ કરો.',
            fullNameLabel: 'પૂરું નામ',
            fullNamePlaceholder: 'દા.ત. હોસ્પિટલ એડમિનિસ્ટ્રેટર',
            setupUsernamePlaceholder: 'તમારું વપરાશકર્તા નામ',
            setupPasswordPlaceholder: 'ઓછામાં ઓછા 6 અક્ષરો',
            confirmPasswordLabel: 'પાસવર્ડની પુષ્ટિ કરો',
            confirmPasswordPlaceholder: 'પાસવર્ડ ફરીથી દાખલ કરો',
            createSignInBtn: 'બનાવો અને સાઇન ઇન કરો',
            backToLoginArrow: '← લૉગિન પર પાછા જાઓ',

            msgImportSuccess: '✅ ખાતાં આયાત થયાં! કૃપા કરી લૉગિન કરો.',
            msgNoCloud: '⚠ કોઈ ક્લાઉડ કન્ફિગર થયેલ નથી. નીચે "નવું ડિવાઇસ? સેટઅપ કરો" નો ઉપયોગ કરો.',
            msgLoadingCloud: '⏳ ક્લાઉડમાંથી ખાતાં લોડ થઈ રહ્યાં છે…',
            msgCloudTimeout: '⚠ ક્લાઉડ ટાઇમઆઉટ. ઈન્ટરનેટ તપાસો અથવા "નવું ડિવાઇસ? સેટઅપ કરો" નો ઉપયોગ કરો.',
            msgNoCloudAccounts: '⚠ ક્લાઉડમાં હજુ કોઈ ખાતું નથી. "નવું ડિવાઇસ? સેટઅપ કરો" નો ઉપયોગ કરો.',
            msgAccountsLoaded: '✅ {count} ખાતું/ખાતાં લોડ થયાં. કૃપા કરી લૉગિન કરો.',
            msgCloudError: '⚠ ક્લાઉડ ભૂલ: {msg} — "નવું ડિવાઇસ? સેટઅપ કરો" નો ઉપયોગ કરો.',
            msgEnterCredentials: 'કૃપા કરી વપરાશકર્તા નામ અને પાસવર્ડ દાખલ કરો.',
            msgLoginError: 'લૉગિન ભૂલ: {msg}',

            errFullNameRequired: 'પૂરું નામ જરૂરી છે.',
            errUsernameMin: 'વપરાશકર્તા નામ ઓછામાં ઓછા 3 અક્ષરોનું હોવું જોઈએ.',
            errPasswordMin: 'પાસવર્ડ ઓછામાં ઓછા 6 અક્ષરોનો હોવો જોઈએ.',
            errPasswordMismatch: 'પાસવર્ડ મેળ ખાતા નથી.',
            errSetup: 'સેટઅપ ભૂલ: {msg}',
            errNoMatchingAccount: '"{uname}" માટે કોઈ મેળ ખાતું મળ્યું નથી. વપરાશકર્તા નામ અને પાસવર્ડ ચકાસો, અથવા ક્લાઉડ સિંક પૂર્ણ થવાની રાહ જોઈને ફરી પ્રયાસ કરો.',

            resetErrEnterIdentifier: 'કૃપા કરી વપરાશકર્તા નામ, ઈમેલ અથવા ફોન દાખલ કરો.',
            resetErrNoAccount: 'કોઈ ખાતું મળ્યું નથી.',
            resetPending: 'એક વિનંતી પહેલેથી બાકી છે. કૃપા કરી એડમિનિસ્ટ્રેટરની રાહ જુઓ.',
            resetRequestSent: 'વિનંતી એડમિનિસ્ટ્રેટરને મોકલવામાં આવી.',
            resetErrGeneric: 'ભૂલ: {msg}',
            resetPassMinLength: 'પાસવર્ડ ઓછામાં ઓછા 4 અક્ષરોનો હોવો જોઈએ.',
            tokenVerifiedPrompt: 'ટોકન ચકાસાયું! નીચે તમારો નવો પાસવર્ડ સેટ કરો.',
            tokenVerifiedSuccess: 'ટોકન સફળતાપૂર્વક ચકાસાયું!',

            // ── Checklist page (checklists.html) ──
            clPageTitle: 'ચેકલિસ્ટ',
            clBackToDashboard: '← ડેશબોર્ડ',
            clTabChecklists: 'ચેકલિસ્ટ',
            clTabAssignments: 'સોંપાયેલ ચેકલિસ્ટ',
            clTabSetup: 'સેટઅપ',
            clSelectChecklist: 'ચેકલિસ્ટ પસંદ કરો',
            clNoTemplates: 'તમારા વિભાગ માટે હજુ કોઈ ચેકલિસ્ટ નથી.',
            clPoints: 'મુદ્દા',
            clBasicBadge: 'મૂળભૂત',
            clCustomBadge: 'વધારાનું',
            clAddPointPlaceholder: 'નવો ચેકલિસ્ટ મુદ્દો…',
            clAdd: 'ઉમેરો',
            clRemove: 'દૂર કરો',
            clFillForUnit: 'યુનિટ માટે ભરો',
            clSelectUnit: 'યુનિટ પસંદ કરો',
            clDate: 'તારીખ',
            clLoadChecklist: 'ચેકલિસ્ટ ખોલો',
            clRemarksPlaceholder: 'ટિપ્પણી (વૈકલ્પિક)',
            clSubmit: 'સબમિટ કરો',
            clUnitStatusTitle: 'પસંદ કરેલી તારીખ માટે યુનિટ સ્થિતિ',
            clFilledBy: '{name} દ્વારા ભરાયું',
            clNotFilled: 'ભરાયું નથી',
            clMyAssignments: 'મને સોંપાયેલ ચેકલિસ્ટ',
            clNoAssignments: 'તમને કોઈ ચેકલિસ્ટ સોંપાયેલ નથી.',
            clFill: 'ભરો',
            clPointsCount: '{count} મુદ્દા',
            clCreateAssignment: 'કર્મચારીને ચેકલિસ્ટ આપો',
            clDepartment: 'વિભાગ',
            clSelectEmployee: 'કર્મચારી પસંદ કરો',
            clAssignmentTitlePlaceholder: 'ચેકલિસ્ટનું નામ (દા.ત. રવિ — B3 રાઉન્ડ)',
            clSelectPoints: 'મૂળભૂત ચેકલિસ્ટમાંથી મુદ્દા પસંદ કરો',
            clAssign: 'સોંપો',
            clExistingAssignments: 'આપેલ ચેકલિસ્ટ',
            clRevoke: 'પાછું ખેંચો',
            clRevoked: 'પાછું ખેંચાયેલ',
            clTodayStatus: 'આજની સ્થિતિ',
            clFloors: 'માળ',
            clUnits: 'હોસ્પિટલ યુનિટ',
            clAddFloorPlaceholder: 'માળનું નામ (દા.ત. GF)',
            clAddUnitPlaceholder: 'યુનિટનું નામ (દા.ત. ICU)',
            clRunSeeder: 'IT મૂળભૂત ચેકલિસ્ટ લોડ કરો (એક વાર)',
            clSeedDone: '{created} ચેકલિસ્ટ બનાવાઈ, {skipped} છોડી દેવાઈ (પહેલેથી હાજર).',

            // ── Dashboard navigation (restored after i18n.js replacement) ──
            nav_dashboard: 'ડેશબોર્ડ',
            nav_users: 'વપરાશકર્તાઓ',
            nav_departments: 'વિભાગો',
            nav_feature_rights: 'ફીચર અધિકારો',
            nav_inventory: 'ઇન્વેન્ટરી',
            nav_gate_security: 'ગેટ સુરક્ષા',
            nav_phase2: 'ફેઝ 2',
            nav_projects: 'પ્રોજેક્ટ્સ',
            nav_ambulance: 'એમ્બ્યુલન્સ',
            nav_problems: 'સમસ્યાઓ',
            nav_tasks: 'કાર્યો',
            nav_complaints: 'ફરિયાદો',
            nav_room_checklist: 'રૂમ ચેકલિસ્ટ',
            nav_admissions: 'એડમિશન',
            nav_lost_found: 'ખોવાયેલ-મળેલ',
            nav_admin_checklists: 'એડમિન ચેકલિસ્ટ',
            nav_material_requests: 'સામગ્રી વિનંતીઓ',
            nav_suggestions: 'સૂચનો',
            nav_budget: 'બજેટ',
            nav_quarterly: 'ત્રિમાસિક',
            nav_data_history: 'ડેટા ઇતિહાસ',
            nav_hospital_settings: 'હોસ્પિટલ સેટિંગ્સ',
            nav_reports: 'રિપોર્ટ્સ',
            nav_md_report: 'MD રિપોર્ટ',
            nav_hod_dashboard: 'HOD ડેશબોર્ડ',
            nav_employee_dashboard: 'કર્મચારી ડેશબોર્ડ',
            nav_storekeeper_dashboard: 'સ્ટોરકીપર ડેશબોર્ડ',
            nav_checklists: 'ચેકલિસ્ટ',
            nav_departmental_checklist: 'વિભાગીય ચેકલિસ્ટ',
            nav_department_meetings: 'વિભાગીય મીટિંગ',
            nav_staff_deployment: 'સ્ટાફ ડિપ્લોયમેન્ટ',
            nav_security_deployment: 'સિક્યુરિટી ડિપ્લોયમેન્ટ',
            ui_live: 'લાઇવ',
            ui_logout: 'લોગઆઉટ',

            clTitle: 'ચેકલિસ્ટ', clTabFill: 'ચેકલિસ્ટ ભરો', clTabStatus: 'સ્થિતિ',
            clTabHistory: 'ઇતિહાસ', clTabManage: 'વ્યવસ્થાપન', clTabMasters: 'માસ્ટર્સ',
            clBackToDashboard: '\u2190 ડેશબોર્ડ', clChecklist: 'ચેકલિસ્ટ', clUnit: 'યુનિટ',
            clDate: 'તારીખ', clFloorLabel: 'માળ', clDepartment: 'વિભાગ',
            clTitleLabel: 'શીર્ષક', clName: 'નામ', clEmployee: 'કર્મચારી',
            clMyAssignedOnly: 'ફક્ત મને સોંપાયેલા પોઇન્ટ ભરો', clRemarksPh: 'ટિપ્પણી (વૈકલ્પિક)',
            clSubmit: 'ચેકલિસ્ટ સબમિટ કરો', clSubmitted: '\u2705 ચેકલિસ્ટ સબમિટ થઈ.',
            clNoChecklists: 'તમારા વિભાગ માટે હજુ કોઈ ચેકલિસ્ટ નથી.',
            clNoUnits: 'હજુ કોઈ હોસ્પિટલ યુનિટ નથી \u2014 એડમિનિસ્ટ્રેટરને ઉમેરવા કહો.',
            clSelectPrompt: 'શરૂ કરવા માટે ચેકલિસ્ટ, યુનિટ અને તારીખ પસંદ કરો.',
            clPoints: 'પોઇન્ટ', clBasic: 'બેઝિક', clCustom: 'કસ્ટમ',
            clAddPoint: 'નવો પોઇન્ટ ઉમેરો', clAdd: 'ઉમેરો', clRemove: 'દૂર કરો', clCreate: 'બનાવો',
            clNewChecklist: 'નવી ચેકલિસ્ટ', clPointsHeading: 'ચેકલિસ્ટ પોઇન્ટ',
            clAssignTitle: 'કર્મચારીને અલગ ચેકલિસ્ટ સોંપો',
            clSelectPoints: 'સોંપવા માટે પોઇન્ટ પસંદ કરો', clAssign: 'સોંપો', clRevoke: 'રદ કરો',
            clActiveAssignments: 'સક્રિય સોંપણીઓ', clStatusHeading: 'યુનિટ પૂર્ણતા સ્થિતિ',
            clFilled: 'ભરાઈ ગઈ', clNotFilled: 'ભરાઈ નથી', clBy: 'દ્વારા',
            clHistoryHeading: 'સબમિટ થયેલી ચેકલિસ્ટ', clNoEntries: 'હજુ કોઈ સબમિટ થયેલી ચેકલિસ્ટ નથી.',
            clView: 'જુઓ', clClose: 'બંધ કરો', clUnitsHeading: 'હોસ્પિટલ યુનિટ',
            clFloorsHeading: 'માળ', clSeedBtn: 'IT બેઝિક ચેકલિસ્ટ લોડ કરો (એક વાર)',
            code_ERR_PERMISSION: 'તમને આ ક્રિયાની પરવાનગી નથી.',
            code_ERR_NOT_FOUND: 'માંગેલી વસ્તુ મળી નથી.',
            code_ERR_VALIDATION: 'કૃપા કરી ભરેલી વિગતો તપાસો.',
            code_ERR_DUPLICATE: 'ડુપ્લિકેટ \u2014 પહેલેથી હાજર છે અથવા સબમિટ થઈ ચૂકી છે.',
            code_ERR_IN_USE: 'આ ઉપયોગમાં છે અને દૂર કરી શકાતી નથી.',
            clNoFloors: 'હજુ કોઈ માળ નથી \u2014 એડમિનિસ્ટ્રેટર Masters માં માળ ઉમેરે, અથવા એક વાર \u201cIT બેઝિક ચેકલિસ્ટ લોડ કરો\u201d દબાવે.'
        }
    };

    function getLang() {
        var stored = null;
        try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
        return SUPPORTED.indexOf(stored) >= 0 ? stored : DEFAULT_LANG;
    }

    function setLang(lang) {
        if (SUPPORTED.indexOf(lang) < 0) return;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        document.documentElement.lang = lang;
        location.reload();
    }

    // t(key, {name: value}) — falls back to English, then to the raw key,
    // so a missing translation never renders as blank/undefined in the UI.
    function t(key, vars) {
        var lang = getLang();
        var str = (translations[lang] && translations[lang][key])
            || (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key])
            || key;
        if (vars) {
            Object.keys(vars).forEach(function (k) {
                str = str.replace('{' + k + '}', vars[k]);
            });
        }
        return str;
    }

    /** Is this key defined in any dictionary (current language or English)? */
    function has(key) {
        var lang = getLang();
        return !!((translations[lang] && translations[lang][key] !== undefined) ||
                  (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key] !== undefined));
    }

    /**
     * NON-DESTRUCTIVE: elements whose key is unknown are left untouched, so
     * they keep the default text written in the HTML. Previously an unknown
     * key overwrote the element with the raw key name (e.g. "nav_dashboard"),
     * which broke pages whose keys live in another dictionary.
     */
    function applyTranslations(root) {
        var scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(function (el) {
            var k = el.getAttribute('data-i18n');
            if (has(k)) el.textContent = t(k);
        });
        scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var k = el.getAttribute('data-i18n-html');
            if (has(k)) el.innerHTML = t(k);
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var k = el.getAttribute('data-i18n-placeholder');
            if (has(k)) el.setAttribute('placeholder', t(k));
        });
        scope.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            var k = el.getAttribute('data-i18n-alt');
            if (has(k)) el.setAttribute('alt', t(k));
        });
    }

    /**
     * Merge additional translations at runtime, e.g. from another script:
     *   I18N.addTranslations('hi', { nav_reports: 'रिपोर्ट' });
     * Existing keys are overwritten by the new value — this is how a page can
     * register its own keys without replacing this file.
     */
    function addTranslations(lang, map) {
        if (!translations[lang] || !map) return;
        Object.keys(map).forEach(function (k) { translations[lang][k] = map[k]; });
    }

    function highlightActiveLangButton() {
        var lang = getLang();
        document.querySelectorAll('.lang-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    document.documentElement.lang = getLang();

    global.I18N = {
        t: t,
        has: has,
        addTranslations: addTranslations,
        getLang: getLang,
        setLang: setLang,
        applyTranslations: applyTranslations,
        highlightActiveLangButton: highlightActiveLangButton,
        SUPPORTED: SUPPORTED
    };
    global.T = t;
    global.LANG = {
        extend: function (map) {
            if (!map) return;
            Object.keys(map).forEach(function (l) {
                if (SUPPORTED.indexOf(l) < 0) return;
                addTranslations(l, map[l]);
            });
        },
        switcher: function () {
            var cur = I18N.getLang();
            return '<div class="lang-switcher">' + SUPPORTED.map(function (l) {
                var label = { en: 'EN', hi: 'हि', gu: 'ગુ' }[l] || l.toUpperCase();
                return '<button class="lang-btn' + (l === cur ? ' active' : '') + '" data-lang="' + l + '">' + label + '</button>';
            }).join('') + '</div>';
        },
        setLang: function (lang) {
            I18N.setLang(lang);
        }
    };
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.lang-btn[data-lang]');
        if (btn) { I18N.setLang(btn.getAttribute('data-lang')); }
    });
})(window);
