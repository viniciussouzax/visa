/**
 * Field Map Shared Helpers
 * Extraído de b1-b2.js — funções utilitárias usadas por todos os field-maps
 *
 * DS-160 SELECT VALUES (confirmed via logging):
 *   Day selects:   "01", "02", ..., "31" (ZERO-PADDED, 2 digits)
 *   Month selects: "JAN", "FEB", ..., "DEC" (3-letter uppercase abbreviations)
 *   Year fields:   "YYYY" (4-digit text input)
 */

/**
 * Clean phone number: remove non-digits and leading '+'
 */
function ph(s) {
    if (!s) return '';
    if (typeof s === 'object') return ''; // guard against date objects etc.
    return String(s).replace(/[^0-9+]/g, "").replace("+", "");
}

// DS-160 Month selects use 3-letter abbreviations as values
const MONTH_ABBREV = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_ABBREV_SET = new Set(MONTH_ABBREV);

/**
 * Normalize a day value. DS-160 Day selects use ZERO-PADDED values: "01"-"31"
 * Input: "5", "05", "15", 5 → Output: "05", "05", "15", "05"
 */
function padDay(v) {
    if (!v) return '';
    const n = parseInt(String(v), 10);
    if (isNaN(n) || n < 1 || n > 31) return String(v);
    return String(n).padStart(2, '0');
}

/**
 * Normalize a month value to DS-160 3-letter abbreviation.
 * DS-160 Month selects use values: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
 * Input can be: 'MAR', '03', '3', 'March', etc.
 */
function normMonth(v) {
    if (!v) return '';
    const s = String(v).trim().toUpperCase();
    // Already a valid abbreviation
    if (MONTH_ABBREV_SET.has(s)) return s;
    // Numeric (1-12 or 01-12) → convert to abbreviation
    const n = parseInt(s, 10);
    if (!isNaN(n) && n >= 1 && n <= 12) return MONTH_ABBREV[n - 1];
    // Full month name → abbreviation (e.g. "January" → "JAN")
    const first3 = s.substring(0, 3);
    if (MONTH_ABBREV_SET.has(first3)) return first3;
    return s;
}

/**
 * Normalize a date object for DS-160 selects.
 * DS-160 selects require: day="01"-"31" (padded), month="JAN"-"DEC", year="YYYY"
 */
function normDate(d) {
    if (!d) return { day: '', month: '', year: '' };
    return {
        day: padDay(d.day),
        month: normMonth(d.month),
        year: d.year ? String(d.year) : '',
    };
}

/**
 * @deprecated — use padDay directly. Kept for backward compat.
 */
function stripZero(v) {
    // Now just delegates to padDay — DS-160 uses zero-padded days
    return padDay(v);
}

/**
 * Empty date placeholder
 */
const emptyDate = { day: '', month: '', year: '' };

module.exports = { ph, padDay, normDate, normMonth, emptyDate, stripZero };
