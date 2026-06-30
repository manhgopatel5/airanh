const SESSION_KEY = 'airanh_session_id'

export async function registerDeviceSession(token: string): Promise<string | null> {
  try {
    const res = await fetch('/api/user/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { sessionId?: string }
    if (data.sessionId) {
      localStorage.setItem(SESSION_KEY, data.sessionId)
      return data.sessionId
    }
    return null
  } catch {
    return null
  }
}

export async function heartbeatDeviceSession(token: string): Promise<void> {
  const sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) return

  try {
    await fetch('/api/user/session', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    })
  } catch {
    // ignore
  }
}

export { SESSION_KEY }
