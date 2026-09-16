import React from 'react';
import { Link } from 'react-router-dom';
import brandLogo from '../assets/logo.PNG';
import { apiBaseUrl } from '../config/dataProvider';

const clean = (value) => String(value || '').trim().replace(/\/+$/, '');
const deriveCanonicalBase = (value) => {
  const base = clean(value || apiBaseUrl);
  if (!base) return '/client/api';
  if (base.endsWith('/client/api')) return base;
  return `${base.replace(/\/api$/, '')}/client/api`;
};
const baseUrl = clean(import.meta.env.VITE_B2B_API_BASE_URL) || deriveCanonicalBase(import.meta.env.VITE_API_BASE_URL);

const endpoints = [
  ['GET', '/profile', 'Account balance and email.'],
  ['GET', '/products', 'Priced catalog; use products_id=1000,1001 or base=1 when required.'],
  ['GET', '/content/0', 'Root categories and uncategorized products; use a category ID for children.'],
  ['POST', '/orders', 'Create/replay an idempotent wallet-backed order.'],
  ['GET', '/check?orders=ID1,ID2', 'Check compatibility order IDs.'],
  ['GET', '/check?orders=uuid1&uuid=1', 'Check stable client UUIDs.'],
  ['GET', '/check?uuids=uuid1', 'Canonical UUID lookup.'],
  ['GET', '/newOrder/:productId/params', 'Legacy query-string placement endpoint.'],
];
const errors = [[100, 'Insufficient balance'], [105, 'Quantity unavailable'], [106, 'Quantity not allowed'], [109, 'Product not found'], [110, 'Unavailable'], [111, 'Rate limited'], [112, 'Quantity too small'], [113, 'Quantity too large'], [114, 'Business rule'], [120, 'Token required'], [121, 'Invalid token'], [122, 'API disabled, inactive, or blocked'], [123, 'IP not allowed'], [124, 'Validation error'], [130, 'Maintenance'], [500, 'Internal error']];
const Code = ({ children }) => <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-left text-xs leading-6 text-cyan-100"><code>{children}</code></pre>;

export default function ApiDocs() {
  return <main dir="ltr" className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-5"><Link to="/" className="flex items-center gap-3"><img src={brandLogo} alt="N&A HUB" className="h-10 w-10 rounded-lg object-contain" /><span className="font-bold">N&A HUB API</span></Link><Link to="/developers/api" className="text-sm font-semibold text-cyan-300">API management</Link></header>
      <section className="mt-8"><h1 className="text-3xl font-bold">N&A HUB Canonical B2B API</h1><p className="mt-2 text-slate-300">Public, wallet-backed reseller API.</p><Code>{baseUrl}</Code></section>
      <section className="mt-8 grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-slate-700 p-5"><h2 className="text-xl font-bold">Authentication</h2><p className="mt-2 text-sm text-slate-300">Send <code>api-token: TOKEN</code>. <code>x-api-key</code> and <code>Authorization: Bearer TOKEN</code> are aliases.</p></article><article className="rounded-2xl border border-slate-700 p-5"><h2 className="text-xl font-bold">Order states</h2><p className="mt-2 text-sm text-slate-300"><code>accept</code> completed, <code>wait</code> processing, <code>reject</code> failed or cancelled.</p></article></section>
      <section className="mt-8"><h2 className="text-xl font-bold">Endpoints</h2><div className="mt-3 overflow-x-auto rounded-2xl border border-slate-700"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="bg-slate-900 text-slate-300"><tr><th className="p-3">Method</th><th className="p-3">Path</th><th className="p-3">Purpose</th></tr></thead><tbody>{endpoints.map(([method, path, description]) => <tr className="border-t border-slate-800" key={path}><td className="p-3 font-mono text-cyan-300">{method}</td><td className="p-3 font-mono">{path}</td><td className="p-3 text-slate-300">{description}</td></tr>)}</tbody></table></div></section>
      <section className="mt-8"><h2 className="text-xl font-bold">Products and fields</h2><p className="mt-2 text-sm text-slate-300">Products return numeric compatibility IDs, server-derived price/currency, legacy <code>params</code> labels, and structured <code>fields</code>. Use fields for form construction; never send client prices, balances, or currency.</p><Code>{`{"id":1000,"params":["Player ID"],"fields":[{"key":"player_id","label":"Player ID","type":"text","required":true,"options":[]}]}`}</Code></section>
      <section className="mt-8"><h2 className="text-xl font-bold">Create order</h2><p className="mt-2 text-sm text-slate-300">Use a stable client-generated order_uuid. Replays return the original order and do not debit again.</p><Code>{`POST ${baseUrl}/orders\n{"product_id":1000,"qty":1,"order_uuid":"stable-client-key","params":{"player_id":"123"}}`}</Code><p className="mt-3 text-sm text-slate-300">Maintenance blocks order creation only with HTTP 503/code 130. Catalog and status checks remain available. Limit: 1000 requests per 15 minutes per IP.</p></section>
      <section className="my-8"><h2 className="text-xl font-bold">Errors</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{errors.map(([code, meaning]) => <div key={code} className="rounded-lg border border-slate-700 p-3 text-sm"><code className="mr-3 text-cyan-300">{code}</code>{meaning}</div>)}</div></section>
    </div>
  </main>;
}
