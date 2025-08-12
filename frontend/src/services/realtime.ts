export type RealtimeMessage = {
  type: string
  [key: string]: unknown
}

export type RealtimeHandler = (msg: RealtimeMessage) => void

export function connectRealtime(wsUrl: string, onMessage: RealtimeHandler) {
  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null

  const connect = () => {
    try {
      socket = new WebSocket(wsUrl)
      socket.onopen = () => {
        // no-op, keep alive
      }
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch {
          // ignore
        }
      }
      socket.onclose = () => {
        // Exponential-ish backoff
        reconnectTimer = window.setTimeout(connect, 2000)
      }
      socket.onerror = () => {
        socket?.close()
      }
    } catch {
      reconnectTimer = window.setTimeout(connect, 3000)
    }
  }

  connect()

  return () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    socket?.close()
  }
}