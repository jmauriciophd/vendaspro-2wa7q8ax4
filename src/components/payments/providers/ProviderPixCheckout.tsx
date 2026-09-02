import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QrCode, Copy, Check, ShieldCheck, Zap } from 'lucide-react'
import { formatMoney } from '@/services/paymentService'

export interface ProviderPixCheckoutProps {
  chargeId: string
  pixCode?: string
  pixQrCodeBase64?: string
  amount: number
  providerName?: string
  onConfirmed?: () => void
}

export const ProviderPixCheckout: React.FC<ProviderPixCheckoutProps> = ({
  pixCode = '',
  pixQrCodeBase64,
  amount,
  providerName = 'PIX Instantâneo',
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <Card className="border-teal-100 bg-white shadow-sm">
      <CardContent className="p-6 text-center">
        <div className="flex items-center justify-between pb-4 mb-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-600" />
            <span className="font-semibold text-gray-900">Pagamento Instantâneo via PIX</span>
          </div>
          <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-medium">
            {providerName}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Abra o aplicativo do seu banco, escolha a opção <strong>PIX</strong> e escaneie o QR Code
          ou cole a chave Copia e Cola.
        </p>

        <div className="flex justify-center my-4">
          <div className="p-3 bg-white border-2 border-dashed border-teal-300 rounded-xl shadow-inner inline-block">
            {pixQrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${pixQrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto"
              />
            ) : (
              <div className="w-48 h-48 flex flex-col items-center justify-center bg-gray-50 rounded-lg text-gray-400">
                <QrCode className="w-24 h-24 text-teal-600 mb-2" />
                <span className="text-xs">QR Code Dinâmico</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border rounded-lg p-3 my-4 text-left">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Código PIX Copia e Cola:</span>
            <span>{formatMoney(amount)}</span>
          </div>
          <p className="font-mono text-xs text-gray-700 break-all select-all bg-white p-2 rounded border">
            {pixCode || '00020126360014BR.GOV.BCB.PIX...'}
          </p>
        </div>

        <Button
          onClick={handleCopy}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Código PIX Copiado!' : 'Copiar Código PIX'}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mt-4">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          Aprovação imediata e baixa automática no sistema
        </div>
      </CardContent>
    </Card>
  )
}
