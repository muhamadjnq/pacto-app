import { api } from './api';
import { useQuery } from './query';
import type { Meta } from './types';

/** تنظیمات عمومی سایت (مالیات، هدف‌های تبلیغ، پشتیبانی، نسخه‌ی اپ)؛ یک‌بار گرفته و نگه داشته می‌شود */
export const useMeta = () => useQuery<Meta>('meta', () => api<Meta>('/v2/meta', { auth: false }), { ttl: 600000, persist: true });

/** مقایسه‌ی دو نسخه مثل 2.0.1 و 2.1.0 */
export const versionLess = (a: string, b: string): boolean => {
  const x = a.split('.').map((n) => parseInt(n, 10) || 0), y = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d < 0; }
  return false;
};
