import { useEffect, useState } from 'react';
import { faNum } from '@/lib/fa';
import { useLock } from '@/lib/lock';
import { haptic } from '@/lib/native';
import { useAuth } from '@/lib/store';
import { Cube, Icon, cx } from '@/ui/kit';

export default function LockScreen() {
  const { tryPin, tryBio, bio, until } = useLock();
  const signOut = useAuth((s) => s.signOut);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [now, setNow] = useState(Date.now());
  const wait = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => { if (bio) void tryBio(); }, [bio, tryBio]);
  useEffect(() => { if (!wait) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [wait]);

  const press = async (d: string) => {
    if (wait || pin.length >= 4) return;
    haptic();
    const next = pin + d; setPin(next);
    if (next.length === 4) {
      const ok = await tryPin(next);
      if (!ok) { haptic('bad'); setShake(true); setNow(Date.now()); setTimeout(() => { setShake(false); setPin(''); }, 420); }
    }
  };

  return (
    <div className="hero-grad flex h-full flex-col items-center justify-center px-8 text-white" style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}>
      <Cube v={{ icon: 'ti-lock', c1: '#818cf8', c2: '#6d28d9' }} size="lg" />
      <h1 className="m-0 mt-6 text-[19px] font-black">پکتو قفل است</h1>
      <p className="m-0 mt-1 text-[13px] text-white/75" role="status">{wait ? `${faNum(wait)} ثانیه صبر کنید` : 'رمز ۴ رقمی را وارد کنید'}</p>
      <div className={cx('my-7 flex gap-4', shake && 'animate-pop')} aria-label={`${pin.length} رقم وارد شده`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-3.5 w-3.5 rounded-full border-2 border-white/70 transition-colors', i < pin.length && 'bg-white')} />)}
      </div>
      <div className="grid w-full max-w-[280px] grid-cols-3 gap-3" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <Key key={d} onClick={() => void press(d)} label={faNum(+d)} />)}
        {bio ? <Key onClick={() => void tryBio()} aria="ورود با اثر انگشت"><Icon name="ti-fingerprint" size={26} /></Key> : <span />}
        <Key onClick={() => void press('0')} label={faNum(0)} />
        <Key onClick={() => { haptic(); setPin(pin.slice(0, -1)); }} aria="پاک کردن"><Icon name="ti-backspace" size={24} /></Key>
      </div>
      <button type="button" className="press mt-5 inline-flex min-h-11 items-center px-3 text-[12.5px] font-bold text-white/70" onClick={() => { if (window.confirm('از حساب خارج می‌شوید و قفل برداشته می‌شود')) { void useLock.getState().disable(); void signOut(); } }}>رمز را فراموش کرده‌ام؛ خروج از حساب</button>
    </div>
  );
}

const Key = ({ onClick, label, children, aria }: { onClick: () => void; label?: string; children?: React.ReactNode; aria?: string }) => (
  <button type="button" aria-label={aria ?? label} onClick={onClick} className="ico press h-16 rounded-2xl bg-white/12 text-[22px] font-black backdrop-blur-sm">{children ?? label}</button>
);
