// ========================================
// MyWallet — State Management (Store)
// ========================================

const Store = {
  STORAGE_KEY: 'mywallet_data',
  _state: null, // In-memory cache to avoid repeated JSON.parse

  // Default state
  defaultState() {
    return {
      wallets: [],
      transactions: [],
      debts: [],
      bills: [],
      customCategories: [],
      settings: { setupComplete: false, currency: 'IDR' }
    };
  },

  // Load from localStorage (with in-memory caching)
  load() {
    // Return cached state if available
    if (this._state) return this._state;

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const state = { ...this.defaultState(), ...parsed };
        // Sync language setting to I18n
        if (state.settings && state.settings.lang) {
          I18n.currentLang = state.settings.lang;
        }
        // Sync theme setting to DOM
        if (state.settings && state.settings.theme) {
          document.documentElement.setAttribute('data-theme', state.settings.theme);
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
        }
        // Sync categories to memory (reset to DEFAULT_CATEGORIES first)
        if (typeof DEFAULT_CATEGORIES !== 'undefined') {
          for (const k in CATEGORIES) delete CATEGORIES[k];
          Object.assign(CATEGORIES, JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));
        }

        // Apply deleted categories filter
        if (state.deletedCategories && Array.isArray(state.deletedCategories)) {
          state.deletedCategories.forEach(key => {
            delete CATEGORIES[key];
          });
        }

        // Apply custom categories
        if (state.customCategories && Array.isArray(state.customCategories)) {
          state.customCategories.forEach(c => {
            CATEGORIES[c.key] = {
              name: c.name,
              icon: mIcon(c.iconName || 'label'),
              color: c.color || 'var(--mint-accent)',
              type: c.type,
              isCustom: true
            };
          });
        }
        this._state = state; // Cache the parsed state
        return state;
      }
    } catch (e) {
      console.error('Store load error:', e);
    }
    const def = this.defaultState();
    this._state = def;
    return def;
  },

  // Save to localStorage and update in-memory cache
  save(state) {
    try {
      this._state = state; // Update cache immediately
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Store save error:', e);
    }
  },

  // Invalidate cache (force re-read from localStorage on next load)
  invalidateCache() {
    this._state = null;
  },

  // Get current state
  getState() {
    return this.load();
  },

  // ── Wallet Operations ──

  addWallet(wallet) {
    const state = this.load();
    const newWallet = {
      id: Utils.id(),
      name: wallet.name,
      type: wallet.type,        // 'bank' | 'ewallet' | 'cash'
      balance: wallet.balance || 0,
      icon: wallet.icon || WALLET_TYPES[wallet.type]?.icon || Icons.wallet_bank,
      color: wallet.color || '#7c5cfc',
      createdAt: Date.now()
    };
    state.wallets.push(newWallet);
    this.save(state);
    return newWallet;
  },

  updateWallet(id, updates) {
    const state = this.load();
    const idx = state.wallets.findIndex(w => w.id === id);
    if (idx !== -1) {
      state.wallets[idx] = { ...state.wallets[idx], ...updates };
      this.save(state);
      return state.wallets[idx];
    }
    return null;
  },

  deleteWallet(id) {
    const state = this.load();
    state.wallets = state.wallets.filter(w => w.id !== id);
    this.save(state);
  },

  getWallet(id) {
    const state = this.load();
    return state.wallets.find(w => w.id === id) || null;
  },

  getWallets() {
    return this.load().wallets;
  },

  getTotalBalance() {
    return this.getWallets().reduce((sum, w) => sum + w.balance, 0);
  },

  // ── Transaction Operations ──

  addTransaction(tx) {
    const state = this.load();
    const newTx = {
      id: Utils.id(),
      type: tx.type,             // 'income' | 'expense'
      amount: Math.abs(tx.amount),
      category: tx.category,
      walletId: tx.walletId,
      date: tx.date || Utils.today(),
      note: tx.note || '',
      createdAt: Date.now()
    };

    // Update wallet balance
    const wIdx = state.wallets.findIndex(w => w.id === tx.walletId);
    if (wIdx !== -1) {
      if (tx.type === 'income') {
        state.wallets[wIdx].balance += newTx.amount;
      } else {
        state.wallets[wIdx].balance -= newTx.amount;
      }
    }

    state.transactions.push(newTx);
    this.save(state);
    return newTx;
  },

  updateTransaction(id, updates) {
    const state = this.load();
    const txIdx = state.transactions.findIndex(t => t.id === id);
    if (txIdx === -1) return null;

    const oldTx = state.transactions[txIdx];

    // Reverse old wallet balance
    const oldWIdx = state.wallets.findIndex(w => w.id === oldTx.walletId);
    if (oldWIdx !== -1) {
      if (oldTx.type === 'income') {
        state.wallets[oldWIdx].balance -= oldTx.amount;
      } else {
        state.wallets[oldWIdx].balance += oldTx.amount;
      }
    }

    // Apply updates
    const newTx = { ...oldTx, ...updates, amount: Math.abs(updates.amount || oldTx.amount) };
    state.transactions[txIdx] = newTx;

    // Apply new wallet balance
    const newWIdx = state.wallets.findIndex(w => w.id === newTx.walletId);
    if (newWIdx !== -1) {
      if (newTx.type === 'income') {
        state.wallets[newWIdx].balance += newTx.amount;
      } else {
        state.wallets[newWIdx].balance -= newTx.amount;
      }
    }

    this.save(state);
    return newTx;
  },

  deleteTransaction(id) {
    const state = this.load();
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    // Reverse wallet balance
    const wIdx = state.wallets.findIndex(w => w.id === tx.walletId);
    if (wIdx !== -1) {
      if (tx.type === 'income') {
        state.wallets[wIdx].balance -= tx.amount;
      } else {
        state.wallets[wIdx].balance += tx.amount;
      }
    }

    state.transactions = state.transactions.filter(t => t.id !== id);
    this.save(state);
  },

  getTransactions(filters = {}) {
    let txs = this.load().transactions;

    if (filters.type) txs = txs.filter(t => t.type === filters.type);
    if (filters.walletId) txs = txs.filter(t => t.walletId === filters.walletId);
    if (filters.category) txs = txs.filter(t => t.category === filters.category);
    if (filters.dateFrom) txs = txs.filter(t => t.date >= filters.dateFrom);
    if (filters.dateTo) txs = txs.filter(t => t.date <= filters.dateTo);
    if (filters.currentMonth) txs = txs.filter(t => Utils.isCurrentMonth(t.date));

    // Sort newest first
    txs.sort((a, b) => b.createdAt - a.createdAt);
    return txs;
  },

  getMonthlyIncome() {
    return this.getTransactions({ type: 'income', currentMonth: true })
      .reduce((s, t) => s + t.amount, 0);
  },

  getMonthlyExpense() {
    return this.getTransactions({ type: 'expense', currentMonth: true })
      .reduce((s, t) => s + t.amount, 0);
  },

  // Get today's total expense
  getDailyExpense() {
    const today = Utils.today();
    return this.getTransactions({ type: 'expense' })
      .filter(t => t.date === today)
      .reduce((s, t) => s + t.amount, 0);
  },

  // Get this week's total expense (Mon-Sun)
  getWeeklyExpense() {
    const weekStart = Utils.startOfWeek();
    const today = Utils.today();
    return this.getTransactions({ type: 'expense' })
      .filter(t => t.date >= weekStart && t.date <= today)
      .reduce((s, t) => s + t.amount, 0);
  },

  // Get expense by category for a given period: 'daily' | 'weekly' | 'monthly'
  getExpenseByCategoryPeriod(period = 'monthly') {
    let txs;
    if (period === 'daily') {
      const today = Utils.today();
      txs = this.getTransactions({ type: 'expense' }).filter(t => t.date === today);
    } else if (period === 'weekly') {
      const weekStart = Utils.startOfWeek();
      const today = Utils.today();
      txs = this.getTransactions({ type: 'expense' }).filter(t => t.date >= weekStart && t.date <= today);
    } else {
      txs = this.getTransactions({ type: 'expense', currentMonth: true });
    }
    const map = {};
    txs.forEach(t => {
      if (!map[t.category]) map[t.category] = 0;
      map[t.category] += t.amount;
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({ category: cat, amount }))
      .sort((a, b) => b.amount - a.amount);
  },

  getExpenseByCategory() {
    return this.getExpenseByCategoryPeriod('monthly');
  },

  // ── Debt Operations ──

  addDebt(debt) {
    const state = this.load();
    const newDebt = {
      id: Utils.id(),
      type: debt.type,           // 'debt' | 'receivable'
      personName: debt.personName,
      amount: Math.abs(debt.amount),
      walletId: debt.walletId,
      date: debt.date || Utils.today(),
      note: debt.note || '',
      isPaid: false,
      paidDate: null,
      createdAt: Date.now()
    };

    // Update wallet balance
    const wIdx = state.wallets.findIndex(w => w.id === debt.walletId);
    if (wIdx !== -1) {
      if (debt.type === 'receivable') {
        // Piutang: uang keluar dari wallet
        state.wallets[wIdx].balance -= newDebt.amount;
      } else {
        // Hutang: uang masuk ke wallet
        state.wallets[wIdx].balance += newDebt.amount;
      }
    }

    state.debts.push(newDebt);
    this.save(state);
    return newDebt;
  },

  markDebtPaid(id, paidWalletId = null) {
    const state = this.load();
    const dIdx = state.debts.findIndex(d => d.id === id);
    if (dIdx === -1) return;

    const debt = state.debts[dIdx];
    debt.isPaid = true;
    debt.paidDate = Utils.today();
    if (paidWalletId) {
      debt.paidWalletId = paidWalletId;
    }

    const targetWalletId = paidWalletId || debt.walletId;
    const wIdx = state.wallets.findIndex(w => w.id === targetWalletId);
    if (wIdx !== -1) {
      if (debt.type === 'receivable') {
        // Piutang lunas: uang kembali ke target wallet
        state.wallets[wIdx].balance += debt.amount;
      } else {
        // Hutang lunas: uang keluar dari target wallet
        state.wallets[wIdx].balance -= debt.amount;
      }
    }

    this.save(state);
  },

  deleteDebt(id) {
    const state = this.load();
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;

    // If not paid, reverse wallet balance
    if (!debt.isPaid) {
      const wIdx = state.wallets.findIndex(w => w.id === debt.walletId);
      if (wIdx !== -1) {
        if (debt.type === 'receivable') {
          state.wallets[wIdx].balance += debt.amount;
        } else {
          state.wallets[wIdx].balance -= debt.amount;
        }
      }
    }

    state.debts = state.debts.filter(d => d.id !== id);
    this.save(state);
  },

  getDebts(filters = {}) {
    let debts = this.load().debts;
    if (filters.type) debts = debts.filter(d => d.type === filters.type);
    if (filters.isPaid !== undefined) debts = debts.filter(d => d.isPaid === filters.isPaid);
    
    if (filters.month !== undefined && filters.year !== undefined) {
      debts = debts.filter(d => {
        const targetDate = (d.isPaid && d.paidDate) ? d.paidDate : d.date;
        if (!targetDate) return true;
        const parts = targetDate.split('-').map(Number);
        const y = parts[0];
        const m = parts[1];
        if (filters.month !== 0 && m !== filters.month) return false;
        if (filters.year !== 0 && y !== filters.year) return false;
        return true;
      });
    }

    debts.sort((a, b) => b.createdAt - a.createdAt);
    return debts;
  },

  getTotalDebt() {
    return this.getDebts({ type: 'debt', isPaid: false }).reduce((s, d) => s + d.amount, 0);
  },

  getTotalReceivable() {
    return this.getDebts({ type: 'receivable', isPaid: false }).reduce((s, d) => s + d.amount, 0);
  },

  // ── Settings ──

  completeSetup() {
    const state = this.load();
    state.settings.setupComplete = true;
    this.save(state);
  },

  isSetupComplete() {
    return this.load().settings.setupComplete;
  },

  getLanguage() {
    return this.load().settings.lang || 'id';
  },

  setLanguage(lang) {
    const state = this.load();
    if (!state.settings) state.settings = {};
    state.settings.lang = lang;
    this.save(state);
    if (typeof I18n !== 'undefined') {
      I18n.currentLang = lang;
    }
  },

  // Transfer between wallets
  transfer(fromId, toId, amount) {
    const state = this.load();
    const fromIdx = state.wallets.findIndex(w => w.id === fromId);
    const toIdx = state.wallets.findIndex(w => w.id === toId);
    if (fromIdx === -1 || toIdx === -1) return false;
    if (state.wallets[fromIdx].balance < amount) return false;
    state.wallets[fromIdx].balance -= amount;
    state.wallets[toIdx].balance += amount;
    this.save(state);
    return true;
  },

  // ── Custom Category Operations ──
  addCustomCategory(cat) {
    const state = this.load();
    if (!state.customCategories) state.customCategories = [];
    const key = 'custom_' + Utils.id();
    const newCat = {
      key,
      name: cat.name,
      type: cat.type, // 'expense' | 'income'
      iconName: cat.iconName || 'label',
      color: cat.color || 'var(--mint-accent)',
      createdAt: Date.now()
    };
    state.customCategories.push(newCat);
    this.save(state);

    // Register in memory
    CATEGORIES[key] = {
      name: newCat.name,
      icon: mIcon(newCat.iconName),
      color: newCat.color,
      type: newCat.type,
      isCustom: true
    };
    return newCat;
  },

  deleteCategory(key) {
    const state = this.load();
    if (!state.deletedCategories) state.deletedCategories = [];
    if (!state.customCategories) state.customCategories = [];

    const cat = CATEGORIES[key];
    const isCustom = cat && cat.isCustom;

    if (isCustom) {
      state.customCategories = state.customCategories.filter(c => c.key !== key);
    } else {
      if (!state.deletedCategories.includes(key)) {
        state.deletedCategories.push(key);
      }
    }

    delete CATEGORIES[key];
    this.save(state);
  },

  deleteCustomCategory(key) {
    this.deleteCategory(key);
  },

  resetCategories() {
    const state = this.load();
    state.customCategories = [];
    state.deletedCategories = [];

    if (typeof DEFAULT_CATEGORIES !== 'undefined') {
      for (const k in CATEGORIES) delete CATEGORIES[k];
      Object.assign(CATEGORIES, JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));
    }

    this.save(state);
  },

  getTheme() {
    const state = this.load();
    return (state.settings && state.settings.theme) || 'light';
  },

  setTheme(theme) {
    const state = this.load();
    state.settings = state.settings || {};
    state.settings.theme = theme;
    this.save(state);
    document.documentElement.setAttribute('data-theme', theme);
  },

  // ── BILLS MANAGEMENT ──
  getBills(filters = {}) {
    const state = this.load();
    let bills = state.bills || [];

    if (filters.isPaid !== undefined) {
      bills = bills.filter(b => b.isPaid === filters.isPaid);
    }

    if (filters.month && filters.month > 0 && filters.isPaid) {
      bills = bills.filter(b => {
        const targetDate = b.paidDate || b.dueDate;
        if (!targetDate) return false;
        const m = parseInt(targetDate.substring(5, 7), 10);
        return m === filters.month;
      });
    }

    if (filters.year && filters.year > 0 && filters.isPaid) {
      bills = bills.filter(b => {
        const targetDate = b.paidDate || b.dueDate;
        if (!targetDate) return false;
        const y = parseInt(targetDate.substring(0, 4), 10);
        return y === filters.year;
      });
    }

    // Sort ACTIVE bills by closest deadline first (dueDate ascending, no-deadline at the end)
    if (filters.isPaid === false || filters.isPaid === undefined) {
      bills.sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    } else {
      // Paid bills sorted by paidDate descending
      bills.sort((a, b) => {
        const dateA = a.paidDate || a.dueDate || a.createdAt;
        const dateB = b.paidDate || b.dueDate || b.createdAt;
        return new Date(dateB) - new Date(dateA);
      });
    }

    return bills;
  },

  getTotalActiveBills() {
    return this.getBills({ isPaid: false }).reduce((sum, b) => sum + b.amount, 0);
  },

  getAdjustedBalance() {
    const total = this.getTotalBalance();
    const activeBills = this.getTotalActiveBills();
    const totalDebt = this.getTotalDebt();
    const totalReceivable = this.getTotalReceivable();
    return total - activeBills + totalReceivable - totalDebt;
  },

  addBill(bill) {
    const state = this.load();
    state.bills = state.bills || [];
    const newBill = {
      id: Utils.id(),
      title: bill.title,
      amount: bill.amount,
      dueDate: bill.dueDate,
      walletId: bill.walletId || '',
      note: bill.note || '',
      isPaid: false,
      paidDate: null,
      paidWalletId: null,
      notified1d: false,
      notified12h: false,
      notified1h: false,
      createdAt: Date.now()
    };
    state.bills.push(newBill);
    this.save(state);
    return newBill;
  },

  markBillPaid(billId, walletId) {
    const state = this.load();
    state.bills = state.bills || [];
    const bill = state.bills.find(b => b.id === billId);
    if (!bill || bill.isPaid) return false;

    bill.isPaid = true;
    bill.paidDate = Utils.today();
    bill.paidWalletId = walletId;
    this.save(state);

    // Record automatically as an expense transaction
    this.addTransaction({
      type: 'expense',
      amount: bill.amount,
      category: 'cat_bills',
      walletId: walletId,
      date: Utils.today(),
      note: `Pelunasan Tagihan: ${bill.title}${bill.note ? ' (' + bill.note + ')' : ''}`
    });

    return true;
  },

  updateBill(billId, updatedData) {
    const state = this.load();
    state.bills = state.bills || [];
    const billIdx = state.bills.findIndex(b => b.id === billId);
    if (billIdx === -1) return false;

    const oldBill = state.bills[billIdx];
    const dueDateChanged = updatedData.dueDate && updatedData.dueDate !== oldBill.dueDate;

    state.bills[billIdx] = {
      ...oldBill,
      title: updatedData.title !== undefined ? updatedData.title : oldBill.title,
      amount: updatedData.amount !== undefined ? updatedData.amount : oldBill.amount,
      dueDate: updatedData.dueDate !== undefined ? updatedData.dueDate : oldBill.dueDate,
      walletId: updatedData.walletId !== undefined ? updatedData.walletId : oldBill.walletId,
      note: updatedData.note !== undefined ? updatedData.note : oldBill.note,
      notified1d: dueDateChanged ? false : oldBill.notified1d,
      notified12h: dueDateChanged ? false : oldBill.notified12h,
      notified1h: dueDateChanged ? false : oldBill.notified1h,
    };

    this.save(state);
    return true;
  },

  deleteBill(billId) {
    const state = this.load();
    if (state.bills) {
      state.bills = state.bills.filter(b => b.id !== billId);
      this.save(state);
    }
  },

  // ── DEADLINE NOTIFICATION POLLER ──
  checkBillNotifications() {
    const activeBills = this.getBills({ isPaid: false });
    if (activeBills.length === 0) return;

    const now = Date.now();
    let stateChanged = false;

    activeBills.forEach(bill => {
      if (!bill.dueDate) return;
      const dueTime = new Date(bill.dueDate).getTime();
      const diffMs = dueTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Notification 1: 1 Day (24h) before deadline
      if (diffHours <= 24 && diffHours > 12 && !bill.notified1d) {
        bill.notified1d = true;
        stateChanged = true;
        this._fireNotification(
          `📌 Tagihan Besok Deadline: ${bill.title}`,
          `Tagihan ${bill.title} sejumlah ${Utils.formatRupiah(bill.amount)} akan jatuh tempo dalam 24 jam!`
        );
      }
      // Notification 2: 12 Hours before deadline
      else if (diffHours <= 12 && diffHours > 1 && !bill.notified12h) {
        bill.notified12h = true;
        stateChanged = true;
        this._fireNotification(
          `⏰ Tagihan 12 Jam Lagi: ${bill.title}`,
          `Tagihan ${bill.title} (${Utils.formatRupiah(bill.amount)}) harus dibayar dalam 12 jam!`
        );
      }
      // Notification 3: 1 Hour before deadline
      else if (diffHours <= 1 && diffHours > 0 && !bill.notified1h) {
        bill.notified1h = true;
        stateChanged = true;
        this._fireNotification(
          `⚠️ DARURAT: Tagihan 1 Jam Lagi: ${bill.title}`,
          `Tagihan ${bill.title} (${Utils.formatRupiah(bill.amount)}) akan jatuh tempo dalam 1 jam!`
        );
      }
    });

    if (stateChanged) {
      const state = this.load();
      this.save(state);
    }
  },

  _fireNotification(title, body) {
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(`${title} — ${body}`, 'warning');
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: './icon-192.png' });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }
  },

  // Export all data as JSON
  exportData() {
    return JSON.stringify(this.load(), null, 2);
  },

  // Import data from JSON
  importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this.save(data);
      return true;
    } catch (e) {
      return false;
    }
  }
};
