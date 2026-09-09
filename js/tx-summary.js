// ========================================================
// MyWallet — Transaction Period Summary (strangler kandidat 4b)
// Agregasi chart murni keluar dari openPeriodChartModal.
// Tanpa DOM/Store: daftar tx di-inject; rendering tetap di caller.
// ========================================================

// Murni: income/totalExpense/balance + expense per kategori terurut turun.
// Transfer & tipe lain diabaikan (paritas caller lama).
function summarizePeriod(txs) {
  const list = txs || [];
  const expenses = list.filter(t => t.type === 'expense');
  const income = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const balance = income - totalExpense;

  const catMap = {};
  expenses.forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });

  const expByCategory = Object.entries(catMap)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) || 0 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { income, totalExpense, balance, expByCategory };
}
