import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { faNum } from '@/lib/fa';
import { copyText, shareText } from '@/lib/native';
import { useQuery } from '@/lib/query';
import { ls } from '@/lib/store';
import type { Paged, Template } from '@/lib/types';
import { Badge, Button, Card, Chips, Empty, ErrorState, Input, ListSkeleton, Page } from '@/ui/kit';

type Resp = Paged<Template> & { facets: { platforms: string[]; occasions: string[]; categories: string[] } };
interface Vars { brand: string; offer: string; link: string }
const VARS_KEY = 'pacto_tpl_vars';

const fill = (body: string, v: Vars): string =>
  body.replace(/\{(brand|offer|link)\}/g, (m, k: keyof Vars) => (v[k].trim() ? v[k].trim() : m));

export default function Templates() {
  const [vars, setVars] = useState<Vars>(() => {
    const s = ls.get<Partial<Vars>>(VARS_KEY, {});
    return { brand: typeof s.brand === 'string' ? s.brand : '', offer: typeof s.offer === 'string' ? s.offer : '', link: typeof s.link === 'string' ? s.link : '' };
  });
  const [platform, setPlatform] = useState('');
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [extra, setExtra] = useState<Template[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);

  useEffect(() => { ls.set(VARS_KEY, vars); }, [vars]);
  useEffect(() => { const t = setTimeout(() => setTerm(text.trim()), 350); return () => clearTimeout(t); }, [text]);

  const fetchPage = (p: number) => api<Resp>('/v2/templates', { query: { platform, q: term, page: p > 1 ? p : null } });
  const q = useQuery<Resp>(`templates:${platform}:${term}`, () => fetchPage(1), { ttl: 60000 });
  useEffect(() => { setExtra([]); setPage(1); }, [platform, term, q.data]);

  const loadMore = async () => {
    if (more || !q.data) return;
    setMore(true);
    try { const r = await fetchPage(page + 1); setExtra((x) => [...x, ...r.data]); setPage(page + 1); } catch { /* دکمه می‌ماند */ }
    setMore(false);
  };

  const set = (k: keyof Vars) => (e: React.ChangeEvent<HTMLInputElement>) => setVars((v) => ({ ...v, [k]: e.target.value }));
  const list = q.data ? [...q.data.data, ...extra.filter((e) => !q.data!.data.some((t) => t.id === e.id))] : [];
  const platforms = q.data?.facets.platforms ?? [];

  return (
    <Page title="قالب‌های آماده" sub="متن تبلیغ آماده؛ فقط نام برند را بنویسید" back onRefresh={() => void q.refetch()} refreshing={q.refreshing}>
      <Card className="grid gap-3 p-4">
        <Input label="نام برند" placeholder="نام برند" value={vars.brand} onChange={set('brand')} maxLength={80} />
        <Input label="پیشنهاد" placeholder="پیشنهاد (مثلاً ۳۰٪ تخفیف)" value={vars.offer} onChange={set('offer')} maxLength={120} />
        <Input label="لینک" placeholder="https://" dir="ltr" inputMode="url" value={vars.link} onChange={set('link')} maxLength={300} />
      </Card>

      <div className="mt-4 grid gap-3">
        <Input type="search" aria-label="جستجو در قالب‌ها" placeholder="جستجو در قالب‌ها" value={text} onChange={(e) => setText(e.target.value)} />
        <Chips<string> value={platform} onChange={setPlatform} items={[{ key: '', label: 'همه' }, ...platforms.map((p) => ({ key: p, label: p }))]} />
      </div>

      <div className="mt-4 grid gap-3">
        {q.loading && <ListSkeleton />}
        {q.error && !q.data && <ErrorState error={q.error} retry={() => void q.refetch()} />}
        {list.map((t) => {
          const out = fill(t.body, vars);
          const n = Array.from(out).length;
          const sms = t.platform === 'پیامک' ? (n <= 70 ? 1 : Math.ceil(n / 67)) : 0;
          return (
            <Card key={t.id} className="grid gap-3 p-4">
              <b className="text-[14.5px] font-black text-ink">{t.title}</b>
              <div className="flex flex-wrap gap-1.5">
                {t.category && <Badge>{t.category}</Badge>}
                {t.platform && <Badge tone="brand">{t.platform}</Badge>}
                {t.occasion && <Badge tone="warn">{t.occasion}</Badge>}
              </div>
              <div data-selectable className="rounded-2xl bg-surface2 border border-line p-3 text-[13px] leading-8 whitespace-pre-wrap break-words">{out}</div>
              <div className="flex items-center gap-2">
                <span className="num min-w-0 flex-1 text-[11.5px] text-mute">{faNum(n)} نویسه{sms > 0 && ` · ${faNum(sms)} پیامک`}</span>
                <Button size="sm" icon="ti-copy" onClick={() => void copyText(out, 'متن کپی شد')}>کپی متن</Button>
                <Button size="sm" variant="soft" icon="ti-share" aria-label="اشتراک‌گذاری" onClick={() => void shareText(out, t.title)} />
              </div>
            </Card>
          );
        })}
        {q.data && !list.length && <Empty icon="ti-template-off" title="قالبی پیدا نشد" text="فیلتر یا جستجو را تغییر دهید" />}
        {q.data && page < q.data.meta.last && <Button variant="ghost" busy={more} onClick={() => void loadMore()}>نمایش بیشتر</Button>}
      </div>
    </Page>
  );
}
