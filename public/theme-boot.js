// پیش از اولین رنگ‌آمیزی اجرا می‌شود تا صفحه با پوسته‌ی درست بالا بیاید (بدون پرش روشن/تیره)
(function () {
  try {
    var t = localStorage.getItem('pacto_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
