import React, { useState, useEffect } from 'react'
import type { Customer } from '@/types/crm'
import { customerService } from '@/services/crm'
import { toast } from 'sonner'
import { X, Building2, CheckCircle, Trash2 } from 'lucide-react'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customerToEdit?: Customer | null
  onSaved: () => void
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [ie, setIe] = useState('')
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('')
  const [telegram, setTelegram] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [number, setNumber] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('SP')
  const [neighborhood, setNeighborhood] = useState('')
  const [size, setSize] = useState<'pequeno' | 'medio' | 'grande'>('pequeno')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '')
      setCnpj(customerToEdit.cnpj || '')
      setIe(customerToEdit.ie || '')
      setPhoneWhatsapp(customerToEdit.phone_whatsapp || '')
      setTelegram(customerToEdit.telegram || '')
      setOwnerName(customerToEdit.owner_name || '')
      setPhone(customerToEdit.phone || '')
      setEmail(customerToEdit.email || '')
      setAddress(customerToEdit.address || '')
      setNumber(customerToEdit.number || '')
      setCity(customerToEdit.city || '')
      setState(customerToEdit.state || 'SP')
      setNeighborhood(customerToEdit.neighborhood || '')
      setSize(customerToEdit.size || 'pequeno')
      setStatus(customerToEdit.status || 'ativo')
      setNotes(customerToEdit.notes || '')
    } else {
      setName('')
      setCnpj('')
      setIe('')
      setPhoneWhatsapp('')
      setTelegram('')
      setOwnerName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNumber('')
      setCity('')
      setState('SP')
      setNeighborhood('')
      setSize('pequeno')
      setStatus('ativo')
      setNotes('')
    }
    setErrors({})
  }, [customerToEdit, isOpen])

  if (!isOpen) return null

  const validate = () => {
    const errs: { [key: string]: string } = {}
    if (!name.trim()) errs.name = 'Nome do mercadinho é obrigatório'
    if (!city.trim()) errs.city = 'Cidade é obrigatória'
    if (email && !/\S+@\S+\.\S+/.test(email)) errs.email = 'E-mail inválido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const payload: Partial<Customer> = {
        name: name.trim(),
        cnpj: cnpj.trim() || undefined,
        ie: ie.trim() || undefined,
        phone_whatsapp: phoneWhatsapp.trim() || undefined,
        telegram: telegram.trim() || undefined,
        owner_name: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        number: number.trim() || undefined,
        city: city.trim(),
        state: state.trim() || 'SP',
        neighborhood: neighborhood.trim() || undefined,
        size,
        status,
        notes: notes.trim() || undefined,
      }

      if (customerToEdit) {
        await customerService.update(customerToEdit.id, payload)
        toast.success(`Mercadinho "${name}" atualizado!`)
      } else {
        await customerService.create(payload)
        toast.success(`Mercadinho "${name}" cadastrado com sucesso!`)
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar mercadinho')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!customerToEdit) return
    if (!confirm(`Deseja realmente remover o cliente "${customerToEdit.name}"?`)) return

    setIsDeleting(true)
    try {
      await customerService.delete(customerToEdit.id)
      toast.success('Cliente removido com sucesso')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir cliente. Verifique se existem vendas vinculadas.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {customerToEdit ? 'Editar Mercadinho' : 'Novo Cliente / Mercadinho'}
              </h3>
              <p className="text-xs text-slate-500">
                {customerToEdit
                  ? 'Atualize os dados comerciais'
                  : 'Cadastre um novo mercadinho na carteira'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Fantasia do Mercadinho *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mercado Bom Preço"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none transition-all ${
                  errors.name
                    ? 'border-red-500 ring-2 ring-red-100'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ / CPF</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inscrição Estadual (IE)
              </label>
              <input
                type="text"
                value={ie}
                onChange={(e) => setIe(e.target.value)}
                placeholder="123.456.789.111"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsável / Comprador
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nome do proprietário"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone Fixo
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 3000-0000"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp (com DDD)
              </label>
              <input
                type="text"
                value={phoneWhatsapp}
                onChange={(e) => setPhoneWhatsapp(e.target.value)}
                placeholder="5511987654321"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telegram (username)
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@usuario ou usuario"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@mercadinho.com.br"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                  errors.email
                    ? 'border-red-500 ring-2 ring-red-100'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço (Rua / Logradouro)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua das Flores"
                  className="col-span-2 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Nº / Sala"
                  className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Pinheiros"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade / UF *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className={`col-span-2 px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                    errors.city
                      ? 'border-red-500 ring-2 ring-red-100'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none uppercase"
                />
              </div>
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Porte do Estabelecimento
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="pequeno">Pequeno (1-2 Caixas / Conveniência)</option>
                <option value="medio">Médio (3-5 Caixas / Bairro)</option>
                <option value="grande">Grande (6+ Caixas / Atacarejo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Cadastral
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Comerciais
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Detalhes sobre compras, logística, restrições..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {customerToEdit ? (
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
                    <span>Salvar Cliente</span>
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
