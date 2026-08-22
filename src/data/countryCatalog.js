export const COUNTRY_CATALOG = [
  {
    cca2: 'AE',
    name: { common: 'United Arab Emirates' },
    idd: { root: '+971', suffixes: [''] },
    currencies: { AED: { name: 'UAE Dirham', symbol: 'AED' } },
  },
  {
    cca2: 'BH',
    name: { common: 'Bahrain' },
    idd: { root: '+973', suffixes: [''] },
    currencies: { BHD: { name: 'Bahraini Dinar', symbol: 'BHD' } },
  },
  {
    cca2: 'EG',
    name: { common: 'Egypt' },
    idd: { root: '+20', suffixes: [''] },
    currencies: { EGP: { name: 'Egyptian Pound', symbol: 'EGP' } },
  },
  {
    cca2: 'GB',
    name: { common: 'United Kingdom' },
    idd: { root: '+44', suffixes: [''] },
    currencies: { GBP: { name: 'Pound Sterling', symbol: 'GBP' } },
  },
  {
    cca2: 'IQ',
    name: { common: 'Iraq' },
    idd: { root: '+964', suffixes: [''] },
    currencies: { IQD: { name: 'Iraqi Dinar', symbol: 'IQD' } },
  },
  {
    cca2: 'JO',
    name: { common: 'Jordan' },
    idd: { root: '+962', suffixes: [''] },
    currencies: { JOD: { name: 'Jordanian Dinar', symbol: 'JOD' } },
  },
  {
    cca2: 'KW',
    name: { common: 'Kuwait' },
    idd: { root: '+965', suffixes: [''] },
    currencies: { KWD: { name: 'Kuwaiti Dinar', symbol: 'KWD' } },
  },
  {
    cca2: 'OM',
    name: { common: 'Oman' },
    idd: { root: '+968', suffixes: [''] },
    currencies: { OMR: { name: 'Omani Rial', symbol: 'OMR' } },
  },
  {
    cca2: 'QA',
    name: { common: 'Qatar' },
    idd: { root: '+974', suffixes: [''] },
    currencies: { QAR: { name: 'Qatari Riyal', symbol: 'QAR' } },
  },
  {
    cca2: 'SA',
    name: { common: 'Saudi Arabia' },
    idd: { root: '+966', suffixes: [''] },
    currencies: { SAR: { name: 'Saudi Riyal', symbol: 'SAR' } },
  },
  {
    cca2: 'TR',
    name: { common: 'Turkey' },
    idd: { root: '+90', suffixes: [''] },
    currencies: { TRY: { name: 'Turkish Lira', symbol: 'TRY' } },
  },
  {
    cca2: 'US',
    name: { common: 'United States' },
    idd: { root: '+1', suffixes: [''] },
    currencies: { USD: { name: 'US Dollar', symbol: '$' } },
  },
];

export const buildCurrencyCatalogFromCountries = () => {
  const map = new Map();

  COUNTRY_CATALOG.forEach((country) => {
    const countryName = country?.name?.common || country?.cca2 || 'Unknown';

    Object.entries(country?.currencies || {}).forEach(([code, info]) => {
      const normalizedCode = String(code || '').toUpperCase();
      if (!normalizedCode) return;

      if (!map.has(normalizedCode)) {
        map.set(normalizedCode, {
          code: normalizedCode,
          name: info?.name || normalizedCode,
          symbol: info?.symbol || normalizedCode,
          countries: [countryName],
        });
        return;
      }

      const existing = map.get(normalizedCode);
      existing.countries.push(countryName);
    });
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      countries: Array.from(new Set(item.countries)).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
};
