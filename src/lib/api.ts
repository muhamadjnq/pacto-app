import { useAuth } from './store';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) { super(message); this.status = status; this.data = data ?? {}; }
  /** اولین خطای یک فیلد فرم */
  field(name: string): string | undefined { const e = this.data?.errors?.[name]; return Array.isArray(e) ? e[0] : undefined; }
  get offline() { return this.status === 0; }
}

const BASE: string = ((window as any).__PACTO_API__ as string) || __API_BASE__;

export interface ApiOptions { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; auth?: boolean; timeout?: number; query?: Record<string, string | number | null | undefined> }

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, timeout = 20000, query } = opts;
  const token = auth ? useAuth.getState().token : null;
  let url = BASE + path;
  if (query) {
    const q = Object.entries(query).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');
    if (q) url += (url.includes('?') ? '&' : '?') + q;
  }

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, rej) => { timer = setTimeout(() => { ctrl?.abort(); rej(new ApiError(0, 'پاسخی از سرور نرسید؛ اینترنت را بررسی کنید')); }, timeout); });

  let res: Response;
  try {
    res = await Promise.race([
      fetch(url, {
        method,
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl?.signal,
      }),
      late,
    ]);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, 'اتصال اینترنت برقرار نیست');
  } finally {
    if (timer) clearTimeout(timer);
  }

  let data: any = null;
  try { const text = await res.text(); data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (res.status === 401 && token) {
    // نشست روی سرور باطل شده است
    void useAuth.getState().signOut();
    throw new ApiError(401, 'نشست شما تمام شده است؛ دوباره وارد شوید', data);
  }
  if (!res.ok) {
    const fallback = res.status === 429 ? 'درخواست‌ها زیاد شد؛ چند لحظه‌ی دیگر دوباره امتحان کنید' : res.status >= 500 ? 'سرور در دسترس نیست؛ کمی بعد دوباره امتحان کنید' : res.status === 404 ? 'پیدا نشد' : 'انجام نشد';
    throw new ApiError(res.status, typeof data?.message === 'string' && data.message && res.status < 500 ? data.message : fallback, data);
  }
  return data as T;
}

export const errText = (e: unknown): string => (e instanceof ApiError ? e.message : 'خطای ناشناخته');
