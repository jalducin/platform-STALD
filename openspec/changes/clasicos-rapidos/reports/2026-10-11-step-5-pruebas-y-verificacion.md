# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: clasicos-rapidos
- Agente: Claude (agente de clásicos rápidos)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8927 --puerto-web 8905 clasicos-rapidos juegos fusion clasicos revancha ranking-juegos partidas ajedrez una-sala ajustes-salas karts`
- Antes de la corrida final se integró `origin/main` (#162, `mesas-con-bots`): los 5 juegos declaran su renglón en
  `MESAS` (`server/salas.ts`) y `juegos/mesas.js`; `server/mesas_test.ts` confirma que las tablas coinciden.
- Verificación manual (Step 6.1): servidor local en el puerto 8927 con otra copia de los datos y
  `scratchpad/curl-clasicos.sh` (curl).

## Resultados de pruebas
- Dirigidas: `server/clasicos_rapidos_test.ts` 10 pasaron y `server/clasicos_rapidos_motor_test.ts` 15 pasaron, 0
  fallaron (TDD: ambas fallaron primero por no existir el módulo).
- Suite del servidor: 340 pasaron, 0 fallaron, 6 omitidas (las de siempre). `lint`: 78 archivos sin avisos. `check`: OK.
- E2E (fase `base`): 11 corridas, 11 PASS, 0 FAIL, 0 omitidas:
  - nueva `clasicos-rapidos`: 38/38 pasos (5 juegos individuales; Gato y Conecta 4 en sala con 2 personas; Piedra,
    papel o tijera con bots, mesa 1 + 3 bots → 2 + 2 al entrar otra persona, elección oculta «?» hasta elegir;
    Ahorcado cooperativo y Serpientes con bots en sala; sin desplazamiento horizontal a 390 px);
  - regresión: `juegos` 28, `partidas` 15, `revancha` 20, `clasicos` 11, `fusion` 10, `karts` 15, `una-sala` 11,
    `ajedrez` 12, `ajustes-salas` 8 y `ranking-juegos` 50 pasos.
  - Conteo del menú en `e2e-juegos`, `e2e-fusion`, `e2e-clasicos` y `e2e-karts`: 29 juegos (Clásicos: 12).
  - Corridas previas: 2 fallas de la prueba nueva por tiempo (la elección oculta se leía antes del sondeo y la
    animación de «¡ya!» dura poco con relojes acelerados); se corrigió la prueba (estado pedido al servidor y lectura en
    la misma tarea del clic), no el juego.
- Duración de la suite E2E: ~20 min.

## Capturas revisadas (tests/e2e/salida/)
- `clasicos-rapidos-390-menu.png`, `-gato.png`, `-conecta4.png`, `-ppt.png`, `-ahorcado.png`, `-serpientes.png`,
  `-gato-sala.png`, `-conecta4-sala.png`, `-ppt-sala.png`, `-ahorcado-sala.png`, `-serpientes-sala.png`, `-podio.png`.
- Hallazgo corregido: en Piedra, papel o tijera individual el texto «Al mejor de 5…» apretaba el marcador y cortaba
  los nombres («T. 0», «Tito…»); se movió a su propia línea.
- Todo cabe a 390 px; el tablero de serpientes muestra casillas, 9 escaleras, 10 serpientes y las fichas.

## Verificación manual (curl, servidor local)
- Crear sala de `gato`, `conecta4`, `ppt`, `ahorcado` y `serpientes` → 200; `ahorcado` con `modo: "todos"` → 400
  `modo_invalido`.
- Gato sin bots y solo → 409 `faltan_jugadores` (`minimo: 2`); Angel se une → 200; un tercero → 409 `sala_llena`;
  empezar → 200.
- Jugada válida (`casilla: 4`) → 200 solo con sus campos; `casilla: 12` → 400 `jugada_invalida`; paso tomado → 409
  `turno_tomado`.
- `ppt`: Marisol elige papel; Angel pide la sala y ve `eleccion: "?"`; tras elegir tijera ve `papel` y `tijera`.
- Sin sesión ni correo → 400 `missing_email`.
- Serpientes con `dado: 6` en la jugada → 200, pero se guarda solo `{ n, accion: "tirar", t }`.

## Verificación de estado
- Antes: copia de prueba de `scratchpad/data` (sin salas de los juegos nuevos).
- Después: `correr.sh` usa una copia temporal y la borra al terminar; la copia del curl (`scratchpad/curl-datos`) se
  borró y el servidor local se detuvo (puerto 8927 libre). La carpeta de datos original no se modificó.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno
