import { useEffect, useState } from 'react'
import {
  CreditCard,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Info,
  FlaskConical,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { paymentService } from '@/services/paymentService'
import type {
  PaymentProvider,
  FinancialAccount,
  PaymentMethod,
  PaymentProviderStatus,
  PaymentEnvironment,
} from '@/types/payments'

const ALL_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'link', label: 'Link de Pagamento' },
]

type Tab = 'providers' | 'accounts'

export default function PaymentSettings() {
  const [tab, setTab] = useState<Tab>('providers')
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [providerModal, setProviderModal] = useState<PaymentProvider | null | 'new'>(null)
  const [accountModal, setAccountModal] = useState<FinancialAccount | null | 'new'>(null)
  const [instructionsModal, setInstructionsModal] = useState<PaymentProvider | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [provs, accs] = await Promise.all([
        paymentService.listProviders(),
        paymentService.listAccounts(),
      ])
      setProviders(provs)
      setAccounts(accs)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggleProvider = async (p: PaymentProvider) => {
    try {
      await paymentService.updateProvider(p.id, {
        status: p.status === 'active' ? 'inactive' : 'active',
      })
      toast.success('Provedor atualizado.')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar provedor.')
    }
  }

  const handleDeleteProvider = async (p: PaymentProvider) => {
    if (!confirm(`Remover o provedor "${p.name}"?`)) return
    try {
      await paymentService.deleteProvider(p.id)
      toast.success('Provedor removido.')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao remover provedor.')
    }
  }

  const handleTestWebhook = async (p: PaymentProvider) => {
    if (p.environment !== 'sandbox') {
      toast.error('Teste de webhook só é permitido em ambiente sandbox.')
      return
    }
    if (p.slug !== 'mercadopago') {
      toast.error('Teste de webhook disponível apenas para Mercado Pago.')
      return
    }
    setTestingId(p.id)
    try {
      const res = await paymentService.testMercadoPagoWebhook()
      toast.success(res.message || 'Webhook de teste processado.')
      load()
    } catch (err) {
      console.error(err)
      let msg =
        (err as any)?.response?.message || (err as any)?.message || 'Erro ao testar webhook.'
      if (
        msg.includes('Nenhuma cobrança encontrada') &&
        !msg.includes('Crie uma cobrança de teste')
      ) {
        msg =
          'Nenhuma cobrança encontrada para testar. Crie uma cobrança de teste e tente realizar o pagamento no sandbox antes de testar o webhook.'
      }
      toast.error(msg)
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-600" /> Configurações de Pagamentos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gerencie provedores de pagamento e contas financeiras
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold w-fit">
        <button
          onClick={() => setTab('providers')}
          className={`px-5 py-2 transition-colors flex items-center gap-1.5 ${
            tab === 'providers'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Provedores
        </button>
        <button
          onClick={() => setTab('accounts')}
          className={`px-5 py-2 transition-colors border-l border-slate-200 flex items-center gap-1.5 ${
            tab === 'accounts'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" /> Contas Financeiras
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">Carregando...</div>
      ) : tab === 'providers' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Provedores de Pagamento</h3>
            <button
              onClick={() => setProviderModal('new')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo provedor
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {providers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Nenhum provedor configurado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">Slug</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Ambiente</th>
                      <th className="py-3 px-4">Métodos</th>
                      <th className="py-3 px-4">Credenciais</th>
                      <th className="py-3 px-4">Webhook</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {providers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.slug}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.environment === 'production'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {p.environment}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(p.methods || []).map((m) => (
                              <span
                                key={m}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                            <ShieldCheck
                              className={`w-3 h-3 ${p.webhook_configured ? 'text-emerald-500' : 'text-slate-300'}`}
                            />
                            <span>{p.api_key_masked || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit ${
                                p.webhook_configured
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {p.webhook_configured ? 'Configurado' : 'Não configurado'}
                            </span>
                            {p.slug === 'mercadopago' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setInstructionsModal(p)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer"
                                >
                                  <Info className="w-3 h-3" /> Instruções
                                </button>
                                {p.environment === 'sandbox' && (
                                  <button
                                    onClick={() => handleTestWebhook(p)}
                                    disabled={testingId === p.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer disabled:opacity-70"
                                  >
                                    {testingId === p.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FlaskConical className="w-3 h-3" />
                                    )}
                                    Testar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setProviderModal(p)}
                              title="Editar"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleProvider(p)}
                              title={p.status === 'active' ? 'Desativar' : 'Ativar'}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            >
                              {p.status === 'active' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteProvider(p)}
                              title="Remover"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Contas Financeiras</h3>
            <button
              onClick={() => setAccountModal('new')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova conta
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {accounts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Nenhuma conta financeira configurada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">Provedor</th>
                      <th className="py-3 px-4">Ambiente</th>
                      <th className="py-3 px-4">Ativa</th>
                      <th className="py-3 px-4">Padrão</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{a.name}</td>
                        <td className="py-3 px-4 text-slate-600">{a.provider_name || '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{a.environment}</td>
                        <td className="py-3 px-4">
                          {a.active ? (
                            <span className="text-emerald-600 font-semibold">Sim</span>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {a.is_default ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Padrão
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setAccountModal(a)}
                            title="Editar"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modais */}
      {providerModal !== null && (
        <ProviderModal
          provider={providerModal === 'new' ? null : providerModal}
          providers={providers}
          onClose={() => setProviderModal(null)}
          onSaved={() => {
            setProviderModal(null)
            load()
          }}
        />
      )}

      {instructionsModal && (
        <WebhookInstructionsModal
          provider={instructionsModal}
          onClose={() => setInstructionsModal(null)}
        />
      )}

      {accountModal !== null && (
        <AccountModal
          account={accountModal === 'new' ? null : accountModal}
          providers={providers}
          onClose={() => setAccountModal(null)}
          onSaved={() => {
            setAccountModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentProviderStatus }) {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    incomplete: 'Incompleto',
    error: 'Erro',
  }
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    incomplete: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
        colors[status] || colors.inactive
      }`}
    >
      {labels[status] || status}
    </span>
  )
}

// ----- Modal de Provedor -----
function ProviderModal({
  provider,
  providers,
  onClose,
  onSaved,
}: {
  provider: PaymentProvider | null
  providers: PaymentProvider[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(provider?.name || '')
  const [slug, setSlug] = useState(provider?.slug || '')
  const [status, setStatus] = useState<PaymentProviderStatus>(provider?.status || 'inactive')
  const [environment, setEnvironment] = useState<PaymentEnvironment>(
    provider?.environment || 'sandbox',
  )
  const [methods, setMethods] = useState<PaymentMethod[]>(provider?.methods || [])
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookConfigured, setWebhookConfigured] = useState(provider?.webhook_configured || false)
  const [saving, setSaving] = useState(false)

  const isMercadoPago =
    slug.trim().toLowerCase() === 'mercadopago' || provider?.slug === 'mercadopago'

  const toggleMethod = (m: PaymentMethod) => {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Nome e slug são obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name,
        slug: slug.toLowerCase().trim(),
        status,
        environment,
        methods,
        webhook_configured: webhookConfigured,
      }
      if (apiKey) payload.api_key = apiKey
      if (apiSecret) payload.api_secret = apiSecret
      if (webhookSecret) payload.webhook_secret = webhookSecret

      if (provider) {
        await paymentService.updateProvider(provider.id, payload)
        toast.success('Provedor atualizado.')
      } else {
        await paymentService.createProvider(payload)
        toast.success('Provedor criado.')
      }
      onSaved()
    } catch (err) {
      console.error(err)
      const msg = (err as any)?.response?.message || 'Erro ao salvar provedor.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800">
            {provider ? 'Editar Provedor' : 'Novo Provedor'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slug *</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="ex: mercadopago"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentProviderStatus)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="incomplete">Incompleto</option>
                <option value="error">Erro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ambiente</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as PaymentEnvironment)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Produção</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Métodos suportados
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_METHODS.map((m) => {
                const active = methods.includes(m.value)
                return (
                  <button
                    key={m.value}
                    onClick={() => toggleMethod(m.value)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Credenciais{' '}
              {provider && (
                <span className="font-normal normal-case">(em branco mantém o atual)</span>
              )}
            </p>
            {isMercadoPago && (
              <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
                No Mercado Pago, insira a <strong>Public Key</strong> no primeiro campo e o{' '}
                <strong>Access Token</strong> no segundo campo para evitar trocas acidentais de
                chaves.
              </p>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMercadoPago ? 'Public Key (Mercado Pago)' : 'API Key'}{' '}
                {provider && provider.api_key_masked && (
                  <span className="text-slate-400 font-mono">
                    (••••{provider.api_key_masked.slice(-4)})
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider
                    ? `••••${(provider.api_key_masked || '').slice(-4) || '••••'}`
                    : isMercadoPago
                      ? 'Public Key (Mercado Pago)'
                      : 'Informe a API key'
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMercadoPago ? 'Access Token (Mercado Pago)' : 'API Secret'}{' '}
                {provider && provider.api_secret_masked && (
                  <span className="text-slate-400 font-mono">({provider.api_secret_masked})</span>
                )}
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={
                  provider
                    ? '••••••••'
                    : isMercadoPago
                      ? 'Access Token (Mercado Pago)'
                      : 'Informe o secret'
                }
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Webhook Secret{' '}
                {provider && provider.webhook_secret_masked && (
                  <span className="text-slate-400 font-mono">
                    ({provider.webhook_secret_masked})
                  </span>
                )}
              </label>
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={provider ? '••••••••' : 'Informe o webhook secret'}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookConfigured}
                onChange={(e) => setWebhookConfigured(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              Webhook configurado
            </label>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- Modal de instruções do Webhook (Mercado Pago) -----
function WebhookInstructionsModal({
  provider,
  onClose,
}: {
  provider: PaymentProvider
  onClose: () => void
}) {
  const [config, setConfig] = useState<{ webhook_url: string; instructions: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    paymentService
      .getMercadoPagoConfig()
      .then((data) => {
        if (active) setConfig({ webhook_url: data.webhook_url, instructions: data.instructions })
      })
      .catch((err) => {
        console.error(err)
        toast.error('Erro ao carregar instruções do webhook.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [provider.id])

  const handleCopy = async () => {
    if (!config?.webhook_url) return
    try {
      await navigator.clipboard.writeText(config.webhook_url)
      setCopied(true)
      toast.success('URL copiada!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar.')
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Webhook — {provider.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL pública do webhook
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    readOnly
                    value={config?.webhook_url || ''}
                    className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-3.5 py-2 text-xs font-semibold rounded-xl border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Como configurar no painel do Mercado Pago
                </h4>
                <ol className="space-y-2">
                  {(config?.instructions || []).map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-slate-600">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <a
                href="https://www.mercadopago.com.br/developers/panel"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir painel do Mercado Pago
              </a>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-[11px] text-amber-700">
                  Após salvar a URL no painel do Mercado Pago, copie o <strong>Secret</strong>{' '}
                  gerado e cole no campo <strong>Webhook Secret</strong> ao editar este provedor. Em
                  ambiente de produção, toda notificação é validada via assinatura HMAC-SHA256.
                </p>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- Modal de Conta -----
function AccountModal({
  account,
  providers,
  onClose,
  onSaved,
}: {
  account: FinancialAccount | null
  providers: PaymentProvider[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(account?.name || '')
  const [providerId, setProviderId] = useState(account?.provider_id || '')
  const [accountReference, setAccountReference] = useState(account?.account_reference || '')
  const [environment, setEnvironment] = useState<PaymentEnvironment>(
    account?.environment || 'sandbox',
  )
  const [active, setActive] = useState(account?.active ?? true)
  const [isDefault, setIsDefault] = useState(account?.is_default ?? false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome da conta.')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name,
        provider_id: providerId || undefined,
        account_reference: accountReference,
        environment,
        active,
        is_default: isDefault,
      }
      if (account) {
        await paymentService.updateAccount(account.id, payload)
        toast.success('Conta atualizada.')
      } else {
        await paymentService.createAccount(payload)
        toast.success('Conta criada.')
      }
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar conta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800">
            {account ? 'Editar Conta' : 'Nova Conta Financeira'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Provedor</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="">— Selecione —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Referência da conta
            </label>
            <input
              value={accountReference}
              onChange={(e) => setAccountReference(e.target.value)}
              placeholder="ex: ACC-001"
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ambiente</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as PaymentEnvironment)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Produção</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              Ativa
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              Conta padrão
            </label>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
          >
            <Building2 className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
