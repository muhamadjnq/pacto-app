import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { faNum } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { useQuery } from '@/lib/query';
import { useCart } from '@/lib/store';
import type { Category, Group } from '@/lib/types';
import { Chips, Cube, Empty, ErrorState, Icon, Page, Skeleton } from '@/ui/kit';

interface Resp { categories: Category[]; groups: Group[] }

export function CartButton() {
  const nav = useNavigate();
  const n = useCart((s) => s.items.length);
  return (
    <button type="button" aria-label={`سبد خرید${n ? `، ${n} سرویس` : ''}`} onClick={() => { haptic(); nav('/cart'); }} className="ico press relative h-10 w-10 rounded-xl text-ink">
      <Icon name="ti-shopping-cart" size={21} />
      {n > 0 && <span className="num absolute end-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-bad px-1 text-[10px] font-black leading-none text-white">{faNum(n)}</span>}
    </button>
  );
}

export default function Shop() {
  const nav = useNavigate();
  const q = useQuery<Resp>('categories', () => api<Resp>('/v2/categories', { auth: false }), { ttl: 300000, persist: true });
  const [group, setGroup] = useState('');
  const [term, setTerm] = useState('');
  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (q.data?.categories ?? []).filter((c) => (!group || c.group === group) && (!t || c.name.toLowerCase().includes(t)));
  }, [q.data, group, term]);
  const search = (e: FormEvent) => { e.preventDefault(); const t = term.trim(); if (t.length >= 2) nav(`/shop/all?q=${encodeURIComponent(t)}`); };

  return (
    <Page title="سفارش تبلیغ" sub="رسانه را انتخاب کنید" tabs right={<CartButton />}>
      <form onSubmit={search} role="search" className="relative">
        <Icon name="ti-search" size={19} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-mute" />
        <input type="search" enterKeyHint="search" aria-label="جستجوی رسانه یا سرویس" placeholder="جستجوی رسانه یا سرویس" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={60}
          className="h-12 w-full rounded-2xl border border-line bg-surface ps-11 pe-4 text-[14px] text-ink outline-none placeholder:text-mute focus:border-brand" />
      </form>
      {q.data && q.data.groups.length > 1 && (
        <Chips className="mt-3" value={group} onChange={setGroup} items={[{ key: '', label: 'همه' }, ...q.data.groups.map((g) => ({ key: g.key, label: g.label, icon: g.icon }))]} />
      )}
      {q.loading && <div className="mt-4 grid grid-cols-3 gap-2.5">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-[132px] rounded-xl2" />)}</div>}
      {q.error && !q.data && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {list.map((c) => (
          <button key={c.id} type="button" onClick={() => { haptic(); nav(`/shop/${c.slug}`); }} className="press flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl2 border border-line bg-surface px-1.5 py-3 text-center shadow-card">
            <Cube v={c} />
            <span className="flex min-h-[36px] w-full items-center justify-center"><b className="line-clamp-2 text-[12px] font-extrabold leading-[18px] text-ink">{c.name}</b></span>
            <small className="num text-[10.5px] text-mute">{faNum(c.count)} سرویس</small>
          </button>
        ))}
      </div>
      {q.data && !list.length && (
        <Empty icon="ti-search-off" title="رسانه‌ای با این نام پیدا نشد" text={term.trim().length >= 2 ? 'دکمه‌ی جستجوی صفحه‌کلید را بزنید تا بین همه‌ی سرویس‌ها بگردیم' : undefined} />
      )}
    </Page>
  );
}
