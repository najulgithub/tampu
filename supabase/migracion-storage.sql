-- ============================================================
-- Supabase Storage: buckets para fotos y comprobantes.
-- Saca los archivos de la base (hoy van como data URL en texto).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', true) on conflict (id) do nothing;

-- Subir: cualquier usuario autenticado (dueño, colaborador o inquilino del portal).
drop policy if exists "tampu subir archivos" on storage.objects;
create policy "tampu subir archivos" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('fotos', 'comprobantes'));

-- Leer: los buckets son públicos (URL pública directa). Política explícita por las dudas.
drop policy if exists "tampu leer archivos" on storage.objects;
create policy "tampu leer archivos" on storage.objects
  for select
  using (bucket_id in ('fotos', 'comprobantes'));
