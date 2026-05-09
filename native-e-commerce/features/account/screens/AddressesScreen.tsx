import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import addressStorage from '~/features/account/services/addressStorage';
import { Address } from '@/lib/types/models';

export default function AddressesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Address[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  // Refresh every time the screen gains focus (cover navigation back from the form)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [])
  );

  async function refresh() {
    const list = await addressStorage.getAddresses();
    setItems(list);
  }

  function onDelete(id: string) {
    Alert.alert('Delete', 'Delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await addressStorage.deleteAddress(id);
          void refresh();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Addresses' }} />
      <View className="flex-1 bg-white p-4">
        <Pressable
          className="mb-4 items-center rounded-lg bg-[#007AFF] py-3"
          onPress={() => router.push('/addresses/new')}>
          <Text className="font-semibold text-white">Add Address</Text>
        </Pressable>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View className="mb-3 rounded-lg border bg-white p-3">
              <Text className="font-semibold">{item.name}</Text>
              <Text className="text-sm text-gray-500">{item.phone}</Text>
              <Text className="mt-1">{item.address}</Text>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  className="rounded bg-orange-500 px-3 py-2"
                  onPress={() => router.push(`/addresses/${item.id}/edit`)}>
                  <Text className="text-white">Edit</Text>
                </Pressable>
                <Pressable
                  className="rounded bg-red-500 px-3 py-2"
                  onPress={() => onDelete(item.id)}>
                  <Text className="text-white">Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </>
  );
}
