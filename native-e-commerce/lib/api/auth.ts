import { apiPost } from '~/lib/api/client';

type TokenResponse = { access_token: string; token_type?: string };

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiPost<TokenResponse>(
    'auth/login',
    { email: email.trim(), password },
    { skipAuth: true }
  );
}

export async function googleLogin(
  idToken: string
): Promise<TokenResponse> {
  return apiPost<TokenResponse>(
    'auth/google-login',
    {
      id_token: idToken,
    },
    {
      skipAuth: true,
    }
  );
}
export async function register(
  name: string,
  email: string,
  password: string
): Promise<TokenResponse> {
  return apiPost<TokenResponse>(
    'auth/register',
    { name: name.trim(), email: email.trim(), password },
    { skipAuth: true }
  );
}

export async function logoutRemote(): Promise<void> {
  await apiPost<Record<string, unknown>>('auth/logout', {});
}
