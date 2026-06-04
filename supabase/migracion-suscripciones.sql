-- ============================================================
-- Suscripciones: prueba gratis de 30 días y luego pago (Mercado Pago).
-- Una por dueño/negocio. Correr en: Supabase -> SQL Editor.
-- (Requiere migracion-colaboradores.sql por mi_owner())
-- ============================================================

create table if not exists suscripciones (
  owner_id          uuid primary key references auth.users (id) on delete cascade,
  estado            text not null default 'trial',   -- trial | activa | vencida | cancelada
  trial_fin         timestamptz not null default now() + interval '30 days',
  periodo_fin       timestamptz,
  mp_preapproval_id text,
  updated_at        timestamptz not null default now()
);
alter table suscripciones enable row level security;

-- El dueño y sus colaboradores ven el estado del negocio.
drop policy if exists susc_sel on suscripciones;
create policy susc_sel on suscripciones for select using (owner_id = mi_owner());
-- Solo el dueño puede tocar su fila desde la app (el webhook usa service role y saltea RLS).
drop policy if exists susc_ins on suscripciones;
create policy susc_ins on suscripciones for insert with check (owner_id = auth.uid());
drop policy if exists susc_upd on suscripciones;
create policy susc_upd on suscripciones for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Al crear un negocio (nuevo dueño) -> arranca la prueba de 30 días.
create or replace function trg_susc_trial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into suscripciones (owner_id, estado, trial_fin)
  values (new.owner_id, 'trial', now() + interval '30 days')
  on conflict (owner_id) do nothing;
  return new;
end; $$;
drop trigger if exists t_susc_trial on negocios;
create trigger t_susc_trial after insert on negocios for each row execute function trg_susc_trial();

-- Negocios que YA existen quedan activos (no bloquear a los actuales).
insert into suscripciones (owner_id, estado, trial_fin, periodo_fin)
select owner_id, 'activa', now() + interval '30 days', now() + interval '100 years'
from negocios
on conflict (owner_id) do nothing;
