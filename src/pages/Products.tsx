import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { faNum, moneyShort, noDot } from '@/lib/fa';
import { useQuery } from '@/lib/query';
import type { Category, Paged, Product } from '@/lib/types';
import { Badge, Button, Chips, Empty, ErrorState, Icon, ListSkeleton, Page, Row } from '@/ui/kit';
import { CartButton } from './Shop';

type Sort = 'popular' | 'cheap' | 'new';

export const priceLabel = (p: Product) => (p.quote ? 'توافقی' : moneyShort(p.price, p.usdt));

export default function Products() {
  const { slug = 'all' } = useParams();
  const [sp] = useSearchParams();
  const term = (sp.get('q') ?? '').slice(0, 60);
  const nav = useNavigate();
  const [sort, setSort] = useState<Sort>('popular');
  const [extra, setExtra] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const query = { category: slug === 'all' ? null : slug, q: term || null, sort };
  const q = useQuery<Paged<Product>>(`products:${slug}:${term}:${sort}`, () => api<Paged<Product>>('/v2/products', { auth: false, query }), { ttl: 120000 });
  const cats = useQuery<{ categories: Category[] }>('categories', () => api('/v2/categories', { auth: false }), { ttl: 300000, persist: true });
  const cat = cats.data?.categories.find((c) => c.slug === slug);
  useEffect(() => { setExtra([]); setPage(1); }, [slug, term, sort, q.data]);

  const loadMore = async () => {
    if (more) return;
    setMore(true);
    try { const r = await api<Paged<Product>>('/v2/products', { auth: false, query: { ...query, page: page + 1 } }); setExtra((x) => [...x, ...r.data]); setPage(page + 1); } catch { /* دکمه می‌ماند */ }
    setMore(false);
  };
  const list = q.data ? [...q.data.data, ...extra.filter((e) => !q.data!.data.some((p) => p.id === e.id))] : [];

  return (
    <Page title={term ? `جستجو: ${term}` : cat?.name ?? 'سرویس‌ها'} sub={q.data ? `${faNum(q.data.meta.total)} سرویس` : undefined} back right={<CartButton />}>
      <Chips<Sort> value={sort} onChange={setSort} items={[{ key: 'popular', label: 'محبوب‌ترین', icon: 'ti-flame' }, { key: 'cheap', label: 'ارزان‌ترین', icon: 'ti-sort-ascending' }, { key: 'new', label: 'جدیدترین', icon: 'ti-sparkles' }]} />
      <div className="mt-4 grid gap-2.5">
        {q.loading && <ListSkeleton rows={6} />}
        {q.error && !q.data && <ErrorState error={q.error} retry={() => void q.refetch()} />}
        {list.map((p) => (
          <Row key={p.id} v={p} title={p.name} onClick={() => nav(`/product/${p.id}`)}
            badge={p.badge ? <Badge tone="brand">{p.badge}</Badge> : p.featured ? <Badge tone="warn">ویژه</Badge> : undefined}
            sub={<>{p.rating > 0 && <span className="num me-1.5 inline-flex items-center gap-0.5 text-amber-500"><Icon name="ti-star-filled" size={12} />{faNum(p.rating, 1)}</span>}{noDot(p.summary) || p.cat?.name || ''}</>}
            end={<div className="flex flex-col items-end"><b className="num text-[12.5px] font-black text-ink">{priceLabel(p)}</b>{!p.quote && <small className="text-[10.5px] text-mute">هر {p.unit}</small>}</div>} />
        ))}
        {q.data && !list.length && <Empty icon="ti-package-off" title="سرویسی پیدا نشد" text={term ? 'عبارت دیگری را امتحان کنید' : 'به‌زودی سرویس‌های این رسانه اضافه می‌شود'} />}
        {q.data && page < q.data.meta.last && <Button variant="ghost" busy={more} onClick={() => void loadMore()}>نمایش بیشتر</Button>}
      </div>
    </Page>
  );
}
