// ========================================================
// MyWallet — Transaction Period Grouping (strangler kandidat 4a)
// Helper tanggal/periode murni keluar dari pages/transactions.js.
// Tanpa DOM/Store: refDate + daftar tx + locale di-inject eksplisit.
// ========================================================

// ── Local date helpers (prevents UTC timezone shift bug) ──
function formatLocalYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalYYYYMMDD(dateStr) {
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// ── Helper: get days (Mon-Sun) of the week containing refDate ──
function getDaysOfWeek(refDate, locale) {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = formatLocalYYYYMMDD(dt);
    days.push({
      startStr: dateStr,
      endStr: dateStr,
      label: dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
      shortLabel: dt.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
    });
  }
  // Reverse array so newest date (Today) is at top, Yesterday is below it!
  return days.reverse();
}

// ── Helper: get week navigation label ──
function getWeekNavLabel(refDate, locale) {
  const days = getDaysOfWeek(refDate, locale);
  const mon = parseLocalYYYYMMDD(days[days.length - 1].startStr);
  const sun = parseLocalYYYYMMDD(days[0].startStr);
  return `${mon.getDate()} - ${sun.getDate()} ${sun.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`;
}

// ── Helper: get weeks of the month containing refDate ──
function getWeeksOfMonth(refDate, locale) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks = [];
  let weekStart = new Date(firstDay);
  const startDow = weekStart.getDay();
  if (startDow !== 1) {
    weekStart.setDate(weekStart.getDate() - (startDow === 0 ? 6 : startDow - 1));
  }

  let weekNum = 1;
  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

    const rangeStartDate = weekStart.getDate();
    const rangeEndDate = weekEnd.getDate();
    const rangeStartMonth = weekStart.toLocaleDateString(locale, { month: 'short' });
    const rangeEndMonth = weekEnd.toLocaleDateString(locale, { month: 'short' });

    let sublabel;
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      sublabel = `${rangeStartDate} - ${rangeEndDate} ${rangeEndMonth}`;
    } else {
      sublabel = `${rangeStartDate} ${rangeStartMonth} - ${rangeEndDate} ${rangeEndMonth}`;
    }

    weeks.push({
      startStr: formatLocalYYYYMMDD(weekStart),
      endStr: formatLocalYYYYMMDD(weekEnd),
      label: `Minggu ke ${weekNum}`,
      sublabel: sublabel,
      weekNum
    });

    weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
    weekNum++;
  }
  return weeks.reverse();
}

// ── Helper: get months of the year ──
function getMonthsOfYear(refDate, locale) {
  const year = refDate.getFullYear();
  const months = [];
  for (let m = 0; m < 12; m++) {
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    months.push({
      startStr: formatLocalYYYYMMDD(first),
      endStr: formatLocalYYYYMMDD(last),
      label: first.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      sublabel: year.toString()
    });
  }
  return months.reverse();
}

// ── Helper: get years history list (txs di-inject; caller baca Store) ──
function getYearsOfHistory(refDate, txs) {
  const currentYear = new Date().getFullYear();
  const list = txs || [];
  let minYear = currentYear;
  list.forEach(t => {
    if (t.date) {
      const y = parseInt(t.date.substring(0, 4), 10);
      if (y && y < minYear) minYear = y;
    }
  });

  const years = [];
  for (let y = currentYear; y >= minYear; y--) {
    const first = new Date(y, 0, 1);
    const last = new Date(y, 11, 31);
    years.push({
      startStr: formatLocalYYYYMMDD(first),
      endStr: formatLocalYYYYMMDD(last),
      label: `Tahun ${y}`,
      sublabel: `${y}`,
      yearNum: y
    });
  }
  return years;
}

// ── Navigation label & pure step ──
function getPeriodNavLabel(period, refDate, txs, locale) {
  if (period === 'daily') return getWeekNavLabel(refDate, locale);
  if (period === 'weekly') return refDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  if (period === 'monthly') return `Tahun ${refDate.getFullYear()}`;
  if (period === 'yearly') {
    const years = getYearsOfHistory(refDate, txs);
    if (years.length === 0) return `Ringkasan Tahunan`;
    if (years.length === 1) return `Tahun ${years[0].yearNum}`;
    return `Tahun ${years[years.length - 1].yearNum} - ${years[0].yearNum}`;
  }
  return `Riwayat Transaksi`;
}

// Murni: navigasi satu langkah tanpa mutasi; caller assign + clear + render.
function stepPeriodDate(period, refDate, dir) {
  const d = new Date(refDate);
  if (period === 'daily') d.setDate(d.getDate() + 7 * dir);
  else if (period === 'weekly') d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

// ── Get period groups ──
function getPeriodGroups(period, refDate, txs, locale) {
  if (period === 'daily') return getDaysOfWeek(refDate, locale);
  if (period === 'weekly') return getWeeksOfMonth(refDate, locale);
  if (period === 'monthly') return getMonthsOfYear(refDate, locale);
  return getYearsOfHistory(refDate, txs);
}

// ── Filter transactions for a date range (dataset di-inject) ──
function filterTxsByRange(txs, startStr, endStr) {
  return (txs || []).filter(t => t.date >= startStr && t.date <= endStr);
}
