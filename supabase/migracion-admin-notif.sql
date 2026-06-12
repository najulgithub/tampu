-- ============================================================
-- Notificaciones de plataforma para el/los admin(s): nuevo dueño, pagos, etc.
-- Reusa la tabla notificaciones (te llega a la campanita + push).
-- Correr en: Supabase -> SQL Editor.
-- (Requiere migracion-recordatorios.sql por el índice único (owner_id, clave))
-- ============================================================

-- Inserta una notificación para CADA admin del sistema (dedup por clave).
create or replace function notificar_admins(p_titulo text, p_cuerpo text, p_clave text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notificaciones (owner_id, para, tipo, titulo, cuerpo, clave)
  select a.user_id, 'dueno', 'info', p_titulo, p_cuerpo, p_clave
  from admins_sistema a
  on conflict (owner_id, clave) do nothing;
end; $$;
grant execute on function notificar_admins(text, text, text) to authenticated, service_role;

-- Al crear un negocio (nuevo dueño) -> avisar a los admins.
create or replace function trg_notif_admin_negocio() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id = new.owner_id;
  perform notificar_admins(
    'Nuevo dueño registrado',
    coalesce(v_email, '(sin email)') || ' creó su cuenta en tampu.',
    'negocio|' || new.owner_id
  );
  return new;
end; $$;
drop trigger if exists t_notif_admin_negocio on negocios;
create trigger t_notif_admin_negocio after insert on negocios for each row execute function trg_notif_admin_negocio();
