import pb from '@/lib/pocketbase/client'
import type {
  Commission,
  CommissionCalculateResult,
  CommissionListItem,
  CommissionRule,
  CommissionStatus,
  CommissionSummary,
  SellerWithRule,
  FunnelData,
  ClientImportResult,
  ClientImportRow,
  AppNotification,
  UnreadCount,
  CategoryGoal,
  CategoryGoalPerformance,
  CategoryGoalInput,
  SellerDashboard,
  SellerRecentOrder,
  SellerCommission,
  SellerGoals,
  SellerTopProduct,
  AdminTeamPerformance,
  AdminCategoriesBelow,
} from '@/types/modules'

// ===========================================================================
// Comissões
// ===========================================================================

export const commissionService = {
  /** Calcula comissões do período (Admin/Gerente). */
  async calculate(month: number, year: number): Promise<CommissionCalculateResult> {
    return await pb.send('/backend/v1/commissions/calculate', {
      method: 'POST',
      body: { month, year },
    })
  },

  /** Lista comissões com filtros opcionais. */
  async list(params?: {
    sellerId?: string
    month?: number
    year?: number
    status?: CommissionStatus
  }): Promise<CommissionListItem[]> {
    const query: Record<string, string | number> = {}
    if (params?.sellerId) query.seller_id = params.sellerId
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    if (params?.status) query.status = params.status
    return await pb.send('/backend/v1/commissions/list', { method: 'GET', query })
  },

  /** Resumo do período (cards + totais por vendedor). */
  async summary(params?: { month?: number; year?: number }): Promise<CommissionSummary> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/commissions/summary', { method: 'GET', query })
  },

  /** Atualiza o status de uma comissão (Admin/Gerente). */
  async updateStatus(
    id: string,
    status: CommissionStatus,
  ): Promise<{ id: string; status: string; paid_at?: string }> {
    return await pb.send(`/backend/v1/commissions/${id}/status`, {
      method: 'PUT',
      body: { status },
    })
  },

  /** Lista vendedores com suas regras de comissão ativas. */
  async sellers(): Promise<SellerWithRule[]> {
    return await pb.send('/backend/v1/commissions/sellers', { method: 'GET' })
  },

  // ----- regras (gerenciadas direto pela coleção commission_rules) -----

  async getRules(): Promise<CommissionRule[]> {
    return await pb.collection('commission_rules').getFullList<CommissionRule>({
      sort: '-created',
      expand: 'seller',
    })
  },

  async upsertRule(data: {
    seller: string
    percentage: number
    minimumSales?: number
    maximumSales?: number
    active?: boolean
  }): Promise<CommissionRule> {
    // busca regra existente do vendedor
    const existing = await pb.collection('commission_rules').getFullList<CommissionRule>({
      filter: `seller = "${data.seller}"`,
      sort: '-created',
    })
    const payload: Partial<CommissionRule> = {
      seller: data.seller,
      percentage: data.percentage,
      minimum_sales: data.minimumSales,
      maximum_sales: data.maximumSales,
      active: data.active ?? true,
    }
    if (existing.length > 0) {
      return await pb
        .collection('commission_rules')
        .update<CommissionRule>(existing[0].id, payload, { expand: 'seller' })
    }
    return await pb.collection('commission_rules').create<CommissionRule>(payload, {
      expand: 'seller',
    })
  },

  /** Acessa diretamente registros de comissão (para expand/detail se necessário). */
  async getById(id: string): Promise<Commission> {
    return await pb.collection('commissions').getOne<Commission>(id, {
      expand: 'seller,sale,sale.customer',
    })
  },
}

// ===========================================================================
// Funil de Vendas
// ===========================================================================

export const funnelService = {
  async get(params?: { month?: number; year?: number; sellerId?: string }): Promise<FunnelData> {
    const query: Record<string, string | number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    if (params?.sellerId) query.seller_id = params.sellerId
    return await pb.send('/backend/v1/pipeline/funnel', { method: 'GET', query })
  },
}

// ===========================================================================
// Importação de Clientes
// ===========================================================================

export const clientImportService = {
  async import(clients: ClientImportRow[]): Promise<ClientImportResult> {
    return await pb.send('/backend/v1/clients/import', {
      method: 'POST',
      body: { clients },
    })
  },
}

// ===========================================================================
// Notificações
// ===========================================================================

export const notificationService = {
  /** Lista notificações do usuário autenticado (mais recentes primeiro). */
  async list(params?: { unread?: boolean }): Promise<AppNotification[]> {
    const query: Record<string, string> = {}
    if (params?.unread) query.unread = '1'
    return await pb.send('/backend/v1/notifications/list', { method: 'GET', query })
  },

  /** Contagem de notificações não lidas. */
  async unreadCount(): Promise<UnreadCount> {
    return await pb.send('/backend/v1/notifications/unread-count', { method: 'GET' })
  },

  /** Marca uma notificação como lida. */
  async markRead(id: string): Promise<{ id: string; is_read: boolean }> {
    return await pb.send(`/backend/v1/notifications/${id}/read`, { method: 'PUT' })
  },

  /** Marca todas as notificações do usuário como lidas. */
  async markAllRead(): Promise<{ updated: number }> {
    return await pb.send('/backend/v1/notifications/read-all', { method: 'PUT' })
  },
}

// ===========================================================================
// Metas por Categoria
// ===========================================================================

export const categoryGoalService = {
  async list(month: number, year: number): Promise<CategoryGoal[]> {
    return await pb.send('/backend/v1/category-goals/list', {
      method: 'GET',
      query: { month, year },
    })
  },

  async performance(month: number, year: number): Promise<CategoryGoalPerformance[]> {
    return await pb.send('/backend/v1/category-goals/performance', {
      method: 'GET',
      query: { month, year },
    })
  },

  async create(data: CategoryGoalInput): Promise<CategoryGoal> {
    return await pb.send('/backend/v1/category-goals/create', {
      method: 'POST',
      body: data,
    })
  },

  async update(id: string, data: Partial<CategoryGoalInput>): Promise<CategoryGoal> {
    return await pb.send(`/backend/v1/category-goals/${id}`, {
      method: 'PUT',
      body: data,
    })
  },

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return await pb.send(`/backend/v1/category-goals/${id}`, { method: 'DELETE' })
  },
}

// ===========================================================================
// Dashboard do Vendedor (isolado no backend por req.auth.id)
// ===========================================================================

export const sellerDashboardService = {
  async get(params?: { month?: number; year?: number }): Promise<SellerDashboard> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/seller-dashboard', { method: 'GET', query })
  },

  async orders(params?: { month?: number; year?: number }): Promise<SellerRecentOrder[]> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/seller-dashboard/orders', { method: 'GET', query })
  },

  async commissions(params?: { month?: number; year?: number }): Promise<SellerCommission[]> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/seller-dashboard/commissions', { method: 'GET', query })
  },

  async goals(params?: { month?: number; year?: number }): Promise<SellerGoals> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/seller-dashboard/goals', { method: 'GET', query })
  },

  async topProducts(params?: { month?: number; year?: number }): Promise<SellerTopProduct[]> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/seller-dashboard/top-products', {
      method: 'GET',
      query,
    })
  },
}

// ===========================================================================
// Dashboard Admin (ranking de vendedores + categorias abaixo da meta)
// ===========================================================================

export const adminDashboardService = {
  async teamPerformance(params?: { month?: number; year?: number }): Promise<AdminTeamPerformance> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/admin-dashboard/team-performance', {
      method: 'GET',
      query,
    })
  },

  async categoriesBelow(params?: { month?: number; year?: number }): Promise<AdminCategoriesBelow> {
    const query: Record<string, number> = {}
    if (params?.month) query.month = params.month
    if (params?.year) query.year = params.year
    return await pb.send('/backend/v1/admin-dashboard/categories-below', {
      method: 'GET',
      query,
    })
  },
}
