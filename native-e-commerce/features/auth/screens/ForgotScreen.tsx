import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function ForgotScreen() {
  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <View className="px-8 pb-8 pt-[63px]">
        <Text className="text-[36px] font-bold">Forgot {'\n'}Password?</Text>
        <View className="mt-10 h-[55px] flex-row items-center rounded-[10px] border border-[#A8A8A9] bg-[#F3F3F3] px-3">
          <FontAwesome5 name="envelope" size={18} color="black" style={{ marginRight: 10, width: 20, textAlign: 'center' }}/>
          <TextInput
            className="flex-1 text-xs font-medium text-[#676767]"
            placeholder="Enter your email address"
            placeholderTextColor="#676767"
          />
        </View>

        <View className="mt-8 flex-row gap-2">
          <Text className="text-md font-medium text-[#e10000]">*</Text>
          <Text className="text-md flex-1 font-medium text-[#676767]">
            We will send you a message to set or reset your new password
          </Text>
        </View>
        <View className="mt-8 h-[55px] rounded-[10px] border border-[#A8A8A9] bg-[#F83758]">
          <Pressable className="h-full items-center justify-center" onPress={() => console.log('Send Link')}>
            <Text className="text-md text-center font-bold text-white">Send Link</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
