-- Inglés en Postgres (openspec: ingles-grupos). Proyecto Supabase compartido con el portafolio: todo va en tablas
-- con prefijo propio (stald_ reales y stald_test_ para pruebas E2E). RLS activo y sin políticas: solo la llave de
-- servicio (Deno) lee y escribe; la llave pública no ve nada. Idempotente: se puede correr varias veces.
do $$
declare p text;
begin
  foreach p in array array['stald_', 'stald_test_'] loop
    -- Documentos JSON 1 a 1 con el repo de datos: alumnos.json, resultados/**, avance/** y la marca meta/migrado.
    execute format('create table if not exists public.%I (
      path text primary key,
      data jsonb not null,
      version integer not null default 1,
      actualizado timestamptz not null default now())', p || 'docs');
    execute format('create table if not exists public.%I (
      id text primary key check (id ~ ''^[a-z0-9-]{1,60}$''),
      nombre text not null,
      nivel text, horario text, meet_url text,
      color text not null default ''#4f46e5'',
      activo boolean not null default true,
      orden integer not null default 0,
      creado timestamptz not null default now())', p || 'grupos');
    execute format('create table if not exists public.%I (
      alumno text not null,
      grupo_id text not null references public.%I(id) on update cascade,
      desde date not null,
      hasta date,
      primary key (alumno, desde))', p || 'inscripciones', p || 'grupos');
    execute format('create unique index if not exists %I on public.%I (alumno) where hasta is null', p || 'insc_vigente', p || 'inscripciones');
    execute format('alter table public.%I enable row level security', p || 'docs');
    execute format('alter table public.%I enable row level security', p || 'grupos');
    execute format('alter table public.%I enable row level security', p || 'inscripciones');
    execute format('revoke all on public.%I, public.%I, public.%I from anon, authenticated', p || 'docs', p || 'grupos', p || 'inscripciones');
  end loop;
end $$;

-- Grupo inicial: ahí quedan todos al migrar; el profe lo renombra desde la página.
insert into public.stald_grupos (id, nombre, orden) values ('grupo-1', 'Grupo 1', 0) on conflict (id) do nothing;
