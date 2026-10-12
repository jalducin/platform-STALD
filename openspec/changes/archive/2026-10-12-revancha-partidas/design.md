## Contexto
Las salas viven en el repo de datos (`juegos/salas/<código>/sala.json` y un archivo por jugador). El servidor no
sabe cuándo termina cada juego: el final lo calcula cada página con la semilla y las jugadas, y al llegar al podio
(`pintarFinalSala`, compartido por todos los juegos de sala) cada quien envía su `final` y el anfitrión el `podio`
(`POST …/respuesta`). Al llegar al podio la página deja de consultar y olvida la sala guardada.

## Decisiones

### 1. Cuándo una sala «terminó» para el servidor
`inicio !== null` y algún jugador ya registró `final` (o el anfitrión el `podio`). Es la única señal de fin que
existe en el servidor para los 8 tipos de juego, y la manda la página al pintar el podio, antes de que el botón se
pueda tocar. Alternativa descartada: calcular el fin en el servidor por juego (reproducir ¡Una!, póker, ajedrez…
en Deno): mucho código duplicado para poco beneficio. Un jugador que mande `final` antes de tiempo solo adelanta
su propia revancha; no le da acceso a nada nuevo.

### 2. Una sola sala nueva: reservar primero, crear después
`POST /juegos/sala/<código>/revancha`:
1. Valida: la sala existe (404), está vigente (410), quien pide está dentro (403 `no_en_sala`) y, si aún no hay
   `siguiente`, la partida terminó (409 `no_termino`).
2. **Reserva** con escritura condicional sobre `sala.json` de la vieja: lee el documento fresco (sin caché) y, si
   no tiene `siguiente`, escribe `{ siguiente: <código libre>, siguienteHost: <id de quien pide> }` con su `sha`.
   Si otra petición escribió antes, el `put` falla, se relee y se usa el `siguiente` ganador (hasta 3 intentos;
   si no, 503 `conflicto_escritura`).
3. **Asegura** la sala nueva: si `juegos/salas/<siguiente>/sala.json` no existe, la crea con `put(…, null)`
   (creación condicional): mismo `juego`, copia de `opciones`, mismos `bots`, `host = siguienteHost`, semilla y
   canal nuevos, `creada = ahora`. Si el `put` falla es que otra petición ya la creó. Quien la crea la agrega al
   índice semanal (`indexar`). Así, aunque quien ganó la reserva falle antes de crearla, la siguiente petición la
   crea con la misma anfitriona.
4. **Une** a quien pidió con las mismas reglas que `unirse` (ya dentro → ok; empezada → 409 `ya_empezo`; llena →
   409 `sala_llena`).
5. Publica en Realtime el estado de la sala vieja (para que los demás vean `siguiente`) y el de la nueva.
6. Responde `{ ok: true, codigo: <siguiente> }`.

Alternativa descartada: crear primero la sala nueva y luego marcar la vieja. Con dos peticiones a la vez quedaría
una sala huérfana (un commit de basura en el repo de datos).

### 3. Página: botón, aviso y sondeo del podio
- `pintarFinalSala` agrega `<div id="p-revancha">` y guarda `sala.finT`. `pintarRevancha()` lo pinta solo si
  cambió: sin `siguiente`, «🔁 Otra con los mismos»; con `siguiente`, «🔁 {Nombre} abrió la revancha» y
  «Unirme». Ambos botones (`data-p="revancha"`) llaman a la misma ruta; el nombre sale de `jugadores` por
  `siguienteHost`.
- `pintarSala()` con `sala.vista === 'final'` solo llama a `pintarRevancha()` (el podio no se vuelve a dibujar).
- El sondeo ya no se detiene al llegar al podio: sigue cada 5 s (30 s con Realtime) mientras no haya `siguiente`, y
  hasta 15 min después del podio. Con Realtime, el aviso llega al instante porque el servidor publica la sala vieja.
- Al responder bien, `entrarSala(<código nuevo>)`: la misma sala de espera de siempre (URL `?sala=`, sala guardada).
- Errores en el podio: `ya_empezo` → «La revancha ya empezó. Crea otra partida en 👥 Partidas.»; `sala_llena`,
  `sala_vencida` y `no_termino` con su texto; cualquier otro, «No se pudo abrir la revancha (…)».

### 4. Recargar en el podio
El requisito de `juegos-recarga` se mantiene: terminar limpia `?sala=` y `juegos_sala_activa`. Además se guarda
`juegos_revancha = { codigo, quien, t }`, que vale 15 min para el mismo `quien`. Al arrancar, después de la sala
guardada y antes de la partida individual, si hay marca vigente se hace `GET` de la sala vieja. Si responde, se
muestra el inicio de Juegos con una tarjeta arriba: «🏁 Terminó tu partida de X. ¿Otra con los mismos?» o
«🔁 {Nombre} abrió la revancha de X», con «Otra con los mismos» / «Unirme» y «No, gracias». Si responde error, se
borra la marca. La marca también se borra al entrar a la revancha, al salir del podio (✕, «Otros juegos»,
cambiar de pestaña), con «No, gracias» y al cerrar sesión (`StaldAuth.salir()`; por eso `auth.js?v=7`).

Alternativa descartada: volver a pintar el podio al recargar. Rompe el requisito vigente («al terminar la partida,
limpiar la URL y la sala guardada») y vuelve a enviar `final`.

### 5. Alcance por juego
| Juego | Fin en la página | Revancha |
|---|---|---|
| Preguntas (`en-vocab`, `en-frases`, `es-ortografia`, `cultura`, `mente-calculo`) | 10 preguntas por reloj | Sí, misma `cat` |
| Basta (es/en) | última ronda | Sí, mismas `rondas` |
| Lotería | «¡Lotería!» o fin de cartas | Sí, mismo `modo` |
| ¡Una!, póker, Brisca, Conquián | estado por jugadas | Sí; póker con el mismo `equipos` |
| Ajedrez | mate, tablas, rendición o reloj | Sí, mismo `reloj`; cupo 2, sin bots |

Todos pasan por `pintarFinalSala`, así que el botón y el aviso aparecen igual en todos. Los cupos (ajedrez 2,
Brisca 4) se respetan al unirse a la sala nueva. Un juego nuevo de sala hereda la revancha si usa
`pintarFinalSala` y sus opciones viven en `sala.opciones`.

## Riesgos
- Más consultas desde el podio: como máximo 15 min a 5 s por pestaña, y se detiene al ver `siguiente`. Con
  Realtime, 30 s.
- Contrato: la sala trae dos campos opcionales nuevos (`siguiente`, `siguienteHost`); las páginas viejas los
  ignoran.
