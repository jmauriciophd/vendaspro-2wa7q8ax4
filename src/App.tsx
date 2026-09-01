import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import Layout from './components/Layout'
import Index from './pages/Index'
import Login from './pages/Login'
import Pipeline from './pages/Pipeline'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Vendas from './pages/Vendas'
import Produtos from './pages/Produtos'
import ProdutoDetalhe from './pages/ProdutoDetalhe'
import Equipe from './pages/Equipe'
import Relatorios from './pages/Relatorios'
import Metas from './pages/Metas'
import Commissions from './pages/Commissions'
import SalesFunnel from './pages/SalesFunnel'
import Notificacoes from './pages/Notificacoes'
import CategoryGoals from './pages/CategoryGoals'
import SellerDashboard from './pages/SellerDashboard'
import PerformanceReport from './pages/PerformanceReport'
import PaymentCharges from './pages/PaymentCharges'
import PaymentChargeDetail from './pages/PaymentChargeDetail'
import Reconciliation from './pages/Reconciliation'
import PaymentSettings from './pages/PaymentSettings'
import FinancialReport from './pages/FinancialReport'
import Auditoria from './pages/Auditoria'
import Backups from './pages/Backups'
import EmailSettings from './pages/EmailSettings'
import MeuPerfil from './pages/MeuPerfil'
import NotFound from './pages/NotFound'
import { PageBuilder } from './pages/PageBuilder'
import { TemplatesList } from './pages/TemplatesList'
import { SellerCatalogs } from './pages/SellerCatalogs'
import { SalePagesList } from './pages/SalePagesList'
import { PublicCatalogView } from './pages/PublicCatalogView'
import { useAuth } from '@/context/AuthContext'

function GerenteRoute({ children }: { children: React.ReactNode }) {
  const { isManager } = useAuth()
  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-700">Acesso restrito</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Esta área é visível apenas para administradores e gerentes.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-700">Acesso restrito</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Esta área é visível apenas para administradores.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function AuditRoute({ children }: { children: React.ReactNode }) {
  const { can, isAdmin } = useAuth()
  if (!isAdmin && !can('audit.view')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-700">Acesso restrito</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Você não possui permissão para visualizar os logs de auditoria (audit.view necessária).
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function BackupRoute({ children }: { children: React.ReactNode }) {
  const { can, isAdmin, isSuperAdmin } = useAuth()
  if (!isSuperAdmin && !isAdmin && !can('backups.view')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-700">Acesso restrito</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Você não possui permissão para acessar o módulo de backup do banco de dados (backups.view
          necessária).
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function EmailSettingsRoute({ children }: { children: React.ReactNode }) {
  const { can, isAdmin, isSuperAdmin } = useAuth()
  if (!isSuperAdmin && !isAdmin && !can('settings.email.view') && !can('settings.view')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-700">Acesso restrito</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Você não possui permissão para acessar as configurações de e-mail (settings.email.view
          necessária).
        </p>
      </div>
    )
  }
  return <>{children}</>
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Rotas Públicas de Catálogos e Lojas Autenticadas */}
          <Route path="/v/:slug" element={<PublicCatalogView />} />
          <Route path="/catalogo/:slug" element={<PublicCatalogView />} />
          <Route path="/pagar/:id" element={<PaymentChargeDetail />} />
          <Route path="/cobranca/:id" element={<PaymentChargeDetail />} />
          <Route path="/financeiro/cobrancas/:id" element={<PaymentChargeDetail />} />

          {/* Rota Tela Cheia do Page Builder */}
          <Route path="/pages/builder/:pageId" element={<PageBuilder />} />
          <Route path="/pages/builder/new" element={<PageBuilder />} />
          <Route path="/pages/builder/template/:templateId" element={<PageBuilder />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/meu-dashboard" element={<SellerDashboard />} />
            <Route path="/seller-catalogs" element={<SellerCatalogs />} />
            <Route path="/pages" element={<SalePagesList />} />
            <Route path="/templates" element={<TemplatesList />} />
            <Route path="/perfil" element={<MeuPerfil />} />
            <Route path="/meu-perfil" element={<MeuPerfil />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/produtos/:id" element={<ProdutoDetalhe />} />
            <Route
              path="/equipe"
              element={
                <GerenteRoute>
                  <Equipe />
                </GerenteRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <GerenteRoute>
                  <Relatorios />
                </GerenteRoute>
              }
            />
            <Route
              path="/relatorios/desempenho"
              element={
                <GerenteRoute>
                  <PerformanceReport />
                </GerenteRoute>
              }
            />
            <Route
              path="/relatorios/financeiro"
              element={
                <GerenteRoute>
                  <FinancialReport />
                </GerenteRoute>
              }
            />
            <Route
              path="/metas"
              element={
                <GerenteRoute>
                  <Metas />
                </GerenteRoute>
              }
            />
            <Route
              path="/metas/categorias"
              element={
                <GerenteRoute>
                  <CategoryGoals />
                </GerenteRoute>
              }
            />
            <Route path="/comissoes" element={<Commissions />} />
            <Route
              path="/pipeline-funil"
              element={
                <GerenteRoute>
                  <SalesFunnel />
                </GerenteRoute>
              }
            />
            <Route path="/notificacoes" element={<Notificacoes />} />
            <Route path="/financeiro/cobrancas" element={<PaymentCharges />} />
            <Route
              path="/financeiro/conciliacao"
              element={
                <GerenteRoute>
                  <Reconciliation />
                </GerenteRoute>
              }
            />
            <Route
              path="/configuracoes/pagamentos"
              element={
                <AdminRoute>
                  <PaymentSettings />
                </AdminRoute>
              }
            />
            <Route
              path="/auditoria"
              element={
                <AuditRoute>
                  <Auditoria />
                </AuditRoute>
              }
            />
            <Route
              path="/configuracoes/backups"
              element={
                <BackupRoute>
                  <Backups />
                </BackupRoute>
              }
            />
            <Route
              path="/configuracoes/email"
              element={
                <EmailSettingsRoute>
                  <EmailSettings />
                </EmailSettingsRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
