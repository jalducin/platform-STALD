## Decisiones

### 1. Baraja española (`juegos/cartas.js`)
- Las cartas tienen ids `0..39`:
  - `espPalo(id) = ⌊id/10⌋`, en el orden oros, copas, espadas y bastos;
  - `espValor(id)` sale de `[1,2,3,4,5,6,7,10,11,12][id % 10]`;
  - `espOrden(id) = id % 10` define la secuencia, así que el 7 y la sota quedan seguidos.
- `nombreEsp(id)` da el nombre de la carta, por ejemplo "As de oros" o "7 de bastos".

### 2. Brisca
- `briscaNueva(jugadores, rng)` prepara la mano:
  - con 3 jugadores se quita el 2 de oros;
  - reparte 3 cartas por jugador;
  - el triunfo se va al fondo del mazo, así que se roba al final.
- Fuerza de las cartas, de mayor a menor: as, 3, rey, caballo, sota, 7, 6, 5, 4, 2. Valores: 11, 10, 4, 3 y 2; las
  demás valen 0.
- `briscaJugar(st, carta)`:
  - jugada válida: es el turno de quien la tira y la carta está en su mano;
  - al completar la baza:
    - se define quién gana;
    - se suman sus puntos;
    - cada quien roba, empezando por quien ganó;
    - quien ganó abre la siguiente baza.
- `briscaBot(st, rng)`:
  - si abre, tira su carta sin puntos más baja y que no sea triunfo;
  - si responde:
    - con 10 o más puntos en la mesa, gana con la carta más barata que pueda;
    - si su pareja va ganando, le carga puntos;
    - en otro caso, tira la carta de menor valor.
- Fin: cuando todas las manos quedan vacías. Con 4 jugadores, los equipos son `[0,1,0,1]`.

### 3. Conquián (2 jugadores)
- `esJuego(ids)` es válido si hay 3 o más cartas y se cumple una de dos:
  - 3 o 4 del mismo valor, todas de palos distintos;
  - mismo palo con `espOrden` consecutivo.
- Estado: `manos`, `bajados[j]` (los juegos de cada quien), `mazo`, `muertas`, `oferta`, `fase` y `turno`.
  - `oferta` tiene la forma `{ carta, para, origen: 'mazo'|'descarte', segunda }`.
  - `fase` es `oferta` o `bajar`.
- `conquianActuar(st, mv)`:
  - `pasar` (fase `oferta`):
    - si la carta es la que se volteó del mazo y nadie la ha pasado, se ofrece al rival (`segunda`);
    - si no, queda muerta y quien pasó voltea la siguiente para sí;
    - si el mazo está vacío, la partida es empate.
  - `tomar { con, a? }` (fase `oferta`):
    - con `a`, la carta ofrecida más `con` se agregan al juego `a`; sin `a`, forman un juego nuevo;
    - el resultado debe ser un juego válido. La fase pasa a `bajar`.
  - `bajar { con, a? }` (fase `bajar`): igual que tomar, pero solo con cartas de la mano.
  - `descartar { carta }` (fase `bajar`): la carta se ofrece al rival como descarte.
  - Gana quien llega a 9 cartas bajadas.
- `conquianBot(st, rng)`:
  - toma cuando puede formar o extender un juego, prefiriendo la opción que baja más cartas;
  - baja todo lo que pueda;
  - descarta la carta menos conectada, es decir, con menos cartas del mismo valor o cercanas del mismo palo.

### 4. Página (`juegos.html`)
- Cartas españolas con estos colores:
  - oros: dorado;
  - copas: rojo;
  - espadas: azul;
  - bastos: verde.
  Cada carta muestra el valor grande y el emoji del palo.
- Brisca:
  - asientos de los rivales con cuántas cartas tienen;
  - al centro, el triunfo, el mazo y la baza en curso con quién tiró cada carta;
  - debajo, la última baza y quién la ganó;
  - tu mano se puede tocar cuando es tu turno.
- Conquián:
  - la carta ofrecida al centro;
  - tus juegos y los del rival;
  - tu mano, ordenada por palo y secuencia, con cartas que se pueden seleccionar;
  - al tocar uno de tus juegos se elige como destino (`a`);
  - botones Tomar, Pasar, Bajar y Descartar según la fase;
  - si la jugada no es válida, se explica por qué.
- Individual:
  - `elegirBrisca` (modos 1 bot, 2 bots o pareja) y `elegirConquian`;
  - los bots tiran a los 0.9 s.
- En partida:
  - `estadoCartasSala(cfg)` es genérico para Brisca y Conquián: misma semilla, pasos, bots a 1.5 s y turnos de 30 s;
  - la jugada automática al vencer el turno la elige el bot;
  - el podio usa la fórmula de puntos de cada juego.
- `AYUDA.brisca` y `AYUDA.conquian`.

### 5. Servidor (`server/salas.ts`)
- La validación de `jugada` se hace por juego (`validarJugada`):
  - ¡Una! sigue igual;
  - póker sigue igual;
  - Brisca acepta `jugar` con `carta` 0..39;
  - Conquián acepta:
    - `pasar`;
    - `tomar` o `bajar` con `con` (hasta 8 cartas de 0..39, sin repetir) y `a` opcional (0..20);
    - `descartar` con `carta`.
- Catálogo: `brisca` y `conquian`, categoría clásicos, máximo 1000.

## Ajuste post-apply (profe): Brisca en sala siempre con 4
- `participantes()` para Brisca:
  - toma hasta 4 humanos y completa con bots hasta llegar a 4: BOT-VACHIRA, BOT-ISAGII y BOT-CHONITA;
  - ignora la casilla de bots, que se oculta en Brisca.
- Servidor:
  - `CUPO.brisca = 4` → quien llega con la sala llena recibe `sala_llena`;
  - `bots: true` se fuerza al crear la sala.

## Pruebas
- Motor:
  - baraja y nombres;
  - quién gana una baza, con triunfo, sin triunfo y sin seguir palo;
  - suma de 120 puntos;
  - con 3 jugadores, 39 cartas;
  - robo y quién abre;
  - fin de la partida;
  - parejas;
  - 200 partidas de bots en Brisca y en Conquián:
    - jugadas siempre válidas;
    - se conservan las cartas;
    - la partida termina.
  - `esJuego`: tercias, escaleras con 7-sota, juegos inválidos y extensiones.
- Servidor: Brisca y Conquián permitidos en partida, con jugadas válidas e inválidas por juego.
- E2E:
  - cada juego en individual, con ayuda y puntos guardados;
  - Brisca en partida con dos navegadores;
  - Conquián en partida, humano contra bot.
