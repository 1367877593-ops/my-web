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

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const allNotes = Array.isArray(window.NOTES) ? window.NOTES : [];

/* ── START HERE：三个固定角色槽位，picks 里没填的渲染成虚线空槽 ── */
const picksBox = document.getElementById('picks');
if (picksBox) {
  const ROLES = [
    { key: 'sharp', label: '最锋利的观点', hint: '一篇敢下判断的文章，承担「立场」。' },
    { key: 'deep', label: '最硬的拆解', hint: '一篇有分析垫底的拆解，承担「能力」。' },
    { key: 'human', label: '最有人味的', hint: '一篇生活切片，承担「温度」。' }
  ];
  const picks = (window.PICKS && typeof window.PICKS === 'object') ? window.PICKS : {};
  picksBox.innerHTML = ROLES.map(r => {
    const slug = picks[r.key];
    const n = slug && allNotes.find(x => x.slug === slug);
    if (!n) return `<div class="pick empty"><small>${r.label}</small><p class="slot"><b>待填充</b>${r.hint}</p></div>`;
    return `<a class="pick" href="notes/${esc(n.slug)}.html"><small>${r.label}</small><h3>${esc(n.title)}</h3>${n.excerpt ? `<p>${esc(n.excerpt)}</p>` : ''}<em>${n.tag ? esc(n.tag) + ' · ' : ''}${esc(n.date)}</em></a>`;
  }).join('');
}

/* ── NOTES：固定四分类筛选 + 列表，首页取前 N 条，列表页取全部 ──
   分类按钮来自 notes.js 的 CATEGORIES，一篇文章都没有时也照常显示，
   让四类框架本身成为「这个站会写什么」的说明。 */
const notesList = document.getElementById('notesList');
if (notesList) {
  const limit = Number(notesList.dataset.limit) || Infinity;
  const more = document.getElementById('notesMore');
  const emptyBox = document.getElementById('notesEmpty');
  const cats = document.getElementById('cats');
  const CATS = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  const countOf = tag => allNotes.filter(n => n.tag === tag).length;
  /* 计数为 0 时不显示角标，避免空站上挂一排 0 */
  const badge = n => n ? ` <i>${n}</i>` : '';

  const apply = tag => {
    const list = tag ? allNotes.filter(n => n.tag === tag) : allNotes;
    const shown = list.slice(0, limit);
    notesList.hidden = !shown.length;
    if (emptyBox) {
      emptyBox.hidden = !!shown.length;
      if (!shown.length) emptyBox.querySelector('p').textContent = tag ? '这个分类还在攒。' : '第一篇正在写。';
    }
    if (shown.length) notesList.innerHTML = shown.map(n => `<a class="note" href="notes/${esc(n.slug)}.html">
<time>${esc(n.date)}</time>
<div><h3>${esc(n.title)}</h3>${n.excerpt ? `<p>${esc(n.excerpt)}</p>` : ''}</div>
<div class="tail">${n.tag ? `<em>${esc(n.tag)}</em>` : ''}<i>↗</i></div></a>`).join('');
    if (more) more.hidden = list.length <= shown.length;
  };

  if (cats && CATS.length) {
    cats.innerHTML = `<button class="on" data-tag="">全部${badge(allNotes.length)}</button>` +
      CATS.map(t => `<button data-tag="${esc(t)}">${esc(t)}${badge(countOf(t))}</button>`).join('');
    cats.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      [...cats.children].forEach(x => x.classList.toggle('on', x === b));
      apply(b.dataset.tag);
    });
  }
  apply('');
}

/* ── 文章页阅读进度条 ─────────────────────────────────────── */
const artProg = document.querySelector('.artprog');
if (artProg) {
  const paintProg = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    artProg.style.width = (total > 0 ? clamp(scrollY / total) * 100 : 0) + '%';
  };
  addEventListener('scroll', paintProg, { passive: true });
  addEventListener('resize', paintProg);
  paintProg();
}

/* ── AIGC 作品集：系列筛选 + 网格 + 灯箱 ──────────────────────
   数据来自 aigc.js。网格里只挂缩略图，原件（尤其视频）等点开才建标签，
   否则一屏十几条 mp4 会同时开始缓冲。 */
const aigcGrid = document.getElementById('aigcGrid');
if (aigcGrid) {
  const works = Array.isArray(window.AIGC_WORKS) ? window.AIGC_WORKS : [];
  const SERIES = Array.isArray(window.AIGC_SERIES) ? window.AIGC_SERIES : [];
  const FORMATS = Array.isArray(window.AIGC_FORMATS) ? window.AIGC_FORMATS : [];
  const fmtRow = document.getElementById('aigcFormats');
  const cats = document.getElementById('aigcCats');
  const emptyBox = document.getElementById('aigcEmpty');
  const lb = document.getElementById('lightbox');
  const lbMedia = document.getElementById('lbMedia');
  const lbCap = document.getElementById('lbCap');
  const countType = t => works.filter(w => w.type === t).length;
  /* 空的格式/系列一律当「全部」讲，两级都能落在全部上 */
  const countIn = (t, series) => works.filter(w => (!t || w.type === t) && (!series || w.series === series)).length;
  const labelOf = t => t ? ((FORMATS.find(f => f.type === t) || {}).label || '') : '作品';
  const badge = n => n ? ` <i>${n}</i>` : '';
  const thumbOf = w => w.thumb || w.poster || w.src;

  let view = works;  /* 当前筛选结果，灯箱只在这一份里前后翻 */
  let at = 0;
  let curFormat = '';  /* 一级，空 = 不限格式 */
  let curSeries = '';  /* 二级，空 = 该格式下全部 */

  const paint = () => {
    view = works.filter(w => (!curFormat || w.type === curFormat) && (!curSeries || w.series === curSeries));
    aigcGrid.hidden = !view.length;
    if (emptyBox) {
      emptyBox.hidden = !!view.length;
      if (!view.length) emptyBox.querySelector('p').textContent =
        !works.length ? '作品正在整理，很快放上来。'
        : curSeries ? `「${curSeries}」下还没有${labelOf(curFormat)}。`
        : `${labelOf(curFormat)}还在整理。`;
    }
    if (!view.length) { aigcGrid.innerHTML = ''; return; }
    aigcGrid.innerHTML = view.map((w, i) => `<button class="shot${w.wide ? ' wide' : ''}" type="button" data-i="${i}">
<img src="${esc(thumbOf(w))}" alt="${esc(w.title)}" loading="lazy" decoding="async">
${w.type === 'video' ? '<i class="shot-play" aria-hidden="true">▶</i>' : ''}
<span class="shot-meta"><b>${esc(w.title)}</b><em>${esc(w.series || '')}</em></span></button>`).join('');
  };

  /* 二级要重画，不能只切 on —— 换了格式，系列旁边的计数就变了 */
  const paintSeriesRow = () => {
    if (!cats) return;
    cats.innerHTML = `<button class="${curSeries ? '' : 'on'}">全部${badge(countIn(curFormat, ''))}</button>` +
      SERIES.map(s => `<button data-series="${esc(s)}"${curSeries === s ? ' class="on"' : ''}>${esc(s)}${badge(countIn(curFormat, s))}</button>`).join('');
  };

  if (fmtRow && FORMATS.length) {
    fmtRow.innerHTML = `<button class="on">全部${badge(works.length)}</button>` +
      FORMATS.map(f => `<button data-format="${esc(f.type)}">${esc(f.label)}${badge(countType(f.type))}</button>`).join('');
    fmtRow.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || (b.dataset.format || '') === curFormat) return;
      curFormat = b.dataset.format || '';
      curSeries = '';  /* 换格式就把系列收回「全部」，否则会停在一个空结果上 */
      fmtRow.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      paintSeriesRow();
      paint();
    });
  }
  if (cats && SERIES.length) {
    cats.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      curSeries = b.dataset.series || '';
      cats.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      paint();
    });
  }
  paintSeriesRow();
  paint();

  /* ── 灯箱 ── */
  if (lb && lbMedia && lbCap) {
    let opener = null;  /* 关掉之后焦点还回原来那张卡片 */
    const openAt = i => {
      if (!view.length) return;
      at = (i + view.length) % view.length;
      const w = view[at];
      lbMedia.innerHTML = w.type === 'video'
        /* 静音自动播放才不会被浏览器拦，想听声音自己点开控件 */
        ? `<video src="${esc(w.src)}"${w.poster ? ` poster="${esc(w.poster)}"` : ''} controls autoplay muted loop playsinline></video>`
        : `<img src="${esc(w.src)}" alt="${esc(w.title)}">`;
      lbCap.innerHTML = `<span class="lb-idx">${String(at + 1).padStart(2, '0')} / ${String(view.length).padStart(2, '0')}</span>
<h3>${esc(w.title)}</h3>
<em>${[w.series, w.date].filter(Boolean).map(esc).join(' · ')}</em>
${w.note ? `<p>${esc(w.note)}</p>` : ''}
${w.prompt ? `<details><summary>PROMPT</summary><p>${esc(w.prompt)}</p></details>` : ''}`;
      lb.hidden = false;
      document.body.classList.add('lb-open');
    };
    const closeLb = () => {
      lb.hidden = true;
      lbMedia.innerHTML = '';  /* 清空才会真的停下正在播的视频 */
      document.body.classList.remove('lb-open');
      opener?.focus();
    };

    aigcGrid.addEventListener('click', e => {
      const card = e.target.closest('.shot');
      if (!card) return;
      opener = card;
      openAt(Number(card.dataset.i));
    });
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', () => openAt(at - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => openAt(at + 1));
    /* 点空白处关掉，但别把点在图片/说明上的也算进来 */
    lb.addEventListener('click', e => { if (e.target === lb || e.target === lbMedia) closeLb(); });
    addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') openAt(at - 1);
      else if (e.key === 'ArrowRight') openAt(at + 1);
    });
  }
}

/* ── 入场 ──────────────────────────────────────────────────── */
if (!reduced) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: .08, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.head,.about-grid,.flow,.deck,.group-label,.co-grid,.contact-title,.contact-list').forEach(el => { el.classList.add('reveal'); io.observe(el); });
}
