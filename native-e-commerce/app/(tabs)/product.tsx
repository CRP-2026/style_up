import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { CategoryList } from '../../components/home/CategoryList';
import { FilterSheet, type FilterSheetState } from '../../components/home/FilterSheet';
import { HomeHeader } from '../../components/home/HomeHeader';
import { PillButton } from '../../components/home/PillButton';
import { ProductCard } from '../../components/home/ProductCard';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '~/components/ui/StateBlocks';
import {
  CATALOG_PAGE_SIZE,
  fetchCategories,
  fetchProducts,
  searchProductsByImage,
} from '~/lib/api/catalog';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import type { Category } from '../../lib/types/models';
import type { ImageSearchResult, ProductFilter, ProductSummary } from '../../lib/types/products';

const CATEGORY_PLACEHOLDER =
  'https://images.unsplash.com/photo-1515562140497-ee584338969a?auto=format&fit=crop&w=160&q=60';

const DEFAULT_FILTER: FilterSheetState = {
  size: null,
  color: null,
  inStock: false,
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string; categoryId?: string; openCamera?: string }>();
  const locale = getAppLocale();
  const L = strings(locale);
  const { width } = useWindowDimensions();
  const numColumns = width >= 1180 ? 4 : width >= 860 ? 3 : 2;
  const gridGap = 12;
  const containerHorizontal = 16 * 2;
  const cardWidth = Math.max(
    150,
    Math.floor((width - containerHorizontal - gridGap * (numColumns - 1)) / numColumns)
  );

  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [homeProducts, setHomeProducts] = useState<ProductSummary[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterSheetState>(DEFAULT_FILTER);
  const [showFilter, setShowFilter] = useState(false);
  const [showImageSourceSheet, setShowImageSourceSheet] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<ImageSearchResult[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHasSearched, setAiHasSearched] = useState(false);

  useEffect(() => {
    if (params.search !== undefined) {
      setSearchInput(params.search);
      setActiveSearch(params.search);
    }
    if (params.categoryId !== undefined) {
      setActiveCategory(params.categoryId);
    }
    if (params.openCamera === 'true') {
      setShowImageSourceSheet(true);
    }
  }, [params.search, params.categoryId, params.openCamera]);

  const filterPayload: ProductFilter = useMemo(
    () => ({
      categoryId: activeCategory ?? undefined,
      search: activeSearch || undefined,
      size: filterState.size ?? undefined,
      color: filterState.color ?? undefined,
      inStock: filterState.inStock || undefined,
      sort: filterState.sort,
      minPrice: filterState.minPrice ? Number(filterState.minPrice) : undefined,
      maxPrice: filterState.maxPrice ? Number(filterState.maxPrice) : undefined,
    }),
    [activeCategory, activeSearch, filterState]
  );

  const filterKey = useMemo(() => JSON.stringify(filterPayload), [filterPayload]);
  const prevFilterKeyRef = useRef<string | null>(null);
  const firstFetchDoneRef = useRef(false);

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (!firstFetchDoneRef.current) setLoading(true);
      else setProductsLoading(true);
      setError(null);
      try {
        const [cats, prodPage] = await Promise.all([
          fetchCategories(),
          fetchProducts({
            ...filterPayload,
            limit: CATALOG_PAGE_SIZE,
            offset: (pageNum - 1) * CATALOG_PAGE_SIZE,
          }),
        ]);
        setHomeCategories(
          cats.map((c) => ({
            ...c,
            image: c.image && c.image.length > 0 ? c.image : CATEGORY_PLACEHOLDER,
          }))
        );
        setHomeProducts(prodPage.items);
        setTotalProducts(prodPage.total);
        const pages = Math.max(1, Math.ceil(prodPage.total / CATALOG_PAGE_SIZE));
        if (pageNum > pages) {
          setPage(pages);
        }
      } catch (e) {
        const msg = e instanceof ApiError ? resolveApiError(e, locale) : L.errors.homeLoadFailed;
        setError(msg);
        setHomeCategories([]);
        setHomeProducts([]);
        setTotalProducts(0);
      } finally {
        firstFetchDoneRef.current = true;
        setLoading(false);
        setProductsLoading(false);
      }
    },
    [filterPayload, locale, L.errors.homeLoadFailed]
  );

  useEffect(() => {
    const filterChanged =
      prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey;
    prevFilterKeyRef.current = filterKey;

    if (filterChanged && page !== 1) {
      setPage(1);
      return;
    }

    void loadPage(page);
  }, [page, filterKey, loadPage]);

  const totalPages =
    totalProducts > 0 ? Math.max(1, Math.ceil(totalProducts / CATALOG_PAGE_SIZE)) : 1;
  const pageNumbers = useMemo(() => buildPaginationPages(page, totalPages), [page, totalPages]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    for (const p of homeProducts) {
      for (const v of p.variants) {
        if (v.color) set.add(v.color);
      }
    }
    return Array.from(set);
  }, [homeProducts]);

  const onApplyFilter = () => {
    setShowFilter(false);
  };
  const onResetFilter = () => {
    setFilterState(DEFAULT_FILTER);
  };

  const activeFilterCount =
    (filterState.size ? 1 : 0) +
    (filterState.color ? 1 : 0) +
    (filterState.inStock ? 1 : 0) +
    (filterState.minPrice ? 1 : 0) +
    (filterState.maxPrice ? 1 : 0) +
    (filterState.sort !== 'newest' ? 1 : 0);

  const runAiImageSearch = useCallback(async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (pickerResult.canceled || !pickerResult.assets?.length) return;
    setAiLoading(true);
    setAiError(null);
    setAiHasSearched(true);
    try {
      const selected = pickerResult.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        selected.uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const b64 = manipulated.base64;
      if (!b64) {
        throw new Error('Image base64 missing after compression');
      }
      const items = await searchProductsByImage(b64, 10);
      setAiResults(items);
    } catch (e) {
      console.warn('[HomeScreen] AI image search failed', e);
      setAiResults([]);
      setAiError('Không thể tìm kiếm bằng ảnh. Vui lòng thử lại.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    setShowImageSourceSheet(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setAiError('Bạn cần cấp quyền camera để chụp ảnh.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ['images'],
    });
    await runAiImageSearch(res);
  }, [runAiImageSearch]);

  const pickFromLibrary = useCallback(async () => {
    setShowImageSourceSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAiError('Bạn cần cấp quyền thư viện ảnh.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ['images'],
    });
    await runAiImageSearch(res);
  }, [runAiImageSearch]);

  return (
    <>
      <Stack.Screen options={{ title: 'Sản phẩm', headerShown: false }} />

      <ScrollView className="flex-1 bg-[#F4F4F4]" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="mt-4 px-4 pt-4">
          <HomeHeader
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onSubmitSearch={() => setActiveSearch(searchInput.trim())}
            onPressCamera={() => {
              setAiError(null);
              setAiHasSearched(false);
              setAiResults([]);
              setShowImageSourceSheet(true);
            }}
          />

          {(aiLoading || aiError || aiResults.length > 0 || aiHasSearched) && (
            <View className="mt-4 rounded-[12px] bg-white p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[14px] font-semibold text-[#232327]">
                  Tìm kiếm bằng ảnh (AI)
                </Text>
                {aiResults.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setAiResults([]);
                      setAiError(null);
                      setAiHasSearched(false);
                    }}
                    className="rounded-full border border-[#E5E7EB] px-2 py-1">
                    <Text className="text-[11px] font-semibold text-[#6B7280]">Xóa kết quả</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {aiLoading ? (
                <AiShimmerRow />
              ) : aiError ? (
                <Text className="text-[12px] text-[#B91C1C]">{aiError}</Text>
              ) : aiResults.length === 0 ? (
                <Text className="text-[12px] text-[#6B7280]">
                  Không tìm thấy sản phẩm tương tự. Bạn thử ảnh rõ sản phẩm hơn nhé.
                </Text>
              ) : (
                <FlatList
                  horizontal
                  data={aiResults}
                  keyExtractor={(it) => it.product_id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      className="w-[140px] rounded-[12px] border border-[#EEF2F7] bg-[#FAFAFB] p-2"
                      onPress={() =>
                        router.push(`/product/${encodeURIComponent(item.product_id)}`)
                      }>
                      <Image
                        source={{ uri: item.image || CATEGORY_PLACEHOLDER }}
                        className="h-[92px] w-full rounded-[10px]"
                        resizeMode="cover"
                      />
                      <Text
                        className="mt-2 text-[12px] font-semibold text-[#232327]"
                        numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-[12px] text-[#111827]">
                        {typeof item.price === 'number'
                          ? `${item.price.toLocaleString('vi-VN')} đ`
                          : 'Giá cập nhật sau'}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          <CategoryList
            categories={homeCategories}
            selectedId={activeCategory}
            onSelect={setActiveCategory}
          />

          <View className="mt-6 flex-row items-center justify-between">
            <View>
              <Text className="text-[20px] font-semibold leading-[24px] text-[#232327]">
                {activeCategory
                  ? (homeCategories.find((c) => c.id === activeCategory)?.label ?? 'Catalog')
                  : 'Tất cả giày'}
              </Text>
              {activeSearch ? (
                <Text className="mt-0.5 text-[12px] text-[#6B7280]">Tìm: “{activeSearch}”</Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2">
              <PillButton
                label={
                  filterState.sort === 'price_asc'
                    ? 'Giá ↑'
                    : filterState.sort === 'price_desc'
                      ? 'Giá ↓'
                      : filterState.sort === 'rating_desc'
                        ? 'Đánh giá'
                        : filterState.sort === 'name_asc'
                          ? 'A→Z'
                          : 'Mới'
                }
                icon={<Ionicons name="swap-vertical" size={14} color="#232327" />}
                onPress={() => setShowFilter(true)}
              />
              <PillButton
                label={activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
                icon={<Feather name="filter" size={14} color="#232327" />}
                onPress={() => setShowFilter(true)}
              />
            </View>
          </View>

          {activeSearch || activeCategory || activeFilterCount > 0 ? (
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              {activeSearch ? (
                <ChipBadge
                  label={`"${activeSearch}"`}
                  onClear={() => {
                    setActiveSearch('');
                    setSearchInput('');
                  }}
                />
              ) : null}
              {activeCategory ? (
                <ChipBadge
                  label={
                    homeCategories.find((c) => c.id === activeCategory)?.label ?? activeCategory
                  }
                  onClear={() => setActiveCategory(null)}
                />
              ) : null}
              {filterState.size ? (
                <ChipBadge
                  label={`Size ${filterState.size}`}
                  onClear={() => setFilterState((s) => ({ ...s, size: null }))}
                />
              ) : null}
              {filterState.color ? (
                <ChipBadge
                  label={filterState.color}
                  onClear={() => setFilterState((s) => ({ ...s, color: null }))}
                />
              ) : null}
              {filterState.inStock ? (
                <ChipBadge
                  label="Còn hàng"
                  onClear={() => setFilterState((s) => ({ ...s, inStock: false }))}
                />
              ) : null}
            </View>
          ) : null}

          {loading ? (
            <LoadingBlock label="Đang tải danh sách sản phẩm..." />
          ) : error ? (
            <ErrorBlock message={error} onRetry={() => void loadPage(page)} />
          ) : homeProducts.length === 0 ? (
            <EmptyBlock
              title="Không tìm thấy sản phẩm"
              hint="Thử điều chỉnh bộ lọc hoặc tìm từ khóa khác."
              cta="Xóa bộ lọc"
              onPress={() => {
                setActiveCategory(null);
                setActiveSearch('');
                setSearchInput('');
                setFilterState(DEFAULT_FILTER);
              }}
            />
          ) : (
            <View className="mt-4">
              <Text className="mb-2 text-[12px] uppercase tracking-[1.5px] text-[#9CA3AF]">
                {totalProducts > 0
                  ? `Trang ${page} / ${totalPages} · ${totalProducts} sản phẩm`
                  : 'Không có sản phẩm'}
              </Text>
              <View
                style={{ opacity: productsLoading ? 0.35 : 1 }}
                pointerEvents={productsLoading ? 'none' : 'auto'}>
                <FlatList
                  key={`grid-${numColumns}`}
                  data={homeProducts}
                  renderItem={({ item }) => (
                    <View style={{ width: cardWidth }} className="mb-3">
                      <ProductCard product={item} cardWidth={cardWidth} />
                    </View>
                  )}
                  keyExtractor={(p) => p.id}
                  numColumns={numColumns}
                  columnWrapperStyle={{ gap: gridGap, justifyContent: 'flex-start' }}
                  scrollEnabled={false}
                />
              </View>
              {totalPages > 1 ? (
                <View className="mt-5 flex-row flex-wrap items-center justify-center gap-2 pb-2">
                  <TouchableOpacity
                    className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2"
                    disabled={page <= 1 || productsLoading}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    activeOpacity={0.85}>
                    <Text
                      className={`text-[13px] font-semibold ${page <= 1 ? 'text-[#C4C4C4]' : 'text-[#232327]'}`}>
                      ‹ Trước
                    </Text>
                  </TouchableOpacity>
                  {pageNumbers.map((entry, idx) =>
                    entry === 'gap' ? (
                      <Text key={`gap-${idx}`} className="px-1 text-[13px] text-[#9CA3AF]">
                        …
                      </Text>
                    ) : (
                      <TouchableOpacity
                        key={entry}
                        className={`min-w-[40px] items-center rounded-full px-3 py-2 ${
                          entry === page ? 'bg-[#232327]' : 'border border-[#E5E7EB] bg-white'
                        }`}
                        disabled={productsLoading}
                        onPress={() => setPage(entry)}
                        activeOpacity={0.85}>
                        <Text
                          className={`text-[13px] font-semibold ${entry === page ? 'text-white' : 'text-[#232327]'}`}>
                          {entry}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                  <TouchableOpacity
                    className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2"
                    disabled={page >= totalPages || productsLoading}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    activeOpacity={0.85}>
                    <Text
                      className={`text-[13px] font-semibold ${page >= totalPages ? 'text-[#C4C4C4]' : 'text-[#232327]'}`}>
                      Sau ›
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showImageSourceSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageSourceSheet(false)}>
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/35"
          onPress={() => setShowImageSourceSheet(false)}>
          <View className="mt-auto rounded-t-[18px] bg-white px-4 pb-6 pt-4">
            <Text className="mb-3 text-center text-[16px] font-semibold text-[#232327]">
              Tìm kiếm bằng ảnh
            </Text>
            <TouchableOpacity
              className="mb-2 rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3"
              onPress={() => void pickFromCamera()}>
              <Text className="text-center text-[14px] font-semibold text-[#232327]">Chụp ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3"
              onPress={() => void pickFromLibrary()}>
              <Text className="text-center text-[14px] font-semibold text-[#232327]">
                Chọn từ thư viện
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        availableColors={availableColors}
        state={filterState}
        onChange={setFilterState}
        onApply={onApplyFilter}
        onReset={onResetFilter}
      />
    </>
  );
}

/** Số trang hiển thị: 1 2 3 … 10 (rút gọn khi nhiều trang). */
function buildPaginationPages(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: (number | 'gap')[] = [];
  const pushUnique = (n: number | 'gap') => {
    const last = items[items.length - 1];
    if (n === 'gap' && last === 'gap') return;
    if (typeof n === 'number' && last === n) return;
    items.push(n);
  };
  pushUnique(1);
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);
  if (windowStart > 2) pushUnique('gap');
  for (let p = windowStart; p <= windowEnd; p++) pushUnique(p);
  if (windowEnd < total - 1) pushUnique('gap');
  pushUnique(total);
  return items;
}

function ChipBadge({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-[#FFF4ED] px-3 py-1">
      <Text className="text-[12px] font-semibold text-[#F97316]">{label}</Text>
      <Text onPress={onClear} className="text-[12px] font-bold text-[#F97316]">
        ×
      </Text>
    </View>
  );
}

function AiShimmerRow() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <View className="flex-row gap-2">
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{ opacity }}
          className="h-[150px] w-[140px] rounded-[12px] bg-[#E5E7EB]"
        />
      ))}
    </View>
  );
}
