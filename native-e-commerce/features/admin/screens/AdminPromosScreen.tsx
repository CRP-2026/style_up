import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AppInput } from '~/components/ui/AppInput';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '~/components/ui/StateBlocks';
import {
  adminArchivePromo,
  adminCreatePromo,
  adminDeletePromo,
  adminListPromos,
  adminPromoUsages,
  adminSetPromoActive,
  adminUpdatePromo,
  type PromoRow,
  type PromoUsageRow,
} from '~/lib/api/admin';
import { ApiError } from '~/lib/api/errors';
import { getAppLocale, resolveApiError, strings } from '~/lib/i18n';
import { formatCurrency } from '~/lib/utils/formatters';

export default function AdminPromosScreen() {
  const locale = getAppLocale();
  const L = strings(locale);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [discountValue, setDiscountValue] = useState('50000');
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [usageRows, setUsageRows] = useState<PromoUsageRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const rows = await adminListPromos();
      setPromos(rows);
    } catch (e) {
      setError(e instanceof ApiError ? resolveApiError(e, locale) : L.errors.homeLoadFailed);
    } finally {
      if (mode === 'initial') setLoading(false);
      else setRefreshing(false);
    }
  }, [locale, L.errors.homeLoadFailed]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const createPromo = async () => {
    if (!code.trim()) return;
    try {
      await adminCreatePromo({
        code: code.trim().toUpperCase(),
        discountType: 'fixed',
        discountValue: Number(discountValue || '0'),
        minOrderTotal: 300000,
        usageLimit: 100,
        isActive: true,
      });
      setCode('');
      await load('refresh');
    } catch (e) {
      setError(e instanceof ApiError ? resolveApiError(e, locale) : 'Không tạo được promo');
    }
  };

  const loadUsages = async (promoId: string) => {
    setUsageLoading(true);
    try {
      const rows = await adminPromoUsages(promoId, { limit: 30 });
      setUsageRows(rows);
      setSelectedPromoId(promoId);
    } catch (e) {
      setError(e instanceof ApiError ? resolveApiError(e, locale) : 'Không tải được usage');
    } finally {
      setUsageLoading(false);
    }
  };

  const updateValue = async (promo: PromoRow) => {
    const nextValue = Math.max(0, Math.round(promo.discountValue + 10000));
    try {
      await adminUpdatePromo(promo.id, { discountValue: nextValue });
      await load('refresh');
    } catch (e) {
      setError(e instanceof ApiError ? resolveApiError(e, locale) : 'Không cập nhật được promo');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Admin · Promo' }} />
      <ScrollView
        className="flex-1 bg-[#F4F4F4]"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}>
        <View className="px-4 pb-10 pt-5">
          <View className="mb-3">
            <Text className="text-[20px] font-semibold text-[#1F2937]">Khuyến mãi</Text>
            <Text className="mt-1 text-[13px] text-[#6B7280]">
              Tạo và kiểm soát promo code nhanh cho chiến dịch bán hàng.
            </Text>
          </View>
          <View className="rounded-[20px] bg-white p-4 shadow-sm">
            <Text className="text-[15px] font-semibold text-[#1F2937]">Tạo promo code nhanh</Text>
            <View className="mt-3 gap-2">
              <AppInput value={code} onChangeText={setCode} label="Code" placeholder="VD: SALE50K" />
              <AppInput
                value={discountValue}
                onChangeText={(v) => setDiscountValue(v.replace(/[^0-9]/g, ''))}
                label="Giảm cố định (VND)"
                keyboardType="numeric"
              />
              <Pressable onPress={createPromo} className="rounded-[14px] bg-[#F97316] py-3">
                <Text className="text-center text-[13px] font-semibold text-white">Tạo promo</Text>
              </Pressable>
            </View>
          </View>
          {loading ? (
            <LoadingBlock label="Đang tải promo..." />
          ) : error ? (
            <ErrorBlock message={error} onRetry={() => void load('refresh')} />
          ) : promos.length === 0 ? (
            <EmptyBlock title="Chưa có promo" hint="Tạo promo đầu tiên để dùng cho checkout." />
          ) : (
            <View className="mt-3 gap-3">
              {promos.map((p) => (
                <View key={p.id} className="rounded-[20px] bg-white p-4 shadow-sm">
                  <Text className="text-[15px] font-bold text-[#1F2937]">{p.code}</Text>
                  <Text className="mt-1 text-[12px] text-[#6B7280]">
                    {p.discountType} · {formatCurrency(p.discountValue)} · used {p.usedCount}/
                    {p.usageLimit ?? '∞'}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#6B7280]">
                    min order {formatCurrency(p.minOrderTotal)} · {p.isActive ? 'active' : 'inactive'}
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <Pressable
                      onPress={() => void updateValue(p)}
                      className="rounded-full border border-[#E5E7EB] px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-[#374151]">+10k discount</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void adminSetPromoActive(p.id, !p.isActive).then(() => load('refresh'))}
                      className="rounded-full border border-[#FED7AA] px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-[#C2410C]">
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void adminArchivePromo(p.id).then(() => load('refresh'))}
                      className="rounded-full border border-[#E5E7EB] px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-[#4B5563]">Archive</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void adminDeletePromo(p.id).then(() => load('refresh'))}
                      className="rounded-full border border-[#FECACA] px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-[#DC2626]">Delete</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void loadUsages(p.id)}
                      className="rounded-full border border-[#BFDBFE] px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-[#1D4ED8]">Usage details</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
          {selectedPromoId ? (
            <View className="mt-5 rounded-[20px] bg-white p-4 shadow-sm">
              <Text className="text-[15px] font-semibold text-[#1F2937]">Lịch sử dùng promo</Text>
              {usageLoading ? (
                <LoadingBlock label="Đang tải usage..." />
              ) : usageRows.length === 0 ? (
                <Text className="mt-2 text-[12px] text-[#6B7280]">Chưa có lượt dùng cho promo này.</Text>
              ) : (
                <View className="mt-2 gap-2">
                  {usageRows.map((u) => (
                    <View key={u.id} className="rounded-[12px] bg-[#F9FAFB] p-3">
                      <Text className="text-[12px] font-semibold text-[#111827]">
                        {u.orderCode} · {formatCurrency(u.discountApplied)}
                      </Text>
                      <Text className="text-[11px] text-[#6B7280]">{u.userId}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
