## Context

- **Basta.**
  - En sala, las palabras se guardan por ronda (`rondasBasta`, hasta 10 claves). Cada cliente califica con
    `puntuarBasta` sobre `d.categorias` y `d.palabras` de `juegos/datos/basta.json`.
  - Los bots (`botBasta`) toman palabras de `d.palabras`.
  - `sala.opciones` es `Record<string, string>` y la revancha lo copia completo.
- **¡Una!.** Tiene dos motores en `juegos.html`: individual (`jugarUna`) y en sala (`estadoUna`, que reproduce las
  jugadas sobre el mazo de la semilla).
  - `robar` saca 1 carta y, si el mazo está vacío, rebaraja el descarte.
  - El servidor (`validarJugada`) solo revisa la forma de la jugada.

## Goals / Non-Goals

**Goals:**
- Categorías divertidas como columnas normales en individual y en sala, heredadas por la revancha, validadas por el
  servidor.
- Robo hasta poder tirar, igual en individual, en sala y para los bots; determinista en sala.

**Non-Goals:**
- Diccionarios grandes para las categorías divertidas.
- Cambiar los puntos de Basta o las reglas de castigo de ¡Una!.

## Decisions

- **Máximo 2 categorías divertidas** (`MAX_EXTRAS_BASTA` = `Basta.MAX_EXTRAS` = 2).
  - Con 7 de siempre + 2 quedan 9 casillas. En un celular de 390 px eso cabe en una pantalla y media, y la ronda de
    60 s no se hace eterna.
  - También deja margen bajo el tope de 10 palabras por ronda que ya tiene el servidor.
  - Con 3 serían 10 casillas, justo en el tope, y la ronda se siente pesada.
- **`opciones.extra` como texto `"a,b"`, no como arreglo.**
  - `sala.opciones` es `Record<string, string>` en el servidor, y otros agentes trabajan en `server/salas.ts`, así
    que no se cambia el tipo.
  - El servidor acepta un arreglo o un texto y lo guarda normalizado.
  - Al copiar `opciones`, la revancha lo hereda sin código nuevo.
- **La lista vive en tres lugares, con una prueba que exige que sean iguales.** Son `EXTRAS_BASTA` en
  `server/salas.ts`, `Basta.CONOCIDAS` en `juegos/basta.js` y `extras[].id` en `basta.json`.
  - El servidor de producción no carga `juegos/`, el mismo caso que `mesas-con-bots`.
  - `server/basta_una_test.ts` compara las tres.
- **Bots y validación: banco pequeño por categoría** (de 34 a 59 respuestas, que cubren casi todas las letras). No se
  dejan vacías.
  - El banco hace de diccionario: lo que está en el banco es «verificada» (100, o 50 si se repite). Lo demás que
    empieza con la letra vale «no verificada» (25/10 en sala, 50 en individual), igual que en las categorías de
    siempre.
  - Los bots usan el mismo `botBasta`: con 75 % de probabilidad toman una palabra del banco con esa letra. Si el banco
    no tiene palabra para la letra (p. ej. Antojito con «I» o «U»), la casilla queda vacía.
  - Con eso los bots juegan también las divertidas, sin inventar palabras que nadie puede revisar.
- **Motor de Basta en `juegos/basta.js`.** `norm`, `dic` y `puntuar` se mudan de `juegos.html` sin cambios.
  `conExtras(d, extras, ids)` devuelve los datos con las columnas extra al final, y `extrasDe(opciones)` lee la sala.
  - En `juegos.html` quedan alias (`normBasta`, `dicBasta`, `puntuarBasta`). El resto del código de Basta (formulario,
    `botBasta`, marcador y podio) funciona igual sobre los datos ampliados.
  - Así la calificación de la columna extra se prueba con Deno.
- **Basta individual.** Antes de la letra aparece una pantalla con las 10 casillas y el botón «✋ Empezar». Si no se
  elige ninguna, el juego es igual que antes.
- **¡Una!: `Una.robarHastaPoder(mazo, mano, valida)` en `juegos/una.js`.** Saca del final del mazo (`pop`) hasta la
  primera carta válida o hasta vaciarlo. Devuelve `{ robadas, jugable }` y no toca el descarte. Lo usan:
  - el motor individual (persona y bots);
  - `estadoUna` en sala. Ahí `ultima` guarda `robadas` y `jugable` para el aviso y la animación.
- **No se rebaraja el descarte para robar.**
  - Antes, `robar` rebarajaba cuando el mazo se vaciaba. Ahora, si el mazo se acaba sin una jugable, el turno pasa, y
    con el mazo en 0 el botón Robar queda deshabilitado (aparece **Pasar** si no hay jugable).
  - Los castigos (+2, +4, UNA tarde) **sí conservan** el rebarajado que ya tenían, para que un castigo siempre se
    cumpla. Esto además puede volver a llenar el mazo en partidas largas.
- **Determinismo en sala.** La jugada sigue siendo `{ n, accion: "robar" }`, sin datos extra: las robadas salen del
  mazo de la semilla al reproducir.
  - El servidor no reproduce la partida (decisión de `una-en-partida`). Su validación nueva es que `robar` y `pasar` no
    traigan `carta` ni `color`, así nadie puede «elegir» la carta robada.
  - Si se vence el turno (30 s), el robo automático también roba hasta poder, pero el turno pasa sin tirar, como antes.
- **Robar con carta jugable en la mano.** Se sigue permitiendo, como hoy. Roba hasta la primera que sirva.
- **Animación.** Cada carta robada lleva `.una-btn.nueva` con `--k` = su orden, y entra desde el mazo cada 0.22 s.
  - En sala se anima una sola vez por paso (`sala.unaAnimado`).
  - Con `prefers-reduced-motion` no hay animación.
  - El aviso sale de `Una.avisoRobo`: «Robaste 1 carta y sí la puedes tirar», «Robaste N cartas hasta encontrar una
    que sí puedes tirar», «Robaste N cartas y se acabó el mazo sin una que sirva. Sigue el siguiente» o «No quedan
    cartas para robar».

## Risks / Trade-offs

- **Salas de ¡Una! que ya estaban en juego al publicar.** Se reproducirían con la regla nueva y podrían verse
  distintas. Las salas viven 3 h y el cambio sale con el merge, así que el riesgo es mínimo. No se versiona la regla.
- **Partida trabada.** Puede pasar si el mazo está vacío y nadie tiene carta jugable. Todos pasan su turno hasta que
  alguien pueda tirar o se rebaraje por un castigo. Es muy poco probable con manos grandes, y la sala vence a las 3 h.
  Se acepta.
- **Respuestas fuera del banco.** Una respuesta correcta que no está en el banco vale «no verificada» (25 en sala,
  50 en individual). Es la misma regla que ya tienen las categorías de siempre.
