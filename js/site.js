(function () {
  var root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('ready'); });
  });

  var steps = document.querySelector('.steps');
  if (steps && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var items = [].slice.call(steps.querySelectorAll('li:not(.rail)'));
    var ticking = false;
    function update() {
      ticking = false;
      var r = steps.getBoundingClientRect();
      var anchor = innerHeight * 0.5;
      var y = Math.max(0, Math.min(r.height, anchor - r.top));
      steps.style.setProperty('--y', y + 'px');
      var active = 0;
      items.forEach(function (li, i) { if (li.getBoundingClientRect().top - 40 <= anchor) active = i; });
      items.forEach(function (li, i) { li.classList.toggle('on', i === active); });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
  }

  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (!btn || !nav) return;
  function close() { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
