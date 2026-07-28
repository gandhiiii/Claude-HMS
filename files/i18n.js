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
        applyTranslations();
        highlightActiveLangButton();
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

    function applyTranslations(root) {
        var scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });
        scope.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            el.setAttribute('alt', t(el.getAttribute('data-i18n-alt')));
        });
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
        getLang: getLang,
        setLang: setLang,
        applyTranslations: applyTranslations,
        highlightActiveLangButton: highlightActiveLangButton,
        SUPPORTED: SUPPORTED
    };
})(window);
