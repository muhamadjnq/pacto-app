import { useState } from 'react';
import { ApiError, api, errText } from '@/lib/api';
import { toEnDigits } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { invalidate } from '@/lib/query';
import { toast, useAuth } from '@/lib/store';
import type { User } from '@/lib/types';
import { Button, Card, Input, Page, SectionTitle } from '@/ui/kit';

const cleanPhone = (v: string) => toEnDigits(v).replace(/\D/g, '').slice(0, 11);

export default function ProfileEdit() {
  const user = useAuth((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [pErr, setPErr] = useState<{ name?: string; phone?: string }>({});

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [rep, setRep] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [wErr, setWErr] = useState<{ cur?: string; next?: string }>({});

  const phoneClean = cleanPhone(phone);
  const changed = name.trim() !== (user?.name ?? '') || phoneClean !== (user?.phone ?? '');
  const canSave = changed && name.trim().length >= 2 && !saving;
  const mismatch = rep.length > 0 && rep !== next;
  const canPw = !pwBusy && cur.length > 0 && next.length >= 8 && next === rep;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true); setPErr({});
    try {
      await api('/v1/profile', { method: 'PUT', body: { name: name.trim(), phone: phoneClean || null } });
      const r = await api<{ user: User }>('/v2/me');
      useAuth.getState().setUser(r.user);
      setName(r.user.name); setPhone(r.user.phone ?? '');
      invalidate('home'); toast('ذخیره شد', 'ok'); haptic('ok');
    } catch (err) {
      if (err instanceof ApiError && (err.field('name') || err.field('phone'))) setPErr({ name: err.field('name'), phone: err.field('phone') });
      else toast(errText(err), 'bad');
    }
    setSaving(false);
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPw) return;
    setPwBusy(true); setWErr({});
    try {
      await api('/v1/change-password', { method: 'POST', body: { current_password: cur, new_password: next } });
      setCur(''); setNext(''); setRep('');
      toast('رمز عبور تغییر کرد', 'ok'); haptic('ok');
    } catch (err) {
      if (err instanceof ApiError && (err.field('current_password') || err.field('new_password'))) setWErr({ cur: err.field('current_password'), next: err.field('new_password') });
      else toast(errText(err), 'bad');
    }
    setPwBusy(false);
  };

  return (
    <Page title="ویرایش حساب" back>
      <SectionTitle title="مشخصات" />
      <Card className="p-4">
        <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3.5">
          <Input label="نام" value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} error={pErr.name} />
          <Input label="شماره‌ی موبایل" value={phone} dir="ltr" inputMode="tel" maxLength={11} autoComplete="tel" onChange={(e) => setPhone(cleanPhone(e.target.value))} error={pErr.phone} />
          <Input label="ایمیل" value={user?.email ?? ''} dir="ltr" disabled readOnly />
          <Button type="submit" block icon="ti-device-floppy" busy={saving} disabled={!canSave}>ذخیره</Button>
        </form>
      </Card>

      <SectionTitle title="تغییر رمز عبور" />
      <Card className="p-4">
        <form onSubmit={(e) => void changePw(e)} noValidate className="grid gap-3.5">
          <Input label="رمز عبور فعلی" type="password" dir="ltr" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} error={wErr.cur} />
          <Input label="رمز عبور جدید" type="password" dir="ltr" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={wErr.next} hint="دست‌کم ۸ نویسه" />
          <Input label="تکرار رمز عبور جدید" type="password" dir="ltr" autoComplete="new-password" value={rep} onChange={(e) => setRep(e.target.value)} error={mismatch ? 'تکرار رمز یکسان نیست' : undefined} />
          <Button type="submit" block icon="ti-lock" busy={pwBusy} disabled={!canPw}>تغییر رمز</Button>
        </form>
      </Card>
    </Page>
  );
}
