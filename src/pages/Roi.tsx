import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { faDigits, faNum, faShort, parseNum, toEnDigits } from '@/lib/fa';
import { shareText } from '@/lib/native';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/query';
import { ls } from '@/lib/store';
import type { Planner } from '@/lib/types';
import { Button, Card, Chips, Icon, IconBox, Input, Page, SectionTitle, cx } from '@/ui/kit';

// <core>
type Key = 'budget' | 'cpm' | 'ctr' | 'conv' | 'aov' | 'margin';
type Vals = Record<Key, number>;
const KEYS: Key[] = ['budget', 'cpm', 'ctr', 'conv', 'aov', 'margin'];
const PCT_KEYS: Key[] = ['ctr', 'conv', 'margin'];

const roiRead = (o: Vals): Vals => {
  const r = { ...o };
  PCT_KEYS.forEach((k) => { r[k] = Math.min(100, r[k]); });
  return r;
};
const roiModel = (o: Vals, m = 1) => {
  const ctr = Math.min(100, o.ctr * m), cv = Math.min(100, o.conv * m);
  const imp = o.cpm > 0 ? (o.budget / o.cpm) * 1000 : 0, clk = (imp * ctr) / 100, cus = (clk * cv) / 100;
  const rev = cus * o.aov, gp = (rev * o.margin) / 100, net = gp - o.budget;
  return { imp, clk, cus, rev, gp, net, roi: o.budget > 0 ? (net / o.budget) * 100 : 0 };
};
const roiNumbers = (o: Vals) => {
  const r = roiModel(o), unit = (o.aov * o.margin) / 100;
  const ready = o.budget > 0 && o.cpm > 0;
  const need = r.clk > 0 && unit > 0 ? (o.budget / (r.clk * unit)) * 100 : 0;
  const cpmMax = 1000 * (o.ctr / 100) * (o.conv / 100) * unit;
  const cac = r.cus > 0 ? o.budget / r.cus : 0;
  const roas = r.rev > 0 && o.budget > 0 ? r.rev / o.budget : 0;
  const be = unit > 0 && o.budget > 0 ? Math.ceil(o.budget / unit) : 0;
  return { r, unit, ready, need, cpmMax, cac, roas, be };
};
// </core>

const DEFAULTS: Vals = { budget: 10000000, cpm: 60000, ctr: 1.2, conv: 2, aov: 800000, margin: 30 };
const STORE = 'pacto_roi';

const trim1 = (x: number) => String(Math.round(x * 10) / 10);
const fmt1 = (x: number) => faDigits(trim1(x)).replace('.', '٫');
const pct = (x: number) => fmt1(x) + '٪';
const signedPct = (x: number) => (x < 0 ? '−' : '') + faNum(Math.abs(Math.round(x))) + '٪';
const isMoney = (k: Key) => !PCT_KEYS.includes(k);
const showVal = (k: Key, n: number) => (isMoney(k) ? (n > 0 ? faNum(n) : '') : n > 0 ? fmt1(Math.min(100, n)) : n === 0 ? '۰' : '');

const toDisplay = (o: Vals): Record<Key, string> => {
  const d = {} as Record<Key, string>;
  KEYS.forEach((k) => { d[k] = showVal(k, o[k]); });
  return d;
};
const restore = (): Vals => {
  const st = ls.get<Partial<Record<Key, unknown>> | null>(STORE, null);
  const out = { ...DEFAULTS };
  if (!st || typeof st !== 'object') return out;
  KEYS.forEach((k) => { const v = st[k]; if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e13) out[k] = v; });
  return out;
};

const FIELDS: { k: Key; label: string; max: number; span?: boolean; decimal?: boolean }[] = [
  { k: 'budget', label: 'بودجه تبلیغ (تومان)', max: 20, span: true },
  { k: 'cpm', label: 'هزینه‌ی هر ۱۰۰۰ نمایش (تومان)', max: 16, span: true },
  { k: 'ctr', label: 'نرخ کلیک (درصد)', max: 6, decimal: true },
  { k: 'conv', label: 'نرخ تبدیل (درصد کلیک‌ها)', max: 6, decimal: true },
  { k: 'aov', label: 'میانگین فروش هر مشتری (تومان)', max: 16, span: true },
  { k: 'margin', label: 'حاشیه‌ی سود (درصد از فروش)', max: 6, span: true, decimal: true },
];

const SCENARIOS: { name: string; sub: string; m: number }[] = [
  { name: 'بدبینانه', sub: '۴۰٪ کمتر از انتظار', m: 0.6 },
  { name: 'واقع‌بینانه', sub: 'همین عددهای بالا', m: 1 },
  { name: 'خوش‌بینانه', sub: '۴۰٪ بهتر از انتظار', m: 1.4 },
];

type Part = [string, boolean];
interface Tip { icon: string; ok: boolean; parts: Part[] }

const Bar = ({ label, value, max, color, text }: { label: string; value: number; max: number; color: string; text: string }) => (
  <div className="grid gap-1.5">
    <div className="flex items-center justify-between gap-2 text-[12px]"><span className="text-mute">{label}</span><b className="num font-black text-ink">{text}</b></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-surface2"><div className={cx('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${value > 0 ? Math.max(1, Math.min(100, (value / max) * 100)) : 0}%` }} /></div>
  </div>
);

const Tile = ({ label, children }: { label: string; children: ReactNode }) => (
  <Card className="flex min-w-0 flex-col gap-1.5 p-3.5">
    <small className="text-[11.5px] font-bold leading-5 text-mute">{label}</small>
    <b className="num mt-auto block truncate text-[17px] font-black leading-7 text-ink">{children}</b>
  </Card>
);

export default function Roi() {
  const [vals, setVals] = useState<Vals>(restore);
  const [shown, setShown] = useState<Record<Key, string>>(() => toDisplay(restore()));

  useEffect(() => { ls.set(STORE, roiRead(vals)); }, [vals]);

  const change = (k: Key, raw: string) => {
    if (isMoney(k)) {
      const n = Math.min(Math.floor(parseNum(raw)), 1e13 - 1);
      setVals((v) => ({ ...v, [k]: n }));
      setShown((s) => ({ ...s, [k]: n > 0 ? faNum(n) : '' }));
      return;
    }
    let c = toEnDigits(raw).replace(/[٫/]/g, '.').replace(/[^\d.]/g, '');
    const i = c.indexOf('.');
    if (i >= 0) c = c.slice(0, i + 1) + c.slice(i + 1).replace(/\./g, '');
    setShown((s) => ({ ...s, [k]: faDigits(c).replace('.', '٫') }));
    setVals((v) => ({ ...v, [k]: Math.min(100, parseNum(c)) }));
  };
  const blur = (k: Key) => {
    if (shown[k].trim() === '') return;
    setShown((s) => ({ ...s, [k]: showVal(k, vals[k]) }));
  };
  const reset = () => { ls.del('pacto_roi'); setVals({ ...DEFAULTS }); setShown(toDisplay(DEFAULTS)); };

  // پیش‌فرض هر رسانه: نرخ کلیک همان رسانه و میانگین قیمت واقعی هر ۱۰۰۰ بازدید در فروشگاه
  const plan = useQuery<Planner>('planner', () => api<Planner>('/v2/planner'), { ttl: 300000, persist: true });
  const presets = useMemo(() => {
    const d = plan.data; if (!d) return [];
    return d.platforms.map((pf) => {
      const prices = d.products.filter((x) => x.cat === pf.slug && x.type === 'view_based' && x.price > 0).map((x) => x.price);
      return { key: pf.slug, label: pf.name, ctr: pf.ctr, cpm: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0 };
    }).filter((x) => x.cpm > 0 && x.ctr > 0).slice(0, 12);
  }, [plan.data]);
  const [preset, setPreset] = useState('');
  const usePreset = (k: string) => {
    const pr = presets.find((x) => x.key === k); if (!pr) return;
    setPreset(k);
    const next = { ...vals, cpm: pr.cpm, ctr: Math.min(100, pr.ctr) };
    setVals(next); setShown((sh) => ({ ...sh, cpm: showVal('cpm', next.cpm), ctr: showVal('ctr', next.ctr) }));
  };

  const o = useMemo(() => roiRead(vals), [vals]);
  const { r, unit, ready, need, cpmMax, cac, roas, be } = useMemo(() => roiNumbers(o), [o]);
  const bad = ready && r.net < 0;

  const tips = useMemo<Tip[]>(() => {
    const t: Tip[] = [];
    if (ready && unit > 0) {
      if (r.clk > 0) {
        t.push({
          icon: 'ti-percentage', ok: need <= 100 && o.conv >= need,
          parts: need <= 100
            ? [['نرخ تبدیل باید حداقل ', false], [pct(need), true], [' باشد تا هزینه برگردد', false], ...(o.conv >= need ? [['؛ عدد فعلی شما بالاتر است', false] as Part] : [['؛ عدد فعلی شما ', false] as Part, [pct(o.conv), true] as Part, [' است', false] as Part])]
            : [['با این تعداد کلیک حتی اگر همه خرید کنند هزینه برنمی‌گردد؛ بودجه را کمتر یا میانگین فروش را بیشتر کنید', false]],
        });
      }
      if (cpmMax > 0) t.push({ icon: 'ti-eye', ok: o.cpm <= cpmMax, parts: [['تا وقتی هزینه‌ی هر ۱۰۰۰ نمایش کمتر از ', false], [faShort(cpmMax) + ' تومان', true], [' باشد این تبلیغ سود می‌دهد', false]] });
      t.push({
        icon: 'ti-user-dollar', ok: r.cus > 0 && cac <= unit,
        parts: [['هر مشتری ', false], [faShort(unit) + ' تومان', true], [' سود می‌آورد', false], ...(r.cus > 0 ? [[' و جذبش ', false] as Part, [faShort(cac) + ' تومان', true] as Part, [' خرج دارد', false] as Part] : [])],
      });
    } else {
      t.push({ icon: 'ti-info-circle', ok: false, parts: [['بودجه، هزینه‌ی هر ۱۰۰۰ نمایش، میانگین فروش و حاشیه‌ی سود را وارد کنید', false]] });
    }
    return t;
  }, [ready, unit, r.clk, r.cus, need, cpmMax, cac, o.conv, o.cpm]);

  const scen = useMemo(() => SCENARIOS.map((s) => ({ ...s, m: roiModel(o, s.m) })), [o]);
  const maxNet = Math.max(1, ...scen.map((s) => Math.abs(s.m.net)));
  const maxBar = Math.max(o.budget, r.rev, r.gp, 1);

  const share = () => {
    const lines = ready
      ? [
        'نتیجه‌ی محاسبه‌ی بازگشت سرمایه تبلیغ',
        `بودجه: ${faShort(o.budget)} تومان`,
        `نمایش: ${faShort(r.imp)} | کلیک: ${faShort(r.clk)} | مشتری: ${fmt1(r.cus)}`,
        `فروش: ${faShort(r.rev)} تومان`,
        `سود خالص: ${faShort(r.net)} تومان`,
        `بازگشت سرمایه: ${signedPct(r.roi)}`,
        be > 0 ? `مشتری لازم برای سر‌به‌سر: ${faNum(be)}` : '',
        'محاسبه شده با اپ پکتو',
      ]
      : ['بودجه و هزینه‌ی هر ۱۰۰۰ نمایش را وارد کنید تا نتیجه ساخته شود'];
    void shareText(lines.filter(Boolean).join('\n'), 'بازگشت سرمایه تبلیغ');
  };

  const dash = '—';
  return (
    <Page title="ماشین‌حساب بازگشت سرمایه" back>
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2.5"><IconBox name="ti-adjustments" size={36} /><div><h2 className="m-0 text-[14.5px] font-black text-ink">ورودی‌ها</h2><p className="m-0 text-[11.5px] text-mute">همه‌ی عددها قابل تغییرند</p></div></div>
        {presets.length > 0 && <div className="mb-4"><span className="mb-2 block text-[12.5px] font-extrabold text-ink">نوع تبلیغ</span><Chips value={preset} onChange={usePreset} items={presets.map((x) => ({ key: x.key, label: x.label }))} /></div>}
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.k} className={f.span ? 'col-span-2' : undefined}>
              <Input label={f.label} dir="ltr" inputMode={f.decimal ? 'decimal' : 'numeric'} autoComplete="off" maxLength={f.max} value={shown[f.k]} placeholder={faNum(0)}
                onChange={(e) => change(f.k, e.target.value)} onBlur={() => blur(f.k)} />
            </div>
          ))}
        </div>
        <p className="m-0 mt-3 text-[11.5px] leading-6 text-mute">عددهای پیش‌فرض میانگین است؛ نتیجه‌ی واقعی را بعد از اجرا در گزارش سفارش می‌بینید</p>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <div className={cx('flex items-center gap-3 p-4', !ready ? 'bg-surface2 text-mute' : bad ? 'bg-bad/10 text-bad' : 'bg-ok/10 text-ok')} aria-live="polite">
          <IconBox name={bad ? 'ti-trending-down' : 'ti-trending-up'} tone={!ready ? 'mute' : bad ? 'bad' : 'ok'} size={46} />
          <div className="min-w-0">
            <b className="ltr block text-end text-[26px] font-black leading-9">{ready ? signedPct(r.roi) : dash}</b>
            <small className="block text-[12px] font-bold leading-5">{!ready ? 'بودجه و هزینه‌ی هر ۱۰۰۰ نمایش را وارد کنید' : r.net >= 0 ? 'سود خالص بعد از کسر هزینه‌ی تبلیغ' : 'با این فرض‌ها هزینه‌ی تبلیغ برنمی‌گردد'}</small>
            {ready && <small className="num mt-0.5 block text-[12px] font-black leading-5">{faShort(r.net)} تومان</small>}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Tile label="نمایش">{ready ? faShort(r.imp) : dash}</Tile>
        <Tile label="کلیک">{ready ? faShort(r.clk) : dash}</Tile>
        <Tile label="مشتری">{ready ? fmt1(r.cus) : dash}</Tile>
        <Tile label="فروش (تومان)">{ready ? faShort(r.rev) : dash}</Tile>
        <Tile label="سود خالص (تومان)"><span className={cx(ready && r.net < 0 && 'text-bad', ready && r.net > 0 && 'text-ok')}>{ready ? faShort(r.net) : dash}</span></Tile>
        <Tile label="هزینه‌ی هر مشتری (تومان)">{ready && r.cus > 0 ? faShort(cac) : dash}</Tile>
        <Tile label="فروش از هر تومان تبلیغ">{ready && r.rev > 0 ? fmt1(roas) + ' تومان' : dash}</Tile>
        <Tile label="مشتری لازم برای سر‌به‌سر">{be > 0 ? faNum(be) : dash}</Tile>
      </div>

      <Card className="mt-3 grid gap-3 p-4">
        <Bar label="هزینه‌ی تبلیغ" value={o.budget} max={maxBar} color="bg-warn" text={faShort(o.budget)} />
        <Bar label="فروش" value={r.rev} max={maxBar} color="bg-brand" text={faShort(r.rev)} />
        <Bar label="سود ناخالص" value={r.gp} max={maxBar} color="bg-ok" text={faShort(r.gp)} />
      </Card>

      <SectionTitle title="اگر نتیجه بهتر یا بدتر شد" sub="همین بودجه با نرخ کلیک و تبدیل کمتر یا بیشتر" />
      <div className="grid gap-2.5">
        {scen.map((s) => (
          <Card key={s.name} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div><h3 className="m-0 text-[13.5px] font-black text-ink">{s.name}</h3><p className="m-0 text-[11.5px] text-mute">{s.sub}</p></div>
              <b className={cx('ltr text-[15px] font-black', ready && s.m.net < 0 ? 'text-bad' : ready && s.m.net > 0 ? 'text-ok' : 'text-mute')}>{ready ? signedPct(s.m.roi) : dash}</b>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`سود خالص سناریوی ${s.name}`}>
              <div className={cx('h-full rounded-full transition-[width] duration-500', s.m.net < 0 ? 'bg-bad' : 'bg-ok')} style={{ width: `${ready && s.m.net !== 0 ? Math.max(3, (Math.abs(s.m.net) / maxNet) * 100) : 0}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {([['مشتری', ready ? fmt1(s.m.cus) : dash], ['فروش', ready ? faShort(s.m.rev) : dash], ['سود خالص', ready ? faShort(s.m.net) : dash]] as [string, string][]).map(([l, v]) => (
                <div key={l} className="rounded-xl bg-surface2 py-2"><b className="num block text-[13px] font-black">{v}</b><small className="text-[11px] text-mute">{l}</small></div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle title="برای اینکه تبلیغ سود بدهد" sub="سه عددی که باید زیر نظر داشته باشید" />
      <Card className="grid gap-3 p-4">
        {tips.map((t, i) => (
          <div key={i} className="flex items-start gap-3">
            <IconBox name={t.icon} tone={t.ok ? 'ok' : 'warn'} size={34} />
            <p className="m-0 flex-1 text-[12.5px] leading-7 text-ink">{t.parts.map(([s, b], j) => (b ? <b key={j} className="num font-black">{s}</b> : <span key={j}>{s}</span>))}</p>
          </div>
        ))}
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button icon="ti-share" onClick={share}>اشتراک نتیجه</Button>
        <Button variant="ghost" icon="ti-arrow-back-up" onClick={reset}>بازنشانی</Button>
      </div>
      <p className="m-0 mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-mute"><Icon name="ti-info-circle" size={14} />تخمین‌ها بر پایه‌ی عددهایی است که وارد کرده‌اید</p>
    </Page>
  );
}
