import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError } from '~/lib/api/errors';
import { fetchOrderSummaries } from '~/lib/api/orders';
import { getAppLocale, strings } from '~/lib/i18n';
import type { OrderStatus, OrderSummary } from '~/lib/types/orders';
import { formatCurrency, formatDate } from '~/lib/utils/formatters';

type OrderFilter = 'all' | OrderStatus;

function statusBadge(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', tone: 'bg-[#FEF3C7] text-[#92400E]' };
    case 'processing':
      return { label: 'Processing', tone: 'bg-[#DBEAFE] text-[#1E40AF]' };
    case 'shipped':
      return { label: 'Shipped', tone: 'bg-[#E0F2FE] text-[#0369A1]' };
    case 'delivered':
      return { label: 'Delivered', tone: 'bg-[#DCFCE7] text-[#166534]' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'bg-[#FEE2E2] text-[#991B1B]' };
    default:
      return { label: status, tone: 'bg-[#E5E7EB] text-[#374151]' };
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const statusFilters = useMemo((): { label: string; value: OrderFilter }[] => {
    const o = L.orders; // Đã tối ưu đoạn này dùng L có sẵn
    return [
      { label: o.filterAll, value: 'all' },
      { label: o.filterPending, value: 'pending' },
      { label: o.filterProcessing, value: 'processing' },
      { label: o.filterShipped, value: 'shipped' },
      { label: o.filterDelivered, value: 'delivered' },
      { label: o.filterCancelled, value: 'cancelled' },
    ];
  }, [L]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [needLogin, setNeedLogin] = useState(false);

  // 1. ĐÃ SỬA: Đưa logic gọi API vào useEffect và dùng isMounted
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setNeedLogin(false);
      try {
        const data = await fetchOrderSummaries(activeFilter === 'all' ? undefined : activeFilter);
        if (isMounted) setOrders(data);
      } catch (e) {
        if (isMounted) {
          setOrders([]);
          if (e instanceof ApiError && e.status === 401) setNeedLogin(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [activeFilter]);

  const filteredOrders = useMemo(() => orders, [orders]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Order',
          headerShadowVisible: false,
        }}
      />

      <View className="flex-1 bg-[#F8FAFC]">
        <View className="absolute left-[-90px] top-[-80px] h-[220px] w-[220px] rounded-full bg-[#EAF1FF]" />
        <View className="absolute right-[-120px] top-[150px] h-[260px] w-[260px] rounded-full bg-[#F1F5F9]" />

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="px-5 pb-7 pt-2">
            <Text className="text-[13px] uppercase tracking-[2.5px] text-[#2563EB]">History</Text>
            <Text className="mt-2 text-[30px] font-bold text-[#0F172A]">My Orders</Text>

            {needLogin && (
              <View className="mt-4 rounded-[20px] bg-[#FEF3C7] p-4">
                <Text className="text-[14px] text-[#92400E]">{L.orders.loginBanner}</Text>
                <Pressable
                  className="mt-3 self-start rounded-full bg-[#2563EB] px-4 py-2"
                  onPress={() => router.push('/(auth)/login')}>
                  <Text className="text-[13px] font-semibold text-white">{L.orders.loginCta}</Text>
                </Pressable>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-5"
              contentContainerStyle={{ paddingRight: 8 }}>
              <View className="flex-row gap-2">
                {statusFilters.map((filter) => {
                  const active = filter.value === activeFilter;
                  return (
                    <Pressable
                      key={filter.value}
                      onPress={() => setActiveFilter(filter.value)}
                      className={`rounded-full border px-4 py-2 ${
                        active ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#D6E0F5] bg-white'
                      }`}>
                      <Text
                        className={`text-[13px] font-semibold ${
                          active ? 'text-white' : 'text-[#334155]'
                        }`}>
                        {filter.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* 2. ĐÃ SỬA: Tách các trường hợp Render thành các khối riêng biệt (bỏ ba ngôi lồng nhau) */}

            {/* Trường hợp 1: Đang tải dữ liệu */}
            {isLoading && (
              <View className="mt-5 gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            )}

            {/* Trường hợp 2: Tải xong nhưng không có dữ liệu */}
            {!isLoading && filteredOrders.length === 0 && (
              <View className="mt-5 items-center rounded-[24px] bg-white px-6 py-10 shadow-sm">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF]">
                  <Ionicons name="file-tray-outline" size={24} color="#2563EB" />
                </View>
                <Text className="mt-4 text-[17px] font-semibold text-[#0F172A]">
                  {L.empty.ordersTitle}
                </Text>
                <Text className="mt-2 text-center text-[14px] leading-[20px] text-[#64748B]">
                  {L.empty.ordersHint}
                </Text>
                <Pressable
                  className="mt-5 rounded-full bg-[#2563EB] px-5 py-3"
                  onPress={() => router.push('/(tabs)')}>
                  <Text className="text-[14px] font-semibold text-white">
                    {L.empty.ordersBackShop}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Trường hợp 3: Tải xong và có dữ liệu */}
            {!isLoading && filteredOrders.length > 0 && (
              <View className="mt-5 gap-3">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/order/${encodeURIComponent(order.id)}`)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function OrderCard({ order, onPress }: { order: OrderSummary; onPress: () => void }) {
  const badge = statusBadge(order.status);

  return (
    <Pressable onPress={onPress} className="rounded-[24px] bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[12px] uppercase tracking-[1.5px] text-[#64748B]">Order code</Text>
          <Text className="mt-1 text-[16px] font-bold text-[#0F172A]">#{order.code}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${badge.tone.split(' ')[0]}`}>
          <Text className={`text-[12px] font-semibold ${badge.tone.split(' ')[1]}`}>
            {badge.label}
          </Text>
        </View>
      </View>

      <View className="my-3 h-[1px] bg-[#EEF2F7]" />

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[12px] text-[#64748B]">Placed on</Text>
          <Text className="mt-1 text-[14px] font-semibold text-[#0F172A]">
            {formatDate(order.date)}
          </Text>
        </View>
        <View>
          <Text className="text-right text-[12px] text-[#64748B]">Total</Text>
          <Text className="mt-1 text-right text-[16px] font-bold text-[#0F172A]">
            {formatCurrency(order.total)}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-[16px] bg-[#F8FAFC] px-3 py-2">
        <Text className="text-[13px] text-[#334155]">{order.itemCount} item(s)</Text>
        <View className="flex-row items-center">
          <Text className="mr-1 text-[13px] font-semibold text-[#2563EB]">View detail</Text>
          <Ionicons name="chevron-forward" size={14} color="#2563EB" />
        </View>
      </View>
    </Pressable>
  );
}

function SkeletonCard() {
  return (
    <View className="rounded-[24px] bg-white p-4 shadow-sm">
      <View className="h-4 w-[120px] rounded bg-[#E9EEF7]" />
      <View className="mt-3 h-3 w-[90px] rounded bg-[#EEF2F7]" />
      <View className="mt-4 h-[1px] bg-[#EEF2F7]" />
      <View className="mt-4 h-3 w-[140px] rounded bg-[#EEF2F7]" />
    </View>
  );
}
