// ========================================
// MyWallet — UI Components (Verdant Glass)
// ========================================

// ── Toast Notification System ──
const Toast = {
  show(message, type = 'info') {
    // Suppress success and info toasts per user request
    if (type === 'success' || type === 'info') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: mIcon('check_circle'),
      error: mIcon('error'),
      warning: mIcon('warning'),
      info: mIcon('info')
    };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type]}</span>
      <span class="toast__message">${Utils.escapeHtml(message)}</span>
      <button class="toast__close" onclick="this.closest('.toast').remove()">${mIcon('close')}</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// ── Modal System ──
const Modal = {
  open(title, bodyHtml, options = {}) {
    // Close any existing modal
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';

    const footerHtml = options.footerHtml || '';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">${title}</h3>
          <button class="modal__close" id="modal-close-btn">${mIcon('close')}</button>
        </div>
        <div class="modal__body" id="modal-body">
          ${bodyHtml}
        </div>
        ${footerHtml ? `<div class="modal__footer">${footerHtml}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);

    // Close events
    overlay.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Call onOpen callback
    if (options.onOpen) {
      setTimeout(() => options.onOpen(overlay), 50);
    }

    return overlay;
  },

  close() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 200);
    }
  }
};

// ── Sidebar Renderer (Verdant Glass — Solid Deep Forest Green) ──
function renderSidebar() {
  const activeDebts = Store.getDebts({ isPaid: false }).length;
  const activeBills = Store.getBills({ isPaid: false }).length;
  const nav = [
    { page: 'dashboard', icon: 'dashboard', label: t('dashboard') },
    { page: 'transactions', icon: 'receipt_long', label: t('activity') },
    { page: 'wallets', icon: 'account_balance_wallet', label: t('wallets') },
    { page: 'debts', icon: 'handshake', label: t('debts'), badge: activeDebts || null },
    { page: 'bills', icon: 'request_quote', label: t('bills'), badge: activeBills || null },
    { page: 'ai', icon: 'smart_toy', label: t('assistant') },
    { page: 'settings', icon: 'settings', label: t('settings') },
  ];

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__logo">
        <span class="sidebar__logo-text">MyWallet</span>
      </div>
      <nav class="sidebar__nav">
        ${nav.map(n => `
          <a href="#${n.page}" class="sidebar__link" data-page="${n.page}">
            <span class="sidebar__link-icon">${mIcon(n.icon)}</span>
            <span>${n.label}</span>
            ${n.badge ? `<span class="sidebar__link-badge">${n.badge}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar__footer" style="display:flex; justify-content:space-between; align-items:center;">
        <span class="sidebar__version">VERSION 1.0</span>
      </div>
    </aside>
  `;
}

// ── Header Renderer (Glass AppBar) ──
function renderHeader() {
  return `
    <header class="header" id="header">
      <div class="header__left">
        <button class="header__menu-btn" id="menu-btn">${mIcon('menu')}</button>
        <h2 class="header__title" id="header-title"><span>MyWallet</span></h2>
      </div>
      <div class="header__right">
        <span class="header__date">${Utils.longDate()}</span>
      </div>
    </header>
  `;
}

// ── Bottom Nav Renderer (Glass Bottom Bar) ──
function renderBottomNav() {
  const nav = [
    { page: 'dashboard', icon: 'dashboard', label: t('dashboard') },
    { page: 'transactions', icon: 'receipt_long', label: t('activity') },
    { page: 'wallets', icon: 'account_balance_wallet', label: t('wallets') },
    { page: 'debts', icon: 'handshake', label: t('debts') },
    { page: 'bills', icon: 'request_quote', label: t('bills') },
  ];

  return `
    <nav class="bottom-nav" id="bottom-nav">
      <div class="bottom-nav__list">
        ${nav.map(n => `
          <a href="#${n.page}" class="bottom-nav__item" data-page="${n.page}">
            ${mIcon(n.icon)}
            <span>${n.label}</span>
          </a>
        `).join('')}
      </div>
    </nav>
  `;
}

// ── FAB Renderer ──
function renderFAB() {
  return `<button class="fab" id="fab-btn" title="Tambah Transaksi">${mIcon('add')}</button>`;
}

// ── Onboarding ──
function renderOnboarding() {
  const defaults = [
    { name: 'BRI', type: 'bank', icon: 'account_balance' },
    { name: 'BCA', type: 'bank', icon: 'account_balance' },
    { name: 'OVO', type: 'ewallet', icon: 'phone_iphone' },
    { name: 'Dana', type: 'ewallet', icon: 'phone_iphone' },
    { name: 'GoPay', type: 'ewallet', icon: 'phone_iphone' },
    { name: 'Cash', type: 'cash', icon: 'payments' },
  ];

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.id = 'onboarding';
  overlay.innerHTML = `
    <div class="onboarding animate-fade-in-up">
      <div class="onboarding__logo">${mIcon('account_balance_wallet')}</div>
      <h1 class="onboarding__title">${t('onboardingTitle')}</h1>
      <p class="onboarding__desc">${t('onboardingDesc')}</p>
      <div class="onboarding__wallets" id="onboarding-wallets">
        ${defaults.map((w, i) => `
          <div class="onboarding__wallet-row">
            <span class="wallet-icon">${mIcon(w.icon)}</span>
            <label>${w.name}</label>
            <input type="text" id="setup-bal-${i}" placeholder="Rp 0" data-name="${w.name}" data-type="${w.type}" inputmode="numeric">
          </div>
        `).join('')}
      </div>
      <div class="onboarding__submit-wrap">
        <button class="btn btn--primary btn--lg btn--full" id="setup-done-btn">
          ${mIcon('rocket_launch')} ${t('getStarted')}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Format input as Rupiah
  overlay.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const val = Utils.parseRupiah(e.target.value);
      if (val > 0) {
        e.target.value = 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
      } else {
        e.target.value = '';
      }
    });
  });

  // Done button
  overlay.querySelector('#setup-done-btn').addEventListener('click', () => {
    const inputs = overlay.querySelectorAll('input');
    let hasWallet = false;

    inputs.forEach(inp => {
      const bal = Utils.parseRupiah(inp.value);
      if (bal > 0) {
        Store.addWallet({
          name: inp.dataset.name,
          type: inp.dataset.type,
          balance: bal
        });
        hasWallet = true;
      }
    });

    if (!hasWallet) {
      // Add at least Cash with 0
      Store.addWallet({ name: 'Cash', type: 'cash', balance: 0 });
    }

    Store.completeSetup();
    overlay.remove();
    Router.handleRoute();
    Toast.show(t('welcomeToast'), 'success');
  });
}

// ── Settings & Data Management ──
window.openSettingsModal = function () {
  const body = `
    <div style="display:flex; flex-direction:column; gap:var(--space-md);">
      <p class="text-secondary" style="font-size:var(--fs-sm); line-height:1.5;">Data aplikasi ini disimpan secara lokal di perangkat Anda. Gunakan fitur ini untuk membackup data Anda secara rutin atau memindahkannya ke perangkat lain.</p>
      
      <button class="btn btn--primary" style="display:flex; align-items:center; justify-content:center; gap:8px;" onclick="exportData()">
        ${mIcon('download')}
        Export Data (Download JSON)
      </button>

      <div style="border-top:1px solid var(--outline-variant); margin: var(--space-sm) 0;"></div>

      <p class="text-secondary" style="font-size:var(--fs-sm); line-height:1.5;">Pilih file backup (.json) untuk memulihkan data Anda. <strong style="color:var(--color-expense);">Perhatian: Data saat ini akan terhapus dan ditimpa!</strong></p>
      
      <input type="file" id="import-file" accept=".json" style="display:none;" onchange="importData(event)">
      <button class="btn btn--secondary btn-import-data" style="display:flex; align-items:center; justify-content:center; gap:8px;" onclick="document.getElementById('import-file').click()">
        ${mIcon('upload')}
        Import Data (Restore)
      </button>
    </div>
  `;
  Modal.open('Pengaturan Data', body);
};

window.exportData = function () {
  try {
    const data = localStorage.getItem('mywallet_data');
    if (!data) return Toast.show('Tidak ada data untuk diexport', 'warning');

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mywallet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Data berhasil diexport! ✅', 'success');
  } catch (err) {
    Toast.show('Gagal export data', 'error');
  }
};

window.importData = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const contents = e.target.result;
      const parsed = JSON.parse(contents);

      // Basic validation to make sure it's mywallet data
      if (!parsed.wallets || !Array.isArray(parsed.transactions)) {
        throw new Error('Format file tidak valid untuk MyWallet');
      }

      localStorage.setItem('mywallet_data', JSON.stringify(parsed));
      Store.invalidateCache(); // Clear in-memory cache before reload
      Toast.show('Data berhasil dipulihkan! Aplikasi memuat ulang... 🔄', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      Toast.show('Gagal import: Format file tidak valid atau rusak', 'error');
    }
  };
  reader.readAsText(file);
};

// ── Wallet Selector (for forms) ──
function renderWalletSelector(selectedId = '') {
  const wallets = Store.getWallets();
  return `
    <div class="form-group">
      <label class="form-group__label">${t('selectWallet')}</label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:8px;">
        ${wallets.map(w => `
          <div class="wallet-chip ${w.id === selectedId ? 'selected' : ''}" data-wallet-id="${w.id}">
            <span class="wallet-chip__icon">${getWalletIcon(w)}</span>
            <span class="wallet-chip__name">${Utils.escapeHtml(w.name)}</span>
            <span class="wallet-chip__balance">${Utils.formatShort(w.balance)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Category Selector (for forms) ──
function renderCategorySelector(type = 'expense', selectedCat = '') {
  const cats = Object.entries(CATEGORIES).filter(([, v]) => v.type === type);
  return `
    <div class="form-group">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <label class="form-group__label" style="margin-bottom:0;">${t('selectCategory')}</label>
      </div>
      <div class="cat-grid">
        ${cats.map(([key, cat]) => `
          <div class="cat-grid__item ${key === selectedCat ? 'selected' : ''}" data-category="${key}">
            <span class="cat-grid__item-icon">${cat.icon}</span>
            <span>${Utils.getCategoryName(key)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Modal Helper: Add New Custom Category ──
function openAddCategoryModal(defaultType = 'expense', onSaved = null) {
  const icons = [
    'label', 'shopping_bag', 'restaurant', 'local_cafe', 'directions_car', 
    'bolt', 'medical_services', 'movie', 'school', 'payments', 
    'work', 'fitness_center', 'pets', 'flight', 'home', 
    'card_giftcard', 'savings', 'sports_esports', 'build', 'phone_iphone', 
    'checkroom', 'chair', 'park', 'redeem'
  ];
  let selectedIcon = 'label';
  let catType = defaultType;

  const html = `
    <div class="form-group">
      <label class="form-group__label">${t('categoryType')}</label>
      <div class="tab-switcher" id="custom-cat-type-tabs">
        <button type="button" class="tab-switcher__tab ${catType === 'expense' ? 'active' : ''}" data-type="expense">${t('expense')}</button>
        <button type="button" class="tab-switcher__tab ${catType === 'income' ? 'active' : ''}" data-type="income">${t('income')}</button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-group__label">${t('categoryName')}</label>
      <input type="text" id="new-cat-name" placeholder="${t('categoryNamePlaceholder')}" style="width:100%;">
    </div>

    <div class="form-group">
      <label class="form-group__label">${t('selectIcon')}</label>
      <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:8px;max-height:160px;overflow-y:auto;padding:4px;" id="cat-icon-picker">
        ${icons.map(ic => `
          <div class="icon-picker__item ${ic === selectedIcon ? 'selected' : ''}" data-icon="${ic}" style="padding:10px;border-radius:var(--radius-md);border:1px solid var(--outline-variant);display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--surface);">
            ${mIcon(ic)}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  Modal.open(t('addCategoryNew'), html, {
    footerHtml: `<button class="btn btn--primary btn--full" id="save-new-cat-btn">${t('saveCategory')}</button>`,
    onOpen(overlay) {
      overlay.querySelectorAll('#custom-cat-type-tabs .tab-switcher__tab').forEach(tab => {
        tab.addEventListener('click', () => {
          overlay.querySelectorAll('#custom-cat-type-tabs .tab-switcher__tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          catType = tab.dataset.type;
        });
      });

      overlay.querySelectorAll('#cat-icon-picker .icon-picker__item').forEach(item => {
        item.addEventListener('click', () => {
          overlay.querySelectorAll('#cat-icon-picker .icon-picker__item').forEach(i => i.style.borderColor = 'var(--outline-variant)');
          item.style.borderColor = 'var(--primary)';
          selectedIcon = item.dataset.icon;
        });
      });

      overlay.querySelector('#save-new-cat-btn').addEventListener('click', () => {
        const name = overlay.querySelector('#new-cat-name').value.trim();
        if (!name) { Toast.show(t('enterCategoryName'), 'warning'); return; }

        Store.addCustomCategory({ name, type: catType, iconName: selectedIcon });
        Modal.close();
        Toast.show(`${t('selectCategory')} "${name}" ${t('categoryAdded')}`, 'success');
        if (onSaved) onSaved(catType);
      });
    }
  });
}

// ── Modal Helper: Delete Custom Category ──
function openDeleteCategoryModal(defaultType = 'expense', onChanged = null) {
  function renderList(modalOverlay) {
    const customCats = Object.entries(CATEGORIES).filter(([, cat]) => cat.isCustom);
    const listEl = modalOverlay.querySelector('#custom-cat-list');
    if (!listEl) return;

    if (customCats.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:24px 12px;color:var(--outline);">
          <span class="material-symbols-outlined" style="font-size:40px;margin-bottom:8px;opacity:0.6;">category</span>
          <p style="margin:0;font-size:14px;font-weight:500;">${t('noCustomCatToDelete')}</p>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.8;">${t('systemCatCannotDelete')}</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = customCats.map(([key, cat]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface);border:1px solid var(--outline-variant);border-radius:var(--radius-md);margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;display:flex;align-items:center;">${cat.icon}</span>
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--on-surface);">${Utils.escapeHtml(cat.name)}</div>
            <span style="font-size:11px;padding:1px 6px;border-radius:var(--radius-full);background:${cat.type === 'expense' ? 'rgba(186,26,26,0.1)' : 'rgba(0,69,13,0.1)'};color:${cat.type === 'expense' ? 'var(--error)' : 'var(--primary)'};">
              ${cat.type === 'expense' ? t('expense') : t('income')}
            </span>
          </div>
        </div>
        <button type="button" class="btn--ghost del-cat-item-btn" data-cat-key="${key}" data-cat-name="${Utils.escapeHtml(cat.name)}" style="color:var(--error);font-size:12px;font-weight:600;padding:4px 10px;border-radius:var(--radius-md);background:rgba(186,26,26,0.08);display:flex;align-items:center;gap:4px;">
          ${mIcon('delete')} ${t('delete')}
        </button>
      </div>
    `).join('');

    // Bind delete buttons
    listEl.querySelectorAll('.del-cat-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.catKey;
        const name = btn.dataset.catName;
        if (!key) return;

        Store.deleteCustomCategory(key);
        Toast.show(`${t('selectCategory')} "${name}" ${t('categoryDeleted')}`, 'info');
        renderList(modalOverlay);
        if (onChanged) onChanged();
      });
    });
  }

  const html = `
    <div style="margin-bottom:12px;">
      <p style="margin:0 0 12px;font-size:13px;color:var(--outline);">${t('selectCustomCatToDelete')}</p>
      <div id="custom-cat-list" style="max-height:280px;overflow-y:auto;padding-right:2px;"></div>
    </div>
  `;

  Modal.open(t('deleteCategoryModalTitle'), html, {
    footerHtml: `<button class="btn btn--secondary btn--full" id="close-del-cat-modal-btn">${t('done')}</button>`,
    onOpen(overlay) {
      renderList(overlay);
      overlay.querySelector('#close-del-cat-modal-btn')?.addEventListener('click', () => {
        Modal.close();
      });
    }
  });
}

