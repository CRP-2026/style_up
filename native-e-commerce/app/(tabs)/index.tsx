import { Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

import { CategoryList } from '../../components/home/CategoryList';
import { HomeHeader } from '../../components/home/HomeHeader';
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
import { fetchCategories, fetchProducts } from '~/lib/api/catalog';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { Category } from '../../lib/types/models';
import type { ProductSummary } from '../../lib/types/products';

const CATEGORY_PLACEHOLDER =
  'https://images.unsplash.com/photo-1515562140497-ee584338969a?auto=format&fit=crop&w=160&q=60';

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
  const locale = getAppLocale();
  const L = strings(locale);

  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [homeProducts, setHomeProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setHomeCategories(
        cats.map((c) => ({
          ...c,
          image: c.image && c.image.length > 0 ? c.image : CATEGORY_PLACEHOLDER,
        }))
      );
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
          <HomeHeader />

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

          {loading ? (
            <View className="mt-8 items-center py-6">
              <ActivityIndicator size="large" color="#F83758" />
            </View>
          ) : error ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="text-center text-[14px] text-[#B91C1C]">{error}</Text>
            </View>
          ) : (
            <>
              <CategoryList categories={homeCategories} />
              <HeroPromoBanner />
              <SectionBadge
                title="GIảm giá trong ngày"
                subtitle="22h 55m 20s còn lại"
                background="#4A8AE8"
              />
              <ProductCarousel products={homeProducts} />
              <SpecialOffersCard />
              <FlatAndHeelsCard />

              <SectionBadge
                title="Sản phẩm đang được quan tâm"
                subtitle="Ngày cuối cùng 29/02/22"
                background="#F56F8C"
              />
              <ProductCarousel products={[...homeProducts].reverse()} />
              <MidSeasonBanner />
              <NewArrivalsCard />
              <SponsoredCard />
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}
