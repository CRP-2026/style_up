import React, { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { formatCurrency } from '~/lib/utils/formatters';
import type { ProductSummary } from '~/lib/types/products';

type Props = {
  product: ProductSummary;
  cardWidth?: number;
};

function ProductCardBase({ product, cardWidth }: Props) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = React.useState(false);
  const bestStock = product.variants.reduce((max, v) => Math.max(max, v.stock), 0);
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < Math.floor(rating) ? 'star' : i < rating ? 'star-half' : 'star-outline'}
        size={12}
        color="#FFC107"
      />
    ));
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={cardWidth ? { width: cardWidth } : { width: 165 }}
      className="rounded-[20px] border border-[#EEF2F7] bg-white p-[8px] shadow-sm"
      onPress={() => router.push(`/product/${encodeURIComponent(product.id)}`)}>
      <View>
        <Image
          source={{ uri: product.image }}
          className="h-[150px] w-full rounded-[16px]"
          resizeMode="cover"
        />
        
        <TouchableOpacity 
          className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow-sm"
          onPress={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={16} 
            color={isFavorite ? "#F83758" : "#232327"} 
          />
        </TouchableOpacity>

        {bestStock <= 0 && (
          <View className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1">
            <Text className="text-[9px] font-bold text-white uppercase">Hết hàng</Text>
          </View>
        )}
      </View>

      <View className="mt-3 min-h-[100px] px-1 gap-1">
        <Text className="text-[13px] font-bold text-[#232327]" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="text-[11px] leading-[14px] text-[#6A6A6A]" numberOfLines={2}>
          {product.description}
        </Text>
        
        <View className="mt-auto">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[14px] font-bold text-[#F97316]">
              {formatCurrency(product.price)}
            </Text>
            {product.discount ? (
              <Text className="text-[10px] font-medium text-[#F83758] bg-[#FFF0F0] px-1 rounded">
                {product.discount}
              </Text>
            ) : null}
          </View>
          
          <View className="mt-1 flex-row items-center gap-1">
            <View className="flex-row">{renderStars(product.rating)}</View>
            <Text className="text-[10px] font-medium text-[#9CA3AF]">
              ({product.reviews})
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductCard = memo(ProductCardBase);
