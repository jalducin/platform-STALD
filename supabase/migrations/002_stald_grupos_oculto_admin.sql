-- Grupos ocultos del panel del admin (openspec: ingles-ocultar-grupos). Bandera por grupo: con `true`, el grupo y sus
-- alumnos y alumnas no salen por omisión en las vistas del admin de Inglés; a ellos no les cambia nada.
-- Aditiva e idempotente (se puede correr varias veces). Default false: al aplicarla no se oculta ningún grupo.
-- RLS sin cambios: las tablas siguen sin políticas públicas.
-- Revertir: alter table public.stald_grupos drop column if exists oculto_admin; (y en stald_test_grupos)
do $$
declare p text;
begin
  foreach p in array array['stald_', 'stald_test_'] loop
    execute format('alter table public.%I add column if not exists oculto_admin boolean not null default false', p || 'grupos');
  end loop;
end $$;
