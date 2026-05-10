import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUserStore } from '~/lib/store/userStore';

type Props = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSubmitSearch?: () => void;
  onPressCamera?: () => void;
};

export function HomeHeader({ searchValue, onSearchChange, onSubmitSearch, onPressCamera }: Props) {
  const [isFocused, setIsFocused] = React.useState(false);
  const router = useRouter();
  const user = useUserStore();

  return (
    <>
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F97316]">
            <Feather name="shopping-bag" size={20} color="white" />
          </View>
          <View>
            <Text className="text-[20px] font-bold tracking-tight text-[#1F1F1F]">Style Up</Text>
            <Text className="text-[10px] uppercase tracking-widest text-[#F97316] font-bold">Premium Store</Text>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.7} 
          className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm items-center justify-center bg-[#F4F4F4]"
          onPress={() => router.push('/(tabs)/settings')}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} className="h-full w-full" />
          ) : (
            <Feather name="user" size={20} color="#BBBBBB" />
          )}
        </TouchableOpacity>
      </View>

      <View className={`mt-5 h-[48px] flex-row items-center rounded-[14px] bg-white px-4 shadow-sm border ${isFocused ? 'border-[#F97316]' : 'border-transparent'}`}>
        <Feather name="search" size={18} color={isFocused ? "#F97316" : "#BBBBBB"} />
        <TextInput
          style={{
            flex: 1,
            marginLeft: 10,
            fontSize: 14,
            color: '#232327',
            fontWeight: '500',
            backgroundColor: 'transparent',
            outline: 'none',
          }}
          placeholder="Bạn đang tìm gì hôm nay?"
          placeholderTextColor="#BBBBBB"
          value={searchValue}
          onChangeText={onSearchChange}
          onSubmitEditing={onSubmitSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="search"
        />
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            className="h-6 w-6 items-center justify-center"
            onPress={onPressCamera}>
            <Feather name="camera" size={18} color="#7B7B7B" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
