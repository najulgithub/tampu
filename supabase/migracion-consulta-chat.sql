-- ============================================================
-- Chat de consulta (pre-reserva): un huésped le escribe al dueño desde el link,
-- sin necesidad de una reserva. Reusa la tabla mensajes con reserva_id nulo,
-- identificando la conversación por (dueño, cliente_id).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table mensajes alter column reserva_id drop not null;
alter table mensajes add column if not exists cliente_id uuid;
alter table mensajes add column if not exists cliente_email text;

-- Mensajes de la consulta entre el huésped logueado y el dueño del slug.
create or replace function consulta_mensajes(p_slug text)
returns table (autor text, texto text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select m.autor, m.texto, m.created_at
  from mensajes m
  join negocios n on n.owner_id = m.owner_id
  where n.slug = p_slug and m.cliente_id = auth.uid() and m.reserva_id is null
  order by m.created_at;
$$;
grant execute on function consulta_mensajes(text) to authenticated;

-- El huésped envía una consulta al dueño del slug.
create or replace function consulta_enviar(p_slug text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from negocios where slug = p_slug;
  if v_owner is null then raise exception 'Link inválido'; end if;
  insert into mensajes (id, owner_id, reserva_id, autor, texto, cliente_id, cliente_email)
  values (gen_random_uuid()::text, v_owner, null, 'inquilino', trim(p_texto), auth.uid(),
          coalesce((select email from auth.users where id = auth.uid()), ''));
end; $$;
grant execute on function consulta_enviar(text, text) to authenticated;
