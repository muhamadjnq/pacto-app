import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { faDigits, faNum } from '@/lib/fa';
import { useQuery } from '@/lib/query';
import { Badge, Button, Card, Empty, ErrorState, ListSkeleton, Page } from '@/ui/kit';

type Status = 'open' | 'pending' | 'in_progress' | 'answered' | 'closed';
interface Ticket { id: number; title: string; status: Status; status_label: string; department: string; messages_count: number; last_reply_at: string | null; created_at: string }

const tone = (s: Status) => (s === 'open' ? 'ok' : s === 'answered' ? 'info' : s === 'closed' ? 'done' : 'warn');

export default function Tickets() {
  const nav = useNavigate();
  const q = useQuery<{ tickets: Ticket[] }>('tickets', () => api<{ tickets: Ticket[] }>('/v1/tickets'), { ttl: 15000 });
  const list = q.data?.tickets ?? [];
  return (
    <Page title="پشتیبانی" back onRefresh={() => void q.refetch()} refreshing={q.refreshing}
      right={<Button size="sm" variant="soft" icon="ti-plus" onClick={() => nav('/tickets/new')}>تیکت جدید</Button>}>
      <div className="grid gap-2.5">
        {q.loading && <ListSkeleton />}
        {q.error && !q.data && <ErrorState error={q.error} retry={() => void q.refetch()} />}
        {list.map((t) => (
          <Card key={t.id} onClick={() => nav(`/tickets/${t.id}`)} className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[13.5px] font-black text-ink">{t.title}</b>
              <div className="mt-0.5 truncate text-[11.5px] text-mute">{t.department} · <span className="num">{faNum(t.messages_count)}</span> پیام · <span className="num">{faDigits(t.last_reply_at ?? t.created_at)}</span></div>
            </div>
            <Badge tone={tone(t.status)} dot>{t.status_label}</Badge>
          </Card>
        ))}
        {q.data && !list.length && (
          <Empty icon="ti-headset" title="تیکتی ندارید" text="هر سؤالی دارید بپرسید؛ تیم پکتو پاسخ می‌دهد">
            <Button icon="ti-plus" onClick={() => nav('/tickets/new')}>تیکت جدید</Button>
          </Empty>
        )}
      </div>
    </Page>
  );
}
