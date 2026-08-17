import React, { useState } from 'react'
import type { Deal, Customer, User, DealStage } from '@/types/crm'
import { dealService } from '@/services/crm'
import { toast } from 'sonner'
import {
  X,
  Trash2,
  Calendar,
  DollarSign,
  Store,
  User as UserIcon,
  FileText,
  CheckCircle,
} from 'lucide-react'

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  dealToEdit?: Deal | null
  defaultStage?: DealStage
  customers: Customer[]
  users: User[]
  currentUserId?: string
  onSaved: () => void
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  dealToEdit,
  defaultStage = 'prospeccao',
  customers,
  users,
  currentUserId,
  onSaved,
}) => {
  const [title, setTitle] = useState(dealToEdit?.title || '')
  const [customer, setCustomer] = useState(dealToEdit?.customer || customers[0]?.id || '')
  const [value, setValue] = useState(dealToEdit?.value?.toString() || '')
  const [stage, setStage] = useState<DealStage>(dealToEdit?.stage || defaultStage)
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    dealToEdit?.expected_close_date ? dealToEdit.expected_close_date.split(' ')[0] : '',
  )
  const [owner, setOwner] = useState(dealToEdit?.owner || currentUserId || users[0]?.id || '')
  const [notes, setNotes] = useState(dealToEdit?.notes || '')

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  const validate = () => {
    const errs: { [key: string]: string } = {}
    if (!title.trim()) errs.title = 'Título do negócio é obrigatório'
    if (!customer) errs.customer = 'Selecione um cliente / mercadinho'
    if (value && isNaN(Number(value))) errs.value = 'Valor inválido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const payload: Partial<Deal> = {
        title: title.trim(),
        customer,
        value: value ? Number(value) : 0,
        stage,
        expected_close_date: expectedCloseDate ? `${expectedCloseDate} 12:00:00.000Z` : undefined,
        owner: owner || undefined,
        notes: notes.trim() || undefined,
      }

      if (dealToEdit) {
        await dealService.update(dealToEdit.id, payload)
        toast.success('Negócio atualizado com sucesso!')
      } else {
        await dealService.create(payload)
        toast.success('Novo negócio criado com sucesso!')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar negócio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!dealToEdit) return
    if (!confirm('Tem certeza que deseja excluir esta oportunidade?')) return

    setIsDeleting(true)
    try {
      await dealService.delete(dealToEdit.id)
      toast.success('Negócio removido do pipeline.')
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao excluir negócio')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {dealToEdit ? 'Editar Negócio' : 'Novo Negócio no Pipeline'}
            </h3>
            <p className="text-xs text-slate-500">
              {dealToEdit
                ? 'Atualize os detalhes da proposta'
                : 'Cadastre uma nova oportunidade de venda'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título da Oportunidade / Proposta *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reposição Mensal de Grãos e Mercearia"
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none transition-all ${
                errors.title
                  ? 'border-red-500 ring-2 ring-red-100'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mercadinho / Cliente *
            </label>
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none transition-all ${
                errors.customer
                  ? 'border-red-500 ring-2 ring-red-100'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }`}
            >
              <option value="">Selecione um cliente cadastrado...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city}/{c.state || 'SP'})
                </option>
              ))}
            </select>
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Previsto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estágio Inicial
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="prospeccao">Prospecção</option>
                <option value="negociacao">Negociação</option>
                <option value="proposta">Proposta</option>
                <option value="fechado">Fechado (Ganho)</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo / Previsão Fechamento
              </label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendedor Responsável
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações & Histórico da Negociação
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Mercadinho pediu desconto de 5% no pagamento via PIX à vista..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {dealToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Salvar Negócio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
