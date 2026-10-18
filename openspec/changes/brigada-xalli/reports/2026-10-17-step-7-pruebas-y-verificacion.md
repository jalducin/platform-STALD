# Reporte Step 7 — Pruebas y verificación de estado (PR 1: juego individual)

- Fecha: 2026-10-17
- Cambio: brigada-xalli
- Agente: Claude Code (sprint 39)

## Comandos ejecutados

- TDD:
  - `npx -y deno test -A server/brigada_motor_test.ts` antes del motor (falla porque el módulo no existe);
  - `server/brigada_test.ts` antes del servidor (3 de 4 fallan).
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --archivo …` sobre los archivos nuevos y compartidos)
- `CHROME=… bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 9995 --puerto-web 10005 brigada juegos categorias partidas emocion mando`
  - el puerto 9991 quedó ocupado por una corrida detenida; por eso 9995.
- Huella del motor (`scratchpad/traza.ts`, misiones "1 1 a", "3 4 c" y "4 8 d") antes y después del refactor de calidad: idéntica.
- curl contra un servidor local (puerto 9993, copia de datos en el scratchpad): `scratchpad/curl-brigada.sh`.

## Resultados de pruebas

- Dirigidas:
  - `server/brigada_motor_test.ts`: 17/17.
  - `server/brigada_misiones_test.ts`: 7/7 (rama de contenido).
  - `server/brigada_test.ts`: 4/4.
- Piloto automático: termina las 4 misiones con 1 (dos semillas), 4 y 8 personajes, con ≤ 3 reintentos y puntos plausibles.
- Suite del servidor: 717 pasaron, 0 fallaron, 6 omitidas. `deno lint` y `deno check` sin problemas.
- Calidad:
  - archivos nuevos (`juegos/brigada*.js`, `juegos/brigada.html`, `server/brigada*.ts`, `tests/e2e/e2e-brigada.js`): 0 avisos;
  - total del repo: 317, el mismo que dejó el sprint anterior.
- E2E `brigada`: 32/32. Cubre:
  - catálogo y portada;
  - joystick, A, B mantenido, X e Y con toques reales;
  - rescate, robot derribado, jefe vencido, fin con estrellas, avance en el servidor y puntos guardados;
  - mando clásico con toque real y control físico;
  - compañeros IA, teclado, pausa y reintento.
- E2E del resto de la plataforma, sin fallas:

  | Prueba | Pasos |
  | --- | --- |
  | `juegos` | 31/31 |
  | `categorias` | 49/49 |
  | `partidas` | 15/15 |
  | `mando` | 64/64 |
  | `emocion` | 45/45 |
- fps con CPU ×4:
  - 60 a 844×390 con 4 personajes y enemigos;
  - 60 en escritorio 1280×800.

## Verificación manual (curl, servidor local)

| Caso | Resultado |
| --- | --- |
| GET sin avance | 200 `{ v: 0, datos: null }` |
| PUT válido v0 | 200 `{ ok, v: 1 }` y el GET lo devuelve igual |
| PUT con versión vieja | 409 `version_vieja` con lo guardado |
| Récord imposible / misión bloqueada / llave extra | 400 `progreso_invalido` |
| Ranking mandando 5000 | se guardan 1000 (tope del catálogo) |
| Sin sesión ni correo | 400 `missing_email` |

## Capturas revisadas (tests/e2e/salida/)

Capturas: `brigada-390-portada.png`, `brigada-390-accion.png`, `brigada-390-jefe.png`, `brigada-390-fin.png`,
`brigada-390-mando.png`, `brigada-844-portada.png`, `brigada-844-accion.png`, `brigada-844-jefe.png`,
`brigada-escritorio-accion.png` y `brigada-escritorio-fallida.png`.

Iteraciones tras revisarlas:
- en horizontal, el rombo A/B/X/Y es más chico (B se salía por abajo);
- el aviso «Mejor con el celular de lado» pasó arriba (tapaba al personaje);
- la barra de la misión es más angosta y se oculta el título en pantallas angostas (se encimaba con los puntos);
- se usa el arte de `juegos/brigada-arte.js` (rama de contenido): jefes con aviso «!» y fondos con paralaje.

## Verificación de estado

- Antes: copias de datos en el scratchpad (E2E y curl); ninguna tabla `stald_` involucrada (sin `--pg`).
- Después: las copias se descartan; el repo de datos original no se toca.
- Estado restaurado: Sí — servidores locales apagados.

## Resultado

- Estado Step 7: PASS
- Bloqueos: ninguno
