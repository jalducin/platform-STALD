## Why

El profe pidió dos juegos con baraja española, **Brisca** y **Conquián**, para jugar en individual y en partida.
También pidió instrucciones dentro del juego para quien no los conozca. Este es el Sprint 2 de los juegos de cartas
y usa el motor del Sprint 1 (`juegos/cartas.js`).

## What Changes

- **Baraja española** en el motor:
  - 40 cartas: oros 🪙, copas 🏆, espadas ⚔️ y bastos 🪵, del 1 al 7 y sota, caballo y rey;
  - nombres de las cartas, como "As de oros" o "Sota de copas".
- **Brisca** (de 2 a 4 jugadores; con 4, en parejas):
  - cada quien tiene 3 cartas. La carta de triunfo queda volteada bajo el mazo y se roba al final;
  - no hay obligación de seguir el palo. Gana la baza el triunfo más alto o, si no hay triunfos, la carta más alta
    del palo que salió;
  - valor de las cartas: as 11, tres 10, rey 4, caballo 3 y sota 2, en total 120. Gana quien junta más de 60;
  - individual: contra 1 bot, contra 2 o en pareja (tú y un bot contra 2 bots);
  - puntos: `min(1000, round(puntos × 800 / 120) + 200 si gana)`.
- **Conquián** (2 jugadores):
  - cada quien recibe 8 cartas. Se voltea una carta del mazo para quien tiene el turno;
  - quien toma una carta debe bajarla de inmediato en un juego (o agregarla a uno suyo) y después descartar;
  - si alguien no la quiere, la ofrece al rival, y si nadie la toma queda muerta;
  - un juego es una tercia o cuarteta del mismo número, o una escalera de 3 o más del mismo palo. El 7 y la sota
    van seguidos;
  - gana quien baja 9 cartas. Si se acaba el mazo, es empate;
  - puntos: si gana, `700 + 15 × cartas que quedan en el mazo` (tope 1000); si no, `50 × cartas bajadas`.
- **En partida**:
  - las jugadas se reconstruyen desde la semilla, como en ¡Una! y el póker. El turno dura 30 s y, si se acaba, se
    hace la jugada automática;
  - Brisca usa hasta los primeros 4 jugadores de la sala y, si son 4, se juega en parejas;
  - Conquián usa a los primeros 2; si hay más, ven la partida;
  - la validación del servidor se hace por juego.
- **📖 Cómo se juega** de cada juego: reglas, valor de las cartas y ejemplos de juegos válidos.

## Capabilities

### Modified Capabilities
- `juegos`: dos juegos nuevos de cartas, individuales y en partida.

## Impact

- `juegos/cartas.js`, `server/cartas_test.ts`, `juegos.html`, `server/juegos.ts` y `server/salas.ts`.
- Documentación: `docs/frontend-standards.md`, `docs/backend-standards.md` y `docs/data-model.md`.
