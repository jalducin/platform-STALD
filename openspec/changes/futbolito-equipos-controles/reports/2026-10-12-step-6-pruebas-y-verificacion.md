# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: futbolito-equipos-controles
- Agente: Claude Code (Opus)

## Comandos ejecutados
- `npx -y deno test -A server/` (4 corridas) y `npx -y deno lint server/`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 9049 --puerto-web 9048 futbolito billar mando karts juegos`
  (los puertos pedidos 9009/8999 estaban ocupados por otro agente: el 8999 escuchaba con otro PID; `correr.sh` se niega a usarlos)
- `bash tests/e2e/salida/curl-futbolito.sh` contra un servidor local con una copia desechable de los datos
- Diagnóstico previo: `tests/e2e/salida/diag.js` y `diag2.js` (resultados en `design.md` §1)

## TDD (rojo antes de implementar)
- Deno: `server/futbolito_equipos_test.ts` falló al cargar (`server/futbolito.ts` no existía).
- E2E: `futbolito` falló en la ayuda «PATEA» y en `#c-patea` (no existían); `billar` falló en el selector, en
  «tocar la mesa sin arrastrar no cambia la mira» (`0 → 1940`) y en «tocar junto a la blanca no dispara»
  (`animando: true`), lo mismo que midió el diagnóstico.

## Resultados de pruebas
- Deno: 474 pasaron, 0 fallaron, 6 omitidas (12 pruebas nuevas en `server/futbolito_equipos_test.ts`). En 1 de 5
  corridas falló `dibuja: la palabra solo la recibe quien dibuja` (`server/salas_grandes_test.ts`, no tocada): compara
  un `secreto` aleatorio con `includes` sobre todo el cuerpo y puede coincidir por azar. Pasa sola y en las otras 4
  corridas. Es intermitente y ajena a este cambio.
- Lint: 93 archivos sin hallazgos.
- E2E: `juegos` 31/31, `futbolito` 55/55, `billar` 33/33, `mando` 64/64. `karts` 125/126: falla `acelera solo tras
  ¡YA!` (`vel` 138 < 150 a los 1.5 s de reloj). Al repetirla sola también falla `mini-turbo morado tras derrapar 2.1 s`.
  Son verificaciones por tiempo de reloj y la máquina tenía unos 100 procesos de Chrome de otros agentes.
  `juegos/karts.html` y `juegos/mando.js` no cambian respecto a `origin/main`. Hay que repetirla con la máquina libre.
- Duración: unos 14 min la batería.

## Verificación manual (curl, EL AGENTE EJECUTA)
1 formato `3v3` → 400 `formato_invalido`. 2 sin sesión → 400 `missing_email`. 3 crear 2v2 → 200 con
`opciones.formato: "2v2"`. 4-5 Angel y Laura piden el azul → 200 `equipo: 1`. 6 Fernando pide el azul → 409
`equipo_lleno`. 7 Fernando entra sin preferencia → 200. 8 `equipo: 7` → 400 `equipo_invalido`. 9 quinta persona → 409
`sala_llena`. 11 tiro sin `barra` en 2v2 → 400 `jugada_invalida`. 12 Marisol con la barra 6 (de Fernando) → 409
`no_es_tu_barra`. 13 con la barra 4 → 200 y se guarda `barra: 4`. 14 cambiar de equipo ya empezada → 409 `ya_empezo`.
15 alguien fuera de la sala → 403 `no_en_sala`. 16 pedir equipo en 1v1 → 409 `sin_equipos`.

## Capturas revisadas
Futbolito: 320×640 y 390×844 con Botones y con Mando, 844×390 con Botones y con Mando, menú con el selector, sala 1 vs 1
con bot y de 2 personas, sala de espera 2 vs 2 con equipos, juego 2 vs 2 a 390 y 844×390, podio 2 vs 2. Billar: 390
con el panel nuevo, 320×640 táctil y con mando, 844×390 táctil y con mando, salas. Correcciones hechas tras revisarlas:
- el marcador de Futbolito se encimaba con 🎮 🔊 ⏸;
- en horizontal, START del mando tapaba la mesa (subió a la esquina superior derecha);
- los nombres se encimaban en horizontal (ahora hay uno por asiento);
- el panel de tiro de Futbolito no cabía en horizontal y el marco de la sala no se desplazaba a la vista;
- el panel de Billar se desbordaba 2 px a 844×390.

## Verificación de estado
- Antes: copia de datos en `scratchpad/data` (sin cambios); sin tablas `stald_` (no se usó `--pg`).
- Después: `correr.sh` usa una copia temporal que borra al terminar; el servidor del curl usó
  `scratchpad/f20/copia`, desechable. Nunca se escribió en tablas `stald_`.
- Estado restaurado: Sí (copias desechables).

## Resultado
- Estado Step 6: PASS para Futbolito, Billar, Juegos, Mando y Deno. Karts queda pendiente de repetir con la máquina
  libre: sus fallas son por tiempo y ajenas al cambio.
- Bloqueos: ninguno.
