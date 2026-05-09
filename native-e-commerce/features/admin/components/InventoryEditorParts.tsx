import { type Dispatch, type ReactNode, type SetStateAction, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { AppInput } from '~/components/ui/AppInput';
import { type AdminProductDetail, type AdminProductRow } from '~/lib/api/admin';
import { formatCurrency } from '~/lib/utils/formatters';

export type ProductFormState = {
  id: string;
  name: string;
  slug: string;
  description: string;
  defaultImage: string;
  basePrice: string;
  brand: string;
};

export type EditProductFormState = {
  name: string;
  slug: string;
  description: string;
  defaultImage: string;
  basePrice: string;
  brand: string;
};

export type VariantFormState = {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  image: string;
};

export type VariantFormsMap = Record<
  string,
  { sku: string; size: string; color: string; price: string; stock: string; image: string }
>;

export function InventoryToolbar({
  activeFilter,
  onCreate,
  onFilterChange,
}: {
  activeFilter: 'all' | 'low' | 'out';
  onCreate: () => void;
  onFilterChange: (v: 'all' | 'low' | 'out') => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-[#E5E7EB] bg-white px-4 py-3"
      contentContainerStyle={{ paddingRight: 8 }}>
      <View className="flex-row gap-2">
        <Pressable
          onPress={onCreate}
          className="rounded-full border border-[#F97316] bg-[#FFF4ED] px-3 py-2">
          <Text className="text-[12px] font-semibold text-[#F97316]">+ Tạo sản phẩm</Text>
        </Pressable>
        {(
          [
            { id: 'all', label: 'Tất cả' },
            { id: 'low', label: 'Sắp hết (≤5)' },
            { id: 'out', label: 'Hết hàng' },
          ] as const
        ).map((opt) => {
          const active = activeFilter === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onFilterChange(opt.id)}
              className={`rounded-full border px-3 py-2 ${
                active ? 'border-[#F97316] bg-[#FFF4ED]' : 'border-[#E5E7EB] bg-white'
              }`}>
              <Text className={`text-[12px] font-semibold ${active ? 'text-[#F97316]' : 'text-[#374151]'}`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function CreateProductModal({
  visible,
  form,
  onClose,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  form: ProductFormState;
  onClose: () => void;
  onChange: Dispatch<SetStateAction<ProductFormState>>;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="max-h-[85%] w-full max-w-[520px] rounded-[24px] bg-white p-5">
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-[20px] font-semibold text-[#1F2937]">Tạo sản phẩm mới</Text>
            <Text className="mt-1 text-[13px] text-[#6B7280]">
              Điền thông tin cơ bản để khởi tạo sản phẩm trong catalog.
            </Text>
            <View className="mt-4 gap-2">
              <AppInput label="Product ID" value={form.id} onChangeText={(v) => onChange((prev) => ({ ...prev, id: v }))} />
              <AppInput label="Tên sản phẩm" value={form.name} onChangeText={(v) => onChange((prev) => ({ ...prev, name: v }))} />
              <AppInput label="Slug" value={form.slug} onChangeText={(v) => onChange((prev) => ({ ...prev, slug: v }))} />
              <AppInput label="Giá cơ bản" keyboardType="numeric" value={form.basePrice} onChangeText={(v) => onChange((prev) => ({ ...prev, basePrice: v.replace(/[^0-9]/g, '') }))} />
              <AppInput label="Mô tả" value={form.description} onChangeText={(v) => onChange((prev) => ({ ...prev, description: v }))} />
            </View>
            <View className="mt-5 flex-row flex-wrap justify-end gap-2">
              <Pressable onPress={onClose} className="rounded-full bg-[#F3F4F6] px-4 py-2.5">
                <Text className="text-[12px] font-semibold text-[#374151]">Huỷ</Text>
              </Pressable>
              <Pressable onPress={onSubmit} className="rounded-full bg-[#F97316] px-4 py-2.5">
                <Text className="text-[12px] font-semibold text-white">Tạo</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ActionRow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <View className="mt-1 flex-row flex-wrap gap-2">
      {children}
    </View>
  );
}

export function ProductCard({
  product,
  isActive,
  variants,
  selected,
  savingVariantId,
  variantForms,
  editProductForm,
  newVariantForm,
  onToggleSelect,
  onVariantStockChange,
  onSaveVariant,
  onEditFormChange,
  onSaveProduct,
  onToggleActive,
  onDeleteProduct,
  onNewVariantFormChange,
  onCreateVariant,
}: {
  product: AdminProductRow;
  isActive: boolean;
  variants: AdminProductDetail['variants'];
  selected: boolean;
  savingVariantId: string | null;
  variantForms: VariantFormsMap;
  editProductForm: EditProductFormState;
  newVariantForm: VariantFormState;
  onToggleSelect: () => void;
  onVariantStockChange: (variantId: string, stock: string) => void;
  onSaveVariant: (variant: AdminProductDetail['variants'][number]) => Promise<void>;
  onEditFormChange: Dispatch<SetStateAction<EditProductFormState>>;
  onSaveProduct: () => void;
  onToggleActive: () => void;
  onDeleteProduct: () => void;
  onNewVariantFormChange: Dispatch<SetStateAction<VariantFormState>>;
  onCreateVariant: () => void;
}) {
  return (
    <View className="rounded-[20px] bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-[#1F2937]" numberOfLines={2}>
            {product.name}
          </Text>
          <Text className="mt-1 text-[12px] text-[#6B7280]">
            {formatCurrency(product.basePrice)} · Tồn tổng: {product.totalStock ?? '—'}
          </Text>
        </View>
        <Pressable onPress={onToggleSelect} className="rounded-full bg-[#F3F4F6] px-3 py-2">
          <Text className="text-[11px] font-semibold text-[#374151]">Sửa</Text>
        </Pressable>
      </View>

      <View className="mt-3 gap-2">
        {variants.map((v) => (
          <VariantRow
            key={v.id}
            variant={v}
            stockValue={variantForms[v.id]?.stock ?? String(v.stock)}
            canSave={variantForms[v.id] != null && savingVariantId !== v.id}
            saving={savingVariantId === v.id}
            onStockChange={(val) => onVariantStockChange(v.id, val)}
            onSave={() => void onSaveVariant(v)}
          />
        ))}
      </View>

      {selected ? (
        <ProductEditorPanel
          isActive={isActive}
          editProductForm={editProductForm}
          newVariantForm={newVariantForm}
          onEditFormChange={onEditFormChange}
          onSaveProduct={onSaveProduct}
          onToggleActive={onToggleActive}
          onDeleteProduct={onDeleteProduct}
          onNewVariantFormChange={onNewVariantFormChange}
          onCreateVariant={onCreateVariant}
        />
      ) : null}
    </View>
  );
}

function VariantRow({
  variant,
  stockValue,
  canSave,
  saving,
  onStockChange,
  onSave,
}: {
  variant: AdminProductDetail['variants'][number];
  stockValue: string;
  canSave: boolean;
  saving: boolean;
  onStockChange: (val: string) => void;
  onSave: () => void;
}) {
  const lowStock = variant.stock <= 5;
  return (
    <View className="flex-row items-center gap-3 rounded-[16px] bg-[#F9FAFB] p-3">
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-[#1F2937]">
          {variant.size ? `Size ${variant.size}` : 'Default'}
          {variant.color ? ` · ${variant.color}` : ''}
        </Text>
        <Text className="text-[11px] text-[#6B7280]">SKU: {variant.sku}</Text>
      </View>
      <AppInput
        value={stockValue}
        onChangeText={(t) => onStockChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
        className={`h-9 w-16 px-2 py-0 text-center text-[13px] font-semibold ${
          lowStock ? 'border-[#FCA5A5] text-[#B91C1C]' : 'border-[#E5E7EB] text-[#1F2937]'
        }`}
      />
      <Pressable
        disabled={!canSave}
        onPress={onSave}
        className={`rounded-full px-3 py-1.5 ${canSave ? 'bg-[#F97316]' : 'bg-[#FED7AA]'}`}>
        <Text className="text-[11px] font-semibold text-white">{saving ? '...' : 'Lưu'}</Text>
      </Pressable>
    </View>
  );
}

function ProductEditorPanel({
  isActive,
  editProductForm,
  newVariantForm,
  onEditFormChange,
  onSaveProduct,
  onToggleActive,
  onDeleteProduct,
  onNewVariantFormChange,
  onCreateVariant,
}: {
  isActive: boolean;
  editProductForm: EditProductFormState;
  newVariantForm: VariantFormState;
  onEditFormChange: Dispatch<SetStateAction<EditProductFormState>>;
  onSaveProduct: () => void;
  onToggleActive: () => void;
  onDeleteProduct: () => void;
  onNewVariantFormChange: Dispatch<SetStateAction<VariantFormState>>;
  onCreateVariant: () => void;
}) {
  return (
    <View className="mt-4 rounded-[16px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <Text className="mb-3 text-[14px] font-semibold text-[#1F2937]">Thông tin sản phẩm</Text>
      <View className="gap-2">
        <AppInput label="Tên" value={editProductForm.name} onChangeText={(v) => onEditFormChange((prev) => ({ ...prev, name: v }))} />
        <AppInput label="Slug" value={editProductForm.slug} onChangeText={(v) => onEditFormChange((prev) => ({ ...prev, slug: v }))} />
        <AppInput label="Giá cơ bản" value={editProductForm.basePrice} keyboardType="numeric" onChangeText={(v) => onEditFormChange((prev) => ({ ...prev, basePrice: v.replace(/[^0-9]/g, '') }))} />
        <AppInput label="Brand" value={editProductForm.brand} onChangeText={(v) => onEditFormChange((prev) => ({ ...prev, brand: v }))} />
        <AppInput label="Ảnh mặc định URL" value={editProductForm.defaultImage} onChangeText={(v) => onEditFormChange((prev) => ({ ...prev, defaultImage: v }))} />
        <AppInput label="Mô tả" value={editProductForm.description} onChangeText={(v) => onEditFormChange((prev) => ({ ...prev, description: v }))} />
        <ActionRow>
          <Pressable onPress={onSaveProduct} className="rounded-full bg-[#F97316] px-3 py-2">
            <Text className="text-[12px] font-semibold text-white">Lưu sản phẩm</Text>
          </Pressable>
          <Pressable onPress={onToggleActive} className="rounded-full bg-[#F3F4F6] px-3 py-2">
            <Text className="text-[12px] font-semibold text-[#374151]">{isActive ? 'Tạm ngưng' : 'Bật bán'}</Text>
          </Pressable>
          <Pressable onPress={onDeleteProduct} className="rounded-full bg-[#FEE2E2] px-3 py-2">
            <Text className="text-[12px] font-semibold text-[#B91C1C]">Xoá</Text>
          </Pressable>
        </ActionRow>
      </View>

      <Text className="mb-3 mt-5 text-[14px] font-semibold text-[#1F2937]">Thêm biến thể mới</Text>
      <View className="gap-2">
        <AppInput label="Variant ID" value={newVariantForm.id} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, id: v }))} />
        <AppInput label="SKU" value={newVariantForm.sku} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, sku: v }))} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <AppInput label="Size" value={newVariantForm.size} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, size: v }))} />
          </View>
          <View className="flex-1">
            <AppInput label="Color" value={newVariantForm.color} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, color: v }))} />
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <AppInput label="Price" keyboardType="numeric" value={newVariantForm.price} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, price: v.replace(/[^0-9]/g, '') }))} />
          </View>
          <View className="flex-1">
            <AppInput label="Stock" keyboardType="numeric" value={newVariantForm.stock} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, stock: v.replace(/[^0-9]/g, '') }))} />
          </View>
        </View>
        <AppInput label="Image URL" value={newVariantForm.image} onChangeText={(v) => onNewVariantFormChange((prev) => ({ ...prev, image: v }))} />
        <Pressable onPress={onCreateVariant} className="rounded-full bg-[#111827] px-3 py-2">
          <Text className="text-center text-[12px] font-semibold text-white">Tạo variant</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ConfirmModal({
  visible,
  title,
  body,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="max-h-[80%] w-full max-w-[460px] rounded-[22px] bg-white p-5">
          <Text className="text-[20px] font-semibold text-[#111827]">{title}</Text>
          <Text className="mt-1 text-[13px] text-[#6B7280]">Thao tác này ảnh hưởng dữ liệu đang hiển thị.</Text>
          <ScrollView className="mt-3 max-h-[220px]" showsVerticalScrollIndicator={false}>
            <Text className="text-[13px] text-[#6B7280]">{body}</Text>
          </ScrollView>
          <View className="mt-5 flex-row flex-wrap justify-end gap-2">
            <Pressable onPress={onClose} className="rounded-full bg-[#F3F4F6] px-4 py-2.5">
              <Text className="text-[12px] font-semibold text-[#374151]">Huỷ</Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={async () => {
                setSubmitting(true);
                try {
                  await onConfirm();
                } finally {
                  setSubmitting(false);
                }
              }}
              className="rounded-full bg-[#DC2626] px-4 py-2.5">
              <Text className="text-[12px] font-semibold text-white">{submitting ? '...' : 'Xác nhận'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
