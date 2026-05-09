import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable, ScrollView } from 'react-native';

export default function CheckoutSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string; promoCode?: string }>();
  const orderId = params.orderId ?? '';
  const promoCode = params.promoCode ?? '';
  const checkoutCopy = {
    successTitle: 'Order Placed!',
    successMessage: 'Your order was placed successfully.',
    orderId: 'Order ID',
    nextSteps: 'What happens next?',
    step1Title: 'Order confirmed',
    step1Desc: 'We are preparing your order.',
    step2Title: 'Shipped',
    step2Desc: 'We will notify you when it ships.',
    step3Title: 'Delivered',
    step3Desc: 'Track your order at any time.',
    viewOrder: 'View Order Details',
    continueShopping: 'Continue Shopping',
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: checkoutCopy.successTitle,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-gradient-to-b from-[#FFF8F4] to-white">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="items-center justify-center px-5 pb-8 pt-12">
            {/* Success Icon */}
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-[#12B76A]">
              <Ionicons name="checkmark" size={40} color="white" />
            </View>

            {/* Main Message */}
            <Text className="text-center text-[32px] font-bold text-[#111827]">
              {checkoutCopy.successTitle}
            </Text>
            <Text className="mt-3 text-center text-[16px] leading-[24px] text-[#6B7280]">
              {checkoutCopy.successMessage}
            </Text>

            {/* Order Details Card */}
            <View className="mt-8 w-full rounded-[28px] bg-white p-6 shadow-sm">
              <View className="mb-4 border-b border-[#E5E7EB] pb-4">
                <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                  {checkoutCopy.orderId}
                </Text>
                <Text className="mt-2 text-[18px] font-semibold text-[#111827]" numberOfLines={1}>
                  {orderId}
                </Text>
              </View>
              {promoCode ? (
                <View className="mb-4 rounded-[14px] bg-[#ECFDF3] p-3">
                  <Text className="text-[12px] uppercase tracking-[1.5px] text-[#166534]">
                    Promo applied
                  </Text>
                  <Text className="mt-1 text-[13px] font-semibold text-[#166534]">{promoCode}</Text>
                </View>
              ) : null}

              <View>
                <Text className="text-[12px] uppercase tracking-[1.5px] text-[#6B7280]">
                  {checkoutCopy.nextSteps}
                </Text>
                <View className="mt-3 gap-3">
                  <View className="flex-row items-start gap-3">
                    <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-[#FFF4ED]">
                      <Text className="text-[12px] font-bold text-[#F97316]">1</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-[#111827]">
                        {checkoutCopy.step1Title}
                      </Text>
                      <Text className="mt-1 text-[13px] text-[#6B7280]">
                        {checkoutCopy.step1Desc}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-start gap-3">
                    <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-[#FFF4ED]">
                      <Text className="text-[12px] font-bold text-[#F97316]">2</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-[#111827]">
                        {checkoutCopy.step2Title}
                      </Text>
                      <Text className="mt-1 text-[13px] text-[#6B7280]">
                        {checkoutCopy.step2Desc}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-start gap-3">
                    <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-[#FFF4ED]">
                      <Text className="text-[12px] font-bold text-[#F97316]">3</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-[#111827]">
                        {checkoutCopy.step3Title}
                      </Text>
                      <Text className="mt-1 text-[13px] text-[#6B7280]">
                        {checkoutCopy.step3Desc}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-8 w-full gap-3">
              <Pressable
                className="items-center rounded-[24px] bg-[#F97316] px-6 py-4"
                onPress={() => router.push(`/order/${encodeURIComponent(orderId)}`)}>
                <Text className="font-semibold text-white">
                  {checkoutCopy.viewOrder}
                </Text>
              </Pressable>
              <Pressable
                className="items-center rounded-[24px] border border-[#E5E7EB] bg-white px-6 py-4"
                onPress={() => router.replace('/(tabs)')}>
                <Text className="font-semibold text-[#111827]">
                  {checkoutCopy.continueShopping}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
