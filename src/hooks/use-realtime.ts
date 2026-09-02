import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 *
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false
    let unhookAuth: (() => void) | undefined

    const subscribeWhenReady = () => {
      if (cancelled) return
      // PocketBase realtime SSE requires a valid auth token to receive authenticated collection updates
      if (!pb.authStore.isValid || !pb.authStore.token) {
        // Wait until authStore becomes valid
        if (!unhookAuth) {
          unhookAuth = pb.authStore.onChange(() => {
            if (pb.authStore.isValid && pb.authStore.token) {
              if (unhookAuth) {
                unhookAuth()
                unhookAuth = undefined
              }
              subscribeWhenReady()
            }
          })
        }
        return
      }

      pb.collection<TRecord>(collectionName)
        .subscribe('*', (e) => {
          callbackRef.current(e)
        })
        .then((fn) => {
          if (cancelled) {
            fn().catch(() => {})
          } else {
            unsubscribeFn = fn
          }
        })
        .catch((err) => {
          // Log or silently ignore if connection is dropped
          console.debug(`Realtime subscription error for ${collectionName}:`, err)
        })
    }

    subscribeWhenReady()

    return () => {
      cancelled = true
      if (unhookAuth) {
        unhookAuth()
        unhookAuth = undefined
      }
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
