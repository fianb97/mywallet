// ========================================================
// MyWallet — Unified AI Intent Core (strangler kandidat 1)
// Parser tetap di ai-assistant.js; executor HEADER di sini.
// Tanpa DOM/fetch: hanya Store + Utils + data yang di-inject.
// ========================================================

/**
 * hasExplicitWalletMention(clauseLower, wallets) — murni.
 * true bila klausa menyebut nama dompet dikenal ATAU token eksplisit
 * sesudah kata depan (pakai/dari/via/...) walau tak cocok.
 */
function hasExplicitWalletMention(clauseLower, wallets) {
  const lower = (clauseLower || '').toLowerCase();
  const list = wallets || [];
  if (list.some((w) => lower.includes(String(w.name).toLowerCase()))) return true;
  return /(?:pakai|pake|dari|lewat|via|ke|masuk|menggunakan)\s+(\w+)/i.test(lower);
}

/**
 * extractWalletHint(wallets, clauseLower) — murni.
 * { id, hint, explicit }: nama cocok persis -> fallback nyaman;
 * token eksplisit cocok -> id + explicit; token tak cocok -> id null.
 */
function extractWalletHint(wallets, clauseLower) {
  const lower = (clauseLower || '').toLowerCase();
  const list = wallets || [];
  const exact = list.find((w) => lower.includes(String(w.name).toLowerCase()));
  if (exact) return { id: exact.id, hint: exact.name, explicit: false };
  const m = lower.match(/(?:pakai|pake|dari|lewat|via|ke|masuk|menggunakan)\s+(\w+)/i);
  if (m) {
    const token = m[1].toLowerCase();
    const hit = list.find((w) => String(w.name).toLowerCase().includes(token));
    if (hit) return { id: hit.id, hint: hit.name, explicit: true };
    return { id: null, hint: m[1], explicit: true };
  }
  return { id: list.length > 0 ? list[0].id : '', hint: '', explicit: false };
}

/**
 * resolveFallbackWalletId(wallets, wName) — murni, paritas resolveWalletId
 * lama ai-tools.js: nama kosong/tak cocok -> dompet pertama; kosong -> ''.
 */
function resolveFallbackWalletId(wallets, wName) {
  const list = wallets || [];
  if (!wName) return list.length > 0 ? list[0].id : '';
  const found = list.find((w) => String(w.name).toLowerCase().includes(String(wName).toLowerCase()));
  return found ? found.id : (list.length > 0 ? list[0].id : '');
}

/**
 * walletIdFromClause(wallets, clauseLower) — murni, pengganti
 * parseWalletFromClause dengan semantik identik: hint cocok -> id,
 * token tak cocok -> dompet pertama, daftar kosong -> ''.
 */
function walletIdFromClause(wallets, clauseLower) {
  const list = wallets || [];
  const hint = extractWalletHint(list, clauseLower);
  if (hint.id) return hint.id;
  return list.length > 0 ? list[0].id : '';
}

/**
 * findDebtByPerson(debts, personName) — murni, fuzzy dua arah.
 */
function findDebtByPerson(debts, personName) {
  const name = (personName || '').toLowerCase();
  if (!name) return null;
  return (
    (debts || []).find(
      (d) =>
        String(d.personName).toLowerCase().includes(name) ||
        name.includes(String(d.personName).toLowerCase())
    ) || null
  );
}

function failDebt(message) {
  return { intent: 'PAY_DEBT_FAILED', ok: false, message };
}

/**
 * findWalletByName(wallets, name) — murni, fuzzy dua arah.
 */
function findWalletByName(wallets, name) {
  const wn = String(name || '').toLowerCase();
  if (!wn) return null;
  return (
    (wallets || []).find(
      (w) => String(w.name).toLowerCase().includes(wn) || wn.includes(String(w.name).toLowerCase())
    ) || null
  );
}

/**
 * resolveActionWallet(wallets, { walletName, walletId, walletExplicit }, label) — murni.
 * - walletName disebut -> wajib cocok, else gagal eksplisit (Q9).
 * - walletName kosong -> walletId valid, lalu dompet pertama (nyaman).
 * Label default 'Dompet' menjaga pesan lama; transfer memakai 'Dompet asal/tujuan'.
 */
function resolveActionWallet(wallets, action = {}, label = 'Dompet') {
  const list = wallets || [];
  if (action.walletName) {
    const hit = findWalletByName(list, action.walletName);
    if (!hit) {
      return { ok: false, message: `${label} "${Utils.escapeHtml(action.walletName)}" tidak ditemukan.` };
    }
    return { ok: true, walletId: hit.id };
  }
  if (action.walletExplicit && !action.walletId) {
    return { ok: false, message: `${label} yang disebut tidak ditemukan.` };
  }
  const wid =
    action.walletId && list.some((w) => w.id === action.walletId)
      ? action.walletId
      : ((list[0] && list[0].id) || '');
  if (!wid) {
    return { ok: false, message: 'Tidak ada dompet tersedia.' };
  }
  return { ok: true, walletId: wid };
}

/**
 * findBillByTitle(bills, title) — murni, fuzzy dua arah.
 */
function findBillByTitle(bills, title) {
  const name = (title || '').toLowerCase();
  if (!name) return null;
  return (
    (bills || []).find(
      (b) =>
        String(b.title).toLowerCase().includes(name) ||
        name.includes(String(b.title).toLowerCase())
    ) || null
  );
}

function failBill(message) {
  return { intent: 'PAY_BILL_FAILED', ok: false, message };
}

/**
 * executePayDebt({ personName, walletName, walletId, amount }) — lewat Store ber-guard.
 * - walletName disebut tapi tak cocok -> gagal eksplisit (Q9).
 * - walletName kosong -> walletId valid, lalu dompet pertama (nyaman).
 * - hutang tak ketemu -> catat-lalu-lunasi via addDebt + markDebtPaid (Q3).
 */
function executePayDebt(action = {}) {
  const personName = action.personName || 'Teman';

  const wr = resolveActionWallet(Store.getWallets(), action);
  if (!wr.ok) return failDebt(wr.message);
  const walletId = wr.walletId;

  const debts = Store.getDebts({ isPaid: false });
  const found = findDebtByPerson(debts, personName);
  if (found) {
    const ok = Store.markDebtPaid(found.id, walletId);
    if (!ok) {
      return failDebt('Pelunasan gagal: saldo dompet tidak cukup.');
    }
    return { intent: 'PAY_DEBT', ok: true, debt: found, personName: found.personName, amount: found.amount, walletId };
  }

  // Tak ada hutang aktif: bila pernah lunas ke orang yang sama, ini
  // kemungkinan bayar-ganda — tolak eksplisit alih-alih mencatat baru.
  const everPaid = findDebtByPerson(
    Store.getDebts().filter((d) => d.isPaid),
    personName
  );
  if (everPaid) {
    return failDebt(`Hutang ${Utils.escapeHtml(personName)} sudah lunas.`);
  }

  const paidAmount = Math.abs(action.amount || 0);
  const created = Store.addDebt({
    type: 'debt',
    personName,
    amount: paidAmount,
    walletId,
    date: Utils.today(),
    note: `Pelunasan Hutang ${personName}`,
  });
  const ok = Store.markDebtPaid(created.id, walletId);
  if (!ok) {
    return failDebt('Pelunasan gagal: saldo dompet tidak cukup.');
  }
  return { intent: 'PAY_DEBT', ok: true, debt: created, personName: created.personName, amount: paidAmount, walletId };
}

/**
 * executePayBill({ title, walletName, walletId, walletExplicit, amount, dueDate })
 * Fund via Store ber-guard. Tagihan tak ketemu -> buat-lalu-lunasi (Q3);
 * butuh nominal > 0 agar tak tercipta record yatim. Tagihan bersifat
 * berkala -> tanpa guard bayar-ganda (beda dengan hutang).
 */
function executePayBill(action = {}) {
  const title = action.title || 'Tagihan';

  const wr = resolveActionWallet(Store.getWallets(), action);
  if (!wr.ok) return failBill(wr.message);
  const walletId = wr.walletId;

  const bills = Store.getBills({ isPaid: false });
  const found = findBillByTitle(bills, title);
  if (found) {
    const ok = Store.markBillPaid(found.id, walletId);
    if (!ok) {
      return failBill('Pelunasan gagal: saldo dompet tidak cukup.');
    }
    return { intent: 'PAY_BILL', ok: true, bill: found, title: found.title, walletId };
  }

  const billAmount = Math.abs(action.amount || 0);
  if (!(billAmount > 0)) {
    return failBill('Nominal tagihan tidak valid.');
  }
  const created = Store.addBill({
    title,
    amount: billAmount,
    dueDate: action.dueDate || Utils.today(),
    walletId,
    note: `Tagihan ${title}`,
  });
  const ok = Store.markBillPaid(created.id, walletId);
  if (!ok) {
    return failBill('Pelunasan gagal: saldo dompet tidak cukup.');
  }
  return { intent: 'PAY_BILL', ok: true, bill: created, title, walletId };
}

function failTx(message) {
  return { intent: 'ADD_TRANSACTION_FAILED', ok: false, message };
}

/**
 * executeAddTransaction({ type, amount, category, walletName, walletId,
 *   walletExplicit, note, date }) — via Store.addTransaction ber-guard.
 */
function executeAddTransaction(action = {}) {
  const type = action.type === 'income' ? 'income' : action.type === 'expense' ? 'expense' : '';
  if (!type) {
    return failTx(`Jenis transaksi tak dikenal: ${action.type}.`);
  }

  const wr = resolveActionWallet(Store.getWallets(), action);
  if (!wr.ok) return failTx(wr.message);

  const created = Store.addTransaction({
    type,
    amount: action.amount,
    category: action.category || 'food',
    walletId: wr.walletId,
    date: action.date || Utils.today(),
    note: action.note || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
  });
  if (!created) {
    return failTx('Transaksi gagal: nominal tidak valid atau saldo tidak cukup.');
  }
  return { intent: 'ADD_TRANSACTION', ok: true, txData: created, created };
}

function failTransfer(message) {
  return { intent: 'TRANSFER_FAILED', ok: false, message };
}

/**
 * executeTransfer({ fromWalletName, toWalletName, fromWalletId, toWalletId,
 *   walletExplicit, amount }) — Q9 berlaku dua sisi via label resolver.
 */
function executeTransfer(action = {}) {
  const wallets = Store.getWallets();

  const from = resolveActionWallet(
    wallets,
    { walletName: action.fromWalletName, walletId: action.fromWalletId, walletExplicit: action.walletExplicit },
    'Dompet asal'
  );
  if (!from.ok) return failTransfer(from.message);
  const to = resolveActionWallet(
    wallets,
    { walletName: action.toWalletName, walletId: action.toWalletId, walletExplicit: action.walletExplicit },
    'Dompet tujuan'
  );
  if (!to.ok) return failTransfer(to.message);

  const fromW = wallets.find((w) => w.id === from.walletId);
  const toW = wallets.find((w) => w.id === to.walletId);
  const ok = Store.transfer(from.walletId, to.walletId, action.amount);
  if (!ok) {
    return failTransfer('Transfer gagal: nominal tidak valid, dompet sama, atau saldo tidak cukup.');
  }
  return { intent: 'TRANSFER_WALLET', ok: true, fromWallet: fromW, toWallet: toW, amount: action.amount };
}

/**
 * executeAddDebt({ type, personName, amount, walletId, date, note }) — pencatatan
 * (uang-bergerak ditangani Store.addDebt apa adanya; guard saldo milik pelunasan).
 */
function executeAddDebt(action = {}) {
  const created = Store.addDebt({
    type: action.type === 'receivable' ? 'receivable' : 'debt',
    personName: action.personName || 'Teman',
    amount: action.amount,
    walletId: action.walletId,
    date: action.date || Utils.today(),
    note: action.note,
  });
  return { intent: 'ADD_DEBT', ok: true, debtData: created, created };
}

/**
 * executeAddBill({ title, amount, dueDate, walletId, note }) — pencatatan murni.
 */
function executeAddBill(action = {}) {
  const created = Store.addBill({
    title: action.title || 'Tagihan',
    amount: action.amount,
    dueDate: action.dueDate || Utils.today(),
    walletId: action.walletId,
    note: action.note,
  });
  return { intent: 'ADD_BILL', ok: true, billData: created, created };
}

/**
 * executeIntent(action) — dispatch tunggal (Q5). Strangler kandidat 1 lengkap.
 */
function executeIntent(action = {}) {
  if (action.intent === 'PAY_DEBT') return executePayDebt(action);
  if (action.intent === 'PAY_BILL') return executePayBill(action);
  if (action.intent === 'ADD_TRANSACTION') return executeAddTransaction(action);
  if (action.intent === 'TRANSFER_WALLET') return executeTransfer(action);
  if (action.intent === 'ADD_DEBT') return executeAddDebt(action);
  if (action.intent === 'ADD_BILL') return executeAddBill(action);
  return { intent: 'UNKNOWN_INTENT', ok: false, message: `Intent tak dikenal: ${action.intent}.` };
}

// ── Local Natural-Language Parser (pure: reads Store/lists, zero writes) ──
// Moved from ai-assistant.js (strangler kandidat 1): string -> actions.

function parseAIIntent(text, ctx = {}) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase().trim();
  // Daftar lookup boleh di-inject (test headless); default baca Store (Q10).
  const ctxWallets = ctx.wallets ?? Store.getWallets();

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
      // Murni: tanpa tulis Store — eksekusi milik executeIntent (strangler kandidat 1).
      const amount = parseAmountFromClause(cLower);
      const hint = extractWalletHint(ctxWallets, cLower);

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

      actions.push({
        intent: 'PAY_DEBT',
        personName,
        amount: amount || 0,
        walletId: hint.id,
        walletName: hint.hint,
        walletExplicit: hint.explicit,
      });
      continue;
    }

    // 2. Check for Pay Bill (Pelunasan Tagihan)
    const isBillPaymentWord = cLower.match(/\b(bayar|membayar|membayarkan|lunas|melunasi|melunaskan|pelunasan|dibayar)\b/i);
    if (isBillPaymentWord && cLower.includes('tagihan')) {
      // Murni: tanpa tulis Store — eksekusi milik executeIntent (strangler kandidat 1).
      const amount = parseAmountFromClause(cLower);
      const hint = extractWalletHint(ctxWallets, cLower);

      let title = '';
      const titleMatch = cLower.match(/(?:tagihan)\s+([a-z0-9]+)/i) || cLower.match(/(?:bayar|melunasi|pelunasan|lunas)\s+([a-z0-9]+)/i);
      if (titleMatch) {
        let t = titleMatch[1].replace(/^(tagihan)\s+/i, '').trim();
        if (!t.match(/^(rp|ribu|rb|jt|juta|\d+|pakai|pake|via|lewat)$/i)) {
          title = t.charAt(0).toUpperCase() + t.slice(1);
        }
      }
      if (!title) title = 'Tagihan';

      actions.push({
        intent: 'PAY_BILL',
        title,
        amount: amount || 0,
        walletId: hint.id,
        walletName: hint.hint,
        walletExplicit: hint.explicit,
      });
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
        const walletId = walletIdFromClause(ctxWallets, cLower);

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
        const walletId = walletIdFromClause(ctxWallets, cLower);

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
          const wallets = ctxWallets ?? Store.getWallets();
          const fromW = wallets.find(w => w.name.toLowerCase().includes(fromName));
          const toW = wallets.find(w => w.name.toLowerCase().includes(toName));
          if (fromW && toW) {
            actions.push({
              intent: 'TRANSFER_WALLET',
              fromWallet: fromW,
              toWallet: toW,
              fromWalletId: fromW.id,
              toWalletId: toW.id,
              amount
            });
            continue;
          }
          // Nama disebut tapi tak cocok: aksi gagal eksplisit (Q9), bukan diam.
          // Tanpa continue: klausa masih boleh cocok cabang lain seperti semula.
          actions.push({
            intent: 'TRANSFER_WALLET',
            fromWalletName: fromName,
            toWalletName: toName,
            amount,
            walletExplicit: true,
          });
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
    const tx = parseTransactionFromClause(clause, text, ctxWallets);
    if (tx) {
      const hint = extractWalletHint(ctxWallets, cLower);
      actions.push({
        intent: 'ADD_TRANSACTION',
        txData: tx,
        walletName: hint.hint,
        walletExplicit: hint.explicit,
      });
    }
  }

  return actions;
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

function parseTransactionFromClause(clause, fullText, wallets = Store.getWallets()) {
  const cLower = clause.toLowerCase().trim();
  const amount = parseAmountFromClause(cLower);
  if (!amount || amount <= 0) return null;

  const walletId = walletIdFromClause(wallets, cLower);

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

function parseTransactions(text, ctx = {}) {
  const actions = parseAIIntent(text, ctx);
  return actions.filter(a => a.intent === 'ADD_TRANSACTION').map(a => a.txData);
}

function parseTransaction(text) {
  const list = parseTransactions(text);
  return list.length > 0 ? list[0] : null;
}
