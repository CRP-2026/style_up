import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

type ButtonProps = {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
} & TouchableOpacityProps;

export const Button = forwardRef<View, ButtonProps>(
  ({ title, variant = 'primary', loading = false, disabled, ...touchableProps }, ref) => {
    const isDisabled = disabled || loading;
    const variantClass =
      variant === 'secondary'
        ? 'bg-white border border-[#E5E7EB]'
        : variant === 'danger'
          ? 'bg-[#B91C1C]'
          : 'bg-[#F97316]';
    const textClass = variant === 'secondary' ? 'text-[#1F2937]' : 'text-white';

  return (
    <TouchableOpacity
      ref={ref}
      {...touchableProps}
      activeOpacity={0.9}
      disabled={isDisabled}
      className={`${styles.button} ${variantClass} ${isDisabled ? 'opacity-60' : ''} ${touchableProps.className ?? ''}`}>
      <Text className={`${styles.buttonText} ${textClass}`}>{loading ? 'Loading…' : title}</Text>
    </TouchableOpacity>
  );
  }
);

Button.displayName = 'Button';

const styles = {
  button: 'items-center justify-center rounded-[28px] shadow-sm min-h-[52px] px-4 py-3',
  buttonText: 'text-base font-semibold text-center',
};
