import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { api, errText } from './api';
import { invalidate } from './query';
import { toast, useNet, useTheme } from './store';

export const isNative = Capacitor.isNativePlatform();
const safe = async <T>(f: () => Promise<T>): Promise<T | undefined> => { try { return await f(); } catch { return undefined; } };

export const haptic = (kind: 'tap' | 'ok' | 'bad' = 'tap') => {
  if (!isNative) return;
  void safe(() => (kind === 'tap' ? Haptics.impact({ style: ImpactStyle.Light }) : Haptics.notification({ type: kind === 'ok' ? NotificationType.Success : NotificationType.Error })));
};

export const copyText = async (text: string, done = 'کپی شد') => {
  const ok = await safe(async () => { await Clipboard.write({ string: text }); return true; });
  toast(ok ? done : 'کپی نشد', ok ? 'ok' : 'bad');
  if (ok) haptic('ok');
};

export const shareText = async (text: string, title?: string) => {
  const can = await safe(() => Share.canShare());
  if (can?.value) await safe(() => Share.share({ text, title, dialogTitle: title }));
  else await copyText(text);
};

export const openExternal = async (url: string) => {
  if (!/^https:\/\//i.test(url) && !/^(tel|mailto):/i.test(url)) return;
  if (isNative && /^https:/i.test(url)) await safe(() => Browser.open({ url }));
  else window.open(url, '_blank', 'noopener');
};

let webBusy = false;
/**
 * باز کردن یک صفحه‌ی پنل وب (پرداخت، شارژ کیف پول، …) با ورود خودکار و امن.
 * لینک یک‌بارمصرف و ۶۰ ثانیه‌ای است؛ بعد از بستن مرورگر داده‌های اپ تازه می‌شوند.
 */
export const openWeb = async (path: string): Promise<boolean> => {
  if (webBusy) return false;
  webBusy = true;
  try {
    const { url } = await api<{ url: string }>('/v2/web-link', { method: 'POST', body: { to: path } });
    if (isNative) await Browser.open({ url, toolbarColor: useTheme.getState().dark ? '#0d1526' : '#ffffff' });
    else window.open(url, '_blank', 'noopener');
    return true;
  } catch (e) {
    toast(errText(e), 'bad');
    return false;
  } finally {
    webBusy = false;
  }
};

export const applyStatusBar = (dark: boolean) => {
  if (!isNative) return;
  void safe(() => StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }));
  void safe(() => StatusBar.setBackgroundColor({ color: dark ? '#060b18' : '#f1f5f9' }));
};

/** یک بار هنگام شروع اپ؛ onBack باید true برگرداند اگر خودش برگشت را انجام داد */
export const initNative = (onBack: () => boolean) => {
  const refreshAll = () => { invalidate('home', 'orders', 'order:', 'wallet', 'live', 'notifications', 'club'); window.dispatchEvent(new CustomEvent('pacto:resume')); };
  window.addEventListener('online', () => useNet.setState({ online: true }));
  window.addEventListener('offline', () => useNet.setState({ online: false }));
  if (!isNative) return;

  void safe(() => App.addListener('backButton', () => { if (!onBack()) void App.exitApp(); }));
  void safe(() => App.addListener('appStateChange', ({ isActive }) => { if (isActive) refreshAll(); else window.dispatchEvent(new CustomEvent('pacto:pause')); }));
  void safe(() => Browser.addListener('browserFinished', refreshAll));
  void safe(() => Network.addListener('networkStatusChange', (s) => useNet.setState({ online: s.connected })));
  void safe(async () => useNet.setState({ online: (await Network.getStatus()).connected }));
  applyStatusBar(useTheme.getState().dark);
  useTheme.subscribe((s) => applyStatusBar(s.dark));
};

export const hideSplash = () => { if (isNative) void safe(() => SplashScreen.hide({ fadeOutDuration: 250 })); };
