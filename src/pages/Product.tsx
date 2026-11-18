import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { faNum, faShort, money, noDot } from '@/lib/fa';
import { useMeta } from '@/lib/meta';
import { haptic, openWeb, shareText } from '@/lib/native';
import { useQuery } from '@/lib/query';
import { snapQty, toast, useCart } from '@/lib/store';
import type { ProductFull } from '@/lib/types';
import { Badge, Button, Card, Cube, ErrorState, Icon, Page, Qty, SectionTitle, Skeleton, Stat } from '@/ui/kit';
import { CartButton } from './Shop';

export default function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useQuery<{ product: ProductFull }>(`product:${id}`, () => api(`/v2/products/${id}`, { auth: false }), { ttl: 120000 });
  const meta = useMeta();
  const p = q.data?.product;
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.items.some((i) => i.id === Number(id)));
  const cartHasOther = useCart((s) => s.items.some((i) => i.id !== Number(id)));
  const [qty, setQty] = useState(0);
  useEffect(() => { if (p) setQty(snapQty(p, p.min)); }, [p]);

  if (!p) return <Page title="سرویس" back>{q.error ? <ErrorState error={q.error} retry={() => void q.refetch()} /> : <div className="grid gap-3"><Skeleton className="h-40 rounded-xl2" /><Skeleton className="h-24 rounded-xl2" /><Skeleton className="h-32 rounded-xl2" /></div>}</Page>;

  const base = p.price * qty;
  const tax = p.usdt ? 0 : Math.round(base * (meta.data?.tax_rate ?? 0));
  const ratio = p.min > 0 ? qty / p.min : 1;
  const est = p.estimate;
  const estRows = ([['impressions', 'بازدید تخمینی', 'ti-eye'], ['clicks', 'کلیک تخمینی', 'ti-click'], ['members', 'عضو تخمینی', 'ti-users'], ['installs', 'نصب تخمینی', 'ti-download'], ['reach', 'دسترسی تخمینی', 'ti-broadcast']] as const)
    .filter(([k]) => (est[k] ?? 0) > 0).slice(0, 3);

  const toCart = (go: boolean) => {
    add(p, qty); haptic('ok');
    if (go) nav('/checkout'); else toast('به سبد اضافه شد', 'ok');
  };

  const footer = p.quote ? (
    <Button size="lg" block icon="ti-message-2" onClick={() => void openWeb(p.web_path)}>درخواست قیمت در سایت</Button>
  ) : p.usdt ? (
    <Button size="lg" block icon="ti-currency-dollar" onClick={() => void openWeb(p.web_path)}>سفارش با ارز دیجیتال در سایت</Button>
  ) : (
    <div className="flex items-center gap-2.5">
      <div className="min-w-0 flex-1"><small className="block text-[11px] text-mute">جمع با مالیات</small><b className="num block truncate text-[15px] font-black">{money(base + tax)}</b></div>
      <Button variant="soft" icon={inCart ? 'ti-check' : 'ti-shopping-cart-plus'} aria-label="افزودن به سبد" onClick={() => toCart(false)} />
      <Button size="lg" icon="ti-bolt" onClick={() => toCart(true)}>{cartHasOther ? 'ادامه با سبد' : 'سفارش'}</Button>
    </div>
  );

  return (
    <Page title={p.cat?.name ?? 'سرویس'} back footer={footer}
      right={<><button type="button" aria-label="اشتراک‌گذاری" onClick={() => void shareText(`${p.name}\nhttps://adpacto.com/products`, p.name)} className="ico press h-10 w-10 rounded-xl text-mute"><Icon name="ti-share" size={20} /></button><CartButton /></>}>
      <Card className="overflow-hidden p-5" style={{ background: `linear-gradient(140deg, ${p.c1}24, transparent 62%)` }}>
        <div className="flex items-start gap-4">
          <Cube v={p} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[17px] font-black leading-8">{p.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {p.badge && <Badge tone="brand">{p.badge}</Badge>}
              {p.rating > 0 && <Badge tone="warn"><Icon name="ti-star-filled" size={12} /><span className="num">{faNum(p.rating, 1)}</span>{p.reviews > 0 && <span className="num">({faNum(p.reviews)})</span>}</Badge>}
              {p.delivery && <Badge tone="info"><Icon name="ti-clock" size={12} />{p.delivery}</Badge>}
            </div>
          </div>
        </div>
        {p.summary && <p className="m-0 mt-4 text-[13px] leading-7 text-mute">{noDot(p.summary)}</p>}
        <div className="mt-4 flex items-end gap-1.5"><b className="num text-[22px] font-black leading-8">{p.quote ? 'قیمت توافقی' : p.usdt ? money(p.price, true) : faNum(Math.round(p.price))}</b>{!p.quote && <span className="pb-1 text-[12px] text-mute">{p.usdt ? '' : 'تومان '}برای هر {p.unit}</span>}</div>
      </Card>

      {(p.followers || p.avg_views) && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {!!p.followers && <Stat icon="ti-users" tone="brand" value={faShort(p.followers)} label="دنبال‌کننده" />}
          {!!p.avg_views && <Stat icon="ti-eye" tone="info" value={faShort(p.avg_views)} label="میانگین بازدید" />}
        </div>
      )}

      {!p.quote && !p.usdt && (
        <Card className="mt-3 p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><b className="block text-[13.5px] font-black">تعداد</b><small className="num text-[11.5px] text-mute">حداقل {faNum(p.min)}{p.max ? ` · حداکثر ${faNum(p.max)}` : ''} {p.unit}</small></div>
            <Qty value={qty} min={p.min} max={p.max} step={p.step} onChange={(v) => setQty(snapQty(p, v))} />
          </div>
          {estRows.length > 0 && (
            <div className="mt-4 grid gap-2 border-t border-line pt-3" style={{ gridTemplateColumns: `repeat(${estRows.length}, minmax(0, 1fr))` }}>
              {estRows.map(([k, label, icon]) => <div key={k} className="rounded-xl bg-surface2 px-1 py-2.5 text-center"><Icon name={icon} size={17} className="text-brand" /><b className="num mt-0.5 block text-[14px] font-black">{faShort(Math.round((est[k] ?? 0) * ratio))}</b><small className="text-[10.5px] text-mute">{label}</small></div>)}
            </div>
          )}
          <dl className="m-0 mt-4 grid gap-1.5 border-t border-line pt-3 text-[12.5px]">
            <div className="flex justify-between"><dt className="text-mute">مبلغ سرویس</dt><dd className="num m-0 font-bold">{money(base)}</dd></div>
            {tax > 0 && <div className="flex justify-between"><dt className="text-mute">مالیات بر ارزش افزوده</dt><dd className="num m-0 font-bold">{money(tax)}</dd></div>}
          </dl>
        </Card>
      )}

      {p.features.length > 0 && (
        <>
          <SectionTitle title="ویژگی‌ها" />
          <Card className="grid gap-2.5 p-4">{p.features.map((f, i) => <div key={i} className="flex items-start gap-2.5 text-[13px] leading-7"><Icon name="ti-circle-check" size={18} className="mt-1 text-ok" /><span className="min-w-0 flex-1">{noDot(f)}</span></div>)}</Card>
        </>
      )}
      {p.description && (<><SectionTitle title="توضیحات" /><Card className="p-4"><p data-selectable className="m-0 whitespace-pre-wrap break-words text-[13px] leading-8 text-ink/90">{p.description}</p></Card></>)}
      {([['مخاطبان', p.audience, 'ti-target'], ['پیش‌نیاز سفارش', p.requirements, 'ti-list-check'], ['تضمین', p.guarantee, 'ti-shield-check']] as const).filter(([, v]) => !!v).map(([t, v, icon]) => (
        <Card key={t} className="mt-3 flex items-start gap-3 p-4"><Icon name={icon} size={20} className="mt-0.5 text-brand" /><div className="min-w-0 flex-1"><b className="block text-[13px] font-black">{t}</b><p className="m-0 mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-7 text-mute">{noDot(v)}</p></div></Card>
      ))}
    </Page>
  );
}
