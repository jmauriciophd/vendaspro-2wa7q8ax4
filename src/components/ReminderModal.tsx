import React, { useState } from 'react'
import { X, Bell, CheckCircle2, Calendar, MessageSquare } from 'lucide-react'
import { reminderService } from '@/services/crm'
import { toast } from 'sonner'

interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
  dealId: string
  dealTitle?: string
  userId?: string
}

/**
 * Modal para criar um lembrete de follow-up associado a um negócio.
 */
export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  dealId,
  dealTitle,
  userId,
}) => {
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('A mensagem do lembrete é obrigatória.')
      return
    }
    if (!userId) {
      setError('Usuário não identificado.')
      return
    }
    setIsSubmitting(true)
    try {
      await reminderService.create({
        deal: dealId,
        user: userId,
        message: message.trim(),
        due_date: dueDate ? `${dueDate} 12:00:00.000Z` : undefined,
      })
      toast.success('Lembrete criado com sucesso!')
      setMessage('')
      setDueDate('')
      setError('')
      onSaved?.()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao criar lembrete')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Criar Lembrete</h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">
                {dealTitle ? `Negócio: ${dealTitle}` : 'Follow-up de negócio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Mensagem do Lembrete *
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (error) setError('')
              }}
              rows={3}
              placeholder="Ex: Ligar para o cliente e confirmar a proposta enviada..."
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:ring-2 outline-none transition-all ${
                error && !message.trim()
                  ? 'border-red-500 ring-2 ring-red-100'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data de Vencimento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Quando esse lembrete deve disparar. Deixe vazio se não houver prazo.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Criar Lembrete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
