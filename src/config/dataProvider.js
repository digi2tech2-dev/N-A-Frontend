const configuredProvider = String(import.meta.env.VITE_DATA_PROVIDER || '').trim().toLowerCase();
const isProductionBuild = Boolean(import.meta.env.PROD);

if (isProductionBuild && configuredProvider !== 'real') {
  throw new Error('Production builds require VITE_DATA_PROVIDER=real.');
}

export const dataProvider = configuredProvider === 'real' ? 'real' : 'mock';
export const isRealProvider = dataProvider === 'real';

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();

if (isProductionBuild && !configuredApiBaseUrl) {
  throw new Error('Production builds require VITE_API_BASE_URL.');
}

export const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '') || 'http://localhost:5000/api';

// Real provider mode uses backend referrals unless a local/demo build explicitly opts out.
export const isReferralApiEnabled = isRealProvider
  && String(import.meta.env.VITE_REFERRAL_API_ENABLED || '').trim().toLowerCase() !== 'false';
