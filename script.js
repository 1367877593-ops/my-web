const heroVids=[...document.querySelectorAll('.hero-photo video')],heroVideo=heroVids[0];

/* loader：首屏视频能播了就撤，最多兜底 3.5s，不再无条件黑屏 */
const loader=document.getElementById('loader'),hideLoader=()=>loader?.classList.add('hide');
if(heroVideo){if(heroVideo.readyState>=3)hideLoader();else{heroVideo.addEventListener('canplay',hideLoader,{once:true});heroVideo.addEventListener('error',hideLoader,{once:true})}}else addEventListener('load',hideLoader);
setTimeout(hideLoader,3500);

/* 顶栏毛玻璃 */
const topbar=document.getElementById('topbar'),onScroll=()=>topbar?.classList.toggle('scrolled',scrollY>60);
onScroll();addEventListener('scroll',onScroll,{passive:true});

/* 导航高亮 */
const navLinks=[...document.querySelectorAll('.nav a')];
if(navLinks.length){const spy=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});navLinks.forEach(a=>{const s=document.querySelector(a.getAttribute('href'));if(s)spy.observe(s)})}

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 首屏视频：两条轨道交叉淡入，盖掉 5 秒循环点的跳帧。
   HTML 里保留 loop 属性，JS 没跑起来时退化成原来的硬切。 */
const XFADE=.7,play=v=>{const p=v.play();if(p)p.catch(()=>{})},
  setOpacity=(a,b,p)=>{a.style.opacity=String(1-p);b.style.opacity=String(p)};
if(reduced){heroVids.forEach(v=>{v.removeAttribute('autoplay');v.pause()});if(heroVideo)heroVideo.style.opacity='1'}
else if(heroVids.length===2){
  let cur=0;
  heroVids.forEach(v=>{v.muted=!0;v.removeAttribute('loop')});
  setOpacity(heroVids[0],heroVids[1],0);
  play(heroVideo);
  const step=()=>{
    const a=heroVids[cur],b=heroVids[1-cur],d=a.duration;
    if(d>XFADE){
      const left=d-a.currentTime;
      if(left<=XFADE){
        if(b.paused){b.currentTime=0;play(b)}
        /* 接班的那条确实在走才开始交接，否则维持现状，两条的不透明度之和恒为 1 */
        if(!b.paused&&b.currentTime>0)setOpacity(a,b,Math.min(1,(XFADE-left)/XFADE));
        if(left<=.06&&!b.paused&&b.currentTime>0){a.pause();a.currentTime=0;setOpacity(a,b,1);cur=1-cur}
      }
    }
    requestAnimationFrame(step);
  };
  /* 兜底：接班没起来就自己从头播，退化成硬切也好过黑屏 */
  heroVids.forEach(v=>v.addEventListener('ended',()=>{if(heroVids[1-cur].paused){v.currentTime=0;play(v);setOpacity(v,heroVids[1-cur],0)}}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)heroVids.forEach(v=>{if(!v.paused)play(v)})});
  requestAnimationFrame(step);
}
else if(heroVideo)play(heroVideo);

/* 滚动入场 */
if(!reduced){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.1,rootMargin:'0px 0px -40px'});document.querySelectorAll('.section-head,.about-grid,.cap-grid article,.project-list article,.collab-grid article,.contact form').forEach(el=>{el.classList.add('reveal');io.observe(el)})}

const form=document.getElementById('contactForm');
form?.addEventListener('submit',e=>{e.preventDefault();const b=form.querySelector('button'),t=b.textContent;b.textContent='消息已发送 ✓';setTimeout(()=>b.textContent=t,2200);form.reset()});
