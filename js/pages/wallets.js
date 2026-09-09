// ========================================
// MyWallet — Wallets Page (Verdant Glass)
// ========================================

function renderWallets(container) {
  const wallets = Store.getWallets();
  const total = Store.getTotalBalance();

  container.innerHTML = `
    <!-- Header Section -->
    <div class="wallets-header" style="animation:fadeInUp .35s var(--ease-out)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 class="page-header__title">${t('walletsTitle')}</h2>
          <p class="page-header__subtitle">${t('walletsSubtitle')}</p>
        </div>
        <div class="wallets-header__actions">
          <button class="btn btn--secondary" id="transfer-btn">${mIcon('sync_alt')} ${t('transfer')}</button>
          <button class="btn btn--primary" id="add-wallet-btn">${mIcon('add')} ${t('addWallet')}</button>
        </div>
      </div>
    </div>

    <!-- Total Balance Bento Card -->
    <div class="wallet-total-card section" style="animation:fadeInUp .4s var(--ease-out);max-width:380px;">
      <div class="wallet-total-card__label">${mIcon('account_balance')} ${t('totalCombinedBalance')}</div>
      <div class="wallet-total-card__value">Rp ${new Intl.NumberFormat('id-ID').format(total)}</div>
      <div class="wallet-total-card__trend">
        ${mIcon('trending_up')} ${wallets.length} ${t('activeAccounts')}
      </div>
    </div>

    <!-- Active Accounts Section -->
    <div class="section" style="animation:fadeInUp .45s var(--ease-out)">
      <h3 style="font-family:var(--font-mono);font-size:16px;font-weight:700;color:var(--on-surface);margin-bottom:16px;padding:0 8px;">${t('activeAccounts')}</h3>
      <div class="grid-auto">
        ${wallets.map(w => {
          const typeLabel = Utils.getWalletTypeName(w.type).toUpperCase();
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          let blobBg = 'rgba(2,132,199,0.1)';
          let iconColor = isDark ? '#38bdf8' : '#0284c7';

          if (w.type === 'ewallet') { 
            blobBg = 'rgba(147,51,234,0.1)'; 
            iconColor = isDark ? '#c084fc' : '#9333ea'; 
          }
          if (w.type === 'cash') { 
            blobBg = 'rgba(46,125,50,0.1)'; 
            iconColor = isDark ? '#41b375' : '#2e7d32'; 
          }

          return `
            <div class="wallet-card" data-wallet-id="${w.id}">
              <div class="wallet-card__bg-blob" style="background:${blobBg};"></div>
              <div class="wallet-card__top">
                <div class="wallet-card__top-left">
                  <div class="wallet-card__icon">
                    <span style="color:${iconColor};display:flex;align-items:center;justify-content:center;">${getWalletIcon(w)}</span>
                  </div>
                  <div>
                    <div class="wallet-card__name">${Utils.escapeHtml(w.name)}</div>
                    <span class="wallet-card__type wallet-card__type--${w.type}">${typeLabel}</span>
                  </div>
                </div>
                <button class="wallet-card__menu" tabindex="-1" aria-hidden="true">${mIcon('more_vert')}</button>
              </div>
              <div class="wallet-card__bottom">
                <div class="wallet-card__balance-label">${t('balance')}</div>
                <div class="wallet-card__balance">${Utils.formatRupiah(w.balance)}</div>
              </div>
            </div>
          `;
        }).join('')}
        
        <!-- Add New Wallet Card -->
        <div class="wallet-card wallet-card--add" id="card-add-wallet">
          ${mIcon('add_circle')}
          <span>${t('createNewWallet')}</span>
        </div>
      </div>
    </div>
  `;

  // Events
  container.querySelector('#add-wallet-btn').addEventListener('click', () => openAddWalletForm());
  container.querySelector('#transfer-btn').addEventListener('click', () => openTransferForm());
  container.querySelector('#card-add-wallet').addEventListener('click', () => openAddWalletForm());

  container.querySelectorAll('.wallet-card:not(.wallet-card--add)').forEach(card => {
    card.addEventListener('click', () => {
      const wId = card.dataset.walletId;
      const w = Store.getWallet(wId);
      if (!w) return;
      const txs = Store.getTransactions({ walletId: wId }).slice(0, 10);

      Modal.open(`${Utils.escapeHtml(w.name)}`, `
        <div style="text-align:center;margin-bottom:20px;">
          <div class="mono" style="font-size:var(--fs-2xl);font-weight:700;color:var(--primary);">${Utils.formatRupiah(w.balance)}</div>
          <div style="font-size:12px;color:var(--outline);margin-top:4px;font-weight:700;text-transform:uppercase;">${Utils.getWalletTypeName(w.type)}</div>
        </div>
        <div class="divider"></div>
        <h4 style="margin-bottom:12px;font-size:14px;font-weight:600;color:var(--on-surface);">${t('transactionHistory')}</h4>
        ${txs.length === 0 ? `<p style="color:var(--outline);font-size:var(--fs-sm);">${t('noTxYet')}</p>` :
          txs.map(tx => renderTxRow(tx)).join('')}
      `, {
        footerHtml: `
          <button class="btn btn--danger btn--sm" id="modal-del-wallet">${mIcon('delete')} ${t('delete')}</button>
          <button class="btn btn--secondary btn--sm" onclick="Modal.close()">${t('close')}</button>
        `,
        onOpen() {
          document.getElementById('modal-del-wallet').addEventListener('click', () => {
            if (w.balance !== 0) {
              Toast.show(t('cannotDeleteWalletWithBalance'), 'warning');
              return;
            }
            Store.deleteWallet(wId);
            Modal.close();
            renderWallets(container);
            Toast.show(`${w.name} ${t('walletDeleted')}`, 'success');
          });
        }
      });
    });
  });
}

function openAddWalletForm(preType = '') {
  Modal.open(t('addWallet'), `
    <div class="form-group">
      <label class="form-group__label">${t('walletName')}</label>
      <input type="text" id="wf-name" placeholder="${t('walletNamePlaceholder')}">
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('walletTypeLabel')}</label>
      <select id="wf-type">
        <option value="bank" ${preType === 'bank' ? 'selected' : ''}>Bank</option>
        <option value="ewallet" ${preType === 'ewallet' ? 'selected' : ''}>E-Wallet</option>
        <option value="cash" ${preType === 'cash' ? 'selected' : ''}>Cash</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('initialBalance')}</label>
      <input type="text" id="wf-balance" placeholder="Rp 0" inputmode="numeric" style="font-family:var(--font-mono);">
    </div>
  `, {
    footerHtml: `<button class="btn btn--primary btn--full" id="wf-save">💾 ${t('save')}</button>`,
    onOpen(overlay) {
      const balInput = overlay.querySelector('#wf-balance');
      balInput.addEventListener('input', (e) => {
        const v = Utils.parseRupiah(e.target.value);
        e.target.value = v > 0 ? 'Rp ' + new Intl.NumberFormat('id-ID').format(v) : '';
      });

      overlay.querySelector('#wf-save').addEventListener('click', () => {
        const name = overlay.querySelector('#wf-name').value.trim();
        const type = overlay.querySelector('#wf-type').value;
        const balance = Utils.parseRupiah(balInput.value);

        if (!name) { Toast.show(t('enterWalletName'), 'warning'); return; }

        Store.addWallet({ name, type, balance, icon: WALLET_TYPES[type].icon });
        Modal.close();
        Router.handleRoute();
        Toast.show(`${name} ${t('walletAdded')}`, 'success');
      });
    }
  });
}

function openTransferForm() {
  const wallets = Store.getWallets();
  if (wallets.length < 2) { Toast.show(t('minTwoWalletsForTransfer'), 'warning'); return; }

  Modal.open(t('transferBetweenWallets'), `
    <div class="form-group">
      <label class="form-group__label">${t('fromWallet')}</label>
      <select id="tf-from">
        ${wallets.map(w => `<option value="${w.id}">${Utils.escapeHtml(w.name)} (${Utils.formatRupiah(w.balance)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('toWallet')}</label>
      <select id="tf-to">
        ${wallets.map((w, i) => `<option value="${w.id}" ${i === 1 ? 'selected' : ''}>${Utils.escapeHtml(w.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-group__label">${t('amountRp')}</label>
      <input type="text" id="tf-amount" placeholder="Rp 0" inputmode="numeric" style="font-family:var(--font-mono);">
    </div>
  `, {
    footerHtml: `<button class="btn btn--primary btn--full" id="tf-save">${mIcon('sync_alt')} ${t('transfer')}</button>`,
    onOpen(overlay) {
      overlay.querySelector('#tf-amount').addEventListener('input', (e) => {
        const v = Utils.parseRupiah(e.target.value);
        e.target.value = v > 0 ? 'Rp ' + new Intl.NumberFormat('id-ID').format(v) : '';
      });

      overlay.querySelector('#tf-save').addEventListener('click', () => {
        const fromId = overlay.querySelector('#tf-from').value;
        const toId = overlay.querySelector('#tf-to').value;
        const amount = Utils.parseRupiah(overlay.querySelector('#tf-amount').value);

        if (fromId === toId) { Toast.show(t('sameWalletError'), 'warning'); return; }
        if (!amount || amount <= 0) { Toast.show(t('invalidAmount'), 'warning'); return; }

        const ok = Store.transfer(fromId, toId, amount);
        if (!ok) { Toast.show(t('insufficientBalance'), 'error'); return; }

        Modal.close();
        Router.handleRoute();
        Toast.show(`Transfer ${Utils.formatRupiah(amount)} ${t('transferSuccess')}`, 'success');
      });
    }
  });
}
