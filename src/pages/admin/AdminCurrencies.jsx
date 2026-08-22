import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  Coins,
  Globe2,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import useSystemStore from '../../store/useSystemStore';
import useAuthStore from '../../store/useAuthStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { selectClassName } from '../../components/ui/Input';
import ConfirmDialog from '../../components/account/ConfirmDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

const defaultForm = { code: '', name: '', symbol: '', rate: '1' };

const CURRENCY_AR_NAMES = {
  AED: 'درهم إماراتي',
  AFN: 'أفغاني أفغانستاني',
  ALL: 'ليك ألباني',
  AMD: 'درام أرميني',
  ANG: 'غيلدر جزر الأنتيل الهولندية',
  AOA: 'كوانزا أنغولي',
  ARS: 'بيزو أرجنتيني',
  AUD: 'دولار أسترالي',
  AWG: 'فلورن أروبي',
  AZN: 'مانات أذربيجاني',
  BAM: 'مارك بوسني قابل للتحويل',
  BBD: 'دولار بربادوسي',
  BDT: 'تاكا بنغلاديشي',
  BGN: 'ليف بلغاري',
  BHD: 'دينار بحريني',
  BIF: 'فرنك بوروندي',
  BMD: 'دولار برمودي',
  BND: 'دولار بروناي',
  BOB: 'بوليفيانو بوليفي',
  BRL: 'ريال برازيلي',
  BSD: 'دولار بهامي',
  BTN: 'نغولترم بوتاني',
  BWP: 'بولا بوتسواني',
  BYN: 'روبل بيلاروسي',
  BZD: 'دولار بليزي',
  CAD: 'دولار كندي',
  CDF: 'فرنك كونغولي',
  CHF: 'فرنك سويسري',
  CLP: 'بيزو تشيلي',
  CNY: 'يوان صيني',
  COP: 'بيزو كولومبي',
  CRC: 'كولون كوستاريكي',
  CUP: 'بيزو كوبي',
  CVE: 'إسكودو الرأس الأخضر',
  CZK: 'كرونة تشيكية',
  DJF: 'فرنك جيبوتي',
  DKK: 'كرونة دنماركية',
  DOP: 'بيزو دومينيكي',
  DZD: 'دينار جزائري',
  EGP: 'جنيه مصري',
  ERN: 'ناكفا إريتري',
  ETB: 'بير إثيوبي',
  EUR: 'يورو',
  FJD: 'دولار فيجي',
  FKP: 'جنيه جزر فوكلاند',
  GBP: 'جنيه إسترليني',
  GEL: 'لاري جورجي',
  GGP: 'جنيه غيرنزي',
  GHS: 'سيدي غاني',
  GIP: 'جنيه جبل طارق',
  GMD: 'دلاسي غامبي',
  GNF: 'فرنك غيني',
  GTQ: 'كتزال غواتيمالي',
  GYD: 'دولار غياني',
  HKD: 'دولار هونغ كونغ',
  HNL: 'لمبيرا هندوراسي',
  HTG: 'غورد هايتي',
  HUF: 'فورنت مجري',
  IDR: 'روبية إندونيسية',
  ILS: 'شيكل إسرائيلي جديد',
  IMP: 'جنيه جزيرة مان',
  INR: 'روبية هندية',
  IQD: 'دينار عراقي',
  IRR: 'ريال إيراني',
  ISK: 'كرونة آيسلندية',
  JEP: 'جنيه جيرزي',
  JMD: 'دولار جامايكي',
  JOD: 'دينار أردني',
  JPY: 'ين ياباني',
  KES: 'شلن كيني',
  KGS: 'سوم قيرغيزستاني',
  KHR: 'ريال كمبودي',
  KID: 'دولار كيريباتي',
  KMF: 'فرنك قمري',
  KRW: 'وون كوري جنوبي',
  KWD: 'دينار كويتي',
  KYD: 'دولار جزر كايمان',
  KZT: 'تنغي كازاخستاني',
  LAK: 'كيب لاوسي',
  LBP: 'ليرة لبنانية',
  LKR: 'روبية سريلانكية',
  LRD: 'دولار ليبيري',
  LSL: 'لوتي ليسوتو',
  LYD: 'دينار ليبي',
  MAD: 'درهم مغربي',
  MDL: 'ليو مولدوفي',
  MGA: 'أرياري مدغشقري',
  MKD: 'دينار مقدوني',
  MMK: 'كيات ميانماري',
  MNT: 'توغريك منغولي',
  MOP: 'باتاكا ماكاوية',
  MRU: 'أوقية موريتانية',
  MUR: 'روبية موريشيوسية',
  MVR: 'روفية مالديفية',
  MWK: 'كواشا ملاوية',
  MXN: 'بيزو مكسيكي',
  MYR: 'رينغيت ماليزي',
  MZN: 'متكال موزمبيقي',
  NAD: 'دولار ناميبي',
  NGN: 'نايرا نيجيرية',
  NIO: 'كوردوبا نيكاراغوية',
  NOK: 'كرونة نرويجية',
  NPR: 'روبية نيبالية',
  NZD: 'دولار نيوزيلندي',
  OMR: 'ريال عماني',
  PAB: 'بالبوا بنمي',
  PEN: 'سول بيروفي',
  PGK: 'كينا بابوا غينيا الجديدة',
  PHP: 'بيزو فلبيني',
  PKR: 'روبية باكستانية',
  PLN: 'زلوتي بولندي',
  PYG: 'غواراني باراغواي',
  QAR: 'ريال قطري',
  RON: 'ليو روماني',
  RSD: 'دينار صربي',
  RUB: 'روبل روسي',
  RWF: 'فرنك رواندي',
  SAR: 'ريال سعودي',
  SBD: 'دولار جزر سليمان',
  SCR: 'روبية سيشلية',
  SDG: 'جنيه سوداني',
  SEK: 'كرونة سويدية',
  SGD: 'دولار سنغافوري',
  SHP: 'جنيه سانت هيلانة',
  SLE: 'ليون سيراليوني',
  SLL: 'ليون سيراليوني قديم',
  SOS: 'شلن صومالي',
  SRD: 'دولار سورينامي',
  SSP: 'جنيه جنوب سوداني',
  STN: 'دوبرا ساو تومي وبرينسيب',
  SYP: 'ليرة سورية',
  SZL: 'ليلانغيني إسواتيني',
  THB: 'بات تايلاندي',
  TJS: 'سوموني طاجيكستاني',
  TMT: 'مانات تركمانستاني',
  TND: 'دينار تونسي',
  TOP: 'بانغا تونغي',
  TRY: 'ليرة تركية',
  TTD: 'دولار ترينيداد وتوباغو',
  TVD: 'دولار توفالو',
  TWD: 'دولار تايواني جديد',
  TZS: 'شلن تنزاني',
  UAH: 'هريفنيا أوكرانية',
  UGX: 'شلن أوغندي',
  USD: 'دولار أمريكي',
  UYU: 'بيزو أوروغواي',
  UZS: 'سوم أوزبكستاني',
  VES: 'بوليفار فنزويلي',
  VND: 'دونغ فيتنامي',
  VUV: 'فاتو فانواتو',
  WST: 'تالا ساموي',
  XAF: 'فرنك وسط أفريقيا',
  XCD: 'دولار شرق الكاريبي',
  XOF: 'فرنك غرب أفريقيا',
  XPF: 'فرنك المحيط الهادئ',
  YER: 'ريال يمني',
  ZAR: 'راند جنوب أفريقي',
  ZMW: 'كواشا زامبية',
  ZWL: 'دولار زيمبابوي',
};

const getArabicCurrencyName = (code, fallback = '') => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return '';
  return CURRENCY_AR_NAMES[normalizedCode] || `عملة ${normalizedCode}`;
};

const getArabicCountryName = (country = {}) => {
  const translatedName = country?.translations?.ara?.common;
  if (translatedName) return translatedName;

  const countryCode = String(country?.cca2 || '').trim().toUpperCase();
  return countryCode ? `دولة ${countryCode}` : 'دولة غير معروفة';
};

const getCurrencyDisplayName = (item = {}) => getArabicCurrencyName(item.code, item.name);

const AdminCurrencies = () => {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const {
    currencies,
    loadCurrencies,
    addCurrency,
    updateCurrency,
    deleteCurrency,
    isLoadingCurrencies,
  } = useSystemStore();

  const [form, setForm] = useState(defaultForm);
  const [editingCode, setEditingCode] = useState('');
  const [originalRate, setOriginalRate] = useState(null);
  const [applyDebtAdjustment, setApplyDebtAdjustment] = useState(false);
  const [catalogCurrencies, setCatalogCurrencies] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogCode, setSelectedCatalogCode] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [currencySearch, setCurrencySearch] = useState('');
  const [deleteCurrencyCode, setDeleteCurrencyCode] = useState('');

  // Compute rate change percentage dynamically (bidirectional)
  const rateChangePercent = useMemo(() => {
    if (!editingCode || originalRate === null || originalRate <= 0) return null;
    const newRate = Number(form.rate);
    if (Number.isNaN(newRate) || newRate <= 0 || newRate === originalRate) return null;
    return ((newRate - originalRate) / originalRate) * 100;
  }, [editingCode, originalRate, form.rate]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  useEffect(() => {
    let isMounted = true;

    const loadCatalogCurrencies = async () => {
      setCatalogLoading(true);
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies,cca2,translations');
        if (!response.ok) throw new Error('فشل جلب كتالوج العملات');
        const rows = await response.json();
        const map = new Map();

        (Array.isArray(rows) ? rows : []).forEach((country) => {
          const countryName = getArabicCountryName(country);
          const countrySearchName = [
            countryName,
            country?.name?.common || '',
            country?.translations?.eng?.common || '',
          ].filter(Boolean).join(' ');

          Object.entries(country?.currencies || {}).forEach(([code, info]) => {
            const normalizedCode = String(code || '').toUpperCase();
            if (!normalizedCode) return;
            const englishName = info?.name || normalizedCode;
            const arabicName = getArabicCurrencyName(normalizedCode, englishName);

            const existing = map.get(normalizedCode);
            if (!existing) {
              map.set(normalizedCode, {
                code: normalizedCode,
                name: arabicName,
                englishName,
                symbol: info?.symbol || normalizedCode,
                countries: [countryName],
                countrySearchNames: [countrySearchName],
              });
            } else {
              existing.countries.push(countryName);
              existing.countrySearchNames.push(countrySearchName);
            }
          });
        });

        const list = Array.from(map.values())
          .map((item) => ({
            ...item,
            countries: Array.from(new Set(item.countries)),
            countrySearchNames: Array.from(new Set(item.countrySearchNames)),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        if (isMounted) {
          setCatalogCurrencies(list);
        }
      } catch (_error) {
        if (isMounted) {
          setCatalogCurrencies([]);
        }
      } finally {
        if (isMounted) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalogCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  const existingCodes = useMemo(
    () => new Set((currencies || []).map((item) => String(item.code || '').toUpperCase())),
    [currencies]
  );

  const selectableCatalogCurrencies = useMemo(
    () => catalogCurrencies.filter((item) => !existingCodes.has(item.code)),
    [catalogCurrencies, existingCodes]
  );

  const selectedCatalogCurrency = useMemo(
    () => selectableCatalogCurrencies.find((item) => item.code === selectedCatalogCode) || null,
    [selectedCatalogCode, selectableCatalogCurrencies]
  );

  const visibleCatalogCurrencies = useMemo(() => {
    const query = catalogSearch.trim().toLocaleLowerCase('ar');
    const rows = query
      ? selectableCatalogCurrencies.filter((item) => (
        item.code.toLocaleLowerCase('ar').includes(query)
        || item.name.toLocaleLowerCase('ar').includes(query)
        || String(item.englishName || '').toLocaleLowerCase('ar').includes(query)
        || String(item.symbol || '').toLowerCase().includes(query)
        || item.countries.some((country) => country.toLocaleLowerCase('ar').includes(query))
        || (item.countrySearchNames || []).some((country) => country.toLocaleLowerCase('ar').includes(query))
      ))
      : selectableCatalogCurrencies;

    return rows.slice(0, 120);
  }, [catalogSearch, selectableCatalogCurrencies]);

  const visibleCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLocaleLowerCase('ar');
    const rows = [...(currencies || [])].sort((a, b) => (
      getCurrencyDisplayName(a).localeCompare(getCurrencyDisplayName(b), 'ar')
    ));
    if (!query) return rows;

    return rows.filter((item) => (
      String(item.code || '').toLocaleLowerCase('ar').includes(query)
      || String(item.name || '').toLocaleLowerCase('ar').includes(query)
      || getCurrencyDisplayName(item).toLocaleLowerCase('ar').includes(query)
      || String(item.symbol || '').toLocaleLowerCase('ar').includes(query)
    ));
  }, [currencies, currencySearch]);

  const currencyStats = useMemo(() => ({
    total: (currencies || []).length,
    catalogTotal: catalogCurrencies.length,
    available: selectableCatalogCurrencies.length,
  }), [catalogCurrencies.length, currencies, selectableCatalogCurrencies.length]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingCode('');
    setOriginalRate(null);
    setApplyDebtAdjustment(false);
    setSelectedCatalogCode('');
    setIsEditorOpen(false);
  };

  const openAddEditor = () => {
    setForm(defaultForm);
    setEditingCode('');
    setOriginalRate(null);
    setApplyDebtAdjustment(false);
    setSelectedCatalogCode('');
    setIsEditorOpen(true);
  };

  const clearAddEditorForm = () => {
    setForm(defaultForm);
    setSelectedCatalogCode('');
  };

  const handleCatalogPick = (code) => {
    setSelectedCatalogCode(code);
    if (!code || editingCode) return;

    const selected = selectableCatalogCurrencies.find((item) => item.code === code);
    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      code: selected.code,
      name: selected.name,
      symbol: selected.symbol,
    }));
    setEditingCode('');
    setOriginalRate(null);
    setApplyDebtAdjustment(false);
    setIsEditorOpen(true);
  };

  const validateForm = () => {
    if (!form.code.trim() || !form.name.trim() || !form.symbol.trim()) {
      addToast('يرجى تعبئة جميع الحقول', 'error');
      return false;
    }

    const rate = Number(form.rate);
    if (Number.isNaN(rate) || rate <= 0) {
      addToast('سعر الصرف يجب أن يكون رقمًا موجبًا', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      rate: Number(form.rate),
    };

    // Include debt adjustment flag when editing and rate changed
    if (editingCode && applyDebtAdjustment && rateChangePercent !== null) {
      payload.applyDebtAdjustment = true;
    }

    try {
      if (editingCode) {
        const result = await updateCurrency(editingCode, payload, user);
        if (result?.debtAdjustment) {
          addToast(
            `تم تحديث العملة وتعديل ديون ${result.debtAdjustment.usersAdjusted} مستخدم (${Math.abs(rateChangePercent).toFixed(2)}%)`,
            'success'
          );
        } else {
          addToast('تم تحديث العملة', 'success');
        }
      } else {
        await addCurrency(payload, user);
        addToast('تمت إضافة العملة', 'success');
      }
      resetForm();
    } catch (error) {
      addToast(error?.message || 'فشل حفظ العملة', 'error');
    }
  };

  const handleEdit = (item) => {
    setEditingCode(item.code);
    setOriginalRate(Number(item.rate));
    setApplyDebtAdjustment(false);
    setForm({
      code: item.code,
      name: getCurrencyDisplayName(item),
      symbol: item.symbol,
      rate: String(item.rate),
    });
    setIsEditorOpen(true);
  };

  const handleDelete = async (code) => {
    setDeleteCurrencyCode(code);
  };

  const confirmDeleteCurrency = async () => {
    const code = deleteCurrencyCode;
    if (!code) return;
    try {
      await deleteCurrency(code, user);
      addToast('تم حذف العملة', 'success');
      setDeleteCurrencyCode('');
      if (editingCode === code) resetForm();
    } catch (error) {
      addToast(error?.message || 'فشل حذف العملة', 'error');
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <section className="admin-premium-hero overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
              <Globe2 className="h-3.5 w-3.5" />
              REST Countries API
            </p>
            <h1 className="mt-3 text-2xl font-black text-[var(--color-text)] sm:text-3xl">إدارة العملات</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              اختر العملة من الكتالوج العالمي، راجع بياناتها، ثم أضفها أو حدّث سعر الصرف من مكان واحد.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[1.2rem] border border-[color:rgb(var(--color-border-rgb)/0.76)] bg-[color:rgb(var(--color-card-rgb)/0.72)] p-2 text-center">
            <div className="rounded-[0.9rem] bg-[color:rgb(var(--color-surface-rgb)/0.62)] px-3 py-2">
              <p className="text-[10px] font-bold text-[var(--color-muted)]">المضافة</p>
              <p className="mt-1 text-lg font-black text-[var(--color-text)]">{currencyStats.total}</p>
            </div>
            <div className="rounded-[0.9rem] bg-[color:rgb(var(--color-surface-rgb)/0.62)] px-3 py-2">
              <p className="text-[10px] font-bold text-[var(--color-muted)]">العالمية</p>
              <p className="mt-1 text-lg font-black text-[var(--color-text)]">{currencyStats.catalogTotal}</p>
            </div>
            <div className="rounded-[0.9rem] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-3 py-2">
              <p className="text-[10px] font-bold text-[var(--color-primary)]">المتاحة</p>
              <p className="mt-1 text-lg font-black text-[var(--color-primary)]">{currencyStats.available}</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="admin-premium-panel overflow-hidden p-0">
        <div className="p-4 sm:p-5">
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--color-text)]">
                  <Coins className="h-5 w-5 text-[var(--color-primary)]" />
                  كتالوج العملات العالمي
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                  ابحث بالكود أو الاسم أو الدولة، ثم اختر العملة لتعبئة البيانات تلقائيًا.
                </p>
              </div>
              {catalogLoading ? <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" /> : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
              <Input
                variant="search"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="بحث في الكتالوج مثل EGP أو مصر"
                icon={<Search className="h-4 w-4" />}
                disabled={catalogLoading}
              />

              <Button type="button" onClick={openAddEditor} className="w-full">
                <PlusCircle className="h-4 w-4" />
                إضافة عملة يدويًا
              </Button>
            </div>

            <div className="mt-3">
              <select
                value={selectedCatalogCode}
                onChange={(e) => handleCatalogPick(e.target.value)}
                disabled={catalogLoading}
                className={selectClassName}
              >
                <option value="">
                  {catalogLoading ? 'جاري تحميل العملات العالمية...' : 'اختر عملة من الكتالوج لفتح بطاقة الإضافة'}
                </option>
                {visibleCatalogCurrencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} - {item.code} ({item.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            aria-label="إغلاق بيانات العملة"
            className="absolute inset-0 bg-black/45"
            onClick={resetForm}
          />

          <form
            onSubmit={handleSubmit}
            className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-[1.35rem] border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.99),rgb(var(--color-elevated-rgb)/0.96))] p-4 shadow-[0_34px_90px_-42px_rgba(0,0,0,0.78)] sm:p-5"
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--color-text)]">
                  <CircleDollarSign className="h-5 w-5 text-[var(--color-primary)]" />
                  {editingCode ? `تحديث ${editingCode}` : 'بيانات العملة'}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  سعر الصرف محسوب مقابل الدولار الأمريكي، ويفضل ترك USD بقيمة 1.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
                إغلاق
              </Button>
            </div>

            {selectedCatalogCurrency && !editingCode ? (
              <div className="mb-4 rounded-[1rem] border border-[color:rgb(var(--color-primary-rgb)/0.22)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-[var(--color-text)]">{selectedCatalogCurrency.code}</p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-secondary)]">{selectedCatalogCurrency.name}</p>
                  </div>
                  <span className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.28)] bg-[color:rgb(var(--color-card-rgb)/0.8)] px-3 text-lg font-black text-[var(--color-primary)]">
                    {selectedCatalogCurrency.symbol}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--color-muted)]">
                  الدول: {selectedCatalogCurrency.countries.slice(0, 6).join('، ')}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input
                label="كود العملة"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="USD"
                disabled={Boolean(editingCode)}
              />
              <Input
                label="اسم العملة"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="دولار أمريكي"
              />
              <Input
                label="علامة العملة"
                value={form.symbol}
                onChange={(e) => setForm((prev) => ({ ...prev, symbol: e.target.value }))}
                placeholder="$"
              />
              <Input
                label="سعر الصرف"
                type="number"
                step="0.0001"
                min="0.0001"
                value={form.rate}
                onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
                placeholder="1"
              />
            </div>

          {/* ── Debt Adjustment Checkbox (visible when editing + rate changed) ── */}
          {editingCode && rateChangePercent !== null && editingCode !== 'USD' && (
            <div className="mt-4">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${rateChangePercent > 0
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30 hover:border-amber-400 dark:hover:border-amber-500'
                    : 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-500'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={applyDebtAdjustment}
                  onChange={(e) => setApplyDebtAdjustment(e.target.checked)}
                  className={`mt-0.5 h-4 w-4 rounded border-gray-300
                    ${rateChangePercent > 0 ? 'text-amber-600 focus:ring-amber-500' : 'text-emerald-600 focus:ring-emerald-500'}
                    dark:border-gray-600 dark:bg-gray-800`}
                />
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${rateChangePercent > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {rateChangePercent > 0
                        ? <>السعر ارتفع بنسبة{' '}<strong className="text-amber-900 dark:text-amber-200">{Math.abs(rateChangePercent).toFixed(2)}%</strong>{' '}— تطبيق هذه الزيادة على ديون المستخدمين؟</>
                        : <>السعر انخفض بنسبة{' '}<strong className="text-emerald-900 dark:text-emerald-200">{Math.abs(rateChangePercent).toFixed(2)}%</strong>{' '}— هل تريد تطبيق هذا الخصم على ديون المستخدمين؟</>
                      }
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${rateChangePercent > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {rateChangePercent > 0
                      ? `سيتم زيادة الأرصدة السالبة لجميع المستخدمين بنسبة ${Math.abs(rateChangePercent).toFixed(2)}% لتعكس انخفاض قيمة العملة.`
                      : `سيتم تخفيض الأرصدة السالبة لجميع المستخدمين بنسبة ${Math.abs(rateChangePercent).toFixed(2)}% لتعكس ارتفاع قيمة العملة.`
                    }
                    {' '}(السعر القديم: {originalRate} → الجديد: {form.rate})
                  </p>
                </div>
              </label>
            </div>
          )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="sm:min-w-40">
              <PlusCircle className="w-4 h-4 mr-1" />
              {editingCode ? 'تحديث العملة' : 'إضافة عملة'}
            </Button>
              {!editingCode && (
                <Button type="button" variant="secondary" onClick={clearAddEditorForm}>
                  <RefreshCw className="h-4 w-4" />
                  تفريغ الحقول
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      <Card className="admin-premium-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text)]">العملات المفعلة</h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              إدارة العملات الموجودة في النظام وتحديث أسعار الصرف.
            </p>
          </div>
          <div className="w-full lg:max-w-xs">
            <Input
              variant="search"
              value={currencySearch}
              onChange={(e) => setCurrencySearch(e.target.value)}
              placeholder="بحث في العملات المضافة"
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>اسم العملة</TableHead>
                <TableHead>العلامة</TableHead>
                <TableHead>سعر الصرف</TableHead>
                <TableHead className="text-end">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCurrencies.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-black text-[var(--color-text)]">{item.code}</TableCell>
                  <TableCell>{getCurrencyDisplayName(item)}</TableCell>
                  <TableCell>
                    <span className="inline-flex min-w-10 items-center justify-center rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.58)] px-2 py-1 font-bold text-[var(--color-text)]">
                      {item.symbol}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-[var(--color-primary)]">{item.rate}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(item.code)}
                        disabled={item.code === 'USD'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!isLoadingCurrencies && visibleCurrencies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">لا توجد عملات مطابقة</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 md:hidden">
          {visibleCurrencies.map((item) => (
            <article
              key={item.code}
              className="rounded-[1.1rem] border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.78)] p-3 shadow-[var(--shadow-subtle)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-black text-[var(--color-text)]">{item.code}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-text-secondary)]">{getCurrencyDisplayName(item)}</p>
                </div>
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[color:rgb(var(--color-primary-rgb)/0.24)] bg-[color:rgb(var(--color-primary-rgb)/0.1)] px-2 font-black text-[var(--color-primary)]">
                  {item.symbol}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[color:rgb(var(--color-surface-rgb)/0.48)] px-3 py-2">
                <span className="text-xs font-bold text-[var(--color-muted)]">سعر الصرف</span>
                <span className="font-black text-[var(--color-primary)]">{item.rate}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDelete(item.code)}
                  disabled={item.code === 'USD'}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </article>
          ))}

          {!isLoadingCurrencies && visibleCurrencies.length === 0 && (
            <div className="rounded-[1rem] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.82)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
              لا توجد عملات مطابقة
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteCurrencyCode)}
        title="حذف العملة"
        description={deleteCurrencyCode ? `هل تريد حذف العملة ${deleteCurrencyCode}؟` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={confirmDeleteCurrency}
        onCancel={() => setDeleteCurrencyCode('')}
        isLoading={isLoadingCurrencies}
      />
    </div>
  );
};

export default AdminCurrencies;
