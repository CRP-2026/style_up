import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AppCard } from '~/components/ui/AppCard';
import { EmptyBlock, LoadingBlock } from '~/components/ui/StateBlocks';
import {
  adminDashboardRevenue,
  adminDashboardSummary,
  adminDashboardTopProducts,
} from '~/lib/api/admin';
import { formatCurrency } from '~/lib/utils/formatters';

type Summary = {
  totalOrders: number;
  revenue: number;
  activeProducts: number;
  lowStockVariants: number;
};

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [revenueRows, setRevenueRows] = useState<{ day: string; revenue: number; orders: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ productId: string; name: string; quantity: number; revenue: number }[]>([]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    try {
      const [s, r, t] = await Promise.all([
        adminDashboardSummary(),
        adminDashboardRevenue(7),
        adminDashboardTopProducts(5),
      ]);
      setSummary(s);
      setRevenueRows(r);
      setTopProducts(t);
    } finally {
      if (mode === 'initial') setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: 'Admin · Dashboard' }} />
      <ScrollView
        className="flex-1 bg-[#F4F4F4]"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}>
        <View className="px-4 pb-10 pt-5">
          <View className="mb-3">
            <Text className="text-[20px] font-semibold text-[#1F2937]">Dashboard vận hành</Text>
            <Text className="mt-1 text-[13px] text-[#6B7280]">
              Theo dõi nhanh doanh thu, hiệu suất bán và tồn kho.
            </Text>
          </View>
          {loading ? (
            <LoadingBlock label="Đang tải báo cáo..." />
          ) : !summary ? (
            <EmptyBlock title="Không có dữ liệu" hint="Chưa thể tải dữ liệu dashboard." />
          ) : (
            <>
              <View className="mb-3 flex-row flex-wrap gap-3">
                <MetricCard label="Tổng đơn" value={String(summary.totalOrders)} />
                <MetricCard label="Doanh thu" value={formatCurrency(summary.revenue)} />
              </View>
              <View className="mb-3 flex-row flex-wrap gap-3">
                <MetricCard label="Sản phẩm active" value={String(summary.activeProducts)} />
                <MetricCard label="Variant sắp hết" value={String(summary.lowStockVariants)} />
              </View>

              <AppCard className="mb-3">
                <Text className="text-[16px] font-semibold text-[#1F2937]">Doanh thu 7 ngày</Text>
                <LineChart rows={revenueRows} />
                <View className="mt-3 gap-2">
                  {revenueRows.map((row) => (
                    <View key={row.day} className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-[13px] text-[#6B7280]">{row.day}</Text>
                      <Text className="text-right text-[13px] font-semibold text-[#1F2937]">
                        {formatCurrency(row.revenue)} · {row.orders} đơn
                      </Text>
                    </View>
                  ))}
                </View>
              </AppCard>

              <AppCard>
                <Text className="text-[16px] font-semibold text-[#1F2937]">Top sản phẩm</Text>
                <BarChart rows={topProducts} />
                <View className="mt-3 gap-2">
                  {topProducts.map((row, idx) => (
                    <View key={row.productId} className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-[13px] text-[#1F2937]">
                        {idx + 1}. {row.name}
                      </Text>
                      <Text className="text-right text-[12px] text-[#6B7280]">
                        {row.quantity} · {formatCurrency(row.revenue)}
                      </Text>
                    </View>
                  ))}
                </View>
              </AppCard>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function LineChart({ rows }: { rows: { day: string; revenue: number; orders: number }[] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  const points = rows.map((r, i) => ({
    x: (i / Math.max(1, rows.length - 1)) * 100,
    y: 100 - (r.revenue / max) * 100,
  }));
  return (
    <View className="mt-3 h-28 rounded-[14px] bg-[#F8FAFC] p-2">
      {points.slice(0, -1).map((p, idx) => {
        const n = points[idx + 1];
        const dx = n.x - p.x;
        const dy = n.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={`seg-${idx}`}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${len}%`,
              height: 2,
              backgroundColor: '#F97316',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {points.map((p, idx) => (
        <View
          key={`dot-${rows[idx]?.day ?? idx}`}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%` }}
          className="h-2.5 w-2.5 -translate-x-1 -translate-y-1 rounded-full bg-[#F97316]"
        />
      ))}
    </View>
  );
}

function BarChart({
  rows,
}: {
  rows: { productId: string; name: string; quantity: number; revenue: number }[];
}) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <View className="mt-3 flex-row items-end gap-2 rounded-[14px] bg-[#F8FAFC] p-3">
      {rows.map((row) => {
        const h = Math.max(8, Math.round((row.revenue / max) * 90));
        return (
          <View key={row.productId} className="flex-1 items-center">
            <View
              style={{ height: h }}
              className="w-full rounded-t-[8px] bg-[#F97316]"
            />
            <Text numberOfLines={1} className="mt-1 text-[10px] text-[#6B7280]">
              {row.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[47%] flex-1 rounded-[18px] bg-white p-3 shadow-sm">
      <Text className="text-[11px] uppercase tracking-[1px] text-[#9CA3AF]">{label}</Text>
      <Text className="mt-1 text-[16px] font-bold text-[#1F2937]">{value}</Text>
    </View>
  );
}
