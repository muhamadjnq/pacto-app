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

/* ۴) بالا بردن versionCode / versionName در app/build.gradle */
const APPG = "android/app/build.gradle";
let ag = read(APPG);
if (ag) {
  ag = ag.replace(/versionCode\s+\d+/, "versionCode 2")
         .replace(/versionName\s+"[^"]*"/, 'versionName "1.0.1"');
  write(APPG, ag);
} else {
  console.log("⚠️  app/build.gradle پیدا نشد");
}

console.log("✅ ایمن‌سازی اندروید کامل شد.");
