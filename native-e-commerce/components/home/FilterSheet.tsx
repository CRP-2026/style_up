import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import { AppInput } from '~/components/ui/AppInput';
import type { ProductSort } from '~/lib/types/products';

const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43'];

const SORT_OPTIONS: { id: ProductSort | 'newest'; label: string }[] = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'price_asc', label: 'Giá tăng dần' },
  { id: 'price_desc', label: 'Giá giảm dần' },
  { id: 'rating_desc', label: 'Đánh giá cao' },
  { id: 'name_asc', label: 'Tên A→Z' },
];

export type FilterSheetState = {
  size?: string | null;
  color?: string | null;
  inStock: boolean;
  minPrice?: string;
  maxPrice?: string;
  sort: ProductSort;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  state: FilterSheetState;
  availableColors: string[];
  onChange: (next: FilterSheetState) => void;
  onApply: () => void;
  onReset: () => void;
};

export function FilterSheet({
  visible,
  onClose,
  state,
  availableColors,
  onChange,
  onApply,
  onReset,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[88%] rounded-t-[28px] bg-white p-5">
          <View className="mb-3 items-center">
            <View className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
          </View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[18px] font-bold text-[#111827]">Bộ lọc & sắp xếp</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6]">
              <Ionicons name="close" size={18} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[460px]">
            <Text className="mt-2 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
              Sắp xếp
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => {
                const active = state.sort === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => onChange({ ...state, sort: opt.id as ProductSort })}
                    className={`rounded-full border px-3 py-1.5 ${
                      active ? 'border-[#F97316] bg-[#FFF4ED]' : 'border-[#E5E7EB] bg-white'
                    }`}>
                    <Text
                      className={`text-[12px] font-semibold ${
                        active ? 'text-[#F97316]' : 'text-[#4B5563]'
                      }`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-5 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
              Size (EU)
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SHOE_SIZES.map((sz) => {
                const active = state.size === sz;
                return (
                  <Pressable
                    key={sz}
                    onPress={() => onChange({ ...state, size: active ? null : sz })}
                    className={`min-w-[48px] items-center rounded-[12px] border px-3 py-1.5 ${
                      active ? 'border-[#F97316] bg-[#FFF4ED]' : 'border-[#E5E7EB] bg-white'
                    }`}>
                    <Text className={`text-[13px] font-semibold ${active ? 'text-[#F97316]' : 'text-[#1F2937]'}`}>
                      {sz}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {availableColors.length > 0 ? (
              <>
                <Text className="mt-5 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
                  Màu sắc
                </Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {availableColors.map((c) => {
                    const active = state.color === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => onChange({ ...state, color: active ? null : c })}
                        className={`rounded-full border px-3 py-1.5 ${
                          active ? 'border-[#F97316] bg-[#FFF4ED]' : 'border-[#E5E7EB] bg-white'
                        }`}>
                        <Text
                          className={`text-[12px] font-semibold ${
                            active ? 'text-[#F97316]' : 'text-[#4B5563]'
                          }`}>
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text className="mt-5 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF]">
              Khoảng giá (VND)
            </Text>
            <View className="mt-2 flex-row gap-3">
              <View className="flex-1">
                <AppInput
                  value={state.minPrice ?? ''}
                  onChangeText={(v) => onChange({ ...state, minPrice: v.replace(/[^0-9]/g, '') })}
                  placeholder="Từ"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <AppInput
                  value={state.maxPrice ?? ''}
                  onChangeText={(v) => onChange({ ...state, maxPrice: v.replace(/[^0-9]/g, '') })}
                  placeholder="Đến"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-between rounded-[16px] bg-[#FFF7F2] px-4 py-3">
              <View>
                <Text className="text-[14px] font-semibold text-[#1F2937]">Chỉ hàng còn</Text>
                <Text className="text-[12px] text-[#6B7280]">Ẩn các size đã hết</Text>
              </View>
              <Pressable
                onPress={() => onChange({ ...state, inStock: !state.inStock })}
                className={`h-7 w-12 rounded-full ${state.inStock ? 'bg-[#F97316]' : 'bg-[#E5E7EB]'}`}>
                <View
                  className={`mt-0.5 h-6 w-6 rounded-full bg-white shadow ${
                    state.inStock ? 'ml-[22px]' : 'ml-[2px]'
                  }`}
                />
              </Pressable>
            </View>
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Button title="Đặt lại" variant="secondary" onPress={onReset} />
            </View>
            <View className="flex-1">
              <Button title="Áp dụng" onPress={onApply} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
