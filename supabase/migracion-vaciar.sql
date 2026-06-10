-- ============================================================
-- Permite al DUEÑO vaciar todos los datos de su propia cuenta
-- (unidades, reservas, gastos, etc.), dejando intactos su login,
-- su negocio, su configuración y su suscripción.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

create or replace function vaciar_mi_cuenta()
returns void language plpgsql security definer set search_path = public as $$
declare t text;
begin
  -- Solo el dueño de un negocio puede vaciar SU cuenta (un colaborador no).
  if not exists (select 1 from negocios where owner_id = auth.uid()) then
    raise exception 'solo el dueño puede vaciar su cuenta';
  end if;

  -- Orden seguro por dependencias. Solo borra lo del propio owner.
  foreach t in array array['pagos','mensajes','notificaciones','comprobantes_servicio',
                           'presupuestos','gastos','gastos_programados','reservas',
                           'proveedores','unidades','grupos','colaboradores'] loop
    execute format('delete from public.%I where owner_id = %L', t, auth.uid());
  end loop;
end; $$;
grant execute on function vaciar_mi_cuenta() to authenticated;
