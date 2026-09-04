import { useEffect, useRef, useState } from 'react'
import {
  Archive, Calculator, Camera, Check, ChevronRight,
  CircleDollarSign, ClipboardList, Download, FileText, Home, Moon, MoreHorizontal,
  Package, Plus, ReceiptText, Search, Settings, Share2, ShoppingBag,
  Sparkles, Sun, Trash2, Upload, UserRound, UsersRound, WalletCards, X,
} from 'lucide-react'

const STORE_KEY = 'meu-atelie-data-v1'
const today = () => new Date().toISOString().slice(0, 10)
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateBR = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'

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

const initialData = {
  profile: { name: '', studio: 'Meu Ateliê', dark: false, onboarded: false },
  clients: [], orders: [], materials: [], expenses: [], catalog: [], quotes: [],
}

function readData() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('preview')) {
    return {
      profile: { name: 'Pablo', studio: 'Meu Ateliê', dark: false, onboarded: true },
      clients: [{ id: 'demo-client', name: 'Rebeca Dias', phone: '(85) 99999-1234', instagram: '@rebeca', notes: '' }],
      orders: [{ id: 'demo-order', title: 'Kit banheiro', clientId: 'demo-client', date: today(), value: 150, status: 'confirmed', payment: 'deposit', notes: '' }],
      materials: [{ id: 'demo-material', name: 'Barbante cru', quantity: 2, minimum: 3, unit: 'un.', cost: 17.8, packageWeight: 600 }],
      expenses: [], catalog: [], quotes: [],
    }
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY))
    return parsed ? { ...initialData, ...parsed, profile: { ...initialData.profile, ...parsed.profile } } : initialData
  } catch { return initialData }
}

const screens = {
  home: { title: 'Meu Ateliê', icon: Home },
  orders: { title: 'Pedidos', icon: Package },
  clients: { title: 'Clientes', icon: UsersRound },
  inventory: { title: 'Estoque', icon: Archive },
  finance: { title: 'Financeiro', icon: WalletCards },
  calculator: { title: 'Calculadora', icon: Calculator },
  quotes: { title: 'Orçamentos', icon: ClipboardList },
  catalog: { title: 'Catálogo', icon: ShoppingBag },
  settings: { title: 'Configurações', icon: Settings },
}

const statusLabel = { pending: 'Pendente', confirmed: 'Confirmado', producing: 'Em produção', delivered: 'Entregue' }
const paymentLabel = { open: 'Em aberto', deposit: 'Sinal 50%', paid: 'Pago ✓' }
const statusCycle = ['pending', 'confirmed', 'producing', 'delivered']
const paymentCycle = ['open', 'deposit', 'paid']

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
    <button className={['inventory', 'finance', 'calculator', 'quotes', 'catalog', 'settings'].includes(screen) ? 'active' : ''} onClick={() => setModal({ type: 'more' })}><MoreHorizontal /><span>Mais</span></button>
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
  const receivable = data.orders.reduce((sum, o) => sum + Number(o.value || 0) * (o.payment === 'open' ? 1 : o.payment === 'deposit' ? .5 : 0), 0)
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

    <div className="section-heading"><div><span className="eyebrow">AGENDA</span><h2>Próximas entregas</h2></div>{openOrders.length > 0 && <button onClick={() => navigate('orders')}>Ver todas</button>}</div>
    {nextOrders.length ? nextOrders.map((order) => <OrderCard key={order.id} order={order} clients={data.clients} onOpen={() => setModal({ type: 'order', item: order })} />) : <Empty icon="🌷" title="Nenhum pedido em aberto" text="Cadastre seu primeiro pedido e acompanhe tudo por aqui." action={() => setModal({ type: 'order' })} actionLabel="Novo pedido" />}
  </>
}

function Quick({ icon, label, sub, onClick }) {
  return <button className="quick-card" onClick={onClick}><span>{icon}</span><div><strong>{label}</strong><small>{sub}</small></div><ChevronRight /></button>
}

function Stat({ icon, value, label, tone }) {
  return <div className={`stat-card ${tone}`}><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
}

function OrdersScreen({ data, update, setModal, notify, search, setSearch, filter, setFilter }) {
  let orders = data.orders.filter((o) => `${o.title} ${data.clients.find((c) => c.id === o.clientId)?.name || ''}`.toLowerCase().includes(search.toLowerCase()))
  if (filter !== 'all') orders = orders.filter((o) => filter === 'receivable' ? o.payment !== 'paid' : o.status === filter)
  const cycle = (order, field, values) => {
    update('orders', (items) => items.map((o) => o.id === order.id ? { ...o, [field]: values[(values.indexOf(o[field]) + 1) % values.length] } : o))
    notify('Pedido atualizado')
  }
  return <>
    <PageIntro eyebrow="ORGANIZAÇÃO" title={`Pedidos (${data.orders.length})`} action={() => setModal({ type: 'order' })} actionLabel="Novo" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar pedido ou cliente..." />
    <div className="filter-tabs">
      {[['all', 'Todos'], ['confirmed', 'Confirmados'], ['producing', 'Produção'], ['delivered', 'Entregues'], ['receivable', 'A receber']].map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    {orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} clients={data.clients} onOpen={() => setModal({ type: 'order', item: order })} onStatus={() => cycle(order, 'status', statusCycle)} onPayment={() => cycle(order, 'payment', paymentCycle)} />) : <Empty icon="📦" title="Nada por aqui" text="Nenhum pedido corresponde a esta seleção." action={() => setModal({ type: 'order' })} actionLabel="Novo pedido" />}
  </>
}

function OrderCard({ order, clients, onOpen, onStatus, onPayment }) {
  const client = clients.find((c) => c.id === order.clientId)
  const remains = Number(order.value || 0) * (order.payment === 'open' ? 1 : order.payment === 'deposit' ? .5 : 0)
  return <article className="list-card order-card" onClick={onOpen}>
    <div className="item-icon">{order.status === 'delivered' ? '🎁' : '🧶'}</div>
    <div className="item-copy"><strong>{order.title}</strong><span><UserRound />{client?.name || 'Sem cliente'}</span><small>📅 {dateBR(order.date)} · {money(order.value)}</small>{remains > 0 && <em>Falta {money(remains)}</em>}</div>
    <div className="badges"><button onClick={(e) => { e.stopPropagation(); onStatus?.() }} className={`badge ${order.status}`}>{statusLabel[order.status]}</button><button onClick={(e) => { e.stopPropagation(); onPayment?.() }} className={`badge ${order.payment}`}>{paymentLabel[order.payment]}</button></div>
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
  const receivable = orders.reduce((sum, o) => sum + Number(o.value || 0) * (o.payment === 'open' ? 1 : o.payment === 'deposit' ? .5 : 0), 0)
  return <>
    <PageIntro eyebrow="RESULTADOS" title="Financeiro" action={() => setModal({ type: 'expense' })} actionLabel="Gasto" />
    <div className="month-picker"><button onClick={() => setOffset(offset - 1)}>‹</button><strong>{label}</strong><button disabled={offset === 0} onClick={() => setOffset(Math.min(0, offset + 1))}>›</button></div>
    <section className="finance-banner"><span>💰 LUCRO ESTIMADO</span><strong>{money(revenue - spent)}</strong><small>Receita {money(revenue)} − Gastos {money(spent)}</small></section>
    <div className="stats-grid finance-stats"><Stat icon={<Download />} value={money(revenue)} label="Receita" tone="green" /><Stat icon={<Upload />} value={money(spent)} label="Gastos" tone="red" /><Stat icon={<Package />} value={orders.length} label="Pedidos" tone="plain" /><Stat icon={<CircleDollarSign />} value={money(receivable)} label="A receber" tone="pink" /></div>
    <div className="section-heading compact"><h2>Gastos do mês</h2></div>
    {expenses.length ? expenses.map((expense) => <article key={expense.id} className="list-card" onClick={() => setModal({ type: 'expense', item: expense })}><div className="item-icon">🧾</div><div className="item-copy"><strong>{expense.description}</strong><span>{dateBR(expense.date)}</span></div><b className="negative">− {money(expense.value)}</b></article>) : <Empty icon="🧾" title="Nenhum gasto registrado" text="Registre os gastos para visualizar seu lucro real." action={() => setModal({ type: 'expense' })} actionLabel="Registrar gasto" />}
  </>
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
    setUsedMaterials((items) => [...items, {
      entryId: uid(), materialId: material.id, name: material.name, amount: quantity,
      mode: actualMode, calculatedCost: calculateMaterialCost(material, quantity, actualMode),
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
    <button className="primary calc-quote" disabled={!price} onClick={() => setModal({ type: 'quote', suggestion: price })}><FileText />Criar orçamento com este preço</button>
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
  const share = async (quote) => {
    const text = `Olá, ${quote.client}! Segue o orçamento para ${quote.title}: ${money(quote.value)}. Validade: ${dateBR(quote.validUntil)}.`
    if (navigator.share) { try { await navigator.share({ title: 'Orçamento - Meu Ateliê', text }); return } catch {} }
    await navigator.clipboard.writeText(text); notify('Mensagem copiada')
  }
  return <>
    <PageIntro eyebrow="PROPOSTAS" title={`Orçamentos (${data.quotes.length})`} action={() => setModal({ type: 'quote' })} actionLabel="Novo" />
    <SearchBox value={search} onChange={setSearch} placeholder="Buscar orçamento..." />
    {items.length ? items.map((quote) => <article className="list-card" key={quote.id} onClick={() => setModal({ type: 'quote', item: quote })}><div className="item-icon">📋</div><div className="item-copy"><strong>{quote.title}</strong><span>{quote.client || 'Sem cliente'} · válido até {dateBR(quote.validUntil)}</span><small>{quote.approved ? '✅ Aprovado' : 'Aguardando resposta'}</small></div><b className="card-value">{money(quote.value)}</b><button className="icon-button" onClick={(e) => { e.stopPropagation(); share(quote) }}><Share2 /></button></article>) : <Empty icon="📋" title="Nenhum orçamento" text="Crie uma proposta e compartilhe diretamente pelo iPhone." action={() => setModal({ type: 'quote' })} actionLabel="Novo orçamento" />}
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
    const reader = new FileReader(); reader.onload = () => { try { setData({ ...initialData, ...JSON.parse(reader.result) }); notify('Backup restaurado') } catch { notify('Arquivo inválido') } }; reader.readAsText(file)
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
  if (modal.type === 'client') return <ClientForm {...props} item={modal.item} />
  if (modal.type === 'clientDetails') return <ClientDetails {...props} item={modal.item} />
  if (modal.type === 'material') return <MaterialForm {...props} item={modal.item} />
  if (modal.type === 'calcManual') return <CalcManualForm {...props} onAdd={modal.onAdd} />
  if (modal.type === 'calcCosts') return <CalcCostsForm {...props} hourly={modal.hourly} fixed={modal.fixed} onSave={modal.onSave} />
  if (modal.type === 'expense') return <ExpenseForm {...props} item={modal.item} />
  if (modal.type === 'catalogItem') return <CatalogForm {...props} item={modal.item} />
  if (modal.type === 'quote') return <QuoteForm {...props} item={modal.item} suggestion={modal.suggestion} />
}

function QuickModal({ setModal }) {
  return <><ModalTitle icon="✨" title="Adicionar" sub="O que você quer cadastrar?" /><div className="modal-grid"><button onClick={() => setModal({ type: 'order' })}>📦<span><b>Novo pedido</b><small>Prazo e pagamento</small></span></button><button onClick={() => setModal({ type: 'client' })}>👥<span><b>Nova cliente</b><small>Contato e histórico</small></span></button><button onClick={() => setModal({ type: 'material' })}>🧶<span><b>Novo material</b><small>Atualizar estoque</small></span></button><button onClick={() => setModal({ type: 'expense' })}>🧾<span><b>Novo gasto</b><small>Controle financeiro</small></span></button></div></>
}

function MoreModal({ navigate }) {
  return <><ModalTitle icon="🧶" title="Mais opções" sub="Tudo para cuidar do seu ateliê." /><div className="more-list">{[['inventory', '🧶', 'Estoque', 'Materiais e reposição'], ['finance', '💰', 'Financeiro', 'Receita, gastos e lucro'], ['calculator', '🧮', 'Calculadora', 'Descubra o preço justo'], ['quotes', '📋', 'Orçamentos', 'Crie e compartilhe propostas'], ['catalog', '🛍️', 'Catálogo', 'Suas peças e preços'], ['settings', '⚙️', 'Configurações', 'Tema, instalação e backup']].map(([key, icon, title, sub]) => <button key={key} onClick={() => navigate(key)}><i>{icon}</i><span><b>{title}</b><small>{sub}</small></span><ChevronRight /></button>)}</div></>
}

function ModalTitle({ icon, title, sub }) { return <div className="modal-title"><i>{icon}</i><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div></div> }

function Field({ label, prefix, suffix, as = 'input', children, ...props }) {
  const Element = as
  return <label className="field"><span>{label}</span><div>{prefix && <i>{prefix}</i>}<Element {...props}>{children}</Element>{suffix && <i>{suffix}</i>}</div></label>
}

function FormActions({ editing, onDelete }) {
  return <div className="form-actions"><button className="primary" type="submit"><Check />{editing ? 'Salvar alterações' : 'Cadastrar'}</button>{editing && <button type="button" className="danger" onClick={onDelete}><Trash2 />Excluir</button>}</div>
}

function OrderForm({ data, update, setModal, notify, item }) {
  const save = (event) => {
    event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { id: item?.id || uid(), ...f, value: Number(f.value) }
    update('orders', (items) => item ? items.map((o) => o.id === item.id ? record : o) : [record, ...items]); setModal(null); notify(item ? 'Pedido atualizado' : 'Pedido cadastrado')
  }
  const remove = () => { if (confirm('Excluir este pedido?')) { update('orders', (items) => items.filter((o) => o.id !== item.id)); setModal(null); notify('Pedido excluído') } }
  return <form onSubmit={save}><ModalTitle icon="📦" title={item ? 'Editar pedido' : 'Novo pedido'} sub="Registre uma vez e acompanhe até a entrega." /><Field label="Nome da peça" name="title" defaultValue={item?.title} placeholder="Ex.: Bolsa de crochê" required /><Field as="select" label="Cliente" name="clientId" defaultValue={item?.clientId || ''}><option value="">Sem cliente</option>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Field><div className="form-row"><Field label="Prazo" name="date" type="date" defaultValue={item?.date || today()} /><Field label="Valor" name="value" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.value} required /></div><div className="form-row"><Field as="select" label="Status" name="status" defaultValue={item?.status || 'confirmed'}>{Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field><Field as="select" label="Pagamento" name="payment" defaultValue={item?.payment || 'open'}>{Object.entries(paymentLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field></div><Field label="Observações" name="notes" defaultValue={item?.notes} placeholder="Cores, medidas, detalhes..." /><FormActions editing={!!item} onDelete={remove} /></form>
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

function QuoteForm({ update, setModal, notify, item, suggestion }) {
  const save = (event) => { event.preventDefault(); const f = Object.fromEntries(new FormData(event.currentTarget)); const record = { id: item?.id || uid(), ...f, value: Number(f.value), approved: f.approved === 'on' }; update('quotes', (items) => item ? items.map((q) => q.id === item.id ? record : q) : [record, ...items]); setModal(null); notify(item ? 'Orçamento atualizado' : 'Orçamento criado') }
  const remove = () => { if (confirm('Excluir este orçamento?')) { update('quotes', (items) => items.filter((q) => q.id !== item.id)); setModal(null); notify('Orçamento excluído') } }
  const validDate = new Date(); validDate.setDate(validDate.getDate() + 7)
  return <form onSubmit={save}><ModalTitle icon="📋" title={item ? 'Editar orçamento' : 'Novo orçamento'} sub="Crie uma proposta clara para sua cliente." /><Field label="Peça ou serviço" name="title" defaultValue={item?.title} placeholder="Ex.: Bolsa personalizada" required /><Field label="Cliente" name="client" defaultValue={item?.client} placeholder="Nome da cliente" /><div className="form-row"><Field label="Valor" name="value" type="number" min="0" step="0.01" prefix="R$" defaultValue={item?.value || (suggestion ? suggestion.toFixed(2) : '')} required /><Field label="Válido até" name="validUntil" type="date" defaultValue={item?.validUntil || validDate.toISOString().slice(0, 10)} /></div><Field label="Detalhes" name="notes" defaultValue={item?.notes} placeholder="Itens inclusos e condições..." /><label className="check-field"><input type="checkbox" name="approved" defaultChecked={item?.approved} /><span><Check /> Orçamento aprovado</span></label><FormActions editing={!!item} onDelete={remove} /></form>
}

export default App
