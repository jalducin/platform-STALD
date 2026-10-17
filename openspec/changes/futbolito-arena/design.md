## Context

Referencia: imagen del profe (arena octagonal, 4 robots, control con joystick + botón). Base técnica:

- Canal en vivo `juegos/en-vivo.js` (sprint 27A): `EnVivo.conectar`, `transporteMarco`/`puente` para el iframe,
  `EnVivo.interpolador`, y los dobles `EnVivo.simulado` (E2E) y `EnVivo.redSimulada` (Deno).
- Modelo de Fútbol Estelar en línea (sprint 27B, `juegos/futbol-red.js`, `server/futbol_linea.ts`): anfitrión
  autoritativo, foto cuantizada, entrada con `seq`, predicción y reconciliación, IA al desconectarse, resultado que
  reportan todos y el servidor valida.
- Mesas con bots (`server/salas.ts` y `juegos/mesas.js`, iguales por `server/mesas_test.ts`) y la sala de espera por
  equipos del Futbolito 2v2 (sprint 20a: `equiposFutbolito`, «Cambiar de equipo»).
- Entrada táctil de Karts (`KartsEntrada`: *touch events* no pasivos por dedo, joystick flotante) y el mando común.

## Goals / Non-Goals

- Meta: un 2 vs 2 en vivo jugable en celular (50–300 ms), contra la IA para jugar solo, 60 fps con CPU ×4.
- Fuera: servidor autoritativo o rollback, que un invitado tome el lugar del anfitrión caído, guardar avance.

## Decisions

### 1. Identidad y archivos
- Nombre «⚽ Futbolito Arena», id `futbolito-arena`, categoría `arcade`, `CATALOGO` con `max: 1000`.
- `juegos/arena-motor.js` (`window.ArenaMotor`, sin DOM): arenas, física, reglas, IA, reparto de equipos, validación
  del resultado y puntos. Lo cargan el juego, la página de Juegos (reparto en la sala de espera) y el servidor
  (`server/arena.ts` lo importa, como `server/carreras.ts` importa `juegos/arcade.js`): una sola fuente.
- `juegos/arena-red.js` (`window.ArenaRed`, sin DOM): foto, entrada, anfitrión e invitado.
- `juegos/futbolito-arena.html`: vista, controles, menús y modos. Sin avance guardado (`SIN_AVANCE`); las preferencias
  (control, dificultad, goles, robot) en `localStorage` con try/catch.

### 2. Arena y física (paso fijo de 1/60 s, solo `+ − × ÷` y `Math.sqrt`)
| | Normal | Grande |
|---|---|---|
| Largo × ancho | 16 × 10 | 22 × 14 |
| Chaflán (esquinas del octágono) | 2.4 | 3.2 |
| Portería (boca) | 3.2 | 4.2 |

- Octágono convexo: 8 paredes con normal hacia adentro. Las porterías son la boca de las paredes cortas (x = ±L/2);
  sus postes son puntos que también rebotan. Gol cuando el centro del balón cruza la línea dentro de la boca.
- Robot: radio 0.55, velocidad máxima 5 u/s, aceleración 18 u/s² hacia la velocidad que pide el joystick (con zona
  muerta), giro suave de la dirección hacia el joystick. Balón: radio 0.28, fricción `v·(1 − 0.55·dt)`, tope 16 u/s,
  rebote 0.85 en paredes y 0.6 en robots (más el empuje del robot).
- **A = ⚡ embestida/patada**: al presionar, el robot sale disparado hacia donde mira (9.5 u/s, 0.22 s) y durante
  0.3 s cualquier toque al balón es una patada fuerte (12 u/s en su dirección); si el balón ya está pegado al frente,
  la patada sale de inmediato. Recarga 1.1 s.
- **B = 🌀 giro/freno**: mantener frena fuerte; al presionar gira 0.4 s y el balón que toque sale de lado (barrida).
  Recarga 0.9 s.
- Choques robot–robot con empuje (el que embiste pesa 1.6×). Sin trigonometría en la simulación: la dirección es un
  vector unitario y el giro usa constantes precalculadas; así el motor es determinista y probable en Deno.
- Partido: a N goles (3, 5 o 7; 5 por omisión) o 3 minutos de juego; empate al terminar el tiempo → **gol de oro** hasta
  60 s más; si nadie anota, empate. Estados `saque` (1.2 s, quietos) → `juego` → `gol` (1.6 s) → `saque` … → `fin`.

### 3. IA (también la que toma el robot de quien se cae)
- La IA produce la misma entrada que una persona (`{ x, y, a, b }`), así entra igual al motor y a la red.
- Roles por equipo: el más cercano al balón **ataca** (se pone detrás del balón respecto a la portería rival, rodea si
  está del lado equivocado y embiste alineado); los demás **defienden** entre el balón y su portería (en 3 vs 3 uno
  hace de medio).
- Niveles: Fácil (55 % de velocidad, decide cada 0.4 s, puntería con error grande, casi no embiste ni barre), Medio
  (80 %, 0.18 s) y Difícil (100 %, 0.06 s, embiste y barre a tiempo). Azar con semilla del partido (`mulberry32`).
- Prueba: un jugador «de niña o niño» (corre al balón y aprieta A) le gana a la IA Fácil en la mayoría de semillas;
  Difícil le gana a Fácil.

### 4. Vista
- Canvas 2D: la arena fija (pasto con franjas, líneas, paredes con altura y porterías con red) se pre-dibuja en un canvas
  aparte al cambiar el tamaño; cada cuadro solo copia ese fondo y dibuja sombras, balón y robots (sprites del cuerpo
  pre-dibujados por color) ordenados por profundidad. Proyección con inclinación: `y·0.8` y la altura hacia arriba.
- Rotación de la vista: horizontal → la arena a lo largo; vertical → girada 90° (porterías arriba y abajo). La vista
  se voltea para que tu portería quede abajo/izquierda; el joystick y el teclado se traducen de pantalla a mundo.
- Robot: cilindro del color del robot con un anillo del color del equipo, LED/flecha blanca de dirección, número y
  apodo corto (8 letras) arriba; estela al embestir y remolino al girar; tu robot con un aro y la recarga de A.

### 5. Controles
- Capa de acciones `ArenaEntrada` (como `KartsEntrada`): fuentes teclado, toques, mando y las que se registren (pruebas).
- Táctil: joystick flotante a la izquierda (radio 46 px, zona muerta 0.15) y a la derecha un botón grande «⚡» (A) y uno
  más chico «🌀» (B); *touch events* no pasivos por `identifier`; nunca se suelta por `blur`. En vertical los controles
  van debajo de la arena; en horizontal bajo encimados en las esquinas.
- Mando común: `Mando.crear({ acciones: { dash: 'A', giro: 'B', pausa: 'START' }, analogico: true, teclas: todas null })`,
  activo durante el partido (un control físico funciona siempre) y visible solo con «🎮 Mando clásico».
- Teclado: flechas/WASD mueven, Espacio/J = A, K/Shift = B, P/Esc = pausa (solo contra la IA).

### 6. Sala y equipos
- `MESAS['futbolito-arena'] = { max: 4, asientos: 4, min: 2, formatos: { '1v1': {2,2,2}, '1v2': {3,3,2}, '2v2': {4,4,2},
  '3v3': {6,6,2} } }` en el servidor y la página. Opciones de la sala: `formato` (2v2 por omisión), `arena`
  (`normal`/`grande`; 3v3 siempre grande) y `goles` (3, 5 o 7).
- Asiento: `{ equipo }` (0 = 🌊 Mar, 1 = 🔥 Sol) y `{ robot }` (color 0–2 de su equipo) por `POST /unirse`, solo antes
  de empezar; equipo lleno → 409 `equipo_lleno`.
- `ArenaMotor.repartir(asientos, formato)`: personas por orden de entrada y luego bots; primero las personas con
  equipo pedido (si cabe), luego las demás al equipo con menos integrantes (empate → 🌊 Mar), luego los bots igual.
  Color: el pedido si está libre en su equipo; si no, el primero libre. Número = lugar en la mesa (1…6).
  Colores: 🌊 Mar = verde azulado, azul y morado; 🔥 Sol = amarillo, rojo y naranja.

### 7. Netcode (anfitrión = quien creó la sala)
- **Foto** `fa:foto` a 15 Hz: `{ q, t, e, r (reloj en décimas), g:[g0,g1], og (gol de oro), b:[x,y,vx,vy],
  j:[x,y,vx,vy,dir,flags × n], a:[último seq por robot], ia (máscara de robots con IA), ev }`; posiciones × 20
  (0.05 u), velocidades × 10, dirección en 64 pasos, banderas (embiste, gira, A lista, B lista).
- **Entrada** `fa:entrada` a 15 Hz (12 Hz en 3 vs 3): `{ s, x, y, m (botones mantenidos), na, nb }`; `na`/`nb` cuentan
  las presiones (mod 64): si se pierde un paquete, la siguiente entrada igual trae la presión y no se pierde un toque.
- **Invitado**: `EnVivo.interpolador` con 100 ms de retraso (hora del emisor llevada al reloj local, `meta.tLocal`)
  para balón y robots ajenos; predice **solo su robot** con la cinemática del motor (incluye paredes y embestida) y lo
  reconcilia con la foto (re-aplica las entradas con `seq > a[robot]`; corrige 25 % por cuadro o de golpe si pasa de
  2 u). Lo discreto (marcador, estado, reloj) sale de la foto más nueva.
- **Desconexión**: `alDesconectar(id)` o 3 s sin entradas → la IA (nivel Medio) toma ese robot y vuelve a la persona en
  cuanto llega su entrada; el partido sigue. Si se cae el anfitrión, los invitados muestran el aviso con cuenta de 15 s
  y cierran con el marcador de la última foto (`corte: true`).
- **Respaldo**: sin canal en vivo (la sala no trae `rt` o `EnVivo.conectar` falla en ≤ 6 s) y con más de una persona →
  «El partido en vivo no está disponible en esta sala» + «🤖 Jugar contra la IA» (modo individual); no se reporta
  resultado de sala. Con una sola persona (el resto bots) no hace falta canal: el anfitrión simula en su aparato.

### 8. Medición del canal y decisión del 3 vs 3
| Formato | Personas | Envíos por sala/s | Recibidos por aparato/s |
|---|---|---|---|
| 1 vs 1 | 2 | 15 + 15 = 30 | 15 |
| 2 vs 2 | 4 | 15 + 3 × 15 = 60 | 45 |
| 3 vs 3 | 6 | 15 + 5 × 12 = 75 | ≈ 63 |
| Karts (medido en `juegos-en-vivo`) | 8 | 80 + latidos | ≈ 70 |

El 3 vs 3 queda por debajo de los 8 karts que ya se midieron contra el Supabase real sin pérdida, y la foto de 6 robots
cabe holgada en el sobre de 2048 B (medida en `server/arena_red_test.ts`). Costo de código: solo una formación más y un
formato de mesa. **Decisión: sí hay 3 vs 3**, solo en la arena grande y con entrada a 12 Hz.

### 9. Resultado y puntos
- Cada persona manda `POST /respuesta { arena: { goles:[g0,g1], ms, corte? } }` (solo el primero). Validación:
  enteros, cada marcador ≤ goles de la sala, `g0 + g1 ≤ 1 + ms/2500`, 5 s ≤ ms ≤ 5 min y `ms ≤ ahora − inicio + 5 s`.
- `ArenaMotor.resultadoSala(host, reportes)`: con el del anfitrión, `confirmado` si todos los demás coinciden y
  `disputa` si alguno difiere (cuenta el del anfitrión); sin el del anfitrión, cuenta el primer invitado
  (`invitado`); sin reportes, `pendiente`. Puntos por equipo: gana 300, empata 120, pierde 40, +60 por gol (hasta 6),
  −20 por gol recibido (0–1000), solo a personas.
- Ranking de sala: `POST /juegos/partida` con sala de `futbolito-arena` toma los puntos del servidor
  (409 `resultado_pendiente` si aún no hay resultado), no los de la página.
- Contra la IA: base por resultado × nivel (Fácil 0.6, Medio 1, Difícil 1.4) + 40 por gol − 15 por gol recibido,
  tope 1000 (el del catálogo).

### 10. Integración con la página (iframe)
`pintarArenaSala` (arcade.js) abre `EnVivo.puente` con el canal de la sala (solo los ids de las personas de la mesa) y
manda `{ tipo: 'inicio', modo: 'sala', rol, yo, asientos: [{ id, nombre, bot, eq, color, num }], seed, vivo, formato,
arena, goles }`; el iframe responde `fin-sala { goles, ms, corte }` (la página lo registra y pinta el podio con los
puntos del servidor) o `ir-solo` (respaldo).

## Risks / Trade-offs

- [Celular lento como anfitrión] → la simulación es barata (≤ 7 cuerpos) y la foto se arma con enteros.
- [Trampa del anfitrión] → el servidor solo revisa plausibilidad y coincidencia; un desacuerdo queda «en disputa».
- [Quien se desconecta en 2 vs 2 recibe los puntos de su equipo] → aceptado: la IA juega por él y el equipo no queda
  en desventaja; lo contrario castigaría a su compañera o compañero.
- [Cuota de Realtime con varias salas a la vez] → 15 Hz con coalescencia (solo el último estado por evento).

## Migration Plan

Merge a `main` (Pages + Deno Deploy). Verificar en producción que `juegos/futbolito-arena.html`, `arena-motor.js` y
`arena-red.js` responden 200 y que la sala `futbolito-arena` se crea. Reversa: revertir el merge.
