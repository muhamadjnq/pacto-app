import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, api, errText } from '@/lib/api';
import { faNum, money } from '@/lib/fa';
import { useMeta } from '@/lib/meta';
import { haptic } from '@/lib/native';
import { invalidate } from '@/lib/query';
import { cartTotal, ls, toast, useCart } from '@/lib/store';
import type { OrderFull } from '@/lib/types';
import { Button, Card, Chips, Icon, Input, Page, Textarea } from '@/ui/kit';

export interface BriefForm { brief_goal: string; brief_link: string; brief_text: string; brief_media: string }
const newRef = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); };

/** فرم «اطلاعات تبلیغ»: در ثبت سفارش و در ویرایش سفارشِ پرداخت‌نشده یکی است */
export function BriefFields({ f, set, err }: { f: BriefForm; set: (f: BriefForm) => void; err: ApiError | null }) {
  const meta = useMeta();
  const goals = Object.entries(meta.data?.brief.goals ?? {});
  const min = meta.data?.brief.text_min ?? 15;
  const len = Array.from(f.brief_text.trim()).length;
  return (
    <div className="grid gap-4">
      {goals.length > 0 && (
        <div><span className="mb-2 block text-[12.5px] font-extrabold text-ink">هدف تبلیغ (اختیاری)</span>
          <Chips value={f.brief_goal} onChange={(k) => set({ ...f, brief_goal: k === f.brief_goal ? '' : k })} items={goals.map(([key, label]) => ({ key, label }))} className="flex-wrap !overflow-visible" /></div>
      )}
      <Input label="لینک یا آیدی چیزی که تبلیغ می‌شود" dir="ltr" placeholder="instagram.com/yourpage" maxLength={300} value={f.brief_link} onChange={(e) => set({ ...f, brief_link: e.target.value })} error={err?.field('brief_link')} hint="صفحه‌ی اینستاگرام، کانال، سایت یا محصول" />
      <Textarea label="توضیح تبلیغ" rows={5} maxLength={2000} placeholder="چه چیزی تبلیغ شود، برای چه کسانی و با چه پیامی" value={f.brief_text} onChange={(e) => set({ ...f, brief_text: e.target.value })} error={err?.field('brief_text')}
        hint={len < min ? `حداقل ${faNum(min)} نویسه؛ ${faNum(min - len)} نویسه‌ی دیگر` : `${faNum(len)} از ${faNum(2000)} نویسه`} />
      <Input label="لینک فایل، عکس یا ویدیو (اختیاری)" dir="ltr" inputMode="url" placeholder="https://" maxLength={500} value={f.brief_media} onChange={(e) => set({ ...f, brief_media: e.target.value })} error={err?.field('brief_media')} />
    </div>
  );
}
export const briefValid = (f: BriefForm, min: number) => f.brief_link.trim().length >= 2 && !/[<>]/.test(f.brief_link) && Array.from(f.brief_text.trim()).length >= min && (!f.brief_media.trim() || /^https?:\/\/\S+$/i.test(f.brief_media.trim()));
export const briefBody = (f: BriefForm) => ({ brief_goal: f.brief_goal || null, brief_link: f.brief_link.trim(), brief_text: f.brief_text.trim(), brief_media: f.brief_media.trim() || null });

export default function Checkout() {
  const nav = useNavigate();
  const items = useCart((s) => s.items);
  const meta = useMeta();
  const [f, setF] = useState<BriefForm>(() => ({ brief_goal: '', brief_link: '', brief_text: '', brief_media: '', ...ls.get<Partial<BriefForm>>('pacto_brief_draft', {}) }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  // یک شناسه برای هر تلاش ثبت؛ با قطع و وصل اینترنت، سفارش دوم ساخته نمی‌شود
  const ref = useRef(newRef());
  const done = useRef(false);
  useEffect(() => { ls.set('pacto_brief_draft', f); }, [f]);
  useEffect(() => { if (!items.length && !done.current) nav('/cart', { replace: true }); }, [items.length, nav]);

  const base = cartTotal(items);
  const tax = Math.round(base * (meta.data?.tax_rate ?? 0));
  const ok = briefValid(f, meta.data?.brief.text_min ?? 15);

  const submit = async () => {
    if (busy || !ok) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ order: OrderFull }>('/v2/orders', { method: 'POST', timeout: 30000, body: { client_ref: ref.current, items: items.map((i) => ({ product_id: i.id, quantity: i.qty })), ...briefBody(f) } });
      done.current = true;
      useCart.getState().clear(); ls.set('pacto_brief_draft', {}); invalidate('home', 'orders');
      haptic('ok'); toast('سفارش ثبت شد؛ پرداخت را کامل کنید', 'ok');
      nav(`/orders/${r.order.id}?pay=1`, { replace: true });
    } catch (x) {
      const e = x instanceof ApiError ? x : new ApiError(0, 'خطای ناشناخته');
      haptic('bad'); setErr(e);
      const gone = e.data?.gone;
      if (Array.isArray(gone)) gone.forEach((id) => typeof id === 'number' && useCart.getState().remove(id));
      // خطای قطعی سرور یعنی این تلاش تمام شده؛ تلاش بعدی شناسه‌ی تازه می‌گیرد
      if (e.status === 422) ref.current = newRef();
      if (!e.field('brief_link') && !e.field('brief_text') && !e.field('brief_media')) toast(errText(e), 'bad');
    }
    setBusy(false);
  };

  return (
    <Page title="اطلاعات تبلیغ" sub="تیم اجرا با همین اطلاعات تبلیغ شما را می‌سازد" back
      footer={<div className="flex items-center gap-3"><div className="min-w-0 flex-1"><small className="block text-[11px] text-mute">{faNum(items.length)} سرویس · با مالیات</small><b className="num block truncate text-[16px] font-black">{money(base + tax)}</b></div><Button size="lg" icon="ti-lock" busy={busy} disabled={!ok} onClick={() => void submit()}>ثبت و پرداخت</Button></div>}>
      <Card className="p-4"><BriefFields f={f} set={setF} err={err} /></Card>
      <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-info/10 p-3.5 text-[12px] leading-6 text-sky-700 dark:text-sky-300"><Icon name="ti-shield-lock" size={18} className="mt-0.5" /><span className="flex-1">پرداخت در صفحه‌ی امن سایت پکتو انجام می‌شود؛ با کیف پول، درگاه بانکی یا کد تخفیف</span></div>
    </Page>
  );
}
