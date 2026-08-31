import { useState, useEffect } from 'react'
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock,
  HardDrive,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Calendar,
  Layers,
  Settings,
  X,
  Info,
  Shield,
  FileText,
  History,
} from 'lucide-react'
import { backupService } from '@/services/crm'
import type { DatabaseBackup, DatabaseBackupSettings } from '@/types/crm'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

export default function Backups() {
  const { isSuperAdmin, isAdmin, can } = useAuth()

  // Permissões
  const canView = isSuperAdmin || isAdmin || can('backups.view')
  const canCreate = isSuperAdmin || isAdmin || can('backups.create')
  const canDownload = isSuperAdmin || isAdmin || can('backups.download')
  const canRestore = isSuperAdmin || can('backups.restore')
  const canDelete = isSuperAdmin || can('backups.delete')
  const canSettings = isSuperAdmin || isAdmin || can('backups.settings')

  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history')
  const [backups, setBackups] = useState<DatabaseBackup[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const [selectedBackup, setSelectedBackup] = useState<DatabaseBackup | null>(null)

  // Forms state
  const [createNotes, setCreateNotes] = useState('')
  const [createProtected, setCreateProtected] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [restoreConfirmation, setRestoreConfirmation] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{
    records_restored: number
    collections_restored: number
    safety_backup_id?: string
  } | null>(null)

  const [isDeleting, setIsDeleting] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<DatabaseBackupSettings>({
    auto_backup_enabled: true,
    frequency: 'daily',
    execution_time: '03:00',
    retention_days: 30,
    max_backups_kept: 15,
    include_audit_logs: true,
  })
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const loadBackups = async () => {
    if (!canView) return
    setLoading(true)
    try {
      const res = await backupService.getAll({ page, limit: 30 })
      setBackups(res.items || [])
      setTotalItems(res.totalItems || 0)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar lista de backups')
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    if (!canSettings) return
    setLoadingSettings(true)
    try {
      const res = await backupService.getSettings()
      if (res) setSettings(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSettings(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [page])

  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings()
    }
  }, [activeTab])

  // Realtime updates on backups
  useEffect(() => {
    const unsubPromise = pb.collection('database_backups').subscribe('*', () => {
      loadBackups()
    })
    return () => {
      unsubPromise.then((unsub) => unsub()).catch(() => {})
    }
  }, [])

  // Criar backup
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    setIsCreating(true)
    try {
      const res = await backupService.create({
        notes: createNotes.trim() || undefined,
        is_protected: createProtected,
        backup_type: 'manual',
      })
      toast.success(res.message || 'Backup criado com sucesso!')
      setCreateModalOpen(false)
      setCreateNotes('')
      setCreateProtected(false)
      loadBackups()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || err?.message || 'Falha ao criar backup.')
    } finally {
      setIsCreating(false)
    }
  }

  // Download seguro
  const handleDownload = async (backup: DatabaseBackup) => {
    if (!canDownload) return
    try {
      toast.loading('Gerando link seguro de download...', { id: 'download-toast' })
      const res = await backupService.getDownloadUrl(backup.id)
      toast.dismiss('download-toast')
      if (res.download_url) {
        // Criar link temporário e disparar download direto
        const fullUrl = pb.baseUrl + res.download_url
        const link = document.createElement('a')
        link.href = fullUrl
        link.download = res.filename || backup.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Download iniciado com sucesso!')
      }
    } catch (err: any) {
      toast.dismiss('download-toast')
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao realizar download do backup.')
    }
  }

  // Restaurar backup
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBackup || !canRestore) return
    if (restoreConfirmation.trim() !== 'RESTAURAR') {
      toast.error('Digite a palavra RESTAURAR exatamente em maiúsculas.')
      return
    }

    setIsRestoring(true)
    try {
      const res = await backupService.restore(selectedBackup.id, restoreConfirmation.trim())
      setRestoreResult(res.summary)
      toast.success(res.message || 'Banco de dados restaurado com sucesso!')
      loadBackups()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || err?.message || 'Erro crítico durante restauração.')
    } finally {
      setIsRestoring(false)
    }
  }

  // Excluir backup
  const handleDelete = async () => {
    if (!selectedBackup || !canDelete) return
    setIsDeleting(true)
    try {
      await backupService.delete(selectedBackup.id)
      toast.success('Backup excluído permanentemente.')
      setDeleteModalOpen(false)
      setSelectedBackup(null)
      loadBackups()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao excluir backup.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Salvar configurações
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSettings) return
    setIsSavingSettings(true)
    try {
      const res = await backupService.saveSettings(settings)
      toast.success(res.message || 'Configurações de retenção salvas com sucesso!')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar configurações.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Helpers de formatação
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Concluído
          </span>
        )
      case 'restored':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurado
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Processando
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Pendente
          </span>
        )
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Falhou
          </span>
        )
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'automatic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-sky-50 text-sky-700 border border-sky-200">
            Automático
          </span>
        )
      case 'pre_restore_safety':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
            Cópia Segurança
          </span>
        )
      case 'manual':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
            Manual
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Database className="w-5 h-5" />
            </div>
            <span>Backup do Banco de Dados</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {totalItems} backups
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie cópias de segurança do banco de dados do sistema, restauração e políticas de
            retenção.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => loadBackups()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          {canCreate && (
            <button
              onClick={() => {
                setCreateNotes('')
                setCreateProtected(false)
                setCreateModalOpen(true)
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar novo backup</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">SQLite / Skip Cloud</span>
            <p className="text-[11px] text-slate-500">Motor de Banco de Dados</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">
              {backups.filter((b) => b.status === 'completed' || b.status === 'restored').length}
            </span>
            <p className="text-[11px] text-slate-500">Backups Disponíveis</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">
              {backups.filter((b) => b.is_protected).length}
            </span>
            <p className="text-[11px] text-slate-500">Protegidos contra exclusão</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">Privado (PB Files)</span>
            <p className="text-[11px] text-slate-500">Armazenamento Protegido</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Backups</span>
        </button>

        {canSettings && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuração & Retenção</span>
          </button>
        )}
      </div>

      {/* Tab: Histórico */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando histórico de backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Nenhum backup encontrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Nenhuma cópia de segurança foi criada ainda. Clique em &quot;Criar novo backup&quot;
                para gerar a primeira cópia.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Arquivo</th>
                    <th className="py-3 px-4">Tamanho</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Criado por</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map((b) => {
                    const date = new Date(b.created)
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Data / Hora */}
                        <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {date.toLocaleDateString('pt-BR')}{' '}
                              {date.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Arquivo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono text-xs font-semibold text-slate-800 truncate block max-w-[200px]">
                                {b.filename}
                              </span>
                              {b.is_protected && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-bold">
                                  <Lock className="w-2.5 h-2.5" /> Protegido
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tamanho */}
                        <td className="py-3.5 px-4 text-slate-700 font-mono">
                          {formatBytes(b.size)}
                          {b.records_count !== undefined && b.records_count > 0 && (
                            <span className="text-[10px] text-slate-400 block">
                              {b.records_count} registros
                            </span>
                          )}
                        </td>

                        {/* Tipo */}
                        <td className="py-3.5 px-4">{getTypeBadge(b.backup_type)}</td>

                        {/* Criado por */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="font-medium">{b.created_by_name || 'Sistema'}</span>
                          {b.created_by_email && (
                            <span className="text-[10px] text-slate-400 block">
                              {b.created_by_email}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(b.status)}</td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver detalhes */}
                            <button
                              onClick={() => {
                                setSelectedBackup(b)
                                setDetailsModalOpen(true)
                              }}
                              title="Ver detalhes do backup"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* Download */}
                            {canDownload && b.status === 'completed' && (
                              <button
                                onClick={() => handleDownload(b)}
                                title="Download do arquivo de backup"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Restaurar */}
                            {canRestore &&
                              (b.status === 'completed' || b.status === 'restored') && (
                                <button
                                  onClick={() => {
                                    setSelectedBackup(b)
                                    setRestoreConfirmation('')
                                    setRestoreResult(null)
                                    setRestoreModalOpen(true)
                                  }}
                                  title="Restaurar este backup (Substitui dados atuais)"
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                            {/* Excluir */}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setSelectedBackup(b)
                                  setDeleteModalOpen(true)
                                }}
                                title="Excluir backup permanentemente"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Configurações & Retenção */}
      {activeTab === 'settings' && canSettings && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-3xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Políticas de Retenção e Backup Automático
              </h3>
              <p className="text-xs text-slate-500">
                Configure a frequência de execução agendada e os limites de retenção de arquivos.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Auto Backup Enabled */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Backup Automático Habilitado
                </label>
                <p className="text-[11px] text-slate-500">
                  Executa cópias automáticas em segundo plano via agendador (cron nativo).
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_backup_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, auto_backup_enabled: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>

            {/* Frequência & Horário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frequência de Execução
                </label>
                <select
                  value={settings.frequency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value="daily">Diário (Todos os dias)</option>
                  <option value="weekly">Semanal (Todo domingo)</option>
                  <option value="monthly">Mensal (1º dia do mês)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Horário de Execução
                </label>
                <input
                  type="time"
                  value={settings.execution_time}
                  onChange={(e) => setSettings({ ...settings, execution_time: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            {/* Retenção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Retenção Máxima (Dias)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.retention_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      retention_days: parseInt(e.target.value, 10) || 30,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Backups automáticos mais antigos que esse limite serão reciclados.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Limite de Cópias Automáticas
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.max_backups_kept}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_backups_kept: parseInt(e.target.value, 10) || 15,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Backups com flag &quot;Protegido&quot; nunca são excluídos automaticamente.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-70 cursor-pointer"
              >
                {isSavingSettings ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Criar Backup Manual */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Criar Novo Backup</h3>
                  <p className="text-xs text-slate-500">Cópia de segurança imediata</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  O backup exportará de forma íntegra e atômica todas as tabelas comerciais
                  (Clientes, Vendas, Produtos, Propostas, Comissões, Cobranças e Configurações).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Anotações / Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Ex: Backup antes de importação massiva"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="prot"
                  checked={createProtected}
                  onChange={(e) => setCreateProtected(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="prot" className="font-semibold text-slate-700 cursor-pointer">
                  Proteger este backup contra exclusão automática pela política de retenção
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processando banco...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      <span>Gerar Backup Agora</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restaurar Backup (CRÍTICO) */}
      {restoreModalOpen && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-900">
                    Restauração Crítica de Banco
                  </h3>
                  <p className="text-xs text-rose-700 font-mono">{selectedBackup.filename}</p>
                </div>
              </div>
              <button
                onClick={() => setRestoreModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Atenção: Os dados atuais serão substituídos pelos dados deste backup!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800">
                  Por segurança máxima, o sistema irá{' '}
                  <strong>gerar automaticamente um backup prévio de segurança</strong> do estado
                  atual antes de executar qualquer alteração.
                </p>
              </div>

              {restoreResult ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Restauração Concluída com Sucesso!</span>
                  </div>
                  <p className="text-[11px]">
                    Total de <strong>{restoreResult.records_restored} registros</strong> restaurados
                    em <strong>{restoreResult.collections_restored} tabelas</strong>.
                  </p>
                  {restoreResult.safety_backup_id && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      Backup prévio de segurança arquivado com ID: {restoreResult.safety_backup_id}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setRestoreModalOpen(false)
                      window.location.reload()
                    }}
                    className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs"
                  >
                    Recarregar Aplicação
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRestore} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Digite <span className="text-rose-600 font-mono">RESTAURAR</span> para
                      confirmar a operação:
                    </label>
                    <input
                      type="text"
                      value={restoreConfirmation}
                      onChange={(e) => setRestoreConfirmation(e.target.value)}
                      placeholder="RESTAURAR"
                      className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRestoreModalOpen(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isRestoring || restoreConfirmation.trim() !== 'RESTAURAR'}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isRestoring ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Restaurando banco...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Executar Restauração</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir Backup */}
      {deleteModalOpen && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Excluir este backup?</h3>
              <p className="text-xs text-slate-500">
                Essa operação removerá permanentemente o arquivo de backup{' '}
                <strong className="font-mono text-slate-700">{selectedBackup.filename}</strong> do
                armazenamento do sistema.
              </p>

              <div className="pt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs disabled:opacity-70"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhes do Backup */}
      {detailsModalOpen && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Metadados do Backup</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedBackup.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Arquivo
                  </span>
                  <span className="font-mono font-semibold text-slate-800 break-all">
                    {selectedBackup.filename}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tamanho Físico
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatBytes(selectedBackup.size)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tipo de Backup
                  </span>
                  <div className="mt-0.5">{getTypeBadge(selectedBackup.backup_type)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Status Atual
                  </span>
                  <div className="mt-0.5">{getStatusBadge(selectedBackup.status)}</div>
                </div>
              </div>

              {selectedBackup.checksum && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Checksum de Integridade (SHA-256)
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 break-all">
                    {selectedBackup.checksum}
                  </span>
                </div>
              )}

              {selectedBackup.collections_included &&
                selectedBackup.collections_included.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Tabelas / Collections Exportadas ({selectedBackup.collections_included.length}
                      )
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {selectedBackup.collections_included.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between px-2.5 py-1 bg-white rounded-lg border border-slate-100"
                        >
                          <span className="font-mono text-[11px] text-slate-700">{col.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                            {col.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {selectedBackup.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Observações
                  </span>
                  <p className="text-slate-700">{selectedBackup.notes}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
