import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

import { CategoryList } from '../../components/home/CategoryList';
import { FilterSheet, type FilterSheetState } from '../../components/home/FilterSheet';
import { HomeHeader } from '../../components/home/HomeHeader';
import { ImageSearchResults } from '../../components/home/ImageSearchResults';
import { ImageSourceSheet } from '../../components/home/ImageSourceSheet';
import { PillButton } from '../../components/home/PillButton';
import { ProductCard } from '../../components/home/ProductCard';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '~/components/ui/StateBlocks';
import { CATALOG_PAGE_SIZE, fetchCategories, fetchProducts } from '~/lib/api/catalog';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import { useAiImageSearch } from '~/features/catalog/hooks/useAiImageSearch';
import type { Category } from '../../lib/types/models';
import type { ProductFilter, ProductSummary } from '../../lib/types/products';

const DEFAULT_FILTER: FilterSheetState = {
  size: null,
  color: null,
  inStock: false,
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
};

export default function ProductCatalogScreen() {
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

  useEffect(() => {
    if (params.search !== undefined) {
      setSearchInput(params.search);
      setActiveSearch(params.search);
    }
    if (params.categoryId !== undefined) {
      setActiveCategory(params.categoryId);
    }
    if (params.openCamera === 'true') {
      openSheet();
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
        setHomeCategories(cats);
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

  return (
    <>
      <Stack.Screen options={{ title: 'Sản phẩm', headerShown: false }} />

      <ScrollView className="flex-1 bg-[#F4F4F4]" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="mt-4 px-4 pt-4">
          <HomeHeader
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onSubmitSearch={() => setActiveSearch(searchInput.trim())}
            onPressCamera={openSheet}
          />

          {(aiLoading || aiError || aiResults.length > 0 || aiHasSearched) && (
            <View className="mt-4 rounded-[12px] bg-white p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[14px] font-semibold text-[#232327]">
                  Tìm kiếm bằng ảnh (AI)
                </Text>
                {aiResults.length > 0 ? (
                  <TouchableOpacity
                    onPress={clearResults}
                    className="rounded-full border border-[#E5E7EB] px-2 py-1">
                    <Text className="text-[11px] font-semibold text-[#6B7280]">Xóa kết quả</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <ImageSearchResults
                loading={aiLoading}
                error={aiError}
                hasSearched={aiHasSearched}
                results={aiResults}
                onPressResult={(productId) =>
                  router.push(`/product/${encodeURIComponent(productId)}`)
                }
                onClear={clearResults}
              />
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
                  : 'Tất cả trang sức'}
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

      <ImageSourceSheet
        visible={sheetVisible}
        onClose={closeSheet}
        onCamera={pickFromCamera}
        onLibrary={pickFromLibrary}
      />

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
