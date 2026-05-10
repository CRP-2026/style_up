import { View, Text, TouchableOpacity, TextInput, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { FontAwesome, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';

import { login } from '~/lib/api/auth';
import { afterAuthLogin } from '~/lib/auth/session';
import { getAppLocale, resolveLoginError, strings } from '~/lib/i18n';
import { useToast } from '~/components/ToastProvider';

export default function LoginScreen() {
  const locale = getAppLocale();
  const L = strings(locale);
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();

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
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        className="flex-1 bg-[#0F0F13]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}>

        {/* Top gradient section */}
        <View
          className="px-7 pb-10 pt-16"
          style={{ backgroundColor: '#0F0F13' }}>
          {/* Logo */}
          <View className="flex-row items-center gap-3 mb-10">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#F83758]">
              <Feather name="shopping-bag" size={18} color="white" />
            </View>
            <View>
              <Text className="text-[20px] font-bold text-white">Style Up</Text>
              <Text className="text-[10px] tracking-widest text-[#F83758] uppercase font-bold">Admin Panel</Text>
            </View>
          </View>

          <Text style={{ fontSize: 38, fontWeight: '800', color: 'white', lineHeight: 46 }}>
            Xin chào{'\n'}trở lại 👋
          </Text>
          <Text className="mt-3 text-[15px] text-white/50">
            Đăng nhập vào tài khoản của bạn
          </Text>
        </View>

        {/* Card form */}
        <View
          className="flex-1 px-6 pt-8 pb-12"
          style={{
            backgroundColor: '#FAFAFA',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
          }}>

          {/* Email */}
          <View className="mb-5">
            <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Email
            </Text>
            <View
              className="flex-row items-center rounded-[14px] px-4 h-[54px]"
              style={{
                backgroundColor: '#F4F4F6',
                borderWidth: 1.5,
                borderColor: emailFocused ? '#F83758' : 'transparent',
              }}>
              <Feather name="mail" size={18} color={emailFocused ? '#F83758' : '#9CA3AF'} />
              <TextInput
                className="flex-1 ml-3 text-[15px] text-[#1F1F1F]"
                style={{ outline: 'none' } as any}
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#C4C4C4"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-3">
            <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Mật khẩu
            </Text>
            <View
              className="flex-row items-center rounded-[14px] px-4 h-[54px]"
              style={{
                backgroundColor: '#F4F4F6',
                borderWidth: 1.5,
                borderColor: passwordFocused ? '#F83758' : 'transparent',
              }}>
              <Feather name="lock" size={18} color={passwordFocused ? '#F83758' : '#9CA3AF'} />
              <TextInput
                className="flex-1 ml-3 text-[15px] text-[#1F1F1F]"
                style={{ outline: 'none' } as any}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#C4C4C4"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} activeOpacity={0.7}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity className="mb-6 items-end" onPress={() => router.push('/(auth)/forgot' as any)}>
            <Text className="text-[13px] font-medium text-[#F83758]">Quên mật khẩu?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            className="h-[56px] items-center justify-center rounded-[16px]"
            style={{
              backgroundColor: submitting ? '#F8375880' : '#F83758',
              shadowColor: '#F83758',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
            }}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}>
            {submitting ? (
              <View className="flex-row items-center gap-2">
                <Feather name="loader" size={18} color="white" />
                <Text className="text-[16px] font-bold text-white">Đang đăng nhập...</Text>
              </View>
            ) : (
              <Text className="text-[16px] font-bold text-white">Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="my-8 flex-row items-center gap-3">
            <View className="flex-1 h-[1px] bg-[#EBEBEB]" />
            <Text className="text-[12px] text-[#C4C4C4]">Hoặc tiếp tục với</Text>
            <View className="flex-1 h-[1px] bg-[#EBEBEB]" />
          </View>

          {/* Social buttons */}
          <View className="flex-row gap-3">
            {[
              { icon: 'google' as const, color: '#DB4437' },
              { icon: 'apple' as const, color: '#000000' },
              { icon: 'facebook' as const, color: '#3b5998' },
            ].map(({ icon, color }) => (
              <TouchableOpacity
                key={icon}
                activeOpacity={0.8}
                className="flex-1 h-[50px] items-center justify-center rounded-[14px] border border-[#EBEBEB] bg-white"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                <FontAwesome name={icon} size={22} color={color} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Sign up */}
          <View className="mt-8 flex-row items-center justify-center gap-1">
            <Text className="text-[14px] text-[#9CA3AF]">Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} activeOpacity={0.7}>
              <Text className="text-[14px] font-bold text-[#F83758]"> Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
