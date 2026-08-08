// ========================================
// MyWallet — Bills Page (Verdant Glass)
// ========================================

function renderBills(container) {
  let activeTab = 'active'; // 'active' | 'paid'
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
    const allBills = Store.getBills();
    let minY = currentY;
    allBills.forEach(b => {
      const targetDate = b.isPaid && b.paidDate ? b.paidDate : b.dueDate;
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

  function getDeadlineBadge(dueDateStr) {
    if (!dueDateStr) return '';
    const now = Date.now();
    const dueTime = new Date(dueDateStr).getTime();
    const diffMs = dueTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return `<span style="background:rgba(211,47,47,0.15);color:var(--color-expense);border:1px solid rgba(211,47,47,0.3);padding:2px 8px;border-radius:var(--radius-full);font-size:10px;font-weight:700;letter-spacing:0.05em;display:inline-flex;align-items:center;gap:4px;">⚠️ ${I18n.getLang() === 'id' ? 'TERLEWAT' : 'OVERDUE'}</span>`;
    }
    if (diffHours <= 1) {
      return `<span style="background:rgba(211,47,47,0.2);color:var(--color-expense);border:1px solid var(--color-expense);padding:2px 8px;border-radius:var(--radius-full);font-size:10px;font-weight:700;letter-spacing:0.05em;display:inline-flex;align-items:center;gap:4px;">⚠️ 1 JAM LAGI</span>`;
    }
    if (diffHours <= 12) {
      return `<span style="background:rgba(217,119,6,0.15);color:#d97706;border:1px solid rgba(217,119,6,0.3);padding:2px 8px;border-radius:var(--radius-full);font-size:10px;font-weight:700;letter-spacing:0.05em;display:inline-flex;align-items:center;gap:4px;">⏰ ${Math.ceil(diffHours)} JAM LAGI</span>`;
    }
    if (diffHours <= 24) {
      return `<span style="background:rgba(217,119,6,0.15);color:#d97706;border:1px solid rgba(217,119,6,0.3);padding:2px 8px;border-radius:var(--radius-full);font-size:10px;font-weight:700;letter-spacing:0.05em;display:inline-flex;align-items:center;gap:4px;">📌 1 HARI LAGI</span>`;
    }
    return `<span style="background:rgba(0,69,13,0.08);color:var(--primary);border:1px solid rgba(0,69,13,0.15);padding:2px 8px;border-radius:var(--radius-full);font-size:10px;font-weight:700;letter-spacing:0.05em;display:inline-flex;align-items:center;gap:4px;">🟢 ${diffDays} HARI LAGI</span>`;
  }

  function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '—';
    const d = new Date(dateTimeStr);
    const dateFormatted = Utils.formatDate(dateTimeStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateFormatted} • ${hours}:${minutes}`;
  }

  function render() {
    const isId = I18n.getLang() === 'id';
    const activeBills = Store.getBills({ isPaid: false }); // sorted by deadline ascending
    const paidBills = Store.getBills({ isPaid: true, month: selectedMonth, year: selectedYear });

    const displayedBills = activeTab === 'active' ? activeBills : paidBills;
    const totalWalletBalance = Store.getTotalBalance();
    const totalActiveBills = Store.getTotalActiveBills();
    const netBalanceAfterBills = totalWalletBalance - totalActiveBills;

    const yearsList = getAvailableYears();

    container.innerHTML = `
      <!-- Header Section -->
      <div class="page-header" style="animation:fadeInUp .35s var(--ease-out)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="page-header__title">${t('billsTitle')}</h2>
            <p class="page-header__subtitle">${t('billsSubtitle')}</p>
          </div>
          <button class="btn btn--primary" id="add-bill-btn">${mIcon('add')} ${t('addBill')}</button>
        </div>
      </div>

      <!-- Bento Summary Grid -->
      <div class="grid-2 section" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;animation:fadeInUp .4s var(--ease-out)">
        <!-- Total Saldo Setelah Tagihan -->
        <div class="card" style="border-radius:24px;padding:20px;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--on-surface-variant);font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;">
            <span style="color:var(--primary);">${mIcon('account_balance')}</span> ${t('adjustedBalanceAfterBills')}
          </div>
          <div class="mono" style="font-size:26px;font-weight:700;color:${netBalanceAfterBills >= 0 ? 'var(--primary)' : 'var(--color-expense)'};">
            ${Utils.formatRupiah(netBalanceAfterBills, true)}
          </div>
          <div style="font-size:12px;color:var(--on-surface-variant);margin-top:12px;">
            ${isId ? 'Saldo Dompet' : 'Wallet Balance'}: ${Utils.formatRupiah(totalWalletBalance)}
          </div>
        </div>

        <!-- Total Tagihan Aktif -->
        <div class="card" style="border-radius:24px;padding:20px;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--on-surface-variant);font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:12px;">
            <span style="color:var(--color-expense);">${mIcon('receipt_long')}</span> ${t('totalActiveBillsCard')}
          </div>
          <div class="mono text-expense" style="font-size:26px;font-weight:700;">
            ${Utils.formatRupiah(totalActiveBills)}
          </div>
          <div style="font-size:12px;color:var(--on-surface-variant);margin-top:12px;">
            ${activeBills.length} ${t('activeStatus')} (${isId ? 'Urut Deadline Terdekat' : 'Closest Deadline First'})
          </div>
        </div>
      </div>

      <!-- Tabs & Filter Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;animation:fadeInUp .45s var(--ease-out);">
        <div class="debts-tabs" style="margin-bottom:0;">
          <button class="debts-tabs__tab ${activeTab === 'active' ? 'active' : ''}" data-tab="active">
            ${mIcon('pending')} ${t('activeBills')} (${activeBills.length})
          </button>
          <button class="debts-tabs__tab ${activeTab === 'paid' ? 'active' : ''}" data-tab="paid">
            ${mIcon('check_circle')} ${t('paidHistory')}
          </button>
        </div>

        ${activeTab === 'paid' ? `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <!-- Month Dropdown -->
            <select id="bill-filter-month" class="select-chip">
              <option value="0" ${selectedMonth === 0 ? 'selected' : ''}>${isId ? 'Semua Bulan' : 'All Months'}</option>
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${getMonthName(m)}</option>`).join('')}
            </select>

            <!-- Year Dropdown -->
            <select id="bill-filter-year" class="select-chip">
              <option value="0" ${selectedYear === 0 ? 'selected' : ''}>${isId ? 'Semua Tahun' : 'All Years'}</option>
              ${yearsList.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>

      <!-- List Tagihan -->
      <div class="section" style="animation:fadeInUp .5s var(--ease-out)">
        ${displayedBills.length === 0 ? `
          <div class="glass-panel" style="border-radius:24px;padding:50px 24px;text-align:center;max-width:600px;margin:0 auto;">
            <div style="width:72px;height:72px;border-radius:50%;background:rgba(0,69,13,0.06);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <span style="font-size:36px;color:var(--primary);">${mIcon('request_quote')}</span>
            </div>
            <h3 style="font-size:16px;font-weight:600;color:var(--on-surface);margin-bottom:4px;">
              ${activeTab === 'active' ? t('noBillsActive') : t('noBillsPaid')}
            </h3>
            <p style="font-size:13px;color:var(--on-surface-variant);">
              ${activeTab === 'active' ? t('pressPlusToRecord') : ''}
            </p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${displayedBills.map(b => {
              const w = Store.getWallet(b.isPaid ? b.paidWalletId : b.walletId);
              const isPaid = b.isPaid;

              return `
                <div class="debt-item" data-bill-id="${b.id}" style="padding:16px;border-radius:18px;">
                  <div class="debt-item__left">
                    <div class="debt-item__avatar" style="background:${isPaid ? 'var(--primary)' : 'var(--color-expense)'};">
                      ${mIcon(isPaid ? 'check' : 'receipt_long')}
                    </div>
                    <div class="debt-item__info">
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span class="debt-item__name" style="font-size:15px;">${Utils.escapeHtml(b.title)}</span>
                        ${!isPaid ? getDeadlineBadge(b.dueDate) : ''}
                      </div>
                      <span class="debt-item__desc" style="font-size:12px;margin-top:4px;">
                        ${isPaid ? `${t('paidStatus')}: ${Utils.formatDate(b.paidDate)}` : `${t('dueDateLabel')}: ${formatDateTime(b.dueDate)}`}
                        ${w ? ' • ' + Utils.escapeHtml(w.name) : ''}
                        ${b.note ? ' • ' + Utils.escapeHtml(b.note) : ''}
                      </span>
                    </div>
                  </div>
                  <div class="debt-item__right" style="text-align:right;">
                    <span class="debt-item__amount text-expense mono" style="font-size:16px;font-weight:700;">
                      -${Utils.formatRupiah(b.amount)}
                    </span>
                    ${!isPaid ? `
                      <div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end;">
                        <button class="btn btn--sm btn--primary mark-bill-paid-btn" data-id="${b.id}" style="padding:6px 12px;font-size:11px;border-radius:var(--radius-full);">
                          ${mIcon('check')} ${t('payBill')}
                        </button>
                        <button class="btn btn--sm btn--danger del-bill-btn" data-id="${b.id}" style="padding:6px 10px;font-size:11px;border-radius:var(--radius-full);">
                          ${mIcon('delete')}
                        </button>
                      </div>
                    ` : `
                      <div style="margin-top:4px;">
                        <button class="btn btn--sm btn--danger del-bill-btn" data-id="${b.id}" style="padding:4px 8px;font-size:11px;border-radius:var(--radius-full);">
                          ${mIcon('delete')}
                        </button>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // ── Bind Events ──
    container.querySelectorAll('.debts-tabs__tab').forEach(tab => {
      tab.addEventListener('click', () => { activeTab = tab.dataset.tab; render(); });
    });

    container.querySelector('#bill-filter-month')?.addEventListener('change', (e) => {
      selectedMonth = parseInt(e.target.value, 10);
      render();
    });

    container.querySelector('#bill-filter-year')?.addEventListener('change', (e) => {
      selectedYear = parseInt(e.target.value, 10);
      render();
    });

    container.querySelector('#add-bill-btn').addEventListener('click', () => openBillForm());

    // Mark paid
    container.querySelectorAll('.mark-bill-paid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPayBillModal(btn.dataset.id);
      });
    });

    // Delete
    container.querySelectorAll('.del-bill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.deleteBill(btn.dataset.id);
        render();
        Toast.show(t('billDeleted'), 'success');
      });
    });
  }

  function openPayBillModal(billId) {
    const bill = Store.getBills().find(b => b.id === billId);
    if (!bill) return;

    const wallets = Store.getWallets();
    const isId = I18n.getLang() === 'id';
    let selectedWalletId = bill.walletId || (wallets[0] ? wallets[0].id : '');

    const bodyHtml = `
      <div style="text-align:center;margin-bottom:20px;">
        <div class="mono text-expense" style="font-size:28px;font-weight:700;">
          -${Utils.formatRupiah(bill.amount)}
        </div>
        <div style="font-size:16px;font-weight:600;color:var(--on-surface);margin-top:4px;">
          ${Utils.escapeHtml(bill.title)}
        </div>
        <div style="font-size:12px;color:var(--outline);margin-top:4px;">
          ${t('dueDateLabel')}: <strong>${formatDateTime(bill.dueDate)}</strong>
          ${bill.note ? ' • ' + Utils.escapeHtml(bill.note) : ''}
        </div>
      </div>

      <div class="divider" style="margin-bottom:16px;"></div>

      <div class="form-group">
        <label class="form-group__label">${t('selectWalletPay')}</label>
        <div id="pay-bill-wallet-container">
          ${renderWalletSelector(selectedWalletId)}
        </div>
      </div>
    `;

    Modal.open(t('payBill'), bodyHtml, {
      footerHtml: `<button class="btn btn--primary btn--full" id="confirm-pay-bill-btn">💾 ${isId ? 'Konfirmasi Pembayaran' : 'Confirm Payment'}</button>`,
      onOpen(overlay) {
        overlay.querySelectorAll('.wallet-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            overlay.querySelectorAll('.wallet-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedWalletId = chip.dataset.walletId;
          });
        });

        overlay.querySelector('#confirm-pay-bill-btn')?.addEventListener('click', () => {
          if (!selectedWalletId) {
            Toast.show(t('selectWalletWarning'), 'warning');
            return;
          }
          const ok = Store.markBillPaid(billId, selectedWalletId);
          if (ok) {
            Modal.close();
            Router.handleRoute();
            Toast.show(t('billPaidSuccess'), 'success');
          }
        });
      }
    });
  }

  render();
}

function openBillForm() {
  let selectedWalletId = '';
  // Default datetime: tomorrow at 12:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  const defaultDue = tomorrow.toISOString().slice(0, 16);

  Modal.open(t('addBill'), `
    <div class="form-group">
      <label class="form-group__label">${t('billTitleLabel')}</label>
      <input type="text" id="bf-title" placeholder="${t('billTitlePlaceholder')}">
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('amountRp')}</label>
      <input type="text" id="bf-amount" placeholder="Rp 0" inputmode="numeric" style="font-family:var(--font-mono);">
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('dueDateLabel')}</label>
      <input type="datetime-local" id="bf-duedate" value="${defaultDue}">
    </div>
    <div id="bf-wallet-container">
      <label class="form-group__label">${t('selectWallet')} (${I18n.getLang() === 'id' ? 'Opsional' : 'Optional'})</label>
      ${renderWalletSelector()}
    </div>
    <div class="form-group" style="margin-top:16px;">
      <label class="form-group__label">${t('noteLabel')}</label>
      <input type="text" id="bf-note" placeholder="${t('notePlaceholder')}">
    </div>
  `, {
    footerHtml: `<button class="btn btn--primary btn--full" id="bf-save">💾 ${t('save')}</button>`,
    onOpen(overlay) {
      overlay.querySelector('#bf-amount').addEventListener('input', (e) => {
        const v = Utils.parseRupiah(e.target.value);
        e.target.value = v > 0 ? 'Rp ' + Utils._getNumFmt().format(v) : '';
      });

      overlay.querySelectorAll('.wallet-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          overlay.querySelectorAll('.wallet-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          selectedWalletId = chip.dataset.walletId;
        });
      });

      overlay.querySelector('#bf-save').addEventListener('click', () => {
        const title = overlay.querySelector('#bf-title').value.trim();
        const amount = Utils.parseRupiah(overlay.querySelector('#bf-amount').value);
        const dueDate = overlay.querySelector('#bf-duedate').value;
        const note = overlay.querySelector('#bf-note').value.trim();

        if (!title) { Toast.show(t('enterBillTitle'), 'warning'); return; }
        if (!amount || amount <= 0) { Toast.show(t('invalidAmount'), 'warning'); return; }
        if (!dueDate) { Toast.show(t('dueDateLabel') + ' ' + (I18n.getLang() === 'id' ? 'wajib diisi' : 'is required'), 'warning'); return; }

        Store.addBill({ title, amount, dueDate, walletId: selectedWalletId, note });
        Modal.close();
        Router.handleRoute();
        Toast.show(t('billSaved'), 'success');

        // Ask for Notification permission if not set
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });
    }
  });
}
