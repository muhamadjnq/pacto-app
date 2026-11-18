import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errText } from '@/lib/api';
import { faNum, faShort } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { invalidate, useQuery } from '@/lib/query';
import { toast } from '@/lib/store';
import type { Live, LiveCard, OrderFull, Tone } from '@/lib/types';
import { Badge, Button, Card, Chips, Cube, Empty, ErrorState, Icon, Mini, Page, Progress, SectionTitle, Skeleton, Stat } from '@/ui/kit';

type Filter = 'all' | 'running' | 'done';
const TONES: Tone[] = ['warn', 'info', 'ok', 'done', 'bad', ''];
const tone = (t: string): Tone => (TONES.includes(t as Tone) ? (t as Tone) : '');
const safePath = (d: string) => (/^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]*$/.test(d) ? d : '');

function CardView({ c, onReorder, busy }: { c: LiveCard; onReorder: () => void; busy: boolean }) {
  const nav = useNavigate();
  return (
    <Card className="p-4">
      <button type="button" className="press flex w-full items-center gap-3 text-start" onClick={() => nav(`/orders/${c.id}`)}>
        <Cube v={c} size="sm" />
        <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-[13.5px] font-black">{c.title}</b>{c.more > 0 && <Badge>+{faNum(c.more)}</Badge>}</span><small className="block truncate text-[11.5px] text-mute"><span className="ltr">{c.code}</span> · {c.platform} · {c.started}</small></span>
        <Badge tone={tone(c.tone)} dot={c.running}>{c.label}</Badge>
      </button>
      {c.has_data ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini value={faShort(c.views)} label="بازدید" /><Mini value={faShort(c.clicks)} label="کلیک" /><Mini value={`${faNum(c.ctr, 2)}٪`} label="نرخ کلیک" />
          </div>
          {c.spark && safePath(c.spark.line) && (
            <svg viewBox="0 0 220 44" preserveAspectRatio="none" className="mt-3 block h-11 w-full" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
              <path d={safePath(c.spark.area)} fill={c.c1} opacity=".14" /><path d={safePath(c.spark.line)} fill="none" stroke={c.c1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {c.progress !== null && c.target > 0 && (
            <div className="mt-3"><div className="num mb-1.5 flex justify-between text-[11.5px] text-mute"><span>پیشرفت تا {faShort(c.target)} بازدید</span><b className="text-ink">{faNum(c.progress)}٪</b></div><Progress value={c.progress} v={c} /></div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-mute">
            {c.today > 0 && <span className="num font-bold text-ok">+{faShort(c.today)} امروز</span>}
            {c.conversions > 0 && <span className="num">{faNum(c.conversions)} تبدیل</span>}
            {c.posts > 0 && <span className="num">{faNum(c.posts)} پست</span>}
            {c.last && <span className="ms-auto">آخرین گزارش {c.last}</span>}
          </div>
        </>
      ) : (
        <p className="m-0 mt-3 rounded-xl bg-surface2 p-3 text-[12px] leading-6 text-mute">{c.running ? 'تبلیغ در حال اجراست؛ اولین آمار به‌زودی اینجا نمایش داده می‌شود' : 'برای این سفارش آماری ثبت نشده است'}</p>
      )}
      {!c.running && c.can_reorder && <Button className="mt-3" size="sm" variant="soft" icon="ti-repeat" busy={busy} onClick={onReorder}>سفارش دوباره</Button>}
    </Card>
  );
}

export default function LivePage() {
  const nav = useNavigate();
  const q = useQuery<Live>('live', () => api<Live>('/v2/live'), { ttl: 15000, poll: 20000, persist: true });
  const d = q.data;
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(0);

  const reorder = async (id: number) => {
    if (busy) return;
    setBusy(id);
    try {
      const r = await api<{ order: OrderFull | null }>(`/v2/orders/${id}/reorder`, { method: 'POST' });
      invalidate('home', 'orders'); haptic('ok');
      if (r.order) { toast('سفارش جدید ساخته شد', 'ok'); nav(`/orders/${r.order.id}`); }
    } catch (e) { toast(errText(e), 'bad'); }
    setBusy(0);
  };

  const cards = (d?.cards ?? []).filter((c) => filter === 'all' || (filter === 'running') === c.running);
  const max = Math.max(1, ...(d?.chart ?? []).map((c) => c.views));

  return (
    <Page title="داشبورد زنده" sub={d?.ready ? `به‌روزرسانی ${d.at}` : undefined} back onRefresh={() => void q.refetch()} refreshing={q.refreshing}>
      {q.loading && <div className="grid gap-3"><Skeleton className="h-32 rounded-xl2" /><Skeleton className="h-40 rounded-xl2" /><Skeleton className="h-40 rounded-xl2" /></div>}
      {q.error && !d && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {d && !d.ready && <Empty icon="ti-activity-heartbeat" title="داشبورد زنده هنوز فعال نشده است" text="به‌زودی نتیجه‌ی کمپین‌ها همین‌جا لحظه‌ای نمایش داده می‌شود" />}
      {d?.ready && (
        <>
          <section className="hero-grad relative overflow-hidden rounded-[22px] p-5 text-white">
            <div className="flex items-center gap-2 text-[12.5px] text-white/85">
              <span className="relative grid h-2.5 w-2.5 place-items-center"><span className="absolute inset-0 animate-ping2 rounded-full border-2 border-emerald-300" /><span className="h-2 w-2 rounded-full bg-emerald-300" /></span>
              {d.running > 0 ? `${faNum(d.running)} کمپین در حال اجرا` : 'کمپین در حال اجرایی ندارید'}
              {d.trend !== null && <span className="ltr ms-auto rounded-full bg-white/15 px-2 py-0.5 text-[11.5px] font-black">{(d.trend >= 0 ? '+' : '−') + faNum(Math.abs(d.trend))}٪</span>}
            </div>
            <div className="mt-2 flex items-end gap-2"><b className="num text-[30px] font-black leading-10">{faShort(d.totals.views)}</b><span className="pb-2 text-[12px] text-white/80">بازدید کل</span></div>
            {d.totals.today > 0 && <p className="num m-0 text-[12px] text-white/80">+{faShort(d.totals.today)} بازدید امروز</p>}
          </section>
          <Card className="mt-2.5 grid grid-cols-3 gap-2 p-2.5">
            <Mini value={faShort(d.totals.clicks)} label="کلیک" />
            <Mini value={`${faNum(d.totals.ctr, 2)}٪`} label="نرخ کلیک" />
            <Mini value={faShort(d.totals.conversions)} label="تبدیل" />
          </Card>

          {d.has_chart && (
            <Card className="mt-2.5 p-4">
              <div className="flex items-center justify-between"><b className="text-[12.5px] font-black">بازدید ۱۴ روز اخیر</b><Icon name="ti-chart-bar" size={18} className="text-mute" /></div>
              <div className="mt-3 flex h-28 items-end gap-1" role="img" aria-label="نمودار بازدید ۱۴ روز اخیر">
                {d.chart.map((c, i) => <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${c.label}: ${faNum(c.views)}`}><div className={`w-full rounded-t-md ${c.today ? 'bg-ok' : 'bg-gradient-to-t from-brand to-brand-2'}`} style={{ height: `${Math.max(3, (c.views / max) * 100)}%` }} /></div>)}
              </div>
              <div className="num mt-1.5 flex justify-between text-[10.5px] text-mute"><span>{d.chart[0]?.label}</span><span>امروز</span></div>
            </Card>
          )}

          {(d.links || d.pixel?.active) && (
            <div className={`mt-2.5 grid gap-2.5 ${d.links && d.pixel?.active ? 'grid-cols-2' : ''}`}>
              {d.links && <Stat icon="ti-link" tone="brand" value={faShort(d.links.total)} label={`کلیک ${faNum(d.links.count)} لینک کوتاه`} />}
              {d.pixel?.active && <Stat icon="ti-shopping-bag" tone="ok" value={faNum(d.pixel.sales ?? 0)} label={`فروش · ${faNum(d.pixel.leads ?? 0)} سرنخ`} />}
            </div>
          )}

          <SectionTitle title="کمپین‌ها" />
          <Chips<Filter> value={filter} onChange={setFilter} items={[{ key: 'all', label: 'همه', count: d.cards.length }, { key: 'running', label: 'در حال اجرا', count: d.running }, { key: 'done', label: 'پایان‌یافته', count: d.finished }]} />
          <div className="mt-3 grid gap-2.5">
            {cards.map((c) => <CardView key={c.id} c={c} busy={busy === c.id} onReorder={() => void reorder(c.id)} />)}
            {!cards.length && <Empty icon="ti-chart-line" title={d.cards.length ? 'کمپینی با این وضعیت نیست' : 'هنوز کمپینی ندارید'} text={d.cards.length ? undefined : 'بعد از اولین سفارش، نتیجه‌ی تبلیغ همین‌جا زنده نمایش داده می‌شود'}>{!d.cards.length && <Button icon="ti-speakerphone" onClick={() => nav('/shop')}>سفارش تبلیغ</Button>}</Empty>}
          </div>
        </>
      )}
    </Page>
  );
}
