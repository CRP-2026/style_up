import { FontAwesome } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategorySelectionModalProps {
  visible: boolean;
  categories: string[];
  categoriesLoading: boolean;
  onSelectCategory: (category: string) => void;
  onAddNewCategory: () => void;
  onClose: () => void;
}

export function CategorySelectionModal({
  visible,
  categories,
  categoriesLoading,
  onSelectCategory,
  onAddNewCategory,
  onClose,
}: CategorySelectionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold">Chọn danh mục</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="py-3 px-4 border-b border-gray-200"
                onPress={() => onSelectCategory(item)}
              >
                <Text className="text-base text-gray-800">{item}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
            scrollEnabled
            ListEmptyComponent={
              <View className="py-8 items-center">
                <Text className="text-gray-500 mb-4">Chưa có danh mục nào</Text>
                {categoriesLoading && (
                  <Text className="text-xs text-gray-400">Đang tải...</Text>
                )}
              </View>
            }
          />

          <TouchableOpacity
            className="mt-6 bg-green-600 rounded-lg py-3 items-center flex-row justify-center"
            onPress={onAddNewCategory}
          >
            <FontAwesome name="plus" size={18} color="white" />
            <Text className="text-black font-semibold ml-2">Thêm danh mục mới</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 32,
    maxHeight: '65%',
  },
  list: {
    maxHeight: 280,
  },
});
