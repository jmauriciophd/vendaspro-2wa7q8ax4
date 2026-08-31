import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { History, RotateCcw, Clock, User, Check, Loader2 } from 'lucide-react'
import type { PageVersion } from '@/types/builder'
import { pageVersionService } from '@/services/builder'
import { toast } from 'sonner'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  pageId: string
  onVersionRestored: () => void
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  pageId,
  onVersionRestored,
}) => {
  const [versions, setVersions] = useState<PageVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const loadVersions = async () => {
    if (!pageId) return
    setIsLoading(true)
    try {
      const data = await pageVersionService.getByPage(pageId)
      setVersions(data)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [isOpen, pageId])

  const handleRestore = async (version: PageVersion) => {
    if (
      !confirm(
        `Deseja realmente restaurar a Versão #${version.version_number}? As alterações atuais serão salvas em uma nova versão.`,
      )
    ) {
      return
    }

    setIsRestoring(true)
    try {
      await pageVersionService.restore(pageId, version.id)
      toast.success(`Versão #${version.version_number} restaurada com sucesso!`)
      onVersionRestored()
      onClose()
    } catch (err: any) {
      toast.error('Erro ao restaurar versão: ' + (err?.message || 'Falha'))
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <History className="w-5 h-5 text-indigo-600" />
            Histórico de Versões da Página
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Visualize o histórico de alterações, reversões e restaure versões salvas anteriormente
            com segurança.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-3 min-h-[250px] pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Carregando versões...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum histórico anterior</p>
              <p className="text-xs text-slate-400 mt-1">
                Novas versões são salvas automaticamente a cada publicação ou alteração no layout.
              </p>
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  idx === 0
                    ? 'border-indigo-200 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      v{ver.version_number}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Atual
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-800">
                      {ver.notes || 'Alteração salva'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ver.created).toLocaleString('pt-BR')}
                    </span>
                    {ver.expand?.created_by && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {ver.expand.created_by.name}
                      </span>
                    )}
                  </div>
                </div>

                {idx !== 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRestoring}
                    onClick={() => handleRestore(ver)}
                    className="text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
