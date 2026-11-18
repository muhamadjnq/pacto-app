import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ApiError } from './api';

// کش سبک «نمایش فوری، تازه‌سازی در پس‌زمینه»: صفحه‌ها بلافاصله با آخرین داده بالا می‌آیند
interface Entry { data?: unknown; at: number; error?: ApiError; promise?: Promise<unknown>; fetching: boolean; subs: Set<() => void>; snap: Snap }
interface Snap { data: unknown; error?: ApiError; fetching: boolean; at: number }
const cache = new Map<string, Entry>();
const PFX = 'pq:';

function entry(key: string, persist: boolean): Entry {
  let e = cache.get(key);
  if (!e) {
    e = { at: 0, fetching: false, subs: new Set(), snap: { data: undefined, fetching: false, at: 0 } };
    if (persist) {
      try { const raw = localStorage.getItem(PFX + key); if (raw) { const p = JSON.parse(raw); e.data = p.d; e.at = 0; e.snap = { data: p.d, fetching: false, at: 0 }; } } catch { /* */ }
    }
    cache.set(key, e);
  }
  return e;
}
function emit(e: Entry) { e.snap = { data: e.data, error: e.error, fetching: e.fetching, at: e.at }; e.subs.forEach((f) => f()); }

function run(key: string, fetcher: () => Promise<unknown>, persist: boolean): Promise<unknown> {
  const e = entry(key, persist);
  if (e.promise) return e.promise;
  e.fetching = true; emit(e);
  const born = epoch;
  e.promise = fetcher().then(
    // پاسخی که بعد از خروج از حساب برسد دور ریخته می‌شود
    (d) => { if (born !== epoch) return d; e.data = d; e.at = Date.now(); e.error = undefined; if (persist) { try { localStorage.setItem(PFX + key, JSON.stringify({ d })); } catch { /* */ } } return d; },
    (err) => { e.error = err instanceof ApiError ? err : new ApiError(0, 'خطای ناشناخته'); throw e.error; },
  ).finally(() => { e.promise = undefined; e.fetching = false; emit(e); });
  e.promise.catch(() => undefined);
  return e.promise;
}

export interface QueryResult<T> { data: T | undefined; error: ApiError | undefined; loading: boolean; refreshing: boolean; stale: boolean; refetch: () => Promise<void> }

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, opts: { ttl?: number; persist?: boolean; poll?: number } = {}): QueryResult<T> {
  const { ttl = 30000, persist = false, poll = 0 } = opts;
  const fn = useRef(fetcher); fn.current = fetcher;
  const k = key ?? '';
  const e = key ? entry(k, persist) : null;

  const subscribe = useCallback((cb: () => void) => { if (!e) return () => undefined; e.subs.add(cb); return () => { e.subs.delete(cb); }; }, [e]);
  const snap = useSyncExternalStore(subscribe, () => (e ? e.snap : EMPTY));

  const refetch = useCallback(async () => { if (!key) return; try { await run(k, () => fn.current(), persist); } catch { /* خطا در snapshot هست */ } }, [key, k, persist]);

  useEffect(() => {
    if (!key || !e) return;
    if (Date.now() - e.at > ttl) void refetch();
    const onWake = () => { if (document.visibilityState === 'visible' && Date.now() - e.at > ttl) void refetch(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('pacto:resume', onWake);
    window.addEventListener('pacto:invalidate', onWake);
    window.addEventListener('online', onWake);
    const timer = poll > 0 ? setInterval(() => { if (document.visibilityState === 'visible') void refetch(); }, poll) : undefined;
    return () => { document.removeEventListener('visibilitychange', onWake); window.removeEventListener('pacto:resume', onWake); window.removeEventListener('pacto:invalidate', onWake); window.removeEventListener('online', onWake); if (timer) clearInterval(timer); };
  }, [key, e, ttl, poll, refetch]);

  return { data: snap.data as T | undefined, error: snap.error, loading: snap.data === undefined && (snap.fetching || (!snap.error && !!key)), refreshing: snap.data !== undefined && snap.fetching, stale: snap.data !== undefined && !!snap.error, refetch };
}
const EMPTY: Snap = { data: undefined, fetching: false, at: 0 };

/** بی‌اعتبار کردن همه‌ی کلیدهایی که با این پیشوند شروع می‌شوند (صفحه‌های باز همان لحظه تازه می‌شوند) */
export function invalidate(...prefixes: string[]) {
  let live = false;
  cache.forEach((e, key) => { if (prefixes.some((p) => key.startsWith(p))) { e.at = 0; live = live || e.subs.size > 0; } });
  if (live) window.dispatchEvent(new CustomEvent('pacto:invalidate'));
}
export function setQueryData(key: string, data: unknown) { const e = entry(key, false); e.data = data; e.at = Date.now(); e.error = undefined; emit(e); }
let epoch = 0;
/** پاک کردن همه‌ی داده‌های حساب از حافظه و دستگاه (داده‌های عمومی مثل فهرست رسانه‌ها می‌ماند) */
export function clearQueries() {
  epoch++; cache.clear();
  try { Object.keys(localStorage).filter((k) => k.startsWith(PFX) && !PUBLIC.includes(k.slice(PFX.length))).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
}
const PUBLIC = ['meta', 'categories'];
window.addEventListener('pacto:signout', clearQueries);
