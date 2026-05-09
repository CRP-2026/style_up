import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useToast } from '~/components/ToastProvider';

import { Button } from '~/components/Button';
import { useCart } from '~/features/cart/hooks/useCart';
import { fetchProductById } from '~/lib/api/catalog';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { Product } from '~/lib/types/models';
import type { ProductDetail, ProductVariant } from '~/lib/types/products';
import { formatCurrency } from '~/lib/utils/formatters';

const SHOE_SIZE_GUIDE: { eu: string; us: string; cm: string }[] = [
  { eu: '36', us: '5.5', cm: '22.5' },
  { eu: '37', us: '6', cm: '23.0' },
  { eu: '38', us: '7', cm: '24.0' },
  { eu: '39', us: '7.5', cm: '24.5' },
  { eu: '40', us: '8', cm: '25.0' },
  { eu: '41', us: '8.5', cm: '25.5' },
  { eu: '42', us: '9', cm: '26.0' },
  { eu: '43', us: '10', cm: '27.0' },
];

function uniqueValues(variants: ProductVariant[], key: 'size' | 'color'): string[] {
  const set = new Set<string>();
  for (const v of variants) {
    const value = v[key];
    if (value) set.add(value);
  }
  return Array.from(set);
}

function findVariantBySelection(
  variants: ProductVariant[],
  size: string | null,
  color: string | null
): ProductVariant | undefined {
  if (variants.length === 0) return undefined;
  const exact = variants.find((v) => {
    const sizeOk = size == null || (v.size ?? null) === size;
    const colorOk = color == null || (v.color ?? null) === color;
    return sizeOk && colorOk;
  });
  if (exact) return exact;
  return variants.find((v) => {
    const sizeOk = size == null || (v.size ?? null) === size;
    const colorOk = color == null || (v.color ?? null) === color;
    return sizeOk && colorOk;
  }) ?? variants.find((v) => v.stock > 0) ?? variants[0];
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const resolvedProductId = Array.isArray(params.id) ? params.id[0] : params.id;
  const productId = resolvedProductId ?? '';

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const load = useCallback(async () => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const p = await fetchProductById(productId);
      setProduct(p);
      const firstAvailable = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
      setSelectedSize(firstAvailable?.size ?? null);
      setSelectedColor(firstAvailable?.color ?? null);
      setActiveImageIndex(0);
      setQuantity(1);
    } catch (e) {
      const msg = e instanceof ApiError ? resolveApiError(e, locale) : L.errors.productLoadFailed;
      setLoadError(msg);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId, locale, L.errors.productLoadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const sizes = useMemo(
    () => (product ? uniqueValues(product.variants, 'size') : []),
    [product]
  );
  const colors = useMemo(
    () => (product ? uniqueValues(product.variants, 'color') : []),
    [product]
  );

  const selectedVariant = useMemo(() => {
    if (!product) return undefined;
    return (
      findVariantBySelection(product.variants, selectedSize, selectedColor) ??
      product.variants[0]
    );
  }, [product, selectedSize, selectedColor]);

  const galleryImages = useMemo(() => {
    if (!product) return [] as string[];
    const list = (product.images ?? []).slice();
    if (product.image && !list.includes(product.image)) list.unshift(product.image);
    if (selectedVariant?.image && !list.includes(selectedVariant.image)) {
      list.unshift(selectedVariant.image);
    }
    return list;
  }, [product, selectedVariant]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Product Details' }} />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </>
    );
  }

  if (loadError || !product) {
    return (
      <>
        <Stack.Screen options={{ title: 'Product Details' }} />
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-[18px] font-semibold text-[#232327]">Product not found</Text>
          <Text className="mt-2 text-center text-[14px] text-[#6A6A6A]">
            {loadError ?? 'The product you are looking for does not exist.'}
          </Text>
        </View>
      </>
    );
  }

  const price = selectedVariant?.price ?? product.price;
  const heroUri =
    galleryImages[activeImageIndex] ?? selectedVariant?.image ?? product.image;
  const totalStock = selectedVariant?.stock ?? product.totalStock ?? 0;
  const isOutOfStock = totalStock <= 0;

  const handleAddToCart = () => {
    if (!selectedVariant || isOutOfStock) return false;
    const snapshot: Product = {
      ...product,
      price: selectedVariant.price,
      image: selectedVariant.image ?? product.image,
    };
    addToCart(snapshot, quantity, selectedVariant.id, {
      size: selectedVariant.size ?? null,
      color: selectedVariant.color ?? null,
    });
    addToast('success', L.common.success, L.cart.addSuccess);
    return true;
  };

  const handleBuyNow = () => {
    const added = handleAddToCart();
    if (!added) return;
    router.push('/checkout');
  };

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />

      <ScrollView className="flex-1 bg-[#F8FAFC]" showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-32 pt-3">
          <View className="overflow-hidden rounded-[28px] bg-white shadow-sm">
            <Image source={{ uri: heroUri }} className="h-[320px] w-full" resizeMode="cover" />
          </View>

          {galleryImages.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ paddingRight: 12 }}>
              <View className="flex-row gap-2">
                {galleryImages.map((img, idx) => (
                  <Pressable
                    key={`${img}-${idx}`}
                    onPress={() => setActiveImageIndex(idx)}
                    className={`overflow-hidden rounded-[16px] border-2 ${
                      idx === activeImageIndex ? 'border-[#F97316]' : 'border-transparent'
                    }`}>
                    <Image source={{ uri: img }} className="h-[64px] w-[64px]" resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}

          <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                {product.brand ? (
                  <Text className="text-[12px] font-semibold uppercase tracking-[2px] text-[#F97316]">
                    {product.brand}
                  </Text>
                ) : null}
                <Text className="mt-1 text-[22px] font-bold text-[#232327]">{product.name}</Text>
                <Text className="mt-2 text-[14px] leading-[22px] text-[#6A6A6A]">
                  {product.description}
                </Text>
              </View>
              {product.discount ? (
                <View className="rounded-full bg-[#FFF1F3] px-3 py-1">
                  <Text className="text-[12px] font-semibold text-[#F83758]">{product.discount}</Text>
                </View>
              ) : null}
            </View>

            <View className="mt-4 flex-row items-end gap-3">
              <Text className="text-[24px] font-bold text-[#232327]">{formatCurrency(price)}</Text>
              {product.compareAtPrice && product.compareAtPrice > price ? (
                <Text className="text-[14px] text-[#9CA3AF] line-through">
                  {formatCurrency(product.compareAtPrice)}
                </Text>
              ) : null}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <Ionicons name="star" size={16} color="#FFC107" />
              <Text className="text-[13px] font-medium text-[#4A4A4A]">
                {product.rating.toFixed(1)} • {product.reviews.toLocaleString()} reviews
              </Text>
              {product.shoeType ? (
                <Text className="ml-2 rounded-full bg-[#F3F4F6] px-2 py-1 text-[11px] capitalize text-[#4B5563]">
                  {product.shoeType}
                </Text>
              ) : null}
              {product.genderTarget ? (
                <Text className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[11px] capitalize text-[#4B5563]">
                  {product.genderTarget}
                </Text>
              ) : null}
            </View>
          </View>

          {sizes.length > 0 ? (
            <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <Text className="text-[16px] font-semibold text-[#232327]">Size (EU)</Text>
                <Pressable onPress={() => setShowSizeGuide((v) => !v)}>
                  <Text className="text-[13px] font-semibold text-[#F97316]">
                    {showSizeGuide ? 'Hide guide' : 'Size guide'}
                  </Text>
                </Pressable>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                {sizes.map((sz) => {
                  const variantForSize = product.variants.find(
                    (v) => v.size === sz && (selectedColor == null || v.color === selectedColor)
                  );
                  const isAvailable = (variantForSize?.stock ?? 0) > 0;
                  const isSelected = selectedSize === sz;
                  return (
                    <Pressable
                      key={sz}
                      onPress={() => {
                        const next = product.variants.find(
                          (v) =>
                            v.size === sz &&
                            (selectedColor == null || v.color === selectedColor) &&
                            v.stock > 0
                        ) ?? product.variants.find((v) => v.size === sz && v.stock > 0);
                        setSelectedSize(sz);
                        if (next?.color) setSelectedColor(next.color);
                      }}
                      disabled={!isAvailable}
                      className={`min-w-[52px] items-center rounded-[14px] border px-4 py-2 ${
                        isSelected
                          ? 'border-[#F97316] bg-[#FFF4ED]'
                          : isAvailable
                            ? 'border-[#E5E7EB] bg-white'
                            : 'border-[#E5E7EB] bg-[#F3F4F6] opacity-50'
                      }`}>
                      <Text
                        className={`text-[14px] font-semibold ${
                          isSelected ? 'text-[#F97316]' : 'text-[#1F2937]'
                        }`}>
                        {sz}
                      </Text>
                      {!isAvailable ? (
                        <Text className="text-[10px] text-[#9CA3AF]">Out</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {showSizeGuide ? (
                <View className="mt-4 rounded-[16px] bg-[#FFF7F2] p-3">
                  <View className="flex-row pb-2">
                    <Text className="flex-1 text-[12px] font-semibold uppercase text-[#F97316]">EU</Text>
                    <Text className="flex-1 text-[12px] font-semibold uppercase text-[#F97316]">US</Text>
                    <Text className="flex-1 text-[12px] font-semibold uppercase text-[#F97316]">CM</Text>
                  </View>
                  {SHOE_SIZE_GUIDE.map((row) => (
                    <View key={row.eu} className="flex-row py-1">
                      <Text className="flex-1 text-[13px] text-[#1F2937]">{row.eu}</Text>
                      <Text className="flex-1 text-[13px] text-[#1F2937]">{row.us}</Text>
                      <Text className="flex-1 text-[13px] text-[#1F2937]">{row.cm}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {colors.length > 0 ? (
            <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
              <Text className="text-[16px] font-semibold text-[#232327]">Color</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {colors.map((c) => {
                  const variantForColor = product.variants.find(
                    (v) => v.color === c && (selectedSize == null || v.size === selectedSize)
                  );
                  const isAvailable = (variantForColor?.stock ?? 0) > 0;
                  const isSelected = selectedColor === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        const next = product.variants.find(
                          (v) =>
                            v.color === c &&
                            (selectedSize == null || v.size === selectedSize) &&
                            v.stock > 0
                        ) ?? product.variants.find((v) => v.color === c && v.stock > 0);
                        setSelectedColor(c);
                        if (next?.size) setSelectedSize(next.size);
                      }}
                      disabled={!isAvailable}
                      className={`rounded-full border px-4 py-2 ${
                        isSelected
                          ? 'border-[#F97316] bg-[#FFF4ED]'
                          : isAvailable
                            ? 'border-[#E5E7EB] bg-white'
                            : 'border-[#E5E7EB] bg-[#F3F4F6] opacity-50'
                      }`}>
                      <Text
                        className={`text-[13px] font-semibold ${
                          isSelected ? 'text-[#F97316]' : 'text-[#1F2937]'
                        }`}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
            <Text className="text-[16px] font-semibold text-[#232327]">Lựa chọn hiện tại</Text>
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              {selectedVariant?.size ? (
                <View className="rounded-full bg-[#FFF4ED] px-3 py-1.5">
                  <Text className="text-[12px] font-semibold text-[#F97316]">
                    Size {selectedVariant.size}
                  </Text>
                </View>
              ) : null}
              {selectedVariant?.color ? (
                <View className="rounded-full bg-[#F3F4F6] px-3 py-1.5">
                  <Text className="text-[12px] font-semibold text-[#4B5563]">
                    {selectedVariant.color}
                  </Text>
                </View>
              ) : null}
              <View
                className={`rounded-full px-3 py-1.5 ${
                  isOutOfStock ? 'bg-[#FEF2F2]' : totalStock <= 5 ? 'bg-[#FFF7ED]' : 'bg-[#ECFDF3]'
                }`}>
                <Text
                  className={`text-[12px] font-semibold ${
                    isOutOfStock ? 'text-[#B91C1C]' : totalStock <= 5 ? 'text-[#C2410C]' : 'text-[#166534]'
                  }`}>
                  {isOutOfStock
                    ? 'Hết hàng'
                    : totalStock <= 5
                      ? `Sắp hết (${totalStock})`
                      : `Còn hàng (${totalStock})`}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-[16px] font-semibold text-[#232327]">Quantity</Text>
              <Text className={`text-[13px] font-semibold ${isOutOfStock ? 'text-[#B91C1C]' : 'text-[#16A34A]'}`}>
                {isOutOfStock ? 'Out of stock' : `${totalStock} in stock`}
              </Text>
            </View>
            <View className="mt-3 flex-row items-center gap-3">
              <Pressable
                onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                className="h-11 w-11 items-center justify-center rounded-full bg-[#FFF4ED]">
                <Text className="text-[22px] font-semibold text-[#F97316]">−</Text>
              </Pressable>
              <Text className="min-w-[44px] text-center text-[18px] font-semibold text-[#232327]">
                {quantity}
              </Text>
              <Pressable
                onPress={() =>
                  setQuantity((current) => Math.min(totalStock || current, current + 1))
                }
                disabled={isOutOfStock}
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  isOutOfStock ? 'bg-[#FFE3D5]' : 'bg-[#F97316]'
                }`}>
                <Text className="text-[22px] font-semibold text-white">+</Text>
              </Pressable>
            </View>
          </View>

          {product.shortDescription || product.usageType || product.season ? (
            <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
              <Text className="text-[16px] font-semibold text-[#232327]">Highlights</Text>
              <View className="mt-2 gap-1.5">
                {product.usageType ? (
                  <Text className="text-[13px] text-[#4B5563]">• Phù hợp: {product.usageType}</Text>
                ) : null}
                {product.season ? (
                  <Text className="text-[13px] text-[#4B5563]">• Mùa: {product.season}</Text>
                ) : null}
                {product.upperMaterial ? (
                  <Text className="text-[13px] text-[#4B5563]">
                    • Chất liệu thân: {product.upperMaterial}
                  </Text>
                ) : null}
                {product.soleMaterial ? (
                  <Text className="text-[13px] text-[#4B5563]">• Đế: {product.soleMaterial}</Text>
                ) : null}
                {product.closureType ? (
                  <Text className="text-[13px] text-[#4B5563]">
                    • Đóng/mở: {product.closureType}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[#F3F4F6] bg-white px-5 pb-6 pt-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              title={isOutOfStock ? 'Out of stock' : 'Add to Cart'}
              onPress={handleAddToCart}
              disabled={isOutOfStock || !selectedVariant}
              variant="secondary"
            />
          </View>
          <View className="flex-1">
            <Button
              title={isOutOfStock ? 'Out of stock' : 'Mua ngay'}
              onPress={handleBuyNow}
              disabled={isOutOfStock || !selectedVariant}
            />
          </View>
        </View>
      </View>
    </>
  );
}
