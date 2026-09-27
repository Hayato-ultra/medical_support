'use client'

import { useEffect } from 'react'
import { reticle } from '@reticlehq/react'

export function ReticleDev() {
  useEffect(() => {
    // Only initialize in development
    if (process.env.NODE_ENV !== 'development') return

    // Connect to Reticle daemon
    reticle.connect({
      // The project name helps Reticle identify this app
      projectId: 'medical-support',
    })

    // Optional: Register stores for state inspection
    // reticle.registerStore('auth', () => ({ /* auth state */ }))

    // Cleanup on unmount
    return () => {
      reticle.disconnect()
    }
  }, [])

  return null
}