import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { getDashboardData } from './lib/data'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type View = 'dashboard' | 'invoices' | 'expenses' | 'contacts' | 'auth'
type ContactTab = 'customers' | 'vendors'

type MetricCard = {
  label: string
  value: string
  change: string
  tone: 'positive' | 'warning' | 'neutral'
}

type Transaction = {
  client: string
  type: string
  date: string
  status: 'Paid' | 'Pending' | 'Review'
  amount: number
}

type CustomerRecord = {
  id?: string
  name: string
  email: string
  phone: string
  city: string
  gstNumber: string
}

type VendorRecord = {
  id?: string
  name: string
  email: string
  phone: string
  city: string
}

type InvoiceFormValues = {
  customer: string
  invoiceNumber: string
  amount: string
  tax: string
  dueDate: string
}

type ExpenseFormValues = {
  vendor: string
  amount: string
  category: string
  date: string
}

const fallbackTransactions: Transaction[] = [
  { client: 'Lahore Steel Works', type: 'Invoice', date: '2026-08-28', status: 'Paid', amount: 185000 },
  { client: 'Karachi Logistics', type: 'Expense', date: '2026-08-26', status: 'Pending', amount: -54000 },
  { client: 'Islamabad Pharma', type: 'Invoice', date: '2026-08-24', status: 'Paid', amount: 96250 },
  { client: 'Rawalpindi Services', type: 'Expense', date: '2026-08-22', status: 'Review', amount: -32000 },
  { client: 'Peshawar Retail', type: 'Invoice', date: '2026-08-18', status: 'Paid', amount: 138000 },
]

const fallbackCustomers: CustomerRecord[] = [
  { name: 'Lahore Steel Works', email: 'accounts@lahoresteel.com', phone: '+92 300 1234567', city: 'Lahore', gstNumber: '27-1234567-9' },
  { name: 'Islamabad Pharma', email: 'billing@islamabadpharma.com', phone: '+92 333 7654321', city: 'Islamabad', gstNumber: '10-9876543-2' },
]

const fallbackVendors: VendorRecord[] = [
  { name: 'Green Valley Office', email: 'ops@greenvalley.pk', phone: '+92 321 2223344', city: 'Karachi' },
  { name: 'Metro Logistics', email: 'finance@metrologistics.pk', phone: '+92 312 9876543', city: 'Peshawar' },
]

const fallbackStats = {
  revenue: 1248000,
  expenses: 642500,
  netProfit: 605500,
  dueTax: 96250,
}

const monthIncome = [72, 88, 65, 104, 118, 96, 132]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value)

const initialInvoiceForm: InvoiceFormValues = {
  customer: '',
  invoiceNumber: 'INV-2026-001',
  amount: '150000',
  tax: '17000',
  dueDate: '2026-09-10',
}

const initialExpenseForm: ExpenseFormValues = {
  vendor: '',
  amount: '25000',
  category: 'Office rent',
  date: '2026-09-02',
}

const initialCustomerForm: CustomerRecord = {
  name: '',
  email: '',
  phone: '',
  city: 'Karachi',
  gstNumber: '',
}

const initialVendorForm: VendorRecord = {
  name: '',
  email: '',
  phone: '',
  city: 'Karachi',
}

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [contactTab, setContactTab] = useState<ContactTab>('customers')
  const [transactions, setTransactions] = useState<Transaction[]>(fallbackTransactions)
  const [stats, setStats] = useState(fallbackStats)
  const [customers, setCustomers] = useState<CustomerRecord[]>(fallbackCustomers)
  const [vendors, setVendors] = useState<VendorRecord[]>(fallbackVendors)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
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

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      const sessionResult = await supabase?.auth.getSession()
      const userEmailFromSession = sessionResult?.data?.session?.user?.email ?? ''
      if (userEmailFromSession) {
        setUserEmail(userEmailFromSession)
      }

      const data = await getDashboardData()
      if (!isMounted) return

      const mappedTransactions = (data.transactions ?? []).map((item) => ({
        client: item.client_name ?? 'Customer',
        type: item.type ?? 'Invoice',
        date: item.transaction_date ?? new Date().toISOString().slice(0, 10),
        status: item.status ?? 'Pending',
        amount: Number(item.amount ?? 0),
      }))

      setTransactions(mappedTransactions.length ? mappedTransactions : fallbackTransactions)
      setStats({
        revenue: data.stats?.revenue ?? fallbackStats.revenue,
        expenses: data.stats?.expenses ?? fallbackStats.expenses,
        netProfit: data.stats?.netProfit ?? fallbackStats.netProfit,
        dueTax: data.stats?.dueTax ?? fallbackStats.dueTax,
      })
      setLoading(false)
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const metricCards = useMemo<MetricCard[]>(() => [
    { label: 'Total revenue', value: formatCurrency(stats.revenue), change: '+12.4% vs last month', tone: 'positive' },
    { label: 'Operating costs', value: formatCurrency(stats.expenses), change: '-3.2% vs last month', tone: 'neutral' },
    { label: 'Net profit', value: formatCurrency(stats.netProfit), change: '+8.7% vs last month', tone: 'positive' },
    { label: 'Sales tax due', value: formatCurrency(stats.dueTax), change: 'Due in 6 days', tone: 'warning' },
  ], [stats])

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!supabase) {
      setAuthStatus('Supabase is not configured yet. Add your keys in .env first.')
      return
    }

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.fullName,
            },
          },
        })

        if (error) {
          setAuthStatus(error.message)
          return
        }

        setAuthStatus('Account created. Please confirm your email if required.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        })

        if (error) {
          setAuthStatus(error.message)
          return
        }

        setAuthStatus('Logged in successfully.')
      }

      setUserEmail(authForm.email)
      setActiveView('dashboard')
    } catch (error) {
      setAuthStatus((error as Error).message)
    }
  }

  const handleInvoiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const invoiceTotal = Number(invoiceForm.amount) + Number(invoiceForm.tax)

    if (!supabase) {
      setTransactions((current) => [{
        client: invoiceForm.customer || 'New customer',
        type: 'Invoice',
        date: invoiceForm.dueDate || new Date().toISOString().slice(0, 10),
        status: 'Pending',
        amount: invoiceTotal,
      }, ...current])
      setFormMessage('Invoice added locally. Connect Supabase to persist it.')
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      setFormMessage('Log in before creating an invoice.')
      return
    }

    const payload = {
      user_id: authData.user.id,
      client_name: invoiceForm.customer || 'New customer',
      type: 'Invoice',
      status: 'Pending',
      amount: invoiceTotal,
      transaction_date: invoiceForm.dueDate || new Date().toISOString().slice(0, 10),
    }

    const { error } = await supabase.from('transactions').insert(payload)

    if (error) {
      setFormMessage(error.message)
      return
    }

    setTransactions((current) => [{
      client: payload.client_name,
      type: payload.type,
      date: payload.transaction_date,
      status: payload.status as 'Pending',
      amount: Number(payload.amount),
    }, ...current])
    setFormMessage('Invoice created successfully.')
    setInvoiceForm(initialInvoiceForm)
  }

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!supabase) {
      setTransactions((current) => [{
        client: expenseForm.vendor || 'Vendor',
        type: 'Expense',
        date: expenseForm.date || new Date().toISOString().slice(0, 10),
        status: 'Pending',
        amount: -Number(expenseForm.amount),
      }, ...current])
      setFormMessage('Expense added locally. Connect Supabase to persist it.')
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      setFormMessage('Log in before creating an expense.')
      return
    }

    const payload = {
      user_id: authData.user.id,
      client_name: expenseForm.vendor || 'Vendor',
      type: 'Expense',
      status: 'Pending',
      amount: Number(expenseForm.amount),
      transaction_date: expenseForm.date || new Date().toISOString().slice(0, 10),
    }

    const { error } = await supabase.from('transactions').insert(payload)

    if (error) {
      setFormMessage(error.message)
      return
    }

    setTransactions((current) => [{
      client: payload.client_name,
      type: payload.type,
      date: payload.transaction_date,
      status: payload.status as 'Pending',
      amount: -Number(payload.amount),
    }, ...current])
    setFormMessage('Expense created successfully.')
    setExpenseForm(initialExpenseForm)
  }

  const handleCustomerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextCustomer: CustomerRecord = { ...customerForm }

    if (editingCustomerId) {
      setCustomers((current) =>
        current.map((c) => (c.id === editingCustomerId ? { ...nextCustomer, id: editingCustomerId } : c))
      )
      setFormMessage('Customer updated successfully.')
      setCustomerForm(initialCustomerForm)
      setEditingCustomerId(null)
      return
    }

    if (!supabase) {
      const customerId = Math.random().toString(36).slice(2, 9)
      setCustomers((current) => [{ ...nextCustomer, id: customerId }, ...current])
      setFormMessage('Customer saved locally.')
      setCustomerForm(initialCustomerForm)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      setFormMessage('Log in before adding a customer.')
      return
    }

    const payload = {
      user_id: authData.user.id,
      name: nextCustomer.name,
      email: nextCustomer.email,
      phone: nextCustomer.phone,
      city: nextCustomer.city,
      gst_number: nextCustomer.gstNumber,
    }

    const { error } = await supabase.from('customers').insert(payload)

    if (error) {
      setFormMessage(error.message)
      return
    }

    setCustomers((current) => [nextCustomer, ...current])
    setFormMessage('Customer saved successfully.')
    setCustomerForm(initialCustomerForm)
  }

  const deleteCustomer = (customerId: string) => {
    setCustomers((current) => current.filter((c) => c.id !== customerId))
    setFormMessage('Customer deleted.')
  }

  const editCustomer = (customer: CustomerRecord) => {
    setCustomerForm(customer)
    setEditingCustomerId(customer.id || null)
  }

  const handleVendorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextVendor: VendorRecord = { ...vendorForm }

    if (editingVendorId) {
      setVendors((current) =>
        current.map((v) => (v.id === editingVendorId ? { ...nextVendor, id: editingVendorId } : v))
      )
      setFormMessage('Vendor updated successfully.')
      setVendorForm(initialVendorForm)
      setEditingVendorId(null)
      return
    }

    if (!supabase) {
      const vendorId = Math.random().toString(36).slice(2, 9)
      setVendors((current) => [{ ...nextVendor, id: vendorId }, ...current])
      setFormMessage('Vendor saved locally.')
      setVendorForm(initialVendorForm)
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      setFormMessage('Log in before adding a vendor.')
      return
    }

    const payload = {
      user_id: authData.user.id,
      name: nextVendor.name,
      email: nextVendor.email,
      phone: nextVendor.phone,
      city: nextVendor.city,
    }

    const { error } = await supabase.from('vendors').insert(payload)

    if (error) {
      setFormMessage(error.message)
      return
    }

    setVendors((current) => [nextVendor, ...current])
    setFormMessage('Vendor saved successfully.')
    setVendorForm(initialVendorForm)
  }

  const deleteVendor = (vendorId: string) => {
    setVendors((current) => current.filter((v) => v.id !== vendorId))
    setFormMessage('Vendor deleted.')
  }

  const editVendor = (vendor: VendorRecord) => {
    setVendorForm(vendor)
    setEditingVendorId(vendor.id || null)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <p className="eyebrow">Pakistan accounting</p>
            <h2>Alpha Ledger</h2>
          </div>
        </div>

        <nav className="nav">
          <button type="button" className={activeView === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('dashboard')}>Dashboard</button>
          <button type="button" className={activeView === 'invoices' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('invoices')}>Invoices</button>
          <button type="button" className={activeView === 'expenses' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('expenses')}>Expenses</button>
          <button type="button" className={activeView === 'contacts' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('contacts')}>Contacts</button>
          <button type="button" className={activeView === 'auth' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('auth')}>{userEmail ? 'Account' : 'Login'}</button>
        </nav>

        <div className="mini-card">
          <p className="eyebrow">Supabase</p>
          <strong className={isSupabaseConfigured ? 'connected' : 'warning'}>
            {isSupabaseConfigured ? 'Connected' : 'Needs env setup'}
          </strong>
          <small>
            {isSupabaseConfigured
              ? 'Ready for authentication and database sync.'
              : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
          </small>
        </div>
      </aside>

      <main className="main-panel">
        {activeView === 'dashboard' && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Overview</p>
                <h1>Business dashboard</h1>
              </div>

              <div className="topbar-actions">
                <button type="button" className="ghost-btn" onClick={() => setActiveView('invoices')}>New invoice</button>
                <button type="button" className="primary-btn" onClick={() => setActiveView('expenses')}>New expense</button>
              </div>
            </header>

            <section className="metric-grid">
              {metricCards.map((card) => (
                <article key={card.label} className="metric-card">
                  <div className="metric-topline">
                    <span>{card.label}</span>
                    <span className={`pill ${card.tone}`}>{card.change}</span>
                  </div>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </section>

            {loading && isSupabaseConfigured ? <p className="loading-note">Loading live data from Supabase…</p> : null}

            <section className="content-grid">
              <div className="panel revenue-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Performance</p>
                    <h3>Income vs expenses</h3>
                  </div>
                  <span className="panel-tag">This quarter</span>
                </div>

                <div className="chart">
                  {monthIncome.map((value, index) => (
                    <div key={index} className="bar-group">
                      <div className="bar income" style={{ height: `${value}%` }} aria-label={`Income month ${index + 1}`} />
                      <div className="bar expense" style={{ height: `${Math.max(value - 20, 28)}%` }} aria-label={`Expense month ${index + 1}`} />
                      <span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel tax-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Compliance</p>
                    <h3>Taxes & filings</h3>
                  </div>
                </div>

                <ul className="checklist">
                  <li><span className="dot green" /> GST filing due in 4 days</li>
                  <li><span className="dot amber" /> Payroll tax summary pending</li>
                  <li><span className="dot blue" /> Bank reconciliation updated</li>
                </ul>
              </div>
            </section>

            <section className="table-panel panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Ledger</p>
                  <h3>Recent transactions</h3>
                </div>
                <span className="panel-tag">Last 7 days</span>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="amount-column">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr key={`${transaction.client}-${transaction.date}-${transaction.type}-${index}`}>
                      <td>{transaction.client}</td>
                      <td>{transaction.type}</td>
                      <td>{transaction.date}</td>
                      <td>
                        <span className={`status ${transaction.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="amount-column positive-negative">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {activeView === 'invoices' && (
          <section className="panel form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Create</p>
                <h3>New invoice</h3>
              </div>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="stack-form">
              <div className="field-row">
                <label>
                  Customer name
                  <input value={invoiceForm.customer} onChange={(event) => setInvoiceForm((current) => ({ ...current, customer: event.target.value }))} placeholder="e.g. Lahore Steel Works" />
                </label>
                <label>
                  Invoice number
                  <input value={invoiceForm.invoiceNumber} onChange={(event) => setInvoiceForm((current) => ({ ...current, invoiceNumber: event.target.value }))} />
                </label>
              </div>

              <div className="field-row">
                <label>
                  Amount
                  <input type="number" value={invoiceForm.amount} onChange={(event) => setInvoiceForm((current) => ({ ...current, amount: event.target.value }))} />
                </label>
                <label>
                  Tax
                  <input type="number" value={invoiceForm.tax} onChange={(event) => setInvoiceForm((current) => ({ ...current, tax: event.target.value }))} />
                </label>
              </div>

              <label>
                Due date
                <input type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>

              <button type="submit" className="primary-btn">Save invoice</button>
            </form>
          </section>
        )}

        {activeView === 'expenses' && (
          <section className="panel form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Create</p>
                <h3>New expense</h3>
              </div>
            </div>

            <form onSubmit={handleExpenseSubmit} className="stack-form">
              <div className="field-row">
                <label>
                  Vendor
                  <input value={expenseForm.vendor} onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))} placeholder="e.g. Green Valley Office" />
                </label>
                <label>
                  Category
                  <input value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
              </div>

              <div className="field-row">
                <label>
                  Amount
                  <input type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
                </label>
                <label>
                  Date
                  <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))} />
                </label>
              </div>

              <button type="submit" className="primary-btn">Save expense</button>
            </form>
          </section>
        )}

        {activeView === 'contacts' && (
          <section className="panel form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Directory</p>
                <h3>Customers & vendors</h3>
              </div>
            </div>

            <div className="toggle-row">
              <button type="button" className={contactTab === 'customers' ? 'segmented active' : 'segmented'} onClick={() => setContactTab('customers')}>Customers</button>
              <button type="button" className={contactTab === 'vendors' ? 'segmented active' : 'segmented'} onClick={() => setContactTab('vendors')}>Vendors</button>
            </div>

            {contactTab === 'customers' ? (
              <>
                <form onSubmit={handleCustomerSubmit} className="stack-form">
                  <div className="field-row">
                    <label>
                      Customer name
                      <input value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Rawalpindi Traders" />
                    </label>
                    <label>
                      Email
                      <input type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" />
                    </label>
                  </div>

                  <div className="field-row">
                    <label>
                      Phone
                      <input value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+92 300 0000000" />
                    </label>
                    <label>
                      City
                      <input value={customerForm.city} onChange={(event) => setCustomerForm((current) => ({ ...current, city: event.target.value }))} placeholder="Islamabad" />
                    </label>
                  </div>

                  <label>
                    GST number
                    <input value={customerForm.gstNumber} onChange={(event) => setCustomerForm((current) => ({ ...current, gstNumber: event.target.value }))} placeholder="00-0000000-0" />
                  </label>

                  <button type="submit" className="primary-btn">{editingCustomerId ? 'Update customer' : 'Add customer'}</button>
                  {editingCustomerId && (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setEditingCustomerId(null)
                        setCustomerForm(initialCustomerForm)
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </form>

                <div className="contact-list">
                  {customers.map((entry) => (
                    <div className="contact-card" key={entry.id || `${entry.name}-${entry.email}`}>
                      <div className="contact-header">
                        <h4>{entry.name}</h4>
                        <div className="contact-actions">
                          <button type="button" className="contact-btn" onClick={() => editCustomer(entry)} title="Edit">✎</button>
                          <button type="button" className="contact-btn delete" onClick={() => deleteCustomer(entry.id || '')} title="Delete">✕</button>
                        </div>
                      </div>
                      <p>{entry.email}</p>
                      <p>{entry.phone}</p>
                      <p>{entry.city}</p>
                      <span>{entry.gstNumber || 'No GST'}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleVendorSubmit} className="stack-form">
                  <div className="field-row">
                    <label>
                      Vendor name
                      <input value={vendorForm.name} onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Metro Logistics" />
                    </label>
                    <label>
                      Email
                      <input type="email" value={vendorForm.email} onChange={(event) => setVendorForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" />
                    </label>
                  </div>

                  <div className="field-row">
                    <label>
                      Phone
                      <input value={vendorForm.phone} onChange={(event) => setVendorForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+92 321 0000000" />
                    </label>
                    <label>
                      City
                      <input value={vendorForm.city} onChange={(event) => setVendorForm((current) => ({ ...current, city: event.target.value }))} placeholder="Karachi" />
                    </label>
                  </div>

                  <button type="submit" className="primary-btn">{editingVendorId ? 'Update vendor' : 'Add vendor'}</button>
                  {editingVendorId && (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => {
                        setEditingVendorId(null)
                        setVendorForm(initialVendorForm)
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </form>

                <div className="contact-list">
                  {vendors.map((entry) => (
                    <div className="contact-card" key={entry.id || `${entry.name}-${entry.email}`}>
                      <div className="contact-header">
                        <h4>{entry.name}</h4>
                        <div className="contact-actions">
                          <button type="button" className="contact-btn" onClick={() => editVendor(entry)} title="Edit">✎</button>
                          <button type="button" className="contact-btn delete" onClick={() => deleteVendor(entry.id || '')} title="Delete">✕</button>
                        </div>
                      </div>
                      <p>{entry.email}</p>
                      <p>{entry.phone}</p>
                      <p>{entry.city}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeView === 'auth' && (
          <section className="panel form-panel auth-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Access</p>
                <h3>{authMode === 'login' ? 'Login' : 'Create account'}</h3>
              </div>
            </div>

            <div className="toggle-row">
              <button type="button" className={authMode === 'signup' ? 'segmented active' : 'segmented'} onClick={() => setAuthMode('signup')}>Sign up</button>
              <button type="button" className={authMode === 'login' ? 'segmented active' : 'segmented'} onClick={() => setAuthMode('login')}>Login</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="stack-form">
              {authMode === 'signup' && (
                <label>
                  Full name
                  <input value={authForm.fullName} onChange={(event) => setAuthForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Your name" />
                </label>
              )}

              <label>
                Email
                <input type="email" value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" />
              </label>

              <label>
                Password
                <input type="password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimum 6 characters" />
              </label>

              {authStatus && <p className="status-message">{authStatus}</p>}

              <button type="submit" className="primary-btn">
                {authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          </section>
        )}

        {formMessage && <p className="status-message form-message">{formMessage}</p>}
      </main>
    </div>
  )
}

export default App
