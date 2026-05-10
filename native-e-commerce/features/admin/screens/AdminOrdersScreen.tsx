import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { useToast } from '~/components/ToastProvider';
import { AppCard } from '~/components/ui/AppCard';
import { EmptyBlock, LoadingBlock } from '~/components/ui/StateBlocks';
import { adminListOrders, type AdminOrderSummary } from '~/lib/api/admin';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { OrderStatus } from '~/lib/types/orders';
import { formatCurrency, formatDate } from '~/lib/utils/formatters';

const STATUS_FILTERS: { id: 'all' | OrderStatus; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xử lý' },
  { id: 'processing', label: 'Đang xử lý' },
  { id: 'shipped', label: 'Đang giao' },
  { id: 'delivered', label: 'Hoàn tất' },
  { id: 'cancelled', label: 'Đã huỷ' },
];

function statusBadge(status: OrderStatus) {
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

export default function AdminOrdersScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToast } = useToast();
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      try {
        const data = await adminListOrders(filter === 'all' ? undefined : filter);
        setOrders(data);
      } catch (e) {
        const msg = e instanceof ApiError ? resolveApiError(e, locale) : L.errors.homeLoadFailed;
        addToast('error', L.common.error, msg);
        setOrders([]);
      } finally {
        if (mode === 'initial') setLoading(false);
        else setRefreshing(false);
      }
    },
    [filter, locale, L.errors.homeLoadFailed, L.common.error, addToast]
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load])
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Admin · Đơn hàng' }} />
      <View className="flex-1 bg-[#F4F4F4]">
        <View className="px-4 pb-2 pt-4">
          <Text className="text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">Operations</Text>
          <Text className="mt-1 text-[24px] font-bold text-[#111827]">Quản lý đơn hàng</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          className="border-b border-[#E5E7EB] bg-white px-4 py-3"
          contentContainerStyle={{ flexGrow: 0, alignItems: 'center', paddingRight: 8 }}>
          <View className="flex-row items-center gap-2">
            {STATUS_FILTERS.map((opt) => {
              const active = filter === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setFilter(opt.id)}
                  className={`flex-shrink-0 rounded-full border px-3 py-1.5 ${
                    active ? 'border-[#F97316] bg-[#FFF4ED]' : 'border-[#E5E7EB] bg-white'
                  }`}>
                  <Text
                    numberOfLines={1}
                    className={`text-[12px] font-semibold ${
                      active ? 'text-[#F97316]' : 'text-[#374151]'
                    }`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor="#F97316"
            />
          }>
          {loading ? (
            <LoadingBlock label="Đang tải danh sách đơn hàng..." />
          ) : orders.length === 0 ? (
            <EmptyBlock title="Không có đơn" hint="Hiện chưa có đơn phù hợp với bộ lọc đã chọn." />
          ) : (
            <View className="gap-3">
              {orders.map((o) => {
                const badge = statusBadge(o.status);
                return (
                  <AppCard key={o.id} className="p-0">
                    <Pressable
                      onPress={() =>
                        router.push(`/admin/orders/${encodeURIComponent(o.id)}` as never)
                      }
                      className="rounded-[24px] p-4">
                      <View className="flex-row items-start justify-between">
                        <View>
                          <Text className="text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">
                            Mã đơn
                          </Text>
                          <Text className="mt-1 text-[16px] font-bold text-[#1F2937]">
                            #{o.code}
                          </Text>
                          <Text className="mt-1 text-[12px] text-[#6B7280]">
                            {formatDate(o.date)} • {o.shipName}
                          </Text>
                        </View>
                        <View
                          style={{ backgroundColor: badge.bg }}
                          className="rounded-full px-3 py-1.5">
                          <Text
                            style={{ color: badge.fg }}
                            className="text-[12px] font-semibold capitalize">
                            {o.status}
                          </Text>
                        </View>
                      </View>
                      <View className="mt-3 flex-row items-center justify-between">
                        <Text className="text-[12px] text-[#6B7280]">{o.itemCount} sản phẩm</Text>
                        <Text className="text-[16px] font-bold text-[#1F2937]">
                          {formatCurrency(o.total)}
                        </Text>
                      </View>
                    </Pressable>
                  </AppCard>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
