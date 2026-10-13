# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: personajes-estilo-karts
- Agente: Claude (Opus 5.5)

## Comandos ejecutados

- `npx -y deno test -A server/personajes_test.ts` (antes de implementar: 3 de 4 fallaban; después: 4 pasan)
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia temporal de datos> --puerto-api 9319 --puerto-web 9329 karts plataformas mando emocion juegos categorias`
- Repetición aislada: `… correr.sh … plataformas karts`
- `cd tests/calidad && npm run calidad` (y `calidad:detalle` para revisar los archivos tocados)
- Script de Playwright (fuera del repo) con `Emulation.setCPUThrottlingRate` ×4: carrera rápida con piloto de prueba y turbo
  (Karts) y el 1-1 corriendo y saltando (Axo), 5 s por caso, a 390×844 y 844×390, DPR 2 y 3.
- Hojas de revisión: `__karts.hojaPilotos()` y `hojaPerfiles()` (8 personajes, todas las poses, champiñón y chile).

## Resultados de pruebas

- Unitarias nuevas (`server/personajes_test.ts`): 4 pasaron, 0 fallaron.
- Suite Deno completa: 562 pasaron, 0 fallaron, 6 omitidas; lint: 102 archivos sin errores.
- E2E (primera corrida): juegos 31/31, categorias 49/49, mando 64/64, emocion 45/45; plataformas 111/112 y karts 186/187.
  - karts: «tras recargar sigue elegida Xochiquetzal» era un supuesto viejo de la prueba (el recorrido ahora termina en
    Kinich); se corrigió para usar el último personaje de la lista.
  - plataformas: «Xalli camina con el teclado» falló una vez mientras corría en paralelo la medición de fps (CPU
    compartida); no se tocó el código del paso.
- E2E (repetición aislada): plataformas 112/112 y karts 187/187.
- Calidad: sin avisos nuevos en los archivos tocados (se corrigieron un ternario anidado, dos complejidades —Tlali y
  Tona— repartiendo el dibujo en funciones, una asignación sin uso y un `if` de una línea en `spriteKart`). Los avisos
  de complejidad que quedan en `personajes.js` (`cara`, `pintarXalli`, `pintarYahui`) ya estaban en `main`.

## Rendimiento (CPU ×4)

| Personaje | Karts 390×844 | Karts 844×390 | Axo 390×844 | Axo 844×390 |
|---|---|---|---|---|
| Xalli (referencia) | 48–53 | 52–53 | 57–58 | 60 |
| Xolo | 50–51 | 38–50 | 60 | 60 |
| Tlali | 50–51 | 50–52 | 60 | 60 |
| Tona | 51–55 | 42–47 | 60 | 60 |
| Kinich | 47–52 | 47–49 | 60 | 59–60 |

Axo sostiene 60 fps con los 4. En Karts, con la máquina cargada por otros agentes, **Xalli (sin cambios) da lo mismo**
que los personajes nuevos (~50 fps con turbo y partículas): los personajes nuevos no restan cuadros (su sprite se dibuja
una vez por vista y se reutiliza). Queda pendiente medir 60 fps en Karts con la máquina libre o en un celular real.

## Verificación de estado

- Antes: copia temporal del repo de datos en el scratchpad; sin Postgres (`stald_*` no se tocó).
- Después: la copia temporal se descarta; ningún dato real cambió.
- Estado restaurado: Sí — no hubo escrituras fuera de la copia temporal.

## Verificación manual (EL AGENTE EJECUTA)

- Hoja de perfiles con los 8 en todas las poses: los 4 nuevos con contorno, brillo y ojos del mismo estilo; se
  reconocen por su silueta (orejas de Xolo, sombrero y pata en «Z» de Tlali, caparazón de Tona, pluma y pelota de
  Kinich). Ajustes tras revisar: yelmo de Tona más alto y orejera hacia atrás (parecía antifaz); pintura de Kinich más
  tenue; caparazón de Tona en Karts más arriba (lo tapaba el respaldo de espaldas).
- Hoja de pilotos (6 vistas) y capturas de cerca en carrera con turbo: de espaldas se leen las orejas, el sombrero con
  antenas, el caparazón con orejeras y el moño con pluma y la pelota; la estela de cada uno sale con turbo.
- Selectores a 320×640, 390×844 y 844×390 en los dos juegos: 4×2 sin desplazamiento lateral; «Xochiquetzal» se recorta
  con elipsis a 320 px y su nombre completo sale en la línea de detalle.
- Casos de error cubiertos por las E2E: movimiento reducido (sin partículas), `arcade_personaje` desconocido → Xalli,
  sin `localStorage` → Xalli.

## Resultado

- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente: medir Karts a 60 fps con la máquina libre o en un celular real.
