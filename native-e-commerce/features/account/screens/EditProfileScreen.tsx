import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View, Pressable } from 'react-native';
import { useToast } from '~/components/ToastProvider';

export default function EditProfileScreen() {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState('Võ Tấn Đức');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');

  function save() {
    addToast('success', 'Saved', 'Profile updated');
    setTimeout(() => router.back(), 1200);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <View className="flex-1 bg-white p-4">
        <Text className="mb-2 font-semibold">Name</Text>
        <TextInput value={name} onChangeText={setName} className="mb-3 rounded border p-3" />

        <Text className="mb-2 font-semibold">Bio</Text>
        <TextInput value={bio} onChangeText={setBio} className="mb-3 rounded border p-3" />

        <Text className="mb-2 font-semibold">Avatar URL</Text>
        <TextInput value={avatar} onChangeText={setAvatar} className="mb-3 rounded border p-3" />

        <Pressable className="mt-4 items-center rounded-lg bg-[#007AFF] py-3" onPress={save}>
          <Text className="font-semibold text-white">Save</Text>
        </Pressable>
      </View>
    </>
  );
}
