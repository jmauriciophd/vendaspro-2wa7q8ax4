import React, { useState, useRef, useEffect } from 'react'
import type { CompanySettings } from '@/types/crm'
import { companyService, smtpService } from '@/services/crm'
import { useAuth } from '@/context/AuthContext'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import {
  X,
  Building2,
  CheckCircle,
  Upload,
  Trash2,
  Image as ImageIcon,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'

interface CompanySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  company: CompanySettings | null
  onSaved: () => void
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  company,
  onSaved,
}) => {
  const { can, isAdmin } = useAuth()
  const canEditSettings = isAdmin || can('settings.edit')
  const [name, setName] = useState(company?.name || '')
  const [cnpj, setCnpj] = useState(company?.cnpj || '')
  const [ie, setIe] = useState(company?.ie || '')
  const [im, setIm] = useState(company?.im || '')
  const [address, setAddress] = useState(company?.address || '')
  const [number, setNumber] = useState(company?.number || '')
  const [neighborhood, setNeighborhood] = useState(company?.neighborhood || '')
  const [city, setCity] = useState(company?.city || '')
  const [state, setState] = useState(company?.state || '')
  const [cep, setCep] = useState(company?.cep || '')
  const [phone, setPhone] = useState(company?.phone || '')
  const [email, setEmail] = useState(company?.email || '')
  const [emailSubject, setEmailSubject] = useState(company?.email_subject || '')
  const [emailBody, setEmailBody] = useState(company?.email_body || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [logoRemoving, setLogoRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // SMTP Test State
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean
    host: string
    port: string
    from: string
  } | null>(null)
  const [isTestingSmtp, setIsTestingSmtp] = useState(false)
  const [testEmailDestination, setTestEmailDestination] = useState('')
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    error?: string
  } | null>(null)

  const checkSmtp = async () => {
    try {
      const status = await smtpService.getStatus()
      setSmtpStatus(status)
    } catch {
      setSmtpStatus({ configured: false, host: '', port: '587', from: '' })
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkSmtp()
    }
  }, [isOpen])

  const handleSendTestEmail = async () => {
    setIsTestingSmtp(true)
    setTestResult(null)
    try {
      const res = await smtpService.sendTestEmail(testEmailDestination.trim() || undefined)
      setTestResult(res)
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Falha ao executar teste de envio.',
      })
      toast.error('Erro ao enviar e-mail de teste')
    } finally {
      setIsTestingSmtp(false)
    }
  }

  React.useEffect(() => {
    if (company) {
      setName(company.name || '')
      setCnpj(company.cnpj || '')
      setIe(company.ie || '')
      setIm(company.im || '')
      setAddress(company.address || '')
      setNumber(company.number || '')
      setNeighborhood(company.neighborhood || '')
      setCity(company.city || '')
      setState(company.state || '')
      setCep(company.cep || '')
      setPhone(company.phone || '')
      setEmail(company.email || '')
      setEmailSubject(company.email_subject || '')
      setEmailBody(company.email_body || '')
      setLogoFile(null)
      setLogoPreview(company.logo ? pb.files.getUrl(company, company.logo) : '')
      setLogoRemoving(false)
    }
  }, [company])

  if (!isOpen) return null

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setLogoRemoving(false)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
    setLogoRemoving(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nome da empresa é obrigatório')
      return
    }
    setIsSubmitting(true)
    try {
      await companyService.save({
        name: name.trim(),
        cnpj: cnpj.trim() || undefined,
        ie: ie.trim() || undefined,
        im: im.trim() || undefined,
        address: address.trim() || undefined,
        number: number.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        cep: cep.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        email_subject: emailSubject,
        email_body: emailBody,
      })

      // Upload/remove do logo
      if (logoFile) {
        await companyService.saveLogo(logoFile)
      } else if (logoRemoving) {
        await companyService.saveLogo(null)
      }

      toast.success('Dados da empresa salvos!')
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar dados da empresa')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Dados Fiscais da Empresa</h3>
              <p className="text-xs text-slate-500">Emitente de NF-e e Nota Promissória</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Logo Upload */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Logo da Empresa (NF-e / Promissória)
            </p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[11px] text-slate-500">
                  A logo aparece no cabeçalho da NF-e e da Nota Promissória, ao lado dos dados do
                  emitente. PNG, JPG ou WEBP até 2MB.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoPreview ? 'Trocar logo' : 'Enviar logo'}</span>
                  </button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razão Social *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Minha Empresa LTDA"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ</label>
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
                Inscrição Municipal (IM)
              </label>
              <input
                type="text"
                value={im}
                onChange={(e) => setIm(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 3000-0000"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-3 gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Logradouro"
                className="col-span-2 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Nº"
                className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="CEP"
                className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                className="col-span-2 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="SP"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none uppercase"
              />
            </div>

            <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Template de Email (variáveis: {'{cliente}'}, {'{empresa}'}, {'{total}'}, {'{data}'})
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assunto</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corpo</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={5}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono text-xs"
                />
              </div>
            </div>

            {/* SMTP Shortcut & Status Section */}
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Servidor SMTP da Empresa</span>
                </div>
                {smtpStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Configurado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    Não Configurado
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-2 bg-white p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600">
                  As configurações de servidor SMTP, porta, usuário, segurança e remetente agora são
                  gerenciadas centralmente pelo painel em <strong>E-mail / SMTP</strong>, com
                  armazenamento criptografado da senha.
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    Host: <strong>{smtpStatus?.host || 'Não definido'}</strong> (
                    {smtpStatus?.port || '587'})
                  </span>
                  <a
                    href="/configuracoes/email"
                    onClick={() => onClose()}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
                  >
                    Gerenciar SMTP completo &rarr;
                  </a>
                </div>
              </div>
            </div>
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
