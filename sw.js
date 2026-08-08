// HMS — Background Service Worker for Notifications
// Runs in OS background even when app/browser tabs are completely closed.

const CACHE_NAME = 'hms-bg-cache-v1';
const DEFAULT_ICON = 'assets/stavya-logo.png';
const DEFAULT_BADGE = 'assets/stavya-logo.png';

// Service Worker Install
self.addEventListener('install', function (event) {
    console.log('[HMS SW] Service Worker installed ✓');
    self.skipWaiting();
});

// Service Worker Activate — purges stale browser caches and takes control immediately
self.addEventListener('activate', function (event) {
    console.log('[HMS SW] Service Worker activated ✓ Purging stale caches...');
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    console.log('[HMS SW] Purged old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// Listen for Web Push events in background
self.addEventListener('push', function (event) {
    console.log('[HMS SW] Background push received');
    var data = { title: '🔔 HMS Notification', body: 'New update received', type: 'info', key: null };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        if (event.data) data.body = event.data.text();
    }

    var title = data.title || '🔔 HMS Notification';
    var options = {
        body: data.body || 'You have a new update in Stavya Intelligence HMS',
        icon: data.icon || DEFAULT_ICON,
        badge: data.badge || DEFAULT_BADGE,
        tag: data.tag || ('hms-notif-' + Date.now()),
        renotify: true,
        vibrate: [150, 75, 150, 75, 150],
        timestamp: Date.now(),
        data: {
            url: data.url || 'dashboard.html',
            key: data.key || null
        },
        actions: [
            { action: 'open', title: '👁️ View' },
            { action: 'dismiss', title: '✕ Dismiss' }
        ]
    };

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If the app is open AND focused right now, the foreground page
            // already shows an in-app pop card — skip the OS notification so
            // the user isn't doubled up.
            var visible = clientList.some(function (c) {
                return c.visibilityState === 'visible' && c.focused === true;
            });
            if (visible) return;
            return self.registration.showNotification(title, options);
        })
    );
});

// Handle Background Notification Clicks (when user taps/clicks the OS notification after closing app)
self.addEventListener('notificationclick', function (event) {
    console.log('[HMS SW] Background Notification Clicked:', event.action);
    event.notification.close();

    if (event.action === 'dismiss') return;

    var targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : 'dashboard.html';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If an app tab/window is already open, focus it
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url && 'focus' in client) {
                    if ('navigate' in client && targetUrl) {
                        client.navigate(targetUrl);
                    }
                    return client.focus();
                }
            }
            // If app was closed, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});

// Handle messages sent from foreground app to background Service Worker
self.addEventListener('message', function (event) {
    if (!event.data) return;

    if (event.data.type === 'SHOW_BACKGROUND_NOTIF') {
        var payload = event.data.payload || {};
        var title = payload.title || '🔔 HMS Alert';
        var options = {
            body: payload.body || 'Background alert from HMS',
            icon: payload.icon || DEFAULT_ICON,
            badge: DEFAULT_BADGE,
            tag: 'hms-bg-' + Date.now(),
            renotify: true,
            vibrate: [150, 75, 150],
            data: { url: payload.url || 'dashboard.html', key: payload.key || null }
        };
        self.registration.showNotification(title, options);
    }
});
