import { setAddressBackend, resetAddressBackend } from '~/features/account/services/addressStorage';
import { logoutRemote } from '~/lib/api/auth';
import { createHttpAddressBackend } from '~/lib/api/httpAddressBackend';
import { setAccessToken, getAccessToken } from '~/lib/api/token';

const httpBackend = createHttpAddressBackend();

export async function hydrateSession(): Promise<void> {
  const token = await getAccessToken();
  if (token) setAddressBackend(httpBackend);
  else resetAddressBackend();
}

export async function afterAuthLogin(accessToken: string): Promise<void> {
  await setAccessToken(accessToken);
  setAddressBackend(httpBackend);
}

export async function logoutSession(): Promise<void> {
  try {
    const token = await getAccessToken();
    if (token) await logoutRemote();
  } catch {
    /* still clear client session */
  }
  await setAccessToken(null);
  resetAddressBackend();
}
