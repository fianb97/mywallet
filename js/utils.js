// ========================================
// MyWallet — Utility Functions
// ========================================

const Utils = {
  // Cached Intl.NumberFormat singleton (expensive to create)
  _numFmt: null,
  _getNumFmt() {
    if (!this._numFmt) this._numFmt = new Intl.NumberFormat('id-ID');
    return this._numFmt;
  },

  // Generate unique ID
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // Format to Rupiah (uses cached formatter)
  formatRupiah(amount, showSign = false) {
    const abs = Math.abs(amount);
    const formatted = this._getNumFmt().format(abs);
    const sign = showSign ? (amount >= 0 ? '+' : '-') : (amount < 0 ? '-' : '');
    return `${sign}Rp ${formatted}`;
  },

  // Short format (1jt, 500rb)
  formatShort(amount) {
    const abs = Math.abs(amount);
    if (abs >= 1000000) return `${(abs / 1000000).toFixed(1).replace('.0', '')}jt`;
    if (abs >= 1000) return `${(abs / 1000).toFixed(0)}rb`;
    return abs.toString();
  },

  // Parse Rupiah input string to number
  parseRupiah(str) {
    if (typeof str === 'number') return str;
    return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
  },

  // Cached date formatters
  _dateFmtCache: {},
  _getDateFmt(locale, options) {
    const key = locale + JSON.stringify(options);
    if (!this._dateFmtCache[key]) {
      this._dateFmtCache[key] = new Intl.DateTimeFormat(locale, options);
    }
    return this._dateFmtCache[key];
  },

  _getLocale() {
    return (typeof I18n !== 'undefined' && I18n.getLang() === 'en') ? 'en-US' : 'id-ID';
  },

  // Format date
  formatDate(dateStr) {
    const d = new Date(dateStr);
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    return this._getDateFmt(this._getLocale(), opts).format(d);
  },

  // Format relative date
  formatRelativeDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return `${diffDays} ${t('daysAgo')}`;
    return Utils.formatDate(dateStr);
  },

  // Format date for grouping
  formatDateGroup(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return this._getDateFmt(this._getLocale(), opts).format(d);
  },

  // Get today's date as YYYY-MM-DD (local time)
  today() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Get current month & year label
  currentMonthLabel() {
    const opts = { month: 'long', year: 'numeric' };
    return this._getDateFmt(this._getLocale(), opts).format(new Date());
  },

  // Get long date string
  longDate() {
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return this._getDateFmt(this._getLocale(), opts).format(new Date());
  },

  // Check if date is in current month
  isCurrentMonth(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  },

  // Get start of current week (Monday)
  startOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${d}`;
  },

  // Escape HTML to prevent XSS (reuses a single element)
  _escapeEl: null,
  escapeHtml(str) {
    if (!str) return '';
    if (!this._escapeEl) this._escapeEl = document.createElement('span');
    this._escapeEl.textContent = str;
    return this._escapeEl.innerHTML;
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
};

// ── Helper: Material Symbol icon generator ──
function mIcon(name, fill = false) {
  const style = fill ? ' style="font-variation-settings: \'FILL\' 1;"' : '';
  return `<span class="material-symbols-outlined"${style}>${name}</span>`;
}

// ── Helper: Get wallet Material icon by type ──
function getWalletIcon(wallet) {
  if (!wallet) return mIcon('account_balance_wallet');
  const typeIcons = {
    bank: 'account_balance',
    ewallet: 'phone_iphone',
    cash: 'payments'
  };
  return mIcon(typeIcons[wallet.type] || 'account_balance_wallet');
}

// ── Material Symbol Icons ──
const Icons = {
  dashboard:    mIcon('dashboard'),
  transactions: mIcon('receipt_long'),
  wallet:       mIcon('account_balance_wallet'),
  debt:         mIcon('handshake'),
  ai:           mIcon('smart_toy'),
  plus:         mIcon('add'),
  x:            mIcon('close'),
  menu:         mIcon('menu'),
  send:         mIcon('send'),
  check:        mIcon('check_circle'),
  trash:        mIcon('delete'),
  edit:         mIcon('edit'),
  arrowUp:      mIcon('arrow_upward'),
  arrowDown:    mIcon('arrow_downward'),
  transfer:     mIcon('sync_alt'),
  search:       mIcon('search'),
  settings:     mIcon('settings'),
  notification: mIcon('notifications'),
  person:       mIcon('person'),
  more:         mIcon('more_vert'),
  addCircle:    mIcon('add_circle'),
  trendUp:      mIcon('trending_up'),
  balance:      mIcon('balance'),
  callReceived: mIcon('call_received'),
  callMade:     mIcon('call_made'),

  // Category icons (Material Symbols)
  cat_food:          mIcon('restaurant'),
  cat_transport:     mIcon('directions_car'),
  cat_shopping:      mIcon('shopping_bag'),
  cat_bills:         mIcon('bolt'),
  cat_health:        mIcon('medical_services'),
  cat_entertainment: mIcon('movie'),
  cat_education:     mIcon('school'),
  cat_tax:           mIcon('description'),
  cat_charity:       mIcon('favorite'),
  cat_installment:   mIcon('calendar_month'),
  cat_salary:        mIcon('payments'),
  cat_bonus:         mIcon('emoji_events'),
  cat_sales:         mIcon('sell'),
  cat_investment:    mIcon('trending_up'),
  cat_allowance:     mIcon('work'),
  cat_refund:        mIcon('replay'),
  cat_gift:          mIcon('redeem'),

  // Wallet type icons
  wallet_bank:    mIcon('account_balance'),
  wallet_ewallet: mIcon('phone_iphone'),
  wallet_cash:    mIcon('payments')
};

// ── Category Definitions ──
const DEFAULT_CATEGORIES = {
  // Expenses
  food:          { name: 'Makanan & Minuman', icon: Icons.cat_food, color: 'var(--cat-food)', type: 'expense' },
  transport:     { name: 'Transportasi', icon: Icons.cat_transport, color: 'var(--cat-transport)', type: 'expense' },
  shopping:      { name: 'Belanja/Pakaian', icon: Icons.cat_shopping, color: 'var(--cat-shopping)', type: 'expense' },
  bills:         { name: 'Tagihan', icon: Icons.cat_bills, color: 'var(--cat-bills)', type: 'expense' },
  health:        { name: 'Kesehatan', icon: Icons.cat_health, color: 'var(--cat-health)', type: 'expense' },
  entertainment: { name: 'Hiburan', icon: Icons.cat_entertainment, color: 'var(--cat-entertainment)', type: 'expense' },
  education:     { name: 'Pendidikan', icon: Icons.cat_education, color: 'var(--cat-education)', type: 'expense' },
  tax:           { name: 'Pajak', icon: Icons.cat_tax, color: 'var(--cat-tax)', type: 'expense' },
  charity:       { name: 'Sedekah/Donasi', icon: Icons.cat_charity, color: 'var(--cat-charity)', type: 'expense' },
  installment:   { name: 'Cicilan', icon: Icons.cat_installment, color: 'var(--cat-installment)', type: 'expense' },
  // Income
  salary:        { name: 'Gaji Bulanan', icon: Icons.cat_salary, color: 'var(--cat-salary)', type: 'income' },
  bonus:         { name: 'Bonus/THR', icon: Icons.cat_bonus, color: 'var(--cat-bonus)', type: 'income' },
  sales:         { name: 'Hasil Penjualan', icon: Icons.cat_sales, color: 'var(--cat-sales)', type: 'income' },
  investment:    { name: 'Dividen/Investasi', icon: Icons.cat_investment, color: 'var(--cat-investment)', type: 'income' },
  allowance:     { name: 'Uang Saku', icon: Icons.cat_allowance, color: 'var(--cat-allowance)', type: 'income' },
  refund:        { name: 'Kembalian', icon: Icons.cat_refund, color: 'var(--cat-refund)', type: 'income' },
  gift:          { name: 'Hibah/Hadiah', icon: Icons.cat_gift, color: 'var(--cat-gift)', type: 'income' },
};

const CATEGORIES = { ...DEFAULT_CATEGORIES };

// ── Wallet Type Definitions ──
const WALLET_TYPES = {
  bank:    { name: 'Bank', icon: Icons.wallet_bank },
  ewallet: { name: 'E-Wallet', icon: Icons.wallet_ewallet },
  cash:    { name: 'Cash', icon: Icons.wallet_cash },
};

// Helper to get translated category name
Utils.getCategoryName = function(key) {
  const cat = CATEGORIES[key];
  if (!cat) return key || '';
  if (cat.isCustom) return cat.name;
  const translated = t('cat_' + key);
  return (translated && translated !== 'cat_' + key) ? translated : cat.name;
};

// Helper to get translated wallet type name
Utils.getWalletTypeName = function(typeKey) {
  const wt = WALLET_TYPES[typeKey];
  if (!wt) return typeKey || '';
  const translated = t('walletType_' + typeKey);
  return (translated && translated !== 'walletType_' + typeKey) ? translated : wt.name;
};

