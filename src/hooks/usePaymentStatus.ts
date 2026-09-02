import { useState, useEffect, useRef, useCallback } from 'react'
import { paymentService } from '@/services/paymentService'
import type { PaymentChargeDetail, ChargeStatus } from '@/types/payments'
import { usePolling } from '@/hooks/usePolling'

export interface UsePaymentStatusParams {
  chargeId: string | undefined
  pollingIntervalMs?: number
  onStatusChange?: (newStatus: ChargeStatus) => void
  enabled?: boolean
  onPaid?: (charge: PaymentChargeDetail) => void
  onFailed?: (charge: PaymentChargeDetail) => void
}

const TERMINAL_STATUSES: ChargeStatus[] = [
  'paid',
  'canceled',
  'expired',
  'failed',
  'refunded',
  'partially_refunded',
]

/**
 * Hook para monitorar o status de uma cobrança em tempo real com polling resiliente.
 * - Exponential backoff com Jitter
 * - Auto-pausa quando a aba perde o foco
 * - AbortController para evitar conflitos de requests
 * - Limite de 15 minutos para evitar loops eternos
 */
export function usePaymentStatus(
  paramsOrChargeId: string | undefined | UsePaymentStatusParams,
  initialCharge?: PaymentChargeDetail | null,
) {
  const isObjectParam = typeof paramsOrChargeId === 'object' && paramsOrChargeId !== null
  const chargeId = isObjectParam ? paramsOrChargeId.chargeId : paramsOrChargeId
  const pollingIntervalMs = isObjectParam ? paramsOrChargeId.pollingIntervalMs || 4000 : 4000
  const enabled = isObjectParam ? (paramsOrChargeId.enabled ?? true) : true
  const onStatusChange = isObjectParam ? paramsOrChargeId.onStatusChange : undefined
  const onPaid = isObjectParam ? paramsOrChargeId.onPaid : undefined
  const onFailed = isObjectParam ? paramsOrChargeId.onFailed : undefined

  const [charge, setCharge] = useState<PaymentChargeDetail | null>(initialCharge || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previousStatusRef = useRef<ChargeStatus | undefined>(initialCharge?.status)

  // Atualiza charge se initialCharge mudar externamente
  useEffect(() => {
    if (initialCharge) {
      setCharge(initialCharge)
      previousStatusRef.current = initialCharge.status
    }
  }, [initialCharge])

  const isTerminal = charge?.status && TERMINAL_STATUSES.includes(charge.status)

  const targetChargeId = typeof chargeId === 'string' ? chargeId : undefined

  const checkStatus = useCallback(
    async (signal?: AbortSignal) => {
      if (!targetChargeId) return false

      try {
        setLoading(true)
        const updated = await paymentService.getCharge(targetChargeId)
        if (signal?.aborted) return

        setCharge(updated)
        setError(null)

        const prevStatus = previousStatusRef.current
        const newStatus = updated.status

        if (prevStatus !== newStatus) {
          previousStatusRef.current = newStatus
          if (onStatusChange) {
            onStatusChange(newStatus)
          }
          if (newStatus === 'paid' && onPaid) {
            onPaid(updated)
          } else if (
            (newStatus === 'canceled' || newStatus === 'expired' || newStatus === 'failed') &&
            onFailed
          ) {
            onFailed(updated)
          }
        }

        // Se atingiu estado final, encerra o polling
        if (TERMINAL_STATUSES.includes(newStatus)) {
          return false
        }

        return true
      } catch (err: any) {
        if (!signal?.aborted) {
          setError(err?.message || 'Erro ao verificar status')
        }
      } finally {
        setLoading(false)
      }
    },
    [targetChargeId, onStatusChange, onPaid, onFailed],
  )

  const { isRunning, stop, restart } = usePolling(
    async (signal) => {
      return await checkStatus(signal)
    },
    {
      enabled: Boolean(enabled && targetChargeId && !isTerminal),
      interval: pollingIntervalMs,
      maxInterval: 30000,
      maxDuration: 15 * 60 * 1000, // 15 minutos de tempo máximo
      pauseOnHidden: true,
      jitter: true,
    },
  )

  const manualCheck = useCallback(async () => {
    return await checkStatus()
  }, [checkStatus])

  return {
    charge,
    isPaid: charge?.status === 'paid',
    isPending: charge?.status === 'pending' || charge?.status === 'waiting_payment',
    isFailed:
      charge?.status === 'failed' || charge?.status === 'canceled' || charge?.status === 'expired',
    status: charge?.status,
    loading,
    error,
    isPolling: isRunning,
    refetch: manualCheck,
    stopPolling: stop,
    restartPolling: restart,
  }
}
