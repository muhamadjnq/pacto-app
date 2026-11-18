import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, errText } from '@/lib/api';
import { faDigits } from '@/lib/fa';
import { haptic } from '@/lib/native';
import { invalidate, useQuery } from '@/lib/query';
import { toast } from '@/lib/store';
import { Button, ErrorState, Page, Skeleton, Textarea, cx } from '@/ui/kit';

interface Msg { id: number; message: string; is_mine: boolean; created_at: string }
interface Ticket { id: number; title: string; status: string; status_label: string; messages: Msg[] }

export default function TicketThread() {
  const { id = '' } = useParams();
  const q = useQuery<{ ticket: Ticket }>(`ticket:${id}`, () => api<{ ticket: Ticket }>(`/v1/tickets/${encodeURIComponent(id)}`), { ttl: 10000, poll: 20000 });
  const t = q.data?.ticket;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const count = t?.messages.length ?? 0;
  const lastId = t?.messages[count - 1]?.id;

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [count, lastId]);

  const send = async () => {
    const m = text.trim();
    if (lock.current || m.length < 2) return;
    lock.current = true; setBusy(true);
    try {
      await api(`/v1/tickets/${encodeURIComponent(id)}/reply`, { method: 'POST', body: { message: m } });
      setText(''); haptic('ok');
      await q.refetch(); invalidate('tickets');
    } catch (e) { toast(errText(e), 'bad'); haptic('bad'); }
    lock.current = false; setBusy(false);
  };

  const closed = t?.status === 'closed';
  const footer = t ? (closed ? (
    <p className="m-0 py-2 text-center text-[12.5px] text-mute">این تیکت بسته شده است</p>
  ) : (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1"><Textarea aria-label="پیام" rows={1} maxLength={3000} className="min-h-[48px] max-h-32" placeholder="پاسخ خود را بنویسید" value={text} onChange={(e) => setText(e.target.value)} /></div>
      <Button icon="ti-send" aria-label="ارسال" className="h-12 w-12 shrink-0 !px-0" busy={busy} disabled={text.trim().length < 2} onClick={() => void send()} />
    </div>
  )) : undefined;

  return (
    <Page title={t?.title || 'تیکت'} sub={t?.status_label} back footer={footer} onRefresh={() => void q.refetch()} refreshing={q.refreshing}>
      {q.loading && <div className="grid gap-3"><Skeleton className="h-16 w-4/5 rounded-2xl" /><Skeleton className="ms-auto h-16 w-3/5 rounded-2xl" /></div>}
      {q.error && !t && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {t && (
        <div className="grid gap-3">
          {t.messages.map((m) => (
            <div key={m.id} className={cx('flex flex-col', m.is_mine ? 'items-start' : 'items-end')}>
              <div className={cx('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-7', m.is_mine ? 'rounded-ss-md bg-gradient-to-l from-brand to-brand-2 text-white' : 'rounded-se-md border border-line bg-surface text-ink')}>
                <p data-selectable className="m-0 whitespace-pre-wrap break-words">{m.message}</p>
              </div>
              <span className="num mt-1 px-1 text-[10.5px] text-mute">{faDigits(m.created_at)}</span>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
    </Page>
  );
}
