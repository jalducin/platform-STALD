# Reporte PR 4 — Pruebas estables (tareas 4.1, 4.2 y 4.3)

- Fecha: 2026-10-22
- Cambio: navegacion-mejoras (PR 4, rama `feature/pruebas-estables`)
- Agente: Claude Code (Opus 5.5)

## Causas

- **`ingles-diseno-profe` «🌍 Mundos» (4.1).** `correr.sh` ya borra la ruta real de la copia y superpone el plan de
  ejemplo (`fix-e2e-rpg`), pero ese plan tenía 3 semanas. `Gamificacion.mapaRuta` asigna los mundos por número de
  semana (1–2 Taller, 3 Fábrica, …, 8 Proyecto Integrador) y por título (Minto, Skills): solo había clases en 2 de 9.
- **`server/salas_grandes_test.ts:243` «dibuja» (4.2).** No es reloj, orden ni tiempo real: es el azar del secreto.
  La prueba buscaba `"<traducción>"` como texto en todo el JSON y la respuesta trae la llave `"reloj": <ms>`. Cuando la
  palabra del turno 0 era «clock / reloj» (1 de 186 palabras), fallaba sin fuga. Diagnóstico: 40 de 40 respuestas
  traían la llave `reloj` y es la única palabra del vocabulario que coincide con una llave; el secreto
  `000000000000000000000009` da «reloj» en el turno 0.
- **`navegacion-dispositivos` tope de 8 s (4.3).** Picos aislados por carga de la máquina (otras suites a la vez).

## Comandos ejecutados

- `npx -y deno test -A server/salas_grandes_test.ts --filter "dibuja: la palabra"` × 30 (script de repetición en el
  scratchpad de la sesión).
- `npx -y deno test -A server/` × 30.
- `npx -y deno test -A server/`, `npx -y deno check server/main.ts`, `npx -y deno lint server/` (agente
  `verificador-pruebas`).
- `npx -y @fission-ai/openspec validate navegacion-mejoras --strict`.
- `CHROME=… bash tests/e2e/correr.sh --datos <copia temporal> --puerto-api 9061 --puerto-web 9062 material profe-grupo
  pronunciacion ruta-profe profe-diseno ingles-diseno-profe ingles-admin navegacion-dispositivos portal-diseno`.
- `NAV_TOPE_MS=400` y `NAV_TOPE_MS=900` con `NAV_SOLO=ingles-material,juegos-invitado navegacion-dispositivos`
  (prueba del reintento), y `navegacion-dispositivos ingles-diseno-profe` con el tope real.

## Resultados de pruebas

- Dibuja sola: **30/30** corridas en verde (cada una corre el caso al azar y el caso fijo «reloj»).
- Suite completa × 30: Dibuja **30/30** en verde. La suite quedó 29/30: en la corrida 10 falló una sola vez
  `server/en_vivo_test.ts` «conectar: ritmo por evento a hz…», que usa reloj real (`setTimeout`, 3 s) y coincidió con
  otra suite completa corriendo en paralelo. Es ajena a este cambio; queda anotada como siguiente candidata.
- Suite unitaria una vez: 1077 pasaron, 0 fallaron, 6 omitidas (las de `DATA_DIR`). `deno check` y `deno lint` OK.
- OpenSpec `validate --strict`: válido.
- E2E: 8 PASS, 0 FAIL, 1 OMIT (`pronunciacion`: sin actividad de pronunciación en la copia, igual que en `main`).
  `ingles-diseno-profe` 93 pasos, con «🌍 Mundos» = los 9 mundos en claro y oscuro y «Plan del mes: 12 clases y 4
  abiertas»; `ruta-profe` 21 y `profe-diseno` 11 pasos en verde con el plan de 8 semanas.
- Reintento de tiempo: con `NAV_TOPE_MS=400` fallan las tareas que se pasan dos veces (p. ej. 461 → 468 ms); con
  `NAV_TOPE_MS=900` pasan las que bajan al repetir (1273 → 644 ms, 960 → 457 ms) y fallan las que se pasan dos veces
  (2337 → 2827 ms). La tabla cierra con «Tiempo máximo observado».
- Con el tope real (8000 ms): `navegacion-dispositivos` 308 pasos PASS e `ingles-diseno-profe` 93 PASS; tiempo máximo
  observado 6003 ms en `profe-grupos (pc)`, sin reintentos.
- Tras el merge de `main` (#251, panel del profe): `deno test -A server/` 1089 pasaron, 0 fallaron, 6 omitidas; E2E
  `ruta-profe` 21, `profe-diseno` 11, `ingles-diseno-profe` 95 y `navegacion-dispositivos` 311 pasos, todos PASS;
  tiempo máximo observado 1762 ms en `juegos-invitado (tablet-h)`, sin reintentos.

## Verificación de estado

- Antes: copia temporal del repo de datos en el scratchpad; ninguna tabla `stald_*` ni `stald_test_*` (sin `--pg`).
- Después: `correr.sh` borra su copia temporal al terminar; la copia del scratchpad no se modifica (se copia).
- Estado restaurado: Sí — sin datos reales tocados.

## Resultado

- Estado: PASS
- Bloqueos: ninguno.
