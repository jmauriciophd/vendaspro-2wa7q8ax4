import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutGrid,
  Columns3,
  Store,
  ShoppingCart,
  BarChart3,
  LogOut,
  Plus,
  Search,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Building2,
  DollarSign,
  Package,
  Users,
  ShieldHalf,
  Settings,
  Target,
  Percent,
  Filter,
  Bell,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { QuickCustomerModal } from '@/components/QuickCustomerModal'
import { customerService, dealService, companyService, reminderService } from '@/services/crm'
import type { Customer, Deal, CompanySettings, Reminder } from '@/types/crm'
import { CompanySettingsModal } from '@/components/CompanySettingsModal'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'

export default function Layout() {
  const { user, logout, isLoading, isManager, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false)
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false)
  const [company, setCompany] = useState<CompanySettings | null>(null)

  // Reminders (bell) state
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showReminders, setShowReminders] = useState(false)
  const remindersRef = useRef<HTMLDivElement>(null)

  const loadReminders = async () => {
    if (!user) return
    try {
      const data = await reminderService.getPending(user.id)
      setReminders(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [user])

  useRealtime<Reminder>('reminders', () => loadReminders())

  // Close reminders dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (remindersRef.current && !remindersRef.current.contains(event.target as Node)) {
        setShowReminders(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadCompany = async () => {
    try {
      const c = await companyService.get()
      setCompany(c)
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadCompany()
  }, [])

  // Global search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ customers: Customer[]; deals: Deal[] }>({
    customers: [],
    deals: [],
  })
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ customers: [], deals: [] })
      setShowSearchDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const [customers, deals] = await Promise.all([
          customerService.getAll({ search: searchQuery }),
          dealService.getAll({ search: searchQuery }),
        ])
        setSearchResults({
          customers: customers.slice(0, 4),
          deals: deals.slice(0, 4),
        })
        setShowSearchDropdown(true)
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Auth protection check
  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/login') {
      navigate('/login', { state: { from: location }, replace: true })
    }
  }, [user, isLoading, location, navigate])

  // Splash Screen while verifying session
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 animate-pulse mb-4">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">CRM de Vendas</h2>
        <p className="text-sm text-slate-500 mt-1">Carregando painel de vendas...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutGrid },
    { label: 'Pipeline', path: '/pipeline', icon: Columns3 },
    { label: 'Funil', path: '/pipeline-funil', icon: Filter },
    { label: 'Clientes', path: '/clientes', icon: Store },
    { label: 'Produtos', path: '/produtos', icon: Package },
    { label: 'Vendas', path: '/vendas', icon: ShoppingCart },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { label: 'Metas', path: '/metas', icon: Target },
    { label: 'Comissões', path: '/comissoes', icon: Percent },
    ...(isManager ? [{ label: 'Equipe', path: '/equipe', icon: Users }] : []),
  ]

  const userInitials = (user.name || user.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Logo */}
        <div className="p-6 pb-5 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none truncate">
              CRM de Vendas
            </h1>
            <span className="text-xs text-indigo-600 font-semibold tracking-wide uppercase mt-1 block">
              Equipe Comercial
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50/90 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full" />
                  )}
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card in Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {isAdmin && (
            <button
              onClick={() => setCompanySettingsOpen(true)}
              title="Configurar dados fiscais da empresa"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-indigo-100"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Dados da Empresa</span>
            </button>
          )}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200/50">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {user.name || 'Vendedor'}
                </p>
                <p className="text-[11px] text-slate-400 truncate leading-tight">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              title="Sair do CRM"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900">CRM de Vendas</h1>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Equipe Comercial
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {userInitials}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {user.name || 'Vendedor'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Global Header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar (Desktop) */}
            <div ref={searchRef} className="hidden sm:block relative w-72 md:w-96">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSearchDropdown(true)
                  }}
                  placeholder="Buscar mercadinhos, propostas, negócios..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs md:text-sm text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Dropdown */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-96 overflow-y-auto">
                  {searchResults.customers.length === 0 && searchResults.deals.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Nenhum cliente ou negócio encontrado para &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    <div className="p-2 space-y-3">
                      {searchResults.customers.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="w-3 h-3 text-indigo-500" />
                            Mercadinhos & Clientes
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.customers.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setShowSearchDropdown(false)
                                  setSearchQuery('')
                                  navigate(`/clientes/${c.id}`)
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                                    {c.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {c.city} • {c.owner_name || 'Sem responsável'}
                                  </p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.deals.length > 0 && (
                        <div className="border-t border-slate-100 pt-2">
                          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-amber-500" />
                            Negócios & Propostas
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.deals.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => {
                                  setShowSearchDropdown(false)
                                  setSearchQuery('')
                                  navigate('/pipeline')
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                                    {d.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    R${' '}
                                    {d.value?.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    }) || '0,00'}{' '}
                                    • {d.stage}
                                  </p>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuickCustomerModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-xs shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </button>

            {/* Reminders Bell */}
            <div ref={remindersRef} className="relative">
              <button
                onClick={() => setShowReminders((s) => !s)}
                title="Lembretes de follow-up"
                className="relative w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {reminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {reminders.length > 99 ? '99+' : reminders.length}
                  </span>
                )}
              </button>

              {showReminders && (
                <div className="absolute top-full right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-800">Lembretes Pendentes</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                      {reminders.length}
                    </span>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {reminders.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Tudo em dia!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Nenhum lembrete pendente.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {reminders.map((r) => {
                          const deal = r.expand?.deal
                          const customerName = deal?.expand?.customer?.name || 'Mercadinho'
                          const due = r.due_date ? new Date(r.due_date) : null
                          const isOverdue = due && due < new Date()
                          return (
                            <div
                              key={r.id}
                              className="p-3.5 hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 truncate">
                                    {deal?.title || 'Negócio'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {customerName}
                                  </p>
                                </div>
                                {due && (
                                  <span
                                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      isOverdue
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    {due.toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              {r.message && (
                                <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                                  {r.message}
                                </p>
                              )}
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={async () => {
                                    try {
                                      await reminderService.markDone(r.id)
                                      toast.success('Lembrete concluído!')
                                      loadReminders()
                                    } catch (e) {
                                      console.error(e)
                                      toast.error('Erro ao concluir lembrete')
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Concluir
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold text-xs flex items-center justify-center shrink-0">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Quick Customer Modal */}
      <QuickCustomerModal
        isOpen={quickCustomerModalOpen}
        onClose={() => setQuickCustomerModalOpen(false)}
        onCustomerCreated={() => {
          // Trigger any reload or navigate if needed
        }}
      />

      <CompanySettingsModal
        isOpen={companySettingsOpen}
        onClose={() => setCompanySettingsOpen(false)}
        company={company}
        onSaved={loadCompany}
      />
    </div>
  )
}
