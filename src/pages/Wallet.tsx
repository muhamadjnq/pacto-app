import { api } from '@/lib/api';
import { faDigits, faNum } from '@/lib/fa';
import { openWeb } from '@/lib/native';
import { useQuery } from '@/lib/query';
import { Badge, Button, Card, Empty, ErrorState, IconBox, ListSkeleton, Page, SectionTitle, Icon } from '@/ui/kit';

interface Tx { id: number; type: 'credit' | 'debit'; amount: number; description: string | null; status: string; created_at: string }

export default function Wallet() {
  const bal = useQuery<{ balance: number }>('wallet:balance', () => api<{ balance: number }>('/v1/wallet/balance'), { ttl: 15000 });
  const tx = useQuery<{ transactions: Tx[] }>('wallet:tx', () => api<{ transactions: Tx[] }>('/v1/wallet/transactions'), { ttl: 15000 });
  const list = tx.data?.transactions ?? [];
  const refetch = () => { void bal.refetch(); void tx.refetch(); };

  return (
    <Page title="کیف پول" back onRefresh={refetch} refreshing={bal.refreshing || tx.refreshing}>
      <section className="hero-grad relative overflow-hidden rounded-[22px] p-5 text-white">
        <span className="absolute -start-12 -top-12 h-44 w-44 rounded-full bg-fuchsia-400/25 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[12px] text-white/80"><Icon name="ti-wallet" size={17} />موجودی کیف پول</div>
          <div className="mt-1 flex items-end gap-2"><b className="num text-[30px] font-black leading-10">{faNum(Math.round(bal.data?.balance ?? 0))}</b><span className="pb-2 text-[12px] text-white/80">تومان</span></div>
          <Button variant="glass" icon="ti-plus" className="mt-3" onClick={() => void openWeb('/user/wallet/topup')}>شارژ کیف پول</Button>
          <p className="m-0 mt-3 text-[11.5px] text-white/75">شارژ در صفحه‌ی امن سایت انجام می‌شود</p>
        </div>
      </section>

      <SectionTitle title="تراکنش‌ها" />
      <div className="grid gap-2.5">
        {tx.loading && <ListSkeleton />}
        {tx.error && !tx.data && <ErrorState error={tx.error} retry={() => void tx.refetch()} />}
        {list.map((t) => {
          const credit = t.type === 'credit';
          return (
            <Card key={t.id} className="flex items-center gap-3 p-3.5">
              <IconBox name={credit ? 'ti-arrow-down-left' : 'ti-arrow-up-right'} tone={credit ? 'ok' : 'bad'} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px] font-black text-ink">{t.description || 'تراکنش'}</b>
                <span className="num mt-0.5 block text-[11.5px] text-mute">{faDigits(t.created_at)}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <b className={`num text-[13.5px] font-black ${credit ? 'text-ok' : 'text-bad'}`}><span className="ltr">{credit ? '+' : '−'}</span>{faNum(Math.abs(t.amount))}</b>
                {t.status === 'pending' && <Badge tone="warn">در انتظار</Badge>}
                {t.status === 'failed' && <Badge tone="bad">ناموفق</Badge>}
              </div>
            </Card>
          );
        })}
        {tx.data && !list.length && <Empty icon="ti-receipt-off" title="هنوز تراکنشی ندارید" />}
      </div>
    </Page>
  );
}
