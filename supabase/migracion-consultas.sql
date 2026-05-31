-- ============================================================
-- Consultas / sugerencias de los dueños hacia el desarrollador.
-- El dueño envía; el admin del sistema las lee en su panel.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-notificaciones.sql por es_admin_sistema())
-- ============================================================

create table if not exists consultas (
  id         text primary key default gen_random_uuid()::text,
  owner_id   uuid not null default auth.uid(),
  email      text default '',
  mensaje    text not null,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);
alter table consultas enable row level security;

-- Cualquier usuario logueado puede enviar su consulta.
drop policy if exists consultas_insert on consultas;
create policy consultas_insert on consultas for insert to authenticated with check (owner_id = auth.uid());

-- Solo el admin del sistema las lee/gestiona.
drop policy if exists consultas_admin_sel on consultas;
create policy consultas_admin_sel on consultas for select using (es_admin_sistema());
drop policy if exists consultas_admin_upd on consultas;
create policy consultas_admin_upd on consultas for update using (es_admin_sistema());
drop policy if exists consultas_admin_del on consultas;
create policy consultas_admin_del on consultas for delete using (es_admin_sistema());
