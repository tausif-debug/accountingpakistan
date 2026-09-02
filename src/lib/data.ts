import { supabase } from './supabase'

export async function getDashboardData() {
  if (!supabase) {
    return {
      transactions: [],
      stats: {
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        dueTax: 0,
      },
    }
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(8)

  if (error) {
    console.error('Could not fetch transactions', error)
    return {
      transactions: [],
      stats: {
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        dueTax: 0,
      },
    }
  }

  return {
    transactions: data ?? [],
    stats: {
      revenue: (data ?? []).reduce((sum, item) => {
        if (item.type === 'Invoice' && item.status === 'Paid') return sum + Number(item.amount)
        return sum
      }, 0),
      expenses: (data ?? []).reduce((sum, item) => {
        if (item.type === 'Expense') return sum + Number(item.amount)
        return sum
      }, 0),
      netProfit: (data ?? []).reduce((sum, item) => {
        if (item.type === 'Invoice' && item.status === 'Paid') return sum + Number(item.amount)
        if (item.type === 'Expense') return sum - Number(item.amount)
        return sum
      }, 0),
      dueTax: (data ?? []).reduce((sum, item) => {
        if (item.type === 'Invoice' && item.status === 'Pending') return sum + Number(item.amount) * 0.17
        return sum
      }, 0),
    },
  }
}
