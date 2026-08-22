import { dataProvider as provider } from '../config/dataProvider';
let apiModulePromise = null;

const loadRealApi = () => import('./realApi');
const loadMockApi = () => import('./mockApi');

const loadApiModule = () => {
  if (!apiModulePromise) {
    apiModulePromise = provider === 'real'
      ? loadRealApi()
      : loadMockApi();
  }

  return apiModulePromise.then((module) => module.default);
};

const callApiMethod = async (section, method, args) => {
  const api = await loadApiModule();
  const targetSection = api?.[section];
  const targetMethod = targetSection?.[method];

  if (typeof targetMethod !== 'function') {
    return targetMethod;
  }

  return targetMethod.apply(targetSection, args);
};

const createSectionProxy = (section) => new Proxy({}, {
  get(_target, method) {
    if (method === 'then' || typeof method === 'symbol') return undefined;
    return (...args) => callApiMethod(section, method, args);
  },
});

const apiClient = new Proxy({}, {
  get(_target, section) {
    if (section === 'then' || typeof section === 'symbol') return undefined;
    return createSectionProxy(section);
  },
});

export default apiClient;
