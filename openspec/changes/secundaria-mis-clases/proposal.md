## Why

Sofía, alumna de Secundaria, deja Notion: desde el lunes 2026-10-26 sus clases llegan como `actividad`es del módulo de
Secundaria (`ingles.html?modo=secundaria`, `/secundaria/actividades`, `contenido/secundaria/` del repo de datos), con
2 clases por día de lunes a sábado y 3 el domingo. Ya hay repasos como actividades en la semana 2026-10-19.

Hoy la vista dice «📝 Mis exámenes», es una lista plana por fecha límite y no deja ver qué materia toca cada día. El
validador `server/validar_semana.ts` no tiene modo para `contenido/secundaria` (otros agentes usan un script
temporal) y no conoce el campo `materia`.

## What Changes

- **Contenido:** campo nuevo opcional `materia` (string corta: «Inglés», «Español», «Matemáticas», «Ciencias»,
  «Ciencias Sociales», «Tecnología», «Artes», «Educación Física») en actividades y exámenes de Secundaria.
- **Servidor (`server/actividades.ts`):** el listado de `/secundaria/actividades` (y el de los demás ámbitos, que
  comparten `meta`) deja pasar `materia` cuando viene.
- **Validador (`server/semana.ts`, `server/validar_semana.ts`, `server/motor.ts`):**
  - `validateItem` acepta `materia` opcional y marca error si no es un texto corto (1 a 40 caracteres).
  - Bandera nueva `--secundaria`: valida `contenido/secundaria/semanas/<lunes>.json`. Sin patrón fijo de días (hay
    2 o 3 clases por día de cualquier tipo); `disponibleDesde` dentro de `<lunes>…fechaLimite` y el examen puede
    abrir antes de su día (los mensuales tienen ventana). Aviso si `materia` no es una de las 8 conocidas.
- **Vista (`ingles/secundaria.js`, `ingles/comun.js`, `ingles/app.js`, `ingles/ingles.css`):**
  - Título «📚 Clases de Secundaria» y lista «📚 Mis clases» (clases y exámenes).
  - «☀️ Hoy» primero: las clases cuya `fechaLimite` es hoy, con chip y color por materia.
  - «📅 Esta semana»: agrupada por día (Lunes 26 … Domingo 1) con sus clases y su materia.
  - «📝 Otras clases y exámenes»: lo visible fuera de la semana (p. ej. el examen mensual).
  - Pestaña «🗓️ Mi horario»: cuadrícula de 7 días con las materias de cada día; en celular (360 px) es una lista por
    día sin scroll horizontal; modo claro y oscuro.
  - Si una clase no trae `materia`, la vista la deduce del prefijo del título antes de « · » (sin el emoji).
- **`secundaria.html`:** el enlace dice «📚 Mis clases». El tablero de Notion sigue igual.
- **Pruebas:** Deno (validador y servidor) y E2E nueva `secundaria-clases` con fixture de varias clases y materias.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `examenes-secundaria`: requisitos nuevos «Mis clases de Secundaria por día y materia», «Mi horario semanal» y
  «Materia de cada clase» (ADDED).
- `carga-semanal`: requisito nuevo «Validar una semana de Secundaria» (ADDED).

## Impact

- Superficies: servidor Deno (`server/actividades.ts`, `server/motor.ts`, `server/semana.ts`,
  `server/validar_semana.ts`), `ingles.html` (modo Secundaria), `secundaria.html` (texto del enlace). Repo de datos:
  sin cambios en este PR (el campo es opcional; las clases nuevas lo traerán).
- Matriz de acceso (sin cambios):

  | Quién | `/secundaria/actividades` | Ve |
  |---|---|---|
  | Admin | 200 | todas las clases y exámenes con resultados |
  | Persona con filas de Secundaria | 200 | solo lo suyo (`alumnos` vacío o con su slug); otro exclusivo → 404 |
  | Correo sin Secundaria | 403 | aviso «solo para alumnos y alumnas de Secundaria» |
  | Sin sesión ni correo | 401 (400 si hay sesión sin correo) | — |

  Alumnos y alumnas de Inglés no cambian: el campo `materia` es opcional y su vista no lo usa.
- Acciones externas: redeploy automático al merge (agente); verificación de producción solo lectura (agente). Las
  clases con `materia` en el repo de datos las sube la sesión principal (fuera de este PR).

## Cómo revertir

Revertir el PR. Los datos con `materia` siguen siendo válidos para el servidor anterior (campo ignorado).
