import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'has_seen_onboarding';
let inMemorySeen = false;

export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value === null) return inMemorySeen;
    return value === 'true';
  } catch {
    return inMemorySeen;
  }
}

export async function setOnboardingSeen(value: boolean): Promise<void> {
  inMemorySeen = value;
  try {
    await AsyncStorage.setItem(KEY, value ? 'true' : 'false');
  } catch {
    // Ignore storage errors in runtimes without AsyncStorage native module.
  }
}

export async function resetOnboardingSeen(): Promise<void> {
  inMemorySeen = false;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Ignore storage errors in runtimes without AsyncStorage native module.
  }
}
