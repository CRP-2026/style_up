import type { AddressLoad } from '~/features/account/services/addressStorage';

import type { Address } from '~/lib/types/models';

import {
  createAddressApi,
  deleteAddressApi,
  getAddressApi,
  listAddressesApi,
  updateAddressApi,
} from '~/lib/api/addresses';
import { ApiError } from '~/lib/api/errors';

export function createHttpAddressBackend(): AddressLoad {
  return {
    getAddresses() {
      return listAddressesApi();
    },
    async getAddressById(id: string) {
      try {
        return await getAddressApi(id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return undefined;
        throw e;
      }
    },
    async saveAddress(addr: Address) {
      await updateAddressApi(addr.id, {
        name: addr.name,
        phone: addr.phone,
        address: addr.address,
        city: addr.city,
        isDefault: addr.isDefault,
      });
    },
    deleteAddress(id: string) {
      return deleteAddressApi(id);
    },
    createAddressPartial(data: Omit<Address, 'id'>) {
      return createAddressApi({
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        isDefault: data.isDefault ?? false,
      });
    },
  };
}
