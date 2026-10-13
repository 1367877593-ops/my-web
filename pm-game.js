/* 点击后才载入独立线上游戏，避免提前下载素材或进入存档。 */
(() => {
  const button = document.getElementById('pgRun');
  const placeholder = document.getElementById('pgPlaceholder');
  const status = document.getElementById('pgStatus');
  if (!button || !placeholder || !status) return;

  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = '正在载入游戏…';
    status.textContent = '正在打开线上游戏，请稍候。';

    const frame = document.createElement('iframe');
    frame.title = '出海产品经理 · 从 0 到 1 线上游戏';
    frame.src = button.dataset.appUrl;
    frame.allowFullscreen = true;
    frame.addEventListener('load', () => {
      button.textContent = '✓ 游戏已载入';
      status.textContent = '可在下方继续故事；单独打开线上版本可使用更大的画面。';
    }, { once: true });

    placeholder.replaceWith(frame);
  }, { once: true });
})();
