import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errText } from '@/lib/api';
import { faNum, faShort, moneyShort } from '@/lib/fa';
import { haptic, openWeb } from '@/lib/native';
import { invalidate, useQuery } from '@/lib/query';
import { toast, useAuth } from '@/lib/store';
import type { Home as HomeData, OrderFull } from '@/lib/types';
import { Badge, Button, Card, Cube, ErrorState, Icon, OfflineBar, Progress, Row, SectionTitle, Skeleton } from '@/ui/kit';

export default function Home() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const q = useQuery<HomeData>('home', async () => { const d = await api<HomeData>('/v2/home'); setUser(d.user); return d; }, { ttl: 20000, persist: true });
  const d = q.data;
  const [busy, setBusy] = useState(0);

  const reorder = async (orderId: number) => {
    if (busy) return;
    setBusy(orderId);
    try {
      const r = await api<{ order: OrderFull | null }>(`/v2/orders/${orderId}/reorder`, { method: 'POST' });
      invalidate('home', 'orders'); haptic('ok');
      if (r.order) { toast('سفارش جدید ساخته شد', 'ok'); nav(`/orders/${r.order.id}`); }
    } catch (e) { toast(errText(e), 'bad'); }
    setBusy(0);
  };

  const quick = [
    { icon: 'ti-speakerphone', label: 'سفارش تبلیغ', to: '/shop', c1: '#6366f1', c2: '#8b5cf6' },
    { icon: 'ti-activity-heartbeat', label: 'داشبورد زنده', to: '/live', c1: '#10b981', c2: '#0ea5e9' },
    { icon: 'ti-sparkles', label: 'پیشنهاد رسانه', to: '/tools/planner', c1: '#a855f7', c2: '#ec4899' },
    { icon: 'ti-headset', label: 'پشتیبانی', to: '/tickets', c1: '#f59e0b', c2: '#ef4444' },
  ];

  return (
    <div className="flex h-full flex-col">
      <OfflineBar />
      <main className="scroll-y min-h-0 flex-1" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--sab) + 20px)' }}>
        <section className="hero-grad relative overflow-hidden rounded-b-[30px] px-5 pb-6 text-white" style={{ paddingTop: 'calc(var(--sat) + 18px)' }}>
          <span className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-fuchsia-400/25 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="m-0 text-[12.5px] text-white/75">سلام</p><h1 className="m-0 truncate text-[19px] font-black leading-8">{user?.name ?? 'کاربر پکتو'}</h1></div>
            <button type="button" aria-label={`اعلان‌ها${d?.unread ? `، ${d.unread} خوانده‌نشده` : ''}`} onClick={() => { haptic(); nav('/notifications'); }} className="ico press relative h-11 w-11 rounded-2xl bg-white/15">
              <Icon name="ti-bell" size={22} />
              {!!d?.unread && <span className="num absolute -top-1 end-[-4px] grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[10.5px] font-black leading-none">{faNum(d.unread)}</span>}
            </button>
          </div>
          <div className="relative mt-5 rounded-[22px] border border-white/20 bg-white/12 p-4 backdrop-blur-md" style={{ transform: 'perspective(900px) rotateX(4deg)', transformOrigin: 'bottom' }}>
            <div className="flex items-center gap-2 text-[12px] text-white/80"><Icon name="ti-wallet" size={17} />موجودی کیف پول</div>
            <div className="mt-1 flex items-end gap-2"><b className="num text-[27px] font-black leading-10">{faNum(Math.round(d?.user.wallet ?? user?.wallet ?? 0))}</b><span className="pb-2 text-[12px] text-white/80">تومان</span></div>
            <div className="mt-3 flex gap-2">
              <Button variant="glass" size="sm" icon="ti-plus" onClick={() => void openWeb('/user/wallet')}>شارژ کیف پول</Button>
              <Button variant="glass" size="sm" icon="ti-history" onClick={() => nav('/wallet')}>تراکنش‌ها</Button>
            </div>
          </div>
        </section>

        <div className="px-4">
          {d && !d.user.email_verified && (
            <button type="button" onClick={() => void openWeb('/user/dashboard')} className="press mt-4 flex w-full items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-3 text-start text-[12.5px] font-bold text-amber-600 dark:text-amber-400">
              <Icon name="ti-mail-exclamation" size={20} /><span className="flex-1">ایمیل شما هنوز تأیید نشده؛ برای پرداخت، ایمیل را تأیید کنید</span><Icon name="ti-chevron-left" size={18} />
            </button>
          )}

          <div className="mt-5 grid grid-cols-4 gap-2">
            {quick.map((a) => (
              <button key={a.to} type="button" onClick={() => { haptic(); nav(a.to); }} className="press flex flex-col items-center gap-2 rounded-2xl py-2 text-[11.5px] font-extrabold text-ink">
                <Cube v={a} />{a.label}
              </button>
            ))}
          </div>

          {q.loading && <div className="mt-6 grid gap-3"><Skeleton className="h-24 rounded-xl2" /><Skeleton className="h-20 rounded-xl2" /><Skeleton className="h-20 rounded-xl2" /></div>}
          {q.error && !d && <ErrorState error={q.error} retry={() => void q.refetch()} />}

          {d?.live && d.live.running > 0 && (
            <Card onClick={() => nav('/live')} className="mt-5 p-4">
              <div className="flex items-center gap-2">
                <span className="relative grid h-2.5 w-2.5 place-items-center"><span className="absolute inset-0 animate-ping2 rounded-full border-2 border-ok" /><span className="h-2 w-2 rounded-full bg-ok" /></span>
                <b className="flex-1 text-[13.5px] font-black">{faNum(d.live.running)} کمپین در حال اجرا</b>
                {d.live.trend !== null && <Badge tone={d.live.trend >= 0 ? 'ok' : 'bad'}><span className="ltr">{(d.live.trend >= 0 ? '+' : '−') + faNum(Math.abs(d.live.trend))}٪</span></Badge>}
                <Icon name="ti-chevron-left" size={18} className="text-mute" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[[faShort(d.live.views), 'بازدید'], [faShort(d.live.clicks), 'کلیک'], [faNum(d.live.ctr, 2) + '٪', 'نرخ کلیک']].map(([v, l]) => <div key={l} className="rounded-xl bg-surface2 py-2.5"><b className="num block text-[15px] font-black">{v}</b><small className="text-[11px] text-mute">{l}</small></div>)}
              </div>
            </Card>
          )}

          {d && (
            <>
              <SectionTitle title="سفارش‌های فعال" sub={d.orders.length ? undefined : 'سفارش فعالی ندارید'} action={<button type="button" className="press -my-2 inline-flex min-h-11 items-center px-2 text-[12.5px] font-extrabold text-brand" onClick={() => nav('/orders')}>همه</button>} />
              <div className="grid gap-2.5">
                {d.orders.map((o) => (
                  <Row key={o.id} v={o} title={o.title} badge={o.more > 0 ? <Badge>+{faNum(o.more)}</Badge> : undefined} onClick={() => nav(`/orders/${o.id}`)}
                    sub={<><span className="ltr">{o.code}</span> · {o.ago}</>}
                    end={<div className="flex flex-col items-end gap-1"><Badge tone={o.tone} dot>{o.label}</Badge><b className="num text-[12px] font-black">{moneyShort(o.total, o.usdt)}</b></div>} />
                ))}
                {!d.orders.length && <Button variant="soft" icon="ti-speakerphone" onClick={() => nav('/shop')}>اولین تبلیغ را سفارش بده</Button>}
              </div>

              {d.reorder.length > 0 && (
                <>
                  <SectionTitle title="سفارش دوباره" sub="همان سرویس و همان اطلاعات تبلیغ، با قیمت امروز" />
                  <div className="grid gap-2.5">
                    {d.reorder.map((r) => (
                      <Row key={r.order_id} v={r} title={r.name} badge={r.more > 0 ? <Badge>+{faNum(r.more)}</Badge> : undefined}
                        sub={<>{faNum(r.qty)} {r.unit} · {moneyShort(r.price, r.usdt)}</>}
                        end={<Button size="sm" variant="soft" icon="ti-repeat" busy={busy === r.order_id} aria-label={`سفارش دوباره‌ی ${r.name}`} onClick={() => void reorder(r.order_id)}>دوباره</Button>} />
                    ))}
                  </div>
                </>
              )}

              {d.club && (
                <Card onClick={() => nav('/club')} className="mt-6 overflow-hidden p-4" style={{ background: `linear-gradient(135deg, ${d.club.color}22, transparent 60%)` }}>
                  <div className="flex items-center gap-3">
                    <Cube v={{ icon: 'ti-crown', c1: d.club.color, c2: d.club.c2 }} />
                    <div className="min-w-0 flex-1"><b className="block text-[13.5px] font-black">باشگاه پکتو · سطح {d.club.level}</b><small className="num text-[12px] text-mute">{faNum(d.club.points)} امتیاز{d.club.next ? ` · ${faShort(d.club.remaining)} تومان تا ${d.club.next}` : ''}</small></div>
                    <Icon name="ti-chevron-left" size={18} className="text-mute" />
                  </div>
                  <Progress value={d.club.progress} v={{ c1: d.club.color, c2: d.club.c2 }} className="mt-3" />
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
