/* ============================================================
   契合 · 合同审查 / 生成 Demo 的交互。

   数据来自 qihe-data.js —— 那是**手写的样例数据**，不是模型导出的
   真实结果（原因见该文件头部注释）。页面上已如实标注。

   为什么做成「选立场再跑」而不是直接铺结果：审查立场是这个产品里
   最能说明问题的功能。同一份租赁合同，站甲方看 78 分、站乙方看 41 分，
   风险清单也不一样 —— 一次性把结果拍出来，这层价值就看不见了。

   点风险跳原文并闪烁高亮，对应 App 里真实存在的定位功能。
   ============================================================ */
(() => {
  const D = window.QIHE_DEMO;
  if (!D) return;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const LV = { high: '高风险', mid: '中风险', low: '低风险' };
  const PN = Object.fromEntries(D.perspectives.map(p => [p.id, p.name]));

  /* ---------- 内置功能 ---------- */
  const CAPS = [
    ['文件解析', '上传 PDF / DOCX / TXT，后端抽取纯文本后再进模型。单文件上限 20MB，类型不在白名单直接拒绝。'],
    ['条款切分', '把合同切成带编号的条款块，后续每条风险都绑定到具体的块，不是笼统地说「这份合同有风险」。'],
    ['立场化审查', '甲方 / 乙方 / 中立三种立场。立场会写进 Prompt，同一份合同换立场，风险清单和评分都会变。'],
    ['风险分级', '每条风险给出高 / 中 / 低等级，整体等级由最高的单项推导，不让模型直接拍一个总分。'],
    ['原文定位', '每条风险附原文摘录与字符偏移，App 里点风险可跳转到对应段落并高亮 —— 理由要能指回原文。'],
    ['修改建议', '不只说「有风险」，还给出可直接替换的条款文本，以及援引的法条。'],
    ['缺失条款识别', '不仅审已有条款，也识别该有而没有的（如权属担保、验收标准），这类往往比写错的条款更致命。'],
    ['合同生成', '给出要素即生成草案，未确定的字段以占位符标出，附待补充清单和签署前检查项。'],
    ['异步任务', '审查是长任务，走 job 队列。App 轮询真实进度（parsing / analyzing / formatting），不是前端假进度条。'],
    ['结构化兜底', '模型返回的 JSON 会被校验；格式不对或出现「绝对安全」这类话术，走降级路径而不是把原文透传给用户。'],
    ['Word 导出', '审查报告和合同草案都可导出 Word，走系统分享面板。'],
    ['积分与内购', '审查 / 生成按次扣积分，任务成功才扣、按 job_id 幂等。接了激活码和 StoreKit。'],
  ];
  $('qCaps').innerHTML = CAPS.map(([t, d]) =>
    `<div class="dcap"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('');

  /* ============================================================
     合同审查 Demo
     ============================================================ */
  let curSample = D.samples[0];
  let curPersp = 'party_b';
  let reviewed = false;

  /* ---------- 控制区 ---------- */
  $('qSamples').innerHTML = D.samples.map((s, i) =>
    `<button class="qchip${i === 0 ? ' on' : ''}" type="button" data-s="${esc(s.id)}">
<b>${esc(s.name)}</b><span>${esc(s.tag)} · ${esc(s.meta)}</span></button>`).join('');

  $('qPersp').innerHTML = D.perspectives.map(p =>
    `<button class="qsegb${p.id === curPersp ? ' on' : ''}" type="button" data-p="${esc(p.id)}"
title="${esc(p.hint)}">${esc(p.name)}</button>`).join('');

  const perspHint = () => {
    const p = D.perspectives.find(x => x.id === curPersp);
    const roles = curSample.id === 'lease' ? { party_a: '出租方', party_b: '承租方' } : { party_a: '委托方', party_b: '开发方' };
    return curPersp === 'neutral' ? p.hint : `站在${roles[curPersp]}（${p.name}）角度，找对自己不利的条款`;
  };
  const paintHint = () => { $('qHint').textContent = perspHint(); };
  paintHint();

  /* ---------- 运行日志 ---------- */
  const logLines = () => {
    const n = curSample.risks.filter(r => r.views[curPersp]).length;
    const hi = curSample.risks.filter(r => r.views[curPersp]?.level === 'high').length;
    const miss = curSample.risks.filter(r => r.views[curPersp] && !r.excerpt).length;
    return [
      ['POST /api/jobs/review-jobs', `mode=review　perspective=${curPersp}`],
      ['parsing', `解析《${curSample.name}》，切出 ${curSample.blocks.length} 个条款块`],
      ['analyzing', `${PN[curPersp]}立场审查，逐条判定并绑定原文偏移`],
      ['formatting', `结构化输出：${n} 条风险，其中高风险 ${hi} 条、缺失条款 ${miss} 条`],
      ['done', `综合评分 ${curSample.scores[curPersp]} / 100，整体 ${LV[curSample.overall[curPersp]]}`],
    ];
  };

  /* ---------- 原文渲染（把风险摘录包成可高亮的 mark） ---------- */
  const renderDoc = () => {
    const byBlock = {};
    curSample.risks
      .filter(r => r.views[curPersp] && r.block && r.excerpt)
      .forEach(r => { (byBlock[r.block] = byBlock[r.block] || []).push(r); });

    return curSample.blocks.map(b => {
      const hits = (byBlock[b.id] || [])
        .map(r => ({ r, i: b.text.indexOf(r.excerpt) }))
        .filter(x => x.i >= 0)
        .sort((x, y) => x.i - y.i);

      let html = '', pos = 0;
      hits.forEach(({ r, i }) => {
        if (i < pos) return;                       // 摘录重叠，后一条让位
        html += esc(b.text.slice(pos, i));
        html += `<mark class="qmark ${r.views[curPersp].level}" id="mk-${esc(r.id)}">${esc(r.excerpt)}</mark>`;
        pos = i + r.excerpt.length;
      });
      html += esc(b.text.slice(pos));
      return `<div class="qblock" id="blk-${esc(b.id)}"><b>${esc(b.title)}</b><p>${html}</p></div>`;
    }).join('');
  };

  /* ---------- 风险清单 ---------- */
  const riskRow = r => {
    const v = r.views[curPersp];
    return `<details class="qrisk ${v.level}" data-r="${esc(r.id)}">
<summary><em>${LV[v.level]}</em><span>${esc(r.title)}</span><u>${esc(r.clause_title)}</u></summary>
<div class="qrisk-b">
${r.excerpt
        ? `<blockquote>${esc(r.excerpt)}</blockquote>`
        : `<p class="qmiss">合同中未见相关条款 —— 这是「该有而没有」的缺失项</p>`}
<p><b>风险分析</b>${esc(v.analysis)}</p>
<p><b>修改建议</b>${esc(v.suggestion)}</p>
${v.replacement ? `<div class="qrep"><i>建议替换为</i><p>${esc(v.replacement)}</p></div>` : ''}
${r.basis.length ? `<div class="qbasis">${r.basis.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
</div></details>`;
  };

  /* ---------- 结果区 ---------- */
  const renderReview = () => {
    const list = curSample.risks.filter(r => r.views[curPersp]);
    const cnt = { high: 0, mid: 0, low: 0 };
    list.forEach(r => cnt[r.views[curPersp].level]++);
    const p = curSample.parties;
    const score = curSample.scores[curPersp];
    const ov = curSample.overall[curPersp];

    const metaRow = (k, v) => v ? `<div><i>${esc(k)}</i><span>${esc(v)}</span></div>` : '';

    return `
<div class="qhead ${ov}">
  <div class="qscore"><b>${score}</b><i>/ 100</i><em>${LV[ov]}</em></div>
  <div class="qcnt">
    <span class="high">高 ${cnt.high}</span><span class="mid">中 ${cnt.mid}</span><span class="low">低 ${cnt.low}</span>
    <u>${PN[curPersp]}立场</u>
  </div>
</div>
<p class="qsum">${esc(curSample.summary[curPersp])}</p>
<p class="qdisc">${esc(D.disclaimer)}</p>

<div class="dsub">主体信息<span>后端从原文抽取，未识别到的留空不猜</span></div>
<div class="qmeta">
${metaRow('合同类型', p.contract_type)}${metaRow('甲方', p.party_a)}${metaRow('乙方', p.party_b)}
${metaRow('金额', p.amount)}${metaRow('期限', p.term)}${metaRow('管辖', p.jurisdiction)}
</div>

<div class="dsub">风险清单与原文<span>点风险条目 → 左侧原文自动定位并高亮</span></div>
<div class="qpane">
  <div class="qdoc" id="qDoc">${renderDoc()}</div>
  <div class="qrisks" id="qRisks">${list.map(riskRow).join('')}</div>
</div>`;
  };

  /* ---------- 定位 + 闪烁高亮 ---------- */
  let flashTimer = null;
  const locate = id => {
    const doc = $('qDoc'), mk = $('mk-' + id);
    if (!doc || !mk) return;
    doc.querySelectorAll('.qmark.on').forEach(m => m.classList.remove('on'));
    /* 窄屏时两栏堆叠，原文面板没有独立滚动条，改成滚整页 */
    if (window.matchMedia('(max-width:900px)').matches) {
      mk.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      doc.scrollTo({ top: mk.offsetTop - doc.clientHeight / 2 + mk.clientHeight / 2, behavior: 'smooth' });
    }
    mk.classList.add('on');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => mk.classList.remove('on'), 2400);
  };

  const bindResult = () => {
    const risks = $('qRisks');
    if (!risks) return;
    risks.addEventListener('click', e => {
      const s = e.target.closest('summary');
      if (!s) return;
      const d = s.parentElement;
      /* details 的 open 状态在 click 后才翻转，这里按翻转后的值判断 */
      setTimeout(() => { if (d.open) locate(d.dataset.r); }, 0);
    });
  };

  const paintReview = () => {
    $('qOut').innerHTML = renderReview();
    bindResult();
  };

  /* ---------- 交互绑定 ---------- */
  $('qSamples').addEventListener('click', e => {
    const b = e.target.closest('.qchip');
    if (!b) return;
    $('qSamples').querySelectorAll('.qchip').forEach(x => x.classList.toggle('on', x === b));
    curSample = D.samples.find(s => s.id === b.dataset.s);
    paintHint();
    if (reviewed) { reviewed = false; $('qOut').hidden = true; $('qTerm').hidden = true; $('qRun').textContent = '▶ 开始审查'; }
  });

  $('qPersp').addEventListener('click', e => {
    const b = e.target.closest('.qsegb');
    if (!b) return;
    $('qPersp').querySelectorAll('.qsegb').forEach(x => x.classList.toggle('on', x === b));
    curPersp = b.dataset.p;
    paintHint();
    /* 已经跑过就即时重算 —— 立场切换带来的分数变化是这个 demo 的重点 */
    if (reviewed) paintReview();
  });

  $('qRun').addEventListener('click', async () => {
    const btn = $('qRun'), term = $('qTerm'), out = $('qOut');
    if (btn.dataset.busy) return;
    if (reviewed) { out.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    btn.dataset.busy = '1';
    btn.textContent = '审查中…';
    term.hidden = false;
    term.innerHTML = '';
    const lines = logLines();
    for (let i = 0; i < lines.length; i++) {
      const [step, note] = lines[i];
      const row = document.createElement('div');
      row.className = 'dline' + (i === lines.length - 1 ? ' done' : '');
      row.innerHTML = `<i>${i === lines.length - 1 ? '✓' : '▸'}</i><b>${esc(step)}</b><span>${esc(note)}</span>`;
      term.appendChild(row);
      await sleep(i === 0 ? 300 : 520);
    }
    await sleep(240);
    out.hidden = false;
    paintReview();
    btn.textContent = '↓ 看结果';
    delete btn.dataset.busy;
    reviewed = true;
  });

  /* ============================================================
     合同生成 Demo
     ============================================================ */
  let curGen = D.generate[0];
  let generated = false;

  $('gTypes').innerHTML = D.generate.map((g, i) =>
    `<button class="qchip${i === 0 ? ' on' : ''}" type="button" data-g="${esc(g.id)}">
<b>${esc(g.name)}</b><span>${esc(g.tag)}</span></button>`).join('');

  const paintInputs = () => {
    $('gInputs').innerHTML = curGen.inputs.map(x =>
      `<div><i>${esc(x.k)}</i><span>${esc(x.v)}</span></div>`).join('');
  };
  paintInputs();

  /* 占位符 {{xxx}} 渲染成可点的高亮块 */
  const ph = t => esc(t).replace(/\{\{(.+?)\}\}/g,
    (_, f) => `<span class="qph" data-f="${esc(f)}">${esc(f)}</span>`);

  const renderGen = () => `
<div class="dtitle">${esc(curGen.title)}</div>
<div class="qdraft">
${curGen.draft.map(s => `<div class="qblock"><b>${esc(s.h)}</b><p>${ph(s.p)}</p></div>`).join('')}
</div>
<p class="qdisc">AI 辅助起草，不构成法律意见。</p>

<div class="dsub">待补充字段 ${curGen.missing.length} 项<span>点正文里的橙色块也能跳到这里</span></div>
<div class="qfields" id="gFields">
${curGen.missing.map(m => `<div class="qfield" id="fd-${esc(m.f)}"><b>${esc(m.f)}</b><span>${esc(m.why)}</span></div>`).join('')}
</div>

<div class="dsub">签署前检查清单 ${curGen.checklist.length} 项</div>
<ul class="qcheck">${curGen.checklist.map(c => `<li>${esc(c)}</li>`).join('')}</ul>

<div class="dsub">起草说明</div>
<ul class="qcheck notes">${curGen.notes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;

  const bindGen = () => {
    const out = $('gOut');
    out.addEventListener('click', e => {
      const s = e.target.closest('.qph');
      if (!s) return;
      const fd = document.getElementById('fd-' + s.dataset.f);
      if (!fd) return;
      out.querySelectorAll('.qfield.on').forEach(x => x.classList.remove('on'));
      fd.classList.add('on');
      fd.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => fd.classList.remove('on'), 2400);
    });
  };

  $('gTypes').addEventListener('click', e => {
    const b = e.target.closest('.qchip');
    if (!b) return;
    $('gTypes').querySelectorAll('.qchip').forEach(x => x.classList.toggle('on', x === b));
    curGen = D.generate.find(g => g.id === b.dataset.g);
    paintInputs();
    if (generated) { $('gOut').innerHTML = renderGen(); }
  });

  $('gRun').addEventListener('click', async () => {
    const btn = $('gRun'), out = $('gOut');
    if (btn.dataset.busy) return;
    if (generated) { out.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    btn.dataset.busy = '1';
    btn.textContent = '生成中…';
    await sleep(700);
    out.hidden = false;
    out.innerHTML = renderGen();
    bindGen();
    btn.textContent = '↓ 看草案';
    delete btn.dataset.busy;
    generated = true;
  });
})();
