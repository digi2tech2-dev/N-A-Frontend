import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const OUTPUT_URL = new URL('../src/data/worldCurrencyCatalog.js', import.meta.url);

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Unable to download the country catalog (${response.status})`);
}

const countries = await response.json();
const arabicCurrencyNames = new Intl.DisplayNames(['ar'], { type: 'currency' });

const catalog = countries
  .map((country) => {
    const countryCode = String(country?.cca2 || '').toUpperCase();
    const countryNameEn = country?.name?.common || countryCode;
    const countryNameAr = country?.translations?.ara?.common || countryNameEn;
    const flag = country?.flag || (
      /^[A-Z]{2}$/.test(countryCode)
        ? String.fromCodePoint(...countryCode.split('').map((letter) => 127397 + letter.charCodeAt(0)))
        : '🌍'
    );

    const currencies = Object.entries(country?.currencies || {})
      .map(([code, currency]) => {
        const normalizedCode = String(code || '').toUpperCase();
        return {
          code: normalizedCode,
          nameAr: arabicCurrencyNames.of(normalizedCode) || currency?.name || normalizedCode,
          nameEn: currency?.name || normalizedCode,
          symbol: currency?.symbol || normalizedCode,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      countryCode,
      countryNameAr,
      countryNameEn,
      flag,
      independent: country?.independent === true,
      currencies,
    };
  })
  .filter((country) => country.countryCode)
  .sort((a, b) => a.countryNameAr.localeCompare(b.countryNameAr, 'ar'));

const fileHeader = `// Generated from ${SOURCE_URL}\n// Run: node scripts/generate-world-currency-catalog.mjs\n\n`;
const fileBody = `export const WORLD_CURRENCY_COUNTRIES = ${JSON.stringify(catalog, null, 2)};\n\n`;
const fileHelpers = String.raw`const HOME_COUNTRY_BY_CURRENCY = { EUR: 'DE', USD: 'US' };

const countryPriority = (country, currencyCode) => {
  if (HOME_COUNTRY_BY_CURRENCY[currencyCode] === country.countryCode) return 0;
  if (currencyCode.slice(0, 2) === country.countryCode) return 1;
  if (country.independent) return 2;
  return 3;
};

export const buildWorldCurrencyCatalog = () => {
  const currencies = new Map();

  WORLD_CURRENCY_COUNTRIES.forEach((country) => {
    country.currencies.forEach((currency) => {
      if (!currencies.has(currency.code)) {
        currencies.set(currency.code, {
          code: currency.code,
          name: currency.nameAr,
          englishName: currency.nameEn,
          symbol: currency.symbol,
          countryEntries: [],
        });
      }

      currencies.get(currency.code).countryEntries.push({
        countryCode: country.countryCode,
        nameAr: country.countryNameAr,
        nameEn: country.countryNameEn,
        flag: country.flag,
        independent: country.independent,
      });
    });
  });

  return Array.from(currencies.values())
    .map((currency) => {
      const countryEntries = currency.countryEntries.sort((a, b) => {
        const priority = countryPriority(a, currency.code) - countryPriority(b, currency.code);
        return priority || a.nameAr.localeCompare(b.nameAr, 'ar');
      });

      return {
        ...currency,
        countries: countryEntries.map((country) => country.nameAr),
        countryCodes: countryEntries.map((country) => country.countryCode),
        flags: countryEntries.map((country) => country.flag),
        countrySearchNames: countryEntries.map((country) => [country.nameAr, country.nameEn].join(' ')),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
};
`;

await writeFile(fileURLToPath(OUTPUT_URL), fileHeader + fileBody + fileHelpers, 'utf8');
console.log(`Generated ${catalog.length} country records in ${fileURLToPath(OUTPUT_URL)}`);
