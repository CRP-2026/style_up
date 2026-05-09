import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from '~/components/Button';
import { useToast } from '~/components/ToastProvider';
import { ApiError } from '~/lib/api/errors';
import { cancelOrder, fetchOrderDetail } from '~/lib/api/orders';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { OrderDetail, OrderStatus } from '~/lib/types/orders';
import { formatCurrency, formatDate } from '~/lib/utils/formatters';

function statusBadgeColor(status: OrderStatus) {
  switch (status) {
    case 'delivered':
      return { bg: '#DCFCE7', fg: '#166534' };
    case 'shipped':
      return { bg: '#FEF3C7', fg: '#92400E' };
    case 'processing':
      return { bg: '#DBEAFE', fg: '#1D4ED8' };
    case 'cancelled':
      return { bg: '#FEE2E2', fg: '#991B1B' };
    case 'pending':
    default:
      return { bg: '#F3F4F6', fg: '#374151' };
  }
}

const CANCELLABLE: OrderStatus[] = ['pending', 'processing'];

export default function OrderDetailScreen() {
  const locale = getAppLocale();
  const L = strings(locale);
  const router = useRouter();
  const { addToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const resolvedId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(resolvedId));
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!resolvedId) {
        setOrder(null);
        setLoading(false);
        return;
      }
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const o = await fetchOrderDetail(resolvedId);
        setOrder(o);
      } catch (e) {
        setOrder(null);
        setError(e instanceof ApiError ? resolveApiError(e, locale) : L.errors.orderLoadFailed);
      } finally {
        if (mode === 'initial') setLoading(false);
        else setRefreshing(false);
      }
    },
    [resolvedId, locale, L.errors.orderLoadFailed]
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const subtotal = useMemo(
    () =>
      order?.subtotal ?? (order ? order.items.reduce((s, i) => s + i.price * i.quantity, 0) : 0),
    [order]
  );

  const shippingFee = useMemo(() => {
    if (!order) return 0;
    if (order.shippingFee != null) return order.shippingFee;
    return Math.max(0, order.total - subtotal);
  }, [order, subtotal]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      addToast('success', L.common.success, 'Đã huỷ đơn hàng.');
    } catch (e) {
      const msg = e instanceof ApiError ? resolveApiError(e, locale) : L.errors.orderLoadFailed;
      addToast('error', L.common.error, msg);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-[18px] font-semibold text-[#1F2937]">
            {L.orders.detailNotFoundTitle}
          </Text>
          <Text className="mt-2 text-center text-[14px] text-[#6B7280]">
            {error ?? L.orders.detailNotFoundHint}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-full bg-[#F97316] px-5 py-2.5">
            <Text className="text-[13px] font-semibold text-white">{L.orders.detailGoBack}</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const badge = statusBadgeColor(order.status);
  const canCancel = CANCELLABLE.includes(order.status);

  return (
    <>
      <Stack.Screen options={{ title: 'Order Details' }} />

      <ScrollView
        className="flex-1 bg-[#F4F4F4]"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor="#F97316" />
        }>
        <View className="mt-3 rounded-[28px] bg-white p-4 mx-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[16px] font-bold text-[#1F2937]">#{order.code}</Text>
              <Text className="mt-1 text-[12px] text-[#6B7280]">{formatDate(order.date)}</Text>
            </View>
            <View
              style={{ backgroundColor: badge.bg }}
              className="rounded-full px-3 py-1.5">
              <Text style={{ color: badge.fg }} className="text-[12px] font-semibold capitalize">
                {order.status}
              </Text>
            </View>
          </View>

          {order.tracking ? (
            <View className="mt-3 rounded-[18px] bg-[#FFF7F2] px-3 py-2.5">
              <Text className="text-[11px] uppercase tracking-[1.5px] text-[#F97316]">
                Tracking number
              </Text>
              <Text className="mt-1 text-[14px] font-semibold text-[#1F2937]">{order.tracking}</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-3 rounded-[28px] bg-white p-4 mx-4 shadow-sm">
          <Text className="text-[16px] font-semibold text-[#1F2937]">Tiến trình giao hàng</Text>
          <View className="mt-3">
            {order.timeline.length === 0 ? (
              <Text className="text-[13px] text-[#6B7280]">Chưa có cập nhật.</Text>
            ) : (
              order.timeline.map((event, index) => {
                const last = index === order.timeline.length - 1;
                return (
                  <View key={`${event.date}-${index}`} className="flex-row">
                    <View className="mr-3 items-center">
                      <View
                        className={`h-3 w-3 rounded-full ${event.completed ? 'bg-[#16A34A]' : 'bg-[#E5E7EB]'}`}
                      />
                      {!last ? (
                        <View
                          className={`mt-1 w-[2px] flex-1 ${event.completed ? 'bg-[#16A34A]' : 'bg-[#E5E7EB]'}`}
                          style={{ minHeight: 32 }}
                        />
                      ) : null}
                    </View>
                    <View className="flex-1 pb-3">
                      <Text className="text-[14px] font-semibold text-[#1F2937]">{event.status}</Text>
                      <Text className="text-[12px] text-[#6B7280]">{formatDate(event.date)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View className="mt-3 rounded-[28px] bg-white p-4 mx-4 shadow-sm">
          <Text className="text-[16px] font-semibold text-[#1F2937]">Sản phẩm</Text>
          {order.items.map((item) => (
            <View
              key={item.id}
              className="mt-3 flex-row items-center gap-3 rounded-[18px] bg-[#F9FAFB] p-3">
              {item.image ? (
                <Image source={{ uri: item.image }} className="h-16 w-16 rounded-[12px]" />
              ) : (
                <View className="h-16 w-16 rounded-[12px] bg-[#E5E7EB]" />
              )}
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-[#1F2937]" numberOfLines={2}>
                  {item.name}
                </Text>
                <View className="mt-1 flex-row flex-wrap gap-1.5">
                  {item.size ? (
                    <View className="rounded-full bg-[#FFF4ED] px-2 py-0.5">
                      <Text className="text-[11px] font-semibold text-[#F97316]">
                        Size {item.size}
                      </Text>
                    </View>
                  ) : null}
                  {item.color ? (
                    <View className="rounded-full bg-[#F3F4F6] px-2 py-0.5">
                      <Text className="text-[11px] font-semibold text-[#4B5563]">{item.color}</Text>
                    </View>
                  ) : null}
                  <Text className="text-[12px] text-[#6B7280]">x{item.quantity}</Text>
                </View>
              </View>
              <Text className="text-[14px] font-bold text-[#1F2937]">
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-3 rounded-[28px] bg-white p-4 mx-4 shadow-sm">
          <Text className="text-[16px] font-semibold text-[#1F2937]">Địa chỉ giao hàng</Text>
          <View className="mt-3 rounded-[18px] bg-[#F9FAFB] p-3">
            <Text className="text-[14px] font-semibold text-[#1F2937]">
              {order.shippingAddress.name}
            </Text>
            <Text className="mt-1 text-[13px] text-[#6B7280]">
              {order.shippingAddress.address}
            </Text>
            <Text className="text-[13px] text-[#6B7280]">{order.shippingAddress.city}</Text>
            <Text className="mt-1 text-[12px] text-[#9CA3AF]">
              ☎ {order.shippingAddress.phone}
            </Text>
          </View>
        </View>

        <View className="mt-3 rounded-[28px] bg-white p-4 mx-4 mb-4 shadow-sm">
          <Text className="text-[16px] font-semibold text-[#1F2937]">Thanh toán</Text>
          <View className="mt-3 gap-2">
            <SummaryRow label="Tạm tính" value={formatCurrency(subtotal)} />
            <SummaryRow
              label="Phí vận chuyển"
              value={shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}
            />
            {order.discountTotal && order.discountTotal > 0 ? (
              <SummaryRow
                label="Giảm giá"
                value={`-${formatCurrency(order.discountTotal)}`}
                valueClass="text-[#16A34A]"
              />
            ) : null}
            <View className="my-2 h-[1px] bg-[#F3F4F6]" />
            <SummaryRow label="Tổng" value={formatCurrency(order.total)} bold />
            <View className="mt-2 flex-row items-center justify-between rounded-[12px] bg-[#F9FAFB] px-3 py-2">
              <Text className="text-[12px] text-[#6B7280]">Phương thức</Text>
              <Text className="text-[13px] font-semibold text-[#1F2937]">
                {order.paymentMethod}
              </Text>
            </View>
          </View>

          {canCancel ? (
            <View className="mt-4">
              <Button
                title={cancelling ? 'Đang huỷ...' : 'Huỷ đơn'}
                onPress={handleCancel}
                disabled={cancelling}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = 'text-[#1F2937]',
  bold = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={bold ? 'text-[16px] font-semibold text-[#1F2937]' : 'text-[14px] text-[#6B7280]'}>
        {label}
      </Text>
      <Text
        className={`${bold ? 'text-[18px] font-bold' : 'text-[14px] font-semibold'} ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}
