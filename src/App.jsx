import { useEffect, useRef, useState } from 'react'
import {
  Archive, Calculator, CalendarDays, Camera, Check, ChevronRight,
  CircleDollarSign, ClipboardList, Download, FileText, Home, Moon, MoreHorizontal,
  Package, Plus, ReceiptText, Search, Settings, Share2, ShoppingBag,
  Sparkles, Sun, Trash2, Upload, UserRound, UsersRound, WalletCards, X,
} from 'lucide-react'

const STORE_KEY = 'meu-atelie-data-v1'
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = () => localDateKey()
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateBR = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'

function orderPayments(order) {
  if (Array.isArray(order.payments)) return order.payments
  const legacyValue = order.payment === 'paid' ? Number(order.value || 0) : order.payment === 'deposit' ? Number(order.value || 0) / 2 : 0
  return legacyValue > 0 ? [{ id: `legacy-${order.id}`, value: legacyValue, date: '', method: 'previous', notes: 'Pagamento registrado na versão anterior' }] : []
}

function compressPhoto(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', .78))
    }
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Imagem inválida')) }
    image.src = objectUrl
  })
}

function quoteMessage(quote, profile) {
  const studio = profile.studio || 'Meu Ateliê'
  const brand = studio.split(/\s+/)[0] || studio
  const quantity = Math.max(1, Number(quote.quantity || 1))
  const total = Number(quote.value || 0)
  const unitValue = total / quantity
  const payment = quote.paymentTerms || profile.paymentOptions || 'PIX, espécie, débito ou crédito.'
  const cardNote = profile.cardPaymentNote || 'Cartão com acréscimo da máquina.'
  const productionTime = quote.productionTime || (quote.deliveryDate ? `até ${dateBR(quote.deliveryDate)}` : 'A combinar')
  const shippingTime = quote.shippingTime || 'A combinar'
  const deliveryMessage = profile.deliveryMessage || 'Retirada ou entrega a combinar. Em caso de entrega, temos uma taxa única de R$ 8,00 para a cidade de Caxias.'
  const details = [
    `• Produto(s): ${quote.title}`,
    `• Quantidade: ${quantity}`,
    `• Valor: ${money(unitValue)} cada, total 🟰 ${money(total)}`,
    `• Forma de pagamento: ${payment}`,
    `Obs.: ${cardNote}`,
    `• Prazo de produção: ${productionTime}`,
    `• Prazo de envio: ${shippingTime}`,
    profile.pixKey ? `• Chave PIX: ${profile.pixKey}` : '',
    quote.notes ? `• Observações: ${quote.notes}` : '',
  ].filter(Boolean).join('\n')
  const nextSteps = ['Assim que seu pedido estiver finalizado, você receberá:', '• Uma foto da peça pronta', `• ${deliveryMessage}`].join('\n')
  return [
    `🌿 Confirmação de Pedido – ${studio}.`,
    `Olá, ${quote.client || 'cliente'}✨\nRecebemos seu pedido com muito carinho e ele será preparado com todo o cuidado artesanal do ${studio}.`,
    `🧾 Detalhes do Pedido\n${details}`,
    `🎨 Um toque especial ${brand}\n\nCada peça ${brand} é pintada à mão — única, afetiva e feita para durar. Por isso, seguimos um processo cuidadoso para garantir que você receba algo tão especial quanto imaginou.`,
    `📦 Próximos passos\n\n${nextSteps}`,
    `Qualquer dúvida, estou à disposição!\nObrigada por escolher o ${brand} — onde cada detalhe importa. 🌿✨`,
  ].join('\n\n')
}

function whatsAppUrl(quote, data) {
  const client = data.clients.find((current) => current.name.trim().toLocaleLowerCase('pt-BR') === quote.client?.trim().toLocaleLowerCase('pt-BR'))
  let phone = (client?.phone || '').replace(/\D/g, '')
  if (phone && !phone.startsWith('55')) phone = `55${phone}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(quoteMessage(quote, data.profile))}`
}

async function generateQuotePdf(quote, profile) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pink = [189, 93, 121]
  const dark = [47, 38, 43]
  const muted = [119, 105, 112]
  const soft = [250, 239, 244]
  const pdfMoney = (value) => money(value).replace(/\u00a0/g, ' ')
  const number = String(quote.id || '').replace(/-/g, '').slice(-6).toUpperCase() || 'NOVO'
  const createdAt = quote.createdAt || today()

  doc.setFillColor(...pink)
  doc.rect(0, 0, 210, 48, 'F')
  doc.setFillColor(255, 255, 255)
  doc.circle(24, 24, 11, 'F')
  doc.setTextColor(...pink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text((profile.studio || 'M').slice(0, 1).toUpperCase(), 24, 29, { align: 'center' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text(profile.studio || 'Meu Ateliê', 42, 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(profile.name ? `Responsável: ${profile.name}` : 'Feito com cuidado para você', 42, 28)
  if (profile.businessPhone) doc.text(`WhatsApp: ${profile.businessPhone}`, 42, 34)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`ORÇAMENTO #${number}`, 190, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Emitido em ${dateBR(createdAt)}`, 190, 27, { align: 'right' })

  let y = 61
  const label = (title, value, x, width = 82) => {
    doc.setTextColor(...muted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(title.toUpperCase(), x, y)
    doc.setTextColor(...dark); doc.setFontSize(10); doc.text(doc.splitTextToSize(value || 'Não informado', width), x, y + 6)
  }
  label('Cliente', quote.client, 20)
  label('Validade', dateBR(quote.validUntil), 111)
  y += 20
  label('Prazo de produção', quote.productionTime || 'A combinar', 20)
  label('Prazo de envio', quote.shippingTime || 'A combinar', 111)
  y += 20
  label('Prazo de entrega', quote.deliveryDate ? dateBR(quote.deliveryDate) : 'A combinar', 20)
  label('Forma de pagamento', quote.paymentTerms || 'A combinar', 111)
  y += 22

  doc.setFillColor(...soft)
  doc.roundedRect(16, y, 178, 28, 4, 4, 'F')
  doc.setTextColor(...muted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('PEÇA OU SERVIÇO', 21, y + 8)
  doc.setTextColor(...dark); doc.setFontSize(12); doc.text(doc.splitTextToSize(quote.title || 'Item', 105), 21, y + 16)
  doc.setTextColor(...muted); doc.setFontSize(8); doc.text(`Quantidade: ${quote.quantity || 1}`, 21, y + 23)
  doc.setTextColor(...pink); doc.setFontSize(15); doc.text(pdfMoney(quote.value), 188, y + 17, { align: 'right' })
  y += 40

  if (quote.notes) {
    doc.setTextColor(...pink); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('DETALHES DO ORÇAMENTO', 20, y)
    doc.setTextColor(...dark); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    const details = doc.splitTextToSize(quote.notes, 170)
    doc.text(details, 20, y + 7)
    y += 9 + details.length * 5
  }

  if (profile.pixKey) {
    doc.setFillColor(238, 248, 240)
    doc.roundedRect(16, y, 178, 18, 3, 3, 'F')
    doc.setTextColor(45, 126, 65); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('CHAVE PIX', 21, y + 7)
    doc.setFontSize(10); doc.text(profile.pixKey, 21, y + 13)
  }

  doc.setDrawColor(225, 210, 217)
  doc.line(16, 277, 194, 277)
  doc.setTextColor(...muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  doc.text(`${profile.studio || 'Meu Ateliê'} · Orçamento válido até ${dateBR(quote.validUntil)}`, 105, 284, { align: 'center' })
  return new File([doc.output('blob')], `orcamento-${number.toLowerCase()}.pdf`, { type: 'application/pdf' })
}

async function shareQuotePdf(quote, profile) {
  const file = await generateQuotePdf(quote, profile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `Orçamento - ${profile.studio || 'Meu Ateliê'}`, text: `Orçamento para ${quote.client || 'cliente'}`, files: [file] })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') throw error
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

const escapeCalendarText = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

async function shareOrderCalendar(order, client, profile) {
  if (!order.date) throw new Error('missing-date')
  const nextDay = new Date(`${order.date}T12:00:00`)
  nextDay.setDate(nextDay.getDate() + 1)
  const start = order.date.replace(/-/g, '')
  const end = localDateKey(nextDay).replace(/-/g, '')
  const description = [client?.name ? `Cliente: ${client.name}` : '', `Valor: ${money(order.value)}`, order.notes || ''].filter(Boolean).join('\n')
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meu Atelie//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(order.id)}@meu-atelie`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeCalendarText(`Entrega: ${order.title}`)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `LOCATION:${escapeCalendarText(profile.studio || 'Meu Ateliê')}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeCalendarText(`Entrega amanhã: ${order.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const file = new File([calendar], `entrega-${order.date}-${String(order.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, { type: 'text/calendar' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: `Entrega - ${order.title}`, files: [file] })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') throw error
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

const initialData = {
  profile: { name: '', studio: 'Meu Ateliê', businessPhone: '', pixKey: '', paymentOptions: 'PIX, espécie, débito ou crédito.', cardPaymentNote: 'Cartão com acréscimo da máquina.', deliveryMessage: 'Retirada ou entrega a combinar. Em caso de entrega, temos uma taxa única de R$ 8,00 para a cidade de Caxias.', dark: false, onboarded: false },
  clients: [], orders: [], materials: [], expenses: [], catalog: [], quotes: [],
}

function readData() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('preview')) {
    return {
      profile: { ...initialData.profile, name: 'Pablo', studio: 'Meu Ateliê', businessPhone: '(85) 99999-9999', pixKey: 'contato@meuatelie.com', onboarded: true },
      clients: [{ id: 'demo-client', name: 'Rebeca Dias', phone: '(85) 99999-1234', instagram: '@rebeca', notes: '' }],
      orders: [{ id: 'demo-order', title: 'Kit banheiro', clientId: 'demo-client', date: today(), value: 150, status: 'confirmed', payment: 'deposit', payments: [{ id: 'demo-payment', value: 75, date: today(), method: 'pix', notes: 'Sinal do pedido' }], notes: '' }],
      materials: [{ id: 'demo-material', name: 'Barbante cru', quantity: 2, minimum: 3, unit: 'un.', cost: 17.8, packageWeight: 600 }],
      expenses: [], catalog: [], quotes: [],
    }
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY))
    if (!parsed) return initialData
    const orders = (parsed.orders || []).map((order) => {
      if (Array.isArray(order.payments)) return order
      return { ...order, payments: orderPayments(order) }
    })
    return { ...initialData, ...parsed, orders, profile: { ...initialData.profile, ...parsed.profile } }
  } catch { return initialData }
}

const screens = {
  home: { title: 'Meu Ateliê', icon: Home },
  orders: { title: 'Pedidos', icon: Package },
  clients: { title: 'Clientes', icon: UsersRound },
  inventory: { title: 'Estoque', icon: Archive },
  finance: { title: 'Financeiro', icon: WalletCards },
  calendar: { title: 'Agenda', icon: CalendarDays },
  calculator: { title: 'Calculadora', icon: Calculator },
  quotes: { title: 'Orçamentos', icon: ClipboardList },
  catalog: { title: 'Catálogo', icon: ShoppingBag },
  settings: { title: 'Configurações', icon: Settings },
}

const statusLabel = { pending: 'Pendente', confirmed: 'Confirmado', producing: 'Em produção', delivered: 'Entregue' }
const paymentMethodLabel = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão', transfer: 'Transferência', previous: 'Registro anterior', other: 'Outro' }
const statusCycle = ['pending', 'confirmed', 'producing', 'delivered']
const paidAmount = (order) => orderPayments(order).reduce((sum, payment) => sum + Number(payment.value || 0), 0)
const paymentState = (order) => {
  const paid = paidAmount(order)
  if (paid <= 0) return 'open'
  return paid + .005 >= Number(order.value || 0) ? 'paid' : 'deposit'
}
const paymentText = (order) => {
  const state = paymentState(order)
  return state === 'paid' ? 'Pago ✓' : state === 'deposit' ? `Parcial ${money(paidAmount(order))}` : 'Em aberto'
}

function productionStockUsage(order) {
  const grouped = new Map()
  for (const entry of order.production?.materials || []) {
    if (!entry.materialId) continue
    const current = grouped.get(entry.materialId) || { materialId: entry.materialId, name: entry.name, stockUnit: entry.stockUnit || entry.displayUnit || 'un.', stockQuantity: 0 }
    current.stockQuantity += Number(entry.stockQuantity ?? entry.amount ?? 0)
    grouped.set(entry.materialId, current)
  }
  return [...grouped.values()]
}

function stockShortages(order, inventory) {
  return productionStockUsage(order).filter((usage) => {
    const material = inventory.find((current) => current.id === usage.materialId)
    return !material || Number(material.quantity) + .00001 < usage.stockQuantity
  })
}

function deductOrderStock(data, order, replacement = order) {
  const usedAt = new Date().toISOString()
  const snapshot = productionStockUsage(order).map((usage) => {
    const material = data.materials.find((current) => current.id === usage.materialId)
    return { ...usage, material: material ? { ...material } : null }
  })
  const quantities = new Map(snapshot.map((usage) => [usage.materialId, usage.stockQuantity]))
  const materials = data.materials.map((material) => quantities.has(material.id) ? { ...material, quantity: Math.max(0, Number((Number(material.quantity || 0) - quantities.get(material.id)).toFixed(4))) } : material)
  const production = { ...replacement.production, checks: { ...replacement.production?.checks, materials: true }, stockDeductedAt: usedAt, stockSnapshot: snapshot }
  return { ...data, materials, orders: data.orders.map((current) => current.id === order.id ? { ...replacement, production } : current) }
}

function orderCostSummary(order) {
  const production = order.production || {}
  const costing = order.costing || {}
  const materials = Array.isArray(production.materials) ? production.materials : costing.materials || []
  const materialCost = materials.reduce((sum, material) => sum + Number(material.calculatedCost || 0), 0)
  const hours = Number(production.hours ?? costing.hours ?? 0)
  const hourly = Number(production.hourly ?? costing.hourly ?? 0)
  const laborCost = hours * hourly
  const otherCosts = Number(production.otherCosts ?? costing.fixed ?? 0)
  const totalCost = materialCost + laborCost + otherCosts
  const revenue = Number(order.value || 0)
  const profit = revenue - totalCost
  const margin = revenue > 0 ? profit / revenue * 100 : 0
  return { materialCost, hours, hourly, laborCost, otherCosts, totalCost, revenue, profit, margin }
}

function App() {
  const [data, setData] = useState(readData)
  const [screen, setScreen] = useState(() => {
    const requested = import.meta.env.DEV ? new URLSearchParams(location.search).get('screen') : null
    return requested && screens[requested] ? requested : 'home'
  })
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState('all')

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) }
    catch { setToast('Espaço local cheio. Exporte um backup.') }
  }, [data])
  useEffect(() => { document.documentElement.classList.toggle('dark', data.profile.dark) }, [data.profile.dark])
  useEffect(() => { setSearch(''); setOrderFilter('all'); window.scrollTo(0, 0) }, [screen])

  const notify = (message) => {
    setToast(message)
    window.clearTimeout(notify.timer)
    notify.timer = window.setTimeout(() => setToast(''), 2300)
  }

  const update = (key, updater) => setData((old) => ({ ...old, [key]: updater(old[key]) }))
  const saveProfile = (patch) => setData((old) => ({ ...old, profile: { ...old.profile, ...patch } }))
  const navigate = (next) => { setScreen(next); setModal(null) }

  if (!data.profile.onboarded) {
    return <Onboarding onFinish={(profile) => saveProfile({ ...profile, onboarded: true })} />
  }

  const common = { data, update, setData, setModal, navigate, notify, search, setSearch }
  const content = {
    home: <HomeScreen {...common} />,
    orders: <OrdersScreen {...common} filter={orderFilter} setFilter={setOrderFilter} />,
    clients: <ClientsScreen {...common} />,
    inventory: <InventoryScreen {...common} />,
    finance: <FinanceScreen {...common} />,
    calendar: <CalendarScreen {...common} />,
    calculator: <CalculatorScreen {...common} />,
    quotes: <QuotesScreen {...common} />,
    catalog: <CatalogScreen {...common} />,
    settings: <SettingsScreen {...common} saveProfile={saveProfile} />,
  }[screen]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand studio={data.profile.studio} />
        <div className="side-nav">
          {Object.entries(screens).map(([key, item]) => {
            const Icon = item.icon
            return <button key={key} className={screen === key ? 'active' : ''} onClick={() => navigate(key)}><Icon />{item.title}</button>
          })}
        </div>
        <p>Seus dados ficam neste aparelho.</p>
      </aside>

      <main className="phone">
        <header className="header">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div className="header-copy"><strong>{screens[screen].title}</strong><span>{screen === 'home' ? `Olá, ${data.profile.name.split(' ')[0]}! 👋` : data.profile.studio}</span></div>
          <button className="header-profile" aria-label="Abrir perfil" onClick={() => navigate('settings')}>{data.profile.photo ? <img src={data.profile.photo} alt={`Foto de ${data.profile.name}`} /> : <span>{data.profile.name?.[0]?.toUpperCase() || '🧶'}</span>}</button>
        </header>

        <section className="content">{content}</section>
        <BottomNav screen={screen} navigate={navigate} setModal={setModal} />
        {modal && <Modal onClose={() => setModal(null)}>{renderModal(modal, common)}</Modal>}
        <div className={`toast ${toast ? 'show' : ''}`}><Check size={17} />{toast}</div>
      </main>
    </div>
  )
}

function Onboarding({ onFinish }) {
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onFinish({ name: form.get('name').trim(), studio: form.get('studio').trim() || 'Meu Ateliê' })
  }
  return <main className="onboarding">
    <div className="onboarding-logo">🧶</div>
    <span className="eyebrow light">SEJA BEM-VINDA</span>
    <h1>Seu ateliê organizado,<br />do seu jeito.</h1>
    <p>Pedidos, clientes, estoque e lucro juntos em um app simples e particular.</p>
    <form onSubmit={submit}>
      <input name="name" placeholder="Seu nome" required autoFocus />
      <input name="studio" placeholder="Nome do seu ateliê (opcional)" />
      <button>Começar agora <ChevronRight /></button>
    </form>
    <small>🔒 Tudo fica salvo somente neste aparelho.</small>
  </main>
}

function Brand({ studio }) {
  return <div className="brand"><div className="brand-mark"><Sparkles size={22} /></div><div><strong>{studio}</strong><span>Gestão artesanal</span></div></div>
}

function BottomNav({ screen, navigate, setModal }) {
  const item = (key, Icon, label) => <button className={screen === key ? 'active' : ''} onClick={() => navigate(key)}><Icon /><span>{label}</span></button>
  return <nav className="bottom-nav">
    {item('home', Home, 'Início')}{item('orders', Package, 'Pedidos')}
    <button className="add-main" aria-label="Adicionar" onClick={() => setModal({ type: 'quick' })}><Plus /></button>
    {item('clients', UsersRound, 'Clientes')}
    <button className={['inventory', 'finance', 'calendar', 'calculator', 'quotes', 'catalog', 'settings'].includes(screen) ? 'active' : ''} onClick={() => setModal({ type: 'more' })}><MoreHorizontal /><span>Mais</span></button>
  </nav>
}

function PageIntro({ eyebrow, title, text, action, actionLabel }) {
  return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</div>{action && <button className="round-action" onClick={action}><Plus /> <span>{actionLabel}</span></button>}</div>
}

function SearchBox({ value, onChange, placeholder = 'Buscar...' }) {
  return <label className="search"><Search /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>
}

function Empty({ icon = '🧶', title, text, action, actionLabel }) {
  return <div className="empty"><div>{icon}</div><h3>{title}</h3><p>{text}</p>{action && <button className="primary small" onClick={action}><Plus />{actionLabel}</button>}</div>
}

function HomeScreen({ data, navigate, setModal }) {
  const openOrders = data.orders.filter((o) => o.status !== 'delivered')
  const receivable = data.orders.reduce((sum, order) => sum + Math.max(0, Number(order.value || 0) - paidAmount(order)), 0)
  const month = today().slice(0, 7)
  const monthlyOrders = data.orders.filter((o) => o.date?.startsWith(month))
  const revenue = monthlyOrders.reduce((sum, o) => sum + Number(o.value || 0), 0)
  const expenses = data.expenses.filter((e) => e.date?.startsWith(month)).reduce((sum, e) => sum + Number(e.value || 0), 0)
  const nextOrders = [...openOrders].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 3)
  return <>
    <section className="hero-card">
      <span>VISÃO GERAL</span><h1>{data.profile.studio}</h1><p>{openOrders.length ? `${openOrders.length} ${openOrders.length === 1 ? 'pedido precisa' : 'pedidos precisam'} da sua atenção.` : 'Tudo tranquilo por aqui. ✨'}</p>
      <div className="hero-stats"><div><b>{openOrders.length}</b><small>Em andamento</small></div><div><b>{money(receivable)}</b><small>A receber</small></div></div>
    </section>

    <div className="section-heading"><div><span className="eyebrow">ACESSO RÁPIDO</span><h2>O que vamos fazer?</h2></div></div>
    <div className="quick-grid">
      <Quick icon="📦" label="Pedidos" sub="Organize entregas" onClick={() => navigate('orders')} />
      <Quick icon="👥" label="Clientes" sub="Histórico completo" onClick={() => navigate('clients')} />
      <Quick icon="🧮" label="Calculadora" sub="Preço sem dúvida" onClick={() => navigate('calculator')} />
      <Quick icon="🧶" label="Estoque" sub="Controle materiais" onClick={() => navigate('inventory')} />
    </div>

    <div className="section-heading"><div><span className="eyebrow">ESTE MÊS</span><h2>Seu negócio</h2></div><button onClick={() => navigate('finance')}>Ver financeiro</button></div>
    <div className="stats-grid">
      <Stat icon={<CircleDollarSign />} value={money(revenue - expenses)} label="Lucro estimado" tone="pink" />
      <Stat icon={<ReceiptText />} value={money(revenue)} label="Em pedidos" tone="green" />
    </div>

    <div className="section-heading"><div><span className="eyebrow">AGENDA</span><h2>Próximas entregas</h2></div>{openOrders.length > 0 && <button onClick={() => navigate('calendar')}>Ver agenda</button>}</div>
    {nextOrders.length ? nextOrders.map((order) => <OrderCard key={order.id} order={order} clients={data.clients} onOpen={() => setModal({ type: 'order', item: order })} onPayment={() => setModal({ type: 'payments', item: order })} />) : <Empty icon="🌷" title="Nenhum pedido em aberto" text="Cadastre seu primeiro pedido e acompanhe tudo por aqui." action={() => setModal({ type: 'order' })} actionLabel="Novo pedido" />}
  </>
}

function Quick({ icon, label, sub, onClick }) {
  return <button className="quick-card" onClick={onClick}><span>{icon}</span><div><strong>{label}</strong><small>{sub}</small></div><ChevronRight /></button>
}

function Stat({ icon, value, label, tone }) {
  return <div className={`stat-card ${tone}`}><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
}

function OrdersScreen({ data, update, setData, setModal, notify, search, setSearch, filter, setFilter }) {
  let orders = data.orders.filter((o) => `${o.title} ${data.clients.find((c) => c.id === o.clientId)?.name || ''}`.toLowerCase().includes(search.toLowerCase()))
  if (filter !== 'all') orders = orders.filter((o) => filter === 'receivable' ? paymentState(o) !== 'paid' : o.status === filter)
  const cycleStatus = (order) => {
    const nextStatus = statusCycle[(statusCycle.indexOf(order.status) + 1) % statusCycle.length]
    const shouldDeduct = nextStatus === 'producing' && !order.production?.stockDeductedAt
    if (shouldDeduct) {
      const usage = productionStockUsage(order)
      if (!usage.length) {
        update('orders', (items) => items.map((current) => current.id === order.id ? { ...current, status: nextStatus } : current))
        notify('Em produção · ficha sem materiais')
        return
      }
      const shortages = stockShortages(order, data.materials)
      if (shortages.length) {
        alert(`Não foi possível iniciar a produção. Estoque insuficiente: ${shortages.map((material) => material.name).join(', ')}.`)
        return
      }
      if (!confirm(`Iniciar a produção e baixar ${usage.length} ${usage.length === 1 ? 'material' : 'materiais'} do estoque?`)) return
      setData((old) => deductOrderStock(old, order, { ...order, status: nextStatus }))
      notify('Produção iniciada e estoque atualizado')
      return
    }
    update('orders', (items) => items.map((current) => current.id === order.id ? { ...current, status: nextStatus } : current))
    notify('Pedido atualizado')
  }
  return <>
    <PageIntro eyebrow="ORGANIZAÇÃO" title={`Pedidos (${data.orders.length})`} action={() => setModal({ type: 'order' })} actionLabel="Novo" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar pedido ou cliente..." />
    <div className="filter-tabs">
      {[['all', 'Todos'], ['confirmed', 'Confirmados'], ['producing', 'Produção'], ['delivered', 'Entregues'], ['receivable', 'A receber']].map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    {orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} clients={data.clients} onOpen={() => setModal({ type: 'order', item: order })} onStatus={() => cycleStatus(order)} onPayment={() => setModal({ type: 'payments', item: order })} />) : <Empty icon="📦" title="Nada por aqui" text="Nenhum pedido corresponde a esta seleção." action={() => setModal({ type: 'order' })} actionLabel="Novo pedido" />}
  </>
}

function OrderCard({ order, clients, onOpen, onStatus, onPayment }) {
  const client = clients.find((c) => c.id === order.clientId)
  const remains = Math.max(0, Number(order.value || 0) - paidAmount(order))
  const currentPaymentState = paymentState(order)
  const productionMaterials = order.production?.materials?.length || 0
  const stockDeducted = !!order.production?.stockDeductedAt
  return <article className="list-card order-card" onClick={onOpen}>
    <div className="item-icon">{order.status === 'delivered' ? '🎁' : '🧶'}</div>
    <div className="item-copy"><strong>{order.title}</strong><span><UserRound />{client?.name || 'Sem cliente'}</span><small>📅 {dateBR(order.date)} · {money(order.value)}{productionMaterials > 0 ? ` · 🧵 ${productionMaterials} ${productionMaterials === 1 ? 'material' : 'materiais'}` : ''}{stockDeducted ? ' · ✓ baixado' : ''}</small>{remains > 0 && <em>Falta {money(remains)}</em>}</div>
    <div className="badges"><button onClick={(e) => { e.stopPropagation(); onStatus?.() }} className={`badge ${order.status}`}>{statusLabel[order.status]}</button><button onClick={(e) => { e.stopPropagation(); onPayment?.() }} className={`badge ${currentPaymentState}`}>{paymentText(order)}</button></div>
  </article>
}

function ClientsScreen({ data, setModal, search, setSearch }) {
  const clients = data.clients.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <PageIntro eyebrow="RELACIONAMENTO" title={`Clientes (${data.clients.length})`} action={() => setModal({ type: 'client' })} actionLabel="Nova" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar cliente..." />
    {clients.length ? clients.map((client) => {
      const orders = data.orders.filter((o) => o.clientId === client.id)
      const total = orders.reduce((sum, o) => sum + Number(o.value || 0), 0)
      return <article className="list-card" key={client.id} onClick={() => setModal({ type: 'clientDetails', item: client })}><div className="avatar">{client.name[0]?.toUpperCase()}</div><div className="item-copy"><strong>{client.name}</strong><span>{client.phone || 'Sem telefone'}</span><small>{orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}</small></div><b className="card-value">{money(total)}</b><ChevronRight className="chevron" /></article>
    }) : <Empty icon="👥" title="Sua lista está vazia" text="Cadastre clientes para reunir contatos e histórico de pedidos." action={() => setModal({ type: 'client' })} actionLabel="Nova cliente" />}
  </>
}

function InventoryScreen({ data, setModal, search, setSearch }) {
  const materials = data.materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
  const low = materials.filter((m) => Number(m.quantity) <= Number(m.minimum))
  const regular = materials.filter((m) => Number(m.quantity) > Number(m.minimum))
  const cards = (items) => items.map((material) => {
    const percent = Math.min(100, Math.round((Number(material.quantity) / Math.max(Number(material.minimum) * 2, Number(material.quantity), 1)) * 100))
    return <article className="list-card" key={material.id} onClick={() => setModal({ type: 'material', item: material })}><div className="item-icon">🧶</div><div className="item-copy"><strong>{material.name}</strong><span>{material.quantity} {material.unit} · {money(material.cost)} por {material.unit}</span>{Number(material.quantity) <= Number(material.minimum) && <em>⚠ Abaixo do mínimo</em>}</div><div className="stock"><b>{percent}%</b><i><span style={{ width: `${percent}%` }} /></i></div></article>
  })
  return <>
    <PageIntro eyebrow="MATERIAIS" title="Meu estoque" action={() => setModal({ type: 'material' })} actionLabel="Novo" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar material..." />
    {low.length > 0 && <><div className="section-heading compact"><h2>⚠️ Estoque baixo ({low.length})</h2></div>{cards(low)}</>}
    {regular.length > 0 && <><div className="section-heading compact"><h2>Todos os materiais</h2></div>{cards(regular)}</>}
    {!materials.length && <Empty icon="🧶" title="Estoque vazio" text="Cadastre linhas, tecidos, embalagens e outros materiais." action={() => setModal({ type: 'material' })} actionLabel="Novo material" />}
  </>
}

function FinanceScreen({ data, setModal }) {
  const [offset, setOffset] = useState(0)
  const selected = new Date(); selected.setMonth(selected.getMonth() + offset)
  const key = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}`
  const label = selected.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const orders = data.orders.filter((o) => o.date?.startsWith(key))
  const expenses = data.expenses.filter((e) => e.date?.startsWith(key))
  const revenue = orders.reduce((sum, o) => sum + Number(o.value || 0), 0)
  const spent = expenses.reduce((sum, e) => sum + Number(e.value || 0), 0)
  const receivable = orders.reduce((sum, order) => sum + Math.max(0, Number(order.value || 0) - paidAmount(order)), 0)
  return <>
    <PageIntro eyebrow="RESULTADOS" title="Financeiro" action={() => setModal({ type: 'expense' })} actionLabel="Gasto" />
    <div className="month-picker"><button onClick={() => setOffset(offset - 1)}>‹</button><strong>{label}</strong><button disabled={offset === 0} onClick={() => setOffset(Math.min(0, offset + 1))}>›</button></div>
    <section className="finance-banner"><span>💰 LUCRO ESTIMADO</span><strong>{money(revenue - spent)}</strong><small>Receita {money(revenue)} − Gastos {money(spent)}</small></section>
    <div className="stats-grid finance-stats"><Stat icon={<Download />} value={money(revenue)} label="Receita" tone="green" /><Stat icon={<Upload />} value={money(spent)} label="Gastos" tone="red" /><Stat icon={<Package />} value={orders.length} label="Pedidos" tone="plain" /><Stat icon={<CircleDollarSign />} value={money(receivable)} label="A receber" tone="pink" /></div>
    <div className="section-heading compact"><h2>Gastos do mês</h2></div>
    {expenses.length ? expenses.map((expense) => <article key={expense.id} className="list-card" onClick={() => setModal({ type: 'expense', item: expense })}><div className="item-icon">🧾</div><div className="item-copy"><strong>{expense.description}</strong><span>{dateBR(expense.date)}</span></div><b className="negative">− {money(expense.value)}</b></article>) : <Empty icon="🧾" title="Nenhum gasto registrado" text="Registre os gastos para visualizar seu lucro real." action={() => setModal({ type: 'expense' })} actionLabel="Registrar gasto" />}
  </>
}

function CalendarScreen({ data, setModal, notify }) {
  const now = new Date()
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today())
  const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const leadingDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  const activeOrders = data.orders.filter((order) => order.status !== 'delivered' && order.date)
  const overdue = activeOrders.filter((order) => order.date < today()).sort((a, b) => a.date.localeCompare(b.date))
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekKey = localDateKey(nextWeek)
  const upcoming = activeOrders.filter((order) => order.date >= today() && order.date <= nextWeekKey)
  const monthOrders = data.orders.filter((order) => order.date?.startsWith(monthKey))
  const selectedOrders = data.orders.filter((order) => order.date === selectedDate)
  const clientFor = (order) => data.clients.find((client) => client.id === order.clientId)

  const changeMonth = (amount) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + amount, 1)
    setViewDate(next)
    setSelectedDate(next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth() ? today() : localDateKey(next))
  }
  const goToDate = (date) => {
    const parsed = new Date(`${date}T12:00:00`)
    setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
    setSelectedDate(date)
  }
  const addToCalendar = async (order) => {
    try {
      const result = await shareOrderCalendar(order, clientFor(order), data.profile)
      if (result === 'downloaded') notify('Lembrete de calendário baixado')
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Não foi possível criar o lembrete')
    }
  }

  const agendaOrder = (order, showDate = false) => <article className={`agenda-order ${order.date < today() && order.status !== 'delivered' ? 'overdue' : ''}`} key={order.id} onClick={() => setModal({ type: 'order', item: order })}><div className="agenda-order-date"><b>{showDate ? new Date(`${order.date}T12:00:00`).getDate() : '📦'}</b><small>{showDate ? new Date(`${order.date}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : statusLabel[order.status]}</small></div><span><b>{order.title}</b><small>{clientFor(order)?.name || 'Sem cliente'} · {money(order.value)}</small></span><button type="button" aria-label="Adicionar ao Calendário do iPhone" onClick={(event) => { event.stopPropagation(); addToCalendar(order) }}><CalendarDays /></button></article>

  return <><PageIntro eyebrow="PRAZOS E LEMBRETES" title="Agenda" />{overdue.length > 0 && <button className="agenda-alert" onClick={() => goToDate(overdue[0].date)}><span>⚠️</span><div><b>{overdue.length} {overdue.length === 1 ? 'entrega atrasada' : 'entregas atrasadas'}</b><small>Toque para visualizar a mais antiga</small></div><ChevronRight /></button>}<div className="agenda-stats"><div><b>{monthOrders.length}</b><small>Neste mês</small></div><div><b>{upcoming.length}</b><small>Próximos 7 dias</small></div><div className={overdue.length ? 'warning' : ''}><b>{overdue.length}</b><small>Atrasados</small></div></div><section className="calendar-card"><div className="calendar-header"><button onClick={() => changeMonth(-1)}>‹</button><strong>{monthLabel}</strong><button onClick={() => changeMonth(1)}>›</button></div><div className="calendar-weekdays">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: leadingDays }).map((_, index) => <i key={`empty-${index}`} />)}{Array.from({ length: daysInMonth }).map((_, index) => { const day = index + 1; const date = `${monthKey}-${String(day).padStart(2, '0')}`; const dayOrders = data.orders.filter((order) => order.date === date); const hasOpen = dayOrders.some((order) => order.status !== 'delivered'); return <button key={date} className={`${selectedDate === date ? 'selected ' : ''}${today() === date ? 'today ' : ''}${dayOrders.length ? 'has-orders' : ''}`} onClick={() => setSelectedDate(date)}><span>{day}</span>{dayOrders.length > 0 && <i className={hasOpen ? 'open' : 'done'}>{dayOrders.length}</i>}</button> })}</div><button className="calendar-today" onClick={() => goToDate(today())}>Voltar para hoje</button></section><div className="section-heading compact"><div><span className="eyebrow">DIA SELECIONADO</span><h2>{dateBR(selectedDate)}</h2></div></div>{selectedOrders.length ? selectedOrders.map((order) => agendaOrder(order)) : <div className="agenda-empty">Nenhuma entrega para esta data.</div>}{upcoming.length > 0 && <><div className="section-heading compact agenda-next-heading"><div><span className="eyebrow">LEMBRETES</span><h2>Próximos 7 dias</h2></div></div>{upcoming.filter((order) => order.date !== selectedDate).sort((a, b) => a.date.localeCompare(b.date)).map((order) => agendaOrder(order, true))}</>}</>
}

function CalculatorScreen({ data, update, setModal }) {
  const draft = useRef((() => { try { return JSON.parse(localStorage.getItem('meu-atelie-calculator-draft')) || {} } catch { return {} } })()).current
  const [values, setValues] = useState(draft.values || { hours: '4', hourly: '20', fixed: '12', margin: '30' })
  const [usedMaterials, setUsedMaterials] = useState(draft.materials || [])
  const [materialSearch, setMaterialSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [useMode, setUseMode] = useState('unit')
  const [amount, setAmount] = useState('1')
  const [message, setMessage] = useState('')

  const selected = data.materials.find((material) => material.id === selectedId)
  const filteredMaterials = data.materials.filter((material) => material.name.toLowerCase().includes(materialSearch.toLowerCase()))
  const canUseWeight = selected && (['g', 'kg'].includes(selected.unit) || Number(selected.packageWeight) > 0)
  const n = (key) => Number(values[key] || 0)
  const materialCost = usedMaterials.reduce((sum, material) => sum + material.calculatedCost, 0)
  const laborCost = n('hours') * n('hourly')
  const totalCost = materialCost + laborCost + n('fixed')
  const price = totalCost / Math.max(.2, 1 - n('margin') / 100)
  const profit = Math.max(0, price - totalCost)
  const change = (key) => (event) => setValues({ ...values, [key]: event.target.value })

  useEffect(() => {
    try { localStorage.setItem('meu-atelie-calculator-draft', JSON.stringify({ values, materials: usedMaterials })) } catch {}
  }, [values, usedMaterials])

  const selectMaterial = (id) => {
    const material = data.materials.find((item) => item.id === id)
    setSelectedId(id)
    setUseMode(['g', 'kg'].includes(material?.unit) ? 'weight' : 'unit')
    setAmount('1')
  }

  const calculateMaterialCost = (material, quantity, mode) => {
    if (mode === 'unit') return quantity * Number(material.cost || 0)
    if (material.unit === 'kg') return quantity * Number(material.cost || 0) / 1000
    if (material.unit === 'g') return quantity * Number(material.cost || 0)
    return quantity * Number(material.cost || 0) / Math.max(1, Number(material.packageWeight || 1))
  }

  const addMaterial = (material = selected, quantity = Number(amount), mode = useMode) => {
    if (!material || !quantity || quantity <= 0) { setMessage('Selecione um material e informe a quantidade.'); return }
    const actualMode = mode === 'weight' && (['g', 'kg'].includes(material.unit) || Number(material.packageWeight) > 0) ? 'weight' : 'unit'
    const stockQuantity = actualMode === 'weight'
      ? material.unit === 'kg' ? quantity / 1000 : material.unit === 'g' ? quantity : quantity / Math.max(1, Number(material.packageWeight || 1))
      : quantity
    setUsedMaterials((items) => [...items, {
      entryId: uid(), materialId: material.id, name: material.name, amount: quantity,
      mode: actualMode, displayUnit: actualMode === 'weight' ? 'g' : material.unit,
      stockQuantity, stockUnit: material.unit,
      calculatedCost: calculateMaterialCost(material, quantity, actualMode),
    }])
    setSelectedId(''); setAmount('1'); setUseMode('unit'); setMaterialSearch('')
    setMessage('✅ Adicionado! Selecione outro para continuar.')
    window.setTimeout(() => setMessage(''), 2600)
  }

  const addManual = (material) => {
    update('materials', (items) => [material, ...items])
    addMaterial(material, Number(material.manualAmount || 1), material.manualMode || 'unit')
  }

  return <>
    <section className="calculator-result calculator-hero"><span>💡 PREÇO SUGERIDO</span><strong>{money(price)}</strong><small>Custo: {money(totalCost)} · Margem: {values.margin}%</small></section>

    <div className="calc-section-heading"><div><b>🧶 Materiais</b><small>(adicione quantos precisar)</small></div><button onClick={() => setModal({ type: 'calcManual', onAdd: addManual })}>+ Manual</button></div>
    <div className="calc-materials-list">
      {usedMaterials.length ? usedMaterials.map((material) => <div className="calc-material-chip" key={material.entryId}><strong>{material.name}</strong><span>{material.amount} {material.mode === 'weight' ? 'g' : 'un.'} · {money(material.calculatedCost)}</span><button onClick={() => setUsedMaterials((items) => items.filter((item) => item.entryId !== material.entryId))}><X /></button></div>) : <p>Nenhum material adicionado ainda</p>}
    </div>

    <div className="calc-add-title">✚ Adicionar material do estoque:</div>
    <SearchBox value={materialSearch} onChange={setMaterialSearch} placeholder="Buscar material..." />
    <div className="calc-picker">
      <select value={selectedId} onChange={(event) => selectMaterial(event.target.value)}><option value="">Selecionar material...</option>{filteredMaterials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.quantity} {material.unit})</option>)}</select>
      <label><input aria-label={useMode === 'weight' ? 'Peso em gramas' : 'Quantidade'} type="number" min="0" step={useMode === 'weight' ? '1' : '.01'} value={amount} onChange={(event) => setAmount(event.target.value)} /><span>{useMode === 'weight' ? 'g' : 'Qtd'}</span></label>
      <button onClick={() => addMaterial()}><Plus /></button>
    </div>
    {selected && canUseWeight && <div className="calc-type-toggle"><button className={useMode === 'unit' ? 'active' : ''} onClick={() => { setUseMode('unit'); setAmount('1') }}>Por unidade</button><button className={useMode === 'weight' ? 'active' : ''} onClick={() => { setUseMode('weight'); setAmount('100') }}>Por peso (g)</button></div>}
    {!data.materials.length && <button className="calc-empty-stock" onClick={() => setModal({ type: 'calcManual', onAdd: addManual })}>Seu estoque está vazio — adicionar material manualmente</button>}

    <div className="calc-section-heading labor"><div><b>⏱️ Mão de obra</b></div><button onClick={() => setModal({ type: 'calcCosts', hourly: values.hourly, fixed: values.fixed, onSave: (costs) => setValues((current) => ({ ...current, ...costs })) })}>✎ Alterar valores</button></div>
    <div className="calc-value-table inputs">
      <label><span>Horas trabalhadas</span><input inputMode="decimal" type="number" min="0" step=".25" value={values.hours} onChange={change('hours')} /></label>
      <div><span>Valor por hora</span><b>{money(values.hourly)}</b></div>
      <div><span>Custos fixos</span><b>{money(values.fixed)}</b></div>
    </div>

    <div className="calc-section-heading margin"><div><b>📊 Margem: <em>{values.margin}%</em></b></div></div>
    <label className="calc-slider"><input type="range" min="0" max="80" value={values.margin} style={{ '--range': `${values.margin / .8}%` }} onChange={change('margin')} /><span><small>0%</small><small>80%</small></span></label>

    {message && <div className="calc-message">{message}</div>}
    <div className="calc-value-table summary">
      <div><span>Materiais</span><b>{money(materialCost)}</b></div>
      <div><span>Mão de obra</span><b>{money(laborCost)}</b></div>
      <div><span>Custos fixos</span><b>{money(n('fixed'))}</b></div>
      <div><span>Custo total</span><b>{money(totalCost)}</b></div>
      <div><span>Margem ({values.margin}%)</span><b className="positive">+ {money(profit)}</b></div>
      <div className="total"><span>Preço sugerido</span><b>{money(price)}</b></div>
    </div>
    <button className="primary calc-quote" disabled={!price} onClick={() => setModal({ type: 'quote', suggestion: price, costing: { materials: usedMaterials, materialCost, hours: n('hours'), hourly: n('hourly'), laborCost, fixed: n('fixed'), totalCost, margin: n('margin') } })}><FileText />Criar orçamento com este preço</button>
  </>
}

function CatalogScreen({ data, setModal, search, setSearch }) {
  const items = data.catalog.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  return <>
    <PageIntro eyebrow="SUAS CRIAÇÕES" title="Catálogo" action={() => setModal({ type: 'catalogItem' })} actionLabel="Nova" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar peça..." />
    {items.length ? <div className="catalog-grid">{items.map((item) => <article key={item.id} className="catalog-card" onClick={() => setModal({ type: 'catalogItem', item })}>{item.photo ? <img src={item.photo} alt="" /> : <div className="catalog-placeholder">🧵</div>}<div><strong>{item.name}</strong><span>{item.category || 'Artesanato'}</span><b>{money(item.price)}</b></div></article>)}</div> : <Empty icon="🛍️" title="Seu catálogo está vazio" text="Salve suas peças com foto e preço para consultar depois." action={() => setModal({ type: 'catalogItem' })} actionLabel="Nova peça" />}
  </>
}

function QuotesScreen({ data, setModal, search, setSearch, notify }) {
  const items = data.quotes.filter((q) => `${q.title} ${q.client}`.toLowerCase().includes(search.toLowerCase()))
  const share = (quote) => { notify('Abrindo WhatsApp'); window.location.href = whatsAppUrl(quote, data) }
  return <>
    <PageIntro eyebrow="PROPOSTAS" title={`Orçamentos (${data.quotes.length})`} action={() => setModal({ type: 'quote' })} actionLabel="Novo" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar orçamento..." />
    {items.length ? items.map((quote) => <article className="list-card" key={quote.id} onClick={() => setModal({ type: 'quote', item: quote })}><div className="item-icon">📋</div><div className="item-copy"><strong>{quote.title}</strong><span>{quote.client || 'Sem cliente'} · válido até {dateBR(quote.validUntil)}</span><small>{quote.orderId ? '📦 Pedido criado' : quote.approved ? '✅ Aprovado · abra para criar o pedido' : 'Aguardando resposta'}</small></div><b className="card-value">{money(quote.value)}</b><button className="icon-button" aria-label="Compartilhar orçamento" onClick={(e) => { e.stopPropagation(); share(quote) }}><Share2 /></button></article>) : <Empty icon="📋" title="Nenhum orçamento" text="Crie uma proposta e compartilhe diretamente pelo iPhone." action={() => setModal({ type: 'quote' })} actionLabel="Novo orçamento" />}
  </>
}

function SettingsScreen({ data, setData, saveProfile, notify }) {
  const fileRef = useRef()
  const photoRef = useRef()
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `meu-atelie-${today()}.json`; link.click(); URL.revokeObjectURL(link.href)
  }
  const importData = (event) => {
    const file = event.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => { try { const restored = JSON.parse(reader.result); setData({ ...initialData, ...restored, profile: { ...initialData.profile, ...restored.profile } }); notify('Backup restaurado') } catch { notify('Arquivo inválido') } }; reader.readAsText(file)
  }
  const pickProfilePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      saveProfile({ photo: await compressPhoto(file, 500) })
      notify('Foto de perfil atualizada')
    } catch { notify('Não foi possível ler a foto') }
    event.target.value = ''
  }
  const reset = () => { if (confirm('Apagar todos os dados deste aparelho? Esta ação não pode ser desfeita.')) setData({ ...initialData, profile: { ...initialData.profile, onboarded: false } }) }
  return <>
    <PageIntro eyebrow="PREFERÊNCIAS" title="Configurações" />
    <div className="settings-group"><h3>Meu perfil</h3><div className="profile-photo-setting"><button className="profile-photo" onClick={() => photoRef.current.click()}><span className="profile-photo-frame">{data.profile.photo ? <img src={data.profile.photo} alt="Foto de perfil" /> : <b>{data.profile.name?.[0]?.toUpperCase() || <UserRound />}</b>}</span><i><Camera /></i></button><div><b>{data.profile.photo ? 'Trocar foto' : 'Adicionar foto'}</b><small>Toque na imagem para escolher da galeria</small>{data.profile.photo && <button onClick={() => { saveProfile({ photo: '' }); notify('Foto removida') }}>Remover foto</button>}</div><input ref={photoRef} hidden type="file" accept="image/*" onChange={pickProfilePhoto} /></div><label><span>Seu nome</span><input value={data.profile.name} onChange={(e) => saveProfile({ name: e.target.value })} /></label><label><span>Nome do ateliê</span><input value={data.profile.studio} onChange={(e) => saveProfile({ studio: e.target.value })} /></label></div>
    <div className="settings-group"><h3>Dados dos orçamentos</h3><label><span>WhatsApp do ateliê</span><input type="tel" value={data.profile.businessPhone || ''} onChange={(e) => saveProfile({ businessPhone: e.target.value })} placeholder="(85) 99999-9999" /></label><label><span>Chave PIX</span><input value={data.profile.pixKey || ''} onChange={(e) => saveProfile({ pixKey: e.target.value })} placeholder="CPF, telefone, e-mail ou chave aleatória" /></label><label><span>Formas de pagamento</span><input value={data.profile.paymentOptions || ''} onChange={(e) => saveProfile({ paymentOptions: e.target.value })} placeholder="PIX, espécie, débito ou crédito" /></label><label><span>Observação sobre cartão</span><input value={data.profile.cardPaymentNote || ''} onChange={(e) => saveProfile({ cardPaymentNote: e.target.value })} placeholder="Cartão com acréscimo da máquina" /></label><label><span>Retirada ou entrega</span><input value={data.profile.deliveryMessage || ''} onChange={(e) => saveProfile({ deliveryMessage: e.target.value })} placeholder="Retirada ou entrega a combinar" /></label></div>
    <div className="settings-group"><h3>Aparência</h3><button className="settings-row" onClick={() => saveProfile({ dark: !data.profile.dark })}>{data.profile.dark ? <Moon /> : <Sun />}<span><b>Modo escuro</b><small>Mais confortável à noite</small></span><i className={data.profile.dark ? 'toggle on' : 'toggle'} /></button></div>
    <div className="settings-group"><h3>Instalar no iPhone</h3><div className="install-note"><Share2 /><p>No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p></div></div>
    <div className="settings-group"><h3>Backup local</h3><button className="settings-row" onClick={exportData}><Download /><span><b>Exportar dados</b><small>Salvar uma cópia em JSON</small></span><ChevronRight /></button><button className="settings-row" onClick={() => fileRef.current.click()}><Upload /><span><b>Restaurar backup</b><small>Importar uma cópia anterior</small></span><ChevronRight /></button><input ref={fileRef} hidden type="file" accept="application/json" onChange={importData} /></div>
    <button className="danger" onClick={reset}><Trash2 />Apagar todos os dados</button><p className="version">Meu Ateliê · Desenvolvido por Pablo Almeida</p>
  </>
}

function Modal({ children, onClose }) {
  useEffect(() => { const close = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal-sheet"><div className="modal-handle" /><button className="modal-close" onClick={onClose}><X /></button>{children}</section></div>
}

function renderModal(modal, props) {
  if (modal.type === 'quick') return <QuickModal {...props} />
  if (modal.type === 'more') return <MoreModal {...props} />
  if (modal.type === 'order') return <OrderForm {...props} item={modal.item} />
  if (modal.type === 'payments') return <PaymentsForm {...props} item={modal.item} />
  if (modal.type === 'production') return <ProductionForm {...props} item={modal.item} />
  if (modal.type === 'profit') return <OrderProfit {...props} item={modal.item} />
  if (modal.type === 'client') return <ClientForm {...props} item={modal.item} />
  if (modal.type === 'clientDetails') return <ClientDetails {...props} item={modal.item} />
  if (modal.type === 'material') return <MaterialForm {...props} item={modal.item} />
  if (modal.type === 'calcManual') return <CalcManualForm {...props} onAdd={modal.onAdd} />
  if (modal.type === 'calcCosts') return <CalcCostsForm {...props} hourly={modal.hourly} fixed={modal.fixed} onSave={modal.onSave} />
  if (modal.type === 'expense') return <ExpenseForm {...props} item={modal.item} />
  if (modal.type === 'catalogItem') return <CatalogForm {...props} item={modal.item} />
  if (modal.type === 'quote') return <QuoteForm {...props} item={modal.item} suggestion={modal.suggestion} costing={modal.costing} />
}

function QuickModal({ setModal }) {
  return <><ModalTitle icon="✨" title="Adicionar" sub="O que você quer cadastrar?" /><div className="modal-grid"><button onClick={() => setModal({ type: 'order' })}>📦<span><b>Novo pedido</b><small>Prazo e pagamento</small></span></button><button onClick={() => setModal({ type: 'client' })}>👥<span><b>Nova cliente</b><small>Contato e histórico</small></span></button><button onClick={() => setModal({ type: 'material' })}>🧶<span><b>Novo material</b><small>Atualizar estoque</small></span></button><button onClick={() => setModal({ type: 'expense' })}>🧾<span><b>Novo gasto</b><small>Controle financeiro</small></span></button></div></>
}

function MoreModal({ navigate }) {
  return <><ModalTitle icon="🧶" title="Mais opções" sub="Tudo para cuidar do seu ateliê." /><div className="more-list">{[['calendar', '📅', 'Agenda', 'Entregas e lembretes'], ['inventory', '🧶', 'Estoque', 'Materiais e reposição'], ['finance', '💰', 'Financeiro', 'Receita, gastos e lucro'], ['calculator', '🧮', 'Calculadora', 'Descubra o preço justo'], ['quotes', '📋', 'Orçamentos', 'Crie e compartilhe propostas'], ['catalog', '🛍️', 'Catálogo', 'Suas peças e preços'], ['settings', '⚙️', 'Configurações', 'Tema, instalação e backup']].map(([key, icon, title, sub]) => <button key={key} onClick={() => navigate(key)}><i>{icon}</i><span><b>{title}</b><small>{sub}</small></span><ChevronRight /></button>)}</div></>
}

function ModalTitle({ icon, title, sub }) { return <div className="modal-title"><i>{icon}</i><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div></div> }

function Field({ label, prefix, suffix, as = 'input', children, ...props }) {
  const Element = as
  return <label className={`field ${as === 'textarea' ? 'textarea-field' : ''}`}><span>{label}</span><div>{prefix && <i>{prefix}</i>}<Element {...props}>{children}</Element>{suffix && <i>{suffix}</i>}</div></label>
}

function FormActions({ editing, onDelete }) {
  return <div className="form-actions"><button className="primary" type="submit"><Check />{editing ? 'Salvar alterações' : 'Cadastrar'}</button>{editing && <button type="button" className="danger" onClick={onDelete}><Trash2 />Excluir</button>}</div>
}

function OrderForm({ data, update, setData, setModal, notify, item }) {
  const addToCalendar = async () => {
    if (!item?.date) { notify('Defina um prazo antes de criar o lembrete'); return }
    try {
      const result = await shareOrderCalendar(item, data.clients.find((client) => client.id === item.clientId), data.profile)
      if (result === 'downloaded') notify('Lembrete de calendário baixado')
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Não foi possível criar o lembrete')
    }
  }
  const save = (event) => {
    event.preventDefault()
    const f = Object.fromEntries(new FormData(event.currentTarget))
    const record = { ...item, id: item?.id || uid(), payment: item?.payment || 'open', payments: item?.payments || [], ...f, value: Number(f.value) }
    const shouldDeduct = item && record.status === 'producing' && item.status !== 'producing' && !item.production?.stockDeductedAt
    if (shouldDeduct && productionStockUsage(item).length) {
      const shortages = stockShortages(item, data.materials)
      if (shortages.length) { alert(`Não foi possível iniciar a produção. Estoque insuficiente: ${shortages.map((material) => material.name).join(', ')}.`); return }
      if (!confirm('Iniciar a produção e baixar os materiais vinculados do estoque?')) return
      setData((old) => deductOrderStock(old, item, record))
      setModal(null)
      notify('Produção iniciada e estoque atualizado')
      return
    }
    update('orders', (items) => item ? items.map((order) => order.id === item.id ? record : order) : [record, ...items])
    setModal(null)
    notify(item ? (shouldDeduct ? 'Pedido atualizado · ficha sem materiais' : 'Pedido atualizado') : 'Pedido cadastrado')
  }
  const remove = () => { if (confirm('Excluir este pedido?')) { setData((old) => ({ ...old, orders: old.orders.filter((o) => o.id !== item.id), quotes: old.quotes.map((quote) => quote.orderId === item.id ? { ...quote, orderId: '' } : quote) })); setModal(null); notify('Pedido excluído') } }
  return <form onSubmit={save}><ModalTitle icon="📦" title={item ? 'Editar pedido' : 'Novo pedido'} sub="Registre uma vez e acompanhe até a entrega." /><Field label="Nome da peça" name="title" defaultValue={item?.title} placeholder="Ex.: Bolsa de crochê" required /><Field as="select" label="Cliente" name="clientId" defaultValue={item?.clientId || ''}><option value="">Sem cliente</option>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Field><div className="form-row"><Field label="Prazo" name="date" type="date" defaultValue={item?.date || today()} /><Field label="Valor" name="value" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.value} required /></div><Field as="select" label="Status" name="status" defaultValue={item?.status || 'confirmed'}>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field><Field label="Observações" name="notes" defaultValue={item?.notes} placeholder="Cores, medidas, detalhes..." />{item && <div className="order-tools"><button className="production-open calendar-open" type="button" onClick={addToCalendar}><CalendarDays /><span><b>Adicionar ao Calendário</b><small>Lembrete no iPhone um dia antes</small></span><ChevronRight /></button><button className="production-open" type="button" onClick={() => setModal({ type: 'production', item })}><ClipboardList /><span><b>Ficha de produção</b><small>{item.production?.materials?.length ? `${item.production.materials.length} materiais vinculados` : 'Foto, medidas, materiais e etapas'}</small></span><ChevronRight /></button><button className="production-open profit-open" type="button" onClick={() => setModal({ type: 'profit', item })}><WalletCards /><span><b>Resultado do pedido</b><small>Custos, margem e lucro real</small></span><ChevronRight /></button></div>}<FormActions editing={!!item} onDelete={remove} /></form>
}

function PaymentsForm({ data, update, setModal, notify, item }) {
  const order = data.orders.find((current) => current.id === item.id) || item
  const payments = orderPayments(order)
  const received = paidAmount(order)
  const remaining = Math.max(0, Number(order.value || 0) - received)
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2) : '')
  const [paymentDate, setPaymentDate] = useState(today())
  const [method, setMethod] = useState('pix')
  const [notes, setNotes] = useState('')

  const addPayment = (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) { notify('Informe um valor válido'); return }
    if (value > remaining + .005) { notify(`O saldo restante é ${money(remaining)}`); return }
    update('orders', (orders) => orders.map((current) => {
      if (current.id !== order.id) return current
      const nextPayments = [...orderPayments(current), { id: uid(), value, date: paymentDate, method, notes: notes.trim() }]
      const nextOrder = { ...current, payments: nextPayments }
      return { ...nextOrder, payment: paymentState(nextOrder) }
    }))
    setAmount('')
    setNotes('')
    notify(value + .005 >= remaining ? 'Pedido totalmente pago' : 'Pagamento registrado')
  }

  const removePayment = (payment) => {
    if (!confirm(`Excluir o pagamento de ${money(payment.value)}?`)) return
    update('orders', (orders) => orders.map((current) => {
      if (current.id !== order.id) return current
      const nextPayments = orderPayments(current).filter((entry) => entry.id !== payment.id)
      const nextOrder = { ...current, payments: nextPayments }
      return { ...nextOrder, payment: paymentState(nextOrder) }
    }))
    notify('Pagamento excluído')
  }

  return <><ModalTitle icon="💳" title="Pagamentos" sub={`${order.title} · ${money(order.value)}`} /><div className="payment-summary"><div><span>Recebido</span><b>{money(received)}</b></div><div><span>Falta receber</span><b className={remaining > 0 ? 'pending-value' : 'paid-value'}>{money(remaining)}</b></div><i><span style={{ width: `${Math.min(100, Number(order.value) > 0 ? received / Number(order.value) * 100 : 0)}%` }} /></i></div>{payments.length > 0 && <div className="payment-history"><h3>Histórico</h3>{payments.map((payment) => <div className="payment-entry" key={payment.id}><span><b>{money(payment.value)}</b><small>{payment.date ? dateBR(payment.date) : 'Data não informada'} · {paymentMethodLabel[payment.method] || 'Outro'}{payment.notes ? ` · ${payment.notes}` : ''}</small></span><button type="button" aria-label="Excluir pagamento" onClick={() => removePayment(payment)}><Trash2 /></button></div>)}</div>}{remaining > 0 ? <form className="payment-form" onSubmit={addPayment}><h3>Novo recebimento</h3><div className="form-row"><Field label="Valor" type="number" min="0.01" max={remaining.toFixed(2)} step="0.01" inputMode="decimal" prefix="R$" value={amount} onChange={(event) => setAmount(event.target.value)} required /><Field label="Data" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></div><Field as="select" label="Forma de pagamento" value={method} onChange={(event) => setMethod(event.target.value)}>{Object.entries(paymentMethodLabel).filter(([key]) => key !== 'previous').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Field><Field label="Observação" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: Primeira parcela" /><button className="primary" type="submit"><CircleDollarSign />Registrar pagamento</button></form> : <div className="payment-complete"><Check />Pagamento concluído</div>}<button className="payment-close" type="button" onClick={() => setModal(null)}>Fechar</button></>
}

function OrderProfit({ data, setModal, item }) {
  const order = data.orders.find((current) => current.id === item.id) || item
  const costs = orderCostSummary(order)
  const received = paidAmount(order)
  const remaining = Math.max(0, costs.revenue - received)
  const cashResult = received - costs.totalCost
  const fullyPaid = remaining <= .005
  return <><ModalTitle icon="💰" title="Resultado do pedido" sub={order.title} /><section className={`order-profit-hero ${costs.profit < 0 ? 'loss' : ''}`}><span>{fullyPaid ? 'LUCRO REAL' : 'LUCRO PREVISTO'}</span><strong>{money(costs.profit)}</strong><small>Margem de {costs.margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% sobre o valor do pedido</small></section><div className="profit-breakdown"><div><span>Valor do pedido</span><b>{money(costs.revenue)}</b></div><div><span>Materiais</span><b>− {money(costs.materialCost)}</b></div><div><span>Mão de obra</span><b>− {money(costs.laborCost)}</b></div><div><span>Outros custos</span><b>− {money(costs.otherCosts)}</b></div><div className="profit-total"><span>Custo total</span><b>{money(costs.totalCost)}</b></div></div><div className="profit-cash"><div><span>Recebido até agora</span><b>{money(received)}</b></div><div><span>Falta receber</span><b>{money(remaining)}</b></div><div><span>Caixa após os custos</span><b className={cashResult >= 0 ? 'positive' : 'negative'}>{money(cashResult)}</b></div></div>{costs.totalCost <= 0 && <p className="profit-warning">Preencha materiais, horas e outros custos na ficha de produção para obter o lucro real.</p>}<button className="production-open profit-edit" type="button" onClick={() => setModal({ type: 'production', item: order })}><ClipboardList /><span><b>Editar custos de produção</b><small>Materiais, horas e custos adicionais</small></span><ChevronRight /></button><button className="payment-close" type="button" onClick={() => setModal(null)}>Fechar</button></>
}

function ProductionForm({ data, update, setData, setModal, notify, item }) {
  const order = data.orders.find((current) => current.id === item.id) || item
  const saved = order.production || {}
  const stockDeducted = !!saved.stockDeductedAt
  const [photo, setPhoto] = useState(saved.photo || '')
  const [colors, setColors] = useState(saved.colors || '')
  const [measurements, setMeasurements] = useState(saved.measurements || '')
  const [instructions, setInstructions] = useState(saved.instructions || '')
  const [materials, setMaterials] = useState(Array.isArray(saved.materials) ? saved.materials : order.costing?.materials || [])
  const [checks, setChecks] = useState(saved.checks || {})
  const [hours, setHours] = useState(String(saved.hours ?? order.costing?.hours ?? 0))
  const [hourly, setHourly] = useState(String(saved.hourly ?? order.costing?.hourly ?? 0))
  const [otherCosts, setOtherCosts] = useState(String(saved.otherCosts ?? order.costing?.fixed ?? 0))
  const [selectedId, setSelectedId] = useState('')
  const [amount, setAmount] = useState('1')
  const [useMode, setUseMode] = useState('unit')
  const photoRef = useRef()
  const selected = data.materials.find((material) => material.id === selectedId)
  const canUseWeight = selected && (['g', 'kg'].includes(selected.unit) || Number(selected.packageWeight) > 0)
  const materialCost = materials.reduce((sum, material) => sum + Number(material.calculatedCost || 0), 0)
  const laborCost = Number(hours || 0) * Number(hourly || 0)
  const productionCost = materialCost + laborCost + Number(otherCosts || 0)
  const estimatedProfit = Number(order.value || 0) - productionCost
  const stages = [['materials', 'Materiais separados'], ['making', 'Peça confeccionada'], ['finishing', 'Acabamento revisado'], ['packed', 'Pedido embalado']]

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try { setPhoto(await compressPhoto(file)) } catch { notify('Não foi possível ler a foto') }
    event.target.value = ''
  }

  const selectMaterial = (id) => {
    const material = data.materials.find((current) => current.id === id)
    setSelectedId(id)
    setUseMode(['g', 'kg'].includes(material?.unit) ? 'weight' : 'unit')
    setAmount(['g', 'kg'].includes(material?.unit) ? '100' : '1')
  }

  const addMaterial = () => {
    const quantity = Number(amount)
    if (!selected || !quantity || quantity <= 0) { notify('Selecione o material e a quantidade'); return }
    const mode = useMode === 'weight' && canUseWeight ? 'weight' : 'unit'
    const stockQuantity = mode === 'weight'
      ? selected.unit === 'kg' ? quantity / 1000 : selected.unit === 'g' ? quantity : quantity / Math.max(1, Number(selected.packageWeight || 1))
      : quantity
    setMaterials((current) => [...current, {
      entryId: uid(), materialId: selected.id, name: selected.name,
      amount: quantity, mode, displayUnit: mode === 'weight' ? 'g' : selected.unit,
      stockQuantity, stockUnit: selected.unit,
      calculatedCost: stockQuantity * Number(selected.cost || 0),
    }])
    setSelectedId('')
    setAmount('1')
    setUseMode('unit')
  }

  const save = () => {
    update('orders', (orders) => orders.map((current) => current.id === order.id ? {
      ...current,
      production: { ...current.production, photo, colors: colors.trim(), measurements: measurements.trim(), instructions: instructions.trim(), materials, checks, hours: Number(hours || 0), hourly: Number(hourly || 0), otherCosts: Number(otherCosts || 0) },
    } : current))
    setModal(null)
    notify('Ficha de produção salva')
  }

  const restoreStock = () => {
    const snapshot = saved.stockSnapshot || []
    if (!snapshot.length || !confirm('Devolver ao estoque todos os materiais baixados deste pedido?')) return
    setData((old) => {
      const inventory = [...old.materials]
      for (const usage of snapshot) {
        const index = inventory.findIndex((material) => material.id === usage.materialId)
        if (index >= 0) {
          const material = inventory[index]
          inventory[index] = { ...material, quantity: Number((Number(material.quantity || 0) + Number(usage.stockQuantity || 0)).toFixed(4)) }
        } else if (usage.material) {
          inventory.push({ ...usage.material, quantity: Number(usage.stockQuantity || 0) })
        }
      }
      const orders = old.orders.map((current) => current.id === order.id ? { ...current, status: current.status === 'producing' ? 'confirmed' : current.status, production: { ...current.production, stockDeductedAt: '', stockSnapshot: [], checks: { ...current.production?.checks, materials: false } } } : current)
      return { ...old, materials: inventory, orders }
    })
    setChecks((current) => ({ ...current, materials: false }))
    notify('Materiais devolvidos ao estoque')
  }

  return <><ModalTitle icon="🧵" title="Ficha de produção" sub={`${order.title} · entrega ${dateBR(order.date)}`} /><div className="production-photo"><button type="button" onClick={() => photoRef.current.click()}>{photo ? <img src={photo} alt="Referência do pedido" /> : <><Camera /><span>Adicionar foto de referência</span></>}</button>{photo && <button type="button" onClick={() => setPhoto('')}>Remover foto</button>}<input ref={photoRef} hidden type="file" accept="image/*" onChange={pickPhoto} /></div><div className="form-row"><Field label="Cores" value={colors} onChange={(event) => setColors(event.target.value)} placeholder="Ex.: Cru e rosé" /><Field label="Medidas" value={measurements} onChange={(event) => setMeasurements(event.target.value)} placeholder="Ex.: 30 × 40 cm" /></div><Field as="textarea" label="Instruções e detalhes" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Pontos, acabamento e detalhes combinados..." /><div className="production-section"><div className="production-heading"><span><b>Materiais</b><small>{materials.length} vinculados · custo {money(materialCost)}</small></span></div>{stockDeducted && <div className="stock-deducted-note"><Check /><span><b>Estoque baixado</b><small>Para alterar os materiais, devolva-os primeiro ao estoque.</small></span></div>}{materials.length > 0 && <div className="production-materials">{materials.map((material) => { const inventory = data.materials.find((current) => current.id === material.materialId); const totalRequired = materials.filter((entry) => entry.materialId === material.materialId).reduce((sum, entry) => sum + Number(entry.stockQuantity || 0), 0); const insufficient = !stockDeducted && inventory && totalRequired > Number(inventory.quantity); return <div className={insufficient ? 'production-material low' : 'production-material'} key={material.entryId}><span><b>{material.name}</b><small>{material.amount} {material.displayUnit} · {money(material.calculatedCost)}{insufficient ? ' · estoque insuficiente' : ''}</small></span>{!stockDeducted && <button type="button" aria-label="Remover material" onClick={() => setMaterials((current) => current.filter((entry) => entry.entryId !== material.entryId))}><X /></button>}</div> })}</div>}{!stockDeducted && <><div className="production-picker"><select value={selectedId} onChange={(event) => selectMaterial(event.target.value)}><option value="">Selecionar material do estoque...</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.quantity} {material.unit})</option>)}</select><label><input type="number" min="0.01" step={useMode === 'weight' ? '1' : '.01'} value={amount} onChange={(event) => setAmount(event.target.value)} /><span>{useMode === 'weight' ? 'g' : selected?.unit || 'Qtd'}</span></label><button type="button" onClick={addMaterial}><Plus /></button></div>{selected && canUseWeight && <div className="calc-type-toggle production-mode"><button type="button" className={useMode === 'unit' ? 'active' : ''} onClick={() => { setUseMode('unit'); setAmount('1') }}>Por {selected.unit}</button><button type="button" className={useMode === 'weight' ? 'active' : ''} onClick={() => { setUseMode('weight'); setAmount('100') }}>Por peso (g)</button></div>}{!data.materials.length && <p className="production-empty">Cadastre materiais no Estoque para vinculá-los ao pedido.</p>}</>}</div><div className="production-section"><div className="production-heading"><span><b>Custos de produção</b><small>Informe os valores reais deste pedido</small></span></div><div className="form-row"><Field label="Horas trabalhadas" type="number" min="0" step=".25" value={hours} onChange={(event) => setHours(event.target.value)} /><Field label="Valor por hora" type="number" min="0" step=".01" prefix="R$" value={hourly} onChange={(event) => setHourly(event.target.value)} /></div><Field label="Outros custos" type="number" min="0" step=".01" prefix="R$" value={otherCosts} onChange={(event) => setOtherCosts(event.target.value)} /><div className="production-cost-summary"><span>Custo total <b>{money(productionCost)}</b></span><span>Lucro do pedido <b className={estimatedProfit >= 0 ? 'positive' : 'negative'}>{money(estimatedProfit)}</b></span></div></div><div className="production-section"><div className="production-heading"><span><b>Etapas</b><small>Acompanhe o andamento desta peça</small></span></div><div className="production-checklist">{stages.map(([key, label]) => <button type="button" key={key} className={checks[key] ? 'done' : ''} aria-pressed={!!checks[key]} onClick={() => setChecks((current) => ({ ...current, [key]: !current[key] }))}><i>{checks[key] && <Check />}</i><span>{label}</span></button>)}</div></div>{stockDeducted && <button className="stock-restore" type="button" onClick={restoreStock}><Upload />Devolver materiais ao estoque</button>}<button className="primary" type="button" onClick={save}><Check />Salvar ficha de produção</button><button className="payment-close" type="button" onClick={() => setModal(null)}>Cancelar</button></>
}

function ClientForm({ update, setModal, notify, item }) {
  const save = (event) => { event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { id: item?.id || uid(), ...f }; update('clients', (items) => item ? items.map((c) => c.id === item.id ? record : c) : [record, ...items]); setModal(null); notify(item ? 'Cliente atualizada' : 'Cliente cadastrada') }
  const remove = () => { if (confirm('Excluir esta cliente? Os pedidos continuarão salvos.')) { update('clients', (items) => items.filter((c) => c.id !== item.id)); setModal(null); notify('Cliente excluída') } }
  return <form onSubmit={save}><ModalTitle icon="👤" title={item ? 'Editar cliente' : 'Nova cliente'} sub="Mantenha contato e observações à mão." /><Field label="Nome" name="name" defaultValue={item?.name} placeholder="Nome completo" required /><Field label="WhatsApp" name="phone" type="tel" defaultValue={item?.phone} placeholder="(85) 99999-9999" /><Field label="Instagram" name="instagram" defaultValue={item?.instagram} placeholder="@usuario" /><Field label="Observações" name="notes" defaultValue={item?.notes} placeholder="Preferências, medidas..." /><FormActions editing={!!item} onDelete={remove} /></form>
}

function ClientDetails({ data, setModal, item }) {
  const orders = data.orders.filter((o) => o.clientId === item.id)
  const total = orders.reduce((sum, o) => sum + Number(o.value || 0), 0)
  return <><ModalTitle icon={item.name[0]?.toUpperCase()} title={item.name} sub={`${orders.length} pedidos · ${money(total)}`} /><div className="detail-list"><div><span>WhatsApp</span><b>{item.phone || 'Não informado'}</b></div><div><span>Instagram</span><b>{item.instagram || 'Não informado'}</b></div>{item.notes && <div><span>Observações</span><b>{item.notes}</b></div>}</div>{orders.length > 0 && <><h3 className="modal-section-title">Histórico de pedidos</h3>{orders.slice(0, 4).map((o) => <div className="mini-order" key={o.id}><span>{o.title}<small>{dateBR(o.date)}</small></span><b>{money(o.value)}</b></div>)}</>}<button className="primary" onClick={() => setModal({ type: 'client', item })}>Editar cliente</button></>
}

function MaterialForm({ update, setModal, notify, item }) {
  const save = (event) => { event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { id: item?.id || uid(), ...f, quantity: Number(f.quantity), minimum: Number(f.minimum), cost: Number(f.cost), packageWeight: Number(f.packageWeight || 0) }; update('materials', (items) => item ? items.map((m) => m.id === item.id ? record : m) : [record, ...items]); setModal(null); notify(item ? 'Material atualizado' : 'Material cadastrado') }
  const remove = () => { if (confirm('Excluir este material?')) { update('materials', (items) => items.filter((m) => m.id !== item.id)); setModal(null); notify('Material excluído') } }
  return <form onSubmit={save}><ModalTitle icon="🧶" title={item ? 'Editar material' : 'Novo material'} sub="Você será avisada quando estiver acabando." /><Field label="Material" name="name" defaultValue={item?.name} placeholder="Ex.: Barbante cru" required /><div className="form-row"><Field label="Quantidade" name="quantity" type="number" min="0" step="0.01" defaultValue={item?.quantity} required /><Field as="select" label="Unidade" name="unit" defaultValue={item?.unit || 'un.'}><option>un.</option><option>g</option><option>kg</option><option>m</option><option>cm</option><option>m²</option></Field></div><div className="form-row"><Field label="Estoque mínimo" name="minimum" type="number" min="0" step="0.01" defaultValue={item?.minimum || 1} /><Field label="Custo por unidade" name="cost" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.cost} /></div><Field label="Peso por unidade (opcional)" name="packageWeight" type="number" min="0" step="1" suffix="g" defaultValue={item?.packageWeight} placeholder="Ex.: 600" /><FormActions editing={!!item} onDelete={remove} /></form>
}

function CalcManualForm({ setModal, notify, onAdd }) {
  const [mode, setMode] = useState('unit')
  const save = (event) => {
    event.preventDefault()
    const f = Object.fromEntries(new FormData(event.currentTarget))
    const amount = Number(f.amount || 1)
    const record = {
      id: uid(), name: f.name, quantity: amount, minimum: 0,
      unit: mode === 'weight' ? 'g' : 'un.', cost: Number(f.cost || 0),
      packageWeight: 0, manualAmount: amount, manualMode: mode,
    }
    onAdd(record); setModal(null); notify('Material adicionado ao cálculo')
  }
  return <form onSubmit={save}><ModalTitle icon="🧶" title="Adicionar material" sub="Inclua um item sem sair da calculadora." /><div className="calc-type-toggle modal-toggle"><button type="button" className={mode === 'unit' ? 'active' : ''} onClick={() => setMode('unit')}>Por unidade</button><button type="button" className={mode === 'weight' ? 'active' : ''} onClick={() => setMode('weight')}>Por peso (g)</button></div><Field label="Nome do material" name="name" placeholder="Ex.: Fio dourado" required /><div className="form-row"><Field label={mode === 'weight' ? 'Quantidade usada' : 'Unidades usadas'} name="amount" type="number" min="0" step={mode === 'weight' ? '1' : '.01'} suffix={mode === 'weight' ? 'g' : 'un.'} required /><Field label={mode === 'weight' ? 'Custo por grama' : 'Custo por unidade'} name="cost" type="number" min="0" step=".01" prefix="R$" required /></div><button className="primary" type="submit"><Plus />Adicionar ao cálculo</button></form>
}

function CalcCostsForm({ setModal, notify, hourly, fixed, onSave }) {
  const save = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSave({ hourly: String(Math.max(0, Number(form.get('hourly') || 0))), fixed: String(Math.max(0, Number(form.get('fixed') || 0))) })
    setModal(null)
    notify('Valores da mão de obra atualizados')
  }
  return <form onSubmit={save}><ModalTitle icon="⏱️" title="Alterar valores" sub="Defina o valor da sua hora e os custos fixos desta peça." /><Field label="Valor por hora" name="hourly" type="number" min="0" step=".01" inputMode="decimal" prefix="R$" defaultValue={hourly} required autoFocus /><Field label="Custos fixos" name="fixed" type="number" min="0" step=".01" inputMode="decimal" prefix="R$" defaultValue={fixed} required /><div className="cost-example"><span>Cálculo da mão de obra</span><b>Horas trabalhadas × valor por hora</b></div><button className="primary" type="submit"><Check />Aplicar novos valores</button></form>
}

function ExpenseForm({ update, setModal, notify, item }) {
  const save = (event) => { event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { id: item?.id || uid(), ...f, value: Number(f.value) }; update('expenses', (items) => item ? items.map((e) => e.id === item.id ? record : e) : [record, ...items]); setModal(null); notify(item ? 'Gasto atualizado' : 'Gasto registrado') }
  const remove = () => { if (confirm('Excluir este gasto?')) { update('expenses', (items) => items.filter((e) => e.id !== item.id)); setModal(null); notify('Gasto excluído') } }
  return <form onSubmit={save}><ModalTitle icon="🧾" title={item ? 'Editar gasto' : 'Registrar gasto'} sub="Custos corretos mostram o lucro real." /><Field label="Descrição" name="description" defaultValue={item?.description} placeholder="Ex.: Compra de embalagens" required /><div className="form-row"><Field label="Valor" name="value" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.value} required /><Field label="Data" name="date" type="date" defaultValue={item?.date || today()} required /></div><FormActions editing={!!item} onDelete={remove} /></form>
}

function CatalogForm({ update, setModal, notify, item }) {
  const [photo, setPhoto] = useState(item?.photo || '')
  const pickPhoto = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setPhoto(await compressPhoto(file)) } catch { notify('Não foi possível ler a foto') } }
  const save = (event) => { event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { id: item?.id || uid(), ...f, price: Number(f.price), photo }; update('catalog', (items) => item ? items.map((i) => i.id === item.id ? record : i) : [record, ...items]); setModal(null); notify(item ? 'Peça atualizada' : 'Peça adicionada') }
  const remove = () => { if (confirm('Excluir esta peça do catálogo?')) { update('catalog', (items) => items.filter((i) => i.id !== item.id)); setModal(null); notify('Peça excluída') } }
  return <form onSubmit={save}><ModalTitle icon="🛍️" title={item ? 'Editar peça' : 'Nova peça'} sub="Monte um catálogo bonito das suas criações." /><label className="photo-picker">{photo ? <img src={photo} alt="Prévia" /> : <><Camera /><span>Adicionar foto</span></>}<input type="file" accept="image/*" onChange={pickPhoto} /></label><Field label="Nome da peça" name="name" defaultValue={item?.name} placeholder="Ex.: Kit banheiro" required /><div className="form-row"><Field label="Categoria" name="category" defaultValue={item?.category} placeholder="Crochê" /><Field label="Preço" name="price" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.price} required /></div><Field label="Descrição" name="description" defaultValue={item?.description} placeholder="Materiais, cores, tamanhos..." /><FormActions editing={!!item} onDelete={remove} /></form>
}

function QuoteForm({ data, update, setData, setModal, navigate, notify, item, suggestion, costing }) {
  const [generatingPdf, setGeneratingPdf] = useState(false)
  useEffect(() => { if (item) import('jspdf').catch(() => {}) }, [item])
  const save = (event) => { event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { ...item, ...(!item && costing ? { costing } : {}), id: item?.id || uid(), createdAt: item?.createdAt || today(), ...f, quantity: Number(f.quantity || 1), value: Number(f.value), approved: f.approved === 'on' }; update('quotes', (items) => item ? items.map((q) => q.id === item.id ? record : q) : [record, ...items]); setModal(null); notify(item ? 'Orçamento atualizado' : 'Orçamento criado') }
  const remove = () => { if (confirm('Excluir este orçamento?')) { update('quotes', (items) => items.filter((q) => q.id !== item.id)); setModal(null); notify('Orçamento excluído') } }
  const exportPdf = async () => {
    if (!item || generatingPdf) return
    setGeneratingPdf(true)
    try {
      const result = await shareQuotePdf(item, data.profile)
      if (result === 'downloaded') notify('PDF baixado')
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Não foi possível gerar o PDF')
    } finally { setGeneratingPdf(false) }
  }
  const openWhatsApp = () => { if (item) window.location.href = whatsAppUrl(item, data) }
  const convertToOrder = () => {
    if (!item?.approved || item.orderId) return
    const orderId = uid()
    const clientName = item.client?.trim()
    const normalizedName = clientName?.toLocaleLowerCase('pt-BR')
    setData((old) => {
      const savedQuote = old.quotes.find((quote) => quote.id === item.id)
      if (!savedQuote || savedQuote.orderId) return old
      const existingClient = clientName ? old.clients.find((client) => client.name.trim().toLocaleLowerCase('pt-BR') === normalizedName) : null
      const clientId = existingClient?.id || (clientName ? uid() : '')
      const clients = clientName && !existingClient ? [{ id: clientId, name: clientName, phone: '', instagram: '', notes: 'Cadastro criado a partir de um orçamento.' }, ...old.clients] : old.clients
      const productionMaterials = (savedQuote.costing?.materials || []).map((entry) => {
        const material = old.materials.find((current) => current.id === entry.materialId)
        const quantity = Number(entry.amount || 0)
        const stockQuantity = entry.stockQuantity ?? (entry.mode === 'weight'
          ? material?.unit === 'kg' ? quantity / 1000 : material?.unit === 'g' ? quantity : quantity / Math.max(1, Number(material?.packageWeight || 1))
          : quantity)
        return { ...entry, displayUnit: entry.displayUnit || (entry.mode === 'weight' ? 'g' : material?.unit || 'un.'), stockUnit: entry.stockUnit || material?.unit || 'un.', stockQuantity }
      })
      const order = {
        id: orderId,
        quoteId: item.id,
        title: savedQuote.title,
        quantity: Number(savedQuote.quantity || 1),
        clientId,
        date: savedQuote.deliveryDate || today(),
        value: Number(savedQuote.value || 0),
        status: 'confirmed',
        payment: 'open',
        payments: [],
        costing: savedQuote.costing,
        production: savedQuote.costing ? { materials: productionMaterials, hours: Number(savedQuote.costing.hours || 0), hourly: Number(savedQuote.costing.hourly || 0), otherCosts: Number(savedQuote.costing.fixed || 0), checks: {} } : undefined,
        notes: [savedQuote.notes, savedQuote.paymentTerms ? `Pagamento: ${savedQuote.paymentTerms}` : ''].filter(Boolean).join('\n\n'),
      }
      return { ...old, clients, orders: [order, ...old.orders], quotes: old.quotes.map((quote) => quote.id === item.id ? { ...quote, orderId } : quote) }
    })
    navigate('orders')
    notify('Orçamento convertido em pedido')
  }
  const validDate = new Date(); validDate.setDate(validDate.getDate() + 7)
  return <form onSubmit={save}><ModalTitle icon="📋" title={item ? 'Editar orçamento' : 'Novo orçamento'} sub="Crie uma proposta clara para sua cliente." /><Field label="Peça ou serviço" name="title" defaultValue={item?.title} placeholder="Ex.: Bolsa personalizada" required /><Field label="Cliente" name="client" defaultValue={item?.client} placeholder="Nome da cliente" /><div className="form-row"><Field label="Quantidade" name="quantity" type="number" min="1" step="1" defaultValue={item?.quantity || 1} required /><Field label="Valor total" name="value" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.value || (suggestion ? suggestion.toFixed(2) : '')} required /></div><div className="form-row"><Field label="Válido até" name="validUntil" type="date" defaultValue={item?.validUntil || validDate.toISOString().slice(0, 10)} /><Field label="Prazo de entrega" name="deliveryDate" type="date" defaultValue={item?.deliveryDate || ''} /></div><div className="form-row"><Field label="Prazo de produção" name="productionTime" defaultValue={item?.productionTime} placeholder="Ex.: 2 dias" /><Field label="Prazo de envio" name="shippingTime" defaultValue={item?.shippingTime} placeholder="Ex.: 1 dia após conclusão" /></div><Field label="Condições de pagamento" name="paymentTerms" defaultValue={item?.paymentTerms} placeholder="Ex.: 50% de sinal e 50% na entrega" /><Field as="textarea" label="Detalhes" name="notes" defaultValue={item?.notes} placeholder="Itens inclusos, cores, medidas e condições..." />{item && <div className="quote-document-actions"><button type="button" onClick={exportPdf} disabled={generatingPdf}><FileText /><span>{generatingPdf ? 'Gerando...' : 'PDF'}</span></button><button type="button" onClick={openWhatsApp}><Share2 /><span>WhatsApp</span></button></div>}<label className="check-field"><input type="checkbox" name="approved" defaultChecked={item?.approved} /><span><Check /> Orçamento aprovado</span></label>{item?.orderId ? <div className="quote-converted"><Check />Este orçamento já virou um pedido.</div> : item?.approved && <button className="primary quote-convert" type="button" onClick={convertToOrder}><Package />Criar pedido deste orçamento</button>}<FormActions editing={!!item} onDelete={remove} /></form>
}

export default App
