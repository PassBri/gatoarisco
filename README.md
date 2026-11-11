# Gatoarisco · Estilo con garra

Tienda web responsive de **Gatoarisco**: pines (línea Lostpin), stickers, parches, ropa y llaveros.
Funciona en celular y computador, y se puede instalar en el celular como app (PWA).

**Sitio publicado:** https://passbri.github.io/gatoarisco/

## Qué incluye

- Inicio con lanzamiento (drop) y cuenta regresiva, categorías, destacados, manifiesto arisco y embajadores.
- Tienda con filtros por categoría, búsqueda y orden por precio.
- Página de producto con variantes (acabado, talla), cantidad, existencias y productos relacionados.
- Carrito guardado en el navegador, código de embajador con descuento y envío gratis desde un monto.
- El pedido se envía por WhatsApp con el detalle completo (el pago en línea con Wompi llega en la siguiente fase).
- Página de Embajadores (3 niveles).
- Fundación Gatoarisco (Fondo de Protección Social): ya está construida pero **oculta**.
  Se muestra u oculta con un clic desde el panel.

## Panel de administración

Entra a `https://passbri.github.io/gatoarisco/panel.html` (no aparece en el menú).

1. La primera vez pega una llave de GitHub (token) con permiso **Contents: Read and write** solo sobre el
   repositorio `gatoarisco`. El panel explica cómo crearla. Queda guardada solo en ese navegador.
2. Toca el interruptor **Fundación Gatoarisco**. El panel guarda el cambio en `data/ajustes.json`
   y la página pública se actualiza en 1 o 2 minutos.

## Cómo editar

| Qué quieres cambiar | Archivo |
|---|---|
| WhatsApp, correo, envío gratis, descuento de embajador, fecha del drop | `assets/js/config.js` |
| Productos, precios, existencias, variantes, categorías | `data/productos.json` |
| Mostrar u ocultar la fundación (o desde el panel) | `data/ajustes.json` |
| Imágenes de productos | `assets/img/productos/` (mismo nombre que el `id` del producto) |
| Logos e íconos | `assets/img/marca/` |
| Colores y estilos | `assets/css/styles.css` |

> Los precios, existencias y el número de WhatsApp son de ejemplo: cámbialos antes de vender.

Para agregar un producto, copia un bloque en `data/productos.json`, cambia el `id`
y sube su imagen como `assets/img/productos/<id>.svg`.

El enlace de un embajador se arma así: `https://passbri.github.io/gatoarisco/?ref=CODIGO`.

## Publicar con GitHub Pages

1. En el repositorio entra a **Settings → Pages**.
2. En **Source** elige **Deploy from a branch**.
3. Rama **main** y carpeta **/ (root)** → **Save**.
4. En uno o dos minutos el sitio queda en `https://passbri.github.io/gatoarisco/`.

Cada cambio que subas a `main` se publica solo.

## Probar en tu computador

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

Es un sitio estático (HTML, CSS y JavaScript) sin instalaciones ni compilación.
