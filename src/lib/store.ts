import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import type { CartLine, Product, User } from './types';

const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* حافظه پر است */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* */ } },
};
export { ls };

// ─── نشست ───────────────────────────────────────────────
interface AuthState { ready: boolean; token: string | null; user: User | null; init: () => Promise<void>; setSession: (token: string, user: User) => Promise<void>; setUser: (u: User) => void; signOut: () => Promise<void> }
export const useAuth = create<AuthState>((set) => ({
  ready: false, token: null, user: null,
  init: async () => {
    let token: string | null = null;
    try { token = (await Preferences.get({ key: 'pacto_token' })).value || null; } catch { token = null; }
    set({ ready: true, token, user: token ? ls.get<User | null>('pacto_user', null) : null });
  },
  setSession: async (token, user) => {
    try { await Preferences.set({ key: 'pacto_token', value: token }); } catch { /* */ }
    ls.set('pacto_user', user); set({ token, user });
  },
  setUser: (user) => { ls.set('pacto_user', user); set({ user }); },
  signOut: async () => {
    try { await Preferences.remove({ key: 'pacto_token' }); } catch { /* */ }
    ls.del('pacto_user');
    // هیچ داده‌ای از حساب قبلی روی دستگاه نمی‌ماند
    window.dispatchEvent(new Event('pacto:signout'));
    ['pacto_brief_draft', 'pacto_tpl_vars', 'pacto_roi'].forEach((k) => ls.del(k));
    useCart.getState().clear();
    set({ token: null, user: null });
  },
}));

// ─── پوسته ───────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';
const isDark = (m: ThemeMode) => m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
export const useTheme = create<{ mode: ThemeMode; dark: boolean; set: (m: ThemeMode) => void }>((set) => ({
  mode: (() => { try { return (localStorage.getItem('pacto_theme') as ThemeMode) || 'system'; } catch { return 'system'; } })(),
  dark: document.documentElement.getAttribute('data-theme') === 'dark',
  set: (mode) => {
    try { localStorage.setItem('pacto_theme', mode); } catch { /* */ }
    const dark = isDark(mode);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#060b18' : '#f1f5f9');
    set({ mode, dark });
  },
}));

// ─── سبد خرید (روی دستگاه) ─────────────────────────────
export const snapQty = (p: { min: number; max: number | null; step: number }, q: number): number => {
  const step = Math.max(1, p.step || 1), min = Math.max(1, p.min || 1);
  let v = Math.max(min, Math.round((Math.max(min, q) - min) / step) * step + min);
  if (p.max && v > p.max) v = p.max;
  return v;
};
interface CartState { items: CartLine[]; add: (p: Product, qty?: number) => void; setQty: (id: number, qty: number) => void; remove: (id: number) => void; clear: () => void }
const saveCart = (items: CartLine[]) => { ls.set('pacto_cart', items); return { items }; };
export const useCart = create<CartState>((set, get) => ({
  items: ls.get<CartLine[]>('pacto_cart', []).filter((i) => i && typeof i.id === 'number' && i.price > 0),
  add: (p, qty) => {
    const items = get().items.filter((i) => i.id !== p.id);
    items.push({ id: p.id, name: p.name, unit: p.unit, price: p.price, min: p.min, max: p.max, step: p.step, qty: snapQty(p, qty ?? p.min), icon: p.icon, c1: p.c1, c2: p.c2, cat: p.cat?.name ?? null });
    set(saveCart(items.slice(-30)));
  },
  setQty: (id, qty) => set(saveCart(get().items.map((i) => (i.id === id ? { ...i, qty: snapQty(i, qty) } : i)))),
  remove: (id) => set(saveCart(get().items.filter((i) => i.id !== id))),
  clear: () => set(saveCart([])),
}));
export const cartTotal = (items: CartLine[]) => items.reduce((s, i) => s + i.price * i.qty, 0);

// ─── پیام‌های کوتاه ──────────────────────────────────────
export type ToastTone = 'ok' | 'bad' | 'info';
interface Toast { id: number; text: string; tone: ToastTone }
let tid = 0;
export const useToast = create<{ list: Toast[]; push: (text: string, tone?: ToastTone) => void; drop: (id: number) => void }>((set, get) => ({
  list: [],
  push: (text, tone = 'info') => {
    const id = ++tid;
    // پیام تکراری دوباره روی هم نمی‌آید و بیشتر از دو پیام هم‌زمان دیده نمی‌شود
    set({ list: [...get().list.filter((t) => t.text !== text).slice(-1), { id, text, tone }] });
    setTimeout(() => get().drop(id), tone === 'bad' ? 4200 : 2600);
  },
  drop: (id) => set({ list: get().list.filter((t) => t.id !== id) }),
}));
export const toast = (text: string, tone: ToastTone = 'info') => useToast.getState().push(text, tone);

// ─── وضعیت شبکه ─────────────────────────────────────────
export const useNet = create<{ online: boolean }>(() => ({ online: typeof navigator === 'undefined' ? true : navigator.onLine !== false }));
