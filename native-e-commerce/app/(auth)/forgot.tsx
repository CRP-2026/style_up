import { Stack } from 'expo-router';
import ForgotScreen from '~/features/auth/screens/ForgotScreen';

export default function ForgotRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Forgot' }} />
      <ForgotScreen />
    </>
  );
}