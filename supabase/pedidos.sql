-- =====================================================================
-- Gatoarisco · pedidos de la tienda en línea (pago con Nequi)
-- Pégalo en Supabase → SQL Editor → Run (una sola vez).
-- La tienda guarda cada pedido como "pendiente"; tú confirmas el pago desde el panel.
-- Los visitantes pueden crear pedidos, pero no pueden ver ni cambiar ninguno.
-- =====================================================================
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
