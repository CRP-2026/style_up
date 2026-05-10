import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, View } from 'react-native';

import { Button } from '~/components/Button';
import { apiGet, apiPost } from '~/lib/api/client';
import { fetchOrderDetail } from '~/lib/api/orders';
import { getAppLocale, resolveApiError } from '~/lib/i18n';
import type { OrderDetail } from '~/lib/types/orders';
import { formatCurrency } from '~/lib/utils/formatters';

type QrData = {
  order_id: string;
  order_code: string;
  amount: number;
  transfer_content: string;
  qr_url: string;
  account_name: string;
  account_no: string;
  bank_id: string;
  status: string;
  payment_status: string;
};

export default function PaymentQRScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    promoCode?: string | string[];
  }>();
  const locale = getAppLocale();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const promoCode = Array.isArray(params.promoCode) ? params.promoCode[0] : params.promoCode;

  const [qrData, setQrData] = useState<QrData | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const navigatedRef = useRef(false);

  const goToSuccess = useCallback(
    (detail: OrderDetail) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.replace({
        pathname: '/payment-success' as any,
        params: {
          orderId: detail.id,
          promoCode: promoCode ?? undefined,
          paymentStatus: detail.paymentStatus ?? 'paid',
        },
      });
    },
    [promoCode, router]
  );

  const syncOrderStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const detail = await fetchOrderDetail(orderId);
      setOrderDetail(detail);
      if (detail.paymentStatus === 'paid') {
        goToSuccess(detail);
      }
    } catch {
      // Polling failures should not interrupt the checkout flow.
    }
  }, [goToSuccess, orderId]);

  const loadPaymentData = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [qr, detail] = await Promise.all([
        apiGet<QrData>(`payments/qr/${encodeURIComponent(orderId)}`),
        fetchOrderDetail(orderId),
      ]);
      setQrData(qr);
      setOrderDetail(detail);
      if (detail.paymentStatus === 'paid' || qr.payment_status === 'paid') {
        goToSuccess(detail);
      }
    } catch (error) {
      Alert.alert('Lỗi', resolveApiError(error, locale));
    } finally {
      setLoading(false);
    }
  }, [goToSuccess, locale, orderId]);

  useEffect(() => {
    void loadPaymentData();
  }, [loadPaymentData]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId) return undefined;

      void syncOrderStatus();
      const intervalId = setInterval(() => {
        void syncOrderStatus();
      }, 4000);

      return () => {
        clearInterval(intervalId);
      };
    }, [orderId, syncOrderStatus])
  );

  const handleConfirmPayment = async () => {
    if (!orderId) return;

    setConfirming(true);
    try {
      await apiPost(`payments/mock-success/${encodeURIComponent(orderId)}`, {});
      const detail = await fetchOrderDetail(orderId);
      setOrderDetail(detail);
      goToSuccess(detail);
    } catch (error) {
      Alert.alert('Thông báo', resolveApiError(error, locale));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-[14px] text-[#6B7280]">Đang tạo mã VietQR...</Text>
      </View>
    );
  }

  if (!orderId || !qrData) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <Text className="text-[18px] font-semibold text-[#111827]">
          Không thể tải dữ liệu thanh toán.
        </Text>
        <Text className="mt-2 text-center text-[14px] text-[#6B7280]">
          Đơn hàng có thể đã bị thay đổi hoặc không còn hợp lệ.
        </Text>
        <View className="mt-5 w-full">
          <Button title="Quay lại" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Thanh toán VietQR',
          headerShadowVisible: false,
        }}
      />

      <View className="flex-1 bg-[#F8FAFC]">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="px-5 pb-10 pt-4">
            <Text className="text-[13px] uppercase tracking-[3px] text-[#F97316]">
              Secure checkout
            </Text>
            <Text className="mt-2 text-[30px] font-bold text-[#111827]">Quét QR để thanh toán</Text>
            <Text className="mt-2 text-[14px] leading-[22px] text-[#6B7280]">
              Mở ứng dụng ngân hàng, quét mã dưới đây và chuyển đúng số tiền với nội dung hiển thị.
            </Text>

            <View className="mt-5 rounded-[28px] bg-white p-4 shadow-sm">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                    Mã đơn
                  </Text>
                  <Text className="mt-1 text-[16px] font-semibold text-[#111827]" numberOfLines={1}>
                    {qrData.order_code}
                  </Text>
                </View>
                <View className="rounded-full bg-[#ECFDF3] px-3 py-1.5">
                  <Text className="text-[11px] font-semibold text-[#166534]">
                    {qrData.payment_status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="mt-4 items-center rounded-[24px] border border-[#E5E7EB] bg-[#FFFDFB] p-4">
                <View className="rounded-[20px] bg-white p-3 shadow-sm">
                  <Image
                    source={{ uri: qrData.qr_url }}
                    style={{ width: 256, height: 256 }}
                    resizeMode="contain"
                  />
                </View>
                <Text className="mt-4 text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                  Số tiền thanh toán
                </Text>
                <Text className="mt-1 text-[28px] font-bold text-[#111827]">
                  {formatCurrency(qrData.amount)}
                </Text>
                <Text className="mt-2 text-center text-[13px] leading-[20px] text-[#6B7280]">
                  Chuyển khoản với nội dung:{' '}
                  <Text className="font-semibold text-[#111827]">{qrData.transfer_content}</Text>
                </Text>
              </View>

              <View className="mt-4 rounded-[22px] bg-[#F8FAFC] p-4">
                <InfoRow label="Ngân hàng" value={qrData.bank_id} />
                <InfoRow label="Số tài khoản" value={qrData.account_no} />
                <InfoRow label="Chủ tài khoản" value={qrData.account_name} />
                <InfoRow label="Nội dung" value={qrData.transfer_content} />
              </View>
            </View>

            <View className="mt-4 rounded-[28px] bg-white p-4 shadow-sm">
              <Text className="text-[16px] font-semibold text-[#111827]">Trạng thái đơn hàng</Text>
              <View className="mt-3 rounded-[18px] bg-[#FFF7F2] px-4 py-3">
                <Text className="text-[12px] uppercase tracking-[1.5px] text-[#B45309]">
                  Hiện tại
                </Text>
                <Text className="mt-1 text-[14px] font-semibold text-[#111827]">
                  {orderDetail?.paymentStatus === 'paid'
                    ? 'Đã thanh toán'
                    : orderDetail?.status === 'processing'
                      ? 'Đơn đang được xử lý'
                      : 'Chờ thanh toán'}
                </Text>
                <Text className="mt-1 text-[13px] leading-[20px] text-[#6B7280]">
                  Sau khi chuyển khoản xong, quay lại ứng dụng và nhấn nút xác nhận. Hệ thống sẽ ghi
                  nhận đơn hàng ở trạng thái PAID.
                </Text>
              </View>
            </View>

            <View className="mt-5 gap-3">
              <Button
                title={confirming ? 'Đang xác nhận...' : 'Tôi đã thanh toán'}
                onPress={handleConfirmPayment}
                loading={confirming}
                disabled={confirming}
              />
              <Button
                title="Quay lại"
                variant="secondary"
                onPress={() => router.back()}
                disabled={confirming}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-4 last:mb-0">
      <Text className="text-[13px] text-[#6B7280]">{label}</Text>
      <Text className="flex-1 text-right text-[13px] font-semibold text-[#111827]">{value}</Text>
    </View>
  );
}
