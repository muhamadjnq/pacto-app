import { Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { hideSplash, initNative } from './lib/native';
import { useLock } from './lib/lock';
import { useAuth, useCart } from './lib/store';
import { Icon, Skeleton, Toasts, cx } from './ui/kit';
import { faNum } from './lib/fa';
import { useMeta, versionLess } from './lib/meta';
import { openExternal } from './lib/native';
import { Button, Cube } from './ui/kit';
import { haptic } from './lib/native';
import Login from './pages/Login';
import Home from './pages/Home';
import LockScreen from './pages/LockScreen';

// صفحه‌های کم‌استفاده‌تر جدا بارگذاری می‌شوند تا شروع اپ سریع بماند
const Register = lazy(() => import('./pages/Register'));
const Shop = lazy(() => import('./pages/Shop'));
const Products = lazy(() => import('./pages/Products'));
const ProductPage = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderPage = lazy(() => import('./pages/Order'));
const LivePage = lazy(() => import('./pages/Live'));
const Tools = lazy(() => import('./pages/Tools'));
const Roi = lazy(() => import('./pages/Roi'));
const PlannerPage = lazy(() => import('./pages/Planner'));
const Templates = lazy(() => import('./pages/Templates'));
const Account = lazy(() => import('./pages/Account'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Tickets = lazy(() => import('./pages/Tickets'));
const TicketNew = lazy(() => import('./pages/TicketNew'));
const TicketThread = lazy(() => import('./pages/TicketThread'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ClubPage = lazy(() => import('./pages/Club'));
const Settings = lazy(() => import('./pages/Settings'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));

const TABS = [
  { to: '/', icon: 'ti-home', label: 'خانه' },
  { to: '/shop', icon: 'ti-speakerphone', label: 'سفارش تبلیغ' },
  { to: '/orders', icon: 'ti-receipt', label: 'سفارش‌ها' },
  { to: '/tools', icon: 'ti-tools', label: 'ابزارها' },
  { to: '/account', icon: 'ti-user-circle', label: 'حساب' },
];
const isTab = (p: string) => TABS.some((t) => t.to === p);

function TabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const cart = useCart((s) => s.items.length);
  return (
    <nav aria-label="ناوبری اصلی" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md" style={{ paddingBottom: 'var(--sab)' }}>
      <div className="mx-auto grid h-[var(--tabbar-h)] max-w-[560px] grid-cols-5">
        {TABS.map((t) => {
          const on = pathname === t.to;
          return (
            <button key={t.to} type="button" aria-current={on ? 'page' : undefined} onClick={() => { haptic(); nav(t.to, { replace: true }); }}
              className={cx('press relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-extrabold', on ? 'text-brand' : 'text-mute')}>
              <span className={cx('ico relative h-8 w-12 rounded-full transition-colors', on && 'bg-brand/12')}>
                <Icon name={t.icon} size={22} />
                {t.to === '/shop' && cart > 0 && <span className="num absolute -top-1 end-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-bad px-1 text-[10px] font-black leading-none text-white">{faNum(cart)}</span>}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const Fallback = () => <div className="grid gap-3 p-4 pt-20"><Skeleton className="h-28 rounded-xl2" /><Skeleton className="h-20 rounded-xl2" /><Skeleton className="h-20 rounded-xl2" /></div>;

export default function App() {
  const token = useAuth((s) => s.token);
  const locked = useLock((s) => s.locked && s.enabled);
  const loc = useLocation();
  const nav = useNavigate();
  const meta = useMeta();
  const path = useRef(loc.pathname); path.current = loc.pathname;

  useEffect(() => {
    hideSplash();
    initNative(() => {
      // اول برگه‌ی باز بسته می‌شود، بعد یک صفحه عقب، و فقط در صفحه‌ی خانه اپ بسته می‌شود
      const ev = new CustomEvent('pacto:back', { cancelable: true });
      if (!window.dispatchEvent(ev)) return true;
      if (path.current === '/' || path.current === '/login') return false;
      if (isTab(path.current)) { nav('/', { replace: true }); return true; }
      nav(-1); return true;
    });
    // با رفتن اپ به پس‌زمینه، دفعه‌ی بعد قفل می‌خواهد
    const onPause = () => useLock.getState().lock();
    window.addEventListener('pacto:pause', onPause);
    return () => window.removeEventListener('pacto:pause', onPause);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // نسخه‌ای که دیگر با سایت سازگار نیست باید به‌روز شود
  const app = meta.data?.app;
  if (app?.min_version && versionLess(__APP_VERSION__, app.min_version)) {
    return (
      <div className="hero-grad flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-white">
        <Cube v={{ icon: 'ti-download', c1: '#818cf8', c2: '#6d28d9' }} size="lg" />
        <h1 className="m-0 text-[20px] font-black">نسخه‌ی جدید پکتو آماده است</h1>
        <p className="m-0 text-[13.5px] leading-7 text-white/80">{app.notice || 'برای ادامه، اپ را به‌روز کنید'}</p>
        <Button variant="glass" size="lg" icon="ti-download" onClick={() => void openExternal(app.update_url || 'https://adpacto.com')}>دریافت نسخه‌ی جدید</Button>
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
        <Toasts />
      </>
    );
  }
  if (locked) return <><LockScreen /><Toasts /></>;

  return (
    <>
      <div key={loc.pathname} className="mx-auto h-full max-w-[560px] animate-in">
        <Suspense fallback={<Fallback />}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:slug" element={<Products />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/roi" element={<Roi />} />
            <Route path="/tools/planner" element={<PlannerPage />} />
            <Route path="/tools/templates" element={<Templates />} />
            <Route path="/account" element={<Account />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/new" element={<TicketNew />} />
            <Route path="/tickets/:id" element={<TicketThread />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/club" element={<ClubPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      {isTab(loc.pathname) && <TabBar />}
      <Toasts />
    </>
  );
}
