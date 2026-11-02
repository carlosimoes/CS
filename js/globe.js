(function () {
  var canvas = document.querySelector('.globe');
  if (!canvas || !window.GLOBE_LAND) return;
  var ctx = canvas.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Decode land points (lat, lon in hundredths of a degree) to unit vectors
  var bin = atob(window.GLOBE_LAND), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  var raw = new Int16Array(bytes.buffer), pts = [];
  function push(lat, lon, r, kind) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    pts.push({ x: Math.cos(la) * Math.cos(lo) * r, y: Math.sin(la) * r, z: Math.cos(la) * Math.sin(lo) * r, k: kind, s: Math.random() });
  }
  for (var j = 0; j < raw.length; j += 2) push(raw[j] / 100 + (Math.random() - 0.5) * 0.9, raw[j + 1] / 100 + (Math.random() - 0.5) * 0.9, 1, 0);
  // Sparse ocean dots and an outer atmosphere shell
  for (var o = 0; o < 900; o++) push(Math.asin(Math.random() * 2 - 1) * 180 / Math.PI, Math.random() * 360 - 180, 1, 1);
  for (var a = 0; a < 2600; a++) push(Math.asin(Math.random() * 2 - 1) * 180 / Math.PI, Math.random() * 360 - 180, 1.06 + Math.random() * 0.16, 2);

  var w, h, dpr, R, cx, cy, rot = 2.2, tilt = -0.32, last = 0, running = false;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var b = canvas.getBoundingClientRect();
    w = b.width; h = b.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(w * 0.36, h * 0.46);
    cx = w / 2; cy = h * 0.56;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
    // Soft inner glow of the lit hemisphere
    var g = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.35, R * 0.1, cx, cy, R * 1.25);
    g.addColorStop(0, 'rgba(61,220,151,0.16)');
    g.addColorStop(0.6, 'rgba(61,220,151,0.05)');
    g.addColorStop(1, 'rgba(61,220,151,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var x = p.x * cr - p.z * sr, z = p.x * sr + p.z * cr;
      var y = p.y * ct - z * st; z = p.y * st + z * ct;
      if (p.k !== 2 && z < -0.05) continue;
      var depth = (z + 1.2) / 2.4; // 0 back, 1 front
      var light = Math.max(0, 0.35 + 0.65 * (-x * 0.35 + y * 0.55 + z * 0.75));
      var alpha, size;
      if (p.k === 0) { alpha = 0.12 + 0.88 * light * depth; size = 0.9 + 1.0 * depth; }
      else if (p.k === 1) { alpha = 0.10 * depth; size = 0.9; }
      else { alpha = (0.06 + 0.42 * depth) * (0.4 + p.s * 0.6); size = 0.8 + p.s * 0.7; }
      ctx.fillStyle = 'rgba(' + (p.k === 0 ? '96,236,170,' : '61,220,151,') + alpha.toFixed(3) + ')';
      ctx.fillRect(cx + x * R - size / 2, cy - y * R - size / 2, size, size);
    }
  }

  function frame(t) {
    if (!running) return;
    var dt = last ? Math.min(t - last, 64) : 16; last = t;
    rot += dt * 0.00008;
    draw();
    requestAnimationFrame(frame);
  }
  function start() { if (!running && !reduce) { running = true; last = 0; requestAnimationFrame(frame); } }
  function stop() { running = false; }

  size(); draw();
  addEventListener('resize', function () { size(); draw(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }).observe(canvas);
  } else { start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
})();
