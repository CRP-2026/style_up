import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';

export const FlashSaleTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 30,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else {
          if (minutes > 0) {
            minutes--;
            seconds = 59;
          } else {
            if (hours > 0) {
              hours--;
              minutes = 59;
              seconds = 59;
            }
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const format = (n: number) => n.toString().padStart(2, '0');

  return (
    <View className="flex-row items-center gap-1">
      <View className="rounded-md bg-white/20 px-1.5 py-0.5">
        <Text className="text-[12px] font-bold text-white">{format(timeLeft.hours)}</Text>
      </View>
      <Text className="text-white">:</Text>
      <View className="rounded-md bg-white/20 px-1.5 py-0.5">
        <Text className="text-[12px] font-bold text-white">{format(timeLeft.minutes)}</Text>
      </View>
      <Text className="text-white">:</Text>
      <View className="rounded-md bg-white/20 px-1.5 py-0.5">
        <Text className="text-[12px] font-bold text-white">{format(timeLeft.seconds)}</Text>
      </View>
    </View>
  );
};
