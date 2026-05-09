import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { resetOnboardingSeen } from '~/lib/onboardingStorage';
import { useToast } from '~/components/ToastProvider';

type TestRouteItem = {
  label: string;
  path?: string;
  variant?: 'primary' | 'outline';
  onPress?: () => void;
};

const TAB_ROUTES: TestRouteItem[] = [
  { label: 'Home Tab', path: '/(tabs)' },
  { label: 'Cart Tab', path: '/(tabs)/cart' },
  { label: 'Order Tab', path: '/(tabs)/order' },
  { label: 'Account Tab', path: '/(tabs)/account' },
];

const AUTH_ROUTES: TestRouteItem[] = [
  { label: 'Login', path: '/(auth)/login' },
  { label: 'Signup', path: '/(auth)/signup' },
  { label: 'Forgot Password', path: '/(auth)/forgot' },
];

const FLOW_ROUTES: TestRouteItem[] = [
  { label: 'Checkout', path: '/checkout' },
  { label: 'Address', path: '/address' },
  { label: 'Onboarding', path: '/onboarding' },
  { label: 'Modal', path: '/modal' },
  { label: 'Checkout Success', path: '/checkout-success' },
  { label: 'Checkout Failure', path: '/checkout-failure' },
];

const DETAIL_ROUTES: TestRouteItem[] = [
  { label: 'Product Detail (sample)', path: '/product/jewelry-set-01' },
  { label: 'Orders list', path: '/(tabs)/order' },
  { label: 'Edit Profile', path: '/account/edit' },
  { label: 'Addresses', path: '/addresses' },
];

export default function Settings() {
  const router = useRouter();
  const { addToast } = useToast();

  const handleResetOnboarding = async () => {
    await resetOnboardingSeen();
    addToast('success', 'Done', 'Onboarding has been reset. Reopen app to see it again.');
    console.log('Onboarding has been reset. Reopen app to see it again.');
  };

  const renderItem = (item: TestRouteItem) => {
    const isPrimary = item.variant === 'primary';

    return (
      <TouchableOpacity
        key={item.label}
        className={`items-center rounded-lg py-3 ${isPrimary ? 'bg-[#007AFF]' : 'border border-[#007AFF]'}`}
        onPress={() => {
          if (item.onPress) {
            item.onPress();
            return;
          }

          if (item.path) {
            // cast to any to avoid expo-router generated route union type in this test helper
            router.push(item.path as any);
          }
        }}>
        <Text className={`text-base font-semibold ${isPrimary ? 'text-white' : 'text-[#007AFF]'}`}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const actions: TestRouteItem[] = [
    {
      label: 'Reset Onboarding',
      variant: 'outline',
      onPress: handleResetOnboarding,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView className="flex-1 bg-white" contentContainerClassName="p-5 pb-10">
        <Text className="text-2xl font-bold text-gray-900">Settings Test Navigator</Text>
        <Text className="mt-1 text-gray-500">Quick links để test tất cả màn hình chính.</Text>

        <Section title="Tabs">{TAB_ROUTES.map(renderItem)}</Section>
        <Section title="Auth">{AUTH_ROUTES.map(renderItem)}</Section>
        <Section title="Flow">{FLOW_ROUTES.map(renderItem)}</Section>
        <Section title="Dynamic Detail Routes">{DETAIL_ROUTES.map(renderItem)}</Section>

        <Section title="Actions">{actions.map(renderItem)}</Section>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-7">
      <Text className="mb-3 text-sm font-semibold uppercase tracking-[1px] text-gray-500">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}
