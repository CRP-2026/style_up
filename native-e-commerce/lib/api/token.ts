import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'ecc_access_token';

let secureStoreAvailable: Promise<boolean> | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (!secureStoreAvailable) {
    secureStoreAvailable = SecureStore.isAvailableAsync().catch(() => false);
  }

  return secureStoreAvailable;
}

async function readAsyncStorageToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function writeAsyncStorageToken(token: string | null): Promise<void> {
  try {
    if (token == null || token === '') await AsyncStorage.removeItem(TOKEN_KEY);
    else await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

async function readSecureToken(): Promise<string | null> {
  if (!(await canUseSecureStore())) return null;

  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function writeSecureToken(token: string | null): Promise<void> {
  if (!(await canUseSecureStore())) return;

  try {
    if (token == null || token === '') await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function getAccessToken(): Promise<string | null> {
  const secureToken = await readSecureToken();
  if (secureToken != null && secureToken !== '') {
    return secureToken;
  }

  const storedToken = await readAsyncStorageToken();
  if (storedToken != null && storedToken !== '') {
    await writeSecureToken(storedToken);
  }

  return storedToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  await Promise.all([writeSecureToken(token), writeAsyncStorageToken(token)]);
}
