# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: mando-arcade
- Agente: Claude (Opus 5.5), rama `feature/mando-arcade`

## Comandos ejecutados

- `npx -y deno test -A server/mando_test.ts` (TDD: primero falló por no existir `juegos/mando.js`; luego en verde)
- `npx -y deno test -A server/`
- `npx -y deno lint server/ juegos/mando.js`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos de prueba> --puerto-api 8969 --puerto-web 8949 mando plataformas dragon-run juegos`
- Verificación manual (paso 6.1): script de Playwright fuera del repo sobre `juegos/plataformas.html?prueba=1` y
  `juegos/dragon-run.html?prueba=1` sueltos (`file://`).

## Resultados de pruebas

- Dirigidas (Deno, `server/mando_test.ts`): 10 pasaron, 0 fallaron, 0 omitidas.
- Suite Deno `server/`: 334 pasaron, 0 fallaron, 6 omitidas (las mismas de siempre). Lint: 78 archivos, sin problemas.
- E2E (fase `base`): 4 corridas, 4 PASS, 0 FAIL, 0 omitidas — duración 3 min 59 s.
  - `mando`: 64 pasos PASS, 0 FAIL (nueva).
  - `plataformas`: 31 pasos PASS (ajustada al mando: «el mando táctil queda debajo del juego», «escritorio: sin
    botones táctiles ni mando»).
  - `dragon-run`: 31 pasos PASS (sin cambios en la prueba).
  - `juegos`: 29 pasos PASS.
- Primera corrida de `mando`: 2 fallas de la propia prueba, corregidas: el ayudante CDP debe mandar en `touchEnd` el
  dedo que se levanta (no los que quedan) y la demo del mando completo se movió a una página en blanco (la regla
  `body:not(.jugando) .mando` de Dragon Run la ocultaba). El módulo no cambió por esas fallas.

## Qué cubre la E2E `mando`

- Toques reales (CDP `Input.dispatchTouchEvent`, `hasTouch` + `isMobile`) dentro de Juegos:
  - Axo a 390×844: cruceta → y A a la vez; avanza y salta (x 32 → 107, y 179 → 150.7);
  - deslizar A → B; soltar un dedo sin soltar el otro; la página no se desplaza;
  - START pausa y sigue;
  - Dragon Run: A salta una sola vez (el toque sobre el mando no salta doble) y hace el doble salto;
  - START pausa (la distancia no avanza) y sigue.
- Teclado en escritorio:
  - → + J: avanza y salta; K = fuego; Enter pausa;
  - Enter sobre «▶ Seguir» usa el botón;
  - Dragon Run: J salta y Enter pausa y sigue.
- Guía «⌨️ Controles»: acciones, teclas y «Botón de abajo», sin marcas; se cierra con Esc.
- Control físico simulado (`navigator.getGamepads` con `addInitScript`):
  - avisos «🎮 Control conectado» y «🎮 Control desconectado»;
  - cruceta + botón de abajo: avanza y salta;
  - palanca izquierda = ←; Start pausa.
- Preferencia recordada tras recargar: Axo «🔘 Botones» (los botones de antes funcionan con toque real) y Dragon
  «👆 Tocar la pantalla» (tocar el juego salta).
- Medidas: solo los botones del juego; todo dentro de la pantalla y sin desplazamiento horizontal.
  - Axo: 390×844, 360×640, 640×360 y 844×390, con el mando debajo del juego en vertical y encimado en horizontal.
  - Dragon Run: las mismas medidas.
- Mando completo con palanca:
  - eje x = 1 al arrastrar; palanca + R a la vez; regresa al centro al soltar;
  - la diagonal de la cruceta presiona dos direcciones;
  - un botón desconocido lanza un error que lo nombra.

## Capturas revisadas (tests/e2e/salida/, ignorada por git)

- Axo:
  - vertical: `mando-axo-390-portada`, `-390-vertical`, `-390-pausa` y `-390-botones`;
  - otras medidas: `mando-axo-360x640`, `-640x360` y `-844x390`.
- Dragon Run:
  - vertical: `mando-dragon-390-vertical`, `-390-pausa` y `-390-toque`;
  - otras medidas: `mando-dragon-360x640`, `-640x360` y `-844x390`.
- Escritorio y control: `mando-escritorio-axo`, `mando-escritorio-guia`, `mando-escritorio-dragon-pausa` y
  `mando-control-conectado`.
- Mando completo: `mando-completo-390`.
- Resultado:
  - en vertical, el mando se ve como una consola portátil debajo del juego, con L/R, cruceta, palanca, rombo de
    colores con letras y START/SELECT;
  - en horizontal queda encimado en las esquinas sin tapar el centro.
- Ajustes hechos tras revisar:
  - sin L/R ya no se reserva el espacio de los gatillos;
  - el hueco del rombo solo aparece con los 4 botones;
  - los botones son más grandes en horizontal (`--u` 28–44 px);
  - hay más margen inferior cuando hay nombres bajo los botones;
  - el aviso del control se movió al 22 % de la altura para no tapar el HUD.

## Verificación manual (paso 6.1)

- Axo y Dragon Run sueltos a 320×568 y 568×320 con toque real: la cruceta mueve, A salta, nada queda fuera y no hay
  desplazamiento horizontal.
- Sin `localStorage` (el acceso lanza error) y sin Gamepad API: Axo cambia a «Botones» sin errores y Dragon salta con
  el mando.
- `prefers-reduced-motion`: los botones del mando no tienen transición.
- Sin errores JS en las páginas.

## Verificación de estado

- Antes: la copia de datos de prueba se crea limpia en un directorio temporal en cada corrida (`correr.sh`); la carpeta
  de origen no se toca.
- Después: la E2E solo escribe avance de Axo (`enCurso`) de `fernando@example.com` en esa copia temporal; no termina
  partidas ni guarda puntos.
- Estado restaurado: Sí — `correr.sh` borra la copia temporal al terminar. Sin Postgres, Supabase, Notion ni
  producción.

## Resultado

- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente (usuario, tras el merge): probar en un Android, un iPhone y con un control físico real.
