## Why

La spec paraguas `plataforma-rpg` (aprobada el 2026-10-21) pide que el RPG llegue a Inglés en su **Fase 2, parte B**:
tablero con XP, nivel, rango, insignias y racha, el **nick de Juegos** como apodo público moderado por el profe y un
**ranking por grupo** por constancia, oculto por defecto. Hoy Inglés solo muestra avance de la semana y calificaciones,
y no hay forma segura de mostrar a un grupo de menores quién se está esforzando.

El profe pidió además que el ranking quede **detrás de un interruptor apagado por ahora** (`ranking: false`): todo
queda construido y probado, pero nadie ve nada del ranking hasta que él lo encienda.

Este cambio deriva de `plataforma-rpg` (tarea 0.2): **mueve** a su `specs/` los requisitos «Nick de Juegos para el
ranking» y «Ranking por grupo con nicks, sin calificaciones» (y la parte de nicks de «Moderación de nicks, tutor y
consentimientos») y los quita del paraguas.

## What Changes

- **Tablero RPG en Inglés** (`ingles.html`, «🏠 Inicio» de alumnos y alumnas): barra de nivel, rango, XP del nivel,
  insignias y racha con `comun/gamificacion.js` y la barra de `ingles/secundaria-inicio.js`; «Mundo actual» (🏝️ Isla
  del Alfabeto). Sin cambios en «Esta semana», «Para ponerte al día», la próxima clase por Meet ni «Material».
- **Nick de Juegos como apodo público:** el servidor lo revisa (sin correos, teléfonos, nombres de pila del registro ni
  palabras bloqueadas). Queda «pendiente» hasta que el profe lo aprueba y vuelve a «pendiente» si cambia en Juegos
  (se compara con el valor aprobado, sin tocar Juegos).
- **Ranking por grupo** (`GET /gamificacion/ranking`): solo su grupo, semana lunes a domingo (CDMX), por **puntos de
  constancia** (10 a tiempo, 5 tarde, 20 por paso de misión), solo quien activó «🏆 Aparecer» y tiene el nick aprobado.
  Posición propia privada aunque esté oculto. Nunca nombres, correos, slugs, XP ni calificaciones.
- **Interruptor** `gamificacion/config.json` → `{ ranking: false, gruposSinRanking: [] }` en `stald_docs`, apagado por
  defecto, con efecto inmediato y sin redeploy (mecanismo de «Cómo revertir» de `plataforma-rpg`). Apagado: el perfil
  responde `{ ranking: false }`, el ranking 404 y la página no dibuja nada del ranking, ni el botón.
- **Panel del profe** («🛡️ Nicks» en `ingles.html`, admin): cola de moderación (aprobar o rechazar con motivo), lista
  de nicks con su revisión automática, interruptor general y apagado por grupo.
- **Función pura compartida** `comun/constancia.js`: script clásico sin DOM que el servidor importa; la página puede
  cargarlo con `<script>` cuando muestre su propia constancia (hoy la recibe del servidor en `yo.puntos`).
- **Retención:** los perfiles de quien lleva más de 30 días de baja (o ya no está en el registro) se borran al abrir la
  cola de moderación.
- **Pendiente (depende de la Fase 2a):** la misión «My Hero Card» y los 20 puntos por paso de misión. El servidor ya
  recibe `pasosMision` como dependencia opcional; se conecta cuando el motor de misiones llegue a `main`.
- **Pendiente:** PWA opcional (tarea 4.10 del paraguas).

## Capabilities

### New Capabilities
- `gamificacion`: «Tablero RPG en Inglés», «Nick de Juegos para el ranking», «Ranking por grupo con nicks, sin
  calificaciones» e «Interruptor general del ranking» (movidos o nuevos respecto de `plataforma-rpg`).
- `panel-profe`: «Moderación de nicks y apagado del ranking» (la parte de nicks del requisito del paraguas).

### Modified Capabilities
<!-- Ninguna viva: `juegos` no cambia (solo se lee juegos/nicks.json y se invalida la caché al cambiar un nick). -->

## Impact

- **Superficies:** `ingles.html` (alumno y admin), `ingles/rpg-ingles.js` y `ingles/rpg-ingles.css` (nuevos),
  `ingles/alumno.js`, `ingles/app.js`, `ingles/comun.js`, `ingles/tablero.js`, `ingles/secundaria-inicio.js`
  (`barraRpg` acepta el total de insignias), `comun/constancia.js` (nuevo).
- **Servidor Deno:** `server/gamificacion.ts`, `server/interruptores.ts`, `server/cache_ranking.ts` (nuevos),
  `server/main.ts` (rutas), `server/db.ts` (prefijo `gamificacion/` a Postgres), `server/juegos.ts` (invalida la caché
  del ranking al cambiar un nick).
- **Postgres de Supabase:** documentos nuevos en `stald_docs` (`gamificacion/config.json`,
  `gamificacion/perfiles/<slug>.json`); sin migración ni tablas nuevas. Auth, Realtime y Notion: sin cambios.
- **Repo de datos:** sin cambios (la misión «My Hero Card» queda pendiente).

### Matriz de acceso

| Quién | Tablero RPG (lo suyo) | `GET/PUT /gamificacion/perfil` | `GET /gamificacion/ranking` | `/profe/nicks`, `/profe/ranking` |
|---|---|---|---|---|
| Admin (profe) | — | 403 `solo_alumnos` | Su `?grupo=` (solo nicks y puntos) | Sí: nombre de pila, nick, estado, si pidió aparecer; aprobar, rechazar, interruptor |
| Alumno o alumna activa de Inglés | Sí | Solo el suyo; otra persona → 403 | Solo su grupo, con interruptor encendido; otro grupo → 403 | 403 |
| De baja de Inglés | — (ve el aviso de baja) | 403 `baja_ingles` (404 `sin_ranking` si tiene Secundaria) | 403, y no aparece (404 si tiene Secundaria) | 403 |
| Solo Secundaria | — | 404 `sin_ranking` | 404 `sin_ranking` | 403 |
| Invitado de Juegos | — | 403 | 403 | 403 |
| Sin sesión | — | 401 | 401 | 401 |

Con el interruptor apagado (por defecto) o el grupo apagado: perfil `{ ranking: false }`, `PUT { aparecer: true }` y
ranking 404 `sin_ranking`; ocultarse se acepta siempre. Ninguna respuesta lleva correos; el ranking nunca lleva nombres, slugs, XP, nivel ni calificaciones.
Se verifica con `server/gamificacion_ingles_test.ts` (incluye un recorrido de todo el JSON), la E2E `rpg-ingles` y curl.

### Acciones externas

| Acción | Responsable |
|---|---|
| Redeploy automático de Deno Deploy al fusionar y verificación de `/salud` y del ranking apagado en producción | Agente |
| Encender el ranking (`▶️ Encender el ranking` en «🛡️ Nicks») cuando lo decida | Profe |
| Aprobar o rechazar nicks de quien pida aparecer | Profe |
| Conectar «My Hero Card» y los pasos de misión cuando el motor de la Fase 2a esté en `main` | Agente (cambio siguiente) |

## Cómo revertir

- **Sin redeploy:** el ranking ya nace apagado; para volver a apagarlo, «⏸️ Apagar el ranking» o borrar
  `gamificacion/config.json` de `stald_docs`.
- **Código:** revertir el PR. Los perfiles en `stald_docs` (`gamificacion/perfiles/`) se pueden borrar sin perder
  calificaciones: el tablero RPG se deriva de los resultados.
