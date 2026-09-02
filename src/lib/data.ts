import { supabase } from './supabase'

type TransactionRow = {
  id: string
  client_name: string
  type: 'Invoice' | 'Expense' | 'Payment' | 'Transfer'
  status: 'Paid' | 'Pending' | 'Review'
  amount: number | string
  transaction_date: string
  notes?: string | null
}

type DashboardStats = {
  revenue: number
  expenses: number
  netProfit: number
  dueTax: number
}

const emptyStats: DashboardStats = { revenue: 0, expenses: 0, netProfit: 0, dueTax: 0 }

export async function getDashboardData() {
  if (!supabase) return { transactions: [] as TransactionRow[], stats: emptyStats }

  const [transactionResult, invoiceResult, expenseResult] = await Promise.all([
    supabase.from('transactions').select('id,client_name,type,status,amount,transaction_date,notes').order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(25),
    supabase.from('invoices').select('id,invoice_number,customer_id,issue_date,due_date,status,subtotal,tax,total,created_at').order('issue_date', { ascending: false }).order('created_at', { ascending: false }).limit(25),
    supabase.from('expenses').select('id,description,amount,expense_date,category,status,created_at').order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(25),
  ])

  if (transactionResult.error || invoiceResult.error || expenseResult.error) {
    console.error('Could not fetch accounting data', transactionResult.error ?? invoiceResult.error ?? expenseResult.error)
    return { transactions: [], stats: emptyStats }
  }

  const transactions = (transactionResult.data ?? []) as TransactionRow[]
  const invoices = invoiceResult.data ?? []
  const expenses = expenseResult.data ?? []

  const invoiceRows: TransactionRow[] = invoices.map((invoice) => ({
    id: `invoice:${invoice.id}`,
    client_name: invoice.invoice_number,
    type: 'Invoice',
    status: invoice.status === 'Paid' ? 'Paid' : invoice.status === 'Overdue' ? 'Review' : 'Pending',
    amount: Number(invoice.total ?? 0),
    transaction_date: invoice.issue_date,
    notes: invoice.customer_id ?? null,
  }))

  const expenseRows: TransactionRow[] = expenses.map((expense) => ({
    id: `expense:${expense.id}`,
    client_name: expense.description || expense.category || 'Expense',
    type: 'Expense',
    status: expense.status,
    amount: Number(expense.amount ?? 0),
    transaction_date: expense.expense_date,
    notes: expense.category ?? null,
  }))

  const recent = [...invoiceRows, ...expenseRows, ...transactions]
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 25)

  const revenue = invoices.reduce((sum, item) => item.status === 'Paid' ? sum + Number(item.total ?? 0) : sum, 0)
  const expensesTotal = expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  const dueTax = invoices.reduce((sum, item) => ['Sent', 'Overdue'].includes(item.status) ? sum + Number(item.tax ?? 0) : sum, 0)

  return {
    transactions: recent,
    stats: { revenue, expenses: expensesTotal, netProfit: revenue - expensesTotal, dueTax },
  }
}

export async function getCustomers() {
  if (!supabase) return []
  const { data, error } = await supabase.from('customers').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function getVendors() {
  if (!supabase) return []
  const { data, error } = await supabase.from('vendors').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function updateCustomer(id: string, values: { name: string; email: string; phone: string; city: string; gst_number: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('customers').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCustomer(id: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

export async function updateVendor(id: string, values: { name: string; email: string; phone: string; city: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('vendors').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteVendor(id: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  if (error) throw error
}

export async function updateInvoiceStatus(id: string, status: 'Paid' | 'Pending' | 'Review') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const invoiceStatus = status === 'Paid' ? 'Paid' : status === 'Review' ? 'Overdue' : 'Sent'
  const { error } = await supabase.from('invoices').update({ status: invoiceStatus }).eq('id', id)
  if (error) throw error
}

export async function updateExpenseStatus(id: string, status: 'Paid' | 'Pending' | 'Review') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('expenses').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateTransactionStatus(id: string, status: 'Paid' | 'Pending' | 'Review') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('transactions').update({ status }).eq('id', id)
  if (error) throw error
}
