import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useToast } from '~/components/ToastProvider';
import { fetchCurrentUser } from '~/lib/api/users';
import { ApiError } from '~/lib/api/errors';
import { getAccessToken } from '~/lib/api/token';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { CurrentUser } from '~/lib/types/user';

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
        <Stack.Screen options={{ title: 'Admin' }} />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </>
    );
  }

  if (forbidden) {
    return (
      <>
        <Stack.Screen options={{ title: 'Admin' }} />
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Ionicons name="lock-closed-outline" size={36} color="#9CA3AF" />
          <Text className="mt-3 text-[16px] font-semibold text-[#1F2937]">
            Tài khoản không có quyền admin
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4 rounded-full bg-[#F97316] px-5 py-2.5">
            <Text className="text-[13px] font-semibold text-white">Quay lại</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Admin' }} />
      <ScrollView className="flex-1 bg-[#F4F4F4]">
        <View className="m-4 rounded-[24px] bg-white p-4 shadow-sm">
          <Text className="text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">Đăng nhập</Text>
          <Text className="mt-1 text-[18px] font-bold text-[#1F2937]">{user?.name}</Text>
          <Text className="text-[12px] text-[#6B7280]">{user?.email}</Text>
        </View>

        <AdminTile
          icon="stats-chart-outline"
          title="Dashboard báo cáo"
          subtitle="Doanh thu, top sản phẩm, tồn kho thấp"
          onPress={() => router.push('/admin/dashboard' as never)}
        />
        <AdminTile
          icon="cart-outline"
          title="Quản lý đơn hàng"
          subtitle="Cập nhật trạng thái đơn, tracking"
          onPress={() => router.push('/admin/orders' as never)}
        />
        <AdminTile
          icon="cube-outline"
          title="Tồn kho theo size"
          subtitle="Cập nhật số lượng từng size/màu"
          onPress={() => router.push('/admin/inventory' as never)}
        />
        <AdminTile
          icon="albums-outline"
          title="Danh mục"
          subtitle="CRUD category và ảnh danh mục"
          onPress={() => router.push('/admin/categories' as never)}
        />
        <AdminTile
          icon="pricetags-outline"
          title="Khuyến mãi"
          subtitle="Tạo và quản lý promo code"
          onPress={() => router.push('/admin/promos' as never)}
        />
        <AdminTile
          icon="people-outline"
          title="Người dùng"
          subtitle="Khoá tài khoản, đổi role staff/admin"
          onPress={() => router.push('/admin/users' as never)}
        />
      </ScrollView>
    </>
  );
}

function AdminTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-[20px] bg-white p-4 shadow-sm">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FFF4ED]">
        <Ionicons name={icon} size={22} color="#F97316" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-[#1F2937]">{title}</Text>
        <Text className="text-[12px] text-[#6B7280]">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}
