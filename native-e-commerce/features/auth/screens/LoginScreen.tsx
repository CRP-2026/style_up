import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';

import { login, googleLogin } from '~/lib/api/auth';
import { afterAuthLogin } from '~/lib/auth/session';
import { getAppLocale, resolveLoginError, strings } from '~/lib/i18n';
import { useToast } from '~/components/ToastProvider';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'jewelry-store',
  });

  console.log('Redirect URI:', redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleBackendLogin(id_token);
    }
  }, [response]);

  const handleBackendLogin = async (googleToken: string) => {
  try {
    setSubmitting(true);

    const res = await googleLogin(googleToken);

    await afterAuthLogin(res.access_token);

    router.replace('/(tabs)');
  } catch (e) {
    addToast(
      'error',
      'Google Login Failed',
      resolveLoginError(e, locale)
    );
  } finally {
    setSubmitting(false);
  }
};

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      addToast('warning', L.errors.missingFields, L.errors.enterEmailPassword);
      return;
    }
    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      await afterAuthLogin(res.access_token);
      router.replace('/(tabs)');
    } catch (e) {
      addToast('error', L.errors.loginFailed, resolveLoginError(e, locale));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <View className="px-8 pb-8 pt-[63px]">
        <Text className="mb-10 text-[50px] font-bold leading-[58px] text-black">
          Welcome{'\n'}Back!
        </Text>

        <View className="gap-8">
          <View className="h-[55px] flex-row items-center rounded-[10px] border border-[#A8A8A9] bg-[#F3F3F3] px-3">
            <FontAwesome
              name="user"
              size={18}
              color="#676767"
              style={{ marginRight: 10, width: 20, textAlign: 'center' }}
            />
            <TextInput
              className="flex-1 text-xs font-medium text-[#676767]"
              placeholder="Username or Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#676767"
            />
          </View>

          <View>
            <View className="h-[55px] flex-row items-center rounded-[10px] border border-[#A8A8A9] bg-[#F3F3F3] px-3">
              <FontAwesome5
                name="lock"
                size={16}
                color="#676767"
                style={{ marginRight: 10, width: 20, textAlign: 'center' }}
              />
              <TextInput
                className="flex-1 text-xs font-medium text-[#676767]"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#676767"
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#676767"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity className="mt-2 items-end">
              <Text className="text-xs text-[#F83758]">Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          className={`mt-9 h-[55px] items-center justify-center rounded bg-[#F83758] ${submitting ? 'opacity-60' : ''}`}
          onPress={handleLogin}
          disabled={submitting}>
          <Text className="text-[24px] font-semibold text-white">Login</Text>
        </TouchableOpacity>

        <View className="mt-[75px] items-center">
          <Text className="text-md mb-5 font-medium text-[#575757]">- OR Continue with -</Text>
          <View className="flex-row gap-[10px]">
            <TouchableOpacity
             disabled={!request}
             onPress={() => promptAsync()} 
             className="h-[54px] w-[54px] items-center justify-center rounded-full border border-[#F83758] bg-[#FCF3F6]">
              <FontAwesome name="google" size={24} color="#DB4437" />
            </TouchableOpacity>
            <TouchableOpacity className="h-[54px] w-[54px] items-center justify-center rounded-full border border-[#F83758] bg-[#FCF3F6]">
              <FontAwesome name="apple" size={24} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity className="h-[54px] w-[54px] items-center justify-center rounded-full border border-[#F83758] bg-[#FCF3F6]">
              <FontAwesome name="facebook" size={24} color="#3b5998" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-12 flex-row items-center justify-center">
          <Text className="text-[20px] text-[#575757]">Create An Account </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text className="text-[21px] font-semibold text-[#F83758] underline">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
