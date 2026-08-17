import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Package,
  ArrowLeft,
  Edit2,
  Tag,
  Boxes,
  ShoppingCart,
  Calendar,
  Store,
  TrendingUp,
} from 'lucide-react'
import { productService, saleItemService } from '@/services/crm'
import type { Product, SaleItem, ProductCategory } from '@/types/crm'
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

export default function ProdutoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [history, setHistory] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const [p, h] = await Promise.all([
        productService.getById(id),
        productService.getSalesHistory(id),
      ])
      setProduct(p)
      setHistory(h)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar produto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime<Product>('products', () => loadData())
  useRealtime<SaleItem>('sale_items', () => loadData())

  const stats = useMemo(() => {
    const totalSold = history.reduce((acc, h) => acc + h.quantity, 0)
    const totalRevenue = history.reduce((acc, h) => acc + h.quantity * h.unit_price, 0)
    const salesCount = history.length
    return { totalSold, totalRevenue, salesCount }
  }, [history])

  if (loading || !product) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
        Carregando produto...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <button
          onClick={() => navigate('/produtos')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Produtos
        </button>
      </div>

      {/* Product Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{product.name}</h1>
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    product.active !== false
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {product.active !== false ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Código: <span className="font-mono">{product.code || '-'}</span> • Categoria:{' '}
                {categoryLabels[product.category]}
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Preço: <strong>R$ {(product.price || 0).toFixed(2)}</strong> /{' '}
                    {product.unit || 'un'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Estoque: <strong>{product.stock ?? 0}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cadastrado em {new Date(product.created).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 max-w-md">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">NCM</span>
                  <p className="text-xs font-mono text-slate-800">{product.ncm || '-'}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">CFOP</span>
                  <p className="text-xs font-mono text-slate-800">{product.cfop || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-start">
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Total Vendido
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {stats.totalSold} {product.unit || 'un'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{stats.salesCount} vendas</p>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Receita Total
            </span>
            <div className="text-lg font-bold text-indigo-700 mt-0.5">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Ticket Médio</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              R${' '}
              {(stats.salesCount > 0 ? stats.totalRevenue / stats.salesCount : 0).toLocaleString(
                'pt-BR',
                { minimumFractionDigits: 2 },
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Histórico de Vendas</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {history.length} registros
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 mx-auto">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhuma venda registrada</h3>
            <p className="text-xs text-slate-400 mt-1">Este produto ainda não foi vendido.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Preço Un.</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {new Date(h.created).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-indigo-500" />
                        {h.expand?.sale?.expand?.customer?.name ||
                          h.expand?.sale?.expand?.['sale.customer']?.name ||
                          'Cliente'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">
                      {h.quantity} {product.unit || 'un'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      R$ {h.unit_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      R$ {(h.quantity * h.unit_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        productToEdit={product}
        onSaved={loadData}
      />
    </div>
  )
}
