import React from 'react'
import type { BuilderElement, Breakpoint, PageSettings } from '@/types/builder'
import type { Product } from '@/types/crm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Type,
  Palette,
  Layout,
  Smartphone,
  Sliders,
  Image as ImageIcon,
  Lock,
  Trash2,
  Copy,
  Link2,
  Unlink2,
  Move,
  Layers as LayersIcon,
  Video as VideoIcon,
  ShoppingBag,
  ExternalLink,
  Plus,
  ArrowUp,
  Settings,
} from 'lucide-react'
import { ELEMENT_DEFINITIONS } from './elementDefinitions'

interface ElementStylePanelProps {
  element: BuilderElement | null
  allElements?: Record<string, BuilderElement>
  parentElement?: BuilderElement | null
  pageSettings?: PageSettings
  breakpoint: Breakpoint
  products?: Product[]
  onUpdateElement: (updated: BuilderElement) => void
  onUpdatePageSettings?: (settings: PageSettings) => void
  onDeleteElement: (id: string) => void
  onDuplicateElement: (id: string) => void
  onSelectElement?: (id: string) => void
  onAddChildToElement?: (parentId: string, type: string) => void
  onOpenMediaLibrary: () => void
  canCustomCode?: boolean
}

export const ElementStylePanel: React.FC<ElementStylePanelProps> = ({
  element,
  allElements = {},
  parentElement = null,
  pageSettings = {},
  breakpoint,
  products = [],
  onUpdateElement,
  onUpdatePageSettings,
  onDeleteElement,
  onDuplicateElement,
  onSelectElement,
  onAddChildToElement,
  onOpenMediaLibrary,
  canCustomCode = false,
}) => {
  const [paddingLinked, setPaddingLinked] = React.useState(false)
  const [marginLinked, setMarginLinked] = React.useState(false)
  const [showPageSettingsModal, setShowPageSettingsModal] = React.useState(false)

  // Funções utilitárias para decompor e compor valor e unidade
  const parseValueAndUnit = (cssValue?: string | number, defaultUnit = 'px') => {
    if (cssValue === undefined || cssValue === null || cssValue === '') {
      return { value: '', unit: defaultUnit }
    }
    const str = String(cssValue).trim()
    if (str === 'auto') {
      return { value: 'auto', unit: 'auto' }
    }
    const match = str.match(/^(-?\d*\.?\d+)(px|%|em|rem|vh|vw|auto)?$/)
    if (match) {
      return {
        value: match[1] ?? '',
        unit: match[2] || defaultUnit,
      }
    }
    return { value: str, unit: defaultUnit }
  }

  // Componente interno para Input com Seletor de Unidade
  const UnitInput: React.FC<{
    label?: string
    value?: string | number
    onChange: (fullValue: string) => void
    placeholder?: string
    allowAuto?: boolean
    units?: string[]
    className?: string
  }> = ({
    label,
    value,
    onChange,
    placeholder = '0',
    allowAuto = true,
    units = ['px', '%', 'em', 'rem', 'auto'],
    className = '',
  }) => {
    const { value: rawVal, unit: curUnit } = parseValueAndUnit(value)

    const handleNumChange = (newVal: string) => {
      if (curUnit === 'auto' || newVal === 'auto') {
        onChange(newVal)
        return
      }
      if (newVal === '') {
        onChange('')
        return
      }
      onChange(`${newVal}${curUnit}`)
    }

    const handleUnitChange = (newUnit: string) => {
      if (newUnit === 'auto') {
        onChange('auto')
        return
      }
      const val = rawVal === 'auto' ? '0' : rawVal || '0'
      onChange(`${val}${newUnit}`)
    }

    const filteredUnits = allowAuto ? units : units.filter((u) => u !== 'auto')

    return (
      <div className={`space-y-1 ${className}`}>
        {label && <span className="text-[10px] font-medium text-slate-500">{label}</span>}
        <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
          {curUnit === 'auto' ? (
            <div className="flex-1 px-2 py-1 text-xs text-slate-500 bg-slate-50 font-mono flex items-center">
              auto
            </div>
          ) : (
            <input
              type="text"
              value={rawVal}
              placeholder={placeholder}
              onChange={(e) => handleNumChange(e.target.value)}
              className="flex-1 w-full min-w-0 px-2 py-1 text-xs bg-transparent border-0 focus:outline-hidden text-slate-800"
            />
          )}
          <Select value={curUnit} onValueChange={handleUnitChange}>
            <SelectTrigger className="w-[52px] h-auto border-0 border-l border-slate-200 rounded-none bg-slate-50 px-1 py-1 text-[10px] font-mono focus:ring-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredUnits.map((u) => (
                <SelectItem key={u} value={u} className="text-xs font-mono">
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  // Painel Geral de Configurações da Página quando nenhum elemento estiver selecionado
  if (!element) {
    return (
      <div className="h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Configurações da Página</h3>
              <p className="text-[10px] text-slate-400">Espaçamento e estilos globais do canvas</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Espaçamento Global da Página
            </h4>
            <UnitInput
              label="Padding Desktop (Padrão: 24px)"
              value={pageSettings.pagePaddingDesktop || '24px'}
              onChange={(v) => onUpdatePageSettings?.({ ...pageSettings, pagePaddingDesktop: v })}
              placeholder="24px"
            />
            <UnitInput
              label="Padding Tablet (Padrão: 20px)"
              value={pageSettings.pagePaddingTablet || '20px'}
              onChange={(v) => onUpdatePageSettings?.({ ...pageSettings, pagePaddingTablet: v })}
              placeholder="20px"
            />
            <UnitInput
              label="Padding Smartphone (Padrão: 16px)"
              value={pageSettings.pagePaddingMobile || '16px'}
              onChange={(v) => onUpdatePageSettings?.({ ...pageSettings, pagePaddingMobile: v })}
              placeholder="16px"
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Largura e Fundo da Página
            </h4>
            <UnitInput
              label="Largura Máxima do Conteúdo (Padrão: 1200px)"
              value={pageSettings.pageMaxWidth || '1200px'}
              onChange={(v) => onUpdatePageSettings?.({ ...pageSettings, pageMaxWidth: v })}
              placeholder="1200px"
            />

            <div>
              <Label className="text-xs">Cor de Fundo da Página</Label>
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="color"
                  value={pageSettings.backgroundColor || '#f8fafc'}
                  onChange={(e) =>
                    onUpdatePageSettings?.({ ...pageSettings, backgroundColor: e.target.value })
                  }
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                />
                <Input
                  value={pageSettings.backgroundColor || '#f8fafc'}
                  onChange={(e) =>
                    onUpdatePageSettings?.({ ...pageSettings, backgroundColor: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
            <Sliders className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-indigo-900">Selecione um elemento</p>
            <p className="text-[10px] text-indigo-700 mt-0.5">
              Clique em qualquer seção, texto, botão ou imagem para editar suas propriedades
              específicas.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Helper para atualizar propriedades de conteúdo
  const updateContent = (field: string, value: any) => {
    onUpdateElement({
      ...element,
      content: {
        ...(element.content || {}),
        [field]: value,
      },
    })
  }

  // Helper para atualizar estilos (aplicado ao breakpoint ativo quando responsivo)
  const updateStyle = (styleProp: string, value: any) => {
    if (breakpoint === 'desktop') {
      const nextStyles = {
        ...(element.styles || {}),
        [styleProp]: value,
      }
      if (value === undefined || value === '') {
        delete nextStyles[styleProp as keyof typeof nextStyles]
      }
      onUpdateElement({
        ...element,
        styles: nextStyles,
      })
    } else {
      const nextBreakpointStyles = {
        ...(element.responsiveStyles?.[breakpoint] || {}),
        [styleProp]: value,
      }
      if (value === undefined || value === '') {
        delete nextBreakpointStyles[styleProp as keyof typeof nextBreakpointStyles]
      }
      onUpdateElement({
        ...element,
        responsiveStyles: {
          ...(element.responsiveStyles || {}),
          [breakpoint]: nextBreakpointStyles,
        },
      })
    }
  }

  // Helper para atualizar múltiplos estilos de uma vez
  const updateMultipleStyles = (stylesToUpdate: Record<string, any>) => {
    if (breakpoint === 'desktop') {
      const nextStyles = {
        ...(element.styles || {}),
        ...stylesToUpdate,
      }
      onUpdateElement({
        ...element,
        styles: nextStyles,
      })
    } else {
      const nextBreakpointStyles = {
        ...(element.responsiveStyles?.[breakpoint] || {}),
        ...stylesToUpdate,
      }
      onUpdateElement({
        ...element,
        responsiveStyles: {
          ...(element.responsiveStyles || {}),
          [breakpoint]: nextBreakpointStyles,
        },
      })
    }
  }

  const currentStyles = {
    ...(element.styles || {}),
    ...(element.responsiveStyles?.[breakpoint] || {}),
  }

  const isParentContainer =
    element.type === 'section' ||
    element.type === 'container' ||
    element.type === 'card' ||
    element.type === 'columns' ||
    element.type === 'grid' ||
    element.type === 'flexbox' ||
    element.type === 'hero' ||
    element.type === 'header' ||
    element.type === 'footer' ||
    element.type === 'product_single' ||
    element.type === 'product_card'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Header do Painel com Breadcrumb / Parent */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
        {parentElement && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectElement?.(parentElement.id)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Pai: {parentElement.name || parentElement.type}</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">
              #{parentElement.id.slice(-4)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              {element.type.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {element.name || element.type}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">ID: {element.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDuplicateElement(element.id)}
              className="w-7 h-7 text-slate-500 hover:text-indigo-600"
              title="Duplicar elemento"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            {!element.locked && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteElement(element.id)}
                className="w-7 h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                title="Excluir elemento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {element.locked && (
              <span
                className="p-1 text-amber-600 bg-amber-50 rounded"
                title="Elemento bloqueado pelo sistema"
              >
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Principais com 6 Abas */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
        <TabsList
          className={`grid ${isParentContainer ? 'grid-cols-6' : 'grid-cols-5'} p-1 bg-slate-100/80 rounded-none border-b border-slate-200`}
        >
          <TabsTrigger value="content" className="text-[10px] py-1">
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] py-1">
            Estilo
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[10px] py-1">
            Layout
          </TabsTrigger>
          <TabsTrigger value="position" className="text-[10px] py-1">
            Posição
          </TabsTrigger>
          {isParentContainer && (
            <TabsTrigger value="children" className="text-[10px] py-1 text-indigo-700 font-bold">
              Filhos
            </TabsTrigger>
          )}
          <TabsTrigger value="advanced" className="text-[10px] py-1">
            Avançado
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. ABA CONTEÚDO */}
          <TabsContent value="content" className="m-0 space-y-3.5">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Rótulo / Nome Interno</Label>
              <Input
                value={element.name || ''}
                onChange={(e) => onUpdateElement({ ...element, name: e.target.value })}
                placeholder="Ex: Título Principal"
                className="text-xs mt-1"
              />
            </div>

            {/* Heading e Text */}
            {(element.type === 'heading' || element.type === 'text') && (
              <div className="space-y-3">
                {element.type === 'heading' && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tag HTML</Label>
                    <Select
                      value={element.content?.tag || 'h2'}
                      onValueChange={(v) => updateContent('tag', v)}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h1">H1 - Título Principal</SelectItem>
                        <SelectItem value="h2">H2 - Seção</SelectItem>
                        <SelectItem value="h3">H3 - Subseção</SelectItem>
                        <SelectItem value="h4">H4 - Pequeno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Texto / Variáveis</Label>
                  <textarea
                    rows={4}
                    value={element.content?.text || ''}
                    onChange={(e) => updateContent('text', e.target.value)}
                    placeholder="Insira o texto ou clique duas vezes no canvas para editar..."
                    className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-indigo-600 mt-1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Variáveis disponíveis:{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">
                      {'{{cliente.nome}}'}
                    </code>
                    ,{' '}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">
                      {'{{vendedor.nome}}'}
                    </code>
                  </p>
                </div>
              </div>
            )}

            {/* Imagem Completa */}
            {element.type === 'image' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">URL da Imagem</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={element.content?.src || ''}
                      onChange={(e) => updateContent('src', e.target.value)}
                      placeholder="https://..."
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenMediaLibrary}
                      className="text-xs flex items-center gap-1 shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Mídia
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Texto Alternativo (Alt)
                  </Label>
                  <Input
                    value={element.content?.alt || ''}
                    onChange={(e) => updateContent('alt', e.target.value)}
                    placeholder="Descrição da imagem"
                    className="text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Object Fit</Label>
                    <Select
                      value={currentStyles.backgroundSize || 'cover'}
                      onValueChange={(v) => updateStyle('backgroundSize', v)}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover (Preencher)</SelectItem>
                        <SelectItem value="contain">Contain (Conter)</SelectItem>
                        <SelectItem value="auto">Original</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Link ao Clicar</Label>
                    <Input
                      value={element.content?.link || ''}
                      onChange={(e) => updateContent('link', e.target.value)}
                      placeholder="#produtos ou URL"
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Vídeo Completo e Configurável */}
            {element.type === 'video' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">URL do Vídeo</Label>
                  <Input
                    value={element.content?.url || ''}
                    onChange={(e) => updateContent('url', e.target.value)}
                    placeholder="Ex: https://www.youtube.com/watch?v=... ou Vimeo"
                    className="text-xs mt-1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Suporta links diretos do YouTube, Vimeo e vídeos MP4 autorizados.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Proporção (Aspect Ratio)</Label>
                    <Select
                      value={element.content?.aspectRatio || '16/9'}
                      onValueChange={(v) => {
                        updateContent('aspectRatio', v)
                        updateStyle('aspectRatio', v)
                      }}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16/9">16:9 (Widescreen)</SelectItem>
                        <SelectItem value="4/3">4:3 (Padrão)</SelectItem>
                        <SelectItem value="1/1">1:1 (Quadrado)</SelectItem>
                        <SelectItem value="9/16">9:16 (Vertical / Reels)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Poster / Capa (URL)</Label>
                    <Input
                      value={element.content?.poster || ''}
                      onChange={(e) => updateContent('poster', e.target.value)}
                      placeholder="https://..."
                      className="text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Autoplay</Label>
                    <Switch
                      checked={element.content?.autoplay === true}
                      onCheckedChange={(v) => updateContent('autoplay', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Mudo (Muted)</Label>
                    <Switch
                      checked={element.content?.muted === true}
                      onCheckedChange={(v) => updateContent('muted', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Repetir (Loop)</Label>
                    <Switch
                      checked={element.content?.loop === true}
                      onCheckedChange={(v) => updateContent('loop', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Controles</Label>
                    <Switch
                      checked={element.content?.controls !== false}
                      onCheckedChange={(v) => updateContent('controls', v)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botão Comercial */}
            {element.type === 'button' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Texto do Botão</Label>
                  <Input
                    value={element.content?.text || ''}
                    onChange={(e) => updateContent('text', e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Link ou Ação</Label>
                  <Input
                    value={element.content?.link || ''}
                    onChange={(e) => updateContent('link', e.target.value)}
                    placeholder="#produtos, link comercial ou WhatsApp"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Ação Comercial Rápida
                  </Label>
                  <Select
                    value={element.content?.actionType || 'link'}
                    onValueChange={(v) => updateContent('actionType', v)}
                  >
                    <SelectTrigger className="text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Abrir Link / Âncora</SelectItem>
                      <SelectItem value="open_cart">Abrir Carrinho do Pedido</SelectItem>
                      <SelectItem value="open_checkout">Ir Direto para Pagamento</SelectItem>
                      <SelectItem value="whatsapp">Chamar Vendedor no WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Produto Único / Destaque / Subcomponentes do Produto */}
            {element.type === 'product_single' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Selecionar Produto do Cadastro Real
                  </Label>
                  <Select
                    value={element.content?.productId || ''}
                    onValueChange={(v) => updateContent('productId', v)}
                  >
                    <SelectTrigger className="text-xs mt-1">
                      <SelectValue placeholder="Selecione um produto cadastrado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — R$ {Number(p.price || 0).toFixed(2)} ({p.stock || 0} em
                          estoque)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Subcomponentes do Produto: product_name, product_image, product_price */}
            {element.type === 'product_name' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    🔗 Vincular ao Nome do Produto Real
                  </Label>
                  <Switch
                    checked={element.content?.useDynamic !== false}
                    onCheckedChange={(v) => updateContent('useDynamic', v)}
                  />
                </div>
                {element.content?.useDynamic === false && (
                  <div>
                    <Label className="text-xs">Texto Personalizado</Label>
                    <Input
                      value={element.content?.customText || ''}
                      onChange={(e) => updateContent('customText', e.target.value)}
                      className="text-xs mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            {element.type === 'product_image' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    🔗 Vincular à Imagem do Cadastro
                  </Label>
                  <Switch
                    checked={element.content?.useDynamic !== false}
                    onCheckedChange={(v) => updateContent('useDynamic', v)}
                  />
                </div>
                {element.content?.useDynamic === false && (
                  <div className="flex gap-2">
                    <Input
                      value={element.content?.customSrc || ''}
                      onChange={(e) => updateContent('customSrc', e.target.value)}
                      placeholder="https://..."
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenMediaLibrary}
                      className="text-xs shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Grade de Produtos */}
            {element.type === 'product_list' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Fonte dos Produtos</Label>
                  <Select
                    value={element.content?.filterSource || 'all'}
                    onValueChange={(v) => updateContent('filterSource', v)}
                  >
                    <SelectTrigger className="text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Produtos Cadastrados</SelectItem>
                      <SelectItem value="in_stock">Apenas com Estoque Positivo</SelectItem>
                      <SelectItem value="featured">Destaques Comerciais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Mostrar Preço Real</Label>
                  <Switch
                    checked={element.content?.showPrice ?? true}
                    onCheckedChange={(v) => updateContent('showPrice', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Badge de Estoque Atual
                  </Label>
                  <Switch
                    checked={element.content?.showStockBadge ?? true}
                    onCheckedChange={(v) => updateContent('showStockBadge', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Botão de Compra/Carrinho
                  </Label>
                  <Switch
                    checked={element.content?.showBuyButton ?? true}
                    onCheckedChange={(v) => updateContent('showBuyButton', v)}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* 2. ABA ESTILO (Cores, Gradientes, Tipografia Granular) */}
          <TabsContent value="style" className="m-0 space-y-4">
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3" /> Cores e Fundo
              </h4>

              <div>
                <Label className="text-xs">Cor do Texto</Label>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="color"
                    value={currentStyles.color || '#000000'}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                  />
                  <Input
                    value={currentStyles.color || ''}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    placeholder="#0f172a"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Cor de Fundo</Label>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="color"
                    value={currentStyles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                  />
                  <Input
                    value={currentStyles.backgroundColor || ''}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    placeholder="transparent ou #ffffff"
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Gradiente de Fundo (CSS)</Label>
                <Input
                  value={currentStyles.backgroundGradient || ''}
                  onChange={(e) => updateStyle('backgroundGradient', e.target.value)}
                  placeholder="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Imagem de Fundo (URL)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={currentStyles.backgroundImage || ''}
                    onChange={(e) => updateStyle('backgroundImage', e.target.value)}
                    placeholder="https://..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenMediaLibrary}
                    className="text-xs shrink-0"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Type className="w-3 h-3" /> Tipografia Granular
              </h4>

              <div>
                <Label className="text-xs">Família de Fonte</Label>
                <Select
                  value={currentStyles.fontFamily || 'inherit'}
                  onValueChange={(v) => updateStyle('fontFamily', v === 'inherit' ? '' : v)}
                >
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue placeholder="Padrão do Sistema (Inter / Sans)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Padrão do Sistema</SelectItem>
                    <SelectItem value="Inter, sans-serif">Inter (Sans-serif)</SelectItem>
                    <SelectItem value="'Plus Jakarta Sans', sans-serif">
                      Plus Jakarta Sans
                    </SelectItem>
                    <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                    <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                    <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                    <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                    <SelectItem value="'Playfair Display', serif">
                      Playfair Display (Serif)
                    </SelectItem>
                    <SelectItem value="'Merriweather', serif">Merriweather (Serif)</SelectItem>
                    <SelectItem value="'Fira Code', monospace">Fira Code (Monospace)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <UnitInput
                  label="Tamanho da Fonte"
                  value={currentStyles.fontSize}
                  onChange={(v) => updateStyle('fontSize', v)}
                  placeholder="16"
                  allowAuto={false}
                  units={['px', 'rem', 'em', '%']}
                />
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block mb-1">
                    Peso da Fonte (Weight)
                  </span>
                  <Select
                    value={String(currentStyles.fontWeight || '400')}
                    onValueChange={(v) => updateStyle('fontWeight', v)}
                  >
                    <SelectTrigger className="text-xs h-7">
                      <SelectValue placeholder="400" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">300 - Light</SelectItem>
                      <SelectItem value="400">400 - Normal</SelectItem>
                      <SelectItem value="500">500 - Medium</SelectItem>
                      <SelectItem value="600">600 - Semi Bold</SelectItem>
                      <SelectItem value="700">700 - Bold</SelectItem>
                      <SelectItem value="800">800 - Extra Bold</SelectItem>
                      <SelectItem value="900">900 - Black</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <UnitInput
                  label="Altura da Linha (Line Height)"
                  value={currentStyles.lineHeight}
                  onChange={(v) => updateStyle('lineHeight', v)}
                  placeholder="1.5"
                  allowAuto={true}
                  units={['', 'px', 'em', 'rem', '%', 'auto']}
                />
                <UnitInput
                  label="Espaçamento Letras (Letter Spacing)"
                  value={currentStyles.letterSpacing}
                  onChange={(v) => updateStyle('letterSpacing', v)}
                  placeholder="0"
                  allowAuto={false}
                  units={['px', 'em', 'rem']}
                />
              </div>

              <div>
                <Label className="text-xs">Alinhamento do Texto</Label>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {['left', 'center', 'right', 'justify'].map((align) => (
                    <Button
                      key={align}
                      type="button"
                      variant={currentStyles.textAlign === align ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStyle('textAlign', align)}
                      className="text-xs capitalize py-1 h-7"
                    >
                      {align}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Bordas e Cantos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <UnitInput
                  label="Arredondamento (Border Radius)"
                  value={currentStyles.borderRadius}
                  onChange={(v) => updateStyle('borderRadius', v)}
                  placeholder="12px"
                  units={['px', '%', 'rem', 'em']}
                />
                <div>
                  <Label className="text-xs">Borda (CSS)</Label>
                  <Input
                    value={currentStyles.border || ''}
                    onChange={(e) => updateStyle('border', e.target.value)}
                    placeholder="1px solid #e2e8f0"
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 3. ABA LAYOUT (Padding/Margin Granulares com Unidades e Sincronizador) */}
          <TabsContent value="layout" className="m-0 space-y-4">
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layout className="w-3 h-3" /> Espaçamentos (Padding / Margin)
              </h4>

              {/* PADDING COM 4 LADOS E CORRENTE */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Padding Interno</span>
                  <Button
                    type="button"
                    variant={paddingLinked ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => {
                      const next = !paddingLinked
                      setPaddingLinked(next)
                      if (next) {
                        const topVal = currentStyles.paddingTop ?? currentStyles.padding ?? '0px'
                        updateMultipleStyles({
                          paddingTop: topVal,
                          paddingRight: topVal,
                          paddingBottom: topVal,
                          paddingLeft: topVal,
                          padding: undefined,
                        })
                      }
                    }}
                    className="h-6 w-6 text-xs"
                    title={paddingLinked ? 'Desvincular 4 lados' : 'Sincronizar 4 lados (Corrente)'}
                  >
                    {paddingLinked ? (
                      <Link2 className="w-3.5 h-3.5" />
                    ) : (
                      <Unlink2 className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <UnitInput
                    label="Topo (Top)"
                    value={currentStyles.paddingTop ?? currentStyles.padding}
                    onChange={(v) => {
                      if (paddingLinked) {
                        updateMultipleStyles({
                          paddingTop: v,
                          paddingRight: v,
                          paddingBottom: v,
                          paddingLeft: v,
                          padding: undefined,
                        })
                      } else {
                        updateStyle('paddingTop', v)
                      }
                    }}
                    placeholder="0"
                  />
                  <UnitInput
                    label="Direita (Right)"
                    value={currentStyles.paddingRight ?? currentStyles.padding}
                    onChange={(v) => {
                      if (paddingLinked) {
                        updateMultipleStyles({
                          paddingTop: v,
                          paddingRight: v,
                          paddingBottom: v,
                          paddingLeft: v,
                          padding: undefined,
                        })
                      } else {
                        updateStyle('paddingRight', v)
                      }
                    }}
                    placeholder="0"
                  />
                  <UnitInput
                    label="Baixo (Bottom)"
                    value={currentStyles.paddingBottom ?? currentStyles.padding}
                    onChange={(v) => {
                      if (paddingLinked) {
                        updateMultipleStyles({
                          paddingTop: v,
                          paddingRight: v,
                          paddingBottom: v,
                          paddingLeft: v,
                          padding: undefined,
                        })
                      } else {
                        updateStyle('paddingBottom', v)
                      }
                    }}
                    placeholder="0"
                  />
                  <UnitInput
                    label="Esquerda (Left)"
                    value={currentStyles.paddingLeft ?? currentStyles.padding}
                    onChange={(v) => {
                      if (paddingLinked) {
                        updateMultipleStyles({
                          paddingTop: v,
                          paddingRight: v,
                          paddingBottom: v,
                          paddingLeft: v,
                          padding: undefined,
                        })
                      } else {
                        updateStyle('paddingLeft', v)
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* MARGIN COM 4 LADOS E CORRENTE */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Margem Externa</span>
                  <Button
                    type="button"
                    variant={marginLinked ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => {
                      const next = !marginLinked
                      setMarginLinked(next)
                      if (next) {
                        const topVal = currentStyles.marginTop ?? currentStyles.margin ?? '0px'
                        updateMultipleStyles({
                          marginTop: topVal,
                          marginRight: topVal,
                          marginBottom: topVal,
                          marginLeft: topVal,
                          margin: undefined,
                        })
                      }
                    }}
                    className="h-6 w-6 text-xs"
                    title={marginLinked ? 'Desvincular 4 lados' : 'Sincronizar 4 lados (Corrente)'}
                  >
                    {marginLinked ? (
                      <Link2 className="w-3.5 h-3.5" />
                    ) : (
                      <Unlink2 className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <UnitInput
                    label="Topo (Top)"
                    value={currentStyles.marginTop ?? currentStyles.margin}
                    onChange={(v) => {
                      if (marginLinked) {
                        updateMultipleStyles({
                          marginTop: v,
                          marginRight: v,
                          marginBottom: v,
                          marginLeft: v,
                          margin: undefined,
                        })
                      } else {
                        updateStyle('marginTop', v)
                      }
                    }}
                    placeholder="0"
                  />
                  <UnitInput
                    label="Direita (Right)"
                    value={currentStyles.marginRight ?? currentStyles.margin}
                    onChange={(v) => {
                      if (marginLinked) {
                        updateMultipleStyles({
                          marginTop: v,
                          marginRight: v,
                          marginBottom: v,
                          marginLeft: v,
                          margin: undefined,
                        })
                      } else {
                        updateStyle('marginRight', v)
                      }
                    }}
                    placeholder="0"
                  />
                  <UnitInput
                    label="Baixo (Bottom)"
                    value={currentStyles.marginBottom ?? currentStyles.margin}
                    onChange={(v) => {
                      if (marginLinked) {
                        updateMultipleStyles({
                          marginTop: v,
                          marginRight: v,
                          marginBottom: v,
                          marginLeft: v,
                          margin: undefined,
                        })
                      } else {
                        updateStyle('marginBottom', v)
                      }
                    }}
                    placeholder="0"
                  />
                  <UnitInput
                    label="Esquerda (Left)"
                    value={currentStyles.marginLeft ?? currentStyles.margin}
                    onChange={(v) => {
                      if (marginLinked) {
                        updateMultipleStyles({
                          marginTop: v,
                          marginRight: v,
                          marginBottom: v,
                          marginLeft: v,
                          margin: undefined,
                        })
                      } else {
                        updateStyle('marginLeft', v)
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* DIMENSÕES E GAP */}
              <div className="grid grid-cols-2 gap-2">
                <UnitInput
                  label="Largura (Width)"
                  value={currentStyles.width}
                  onChange={(v) => updateStyle('width', v)}
                  placeholder="100%"
                />
                <UnitInput
                  label="Largura Máxima (Max Width)"
                  value={currentStyles.maxWidth}
                  onChange={(v) => updateStyle('maxWidth', v)}
                  placeholder="1200px"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <UnitInput
                  label="Altura Mínima (Min Height)"
                  value={currentStyles.minHeight}
                  onChange={(v) => updateStyle('minHeight', v)}
                  placeholder="auto"
                />
                <UnitInput
                  label="Espaçamento Itens (Gap)"
                  value={currentStyles.gap}
                  onChange={(v) => updateStyle('gap', v)}
                  placeholder="16px"
                />
              </div>
            </div>
          </TabsContent>

          {/* 4. ABA POSIÇÃO (Fluxo vs Livre, Relative/Absolute/Fixed/Sticky, Z-Index) */}
          <TabsContent value="position" className="m-0 space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <Label className="text-xs font-bold text-slate-700 block">Modo de Layout</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={element.layoutMode !== 'free' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onUpdateElement({
                      ...element,
                      layoutMode: 'flow',
                    })
                    updateStyle('position', undefined)
                  }}
                  className="text-xs"
                >
                  Modo Fluxo (Natural)
                </Button>
                <Button
                  type="button"
                  variant={element.layoutMode === 'free' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onUpdateElement({
                      ...element,
                      layoutMode: 'free',
                    })
                    updateStyle('position', 'absolute')
                  }}
                  className="text-xs"
                >
                  Modo Livre (Manual)
                </Button>
              </div>
              <p className="text-[10px] text-slate-500">
                {element.layoutMode === 'free'
                  ? 'Posicionamento livre com coordenadas X/Y no canvas.'
                  : 'Modo padrão responsivo automático sem quebra de layout.'}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Move className="w-3 h-3" /> Posição CSS & Coordenadas
              </h4>

              <div>
                <Label className="text-xs">Posição (Position)</Label>
                <Select
                  value={currentStyles.position || 'static'}
                  onValueChange={(v) => updateStyle('position', v === 'static' ? undefined : v)}
                >
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue placeholder="Estático (static)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Estático (static)</SelectItem>
                    <SelectItem value="relative">Relativo (relative)</SelectItem>
                    <SelectItem value="absolute">Absoluto (absolute)</SelectItem>
                    <SelectItem value="fixed">Fixo (fixed)</SelectItem>
                    <SelectItem value="sticky">Aderente (sticky)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentStyles.position && currentStyles.position !== 'static' && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Coordenadas de Deslocamento
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <UnitInput
                      label="Top"
                      value={currentStyles.top}
                      onChange={(v) => updateStyle('top', v)}
                      placeholder="auto"
                    />
                    <UnitInput
                      label="Right"
                      value={currentStyles.right}
                      onChange={(v) => updateStyle('right', v)}
                      placeholder="auto"
                    />
                    <UnitInput
                      label="Bottom"
                      value={currentStyles.bottom}
                      onChange={(v) => updateStyle('bottom', v)}
                      placeholder="auto"
                    />
                    <UnitInput
                      label="Left"
                      value={currentStyles.left}
                      onChange={(v) => updateStyle('left', v)}
                      placeholder="auto"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <LayersIcon className="w-3 h-3 text-slate-400" /> Z-Index
                  </Label>
                  <Input
                    type="number"
                    value={currentStyles.zIndex ?? ''}
                    onChange={(e) =>
                      updateStyle(
                        'zIndex',
                        e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                      )
                    }
                    placeholder="0"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Opacidade</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={currentStyles.opacity ?? ''}
                    onChange={(e) =>
                      updateStyle(
                        'opacity',
                        e.target.value === '' ? undefined : parseFloat(e.target.value),
                      )
                    }
                    placeholder="1"
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Controle de Transbordamento (Overflow)</Label>
                <Select
                  value={currentStyles.overflow || 'visible'}
                  onValueChange={(v) => updateStyle('overflow', v === 'visible' ? undefined : v)}
                >
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue placeholder="Visível (visible)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visible">Visível (visible)</SelectItem>
                    <SelectItem value="hidden">Oculto (hidden)</SelectItem>
                    <SelectItem value="auto">Automático (auto)</SelectItem>
                    <SelectItem value="scroll">Barra de Rolagem (scroll)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* 5. ABA FILHOS (Para Containers / Hero / Section / Header / Footer) */}
          {isParentContainer && (
            <TabsContent value="children" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Elementos Filhos</h4>
                  <p className="text-[10px] text-slate-400">
                    Gerencie a árvore interna deste bloco
                  </p>
                </div>
              </div>

              {/* Lista dos filhos atuais */}
              <div className="space-y-1.5">
                {(element.children || []).map((childId, idx) => {
                  const child = allElements[childId]
                  if (!child) return null
                  return (
                    <div
                      key={child.id}
                      onClick={() => onSelectElement?.(child.id)}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                        <span className="font-semibold text-slate-800">
                          {child.name || child.type}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {child.type}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Botões Rápidos para Adicionar Filhos */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <Label className="text-xs font-semibold text-slate-700 block">
                  + Adicionar Elemento Dentro Deste Bloco
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { type: 'heading', label: 'Título' },
                    { type: 'text', label: 'Texto' },
                    { type: 'image', label: 'Imagem' },
                    { type: 'button', label: 'Botão' },
                    { type: 'container', label: 'Subcontainer' },
                    { type: 'flexbox', label: 'Flexbox' },
                  ].map((it) => (
                    <Button
                      key={it.type}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddChildToElement?.(element.id, it.type)}
                      className="text-xs justify-start h-7"
                    >
                      <Plus className="w-3 h-3 mr-1 text-indigo-600" />
                      {it.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}

          {/* 6. ABA AVANÇADO (Visibilidade por Breakpoint e Custom Code) */}
          <TabsContent value="advanced" className="m-0 space-y-4">
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Visibilidade por Dispositivo
              </h4>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Exibir no Desktop</Label>
                <Switch
                  checked={element.styles?.visibilityDesktop !== false}
                  onCheckedChange={(v) => updateStyle('visibilityDesktop', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Exibir no Tablet</Label>
                <Switch
                  checked={element.styles?.visibilityTablet !== false}
                  onCheckedChange={(v) => updateStyle('visibilityTablet', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Exibir no Smartphone</Label>
                <Switch
                  checked={element.styles?.visibilityMobile !== false}
                  onCheckedChange={(v) => updateStyle('visibilityMobile', v)}
                />
              </div>
            </div>

            {canCustomCode && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <Label className="text-xs font-semibold text-slate-700">HTML Personalizado</Label>
                <textarea
                  rows={4}
                  value={element.content?.html || ''}
                  onChange={(e) => updateContent('html', e.target.value)}
                  placeholder="<div>Código customizado seguro...</div>"
                  className="w-full text-xs font-mono p-2 rounded-md border border-slate-200 bg-slate-900 text-emerald-400"
                />
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
