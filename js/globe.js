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

  // Connections that build as the page scrolls: Portugal outwards
  function vec(lat, lon) { var la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)]; }
  var C = {
    lisbon: [38.72, -9.14], coimbra: [40.21, -8.43], utrecht: [52.09, 5.12], toulouse: [43.6, 1.44], espoo: [60.2, 24.65],
    dublin: [53.35, -6.26], london: [51.5, -0.12], madrid: [40.42, -3.7], berlin: [52.52, 13.4], stockholm: [59.33, 18.07],
    warsaw: [52.23, 21.01], newyork: [40.71, -74.0], toronto: [43.65, -79.38], saopaulo: [-23.55, -46.63], mexico: [19.43, -99.13],
    johannesburg: [-26.2, 28.05], dubai: [25.2, 55.27], bangalore: [12.97, 77.59], singapore: [1.35, 103.82], kualalumpur: [3.14, 101.69],
    sydney: [-33.87, 151.21], tokyo: [35.68, 139.69]
  };
  var routes = [['coimbra','utrecht'],['lisbon','toulouse'],['lisbon','espoo'],['lisbon','dublin'],['utrecht','london'],['utrecht','berlin'],
    ['utrecht','stockholm'],['utrecht','warsaw'],['coimbra','madrid'],['lisbon','newyork'],['newyork','toronto'],['lisbon','saopaulo'],
    ['newyork','mexico'],['lisbon','johannesburg'],['utrecht','dubai'],['dubai','bangalore'],['bangalore','singapore'],['singapore','kualalumpur'],
    ['singapore','sydney'],['singapore','tokyo']];
  var arcs = routes.map(function (r) {
    var a = vec(C[r[0]][0], C[r[0]][1]), b = vec(C[r[1]][0], C[r[1]][1]);
    var om = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    var lift = 0.06 + 0.32 * om / Math.PI, pts = [];
    for (var k = 0; k <= 48; k++) {
      var t = k / 48, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om), rr = 1 + lift * Math.sin(Math.PI * t);
      pts.push([(a[0] * s1 + b[0] * s2) * rr, (a[1] * s1 + b[1] * s2) * rr, (a[2] * s1 + b[2] * s2) * rr]);
    }
    return pts;
  });
  var target = 0, prog = 0;
  function readScroll() { var max = document.documentElement.scrollHeight - innerHeight; target = max > 0 ? Math.min(1, scrollY / max) : 0; }

  var w, h, dpr, R, cx, cy, rot = 2.2, tilt = -0.32, last = 0, running = false;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var b = canvas.getBoundingClientRect();
    w = b.width; h = b.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(w * 0.42, h * 0.40);
    cx = w / 2; cy = h * 0.5;
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
    drawArcs(cr, sr, ct, st);
  }

  function proj(v, cr, sr, ct, st) {
    var x = v[0] * cr - v[2] * sr, z = v[0] * sr + v[2] * cr, y = v[1] * ct - z * st;
    z = v[1] * st + z * ct;
    return [cx + x * R, cy - y * R, z];
  }
  function drawArcs(cr, sr, ct, st) {
    var n = arcs.length;
    ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var start = (i / n) * 0.82, t = Math.max(0, Math.min(1, (prog - start) / 0.12));
      if (t <= 0) continue;
      var a = arcs[i], end = Math.max(1, Math.round(t * 48)), prev = proj(a[0], cr, sr, ct, st);
      for (var k = 1; k <= end; k++) {
        var cur = proj(a[k], cr, sr, ct, st), vis = Math.max(0, Math.min(1, (Math.min(prev[2], cur[2]) + 0.25) / 0.5));
        var al = 0.12 + 0.88 * vis;
        ctx.strokeStyle = 'rgba(61,220,151,' + (0.16 * al).toFixed(3) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(170,255,215,' + (0.9 * al).toFixed(3) + ')'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
        prev = cur;
      }
      var s0 = proj(a[0], cr, sr, ct, st);
      dot(s0, 2.6);
      if (t < 1) dot(prev, 3.4); else dot(proj(a[48], cr, sr, ct, st), 2.6);
    }
  }
  function dot(p, r) {
    var al = Math.max(0.1, Math.min(1, (p[2] + 0.25) / 0.5));
    ctx.fillStyle = 'rgba(61,220,151,' + (0.25 * al).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(p[0], p[1], r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,255,238,' + al.toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
  }

  function frame(t) {
    if (!running) return;
    var dt = last ? Math.min(t - last, 64) : 16; last = t;
    rot += dt * 0.00008;
    prog += (target - prog) * Math.min(1, dt * 0.006);
    draw();
    requestAnimationFrame(frame);
  }
  function start() { if (!running && !reduce) { running = true; last = 0; requestAnimationFrame(frame); } }
  function stop() { running = false; }

  readScroll(); prog = target; size(); draw();
  addEventListener('scroll', function () { readScroll(); if (!running) { prog = target; draw(); } }, { passive: true });
  addEventListener('resize', function () { size(); draw(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }).observe(canvas);
  } else { start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
})();
