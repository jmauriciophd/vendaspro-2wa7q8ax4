import type { Sale, SaleItem, Customer, CompanySettings } from '@/types/crm'

/** Format BRL currency */
const brl = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateFmt = (d?: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '')

/** Escape HTML text */
const esc = (s: string | undefined) =>
  (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const docStyles = `
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
  .page { width: 800px; margin: 0 auto; background: #fff; padding: 40px; }
  h1, h2, h3 { margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand-logo { width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 22px; }
  .brand-name { font-size: 17px; font-weight: 700; color: #0f172a; }
  .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 20px; color: #4f46e5; letter-spacing: 0.5px; }
  .doc-title .doc-no { font-size: 11px; color: #64748b; margin-top: 4px; }
  .section { margin-top: 20px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
  .box p { margin: 2px 0; font-size: 12px; color: #334155; }
  .box .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; }
  .box .value { font-size: 13px; font-weight: 600; color: #0f172a; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.items th { background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 9px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  table.items td { font-size: 12px; padding: 10px; border-bottom: 1px solid #eef2f7; color: #334155; }
  table.items td.num { text-align: right; }
  table.items td.ctr { text-align: center; }
  .totals { margin-top: 16px; margin-left: auto; width: 320px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #475569; }
  .totals .row.grand { border-top: 2px solid #4f46e5; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 800; color: #0f172a; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .sign { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sign-line { border-top: 1px solid #94a3b8; padding-top: 6px; text-align: center; font-size: 11px; color: #64748b; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge.ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .badge.warn { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
`

const base64Logo = (initial: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"><rect width="52" height="52" rx="12" fill="#4f46e5"/><text x="26" y="34" font-size="22" font-family="Arial" font-weight="800" fill="#fff" text-anchor="middle">${esc(
      initial,
    )}</text></svg>`,
  )}`

export interface NfeData {
  sale: Sale
  items: SaleItem[]
  customer?: Customer
  company: CompanySettings
  number: string
  accessKey: string
}

export function buildNfeHtml(data: NfeData): string {
  const { sale, items, customer, company, number, accessKey } = data
  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0)
  const discount = 0
  const icmsBase = subtotal
  const icmsRate = 0.18
  const icmsValue = subtotal * icmsRate
  const total = sale.total || subtotal

  const rows = items
    .map((it, idx) => {
      const p = it.expand?.product
      const li = it.quantity * it.unit_price
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${esc(p?.name || 'Produto')}</strong><br/><span style="color:#94a3b8;font-size:10px">Cód: ${esc(p?.code || '-')} • NCM: ${esc(p?.ncm || '-')}</span></td>
        <td class="ctr">${esc(p?.cfop || '5102')}</td>
        <td class="ctr">${esc(p?.ncm || '-')}</td>
        <td class="ctr">${it.quantity} ${esc(p?.unit || 'un')}</td>
        <td class="num">${brl(it.unit_price)}</td>
        <td class="num">${brl(li)}</td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>NF-e ${esc(number)}</title>
  <style>${docStyles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <img src="${base64Logo((company.name || 'E')[0])}" alt="logo"/>
        <div>
          <div class="brand-name">${esc(company.name)}</div>
          <div class="brand-sub">CNPJ: ${esc(company.cnpj || '-')} • IE: ${esc(company.ie || '-')}</div>
          <div class="brand-sub">${esc(company.address)}, ${esc(company.number)} - ${esc(company.neighborhood)} - ${esc(company.city)}/${esc(company.state)} - CEP ${esc(company.cep)}</div>
        </div>
      </div>
      <div class="doc-title">
        <h1>NOTA FISCAL ELETRÔNICA</h1>
        <div class="doc-no">NF-e Nº <strong>${esc(number)}</strong></div>
        <div class="doc-no">Data de Emissão: ${dateFmt(sale.sale_date || sale.created)}</div>
        <span class="badge ok">Autorizada</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Chave de Acesso</div>
      <div class="box" style="font-family:monospace;font-size:11px;letter-spacing:1px;word-break:break-all">${esc(accessKey)}</div>
    </div>

    <div class="section grid-2">
      <div>
        <div class="section-title">Emitente</div>
        <div class="box">
          <p><span class="label">Razão Social</span><br/><span class="value">${esc(company.name)}</span></p>
          <p><span class="label">CNPJ</span> ${esc(company.cnpj || '-')} &nbsp; <span class="label">IE</span> ${esc(company.ie || '-')}</p>
          <p>${esc(company.address)}, ${esc(company.number)} - ${esc(company.neighborhood)}</p>
          <p>${esc(company.city)}/${esc(company.state)} - CEP ${esc(company.cep || '-')}</p>
          <p><span class="label">Telefone</span> ${esc(company.phone || '-')} &nbsp; <span class="label">E-mail</span> ${esc(company.email || '-')}</p>
        </div>
      </div>
      <div>
        <div class="section-title">Destinatário</div>
        <div class="box">
          <p><span class="label">Nome / Razão Social</span><br/><span class="value">${esc(customer?.name || '-')}</span></p>
          <p><span class="label">CNPJ/CPF</span> ${esc(customer?.cnpj || '-')} &nbsp; <span class="label">IE</span> ${esc(customer?.ie || '-')}</p>
          <p>${esc(customer?.address)}, ${esc(customer?.number)} - ${esc(customer?.neighborhood)}</p>
          <p>${esc(customer?.city)}/${esc(customer?.state)} </p>
          <p><span class="label">Telefone</span> ${esc(customer?.phone || '-')} &nbsp; <span class="label">E-mail</span> ${esc(customer?.email || '-')}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Itens da Nota Fiscal</div>
      <table class="items">
        <thead><tr>
          <th>#</th><th>Descrição</th><th class="ctr">CFOP</th><th class="ctr">NCM</th><th class="ctr">Qtd</th><th class="num">Vl. Unit</th><th class="num">Vl. Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals">
      <div class="row"><span>Subtotal dos produtos</span><span>R$ ${brl(subtotal)}</span></div>
      <div class="row"><span>Desconto</span><span>R$ ${brl(discount)}</span></div>
      <div class="row"><span>Base de cálculo ICMS</span><span>R$ ${brl(icmsBase)}</span></div>
      <div class="row"><span>Alíquota ICMS (18%)</span><span>R$ ${brl(icmsValue)}</span></div>
      <div class="row grand"><span>Valor Total da Nota</span><span>R$ ${brl(total)}</span></div>
    </div>

    <div class="sign">
      <div class="sign-line">${esc(company.name)}<br/>Emitente</div>
      <div class="sign-line">${esc(customer?.name || 'Cliente')}<br/>Destinatário</div>
    </div>

    <div class="footer">
      Documento gerado eletronicamente por ${esc(company.name)} — CRM de Vendas.<br/>
      ${dateFmt(sale.sale_date || sale.created)} • Forma de pagamento: ${esc(sale.payment_method?.toUpperCase())}
    </div>
  </div></body></html>`
}

export interface PromissoriaInstallment {
  number: number
  value: number
  dueDate: string
}

export interface PromissoriaData {
  sale: Sale
  customer?: Customer
  company: CompanySettings
  totalValue: number
  installments: PromissoriaInstallment[]
  number: string
  emissionDate: string
}

export function buildPromissoriaHtml(data: PromissoriaData): string {
  const { sale, customer, company, totalValue, installments, number, emissionDate } = data

  const rows = installments
    .map(
      (i) =>
        `<tr><td class="ctr">${i.number}</td><td class="num">R$ ${brl(i.value)}</td><td class="ctr">${dateFmt(i.dueDate)}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Nota Promissória ${esc(number)}</title>
  <style>${docStyles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <img src="${base64Logo('P')}" alt="logo"/>
        <div>
          <div class="brand-name">NOTA PROMISSÓRIA</div>
          <div class="brand-sub">Nº <strong>${esc(number)}</strong> • Emissão: ${dateFmt(emissionDate)}</div>
        </div>
      </div>
      <div class="doc-title">
        <h1>PROMISSÓRIA</h1>
        <div class="doc-no">Valor Nominal: <strong>R$ ${brl(totalValue)}</strong></div>
      </div>
    </div>

    <div class="section">
      <div class="box" style="font-size:13px;line-height:1.7;color:#1e293b">
        <p>Ao(s) <strong>${dateFmt(installments[installments.length - 1]?.dueDate || emissionDate)}</strong>,
        pagarei(emos) por esta única via de NOTA PROMISSÓRIA a
        <strong>${esc(company.name)}</strong>, CNPJ ${esc(company.cnpj || '-')},
        estabelecida em ${esc(company.address)}, ${esc(company.number)} - ${esc(company.neighborhood)},
        ${esc(company.city)}/${esc(company.state)}, ou à sua ordem, a quantia de
        <strong>R$ ${brl(totalValue)}</strong> (${extenso(totalValue)}),
        em ${installments.length} (${extensoPt(installments.length)}) parcela(s) conforme tabela abaixo,
        em moeda corrente deste país.</p>
        <p style="margin-top:10px">Pagável em: ${esc(company.city)}/${esc(company.state)}.
        Emitente/Devedor: <strong>${esc(customer?.name || '-')}</strong>,
        CNPJ/CPF: ${esc(customer?.cnpj || '-')}.</p>
      </div>
    </div>

    <div class="section grid-2">
      <div>
        <div class="section-title">Emitente (Devedor)</div>
        <div class="box">
          <p><span class="value">${esc(customer?.name || '-')}</span></p>
          <p><span class="label">CNPJ/CPF</span> ${esc(customer?.cnpj || '-')}</p>
          <p>${esc(customer?.address)}, ${esc(customer?.number)} - ${esc(customer?.neighborhood)}</p>
          <p>${esc(customer?.city)}/${esc(customer?.state)}</p>
          <p><span class="label">Telefone</span> ${esc(customer?.phone || '-')}</p>
        </div>
      </div>
      <div>
        <div class="section-title">Beneficiário (Credor)</div>
        <div class="box">
          <p><span class="value">${esc(company.name)}</span></p>
          <p><span class="label">CNPJ</span> ${esc(company.cnpj || '-')} <span class="label">IE</span> ${esc(company.ie || '-')}</p>
          <p>${esc(company.address)}, ${esc(company.number)} - ${esc(company.neighborhood)}</p>
          <p>${esc(company.city)}/${esc(company.state)}</p>
          <p><span class="label">Telefone</span> ${esc(company.phone || '-')}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Parcelas</div>
      <table class="items">
        <thead><tr><th class="ctr">Parcela</th><th class="num">Valor</th><th class="ctr">Vencimento</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="totals">
      <div class="row grand"><span>Valor Total</span><span>R$ ${brl(totalValue)}</span></div>
    </div>

    <div class="sign">
      <div class="sign-line">${esc(customer?.name || 'Devedor')}<br/>Assinatura do Emitente (Devedor)</div>
      <div class="sign-line">${esc(company.name)}<br/>Beneficiário (Credor)</div>
    </div>

    <div class="footer">
      Nota Promissória vinculada à Venda nº ${esc(sale.id.slice(-6).toUpperCase())} •
      Emitida em ${dateFmt(emissionDate)} • CRM de Vendas
    </div>
  </div></body></html>`
}

/** Number to Portuguese words (limited, for promissória) */
function extenso(n: number): string {
  const reais = Math.floor(n)
  const centavos = Math.round((n - reais) * 100)
  return `${extensoPt(reais)} reais${centavos > 0 ? ` e ${extensoPt(centavos)} centavos` : ''}`
}

function extensoPt(num: number): string {
  if (num === 0) return 'zero'
  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ]
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ]
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ]

  function abaixo1000(n: number): string {
    let parts: string[] = []
    if (n >= 100) {
      parts.push(centenas[Math.floor(n / 100)])
      n = n % 100
    }
    if (n >= 20) {
      const d = Math.floor(n / 10)
      const u = n % 10
      parts.push(dezenas[d] + (u ? ' e ' + unidades[u] : ''))
    } else if (n > 0) {
      parts.push(unidades[n])
    }
    return parts.join(' e ')
  }

  if (num < 0) return 'menos ' + extensoPt(-num)
  if (num === 100) return 'cem'

  let result = ''
  const milhoes = Math.floor(num / 1000000)
  let rest = num % 1000000
  const milhares = Math.floor(rest / 1000)
  rest = rest % 1000

  const segs: string[] = []
  if (milhoes > 0)
    segs.push((milhoes === 1 ? 'um' : abaixo1000(milhoes)) + ' milhão' + (milhoes > 1 ? 'ões' : ''))
  if (milhares > 0) segs.push((milhares === 1 ? 'um' : abaixo1000(milhares)) + ' mil')
  if (rest > 0) segs.push(abaixo1000(rest))

  result = segs.join(' e ')
  return result || 'zero'
}

/** Open print dialog (browser "Save as PDF") for an HTML document string */
export function printHtml(html: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) {
    alert('Habilite pop-ups para visualizar o documento.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  // Give browser a tick to render before printing
  setTimeout(() => {
    w.focus()
    w.print()
  }, 400)
}

/** Generate a pseudo access key (44 digits) */
export function generateAccessKey(): string {
  const uf = '35'
  const year = new Date().getFullYear().toString().slice(-2)
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const cnpj = '12345678000190'
  const modelo = '55'
  const serie = '001'
  const numero = String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')
  const tpEmis = '1'
  const rand = String(Math.floor(Math.random() * 90000000) + 10000000).padStart(8, '0')
  const base = uf + year + month + cnpj + modelo + serie + numero + tpEmis + rand
  const dv = computeDV(base)
  return base + dv
}

function computeDV(key: string): string {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9]
  let sum = 0
  let pos = 0
  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i], 10) * weights[pos % 8]
    pos++
  }
  const rest = sum % 11
  return rest < 2 ? '0' : String(11 - rest)
}
