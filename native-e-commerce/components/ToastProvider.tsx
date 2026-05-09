import React, { createContext, useContext, useState, useCallback } from 'react';
import { View } from 'react-native';
import Toast, { ToastType } from './Toast';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number | undefined;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = Math.random().toString(36).substring(2);
      const toast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration: duration ?? 4000,
      };
      setToasts((prev) => [...prev, toast]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      <View
        style={{
          position: 'absolute',
          bottom: '35%',
          width: '100%',
          alignItems: 'center',
          gap: 12,
          zIndex: 9999,
          pointerEvents: 'box-none',
          paddingHorizontal: 16,
        }}>
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
