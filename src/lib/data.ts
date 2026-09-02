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

type DashboardStats = { revenue: number; expenses: number; netProfit: number; dueTax: number }
const emptyStats: DashboardStats = { revenue: 0, expenses: 0, netProfit: 0, dueTax: 0 }

type DashboardRpc = { revenue: number | string; expenses: number | string; dueTax: number | string; transactions: TransactionRow[] }

export async function getDashboardData() {
  if (!supabase) return { transactions: [] as TransactionRow[], stats: emptyStats }
  const { data, error } = await supabase.rpc('get_dashboard_summary')
  if (error) {
    console.error('Could not fetch accounting dashboard', error)
    return { transactions: [], stats: emptyStats }
  }
  const summary = data as DashboardRpc
  const revenue = Number(summary.revenue ?? 0)
  const expenses = Number(summary.expenses ?? 0)
  return {
    transactions: Array.isArray(summary.transactions) ? summary.transactions : [],
    stats: { revenue, expenses, netProfit: revenue - expenses, dueTax: Number(summary.dueTax ?? 0) },
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
