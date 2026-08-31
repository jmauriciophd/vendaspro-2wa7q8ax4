import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { smtpService, companyService } from '@/services/crm'
import type { CompanyMailSettings, SmtpSecurityType } from '@/types/crm'
import { toast } from 'sonner'
import {
  Mail,
  Server,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info,
  KeyRound,
  RefreshCw,
  Lock,
  ArrowLeft,
  Building,
} from 'lucide-react'

export default function EmailSettings() {
  const { user, isAdmin, isSuperAdmin, can } = useAuth()
  const navigate = useNavigate()

  const canView = isSuperAdmin || isAdmin || can('settings.email.view') || can('settings.view')
  const canEdit = isSuperAdmin || isAdmin || can('settings.email.edit') || can('settings.edit')
  const canTest =
    isSuperAdmin ||
    isAdmin ||
    can('settings.email.test') ||
    can('settings.email.edit') ||
    can('settings.edit') ||
    can('settings.view')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Form fields
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState<number>(587)
  const [securityType, setSecurityType] = useState<SmtpSecurityType>('tls')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [passwordConfigured, setPasswordConfigured] = useState(false)
  const [fromAddress, setFromAddress] = useState('')
  const [fromName, setFromName] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [enabled, setEnabled] = useState(false)

  // Test & status metadata
  const [isConfigured, setIsConfigured] = useState(false)
  const [lastTestStatus, setLastTestStatus] = useState<'none' | 'success' | 'failed'>('none')
  const [lastTestedAt, setLastTestedAt] = useState('')
  const [lastTestError, setLastTestError] = useState('')

  // Test Modal / inline test
  const [showTestModal, setShowTestModal] = useState(false)
  const [testDestination, setTestDestination] = useState('')
  const [testFeedback, setTestFeedback] = useState<{
    success: boolean
    message: string
    error?: string
  } | null>(null)

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const data = await smtpService.getSettings()
      setSmtpHost(data.smtp_host || '')
      setSmtpPort(data.smtp_port || 587)
      setSecurityType((data.security_type as SmtpSecurityType) || 'tls')
      setSmtpUsername(data.smtp_username || '')
      setPasswordConfigured(Boolean(data.smtp_password_configured))
      setSmtpPassword('') // NUNCA carrega senha real
      setFromAddress(data.from_address || '')
      setFromName(data.from_name || 'VendasPro')
      setReplyTo(data.reply_to || '')
      setEnabled(Boolean(data.enabled))
      setIsConfigured(Boolean(data.is_configured))
      setLastTestStatus(data.last_test_status || 'none')
      setLastTestedAt(data.last_tested_at || '')
      setLastTestError(data.last_test_error || '')

      if (!testDestination && user?.email) {
        setTestDestination(user.email)
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações de e-mail:', err)
      toast.error(err?.message || 'Falha ao carregar configurações de e-mail.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      loadSettings()
    }
  }, [canView])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) {
      toast.error('Você não possui permissão para alterar as configurações de e-mail.')
      return
    }

    if (fromAddress && !/\S+@\S+\.\S+/.test(fromAddress)) {
      toast.error('E-mail remetente inválido.')
      return
    }
    if (replyTo && !/\S+@\S+\.\S+/.test(replyTo)) {
      toast.error('E-mail Reply-To inválido.')
      return
    }

    setIsSaving(true)
    try {
      const payload: Partial<CompanyMailSettings> = {
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort) || 587,
        smtp_username: smtpUsername.trim(),
        security_type: securityType,
        from_address: fromAddress.trim(),
        from_name: fromName.trim(),
        reply_to: replyTo.trim(),
        enabled: enabled,
      }

      // Só envia smtp_password se foi digitada nova senha
      if (smtpPassword.trim() !== '') {
        payload.smtp_password = smtpPassword
      }

      const res = await smtpService.saveSettings(payload)
      toast.success(res.message || 'Configurações de e-mail salvas com sucesso!')
      setSmtpPassword('') // Limpa campo de senha após envio seguro
      loadSettings()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao salvar configurações de e-mail.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!canTest) {
      toast.error('Você não possui permissão para executar o teste de e-mail.')
      return
    }

    const dest = testDestination.trim() || user?.email || ''
    if (!dest || !/\S+@\S+\.\S+/.test(dest)) {
      toast.error('Informe um e-mail de destino válido para o teste.')
      return
    }

    setIsTesting(true)
    setTestFeedback(null)
    try {
      const res = await smtpService.testEmail(dest)
      setTestFeedback(res)
      if (res.success) {
        toast.success(res.message)
        setLastTestStatus('success')
        setLastTestedAt(res.tested_at || new Date().toISOString())
        setLastTestError('')
      } else {
        toast.error(res.message)
        setLastTestStatus('failed')
        setLastTestError(res.error || res.message)
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        'Não foi possível enviar o e-mail. Verifique servidor, porta, usuário, senha e protocolo de segurança.'
      setTestFeedback({
        success: false,
        message: msg,
        error: err?.error,
      })
      toast.error('Falha no teste de conexão SMTP')
      setLastTestStatus('failed')
    } finally {
      setIsTesting(false)
    }
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800">Acesso restrito</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Você não possui permissão para visualizar as configurações de e-mail (
          <code>settings.email.view</code> necessária).
        </p>
      </div>
    )
  }

  // Status visual badge
  const renderStatusBadge = () => {
    if (!isConfigured) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400" />○ Não configurado
        </span>
      )
    }
    if (lastTestStatus === 'success') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />● Configurado e
          testado
        </span>
      )
    }
    if (lastTestStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />⚠ Falha no último teste
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-400" />○ Configurado, não testado
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Configurações de E-mail / SMTP
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie o servidor de e-mails transacionais da sua empresa de forma segura diretamente
            pelo painel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {renderStatusBadge()}
          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Servidor de Envio SMTP</h3>
                  <p className="text-xs text-slate-500">
                    Insira as credenciais do seu provedor de e-mail (Gmail, SendGrid, Amazon SES,
                    Locaweb, etc.)
                  </p>
                </div>
              </div>

              {/* Toggle Ativar Envio */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <label
                  htmlFor="enabled-toggle"
                  className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                >
                  Ativar envio
                </label>
                <input
                  id="enabled-toggle"
                  type="checkbox"
                  disabled={!canEdit}
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Host */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Servidor SMTP <span className="text-indigo-600">*</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="ex: smtp.exemplo.com ou smtp.gmail.com"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                />
              </div>

              {/* Porta */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Porta <span className="text-indigo-600">*</span>
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)}
                  placeholder="587"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                />
              </div>

              {/* Segurança */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Segurança / Protocolo
                </label>
                <select
                  disabled={!canEdit}
                  value={securityType}
                  onChange={(e) => setSecurityType(e.target.value as SmtpSecurityType)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                >
                  <option value="tls">TLS (Recomendado - 587)</option>
                  <option value="ssl">SSL (Porta 465)</option>
                  <option value="starttls">STARTTLS</option>
                  <option value="none">Nenhum (Porta 25)</option>
                </select>
              </div>

              {/* Usuário */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Usuário SMTP <span className="text-indigo-600">*</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="sistema@empresa.com.br"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                />
              </div>

              {/* Senha SMTP (armazenamento criptografado) */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha SMTP <span className="text-indigo-600">*</span>
                  </label>
                  {passwordConfigured && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Senha armazenada e criptografada
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    disabled={!canEdit}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={
                      passwordConfigured ? '••••••••••••••••' : 'Digite a senha ou token do SMTP'
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {passwordConfigured
                    ? 'Deixe em branco para manter a senha salva atual. Digite uma nova apenas se desejar alterá-la.'
                    : 'A senha é criptografada de forma reversível com a chave mestra e nunca exposta em tela ou requisições.'}
                </p>
              </div>

              {/* E-mail Remetente */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail remetente (From)
                </label>
                <input
                  type="email"
                  disabled={!canEdit}
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="sistema@empresa.com.br"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                />
              </div>

              {/* Nome Remetente */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome do remetente
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Minha Empresa Comercial"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                />
              </div>

              {/* Reply-To */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Responder para (Reply-To)
                </label>
                <input
                  type="email"
                  disabled={!canEdit}
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="atendimento@empresa.com.br"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                disabled={!canTest || !isConfigured}
                onClick={() => setShowTestModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-slate-600" />
                <span>Enviar e-mail de teste</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="submit"
                  disabled={!canEdit || isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar configurações</span>
                </button>
              </div>
            </div>
          </form>

          {/* Test Destination Inline Modal / Block */}
          {showTestModal && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold">Teste de Conectividade SMTP</h4>
                </div>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Fechar
                </button>
              </div>

              <p className="text-xs text-slate-300">
                O sistema tentará autenticar no host <code>{smtpHost || 'não informado'}</code> e
                enviar uma mensagem de teste real.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Enviar teste para:
                  </label>
                  <input
                    type="email"
                    value={testDestination}
                    onChange={(e) => setTestDestination(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="sm:self-end flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleSendTest}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isTesting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Enviar teste</span>
                  </button>
                </div>
              </div>

              {testFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    testFeedback.success
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
                      : 'bg-rose-950/80 text-rose-200 border-rose-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{testFeedback.message}</p>
                      {testFeedback.error && (
                        <p className="text-[11px] font-mono text-rose-300 mt-1">
                          Detalhe técnico: {testFeedback.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Info & Diagnostics Card */}
        <div className="space-y-6">
          {/* Status Diagnostic Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Diagnóstico de Segurança
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                  Estado do SMTP
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Envio Ativo:</span>
                  <span
                    className={`font-semibold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    {enabled ? 'Sim' : 'Não (Desativado)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Credenciais Salvas:</span>
                  <span
                    className={`font-semibold ${isConfigured ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {isConfigured ? 'Completas' : 'Incompletas'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Último Teste:</span>
                  <span className="font-semibold text-slate-800">
                    {lastTestedAt
                      ? new Date(lastTestedAt).toLocaleString('pt-BR')
                      : 'Nunca testado'}
                  </span>
                </div>
              </div>

              {lastTestError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Erro no último teste:
                  </span>
                  <p className="font-mono text-[11px] text-rose-700 break-words">{lastTestError}</p>
                </div>
              )}

              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  Armazenamento Seguro
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-800">
                  A senha SMTP é criptografada de forma reversível com chave mestra interna do Skip
                  Cloud. O sistema nunca expõe a credencial em APIs de leitura, logs de auditoria ou
                  HTML.
                </p>
              </div>
            </div>
          </div>

          {/* Integrated Modules List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              E-mails Integrados ao SMTP Dinâmico
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Recuperação de Senha:</strong> e-mails do fluxo de redefinição de acesso.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Notificação de Comissões:</strong> avisos automáticos aos vendedores
                  quando aprovadas ou pagas.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Envio de Documentos:</strong> notas promissórias e comprovantes de vendas.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
