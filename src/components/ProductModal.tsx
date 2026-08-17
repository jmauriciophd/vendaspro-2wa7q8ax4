import React, { useState, useEffect } from 'react'
import type { Product, ProductCategory } from '@/types/crm'
import { productService } from '@/services/crm'
import { toast } from 'sonner'
import { X, Package, CheckCircle, Trash2 } from 'lucide-react'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  productToEdit?: Product | null
  onSaved: () => void
}

const categoryLabels: Record<ProductCategory, string> = {
  graos: 'Grãos',
  bebidas: 'Bebidas',
  limpeza: 'Limpeza',
  mercearia: 'Mercearia',
  higiene: 'Higiene',
  outros: 'Outros',
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaved,
}) => {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState<ProductCategory>('mercearia')
  const [unit, setUnit] = useState('un')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [ncm, setNcm] = useState('')
  const [cfop, setCfop] = useState('5102')
  const [active, setActive] = useState(true)

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '')
      setCode(productToEdit.code || '')
      setCategory(productToEdit.category || 'mercearia')
      setUnit(productToEdit.unit || 'un')
      setPrice(String(productToEdit.price ?? ''))
      setStock(productToEdit.stock !== undefined ? String(productToEdit.stock) : '')
      setNcm(productToEdit.ncm || '')
      setCfop(productToEdit.cfop || '5102')
      setActive(productToEdit.active !== false)
    } else {
      setName('')
      setCode('')
      setCategory('mercearia')
      setUnit('un')
      setPrice('')
      setStock('')
      setNcm('')
      setCfop('5102')
      setActive(true)
    }
    setErrors({})
  }, [productToEdit, isOpen])

  if (!isOpen) return null

  const validate = () => {
    const errs: { [key: string]: string } = {}
    if (!name.trim()) errs.name = 'Nome do produto é obrigatório'
    if (!price || isNaN(Number(price)) || Number(price) < 0) errs.price = 'Preço inválido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const payload: Partial<Product> = {
        name: name.trim(),
        code: code.trim() || undefined,
        category,
        unit: unit.trim() || 'un',
        price: Number(price),
        stock: stock !== '' ? Number(stock) : 0,
        ncm: ncm.trim() || undefined,
        cfop: cfop.trim() || undefined,
        active,
      }

      if (productToEdit) {
        await productService.update(productToEdit.id, payload)
        toast.success(`Produto "${name}" atualizado!`)
      } else {
        await productService.create(payload)
        toast.success(`Produto "${name}" cadastrado!`)
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao salvar produto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!productToEdit) return
    if (!confirm(`Deseja realmente excluir o produto "${productToEdit.name}"?`)) return
    setIsDeleting(true)
    try {
      await productService.delete(productToEdit.id)
      toast.success('Produto excluído')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir produto. Verifique vendas vinculadas.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {productToEdit ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <p className="text-xs text-slate-500">
                {productToEdit
                  ? 'Atualize dados do produto e fiscais'
                  : 'Cadastre um produto no catálogo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Arroz Branco 5kg"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                  errors.name
                    ? 'border-red-500 ring-2 ring-red-100'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: ARZ-005"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                {(Object.keys(categoryLabels) as ProductCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {categoryLabels[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl outline-none ${
                  errors.price
                    ? 'border-red-500 ring-2 ring-red-100'
                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="un, kg, cx, lt..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Dados Fiscais (NF-e)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NCM</label>
                  <input
                    type="text"
                    value={ncm}
                    onChange={(e) => setNcm(e.target.value)}
                    placeholder="Ex: 1006.30.21"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CFOP</label>
                  <input
                    type="text"
                    value={cfop}
                    onChange={(e) => setCfop(e.target.value)}
                    placeholder="Ex: 5102"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {productToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Salvar Produto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
