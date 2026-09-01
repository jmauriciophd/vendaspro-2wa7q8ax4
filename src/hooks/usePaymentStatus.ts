import { useEffect, useRef, useState, useCallback } from 'react'
import { paymentService } from '@/services/paymentService'
import type { PaymentChargeDetail, ChargeStatus } from '@/types/payments'

interface UsePaymentStatusOptions {
  chargeId?: string
  initialCharge?: PaymentChargeDetail | null
  pollingIntervalMs?: number
  enabled?: boolean
  onStatusChange?: (newStatus: ChargeStatus, charge: PaymentChargeDetail) => void
}

/**
 * Hook de monitoramento e polling automático do status de pagamento.
 * Elimina a necessidade de botões manuais de "Atualizar status" para o cliente final.
 * Faz requisições periódicas inteligentes:
 * - Se o status for terminal ('paid', 'canceled', 'refunded', 'expired'), encerra o polling.
 * - Se for 'pending' ou 'waiting_payment', faz polling a cada X segundos (padrão 4s).
 */
export function usePaymentStatus({
  chargeId,
  initialCharge,
  pollingIntervalMs = 4000,
  enabled = true,
  onStatusChange,
}: UsePaymentStatusOptions) {
  const [charge, setCharge] = useState<PaymentChargeDetail | null>(initialCharge || null)
  const [loading, setLoading] = useState<boolean>(!initialCharge)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState<boolean>(false)
  const previousStatusRef = useRef<ChargeStatus | undefined>(initialCharge?.status)

  // Armazena callback e chargeId em refs para imunizar efeitos e callbacks contra re-renders
  const onStatusChangeRef = useRef(onStatusChange)
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  const lastFetchedChargeIdRef = useRef<string | undefined>(undefined)

  // Atualiza estado inicial se prop mudar
  useEffect(() => {
    if (initialCharge) {
      setCharge(initialCharge)
      previousStatusRef.current = initialCharge.status
    }
  }, [initialCharge])

  const fetchStatus = useCallback(
    async (isBackground = false) => {
      if (!chargeId) return null
      if (!isBackground) setLoading(true)
      try {
        const data = await paymentService.getCharge(chargeId)
        setCharge(data)
        setError(null)
        lastFetchedChargeIdRef.current = chargeId

        if (data && data.status !== previousStatusRef.current) {
          const oldStatus = previousStatusRef.current
          previousStatusRef.current = data.status
          if (oldStatus !== undefined && onStatusChangeRef.current) {
            onStatusChangeRef.current(data.status, data)
          }
        }
        return data
      } catch (err) {
        console.error('Erro ao verificar status da cobrança:', err)
        setError('Não foi possível obter os dados da cobrança.')
        return null
      } finally {
        if (!isBackground) setLoading(false)
      }
    },
    [chargeId],
  )

  useEffect(() => {
    if (!chargeId) return

    // Carga inicial apenas se for a primeira vez ou se o chargeId mudou
    if (lastFetchedChargeIdRef.current !== chargeId) {
      fetchStatus(false)
    }

    if (!enabled) return

    // Se já estiver pago, cancelado ou expirado, não precisa de polling ativo constante
    const isTerminal = (status?: ChargeStatus) =>
      status === 'paid' || status === 'canceled' || status === 'refunded' || status === 'expired'

    if (charge && isTerminal(charge.status)) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    const interval = setInterval(() => {
      fetchStatus(true).then((updated) => {
        if (updated && isTerminal(updated.status)) {
          clearInterval(interval)
          setIsPolling(false)
        }
      })
    }, pollingIntervalMs)

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [chargeId, enabled, pollingIntervalMs, fetchStatus, charge?.status])

  return {
    charge,
    setCharge,
    loading,
    error,
    isPolling,
    refetch: () => fetchStatus(false),
  }
}
