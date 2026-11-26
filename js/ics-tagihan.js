  // ============================================================
  // EKSPOR KALENDER TAGIHAN (.ics) — v1.1.066
  // Mengubah kalender tagihan (computeBillCalendar) jadi file iCalendar yang bisa diimpor ke Google Calendar,
  // Apple Kalender, dll. Satu event sehari penuh per item tagihan, dengan pengingat H-1.
  // buildBillsIcs() fungsi murni (dites di tests/run.js); exportBillsIcs() hanya membungkus unduhan.
  // ============================================================
  function icsEscape(s) {
    return String(s === undefined || s === null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  // Lipat baris > 75 karakter sesuai RFC 5545 (lanjutan diawali satu spasi).
  function icsFold(line) {
    if (line.length <= 73) return line;
    const parts = [line.slice(0, 73)];
    for (let i = 73; i < line.length; i += 72) parts.push(' ' + line.slice(i, i + 72));
    return parts.join('\r\n');
  }

  function icsDate(ds) { return String(ds).replace(/-/g, ''); }

  function icsNextDay(ds) {
    const [y, m, d] = String(ds).split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + 1));
    return t.getUTCFullYear() + padMonth(t.getUTCMonth() + 1) + padMonth(t.getUTCDate());
  }

  // months = hasil computeBillCalendar; stamp = 'YYYYMMDDTHHMMSSZ' (dioper supaya fungsi tetap murni).
  function buildBillsIcs(months, stamp) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Keuangan Pribadi//Tagihan//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Tagihan Keuangan Pribadi'];
    let count = 0;
    (months || []).forEach(mo => (mo.items || []).forEach((it, i) => {
      if (!it.due) return;
      count++;
      lines.push('BEGIN:VEVENT');
      lines.push('UID:tagihan-' + it.accId + '-' + icsDate(it.due) + '-' + i + '@keuangan-pribadi');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART;VALUE=DATE:' + icsDate(it.due));
      lines.push('DTEND;VALUE=DATE:' + icsNextDay(it.due));
      lines.push('SUMMARY:' + icsEscape('Tagihan ' + it.accName + ' · ' + formatRp(it.amount)));
      lines.push('DESCRIPTION:' + icsEscape(it.label + '\nJumlah: ' + formatRp(it.amount)));
      lines.push('TRANSP:TRANSPARENT');
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape('Besok jatuh tempo: ' + it.accName), 'TRIGGER:-P1D', 'END:VALARM');
      lines.push('END:VEVENT');
    }));
    lines.push('END:VCALENDAR');
    return { text: lines.map(icsFold).join('\r\n') + '\r\n', count };
  }

  async function exportBillsIcs() {
    const data = loadData();
    const months = computeBillCalendar(data, computeAllBalances(data), 12);
    const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const { text, count } = buildBillsIcs(months, iso);
    if (!count) { showIoMsg('Tidak ada tagihan untuk diekspor.', 'error', 'tagihan-ics-msg'); return; }
    const filename = 'tagihan-' + exportUserPrefix() + '-' + todayStr() + '.ics';
    if (downloadsCap) {
      try { await downloadsCap.save({ filename, data: text }); showIoMsg(count + ' tagihan siap disimpan (.ics).', 'ok', 'tagihan-ics-msg'); return; }
      catch (e) { /* fall through */ }
    }
    try {
      const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showIoMsg(count + ' tagihan diunduh (.ics).', 'ok', 'tagihan-ics-msg');
    } catch (e) { showIoMsg('Gagal membuat file kalender.', 'error', 'tagihan-ics-msg'); }
  }
