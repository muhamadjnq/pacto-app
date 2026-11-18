import { type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, forwardRef, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiError } from '@/lib/api';
import { faNum } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { useNet, useToast } from '@/lib/store';
import type { Tone, Visual } from '@/lib/types';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
/** فقط نام‌های معتبر آیکون (هر چیز دیگری که از سرور بیاید نادیده گرفته می‌شود) */
const iconName = (n?: string | null) => (n && /^ti-[a-z0-9-]+$/.test(n) ? n : 'ti-speakerphone');
const hex = (c?: string | null, d = '#6366f1') => (c && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : d);

export const Icon = ({ name, size = 20, className }: { name: string; size?: number; className?: string }) => (
  <i className={cx('ti', iconName(name), className)} style={{ fontSize: size }} aria-hidden="true" />
);

/** آیکون در قاب مربع؛ همیشه دقیقاً وسط */
export const IconBox = ({ name, tone = 'brand', size = 40, className }: { name: string; tone?: 'brand' | 'ok' | 'warn' | 'bad' | 'info' | 'mute'; size?: number; className?: string }) => {
  const tones = { brand: 'bg-brand/10 text-brand', ok: 'bg-ok/10 text-ok', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/10 text-bad', info: 'bg-info/10 text-info', mute: 'bg-surface2 text-mute' };
  return <span className={cx('ico rounded-xl', tones[tone], className)} style={{ width: size, height: size }}><Icon name={name} size={Math.round(size * 0.5)} /></span>;
};

export const Cube = ({ v, size, className }: { v: Partial<Visual>; size?: 'sm' | 'lg'; className?: string }) => (
  <span className={cx('cube', size, className)} style={{ '--c1': hex(v.c1), '--c2': hex(v.c2, '#8b5cf6') } as CSSProperties}><i className={cx('ti', iconName(v.icon))} aria-hidden="true" /></span>
);

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'glass'; size?: 'sm' | 'md' | 'lg'; block?: boolean; busy?: boolean; icon?: string };
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'primary', size = 'md', block, busy, icon, className, children, disabled, onClick, ...rest }, ref) {
  const v = {
    primary: 'text-white bg-gradient-to-l from-brand to-brand-2 shadow-[0_10px_24px_-10px_rgba(99,102,241,.75)]',
    soft: 'bg-brand/10 text-brand',
    ghost: 'bg-surface2 text-ink border border-line',
    danger: 'bg-bad/10 text-bad',
    glass: 'bg-white/15 text-white border border-white/25',
  }[variant];
  const s = { sm: 'h-9 px-3 text-[12.5px] rounded-xl gap-1.5', md: 'h-11 px-4 text-[13.5px] rounded-[14px] gap-2', lg: 'h-[52px] px-5 text-[15px] rounded-2xl gap-2' }[size];
  return (
    <button ref={ref} type="button" {...rest} disabled={disabled || busy} aria-busy={busy || undefined}
      onClick={(e) => { haptic(); onClick?.(e); }}
      className={cx('press inline-flex items-center justify-center font-extrabold whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none', v, s, block && 'w-full', className)}>
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} /> : null}
      {children}
    </button>
  );
});

export const Card = ({ className, children, onClick, style }: { className?: string; children: ReactNode; onClick?: () => void; style?: CSSProperties }) =>
  onClick ? (
    <button type="button" onClick={() => { haptic(); onClick(); }} style={style} className={cx('press block w-full min-w-0 text-start rounded-xl2 border border-line bg-surface shadow-card', className)}>{children}</button>
  ) : (
    <div style={style} className={cx('min-w-0 rounded-xl2 border border-line bg-surface shadow-card', className)}>{children}</div>
  );

export const SectionTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-3 mt-6 flex items-end gap-3 px-1">
    <div className="min-w-0 flex-1"><h2 className="m-0 text-[15.5px] font-black text-ink">{title}</h2>{sub && <p className="m-0 mt-0.5 truncate text-[12px] text-mute">{sub}</p>}</div>
    {action}
  </div>
);

const toneCls: Record<string, string> = { warn: 'bg-warn/15 text-amber-600 dark:text-amber-400', info: 'bg-info/10 text-sky-600 dark:text-sky-400', ok: 'bg-ok/10 text-emerald-600 dark:text-emerald-400', done: 'bg-mute/15 text-mute', bad: 'bg-bad/10 text-red-600 dark:text-red-400', brand: 'bg-brand/10 text-brand', '': 'bg-mute/15 text-mute' };
export const Badge = ({ tone = '', children, dot, className }: { tone?: Tone | 'brand'; children: ReactNode; dot?: boolean; className?: string }) => (
  <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none', toneCls[tone] ?? toneCls[''], className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}
  </span>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skel', className)} aria-hidden="true" />;
export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="grid gap-3" role="status" aria-label="در حال بارگذاری">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-[78px] rounded-xl2" />)}</div>
);

export const Empty = ({ icon, title, text, children, v }: { icon: string; title: string; text?: string; children?: ReactNode; v?: Partial<Visual> }) => (
  <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center animate-in">
    <Cube v={{ icon, c1: v?.c1 ?? '#6366f1', c2: v?.c2 ?? '#8b5cf6' }} size="lg" className="mb-3" />
    <h3 className="m-0 text-[15.5px] font-black text-ink">{title}</h3>
    {text && <p className="m-0 max-w-[30ch] text-[13px] leading-7 text-mute">{text}</p>}
    {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
  </div>
);

export const ErrorState = ({ error, retry }: { error: ApiError; retry: () => void }) => (
  <Empty icon={error.offline ? 'ti-wifi-off' : 'ti-alert-triangle'} title={error.offline ? 'اینترنت وصل نیست' : 'مشکلی پیش آمد'} text={error.message} v={{ c1: '#f59e0b', c2: '#ef4444' }}>
    <Button variant="soft" icon="ti-refresh" onClick={retry}>تلاش دوباره</Button>
  </Empty>
);

export const Progress = ({ value, v, className }: { value: number; v?: Partial<Visual>; className?: string }) => (
  <div className={cx('h-2 overflow-hidden rounded-full bg-surface2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: `linear-gradient(90deg, ${hex(v?.c1)}, ${hex(v?.c2, '#8b5cf6')})` }} />
  </div>
);

export const Stat = ({ icon, tone, value, label }: { icon: string; tone?: 'brand' | 'ok' | 'warn' | 'info'; value: ReactNode; label: string }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl2 border border-line bg-surface p-3.5 shadow-card">
    <IconBox name={icon} tone={tone} size={38} />
    <div className="min-w-0"><b className="num block truncate text-[16px] font-black leading-6 text-ink">{value}</b><small className="block truncate text-[11.5px] text-mute">{label}</small></div>
  </div>
);

/** کاشی آمار فشرده برای ردیف‌های سه‌تایی */
export const Mini = ({ value, label, className }: { value: ReactNode; label: string; className?: string }) => (
  <div className={cx('min-w-0 rounded-xl bg-surface2 px-1 py-2.5 text-center', className)}><b className="num block truncate text-[15px] font-black leading-6 text-ink">{value}</b><small className="block truncate text-[11px] text-mute">{label}</small></div>
);

// ─── فرم ─────────────────────────────────────────────────
const fieldCls = 'w-full rounded-[14px] border border-line bg-surface2 px-3.5 text-[14px] text-ink placeholder:text-mute/70 outline-none transition-colors focus:border-brand focus:bg-surface';
type FieldWrap = { label?: string; hint?: string; error?: string };
const Wrap = ({ id, label, hint, error, children }: FieldWrap & { id: string; children: ReactNode }) => (
  <div className="grid gap-1.5">
    {label && <label htmlFor={id} className="px-1 text-[12.5px] font-extrabold text-ink">{label}</label>}
    {children}
    {error ? <span id={id + '-e'} role="alert" className="px-1 text-[12px] font-bold text-bad">{error}</span> : hint ? <span className="px-1 text-[11.5px] text-mute">{hint}</span> : null}
  </div>
);
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrap>(function Input({ label, hint, error, className, id, ...rest }, ref) {
  const auto = useId(); const fid = id ?? auto;
  return <Wrap id={fid} label={label} hint={hint} error={error}><input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? fid + '-e' : undefined} {...rest} className={cx(fieldCls, 'h-12', error && 'border-bad', className)} /></Wrap>;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrap>(function Textarea({ label, hint, error, className, id, ...rest }, ref) {
  const auto = useId(); const fid = id ?? auto;
  return <Wrap id={fid} label={label} hint={hint} error={error}><textarea ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? fid + '-e' : undefined} {...rest} className={cx(fieldCls, 'min-h-[110px] resize-none py-3 leading-7', error && 'border-bad', className)} /></Wrap>;
});

export const Chips = <T extends string>({ items, value, onChange, className }: { items: { key: T; label: string; icon?: string; count?: number }[]; value: T; onChange: (k: T) => void; className?: string }) => (
  <div className={cx('scroll-x -mx-4 flex gap-2 px-4 pb-1', className)} role="tablist">
    {items.map((it) => (
      <button key={it.key} type="button" role="tab" aria-selected={value === it.key} onClick={() => { haptic(); onChange(it.key); }}
        className={cx('press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-extrabold', value === it.key ? 'border-transparent bg-ink text-bg' : 'border-line bg-surface text-mute')}>
        {it.icon && <Icon name={it.icon} size={15} />}{it.label}{typeof it.count === 'number' && it.count > 0 && <span className="num rounded-full bg-mute/20 px-1.5 text-[10.5px]">{faNum(it.count)}</span>}
      </button>
    ))}
  </div>
);

export const Qty = ({ value, min, max, step, onChange }: { value: number; min: number; max: number | null; step: number; onChange: (v: number) => void }) => (
  <div className="inline-flex h-11 items-center rounded-[14px] border border-line bg-surface2">
    <button type="button" aria-label="بیشتر" disabled={!!max && value >= max} onClick={() => { haptic(); onChange(value + step); }} className="ico press h-11 w-11 text-brand disabled:opacity-30"><Icon name="ti-plus" size={18} /></button>
    <b className="num min-w-[58px] px-1 text-center text-[14px] font-black">{faNum(value)}</b>
    <button type="button" aria-label="کمتر" disabled={value <= min} onClick={() => { haptic(); onChange(value - step); }} className="ico press h-11 w-11 text-brand disabled:opacity-30"><Icon name="ti-minus" size={18} /></button>
  </div>
);

// ─── صفحه ────────────────────────────────────────────────
export const TopBar = ({ title, back, right, sub }: { title: string; back?: boolean; right?: ReactNode; sub?: string }) => {
  const nav = useNavigate();
  return (
    <header className="z-20 shrink-0 border-b border-line bg-bg/90 backdrop-blur-md" style={{ paddingTop: 'var(--sat)' }}>
      <div className="flex h-14 items-center gap-2 px-3">
        {back && <button type="button" aria-label="بازگشت" onClick={() => { haptic(); nav(-1); }} className="ico press h-10 w-10 rounded-xl text-ink"><Icon name="ti-arrow-right" size={22} /></button>}
        <div className={cx('min-w-0 flex-1', !back && 'px-1')}><h1 className="m-0 truncate text-[16px] font-black leading-6 text-ink">{title}</h1>{sub && <p className="m-0 truncate text-[11.5px] leading-4 text-mute">{sub}</p>}</div>
        {right}
      </div>
    </header>
  );
};

export const OfflineBar = () => {
  const online = useNet((s) => s.online);
  if (online) return null;
  return <div role="status" className="flex shrink-0 items-center justify-center gap-2 bg-warn/15 px-3 py-1.5 text-[12px] font-bold text-amber-600 dark:text-amber-400"><Icon name="ti-wifi-off" size={15} />اینترنت وصل نیست؛ آخرین داده‌ها نمایش داده می‌شود</div>;
};

/** قاب استاندارد صفحه: نوار بالا، بدنه‌ی اسکرول‌شونده، پایین‌چسبان اختیاری */
export const Page = ({ title, sub, back, right, children, footer, tabs, onRefresh, refreshing }: { title: string; sub?: string; back?: boolean; right?: ReactNode; children: ReactNode; footer?: ReactNode; tabs?: boolean; onRefresh?: () => void; refreshing?: boolean }) => (
  <div className="flex h-full flex-col">
    <TopBar title={title} sub={sub} back={back} right={<>{onRefresh && <button type="button" aria-label="تازه‌سازی" onClick={() => { haptic(); onRefresh(); }} className="ico press h-10 w-10 rounded-xl text-mute"><Icon name="ti-refresh" size={20} className={refreshing ? 'animate-spin' : ''} /></button>}{right}</>} />
    <OfflineBar />
    <main className="scroll-y min-h-0 flex-1 px-4 pt-4" style={{ paddingBottom: footer ? 16 : tabs ? 'calc(var(--tabbar-h) + var(--sab) + 20px)' : 'calc(var(--sab) + 24px)' }}>{children}</main>
    {footer && <div className="shrink-0 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur-md" style={{ paddingBottom: 'calc(var(--sab) + 12px)' }}>{footer}</div>}
  </div>
);

// ─── برگه‌ی پایین ─────────────────────────────────────────
export const Sheet = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onBack = (e: Event) => { e.preventDefault(); onClose(); };
    document.addEventListener('keydown', onKey); window.addEventListener('pacto:back', onBack);
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('pacto:back', onBack); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="بستن" className="absolute inset-0 animate-fade bg-black/55" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="relative max-h-[88%] w-full animate-sheet overflow-hidden rounded-t-[26px] border-t border-line bg-surface shadow-pop outline-none">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-mute/30" />
        <div className="flex items-center gap-2 px-4 pb-2 pt-3"><h2 className="m-0 flex-1 text-[15.5px] font-black">{title}</h2><button type="button" aria-label="بستن" onClick={onClose} className="ico press h-9 w-9 rounded-xl bg-surface2 text-mute"><Icon name="ti-x" size={18} /></button></div>
        <div className="scroll-y max-h-[72vh] px-4" style={{ paddingBottom: 'calc(var(--sab) + 18px)' }}>{children}</div>
      </div>
    </div>
  );
};

export const Toasts = () => {
  const list = useToast((s) => s.list);
  const tone = { ok: 'bg-emerald-600', bad: 'bg-red-600', info: 'bg-slate-800' };
  const ic = { ok: 'ti-circle-check', bad: 'ti-alert-circle', info: 'ti-info-circle' };
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(var(--tabbar-h) + var(--sab) + 22px)' }} aria-live="polite">
      {list.map((t) => <div key={t.id} className={cx('pointer-events-auto flex max-w-full animate-in items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-bold text-white shadow-pop', tone[t.tone])}><Icon name={ic[t.tone]} size={18} /><span>{t.text}</span></div>)}
    </div>
  );
};

/** ردیف فهرست با آیکون سه‌بعدی */
export const Row = ({ v, title, sub, end, onClick, badge }: { v: Partial<Visual>; title: ReactNode; sub?: ReactNode; end?: ReactNode; onClick?: () => void; badge?: ReactNode }) => (
  <Card onClick={onClick} className="flex min-w-0 items-center gap-3 p-3.5">
    <Cube v={v} size="sm" />
    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b className="truncate text-[13.5px] font-black text-ink">{title}</b>{badge}</div>{sub && <div className="mt-0.5 truncate text-[11.5px] text-mute">{sub}</div>}</div>
    {end && <div className="shrink-0">{end}</div>}
  </Card>
);
