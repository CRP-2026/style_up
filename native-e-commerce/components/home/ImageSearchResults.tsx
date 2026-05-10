import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { formatCurrency } from '~/lib/utils/formatters';
import type { ImageSearchResult } from '~/lib/types/products';

type Props = {
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  results: ImageSearchResult[];
  onPressResult: (productId: string) => void;
  onClear?: () => void;
};

const RESULT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1515562140497-ee584338969a?auto=format&fit=crop&w=240&q=60';

export function ImageSearchResults({
  loading,
  error,
  hasSearched,
  results,
  onPressResult,
  onClear,
}: Props) {
  if (!loading && !error && !hasSearched && results.length === 0) return null;

  return (
    <View className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-[16px] font-bold text-[#111827]">Kết quả tìm kiếm bằng ảnh</Text>
          <Text className="mt-0.5 text-[12px] text-[#6B7280]">Top 10 sản phẩm gần nhất</Text>
        </View>
        {results.length > 0 && onClear ? (
          <Pressable onPress={onClear} className="rounded-full border border-[#E5E7EB] px-3 py-2">
            <Text className="text-[11px] font-semibold text-[#6B7280]">Xóa</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <AiSearchShimmer />
      ) : error ? (
        <Text className="text-[13px] text-[#B91C1C]">{error}</Text>
      ) : results.length === 0 ? (
        <Text className="text-[13px] leading-[20px] text-[#6B7280]">
          Không tìm thấy sản phẩm tương tự. Hãy thử ảnh rõ hơn hoặc chọn ảnh khác.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}>
          {results.map((item) => (
            <Pressable
              key={item.product_id}
              onPress={() => onPressResult(item.product_id)}
              className="w-[150px] overflow-hidden rounded-[18px] border border-[#EEF2F7] bg-[#FAFAFB] p-2">
              <Image
                source={{ uri: item.image || RESULT_PLACEHOLDER }}
                className="h-[108px] w-full rounded-[14px]"
                resizeMode="cover"
              />
              <Text
                className="mt-2 text-[12px] font-semibold leading-[17px] text-[#232327]"
                numberOfLines={2}>
                {item.name}
              </Text>
              <Text className="mt-1 text-[12px] font-semibold text-[#111827]">
                {typeof item.price === 'number' ? formatCurrency(item.price) : 'Giá cập nhật sau'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function AiSearchShimmer() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12 }}>
      {[0, 1, 2].map((idx) => (
        <Animated.View
          key={idx}
          style={{ opacity }}
          className="h-[192px] w-[150px] rounded-[18px] bg-[#E5E7EB]"
        />
      ))}
    </ScrollView>
  );
}
