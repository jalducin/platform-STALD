# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-17
- Cambio: karts-copa-espacio
- Agente: Claude Code (Opus 5.5), agente del sprint 35

## Comandos ejecutados
- `npx -y deno test -A server/` (antes y después de mezclar `origin/main` con #197 Futbolito Arena)
- `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad`
- `CHROME=…/chromium-1228/chrome-win64/chrome.exe bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9891 --puerto-web 9901 karts karts-vivo juegos categorias`
- `npx -y @fission-ai/openspec@1.4.1 validate karts-copa-espacio --strict`

## Resultados de pruebas
- Dirigidas: `server/karts_espacio_test.ts` 15 pasaron, 0 fallaron (escrita primero, en rojo; TDD). Ajustadas sin fijar
  listas: `server/karts_pistas_test.ts` (las 8 de antes + las que se agreguen).
- Suite del servidor: 696 pasaron, 0 fallaron, 6 omitidas (tras el merge); `deno lint` y `deno check` sin errores.
- E2E (tras el merge): `karts` 251 PASS, `karts-vivo` 71 PASS, `juegos` 31 PASS, `categorias` 49 PASS; 0 FAIL.
  - Cada pista espacial: selección con 8 corredores, sus mecánicas, minimapa, su mecánica actúa (antiturbo, salto del
    hueco sin caer, plataforma, portal), caída al vacío con el dron de rescate, vuelta completa con el piloto de prueba,
    capturas a 390×844 y 844×390.
  - Copa del Espacio: bloqueada sin 2 podios («te faltan 2», «falta 1»), abierta con 2 podios, empieza en la Estación
    Orbital y se guarda `copaEnCurso.copa = espacio` (carrera 2: Anillos de Saturno).
  - Salas: el selector ofrece todas las pistas; sala de 8 en vivo en la Nebulosa Esmeralda; copa completa del espacio en
    sala (el servidor la arma con las 4 pistas en orden y la carrera 1 es en la Estación para las dos personas); el
    `<select>` de copas sale en orden de dificultad.
- Calidad: 317 avisos en total; `juegos/karts.html` 15 (igual que antes), `juegos/karts-espacio.js` 0, `salas.js` 4
  (igual): sin avisos nuevos.
- Rendimiento (CPU ×4, 390×844, mediana de 5 lecturas; máquina con Docker y un IDE abiertos, ≈ 30 % de carga de base):
  Estación 58, Anillos 60, Cinturón 60, Nebulosa 60 fps; las 8 de antes 60. Sala con 8 karts en vivo: Pradera 59 y
  Nebulosa 56 fps con CPU ×4, 60 sin límite. Con la máquina cargada por otros procesos, una lectura suelta baja a 51–53
  también en pistas viejas (Desierto 53 en una corrida y 60 en la siguiente): es ruido de la medición, no de las pistas.
- Duración: ≈ 25 min la suite E2E pedida.

## Verificación de estado
- Antes: copia temporal de los datos de prueba (`correr.sh` copia `--datos` y nunca toca el original); sin Postgres.
- Después: `correr.sh` borra la copia al terminar; el progreso de prueba (`angel@example.com`) solo existió en la copia.
- Estado restaurado: Sí — no se escribió en tablas `stald_`, Notion, Supabase ni `.env`.

## Verificación manual (EL AGENTE EJECUTA)
- Revisé las capturas de cada pista (390×844 y 844×390), la caída, el dron, el portal, la plataforma y el hueco, e iteré:
  franja de la galaxia más suave, resplandor del vacío más oscuro, rocas con sombreado y cráteres, texto del candado más
  corto, bots que miran más cerca en el espacio (al mirar lejos cortaban las curvas abiertas y caían) y portal de la
  Nebulosa en una recta.
- Carrera completa con el piloto de prueba en las 4: 0 caídas propias sin forzar; los bots caen ≈ 0–1 vez por carrera
  en las pistas difíciles (misma física).

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente tras la aprobación del profe: verificación en producción (tarea 5.2).
