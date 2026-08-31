import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutTemplate,
  Plus,
  Eye,
  Copy,
  Trash2,
  Edit,
  Sparkles,
  Layers,
  ArrowRight,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { templateService } from '@/services/builder'
import type { PageTemplate, TemplateCategory } from '@/types/builder'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export const TemplatesList: React.FC = () => {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [templates, setTemplates] = useState<PageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const canCreate = can('templates.create')
  const canEdit = can('templates.edit')
  const canDelete = can('templates.delete')

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const data = await templateService.getAll({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
      })
      setTemplates(data)
    } catch (err) {
      console.error('Erro ao carregar templates:', err)
      toast.error('Erro ao listar templates.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [selectedCategory])

  const handleDuplicate = async (id: string, title: string) => {
    try {
      await templateService.duplicate(id, `${title} (Cópia)`)
      toast.success('Template duplicado com sucesso!')
      loadTemplates()
    } catch (err: any) {
      toast.error('Erro ao duplicar: ' + (err?.message || 'Falha'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este modelo de página?')) return
    try {
      await templateService.delete(id)
      toast.success('Template excluído.')
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message || 'Falha'))
    }
  }

  const handleCreateCatalogFromTemplate = (templateId: string) => {
    navigate(`/pages/builder/new?template=${templateId}`)
  }

  const filteredTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())),
  )

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'Todos os Modelos' },
    { id: 'catalogo', label: 'Catálogos Comerciais' },
    { id: 'oferta', label: 'Ofertas & Promoções' },
    { id: 'atacado', label: 'Atacado & B2B' },
    { id: 'premium', label: 'Linhas Premium' },
    { id: 'produto', label: 'Landing Pages de Produto' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <LayoutTemplate className="w-6 h-6 text-indigo-600" />
            Modelos & Templates de Venda
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Selecione uma estrutura pronta para gerar novos catálogos personalizados para seus
            clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <Button
              onClick={() => navigate('/pages/builder/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Criar Modelo em Branco
            </Button>
          )}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="w-full md:w-auto"
        >
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            {categories.map((c) => (
              <TabsTrigger
                key={c.id}
                value={c.id}
                className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:font-bold"
              >
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelos..."
            className="pl-9 text-xs bg-white"
          />
        </div>
      </div>

      {/* Grade de Templates */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhum template encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            Tente mudar o filtro de categoria ou crie um novo template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl) => {
            const previewBg =
              {
                catalogo: 'from-blue-600 to-indigo-700',
                oferta: 'from-rose-600 to-orange-600',
                atacado: 'from-slate-800 to-slate-950',
                premium: 'from-purple-900 to-indigo-950',
                produto: 'from-emerald-600 to-teal-800',
                campanha: 'from-amber-600 to-rose-700',
              }[tpl.category] || 'from-indigo-600 to-purple-600'

            return (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Banner / Visual Preview */}
                  <div
                    className={`h-40 bg-gradient-to-br ${previewBg} p-5 flex flex-col justify-between text-white relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <Badge className="bg-white/20 backdrop-blur-xs text-white hover:bg-white/20 text-[10px] uppercase font-bold border-0">
                        {tpl.category}
                      </Badge>
                      {tpl.is_system_default && (
                        <span className="text-[10px] font-semibold bg-emerald-500/80 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Oficial
                        </span>
                      )}
                    </div>

                    <div className="relative z-10">
                      <h3 className="font-extrabold text-lg leading-snug drop-shadow-xs">
                        {tpl.title}
                      </h3>
                      <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  </div>

                  {/* Detalhes */}
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {tpl.description ||
                        'Modelo otimizado com componentes de produtos reais, preços dinâmicos e checkout integrado.'}
                    </p>
                  </div>
                </div>

                {/* Ações */}
                <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/pages/builder/template/${tpl.id}`)}
                        className="h-8 text-xs text-slate-600 hover:text-indigo-600"
                        title="Editar modelo no Page Builder"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(tpl.id, tpl.title)}
                      className="h-8 text-xs text-slate-600 hover:text-indigo-600"
                      title="Duplicar modelo"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {canDelete && !tpl.is_system_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tpl.id)}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Excluir modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleCreateCatalogFromTemplate(tpl.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 px-3.5 py-1.5"
                  >
                    <span>Usar Modelo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
