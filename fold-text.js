/* React Bits FoldText 的原生站点适配版。
   保留现有标题的字体、字号、位置与 color，只负责按字符折叠展开。 */
(function () {
  'use strict';

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const titles = [...document.querySelectorAll('.head h2:not([data-fold-ignore])')];

  if (!titles.length) return;

  /* 依赖未加载时保留原始标题，不让增强效果影响可用性。 */
  if (!gsap || !ScrollTrigger) {
    document.documentElement.classList.add('fold-text-fallback');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? .18 : .65;
  const stagger = reduced ? .012 : .045;
  const rotateX = reduced ? 0 : -92;
  const crease = reduced ? 0 : .55;

  const makePiece = (char, index) => {
    const segment = document.createElement('span');
    segment.className = 'fold-text-segment';
    segment.style.setProperty('--fold-perspective', '700px');

    const piece = document.createElement('span');
    piece.className = 'fold-text-piece';
    piece.dataset.foldHinge = 'top';
    piece.dataset.foldIndex = String(index);
    piece.style.transformOrigin = '50% 0%';
    piece.style.setProperty('--fold-crease', '0');
    piece.textContent = char;
    segment.appendChild(piece);
    return segment;
  };

  const buildTitle = title => {
    const text = title.textContent.trim();
    const visual = document.createElement('span');
    visual.className = 'fold-text-visual';
    visual.setAttribute('aria-hidden', 'true');

    let pieceIndex = 0;
    text.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        const whitespace = document.createElement('span');
        whitespace.className = 'fold-text-whitespace';
        whitespace.textContent = ' ';
        visual.appendChild(whitespace);
        return;
      }

      const word = document.createElement('span');
      word.className = 'fold-text-word';
      Array.from(part).forEach(char => {
        word.appendChild(makePiece(char, pieceIndex));
        pieceIndex += 1;
      });
      visual.appendChild(word);
    });

    title.textContent = '';
    title.classList.add('fold-text');
    title.setAttribute('aria-label', text);
    title.appendChild(visual);

    const pieces = [...title.querySelectorAll('.fold-text-piece')];
    if (reduced) {
      gsap.set(pieces, { opacity: 1, rotateX: 0, '--fold-crease': 0 });
      return;
    }

    gsap.set(pieces, {
      opacity: 0,
      rotateX,
      rotateY: 0,
      '--fold-crease': crease,
      transformOrigin: '50% 0%',
      force3D: true
    });

    ScrollTrigger.create({
      trigger: title,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        title.classList.add('is-unfolding');
        gsap.to(pieces, {
          opacity: 1,
          rotateX: 0,
          rotateY: 0,
          '--fold-crease': 0,
          duration,
          ease: 'power3.out',
          stagger,
          clearProps: 'willChange',
          onComplete: () => title.classList.remove('is-unfolding')
        });
      }
    });
  };

  titles.forEach(buildTitle);
  requestAnimationFrame(() => ScrollTrigger.refresh());
})();
