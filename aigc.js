/* ============================================================
   AIGC 作品索引。aigc.html 读这一份。

   加作品分两步：
   1. 文件放进 assets/aigc/<系列英文名>/，先压再放：
      图片 → JPG，长边 1600px 以内、300KB 以内
      视频 → MP4(H.264)，720p、3MB 以内，另外导一张封面图
      （首屏那条 hero.mp4 已经 4MB 了，别再往仓库里堆大文件；
        真要放原画质，src 填图床/OSS 外链，thumb 仍然放本地小图）
   2. 在下面 WORKS 数组最前面加一条（数组顺序 = 页面顺序）

   字段：
     date    必填，YYYY.MM.DD，原样显示
     title   必填，作品名
     series  必填，系列。必须是下面 SERIES 里的一个，写错了筛选点不出来
     type    必填，'image' 或 'video'
     src     必填，点开后看到的原件，本地路径或外链都行
     thumb   可选，网格里的缩略图。不填就用 src ——
             视频必须填，否则一进页面十几条 mp4 一起加载
     poster  可选，仅视频用，播放前那一帧
     wide    可选，true = 横构图，在网格里占两格
     prompt  可选，出图/出片用的提示词，点开后折叠显示
     note    可选，一句话：想做什么、卡在哪、怎么解决的

   注意：视频的 thumb 一定要给，这是整页性能的命门。
   ============================================================ */

/* 筛选是两级的：先选格式（照片/视频），再在这个格式里选系列。
   一件作品都没有时按钮也在，起「这个作品集会放什么」的说明作用。

   一级 = 格式。按每件作品的 type 自动归类，你不用额外标；
   想改按钮上的字就改 label，type 必须是 'image' 或 'video'。
   页面默认落在数组里的第一个，所以谁在前面谁就是首屏。 */
window.AIGC_FORMATS = [
  { type: 'image', label: '照片' },
  { type: 'video', label: '视频' },
];

/* 二级 = 主题系列。计数会跟着当前格式走 ——
   选「视频」时，「敦煌风格」旁边显示的是敦煌有几条视频，不是几件作品。
   改这里就能加/改系列。 */
window.AIGC_SERIES = ['敦煌风格', '枫桥夜泊'];

window.AIGC_WORKS = [
  /* 照着这两条填，把注释拆掉就是真数据 —————————————

  {
    date: '2026.08.16',
    title: '崖壁悬空楼阁',
    series: '敦煌风格',
    type: 'image',
    src: 'assets/aigc/dunhuang/cliff-pavilion.jpg',
    prompt: '右侧巨型沙岩崖体上密密嵌满青绿琉璃顶的悬空楼阁，层层出檐，白鹤群飞穿行其间……',
    note: '试了六版都卡在楼阁层数上，最后靠「层层出檐」把结构稳住。'
  },
  {
    date: '2026.08.16',
    title: '枫桥夜泊 · 船身浮动',
    series: '枫桥夜泊',
    type: 'video',
    src: 'assets/aigc/fengqiao/boat-drift.mp4',
    thumb: 'assets/aigc/fengqiao/boat-drift.jpg',
    poster: 'assets/aigc/fengqiao/boat-drift.jpg',
    wide: true,
    prompt: '全程 8 秒。船体做缓慢的整体上下浮动，8 秒内完成约三次完整的起伏，幅度轻微……',
    note: '图生视频，难点是让船动、水面别糊。'
  },

  ————————————————————————————————————————— */
];
