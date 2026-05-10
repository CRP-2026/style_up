import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import { useToast } from '~/components/ToastProvider';
import { AppInput } from '~/components/ui/AppInput';
import { useCart } from '~/features/cart/hooks/useCart';
import { getAddresses } from '~/features/account/services/addressStorage';
import { getAccessToken } from '~/lib/api/token';
import type { CartItem } from '~/lib/store/cartStore';
import { formatCurrency } from '~/lib/utils/formatters';
import { getAppLocale, strings } from '~/lib/i18n';

export default function CartScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const { items, updateQuantity, removeFromCart } = useCart();
  const { addToast } = useToast();
  const [addressPreview, setAddressPreview] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{
    productId: string;
    variantId: string | null;
    productName: string;
  } | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const handleRemoveItem = (productId: string, variantId: string | null, productName: string) => {
    setPendingDelete({ productId, variantId, productName });
  };

  const confirmDeleteItem = () => {
    if (!pendingDelete) return;
    removeFromCart(pendingDelete.productId, pendingDelete.variantId);
    addToast('success', L.common.success, `${pendingDelete.productName}: ${L.cart.removeSuccess}`);
    setPendingDelete(null);
  };

  const handleCheckoutPress = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      Alert.alert(L.errors.checkoutNeedLoginTitle, L.errors.checkoutNeedLoginBody, [
        { text: L.common.cancel, style: 'cancel' },
        { text: L.common.login, onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (appliedPromo) {
      router.push({ pathname: '/checkout', params: { promoCode: appliedPromo } });
      return;
    }
    router.push('/checkout');
  }, [L, appliedPromo, router]);

  const refreshPreview = useCallback(async () => {
    const S = strings(locale);
    try {
      const list = await getAddresses();
      const d = list.find((a) => a.isDefault) ?? list[0];
      setAddressPreview(d ? `${d.address}, ${d.city}` : S.cart.addressBookPrompt);
    } catch {
      setAddressPreview(S.cart.addressLoginPrompt);
    }
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      void refreshPreview();
    }, [refreshPreview])
  );

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const shipping = items.length === 0 ? 0 : subtotal >= 1_500_000 ? 0 : 30_000;
  const discount = 0;
  const total = subtotal + shipping - discount;
  const freeShippingProgress = Math.min(1, subtotal / 1_500_000);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Giỏ hàng',
          headerShadowVisible: false,
        }}
      />

      <View className="flex-1 bg-[#FFF8F4]">
        <View className="absolute left-[-90px] top-[-100px] h-[240px] w-[240px] rounded-full bg-[#FFE6D8]" />
        <View className="absolute right-[-120px] top-[120px] h-[280px] w-[280px] rounded-full bg-[#FFECE2]" />

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-5 pb-6 pt-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[13px] uppercase tracking-[3px] text-[#F97316]">
                  Shopping bag
                </Text>
                <Text className="mt-2 text-[30px] font-bold text-[#1F1F1F]">My Cart</Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <Ionicons name="cart-outline" size={20} color="#F97316" />
              </View>
            </View>

            <View className="mt-5 rounded-[28px] bg-white p-4 shadow-sm">
              <View className="flex-row items-center gap-3 rounded-[20px] bg-[#FFF4ED] px-4 py-3">
                <Ionicons name="location-outline" size={18} color="#F97316" />
                <View className="flex-1">
                  <Text className="text-[12px] uppercase tracking-[1.5px] text-[#F97316]">
                    Delivery address
                  </Text>
                  <Text className="mt-1 text-[14px] font-semibold text-[#1F1F1F]" numberOfLines={2}>
                    {addressPreview}
                  </Text>
                </View>
                <Pressable onPress={() => router.push('/address')}>
                  <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                </Pressable>
              </View>
            </View>

            <View className="mt-4 gap-4">
              {items.length === 0 ? (
                <View className="rounded-[20px] bg-white p-6 shadow-sm">
                  <Text className="text-center text-[14px] text-[#7A7A7A]">
                    {L.empty.cartTitle}
                  </Text>
                  <Text className="mt-2 text-center text-[13px] text-[#9CA3AF]">
                    {L.empty.cartHint}
                  </Text>
                  <View className="mt-4 items-center">
                    <Pressable
                      className="rounded-full bg-[#F97316] px-5 py-2.5"
                      onPress={() => router.push('/(tabs)')}>
                      <Text className="text-[13px] font-semibold text-white">
                        {L.empty.cartContinue}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                items.map((it) => (
                  <CartItemCard
                    key={`${it.product.id}::${it.variantId ?? ''}`}
                    item={it}
                    onChange={updateQuantity}
                    onRemove={(pid, vid) => handleRemoveItem(pid, vid, it.product.name)}
                  />
                ))
              )}
            </View>

            <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
              <Text className="text-[16px] font-semibold text-[#1F1F1F]">Promo code</Text>
              <View className="mt-3 flex-row items-end gap-2">
                <View className="flex-1">
                  <AppInput
                    value={promoInput}
                    onChangeText={setPromoInput}
                    placeholder="Nhập mã giảm giá"
                    autoCapitalize="characters"
                  />
                </View>
                <Pressable
                  onPress={() => {
                    const normalized = promoInput.trim().toUpperCase();
                    if (!normalized) return;
                    setAppliedPromo(normalized);
                    setPromoInput(normalized);
                  }}
                  className="rounded-full bg-[#F97316] px-4 py-2.5">
                  <Text className="text-[12px] font-semibold text-white">Áp dụng</Text>
                </Pressable>
              </View>
              {appliedPromo ? (
                <View className="mt-3 flex-row items-center justify-between rounded-[14px] bg-[#ECFDF3] px-3 py-2">
                  <Text className="text-[12px] font-semibold text-[#166534]">
                    Đang áp dụng: {appliedPromo}
                  </Text>
                  <Pressable onPress={() => setAppliedPromo(null)}>
                    <Text className="text-[12px] font-semibold text-[#166534]">Bỏ</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
              {items.length > 0 ? (
                <View className="mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#F97316]">
                      Free shipping
                    </Text>
                    <Text className="text-[12px] text-[#6B7280]">
                      {shipping === 0
                        ? 'Đơn của bạn được miễn phí ship'
                        : `Mua thêm ${formatCurrency(1_500_000 - subtotal)} để miễn phí ship`}
                    </Text>
                  </View>
                  <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#FFE4D6]">
                    <View
                      style={{ width: `${Math.round(freeShippingProgress * 100)}%` }}
                      className="h-full rounded-full bg-[#F97316]"
                    />
                  </View>
                </View>
              ) : null}

              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryRow
                label="Shipping"
                value={shipping === 0 && items.length > 0 ? 'Miễn phí' : formatCurrency(shipping)}
              />
              <SummaryRow
                label="Discount"
                value={`-${formatCurrency(discount)}`}
                valueClass="text-[#12B76A]"
              />

              <View className="my-4 h-[1px] bg-[#F1F1F1]" />

              <SummaryRow label="Total" value={formatCurrency(total)} total />

              <View className="mt-4">
                <Button title="Thanh toán" onPress={handleCheckoutPress} />
              </View>
            </View>
          </View>
        </ScrollView>

        {pendingDelete ? (
          <View className="absolute inset-0 z-50 items-center justify-center bg-black/35 px-6">
            <View className="w-full max-w-[420px] border border-[#FFE4D6] bg-white p-5 shadow-xl">
              <Text className="text-[19px] font-bold text-[#1F2937]">
                {L.cart.removeConfirmTitle}
              </Text>
              <Text className="mt-2 text-[14px] leading-[21px] text-[#6B7280]">
                {L.cart.removeConfirmBody}
              </Text>
              <Text className="mt-2 text-[13px] font-medium text-[#9CA3AF]">
                {pendingDelete.productName}
              </Text>
              <View className="mt-5 flex-row gap-3">
                <Pressable
                  onPress={() => setPendingDelete(null)}
                  className="flex-1 items-center rounded-[18px] border border-[#FED7AA]  py-3">
                  <Text className="text-[14px] font-semibold text-[#9A3412]">
                    {L.common.cancel}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmDeleteItem}
                  className="flex-1 items-center rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] py-3">
                  <Text className="text-[14px] font-semibold text-[#B91C1C]">
                    {L.common.delete}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}

function CartItemCard({
  item,
  onChange,
  onRemove,
}: {
  item: CartItem;
  onChange: (productId: string, variantId: string | null, qty: number) => void;
  onRemove: (productId: string, variantId: string | null) => void;
}) {
  const vid = item.variantId ?? null;
  const priceNum = Number(item.product.price);
  return (
    <View className="overflow-hidden rounded-[28px] bg-white shadow-sm">
      <View className="flex-row p-3">
        <Image
          source={{ uri: item.product.image }}
          className="h-[112px] w-[112px] rounded-[22px]"
          resizeMode="cover"
        />

        <View className="ml-4 flex-1 justify-between py-1">
          <View>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-[#1F1F1F]" numberOfLines={2}>
                  {item.product.name}
                </Text>
                {item.variantSize || item.variantColor ? (
                  <View className="mt-1 flex-row flex-wrap gap-1.5">
                    {item.variantSize ? (
                      <View className="rounded-full bg-[#FFF4ED] px-2 py-0.5">
                        <Text className="text-[11px] font-semibold text-[#F97316]">
                          Size {item.variantSize}
                        </Text>
                      </View>
                    ) : null}
                    {item.variantColor ? (
                      <View className="rounded-full bg-[#F3F4F6] px-2 py-0.5">
                        <Text className="text-[11px] font-semibold text-[#4B5563]">
                          {item.variantColor}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text
                    className="mt-1 text-[12px] leading-[16px] text-[#7A7A7A]"
                    numberOfLines={2}>
                    {item.product.description}
                  </Text>
                )}
              </View>

              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-[#FFF4ED]"
                onPress={() => onRemove(item.product.id, vid)}>
                <Ionicons name="trash-outline" size={18} color="#F97316" />
              </Pressable>
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-[17px] font-bold text-[#1F1F1F]">
                {formatCurrency(priceNum)}
              </Text>
              {item.product.compareAtPrice != null ? (
                <Text className="text-[12px] text-[#A0A0A0] line-through">
                  {formatCurrency(item.product.compareAtPrice)}
                </Text>
              ) : null}
              {item.product.discount ? (
                <Text className="text-[12px] font-semibold text-[#F97316]">
                  {item.product.discount}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center rounded-full bg-[#FFF4ED] p-1">
              <QuantityButton
                label="-"
                onPress={() => {
                  if (item.quantity <= 1) {
                    onRemove(item.product.id, vid);
                    return;
                  }
                  onChange(item.product.id, vid, item.quantity - 1);
                }}
              />
              <Text className="min-w-[34px] text-center text-[14px] font-semibold text-[#1F1F1F]">
                {item.quantity}
              </Text>
              <QuantityButton
                label="+"
                filled
                onPress={() => onChange(item.product.id, vid, item.quantity + 1)}
              />
            </View>

            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text className="text-[12px] font-medium text-[#5B5B5B]">
                {(item.product.rating || 0).toFixed(1)} •{' '}
                {(item.product.reviews || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function QuantityButton({
  label,
  filled = false,
  onPress,
}: {
  label: string;
  filled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-8 w-8 items-center justify-center rounded-full ${filled ? 'bg-[#F97316]' : 'bg-transparent'}`}>
      <Text className={`text-[18px] font-semibold ${filled ? 'text-white' : 'text-[#F97316]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = 'text-[#1F1F1F]',
  total = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  total?: boolean;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text
        className={`${total ? 'text-[16px] font-semibold text-[#1F1F1F]' : 'text-[14px] text-[#6B6B6B]'}`}>
        {label}
      </Text>
      <Text
        className={`${total ? 'text-[20px] font-bold' : 'text-[14px] font-semibold'} ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}
