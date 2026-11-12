-- =====================================================================
-- Gatoarisco · base de datos del panel de control (Supabase / Postgres)
-- Pega todo este archivo en Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar varias veces sin dañar datos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- quién administra ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  creado timestamptz not null default now()
);

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- empresa (una sola fila) ----------
create table if not exists public.empresa (
  id int primary key default 1 check (id = 1),
  nombre text not null default 'Gatoarisco',
  nit text, telefono text, ciudad text, correo text,
  saldo_inicial integer not null default 0,
  tarifas jsonb not null default '{"explorador": 2000, "navegante": 2500, "comandante": 3000}',
  pct_calle numeric not null default 50,
  pct_fondo numeric not null default 20,
  descuento_embajador numeric not null default 10
);
insert into public.empresa (id) values (1) on conflict (id) do nothing;

-- ---------- catálogo ----------
create table if not exists public.categorias (
  id text primary key,
  nombre text not null,
  detalle text,
  imagen text,
  orden int not null default 0
);

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text, telefono text, ciudad text,
  tipo text not null default 'fabricante',
  nota text,
  creado timestamptz not null default now()
);

create table if not exists public.productos (
  id text primary key,
  nombre text not null,
  categoria_id text references public.categorias (id) on update cascade,
  linea text,
  precio integer not null default 0,
  precio_antes integer,
  costo integer not null default 0,
  stock_inicial integer not null default 0,
  stock_min integer not null default 3,
  proveedor_id uuid references public.proveedores (id) on delete set null,
  descripcion text,
  atributos jsonb not null default '{}',
  variantes jsonb,
  destacado boolean not null default false,
  nuevo boolean not null default false,
  limitado text,
  preventa text,
  arisquez int check (arisquez between 1 and 5),
  humor text,
  imagen text,
  activo boolean not null default true,
  creado timestamptz not null default now()
);

-- ---------- personas ----------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text, ciudad text, direccion text, correo text, nota text,
  creado timestamptz not null default now()
);

create table if not exists public.equipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('embajador', 'calle')),
  nivel text check (nivel in ('explorador', 'navegante', 'comandante')),
  codigo text unique,
  telefono text,
  activo boolean not null default true,
  creado timestamptz not null default now()
);

-- ---------- movimientos ----------
-- items: [{ "producto_id": "...", "nombre": "...", "variante": "...", "cant": 1, "precio": 10000, "costo": 2500 }]
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  fecha date not null default current_date,
  canal text not null default 'whatsapp',
  cliente_id uuid references public.clientes (id) on delete set null,
  vendedor_id uuid references public.equipo (id) on delete set null,
  items jsonb not null default '[]',
  descuento integer not null default 0,
  envio integer not null default 0,
  metodo text,
  pago text not null default 'pendiente' check (pago in ('pendiente', 'pagado')),
  entrega text not null default 'por_despachar' check (entrega in ('por_despachar', 'enviado', 'entregado', 'en_mano')),
  anulada boolean not null default false,
  nota text,
  creado timestamptz not null default now()
);

-- items: [{ "producto_id": "...", "nombre": "...", "cant": 10, "costo": 2500 }]
create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  fecha date not null default current_date,
  proveedor_id uuid references public.proveedores (id) on delete set null,
  items jsonb not null default '[]',
  flete integer not null default 0,
  pago text not null default 'pagado' check (pago in ('pendiente', 'pagado')),
  metodo text,
  nota text,
  creado timestamptz not null default now()
);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  categoria text not null default 'Otros',
  descripcion text,
  valor integer not null default 0,
  metodo text,
  creado timestamptz not null default now()
);

create table if not exists public.ajustes_inventario (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  producto_id text not null references public.productos (id) on delete cascade on update cascade,
  cantidad integer not null,
  motivo text,
  creado timestamptz not null default now()
);

create table if not exists public.pagos_equipo (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  persona_id uuid not null references public.equipo (id) on delete cascade,
  valor integer not null,
  metodo text,
  nota text,
  creado timestamptz not null default now()
);

-- ---------- interruptores públicos de la tienda ----------
create table if not exists public.ajustes_publicos (
  clave text primary key,
  valor jsonb not null
);
insert into public.ajustes_publicos (clave, valor) values ('fundacion', 'false') on conflict (clave) do nothing;

-- ---------- seguridad: solo administradores ven y cambian datos ----------
do $$
declare t text;
begin
  foreach t in array array['admins','empresa','categorias','proveedores','productos','clientes','equipo',
                           'ventas','compras','gastos','ajustes_inventario','pagos_equipo','ajustes_publicos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin_todo" on public.%I', t);
    execute format('create policy "admin_todo" on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t);
  end loop;
end $$;

-- lectura pública solo de lo que la tienda necesita
drop policy if exists "lectura_publica" on public.categorias;
create policy "lectura_publica" on public.categorias for select to anon, authenticated using (true);
drop policy if exists "lectura_publica" on public.ajustes_publicos;
create policy "lectura_publica" on public.ajustes_publicos for select to anon, authenticated using (true);

-- ---------- catálogo público con existencias en tiempo real ----------
-- La tienda lee esta vista. No muestra costos ni proveedores.
create or replace view public.catalogo as
select
  p.id, p.nombre, p.categoria_id as categoria, p.linea, p.precio,
  p.precio_antes as "precioAntes",
  greatest(0,
    p.stock_inicial
    + coalesce((select sum((i->>'cant')::int) from public.compras c, jsonb_array_elements(c.items) i where i->>'producto_id' = p.id), 0)
    + coalesce((select sum(a.cantidad) from public.ajustes_inventario a where a.producto_id = p.id), 0)
    - coalesce((select sum((i->>'cant')::int) from public.ventas v, jsonb_array_elements(v.items) i where not v.anulada and i->>'producto_id' = p.id), 0)
  )::int as stock,
  p.destacado, p.nuevo, p.limitado, p.preventa, p.descripcion, p.atributos, p.variantes,
  p.arisquez, p.humor, p.imagen
from public.productos p
where p.activo;

revoke all on public.catalogo from anon, authenticated;
grant select on public.catalogo to anon, authenticated;

-- ---------- fotos de productos (almacenamiento público de solo lectura) ----------
insert into storage.buckets (id, name, public) values ('productos', 'productos', true) on conflict (id) do nothing;
drop policy if exists "fotos_admin_subir" on storage.objects;
create policy "fotos_admin_subir" on storage.objects for insert to authenticated with check (bucket_id = 'productos' and public.es_admin());
drop policy if exists "fotos_admin_cambiar" on storage.objects;
create policy "fotos_admin_cambiar" on storage.objects for update to authenticated using (bucket_id = 'productos' and public.es_admin());
drop policy if exists "fotos_admin_borrar" on storage.objects;
create policy "fotos_admin_borrar" on storage.objects for delete to authenticated using (bucket_id = 'productos' and public.es_admin());

-- ---------- mensajes de contacto (también está en mensajes.sql) ----------
create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  contacto text not null check (char_length(contacto) between 5 and 120),
  tipo text not null default 'Pregunta' check (tipo in ('Pregunta', 'Pedido', 'Mayoristas', 'Embajadores', 'Otro')),
  mensaje text not null check (char_length(mensaje) between 5 and 2000),
  leido boolean not null default false,
  respondido boolean not null default false
);
alter table public.mensajes enable row level security;
drop policy if exists "admin_todo" on public.mensajes;
create policy "admin_todo" on public.mensajes for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "enviar_publico" on public.mensajes;
create policy "enviar_publico" on public.mensajes for insert to anon, authenticated
  with check (leido = false and respondido = false);
grant insert on public.mensajes to anon;

-- ---------- pedidos de la tienda en línea (también está en pedidos.sql) ----------
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  referencia text not null unique check (referencia ~ '^GA-[A-Z0-9]{5}$'),
  nombre text not null check (char_length(nombre) between 2 and 80),
  telefono text not null check (char_length(telefono) between 7 and 20),
  ciudad text not null check (char_length(ciudad) between 2 and 60),
  direccion text not null check (char_length(direccion) between 4 and 160),
  nota text check (nota is null or char_length(nota) <= 500),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  subtotal integer not null check (subtotal >= 0),
  descuento integer not null default 0 check (descuento >= 0),
  envio integer not null default 0 check (envio >= 0),
  total integer not null check (total >= 0),
  codigo text check (codigo is null or char_length(codigo) <= 24),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'cancelado')),
  venta_id uuid references public.ventas (id) on delete set null
);
alter table public.pedidos enable row level security;
drop policy if exists "admin_todo" on public.pedidos;
create policy "admin_todo" on public.pedidos for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "crear_publico" on public.pedidos;
create policy "crear_publico" on public.pedidos for insert to anon, authenticated
  with check (estado = 'pendiente' and venta_id is null);
grant insert on public.pedidos to anon;
