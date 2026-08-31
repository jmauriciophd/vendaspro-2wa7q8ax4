import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  Search,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { mediaAssetService } from '@/services/builder'
import type { MediaAsset } from '@/types/builder'
import { toast } from 'sonner'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (imageUrl: string, asset?: MediaAsset) => void
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
}) => {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [customUrl, setCustomUrl] = useState('')

  // Campos de upload
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [title, setTitle] = useState('')

  const loadAssets = async () => {
    setIsLoading(true)
    try {
      const data = await mediaAssetService.getAll()
      setAssets(data)
    } catch (err) {
      console.error('Erro ao carregar mídias:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadAssets()
    }
  }, [isOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Valida tipos de imagem permitidos: JPG, PNG, WEBP, SVG
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
      if (!allowed.includes(file.type)) {
        toast.error('Formato não suportado. Utilize JPG, PNG, WEBP ou SVG.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('O arquivo deve ter no máximo 10MB.')
        return
      }
      setFileToUpload(file)
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleUpload = async () => {
    if (!fileToUpload) return
    setIsUploading(true)
    try {
      const newAsset = await mediaAssetService.upload(fileToUpload, altText, title)
      toast.success('Imagem enviada com sucesso!')
      setFileToUpload(null)
      setAltText('')
      setTitle('')
      await loadAssets()
      setSelectedAsset(newAsset)
    } catch (err: any) {
      toast.error('Erro ao enviar imagem: ' + (err?.message || 'Falha no upload'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta imagem da biblioteca?')) return
    try {
      await mediaAssetService.delete(id)
      toast.success('Imagem excluída!')
      setAssets((prev) => prev.filter((a) => a.id !== id))
      if (selectedAsset?.id === id) setSelectedAsset(null)
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message || 'Falha'))
    }
  }

  const handleConfirmSelection = () => {
    if (selectedAsset) {
      const url = mediaAssetService.getFileUrl(selectedAsset)
      onSelectImage(url, selectedAsset)
      onClose()
    } else if (customUrl.trim()) {
      onSelectImage(customUrl.trim())
      onClose()
    }
  }

  const filteredAssets = assets.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.alt_text && a.alt_text.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Imagens prontas de alta qualidade do CDN Curling do Skip
  const suggestedCurlingImages = [
    {
      title: 'Supermercado & Produtos',
      url: 'https://img.usecurling.com/p/800/600?q=supermarket+groceries',
    },
    { title: 'Bebidas & Vinhos', url: 'https://img.usecurling.com/p/800/600?q=wine+bottles' },
    { title: 'Grãos & Alimentos', url: 'https://img.usecurling.com/p/800/600?q=grains+coffee' },
    { title: 'Higiene & Limpeza', url: 'https://img.usecurling.com/p/800/600?q=cleaning+supplies' },
    {
      title: 'Banner Promocional',
      url: 'https://img.usecurling.com/p/1200/400?q=shopping+sale+banner',
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Biblioteca de Mídia & Imagens
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Gerencie fotos de produtos, banners, logos da empresa e recursos visuais para seus
            catálogos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="library">Biblioteca ({assets.length})</TabsTrigger>
            <TabsTrigger value="upload">Novo Upload</TabsTrigger>
            <TabsTrigger value="suggested">Banco de Fotos</TabsTrigger>
          </TabsList>

          {/* ABA 1: Biblioteca de Arquivos */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar imagens por título ou descrição..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-indigo-600" />
                <p className="text-xs">Carregando mídias...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Nenhuma imagem encontrada</p>
                <p className="text-xs text-slate-400 mt-1">
                  Faça upload de fotos de produtos ou escolha uma sugestão do banco de fotos.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                {filteredAssets.map((asset) => {
                  const url = mediaAssetService.getFileUrl(asset)
                  const isSelected = selectedAsset?.id === asset.id
                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all aspect-square flex flex-col justify-end p-2 ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <img
                        src={url}
                        alt={asset.alt_text || asset.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                        <p className="text-[11px] font-semibold truncate leading-tight">
                          {asset.title}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-slate-300 uppercase">
                            {asset.file_type?.split('/')[1] || 'img'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(asset.id)
                            }}
                            className="p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                            title="Excluir imagem"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ABA 2: Novo Upload */}
          <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 pt-4">
            <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="media-upload-input"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="media-upload-input" className="cursor-pointer block">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {fileToUpload ? fileToUpload.name : 'Clique para selecionar a imagem'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos aceitos: JPG, PNG, WEBP ou SVG (máx. 10MB)
                  </p>
                </label>
              </div>

              {fileToUpload && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <Label className="text-xs">Título da Imagem</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Banner Ofertas Verão"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Texto Alternativo (Acessibilidade & SEO)</Label>
                    <Input
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Ex: Foto de café em grãos torrados"
                      className="mt-1 text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Concluir Upload e Adicionar à Biblioteca'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ABA 3: Sugestões do Banco Curling */}
          <TabsContent
            value="suggested"
            className="flex-1 flex flex-col min-h-0 pt-4 overflow-y-auto"
          >
            <div className="mb-3">
              <Label className="text-xs font-semibold text-slate-700">
                Ou informe uma URL externa / CDN:
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://img.usecurling.com/p/..."
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (customUrl) {
                      onSelectImage(customUrl)
                      onClose()
                    }
                  }}
                  className="text-xs"
                >
                  Usar URL
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Modelos de Imagem Sugeridos (CDN Otimizado)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {suggestedCurlingImages.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectImage(s.url)
                      onClose()
                    }}
                    className="group border border-slate-200 hover:border-indigo-600 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-100">
                      <img
                        src={s.url}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5 bg-white flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{s.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Rodapé de Confirmação */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
          <div className="text-xs text-slate-500">
            {selectedAsset ? `Selecionada: ${selectedAsset.title}` : 'Selecione uma imagem'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!selectedAsset && !customUrl}
              onClick={handleConfirmSelection}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Aplicar Imagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
