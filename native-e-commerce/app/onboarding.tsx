import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { setOnboardingSeen } from '~/lib/onboardingStorage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('~/assets/splash.png'),
    title: 'Choose Products',
    subtitle: 'Find the best jewelry picks curated for your style and budget.',
  },
  {
    id: '2',
    image: require('~/assets/splash.png'),
    title: 'Make Payment',
    subtitle: 'Pay in seconds with secure checkout and your preferred method.',
  },
  {
    id: '3',
    image: require('~/assets/splash.png'),
    title: 'Get Your Order',
    subtitle: 'Track delivery and receive your order right at your doorstep.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = useMemo(() => currentIndex === slides.length - 1, [currentIndex]);

  const finishOnboarding = async () => {
    await setOnboardingSeen(true);
    router.replace('/(tabs)');
  };

  const nextSlide = () => {
    if (isLastSlide) {
      void finishOnboarding();
      return;
    }

    const nextIndex = Math.min(currentIndex + 1, slides.length - 1);

    // Use offset-based scrolling to avoid FlatList scrollToIndex measurement failures.
    flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
    setCurrentIndex(nextIndex);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-14">
        <TouchableOpacity className="self-end" onPress={finishOnboarding}>
          <Text className="text-base font-semibold text-[#1f2a44]">Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        renderItem={({ item }) => (
          <View style={{ width }} className="items-center px-8 pt-4">
            <Image source={item.image} className="h-[280px] w-[280px]" resizeMode="contain" />
            <Text className="mt-8 text-center text-[34px] font-bold text-[#202020]">
              {item.title}
            </Text>
            <Text className="mt-4 text-center text-base leading-6 text-[#7f7f7f]">
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      <View className="px-8 pb-10 pt-6">
        <View className="mb-8 flex-row items-center justify-center">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`mx-1 h-2 rounded-full ${currentIndex === index ? 'w-7 bg-[#17223b]' : 'w-2 bg-[#cdd1da]'}`}
            />
          ))}
        </View>

        <TouchableOpacity
          className="items-center rounded-full bg-[#f83758] py-4"
          onPress={nextSlide}>
          <Text className="text-lg font-semibold text-white">
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
