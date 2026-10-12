# Reporte Step 5: pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: basta-divertida-una-robo
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/basta_una_test.ts`: primero en rojo, porque faltaban `EXTRAS_BASTA`, `juegos/basta.js` y
  `juegos/una.js`; después en verde.
- `npx -y deno test -A server/`
- `npx -y deno lint server/` (también `juegos/basta.js` y `juegos/una.js`)
- `npx -y @fission-ai/openspec@1.4.1 validate basta-divertida-una-robo --strict`
- `bash tests/e2e/correr.sh --datos <copia de datos de prueba> --puerto-api 8917 --puerto-web 8895 juegos partidas revancha basta-rondas una-sala una-robo clasicos`

## Resultados de pruebas
- Dirigidas: `server/basta_una_test.ts`, 11 pasaron y 0 fallaron.
  - Un caso nuevo vino de la E2E: el aviso trataba la carta con id 0 como «sin jugable». Se corrigió en
    `Una.avisoRobo` y se agregó la prueba.
- Suite Deno: 326 pasaron, 0 fallaron y 6 omitidas (antes eran 315). Lint limpio. OpenSpec válido.
- E2E: 7 corridas, 7 PASS y 0 FAIL.

| Prueba | Pasos PASS |
|---|---|
| juegos | 28 |
| partidas | 15 |
| revancha | 20 |
| clasicos | 13 |
| basta-rondas | 21 |
| una-sala | 17 |
| una-robo | 6 |

- Datos de la corrida:
  - una-robo: 56 robos, 36 de varias cartas, 0 malos, 56 de 56 animados en orden, y el mazo se acabó a la mitad de un
    robo.
  - una-sala: 34 robos propios, 21 de varias cartas y 16 robos iguales en ambos dispositivos. El mazo se vació y la
    partida siguió.
- Duración: unos 25 min de E2E.

## Verificación manual (capturas a 390 px, revisadas)
- `basta-extras-crear.png`:
  - selector de 10 categorías en 2 columnas;
  - Pokémon y Antojito marcados;
  - aviso «Máximo 2…» al intentar con Flor.
- `basta-extras-ronda.png`: ronda con 9 casillas, con Pokémon y Antojito mexicano al final.
- `basta-extras-resultados.png`: Pokémon «Mewtwo» repetida 50 y Antojito vacío 0. Marcador acumulado.
- `basta-extras-revancha.png`: la sala de la revancha muestra «🎉 Categorías divertidas: ⚡ Pokémon · 🌮 Antojito
  mexicano».
- `basta-individual-extras.png`: Basta en inglés con Pokémon y Something in the kitchen (8 casillas).
- `una-robo-varias.png`: «Robaste 3 cartas hasta encontrar una que sí puedes tirar · 🆕 cinco amarillo», con el botón
  Pasar.
- `una-robo-mazo-vacio.png`: «Robaste 1 carta y se acabó el mazo sin una que sirva», con Robar (0).
- `una-sala-robo.png`: «Robaste 8 cartas hasta encontrar una que sí puedes tirar». Se tomó al iniciar la animación: las
  cartas nuevas aún van entrando.
- Casos de error:
  - `extras_invalidas`: id desconocido, repetido, 3 categorías, número u objeto;
  - `jugada_invalida`: `robar` con carta, `pasar` con color.

  Se probaron contra el servidor en memoria (`basta_una_test.ts`).

## Verificación de estado
- Antes: la carpeta de datos de prueba no se modifica; `correr.sh` trabaja sobre una copia.
- Después: sin cambios en la carpeta original. No se tocó Postgres, Supabase, `.env` ni Notion.
- Estado restaurado: sí. No hubo nada que restaurar.

## Resultado
- Estado del Step 5: PASS.
- Bloqueos: ninguno. Queda pendiente verificar en producción tras el merge, que hace el usuario.
