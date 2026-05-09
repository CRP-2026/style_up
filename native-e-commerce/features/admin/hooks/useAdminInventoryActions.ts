import { type Dispatch, type SetStateAction, useState } from 'react';

import {
  adminCreateProduct,
  adminCreateVariant,
  adminUpdateProduct,
  adminUpdateVariant,
  type AdminProductDetail,
} from '~/lib/api/admin';
import { ApiError } from '~/lib/api/errors';
import { resolveApiError, type AppLocale } from '~/lib/i18n';
import type {
  EditProductFormState,
  ProductFormState,
  VariantFormState,
  VariantFormsMap,
} from '~/features/admin/components/InventoryEditorParts';

type Args = {
  locale: AppLocale;
  commonError: string;
  commonSuccess: string;
  addToast: (type: 'success' | 'error', title: string, message: string) => void;
  load: (mode?: 'initial' | 'refresh') => Promise<void>;
  selectedProductId: string | null;
  createProductForm: ProductFormState;
  setCreateProductForm: Dispatch<SetStateAction<ProductFormState>>;
  setShowCreate: Dispatch<SetStateAction<boolean>>;
  editProductForm: EditProductFormState;
  newVariantForm: VariantFormState;
  setNewVariantForm: Dispatch<SetStateAction<VariantFormState>>;
  variantForms: VariantFormsMap;
};

export function useAdminInventoryActions({
  locale,
  commonError,
  commonSuccess,
  addToast,
  load,
  selectedProductId,
  createProductForm,
  setCreateProductForm,
  setShowCreate,
  editProductForm,
  newVariantForm,
  setNewVariantForm,
  variantForms,
}: Args) {
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);

  const handleSaveVariant = async (variant: AdminProductDetail['variants'][number]) => {
    const form = variantForms[variant.id];
    if (!form) {
      addToast('error', commonError, 'Vui lòng mở Product Editor trước khi lưu variant.');
      return;
    }
    const stock = Number(form.stock || '0');
    const price = form.price ? Number(form.price) : null;
    if (Number.isNaN(stock) || stock < 0 || (price != null && Number.isNaN(price))) {
      addToast('error', commonError, 'Giá/stock variant không hợp lệ.');
      return;
    }
    setSavingVariantId(variant.id);
    try {
      await adminUpdateVariant(variant.id, {
        sku: form.sku || undefined,
        size: form.size || null,
        color: form.color || null,
        price,
        stock,
        image: form.image || null,
      });
      addToast('success', commonSuccess, 'Đã cập nhật variant');
      await load('refresh');
    } catch (e) {
      addToast(
        'error',
        commonError,
        e instanceof ApiError ? resolveApiError(e, locale) : 'Không cập nhật được'
      );
    } finally {
      setSavingVariantId(null);
    }
  };

  const handleCreateProduct = async () => {
    try {
      if (!createProductForm.id.trim() || !createProductForm.name.trim() || !createProductForm.slug.trim()) {
        addToast('error', commonError, 'Thiếu Product ID / Tên / Slug');
        return;
      }
      await adminCreateProduct({
        id: createProductForm.id.trim(),
        name: createProductForm.name.trim(),
        slug: createProductForm.slug.trim(),
        description: createProductForm.description.trim(),
        defaultImage: createProductForm.defaultImage.trim() || 'https://picsum.photos/400',
        basePrice: Number(createProductForm.basePrice || '0'),
        brand: createProductForm.brand.trim() || undefined,
        isActive: true,
      });
      addToast('success', commonSuccess, 'Đã tạo sản phẩm');
      setShowCreate(false);
      setCreateProductForm({
        id: '',
        name: '',
        slug: '',
        description: '',
        defaultImage: '',
        basePrice: '0',
        brand: '',
      });
      await load('refresh');
    } catch (e) {
      addToast(
        'error',
        commonError,
        e instanceof ApiError ? resolveApiError(e, locale) : 'Không tạo được sản phẩm'
      );
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProductId) return;
    try {
      if (!editProductForm.name.trim() || !editProductForm.slug.trim()) {
        addToast('error', commonError, 'Tên và slug không được để trống');
        return;
      }
      await adminUpdateProduct(selectedProductId, {
        name: editProductForm.name.trim(),
        slug: editProductForm.slug.trim(),
        description: editProductForm.description.trim(),
        defaultImage: editProductForm.defaultImage.trim() || undefined,
        basePrice: Number(editProductForm.basePrice || '0'),
        brand: editProductForm.brand.trim() || null,
      });
      addToast('success', commonSuccess, 'Đã lưu thông tin sản phẩm');
      await load('refresh');
    } catch (e) {
      addToast(
        'error',
        commonError,
        e instanceof ApiError ? resolveApiError(e, locale) : 'Không lưu được sản phẩm'
      );
    }
  };

  const handleCreateVariant = async () => {
    if (!selectedProductId) return;
    try {
      if (!newVariantForm.id.trim() || !newVariantForm.sku.trim()) {
        addToast('error', commonError, 'Variant ID và SKU là bắt buộc');
        return;
      }
      await adminCreateVariant(selectedProductId, {
        id: newVariantForm.id.trim(),
        sku: newVariantForm.sku.trim(),
        size: newVariantForm.size.trim() || null,
        color: newVariantForm.color.trim() || null,
        price: newVariantForm.price ? Number(newVariantForm.price) : null,
        stock: Number(newVariantForm.stock || '0'),
        image: newVariantForm.image.trim() || null,
      });
      setNewVariantForm({ id: '', sku: '', size: '', color: '', price: '', stock: '0', image: '' });
      addToast('success', commonSuccess, 'Đã thêm variant');
      await load('refresh');
    } catch (e) {
      addToast(
        'error',
        commonError,
        e instanceof ApiError ? resolveApiError(e, locale) : 'Không tạo được variant'
      );
    }
  };

  return {
    savingVariantId,
    handleSaveVariant,
    handleCreateProduct,
    handleUpdateProduct,
    handleCreateVariant,
  };
}
