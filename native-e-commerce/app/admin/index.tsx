import Ionicons from '@expo/vector-icons/Ionicons';
import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useToast } from '~/components/ToastProvider';
import { fetchCurrentUser } from '~/lib/api/users';
import { ApiError } from '~/lib/api/errors';
import { getAccessToken } from '~/lib/api/token';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { CurrentUser } from '~/lib/types/user';

const MENU_ITEMS = [
  {
    icon: 'stats-chart-outline' as const,
    title: 'Dashboard báo cáo',
    subtitle: 'Doanh thu, top sản phẩm, tồn kho thấp',
    path: '/admin/dashboard',
    color: '#6366F1',
    bg: '#EEF2FF',
  },
  {
    icon: 'cart-outline' as const,
    title: 'Quản lý đơn hàng',
    subtitle: 'Cập nhật trạng thái đơn, tracking',
    path: '/admin/orders',
    color: '#F97316',
    bg: '#FFF7ED',
  },
  {
    icon: 'cube-outline' as const,
    title: 'Tồn kho',
    subtitle: 'Cập nhật số lượng từng size/màu',
    path: '/admin/inventory',
    color: '#10B981',
    bg: '#ECFDF5',
  },
  {
    icon: 'albums-outline' as const,
    title: 'Danh mục',
    subtitle: 'CRUD category và ảnh danh mục',
    path: '/admin/categories',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    icon: 'pricetags-outline' as const,
    title: 'Khuyến mãi',
    subtitle: 'Tạo và quản lý promo code',
    path: '/admin/promos',
    color: '#F83758',
    bg: '#FFF0F3',
  },
  {
    icon: 'people-outline' as const,
    title: 'Người dùng',
    subtitle: 'Khoá tài khoản, đổi role staff/admin',
    path: '/admin/users',
    color: '#0EA5E9',
    bg: '#F0F9FF',
  },
];

export default function AdminHomeScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToast } = useToast();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    const token = await getAccessToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const me = await fetchCurrentUser();
      if (me.role !== 'admin' && me.role !== 'staff') {
        setForbidden(true);
        setUser(null);
        return;
      }
      setUser(me);
    } catch (e) {
      addToast(
        'error',
        L.common.error,
        e instanceof ApiError ? resolveApiError(e, locale) : L.errors.homeLoadFailed
      );
    } finally {
      setLoading(false);
    }
  }, [router, addToast, locale, L.common.error, L.errors.homeLoadFailed]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center bg-[#0F0F13]">
          <ActivityIndicator size="large" color="#F83758" />
          <Text className="mt-4 text-[14px] text-white/50">Đang xác thực...</Text>
        </View>
      </>
    );
  }

  if (forbidden) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center bg-[#0F0F13] px-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white/10">
            <Ionicons name="lock-closed-outline" size={36} color="#F83758" />
          </View>
          <Text className="mt-5 text-center text-[20px] font-bold text-white">
            Không có quyền truy cập
          </Text>
          <Text className="mt-2 text-center text-[14px] text-white/50">
            Tài khoản của bạn không phải admin hoặc staff.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            className="mt-8 h-[50px] items-center justify-center rounded-[14px] bg-[#F83758] px-10">
            <Text className="text-[15px] font-bold text-white">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 bg-[#F4F4F8]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View
          className="px-6 pb-8 pt-14"
          style={{ backgroundColor: '#0F0F13', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#F83758]">
                <Feather name="shopping-bag" size={18} color="white" />
              </View>
              <View>
                <Text className="text-[18px] font-bold text-white">Style Up</Text>
                <Text className="text-[10px] tracking-widest text-[#F83758] uppercase font-bold">Admin Panel</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Feather name="x" size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* User info card */}
          <View className="mt-6 flex-row items-center gap-4 rounded-[20px] bg-white/10 p-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#F83758]">
              <Text className="text-[20px] font-bold text-white">
                {(user?.name ?? 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-white">{user?.name ?? '---'}</Text>
              <Text className="text-[12px] text-white/60">{user?.email ?? '---'}</Text>
            </View>
            <View className="rounded-full bg-[#F83758]/20 px-3 py-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-[#F83758]">
                {user?.role ?? 'admin'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick stats row */}
        <View className="mt-5 flex-row gap-3 px-5">
          {[
            { label: 'Đơn hôm nay', value: '24', icon: 'shopping-bag' as const, color: '#F97316' },
            { label: 'Sản phẩm', value: '19', icon: 'box' as const, color: '#6366F1' },
            { label: 'Người dùng', value: '312', icon: 'users' as const, color: '#10B981' },
          ].map((stat) => (
            <View
              key={stat.label}
              className="flex-1 items-center rounded-[16px] bg-white py-4 shadow-sm">
              <Feather name={stat.icon} size={20} color={stat.color} />
              <Text className="mt-1 text-[20px] font-bold text-[#1F1F1F]">{stat.value}</Text>
              <Text className="text-[11px] text-[#9CA3AF]">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu grid */}
        <View className="mt-5 px-5">
          <Text className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            Chức năng quản lý
          </Text>
          <View className="gap-3">
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.path}
                onPress={() => router.push(item.path as never)}
                activeOpacity={0.85}
                className="flex-row items-center gap-4 rounded-[18px] bg-white p-4"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                <View
                  className="h-12 w-12 items-center justify-center rounded-[14px]"
                  style={{ backgroundColor: item.bg }}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-[#1F1F1F]">{item.title}</Text>
                  <Text className="text-[12px] text-[#9CA3AF]">{item.subtitle}</Text>
                </View>
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: item.bg }}>
                  <Ionicons name="chevron-forward" size={14} color={item.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </>
  );
}
