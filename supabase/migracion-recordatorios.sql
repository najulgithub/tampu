-- ============================================================
-- Recordatorios de vencimiento + notificaciones en tiempo real.
-- - 'clave' para no duplicar recordatorios generados por el cron.
-- - Habilita Realtime en notificaciones y mensajes (campanita/chat en vivo).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

-- Dedup de recordatorios: una notificación por (owner, clave).
alter table notificaciones add column if not exists clave text;
create unique index if not exists uniq_notif_clave on notificaciones (owner_id, clave);

-- Realtime (idempotente: ignora si ya están en la publicación).
do $$ begin alter publication supabase_realtime add table notificaciones; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table mensajes; exception when others then null; end $$;
