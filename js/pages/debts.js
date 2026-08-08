// ========================================
// MyWallet — Debts Page (Verdant Glass)
// ========================================

function renderDebts(container) {
  let activeTab = 'receivable'; // 'receivable' | 'debt'
  let showPaid = false;

  const now = new Date();
  let selectedMonth = now.getMonth() + 1; // 1 to 12
  let selectedYear = now.getFullYear(); // e.g. 2026

  function getMonthName(mNum) {
    const isId = I18n.getLang() === 'id';
    const idMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return isId ? idMonths[mNum - 1] : enMonths[mNum - 1];
  }

  function getAvailableYears() {
    const currentY = new Date().getFullYear();
    const allDebts = Store.getDebts();
    let minY = currentY;
    allDebts.forEach(d => {
      const targetDate = d.isPaid && d.paidDate ? d.paidDate : d.date;
      if (targetDate) {
        const y = parseInt(targetDate.substring(0, 4), 10);
        if (y && y < minY) minY = y;
      }
    });
    const years = [];
    for (let y = currentY; y >= minY; y--) {
      years.push(y);
    }
    return years;
  }

  function render() {
    const debts = Store.getDebts({ 
      type: activeTab, 
      isPaid: showPaid,
      month: selectedMonth,
      year: selectedYear
    });
    const totalDebt = Store.getTotalDebt();
    const totalReceivable = Store.getTotalReceivable();
    const net = totalReceivable - totalDebt;
    const isId = I18n.getLang() === 'id';
    const yearsList = getAvailableYears();

    container.innerHTML = `
      <!-- Header Section -->
      <div class="page-header" style="animation:fadeInUp .35s var(--ease-out)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="page-header__title">${t('debtsTitle')}</h2>
            <p class="page-header__subtitle">${t('debtsSubtitle')}</p>
          </div>
          <div style="display:flex;gap:12px;">
            <button class="btn btn--secondary" id="transfer-btn">${mIcon('sync_alt')} ${t('transfer')}</button>
            <button class="btn btn--primary" id="add-debt-btn">${mIcon('add')} ${t('addRecord')}</button>
          </div>
        </div>
      </div>

      <!-- Bento Summary Grid -->
      <div class="grid-2 section" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:20px;animation:fadeInUp .4s var(--ease-out)">
        <!-- Total Piutang -->
        <div class="card" style="border-radius:24px;padding:20px;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--on-surface-variant);font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;">
            <span style="color:var(--color-income);">${mIcon('call_received')}</span> ${t('totalReceivablesCard')}
          </div>
          <div class="mono" style="font-size:28px;font-weight:700;color:var(--color-income);">${Utils.formatRupiah(totalReceivable)}</div>
          <div style="font-size:13px;color:var(--on-surface-variant);margin-top:16px;">${Store.getDebts({ type: 'receivable', isPaid: false }).length} ${t('activeStatus')}</div>
        </div>

        <!-- Total Hutang -->
        <div class="card" style="border-radius:24px;padding:20px;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--on-surface-variant);font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;">
            <span style="color:var(--color-expense);">${mIcon('call_made')}</span> ${t('totalDebtsCard')}
          </div>
          <div class="mono text-expense" style="font-size:28px;font-weight:700;">${Utils.formatRupiah(totalDebt)}</div>
          <div style="font-size:13px;color:var(--on-surface-variant);margin-top:16px;">${Store.getDebts({ type: 'debt', isPaid: false }).length} ${t('activeStatus')}</div>
        </div>

        <!-- Selisih Bersih -->
        <div class="card" style="border-radius:24px;padding:20px;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--on-surface-variant);font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;">
            <span style="color:var(--color-income);">${mIcon('balance')}</span> ${t('netDifferenceCard')}
          </div>
          <div class="mono" style="font-size:28px;font-weight:700;color:${net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'};">
            ${Utils.formatRupiah(net, true)}
          </div>
          <div style="font-size:13px;color:var(--on-surface-variant);margin-top:16px;">${net >= 0 ? t('surplusBalance') : t('deficitBalance')}</div>
        </div>
      </div>

      <!-- Debts Tabs & Date Filter Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;animation:fadeInUp .45s var(--ease-out);">
        <div class="debts-tabs" style="margin-bottom:0;">
          <button class="debts-tabs__tab ${activeTab === 'receivable' ? 'active' : ''}" data-tab="receivable">${t('receivablesLabel')}</button>
          <button class="debts-tabs__tab ${activeTab === 'debt' ? 'active' : ''}" data-tab="debt">${t('debtsLabel')}</button>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <!-- Month Dropdown -->
          <select id="debt-filter-month" class="select-chip">
            <option value="0" ${selectedMonth === 0 ? 'selected' : ''}>${isId ? 'Semua Bulan' : 'All Months'}</option>
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${getMonthName(m)}</option>`).join('')}
          </select>

          <!-- Year Dropdown -->
          <select id="debt-filter-year" class="select-chip">
            <option value="0" ${selectedYear === 0 ? 'selected' : ''}>${isId ? 'Semua Tahun' : 'All Years'}</option>
            ${yearsList.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>

          <button class="btn btn--sm ${showPaid ? 'btn--primary' : 'btn--secondary'}" id="toggle-paid">
            ${showPaid ? `${mIcon('check_circle')} ${t('paidStatus')}` : `${mIcon('pending')} ${t('activeStatus')}`}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="section" style="animation:fadeInUp .5s var(--ease-out)">
        ${debts.length === 0 ? `
          <div class="glass-panel" style="border-radius:24px;padding:60px 24px;text-align:center;max-width:600px;margin:0 auto;">
            <div style="width:80px;height:80px;border-radius:50%;background:rgba(0,69,13,0.05);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <span style="font-size:40px;color:rgba(0,69,13,0.4);">${mIcon('handshake')}</span>
            </div>
            <h3 style="font-size:18px;font-weight:600;color:var(--on-surface);margin-bottom:4px;">
              ${showPaid ? t('noDebtsPaid') : `${t('noDebtsActive')} ${activeTab === 'debt' ? t('debtsLabel') : t('receivablesLabel')}`}
            </h3>
            <p style="font-size:14px;color:var(--on-surface-variant);">
              ${showPaid ? '' : t('pressPlusToRecord')}
            </p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${debts.map(d => {
              const targetWId = d.isPaid && d.paidWalletId ? d.paidWalletId : d.walletId;
              const w = Store.getWallet(targetWId);
              const initial = d.personName.charAt(0).toUpperCase();
              const isReceivable = d.type === 'receivable';
              const colorClass = isReceivable ? 'text-income' : 'text-expense';
              const sign = isReceivable ? '+' : '-';
              const avatarBg = isReceivable ? 'var(--primary)' : 'var(--error)';

              return `
                <div class="debt-item" data-debt-id="${d.id}">
                  <div class="debt-item__left">
                    <div class="debt-item__avatar" style="background:${avatarBg};">${initial}</div>
                    <div class="debt-item__info">
                      <span class="debt-item__name">${Utils.escapeHtml(d.personName)}</span>
                      <span class="debt-item__desc">
                        ${Utils.formatDate(d.date)} • ${w ? w.name : '—'}
                        ${d.note ? ' • ' + Utils.escapeHtml(d.note) : ''}
                        ${d.isPaid ? ' • ✅ ' + t('paidStatus') + ' ' + Utils.formatDate(d.paidDate) : ''}
                      </span>
                    </div>
                  </div>
                  <div class="debt-item__right">
                    <span class="debt-item__amount ${colorClass} mono">${sign}${Utils.formatRupiah(d.amount)}</span>
                    ${!d.isPaid ? `
                      <div style="display:flex;gap:4px;margin-top:4px;">
                        <button class="btn btn--sm btn--primary mark-paid-btn" data-id="${d.id}" style="padding:4px 8px;font-size:11px;">${mIcon('check')} ${t('markPaid')}</button>
                        <button class="btn btn--sm btn--danger del-debt-btn" data-id="${d.id}" style="padding:4px 8px;font-size:11px;">${mIcon('delete')}</button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // Tab events
    container.querySelectorAll('.debts-tabs__tab').forEach(tab => {
      tab.addEventListener('click', () => { activeTab = tab.dataset.tab; render(); });
    });

    container.querySelector('#debt-filter-month')?.addEventListener('change', (e) => {
      selectedMonth = parseInt(e.target.value, 10);
      render();
    });

    container.querySelector('#debt-filter-year')?.addEventListener('change', (e) => {
      selectedYear = parseInt(e.target.value, 10);
      render();
    });

    container.querySelector('#toggle-paid').addEventListener('click', () => { showPaid = !showPaid; render(); });
    container.querySelector('#add-debt-btn').addEventListener('click', () => openDebtForm(activeTab));
    if (container.querySelector('#transfer-btn')) {
      container.querySelector('#transfer-btn').addEventListener('click', () => openTransferForm());
    }

    // Mark paid
    container.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMarkPaidModal(btn.dataset.id);
      });
    });

    // Delete
    container.querySelectorAll('.del-debt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.deleteDebt(btn.dataset.id);
        render();
        Toast.show(t('recordDeleted'), 'success');
      });
    });
  }

  function openMarkPaidModal(debtId) {
    const debt = Store.getDebts().find(d => d.id === debtId);
    if (!debt) return;

    const isReceivable = debt.type === 'receivable';
    const isId = I18n.getLang() === 'id';
    const title = isReceivable 
      ? (isId ? 'Pelunasan Piutang' : 'Settle Receivable')
      : (isId ? 'Pelunasan Hutang' : 'Settle Debt');
    
    let selectedWalletId = debt.walletId;
    const initialWallet = Store.getWallet(debt.walletId);
    const initialWalletName = initialWallet ? initialWallet.name : '—';

    const bodyHtml = `
      <div style="text-align:center;margin-bottom:20px;">
        <div class="mono" style="font-size:28px;font-weight:700;color:${isReceivable ? 'var(--color-income)' : 'var(--color-expense)'};">
          ${isReceivable ? '+' : '-'}${Utils.formatRupiah(debt.amount)}
        </div>
        <div style="font-size:16px;font-weight:600;color:var(--on-surface);margin-top:4px;">
          ${Utils.escapeHtml(debt.personName)}
        </div>
        <div style="font-size:12px;color:var(--outline);margin-top:4px;">
          ${isId ? 'Dompet Awal' : 'Original Wallet'}: <strong>${Utils.escapeHtml(initialWalletName)}</strong>
          ${debt.note ? ' • ' + Utils.escapeHtml(debt.note) : ''}
        </div>
      </div>

      <div class="divider" style="margin-bottom:16px;"></div>

      <div class="form-group">
        <label class="form-group__label">${isId ? 'Pilih Dompet Pelunasan' : 'Select Settlement Wallet'}</label>
        <div id="mark-paid-wallet-container">
          ${renderWalletSelector(selectedWalletId)}
        </div>
      </div>
    `;

    Modal.open(title, bodyHtml, {
      footerHtml: `<button class="btn btn--primary btn--full" id="confirm-mark-paid-btn">💾 ${isId ? 'Konfirmasi Pelunasan' : 'Confirm Settlement'}</button>`,
      onOpen(overlay) {
        overlay.querySelectorAll('.wallet-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            overlay.querySelectorAll('.wallet-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedWalletId = chip.dataset.walletId;
          });
        });

        overlay.querySelector('#confirm-mark-paid-btn')?.addEventListener('click', () => {
          if (!selectedWalletId) {
            Toast.show(t('selectWalletWarning'), 'warning');
            return;
          }
          Store.markDebtPaid(debtId, selectedWalletId);
          Modal.close();
          render();
          Toast.show(t('markedPaid'), 'success');
        });
      }
    });
  }

  render();
}

function openDebtForm(type = 'debt') {
  let selectedWalletId = '';

  Modal.open(`${type === 'debt' ? t('recordDebt') : t('recordReceivable')}`, `
    <div class="form-group">
      <label class="form-group__label">${t('personName')}</label>
      <input type="text" id="df-person" placeholder="${type === 'debt' ? t('debtPersonPlaceholder') : t('receivablePersonPlaceholder')}">
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('amountRp')}</label>
      <input type="text" id="df-amount" placeholder="Rp 0" inputmode="numeric" style="font-family:var(--font-mono);">
    </div>
    <div id="df-wallet-container">
      ${renderWalletSelector()}
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('dateLabel')}</label>
      <input type="date" id="df-date" value="${Utils.today()}">
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('noteLabel')}</label>
      <input type="text" id="df-note" placeholder="${t('notePlaceholder')}">
    </div>
  `, {
    footerHtml: `<button class="btn btn--primary btn--full" id="df-save">💾 ${t('save')}</button>`,
    onOpen(overlay) {
      overlay.querySelector('#df-amount').addEventListener('input', (e) => {
        const v = Utils.parseRupiah(e.target.value);
        e.target.value = v > 0 ? 'Rp ' + new Intl.NumberFormat('id-ID').format(v) : '';
      });

      overlay.querySelectorAll('.wallet-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          overlay.querySelectorAll('.wallet-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          selectedWalletId = chip.dataset.walletId;
        });
      });

      overlay.querySelector('#df-save').addEventListener('click', () => {
        const personName = overlay.querySelector('#df-person').value.trim();
        const amount = Utils.parseRupiah(overlay.querySelector('#df-amount').value);
        const date = overlay.querySelector('#df-date').value;
        const note = overlay.querySelector('#df-note').value.trim();

        if (!personName) { Toast.show(t('enterPersonName'), 'warning'); return; }
        if (!amount || amount <= 0) { Toast.show(t('invalidAmount'), 'warning'); return; }
        if (!selectedWalletId) { Toast.show(t('selectWalletWarning'), 'warning'); return; }

        Store.addDebt({ type, personName, amount, walletId: selectedWalletId, date, note });
        Modal.close();
        Router.handleRoute();
        Toast.show(t('debtRecordSaved'), 'success');
      });
    }
  });
}
