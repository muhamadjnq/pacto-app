import { useNavigate } from 'react-router-dom';
import { faNum } from '@/lib/fa';
import { copyText, haptic, openWeb, shareText } from '@/lib/native';
import { useAuth } from '@/lib/store';
import { Badge, Card, Icon, IconBox, Page } from '@/ui/kit';

interface Item { icon: string; label: string; to?: string; web?: string; tone?: 'brand' | 'ok' | 'warn' | 'bad' | 'info' | 'mute'; badge?: string }

function Group({ items }: { items: Item[] }) {
  const nav = useNavigate();
  return (
    <Card className="mt-3 divide-y divide-line">
      {items.map((it) => (
        <button key={it.label} type="button" onClick={() => { haptic(); if (it.to) nav(it.to); else if (it.web) void openWeb(it.web); }} className="press flex w-full items-center gap-3 p-3 text-start">
          <IconBox name={it.icon} tone={it.tone ?? 'brand'} size={38} />
          <b className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold">{it.label}</b>
          {it.badge && <Badge tone="warn">{it.badge}</Badge>}
          <Icon name={it.web ? 'ti-external-link' : 'ti-chevron-left'} size={18} className="text-mute" />
        </button>
      ))}
    </Card>
  );
}

export default function Account() {
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  if (!user) return null;
  const initial = Array.from(user.name.trim())[0] ?? 'پ';
  const invite = user.referral_code ? `https://adpacto.com/register?ref=${encodeURIComponent(user.referral_code)}` : null;

  return (
    <Page title="حساب من" tabs right={<button type="button" aria-label="تنظیمات" onClick={() => { haptic(); nav('/settings'); }} className="ico press h-10 w-10 rounded-xl text-ink"><Icon name="ti-settings" size={21} /></button>}>
      <Card onClick={() => nav('/profile')} className="flex items-center gap-3.5 p-4">
        <span className="ico h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-[22px] font-black text-white" aria-hidden="true">{initial}</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-[15.5px] font-black">{user.name}</b><small className="ltr block truncate text-start text-[12px] text-mute">{user.email}</small></span>
        <Icon name="ti-edit" size={19} className="text-mute" />
      </Card>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Card onClick={() => nav('/wallet')} className="p-3.5"><small className="flex items-center gap-1.5 text-[11.5px] text-mute"><Icon name="ti-wallet" size={15} />کیف پول</small><b className="num mt-1 block truncate text-[15px] font-black">{faNum(Math.round(user.wallet))} <span className="text-[11px] font-bold text-mute">تومان</span></b></Card>
        <Card onClick={() => nav('/club')} className="p-3.5"><small className="flex items-center gap-1.5 text-[11.5px] text-mute"><Icon name="ti-crown" size={15} />باشگاه پکتو</small><b className="mt-1 block truncate text-[14px] font-black">امتیاز و جایزه‌ها</b></Card>
      </div>

      <Group items={[
        { icon: 'ti-receipt', label: 'سفارش‌های من', to: '/orders' },
        { icon: 'ti-bell', label: 'اعلان‌ها', to: '/notifications', tone: 'info' },
        { icon: 'ti-headset', label: 'پشتیبانی و تیکت‌ها', to: '/tickets', tone: 'ok' },
        { icon: 'ti-file-invoice', label: 'فاکتورها', web: '/user/invoices', tone: 'mute' },
      ]} />
      <Group items={[
        { icon: 'ti-user-edit', label: 'ویرایش حساب و رمز عبور', to: '/profile' },
        { icon: 'ti-shield-lock', label: 'تأیید دومرحله‌ای', web: '/user/security', tone: 'ok', badge: user.two_factor ? undefined : 'غیرفعال' },
        { icon: 'ti-settings', label: 'تنظیمات اپ و قفل', to: '/settings', tone: 'mute' },
      ]} />

      {invite && (
        <Card className="mt-3 p-4">
          <div className="flex items-center gap-3"><IconBox name="ti-gift" tone="warn" size={38} /><div className="min-w-0 flex-1"><b className="block text-[13.5px] font-extrabold">دعوت دوستان</b><small className="text-[11.5px] text-mute">کد معرف شما: <span className="ltr font-bold text-ink">{user.referral_code}</span></small></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => void copyText(invite, 'لینک دعوت کپی شد')} className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-surface2 text-[12.5px] font-extrabold text-ink"><Icon name="ti-copy" size={16} />کپی لینک</button>
            <button type="button" onClick={() => void shareText(`با پکتو تبلیغ سفارش بده و نتیجه را زنده ببین\n${invite}`, 'دعوت به پکتو')} className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand/10 text-[12.5px] font-extrabold text-brand"><Icon name="ti-share" size={16} />ارسال دعوت</button>
          </div>
        </Card>
      )}
      <p className="num mt-5 text-center text-[11px] text-mute">عضو پکتو از {user.joined}</p>
    </Page>
  );
}
