// ========================================
// MyWallet — Dashboard Page (Verdant Glass)
// ========================================

function renderDashboard(container) {
  // Load state ONCE and compute all needed values from it
  const state = Store.getState();
  const wallets = state.wallets;
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const now = new Date();
  const todayStr = Utils.today();
  const startOfWeekStr = Utils.startOfWeek();
  const allTx = state.transactions;

  // Daily transactions for today (Pemasukan & Pengeluaran Hari Ini)
  const dailyTx = allTx.filter(t => t.date === todayStr);
  const dailyIncome = dailyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const dailyExpense = dailyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Weekly expense by category for pie chart (Pengeluaran Minggu Ini)
  const weeklyExpenseTx = allTx.filter(t => t.type === 'expense' && t.date >= startOfWeekStr && t.date <= todayStr);
  const expCatMap = {};
  weeklyExpenseTx.forEach(t => {
    expCatMap[t.category] = (expCatMap[t.category] || 0) + t.amount;
  });
  const expByCategory = Object.entries(expCatMap)
    .map(([cat, amount]) => ({ category: cat, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Recent transactions (last 5)
  const recentTx = [...allTx].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  // Bill totals
  const activeBills = (state.bills || []).filter(b => !b.isPaid);
  const totalActiveBills = activeBills.reduce((s, b) => s + b.amount, 0);
  const balanceAfterBills = totalBalance - totalActiveBills;

  // Debt totals
  const activeDebts = state.debts.filter(d => !d.isPaid);
  const totalDebt = activeDebts.filter(d => d.type === 'debt').reduce((s, d) => s + d.amount, 0);
  const totalReceivable = activeDebts.filter(d => d.type === 'receivable').reduce((s, d) => s + d.amount, 0);
  const netDebtBalance = totalReceivable - totalDebt;

  // Total Saldo (Disesuaikan) = Total Saldo Setelah Tagihan + Piutang - Hutang
  const adjustedBalance = balanceAfterBills + netDebtBalance;

  // Cached number formatter
  const numFmt = Utils._getNumFmt();

  function renderExpenseCard() {
    const periodText = I18n.getLang() === 'id' ? 'Minggu Ini' : 'This Week';
    return `
      <div class="card__header" style="flex-wrap:wrap;gap:8px;">
        <span class="card__title">${mIcon('pie_chart')} ${t('expenseDistribution')} (${periodText})</span>
      </div>
      <div class="expense-chart-wrap">
        <canvas id="expense-chart"></canvas>
      </div>
      ${expByCategory.length === 0 ? `<p style="text-align:center;margin-top:12px;color:var(--on-surface-variant);">${t('noExpensesYet')}</p>` : `
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
          ${expByCategory.slice(0, 5).map(d => {
            const cat = CATEGORIES[d.category] || { icon: mIcon('label'), color: '#888' };
            const catName = Utils.getCategoryName(d.category);
            return `<div style="display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);">
              <span style="color:${cat.color};">${cat.icon}</span>
              <span style="flex:1;color:var(--on-surface-variant);">${catName}</span>
              <span class="mono" style="font-weight:600;">${Utils.formatRupiah(d.amount)}</span>
            </div>`;
          }).join('')}
        </div>
      `}
    `;
  }

  container.innerHTML = `
    <!-- Hero Balance Card (Gradient Green) -->
    <div class="card card--hero section" id="balance-hero" style="animation: fadeInUp 0.5s var(--ease-out)">
      <div class="card__title">${t('totalBalance')}</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:16px;">
        <span class="mono" style="font-size:24px;color:#ffffff;">Rp</span>
        <div class="card__value mono">${numFmt.format(Math.abs(totalBalance))}</div>
      </div>
      <div class="flow-row">
        <div class="flow-row__item">
          ${mIcon('arrow_upward')}
          <span>${t('income')} (${I18n.getLang() === 'id' ? 'Hari ini' : 'Today'}):<br>${Utils.formatShort(dailyIncome)}</span>
        </div>
        <div class="flow-row__item">
          ${mIcon('arrow_downward')}
          <span>${t('expense')} (${I18n.getLang() === 'id' ? 'Hari ini' : 'Today'}):<br>${Utils.formatShort(dailyExpense)}</span>
        </div>
      </div>
    </div>

    <!-- Saldo Setelah Tagihan (Glass Card) -->
    <div class="card card--adjusted section" style="animation: fadeInUp 0.52s var(--ease-out)">
      <div class="card__title">${mIcon('receipt_long')} ${t('adjustedBalanceAfterBills')}</div>
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span class="mono" style="color:${balanceAfterBills >= 0 ? 'var(--primary)' : 'var(--color-expense) !important'};font-size:14px;">Rp</span>
        <div class="card__value" style="color:${balanceAfterBills >= 0 ? 'var(--primary)' : 'var(--color-expense) !important'};">${balanceAfterBills < 0 ? '-' : ''}${numFmt.format(Math.abs(balanceAfterBills))}</div>
      </div>
      <div class="adjusted-sub">
        <div class="adjusted-sub__item">
          <span class="adjusted-sub__label">${t('totalActiveBillsCard')} (${activeBills.length})</span>
          <span class="mono text-expense" style="font-weight:500;">- ${Utils.formatShort(totalActiveBills)}</span>
        </div>
      </div>
    </div>

    <!-- Adjusted Balance (Glass Card) -->
    <div class="card card--adjusted section" style="animation: fadeInUp 0.55s var(--ease-out)">
      <div class="card__title">${mIcon('account_balance')} ${t('adjustedBalance')}</div>
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span class="mono" style="color:${adjustedBalance >= 0 ? 'var(--primary)' : 'var(--color-expense) !important'};font-size:14px;">Rp</span>
        <div class="card__value" style="color:${adjustedBalance >= 0 ? 'var(--primary)' : 'var(--color-expense) !important'};">${adjustedBalance < 0 ? '-' : ''}${numFmt.format(Math.abs(adjustedBalance))}</div>
      </div>
      <div class="adjusted-sub">
        <div class="adjusted-sub__item">
          <span class="adjusted-sub__label">${t('debtsLabel')}</span>
          <span class="mono text-expense" style="font-weight:500;">- ${Utils.formatShort(totalDebt)}</span>
        </div>
        <div class="adjusted-sub__item">
          <span class="adjusted-sub__label">${t('receivablesLabel')}</span>
          <span class="mono text-income" style="font-weight:500;">+ ${Utils.formatShort(totalReceivable)}</span>
        </div>
      </div>
    </div>

    <!-- Expense Distribution -->
    <div class="card section" id="expense-card-container" style="animation: fadeInUp 0.6s var(--ease-out)">
      ${renderExpenseCard()}
    </div>

    <!-- Active Wallets (Horizontal Scroll) -->
    <div class="section" style="animation: fadeInUp 0.65s var(--ease-out)">
      <div class="section__header">
        <h3 class="section__title">${t('activeWallets')}</h3>
        <a href="#wallets" class="section__action">${t('viewAll')}</a>
      </div>
      <div class="wallets-scroll">
        ${wallets.length === 0 ? `<p style="color:var(--on-surface-variant);padding:20px;">${t('noWalletsYet')}</p>` : wallets.map(w => {
          const typeLabel = Utils.getWalletTypeName(w.type).toUpperCase();
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          let iconColor = isDark ? '#38bdf8' : '#0284c7';
          if (w.type === 'ewallet') iconColor = isDark ? '#c084fc' : '#9333ea';
          if (w.type === 'cash') iconColor = isDark ? '#41b375' : '#2e7d32';

          return `
            <div class="wallet-scroll-card">
              <div class="wallet-scroll-card__top">
                <div class="wallet-scroll-card__icon" style="color:${iconColor};">
                  <span style="color:${iconColor};display:flex;align-items:center;justify-content:center;">${getWalletIcon(w)}</span>
                </div>
                <span class="wallet-scroll-card__badge wallet-card__type--${w.type}">${typeLabel}</span>
              </div>
              <div>
                <div class="wallet-scroll-card__name">${Utils.escapeHtml(w.name)}</div>
                <div class="wallet-scroll-card__balance">${Utils.formatRupiah(w.balance)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card section" style="animation: fadeInUp 0.7s var(--ease-out)">
      <div class="card__header">
        <span class="card__title">${mIcon('history')} ${t('recentActivity')}</span>
        <a href="#transactions" class="section__action">${t('seeAll')}</a>
      </div>
      <div id="recent-tx-list">
        ${recentTx.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state__icon">${mIcon('edit_note')}</div>
            <div class="empty-state__title">${t('noTxYet')}</div>
            <div class="empty-state__desc">${t('noTxDesc')}</div>
          </div>
        ` : recentTx.map(tx => renderTxRow(tx)).join('')}
      </div>
    </div>
  `;

  // Draw chart using requestAnimationFrame for smoother paint
  if (expByCategory.length > 0) {
    requestAnimationFrame(() => drawExpenseChart(expByCategory));
  }
}

function renderTxRow(tx) {
  const cat = CATEGORIES[tx.category] || { icon: mIcon('label'), color: '#888' };
  const catName = Utils.getCategoryName(tx.category);
  const wallet = Store.getWallet(tx.walletId);
  const walletName = wallet ? wallet.name : '—';
  const isIncome = tx.type === 'income';
  const iconClass = isIncome ? 'tx-item__icon--income' : 'tx-item__icon--expense';
  const amountClass = isIncome ? 'text-income' : 'text-expense';
  const sign = isIncome ? '+' : '-';

  return `
    <div class="tx-item" data-tx-id="${tx.id}">
      <div class="tx-item__left">
        <div class="tx-item__icon ${iconClass}">${cat.icon}</div>
        <div class="tx-item__info">
          <span class="tx-item__name">${tx.note ? Utils.escapeHtml(tx.note) : catName}</span>
          <span class="tx-item__meta">${walletName} • ${Utils.formatRelativeDate(tx.date)}</span>
        </div>
      </div>
      <span class="tx-item__amount ${amountClass} mono">${sign}${Utils._getNumFmt().format(tx.amount)}</span>
    </div>
  `;
}

function drawExpenseChart(data, targetCanvas = null) {
  const canvas = targetCanvas || document.getElementById('expense-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Get the container's actual width for responsive sizing
  const chartContainer = canvas.parentElement;
  const size = Math.min(chartContainer.clientWidth, 220);

  // Cache computed styles once (expensive to call per-slice)
  const rootStyle = getComputedStyle(document.documentElement);

  // Colors for chart
  const fallbackColors = ['#fb923c', '#38bdf8', '#e879f9', '#facc15', '#f87171', '#a78bfa', '#34d399', '#94a3b8', '#fb7185', '#f97316'];
  const colors = data.map((d, i) => {
    const cat = CATEGORIES[d.category];
    if (cat) {
      const resolved = rootStyle.getPropertyValue(cat.color.replace('var(', '').replace(')', '')).trim();
      return resolved || fallbackColors[i % fallbackColors.length];
    }
    return fallbackColors[i % fallbackColors.length];
  });

  const total = data.reduce((s, d) => s + d.amount, 0);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const radius = (size / 2) * 0.82;
  const innerRadius = (size / 2) * 0.55;
  let startAngle = -Math.PI / 2;

  data.forEach((d, i) => {
    const sliceAngle = (d.amount / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[i];
    ctx.fill();

    startAngle = endAngle;
  });

  // Center text (use cached rootStyle)
  const mainFontSize = Math.max(12, size * 0.073);
  const subFontSize = Math.max(9, size * 0.05);

  const textColor = rootStyle.getPropertyValue('--on-surface').trim() || '#ffffff';
  const subTextColor = rootStyle.getPropertyValue('--on-surface-variant').trim() || '#94a3b8';

  ctx.fillStyle = textColor;
  ctx.font = `bold ${mainFontSize}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Utils.formatShort(total), cx, cy - (size * 0.036));
  ctx.font = `${subFontSize}px Inter, sans-serif`;
  ctx.fillStyle = subTextColor;
  ctx.fillText('Total', cx, cy + (size * 0.045));
}
