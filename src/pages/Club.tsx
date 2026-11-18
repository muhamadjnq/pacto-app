import { api } from '@/lib/api';
import { faNum, faShort } from '@/lib/fa';
import { openWeb } from '@/lib/native';
import { useQuery } from '@/lib/query';
import type { Club as ClubData } from '@/lib/types';
import { Badge, Button, Card, Cube, Empty, ErrorState, IconBox, Page, Progress, SectionTitle, Skeleton } from '@/ui/kit';

const hex = (c: string | undefined, d: string) => (c && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : d);

export default function Club() {
  const q = useQuery<ClubData>('club', () => api<ClubData>('/v2/club'), { ttl: 30000 });
  const d = q.data;

  return (
    <Page title="باشگاه پکتو" back onRefresh={() => void q.refetch()} refreshing={q.refreshing}>
      {q.loading && <div className="grid gap-3" role="status" aria-label="در حال بارگذاری"><Skeleton className="h-[190px] rounded-[22px]" /><Skeleton className="h-[78px] rounded-xl2" /><Skeleton className="h-[78px] rounded-xl2" /></div>}
      {q.error && !d && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {d && d.ready === false && <Empty icon="ti-crown-off" title="باشگاه هنوز فعال نشده است" />}
      {d && d.ready !== false && (
        <>
          <section className="rounded-[22px] p-5 text-white" style={{ background: `linear-gradient(135deg, ${hex(d.level.color, '#f59e0b')}, ${hex(d.level.c2, '#db2777')})` }}>
            <div className="flex items-center gap-2">
              <b className="min-w-0 flex-1 text-[15px] font-black">سطح {d.level.title}</b>
              {d.plus && <Badge tone="brand">پکتو پلاس</Badge>}
            </div>
            <div className="mt-2 flex items-end gap-2"><b className="num text-[34px] font-black leading-[48px]">{faNum(d.points)}</b><span className="pb-2 text-[12.5px] text-white/80">امتیاز</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25" role="progressbar" aria-valuenow={Math.round(d.level.progress)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, d.level.progress))}%` }} />
            </div>
            <p className="m-0 mt-2.5 text-[12.5px] text-white/90">{d.level.next_title ? `${faShort(d.level.remaining)} تومان خرید تا سطح ${d.level.next_title}` : 'به بالاترین سطح رسیده‌اید'}</p>
            <p className="m-0 mt-1 text-[12.5px] font-bold">کش‌بک شما {faNum(d.cashback, 1)}٪</p>
          </section>

          <SectionTitle title="ماموریت‌ها" />
          <div className="grid gap-2.5">
            {d.missions.map((m) => {
              const f = m.money ? faShort : faNum;
              return (
                <Card key={m.id} className="flex items-center gap-3 p-3.5">
                  <IconBox name={m.icon} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-black text-ink">{m.title}</b>
                    {m.description && <p className="m-0 mt-0.5 text-[11.5px] leading-5 text-mute">{m.description}</p>}
                    <Progress value={m.pct} className="mt-2" />
                    <span className="num mt-1 block text-[11px] text-mute">{f(m.current)} از {f(m.target)}</span>
                  </div>
                  {m.state === 'ready' ? <Badge tone="ok">آماده‌ی دریافت</Badge> : m.state === 'claimed' ? <Badge tone="done">دریافت شد</Badge> : <Badge tone="brand">+{faNum(m.points)} امتیاز</Badge>}
                </Card>
              );
            })}
          </div>

          <SectionTitle title="جایزه‌ها" sub="دریافت جایزه در صفحه‌ی امن باشگاه" />
          <div className="grid grid-cols-2 gap-2.5">
            {d.rewards.map((r) => (
              <Card key={r.id} className="flex flex-col items-start gap-2 p-3.5">
                <Cube v={{ icon: r.icon, c1: '#f59e0b', c2: '#db2777' }} size="sm" />
                <b className="text-[13px] font-black leading-6 text-ink">{r.title}</b>
                <Badge tone="info">{r.value}</Badge>
                <span className="num text-[12px] font-bold text-mute">{faNum(r.cost)} امتیاز</span>
                {r.stock !== null && r.stock <= 5 && <span className="num text-[11px] font-bold text-amber-600 dark:text-amber-400">فقط {faNum(r.stock)} عدد مانده</span>}
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-2.5">
            <Button block icon="ti-gift" onClick={() => void openWeb('/user/club/rewards')}>دریافت جایزه و ماموریت‌ها</Button>
            <Button block variant="ghost" icon="ti-history" onClick={() => void openWeb('/user/club/history')}>تاریخچه‌ی امتیاز</Button>
          </div>
        </>
      )}
    </Page>
  );
}
