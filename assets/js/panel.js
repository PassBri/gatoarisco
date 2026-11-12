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
  const OPCIONALES = ['mensajes', 'pedidos'];   // tablas que pueden no existir todavía en Supabase
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
        OPCIONALES.forEach((t) => { if (!db[t]) db[t] = []; });
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
        for (const t of OPCIONALES) { try { db[t] = await todo(t); } catch (e) { db[t] = []; db.falta = (db.falta || []).concat(t); } }
        return db;
      },
      async guardar(t, row) { const { data, error } = await sb.from(t).upsert(limpiar(row)).select().single(); err(error); return data; },
      async borrar(t, id) { const { error } = await sb.from(t).delete().eq('id', id); err(error); },
      async guardarEmpresa(e) { const { data, error } = await sb.from('empresa').upsert({ ...e, id: 1 }).select().single(); err(error); return data; },
      async setAjuste(k, v) { const { error } = await sb.from('ajustes_publicos').upsert({ clave: k, valor: v }); err(error); },
      async subirFoto(file, id) {
        const blob = await reducirImagen(file, 1000, 0.85);
        const ruta = `${id}-${Date.now()}.jpg`;
        const { error } = await sb.storage.from('productos').upload(ruta, blob, { contentType: 'image/jpeg', upsert: false });
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
  let avisoT, avisoEl;
  function aviso(msg, tipo) {
    const t = avisoEl || (avisoEl = document.getElementById('aviso')); t.textContent = msg; t.className = 'aviso show ' + (tipo || '');
    const abierto = document.querySelector('dialog[open]');
    (abierto || document.body).appendChild(t);                 // por encima de la ventana abierta
    if (abierto && tipo === 'error') { const e = abierto.querySelector('.modal-error'); if (e) { e.textContent = msg; e.hidden = false; } }
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
            ${alerta(DB.pedidos.filter((p) => p.estado === 'pendiente').length, 'pedidos web esperando pago · ' + money(DB.pedidos.filter((p) => p.estado === 'pendiente').reduce((a, p) => a + int(p.total), 0)), 'pedidos', 'ambar')}
            ${alerta(DB.mensajes.filter((m) => !m.leido).length, 'mensajes sin leer', 'mensajes')}
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

  /* =================================================================
     Hojas editables: agregar en fila, editar en la celda, duplicar y eliminar
     ================================================================= */
  UI.borr = {};
  let CTX = {};
  const HOJAS = {};
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  const valorDe = (col, r) => (col.get ? col.get(r) : r[col.k]);
  function celdaHoja(col, r, borr) {
    const fija = col.fija ? ' g-fija g-c-1' : '';
    if (col.calc || (col.editable && !col.editable(r, borr))) return `<td class="${col.der ? 'der num' : ''}${fija}">${col.calc ? col.calc(r, borr) : col.solo(r)}</td>`;
    const v = valorDe(col, r); const ph = col.ph ? ` placeholder="${esc(col.ph)}"` : '';
    const anc = col.ancho ? ` style="min-width:${col.ancho}px"` : '';
    let h;
    if (col.tipo === 'select') { const ops = typeof col.ops === 'function' ? col.ops(r) : col.ops; h = `<select data-c="${col.k}"${anc}>${col.vacio != null ? `<option value="">${esc(col.vacio)}</option>` : ''}${opciones(ops, v == null ? '' : v)}</select>`; }
    else if (col.tipo === 'check') h = `<input type="checkbox" data-c="${col.k}" ${v ? 'checked' : ''} aria-label="${esc(col.l)}">`;
    else if (col.tipo === 'date') h = `<input type="date" data-c="${col.k}" value="${esc(v || '')}">`;
    else if (col.tipo === 'num') h = `<input data-c="${col.k}" inputmode="numeric" class="der" value="${v == null || v === '' ? '' : int(v)}"${ph}${anc}>`;
    else h = `<input data-c="${col.k}" value="${esc(v == null ? '' : v)}"${ph}${anc}${col.lista ? ` list="${col.lista}" autocomplete="off"` : ''}${col.fija ? ' class="g-nombre"' : ''}>`;
    return `<td class="${col.tipo === 'check' ? 'g-chk' : ''}${fija}">${h}</td>`;
  }
  function filaHoja(key, r, borr) {
    const H = HOJAS[key];
    const acc = borr
      ? `<button class="btn btn-primary btn-sm" data-accion="h-crear" data-hoja="${key}">Guardar</button><button class="ico-btn" data-accion="h-cancelar" data-hoja="${key}" title="Cancelar" aria-label="Cancelar">✕</button>`
      : `${H.extra ? H.extra(r) : ''}<button class="ico-btn" data-accion="h-duplicar" data-hoja="${key}" data-id="${esc(r.id)}" title="Duplicar" aria-label="Duplicar">⧉</button><button class="ico-btn peligro" data-accion="h-eliminar" data-hoja="${key}" data-id="${esc(r.id)}" title="Eliminar" aria-label="Eliminar">🗑</button>`;
    return `<tr ${borr ? 'data-borrador class="g-borrador"' : `data-hid="${esc(r.id)}"${H.apagada && H.apagada(r) ? ' class="anulada"' : ''}`}>${H.cols.map((c) => celdaHoja(c, r, borr)).join('')}<td class="acciones"><div class="g-acc">${acc}</div></td></tr>`;
  }
  function hoja(key, filas) {
    const H = HOJAS[key]; const b = UI.borr[key];
    if (!filas.length && !b) return vacio(H.vacio, H.nuevo, H.etiqueta);
    return `<div class="tabla-scroll grilla-caja"><table class="tabla grilla hoja" data-hoja="${key}"><thead><tr>${H.cols.map((c) => `<th class="${c.der || c.tipo === 'num' ? 'der' : ''}${c.fija ? ' g-fija g-c-1' : ''}">${c.l || ''}</th>`).join('')}<th></th></tr></thead><tbody>
      ${b ? filaHoja(key, b, true) : ''}${filas.map((r) => filaHoja(key, r, false)).join('')}</tbody></table></div>`;
  }
  const ayudaHoja = '<p class="nota g-ayuda">Escribe directo en la tabla: cada celda se guarda sola al salir de ella. <b>Enter</b> baja a la fila siguiente. Para ver más columnas, <b>arrastra la tabla</b> hacia los lados, usa <b>Shift + rueda</b> o la barra de arriba.</p>';
  function leerCelda(el, col) {
    if (el.type === 'checkbox') return el.checked;
    const v = el.value.trim();
    if (col.tipo === 'num') return v === '' ? null : Math.max(0, int(v));
    return v === '' ? null : v;
  }
  function ponerValor(col, r, v) { if (col.set) col.set(r, v); else r[col.k] = v; }
  const colDe = (key, k) => HOJAS[key].cols.find((c) => c.k === k);
  function hNuevo(key, extra) {
    const H = HOJAS[key];
    UI.borr[key] = Object.assign(H.base(), extra || {});
    if (UI.vista !== H.vista) irA(H.vista); else render();
    const el = $(`[data-hoja="${key}"] tr[data-borrador] [data-c]`); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
  }
  async function hCrear(key) {
    const H = HOJAS[key]; const r = clonar(UI.borr[key]);
    const tr = $(`[data-hoja="${key}"] tr[data-borrador]`);
    if (tr) $$('[data-c]', tr).forEach((el) => { const col = colDe(key, el.dataset.c); ponerValor(col, r, leerCelda(el, col)); });
    for (const c of H.cols) if (c.req && !valorDe(c, r)) { aviso(`Falta: ${c.l}`, 'error'); const el = tr && $(`[data-c="${c.k}"]`, tr); if (el) el.focus(); return; }
    if (H.validar) { const m = H.validar(r); if (m) return aviso(m, 'error'); }
    r.id = H.id ? H.id(r) : nuevoId();
    if (H.antes) await H.antes(r);
    const g = await guardar(H.t, r);
    if (H.despues) await H.despues(g);
    if (document.activeElement) document.activeElement.blur();
    aviso(H.creado ? H.creado(g) : 'Agregado. Escribe el siguiente o pulsa ✕.');
    hNuevo(key, H.siguiente ? H.siguiente(r) : null);
  }
  async function hCelda(el) {
    const tabla = el.closest('[data-hoja]'); const key = tabla.dataset.hoja; const H = HOJAS[key];
    const col = colDe(key, el.dataset.c); const tr = el.closest('tr'); const v = leerCelda(el, col);
    const tras = () => new Promise((ok) => setTimeout(ok, 0)); // dejar que el cursor llegue a la siguiente celda
    if (tr.hasAttribute('data-borrador')) { ponerValor(col, UI.borr[key], v); if (col.refresca) { await tras(); render(); } return; }
    const orig = porId(H.t, tr.dataset.hid); if (!orig) return;
    const r = clonar(orig);
    if (col.req && !v) { el.value = valorDe(col, orig) || ''; return aviso(`${col.l} no puede quedar vacío`, 'error'); }
    ponerValor(col, r, v);
    if (JSON.stringify(r) === JSON.stringify(orig)) return;
    if (H.antes) await H.antes(r, col.k);
    const g = await guardar(H.t, r);
    if (H.despues) await H.despues(g, col.k);
    await tras(); render();
    const td = $(`[data-hoja="${key}"] tr[data-hid="${g.id}"] [data-c="${col.k}"]`); if (td) { const c = td.closest('td'); c.classList.add('g-ok'); setTimeout(() => c.classList.remove('g-ok'), 900); }
  }
  async function hDuplicar(key, id) {
    const H = HOJAS[key]; const r = clonar(porId(H.t, id));
    delete r.numero; delete r.creado;
    if (H.duplicar) H.duplicar(r);
    r.id = H.id ? H.id(r) : nuevoId();
    const g = await guardar(H.t, r); aviso('Copia creada.'); render();
    const el = $(`[data-hoja="${key}"] tr[data-hid="${g.id}"] [data-c]`); if (el) { el.focus(); if (el.select) el.select(); el.scrollIntoView({ block: 'center' }); }
  }
  async function hEliminar(key, id) {
    const H = HOJAS[key]; const r = porId(H.t, id);
    const no = H.noBorrar && H.noBorrar(r); if (no) return aviso(no, 'error');
    if (!(await confirmar(H.borrarMsg ? H.borrarMsg(r) : '¿Eliminar esta fila? No se puede deshacer.'))) return;
    await borrar(H.t, id); if (H.alBorrar) H.alBorrar(r); aviso('Eliminado'); render();
  }
  document.addEventListener('change', async (e) => {
    const el = e.target; if (!el.matches || !el.matches('.hoja [data-c]')) return;
    try { await hCelda(el); } catch (err) { render(); }
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target; if (!el.matches || !el.matches('.hoja [data-c]')) return;
    const tr = el.closest('tr'); const key = el.closest('[data-hoja]').dataset.hoja;
    if (e.key === 'Escape' && tr.hasAttribute('data-borrador')) { UI.borr[key] = null; render(); return; }
    if (e.key !== 'Enter' || el.tagName === 'SELECT') return;
    e.preventDefault();
    if (tr.hasAttribute('data-borrador')) { const col = colDe(key, el.dataset.c); ponerValor(col, UI.borr[key], leerCelda(el, col)); hCrear(key).catch(() => {}); return; }
    const sig = tr.nextElementSibling; const d = sig && $(`[data-c="${el.dataset.c}"]`, sig);
    if (d) { d.focus(); if (d.select) d.select(); } else el.blur();
  });

  // un solo producto por fila (ventas y compras); con varios se usa ✎
  const unItem = (r, borr) => borr || (r.items || []).length <= 1;
  const item0 = (r) => { if (!r.items || !r.items.length) r.items = [{ producto_id: '', nombre: '', cant: 1, precio: 0, costo: 0, variante: '' }]; return r.items[0]; };
  const listaItems = (r) => `${(r.items || []).map((i) => `${int(i.cant)} × ${esc(i.nombre)}${i.variante ? ' (' + esc(i.variante) + ')' : ''}`).join('<br>')} <span class="nota">· ✎ para editar</span>`;
  const opsProductos = () => Object.fromEntries(DB.productos.filter((p) => p.activo).map((p) => [p.id, p.nombre]));
  const opsProductosDe = (r) => { const o = opsProductos(); (r.items || []).forEach((i) => { if (i.producto_id && !o[i.producto_id]) o[i.producto_id] = i.nombre; }); return o; };
  const OPS_METODOS = Object.fromEntries(METODOS.map((m) => [m, m]));
  async function clientePorNombre(nombre) {
    if (!nombre) return null;
    let c = DB.clientes.find((x) => x.nombre.toLowerCase() === nombre.toLowerCase());
    if (!c) c = await guardar('clientes', { id: nuevoId(), nombre });
    return c.id;
  }

  HOJAS.ventas = {
    t: 'ventas', vista: 'ventas', nuevo: 'nueva-venta', etiqueta: 'Registrar una venta', vacio: 'No hay ventas con estos filtros.',
    base: () => ({ fecha: hoy(), canal: 'whatsapp', items: [{ producto_id: '', nombre: '', cant: 1, precio: 0, costo: 0, variante: '' }], descuento: 0, envio: 0, metodo: 'Nequi', pago: 'pagado', entrega: 'por_despachar', anulada: false, cliente_id: null }),
    cols: [
      { l: 'N.º', fija: true, calc: (r, b) => (b ? '<span class="nota">Nueva</span>' : `<b>#${r.numero || '—'}</b>`) },
      { k: 'fecha', l: 'Fecha', tipo: 'date' },
      { k: 'cliente', l: 'Cliente', lista: 'lista-clientes', ph: 'Sin cliente', ancho: 170, get: (r) => (r._cliente != null ? r._cliente : (porId('clientes', r.cliente_id) || {}).nombre || ''), set: (r, v) => { r._cliente = v || ''; } },
      { k: 'producto', l: 'Producto', tipo: 'select', vacio: '— Elige —', ancho: 190, refresca: true, ops: opsProductosDe, editable: unItem, solo: listaItems, get: (r) => ((r.items || [])[0] || {}).producto_id || '',
        set: (r, v) => { const i = item0(r); if (i.producto_id === v) return; const p = prod(v); i.producto_id = v || ''; i.nombre = p ? p.nombre : ''; i.precio = p ? int(p.precio) : 0; i.costo = p ? int(p.costo) : 0; i.variante = ''; } },
      { k: 'cant', l: 'Cant.', tipo: 'num', ancho: 70, refresca: true, editable: unItem, solo: () => '', get: (r) => ((r.items || [])[0] || {}).cant || 1, set: (r, v) => { item0(r).cant = Math.max(1, int(v)); } },
      { k: 'precio', l: 'Precio', tipo: 'num', ancho: 100, refresca: true, editable: unItem, solo: () => '', get: (r) => ((r.items || [])[0] || {}).precio || 0, set: (r, v) => { item0(r).precio = int(v); } },
      { k: 'canal', l: 'Canal', tipo: 'select', ops: CANALES },
      { l: 'Total', der: true, calc: (r) => money(tv(r).total) },
      { k: 'metodo', l: 'Método', tipo: 'select', ops: OPS_METODOS },
      { k: 'pago', l: 'Pago', tipo: 'select', ops: { pagado: 'Pagado', pendiente: 'Por cobrar' } },
      { k: 'entrega', l: 'Entrega', tipo: 'select', ops: ENTREGAS },
      { k: 'nota', l: 'Nota', ancho: 180 },
      { k: 'anulada', l: 'Anulada', tipo: 'check' },
    ],
    apagada: (r) => r.anulada,
    validar: (r) => (!(r.items || []).some((i) => i.producto_id) ? 'Elige el producto vendido' : null),
    async antes(r, k) { if (!k || k === 'cliente') { if (r._cliente != null) r.cliente_id = await clientePorNombre(r._cliente); } delete r._cliente; r.items = (r.items || []).filter((i) => i.producto_id); },
    creado: (g) => `Venta #${g.numero || ''} registrada. Escribe la siguiente o pulsa ✕.`,
    duplicar: (r) => { r.fecha = hoy(); r.anulada = false; },
    borrarMsg: (r) => `¿Eliminar la venta #${r.numero}? Las existencias se devuelven. Si solo quieres que no cuente, mejor márcala como anulada.`,
    extra: (r) => `<button class="ico-btn" data-accion="recibo" data-id="${r.id}" title="Recibo" aria-label="Recibo">🧾</button><button class="ico-btn" data-accion="editar-venta" data-id="${r.id}" title="Varios productos, descuento, vendedor y envío" aria-label="Editar todo">✎</button>`,
  };

  HOJAS.compras = {
    t: 'compras', vista: 'compras', nuevo: 'nueva-compra', etiqueta: 'Registrar una compra', vacio: 'No hay compras en este periodo. Registra lo que le compras a tus proveedores y el inventario sube solo.',
    base: () => ({ fecha: hoy(), proveedor_id: (DB.proveedores[0] || {}).id || null, items: [{ producto_id: '', nombre: '', cant: 1, costo: 0 }], flete: 0, pago: 'pagado', metodo: 'Transferencia' }),
    cols: [
      { l: 'N.º', fija: true, calc: (r, b) => (b ? '<span class="nota">Nueva</span>' : `<b>C-${r.numero || '—'}</b>`) },
      { k: 'fecha', l: 'Fecha', tipo: 'date' },
      { k: 'proveedor_id', l: 'Proveedor', tipo: 'select', vacio: '— Sin proveedor —', ops: () => Object.fromEntries(DB.proveedores.map((p) => [p.id, p.nombre])) },
      { k: 'producto', l: 'Producto', tipo: 'select', vacio: '— Elige —', ancho: 190, refresca: true, ops: opsProductosDe, editable: unItem, solo: listaItems, get: (r) => ((r.items || [])[0] || {}).producto_id || '',
        set: (r, v) => { const i = item0(r); if (i.producto_id === v) return; const p = prod(v); i.producto_id = v || ''; i.nombre = p ? p.nombre : ''; i.costo = p ? int(p.costo) : 0; delete i.precio; } },
      { k: 'cant', l: 'Cant.', tipo: 'num', ancho: 70, refresca: true, editable: unItem, solo: () => '', get: (r) => ((r.items || [])[0] || {}).cant || 1, set: (r, v) => { item0(r).cant = Math.max(1, int(v)); } },
      { k: 'costo', l: 'Costo unidad', tipo: 'num', ancho: 100, refresca: true, editable: unItem, solo: () => '', get: (r) => ((r.items || [])[0] || {}).costo || 0, set: (r, v) => { item0(r).costo = int(v); } },
      { k: 'flete', l: 'Flete', tipo: 'num', ancho: 90, refresca: true },
      { l: 'Total', der: true, calc: (r) => money(totCompra(r)) },
      { k: 'metodo', l: 'Método', tipo: 'select', ops: OPS_METODOS },
      { k: 'pago', l: 'Pago', tipo: 'select', ops: { pagado: 'Pagada', pendiente: 'Por pagar' } },
      { k: 'nota', l: 'Nota', ancho: 180 },
    ],
    validar: (r) => (!(r.items || []).some((i) => i.producto_id) ? 'Elige el producto que llegó' : null),
    antes(r) { r.items = (r.items || []).filter((i) => i.producto_id); r.flete = int(r.flete); },
    async despues(g, k) { if (k && !['costo', 'producto'].includes(k)) return; for (const i of g.items || []) { const p = prod(i.producto_id); if (p && int(i.costo) && int(p.costo) !== int(i.costo)) await guardar('productos', Object.assign({}, p, { costo: int(i.costo), proveedor_id: g.proveedor_id || p.proveedor_id })); } },
    creado: () => 'Compra registrada: las existencias subieron y el costo del producto quedó actualizado.',
    duplicar: (r) => { r.fecha = hoy(); },
    borrarMsg: (r) => `¿Eliminar la compra C-${r.numero}? Las existencias que sumó se restan.`,
    extra: (r) => `<button class="ico-btn" data-accion="editar-compra" data-id="${r.id}" title="Varios productos" aria-label="Editar todo">✎</button>`,
  };

  HOJAS.clientes = {
    t: 'clientes', vista: 'clientes', nuevo: 'nuevo-cliente', etiqueta: 'Agregar cliente', vacio: 'Aún no hay clientes. Se crean solos al registrar ventas, o agrégalos aquí.',
    base: () => ({ nombre: '' }),
    cols: [
      { k: 'nombre', l: 'Cliente', fija: true, req: true, ph: 'Nombre del cliente', ancho: 200 },
      { k: 'telefono', l: 'Celular', ph: '300 000 0000', ancho: 130 },
      { k: 'ciudad', l: 'Ciudad', ancho: 130 },
      { k: 'direccion', l: 'Dirección', ancho: 200 },
      { k: 'correo', l: 'Correo', ancho: 190 },
      { k: 'nota', l: 'Nota', ancho: 180 },
      { l: 'Compras', der: true, calc: (r, b) => (b ? '—' : (CTX.st[r.id] || {}).n || 0) },
      { l: 'Total comprado', der: true, calc: (r, b) => (b ? '—' : money((CTX.st[r.id] || {}).total || 0)) },
      { l: 'Última compra', calc: (r, b) => (!b && (CTX.st[r.id] || {}).ult ? fechaCorta(CTX.st[r.id].ult) : '—') },
    ],
    duplicar: (r) => { r.nombre += ' (copia)'; },
    borrarMsg: (r) => `¿Eliminar a ${r.nombre}? Sus ventas se conservan, pero quedan sin cliente.`,
    extra: (r) => (r.telefono ? `<a class="ico-btn" href="https://wa.me/${esc(waNum(r.telefono))}" target="_blank" rel="noopener" title="Escribir por WhatsApp" aria-label="WhatsApp">💬</a>` : ''),
  };

  HOJAS.proveedores = {
    t: 'proveedores', vista: 'proveedores', nuevo: 'nuevo-proveedor', etiqueta: 'Agregar proveedor', vacio: 'Registra a quién le compras: fabricantes de pines, bordados, estampados o importaciones.',
    base: () => ({ nombre: '', tipo: 'fabricante' }),
    cols: [
      { k: 'nombre', l: 'Proveedor', fija: true, req: true, ph: 'Nombre', ancho: 200 },
      { k: 'tipo', l: 'Tipo', tipo: 'select', ops: { fabricante: 'Fabricante', taller: 'Taller (bordado, estampado)', importacion: 'Importación', otro: 'Otro' } },
      { k: 'contacto', l: 'Contacto', ancho: 150 },
      { k: 'telefono', l: 'Celular', ancho: 130 },
      { k: 'ciudad', l: 'Ciudad', ancho: 130 },
      { k: 'nota', l: 'Nota', ph: 'Tiempos de entrega, mínimos…', ancho: 240 },
      { l: 'Comprado', der: true, calc: (r, b) => (b ? '—' : money(CTX.tot[r.id] || 0)) },
    ],
    duplicar: (r) => { r.nombre += ' (copia)'; },
    borrarMsg: (r) => `¿Eliminar a ${r.nombre}? Sus compras se conservan sin proveedor.`,
    extra: (r) => (r.telefono ? `<a class="ico-btn" href="https://wa.me/${esc(waNum(r.telefono))}" target="_blank" rel="noopener" title="Escribir por WhatsApp" aria-label="WhatsApp">💬</a>` : ''),
  };

  HOJAS.gastos = {
    t: 'gastos', vista: 'gastos', nuevo: 'nuevo-gasto', etiqueta: 'Registrar gasto', vacio: 'Registra publicidad, empaques, envíos y demás gastos para conocer tu utilidad real.',
    base: () => ({ fecha: hoy(), categoria: 'Publicidad', descripcion: '', valor: null, metodo: 'Nequi' }),
    cols: [
      { k: 'fecha', l: 'Fecha', tipo: 'date', fija: true },
      { k: 'categoria', l: 'Categoría', tipo: 'select', ops: Object.fromEntries(GASTOS.map((x) => [x, x])) },
      { k: 'descripcion', l: 'Descripción', ph: '¿En qué se gastó?', ancho: 260 },
      { k: 'valor', l: 'Valor', tipo: 'num', req: true, ph: '0', ancho: 110 },
      { k: 'metodo', l: 'Método', tipo: 'select', ops: OPS_METODOS },
    ],
    siguiente: (r) => ({ fecha: r.fecha, categoria: r.categoria, metodo: r.metodo }),
    duplicar: (r) => { r.fecha = hoy(); },
    borrarMsg: (r) => `¿Eliminar el gasto de ${money(r.valor)}?`,
  };

  HOJAS.equipo = {
    t: 'equipo', vista: 'equipo', nuevo: 'nueva-persona', etiqueta: 'Agregar persona', vacio: 'Agrega a tus embajadores y vendedores en calle para calcular sus comisiones.',
    base: () => ({ nombre: '', tipo: 'embajador', nivel: 'explorador', codigo: null, telefono: null, activo: true }),
    cols: [
      { k: 'nombre', l: 'Persona', fija: true, req: true, ph: 'Nombre', ancho: 180 },
      { k: 'tipo', l: 'Tipo', tipo: 'select', ops: { embajador: 'Embajador', calle: 'Vendedor en calle' } },
      { k: 'nivel', l: 'Nivel', tipo: 'select', vacio: '—', ops: NIVELES },
      { k: 'codigo', l: 'Código', ph: 'LAURA25', ancho: 110 },
      { k: 'telefono', l: 'Celular', ancho: 130 },
      { k: 'activo', l: 'Activo', tipo: 'check' },
      { l: 'Ventas', der: true, calc: (r, b) => { const s = !b && CTX.sal[r.id]; return s ? `${s.ventas} · ${s.unidades} u.` : '—'; } },
      { l: 'Generado', der: true, calc: (r, b) => (!b && CTX.sal[r.id] ? money(CTX.sal[r.id].generado) : '—') },
      { l: 'Pagado', der: true, calc: (r, b) => (!b && CTX.sal[r.id] ? money(CTX.sal[r.id].pagado) : '—') },
      { l: 'Saldo', der: true, calc: (r, b) => { const s = !b && CTX.sal[r.id]; return s ? chip(money(s.saldo), s.saldo > 0 ? 'ambar' : 'menta') : '—'; } },
    ],
    apagada: (r) => !r.activo,
    antes(r) { r.codigo = r.codigo ? r.codigo.toUpperCase().replace(/\s+/g, '') : null; if (r.tipo === 'calle') r.nivel = null; else if (!r.nivel) r.nivel = 'explorador'; },
    duplicar: (r) => { r.nombre += ' (copia)'; r.codigo = null; },
    borrarMsg: (r) => `¿Eliminar a ${r.nombre}? Se borran también sus pagos registrados.`,
    extra: (r) => { const s = CTX.sal[r.id]; return `${s && s.saldo > 0 ? `<button class="btn btn-primary btn-sm" data-accion="pagar-persona" data-id="${r.id}">Pagar</button>` : ''}${r.codigo ? `<button class="ico-btn" data-accion="copiar-enlace" data-codigo="${esc(r.codigo)}" title="Copiar enlace con descuento" aria-label="Copiar enlace">🔗</button>` : ''}`; },
  };

  HOJAS.pagos = {
    t: 'pagos_equipo', vista: 'equipo', nuevo: 'nuevo-pago', etiqueta: 'Registrar pago', vacio: 'Aún no hay pagos de comisiones.',
    base: () => ({ fecha: hoy(), persona_id: (DB.equipo[0] || {}).id || '', valor: null, metodo: 'Nequi' }),
    cols: [
      { k: 'fecha', l: 'Fecha', tipo: 'date', fija: true },
      { k: 'persona_id', l: 'Persona', tipo: 'select', ops: () => Object.fromEntries(DB.equipo.map((p) => [p.id, p.nombre])) },
      { k: 'valor', l: 'Valor', tipo: 'num', req: true, ph: '0', ancho: 110 },
      { k: 'metodo', l: 'Método', tipo: 'select', ops: OPS_METODOS },
    ],
    validar: (r) => (!r.persona_id ? 'Elige la persona' : null),
    creado: () => 'Pago registrado.', siguiente: () => null,
    duplicar: (r) => { r.fecha = hoy(); },
    borrarMsg: (r) => `¿Eliminar el pago de ${money(r.valor)}?`,
  };

  const idCategoria = (r) => { let id = slug(r.nombre), k = 2; while (porId('categorias', id)) id = slug(r.nombre) + '-' + k++; return id; };
  const ordenSiguiente = () => DB.categorias.reduce((m, x) => Math.max(m, x.orden || 0), -1) + 1;
  HOJAS.categorias = {
    t: 'categorias', vista: 'categorias', nuevo: 'nueva-categoria', etiqueta: 'Crear categoría', vacio: 'Todavía no hay categorías. Crea la primera para empezar a ordenar la tienda.',
    base: () => ({ nombre: '', detalle: null, imagen: null, orden: ordenSiguiente() }),
    cols: [
      { k: 'nombre', l: 'Categoría', fija: true, req: true, ph: 'Bolsos, Gorras, Tazas…', ancho: 180 },
      { l: 'Foto', calc: (r, b) => (b ? '<span class="mini g-sinfoto">Foto<br>luego</span>' : `<button class="g-foto" data-accion="editar-categoria" data-id="${esc(r.id)}" title="Cambiar foto"><img class="mini" src="${esc(fotoCategoria(r))}" alt=""></button>`) },
      { k: 'detalle', l: 'Descripción corta', ph: 'Bordados para coser o planchar', ancho: 280 },
      { l: 'Productos', der: true, calc: (r, b) => (b ? '—' : CTX.cuenta[r.id] || 0) },
      { l: 'Orden', calc: (r, b) => { if (b) return '—'; const l = categoriasOrdenadas(); const i = l.findIndex((c) => c.id === r.id); return `<button class="ico-btn" data-accion="cat-subir" data-id="${esc(r.id)}" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button class="ico-btn" data-accion="cat-bajar" data-id="${esc(r.id)}" aria-label="Bajar" ${i === l.length - 1 ? 'disabled' : ''}>↓</button>`; } },
    ],
    id: idCategoria,
    creado: (g) => `Categoría "${g.nombre}" creada. Escribe la siguiente o pulsa ✕.`,
    duplicar: (r) => { r.nombre += ' (copia)'; r.orden = ordenSiguiente(); },
    noBorrar: (r) => { const n = DB.productos.filter((p) => p.categoria_id === r.id).length; return n ? `No se puede eliminar: tiene ${n} productos. Pásalos primero a otra categoría en Inventario.` : null; },
    borrarMsg: (r) => `¿Eliminar la categoría ${r.nombre}?`,
    extra: (r) => `<button class="btn btn-ghost btn-sm" data-accion="producto-en-cat" data-id="${esc(r.id)}">+ Producto</button>`,
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
      ${ayudaHoja}
      <datalist id="lista-clientes">${DB.clientes.map((x) => `<option value="${esc(x.nombre)}">${esc(x.telefono || '')}</option>`).join('')}</datalist>
      ${hoja('ventas', lista)}`;
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
      ${ayudaHoja}
      ${hoja('compras', lista)}`;
    },
  };

  const ARISQUEZ = { 1: '1 · Casi dócil', 2: '2 · Tímido', 3: '3 · Con carácter', 4: '4 · Muy arisco', 5: '5 · Indomable' };
  const opciones = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const margenDe = (p) => (int(p.costo) && int(p.precio) ? Math.round(((int(p.precio) - int(p.costo)) / int(p.precio)) * 100) + ' %' : '—');
  function filaGrilla(p, cats) {
    const b = !p; const d = b ? UI.borrador : p;
    const s = b ? int(d.stock) : stockDe(p.id);
    const inp = (k, v, extra) => `<input data-g="${k}" value="${esc(v == null ? '' : v)}" ${extra || ''}>`;
    const num = (k, v, ph) => inp(k, v, `inputmode="numeric" class="der" placeholder="${ph || ''}"`);
    const chk = (k, v) => `<input type="checkbox" data-g="${k}" ${v ? 'checked' : ''} aria-label="${k}">`;
    return `<tr data-pid="${b ? '' : esc(p.id)}" ${b ? 'data-borrador class="g-borrador"' : p.activo ? '' : 'class="anulada"'}>
      <td class="g-fija g-c-foto">${b ? '<span class="mini g-sinfoto">Foto<br>luego</span>' : `<label class="g-foto" title="Cambiar foto">${foto(p)}<input type="file" accept="image/*" hidden data-g-foto="${esc(p.id)}"></label>`}</td>
      <td class="g-fija g-c-nombre">${inp('nombre', d.nombre, `placeholder="${b ? 'Escribe el nombre y pulsa Enter' : ''}" class="g-nombre"`)}</td>
      <td><select data-g="categoria_id">${opciones(Object.fromEntries(categoriasOrdenadas().map((c) => [c.id, c.nombre])), d.categoria_id)}</select></td>
      <td>${num('precio', int(d.precio))}</td>
      <td>${num('precio_antes', d.precio_antes || '', '—')}</td>
      <td class="${int(d.costo) ? '' : 'g-falta'}">${num('costo', int(d.costo) || '', 'Falta')}</td>
      <td class="der num g-margen">${margenDe(d)}</td>
      <td class="g-stock ${s <= 0 ? 'rojo' : s <= int(d.stock_min) ? 'ambar' : 'menta'}">${inp('stock', s, 'type="number" min="0" class="der"')}</td>
      <td>${inp('stock_min', int(d.stock_min), 'type="number" min="0" class="der"')}</td>
      <td class="der num">${b ? '—' : IDX.vendidos[p.id] || 0}</td>
      <td class="g-chk">${chk('activo', d.activo)}</td>
      <td class="g-chk">${chk('destacado', d.destacado)}</td>
      <td class="g-chk">${chk('nuevo', d.nuevo)}</td>
      <td>${inp('linea', d.linea || '', 'placeholder="—"')}</td>
      <td><select data-g="arisquez">${opciones(ARISQUEZ, d.arisquez || 3)}</select></td>
      <td class="acciones"><div class="g-acc">${b
        ? '<button class="btn btn-primary btn-sm" data-accion="g-crear">Guardar</button><button class="ico-btn" data-accion="g-cancelar" title="Cancelar" aria-label="Cancelar">✕</button>'
        : `<button class="ico-btn" data-accion="ajustar" data-id="${esc(p.id)}" title="Ajustar existencias con motivo" aria-label="Ajustar existencias">±</button><button class="ico-btn" data-accion="editar-producto" data-id="${esc(p.id)}" title="Ficha completa (descripción, variantes…)" aria-label="Ficha completa">✎</button><button class="ico-btn" data-accion="g-duplicar" data-id="${esc(p.id)}" title="Duplicar" aria-label="Duplicar">⧉</button><button class="ico-btn peligro" data-accion="g-eliminar" data-id="${esc(p.id)}" title="Eliminar" aria-label="Eliminar">🗑</button>`}</div></td>
    </tr>`;
  }
  const idLibre = (nombre) => { let id = slug(nombre), k = 2; while (prod(id)) id = slug(nombre) + '-' + k++; return id; };
  const valorCelda = (el) => (el.type === 'checkbox' ? el.checked : el.value.trim());
  const NUMS = ['precio', 'costo', 'stock', 'stock_min', 'arisquez'];
  function leerFila(tr) {
    const o = {}; $$('[data-g]', tr).forEach((el) => { const k = el.dataset.g; const v = valorCelda(el); o[k] = NUMS.includes(k) ? Math.max(0, int(v)) : v; });
    o.precio_antes = int(o.precio_antes) || null; o.linea = o.linea || null; return o;
  }
  function nuevoBorrador(cat) {
    UI.filtros.inv = UI.filtros.inv || { q: '', cat: 'todas' };
    UI.borrador = { nombre: '', categoria_id: cat || (UI.filtros.inv.cat !== 'todas' ? UI.filtros.inv.cat : (categoriasOrdenadas()[0] || {}).id), precio: 10000, costo: 0, stock: 0, stock_min: 3, activo: true, arisquez: 3 };
    if (UI.vista !== 'inventario') irA('inventario'); else render();
    const n = $('tr[data-borrador] .g-nombre'); if (n) { n.focus(); n.scrollIntoView({ block: 'center' }); }
  }
  async function crearDesdeBorrador() {
    const tr = $('tr[data-borrador]'); if (!tr) return;
    const o = leerFila(tr);
    if (!o.nombre) { aviso('Escribe el nombre del producto', 'error'); $('.g-nombre', tr).focus(); return; }
    const id = idLibre(o.nombre);
    const { stock } = o; delete o.stock;
    await guardar('productos', Object.assign({ id, atributos: {}, imagen: null, proveedor_id: null }, o, { stock_inicial: stock }));
    if (document.activeElement) document.activeElement.blur();
    aviso(`${o.nombre} agregado. Escribe el siguiente o pulsa ✕.`);
    nuevoBorrador(o.categoria_id);
  }
  async function guardarCelda(el) {
    const tr = el.closest('tr'); const k = el.dataset.g;
    if (tr.hasAttribute('data-borrador')) { UI.borrador[k] = valorCelda(el); return; }
    const p = prod(tr.dataset.pid); if (!p) return;
    let v = valorCelda(el);
    if (k === 'nombre' && !v) { el.value = p.nombre; return aviso('El nombre no puede quedar vacío', 'error'); }
    if (k === 'stock') {
      const antes = stockDe(p.id), ahora = Math.max(0, int(v)); el.value = ahora;
      if (ahora === antes) return;
      await guardar('ajustes_inventario', { id: nuevoId(), fecha: hoy(), producto_id: p.id, cantidad: ahora - antes, motivo: 'Conteo' });
    } else {
      if (NUMS.includes(k)) v = Math.max(0, int(v)); else if (k === 'precio_antes') v = int(v) || null; else if (k === 'linea') v = v || null;
      if (p[k] === v || (p[k] == null && v === '')) return;
      await guardar('productos', Object.assign({}, p, { [k]: v }));
    }
    const q = prod(p.id); const s = stockDe(p.id);
    $('.g-margen', tr).textContent = margenDe(q);
    $('.g-stock', tr).className = 'g-stock ' + (s <= 0 ? 'rojo' : s <= int(q.stock_min) ? 'ambar' : 'menta');
    el.closest('td').classList.toggle('g-falta', !int(q.costo) && k === 'costo');
    tr.classList.toggle('anulada', !q.activo);
    const td = el.closest('td'); td.classList.add('g-ok'); setTimeout(() => td.classList.remove('g-ok'), 900);
  }
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.matches && el.matches('.grilla [data-g]')) { try { await guardarCelda(el); } catch (err) { render(); } return; }
    if (el.matches && el.matches('[data-g-foto]')) {
      const file = el.files[0]; if (!file) return; const p = prod(el.dataset.gFoto);
      estado('Subiendo foto…', 'ocupado');
      try { const imagen = await ST.subirFoto(file, p.id); await guardar('productos', Object.assign({}, p, { imagen })); aviso('Foto actualizada'); render(); }
      catch (err) { estado('No se guardó', 'error'); aviso('No se pudo subir la foto: ' + err.message, 'error'); }
    }
  });
  // mover la tabla arrastrando con el mouse
  let arrastre = null;
  document.addEventListener('pointerdown', (e) => {
    const caja = e.target.closest && e.target.closest('.grilla-caja');
    if (!caja || e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('input, select, button, label, a')) return;
    arrastre = { caja, x: e.clientX, y: e.clientY, l: caja.scrollLeft, t: caja.scrollTop, movio: false };
  });
  document.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (!arrastre.movio && Math.abs(dx) + Math.abs(dy) < 4) return;
    arrastre.movio = true; arrastre.caja.classList.add('arrastrando');
    arrastre.caja.scrollLeft = arrastre.l - dx; arrastre.caja.scrollTop = arrastre.t - dy; e.preventDefault();
  });
  document.addEventListener('pointerup', () => { if (arrastre) arrastre.caja.classList.remove('arrastrando'); arrastre = null; });
  // Shift + rueda (o la rueda sobre la barra) mueve hacia los lados
  document.addEventListener('wheel', (e) => {
    const caja = e.target.closest && e.target.closest('.grilla-caja'); if (!caja) return;
    if (e.shiftKey && !e.deltaX) { caja.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    const el = e.target; if (!el.matches || !el.matches('.grilla [data-g]')) return;
    const tr = el.closest('tr');
    if (e.key === 'Escape' && tr.hasAttribute('data-borrador')) { UI.borrador = null; render(); return; }
    if (e.key !== 'Enter' || el.tagName === 'SELECT') return;
    e.preventDefault();
    if (tr.hasAttribute('data-borrador')) { UI.borrador[el.dataset.g] = valorCelda(el); crearDesdeBorrador().catch(() => {}); return; }
    let sig = tr.nextElementSibling; const k = el.dataset.g;
    const destino = sig && $(`[data-g="${k}"]`, sig);
    if (destino) { destino.focus(); if (destino.select) destino.select(); } else el.blur();
  });

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
      <p class="nota g-ayuda">Toca cualquier celda para editarla: se guarda sola al salir de la celda. <b>Enter</b> baja a la fila siguiente. Toca la foto para cambiarla. Para ver más columnas, <b>arrastra la tabla con el mouse</b> hacia los lados o usa <b>Shift + rueda</b>.</p>
      <div class="tabla-scroll grilla-caja"><table class="tabla grilla"><thead><tr><th class="g-fija g-c-foto">Foto</th><th class="g-fija g-c-nombre">Producto</th><th>Categoría</th><th class="der">Precio</th><th class="der">Precio antes</th><th class="der">Costo</th><th class="der">Margen</th><th class="der">Existencias</th><th class="der">Avisar en</th><th class="der">Vendidos</th><th>Visible</th><th>Destacado</th><th>Nuevo</th><th>Línea</th><th>Arisquez</th><th></th></tr></thead><tbody>
      ${UI.borrador ? filaGrilla(null, cats) : ''}
      ${lista.map((p) => filaGrilla(p, cats)).join('')}</tbody></table></div>
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
      const cuenta = {}; DB.productos.forEach((p) => { if (p.activo) cuenta[p.categoria_id] = (cuenta[p.categoria_id] || 0) + 1; }); CTX = { cuenta };
      return `<p class="nota">Las categorías ordenan la tienda: aparecen como tarjetas en el inicio y como filtros en la tienda, en este orden.</p>
      ${ayudaHoja}
      ${hoja('categorias', lista)}`;
    },
  };

  VISTAS.pedidos = {
    titulo: 'Pedidos web',
    html() {
      if ((DB.falta || []).includes('pedidos')) return `<div class="vacio"><p>Falta crear la tabla de pedidos en Supabase. Abre <b>SQL Editor</b>, pega el archivo <code>supabase/pedidos.sql</code> del repositorio y toca <b>Run</b>. Luego recarga el panel.</p></div>`;
      const f = UI.filtros.ped || (UI.filtros.ped = { ver: 'pendiente' });
      const lista = DB.pedidos.filter((p) => f.ver === 'todos' || p.estado === f.ver).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
      const fecha = (c) => { const d = new Date(c); return isNaN(d) ? '' : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
      return `
      <p class="nota">Cuando el cliente te mande el comprobante de Nequi, busca la referencia aquí y confirma el pago: se registra la venta, el cliente y baja el inventario.</p>
      <div class="filtros">${selector('f-ped', { pendiente: 'Esperando pago', pagado: 'Pagados', cancelado: 'Cancelados', todos: 'Todos' }, f.ver)}<span class="nota">${lista.length} pedidos</span></div>
      ${lista.length ? `<div class="mensajes">${lista.map((p) => `
        <article class="mensaje ${p.estado === 'pendiente' ? 'nuevo' : ''}">
          <header><b class="num">${esc(p.referencia)}</b><b>${esc(p.nombre)}</b>${chip(p.estado === 'pendiente' ? 'Esperando pago' : p.estado === 'pagado' ? 'Pagado' : 'Cancelado', p.estado === 'pendiente' ? 'ambar' : p.estado === 'pagado' ? 'menta' : 'gris')}<span class="nota">${fecha(p.creado)}</span></header>
          <p>${(p.items || []).map((i) => `${i.cant} × ${esc(i.nombre)}${i.variante ? ' (' + esc(i.variante) + ')' : ''}`).join(' · ')}</p>
          <p class="nota">${esc(p.ciudad)} · ${esc(p.direccion)}${p.codigo ? ' · código ' + esc(p.codigo) : ''}${p.nota ? ' · ' + esc(p.nota) : ''}</p>
          <footer>
            <span><b class="num" style="font-size:18px">${money(p.total)}</b> <span class="nota">${p.envio ? 'incluye envío ' + money(p.envio) : 'envío gratis'}</span></span>
            <div class="botones">
              <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(waNum(p.telefono))}?text=${encodeURIComponent('Hola, ' + p.nombre + '. Te escribimos de Gatoarisco por tu pedido ' + p.referencia + '.')}">WhatsApp</a>
              ${p.estado === 'pendiente' ? `<button class="btn btn-primary btn-sm" data-accion="pedido-pagado" data-id="${p.id}">Confirmar pago</button><button class="btn btn-ghost btn-sm" data-accion="pedido-cancelar" data-id="${p.id}">Cancelar</button>` : ''}
              ${p.venta_id && porId('ventas', p.venta_id) ? `<button class="btn btn-ghost btn-sm" data-accion="recibo" data-id="${p.venta_id}">Recibo</button>` : ''}
            </div>
          </footer>
        </article>`).join('')}</div>` : vacio(DB.pedidos.length ? 'No hay pedidos con este filtro.' : 'Todavía no hay pedidos web. Llegan aquí cuando alguien compra en la tienda y elige pagar con Nequi.')}`;
    },
  };

  VISTAS.mensajes = {
    titulo: 'Mensajes',
    html() {
      if ((DB.falta || []).includes('mensajes')) return `<div class="vacio"><p>Falta crear la bandeja en Supabase. Abre <b>SQL Editor</b>, pega el archivo <code>supabase/mensajes.sql</code> del repositorio y toca <b>Run</b>. Luego recarga el panel.</p></div>`;
      const f = UI.filtros.msj || (UI.filtros.msj = { ver: 'todos' });
      const lista = DB.mensajes.filter((m) => f.ver === 'todos' || (f.ver === 'sin-leer' ? !m.leido : !m.respondido)).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
      const fecha = (c) => { const d = new Date(c); return isNaN(d) ? '' : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
      const esCorreo = (c) => /@/.test(c);
      return `
      <div class="filtros">${selector('f-msj', { todos: 'Todos', 'sin-leer': 'Sin leer', 'sin-responder': 'Sin responder' }, f.ver)}<span class="nota">${DB.mensajes.filter((m) => !m.leido).length} sin leer · ${DB.mensajes.length} en total</span></div>
      ${lista.length ? `<div class="mensajes">${lista.map((m) => `
        <article class="mensaje ${m.leido ? '' : 'nuevo'}">
          <header><b>${esc(m.nombre)}</b>${chip(m.tipo, m.tipo === 'Pedido' || m.tipo === 'Mayoristas' ? 'ambar' : 'menta')}${m.respondido ? chip('Respondido', 'gris') : ''}<span class="nota">${fecha(m.creado)}</span></header>
          <p>${esc(m.mensaje).replace(/\n/g, '<br>')}</p>
          <footer>
            <span class="nota">${esc(m.contacto)}</span>
            <div class="botones">
              ${esCorreo(m.contacto)
                ? `<a class="btn btn-primary btn-sm" data-accion="msj-responder" data-id="${m.id}" href="mailto:${esc(m.contacto)}?subject=${encodeURIComponent('Gatoarisco · ' + m.tipo)}&body=${encodeURIComponent('Hola, ' + m.nombre + '.\n\n')}">Responder por correo</a>`
                : `<a class="btn btn-primary btn-sm" data-accion="msj-responder" data-id="${m.id}" target="_blank" rel="noopener" href="https://wa.me/${esc(waNum(m.contacto))}?text=${encodeURIComponent('Hola, ' + m.nombre + '. Te escribimos de Gatoarisco por tu mensaje.')}">Responder por WhatsApp</a>`}
              <button class="btn btn-ghost btn-sm" data-accion="msj-leido" data-id="${m.id}">${m.leido ? 'Marcar sin leer' : 'Marcar leído'}</button>
              <button class="ico-btn" data-accion="borrar" data-t="mensajes" data-id="${m.id}" aria-label="Borrar">🗑</button>
            </div>
          </footer>
        </article>`).join('')}</div>` : vacio(DB.mensajes.length ? 'No hay mensajes con este filtro.' : 'Todavía no hay mensajes. Llegan aquí desde el formulario de contacto del inicio de la tienda.')}`;
    },
  };

  VISTAS.clientes = {
    titulo: 'Clientes', boton: ['nuevo-cliente', 'Nuevo cliente'],
    html() {
      const f = UI.filtros.cli || (UI.filtros.cli = { q: '' }); const q = f.q.toLowerCase();
      const st = {}; DB.ventas.forEach((v) => { if (v.anulada || !v.cliente_id) return; const s = st[v.cliente_id] || (st[v.cliente_id] = { n: 0, total: 0, ult: '' }); s.n++; s.total += tv(v).total; if (v.fecha > s.ult) s.ult = v.fecha; });
      CTX = { st };
      const lista = DB.clientes.filter((c) => !q || `${c.nombre} ${c.telefono || ''} ${c.ciudad || ''}`.toLowerCase().includes(q)).sort((a, b) => ((st[b.id] || {}).total || 0) - ((st[a.id] || {}).total || 0));
      return `
      <div class="filtros"><input type="search" id="f-cli" placeholder="Buscar por nombre, celular o ciudad" value="${esc(f.q)}"><span class="nota">${DB.clientes.length} clientes</span></div>
      ${ayudaHoja}
      ${hoja('clientes', lista)}`;
    },
  };

  VISTAS.proveedores = {
    titulo: 'Proveedores', boton: ['nuevo-proveedor', 'Nuevo proveedor'],
    html() {
      const tot = {}; DB.compras.forEach((c) => { if (c.proveedor_id) tot[c.proveedor_id] = (tot[c.proveedor_id] || 0) + totCompra(c); });
      CTX = { tot };
      return ayudaHoja + hoja('proveedores', DB.proveedores);
    },
  };

  VISTAS.equipo = {
    titulo: 'Equipo y comisiones', boton: ['nueva-persona', 'Nueva persona'],
    html() {
      const sal = saldosEquipo(); const tar = DB.empresa.tarifas || {}; CTX = { sal };
      const total = Object.values(sal).reduce((a, x) => a + Math.max(0, x.saldo), 0);
      return `
      <div class="kpis">${kpi('Embajadores', DB.equipo.filter((p) => p.tipo === 'embajador' && p.activo).length)}${kpi('Vendedores en calle', DB.equipo.filter((p) => p.tipo === 'calle' && p.activo).length)}${kpi('Comisiones por pagar', money(total), 'solo de ventas ya pagadas', total ? 'mal' : '')}</div>
      <p class="nota">Embajadores: ${Object.entries(NIVELES).map(([k, n]) => `${n} ${money(tar[k])}`).join(' · ')} por unidad. Vendedores en calle: ${DB.empresa.pct_calle} % de la utilidad de cada venta. Se cambia en Ajustes.</p>
      ${ayudaHoja}
      ${hoja('equipo', DB.equipo)}
      <div class="subt-fila"><h3 class="subt">Pagos de comisiones</h3><button class="btn btn-ghost btn-sm" data-accion="nuevo-pago">+ Registrar pago</button></div>
      ${hoja('pagos', DB.pagos_equipo.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)))}`;
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
      ${ayudaHoja}
      ${hoja('gastos', lista)}`;
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
      <p class="modal-error" role="alert" hidden></p>
      <footer>${opts.borrar ? `<button type="button" class="btn btn-ghost btn-sm peligro" data-borrar>${opts.borrar}</button>` : '<span></span>'}<div class="botones"><button type="button" class="btn btn-ghost" data-cerrar>${alGuardar ? 'Cancelar' : 'Cerrar'}</button>${alGuardar ? `<button type="submit" class="btn btn-primary">${opts.boton || 'Guardar'}</button>` : ''}</div></footer>
    </form>`;
    const f = $('form', d);
    $$('[data-cerrar]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    if (opts.borrar) $('[data-borrar]', d).addEventListener('click', async () => { if (await confirmar(opts.confirmarBorrar || '¿Seguro?')) { await opts.alBorrar(); d.close(); render(); } });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const b = $('button[type=submit]', f); b.disabled = true;
      try { const r = await alGuardar(f); if (r !== false) { d.close(); render(); } } catch (err) { console.warn(err); } finally { b.disabled = false; }
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

  function formProducto(p, catInicial) {
    const nuevo = !p; p = p || { id: '', nombre: '', categoria_id: catInicial || (DB.categorias[0] || {}).id, precio: 10000, costo: 0, stock_inicial: 0, stock_min: 3, atributos: {}, activo: true, arisquez: 3 };
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
      <div class="tres">${nuevo ? '<div class="campo"><label for="p-stock">Existencias iniciales</label><input id="p-stock" type="number" min="0" value="0"></div>' : `<div class="campo"><label for="p-stock">Existencias</label><input id="p-stock" type="number" min="0" value="${stockDe(p.id)}"></div>`}
        <div class="campo"><label for="p-min">Avisar cuando queden</label><input id="p-min" type="number" min="0" value="${int(p.stock_min)}"></div>
        <div class="campo"><label for="p-prov">Proveedor</label><select id="p-prov"><option value="">—</option>${DB.proveedores.map((x) => `<option value="${x.id}"${x.id === p.proveedor_id ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></div></div>
      <div class="dos"><div class="campo"><label for="p-linea">Línea (opcional)</label><input id="p-linea" value="${esc(p.linea || '')}" placeholder="Gatos Orbitales"></div>
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
      if (!nuevo) {
        const antes = stockDe(id), ahora = Math.max(0, int(val(f, 'p-stock')));
        if (ahora !== antes) await guardar('ajustes_inventario', { id: nuevoId(), fecha: hoy(), producto_id: id, cantidad: ahora - antes, motivo: 'Conteo' });
      }
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
    'nueva-venta': () => hNuevo('ventas'), 'editar-venta': (b) => formVenta(porId('ventas', b.dataset.id)),
    'nueva-compra': () => hNuevo('compras'), 'editar-compra': (b) => formCompra(porId('compras', b.dataset.id)),
    'nuevo-producto': () => nuevoBorrador(), 'producto-en-cat': (b) => nuevoBorrador(b.dataset.id), 'editar-producto': (b) => formProducto(prod(b.dataset.id)),
    'g-crear': () => crearDesdeBorrador(), 'g-cancelar': () => { UI.borrador = null; render(); },
    async 'g-duplicar'(b) {
      const p = prod(b.dataset.id); const nombre = p.nombre + ' (copia)'; const id = idLibre(nombre);
      const c = Object.assign({}, p, { id, nombre, stock_inicial: 0 }); delete c.creado; delete c.numero;
      await guardar('productos', c); aviso('Copia creada con 0 existencias. Cámbiale el nombre.'); render();
      const n = $(`tr[data-pid="${id}"] .g-nombre`); if (n) { n.focus(); n.select(); n.scrollIntoView({ block: 'center' }); }
    },
    async 'g-eliminar'(b) {
      const p = prod(b.dataset.id);
      const usa = (l) => (l || []).some((x) => (x.items || []).some((i) => i.producto_id === p.id));
      if (usa(DB.ventas) || usa(DB.compras) || usa(DB.pedidos)) {
        if (!(await confirmar(`${p.nombre} tiene ventas, compras o pedidos registrados. Para no dañar tus cuentas no se borra: se oculta de la tienda. ¿Ocultarlo?`))) return;
        await guardar('productos', Object.assign({}, p, { activo: false })); aviso('Producto oculto de la tienda'); render(); return;
      }
      if (!(await confirmar(`¿Eliminar ${p.nombre}? No se puede deshacer.`))) return;
      for (const a of DB.ajustes_inventario.filter((x) => x.producto_id === p.id)) await borrar('ajustes_inventario', a.id);
      await borrar('productos', p.id); aviso('Producto eliminado'); render();
    },
    'nuevo-ajuste': () => formAjuste(), ajustar: (b) => formAjuste(b.dataset.id), categorias: () => irA('categorias'), 'nueva-categoria': () => hNuevo('categorias'), 'editar-categoria': (b) => formCategoria(porId('categorias', b.dataset.id)), 'cat-subir': (b) => moverCategoria(b.dataset.id, -1), 'cat-bajar': (b) => moverCategoria(b.dataset.id, 1),
    async 'pedido-pagado'(b) {
      const p = porId('pedidos', b.dataset.id);
      if (!(await confirmar(`¿Ya te llegaron ${money(p.total)} por Nequi con la referencia ${p.referencia}? Se registra la venta y baja el inventario.`))) return;
      let c = DB.clientes.find((x) => x.telefono && x.telefono.replace(/\D/g, '') === p.telefono.replace(/\D/g, ''));
      if (!c) c = await guardar('clientes', { id: nuevoId(), nombre: p.nombre, telefono: p.telefono, ciudad: p.ciudad, direccion: p.direccion });
      const emb = p.codigo ? DB.equipo.find((x) => x.codigo && x.codigo.toUpperCase() === String(p.codigo).toUpperCase()) : null;
      const items = (p.items || []).map((i) => { const pr = prod(i.producto_id); return { producto_id: i.producto_id, nombre: i.nombre, variante: i.variante || '', cant: int(i.cant), precio: int(i.precio), costo: pr ? int(pr.costo) : 0 }; });
      const v = await guardar('ventas', { id: nuevoId(), fecha: hoy(), canal: emb ? 'embajador' : 'web', cliente_id: c.id, vendedor_id: emb ? emb.id : null, items, descuento: int(p.descuento), envio: int(p.envio), metodo: 'Nequi', pago: 'pagado', entrega: 'por_despachar', anulada: false, nota: 'Pedido web ' + p.referencia });
      await guardar('pedidos', Object.assign({}, p, { estado: 'pagado', venta_id: v.id }));
      aviso(`Pago confirmado. Venta #${v.numero} registrada.`); render(); pintarContador();
    },
    async 'pedido-cancelar'(b) { const p = porId('pedidos', b.dataset.id); if (await confirmar(`¿Cancelar el pedido ${p.referencia}?`)) { await guardar('pedidos', Object.assign({}, p, { estado: 'cancelado' })); render(); pintarContador(); } },
    async 'msj-leido'(b) { const m = porId('mensajes', b.dataset.id); await guardar('mensajes', Object.assign({}, m, { leido: !m.leido })); render(); pintarContador(); },
    async 'msj-responder'(b) { const m = porId('mensajes', b.dataset.id); window.open(b.href, b.target || '_self'); await guardar('mensajes', Object.assign({}, m, { leido: true, respondido: true })); render(); pintarContador(); },
    'nuevo-cliente': () => hNuevo('clientes'), 'editar-cliente': (b) => formCliente(porId('clientes', b.dataset.id)),
    'nuevo-proveedor': () => hNuevo('proveedores'), 'editar-proveedor': (b) => formProveedor(porId('proveedores', b.dataset.id)),
    'nuevo-gasto': () => hNuevo('gastos'), 'editar-gasto': (b) => formGasto(porId('gastos', b.dataset.id)),
    'nueva-persona': () => hNuevo('equipo'), 'editar-persona': (b) => formPersona(porId('equipo', b.dataset.id)), 'pagar-persona': (b) => hNuevo('pagos', { persona_id: b.dataset.id, valor: Math.max(0, saldosEquipo()[b.dataset.id].saldo) }), 'nuevo-pago': () => hNuevo('pagos'),
    'h-crear': (b) => hCrear(b.dataset.hoja), 'h-cancelar': (b) => { UI.borr[b.dataset.hoja] = null; render(); },
    'h-duplicar': (b) => hDuplicar(b.dataset.hoja, b.dataset.id), 'h-eliminar': (b) => hEliminar(b.dataset.hoja, b.dataset.id),
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
    async salir() { try { if (sb) await sb.auth.signOut(); } catch (e) { /* igual salimos */ } ls.del('ga_panel_modo'); location.href = 'index.html'; },
  };

  function pintarContador() {
    const n = (DB && DB.mensajes || []).filter((m) => !m.leido).length;
    const b = document.querySelector('[data-cuenta-mensajes]'); if (b) { b.textContent = n; b.hidden = !n; }
    const np = (DB && DB.pedidos || []).filter((p) => p.estado === 'pendiente').length;
    const bp = document.querySelector('[data-cuenta-pedidos]'); if (bp) { bp.textContent = np; bp.hidden = !np; }
  }
  function irA(v) { if (!VISTAS[v]) v = 'resumen'; UI.vista = v; ls.set('ga_panel_vista', v); document.body.classList.remove('menu-abierto'); render(); window.scrollTo(0, 0); }

  // recordar en qué celda estabas para volver a ella después de guardar
  function focoActual() {
    const a = document.activeElement; if (!a || !a.closest || !a.closest('#vista')) return null;
    const tr = a.closest('tr'); const campo = a.dataset.c ? `[data-c="${a.dataset.c}"]` : a.dataset.g ? `[data-g="${a.dataset.g}"]` : null;
    if (!tr || !campo) return null;
    const fila = tr.hasAttribute('data-borrador') ? 'tr[data-borrador]' : tr.dataset.hid ? `tr[data-hid="${tr.dataset.hid}"]` : tr.dataset.pid ? `tr[data-pid="${tr.dataset.pid}"]` : null;
    const t = a.closest('[data-hoja]');
    return fila && { sel: `${t ? `[data-hoja="${t.dataset.hoja}"] ` : ''}${fila} ${campo}`, valor: a.type === 'checkbox' ? null : a.value, pos: a.selectionStart };
  }
  function volverFoco(f) {
    if (!f) return; const el = $(f.sel); if (!el) return;
    if (f.valor != null && el.value !== f.valor && el.tagName === 'INPUT') el.value = f.valor;
    el.focus({ preventScroll: true }); try { if (f.pos != null) el.setSelectionRange(f.pos, f.pos); } catch (e) { /* fecha o número */ }
  }
  // barra de desplazamiento también arriba de cada tabla ancha
  function rieles() {
    $$('#vista .grilla-caja').forEach((caja) => {
      let riel = caja.previousElementSibling;
      if (!riel || !riel.classList.contains('riel-scroll')) { riel = document.createElement('div'); riel.className = 'riel-scroll'; riel.innerHTML = '<div></div>'; caja.before(riel);
        riel.addEventListener('scroll', () => { if (caja.scrollLeft !== riel.scrollLeft) caja.scrollLeft = riel.scrollLeft; });
        caja.addEventListener('scroll', () => { if (riel.scrollLeft !== caja.scrollLeft) riel.scrollLeft = caja.scrollLeft; }); }
      riel.firstChild.style.width = caja.scrollWidth + 'px';
      riel.hidden = caja.scrollWidth <= caja.clientWidth + 2; riel.scrollLeft = caja.scrollLeft;
    });
  }
  window.addEventListener('resize', () => rieles());

  function render() {
    const V = VISTAS[UI.vista];
    $('#titulo').textContent = V.titulo; document.title = V.titulo + ' · Panel Gatoarisco';
    $$('.nav-panel [data-vista]').forEach((a) => a.setAttribute('aria-current', a.dataset.vista === UI.vista ? 'page' : 'false'));
    const btn = $('#accion-principal');
    if (V.boton) { btn.hidden = false; btn.dataset.accion = V.boton[0]; $('span', btn).textContent = V.boton[1]; } else btn.hidden = true;
    const pos = $$('#vista .grilla-caja').map((c) => [c.scrollLeft, c.scrollTop]);
    const foco = focoActual();
    $('#vista').innerHTML = V.html();
    $$('#vista .grilla-caja').forEach((c, i) => { if (pos[i]) { c.scrollLeft = pos[i][0]; c.scrollTop = pos[i][1]; } });
    rieles(); volverFoco(foco);
    // filtros que se escriben
    const enl = (id, grupo, k) => { const el = $('#' + id); if (!el) return; el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { UI.filtros[grupo][k] = el.value; const pos = el.selectionStart; render(); const n = $('#' + id); if (n && n.tagName === 'INPUT') { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }); };
    enl('f-q', 'ventas', 'q'); enl('f-estado', 'ventas', 'estado'); enl('f-canal', 'ventas', 'canal'); enl('f-inv', 'inv', 'q'); enl('f-cat', 'inv', 'cat'); enl('f-cli', 'cli', 'q'); enl('f-msj', 'msj', 'ver'); enl('f-ped', 'ped', 'ver');
    const fe = $('#form-empresa');
    if (fe) fe.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = fe;
      const emp = Object.assign({}, DB.empresa, { nombre: val(f, 'e-nombre'), nit: val(f, 'e-nit') || null, telefono: val(f, 'e-tel') || null, ciudad: val(f, 'e-ciudad') || null, correo: val(f, 'e-correo') || null, saldo_inicial: int(val(f, 'e-saldo')), tarifas: Object.fromEntries(Object.keys(NIVELES).map((k) => [k, int(val(f, 'e-t-' + k))])), pct_calle: Number(val(f, 'e-pc')) || 0, pct_fondo: Number(val(f, 'e-pf')) || 0, descuento_embajador: Number(val(f, 'e-de')) || 0 });
      try { estado('Guardando…', 'ocupado'); DB.empresa = await ST.guardarEmpresa(emp); estado('Guardado', 'ok'); aviso('Ajustes guardados'); render(); } catch (err) { estado('No se guardó', 'error'); aviso('No se pudo guardar: ' + err.message, 'error'); }
    });
    if (window.gatoMirar) gatoMirar();
    pintarContador();
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
