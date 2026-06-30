/**
 * Tạo session cookie httpOnly qua API server.
 * Middleware dùng verifySessionCookie — KHÔNG dùng ID token trực tiếp.
 */
export async function establishSession(idToken: string): Promise<void> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Không tạo được phiên đăng nhập");
  }
}

export async function clearServerSession(): Promise<void> {
  await fetch("/api/auth", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => {});
}
