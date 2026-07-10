// === 移动端导航菜单切换 ===
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isActive = navMenu.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isActive);
  });

  // 点击导航链接后关闭菜单
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// === 导航栏滚动状态 ===
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

// === 滚动渐显动画 ===
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  // 为需要动画的元素添加初始状态和观察
  const revealElements = document.querySelectorAll(
      '.skill-card, .project-card, .article-card, .about-content, .contact-form'

  revealElements.forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

// === 联系表单提交 ===
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button');
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = '消息已发送';
    btn.classList.add('success');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('success');
    }, 2500);
    contactForm.reset();
  });
}
