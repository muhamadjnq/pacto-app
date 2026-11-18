/*
 * harden-android.js
 * ------------------------------------------------------------
 * این اسکریپت بعد از «npx cap sync android» اجرا می‌شود و پروژه‌ی اندروید را
 * برای عبور از بررسی کافه‌بازار/Play Protect ایمن‌سازی می‌کند:
 *
 *  ۱) فقط دسترسی «INTERNET» را نگه می‌دارد و هر دسترسی حساس (پیامک، مخاطبین،
 *     موقعیت مکانی، دوربین، میکروفون، نصب بسته، فهرست برنامه‌ها و ...) را حتی اگر
 *     کتابخانه‌ای آن را اضافه کرده باشد، با tools:node="remove" حذف می‌کند.
 *     این کار پیغام «App can request access to sensitive data» را برطرف می‌کند.
 *  ۲) usesCleartextTraffic را خاموش می‌کند (ارتباط فقط امن/HTTPS).
 *  ۳) compileSdk/targetSdk = 35 (اندروید ۱۵) و minSdk = 23 می‌گذارد تا روی
 *     دستگاه‌های جدید (مثل Galaxy A35 / Android 15) بدون اخطار سازگاری نصب شود.
 *  ۴) versionCode و versionName را برای انتشار نسخه‌ی جدید بالا می‌برد.
 * ------------------------------------------------------------
 */
const fs = require("fs");

function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; }
function write(p, s) { fs.writeFileSync(p, s); console.log("✏️  به‌روزرسانی شد:", p); }

/* فهرست دسترسی‌های حساسی که هرگز نباید در اپ باشند (در صورت وجود حذف می‌شوند) */
const SENSITIVE = [
  "android.permission.READ_SMS",
  "android.permission.SEND_SMS",
  "android.permission.RECEIVE_SMS",
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_PHONE_NUMBERS",
  "android.permission.CALL_PHONE",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.QUERY_ALL_PACKAGES",
  "android.permission.REQUEST_INSTALL_PACKAGES",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.GET_ACCOUNTS",
  "android.permission.READ_CALENDAR",
  "android.permission.WRITE_CALENDAR",
  "android.permission.BODY_SENSORS",
  "android.permission.BIND_ACCESSIBILITY_SERVICE",
];

/* ۱ و ۲) اصلاح AndroidManifest.xml */
const MANIFEST = "android/app/src/main/AndroidManifest.xml";
let mf = read(MANIFEST);
if (mf) {
  // xmlns:tools اضافه شود
  if (mf.indexOf("xmlns:tools") === -1) {
    mf = mf.replace(/<manifest(\s+)xmlns:android="http:\/\/schemas\.android\.com\/apk\/res\/android"/,
      '<manifest$1xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"');
  }
  // حذف هر uses-permission حساس از خود مانیفست
  SENSITIVE.forEach((perm) => {
    const re = new RegExp('\\s*<uses-permission[^>]*android:name="' + perm.replace(/\./g, "\\.") + '"[^>]*/?>', "g");
    mf = mf.replace(re, "");
  });
  // usesCleartextTraffic = false روی <application>
  if (/android:usesCleartextTraffic="[^"]*"/.test(mf)) {
    mf = mf.replace(/android:usesCleartextTraffic="[^"]*"/, 'android:usesCleartextTraffic="false"');
  } else {
    mf = mf.replace(/<application\b/, '<application\n        android:usesCleartextTraffic="false"');
  }
  // بلوک حذف‌کننده‌ی دسترسی‌های حساس (حتی اگر کتابخانه‌ای آن‌ها را merge کند)
  const blockers = "\n" + SENSITIVE.map((p) =>
    '    <uses-permission android:name="' + p + '" tools:node="remove" />').join("\n") + "\n";
  if (mf.indexOf('tools:node="remove"') === -1) {
    mf = mf.replace(/<\/manifest>\s*$/, blockers + "</manifest>\n");
  }
  // اطمینان از وجود فقط دسترسی اینترنت
  if (mf.indexOf("android.permission.INTERNET") === -1) {
    mf = mf.replace(/<\/manifest>\s*$/, '    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n');
  }
  // دیپ‌لینک برای بازگشت‌های گوگل/اینستاگرام/اشتراک (pacto://...)
  if (mf.indexOf('android:scheme="pacto"') === -1) {
    const deeplink =
      '\n            <intent-filter>\n' +
      '                <action android:name="android.intent.action.VIEW" />\n' +
      '                <category android:name="android.intent.category.DEFAULT" />\n' +
      '                <category android:name="android.intent.category.BROWSABLE" />\n' +
      '                <data android:scheme="pacto" />\n' +
      '            </intent-filter>\n        ';
    mf = mf.replace(/<\/activity>/, deeplink + '</activity>');
  }
  write(MANIFEST, mf);
} else {
  console.log("⚠️  AndroidManifest.xml پیدا نشد (آیا cap sync اجرا شده؟)");
}

/* ۳) تنظیم SDK در variables.gradle */
const VARS = "android/variables.gradle";
let vg = read(VARS);
if (vg) {
  vg = vg.replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 23")
         .replace(/compileSdkVersion\s*=\s*\d+/, "compileSdkVersion = 35")
         .replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 35");
  write(VARS, vg);
} else {
  console.log("⚠️  variables.gradle پیدا نشد");
}

/* ۴) versionCode / versionName از package.json خوانده می‌شود (۲.۰.۰ → کد ۲۰۰۰۰) تا روی نسخه‌ی قبلی به‌روز شود */
const APPG = "android/app/build.gradle";
let ag = read(APPG);
if (ag) {
  const ver = String(JSON.parse(fs.readFileSync("package.json", "utf8")).version || "2.0.0");
  const [ma, mi, pa] = ver.split(".").map((n) => parseInt(n, 10) || 0);
  const code = Math.max(3, ma * 10000 + mi * 100 + pa);
  ag = ag.replace(/versionCode\s+\d+/, "versionCode " + code)
         .replace(/versionName\s+"[^"]*"/, 'versionName "' + ver + '"');
  write(APPG, ag);
  console.log("نسخه:", ver, "کد:", code);
} else {
  console.log("⚠️  app/build.gradle پیدا نشد");
}

/* ۵) پشتیبان‌گیری خودکار خاموش: توکن ورود و رمز قفل از راه بکاپ دستگاه بیرون نمی‌رود */
mf = read(MANIFEST);
if (mf) {
  if (/android:allowBackup="[^"]*"/.test(mf)) mf = mf.replace(/android:allowBackup="[^"]*"/, 'android:allowBackup="false"');
  else mf = mf.replace(/<application\b/, '<application\n        android:allowBackup="false"');
  if (mf.indexOf("android:fullBackupContent") === -1 && mf.indexOf("android:dataExtractionRules") === -1) {
    mf = mf.replace(/<application\b/, '<application\n        android:fullBackupContent="false"');
  }
  write(MANIFEST, mf);
}

/* ۶) اندروید ۱۵ (targetSdk 35) صفحه را زیر نوار وضعیت و نوار پایین می‌برد؛
      با این گزینه اپ بین دو نوار می‌ماند و چیزی زیر ساعت یا دکمه‌های پایین نمی‌رود */
const STYLES = "android/app/src/main/res/values/styles.xml";
let st = read(STYLES);
if (st && st.indexOf("windowOptOutEdgeToEdgeEnforcement") === -1) {
  if (st.indexOf("xmlns:tools") === -1) st = st.replace(/<resources\b/, '<resources xmlns:tools="http://schemas.android.com/tools"');
  st = st.replace(/(<style\s+name="AppTheme\.NoActionBar(?:Launch)?"[^>]*>)/g,
    '$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement" tools:targetApi="35">true</item>');
  write(STYLES, st);
}

console.log("✅ ایمن‌سازی اندروید کامل شد.");
