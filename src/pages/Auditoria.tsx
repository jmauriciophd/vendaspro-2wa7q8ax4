import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  User,
  RefreshCw,
  Eye,
  X,
  Clock,
  Laptop,
  ArrowRight,
  Shield,
  FileSpreadsheet,
} from 'lucide-react'
import { auditLogService, userService } from '@/services/crm'
import type { AuditLog, User as UserType } from '@/types/crm'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserType[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(1)

  // Filtros
  const [search, setSearch] = useState('')
  const [selectedActor, setSelectedActor] = useState('all')
  const [selectedTarget, setSelectedTarget] = useState('all')
  const [selectedModule, setSelectedModule] = useState('all')
  const [selectedResult, setSelectedResult] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal de Detalhes
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [res, usersList] = await Promise.all([
        auditLogService.getAll({
          actor: selectedActor,
          target: selectedTarget,
          module: selectedModule,
          result: selectedResult,
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 30,
        }),
        userService.getAll().catch(() => []),
      ])

      setLogs(res.items)
      setTotalItems(res.totalItems)
      if (usersList.length > 0) setUsers(usersList)
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err)
      toast.error('Erro ao carregar logs de auditoria')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, selectedActor, selectedTarget, selectedModule, selectedResult, startDate, endDate])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useRealtime<AuditLog>('audit_logs', () => loadData())

  const clearFilters = () => {
    setSearch('')
    setSelectedActor('all')
    setSelectedTarget('all')
    setSelectedModule('all')
    setSelectedResult('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Sucesso
          </span>
        )
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            Bloqueado
          </span>
        )
      case 'error':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Erro
          </span>
        )
    }
  }

  const getModuleBadge = (mod: string) => {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        {mod || 'geral'}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span>Logs de Auditoria</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {totalItems} registros
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rastreabilidade imutável de operações administrativas, alterações de permissões e
            segurança
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadData()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filters Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filtros de Auditoria</span>
          </div>
          {(search ||
            selectedActor !== 'all' ||
            selectedTarget !== 'all' ||
            selectedModule !== 'all' ||
            selectedResult !== 'all' ||
            startDate ||
            endDate) && (
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca textual */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ação, descrição, IP..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>

          {/* Módulo */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="all">Todos os módulos</option>
              <option value="users">Equipe & Usuários</option>
              <option value="auth">Autenticação & Segurança</option>
              <option value="commissions">Comissões</option>
              <option value="settings">Configurações</option>
              <option value="payments">Pagamentos</option>
              <option value="sales">Vendas</option>
            </select>
          </div>

          {/* Resultado */}
          <div>
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="all">Todos os resultados</option>
              <option value="success">Sucesso</option>
              <option value="blocked">Bloqueado</option>
              <option value="error">Erro</option>
            </select>
          </div>

          {/* Responsável (Actor) */}
          <div>
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="all">Todos os responsáveis</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table of Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando registros de auditoria...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhum registro encontrado</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tente ajustar os filtros selecionados ou aguarde novas ações no sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Responsável (Ator)</th>
                  <th className="py-3 px-4">Ação / Módulo</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Afetado</th>
                  <th className="py-3 px-4">Resultado</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const date = new Date(log.created)
                  const actorName = log.expand?.actor?.name || log.expand?.actor?.email || 'Sistema'
                  const targetName = log.expand?.target?.name || log.expand?.target?.email || '—'
                  const hasChanges =
                    Boolean(log.before && Object.keys(log.before).length > 0) ||
                    Boolean(log.after && Object.keys(log.after).length > 0)

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors group">
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

                      {/* Ator */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-100 shrink-0">
                            {actorName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-[140px]">
                              {actorName}
                            </p>
                            {log.ip && (
                              <p className="text-[10px] text-slate-400 font-mono">{log.ip}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ação / Módulo */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-semibold text-slate-800 block">
                            {log.action}
                          </span>
                          {getModuleBadge(log.module)}
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <p className="line-clamp-2">{log.description || '—'}</p>
                      </td>

                      {/* Afetado */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="truncate block max-w-[120px]" title={targetName}>
                          {targetName}
                        </span>
                      </td>

                      {/* Resultado */}
                      <td className="py-3.5 px-4">{getResultBadge(log.result)}</td>

                      {/* Botão de Ver Detalhes */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Detalhes do Evento de Auditoria
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Meta Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Data / Hora
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(selectedLog.created).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Resultado</span>
                  <div className="mt-0.5">{getResultBadge(selectedLog.result)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Módulo</span>
                  <div className="mt-0.5">{getModuleBadge(selectedLog.module)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Responsável
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedLog.expand?.actor?.name ||
                      selectedLog.expand?.actor?.email ||
                      'Sistema'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Afetado</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedLog.expand?.target?.name || selectedLog.expand?.target?.email || '—'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Endereço IP
                  </span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedLog.ip || '—'}</p>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Descrição do Evento
                </span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium">
                  {selectedLog.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    User-Agent (Navegador/Cliente)
                  </span>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-[11px] break-all">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}

              {/* Comparativo Before vs After (Diff) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Dados Anteriores vs Posteriores (Diff)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Before */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-600 border-b border-slate-200 flex items-center justify-between">
                      <span>Antes da alteração</span>
                    </div>
                    <pre className="p-3 font-mono text-[11px] text-slate-700 bg-slate-50/50 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {selectedLog.before && Object.keys(selectedLog.before).length > 0
                        ? JSON.stringify(selectedLog.before, null, 2)
                        : '(sem dados anteriores)'}
                    </pre>
                  </div>

                  {/* After */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-600 border-b border-slate-200 flex items-center justify-between">
                      <span>Após a alteração</span>
                    </div>
                    <pre className="p-3 font-mono text-[11px] text-slate-700 bg-slate-50/50 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {selectedLog.after && Object.keys(selectedLog.after).length > 0
                        ? JSON.stringify(selectedLog.after, null, 2)
                        : '(sem dados posteriores)'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
