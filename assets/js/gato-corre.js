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

    // pelo: valores fijos por posición para que no titile
    const PELO = Array.from({ length: 64 }, (_, i) => 0.6 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.8);
    let pielCerca, pielLejos;
    function pieles() {
      pielCerca = ctx.createLinearGradient(0, -58, 0, 2);
      pielCerca.addColorStop(0, '#2A4359'); pielCerca.addColorStop(0.35, '#16293B'); pielCerca.addColorStop(0.75, '#0B1A2A'); pielCerca.addColorStop(1, '#060F18');
      pielLejos = ctx.createLinearGradient(0, -50, 0, 2);
      pielLejos.addColorStop(0, '#1F3447'); pielLejos.addColorStop(1, '#0E1C29');
    }
    // mechones: triángulos finos a lo largo de una curva, apuntando hacia "n"
    function mechones(puntos, nx, ny, largo, semilla, ancho = 1.6) {
      puntos.forEach((p, i) => {
        const l = largo * PELO[(semilla + i) % PELO.length], ang = Math.atan2(ny, nx) + (PELO[(semilla + i * 3) % PELO.length] - 1) * 0.5;
        ctx.beginPath(); ctx.moveTo(p.x - ny * ancho, p.y + nx * ancho); ctx.lineTo(p.x + Math.cos(ang) * l, p.y + Math.sin(ang) * l); ctx.lineTo(p.x + ny * ancho, p.y - nx * ancho); ctx.fill();
      });
    }
    const bez = (a, b, c, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * b.x + t * t * c.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * b.y + t * t * c.y });
    const cub = (a, b, c, d, t) => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y }; };

    function pata({ k, tr, cerca }, raiz) {
      const p = pies[k];
      const pie = { x: p.x - s.d, y: p.y };
      ctx.fillStyle = cerca ? pielCerca : pielLejos;
      const enAire = p.estado === 'aire', u = p.u;
      if (tr) {
        const atras = clamp((raiz.x - pie.x - 4) / 26, 0, 1);
        const a = enAire ? 0.45 + (s.marcha === 'galope' ? 0.5 : 0.8) * Math.sin(Math.PI * Math.min(1, u * 1.15)) : 0.32 + atras * 0.55;
        const corvejon = { x: pie.x - 11 * Math.sin(a), y: pie.y - 11 * Math.cos(a) };
        const [rodilla, fin] = ik(raiz, corvejon, 16, 17, -1);
        hueso(raiz, rodilla, cerca ? 14 : 11, 7.6); hueso(rodilla, fin, 7.4, 4.3); hueso(fin, pie, 4.1, 3.5);
        // "pantalones": pelo largo detrás del muslo
        if (cerca) { const n = { x: -(rodilla.y - raiz.y), y: rodilla.x - raiz.x }; const m = Math.hypot(n.x, n.y) || 1; mechones([0.2, 0.35, 0.5, 0.65, 0.8].map((t) => ({ x: lerp(raiz.x, rodilla.x, t) - 5.5 * n.x / m, y: lerp(raiz.y, rodilla.y, t) - 5.5 * n.y / m })), -n.x / m, -n.y / m, 2.8, 3, 1.1); }
        ctx.beginPath(); ctx.ellipse(pie.x + 2.2, pie.y - 1.6, 4.4, 2.4, 0, 0, TAU); ctx.fill();
              } else {
        const giro = enAire ? -1.25 * Math.sin(Math.PI * Math.min(1, u * 1.35)) : 0;
        const vx = -0.9, vy = -4.6;
        const muneca = { x: pie.x + vx * Math.cos(giro) - vy * Math.sin(giro), y: pie.y + vx * Math.sin(giro) + vy * Math.cos(giro) };
        const [codo, fin] = ik(raiz, muneca, 15, 16, 1);
        hueso(raiz, codo, cerca ? 10.5 : 8.5, 6.2); hueso(codo, fin, 5.8, 4.1);
        const dedos = { x: muneca.x + 4.6 * Math.sin(-giro * 0.9 + 0.25), y: muneca.y + 4.6 * Math.cos(-giro * 0.9 + 0.25) };
        hueso(fin, dedos, 4.1, 3.4);
        ctx.beginPath(); ctx.ellipse(dedos.x + 1.8, dedos.y - 0.7, 4, 2.2, enAire ? giro * 0.6 : 0, 0, TAU); ctx.fill();
        if (cerca) mechones([{ x: codo.x - 2.5, y: codo.y + 1 }, { x: codo.x - 2, y: codo.y + 3 }], -1, 0.4, 3, 11);   // mechón del codo
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
      pieles();

      const sombra = ctx.createRadialGradient(0, 0, 2, 0, 0, 38 + a * 8);
      sombra.addColorStop(0, 'rgba(11,26,42,.22)'); sombra.addColorStop(1, 'rgba(11,26,42,0)');
      ctx.fillStyle = sombra; ctx.beginPath(); ctx.ellipse(0, 0.6, 38 + a * 8, 3, 0, 0, TAU); ctx.fill();

      PATAS.filter((q) => !q.cerca).forEach((q) => pata(q, q.tr ? { x: cadera.x + 3, y: cadera.y + 1 } : { x: hombro.x - 2, y: hombro.y + 1 }));

      // cola con pelo
      const base = { x: cadera.x - 8, y: cadera.y - 6 };
      let ang, curva;
      if (galope) { ang = Math.PI + 0.12 + 0.16 * Math.sin(c + 1.2) * a; curva = 0.012; }
      else if (s.modo === 'quieto') { ang = Math.PI - 0.55; curva = 0.115; }
      else { ang = Math.PI - 0.38 + 0.05 * Math.sin(c * 2); curva = 0.085; }
      ang = lerp(ang, Math.PI + 1.45, s.arco); curva = lerp(curva, -0.02, s.arco);
      const latigo = s.modo === 'quieto' ? Math.sin(s.reloj * 2.6) * 0.16 : 0;
      ctx.fillStyle = pielCerca; let p = base; const n = 13, largo = 3.7, inflada = 1 + s.arco * 1.1;
      const cola = [p];
      for (let i = 0; i < n; i++) {
        const onda = Math.sin(s.reloj * (galope ? 10 : 3) - i * 0.5) * (0.02 + i * 0.008) * (1 - s.arco * 0.7) + (i > 7 ? latigo : 0);
        ang += curva + onda;
        const q = { x: p.x + largo * Math.cos(ang), y: p.y + largo * Math.sin(ang) };
        hueso(p, q, (4.8 - i * 0.2) * inflada, (4.6 - i * 0.2) * inflada);
        cola.push(q); p = q;
      }
      for (let i = 1; i < cola.length - 1; i++) {
        for (let j = 0; j < 2; j++) {
          const t = j / 2, A = cola[i], B = cola[i + 1] || A;
          const P = { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) };
          const dx = cola[i + 1].x - cola[i - 1].x, dy = cola[i + 1].y - cola[i - 1].y, m = Math.hypot(dx, dy) || 1, w = (4.8 - i * 0.2) * inflada / 2;
          const atrasX = -dx / m * 0.6, atrasY = -dy / m * 0.6;   // el pelo apunta hacia la punta
          mechones([{ x: P.x - dy / m * w * 0.85, y: P.y + dx / m * w * 0.85 }], -dy / m - atrasX, dx / m - atrasY, (0.9 + s.arco * 2.6) * (0.7 + 0.3 * j), 20 + i * 2 + j, 0.7 + s.arco * 0.3);
          mechones([{ x: P.x + dy / m * w * 0.85, y: P.y - dx / m * w * 0.85 }], dy / m - atrasX, -dx / m - atrasY, (0.8 + s.arco * 2.6) * (0.7 + 0.3 * j), 41 + i * 2 + j, 0.7 + s.arco * 0.3);
        }
      }

      // torso
      const lomo = 2 + s.arco * 14 + Math.max(0, flex) * 7 - Math.max(0, -flex) * 2.5;
      const anca = { x: cadera.x - 4, y: cadera.y - 9 }, cruz = { x: hombro.x - 3, y: hombro.y - 10 - escap };
      const medio = { x: (anca.x + cruz.x) / 2, y: (anca.y + cruz.y) / 2 - lomo };
      const pecho = { x: hombro.x - 1, y: hombro.y + 13 }, ijada = { x: cadera.x - 5, y: cadera.y + 9 };
      const v1 = { x: hombro.x - 13, y: hombro.y + 13 - s.arco * 2 }, v2 = { x: cadera.x + 13, y: cadera.y + 4 - Math.max(0, -flex) * 2 };
      ctx.fillStyle = pielCerca; ctx.beginPath();
      ctx.moveTo(ijada.x, ijada.y);
      ctx.quadraticCurveTo(cadera.x - 15, cadera.y - 2, anca.x, anca.y);
      ctx.quadraticCurveTo(medio.x, medio.y, cruz.x, cruz.y);
      ctx.quadraticCurveTo(hombro.x + 10, hombro.y - 6, hombro.x + 10, hombro.y + 4);
      ctx.quadraticCurveTo(hombro.x + 9, hombro.y + 13, pecho.x, pecho.y);
      ctx.bezierCurveTo(v1.x, v1.y, v2.x, v2.y, ijada.x, ijada.y);
      ctx.fill();
      // pelo del pecho y la barriga
      mechones([0, 1, 2, 3, 4, 5].map((i) => ({ x: hombro.x + 9.5 - i * 1, y: hombro.y + 4 + i * 1.8 })), 0.75, 0.7, 2.6, 5, 1);
      mechones([0.08, 0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71].map((t) => cub(pecho, v1, v2, ijada, t)), -0.3, 1, 2.1 + s.arco * 1.5, 8, 1.1);
      // lomo erizado al bufar
      if (s.arco > 0.15) mechones(Array.from({ length: 22 }, (_, i) => bez(anca, medio, cruz, (i + 0.5) / 22)), 0.15, -1, 4.6 * s.arco, 30, 0.9);
      // masas musculares (muslo y escápula)
      ctx.fillStyle = pielCerca;
      ctx.beginPath(); ctx.ellipse(cadera.x - 1, cadera.y + 2, 10.5, 12.5, 0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hombro.x, hombro.y + 1 - escap * 0.5, 7.2, 10.5, -0.15, 0, TAU); ctx.fill();
      const brillo = (x, y, r) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(150,205,215,.09)'); g.addColorStop(0.6, 'rgba(150,205,215,.04)'); g.addColorStop(1, 'rgba(150,205,215,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
      brillo(cadera.x - 3, cadera.y - 4, 13); brillo(hombro.x - 1, hombro.y - 4 - escap, 10);
      // luz de borde menta sobre el lomo
      const rim = ctx.createLinearGradient(anca.x - 8, 0, cruz.x + 8, 0);
      rim.addColorStop(0, 'rgba(166,239,226,0)'); rim.addColorStop(0.5, 'rgba(166,239,226,.55)'); rim.addColorStop(1, 'rgba(166,239,226,.15)');
      ctx.strokeStyle = rim; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cadera.x - 13, cadera.y - 4); ctx.quadraticCurveTo(cadera.x - 12, cadera.y - 8, anca.x, anca.y); ctx.quadraticCurveTo(medio.x, medio.y, cruz.x, cruz.y); ctx.stroke();

      PATAS.filter((q) => q.cerca).forEach((q) => pata(q, q.tr ? cadera : hombro));

      const quieto = s.modo === 'quieto' ? 1 : 0;
      const cab = {
        x: hombro.x + 13 + (galope ? 4 * a : 0) - s.arco * 3,
        y: HOMBRO.y - 8 - quieto * 4 + (galope ? 3 * a : 0) + s.arco * 7 + yH * 0.3 + Math.sin(s.reloj * 0.9) * quieto * 0.8,
      };
      ctx.fillStyle = pielCerca;
      hueso({ x: hombro.x + 1, y: hombro.y - 4 - escap * 0.5 }, { x: cab.x - 3, y: cab.y + 1 }, 13.5, 10.5);
      mechones([{ x: cab.x - 2, y: cab.y + 8 }, { x: cab.x - 5, y: cab.y + 9 }, { x: hombro.x + 6, y: hombro.y + 1 }], 0.3, 1, 3, 14);   // gorguera del cuello
      cabeza(cab, galope, a);
      ctx.restore();
    }

    function cabeza(c, galope, a) {
      const atras = s.arco * 6 + (galope ? a * 3.5 : 0) + (s.oreja > 0 ? 2.5 * Math.sin((s.oreja / 0.25) * Math.PI) : 0);
      const furia = s.arco > 0.3;
      // oreja lejana
      ctx.fillStyle = pielLejos; ctx.beginPath(); ctx.moveTo(c.x - 0.5, c.y - 6.5); ctx.quadraticCurveTo(c.x + 1, c.y - 13, c.x + 3.2 - atras * 0.7, c.y - 17.5 + atras * 0.8); ctx.quadraticCurveTo(c.x + 5.5, c.y - 10, c.x + 6.5, c.y - 4.5); ctx.fill();
      // cráneo, hocico, mentón y mejilla con pelo (un solo contorno)
      ctx.fillStyle = pielCerca; ctx.beginPath();
      ctx.moveTo(c.x - 8.5, c.y + 2);
      ctx.bezierCurveTo(c.x - 9.5, c.y - 7, c.x - 2, c.y - 10, c.x + 4.5, c.y - 7.4);             // nuca y frente
      ctx.quadraticCurveTo(c.x + 8.5, c.y - 5.6, c.x + 11.2, c.y - 2.2);                            // puente de la nariz
      ctx.quadraticCurveTo(c.x + 13.6, c.y - 0.4, c.x + 13.4, c.y + 1.6);                           // nariz
      ctx.quadraticCurveTo(c.x + 13.2, c.y + 3.8, c.x + 11.6, c.y + 4.2);                           // labio
      if (furia) { ctx.lineTo(c.x + 7.5, c.y + 5); ctx.lineTo(c.x + 10.5, c.y + 9.8); ctx.quadraticCurveTo(c.x + 7, c.y + 11, c.x + 3, c.y + 9.5); }   // mandíbula abierta
      else { ctx.quadraticCurveTo(c.x + 10.4, c.y + 7.4, c.x + 6.4, c.y + 7.6); ctx.quadraticCurveTo(c.x + 3.6, c.y + 8.6, c.x + 1, c.y + 8.4); }
      ctx.lineTo(c.x - 2.5, c.y + 10.8); ctx.lineTo(c.x - 4, c.y + 8.6); ctx.lineTo(c.x - 8.5, c.y + 11); ctx.lineTo(c.x - 8.2, c.y + 7.4);
      ctx.lineTo(c.x - 12.5, c.y + 6.8); ctx.lineTo(c.x - 9.6, c.y + 4.4); ctx.lineTo(c.x - 13, c.y + 2.2); ctx.closePath(); ctx.fill();
      // oreja cercana con interior
      ctx.beginPath(); ctx.moveTo(c.x - 6.8, c.y - 4); ctx.quadraticCurveTo(c.x - 7.4, c.y - 12, c.x - 4.6 - atras, c.y - 19.5 + atras); ctx.quadraticCurveTo(c.x + 0.5, c.y - 13, c.x + 2.2, c.y - 7.2); ctx.fill();
      ctx.fillStyle = '#2C4256'; ctx.beginPath(); ctx.moveTo(c.x - 5, c.y - 6.5); ctx.quadraticCurveTo(c.x - 5.4, c.y - 11.5, c.x - 4.4 - atras * 0.85, c.y - 16.5 + atras * 0.85); ctx.quadraticCurveTo(c.x - 1, c.y - 11.5, c.x + 0.4, c.y - 8); ctx.fill();
      ctx.strokeStyle = 'rgba(166,239,226,.55)'; ctx.lineWidth = 0.45;
      [[-3.8, -8], [-2.6, -8.4], [-1.4, -8.6]].forEach(([x, y], i) => { ctx.beginPath(); ctx.moveTo(c.x + x, c.y + y); ctx.lineTo(c.x + x - 1.6 - atras * 0.4 + i * 0.6, c.y + y - 4.2 + atras * 0.3); ctx.stroke(); });
      ctx.strokeStyle = MENTA; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(c.x - 4.6 - atras, c.y - 19.5 + atras); ctx.quadraticCurveTo(c.x + 0.5, c.y - 13, c.x + 2.2, c.y - 7.2); ctx.stroke();
      // luz de borde en la frente
      ctx.strokeStyle = 'rgba(166,239,226,.45)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(c.x - 7.5, c.y - 3); ctx.bezierCurveTo(c.x - 6.5, c.y - 8, c.x - 1, c.y - 9.6, c.x + 4.5, c.y - 7.4); ctx.stroke();
      // ojo: iris con degradado, pupila vertical, párpado de ceño fruncido
      const cierre = s.parpadeo > 0 ? 0.1 : furia ? 0.62 : 1;
      ctx.save(); ctx.translate(c.x + 4.4, c.y - 1.8); ctx.rotate(-0.32);
      ctx.fillStyle = '#04090E'; ctx.beginPath(); ctx.ellipse(0, 0, 3.7, 2.4 * cierre + 0.3, 0, 0, TAU); ctx.fill();
      const iris = ctx.createRadialGradient(-0.4, -0.4, 0.2, 0, 0, 3.4);
      if (furia) { iris.addColorStop(0, '#FFE2A8'); iris.addColorStop(0.55, AMBAR); iris.addColorStop(1, '#9A5A00'); }
      else { iris.addColorStop(0, '#D9FFF6'); iris.addColorStop(0.5, MENTA); iris.addColorStop(1, '#1F7A6C'); }
      ctx.shadowColor = furia ? AMBAR : MENTA; ctx.shadowBlur = 5;
      ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 2 * cierre, 0, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#03070B'; ctx.beginPath(); ctx.ellipse(0.6, 0, furia ? 0.4 : 0.7, 1.85 * cierre, 0, 0, TAU); ctx.fill();
      if (cierre > 0.3) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(1.3, -0.7 * cierre, 0.45, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = '#04090E'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c.x + 0.2, c.y - 4.2 + (furia ? 0.6 : 0)); ctx.quadraticCurveTo(c.x + 4, c.y - 4.8, c.x + 8, c.y - 2.6); ctx.stroke();
      ctx.strokeStyle = MENTA; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(c.x - 0.6, c.y - 5.2); ctx.lineTo(c.x + 6.6, c.y - 3.6); ctx.stroke();
      // nariz y boca
      ctx.fillStyle = '#1D3A46'; ctx.beginPath(); ctx.moveTo(c.x + 11.6, c.y - 0.2); ctx.quadraticCurveTo(c.x + 13.8, c.y - 0.2, c.x + 13.5, c.y + 1.4); ctx.lineTo(c.x + 12.2, c.y + 1.8); ctx.fill();
      ctx.fillStyle = 'rgba(166,239,226,.6)'; ctx.beginPath(); ctx.arc(c.x + 12.4, c.y + 0.2, 0.35, 0, TAU); ctx.fill();
      if (furia) {
        ctx.fillStyle = '#3B0B12'; ctx.beginPath(); ctx.moveTo(c.x + 11.3, c.y + 4.2); ctx.lineTo(c.x + 7.6, c.y + 5); ctx.lineTo(c.x + 10.1, c.y + 9.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#B8566A'; ctx.beginPath(); ctx.ellipse(c.x + 9.4, c.y + 7.6, 1.6, 0.8, 0.6, 0, TAU); ctx.fill();
        ctx.fillStyle = CLARO; ctx.beginPath(); ctx.moveTo(c.x + 10.4, c.y + 4.3); ctx.lineTo(c.x + 10.9, c.y + 6.9); ctx.lineTo(c.x + 11.4, c.y + 4.2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(c.x + 9.1, c.y + 9.2); ctx.lineTo(c.x + 9.4, c.y + 7.2); ctx.lineTo(c.x + 9.9, c.y + 9.3); ctx.fill();
      } else {
        ctx.strokeStyle = '#04090E'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(c.x + 12.6, c.y + 1.8); ctx.quadraticCurveTo(c.x + 12.4, c.y + 3.4, c.x + 11, c.y + 4); ctx.quadraticCurveTo(c.x + 10, c.y + 4.4, c.x + 9.2, c.y + 4); ctx.stroke();
      }
      // almohadillas y bigotes
      ctx.fillStyle = 'rgba(166,239,226,.35)'; [[10.2, 2.2], [9.4, 3.3], [10.6, 3.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(c.x + x, c.y + y, 0.3, 0, TAU); ctx.fill(); });
      ctx.strokeStyle = 'rgba(200,245,236,.55)'; ctx.lineWidth = 0.45;
      [[-1, 2.2], [0, 3.1], [1, 4]].forEach(([d, y]) => { ctx.beginPath(); ctx.moveTo(c.x + 10, c.y + y); ctx.quadraticCurveTo(c.x + 16, c.y + y + d * 1.2 - s.arco, c.x + 22, c.y + y + d * 3 - s.arco * 2.5); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(c.x + 5.5, c.y - 5); ctx.quadraticCurveTo(c.x + 8, c.y - 9, c.x + 11, c.y - 10.5); ctx.stroke();       // bigote de la ceja
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
