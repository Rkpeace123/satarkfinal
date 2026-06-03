import { useEffect, useRef, useState } from 'react'
import type { LiveFlag } from '../types'

export function useWebSocket(onMessage: (flag: LiveFlag) => void) {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const connect = () => {
      if (closed) return
      ws.current = new WebSocket(`${protocol}//${window.location.host}/ws`)
      ws.current.onopen = () => setConnected(true)
      ws.current.onclose = () => {
        setConnected(false)
        if (!closed) {
          timeoutId = setTimeout(connect, 3000)
        }
      }
      ws.current.onerror = () => {
        ws.current?.close()
      }
      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as Record<string, unknown>
          if (data.type !== 'pong') onMessageRef.current(data as unknown as LiveFlag)
        } catch {
          // ignore malformed messages
        }
      }
    }

    connect()

    return () => {
      closed = true
      if (timeoutId) clearTimeout(timeoutId)
      ws.current?.close()
    }
  }, [])

  return { connected }
}
