import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import {
  deleteCustomer,
  deleteVendor,
  getCustomers,
  getDashboardData,
  getVendors,
  updateCustomer,
  updateExpenseStatus,
  updateInvoiceStatus,
  updateTransactionStatus,
  updateVendor,
} from './lib/data'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type View = 'dashboard' | 'invoices' | 'expenses' | 'contacts' | 'reports' | 'auth'
type ContactTab = 'customers' | 'vendors'
type Status = 'Paid' | 'Pending' | 'Review'

type Transaction = { id: string; client: string; type: string; date: string; status: Status; amount: number }
type CustomerRecord = { id?: string; name: string; email: string; phone: string; city: string; gstNumber: string }
type VendorRecord = { id?: string; name: string; email: string; phone: string; city: string }
type InvoiceFormValues = { customer: string; invoiceNumber: string; amount: string; tax: string; dueDate: string }
type ExpenseFormValues = { vendor: string; amount: string; category: string; date: string }

const emptyStats = { revenue: 0, expenses: 0, netProfit: 0, dueTax: 0 }
const monthIncome = [72, 88, 65, 104, 118, 96, 132]
const formatCurrency = (value: number) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value)
const today = () => new Date().toISOString().slice(0, 10)
const initialInvoiceForm: InvoiceFormValues = { customer: '', invoiceNumber: '', amount: '', tax: '', dueDate: '' }
const initialExpenseForm: ExpenseFormValues = { vendor: '', amount: '', category: 'Office rent', date: today() }
const initialCustomerForm: CustomerRecord = { name: '', email: '', phone: '', city: 'Karachi', gstNumber: '' }
const initialVendorForm: VendorRecord = { name: '', email: '', phone: '', city: 'Karachi' }

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [contactTab, setContactTab] = useState<ContactTab>('customers')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState(emptyStats)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [vendors, setVendors] = useState<VendorRecord[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '' })
  const [authStatus, setAuthStatus] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormValues>(initialInvoiceForm)
  const [expenseForm, setExpenseForm] = useState<ExpenseFormValues>(initialExpenseForm)
  const [customerForm, setCustomerForm] = useState<CustomerRecord>(initialCustomerForm)
  const [vendorForm, setVendorForm] = useState<VendorRecord>(initialVendorForm)
  const [formMessage, setFormMessage] = useState('')
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [dateRangeStart, setDateRangeStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateRangeEnd, setDateRangeEnd] = useState(today())

  const refresh = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    try {
      const [dashboard, customerRows, vendorRows] = await Promise.all([getDashboardData(), getCustomers(), getVendors()])
      setTransactions(dashboard.transactions.map((item) => ({ id: item.id, client: item.client_name, type: item.type, date: item.transaction_date, status: item.status, amount: Number(item.amount) })))
      setStats(dashboard.stats)
      setCustomers(customerRows.map((c) => ({ id: c.id, name: c.name, email: c.email ?? '', phone: c.phone ?? '', city: c.city ?? '', gstNumber: c.gst_number ?? '' })))
      setVendors(vendorRows.map((v) => ({ id: v.id, name: v.name, email: v.email ?? '', phone: v.phone ?? '', city: v.city ?? '' })))
    } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Could not load accounting data.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const client = supabase
    if (!client) return
    let mounted = true
    const initialise = async () => {
      const { data } = await client.auth.getSession()
      if (!mounted) return
      setUserEmail(data.session?.user.email ?? '')
      await refresh()
    }
    void initialise()
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => { setUserEmail(session?.user.email ?? ''); if (session) void refresh() })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return setAuthStatus('Supabase is not configured. Add the required environment variables.')
    if (authForm.password.length < 6) return setAuthStatus('Password must be at least 6 characters.')
    try {
      const result = authMode === 'signup'
        ? await supabase.auth.signUp({ email: authForm.email.trim(), password: authForm.password, options: { data: { full_name: authForm.fullName.trim() } } })
        : await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password })
      if (result.error) return setAuthStatus(result.error.message)
      setAuthStatus(authMode === 'signup' ? 'Account created. Confirm your email if required.' : 'Logged in successfully.')
      if (authMode === 'login') setActiveView('dashboard')
    } catch (error) { setAuthStatus(error instanceof Error ? error.message : 'Authentication failed.') }
  }

  const handleInvoiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return setFormMessage('Connect Supabase before saving accounting records.')
    const amount = Number(invoiceForm.amount); const tax = Number(invoiceForm.tax || 0)
    if (!invoiceForm.customer.trim() || !invoiceForm.invoiceNumber.trim() || !Number.isFinite(amount) || amount <= 0 || tax < 0 || !invoiceForm.dueDate) return setFormMessage('Enter a customer, invoice number, positive amount, non-negative tax and due date.')
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return setFormMessage('Log in before creating an invoice.')
    const { data: customer } = await supabase.from('customers').select('id').eq('user_id', authData.user.id).eq('name', invoiceForm.customer.trim()).maybeSingle()
    const { error } = await supabase.from('invoices').insert({ user_id: authData.user.id, invoice_number: invoiceForm.invoiceNumber.trim(), customer_id: customer?.id ?? null, issue_date: today(), due_date: invoiceForm.dueDate, status: 'Sent', subtotal: amount, tax, total: amount + tax })
    if (error) return setFormMessage(error.message)
    setFormMessage('Invoice saved successfully.'); setInvoiceForm(initialInvoiceForm); await refresh()
  }

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return setFormMessage('Connect Supabase before saving accounting records.')
    const amount = Number(expenseForm.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !expenseForm.vendor.trim() || !expenseForm.date) return setFormMessage('Enter a vendor, positive amount and date.')
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return setFormMessage('Log in before creating an expense.')
    const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', authData.user.id).eq('name', expenseForm.vendor.trim()).maybeSingle()
    const { error } = await supabase.from('expenses').insert({ user_id: authData.user.id, vendor_id: vendor?.id ?? null, description: expenseForm.category.trim() || 'Expense', amount, expense_date: expenseForm.date, category: expenseForm.category.trim(), status: 'Pending' })
    if (error) return setFormMessage(error.message)
    setFormMessage('Expense saved successfully.'); setExpenseForm(initialExpenseForm); await refresh()
  }

  const handleCustomerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase) return setFormMessage('Connect Supabase before saving contacts.'); if (!customerForm.name.trim()) return setFormMessage('Customer name is required.')
    try {
      if (editingCustomerId) await updateCustomer(editingCustomerId, { name: customerForm.name.trim(), email: customerForm.email.trim(), phone: customerForm.phone.trim(), city: customerForm.city.trim(), gst_number: customerForm.gstNumber.trim() })
      else { const { data: authData } = await supabase.auth.getUser(); if (!authData.user) return setFormMessage('Log in before adding a customer.'); const { error } = await supabase.from('customers').insert({ user_id: authData.user.id, name: customerForm.name.trim(), email: customerForm.email.trim(), phone: customerForm.phone.trim(), city: customerForm.city.trim(), gst_number: customerForm.gstNumber.trim() }); if (error) throw error }
      setFormMessage(editingCustomerId ? 'Customer updated successfully.' : 'Customer saved successfully.'); setCustomerForm(initialCustomerForm); setEditingCustomerId(null); await refresh()
    } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Could not save customer.') }
  }

  const handleVendorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase) return setFormMessage('Connect Supabase before saving contacts.'); if (!vendorForm.name.trim()) return setFormMessage('Vendor name is required.')
    try {
      if (editingVendorId) await updateVendor(editingVendorId, { name: vendorForm.name.trim(), email: vendorForm.email.trim(), phone: vendorForm.phone.trim(), city: vendorForm.city.trim() })
      else { const { data: authData } = await supabase.auth.getUser(); if (!authData.user) return setFormMessage('Log in before adding a vendor.'); const { error } = await supabase.from('vendors').insert({ user_id: authData.user.id, name: vendorForm.name.trim(), email: vendorForm.email.trim(), phone: vendorForm.phone.trim(), city: vendorForm.city.trim() }); if (error) throw error }
      setFormMessage(editingVendorId ? 'Vendor updated successfully.' : 'Vendor saved successfully.'); setVendorForm(initialVendorForm); setEditingVendorId(null); await refresh()
    } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Could not save vendor.') }
  }

  const handleDeleteCustomer = async (id: string) => { try { await deleteCustomer(id); setFormMessage('Customer deleted.'); await refresh() } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Could not delete customer.') } }
  const handleDeleteVendor = async (id: string) => { try { await deleteVendor(id); setFormMessage('Vendor deleted.'); await refresh() } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Could not delete vendor.') } }

  const handleTransactionStatus = async (transaction: Transaction, status: Status) => {
    if (!supabase) return
    try {
      if (transaction.id.startsWith('invoice:')) await updateInvoiceStatus(transaction.id.slice(8), status)
      else if (transaction.id.startsWith('expense:')) await updateExpenseStatus(transaction.id.slice(8), status)
      else await updateTransactionStatus(transaction.id, status)
      setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, status } : item)); setFormMessage('Transaction status updated.')
      const dashboard = await getDashboardData(); setStats(dashboard.stats)
    } catch (error) { setFormMessage(error instanceof Error ? error.message : 'Could not update transaction.') }
  }

  const filteredTransactions = useMemo(() => transactions.filter((t) => t.date >= dateRangeStart && t.date <= dateRangeEnd), [transactions, dateRangeStart, dateRangeEnd])
  const monthlyBreakdown = useMemo(() => { const months: Record<string, { income: number; expense: number }> = {}; filteredTransactions.forEach((tx) => { const month = tx.date.slice(0, 7); months[month] ??= { income: 0, expense: 0 }; if (tx.type === 'Invoice') months[month].income += Math.abs(tx.amount); if (tx.type === 'Expense') months[month].expense += Math.abs(tx.amount) }); return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, ...value })) }, [filteredTransactions])
  const categoryBreakdown = useMemo(() => { const categories: Record<string, number> = {}; filteredTransactions.filter((t) => t.type === 'Expense').forEach((tx) => { categories[tx.client] = (categories[tx.client] ?? 0) + Math.abs(tx.amount) }); return Object.entries(categories).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount) }, [filteredTransactions])
  const metricCards = [['Total revenue', formatCurrency(stats.revenue), '+ live database total'], ['Operating costs', formatCurrency(stats.expenses), 'live database total'], ['Net profit', formatCurrency(stats.netProfit), 'revenue minus expenses'], ['Sales tax due', formatCurrency(stats.dueTax), 'from open invoices']]

  return (
    <div className="app-shell">
      <aside className="sidebar"><div className="brand-block"><div className="brand-mark">A</div><div><p className="eyebrow">Pakistan accounting</p><h2>Alpha Ledger</h2></div></div><nav className="nav">{(['dashboard', 'invoices', 'expenses', 'contacts', 'reports'] as View[]).map((view) => <button key={view} type="button" className={activeView === view ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}<button type="button" className={activeView === 'auth' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('auth')}>{userEmail ? 'Account' : 'Login'}</button></nav><div className="mini-card"><p className="eyebrow">Data mode</p><strong className={isSupabaseConfigured ? 'connected' : 'warning'}>{isSupabaseConfigured ? 'Live database' : 'Not configured'}</strong><small>{isSupabaseConfigured ? 'Financial data is loaded from Supabase.' : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}</small></div></aside>
      <main className="main-panel">
        {activeView === 'dashboard' && <><header className="topbar"><div><p className="eyebrow">Overview</p><h1>Business dashboard</h1></div><div className="topbar-actions"><button type="button" className="ghost-btn" onClick={() => setActiveView('invoices')}>New invoice</button><button type="button" className="primary-btn" onClick={() => setActiveView('expenses')}>New expense</button></div></header><section className="metric-grid">{metricCards.map(([label, value, change]) => <article key={label} className="metric-card"><div className="metric-topline"><span>{label}</span><span className="pill neutral">{change}</span></div><strong>{value}</strong></article>)}</section>{loading && <p className="loading-note">Loading live accounting data…</p>}<section className="content-grid"><div className="panel revenue-panel"><div className="panel-header"><div><p className="eyebrow">Performance</p><h3>Income vs expenses</h3></div><span className="panel-tag">Illustrative trend</span></div><div className="chart">{monthIncome.map((value, index) => <div key={index} className="bar-group"><div className="bar income" style={{ height: `${value}%` }} /><div className="bar expense" style={{ height: `${Math.max(value - 20, 28)}%` }} /><span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}</span></div>)}</div></div><div className="panel tax-panel"><div className="panel-header"><div><p className="eyebrow">Compliance</p><h3>Tax & filings</h3></div></div><ul className="checklist"><li><span className="dot green" /> Open invoice tax is tracked from invoice records</li><li><span className="dot amber" /> Tax rates are stored per invoice</li><li><span className="dot blue" /> Reconcile filings to source invoices</li></ul></div></section><section className="table-panel panel"><div className="panel-header"><div><p className="eyebrow">Ledger</p><h3>Recent transactions</h3></div><span className="panel-tag">Latest 25</span></div><table><thead><tr><th>Client / reference</th><th>Type</th><th>Date</th><th>Status</th><th className="amount-column">Amount</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td>{transaction.client}</td><td>{transaction.type}</td><td>{transaction.date}</td><td><div className="status-controls">{(['Paid', 'Pending', 'Review'] as Status[]).map((status) => <button key={status} type="button" className={`status-btn ${transaction.status === status ? 'active' : ''}`} onClick={() => void handleTransactionStatus(transaction, status)}>{status}</button>)}</div></td><td className="amount-column positive-negative">{formatCurrency(transaction.amount)}</td></tr>)}</tbody></table></section></>}
        {activeView === 'invoices' && <section className="panel form-panel"><div className="panel-header"><div><p className="eyebrow">Create</p><h3>New invoice</h3></div></div><form onSubmit={handleInvoiceSubmit} className="stack-form"><div className="field-row"><label>Customer name<input required value={invoiceForm.customer} onChange={(e) => setInvoiceForm((c) => ({ ...c, customer: e.target.value }))} placeholder="Customer" /></label><label>Invoice number<input required value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm((c) => ({ ...c, invoiceNumber: e.target.value }))} placeholder="INV-2026-001" /></label></div><div className="field-row"><label>Subtotal<input required min="0.01" step="0.01" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((c) => ({ ...c, amount: e.target.value }))} /></label><label>Tax<input min="0" step="0.01" type="number" value={invoiceForm.tax} onChange={(e) => setInvoiceForm((c) => ({ ...c, tax: e.target.value }))} /></label></div><label>Due date<input required type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((c) => ({ ...c, dueDate: e.target.value }))} /></label><button type="submit" className="primary-btn">Save invoice</button></form></section>}
        {activeView === 'expenses' && <section className="panel form-panel"><div className="panel-header"><div><p className="eyebrow">Create</p><h3>New expense</h3></div></div><form onSubmit={handleExpenseSubmit} className="stack-form"><div className="field-row"><label>Vendor<input required value={expenseForm.vendor} onChange={(e) => setExpenseForm((c) => ({ ...c, vendor: e.target.value }))} placeholder="Vendor" /></label><label>Category<input value={expenseForm.category} onChange={(e) => setExpenseForm((c) => ({ ...c, category: e.target.value }))} /></label></div><div className="field-row"><label>Amount<input required min="0.01" step="0.01" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((c) => ({ ...c, amount: e.target.value }))} /></label><label>Date<input required type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((c) => ({ ...c, date: e.target.value }))} /></label></div><button type="submit" className="primary-btn">Save expense</button></form></section>}
        {activeView === 'contacts' && <section className="panel form-panel"><div className="panel-header"><div><p className="eyebrow">Directory</p><h3>Customers & vendors</h3></div></div><div className="toggle-row"><button type="button" className={contactTab === 'customers' ? 'segmented active' : 'segmented'} onClick={() => setContactTab('customers')}>Customers</button><button type="button" className={contactTab === 'vendors' ? 'segmented active' : 'segmented'} onClick={() => setContactTab('vendors')}>Vendors</button></div>{contactTab === 'customers' ? <><form onSubmit={handleCustomerSubmit} className="stack-form"><div className="field-row"><label>Customer name<input required value={customerForm.name} onChange={(e) => setCustomerForm((c) => ({ ...c, name: e.target.value }))} /></label><label>Email<input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((c) => ({ ...c, email: e.target.value }))} /></label></div><div className="field-row"><label>Phone<input value={customerForm.phone} onChange={(e) => setCustomerForm((c) => ({ ...c, phone: e.target.value }))} /></label><label>City<input value={customerForm.city} onChange={(e) => setCustomerForm((c) => ({ ...c, city: e.target.value }))} /></label></div><label>GST number<input value={customerForm.gstNumber} onChange={(e) => setCustomerForm((c) => ({ ...c, gstNumber: e.target.value }))} /></label><button type="submit" className="primary-btn">{editingCustomerId ? 'Update customer' : 'Add customer'}</button></form><div className="contact-list">{customers.map((entry) => <div className="contact-card" key={entry.id}><div className="contact-header"><h4>{entry.name}</h4><div className="contact-actions"><button type="button" className="contact-btn" onClick={() => { setCustomerForm(entry); setEditingCustomerId(entry.id ?? null) }}>✎</button><button type="button" className="contact-btn delete" disabled={!entry.id} onClick={() => entry.id && void handleDeleteCustomer(entry.id)}>✕</button></div></div><p>{entry.email}</p><p>{entry.phone}</p><p>{entry.city}</p><span>{entry.gstNumber || 'No GST'}</span></div>)}</div></> : <><form onSubmit={handleVendorSubmit} className="stack-form"><div className="field-row"><label>Vendor name<input required value={vendorForm.name} onChange={(e) => setVendorForm((c) => ({ ...c, name: e.target.value }))} /></label><label>Email<input type="email" value={vendorForm.email} onChange={(e) => setVendorForm((c) => ({ ...c, email: e.target.value }))} /></label></div><div className="field-row"><label>Phone<input value={vendorForm.phone} onChange={(e) => setVendorForm((c) => ({ ...c, phone: e.target.value }))} /></label><label>City<input value={vendorForm.city} onChange={(e) => setVendorForm((c) => ({ ...c, city: e.target.value }))} /></label></div><button type="submit" className="primary-btn">{editingVendorId ? 'Update vendor' : 'Add vendor'}</button></form><div className="contact-list">{vendors.map((entry) => <div className="contact-card" key={entry.id}><div className="contact-header"><h4>{entry.name}</h4><div className="contact-actions"><button type="button" className="contact-btn" onClick={() => { setVendorForm(entry); setEditingVendorId(entry.id ?? null) }}>✎</button><button type="button" className="contact-btn delete" disabled={!entry.id} onClick={() => entry.id && void handleDeleteVendor(entry.id)}>✕</button></div></div><p>{entry.email}</p><p>{entry.phone}</p><p>{entry.city}</p></div>)}</div></>}</section>}
        {activeView === 'reports' && <section className="panel form-panel"><div className="panel-header"><div><p className="eyebrow">Analytics</p><h3>Financial reports</h3></div></div><div className="filter-row"><label>From date<input type="date" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)} /></label><label>To date<input type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} /></label></div><div className="report-section"><h4>Monthly breakdown</h4><div className="monthly-chart">{monthlyBreakdown.map((month) => <div key={month.month} className="month-bar"><div className="bar-container"><div className="bar income" style={{ height: `${Math.min((month.income / 300000) * 100, 100)}%` }} /><div className="bar expense" style={{ height: `${Math.min((month.expense / 300000) * 100, 100)}%` }} /></div><span className="month-label">{month.month}</span><div className="month-values"><small>{formatCurrency(month.income)}</small><small>-{formatCurrency(month.expense)}</small></div></div>)}</div></div><div className="report-section"><h4>Expense breakdown</h4>{categoryBreakdown.map((category) => <div key={category.name} className="category-row"><div className="category-info"><p>{category.name}</p></div><strong>{formatCurrency(category.amount)}</strong></div>)}</div></section>}
        {activeView === 'auth' && <section className="panel form-panel auth-panel"><div className="panel-header"><div><p className="eyebrow">Access</p><h3>{authMode === 'login' ? 'Login' : 'Create account'}</h3></div></div><div className="toggle-row"><button type="button" className={authMode === 'signup' ? 'segmented active' : 'segmented'} onClick={() => setAuthMode('signup')}>Sign up</button><button type="button" className={authMode === 'login' ? 'segmented active' : 'segmented'} onClick={() => setAuthMode('login')}>Login</button></div><form onSubmit={handleAuthSubmit} className="stack-form">{authMode === 'signup' && <label>Full name<input required value={authForm.fullName} onChange={(e) => setAuthForm((c) => ({ ...c, fullName: e.target.value }))} /></label>}<label>Email<input required type="email" value={authForm.email} onChange={(e) => setAuthForm((c) => ({ ...c, email: e.target.value }))} /></label><label>Password<input required minLength={6} type="password" value={authForm.password} onChange={(e) => setAuthForm((c) => ({ ...c, password: e.target.value }))} /></label>{authStatus && <p className="status-message">{authStatus}</p>}<button type="submit" className="primary-btn">{authMode === 'login' ? 'Log in' : 'Create account'}</button>{userEmail && <button type="button" className="ghost-btn" onClick={async () => { await supabase?.auth.signOut(); setUserEmail(''); setActiveView('auth') }}>Sign out</button>}</form></section>}
        {formMessage && <p className="status-message form-message">{formMessage}</p>}
      </main>
    </div>
  )
}

export default App
