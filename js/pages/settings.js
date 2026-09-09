// ========================================
// MyWallet — Settings Page (Verdant Glass)
// ========================================

function renderSettings(container) {
  const curLang = I18n.getLang();
  const curTheme = Store.getTheme();

  // Ensure header title displays translated Settings title
  if (typeof Router !== 'undefined' && Router.updateHeaderTitle) {
    Router.updateHeaderTitle('settings');
  }

  container.innerHTML = `
    <!-- Header Section -->
    <div class="page-header" style="animation:fadeInUp .35s var(--ease-out)">
      <div>
        <h2 class="page-header__title">${t('settings')}</h2>
        <p class="page-header__subtitle">${t('settingsSubtitle')}</p>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:20px;max-width:600px;animation:fadeInUp .4s var(--ease-out)">
      
      <!-- Theme Settings Card -->
      <div class="card" style="padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="color:var(--primary);font-size:24px;">${mIcon('palette')}</div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);margin:0;">${t('themeTitle')}</h3>
            <span style="font-size:12px;color:var(--outline);">${t('themeDesc')}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <label class="theme-option" data-theme="light" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:var(--radius-lg);border:1px solid ${curTheme === 'light' ? 'var(--primary)' : 'var(--outline-variant)'};background:${curTheme === 'light' ? 'rgba(0,69,13,0.06)' : 'var(--surface)'};cursor:pointer;transition:all 0.2s;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="color:var(--primary);font-size:20px;">${mIcon('light_mode')}</span>
              <span style="font-weight:600;font-size:14px;color:var(--on-surface);">${t('themeLight')}</span>
            </div>
            <input type="radio" name="app-theme" value="light" ${curTheme === 'light' ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px;">
          </label>

          <label class="theme-option" data-theme="dark" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:var(--radius-lg);border:1px solid ${curTheme === 'dark' ? 'var(--primary)' : 'var(--outline-variant)'};background:${curTheme === 'dark' ? 'rgba(126,219,134,0.12)' : 'var(--surface)'};cursor:pointer;transition:all 0.2s;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="color:var(--primary);font-size:20px;">${mIcon('dark_mode')}</span>
              <span style="font-weight:600;font-size:14px;color:var(--on-surface);">${t('themeDark')}</span>
            </div>
            <input type="radio" name="app-theme" value="dark" ${curTheme === 'dark' ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px;">
          </label>
        </div>
      </div>

      <!-- Language Settings Card -->
      <div class="card" style="padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="color:var(--primary);font-size:24px;">${mIcon('translate')}</div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);margin:0;">${t('language')}</h3>
            <span style="font-size:12px;color:var(--outline);">${t('selectLangDesc')}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <label class="lang-option" data-lang="id" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:var(--radius-lg);border:1px solid ${curLang === 'id' ? 'var(--primary)' : 'var(--outline-variant)'};background:${curLang === 'id' ? 'rgba(0,69,13,0.06)' : 'var(--surface)'};cursor:pointer;transition:all 0.2s;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:20px;">🇮🇩</span>
              <span style="font-weight:600;font-size:14px;color:var(--on-surface);">${t('langIndonesian')}</span>
            </div>
            <input type="radio" name="app-lang" value="id" ${curLang === 'id' ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px;">
          </label>

          <label class="lang-option" data-lang="en" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:var(--radius-lg);border:1px solid ${curLang === 'en' ? 'var(--primary)' : 'var(--outline-variant)'};background:${curLang === 'en' ? 'rgba(0,69,13,0.06)' : 'var(--surface)'};cursor:pointer;transition:all 0.2s;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:20px;">🇬🇧</span>
              <span style="font-weight:600;font-size:14px;color:var(--on-surface);">${t('langEnglish')}</span>
            </div>
            <input type="radio" name="app-lang" value="en" ${curLang === 'en' ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px;">
          </label>
        </div>
      </div>

      <!-- Category Management Card -->
      <div class="card" style="padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="color:var(--primary);font-size:24px;">${mIcon('category')}</div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);margin:0;">${t('categoryManagement')}</h3>
            <span style="font-size:12px;color:var(--outline);">${t('categoryMgmtDesc')}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <button type="button" class="btn btn--primary" id="settings-add-cat-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;">
            ${mIcon('add')} ${t('addCategoryNew')}
          </button>
          <button type="button" class="btn btn--secondary btn-import-data" id="settings-del-cat-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;">
            ${mIcon('delete')} ${t('deleteCustomCategoryBtn')}
          </button>
          <button type="button" class="btn btn--secondary btn-import-data" id="settings-reset-cat-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;">
            ${mIcon('restart_alt')} ${t('resetCategoriesBtn')}
          </button>
        </div>
      </div>

      <!-- Data Backup & Restore Card -->
      <div class="card" style="padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="color:var(--primary);font-size:24px;">${mIcon('storage')}</div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--on-surface);margin:0;">${t('dataManagement')}</h3>
            <span style="font-size:12px;color:var(--outline);">${t('dataBackupDesc')}</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;">
          <button class="btn btn--primary" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;" id="settings-export-btn">
            ${mIcon('download')} Export Data (Download JSON)
          </button>

          <input type="file" id="settings-import-file" accept=".json" style="display:none;">
          <button class="btn btn--secondary btn-import-data" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;" id="settings-import-btn">
            ${mIcon('upload')} Import Data (Restore JSON)
          </button>
        </div>
      </div>

      <!-- App Info Card -->
      <div class="card" style="padding:20px;text-align:center;background:rgba(255,255,255,0.1);">
        <div style="font-weight:700;font-size:14px;color:var(--primary);margin-bottom:4px;">MyWallet v1.0.0</div>
        <div style="font-size:12px;color:var(--outline);">Verdant Glass Edition • PWA Encrypted Local Data</div>
      </div>

    </div>
  `;

  // Bind theme selection events
  container.querySelectorAll('input[name="app-theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      Store.setTheme(newTheme);
      renderSettings(container);
      Toast.show(newTheme === 'dark' ? 'Mode Gelap diaktifkan (Verdant Night) 🌙' : 'Mode Terang diaktifkan ☀️', 'success');
    });
  });

  // Bind language selection events
  container.querySelectorAll('input[name="app-lang"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const newLang = e.target.value;
      Store.setLanguage(newLang);

      // Refresh shell satu pintu (cf. Kandidat 5); Toast milik caller.
      refreshShell(() => {
        if (typeof Router !== 'undefined' && Router.updateHeaderTitle) {
          Router.updateHeaderTitle('settings');
        }
        renderSettings(container);
      });

      Toast.show(newLang === 'id' ? 'Bahasa diubah ke Bahasa Indonesia 🇮🇩' : 'Language changed to English 🇬🇧', 'success');
    });
  });

  // Category management events
  const addCatBtn = container.querySelector('#settings-add-cat-btn');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', () => {
      if (typeof openAddCategoryModal === 'function') {
        openAddCategoryModal('expense');
      }
    });
  }

  const delCatBtn = container.querySelector('#settings-del-cat-btn');
  if (delCatBtn) {
    delCatBtn.addEventListener('click', () => {
      if (typeof openDeleteCategoryModal === 'function') {
        openDeleteCategoryModal('expense');
      }
    });
  }

  const resetCatBtn = container.querySelector('#settings-reset-cat-btn');
  if (resetCatBtn) {
    resetCatBtn.addEventListener('click', () => {
      if (confirm(t('resetCategoriesConfirm'))) {
        Store.resetCategories();
        Toast.show(t('categoriesResetSuccess'), 'success');
      }
    });
  }

  // Export data
  container.querySelector('#settings-export-btn').addEventListener('click', () => {
    if (typeof exportData === 'function') exportData();
  });

  // Import data
  const importFile = container.querySelector('#settings-import-file');
  container.querySelector('#settings-import-btn').addEventListener('click', () => {
    importFile.click();
  });
  importFile.addEventListener('change', (e) => {
    if (typeof importData === 'function') importData(e);
  });
}
