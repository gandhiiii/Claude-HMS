// SYNC delegates to APP_SYNC which is initialized in data.js
var SYNC = {
    init: function() {
        try { if (typeof APP_SYNC !== 'undefined') APP_SYNC.init(); } catch(e) {}
    }
};
