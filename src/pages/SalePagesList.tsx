import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { salePageService } from '@/services/builder'
import type { SalePage } from '@/types/builder'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export const SalePagesList: React.FC = () => {
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const [pages, setPages] = useState<SalePage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const canCreate = can('catalogs.create')
  const canEdit = can('catalogs.edit')
  const canDelete = can('catalogs.delete')

  const loadPages = async () => {
    setIsLoading(true)
    try {
      const data = await salePageService.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: search || undefined,
      })
      setPages(data)
    } catch (err) {
      console.error('Erro ao listar páginas:', err)
      toast.error('Erro ao carregar páginas de venda.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [statusFilter, typeFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadPages()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta página de venda?')) return
    try {
      await salePageService.delete(id)
      toast.success('Página excluída com sucesso.')
      setPages((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      toast.error('Erro ao excluir página: ' + (err?.message || 'Falha'))
    }
  }

  const handleDuplicate = async (id: string, title: string) => {
    try {
      await salePageService.duplicate(id, `${title} (Cópia)`)
      toast.success('Página duplicada!')
      loadPages()
    } catch (err: any) {
      toast.error('Erro ao duplicar: ' + (err?.message || 'Falha'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-600" />
            Páginas de Venda & Catálogos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie todas as páginas públicas, landing pages promocionais e catálogos B2B criados
            na empresa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <Button
              onClick={() => navigate('/pages/builder/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Criar Nova Página
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, slug ou campanha..."
            className="pl-9 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] text-xs bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] text-xs bg-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="catalogo">Catálogo</SelectItem>
              <SelectItem value="landing_page">Landing Page</SelectItem>
              <SelectItem value="oferta_especial">Oferta</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit" variant="secondary" size="sm" className="text-xs">
            Filtrar
          </Button>
        </div>
      </form>

      {/* Tabela de Páginas */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhuma página de venda cadastrada</p>
          <p className="text-xs text-slate-400 mt-1">
            Crie sua primeira página ou catálogo visual clicando no botão acima.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Página / Título</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Vendedor Responsável</th>
                  <th className="p-3.5">Cliente Alvo</th>
                  <th className="p-3.5 text-center">Visualizações</th>
                  <th className="p-3.5 text-center">Pedidos</th>
                  <th className="p-3.5 text-right">Vendas</th>
                  <th className="p-3.5 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pages.map((p) => {
                  const isPub = p.status === 'published'
                  const publicLink = `/v/${p.slug || p.access_token}`

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-800 leading-tight">{p.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {publicLink}
                        </div>
                      </td>
                      <td className="p-3.5 capitalize text-slate-600">
                        {p.type.replace('_', ' ')}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={
                            isPub
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-100 text-[10px] font-bold'
                          }
                        >
                          {isPub ? 'Publicado' : p.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {p.expand?.seller?.name || 'Geral / Equipe'}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {p.expand?.target_customer?.name || 'Aberto / Todos'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {p.views_count || 0}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-600">
                        {p.orders_count || 0}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        R${' '}
                        {Number(p.sales_total || 0)
                          .toFixed(2)
                          .replace('.', ',')}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(publicLink, '_blank')}
                            className="w-7 h-7 p-0 text-slate-500 hover:text-indigo-600"
                            title="Visualizar catálogo público"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/pages/builder/${p.id}`)}
                              className="w-7 h-7 p-0 text-slate-500 hover:text-indigo-600"
                              title="Editar no Page Builder"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicate(p.id, p.title)}
                            className="w-7 h-7 p-0 text-slate-500 hover:text-indigo-600"
                            title="Duplicar página"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(p.id)}
                              className="w-7 h-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Excluir página"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
