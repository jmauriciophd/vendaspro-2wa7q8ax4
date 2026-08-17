import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  ChevronRight,
  Tag,
  Boxes,
  TrendingUp,
} from 'lucide-react'
import { productService } from '@/services/crm'
import type { Product, ProductCategory } from '@/types/crm'
import { ProductModal } from '@/components/ProductModal'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

const categoryLabels: Record<ProductCategory, string> = {
  graos: 'Grãos',
  bebidas: 'Bebidas',
  limpeza: 'Limpeza',
  mercearia: 'Mercearia',
  higiene: 'Higiene',
  outros: 'Outros',
}

const categoryBadge: Record<ProductCategory, string> = {
  graos: 'bg-amber-50 text-amber-700 border-amber-200',
  bebidas: 'bg-blue-50 text-blue-700 border-blue-200',
  limpeza: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  mercearia: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  higiene: 'bg-violet-50 text-violet-700 border-violet-200',
  outros: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function Produtos() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)

  const loadProducts = async () => {
    try {
      const data = await productService.getAll({
        search,
        category: categoryFilter,
      })
      setProducts(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [search, categoryFilter])

  useRealtime<Product>('products', () => loadProducts())

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return products
    if (statusFilter === 'ativo') return products.filter((p) => p.active !== false)
    return products.filter((p) => p.active === false)
  }, [products, statusFilter])

  const stats = useMemo(() => {
    const totalValue = products.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0)
    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0)
    const activeCount = products.filter((p) => p.active !== false).length
    return { totalValue, totalStock, activeCount }
  }, [products])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Produtos & Catálogo
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {products.length} itens
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie o catálogo de produtos, preços, estoque e dados fiscais
          </p>
        </div>

        <button
          onClick={() => {
            setProductToEdit(null)
            setIsModalOpen(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Estoque Total
            </span>
            <span className="text-lg font-bold text-slate-900">{stats.totalStock} un</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Valor em Estoque
            </span>
            <span className="text-lg font-bold text-slate-900">
              R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">
              Produtos Ativos
            </span>
            <span className="text-lg font-bold text-slate-900">
              {stats.activeCount} / {products.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou NCM..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {(Object.keys(categoryLabels) as ProductCategory[]).map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando produtos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhum produto encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Cadastre produtos no catálogo ou ajuste os filtros de busca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Estoque</th>
                  <th className="py-3 px-4">NCM / CFOP</th>
                  <th className="py-3 px-4 text-right">Preço</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/produtos/${p.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                          <Package className="w-4 h-4" />
                        </div>
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{p.code || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${categoryBadge[p.category]}`}
                      >
                        {categoryLabels[p.category]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-700 font-semibold">
                      {p.stock ?? 0}
                      <span className="text-[10px] text-slate-400 ml-1">{p.unit || 'un'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      {p.ncm || '-'} / {p.cfop || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      R$ {(p.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setProductToEdit(p)
                            setIsModalOpen(true)
                          }}
                          title="Editar produto"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/produtos/${p.id}`)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setProductToEdit(null)
        }}
        productToEdit={productToEdit}
        onSaved={loadProducts}
      />
    </div>
  )
}
