import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';

import { register } from '~/lib/api/auth';
import { afterAuthLogin } from '~/lib/auth/session';
import { getAppLocale, resolveSignupError, strings } from '~/lib/i18n';
import { useToast } from '~/components/ToastProvider';

export default function SignupScreen() {
  const locale = getAppLocale();
  const L = strings(locale);
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) {
      addToast('warning', L.errors.missingFields, L.errors.signupMissingName);
      return;
    }
    if (!email.trim()) {
      addToast('warning', L.errors.missingFields, L.errors.signupMissingEmail);
      return;
    }
    if (password.length < 6) {
      addToast('warning', L.errors.missingFields, L.errors.signupBadPassword);
      return;
    }
    if (password !== confirmPassword) {
      addToast('warning', L.errors.missingFields, L.errors.signupPasswordMismatch);
      return;
    }
    setSubmitting(true);
    try {
      const res = await register(name.trim(), email.trim(), password);
      await afterAuthLogin(res.access_token);
      addToast('success', L.errors.signupSuccessTitle, L.errors.signupSuccessBody);
      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (e) {
      addToast('error', L.errors.signupFailed, resolveSignupError(e, locale));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <View className="px-[29px] pb-8 pt-[63px]">
        <Text className="mb-10 text-[44px] font-bold leading-[52px] text-black">
          Create an{'\n'}account
        </Text>

        <View className="gap-4">
          <View className="h-[55px] flex-row items-center rounded-[10px] border border-[#A8A8A9] bg-[#F3F3F3] px-3">
            <FontAwesome
              name="user"
              size={18}
              color="#676767"
              style={{ marginRight: 10, width: 20, textAlign: 'center' }}
            />
            <TextInput
              className="flex-1 text-xs font-medium text-[#676767]"
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#676767"
            />
          </View>

          <View className="h-[55px] flex-row items-center rounded-[10px] border border-[#A8A8A9] bg-[#F3F3F3] px-3">
            <FontAwesome
              name="envelope"
              size={16}
              color="#676767"
              style={{ marginRight: 10, width: 20, textAlign: 'center' }}
            />
            <TextInput
              className="flex-1 text-xs font-medium text-[#676767]"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#676767"
            />
          </View>

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

          <View className="h-[55px] flex-row items-center rounded-[10px] border border-[#A8A8A9] bg-[#F3F3F3] px-3">
            <FontAwesome5
              name="lock"
              size={16}
              color="#676767"
              style={{ marginRight: 10, width: 20, textAlign: 'center' }}
            />
            <TextInput
              className="flex-1 text-xs font-medium text-[#676767]"
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#676767"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#676767"
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-md mt-[18px] w-[85%] leading-[18px] text-[#676767]">
          By clicking the <Text className="text-[#FF4B26]">Register</Text> button, you agree to the
          public offer
        </Text>

        <TouchableOpacity
          className={`mt-7 h-[55px] items-center justify-center rounded bg-[#F83758] ${submitting ? 'opacity-60' : ''}`}
          onPress={handleSignup}
          disabled={submitting}>
          <Text className="text-[20px] font-semibold text-white">Create Account</Text>
        </TouchableOpacity>

        <View className="mt-10 items-center">
          <Text className="mb-5 text-xs font-medium text-[#575757]">- OR Continue with -</Text>
          <View className="flex-row gap-[10px]">
            <TouchableOpacity className="h-[54px] w-[54px] items-center justify-center rounded-full border border-[#F83758] bg-[#FCF3F6]">
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
          <Text className="text-md text-[#575757]">I Already Have an Account </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-md font-semibold text-[#F83758] underline">Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
