-- ============================================================
-- Permite al admin del sistema activar/extender o suspender la
-- suscripción de un dueño manualmente (plan Empresas, cortesías, etc.).
-- Correr en: Supabase -> SQL Editor.
-- (Requiere migracion-suscripciones.sql y migracion-notificaciones.sql)
-- ============================================================

create or replace function admin_set_suscripcion(p_owner uuid, p_estado text, p_dias int default 30)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_admin_sistema() then
    raise exception 'no autorizado';
  end if;
  if p_estado not in ('activa', 'vencida') then
    raise exception 'estado inválido: %', p_estado;
  end if;

  insert into suscripciones (owner_id, estado, trial_fin, periodo_fin, updated_at)
  values (
    p_owner,
    p_estado,
    now(),
    case when p_estado = 'activa' then now() + (p_dias || ' days')::interval else now() end,
    now()
  )
  on conflict (owner_id) do update
    set estado      = excluded.estado,
        periodo_fin = excluded.periodo_fin,
        updated_at  = now();
end; $$;
grant execute on function admin_set_suscripcion(uuid, text, int) to authenticated;
