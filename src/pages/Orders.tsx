import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { faNum, moneyShort } from '@/lib/fa';
import { useQuery } from '@/lib/query';
import type { Order, Paged } from '@/lib/types';
import { Badge, Button, Chips, Empty, ErrorState, ListSkeleton, Page, Row } from '@/ui/kit';

type Filter = 'all' | 'pending' | 'active' | 'completed';
type Resp = Paged<Order> & { counts: Record<Filter, number> };

export default function Orders() {
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [extra, setExtra] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const q = useQuery<Resp>(`orders:${filter}`, () => api<Resp>('/v2/orders', { query: { status: filter === 'all' ? null : filter } }), { ttl: 15000, persist: filter === 'all' });
  useEffect(() => { setExtra([]); setPage(1); }, [filter, q.data]);

  const loadMore = async () => {
    if (more || !q.data) return;
    setMore(true);
    try { const r = await api<Resp>('/v2/orders', { query: { status: filter === 'all' ? null : filter, page: page + 1 } }); setExtra((x) => [...x, ...r.data]); setPage(page + 1); } catch { /* دکمه می‌ماند */ }
    setMore(false);
  };

  const c = q.data?.counts;
  const list = q.data ? [...q.data.data, ...extra.filter((e) => !q.data!.data.some((o) => o.id === e.id))] : [];

  return (
    <Page title="سفارش‌های من" tabs onRefresh={() => void q.refetch()} refreshing={q.refreshing}>
      <Chips<Filter> value={filter} onChange={setFilter} items={[
        { key: 'all', label: 'همه', count: c?.all }, { key: 'pending', label: 'در انتظار پرداخت', count: c?.pending },
        { key: 'active', label: 'در حال اجرا', count: c?.active }, { key: 'completed', label: 'تکمیل‌شده', count: c?.completed },
      ]} />
      <div className="mt-4 grid gap-2.5">
        {q.loading && <ListSkeleton />}
        {q.error && !q.data && <ErrorState error={q.error} retry={() => void q.refetch()} />}
        {list.map((o) => (
          <Row key={o.id} v={o} title={o.title} badge={o.more > 0 ? <Badge>+{faNum(o.more)}</Badge> : undefined} onClick={() => nav(`/orders/${o.id}`)}
            sub={<><span className="ltr">{o.code}</span> · {o.created}</>}
            end={<div className="flex flex-col items-end gap-1"><Badge tone={o.tone} dot>{o.label}</Badge><b className="num text-[12px] font-black">{moneyShort(o.total, o.usdt)}</b></div>} />
        ))}
        {q.data && !list.length && (
          <Empty icon="ti-receipt-off" title={filter === 'all' ? 'هنوز سفارشی ندارید' : 'سفارشی با این وضعیت نیست'} text={filter === 'all' ? 'از بین ده‌ها رسانه انتخاب کنید و اولین تبلیغ را سفارش دهید' : undefined}>
            {filter === 'all' && <Button icon="ti-speakerphone" onClick={() => nav('/shop')}>سفارش تبلیغ</Button>}
          </Empty>
        )}
        {q.data && page < q.data.meta.last && <Button variant="ghost" busy={more} onClick={() => void loadMore()}>نمایش بیشتر</Button>}
      </div>
    </Page>
  );
}
