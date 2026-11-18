import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '@/lib/api';
import { toEnDigits } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { useAuth } from '@/lib/store';
import type { User } from '@/lib/types';
import { Button, Input } from '@/ui/kit';
import { AuthShell } from './Login';

export default function Register() {
  const setSession = useAuth((s) => s.setSession);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', ref: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ token: string; user: User }>('/v2/auth/register', { method: 'POST', auth: false, body: { name: f.name.trim(), email: f.email.trim(), phone: toEnDigits(f.phone).replace(/\D/g, ''), password: f.password, ref: f.ref.trim() || undefined } });
      haptic('ok');
      await setSession(r.token, r.user);
    } catch (x) { haptic('bad'); setErr(x instanceof ApiError ? x : new ApiError(0, 'خطای ناشناخته')); }
    setBusy(false);
  };
  const known = ['name', 'email', 'phone', 'password'].some((k) => err?.field(k));

  return (
    <AuthShell title="ساخت حساب پکتو" sub="کمتر از یک دقیقه طول می‌کشد">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Input label="نام و نام خانوادگی" autoComplete="name" value={f.name} onChange={set('name')} error={err?.field('name')} maxLength={120} />
        <Input label="ایمیل" type="email" inputMode="email" autoComplete="email" dir="ltr" placeholder="you@example.com" value={f.email} onChange={set('email')} error={err?.field('email')} />
        <Input label="شماره‌ی موبایل" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09123456789" maxLength={11} value={f.phone} onChange={set('phone')} error={err?.field('phone')} />
        <Input label="رمز عبور" type="password" autoComplete="new-password" dir="ltr" value={f.password} onChange={set('password')} error={err?.field('password')} hint="حداقل ۸ نویسه" />
        <Input label="کد معرف (اختیاری)" dir="ltr" value={f.ref} onChange={set('ref')} maxLength={40} />
        {err && !known && <p role="alert" className="m-0 rounded-xl bg-bad/10 px-3 py-2.5 text-[12.5px] font-bold text-bad">{err.message}</p>}
        <Button type="submit" size="lg" block busy={busy} disabled={!f.name || !f.email || !f.phone || !f.password}>ثبت‌نام</Button>
      </form>
      <p className="mt-4 flex items-center justify-center text-[13px] text-mute">قبلاً ثبت‌نام کرده‌اید؟<Link to="/login" replace className="inline-flex min-h-11 items-center px-2 font-extrabold text-brand">ورود</Link></p>
    </AuthShell>
  );
}
