// ========================================
// MyWallet — Custom Endpoints Page
// ========================================

function renderCustomEndpoints(container) {
  const STORAGE_KEY = 'ai_custom_endpoints';
  const ACTIVE_KEY = 'ai_active_endpoint_id';

  // ── Data Helpers ──
  function getEndpoints() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveEndpoints(endpoints) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
  }

  function getActiveId() {
    return localStorage.getItem(ACTIVE_KEY) || '';
  }

  function setActiveId(id) {
    localStorage.setItem(ACTIVE_KEY, id);
  }

  function generateProviderId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function generateId() {
    return 'ep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ── State ──
  let formCollapsed = true;
  let editingId = null;
  let testingState = ''; // '' | 'loading' | 'success' | 'error'
  let testMessage = '';
  let showApiKey = false;

  // ── Render ──
  function render() {
    const endpoints = getEndpoints();
    const activeId = getActiveId();
    const endpointCount = endpoints.length;

    container.innerHTML = `
      <div class="ce-page">
        <!-- Header -->
        <div class="ce-header">
          <div class="ce-header__left">
            <span class="ce-header__icon">${mIcon('electrical_services')}</span>
            <h2 class="ce-header__title">${t('ceTitle')}</h2>
            ${endpointCount > 0 ? `<span class="ce-header__badge">${endpointCount}</span>` : ''}
          </div>
        </div>

        <!-- Endpoint List -->
        <div class="ce-list" id="ce-endpoint-list">
          ${endpointCount === 0 ? renderEmptyState() : endpoints.map(ep => renderEndpointCard(ep, activeId)).join('')}
        </div>

        <!-- Add/Edit Endpoint Form -->
        <div class="ce-form-section">
          <button class="ce-form-toggle" id="ce-form-toggle" type="button">
            ${mIcon(formCollapsed ? 'add' : 'remove')}
            <span>${editingId ? t('ceEditEndpoint') : t('ceAddEndpoint')}</span>
          </button>
          
          <div class="ce-form-wrapper ${formCollapsed ? 'collapsed' : ''}" id="ce-form-wrapper">
            <form class="ce-form" id="ce-form" autocomplete="off">
              <!-- Row: Name + Provider ID -->
              <div class="ce-form__row">
                <div class="ce-form__field ce-form__field--grow">
                  <label class="ce-form__label" for="ce-name">${t('ceName')}</label>
                  <input type="text" id="ce-name" class="ce-form__input" placeholder="Groq API" required>
                </div>
                <div class="ce-form__field">
                  <label class="ce-form__label" for="ce-provider-id">${t('ceProviderId')}</label>
                  <input type="text" id="ce-provider-id" class="ce-form__input" placeholder="groq-api">
                </div>
              </div>

              <!-- Endpoint URL -->
              <div class="ce-form__field">
                <label class="ce-form__label" for="ce-endpoint-url">${t('ceEndpointUrl')}</label>
                <input type="url" id="ce-endpoint-url" class="ce-form__input" placeholder="https://api.groq.com/openai/v1" required>
              </div>

              <!-- Row: Default Model + Context -->
              <div class="ce-form__row">
                <div class="ce-form__field ce-form__field--grow">
                  <label class="ce-form__label" for="ce-model">${t('ceDefaultModel')}</label>
                  <input type="text" id="ce-model" class="ce-form__input" placeholder="llama-3.1-8b-instant">
                </div>
                <div class="ce-form__field ce-form__field--context">
                  <label class="ce-form__label" for="ce-context">${t('ceContext')}</label>
                  <select id="ce-context" class="ce-form__select">
                    <option value="auto">Auto</option>
                    <option value="4k">4k</option>
                    <option value="8k">8k</option>
                    <option value="32k">32k</option>
                    <option value="128k">128k</option>
                  </select>
                </div>
              </div>

              <!-- API Key -->
              <div class="ce-form__field">
                <label class="ce-form__label" for="ce-api-key">${t('ceApiKey')}</label>
                <div class="ce-form__input-wrap">
                  <input type="${showApiKey ? 'text' : 'password'}" id="ce-api-key" class="ce-form__input ce-form__input--key" placeholder="Optional" autocomplete="new-password">
                  <button type="button" class="ce-form__eye-btn" id="ce-toggle-key">
                    ${mIcon(showApiKey ? 'visibility_off' : 'visibility')}
                  </button>
                </div>
              </div>

              <!-- Checkboxes -->
              <div class="ce-form__checks">
                <label class="ce-form__check">
                  <input type="checkbox" id="ce-use-new-chats" checked>
                  <span>${t('ceUseForNewChats')}</span>
                </label>
                <label class="ce-form__check">
                  <input type="checkbox" id="ce-discover-models">
                  <span>${t('ceDiscoverModels')}</span>
                </label>
              </div>

              <!-- Actions -->
              <div class="ce-form__actions">
                <button type="button" class="ce-btn ce-btn--ghost" id="ce-test-btn">
                  ${mIcon('bolt')}
                  <span>${t('ceTest')}</span>
                </button>
                <button type="submit" class="ce-btn ce-btn--primary" id="ce-save-btn">
                  ${mIcon('save')}
                  <span>${editingId ? t('ceUpdate') : t('ceSave')}</span>
                </button>
                ${editingId ? `
                  <button type="button" class="ce-btn ce-btn--ghost" id="ce-cancel-edit-btn">
                    ${mIcon('close')}
                    <span>${t('ceCancel')}</span>
                  </button>
                ` : ''}
              </div>

              <!-- Test Result -->
              ${testingState ? `
                <div class="ce-test-result ce-test-result--${testingState}">
                  ${testingState === 'loading' ? `<span class="ce-spinner"></span> ${t('ceTesting')}...` : ''}
                  ${testingState === 'success' ? `${mIcon('check_circle')} ${testMessage}` : ''}
                  ${testingState === 'error' ? `${mIcon('error')} ${testMessage}` : ''}
                </div>
              ` : ''}
            </form>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  // ── Render Helpers ──
  function renderEmptyState() {
    return `
      <div class="ce-empty">
        <span class="ce-empty__icon">${mIcon('cloud_off')}</span>
        <p class="ce-empty__text">${t('ceEmptyTitle')}</p>
        <p class="ce-empty__sub">${t('ceEmptyDesc')}</p>
      </div>
    `;
  }

  function renderEndpointCard(ep, activeId) {
    const isActive = ep.id === activeId;
    const maskedKey = ep.apiKey
      ? '${MYWALLET_' + ep.providerId.toUpperCase().replace(/-/g, '_') + '_API_KEY}'
      : t('ceNoApiKey');

    return `
      <div class="ce-card ${isActive ? 'ce-card--active' : ''}" data-id="${ep.id}">
        <div class="ce-card__header">
          <div class="ce-card__name-row">
            <span class="ce-card__name">${Utils.escapeHtml(ep.name)}</span>
            ${isActive ? `<span class="ce-card__status">${mIcon('check_circle')} Active</span>` : ''}
          </div>
          <div class="ce-card__actions">
            ${!isActive ? `
              <button class="ce-card__btn ce-card__btn--use" data-action="use" data-id="${ep.id}" title="${t('ceUse')}">
                ${mIcon('bolt')} ${t('ceUse')}
              </button>
            ` : ''}
            <button class="ce-card__btn ce-card__btn--edit" data-action="edit" data-id="${ep.id}" title="${t('ceEdit')}">
              ${mIcon('edit')}
            </button>
            <button class="ce-card__btn ce-card__btn--delete" data-action="delete" data-id="${ep.id}" title="${t('ceDelete')}">
              ${mIcon('delete')}
            </button>
          </div>
        </div>
        <div class="ce-card__details">
          <span class="ce-card__url mono">${Utils.escapeHtml(ep.endpointUrl)}</span>
          <div class="ce-card__meta">
            <span class="ce-card__model mono">${Utils.escapeHtml(ep.defaultModel || '—')}</span>
            <span class="ce-card__key mono">${maskedKey}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── Events ──
  function bindEvents() {
    // Toggle form collapse
    const toggleBtn = container.querySelector('#ce-form-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        formCollapsed = !formCollapsed;
        render();
      });
    }

    // Toggle API key visibility
    const eyeBtn = container.querySelector('#ce-toggle-key');
    if (eyeBtn) {
      eyeBtn.addEventListener('click', () => {
        showApiKey = !showApiKey;
        const input = container.querySelector('#ce-api-key');
        if (input) input.type = showApiKey ? 'text' : 'password';
        eyeBtn.innerHTML = mIcon(showApiKey ? 'visibility_off' : 'visibility');
      });
    }

    // Auto-generate Provider ID from Name
    const nameInput = container.querySelector('#ce-name');
    const providerInput = container.querySelector('#ce-provider-id');
    if (nameInput && providerInput) {
      nameInput.addEventListener('input', () => {
        if (!providerInput.dataset.manual) {
          providerInput.value = generateProviderId(nameInput.value);
        }
      });
      providerInput.addEventListener('input', () => {
        providerInput.dataset.manual = providerInput.value ? '1' : '';
      });
    }

    // Save form
    const form = container.querySelector('#ce-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEndpoint();
      });
    }

    // Test button
    const testBtn = container.querySelector('#ce-test-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => testEndpoint());
    }

    // Cancel edit
    const cancelBtn = container.querySelector('#ce-cancel-edit-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingId = null;
        formCollapsed = true;
        testingState = '';
        testMessage = '';
        render();
      });
    }

    // Card actions (Use / Delete / Edit)
    container.querySelectorAll('.ce-card__btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'use') setActiveEndpoint(id);
        if (action === 'delete') deleteEndpoint(id);
        if (action === 'edit') startEdit(id);
      });
    });
  }

  // ── Core Functions ──
  function saveEndpoint() {
    const name = container.querySelector('#ce-name').value.trim();
    const endpointUrl = container.querySelector('#ce-endpoint-url').value.trim();
    let providerId = container.querySelector('#ce-provider-id').value.trim();
    const defaultModel = container.querySelector('#ce-model').value.trim();
    const context = container.querySelector('#ce-context').value;
    const apiKey = container.querySelector('#ce-api-key').value.trim();
    const useForNewChats = container.querySelector('#ce-use-new-chats').checked;
    const discoverModels = container.querySelector('#ce-discover-models').checked;

    // Validation
    if (!name) {
      Toast.show(t('ceErrorName'), 'error');
      return;
    }
    if (!endpointUrl) {
      Toast.show(t('ceErrorUrl'), 'error');
      return;
    }

    if (!providerId) {
      providerId = generateProviderId(name);
    }

    const endpoints = getEndpoints();

    if (editingId) {
      // Update existing
      const idx = endpoints.findIndex(ep => ep.id === editingId);
      if (idx !== -1) {
        endpoints[idx] = {
          ...endpoints[idx],
          name, providerId, endpointUrl, defaultModel, context, apiKey, useForNewChats, discoverModels
        };
      }
    } else {
      // Create new
      const newEndpoint = {
        id: generateId(),
        name,
        providerId,
        endpointUrl,
        defaultModel,
        context,
        apiKey,
        useForNewChats,
        discoverModels,
        isActive: false
      };
      endpoints.push(newEndpoint);

      // If useForNewChats and no active, set as active
      if (useForNewChats && !getActiveId()) {
        setActiveId(newEndpoint.id);
      }
    }

    saveEndpoints(endpoints);
    editingId = null;
    formCollapsed = true;
    testingState = '';
    testMessage = '';
    showApiKey = false;
    render();
  }

  function startEdit(id) {
    const endpoints = getEndpoints();
    const ep = endpoints.find(e => e.id === id);
    if (!ep) return;

    editingId = id;
    formCollapsed = false;
    testingState = '';
    testMessage = '';
    showApiKey = false;
    render();

    // Fill form
    const nameInput = container.querySelector('#ce-name');
    const providerInput = container.querySelector('#ce-provider-id');
    const urlInput = container.querySelector('#ce-endpoint-url');
    const modelInput = container.querySelector('#ce-model');
    const contextSelect = container.querySelector('#ce-context');
    const apiKeyInput = container.querySelector('#ce-api-key');
    const useNewChatsCheck = container.querySelector('#ce-use-new-chats');
    const discoverModelsCheck = container.querySelector('#ce-discover-models');

    if (nameInput) nameInput.value = ep.name;
    if (providerInput) { providerInput.value = ep.providerId; providerInput.dataset.manual = '1'; }
    if (urlInput) urlInput.value = ep.endpointUrl;
    if (modelInput) modelInput.value = ep.defaultModel;
    if (contextSelect) contextSelect.value = ep.context || 'auto';
    if (apiKeyInput) apiKeyInput.value = ep.apiKey || '';
    if (useNewChatsCheck) useNewChatsCheck.checked = ep.useForNewChats;
    if (discoverModelsCheck) discoverModelsCheck.checked = ep.discoverModels;
  }

  function setActiveEndpoint(id) {
    setActiveId(id);
    render();
  }

  function deleteEndpoint(id) {
    const endpoints = getEndpoints();
    const ep = endpoints.find(e => e.id === id);
    if (!ep) return;

    const confirmed = confirm(`${t('ceDeleteConfirm')} "${ep.name}"?`);
    if (!confirmed) return;

    const filtered = endpoints.filter(e => e.id !== id);
    saveEndpoints(filtered);

    // Clear active if deleted
    if (getActiveId() === id) {
      setActiveId('');
    }

    render();
  }

  async function testEndpoint() {
    const endpointUrl = container.querySelector('#ce-endpoint-url').value.trim();
    const apiKey = container.querySelector('#ce-api-key').value.trim();
    const model = container.querySelector('#ce-model').value.trim() || 'gpt-3.5-turbo';

    if (!endpointUrl) {
      Toast.show(t('ceErrorUrl'), 'error');
      return;
    }

    testingState = 'loading';
    testMessage = '';
    render();

    // Build URL: avoid double /v1
    let url = endpointUrl.replace(/\/+$/, '');
    if (!url.endsWith('/chat/completions')) {
      url += '/chat/completions';
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
          temperature: 0
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'OK';
        testingState = 'success';
        testMessage = `${t('ceTestSuccess')} — ${model} (${reply.substring(0, 60)})`;
      } else {
        const errData = await res.json().catch(() => ({}));
        testingState = 'error';
        testMessage = `HTTP ${res.status}: ${errData.error?.message || res.statusText}`;
      }
    } catch (err) {
      testingState = 'error';
      if (endpointUrl.includes('127.0.0.1') || endpointUrl.includes('localhost')) {
        testMessage = t('ceLocalError');
      } else {
        testMessage = `${t('ceTestFailed')}: ${err.message}`;
      }
    }

    render();
  }

  // ── Initial Render ──
  render();
}

// ========================================
// MyWallet — Universal AI Chat Function
// ========================================

/**
 * kirimPesanAI(pesanUser) — Hybrid Universal AI Chat
 * Checks for active custom endpoint. If found with API key, calls the
 * remote LLM API with financial context. Otherwise, falls back to
 * the built-in text-based assistant (processAIMessage).
 */
async function kirimPesanAI(pesanUser) {
  const STORAGE_KEY = 'ai_custom_endpoints';
  const ACTIVE_KEY = 'ai_active_endpoint_id';

  // 1. Check if user input contains universal action intents (Transactions, Debts, Bills, Wallets, Transfers)
  if (typeof parseAIIntent === 'function') {
    const actions = parseAIIntent(pesanUser);
    if (actions.length > 0) {
      // EXECUTE ALL ACTIONS IMMEDIATELY IN LOCALSTORAGE!
      const { summaryList, actionResults } = executeAIIntents(actions);
      const summaryText = summaryList.join('\n');

      // Check active remote endpoint
      const activeId = localStorage.getItem(ACTIVE_KEY);
      let endpoints = [];
      try { endpoints = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { /* empty */ }
      const activeEndpoint = endpoints.find(ep => ep.id === activeId);

      if (activeEndpoint && activeEndpoint.apiKey) {
        let selectedModelName = activeEndpoint.defaultModel || 'gpt-3.5-turbo';
        try {
          const sel = JSON.parse(localStorage.getItem('ai_selected_model'));
          if (sel && sel.endpointId === activeEndpoint.id && sel.model) {
            selectedModelName = sel.model;
          }
        } catch { /* empty */ }

        let url = activeEndpoint.endpointUrl.replace(/\/+$/, '');
        if (!url.endsWith('/chat/completions')) url += '/chat/completions';

        const promptForActions = `Kamu adalah asisten keuangan MyWallet.
Sistem telah BERHASIL mengeksekusi ${actions.length} aksi keuangan pengguna ke dalam aplikasi:
${summaryText}

ATURAN SANGAT KETAT:
- Berikan respon KONFIRMASI RAMAH DALAM 1 KALIMAT SINGKAT SAJA (contoh: "${actions.length} aksi berhasil diproses di aplikasi MyWallet!").
- DILARANG MENCETAK ULANG teks prompt ini, DILARANG mencetak daftar sisa saldo dompet lain, DILARANG bertele-tele, DILARANG mencetak kode/JSON.`;

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeEndpoint.apiKey}`
            },
            body: JSON.stringify({
              model: selectedModelName,
              messages: [
                { role: 'system', content: promptForActions },
                { role: 'user', content: pesanUser }
              ],
              temperature: 0.3
            })
          });

          if (res.ok) {
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || `✅ ${actions.length} aksi berhasil diproses.`;
            return { text: reply.trim(), actionResults };
          }
        } catch { /* fallback below */ }
      }

      return {
        text: `✅ **${actions.length} aksi** berhasil diproses:\n\n${summaryText}`,
        actionResults
      };
    }
  }

  // 2. For General Inquiries (Non-transaction messages)
  const activeId = localStorage.getItem(ACTIVE_KEY);
  if (!activeId) return asistenTextBiasa(pesanUser);

  let endpoints = [];
  try {
    endpoints = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { /* empty */ }

  const activeEndpoint = endpoints.find(ep => ep.id === activeId);
  if (!activeEndpoint || !activeEndpoint.apiKey) {
    return asistenTextBiasa(pesanUser);
  }

  // Gather financial context (last 20 transactions)
  let transactions = [];
  try {
    const allTx = Store.getTransactions ? Store.getTransactions({}) : [];
    transactions = allTx.slice(0, 20).map(tx => ({
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      note: tx.note || ''
    }));
  } catch { /* empty */ }

  // Gather wallet balances
  let wallets = [];
  try {
    wallets = (Store.getWallets ? Store.getWallets() : []).map(w => ({
      name: w.name,
      balance: w.balance
    }));
  } catch { /* empty */ }

  // Human-readable financial summary
  const walletSummary = wallets.length > 0
    ? wallets.map(w => `${w.name}: Rp ${new Intl.NumberFormat('id-ID').format(w.balance)}`).join(', ')
    : 'Belum ada dompet';

  const txSummary = transactions.length > 0
    ? transactions.map(t => `- ${t.date} [${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}] ${t.category}: Rp ${new Intl.NumberFormat('id-ID').format(t.amount)}${t.note ? ' (' + t.note + ')' : ''}`).join('\n')
    : 'Belum ada riwayat transaksi';

  // Check if a model override is selected from dropdown
  let selectedModelName = activeEndpoint.defaultModel || 'gpt-3.5-turbo';
  try {
    const sel = JSON.parse(localStorage.getItem('ai_selected_model'));
    if (sel && sel.endpointId === activeEndpoint.id && sel.model) {
      selectedModelName = sel.model;
    }
  } catch { /* empty */ }

  const modelName = selectedModelName;
  const providerName = activeEndpoint.name || 'Custom Endpoint';

  const systemPrompt = `Kamu adalah asisten keuangan pribadi MyWallet yang ditenagai oleh model ${modelName} (${providerName}).

[DATA KEUANGAN PENGGUNA]
- Saldo Dompet: ${walletSummary}
- Transaksi Terakhir (Maks 20):
${txSummary}

ATURAN RESPON SANGAT KETAT:
1. Jawablah pertanyaan pengguna dengan SINGKAT, RAMAH, dan TO THE POINT (maksimal 2 kalimat).
2. DILARANG MENCETAK ULANG teks "[DATA KEUANGAN PENGGUNA]", DILARANG mencetak isi prompt/kode sistem ini, dan DILARANG menyebut daftar sisa saldo dompet lain KECUALI pengguna secara khusus bertanya tentang saldo.
3. Gunakan format Rupiah (Rp) untuk angka keuangan.`;

  // Build URL: avoid double /v1 or /chat/completions
  let url = activeEndpoint.endpointUrl.replace(/\/+$/, '');
  if (!url.endsWith('/chat/completions')) {
    url += '/chat/completions';
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    headers['Authorization'] = `Bearer ${activeEndpoint.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: selectedModelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pesanUser }
        ],
        temperature: 0.3
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { text: `⚠️ API Error (${res.status}): ${errData.error?.message || res.statusText}` };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Tidak ada respons dari model.';
    return { text: reply.trim() };

  } catch (err) {
    if (activeEndpoint.endpointUrl.includes('127.0.0.1') || activeEndpoint.endpointUrl.includes('localhost')) {
      return { text: `⚠️ Endpoint lokal tidak bisa diakses dari Github Pages. Gunakan Ngrok atau deploy sebagai proxy.` };
    }
    return { text: `⚠️ Gagal terhubung ke endpoint: ${err.message}` };
  }
}

/**
 * asistenTextBiasa(pesanUser) — Fallback text-based AI
 * Wraps the existing processAIMessage() for compatibility.
 */
function asistenTextBiasa(pesanUser) {
  return processAIMessage(pesanUser);
}
