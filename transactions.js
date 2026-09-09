// ========================================
// MyWallet — Transactions Page (Verdant Glass)
// ========================================

function renderTransactions(container) {
  let currentPeriod = 'daily'; // 'daily' | 'weekly' | 'monthly'
  let currentFilter = { type: '', walletId: '' };
  let navDate = new Date(); // reference date for navigation
  let collapsedGroups = new Set(); // track user-collapsed groups

  // ── Period grouping murni via js/tx-periods.js (strangler kandidat 4a).
  // State closure (navDate/currentPeriod/cachedAllTxs) tetap di sini.

  // ── Navigation label & step ──
  function getNavLabel() {
    return getPeriodNavLabel(currentPeriod, navDate, Store.getTransactions({}), Utils._getLocale());
  }

  function navPrev() {
    navDate = stepPeriodDate(currentPeriod, navDate, -1);
    collapsedGroups.clear();
    render();
  }
  function navNext() {
    navDate = stepPeriodDate(currentPeriod, navDate, 1);
    collapsedGroups.clear();
    render();
  }

  // ── Period groups: panggil modul langsung (tanpa wrapper; nama global
  // getPeriodGroups dipakai apa adanya di render() di bawah).

  let searchQuery = '';
  let cachedAllTxs = [];

  // ── Filter transactions for a date range (delegasi modul murni) ──
  function getTxForRange(startStr, endStr) {
    return filterTxsByRange(cachedAllTxs, startStr, endStr);
  }

  // ── Render a period group card ──
  function renderPeriodGroup(group, idx) {
    const txs = getTxForRange(group.startStr, group.endStr);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const hasTx = txs.length > 0;

    if (!hasTx) return ''; // Hide empty period groups for a clean view

    const balanceFormatted = (balance >= 0 ? '+' : '-') + 'Rp ' + Utils._getNumFmt().format(Math.abs(balance));
    const balanceClass = balance >= 0 ? 'text-income' : 'text-expense';

    // ── YEARLY VIEW: Summary Card with Drill-Down to Monthly View & Chart ──
    if (currentPeriod === 'yearly') {
      return `
        <div class="card year-summary-card" data-start-date="${group.startStr}" style="padding:18px;margin-bottom:12px;transition:transform 0.2s ease, box-shadow 0.2s ease;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);">${group.label}</h3>
              <span style="font-size:12px;color:var(--outline);font-weight:500;">12 Months</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn--ghost period-chart-btn" data-start-date="${group.startStr}" data-end-date="${group.endStr}" data-label="${group.label}" data-type="${t('periodYear')}" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--primary);background:rgba(0,69,13,0.08);padding:6px 12px;border-radius:var(--radius-full);border:none;cursor:pointer;">
                ${mIcon('pie_chart')}
                <span>${t('viewChart')}</span>
              </button>
              <button type="button" class="btn--ghost year-drill-btn" data-start-date="${group.startStr}" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#ffffff;background:var(--primary);padding:6px 12px;border-radius:var(--radius-full);border:none;cursor:pointer;">
                <span>${t('viewMonths')}</span>
                ${mIcon('chevron_right')}
              </button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--outline-variant);flex-wrap:wrap;gap:8px;">
            <div>
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('income')}</span>
              <span class="mono text-income" style="font-weight:600;font-size:14px;">+Rp ${Utils._getNumFmt().format(income)}</span>
            </div>
            <div>
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('expense')}</span>
              <span class="mono text-expense" style="font-weight:600;font-size:14px;">-Rp ${Utils._getNumFmt().format(expense)}</span>
            </div>
            <div style="text-align:right;">
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('netBalance')}</span>
              <span class="mono ${balanceClass}" style="font-weight:700;font-size:15px;">${balanceFormatted}</span>
            </div>
          </div>
        </div>
      `;
    }

    // ── MONTHLY VIEW: Summary Card with Drill-Down to Weekly View & Chart ──
    if (currentPeriod === 'monthly') {
      return `
        <div class="card month-summary-card" data-start-date="${group.startStr}" style="padding:18px;margin-bottom:12px;transition:transform 0.2s ease, box-shadow 0.2s ease;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);">${group.label}</h3>
              ${group.sublabel ? `<span style="font-size:12px;color:var(--outline);font-weight:500;">${group.sublabel}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn--ghost period-chart-btn" data-start-date="${group.startStr}" data-end-date="${group.endStr}" data-label="${group.label}" data-type="${t('periodMonth')}" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--primary);background:rgba(0,69,13,0.08);padding:6px 12px;border-radius:var(--radius-full);border:none;cursor:pointer;">
                ${mIcon('pie_chart')}
                <span>${t('viewChart')}</span>
              </button>
              <button type="button" class="btn--ghost month-drill-btn" data-start-date="${group.startStr}" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#ffffff;background:var(--primary);padding:6px 12px;border-radius:var(--radius-full);border:none;cursor:pointer;">
                <span>${t('viewWeeks')}</span>
                ${mIcon('chevron_right')}
              </button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--outline-variant);flex-wrap:wrap;gap:8px;">
            <div>
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('income')}</span>
              <span class="mono text-income" style="font-weight:600;font-size:14px;">+Rp ${Utils._getNumFmt().format(income)}</span>
            </div>
            <div>
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('expense')}</span>
              <span class="mono text-expense" style="font-weight:600;font-size:14px;">-Rp ${Utils._getNumFmt().format(expense)}</span>
            </div>
            <div style="text-align:right;">
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('netBalance')}</span>
              <span class="mono ${balanceClass}" style="font-weight:700;font-size:15px;">${balanceFormatted}</span>
            </div>
          </div>
        </div>
      `;
    }

    // ── WEEKLY VIEW: Summary Card with Drill-Down to Daily View & Chart ──
    if (currentPeriod === 'weekly') {
      return `
        <div class="card week-summary-card" data-start-date="${group.startStr}" style="padding:18px;margin-bottom:12px;transition:transform 0.2s ease, box-shadow 0.2s ease;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
              <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);">${group.label}</h3>
              ${group.sublabel ? `<span style="font-size:12px;color:var(--outline);font-weight:500;">${group.sublabel}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn--ghost period-chart-btn" data-start-date="${group.startStr}" data-end-date="${group.endStr}" data-label="${group.label}" data-type="${t('periodWeek')}" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--primary);background:rgba(0,69,13,0.08);padding:6px 12px;border-radius:var(--radius-full);border:none;cursor:pointer;">
                ${mIcon('pie_chart')}
                <span>${t('viewChart')}</span>
              </button>
              <button type="button" class="btn--ghost week-drill-btn" data-start-date="${group.startStr}" style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#ffffff;background:var(--primary);padding:6px 12px;border-radius:var(--radius-full);border:none;cursor:pointer;">
                <span>${t('viewDays')}</span>
                ${mIcon('chevron_right')}
              </button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--outline-variant);flex-wrap:wrap;gap:8px;">
            <div>
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('income')}</span>
              <span class="mono text-income" style="font-weight:600;font-size:14px;">+Rp ${Utils._getNumFmt().format(income)}</span>
            </div>
            <div>
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('expense')}</span>
              <span class="mono text-expense" style="font-weight:600;font-size:14px;">-Rp ${Utils._getNumFmt().format(expense)}</span>
            </div>
            <div style="text-align:right;">
              <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:0.05em;">${t('netBalance')}</span>
              <span class="mono ${balanceClass}" style="font-weight:700;font-size:15px;">${balanceFormatted}</span>
            </div>
          </div>
        </div>
      `;
    }

    // ── DAILY VIEW: Date Header + Individual Transaction Cards ──
    const isCollapsed = collapsedGroups.has(idx);
    const isExpanded = !isCollapsed;

    return `
      <div class="tx-group" data-group-idx="${idx}">
        <!-- Pinned Date & Daily Total Header -->
        <div class="tx-group__header" data-toggle="${idx}" style="cursor:pointer;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(192,201,187,0.4);padding-bottom:8px;padding-left:4px;padding-right:4px;">
          <div>
            <h3 class="tx-group__date" style="font-size:15px;font-weight:600;color:var(--on-surface);">${group.label}</h3>
            ${group.sublabel ? `<span style="font-size:12px;color:var(--outline);">${group.sublabel}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="btn--ghost period-chart-btn" data-start-date="${group.startStr}" data-end-date="${group.endStr}" data-label="${group.label}" data-type="${t('periodDay')}" style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--primary);background:rgba(0,69,13,0.08);padding:4px 10px;border-radius:var(--radius-full);border:none;cursor:pointer;">
              ${mIcon('pie_chart')}
              <span>${t('viewChart')}</span>
            </button>
            <span class="mono ${balanceClass}" style="font-size:15px;font-weight:700;">
              ${balanceFormatted}
            </span>
            <span style="transition:transform 0.2s;transform:rotate(${isExpanded ? '180deg' : '0deg'});color:var(--outline);font-size:18px;">
              ${mIcon('keyboard_arrow_down')}
            </span>
          </div>
        </div>

        <!-- Transactions List under the Date Header -->
        <div class="tx-group__body" style="display:${isExpanded ? 'flex' : 'none'};flex-direction:column;gap:12px;margin-top:12px;">
          ${txs.map(tx => renderTxCard(tx)).join('')}
        </div>
      </div>
    `;
  }

  function renderTxCard(tx) {
    const cat = CATEGORIES[tx.category] || { icon: mIcon('label') };
    const catName = Utils.getCategoryName(tx.category);
    const wallet = Store.getWallet(tx.walletId);
    const walletName = wallet ? wallet.name : '—';
    const isIncome = tx.type === 'income';
    const isTransfer = tx.type === 'transfer';
    let iconClass = 'tx-card__icon--expense';
    let amountClass = 'text-expense';
    let sign = '-';

    if (isIncome) {
      iconClass = 'tx-card__icon--income';
      amountClass = 'text-income';
      sign = '+';
    } else if (isTransfer) {
      iconClass = 'tx-card__icon--transfer';
      amountClass = 'text-secondary';
      sign = '';
    }

    return `
      <div class="tx-card" data-tx-id="${tx.id}">
        <div class="tx-card__left">
          <div class="tx-card__icon ${iconClass}">
            ${cat.icon}
          </div>
          <div class="tx-card__info">
            <span class="tx-card__name">${tx.note ? Utils.escapeHtml(tx.note) : Utils.escapeHtml(cat.name)}</span>
            <div class="tx-card__tags">
              <span class="tx-card__tag">${Utils.escapeHtml((cat.name || 'OTHER').toUpperCase())}</span>
              <span class="tx-card__separator">•</span>
              <span class="tx-card__wallet">${Utils.escapeHtml(walletName)}</span>
            </div>
          </div>
        </div>
        <span class="tx-card__amount ${amountClass} mono">${sign}${Utils._getNumFmt().format(tx.amount)}</span>
      </div>
    `;
  }

  // ── Delegated click handler (bound ONCE per page visit; see bottom).
  // NOTE: must NOT live inside render(): container persists across renders
  // (only innerHTML is replaced), so addEventListener here would stack N
  // listeners and fire 1 click N times (bug #1).
  function handleTxContainerClick(e) {
    const txCard = e.target.closest('.tx-card');
    if (txCard) {
      e.stopPropagation();
      const txId = txCard.dataset.txId;
      const tx = cachedAllTxs.find(t => t.id === txId);
      if (tx) showTxDetail(tx);
      return;
    }

    const chartBtn = e.target.closest('.period-chart-btn');
    if (chartBtn) {
      e.stopPropagation();
      const startDate = chartBtn.dataset.startDate;
      const endDate = chartBtn.dataset.endDate;
      const label = chartBtn.dataset.label;
      const pType = chartBtn.dataset.type || '';
      if (startDate && endDate) {
        openPeriodChartModal(startDate, endDate, label, pType);
      }
      return;
    }

    const yearElem = e.target.closest('.year-drill-btn, .year-summary-card');
    if (yearElem) {
      const startDate = yearElem.dataset.startDate;
      if (startDate) {
        navDate = parseLocalYYYYMMDD(startDate);
        currentPeriod = 'monthly';
        collapsedGroups.clear();
        render();
      }
      return;
    }

    const monthElem = e.target.closest('.month-drill-btn, .month-summary-card');
    if (monthElem) {
      const startDate = monthElem.dataset.startDate;
      if (startDate) {
        navDate = parseLocalYYYYMMDD(startDate);
        currentPeriod = 'weekly';
        collapsedGroups.clear();
        render();
      }
      return;
    }

    const weekElem = e.target.closest('.week-drill-btn, .week-summary-card');
    if (weekElem) {
      const startDate = weekElem.dataset.startDate;
      if (startDate) {
        navDate = parseLocalYYYYMMDD(startDate);
        currentPeriod = 'daily';
        collapsedGroups.clear();
        render();
      }
      return;
    }

    const header = e.target.closest('.tx-group__header');
    if (header) {
      const idx = parseInt(header.dataset.toggle, 10);
      if (!isNaN(idx)) {
        if (collapsedGroups.has(idx)) {
          collapsedGroups.delete(idx);
        } else {
          collapsedGroups.add(idx);
        }
        render();
      }
      return;
    }
  }

  // ── Main render ──
  function render() {
    const wallets = Store.getWallets();
    const groups = getPeriodGroups(currentPeriod, navDate, Store.getTransactions({}), Utils._getLocale());

    // Cache filtered dataset ONCE per render cycle
    cachedAllTxs = Store.getTransactions(currentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      cachedAllTxs = cachedAllTxs.filter(t => {
        const catName = Utils.getCategoryName(t.category).toLowerCase();
        const note = (t.note || '').toLowerCase();
        const amt = String(t.amount);
        return catName.includes(q) || note.includes(q) || amt.includes(q);
      });
    }

    container.innerHTML = `
      <!-- Header Section -->
      <div class="page-header" style="animation:fadeInUp .35s var(--ease-out)">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="page-header__title">${t('transactionsTitle')}</h2>
            <p class="page-header__subtitle">${t('transactionsSubtitle')}</p>
          </div>
          <!-- Period Selector -->
          <div class="tab-switcher" id="period-tabs">
            <button class="tab-switcher__tab ${currentPeriod === 'daily' ? 'active' : ''}" data-period="daily">${t('periodDay')}</button>
            <button class="tab-switcher__tab ${currentPeriod === 'weekly' ? 'active' : ''}" data-period="weekly">${t('periodWeek')}</button>
            <button class="tab-switcher__tab ${currentPeriod === 'monthly' ? 'active' : ''}" data-period="monthly">${t('periodMonth')}</button>
            <button class="tab-switcher__tab ${currentPeriod === 'yearly' ? 'active' : ''}" data-period="yearly">${t('periodYear')}</button>
          </div>
        </div>
      </div>

      <!-- Navigation Bar -->
      <div class="card section" style="animation:fadeInUp .4s var(--ease-out);padding:12px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <button class="btn btn--ghost btn--icon" id="nav-prev" aria-label="${t('navPrev')}">${mIcon('chevron_left')}</button>
          <span style="font-family:var(--font-mono);font-weight:700;font-size:16px;color:var(--on-surface);">${getNavLabel()}</span>
          <button class="btn btn--ghost btn--icon" id="nav-next" aria-label="${t('navNext')}">${mIcon('chevron_right')}</button>
        </div>
      </div>

      <!-- Filter Glass Container -->
      <div class="filter-container section" style="animation:fadeInUp .45s var(--ease-out)">
        <!-- Search Input -->
        <div class="search-input">
          ${mIcon('search')}
          <input type="text" id="tx-search-input" placeholder="${t('searchPlaceholder')}" aria-label="${t('searchPlaceholder')}" value="${Utils.escapeHtml(searchQuery)}">
        </div>
        <!-- Filter Chips Bar -->
        <div class="filter-chips">
          <span class="filter-chips__label">FILTERS:</span>
          <select id="filter-type" style="width:auto;padding:6px 12px;border-radius:var(--radius-full);font-size:12px;font-weight:700;">
            <option value="">${t('filterAll')}</option>
            <option value="income" ${currentFilter.type === 'income' ? 'selected' : ''}>${t('filterIncome')}</option>
            <option value="expense" ${currentFilter.type === 'expense' ? 'selected' : ''}>${t('filterExpense')}</option>
          </select>
          <select id="filter-wallet" style="width:auto;padding:6px 12px;border-radius:var(--radius-full);font-size:12px;font-weight:700;">
            <option value="">${t('filterWalletAll')}</option>
            ${wallets.map(w => `<option value="${w.id}" ${currentFilter.walletId === w.id ? 'selected' : ''}>${Utils.escapeHtml(w.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Period Groups -->
      <div class="section" style="display:flex;flex-direction:column;gap:24px;animation:fadeInUp .5s var(--ease-out)">
        ${groups.map((g, i) => renderPeriodGroup(g, i)).join('')}
      </div>
    `;

    // ── Bind Events ──

    // Debounced search input
    const searchInp = container.querySelector('#tx-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', Utils.debounce((e) => {
        searchQuery = e.target.value.trim();
        render();
        const updatedInp = container.querySelector('#tx-search-input');
        if (updatedInp) {
          updatedInp.focus();
          updatedInp.selectionStart = updatedInp.selectionEnd = updatedInp.value.length;
        }
      }, 250));
    }

    // Period tab switch
    container.querySelectorAll('#period-tabs .tab-switcher__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentPeriod = tab.dataset.period;
        navDate = new Date();
        collapsedGroups.clear();
        render();
      });
    });

    // Navigation
    container.querySelector('#nav-prev').addEventListener('click', navPrev);
    container.querySelector('#nav-next').addEventListener('click', navNext);

    // Filters
    container.querySelector('#filter-type').addEventListener('change', (e) => {
      currentFilter.type = e.target.value;
      render();
    });
    container.querySelector('#filter-wallet').addEventListener('change', (e) => {
      currentFilter.walletId = e.target.value;
      render();
    });

  }

  // ── Transaction Detail Modal ──
  function showTxDetail(tx) {
    const cat = CATEGORIES[tx.category] || { icon: mIcon('label') };
    const catName = Utils.getCategoryName(tx.category);
    Modal.open(t('activity'), `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:48px;margin-bottom:8px;color:var(--primary);">${cat.icon}</div>
        <div class="mono" style="font-size:var(--fs-2xl);font-weight:700;color:${tx.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
          ${tx.type === 'income' ? '+' : '-'}${Utils.formatRupiah(tx.amount)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;justify-content:space-between;"><span class="text-secondary">${t('selectCategory')}</span><span>${Utils.escapeHtml(catName)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span class="text-secondary">${t('wallets')}</span><span>${Utils.escapeHtml((Store.getWallet(tx.walletId) || {}).name || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;"><span class="text-secondary">${t('dateLabel')}</span><span>${Utils.formatDate(tx.date)}</span></div>
        ${tx.note ? `<div style="display:flex;justify-content:space-between;"><span class="text-secondary">${t('noteLabel')}</span><span>${Utils.escapeHtml(tx.note)}</span></div>` : ''}
      </div>
    `, {
      footerHtml: `
        <button class="btn btn--primary btn--sm" id="modal-edit-tx">${mIcon('edit')} Edit</button>
        <button class="btn btn--danger btn--sm" id="modal-delete-tx">${mIcon('delete')} Hapus</button>
        <button class="btn btn--secondary btn--sm" onclick="Modal.close()">Tutup</button>
      `,
      onOpen(overlay) {
        overlay.querySelector('#modal-edit-tx').addEventListener('click', () => {
          Modal.close();
          openTransactionForm({
            editId: tx.id,
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            walletId: tx.walletId,
            date: tx.date,
            note: tx.note
          });
        });
        overlay.querySelector('#modal-delete-tx').addEventListener('click', () => {
          const ok = Store.deleteTransaction(tx.id);
          if (!ok) { Toast.show(t('insufficientBalance'), 'error'); return; }
          Modal.close();
          render();
          Toast.show('Transaksi dihapus', 'success');
        });
      }
    });
  }

  // ── Open Period Donut Chart Modal (Weekly, Monthly, Yearly) ──
  function openPeriodChartModal(startDate, endDate, label, periodType = '') {
    const txs = getTxForRange(startDate, endDate);
    // Strangler kandidat 4b: agregasi via modul murni (rendering tetap di sini).
    const { income, totalExpense, balance, expByCategory } = summarizePeriod(txs);
    const expenses = txs.filter(t => t.type === 'expense');

    const bodyHtml = `
      <div style="text-align:center;margin-bottom:16px;">
        <span style="font-size:12px;color:var(--outline);font-weight:600;text-transform:uppercase;">${t('viewChart')} ${periodType}</span>
        <h3 style="font-size:18px;font-weight:700;color:var(--on-surface);margin-top:2px;">${label}</h3>
      </div>

      <!-- Donut Canvas Container -->
      <div style="display:flex;justify-content:center;align-items:center;margin-bottom:20px;min-height:180px;">
        ${expenses.length === 0 ? `
          <div style="text-align:center;color:var(--outline);font-size:13px;padding:20px;">
            ${mIcon('pie_chart')}
            <div style="margin-top:8px;">${t('noExpensesYet')}</div>
          </div>
        ` : `<canvas id="modal-period-chart" width="180" height="180"></canvas>`}
      </div>

      <!-- Category Breakdown List -->
      ${expByCategory.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;max-height:180px;overflow-y:auto;padding-right:4px;">
          ${expByCategory.map(d => {
            const cat = CATEGORIES[d.category] || { icon: mIcon('label'), color: '#888' };
            const catName = Utils.getCategoryName(d.category);
            const pct = d.pct;
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:var(--radius-md);background:var(--surface);">
                <div style="color:${cat.color};font-size:20px;">${cat.icon}</div>
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;">
                      <span>${Utils.escapeHtml(catName)}</span>
                    <span class="mono">${Utils.formatRupiah(d.amount)} (${pct}%)</span>
                  </div>
                  <div style="width:100%;height:4px;background:var(--outline-variant);border-radius:2px;margin-top:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${cat.color};border-radius:2px;"></div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- Totals Summary Grid -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:var(--radius-lg);background:rgba(0,69,13,0.04);border:1px solid var(--outline-variant);">
        <div>
          <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;">${t('income')}</span>
          <span class="mono text-income" style="font-weight:700;font-size:13px;">+${Utils.formatRupiah(income)}</span>
        </div>
        <div>
          <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;">${t('expense')}</span>
          <span class="mono text-expense" style="font-weight:700;font-size:13px;">-${Utils.formatRupiah(totalExpense)}</span>
        </div>
        <div style="text-align:right;">
          <span style="display:block;font-size:10px;font-weight:700;color:var(--outline);text-transform:uppercase;">${t('netBalance')}</span>
          <span class="mono" style="font-weight:700;font-size:14px;color:${balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
            ${Utils.formatRupiah(balance, true)}
          </span>
        </div>
      </div>
    `;

    Modal.open(`${t('viewChart')}`, bodyHtml, {
      footerHtml: `<button class="btn btn--secondary btn--full" onclick="Modal.close()">${t('close')}</button>`,
      onOpen(overlay) {
        if (expByCategory.length > 0) {
          setTimeout(() => {
            const canvas = overlay.querySelector('#modal-period-chart');
            if (canvas && typeof drawExpenseChart === 'function') {
              drawExpenseChart(expByCategory, canvas);
            }
          }, 100);
        }
      }
    });
  }

  // Bind delegated handler exactly once per page visit. Router reuses the
  // same #page-content element, so drop the previous closure's listener first.
  if (container._txDelegatedHandler) {
    container.removeEventListener('click', container._txDelegatedHandler);
  }
  container._txDelegatedHandler = handleTxContainerClick;
  container.addEventListener('click', handleTxContainerClick);

  render();
}
