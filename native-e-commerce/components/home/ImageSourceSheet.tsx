import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
};

export function ImageSourceSheet({ visible, onClose, onCamera, onLibrary }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white px-5 pb-6 pt-4">
          <View className="mb-3 items-center">
            <View className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
          </View>
          <Text className="text-center text-[16px] font-bold text-[#111827]">
            Tìm kiếm bằng ảnh
          </Text>
          <Text className="mt-1 text-center text-[13px] leading-[20px] text-[#6B7280]">
            Chọn cách lấy ảnh sản phẩm để AI tìm kết quả gần nhất.
          </Text>

          <View className="mt-5 gap-3">
            <TouchableOpacity
              activeOpacity={0.9}
              className="flex-row items-center justify-center rounded-[18px] border border-[#E5E7EB] bg-[#FFF7F2] px-4 py-4"
              onPress={onCamera}>
              <Ionicons name="camera-outline" size={18} color="#F97316" />
              <Text className="ml-2 text-[14px] font-semibold text-[#232327]">Chụp ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              className="flex-row items-center justify-center rounded-[18px] border border-[#E5E7EB] bg-white px-4 py-4"
              onPress={onLibrary}>
              <Ionicons name="images-outline" size={18} color="#232327" />
              <Text className="ml-2 text-[14px] font-semibold text-[#232327]">
                Chọn từ thư viện
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
