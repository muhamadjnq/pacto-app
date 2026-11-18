import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiError, api, errText } from '@/lib/api';
import { faNum } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { invalidate } from '@/lib/query';
import { toast } from '@/lib/store';
import { Button, Chips, Input, Page, Textarea } from '@/ui/kit';

type Dept = 'technical' | 'billing' | 'general' | 'sales';
const DEPTS: { key: Dept; label: string }[] = [
  { key: 'technical', label: 'پشتیبانی فنی' }, { key: 'billing', label: 'مالی و صورتحساب' },
  { key: 'general', label: 'عمومی' }, { key: 'sales', label: 'فروش' },
];

export default function TicketNew() {
  const nav = useNavigate();
  const [dept, setDept] = useState<Dept>('general');
  const loc = useLocation();
  const [title, setTitle] = useState(() => { const t = (loc.state as { title?: unknown } | null)?.title; return typeof t === 'string' ? t.slice(0, 120) : ''; });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<{ title?: string; message?: string; department?: string }>({});
  const lock = useRef(false);

  const valid = title.trim().length >= 3 && message.trim().length >= 10;

  const submit = async () => {
    if (lock.current || !valid) return;
    lock.current = true; setBusy(true); setErrs({});
    try {
      const r = await api<{ ticket_id: number }>('/v1/tickets', { method: 'POST', body: { title: title.trim(), department: dept, message: message.trim() } });
      invalidate('tickets'); toast('تیکت ثبت شد', 'ok'); haptic('ok');
      nav(`/tickets/${r.ticket_id}`, { replace: true });
      return;
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setErrs({ title: e.field('title'), message: e.field('message'), department: e.field('department') });
        if (!e.field('title') && !e.field('message') && !e.field('department')) toast(errText(e), 'bad');
      } else toast(errText(e), 'bad');
      haptic('bad');
    }
    lock.current = false; setBusy(false);
  };

  return (
    <Page title="تیکت جدید" back footer={<Button size="lg" block busy={busy} disabled={!valid} onClick={() => void submit()}>ارسال تیکت</Button>}>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <span className="px-1 text-[12.5px] font-extrabold text-ink">بخش</span>
          <Chips<Dept> items={DEPTS} value={dept} onChange={setDept} />
          {errs.department && <span role="alert" className="px-1 text-[12px] font-bold text-bad">{errs.department}</span>}
        </div>
        <Input label="موضوع" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} error={errs.title} placeholder="موضوع را کوتاه بنویسید" />
        <Textarea label="پیام" maxLength={3000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} error={errs.message}
          hint={`${faNum(message.length)} از ${faNum(3000)} نویسه`} placeholder="مشکل یا سؤال خود را توضیح دهید" />
      </div>
    </Page>
  );
}
