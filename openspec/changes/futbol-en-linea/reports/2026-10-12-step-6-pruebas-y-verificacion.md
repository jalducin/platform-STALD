# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-12
- Cambio: futbol-en-linea
- Agente: Claude Code (sprint 27B)

## Comandos ejecutados

- `npx -y deno test -A server/futbol_linea_test.ts` (antes de implementar: falla de tipos por el módulo inexistente, TDD)
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y `node calidad.mjs --archivo …` sobre las versiones de `origin/main` para comparar)
- `CHROME=… bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 9459 --puerto-web 9469 futbol futbol-en-linea juegos categorias partidas emocion`
  (los puertos 9359/9369 estaban ocupados)
- Verificación con curl contra un servidor local (puerto 9559, copia de datos en el scratchpad con los datos de ejemplo)

## Resultados de pruebas

- Dirigidas: `server/futbol_linea_test.ts` 8/8 y `server/futbol_red_test.ts` 8/8, `server/mesas_test.ts` 2/2.
  - Partido completo simulado (150 ms, 10 % de pérdida, 20 % de desorden): mismo marcador en los dos aparatos, un aviso
    de gol por gol, p90 del peor jugador a 0.09 m de la posición del anfitrión en el mismo instante; 904 de 1000 fotos
    recibidas.
  - Foto: < 600 B en JSON (error de posición ≤ 0.025 m); entrada ≤ 40 B.
- Suite del servidor: 574 pasaron, 0 fallaron, 6 omitidas (27 s). `deno lint server/` y `deno check` sin problemas.
- Calidad: total 317 avisos (antes 332 con el primer borrador). En los archivos compartidos los avisos son los mismos
  que en `origin/main` (ninguno nuevo); solo subió la complejidad ya señalada de `pintarSala` (16→17), el clic de la
  sala en `arranque.js` (23→24) y `cambioDeRespuesta` (17→18). Los archivos nuevos no tienen avisos.
- E2E: `juegos` 31/31, `categorias` 49/49, `partidas` 15/15, `futbol` 52/52, `futbol-en-linea` 18/18,
  `emocion` 45/45 (6 corridas, 6 PASS).

## Verificación manual (curl, servidor local)

| Caso | Resultado |
| --- | --- |
| Crear sala `futbol` con `bots: true` | 200, `bots: false` |
| Empezar sola | 409 `faltan_jugadores` |
| Tercera persona | 409 `sala_llena` |
| Táctica válida `{ formacion: "4-3-3", presion: 80 }` | 200 con la táctica completa |
| Táctica `9-0-1` | 400 `tactica_invalida` |
| Resultado antes de empezar | 409 `no_empezo` |
| 25–0 en 40 s / 10 min recién empezada | 400 `resultado_invalido` |
| Persona fuera de la sala | 403 `no_en_sala` |
| Admin ve la sala | 200 |

## Capturas revisadas (tests/e2e/salida/)

`futbol-linea-390-espera.png` (pizarra táctica en la sala de espera), `futbol-linea-844-partido.png` (partido del
invitado con 📶 80 ms), `futbol-linea-844-gol.png`, `futbol-linea-390-desconexion.png` (aviso «Se perdió la conexión
con Angel. La IA juega por su equipo · se cierra en 15 s»), `futbol-linea-844-sin-anfitrion.png`,
`futbol-linea-390-podio.png` / `-844-podio.png` (1–1 «Resultado confirmado por los dos aparatos»),
`futbol-linea-390-respaldo.png` / `-844-respaldo.png`. Todo cabe a 390×844 y a 844×390.

## Verificación de estado

- Antes: copias de datos en el scratchpad (E2E y curl); ninguna tabla `stald_` involucrada (sin `--pg`).
- Después: las copias se descartan; el repo de datos original no se toca.
- Estado restaurado: Sí — servidores locales apagados, puertos 9459/9469/9559 libres.

## Resultado

- Estado Step 6: PASS
- Bloqueos: `juegos/en-vivo.js` (sprint 27A) aún no está en `origin/main`; el E2E usa un puente de prueba con la
  misma API servido en lugar de `juegos/en-vivo.js`. No se publica hasta que llegue el módulo real.

## Actualización 2026-10-13 — con `juegos/en-vivo.js` real (PR #189)

- Merge de `origin/main` (dd375b2): conflictos en `server/salas.ts`, `juegos/mesas.js` y `tests/e2e/correr.sh`
  resueltos conservando los dos lados (`karts` hasta 8 en vivo y `futbol` 1 vs 1; `karts-vivo` y `futbol-en-linea`).
- Se usa el módulo real: la página de Juegos abre `EnVivo.puente` con el canal de la sala (un solo socket, evento
  `vivo`) y el iframe se conecta con `EnVivo.transporteMarco('futbol')`; la última foto sale con `enviarYa`.
- Se borró el doble local (`server/futbol_red_canal.ts`); `server/futbol_red_test.ts` usa `EnVivo.conectar` sobre
  `EnVivo.redSimulada` (reloj de la prueba) y el E2E usa `EnVivo.simulado` con el relevo `tests/e2e/lib/vivo-relevo.js`
  (`?vivoSimulado=1`, 80 ms, 3 % de pérdida, desorden; `relevo.cortar` para las desconexiones; `noConecta` para el
  respaldo).
- Resultados: `deno test -A server/` 610 pasaron, 0 fallaron (6 omitidas); `deno lint server/` y `deno check` limpios;
  calidad sin avisos en los archivos nuevos. E2E (puertos 9661/9671): `juegos` 31, `categorias` 49, `partidas` 15,
  `karts-vivo` 29, `futbol` 52, `futbol-en-linea` 18, `emocion` 45 — 7 corridas, 7 PASS. Latencia en pantalla 📶 92 ms;
  peor jugador a 1.85 m entre aparatos (instante no alineado; el invitado dibuja 100 ms + latencia atrás).
