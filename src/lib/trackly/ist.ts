// ===== IST (Indian Standard Time, UTC+5:30) helpers =====
// Trackly is India-first (INR everywhere) — all "now" timestamps must be
// recorded/displayed in Indian time regardless of the device/browser timezone.
// Deterministic arithmetic (no Intl timezone quirks, no "24:00" edge cases).

const IST_OFFSET_MIN = 5 * 60 + 30; // UTC+5:30

function shifted(d: Date): Date {
  // Same instant expressed with UTC getters shifted by IST offset
  return new Date(d.getTime() + IST_OFFSET_MIN * 60000);
}

/** Current date in IST as YYYY-MM-DD */
export function istDate(d: Date = new Date()): string {
  return shifted(d).toISOString().slice(0, 10);
}

/** Current time in IST as HH:MM (24-hour) */
export function istTime(d: Date = new Date()): string {
  const ist = shifted(d);
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

/** Current month in IST as YYYY-MM (for period filters) */
export function istMonth(d: Date = new Date()): string {
  return istDate(d).slice(0, 7);
}

/** Convert stored 24-hour "HH:MM" to 12-hour "h:MM AM/PM" for display.
 *  Data stays 24h — this is display-only (user asked for AM/PM times). */
export function to12hr(hhmm: string): string {
  if (!hhmm) return "";
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hhmm;
  let h = parseInt(m[1], 10);
  const min = m[2];
  if (isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}
