# Reporte Step 15 — Pruebas y verificación de estado (PR 2: cooperativo en vivo de hasta 8)

- Fecha: 2026-10-17
- Cambio: brigada-xalli
- Agente: Claude Code (sprint 39)

## Comandos ejecutados

- TDD:
  - `npx -y deno test -A server/brigada_red_test.ts` antes de `juegos/brigada-red.js`: falla porque el módulo no existe; luego se ajustó el tamaño de la foto («lo lento» va aparte y los eventos compactos);
  - `server/brigada_sala_test.ts` antes de los cambios en `server/salas.ts`.
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad`
- `CHROME=… bash tests/e2e/correr.sh --datos <scratchpad>/data --puerto-api 9995 --puerto-web 10005 brigada juegos categorias partidas emocion mando`
- curl contra un servidor local (puerto 9994, copia de datos en el scratchpad): `scratchpad/curl-sala.sh`.

## Resultados de pruebas

- Dirigidas:
  - `server/brigada_red_test.ts`: 5/5.
  - `server/brigada_sala_test.ts`: 3/3.
  - `server/mesas_test.ts`: 3/3.
- Red simulada de `EnVivo`:

  | Caso | Envíos por sala/s | Foto | Predicción propia (p90) | Enemigos iguales al anfitrión |
  |---|---|---|---|---|
  | 8 personas, misión 2, 80 ms y 3 % de pérdida | 83.3 | promedio 420 B, máxima 770 B | 19 px | 92 % |
  | 4 personas, misión 1, 120 ms y 5 % de pérdida | 49.4 | máxima 509 B | 30 px | 87 % |

  - Las dos misiones se terminan y todos ven «cumplida» y la explosión del jefe.
  - Peor caso armado (8 personajes, 24 enemigos, 16 proyectiles y 12 eventos): < 1700 B (sobre de 2048 B).
  - Desconexión: la IA toma el personaje y lo devuelve al volver la persona.
  - Caída del anfitrión: los invitados la detectan a los 3 s y cierran a los 15 s.
- Suite del servidor: 751 pasaron, 0 fallaron, 6 omitidas. `deno lint` y `deno check` sin problemas.
- Calidad:
  - 0 avisos en `juegos/brigada*`, `juegos/app/brigada-sala.js`, `server/brigada*` y `tests/e2e/e2e-brigada.js`;
  - total del repo 317, igual que antes;
  - 2 pruebas largas de la rama de contenido quedaron revisadas con NOSONAR.
- E2E `brigada`: 53/53.
  - Individual: lo mismo que el PR 1.
  - Sala de 4 contextos en el canal simulado (80 ms, 3 % de pérdida, 10 % de desorden):
    - roles, mismos enemigos por id y latencia en pantalla;
    - Fernando se desconecta (la IA lo maneja y se avisa) y vuelve;
    - una invitada vence al jefe con su disparo, que llega al anfitrión;
    - los 4 ven «cumplida», el servidor confirma y el podio sale en los 4 con Emocion.podio.
  - Chequeo ligero con 8 contextos (640 × 400, sin táctil para aligerar la máquina):
    - 8 conectados y una misión de 8 personajes;
    - la novena persona recibe `sala_llena`;
    - fotos de 432 B como máximo;
    - podio en los 8.
  - fps del anfitrión con 8 personajes (7 entradas inyectadas por el relevo, como Karts en vivo) y CPU ×4: 60.
  - Respaldo sin canal: aviso y «Jugar solo».
- E2E del resto: `juegos` 31/31, `categorias` 49/49, `partidas` 15/15, `mando` 64/64, `emocion` 45/45.

## Verificación manual (curl, servidor local)

| Caso | Resultado |
| --- | --- |
| Crear sala con misión 9 | 400 `mision_invalida` |
| Crear sala de la misión 2 con compañeros IA | 200, `opciones: { mision: "2" }` |
| Angel entra con Kinich / personaje inválido | 200 `{ personaje: "kinich" }` / 400 `personaje_invalido` |
| Resultado antes de empezar | 409 `no_empezo` |
| Invitado intenta empezar | 403 `solo_host` |
| Resultado con 99 999 999 puntos y 1 s | 400 `resultado_invalido` |
| Ranking de la sala sin resultado | 409 `resultado_pendiente` |
| Persona fuera de la sala reporta | 403 `no_en_sala` |

## Capturas revisadas (tests/e2e/salida/)

Capturas: `brigada-390-espera.png`, `brigada-844-equipo.png`, `brigada-390-equipo.png`,
`brigada-escritorio-equipo.png`, `brigada-844-jefe-equipo.png`, `brigada-390-podio.png`, `brigada-844-podio.png`,
`brigada-ocho.png`, `brigada-844-ocho-cpu4.png` y `brigada-390-respaldo.png`.

Iteraciones tras revisarlas:
- con más de 4 personas el HUD del equipo pasa a renglones compactos (nombre corto, ❤ y vidas), porque 8 renglones completos tapaban medio cielo;
- el tiempo de la misión que se reporta es el real desde el inicio (los invitados mandaban 0 ms y el servidor los rechazaba con razón).

## Verificación de estado

- Antes: copias de datos en el scratchpad (E2E y curl); ninguna tabla `stald_` involucrada (sin `--pg`).
- Después: las copias se descartan; el repo de datos original no se toca.
- Estado restaurado: Sí — servidores locales apagados (uno quedó vivo tras una corrida detenida; se detuvo a mano).

## Resultado

- Estado Step 15: PASS
- Bloqueos: ninguno
