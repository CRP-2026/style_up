import { Stack } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useToast } from '~/components/ToastProvider';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '~/components/ui/StateBlocks';
import {
  ConfirmModal,
  CreateProductModal,
  InventoryToolbar,
  ProductCard,
  type EditProductFormState,
  type ProductFormState,
  type VariantFormState,
  type VariantFormsMap,
} from '~/features/admin/components/InventoryEditorParts';
import { useAdminInventoryActions } from '~/features/admin/hooks/useAdminInventoryActions';
import { useAdminInventoryData } from '~/features/admin/hooks/useAdminInventoryData';
import {
  adminDeleteProduct,
  adminToggleProductActive,
} from '~/lib/api/admin';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';

export default function AdminInventoryScreen() {
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    action: () => Promise<void>;
  } | null>(null);
  const [createProductForm, setCreateProductForm] = useState<ProductFormState>({
    id: '',
    name: '',
    slug: '',
    description: '',
    defaultImage: '',
    basePrice: '0',
    brand: '',
  });
  const [editProductForm, setEditProductForm] = useState<EditProductFormState>({
    name: '',
    slug: '',
    description: '',
    defaultImage: '',
    basePrice: '0',
    brand: '',
  });
  const [variantForms, setVariantForms] = useState<VariantFormsMap>({});
  const [newVariantForm, setNewVariantForm] = useState<VariantFormState>({
    id: '',
    sku: '',
    size: '',
    color: '',
    price: '',
    stock: '0',
    image: '',
  });

  const {
    visibleProducts,
    selectedProductDetail,
    loading,
    refreshing,
    loadError,
    activeFilter,
    setActiveFilter,
    load,
  } = useAdminInventoryData({
    locale,
    commonError: L.common.error,
    homeLoadFailed: L.errors.homeLoadFailed,
    addToast,
    selectedProductId,
    setEditProductForm,
    setVariantForms,
  });

  const handleToggleActive = async (productId: string, current: boolean) => {
    try {
      await adminToggleProductActive(productId, !current);
      addToast(
        'success',
        L.common.success,
        !current ? 'Đã bật bán' : 'Đã tạm ngưng bán'
      );
      await load('refresh');
    } catch (e) {
      addToast(
        'error',
        L.common.error,
        e instanceof ApiError ? resolveApiError(e, locale) : 'Không cập nhật được'
      );
    }
  };

  const {
    savingVariantId,
    handleSaveVariant,
    handleCreateProduct,
    handleUpdateProduct,
    handleCreateVariant,
  } = useAdminInventoryActions({
    locale,
    commonError: L.common.error,
    commonSuccess: L.common.success,
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
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Admin · Tồn kho' }} />
      <View className="flex-1 bg-[#F4F4F4]">
        <InventoryToolbar
          activeFilter={activeFilter}
          onCreate={() => setShowCreate(true)}
          onFilterChange={setActiveFilter}
        />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 64 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor="#F97316"
            />
          }>
          <View className="mb-3">
            <Text className="text-[20px] font-semibold text-[#1F2937]">Sản phẩm & tồn kho</Text>
            <Text className="mt-1 text-[13px] text-[#6B7280]">
              Quản lý trạng thái bán, biến thể và số lượng tồn theo từng sản phẩm.
            </Text>
          </View>
          {loading ? (
            <LoadingBlock label="Đang tải danh sách sản phẩm..." />
          ) : loadError ? (
            <ErrorBlock message={loadError} onRetry={() => void load('refresh')} />
          ) : visibleProducts.length === 0 ? (
            <EmptyBlock title="Không có sản phẩm phù hợp" hint="Thử đổi bộ lọc hoặc tạo sản phẩm mới." />
          ) : (
            <View className="gap-3">
              {visibleProducts.map((p) => {
                const isActive = p.isActive ?? true;
                const variants = selectedProductId === p.id ? (selectedProductDetail?.variants ?? []) : [];
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isActive={isActive}
                    variants={variants}
                    selected={selectedProductId === p.id}
                    savingVariantId={savingVariantId}
                    variantForms={variantForms}
                    editProductForm={editProductForm}
                    newVariantForm={newVariantForm}
                    onToggleSelect={() => setSelectedProductId((prev) => (prev === p.id ? null : p.id))}
                    onVariantStockChange={(variantId, stock) =>
                      setVariantForms((prev) => ({
                        ...prev,
                        [variantId]: {
                          ...(prev[variantId] ?? {
                            sku: '',
                            size: '',
                            color: '',
                            price: '',
                            stock: '',
                            image: '',
                          }),
                          stock,
                        },
                      }))
                    }
                    onSaveVariant={handleSaveVariant}
                    onEditFormChange={setEditProductForm}
                    onSaveProduct={() => void handleUpdateProduct()}
                    onToggleActive={() =>
                      setConfirm({
                        title: isActive ? 'Tạm ngưng bán?' : 'Bật bán lại?',
                        body: `Sản phẩm: ${p.name}`,
                        action: async () => {
                          await handleToggleActive(p.id, isActive);
                        },
                      })
                    }
                    onDeleteProduct={() =>
                      setConfirm({
                        title: 'Xoá mềm sản phẩm?',
                        body: `Sản phẩm ${p.name} sẽ bị ẩn khỏi cửa hàng.`,
                        action: async () => {
                          await adminDeleteProduct(p.id);
                          setSelectedProductId(null);
                          await load('refresh');
                        },
                      })
                    }
                    onNewVariantFormChange={setNewVariantForm}
                    onCreateVariant={() => void handleCreateVariant()}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
      <CreateProductModal
        visible={showCreate}
        form={createProductForm}
        onClose={() => setShowCreate(false)}
        onChange={setCreateProductForm}
        onSubmit={() => void handleCreateProduct()}
      />
      <ConfirmModal
        visible={confirm != null}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          await confirm.action();
          setConfirm(null);
        }}
      />
    </>
  );
}
