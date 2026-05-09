import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { formatCurrency } from '~/lib/utils/formatters';
import type { ProductSummary } from '~/lib/types/products';

type Props = {
  product: ProductSummary;
  cardWidth?: number;
};

function ProductCardBase({ product, cardWidth }: Props) {
  const router = useRouter();
  const bestStock = product.variants.reduce((max, v) => Math.max(max, v.stock), 0);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={cardWidth ? { width: cardWidth } : undefined}
      className="rounded-[16px] border border-[#EEF2F7] bg-white p-[8px] shadow-sm"
      onPress={() => router.push(`/product/${encodeURIComponent(product.id)}`)}>
      <View>
        <Image
          source={{ uri: product.image }}
          className="h-[150px] w-full rounded-[12px]"
          resizeMode="cover"
        />
        {bestStock > 0 ? (
          <View className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1">
            <Text className="text-[10px] font-semibold text-[#166534]">
              Còn hàng
            </Text>
          </View>
        ) : (
          <View className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1">
            <Text className="text-[10px] font-semibold text-[#B91C1C]">
              Hết hàng
            </Text>
          </View>
        )}
      </View>

      <View className="mt-3 min-h-[116px] gap-1">
        <Text className="text-[14px] font-semibold text-[#232327]" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="text-[12px] leading-[16px] text-[#6A6A6A]" numberOfLines={1}>
          {product.description}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="text-[15px] font-semibold text-[#232327]">
            {formatCurrency(product.price)}
          </Text>
          {product.discount ? (
            <Text className="text-[12px] text-[#F83758]">{product.discount}</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="star" size={14} color="#FFC107" />
          <Ionicons name="star" size={14} color="#FFC107" />
          <Ionicons name="star" size={14} color="#FFC107" />
          <Ionicons name="star" size={14} color="#FFC107" />
          <Text className="text-[12px] text-[#575757]">
            {product.rating.toFixed(1)} {product.reviews}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductCard = memo(ProductCardBase);
