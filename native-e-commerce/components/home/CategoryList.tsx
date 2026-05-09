import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { Category as ICategory } from '@/lib/types/models';

type Props = {
  categories: ICategory[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
};

export function CategoryList({ categories, selectedId = null, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
      contentContainerStyle={{ paddingRight: 12 }}>
      <View className="flex-row gap-4">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelect?.(null)}
          className="items-center">
          <View
            className={`h-[62px] w-[62px] items-center justify-center rounded-full border-2 ${
              selectedId == null ? 'border-[#F97316] bg-[#FFF4ED]' : 'border-transparent bg-[#F3F4F6]'
            }`}>
            <Text className="text-[18px]">★</Text>
          </View>
          <Text
            className={`mt-2 text-[12px] ${
              selectedId == null ? 'font-semibold text-[#F97316]' : 'text-[#4A4A4A]'
            }`}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((category) => {
          const active = selectedId === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              activeOpacity={0.85}
              onPress={() => onSelect?.(active ? null : category.id)}
              className="items-center">
              <View
                className={`overflow-hidden rounded-full border-2 ${
                  active ? 'border-[#F97316]' : 'border-transparent'
                }`}>
                <Image
                  source={{ uri: category.image }}
                  className="h-[58px] w-[58px] rounded-full"
                  resizeMode="cover"
                />
              </View>
              <Text
                className={`mt-2 text-[12px] ${
                  active ? 'font-semibold text-[#F97316]' : 'text-[#4A4A4A]'
                }`}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
