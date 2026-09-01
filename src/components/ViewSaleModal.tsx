import React, { useEffect, useState } from 'react'
import type { Sale, SaleItem, CompanySettings, EmailLog, EmailDocType } from '@/types/crm'
import { saleService, companyService, emailLogService } from '@/services/crm'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/context/AuthContext'
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Store,
  User as UserIcon,
  CreditCard,
  ShoppingBag,
  FileText,
  FileSignature,
  Mail,
  MessageCircle,
  Send,
  Download,
  History,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import {
  buildNfeHtml,
  buildPromissoriaHtml,
  printHtml,
  generateAccessKey,
  type PromissoriaInstallment,
} from '@/lib/documents'
import { GenerateChargeModal } from '@/components/payments/GenerateChargeModal'
import { paymentService } from '@/services/paymentService'
import type { PaymentChargeListItem } from '@/types/payments'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface ViewSaleModalProps {
  isOpen: boolean
  onClose: () => void
  saleId: string | null
}

const paymentMethodLabel: any = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto Bancário',
}

type DocTab = 'nfe' | 'promissoria'

export const ViewSaleModal: React.FC<ViewSaleModalProps> = ({ isOpen, onClose, saleId }) => {
  const { user, isManager } = useAuth()
  const navigate = useNavigate()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(false)

  // Active sub-modal
  const [activeModal, setActiveModal] = useState<null | 'doc' | 'email' | 'logs'>(null)
  const [chargeModalOpen, setChargeModalOpen] = useState(false)
  const [docTab, setDocTab] = useState<DocTab>('nfe')

  // Promissoria form state
  const [installmentCount, setInstallmentCount] = useState(1)
  const [firstDueDate, setFirstDueDate] = useState('')

  // Email form state
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailDocType, setEmailDocType] = useState<EmailDocType>('nfe')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Cobranças vinculadas à venda (para alertas de estorno/reembolso)
  const [charges, setCharges] = useState<PaymentChargeListItem[]>([])
  const [refunding, setRefunding] = useState(false)

  const loadSale = async () => {
    if (!saleId) return
    setLoading(true)
    try {
      const { sale, items } = await saleService.getById(saleId)
      setSale(sale)
      setItems(items)
      const comp = await companyService.get()
      setCompany(comp)
      const logs = await emailLogService.getBySale(saleId)
      setEmailLogs(logs)
      // carrega cobranças vinculadas (não bloqueia a abertura do modal)
      try {
        const ch = await paymentService.listCharges({ sale_id: saleId })
        setCharges(ch || [])
      } catch {
        setCharges([])
      }
      // prefill email + promissoria
      if (sale.expand?.customer?.email) setEmailTo(sale.expand.customer.email)
      const defaultFirst = new Date()
      defaultFirst.setDate(defaultFirst.getDate() + 30)
      setFirstDueDate(defaultFirst.toISOString().split('T')[0])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && saleId) {
      loadSale()
      setActiveModal(null)
    }
  }, [isOpen, saleId])

  if (!isOpen || !saleId) return null

  const customer = sale?.expand?.customer
  const total = sale?.total || 0

  // ---- Helpers ----
  const buildNfeNumber = () => {
    if (!sale) return '000001'
    return String(Math.abs(sale.created.charCodeAt(0) % 9) + 1) + sale.id.slice(-5).toUpperCase()
  }

  const generateNfe = () => {
    if (!sale || !company) {
      toast.error('Dados da empresa não configurados.')
      return
    }
    const html = buildNfeHtml({
      sale,
      items,
      customer,
      company,
      number: buildNfeNumber(),
      accessKey: generateAccessKey(),
      logoUrl: company.logo ? pb.files.getUrl(company, company.logo) : undefined,
    })
    printHtml(html)
  }

  const generateInstallments = (): PromissoriaInstallment[] => {
    if (!sale) return []
    const count = Math.max(1, installmentCount)
    const per = Math.round((total / count) * 100) / 100
    const start = firstDueDate ? new Date(firstDueDate) : new Date()
    const arr: PromissoriaInstallment[] = []
    for (let i = 0; i < count; i++) {
      const d = new Date(start)
      d.setMonth(d.getMonth() + i)
      arr.push({
        number: i + 1,
        value: i === count - 1 ? Math.round((total - per * (count - 1)) * 100) / 100 : per,
        dueDate: d.toISOString(),
      })
    }
    return arr
  }

  const generatePromissoria = () => {
    if (!sale || !company) {
      toast.error('Dados da empresa não configurados.')
      return
    }
    if (total <= 0) {
      toast.error('Venda sem valor para gerar promissória.')
      return
    }
    const installments = generateInstallments()
    const html = buildPromissoriaHtml({
      sale,
      customer,
      company,
      totalValue: total,
      installments,
      number: 'NP-' + sale.id.slice(-6).toUpperCase(),
      emissionDate: new Date().toISOString(),
      logoUrl: company.logo ? pb.files.getUrl(company, company.logo) : undefined,
    })
    printHtml(html)
  }

  const formatMoney = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ---- Share links ----
  const buildSaleSummary = () => {
    if (!sale) return ''
    const lines = [
      `*Resumo da Venda*`,
      `Cliente: ${customer?.name || '-'}`,
      `Data: ${new Date(sale.sale_date || sale.created).toLocaleDateString('pt-BR')}`,
      `Valor Total: R$ ${formatMoney(total)}`,
      `Forma de Pagamento: ${paymentMethodLabel[sale.payment_method] || sale.payment_method}`,
      `Status: ${sale.payment_status === 'pago' ? 'Pago' : 'Pendente'}`,
      ``,
      `Itens:`,
      ...items.map(
        (it) =>
          `• ${it.expand?.product?.name || 'Produto'} - ${it.quantity}x R$ ${formatMoney(
            it.unit_price,
          )}`,
      ),
    ]
    return lines.join('\n')
  }

  const buildPhoneDigits = (raw?: string) => {
    if (!raw) return ''
    return raw.replace(/\D/g, '')
  }

  const openWhatsApp = () => {
    const raw = customer?.phone_whatsapp || customer?.phone || ''
    let digits = buildPhoneDigits(raw)
    if (digits && digits.length === 10) digits = '55' + digits
    else if (digits && digits.length === 11) digits = '55' + digits
    else if (digits && !digits.startsWith('55')) digits = '55' + digits
    const msg = encodeURIComponent(buildSaleSummary())
    const url = digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  const openTelegram = () => {
    const msg = encodeURIComponent(buildSaleSummary())
    const handle = customer?.telegram || ''
    const url = handle
      ? `https://t.me/${handle.replace(/^@/, '')}?text=${msg}`
      : `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${msg}`
    window.open(url, '_blank')
  }

  // ---- Email ----
  const fillEmailTemplate = (docType: EmailDocType) => {
    if (!company) return
    const subj = company.email_subject || 'Documento da sua compra - {empresa}'
    const body =
      company.email_body ||
      'Olá {cliente},\n\nSegue em anexo o documento.\n\nTotal: R$ {total}\nData: {data}\n\n{empresa}'
    const dataStr = new Date(sale?.sale_date || sale?.created || Date.now()).toLocaleDateString(
      'pt-BR',
    )
    setEmailSubject(
      subj
        .replace(/{empresa}/g, company.name || '')
        .replace(/{cliente}/g, customer?.name || '')
        .replace(/{total}/g, formatMoney(total))
        .replace(/{data}/g, dataStr),
    )
    setEmailBody(
      body
        .replace(/{empresa}/g, company.name || '')
        .replace(/{cliente}/g, customer?.name || '')
        .replace(/{total}/g, formatMoney(total))
        .replace(/{data}/g, dataStr),
    )
    setEmailDocType(docType)
    if (customer?.email) setEmailTo(customer.email)
  }

  const openEmailModal = (docType: EmailDocType) => {
    fillEmailTemplate(docType)
    setActiveModal('email')
  }

  // Gera o HTML completo do documento selecionado para anexar ao email.
  const buildDocHtml = (): string | null => {
    if (!sale || !company) return null
    if (emailDocType === 'nfe') {
      return buildNfeHtml({
        sale,
        items,
        customer,
        company,
        number: buildNfeNumber(),
        accessKey: generateAccessKey(),
        logoUrl: company.logo ? pb.files.getUrl(company, company.logo) : undefined,
      })
    }
    if (total <= 0) return null
    return buildPromissoriaHtml({
      sale,
      customer,
      company,
      totalValue: total,
      installments: generateInstallments(),
      number: 'NP-' + sale.id.slice(-6).toUpperCase(),
      emissionDate: new Date().toISOString(),
      logoUrl: company.logo ? pb.files.getUrl(company, company.logo) : undefined,
    })
  }

  const sendEmail = async () => {
    if (!sale || !emailTo) {
      toast.error('Informe o email do destinatário.')
      return
    }
    setSendingEmail(true)
    try {
      // Gera o HTML do documento e o envia como anexo — o cliente recebe o
      // documento e pode abri-lo / imprimi-lo como PDF.
      const docHtml = buildDocHtml()
      const attachmentFilename = docHtml
        ? emailDocType === 'nfe'
          ? `nf-e-${buildNfeNumber()}.html`
          : `nota-promissoria-${sale.id.slice(-6).toUpperCase()}.html`
        : undefined

      const res = await emailLogService.sendEmail({
        to_email: emailTo,
        subject: emailSubject || 'Documento da sua compra',
        body: emailBody,
        sale: sale.id,
        doc_type: emailDocType,
        sent_by: user?.id,
        attachment_html: docHtml || undefined,
        attachment_filename: attachmentFilename,
      })
      if (res.status === 'sent') {
        toast.success(`Documento anexado ao email e enviado para ${emailTo}`)
      } else {
        toast.error(res.message || 'Falha ao enviar email.')
      }
      const logs = await emailLogService.getBySale(sale.id)
      setEmailLogs(logs)
      if (res.status === 'sent') setActiveModal(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar email.')
    } finally {
      setSendingEmail(false)
    }
  }

  // ---- Estorno / Reembolso ----
  // Cobra o reembolso de uma cobrança paga vinculada à venda.
  const handleRefund = async (chargeId: string) => {
    if (!sale) return
    if (
      !confirm(
        'Confirma o estorno/reembolso desta cobrança paga? Esta ação será registrada na auditoria.',
      )
    ) {
      return
    }
    setRefunding(true)
    try {
      await paymentService.refund(chargeId, {
        reason: `Estorno automático — venda cancelada/paga (${sale.id})`,
      })
      toast.success('Reembolso solicitado com sucesso.')
      // recarrega cobranças
      const ch = await paymentService.listCharges({ sale_id: sale.id })
      setCharges(ch || [])
    } catch (err: any) {
      const msg = err?.response?.message || err?.message || 'Falha ao solicitar reembolso.'
      toast.error(msg)
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Detalhes da Venda</h3>
              <p className="text-xs text-slate-500">Comprovante de faturamento comercial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading || !sale ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Carregando dados da venda...
            </div>
          ) : (
            <>
              {/* Top Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Mercadinho
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{customer?.name || 'Mercadinho'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{customer?.city || ''}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Data da Venda
                  </span>
                  <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {new Date(sale.sale_date || sale.created).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vendedor: {sale.expand?.seller?.name || 'Vendedor'}
                  </p>
                </div>
              </div>

              {/* Status and Payment */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Forma de Pagamento:</span>
                  <span className="font-semibold text-slate-800">
                    {paymentMethodLabel[sale.payment_method] || sale.payment_method}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block text-right">Status:</span>
                  {(() => {
                    // Cobrança paga mais recente (para distinguir situações)
                    const paidCharge = charges.find((c) => c.status === 'paid')
                    const refundedCharge = charges.find(
                      (c) => c.status === 'refunded' || c.status === 'partially_refunded',
                    )
                    const expiredCharge = charges.find((c) => c.status === 'expired')
                    const paidAfterDue =
                      paidCharge &&
                      paidCharge.expires_at &&
                      paidCharge.paid_at &&
                      new Date(paidCharge.paid_at).getTime() >
                        new Date(paidCharge.expires_at).getTime()

                    if (sale.payment_status === 'pago') {
                      if (refundedCharge) {
                        return (
                          <span
                            title="Esta cobrança foi reembolsada/estornada."
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 cursor-help"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Estornado
                          </span>
                        )
                      }
                      if (paidAfterDue) {
                        return (
                          <span
                            title={`Pago após vencimento em ${new Date(paidCharge!.paid_at).toLocaleDateString('pt-BR')}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Pago (após vencimento)
                          </span>
                        )
                      }
                      return (
                        <span
                          title="Pagamento recebido dentro do prazo."
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-help"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Pago
                        </span>
                      )
                    }
                    if (expiredCharge) {
                      return (
                        <span
                          title="A cobrança venceu — gere um novo boleto/link."
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 cursor-help"
                        >
                          <Clock className="w-3 h-3" /> Cobrança vencida — gere novo boleto
                        </span>
                      )
                    }
                    return (
                      <span
                        title="Aguardando pagamento."
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-help"
                      >
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* Alerta de reembolso/estorno: venda cancelada/paga ou cobrança paga pendente de estorno */}
              {(() => {
                const paidCharge = charges.find((c) => c.status === 'paid')
                if (!paidCharge) return null
                // venda cancelada OU (paga mas com cobrança ainda ativa sem reembolso)
                const isCanceled = (sale as any).status === 'canceled'
                const needsRefund = isCanceled || sale.payment_status === 'pago'
                if (!needsRefund) return null
                return (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
                    <div className="flex items-start gap-2 text-red-800">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">
                          {isCanceled
                            ? '⚠️ Este pedido foi cancelado mas o pagamento foi recebido. Um reembolso/estorno precisa ser feito.'
                            : '⚠️ Esta venda foi paga e possui cobrança ativa. Confirme se há necessidade de estorno.'}
                        </p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          Cobrança #{paidCharge.external_charge_id} • R${' '}
                          {(paidCharge.final_amount || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          • Paga em{' '}
                          {paidCharge.paid_at
                            ? new Date(paidCharge.paid_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </p>
                      </div>
                    </div>
                    {isManager && (
                      <button
                        onClick={() => handleRefund(paidCharge.id)}
                        disabled={refunding}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                      >
                        {refunding ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>{refunding ? 'Estornando...' : 'Estornar pagamento'}</span>
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Itens Faturados ({items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item / Produto</th>
                        <th className="py-2.5 px-3 text-center">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Preço Un.</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const lineTotal = item.quantity * item.unit_price
                        return (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {item.expand?.product?.name || 'Produto'}
                              {(item.expand?.product?.ncm || item.expand?.product?.cfop) && (
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  NCM {item.expand.product.ncm || '-'} • CFOP{' '}
                                  {item.expand.product.cfop || '-'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {item.quantity} {item.expand?.product?.unit || 'un'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              R$ {item.unit_price.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              R$ {lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {sale.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Observações: </span>
                  {sale.notes}
                </div>
              )}

              {/* Action Buttons - Documents & Sharing */}
              <div className="space-y-2.5 pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Documentos Fiscais & Envio
                </p>
                {(() => {
                  const activeCharge = charges.find(
                    (c) =>
                      c.status === 'pending' ||
                      c.status === 'waiting_payment' ||
                      (c.status as string) === 'processing',
                  )
                  const paidCharge = charges.find((c) => c.status === 'paid')
                  const isPaid = sale.payment_status === 'pago' || Boolean(paidCharge)

                  if (isPaid) {
                    return (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold">Venda quitada com sucesso</span>
                        </div>
                        {paidCharge && (
                          <button
                            onClick={() => navigate(`/financeiro/cobrancas/${paidCharge.id}`)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 rounded-lg shadow-xs hover:bg-emerald-50 transition-colors"
                          >
                            Ver cobrança
                          </button>
                        )}
                      </div>
                    )
                  }

                  if (activeCharge) {
                    return (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold block truncate">
                              Cobrança ativa #
                              {activeCharge.external_charge_id ||
                                activeCharge.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-amber-700 block">
                              Aguardando pagamento • R${' '}
                              {(activeCharge.final_amount || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/financeiro/cobrancas/${activeCharge.id}`)}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-white border border-amber-300 rounded-lg shadow-xs hover:bg-amber-50 transition-colors shrink-0"
                        >
                          Ver cobrança
                        </button>
                      </div>
                    )
                  }

                  return null
                })()}

                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const activeCharge = charges.find(
                      (c) =>
                        c.status === 'pending' ||
                        c.status === 'waiting_payment' ||
                        (c.status as string) === 'processing',
                    )
                    const paidCharge = charges.find((c) => c.status === 'paid')
                    const isPaid = sale.payment_status === 'pago' || Boolean(paidCharge)
                    const isDisabled = isPaid || Boolean(activeCharge)

                    return (
                      <button
                        onClick={() => {
                          if (isDisabled) return
                          setChargeModalOpen(true)
                        }}
                        disabled={isDisabled}
                        title={
                          isPaid
                            ? 'Venda já paga. Não é permitido gerar nova cobrança.'
                            : activeCharge
                              ? 'Já existe uma cobrança ativa pendente para este pedido.'
                              : 'Gerar link/boleto/pix de pagamento para o cliente'
                        }
                        className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${
                          isDisabled
                            ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{isDisabled ? 'Cobrança existente' : 'Gerar pagamento'}</span>
                      </button>
                    )
                  })()}
                  <button
                    onClick={() => {
                      setDocTab('nfe')
                      setActiveModal('doc')
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Emitir NF-e</span>
                  </button>
                  <button
                    onClick={() => {
                      setDocTab('promissoria')
                      setActiveModal('doc')
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>Nota Promissória</span>
                  </button>
                  <button
                    onClick={openWhatsApp}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={openTelegram}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram</span>
                  </button>
                  <button
                    onClick={() => openEmailModal('nfe')}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Enviar por Email</span>
                  </button>
                  <button
                    onClick={() => setActiveModal('logs')}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>Histórico ({emailLogs.length})</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Grand Total */}
        {sale && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Valor Total do Pedido
            </span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              R$ {sale.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {/* ---- Document Modal (NF-e / Promissória) ---- */}
      {activeModal === 'doc' && sale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  {docTab === 'nfe' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <FileSignature className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {docTab === 'nfe' ? 'Emitir NF-e' : 'Gerar Nota Promissória'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Venda {sale.id.slice(-6).toUpperCase()} • R${' '}
                    {(sale.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Doc type tabs */}
              <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => setDocTab('nfe')}
                  className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                    docTab === 'nfe'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> NF-e
                </button>
                <button
                  onClick={() => setDocTab('promissoria')}
                  className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors border-l border-slate-200 ${
                    docTab === 'promissoria'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileSignature className="w-3.5 h-3.5" /> Nota Promissória
                </button>
              </div>

              {docTab === 'nfe' ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <p className="font-bold text-slate-700">Dados da NF-e</p>
                    <p>
                      <span className="text-slate-400">Emitente:</span>{' '}
                      <strong>{company?.name || '-'}</strong> — CNPJ {company?.cnpj || '-'}
                    </p>
                    <p>
                      <span className="text-slate-400">Destinatário:</span>{' '}
                      <strong>{customer?.name || '-'}</strong> — CNPJ/CPF {customer?.cnpj || '-'}
                    </p>
                    <p>
                      <span className="text-slate-400">Itens:</span> {items.length} produto(s) •
                      Valor: R$ {(sale.total || 0).toFixed(2)}
                    </p>
                    <p>
                      <span className="text-slate-400">Impostos:</span> ICMS 18% calculado sobre o
                      subtotal
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    A NF-e será gerada como PDF (use &quot;Salvar como PDF&quot; na janela de
                    impressão).
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nº de Parcelas
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={installmentCount}
                        onChange={(e) =>
                          setInstallmentCount(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1º Vencimento
                      </label>
                      <input
                        type="date"
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-700 mb-1.5">Resumo das Parcelas</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {generateInstallments().map((i) => (
                        <div
                          key={i.number}
                          className="flex items-center justify-between text-[11px] text-slate-600"
                        >
                          <span>
                            Parcela {i.number} — {new Date(i.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="font-semibold text-slate-800">
                            R$ {i.value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200">
                      Devedor: <strong>{customer?.name || '-'}</strong> • Beneficiário:{' '}
                      <strong>{company?.name || '-'}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => openEmailModal(docTab)}
                className="px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Enviar por Email</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => (docTab === 'nfe' ? generateNfe() : generatePromissoria())}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Gerar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Email Modal ---- */}
      {activeModal === 'email' && sale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Enviar Documento por Email</h3>
                  <p className="text-xs text-slate-500">
                    Anexo: {emailDocType === 'nfe' ? 'NF-e' : 'Nota Promissória'} (HTML imprimível
                    como PDF)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fillEmailTemplate('nfe')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 justify-center ${
                    emailDocType === 'nfe'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Anexar NF-e
                </button>
                <button
                  onClick={() => fillEmailTemplate('promissoria')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 justify-center ${
                    emailDocType === 'promissoria'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileSignature className="w-3.5 h-3.5" /> Anexar Promissória
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destinatário *
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@cliente.com.br"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>

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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corpo do Email
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={7}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Variáveis: {'{cliente}'}, {'{empresa}'}, {'{total}'}, {'{data}'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={sendEmail}
                disabled={sendingEmail}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
              >
                {sendingEmail ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{sendingEmail ? 'Enviando...' : 'Enviar Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Email History Modal ---- */}
      {activeModal === 'logs' && sale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Histórico de Envios</h3>
                  <p className="text-xs text-slate-500">Documentos enviados desta venda</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {emailLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhum envio registrado para esta venda.
                </div>
              ) : (
                <div className="space-y-2">
                  {emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          log.doc_type === 'nfe'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        {log.doc_type === 'nfe' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <FileSignature className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {log.subject || 'Sem assunto'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Para: {log.to_email} • {new Date(log.created).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {log.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                          Falhou
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Enviado
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Gerar Cobrança ---- */}
      <GenerateChargeModal
        isOpen={chargeModalOpen}
        onClose={() => setChargeModalOpen(false)}
        sale={sale}
        onGenerated={(chargeId) => {
          setChargeModalOpen(false)
          navigate(`/financeiro/cobrancas/${chargeId}`)
        }}
      />
    </div>
  )
}
