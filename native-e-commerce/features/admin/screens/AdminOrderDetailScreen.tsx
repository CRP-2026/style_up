import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from '~/components/Button';
import { useToast } from '~/components/ToastProvider';
import { AppInput } from '~/components/ui/AppInput';
import { AppCard } from '~/components/ui/AppCard';
import { LoadingBlock } from '~/components/ui/StateBlocks';
import { adminGetOrder, adminUpdateOrderStatus } from '~/lib/api/admin';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { OrderDetail, OrderStatus } from '~/lib/types/orders';
import { formatCurrency, formatDate } from '~/lib/utils/formatters';

const NEXT_STATES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Hoàn tất',
  cancelled: 'Huỷ đơn',
};

export default function AdminOrderDetailScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const o = await adminGetOrder(orderId);
      setOrder(o);
      setTracking(o.tracking ?? '');
    } catch (e) {
      addToast(
        'error',
        L.common.error,
        e instanceof ApiError ? resolveApiError(e, locale) : L.errors.orderLoadFailed
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, locale, L.common.error, L.errors.orderLoadFailed, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onTransition = async (next: OrderStatus) => {
    if (!order) return;
    setSubmitting(true);
    try {
      const updated = await adminUpdateOrderStatus(order.id, {
        status: next,
        note: note || undefined,
        trackingNumber: tracking || undefined,
      });
      setOrder(updated);
      addToast('success', L.common.success, `Đã chuyển trạng thái → ${STATUS_LABEL[next]}`);
      setNote('');
    } catch (e) {
      addToast(
        'error',
        L.common.error,
        e instanceof ApiError ? resolveApiError(e, locale) : 'Không cập nhật được trạng thái'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Admin · Chi tiết' }} />
        <View className="flex-1 bg-[#F4F4F4] px-4">
          <LoadingBlock label="Đang tải chi tiết đơn hàng..." />
        </View>
      </>
    );
  }

  const next = NEXT_STATES[order.status];

  return (
    <>
      <Stack.Screen options={{ title: `Admin · #${order.code}` }} />
      <ScrollView className="flex-1 bg-[#F4F4F4]">
        <AppCard className="m-4">
          <Text className="text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">Mã đơn</Text>
          <Text className="mt-1 text-[18px] font-bold text-[#1F2937]">#{order.code}</Text>
          <Text className="mt-1 text-[13px] text-[#6B7280]">{formatDate(order.date)}</Text>
          <Text className="mt-2 text-[13px] text-[#6B7280]">
            {order.shippingAddress.name} • {order.shippingAddress.phone}
          </Text>
          <Text className="text-[13px] text-[#6B7280]">
            {order.shippingAddress.address}, {order.shippingAddress.city}
          </Text>

          <View className="mt-4 rounded-[16px] bg-[#F8FAFC] p-3">
            <Text className="text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">
              Trạng thái hiện tại
            </Text>
            <Text className="mt-1 text-[16px] font-bold capitalize text-[#1F2937]">
              {STATUS_LABEL[order.status]}
            </Text>
          </View>
        </AppCard>

        <AppCard className="mx-4 mb-3">
          <Text className="text-[16px] font-semibold text-[#1F2937]">Sản phẩm</Text>
          <View className="mt-2 gap-2">
            {order.items.map((item) => (
              <View key={item.id} className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-[#1F2937]" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280]">
                    {item.size ? `Size ${item.size} · ` : ''}
                    {item.color ?? ''} · x{item.quantity}
                  </Text>
                </View>
                <Text className="text-[13px] font-semibold text-[#1F2937]">
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
          <View className="mt-3 flex-row items-center justify-between border-t border-[#F3F4F6] pt-3">
            <Text className="text-[14px] text-[#6B7280]">Tổng</Text>
            <Text className="text-[18px] font-bold text-[#1F2937]">
              {formatCurrency(order.total)}
            </Text>
          </View>
        </AppCard>

        <AppCard className="mx-4 mb-4">
          <Text className="text-[16px] font-semibold text-[#1F2937]">Cập nhật trạng thái</Text>

          <AppInput
            label="Tracking number"
            value={tracking}
            onChangeText={setTracking}
            placeholder="VD: GHN-2026-99887"
            className="mt-2"
          />

          <AppInput
            label="Ghi chú"
            value={note}
            onChangeText={setNote}
            placeholder="VD: Đã đóng gói và giao GHN"
            className="mt-2"
          />

          {next.length === 0 ? (
            <Text className="mt-4 text-[13px] text-[#6B7280]">
              Đơn đã ở trạng thái cuối, không thể chuyển tiếp.
            </Text>
          ) : (
            <View className="mt-4 gap-2">
              {next.map((nx) => (
                <View
                  key={nx}
                  className="w-full">
                  <Button
                    title={`Chuyển sang “${STATUS_LABEL[nx]}”`}
                    variant={nx === 'cancelled' ? 'danger' : 'primary'}
                    loading={submitting}
                    disabled={submitting}
                    onPress={() => onTransition(nx)}
                  />
                </View>
              ))}
            </View>
          )}

          <View className="mt-4">
            <Button title="Quay lại" variant="secondary" onPress={() => router.back()} />
          </View>
        </AppCard>
      </ScrollView>
    </>
  );
}
