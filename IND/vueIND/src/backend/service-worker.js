self.addEventListener('message', function(event) {
    if (event.data && event.data.command === 'notification') {
        const title = event.data.title;
        const options = event.data.options;

        self.registration.showNotification(title, options);
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});