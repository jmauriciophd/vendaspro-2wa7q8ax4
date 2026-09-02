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
    // Only subscribe if enabled and valid collection name
    if (!enabled || !collectionName) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    // Debounce listener callback to protect against rapid burst events that can trigger render loops
    const safeCallback = (e: RecordSubscription<TRecord>) => {
      if (cancelled) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!cancelled && callbackRef.current) {
          try {
            callbackRef.current(e)
          } catch (cbErr) {
            console.warn(
              `[useRealtime] Error in subscription callback for ${collectionName}:`,
              cbErr,
            )
          }
        }
      }, 150)
    }

    // Delay subscription slightly to allow PocketBase client auth initialization and avoid 400 race conditions
    const connectTimer = setTimeout(() => {
      if (cancelled) return

      try {
        pb.collection<TRecord>(collectionName)
          .subscribe('*', safeCallback)
          .then((fn) => {
            if (cancelled) {
              fn().catch(() => {})
            } else {
              unsubscribeFn = fn
            }
          })
          .catch((err) => {
            // Silently absorb realtime connection/auth errors to prevent console spam & loop triggers
            console.warn(
              `[useRealtime] Failed to subscribe to ${collectionName}:`,
              err?.message || err,
            )
          })
      } catch (subErr) {
        console.warn(`[useRealtime] Subscription setup error for ${collectionName}:`, subErr)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(connectTimer)
      if (debounceTimer) clearTimeout(debounceTimer)
      if (unsubscribeFn) {
        try {
          unsubscribeFn().catch(() => {})
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
