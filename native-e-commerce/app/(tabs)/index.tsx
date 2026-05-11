import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

import { CategoryList } from '../../components/home/CategoryList';
import { HomeHeader } from '../../components/home/HomeHeader';
import { ImageSearchResults } from '../../components/home/ImageSearchResults';
import { ImageSourceSheet } from '../../components/home/ImageSourceSheet';
import {
  FlatAndHeelsCard,
  HeroPromoBanner,
  MidSeasonBanner,
  NewArrivalsCard,
  SpecialOffersCard,
  SponsoredCard,
} from '../../components/home/HomePromos';
import { PillButton } from '../../components/home/PillButton';
import { ProductCard } from '../../components/home/ProductCard';
import { SectionBadge } from '../../components/home/SectionBadge';
import { FlashSaleTimer } from '../../components/home/FlashSaleTimer';
import { Skeleton } from '../../components/ui/Skeleton';
import { fetchCategories, fetchProducts } from '~/lib/api/catalog';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { Category } from '../../lib/types/models';
import type { ProductSummary } from '../../lib/types/products';
import { useAiImageSearch } from '~/features/catalog/hooks/useAiImageSearch';

function ProductCarousel({ products }: { products: ProductSummary[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
      contentContainerStyle={{ paddingRight: 12 }}>
      <View className="flex-row gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);

  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [homeProducts, setHomeProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const {
    aiError,
    aiHasSearched,
    aiLoading,
    aiResults,
    clearResults,
    closeSheet,
    openSheet,
    pickFromCamera,
    pickFromLibrary,
    sheetVisible,
  } = useAiImageSearch();

  const filteredProducts = useMemo(() => {
    let items = homeProducts;
    if (activeCategory) {
      items = items.filter((p) => p.categoryId === activeCategory);
    }
    if (activeSearch.trim()) {
      const q = activeSearch.trim().toLowerCase();
      items = items.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, activeSearch, homeProducts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      const products = Array.isArray(prods)
        ? prods
        : Array.isArray(prods?.items)
          ? prods.items
          : [];
      setHomeCategories(cats);
      setHomeProducts(products);
    } catch (e) {
      const msg = e instanceof ApiError ? resolveApiError(e, locale) : L.errors.homeLoadFailed;
      setError(msg);
      setHomeCategories([]);
      setHomeProducts([]);
    } finally {
      setLoading(false);
    }
  }, [L.errors.homeLoadFailed, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: 'Home', headerShown: false }} />

      <ScrollView className="flex-1 bg-[#F4F4F4]" showsVerticalScrollIndicator={false}>
        <View className="mt-4 px-4 pb-8 pt-3">
          <HomeHeader
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onSubmitSearch={() => setActiveSearch(searchInput.trim())}
            onPressCamera={openSheet}
          />

          <ImageSearchResults
            loading={aiLoading}
            error={aiError}
            hasSearched={aiHasSearched}
            results={aiResults}
            onClear={clearResults}
            onPressResult={(productId) => router.push(`/product/${encodeURIComponent(productId)}`)}
          />

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold leading-[22px] text-[#232327]">Tất cả</Text>
            <View className="flex-row items-center gap-3">
              <PillButton
                label="Sort"
                icon={<Ionicons name="swap-vertical" size={14} color="#232327" />}
              />
              <PillButton
                label="Filter"
                icon={<Feather name="filter" size={14} color="#232327" />}
              />
            </View>
          </View>

          {activeSearch || activeCategory ? (
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              {activeSearch ? (
                <TouchableOpacity
                  onPress={() => {
                    setActiveSearch('');
                    setSearchInput('');
                  }}
                  className="flex-row items-center gap-1 rounded-full bg-[#FFF4ED] px-3 py-1">
                  <Text className="text-[12px] font-semibold text-[#F97316]">“{activeSearch}”</Text>
                  <Text className="text-[12px] font-bold text-[#F97316]">×</Text>
                </TouchableOpacity>
              ) : null}
              {activeCategory ? (
                <TouchableOpacity
                  onPress={() => setActiveCategory(null)}
                  className="flex-row items-center gap-1 rounded-full bg-[#FFF4ED] px-3 py-1">
                  <Text className="text-[12px] font-semibold text-[#F97316]">
                    {homeCategories.find((c) => c.id === activeCategory)?.label ?? activeCategory}
                  </Text>
                  <Text className="text-[12px] font-bold text-[#F97316]">×</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {loading ? (
            <View className="mt-6">
              <View className="flex-row gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="items-center">
                    <Skeleton width={62} height={62} borderRadius={31} />
                    <Skeleton width={40} height={10} style={{ marginTop: 8 }} />
                  </View>
                ))}
              </View>
              <Skeleton width="100%" height={160} borderRadius={16} />
              <View className="mt-6 flex-row gap-4">
                <Skeleton width={160} height={220} borderRadius={16} />
                <Skeleton width={160} height={220} borderRadius={16} />
              </View>
            </View>
          ) : error ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="text-center text-[14px] text-[#B91C1C]">{error}</Text>
            </View>
          ) : (
            <>
              <CategoryList 
                categories={homeCategories} 
                onSelect={(id) => {
                  if (id) router.push({ pathname: '/(tabs)/product', params: { categoryId: id } });
                  else router.push('/(tabs)/product');
                }}
              />
              <HeroPromoBanner />
              <SectionBadge
                title="GIảm giá trong ngày"
                subtitle="22h 55m 20s còn lại"
                background="#4A8AE8"
              />
              <View className="mt-4">
                <Text className="mb-2 text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">
                  {activeCategory || activeSearch
                    ? `Kết quả lọc: ${filteredProducts.length} sản phẩm`
                    : `${homeProducts.length} sản phẩm nổi bật`}
                </Text>
                <View style={{ opacity: aiLoading ? 0.7 : 1 }}>
                  <FlatList
                    data={filteredProducts.slice(0, 10)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(p) => p.id}
                    contentContainerStyle={{ gap: 12 }}
                    renderItem={({ item }) => (
                      <View style={{ width: 155 }}>
                        <ProductCard product={item} cardWidth={155} />
                      </View>
                    )}
                  />
                </View>
              </View>
              
              <View className="mt-4 flex-row items-center justify-between rounded-[10px] bg-[#4A8AE8] px-3 py-3">
                <View>
                  <Text className="text-[16px] font-semibold text-white">Giảm giá trong ngày</Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Feather name="clock" size={13} color="rgba(255,255,255,0.86)" />
                    <FlashSaleTimer />
                  </View>
                </View>
                <TouchableOpacity className="flex-row items-center gap-1 rounded-[8px] border border-white/70 px-3 py-[7px]">
                  <Text className="text-[12px] font-semibold text-white">Xem tất cả</Text>
                  <Feather name="arrow-right" size={14} color="white" />
                </TouchableOpacity>
              </View>

              <ProductCarousel products={homeProducts} />
              <SpecialOffersCard />
              <FlatAndHeelsCard />

              <SectionBadge
                title="Sản phẩm đang được quan tâm"
                subtitle="Ngày cuối cùng 29/02/22"
                background="#F56F8C"
              />
              <ProductCarousel products={[...filteredProducts].reverse()} />
              <MidSeasonBanner />
              <NewArrivalsCard />
              <SponsoredCard />
            </>
          )}
        </View>
      </ScrollView>

      <ImageSourceSheet
        visible={sheetVisible}
        onClose={closeSheet}
        onCamera={() => void pickFromCamera()}
        onLibrary={() => void pickFromLibrary()}
      />
    </>
  );
}
