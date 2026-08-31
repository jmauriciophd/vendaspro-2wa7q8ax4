import pb from '@/lib/pocketbase/client'
import type {
  PageTemplate,
  SalePage,
  PageVersion,
  MediaAsset,
  AnalyticsEvent,
  OrderCheckoutPayload,
  OrderCheckoutResponse,
  PageLayoutData,
} from '@/types/builder'
import type { Product } from '@/types/crm'

export const templateService = {
  async getAll(params?: { category?: string; activeOnly?: boolean }) {
    const filterParts: string[] = []
    if (params?.category && params.category !== 'all') {
      filterParts.push(`category = "${params.category}"`)
    }
    if (params?.activeOnly) {
      filterParts.push('is_active = true')
    }

    return await pb.collection('page_templates').getFullList<PageTemplate>({
      filter: filterParts.join(' && '),
      sort: '-created',
      expand: 'created_by',
    })
  },

  async getById(id: string) {
    return await pb.collection('page_templates').getOne<PageTemplate>(id, {
      expand: 'created_by',
    })
  },

  async getBySlug(slug: string) {
    return await pb
      .collection('page_templates')
      .getFirstListItem<PageTemplate>(`slug = "${slug}"`, {
        expand: 'created_by',
      })
  },

  async create(data: Partial<PageTemplate>) {
    return await pb.collection('page_templates').create<PageTemplate>(data)
  },

  async update(id: string, data: Partial<PageTemplate>) {
    return await pb.collection('page_templates').update<PageTemplate>(id, data)
  },

  async delete(id: string) {
    return await pb.collection('page_templates').delete(id)
  },

  async duplicate(id: string, newTitle?: string) {
    const original = await this.getById(id)
    const suffix = Math.random().toString(36).substring(2, 7)
    const payload: Partial<PageTemplate> = {
      title: newTitle || `${original.title} (Cópia)`,
      slug: `${original.slug}-copia-${suffix}`,
      category: original.category,
      description: original.description,
      layout_data: original.layout_data,
      settings: original.settings,
      is_system_default: false,
      is_active: true,
      created_by: pb.authStore.model?.id,
    }
    return await this.create(payload)
  },
}

export const salePageService = {
  async getAll(params?: { sellerId?: string; status?: string; type?: string; search?: string }) {
    const filterParts: string[] = []
    if (params?.sellerId && params.sellerId !== 'all') {
      filterParts.push(`seller = "${params.sellerId}"`)
    }
    if (params?.status && params.status !== 'all') {
      filterParts.push(`status = "${params.status}"`)
    }
    if (params?.type && params.type !== 'all') {
      filterParts.push(`type = "${params.type}"`)
    }
    if (params?.search) {
      const s = params.search.replace(/"/g, '\\"')
      filterParts.push(`(title ~ "${s}" || slug ~ "${s}" || campaign_name ~ "${s}")`)
    }

    return await pb.collection('sale_pages').getFullList<SalePage>({
      filter: filterParts.join(' && '),
      sort: '-created',
      expand: 'template,seller,target_customer,created_by',
    })
  },

  async getById(id: string) {
    return await pb.collection('sale_pages').getOne<SalePage>(id, {
      expand: 'template,seller,target_customer,created_by',
    })
  },

  async getBySlugOrToken(identifier: string) {
    try {
      return await pb
        .collection('sale_pages')
        .getFirstListItem<SalePage>(`slug = "${identifier}" || access_token = "${identifier}"`, {
          expand: 'template,seller,target_customer',
        })
    } catch {
      return null
    }
  },

  async create(data: Partial<SalePage>) {
    const token =
      Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6)
    const payload = {
      ...data,
      access_token: data.access_token || token,
      views_count: 0,
      orders_count: 0,
      sales_total: 0,
      version: 1,
      created_by: pb.authStore.model?.id,
    }
    const record = await pb.collection('sale_pages').create<SalePage>(payload)

    // Cria a primeira versão do histórico
    if (data.layout_data) {
      await pageVersionService.create({
        page: record.id,
        version_number: 1,
        notes: 'Versão inicial criada',
        layout_data: data.layout_data,
        settings: data.settings,
      })
    }

    return record
  },

  async update(id: string, data: Partial<SalePage>, versionNote?: string) {
    const current = await this.getById(id)
    const newVersion = (current.version || 1) + 1

    const updated = await pb.collection('sale_pages').update<SalePage>(id, {
      ...data,
      version: newVersion,
    })

    if (data.layout_data) {
      await pageVersionService.create({
        page: id,
        version_number: newVersion,
        notes: versionNote || `Atualização da página (v${newVersion})`,
        layout_data: data.layout_data,
        settings: data.settings || current.settings,
      })
    }

    return updated
  },

  async delete(id: string) {
    return await pb.collection('sale_pages').delete(id)
  },

  async duplicate(id: string, newTitle?: string) {
    const original = await this.getById(id)
    const suffix = Math.random().toString(36).substring(2, 7)
    const payload: Partial<SalePage> = {
      title: newTitle || `${original.title} (Cópia)`,
      slug: `${original.slug}-copia-${suffix}`,
      type: original.type,
      status: 'draft',
      visibility: original.visibility,
      template: original.template,
      seller: pb.authStore.model?.id || original.seller,
      target_customer: original.target_customer,
      campaign_name: original.campaign_name,
      layout_data: original.layout_data,
      settings: original.settings,
      seo_title: original.seo_title,
      seo_description: original.seo_description,
      custom_css: original.custom_css,
      custom_html: original.custom_html,
    }
    return await this.create(payload)
  },

  /** Obtém a URL pública amigável de compartilhamento sem IDs sensíveis */
  getPublicUrl(page: SalePage): string {
    const baseUrl = window.location.origin
    return `${baseUrl}/v/${page.slug || page.access_token}`
  },

  /** Obter métricas do vendedor */
  async getSellerDashboard() {
    return await pb.send<{
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
    }>('/backend/v1/builder/seller/dashboard', { method: 'GET' })
  },
}

export const pageVersionService = {
  async getByPage(pageId: string) {
    return await pb.collection('page_versions').getFullList<PageVersion>({
      filter: `page = "${pageId}"`,
      sort: '-version_number',
      expand: 'created_by',
    })
  },

  async create(data: Partial<PageVersion>) {
    return await pb.collection('page_versions').create<PageVersion>({
      ...data,
      created_by: pb.authStore.model?.id,
    })
  },

  async restore(pageId: string, versionId: string) {
    const version = await pb.collection('page_versions').getOne<PageVersion>(versionId)
    return await salePageService.update(
      pageId,
      {
        layout_data: version.layout_data,
        settings: version.settings,
      },
      `Restaurado da versão #${version.version_number}`,
    )
  },
}

export const mediaAssetService = {
  async getAll() {
    return await pb.collection('media_assets').getFullList<MediaAsset>({
      sort: '-created',
      expand: 'uploaded_by',
    })
  },

  async upload(file: File, altText?: string, title?: string): Promise<MediaAsset> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title || file.name)
    formData.append('alt_text', altText || '')
    formData.append('file_type', file.type)
    formData.append('file_size', String(file.size))
    if (pb.authStore.model?.id) {
      formData.append('uploaded_by', pb.authStore.model.id)
    }

    return await pb.collection('media_assets').create<MediaAsset>(formData)
  },

  async delete(id: string) {
    return await pb.collection('media_assets').delete(id)
  },

  getFileUrl(asset: MediaAsset): string {
    if (!asset || !asset.file) return ''
    return pb.files.getUrl(asset, asset.file)
  },
}

export const publicCatalogService = {
  /** Carrega a página/catálogo público autenticado */
  async loadPublicPage(identifier: string) {
    return await pb.send<{
      page: SalePage
      company: {
        name: string
        cnpj: string
        ie: string
        phone: string
        email: string
        address: string
        city: string
        state: string
        logo?: string
      } | null
      seller: {
        id: string
        name: string
        email: string
        avatar?: string
      } | null
      target_customer: {
        id: string
        name: string
        owner_name?: string
        cnpj?: string
        phone?: string
        email?: string
        city?: string
        state?: string
        address?: string
      } | null
      products: Product[]
    }>(`/backend/v1/builder/public/page/${identifier}`, {
      method: 'GET',
    })
  },

  /** Envia evento de telemetria (visualização, clique, carrinho) */
  async sendAnalyticsEvent(data: {
    page_id: string
    event_type:
      | 'page_view'
      | 'product_click'
      | 'add_to_cart'
      | 'remove_from_cart'
      | 'checkout_step'
      | 'order_completed'
    customer_id?: string
    product_id?: string
    device_type?: string
    referrer?: string
    payload?: Record<string, any>
  }) {
    try {
      return await pb.send('/backend/v1/builder/analytics/event', {
        method: 'POST',
        body: data,
      })
    } catch {
      // Falhas em analytics não bloqueiam a experiência do usuário
      return null
    }
  },

  /** Finaliza checkout atômico com recálculo seguro no backend */
  async createOrder(payload: OrderCheckoutPayload): Promise<OrderCheckoutResponse> {
    return await pb.send<OrderCheckoutResponse>('/backend/v1/builder/checkout/create-order', {
      method: 'POST',
      body: payload,
    })
  },
}
