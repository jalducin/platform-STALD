# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-17
- Cambio: espectador-partidas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` y `npx -y deno lint server/`
- `cd tests/calidad && node calidad.mjs` (rama) y lo mismo sobre una copia de `origin/main` (base)
- `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 10031 --puerto-web 10041 espectador partidas juegos karts-vivo futbol-en-linea futbolito-arena poker brigada revancha cartas-espanolas`
- Tras mezclar `origin/main` (Brigada Xalli y karts-curvas-complejas): `… espectador karts karts-vivo plataformas` y `… espectador cartas-espanolas`
- Verificación manual con `curl` contra un servidor local (puerto 10032) sobre una copia temporal de datos

## Resultados de pruebas
- Dirigidas: `server/espectador_test.ts` 11/11 (sala llena y empezada, 403 al jugar, sin asiento/mesa/empezar/podio/revancha/ranking, cupo de 30, `ya_en_sala`, `salir`, topic solo en juegos en vivo, sin Realtime, tabla de secretos: naval, ppt, Dibuja y «la vista del espectador = la del canal» en póker, brisca, ¡Una!, conquián, lotería, blackjack y bingo); `server/en_vivo_test.ts` +3 (solo escucha no envía nada, inyección fuera de `participantes` descartada, el puente en solo escucha no reenvía).
- Suite del servidor: 772 pasaron, 0 fallaron, 6 omitidas. `deno lint`: sin problemas.
- E2E `espectador`: 28/28 (Brisca llena con mesa pública sin manos, enlace `&ver=1`, «👀 N viendo», 403; Karts empezado en vivo: karts que se mueven, ▶ cambia la cámara, 0 enviados, lo inyectado con su id no tiene efecto, podio y «Unirme a la revancha»; Fútbol con «👀 Solo ver»; Brigada con la cámara compartida y sin mandos).
- E2E relacionadas: partidas 15/15, juegos 31/31, revancha 20/20, poker 27/27, cartas-espanolas 21/21, futbol-en-linea 18/18, futbolito-arena 38/38, brigada 53/53, plataformas 115/115, karts-vivo 96/96 (tras la mezcla).
- `karts` (modo individual, no usa este cambio): 295–296/297 según la corrida; fallan de forma intermitente solo las mediciones de fps con CPU ×4 (52–53 fps con la máquina ocupada) o la mecánica «brecha» de una pista de Anillos (llegó con karts-curvas-complejas). Ninguna depende del espectador (todas las ramas nuevas de `karts.html` exigen `espectador = true`); en otra corrida esos mismos pasos pasaron.
- Calidad: 317 avisos en la rama = 317 en `origin/main` (sin avisos nuevos; se separaron `finalArcade` y `esperaEspectadorCopa` para no subir la complejidad).

## Verificación manual (curl, EL AGENTE EJECUTA)
| Caso | Esperado | Obtenido |
|---|---|---|
| Unirse a ajedrez lleno | 409 `sala_llena` | 409 `sala_llena` |
| Espectar | 200 | 200 |
| GET de quien especta | vista pública, `espectador: true`, sin `canal` | sí |
| GET de alguien que no especta | 403 `no_en_sala` | 403 |
| Espectar quien ya juega | 409 `ya_en_sala` | 409 |
| Sala inexistente | 404 | 404 |
| Sin cuenta de Juegos | 403 | 403 `no_registrado` |
| Jugada de quien especta | 403 | 403 `no_en_sala` |
| `salir` y volver a pedir la sala | 200 y luego 403 | sí |

## Verificación de estado
- Antes: copia temporal del repo de datos creada por `correr.sh` (y otra para curl en el scratchpad).
- Después: `correr.sh` borra su copia al terminar; la copia de curl se borró y el servidor se detuvo.
- Estado restaurado: Sí. Nunca se escribió en tablas `stald_` (sin `--pg`), ni en Supabase, Notion o `.env`.

## Capturas (390×844 y 844×390, revisadas)
`espectador-cartas-390.png`, `espectador-cartas-844x390.png`, `espectador-karts-844x390.png`,
`espectador-podio-390.png`, `espectador-futbol-390.png`, `espectador-futbol-844x390.png`,
`espectador-brigada-844x390.png` (en `tests/e2e/salida/`, ignorada por git). Al revisarlas se corrigió: los mandos de
Brigada y Arena seguían visibles (especificidad del CSS), las etiquetas «rival» de la Brisca vista por un espectador
(ahora «equipo A/B») y el «TÚ» del minimapa de Karts (ahora 👀).

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente documentado: «N viendo» cuenta a quien cerró la pestaña sin «Salir» hasta que vence la sala.
