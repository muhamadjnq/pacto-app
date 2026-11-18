import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '@/lib/api';
import { haptic, openExternal } from '@/lib/native';
import { useAuth } from '@/lib/store';
import type { User } from '@/lib/types';
import { Button, Cube, Icon, Input } from '@/ui/kit';
import { toEnDigits } from '@/lib/fa';

export function AuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="scroll-y h-full">
      <div className="hero-grad relative overflow-hidden px-6 pb-16 text-white" style={{ paddingTop: 'calc(var(--sat) + 44px)' }}>
        <span className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-fuchsia-400/30 blur-3xl" aria-hidden="true" />
        <Cube v={{ icon: 'ti-rocket', c1: '#818cf8', c2: '#6d28d9' }} size="lg" />
        <h1 className="m-0 mt-6 text-[24px] font-black leading-9">{title}</h1>
        <p className="m-0 mt-1 text-[13.5px] leading-7 text-white/80">{sub}</p>
      </div>
      <div className="relative -mt-8 min-h-[60%] rounded-t-[28px] bg-bg px-5 pt-7" style={{ paddingBottom: 'calc(var(--sab) + 28px)' }}>{children}</div>
    </div>
  );
}

export default function Login() {
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [need2fa, setNeed2fa] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ token: string; user: User }>('/v2/auth/login', { method: 'POST', auth: false, body: { email: email.trim(), password, code: need2fa ? toEnDigits(code).replace(/\s/g, '') : undefined } });
      haptic('ok');
      await setSession(r.token, r.user);
    } catch (x) {
      const e2 = x instanceof ApiError ? x : new ApiError(0, 'خطای ناشناخته');
      if (e2.data?.two_factor) { setNeed2fa(true); if (!code) { setErr(null); setBusy(false); return; } }
      haptic('bad'); setErr(e2);
    }
    setBusy(false);
  };

  return (
    <AuthShell title="به پکتو خوش آمدید" sub="تبلیغ را سفارش بده، نتیجه را زنده ببین">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {!need2fa ? (
          <>
            <Input label="ایمیل" type="email" inputMode="email" autoComplete="username" dir="ltr" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={err?.field('email')} required />
            <div className="relative">
              <Input label="رمز عبور" type={show ? 'text' : 'password'} autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} error={err?.field('password')} required className="pe-12" />
              <button type="button" aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'} onClick={() => setShow(!show)} className="ico absolute end-1 top-[30px] h-11 w-11 text-mute"><Icon name={show ? 'ti-eye-off' : 'ti-eye'} size={20} /></button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 text-[13px] leading-7 text-mute"><b className="block text-ink">تأیید دومرحله‌ای</b>کد ۶ رقمی برنامه‌ی احراز هویت یا یکی از کدهای بازیابی را وارد کنید</div>
            <Input label="کد تأیید" inputMode="numeric" autoComplete="one-time-code" dir="ltr" autoFocus maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} error={err?.field('code')} className="text-center text-[20px] font-black tracking-[.35em]" />
            <button type="button" className="press inline-flex min-h-11 items-center text-start text-[12.5px] font-bold text-brand" onClick={() => { setNeed2fa(false); setCode(''); setErr(null); }}>ورود با حساب دیگر</button>
          </>
        )}
        {err && !err.field('email') && !err.field('password') && !err.field('code') && <p role="alert" className="m-0 rounded-xl bg-bad/10 px-3 py-2.5 text-[12.5px] font-bold text-bad">{err.message}</p>}
        <Button type="submit" size="lg" block busy={busy} disabled={!email || !password || (need2fa && code.length < 6)}>{need2fa ? 'تأیید و ورود' : 'ورود'}</Button>
      </form>
      {!need2fa && (
        <div className="mt-4 grid justify-items-center gap-1 text-center text-[13px]">
          <button type="button" className="press inline-flex min-h-11 items-center px-3 font-bold text-mute" onClick={() => void openExternal('https://adpacto.com/forgot-password')}>رمز عبور را فراموش کرده‌ام</button>
          <p className="m-0 flex items-center text-mute">حساب ندارید؟<Link to="/register" className="inline-flex min-h-11 items-center px-2 font-extrabold text-brand">ثبت‌نام</Link></p>
        </div>
      )}
    </AuthShell>
  );
}
