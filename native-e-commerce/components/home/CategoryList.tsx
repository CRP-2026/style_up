import { Ionicons } from '@expo/vector-icons';
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
      className="mt-6 mb-2"
      contentContainerStyle={{ paddingHorizontal: 4 }}>
      <View className="flex-row gap-5">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelect?.(null)}
          className="items-center">
          <View
            className={`h-[68px] w-[68px] items-center justify-center rounded-full shadow-sm border ${
              selectedId == null ? 'border-[#F83758] bg-[#FFF0F0]' : 'border-transparent bg-white'
            }`}>
            <Ionicons 
              name="grid" 
              size={24} 
              color={selectedId == null ? '#F83758' : '#BBBBBB'} 
            />
          </View>
          <Text
            className={`mt-2 text-[13px] font-medium ${
              selectedId == null ? 'text-[#F83758]' : 'text-[#666666]'
            }`}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((category) => {
          const active = selectedId === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              activeOpacity={0.8}
              onPress={() => onSelect?.(active ? null : category.id)}
              className="items-center">
              <View
                className={`h-[68px] w-[68px] overflow-hidden rounded-full shadow-sm border-2 ${
                  active ? 'border-[#F83758]' : 'border-white'
                }`}>
                <Image
                  source={{ uri: category.image || 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&q=80' }}
                  className="h-full w-full"
                  resizeMode="cover"
                  defaultSource={{ uri: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=400&q=80' }}
                />
              </View>
              <Text
                className={`mt-2 text-[13px] font-medium ${
                  active ? 'text-[#F83758]' : 'text-[#666666]'
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
