/* 点一下才把线上 App 挂进 iframe。
   不自动加载有两个原因：它是个 PWA，进来就会注册 Service Worker、
   拉离线缓存；而且 iframe 里那一屏很高，自动跑起来会抢走页面的滚动。 */
(() => {
  const btn = document.getElementById('nrRun');
  const ph = document.getElementById('nrPlaceholder');
  if (!btn || !ph) return;

  const SRC = 'https://1367877593-ops.github.io/Night-repair-App/';

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = '载入中…';

    const frame = document.createElement('iframe');
    frame.src = SRC;
    frame.title = '夜后修复 Night Repair 线上版本';
    frame.loading = 'lazy';
    /* 允许它写自己的 IndexedDB 和弹权限询问，但不给顶层跳转 */
    frame.setAttribute('allow', 'clipboard-write; notifications');
    frame.addEventListener('load', () => { btn.textContent = '✓ 已载入'; }, { once: true });

    ph.replaceWith(frame);
  }, { once: true });
})();
