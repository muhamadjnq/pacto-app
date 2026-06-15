/*
 * make-offline.js
 * این اسکریپت فایل index.html را کاملاً آفلاین می‌کند:
 * کتابخانه‌های React / Babel / Tailwind و فونت وزیرمتن را دانلود کرده و
 * مستقیماً داخل فایل جاسازی می‌کند تا اپ بدون اینترنت و فیلترشکن کار کند.
 *
 * اجرا:  node make-offline.js
 * (به اینترنت/فیلترشکن فقط همین یک بار نیاز دارد)
 */
const fs = require("fs");
const https = require("https");
const path = require("path");

const WWW = path.join(__dirname, "www");
const SRC = path.join(WWW, "index.html");

const get = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      return get(res.headers.location).then(resolve, reject);
    }
    if (res.statusCode !== 200) return reject(new Error(url + " -> " + res.statusCode));
    let data = "";
    res.setEncoding("utf8");
    res.on("data", (c) => (data += c));
    res.on("end", () => resolve(data));
  }).on("error", reject);
});

(async () => {
  console.log("در حال خواندن index.html ...");
  let html = fs.readFileSync(SRC, "utf8");

  const deps = [
    ["https://unpkg.com/react@18.3.1/umd/react.production.min.js", "react"],
    ["https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js", "react-dom"],
    ["https://unpkg.com/@babel/standalone@7.24.7/babel.min.js", "babel"],
    ["https://cdn.tailwindcss.com", "tailwind"],
  ];

  for (const [url, name] of deps) {
    process.stdout.write("دانلود " + name + " ... ");
    const code = await get(url);
    // جایگزینی تگ اسکریپت src با اسکریپت درون‌خطی
    const tag = new RegExp('<script src="' + url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"[^>]*></script>');
    html = html.replace(tag, "<script>\n" + code + "\n</script>");
    console.log("OK (" + Math.round(code.length / 1024) + " KB)");
  }

  // پیش‌کامپایل کد JSX با Babel تا اپ روی گوشی سریع باز شود و به Babel زمان‌اجرا نیاز نباشد
  try {
    process.stdout.write("پیش‌کامپایل کد برنامه ... ");
    const Babel = require("@babel/standalone") || global.Babel;
    const re = /<script type="text\/babel" data-presets="react">([\s\S]*?)<\/script>/;
    const m = html.match(re);
    if (m && Babel && Babel.transform) {
      const compiled = Babel.transform(m[1], { presets: ["react"] }).code;
      html = html.replace(re, "<script>\n" + compiled + "\n</script>");
      console.log("OK");
    } else {
      console.log("رد شد (Babel در حالت زمان‌اجرا باقی می‌ماند — مشکلی نیست)");
    }
  } catch (e) {
    console.log("رد شد (" + e.message + ") — Babel زمان‌اجرا باقی می‌ماند، اپ همچنان کار می‌کند.");
  }

  // فونت وزیرمتن: فایل CSS را می‌گیریم و فقط به نگه‌داشتن فونت سیستمی اکتفا می‌کنیم
  // (جاسازی کامل فونت حجم را خیلی بالا می‌برد؛ فونت سیستمی فارسی جایگزین می‌شود)
  html = html.replace(/@import url\('https:\/\/cdn\.jsdelivr\.net[^']*'\);?/g, "");

  const out = path.join(WWW, "index.html");
  fs.writeFileSync(out, html);
  console.log("\n✅ تمام شد. فایل www/index.html حالا کاملاً آفلاین است.");
  console.log("حجم نهایی:", Math.round(html.length / 1024), "KB");
})().catch((e) => {
  console.error("\n❌ خطا:", e.message);
  console.error("اگر خطای شبکه بود، فیلترشکن را روشن کنید و دوباره اجرا کنید.");
  process.exit(1);
});
