import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { getAppLocale, strings } from '~/lib/i18n';

export default function CheckoutFailure() {
  const router = useRouter();
  const locale = getAppLocale();
  const L = strings(locale);
  const params = useLocalSearchParams<{ error?: string; promoCode?: string }>();
  const errorMessage = params.error ?? (L.errors.orderFailed || 'Order placement failed');
  const promoCode = params.promoCode ?? '';
  const checkoutCopy = {
    failureTitle: 'Order Failed',
    failureMessage: 'There was an error processing your order. Please try again.',
    troubleshoot: 'Troubleshooting',
    troubleshoot1: 'Check your payment details and try again',
    troubleshoot2: 'Ensure sufficient funds are available',
    troubleshoot3: 'Contact support if the issue persists',
    retryCheckout: 'Try Again',
    backToCart: 'Back to Cart',
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: checkoutCopy.failureTitle,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-gradient-to-b from-[#FEF2F2] to-white">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="items-center justify-center px-5 pb-8 pt-12">
            {/* Error Icon */}
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-[#EF4444]">
              <Ionicons name="close" size={40} color="white" />
            </View>

            {/* Error Title */}
            <Text className="text-center text-[32px] font-bold text-[#111827]">
              {checkoutCopy.failureTitle}
            </Text>
            <Text className="mt-3 text-center text-[16px] leading-[24px] text-[#6B7280]">
              {checkoutCopy.failureMessage}
            </Text>

            {/* Error Details */}
            <View className="mt-8 w-full rounded-[28px] bg-white p-6 shadow-sm">
              <View className="flex-row items-start gap-3 rounded-[20px] bg-[#FEF2F2] p-4">
                <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                <View className="flex-1">
                  <Text className="text-[12px] uppercase tracking-[1.5px] text-[#7F1D1D]">
                    {L.errors?.generic ?? 'Error Details'}
                  </Text>
                  <Text className="mt-2 text-[14px] leading-[20px] text-[#991B1B]">
                    {errorMessage}
                  </Text>
                </View>
              </View>
              {promoCode ? (
                <View className="mt-3 rounded-[14px] bg-[#FFF7ED] p-3">
                  <Text className="text-[12px] uppercase tracking-[1.5px] text-[#C2410C]">
                    Promo used
                  </Text>
                  <Text className="mt-1 text-[13px] font-semibold text-[#C2410C]">{promoCode}</Text>
                </View>
              ) : null}

              {/* Troubleshooting Tips */}
              <View className="mt-6">
                <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                  {checkoutCopy.troubleshoot}
                </Text>
                <View className="mt-3 gap-2">
                  <View className="flex-row items-start gap-2">
                    <Text className="mt-0.5 text-[16px] text-[#F97316]">•</Text>
                    <Text className="flex-1 text-[13px] leading-[20px] text-[#4B5563]">
                      {checkoutCopy.troubleshoot1}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <Text className="mt-0.5 text-[16px] text-[#F97316]">•</Text>
                    <Text className="flex-1 text-[13px] leading-[20px] text-[#4B5563]">
                      {checkoutCopy.troubleshoot2}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <Text className="mt-0.5 text-[16px] text-[#F97316]">•</Text>
                    <Text className="flex-1 text-[13px] leading-[20px] text-[#4B5563]">
                      {checkoutCopy.troubleshoot3}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-8 w-full gap-3">
              <Pressable
                className="items-center rounded-[24px] bg-[#F97316] px-6 py-4"
                onPress={() => router.replace('/checkout')}>
                <Text className="font-semibold text-white">
                  {checkoutCopy.retryCheckout}
                </Text>
              </Pressable>
              <Pressable
                className="items-center rounded-[24px] border border-[#E5E7EB] bg-white px-6 py-4"
                onPress={() => router.replace('/cart')}>
                <Text className="font-semibold text-[#111827]">
                  {checkoutCopy.backToCart}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
