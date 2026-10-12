## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/mando-arcade` desde `origin/main` (tras `git fetch`)

## 1. Lógica pura del mando (TDD)

- [x] 1.1 Pruebas que fallan en `server/mando_test.ts` (Deno, sin DOM), que carga `juegos/mando.js`:
  - `normalizarAcciones` (botón suelto, lista, botón desconocido → error);
  - `teclaABoton` con el mapeo por omisión y con cambios por juego (`null` quita);
  - `cruceta` (4 direcciones, diagonales, zona muerta central);
  - `zonaMuerta` radial y reescalada, acotada al círculo; `ejeABotones`;
  - `masCercano` (rombo sin huecos, fuera del alcance → nada);
  - `crearSeguidor` (multitáctil, deslizar de un botón a otro, soltar un dedo sin soltar el otro);
  - `controlABotones` con un control estándar simulado (botones, gatillos analógicos, cruceta y palanca);
  - `crearNucleo` (unión de fuentes, `presionado`, `eje`, `al` una sola vez por flanco, `alSoltar`, `activar`);
  - `guia` (acción, botón, teclas y botón del control, sin marcas).
- [x] 1.2 `juegos/mando.js`: implementar la capa pura hasta que pasen las pruebas.

## 2. Mando en el navegador

- [x] 2.1 `Mando.crear`: DOM del mando (cruceta, palanca opcional, rombo A/B/X/Y, L/R, START/SELECT), CSS incluido
  con aspecto de consola, modo vertical y encimado en horizontal, `--mando-alto`, solo los botones usados,
  `prefers-reduced-motion`.
- [x] 2.2 Toques: *touch events* no pasivos por `identifier`, zonas (cruceta con arrastre, rombo por cercanía,
  palanca), deslizar, vibración, *pointer events* solo mouse/pluma, `blur` suelta solo el teclado.
- [x] 2.3 Teclado configurable, Gamepad API con aviso «🎮 Control conectado», guía «⌨️ Controles».

## 3. Integración en los juegos

- [x] 3.1 `juegos/plataformas.html` (Axo): mando con cruceta/A/B/START, selector «🎮 Mando clásico» · «🔘 Botones»
  en la portada y la pausa, `localStorage.plataformas_control`, guía.
- [x] 3.2 `juegos/dragon-run.html`: mando con A/START, pausa nueva (también al ocultar la pestaña), selector
  «🎮 Mando clásico» · «👆 Tocar la pantalla», `localStorage.dragon_control`, guía.

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `tests/e2e/e2e-plataformas.js`: los botones táctiles de la verificación a 390 px y en escritorio ahora son
  el mando (o `#mandos` con «Botones»).
- [x] 4.2 E2E nueva `tests/e2e/e2e-mando.js`, registrada en la fase `base` de `tests/e2e/correr.sh`:
  - toques reales (CDP, `hasTouch` + `isMobile`): cruceta + A a la vez en Axo (avanza y salta), deslizar A → B,
    A en Dragon Run (salta) y START (pausa);
  - teclado en escritorio (→ + J en Axo; Enter pausa);
  - control físico simulado (`navigator.getGamepads` inyectado con `addInitScript`): aviso, cruceta y botón de abajo;
  - preferencia recordada tras recargar (Axo «Botones», Dragon «Tocar la pantalla»);
  - guía «⌨️ Controles»;
  - mando completo dentro de la pantalla y capturas a 360×640, 390×844 (vertical y horizontal) y escritorio, más una
    captura del mando completo con palanca.

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/mando_test.ts` y la suite `npx -y deno test -A server/`; `npx -y deno lint`
  del archivo nuevo.
- [x] 5.2 E2E `mando plataformas dragon-run juegos` con la copia de datos de prueba (la copia temporal se descarta
  al terminar: estado restaurado).
- [x] 5.3 Revisar las capturas: el mando se ve como consola portátil y cabe sin tapar lo importante.
- [x] 5.4 Reporte `openspec/changes/mando-arcade/reports/2026-10-11-step-5-pruebas-y-verificacion.md`.

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Abrir `juegos/plataformas.html` y `juegos/dragon-run.html` sueltos en Chromium móvil (vertical y
  horizontal, 320 px) con toques reales y en escritorio con teclado; casos de error: botón desconocido en
  `Mando.crear`, sin `localStorage` (modo privado simulado), sin Gamepad API.
- [ ] 6.2 Tras el merge (usuario): probar en un Android, un iPhone y con un control físico real.

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md`: sección «Mando de Arcade» (API, mapeos, reglas de adopción) y nota en Arcade.
- [x] 7.2 `npx -y @fission-ai/openspec@1.4.1 validate mando-arcade --strict`.

## 8. Cierre

- [ ] 8.1 Commits en español; sin push, PR ni merge (los hace el integrador). Tras el merge: `openspec archive`.
