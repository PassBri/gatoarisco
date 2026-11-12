# Conectar Gatoarisco con Supabase

Supabase guarda los datos del panel de control (ventas, compras, inventario, clientes,
proveedores, equipo, gastos) y le entrega a la tienda los productos y las existencias
en tiempo real. Se hace una sola vez y toma unos 15 minutos.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) e inicia sesión (puede ser con GitHub).
2. **New project**: nombre `gatoarisco`, región **South America (São Paulo)**.
3. Guarda la contraseña de la base de datos en un lugar seguro.

## 2. Crear las tablas

1. En el menú izquierdo: **SQL Editor → New query**.
2. Copia todo el archivo [`esquema.sql`](esquema.sql), pégalo y toca **Run**.
3. Abre otra consulta, pega [`datos-iniciales.sql`](datos-iniciales.sql) y toca **Run**.
   Esto carga las categorías y los 13 productos de la tienda.

## 3. Crear tu usuario

1. **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña. Marca **Auto Confirm User**.

## 4. Volverte administrador

En **SQL Editor**, ejecuta esto cambiando el correo por el tuyo:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'TU_CORREO_AQUI';
```

Solo los usuarios de la tabla `admins` pueden ver y cambiar los datos.

## 5. Cerrar el registro

**Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**,
para que nadie más pueda crear cuentas.

## 6. Conectar la página

En **Project Settings → API Keys** copia:

- **Project URL** (algo como `https://abcd1234.supabase.co`)
- **Publishable key** o **anon public key**

Pégalos en `assets/js/config.js`:

```js
supabaseUrl: 'https://abcd1234.supabase.co',
supabaseAnonKey: 'la-clave-publica',
```

Esa clave es pública por diseño: la seguridad la ponen las reglas de `esquema.sql`
(los visitantes solo pueden leer el catálogo, sin costos ni proveedores).
**Nunca** pegues aquí la clave `service_role` o `secret`.

## 7. Bandeja de mensajes

Para que el formulario de contacto del inicio guarde los mensajes, en **SQL Editor** pega
[`mensajes.sql`](mensajes.sql) y toca **Run**. Los mensajes aparecen en el panel, en **Mensajes**.
(Si creaste las tablas después de este cambio, `esquema.sql` ya la incluye.)

Listo: entra a `https://passbri.github.io/gatoarisco/panel.html` con tu correo y contraseña.
