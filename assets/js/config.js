// Configuración de la tienda. Cambia estos valores sin tocar el resto del código.
window.GATOARISCO = {
  // Número de WhatsApp que recibe los pedidos: código de país + número, sin espacios ni "+".
  whatsapp: '573000000000',
  correo: 'hola@gatoarisco.co',
  instagram: 'https://instagram.com/',
  // Envío gratis desde este valor (pesos colombianos).
  envioGratisDesde: 60000,
  // Valor del envío cuando el pedido no llega al envío gratis (valor de ejemplo: cámbialo).
  envioValor: 10000,
  // Pago con Nequi: número que recibe los pagos, nombre del titular como aparece en Nequi
  // y, si quieres, la imagen de tu QR de Nequi Negocios (súbela a assets/img/pago/nequi-qr.png).
  nequi: '3000000000',
  nequiTitular: 'Gatoarisco',
  nequiQR: '',
  // Descuento para quien compra con el código de un embajador (porcentaje).
  descuentoEmbajador: 10,
  // Fecha y hora en que se abre el próximo lanzamiento (drop), hora de Colombia.
  dropAbre: '2026-11-28T18:00:00-05:00',
  dropNombre: 'Gatos Orbitales',
  // Supabase (panel de control y existencias en tiempo real). Están en Supabase → Project Settings → API.
  // La "anon key" es pública por diseño: la seguridad la ponen las reglas del archivo supabase/esquema.sql.
  supabaseUrl: 'https://mgkdxwxhvzsbedotihgc.supabase.co',
  supabaseAnonKey: 'sb_publishable_4KkRbm4paiICAGzERIzahA_4_qg75Gy',
};
// Acepta la URL aunque se pegue con /rest/v1/ al final.
window.GATOARISCO.supabaseUrl = (window.GATOARISCO.supabaseUrl || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
