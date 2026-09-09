// ========================================
// MyWallet — AI Assistant Page (Verdant Glass)
// ========================================

function renderAI(container) {
  const chatHistory = [];

  // ── Model Selector State ──
  const MODEL_CACHE_KEY = 'ai_models_cache';
  const MODEL_SELECTED_KEY = 'ai_selected_model';
  let modelDropdownOpen = false;
  let modelsByProvider = {}; // { providerId: { name, models: [], endpointId } }
  let modelsLoading = false;
  let collapsedProviders = {}; // { endpointId: true/false }

  function getSelectedModel() {
    try {
      return JSON.parse(localStorage.getItem(MODEL_SELECTED_KEY)) || null;
    } catch { return null; }
  }

  function setSelectedModel(endpointId, model) {
    localStorage.setItem(MODEL_SELECTED_KEY, JSON.stringify({ endpointId, model }));
    // Also set this endpoint as active
    localStorage.setItem('ai_active_endpoint_id', endpointId);
  }

  function getEndpoints() {
    try {
      return JSON.parse(localStorage.getItem('ai_custom_endpoints')) || [];
    } catch { return []; }
  }

  // ── Fetch Models from Each Endpoint ──
  async function fetchAllModels() {
    const endpoints = getEndpoints();
    if (endpoints.length === 0) return;

    modelsLoading = true;
    render();

    // Try to load from cache first
    try {
      const cached = JSON.parse(localStorage.getItem(MODEL_CACHE_KEY));
      if (cached && cached.timestamp && Date.now() - cached.timestamp < 300000) {
        modelsByProvider = cached.data;
        modelsLoading = false;
        render();
        return;
      }
    } catch { /* no cache */ }

    const results = {};

    for (const ep of endpoints) {
      if (!ep.apiKey || !ep.endpointUrl) continue;

      // Strangler kandidat 3: fetch /models via adapter (cache tetap di caller).
      try {
        const entry = await fetchModelsForEndpoint(ep);
        if (entry) results[ep.id] = entry;
      } catch {
        // Jaring pengaman di luar kontrak adapter (tak pernah melempar
        // untuk HTTP/network error): fallback ke default model.
        if (ep.defaultModel) {
          results[ep.id] = {
            name: ep.name,
            providerId: ep.providerId,
            endpointId: ep.id,
            defaultModel: ep.defaultModel,
            models: [ep.defaultModel]
          };
        }
      }
    }

    modelsByProvider = results;
    modelsLoading = false;

    // Cache for 5 minutes
    try {
      localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: results
      }));
    } catch { /* storage full */ }

    render();
  }

  // ── Render Model Selector ──
  function renderModelSelector() {
    const endpoints = getEndpoints();
    if (endpoints.length === 0) {
      return `<div class="ai-model-bar"><span class="ai-model-bar__label">${mIcon('smart_toy')} Asisten Lokal (Tanpa API)</span></div>`;
    }

    const selected = getSelectedModel();
    const selectedLabel = selected
      ? `${getProviderNameForEndpoint(selected.endpointId)} / ${selected.model}`
      : 'Pilih Model...';

    return `
      <div class="ai-model-bar">
        <button class="ai-model-chip" id="ai-model-toggle" type="button">
          ${mIcon('model_training')}
          <span class="ai-model-chip__label">${Utils.escapeHtml(selectedLabel)}</span>
          ${mIcon(modelDropdownOpen ? 'expand_less' : 'expand_more')}
        </button>
        ${modelsLoading ? `<span class="ai-model-loading"><span class="ce-spinner"></span></span>` : ''}
        <button class="ai-model-refresh" id="ai-model-refresh" type="button" title="${t('refreshModels')}" aria-label="${t('refreshModels')}">
          ${mIcon('refresh')}
        </button>
      </div>
      ${modelDropdownOpen ? renderModelDropdown() : ''}
    `;
  }

  function getProviderNameForEndpoint(endpointId) {
    const provider = modelsByProvider[endpointId];
    if (provider) return provider.name;
    const ep = getEndpoints().find(e => e.id === endpointId);
    return ep ? ep.name : 'Unknown';
  }

  function renderModelDropdown() {
    const providerKeys = Object.keys(modelsByProvider);
    if (providerKeys.length === 0) {
      return `
        <div class="ai-model-dropdown">
          <div class="ai-model-dropdown__empty">
            ${mIcon('cloud_off')}
            <span>Tidak ada model ditemukan. Tekan refresh.</span>
          </div>
        </div>
      `;
    }

    const selected = getSelectedModel();

    let html = `<div class="ai-model-dropdown" id="ai-model-dropdown">`;

    for (const key of providerKeys) {
      const provider = modelsByProvider[key];
      const isCollapsed = collapsedProviders[key] !== undefined ? collapsedProviders[key] : true;

      html += `
        <div class="ai-model-group">
          <button class="ai-model-group__header" data-toggle-provider="${key}" type="button">
            <div class="ai-model-group__header-left">
              ${mIcon('dns')}
              <span>${Utils.escapeHtml(provider.name)}</span>
            </div>
            <div class="ai-model-group__header-right">
              <span class="ai-model-group__count">${provider.models.length} model</span>
              ${mIcon(isCollapsed ? 'expand_more' : 'expand_less')}
            </div>
          </button>
          ${!isCollapsed ? `
            <div class="ai-model-group__list">
              ${provider.models.map(model => {
                const isSelected = selected && selected.endpointId === key && selected.model === model;
                const isDefault = model === provider.defaultModel;
                return `
                  <button class="ai-model-item ${isSelected ? 'ai-model-item--active' : ''}" 
                          data-endpoint-id="${key}" data-model="${Utils.escapeHtml(model)}" type="button">
                    <span class="ai-model-item__name mono">${Utils.escapeHtml(model)}</span>
                    ${isDefault ? `<span class="ai-model-item__default">default</span>` : ''}
                    ${isSelected ? mIcon('check_circle') : ''}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  // ── Main Render ──
  function render() {
    container.innerHTML = `
      <div class="ai-container">
        <div class="ai-messages" id="chat-messages">
          ${chatHistory.length === 0 ? renderWelcomeScreen() : chatHistory.map(msg => renderMessageBubble(msg)).join('')}
        </div>
        
        <!-- Input Area (Fixed above bottom nav) -->
        <div class="ai-input-area">
          ${renderModelSelector()}
          <div class="ai-input-bar">
            <button class="btn--ghost btn--icon" style="color:var(--mint-accent);" tabindex="-1" aria-hidden="true">${mIcon('mic')}</button>
            <input type="text" id="chat-input" placeholder="${t('aiInputPlaceholder')}" aria-label="${t('aiInputPlaceholder')}" autocomplete="off">
            <button class="ai-input-bar__send" id="chat-send" aria-label="${t('send')}">${mIcon('send')}</button>
          </div>
        </div>
      </div>
    `;

    // Scroll to bottom
    const msgContainer = container.querySelector('#chat-messages');
    if (msgContainer) {
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    // Events
    const input = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#chat-send');

    async function sendMessage(customText = null) {
      const text = customText || input.value.trim();
      if (!text) return;
      if (!customText) input.value = '';

      chatHistory.push({ role: 'user', text: Utils.escapeHtml(text), time: getCurrentTimeStr() });

      // Show typing indicator
      chatHistory.push({ role: 'ai', text: '⏳ ...', time: getCurrentTimeStr(), _loading: true });
      render();

      try {
        const responseObj = await kirimPesanAI(text);
        // Remove loading bubble
        chatHistory.pop();
        chatHistory.push({ role: 'ai', ...responseObj, time: getCurrentTimeStr() });
      } catch (e) {
        chatHistory.pop();
        chatHistory.push({ role: 'ai', text: `⚠️ Error: ${Utils.escapeHtml(e.message)}`, time: getCurrentTimeStr() });
      }

      render();
    }

    if (sendBtn) sendBtn.addEventListener('click', () => sendMessage());
    if (input) {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
      input.focus();
    }

    // Quick prompt chip clicks
    container.querySelectorAll('.ai-welcome__prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.prompt;
        sendMessage(text);
      });
    });

    // Model selector events
    const modelToggle = container.querySelector('#ai-model-toggle');
    if (modelToggle) {
      modelToggle.addEventListener('click', () => {
        modelDropdownOpen = !modelDropdownOpen;
        render();
      });
    }

    const refreshBtn = container.querySelector('#ai-model-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Clear cache and re-fetch
        localStorage.removeItem(MODEL_CACHE_KEY);
        fetchAllModels();
      });
    }

    // Toggle provider collapse/expand
    container.querySelectorAll('[data-toggle-provider]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const providerId = btn.dataset.toggleProvider;
        const isCurrentlyCollapsed = collapsedProviders[providerId] !== undefined ? collapsedProviders[providerId] : true;
        collapsedProviders[providerId] = !isCurrentlyCollapsed;
        render();
      });
    });

    // Model item clicks
    container.querySelectorAll('.ai-model-item').forEach(item => {
      item.addEventListener('click', () => {
        const endpointId = item.dataset.endpointId;
        const model = item.dataset.model;
        setSelectedModel(endpointId, model);
        modelDropdownOpen = false;
        render();
      });
    });

    // Close dropdown when clicking outside
    const dropdown = container.querySelector('#ai-model-dropdown');
    if (dropdown) {
      document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.ai-model-bar') && !e.target.closest('#ai-model-dropdown')) {
          modelDropdownOpen = false;
          render();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }
  }

  render();

  // Auto-fetch models on page load
  fetchAllModels();
}

function getCurrentTimeStr() {
  const d = new Date();
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function renderWelcomeScreen() {
  return `
    <div class="ai-welcome">
      <div class="ai-welcome__icon">${mIcon('smart_toy')}</div>
      <h2 class="ai-welcome__title">${t('aiTitle')}</h2>
      <p class="ai-welcome__desc">${t('aiDesc')}</p>
      
      <div class="ai-welcome__prompts">
        <button class="ai-welcome__prompt-chip" data-prompt="${t('promptBalance')}">"${t('promptBalance')}"</button>
        <button class="ai-welcome__prompt-chip" data-prompt="${t('promptExpense')}">"${t('promptExpense')}"</button>
        <button class="ai-welcome__prompt-chip" data-prompt="${t('promptTips')}">"${t('promptTips')}"</button>
      </div>
    </div>
  `;
}

function renderMessageBubble(msg) {
  if (msg.role === 'user') {
    return `
      <div class="chat-bubble-user">
        <div class="chat-bubble-user__content">
          <p>${msg.text}</p>
        </div>
        <span class="chat-bubble-user__time">${msg.time}</span>
      </div>
    `;
  }

  // AI role
  let receiptHtml = '';

  // Render Action Results (Debts, Bills, Wallets, Transfers)
  if (msg.actionResults && msg.actionResults.length > 0) {
    receiptHtml = msg.actionResults.map(act => {
      if (act.intent === 'ADD_DEBT') {
        const d = act.debtData;
        const isDebt = d.type === 'debt';
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type ${isDebt ? 'chat-receipt__type--expense' : 'chat-receipt__type--income'}">
                ${isDebt ? 'Hutang Baru' : 'Piutang Baru'}
              </span>
              <span class="chat-receipt__date">Hutang & Piutang</span>
            </div>
            <p class="chat-receipt__desc">👤 ${Utils.escapeHtml(d.personName)} (${Utils.escapeHtml(d.note)})</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('handshake')}
                <span>${Utils.escapeHtml(d.personName)}</span>
              </div>
              <span class="chat-receipt__amount ${isDebt ? 'text-expense' : 'text-income'} mono">
                ${isDebt ? '-' : '+'}Rp ${new Intl.NumberFormat('id-ID').format(d.amount)}
              </span>
            </div>
          </div>
        `;
      }
      if (act.intent === 'PAY_DEBT') {
        const d = act.debt;
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type chat-receipt__type--income">
                LUNAS
              </span>
              <span class="chat-receipt__date">Hutang & Piutang</span>
            </div>
            <p class="chat-receipt__desc">✅ Pelunasan: ${Utils.escapeHtml(d.personName)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('check_circle')}
                <span>${Utils.escapeHtml(d.personName)}</span>
              </div>
              <span class="chat-receipt__amount text-income mono">
                Rp ${new Intl.NumberFormat('id-ID').format(d.amount)}
              </span>
            </div>
          </div>
        `;
      }
      if (act.intent === 'ADD_BILL') {
        const b = act.billData;
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type chat-receipt__type--expense">
                Tagihan Baru
              </span>
              <span class="chat-receipt__date">Tagihan</span>
            </div>
            <p class="chat-receipt__desc">📋 ${Utils.escapeHtml(b.title)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('request_quote')}
                <span>${b.dueDate ? 'Jatuh tempo: ' + b.dueDate : 'Aktif'}</span>
              </div>
              <span class="chat-receipt__amount text-expense mono">
                Rp ${new Intl.NumberFormat('id-ID').format(b.amount)}
              </span>
            </div>
          </div>
        `;
      }
      if (act.intent === 'PAY_BILL') {
        const b = act.bill;
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type chat-receipt__type--income">
                Tagihan Dibayar
              </span>
              <span class="chat-receipt__date">Tagihan</span>
            </div>
            <p class="chat-receipt__desc">✅ Pelunasan: ${Utils.escapeHtml(b.title)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('task_alt')}
                <span>${Utils.escapeHtml(b.title)}</span>
              </div>
              <span class="chat-receipt__amount text-income mono">
                Rp ${new Intl.NumberFormat('id-ID').format(b.amount)}
              </span>
            </div>
          </div>
        `;
      }
      if (act.intent === 'ADD_WALLET') {
        const w = act.walletData;
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type chat-receipt__type--income">Dompet Baru</span>
              <span class="chat-receipt__date">Dompet</span>
            </div>
            <p class="chat-receipt__desc">👛 ${Utils.escapeHtml(w.name)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">${mIcon('account_balance_wallet')} <span>${Utils.escapeHtml(w.name)}</span></div>
              <span class="chat-receipt__amount text-income mono">Rp ${new Intl.NumberFormat('id-ID').format(w.balance)}</span>
            </div>
          </div>
        `;
      }
      if (act.intent === 'TRANSFER_WALLET') {
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type chat-receipt__type--income">Transfer Saldo</span>
              <span class="chat-receipt__date">Dompet</span>
            </div>
            <p class="chat-receipt__desc">🔄 ${Utils.escapeHtml(act.fromWallet.name)} ➔ ${Utils.escapeHtml(act.toWallet.name)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">${mIcon('sync_alt')} <span>Transfer</span></div>
              <span class="chat-receipt__amount text-income mono">Rp ${new Intl.NumberFormat('id-ID').format(act.amount)}</span>
            </div>
          </div>
        `;
      }
      if (act.intent === 'ADD_TRANSACTION') {
        const tx = act.txData;
        const cat = CATEGORIES[tx.category] || {};
        const wallet = Store.getWallet ? Store.getWallet(tx.walletId) || {} : {};
        const isIncome = tx.type === 'income';
        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type ${isIncome ? 'chat-receipt__type--income' : 'chat-receipt__type--expense'}">
                ${isIncome ? 'Income' : 'Expense'}
              </span>
              <span class="chat-receipt__date">Today</span>
            </div>
            <p class="chat-receipt__desc">${tx.note ? Utils.escapeHtml(tx.note) : Utils.escapeHtml(cat.name || tx.category)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('account_balance_wallet')}
                <span>${Utils.escapeHtml(wallet.name || '—')}</span>
              </div>
              <span class="chat-receipt__amount ${isIncome ? 'text-income' : 'text-expense'} mono">
                ${isIncome ? '+' : '-'}Rp ${new Intl.NumberFormat('id-ID').format(tx.amount)}
              </span>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');
  } else {
    // Fallback for single or multiple transaction list
    const txList = msg.parsedTxs || (msg.parsedTx ? [msg.parsedTx] : []);
    if (txList.length > 0) {
      receiptHtml = txList.map(tx => {
        const cat = CATEGORIES[tx.category] || {};
        const wallet = Store.getWallet ? Store.getWallet(tx.walletId) || {} : {};
        const isIncome = tx.type === 'income';

        return `
          <div class="chat-receipt">
            <div class="chat-receipt__header">
              <span class="chat-receipt__type ${isIncome ? 'chat-receipt__type--income' : 'chat-receipt__type--expense'}">
                ${isIncome ? 'Income' : 'Expense'}
              </span>
              <span class="chat-receipt__date">Today</span>
            </div>
            <p class="chat-receipt__desc">${tx.note ? Utils.escapeHtml(tx.note) : Utils.escapeHtml(cat.name || tx.category)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('account_balance_wallet')}
                <span>${Utils.escapeHtml(wallet.name || '—')}</span>
              </div>
              <span class="chat-receipt__amount ${isIncome ? 'text-income' : 'text-expense'} mono">
                ${isIncome ? '+' : '-'}Rp ${new Intl.NumberFormat('id-ID').format(tx.amount)}
              </span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  return `
    <div class="chat-bubble-ai">
      <div class="chat-bubble-ai__avatar">
        ${mIcon('smart_toy')}
      </div>
      <div class="chat-bubble-ai__wrap">
        <div class="chat-bubble-ai__content">
          <p>${msg.text}</p>
          ${receiptHtml}
        </div>
        <span class="chat-bubble-ai__time">${msg.time}</span>
      </div>
    </div>
  `;
}

// ── AI Natural Language Parser ──
function processAIMessage(text) {
  const lower = text.toLowerCase().trim();

  // ── Check for balance query ──
  if (lower.match(/saldo|berapa\s*(uang|duit|saldo)|total\s*(saldo|uang)/)) {
    const total = Store.getTotalBalance();
    const wallets = Store.getWallets();

    let details = wallets.map(w => `${w.name}: **${Utils.formatRupiah(w.balance)}**`).join('\n');
    return {
      text: `Saldo dompet Anda saat ini total **${Utils.formatRupiah(total)}**:\n\n${details}`
    };
  }

  // ── Check for expense report ──
  if (lower.match(/pengeluaran\s*(minggu|bulan|hari)|laporan|report|ringkasan/)) {
    const isWeek = lower.includes('minggu');
    let txs;
    if (isWeek) {
      const startWeek = Utils.startOfWeek();
      txs = Store.getTransactions({ type: 'expense', dateFrom: startWeek });
    } else {
      txs = Store.getTransactions({ type: 'expense', currentMonth: true });
    }

    const total = txs.reduce((s, t) => s + t.amount, 0);
    const byCategory = {};
    txs.forEach(t => {
      const catName = (CATEGORIES[t.category] || {}).name || t.category;
      byCategory[catName] = (byCategory[catName] || 0) + t.amount;
    });

    let textResp = `📊 Total pengeluaran **${isWeek ? 'minggu ini' : 'bulan ini'}** adalah **${Utils.formatRupiah(total)}**.`;
    if (total > 0) {
      const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const topCategory = sorted[0][0];
      textResp += ` Pengeluaran terbesar pada kategori **${Utils.escapeHtml(topCategory)}**.`;
    }
    return { text: textResp };
  }

  // ── Check for financial tips ──
  if (lower.match(/saran|tips?|rekomendasi|hemat|nabung/)) {
    const expense = Store.getMonthlyExpense();
    const income = Store.getMonthlyIncome();

    let textResp = `💡 **Tips Keuangan MyWallet:**\n`;
    if (income > 0) {
      const savingsRate = Math.round(((income - expense) / income) * 100);
      textResp += `Rasio tabungan Anda bulan ini: **${savingsRate}%**. `;
      if (savingsRate < 20) textResp += `Disarankan untuk menyisihkan minimal 20% dari pemasukan.`;
      else textResp += `Hebat! Anda berhasil menabung di atas 20%.`;
    } else {
      textResp += `Selalu catat pengeluaran harian dan alokasikan 20% pemasukan untuk tabungan darurat.`;
    }
    return { text: textResp };
  }

  // ── Universal AI Intent Router (Transactions, Debts, Bills, Wallets, Transfers) ──
  const actions = parseAIIntent(text, {
    debts: Store.getDebts({ isPaid: false }),
    bills: Store.getBills({ isPaid: false }),
    wallets: Store.getWallets(),
  });
  if (actions.length > 0) {
    const { summaryList, actionResults } = executeAIIntents(actions);

    return {
      text: `✅ **${actions.length} aksi** berhasil diproses di MyWallet:\n\n${summaryList.join('\n')}`,
      actionResults
    };
  }

  // ── Fallback ──
  return {
    text: `Saya belum memahami pesan tersebut. Coba gunakan contoh perintah:\n• *"Beli kopi 20rb pakai OVO"*\n• *"Hutang ke Dinda 100ribu"*\n• *"Lunas hutang Dinda"*\n• *"Tambah tagihan Wifi 300rb"*`
  };
}

// ── Universal Intent Parser (Transactions, Debts, Bills, Wallets, Transfers) ──
// ── Universal Intent Executor ──
function executeAIIntents(actions) {
  const summaryList = [];
  const actionResults = [];

  for (const act of actions) {
    if (act.intent === 'ADD_DEBT') {
      const result = executeIntent({ intent: 'ADD_DEBT', ...act.debtData });
      const isDebt = result.debtData.type === 'debt';
      summaryList.push(`• **${isDebt ? 'Hutang Baru' : 'Piutang Baru'}**: ${Utils.escapeHtml(result.debtData.personName)} (Rp ${new Intl.NumberFormat('id-ID').format(result.debtData.amount)})`);
      actionResults.push({ intent: 'ADD_DEBT', debtData: result.debtData, created: result.created });
    }
    else if (act.intent === 'PAY_DEBT') {
      const result = executeIntent({
        intent: 'PAY_DEBT',
        personName: act.personName,
        walletName: act.walletName || '',
        walletId: act.walletId,
        walletExplicit: !!act.walletExplicit,
        amount: act.amount,
      });
      if (!result.ok) {
        summaryList.push(`• **Gagal melunasi**: ${Utils.escapeHtml(result.message)}`);
        actionResults.push({ intent: result.intent, personName: act.personName });
      } else {
        summaryList.push(`• **Pelunasan Hutang**: ${Utils.escapeHtml(result.personName)} (Rp ${new Intl.NumberFormat('id-ID').format(result.debt.amount)}) -> LUNAS`);
        actionResults.push({ intent: 'PAY_DEBT', debt: result.debt, personName: result.personName });
      }
    }
    else if (act.intent === 'ADD_BILL') {
      const result = executeIntent({ intent: 'ADD_BILL', ...act.billData });
      summaryList.push(`• **Tagihan Baru**: ${Utils.escapeHtml(result.billData.title)} (Rp ${new Intl.NumberFormat('id-ID').format(result.billData.amount)})`);
      actionResults.push({ intent: 'ADD_BILL', billData: result.billData, created: result.created });
    }
    else if (act.intent === 'PAY_BILL') {
      const result = executeIntent({
        intent: 'PAY_BILL',
        title: act.title,
        walletName: act.walletName || '',
        walletId: act.walletId,
        walletExplicit: !!act.walletExplicit,
        amount: act.amount,
      });
      if (!result.ok) {
        summaryList.push(`• **Gagal melunasi**: ${Utils.escapeHtml(result.message)}`);
        actionResults.push({ intent: result.intent, title: act.title });
      } else {
        summaryList.push(`• **Pelunasan Tagihan**: ${Utils.escapeHtml(result.title)} (Rp ${new Intl.NumberFormat('id-ID').format(result.bill.amount)}) -> DIBAYAR`);
        actionResults.push({ intent: 'PAY_BILL', bill: result.bill, title: result.title });
      }
    }
    else if (act.intent === 'ADD_WALLET') {
      const created = Store.addWallet(act.walletData);
      summaryList.push(`• **Dompet Baru**: ${Utils.escapeHtml(act.walletData.name)} (Saldo Awal: Rp ${new Intl.NumberFormat('id-ID').format(act.walletData.balance)})`);
      actionResults.push({ intent: 'ADD_WALLET', walletData: act.walletData, created });
    }
    else if (act.intent === 'TRANSFER_WALLET') {
      const result = executeIntent({
        intent: 'TRANSFER_WALLET',
        fromWalletName: act.fromWalletName || '',
        toWalletName: act.toWalletName || '',
        fromWalletId: act.fromWalletId || (act.fromWallet && act.fromWallet.id),
        toWalletId: act.toWalletId || (act.toWallet && act.toWallet.id),
        walletExplicit: !!act.walletExplicit,
        amount: act.amount,
      });
      if (!result.ok) {
        summaryList.push(`• **Gagal transfer**: ${Utils.escapeHtml(result.message)}`);
        actionResults.push({ intent: 'TRANSFER_FAILED' });
      } else {
        summaryList.push(`• **Transfer Saldo**: ${Utils.escapeHtml(result.fromWallet.name)} ➔ ${Utils.escapeHtml(result.toWallet.name)} (Rp ${new Intl.NumberFormat('id-ID').format(result.amount)})`);
        actionResults.push({ intent: 'TRANSFER_WALLET', fromWallet: result.fromWallet, toWallet: result.toWallet, amount: result.amount });
      }
    }
    else if (act.intent === 'ADD_TRANSACTION') {
      const result = executeIntent({
        intent: 'ADD_TRANSACTION',
        type: act.txData.type,
        amount: act.txData.amount,
        category: act.txData.category,
        walletName: act.walletName || '',
        walletId: act.txData.walletId,
        walletExplicit: !!act.walletExplicit,
        note: act.txData.note,
        date: act.txData.date,
      });
      if (!result.ok) {
        summaryList.push(`• **Gagal mencatat**: nominal tidak valid atau saldo tidak cukup.`);
        actionResults.push({ intent: 'ADD_TRANSACTION_FAILED', txData: act.txData, created: null });
      } else {
        const w = Store.getWallet ? Store.getWallet(result.txData.walletId) : null;
        summaryList.push(`• **${result.txData.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}**: Rp ${new Intl.NumberFormat('id-ID').format(result.txData.amount)} (${Utils.escapeHtml(result.txData.note)})${w ? ' via ' + Utils.escapeHtml(w.name) : ''}`);
        actionResults.push({ intent: 'ADD_TRANSACTION', txData: result.txData, created: result.txData });
      }
    }
  }

  return { summaryList, actionResults };
}
