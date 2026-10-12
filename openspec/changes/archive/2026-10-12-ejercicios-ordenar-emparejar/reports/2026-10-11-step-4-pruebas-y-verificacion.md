# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: ejercicios-ordenar-emparejar
- Agente: Claude Code (Opus 5.5), Sprint 1 (código)

## Comandos ejecutados
- `npx -y deno test -A --no-check server/ordenar_emparejar_test.ts`: en rojo antes de implementar (0 pasaron,
  10 fallaron)
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- `npx -y deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <copia del repo de datos en el scratchpad> --puerto-api 8927 --puerto-web 8905
  actividades-datos alta-alumnos inicio-lunes segunda-oportunidad pronunciacion profe-grupo ruta-profe profe-diseno
  presentar examen-secundaria autoguardado ordenar-emparejar` (con `CHROME` = Chromium 1228 de Playwright)
- Verificación manual (Step 5) con un servidor local (puerto 8981) sobre una copia temporal de los datos:
  - `curl` a `/ingles/actividades/fichas-e2e` como Fernando, sin sesión, como otra alumna y como admin;
  - `deno run --allow-read server/validar_semana.ts <copia> 2026-09-21`, antes y después de romper la actividad.

## Resultados de pruebas
- Dirigidas, `server/ordenar_emparejar_test.ts`: 10 pasaron, 0 fallaron.
- Suite de Deno completa: 268 pasaron, 0 fallaron, 6 omitidas (marcadas `ignore` en la suite; ninguna es de este cambio). `lint`:
  66 archivos sin errores. `check`: OK.
- E2E de la fase `ingles`: 12/12 PASS.
  - `actividades-datos` 6, `alta-alumnos` 13, `inicio-lunes` 6, `segunda-oportunidad` 8, `pronunciacion` 11,
    `profe-grupo` 7, `ruta-profe` 15, `profe-diseno` 11, `presentar` 11, `examen-secundaria` 10,
    `autoguardado` 29.
  - Nueva `ordenar-emparejar`: 36 pasos. Cubre:
    - fichas y columna derecha barajadas, nunca en el orden correcto, iguales en la API y en la página, y sin
      respuestas en la vista pública;
    - tocar, regresar y «Borrar»; teclado (Enter y Espacio), anuncios `aria-live` y `aria-label` con la posición;
    - unir pares (color y número), deshacer y unir empezando por la derecha; con pares incompletos no cuenta como
      respondida;
    - recarga a medio intento: borrador parcial en la cuenta, oración y pares restaurados y «Recuperamos tus
      2 respuestas»;
    - 🔊 en un `ordenar` con `audio`;
    - 390 px sin desborde horizontal;
    - envío con errores (50 %) y revisión con lo armado, los pares propios y los correctos;
    - corrección: 2 por corregir, «Antes respondiste», la oración correcta fija y armada, y 100 % con otro orden
      aceptado;
    - servidor con 2 intentos y mejor 100 %;
    - vista previa del admin, sin respuestas ni borrador.
- Duración: unos 2 min las E2E de la fase y unos 6 s `deno test`.

## Capturas (tests/e2e/salida/, ignorada por git)
- `ordenar-emparejar-paso-390.png`: modo paso en el celular.
- `ordenar-390.png` y `emparejar-390.png`: los dos ejercicios a 390 px, sin las barras fijas.
- `ordenar-emparejar-390.png` y `ordenar-emparejar-resultado-390.png`: página completa y resultado.

## Verificación manual (Step 5)
- La vista pública de Fernando trae:
  - `fe-o1`: `fichas` `[going, tomorrow, will, travel, I]`;
  - `fe-o2`: `audio` + `fichas` `[is, a, reading, She, book]`;
  - `fe-m1`: `izquierda` + `derecha` `[estos / estas, esos / esas, ese / esa / aquel, este / esta]`.
  - Ninguno trae `palabras`, `distractores`, `aceptadas`, `pares` ni `explicacion`.
- POST con `fe-m1: [0,1,2,3]` (malformado): 2/4. En la revisión, `fe-m1` aparece con «tu respuesta» `null` (sin
  responder) y los pares correctos, y `fe-o2` con «She is a book» frente a «She is reading a book».
- Sin sesión: 400 (`missing_email`). Otra alumna (Marisol): 404. Admin: `vistaPrevia: true`, sin respuestas.
- `validar_semana.ts`:
  - con la actividad válida: 0 errores (3 avisos de calendario de la semana de prueba) y salida 0;
  - con 2 pares y la ficha repetida "Will": 2 errores (`ficha repetida "Will"` y `emparejar con 2 pares (3 a 6)`)
    y salida 1.

## Verificación de estado
- Antes: la copia original de datos (scratchpad/data) no se tocó. `correr.sh` y la verificación manual trabajaron
  sobre copias temporales.
- Después: la copia temporal de la verificación manual (`scratchpad/manual`) se borró, y el servidor local
  (puerto 8981) se detuvo. No se tocaron producción, Supabase, `stald_*`, `.env` ni Notion.
- Incidencia: por error, los primeros `curl` de la verificación manual fueron al puerto 8937, que ocupaba otro
  proceso local. Ese servidor no tiene `fichas-e2e`: respondió sin la actividad y no guardó nada. Después se usó
  el puerto libre 8981.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
