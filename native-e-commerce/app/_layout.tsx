import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { getOnboardingSeen } from '~/lib/onboardingStorage';
import { hydrateSession } from '~/lib/auth/session';
import { ToastProvider } from '~/components/ToastProvider';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootStack({ hasSeenOnboarding }: { hasSeenOnboarding: boolean }) {
  return (
    <Stack initialRouteName={hasSeenOnboarding ? '(tabs)' : 'onboarding'}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="admin/index" options={{ headerShown: true }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function RootLayout() {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        const onboardingSeen = await getOnboardingSeen();
        setHasSeenOnboarding(onboardingSeen);
        await hydrateSession();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn('Error preparing app:', e);
      } finally {
        setIsBootstrapped(true);
        if (Platform.OS !== 'web') {
          try {
            await SplashScreen.hideAsync();
          } catch (error) {
            console.warn('Error hiding splash screen:', error);
          }
        }
      }
    }

    prepare();
  }, []);

  if (!isBootstrapped) return null;

  return <RootStack hasSeenOnboarding={hasSeenOnboarding} />;
}

export default function App() {
  return (
    <ToastProvider>
      <RootLayout />
    </ToastProvider>
  );
}
