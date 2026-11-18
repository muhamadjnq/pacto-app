import { useNavigate } from 'react-router-dom';
import { haptic, openWeb } from '@/lib/native';
import { Card, Cube, Icon, Page, SectionTitle } from '@/ui/kit';

interface Tool { icon: string; title: string; text: string; c1: string; c2: string; to?: string; web?: string }
const APP: Tool[] = [
  { icon: 'ti-activity-heartbeat', title: 'داشبورد زنده', text: 'نتیجه‌ی لحظه‌ای کمپین‌ها', to: '/live', c1: '#10b981', c2: '#0ea5e9' },
  { icon: 'ti-sparkles', title: 'پیشنهاد هوشمند رسانه', text: 'بر اساس بودجه و صنف شما', to: '/tools/planner', c1: '#a855f7', c2: '#ec4899' },
  { icon: 'ti-calculator', title: 'ماشین‌حساب سود تبلیغ', text: 'بازگشت سرمایه را قبل از خرج ببینید', to: '/tools/roi', c1: '#6366f1', c2: '#8b5cf6' },
  { icon: 'ti-template', title: 'قالب‌های آماده', text: 'متن تبلیغ، آماده‌ی کپی', to: '/tools/templates', c1: '#f59e0b', c2: '#ef4444' },
  { icon: 'ti-crown', title: 'باشگاه پکتو', text: 'امتیاز، ماموریت و جایزه', to: '/club', c1: '#f59e0b', c2: '#db2777' },
  { icon: 'ti-headset', title: 'پشتیبانی', text: 'تیکت و پیگیری', to: '/tickets', c1: '#0ea5e9', c2: '#6366f1' },
];
const WEB: Tool[] = [
  { icon: 'ti-link', title: 'لینک کوتاه و آمار کلیک', text: 'ساخت لینک قابل ردیابی', web: '/user/tools/links', c1: '#0ea5e9', c2: '#22d3ee' },
  { icon: 'ti-users-group', title: 'معرفی دوستان', text: 'کد معرف و درآمد همکاری', web: '/user/affiliate/dashboard', c1: '#10b981', c2: '#84cc16' },
  { icon: 'ti-gift-card', title: 'کارت هدیه', text: 'خرید و استفاده از کارت هدیه', web: '/user/club/gift-cards', c1: '#ec4899', c2: '#f43f5e' },
  { icon: 'ti-apps', title: 'همه‌ی ابزارهای رشد', text: 'پیکسل، بسته‌ی اعتباری و بیشتر', web: '/user/tools', c1: '#64748b', c2: '#334155' },
];

export default function Tools() {
  const nav = useNavigate();
  const go = (t: Tool) => { haptic(); if (t.to) nav(t.to); else if (t.web) void openWeb(t.web); };
  return (
    <Page title="ابزارها" sub="هر چیزی که برای تبلیغ بهتر لازم دارید" tabs>
      <div className="grid grid-cols-2 gap-2.5">
        {APP.map((t) => (
          <button key={t.title} type="button" onClick={() => go(t)} className="press flex min-h-[132px] flex-col items-start gap-2.5 rounded-xl2 border border-line bg-surface p-3.5 text-start shadow-card">
            <Cube v={t} /><b className="text-[13px] font-black leading-6 text-ink">{t.title}</b><small className="-mt-1.5 text-[11.5px] leading-5 text-mute">{t.text}</small>
          </button>
        ))}
      </div>
      <SectionTitle title="در سایت پکتو" sub="با ورود خودکار و امن باز می‌شود" />
      <Card className="divide-y divide-line">
        {WEB.map((t) => (
          <button key={t.title} type="button" onClick={() => go(t)} className="press flex w-full items-center gap-3 p-3.5 text-start">
            <Cube v={t} size="sm" /><span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-extrabold">{t.title}</b><small className="text-[11.5px] text-mute">{t.text}</small></span><Icon name="ti-external-link" size={17} className="text-mute" />
          </button>
        ))}
      </Card>
    </Page>
  );
}
