import { useEffect, useState, useCallback } from 'react'
import { Bell, CheckCheck, CheckCircle2, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { notificationService } from '@/services/modules'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import type { AppNotification } from '@/types/modules'

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = Math.max(0, now - d.getTime())
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'agora há pouco'
  const min = Math.floor(sec / 60)
  if (min < 60) return `há ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `há ${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 30) return `há ${day}d`
  return d.toLocaleDateString('pt-BR')
}

const TYPE_ICON: Record<string, string> = {
  commission: '💰',
  order: '🛒',
  quote: '📄',
  stock: '📦',
  system: '🔔',
}

const TYPE_LABEL: Record<string, string> = {
  commission: 'Comissão',
  order: 'Pedido',
  quote: 'Cotação',
  stock: 'Estoque',
  system: 'Sistema',
}

const PAGE_SIZE = 20

export default function Notificacoes() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notificationService.list({ unread: filter === 'unread' })
      // Paginação client-side (lista limitada a 200 no backend)
      setItems(data)
      setHasMore(data.length > page * PAGE_SIZE)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar notificações')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useRealtime<AppNotification>('notifications', () => load())

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (e) {
      console.error(e)
      toast.error('Erro ao marcar notificação')
    }
  }

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success('Todas as notificações marcadas como lidas')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao marcar notificações')
    }
  }

  const visibleItems = items.slice(0, page * PAGE_SIZE)
  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Notificações
            {unreadCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {unreadCount} não lida(s)
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe alertas de comissões, pedidos e sistema
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as 'all' | 'unread')
              setPage(1)
            }}
            className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
          >
            <option value="all">Todas</option>
            <option value="unread">Não lidas</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando notificações...</div>
        ) : visibleItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhuma notificação</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {filter === 'unread'
                ? 'Você não tem notificações não lidas.'
                : 'Você ainda não recebeu nenhuma notificação.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleItems.map((n) => (
              <div
                key={n.id}
                className={`p-4 hover:bg-slate-50/70 transition-colors ${
                  !n.is_read ? 'bg-indigo-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 truncate">{n.title}</p>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {TYPE_LABEL[n.type] || n.type}
                          </span>
                          {n.is_read ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                              Lida
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                              Não lida
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created)}</p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Marcar lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {hasMore && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50/40">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {/* Legenda de paginação */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Mostrando {visibleItems.length} de {items.length} notificação(ões)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium">Página {page}</span>
            <button
              onClick={() => setPage((p) => (hasMore ? p + 1 : p))}
              disabled={!hasMore}
              className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
