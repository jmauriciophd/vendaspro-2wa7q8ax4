import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Building2,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react'
import { customerService } from '@/services/crm'
import type { Customer } from '@/types/crm'
import { CustomerModal } from '@/components/CustomerModal'
import { useRealtime } from '@/hooks/use-realtime'

export default function Clientes() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null)

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll({
        search,
        size: sizeFilter,
        status: statusFilter,
      })
      setCustomers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [search, sizeFilter, statusFilter])

  useRealtime<Customer>('customers', () => loadCustomers())

  const sizeBadge = (size?: Customer['size']) => {
    const map: any = {
      pequeno: { label: 'Pequeno', bg: 'bg-slate-100 text-slate-700' },
      medio: { label: 'Médio', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      grande: { label: 'Grande', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    }
    const s = map[size || 'pequeno'] || { label: size, bg: 'bg-slate-100 text-slate-700' }
    return (
      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${s.bg}`}>
        {s.label}
      </span>
    )
  }

  const statusBadge = (status: Customer['status']) => {
    if (status === 'ativo') {
      return (
        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3" />
          Ativo
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 w-fit">
        <XCircle className="w-3 h-3" />
        Inativo
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Mercadinhos & Clientes
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {customers.length} cadastrados
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie pequenos mercadinhos, conveniências e mercearias atendidas
          </p>
        </div>

        <button
          onClick={() => {
            setCustomerToEdit(null)
            setIsModalOpen(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Mercadinho</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cidade ou responsável..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Porte */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">Todos os Portes</option>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
            </select>
          </div>

          {/* Status */}
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

      {/* Customers List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Nenhum cliente encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Não há mercadinhos correspondentes aos filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mercadinho</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Telefone / Contato</th>
                  <th className="py-3 px-4">Porte</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clientes/${c.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                          {c.cnpj && <p className="text-[10px] text-slate-400">{c.cnpj}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {c.city}/{c.state || 'SP'}
                        </span>
                      </div>
                      {c.neighborhood && (
                        <p className="text-[10px] text-slate-400 pl-4">{c.neighborhood}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {c.owner_name || <span className="text-slate-400">Não informado</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[150px]">
                            <Mail className="w-3 h-3" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{sizeBadge(c.size)}</td>
                    <td className="py-3.5 px-4">{statusBadge(c.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setCustomerToEdit(c)
                            setIsModalOpen(true)
                          }}
                          title="Editar mercadinho"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/clientes/${c.id}`)}
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

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setCustomerToEdit(null)
        }}
        customerToEdit={customerToEdit}
        onSaved={loadCustomers}
      />
    </div>
  )
}
