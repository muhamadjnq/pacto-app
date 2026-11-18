import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useLock } from '@/lib/lock';
import { useMeta, versionLess } from '@/lib/meta';
import { haptic, openExternal, openWeb } from '@/lib/native';
import { toast, useAuth, useTheme, type ThemeMode } from '@/lib/store';
import { Badge, Button, Card, Icon, IconBox, Input, Page, SectionTitle, Sheet, cx } from '@/ui/kit';
import { toEnDigits } from '@/lib/fa';

const Switch = ({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => { haptic(); onChange(!on); }}
    className="press grid h-11 w-14 shrink-0 place-items-center disabled:opacity-40">
    <span className={cx('relative block h-7 w-12 rounded-full transition-colors', on ? 'bg-brand' : 'bg-mute/30')}><span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', on ? 'start-[22px]' : 'start-0.5')} /></span>
  </button>
);

export default function Settings() {
  const theme = useTheme();
  const lock = useLock();
  const meta = useMeta();
  const signOut = useAuth((s) => s.signOut);
  const [pinOpen, setPinOpen] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState('');
  const closePin = useCallback(() => { setPinOpen(false); setP1(''); setP2(''); }, []);
  const digits = (v: string) => toEnDigits(v).replace(/\D/g, '').slice(0, 4);

  const savePin = async () => {
    if (p1.length !== 4 || p1 !== p2 || busy) return;
    setBusy('pin');
    try { await lock.setPin(p1); haptic('ok'); toast('قفل اپ فعال شد', 'ok'); closePin(); } catch { toast('ذخیره‌ی رمز انجام نشد', 'bad'); }
    setBusy('');
  };
  const toggleLock = (on: boolean) => {
    if (on) { setPinOpen(true); return; }
    if (window.confirm('قفل اپ برداشته شود؟')) void lock.disable().then(() => toast('قفل اپ برداشته شد', 'info'));
  };
  const toggleBio = async (on: boolean) => {
    try { await lock.setBio(on); toast(on ? 'ورود با اثر انگشت فعال شد' : 'ورود با اثر انگشت غیرفعال شد', 'ok'); } catch { toast('اثر انگشت روی این دستگاه در دسترس نیست', 'bad'); }
  };
  const logout = async () => {
    if (busy || !window.confirm('از حساب خارج می‌شوید؟')) return;
    setBusy('out');
    try { await api('/v2/auth/logout', { method: 'POST', timeout: 8000 }); } catch { /* خروج روی دستگاه در هر حال انجام می‌شود */ }
    await lock.disable();
    await signOut();
  };

  const app = meta.data?.app;
  const update = !!app?.latest_version && versionLess(__APP_VERSION__, app.latest_version);
  const sup = meta.data?.support;

  return (
    <Page title="تنظیمات" back>
      <SectionTitle title="ظاهر" />
      <Card className="grid grid-cols-3 gap-2 p-2">
        {([['light', 'روشن', 'ti-sun'], ['dark', 'تیره', 'ti-moon'], ['system', 'خودکار', 'ti-device-mobile']] as [ThemeMode, string, string][]).map(([k, label, icon]) => (
          <button key={k} type="button" aria-pressed={theme.mode === k} onClick={() => { haptic(); theme.set(k); }}
            className={cx('press flex h-[68px] flex-col items-center justify-center gap-1 rounded-2xl text-[12px] font-extrabold', theme.mode === k ? 'bg-brand text-white' : 'bg-surface2 text-mute')}><Icon name={icon} size={20} />{label}</button>
        ))}
      </Card>

      <SectionTitle title="امنیت" />
      <Card className="divide-y divide-line">
        <div className="flex items-center gap-3 p-3.5"><IconBox name="ti-lock" size={38} /><div className="min-w-0 flex-1"><b className="block text-[13.5px] font-extrabold">قفل اپ با رمز ۴ رقمی</b><small className="text-[11.5px] text-mute">هر بار که اپ باز می‌شود رمز می‌خواهد</small></div><Switch on={lock.enabled} onChange={toggleLock} label="قفل اپ" /></div>
        {lock.enabled && (
          <>
            <div className="flex items-center gap-3 p-3.5"><IconBox name="ti-fingerprint" tone="ok" size={38} /><div className="min-w-0 flex-1"><b className="block text-[13.5px] font-extrabold">ورود با اثر انگشت</b><small className="text-[11.5px] text-mute">{lock.bioAvailable ? 'به‌جای وارد کردن رمز' : 'روی این دستگاه در دسترس نیست'}</small></div><Switch on={lock.bio} onChange={(v) => void toggleBio(v)} label="ورود با اثر انگشت" disabled={!lock.bioAvailable} /></div>
            <button type="button" onClick={() => setPinOpen(true)} className="press flex w-full items-center gap-3 p-3.5 text-start"><IconBox name="ti-key" tone="mute" size={38} /><b className="flex-1 text-[13.5px] font-extrabold">تغییر رمز قفل</b><Icon name="ti-chevron-left" size={18} className="text-mute" /></button>
          </>
        )}
        <button type="button" onClick={() => void openWeb('/user/security')} className="press flex w-full items-center gap-3 p-3.5 text-start"><IconBox name="ti-shield-lock" tone="info" size={38} /><b className="flex-1 text-[13.5px] font-extrabold">تأیید دومرحله‌ای حساب</b><Icon name="ti-external-link" size={17} className="text-mute" /></button>
      </Card>

      <SectionTitle title="پشتیبانی" />
      <Card className="divide-y divide-line">
        {sup?.phone && <button type="button" onClick={() => void openExternal(`tel:${sup.phone}`)} className="press flex w-full items-center gap-3 p-3.5 text-start"><IconBox name="ti-phone" tone="ok" size={38} /><b className="flex-1 text-[13.5px] font-extrabold">تماس با پکتو</b><span className="ltr num text-[12.5px] font-bold text-mute">{sup.phone}</span></button>}
        {sup?.email && <button type="button" onClick={() => void openExternal(`mailto:${sup.email}`)} className="press flex w-full items-center gap-3 p-3.5 text-start"><IconBox name="ti-mail" tone="info" size={38} /><b className="flex-1 text-[13.5px] font-extrabold">ایمیل</b><span className="ltr text-[12.5px] font-bold text-mute">{sup.email}</span></button>}
        <button type="button" onClick={() => void openExternal(sup?.site ?? 'https://adpacto.com')} className="press flex w-full items-center gap-3 p-3.5 text-start"><IconBox name="ti-world" size={38} /><b className="flex-1 text-[13.5px] font-extrabold">سایت پکتو</b><Icon name="ti-external-link" size={17} className="text-mute" /></button>
      </Card>

      <Card className="mt-3 flex items-center gap-3 p-3.5">
        <IconBox name="ti-info-circle" tone="mute" size={38} />
        <div className="min-w-0 flex-1"><b className="block text-[13.5px] font-extrabold">نسخه‌ی اپ</b><small className="ltr num block text-start text-[11.5px] text-mute">{__APP_VERSION__}</small></div>
        {update && app?.update_url ? <Button size="sm" icon="ti-download" onClick={() => void openExternal(app.update_url!)}>به‌روزرسانی</Button> : <Badge tone="ok">به‌روز</Badge>}
      </Card>

      <Button className="mt-5" variant="danger" block icon="ti-logout" busy={busy === 'out'} onClick={() => void logout()}>خروج از حساب</Button>

      <Sheet open={pinOpen} onClose={closePin} title="رمز قفل اپ">
        <p className="m-0 mb-4 text-[12.5px] leading-7 text-mute">یک رمز ۴ رقمی انتخاب کنید؛ اگر فراموش شود باید دوباره وارد حساب شوید</p>
        <div className="grid gap-4">
          <Input label="رمز ۴ رقمی" type="password" inputMode="numeric" autoComplete="off" dir="ltr" maxLength={4} value={p1} onChange={(e) => setP1(digits(e.target.value))} className="text-center text-[20px] font-black tracking-[.5em]" />
          <Input label="تکرار رمز" type="password" inputMode="numeric" autoComplete="off" dir="ltr" maxLength={4} value={p2} onChange={(e) => setP2(digits(e.target.value))} error={p2.length === 4 && p1 !== p2 ? 'تکرار رمز یکسان نیست' : undefined} className="text-center text-[20px] font-black tracking-[.5em]" />
        </div>
        <Button className="mt-5" size="lg" block busy={busy === 'pin'} disabled={p1.length !== 4 || p1 !== p2} onClick={() => void savePin()}>ذخیره‌ی رمز</Button>
      </Sheet>
    </Page>
  );
}
