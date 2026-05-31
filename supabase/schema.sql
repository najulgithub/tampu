-- ============================================================
-- Alquileres — schema inicial
-- Correr en: Supabase → SQL Editor (o supabase db push)
-- ============================================================

-- Cada fila pertenece a una cuenta (owner_id = usuario dueño).
-- Las políticas RLS hacen que cada usuario vea/edite solo lo suyo.

-- ---------- GRUPOS ----------
create table if not exists grupos (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre      text not null,
  ambiente    text not null default 'Otro',
  color       text not null default '#64748b',
  foto        text,
  created_at  timestamptz not null default now()
);

-- ---------- UNIDADES ----------
create table if not exists unidades (
  id           text primary key,
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre       text not null,
  grupo_id     text,
  tipo_unidad  text not null default 'Departamento',
  color        text not null default '#14b8a6',
  foto         text,
  direccion    text default '',
  localidad    text default '',
  ambientes    int  not null default 1,
  capacidad    int  not null default 2,
  icals        jsonb not null default '[]'::jsonb,
  notas        text default '',
  created_at   timestamptz not null default now()
);

-- ---------- RESERVAS ----------
create table if not exists reservas (
  id                text primary key,
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  unidad_id         text not null,
  huesped           text not null,
  contacto          text default '',
  check_in          date not null,
  check_out         date not null,
  monto_total       numeric not null default 0,
  monto_mensual     numeric not null default 0,
  sena              numeric not null default 0,
  canal             text not null default 'Directo',
  tipo              text not null default 'temporal',
  moneda            text not null default 'ARS',
  actualizacion     text not null default 'Sin actualización',
  indice            text not null default 'ICL',
  porcentaje_manual numeric not null default 0,
  notas             text default '',
  created_at        timestamptz not null default now()
);

-- ---------- GASTOS ----------
create table if not exists gastos (
  id           text primary key,
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ambito       text not null,
  ref_id       text not null,
  fecha        date not null,
  categoria    text not null,
  descripcion  text default '',
  monto        numeric not null default 0,
  proveedor    text default '',
  reparto      jsonb,
  clave_origen text,
  created_at   timestamptz not null default now()
);

-- ---------- GASTOS PROGRAMADOS ----------
create table if not exists gastos_programados (
  id           text primary key,
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ambito       text not null,
  ref_id       text not null,
  categoria    text not null,
  descripcion  text default '',
  monto        numeric not null default 0,
  proveedor    text default '',
  frecuencia   text not null,
  fecha_inicio date not null,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- COLABORADORES ----------
create table if not exists colaboradores (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre      text not null,
  email       text default '',
  rol         text not null default 'Lectura',
  grupos_ids  text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Row Level Security: cada usuario ve y edita solo sus filas.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['grupos','unidades','reservas','gastos','gastos_programados','colaboradores']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy %1$s_select on %1$I for select using (owner_id = auth.uid());
      create policy %1$s_insert on %1$I for insert with check (owner_id = auth.uid());
      create policy %1$s_update on %1$I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
      create policy %1$s_delete on %1$I for delete using (owner_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Índices útiles
create index if not exists idx_unidades_owner on unidades (owner_id);
create index if not exists idx_reservas_unidad on reservas (unidad_id);
create index if not exists idx_gastos_owner on gastos (owner_id);

-- ============================================================
-- NOTA (fase 2): acceso de COLABORADORES a los datos del dueño.
-- Las políticas de arriba son "owner-only" (cada cuenta ve lo suyo).
-- Para que un colaborador vea/edite los datos del propietario hay que
-- ampliar las policies con una función que chequee si el email del
-- usuario actual está en la tabla `colaboradores` del owner y con qué rol.
-- Se hace una vez que el login de colaboradores esté andando.
-- ============================================================
