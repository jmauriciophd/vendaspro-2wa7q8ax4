import pb from '@/lib/pocketbase/client'
import type { Customer, Product, Deal, Sale, SaleItem, User } from '@/types/crm'

export const customerService = {
  async getAll(params?: { search?: string; size?: string; status?: string; sort?: string }) {
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

    return await pb.collection('customers').getFullList<Customer>({
      filter: filterParts.join(' && '),
      sort: params?.sort || '-created',
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
  async getAll(params?: { activeOnly?: boolean; category?: string }) {
    const filterParts: string[] = []
    if (params?.activeOnly) {
      filterParts.push('active = true')
    }
    if (params?.category && params.category !== 'all') {
      filterParts.push(`category = "${params.category}"`)
    }

    return await pb.collection('products').getFullList<Product>({
      filter: filterParts.join(' && '),
      sort: 'name',
    })
  },

  async getById(id: string) {
    return await pb.collection('products').getOne<Product>(id)
  },

  async create(data: Partial<Product>) {
    return await pb.collection('products').create<Product>(data)
  },

  async update(id: string, data: Partial<Product>) {
    return await pb.collection('products').update<Product>(id, data)
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

    return await pb.collection('sales').getFullList<Sale>({
      filter: filterParts.join(' && '),
      sort: params?.sort || '-sale_date,-created',
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
}
