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
  const isRunningRef = useRef(enabled)
  isRunningRef.current = isRunning

  const currentIntervalRef = useRef(interval)
  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isExecutingRef = useRef(false)
  const isMountedRef = useRef(true)

  // Armazena callbacks em refs para que usePolling não recrie loops se o caller mudar referências
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const onMaxDurationReachedRef = useRef(onMaxDurationReached)
  onMaxDurationReachedRef.current = onMaxDurationReached

  const stop = useCallback(() => {
    isRunningRef.current = false
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
    isRunningRef.current = true
    setIsRunning(true)
  }, [interval, stop])

  const scheduleNext = useCallback(
    (delayMs?: number) => {
      if (!isMountedRef.current || !isRunningRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)

      let delay = delayMs ?? currentIntervalRef.current
      if (jitter) {
        const jitterDelta = delay * (Math.random() * 0.2)
        delay += jitterDelta
      }
      // Garante delay mínimo de 1.5s para evitar flood
      const safeDelay = Math.max(1500, delay)
      timerRef.current = setTimeout(() => {
        executeTick()
      }, safeDelay)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jitter],
  )

  const executeTick = useCallback(async () => {
    if (!isMountedRef.current || !isRunningRef.current) return

    // Verifica limite máximo de duração (ex: 15 minutos de espera de pagamento)
    const startTime = startTimeRef.current || Date.now()
    const elapsed = Date.now() - startTime
    if (maxDuration > 0 && elapsed >= maxDuration) {
      stop()
      if (onMaxDurationReachedRef.current) onMaxDurationReachedRef.current()
      return
    }

    // Se aba estiver oculta e pauseOnHidden ativo, atrasa
    if (pauseOnHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      scheduleNext(15000)
      return
    }

    if (isExecutingRef.current) {
      return
    }

    // Cancela requisição anterior pendente se houver
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
      } catch {
        // ignore
      }
    }
    abortControllerRef.current = new AbortController()

    isExecutingRef.current = true
    let shouldContinue = true

    try {
      if (callbackRef.current) {
        const result = await callbackRef.current(abortControllerRef.current.signal)
        // Se o callback retornar expressamente false, para o polling
        if (result === false) {
          shouldContinue = false
          stop()
          return
        }
      }

      // Aplica backoff exponencial gradual
      currentIntervalRef.current = Math.min(maxInterval, currentIntervalRef.current * backoffFactor)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        currentIntervalRef.current = Math.min(
          maxInterval,
          currentIntervalRef.current * backoffFactor,
        )
      }
    } finally {
      isExecutingRef.current = false
      if (isMountedRef.current && isRunningRef.current && shouldContinue) {
        scheduleNext()
      }
    }
  }, [maxDuration, pauseOnHidden, stop, maxInterval, backoffFactor, scheduleNext])

  useEffect(() => {
    isMountedRef.current = true
    isRunningRef.current = enabled
    setIsRunning(enabled)

    if (enabled) {
      currentIntervalRef.current = interval
      startTimeRef.current = Date.now()
      // Pequeno timeout inicial para permitir que o primeiro render do componente complete
      const startTimer = setTimeout(() => {
        if (isMountedRef.current && isRunningRef.current) {
          executeTick()
        }
      }, 50)
      return () => {
        clearTimeout(startTimer)
        stop()
      }
    } else {
      stop()
    }

    return () => {
      isMountedRef.current = false
      stop()
    }
  }, [enabled, interval, executeTick, stop])

  // Gerencia visibilidade da aba
  useEffect(() => {
    if (!pauseOnHidden) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunningRef.current) {
        // Ao voltar para a aba, agenda checagem
        currentIntervalRef.current = interval
        if (timerRef.current) clearTimeout(timerRef.current)
        scheduleNext(500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pauseOnHidden, interval, scheduleNext])

  return {
    isRunning,
    stop,
    restart,
  }
}
