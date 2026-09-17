import { create } from 'zustand';
import apiClient from '../services/client';

export const normalizeFavoriteProductId = (value) => String(
  value?._id ?? value?.id ?? value ?? ''
).trim();

const emptyState = {
  accountId: '',
  favoriteProductIds: new Set(),
  products: [],
  isLoading: false,
  error: null,
};

const useFavoritesStore = create((set, get) => ({
  ...emptyState,

  resetFavorites: () => set({ ...emptyState, favoriteProductIds: new Set() }),

  loadFavorites: async ({ userId } = {}) => {
    const accountId = normalizeFavoriteProductId(userId);
    if (!accountId) {
      get().resetFavorites();
      return [];
    }

    set((state) => (
      state.accountId === accountId
        ? { isLoading: true, error: null }
        : { ...emptyState, accountId, favoriteProductIds: new Set(), isLoading: true, error: null }
    ));

    try {
      const products = await apiClient.favorites.list();
      const normalizedProducts = Array.isArray(products) ? products : [];
      const favoriteProductIds = new Set(normalizedProducts.map(normalizeFavoriteProductId).filter(Boolean));

      if (get().accountId !== accountId) return [];
      set({ products: normalizedProducts, favoriteProductIds, isLoading: false, error: null });
      return normalizedProducts;
    } catch (error) {
      if (get().accountId === accountId) set({ isLoading: false, error });
      throw error;
    }
  },

  toggleFavorite: async ({ userId, product }) => {
    const accountId = normalizeFavoriteProductId(userId);
    const productId = normalizeFavoriteProductId(product);
    if (!accountId || !productId) throw new Error('Favorite product is unavailable.');
    if (get().accountId !== accountId) throw new Error('Favorites are still loading for this account.');

    const wasFavorite = get().favoriteProductIds.has(productId);
    const previousProducts = get().products;
    const previousIds = get().favoriteProductIds;
    const nextIds = new Set(previousIds);
    const nextProducts = wasFavorite
      ? previousProducts.filter((item) => normalizeFavoriteProductId(item) !== productId)
      : [...previousProducts.filter((item) => normalizeFavoriteProductId(item) !== productId), product];

    if (wasFavorite) nextIds.delete(productId);
    else nextIds.add(productId);
    set({ favoriteProductIds: nextIds, products: nextProducts, error: null });

    try {
      if (wasFavorite) await apiClient.favorites.remove(productId);
      else await apiClient.favorites.add(productId);
    } catch (error) {
      if (get().accountId === accountId) {
        set({ favoriteProductIds: previousIds, products: previousProducts, error });
      }
      throw error;
    }
  },
}));

export default useFavoritesStore;
