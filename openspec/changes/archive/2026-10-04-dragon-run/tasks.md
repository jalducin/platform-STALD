## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/dragon-run`

## 1. Servidor

- [x] 1.1 Prueba que falla: `dragon-run` en el catálogo (`mente`, tope 2000) y partida guardada con tope
- [x] 1.2 Agregarlo a `CATALOGO`

## 2. Juego

- [x] 2.1 Mover `juegos/datos/Dragon Run.html` → `juegos/dragon-run.html` y aplicar las mejoras: doble salto, bono,
  `postMessage`, pausa por pestaña oculta y modo `?auto=1`
- [x] 2.2 `juegos.html`: entrada en Mente ágil, `jugarDragonRun` con iframe, mensaje validado → `terminar`, y
  pausa y reanudación de la música

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 E2E que cuentan juegos del hub (20 → 21)

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`
- [x] 4.2 E2E `e2e-dragon-run`:
  - abre en Juegos;
  - modo auto juega y termina;
  - el resultado se guarda en ⭐ individuales;
  - doble salto (no un tercero);
  - sola, sin plataforma, no envía nada.
  - Regresión de `e2e-juegos`.
- [x] 4.3 Reporte `openspec/changes/dragon-run/reports/2026-10-02-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Producción, solo lectura:
  - `/juegos/yo` lista `dragon-run`;
  - GitHub Pages sirve `juegos/dragon-run.html`;
  - el hub lo muestra.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (catálogo 21) y `docs/frontend-standards.md` (juego en iframe del mismo
  origen con `postMessage`)
