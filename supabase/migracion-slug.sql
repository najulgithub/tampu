-- ============================================================
-- Permite al dueño elegir su "dirección propia" (slug del portal):
-- tampu.ar/p/<slug>. Valida formato y unicidad.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

create or replace function cambiar_slug(p_slug text)
returns text language plpgsql security definer set search_path = public as $$
declare v_clean text;
begin
  -- Normaliza: minúsculas, solo letras/números/guiones.
  v_clean := lower(regexp_replace(trim(p_slug), '[^a-zA-Z0-9-]', '', 'g'));
  if length(v_clean) < 3 then
    raise exception 'La dirección debe tener al menos 3 caracteres (letras, números o guiones).';
  end if;
  if exists (select 1 from negocios where slug = v_clean and owner_id <> auth.uid()) then
    raise exception 'Esa dirección ya está en uso, probá otra.';
  end if;
  update negocios set slug = v_clean where owner_id = auth.uid();
  return v_clean;
end; $$;
grant execute on function cambiar_slug(text) to authenticated;
