import React, { useState, useRef, useCallback } from 'react'
import {
  X,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { clientImportService } from '@/services/modules'
import type { ClientImportRow, ClientImportResult } from '@/types/modules'

interface ClientImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

type Step = 'upload' | 'preview' | 'result'

const REQUIRED_HEADERS = [
  'name',
  'email',
  'phone',
  'document',
  'cnpj',
  'address',
  'city',
  'state',
  'zip_code',
  'type',
  'phone_whatsapp',
  'telegram',
]

const SAMPLE_CSV = `name,email,phone,document,cnpj,address,city,state,zip_code,type,phone_whatsapp,telegram
Mercadinho São João,contato@saobao.com.br,(11) 3030-0000,,12.345.678/0001-90,Rua das Flores 100,São Paulo,SP,01000-000,pequeno,5511987654321,@saojoao
Supermercado Bom Preço,compras@bompreco.com.br,(21) 2222-3333,,98.765.432/0001-10,Av. Brasil 500,Rio de Janeiro,RJ,20000-000,medio,5521988887777,
Conveniência 24h,vendas@conv24h.com.br,(31) 3333-4444,,45.678.901/0001-22,Rua Mineira 30,Belo Horizonte,MG,30000-000,pequeno,5531977776666,@conv24h
`

interface ParsedRow {
  data: ClientImportRow
  valid: boolean
  reason?: string
}

/** Parser CSV simples (sem dependências externas). */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const splitLine = (line: string): string[] => {
    const result: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur)
    return result.map((s) => s.trim())
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

function downloadModel() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_clientes.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const ClientImportModal: React.FC<ClientImportModalProps> = ({
  isOpen,
  onClose,
  onImported,
}) => {
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [headerError, setHeaderError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ClientImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('upload')
    setFileName('')
    setParsedRows([])
    setHeaderError('')
    setResult(null)
    setImporting(false)
    setDragOver(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      const { headers, rows } = parseCSV(text)

      // valida cabeçalhos (ao menos "name")
      const missing = ['name'].filter((h) => !headers.map((x) => x.toLowerCase()).includes(h))
      if (missing.length > 0) {
        setHeaderError(`Cabeçalho obrigatório ausente: ${missing.join(', ')}. Use o modelo CSV.`)
        setParsedRows([])
        setStep('preview')
        return
      }

      setHeaderError('')

      const headerIdx: Record<string, number> = {}
      headers.forEach((h, i) => {
        headerIdx[h.toLowerCase()] = i
      })

      const get = (row: string[], key: string): string => {
        const idx = headerIdx[key]
        return idx !== undefined ? row[idx] || '' : ''
      }

      const parsed: ParsedRow[] = rows.map((row) => {
        const data: ClientImportRow = {
          name: get(row, 'name'),
          email: get(row, 'email'),
          phone: get(row, 'phone'),
          document: get(row, 'document'),
          cnpj: get(row, 'cnpj'),
          address: get(row, 'address'),
          city: get(row, 'city'),
          state: get(row, 'state'),
          zip_code: get(row, 'zip_code'),
          type: get(row, 'type'),
          phone_whatsapp: get(row, 'phone_whatsapp'),
          telegram: get(row, 'telegram'),
        }
        const valid = !!data.name && data.name.trim() !== ''
        return {
          data,
          valid,
          reason: valid ? undefined : 'Nome obrigatório',
        }
      })

      setParsedRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.valid).map((r) => r.data)
    if (validRows.length === 0) {
      toast.error('Nenhuma linha válida para importar.')
      return
    }
    setImporting(true)
    try {
      const res = await clientImportService.import(validRows)
      setResult(res)
      setStep('result')
      if (res.success > 0) {
        toast.success(`${res.success} cliente(s) importado(s)!`)
        onImported()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.data?.message || 'Erro ao importar clientes')
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  const validCount = parsedRows.filter((r) => r.valid).length
  const invalidCount = parsedRows.length - validCount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Importar Clientes</h3>
              <p className="text-xs text-slate-500">
                Etapa {step === 'upload' ? 1 : step === 'preview' ? 2 : 3} de 3 —{' '}
                {step === 'upload'
                  ? 'Upload do CSV'
                  : step === 'preview'
                    ? 'Pré-visualização'
                    : 'Resultado'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {[
            { key: 'upload', label: 'Upload' },
            { key: 'preview', label: 'Validação' },
            { key: 'result', label: 'Resultado' },
          ].map((s, i) => {
            const active = step === s.key
            const done =
              (step === 'preview' && s.key === 'upload') ||
              (step === 'result' && (s.key === 'upload' || s.key === 'preview'))
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : done
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${active ? 'text-indigo-700' : done ? 'text-emerald-700' : 'text-slate-400'}`}
                >
                  {s.label}
                </span>
                {i < 2 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Arraste um arquivo CSV aqui ou clique para selecionar
                </p>
                <p className="text-xs text-slate-400 mt-1">Apenas arquivos .csv</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ''
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">Modelo CSV</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Cabeçalhos: {REQUIRED_HEADERS.join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadModel}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar modelo
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {headerError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">Erro no cabeçalho</p>
                    <p className="text-xs text-red-600 mt-0.5">{headerError}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600 truncate max-w-[180px]">
                        {fileName}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      {validCount} válidos
                    </span>
                    {invalidCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200">
                        {invalidCount} com erro
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {parsedRows.length} clientes encontrados
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3 w-8"></th>
                            <th className="py-2.5 px-3">Nome</th>
                            <th className="py-2.5 px-3">Tipo</th>
                            <th className="py-2.5 px-3">Documento</th>
                            <th className="py-2.5 px-3">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.slice(0, 200).map((r, i) => (
                            <tr key={i} className={r.valid ? '' : 'bg-red-50/40'}>
                              <td className="py-2 px-3">
                                {r.valid ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800 truncate max-w-[160px]">
                                {r.data.name || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-500">{r.data.type || '—'}</td>
                              <td className="py-2 px-3 text-slate-500">
                                {r.data.cnpj || r.data.document || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-500 truncate max-w-[160px]">
                                {r.data.email || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 200 && (
                      <div className="px-3 py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">
                        Mostrando 200 de {parsedRows.length} linhas.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Result */}
          {step === 'result' && result && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{result.success}</p>
                  <p className="text-[11px] text-emerald-600 font-medium">Importados</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-700">{result.duplicates}</p>
                  <p className="text-[11px] text-amber-600 font-medium">Duplicados</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                  <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                  <p className="text-[11px] text-red-600 font-medium">Inválidos</p>
                </div>
              </div>

              {result.details.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">Detalhes</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {result.details.map((d, i) => {
                      const color =
                        d.status === 'success'
                          ? 'text-emerald-600'
                          : d.status === 'duplicate'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      const Icon =
                        d.status === 'success'
                          ? CheckCircle2
                          : d.status === 'duplicate'
                            ? AlertTriangle
                            : XCircle
                      return (
                        <div key={i} className="px-4 py-2 flex items-center gap-2 text-xs">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                          <span className="font-medium text-slate-700">
                            Linha {d.row}: {d.name || '—'}
                          </span>
                          {d.reason && <span className="text-slate-400">— {d.reason}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          {step === 'upload' && (
            <>
              <div />
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || validCount === 0 || !!headerError}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Importar {validCount} cliente(s)
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <button
                onClick={reset}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Nova importação
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
