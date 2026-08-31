import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  Plus,
  Share2,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Search,
  Check,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { salePageService } from '@/services/builder'
import type { SalePage } from '@/types/builder'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export const SellerCatalogs: React.FC = () => {
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const [dashboardData, setDashboardData] = useState<{
    summary: {
      total_catalogs: number
      published_catalogs: number
      total_views: number
      total_orders: number
      total_revenue: number
      conversion_rate: number
    }
    catalogs: Array<{
      id: string
      title: string
      slug: string
      access_token: string
      type: string
      status: string
      views_count: number
      orders_count: number
      sales_total: number
      conversion_rate: number
      target_customer?: string
      customer_name?: string
      created: string
      public_url: string
    }>
  } | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await salePageService.getSellerDashboard()
      setDashboardData(res)
    } catch (err) {
      console.error('Erro ao carregar dashboard de catálogos:', err)
      toast.error('Não foi possível carregar suas páginas.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCopyLink = (url: string, id: string) => {
    const fullUrl = `${window.location.origin}${url}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(id)
    toast.success('Link do catálogo copiado para a área de transferência!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleShareWhatsApp = (title: string, url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    const text = `Olá! Preparei um catálogo exclusivo com condições especiais para você:\n\n👉 ${title}\n🔗 ${fullUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleDuplicate = async (id: string, title: string) => {
    try {
      await salePageService.duplicate(id, `${title} (Cópia)`)
      toast.success('Catálogo duplicado com sucesso!')
      loadData()
    } catch (err: any) {
      toast.error('Erro ao duplicar: ' + (err?.message || 'Falha'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este catálogo?')) return
    try {
      await salePageService.delete(id)
      toast.success('Catálogo excluído.')
      loadData()
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message || 'Falha'))
    }
  }

  const catalogs = dashboardData?.catalogs || []
  const summary = dashboardData?.summary || {
    total_catalogs: 0,
    published_catalogs: 0,
    total_views: 0,
    total_orders: 0,
    total_revenue: 0,
    conversion_rate: 0,
  }

  const filteredCatalogs = catalogs.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-indigo-600" />
            Meus Catálogos & Links de Venda
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gere links exclusivos com dados reais para seus clientes, acompanhe visitas, pedidos e
            conversão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/templates')}
            variant="outline"
            className="text-xs font-semibold rounded-xl border-slate-200"
          >
            Ver Templates
          </Button>
          <Button
            onClick={() => navigate('/pages/builder/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Catálogo
          </Button>
        </div>
      </div>

      {/* Cards de Métricas e Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-indigo-500" /> Visualizações Totais
          </span>
          <p className="text-2xl font-black text-slate-900">{summary.total_views}</p>
          <span className="text-[10px] text-slate-400">
            Em {summary.total_catalogs} catálogos ativos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" /> Pedidos Realizados
          </span>
          <p className="text-2xl font-black text-slate-900">{summary.total_orders}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Integrados ao CRM</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Total Vendido Online
          </span>
          <p className="text-2xl font-black text-slate-900">
            R$ {Number(summary.total_revenue).toFixed(2).replace('.', ',')}
          </p>
          <span className="text-[10px] text-slate-400">Comissões calculadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Taxa de Conversão
          </span>
          <p className="text-2xl font-black text-slate-900">{summary.conversion_rate}%</p>
          <span className="text-[10px] text-slate-400">Visitas convertidas em pedido</span>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do catálogo ou cliente..."
            className="pl-9 text-xs bg-white"
          />
        </div>
      </div>

      {/* Lista de Catálogos */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredCatalogs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhum catálogo encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            Clique em "Novo Catálogo" para criar um link de vendas exclusivo para seus clientes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCatalogs.map((cat) => {
            const isCopied = copiedId === cat.id
            const isPublished = cat.status === 'published'

            return (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Informações Básicas */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{cat.title}</h3>
                    <Badge
                      className={
                        isPublished
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold border-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-100 text-[10px] font-bold'
                      }
                    >
                      {isPublished ? 'Publicado' : 'Rascunho'}
                    </Badge>
                    {cat.customer_name && (
                      <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 text-[10px] font-bold border-indigo-200">
                        Cliente: {cat.customer_name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                      <code className="text-[11px] font-mono text-slate-600">{cat.public_url}</code>
                    </span>
                    <span>Criado em {new Date(cat.created).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Métricas de Performance da Página */}
                <div className="flex items-center gap-6 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Views
                    </span>
                    <span className="text-sm font-black text-slate-800">{cat.views_count}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Pedidos
                    </span>
                    <span className="text-sm font-black text-emerald-600">{cat.orders_count}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Vendas
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      R$ {Number(cat.sales_total).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Conv.
                    </span>
                    <span className="text-sm font-black text-indigo-600">
                      {cat.conversion_rate}%
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(cat.public_url, cat.id)}
                    className="h-8 text-xs font-semibold rounded-xl border-slate-200 flex items-center gap-1.5"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShareWhatsApp(cat.title, cat.public_url)}
                    className="h-8 text-xs font-semibold rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
                    title="Compartilhar pelo WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(cat.public_url, '_blank')}
                    className="h-8 text-xs text-slate-600 hover:text-indigo-600 rounded-xl"
                    title="Abrir catálogo público"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/pages/builder/${cat.id}`)}
                    className="h-8 text-xs text-slate-600 hover:text-indigo-600 rounded-xl"
                    title="Editar no Page Builder"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicate(cat.id, cat.title)}
                    className="h-8 text-xs text-slate-600 hover:text-indigo-600 rounded-xl"
                    title="Duplicar catálogo"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cat.id)}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                    title="Excluir catálogo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
