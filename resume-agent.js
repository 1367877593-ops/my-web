/* ============================================================
   简历筛选 Agent 的静态 Demo。

   数据来自 resume-agent-data.js —— 那是仓库里 DEMO_MODE=1 的真实
   导出结果，这里只负责把它按流水线的顺序演一遍。不发任何请求。

   「运行」按钮做成逐阶段推进，是因为这套东西的价值在过程：
   哪一步检出了问题、修订了几轮、最后还剩什么。一次性把结果拍出来，
   反而看不到 Checker 在干活。
   ============================================================ */
(() => {
  const D = window.RSA_DEMO;
  if (!D) return;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 内置功能卡 ---------- */
  const CAPS = [
    ['JD 拆解', '把岗位描述拆成一条条带权重的要求，并标出哪些是硬性门槛。样例这份拆出 11 条，其中 3 条硬性。'],
    ['简历结构化', '从 PDF / Word 里提取教育、工作、项目、技能，每一项都带回原文出处，不脱离证据。'],
    ['逐条匹配', '每条要求单独判定满足 / 部分满足 / 不满足，给分并附简历原句。硬性项不满足直接一票否决。'],
    ['三档决策', '推进 / 待定 / 淘汰。阈值写在配置里，不是模型随口给的。'],
    ['面试题生成', '按这个人的短板出题，每道题写明考察点、出题原因和评分标准，不是通用题库。'],
    ['追问点识别', '找出简历里说得含糊、无法核实的地方，生成针对性追问。'],
    ['规则 Checker', '确定性规则查结构问题 —— 题目数量不够、字段缺失、引用对不上。查到就打回重做。'],
    ['语义 Checker', '查规则看不出的问题：引用逐字存在，但撑不起结论。这类只有读懂才能发现。'],
    ['闭环修订', '发现问题 → 反馈 → 修订 → 复检。修不好的会如实标出来，不假装通过。'],
    ['反思飞轮', '把被打回的教训存下来，下次同类任务提前喂进 Prompt，同样的错不犯第二次。'],
    ['多模型适配', 'OpenAI / Claude / DeepSeek / Qwen / Kimi 在配置里切换，业务代码无感知。快慢两档模型混合路由控成本。'],
    ['可审计留痕', '每次调用的耗时、命中缓存与否、修订轮次都记下来，出了问题能回溯。'],
  ];
  $('dCaps').innerHTML = CAPS.map(([t, d]) =>
    `<div class="dcap"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('');

  /* ---------- 运行日志 ---------- */
  const REC = { ADVANCE: ['推进', 'ok'], HOLD: ['待定', 'warn'], REJECT: ['淘汰', 'bad'] };
  const SAT = { YES: ['满足', 'ok'], PARTIAL: ['部分满足', 'warn'], NO: ['不满足', 'bad'] };
  const GATE = { PASS: 'ok', CONDITIONAL_PASS: 'warn', FAIL: 'bad' };

  const hardCount = D.jd.reqs.filter(r => r.hard).length;
  const byId = id => D.cands[id];
  const ranked = D.ranking.map(r => ({ ...r, c: byId(r.id) }));
  const totalVerdicts = ranked.reduce((n, r) => n + r.c.verdicts.length, 0);
  /* 修订轮次和遗留问题都从真实数据里数，别写死 —— 换一份导出就自动跟着变 */
  const fixed = [], left = [];
  ranked.forEach(r => r.c.stages.forEach(s => {
    s.fixed.forEach(f => fixed.push({ name: r.c.name, stage: s.stage, ...f }));
    s.left.forEach(l => left.push({ name: r.c.name, stage: s.stage, ...l }));
  }));

  const STAGE_CN = { extract: '简历提取', match: '逐条匹配', question_set: '面试题', followup: '追问' };

  const LOG = [
    ['载入内置样例', `1 份 JD + ${D.ranking.length} 份简历`],
    ['拆解 JD', `${D.jd.reqs.length} 条要求，其中硬性 ${hardCount} 条`],
    ['提取简历', ranked.map(r => r.c.name).join('、')],
    ['逐条匹配', `${D.jd.reqs.length} 条 × ${D.ranking.length} 人 = ${totalVerdicts} 项判定，每项附原文证据`],
    ['规则 Checker', fixed.length
      ? `检出 ${fixed.map(f => f.code).join('、')} → 修订后复检通过`
      : '未检出结构问题'],
    ['语义 Checker', left.length
      ? `检出 ${left.length} 个 major：${left.map(l => l.code).join('、')}`
      : '未检出语义问题'],
    ['排序分档', ranked.map(r => `${r.c.name} ${r.score}`).join(' · ')],
    ['生成面试题', ranked.map(r => r.c.questions.length ? `${r.c.name} ${r.c.questions.length} 题+${r.c.followups.length} 追问` : `${r.c.name} 跳过（淘汰不出题）`).join('，')],
  ];

  /* ---------- 结果区 ---------- */
  const reqRow = r =>
    `<div class="dreq${r.hard ? ' hard' : ''}"><i>${esc(r.id)}</i><span>${esc(r.text)}</span>
<em>${r.hard ? '硬性' : '权重 ' + r.w}</em></div>`;

  const rankRow = r => {
    const [cn, cls] = REC[r.rec] || [r.rec, ''];
    return `<button class="drank ${cls}${r.rank === 1 ? ' on' : ''}" type="button" data-id="${esc(r.id)}">
<i>${String(r.rank).padStart(2, '0')}</i>
<b>${esc(r.name)}</b>
<u>${r.score}</u>
<em>${esc(cn)}</em>
${r.failed.length ? `<s>硬性不满足 ${r.failed.length} 项</s>` : ''}</button>`;
  };

  const verdictRow = v => {
    const [cn, cls] = SAT[v.sat] || [v.sat, ''];
    return `<div class="dv ${cls}"><div class="dv-h"><i>${esc(v.id)}</i><em>${esc(cn)}</em><u>${v.score}</u></div>
<p>${esc(v.reason)}</p>
${v.ev.length ? `<blockquote>${v.ev.map(e => esc(e)).join('<br>')}</blockquote>` : ''}</div>`;
  };

  const qRow = q => `<details class="dq"><summary><i>${esc(q.id)}</i><span>${esc(q.text)}</span></summary>
<div class="dq-b">
<p><b>考察点</b>${esc(q.skill || '—')}　<b>难度</b>${esc(q.diff || '—')}</p>
<p><b>为什么问</b>${esc(q.why || '—')}</p>
${q.rubric.length ? `<div class="drub">${q.rubric.map(b => `<div><i>${esc(b.lv)}</i><em>≥${b.min}</em><span>${esc(b.c)}</span></div>`).join('')}</div>` : ''}
</div></details>`;

  const stageRow = s => `<div class="dstage ${GATE[s.status] || ''}">
<i>${esc(STAGE_CN[s.stage] || s.stage)}</i>
<em>${esc(s.status)}</em>
<span>${s.rounds ? `修订 ${s.rounds} 轮` : '未修订'}</span>
${s.fixed.length ? `<u class="fix">已修好 ${s.fixed.map(f => esc(f.code)).join('、')}</u>` : ''}
${s.left.length ? `<u class="leftover">遗留 ${s.left.map(f => esc(f.code)).join('、')}</u>` : ''}</div>`;

  const detail = id => {
    const c = byId(id);
    return `<div class="dcand-h"><h4>${esc(c.name)}</h4><p>${esc(c.reason)}</p></div>
<div class="dstages">${c.stages.map(stageRow).join('')}</div>
${c.semantic.findings.length ? `<div class="dfind">
<b>语义校验发现（查了 ${c.semantic.checked} 项）</b>
${c.semantic.findings.map(f => `<div><i>${esc(f.req)}</i><p>${esc(f.why)}</p><blockquote>${esc(f.quote)}</blockquote></div>`).join('')}
</div>` : `<div class="dfind ok"><b>语义校验：查了 ${c.semantic.checked} 项，未发现证据与结论矛盾</b></div>`}
<div class="dsub">逐条判定</div>
<div class="dvs">${c.verdicts.map(verdictRow).join('')}</div>
${c.questions.length ? `<div class="dsub">面试题 ${c.questions.length} 道<span>点开看考察点、出题原因与评分标准</span></div>
<div class="dqs">${c.questions.map(qRow).join('')}</div>` : '<div class="dsub">面试题<span>硬性要求未满足，不出题</span></div>'}
${c.ambig.length ? `<div class="dsub">追问点 ${c.ambig.length} 处</div>
<div class="dvs">${c.ambig.map(p => `<div class="dv"><div class="dv-h"><i>${esc(p.id)}</i></div><p>${esc(p.desc)}</p>
${p.ev.length ? `<blockquote>${p.ev.map(e => esc(e)).join('<br>')}</blockquote>` : ''}</div>`).join('')}</div>
<div class="dqs">${c.followups.map(f => `<details class="dq"><summary><i>追问</i><span>${esc(f.text)}</span></summary>
<div class="dq-b"><p><b>为什么问</b>${esc(f.why || '—')}</p></div></details>`).join('')}</div>` : ''}`;
  };

  const results = () => `
<div class="dsub">JD 拆解<span>${D.jd.reqs.length} 条要求，硬性 ${hardCount} 条</span></div>
<div class="dtitle">${esc(D.jd.title)}</div>
<div class="dreqs">${D.jd.reqs.map(reqRow).join('')}</div>

<div class="dsub">排序与分档<span>点候选人看详情</span></div>
<div class="dranks">${D.ranking.map(rankRow).join('')}</div>

<div class="dsub">Checker 做了什么<span>样例刻意留了两处不完美</span></div>
<div class="dchk">
${fixed.map(f => `<div class="ok"><i>已修复</i><b>${esc(f.code)}</b><span>${esc(f.name)} · ${esc(STAGE_CN[f.stage] || f.stage)} —— ${esc(f.msg)}</span></div>`).join('')}
${left.map(f => `<div class="warn"><i>${esc(f.sev)}</i><b>${esc(f.code)}</b><span>${esc(f.name)} · ${esc(STAGE_CN[f.stage] || f.stage)} —— ${esc(f.msg)}</span></div>`).join('')}
</div>

<div class="dcand" id="dCand">${detail(D.ranking[0].id)}</div>`;

  /* ---------- 交互 ---------- */
  const btn = $('dRun'), term = $('dTerm'), out = $('dOut');
  let done = false;

  btn.addEventListener('click', async () => {
    if (btn.dataset.busy) return;
    if (done) { document.getElementById('dCand').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    btn.dataset.busy = '1';
    btn.textContent = '运行中…';
    term.hidden = false;
    term.innerHTML = '';
    for (const [step, note] of LOG) {
      const row = document.createElement('div');
      row.className = 'dline';
      row.innerHTML = `<i>▸</i><b>${esc(step)}</b><span>${esc(note)}</span>`;
      term.appendChild(row);
      await sleep(360);
    }
    const tail = document.createElement('div');
    tail.className = 'dline done';
    tail.innerHTML = `<i>✓</i><b>完成</b><span>回放固定缓存，未调用模型</span>`;
    term.appendChild(tail);
    await sleep(260);
    out.hidden = false;
    out.innerHTML = results();
    out.querySelector('.dranks').addEventListener('click', e => {
      const b = e.target.closest('.drank');
      if (!b) return;
      out.querySelectorAll('.drank').forEach(x => x.classList.toggle('on', x === b));
      $('dCand').innerHTML = detail(b.dataset.id);
    });
    btn.textContent = '↓ 看结果';
    delete btn.dataset.busy;
    done = true;
  });
})();
