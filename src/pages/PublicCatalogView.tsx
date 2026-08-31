import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { publicCatalogService } from '@/services/builder'
import { customerService } from '@/services/crm'
import { RenderElement } from '@/components/builder/RenderElement'
import { CartAndCheckoutModal } from '@/components/builder/CartAndCheckoutModal'
import type { SalePage } from '@/types/builder'
import type { Product, Customer } from '@/types/crm'
import { Loader2, AlertTriangle, Store, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const PublicCatalogView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [pageData, setPageData] = useState<SalePage | null>(null)
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [sellerInfo, setSellerInfo] = useState<any>(null)
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])

  // Estado do Carrinho de Compras
  const [cartItems, setCartItems] = useState<
    Array<{ product: Product; quantity: number; unitPrice: number; subtotal: number }>
  >([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  useEffect(() => {
    const loadCatalog = async () => {
      if (!slug) return
      setIsLoading(true)
      setError(null)

      try {
        const [res, custs] = await Promise.all([
          publicCatalogService.loadPublicPage(slug),
          customerService.getAll().catch(() => []),
        ])

        setPageData(res.page)
        setCompanyInfo(res.company)
        setSellerInfo(res.seller)
        setTargetCustomer(res.target_customer as Customer)
        setProducts(res.products)
        setAllCustomers(custs)

        // Registra telemetria de visualização da página
        if (res.page?.id) {
          publicCatalogService.sendAnalyticsEvent({
            page_id: res.page.id,
            event_type: 'page_view',
            customer_id: res.target_customer?.id,
            device_type:
              window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
            referrer: document.referrer,
          })
        }
      } catch (err: any) {
        console.error('Erro ao abrir catálogo:', err)
        setError(err?.message || 'Catálogo não encontrado ou expirado.')
      } finally {
        setIsLoading(false)
      }
    }

    loadCatalog()
  }, [slug])

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((it) => it.product.id !== product.id)
      }

      const existingIndex = prev.findIndex((it) => it.product.id === product.id)
      const unitPrice = Number(product.price || 0)
      const subtotal = Math.round(unitPrice * quantity * 100) / 100

      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          product,
          quantity,
          unitPrice,
          subtotal,
        }
        return updated
      } else {
        return [...prev, { product, quantity, unitPrice, subtotal }]
      }
    })

    // Registra evento de adição ao carrinho no analytics
    if (pageData?.id && quantity > 0) {
      publicCatalogService.sendAnalyticsEvent({
        page_id: pageData.id,
        event_type: 'add_to_cart',
        product_id: product.id,
        customer_id: targetCustomer?.id,
      })
    }
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    const prod = products.find((p) => p.id === productId)
    if (prod) {
      handleAddToCart(prod, quantity)
    }
  }

  const handleClearCart = () => {
    setCartItems([])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Carregando catálogo e produtos oficiais...</p>
      </div>
    )
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Catálogo Indisponível</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'Esta página pode ter expirado ou não foi encontrada no sistema.'}
          </p>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
          >
            Ir para a Página Inicial
          </Button>
        </div>
      </div>
    )
  }

  const layout = pageData.layout_data
  const rootChildren = layout?.root?.children || []

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: layout?.root?.styles?.backgroundColor || '#f8fafc',
        fontFamily: layout?.root?.styles?.fontFamily || 'inherit',
      }}
    >
      {/* Custom CSS injetado com segurança se fornecido */}
      {pageData.custom_css && <style>{pageData.custom_css}</style>}

      {/* Renderiza árvore de elementos da página */}
      <main className="flex-1 w-full">
        {rootChildren.map((childId) => {
          const el = layout.elements[childId]
          if (!el) return null
          return (
            <RenderElement
              key={el.id}
              element={el}
              allElements={layout.elements}
              breakpoint="desktop"
              isEditor={false}
              products={products}
              companyInfo={companyInfo}
              sellerInfo={sellerInfo}
              customerInfo={targetCustomer}
              cartItems={cartItems}
              onAddToCart={handleAddToCart}
              onOpenCart={() => setIsCheckoutOpen(true)}
              onCheckoutClick={() => setIsCheckoutOpen(true)}
            />
          )
        })}
      </main>

      {/* Botão Flutuante do Carrinho no Mobile/Tablet */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsCheckoutOpen(true)}
            className="h-14 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl flex items-center gap-3 border-2 border-white animate-bounce-subtle"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Meu Pedido ({cartItems.reduce((acc, it) => acc + it.quantity, 0)})</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              R${' '}
              {cartItems
                .reduce((acc, it) => acc + it.subtotal, 0)
                .toFixed(2)
                .replace('.', ',')}
            </span>
          </Button>
        </div>
      )}

      {/* Modal de Carrinho e Checkout */}
      <CartAndCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        pageId={pageData.id}
        pageTitle={pageData.title}
        customers={allCustomers.length > 0 ? allCustomers : targetCustomer ? [targetCustomer] : []}
        targetCustomer={targetCustomer}
        sellerInfo={sellerInfo}
      />
    </div>
  )
}
