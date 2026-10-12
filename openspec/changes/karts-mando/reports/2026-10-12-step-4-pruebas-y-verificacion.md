# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: karts-mando
- Agente: Claude (Opus 5.5), rama `feature/karts-mando` (desde `4380726`)

## Comandos ejecutados

- `npm install` en `tests/e2e` (faltaba `node_modules`).
- TDD (rojo): `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos de prueba> --puerto-api 8989 --puerto-web 8969 karts`
- Suite requerida: `… correr.sh --datos <copia> --puerto-api 8989 --puerto-web 8969 karts mando plataformas dragon-run juegos`
- `npx -y deno test -A server/`
- `npx -y deno lint server/ juegos/mando.js` (alcance de lint del proyecto, igual que en `mando-arcade`)
- `npx -y @fission-ai/openspec@1.4.1 validate karts-mando --strict`

## Resultados de pruebas

- TDD, antes de implementar: `karts` FAIL — 62 pasos existentes en verde y las nuevas en rojo («el selector ofrece
  🎮 Mando clásico», «tras recargar sigue elegido», «tutorial con los botones del mando», «se ve el mando»…) y la
  prueba se detuvo al no existir `.mando`.
- Después de implementar (suite requerida, fase `base`): 5 corridas, 5 PASS, 0 FAIL, 0 omitidas (~7 min).
  - `karts`: 126 pasos PASS (62 de antes sin cambiar expectativas + 64 nuevos del mando).
  - `mando`: 64 PASS · `plataformas`: 31 PASS · `dragon-run`: 31 PASS · `juegos`: 31 PASS.
- Deno `server/`: 462 pasaron, 0 fallaron, 6 omitidas (las de siempre). Lint `server/ juegos/mando.js`: 92 archivos,
  sin problemas. (`deno lint` sin ruta revisa también scripts de navegador y pruebas de Node, que ya tenían
  problemas antes de este cambio, p. ej. `no-window`; el código nuevo de la prueba no agrega `no-unused-vars`.)
- `openspec validate karts-mando --strict`: válido.

## Qué cubre lo nuevo de `e2e-karts.js` (`probarMando`)

- 390×844 dentro de Juegos, toques reales por CDP: «🎮 Mando clásico» elegido y recordado tras recargar (con
  «Con botón»); tutorial con ◀ ▶, A, R / L, X / Y, B; mando activo; sin A el carro no avanza (vel 0); A acelera
  (vel 213); A + ◀ a la vez gira (ang 0.03 → −1.26); al soltar ◀ deja de girar; R + ◀ 2.6 s → mini-turbo morado;
  X usa el ítem (🌶️ turbo); START pausa (reloj detenido) y START sigue; con el mando elegido, P del teclado pausa una
  sola vez y → gira.
- Distribución a 320×640, 390×844 y 844×390, suelto (`juegos/karts.html?prueba=1`) y dentro de Juegos: solo
  ◀ ▶, A, B, X, Y, L, R y START; todo dentro de la pantalla sin desplazamiento horizontal; sin cruzarse con el
  minimapa ni el HUD; en vertical, debajo de la pista con `--mando-alto` = alto del mando + 6 px (203 px a 390 en
  Juegos, 161 px a 320); en horizontal, encimado en las esquinas de abajo con `--mando-alto` = 0 y oculto en el menú;
  ◀ con toque real gira en cada medida.
- Casos de error: valor desconocido en `karts_control` y `localStorage` bloqueado (modo privado) → Botones, sin errores
  de JS, y se puede elegir el mando igual.
- Control físico simulado (PC 1280×800, «Botones» elegido, «Con botón»): aviso «🎮 Control conectado»; botón de
  abajo acelera (vel 198); palanca proporcional (−0.45 → giro −0.31; −1 → −1); Start pausa y sigue.

## Verificación de estado

- Antes: copia temporal del repo de datos creada por `correr.sh` desde la carpeta de datos de prueba; sin Postgres
  (no se tocan tablas `stald_`).
- Después: `correr.sh` descarta la copia temporal; la carpeta de datos original no se modifica. Preferencias del
  mando solo en `localStorage` de contextos de navegador desechables.
- Estado restaurado: Sí — nada que restaurar fuera de la copia temporal.

## Verificación manual (Step 5.1) — capturas revisadas

- Vertical 390 y 320 (suelto y en Juegos): el mando se ve como consola debajo de la pista; minimapa y HUD completos.
  **Corregido:** la etiqueta «acelerar» bajo A se encimaba con B a 320 px → ahora «gas».
- Horizontal 844×390: **corregido:** la cruceta (solo ◀ ▶) dejaba un brazo ▼ invisible y subía L y ◀ ▶ hasta media
  pantalla; con `margin-bottom: −u` quedan pegados a la esquina. R + rombo ocupan la esquina inferior derecha sin
  tocar el minimapa (arriba a la derecha). El tutorial sube para no taparse con START.
- **Corregido en la prueba:** la captura del tutorial se tomaba cuando ya se había ido; ahora se toma al empezar.
- PC con control físico: el aviso «🎮 Control conectado» se ve arriba al centro; sin mando en la pantalla.

## Resultado

- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente del usuario tras el merge: Android, iPhone y control físico real.
