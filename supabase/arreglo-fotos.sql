-- =====================================================================
-- Gatoarisco · arreglo para subir fotos de productos desde el panel
-- Pégalo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- =====================================================================
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
  on conflict (id) do update set public = true;

drop policy if exists "fotos_admin_leer" on storage.objects;
create policy "fotos_admin_leer" on storage.objects for select to authenticated using (bucket_id = 'productos');

drop policy if exists "fotos_admin_subir" on storage.objects;
create policy "fotos_admin_subir" on storage.objects for insert to authenticated with check (bucket_id = 'productos' and public.es_admin());
drop policy if exists "fotos_admin_cambiar" on storage.objects;
create policy "fotos_admin_cambiar" on storage.objects for update to authenticated using (bucket_id = 'productos' and public.es_admin());
drop policy if exists "fotos_admin_borrar" on storage.objects;
create policy "fotos_admin_borrar" on storage.objects for delete to authenticated using (bucket_id = 'productos' and public.es_admin());
