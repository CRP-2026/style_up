import { useCallback, useEffect, useMemo, useState } from 'react';

import { adminGetProduct, adminListProducts, type AdminProductDetail, type AdminProductRow } from '~/lib/api/admin';
import { ApiError } from '~/lib/api/errors';
import { resolveApiError, type AppLocale } from '~/lib/i18n';
import type { EditProductFormState, VariantFormsMap } from '~/features/admin/components/InventoryEditorParts';

type Args = {
  locale: AppLocale;
  commonError: string;
  homeLoadFailed: string;
  addToast: (type: 'success' | 'error', title: string, message: string) => void;
  selectedProductId: string | null;
  setEditProductForm: React.Dispatch<React.SetStateAction<EditProductFormState>>;
  setVariantForms: React.Dispatch<React.SetStateAction<VariantFormsMap>>;
};

export function useAdminInventoryData({
  locale,
  commonError,
  homeLoadFailed,
  addToast,
  selectedProductId,
  setEditProductForm,
  setVariantForms,
}: Args) {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'low' | 'out'>('all');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setLoadError(null);
      try {
        const adminRows = await adminListProducts({ limit: 200 });
        setProducts(adminRows);
      } catch (e) {
        const msg = e instanceof ApiError ? resolveApiError(e, locale) : homeLoadFailed;
        setLoadError(msg);
        addToast('error', commonError, msg);
      } finally {
        if (mode === 'initial') setLoading(false);
        else setRefreshing(false);
      }
    },
    [locale, homeLoadFailed, commonError, addToast]
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const visibleProducts = useMemo(() => {
    if (activeFilter === 'all') return products;
    return products.filter((p) =>
      activeFilter === 'out' ? p.totalStock === 0 : p.totalStock > 0 && p.totalStock <= 5
    );
  }, [products, activeFilter]);

  const selectedAdminProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProductDetail(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const detail = await adminGetProduct(selectedProductId);
        if (cancelled) return;
        setSelectedProductDetail(detail);
      } catch (e) {
        if (cancelled) return;
        addToast(
          'error',
          commonError,
          e instanceof ApiError ? resolveApiError(e, locale) : 'Không tải được chi tiết sản phẩm'
        );
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedProductId, addToast, commonError, locale]);

  useEffect(() => {
    if (!selectedProductDetail || !selectedAdminProduct) return;
    setEditProductForm({
      name: selectedAdminProduct.name,
      slug: selectedAdminProduct.slug ?? selectedAdminProduct.name.toLowerCase().replace(/\s+/g, '-'),
      description: selectedProductDetail.description ?? '',
      defaultImage: selectedAdminProduct.defaultImage ?? '',
      basePrice: String(selectedAdminProduct.basePrice ?? 0),
      brand: selectedAdminProduct.brand ?? '',
    });
    const nextForms: VariantFormsMap = {};
    selectedProductDetail.variants.forEach((v) => {
      nextForms[v.id] = {
        sku: v.sku ?? '',
        size: v.size ?? '',
        color: v.color ?? '',
        price: v.price != null ? String(v.price) : '',
        stock: String(v.stock),
        image: v.image ?? '',
      };
    });
    setVariantForms(nextForms);
  }, [selectedProductDetail, selectedAdminProduct, setEditProductForm, setVariantForms]);

  return {
    products,
    visibleProducts,
    selectedProductDetail,
    loading,
    refreshing,
    loadError,
    activeFilter,
    setActiveFilter,
    load,
  };
}
