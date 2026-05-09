import type { Address } from '~/lib/types/models';

import { apiDelete, apiGet, apiPost, apiPut } from '~/lib/api/client';

export type AddressCreate = Omit<Address, 'id'>;

export async function listAddressesApi(): Promise<Address[]> {
  return apiGet<Address[]>('addresses/');
}

export async function getAddressApi(id: string): Promise<Address> {
  return apiGet<Address>(`addresses/${encodeURIComponent(id)}`);
}

export async function createAddressApi(data: AddressCreate): Promise<Address> {
  return apiPost<Address>('addresses/', {
    name: data.name,
    phone: data.phone,
    address: data.address,
    city: data.city,
    isDefault: data.isDefault ?? false,
  });
}

export async function updateAddressApi(id: string, data: AddressCreate): Promise<Address> {
  return apiPut<Address>(`addresses/${encodeURIComponent(id)}`, {
    name: data.name,
    phone: data.phone,
    address: data.address,
    city: data.city,
    isDefault: data.isDefault ?? false,
  });
}

export async function deleteAddressApi(id: string): Promise<void> {
  await apiDelete(`addresses/${encodeURIComponent(id)}`);
}
