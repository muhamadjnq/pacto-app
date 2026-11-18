import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, api, errText } from '@/lib/api';
import { faNum, faShort, money } from '@/lib/fa';
import { useMeta } from '@/lib/meta';
import { copyText, haptic, openExternal, openWeb } from '@/lib/native';
import { invalidate, setQueryData, useQuery } from '@/lib/query';
import { toast } from '@/lib/store';
import type { OrderFull, Report } from '@/lib/types';
import { Badge, Button, Card, Cube, ErrorState, Icon, Page, SectionTitle, Sheet, Skeleton, Stat } from '@/ui/kit';
import { BriefFields, briefBody, briefValid, type BriefForm } from './Checkout';

function ReportCard({ r }: { r: Report }) {
  const days = r.daily.slice(-14);
  const max = Math.max(1, ...days.map((d) => d.views));
  return (
    <>
      <SectionTitle title="نتیجه‌ی تبلیغ" sub={r.updated ? `آخرین به‌روزرسانی ${r.updated}` : undefined} />
      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon="ti-eye" tone="brand" value={faShort(r.totals.views || r.totals.impressions)} label="بازدید" />
        <Stat icon="ti-click" tone="info" value={faShort(r.totals.clicks)} label="کلیک" />
        <Stat icon="ti-percentage" tone="ok" value={`${faNum(r.totals.ctr, 2)}٪`} label="نرخ کلیک" />
        <Stat icon="ti-target-arrow" tone="warn" value={faShort(r.totals.conversions || r.totals.engagements)} label={r.totals.conversions ? 'تبدیل' : 'تعامل'} />
      </div>
      {days.length > 1 && (
        <Card className="mt-2.5 p-4">
          <b className="text-[12.5px] font-black">بازدید روزانه</b>
          <div className="mt-3 flex h-28 items-end gap-1" role="img" aria-label="نمودار بازدید روزانه">
            {days.map((d) => <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.date}: ${faNum(d.views)}`}><div className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand-2" style={{ height: `${Math.max(3, (d.views / max) * 100)}%` }} /></div>)}
          </div>
          <div className="num mt-1.5 flex justify-between text-[10.5px] text-mute"><span>{days[0].date}</span><span>{days[days.length - 1].date}</span></div>
        </Card>
      )}
      {r.posts.length > 0 && (
        <Card className="mt-2.5 divide-y divide-line">
          {r.posts.map((p, i) => (
            <button key={i} type="button" onClick={() => void openExternal(p.url)} className="press flex w-full items-center gap-3 p-3.5 text-start">
              <Icon name="ti-external-link" size={18} className="text-brand" />
              <span className="min-w-0 flex-1"><b className="ltr block truncate text-[12.5px] font-extrabold">{p.host}</b><small className="num text-[11px] text-mute">{p.date}</small></span>
              <span className="num text-[11.5px] font-bold text-mute">{faShort(p.views)} بازدید</span>
            </button>
          ))}
        </Card>
      )}
    </>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const meta = useMeta();
  const key = `order:${id}`;
  const q = useQuery<{ order: OrderFull }>(key, () => api(`/v2/orders/${id}`), { ttl: 10000 });
  const o = q.data?.order;
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<BriefForm>({ brief_goal: '', brief_link: '', brief_text: '', brief_media: '' });
  const [err, setErr] = useState<ApiError | null>(null);
  const closeEdit = useCallback(() => setEdit(false), []);
  const refetch = q.refetch;

  // بعد از برگشتن از صفحه‌ی پرداخت، وضعیت سفارش فوری تازه می‌شود
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') { void refetch(); invalidate('home', 'orders', 'wallet'); } };
    window.addEventListener('pacto:resume', back); document.addEventListener('visibilitychange', back);
    return () => { window.removeEventListener('pacto:resume', back); document.removeEventListener('visibilitychange', back); };
  }, [refetch]);

  const pay = useCallback(async (order: OrderFull) => { setBusy('pay'); await openWeb(order.checkout_path); setBusy(''); }, []);
  // بلافاصله بعد از ثبت سفارش، یک‌بار صفحه‌ی پرداخت باز می‌شود
  const auto = useRef(false);
  useEffect(() => {
    if (!o || auto.current || sp.get('pay') !== '1') return;
    auto.current = true; setSp({}, { replace: true });
    if (o.can_pay && !o.brief_missing) void pay(o);
  }, [o, sp, setSp, pay]);

  const act = async (name: 'cancel' | 'reorder') => {
    if (busy || !o) return;
    if (name === 'cancel' && !window.confirm('این سفارش لغو شود؟')) return;
    setBusy(name);
    try {
      const r = await api<{ order: OrderFull | null }>(`/v2/orders/${o.id}/${name}`, { method: 'POST' });
      invalidate('home', 'orders'); haptic('ok');
      if (name === 'cancel' && r.order) { setQueryData(key, { order: r.order }); toast('سفارش لغو شد', 'ok'); }
      if (name === 'reorder' && r.order) { toast('سفارش جدید ساخته شد', 'ok'); nav(`/orders/${r.order.id}`); }
    } catch (e) { haptic('bad'); toast(errText(e), 'bad'); }
    setBusy('');
  };

  const saveBrief = async () => {
    if (busy || !o) return;
    setBusy('brief'); setErr(null);
    try {
      const r = await api<{ order: OrderFull }>(`/v2/orders/${o.id}/brief`, { method: 'PUT', body: briefBody(f) });
      setQueryData(key, { order: r.order }); setEdit(false); haptic('ok'); toast('اطلاعات تبلیغ ذخیره شد', 'ok');
    } catch (x) { const e = x instanceof ApiError ? x : new ApiError(0, 'خطای ناشناخته'); setErr(e); if (!Object.keys(e.data?.errors ?? {}).length) toast(errText(e), 'bad'); }
    setBusy('');
  };

  if (!o) return <Page title="سفارش" back>{q.error ? <ErrorState error={q.error} retry={() => void q.refetch()} /> : <div className="grid gap-3"><Skeleton className="h-36 rounded-xl2" /><Skeleton className="h-28 rounded-xl2" /><Skeleton className="h-24 rounded-xl2" /></div>}</Page>;

  const footer = o.can_pay ? (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1"><small className="block text-[11px] text-mute">قابل پرداخت</small><b className="num block truncate text-[16px] font-black">{money(o.total, o.usdt)}</b></div>
      {o.brief_missing ? <Button size="lg" icon="ti-edit" onClick={() => setEdit(true)}>تکمیل اطلاعات تبلیغ</Button> : <Button size="lg" icon="ti-lock" busy={busy === 'pay'} onClick={() => void pay(o)}>پرداخت امن</Button>}
    </div>
  ) : o.can_reorder ? <Button size="lg" block variant="soft" icon="ti-repeat" busy={busy === 'reorder'} onClick={() => void act('reorder')}>سفارش دوباره‌ی همین تبلیغ</Button> : undefined;

  return (
    <Page title={`سفارش ${o.code}`} back onRefresh={() => void q.refetch()} refreshing={q.refreshing} footer={footer}>
      <Card className="overflow-hidden p-4" style={{ background: `linear-gradient(140deg, ${o.c1}22, transparent 62%)` }}>
        <div className="flex items-center gap-3.5">
          <Cube v={o} />
          <div className="min-w-0 flex-1"><h1 className="m-0 line-clamp-2 text-[15.5px] font-black leading-7">{o.title}{o.more > 0 && <span className="num text-mute"> +{faNum(o.more)}</span>}</h1><small className="num text-[11.5px] text-mute">{o.created}</small></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone={o.tone} dot>{o.label}</Badge>
        <button type="button" onClick={() => void copyText(o.code, 'کد سفارش کپی شد')} className="press inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface2 px-2.5 text-[11.5px] font-bold text-mute" aria-label={`کپی کد سفارش ${o.code}`}><Icon name="ti-copy" size={14} /><span className="ltr">{o.code}</span></button></div>
      </Card>

      {o.brief_missing && o.can_pay && (
        <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn/10 p-3.5 text-[12.5px] font-bold leading-6 text-amber-600 dark:text-amber-400"><Icon name="ti-alert-triangle" size={18} className="mt-0.5" /><span className="flex-1">قبل از پرداخت، اطلاعات تبلیغ را کامل کنید تا تیم اجرا بداند چه چیزی تبلیغ شود</span></div>
      )}

      {o.delivery_link && <Button className="mt-3" block variant="soft" icon="ti-external-link" onClick={() => void openExternal(o.delivery_link!)}>دیدن تبلیغ منتشرشده</Button>}
      {o.delivery && <Card className="mt-3 flex items-start gap-3 p-4"><Icon name="ti-truck-delivery" size={20} className="mt-0.5 text-ok" /><p data-selectable className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-words text-[12.5px] leading-7">{o.delivery}</p></Card>}

      {o.report && <ReportCard r={o.report} />}

      <SectionTitle title="سرویس‌ها" />
      <Card className="divide-y divide-line">
        {o.items.map((it, i) => (
          <button key={i} type="button" onClick={() => nav(`/product/${it.product_id}`)} className="press flex w-full items-center gap-3 p-3.5 text-start">
            <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-extrabold">{it.name}</b><small className="num text-[11.5px] text-mute">{faNum(it.quantity)} {it.unit}</small></span>
            <b className="num text-[12.5px] font-black">{money(it.price, o.usdt)}</b>
          </button>
        ))}
        <dl className="m-0 grid gap-1.5 p-3.5 text-[12.5px]">
          <div className="flex justify-between"><dt className="text-mute">جمع سرویس‌ها</dt><dd className="num m-0 font-bold">{money(o.base, o.usdt)}</dd></div>
          {o.tax > 0 && <div className="flex justify-between"><dt className="text-mute">مالیات بر ارزش افزوده</dt><dd className="num m-0 font-bold">{money(o.tax, o.usdt)}</dd></div>}
          <div className="flex justify-between text-[13.5px]"><dt className="font-black">مبلغ کل</dt><dd className="num m-0 font-black text-brand">{money(o.total, o.usdt)}</dd></div>
        </dl>
      </Card>

      <SectionTitle title="اطلاعات تبلیغ" action={o.can_pay ? <button type="button" className="press -my-2 inline-flex min-h-11 items-center px-2 text-[12.5px] font-extrabold text-brand" onClick={() => setEdit(true)}>{o.brief ? 'نوشتن دوباره' : 'افزودن'}</button> : undefined} />
      <Card className="p-4">{o.brief ? <p data-selectable className="m-0 whitespace-pre-wrap break-words text-[12.5px] leading-7">{o.brief}</p> : <p className="m-0 text-[12.5px] text-mute">هنوز اطلاعاتی ثبت نشده است</p>}</Card>

      {o.events.length > 0 && (
        <>
          <SectionTitle title="روند سفارش" />
          <Card className="p-4">
            <ol className="m-0 grid list-none gap-4 p-0">
              {o.events.map((e, i) => (
                <li key={i} className="relative flex gap-3">
                  {i < o.events.length - 1 && <span className="absolute bottom-[-16px] start-[7px] top-4 w-0.5 bg-line" aria-hidden="true" />}
                  <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] ${i === 0 ? 'border-brand bg-surface' : 'border-line bg-surface2'}`} />
                  <div className="min-w-0 flex-1"><b className="block text-[12.5px] font-extrabold">{e.title}</b>{e.note && <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-6 text-mute">{e.note}</p>}<small className="num text-[10.5px] text-mute">{e.date}</small></div>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      <div className="mt-5 grid gap-2.5">
        {o.can_pay && o.can_reorder && <Button variant="ghost" block icon="ti-repeat" busy={busy === 'reorder'} onClick={() => void act('reorder')}>سفارش دوباره</Button>}
        <Button variant="ghost" block icon="ti-file-invoice" onClick={() => void openWeb(o.web_path)}>فاکتور و جزئیات در سایت</Button>
        <Button variant="ghost" block icon="ti-headset" onClick={() => nav('/tickets/new', { state: { title: `سفارش ${o.code}` } })}>پشتیبانی این سفارش</Button>
        {o.can_cancel && <Button variant="danger" block icon="ti-x" busy={busy === 'cancel'} onClick={() => void act('cancel')}>لغو سفارش</Button>}
      </div>

      <Sheet open={edit} onClose={closeEdit} title="اطلاعات تبلیغ">
        <BriefFields f={f} set={setF} err={err} />
        <Button className="mt-5" size="lg" block busy={busy === 'brief'} disabled={!briefValid(f, meta.data?.brief.text_min ?? 15)} onClick={() => void saveBrief()}>ذخیره</Button>
      </Sheet>
    </Page>
  );
}
