// قالب‌بندی فارسی عدد و مبلغ
const FA = '۰۱۲۳۴۵۶۷۸۹';

export const faDigits = (v: string | number): string => String(v).replace(/\d/g, (d) => FA[+d]);

export const toEnDigits = (v: string): string =>
  String(v ?? '')
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** عدد با جداکننده‌ی هزارگان */
export const faNum = (v: number | null | undefined, decimals = 0): string => {
  const n = Number.isFinite(Number(v)) ? Number(v) : 0;
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return (n < 0 ? '‎−' : '') + faDigits(grouped) + (frac ? '٫' + faDigits(frac) : '');
};

const trim1 = (x: number) => String(Math.round(x * 10) / 10);

/** مبلغ کوتاه: ۲٫۵ میلیون */
export const faShort = (v: number | null | undefined): string => {
  const n = Number.isFinite(Number(v)) ? Number(v) : 0;
  const a = Math.abs(n);
  const s = n < 0 ? '‎−' : '';
  const f = (x: number) => faDigits(trim1(x)).replace('.', '٫');
  if (a >= 1e9) return s + f(a / 1e9) + ' میلیارد';
  if (a >= 1e6) return s + f(a / 1e6) + ' میلیون';
  if (a >= 1e3) return s + f(a / 1e3) + ' هزار';
  return s + faNum(a);
};

/** ورودی کاربر (ارقام فارسی، جداکننده، ممیز) → عدد نامنفی */
export const parseNum = (v: string): number => {
  const s = toEnDigits(v).replace(/[٬,،\s]/g, '').replace(/[٫/]/g, '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const money = (v: number, usdt = false): string => (usdt ? `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT` : `${faNum(Math.round(v))} تومان`);
export const moneyShort = (v: number, usdt = false): string => (usdt ? `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT` : `${faShort(v)} تومان`);

/** متن‌های تک‌خطی بدون نقطه‌ی پایانی نمایش داده می‌شوند */
export const noDot = (v: string | null | undefined): string => (v ?? '').replace(/[.。]+\s*$/u, '');
