/* Gatoarisco · lógica compartida del sitio (sin dependencias) */
(function () {
  'use strict';
  const CFG = window.GATOARISCO || {};
  const page = document.body.dataset.page || '';
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$ ' + Math.round(n).toLocaleString('es-CO');
  const img = (id) => `assets/img/productos/${id}.svg`;
  // foto del producto: la que se subió desde el panel o el dibujo de la tienda
  const foto = (p) => esc(p.imagen || img(p.id));
  const SIN_FOTO = `onerror="this.onerror=null;this.src='assets/img/marca/gatoarisco-icono-noche.png'"`;

  /* ---------- Supabase (opcional): catálogo y existencias en tiempo real ---------- */
  const SUPA = CFG.supabaseUrl && CFG.supabaseAnonKey;
  async function supa(ruta) {
    const r = await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${ruta}`, { headers: { apikey: CFG.supabaseAnonKey }, cache: 'no-store' });
    if (!r.ok) throw new Error('Supabase ' + r.status);
    return r.json();
  }

  /* ---------- almacenamiento seguro ---------- */
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };

  /* ---------- iconos ---------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 11l8-6 8 6v9H4z"/></svg>',
    shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" width="17" height="17"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  };

  /* ---------- encabezado, navegación y pie ---------- */
  let NAV = [];
  const NAV_TODO = [
    ['index.html', 'Inicio', 'home'],
    ['tienda.html', 'Tienda', 'shop'],
    ['embajadores.html', 'Embajadores', 'star'],
    ['impacto.html', 'Impacto', 'heart'],
  ];
  const isCur = (href) => { const b = href.replace('.html', ''); return (b === 'index' ? 'inicio' : b) === page; };
  function chrome() {
    const header = $('#site-header');
    if (header) {
      header.innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html" aria-label="Gatoarisco, inicio">
          <img class="icono" src="assets/img/marca/gatoarisco-icono-noche.png" alt="" width="42" height="53">
          <img class="wordmark" src="assets/img/marca/gatoarisco-wordmark-noche.png" alt="Gatoarisco" width="88" height="24">
        </a>
        <nav class="main-nav" aria-label="Principal">
          ${NAV.map(([href, label]) => `<a href="${href}"${isCur(href) ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <form class="search" action="tienda.html" role="search">
            ${I.search}<label class="sr-only" for="q-top">Buscar en la tienda</label>
            <input id="q-top" name="q" type="search" placeholder="Buscar en la tienda">
          </form>
          <a class="icon-btn" href="panel.html" aria-label="Acceso administración" title="Acceso administración">${I.user}</a>
          <a class="icon-btn" href="carrito.html" aria-label="Carrito">${I.bag}<span class="badge" data-cart-count></span></a>
        </div>
      </div>`;
    }
    const bottom = $('#bottom-nav');
    if (bottom) {
      const items = [NAV[0], NAV[1], NAV[2], ['carrito.html', 'Carrito', 'bag']];
      bottom.innerHTML = items.map(([href, label, icon]) => {
        const cur = isCur(href);
        return `<a href="${href}"${cur ? ' aria-current="page"' : ''}><span class="ico">${I[icon]}${icon === 'bag' ? '<span class="badge" data-cart-count></span>' : ''}</span>${label}</a>`;
      }).join('');
    }
    const footer = $('#site-footer');
    if (footer) {
      footer.innerHTML = `
      <div class="wrap">
        <div style="display:flex;flex-direction:column;gap:10px;max-width:360px">
          <img src="assets/img/marca/gatoarisco-wordmark-menta.png" alt="Gatoarisco" width="125" height="34">
          <span>Estilo con garra. Pines, stickers, parches, ropa y accesorios.</span>
        </div>
        <nav aria-label="Pie de página">
          <a href="tienda.html">Tienda</a>
          <a href="embajadores.html">Embajadores</a>
          ${CFG.fundacion ? '<a href="impacto.html">Fundación e impacto</a>' : ''}
          <a href="https://wa.me/${CFG.whatsapp}" rel="noopener">WhatsApp</a>
          <a href="index.html#contacto">Contacto</a>
          <a href="panel.html">Acceso</a>
        </nav>
      </div>`;
    }
  }

  /* ---------- carrito ---------- */
  const Cart = {
    items() { return store.get('ga_cart', []); },
    save(items) { store.set('ga_cart', items); updateBadges(); },
    add(id, variante, qty) {
      const items = this.items();
      const key = id + '|' + (variante || '');
      const found = items.find((i) => i.key === key);
      if (found) found.qty = Math.min(50, found.qty + qty); else items.push({ key, id, variante: variante || '', qty });
      this.save(items);
    },
    setQty(key, qty) { const items = this.items().map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(50, qty)) } : i)); this.save(items); },
    remove(key) { this.save(this.items().filter((i) => i.key !== key)); },
    count() { return this.items().reduce((a, i) => a + i.qty, 0); },
    clear() { this.save([]); },
  };
  let ultimoConteo = null;
  function updateBadges() {
    const n = Cart.count();
    $$('[data-cart-count]').forEach((b) => {
      b.textContent = n; b.classList.toggle('on', n > 0);
      if (ultimoConteo !== null && n > ultimoConteo) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
    ultimoConteo = n;
  }
  let toastTimer;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- código de embajador (?ref=CODIGO) ---------- */
  const params = new URLSearchParams(location.search);
  if (params.get('ref')) store.set('ga_ref', params.get('ref').toUpperCase().slice(0, 24));

  /* ---------- datos ---------- */
  let DATA = null;
  async function data() {
    if (DATA) return DATA;
    if (SUPA) {
      try {
        const [categorias, productos] = await Promise.all([supa('categorias?select=id,nombre,detalle,imagen&order=orden'), supa('catalogo?select=*&order=nombre')]);
        DATA = { categorias, productos };
        return DATA;
      } catch (e) { /* si Supabase falla, se usa el catálogo del archivo */ }
    }
    const r = await fetch('data/productos.json', { cache: 'no-cache' });
    DATA = await r.json();
    return DATA;
  }
  const fotoCat = (c) => {
    if (c.imagen && c.imagen.includes('/')) return esc(c.imagen);
    const p = (c.imagen && DATA.productos.find((x) => x.id === c.imagen)) || DATA.productos.find((x) => x.categoria === c.id);
    return p ? foto(p) : (c.imagen ? img(c.imagen) : 'assets/img/marca/gatoarisco-icono-noche.png');
  };
  const catName = (id) => (DATA.categorias.find((c) => c.id === id) || {}).nombre || id;

  const CLAW = '<svg class="claw" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M22 8 L44 92"/><path pathLength="100" d="M42 4 L64 88"/><path pathLength="100" d="M62 8 L84 92"/></svg>';
  const garras = (n) => (n ? `<span class="arisquez" role="img" aria-label="Arisquez ${n} de 5">${[1, 2, 3, 4, 5].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>` : '');
  const AL_AGREGAR = ['El gato lo aprueba. Por ahora.', 'Buena presa. Ya está en tu carrito.', 'Zarpazo certero: agregado.', 'Atrapado. No lo sueltes.'];
  const azar = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function card(p) {
    const out = p.stock <= 0;
    let tag = '';
    if (out) tag = '<span class="tag tag-night">Agotado</span>';
    else if (p.stock <= 5) tag = `<span class="tag tag-amber">¡Quedan ${p.stock}!</span>`;
    else if (p.preventa) tag = '<span class="tag tag-mint">Preventa</span>';
    else if (p.nuevo) tag = '<span class="tag tag-mint">Nuevo</span>';
    return `<a class="panel brackets card${out ? ' is-out' : ''}" href="producto.html?id=${encodeURIComponent(p.id)}">
      <div class="media">${tag}${CLAW}<img src="${foto(p)}" ${SIN_FOTO} alt="${esc(p.nombre)}" loading="lazy" width="160" height="160"></div>
      <span class="cat-label">${esc(catName(p.categoria))}${p.linea ? ' · ' + esc(p.linea) : ''}</span>
      <h3>${esc(p.nombre)}</h3>
      <div class="meta"><span class="price">${money(p.precio)}${p.precioAntes ? `<s>${money(p.precioAntes)}</s>` : ''}</span>${garras(p.arisquez)}</div>
    </a>`;
  }

  /* ---------- cuenta regresiva ---------- */
  function countdown() {
    const box = $('[data-countdown]');
    if (!box) return;
    const end = new Date(CFG.dropAbre).getTime();
    const d = $('[data-d]', box), h = $('[data-h]', box), m = $('[data-m]', box);
    const pad = (n) => String(n).padStart(2, '0');
    function tick() {
      const left = Math.max(0, end - Date.now());
      d.textContent = pad(Math.floor(left / 864e5));
      h.textContent = pad(Math.floor(left / 36e5) % 24);
      m.textContent = pad(Math.floor(left / 6e4) % 60);
      if (left === 0) { const s = $('[data-drop-status]'); if (s) s.textContent = '¡Ya está abierto!'; }
    }
    tick(); setInterval(tick, 30000);
  }

  /* ---------- páginas ---------- */
  async function home() {
    const D = await data();
    const cats = $('#cats');
    if (cats) cats.innerHTML = D.categorias.map((c) => `
      <a class="panel brackets cat" href="tienda.html?cat=${c.id}">
        <small>${esc(c.detalle)}</small>
        <img src="${fotoCat(c)}" ${SIN_FOTO} alt="" loading="lazy" width="92" height="92">
        <strong>${esc(c.nombre)}</strong>
      </a>`).join('');
    const feat = $('#destacados');
    if (feat) feat.innerHTML = D.productos.filter((p) => p.destacado).slice(0, 8).map(card).join('');
  }

  async function tienda() {
    const D = await data();
    const chips = $('#chips'), grid = $('#grid'), q = $('#q'), sort = $('#sort'), count = $('#count');
    let cat = params.get('cat') || 'todo';
    q.value = params.get('q') || '';
    const opts = [{ id: 'todo', nombre: 'Todo' }].concat(D.categorias);
    chips.innerHTML = opts.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${c.id === cat}">${esc(c.nombre)}</button>`).join('');
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    function render() {
      const term = norm(q.value.trim());
      let list = D.productos.filter((p) => (cat === 'todo' || p.categoria === cat) && (!term || norm(p.nombre + ' ' + p.descripcion + ' ' + catName(p.categoria)).includes(term)));
      if (sort.value === 'menor') list.sort((a, b) => a.precio - b.precio);
      else if (sort.value === 'mayor') list.sort((a, b) => b.precio - a.precio);
      else list.sort((a, b) => (b.stock > 0) - (a.stock > 0) || (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
      grid.innerHTML = list.length ? list.map(card).join('') : `<div class="empty" style="grid-column:1/-1">${window.gatoSVG ? gatoSVG('grande') : ''}<p>El gato buscó por todas partes y nada. Prueba con otra palabra.</p></div>`;
      count.textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
      const u = new URL(location.href);
      cat === 'todo' ? u.searchParams.delete('cat') : u.searchParams.set('cat', cat);
      q.value ? u.searchParams.set('q', q.value) : u.searchParams.delete('q');
      history.replaceState(null, '', u);
    }
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      cat = b.dataset.cat; $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', c === b));
      render();
    });
    q.addEventListener('input', render); sort.addEventListener('change', render);
    render();
  }

  async function producto() {
    const D = await data();
    const p = D.productos.find((x) => x.id === params.get('id'));
    const root = $('#producto');
    if (!p) { root.innerHTML = `<div class="empty">${window.gatoSVG ? gatoSVG('grande') : ''}<p>Este producto se escondió debajo de la cama.</p><a class="btn btn-primary" href="tienda.html">Volver a la tienda</a></div>`; return; }
    document.title = p.nombre + ' · Gatoarisco';
    let variante = p.variantes ? p.variantes.opciones[0] : '';
    let qty = 1;
    const out = p.stock <= 0;
    root.innerHTML = `
      <div class="panel brackets viewer" style="position:relative">
        <span class="ring a" aria-hidden="true"></span><span class="ring b" aria-hidden="true"></span><span class="ring c" aria-hidden="true"></span>
        <span class="scan" aria-hidden="true"></span>
        <img src="${foto(p)}" ${SIN_FOTO} alt="${esc(p.nombre)}" width="300" height="300">
      </div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <p class="eyebrow"><a href="tienda.html?cat=${p.categoria}">${esc(catName(p.categoria))}</a>${p.linea ? ' · ' + esc(p.linea) : ''}</p>
        <h1 class="h-display" style="font-size:clamp(34px,5vw,52px);font-weight:300">${esc(p.nombre)}</h1>
        <div class="price" style="font-size:26px">${money(p.precio)}${p.precioAntes ? `<s style="font-size:14px">${money(p.precioAntes)}</s>` : ''}</div>
        ${p.humor ? `<blockquote class="humor"><span>Lo que dice el gato</span>«${esc(p.humor)}»</blockquote>` : ''}
        <p style="margin:0;color:var(--text-2)">${esc(p.descripcion)}</p>
        ${p.arisquez ? `<div class="arisquez-box"><small>Nivel de arisquez</small>${garras(p.arisquez)}<b>${p.arisquez}/5</b><em>${['', 'Casi dócil', 'Tímido', 'Con carácter', 'Muy arisco', 'Indomable'][p.arisquez]}</em></div>` : ''}
        ${p.limitado ? `<span class="tag tag-amber" style="align-self:flex-start">${esc(p.limitado)}</span>` : ''}
        <div class="specs">${Object.entries(p.atributos || {}).map(([k, v]) => `<div class="spec"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>
        ${p.variantes ? `<div><p class="eyebrow" id="var-label" style="margin-bottom:8px">${esc(p.variantes.nombre)}</p>
          <div class="segmented" role="radiogroup" aria-labelledby="var-label">${p.variantes.opciones.map((o, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>` : ''}
        ${out ? '<div class="alert alert-amber"><span class="dot"></span>Agotado por ahora. Escríbenos y te avisamos cuando vuelva.</div>'
          : p.stock <= 5 ? `<div class="alert alert-amber"><span class="dot"></span>Solo quedan ${p.stock} unidades</div>`
          : p.preventa ? `<div class="alert alert-mint"><span class="dot"></span>Preventa · ${esc(p.preventa)}</div>` : ''}
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          <div class="qty"><button type="button" data-q="-1" aria-label="Quitar uno">−</button><output aria-live="polite" id="qty">1</output><button type="button" data-q="1" aria-label="Agregar uno">+</button></div>
          ${out ? `<a class="btn btn-ghost" href="https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent('Hola, avísenme cuando vuelva: ' + p.nombre)}" rel="noopener">Avísame cuando vuelva</a>`
            : '<button type="button" class="btn btn-primary" id="add" style="flex:1;min-width:200px">Agregar al carrito</button>'}
        </div>
        <p class="note">Envío a toda Colombia · gratis desde ${money(CFG.envioGratisDesde)} · cambios en 5 días hábiles.</p>
      </div>`;
    $$('[data-v]', root).forEach((b) => b.addEventListener('click', () => {
      variante = b.dataset.v; $$('[data-v]', root).forEach((x) => x.setAttribute('aria-checked', x === b));
    }));
    $$('[data-q]', root).forEach((b) => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(Math.max(1, p.stock), qty + Number(b.dataset.q))); $('#qty').textContent = qty;
    }));
    const add = $('#add');
    if (add) add.addEventListener('click', () => { Cart.add(p.id, variante, qty); toast(azar(AL_AGREGAR)); });
    const rel = $('#relacionados');
    if (rel) rel.innerHTML = D.productos.filter((x) => x.categoria === p.categoria && x.id !== p.id).slice(0, 4).map(card).join('');
  }

  function pago() {
    const root = $('#pago'); if (!root) return;
    const p = store.get('ga_pedido', null); const ref = params.get('ref');
    if (!p || (ref && p.referencia !== ref)) {
      root.innerHTML = `<div class="empty">${window.gatoSVG ? gatoSVG('grande') : ''}<p>No encontramos ese pedido en este dispositivo. Si ya pagaste, escríbenos con tu referencia.</p><a class="btn btn-primary" href="https://wa.me/${CFG.whatsapp}" rel="noopener">Escribir por WhatsApp</a></div>`;
      return;
    }
    const num = String(CFG.nequi || '').replace(/\D/g, '');
    const numBonito = num.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    const lineas = (p.items || []).map((i) => `• ${i.cant} × ${i.nombre}${i.variante ? ' (' + i.variante + ')' : ''} — ${money(i.cant * i.precio)}`);
    const msg = ['¡Hola, Gatoarisco! Ya pagué mi pedido con Nequi.', '', `Referencia: ${p.referencia}`, `Valor pagado: ${money(p.total)}`, '', ...lineas, '', `Nombre: ${p.nombre}`, `Celular: ${p.telefono}`, `Ciudad: ${p.ciudad}`, `Dirección: ${p.direccion}`, p.nota ? `Notas: ${p.nota}` : '', '', 'Te adjunto el comprobante.'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    root.innerHTML = `
      <div class="pago-layout">
        <div class="panel brackets pago-caja">
          <div class="pago-total"><small>Valor a enviar</small><b>${money(p.total)}</b><span>Referencia <strong>${esc(p.referencia)}</strong></span></div>
          ${CFG.nequiQR ? `<div class="pago-qr"><img src="${esc(CFG.nequiQR)}" alt="Código QR de Nequi de Gatoarisco"><span>Escanéalo desde la app Nequi</span></div>` : ''}
          <div class="pago-dato"><small>Número Nequi</small><b>${esc(numBonito)}</b><button type="button" class="btn btn-ghost btn-sm" data-copiar="${esc(num)}">Copiar número</button></div>
          <div class="pago-dato"><small>A nombre de</small><b>${esc(CFG.nequiTitular || '')}</b></div>
          <div class="pago-dato"><small>Valor exacto</small><b>${money(p.total)}</b><button type="button" class="btn btn-ghost btn-sm" data-copiar="${p.total}">Copiar valor</button></div>
          <ol class="pasos-pago">
            <li>Abre tu app <b>Nequi</b> y toca <b>Envía</b>.</li>
            <li>Escribe el número <b>${esc(numBonito)}</b> y el valor <b>${money(p.total)}</b>.</li>
            <li>En el mensaje del envío escribe tu referencia <b>${esc(p.referencia)}</b>.</li>
            <li>Toma captura del comprobante y tócanos el botón de abajo.</li>
          </ol>
          <a class="btn btn-primary" style="width:100%" href="https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Ya pagué · enviar comprobante</a>
          <p class="note" style="margin:10px 0 0">Apenas confirmemos el pago te avisamos y despachamos tu pedido.</p>
        </div>
        <aside class="panel brackets pago-resumen">
          <h2 class="h-section" style="font-size:18px;margin:0 0 10px">Tu pedido</h2>
          ${(p.items || []).map((i) => `<div class="summary-row"><span>${i.cant} × ${esc(i.nombre)}${i.variante ? ' · ' + esc(i.variante) : ''}</span><span>${money(i.cant * i.precio)}</span></div>`).join('')}
          ${p.descuento ? `<div class="summary-row"><span>Código ${esc(p.codigo || '')}</span><span>− ${money(p.descuento)}</span></div>` : ''}
          <div class="summary-row"><span>Envío</span><span>${p.envio ? money(p.envio) : 'Gratis'}</span></div>
          <div class="summary-row total"><span>Total</span><span>${money(p.total)}</span></div>
          <p class="note" style="margin-top:12px">Envío a: ${esc(p.nombre)} · ${esc(p.ciudad)} · ${esc(p.direccion)}</p>
        </aside>
      </div>`;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-copiar]'); if (!b) return;
      const t = b.dataset.copiar;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copiado: ' + t), () => toast(t));
    });
  }

  async function carrito() {
    const D = await data();
    const list = $('#cart-list'), sum = $('#cart-summary'), form = $('#checkout');
    const refInput = $('#ref'); refInput.value = store.get('ga_ref', '') || '';
    function lines() {
      return Cart.items().map((i) => ({ ...i, p: D.productos.find((p) => p.id === i.id) })).filter((i) => i.p);
    }
    function totals() {
      const ls = lines();
      const subtotal = ls.reduce((a, i) => a + i.p.precio * i.qty, 0);
      const ref = refInput.value.trim();
      const descuento = ref ? Math.round(subtotal * (CFG.descuentoEmbajador / 100)) : 0;
      const envioGratis = subtotal - descuento >= CFG.envioGratisDesde;
      const envio = envioGratis ? 0 : (CFG.envioValor || 0);
      return { ls, subtotal, descuento, envioGratis, envio, total: subtotal - descuento + envio, ref };
    }
    function render() {
      const t = totals();
      if (!t.ls.length) {
        list.innerHTML = `<div class="empty">${window.gatoSVG ? gatoSVG('grande') : ''}<p>Tu carrito está más vacío que el plato del gato a las 5 a. m.</p><a class="btn btn-primary" href="tienda.html">Ir de cacería</a></div>`;
        sum.hidden = true; return;
      }
      sum.hidden = false;
      list.innerHTML = t.ls.map((i) => `
        <div class="cart-item">
          <img src="${foto(i.p)}" ${SIN_FOTO} alt="" width="72" height="72">
          <div>
            <h3>${esc(i.p.nombre)}</h3>
            <small>${esc(catName(i.p.categoria))}${i.variante ? ' · ' + esc(i.variante) : ''} · ${money(i.p.precio)}</small><br>
            <button type="button" class="remove" data-rm="${esc(i.key)}">Quitar</button>
          </div>
          <div class="qty"><button type="button" data-k="${esc(i.key)}" data-d="-1" aria-label="Quitar uno de ${esc(i.p.nombre)}">−</button><output>${i.qty}</output><button type="button" data-k="${esc(i.key)}" data-d="1" aria-label="Agregar uno de ${esc(i.p.nombre)}">+</button></div>
        </div>`).join('');
      $('#s-subtotal').textContent = money(t.subtotal);
      $('#s-desc-row').hidden = !t.descuento;
      $('#s-desc').textContent = '− ' + money(t.descuento);
      $('#s-envio').textContent = t.envioGratis ? 'Gratis' : money(t.envio);
      $('#s-total').textContent = money(t.total);
      const falta = CFG.envioGratisDesde - (t.subtotal - t.descuento);
      $('#s-free').textContent = t.envioGratis ? '¡Tu envío es gratis!' : `Te faltan ${money(falta)} para el envío gratis.`;
    }
    list.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { Cart.remove(rm.dataset.rm); render(); return; }
      const b = e.target.closest('[data-k]');
      if (b) { const it = Cart.items().find((i) => i.key === b.dataset.k); if (it) { Cart.setQty(it.key, it.qty + Number(b.dataset.d)); render(); } }
    });
    refInput.addEventListener('input', () => { store.set('ga_ref', refInput.value.trim().toUpperCase()); render(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const t = totals(); const f = new FormData(form);
      const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const referencia = 'GA-' + Array.from({ length: 5 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
      const pedido = {
        referencia, nombre: f.get('nombre').trim(), telefono: f.get('telefono').trim(), ciudad: f.get('ciudad').trim(), direccion: f.get('direccion').trim(), nota: (f.get('notas') || '').trim() || null,
        items: t.ls.map((i) => ({ producto_id: i.p.id, nombre: i.p.nombre, variante: i.variante || '', cant: i.qty, precio: i.p.precio })),
        subtotal: t.subtotal, descuento: t.descuento, envio: t.envio, total: t.total, codigo: t.ref || null,
      };
      const b = $('button[type=submit]', form); b.disabled = true; b.textContent = 'Guardando tu pedido…';
      let guardado = false;
      if (SUPA) {
        try {
          const r = await fetch(`${CFG.supabaseUrl}/rest/v1/pedidos`, { method: 'POST', headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(pedido) });
          guardado = r.ok;
        } catch (err) { guardado = false; }
      }
      store.set('ga_pedido', Object.assign({ guardado, fecha: new Date().toISOString() }, pedido));
      Cart.clear();
      location.href = 'pago.html?ref=' + encodeURIComponent(referencia);
    });
    render();
  }

  function formToWhatsApp(id, title) {
    const form = $(id);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const lines = [title, ''].concat(Array.from(f.entries()).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`));
      window.open(`https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      toast('Abrimos WhatsApp con tu postulación');
    });
  }

  /* ---------- ajustes que se cambian desde el panel (data/ajustes.json) ---------- */
  async function ajustes() {
    try {
      if (SUPA) {
        const filas = await supa('ajustes_publicos?select=clave,valor');
        filas.forEach((f) => { CFG[f.clave] = f.valor; });
      } else {
        const r = await fetch('data/ajustes.json?t=' + Date.now(), { cache: 'no-store' });
        Object.assign(CFG, await r.json());
      }
    } catch (e) { /* si falla, la fundación queda oculta */ }
    if (CFG.fundacion) document.documentElement.classList.add('con-fundacion');
    NAV = NAV_TODO.filter(([href]) => CFG.fundacion || href !== 'impacto.html');
  }

  /* ---------- formulario de contacto: llega a la bandeja del panel (o a WhatsApp si no hay Supabase) ---------- */
  function contacto() {
    const f = $('#form-contacto'); if (!f) return;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f).entries());
      if (d.web) return;                                      // trampa para robots
      const datos = { nombre: d.nombre.trim(), contacto: d.contacto.trim(), tipo: d.tipo, mensaje: d.mensaje.trim() };
      const b = $('button[type=submit]', f); b.disabled = true;
      let ok = false;
      if (SUPA) {
        try {
          const r = await fetch(`${CFG.supabaseUrl}/rest/v1/mensajes`, { method: 'POST', headers: { apikey: CFG.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(datos) });
          ok = r.ok;
        } catch (err) { ok = false; }
      }
      b.disabled = false;
      if (ok) { f.reset(); $('#contacto-ok').hidden = false; toast('Mensaje enviado. El gato ya lo está leyendo.'); return; }
      const txt = `Hola, Gatoarisco. Soy ${datos.nombre} (${datos.contacto}).\n${datos.tipo}: ${datos.mensaje}`;
      window.open(`https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
      toast('Abrimos WhatsApp con tu mensaje');
    });
  }

  /* ---------- arranque ---------- */
  ajustes().then(arrancar);
  function arrancar() {
  chrome();
  if (window.gatoMontar) gatoMontar();
  const g404 = $('#gato-404'); if (g404 && window.gatoSVG) g404.innerHTML = gatoSVG('grande');
  $$('[data-wa]').forEach((a) => { a.href = `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(a.dataset.wa)}`; });
  updateBadges();
  countdown();
  const run = { inicio: home, tienda, producto, carrito }[page];
  if (run) run().then(() => window.gatoMirar && gatoMirar()).catch(() => { const m = $('main'); if (m) m.insertAdjacentHTML('afterbegin', '<p class="wrap alert alert-amber" style="margin-top:20px">No pudimos cargar los productos. Recarga la página.</p>'); });
  contacto();
  pago();
  formToWhatsApp('#form-embajador', 'Hola, quiero ser embajador de Gatoarisco.');
  formToWhatsApp('#form-vendedor', 'Hola, quiero vender con la Fundación Gatoarisco.');
  }
})();
