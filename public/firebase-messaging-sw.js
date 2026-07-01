/* ================= FIREBASE SW V2.5 — push avatar, no duplicate title ================= */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyB-mUYa7_t4lrePwI5GGCYWGxnKcGOzc_0",
  authDomain: "airanh-ba64c.firebaseapp.com",
  projectId: "airanh-ba64c",
  storageBucket: "airanh-ba64c.appspot.com",
  messagingSenderId: "236839124077",
  appId: "1:236839124077:web:bcf03a9721d45386f2d364",
  databaseURL: "https://airanh-ba64c-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const VERSION = "v2.5.0";
const APP_ICON = "/icon-192.PNG";

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

function toAbsoluteUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = self.location.origin;
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

function resolveIcon(data, isSystem) {
  if (isSystem) return toAbsoluteUrl(APP_ICON) || APP_ICON;
  const icon = data.icon || data.senderAvatar || "";
  const abs = toAbsoluteUrl(icon);
  if (abs) return abs;
  const name = (data.senderName || "U").trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0a84ff&color=fff&size=128&bold=true`;
}

function buildNotificationBody(data) {
  if (data.body && String(data.body).trim()) return String(data.body).trim();
  const sender = (data.senderName || "Ai đó").trim();
  const kind = data.contentKind || "text";
  const text = (data.message || data.preview || "").trim();
  if (kind === "friend_request") return `${sender} đã gửi lời mời kết bạn.`;
  if (kind === "image") return `${sender} đã gửi hình ảnh.`;
  if (kind === "file") return `${sender} đã gửi tệp đính kèm.`;
  if (kind === "location") return `${sender} đã gửi vị trí.`;
  if (kind === "system") return data.message || "Thông báo hệ thống";
  if (text) return `${sender} đã gửi tin nhắn:\n${text}`;
  return `${sender} đã gửi tin nhắn.`;
}

function parsePayloadData(raw) {
  let data = raw || {};
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  return data;
}

function showPushNotification(data, messageId) {
  const isSystem = data.isSystem === "true" || data.type === "system";
  const title = (data.title || "").trim();
  const body = buildNotificationBody(data);
  const icon = resolveIcon(data, isSystem);
  const tag = data.chatId || data.groupId || data.messageId || data.type || "default";
  const url = data.url || data.link || "/";

  const options = {
    body,
    icon,
    badge: toAbsoluteUrl(APP_ICON) || APP_ICON,
    tag,
    renotify: true,
    timestamp: Date.now(),
    dir: "auto",
    lang: "vi",
    data: {
      ...data,
      url,
      FCM_MSG_ID: messageId,
    },
  };

  // Title trống → chỉ hiện body, không lặp tên + "from App"
  const displayTitle = title || (isSystem ? "Hệ thống" : " ");

  return self.registration.showNotification(displayTitle, options);
}

const CACHE_NAME = `fcm-assets-${VERSION}`;
const ICONS_TO_CACHE = ["/icon-192.PNG", "/icon-512.PNG", "/apple-icon-180.PNG", "/favicon-32.PNG"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        ICONS_TO_CACHE.map((url) => cache.add(url).catch(() => console.warn(`Cache miss: ${url}`)))
      )
    )
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

messaging.onBackgroundMessage((payload) => {
  const data = parsePayloadData(payload.data);
  return showPushNotification(data, payload.messageId);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || data.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NOTIFICATION_ACTION", action: event.action, data, url });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

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

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: "FCM_TOKEN_EXPIRED" });
      });
    })
  );
});
