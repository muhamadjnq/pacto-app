import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { faNum, faShort, moneyShort, parseNum } from '@/lib/fa';
import { haptic, shareText } from '@/lib/native';
import { useQuery } from '@/lib/query';
import { toast, useCart } from '@/lib/store';
import type { PlanProduct, Planner as PlannerData } from '@/lib/types';
import { Badge, Button, Card, Chips, Cube, Empty, ErrorState, Icon, Input, ListSkeleton, Page, SectionTitle, cx } from '@/ui/kit';

type GoalKey = 'awareness' | 'traffic' | 'sales' | 'followers' | 'installs';

// <core>
interface Goal { kinds: string[]; val: (p: PlanProduct) => number }
const GOAL: Record<GoalKey, Goal> = {
  awareness: { kinds: ['impressions', 'reach'], val: (p) => (p.imp || p.reach || 0) / p.price },
  traffic: { kinds: ['clicks', 'impressions'], val: (p) => (p.clk || 0) / p.price },
  sales: { kinds: ['clicks', 'impressions', 'reach'], val: (p) => ((p.clk || 0) * 3 + (p.imp || p.reach || 0) * 0.05) / p.price },
  followers: { kinds: ['members'], val: (p) => (p.mem || 0) / p.price },
  installs: { kinds: ['installs', 'clicks'], val: (p) => ((p.ins || 0) * 10 + (p.clk || 0)) / p.price },
};
interface Item { p: PlanProduct; q: number }

/** همان الگوریتم نسخه‌ی وب: انتخاب متنوع، تقسیم وزنی بودجه، مصرف باقی‌مانده */
function buildPlan(products: PlanProduct[], goalKey: GoalKey, total: number, tax: number, indCats: Set<string>): { items: Item[]; spent: number } {
  const net = Math.floor(total / (1 + tax));
  const g = GOAL[goalKey];
  const score = (p: PlanProduct) => g.val(p) * (1 + (p.rating || 0) * 0.03);
  const fit = (p: PlanProduct) => (indCats.has(p.cat) ? 1 : 0);
  const cands = products
    .filter((p) => p.price > 0 && g.kinds.includes(p.kind) && g.val(p) > 0 && p.min * p.price <= net)
    .sort((a, b) => fit(b) - fit(a) || score(b) - score(a));

  const maxItems = net < 15e6 ? 2 : net < 6e7 ? 3 : net < 3e8 ? 4 : 5;
  const picked: PlanProduct[] = [];
  const used = new Map<string, number>();
  let minSum = 0;
  cands.forEach((p) => {
    if (picked.length >= maxItems || used.get(p.cat)) return;
    const mc = p.min * p.price;
    if (minSum + mc > net) return;
    picked.push(p); used.set(p.cat, 1); minSum += mc;
  });
  if (picked.length < maxItems) {
    cands.forEach((p) => {
      if (picked.length >= maxItems || picked.includes(p) || (used.get(p.cat) ?? 0) >= 2) return;
      const mc = p.min * p.price;
      if (minSum + mc <= net) { picked.push(p); used.set(p.cat, (used.get(p.cat) ?? 0) + 1); minSum += mc; }
    });
  }

  const items: Item[] = picked.map((p) => ({ p, q: p.min }));
  const remaining = net - minSum;
  const weights = [0.4, 0.26, 0.17, 0.1, 0.07].slice(0, items.length);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  items.forEach((it, i) => {
    const st = it.p.step || 1, unit = st * it.p.price;
    let n = Math.floor((remaining * weights[i]) / wsum / unit);
    if (it.p.max) n = Math.min(n, Math.floor((it.p.max - it.q) / st));
    if (n > 0) it.q += n * st;
  });
  let spent = items.reduce((s, it) => s + it.q * it.p.price, 0);

  let guard = 0, grew = true;
  while (grew && guard++ < 60) {
    grew = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i], st = it.p.step || 1, c = st * it.p.price;
      let n = Math.floor((net - spent) / c / Math.max(1, items.length - i));
      if (it.p.max) n = Math.min(n, Math.floor((it.p.max - it.q) / st));
      if (n < 1 && spent + c <= net && (!it.p.max || it.q + st <= it.p.max)) n = 1;
      if (n >= 1) { it.q += n * st; spent += n * c; grew = true; }
    }
  }
  items.sort((a, b) => b.q * b.p.price - a.q * a.p.price);
  return { items, spent };
}
// </core>

const own = (o: object | null | undefined, k: string) => !!o && Object.prototype.hasOwnProperty.call(o, k);

const GOALS: { key: GoalKey; label: string; sub: string; icon: string; c1: string; c2: string }[] = [
  { key: 'awareness', label: 'دیده‌شدن برند', sub: 'بیشترین نمایش با کمترین هزینه', icon: 'ti-eye', c1: '#0ea5e9', c2: '#6366f1' },
  { key: 'traffic', label: 'ترافیک سایت', sub: 'کلیک و ورود به سایت', icon: 'ti-pointer', c1: '#8b5cf6', c2: '#6366f1' },
  { key: 'sales', label: 'فروش', sub: 'ترکیب نمایش و کلیک هدفمند', icon: 'ti-shopping-cart', c1: '#ec4899', c2: '#a855f7' },
  { key: 'followers', label: 'عضو و فالوور', sub: 'رشد کانال و پیج', icon: 'ti-users', c1: '#10b981', c2: '#0ea5e9' },
  { key: 'installs', label: 'نصب اپلیکیشن', sub: 'کاربر واقعی اپ', icon: 'ti-download', c1: '#f59e0b', c2: '#ef4444' },
];
const PRESETS: [number, string][] = [[1e7, '۱۰ میلیون'], [3e7, '۳۰ میلیون'], [5e7, '۵۰ میلیون'], [1e8, '۱۰۰ میلیون'], [3e8, '۳۰۰ میلیون'], [1e9, '۱ میلیارد']];

const metricOf = (p: PlanProduct, q: number): string => {
  const imp = (p.imp || 0) * q, mem = (p.mem || 0) * q, ins = (p.ins || 0) * q, clk = (p.clk || 0) * q, reach = (p.reach || 0) * q;
  const f = faShort;
  return imp ? `${f(imp)} نمایش` : mem ? `${f(mem)} عضو` : ins ? `${f(ins)} نصب` : clk ? `${f(clk)} کلیک` : reach ? `${f(reach)} ارسال` : '';
};

export default function Planner() {
  const nav = useNavigate();
  const q = useQuery<PlannerData>('planner', () => api<PlannerData>('/v2/planner'), { ttl: 300000, persist: true });
  const d = q.data;

  const [goal, setGoal] = useState<GoalKey>('awareness');
  const [pickedInd, setPickedInd] = useState<string | null | undefined>(undefined);
  const [budget, setBudget] = useState(0);

  const industries = d?.industries ?? [];
  const labels = useMemo(() => new Map(industries.map((i) => [i.key, i.label])), [industries]);
  const wanted = pickedInd === undefined ? d?.my_industry ?? null : pickedInd;
  const industry = wanted && labels.has(wanted) ? wanted : null;
  const indCats = useMemo(() => {
    const s = new Set<string>();
    const list = industry && d && own(d.industry_map, industry) ? d.industry_map[industry] : null;
    if (Array.isArray(list)) list.forEach((c) => s.add(String(c)));
    return s;
  }, [industry, d]);

  const taxRaw = d && Number.isFinite(d.tax_rate) && d.tax_rate >= 0 ? d.tax_rate : 0;
  const tax = taxRaw > 1 ? taxRaw / 100 : taxRaw;
  const platBy = useMemo(() => new Map((d?.platforms ?? []).map((p) => [p.slug, p])), [d]);

  const plan = useMemo(() => (d && budget > 0 ? buildPlan(d.products, goal, budget, tax, indCats) : null), [d, budget, goal, tax, indCats]);

  const pickIndustry = (key: string) => {
    const next = industry === key ? null : key;
    setPickedInd(next);
    if (next) void api('/v2/profile/industry', { method: 'POST', body: { industry: next } }).catch(() => undefined);
  };

  const sum = useMemo(() => {
    const s = { imp: 0, clk: 0, mem: 0, ins: 0, reach: 0 };
    plan?.items.forEach(({ p, q: qty }) => { s.imp += (p.imp || 0) * qty; s.clk += (p.clk || 0) * qty; s.mem += (p.mem || 0) * qty; s.ins += (p.ins || 0) * qty; s.reach += (p.reach || 0) * qty; });
    return s;
  }, [plan]);
  const spent = plan?.spent ?? 0;
  const withTax = Math.round(spent * (1 + tax));

  const summaryText = (): string => {
    if (!plan) return '';
    const lines = plan.items.map(({ p, q: qty }) => {
      const m = metricOf(p, qty);
      return `• ${p.name}: ${faNum(qty)} ${p.unit} (${moneyShort(qty * p.price)})${m ? ` — حدود ${m}` : ''}`;
    });
    return ['پیشنهاد رسانه برای بودجه‌ی ' + moneyShort(budget), ...lines, `جمع با مالیات: ${moneyShort(withTax)}`, 'ساخته شده با اپ پکتو'].join('\n');
  };

  const addAll = () => {
    if (!plan || !plan.items.length) return;
    const cart = useCart.getState();
    plan.items.forEach(({ p, q: qty }) => {
      const pl = platBy.get(p.cat);
      cart.add({
        id: p.id, name: p.name, unit: p.unit, price: p.price, min: p.min, max: p.max, step: p.step,
        icon: pl?.icon ?? 'ti-speakerphone', c1: pl?.color ?? '#6366f1', c2: pl?.color2 ?? '#8b5cf6',
        cat: { slug: p.cat, name: pl?.name ?? '' },
        summary: '', quote: false, usdt: false, badge: null, featured: false, rating: p.rating, reviews: 0, delivery: p.delivery,
      }, qty);
    });
    toast('طرح به سبد اضافه شد', 'ok'); haptic('ok'); nav('/cart');
  };

  const footer = plan && plan.items.length > 0 ? (
    <div className="grid gap-2">
      <Button size="lg" block icon="ti-shopping-cart-plus" onClick={addAll}>افزودن طرح به سبد</Button>
      <Button variant="ghost" block icon="ti-share" onClick={() => void shareText(summaryText(), 'پیشنهاد رسانه')}>اشتراک طرح</Button>
    </div>
  ) : undefined;

  const kpis: [string, string, string][] = [];
  if (sum.imp || sum.reach) kpis.push(['ti-eye', faShort(sum.imp || sum.reach), 'نمایش تخمینی']);
  if (sum.clk) kpis.push(['ti-pointer', faShort(sum.clk), 'کلیک تخمینی']);
  if (sum.mem) kpis.push(['ti-users', faShort(sum.mem), 'عضو']);
  if (sum.ins) kpis.push(['ti-download', faShort(sum.ins), 'نصب']);

  return (
    <Page title="پیشنهاد هوشمند رسانه" sub="بر اساس بودجه و صنف شما" back footer={footer} onRefresh={() => void q.refetch()} refreshing={q.refreshing}>
      {q.loading && <ListSkeleton />}
      {q.error && !d && <ErrorState error={q.error} retry={() => void q.refetch()} />}

      {d && (
        <>
          <SectionTitle title="۱. هدف اصلی" />
          <div className="grid grid-cols-2 gap-2.5">
            {GOALS.map((g) => (
              <button key={g.key} type="button" aria-pressed={goal === g.key} onClick={() => { haptic(); setGoal(g.key); }}
                className={cx('press flex flex-col items-start gap-2 rounded-xl2 border-2 bg-surface p-3.5 text-start shadow-card', goal === g.key ? 'border-brand' : 'border-transparent')}>
                <Cube v={g} size="sm" />
                <b className="text-[13px] font-black text-ink">{g.label}</b>
                <small className="text-[11px] leading-5 text-mute">{g.sub}</small>
              </button>
            ))}
          </div>

          {industries.length > 0 && (
            <>
              <SectionTitle title="۲. صنف کسب‌وکار" sub="اختیاری؛ رسانه‌های مناسب صنف شما جلوتر می‌آیند" />
              <div className="flex flex-wrap gap-2" role="group" aria-label="صنف کسب‌وکار">
                {industries.map((i) => (
                  <button key={i.key} type="button" aria-pressed={industry === i.key} onClick={() => { haptic(); pickIndustry(i.key); }}
                    className={cx('press inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-extrabold', industry === i.key ? 'border-transparent bg-ink text-bg' : 'border-line bg-surface text-mute')}>
                    <Icon name={i.icon} size={15} />{i.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <SectionTitle title={industries.length > 0 ? '۳. بودجه‌ی کل' : '۲. بودجه‌ی کل'} sub="با احتساب مالیات بر ارزش افزوده" />
          <Input label="بودجه (تومان)" dir="ltr" inputMode="numeric" autoComplete="off" maxLength={16} placeholder={faNum(50000000)}
            value={budget > 0 ? faNum(budget) : ''} hint={budget > 0 ? `معادل ${moneyShort(budget)}` : undefined}
            onChange={(e) => setBudget(Math.min(Math.floor(parseNum(e.target.value)), 1e12))} />
          <Chips<string> className="mt-3" value={String(budget)} onChange={(k) => setBudget(Number(k))} items={PRESETS.map(([v, l]) => ({ key: String(v), label: l }))} />

          {!plan && (
            <Card className="mt-5 flex items-center gap-3 p-4">
              <Icon name="ti-wallet" size={22} className="text-brand" />
              <p className="m-0 flex-1 text-[12.5px] leading-7 text-mute">بودجه‌ی خود را وارد کنید تا بهترین ترکیب رسانه را برایتان بچینیم</p>
            </Card>
          )}

          {plan && !plan.items.length && (
            <Empty icon="ti-mood-empty" title="با این بودجه پیشنهادی پیدا نشد" text="بودجه را بیشتر کنید یا هدف را تغییر دهید" />
          )}

          {plan && plan.items.length > 0 && (
            <>
              <SectionTitle title="طرح پیشنهادی" sub={`${faNum(plan.items.length)} سرویس${industry ? ' — ' + (labels.get(industry) ?? '') : ''}`} />
              <div className="grid gap-2.5">
                {plan.items.map(({ p, q: qty }) => {
                  const pl = platBy.get(p.cat);
                  const cost = qty * p.price, m = metricOf(p, qty);
                  const share = spent > 0 ? Math.round((cost / spent) * 100) : 0;
                  return (
                    <Card key={p.id} className="flex items-start gap-3 p-3.5">
                      <Cube v={{ icon: pl?.icon ?? 'ti-speakerphone', c1: pl?.color ?? '#6366f1', c2: pl?.color2 ?? '#8b5cf6' }} size="sm" />
                      <div className="min-w-0 flex-1">
                        <b className="block text-[13.5px] font-black leading-6 text-ink">{p.name}</b>
                        {indCats.has(p.cat) && <Badge tone="ok" className="mt-1"><Icon name="ti-circle-check" size={12} />مناسب صنف شما</Badge>}
                        <div className="mt-1 text-[11.5px] leading-6 text-mute">{pl?.name ? pl.name + ' • ' : ''}{faNum(qty)} {p.unit}</div>
                        {m && <div className="text-[11.5px] leading-6 text-mute">نتیجه‌ی تخمینی: حدود {m}</div>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5"><b className="num text-[13px] font-black text-ink">{moneyShort(cost)}</b><small className="num text-[11px] text-mute">{faNum(share)}٪</small></div>
                    </Card>
                  );
                })}
              </div>

              <Card className="mt-4 grid gap-2.5 p-4">
                {([['هزینه‌ی سرویس‌ها', moneyShort(spent)], ['مالیات', moneyShort(Math.max(0, withTax - spent))]] as [string, string][]).map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between text-[12.5px]"><span className="text-mute">{l}</span><b className="num font-black text-ink">{v}</b></div>
                ))}
                <div className="flex items-center justify-between border-t border-line pt-2.5"><b className="text-[13.5px] font-black text-ink">جمع با مالیات</b><b className="num text-[16px] font-black text-brand">{moneyShort(withTax)}</b></div>
                <div className="flex items-center justify-between text-[12px]"><span className="text-mute">باقی بودجه</span><b className="num font-black text-ink">{moneyShort(Math.max(0, budget - withTax))}</b></div>
                {kpis.length > 0 && (
                  <div className={cx('mt-1 grid gap-2 text-center', kpis.length === 1 ? 'grid-cols-1' : kpis.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                    {kpis.slice(0, 3).map(([ic, v, l]) => (
                      <div key={l} className="rounded-xl bg-surface2 py-2.5"><Icon name={ic} size={16} className="text-brand" /><b className="num block text-[14px] font-black">{v}</b><small className="text-[11px] text-mute">{l}</small></div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}
