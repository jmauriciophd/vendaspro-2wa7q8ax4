import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'

export interface CancelSaleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  hasActiveCharge?: boolean
  loading?: boolean
}

/**
 * Modal de confirmação padronizado para cancelamento / exclusão de venda.
 * Padrão especificado:
 * - Título: "Cancelar operação"
 * - Mensagem: "Deseja cancelar esta operação?"
 * - Descrição: "Esta ação alterará o status da venda para cancelada." (ou excluirá o registro)
 * - Botão secundário: "Não"
 * - Botão principal: "Sim, cancelar"
 * - Se houver cobrança ativa: "A cobrança ativa também será cancelada."
 */
export const CancelSaleModal: React.FC<CancelSaleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hasActiveCharge = false,
  loading = false,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
        <AlertDialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Cancelar operação
            </AlertDialogTitle>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              Deseja cancelar esta operação?
            </p>
          </div>
          <AlertDialogDescription className="text-xs text-slate-600 space-y-1">
            <span className="block">Esta ação alterará o status da venda para cancelada.</span>
            {hasActiveCharge && (
              <span className="block font-medium text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                A cobrança ativa também será cancelada.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 sm:space-x-2">
          <AlertDialogCancel
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-none rounded-xl cursor-pointer"
          >
            Não
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async (e) => {
              e.preventDefault()
              await onConfirm()
              onClose()
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs cursor-pointer border-none"
          >
            {loading ? 'Cancelando...' : 'Sim, cancelar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
