-- ============================================================
-- Panel de admin: listado de dueños registrados con su estado de
-- suscripción y métricas. Solo accesible para admins del sistema.
-- Correr en: Supabase -> SQL Editor.
-- (Requiere migracion-notificaciones.sql por es_admin_sistema()
--  y migracion-suscripciones.sql por la tabla suscripciones)
-- ============================================================

-- Devuelve una fila por negocio/dueño. Si quien llama NO es admin,
-- la cláusula es_admin_sistema() del WHERE hace que devuelva 0 filas.
-- SECURITY DEFINER permite leer auth.users y saltear el RLS por-negocio.
create or replace function admin_usuarios()
returns table (
  owner_id      uuid,
  email         text,
  nombre        text,
  creado        timestamptz,
  estado        text,
  trial_fin     timestamptz,
  periodo_fin   timestamptz,
  precio        numeric,
  unidades      bigint,
  reservas      bigint,
  colaboradores bigint
)
language sql security definer stable set search_path = public as $$
  select
    n.owner_id,
    u.email::text,
    n.nombre,
    n.created_at,
    coalesce(s.estado, 'sin'),
    s.trial_fin,
    s.periodo_fin,
    s.precio,
    (select count(*) from unidades      un where un.owner_id = n.owner_id),
    (select count(*) from reservas      r  where r.owner_id  = n.owner_id),
    (select count(*) from colaboradores c  where c.owner_id  = n.owner_id)
  from negocios n
  join auth.users u on u.id = n.owner_id
  left join suscripciones s on s.owner_id = n.owner_id
  where es_admin_sistema()
    -- No contar cuentas de admin/dev como dueños del negocio.
    and not exists (select 1 from admins_sistema a where a.user_id = n.owner_id)
    and lower(u.email) not in ('israbas@gmail.com', 'israelbastarrica@marketarg.com')
  order by n.created_at desc;
$$;
grant execute on function admin_usuarios() to authenticated;
