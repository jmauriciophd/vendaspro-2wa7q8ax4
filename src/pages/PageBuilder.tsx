import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Eye,
  Save,
  Send,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Sliders,
  History,
  Layers,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Lock,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ELEMENT_DEFINITIONS } from '@/components/builder/elementDefinitions'
import { RenderElement } from '@/components/builder/RenderElement'
import { ElementStylePanel } from '@/components/builder/ElementStylePanel'
import { MediaLibraryModal } from '@/components/builder/MediaLibraryModal'
import { VersionHistoryModal } from '@/components/builder/VersionHistoryModal'
import { salePageService, templateService } from '@/services/builder'
import { productService, customerService } from '@/services/crm'
import { useAuth } from '@/context/AuthContext'
import type {
  SalePage,
  BuilderElement,
  PageLayoutData,
  Breakpoint,
  PageSettings,
  PageBuilderElementType,
} from '@/types/builder'
import type { Product, Customer } from '@/types/crm'
import { toast } from 'sonner'

export const PageBuilder: React.FC = () => {
  const navigate = useNavigate()
  const { pageId, templateId } = useParams<{ pageId?: string; templateId?: string }>()
  const { user, can } = useAuth()

  // Estados principais da página e layout
  const [page, setPage] = useState<SalePage | null>(null)
  const [pageTitle, setPageTitle] = useState('Novo Catálogo Comercial')
  const [layout, setLayout] = useState<PageLayoutData>({
    root: {
      id: 'root',
      type: 'page',
      styles: { backgroundColor: '#f8fafc' },
      pageSettings: {
        pagePaddingDesktop: '24px',
        pagePaddingTablet: '20px',
        pagePaddingMobile: '16px',
        pageMaxWidth: '1200px',
        contentAlign: 'center',
        backgroundColor: '#f8fafc',
      },
      children: [],
    },
    elements: {},
  })

  // Seleção e visualização
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')
  const [isPreview, setIsPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')

  // Camadas: controle de nós expandidos
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true })

  // Histórico Undo/Redo na memória do editor
  const [history, setHistory] = useState<PageLayoutData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Modais auxiliares
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)

  // Dados reais do CRM para renderização de teste no canvas
  const [realProducts, setRealProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Ref para auto-scroll do canvas
  const canvasScrollContainerRef = useRef<HTMLDivElement>(null)

  // Carrega produtos reais e clientes do CRM
  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const [prods, custs] = await Promise.all([
          productService.getAll({ activeOnly: true }),
          customerService.getAll(),
        ])
        setRealProducts(prods)
        setCustomers(custs)
        if (custs.length > 0) setSelectedCustomer(custs[0])
      } catch (err) {
        console.error('Erro ao carregar dados do CRM:', err)
      }
    }
    fetchAuxData()
  }, [])

  // Carrega página ou template inicial com migração de templates antigos se necessário
  useEffect(() => {
    const loadInitial = async () => {
      try {
        if (pageId && pageId !== 'new') {
          const loadedPage = await salePageService.getById(pageId)
          setPage(loadedPage)
          setPageTitle(loadedPage.title)
          if (loadedPage.layout_data?.root) {
            setLayout(loadedPage.layout_data)
            setHistory([loadedPage.layout_data])
            setHistoryIndex(0)
          }
        } else if (templateId) {
          const tpl = await templateService.getById(templateId)
          setPageTitle(`${tpl.title} (Personalizado)`)
          if (tpl.layout_data?.root) {
            setLayout(tpl.layout_data)
            setHistory([tpl.layout_data])
            setHistoryIndex(0)
          }
        } else {
          const tpls = await templateService.getAll({ activeOnly: true })
          if (tpls.length > 0 && tpls[0].layout_data?.root) {
            setLayout(tpls[0].layout_data)
            setHistory([tpls[0].layout_data])
            setHistoryIndex(0)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar layout:', err)
        toast.error('Não foi possível carregar a página.')
      }
    }
    loadInitial()
  }, [pageId, templateId])

  // Aplica alteração no layout com histórico
  const applyLayoutChange = (newLayout: PageLayoutData, skipHistory = false) => {
    setLayout(newLayout)
    setSaveStatus('unsaved')

    if (!skipHistory) {
      const nextHistory = history.slice(0, historyIndex + 1)
      nextHistory.push(newLayout)
      setHistory(nextHistory)
      setHistoryIndex(nextHistory.length - 1)
    }
  }

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      setLayout(history[prevIndex])
      setHistoryIndex(prevIndex)
      setSaveStatus('unsaved')
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setLayout(history[nextIndex])
      setHistoryIndex(nextIndex)
      setSaveStatus('unsaved')
    }
  }

  // Encontra o elemento Pai de um ID na árvore
  const findParentElement = (childId: string): BuilderElement | null => {
    for (const key of Object.keys(layout.elements)) {
      const el = layout.elements[key]
      if (el.children && el.children.includes(childId)) {
        return el
      }
    }
    return null
  }

  // Adiciona novo elemento ao canvas ou dentro do container selecionado
  const handleAddElement = (meta: (typeof ELEMENT_DEFINITIONS)[0], targetParentId?: string) => {
    const newId = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newElement: BuilderElement = {
      id: newId,
      type: meta.type,
      name: meta.label,
      canHaveChildren: meta.canHaveChildren ?? false,
      styles: { ...meta.defaultStyles },
      content: { ...meta.defaultContent },
      children: [],
    }

    const updatedElements = {
      ...layout.elements,
      [newId]: newElement,
    }

    let updatedRootChildren = [...layout.root.children]
    const effectiveParentId = targetParentId || selectedId

    if (effectiveParentId && layout.elements[effectiveParentId]) {
      const parent = layout.elements[effectiveParentId]
      const canAccept =
        parent.type === 'section' ||
        parent.type === 'container' ||
        parent.type === 'card' ||
        parent.type === 'columns' ||
        parent.type === 'grid' ||
        parent.type === 'flexbox' ||
        parent.type === 'hero' ||
        parent.type === 'header' ||
        parent.type === 'footer' ||
        parent.type === 'product_single' ||
        parent.type === 'product_card'

      if (canAccept) {
        updatedElements[parent.id] = {
          ...parent,
          children: [...(parent.children || []), newId],
        }
        setExpandedNodes((prev) => ({ ...prev, [parent.id]: true }))
      } else {
        updatedRootChildren.push(newId)
      }
    } else {
      updatedRootChildren.push(newId)
    }

    const nextLayout: PageLayoutData = {
      root: {
        ...layout.root,
        children: updatedRootChildren,
      },
      elements: updatedElements,
    }

    applyLayoutChange(nextLayout)
    setSelectedId(newId)
    toast.success(`Elemento "${meta.label}" adicionado!`)
  }

  // Adiciona um filho específico a um elemento pai
  const handleAddChildToElement = (parentId: string, childType: string) => {
    const meta =
      ELEMENT_DEFINITIONS.find((e) => e.type === childType) ||
      ({
        type: childType as PageBuilderElementType,
        label: childType,
        defaultStyles: {},
        defaultContent: {},
      } as any)

    handleAddElement(meta, parentId)
  }

  // Atualizar elemento selecionado
  const handleUpdateElement = (updated: BuilderElement) => {
    const nextLayout: PageLayoutData = {
      ...layout,
      elements: {
        ...layout.elements,
        [updated.id]: updated,
      },
    }
    applyLayoutChange(nextLayout)
  }

  // Atualizar configurações da página
  const handleUpdatePageSettings = (settings: PageSettings) => {
    const nextLayout: PageLayoutData = {
      ...layout,
      root: {
        ...layout.root,
        pageSettings: settings,
        styles: {
          ...layout.root.styles,
          backgroundColor: settings.backgroundColor,
        },
      },
    }
    applyLayoutChange(nextLayout)
  }

  // Excluir elemento (com remoção em cascata segura)
  const handleDeleteElement = (id: string) => {
    const cleanChildren = (children: string[]): string[] => children.filter((cId) => cId !== id)

    const updatedElements = { ...layout.elements }
    delete updatedElements[id]

    Object.keys(updatedElements).forEach((key) => {
      if (updatedElements[key].children) {
        updatedElements[key].children = cleanChildren(updatedElements[key].children || [])
      }
    })

    const nextLayout: PageLayoutData = {
      root: {
        ...layout.root,
        children: cleanChildren(layout.root.children),
      },
      elements: updatedElements,
    }

    applyLayoutChange(nextLayout)
    if (selectedId === id) setSelectedId(null)
    toast.success('Elemento removido.')
  }

  // Duplicar elemento com recursão
  const handleDuplicateElement = (id: string) => {
    const original = layout.elements[id]
    if (!original) return

    const newId = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const duplicated: BuilderElement = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: `${original.name || original.type} (Cópia)`,
    }

    const updatedElements = {
      ...layout.elements,
      [newId]: duplicated,
    }

    const parent = findParentElement(id)
    let updatedRootChildren = [...layout.root.children]

    if (parent) {
      const pChildren = [...(parent.children || [])]
      const idx = pChildren.indexOf(id)
      pChildren.splice(idx + 1, 0, newId)
      updatedElements[parent.id] = {
        ...parent,
        children: pChildren,
      }
    } else {
      const idx = updatedRootChildren.indexOf(id)
      if (idx >= 0) {
        updatedRootChildren.splice(idx + 1, 0, newId)
      } else {
        updatedRootChildren.push(newId)
      }
    }

    applyLayoutChange({
      root: {
        ...layout.root,
        children: updatedRootChildren,
      },
      elements: updatedElements,
    })
    setSelectedId(newId)
    toast.success('Elemento duplicado com sucesso!')
  }

  // Mover elemento para cima na lista do pai
  const handleMoveUp = (id: string) => {
    const parent = findParentElement(id)
    if (parent) {
      const children = [...(parent.children || [])]
      const idx = children.indexOf(id)
      if (idx > 0) {
        const temp = children[idx]
        children[idx] = children[idx - 1]
        children[idx - 1] = temp
        handleUpdateElement({ ...parent, children })
      }
    } else {
      const rootChildren = [...layout.root.children]
      const idx = rootChildren.indexOf(id)
      if (idx > 0) {
        const temp = rootChildren[idx]
        rootChildren[idx] = rootChildren[idx - 1]
        rootChildren[idx - 1] = temp
        applyLayoutChange({
          ...layout,
          root: { ...layout.root, children: rootChildren },
        })
      }
    }
  }

  // Mover elemento para baixo na lista do pai
  const handleMoveDown = (id: string) => {
    const parent = findParentElement(id)
    if (parent) {
      const children = [...(parent.children || [])]
      const idx = children.indexOf(id)
      if (idx >= 0 && idx < children.length - 1) {
        const temp = children[idx]
        children[idx] = children[idx + 1]
        children[idx + 1] = temp
        handleUpdateElement({ ...parent, children })
      }
    } else {
      const rootChildren = [...layout.root.children]
      const idx = rootChildren.indexOf(id)
      if (idx >= 0 && idx < rootChildren.length - 1) {
        const temp = rootChildren[idx]
        rootChildren[idx] = rootChildren[idx + 1]
        rootChildren[idx + 1] = temp
        applyLayoutChange({
          ...layout,
          root: { ...layout.root, children: rootChildren },
        })
      }
    }
  }

  // Salvar rascunho / Publicar
  const handleSave = async (publish = false) => {
    setIsSaving(true)
    setSaveStatus('saving')

    try {
      const slug = pageTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')

      const payload: Partial<SalePage> = {
        title: pageTitle,
        slug: page?.slug || `${slug}-${Math.random().toString(36).substring(2, 6)}`,
        status: publish ? 'published' : page?.status || 'draft',
        type: page?.type || 'catalogo',
        visibility: page?.visibility || 'public',
        template: templateId || page?.template,
        seller: page?.seller || user?.id,
        target_customer:
          page?.target_customer || (selectedCustomer ? selectedCustomer.id : undefined),
        layout_data: layout,
      }

      let saved: SalePage
      if (page?.id) {
        saved = await salePageService.update(
          page.id,
          payload,
          publish ? 'Publicação da página' : 'Alteração no editor visual',
        )
      } else {
        saved = await salePageService.create(payload)
      }

      setPage(saved)
      setSaveStatus('saved')
      toast.success(
        publish ? '🎉 Catálogo publicado com sucesso!' : '✅ Alterações salvas com sucesso!',
      )
    } catch (err: any) {
      setSaveStatus('unsaved')
      toast.error('Erro ao salvar página: ' + (err?.message || 'Falha'))
    } finally {
      setIsSaving(false)
    }
  }

  // Elemento selecionado no momento e seu elemento pai
  const selectedElement = selectedId ? layout.elements[selectedId] || null : null
  const parentOfSelected = selectedId ? findParentElement(selectedId) : null

  // Largura do canvas de acordo com o breakpoint selecionado
  const canvasWidthClass = {
    desktop: 'w-full max-w-[1240px]',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  }[breakpoint]

  // Renderização recursiva da árvore de camadas
  const renderLayerNode = (elementId: string, depth = 0) => {
    const el = layout.elements[elementId]
    if (!el) return null

    const hasChildren = el.children && el.children.length > 0
    const isExpanded = expandedNodes[el.id] ?? true
    const isCurSelected = selectedId === el.id

    return (
      <div key={el.id} className="space-y-0.5">
        <div
          onClick={() => setSelectedId(el.id)}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`py-1.5 pr-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors group ${
            isCurSelected
              ? 'border border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
              : 'hover:bg-slate-100 text-slate-700 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedNodes((prev) => ({ ...prev, [el.id]: !isExpanded }))
                }}
                className="p-0.5 text-slate-400 hover:text-slate-700"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 inline-block" />
            )}
            <span className="truncate">{el.name || el.type}</span>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleMoveUp(el.id)
              }}
              className="p-1 hover:text-indigo-600 text-slate-400"
              title="Mover para cima"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleMoveDown(el.id)
              }}
              className="p-1 hover:text-indigo-600 text-slate-400"
              title="Mover para baixo"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            {!el.locked && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteElement(el.id)
                }}
                className="p-1 hover:text-rose-600 text-slate-400"
                title="Excluir"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filhos recursivos */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 border-l border-slate-200 ml-3">
            {el.children!.map((cId) => renderLayerNode(cId, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Padding responsivo do canvas baseado em PageSettings
  const pagePadding =
    breakpoint === 'desktop'
      ? layout.root?.pageSettings?.pagePaddingDesktop || '24px'
      : breakpoint === 'tablet'
        ? layout.root?.pageSettings?.pagePaddingTablet || '20px'
        : layout.root?.pageSettings?.pagePaddingMobile || '16px'

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* ---------------- BARRA SUPERIOR (Top Bar) ---------------- */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pages')}
            className="text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Páginas</span>
          </Button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <Input
              value={pageTitle}
              onChange={(e) => {
                setPageTitle(e.target.value)
                setSaveStatus('unsaved')
              }}
              className="h-8 text-xs font-bold text-slate-800 max-w-[240px] sm:max-w-xs border-transparent hover:border-slate-200 focus:border-indigo-500"
              placeholder="Nome do Catálogo..."
            />
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                saveStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-600'
                  : saveStatus === 'saving'
                    ? 'bg-amber-50 text-amber-600 animate-pulse'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {saveStatus === 'saved'
                ? 'Salvo'
                : saveStatus === 'saving'
                  ? 'Salvando...'
                  : 'Não salvo'}
            </span>
          </div>
        </div>

        {/* Alternador de Breakpoint & Undo/Redo */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <Button
            variant={breakpoint === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBreakpoint('desktop')}
            className={`h-7 px-2.5 text-xs ${breakpoint === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            title="Desktop"
          >
            <Monitor className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={breakpoint === 'tablet' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBreakpoint('tablet')}
            className={`h-7 px-2.5 text-xs ${breakpoint === 'tablet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            title="Tablet"
          >
            <Tablet className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={breakpoint === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBreakpoint('mobile')}
            className={`h-7 px-2.5 text-xs ${breakpoint === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            title="Smartphone"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            className="h-7 w-7 text-slate-600 disabled:opacity-40"
            title="Desfazer (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            className="h-7 w-7 text-slate-600 disabled:opacity-40"
            title="Refazer (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Lado Direito: Ações (Histórico, Preview, Salvar, Publicar) */}
        <div className="flex items-center gap-2">
          {page?.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVersionModalOpen(true)}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
              title="Histórico de versões"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Versões</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className={`h-8 text-xs flex items-center gap-1 ${isPreview ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-600'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreview ? 'Editar' : 'Preview'}</span>
          </Button>

          {page?.slug && (
            <a
              href={`/v/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-2.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 flex items-center gap-1"
              title="Abrir página pública"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave(false)}
            className="h-8 text-xs text-slate-700 font-semibold flex items-center gap-1"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Salvar</span>
          </Button>

          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave(true)}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar</span>
          </Button>
        </div>
      </header>

      {/* ---------------- CORPO PRINCIPAL (3 Colunas com Scroll Total) ---------------- */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 1. PAINEL ESQUERDO: BIBLIOTECA & CAMADAS DA ÁRVORE */}
        {!isPreview && (
          <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 z-10">
            <Tabs defaultValue="elements" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-2 p-1 bg-slate-100 rounded-none border-b border-slate-200">
                <TabsTrigger value="elements" className="text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Elementos
                </TabsTrigger>
                <TabsTrigger value="tree" className="text-xs font-semibold">
                  <Layers className="w-3.5 h-3.5 mr-1" /> Camadas
                </TabsTrigger>
              </TabsList>

              {/* ABA ELEMENTOS ARRASTÁVEIS / CLICÁVEIS */}
              <TabsContent value="elements" className="flex-1 overflow-y-auto p-3 space-y-4 m-0">
                {['layout', 'commerce', 'marketing', 'basic', 'advanced'].map((cat) => {
                  const catElements = ELEMENT_DEFINITIONS.filter((e) => e.category === cat)
                  const catLabel = {
                    layout: '📐 Layout & Estrutura',
                    commerce: '🛒 E-commerce & Produtos',
                    marketing: '🎯 Conversão & Banners',
                    basic: '✏️ Textos & Mídia',
                    advanced: '⚡ Avançado & Shortcodes',
                  }[cat]

                  return (
                    <div key={cat} className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {catLabel}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {catElements.map((meta) => (
                          <button
                            key={meta.type}
                            type="button"
                            onClick={() => handleAddElement(meta)}
                            className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group flex items-start gap-2.5 shadow-2xs"
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 leading-tight">
                                {meta.label}
                              </p>
                              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                {meta.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </TabsContent>

              {/* ABA ÁRVORE DE CAMADAS */}
              <TabsContent value="tree" className="flex-1 overflow-y-auto p-3 space-y-2 m-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-700">Árvore de Elementos</p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-[10px] text-indigo-600 font-semibold hover:underline"
                  >
                    Ver Configs da Página
                  </button>
                </div>

                <div className="space-y-1">
                  {layout.root.children.map((childId) => renderLayerNode(childId, 0))}
                </div>
              </TabsContent>
            </Tabs>
          </aside>
        )}

        {/* 2. CANVAS CENTRAL COM AUTO-SCROLL E SEM LIMITE DE ALTURA */}
        <main
          ref={canvasScrollContainerRef}
          onClick={() => setSelectedId(null)}
          className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-100/90 relative"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: pagePadding,
              backgroundColor: layout.root.pageSettings?.backgroundColor || '#ffffff',
            }}
            className={`${canvasWidthClass} min-h-[85vh] rounded-2xl shadow-sm border border-slate-200 transition-all duration-300 flex flex-col`}
          >
            {layout.root.children.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Sparkles className="w-12 h-12 text-indigo-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">Canvas Vazio</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Clique nos elementos no painel esquerdo para começar a montar a árvore do
                  catálogo.
                </p>
              </div>
            ) : (
              layout.root.children.map((childId) => {
                const el = layout.elements[childId]
                if (!el) return null
                return (
                  <RenderElement
                    key={el.id}
                    element={el}
                    allElements={layout.elements}
                    parentElement={null}
                    breakpoint={breakpoint}
                    isEditor={!isPreview}
                    selectedId={selectedId}
                    onSelectElement={(id) => setSelectedId(id)}
                    onUpdateElement={handleUpdateElement}
                    onDuplicateElement={handleDuplicateElement}
                    onDeleteElement={handleDeleteElement}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onAddChild={handleAddChildToElement}
                    products={realProducts}
                    companyInfo={{
                      name: 'VendasPro Store Matriz',
                      cnpj: '12.345.678/0001-90',
                      phone: '(11) 99999-8888',
                    }}
                    sellerInfo={{
                      name: user?.name || 'Vendedor Comercial',
                      phone: '(11) 98765-4321',
                      email: user?.email,
                    }}
                    customerInfo={selectedCustomer}
                  />
                )
              })
            )}
          </div>
        </main>

        {/* 3. PAINEL DIREITO: ESTILOS, LAYOUT, POSIÇÃO, FILHOS & CONFIGS DA PÁGINA */}
        {!isPreview && (
          <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 z-10">
            <ElementStylePanel
              element={selectedElement}
              allElements={layout.elements}
              parentElement={parentOfSelected}
              pageSettings={layout.root.pageSettings}
              breakpoint={breakpoint}
              products={realProducts}
              onUpdateElement={handleUpdateElement}
              onUpdatePageSettings={handleUpdatePageSettings}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onSelectElement={(id) => setSelectedId(id)}
              onAddChildToElement={handleAddChildToElement}
              onOpenMediaLibrary={() => setIsMediaModalOpen(true)}
              canCustomCode={can('templates.custom_html')}
            />
          </aside>
        )}
      </div>

      {/* Modais Integrados */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          if (selectedElement) {
            if (selectedElement.type === 'image') {
              handleUpdateElement({
                ...selectedElement,
                content: { ...(selectedElement.content || {}), src: url },
              })
            } else {
              handleUpdateElement({
                ...selectedElement,
                styles: { ...(selectedElement.styles || {}), backgroundImage: url },
              })
            }
          }
        }}
      />

      {page?.id && (
        <VersionHistoryModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          pageId={page.id}
          onVersionRestored={async () => {
            const updated = await salePageService.getById(page.id)
            setPage(updated)
            setLayout(updated.layout_data)
          }}
        />
      )}
    </div>
  )
}
