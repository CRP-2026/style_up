import { apiGet } from '~/lib/api/client';
import type { CurrentUser } from '~/lib/types/user';

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiGet<CurrentUser>('users/me');
}
