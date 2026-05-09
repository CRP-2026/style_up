import { Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function AppInput({ label, error, className = '', ...props }: Props) {
  return (
    <View>
      {label ? <Text className="mb-1 text-[12px] font-semibold text-[#6B7280]">{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor="#9CA3AF"
        className={`rounded-[14px] border px-3 py-2 text-[14px] text-[#1F2937] ${
          error ? 'border-[#FCA5A5] bg-[#FFF1F2]' : 'border-[#E5E7EB] bg-[#F9FAFB]'
        } ${className}`}
      />
      {error ? <Text className="mt-1 text-[12px] text-[#B91C1C]">{error}</Text> : null}
    </View>
  );
}
