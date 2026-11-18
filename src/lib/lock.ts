import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { isNative } from './native';

// قفل اپ: رمز عددی فقط به‌صورت هش (PBKDF2) روی دستگاه می‌ماند؛ اثر انگشت اختیاری است
const KEY = 'pacto_lock';
const ITER = 120000;
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITER }, key, 256));
}
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

interface Saved { hash: string; salt: string; bio: boolean }
interface LockState {
  ready: boolean; enabled: boolean; bio: boolean; bioAvailable: boolean; locked: boolean; fails: number; until: number;
  init: () => Promise<void>; setPin: (pin: string) => Promise<void>; setBio: (on: boolean) => Promise<void>; disable: () => Promise<void>;
  tryPin: (pin: string) => Promise<boolean>; tryBio: () => Promise<boolean>; lock: () => void;
}
let saved: Saved | null = null;
const persist = async () => { if (saved) await Preferences.set({ key: KEY, value: JSON.stringify(saved) }); else await Preferences.remove({ key: KEY }); };

export const useLock = create<LockState>((set, get) => ({
  ready: false, enabled: false, bio: false, bioAvailable: false, locked: false, fails: 0, until: 0,
  init: async () => {
    try { const v = (await Preferences.get({ key: KEY })).value; saved = v ? (JSON.parse(v) as Saved) : null; } catch { saved = null; }
    let bioAvailable = false;
    if (isNative) { try { bioAvailable = (await BiometricAuth.checkBiometry()).isAvailable; } catch { bioAvailable = false; } }
    set({ ready: true, enabled: !!saved, bio: !!saved?.bio && bioAvailable, bioAvailable, locked: !!saved });
  },
  setPin: async (pin) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saved = { hash: await derive(pin, salt), salt: b64(salt), bio: saved?.bio ?? false };
    await persist(); set({ enabled: true, locked: false, fails: 0, until: 0 });
  },
  setBio: async (on) => { if (!saved) return; saved.bio = on && get().bioAvailable; await persist(); set({ bio: saved.bio }); },
  disable: async () => { saved = null; await persist(); set({ enabled: false, bio: false, locked: false, fails: 0, until: 0 }); },
  tryPin: async (pin) => {
    if (!saved) { set({ locked: false }); return true; }
    if (Date.now() < get().until) return false;
    const ok = same(await derive(pin, unb64(saved.salt)), saved.hash);
    if (ok) { set({ locked: false, fails: 0, until: 0 }); return true; }
    const fails = get().fails + 1;
    // بعد از هر ۵ تلاش اشتباه، مکث اجباری (۳۰ ثانیه، بعد یک دقیقه، …)
    set({ fails, until: fails % 5 === 0 ? Date.now() + 30000 * (fails / 5) : 0 });
    return false;
  },
  tryBio: async () => {
    if (!saved?.bio || !get().bioAvailable) return false;
    try { await BiometricAuth.authenticate({ reason: 'باز کردن پکتو', cancelTitle: 'استفاده از رمز', allowDeviceCredential: false, androidTitle: 'پکتو', androidSubtitle: 'برای ورود، اثر انگشت خود را لمس کنید' }); set({ locked: false, fails: 0, until: 0 }); return true; } catch { return false; }
  },
  lock: () => { if (get().enabled) set({ locked: true }); },
}));

// با خروج از حساب (دستی یا تمام‌شدن نشست) قفل هم برداشته می‌شود تا کاربر بعدی پشت رمز قبلی نماند
window.addEventListener('pacto:signout', () => { void useLock.getState().disable(); });
