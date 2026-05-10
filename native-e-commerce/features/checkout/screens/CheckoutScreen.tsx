import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import { useToast } from '~/components/ToastProvider';
import { AppInput } from '~/components/ui/AppInput';
import { useCart } from '~/features/cart/hooks/useCart';
import { getAddresses } from '~/features/account/services/addressStorage';
import { getAccessToken } from '~/lib/api/token';
import { placeOrder } from '~/lib/api/orders';

import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { Address } from '~/lib/types/models';
import { variantIdForOrderApi } from '~/lib/utils/variant';
import { formatCurrency } from '~/lib/utils/formatters';

const paymentMethods = [
  {
    id: 'card',
    title: 'Credit / Debit Card',
    subtitle: 'Visa, Mastercard, JCB',
    icon: 'card-outline' as const,
  },
  {
    id: 'cod',
    title: 'Cash on Delivery',
    subtitle: 'Pay when your parcel arrives',
    icon: 'cash-outline' as const,
  },
  {
    id: 'wallet',
    title: 'VietQR / Bank Transfer',
    subtitle: 'Scan bằng ứng dụng ngân hàng',
    icon: 'wallet-outline' as const,
  },
];

const SHIPPING_FEE_VND = 30_000;
const FREE_SHIPPING_THRESHOLD = 1_500_000;

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ promoCode?: string | string[] }>();
  const locale = getAppLocale();
  const L = strings(locale);
  const { items, clearCart } = useCart();
  const { addToast } = useToast();
  const [shippingAddresses, setShippingAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
    paymentMethods[2]?.id ?? paymentMethods[0]?.id ?? ''
  );
  const [placing, setPlacing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const promoFromRoute = Array.isArray(params.promoCode) ? params.promoCode[0] : params.promoCode;

  useEffect(() => {
    const normalized = promoFromRoute?.trim().toUpperCase();
    if (!normalized) return;
    setPromoInput((prev) => prev || normalized);
    setPromoCode((prev) => prev ?? normalized);
  }, [promoFromRoute]);

  const refreshAddresses = useCallback(async () => {
    try {
      const list = await getAddresses();
      setShippingAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      setSelectedAddressId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        return def?.id ?? '';
      });
    } catch {
      setShippingAddresses([]);
      setSelectedAddressId('');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAddresses();
    }, [refreshAddresses])
  );

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping =
    items.length === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE_VND;
  const discount = 0;
  const total = subtotal + shipping - discount;

  const selectedAddress = useMemo(
    () =>
      shippingAddresses.find((address) => address.id === selectedAddressId) ?? shippingAddresses[0],
    [selectedAddressId, shippingAddresses]
  );

  const selectedPaymentMethod = useMemo(
    () =>
      paymentMethods.find((method) => method.id === selectedPaymentMethodId) ?? paymentMethods[0],
    [selectedPaymentMethodId]
  );
  const canPlaceOrder = items.length > 0 && Boolean(selectedAddress) && !placing;

  const handleCheckoutConfirm = async () => {
    const token = await getAccessToken();
    if (!token) {
      Alert.alert(L.errors.checkoutNeedLoginTitle, L.errors.checkoutNeedLoginBody, [
        { text: L.common.cancel, style: 'cancel' },
        { text: L.common.login, onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    if (!selectedAddress) {
      Alert.alert(L.errors.checkoutNeedAddressTitle, L.errors.checkoutNeedAddressBody, [
        { text: L.common.ok, onPress: () => router.push('/addresses/new') },
      ]);
      return;
    }
    if (!items.length) return;

    setShowConfirm(true);
  };

  const handleConfirmPlaceOrder = () => {
    setShowConfirm(false);
    void handlePlaceOrder();
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const created = await placeOrder({
        items: items.map((it) => ({
          productId: it.product.id,
          variantId: variantIdForOrderApi(it.product.id, it.variantId),
          quantity: it.quantity,
        })),
        shippingAddressId: selectedAddress!.id,
        paymentMethod: selectedPaymentMethodId,
        promoCode: promoCode ?? undefined,
      });
      clearCart();
      addToast('success', L.checkout.successTitle, L.checkout.successMessage);
      router.push({
        pathname: '/payment-qr' as any,
        params: {
          orderId: created.id,
          promoCode: promoCode ?? undefined,
        },
      });
    } catch (e) {
      const msg = resolveApiError(e, locale);
      addToast('error', L.common.error, msg);
      router.replace({
        pathname: '/checkout-failure',
        params: {
          error: msg,
          promoCode: promoCode ?? undefined,
        },
      });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Thanh toán',
          headerShadowVisible: false,
        }}
      />

      <View className="flex-1 bg-[#F8FAFC]">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="px-5 pb-8 pt-3">
            <Text className="text-[13px] uppercase tracking-[3px] text-[#F97316]">
              Secure checkout
            </Text>
            <Text className="mt-2 text-[30px] font-bold text-[#111827]">Payment</Text>

            {items.length === 0 ? (
              <View className="mt-5 rounded-[28px] bg-white p-6 shadow-sm">
                <Text className="text-center text-[15px] text-[#6B7280]">
                  {L.empty.checkoutCart}
                </Text>
                <View className="mt-4">
                  <Button
                    title={L.empty.checkoutBackShop}
                    onPress={() => router.replace('/(tabs)')}
                  />
                </View>
              </View>
            ) : (
              <>
                <View className="mt-5 rounded-[28px] bg-white p-4 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-[16px] font-semibold text-[#111827]">
                        Địa chỉ nhận hàng
                      </Text>
                      <Text className="mt-1 text-[13px] text-[#6B7280]">
                        Chọn địa chỉ giao hàng cho đơn hàng này
                      </Text>
                    </View>
                    <Pressable onPress={() => router.push('/address')}>
                      <Text className="text-[13px] font-semibold text-[#F97316]">Đổi</Text>
                    </Pressable>
                  </View>

                  <View className="mt-4 gap-3">
                    {shippingAddresses.length === 0 ? (
                      <Text className="text-[14px] text-[#6B7280]">
                        Chưa có địa chỉ. Đăng nhập và thêm địa chỉ trong Address book.
                      </Text>
                    ) : (
                      shippingAddresses.map((address) => {
                        const isSelected = address.id === selectedAddressId;

                        return (
                          <Pressable
                            key={address.id}
                            onPress={() => setSelectedAddressId(address.id)}
                            className={`rounded-[22px] border p-4 ${
                              isSelected
                                ? 'border-[#F97316] bg-[#FFF9F5]'
                                : 'border-[#E5E7EB] bg-white'
                            }`}>
                            <View className="flex-row items-start gap-3">
                              <View
                                className={`mt-1 h-10 w-10 items-center justify-center rounded-full ${
                                  isSelected ? 'bg-[#F97316]' : 'bg-[#F3F4F6]'
                                }`}>
                                <Ionicons
                                  name="location-outline"
                                  size={18}
                                  color={isSelected ? '#FFFFFF' : '#6B7280'}
                                />
                              </View>
                              <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                  <Text className="text-[15px] font-semibold text-[#111827]">
                                    {address.name}
                                  </Text>
                                  {address.isDefault ? (
                                    <View className="rounded-full bg-[#DCFCE7] px-2 py-1">
                                      <Text className="text-[10px] font-semibold text-[#166534]">
                                        Default
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text className="mt-1 text-[13px] leading-[20px] text-[#6B7280]">
                                  {address.address}
                                </Text>
                                <Text className="mt-1 text-[13px] text-[#6B7280]">
                                  {address.city} • {address.phone}
                                </Text>
                              </View>
                              <View
                                className={`mt-1 h-5 w-5 rounded-full border-2 ${
                                  isSelected
                                    ? 'border-[#F97316] bg-[#F97316]'
                                    : 'border-[#D1D5DB] bg-white'
                                }`}>
                                {isSelected ? (
                                  <View className="m-[3px] h-1.5 w-1.5 rounded-full bg-white" />
                                ) : null}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>

                  <Pressable
                    className="mt-4 flex-row items-center justify-between rounded-[20px] bg-[#F8FAFC] px-4 py-3"
                    onPress={() => router.push('/addresses')}>
                    <View>
                      <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                        Quản lý địa chỉ
                      </Text>
                      <Text className="mt-1 text-[13px] font-semibold text-[#111827]">
                        Mở sổ địa chỉ
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                  </Pressable>
                </View>

                <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
                  <Text className="text-[16px] font-semibold text-[#111827]">
                    Phương thức thanh toán
                  </Text>
                  <Text className="mt-1 text-[13px] text-[#6B7280]">
                    Chọn cách bạn muốn thanh toán
                  </Text>

                  <View className="mt-4 gap-3">
                    {paymentMethods.map((method) => {
                      const isSelected = method.id === selectedPaymentMethodId;
                      return (
                        <Pressable
                          key={method.id}
                          onPress={() => setSelectedPaymentMethodId(method.id)}
                          className={`flex-row items-center rounded-[22px] border p-4 ${
                            isSelected
                              ? 'border-[#F97316] bg-[#FFF7F2]'
                              : 'border-[#E5E7EB] bg-white'
                          }`}>
                          <View
                            className={`mr-3 h-11 w-11 items-center justify-center rounded-full ${
                              isSelected ? 'bg-[#F97316]' : 'bg-[#F3F4F6]'
                            }`}>
                            <Ionicons
                              name={method.icon}
                              size={20}
                              color={isSelected ? '#FFFFFF' : '#6B7280'}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[15px] font-semibold text-[#111827]">
                              {method.title}
                            </Text>
                            <Text className="mt-1 text-[13px] text-[#6B7280]">
                              {method.subtitle}
                            </Text>
                          </View>
                          <View
                            className={`h-5 w-5 rounded-full border-2 ${
                              isSelected
                                ? 'border-[#F97316] bg-[#F97316]'
                                : 'border-[#D1D5DB] bg-white'
                            }`}>
                            {isSelected ? (
                              <View className="m-[3px] h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
                  <Text className="text-[16px] font-semibold text-[#111827]">Promo code</Text>
                  <Text className="mt-1 text-[13px] text-[#6B7280]">
                    Mã sẽ được kiểm tra khi đặt đơn.
                  </Text>
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
                        setPromoCode(normalized);
                        setPromoInput(normalized);
                      }}
                      className="rounded-full bg-[#F97316] px-4 py-2.5">
                      <Text className="text-[12px] font-semibold text-white">Áp dụng</Text>
                    </Pressable>
                  </View>
                  {promoCode ? (
                    <View className="mt-3 flex-row items-center justify-between rounded-[14px] bg-[#ECFDF3] px-3 py-2">
                      <Text className="text-[12px] font-semibold text-[#166534]">
                        Đang áp dụng: {promoCode}
                      </Text>
                      <Pressable onPress={() => setPromoCode(null)}>
                        <Text className="text-[12px] font-semibold text-[#166534]">Bỏ</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
                  <Text className="text-[16px] font-semibold text-[#111827]">Tóm tắt đơn hàng</Text>

                  <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
                  <SummaryRow
                    label="Shipping"
                    value={
                      shipping === 0 && items.length > 0 ? 'Miễn phí' : formatCurrency(shipping)
                    }
                  />
                  <SummaryRow
                    label="Discount"
                    value={`-${formatCurrency(discount)}`}
                    valueClass="text-[#12B76A]"
                  />
                  {promoCode ? (
                    <Text className="mb-3 text-[12px] text-[#16A34A]">
                      Promo `{promoCode}` sẽ được xác nhận khi nhấn Place Order.
                    </Text>
                  ) : null}

                  <View className="my-3 h-[1px] bg-[#F3F4F6]" />

                  <SummaryRow label="Total" value={formatCurrency(total)} total />

                  <View className="mt-3 rounded-[20px] bg-[#F8FAFC] p-3">
                    <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                      Phương thức thanh toán đã chọn
                    </Text>
                    <Text className="mt-1 text-[14px] font-semibold text-[#111827]">
                      {selectedPaymentMethod?.title}
                    </Text>
                  </View>
                </View>

                <View className="mt-5">
                  <Button
                    title={placing ? 'Placing…' : 'Xác nhận'}
                    onPress={handleCheckoutConfirm}
                    disabled={!canPlaceOrder}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {showConfirm ? (
          <View className="absolute inset-0 z-50 items-center justify-center bg-black/40 px-5">
            <View className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-xl">
              <Text className="text-[18px] font-semibold text-[#111827]">
                {L.errors.checkoutConfirmTitle}
              </Text>
              <Text className="mt-2 text-[14px] leading-[22px] text-[#6B7280]">
                Total: {formatCurrency(total)}. Are you sure?
              </Text>
              <View className="mt-4 rounded-[16px] bg-[#F8FAFC] p-3">
                <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                  Order snapshot
                </Text>
                <Text className="mt-1 text-[13px] text-[#111827]">
                  {items.length} sản phẩm · {selectedPaymentMethod?.title}
                </Text>
                <Text className="mt-1 text-[13px] text-[#6B7280]" numberOfLines={2}>
                  {selectedAddress?.address}, {selectedAddress?.city}
                </Text>
                {promoCode ? (
                  <Text className="mt-1 text-[12px] font-semibold text-[#166534]">
                    Promo: {promoCode}
                  </Text>
                ) : null}
              </View>

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  className="flex-1 items-center rounded-[20px] border border-[#E5E7EB] bg-white px-4 py-3"
                  onPress={() => setShowConfirm(false)}>
                  <Text className="font-semibold text-[#111827]">{L.common.cancel}</Text>
                </Pressable>
                <Pressable
                  className="flex-1 items-center rounded-[20px] bg-[#F97316] px-4 py-3"
                  disabled={placing}
                  onPress={handleConfirmPlaceOrder}>
                  <Text className="font-semibold text-white">
                    {placing ? 'Placing…' : L.errors.checkoutConfirmPlace}
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

function SummaryRow({
  label,
  value,
  valueClass = 'text-[#111827]',
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
        className={
          total ? 'text-[16px] font-semibold text-[#111827]' : 'text-[14px] text-[#6B7280]'
        }>
        {label}
      </Text>
      <Text
        className={`${total ? 'text-[20px] font-bold' : 'text-[14px] font-semibold'} ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}
