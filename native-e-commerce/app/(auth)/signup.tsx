import { Stack } from 'expo-router';
import SignupScreen from '~/features/auth/screens/SignupScreen';

export default function SignupRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sign Up' }} />
      <SignupScreen />
    </>
  );
}
