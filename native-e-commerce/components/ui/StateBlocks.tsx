import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '~/components/Button';

export function LoadingBlock({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <View className="mt-8 items-center rounded-[24px] border border-[#EEF2F7] bg-white px-6 py-10 shadow-sm">
      <ActivityIndicator size="large" color="#F97316" />
      <Text className="mt-3 text-[14px] text-[#6B7280]">{label}</Text>
    </View>
  );
}

export function EmptyBlock({
  title,
  hint,
  cta,
  onPress,
}: {
  title: string;
  hint: string;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View className="mt-8 items-center rounded-[24px] border border-[#EEF2F7] bg-white px-6 py-10 shadow-sm">
      <Ionicons name="search-outline" size={28} color="#9CA3AF" />
      <Text className="mt-3 text-[16px] font-semibold text-[#1F2937]">{title}</Text>
      <Text className="mt-1 text-center text-[13px] leading-[20px] text-[#6B7280]">{hint}</Text>
      {cta && onPress ? (
        <Pressable onPress={onPress} className="mt-4">
          <Button title={cta} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="mt-8 rounded-[24px] border border-[#FECACA] bg-white px-6 py-8 shadow-sm">
      <Text className="text-center text-[15px] font-semibold text-[#B91C1C]">Có lỗi xảy ra</Text>
      <Text className="mt-2 text-center text-[13px] text-[#7F1D1D]">{message}</Text>
      {onRetry ? (
        <View className="mt-4">
          <Button title="Thử lại" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
