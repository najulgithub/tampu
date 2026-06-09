-- ============================================================
-- Notificaciones push: dispositivos suscriptos por usuario.
-- Correr en: Supabase -> SQL Editor.
-- Cada usuario gestiona SOLO sus propias suscripciones (RLS).
-- El envío lo hace el endpoint /api/push/send con service role.
-- ============================================================

create table if not exists push_subscriptions (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;

drop policy if exists push_sel on push_subscriptions;
create policy push_sel on push_subscriptions for select using (user_id = auth.uid());
drop policy if exists push_ins on push_subscriptions;
create policy push_ins on push_subscriptions for insert with check (user_id = auth.uid());
drop policy if exists push_upd on push_subscriptions;
create policy push_upd on push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_del on push_subscriptions;
create policy push_del on push_subscriptions for delete using (user_id = auth.uid());

create index if not exists idx_push_user on push_subscriptions (user_id);
