## Why

El profe pidió un póker estilo Las Vegas / Casino Royale para jugar en individual y en equipo, con fichas sin valor
real. También pidió instrucciones dentro del juego para quien no lo conozca. Este cambio es el Sprint 1 de los
juegos de cartas. El Sprint 2 suma Brisca y Conquián con baraja española sobre el mismo motor.

## What Changes

- **Motor de cartas** `juegos/cartas.js`, sin DOM. Lo usan la página y las pruebas de Deno:
  - baraja, barajado con semilla y evaluador de la mejor mano de 5 entre 7 cartas;
  - Texas Hold'em sin límite: ciegas que suben, apuestas, botes laterales con all-in y repartición del bote;
  - bots que deciden por la fuerza de su mano y las probabilidades del bote, con faroles ocasionales.
- **Individual (Clásicos → ♠️ Póker):**
  - juegas contra 1 a 4 bots. Cada quien empieza con 1,000 fichas y la partida dura 10 manos;
  - modo **en pareja**: tú y un bot contra 2 bots. Gana la pareja con más fichas;
  - puntos = fichas finales ÷ número de jugadores, con tope de 1,000. La pareja ganadora suma +150.
- **En partida** (👥 Partidas):
  - humanos con bots opcionales, y modo **por equipos** opcional: A y B, alternados por orden de entrada;
  - cada jugada viaja como `jugada { n, accion, monto? }`, igual que en ¡Una!. Todos reconstruyen la mesa desde la
    semilla;
  - el turno dura 30 s. Al acabarse, el jugador pasa si puede y, si no, se retira.
- **📖 Cómo se juega:** una ventana con las reglas, la tabla de manos y un glosario (ciega, igualar, subir, all-in).
  Se abre desde la pantalla de inicio del juego y desde la mesa.
- Las fichas son solo de juego: no hay apuestas reales ni compras.

## Capabilities

### Modified Capabilities
- `juegos`: nuevo juego de cartas, individual y en partida.

## Impact

- Archivos nuevos: `juegos/cartas.js` y `server/cartas_test.ts`.
- Archivos modificados:
  - `juegos.html`;
  - `server/juegos.ts`: catálogo `poker`, máx. 1000;
  - `server/salas.ts`: `poker` en partidas y validación de su jugada.
- Documentación: `docs/frontend-standards.md`, `docs/backend-standards.md` y `docs/data-model.md`.
