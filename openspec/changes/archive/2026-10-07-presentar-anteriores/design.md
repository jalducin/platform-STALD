## Decisiones
- `renderPresentar` (`ingles/tablero.js`):
  - toma todos los `meet` de `state.act.items` (el admin recibe todo lo publicado hasta hoy, incluidos los
    exclusivos);
  - separa los de la semana actual (`semanaItems`) de los anteriores y ordena los anteriores por `fechaLimite`, de
    la más reciente a la más vieja;
  - cada fila reutiliza los mismos botones (`presentar`, `abrir-guion`), así que la presentación y el guion
    funcionan igual.
- Fixture E2E: `tests/fixtures/datos/contenido/semanas/2026-09-21.json` con `meet-2026-09-27` exclusivo
  (`alumnos: ["nadie-e2e"]`), para que ninguna alumna de las pruebas lo vea.

## Pruebas
- E2E `e2e-presentar.js`:
  - «Esta semana» muestra el Meet de la semana;
  - «Clases anteriores» muestra el Meet de prueba;
  - «Presentar» y «Guion» de una clase anterior se abren.
- Regresión: fase `ingles`.
