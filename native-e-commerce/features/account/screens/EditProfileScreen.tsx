import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '~/components/ToastProvider';
import { useUserStore } from '~/lib/store/userStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const { addToast } = useToast();
  
  const user = useUserStore();
  
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  function save() {
    user.setName(name);
    user.setBio(bio);
    user.setAvatar(avatar);
    
    addToast('success', 'Thành công', 'Cập nhật hồ sơ thành công');
    setTimeout(() => router.back(), 1000);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Chỉnh sửa hồ sơ', headerShadowVisible: false }} />
      <ScrollView className="flex-1 bg-[#F8F8F8]" contentContainerStyle={{ padding: 20 }}>
        
        <View className="items-center mb-8">
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={pickImage}
            className="relative h-28 w-28 rounded-full bg-white shadow-sm border-4 border-white items-center justify-center overflow-hidden">
            {avatar ? (
              <Image source={{ uri: avatar }} className="h-full w-full" />
            ) : (
              <Feather name="user" size={40} color="#BBBBBB" />
            )}
            <View className="absolute bottom-0 w-full h-8 bg-black/40 items-center justify-center">
              <Feather name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="mt-3 text-[13px] text-[#666666]">Nhấn để thay đổi ảnh</Text>
        </View>

        <View className="bg-white rounded-[16px] p-5 shadow-sm">
          <View className="mb-5">
            <Text className="mb-2 text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Họ và tên</Text>
            <View className="flex-row items-center bg-[#F4F4F4] rounded-[12px] px-4 py-1 h-[52px]">
              <Feather name="user" size={18} color="#9CA3AF" />
              <TextInput 
                value={name} 
                onChangeText={setName} 
                className="flex-1 ml-3 text-[15px] text-[#1F1F1F] outline-none" 
                placeholder="Nhập tên của bạn"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View className="mb-2">
            <Text className="mb-2 text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Mô tả ngắn (Bio)</Text>
            <View className="flex-row items-start bg-[#F4F4F4] rounded-[12px] px-4 py-3 min-h-[80px]">
              <Feather name="info" size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
              <TextInput 
                value={bio} 
                onChangeText={setBio} 
                className="flex-1 ml-3 text-[15px] text-[#1F1F1F] outline-none" 
                placeholder="Nhập mô tả về bản thân"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          className="mt-8 h-[54px] rounded-[14px] bg-[#F83758] items-center justify-center shadow-sm" 
          onPress={save}>
          <Text className="text-[16px] font-bold text-white">Lưu Thay Đổi</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </>
  );
}
