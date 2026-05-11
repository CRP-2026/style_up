import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, Image } from 'react-native';

import { resetOnboardingSeen } from '~/lib/onboardingStorage';
import { useToast } from '~/components/ToastProvider';
import { useUserStore } from '~/lib/store/userStore';

type MenuItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  path?: string;
  onPress?: () => void;
  color?: string;
  badge?: string;
};

export default function Settings() {
  const router = useRouter();
  const { addToast } = useToast();
  const user = useUserStore();

  const handleResetOnboarding = async () => {
    await resetOnboardingSeen();
    addToast('success', 'Done', 'Onboarding đã được reset.');
  };

  const accountItems: MenuItem[] = [
    { icon: 'user', label: 'Tài khoản của tôi', sublabel: 'Thông tin cá nhân', path: '/account/edit', color: '#F83758' },
    { icon: 'map-pin', label: 'Địa chỉ giao hàng', sublabel: 'Quản lý địa chỉ', path: '/addresses', color: '#8B5CF6' },
    { icon: 'shopping-bag', label: 'Đơn hàng của tôi', sublabel: 'Lịch sử mua hàng', path: '/(tabs)/order', color: '#F97316' },
    { icon: 'shield', label: 'Trang Quản trị (Admin)', sublabel: 'Quản lý sản phẩm & đơn hàng', path: '/admin', color: '#7C3AED', badge: 'ADMIN' },
  ];

  const appItems: MenuItem[] = [
    { icon: 'home', label: 'Trang chủ', path: '/(tabs)', color: '#10B981' },
    { icon: 'shopping-cart', label: 'Giỏ hàng', path: '/(tabs)/cart', color: '#3B82F6' },
    { icon: 'credit-card', label: 'Thanh toán', path: '/checkout', color: '#F59E0B' },
    { icon: 'log-in', label: 'Đăng nhập', path: '/(auth)/login', color: '#6366F1' },
  ];

  const devItems: MenuItem[] = [
    { icon: 'refresh-cw', label: 'Reset Onboarding', onPress: handleResetOnboarding, color: '#64748B' },
    { icon: 'image', label: 'Scan ảnh sản phẩm', path: '/product/jewelry-set-01', color: '#EC4899' },
    { icon: 'gift', label: 'Payment Success', path: '/payment-success', color: '#10B981' },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.label}
      onPress={() => {
        if (item.onPress) { item.onPress(); return; }
        if (item.path) router.push(item.path as any);
      }}
      activeOpacity={0.7}
      className="flex-row items-center gap-4 px-4 py-3.5">
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: (item.color || '#F83758') + '18' }}>
        <Feather name={item.icon} size={18} color={item.color || '#F83758'} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-[#1F1F1F]">{item.label}</Text>
        {item.sublabel ? (
          <Text className="text-[12px] text-[#9CA3AF]">{item.sublabel}</Text>
        ) : null}
      </View>
      {item.badge ? (
        <View className="rounded-full bg-[#F83758] px-2 py-0.5">
          <Text className="text-[10px] font-bold text-white">{item.badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 bg-[#F8F8F8]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Header */}
        <View className="bg-white px-5 pb-8 pt-14">
          <Text className="text-[13px] font-semibold uppercase tracking-[2px] text-[#F83758]">
            Menu
          </Text>
          <Text className="mt-1 text-[30px] font-bold text-[#1F1F1F]">Cài đặt</Text>
        </View>

        {/* Profile Card */}
        <View className="mx-4 mt-4 overflow-hidden rounded-[20px] bg-gradient-to-r from-[#F83758] to-[#FF8C69]">
          <View
            className="rounded-[20px] p-5"
            style={{ backgroundColor: '#F83758' }}>
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20 overflow-hidden">
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} className="h-full w-full" />
                ) : (
                  <Feather name="user" size={28} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[18px] font-bold text-white">{user.name}</Text>
                <Text className="text-[13px] text-white/80">{user.bio}</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/account/edit' as any)}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Feather name="edit-2" size={16} color="white" />
              </TouchableOpacity>
            </View>

            <View className="mt-4 flex-row gap-3">
              {[
                { label: 'Đơn hàng', value: '12', icon: 'shopping-bag' as const },
                { label: 'Yêu thích', value: '8', icon: 'heart' as const },
                { label: 'Đánh giá', value: '5', icon: 'star' as const },
              ].map((stat) => (
                <View key={stat.label} className="flex-1 items-center rounded-[14px] bg-white/15 py-3">
                  <Feather name={stat.icon} size={16} color="white" />
                  <Text className="mt-1 text-[16px] font-bold text-white">{stat.value}</Text>
                  <Text className="text-[10px] text-white/80">{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View className="mx-4 mt-4 overflow-hidden rounded-[20px] bg-white">
          <Text className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
            Tài khoản
          </Text>
          {accountItems.map((item, idx) => (
            <View key={item.label}>
              {renderMenuItem(item)}
              {idx < accountItems.length - 1 && (
                <View className="ml-[72px] h-[1px] bg-[#F3F3F3]" />
              )}
            </View>
          ))}
        </View>

        {/* App Navigation Section */}
        <View className="mx-4 mt-4 overflow-hidden rounded-[20px] bg-white">
          <Text className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
            Điều hướng nhanh
          </Text>
          {appItems.map((item, idx) => (
            <View key={item.label}>
              {renderMenuItem(item)}
              {idx < appItems.length - 1 && (
                <View className="ml-[72px] h-[1px] bg-[#F3F3F3]" />
              )}
            </View>
          ))}
        </View>

        {/* Dev Tools Section */}
        <View className="mx-4 mt-4 overflow-hidden rounded-[20px] bg-white">
          <Text className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
            Công cụ Dev
          </Text>
          {devItems.map((item, idx) => (
            <View key={item.label}>
              {renderMenuItem(item)}
              {idx < devItems.length - 1 && (
                <View className="ml-[72px] h-[1px] bg-[#F3F3F3]" />
              )}
            </View>
          ))}
        </View>

        {/* App Version */}
        <Text className="mt-6 text-center text-[12px] text-[#C4C4C4]">
          Style Up v1.0.0 · Made with ❤️
        </Text>
      </ScrollView>
    </>
  );
}
