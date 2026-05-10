import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { fetchCurrentUser } from '~/lib/api/users';
import { ApiError } from '~/lib/api/errors';
import { logoutSession } from '~/lib/auth/session';
import { getAccessToken } from '~/lib/api/token';
import { getAppLocale, resolveApiError, roleLabel, strings } from '~/lib/i18n';
import type { CurrentUser } from '~/lib/types/user';
import { useToast } from '~/components/ToastProvider';

export default function AccountScreen() {
  const { addToast } = useToast();
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        setLoading(true);
        setError(null);
        setNeedLogin(false);

        const token = await getAccessToken();
        if (!token) {
          if (isMounted) {
            setUser(null);
            setNeedLogin(true);
            setLoading(false);
          }
          return;
        }

        try {
          const me = await fetchCurrentUser();
          if (isMounted) setUser(me);
        } catch (e) {
          if (isMounted) {
            setUser(null);
            if (e instanceof ApiError && e.status === 401) {
              setNeedLogin(true);
            } else {
              setError(resolveApiError(e, locale));
            }
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      void loadData();

      // Cleanup
      return () => {
        isMounted = false;
      };
    }, [locale])
  );

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirmed = () => {
    setShowLogoutConfirm(false);
    void (async () => {
      setLoggingOut(true);
      try {
        await logoutSession();
        addToast('success', L.common.success, L.account.logout);
        router.replace('/(auth)/login');
      } catch {
        addToast('error', L.errors.logoutFailedTitle, L.errors.logoutFailedBody);
        router.replace('/(auth)/login');
      } finally {
        setLoggingOut(false);
      }
    })();
  };

  return (
    <>
      <Stack.Screen options={{ title: L.account.screenTitle }} />

      <ScrollView className="flex-1 bg-gray-100" showsVerticalScrollIndicator={false}>
        {/* 1. Trạng thái Loading */}
        {loading && (
          <View className="flex-1 items-center justify-center py-24">
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="mt-3 text-sm text-gray-500">{L.common.loading}</Text>
          </View>
        )}

        {/* 2. Trạng thái Cần đăng nhập */}
        {!loading && needLogin && (
          <View className="mx-4 mt-6 rounded-2xl bg-amber-50 p-5">
            <Text className="text-lg font-semibold text-amber-950">{L.account.loginTitle}</Text>
            <Text className="mt-2 text-sm leading-5 text-amber-900">{L.account.loginSubtitle}</Text>
            <Pressable
              className="mt-4 self-start rounded-full bg-orange-500 px-5 py-2.5"
              onPress={() => router.push('/(auth)/login')}>
              <Text className="text-sm font-semibold text-white">{L.account.loginCta}</Text>
            </Pressable>
          </View>
        )}

        {/* 3. Trạng thái Lỗi API */}
        {!loading && !needLogin && error && (
          <View className="mx-4 mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <Text className="text-base text-red-600">{error}</Text>
            <Pressable
              className="mt-4 self-start rounded-full border border-orange-500 px-4 py-2"
              onPress={() => {
                setLoading(true);
                setError(null);
              }}>
              <Text className="text-sm font-semibold text-orange-600">{L.common.retry}</Text>
            </Pressable>
          </View>
        )}

        {/* 4. Trạng thái Có User */}
        {!loading && !needLogin && !error && user && (
          <>
            <View className="rounded-b-2xl bg-white p-4 shadow-sm">
              <View className="items-center">
                <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} className="h-24 w-24" resizeMode="cover" />
                  ) : (
                    <Ionicons name="person" size={48} color="#9ca3af" />
                  )}
                  <Pressable
                    className="absolute bottom-0 right-0 rounded-full bg-white p-1 shadow"
                    onPress={() => router.push('/account/edit')}>
                    <FontAwesome name="pencil" size={16} color="#f97316" />
                  </Pressable>
                </View>
                <Text className="mt-3 text-lg font-semibold text-gray-900">{user.name}</Text>
                <Text className="text-sm text-gray-500">{user.email}</Text>
                {!user.is_active ? (
                  <View className="mt-3 rounded-lg bg-red-50 px-3 py-2">
                    <Text className="text-center text-xs text-red-800">
                      {L.account.inactiveBanner}
                    </Text>
                  </View>
                ) : (
                  <Text className="mt-2 text-xs text-gray-400">{L.account.setupPrompt}</Text>
                )}
              </View>
            </View>

            <View className="space-y-4 p-4">
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {L.account.profileSection}
              </Text>
              <View className="rounded-xl bg-white p-2">
                <Row label={L.account.rowName} value={user.name} />
                <Separator />
                <Row label={L.account.rowEmail} value={user.email} />
                <Separator />
                <Row label={L.account.rowPhone} value={user.phone ?? '—'} muted={!user.phone} />
                <Separator />
                <Row
                  label={L.account.rowBio}
                  value={user.bio?.trim() ? user.bio : L.account.bioFallback}
                  muted={!user.bio?.trim()}
                />
                <Separator />
                <Row label={L.account.rowRole} value={roleLabel(locale, user.role)} />
                <Separator />
                <Row
                  label={L.account.rowStatus}
                  value={user.is_active ? L.account.statusActive : L.account.statusInactive}
                  valueClass={user.is_active ? 'text-emerald-700' : 'text-red-600'}
                />
              </View>

              {/* Logic check Role Admin của bạn */}
              {user.role === 'admin' && (
                <Pressable
                  className="mt-2 rounded-xl border border-[#FED7AA] bg-[#FFF7F2] py-4"
                  onPress={() => router.push('/admin' as never)}>
                  <View className="flex-row items-center justify-center gap-2">
                    <Ionicons name="shield-checkmark-outline" size={18} color="#F97316" />
                    <Text className="mt-1 text-center text-base font-semibold text-[#9A3412]">
                      Vào trang quản trị
                    </Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                disabled={loggingOut}
                className={`mt-2 rounded-xl bg-orange-500 py-4 ${loggingOut ? 'opacity-60' : ''}`}
                onPress={confirmLogout}>
                <Text className="text-center text-base font-semibold text-white">
                  {loggingOut ? L.common.loading : L.account.logout}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal xác nhận đăng xuất */}
      {showLogoutConfirm && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/35 px-6">
          <View className="w-full max-w-[420px]  border border-[#FFE4D6] bg-white p-5 shadow-xl">
            <Text className="text-[19px] font-bold text-[#1F2937]">
              {L.account.logoutConfirmTitle}
            </Text>
            <Text className="mt-2 text-[14px] leading-[21px] text-[#6B7280]">
              {L.account.logoutConfirmBody}
            </Text>
            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setShowLogoutConfirm(false)}
                className="flex-1 items-center rounded-[18px] border border-[#FED7AA] py-3">
                <Text className="text-[14px] font-semibold text-[#9A3412]">{L.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleLogoutConfirmed}
                className="flex-1 items-center rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] py-3">
                <Text className="text-[14px] font-semibold text-[#B91C1C]">{L.account.logout}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

function Row({
  label,
  value,
  muted = false,
  valueClass = '',
}: {
  label: string;
  value?: string;
  muted?: boolean;
  valueClass?: string;
}) {
  return (
    <Pressable className="flex-row items-center justify-between p-4" onPress={() => {}}>
      <Text className="text-base text-gray-700">{label}</Text>
      <View className="max-w-[58%]">
        <Text
          className={`text-right text-base ${muted ? 'text-gray-400' : 'text-gray-800'} ${valueClass}`}
          numberOfLines={3}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View className="mx-4 h-[1px] bg-gray-100" />;
}
