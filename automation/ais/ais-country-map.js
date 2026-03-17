// ============================================================
// AIS Country & Visa Class Mapping
// DS-160 values → AIS form values
// ============================================================

/**
 * DS-160 country label → ISO2 code for AIS selects.
 * DS-160 uses full labels ("BRAZIL"), AIS uses ISO2 ("BR").
 * Only countries commonly needed — extend as required.
 */
const DS160_COUNTRY_TO_ISO2 = {
    'BRAZIL': 'BR', 'UNITED STATES': 'US', 'PORTUGAL': 'PT',
    'ARGENTINA': 'AR', 'CHILE': 'CL', 'COLOMBIA': 'CO',
    'MEXICO': 'MX', 'CANADA': 'CA', 'UNITED KINGDOM': 'GB',
    'GERMANY': 'DE', 'FRANCE': 'FR', 'ITALY': 'IT',
    'SPAIN': 'ES', 'JAPAN': 'JP', 'CHINA': 'CN',
    'INDIA': 'IN', 'AUSTRALIA': 'AU', 'SOUTH KOREA': 'KR',
    'RUSSIA': 'RU', 'SOUTH AFRICA': 'ZA', 'PERU': 'PE',
    'URUGUAY': 'UY', 'PARAGUAY': 'PY', 'BOLIVIA': 'BO',
    'ECUADOR': 'EC', 'VENEZUELA': 'VE', 'CUBA': 'CU',
    'DOMINICAN REPUBLIC': 'DO', 'HAITI': 'HT', 'JAMAICA': 'JM',
    'COSTA RICA': 'CR', 'PANAMA': 'PA', 'GUATEMALA': 'GT',
    'EL SALVADOR': 'SV', 'HONDURAS': 'HN', 'NICARAGUA': 'NI',
    'TRINIDAD AND TOBAGO': 'TT', 'NIGERIA': 'NG', 'EGYPT': 'EG',
    'TURKEY': 'TR', 'TURKIYE': 'TR', 'ISRAEL': 'IL',
    'SAUDI ARABIA': 'SA', 'UNITED ARAB EMIRATES': 'AE',
    'IRAN': 'IR', 'IRAQ': 'IQ', 'PAKISTAN': 'PK',
    'BANGLADESH': 'BD', 'PHILIPPINES': 'PH', 'INDONESIA': 'ID',
    'THAILAND': 'TH', 'VIETNAM': 'VN', 'MALAYSIA': 'MY',
    'SINGAPORE': 'SG', 'TAIWAN': 'TW', 'HONG KONG': 'HK',
    'NEW ZEALAND': 'NZ', 'IRELAND': 'IE', 'NETHERLANDS': 'NL',
    'BELGIUM': 'BE', 'SWITZERLAND': 'CH', 'AUSTRIA': 'AT',
    'SWEDEN': 'SE', 'NORWAY': 'NO', 'DENMARK': 'DK',
    'FINLAND': 'FI', 'POLAND': 'PL', 'CZECH REPUBLIC': 'CZ',
    'HUNGARY': 'HU', 'ROMANIA': 'RO', 'GREECE': 'GR',
    'UKRAINE': 'UA', 'ANGOLA': 'AO', 'MOZAMBIQUE': 'MZ',
};

/**
 * Convert DS-160 country value to AIS ISO2 code.
 * Handles: full labels ("BRAZIL"), existing ISO2 ("BR"), lowercase ("br").
 *
 * @param {string} value - DS-160 country value
 * @param {boolean} lowercase - true for residency (AIS uses lowercase)
 * @returns {string} ISO2 code
 */
function ds160CountryToAIS(value, lowercase = false) {
    if (!value) return lowercase ? 'br' : 'BR'; // default Brazil

    const upper = value.trim().toUpperCase();

    // Already an ISO2 code (2 chars)?
    if (upper.length === 2) {
        return lowercase ? upper.toLowerCase() : upper;
    }

    // Lookup in map
    const iso2 = DS160_COUNTRY_TO_ISO2[upper];
    if (iso2) {
        return lowercase ? iso2.toLowerCase() : iso2;
    }

    // Fuzzy: try partial match
    for (const [label, code] of Object.entries(DS160_COUNTRY_TO_ISO2)) {
        if (upper.includes(label) || label.includes(upper)) {
            return lowercase ? code.toLowerCase() : code;
        }
    }

    console.warn(`[AIS-CountryMap] ⚠️ País não mapeado: "${value}" → fallback BR`);
    return lowercase ? 'br' : 'BR';
}

/**
 * DS-160 visa purpose → AIS visa_class_id (numeric string).
 * AIS uses internal numeric IDs, DS-160 uses codes like "B1/B2".
 */
const VISA_CLASS_MAP = {
    // B visas
    'B1':       '1',
    'B1/B2':    '2',
    'B2':       '2',    // most B2-only still file as B1/B2

    // C/D visas
    'C1':       '4',
    'C1/D':     '5',
    'D1':       '6',

    // E visas
    'E1':       '7',
    'E2':       '8',
    'E3':       '9',
    'E3D':      '10',

    // F visas (student)
    'F1':       '11',
    'F2':       '12',
    'F3':       '13',

    // H visas
    'H1B':      '14',
    'H1B1':     '15',
    'H2A':      '17',
    'H2B':      '18',
    'H3':       '19',
    'H4':       '67',   // H4 spouse of H1B (default)

    // I visa
    'I':        '21',

    // J visas (exchange)
    'J1':       '22',   // Work exchange (intern, trainee, summer)
    'J2':       '23',

    // L visas
    'L1':       '28',
    'L2':       '29',

    // M visas
    'M1':       '30',
    'M2':       '31',

    // O visas
    'O1':       '33',
    'O2':       '34',
    'O3':       '35',

    // P visas
    'P1':       '36',
    'P2':       '37',
    'P3':       '38',
    'P4':       '39',

    // Q visa
    'Q1':       '40',

    // R visas
    'R1':       '41',
    'R2':       '42',

    // T visas
    'T1':       '43',

    // TN/TD visas
    'TN':       '49',
    'TD':       '48',

    // U visas
    'U1':       '50',
};

/**
 * Convert DS-160 visa purpose code to AIS numeric visa_class_id.
 * @param {string} ds160Code - e.g. "B1/B2", "F1", "O1"
 * @returns {string} AIS numeric ID (e.g. "2", "11", "33")
 */
function ds160VisaToAIS(ds160Code) {
    if (!ds160Code) return '2'; // default B1/B2

    const clean = ds160Code.trim().toUpperCase().replace(/[\s-]/g, '');

    // Direct match
    if (VISA_CLASS_MAP[clean]) return VISA_CLASS_MAP[clean];

    // Try removing trailing numbers for H4 variants
    const base = clean.replace(/\d+$/, '');
    if (VISA_CLASS_MAP[base]) return VISA_CLASS_MAP[base];

    // Partial match
    for (const [key, val] of Object.entries(VISA_CLASS_MAP)) {
        if (clean.startsWith(key) || key.startsWith(clean)) return val;
    }

    console.warn(`[AIS-VisaMap] ⚠️ Visa não mapeada: "${ds160Code}" → fallback B1/B2 (2)`);
    return '2';
}

module.exports = {
    ds160CountryToAIS,
    ds160VisaToAIS,
    DS160_COUNTRY_TO_ISO2,
    VISA_CLASS_MAP,
};
