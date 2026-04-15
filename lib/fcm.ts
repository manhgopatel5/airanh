import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB-mUYa7_t4lrePwI5GGCYWGxnKcGOzc_0",
  authDomain: "airanh-ba64c.firebaseapp.com",
  projectId: "airanh-ba64c",
  storageBucket: "airanh-ba64c.appspot.com",
  messagingSenderId: "236839124077",
  appId: "1:236839124077:web:bcf03a9721d45386f2d364",
};

const app = initializeApp(firebaseConfig);

export const messaging =
  typeof window !== "undefined" ? getMessaging(app) : null;

// 🔥 FIX QUAN TRỌNG: chỉ init 1 lần
let fcmInitialized = false;

export const initFCM = async (userId: string) => {
  if (!messaging) return;

  // ❌ chặn gọi nhiều lần (NGUYÊN NHÂN GÂY X2)
  if (fcmInitialized) {
    console.log("⚠️ FCM already initialized");
    return;
  }

  fcmInitialized = true;

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ No permission");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey:
        "BNtLKVLAr2GZL6KI8iD7omomOGwWbQw1w-IxAw061Do7loEcELfkyNIzLzgDsg9GRGVvwChReYcTqDdwrNGOv38",
    });

    console.log("🔥 FCM TOKEN:", token);

    // 🔥 lưu token vào Firestore
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    await setDoc(
      doc(db, "users", userId),
      {
        fcmToken: token,
      },
      { merge: true }
    );

    // 🔥 FIX: chỉ có 1 listener duy nhất
    onMessage(messaging, (payload) => {
      console.log("🔥 foreground:", payload);

      if (!payload.data) return;

      const title = payload.data.title || "Thông báo";
      const body = payload.data.body || "";

      // ❌ nếu đang mở app → không hiện (tránh trùng)
      if (document.visibilityState === "visible") return;

      // ✅ chỉ hiện khi app nền
      new Notification(title, {
        body,
      });
    });
  } catch (e) {
    console.log("❌ FCM error", e);
  }
};
