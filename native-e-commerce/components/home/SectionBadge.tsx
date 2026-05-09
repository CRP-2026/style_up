import { Feather } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  background: string;
};

export function SectionBadge({ title, subtitle, background }: Props) {
  return (
    <View
      className="mt-4 flex-row items-center justify-between rounded-[10px] px-3 py-3"
      style={{ backgroundColor: background }}>
      <View>
        <Text className="text-[16px] font-semibold text-white">{title}</Text>
        <View className="mt-1 flex-row items-center gap-1">
          <Feather name="clock" size={13} color="rgba(255,255,255,0.86)" />
          <Text className="text-[12px] text-white/85">{subtitle}</Text>
        </View>
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        className="flex-row items-center gap-1 rounded-[8px] border border-white/70 px-3 py-[7px]">
        <Text className="text-[12px] font-semibold text-white">View all</Text>
        <Feather name="arrow-right" size={14} color="white" />
      </TouchableOpacity>
    </View>
  );
}
