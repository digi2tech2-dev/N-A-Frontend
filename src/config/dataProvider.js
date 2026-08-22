const configuredProvider = String(import.meta.env.VITE_DATA_PROVIDER || '').trim().toLowerCase();
const isProductionBuild = Boolean(import.meta.env.PROD);

if (isProductionBuild && configuredProvider !== 'real') {
  throw new Error('Production builds require VITE_DATA_PROVIDER=real.');
}

export const dataProvider = configuredProvider === 'real' ? 'real' : 'mock';
export const isRealProvider = dataProvider === 'real';

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();

if (isProductionBuild && isRealProvider && !configuredApiBaseUrl) {
  throw new Error('Production real-provider builds require VITE_API_BASE_URL.');
}

export const apiBaseUrl = configuredApiBaseUrl || 'http://localhost:5000/api';

// Real provider mode is production-safe by default. A local/demo build must
// opt out explicitly to use the old browser-only referral fixtures.
export const isReferralApiEnabled = isRealProvider
  && String(import.meta.env.VITE_REFERRAL_API_ENABLED || '').trim().toLowerCase() !== 'false';
