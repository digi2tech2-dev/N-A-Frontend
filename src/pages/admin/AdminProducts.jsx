import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Image as ImageIcon, Plus, Trash2, Info, Search, Check, Package, RefreshCw, Power } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';
import { uploadImage } from '../../services/realApi';
import useMediaStore from '../../store/useMediaStore';
import apiClient from '../../services/client';
import useAuthStore from '../../store/useAuthStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/account/ConfirmDialog';
import Input, { inputBaseClassName, selectClassName } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber } from '../../utils/intl';
import { getProductStatus, validateProductForm } from '../../utils/productStatus';

const PROVIDER_PRODUCTS_LIMIT = 2000;
const PROVIDER_PRODUCTS_PAGE_SIZE = 80;
const PRODUCT_FORM_STEPS = [
    { id: 'basic', number: 1, labelAr: 'الأساسيات', labelEn: 'Basics' },
    { id: 'pricing', number: 2, labelAr: 'الربط والسعر', labelEn: 'Pricing' },
    { id: 'fields', number: 3, labelAr: 'حقول الطلب والمراجعة', labelEn: 'Fields & Review' },
];

const getProviderProductSearchToken = (product) =>
    `${product?.name || ''} ${getProviderProductPriceValue(product) || ''}`.toLowerCase();

const getProviderProductPriceValue = (product) => (
    product?.rawPrice
    ?? product?.priceCoins
    ?? product?.basePriceCoins
    ?? product?.supplierPrice
    ?? ''
);

const getProviderProductMinQtyValue = (product) => (
    product?.minQty
    ?? product?.minimumOrderQty
    ?? product?.min
    ?? product?.minimumQty
    ?? ''
);

const getProviderProductMaxQtyValue = (product) => (
    product?.maxQty
    ?? product?.maximumOrderQty
    ?? product?.max
    ?? product?.maximumQty
    ?? ''
);

const getProviderProductIdentifiers = (product) => Array.from(new Set(
    [
        product?.id,
        product?.providerProductId,
        product?.externalProductId,
    ]
));
const hasMatchingProviderProduct = (product, ...selectedValues) => {
    const identifiers = getProviderProductIdentifiers(product);
    if (!identifiers.length) return false;

    return selectedValues
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .some((value) => identifiers.includes(value));
};

const normalizePriceInput = (value) => {
    const raw = String(value ?? '').trim().replace(/,/g, '.');
    if (!raw) return '';

    const sign = raw.startsWith('-') ? '-' : '';
    const unsigned = sign ? raw.slice(1) : raw;
    const [integerPartRaw = '0', ...fractionParts] = unsigned.split('.');
    const integerDigits = integerPartRaw.replace(/[^\d]/g, '') || '0';
    const fractionDigits = fractionParts.join('').replace(/[^\d]/g, '');
    return fractionDigits ? `${sign}${integerDigits}.${fractionDigits}` : `${sign}${integerDigits}`;
};

const formatExactDecimal = (value, language) => {
    const normalized = normalizePriceInput(value);
    if (!normalized) return '';

    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [integerPart = '0', fractionPart = ''] = unsigned.split('.');
    const formattedInteger = formatNumber(Number(integerPart || 0), language === 'en' ? 'en-US' : 'ar-EG', {
        maximumFractionDigits: 0,
    });

    return `${negative ? '-' : ''}${formattedInteger}${fractionPart ? `.${fractionPart}` : ''}`;
};

const countFractionDigits = (value) => {
    const normalized = normalizePriceInput(value);
    if (!normalized.includes('.')) return 0;
    return normalized.split('.')[1]?.length || 0;
};

/**
 * String-based decimal addition — preserves arbitrary precision.
 * Avoids Number() which truncates 50dp prices to ~17 significant digits.
 */
const addPriceValues = (baseValue, deltaValue) => {
    const a = normalizePriceInput(baseValue) || '0';
    const b = normalizePriceInput(deltaValue) || '0';

    const aNeg = a.startsWith('-');
    const bNeg = b.startsWith('-');
    const aAbs = aNeg ? a.slice(1) : a;
    const bAbs = bNeg ? b.slice(1) : b;

    const [aInt = '0', aFrac = ''] = aAbs.split('.');
    const [bInt = '0', bFrac = ''] = bAbs.split('.');

    const maxFrac = Math.max(aFrac.length, bFrac.length);
    const aPadded = aInt + aFrac.padEnd(maxFrac, '0');
    const bPadded = bInt + bFrac.padEnd(maxFrac, '0');

    const maxLen = Math.max(aPadded.length, bPadded.length);
    const aDigits = aPadded.padStart(maxLen, '0');
    const bDigits = bPadded.padStart(maxLen, '0');

    const insertDecimal = (raw) => {
        if (maxFrac <= 0) return raw;
        const intP = raw.slice(0, raw.length - maxFrac) || '0';
        const fracP = raw.slice(raw.length - maxFrac);
        let combined = `${intP}.${fracP}`;
        combined = combined.replace(/0+$/, '').replace(/\.$/, '');
        return combined;
    };

    if (aNeg === bNeg) {
        let carry = 0;
        const digits = [];
        for (let i = maxLen - 1; i >= 0; i--) {
            const s = Number(aDigits[i]) + Number(bDigits[i]) + carry;
            digits.unshift(s % 10);
            carry = Math.floor(s / 10);
        }
        if (carry) digits.unshift(carry);
        const str = insertDecimal(digits.join(''));
        return (aNeg && str !== '0' ? '-' : '') + str;
    }

    // Different signs: subtract smaller from larger
    let larger, smaller, resultNeg;
    if (aDigits.length !== bDigits.length ? aDigits.length > bDigits.length : aDigits >= bDigits) {
        larger = aDigits; smaller = bDigits; resultNeg = aNeg;
    } else {
        larger = bDigits; smaller = aDigits; resultNeg = bNeg;
    }

    let borrow = 0;
    const digits = [];
    for (let i = maxLen - 1; i >= 0; i--) {
        let d = Number(larger[i]) - Number(smaller[i]) - borrow;
        if (d < 0) { d += 10; borrow = 1; } else { borrow = 0; }
        digits.unshift(d);
    }

    let raw = digits.join('').replace(/^0+/, '') || '0';
    if (maxFrac > 0) raw = raw.padStart(maxFrac + 1, '0');
    const str = insertDecimal(raw);
    return (resultNeg && str !== '0' ? '-' : '') + str;
};

const parsePositiveQuantity = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildProviderSyncSnapshot = (product, options = {}) => {
    const fallbackMinQty = parsePositiveQuantity(options.fallbackMinQty, 1);
    const fallbackMaxQty = parsePositiveQuantity(options.fallbackMaxQty, Math.max(999, fallbackMinQty));
    const syncedProviderBasePrice = normalizePriceInput(options.rawPrice ?? getProviderProductPriceValue(product));
    const manualPriceAdjustment = normalizePriceInput(options.manualPriceAdjustment ?? '');
    const minimumOrderQty = parsePositiveQuantity(options.minQty ?? getProviderProductMinQtyValue(product), fallbackMinQty);
    const maximumOrderQty = Math.max(
        parsePositiveQuantity(options.maxQty ?? getProviderProductMaxQtyValue(product), fallbackMaxQty),
        minimumOrderQty
    );
    const basePriceCoins = syncedProviderBasePrice
        ? (options.enableManualPrice ? addPriceValues(syncedProviderBasePrice, manualPriceAdjustment) : syncedProviderBasePrice)
        : '';

    return {
        syncedProviderBasePrice,
        basePriceCoins,
        minimumOrderQty,
        maximumOrderQty,
        minQty: minimumOrderQty,
        maxQty: maximumOrderQty,
    };
};

const mergeProviderSyncIntoForm = (prev, supplierId, providerProductId, snapshot) => {
    const currentSupplierId = String(prev.supplierId || prev.providerId || '').trim();
    const currentProviderProductId = String(prev.providerProductId || prev.externalProductId || '').trim();

    if (
        currentSupplierId !== String(supplierId || '').trim()
        || currentProviderProductId !== String(providerProductId || '').trim()
    ) {
        return prev;
    }

    return { ...prev, ...snapshot };
};

const preserveManualProviderOverrides = (prev, snapshot) => {
    if (!prev.enableManualPrice) return snapshot;

    return {
        ...snapshot,
        basePriceCoins: prev.basePriceCoins || snapshot.basePriceCoins,
        minimumOrderQty: prev.minimumOrderQty,
        maximumOrderQty: prev.maximumOrderQty,
        minQty: prev.minimumOrderQty,
        maxQty: prev.maximumOrderQty,
    };
};

const usesProviderPricingMode = (value) => ['use_supplier_price', 'supplier_price_plus_margin'].includes(String(value || '').trim());

const formatProviderProductPrice = (value, language) => {
    const normalized = normalizePriceInput(value);
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount <= 0) {
        return '';
    }

    const formatted = formatExactDecimal(normalized, language);
    return language === 'en' ? `$${formatted} USD` : `${formatted} دولار`;
};

const DYNAMIC_FIELD_TYPES = ['text', 'number', 'email', 'select', 'image', 'file'];

const normalizeDynamicFieldType = (value) => {
    const normalized = String(value || 'text').trim().toLowerCase();
    return DYNAMIC_FIELD_TYPES.includes(normalized) ? normalized : 'text';
};

const createDynamicFieldRow = (seed = {}) => {
    const rowId = String(seed.id || `dynamic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    return {
        id: rowId,
        name: String(seed.name || seed.key || '').trim(),
        label: String(seed.label || seed.labelAr || '').trim(),
        type: normalizeDynamicFieldType(seed.type),
        required: seed.required !== false,
        isVerifiable: seed.isVerifiable === true,
    };
};

const extractDynamicFieldRows = (product = {}) => {
    const dynamicFields = Array.isArray(product?.dynamicFields) ? product.dynamicFields : [];
    if (dynamicFields.length > 0) {
        return dynamicFields.map((field, index) => createDynamicFieldRow({
            id: field?.name || field?.key || `dynamic-${index + 1}`,
            name: field?.name || field?.key || '',
            label: field?.label || field?.labelAr || field?.name || '',
            type: field?.type,
            required: field?.required,
            isVerifiable: field?.isVerifiable,
        }));
    }

    const legacyFields = Array.isArray(product?.orderFields) ? product.orderFields : [];
    return legacyFields
        .filter((field) => field?.enabled !== false)
        .map((field, index) => createDynamicFieldRow({
            id: field?.id || field?.name || field?.key || `dynamic-${index + 1}`,
            name: field?.name || field?.key || field?.id || '',
            label: field?.labelAr || field?.label || field?.name || field?.key || '',
            type: field?.type || 'text',
            required: field?.required,
            isVerifiable: field?.isVerifiable,
        }))
        .filter((field) => field.name && field.label);
};

const buildDynamicFieldsPayload = (fieldRows = []) => (
    Array.isArray(fieldRows) ? fieldRows : []
).map((row) => {
    const safeName = String(row?.name || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_');
    const label = String(row?.label || '').trim();
    return {
        name: safeName,
        label,
        type: normalizeDynamicFieldType(row?.type),
        required: row?.required !== false,
        isVerifiable: row?.isVerifiable === true,
    };
}).filter((field) => field.name && field.label);

const buildOrderFieldsPayloadFromDynamic = (dynamicFields = []) => (
    Array.isArray(dynamicFields) ? dynamicFields : []
).map((field) => ({
    key: field.name,
    name: field.name,
    id: field.name,
    label: field.label,
    labelAr: field.label,
    placeholder: '',
    placeholderAr: '',
    enabled: true,
    required: field.required !== false,
    isVerifiable: field.isVerifiable === true,
    type: normalizeDynamicFieldType(field.type),
}));

const AdminProducts = () => {
    const {
        products,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        toggleProductStatus,
        deleteProduct,
        loadProducts,
    } = useMediaStore();
    const { user } = useAuthStore();
    const { addToast } = useToast();
    const { t, language } = useLanguage();
    const isEnglish = language === 'en';

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [togglingProductId, setTogglingProductId] = useState(null);
    const [productToDelete, setProductToDelete] = useState(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        sortOrder: 0,
        image: '',
        parentCategory: '',
    });
    const [providers, setProviders] = useState([]);
    const [providerProducts, setProviderProducts] = useState([]);
    const [providerProductQuery, setProviderProductQuery] = useState('');
    const [providerProductsVisibleCount, setProviderProductsVisibleCount] = useState(PROVIDER_PRODUCTS_PAGE_SIZE);
    const [isSyncingPrice, setIsSyncingPrice] = useState(false);
    const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('');
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [productFormStep, setProductFormStep] = useState(PRODUCT_FORM_STEPS[0].id);
    const [productForm, setProductForm] = useState({
        name: '',
        nameAr: '',
        description: '',
        category: '',
        connectionType: 'auto',
        providerId: '',
        providerProductId: '',
        supplierId: '',
        externalProductId: '',
        externalProductName: '',
        autoFulfillmentEnabled: true,
        externalPricingMode: 'use_local_price',
        supplierMarginType: 'fixed',
        supplierMarginValue: 0,
        supplierFieldMappingsText: 'playerId:uid\nquantity:qty',
        syncPriceWithProvider: false,
        enableManualPrice: false,
        displayAccountNumber: '',
        purchaseAccountNumber: '',
        showPurchaseAccountNumber: false,
        manualPriceAdjustment: '',
        syncedProviderBasePrice: '',
        costPrice: '',
        originalPriceCoins: '',
        basePriceCoins: '',
        minQty: 1,
        maxQty: 999,
        displayOrder: 0,
        image: '',
        status: 'active',
        // =====================================================
        // إعدادات المنتج - Product Settings
        // =====================================================
        productStatus: 'available',
        isVisibleInStore: true,
        showWhenUnavailable: true,
        pauseSales: false,
        pauseReason: '',
        internalNotes: '',
        enableSchedule: false,
        scheduledStartAt: '',
        scheduledEndAt: '',
        scheduleVisibilityMode: 'hide',
        // =====================================================
        // حدود الطلب - Order Limits
        // =====================================================
        minimumOrderQty: 1,
        maximumOrderQty: 999,
        stepQty: 1,
        trackInventory: false,
        stockQuantity: 999,
        lowStockThreshold: 50,
        hideWhenOutOfStock: false,
        showOutOfStockLabel: true,
        dynamicFields: [],
    });

    const sortedAdminProducts = useMemo(() => (
        Array.isArray(products) ? [...products] : []
    ).sort((left, right) => {
        const orderDelta = Number(left?.displayOrder || 0) - Number(right?.displayOrder || 0);
        if (orderDelta !== 0) return orderDelta;
        return String(left?.name || '').localeCompare(String(right?.name || ''), isEnglish ? 'en' : 'ar');
    }), [products, isEnglish]);

    const sortedAdminCategories = useMemo(() => (
        Array.isArray(categories) ? [...categories] : []
    ).sort((left, right) => {
        const leftOrder = Number(left?.sortOrder ?? left?.displayOrder);
        const rightOrder = Number(right?.sortOrder ?? right?.displayOrder);
        const leftHas = Number.isFinite(leftOrder);
        const rightHas = Number.isFinite(rightOrder);

        if (leftHas && rightHas) {
            const delta = leftOrder - rightOrder;
            if (delta !== 0) return delta;
        } else if (leftHas && !rightHas) {
            return -1;
        } else if (!leftHas && rightHas) {
            return 1;
        }

        return String(left?.name || '').localeCompare(String(right?.name || ''), isEnglish ? 'en' : 'ar');
    }), [categories, isEnglish]);

    const mainAdminCategories = useMemo(() => (
        sortedAdminCategories.filter((category) => {
            const parentValue = String(category?.parentCategory ?? '').trim();
            return parentValue.length === 0;
        })
    ), [sortedAdminCategories]);

    const subAdminCategories = useMemo(() => (
        sortedAdminCategories.filter((category) => {
            const parentValue = String(category?.parentCategory ?? '').trim();
            return parentValue.length > 0;
        })
    ), [sortedAdminCategories]);

    const productFilterSubCategories = useMemo(() => {
        if (!selectedMainCategoryId) return subAdminCategories;
        return subAdminCategories.filter((category) => (
            String(category?.parentCategory || '').trim() === selectedMainCategoryId
        ));
    }, [selectedMainCategoryId, subAdminCategories]);

    const categoryNameById = useMemo(() => (
        new Map(sortedAdminCategories.map((category) => [
            String(category?.id || '').trim(),
            category?.name || category?.nameAr || category?.id || '-',
        ]))
    ), [sortedAdminCategories]);

    const filteredAdminProducts = useMemo(() => {
        const normalizedSearchQuery = String(productSearchQuery || '').trim().toLowerCase();
        const shouldFilterByCategory = Boolean(selectedMainCategoryId || selectedSubCategoryId);
        const selectedSubIds = shouldFilterByCategory
            ? new Set(
                subAdminCategories
                    .filter((category) => String(category?.parentCategory || '').trim() === selectedMainCategoryId)
                    .map((category) => String(category?.id || '').trim())
                    .filter(Boolean)
            )
            : new Set();

        return sortedAdminProducts.filter((product) => {
            const productCategory = String(product?.category || '').trim();
            if (shouldFilterByCategory) {
                if (!productCategory) return false;
                if (selectedSubCategoryId && productCategory !== selectedSubCategoryId) return false;
                if (
                    selectedMainCategoryId
                    && !selectedSubCategoryId
                    && productCategory !== selectedMainCategoryId
                    && !selectedSubIds.has(productCategory)
                ) {
                    return false;
                }
            }

            if (!normalizedSearchQuery) return true;

            const searchableText = [
                product?.name,
                product?.nameAr,
                product?.description,
                product?.id,
                product?.category,
                categoryNameById.get(productCategory),
                product?.externalProductName,
                product?.externalProductId,
                product?.providerProductId,
                product?.providerName,
                product?.supplierName,
            ].filter(Boolean).join(' ').toLowerCase();

            return searchableText.includes(normalizedSearchQuery);
        });
    }, [categoryNameById, productSearchQuery, selectedMainCategoryId, selectedSubCategoryId, sortedAdminProducts, subAdminCategories]);

    useEffect(() => {
        if (!selectedSubCategoryId) return;
        const selectedSubCategory = subAdminCategories.find((category) => (
            String(category?.id || '').trim() === selectedSubCategoryId
        ));
        if (!selectedSubCategory) {
            setSelectedSubCategoryId('');
            return;
        }
        if (
            selectedMainCategoryId
            && String(selectedSubCategory?.parentCategory || '').trim() !== selectedMainCategoryId
        ) {
            setSelectedSubCategoryId('');
        }
    }, [selectedMainCategoryId, selectedSubCategoryId, subAdminCategories]);

    useEffect(() => {
        loadProducts({ force: true, bypassCache: true });
    }, [loadProducts]);

    useEffect(() => {
        if (isProductModalOpen && !productForm.category && categories.length > 0) {
            setProductForm((prev) => ({ ...prev, category: categories[0].id }));
        }
    }, [isProductModalOpen, categories, productForm.category]);

    useEffect(() => {
        let isMounted = true;

        apiClient.suppliers
            .list()
            .then((data) => {
                if (!isMounted) return;

                setProviders(Array.isArray(data) ? data.map((supplier) => ({
                    id: supplier.id,
                    name: supplier.supplierName || supplier.name || supplier.id,
                    isActive: supplier.isActive !== false,
                })) : []);
            })
            .catch(() => {
                if (!isMounted) return;
                setProviders([]);
                addToast('فشل تحميل المزودين', 'error');
            });

        return () => {
            isMounted = false;
        };
    }, [isProductModalOpen, addToast]);

    useEffect(() => {
        const selectedSupplier = productForm.supplierId || productForm.providerId;
        if (!isProductModalOpen || !selectedSupplier) {
            setProviderProducts([]);
            return;
        }
        apiClient.products
            .listProviderProducts(selectedSupplier, { limit: PROVIDER_PRODUCTS_LIMIT })
            .then((items) => {
                const nextItems = Array.isArray(items) ? items : [];
                setProviderProducts(nextItems);
                // If the currently selected product ID is not in the new list, reset it
                setProductForm((prev) => {
                    const currentPPId = prev.providerProductId || prev.externalProductId;
                    if (currentPPId && !nextItems.some((p) => hasMatchingProviderProduct(p, prev.providerProductId, prev.externalProductId))) {
                        return { ...prev, externalProductId: '', providerProductId: '', externalProductName: '' };
                    }
                    return prev;
                });
            })
            .catch(() => {
                setProviderProducts([]);
                addToast('فشل تحميل منتجات المزود', 'error');
            });
        // Fix 4: Only re-fetch when the provider ID changes or the modal opens/closes.
        // providerProductId/externalProductId are removed to prevent race conditions
        // when they are cleared by the provider onChange handler.
    }, [isProductModalOpen, productForm.providerId, productForm.supplierId, addToast]);

    useEffect(() => {
        setProviderProductQuery('');
    }, [isProductModalOpen, productForm.providerId, productForm.supplierId]);

    const selectedSupplierId = productForm.supplierId || productForm.providerId;
    const selectedProviderProductId = productForm.providerProductId || productForm.externalProductId;
    const hasSyncedProviderLink = Boolean(productForm.syncPriceWithProvider && selectedSupplierId && selectedProviderProductId);
    const canSyncWithProvider = Boolean(hasSyncedProviderLink && !productForm.enableManualPrice);

    useEffect(() => {
        setProviderProductsVisibleCount(PROVIDER_PRODUCTS_PAGE_SIZE);
    }, [isProductModalOpen, selectedSupplierId, providerProductQuery]);

    const selectedProviderProduct = useMemo(
        () => providerProducts.find((product) => hasMatchingProviderProduct(
            product,
            productForm.providerProductId,
            productForm.externalProductId
        )) || null,
        [productForm.externalProductId, productForm.providerProductId, providerProducts]
    );
    const filteredProviderProducts = useMemo(() => {
        const normalizedQuery = String(providerProductQuery || '').trim().toLowerCase();
        if (!normalizedQuery) {
            return providerProducts;
        }

        return providerProducts.filter((product) => getProviderProductSearchToken(product).includes(normalizedQuery));
    }, [providerProducts, providerProductQuery]);
    const visibleProviderProducts = useMemo(
        () => filteredProviderProducts.slice(0, providerProductsVisibleCount),
        [filteredProviderProducts, providerProductsVisibleCount]
    );
    const activeProviders = useMemo(
        () => providers.filter((provider) => provider.isActive !== false),
        [providers]
    );
    const providerNamesById = useMemo(
        () => new Map(providers.map((provider) => [String(provider.id || '').trim(), provider.name])),
        [providers]
    );

    const getProviderDisplayName = (product) => {
        const providerId = String(product?.providerId || product?.supplierId || '').trim();
        if (!providerId) return '-';

        return (
            String(product?.providerName || product?.supplierName || '').trim()
            || providerNamesById.get(providerId)
            || providerId
        );
    };

    const expectedProfitValue = useMemo(() => {
        if (productForm.connectionType !== 'manual') return null;
        const sellingPrice = Number(normalizePriceInput(productForm.basePriceCoins) || 0);
        const costPrice = Number(normalizePriceInput(productForm.costPrice) || 0);
        if (!Number.isFinite(sellingPrice) || !Number.isFinite(costPrice)) return null;
        return sellingPrice - costPrice;
    }, [productForm.basePriceCoins, productForm.connectionType, productForm.costPrice]);

    const syncProviderPrice = async (manualOverride, supplierIdOverride, providerProductIdOverride) => {
        const supplierId = supplierIdOverride || productForm.supplierId || productForm.providerId;
        const providerProductId = providerProductIdOverride || productForm.providerProductId || productForm.externalProductId;
        if (!supplierId || !providerProductId) return;
        const fallbackProviderProduct = selectedProviderProduct
            || providerProducts.find((product) => hasMatchingProviderProduct(product, providerProductId));

        // Fix 3: Extract only primitive values — never spread the live catalogue
        // object to prevent accidental mutation of the providerProducts array.
        const fallbackSnapshot = fallbackProviderProduct ? {
            rawPrice: getProviderProductPriceValue(fallbackProviderProduct),
            minQty: getProviderProductMinQtyValue(fallbackProviderProduct),
            maxQty: getProviderProductMaxQtyValue(fallbackProviderProduct),
        } : null;

        if (fallbackSnapshot) {
            setProductForm((prev) => mergeProviderSyncIntoForm(
                prev,
                supplierId,
                providerProductId,
                preserveManualProviderOverrides(
                    prev,
                    buildProviderSyncSnapshot(fallbackSnapshot, {
                        enableManualPrice: prev.enableManualPrice,
                        manualPriceAdjustment: manualOverride ?? prev.manualPriceAdjustment,
                        fallbackMinQty: prev.minimumOrderQty,
                        fallbackMaxQty: prev.maximumOrderQty,
                    })
                )
            ));
        }
        try {
            setIsSyncingPrice(true);
            const synced = await apiClient.products.getSyncedPrice(supplierId, providerProductId);
            // Fix 3: Merge synced data into a new isolated object with only
            // the primitive fields we need — never spreading the catalogue reference.
            const syncSource = {
                rawPrice: synced?.rawPrice ?? fallbackSnapshot?.rawPrice,
                minQty: synced?.minQty ?? fallbackSnapshot?.minQty,
                maxQty: synced?.maxQty ?? fallbackSnapshot?.maxQty,
            };
            setProductForm((prev) => mergeProviderSyncIntoForm(
                prev,
                supplierId,
                providerProductId,
                preserveManualProviderOverrides(
                    prev,
                    buildProviderSyncSnapshot(syncSource, {
                        enableManualPrice: prev.enableManualPrice,
                        manualPriceAdjustment: manualOverride ?? prev.manualPriceAdjustment,
                        fallbackMinQty: prev.minimumOrderQty,
                        fallbackMaxQty: prev.maximumOrderQty,
                    })
                )
            ));
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                isEnglish
                    ? 'Could not sync supplier price. Check the selected supplier product, then retry.'
                    : 'تعذرت مزامنة سعر المورد: تأكد من المنتج المختار من المزود ثم أعد المحاولة.'
            ), 'error');
        } finally {
            setIsSyncingPrice(false);
        }
    };

    useEffect(() => {
        if (!isProductModalOpen || !productForm.syncPriceWithProvider || !selectedSupplierId || !selectedProviderProductId) {
            return;
        }

        void syncProviderPrice(undefined, selectedSupplierId, selectedProviderProductId);
    }, [isProductModalOpen, productForm.syncPriceWithProvider, selectedSupplierId, selectedProviderProductId, selectedProviderProduct]);

    const handleProviderProductSelect = (value) => {
        const selected = providerProducts.find((product) => hasMatchingProviderProduct(product, value));
        // Fix 2: Extract only primitives from the catalogue item to prevent
        // any accidental mutation of the source providerProducts array.
        const selectedSnapshot = selected ? {
            rawPrice: getProviderProductPriceValue(selected),
            minQty: getProviderProductMinQtyValue(selected),
            maxQty: getProviderProductMaxQtyValue(selected),
        } : null;
        setProductForm((prev) => ({
            ...prev,
            externalProductId: String(selected?.externalProductId || value).trim(),
            providerProductId: value,
            externalProductName: selected?.name || '',
            ...(prev.syncPriceWithProvider && selectedSnapshot
                ? buildProviderSyncSnapshot(selectedSnapshot, {
                    enableManualPrice: prev.enableManualPrice,
                    manualPriceAdjustment: prev.manualPriceAdjustment,
                    fallbackMinQty: prev.minimumOrderQty,
                    fallbackMaxQty: prev.maximumOrderQty,
                })
                : {}),
        }));
    };

    const parseSupplierMappings = (text) => String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [internalField, externalField] = line.split(':').map((v) => String(v || '').trim());
            return { internalField, externalField };
        })
        .filter((m) => m.internalField && m.externalField);

    const getReadableErrorMessage = (error, fallback) => {
        const rawMessage = String(error?.response?.data?.message || error?.message || '').trim();
        const status = error?.response?.status;
        const normalized = rawMessage.toLowerCase();

        if (status === 401 || normalized.includes('unauthorized') || normalized.includes('token')) {
            return isEnglish
                ? 'Your session expired. Sign in again, then retry the action.'
                : 'انتهت الجلسة: سجّل الدخول مرة أخرى ثم أعد المحاولة.';
        }

        if (status === 403 || normalized.includes('forbidden') || normalized.includes('permission')) {
            return isEnglish
                ? 'You do not have permission to complete this action.'
                : 'ليست لديك صلاحية لتنفيذ هذا الإجراء. راجع صلاحيات الحساب.';
        }

        if (status === 404 || normalized.includes('not found')) {
            return isEnglish
                ? 'The item was not found. Refresh the page and try again.'
                : 'العنصر غير موجود أو تم حذفه. حدّث الصفحة ثم حاول مرة أخرى.';
        }

        if (status >= 500 || normalized.includes('network') || normalized.includes('timeout')) {
            return isEnglish
                ? 'Connection or server issue. Check the backend connection and try again.'
                : 'مشكلة اتصال أو خادم: تأكد من اتصال الباك إند ثم حاول مرة أخرى.';
        }

        return rawMessage || fallback;
    };

    const handleImageUpload = async (e, setForm, uploadCategory = 'products') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            addToast(isEnglish ? 'Image is too large: upload an image under 20MB.' : 'الصورة كبيرة جدًا: ارفع صورة أقل من 20 ميجابايت.', 'error');
            return;
        }
        try {
            const path = await uploadImage(uploadCategory, file);
            setForm((prev) => ({ ...prev, image: path }));
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                isEnglish
                    ? 'Image upload failed. Check the image format and try again.'
                    : 'تعذر رفع الصورة: تأكد من صيغة الصورة وحاول مرة أخرى.'
            ), 'error');
        }
    };

    const openProductModal = (product = null) => {
        setProductFormStep(PRODUCT_FORM_STEPS[0].id);
        setProviderProductsVisibleCount(PROVIDER_PRODUCTS_PAGE_SIZE);
        if (product) {
            const linkedProviderId = String(product.providerId || product.supplierId || '').trim();
            const linkedProviderProductId = String(product.providerProductId || product.externalProductId || '').trim();
            const hasLinkedProvider = Boolean(linkedProviderId && linkedProviderProductId);
            const shouldSyncWithProvider = hasLinkedProvider && (
                Boolean(product.syncPriceWithProvider)
                || usesProviderPricingMode(product.externalPricingMode)
            );
            setEditingProduct(product);
            setProductForm({
                name: product.name || '',
                nameAr: product.nameAr || '',
                description: product.description || '',
                category: product.category || categories[0]?.id || '',
                connectionType: product.autoFulfillmentEnabled === false ? 'manual' : 'auto',
                providerId: linkedProviderId,
                providerProductId: linkedProviderProductId,
                supplierId: linkedProviderId,
                externalProductId: String(product.externalProductId || product.providerProductId || linkedProviderProductId).trim(),
                externalProductName: product.externalProductName || '',
                autoFulfillmentEnabled: product.autoFulfillmentEnabled !== false,
                supplierMarginType: product.supplierMarginType || 'fixed',
                supplierMarginValue: product.supplierMarginValue ?? 0,
                supplierFieldMappingsText: Array.isArray(product.supplierFieldMappings) ? product.supplierFieldMappings.map((m) => `${m.internalField}:${m.externalField}`).join('\n') : 'playerId:uid\nquantity:qty',
                syncPriceWithProvider: shouldSyncWithProvider,
                externalPricingMode: product.externalPricingMode || (shouldSyncWithProvider ? 'use_supplier_price' : 'use_local_price'),
                enableManualPrice: Number(product.manualPriceAdjustment || 0) !== 0,
                displayAccountNumber: String(product.displayAccountNumber || product.purchaseAccountNumber || product.accountNumber || product.productAccountNumber || '').trim(),
                purchaseAccountNumber: String(product.displayAccountNumber || product.purchaseAccountNumber || product.accountNumber || product.productAccountNumber || '').trim(),
                showPurchaseAccountNumber: Boolean(product.showPurchaseAccountNumber ?? product.showAccountNumber ?? product.displayAccountNumber ?? false),
                manualPriceAdjustment: normalizePriceInput(product.manualPriceAdjustment ?? ''),
                syncedProviderBasePrice: normalizePriceInput(product.syncedProviderBasePrice ?? product.basePriceCoins ?? ''),
                costPrice: normalizePriceInput(product.costPrice ?? product.originalPriceCoins ?? product.originalPrice ?? ''),
                originalPriceCoins: normalizePriceInput(product.originalPriceCoins ?? product.originalPrice ?? product.costPrice ?? ''),
                basePriceCoins: normalizePriceInput(product.basePriceCoins ?? ''),
                minQty: product.minQty ?? 1,
                maxQty: product.maxQty ?? 999,
                displayOrder: product.displayOrder ?? 0,
                image: product.image || '',
                status: product.status || 'active',
                productStatus: String(product.productStatus || '').trim().toLowerCase() === 'unavailable' ? 'unavailable' : 'available',
                isVisibleInStore: product.isVisibleInStore !== false,
                showWhenUnavailable: product.showWhenUnavailable !== undefined
                    ? Boolean(product.showWhenUnavailable)
                    : String(product.productStatus || '').trim().toLowerCase() === 'unavailable',
                pauseSales: Boolean(product.pauseSales),
                pauseReason: product.pauseReason || '',
                internalNotes: product.internalNotes || '',
                enableSchedule: false,
                scheduledStartAt: '',
                scheduledEndAt: '',
                scheduleVisibilityMode: 'hide',
                minimumOrderQty: product.minimumOrderQty ?? 1,
                maximumOrderQty: product.maximumOrderQty ?? 999,
                stepQty: product.stepQty ?? 1,
                trackInventory: false,
                stockQuantity: 999,
                lowStockThreshold: 50,
                hideWhenOutOfStock: false,
                showOutOfStockLabel: true,
                dynamicFields: extractDynamicFieldRows(product),
            });
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '',
                nameAr: '',
                description: '',
                category: categories[0]?.id || '',
                connectionType: 'auto',
                providerId: '',
                providerProductId: '',
                supplierId: '',
                externalProductId: '',
                externalProductName: '',
                autoFulfillmentEnabled: true,
                externalPricingMode: 'use_local_price',
                supplierMarginType: 'fixed',
                supplierMarginValue: 0,
                supplierFieldMappingsText: 'playerId:uid\nquantity:qty',
                syncPriceWithProvider: false,
                enableManualPrice: false,
                displayAccountNumber: '',
                purchaseAccountNumber: '',
                showPurchaseAccountNumber: false,
                manualPriceAdjustment: '',
                syncedProviderBasePrice: '',
                costPrice: '',
                originalPriceCoins: '',
                basePriceCoins: '',
                minQty: 1,
                maxQty: 999,
                displayOrder: 0,
                image: '',
                status: 'active',
                productStatus: 'available',
                isVisibleInStore: true,
                showWhenUnavailable: true,
                pauseSales: false,
                pauseReason: '',
                internalNotes: '',
                enableSchedule: false,
                scheduledStartAt: '',
                scheduledEndAt: '',
                scheduleVisibilityMode: 'hide',
                minimumOrderQty: 1,
                maximumOrderQty: 999,
                stepQty: 1,
                trackInventory: false,
                stockQuantity: 999,
                lowStockThreshold: 50,
                hideWhenOutOfStock: false,
                showOutOfStockLabel: true,
                dynamicFields: [],
            });
        }
        setIsProductModalOpen(true);
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();

        if (isSavingProduct) return;

        // validation شامل
        const validationErrors = validateProductForm(productForm, { requireImage: !editingProduct });
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => addToast(error, 'error'));
            return;
        }

        const isAutomaticConnection = productForm.connectionType !== 'manual';
        const selectedSupplierId = isAutomaticConnection ? String(productForm.supplierId || productForm.providerId || '').trim() : '';
        const selectedProviderProductId = isAutomaticConnection ? String(productForm.providerProductId || productForm.externalProductId || '').trim() : '';
        const selectedExternalProductId = isAutomaticConnection ? String(productForm.externalProductId || productForm.providerProductId || '').trim() : '';
        const hasProviderLink = Boolean(selectedSupplierId && selectedProviderProductId);
        const shouldSyncWithProvider = Boolean(isAutomaticConnection && productForm.syncPriceWithProvider && hasProviderLink);
        const resolvedExternalPricingMode = shouldSyncWithProvider
            ? (usesProviderPricingMode(productForm.externalPricingMode) ? productForm.externalPricingMode : 'use_supplier_price')
            : (usesProviderPricingMode(productForm.externalPricingMode) ? 'use_local_price' : productForm.externalPricingMode);
        const fallbackName = String(productForm.name || productForm.nameAr || '').trim();
        const fallbackCategory = String(productForm.category || categories[0]?.id || '').trim();
        const productImage = String(productForm.image || editingProduct?.image || '').trim();

        if (isAutomaticConnection && !selectedSupplierId) {
            addToast(isEnglish
                ? 'Supplier is required: choose the provider that will fulfill this automatic product.'
                : 'المورد مطلوب: اختر المزود الذي سينفذ هذا المنتج الآلي.',
            'error');
            return;
        }

        if (isAutomaticConnection && !selectedProviderProductId) {
            addToast(isEnglish
                ? 'Supplier product is required: choose the matching product from the selected provider.'
                : 'منتج المورد مطلوب: اختر المنتج المطابق من قائمة المزود المختار.',
            'error');
            return;
        }

        let minQty = Number(productForm.minimumOrderQty === '' || productForm.minimumOrderQty == null ? 1 : productForm.minimumOrderQty);
        let maxQty = Number(productForm.maximumOrderQty === '' || productForm.maximumOrderQty == null ? 999 : productForm.maximumOrderQty);
        const stepQty = Number(productForm.stepQty === '' || productForm.stepQty == null ? 1 : productForm.stepQty);

        let basePriceCoinsValue = normalizePriceInput(productForm.basePriceCoins);
        let basePriceCoins = Number(basePriceCoinsValue || 0);
        let syncedProviderBasePrice = null;
        let manualPriceAdjustmentRaw = normalizePriceInput(productForm.manualPriceAdjustment);
        let manualPriceAdjustment = productForm.enableManualPrice ? Number(manualPriceAdjustmentRaw || 0) : 0;

        if (shouldSyncWithProvider) {
            try {
                const synced = await apiClient.products.getSyncedPrice(selectedSupplierId, selectedProviderProductId);
                const syncedSnapshot = buildProviderSyncSnapshot(
                    { ...(selectedProviderProduct || {}), ...(synced || {}) },
                    {
                        enableManualPrice: productForm.enableManualPrice,
                        manualPriceAdjustment: manualPriceAdjustmentRaw,
                        fallbackMinQty: minQty,
                        fallbackMaxQty: maxQty,
                    }
                );
                const syncedProviderBasePriceValue = normalizePriceInput(syncedSnapshot.syncedProviderBasePrice || '');
                syncedProviderBasePrice = Number(syncedProviderBasePriceValue || 0);

                if (productForm.enableManualPrice) {
                    manualPriceAdjustmentRaw = syncedProviderBasePriceValue
                        ? addPriceValues(basePriceCoinsValue, `-${syncedProviderBasePriceValue}`)
                        : manualPriceAdjustmentRaw;
                    manualPriceAdjustment = Number(manualPriceAdjustmentRaw || 0);
                    setProductForm((prev) => ({
                        ...prev,
                        syncedProviderBasePrice: syncedProviderBasePriceValue,
                        manualPriceAdjustment: manualPriceAdjustmentRaw,
                    }));
                } else {
                    basePriceCoinsValue = syncedSnapshot.basePriceCoins;
                    basePriceCoins = Number(normalizePriceInput(basePriceCoinsValue) || 0);
                    minQty = syncedSnapshot.minimumOrderQty;
                    maxQty = syncedSnapshot.maximumOrderQty;
                    setProductForm((prev) => ({ ...prev, ...syncedSnapshot }));
                }
            } catch (error) {
                addToast(getReadableErrorMessage(
                    error,
                    isEnglish
                        ? 'Could not refresh supplier price before saving. Check the provider product link.'
                        : 'تعذرت مزامنة السعر قبل الحفظ: تأكد من اختيار المورد والمنتج الصحيحين.'
                ), 'error');
                return;
            }
        }

        if (Number.isNaN(basePriceCoins) || basePriceCoins <= 0) {
            addToast(isEnglish
                ? 'Final price is required: enter a number greater than zero.'
                : 'السعر النهائي غير صحيح: أدخل رقمًا أكبر من صفر.',
            'error');
            return;
        }

        const normalizedProductStatus = String(productForm.status || '').trim().toLowerCase();
        const showProduct = true;
        const availabilityStatus = normalizedProductStatus === 'inactive'
            || String(productForm.productStatus || '').trim().toLowerCase() === 'unavailable'
            ? 'unavailable'
            : 'available';
        const dynamicFieldsPayload = buildDynamicFieldsPayload(productForm.dynamicFields || []);
        const orderFieldsPayload = buildOrderFieldsPayloadFromDynamic(dynamicFieldsPayload);

        const payload = {
            // معلومات أساسية
            name: fallbackName,
            nameAr: String(productForm.nameAr || productForm.name || '').trim(),
            description: productForm.description,
            descriptionAr: '',
            category: fallbackCategory,
            image: productImage,
            status: productForm.status,
            displayOrder: Number(productForm.displayOrder || 0),
            
            // التسعير والمورد
            providerId: selectedSupplierId,
            providerProductId: selectedProviderProductId,
            supplierId: selectedSupplierId,
            externalProductId: selectedExternalProductId,
            externalProductName: String(productForm.externalProductName || '').trim(),
            autoFulfillmentEnabled: isAutomaticConnection,
            supplierFieldMappings: parseSupplierMappings(productForm.supplierFieldMappingsText),
            externalPricingMode: String(resolvedExternalPricingMode || 'use_local_price'),
            supplierMarginType: String(productForm.supplierMarginType || 'fixed'),
            supplierMarginValue: Number(productForm.supplierMarginValue || 0),
            fallbackSupplierId: '',
            supplierNotes: '',
            orderFields: orderFieldsPayload,
            dynamicFields: dynamicFieldsPayload,
            syncPriceWithProvider: shouldSyncWithProvider,
            enableManualPrice: productForm.enableManualPrice,
            displayAccountNumber: String(productForm.displayAccountNumber || productForm.purchaseAccountNumber || '').trim(),
            purchaseAccountNumber: String(productForm.displayAccountNumber || productForm.purchaseAccountNumber || '').trim(),
            accountNumber: String(productForm.displayAccountNumber || productForm.purchaseAccountNumber || '').trim(),
            showPurchaseAccountNumber: Boolean(productForm.showPurchaseAccountNumber),
            showAccountNumber: Boolean(productForm.showPurchaseAccountNumber),
            manualPriceAdjustment,
            syncedProviderBasePrice,
            originalPriceCoins: isAutomaticConnection ? '' : normalizePriceInput(productForm.originalPriceCoins),
            originalPrice: isAutomaticConnection ? '' : normalizePriceInput(productForm.originalPriceCoins),
            costPrice: isAutomaticConnection ? '' : normalizePriceInput(productForm.originalPriceCoins),
            basePriceCoins: basePriceCoinsValue || String(basePriceCoins),
            
            // الكميات والحدود
            minimumOrderQty: minQty,
            maximumOrderQty: maxQty,
            stepQty,
            minQty: minQty,
            maxQty: maxQty,
            providerQuantity: maxQty,
            
            // إعدادات المنتج
            productStatus: availabilityStatus,
            isVisibleInStore: showProduct,
            showWhenUnavailable: showProduct && availabilityStatus === 'unavailable',
            pauseSales: productForm.pauseSales,
            pauseReason: productForm.pauseReason,
            internalNotes: productForm.internalNotes,
            
            enableSchedule: false,
            scheduledStartAt: null,
            scheduledEndAt: null,
            scheduleVisibilityMode: 'hide',
            trackInventory: false,
            stockQuantity: 999,
            lowStockThreshold: 0,
            hideWhenOutOfStock: false,
            showOutOfStockLabel: true,
        };

        setIsSavingProduct(true);

        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, payload);
            } else {
                await addProduct(payload);
            }

            setIsProductModalOpen(false);
            addToast(
                editingProduct
                    ? (t('productUpdated') || 'تم تحديث المنتج')
                    : (t('productAdded') || 'تمت إضافة المنتج'),
                'success'
            );

            void loadProducts({ force: true, bypassCache: true });
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                editingProduct
                    ? (isEnglish ? 'Could not update the product. Review the fields and try again.' : 'تعذر تحديث المنتج: راجع البيانات المطلوبة ثم حاول مرة أخرى.')
                    : (isEnglish ? 'Could not add the product. Review the fields and try again.' : 'تعذر إضافة المنتج: راجع البيانات المطلوبة ثم حاول مرة أخرى.')
            ), 'error');
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleToggleProductStatus = async (product) => {
        const isCurrentlyActive = product.status === 'active';
        const actionLabel = isCurrentlyActive
            ? (isEnglish ? 'deactivate' : 'إيقاف')
            : (isEnglish ? 'activate' : 'تفعيل');

        try {
            setTogglingProductId(product.id);
            const updatedProduct = await toggleProductStatus(product.id);
            addToast(
                updatedProduct?.status === 'active'
                    ? (isEnglish ? 'Product activated successfully' : 'تم تفعيل المنتج بنجاح')
                    : (isEnglish ? 'Product deactivated successfully' : 'تم إيقاف المنتج بنجاح'),
                'success'
            );
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                isEnglish
                    ? `Could not ${actionLabel} product. Refresh the list and try again.`
                    : `تعذر ${actionLabel} المنتج: حدّث القائمة ثم حاول مرة أخرى.`
            ), 'error');
        } finally {
            setTogglingProductId((currentId) => (currentId === product.id ? null : currentId));
        }
    };

    const openCategoryModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({
                name: String(category?.name || ''),
                sortOrder: Number(category?.sortOrder ?? category?.displayOrder ?? 0),
                image: String(category?.image || ''),
                parentCategory: String(category?.parentCategory || ''),
            });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', sortOrder: 0, image: '', parentCategory: '' });
        }
        setIsCategoryModalOpen(true);
    };

    const handleCategorySubmit = async (event) => {
        event.preventDefault();

        const name = String(categoryForm.name || '').trim();
        const sortOrder = Number(categoryForm.sortOrder ?? 0);
        const safeSortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;

        if (!name) {
            addToast(isEnglish ? 'Category name is required: write the name shown in the catalog list.' : 'اسم القسم مطلوب: اكتب الاسم الذي سيظهر في قائمة الكتالوجات.', 'error');
            return;
        }

        setIsSavingCategory(true);
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, {
                    name,
                    nameAr: '',
                    sortOrder: safeSortOrder,
                    image: categoryForm.image || '',
                    parentCategory: categoryForm.parentCategory || null,
                });
                addToast(isEnglish ? 'Category updated' : 'تم تحديث القسم', 'success');
            } else {
                await addCategory({
                    name,
                    nameAr: '',
                    sortOrder: safeSortOrder,
                    image: categoryForm.image || '',
                    parentCategory: categoryForm.parentCategory || null,
                });
                addToast(isEnglish ? 'Category added' : 'تمت إضافة القسم', 'success');
            }

            setIsCategoryModalOpen(false);
            setEditingCategory(null);
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                isEnglish
                    ? 'Could not save category. Check the name/image and try again.'
                    : 'تعذر حفظ القسم: راجع الاسم أو الصورة ثم حاول مرة أخرى.'
            ), 'error');
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (category) => {
        if (!category) return;
        setCategoryToDelete(category);
    };

    const handleDeleteProduct = (product) => {
        if (!product) return;
        setProductToDelete(product);
    };

    const confirmDeleteProduct = async () => {
        const product = productToDelete;
        if (!product) return;
        try {
            await deleteProduct(product.id);
            setProductToDelete(null);
            addToast(isEnglish ? 'Product deleted' : 'تم حذف المنتج', 'success');
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                isEnglish
                    ? 'Could not delete product. Refresh the page and try again.'
                    : 'تعذر حذف المنتج: حدّث الصفحة ثم حاول مرة أخرى.'
            ), 'error');
        }
    };

    const confirmDeleteCategory = async () => {
        const category = categoryToDelete;
        if (!category) return;
        try {
            await deleteCategory(category.id);
            setCategoryToDelete(null);
            addToast(isEnglish ? 'Category deleted' : 'تم حذف القسم', 'success');
        } catch (error) {
            addToast(getReadableErrorMessage(
                error,
                isEnglish
                    ? 'Could not delete category. It may contain products or has already been removed.'
                    : 'تعذر حذف القسم: قد يكون مرتبطًا بمنتجات أو تم حذفه بالفعل.'
            ), 'error');
        }
    };

    const getProductPrimaryName = (product) => {
        const localizedName = isEnglish ? product?.name : (product?.nameAr || product?.name);
        return String(localizedName || product?.name || product?.nameAr || product?.externalProductName || '-').trim();
    };

    const getProductSecondaryText = (product) => {
        const primaryName = getProductPrimaryName(product);
        const localizedFallback = String((isEnglish ? product?.nameAr : product?.name) || '').trim();
        if (localizedFallback && localizedFallback !== primaryName) return localizedFallback;

        const externalId = String(product?.externalProductId || product?.providerProductId || product?.id || '').trim();
        return externalId ? `#${externalId}` : '';
    };

    const getProductCategoryLabel = (product) => {
        const categoryId = String(product?.category || '').trim();
        return categoryNameById.get(categoryId) || categoryId || '-';
    };

    const getProductPriceLabel = (product) => {
        const formattedPrice = formatExactDecimal(product?.basePriceCoins, language);
        return formattedPrice || String(product?.basePriceCoins ?? '').trim() || '-';
    };

    const getIsProductUnavailable = (product) => (
        String(product?.productStatus || 'available').trim().toLowerCase() === 'unavailable'
    );

    const getIsProductHidden = (product) => product?.isVisibleInStore === false;

    const getProductAvailabilityLabel = (product) => (
        getIsProductUnavailable(product)
            ? (isEnglish ? 'Unavailable' : 'غير متوفر')
            : (isEnglish ? 'Available' : 'متوفر')
    );

    const getProductVisibilityLabel = (product) => (
        getIsProductHidden(product)
            ? (isEnglish ? 'Hidden' : 'مخفي')
            : (isEnglish ? 'Shown' : 'ظاهر')
    );

    const getProductStatusLabel = (product) => {
        const status = String(product?.status || '').trim();
        if (status === 'active') return isEnglish ? 'Active' : 'نشط';
        if (status === 'inactive') return isEnglish ? 'Inactive' : 'متوقف';
        return status || '-';
    };

    const renderProductImage = (product, className = 'h-11 w-11') => {
        const isUnavailable = getIsProductUnavailable(product);
        const isHidden = getIsProductHidden(product);
        const productName = getProductPrimaryName(product);

        return (
            <div className={`relative shrink-0 overflow-hidden rounded-xl border border-[color:rgb(var(--color-border-rgb)/0.72)] bg-[color:rgb(var(--color-surface-rgb)/0.72)] ${className}`}>
                {product?.image ? (
                    <img
                        src={resolveImageUrl(product.image)}
                        alt={productName}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className={`h-full w-full object-cover ${isUnavailable || isHidden ? 'brightness-[0.94] saturate-[0.9]' : ''}`}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--color-primary)]">
                        <Package className="h-5 w-5" />
                    </div>
                )}
                {isUnavailable || isHidden ? (
                    <span className="absolute inset-x-1 bottom-1 truncate rounded-md border border-amber-200/50 bg-[linear-gradient(180deg,rgb(255_255_255/0.86),rgb(255_248_226/0.82))] px-1 py-0.5 text-center text-[8px] font-bold leading-none text-amber-800 shadow-[0_8px_14px_-12px_rgb(15_23_42/0.38)] dark:border-violet-200/24 dark:bg-[linear-gradient(180deg,rgb(15_23_42/0.72),rgb(124_58_237/0.42))] dark:text-violet-50">
                        {isHidden ? (isEnglish ? 'Hidden' : 'مخفي') : (isEnglish ? 'Unavailable' : 'غير متوفر')}
                    </span>
                ) : null}
            </div>
        );
    };

    const renderProductActions = (product, isMobile = false) => {
        const isActive = product.status === 'active';
        const toggleLabel = isActive
            ? (isEnglish ? 'Deactivate' : 'إيقاف')
            : (isEnglish ? 'Activate' : 'تفعيل');
        const actionButtonClassName = isMobile
            ? 'h-7 min-w-0 gap-1 rounded-md px-1 text-[9px] sm:h-9 sm:rounded-lg sm:px-2 sm:text-xs'
            : 'h-9 rounded-lg px-2.5 text-xs';
        const actionIconClassName = isMobile ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-4 w-4';

        return (
            <div className={isMobile ? 'grid grid-cols-3 gap-1 sm:gap-2' : 'flex justify-end gap-1.5'}>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${actionButtonClassName} ${isActive
                        ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-500/10'
                        : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-500/10'}`}
                    onClick={() => handleToggleProductStatus(product)}
                    disabled={togglingProductId === product.id}
                    title={isActive
                        ? (isEnglish ? 'Deactivate product' : 'إيقاف المنتج')
                        : (isEnglish ? 'Activate product' : 'تفعيل المنتج')}
                >
                    {togglingProductId === product.id ? (
                        <RefreshCw className={`${actionIconClassName} animate-spin`} />
                    ) : (
                        <>
                            <Power className={actionIconClassName} />
                            <span className={isMobile ? 'truncate' : 'hidden 2xl:inline'}>{toggleLabel}</span>
                        </>
                    )}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${actionButtonClassName} ${isMobile ? '' : 'w-9 px-0'}`}
                    onClick={() => openProductModal(product)}
                    title={isEnglish ? 'Edit product' : 'تعديل المنتج'}
                >
                    <Edit className={actionIconClassName} />
                    {isMobile ? <span className="truncate">{isEnglish ? 'Edit' : 'تعديل'}</span> : null}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`${actionButtonClassName} ${isMobile ? '' : 'w-9 px-0'} text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10`}
                    onClick={() => handleDeleteProduct(product)}
                    title={isEnglish ? 'Delete product' : 'حذف المنتج'}
                >
                    <Trash2 className={actionIconClassName} />
                    {isMobile ? <span className="truncate">{isEnglish ? 'Delete' : 'حذف'}</span> : null}
                </Button>
            </div>
        );
    };

    const currentProductFormStepIndex = Math.max(
        PRODUCT_FORM_STEPS.findIndex((step) => step.id === productFormStep),
        0
    );
    const isFirstProductFormStep = currentProductFormStepIndex === 0;
    const isLastProductFormStep = currentProductFormStepIndex === PRODUCT_FORM_STEPS.length - 1;
    const goToProductFormStep = (direction) => {
        const nextIndex = Math.min(
            PRODUCT_FORM_STEPS.length - 1,
            Math.max(0, currentProductFormStepIndex + direction)
        );
        setProductFormStep(PRODUCT_FORM_STEPS[nextIndex].id);
    };

    return (
        <div className="min-w-0 space-y-6">
            <section className="admin-premium-hero">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('productsManager')}</h1>
                </div>
            </div>
            </section>

            <div className="admin-premium-panel overflow-hidden">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{isEnglish ? 'Catalog (Categories)' : 'الكاتلوج (الأقسام)'}</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {isEnglish ? 'Control category display order (lower number shows first).' : 'حدد ترتيب ظهور الأقسام (الرقم الأقل يظهر أولاً).'}
                        </p>
                    </div>
                    <Button onClick={() => openCategoryModal()}>
                        <Plus className="mr-2 h-4 w-4" /> {isEnglish ? 'Add Category' : 'إضافة قسم'}
                    </Button>
                </div>

                <div className="space-y-5 px-4 pb-4">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isEnglish ? 'Main categories' : 'الأقسام الرئيسية'}
                        </h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{isEnglish ? 'Name' : 'الاسم'}</TableHead>
                                    <TableHead className="text-center">{isEnglish ? 'Order' : 'الترتيب'}</TableHead>
                                    <TableHead className="text-end">{t('actions') || (isEnglish ? 'Actions' : 'الإجراءات')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mainAdminCategories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                                    {category.image ? (
                                                        <img src={resolveImageUrl(category.image)} alt={category.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-gray-900 dark:text-white">{category.name || '-'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{Number(category?.sortOrder ?? category?.displayOrder ?? 0)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => openCategoryModal(category)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() => handleDeleteCategory(category)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!mainAdminCategories.length && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-8 text-center text-sm text-gray-500">
                                            {isEnglish ? 'No main categories yet.' : 'لا توجد أقسام رئيسية حتى الآن.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isEnglish ? 'Sub-categories' : 'الأقسام الفرعية'}
                        </h3>

                        {subAdminCategories.length ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {subAdminCategories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                                {category.image ? (
                                                    <img src={resolveImageUrl(category.image)} alt={category.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{category.name || '-'}</div>
                                                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                    {isEnglish ? 'Order' : 'الترتيب'}: {Number(category?.sortOrder ?? category?.displayOrder ?? 0)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => openCategoryModal(category)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleDeleteCategory(category)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                                {isEnglish ? 'No sub-categories yet.' : 'لا توجد أقسام فرعية حتى الآن.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={() => openProductModal()} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> {t('addProduct')}
                </Button>
            </div>

            <div className="admin-premium-panel p-1.5">
                <div className="grid min-w-0 grid-cols-2 gap-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto] lg:items-end">
                    <label className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-bold leading-none text-gray-600 dark:text-gray-300">
                            {isEnglish ? 'Main' : 'رئيسي'}
                        </span>
                        <select
                            value={selectedMainCategoryId}
                            onChange={(event) => {
                                setSelectedMainCategoryId(event.target.value);
                                setSelectedSubCategoryId('');
                            }}
                            className={`${selectClassName} !h-6 w-full !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none`}
                        >
                            <option value="">{isEnglish ? 'All main categories' : 'كل الأقسام الرئيسية'}</option>
                            {mainAdminCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name || category.nameAr || category.id}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-bold leading-none text-gray-600 dark:text-gray-300">
                            {isEnglish ? 'Sub' : 'فرعي'}
                        </span>
                        <select
                            value={selectedSubCategoryId}
                            onChange={(event) => setSelectedSubCategoryId(event.target.value)}
                            className={`${selectClassName} !h-6 w-full !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none`}
                        >
                            <option value="">{isEnglish ? 'All sub-categories' : 'كل الأقسام الفرعية'}</option>
                            {productFilterSubCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name || category.nameAr || category.id}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="min-w-0">
                        <span className="mb-0.5 block text-[10px] font-bold leading-none text-gray-600 dark:text-gray-300">
                            {isEnglish ? 'Search' : 'بحث'}
                        </span>
                        <input
                            type="search"
                            value={productSearchQuery}
                            onChange={(event) => setProductSearchQuery(event.target.value)}
                            placeholder={isEnglish ? 'Search products...' : 'بحث عن المنتجات...'}
                            className={`${inputBaseClassName} !h-6 w-full !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none focus:!shadow-none`}
                        />
                    </label>

                    <div className="grid min-w-0 grid-cols-2 gap-1.5 self-end">
                        <Badge variant="outline" className="flex h-7 min-w-0 justify-center rounded-lg px-1.5 text-[10px]">
                            {isEnglish
                                ? `${filteredAdminProducts.length}/${sortedAdminProducts.length}`
                                : `${formatNumber(filteredAdminProducts.length, 'ar-EG')}/${formatNumber(sortedAdminProducts.length, 'ar-EG')}`}
                        </Badge>
                        <Button
                            type="button"
                            variant="secondary"
                            className="h-7 min-w-0 rounded-lg px-2 text-[10px]"
                            onClick={() => {
                                setSelectedMainCategoryId('');
                                setSelectedSubCategoryId('');
                                setProductSearchQuery('');
                            }}
                            disabled={!selectedMainCategoryId && !selectedSubCategoryId && !productSearchQuery}
                        >
                            {isEnglish ? 'Clear' : 'مسح'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="admin-premium-panel overflow-hidden">
                <div className="space-y-2 p-2 sm:space-y-3 sm:p-3 xl:hidden">
                    {filteredAdminProducts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-card-rgb)/0.56)] p-5 text-center text-sm text-gray-500 dark:text-gray-400">
                            {isEnglish
                                ? 'No products match the current search or category filters.'
                                : 'لا توجد منتجات مطابقة للبحث أو فلاتر الأقسام المحددة.'}
                        </div>
                    ) : null}

                    {filteredAdminProducts.map((product) => {
                        const isUnavailable = getIsProductUnavailable(product);
                        const isHidden = getIsProductHidden(product);
                        const primaryName = getProductPrimaryName(product);
                        const secondaryText = getProductSecondaryText(product);
                        const providerLabel = getProviderDisplayName(product);
                        const categoryLabel = getProductCategoryLabel(product);
                        const priceLabel = getProductPriceLabel(product);
                        const statusLabel = getProductStatusLabel(product);
                        const availabilityLabel = getProductAvailabilityLabel(product);
                        const visibilityLabel = getProductVisibilityLabel(product);

                        return (
                            <article
                                key={product.id}
                                className="rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.9),rgb(var(--color-elevated-rgb)/0.72))] p-2 shadow-[var(--shadow-subtle)] transition hover:border-[color:rgb(var(--color-primary-rgb)/0.26)] sm:rounded-xl sm:p-3"
                            >
                                <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                                    {renderProductImage(product, 'h-10 w-10 !rounded-lg sm:h-14 sm:w-14 sm:!rounded-xl')}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-start justify-between gap-1.5 sm:gap-2">
                                            <div className="min-w-0">
                                                <h3 className={`truncate text-xs font-bold sm:text-sm ${isHidden ? 'text-gray-500 line-through dark:text-gray-400' : isUnavailable ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {primaryName}
                                                </h3>
                                                {secondaryText ? (
                                                    <p className="mt-0.5 truncate text-[10px] text-gray-500 sm:text-xs dark:text-gray-400">{secondaryText}</p>
                                                ) : null}
                                            </div>
                                            <Badge variant={product.status === 'active' ? 'success' : 'secondary'} className="shrink-0 px-1.5 py-0.5 text-[9px] sm:px-2.5 sm:py-1 sm:text-[11px]">
                                                {statusLabel}
                                            </Badge>
                                        </div>

                                        <div className="mt-1 flex flex-wrap gap-1 sm:mt-2">
                                            <Badge variant={isHidden ? 'secondary' : 'success'} className="px-1.5 py-0.5 text-[9px] sm:px-2 sm:text-[10px]">
                                                {visibilityLabel}
                                            </Badge>
                                            <Badge variant={isUnavailable ? 'danger' : 'success'} className="px-1.5 py-0.5 text-[9px] sm:px-2 sm:text-[10px]">
                                                {availabilityLabel}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] sm:mt-3 sm:gap-2 sm:text-xs">
                                    <div className="min-w-0 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.62)] bg-[color:rgb(var(--color-surface-rgb)/0.36)] p-1.5 sm:rounded-xl sm:p-2">
                                        <span className="block text-[8px] font-bold text-gray-500 sm:text-[10px] dark:text-gray-400">{isEnglish ? 'Provider' : 'المزود'}</span>
                                        <strong className="mt-0.5 block truncate text-[10px] text-[var(--color-text)] sm:mt-1 sm:text-xs">{providerLabel}</strong>
                                    </div>
                                    <div className="min-w-0 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.62)] bg-[color:rgb(var(--color-surface-rgb)/0.36)] p-1.5 sm:rounded-xl sm:p-2">
                                        <span className="block text-[8px] font-bold text-gray-500 sm:text-[10px] dark:text-gray-400">{isEnglish ? 'Category' : 'القسم'}</span>
                                        <strong className="mt-0.5 block truncate text-[10px] text-[var(--color-text)] sm:mt-1 sm:text-xs">{categoryLabel}</strong>
                                    </div>
                                    <div className="min-w-0 rounded-lg border border-[color:rgb(var(--color-border-rgb)/0.62)] bg-[color:rgb(var(--color-surface-rgb)/0.36)] p-1.5 sm:rounded-xl sm:p-2">
                                        <span className="block text-[8px] font-bold text-gray-500 sm:text-[10px] dark:text-gray-400">{isEnglish ? 'Order' : 'الترتيب'}</span>
                                        <strong className="mt-0.5 block text-[10px] text-[var(--color-text)] sm:mt-1 sm:text-xs">{Number(product?.displayOrder || 0)}</strong>
                                    </div>
                                    <div className="min-w-0 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-primary-rgb)/0.07)] p-1.5 sm:rounded-xl sm:p-2">
                                        <span className="block text-[8px] font-bold text-gray-500 sm:text-[10px] dark:text-gray-400">{t('basePrice')}</span>
                                        <strong className="mt-0.5 block break-all font-mono text-[9px] leading-tight text-[var(--color-primary)] sm:mt-1 sm:text-[11px] sm:leading-snug">
                                            {priceLabel}
                                        </strong>
                                    </div>
                                </div>

                                <div className="mt-2 border-t border-[color:rgb(var(--color-border-rgb)/0.58)] pt-2 sm:mt-3 sm:pt-3">
                                    {renderProductActions(product, true)}
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="hidden xl:block">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[25%]">{t('products')}</TableHead>
                                <TableHead className="w-[12%] text-center">{isEnglish ? 'Provider' : 'المزود'}</TableHead>
                                <TableHead className="w-[14%] text-center">{t('category') || 'القسم'}</TableHead>
                                <TableHead className="w-[8%] text-center">{isEnglish ? 'Order' : 'الترتيب'}</TableHead>
                                <TableHead className="w-[14%] text-center">{t('basePrice')}</TableHead>
                                <TableHead className="w-[13%] text-center">{t('common.status', { defaultValue: 'الحالة' })}</TableHead>
                                <TableHead className="w-[14%] text-end">{t('actions') || 'الإجراءات'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAdminProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {isEnglish
                                            ? 'No products match the current search or category filters.'
                                            : 'لا توجد منتجات مطابقة للبحث أو فلاتر الأقسام المحددة.'}
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {filteredAdminProducts.map((product) => {
                                const isUnavailable = getIsProductUnavailable(product);
                                const isHidden = getIsProductHidden(product);
                                const primaryName = getProductPrimaryName(product);
                                const secondaryText = getProductSecondaryText(product);
                                const providerLabel = getProviderDisplayName(product);
                                const categoryLabel = getProductCategoryLabel(product);
                                const priceLabel = getProductPriceLabel(product);
                                const statusLabel = getProductStatusLabel(product);
                                const availabilityLabel = getProductAvailabilityLabel(product);
                                const visibilityLabel = getProductVisibilityLabel(product);

                                return (
                                    <TableRow key={product.id} className="hover:bg-[color:rgb(var(--color-primary-rgb)/0.055)]">
                                        <TableCell className="py-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                {renderProductImage(product)}
                                                <div className="min-w-0">
                                                    <div className={`truncate font-semibold ${isHidden ? 'text-gray-500 line-through dark:text-gray-400' : isUnavailable ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                        {primaryName}
                                                    </div>
                                                    {secondaryText ? (
                                                        <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{secondaryText}</div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="max-w-full truncate">{providerLabel}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="max-w-full truncate">{categoryLabel}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="info">{Number(product?.displayOrder || 0)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                title={priceLabel}
                                                className="inline-block max-w-full truncate rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[color:rgb(var(--color-primary-rgb)/0.07)] px-2.5 py-1 font-mono text-xs text-[var(--color-primary)]"
                                            >
                                                {priceLabel}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>{statusLabel}</Badge>
                                                <Badge variant={isHidden ? 'secondary' : 'success'} className="px-2 py-0.5 text-[10px]">
                                                    {visibilityLabel}
                                                </Badge>
                                                <Badge variant={isUnavailable ? 'danger' : 'success'} className="px-2 py-0.5 text-[10px]">
                                                    {availabilityLabel}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-end">
                                            {renderProductActions(product)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Modal
                isOpen={isCategoryModalOpen}
                onClose={() => !isSavingCategory && setIsCategoryModalOpen(false)}
                title={editingCategory ? (isEnglish ? 'Edit Category' : 'تعديل القسم') : (isEnglish ? 'Add Category' : 'إضافة قسم')}
            >
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label={isEnglish ? 'English Name' : 'الاسم بالإنجليزية'}
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={isEnglish ? 'Example: Games' : 'مثال: Games'}
                        />
                    </div>

                    <Input
                        label={isEnglish ? 'Display Order (number)' : 'ترتيب العرض (رقم)'}
                        type="number"
                        value={categoryForm.sortOrder}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                        placeholder={isEnglish ? 'Example: 1' : 'مثال: 1'}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? 'Parent Category (optional)' : 'القسم الرئيسي (اختياري)'}</label>
                        <select
                            className={`${selectClassName} h-11 dark:[color-scheme:dark]`}
                            value={categoryForm.parentCategory}
                            onChange={(e) => setCategoryForm((prev) => ({ ...prev, parentCategory: e.target.value }))}
                        >
                            <option value="">{isEnglish ? '— None (Top Level) —' : '— بدون (قسم رئيسي) —'}</option>
                            {(categories || [])
                                .filter((c) => c.id !== editingCategory?.id)
                                .map((c) => (
                                    <option key={c.id} value={c.id} className="bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
                                        {c.name}{c.parentCategory ? ` (${isEnglish ? 'sub' : 'فرعي'})` : ''}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isEnglish ? 'Category Image (upload)' : 'صورة القسم (رفع)'}</label>
                        <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800/50">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setCategoryForm, 'categories')} className="hidden" id="category-image-upload" />
                            <label htmlFor="category-image-upload" className="flex cursor-pointer flex-col items-center gap-2">
                                {categoryForm.image
                                    ? <img src={resolveImageUrl(categoryForm.image)} alt="preview" decoding="async" referrerPolicy="no-referrer" className="h-32 rounded object-contain" />
                                    : <><ImageIcon className="h-8 w-8 text-gray-400" /><span className="text-sm text-gray-500">{isEnglish ? 'Click to upload' : 'اضغط لرفع الصورة'}</span></>
                                }
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsCategoryModalOpen(false)} disabled={isSavingCategory}>
                            {isEnglish ? 'Cancel' : 'إلغاء'}
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSavingCategory}>
                            {editingCategory ? (isEnglish ? 'Save' : 'حفظ') : (isEnglish ? 'Add' : 'إضافة')}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? t('editProduct') : t('addProduct')} size="xl">
                <form onSubmit={handleProductSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PRODUCT_FORM_STEPS.map((step) => {
                            const isActive = productFormStep === step.id;
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => setProductFormStep(step.id)}
                                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold transition sm:text-sm ${
                                        isActive
                                            ? 'border-[color:rgb(var(--color-primary-rgb)/0.44)] bg-[color:rgb(var(--color-primary-rgb)/0.13)] text-[var(--color-primary)]'
                                            : 'border-[color:rgb(var(--color-border-rgb)/0.78)] bg-[color:rgb(var(--color-card-rgb)/0.64)] text-[var(--color-text-secondary)]'
                                    }`}
                                >
                                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.14)] text-[10px]">
                                        {step.number}
                                    </span>
                                    <span className="truncate">{isEnglish ? step.labelEn : step.labelAr}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ========== 1. المعلومات الأساسية ========== */}
                    {productFormStep === 'basic' ? (
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</span>
                            المعلومات الأساسية
                        </h3>
                        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-900/30">
                            <div className="grid grid-cols-2 gap-1">
                                <label className="min-w-0 space-y-0.5">
                                    <span className="block text-[9px] font-bold leading-none text-gray-600 dark:text-gray-300">Name</span>
                                    <input
                                        className={`${inputBaseClassName} !h-6 !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none`}
                                        value={productForm.name}
                                        onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </label>
                                <label className="min-w-0 space-y-0.5">
                                    <span className="block text-[9px] font-bold leading-none text-gray-600 dark:text-gray-300">{isEnglish ? 'Display Order (number)' : 'ترتيب العرض (رقم)'}</span>
                                    <input
                                        className={`${inputBaseClassName} !h-6 !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none`}
                                        type="number"
                                        value={productForm.displayOrder}
                                        onChange={(e) => setProductForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                                        placeholder={isEnglish ? 'Example: 10' : 'مثال: 10'}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-1">
                                <label className="min-w-0 space-y-0.5">
                                    <span className="block text-[9px] font-bold leading-none text-gray-600 dark:text-gray-300">Description</span>
                                    <input
                                        className={`${inputBaseClassName} !h-6 !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none`}
                                        value={productForm.description}
                                        onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                                    />
                                </label>

                                <label className="min-w-0 space-y-0.5">
                                    <span className="block text-[9px] font-bold leading-none text-gray-600 dark:text-gray-300">القسم</span>
                                    <select
                                        className={`${selectClassName} !h-6 !rounded-md !px-1.5 !py-0 !text-[10px] !shadow-none dark:[color-scheme:dark]`}
                                        value={productForm.category}
                                        onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                                    >
                                        {(categories || []).map((c) => (
                                            <option key={c.id} value={c.id} className="bg-white text-gray-900 dark:bg-gray-950 dark:text-white">{c.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-medium leading-none text-gray-700 dark:text-gray-300">صورة المنتج (رفع)</label>
                                <div className="rounded-md border border-dashed border-gray-300 p-1.5 text-center transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800/50">
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setProductForm)} className="hidden" id="product-image-upload" />
                                    <label htmlFor="product-image-upload" className="flex cursor-pointer flex-col items-center gap-1">
                                        {productForm.image ? <img src={resolveImageUrl(productForm.image)} alt="معاينة" decoding="async" referrerPolicy="no-referrer" className="h-16 rounded object-contain" /> : <><ImageIcon className="h-5 w-5 text-gray-400" /><span className="text-[10px] text-gray-500">اضغط لرفع الصورة</span></>}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    ) : null}

                    {/* ========== 2. الكمية والتسعير ========== */}
                    {productFormStep === 'pricing' ? (
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</span>
                            الكمية والتسعير
                        </h3>
                        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نوع الربط</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'manual', label: isEnglish ? 'Manual' : 'يدوي' },
                                        { value: 'auto', label: isEnglish ? 'Automatic' : 'آلي' },
                                    ].map((option) => {
                                        const isSelected = productForm.connectionType === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setProductForm((prev) => ({
                                                    ...prev,
                                                    connectionType: option.value,
                                                    autoFulfillmentEnabled: option.value === 'auto',
                                                    syncPriceWithProvider: option.value === 'auto' ? prev.syncPriceWithProvider : false,
                                                    externalPricingMode: option.value === 'auto' ? prev.externalPricingMode : 'use_local_price',
                                                    costPrice: option.value === 'manual' ? prev.costPrice : '',
                                                }))}
                                                className={`h-11 rounded-[0.95rem] border px-3 text-sm font-semibold transition-all ${
                                                    isSelected
                                                        ? 'border-[color:rgb(var(--color-primary-rgb)/0.42)] bg-[color:rgb(var(--color-primary-rgb)/0.12)] text-[var(--color-primary)] shadow-[0_14px_28px_-24px_rgb(var(--color-primary-rgb)/0.48)]'
                                                        : 'border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-card-rgb)/0.9)] text-[var(--color-text-secondary)] hover:border-[color:rgb(var(--color-primary-rgb)/0.24)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.06)]'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {productForm.connectionType === 'auto' ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">اختر المورد</label>
                                    <select
                                        className={`${selectClassName} h-11 dark:[color-scheme:dark]`}
                                        value={productForm.supplierId || productForm.providerId}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Fix 1: Full price reset — clear ALL price-related fields
                                            // when provider changes to prevent stale prices from
                                            // Provider B bleeding into Provider A's context.
                                            setProductForm((prev) => ({
                                                ...prev,
                                                supplierId: value,
                                                providerId: value,
                                                externalProductId: '',
                                                providerProductId: '',
                                                externalProductName: '',
                                                syncedProviderBasePrice: '',
                                                originalPriceCoins: '',
                                                basePriceCoins: '',
                                                enableManualPrice: false,
                                                manualPriceAdjustment: '',
                                                syncPriceWithProvider: value ? prev.syncPriceWithProvider : false,
                                            }));
                                        }}
                                    >
                                        <option value="" className="bg-white text-gray-900 dark:bg-gray-950 dark:text-white">اختر المزود</option>
                                        {activeProviders.map((provider) => (
                                            <option key={provider.id} value={provider.id} className="bg-white text-gray-900 dark:bg-gray-950 dark:text-white">{provider.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">اختر المنتج من المورد</label>
                                    <div className="rounded-[var(--radius-lg)] border border-[color:rgb(var(--color-border-rgb)/0.92)] bg-[color:rgb(var(--color-card-rgb)/0.92)] p-3 shadow-[var(--shadow-subtle)]">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-elevated-rgb)/0.74)] p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                                                        {selectedProviderProduct?.name || (isEnglish ? 'No provider product selected yet' : 'لم يتم اختيار منتج من المورد بعد')}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                                                        {getProviderProductPriceValue(selectedProviderProduct)
                                                            ? formatProviderProductPrice(getProviderProductPriceValue(selectedProviderProduct), language)
                                                            : (isEnglish ? 'Choose a supplier first, then select a product' : 'اختر المورد أولاً ثم اختر المنتج المناسب')}
                                                    </p>
                                                    {selectedProviderProduct ? (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {getProviderProductMinQtyValue(selectedProviderProduct) ? (
                                                                <Badge variant="secondary">
                                                                    {isEnglish ? 'Min:' : 'الحد الأدنى:'} {getProviderProductMinQtyValue(selectedProviderProduct)}
                                                                </Badge>
                                                            ) : null}
                                                            {getProviderProductMaxQtyValue(selectedProviderProduct) ? (
                                                                <Badge variant="secondary">
                                                                    {isEnglish ? 'Max:' : 'الحد الأقصى:'} {getProviderProductMaxQtyValue(selectedProviderProduct)}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {selectedSupplierId ? (
                                                <>
                                                    <div className="relative">
                                                        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                                                        <input
                                                            type="text"
                                                            value={providerProductQuery}
                                                            onChange={(e) => setProviderProductQuery(e.target.value)}
                                                            placeholder={isEnglish ? 'Search supplier products by name' : 'ابحث داخل منتجات المورد بالاسم'}
                                                            className={`${inputBaseClassName} h-11 pr-10`}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3 px-1 text-xs text-[var(--color-muted)]">
                                                        <span>
                                                            {isEnglish ? `${filteredProviderProducts.length} products found` : `${filteredProviderProducts.length} منتج متاح`}
                                                            {filteredProviderProducts.length > visibleProviderProducts.length
                                                                ? (isEnglish ? `, showing ${visibleProviderProducts.length}` : `، يتم عرض ${visibleProviderProducts.length}`)
                                                                : ''}
                                                        </span>
                                                        {selectedProviderProduct ? (
                                                            <span className="truncate text-[var(--color-primary)]">
                                                                {isEnglish ? `Selected: ${selectedProviderProduct.name}` : `المحدد: ${selectedProviderProduct.name}`}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                                        {visibleProviderProducts.length ? visibleProviderProducts.map((providerProduct) => {
                                                            const isSelected = hasMatchingProviderProduct(
                                                                providerProduct,
                                                                productForm.providerProductId,
                                                                productForm.externalProductId
                                                            );
                                                            const providerPrice = formatProviderProductPrice(getProviderProductPriceValue(providerProduct), language);

                                                            return (
                                                                <button
                                                                    key={providerProduct.id}
                                                                    type="button"
                                                                    onClick={() => handleProviderProductSelect(providerProduct.id)}
                                                                    className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-start transition-all ${
                                                                        isSelected
                                                                            ? 'border-[color:rgb(var(--color-primary-rgb)/0.4)] bg-[color:rgb(var(--color-primary-rgb)/0.12)] shadow-[0_14px_28px_-24px_rgb(var(--color-primary-rgb)/0.55)]'
                                                                            : 'border-[color:rgb(var(--color-border-rgb)/0.88)] bg-[color:rgb(var(--color-card-rgb)/0.88)] hover:border-[color:rgb(var(--color-primary-rgb)/0.28)] hover:bg-[color:rgb(var(--color-primary-rgb)/0.06)]'
                                                                    }`}
                                                                >
                                                                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                                                                        isSelected
                                                                            ? 'border-[color:rgb(var(--color-primary-rgb)/0.34)] bg-[color:rgb(var(--color-primary-rgb)/0.14)] text-[var(--color-primary)]'
                                                                            : 'border-[color:rgb(var(--color-border-rgb)/0.84)] bg-[color:rgb(var(--color-elevated-rgb)/0.88)] text-[var(--color-text-secondary)]'
                                                                    }`}>
                                                                        <Package className="h-4 w-4" />
                                                                    </span>

                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-semibold text-[var(--color-text)]">{providerProduct.name || providerProduct.id}</p>
                                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                                            {providerPrice ? (
                                                                                <Badge variant="info" className="px-2 py-0.5">
                                                                                    {providerPrice}
                                                                                </Badge>
                                                                            ) : null}
                                                                            {getProviderProductMinQtyValue(providerProduct) ? (
                                                                                <Badge variant="secondary" className="px-2 py-0.5">
                                                                                    {isEnglish ? 'Min' : 'من'} {getProviderProductMinQtyValue(providerProduct)}
                                                                                </Badge>
                                                                            ) : null}
                                                                            {getProviderProductMaxQtyValue(providerProduct) ? (
                                                                                <Badge variant="secondary" className="px-2 py-0.5">
                                                                                    {isEnglish ? 'Max' : 'إلى'} {getProviderProductMaxQtyValue(providerProduct)}
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>

                                                                    {isSelected ? (
                                                                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:rgb(var(--color-primary-rgb)/0.16)] text-[var(--color-primary)]">
                                                                            <Check className="h-4 w-4" />
                                                                        </span>
                                                                    ) : null}
                                                                </button>
                                                            );
                                                        }) : (
                                                            <div className="rounded-[var(--radius-md)] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.92)] bg-[color:rgb(var(--color-elevated-rgb)/0.68)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)]">
                                                                {isEnglish ? 'No matching supplier products were found.' : 'لا توجد منتجات مطابقة لهذا البحث.'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {filteredProviderProducts.length > visibleProviderProducts.length ? (
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            className="w-full rounded-xl text-xs"
                                                            onClick={() => setProviderProductsVisibleCount((current) => (
                                                                Math.min(current + PROVIDER_PRODUCTS_PAGE_SIZE, filteredProviderProducts.length)
                                                            ))}
                                                        >
                                                            {isEnglish
                                                                ? `Show more (${visibleProviderProducts.length}/${filteredProviderProducts.length})`
                                                                : `عرض المزيد (${visibleProviderProducts.length}/${filteredProviderProducts.length})`}
                                                        </Button>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <div className="rounded-[var(--radius-md)] border border-dashed border-[color:rgb(var(--color-border-rgb)/0.92)] bg-[color:rgb(var(--color-elevated-rgb)/0.68)] px-4 py-5 text-center text-sm text-[var(--color-text-secondary)]">
                                                    {isEnglish ? 'Select a supplier first to load its products here.' : 'اختر المورد أولاً حتى تظهر منتجاته هنا بشكل منظم.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ) : null}

                            {productForm.connectionType === 'auto' ? (
                            <>
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(productForm.autoFulfillmentEnabled)}
                                        onChange={(e) => setProductForm((prev) => ({ ...prev, autoFulfillmentEnabled: e.target.checked }))}
                                    />
                                    autoFulfillmentEnabled
                                </label>

                            </>
                            ) : null}

                            {productForm.connectionType === 'auto' ? (
                            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                <div className="flex flex-wrap items-center gap-4">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(productForm.syncPriceWithProvider)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setProductForm((prev) => {
                                                    const nextForm = {
                                                        ...prev,
                                                        syncPriceWithProvider: checked,
                                                        externalPricingMode: checked
                                                            ? 'use_supplier_price'
                                                            : (usesProviderPricingMode(prev.externalPricingMode) ? 'use_local_price' : prev.externalPricingMode),
                                                    };
                                                    if (!checked || !selectedProviderProduct) {
                                                        return nextForm;
                                                    }
                                                    return {
                                                        ...nextForm,
                                                        ...buildProviderSyncSnapshot(selectedProviderProduct, {
                                                            enableManualPrice: prev.enableManualPrice,
                                                            manualPriceAdjustment: prev.manualPriceAdjustment,
                                                            fallbackMinQty: prev.minimumOrderQty,
                                                            fallbackMaxQty: prev.maximumOrderQty,
                                                        }),
                                                    };
                                                });
                                            }}
                                        />
                                        مزامنة السعر والحدود من المورد
                                    </label>

                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(productForm.enableManualPrice)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setProductForm((prev) => {
                                                    const nextManualPriceAdjustment = checked ? prev.manualPriceAdjustment : '';
                                                    const nextForm = {
                                                        ...prev,
                                                        enableManualPrice: checked,
                                                        manualPriceAdjustment: nextManualPriceAdjustment,
                                                    };
                                                    if (!prev.syncPriceWithProvider) {
                                                        return nextForm;
                                                    }
                                                    const syncSource = {
                                                        rawPrice: selectedProviderProduct
                                                            ? getProviderProductPriceValue(selectedProviderProduct)
                                                            : prev.syncedProviderBasePrice,
                                                        minQty: prev.minimumOrderQty,
                                                        maxQty: prev.maximumOrderQty,
                                                    };
                                                    return {
                                                        ...nextForm,
                                                        ...buildProviderSyncSnapshot(syncSource, {
                                                            enableManualPrice: checked,
                                                            manualPriceAdjustment: nextManualPriceAdjustment,
                                                            fallbackMinQty: prev.minimumOrderQty,
                                                            fallbackMaxQty: prev.maximumOrderQty,
                                                        }),
                                                    };
                                                });
                                            }}
                                            disabled={!productForm.syncPriceWithProvider}
                                        />
                                        إضافة سعر يدوي
                                    </label>
                                </div>

                                <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:rgb(var(--color-primary-rgb)/0.16)] bg-[color:rgb(var(--color-primary-rgb)/0.06)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                                    {isSyncingPrice ? (
                                        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--color-primary)]" />
                                    ) : (
                                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                                    )}
                                    <span>
                                        {isEnglish
                                            ? 'Price, minimum, and maximum quantities are refreshed automatically from the linked supplier when you pick a product and again before saving.'
                                            : 'السعر والحد الأدنى والحد الأقصى يتم تحديثهم تلقائيًا من المورد المرتبط عند اختيار المنتج، ثم تتم مراجعتهم مرة أخرى قبل الحفظ.'}
                                    </span>
                                </div>

                                {productForm.syncPriceWithProvider && productForm.enableManualPrice ? (
                                    <div className="mt-3">
                                        <Input
                                            label="Manual Price Add (+/-)"
                                            type="text"
                                            inputMode="decimal"
                                            value={productForm.manualPriceAdjustment}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setProductForm((prev) => {
                                                    const nextForm = { ...prev, manualPriceAdjustment: value };
                                                    if (!prev.syncPriceWithProvider) {
                                                        return nextForm;
                                                    }
                                                    const syncSource = {
                                                        rawPrice: selectedProviderProduct
                                                            ? getProviderProductPriceValue(selectedProviderProduct)
                                                            : prev.syncedProviderBasePrice,
                                                        minQty: prev.minimumOrderQty,
                                                        maxQty: prev.maximumOrderQty,
                                                    };
                                                    return {
                                                        ...nextForm,
                                                        ...buildProviderSyncSnapshot(syncSource, {
                                                            enableManualPrice: prev.enableManualPrice,
                                                            manualPriceAdjustment: value,
                                                            fallbackMinQty: prev.minimumOrderQty,
                                                            fallbackMaxQty: prev.maximumOrderQty,
                                                        }),
                                                    };
                                                });
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                            ) : null}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <Input
                                    label="الحد الأدنى للطلب (Qty)"
                                    type="number"
                                    value={productForm.minimumOrderQty}
                                    onChange={(e) => setProductForm((prev) => ({ ...prev, minimumOrderQty: e.target.value }))}
                                    readOnly={Boolean(canSyncWithProvider)}
                                    disabled={Boolean(canSyncWithProvider)}
                                    required
                                />
                                <Input
                                    label="الحد الأقصى للطلب (Qty)"
                                    type="number"
                                    value={productForm.maximumOrderQty}
                                    onChange={(e) => setProductForm((prev) => ({ ...prev, maximumOrderQty: e.target.value }))}
                                    readOnly={Boolean(canSyncWithProvider)}
                                    disabled={Boolean(canSyncWithProvider)}
                                    required
                                />
                                <div className="w-full space-y-3">
                                    {productForm.connectionType === 'manual' ? (
                                        <Input
                                            label={isEnglish ? 'Original Price' : 'السعر الأصلي'}
                                            type="text"
                                            inputMode="decimal"
                                            value={productForm.originalPriceCoins}
                                            onChange={(e) => setProductForm((prev) => ({ ...prev, originalPriceCoins: e.target.value }))}
                                            suffix={(
                                                <span className="text-xs font-semibold text-[var(--color-muted)]">
                                                    {isEnglish ? 'USD' : 'دولار'}
                                                </span>
                                            )}
                                        />
                                    ) : null}
                                    <Input
                                        label={isEnglish ? 'Final Price' : 'السعر النهائي'}
                                        type="text"
                                        inputMode="decimal"
                                        value={productForm.basePriceCoins}
                                        onChange={(e) => setProductForm((prev) => ({ ...prev, basePriceCoins: e.target.value }))}
                                        readOnly={Boolean(canSyncWithProvider)}
                                        disabled={Boolean(canSyncWithProvider)}
                                        required
                                        suffix={(
                                            <span className="text-xs font-semibold text-[var(--color-muted)]">
                                                {isEnglish ? 'USD' : 'دولار'}
                                            </span>
                                        )}
                                    />
                                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                                        {canSyncWithProvider
                                            ? (isEnglish ? 'This final price is synced automatically from the pricing settings above.' : 'هذا السعر النهائي يتم تحديثه تلقائيًا من إعدادات التسعير الموجودة بالأعلى.')
                                            : hasSyncedProviderLink && productForm.enableManualPrice
                                                ? (isEnglish ? 'Manual pricing is enabled, so you can edit the min, max, and final price.' : 'الإضافة اليدوية مفعلة، يمكنك تعديل الحد الأدنى والحد الأقصى والسعر النهائي.')
                                                : productForm.syncPriceWithProvider
                                                    ? (isEnglish ? 'Sync is enabled, but supplier/product is not selected yet. You can still enter a local final price.' : 'المزامنة مفعلة، لكن لم يتم اختيار المورد/منتج المورد بعد. يمكنك إدخال السعر النهائي يدويًا.')
                                                    : (isEnglish ? 'Enter the final price here when the product is not linked to a supplier.' : 'أدخل السعر النهائي هنا عندما لا يكون المنتج مربوطًا بمورد.')}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                                    <Input
                                        label={isEnglish ? 'Receiver account ID shown before quantity' : 'آيدي الحساب المستلم الظاهر فوق الكمية'}
                                        placeholder={isEnglish ? 'Enter receiver account ID' : 'ادخل آيدي الحساب'}
                                        value={productForm.displayAccountNumber ?? productForm.purchaseAccountNumber ?? ''}
                                        onChange={(e) => setProductForm((prev) => ({
                                            ...prev,
                                            displayAccountNumber: e.target.value,
                                            purchaseAccountNumber: e.target.value,
                                        }))}
                                    />
                                    <label className="flex h-11 items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-gray-950 dark:text-emerald-200">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(productForm.showPurchaseAccountNumber)}
                                            onChange={(e) => setProductForm((prev) => ({ ...prev, showPurchaseAccountNumber: e.target.checked }))}
                                        />
                                        <span>{isEnglish ? 'Show to users' : 'إظهاره للمستخدم'}</span>
                                    </label>
                                </div>
                                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                                    {isEnglish ? 'When enabled, users can copy this receiver ID from the purchase window above quantity.' : 'عند التفعيل سيظهر آيدي الحساب المستلم للمستخدم داخل نافذة الشراء فوق الكمية ويمكن نسخه بالضغط عليه.'}
                                </p>
                            </div>

                            {selectedProviderProduct ? (
                                <div className="flex flex-wrap gap-2">
                                    {getProviderProductPriceValue(selectedProviderProduct) ? (
                                        <Badge variant="info">
                                            {isEnglish ? 'Supplier Price:' : 'سعر المورد:'} {formatProviderProductPrice(getProviderProductPriceValue(selectedProviderProduct), language)}
                                        </Badge>
                                    ) : null}
                                    {getProviderProductMinQtyValue(selectedProviderProduct) ? (
                                        <Badge variant="secondary">
                                            {isEnglish ? 'Min:' : 'الحد الأدنى:'} {getProviderProductMinQtyValue(selectedProviderProduct)}
                                        </Badge>
                                    ) : null}
                                    {getProviderProductMaxQtyValue(selectedProviderProduct) ? (
                                        <Badge variant="secondary">
                                            {isEnglish ? 'Max:' : 'الحد الأقصى:'} {getProviderProductMaxQtyValue(selectedProviderProduct)}
                                        </Badge>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    ) : null}

                    {/* ========== 3. اضافات اخري ========== */}
                    {productFormStep === 'fields' ? (
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">3</span>
                            الحقول الديناميكية
                        </h3>
                        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">إدارة حقول الطلب</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">هذه الحقول تظهر للعميل في نموذج شراء المنتج.</p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setProductForm((prev) => ({
                                        ...prev,
                                        dynamicFields: [
                                            ...(prev.dynamicFields || []),
                                            { name: '', label: '', type: 'text', required: true, isVerifiable: false },
                                        ],
                                    }))}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    إضافة حقل
                                </Button>
                            </div>

                            {(productForm.dynamicFields || []).length > 0 ? (
                                <div className="space-y-2">
                                    {(productForm.dynamicFields || []).map((item, index) => (
                                        <div
                                            key={item?.id || `dynamic-field-${index}`}
                                            className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40 sm:grid-cols-2 md:grid-cols-12 md:items-end"
                                        >
                                            {/* العنوان (Label) */}
                                            <div className="sm:col-span-1 md:col-span-2">
                                                <Input
                                                    label="العنوان"
                                                    placeholder="مثال: رقم اللاعب"
                                                    value={item.label || ''}
                                                    onChange={(e) => setProductForm((prev) => ({
                                                        ...prev,
                                                        dynamicFields: (prev.dynamicFields || []).map((row, rowIndex) => (
                                                            rowIndex === index ? { ...row, label: e.target.value } : row
                                                        )),
                                                    }))}
                                                />
                                            </div>

                                            {/* الاسم البرمجي (Name / Key) */}
                                            <div className="sm:col-span-1 md:col-span-2">
                                                <Input
                                                    label="الاسم البرمجي"
                                                    placeholder="مثال: player_id"
                                                    value={item.name || ''}
                                                    onChange={(e) => {
                                                        const sanitized = e.target.value.replace(/\s/g, '_');
                                                        setProductForm((prev) => ({
                                                            ...prev,
                                                            dynamicFields: (prev.dynamicFields || []).map((row, rowIndex) => (
                                                                rowIndex === index ? { ...row, name: sanitized } : row
                                                            )),
                                                        }));
                                                    }}
                                                />
                                            </div>

                                            {/* النوع (Type) */}
                                            <div className="sm:col-span-1 md:col-span-3">
                                                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)] sm:text-sm">
                                                    النوع
                                                </label>
                                                <select
                                                    value={item.type || 'text'}
                                                    onChange={(e) => setProductForm((prev) => ({
                                                        ...prev,
                                                        dynamicFields: (prev.dynamicFields || []).map((row, rowIndex) => (
                                                            rowIndex === index ? { ...row, type: e.target.value } : row
                                                        )),
                                                    }))}
                                                    className={selectClassName}
                                                >
                                                    <option value="text">Text</option>
                                                    <option value="number">Number</option>
                                                    <option value="email">Email</option>
                                                    <option value="image">Image / صورة</option>
                                                </select>
                                            </div>

                                            {/* مطلوب (Required) */}
                                            <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-1 md:col-span-2">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(item.required)}
                                                    onChange={(e) => setProductForm((prev) => ({
                                                        ...prev,
                                                        dynamicFields: (prev.dynamicFields || []).map((row, rowIndex) => (
                                                            rowIndex === index ? { ...row, required: e.target.checked } : row
                                                        )),
                                                    }))}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                                                />
                                                مطلوب
                                            </label>

                                            {/* حذف (Delete) */}
                                            <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-2.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 sm:col-span-1 md:col-span-2">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isVerifiable === true}
                                                    onChange={(e) => setProductForm((prev) => ({
                                                        ...prev,
                                                        dynamicFields: (prev.dynamicFields || []).map((row, rowIndex) => (
                                                            rowIndex === index ? { ...row, isVerifiable: e.target.checked } : row
                                                        )),
                                                    }))}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                                                />
                                                يدعم التحقق (Verifiable)
                                            </label>

                                            <div className="flex items-end pb-0.5 md:col-span-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="w-full"
                                                    onClick={() => setProductForm((prev) => ({
                                                        ...prev,
                                                        dynamicFields: (prev.dynamicFields || []).filter((_, rowIndex) => rowIndex !== index),
                                                    }))}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">لا توجد حقول ديناميكية بعد. اضغط "إضافة حقل".</p>
                            )}
                        </div>
                    </div>
                    ) : null}

                    {/* Preview حالة المنتج النهائية */}
                    {productFormStep === 'fields' ? (
                    <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-900/20">
                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">معاينة: كيف سيبدو المنتج للعميل</h4>
                        {(() => {
                            const status = getProductStatus(productForm);
                            return (
                                <div className="space-y-2 text-sm">
                                    <p className="text-indigo-700 dark:text-indigo-300">
                                        {status.isVisible ? '✓ المنتج سيكون ظاهراً' : '✗ المنتج لن يكون ظاهراً'}
                                    </p>
                                    <p className="text-indigo-700 dark:text-indigo-300">
                                        {status.isPurchasable ? '✓ يمكن شراء المنتج' : '✗ لا يمكن شراء المنتج'}
                                    </p>
                                    {status.badge && (
                                        <p className="text-indigo-700 dark:text-indigo-300">
                                            Badge: <Badge variant={status.badgeColor}>{status.badgeLabel}</Badge>
                                        </p>
                                    )}
                                    {status.helperText && (
                                        <p className="text-indigo-700 dark:text-indigo-300">النص: {status.helperText}</p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 border-t border-[color:rgb(var(--color-border-rgb)/0.7)] pt-4 sm:flex sm:justify-end">
                        <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setIsProductModalOpen(false)} disabled={isSavingProduct}>إلغاء</Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => goToProductFormStep(-1)}
                            disabled={isSavingProduct || isFirstProductFormStep}
                        >
                            {isEnglish ? 'Previous' : 'السابق'}
                        </Button>
                        {!isLastProductFormStep ? (
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full sm:w-auto"
                                onClick={() => goToProductFormStep(1)}
                                disabled={isSavingProduct}
                            >
                                {isEnglish ? 'Next' : 'التالي'}
                            </Button>
                        ) : null}
                        <Button type="submit" className="w-full sm:w-auto" disabled={isSavingProduct}>
                            {isSavingProduct ? 'جارٍ حفظ المنتج...' : 'حفظ المنتج'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(categoryToDelete)}
                title={isEnglish ? 'Delete category?' : 'حذف القسم'}
                description={categoryToDelete ? (
                    isEnglish
                        ? `Delete ${String(categoryToDelete?.name || categoryToDelete?.nameAr || 'this category').trim()}?`
                        : `حذف ${String(categoryToDelete?.nameAr || categoryToDelete?.name || 'هذا القسم').trim()}؟`
                ) : ''}
                confirmLabel={isEnglish ? 'Delete' : 'حذف'}
                cancelLabel={isEnglish ? 'Cancel' : 'إلغاء'}
                onConfirm={confirmDeleteCategory}
                onCancel={() => setCategoryToDelete(null)}
                isLoading={isSavingCategory}
            />

            <ConfirmDialog
                open={Boolean(productToDelete)}
                title={isEnglish ? 'Delete product?' : 'حذف المنتج؟'}
                description={productToDelete ? (
                    isEnglish
                        ? `Are you sure you want to delete ${String(productToDelete?.name || productToDelete?.nameAr || 'this product').trim()}?`
                        : `هل أنت متأكد من حذف ${String(productToDelete?.nameAr || productToDelete?.name || 'هذا المنتج').trim()}؟`
                ) : ''}
                confirmLabel={isEnglish ? 'Delete' : 'حذف'}
                cancelLabel={isEnglish ? 'Cancel' : 'إلغاء'}
                onConfirm={confirmDeleteProduct}
                onCancel={() => setProductToDelete(null)}
                isLoading={false}
            />

        </div>
    );
};

export default AdminProducts;
