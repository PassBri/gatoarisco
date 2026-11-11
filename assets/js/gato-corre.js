/* Gatoarisco · gato que camina y galopa sobre el borde de una sección.
   Locomoción de gato real:
   - Cada pata se planta en el suelo (no patina) y solo se mueve en el aire.
   - Paso lateral de 4 tiempos, pausado; galope rotatorio con columna que se recoge y se estira.
   - Patas digitígradas: talón que se despega, muñeca que se dobla al levantar la mano.
   - Omóplato que sube con cada pisada, cabeza estable, cola de contrapeso.
   - Al frenar acomoda las patas una a una. Si lo tocas, se eriza y bufa. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const NOCHE = '#0B1A2A', LEJOS = '#283F54', MENTA = '#73D8C7', CLARO = '#E8FFFA', AMBAR = '#FFB547';
  const TAU = Math.PI * 2;
  const MARCHAS = {
    // L = avance del cuerpo por ciclo; apoyo = fracción del ciclo con la pata en el suelo
    paso: { L: 30, apoyo: 0.64, alzaD: 6, alzaT: 4.5, vel: 46, flex: 0.05, fase: { ti: 0, di: 0.25, td: 0.5, dd: 0.75 } },
    galope: { L: 78, apoyo: 0.3, alzaD: 12, alzaT: 10, vel: 330, flex: 1, fase: { ti: 0, td: 0.07, dd: 0.47, di: 0.55 } },
  };
  const PATAS = [
    { k: 'td', tr: true, cerca: false }, { k: 'dd', tr: false, cerca: false },
    { k: 'ti', tr: true, cerca: true }, { k: 'di', tr: false, cerca: true },
  ];
  const NEUTRO = { ti: -21, td: -17, di: 23, dd: 27 };
  const CADERA = { x: -23, y: -35 }, HOMBRO = { x: 21, y: -33.5 };
  const FRASES = ['¡Fsss!', '¡Ni lo pienses!', '¡Fsss! Esto es mío.', 'Arisco, no antipático.'];

  const lerp = (a, b, k) => a + (b - a) * k;
  const suave = (u) => u * u * (3 - 2 * u);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function ik(r, t, a, b, signo) {
    const dx = t.x - r.x, dy = t.y - r.y;
    const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.01, a + b - 0.01);
    const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const ang = Math.atan2(dy, dx) + signo * A;
    const j = { x: r.x + a * Math.cos(ang), y: r.y + a * Math.sin(ang) };
    const g = Math.atan2(t.y - j.y, t.x - j.x);
    return [j, { x: j.x + b * Math.cos(g), y: j.y + b * Math.sin(g) }];
  }

  function Gato(tira) {
    const cv = document.createElement('canvas');
    cv.className = 'gato-corre-lienzo'; cv.setAttribute('aria-hidden', 'true');
    const globo = document.createElement('p'); globo.className = 'globo-corre'; globo.setAttribute('role', 'status');
    tira.append(cv, globo);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, esc = 1, dpr = 1;
    const s = { d: 0, x0: 0, dir: 1, phi: 0, amp: 0, ampObj: 0, marcha: 'paso', arco: 0, arcoObj: 0, modo: 'fuera', espera: 1.2, quieto: 0, reloj: 0, parpadeo: 0, oreja: 0 };
    const pies = {};
    const xPantalla = () => s.x0 + s.dir * s.d * esc;

    function medir() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = tira.clientWidth; H = tira.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      esc = W < 600 ? 0.95 : 1.25;
    }
    medir();
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(tira);

    function plantarTodo() { PATAS.forEach(({ k }) => { pies[k] = { estado: 'apoyo', px: s.d + NEUTRO[k], desde: 0, hasta: 0, u: 0, x: s.d + NEUTRO[k], y: 0 }; }); }
    plantarTodo();

    function entrar() {
      s.dir = Math.random() < 0.6 ? 1 : -1;
      s.x0 = s.dir > 0 ? -70 * esc : W + 70 * esc; s.d = 0; s.phi = 0;
      s.atraviesa = Math.random() < 0.22;
      s.marcha = s.atraviesa ? 'galope' : 'paso';
      s.parada = (W * (0.3 + Math.random() * 0.4) - s.x0) * s.dir / esc;
      s.ampObj = 1; s.amp = s.atraviesa ? 0.6 : 0.25; s.modo = 'entra';
      plantarTodo();
    }

    function bufar(px) {
      if (s.modo === 'bufa' || s.modo === 'fuera') return;
      s.modo = 'bufa'; s.quieto = 1.3; s.ampObj = 0; s.arcoObj = 1;
      s.huyeA = px == null ? s.dir : (px < xPantalla() ? 1 : -1);
      decir(FRASES[Math.floor(Math.random() * FRASES.length)]);
      if (window.gatoBufido) window.gatoBufido();
    }
    let tGlobo;
    function decir(txt) {
      globo.textContent = txt; globo.classList.add('ver');
      globo.style.left = clamp(xPantalla() - 50, 8, Math.max(8, W - 190)) + 'px';
      clearTimeout(tGlobo); tGlobo = setTimeout(() => globo.classList.remove('ver'), 1700);
    }
    function huir() {
      if (s.huyeA !== s.dir) { s.x0 = xPantalla(); s.d = 0; s.dir = s.huyeA; plantarTodo(); }
      s.arcoObj = 0; s.marcha = 'galope'; s.phi = 0.2; s.ampObj = 1; s.modo = 'sale';
    }

    /* ---------- física de las patas ---------- */
    function moverPatas(dt, v) {
      const M = MARCHAS[s.marcha];
      const Lc = M.L * (0.4 + 0.6 * s.amp);
      const andando = s.amp > 0.05 && s.ampObj > 0;
      if (andando) s.phi = (s.phi + (v * dt) / Lc) % 1;
      PATAS.forEach(({ k, tr }) => {
        const p = pies[k]; const alza = (tr ? M.alzaT : M.alzaD) * clamp(s.amp * 1.4, 0.35, 1);
        if (andando) {
          const f = (s.phi + M.fase[k]) % 1;
          const enAire = f >= M.apoyo;
          if (enAire && p.estado === 'apoyo') { p.estado = 'aire'; p.desde = p.px; }
          if (!enAire && p.estado === 'aire') { p.estado = 'apoyo'; p.px = p.x; }
          if (p.estado === 'aire') {
            const u = (f - M.apoyo) / (1 - M.apoyo);
            const falta = (1 - u) * (1 - M.apoyo) * Lc;
            p.hasta = s.d + falta + NEUTRO[k] + (M.apoyo * Lc) / 2;
            p.u = u; p.x = lerp(p.desde, p.hasta, suave(u)); p.y = -alza * Math.sin(Math.PI * u);
          } else { p.u = 0; p.x = p.px; p.y = 0; }
        } else if (p.estado === 'aire') {
          p.u = Math.min(1, p.u + dt / 0.2); p.hasta = s.d + NEUTRO[k];
          p.x = lerp(p.desde, p.hasta, suave(p.u)); p.y = -alza * 0.7 * Math.sin(Math.PI * p.u);
          if (p.u >= 1) { p.estado = 'apoyo'; p.px = p.x; p.y = 0; }
        }
      });
      if (!andando && !PATAS.some(({ k }) => pies[k].estado === 'aire')) {
        const k = ['ti', 'td', 'di', 'dd'].find((q) => Math.abs(pies[q].px - (s.d + NEUTRO[q])) > 2.2);
        if (k) { const p = pies[k]; p.estado = 'aire'; p.desde = p.px; p.u = 0; }
      }
    }

    function paso(dt) {
      s.reloj += dt;
      const M = MARCHAS[s.marcha];
      const k = s.modo === 'bufa' ? 8 : s.ampObj > s.amp ? 1.6 : 2.4;
      s.amp += (s.ampObj - s.amp) * Math.min(1, dt * k);
      if (s.ampObj === 0 && s.amp < 0.02) s.amp = 0;
      s.arco += (s.arcoObj - s.arco) * Math.min(1, dt * 6);
      const v = s.amp * M.vel;
      s.d += v * dt;
      moverPatas(dt, v);
      s.parpadeo = Math.max(0, s.parpadeo - dt); if (Math.random() < dt * 0.3) s.parpadeo = 0.14;
      s.oreja = Math.max(0, s.oreja - dt); if (Math.random() < dt * 0.25) s.oreja = 0.25;

      switch (s.modo) {
        case 'fuera': s.espera -= dt; if (s.espera <= 0) entrar(); break;
        case 'entra':
          if (!s.atraviesa && s.d > s.parada - 25) s.ampObj = 0;
          if (!s.atraviesa && s.ampObj === 0 && s.amp === 0 && !PATAS.some(({ k: q }) => pies[q].estado === 'aire')) { s.modo = 'quieto'; s.quieto = 2.4 + Math.random() * 2.2; }
          if (s.atraviesa) fuera();
          break;
        case 'quieto':
          s.quieto -= dt;
          if (s.quieto <= 0) { s.marcha = 'galope'; s.phi = 0.2; s.ampObj = 1; s.modo = 'sale'; }
          break;
        case 'bufa': s.quieto -= dt; if (s.quieto <= 0) huir(); break;
        case 'sale': fuera(); break;
      }
    }
    function fuera() { const x = xPantalla(); if (x < -110 * esc || x > W + 110 * esc) { s.modo = 'fuera'; s.espera = 9 + Math.random() * 10; s.amp = s.ampObj = 0; s.arco = s.arcoObj = 0; } }

    /* ---------- dibujo ---------- */
    function hueso(a, b, wa, wb) {
      const ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      ctx.beginPath();
      ctx.moveTo(a.x + nx * wa / 2, a.y + ny * wa / 2); ctx.lineTo(b.x + nx * wb / 2, b.y + ny * wb / 2);
      ctx.lineTo(b.x - nx * wb / 2, b.y - ny * wb / 2); ctx.lineTo(a.x - nx * wa / 2, a.y - ny * wa / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(a.x, a.y, wa / 2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, wb / 2, 0, TAU); ctx.fill();
    }

    function pata({ k, tr, cerca }, raiz) {
      const p = pies[k];
      const pie = { x: p.x - s.d, y: p.y };
      ctx.fillStyle = cerca ? NOCHE : LEJOS;
      const enAire = p.estado === 'aire', u = p.u;
      if (tr) {
        const atras = clamp((raiz.x - pie.x - 4) / 26, 0, 1);
        const a = enAire ? 0.45 + (s.marcha === "galope" ? 0.5 : 0.8) * Math.sin(Math.PI * Math.min(1, u * 1.15)) : 0.32 + atras * 0.55;
        const corvejon = { x: pie.x - 11 * Math.sin(a), y: pie.y - 11 * Math.cos(a) };
        const [rodilla, fin] = ik(raiz, corvejon, 16, 17, -1);
        hueso(raiz, rodilla, cerca ? 13 : 11, 7.2); hueso(rodilla, fin, 7.2, 4.4); hueso(fin, pie, 4.2, 3.6);
        ctx.beginPath(); ctx.ellipse(pie.x + 2.2, pie.y - 1.5, 4.2, 2.3, 0, 0, TAU); ctx.fill();
      } else {
        const giro = enAire ? -1.25 * Math.sin(Math.PI * Math.min(1, u * 1.35)) : 0;
        const vx = -0.9, vy = -4.6;
        const muneca = { x: pie.x + vx * Math.cos(giro) - vy * Math.sin(giro), y: pie.y + vx * Math.sin(giro) + vy * Math.cos(giro) };
        const [codo, fin] = ik(raiz, muneca, 15, 16, 1);
        hueso(raiz, codo, cerca ? 10 : 8.5, 6); hueso(codo, fin, 5.6, 4.2);
        const dedos = { x: muneca.x + 4.6 * Math.sin(-giro * 0.9 + 0.25), y: muneca.y + 4.6 * Math.cos(-giro * 0.9 + 0.25) };
        hueso(fin, dedos, 4.2, 3.4);
        ctx.beginPath(); ctx.ellipse(dedos.x + 1.8, dedos.y - 0.6, 3.8, 2.1, enAire ? giro * 0.6 : 0, 0, TAU); ctx.fill();
      }
    }

    function dibujar() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (s.modo === 'fuera') return;
      const M = MARCHAS[s.marcha], a = s.amp, galope = s.marcha === 'galope', c = TAU * s.phi;
      const flex = M.flex * a * Math.cos(c - TAU * 0.85);
      let yC = 0, yH = 0;
      if (galope) {
        const vuelo = -4.2 * a * Math.pow(Math.max(0, Math.sin(c - 1.0)), 2);
        yC = vuelo + 3 * a * Math.sin(c); yH = vuelo - 3 * a * Math.sin(c);
      } else {
        yC = 0.9 * a * Math.cos(2 * (c - TAU * 0.1)); yH = 0.9 * a * Math.cos(2 * (c - TAU * 0.35));
      }
      const respira = (1 - a) * Math.sin(s.reloj * 2.2) * 0.5;
      const cadera = { x: CADERA.x + flex * 11, y: CADERA.y + yC - s.arco * 7 + respira * 0.4 };
      const hombro = { x: HOMBRO.x - flex * 6, y: HOMBRO.y + yH - s.arco * 4 + respira * 0.4 };
      const pd = pies.di;
      const escap = pd && pd.estado === 'apoyo' ? 2.4 * clamp(1 - Math.abs(pd.x - s.d - hombro.x) / 14, 0, 1) * Math.max(a, 0.4) : 0;

      ctx.save();
      ctx.translate(xPantalla(), H - 1); ctx.scale(s.dir * esc, esc);

      ctx.fillStyle = 'rgba(11,26,42,.12)'; ctx.beginPath(); ctx.ellipse(0, 0.6, 30 + a * 8, 2, 0, 0, TAU); ctx.fill();

      PATAS.filter((q) => !q.cerca).forEach((q) => pata(q, q.tr ? { x: cadera.x + 3, y: cadera.y + 1 } : { x: hombro.x - 2, y: hombro.y + 1 }));

      // cola
      const base = { x: cadera.x - 8, y: cadera.y - 6 };
      let ang, curva;
      if (galope) { ang = Math.PI + 0.12 + 0.16 * Math.sin(c + 1.2) * a; curva = 0.012; }
      else if (s.modo === 'quieto') { ang = Math.PI - 0.55; curva = 0.115; }
      else { ang = Math.PI - 0.38 + 0.05 * Math.sin(c * 2); curva = 0.085; }
      ang = lerp(ang, Math.PI + 1.45, s.arco); curva = lerp(curva, -0.02, s.arco);
      const latigo = s.modo === 'quieto' ? Math.sin(s.reloj * 2.6) * 0.16 : 0;
      ctx.fillStyle = NOCHE; let p = base; const n = 13, largo = 3.7, inflada = 1 + s.arco * 1.1;
      for (let i = 0; i < n; i++) {
        const onda = Math.sin(s.reloj * (galope ? 10 : 3) - i * 0.5) * (0.02 + i * 0.008) * (1 - s.arco * 0.7) + (i > 7 ? latigo : 0);
        ang += curva + onda;
        const q = { x: p.x + largo * Math.cos(ang), y: p.y + largo * Math.sin(ang) };
        hueso(p, q, (4.6 - i * 0.2) * inflada, (4.4 - i * 0.2) * inflada);
        p = q;
      }

      // torso
      const lomo = 2 + s.arco * 14 + Math.max(0, flex) * 7 - Math.max(0, -flex) * 2.5;
      const anca = { x: cadera.x - 4, y: cadera.y - 9 }, cruz = { x: hombro.x - 3, y: hombro.y - 10 - escap };
      const medio = { x: (anca.x + cruz.x) / 2, y: (anca.y + cruz.y) / 2 - lomo };
      ctx.fillStyle = NOCHE; ctx.beginPath();
      ctx.moveTo(cadera.x - 5, cadera.y + 9);
      ctx.quadraticCurveTo(cadera.x - 15, cadera.y - 2, anca.x, anca.y);
      ctx.quadraticCurveTo(medio.x, medio.y, cruz.x, cruz.y);
      ctx.quadraticCurveTo(hombro.x + 10, hombro.y - 6, hombro.x + 10, hombro.y + 4);
      ctx.quadraticCurveTo(hombro.x + 9, hombro.y + 13, hombro.x - 1, hombro.y + 13);
      ctx.bezierCurveTo(hombro.x - 13, hombro.y + 13 - s.arco * 2, cadera.x + 13, cadera.y + 4 - Math.max(0, -flex) * 2, cadera.x - 5, cadera.y + 9);
      ctx.fill();
      if (s.arco > 0.25) {
        ctx.strokeStyle = NOCHE; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        for (let i = 1; i < 11; i++) { const t = i / 11; const x = lerp(lerp(anca.x, medio.x, t), lerp(medio.x, cruz.x, t), t), y = lerp(lerp(anca.y, medio.y, t), lerp(medio.y, cruz.y, t), t); ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + (i % 2 ? 1.5 : -1), y - 4 * s.arco); ctx.stroke(); }
      }
      ctx.beginPath(); ctx.ellipse(cadera.x - 1, cadera.y + 2, 10.5, 12, 0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hombro.x, hombro.y + 1 - escap * 0.5, 7, 10, -0.15, 0, TAU); ctx.fill();

      PATAS.filter((q) => q.cerca).forEach((q) => pata(q, q.tr ? cadera : hombro));

      const quieto = s.modo === 'quieto' ? 1 : 0;
      const cab = {
        x: hombro.x + 13 + (galope ? 4 * a : 0) - s.arco * 3,
        y: HOMBRO.y - 8 - quieto * 4 + (galope ? 3 * a : 0) + s.arco * 7 + yH * 0.3 + Math.sin(s.reloj * 0.9) * quieto * 0.8,
      };
      ctx.fillStyle = NOCHE;
      hueso({ x: hombro.x + 1, y: hombro.y - 4 - escap * 0.5 }, { x: cab.x - 3, y: cab.y + 1 }, 13, 10);
      cabeza(cab, galope, a);
      ctx.restore();
    }

    function cabeza(c, galope, a) {
      const atras = s.arco * 6 + (galope ? a * 3.5 : 0) + (s.oreja > 0 ? 2.5 * Math.sin((s.oreja / 0.25) * Math.PI) : 0);
      ctx.fillStyle = LEJOS; ctx.beginPath(); ctx.moveTo(c.x - 1, c.y - 6); ctx.lineTo(c.x + 3 - atras * 0.7, c.y - 17 + atras * 0.8); ctx.lineTo(c.x + 6, c.y - 4); ctx.fill();
      ctx.fillStyle = NOCHE;
      ctx.beginPath(); ctx.arc(c.x, c.y, 8.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + 7.2, c.y + 2.6, 5.2, 3.9, 0.12, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(c.x - 7.5, c.y + 1); ctx.lineTo(c.x - 11, c.y + 5); ctx.lineTo(c.x - 5, c.y + 5); ctx.lineTo(c.x - 7.5, c.y + 8.5); ctx.lineTo(c.x - 1.5, c.y + 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(c.x - 6, c.y - 4.5); ctx.lineTo(c.x - 4.5 - atras, c.y - 18.5 + atras); ctx.lineTo(c.x + 1.6, c.y - 7); ctx.fill();
      ctx.strokeStyle = MENTA; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c.x - 3.8, c.y - 7); ctx.lineTo(c.x - 4 - atras * 0.9, c.y - 14.5 + atras * 0.9); ctx.lineTo(c.x - 0.8, c.y - 8.2); ctx.stroke();
      const cierre = s.parpadeo > 0 ? 0.12 : s.arco > 0.3 ? 0.6 : 1;
      ctx.save(); ctx.translate(c.x + 3.6, c.y - 1.2); ctx.rotate(-0.36);
      ctx.shadowColor = s.arco > 0.3 ? AMBAR : MENTA; ctx.shadowBlur = 6;
      ctx.fillStyle = s.arco > 0.3 ? AMBAR : MENTA; ctx.beginPath(); ctx.ellipse(0, 0, 3.1, 1.8 * cierre, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = NOCHE; ctx.beginPath(); ctx.ellipse(0.5, 0, 0.65, 1.6 * cierre, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = MENTA; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c.x - 0.5, c.y - 4.6); ctx.lineTo(c.x + 6.8, c.y - 2.7); ctx.stroke();
      ctx.fillStyle = MENTA; ctx.beginPath(); ctx.moveTo(c.x + 11.6, c.y + 0.6); ctx.lineTo(c.x + 12.9, c.y + 2); ctx.lineTo(c.x + 11.2, c.y + 2.3); ctx.fill();
      if (s.arco > 0.3) {
        ctx.fillStyle = '#3A0E0E'; ctx.beginPath(); ctx.moveTo(c.x + 5, c.y + 4.2); ctx.lineTo(c.x + 12.4, c.y + 3.8); ctx.lineTo(c.x + 8.6, c.y + 8.2); ctx.fill();
        ctx.fillStyle = CLARO; ctx.beginPath(); ctx.moveTo(c.x + 10.2, c.y + 3.9); ctx.lineTo(c.x + 10.9, c.y + 6.5); ctx.lineTo(c.x + 11.6, c.y + 3.8); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(166,239,226,.5)'; ctx.lineWidth = 0.6;
      [[-1, 1.8], [0, 3.1], [1, 4.3]].forEach(([d, y]) => { ctx.beginPath(); ctx.moveTo(c.x + 9.5, c.y + y); ctx.lineTo(c.x + 21, c.y + y + d * 2.6 - s.arco * 2); ctx.stroke(); });
    }

    /* ---------- tocar al gato ---------- */
    const cerca = (e) => { const r = tira.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; return [px, s.modo !== 'fuera' && Math.abs(px - xPantalla()) < 50 * esc && py > H - 80 * esc]; };
    tira.addEventListener('pointerdown', (e) => { const [px, ok] = cerca(e); if (ok) bufar(px); });
    tira.addEventListener('pointermove', (e) => { tira.style.cursor = cerca(e)[1] ? 'pointer' : ''; });

    /* ---------- bucle solo mientras se ve ---------- */
    let visible = false, ultimo = 0, raf = 0;
    function bucle(ts) {
      const dt = Math.min(0.04, (ts - (ultimo || ts)) / 1000); ultimo = ts;
      paso(dt); dibujar();
      raf = visible && !document.hidden ? requestAnimationFrame(bucle) : 0;
    }
    function arrancar() { if (!raf && visible && !document.hidden) { ultimo = 0; raf = requestAnimationFrame(bucle); } }
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; arrancar(); }, { rootMargin: '60px' }).observe(tira);
    document.addEventListener('visibilitychange', arrancar);
    tira._gato = { s, pies, paso, dibujar, entrar };
  }

  function montar() { document.querySelectorAll('[data-gato-corre]').forEach((t) => { if (!t.dataset.listo) { t.dataset.listo = '1'; Gato(t); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
