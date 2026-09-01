import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, CheckCircle2, ChevronRight } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { notificationService } from '@/services/modules'
import { useRealtime } from '@/hooks/use-realtime'
import type { AppNotification } from '@/types/modules'
import { toast } from 'sonner'

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

export function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadUnread = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.token) return
    try {
      const res = await notificationService.unreadCount()
      setUnread(res?.count || 0)
    } catch (e) {
      // Ignora erro se não autenticado ainda
      console.error(e)
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notificationService.list()
      setItems(data.slice(0, 8))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUnread()
  }, [loadUnread])

  // Atualiza contagem a cada 30s e ao receber realtime
  useEffect(() => {
    const t = setInterval(loadUnread, 30000)
    return () => clearInterval(t)
  }, [loadUnread])

  useRealtime<AppNotification>('notifications', () => {
    loadUnread()
    if (open) loadList()
  })

  useEffect(() => {
    if (open) {
      loadList()
    }
  }, [open, loadList])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await notificationService.markRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnread((u) => Math.max(0, u - 1))
    } catch (err) {
      console.error(err)
      toast.error('Erro ao marcar notificação')
    }
  }

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await notificationService.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
      toast.success('Todas as notificações marcadas como lidas')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao marcar notificações')
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        title="Notificações"
        className="relative w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 flex items-center justify-center transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800">Notificações</h4>
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  {unread} nova(s)
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Tudo em dia!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Nenhuma notificação.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 hover:bg-slate-50/70 transition-colors ${
                      !n.is_read ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-400">{timeAgo(n.created)}</span>
                          {!n.is_read && (
                            <button
                              onClick={(e) => handleMarkRead(n.id, e)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
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
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/notificacoes')
              }}
              className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
