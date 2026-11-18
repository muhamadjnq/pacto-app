import { useNavigate } from 'react-router-dom';
import { faNum, money } from '@/lib/fa';
import { useMeta } from '@/lib/meta';
import { haptic } from '@/lib/native';
import { cartTotal, useCart } from '@/lib/store';
import { Button, Card, Cube, Empty, Icon, Page, Qty } from '@/ui/kit';

export default function Cart() {
  const nav = useNavigate();
  const { items, setQty, remove, clear } = useCart();
  const meta = useMeta();
  const base = cartTotal(items);
  const tax = Math.round(base * (meta.data?.tax_rate ?? 0));

  if (!items.length) {
    return <Page title="سبد خرید" back><Empty icon="ti-shopping-cart-off" title="سبد خرید خالی است" text="سرویس‌های تبلیغ را به سبد اضافه کنید و یک‌جا سفارش دهید"><Button icon="ti-speakerphone" onClick={() => nav('/shop', { replace: true })}>دیدن رسانه‌ها</Button></Empty></Page>;
  }
  return (
    <Page title="سبد خرید" sub={`${faNum(items.length)} سرویس`} back
      right={<button type="button" aria-label="خالی کردن سبد" onClick={() => { if (window.confirm('همه‌ی سرویس‌های سبد حذف شوند؟')) { haptic(); clear(); } }} className="ico press h-10 w-10 rounded-xl text-mute"><Icon name="ti-trash" size={20} /></button>}
      footer={<div className="flex items-center gap-3"><div className="min-w-0 flex-1"><small className="block text-[11px] text-mute">قابل پرداخت</small><b className="num block truncate text-[16px] font-black">{money(base + tax)}</b></div><Button size="lg" icon="ti-arrow-left" onClick={() => nav('/checkout')}>ادامه و ثبت سفارش</Button></div>}>
      <div className="grid gap-2.5">
        {items.map((i) => (
          <Card key={i.id} className="p-3.5">
            <div className="flex items-center gap-3">
              <Cube v={i} size="sm" />
              <button type="button" className="min-w-0 flex-1 text-start" onClick={() => nav(`/product/${i.id}`)}><b className="block truncate text-[13.5px] font-black">{i.name}</b><small className="num text-[11.5px] text-mute">{i.cat ? `${i.cat} · ` : ''}{money(i.price)} هر {i.unit}</small></button>
              <button type="button" aria-label={`حذف ${i.name}`} onClick={() => { haptic(); remove(i.id); }} className="ico press h-10 w-10 rounded-xl text-mute"><Icon name="ti-x" size={18} /></button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3"><Qty value={i.qty} min={i.min} max={i.max} step={i.step} onChange={(v) => setQty(i.id, v)} /><b className="num text-[14px] font-black">{money(i.price * i.qty)}</b></div>
          </Card>
        ))}
      </div>
      <Card className="mt-3 p-4">
        <dl className="m-0 grid gap-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-mute">جمع سرویس‌ها</dt><dd className="num m-0 font-bold">{money(base)}</dd></div>
          <div className="flex justify-between"><dt className="text-mute">مالیات بر ارزش افزوده</dt><dd className="num m-0 font-bold">{money(tax)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[14px]"><dt className="font-black">قابل پرداخت</dt><dd className="num m-0 font-black text-brand">{money(base + tax)}</dd></div>
        </dl>
        <p className="m-0 mt-3 text-[11.5px] leading-6 text-mute">قیمت نهایی هنگام ثبت سفارش با قیمت روز سایت محاسبه می‌شود</p>
      </Card>
    </Page>
  );
}
