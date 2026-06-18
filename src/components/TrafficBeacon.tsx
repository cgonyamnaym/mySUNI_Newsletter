'use client'

import { useEffect, useRef } from 'react'

function getClientId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('_eid_cid')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('_eid_cid', id)
  }
  return id
}

export function TrafficBeacon() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const clientId = getClientId()
    if (!clientId) return

    const ping = (type: 'visit' | 'heartbeat') =>
      fetch('/api/monitor/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, type }),
      }).catch(() => {})

    ping('visit')

    intervalRef.current = setInterval(() => ping('heartbeat'), 20_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return null
}
