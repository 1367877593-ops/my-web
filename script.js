const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/* 把 p 在 [a,b] 区间归一到 0→1，区间外夹紧 */
const seg = (p, a, b) => clamp((p - a) / (b - a));
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

/* ── 开场遮罩：视频可播即开始退场，最长兜底 3.5s ─────────────
   退场动画 2s（融合 1.05s → 闪光 → 镂空放大 0.95s），跑完移除节点。 */
const intro = document.getElementById('intro');
const heroVids = [...document.querySelectorAll('.hero-media video')], heroVideo = heroVids[0];
let introDone = false;
function exitIntro() {
  if (introDone || !intro) return;
  introDone = true;
  if (reduced) { intro.classList.add('gone'); return; }
  intro.classList.add('exit');
  setTimeout(() => intro.classList.add('gone'), 2050);
}
/* 至少露脸 600ms，否则秒开时开场一闪而过反而像闪屏 */
const readyToExit = () => setTimeout(exitIntro, 600);
if (heroVideo) {
  if (heroVideo.readyState >= 3) readyToExit();
  else { heroVideo.addEventListener('canplay', readyToExit, { once: true }); heroVideo.addEventListener('error', readyToExit, { once: true }); }
} else addEventListener('load', readyToExit);
setTimeout(exitIntro, 3500);

/* ── 顶栏 + 右侧刻度尺 ─────────────────────────────────────── */
const topbar = document.getElementById('topbar'), rail = document.getElementById('rail');
const TICKS = 34;
if (rail) for (let i = 0; i < TICKS; i++) rail.appendChild(document.createElement('i'));
const railTicks = rail ? [...rail.children] : [];

/* ── 首屏三阶段滚动插值 ────────────────────────────────────── */
const track = document.querySelector('.hero-track'), stage = document.getElementById('heroStage'),
  media = document.getElementById('heroMedia'), word = document.querySelector('.hero-word'),
  mqA = document.querySelector('.mq-a'), mqB = document.querySelector('.mq-b'),
  corners = [...document.querySelectorAll('.hero-corner')],
  signPath = document.getElementById('signPath');

let signLen = 0;
if (signPath) { signLen = signPath.getTotalLength(); signPath.style.setProperty('--len', signLen); }

/* 终态卡片尺寸：横向卡，窄屏放宽占比，高度按 0.62 比例走，避免变成竖条 */
const cardW = () => innerWidth < 700 ? innerWidth * .82 : clamp(innerWidth * .46, 280, 620);
const cardH = () => cardW() * .62;

/* 起始尺寸：宽屏满屏；窄屏只占 62vh —— 16:9 素材铺满竖屏会把人脸裁到只剩五官 */
const startH = () => innerWidth < 700 ? innerHeight * .62 : innerHeight;

function paintHero(p) {
  if (!media) return;
  const shrink = easeInOut(seg(p, .05, .62));
  media.style.width = lerp(innerWidth, cardW(), shrink) + 'px';
  media.style.height = lerp(startH(), cardH(), shrink) + 'px';
  media.style.borderRadius = lerp(0, 18, shrink) + 'px';

  const wOut = seg(p, 0, .4);
  if (word) { word.style.opacity = 1 - wOut; word.style.transform = `translate(-50%,-50%) scale(${lerp(1, 1.18, wOut)})`; }

  const mIn = seg(p, .3, .58);
  const push = lerp(0, 240, seg(p, .3, 1));
  if (mqA) { mqA.style.opacity = mIn; mqA.style.transform = `translateX(${-push}px)`; }
  if (mqB) { mqB.style.opacity = mIn; mqB.style.transform = `translateX(${push}px)`; }

  const cOut = 1 - seg(p, 0, .22);
  corners.forEach(c => c.style.opacity = cOut);

  if (signPath) signPath.style.strokeDashoffset = signLen * (1 - seg(p, .62, .98));
}

function onScrollFrame() {
  topbar?.classList.toggle('scrolled', scrollY > 60);

  if (track) {
    const span = track.offsetHeight - innerHeight;
    paintHero(span > 0 ? clamp((scrollY - track.offsetTop) / span) : 1);
  }

  const total = document.documentElement.scrollHeight - innerHeight;
  const prog = total > 0 ? clamp(scrollY / total) : 0;
  const lit = Math.round(prog * TICKS);
  railTicks.forEach((t, i) => t.classList.toggle('on', i < lit));
}

let ticking = false;
const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScrollFrame(); }); } };
addEventListener('scroll', requestFrame, { passive: true });
addEventListener('resize', requestFrame);
onScrollFrame();

/* ── 首屏视频双轨交叉淡入，盖掉循环跳帧 ─────────────────────── */
const XFADE = .7, play = v => { const r = v.play(); if (r) r.catch(() => { }); },
  setOp = (a, b, t) => { a.style.opacity = String(1 - t); b.style.opacity = String(t); };
if (reduced) { heroVids.forEach(v => { v.removeAttribute('autoplay'); v.pause(); }); if (heroVideo) heroVideo.style.opacity = '1'; }
else if (heroVids.length === 2) {
  let cur = 0;
  heroVids.forEach(v => { v.muted = true; v.removeAttribute('loop'); });
  setOp(heroVids[0], heroVids[1], 0);
  play(heroVideo);
  const step = () => {
    const a = heroVids[cur], b = heroVids[1 - cur], d = a.duration;
    if (d > XFADE) {
      const left = d - a.currentTime;
      if (left <= XFADE) {
        if (b.paused) { b.currentTime = 0; play(b); }
        /* 接班的确实在走才交接，两条不透明度之和恒为 1 */
        if (!b.paused && b.currentTime > 0) setOp(a, b, Math.min(1, (XFADE - left) / XFADE));
        if (left <= .06 && !b.paused && b.currentTime > 0) { a.pause(); a.currentTime = 0; setOp(a, b, 1); cur = 1 - cur; }
      }
    }
    requestAnimationFrame(step);
  };
  heroVids.forEach(v => v.addEventListener('ended', () => { if (heroVids[1 - cur].paused) { v.currentTime = 0; play(v); setOp(v, heroVids[1 - cur], 0); } }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) heroVids.forEach(v => { if (!v.paused) play(v); }); });
  requestAnimationFrame(step);
}
else if (heroVideo) play(heroVideo);

/* ── 能力：3D coverflow ────────────────────────────────────── */
const flowStage = document.getElementById('flowStage'), flowDots = document.getElementById('flowDots');
if (flowStage) {
  const cards = [...flowStage.children], n = cards.length;
  let active = 0;
  cards.forEach((_, i) => { const d = document.createElement('i'); d.addEventListener('click', () => go(i)); flowDots.appendChild(d); });
  const dots = [...flowDots.children];
  function paintFlow() {
    cards.forEach((c, i) => {
      let off = i - active;
      if (off > n / 2) off -= n;
      if (off < -n / 2) off += n;
      const a = Math.abs(off);
      c.style.transform = `translate(-50%,-50%) translateX(${off * 58}%) translateZ(${-a * 170}px) rotateY(${-off * 26}deg) scale(${1 - a * .07})`;
      c.style.opacity = a > 2 ? 0 : a === 0 ? 1 : a === 1 ? .55 : .22;
      c.style.filter = a === 0 ? 'none' : `blur(${a * 3}px)`;
      c.style.zIndex = String(20 - a);
      c.setAttribute('aria-hidden', a === 0 ? 'false' : 'true');
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === active));
  }
  const go = i => { active = (i + n) % n; paintFlow(); };
  document.querySelector('.flow-nav.prev').addEventListener('click', () => go(active - 1));
  document.querySelector('.flow-nav.next').addEventListener('click', () => go(active + 1));
  document.getElementById('flow').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') go(active - 1);
    if (e.key === 'ArrowRight') go(active + 1);
  });
  paintFlow();
}

/* ── 项目：堆叠卡组 ────────────────────────────────────────── */
const deck = document.getElementById('deck'), deckIdx = document.getElementById('deckIdx');
if (deck) {
  const cards = [...deck.children], n = cards.length;
  let top = 0;
  function paintDeck() {
    cards.forEach((c, i) => {
      const off = (i - top + n) % n;
      c.style.transform = `translate(${off * 12}px,${off * 16}px) scale(${1 - off * .045})`;
      c.style.opacity = off > 2 ? 0 : 1;
      c.style.zIndex = String(n - off);
      c.style.pointerEvents = off === 0 ? 'auto' : 'none';
      c.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
    });
    deckIdx.textContent = String(top + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
  }
  const cycle = d => { top = (top + d + n) % n; paintDeck(); };
  /* 点卡片本身翻页，但别抢走卡内链接的点击 */
  deck.addEventListener('click', e => { if (!e.target.closest('a')) cycle(1); });
  document.querySelector('.deck-nav.prev').addEventListener('click', e => { e.stopPropagation(); cycle(-1); });
  document.querySelector('.deck-nav.next').addEventListener('click', e => { e.stopPropagation(); cycle(1); });
  paintDeck();
}

/* ── 入场 ──────────────────────────────────────────────────── */
if (!reduced) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: .08, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.head,.about-grid,.flow,.deck,.group-label,.co-grid,.contact-title,.contact-list').forEach(el => { el.classList.add('reveal'); io.observe(el); });
}
