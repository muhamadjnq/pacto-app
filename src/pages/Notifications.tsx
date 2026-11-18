import { useState } from 'react';
import { api, errText } from '@/lib/api';
import { haptic } from '@/lib/native';
import { invalidate, useQuery } from '@/lib/query';
import { toast } from '@/lib/store';
import { Button, Card, Empty, ErrorState, IconBox, ListSkeleton, Page, cx } from '@/ui/kit';

interface Notif { id: number; title: string; message: string; type: string; is_read: boolean; created_at: string }

const look = (t: string): { icon: string; tone: 'ok' | 'warn' | 'bad' | 'brand' } =>
  t === 'success' ? { icon: 'ti-circle-check', tone: 'ok' } : t === 'warning' ? { icon: 'ti-alert-triangle', tone: 'warn' } : t === 'danger' ? { icon: 'ti-alert-circle', tone: 'bad' } : { icon: 'ti-bell', tone: 'brand' };

export default function Notifications() {
  const q = useQuery<{ notifications: Notif[] }>('notifications', () => api<{ notifications: Notif[] }>('/v1/notifications'), { ttl: 15000 });
  const [busy, setBusy] = useState(false);
  const list = q.data?.notifications ?? [];
  const unread = list.some((n) => !n.is_read);

  const readAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api('/v1/notifications/read-all', { method: 'POST' });
      haptic('ok'); await q.refetch(); invalidate('home');
    } catch (e) { toast(errText(e), 'bad'); }
    setBusy(false);
  };

  return (
    <Page title="اعلان‌ها" back onRefresh={() => void q.refetch()} refreshing={q.refreshing}
      right={unread ? <Button size="sm" variant="ghost" busy={busy} className="me-1" onClick={() => void readAll()}>خواندن همه</Button> : undefined}>
      <div className="grid gap-2.5">
        {q.loading && <ListSkeleton />}
        {q.error && !q.data && <ErrorState error={q.error} retry={() => void q.refetch()} />}
        {list.map((n) => {
          const l = look(n.type);
          return (
            <Card key={n.id} className={cx('relative flex items-start gap-3 p-3.5', !n.is_read && 'border-brand/40')}>
              <IconBox name={l.icon} tone={l.tone} />
              <div className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-black text-ink">{n.title}</b>
                <p className="m-0 mt-1 whitespace-pre-wrap break-words text-[12.5px] leading-7 text-mute">{n.message}</p>
                <span className="mt-1 block text-[11px] text-mute">{n.created_at}</span>
              </div>
              {!n.is_read && <span className="absolute end-3 top-3 h-2 w-2 rounded-full bg-brand" aria-label="خوانده‌نشده" />}
            </Card>
          );
        })}
        {q.data && !list.length && <Empty icon="ti-bell-off" title="اعلانی ندارید" />}
      </div>
    </Page>
  );
}
