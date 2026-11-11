/* Gatoarisco · gato que camina y galopa sobre el borde de una sección.
   Cinemática de gato real: marcha lateral de 4 tiempos, galope rotatorio con flexión de columna,
   patas digitígradas (corvejón atrás, codo atrás), cola como contrapeso. Si lo tocas, se eriza y bufa. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const NOCHE = '#0B1A2A', LEJOS = '#2A4257', MENTA = '#73D8C7', CLARO = '#E8FFFA';
  const TAU = Math.PI * 2;
  // Fases de cada pata: ti/td = trasera izquierda/derecha, di/dd = delantera izquierda/derecha.
  const MARCHAS = {
    paso: { T: 0.86, apoyo: 0.62, zancada: 24, alza: 7, fase: { ti: 0, di: 0.25, td: 0.5, dd: 0.75 }, flex: 0.12, rebote: 1.1 },
    galope: { T: 0.42, apoyo: 0.36, zancada: 54, alza: 13, fase: { ti: 0, td: 0.09, dd: 0.5, di: 0.6 }, flex: 1, rebote: 4.5 },
  };
  const CADERA = { x: -27, y: -36 }, HOMBRO = { x: 25, y: -38 };
  const FRASES = ['¡Fsss!', '¡Ni lo pienses!', '¡Fsss! Mío.', 'Arisco, no antipático.'];

  const lerp = (a, b, k) => a + (b - a) * k;
  function ik(r, t, a, b, signo) {
    const dx = t.x - r.x, dy = t.y - r.y;
    const d = Math.min(Math.hypot(dx, dy), a + b - 0.01);
    const base = Math.atan2(dy, dx);
    const A = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const ang = base + signo * A;
    const j = { x: r.x + a * Math.cos(ang), y: r.y + a * Math.sin(ang) };
    const ang2 = Math.atan2(t.y - j.y, t.x - j.x);
    return [j, { x: j.x + b * Math.cos(ang2), y: j.y + b * Math.sin(ang2) }];
  }

  function Gato(tira) {
    const cv = document.createElement('canvas');
    cv.className = 'gato-corre-lienzo'; cv.setAttribute('aria-hidden', 'true');
    const globo = document.createElement('p'); globo.className = 'globo-corre'; globo.setAttribute('role', 'status');
    tira.append(cv, globo);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, esc = 1, dpr = 1;
    const s = { x: -200, dir: 1, t: 0, amp: 0, ampObj: 0, marcha: 'paso', arco: 0, arcoObj: 0, modo: 'fuera', espera: 1.2, parada: 0, quieto: 0, reloj: 0, mira: 0, parpadeo: 0 };

    function medir() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = tira.clientWidth; H = tira.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      esc = W < 600 ? 0.82 : 1.08;
    }
    medir();
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(tira);

    function entrar() {
      s.dir = Math.random() < 0.6 ? 1 : -1;
      s.x = s.dir > 0 ? -90 * esc : W + 90 * esc;
      s.atraviesa = Math.random() < 0.25;           // a veces cruza galopando sin parar
      s.marcha = s.atraviesa ? 'galope' : 'paso';
      s.parada = W * (0.3 + Math.random() * 0.4);
      s.ampObj = 1; s.modo = 'entra';
    }

    function bufar(px) {
      if (s.modo === 'bufa' || s.modo === 'fuera') return;
      s.modo = 'bufa'; s.quieto = 1.15; s.ampObj = 0; s.arcoObj = 1;
      s.huyeA = px == null ? s.dir : (px < s.x ? 1 : -1);
      decir(FRASES[Math.floor(Math.random() * FRASES.length)]);
      if (window.gatoBufido) window.gatoBufido();
    }
    let tGlobo;
    function decir(txt) {
      globo.textContent = txt; globo.classList.add('ver');
      globo.style.left = Math.max(10, Math.min(W - 170, s.x - 40)) + 'px';
      clearTimeout(tGlobo); tGlobo = setTimeout(() => globo.classList.remove('ver'), 1600);
    }

    function paso(dt) {
      s.reloj += dt;
      const M = MARCHAS[s.marcha];
      s.amp += (s.ampObj - s.amp) * Math.min(1, dt * (s.modo === 'bufa' ? 9 : 3.2));
      s.arco += (s.arcoObj - s.arco) * Math.min(1, dt * 7);
      if (s.amp > 0.02) s.t = (s.t + dt / M.T) % 1;
      const v = s.amp * (M.zancada / (M.apoyo * M.T)) * esc;
      s.x += v * dt * s.dir;
      s.parpadeo = Math.max(0, s.parpadeo - dt);
      if (Math.random() < dt * 0.35) s.parpadeo = 0.13;

      switch (s.modo) {
        case 'fuera':
          s.espera -= dt; if (s.espera <= 0) entrar(); break;
        case 'entra':
          if (!s.atraviesa && (s.dir > 0 ? s.x > s.parada - 30 : s.x < s.parada + 30)) s.ampObj = 0;
          if (!s.atraviesa && s.amp < 0.03 && s.ampObj === 0) { s.modo = 'quieto'; s.quieto = 2.2 + Math.random() * 2; }
          if (s.atraviesa) fueraDePantalla();
          break;
        case 'quieto':
          s.quieto -= dt; s.mira = Math.sin(s.reloj * 1.3) * 0.5 + 0.5;
          if (s.quieto <= 0) { s.marcha = 'galope'; s.t = 0; s.ampObj = 1; s.modo = 'sale'; }
          break;
        case 'bufa':
          s.quieto -= dt;
          if (s.quieto <= 0) { s.arcoObj = 0; s.dir = s.huyeA; s.marcha = 'galope'; s.t = 0; s.ampObj = 1; s.modo = 'sale'; }
          break;
        case 'sale':
          fueraDePantalla(); break;
      }
    }
    function fueraDePantalla() {
      if (s.x < -120 * esc || s.x > W + 120 * esc) { s.modo = 'fuera'; s.espera = 9 + Math.random() * 10; s.amp = s.ampObj = 0; s.arco = s.arcoObj = 0; }
    }

    /* ---------- dibujo ---------- */
    function pata(trasera, clave, M, raiz, cerca) {
      const raiz0 = trasera ? CADERA.x : HOMBRO.x;
      const f = (s.t + M.fase[clave]) % 1;
      let fx, fy = 0, pliegue;
      if (f < M.apoyo) { const u = f / M.apoyo; fx = M.zancada / 2 - M.zancada * u; pliegue = 0; }
      else { const u = (f - M.apoyo) / (1 - M.apoyo); const e = u * u * (3 - 2 * u); fx = -M.zancada / 2 + M.zancada * e; fy = -M.alza * Math.sin(Math.PI * u); pliegue = Math.sin(Math.PI * u); }
      const pie = { x: raiz0 + 2 + fx * s.amp, y: fy * s.amp };
      ctx.strokeStyle = cerca ? NOCHE : LEJOS; ctx.fillStyle = ctx.strokeStyle;
      if (trasera) {
        const a = 0.4 + pliegue * 0.32 * s.amp;                 // inclinación del metatarso (corvejón atrás)
        const corvejon = { x: pie.x - 13 * Math.sin(a), y: pie.y - 13 * Math.cos(a) };
        const [rodilla, fin] = ik(raiz, corvejon, 20, 20, -1);  // rodilla hacia adelante
        seg(raiz, rodilla, 10); seg(rodilla, fin, 6.5); seg(fin, pie, 4.6);
      } else {
        const muneca = { x: pie.x + 1.5 - pliegue * 3 * s.amp, y: pie.y - 6 + pliegue * 1.5 * s.amp };
        const [codo, fin] = ik(raiz, muneca, 17, 18, 1);         // codo hacia atrás
        seg(raiz, codo, 8.5); seg(codo, fin, 5.6); seg(fin, pie, 4.6);
      }
      ctx.beginPath(); ctx.ellipse(pie.x + 2, pie.y - 1.6, 3.6, 2.2, 0, 0, TAU); ctx.fill();
    }
    function seg(a, b, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    function dibujar() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (s.modo === 'fuera') return;
      const M = MARCHAS[s.marcha], a = s.amp, galope = s.marcha === 'galope';
      const ciclo = TAU * s.t;
      const flex = M.flex * a * Math.cos(ciclo - 0.6);                      // >0 recogido, <0 extendido
      const rebote = galope ? -M.rebote * a * Math.pow(Math.max(0, Math.sin(ciclo - 1.1)), 2) : -M.rebote * a * 0.5 * (1 - Math.cos(2 * ciclo));
      const cabeceo = galope ? 3.2 * a * Math.sin(ciclo) : 0;
      const respira = (1 - a) * Math.sin(s.reloj * 2.4) * 0.6;
      const cadera = { x: CADERA.x + flex * 11, y: CADERA.y + rebote + cabeceo - s.arco * 6 + respira * 0.3 };
      const hombro = { x: HOMBRO.x - flex * 7, y: HOMBRO.y + rebote - cabeceo - s.arco * 3 + respira * 0.3 };

      ctx.save();
      ctx.translate(s.x, H - 1); ctx.scale(s.dir * esc, esc);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // sombra en el borde
      ctx.fillStyle = 'rgba(11,26,42,.10)'; ctx.beginPath(); ctx.ellipse(0, 0.5, 34 + a * 6, 2.2, 0, 0, TAU); ctx.fill();

      // patas del lado lejano
      pata(true, 'td', M, { x: cadera.x + 2, y: cadera.y }, false);
      pata(false, 'dd', M, { x: hombro.x - 1, y: hombro.y }, false);

      // cola: contrapeso que ondula con la marcha
      const base = { x: cadera.x - 9, y: cadera.y - 7 };
      let ang = galope ? Math.PI - 0.05 + 0.25 * Math.sin(ciclo + 1) * a : Math.PI + 0.35 - 0.25 * (1 - a) * (0.5 + 0.5 * Math.sin(s.reloj * 1.7));
      ang = lerp(ang, Math.PI + 1.4, s.arco);
      const curva = galope ? 0.015 : lerp(-0.11, -0.06, 1 - a);
      let p = base; const n = 11, largo = 4.1, grosor = 1 + s.arco * 0.9;
      ctx.strokeStyle = NOCHE;
      for (let i = 0; i < n; i++) {
        const onda = Math.sin(s.reloj * (galope ? 9 : 3.2) - i * 0.55) * (0.05 + i * 0.012) * (s.arco ? 0.3 : 1);
        ang += curva + onda;
        const q = { x: p.x + largo * Math.cos(ang), y: p.y + largo * Math.sin(ang) };
        ctx.lineWidth = (5.4 - i * 0.3) * grosor; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        p = q;
      }
      // pelo erizado en la cola al bufar
      if (s.arco > 0.3) { ctx.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const k = i / 8; const x = lerp(base.x, p.x, k), y = lerp(base.y, p.y, k); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (i % 2 ? 5 : -5) * s.arco, y - 2); ctx.stroke(); } }

      // torso con columna flexible
      const lomo = 3 + s.arco * 15 + Math.max(0, flex) * 7 - Math.max(0, -flex) * 3;
      const ancaArriba = { x: cadera.x - 5, y: cadera.y - 10 }, cruz = { x: hombro.x - 2, y: hombro.y - 11 };
      const medio = { x: (ancaArriba.x + cruz.x) / 2, y: (ancaArriba.y + cruz.y) / 2 - lomo };
            ctx.fillStyle = NOCHE; ctx.beginPath();
      ctx.moveTo(cadera.x - 6, cadera.y + 10);                                         // nalga
      ctx.quadraticCurveTo(cadera.x - 17, cadera.y - 3, ancaArriba.x, ancaArriba.y);     // anca redonda
      ctx.quadraticCurveTo(medio.x, medio.y, cruz.x, cruz.y);                           // columna
      ctx.quadraticCurveTo(hombro.x + 12, hombro.y - 7, hombro.x + 12, hombro.y + 5);   // pecho
      ctx.quadraticCurveTo(hombro.x + 10, hombro.y + 16, hombro.x - 1, hombro.y + 15);  // esternón profundo
      ctx.bezierCurveTo(hombro.x - 15, hombro.y + 15 - s.arco * 3, cadera.x + 15, cadera.y + 4 - Math.max(0, -flex) * 2, cadera.x - 6, cadera.y + 10); // cintura recogida
      ctx.fill();
      if (s.arco > 0.3) { ctx.strokeStyle = NOCHE; ctx.lineWidth = 1.3; for (let i = 1; i < 10; i++) { const k = i / 10; const x = lerp(ancaArriba.x, cruz.x, k); const y = lerp(lerp(ancaArriba.y, medio.y, k), lerp(medio.y, cruz.y, k), k); ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + 1.5, y - 4.5 * s.arco); ctx.stroke(); } }
      // muslo y escápula
      ctx.beginPath(); ctx.ellipse(cadera.x - 1, cadera.y + 3, 11.5, 13.5, 0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hombro.x + 1, hombro.y + 2, 8, 11, -0.2, 0, TAU); ctx.fill();

      // patas del lado cercano
      pata(true, 'ti', M, cadera, true);
      pata(false, 'di', M, hombro, true);

      // cuello y cabeza (estable: el gato fija la mirada aunque el cuerpo rebote)
      const cab = { x: hombro.x + 17 - s.arco * 3 + (galope ? 3 * a : 0), y: HOMBRO.y - 15 + rebote * 0.35 + s.arco * 9 + (galope ? 5 * a : 0) };
      ctx.strokeStyle = NOCHE; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(hombro.x + 2, hombro.y - 5); ctx.lineTo(cab.x - 4, cab.y + 2); ctx.stroke();
      cabeza(cab, galope);
      ctx.restore();
    }

    function cabeza(c, galope) {
      const atras = s.arco * 7 + (galope ? s.amp * 3 : 0);       // orejas hacia atrás al bufar o correr
      // oreja lejana
      ctx.fillStyle = LEJOS; ctx.beginPath(); ctx.moveTo(c.x - 1, c.y - 7); ctx.lineTo(c.x + 4 - atras * 0.8, c.y - 20 + atras * 0.9); ctx.lineTo(c.x + 7, c.y - 5); ctx.fill();
      // cráneo y hocico
      ctx.fillStyle = NOCHE;
      ctx.beginPath(); ctx.arc(c.x, c.y, 9.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + 8.5, c.y + 3, 6.2, 4.6, 0.12, 0, TAU); ctx.fill();
      // mejilla con pelo en punta (como el logo)
      ctx.beginPath(); ctx.moveTo(c.x - 9, c.y + 1); ctx.lineTo(c.x - 13, c.y + 6); ctx.lineTo(c.x - 6, c.y + 6); ctx.lineTo(c.x - 9, c.y + 10); ctx.lineTo(c.x - 2, c.y + 8); ctx.fill();
      // oreja cercana con su borde menta
      ctx.beginPath(); ctx.moveTo(c.x - 7, c.y - 5); ctx.lineTo(c.x - 5 - atras, c.y - 22 + atras); ctx.lineTo(c.x + 2, c.y - 8); ctx.fill();
      ctx.strokeStyle = MENTA; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x - 4.5, c.y - 8); ctx.lineTo(c.x - 4.6 - atras * 0.9, c.y - 17 + atras * 0.9); ctx.lineTo(c.x - 1, c.y - 9.5); ctx.stroke();
      // ojo almendrado con ceño
      const cierre = s.parpadeo > 0 ? 0.15 : s.arco > 0.3 ? 0.65 : 1;
      ctx.save(); ctx.translate(c.x + 4.2, c.y - 1.5); ctx.rotate(-0.38);
      ctx.shadowColor = MENTA; ctx.shadowBlur = 7;
      ctx.fillStyle = s.arco > 0.3 ? '#FFB547' : MENTA; ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.1 * cierre, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = NOCHE; ctx.beginPath(); ctx.ellipse(0.6 + s.mira * 0.8, 0, 0.75, 1.9 * cierre, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = MENTA; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(c.x - 0.5, c.y - 5.5); ctx.lineTo(c.x + 8, c.y - 3.2); ctx.stroke();
      // nariz, boca y colmillo al bufar
      ctx.fillStyle = MENTA; ctx.beginPath(); ctx.moveTo(c.x + 13.5, c.y + 0.6); ctx.lineTo(c.x + 15, c.y + 2.2); ctx.lineTo(c.x + 13, c.y + 2.6); ctx.fill();
      if (s.arco > 0.3) {
        ctx.fillStyle = '#3A0E0E'; ctx.beginPath(); ctx.moveTo(c.x + 6, c.y + 5); ctx.lineTo(c.x + 14.5, c.y + 4.4); ctx.lineTo(c.x + 10, c.y + 9.5); ctx.fill();
        ctx.fillStyle = CLARO; ctx.beginPath(); ctx.moveTo(c.x + 12, c.y + 4.6); ctx.lineTo(c.x + 12.8, c.y + 7.6); ctx.lineTo(c.x + 13.6, c.y + 4.5); ctx.fill();
      }
      // bigotes
      ctx.strokeStyle = 'rgba(166,239,226,.55)'; ctx.lineWidth = 0.7;
      [[-1, 2], [0, 3.6], [1, 5]].forEach(([d, y]) => { ctx.beginPath(); ctx.moveTo(c.x + 11, c.y + y); ctx.lineTo(c.x + 24, c.y + y + d * 3 - (s.arco * 2)); ctx.stroke(); });
    }

    /* ---------- tocar al gato ---------- */
    tira.addEventListener('pointerdown', (e) => {
      const r = tira.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      if (Math.abs(px - s.x) < 55 * esc && py > H - 90 * esc) bufar(px);
    });
    tira.addEventListener('pointermove', (e) => {
      const r = tira.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      tira.style.cursor = Math.abs(px - s.x) < 55 * esc && py > H - 90 * esc && s.modo !== 'fuera' ? 'pointer' : '';
    });

    /* ---------- bucle solo mientras se ve ---------- */
    let visible = false, ultimo = 0, raf = 0;
    function bucle(ts) {
      const dt = Math.min(0.05, (ts - (ultimo || ts)) / 1000); ultimo = ts;
      paso(dt); dibujar();
      raf = visible && !document.hidden ? requestAnimationFrame(bucle) : 0;
    }
    function arrancar() { if (!raf && visible && !document.hidden) { ultimo = 0; raf = requestAnimationFrame(bucle); } }
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; arrancar(); }, { rootMargin: '60px' }).observe(tira);
    document.addEventListener('visibilitychange', arrancar);
  }

  function montar() { document.querySelectorAll('[data-gato-corre]').forEach((t) => { if (!t.dataset.listo) { t.dataset.listo = '1'; Gato(t); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
