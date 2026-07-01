"use client";

export type PushPermissionState = NotificationPermission | "unsupported" | "ios-install";

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function readPushPermission(): PushPermissionState {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) {
    return isIOS() && !isStandalonePwa() ? "ios-install" : "unsupported";
  }
  return Notification.permission;
}

/**
 * Xin quyền thông báo — PHẢI gọi requestPermission() ngay, không await gì trước đó
 * (iOS/Safari hủy user gesture nếu có await trước requestPermission).
 */
export async function requestBrowserPushPermission(): Promise<{
  state: PushPermissionState;
  message?: string;
}> {
  if (typeof window === "undefined") {
    return { state: "unsupported", message: "Không chạy được trên server" };
  }

  if (isIOS() && !isStandalonePwa()) {
    return {
      state: "ios-install",
      message: "Trên iPhone: Share → Thêm vào Màn hình chính, mở app từ icon rồi bật thông báo.",
    };
  }

  if (!("Notification" in window)) {
    return {
      state: "unsupported",
      message: "Trình duyệt này không hỗ trợ thông báo đẩy.",
    };
  }

  if (Notification.permission === "granted") {
    return { state: "granted" };
  }

  if (Notification.permission === "denied") {
    return {
      state: "denied",
      message: "Quyền đã bị chặn. Vào cài đặt trình duyệt → Thông báo → cho phép trang này.",
    };
  }

  // Không await trước dòng này — giữ user gesture cho popup hệ thống
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") return { state: "granted" };
    if (result === "denied") {
      return {
        state: "denied",
        message: "Bạn đã từ chối. Bật lại trong cài đặt trình duyệt.",
      };
    }
    return { state: "default", message: "Chưa cấp quyền thông báo." };
  } catch (err) {
    console.error("[push] requestPermission error:", err);
    return {
      state: "unsupported",
      message: err instanceof Error ? err.message : "Không xin được quyền thông báo.",
    };
  }
}
