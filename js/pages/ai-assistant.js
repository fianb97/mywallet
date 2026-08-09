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
  if (msg.parsedTx) {
    const tx = msg.parsedTx;
    const cat = CATEGORIES[tx.category] || {};
    const wallet = Store.getWallet(tx.walletId) || {};
    const isIncome = tx.type === 'income';

    receiptHtml = `
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

  // ── Check for debt/receivable query ──
  if (lower.match(/hutang|piutang|pinjam/)) {
    const totalDebt = Store.getTotalDebt();
    const totalReceivable = Store.getTotalReceivable();

    return {
      text: `Ringkasan Hutang-Piutang Anda:\n• Total Hutang: **-${Utils.formatRupiah(totalDebt)}**\n• Total Piutang: **+${Utils.formatRupiah(totalReceivable)}**`
    };
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

  // ── Try to parse as transaction ──
  const parsed = parseTransaction(lower);
  if (parsed) {
    Store.addTransaction(parsed);
    Router.handleRoute();

    return {
      text: `Baik, saya telah mencatat pengeluaran/pemasukan Anda.`,
      parsedTx: parsed
    };
  }

  // ── Fallback ──
  return {
    text: `Saya belum memahami pesan tersebut. Coba gunakan contoh perintah:\n• *"Beli kopi 20rb pakai OVO"*\n• *"Berapa saldo saya?"*\n• *"Pengeluaran minggu ini"*`
  };
}

// ── Natural Language Transaction Parser ──
function parseTransaction(text) {
  const wallets = Store.getWallets();

  // Parse amount
  let amount = 0;
  const amountPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)/i,
    /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*)/i,
    /(\d+)/
  ];

  for (const pat of amountPatterns) {
    const m = text.match(pat);
    if (m) {
      let val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
      if (text.match(/jt|juta/i)) val *= 1000000;
      else if (text.match(/rb|ribu|k\b/i)) val *= 1000;
      amount = Math.round(val);
      break;
    }
  }

  if (amount <= 0) return null;

  // Parse wallet
  let walletId = '';
  for (const w of wallets) {
    if (text.includes(w.name.toLowerCase())) {
      walletId = w.id;
      break;
    }
  }
  if (!walletId) {
    const walletMatch = text.match(/(?:pakai|pake|dari|lewat|via|ke|masuk)\s+(\w+)/i);
    if (walletMatch) {
      const wName = walletMatch[1].toLowerCase();
      const found = wallets.find(w => w.name.toLowerCase().includes(wName));
      if (found) walletId = found.id;
    }
  }
  if (!walletId && wallets.length > 0) walletId = wallets[0].id;

  // Parse type
  let type = 'expense';
  if (text.match(/gaji|bonus|thr|terima|dapat|masuk|pendapatan|penjualan|dividen|saku|hadiah|hibah/)) {
    type = 'income';
  }

  // Parse category
  let category = type === 'expense' ? 'food' : 'salary';
  const categoryMap = {
    food: /makan|nasi|goreng|minum|kopi|ayam|sate|bakso|indomie|kantin|warung|resto|snack|jajan|sarapan|makan\s+siang|makan\s+malam|beli\s+makan/,
    transport: /transport|grab|gojek|ojol|bensin|bbm|parkir|tol|bus|kereta|taxi|angkot|ongkos/,
    shopping: /belanja|baju|pakaian|sepatu|tas|beli|shopee|tokopedia|online\s+shop|lazada|mall/,
    bills: /tagihan|listrik|wifi|internet|pulsa|token|air|pdam|gas|langganan|netflix|spotify|subscri/,
    health: /obat|dokter|rumah\s+sakit|rs|apotek|sehat|vitamin|klinik|medis/,
    entertainment: /hiburan|nonton|film|bioskop|game|main|karaoke|wisata|jalan-jalan|liburan|rekreasi/,
    education: /pendidikan|buku|kursus|les|sekolah|kuliah|spp|sertifikat|training|udemy/,
    tax: /pajak|tax|pph|ppn/,
    charity: /sedekah|donasi|infaq|zakat|amal|sumbangan/,
    installment: /cicilan|kredit|angsuran|cicil/,
    salary: /gaji|salary|upah/,
    bonus: /bonus|thr|insentif|lembur/,
    sales: /penjualan|jual|jualan/,
    investment: /dividen|investasi|saham|reksadana|bunga|return/,
    allowance: /saku|uang\s+jajan/,
    refund: /kembalian|refund|cashback/,
    gift: /hadiah|hibah|warisan|kado/,
  };

  for (const [cat, regex] of Object.entries(categoryMap)) {
    if (text.match(regex)) {
      category = cat;
      break;
    }
  }

  const note = text.charAt(0).toUpperCase() + text.slice(1);

  return {
    type,
    amount,
    category,
    walletId,
    date: Utils.today(),
    note
  };
}
