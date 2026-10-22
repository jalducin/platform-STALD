## Why

El motor de misiones de la Fase 2a (`rpg-fase2-misiones`) ya está en producción y la misión «My Hero Card» del Grupo 1
ya está en el repo de datos (`contenido/ingles/misiones/mis-ingles-grupo-isla-del-alfabeto.json`, abre el
2026-11-09). Falta que alumnos y alumnas de Inglés la vean y la entreguen desde `ingles.html`, que el profe la evalúe
desde su vista de Inglés y que los pasos entregados cuenten en la constancia del ranking (tarea 4.1 de
`rpg-fase2-ingles`).

## What Changes

- **Vista de alumnos y alumnas** (`ingles.html`): sección nueva «⚔️ Misiones» (fuera de la barra de abajo, que sigue con
  6 pestañas para caber a 360 px) y tarjeta «⚔️ Misión principal del mundo» en «🏠 Inicio», que lleva a ella. Reusa **sin duplicar** la vista de `ingles/secundaria-misiones.js`: lista, detalle por pasos,
  entrega solo en texto con recordatorio de privacidad, rúbrica, práctica de la teoría y aviso de evaluación nueva.
  «Continuar misión» lleva a `#misiones`.
- **XP:** la barra RPG de Inglés suma la XP de las misiones evaluadas (`Gamificacion.xpTotalConMisiones`).
- **Sin peticiones de más:** `/ingles/actividades` agrega `misiones: true` solo si la persona tiene alguna misión
  visible (`hayMisionesVisibles`, con la misma identidad que `/misiones`: quien también está en Secundaria ve sus
  misiones en Secundaria y aquí no se le avisa). Solo entonces la página pide `/misiones`.
- **Profe:** sección «📥 Entregas» en la vista de admin de Inglés, con la bandeja del motor (`/profe/entregas`, que ya
  lista Inglés y Secundaria). Se carga al abrirla. Es mínima: el rediseño del admin lo hace otro agente.
- **Ranking:** `pasosEntregados(store, "ingles", slug)` alimenta los 20 puntos por paso de misión.
- **Pruebas:** misión de ejemplo `tests/fixtures/datos/contenido/ingles/misiones/mis-ingles-e2e-hero-card.json`
  (contenido inventado, `alumnos: ["marisol"]`, validada con `--misiones ingles`), E2E `misiones-ingles` y
  `server/misiones_ingles_test.ts`.

## Capabilities

### Modified Capabilities
- `misiones` (del cambio `rpg-fase2-misiones`): requisito nuevo «Misión principal en la vista de Inglés».

## Impact

- `ingles.html`, `ingles/rpg-ingles.js`, `ingles/alumno.js`, `ingles/app.js`, `ingles/comun.js`, `ingles/tablero.js`.
- `server/misiones.ts` (dos exportaciones nuevas y aditivas), `server/actividades.ts` (campo `misiones`) y
  `server/main.ts`.
- Sin cambios en Postgres, Auth, Realtime ni Notion. El repo de datos no cambia: la misión real ya está.

### Matriz de acceso (sin cambios respecto de `rpg-fase2-misiones`)

| Quién | Ve la misión en Inglés | Entrega | Bandeja «📥 Entregas» |
|---|---|---|---|
| Admin (profe) | — | No | Sí: nombre de pila, pasos, rúbrica, sin correos |
| Alumno o alumna activa de Inglés del grupo destinatario | Sí, desde su `disponibleDesde` | Solo lo suyo, solo texto | 403 |
| Alumno o alumna de otro grupo | No (no se le avisa ni se pide `/misiones`) | 404 | 403 |
| De baja de Inglés | Solo lectura de lo suyo (motor) | 403 | 403 |
| Invitado de Juegos / sin sesión | 403 / 401 | 403 / 401 | 403 / 401 |

## Cómo revertir

Revertir el PR. Las entregas en `stald_docs` (`entregas/`) se conservan y las maneja el motor.
