const getStatusCopy = (language = 'ar') => {
  const isEnglish = String(language || '').toLowerCase().startsWith('en');

  if (isEnglish) {
    return {
      productHiddenReason: 'Product is hidden from the store',
      pausedLabel: 'Temporarily Paused',
      pausedHelper: 'This product is temporarily paused',
      pausedReason: 'Sales are temporarily paused',
      unavailableLabel: 'Unavailable',
      unavailableHelper: 'Sorry, this product is currently unavailable',
      unavailableReason: 'Product unavailable',
      pausedStatusReason: 'Product status is paused',
      outOfStockLabel: 'Out of Stock',
      outOfStockHelper: 'Sorry, this item is out of stock',
      outOfStockReason: 'Out of stock',
      comingSoonLabel: 'Coming Soon',
      comingSoonHelper: 'This product will be available soon',
      comingSoonReason: 'Product not started yet',
      expiredLabel: 'Offer Ended',
      expiredHelper: 'This product availability period has ended',
      expiredReason: 'Product period expired',
      lowStockLabel: 'Low Stock',
      lowStockHelper: (count) => `Remaining stock: ${count}`,
      availableLabel: 'Available'
    };
  }

  return {
    productHiddenReason: 'المنتج غير ظاهر في المتجر',
    pausedLabel: 'موقوف مؤقتاً',
    pausedHelper: 'هذا المنتج موقوف مؤقتاً',
    pausedReason: 'البيع موقوف مؤقتاً',
    unavailableLabel: 'غير متوفر',
    unavailableHelper: 'عذراً، هذا المنتج غير متوفر حالياً',
    unavailableReason: 'المنتج غير متوفر',
    pausedStatusReason: 'حالة المنتج موقوف',
    outOfStockLabel: 'نفد المخزون',
    outOfStockHelper: 'عذراً، انقضى المخزون',
    outOfStockReason: 'المنتج نفد من المخزون',
    comingSoonLabel: 'قريباً',
    comingSoonHelper: 'هذا المنتج سيكون متاحاً قريباً',
    comingSoonReason: 'المنتج لم يبدأ بعد',
    expiredLabel: 'انتهى العرض',
    expiredHelper: 'انتهت فترة توفر هذا المنتج',
    expiredReason: 'انتهت فترة المنتج',
    lowStockLabel: 'مخزون منخفض',
    lowStockHelper: (count) => `المخزون المتبقي: ${count}`,
    availableLabel: 'متوفر'
  };
};

export function getProductStatus(product, language = 'ar') {
  const copy = getStatusCopy(language);
  const defaults = {
    productStatus: 'available',
    isVisibleInStore: true,
    showWhenUnavailable: true,
    enableSchedule: false,
    scheduledStartAt: null,
    scheduledEndAt: null,
    scheduleVisibilityMode: 'hide',
    pauseSales: false,
    pauseReason: '',
    trackInventory: false,
    stockQuantity: 999,
    hideWhenOutOfStock: false,
    showOutOfStockLabel: true
  };

  const p = { ...defaults, ...product };
  const now = new Date();
  const normalizedStatus = String(p.status || '').trim().toLowerCase();
  const normalizedProductStatus = String(p.productStatus || '').trim().toLowerCase();
  const stoppedStatuses = new Set([
    'inactive',
    'disabled',
    'disable',
    'stopped',
    'stop',
    'paused',
    'pause',
    'unavailable',
    'not_available',
    'not-available',
    'out_of_service',
    'out-of-service',
    'suspended',
    'blocked',
    'off',
    'closed',
  ]);
  const isStopped = stoppedStatuses.has(normalizedStatus)
    || stoppedStatuses.has(normalizedProductStatus)
    || p.isActive === false;
  const isDeleted = Boolean(p.deletedAt || p.isDeleted === true);
  const isVisibleByUser = !isDeleted && p.isVisibleInStore !== false;
  const isUnavailableStatus = normalizedProductStatus === 'unavailable' || isStopped;

  const isInSchedule = () => {
    if (!p.enableSchedule) return true;
    const startTime = p.scheduledStartAt ? new Date(p.scheduledStartAt) : null;
    const endTime = p.scheduledEndAt ? new Date(p.scheduledEndAt) : null;
    if (startTime && now < startTime) return false;
    if (endTime && now > endTime) return false;
    return true;
  };

  const getScheduleStatus = () => {
    if (!p.enableSchedule) return null;
    const startTime = p.scheduledStartAt ? new Date(p.scheduledStartAt) : null;
    const endTime = p.scheduledEndAt ? new Date(p.scheduledEndAt) : null;
    if (startTime && now < startTime) return 'coming_soon';
    if (endTime && now > endTime) return 'expired';
    return 'in_schedule';
  };

  const isOutOfStock = () => p.trackInventory && p.stockQuantity <= 0;
  const isLowStock = () => p.trackInventory && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;

  const isHiddenByUser = !isVisibleByUser;
  const isHiddenBySchedule = !isInSchedule() && p.scheduleVisibilityMode === 'hide';
  const isHiddenByStock = isOutOfStock() && p.hideWhenOutOfStock;

  const isVisible = !isHiddenByUser && !isHiddenBySchedule && !isHiddenByStock && isVisibleByUser;

  let isPurchasable = isVisible;
  let badge = null;
  let badgeLabel = '';
  let badgeColor = 'default';
  let helperText = '';
  let reason = '';
  let isDisabled = false;

  if (!isVisibleByUser) {
    isPurchasable = false;
    isDisabled = true;
    reason = copy.productHiddenReason;
  } else if (isUnavailableStatus) {
    isPurchasable = false;
    badge = 'unavailable';
    badgeLabel = copy.unavailableLabel;
    badgeColor = 'danger';
    helperText = copy.unavailableHelper;
    reason = copy.unavailableReason;
  } else if (p.pauseSales) {
    isPurchasable = false;
    badge = 'paused';
    badgeLabel = copy.pausedLabel;
    badgeColor = 'warning';
    helperText = p.pauseReason || copy.pausedHelper;
    reason = copy.pausedReason;
  } else if (p.productStatus === 'paused') {
    isPurchasable = false;
    if (p.showWhenUnavailable) {
      badge = 'paused';
      badgeLabel = copy.pausedLabel;
      badgeColor = 'warning';
      helperText = copy.pausedHelper;
    }
    reason = copy.pausedStatusReason;
  } else if (isOutOfStock()) {
    isPurchasable = false;
    if (p.showOutOfStockLabel) {
      badge = 'out_of_stock';
      badgeLabel = copy.outOfStockLabel;
      badgeColor = 'danger';
      helperText = copy.outOfStockHelper;
    } else if (!p.hideWhenOutOfStock) {
      isDisabled = true;
    }
    reason = copy.outOfStockReason;
  } else if (getScheduleStatus() === 'coming_soon') {
    isPurchasable = false;
    if (p.scheduleVisibilityMode === 'coming_soon') {
      badge = 'coming_soon';
      badgeLabel = copy.comingSoonLabel;
      badgeColor = 'info';
      helperText = copy.comingSoonHelper;
    }
    reason = copy.comingSoonReason;
  } else if (getScheduleStatus() === 'expired') {
    isPurchasable = false;
    if (p.scheduleVisibilityMode === 'expired') {
      badge = 'expired';
      badgeLabel = copy.expiredLabel;
      badgeColor = 'secondary';
      helperText = copy.expiredHelper;
    }
    reason = copy.expiredReason;
  } else if (isLowStock()) {
    isPurchasable = true;
    badge = 'low_stock';
    badgeLabel = copy.lowStockLabel;
    badgeColor = 'warning';
    helperText = copy.lowStockHelper(p.stockQuantity);
  } else if (p.productStatus === 'available') {
    badge = 'available';
    badgeLabel = copy.availableLabel;
    badgeColor = 'success';
  }

  return {
    isVisible,
    isPurchasable,
    isDisabled,
    label: badgeLabel || copy.availableLabel,
    badge,
    badgeLabel,
    badgeColor,
    helperText,
    reason,
    scheduleStatus: getScheduleStatus(),
    isOutOfStock: isOutOfStock(),
    isLowStock: isLowStock(),
    inSchedule: isInSchedule(),
    isSalesEnabled: !p.pauseSales
  };
}

export function validateProductForm(inputProductForm, options = {}) {
  const errors = [];
  const { requireImage = false } = options;
  const primaryName = String(inputProductForm.name || '').trim();
  const rawImage = String(inputProductForm.image || '').trim();
  const rawMinimumOrderQty = inputProductForm.minimumOrderQty ?? inputProductForm.minQty;
  const rawMaximumOrderQty = inputProductForm.maximumOrderQty ?? inputProductForm.maxQty;
  const rawStepQty = inputProductForm.stepQty;
  const productForm = {
    ...inputProductForm,
    name: primaryName,
    category: String(inputProductForm.category || 'optional').trim(),
    image: rawImage || '__missing_image__',
    minimumOrderQty: rawMinimumOrderQty === '' || rawMinimumOrderQty == null ? 1 : rawMinimumOrderQty,
    maximumOrderQty: rawMaximumOrderQty === '' || rawMaximumOrderQty == null ? 999 : rawMaximumOrderQty,
    stepQty: rawStepQty === '' || rawStepQty == null ? 1 : rawStepQty,
  };

  if (requireImage && !rawImage) errors.push('صورة المنتج مطلوبة: ارفع صورة واضحة للمنتج قبل الحفظ.');

  if (!productForm.name || !productForm.name.trim()) errors.push('اسم المنتج مطلوب: اكتب اسمًا يظهر للعميل في المتجر.');
  if (!productForm.category || !productForm.category.trim()) errors.push('التصنيف مطلوب: اختر القسم الذي سيظهر داخله المنتج.');

  if (requireImage && !productForm.image) errors.push('صورة المنتج مطلوبة: لم يتم العثور على رابط الصورة بعد الرفع.');

  const minQty = Number(productForm.minimumOrderQty || 1);
  const maxQty = Number(productForm.maximumOrderQty || 999);
  const stepQty = Number(productForm.stepQty || 1);

  if (minQty < 1) errors.push('الحد الأدنى للطلب غير صحيح: أدخل رقمًا يبدأ من 1 أو أكثر.');
  if (maxQty < 1) errors.push('الحد الأقصى للطلب غير صحيح: أدخل رقمًا يبدأ من 1 أو أكثر.');
  if (maxQty < minQty) errors.push('حدود الطلب غير منطقية: الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى.');
  if (stepQty < 1) errors.push('خطوة الزيادة غير صحيحة: يجب أن تكون 1 أو أكثر.');

  if (productForm.trackInventory) {
    const stock = Number(productForm.stockQuantity || 0);
    const threshold = Number(productForm.lowStockThreshold || 0);

    if (stock < 0) errors.push('كمية المخزون غير صحيحة: لا يمكن إدخال رقم سالب.');
    if (threshold < 0) errors.push('حد تنبيه المخزون غير صحيح: لا يمكن أن يكون رقمًا سالبًا.');
    if (threshold > stock) errors.push('حد تنبيه المخزون أعلى من الكمية: اجعله أقل من أو يساوي كمية المخزون.');
  }

  if (productForm.enableSchedule) {
    if (!productForm.scheduledStartAt) errors.push('تاريخ بداية الجدولة مطلوب: اختر وقت بداية ظهور المنتج.');
    if (!productForm.scheduledEndAt) errors.push('تاريخ نهاية الجدولة مطلوب: اختر وقت انتهاء ظهور المنتج.');

    if (
      productForm.scheduledStartAt &&
      productForm.scheduledEndAt &&
      new Date(productForm.scheduledStartAt) >= new Date(productForm.scheduledEndAt)
    ) {
      errors.push('نطاق الجدولة غير صحيح: تاريخ البداية يجب أن يكون قبل تاريخ النهاية.');
    }
  }

  return errors;
}

export function getAvailableProductStatuses() {
  return [
    { value: 'available', label: 'متوفر', labelEn: 'Available', color: 'success' },
    { value: 'unavailable', label: 'غير متوفر', labelEn: 'Unavailable', color: 'danger' }
  ];
}

export function getScheduleVisibilityModes() {
  return [
    { value: 'hide', label: 'إخفاء', labelEn: 'Hide' },
    { value: 'coming_soon', label: 'عرض "قريباً"', labelEn: 'Show as "Coming Soon"' },
    { value: 'expired', label: 'عرض "انتهى العرض"', labelEn: 'Show as "Expired"' }
  ];
}
