import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/useAuthStore';
import useFavoritesStore, { normalizeFavoriteProductId } from '../../store/useFavoritesStore';
import { useToast } from '../ui/Toast';

const FavoriteButton = ({ product }) => {
  const { i18n } = useTranslation();
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const accountId = useFavoritesStore((state) => state.accountId);
  const favoriteProductIds = useFavoritesStore((state) => state.favoriteProductIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isArabic = String(i18n.resolvedLanguage || i18n.language || 'ar').toLowerCase().startsWith('ar');
  const productId = normalizeFavoriteProductId(product);
  const isCustomer = String(user?.role || '').toLowerCase() === 'customer';
  const isFavorite = accountId === normalizeFavoriteProductId(user) && favoriteProductIds.has(productId);

  if (!isCustomer || !productId) return null;

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await toggleFavorite({ userId: user?.id, product });
    } catch {
      addToast(
        isFavorite
          ? (isArabic ? 'تعذر إزالة المنتج من المفضلة. حاول مرة أخرى.' : 'Could not remove the product from Favorites. Try again.')
          : (isArabic ? 'تعذر إضافة المنتج إلى المفضلة. حاول مرة أخرى.' : 'Could not add the product to Favorites. Try again.'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={(event) => event.stopPropagation()}
      disabled={isSubmitting}
      aria-label={isFavorite
        ? (isArabic ? 'إزالة من المفضلة' : 'Remove from Favorites')
        : (isArabic ? 'إضافة إلى المفضلة' : 'Add to Favorites')}
      className={`absolute end-2 top-2 z-30 grid h-10 w-10 place-items-center rounded-full border shadow-sm backdrop-blur-md transition ${isFavorite
        ? 'border-rose-400/45 bg-rose-500/18 text-rose-500'
        : 'border-white/40 bg-black/20 text-white hover:border-rose-300/70 hover:bg-rose-500/15 hover:text-rose-400 dark:border-white/20'}`}
    >
      <Heart className="h-4.5 w-4.5" fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
};

export default FavoriteButton;
