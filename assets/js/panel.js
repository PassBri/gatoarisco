/* Gatoarisco · panel de control de la empresa
   Datos en Supabase (o en este navegador en modo prueba). Sin dependencias salvo supabase-js. */
(function () {
  'use strict';
  const CFG = window.GATOARISCO || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '$ ' + Math.round(n || 0).toLocaleString('es-CO');
  const int = (v) => { const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };
  const hoy = () => new Date().toLocaleDateString('en-CA');
  const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  const fechaCorta = (f) => { if (!f) return ''; const [y, m, d] = f.split('-'); return `${d}/${m}/${y.slice(2)}`; };
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'producto';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } },
  };

  const CANALES = { web: 'Tienda web', whatsapp: 'WhatsApp', calle: 'Venta en calle', embajador: 'Embajador', mayorista: 'Mayorista', feria: 'Feria o evento' };
  const METODOS = ['Nequi', 'Daviplata', 'Transferencia', 'Efectivo', 'Tarjeta', 'Contraentrega'];
  const ENTREGAS = { por_despachar: 'Por despachar', enviado: 'Enviado', entregado: 'Entregado', en_mano: 'Entregado en mano' };
  const GASTOS = ['Publicidad', 'Empaques', 'Envíos', 'Transporte', 'Arriendo', 'Servicios', 'Diseño', 'Comisiones bancarias', 'Impuestos', 'Otros'];
  const NIVELES = { explorador: 'Explorador', navegante: 'Navegante', comandante: 'Comandante' };
  const TABLAS = ['categorias', 'proveedores', 'productos', 'clientes', 'equipo', 'ventas', 'compras', 'gastos', 'ajustes_inventario', 'pagos_equipo'];
  const EMPRESA_BASE = { id: 1, nombre: 'Gatoarisco', nit: '', telefono: '', ciudad: '', correo: '', saldo_inicial: 0, tarifas: { explorador: 2000, navegante: 2500, comandante: 3000 }, pct_calle: 50, pct_fondo: 20, descuento_embajador: 10 };

  /* =================================================================
     Almacenamiento
     ================================================================= */
  async function catalogoInicial() {
    const r = await fetch('data/productos.json?t=' + Date.now(), { cache: 'no-store' });
    const d = await r.json();
    return {
      categorias: d.categorias.map((c, i) => ({ id: c.id, nombre: c.nombre, detalle: c.detalle, imagen: c.imagen, orden: i })),
      productos: d.productos.map((p) => ({
        id: p.id, nombre: p.nombre, categoria_id: p.categoria, linea: p.linea || null, precio: p.precio, precio_antes: p.precioAntes || null,
        costo: p.categoria === 'pines' ? (p.precio <= 12000 ? 2500 : 8000) : 0, stock_inicial: p.stock, stock_min: 3, proveedor_id: null,
        descripcion: p.descripcion, atributos: p.atributos || {}, variantes: p.variantes || null, destacado: !!p.destacado, nuevo: !!p.nuevo,
        limitado: p.limitado || null, preventa: p.preventa || null, arisquez: p.arisquez || null, humor: p.humor || null,
        imagen: `assets/img/productos/${p.id}.svg`, activo: true, creado: new Date().toISOString(),
      })),
    };
  }

  function LocalStore() {
    const K = 'ga_panel_prueba';
    let db = null;
    const persistir = () => { if (!ls.set(K, db)) throw new Error('El navegador no dejó guardar (espacio lleno o modo privado).'); };
    return {
      modo: 'prueba',
      async cargar() {
        db = ls.get(K, null);
        if (!db) {
          db = Object.assign({ empresa: { ...EMPRESA_BASE }, ajustes: { fundacion: false } }, Object.fromEntries(TABLAS.map((t) => [t, []])));
          Object.assign(db, await catalogoInicial());
          persistir();
        }
        return JSON.parse(JSON.stringify(db));
      },
      async guardar(t, row) {
        const lista = db[t]; const i = lista.findIndex((x) => x.id === row.id);
        const r = { ...row };
        if (i === -1) {
          r.creado = r.creado || new Date().toISOString();
          if (t === 'ventas' || t === 'compras') r.numero = lista.reduce((m, x) => Math.max(m, x.numero || 0), 0) + 1;
          lista.push(r);
        } else { r.numero = lista[i].numero; r.creado = lista[i].creado; lista[i] = r; }
        persistir(); return JSON.parse(JSON.stringify(r));
      },
      async borrar(t, id) { db[t] = db[t].filter((x) => x.id !== id); persistir(); },
      async guardarEmpresa(e) { db.empresa = { ...e, id: 1 }; persistir(); return db.empresa; },
      async setAjuste(k, v) { db.ajustes[k] = v; persistir(); },
      async subirFoto(file) { return reducirImagen(file, 480, 0.8).then((b) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); })); },
      async reiniciar() { ls.del(K); },
      async importar(data) { db = data; persistir(); },
    };
  }

  function SupaStore(sb) {
    const limpiar = (row) => { const r = { ...row }; delete r.numero; delete r.creado; return r; };
    const err = (e) => { if (e) throw new Error(e.message || String(e)); };
    async function todo(t) {
      const filas = []; const paso = 1000;
      for (let desde = 0; ; desde += paso) {
        const { data, error } = await sb.from(t).select('*').range(desde, desde + paso - 1);
        err(error); filas.push(...data); if (data.length < paso) break;
      }
      return filas;
    }
    return {
      modo: 'supabase',
      async cargar() {
        const [emp, aj, ...listas] = await Promise.all([
          sb.from('empresa').select('*').eq('id', 1).maybeSingle(),
          sb.from('ajustes_publicos').select('*'),
          ...TABLAS.map(todo),
        ]);
        err(emp.error); err(aj.error);
        const db = { empresa: emp.data || { ...EMPRESA_BASE }, ajustes: {} };
        (aj.data || []).forEach((a) => { db.ajustes[a.clave] = a.valor; });
        TABLAS.forEach((t, i) => { db[t] = listas[i]; });
        return db;
      },
      async guardar(t, row) { const { data, error } = await sb.from(t).upsert(limpiar(row)).select().single(); err(error); return data; },
      async borrar(t, id) { const { error } = await sb.from(t).delete().eq('id', id); err(error); },
      async guardarEmpresa(e) { const { data, error } = await sb.from('empresa').upsert({ ...e, id: 1 }).select().single(); err(error); return data; },
      async setAjuste(k, v) { const { error } = await sb.from('ajustes_publicos').upsert({ clave: k, valor: v }); err(error); },
      async subirFoto(file, id) {
        const blob = await reducirImagen(file, 1000, 0.85);
        const ruta = `${id}-${Date.now()}.jpg`;
        const { error } = await sb.storage.from('productos').upload(ruta, blob, { contentType: 'image/jpeg', upsert: true });
        err(error);
        return sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
      },
    };
  }

  function reducirImagen(file, max, calidad) {
    return new Promise((ok, mal) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo procesar la foto'))), 'image/jpeg', calidad);
      };
      img.onerror = () => mal(new Error('Ese archivo no es una imagen válida'));
      img.src = url;
    });
  }

  /* =================================================================
     Estado y cálculos
     ================================================================= */
  let ST = null;          // almacenamiento activo
  let DB = null;          // datos en memoria
  let IDX = null;         // índices calculados
  let sb = null;          // cliente supabase
  const UI = { vista: ls.get('ga_panel_vista', 'resumen'), periodo: 'mes', filtros: {} };

  const porId = (t, id) => DB[t].find((x) => x.id === id);
  const prod = (id) => porId('productos', id);

  function indexar() {
    const stock = {}, vendidos = {}, ingresosProd = {};
    DB.productos.forEach((p) => { stock[p.id] = p.stock_inicial || 0; vendidos[p.id] = 0; ingresosProd[p.id] = 0; });
    DB.compras.forEach((c) => (c.items || []).forEach((i) => { stock[i.producto_id] = (stock[i.producto_id] || 0) + int(i.cant); }));
    DB.ajustes_inventario.forEach((a) => { stock[a.producto_id] = (stock[a.producto_id] || 0) + int(a.cantidad); });
    DB.ventas.forEach((v) => {
      if (v.anulada) return;
      (v.items || []).forEach((i) => {
        stock[i.producto_id] = (stock[i.producto_id] || 0) - int(i.cant);
        vendidos[i.producto_id] = (vendidos[i.producto_id] || 0) + int(i.cant);
        ingresosProd[i.producto_id] = (ingresosProd[i.producto_id] || 0) + int(i.cant) * int(i.precio);
      });
    });
    IDX = { stock, vendidos, ingresosProd };
  }
  const stockDe = (id) => (IDX.stock[id] || 0);

  function tv(v) {
    const items = v.items || [];
    const sub = items.reduce((a, i) => a + int(i.cant) * int(i.precio), 0);
    const costo = items.reduce((a, i) => a + int(i.cant) * int(i.costo), 0);
    const unidades = items.reduce((a, i) => a + int(i.cant), 0);
    const neto = sub - int(v.descuento);
    return { sub, costo, unidades, neto, total: neto + int(v.envio), util: neto - costo };
  }
  function comision(v) {
    if (v.anulada || !v.vendedor_id) return 0;
    const p = porId('equipo', v.vendedor_id); if (!p) return 0;
    const t = tv(v);
    if (p.tipo === 'embajador') return t.unidades * int((DB.empresa.tarifas || {})[p.nivel || 'explorador']);
    return Math.max(0, Math.round(t.util * (Number(DB.empresa.pct_calle) || 0) / 100));
  }
  function fondo(v) {
    if (v.anulada || !DB.ajustes.fundacion) return 0;
    const p = v.vendedor_id && porId('equipo', v.vendedor_id);
    if (!(v.canal === 'calle' || (p && p.tipo === 'calle'))) return 0;
    return Math.max(0, Math.round(tv(v).util * (Number(DB.empresa.pct_fondo) || 0) / 100));
  }
  const totCompra = (c) => (c.items || []).reduce((a, i) => a + int(i.cant) * int(i.costo), 0) + int(c.flete);

  function rango(per) {
    const d = new Date(); const y = d.getFullYear(), m = d.getMonth();
    const f = (x) => x.toLocaleDateString('en-CA');
    switch (per) {
      case 'hoy': return [hoy(), hoy()];
      case '7d': { const a = new Date(); a.setDate(a.getDate() - 6); return [f(a), hoy()]; }
      case '30d': { const a = new Date(); a.setDate(a.getDate() - 29); return [f(a), hoy()]; }
      case 'mes': return [f(new Date(y, m, 1)), f(new Date(y, m + 1, 0))];
      case 'mesant': return [f(new Date(y, m - 1, 1)), f(new Date(y, m, 0))];
      case 'anio': return [`${y}-01-01`, `${y}-12-31`];
      default: return ['0000-01-01', '9999-12-31'];
    }
  }
  const PERIODOS = { hoy: 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', mes: 'Este mes', mesant: 'Mes pasado', anio: 'Este año', todo: 'Todo' };
  const enRango = (f, [a, b]) => f >= a && f <= b;

  function saldosEquipo() {
    const r = {};
    DB.equipo.forEach((p) => { r[p.id] = { generado: 0, pagado: 0, unidades: 0, ventas: 0 }; });
    DB.ventas.forEach((v) => {
      if (v.anulada || !v.vendedor_id || !r[v.vendedor_id]) return;
      r[v.vendedor_id].ventas += 1; r[v.vendedor_id].unidades += tv(v).unidades;
      if (v.pago === 'pagado') r[v.vendedor_id].generado += comision(v);
    });
    DB.pagos_equipo.forEach((p) => { if (r[p.persona_id]) r[p.persona_id].pagado += int(p.valor); });
    Object.values(r).forEach((x) => { x.saldo = x.generado - x.pagado; });
    return r;
  }

  /* =================================================================
     Guardado con aviso de estado
     ================================================================= */
  function estado(txt, tipo) {
    const e = $('#estado'); if (!e) return;
    e.className = 'estado ' + (tipo || ''); $('span', e).textContent = txt;
  }
  async function guardar(t, row) {
    estado('Guardando…', 'ocupado');
    try {
      const r = await ST.guardar(t, row);
      const i = DB[t].findIndex((x) => x.id === r.id);
      if (i === -1) DB[t].push(r); else DB[t][i] = r;
      indexar(); estado(ST.modo === 'prueba' ? 'Guardado en este navegador' : 'Guardado en Supabase', 'ok');
      return r;
    } catch (e) { estado('No se guardó', 'error'); aviso('No se pudo guardar: ' + e.message, 'error'); throw e; }
  }
  async function borrar(t, id) {
    estado('Guardando…', 'ocupado');
    try { await ST.borrar(t, id); DB[t] = DB[t].filter((x) => x.id !== id); indexar(); estado('Guardado', 'ok'); }
    catch (e) { estado('No se guardó', 'error'); aviso('No se pudo borrar: ' + e.message, 'error'); throw e; }
  }
  let avisoT;
  function aviso(msg, tipo) {
    const t = $('#aviso'); t.textContent = msg; t.className = 'aviso show ' + (tipo || '');
    clearTimeout(avisoT); avisoT = setTimeout(() => t.classList.remove('show'), tipo === 'error' ? 6000 : 2600);
  }

  /* =================================================================
     Piezas de interfaz
     ================================================================= */
  const kpi = (label, valor, detalle, tono) => `<div class="kpi ${tono || ''}"><small>${label}</small><b>${valor}</b>${detalle ? `<span>${detalle}</span>` : ''}</div>`;
  const chip = (txt, tono) => `<span class="pchip ${tono || ''}">${esc(txt)}</span>`;
  const selector = (id, opts, val, extra) => `<select id="${id}" ${extra || ''}>${Object.entries(opts).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(val) ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  const vacio = (txt, accion, etiqueta) => `<div class="vacio">${window.gatoSVG ? gatoSVG('grande') : ''}<p>${txt}</p>${accion ? `<button class="btn btn-primary" data-accion="${accion}">${etiqueta}</button>` : ''}</div>`;
  const foto = (p) => (p && p.imagen ? `<img class="mini" src="${esc(p.imagen)}" alt="" loading="lazy">` : '<span class="mini"></span>');

  function barras(datos, alto) {
    const H = alto || 160, W = Math.max(datos.length * 22, 300), max = Math.max(1, ...datos.map((d) => d.valor));
    const bw = W / datos.length;
    return `<svg class="grafico" viewBox="0 0 ${W} ${H + 22}" preserveAspectRatio="none" role="img" aria-label="Ventas por día">
      ${[0.25, 0.5, 0.75, 1].map((k) => `<line x1="0" x2="${W}" y1="${H - H * k}" y2="${H - H * k}" class="guia"/>`).join('')}
      ${datos.map((d, i) => { const h = Math.max(d.valor ? 3 : 0, (d.valor / max) * (H - 8)); return `<g><title>${esc(d.etiqueta)}: ${money(d.valor)}</title><rect x="${i * bw + bw * 0.18}" y="${H - h}" width="${bw * 0.64}" height="${h}" rx="3" class="${d.hoy ? 'hoy' : ''}"/>${d.marca ? `<text x="${i === datos.length - 1 ? W - 2 : i * bw + bw / 2}" y="${H + 16}" text-anchor="${i === datos.length - 1 ? 'end' : 'middle'}">${esc(d.marca)}</text>` : ''}</g>`; }).join('')}
    </svg>`;
  }
  function listaBarras(filas) {
    const max = Math.max(1, ...filas.map((f) => f.valor));
    return `<div class="lbarras">${filas.map((f) => `<div class="lb"><span>${esc(f.etiqueta)}</span><div><i style="width:${(f.valor / max) * 100}%"></i></div><b>${f.texto || money(f.valor)}</b></div>`).join('')}</div>`;
  }
  const periodoSel = () => `<div class="seg" role="group" aria-label="Periodo">${Object.entries(PERIODOS).map(([k, v]) => `<button type="button" data-accion="periodo" data-p="${k}" aria-pressed="${UI.periodo === k}">${v}</button>`).join('')}</div>`;

  /* =================================================================
     Vistas
     ================================================================= */
  const VISTAS = {};

  VISTAS.resumen = {
    titulo: 'Resumen',
    html() {
      const R = rango(UI.periodo);
      const vs = DB.ventas.filter((v) => !v.anulada && enRango(v.fecha, R));
      const tot = vs.reduce((a, v) => { const t = tv(v); a.neto += t.neto; a.util += t.util; a.u += t.unidades; a.com += comision(v); a.fondo += fondo(v); return a; }, { neto: 0, util: 0, u: 0, com: 0, fondo: 0 });
      const gastos = DB.gastos.filter((g) => enRango(g.fecha, R)).reduce((a, g) => a + int(g.valor), 0);
      const neta = tot.util - tot.com - tot.fondo - gastos;
      // gráfico: últimos 30 días
      const dias = []; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias.push(d.toLocaleDateString('en-CA')); }
      const porDia = Object.fromEntries(dias.map((d) => [d, 0]));
      DB.ventas.forEach((v) => { if (!v.anulada && v.fecha in porDia) porDia[v.fecha] += tv(v).neto; });
      const datos = dias.map((d, i) => ({ etiqueta: fechaCorta(d), valor: porDia[d], hoy: i === 29, marca: i % 5 === 4 || i === 29 ? d.slice(8) + '/' + d.slice(5, 7) : '' }));
      // top productos y canales en el periodo
      const top = {}; const canales = {};
      vs.forEach((v) => { (v.items || []).forEach((i) => { top[i.producto_id] = (top[i.producto_id] || 0) + int(i.cant); }); canales[v.canal] = (canales[v.canal] || 0) + tv(v).neto; });
      const topF = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ etiqueta: (prod(id) || { nombre: id }).nombre, valor: n, texto: n + ' u.' }));
      const canF = Object.entries(canales).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ etiqueta: CANALES[c] || c, valor: n }));
      // alertas
      const bajos = DB.productos.filter((p) => p.activo && stockDe(p.id) <= int(p.stock_min));
      const porCobrar = DB.ventas.filter((v) => !v.anulada && v.pago === 'pendiente');
      const porDespachar = DB.ventas.filter((v) => !v.anulada && v.entrega === 'por_despachar');
      const sal = saldosEquipo(); const comPend = Object.values(sal).reduce((a, x) => a + Math.max(0, x.saldo), 0);
      const comprasPend = DB.compras.filter((c) => c.pago === 'pendiente');
      const invCosto = DB.productos.reduce((a, p) => a + Math.max(0, stockDe(p.id)) * int(p.costo), 0);
      const invVenta = DB.productos.reduce((a, p) => a + Math.max(0, stockDe(p.id)) * int(p.precio), 0);
      const alerta = (n, txt, vista, tono) => n ? `<button class="alerta ${tono || ''}" data-accion="ir" data-vista="${vista}"><b>${n}</b><span>${txt}</span><i aria-hidden="true">→</i></button>` : '';
      return `
      <div class="barra-sup">${periodoSel()}</div>
      <div class="kpis">
        ${kpi('Ventas', money(tot.neto), vs.length + (vs.length === 1 ? ' pedido' : ' pedidos'))}
        ${kpi('Utilidad bruta', money(tot.util), tot.neto ? Math.round((tot.util / tot.neto) * 100) + ' % de margen' : '—')}
        ${kpi('Utilidad neta', money(neta), 'después de comisiones y gastos', neta < 0 ? 'mal' : 'bien')}
        ${kpi('Ticket promedio', money(vs.length ? tot.neto / vs.length : 0), tot.u + ' unidades vendidas')}
      </div>
      <div class="rejilla-2">
        <section class="tarjeta ancha"><header><h2>Ventas de los últimos 30 días</h2><span class="nota">${money(Object.values(porDia).reduce((a, b) => a + b, 0))}</span></header>${barras(datos)}</section>
        <section class="tarjeta"><header><h2>Pendientes</h2></header>
          <div class="alertas">
            ${alerta(porCobrar.length, 'ventas por cobrar · ' + money(porCobrar.reduce((a, v) => a + tv(v).total, 0)), 'ventas', 'ambar')}
            ${alerta(porDespachar.length, 'pedidos por despachar', 'ventas', 'ambar')}
            ${alerta(bajos.length, 'productos con pocas existencias', 'inventario', 'ambar')}
            ${alerta(comPend ? DB.equipo.filter((p) => sal[p.id] && sal[p.id].saldo > 0).length : 0, 'personas con comisión por pagar · ' + money(comPend), 'equipo')}
            ${alerta(DB.productos.filter((p) => p.activo && !int(p.costo)).length, 'productos sin costo: la utilidad sale inflada', 'inventario', 'ambar')}
            ${alerta(comprasPend.length, 'compras por pagar · ' + money(comprasPend.reduce((a, c) => a + totCompra(c), 0)), 'compras')}
            ${!porCobrar.length && !porDespachar.length && !bajos.length && !comPend && !comprasPend.length && !DB.productos.some((p) => p.activo && !int(p.costo)) ? '<p class="nota">Todo al día. El gato está satisfecho.</p>' : ''}
          </div>
        </section>
        <section class="tarjeta"><header><h2>Más vendidos</h2><span class="nota">${PERIODOS[UI.periodo]}</span></header>${topF.length ? listaBarras(topF) : '<p class="nota">Aún no hay ventas en este periodo.</p>'}</section>
        <section class="tarjeta"><header><h2>Ventas por canal</h2><span class="nota">${PERIODOS[UI.periodo]}</span></header>${canF.length ? listaBarras(canF) : '<p class="nota">Aún no hay ventas en este periodo.</p>'}</section>
        <section class="tarjeta"><header><h2>Inventario</h2></header>
          <div class="mini-kpis">${kpi('Unidades', DB.productos.reduce((a, p) => a + Math.max(0, stockDe(p.id)), 0))}${kpi('Valor al costo', money(invCosto))}${kpi('Valor a precio de venta', money(invVenta))}</div>
        </section>
        <section class="tarjeta"><header><h2>Caja</h2></header>
          <div class="mini-kpis">${kpi('Saldo en caja', money(caja().saldo), '', caja().saldo < 0 ? 'mal' : '')}${kpi('Por cobrar', money(porCobrar.reduce((a, v) => a + tv(v).total, 0)))}${kpi('Por pagar', money(comPend + comprasPend.reduce((a, c) => a + totCompra(c), 0)))}</div>
        </section>
      </div>`;
    },
  };

  VISTAS.ventas = {
    titulo: 'Ventas', boton: ['nueva-venta', 'Nueva venta'],
    html() {
      const f = UI.filtros.ventas || (UI.filtros.ventas = { q: '', estado: 'todas', canal: 'todos' });
      const R = rango(UI.periodo); const q = f.q.toLowerCase();
      const lista = DB.ventas.filter((v) => {
        if (!enRango(v.fecha, R)) return false;
        if (f.canal !== 'todos' && v.canal !== f.canal) return false;
        if (f.estado === 'por_cobrar' && (v.anulada || v.pago !== 'pendiente')) return false;
        if (f.estado === 'por_despachar' && (v.anulada || v.entrega !== 'por_despachar')) return false;
        if (f.estado === 'anuladas' && !v.anulada) return false;
        if (q) { const c = porId('clientes', v.cliente_id); if (!(`#${v.numero} ${c ? c.nombre + ' ' + (c.telefono || '') : ''} ${(v.items || []).map((i) => i.nombre).join(' ')}`).toLowerCase().includes(q)) return false; }
        return true;
      }).sort((a, b) => (b.fecha + String(b.numero).padStart(8, '0')).localeCompare(a.fecha + String(a.numero).padStart(8, '0')));
      const sum = lista.filter((v) => !v.anulada).reduce((a, v) => a + tv(v).neto, 0);
      return `
      <div class="barra-sup">${periodoSel()}</div>
      <div class="filtros">
        <input type="search" id="f-q" placeholder="Buscar por número, cliente o producto" value="${esc(f.q)}">
        ${selector('f-estado', { todas: 'Todas', por_cobrar: 'Por cobrar', por_despachar: 'Por despachar', anuladas: 'Anuladas' }, f.estado)}
        ${selector('f-canal', Object.assign({ todos: 'Todos los canales' }, CANALES), f.canal)}
        <span class="nota">${lista.length} ventas · ${money(sum)}</span>
        <button class="btn btn-ghost btn-sm" data-accion="csv-ventas">Exportar CSV</button>
      </div>
      ${lista.length ? `<table class="tabla"><thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Canal</th><th class="der">Total</th><th>Pago</th><th>Entrega</th><th></th></tr></thead><tbody>
        ${lista.map((v) => { const t = tv(v); const c = porId('clientes', v.cliente_id); return `<tr class="${v.anulada ? 'anulada' : ''}">
          <td data-l="N.º"><b>#${v.numero || '—'}</b></td>
          <td data-l="Fecha">${fechaCorta(v.fecha)}</td>
          <td data-l="Cliente">${c ? esc(c.nombre) : '<span class="nota">Sin cliente</span>'}</td>
          <td data-l="Productos">${(v.items || []).map((i) => `${i.cant} × ${esc(i.nombre)}${i.variante ? ' (' + esc(i.variante) + ')' : ''}`).join('<br>')}</td>
          <td data-l="Canal">${esc(CANALES[v.canal] || v.canal)}</td>
          <td data-l="Total" class="der num">${money(t.total)}</td>
          <td data-l="Pago">${v.anulada ? chip('Anulada', 'gris') : `<button class="pchip ${v.pago === 'pagado' ? 'menta' : 'ambar'}" data-accion="toggle-pago" data-id="${v.id}" title="Cambiar estado de pago">${v.pago === 'pagado' ? 'Pagado' : 'Por cobrar'}</button>`}</td>
          <td data-l="Entrega">${v.anulada ? '' : `<select class="mini-sel" data-accion-cambio="entrega" data-id="${v.id}">${Object.entries(ENTREGAS).map(([k, l]) => `<option value="${k}"${v.entrega === k ? ' selected' : ''}>${l}</option>`).join('')}</select>`}</td>
          <td class="acciones"><button class="ico-btn" data-accion="recibo" data-id="${v.id}" title="Recibo" aria-label="Recibo">🧾</button><button class="ico-btn" data-accion="editar-venta" data-id="${v.id}" title="Editar" aria-label="Editar">✎</button></td>
        </tr>`; }).join('')}</tbody></table>` : vacio('No hay ventas con estos filtros.', 'nueva-venta', 'Registrar una venta')}`;
    },
  };

  VISTAS.compras = {
    titulo: 'Compras', boton: ['nueva-compra', 'Nueva compra'],
    html() {
      const R = rango(UI.periodo);
      const lista = DB.compras.filter((c) => enRango(c.fecha, R)).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.numero - a.numero));
      const tot = lista.reduce((a, c) => a + totCompra(c), 0); const pend = lista.filter((c) => c.pago === 'pendiente').reduce((a, c) => a + totCompra(c), 0);
      return `
      <div class="barra-sup">${periodoSel()}</div>
      <div class="kpis">${kpi('Comprado', money(tot), lista.length + ' compras')}${kpi('Por pagar', money(pend), '', pend ? 'mal' : '')}${kpi('Unidades recibidas', lista.reduce((a, c) => a + (c.items || []).reduce((s, i) => s + int(i.cant), 0), 0))}</div>
      ${lista.length ? `<table class="tabla"><thead><tr><th>N.º</th><th>Fecha</th><th>Proveedor</th><th>Productos</th><th class="der">Total</th><th>Pago</th><th></th></tr></thead><tbody>
        ${lista.map((c) => { const pv = porId('proveedores', c.proveedor_id); return `<tr>
          <td data-l="N.º"><b>C-${c.numero || '—'}</b></td><td data-l="Fecha">${fechaCorta(c.fecha)}</td>
          <td data-l="Proveedor">${pv ? esc(pv.nombre) : '<span class="nota">—</span>'}</td>
          <td data-l="Productos">${(c.items || []).map((i) => `${i.cant} × ${esc(i.nombre)} <span class="nota">a ${money(i.costo)}</span>`).join('<br>')}</td>
          <td data-l="Total" class="der num">${money(totCompra(c))}</td>
          <td data-l="Pago"><button class="pchip ${c.pago === 'pagado' ? 'menta' : 'ambar'}" data-accion="toggle-pago-compra" data-id="${c.id}">${c.pago === 'pagado' ? 'Pagada' : 'Por pagar'}</button></td>
          <td class="acciones"><button class="ico-btn" data-accion="editar-compra" data-id="${c.id}" aria-label="Editar">✎</button><button class="ico-btn" data-accion="borrar" data-t="compras" data-id="${c.id}" aria-label="Borrar">🗑</button></td>
        </tr>`; }).join('')}</tbody></table>` : vacio('No hay compras en este periodo. Registra lo que le compras a tus proveedores y el inventario sube solo.', 'nueva-compra', 'Registrar una compra')}`;
    },
  };

  VISTAS.inventario = {
    titulo: 'Inventario', boton: ['nuevo-producto', 'Nuevo producto'],
    html() {
      const f = UI.filtros.inv || (UI.filtros.inv = { q: '', cat: 'todas' });
      const q = f.q.toLowerCase();
      const lista = DB.productos.filter((p) => (f.cat === 'todas' || p.categoria_id === f.cat) && (!q || p.nombre.toLowerCase().includes(q))).sort((a, b) => stockDe(a.id) - int(a.stock_min) - (stockDe(b.id) - int(b.stock_min)) || a.nombre.localeCompare(b.nombre));
      const cats = Object.fromEntries(DB.categorias.map((c) => [c.id, c.nombre]));
      const unidades = DB.productos.reduce((a, p) => a + Math.max(0, stockDe(p.id)), 0);
      return `
      <div class="kpis">${kpi('Productos', DB.productos.filter((p) => p.activo).length, DB.productos.filter((p) => !p.activo).length + ' ocultos')}${kpi('Unidades', unidades)}${kpi('Valor al costo', money(DB.productos.reduce((a, p) => a + Math.max(0, stockDe(p.id)) * int(p.costo), 0)))}${kpi('Sin costo registrado', DB.productos.filter((p) => !int(p.costo)).length, 'complétalo para ver utilidades reales', DB.productos.some((p) => !int(p.costo)) ? 'mal' : '')}</div>
      <div class="filtros">
        <input type="search" id="f-inv" placeholder="Buscar producto" value="${esc(f.q)}">
        ${selector('f-cat', Object.assign({ todas: 'Todas las categorías' }, cats), f.cat)}
        <button class="btn btn-ghost btn-sm" data-accion="nuevo-ajuste">Ajustar existencias</button>
        <button class="btn btn-ghost btn-sm" data-accion="categorias">Categorías</button>
      </div>
      <table class="tabla"><thead><tr><th></th><th>Producto</th><th>Categoría</th><th class="der">Precio</th><th class="der">Costo</th><th class="der">Margen</th><th class="der">Existencias</th><th class="der">Vendidos</th><th></th></tr></thead><tbody>
      ${lista.map((p) => { const s = stockDe(p.id); const m = p.precio ? Math.round(((p.precio - int(p.costo)) / p.precio) * 100) : 0; return `<tr class="${p.activo ? '' : 'anulada'}">
        <td>${foto(p)}</td>
        <td data-l="Producto"><b>${esc(p.nombre)}</b>${p.activo ? '' : ' ' + chip('Oculto', 'gris')}</td>
        <td data-l="Categoría">${esc(cats[p.categoria_id] || '—')}</td>
        <td data-l="Precio" class="der num">${money(p.precio)}</td>
        <td data-l="Costo" class="der num">${int(p.costo) ? money(p.costo) : chip('Falta', 'ambar')}</td>
        <td data-l="Margen" class="der num">${int(p.costo) ? m + ' %' : '—'}</td>
        <td data-l="Existencias" class="der">${chip(s, s <= 0 ? 'rojo' : s <= int(p.stock_min) ? 'ambar' : 'menta')}</td>
        <td data-l="Vendidos" class="der num">${IDX.vendidos[p.id] || 0}</td>
        <td class="acciones"><button class="ico-btn" data-accion="ajustar" data-id="${p.id}" title="Ajustar existencias" aria-label="Ajustar existencias">±</button><button class="ico-btn" data-accion="editar-producto" data-id="${p.id}" aria-label="Editar">✎</button></td>
      </tr>`; }).join('')}</tbody></table>
      <p class="nota" style="margin-top:14px">Las existencias se calculan solas: inicial + compras + ajustes − ventas. ${ST.modo === 'supabase' ? 'La tienda las muestra en tiempo real.' : 'En modo prueba la tienda no cambia.'}</p>`;
    },
  };

  const fotoCategoria = (c) => {
    if (c.imagen && c.imagen.includes('/')) return c.imagen;
    const p = (c.imagen && prod(c.imagen)) || DB.productos.find((x) => x.categoria_id === c.id && x.activo);
    return p ? (p.imagen || `assets/img/productos/${p.id}.svg`) : 'assets/img/marca/gatoarisco-icono-noche.png';
  };
  const categoriasOrdenadas = () => DB.categorias.slice().sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre));

  VISTAS.categorias = {
    titulo: 'Categorías', boton: ['nueva-categoria', 'Nueva categoría'],
    html() {
      const lista = categoriasOrdenadas();
      const cuenta = {}; DB.productos.forEach((p) => { if (p.activo) cuenta[p.categoria_id] = (cuenta[p.categoria_id] || 0) + 1; });
      return `<p class="nota">Las categorías ordenan la tienda: aparecen como tarjetas en el inicio y como filtros en la tienda, en este orden.</p>
      ${lista.length ? `<table class="tabla"><thead><tr><th></th><th>Categoría</th><th>Descripción corta</th><th class="der">Productos</th><th>Orden</th><th></th></tr></thead><tbody>
      ${lista.map((c, i) => `<tr>
        <td><img class="mini" src="${esc(fotoCategoria(c))}" alt=""></td>
        <td data-l="Categoría"><b>${esc(c.nombre)}</b></td>
        <td data-l="Descripción">${esc(c.detalle || '—')}</td>
        <td data-l="Productos" class="der num">${cuenta[c.id] || 0}</td>
        <td data-l="Orden"><button class="ico-btn" data-accion="cat-subir" data-id="${esc(c.id)}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button class="ico-btn" data-accion="cat-bajar" data-id="${esc(c.id)}" aria-label="Bajar" ${i === lista.length - 1 ? 'disabled' : ''}>↓</button></td>
        <td class="acciones"><button class="ico-btn" data-accion="editar-categoria" data-id="${esc(c.id)}" aria-label="Editar">✎</button></td>
      </tr>`).join('')}</tbody></table>` : vacio('Todavía no hay categorías. Crea la primera para empezar a ordenar la tienda.', 'nueva-categoria', 'Crear categoría')}`;
    },
  };

  VISTAS.clientes = {
    titulo: 'Clientes', boton: ['nuevo-cliente', 'Nuevo cliente'],
    html() {
      const f = UI.filtros.cli || (UI.filtros.cli = { q: '' }); const q = f.q.toLowerCase();
      const st = {}; DB.ventas.forEach((v) => { if (v.anulada || !v.cliente_id) return; const s = st[v.cliente_id] || (st[v.cliente_id] = { n: 0, total: 0, ult: '' }); s.n++; s.total += tv(v).total; if (v.fecha > s.ult) s.ult = v.fecha; });
      const lista = DB.clientes.filter((c) => !q || `${c.nombre} ${c.telefono || ''} ${c.ciudad || ''}`.toLowerCase().includes(q)).sort((a, b) => ((st[b.id] || {}).total || 0) - ((st[a.id] || {}).total || 0));
      return `
      <div class="filtros"><input type="search" id="f-cli" placeholder="Buscar por nombre, celular o ciudad" value="${esc(f.q)}"><span class="nota">${DB.clientes.length} clientes</span></div>
      ${lista.length ? `<table class="tabla"><thead><tr><th>Cliente</th><th>Celular</th><th>Ciudad</th><th class="der">Compras</th><th class="der">Total comprado</th><th>Última compra</th><th></th></tr></thead><tbody>
      ${lista.map((c) => { const s = st[c.id] || { n: 0, total: 0, ult: '' }; return `<tr>
        <td data-l="Cliente"><b>${esc(c.nombre)}</b></td>
        <td data-l="Celular">${c.telefono ? `<a href="https://wa.me/${esc(waNum(c.telefono))}" target="_blank" rel="noopener">${esc(c.telefono)}</a>` : '—'}</td>
        <td data-l="Ciudad">${esc(c.ciudad || '—')}</td>
        <td data-l="Compras" class="der num">${s.n}</td><td data-l="Total" class="der num">${money(s.total)}</td>
        <td data-l="Última">${s.ult ? fechaCorta(s.ult) : '—'}</td>
        <td class="acciones"><button class="ico-btn" data-accion="editar-cliente" data-id="${c.id}" aria-label="Editar">✎</button></td>
      </tr>`; }).join('')}</tbody></table>` : vacio('Aún no hay clientes. Se crean solos al registrar ventas.', 'nuevo-cliente', 'Agregar cliente')}`;
    },
  };

  VISTAS.proveedores = {
    titulo: 'Proveedores', boton: ['nuevo-proveedor', 'Nuevo proveedor'],
    html() {
      const tot = {}; DB.compras.forEach((c) => { if (c.proveedor_id) tot[c.proveedor_id] = (tot[c.proveedor_id] || 0) + totCompra(c); });
      return DB.proveedores.length ? `<table class="tabla"><thead><tr><th>Proveedor</th><th>Tipo</th><th>Contacto</th><th>Ciudad</th><th class="der">Comprado</th><th></th></tr></thead><tbody>
      ${DB.proveedores.map((p) => `<tr>
        <td data-l="Proveedor"><b>${esc(p.nombre)}</b>${p.nota ? `<br><span class="nota">${esc(p.nota)}</span>` : ''}</td>
        <td data-l="Tipo">${esc(p.tipo || '—')}</td>
        <td data-l="Contacto">${esc(p.contacto || '')}${p.telefono ? ` · <a href="https://wa.me/${esc(waNum(p.telefono))}" target="_blank" rel="noopener">${esc(p.telefono)}</a>` : ''}</td>
        <td data-l="Ciudad">${esc(p.ciudad || '—')}</td>
        <td data-l="Comprado" class="der num">${money(tot[p.id] || 0)}</td>
        <td class="acciones"><button class="ico-btn" data-accion="editar-proveedor" data-id="${p.id}" aria-label="Editar">✎</button></td>
      </tr>`).join('')}</tbody></table>` : vacio('Registra a quién le compras: fabricantes de pines, bordados, estampados o importaciones.', 'nuevo-proveedor', 'Agregar proveedor');
    },
  };

  VISTAS.equipo = {
    titulo: 'Equipo y comisiones', boton: ['nueva-persona', 'Nueva persona'],
    html() {
      const sal = saldosEquipo(); const tar = DB.empresa.tarifas || {};
      const total = Object.values(sal).reduce((a, x) => a + Math.max(0, x.saldo), 0);
      return `
      <div class="kpis">${kpi('Embajadores', DB.equipo.filter((p) => p.tipo === 'embajador' && p.activo).length)}${kpi('Vendedores en calle', DB.equipo.filter((p) => p.tipo === 'calle' && p.activo).length)}${kpi('Comisiones por pagar', money(total), 'solo de ventas ya pagadas', total ? 'mal' : '')}</div>
      <p class="nota">Embajadores: ${Object.entries(NIVELES).map(([k, n]) => `${n} ${money(tar[k])}`).join(' · ')} por unidad. Vendedores en calle: ${DB.empresa.pct_calle} % de la utilidad de cada venta. Se cambia en Ajustes.</p>
      ${DB.equipo.length ? `<table class="tabla"><thead><tr><th>Persona</th><th>Tipo</th><th>Código</th><th class="der">Ventas</th><th class="der">Generado</th><th class="der">Pagado</th><th class="der">Saldo</th><th></th></tr></thead><tbody>
      ${DB.equipo.map((p) => { const s = sal[p.id]; return `<tr class="${p.activo ? '' : 'anulada'}">
        <td data-l="Persona"><b>${esc(p.nombre)}</b>${p.telefono ? `<br><a class="nota" href="https://wa.me/${esc(waNum(p.telefono))}" target="_blank" rel="noopener">${esc(p.telefono)}</a>` : ''}</td>
        <td data-l="Tipo">${p.tipo === 'embajador' ? 'Embajador · ' + (NIVELES[p.nivel] || '') : 'Vendedor en calle'}</td>
        <td data-l="Código">${p.codigo ? `<button class="pchip" data-accion="copiar-enlace" data-codigo="${esc(p.codigo)}" title="Copiar enlace con descuento">${esc(p.codigo)} ⧉</button>` : '—'}</td>
        <td data-l="Ventas" class="der num">${s.ventas} · ${s.unidades} u.</td>
        <td data-l="Generado" class="der num">${money(s.generado)}</td>
        <td data-l="Pagado" class="der num">${money(s.pagado)}</td>
        <td data-l="Saldo" class="der">${s.saldo > 0 ? chip(money(s.saldo), 'ambar') : chip(money(s.saldo), 'menta')}</td>
        <td class="acciones">${s.saldo > 0 ? `<button class="btn btn-primary btn-sm" data-accion="pagar-persona" data-id="${p.id}">Pagar</button>` : ''}<button class="ico-btn" data-accion="editar-persona" data-id="${p.id}" aria-label="Editar">✎</button></td>
      </tr>`; }).join('')}</tbody></table>` : vacio('Agrega a tus embajadores y vendedores en calle para calcular sus comisiones.', 'nueva-persona', 'Agregar persona')}
      ${DB.pagos_equipo.length ? `<h3 class="subt">Pagos realizados</h3><table class="tabla"><thead><tr><th>Fecha</th><th>Persona</th><th class="der">Valor</th><th>Método</th><th></th></tr></thead><tbody>
        ${DB.pagos_equipo.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map((x) => `<tr><td data-l="Fecha">${fechaCorta(x.fecha)}</td><td data-l="Persona">${esc((porId('equipo', x.persona_id) || {}).nombre || '—')}</td><td data-l="Valor" class="der num">${money(x.valor)}</td><td data-l="Método">${esc(x.metodo || '')}</td><td class="acciones"><button class="ico-btn" data-accion="borrar" data-t="pagos_equipo" data-id="${x.id}" aria-label="Borrar">🗑</button></td></tr>`).join('')}
      </tbody></table>` : ''}`;
    },
  };

  VISTAS.gastos = {
    titulo: 'Gastos', boton: ['nuevo-gasto', 'Nuevo gasto'],
    html() {
      const R = rango(UI.periodo);
      const lista = DB.gastos.filter((g) => enRango(g.fecha, R)).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const porCat = {}; lista.forEach((g) => { porCat[g.categoria] = (porCat[g.categoria] || 0) + int(g.valor); });
      return `
      <div class="barra-sup">${periodoSel()}</div>
      <div class="rejilla-2">
        <section class="tarjeta"><header><h2>Total</h2></header><div class="kpi grande"><b>${money(lista.reduce((a, g) => a + int(g.valor), 0))}</b><span>${lista.length} gastos · ${PERIODOS[UI.periodo]}</span></div></section>
        <section class="tarjeta"><header><h2>Por categoría</h2></header>${Object.keys(porCat).length ? listaBarras(Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ etiqueta: k, valor: v }))) : '<p class="nota">Sin gastos en este periodo.</p>'}</section>
      </div>
      ${lista.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="der">Valor</th><th>Método</th><th></th></tr></thead><tbody>
      ${lista.map((g) => `<tr><td data-l="Fecha">${fechaCorta(g.fecha)}</td><td data-l="Categoría">${esc(g.categoria)}</td><td data-l="Descripción">${esc(g.descripcion || '')}</td><td data-l="Valor" class="der num">${money(g.valor)}</td><td data-l="Método">${esc(g.metodo || '')}</td>
        <td class="acciones"><button class="ico-btn" data-accion="editar-gasto" data-id="${g.id}" aria-label="Editar">✎</button><button class="ico-btn" data-accion="borrar" data-t="gastos" data-id="${g.id}" aria-label="Borrar">🗑</button></td></tr>`).join('')}
      </tbody></table>` : vacio('Registra publicidad, empaques, envíos y demás gastos para conocer tu utilidad real.', 'nuevo-gasto', 'Registrar gasto')}`;
    },
  };

  function caja() {
    const movs = [];
    DB.ventas.forEach((v) => { if (!v.anulada && v.pago === 'pagado') movs.push({ fecha: v.fecha, tipo: 'Venta #' + v.numero, detalle: (porId('clientes', v.cliente_id) || {}).nombre || CANALES[v.canal] || '', valor: tv(v).total, metodo: v.metodo }); });
    DB.compras.forEach((c) => { if (c.pago === 'pagado') movs.push({ fecha: c.fecha, tipo: 'Compra C-' + c.numero, detalle: (porId('proveedores', c.proveedor_id) || {}).nombre || '', valor: -totCompra(c), metodo: c.metodo }); });
    DB.gastos.forEach((g) => movs.push({ fecha: g.fecha, tipo: 'Gasto · ' + g.categoria, detalle: g.descripcion || '', valor: -int(g.valor), metodo: g.metodo }));
    DB.pagos_equipo.forEach((p) => movs.push({ fecha: p.fecha, tipo: 'Pago de comisión', detalle: (porId('equipo', p.persona_id) || {}).nombre || '', valor: -int(p.valor), metodo: p.metodo }));
    movs.sort((a, b) => a.fecha.localeCompare(b.fecha));
    let s = int(DB.empresa.saldo_inicial); movs.forEach((m) => { s += m.valor; m.saldo = s; });
    return { movs, saldo: s };
  }

  VISTAS.caja = {
    titulo: 'Caja',
    html() {
      const R = rango(UI.periodo); const { movs, saldo } = caja();
      const lista = movs.filter((m) => enRango(m.fecha, R)).reverse();
      const ent = lista.filter((m) => m.valor > 0).reduce((a, m) => a + m.valor, 0), sal = lista.filter((m) => m.valor < 0).reduce((a, m) => a - m.valor, 0);
      const porMetodo = {}; movs.forEach((m) => { const k = m.metodo || 'Sin método'; porMetodo[k] = (porMetodo[k] || 0) + m.valor; });
      return `
      <div class="barra-sup">${periodoSel()}</div>
      <div class="kpis">${kpi('Saldo actual', money(saldo), 'incluye saldo inicial de ' + money(DB.empresa.saldo_inicial), saldo < 0 ? 'mal' : 'bien')}${kpi('Entradas', money(ent), PERIODOS[UI.periodo])}${kpi('Salidas', money(sal), PERIODOS[UI.periodo])}${kpi('Flujo del periodo', money(ent - sal), '', ent - sal < 0 ? 'mal' : '')}</div>
      <section class="tarjeta"><header><h2>Dónde está la plata</h2><span class="nota">acumulado por método de pago</span></header>${listaBarras(Object.entries(porMetodo).filter(([, v]) => v).map(([k, v]) => ({ etiqueta: k, valor: Math.abs(v), texto: money(v) })))}</section>
      ${lista.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th><th>Método</th><th class="der">Valor</th><th class="der">Saldo</th></tr></thead><tbody>
      ${lista.map((m) => `<tr><td data-l="Fecha">${fechaCorta(m.fecha)}</td><td data-l="Movimiento">${esc(m.tipo)}</td><td data-l="Detalle">${esc(m.detalle)}</td><td data-l="Método">${esc(m.metodo || '')}</td><td data-l="Valor" class="der num ${m.valor < 0 ? 'neg' : 'pos'}">${m.valor < 0 ? '−' : '+'} ${money(Math.abs(m.valor))}</td><td data-l="Saldo" class="der num">${money(m.saldo)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="nota">No hay movimientos de caja en este periodo. Solo cuentan ventas pagadas, compras pagadas, gastos y pagos de comisiones.</p>'}`;
    },
  };

  VISTAS.resultados = {
    titulo: 'Estado de resultados',
    html() {
      const y = UI.anio || new Date().getFullYear();
      const anios = new Set([new Date().getFullYear()]); DB.ventas.forEach((v) => anios.add(+v.fecha.slice(0, 4)));
      const filas = { bruto: 'Ventas brutas', desc: '− Descuentos', neto: 'Ventas netas', envios: '+ Envíos cobrados', costo: '− Costo de lo vendido', ub: 'Utilidad bruta', com: '− Comisiones', fondo: '− Fondo de Protección Social', gastos: '− Gastos', un: 'Utilidad neta' };
      const M = Array.from({ length: 12 }, () => Object.fromEntries(Object.keys(filas).map((k) => [k, 0])));
      DB.ventas.forEach((v) => {
        if (v.anulada || +v.fecha.slice(0, 4) !== y) return; const m = M[+v.fecha.slice(5, 7) - 1]; const t = tv(v);
        m.bruto += t.sub; m.desc += int(v.descuento); m.neto += t.neto; m.envios += int(v.envio); m.costo += t.costo; m.com += comision(v); m.fondo += fondo(v);
      });
      DB.gastos.forEach((g) => { if (+g.fecha.slice(0, 4) === y) M[+g.fecha.slice(5, 7) - 1].gastos += int(g.valor); });
      M.forEach((m) => { m.ub = m.neto + m.envios - m.costo; m.un = m.ub - m.com - m.fondo - m.gastos; });
      const tot = Object.fromEntries(Object.keys(filas).map((k) => [k, M.reduce((a, m) => a + m[k], 0)]));
      const hasta = y === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
      const visibles = Object.keys(filas).filter((k) => k !== 'fondo' || DB.ajustes.fundacion);
      return `
      <div class="barra-sup"><div class="seg">${[...anios].sort().map((a) => `<button type="button" data-accion="anio" data-a="${a}" aria-pressed="${a === y}">${a}</button>`).join('')}</div></div>
      <div class="kpis">${kpi('Ventas netas ' + y, money(tot.neto))}${kpi('Utilidad bruta', money(tot.ub), tot.neto ? Math.round((tot.ub / (tot.neto + tot.envios)) * 100) + ' %' : '')}${kpi('Utilidad neta', money(tot.un), tot.neto ? Math.round((tot.un / (tot.neto + tot.envios)) * 100) + ' % de margen neto' : '', tot.un < 0 ? 'mal' : 'bien')}</div>
      <div class="tabla-scroll"><table class="tabla pyg"><thead><tr><th>Concepto</th>${MESES.slice(0, hasta).map((m) => `<th class="der">${m}</th>`).join('')}<th class="der">Total</th></tr></thead><tbody>
        ${visibles.map((k) => `<tr class="${['neto', 'ub', 'un'].includes(k) ? 'fuerte' : ''}"><td>${filas[k]}</td>${M.slice(0, hasta).map((m) => `<td class="der num ${k === 'un' && m[k] < 0 ? 'neg' : ''}">${m[k] ? money(m[k]) : '—'}</td>`).join('')}<td class="der num"><b>${money(tot[k])}</b></td></tr>`).join('')}
      </tbody></table></div>
      <p class="nota">Las ventas cuentan en la fecha en que se registran, estén pagadas o no (las anuladas no cuentan). Las comisiones y el fondo se calculan con las reglas de Ajustes.</p>`;
    },
  };

  VISTAS.ajustes = {
    titulo: 'Ajustes',
    html() {
      const e = DB.empresa; const t = e.tarifas || {};
      return `
      <div class="rejilla-2">
        <form class="tarjeta" id="form-empresa">
          <header><h2>Empresa</h2></header>
          <div class="campo"><label for="e-nombre">Nombre</label><input id="e-nombre" value="${esc(e.nombre)}" required></div>
          <div class="dos"><div class="campo"><label for="e-nit">NIT o cédula</label><input id="e-nit" value="${esc(e.nit || '')}"></div><div class="campo"><label for="e-tel">Teléfono</label><input id="e-tel" value="${esc(e.telefono || '')}"></div></div>
          <div class="dos"><div class="campo"><label for="e-ciudad">Ciudad</label><input id="e-ciudad" value="${esc(e.ciudad || '')}"></div><div class="campo"><label for="e-correo">Correo</label><input id="e-correo" value="${esc(e.correo || '')}"></div></div>
          <div class="campo"><label for="e-saldo">Saldo inicial en caja</label><input id="e-saldo" inputmode="numeric" value="${int(e.saldo_inicial)}"></div>
          <h3 class="subt">Comisiones</h3>
          <div class="tres">${Object.entries(NIVELES).map(([k, n]) => `<div class="campo"><label for="e-t-${k}">${n} (por unidad)</label><input id="e-t-${k}" inputmode="numeric" value="${int(t[k])}"></div>`).join('')}</div>
          <div class="tres"><div class="campo"><label for="e-pc">Vendedor en calle (% utilidad)</label><input id="e-pc" inputmode="numeric" value="${e.pct_calle}"></div><div class="campo"><label for="e-pf">Fondo social (% utilidad)</label><input id="e-pf" inputmode="numeric" value="${e.pct_fondo}"></div><div class="campo"><label for="e-de">Descuento con código (%)</label><input id="e-de" inputmode="numeric" value="${e.descuento_embajador}"></div></div>
          <button class="btn btn-primary" type="submit">Guardar ajustes</button>
        </form>
        <div style="display:grid;gap:18px;align-content:start">
          <section class="tarjeta"><header><h2>Tienda en línea</h2></header>
            <div class="fila-switch"><div><b>Fundación Gatoarisco</b><p class="nota">Página Impacto, reparto de la venta y fondo social en la tienda. ${ST.modo === 'supabase' ? 'Cambia al instante.' : 'En modo prueba solo cambia aquí.'}</p></div>
              <button type="button" class="switch" role="switch" aria-checked="${!!DB.ajustes.fundacion}" data-accion="switch-fundacion"><span class="switch-pista"><span class="switch-bola"></span></span><span class="switch-texto">${DB.ajustes.fundacion ? 'Visible' : 'Oculta'}</span></button></div>
            <p><a href="index.html" target="_blank" rel="noopener">Ver la tienda →</a></p>
          </section>
          <section class="tarjeta"><header><h2>Datos</h2></header>
            <p class="nota">${ST.modo === 'supabase' ? 'Conectado a Supabase. Los datos se guardan en tu base de datos privada.' : 'Modo prueba: los datos se guardan solo en este navegador.'}</p>
            <div class="botones">
              <button class="btn btn-ghost btn-sm" data-accion="respaldo">Descargar respaldo</button>
              <button class="btn btn-ghost btn-sm" data-accion="csv-ventas">Ventas en CSV (Excel)</button>
              ${ST.modo === 'prueba' ? '<button class="btn btn-ghost btn-sm" data-accion="ejemplo">Cargar datos de ejemplo</button><button class="btn btn-ghost btn-sm" data-accion="reiniciar">Borrar datos de prueba</button>' : ''}
            </div>
          </section>
        </div>
      </div>`;
    },
  };

  /* =================================================================
     Formularios en ventana
     ================================================================= */
  function modal(titulo, cuerpo, alGuardar, opts = {}) {
    const d = $('#modal');
    d.innerHTML = `<form method="dialog" class="modal-caja ${opts.ancho ? 'ancho' : ''}" novalidate>
      <header><h2>${titulo}</h2><button type="button" class="ico-btn" data-cerrar aria-label="Cerrar">✕</button></header>
      <div class="modal-cuerpo">${cuerpo}</div>
      <footer>${opts.borrar ? `<button type="button" class="btn btn-ghost btn-sm peligro" data-borrar>${opts.borrar}</button>` : '<span></span>'}<div class="botones"><button type="button" class="btn btn-ghost" data-cerrar>${alGuardar ? 'Cancelar' : 'Cerrar'}</button>${alGuardar ? `<button type="submit" class="btn btn-primary">${opts.boton || 'Guardar'}</button>` : ''}</div></footer>
    </form>`;
    const f = $('form', d);
    $$('[data-cerrar]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    if (opts.borrar) $('[data-borrar]', d).addEventListener('click', async () => { if (await confirmar(opts.confirmarBorrar || '¿Seguro?')) { await opts.alBorrar(); d.close(); render(); } });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const b = $('button[type=submit]', f); b.disabled = true;
      try { const r = await alGuardar(f); if (r !== false) { d.close(); render(); } } catch (err) { /* el aviso ya se mostró */ } finally { b.disabled = false; }
    });
    if (opts.alAbrir) opts.alAbrir(f);
    d.showModal();
    const primero = $('input:not([type=hidden]),select,textarea', f); if (primero && !opts.sinFoco) primero.focus();
    return f;
  }
  function confirmar(msg) {
    return new Promise((ok) => {
      const d = $('#confirmar'); $('p', d).textContent = msg; d.showModal();
      const fin = (v) => { d.close(); ok(v); };
      $('[data-si]', d).onclick = () => fin(true); $('[data-no]', d).onclick = () => fin(false);
    });
  }
  const val = (f, id) => { const el = $('#' + id, f); return el ? el.value.trim() : ''; };
  const waNum = (t) => { const d = String(t).replace(/\D/g, ''); return d.length === 10 ? '57' + d : d; };

  const opcionesProductos = (sel) => DB.productos.filter((p) => p.activo || p.id === sel).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.nombre)} · ${stockDe(p.id)} disp.</option>`).join('');

  function filaItem(tipo, it) {
    it = it || {};
    const p = prod(it.producto_id) || DB.productos.find((x) => x.activo) || {};
    const precio = tipo === 'venta' ? (it.precio != null ? it.precio : p.precio) : (it.costo != null ? it.costo : p.costo);
    return `<div class="item-fila">
      <div class="campo"><label>Producto</label><select class="it-prod" required><option value="">Elige…</option>${opcionesProductos(it.producto_id || p.id)}</select></div>
      ${tipo === 'venta' ? `<div class="campo"><label>Variante</label><input class="it-var" value="${esc(it.variante || '')}" placeholder="Talla, acabado…" list="variantes-${esc(p.id || '')}"></div>` : ''}
      <div class="campo"><label>Cant.</label><input class="it-cant" type="number" min="1" step="1" required value="${it.cant || 1}"></div>
      <div class="campo"><label>${tipo === 'venta' ? 'Precio unit.' : 'Costo unit.'}</label><input class="it-precio" inputmode="numeric" required value="${int(precio)}"></div>
      <button type="button" class="ico-btn quitar" aria-label="Quitar producto">✕</button>
    </div>`;
  }
  function leerItems(f, tipo) {
    return $$('.item-fila', f).map((r) => {
      const p = prod($('.it-prod', r).value); if (!p) return null;
      const base = { producto_id: p.id, nombre: p.nombre, cant: Math.max(1, int($('.it-cant', r).value)) };
      return tipo === 'venta' ? Object.assign(base, { variante: ($('.it-var', r) || {}).value || '', precio: int($('.it-precio', r).value), costo: int(p.costo) }) : Object.assign(base, { costo: int($('.it-precio', r).value) });
    }).filter(Boolean);
  }
  function enlazarItems(f, tipo, recalc) {
    const cont = $('.items', f);
    $('[data-agregar-item]', f).addEventListener('click', () => { cont.insertAdjacentHTML('beforeend', filaItem(tipo)); recalc(); });
    cont.addEventListener('click', (e) => { if (e.target.closest('.quitar')) { if ($$('.item-fila', cont).length > 1) e.target.closest('.item-fila').remove(); recalc(); } });
    cont.addEventListener('change', (e) => {
      if (e.target.classList.contains('it-prod')) { const p = prod(e.target.value); const r = e.target.closest('.item-fila'); if (p) $('.it-precio', r).value = tipo === 'venta' ? p.precio : int(p.costo); }
      recalc();
    });
    cont.addEventListener('input', recalc);
  }

  async function clienteDesdeForm(f) {
    const nombre = val(f, 'v-cliente'), tel = val(f, 'v-tel');
    if (!nombre && !tel) return null;
    let c = DB.clientes.find((x) => (tel && x.telefono && x.telefono.replace(/\D/g, '') === tel.replace(/\D/g, '')) || (!tel && x.nombre.toLowerCase() === nombre.toLowerCase()));
    const datos = { nombre: nombre || tel, telefono: tel || null, ciudad: val(f, 'v-ciudad') || null, direccion: val(f, 'v-dir') || null };
    if (c) { const cambio = Object.entries(datos).some(([k, v]) => v && v !== c[k]); if (cambio) c = await guardar('clientes', Object.assign({}, c, Object.fromEntries(Object.entries(datos).filter(([, v]) => v)))); }
    else c = await guardar('clientes', Object.assign({ id: nuevoId() }, datos));
    return c.id;
  }

  function formVenta(v) {
    const nueva = !v; v = v || { id: nuevoId(), fecha: hoy(), canal: 'whatsapp', items: [{}], descuento: 0, envio: 0, metodo: 'Nequi', pago: 'pagado', entrega: 'por_despachar' };
    const c = porId('clientes', v.cliente_id) || {};
    const personas = DB.equipo.filter((p) => p.activo || p.id === v.vendedor_id);
    const cuerpo = `
      <div class="tres">
        <div class="campo"><label for="v-fecha">Fecha</label><input id="v-fecha" type="date" required value="${v.fecha}"></div>
        <div class="campo"><label for="v-canal">Canal</label>${selector('v-canal', CANALES, v.canal)}</div>
        <div class="campo"><label for="v-vend">Vendedor o embajador</label><select id="v-vend"><option value="">— Ninguno —</option>${personas.map((p) => `<option value="${p.id}"${p.id === v.vendedor_id ? ' selected' : ''}>${esc(p.nombre)} · ${p.tipo === 'embajador' ? 'embajador' : 'calle'}</option>`).join('')}</select></div>
      </div>
      <div class="dos">
        <div class="campo"><label for="v-cliente">Cliente</label><input id="v-cliente" list="lista-clientes" value="${esc(c.nombre || '')}" placeholder="Nombre (opcional)" autocomplete="off"></div>
        <div class="campo"><label for="v-tel">Celular</label><input id="v-tel" type="tel" value="${esc(c.telefono || '')}" placeholder="300 000 0000"></div>
      </div>
      <div class="dos">
        <div class="campo"><label for="v-ciudad">Ciudad</label><input id="v-ciudad" value="${esc(c.ciudad || '')}"></div>
        <div class="campo"><label for="v-dir">Dirección</label><input id="v-dir" value="${esc(c.direccion || '')}"></div>
      </div>
      <datalist id="lista-clientes">${DB.clientes.map((x) => `<option value="${esc(x.nombre)}">${esc(x.telefono || '')}</option>`).join('')}</datalist>
      <h3 class="subt">Productos</h3>
      <div class="items">${(v.items.length ? v.items : [{}]).map((i) => filaItem('venta', i)).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-agregar-item>+ Agregar producto</button>
      <div class="tres" style="margin-top:14px">
        <div class="campo"><label for="v-desc">Descuento ($)</label><input id="v-desc" inputmode="numeric" value="${int(v.descuento)}"></div>
        <div class="campo"><label for="v-envio">Envío cobrado ($)</label><input id="v-envio" inputmode="numeric" value="${int(v.envio)}"></div>
        <div class="campo"><label for="v-metodo">Método de pago</label>${selector('v-metodo', Object.fromEntries(METODOS.map((m) => [m, m])), v.metodo)}</div>
      </div>
      <div class="dos">
        <div class="campo"><label for="v-pago">Pago</label>${selector('v-pago', { pagado: 'Pagado', pendiente: 'Por cobrar' }, v.pago)}</div>
        <div class="campo"><label for="v-entrega">Entrega</label>${selector('v-entrega', ENTREGAS, v.entrega)}</div>
      </div>
      <div class="campo"><label for="v-nota">Nota</label><input id="v-nota" value="${esc(v.nota || '')}"></div>
      <div class="resumen-venta" id="v-resumen"></div>
      ${!nueva ? `<label class="check"><input type="checkbox" id="v-anulada" ${v.anulada ? 'checked' : ''}> Venta anulada (no cuenta y devuelve las existencias)</label>` : ''}`;
    modal(nueva ? 'Nueva venta' : `Venta #${v.numero}`, cuerpo, async (f) => {
      const items = leerItems(f, 'venta');
      if (!items.length) { aviso('Agrega al menos un producto', 'error'); return false; }
      const faltan = items.filter((i) => { const antes = nueva ? 0 : (v.items || []).filter((x) => x.producto_id === i.producto_id).reduce((a, x) => a + int(x.cant), 0); return int(i.cant) > stockDe(i.producto_id) + antes; });
      if (faltan.length && !(await confirmar(`No hay existencias suficientes de ${faltan.map((i) => i.nombre).join(', ')}. ¿Registrar la venta igual?`))) return false;
      const cliente_id = await clienteDesdeForm(f);
      const r = await guardar('ventas', Object.assign({}, v, {
        fecha: val(f, 'v-fecha'), canal: val(f, 'v-canal'), vendedor_id: val(f, 'v-vend') || null, cliente_id, items,
        descuento: int(val(f, 'v-desc')), envio: int(val(f, 'v-envio')), metodo: val(f, 'v-metodo'), pago: val(f, 'v-pago'), entrega: val(f, 'v-entrega'),
        nota: val(f, 'v-nota') || null, anulada: !!($('#v-anulada', f) || {}).checked,
      }));
      aviso(nueva ? `Venta #${r.numero} registrada. El gato lo aprueba.` : 'Venta actualizada');
      if (nueva) setTimeout(() => recibo(r.id), 150);
    }, {
      ancho: true, boton: nueva ? 'Registrar venta' : 'Guardar cambios',
      alAbrir(f) {
        const recalc = () => {
          const items = leerItems(f, 'venta'); const t = tv({ items, descuento: int(val(f, 'v-desc')), envio: int(val(f, 'v-envio')) });
          const per = porId('equipo', val(f, 'v-vend'));
          const com = per ? comision({ items, descuento: int(val(f, 'v-desc')), vendedor_id: per.id }) : 0;
          $('#v-resumen', f).innerHTML = `<div><small>Subtotal</small><b>${money(t.sub)}</b></div><div><small>Total a cobrar</small><b>${money(t.total)}</b></div><div><small>Utilidad</small><b class="${t.util < 0 ? 'neg' : ''}">${money(t.util)}</b></div>${per ? `<div><small>Comisión ${esc(per.nombre)}</small><b>${money(com)}</b></div>` : ''}`;
        };
        enlazarItems(f, 'venta', recalc);
        $('#v-vend', f).addEventListener('change', () => {
          const p = porId('equipo', val(f, 'v-vend'));
          if (p && p.tipo === 'embajador') { $('#v-canal', f).value = 'embajador'; const t = tv({ items: leerItems(f, 'venta') }); $('#v-desc', f).value = Math.round(t.sub * (Number(DB.empresa.descuento_embajador) || 0) / 100); }
          if (p && p.tipo === 'calle') { $('#v-canal', f).value = 'calle'; $('#v-entrega', f).value = 'en_mano'; $('#v-metodo', f).value = 'Efectivo'; }
          recalc();
        });
        $('#v-cliente', f).addEventListener('change', () => { const c = DB.clientes.find((x) => x.nombre === val(f, 'v-cliente')); if (c) { $('#v-tel', f).value = c.telefono || ''; $('#v-ciudad', f).value = c.ciudad || ''; $('#v-dir', f).value = c.direccion || ''; } });
        ['v-desc', 'v-envio'].forEach((id) => $('#' + id, f).addEventListener('input', recalc));
        recalc();
      },
      sinFoco: true,
    });
  }

  function formCompra(c) {
    const nueva = !c; c = c || { id: nuevoId(), fecha: hoy(), proveedor_id: (DB.proveedores[0] || {}).id || null, items: [{}], flete: 0, pago: 'pagado', metodo: 'Transferencia' };
    modal(nueva ? 'Nueva compra' : `Compra C-${c.numero}`, `
      <div class="tres">
        <div class="campo"><label for="c-fecha">Fecha</label><input id="c-fecha" type="date" required value="${c.fecha}"></div>
        <div class="campo"><label for="c-prov">Proveedor</label><select id="c-prov"><option value="">— Sin proveedor —</option>${DB.proveedores.map((p) => `<option value="${p.id}"${p.id === c.proveedor_id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
        <div class="campo"><label for="c-metodo">Método</label>${selector('c-metodo', Object.fromEntries(METODOS.map((m) => [m, m])), c.metodo)}</div>
      </div>
      <h3 class="subt">Productos que llegaron</h3>
      <div class="items">${(c.items.length ? c.items : [{}]).map((i) => filaItem('compra', i)).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" data-agregar-item>+ Agregar producto</button>
      <div class="tres" style="margin-top:14px">
        <div class="campo"><label for="c-flete">Flete o envío ($)</label><input id="c-flete" inputmode="numeric" value="${int(c.flete)}"></div>
        <div class="campo"><label for="c-pago">Pago</label>${selector('c-pago', { pagado: 'Pagada', pendiente: 'Por pagar' }, c.pago)}</div>
        <div class="campo"><label for="c-nota">Nota</label><input id="c-nota" value="${esc(c.nota || '')}"></div>
      </div>
      <label class="check"><input type="checkbox" id="c-costo" checked> Actualizar el costo de cada producto con esta compra</label>
      <div class="resumen-venta" id="c-resumen"></div>`, async (f) => {
      const items = leerItems(f, 'compra'); if (!items.length) { aviso('Agrega al menos un producto', 'error'); return false; }
      await guardar('compras', Object.assign({}, c, { fecha: val(f, 'c-fecha'), proveedor_id: val(f, 'c-prov') || null, items, flete: int(val(f, 'c-flete')), pago: val(f, 'c-pago'), metodo: val(f, 'c-metodo'), nota: val(f, 'c-nota') || null }));
      if ($('#c-costo', f).checked) {
        for (const i of items) { const p = prod(i.producto_id); if (p && int(p.costo) !== int(i.costo)) await guardar('productos', Object.assign({}, p, { costo: int(i.costo), proveedor_id: val(f, 'c-prov') || p.proveedor_id })); }
      }
      aviso(nueva ? 'Compra registrada. Las existencias subieron.' : 'Compra actualizada');
    }, {
      ancho: true, sinFoco: true,
      alAbrir(f) {
        const recalc = () => { const items = leerItems(f, 'compra'); const t = totCompra({ items, flete: int(val(f, 'c-flete')) }); $('#c-resumen', f).innerHTML = `<div><small>Unidades</small><b>${items.reduce((a, i) => a + i.cant, 0)}</b></div><div><small>Total compra</small><b>${money(t)}</b></div>`; };
        enlazarItems(f, 'compra', recalc); $('#c-flete', f).addEventListener('input', recalc); recalc();
      },
    });
  }

  function formProducto(p) {
    const nuevo = !p; p = p || { id: '', nombre: '', categoria_id: (DB.categorias[0] || {}).id, precio: 10000, costo: 0, stock_inicial: 0, stock_min: 3, atributos: {}, activo: true, arisquez: 3 };
    const atr = Object.entries(p.atributos || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
    let fotoNueva = null;
    modal(nuevo ? 'Nuevo producto' : esc(p.nombre), `
      <div class="foto-campo"><div class="foto-prev" id="p-prev">${p.imagen ? `<img src="${esc(p.imagen)}" alt="">` : '<span>Sin foto</span>'}</div>
        <div><label class="btn btn-ghost btn-sm" for="p-foto">Subir foto</label><input id="p-foto" type="file" accept="image/*" hidden><p class="nota">JPG o PNG. Se ajusta sola de tamaño.</p></div></div>
      <div class="dos"><div class="campo"><label for="p-nombre">Nombre</label><input id="p-nombre" required value="${esc(p.nombre)}"></div>
        <div class="campo"><label for="p-cat">Categoría · <a href="#" data-accion="categorias" onclick="document.getElementById('modal').close()">crear otra</a></label>${selector('p-cat', Object.fromEntries(categoriasOrdenadas().map((c) => [c.id, c.nombre])), p.categoria_id)}</div></div>
      <div class="tres"><div class="campo"><label for="p-precio">Precio de venta</label><input id="p-precio" inputmode="numeric" required value="${int(p.precio)}"></div>
        <div class="campo"><label for="p-antes">Precio antes (opcional)</label><input id="p-antes" inputmode="numeric" value="${p.precio_antes || ''}"></div>
        <div class="campo"><label for="p-costo">Costo</label><input id="p-costo" inputmode="numeric" value="${int(p.costo)}"></div></div>
      <div class="tres">${nuevo ? '<div class="campo"><label for="p-stock">Existencias iniciales</label><input id="p-stock" type="number" min="0" value="0"></div>' : `<div class="campo"><label>Existencias</label><input disabled value="${stockDe(p.id)} (usa Ajustar)"></div>`}
        <div class="campo"><label for="p-min">Avisar cuando queden</label><input id="p-min" type="number" min="0" value="${int(p.stock_min)}"></div>
        <div class="campo"><label for="p-prov">Proveedor</label><select id="p-prov"><option value="">—</option>${DB.proveedores.map((x) => `<option value="${x.id}"${x.id === p.proveedor_id ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></div></div>
      <div class="dos"><div class="campo"><label for="p-linea">Línea (opcional)</label><input id="p-linea" value="${esc(p.linea || '')}" placeholder="Lostpin"></div>
        <div class="campo"><label for="p-ari">Nivel de arisquez</label>${selector('p-ari', { 1: '1 · Casi dócil', 2: '2 · Tímido', 3: '3 · Con carácter', 4: '4 · Muy arisco', 5: '5 · Indomable' }, p.arisquez || 3)}</div></div>
      <div class="campo"><label for="p-desc">Descripción</label><textarea id="p-desc" rows="2">${esc(p.descripcion || '')}</textarea></div>
      <div class="campo"><label for="p-humor">Lo que dice el gato</label><input id="p-humor" value="${esc(p.humor || '')}" placeholder="Se ve suave. No te confíes."></div>
      <div class="dos"><div class="campo"><label for="p-atr">Características (una por línea, "Nombre: valor")</label><textarea id="p-atr" rows="3" placeholder="Tamaño: 30 mm">${esc(atr)}</textarea></div>
        <div><div class="campo"><label for="p-vnom">Variantes: nombre</label><input id="p-vnom" value="${esc((p.variantes || {}).nombre || '')}" placeholder="Talla"></div>
        <div class="campo"><label for="p-vop">Opciones separadas por coma</label><input id="p-vop" value="${esc(((p.variantes || {}).opciones || []).join(', '))}" placeholder="S, M, L, XL"></div></div></div>
      <div class="dos"><div class="campo"><label for="p-lim">Etiqueta edición limitada (opcional)</label><input id="p-lim" value="${esc(p.limitado || '')}"></div>
        <div class="campo"><label for="p-pre">Preventa (opcional)</label><input id="p-pre" value="${esc(p.preventa || '')}" placeholder="Despacho desde el 30 de noviembre"></div></div>
      <div class="checks"><label class="check"><input type="checkbox" id="p-activo" ${p.activo ? 'checked' : ''}> Visible en la tienda</label><label class="check"><input type="checkbox" id="p-dest" ${p.destacado ? 'checked' : ''}> Destacado en el inicio</label><label class="check"><input type="checkbox" id="p-nuevo" ${p.nuevo ? 'checked' : ''}> Marcar como nuevo</label></div>`,
    async (f) => {
      const nombre = val(f, 'p-nombre');
      let id = p.id;
      if (nuevo) { id = slug(nombre); let k = 2; while (prod(id)) id = slug(nombre) + '-' + k++; }
      let imagen = p.imagen || null;
      if (fotoNueva) { estado('Subiendo foto…', 'ocupado'); try { imagen = await ST.subirFoto(fotoNueva, id); } catch (e) { aviso('No se pudo subir la foto: ' + e.message, 'error'); return false; } }
      const atributos = {}; val(f, 'p-atr').split('\n').forEach((l) => { const i = l.indexOf(':'); if (i > 0) atributos[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
      const ops = val(f, 'p-vop').split(',').map((x) => x.trim()).filter(Boolean);
      await guardar('productos', Object.assign({}, p, {
        id, nombre, categoria_id: val(f, 'p-cat'), linea: val(f, 'p-linea') || null, precio: int(val(f, 'p-precio')), precio_antes: int(val(f, 'p-antes')) || null, costo: int(val(f, 'p-costo')),
        stock_inicial: nuevo ? Math.max(0, int(val(f, 'p-stock'))) : p.stock_inicial, stock_min: int(val(f, 'p-min')), proveedor_id: val(f, 'p-prov') || null,
        descripcion: val(f, 'p-desc') || null, humor: val(f, 'p-humor') || null, arisquez: int(val(f, 'p-ari')) || null, atributos,
        variantes: ops.length ? { nombre: val(f, 'p-vnom') || 'Opción', opciones: ops } : null, limitado: val(f, 'p-lim') || null, preventa: val(f, 'p-pre') || null,
        activo: $('#p-activo', f).checked, destacado: $('#p-dest', f).checked, nuevo: $('#p-nuevo', f).checked, imagen,
      }));
      aviso(nuevo ? 'Producto creado' : 'Producto actualizado');
    }, {
      ancho: true, sinFoco: !nuevo,
      borrar: nuevo ? null : 'Ocultar de la tienda', confirmarBorrar: 'El producto se oculta de la tienda pero se conserva su historial de ventas. ¿Continuar?',
      async alBorrar() { await guardar('productos', Object.assign({}, p, { activo: false })); },
      alAbrir(f) { $('#p-foto', f).addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; fotoNueva = file; $('#p-prev', f).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`; }); },
    });
  }

  function formAjuste(pid) {
    modal('Ajustar existencias', `
      <div class="campo"><label for="a-prod">Producto</label><select id="a-prod" required>${opcionesProductos(pid)}</select></div>
      <div class="dos"><div class="campo"><label for="a-cant">Cantidad (+ entra, − sale)</label><input id="a-cant" type="number" required value="-1"></div>
        <div class="campo"><label for="a-mot">Motivo</label>${selector('a-mot', { Conteo: 'Conteo físico', Daño: 'Producto dañado', Muestra: 'Regalo o muestra', Pérdida: 'Pérdida o robo', Devolución: 'Devolución', Otro: 'Otro' }, 'Conteo')}</div></div>
      <div class="campo"><label for="a-fecha">Fecha</label><input id="a-fecha" type="date" value="${hoy()}"></div>`, async (f) => {
      const cant = int(val(f, 'a-cant')); if (!cant) { aviso('La cantidad no puede ser 0', 'error'); return false; }
      await guardar('ajustes_inventario', { id: nuevoId(), fecha: val(f, 'a-fecha'), producto_id: val(f, 'a-prod'), cantidad: cant, motivo: val(f, 'a-mot') });
      aviso('Existencias ajustadas');
    });
  }

  function formSimple(t, titulo, campos, obj, opts = {}) {
    const nuevo = !obj; obj = obj || Object.assign({ id: nuevoId() }, opts.base || {});
    modal(titulo, campos.map((c) => {
      if (c.tipo === 'select') return `<div class="campo"><label for="s-${c.k}">${c.l}</label>${selector('s-' + c.k, c.ops, obj[c.k] != null ? obj[c.k] : c.def)}</div>`;
      if (c.tipo === 'check') return `<label class="check"><input type="checkbox" id="s-${c.k}" ${obj[c.k] !== false ? 'checked' : ''}> ${c.l}</label>`;
      return `<div class="campo"><label for="s-${c.k}">${c.l}</label><input id="s-${c.k}" ${c.tipo === 'date' ? 'type="date"' : c.num ? 'inputmode="numeric"' : ''} ${c.req ? 'required' : ''} value="${esc(obj[c.k] != null ? obj[c.k] : (c.def || ''))}" placeholder="${esc(c.ph || '')}"></div>`;
    }).join(''), async (f) => {
      const r = Object.assign({}, obj);
      campos.forEach((c) => { const el = $('#s-' + c.k, f); r[c.k] = c.tipo === 'check' ? el.checked : c.num ? int(el.value) : (el.value.trim() || null); });
      if (opts.antes) opts.antes(r);
      await guardar(t, r); aviso('Guardado');
    }, opts.borrar && !nuevo ? { borrar: 'Borrar', confirmarBorrar: opts.borrar, async alBorrar() { await borrar(t, obj.id); } } : {});
  }

  const formCliente = (c) => formSimple('clientes', c ? 'Cliente' : 'Nuevo cliente', [{ k: 'nombre', l: 'Nombre', req: true }, { k: 'telefono', l: 'Celular' }, { k: 'ciudad', l: 'Ciudad' }, { k: 'direccion', l: 'Dirección' }, { k: 'correo', l: 'Correo' }, { k: 'nota', l: 'Nota' }], c, { borrar: 'Se borra el cliente. Sus ventas se conservan sin cliente. ¿Continuar?' });
  const formProveedor = (p) => formSimple('proveedores', p ? 'Proveedor' : 'Nuevo proveedor', [{ k: 'nombre', l: 'Nombre', req: true }, { k: 'tipo', l: 'Tipo', tipo: 'select', ops: { fabricante: 'Fabricante', taller: 'Taller (bordado, estampado)', importacion: 'Importación (AliExpress u otro)', otro: 'Otro' }, def: 'fabricante' }, { k: 'contacto', l: 'Persona de contacto' }, { k: 'telefono', l: 'Celular' }, { k: 'ciudad', l: 'Ciudad' }, { k: 'nota', l: 'Nota', ph: 'Tiempos de entrega, mínimos, etc.' }], p, { borrar: '¿Borrar este proveedor? Sus compras se conservan.' });
  const formGasto = (g) => formSimple('gastos', g ? 'Gasto' : 'Nuevo gasto', [{ k: 'fecha', l: 'Fecha', tipo: 'date', def: hoy(), req: true }, { k: 'categoria', l: 'Categoría', tipo: 'select', ops: Object.fromEntries(GASTOS.map((x) => [x, x])), def: 'Publicidad' }, { k: 'descripcion', l: 'Descripción' }, { k: 'valor', l: 'Valor ($)', num: true, req: true }, { k: 'metodo', l: 'Método', tipo: 'select', ops: Object.fromEntries(METODOS.map((m) => [m, m])), def: 'Nequi' }], g, { borrar: '¿Borrar este gasto?' });
  const formPersona = (p) => formSimple('equipo', p ? 'Persona del equipo' : 'Nueva persona', [{ k: 'nombre', l: 'Nombre', req: true }, { k: 'tipo', l: 'Tipo', tipo: 'select', ops: { embajador: 'Embajador (vende con código)', calle: 'Vendedor en calle' }, def: 'embajador' }, { k: 'nivel', l: 'Nivel (embajadores)', tipo: 'select', ops: NIVELES, def: 'explorador' }, { k: 'codigo', l: 'Código de descuento', ph: 'LAURA25' }, { k: 'telefono', l: 'Celular' }, { k: 'activo', l: 'Activo', tipo: 'check' }], p, {
    borrar: '¿Borrar a esta persona? Se borran también sus pagos registrados.',
    antes(r) { if (r.codigo) r.codigo = r.codigo.toUpperCase().replace(/\s+/g, ''); if (r.tipo === 'calle') r.nivel = null; },
  });
  function formPago(personaId) {
    const p = porId('equipo', personaId); const s = saldosEquipo()[personaId];
    modal('Pagar a ' + esc(p.nombre), `<p class="nota">Saldo por pagar: <b>${money(s.saldo)}</b></p>
      <div class="dos"><div class="campo"><label for="g-valor">Valor</label><input id="g-valor" inputmode="numeric" required value="${Math.max(0, s.saldo)}"></div><div class="campo"><label for="g-fecha">Fecha</label><input id="g-fecha" type="date" value="${hoy()}"></div></div>
      <div class="campo"><label for="g-metodo">Método</label>${selector('g-metodo', Object.fromEntries(METODOS.map((m) => [m, m])), 'Nequi')}</div>`, async (f) => {
      await guardar('pagos_equipo', { id: nuevoId(), persona_id: personaId, valor: int(val(f, 'g-valor')), fecha: val(f, 'g-fecha'), metodo: val(f, 'g-metodo') });
      aviso('Pago registrado');
    }, { boton: 'Registrar pago' });
  }
  function formCategoria(c) {
    const nueva = !c; c = c || { id: '', nombre: '', detalle: '', imagen: null, orden: DB.categorias.reduce((m, x) => Math.max(m, x.orden || 0), -1) + 1 };
    const enCat = DB.productos.filter((p) => p.categoria_id === c.id);
    const usaProducto = c.imagen && !c.imagen.includes('/');
    let fotoNueva = null;
    modal(nueva ? 'Nueva categoría' : esc(c.nombre), `
      <div class="foto-campo"><div class="foto-prev" id="k-prev"><img src="${esc(fotoCategoria(c))}" alt=""></div>
        <div><label class="btn btn-ghost btn-sm" for="k-foto">Subir foto</label><input id="k-foto" type="file" accept="image/*" hidden>
        <p class="nota">O usa la foto de uno de sus productos.</p></div></div>
      <div class="campo"><label for="k-nombre">Nombre</label><input id="k-nombre" required value="${esc(c.nombre)}" placeholder="Bolsos, Gorras, Tazas…"></div>
      <div class="campo"><label for="k-detalle">Descripción corta</label><input id="k-detalle" value="${esc(c.detalle || '')}" placeholder="Bordados para coser o planchar"></div>
      ${enCat.length ? `<div class="campo"><label for="k-prod">Foto de la tarjeta</label><select id="k-prod"><option value="">Primer producto de la categoría</option>${enCat.map((p) => `<option value="${esc(p.id)}"${usaProducto && c.imagen === p.id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>` : '<p class="nota">Cuando la categoría tenga productos, podrás usar la foto de uno de ellos.</p>'}`,
    async (f) => {
      const nombre = val(f, 'k-nombre');
      let id = c.id;
      if (nueva) { id = slug(nombre); let k = 2; while (porId('categorias', id)) id = slug(nombre) + '-' + k++; }
      let imagen = c.imagen && c.imagen.includes('/') ? c.imagen : null;
      const elegido = $('#k-prod', f) ? $('#k-prod', f).value : '';
      if (elegido) imagen = elegido;
      if (fotoNueva) { estado('Subiendo foto…', 'ocupado'); try { imagen = await ST.subirFoto(fotoNueva, 'categoria-' + id); } catch (e) { aviso('No se pudo subir la foto: ' + e.message, 'error'); return false; } }
      await guardar('categorias', Object.assign({}, c, { id, nombre, detalle: val(f, 'k-detalle') || null, imagen }));
      aviso(nueva ? `Categoría "${nombre}" creada` : 'Categoría actualizada');
    }, {
      borrar: nueva ? null : 'Borrar categoría',
      confirmarBorrar: '¿Borrar esta categoría?',
      async alBorrar() {
        if (DB.productos.some((p) => p.categoria_id === c.id)) { aviso('Primero pasa sus productos a otra categoría (o bórralos). Tiene ' + DB.productos.filter((p) => p.categoria_id === c.id).length + ' productos.', 'error'); return; }
        await borrar('categorias', c.id); aviso('Categoría borrada');
      },
      alAbrir(f) {
        $('#k-foto', f).addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; fotoNueva = file; $('#k-prev', f).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`; });
        const sel = $('#k-prod', f); if (sel) sel.addEventListener('change', () => { if (fotoNueva) return; const p = prod(sel.value) || enCat[0]; if (p) $('#k-prev img', f).src = p.imagen || `assets/img/productos/${p.id}.svg`; });
      },
    });
  }
  async function moverCategoria(id, paso) {
    const lista = categoriasOrdenadas(); const i = lista.findIndex((c) => c.id === id); const j = i + paso;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    for (const [k, c] of lista.entries()) if ((c.orden || 0) !== k) await guardar('categorias', Object.assign({}, c, { orden: k }));
    render();
  }

  /* =================================================================
     Recibo
     ================================================================= */
  function recibo(id) {
    const v = porId('ventas', id); if (!v) return; const t = tv(v); const c = porId('clientes', v.cliente_id) || {}; const e = DB.empresa;
    const texto = [`*${e.nombre}* · Recibo #${v.numero}`, `Fecha: ${fechaCorta(v.fecha)}`, '', ...(v.items || []).map((i) => `${i.cant} × ${i.nombre}${i.variante ? ' (' + i.variante + ')' : ''} — ${money(i.cant * i.precio)}`), '', `Subtotal: ${money(t.sub)}`, int(v.descuento) ? `Descuento: −${money(v.descuento)}` : '', int(v.envio) ? `Envío: ${money(v.envio)}` : '', `*Total: ${money(t.total)}*`, `Pago: ${v.metodo || ''} · ${v.pago === 'pagado' ? 'pagado' : 'pendiente'}`, '', '¡Gracias por comprar con garra! 🐾'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    modal(`Recibo #${v.numero}`, `
      <div class="recibo" id="recibo-print">
        <div class="recibo-cab"><img src="assets/img/marca/gatoarisco-logo-menta.png" alt="" onerror="this.style.display='none'"><div><b>${esc(e.nombre)}</b>${e.nit ? `<br>NIT/C.C. ${esc(e.nit)}` : ''}${e.telefono ? `<br>${esc(e.telefono)}` : ''}${e.ciudad ? ` · ${esc(e.ciudad)}` : ''}</div><div class="der"><b>Recibo #${v.numero}</b><br>${fechaCorta(v.fecha)}</div></div>
        ${c.nombre ? `<p><b>Cliente:</b> ${esc(c.nombre)}${c.telefono ? ' · ' + esc(c.telefono) : ''}${c.ciudad ? '<br>' + esc(c.ciudad) : ''}${c.direccion ? ' · ' + esc(c.direccion) : ''}</p>` : ''}
        <table><thead><tr><th>Producto</th><th class="der">Cant.</th><th class="der">Precio</th><th class="der">Total</th></tr></thead><tbody>
        ${(v.items || []).map((i) => `<tr><td>${esc(i.nombre)}${i.variante ? ' · ' + esc(i.variante) : ''}</td><td class="der">${i.cant}</td><td class="der">${money(i.precio)}</td><td class="der">${money(i.cant * i.precio)}</td></tr>`).join('')}
        </tbody></table>
        <div class="recibo-tot"><span>Subtotal</span><b>${money(t.sub)}</b>${int(v.descuento) ? `<span>Descuento</span><b>− ${money(v.descuento)}</b>` : ''}${int(v.envio) ? `<span>Envío</span><b>${money(v.envio)}</b>` : ''}<span class="g">Total</span><b class="g">${money(t.total)}</b></div>
        <p class="nota">Pago: ${esc(v.metodo || '—')} · ${v.pago === 'pagado' ? 'Pagado' : 'Pendiente de pago'} · ${esc(ENTREGAS[v.entrega] || '')}</p>
        <p class="recibo-pie">¡Gracias por comprar con garra! Cambios dentro de los 5 días hábiles con este recibo.</p>
      </div>
      <div class="botones" style="margin-top:14px">
        <button type="button" class="btn btn-dark btn-sm" data-imprimir>Imprimir o guardar PDF</button>
        ${c.telefono ? `<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(waNum(c.telefono))}?text=${encodeURIComponent(texto)}">Enviar por WhatsApp</a>` : `<button type="button" class="btn btn-ghost btn-sm" data-copiar>Copiar texto</button>`}
      </div>`, null, {
      sinFoco: true,
      alAbrir(f) {
        $('[data-imprimir]', f).addEventListener('click', () => { document.body.classList.add('imprimiendo'); window.print(); setTimeout(() => document.body.classList.remove('imprimiendo'), 500); });
        const cp = $('[data-copiar]', f); if (cp) cp.addEventListener('click', () => { navigator.clipboard.writeText(texto).then(() => aviso('Recibo copiado')); });
      },
    });
  }

  /* =================================================================
     Exportar, respaldo y ejemplo
     ================================================================= */
  function descargar(nombre, contenido, tipo) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenido], { type: tipo })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  }
  function csvVentas() {
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const filas = [['Numero', 'Fecha', 'Cliente', 'Celular', 'Canal', 'Vendedor', 'Productos', 'Unidades', 'Subtotal', 'Descuento', 'Envio', 'Total', 'Costo', 'Utilidad', 'Comision', 'Metodo', 'Pago', 'Entrega', 'Anulada']];
    DB.ventas.slice().sort((a, b) => a.numero - b.numero).forEach((v) => { const t = tv(v); const c = porId('clientes', v.cliente_id) || {}; filas.push([v.numero, v.fecha, c.nombre, c.telefono, CANALES[v.canal], (porId('equipo', v.vendedor_id) || {}).nombre, (v.items || []).map((i) => `${i.cant} x ${i.nombre}`).join('; '), t.unidades, t.sub, v.descuento, v.envio, t.total, t.costo, t.util, comision(v), v.metodo, v.pago, ENTREGAS[v.entrega], v.anulada ? 'si' : 'no']); });
    descargar(`ventas-gatoarisco-${hoy()}.csv`, '﻿' + filas.map((f) => f.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  async function datosEjemplo() {
    const nombres = ['Laura Gómez', 'Andrés Pérez', 'Valentina Ruiz', 'Camilo Rojas', 'Sara Mejía', 'Juan Esteban Díaz', 'Mariana Ortiz', 'Daniel Castro'];
    const ciudades = ['Bucaramanga', 'Floridablanca', 'Bogotá', 'Medellín', 'Cali', 'Girón'];
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const prov = await guardar('proveedores', { id: nuevoId(), nombre: 'Pines del Valle (ejemplo)', tipo: 'fabricante', contacto: 'Diana', telefono: '3001234567', ciudad: 'Cali', nota: 'Mínimo 50 unidades por diseño' });
    const emb = await guardar('equipo', { id: nuevoId(), nombre: 'Laura (embajadora de ejemplo)', tipo: 'embajador', nivel: 'navegante', codigo: 'LAURA25', telefono: '3015550000', activo: true });
    const calle = await guardar('equipo', { id: nuevoId(), nombre: 'Don Jorge (vendedor de ejemplo)', tipo: 'calle', telefono: '3105550000', activo: true });
    await guardar('compras', { id: nuevoId(), fecha: diasAtras(25), proveedor_id: prov.id, items: [{ producto_id: 'pin-cactus', nombre: 'Cactus en flor', cant: 50, costo: 2500 }, { producto_id: 'pin-calavera', nombre: 'Calavera arisca', cant: 40, costo: 2500 }], flete: 18000, pago: 'pagado', metodo: 'Transferencia' });
    const clientes = []; for (const n of nombres) clientes.push(await guardar('clientes', { id: nuevoId(), nombre: n, telefono: '3' + Math.floor(100000000 + Math.random() * 899999999), ciudad: rnd(ciudades) }));
    const vendibles = DB.productos.filter((p) => p.activo);
    for (let i = 0; i < 38; i++) {
      const canal = rnd(['whatsapp', 'whatsapp', 'web', 'calle', 'embajador', 'feria']);
      const items = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => { const p = rnd(vendibles); return { producto_id: p.id, nombre: p.nombre, variante: '', cant: 1 + Math.floor(Math.random() * 2), precio: p.precio, costo: int(p.costo) }; });
      const vend = canal === 'calle' ? calle.id : canal === 'embajador' ? emb.id : null;
      const sub = items.reduce((a, x) => a + x.cant * x.precio, 0);
      await guardar('ventas', { id: nuevoId(), fecha: diasAtras(Math.floor(Math.random() * 30)), canal, cliente_id: canal === 'calle' ? null : rnd(clientes).id, vendedor_id: vend, items, descuento: canal === 'embajador' ? Math.round(sub * 0.1) : 0, envio: canal === 'whatsapp' || canal === 'web' ? (sub >= 60000 ? 0 : 8000) : 0, metodo: canal === 'calle' ? 'Efectivo' : rnd(['Nequi', 'Daviplata', 'Transferencia']), pago: Math.random() < 0.85 ? 'pagado' : 'pendiente', entrega: canal === 'calle' || canal === 'feria' ? 'en_mano' : rnd(['entregado', 'entregado', 'enviado', 'por_despachar']), anulada: false });
    }
    for (const [cat, d, v] of [['Publicidad', 'Anuncios en Instagram', 50000], ['Empaques', 'Bolsas y tarjetas', 35000], ['Envíos', 'Guías de envío', 42000]]) await guardar('gastos', { id: nuevoId(), fecha: diasAtras(Math.floor(Math.random() * 28)), categoria: cat, descripcion: d, valor: v, metodo: 'Nequi' });
    await guardar('pagos_equipo', { id: nuevoId(), fecha: diasAtras(3), persona_id: calle.id, valor: 15000, metodo: 'Efectivo' });
  }
  const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };

  /* =================================================================
     Acciones
     ================================================================= */
  const ACCIONES = {
    ir: (b) => irA(b.dataset.vista),
    periodo: (b) => { UI.periodo = b.dataset.p; render(); },
    anio: (b) => { UI.anio = +b.dataset.a; render(); },
    'nueva-venta': () => formVenta(), 'editar-venta': (b) => formVenta(porId('ventas', b.dataset.id)),
    'nueva-compra': () => formCompra(), 'editar-compra': (b) => formCompra(porId('compras', b.dataset.id)),
    'nuevo-producto': () => formProducto(), 'editar-producto': (b) => formProducto(prod(b.dataset.id)),
    'nuevo-ajuste': () => formAjuste(), ajustar: (b) => formAjuste(b.dataset.id), categorias: () => irA('categorias'), 'nueva-categoria': () => formCategoria(), 'editar-categoria': (b) => formCategoria(porId('categorias', b.dataset.id)), 'cat-subir': (b) => moverCategoria(b.dataset.id, -1), 'cat-bajar': (b) => moverCategoria(b.dataset.id, 1),
    'nuevo-cliente': () => formCliente(), 'editar-cliente': (b) => formCliente(porId('clientes', b.dataset.id)),
    'nuevo-proveedor': () => formProveedor(), 'editar-proveedor': (b) => formProveedor(porId('proveedores', b.dataset.id)),
    'nuevo-gasto': () => formGasto(), 'editar-gasto': (b) => formGasto(porId('gastos', b.dataset.id)),
    'nueva-persona': () => formPersona(), 'editar-persona': (b) => formPersona(porId('equipo', b.dataset.id)), 'pagar-persona': (b) => formPago(b.dataset.id),
    recibo: (b) => recibo(b.dataset.id),
    async 'toggle-pago'(b) { const v = porId('ventas', b.dataset.id); await guardar('ventas', Object.assign({}, v, { pago: v.pago === 'pagado' ? 'pendiente' : 'pagado' })); render(); },
    async 'toggle-pago-compra'(b) { const c = porId('compras', b.dataset.id); await guardar('compras', Object.assign({}, c, { pago: c.pago === 'pagado' ? 'pendiente' : 'pagado' })); render(); },
    async borrar(b) { if (await confirmar('¿Borrar este registro? No se puede deshacer.')) { await borrar(b.dataset.t, b.dataset.id); render(); } },
    'copiar-enlace': (b) => { const url = `${location.origin}${location.pathname.replace(/panel\.html$/, '')}?ref=${b.dataset.codigo}`; navigator.clipboard.writeText(url).then(() => aviso('Enlace copiado: ' + url), () => aviso(url)); },
    async 'switch-fundacion'(b) {
      const nuevo = !DB.ajustes.fundacion; b.disabled = true;
      try { await ST.setAjuste('fundacion', nuevo); DB.ajustes.fundacion = nuevo; aviso(nuevo ? 'Fundación visible en la tienda' : 'Fundación oculta en la tienda'); render(); }
      catch (e) { aviso('No se pudo cambiar: ' + e.message, 'error'); b.disabled = false; }
    },
    respaldo: () => descargar(`respaldo-gatoarisco-${hoy()}.json`, JSON.stringify(DB, null, 2), 'application/json'),
    'csv-ventas': csvVentas,
    async ejemplo(b) { b.disabled = true; estado('Cargando ejemplo…', 'ocupado'); try { await datosEjemplo(); aviso('Datos de ejemplo cargados'); irA('resumen'); } catch (e) { b.disabled = false; } },
    async reiniciar() { if (await confirmar('Se borran todos los datos de prueba de este navegador. ¿Continuar?')) { await ST.reiniciar(); location.reload(); } },
    menu: () => document.body.classList.toggle('menu-abierto'),
    async salir() { if (sb) await sb.auth.signOut(); ls.del('ga_panel_modo'); location.reload(); },
  };

  function irA(v) { if (!VISTAS[v]) v = 'resumen'; UI.vista = v; ls.set('ga_panel_vista', v); document.body.classList.remove('menu-abierto'); render(); window.scrollTo(0, 0); }

  function render() {
    const V = VISTAS[UI.vista];
    $('#titulo').textContent = V.titulo; document.title = V.titulo + ' · Panel Gatoarisco';
    $$('.nav-panel [data-vista]').forEach((a) => a.setAttribute('aria-current', a.dataset.vista === UI.vista ? 'page' : 'false'));
    const btn = $('#accion-principal');
    if (V.boton) { btn.hidden = false; btn.dataset.accion = V.boton[0]; $('span', btn).textContent = V.boton[1]; } else btn.hidden = true;
    $('#vista').innerHTML = V.html();
    // filtros que se escriben
    const enl = (id, grupo, k) => { const el = $('#' + id); if (!el) return; el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { UI.filtros[grupo][k] = el.value; const pos = el.selectionStart; render(); const n = $('#' + id); if (n && n.tagName === 'INPUT') { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }); };
    enl('f-q', 'ventas', 'q'); enl('f-estado', 'ventas', 'estado'); enl('f-canal', 'ventas', 'canal'); enl('f-inv', 'inv', 'q'); enl('f-cat', 'inv', 'cat'); enl('f-cli', 'cli', 'q');
    const fe = $('#form-empresa');
    if (fe) fe.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = fe;
      const emp = Object.assign({}, DB.empresa, { nombre: val(f, 'e-nombre'), nit: val(f, 'e-nit') || null, telefono: val(f, 'e-tel') || null, ciudad: val(f, 'e-ciudad') || null, correo: val(f, 'e-correo') || null, saldo_inicial: int(val(f, 'e-saldo')), tarifas: Object.fromEntries(Object.keys(NIVELES).map((k) => [k, int(val(f, 'e-t-' + k))])), pct_calle: Number(val(f, 'e-pc')) || 0, pct_fondo: Number(val(f, 'e-pf')) || 0, descuento_embajador: Number(val(f, 'e-de')) || 0 });
      try { estado('Guardando…', 'ocupado'); DB.empresa = await ST.guardarEmpresa(emp); estado('Guardado', 'ok'); aviso('Ajustes guardados'); render(); } catch (err) { estado('No se guardó', 'error'); aviso('No se pudo guardar: ' + err.message, 'error'); }
    });
    if (window.gatoMirar) gatoMirar();
  }

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-accion]'); if (!b || b.tagName === 'SELECT') return;
    const fn = ACCIONES[b.dataset.accion]; if (!fn) return;
    e.preventDefault();
    try { await fn(b); } catch (err) { console.error(err); }
  });
  document.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-accion-cambio="entrega"]'); if (!s) return;
    const v = porId('ventas', s.dataset.id); try { await guardar('ventas', Object.assign({}, v, { entrega: s.value })); render(); } catch (err) { render(); }
  });

  /* =================================================================
     Entrada: Supabase o modo prueba
     ================================================================= */
  async function entrar(store) {
    ST = store;
    $('#entrada').hidden = true; $('#app').hidden = false;
    estado('Cargando…', 'ocupado');
    try { DB = await ST.cargar(); } catch (e) { $('#app').hidden = true; mostrarEntrada('No pude cargar los datos: ' + e.message); return; }
    if (!DB.empresa) DB.empresa = { ...EMPRESA_BASE };
    indexar();
    $('#modo').textContent = ST.modo === 'prueba' ? 'Modo prueba' : 'Supabase';
    $('#modo').className = 'pchip ' + (ST.modo === 'prueba' ? 'ambar' : 'menta');
    estado(ST.modo === 'prueba' ? 'Datos solo en este navegador' : 'Conectado a Supabase', ST.modo === 'prueba' ? '' : 'ok');
    irA(UI.vista);
  }

  function mostrarEntrada(msg) {
    $('#app').hidden = true; $('#entrada').hidden = false;
    const ok = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
    $('#login').hidden = !ok; $('#sin-supabase').hidden = ok;
    const m = $('#entrada-msg'); m.hidden = !msg; m.textContent = msg || '';
  }

  async function iniciar() {
    if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
      const { data } = await sb.auth.getSession();
      if (data.session) return entrarSupabase();
    }
    if (ls.get('ga_panel_modo', '') === 'prueba') return entrar(LocalStore());
    mostrarEntrada();
  }
  async function entrarSupabase() {
    const { data, error } = await sb.rpc('es_admin');
    if (error || !data) { await sb.auth.signOut(); mostrarEntrada(error ? 'No pude verificar tu usuario: ' + error.message : 'Tu usuario existe pero todavía no es administrador. Ejecuta el paso 4 de la guía en Supabase.'); return; }
    ls.del('ga_panel_modo');
    return entrar(SupaStore(sb));
  }

  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault(); const b = $('button[type=submit]', e.target); b.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: $('#l-correo').value.trim(), password: $('#l-clave').value });
    b.disabled = false;
    if (error) { mostrarEntrada(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message); return; }
    entrarSupabase();
  });
  $('#modo-prueba').addEventListener('click', () => { ls.set('ga_panel_modo', 'prueba'); entrar(LocalStore()); });

  iniciar();
})();
