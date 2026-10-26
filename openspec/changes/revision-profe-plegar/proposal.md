## Why

La pestaña «📋 Revisión» del profe (cambio `revision-profe`, PR #260) sale muy larga en celular: unas 15 tarjetas por
semana, cada una con su formulario completo (checklist, calificación, comentario y guardar), aunque la mayoría no
necesita nada: las clases que aún no abren y las que el profe ya revisó. El profe tiene que desplazarse mucho para
llegar a las que sí le toca revisar.

## What Changes

- **Tarjetas plegables** en todos los tamaños. Por omisión se pliegan las clases que aún no abren (estado
  `sin-abrir`: «🔒 Abre <fecha>» o «⏳ Sin abrir») y las que el profe ya revisó (con calificación). Las pendientes de
  revisar (enviadas o en borrador sin revisión) quedan desplegadas.
- Una tarjeta plegada es **una línea**: chip de materia, tema, estado corto y, si existe, «Final N». La cabecera de
  cada tarjeta es un botón (≥ 44 px, `aria-expanded`) que la pliega y despliega.
- **Botón general** arriba de la lista: «📂 Mostrar todo» / «📁 Plegar revisadas». La preferencia se guarda por aparato
  en `localStorage` (`stald_revision_modo`, dentro de `try/catch`; sin almacenamiento dura solo la visita).
- Guardar una revisión no pliega la tarjeta (el profe sigue en ella); actualiza su estado corto y su final en la línea.
- Selectores: los `data-testid` actuales no cambian; se agregan `data-plegada="1|0"` en `rev-tarjeta`,
  `rev-plegar` (cabecera de cada tarjeta) y `rev-plegar-todo` (botón general).
- E2E `revision-profe`: revisada plegada que se despliega al tocarla, pendiente desplegada, control ≥ 44 px y
  preferencia recordada tras recargar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `revision-profe`: se agrega el requisito de tarjetas plegables (el cambio `revision-profe` aún no se archiva; el
  delta se agrega como requisito nuevo de la misma capacidad).

## Impact

- Superficies: `ingles.html` (`?v=` de `ingles/secundaria-revision.js` 2 → 3 y `ingles/secundaria.css` 15 → 16),
  `ingles/secundaria-revision.js`, `ingles/secundaria.css`, `tests/e2e/e2e-revision-profe.js`,
  `docs/frontend-standards.md`.
- Sin cambios en el servidor Deno, Postgres, el contrato HTTP ni el repo de datos.
- Privacidad y acceso: sin cambio; la pestaña sigue siendo solo del admin. `localStorage` guarda solo `todo` o
  `plegar`, sin datos de alumnas.
- Acciones externas: ninguna (Pages publica al fusionar a `main`).
