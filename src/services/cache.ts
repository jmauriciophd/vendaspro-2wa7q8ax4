/**
 * Camada de abstração de Cache (Redis-Ready).
 * Atualmente utiliza memória com TTL no frontend e banco PocketBase no backend.
 * Caso seja provisionado Redis no futuro, basta alterar esta camada sem modificar os chamadores.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class CacheService {
  private memory = new Map<string, CacheEntry<any>>()

  /**
   * Obtém um valor do cache se não expirado
   */
  get<T>(key: string): T | null {
    const entry = this.memory.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * Define um valor no cache com tempo de expiração em milissegundos
   */
  set<T>(key: string, value: T, ttlMs: number = 60000): void {
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Remove uma chave específica
   */
  delete(key: string): void {
    this.memory.delete(key)
  }

  /**
   * Limpa todas as entradas expiradas
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.memory.entries()) {
      if (now > entry.expiresAt) {
        this.memory.delete(key)
      }
    }
  }

  /**
   * Executa uma função com cache automático (stale-while-revalidate ou cache-first)
   */
  async remember<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const fresh = await fetcher()
    this.set(key, fresh, ttlMs)
    return fresh
  }
}

export const cacheService = new CacheService()
