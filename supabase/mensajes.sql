-- =====================================================================
-- Gatoarisco · mensajes de contacto
-- Pégalo en Supabase → SQL Editor → Run (una sola vez).
-- Cualquier visitante puede ENVIAR un mensaje desde la página,
-- pero solo los administradores pueden LEERLOS desde el panel.
-- =====================================================================
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
