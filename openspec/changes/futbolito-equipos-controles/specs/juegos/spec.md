## ADDED Requirements

### Requirement: Controles de Futbolito
Futbolito individual SHALL ofrecer tres controles, elegibles en la portada y con el botón 🎮 del HUD, y SHALL recordar
la elección en el navegador (`localStorage.futbolito_control`; si no hay almacenamiento o el valor es desconocido,
«Botones»):
- **🔘 Botones** (por omisión): dos flechas grandes que mueven la barra activa en la dirección en que se ve en
  pantalla, «⚽ PATEA» y «🔄 BARRA» (con el nombre de la barra activa);
- **👆 Deslizar**: deslizar en la mitad izquierda mueve la barra; tocar la mitad derecha patea;
- **🎮 Mando clásico** (`juegos/mando.js`): cruceta (o palanca de un control físico) mueve, A patea, B, L y R cambian
  de barra y START pausa.
La patada SHALL salir al bajar el dedo (sin esperar a soltarlo y aunque el dedo tiemble o se quede abajo). La barra
activa SHALL seguir siendo la que la pelota toca por detrás hasta el alcance de sus jugadores y SHALL cambiar solo
cuando la pelota sale de su zona; un cambio manual manda 2.5 s. Teclado: ↑ ↓ / W S (y ← → / A D) mueven, Espacio
patea, Tab / Q / E cambian de barra, P / Esc pausa.

#### Scenario: Patear con un toque que tiembla
- **WHEN** una alumna toca «⚽ PATEA» con la pelota frente a su barra, deja el dedo 350 ms y lo mueve 14 px
- **THEN** el jugador patea en cuanto el dedo baja

#### Scenario: Botones y cambio de barra
- **WHEN** un alumno sostiene la flecha ▶ y luego toca «🔄 BARRA»
- **THEN** su barra activa se corre hacia la derecha y la activa pasa a la siguiente barra, cuyo nombre se ve en el botón

#### Scenario: Pelota pegada por detrás
- **WHEN** la pelota toca por detrás a los medios propios
- **THEN** la barra activa sigue siendo la de los medios

#### Scenario: Mando clásico recordado
- **WHEN** una alumna elige «🎮 Mando clásico», recarga y presiona A con la pelota enfrente
- **THEN** el mando sigue elegido (sin los botones de antes) y el jugador patea

### Requirement: Futbolito por equipos en partida
Las partidas de Futbolito SHALL ofrecer el formato «1 vs 1» (por omisión) o «2 vs 2» (`opciones.formato`). En 2 vs 2
la mesa es `{ max: 4, asientos: 4, min: 2 }`: con bots, los bots completan los asientos y cada persona que entra quita
uno; sin bots se juega con las personas que haya (2 vs 1 con 3). Los equipos SHALL repartirse automáticos y
balanceados por orden de entrada, y cada persona SHALL poder pedir cambiar de equipo antes de empezar
(`POST /juegos/sala/<código>/unirse { equipo }`; 409 `equipo_lleno` si ya hay 2 personas en ese equipo). Con 2 por
equipo, el primero maneja medios y delanteros y el segundo portero y defensa; con 1, las 4 barras. Cada asiento SHALL
verse con su color y su nombre en sus barras y en el marcador.

Se juega por tiros (la sala tiene 0.3–1.5 s de latencia): tira quien maneja la barra que tiene la pelota (si es bot,
tira el bot; si nadie tira en 30 s, tiro automático). La jugada `{ n, accion: "tiro", pos, angulo, fuerza, barra }`
SHALL llevar `barra` (0…7) en 2 vs 2 y el servidor SHALL rechazar con 409 `no_es_tu_barra` un tiro con una barra que
no es de quien lo manda; en 1 vs 1 `barra` es opcional. Los puntos son por equipo para cada integrante.

#### Scenario: Dos personas y dos bots
- **WHEN** Marisol crea una sala 2 vs 2 con bots, Angel entra y empiezan
- **THEN** la mesa tiene 2 personas y 2 bots en dos equipos de 2, y cada persona ve sus barras con su color y nombre

#### Scenario: Cambiar de equipo
- **WHEN** Angel toca «🔁 Cambiar de equipo» en la sala de espera para quedar con Marisol
- **THEN** los dos quedan en el mismo equipo y los bots en el otro

#### Scenario: Tira quien tiene la pelota en su barra
- **WHEN** la pelota se frena junto a la defensa de un equipo de dos personas
- **THEN** le toca tirar a quien maneja portero y defensa, y su compañero ve «⏳ Tira …»

#### Scenario: Tiro con una barra ajena
- **WHEN** una persona manda un tiro con la barra de su compañero o del rival
- **THEN** el servidor responde 409 `no_es_tu_barra` y no lo guarda

#### Scenario: Equipo lleno
- **WHEN** ya hay dos personas en el equipo azul y una tercera pide cambiarse a ese equipo
- **THEN** el servidor responde 409 `equipo_lleno`

### Requirement: Controles de Billar
Billar SHALL permitir apuntar con precisión: arrastrar sobre la mesa apunta hacia el dedo solo después de moverlo más
de 8 px (un toque no cambia la mira), ⟲ ⟳ ajustan 0.1° por toque y repiten acelerando al sostenerlos, el ángulo se ve
en grados y la línea guía marca la bola fantasma. La fuerza SHALL verse con número en una barra vertical grande y en la
resortera; la resortera SHALL empezar solo desde la blanca, disparar con un jalón de al menos 48 px y cancelarse al
regresar el dedo a la blanca. «🎱 TIRAR» SHALL ser un botón grande. «🎮 Mando clásico» SHALL ser opcional (cruceta o
palanca apunta, L / R fino, A tira, X / Y fuerza, B efecto, START menú) y la elección SHALL recordarse
(`localStorage.billar_control`).

#### Scenario: Tocar no dispara ni cambia la mira
- **WHEN** un alumno toca la mesa sin arrastrar, o toca cerca de la blanca y mueve el dedo 20 px
- **THEN** la mira no cambia de golpe y no sale ningún tiro

#### Scenario: Ajuste fino sostenido
- **WHEN** una alumna toca ⟳ una vez y luego lo sostiene un segundo
- **THEN** la mira gira 0.1° con el toque y varios grados al sostenerlo

#### Scenario: Mando clásico
- **WHEN** alguien elige «🎮 Mando clásico», gira con la cruceta, sube la fuerza con X y presiona A
- **THEN** la mira gira, la fuerza sube y sale el tiro; al recargar el mando sigue elegido
