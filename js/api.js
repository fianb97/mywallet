// ========================================
// MyWallet — Hermes API (window.MyWalletAPI)
// ========================================
// Fasad baca/tulis untuk agen eksternal (cf. docs/hermes-api.md).
// - BACA mengembalikan snapshot JSON murni (bukan referensi live Store).
// - TULIS selalu delegasi ke Store (guard/invarian/persist) lalu refresh UI.
// - Amplop hasil: { ok: true, data } / { ok: false, message }.
// - JANGAN tulis localStorage langsung dari sini (cache _state Store +
//   invarian saldo akan rusak).
(function () {
  function snap(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function ok(data) {
    return { ok: true, data };
  }

  function fail(message) {
    return { ok: false, message };
  }

  function refresh() {
    try {
      if (typeof refreshShell === 'function') {
        refreshShell(function () {});
        return;
      }
      if (typeof Router !== 'undefined' && Router && typeof Router.handleRoute === 'function') {
        Router.handleRoute();
      }
    } catch (e) { /* UI opsional di harness */ }
  }

  function reqStr(v, name) {
    if (typeof v !== 'string' || v.trim() === '') return `${name} wajib string tak kosong`;
    return null;
  }

  function reqAmount(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || !(n > 0)) return 'amount harus > 0';
    return null;
  }

  function wrote(result, message) {
    // Store: null/false = ditolak guard; objek/true = berhasil.
    if (result === null || result === false || typeof result === 'undefined') {
      return fail(message);
    }
    refresh();
    return ok(snap(result));
  }

  const api = {
    version: '1.0.0',

    // ── Snapshot & backup ──
    getState() {
      return ok(snap(Store.getState()));
    },
    exportData() {
      return ok(Store.exportData());
    },
    importData(jsonStr) {
      if (typeof jsonStr !== 'string' || !jsonStr.trim()) return fail('jsonStr wajib string JSON');
      const r = Store.importData(jsonStr);
      if (!r) return fail('JSON tidak valid');
      refresh();
      return ok(true);
    },

    // ── Transaksi ──
    getTransactions(filters) {
      return ok(snap(Store.getTransactions(filters || {})));
    },
    addTransaction(tx) {
      if (!tx || typeof tx !== 'object') return fail('tx wajib objek');
      if (tx.type !== 'income' && tx.type !== 'expense') return fail("type wajib 'income'|'expense'");
      const bad = reqAmount(tx.amount);
      if (bad) return fail(bad);
      return wrote(
        Store.addTransaction({ type: tx.type, amount: Number(tx.amount), category: tx.category, walletId: tx.walletId, date: tx.date, note: tx.note }),
        'transaksi ditolak guard (saldo kurang / dompet tak dikenal)'
      );
    },
    updateTransaction(id, updates) {
      const badId = reqStr(id, 'id');
      if (badId) return fail(badId);
      if (!updates || typeof updates !== 'object') return fail('updates wajib objek');
      if (updates.amount !== undefined) {
        const bad = reqAmount(updates.amount);
        if (bad) return fail(bad);
      }
      return wrote(Store.updateTransaction(id, updates), 'transaksi tak ditemukan / ditolak guard');
    },
    deleteTransaction(id) {
      const badId = reqStr(id, 'id');
      if (badId) return fail(badId);
      return wrote(Store.deleteTransaction(id) ? true : false, 'transaksi tak ditemukan / ditolak guard');
    },
    transfer(fromId, toId, amount) {
      if (reqStr(fromId, 'fromId') || reqStr(toId, 'toId')) return fail('fromId/toId wajib string tak kosong');
      const bad = reqAmount(amount);
      if (bad) return fail(bad);
      return wrote(Store.transfer(fromId, toId, Number(amount)) ? true : false, 'transfer ditolak guard (saldo kurang / dompet tak dikenal)');
    },

    // ── Dompet ──
    getWallets() {
      return ok(snap(Store.getWallets()));
    },
    addWallet(w) {
      if (!w || typeof w !== 'object') return fail('wallet wajib objek');
      const bad = reqStr(w.name, 'name');
      if (bad) return fail(bad);
      return wrote(Store.addWallet({ name: w.name, type: w.type, balance: Number(w.balance) || 0 }), 'gagal tambah dompet');
    },
    updateWallet(id, updates) {
      const badId = reqStr(id, 'id');
      if (badId) return fail(badId);
      if (!updates || typeof updates !== 'object') return fail('updates wajib objek');
      return wrote(Store.updateWallet(id, updates), 'dompet tak ditemukan');
    },
    deleteWallet(id) {
      const badId = reqStr(id, 'id');
      if (badId) return fail(badId);
      return wrote(Store.deleteWallet(id) ? true : false, 'dompet tak ditemukan');
    },

    // ── Hutang-piutang ──
    getDebts(filters) {
      return ok(snap(Store.getDebts(filters || {})));
    },
    addDebt(d) {
      if (!d || typeof d !== 'object') return fail('debt wajib objek');
      if (d.type !== 'debt' && d.type !== 'receivable') return fail("type wajib 'debt'|'receivable'");
      const badName = reqStr(d.personName, 'personName');
      if (badName) return fail(badName);
      const bad = reqAmount(d.amount);
      if (bad) return fail(bad);
      return wrote(
        Store.addDebt({ type: d.type, personName: d.personName, amount: Number(d.amount), walletId: d.walletId, date: d.date, note: d.note }),
        'gagal catat hutang'
      );
    },
    markDebtPaid(id, paidWalletId) {
      const badId = reqStr(id, 'id');
      if (badId) return fail(badId);
      return wrote(Store.markDebtPaid(id, paidWalletId || null) ? true : false, 'hutang tak ditemukan / sudah lunas / saldo kurang');
    },
    deleteDebt(id) {
      const badId = reqStr(id, 'id');
      if (badId) return fail(badId);
      return wrote(Store.deleteDebt(id) ? true : false, 'hutang tak ditemukan / ditolak guard');
    },

    // ── Tagihan ──
    getBills(filters) {
      return ok(snap(Store.getBills(filters || {})));
    },
    addBill(b) {
      if (!b || typeof b !== 'object') return fail('bill wajib objek');
      const badTitle = reqStr(b.title, 'title');
      if (badTitle) return fail(badTitle);
      const bad = reqAmount(b.amount);
      if (bad) return fail(bad);
      return wrote(
        Store.addBill({ title: b.title, amount: Number(b.amount), dueDate: b.dueDate, walletId: b.walletId, note: b.note }),
        'gagal catat tagihan'
      );
    },
    markBillPaid(billId, walletId) {
      if (reqStr(billId, 'billId') || reqStr(walletId, 'walletId')) return fail('billId/walletId wajib string tak kosong');
      return wrote(Store.markBillPaid(billId, walletId) ? true : false, 'tagihan tak ditemukan / sudah lunas / saldo kurang');
    },
    updateBill(billId, updates) {
      const badId = reqStr(billId, 'billId');
      if (badId) return fail(badId);
      if (!updates || typeof updates !== 'object') return fail('updates wajib objek');
      return wrote(Store.updateBill(billId, updates), 'tagihan tak ditemukan');
    },
    deleteBill(billId) {
      const badId = reqStr(billId, 'billId');
      if (badId) return fail(badId);
      return wrote(Store.deleteBill(billId) ? true : false, 'tagihan tak ditemukan');
    },

    // ── Ringkasan ──
    getTotalBalance() {
      return ok(Store.getTotalBalance());
    },
    getAdjustedBalance() {
      return ok(Store.getAdjustedBalance());
    },
    getTotalDebt() {
      return ok(Store.getTotalDebt());
    },
    getTotalReceivable() {
      return ok(Store.getTotalReceivable());
    },
  };

  if (typeof window !== 'undefined') {
    window.MyWalletAPI = api;
  }
})();
