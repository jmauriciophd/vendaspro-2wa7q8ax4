import React from 'react'
import type { BuilderElement, Breakpoint } from '@/types/builder'
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
} from 'lucide-react'

interface ElementStylePanelProps {
  element: BuilderElement | null
  breakpoint: Breakpoint
  onUpdateElement: (updated: BuilderElement) => void
  onDeleteElement: (id: string) => void
  onDuplicateElement: (id: string) => void
  onOpenMediaLibrary: () => void
  canCustomCode?: boolean
}

export const ElementStylePanel: React.FC<ElementStylePanelProps> = ({
  element,
  breakpoint,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onOpenMediaLibrary,
  canCustomCode = false,
}) => {
  // Estado local para vincular/sincronizar os 4 lados de padding e margin (Hooks sempre no topo)
  const [paddingLinked, setPaddingLinked] = React.useState(false)
  const [marginLinked, setMarginLinked] = React.useState(false)

  if (!element) {
    return (
      <div className="p-6 text-center text-slate-400">
        <Sliders className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Nenhum elemento selecionado</p>
        <p className="text-xs text-slate-400 mt-1">
          Clique em qualquer componente no canvas para editar propriedades, textos, cores e layout.
        </p>
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
      // Se o valor for undefined/vazio e quisermos limpar, mantemos limpo
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

  // Obtém o valor do estilo efetivo (considerando herança de desktop se não definido no breakpoint)
  const currentStyles = {
    ...(element.styles || {}),
    ...(element.responsiveStyles?.[breakpoint] || {}),
  }

  // Funções utilitárias para decompor e compor valor e unidade (ex: "16px", "2rem", "auto", "100%")
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Top Header do Painel */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
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

      {/* Tabs com as 5 abas obrigatórias: Conteúdo, Estilo, Layout, Responsivo, Avançado */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-5 p-1 bg-slate-100/80 rounded-none border-b border-slate-200">
          <TabsTrigger value="content" className="text-[11px] py-1">
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[11px] py-1">
            Estilo
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[11px] py-1">
            Layout
          </TabsTrigger>
          <TabsTrigger value="responsive" className="text-[11px] py-1">
            Resp.
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-[11px] py-1">
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

            {/* Elementos de Texto / Título */}
            {(element.type === 'heading' || element.type === 'text') && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">Texto / Shortcodes</Label>
                <textarea
                  rows={4}
                  value={element.content?.text || ''}
                  onChange={(e) => updateContent('text', e.target.value)}
                  placeholder="Ex: Olá {{cliente.nome}}, confira nossas ofertas..."
                  className="w-full text-xs p-2 rounded-md border border-slate-200 focus:outline-indigo-600 mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Variáveis:{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">
                    {'{{cliente.nome}}'}
                  </code>
                  ,{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">
                    {'{{vendedor.nome}}'}
                  </code>
                </p>
              </div>
            )}

            {/* Imagem */}
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
              </div>
            )}

            {/* Banner & Hero */}
            {(element.type === 'banner' || element.type === 'hero') && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Badge Superior</Label>
                  <Input
                    value={element.content?.badge || ''}
                    onChange={(e) => updateContent('badge', e.target.value)}
                    placeholder="Ex: OFERTA DA SEMANA"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Título Principal</Label>
                  <Input
                    value={element.content?.title || ''}
                    onChange={(e) => updateContent('title', e.target.value)}
                    placeholder="Ex: Tabela Especial Distribuidora"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Subtítulo / Descrição
                  </Label>
                  <textarea
                    rows={2}
                    value={element.content?.subtitle || ''}
                    onChange={(e) => updateContent('subtitle', e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 mt-1"
                  />
                </div>
              </div>
            )}

            {/* Botão */}
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
                  <Label className="text-xs font-semibold text-slate-700">Link de Destino</Label>
                  <Input
                    value={element.content?.link || ''}
                    onChange={(e) => updateContent('link', e.target.value)}
                    placeholder="#produtos ou URL"
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            )}

            {/* Grade de Produtos */}
            {element.type === 'product_list' && (
              <div className="space-y-3">
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
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Texto do Botão</Label>
                  <Input
                    value={element.content?.buyButtonText || 'Comprar'}
                    onChange={(e) => updateContent('buyButtonText', e.target.value)}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* 2. ABA ESTILO */}
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
                <Type className="w-3 h-3" /> Tipografia Avançada
              </h4>

              {/* Família da Fonte */}
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
                    <SelectItem value="'Courier New', monospace">
                      Courier New (Monospace)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tamanho e Peso da Fonte */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <UnitInput
                    label="Tamanho da Fonte"
                    value={currentStyles.fontSize}
                    onChange={(v) => updateStyle('fontSize', v)}
                    placeholder="16"
                    allowAuto={false}
                    units={['px', 'rem', 'em', '%']}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block mb-1">
                    Peso da Fonte
                  </span>
                  <Select
                    value={String(currentStyles.fontWeight || '400')}
                    onValueChange={(v) => updateStyle('fontWeight', v)}
                  >
                    <SelectTrigger className="text-xs h-7">
                      <SelectValue placeholder="400" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 - Thin</SelectItem>
                      <SelectItem value="200">200 - Extra Light</SelectItem>
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

              {/* Line Height e Letter Spacing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <UnitInput
                    label="Altura da Linha (Line Height)"
                    value={currentStyles.lineHeight}
                    onChange={(v) => updateStyle('lineHeight', v)}
                    placeholder="1.5"
                    allowAuto={true}
                    units={['', 'px', 'em', 'rem', '%', 'auto']}
                  />
                </div>
                <div>
                  <UnitInput
                    label="Espaçamento (Letter Spacing)"
                    value={currentStyles.letterSpacing}
                    onChange={(v) => updateStyle('letterSpacing', v)}
                    placeholder="0"
                    allowAuto={false}
                    units={['px', 'em', 'rem']}
                  />
                </div>
              </div>

              {/* Alinhamento e Transformação de Texto */}
              <div>
                <Label className="text-xs">Alinhamento</Label>
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

              <div>
                <Label className="text-xs">Transformação de Texto</Label>
                <Select
                  value={currentStyles.textTransform || 'none'}
                  onValueChange={(v) => updateStyle('textTransform', v)}
                >
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Padrão)</SelectItem>
                    <SelectItem value="uppercase">MAIÚSCULAS (UPPERCASE)</SelectItem>
                    <SelectItem value="lowercase">minúsculas (lowercase)</SelectItem>
                    <SelectItem value="capitalize">
                      Primeira Letra Maiúscula (Capitalize)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Bordas e Cantos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Arredondamento</Label>
                  <Input
                    value={currentStyles.borderRadius || ''}
                    onChange={(e) => updateStyle('borderRadius', e.target.value)}
                    placeholder="12px"
                    className="text-xs mt-1"
                  />
                </div>
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

          {/* 3. ABA LAYOUT */}
          <TabsContent value="layout" className="m-0 space-y-4">
            {/* 3.1 ESPAÇAMENTOS GRANULARES (PADDING E MARGIN) */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layout className="w-3 h-3" /> Espaçamentos (Padding / Margin)
              </h4>

              {/* PADDING (4 LADOS COM SELETOR DE UNIDADE E BOTÃO CORRENTE) */}
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

              {/* MARGIN (4 LADOS COM SELETOR DE UNIDADE E BOTÃO CORRENTE) */}
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
                  label="Altura (Height)"
                  value={currentStyles.height}
                  onChange={(v) => updateStyle('height', v)}
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

            {/* 3.2 POSICIONAMENTO PROFISSIONAL (POSITION, TOP/RIGHT/BOTTOM/LEFT, Z-INDEX) */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Move className="w-3 h-3" /> Posicionamento Profissional
              </h4>

              {/* Seletor de Position */}
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

              {/* Coordenadas Top / Right / Bottom / Left (visíveis especialmente se position != static) */}
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

              {/* Z-Index e Opacidade */}
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
                  <Label className="text-xs">Opacidade (0 a 1)</Label>
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

              {/* Overflow */}
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

            {/* 3.3 COLUNAS GRID */}
            {(element.type === 'product_list' ||
              element.type === 'grid' ||
              element.type === 'columns') && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Colunas no Grid
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Desktop</Label>
                    <Input
                      type="number"
                      value={currentStyles.gridColumnsDesktop || 4}
                      onChange={(e) =>
                        updateStyle('gridColumnsDesktop', parseInt(e.target.value, 10))
                      }
                      className="text-xs mt-1"
                      min={1}
                      max={6}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Tablet</Label>
                    <Input
                      type="number"
                      value={currentStyles.gridColumnsTablet || 2}
                      onChange={(e) =>
                        updateStyle('gridColumnsTablet', parseInt(e.target.value, 10))
                      }
                      className="text-xs mt-1"
                      min={1}
                      max={4}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Mobile</Label>
                    <Input
                      type="number"
                      value={currentStyles.gridColumnsMobile || 1}
                      onChange={(e) =>
                        updateStyle('gridColumnsMobile', parseInt(e.target.value, 10))
                      }
                      className="text-xs mt-1"
                      min={1}
                      max={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 4. ABA RESPONSIVO */}
          <TabsContent value="responsive" className="m-0 space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                Modo Ativo: <span className="uppercase">{breakpoint}</span>
              </p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Alterações feitas nesta aba afetam especificamente a visualização em {breakpoint}.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Visibilidade do Elemento
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
          </TabsContent>

          {/* 5. ABA AVANÇADO (HTML/CSS/Shortcode) */}
          <TabsContent value="advanced" className="m-0 space-y-4">
            {canCustomCode ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">HTML Personalizado</Label>
                  <textarea
                    rows={5}
                    value={element.content?.html || ''}
                    onChange={(e) => updateContent('html', e.target.value)}
                    placeholder="<div>Código customizado seguro...</div>"
                    className="w-full text-xs font-mono p-2 rounded-md border border-slate-200 mt-1 bg-slate-900 text-emerald-400"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <Lock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-amber-900">Custom Code Restrito</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  A inserção de HTML/CSS arbitrário requer permissão administrativa{' '}
                  <code className="font-mono">templates.custom_html</code>.
                </p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
