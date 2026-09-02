import React, { useState } from 'react'
import {
  Copy,
  Check,
  FileText,
  Share2,
  Building2,
  User,
  DollarSign,
  Calendar,
  Barcode,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  formatMoney,
  formatDate,
  formatBoletoDigitableLine,
  resolvePaymentUrl,
} from '@/services/paymentService'

export interface BoletoViewData {
  boleto_url?: string
  boleto_barcode?: string
  boleto_digitable_line?: string
  boleto_nosso_numero?: string
  boleto_document_number?: string
  final_amount?: number
  expires_at?: string
  client_name?: string
  provider_name?: string
  external_charge_id?: string
}

interface BoletoViewProps {
  boleto?: BoletoViewData
  charge?: any
  data?: any
  /** Dados do cedente (empresa). Opcional — usa defaults do VendasPro. */
  cedente?: {
    name?: string
    document?: string
    bankName?: string
  }
  className?: string
  /** Quando true, esconde os botões de ação (usado em previews compactos). */
  hideActions?: boolean
}

/**
 * Representação visual estilizada de um boleto bancário (não é o PDF real).
 * Layout similar a um boleto: logotipo do banco, dados do cedente, sacado,
 * valor, vencimento, código de barras e linha digitável.
 */
export const BoletoView: React.FC<BoletoViewProps> = ({
  boleto: propBoleto,
  charge,
  data,
  cedente,
  className = '',
  hideActions = false,
}) => {
  const boleto: BoletoViewData =
    propBoleto ||
    (charge
      ? {
          boleto_url: charge.boleto_url,
          boleto_barcode: charge.boleto_barcode,
          boleto_digitable_line: charge.boleto_digitable_line,
          boleto_nosso_numero: charge.boleto_nosso_numero,
          boleto_document_number: charge.boleto_document_number,
          final_amount: charge.final_amount,
          expires_at: charge.expires_at,
          client_name: charge.client_name,
          provider_name: charge.provider_name,
          external_charge_id: charge.external_charge_id,
        }
      : data
        ? {
            boleto_url: data.pdfUrl || data.boleto_url,
            boleto_barcode: data.barcode || data.boleto_barcode,
            boleto_digitable_line: data.digitableLine || data.boleto_digitable_line,
            boleto_nosso_numero: data.nossoNumero || data.boleto_nosso_numero,
            boleto_document_number: data.documentNumber || data.boleto_document_number,
            final_amount: data.amount || data.final_amount,
            expires_at: data.dueDate || data.expires_at,
            client_name: data.customerName || data.client_name,
            provider_name: data.providerName || data.provider_name,
            external_charge_id: data.externalChargeId || data.external_charge_id,
          }
        : {})
  const [copiedField, setCopiedField] = useState<'line' | 'barcode' | null>(null)

  const handleCopy = async (value: string, field: 'line' | 'barcode') => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      toast.success(field === 'line' ? 'Linha digitável copiada!' : 'Código de barras copiado!')
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  const handleShare = async () => {
    const line = boleto.boleto_digitable_line || ''
    const url = resolvePaymentUrl(boleto.boleto_url)
    const text =
      `Boleto VendasPro — ${boleto.provider_name || ''}\n` +
      `Valor: R$ ${formatMoney(boleto.final_amount)}\n` +
      `Vencimento: ${formatDate(boleto.expires_at)}\n` +
      (line ? `Linha digitável: ${formatBoletoDigitableLine(line)}\n` : '') +
      (url ? `Link: ${url}` : '')
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Boleto VendasPro', text })
      } catch {
        // usuário cancelou
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Dados do boleto copiados!')
      } catch {
        toast.error('Não foi possível compartilhar.')
      }
    }
  }

  const line = boleto.boleto_digitable_line || ''
  const barcode = boleto.boleto_barcode || ''
  const bankName = cedente?.bankName || boleto.provider_name || 'Banco'
  const cedenteName = cedente?.name || 'VendasPro Comércio Ltda'
  const cedenteDoc = cedente?.document || '12.345.678/0001-90'

  return (
    <div
      className={`bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden ${className}`}
    >
      {/* Cabeçalho do boleto */}
      <div className="px-5 py-4 border-b-2 border-slate-300 bg-slate-50/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
            {bankName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{bankName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Boleto Bancário</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Recibo do Sacador
          </p>
          <p className="text-[11px] font-mono text-slate-500">{boleto.external_charge_id || '—'}</p>
        </div>
      </div>

      {/* Corpo — dados do cedente / sacado / valor */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Cedente
            </span>
            <p className="text-xs font-bold text-slate-800 mt-1">{cedenteName}</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">CNPJ: {cedenteDoc}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" /> Sacado
            </span>
            <p className="text-xs font-bold text-slate-800 mt-1">
              {boleto.client_name || 'Cliente'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pagador do boleto</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Valor
            </span>
            <p className="text-sm font-bold text-emerald-700 mt-1">
              R$ {formatMoney(boleto.final_amount)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Vencimento
            </span>
            <p className="text-sm font-bold text-amber-700 mt-1">{formatDate(boleto.expires_at)}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3" /> Nosso Número
            </span>
            <p className="text-sm font-bold text-indigo-700 mt-1 font-mono break-all">
              {boleto.boleto_nosso_numero || '—'}
            </p>
          </div>
        </div>

        {/* Código de barras visual */}
        <div className="p-4 rounded-xl bg-white border border-slate-300">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
            <Barcode className="w-3 h-3" /> Código de Barras
          </span>
          <div className="flex items-center justify-center py-2">
            {barcode ? (
              <div
                className="h-12 w-full max-w-md"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent ${
                    3 + (barcode.charCodeAt(0) % 4)
                  }px)`,
                  backgroundSize: '100% 100%',
                }}
                aria-label={`Código de barras: ${barcode}`}
              />
            ) : (
              <div className="h-12 w-full max-w-md bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">
                Código de barras indisponível
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono text-center mt-1 break-all">
            {barcode || '—'}
          </p>
        </div>

        {/* Linha digitável */}
        <div className="p-4 rounded-xl bg-white border border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Linha Digitável
            </span>
            {line && (
              <button
                onClick={() => handleCopy(line, 'line')}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'line' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedField === 'line' ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          <p className="text-sm font-mono font-bold text-slate-800 tracking-wider break-all">
            {line ? formatBoletoDigitableLine(line) : '—'}
          </p>
        </div>

        {/* Documento */}
        {boleto.boleto_document_number && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Nº do Documento</span>
            <span className="font-mono font-semibold text-slate-700">
              {boleto.boleto_document_number}
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      {!hideActions && (
        <div className="px-5 py-4 border-t-2 border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-2">
          <a
            href={resolvePaymentUrl(boleto.boleto_url) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[180px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Abrir boleto
          </a>
          <button
            onClick={() => handleCopy(line, 'line')}
            disabled={!line}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {copiedField === 'line' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            Copiar linha
          </button>
          <button
            onClick={() => handleCopy(barcode, 'barcode')}
            disabled={!barcode}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {copiedField === 'barcode' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Barcode className="w-3.5 h-3.5" />
            )}
            Código de barras
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </button>
        </div>
      )}
    </div>
  )
}
