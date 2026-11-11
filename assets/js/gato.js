/* Gatoarisco · el gato mascota: te sigue con la mirada, parpadea y bufa si lo tocas */
(function () {
  'use strict';

  const FRASES = [
    '¿Y tú qué miras?',
    'Arisco, no antipático.',
    'Tengo 9 vidas y ninguna para excusas.',
    'No me acaricies. Mejor compra algo.',
    'Fsss… el carrito está por allá.',
    'Ese pin era mío. Bueno, puede ser tuyo.',
    'Ronroneo solo con envío gratis.',
    'Aquí se viste con garra.',
  ];

  // Un gato original dibujado en SVG (no es el logo): cabeza erizada, cejas fruncidas y ojos rasgados.
  window.gatoSVG = function (cls) {
    return `<svg class="gato ${cls || ''}" viewBox="0 0 120 108" aria-hidden="true">
      <g class="oreja izq"><path d="M16 50 L22 4 L54 32 Z" fill="#0B1A2A"/><path d="M24 40 L27 16 L44 32 Z" fill="#1C7A6C"/></g>
      <g class="oreja der"><path d="M104 50 L98 4 L66 32 Z" fill="#0B1A2A"/><path d="M96 40 L93 16 L76 32 Z" fill="#1C7A6C"/></g>
      <path d="M14 62 Q12 32 42 27 L60 24 L78 27 Q108 32 106 62 L116 66 L105 71 L111 81 L97 80 Q86 104 60 104 Q34 104 23 80 L9 81 L15 71 L4 66 Z" fill="#0B1A2A"/>
      <path d="M28 45 L52 52" stroke="#73D8C7" stroke-width="3" stroke-linecap="round"/>
      <path d="M92 45 L68 52" stroke="#73D8C7" stroke-width="3" stroke-linecap="round"/>
      <g class="ojos">
        <g class="ojo"><ellipse cx="42" cy="62" rx="11" ry="8.5" fill="#73D8C7"/><ellipse class="pupila" cx="42" cy="62" rx="2.6" ry="7" fill="#0B1A2A"/><circle class="brillo" cx="45" cy="59" r="1.6" fill="#E8FFFA"/></g>
        <g class="ojo"><ellipse cx="78" cy="62" rx="11" ry="8.5" fill="#73D8C7"/><ellipse class="pupila" cx="78" cy="62" rx="2.6" ry="7" fill="#0B1A2A"/><circle class="brillo" cx="81" cy="59" r="1.6" fill="#E8FFFA"/></g>
      </g>
      <path d="M56 76 L64 76 L60 81 Z" fill="#73D8C7"/>
      <path class="boca" d="M52 86 Q56 90 60 86 Q64 90 68 86" stroke="#73D8C7" stroke-width="2" fill="none" stroke-linecap="round"/>
      <g class="colmillos"><path d="M54 87 L56 93 L58 88 Z M62 88 L64 93 L66 87 Z" fill="#E8FFFA"/></g>
      <g stroke="#A6EFE2" stroke-width="1.2" opacity=".55" stroke-linecap="round">
        <path d="M40 80 L8 74"/><path d="M40 84 L10 88"/><path d="M80 80 L112 74"/><path d="M80 84 L110 88"/>
      </g>
    </svg>`;
  };

  /* ---- bufido sintetizado (solo suena cuando la persona toca al gato) ---- */
  let ctx;
  function bufido() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const dur = 0.45, n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.8;
      const g = ctx.createGain(); const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(ctx.destination); src.start();
    } catch (e) { /* sin audio */ }
  }

  /* ---- montar el gato que se asoma sobre el pie de página ---- */
  function montar() {
    const footer = document.getElementById('site-footer');
    if (!footer || footer.querySelector('.gato-asoma')) return;
    const box = document.createElement('div');
    box.className = 'gato-asoma';
    box.innerHTML = `<p class="globo" role="status" aria-live="polite"></p>
      <button type="button" class="gato-btn" aria-label="Molestar al gato">${window.gatoSVG()}<span class="patas" aria-hidden="true"><i></i><i></i></span></button>`;
    footer.prepend(box);
    const btn = box.querySelector('.gato-btn'), globo = box.querySelector('.globo');
    let timer, ultima = -1;
    function decir(txt) {
      globo.textContent = txt; box.classList.add('habla');
      clearTimeout(timer); timer = setTimeout(() => box.classList.remove('habla', 'fsss'), 2600);
    }
    btn.addEventListener('click', () => {
      let i; do { i = Math.floor(Math.random() * FRASES.length); } while (i === ultima && FRASES.length > 1);
      ultima = i; box.classList.add('fsss'); bufido(); decir(FRASES[i]);
    });
    btn.addEventListener('mouseenter', () => { if (!box.classList.contains('habla')) decir('Ni lo pienses.'); });
  }

  /* ---- todas las pupilas de la página siguen el puntero ---- */
  let px = innerWidth / 2, py = 0, pendiente = false;
  function mirar() {
    pendiente = false;
    document.querySelectorAll('.gato .ojo').forEach((ojo) => {
      const r = ojo.getBoundingClientRect();
      if (!r.width) return;
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
      const k = Math.min(1, Math.hypot(dx, dy) / 300);
      const a = Math.atan2(dy, dx);
      const p = ojo.querySelector('.pupila'), b = ojo.querySelector('.brillo');
      const tx = Math.cos(a) * 6 * k, ty = Math.sin(a) * 2.2 * k;
      p.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`);
      b.setAttribute('transform', `translate(${(tx * 0.6).toFixed(2)} ${(ty * 0.6).toFixed(2)})`);
    });
  }
  function mover(e) { px = e.clientX; py = e.clientY; if (!pendiente) { pendiente = true; requestAnimationFrame(mirar); } }
  addEventListener('pointermove', mover, { passive: true });
  addEventListener('pointerdown', mover, { passive: true });
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(mirar); } }, { passive: true });

  window.gatoMontar = montar;
  window.gatoMirar = mirar;
})();
