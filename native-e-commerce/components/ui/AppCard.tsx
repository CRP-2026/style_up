import type { ReactNode } from 'react';
import { View } from 'react-native';

export function AppCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-[24px] bg-white p-4 shadow-sm ${className}`}>{children}</View>;
}
