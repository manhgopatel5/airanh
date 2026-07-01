import { getFirebaseAuth } from "@/lib/firebase";

export async function eventAuthFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
