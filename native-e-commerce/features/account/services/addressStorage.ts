import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Address } from '~/lib/types/models';

const KEY = 'user_addresses';

export type AddressLoad = {
  getAddresses: () => Promise<Address[]>;
  getAddressById: (id: string) => Promise<Address | undefined>;
  saveAddress: (addr: Address) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  createAddressPartial: (data: Omit<Address, 'id'>) => Promise<Address>;
};

// Default AsyncStorage-backed implementation
const asyncStorageBackend: AddressLoad = {
  async getAddresses() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Address[];
    } catch {
      return [];
    }
  },

  async getAddressById(id: string) {
    const list = await asyncStorageBackend.getAddresses();
    return list.find((a) => a.id === id);
  },

  async saveAddress(addr: Address) {
    const list = await asyncStorageBackend.getAddresses();
    const idx = list.findIndex((a) => a.id === addr.id);
    if (idx >= 0) list[idx] = addr;
    else list.push(addr);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  },

  async deleteAddress(id: string) {
    const list = await asyncStorageBackend.getAddresses();
    const next = list.filter((a) => a.id !== id);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  },

  async createAddressPartial(data: Omit<Address, 'id'>) {
    const id = String(Date.now());
    const addr: Address = { id, ...data };
    await asyncStorageBackend.saveAddress(addr);
    return addr;
  },
};

let load: AddressLoad = asyncStorageBackend;

export function setAddressBackend(b: AddressLoad) {
  load = b;
}

export function resetAddressBackend() {
  load = asyncStorageBackend;
}

export async function getAddresses(): Promise<Address[]> {
  return load.getAddresses();
}

export async function getAddressById(id: string): Promise<Address | undefined> {
  return load.getAddressById(id);
}

export async function saveAddress(addr: Address): Promise<void> {
  return load.saveAddress(addr);
}

export async function deleteAddress(id: string): Promise<void> {
  return load.deleteAddress(id);
}

export async function createAddressPartial(data: Omit<Address, 'id'>): Promise<Address> {
  // ensure compatibility with model (set sensible defaults)
  const payload = { ...data, isDefault: (data as any).isDefault ?? false } as Omit<Address, 'id'>;
  return load.createAddressPartial(payload);
}

export default {
  setAddressBackend,
  resetAddressBackend,
  getAddresses,
  getAddressById,
  saveAddress,
  deleteAddress,
  createAddressPartial,
};
