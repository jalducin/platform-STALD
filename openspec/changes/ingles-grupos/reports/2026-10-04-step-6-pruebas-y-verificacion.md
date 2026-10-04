# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-04
- Cambio: ingles-grupos (Sprint 1)
- Agente: Claude Code (Opus 5.5)

## Base de datos
- `supabase/migrations/001_stald_ingles.sql` se aplicó con `supabase db query --linked` desde una carpeta de trabajo
  fuera del repo.
  - Se crearon `stald_docs`, `stald_grupos`, `stald_inscripciones` y las tablas `stald_test_*`.
  - Todas las tablas tienen RLS activo y ninguna política.
  - Se insertó el grupo inicial `grupo-1`.
  - El portafolio quedó intacto: `contact_messages` sigue con 2 filas.
- Seguridad, consultando `stald_grupos`:
  - con la llave pública, 401 `permission denied`;
  - con la llave de servicio, 200.

## Pruebas
- Unitarias (`server/grupos_test.ts`, con un PostgREST falso en memoria): primero fallaron y después pasaron 6/6.
  - `db.ts`.
  - `PgStore`:
    - concurrencia por versión;
    - `list` de hijos directos;
    - delegación al almacén base;
    - respaldo cuando falla Postgres.
  - Grupos: permisos, validación, mover de grupo con historial y corrección el mismo día.
  - Calendario por grupo.
- Suite completa: 170 pasaron, 0 fallaron y 6 se omitieron. `check` y `lint` limpios, incluida la herramienta de
  migración.
- Migración contra `stald_test_*` con una copia de los datos:
  - `--prueba` contó 23 archivos;
  - la corrida real copió 23 y verificó 3 de 3 documentos idénticos;
  - una segunda corrida se negó a sobrescribir;
  - `--delta` dio 0 nuevos y 0 actualizados.
  - Hallazgo: jsonb reordena las llaves de los objetos. La primera verificación comparaba texto y por eso bloqueó la
    marca. Ahora compara en forma canónica.
- E2E `e2e-grupos` contra Supabase real (tablas de prueba): 11/11.
  - Crear el grupo «Sábado A1» y rechazar un Meet inválido.
  - Dar de alta a alguien en ese grupo, desde su lunes.
  - Mover a Marisol de grupo y filtrar por grupo.
  - Calendario por grupo: Angel ve 6 elementos y Marisol 1.
  - La alumna recibe el horario y el Meet de su grupo, y ve la tarjeta del grupo.
  - El resultado de Angel se guarda en Postgres (versión 1 → 2).
  - Al final, las tablas de prueba quedan vacías.
  - Hallazgo corregido: al mover a alguien no aparecía el aviso. Ahora se recarga la vista con `loadFor`.
- Regresiones de Inglés **en modo Postgres** (`PgStore` sobre `stald_test_*`):

  | Prueba | Resultado |
  |---|---|
  | alta | 11/11 |
  | inicio lunes | 6/6 |
  | segunda oportunidad | 8/8 |
  | pronunciación | 11/11 |
  | profe grupo | 7/7 |
  | ruta del profe | 15/15 |
  | diseño del profe | 11/11 |

- Regresiones **sin base** (como funciona producción antes de migrar):
  - `/ingles/grupos` responde 503 `sin_base`;
  - alta: 11/11;
  - juegos: 26/26.

## Verificación de estado
- Las tablas de prueba se vaciaron, las copias temporales se borraron y los servidores locales se apagaron.
- Producción no se tocó: no existe la marca en `stald_docs`.

## Resultado
- PASS
