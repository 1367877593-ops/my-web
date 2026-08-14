/* ============================================================
   文章索引。首页 NOTES 板块和 notes.html 全部文章页都读这一份。

   加一篇文章分两步：
   1. 复制 notes/_template.html，改名成 slug.html，把正文填进去
   2. 在下面数组最前面加一条（数组顺序 = 页面顺序，新的放最上面）

   字段：
     date    必填，YYYY.MM.DD，会原样显示（纯字符串，想写什么就写什么）
     title   必填
     slug    必填，对应 notes/<slug>.html
     excerpt 可选，一句话摘要，不写就只显示标题
     tag     可选，分类。必须是下面 CATEGORIES 里的一个，写错了筛选点不出来

   注意：列表顺序 = 数组顺序，新文章加在最前面。
   ============================================================ */

/* 四个分类。筛选按钮按这个顺序固定显示，一篇文章都没有时也在，
   起「这个站会写这四类」的说明作用。改这里就能加/改分类。 */
window.CATEGORIES = ['行业观察', '产品拆解', 'AI 名词拆解', '工作方法', '一些思考和碎碎念'];
window.NOTES = [
  {
    date: '2026.08.10',
    title: '一文带你看懂LangGraph是什么',
    slug: 'what-is-langgraph',
    excerpt: 'LangGraph 不是新的 AI 模型，而是一套让智能体按流程执行任务、保存状态，并支持分支、重试、人工审批和断点恢复的编排框架。本文用三个生活类比把它讲明白。',
    tag: 'AI 名词拆解'
  },
  {
    date: '2026.08.06',
    title: '模型每周都在更新，产品经理该站在哪一层',
    slug: 'model-updates-pm-layer',
    excerpt: '模型迭代正在从按年缩短到按季度，开源也在持续挤压模型层的价值。产品经理真正该积累的，是自建评测集、可替换的架构，以及对真实工作流的理解。',
    tag: '行业观察'
  },
  {
    date: '2026.08.03',
    title: 'WorkBuddy 这波爆火到底改变了什么',
    slug: 'workbuddy-teardown',
    excerpt: 'AI 的门槛从“学会怎么问”降到了“说清楚要什么”——拆一遍这波爆火背后逻辑',
    tag: '产品拆解'
  },
  {
    date: '2026.07.23',
    title: '真正的胜负手，是在混乱中摸索和开拓的能力',
    slug: 'winning-in-chaos',
    excerpt: '真正拉开差距的，往往不是沿着已知路径坚持，而是在没有答案、反馈迟缓的混乱里继续行动。能记录、试错、识别规律，并允许自己暂时没有结论，才是从 0 到 1 的稀缺能力。',
    tag: '一些思考和碎碎念'
  },
  {
    date: '2026.06.19',
    title: '从敲命令到 AI 管家：一文读懂 CLI、API 与 MCP',
    slug: 'cli-api-mcp',
    excerpt: 'CLI 是人对程序说话，API 是程序对程序说话，MCP 是 AI 对工具说话——三个都带缩写的词，其实处在完全不同的层面。',
    tag: 'AI 名词拆解'
  },
];

/* 首页 START HERE 的三个槽位。填上面某篇文章的 slug 即可，
   留空就渲染成虚线「待填充」。 */
window.PICKS = {
  sharp: 'model-updates-pm-layer',// 最锋利的观点
  deep: 'workbuddy-teardown',     // 最硬的拆解
  human: 'winning-in-chaos'       // 最有人味的
};
