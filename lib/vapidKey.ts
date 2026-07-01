/** Chuẩn hóa + kiểm tra VAPID public key (P-256, base64url) */

export function normalizeVapidKey(raw?: string | null): string {
  if (!raw?.trim()) return "";

  let key = raw.trim();

  const eq = key.indexOf("=");
  if (key.startsWith("NEXT_PUBLIC_") && eq > 0) {
    key = key.slice(eq + 1).trim();
  }

  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  return key.replace(/\s+/g, "");
}

function decodeVapidBytes(key: string): Uint8Array | null {
  try {
    const pad = "=".repeat((4 - (key.length % 4)) % 4);
    const b64 = (key + pad).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function validateVapidPublicKey(key: string): { valid: boolean; reason?: string } {
  if (!key) {
    return { valid: false, reason: "Thiếu VAPID public key" };
  }

  if (key.includes("BEGIN") || key.includes("PRIVATE")) {
    return {
      valid: false,
      reason:
        "Đang dùng private key — cần public key từ Firebase Console → Cloud Messaging → Web Push certificates",
    };
  }

  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return {
      valid: false,
      reason: "VAPID key chứa ký tự không hợp lệ",
    };
  }

  if (key.length < 80 || key.length > 90) {
    return {
      valid: false,
      reason: `VAPID key sai độ dài (${key.length} ký tự). Copy lại Key pair từ Firebase Console.`,
    };
  }

  const bytes = decodeVapidBytes(key);
  if (!bytes || bytes.length !== 65 || bytes[0] !== 0x04) {
    return {
      valid: false,
      reason: "VAPID key không hợp lệ (P-256). Tạo lại Key pair trên Firebase Console.",
    };
  }

  return { valid: true };
}

export function getVapidKeyFromEnv(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    process.env.FIREBASE_VAPID_PUBLIC_KEY,
    process.env.FIREBASE_VAPID_KEY,
  ];

  for (const raw of candidates) {
    const key = normalizeVapidKey(raw);
    if (key && validateVapidPublicKey(key).valid) return key;
  }

  return normalizeVapidKey(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
}

/** Client: lấy VAPID từ API runtime, fallback env build-time */
export async function resolveVapidKeyClient(): Promise<{ key: string; error?: string }> {
  try {
    const res = await fetch("/api/push/vapid-key", { cache: "no-store" });
    const data = await res.json();
    if (res.ok && data.vapidKey) {
      const check = validateVapidPublicKey(data.vapidKey);
      if (check.valid) return { key: data.vapidKey };
      return { key: "", error: check.reason ?? "VAPID key không hợp lệ" };
    }
    return { key: "", error: (data.error as string) || "API không trả VAPID key" };
  } catch {
    /* fallback */
  }

  const fallback = normalizeVapidKey(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
  const check = validateVapidPublicKey(fallback);
  if (check.valid) return { key: fallback };
  return {
    key: "",
    error: check.reason || "Thiếu NEXT_PUBLIC_FIREBASE_VAPID_KEY trên Vercel",
  };
}
