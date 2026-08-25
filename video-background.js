(() => {
  const body = document.body;
  const script = document.currentScript;
  if (!body || !script || body.classList.contains('video-bg-page')) return;

  body.classList.add('video-bg-page');

  const layer = document.createElement('div');
  layer.className = 'video-background';
  layer.setAttribute('aria-hidden', 'true');

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = new URL('assets/video-background.mp4', script.src).href;

  const reveal = () => layer.classList.add('is-ready');
  video.addEventListener('loadeddata', reveal, { once: true });
  video.addEventListener('canplay', reveal, { once: true });

  layer.append(video);
  body.prepend(layer);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) {
    video.addEventListener('loadeddata', () => video.pause(), { once: true });
  } else {
    video.play().catch(() => {});
  }
})();
