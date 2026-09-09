// ========================================
// MyWallet — Transaction Form (Modal)
// Strangler kandidat 4c: pindahan verbatim dari pages/transactions.js.
// Mendukung create, edit & transfer. Mount/unmount aman: tiap open()
// memakai overlay segar via Modal (close dulu, remove saat tutup).
// ========================================

// ── Transaction Form (Modal) ── supports create, edit & transfer
function openTransactionForm(prefill = {}) {
  const isEdit = !!prefill.editId;
  let selectedType = prefill.type || 'expense';
  let selectedCategory = prefill.category || '';
  let selectedWalletId = prefill.walletId || '';
  let transferFromId = '';
  let transferToId = '';

  function getFormHtml() {
    const isTransfer = selectedType === 'transfer';

    return `
      <div class="form-group">
        <div class="tab-switcher" id="tx-type-tabs">
          <button class="tab-switcher__tab ${selectedType === 'expense' ? 'active' : ''}" data-type="expense">${t('expense')}</button>
          <button class="tab-switcher__tab ${selectedType === 'income' ? 'active' : ''}" data-type="income">${t('income')}</button>
          <button class="tab-switcher__tab ${selectedType === 'transfer' ? 'active' : ''}" data-type="transfer">${t('transfer')}</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-group__label">${t('amountRp')}</label>
        <input type="text" id="tx-amount" placeholder="Rp 0" inputmode="numeric" value="${prefill.amount ? 'Rp ' + new Intl.NumberFormat('id-ID').format(prefill.amount) : ''}" style="font-family:var(--font-mono);font-size:var(--fs-xl);text-align:center;font-weight:700;">
      </div>

      ${isTransfer ? `
        <div class="form-group">
          <label class="form-group__label">${t('fromWallet')}</label>
          <select id="tf-from" style="width:100%;">
            <option value="">${t('selectSourceWallet')}</option>
            ${Store.getWallets().map(w => `<option value="${w.id}" ${w.id === transferFromId ? 'selected' : ''}>${Utils.escapeHtml(w.name)} (${Utils.formatRupiah(w.balance)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-group__label">${t('toWallet')}</label>
          <select id="tf-to" style="width:100%;">
            <option value="">${t('selectTargetWallet')}</option>
            ${Store.getWallets().map(w => `<option value="${w.id}" ${w.id === transferToId ? 'selected' : ''}>${Utils.escapeHtml(w.name)}</option>`).join('')}
          </select>
        </div>
      ` : `
        <div id="tx-cat-container">
          ${renderCategorySelector(selectedType, selectedCategory)}
        </div>

        <div id="tx-wallet-container">
          ${renderWalletSelector(selectedWalletId)}
        </div>
      `}

      <div class="form-group">
        <label class="form-group__label">${t('dateLabel')}</label>
        <input type="date" id="tx-date" value="${prefill.date || Utils.today()}">
      </div>

      <div class="form-group">
        <label class="form-group__label">${t('noteLabel')}</label>
        <input type="text" id="tx-note" placeholder="${isTransfer ? t('noteTransferPlaceholder') : t('noteExpensePlaceholder')}" value="${Utils.escapeHtml(prefill.note || '')}">
      </div>
    `;
  }

  const modalTitle = isEdit ? t('editTx') : t('recordTx');
  const saveLabel = isEdit ? t('saveChanges') : `💾 ${t('save')}`;

  Modal.open(modalTitle, getFormHtml(), {
    footerHtml: `<button class="btn btn--primary btn--full" id="tx-save-btn">${saveLabel}</button>`,
    onOpen(overlay) {
      function rebuildForm() {
        const body = overlay.querySelector('#modal-body');
        if (body) {
          body.innerHTML = getFormHtml();
          bindEvents();
        }
      }

      function bindEvents() {
        const amtInput = overlay.querySelector('#tx-amount');
        if (amtInput) {
          amtInput.addEventListener('input', (e) => {
            const val = Utils.parseRupiah(e.target.value);
            e.target.value = val > 0 ? 'Rp ' + Utils._getNumFmt().format(val) : '';
          });
          amtInput.focus();
        }

        overlay.querySelectorAll('#tx-type-tabs .tab-switcher__tab').forEach(tab => {
          tab.addEventListener('click', () => {
            selectedType = tab.dataset.type;
            selectedCategory = '';
            selectedWalletId = '';
            transferFromId = '';
            transferToId = '';
            rebuildForm();
          });
        });

        if (selectedType === 'transfer') {
          const fromSelect = overlay.querySelector('#tf-from');
          const toSelect = overlay.querySelector('#tf-to');
          if (fromSelect) fromSelect.addEventListener('change', (e) => { transferFromId = e.target.value; });
          if (toSelect) toSelect.addEventListener('change', (e) => { transferToId = e.target.value; });
        }
      }

      // Delegated event listener for category and wallet clicks inside modal
      overlay.addEventListener('click', (e) => {
        const catItem = e.target.closest('.cat-grid__item');
        if (catItem) {
          overlay.querySelectorAll('.cat-grid__item').forEach(i => i.classList.remove('selected'));
          catItem.classList.add('selected');
          selectedCategory = catItem.dataset.category;
          return;
        }

        const walletChip = e.target.closest('.wallet-chip');
        if (walletChip) {
          overlay.querySelectorAll('.wallet-chip').forEach(c => c.classList.remove('selected'));
          walletChip.classList.add('selected');
          selectedWalletId = walletChip.dataset.walletId;
          return;
        }
      });

      bindEvents();

      overlay.querySelector('#tx-save-btn').addEventListener('click', () => {
        const amount = Utils.parseRupiah(overlay.querySelector('#tx-amount').value);
        const date = overlay.querySelector('#tx-date').value;
        const note = overlay.querySelector('#tx-note').value.trim();

        if (!amount || amount <= 0) { Toast.show(t('invalidAmount'), 'warning'); return; }

        if (selectedType === 'transfer') {
          const fromId = overlay.querySelector('#tf-from').value;
          const toId = overlay.querySelector('#tf-to').value;

          if (!fromId) { Toast.show(t('selectSourceWallet'), 'warning'); return; }
          if (!toId) { Toast.show(t('selectTargetWallet'), 'warning'); return; }
          if (fromId === toId) { Toast.show(t('sameWalletError'), 'warning'); return; }

          const ok = Store.transfer(fromId, toId, amount);
          if (!ok) { Toast.show(t('insufficientBalance'), 'error'); return; }

          const fromW = Store.getWallet(fromId);
          const toW = Store.getWallet(toId);
          Modal.close();
          Router.handleRoute();
          Toast.show(`Transfer ${Utils.formatRupiah(amount)} ${fromW?.name || '?'} -> ${toW?.name || '?'} ${t('transferSuccess')}`, 'success');
          return;
        }

        if (!selectedCategory) { Toast.show(t('selectCategoryWarning'), 'warning'); return; }
        if (!selectedWalletId) { Toast.show(t('selectWalletWarning'), 'warning'); return; }

        if (isEdit) {
          const updated = Store.updateTransaction(prefill.editId, {
            type: selectedType,
            amount,
            category: selectedCategory,
            walletId: selectedWalletId,
            date,
            note
          });
          if (!updated) { Toast.show(t('insufficientBalance'), 'error'); return; }
          Modal.close();
          Router.handleRoute();
          Toast.show(t('txUpdated'), 'success');
        } else {
          const created = Store.addTransaction({
            type: selectedType,
            amount,
            category: selectedCategory,
            walletId: selectedWalletId,
            date,
            note
          });
          if (!created) { Toast.show(t('insufficientBalance'), 'error'); return; }
          Modal.close();
          Router.handleRoute();
          Toast.show(`${selectedType === 'income' ? t('income') : t('expense')} ${Utils.formatRupiah(amount)} ${t('txRecorded')}`, 'success');
        }
      });
    }
  });
}
