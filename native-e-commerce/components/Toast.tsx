import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    name: 'checkmark-circle',
    bg: '#ECFDF3',
    border: '#A7F3D0',
    iconColor: '#059669',
  },
  error: {
    name: 'alert-circle',
    bg: '#FEF2F2',
    border: '#FECACA',
    iconColor: '#DC2626',
  },
  warning: {
    name: 'warning',
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconColor: '#D97706',
  },
  info: {
    name: 'information-circle',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    iconColor: '#2563EB',
  },
  loading: {
    name: 'refresh',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    iconColor: '#7C3AED',
  },
} as const;

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 2000, onClose }) => {
  const translateX = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onClose(id));
  }, [translateX, opacityAnim, onClose, id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, type, handleClose, translateX, opacityAnim]);

  const config = toastConfig[type];

  return (
    <Animated.View
      style={{
        transform: [{ translateX }],
        opacity: opacityAnim,
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
      className="w-[90%] rounded-2xl border p-4 shadow-lg">
      <View className="flex-row items-start gap-3">
        {type === 'loading' ? (
          <ActivityIndicator size="small" color={config.iconColor} />
        ) : (
          <Ionicons name={config.name as any} size={20} color={config.iconColor} />
        )}

        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{title}</Text>
          {message && <Text className="mt-1 text-xs text-gray-600">{message}</Text>}
        </View>

        <Pressable onPress={handleClose}>
          <Ionicons name="close" size={18} color="#9CA3AF" />
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default Toast;
