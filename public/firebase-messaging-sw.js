/* ================= FIREBASE SW V2.1 FIXED ================= */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// Dán config của bạn vào đây
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "airanh-ba64c.firebaseapp.com",
  projectId: "airanh-ba64c",
  storageBucket: "airanh-ba64c.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

const VERSION = "v2.1.1";
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/* ================= CACHE - SỬA .PNG VIẾT HOA ================= */
const CACHE_NAME = `fcm-assets-${VERSION}`;
const ICONS_TO_CACHE = [
  "/icon-192.PNG",  // Sửa .png → .PNG
  "/icon-512.PNG",  // Sửa .png → .PNG
  "/badge-72.png",  // File này chưa có, xóa hoặc tạo thêm
  "/icon-reply.png", // File này chưa có, xóa hoặc tạo thêm
  "/icon-view.png",  // File này chưa có, xóa hoặc tạo thêm
];

// Nếu chưa có badge/icon-reply/icon-view thì comment 3 dòng dưới
const ICONS_TO_CACHE = [
  "/icon-192.PNG",
  "/icon-512.PNG",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ICONS_TO_CACHE.map((url) => cache.add(url).catch(() => console.warn(`Cache miss: ${url}`)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith("fcm-")) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

/* ================= MESSAGE HANDLER ================= */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ================= BACKGROUND MESSAGE - SỬA .PNG ================= */
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Background:", payload);

  let data = payload.data || {};
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }

  const notification = payload.notification || {};
  const title = notification.title || data.title || "Thông báo mới";
  const body = (notification.body || data.body || "").slice(0, 200);

  const tag = data.conversationId || data.tag || data.type || "default";

  const options = {
    body,
    icon: notification.icon || data.icon || "/icon-192.PNG", // Sửa .png → .PNG
    badge: notification.badge || "/badge-72.PNG", // Nếu chưa có file này thì bỏ dòng này
    image: data.image,
    tag,
    renotify: data.renotify === "true",
    requireInteraction: data.requireInteraction === "true",
    silent: data.silent === "true",
    timestamp: Date.now(),
    vibrate: data.renotify === "true"? [200, 100, 200] : undefined,
    dir: "auto",
    lang: data.lang || "vi",
    data: {
    ...data,
      url: data.link || data.url || "/",
      FCM_MSG_ID: payload.messageId,
      timestamp: Date.now(),
    },
    actions: getActions(data).slice(0, 2),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function getActions(data) {
  if (data.type === "message") {
    return [
      { action: "reply", title: "💬 Trả lời", icon: "/icon-reply.PNG" }, // Sửa .png → .PNG
      { action: "view", title: "👀 Xem", icon: "/icon-view.PNG" }, // Sửa .png → .PNG
    ];
  }
  if (data.type === "friend_request") {
    return [
      { action: "accept", title: "✅ Chấp nhận" },
      { action: "decline", title: "❌ Từ chối" },
    ];
  }
  return [];
}

/* ================= NOTIFICATION CLICK ================= */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { action } = event;
  const data = event.notification.data || {};
  const url = data.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({
            type: "NOTIFICATION_ACTION",
            action,
            data,
            url,
          });
          return;
        }
      }
      if (clients.openWindow) {
        const targetUrl = action? `${url}?action=${action}&id=${data.requestId || ""}` : url;
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/* ================= NOTIFICATION CLOSE ================= */
self.addEventListener("notificationclose", (event) => {
  const data = event.notification.data || {};
  if (data.trackDismiss) {
    fetch("/api/analytics/dismiss", {
      method: "POST",
      body: JSON.stringify({ messageId: data.FCM_MSG_ID }),
      keepalive: true,
    }).catch(() => {});
  }
});

/* ================= PUSH SUBSCRIPTION CHANGE ================= */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: "FCM_TOKEN_EXPIRED" });
      });
    })
  );
});