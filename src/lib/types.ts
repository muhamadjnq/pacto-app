export interface User { id: number; name: string; email: string; phone: string | null; avatar: string | null; referral_code: string | null; email_verified: boolean; two_factor: boolean; wallet: number; joined: string }
export interface Visual { icon: string; c1: string; c2: string }
export interface Category extends Visual { id: number; name: string; slug: string; count: number; group: string }
export interface Group extends Visual { key: string; label: string }
export interface Product extends Visual {
  id: number; name: string; summary: string; quote: boolean; usdt: boolean; price: number; unit: string; min: number; max: number | null; step: number;
  badge: string | null; featured: boolean; rating: number; reviews: number; delivery: string | null; cat: { slug: string; name: string } | null;
}
export interface Estimate { kind: string; impressions: number | null; clicks: number | null; members: number | null; installs: number | null; reach: number | null }
export interface ProductFull extends Product { title: string; description: string; features: string[]; requirements: string | null; guarantee: string | null; audience: string | null; followers: number | null; avg_views: number | null; estimate: Estimate; web_path: string }
export type Tone = 'warn' | 'info' | 'ok' | 'done' | 'bad' | '';
export interface Order extends Visual {
  id: number; code: string; status: string; label: string; tone: Tone; title: string; more: number; platform: string | null; usdt: boolean;
  base: number; tax: number; total: number; created: string; ago: string; can_pay: boolean; can_cancel: boolean; can_reorder: boolean;
}
/** price جمع همان ردیف است، نه قیمت واحد */
export interface OrderItem { product_id: number; name: string; quantity: number; unit: string; price: number }
export interface Report { totals: { impressions: number; views: number; clicks: number; engagements: number; conversions: number; ctr: number }; updated: string | null; daily: { date: string; views: number; clicks: number }[]; posts: { url: string; host: string; date: string; views: number; clicks: number }[] }
export interface OrderFull extends Order { items: OrderItem[]; brief: string; brief_missing: boolean; delivery: string | null; delivery_link: string | null; checkout_path: string; web_path: string; events: { title: string; note: string | null; date: string }[]; report: Report | null }
export interface Paged<T> { data: T[]; meta: { page: number; last: number; total: number } }
export interface ReorderItem extends Visual { order_id: number; name: string; more: number; qty: number; unit: string; usdt: boolean; price: number }
export interface Home {
  user: User; counts: { pending: number; active: number; completed: number }; orders: Order[]; reorder: ReorderItem[];
  live: { running: number; views: number; clicks: number; ctr: number; today: number; trend: number | null } | null;
  club: { points: number; level: string; key: string; color: string; c2: string; progress: number; next: string | null; remaining: number } | null; unread: number;
}
export interface LiveCard extends Visual { id: number; code: string; title: string; more: number; platform: string; status: string; label: string; tone: string; running: boolean; views: number; clicks: number; conversions: number; posts: number; ctr: number; target: number; progress: number | null; today: number; spark: { line: string; area: string } | null; last: string | null; fresh: boolean; has_data: boolean; started: string; can_reorder: boolean }
export interface Live { ready: boolean; sig: string; cards: LiveCard[]; running: number; finished: number; totals: { views: number; clicks: number; conversions: number; today: number; ctr: number }; trend: number | null; chart: { label: string; views: number; clicks: number; hv: number; hc: number; today: boolean }[]; has_chart: boolean; links: { count: number; today: number; total: number } | null; pixel: { active: boolean; leads?: number; sales?: number } | null; at: string }
export interface Meta { tax_rate: number; brief: { goals: Record<string, string>; text_min: number }; departments: Record<string, string>; support: { phone: string | null; email: string | null; site: string }; app: { min_version: string | null; latest_version: string | null; update_url: string | null; notice: string | null } }
export interface PlanProduct { id: number; name: string; cat: string; type: string; unit: string; price: number; min: number; max: number | null; step: number; kind: string; imp: number | null; clk: number | null; mem: number | null; ins: number | null; reach: number | null; rating: number; delivery: string | null }
export interface Planner { platforms: { slug: string; name: string; icon: string; color: string; color2: string; ctr: number }[]; products: PlanProduct[]; tax_rate: number; industries: { key: string; label: string; icon: string }[]; industry_map: Record<string, string[]>; my_industry: string | null }
export interface Template { id: number; title: string; category: string | null; platform: string | null; occasion: string | null; body: string }
export interface Club { ready: boolean; points: number; lifetime: number; cashback: number; plus: boolean; level: { key: string; title: string; icon: string; color: string; c2: string; progress: number; next_title: string | null; remaining: number; spend: number; cashback: number }; missions: { id: number; title: string; description: string | null; icon: string; points: number; current: number; target: number; pct: number; state: 'ready' | 'todo' | 'claimed'; money: boolean; unit: string }[]; rewards: { id: number; title: string; description: string | null; icon: string; value: string; cost: number; stock: number | null; can: boolean }[] }
export interface CartLine extends Visual { id: number; name: string; unit: string; price: number; min: number; max: number | null; step: number; qty: number; cat: string | null }
