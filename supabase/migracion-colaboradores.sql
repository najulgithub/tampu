-- ============================================================
-- Colaboradores reales: entran por email, ven los datos del dueno,
-- y el dueno configura que modulos pueden EDITAR (permisos por modulo).
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-servicios.sql por mi_email())
--
-- Modelo:
--   mi_owner()       -> owner_id sobre el que trabaja el usuario (dueno = el mismo;
--                       colaborador = su dueno; si no, el propio uid).
--   puede_editar(m)  -> true si es dueno, o si el colaborador tiene el modulo en permisos.
--   RLS: SELECT por owner_id = mi_owner() (ve todo lo del negocio).
--        WRITE por owner_id = mi_owner() AND puede_editar(modulo).
-- ============================================================

alter table colaboradores add column if not exists permisos jsonb not null default '[]'::jsonb;

create or replace function mi_owner()
returns uuid language sql security definer stable set search_path = public, auth as $$
  select case
    when exists (select 1 from negocios where owner_id = auth.uid()) then auth.uid()
    else coalesce(
      (select c.owner_id from colaboradores c where lower(c.email) = lower(mi_email()) limit 1),
      auth.uid()
    )
  end;
$$;

create or replace function puede_editar(p_modulo text)
returns boolean language sql security definer stable set search_path = public, auth as $$
  select case
    when exists (select 1 from negocios where owner_id = auth.uid()) then true
    else exists (
      select 1 from colaboradores c
      where lower(c.email) = lower(mi_email()) and c.permisos ? p_modulo
    )
  end;
$$;

-- Contexto para rutear en la app: dueno | colaborador | cliente (o ninguno = nuevo).
create or replace function mi_contexto()
returns table (rol text, owner_id uuid, permisos jsonb)
language sql security definer set search_path = public, auth as $$
  select rol, owner_id, permisos from (
    select 1 as pri, 'dueno'::text rol, auth.uid() owner_id, '["all"]'::jsonb permisos
      where exists (select 1 from negocios where owner_id = auth.uid())
    union all
    select 2, 'colaborador', c.owner_id, c.permisos from colaboradores c
      where lower(c.email) = lower(mi_email())
    union all
    select 3, 'cliente', p.dueno_id, '[]'::jsonb from perfiles p
      where p.id = auth.uid() and p.tipo = 'cliente'
  ) t order by pri limit 1;
$$;

grant execute on function mi_owner() to authenticated;
grant execute on function puede_editar(text) to authenticated;
grant execute on function mi_contexto() to authenticated;

-- ============================================================
-- Reescritura de RLS: cada tabla del negocio pasa a mi_owner()/puede_editar().
-- ============================================================
do $$
declare
  pares text[] := array[
    'grupos:unidades','unidades:unidades',
    'reservas:reservas','pagos:reservas','comprobantes_servicio:reservas','mensajes:reservas',
    'gastos:gastos','gastos_programados:gastos','proveedores:gastos','presupuestos:gastos','medios_pago:gastos',
    'configuracion:config',
    'colaboradores:equipo'
  ];
  item text; t text; m text; pol record;
begin
  foreach item in array pares loop
    t := split_part(item, ':', 1);
    m := split_part(item, ':', 2);
    -- borrar políticas existentes de la tabla
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %1$s_sel on public.%1$I for select using (owner_id = mi_owner())', t);
    execute format('create policy %1$s_ins on public.%1$I for insert with check (owner_id = mi_owner() and puede_editar(%L))', t, m);
    execute format('create policy %1$s_upd on public.%1$I for update using (owner_id = mi_owner() and puede_editar(%L)) with check (owner_id = mi_owner() and puede_editar(%L))', t, m, m);
    execute format('create policy %1$s_del on public.%1$I for delete using (owner_id = mi_owner() and puede_editar(%L))', t, m);
    -- el owner_id por defecto pasa a ser el del negocio (sirve para el colaborador)
    execute format('alter table public.%I alter column owner_id set default mi_owner()', t);
  end loop;
end $$;

-- El inquilino (cliente) sigue viendo SUS reservas (portal). Se recrea esa policy.
drop policy if exists reservas_cliente_sel on reservas;
create policy reservas_cliente_sel on reservas for select using (cliente_id = auth.uid());
