-- ============================================================
-- Notificaciones de eventos (por triggers) + avisos del sistema.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-colaboradores.sql)
--
-- IMPORTANTE: al final, reemplazá TU-USER-ID-AQUI por tu UID para ser
-- el admin del sistema (Authentication -> Users -> tu email -> User UID).
-- ============================================================

create table if not exists notificaciones (
  id         text primary key default gen_random_uuid()::text,
  owner_id   uuid not null,
  para       text not null default 'dueno',   -- 'dueno' | 'inquilino'
  reserva_id text,
  tipo       text not null default 'info',     -- reserva | pago | servicio | mensaje | info
  titulo     text not null,
  cuerpo     text default '',
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notificaciones enable row level security;
drop policy if exists notif_dueno_sel on notificaciones;
create policy notif_dueno_sel on notificaciones for select using (owner_id = mi_owner() and para = 'dueno');
drop policy if exists notif_dueno_upd on notificaciones;
create policy notif_dueno_upd on notificaciones for update using (owner_id = mi_owner() and para = 'dueno') with check (owner_id = mi_owner());
drop policy if exists notif_dueno_ins on notificaciones;
create policy notif_dueno_ins on notificaciones for insert with check (owner_id = mi_owner());

create index if not exists idx_notif_owner on notificaciones (owner_id, para);
create index if not exists idx_notif_reserva on notificaciones (reserva_id);

-- ---------- Triggers que generan las notificaciones ----------
create or replace function trg_notif_reserva() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null then
    insert into notificaciones (owner_id, para, reserva_id, tipo, titulo, cuerpo)
    values (new.owner_id, 'dueno', new.id, 'reserva', 'Nueva reserva', coalesce(new.huesped, 'Un cliente') || ' reservó desde el portal.');
  end if;
  return new;
end; $$;
drop trigger if exists t_notif_reserva on reservas;
create trigger t_notif_reserva after insert on reservas for each row execute function trg_notif_reserva();

-- Aprobación: la reserva del portal pasa a confirmada -> avisar al inquilino.
create or replace function trg_notif_aprob() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null and new.estado = 'confirmada' and old.estado is distinct from 'confirmada' then
    insert into notificaciones (owner_id, para, reserva_id, tipo, titulo, cuerpo)
    values (new.owner_id, 'inquilino', new.id, 'reserva', 'Reserva confirmada', 'El propietario confirmó tu reserva.');
  end if;
  return new;
end; $$;
drop trigger if exists t_notif_aprob on reservas;
create trigger t_notif_aprob after update on reservas for each row execute function trg_notif_aprob();

create or replace function trg_notif_pago() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.nota ilike '%portal%' or new.nota ilike '%inquilino%' then
    insert into notificaciones (owner_id, para, reserva_id, tipo, titulo, cuerpo)
    values (new.owner_id, 'dueno', new.reserva_id, 'pago', 'Pago / comprobante recibido', new.nota);
  end if;
  return new;
end; $$;
drop trigger if exists t_notif_pago on pagos;
create trigger t_notif_pago after insert on pagos for each row execute function trg_notif_pago();

create or replace function trg_notif_servicio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notificaciones (owner_id, para, reserva_id, tipo, titulo, cuerpo)
  values (new.owner_id, 'dueno', new.reserva_id, 'servicio', 'Comprobante de servicio', new.servicio || ' · ' || new.periodo);
  return new;
end; $$;
drop trigger if exists t_notif_servicio on comprobantes_servicio;
create trigger t_notif_servicio after insert on comprobantes_servicio for each row execute function trg_notif_servicio();

create or replace function trg_notif_mensaje() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notificaciones (owner_id, para, reserva_id, tipo, titulo, cuerpo)
  values (new.owner_id, case when new.autor = 'inquilino' then 'dueno' else 'inquilino' end, new.reserva_id, 'mensaje', 'Nuevo mensaje', left(new.texto, 80));
  return new;
end; $$;
drop trigger if exists t_notif_mensaje on mensajes;
create trigger t_notif_mensaje after insert on mensajes for each row execute function trg_notif_mensaje();

-- ---------- RPCs del portal (inquilino) ----------
create or replace function portal_notificaciones()
returns table (id text, tipo text, titulo text, cuerpo text, leida boolean, created_at timestamptz)
language sql security definer set search_path = public as $$
  select n.id, n.tipo, n.titulo, n.cuerpo, n.leida, n.created_at
  from notificaciones n
  where n.para = 'inquilino' and n.reserva_id is not null and contrato_owner(n.reserva_id) is not null
  order by n.created_at desc;
$$;

create or replace function portal_notif_leidas()
returns void language plpgsql security definer set search_path = public as $$
begin
  update notificaciones n set leida = true
  where n.para = 'inquilino' and not n.leida and n.reserva_id is not null and contrato_owner(n.reserva_id) is not null;
end; $$;

grant execute on function portal_notificaciones() to authenticated;
grant execute on function portal_notif_leidas() to authenticated;

-- ============================================================
-- AVISOS DEL SISTEMA (los publica el admin de la plataforma)
-- ============================================================
create table if not exists admins_sistema (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table admins_sistema enable row level security;
drop policy if exists admins_self on admins_sistema;
create policy admins_self on admins_sistema for select using (user_id = auth.uid());

create or replace function es_admin_sistema()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from admins_sistema where user_id = auth.uid());
$$;
grant execute on function es_admin_sistema() to authenticated;

create table if not exists avisos_sistema (
  id         text primary key default gen_random_uuid()::text,
  tipo       text not null default 'novedad',  -- novedad | mantenimiento | info
  titulo     text not null,
  cuerpo     text default '',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table avisos_sistema enable row level security;
drop policy if exists avisos_sel on avisos_sistema;
create policy avisos_sel on avisos_sistema for select using (auth.role() = 'authenticated');
drop policy if exists avisos_admin_ins on avisos_sistema;
create policy avisos_admin_ins on avisos_sistema for insert with check (es_admin_sistema());
drop policy if exists avisos_admin_upd on avisos_sistema;
create policy avisos_admin_upd on avisos_sistema for update using (es_admin_sistema());
drop policy if exists avisos_admin_del on avisos_sistema;
create policy avisos_admin_del on avisos_sistema for delete using (es_admin_sistema());

-- Registrate como admin del sistema. Reemplazá el email por el tuyo
-- (el que usás para entrar a la app) y se resuelve solo el UID:
insert into admins_sistema (user_id)
select id from auth.users where lower(email) = lower('tu-email@aca.com')
on conflict do nothing;
