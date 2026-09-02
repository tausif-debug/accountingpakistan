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

const emptyStats: DashboardStats = {
  revenue: 0,
  expenses: 0,
  netProfit: 0,
  dueTax: 0,
}

/**
 * Loads recent rows separately from the financial aggregates.
 * The old implementation calculated totals from only the eight most recent
 * transactions, which made the dashboard mathematically incorrect as soon
 * as a business had more than eight records.
 */
export async function getDashboardData() {
  if (!supabase) {
    return { transactions: [] as TransactionRow[], stats: emptyStats }
  }

  const [recentResult, transactionTotalsResult, invoiceTaxResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('id,client_name,type,status,amount,transaction_date,notes')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('transactions')
      .select('type,status,amount'),
    supabase
      .from('invoices')
      .select('status,tax')
      .in('status', ['Draft', 'Sent', 'Overdue']),
  ])

  if (recentResult.error || transactionTotalsResult.error) {
    console.error('Could not fetch accounting data', recentResult.error ?? transactionTotalsResult.error)
    return { transactions: [], stats: emptyStats }
  }

  const totals = transactionTotalsResult.data ?? []
  const invoices = invoiceTaxResult.error ? [] : invoiceTaxResult.data ?? []

  const revenue = totals.reduce((sum, item) => {
    return item.type === 'Invoice' && item.status === 'Paid' ? sum + Number(item.amount) : sum
  }, 0)

  const expenses = totals.reduce((sum, item) => {
    return item.type === 'Expense' ? sum + Number(item.amount) : sum
  }, 0)

  const dueTax = invoices.reduce((sum, item) => sum + Number(item.tax ?? 0), 0)

  return {
    transactions: (recentResult.data ?? []) as TransactionRow[],
    stats: {
      revenue,
      expenses,
      netProfit: revenue - expenses,
      dueTax,
    },
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

export async function updateTransactionStatus(id: string, status: 'Paid' | 'Pending' | 'Review') {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('transactions').update({ status }).eq('id', id)
  if (error) throw error
}
