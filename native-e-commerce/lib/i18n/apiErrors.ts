import { ApiError } from '~/lib/api/errors';
import type { AppLocale } from './locale';
import { strings } from './strings';

/** Maps API error codes + HTTP status to localized copy; falls back to server message. */
export function resolveApiError(error: unknown, locale: AppLocale): string {
  const L = strings(locale).errors;

  if (error instanceof ApiError) {
    const { code, status, message } = error;

    if (code === 'account_inactive') {
      return message || L.accountInactive;
    }

    if (status === 403 && message) {
      return message;
    }

    if (code === 'unauthorized' || status === 401) {
      return message || L.unauthorizedLogin;
    }

    if (code === 'validation_error' || status === 422) {
      return message || L.validationLogin;
    }

    if (code === 'conflict' || status === 409) {
      return message || L.conflictEmail;
    }

    if (code === 'invalid_token') {
      return message || L.unauthorizedLogin;
    }

    if (message && message.length > 0) return message;
  }

  return strings(locale).errors.generic;
}

export function resolveLoginError(error: unknown, locale: AppLocale): string {
  const L = strings(locale).errors;
  if (error instanceof ApiError) {
    if (error.code === 'account_inactive' || error.status === 403) {
      return error.message || L.accountInactive;
    }
    if (error.code === 'unauthorized' || error.status === 401) {
      return L.unauthorizedLogin;
    }
    if (error.code === 'validation_error' || error.status === 422) {
      return L.validationLogin;
    }
    if (error.message) return error.message;
  }
  return L.loginFailed;
}

export function resolveSignupError(error: unknown, locale: AppLocale): string {
  const L = strings(locale).errors;
  if (error instanceof ApiError) {
    if (error.code === 'conflict' || error.status === 409) {
      return L.conflictEmail;
    }
    if (error.code === 'validation_error' || error.status === 422) {
      return L.validationSignup;
    }
    if (error.message) return error.message;
  }
  return L.signupFailed;
}
