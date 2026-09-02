import { useEffect, useRef, useCallback, useState } from 'react'

export interface PollingOptions {
  interval?: number // Intervalo base em ms (default: 5000)
  maxInterval?: number // Intervalo máximo com backoff em ms (default: 30000)
  maxDuration?: number // Duração máxima do polling em ms (default: 15 min = 900000)
  backoffFactor?: number // Fator de multiplicação exponencial (default: 1.5)
  jitter?: boolean // Adiciona variação aleatória de 0-25% para evitar thundering herd (default: true)
  pauseOnHidden?: boolean // Pausa ou desacelera quando a aba estiver oculta (default: true)
  enabled?: boolean // Se o polling está ativo (default: true)
  onMaxDurationReached?: () => void // Callback ao expirar tempo máximo
}

/**
 * Hook centralizado de polling resiliente para o frontend.
 * - Suporta Exponential Backoff com Jitter
 * - Reduz frequência/pausa em segundo plano (document.visibilityState === 'hidden')
 * - Possui tempo limite máximo (ex: 15min para PIX/checkout)
 * - Integra AbortController para cancelamento de requisições anteriores
 * - Evita loop infinito e sobrecarga no backend PocketBase
 */
export function usePolling<T = void>(
  callback: (signal: AbortSignal) => Promise<T | boolean | void>,
  options: PollingOptions = {},
) {
  const {
    interval = 5000,
    maxInterval = 30000,
    maxDuration = 15 * 60 * 1000, // 15 minutos
    backoffFactor = 1.5,
    jitter = true,
    pauseOnHidden = true,
    enabled = true,
    onMaxDurationReached,
  } = options

  const [isRunning, setIsRunning] = useState(enabled)
  const currentIntervalRef = useRef(interval)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isExecutingRef = useRef(false)

  const stop = useCallback(() => {
    setIsRunning(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const restart = useCallback(() => {
    stop()
    currentIntervalRef.current = interval
    startTimeRef.current = Date.now()
    setIsRunning(true)
  }, [interval, stop])

  const executeTick = useCallback(async () => {
    if (!isRunning) return

    // Verifica limite máximo de duração (ex: 15 minutos de espera de pagamento)
    const elapsed = Date.now() - startTimeRef.current
    if (maxDuration > 0 && elapsed >= maxDuration) {
      stop()
      if (onMaxDurationReached) onMaxDurationReached()
      return
    }

    // Se aba estiver oculta e pauseOnHidden ativo, pula ou atrasa
    if (pauseOnHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      // Agenda checagem lenta de 15 segundos
      timerRef.current = setTimeout(executeTick, 15000)
      return
    }

    if (isExecutingRef.current) {
      return
    }

    // Cancela requisição anterior pendente se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    isExecutingRef.current = true
    try {
      const result = await callback(abortControllerRef.current.signal)
      // Se a função de callback retornar expressamente false, para o polling (ex: pagamento finalizado)
      if (result === false) {
        stop()
        return
      }

      // Aplica backoff exponencial gradual
      currentIntervalRef.current = Math.min(maxInterval, currentIntervalRef.current * backoffFactor)
    } catch (err: any) {
      // Se foi cancelado intencionalmente, não conta como erro
      if (err?.name !== 'AbortError') {
        currentIntervalRef.current = Math.min(
          maxInterval,
          currentIntervalRef.current * backoffFactor,
        )
      }
    } finally {
      isExecutingRef.current = false
      if (isRunning) {
        let nextDelay = currentIntervalRef.current
        if (jitter) {
          // Jitter aleatório entre 0 e 20%
          const jitterDelta = nextDelay * (Math.random() * 0.2)
          nextDelay += jitterDelta
        }
        timerRef.current = setTimeout(executeTick, nextDelay)
      }
    }
  }, [
    isRunning,
    maxDuration,
    pauseOnHidden,
    callback,
    stop,
    onMaxDurationReached,
    maxInterval,
    backoffFactor,
    jitter,
  ])

  useEffect(() => {
    setIsRunning(enabled)
    if (enabled) {
      currentIntervalRef.current = interval
      startTimeRef.current = Date.now()
      executeTick()
    } else {
      stop()
    }

    return () => {
      stop()
    }
  }, [enabled, interval, executeTick, stop])

  // Gerencia visibilidade da aba
  useEffect(() => {
    if (!pauseOnHidden) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        // Ao voltar para a aba, reseta intervalo e executa imediatamente
        currentIntervalRef.current = interval
        if (timerRef.current) clearTimeout(timerRef.current)
        executeTick()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pauseOnHidden, isRunning, interval, executeTick])

  return {
    isRunning,
    stop,
    restart,
  }
}
