import pb from '@/lib/pocketbase/client'
import type {
  Customer,
  Product,
  Deal,
  Sale,
  SaleItem,
  User,
  CompanySettings,
  EmailLog,
  EmailDocType,
  SalesTarget,
  Reminder,
  ReminderStatus,
  AuditLog,
} from '@/types/crm'

export const customerService = {
  async getAll(params?: {
    search?: string
    size?: string
    status?: string
    sort?: string
    page?: number
    limit?: number
  }) {
    const filterParts: string[] = []
    if (params?.status && params.status !== 'all') {
      filterParts.push(`status = "${params.status}"`)
    }
    if (params?.size && params.size !== 'all') {
      filterParts.push(`size = "${params.size}"`)
    }
    if (params?.search) {
      const s = params.search.replace(/"/g, '\\"')
      filterParts.push(`(name ~ "${s}" || city ~ "${s}" || owner_name ~ "${s}" || phone ~ "${s}")`)
    }

    const filter = filterParts.join(' && ')
    const sort = params?.sort || '-created'

    if (params?.page && params?.limit) {
      const res = await pb.collection('customers').getList<Customer>(params.page, params.limit, {
        filter,
        sort,
      })
      return res.items
    }

    return await pb.collection('customers').getFullList<Customer>({
      filter,
      sort,
    })
  },

  async getById(id: string) {
    return await pb.collection('customers').getOne<Customer>(id)
  },

  async create(data: Partial<Customer>) {
    return await pb.collection('customers').create<Customer>(data)
  },

  async update(id: string, data: Partial<Customer>) {
    return await pb.collection('customers').update<Customer>(id, data)
  },

  async delete(id: string) {
    return await pb.collection('customers').delete(id)
  },
}

export const productService = {
  async getAll(params?: {
    activeOnly?: boolean
    category?: string
    search?: string
    sort?: string
    page?: number
    limit?: number
  }) {
    const filterParts: string[] = []
    if (params?.activeOnly) {
      filterParts.push('active = true')
    }
    if (params?.category && params.category !== 'all') {
      filterParts.push(`category = "${params.category}"`)
    }
    if (params?.search) {
      const s = params.search.replace(/"/g, '\\"')
      filterParts.push(`(name ~ "${s}" || code ~ "${s}" || ncm ~ "${s}")`)
    }

    const filter = filterParts.join(' && ')
    const sort = params?.sort || 'name'

    if (params?.page && params?.limit) {
      const res = await pb.collection('products').getList<Product>(params.page, params.limit, {
        filter,
        sort,
      })
      return res.items
    }

    return await pb.collection('products').getFullList<Product>({
      filter,
      sort,
    })
  },

  async getById(id: string) {
    return await pb.collection('products').getOne<Product>(id, {
      expand: 'sale_items(product).sale,sale_items(product).sale.customer',
    })
  },

  async create(data: Partial<Product>) {
    return await pb.collection('products').create<Product>(data)
  },

  async update(id: string, data: Partial<Product>) {
    return await pb.collection('products').update<Product>(id, data)
  },

  async delete(id: string) {
    return await pb.collection('products').delete(id)
  },

  /** Sales history for a product (via sale_items) */
  async getSalesHistory(productId: string) {
    return await pb.collection('sale_items').getFullList<SaleItem>({
      filter: `product = "${productId}"`,
      sort: '-created',
      expand: 'sale,sale.customer',
    })
  },
}

export const dealService = {
  async getAll(params?: {
    stage?: string
    customerId?: string
    ownerId?: string
    search?: string
  }) {
    const filterParts: string[] = []
    if (params?.stage && params.stage !== 'all') {
      filterParts.push(`stage = "${params.stage}"`)
    }
    if (params?.customerId && params.customerId !== 'all') {
      filterParts.push(`customer = "${params.customerId}"`)
    }
    if (params?.ownerId && params.ownerId !== 'all') {
      filterParts.push(`owner = "${params.ownerId}"`)
    }
    if (params?.search) {
      const s = params.search.replace(/"/g, '\\"')
      filterParts.push(`(title ~ "${s}" || notes ~ "${s}")`)
    }

    return await pb.collection('deals').getFullList<Deal>({
      filter: filterParts.join(' && '),
      sort: '-created',
      expand: 'customer,owner',
    })
  },

  async getById(id: string) {
    return await pb.collection('deals').getOne<Deal>(id, {
      expand: 'customer,owner',
    })
  },

  async create(data: Partial<Deal>) {
    return await pb.collection('deals').create<Deal>(data, {
      expand: 'customer,owner',
    })
  },

  async update(id: string, data: Partial<Deal>) {
    return await pb.collection('deals').update<Deal>(id, data, {
      expand: 'customer,owner',
    })
  },

  async updateStage(id: string, stage: Deal['stage']) {
    return await pb.collection('deals').update<Deal>(
      id,
      { stage },
      {
        expand: 'customer,owner',
      },
    )
  },

  async delete(id: string) {
    return await pb.collection('deals').delete(id)
  },
}

export const saleService = {
  async getAll(params?: {
    customerId?: string
    sellerId?: string
    paymentStatus?: string
    paymentMethod?: string
    startDate?: string
    endDate?: string
    sort?: string
    page?: number
    limit?: number
  }) {
    const filterParts: string[] = []
    if (params?.customerId && params.customerId !== 'all') {
      filterParts.push(`customer = "${params.customerId}"`)
    }
    if (params?.sellerId && params.sellerId !== 'all') {
      filterParts.push(`seller = "${params.sellerId}"`)
    }
    if (params?.paymentStatus && params.paymentStatus !== 'all') {
      filterParts.push(`payment_status = "${params.paymentStatus}"`)
    }
    if (params?.paymentMethod && params.paymentMethod !== 'all') {
      filterParts.push(`payment_method = "${params.paymentMethod}"`)
    }
    if (params?.startDate) {
      filterParts.push(`sale_date >= "${params.startDate}"`)
    }
    if (params?.endDate) {
      filterParts.push(`sale_date <= "${params.endDate}"`)
    }

    const filter = filterParts.join(' && ')
    const sort = params?.sort || '-sale_date,-created'

    if (params?.page && params?.limit) {
      const res = await pb.collection('sales').getList<Sale>(params.page, params.limit, {
        filter,
        sort,
        expand: 'customer,seller',
      })
      return res.items
    }

    return await pb.collection('sales').getFullList<Sale>({
      filter,
      sort,
      expand: 'customer,seller',
    })
  },

  async getById(id: string) {
    const sale = await pb.collection('sales').getOne<Sale>(id, {
      expand: 'customer,seller',
    })
    const items = await pb.collection('sale_items').getFullList<SaleItem>({
      filter: `sale = "${id}"`,
      expand: 'product',
    })
    return { sale, items }
  },

  async createWithItems(
    saleData: Omit<Partial<Sale>, 'id'>,
    items: Array<{ product: string; quantity: number; unit_price: number }>,
  ) {
    const total = items.reduce((acc, curr) => acc + curr.quantity * curr.unit_price, 0)
    const sale = await pb.collection('sales').create<Sale>(
      {
        ...saleData,
        total: Math.round(total * 100) / 100,
      },
      {
        expand: 'customer,seller',
      },
    )

    const createdItems: SaleItem[] = []
    for (const item of items) {
      const itemRecord = await pb.collection('sale_items').create<SaleItem>(
        {
          sale: sale.id,
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        },
        {
          expand: 'product',
        },
      )
      createdItems.push(itemRecord)
    }

    return { sale, items: createdItems }
  },

  async delete(id: string) {
    return await pb.collection('sales').delete(id)
  },
}

export const saleItemService = {
  async getBySale(saleId: string) {
    return await pb.collection('sale_items').getFullList<SaleItem>({
      filter: `sale = "${saleId}"`,
      expand: 'product',
    })
  },

  async getAllDetailed() {
    return await pb.collection('sale_items').getFullList<SaleItem>({
      expand: 'product,sale,sale.customer',
    })
  },
}

export const userService = {
  async getAll() {
    return await pb.collection('users').getFullList<User>({
      sort: 'name',
    })
  },

  async getById(id: string) {
    return await pb.collection('users').getOne<User>(id)
  },

  async create(data: {
    name: string
    email: string
    password: string
    role?: User['role']
    active?: boolean
    permissions?: string[]
  }) {
    return await pb.collection('users').create<User>({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      emailVisibility: true,
      role: data.role || 'vendedor',
      active: data.active !== undefined ? data.active : true,
      permissions: data.permissions || [],
    })
  },

  async update(
    id: string,
    data: Partial<{
      name: string
      role: User['role']
      active: boolean
      password: string
      permissions: string[]
    }>,
  ) {
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.role !== undefined) payload.role = data.role
    if (data.active !== undefined) payload.active = data.active
    if (data.permissions !== undefined) payload.permissions = data.permissions
    if (data.password) {
      payload.password = data.password
      payload.passwordConfirm = data.password
    }
    return await pb.collection('users').update<User>(id, payload)
  },

  async delete(id: string) {
    return await pb.collection('users').delete(id)
  },

  /** Retorna a URL pública completa do avatar do usuário ou string vazia */
  avatarUrl(user: User | null): string {
    if (!user || !user.avatar) return ''
    return pb.files.getUrl(user, user.avatar)
  },
}

export const profileService = {
  /** Obter perfil do usuário logado */
  async getProfile(): Promise<User> {
    return await pb.send<User>('/backend/v1/profile', {
      method: 'GET',
    })
  },

  /** Atualizar dados permitidos do perfil (nome, telefone e foto) */
  async updateProfile(data: {
    name?: string
    phone?: string
    avatar?: File | null
    remove_avatar?: boolean
  }): Promise<{ success: boolean; message: string; user: User }> {
    if (data.avatar instanceof File) {
      const formData = new FormData()
      if (data.name !== undefined) formData.append('name', data.name)
      if (data.phone !== undefined) formData.append('phone', data.phone)
      formData.append('avatar', data.avatar)

      return await pb.send<{ success: boolean; message: string; user: User }>(
        '/backend/v1/profile',
        {
          method: 'PUT',
          body: formData,
        },
      )
    }

    return await pb.send<{ success: boolean; message: string; user: User }>('/backend/v1/profile', {
      method: 'PUT',
      body: {
        name: data.name,
        phone: data.phone,
        remove_avatar: data.remove_avatar,
      },
    })
  },

  /** Alterar senha do próprio usuário autenticado */
  async changePassword(data: {
    current_password: string
    new_password: string
    confirm_password: string
  }): Promise<{ success: boolean; message: string }> {
    return await pb.send<{ success: boolean; message: string }>('/backend/v1/profile/password', {
      method: 'POST',
      body: data,
    })
  },
}

export const auditLogService = {
  async getAll(params?: {
    actor?: string
    target?: string
    action?: string
    module?: string
    result?: string
    search?: string
    startDate?: string
    endDate?: string
    limit?: number
    page?: number
  }) {
    const filterParts: string[] = []
    if (params?.actor && params.actor !== 'all') {
      filterParts.push(`actor = "${params.actor}"`)
    }
    if (params?.target && params.target !== 'all') {
      filterParts.push(`target = "${params.target}"`)
    }
    if (params?.action && params.action !== 'all') {
      filterParts.push(`action = "${params.action}"`)
    }
    if (params?.module && params.module !== 'all') {
      filterParts.push(`module = "${params.module}"`)
    }
    if (params?.result && params.result !== 'all') {
      filterParts.push(`result = "${params.result}"`)
    }
    if (params?.startDate) {
      filterParts.push(`created >= "${params.startDate} 00:00:00"`)
    }
    if (params?.endDate) {
      filterParts.push(`created <= "${params.endDate} 23:59:59"`)
    }
    if (params?.search) {
      const s = params.search.replace(/"/g, '\\"')
      filterParts.push(
        `(description ~ "${s}" || action ~ "${s}" || module ~ "${s}" || ip ~ "${s}")`,
      )
    }

    return await pb
      .collection('audit_logs')
      .getList<AuditLog>(params?.page || 1, params?.limit || 50, {
        filter: filterParts.join(' && '),
        sort: '-created',
        expand: 'actor,target',
      })
  },

  async getModules() {
    return [
      { id: 'users', label: 'Equipe & Usuários' },
      { id: 'auth', label: 'Autenticação & Segurança' },
      { id: 'commissions', label: 'Comissões' },
      { id: 'settings', label: 'Configurações' },
      { id: 'payments', label: 'Pagamentos' },
      { id: 'reports', label: 'Relatórios' },
      { id: 'sales', label: 'Vendas' },
      { id: 'customers', label: 'Clientes' },
    ]
  },
}

export const smtpService = {
  /** Obtém configurações de SMTP para visualização (sem a senha em texto puro) */
  async getSettings(): Promise<import('@/types/crm').CompanyMailSettings> {
    return await pb.send<import('@/types/crm').CompanyMailSettings>('/backend/v1/settings/email', {
      method: 'GET',
    })
  },

  /** Salva/atualiza as configurações de SMTP da empresa */
  async saveSettings(data: Partial<import('@/types/crm').CompanyMailSettings>): Promise<{
    success: boolean
    message: string
    settings: import('@/types/crm').CompanyMailSettings
  }> {
    return await pb.send<{
      success: boolean
      message: string
      settings: import('@/types/crm').CompanyMailSettings
    }>('/backend/v1/settings/email', {
      method: 'PUT',
      body: data,
    })
  },

  /** Executa teste de conectividade e envio de e-mail */
  async testEmail(
    toEmail?: string,
    credentials?: {
      smtp_host?: string
      smtp_port?: number
      smtp_username?: string
      smtp_password?: string
      security_type?: string
      from_address?: string
      from_name?: string
      reply_to?: string
    },
  ): Promise<{
    success: boolean
    message: string
    error?: string
    tested_at?: string
  }> {
    try {
      return await pb.send<{
        success: boolean
        message: string
        error?: string
        tested_at?: string
      }>('/backend/v1/settings/email/test', {
        method: 'POST',
        body: {
          to_email: toEmail,
          ...credentials,
        },
      })
    } catch (err: any) {
      return {
        success: false,
        message:
          err?.data?.message ||
          err?.message ||
          'Não foi possível enviar o e-mail. Verifique servidor, porta, usuário, senha e protocolo de segurança.',
        error: err?.data?.error,
      }
    }
  },

  async getStatus(): Promise<{
    configured: boolean
    enabled?: boolean
    host: string
    port: string
    from: string
    last_test_status?: string
    last_tested_at?: string
  }> {
    try {
      const res = await pb.send('/backend/v1/smtp/status', { method: 'GET' })
      return res
    } catch {
      return { configured: false, host: '', port: '587', from: '' }
    }
  },

  async sendTestEmail(
    toEmail?: string,
    credentials?: {
      smtp_host?: string
      smtp_port?: number
      smtp_username?: string
      smtp_password?: string
      security_type?: string
      from_address?: string
      from_name?: string
      reply_to?: string
    },
  ): Promise<{
    success: boolean
    message: string
    error?: string
    code?: string
  }> {
    return await this.testEmail(toEmail, credentials)
  },
}

export const companyService = {
  async get() {
    const list = await pb.collection('company_settings').getFullList<CompanySettings>({
      sort: 'created',
    })
    return list[0] || null
  },

  async save(data: Partial<CompanySettings>) {
    const existing = await this.get()
    if (existing) {
      return await pb.collection('company_settings').update<CompanySettings>(existing.id, data)
    }
    return await pb.collection('company_settings').create<CompanySettings>(data)
  },

  /** Salva (ou remove) o logo da empresa como upload de arquivo. */
  async saveLogo(file: File | null): Promise<CompanySettings | null> {
    const existing = await this.get()
    if (!existing) return null
    if (file) {
      const formData = new FormData()
      formData.append('logo', file)
      const updated = await pb
        .collection('company_settings')
        .update<CompanySettings>(existing.id, formData)
      return updated
    }
    // remove o logo
    const updated = await pb
      .collection('company_settings')
      .update<CompanySettings>(existing.id, { logo: null })
    return updated
  },

  /** URL absoluta do logo armazenado, ou '' se não houver. */
  logoUrl(company: CompanySettings | null): string {
    if (!company || !company.logo) return ''
    return pb.files.getUrl(company, company.logo)
  },
}

export const emailLogService = {
  async getBySale(saleId: string) {
    return await pb.collection('email_logs').getFullList<EmailLog>({
      filter: `sale = "${saleId}"`,
      sort: '-created',
      expand: 'sent_by',
    })
  },

  async create(data: {
    sale: string
    to_email: string
    subject?: string
    body?: string
    doc_type?: EmailDocType
    sent_by?: string
  }) {
    return await pb.collection('email_logs').create<EmailLog>(data)
  },

  /**
   * Envia um email REAL via SMTP através da server-side function
   * POST /backend/v1/send-email. Registra automaticamente em email_logs.
   */
  async sendEmail(data: {
    to_email: string
    subject: string
    body: string
    sale?: string
    doc_type?: EmailDocType
    sent_by?: string
    attachment_html?: string
    attachment_filename?: string
  }): Promise<{ status: 'sent' | 'failed'; message: string; error?: string }> {
    try {
      const res = await pb.send('/backend/v1/send-email', {
        method: 'POST',
        body: data,
      })
      return {
        status: res.status || 'sent',
        message: res.message || 'Email enviado.',
        error: res.error,
      }
    } catch (err: any) {
      const msg = err?.response?.message || err?.message || 'Falha ao enviar email.'
      return { status: 'failed', message: msg, error: msg }
    }
  },
}

export const salesTargetService = {
  /** Retorna todas as metas de um mês (YYYY-MM). */
  async getByMonth(month: string) {
    return await pb.collection('sales_targets').getFullList<SalesTarget>({
      filter: `month = "${month}"`,
      expand: 'user',
      sort: 'user',
    })
  },

  /** Busca a meta de um vendedor para um mês específico (ou null). */
  async getForUser(user: string, month: string) {
    const list = await pb.collection('sales_targets').getFullList<SalesTarget>({
      filter: `user = "${user}" && month = "${month}"`,
      expand: 'user',
    })
    return list[0] || null
  },

  async create(data: { user: string; month: string; target: number }) {
    return await pb.collection('sales_targets').create<SalesTarget>(data, {
      expand: 'user',
    })
  },

  async update(id: string, data: Partial<{ target: number }>) {
    return await pb.collection('sales_targets').update<SalesTarget>(id, data, {
      expand: 'user',
    })
  },

  /** Cria ou atualiza a meta (upsert) de um vendedor para o mês. */
  async upsert(data: { user: string; month: string; target: number }) {
    const existing = await this.getForUser(data.user, data.month)
    if (existing) {
      return await this.update(existing.id, { target: data.target })
    }
    return await this.create(data)
  },

  async delete(id: string) {
    return await pb.collection('sales_targets').delete(id)
  },
}

export const backupService = {
  /** Listar backups com paginação */
  async getAll(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qStr = query.toString() ? `?${query.toString()}` : ''
    return await pb.send<{
      items: import('@/types/crm').DatabaseBackup[]
      totalItems: number
      page: number
      limit: number
    }>(`/backend/v1/backups${qStr}`, {
      method: 'GET',
    })
  },

  /** Criar novo backup manual */
  async create(data?: {
    notes?: string
    is_protected?: boolean
    backup_type?: 'manual' | 'automatic'
  }) {
    return await pb.send<{
      success: boolean
      message: string
      backup: {
        id: string
        filename: string
        size: number
        checksum: string
        records_count: number
        status: string
        created: string
      }
    }>('/backend/v1/backups', {
      method: 'POST',
      body: data || {},
    })
  },

  /** Solicitar URL de download seguro de backup */
  async getDownloadUrl(id: string) {
    return await pb.send<{
      download_url: string
      filename: string
      size: number
      checksum: string
    }>(`/backend/v1/backups/${id}/download`, {
      method: 'GET',
    })
  },

  /** Restaurar banco de dados a partir de backup (requer confirmação explícita "RESTAURAR") */
  async restore(id: string, confirmation: string) {
    return await pb.send<{
      success: boolean
      message: string
      summary: {
        backup_id: string
        filename: string
        records_restored: number
        collections_restored: number
        safety_backup_id?: string
      }
    }>(`/backend/v1/backups/${id}/restore`, {
      method: 'POST',
      body: { confirmation },
    })
  },

  /** Excluir backup físico permanentemente */
  async delete(id: string) {
    return await pb.send<{
      success: boolean
      message: string
    }>(`/backend/v1/backups/${id}`, {
      method: 'DELETE',
    })
  },

  /** Obter configurações de automação e retenção */
  async getSettings() {
    return await pb.send<import('@/types/crm').DatabaseBackupSettings>(
      '/backend/v1/backups/settings',
      {
        method: 'GET',
      },
    )
  },

  /** Salvar configurações de automação e retenção */
  async saveSettings(data: Partial<import('@/types/crm').DatabaseBackupSettings>) {
    return await pb.send<{
      success: boolean
      message: string
      settings: import('@/types/crm').DatabaseBackupSettings
    }>('/backend/v1/backups/settings', {
      method: 'POST',
      body: data,
    })
  },
}

export const reminderService = {
  /** Lembretes pendentes de um usuário, ordenados por vencimento. */
  async getPending(userId: string) {
    return await pb.collection('reminders').getFullList<Reminder>({
      filter: `user = "${userId}" && status = "pending"`,
      sort: 'due_date,created',
      expand: 'deal,deal.customer',
    })
  },

  async getAll(userId: string) {
    return await pb.collection('reminders').getFullList<Reminder>({
      filter: `user = "${userId}"`,
      sort: '-due_date',
      expand: 'deal,deal.customer',
    })
  },

  async create(data: { deal: string; user: string; message: string; due_date?: string }) {
    return await pb.collection('reminders').create<Reminder>(
      {
        ...data,
        status: 'pending' as ReminderStatus,
      },
      { expand: 'deal,deal.customer' },
    )
  },

  async markDone(id: string) {
    return await pb
      .collection('reminders')
      .update<Reminder>(id, { status: 'done' }, { expand: 'deal,deal.customer' })
  },

  async delete(id: string) {
    return await pb.collection('reminders').delete(id)
  },
}
