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

      let baseUrl = ep.endpointUrl.replace(/\/+$/, '');
      // Ensure we hit /models
      const modelsUrl = baseUrl + '/models';

      try {
        const res = await fetch(modelsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ep.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          const models = (data.data || []).map(m => m.id).filter(Boolean).sort();
          results[ep.id] = {
            name: ep.name,
            providerId: ep.providerId,
            endpointId: ep.id,
            defaultModel: ep.defaultModel,
            models: models.length > 0 ? models : (ep.defaultModel ? [ep.defaultModel] : [])
          };
        } else {
          // Fallback to default model
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
      } catch {
        // Fallback to default model on network error
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
        <button class="ai-model-refresh" id="ai-model-refresh" type="button" title="Refresh models">
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
            <button class="btn--ghost btn--icon" style="color:var(--mint-accent);">${mIcon('mic')}</button>
            <input type="text" id="chat-input" placeholder="${t('aiInputPlaceholder')}" autocomplete="off">
            <button class="ai-input-bar__send" id="chat-send">${mIcon('send')}</button>
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
        chatHistory.push({ role: 'ai', text: `⚠️ Error: ${e.message}`, time: getCurrentTimeStr() });
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
            <p class="chat-receipt__desc">${tx.note ? Utils.escapeHtml(tx.note) : (cat.name || tx.category)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('account_balance_wallet')}
                <span>${wallet.name || '—'}</span>
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
            <p class="chat-receipt__desc">${tx.note ? Utils.escapeHtml(tx.note) : (cat.name || tx.category)}</p>
            <div class="chat-receipt__footer">
              <div class="chat-receipt__wallet">
                ${mIcon('account_balance_wallet')}
                <span>${wallet.name || '—'}</span>
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
      textResp += ` Pengeluaran terbesar pada kategori **${topCategory}**.`;
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
  const actions = parseAIIntent(text);
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
function parseAIIntent(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase().trim();

  // Skip questions / inquiries
  if (lower.includes('?') || 
      lower.match(/^(berapa|apakah|mengapa|kenapa|bagaimana|apa|tips|saran|laporan|ringkasan|cek|lihat|tampilkan|model|siapa)\b/i)) {
    return [];
  }

  const clauses = text.split(/(?:\s+(?:dan|sama|terus|lalu|kemudian|\+|\&)\s+|[,\;\n]+)/i).filter(c => c.trim().length > 0);
  const actions = [];

  for (let clause of clauses) {
    const cLower = clause.toLowerCase().trim();

    // 1. Check for Pay Debt / Pay Receivable (Pelunasan Hutang-Piutang)
    const isPaymentWord = cLower.match(/\b(lunas|melunasi|melunaskan|pelunasan|bayar|membayar|membayarkan|dibayar)\b/i);
    const isDebtWord = cLower.match(/\b(hutang|utang|piutang|pinjaman)\b/i);

    if (isPaymentWord && isDebtWord) {
      const amount = parseAmountFromClause(cLower);
      const walletId = parseWalletFromClause(cLower);

      let personName = '';
      const personMatch = cLower.match(/(?:hutang|utang|piutang|pinjaman)\s+([a-z0-9]+)/i) ||
                          cLower.match(/(?:melunasi|pelunasan|bayar|membayar|lunas)\s+(?:hutang|utang|piutang)?\s*([a-z0-9]+)/i);
      if (personMatch) {
        let p = personMatch[1].replace(/^(ke|pada|dari|oleh|sebesar)\s+/i, '').trim();
        if (!p.match(/^(rp|ribu|rb|jt|juta|\d+|pakai|pake|via|lewat)$/i)) {
          personName = p.charAt(0).toUpperCase() + p.slice(1);
        }
      }
      if (!personName) personName = 'Teman';

      const debts = Store.getDebts({ isPaid: false });
      const found = debts.find(d => d.personName.toLowerCase().includes(personName.toLowerCase()) || personName.toLowerCase().includes(d.personName.toLowerCase()));

      if (found) {
        Store.markDebtPaid(found.id, walletId);
        actions.push({
          intent: 'PAY_DEBT',
          debt: found,
          personName: found.personName,
          amount: amount || found.amount,
          walletId
        });
      } else {
        // Create debt record already marked as LUNAS (Paid)
        const state = Store.load();
        state.debts = state.debts || [];
        const paidAmount = amount || 0;
        const newPaidDebt = {
          id: Utils.id(),
          type: 'debt',
          personName,
          amount: paidAmount,
          walletId,
          date: Utils.today(),
          note: `Pelunasan Hutang ${personName}`,
          isPaid: true,
          paidDate: Utils.today(),
          paidWalletId: walletId,
          createdAt: Date.now()
        };
        // Deduct from wallet balance
        const wIdx = state.wallets.findIndex(w => w.id === walletId);
        if (wIdx !== -1) {
          state.wallets[wIdx].balance -= paidAmount;
        }
        state.debts.push(newPaidDebt);
        Store.save(state);

        actions.push({
          intent: 'PAY_DEBT',
          debt: newPaidDebt,
          personName,
          amount: paidAmount,
          walletId
        });
      }
      continue;
    }

    // 2. Check for Pay Bill (Pelunasan Tagihan)
    const isBillPaymentWord = cLower.match(/\b(bayar|membayar|membayarkan|lunas|melunasi|melunaskan|pelunasan|dibayar)\b/i);
    if (isBillPaymentWord && cLower.includes('tagihan')) {
      const amount = parseAmountFromClause(cLower);
      const walletId = parseWalletFromClause(cLower);

      let title = '';
      const titleMatch = cLower.match(/(?:tagihan)\s+([a-z0-9]+)/i) || cLower.match(/(?:bayar|melunasi|pelunasan|lunas)\s+([a-z0-9]+)/i);
      if (titleMatch) {
        let t = titleMatch[1].replace(/^(tagihan)\s+/i, '').trim();
        if (!t.match(/^(rp|ribu|rb|jt|juta|\d+|pakai|pake|via|lewat)$/i)) {
          title = t.charAt(0).toUpperCase() + t.slice(1);
        }
      }
      if (!title) title = 'Tagihan';

      const bills = Store.getBills({ isPaid: false });
      const found = bills.find(b => b.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(b.title.toLowerCase()));

      if (found) {
        Store.markBillPaid(found.id, walletId || (Store.getWallets()[0]?.id || ''));
        actions.push({
          intent: 'PAY_BILL',
          bill: found,
          title: found.title
        });
      } else {
        // Create bill and mark paid directly
        const billAmount = amount || 0;
        const newBill = Store.addBill({
          title,
          amount: billAmount,
          dueDate: Utils.today(),
          walletId,
          note: `Pelunasan Tagihan: ${title}`
        });
        Store.markBillPaid(newBill.id, walletId || (Store.getWallets()[0]?.id || ''));
        actions.push({
          intent: 'PAY_BILL',
          bill: newBill,
          title
        });
      }
      continue;
    }

    // 3. Check for Add Debt / Add Receivable (Hutang/Piutang Baru)
    if (cLower.match(/\b(hutang|utang|pinjam|piutang|pinjamin)\b/i)) {
      const amount = parseAmountFromClause(cLower);
      if (amount > 0) {
        const isReceivable = !!cLower.match(/piutang|pinjamin|(?:ke\s+saya|dariku|dariku)/i);
        const personMatch = cLower.match(/(?:hutang|utang|pinjam|piutang|pinjamin)\s+(?:ke|pada|dari|oleh)?\s*([a-z0-9]+)/i) ||
                            cLower.match(/([a-z0-9]+)\s+(?:pinjam|hutang|utang)/i);
        const personName = personMatch ? personMatch[1].charAt(0).toUpperCase() + personMatch[1].slice(1) : 'Teman';
        const walletId = parseWalletFromClause(cLower);

        actions.push({
          intent: 'ADD_DEBT',
          debtData: {
            type: isReceivable ? 'receivable' : 'debt',
            personName,
            amount,
            walletId,
            date: Utils.today(),
            note: `Catatan AI: ${isReceivable ? 'Piutang' : 'Hutang'} ${personName}`
          }
        });
        continue;
      }
    }

    // 4. Check for Add Bill (Tambah Tagihan Baru)
    if (cLower.includes('tagihan') || cLower.includes('ingatkan')) {
      const amount = parseAmountFromClause(cLower);
      if (amount > 0) {
        const titleMatch = cLower.match(/(?:tagihan|ingatkan)\s+([a-z0-9\s]+?)(?:\s+\d+|\s+tanggal|\s+tiap|$)/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Tagihan';
        const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
        const walletId = parseWalletFromClause(cLower);

        let dueDate = '';
        const dateMatch = cLower.match(/tanggal\s+(\d{1,2})/i);
        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const now = new Date();
          const d = new Date(now.getFullYear(), now.getMonth(), day);
          dueDate = d.toISOString().split('T')[0];
        }

        actions.push({
          intent: 'ADD_BILL',
          billData: {
            title: cleanTitle,
            amount,
            dueDate: dueDate || Utils.today(),
            walletId,
            note: `Tagihan ${cleanTitle}`
          }
        });
        continue;
      }
    }

    // 5. Check for Transfer (Transfer Antar Dompet)
    if (cLower.match(/\b(transfer|pindah|kirim)\b/i)) {
      const amount = parseAmountFromClause(cLower);
      if (amount > 0) {
        const transferMatch = cLower.match(/(?:dari|lewat)\s+(\w+)\s+(?:ke|masuk)\s+(\w+)/i);
        if (transferMatch) {
          const fromName = transferMatch[1];
          const toName = transferMatch[2];
          const wallets = Store.getWallets();
          const fromW = wallets.find(w => w.name.toLowerCase().includes(fromName));
          const toW = wallets.find(w => w.name.toLowerCase().includes(toName));
          if (fromW && toW) {
            actions.push({
              intent: 'TRANSFER_WALLET',
              fromWallet: fromW,
              toWallet: toW,
              amount
            });
            continue;
          }
        }
      }
    }

    // 6. Check for Add Wallet (Tambah Dompet Baru)
    if (cLower.match(/\b(tambah|buat|bikin)\s+dompet\b/i)) {
      const amount = parseAmountFromClause(cLower);
      const nameMatch = cLower.match(/dompet\s+([a-z0-9]+)/i);
      const name = nameMatch ? nameMatch[1].toUpperCase() : 'Dompet Baru';
      actions.push({
        intent: 'ADD_WALLET',
        walletData: {
          name,
          type: 'ewallet',
          balance: amount
        }
      });
      continue;
    }

    // 7. Fallback to Regular Income/Expense Transaction
    const tx = parseTransactionFromClause(clause, text);
    if (tx) {
      actions.push({
        intent: 'ADD_TRANSACTION',
        txData: tx
      });
    }
  }

  return actions;
}

// ── Universal Intent Executor ──
function executeAIIntents(actions) {
  const summaryList = [];
  const actionResults = [];

  for (const act of actions) {
    if (act.intent === 'ADD_DEBT') {
      const created = Store.addDebt(act.debtData);
      const isDebt = act.debtData.type === 'debt';
      summaryList.push(`• **${isDebt ? 'Hutang Baru' : 'Piutang Baru'}**: ${act.debtData.personName} (Rp ${new Intl.NumberFormat('id-ID').format(act.debtData.amount)})`);
      actionResults.push({ intent: 'ADD_DEBT', debtData: act.debtData, created });
    }
    else if (act.intent === 'PAY_DEBT') {
      Store.markDebtPaid(act.debt.id);
      summaryList.push(`• **Pelunasan Hutang**: ${act.personName} (Rp ${new Intl.NumberFormat('id-ID').format(act.debt.amount)}) -> LUNAS`);
      actionResults.push({ intent: 'PAY_DEBT', debt: act.debt, personName: act.personName });
    }
    else if (act.intent === 'ADD_BILL') {
      const created = Store.addBill(act.billData);
      summaryList.push(`• **Tagihan Baru**: ${act.billData.title} (Rp ${new Intl.NumberFormat('id-ID').format(act.billData.amount)})`);
      actionResults.push({ intent: 'ADD_BILL', billData: act.billData, created });
    }
    else if (act.intent === 'PAY_BILL') {
      const defaultW = Store.getWallets()[0];
      const wId = defaultW ? defaultW.id : '';
      Store.markBillPaid(act.bill.id, wId);
      summaryList.push(`• **Pelunasan Tagihan**: ${act.title} (Rp ${new Intl.NumberFormat('id-ID').format(act.bill.amount)}) -> DIBAYAR`);
      actionResults.push({ intent: 'PAY_BILL', bill: act.bill, title: act.title });
    }
    else if (act.intent === 'ADD_WALLET') {
      const created = Store.addWallet(act.walletData);
      summaryList.push(`• **Dompet Baru**: ${act.walletData.name} (Saldo Awal: Rp ${new Intl.NumberFormat('id-ID').format(act.walletData.balance)})`);
      actionResults.push({ intent: 'ADD_WALLET', walletData: act.walletData, created });
    }
    else if (act.intent === 'TRANSFER_WALLET') {
      Store.transfer(act.fromWallet.id, act.toWallet.id, act.amount);
      summaryList.push(`• **Transfer Saldo**: ${act.fromWallet.name} ➔ ${act.toWallet.name} (Rp ${new Intl.NumberFormat('id-ID').format(act.amount)})`);
      actionResults.push({ intent: 'TRANSFER_WALLET', fromWallet: act.fromWallet, toWallet: act.toWallet, amount: act.amount });
    }
    else if (act.intent === 'ADD_TRANSACTION') {
      const created = Store.addTransaction(act.txData);
      const w = Store.getWallet ? Store.getWallet(act.txData.walletId) : null;
      summaryList.push(`• **${act.txData.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}**: Rp ${new Intl.NumberFormat('id-ID').format(act.txData.amount)} (${act.txData.note})${w ? ' via ' + w.name : ''}`);
      actionResults.push({ intent: 'ADD_TRANSACTION', txData: act.txData, created });
    }
  }

  return { summaryList, actionResults };
}

function parseAmountFromClause(clause) {
  let amount = 0;
  const amountPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k\b)/i,
    /(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+)/i,
    /(?:rp\.?\s*)?(\d+)/i
  ];
  for (const pat of amountPatterns) {
    const m = clause.match(pat);
    if (m) {
      let valStr = m[1].replace(/\./g, '').replace(',', '.');
      let val = parseFloat(valStr);
      if (clause.match(/jt|juta/i)) val *= 1000000;
      else if (clause.match(/rb|ribu|k\b/i)) val *= 1000;
      amount = Math.round(val);
      break;
    }
  }
  return amount;
}

function parseWalletFromClause(clause) {
  const wallets = Store.getWallets();
  const lower = clause.toLowerCase();
  for (const w of wallets) {
    if (lower.includes(w.name.toLowerCase())) return w.id;
  }
  const match = lower.match(/(?:pakai|pake|dari|lewat|via|ke|masuk|menggunakan)\s+(\w+)/i);
  if (match) {
    const targetName = match[1].toLowerCase();
    const found = wallets.find(w => w.name.toLowerCase().includes(targetName));
    if (found) return found.id;
  }
  return wallets.length > 0 ? wallets[0].id : '';
}

function parseTransactionFromClause(clause, fullText) {
  const cLower = clause.toLowerCase().trim();
  const amount = parseAmountFromClause(cLower);
  if (!amount || amount <= 0) return null;

  const walletId = parseWalletFromClause(cLower) || parseWalletFromClause(fullText.toLowerCase());

  let type = 'expense';
  if (cLower.match(/gaji|bonus|thr|terima|dapat|masuk|pendapatan|penjualan|dividen|saku|hadiah|hibah|pemasukan|topup\s+masuk/i)) {
    type = 'income';
  }

  let category = type === 'expense' ? 'food' : 'salary';
  const categoryMap = {
    food: /makan|nasi|goreng|minum|kopi|ayam|sate|bakso|indomie|kantin|warung|resto|snack|jajan|sarapan|makan\s+siang|makan\s+malam|beli\s+makan|restoran|kafe|cafe|boba|jus|teh|roti/i,
    transport: /transport|grab|gojek|ojol|bensin|bbm|parkir|tol|bus|kereta|taxi|angkot|ongkos|pertalite|pertamax|shell|ojek/i,
    shopping: /belanja|baju|pakaian|sepatu|tas|beli|shopee|tokopedia|online\s+shop|lazada|mall|indomaret|alfamart|celana/i,
    bills: /tagihan|listrik|wifi|internet|pulsa|token|air|pdam|gas|langganan|netflix|spotify|subscri|kuota|bpjs/i,
    health: /obat|dokter|rumah\s+sakit|rs|apotek|sehat|vitamin|klinik|medis|skincare|resep/i,
    entertainment: /hiburan|nonton|film|bioskop|game|main|karaoke|wisata|jalan-jalan|liburan|rekreasi|steam|topup/i,
    education: /pendidikan|buku|kursus|les|sekolah|kuliah|spp|sertifikat|training|udemy/i,
    tax: /pajak|tax|pph|ppn|stnk|pbb/i,
    charity: /sedekah|donasi|infaq|zakat|amal|sumbangan|infak/i,
    installment: /cicilan|kredit|angsuran|cicil|paylater/i,
    salary: /gaji|salary|upah/i,
    bonus: /bonus|thr|insentif|lembur/i,
    sales: /penjualan|jual|jualan|omset|omzet/i,
    investment: /dividen|investasi|saham|reksadana|bunga|return|crypto/i,
    allowance: /saku|uang\s+jajan|transferan/i,
    refund: /kembalian|refund|cashback/i,
    gift: /hadiah|hibah|warisan|kado/i,
  };

  for (const [cat, regex] of Object.entries(categoryMap)) {
    if (cLower.match(regex)) {
      category = cat;
      break;
    }
  }

  let cleanNote = clause.trim();
  cleanNote = cleanNote.replace(/^(tadi\s+saya|saya|tolong|catat|tambahkan\s+transaksi|tambahkan|catatkan|masukkan)\s+/i, '');
  cleanNote = cleanNote.replace(/\s+(?:pakai|pake|dari|lewat|via|ke|masuk|menggunakan)\s+\w+$/i, '');
  cleanNote = cleanNote.replace(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta|rb|ribu|k\b)/gi, '');
  cleanNote = cleanNote.replace(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+)/gi, '');
  cleanNote = cleanNote.replace(/(?:rp\.?\s*)?(\d+)/gi, '');
  cleanNote = cleanNote.replace(/\s+/g, ' ').trim();
  if (!cleanNote) cleanNote = (CATEGORIES[category] || {}).name || category;
  cleanNote = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);

  return {
    type,
    amount,
    category,
    walletId: walletId || (Store.getWallets()[0]?.id || ''),
    date: Utils.today(),
    note: cleanNote
  };
}

function parseTransactions(text) {
  const actions = parseAIIntent(text);
  return actions.filter(a => a.intent === 'ADD_TRANSACTION').map(a => a.txData);
}

function parseTransaction(text) {
  const list = parseTransactions(text);
  return list.length > 0 ? list[0] : null;
}
