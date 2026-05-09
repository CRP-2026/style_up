export type AppLocale = 'vi' | 'en';

/** Resolved once per JS runtime; sufficient for shop UI copy (VN / EN). */
export function getAppLocale(): AppLocale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const low = tag.toLowerCase();
    if (low.startsWith('vi')) return 'vi';
  } catch {
    /* ignore */
  }
  return 'en';
}
