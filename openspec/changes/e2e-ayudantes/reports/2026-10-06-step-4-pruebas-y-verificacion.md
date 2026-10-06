# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-06
- Cambio: e2e-ayudantes
- Agente: Claude Code (Opus 5.5)
- Rama: `feature/e2e-ayudantes`, base `4fd44e8` (Merge PR #121)

## Comandos ejecutados
- Línea base (antes de tocar las pruebas) y corrida posterior, mismos puertos y copia de datos:
  `CHROME=<chromium-1228> bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 8867 --puerto-web 8845`
- Repetición de la intermitencia: `bash tests/e2e/correr.sh ... portal` (2 veces)
- `node --check` de las 36 pruebas y revisión de identificadores sin declarar (`BASE`, `API`, `Q`, `URL`,
  `abrirPagina`, `urlDe`) sobre los archivos migrados
- `npx -y deno test -A server/`
- `npx -y deno lint server/`
- `npx -y @fission-ai/openspec@1.4.1 validate e2e-ayudantes --strict`

## Resultados de pruebas

### E2E: pasos PASS por prueba

| Prueba | Migrada | Antes | Después | Estado |
|---|---|---|---|---|
| actividades-datos | no | 6 | 6 | igual |
| alta-alumnos | sí | 11 | 11 | igual |
| inicio-lunes | sí (en línea) | 6 | 6 | igual |
| segunda-oportunidad | sí | 8 | 8 | igual |
| pronunciacion | sí | 11 | 11 | igual |
| profe-grupo | sí (en línea) | 7 | 7 | igual |
| ruta-profe | sí | 15 | 15 | igual |
| profe-diseno | sí (en línea) | 11 | 11 | igual |
| examen-secundaria | sí | 10 | 10 | igual |
| autoguardado | sí (en línea) | 24 | 24 | igual |
| grupos | no (`--pg`) | OMIT | OMIT | igual |
| ingles-pro | no (`--pg`) | OMIT | OMIT | igual |
| login | sí | 58 | 58 | igual |
| portal | no | 16 | 15 + 1 FAIL → 16 al repetir (2/2) | intermitente, archivo sin cambios |
| juegos | sí | 26 | 26 | igual |
| jugadores | sí | 7 | 7 | igual |
| nick | sí | 7 | 7 | igual |
| partidas | sí | 15 | 15 | igual |
| enlace-sala | sí (en línea) | 8 | 8 | igual |
| juegos-recarga | sí | 37 | 37 | igual |
| conquian-estres | sí (en línea) | 3 | 3 | igual |
| clasicos | sí (en línea) | 11 | 11 | igual |
| fusion | sí (en línea) | 10 | 10 | igual |
| sudoku | sí (en línea) | 15 | 15 | igual |
| dragon-run | sí (en línea) | 9 | 9 | igual |
| puntos-tipo | sí | 8 | 8 | igual |
| basta-rondas | sí | 12 | 12 | igual |
| loteria-sala | sí | 10 | 10 | igual |
| una-sala | sí | 12 | 12 | igual |
| una-robo | sí (en línea) | 3 | 3 | igual |
| poker | sí | 10 | 10 | igual |
| cartas-espanolas | sí | 12 | 12 | igual |
| ajedrez | sí | 12 | 12 | igual |
| ajustes-salas | sí | 8 | 8 | igual |
| ritmo | sí (en línea) | 2 | 2 | igual |
| avatar-foto | sí | 16 | 16 | igual |
| login-despues | sí (reutiliza `login`) | 6 | 6 | igual |

- Línea base: 35 corridas, 35 PASS, 0 FAIL, 2 omitidas.
- Después: 35 corridas, 34 PASS, 1 FAIL (`portal`, «Inglés entra sin volver a pedir el correo»), 2 omitidas.
  `e2e-portal.js` no se tocó en este cambio (`git diff` vacío) y no usa el ayudante; repetida sola dos veces: 16
  PASS ambas. Es la intermitencia ya conocida de `portal`.
- Las 32 pruebas migradas (más `login-despues`) tienen exactamente los mismos pasos PASS que en la línea base.
- Duración: ~30 min cada corrida completa.

### Servidor
- `deno test -A server/`: 228 pasaron, 0 fallaron, 6 ignoradas (las de `DATA_DIR`, como siempre).
- `deno lint server/`: 58 archivos revisados, sin hallazgos.
- `git diff --stat HEAD -- server/`: vacío (la rama no toca `server/`).

## Verificación manual (Step 5, CLI) — ejecutada por el agente
- 5.1 Script con Chromium real y un origen falso (`BASE=http://prueba.local`, respuestas con `route`, sin servidor):
  18 PASS, 0 FAIL, salida 0. Cubre `urlDe` (ruta simple, query, `#hash`, portal); `abrirPagina` sin `email` (sin
  claves de sesión, 390×844, página en blanco sin `ruta`); con `email`, `viejo: true`, `ingles`, `tiempo`, `init` y
  `viewport`; etiquetas de error JS (por omisión el correo, `'invitada'`, `''`); `dialogos` `aceptar`
  (confirm → true), `registrar` (`p.alertas`) y sin manejador (confirm → false); y error claro si la ruta no responde.
- 5.2 `correr.sh ... nick jugadores` (válido): 2 corridas, 2 PASS, salida 0. `correr.sh ... no-existe`
  (inválido): `ERROR: prueba desconocida: no-existe. Disponibles: …`, salida 2.

## Verificación de estado
- Antes: copia de datos `<scratchpad>/data` sin modificar; `correr.sh` trabaja sobre una copia temporal.
- Después: `correr.sh` borra su copia temporal al terminar; la copia del scratchpad no se escribió. Sin `--pg`: no
  se tocó Supabase (`stald_test_*` ni `stald_*`) ni producción.
- Estado restaurado: Sí — no hubo nada que restaurar fuera de la copia temporal.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno. Pendiente: migrar `grupos` e `ingles-pro` cuando se pueda correr con `--pg`.
