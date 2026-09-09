// ========================================
// MyWallet — App Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Ensure stored settings (language & theme) are initialized
  Store.load();
  Store.syncEnvironment();

  // Build app shell
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <div class="main">
      ${renderHeader()}
      <div class="page-content" id="page-content"></div>
    </div>
    ${renderBottomNav()}
  `;

  // Register routes
  Router.register('dashboard', renderDashboard);
  Router.register('transactions', renderTransactions);
  Router.register('wallets', renderWallets);
  Router.register('debts', renderDebts);
  Router.register('bills', renderBills);
  Router.register('ai', renderAI);
  Router.register('custom-endpoints', renderCustomEndpoints);
  Router.register('settings', renderSettings);

  // Check bill deadline notifications on startup & periodically every 60s
  Store.checkBillNotifications();
  setInterval(() => Store.checkBillNotifications(), 60000);

  // Dismiss splash screen overlay smoothly
  setTimeout(() => {
    const splash = document.getElementById('app-splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 450);
    }
  }, 900);

  bindAppEvents();

  // Check if onboarding needed
  if (!Store.isSetupComplete()) {
    renderOnboarding();
  }

  // Init router
  Router.init();
}

// Satu-satunya cara me-refresh shell (sidebar/header/bottomNav) pasca ganti
// bahasa (cf. Kandidat 5; bug #2 hanya menambal gejala via rebind manual).
// `rerender` berbeda per caller: Router.handleRoute (header-toggle) vs
// updateHeaderTitle + renderSettings (radio Settings). Toast milik caller.
function refreshShell(rerender) {
  const sidebarElem = document.getElementById('sidebar');
  const headerElem = document.getElementById('header');
  const bottomNavElem = document.getElementById('bottom-nav');

  if (sidebarElem) sidebarElem.outerHTML = renderSidebar();
  if (headerElem) headerElem.outerHTML = renderHeader();
  if (bottomNavElem) bottomNavElem.outerHTML = renderBottomNav();

  bindAppEvents();
  if (typeof rerender === 'function') rerender();
}

// Global (was nested in initApp): shell elements are replaced via outerHTML
// on language switch (here & in Settings), which drops their handlers —
// callers must rebind via this global afterwards.
function bindAppEvents() {
  const bottomMenuBtn = document.getElementById('bottom-nav-menu');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  }

  // Satu-satunya pembuka sidebar: tombol Menu di bottom nav.
  if (bottomMenuBtn) {
    bottomMenuBtn.setAttribute('aria-expanded', 'false');
    bottomMenuBtn.onclick = () => {
      if (sidebar) sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('visible');
      const isOpen = !!((sidebar && sidebar.classList.contains('open')) || (overlay && overlay.classList.contains('visible')));
      bottomMenuBtn.setAttribute('aria-expanded', String(isOpen));
    };
  }
  if (overlay) {
    overlay.onclick = closeSidebar;
  }

  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.onclick = closeSidebar;
  });

  // Center quick action lives inside #bottom-nav (re-created on refreshShell),
  // so its handler must be (re)bound here alongside the shell handlers.
  const fab = document.getElementById('fab-btn');
  if (fab) {
    fab.onclick = () => openTransactionForm();
  }

  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.onclick = () => {
      const curLang = I18n.getLang();
      const newLang = curLang === 'id' ? 'en' : 'id';
      Store.setLanguage(newLang);

      refreshShell(() => Router.handleRoute());
      Toast.show(newLang === 'id' ? 'Bahasa diubah ke Bahasa Indonesia 🇮🇩' : 'Language changed to English 🇬🇧', 'success');
    };
  }
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
