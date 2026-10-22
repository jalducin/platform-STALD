## Why

El profe quiere que Secundaria se sienta como un juego educativo («RPG»): XP, nivel y rango, insignias, racha,
mundos por materia y retos diarios. Dos piezas lo van a mostrar a la vez: el tablero de Secundaria
(`secundaria-dashboard`) y la pantalla de resultado de la clase interactiva (PR #225, «+XP»). Para que las dos
cuenten igual, las reglas viven en un solo módulo puro y compartido, que después también usará Inglés.

Para el bonus «a tiempo» falta un dato: el listado no dice si el **mejor** intento llegó dentro de su fecha límite, y
la respuesta del envío tampoco.

## What Changes

- **Módulo nuevo `comun/gamificacion.js`** (script clásico, `globalThis.Gamificacion`, sin DOM ni peticiones):
  - `xpDeClase(item, calificacion, opciones?)`: porcentaje con los aciertos del tema 🎯 (mini examen) al doble, + 20
    si el mejor intento llegó a tiempo. `xpTotal(items)` suma solo el mejor intento de cada clase hecha.
  - `nivelDe(xp, genero?)` → `{ nivel, rango, xp, xpNivel, xpSiguiente, porNivel, porcentaje }`: nivel =
    floor(XP/300)+1; rangos Aprendiz (1–3), Exploradora/Explorador (4–6), Sabia/Sabio (7–9), Gran Sabia/Gran Sabio
    (10+), con las dos formas si no se sabe el género.
  - `mundoDe(materia, hoy?)`, `mapaMundos(items, hoy)`: un mundo por bloque de cada materia (fechas de
    `ai-specs/skills/clases-secundaria/SKILL.md`), con estado completado / en curso / bloqueado.
  - `insigniasDe(estado)`, `insigniaNueva(antes, despues)`: insignias derivadas (no se guardan).
  - `retosDiarios(items, hoy)`, `actividadReciente(items, n)`.
  - Catálogo de materias y `materiaDe`, `diaDeClase`, `estaHecha` (los reusará el tablero).
- **Servidor (`server/actividades.ts`)**, campos nuevos (aditivos):
  - listado (`/ingles/actividades`, `/secundaria/actividades`, ruta del profe) para alumno o alumna:
    `mejorATiempo: boolean | null` por elemento;
  - `POST …/actividades/<id>` guardado: `aTiempo` (el intento recién enviado) y `mejorATiempo`.
- **Docs:** reglas en `docs/frontend-standards.md` § «Gamificación» (fuente única) y contrato en
  `docs/backend-standards.md`.

Fuera de este PR: el tablero (lo pinta `secundaria-dashboard`) y el «+XP» de la clase (PR #225).

## Capabilities

### New Capabilities
- `gamificacion`: reglas de XP, nivel y rango, insignias, mundos, retos diarios y actividad reciente.

### Modified Capabilities
<!-- ninguna: los campos del servidor son aditivos; se documentan en el requisito nuevo -->

## Impact

- Superficies: módulo nuevo `comun/gamificacion.js` (todavía sin página que lo cargue), servidor Deno
  (`server/actividades.ts`). Sin cambios en Postgres, Notion ni en el repo de datos.
- Matriz de acceso (sin cambios; los campos nuevos solo describen intentos propios):

  | Quién | `GET /secundaria/actividades` | `POST /secundaria/actividades/<id>` |
  |---|---|---|
  | Alumna de Secundaria | 200, lo suyo con `mejorATiempo` | 200 con `aTiempo` y `mejorATiempo` |
  | Admin | 200 con resultados (sin `mejorATiempo`); con `?alumna=<slug>`, la vista de ella con `mejorATiempo` | vista previa: no se guarda, sin `aTiempo` |
  | Correo sin Secundaria | 403 | 403 |
  | Sin sesión | 401 | 401 |

- Privacidad: nada nuevo se guarda; las insignias y el XP se derivan en el aparato de quien ve.
- Acciones externas: redeploy automático al merge (agente); verificación en producción solo lectura (agente).

## Cómo revertir

Revertir el PR. Los campos nuevos son aditivos; las páginas que los usen caen a «sin bonus».
