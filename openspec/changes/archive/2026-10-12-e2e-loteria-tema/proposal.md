## Why

Desde el cambio `juegos-ingles-gramatica` (#152), 🧩 Completa y responde (`en-frases`) muestra el selector «Elige el
tema» antes de la primera pregunta. La E2E `loteria-sala` abre ese juego y espera directamente las opciones (`.opt`),
así que falla en `main` limpio aunque el juego funciona bien. `e2e-juegos`, `e2e-fusion` y `e2e-clasicos` ya tocan
el tema «Todo»; `loteria-sala` se quedó atrás.

## What Changes

- `tests/e2e/e2e-loteria-sala.js`: tras abrir `en-frases`, espera `[data-tema="todo"]`, lo toca y luego espera las opciones de la pregunta (`[data-opt]`; los botones de tema también usan `.opt`).
- No cambia la lógica de ningún juego ni del servidor; el número de pasos `PASS` de la prueba no cambia.

## Capabilities

### New Capabilities

### Modified Capabilities
- `pruebas`: las E2E que abren un juego con selector de tema eligen «Todo» antes de jugar.

## Impact

- Solo pruebas E2E (`tests/e2e/e2e-loteria-sala.js`). Sin cambios en páginas, servidor ni datos.
