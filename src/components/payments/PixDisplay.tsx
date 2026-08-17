import React, { useState } from 'react'
import { X, Copy, Check, QrCode } from 'lucide-react'
import { toast } from 'sonner'

interface PixDisplayProps {
  pixCode: string
  qrcode?: string
  className?: string
}

/**
 * Exibe o QR Code (visual simulado) e o código copia-e-cola do PIX.
 * Como o backend retorna apenas o payload textual (não uma imagem base64),
 * o QR Code é representado por um placeholder visual estilizado.
 */
export const PixDisplay: React.FC<PixDisplayProps> = ({ pixCode, qrcode, className = '' }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      toast.success('Código PIX copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar o código.')
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl">
        <div className="w-44 h-44 bg-white border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-3">
          {qrcode ? (
            <img src={qrcode} alt="QR Code PIX" className="w-full h-full object-contain" />
          ) : (
            <>
              <QrCode className="w-20 h-20 text-slate-800" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                QR Code PIX
              </span>
            </>
          )}
        </div>
        <p className="text-[11px] text-slate-500 text-center max-w-[220px]">
          Escaneie o QR Code com o app do seu banco para pagar
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Código Copia e Cola
        </label>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={pixCode}
            className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className={`shrink-0 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  )
}
