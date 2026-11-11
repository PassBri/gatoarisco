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

  // El gato del logo de Gatoarisco, vectorizado: el cráneo con sus huecos y los ojos que se mueven.
  const LOGO = {"cuerpo":"M655 12 L621 30 L526 105 L482 150 L429 211 L426 216 L433 221 L431 225 L425 222 L419 222 L427 227 L427 230 L420 230 L381 213 L369 213 L322 220 L248 236 L242 236 L241 234 L244 231 L255 228 L242 226 L247 220 L218 192 L222 191 L174 143 L121 95 L26 15 L29 81 L54 381 L66 365 L70 368 L70 370 L63 378 L57 388 L56 393 L38 418 L20 459 L12 469 L18 478 L24 481 L70 555 L77 563 L75 568 L76 574 L71 577 L65 585 L45 619 L132 634 L137 634 L140 630 L144 633 L151 648 L167 743 L212 690 L217 686 L221 688 L250 799 L262 861 L304 715 L309 710 L314 714 L316 729 L320 731 L334 791 L334 799 L336 800 L349 790 L372 768 L371 717 L373 709 L377 707 L380 711 L380 729 L385 781 L407 803 L431 708 L435 697 L437 695 L440 695 L445 700 L445 704 L484 824 L494 696 L499 657 L501 652 L504 650 L505 643 L509 641 L511 643 L512 649 L575 635 L618 628 L635 628 L615 589 L604 572 L604 563 L601 556 L646 504 L683 448 L655 402 L618 349 L612 348 L612 341 L603 329 L603 326 L606 325 L614 333 L617 322 L619 305 L615 300 L645 98ZM357 554 L363 561 L390 618 L392 626 L376 643 L371 644 L347 623 L325 647 L321 646 L305 627 L304 624 L306 617 L309 612 L311 614 L330 562 L336 556 L351 556ZM59 444 L62 443 L66 447 L95 416 L89 408 L92 405 L102 410 L110 405 L113 408 L107 412 L107 414 L127 429 L134 430 L173 463 L276 540 L277 536 L234 497 L239 497 L289 539 L289 542 L287 544 L282 543 L280 549 L277 549 L215 588 L182 602 L177 600 L178 597 L191 588 L160 583 L119 573 L124 580 L124 583 L122 585 L117 580 L112 582 L108 576 L107 571 L104 568 L104 566 L107 564 L107 561 L102 549 L100 552 L89 531 L75 498 L63 462 L58 458ZM634 430 L637 439 L632 445 L612 488 L566 558 L561 563 L555 563 L548 567 L535 566 L474 574 L482 577 L483 574 L495 581 L492 584 L487 584 L458 573 L411 548 L407 544 L432 494 L408 514 L405 526 L400 531 L399 530 L401 523 L399 514 L405 506 L421 453 L422 459 L412 499 L493 429 L539 395 L568 377 L573 377 L575 379 L574 383 L596 399 L628 429 L632 428ZM614 95 L617 97 L617 100 L609 107 L612 141 L612 189 L605 284 L601 288 L597 286 L596 280 L607 164 L604 113 L602 112 L573 135 L534 174 L537 174 L554 164 L559 167 L536 220 L559 214 L563 214 L566 217 L537 250 L554 270 L582 298 L582 300 L578 302 L522 256 L516 255 L508 258 L505 255 L504 252 L506 247 L503 242 L501 211 L491 221 L497 227 L497 231 L487 225 L472 241 L470 241 L468 235 L464 235 L462 231 L502 187 L549 141 L594 103 L602 103ZM69 84 L72 85 L78 92 L176 244 L155 278 L153 278 L151 274 L143 276 L89 330 L84 327 L86 321 L132 270 L129 267 L116 263 L116 259 L135 247 L107 212 L107 209 L110 207 L132 214 L112 160 L102 144 L82 118 L79 189 L70 270 L69 312 L66 315 L63 314 L62 310 L65 263 L79 137 L78 114 L71 104 L70 95 L66 88Z","ojoI":["M59 444 L62 443 L66 447 L95 416 L89 408 L92 405 L102 410 L110 405 L113 408 L107 412 L107 414 L127 429 L134 430 L173 463 L276 540 L277 536 L234 497 L239 497 L289 539 L289 542 L287 544 L282 543 L280 549 L277 549 L215 588 L182 602 L177 600 L178 597 L191 588 L160 583 L119 573 L124 580 L124 583 L122 585 L117 580 L112 582 L108 576 L107 571 L104 568 L104 566 L107 564 L107 561 L102 549 L100 552 L89 531 L75 498 L63 462 L58 458Z",158,513],"ojoD":["M634 430 L637 439 L632 445 L612 488 L566 558 L561 563 L555 563 L548 567 L535 566 L474 574 L482 577 L483 574 L495 581 L492 584 L487 584 L458 573 L411 548 L407 544 L432 494 L408 514 L405 526 L400 531 L399 530 L401 523 L399 514 L405 506 L421 453 L422 459 L412 499 L493 429 L539 395 L568 377 L573 377 L575 379 L574 383 L596 399 L628 429 L632 428Z",523,487],"orejaI":"M69 84 L72 85 L78 92 L176 244 L155 278 L153 278 L151 274 L143 276 L89 330 L84 327 L86 321 L132 270 L129 267 L116 263 L116 259 L135 247 L107 212 L107 209 L110 207 L132 214 L112 160 L102 144 L82 118 L79 189 L70 270 L69 312 L66 315 L63 314 L62 310 L65 263 L79 137 L78 114 L71 104 L70 95 L66 88Z","orejaD":"M614 95 L617 97 L617 100 L609 107 L612 141 L612 189 L605 284 L601 288 L597 286 L596 280 L607 164 L604 113 L602 112 L573 135 L534 174 L537 174 L554 164 L559 167 L536 220 L559 214 L563 214 L566 217 L537 250 L554 270 L582 298 L582 300 L578 302 L522 256 L516 255 L508 258 L505 255 L504 252 L506 247 L503 242 L501 211 L491 221 L497 227 L497 231 L487 225 L472 241 L470 241 L468 235 L464 235 L462 231 L502 187 L549 141 L594 103 L602 103Z","nariz":"M357 554 L363 561 L390 618 L392 626 L376 643 L371 644 L347 623 L325 647 L321 646 L305 627 L304 624 L306 617 L309 612 L311 614 L330 562 L336 556 L351 556Z"};
  let n = 0;
  window.gatoSVG = function (cls) {
    const k = 'g' + (++n);
    const ojo = (lado, [dEye, cx, cy]) => `<g class="ojo" data-rx="38" data-ry="22" clip-path="url(#${k}${lado})">
        <path class="ojo-fondo" d="${dEye}"/>
        <ellipse class="pupila" cx="${cx}" cy="${cy + 6}" rx="15" ry="58"/>
        <circle class="brillo" cx="${cx + 16}" cy="${cy - 26}" r="10"/>
      </g>`;
    return `<svg class="gato ${cls || ''}" viewBox="0 0 695 873" aria-hidden="true">
      <defs><clipPath id="${k}i"><path d="${LOGO.ojoI[0]}"/></clipPath><clipPath id="${k}d"><path d="${LOGO.ojoD[0]}"/></clipPath></defs>
      <g class="huecos"><path d="${LOGO.orejaI}"/><path d="${LOGO.orejaD}"/><path d="${LOGO.nariz}"/></g>
      <g class="ojos">${ojo('i', LOGO.ojoI)}${ojo('d', LOGO.ojoD)}</g>
      <path class="craneo" fill-rule="evenodd" d="${LOGO.cuerpo}"/>
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
      const rx = +ojo.dataset.rx || 6, ry = +ojo.dataset.ry || 2.2;
      const tx = Math.cos(a) * rx * k, ty = Math.sin(a) * ry * k;
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
