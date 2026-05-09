import { Feather, Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export function HeroPromoBanner() {
  return (
    <>
      <View className="mt-4 overflow-hidden rounded-[16px] bg-[#F587A1] pl-4 pt-5">
        <View className="flex-row items-end justify-between">
          <View className="pb-6">
            <Text className="text-[18px] font-bold text-white">50-40% OFF</Text>
            <Text className="mt-1 text-[14px] text-white/90">Now in (product)</Text>
            <Text className="mt-1 text-[14px] text-white/90">All colours</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              className="mt-3 flex-row items-center gap-2 rounded-[8px] border border-white px-3 py-[7px]">
              <Text className="text-[14px] font-semibold text-white">Shop Now</Text>
              <Feather name="arrow-right" size={14} color="white" />
            </TouchableOpacity>
          </View>

          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=60',
            }}
            className="h-[185px] w-[165px]"
            resizeMode="cover"
          />
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-center gap-[6px]">
        <View className="h-[8px] w-[8px] rounded-full bg-[#FFC2D0]" />
        <View className="h-[10px] w-[10px] rounded-full bg-[#F83758]" />
        <View className="h-[8px] w-[8px] rounded-full bg-[#D3D3D3]" />
      </View>
    </>
  );
}

export function SpecialOffersCard() {
  return (
    <View className="mt-5 flex-row items-center gap-4 rounded-[12px] bg-[#F0F0F0] p-4">
      <View className="h-[60px] w-[70px] items-center justify-center rounded-[12px] bg-[#FFF2F5]">
        <Ionicons name="pricetag" size={26} color="#F83758" />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-[#232327]">Special Offers</Text>
        <Text className="mt-1 text-[12px] leading-[16px] text-[#575757]">
          We make sure you get the offer you need at best prices
        </Text>
      </View>
    </View>
  );
}

export function FlatAndHeelsCard() {
  return (
    <View className="mt-4 flex-row items-center gap-4 rounded-[12px] bg-[#F0F0F0] p-3">
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=60',
        }}
        className="h-[90px] w-[90px] rounded-[8px]"
        resizeMode="cover"
      />
      <View className="flex-1">
        <Text className="text-[17px] font-semibold text-[#232327]">Flat and Heels</Text>
        <Text className="mt-1 text-[12px] text-[#575757]">Stand a chance to get rewarded</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          className="mt-2 self-start rounded-[8px] bg-[#F83758] px-3 py-[7px]">
          <Text className="text-[12px] font-semibold text-white">Visit now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function MidSeasonBanner() {
  return (
    <Image
      source={{
        uri: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=1100&q=60',
      }}
      className="mt-5 h-[160px] w-full rounded-[12px]"
      resizeMode="cover"
    />
  );
}

export function NewArrivalsCard() {
  return (
    <View className="mt-4 flex-row items-center justify-between rounded-[12px] bg-white px-4 py-4">
      <View>
        <Text className="text-[16px] font-semibold text-[#232327]">New Arrivals</Text>
        <Text className="text-[12px] text-[#575757]">Summer &apos;25 Collections</Text>
      </View>
      <TouchableOpacity activeOpacity={0.85} className="rounded-[8px] bg-[#F83758] px-3 py-[7px]">
        <Text className="text-[12px] font-semibold text-white">View all</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SponsoredCard() {
  return (
    <View className="mt-5">
      <Text className="text-[16px] font-semibold text-[#232327]">Sponsored</Text>
      <View className="mt-3 overflow-hidden rounded-[14px] bg-[#F3F3F3]">
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1549298916-f52d724204b4?auto=format&fit=crop&w=1200&q=60',
          }}
          className="h-[260px] w-full"
          resizeMode="cover"
        />
        <View className="flex-row items-center justify-between bg-white px-4 py-3">
          <Text className="text-[16px] font-semibold text-[#232327]">up to 50% Off</Text>
          <Feather name="chevron-right" size={18} color="#232327" />
        </View>
      </View>
    </View>
  );
}
