-- ============================================================
-- Proveedores + presupuestos + rating de trabajos.
-- El inquilino ve los contactos marcados como visibles.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-multitenant.sql)
-- ============================================================

create table if not exists proveedores (
  id                text primary key,
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre            text not null,
  rubro             text default '',
  telefono          text default '',
  email             text default '',
  notas             text default '',
  visible_inquilino boolean not null default true,
  created_at        timestamptz not null default now()
);
alter table proveedores enable row level security;
drop policy if exists proveedores_all on proveedores;
create policy proveedores_all on proveedores for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists presupuestos (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  proveedor_id text,
  ambito      text default 'unidad',
  ref_id      text default '',
  descripcion text default '',
  monto       numeric not null default 0,
  fecha       date not null default current_date,
  estado      text not null default 'pendiente',
  comprobante text,
  nota        text default '',
  created_at  timestamptz not null default now()
);
alter table presupuestos enable row level security;
drop policy if exists presupuestos_all on presupuestos;
create policy presupuestos_all on presupuestos for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Vinculo de gastos con proveedor/presupuesto + puntuacion del trabajo.
alter table gastos add column if not exists proveedor_id text;
alter table gastos add column if not exists presupuesto_id text;
alter table gastos add column if not exists rating int;
alter table gastos add column if not exists rating_nota text;

-- Portal: contactos de proveedores visibles para el inquilino.
create or replace function portal_proveedores()
returns table (nombre text, rubro text, telefono text, email text)
language sql security definer set search_path = public as $$
  select p.nombre, p.rubro, p.telefono, p.email
  from proveedores p
  where p.visible_inquilino = true
    and p.owner_id = (select dueno_id from perfiles where id = auth.uid())
  order by p.rubro, p.nombre;
$$;
grant execute on function portal_proveedores() to authenticated;
