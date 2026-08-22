import React, { useEffect, useState } from 'react';
import { Edit3, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUrl';
import coinsImage from '../../assets/logo.PNG';
import Button, { cn } from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import UploadProof from './UploadProof';
import { formatNumber } from '../../utils/intl';
import { isPaymentMethodAllowed } from '../../utils/paymentSettings';

const ProductModal = ({ isOpen, onClose, product, paymentMethods, onSave }) => {
  const [name, setName] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [image, setImage] = useState(null);
  const [paymentMethodIds, setPaymentMethodIds] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    const allowedValues = product?.allowedPaymentMethods || product?.paymentMethodIds || [];
    const selectedIds = product
      ? paymentMethods
          .filter((method) => isPaymentMethodAllowed(method, allowedValues))
          .map((method) => method.id)
      : paymentMethods.map((method) => method.id);

    setName(product?.name || '');
    setTargetAccountId(
      product?.targetAccountId
      || product?.receivingAccountId
      || product?.receiverAccountId
      || product?.recipientAccountId
      || product?.targetRecipientId
      || product?.receivingAccount
      || product?.targetAccount
      || product?.destinationAccountId
      || product?.accountId
      || product?.accountNumber
      || ''
    );
    setUnitPrice(product?.unitPrice ? String(product.unitPrice) : '');
    setImage(product?.image ? { preview: product.image, fileName: 'صورة التطبيق' } : null);
    setPaymentMethodIds(selectedIds);
  }, [isOpen, paymentMethods, product]);

  const togglePayment = (id) => {
    setPaymentMethodIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const handleSave = () => {
    if (!name.trim() || !Number(unitPrice) || !paymentMethodIds.length) return;
    onSave({
      name: name.trim(),
      targetAccountId: targetAccountId.trim(),
      receivingAccountId: targetAccountId.trim(),
      unitPrice: Number(unitPrice),
      image: image?.file || image?.preview || '',
      imageFile: image?.file || null,
      imagePreview: image?.preview || '',
      allowedPaymentMethods: paymentMethodIds,
      paymentMethodIds,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'تعديل التطبيق' : 'إضافة منتج / تطبيق'}
      size="lg"
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="button" onClick={handleSave} disabled={!paymentMethods.length || !paymentMethodIds.length}>
            {product ? 'حفظ التعديل' : 'حفظ التطبيق'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="اسم التطبيق" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: PUBG Mobile" />
          <Input label="آيدي الحساب المستلم" value={targetAccountId} onChange={(event) => setTargetAccountId(event.target.value)} placeholder="ادخل آيدي الحساب" />
          <Input label="سعر الوحدة" type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="1.35" />
        </div>

        <UploadProof label="صورة التطبيق" value={image} onChange={setImage} />

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">طرق الدفع المتاحة</p>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              اختر طريقة أو أكثر
            </span>
          </div>
          {paymentMethods.length ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {paymentMethods.map((method) => {
                const checked = paymentMethodIds.includes(method.id);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => togglePayment(method.id)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5',
                      checked
                        ? 'border-[color:rgb(var(--color-primary-rgb)/0.62)] bg-[color:rgb(var(--color-primary-rgb)/0.12)] text-[var(--color-primary)]'
                        : 'border-[color:rgb(var(--color-border-rgb)/0.82)] bg-[color:rgb(var(--color-card-rgb)/0.72)] text-[var(--color-text-secondary)]'
                    )}
                  >
                    {method.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:rgb(var(--color-border-rgb)/0.82)] p-4 text-sm text-[var(--color-text-secondary)]">
              لا توجد طرق دفع مفعّلة من لوحة طرق الدفع حاليًا.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const AdminProducts = ({ products, paymentMethods, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const openCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSave = (payload) => {
    if (editingProduct) {
      onUpdate(editingProduct.id, payload);
      return;
    }
    onAdd(payload);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--color-text)]">التطبيقات</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">إضافة وتعديل منتجات بيع التارجت.</p>
        </div>
        <Button type="button" onClick={openCreate} className="rounded-[1.1rem]">
          <Plus className="h-4 w-4" />
          إضافة منتج / تطبيق
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="group overflow-hidden rounded-[1.6rem] border border-[color:rgb(var(--color-primary-rgb)/0.18)] bg-[linear-gradient(180deg,rgb(var(--color-card-rgb)/0.96),rgb(var(--color-elevated-rgb)/0.9))] shadow-[0_24px_68px_-52px_rgb(var(--color-primary-rgb)/0.48)] transition duration-300 hover:-translate-y-1 hover:border-[color:rgb(var(--color-primary-rgb)/0.42)]"
          >
            <div className="relative h-40 overflow-hidden">
              {product.image ? (
                <img src={resolveImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[color:rgb(var(--color-surface-rgb)/0.78)] text-[var(--color-primary)]">
                  <img src={coinsImage} alt="عملات" className="h-20 w-20 object-contain" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-[var(--color-text)]">{product.name}</h3>
                  <p className="mt-1 text-sm font-bold text-[var(--color-primary)]">
                    {formatNumber(product.unitPrice, 'en-US', { maximumFractionDigits: 2 })} EGP
                  </p>
                  {(product.targetAccountId || product.receivingAccountId) ? (
                    <p className="mt-1 text-xs font-bold text-[var(--color-text-secondary)]">
                      ايدي الاستلام: {product.targetAccountId || product.receivingAccountId}
                    </p>
                  ) : null}
                  {product.isActive === false ? (
                    <p className="mt-1 text-xs font-bold text-[var(--color-error)]">غير نشط</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="icon" variant="secondary" onClick={() => openEdit(product)} title="تعديل">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="danger" onClick={() => onDelete(product.id)} title="حذف">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {paymentMethods
                  .filter((method) => isPaymentMethodAllowed(method, product.allowedPaymentMethods || product.paymentMethodIds || []))
                  .map((method) => (
                    <span key={method.id} className="rounded-full border border-[color:rgb(var(--color-primary-rgb)/0.2)] bg-[color:rgb(var(--color-primary-rgb)/0.08)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                      {method.name}
                    </span>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        paymentMethods={paymentMethods}
        onSave={handleSave}
      />
    </section>
  );
};

export default AdminProducts;
