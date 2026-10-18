## Context

Las salas (`server/salas.ts`) guardan un archivo por jugador en `juegos/salas/<código>/<id>.json`; `estado()` lista esa
carpeta (sin subcarpetas: `GitHubStore.list` solo devuelve archivos y `MemoryStore.list` descarta rutas con `/`). El
GET de la sala ya deja pasar al admin con su id como `yo` y cada función que oculta secretos recibe ese `yo`
(`ocultarJugadas` de ppt, `vistaJugadores` de naval, `vistaGrande` de Dibuja). El canal de Realtime publica una vista
sin dueño (`yo = null`). En la página, los renderizadores ya toleran un `yo` que no es participante (el ajedrez muestra
«👀 Estás viendo la partida»): es la vista del admin.

## Goals / Non-Goals

**Goals:** ver una partida sin ocupar asiento, sin secretos y sin poder influir; reusar la vista del admin; juegos en
vivo en solo escucha; podio y revancha.

**Non-Goals:** chat o reacciones de espectadores; espectar juegos individuales; ocultar la semilla de la sala.

## Decisions

### 1. Registro en una subcarpeta
`POST /juegos/sala/<código>/espectar` escribe `juegos/salas/<código>/espectadores/<id>.json` (`{ id, t }`).
Al estar en una subcarpeta, `estado()` no lo ve: el espectador no cuenta para MESAS, cupo, `empezar`, podio,
revancha ni ranking (`/juegos/partida` sigue exigiendo `juegos/salas/<sala>/<id>.json`). Una escritura por
espectador (no hay latido), así no gasta el límite de GitHub. Cupo `MAX_ESPECTADORES = 30` (409
`espectadores_llenos`). Quien ya está dentro recibe 409 `ya_en_sala` (la página abre su vista de jugador). `{ salir:
true }` borra el archivo. «👀 N viendo» cuenta los archivos (caché de 5 s por sala).

*Alternativa descartada:* `GET ?ver=1` sin registro: no permite cupo ni conteo.

### 2. Vista pública (la más restrictiva)
Una sola función `vistaPublica(sala, jugadores, ahora)` arma lo que ve quien no juega: `sinCanal(sala)` (sin `canal` ni
`secreto`), `vistaJugadores(juego, ocultarJugadas(juego, jugadores, undefined), null)`, `vistaGrande(…, "")` (Dibuja:
letras y forma, solo las palabras reveladas), y los resultados ya públicos de Fútbol, Arena y Copa. El canal publica
la misma vista, así que **el espectador nunca ve más que lo que ya viaja por el canal a cualquier jugador**. Se usa para
el espectador y el admin; el espectador recibe `espectador: true`, `soyHost: false` y `viendo`.

Tabla de secretos (prueba `server/espectador_test.ts`):

| Juego | Secreto | Cómo se protege |
|---|---|---|
| Batalla naval | flota de cada quien | `vistaJugadores(…, null)` quita `flota` hasta el final |
| Piedra-papel-tijera | elección antes de revelar | `ocultarJugadas(…, undefined)` pone `"?"` hasta que la ronda está completa |
| Dibuja y adivina | palabra del turno | `secreto` nunca sale (`sinCanal`); `vistaGrande(…, "")` no da `palabra` |
| Todos | topic del canal | `rt` solo en juegos en vivo (`ESPECTADOR_EN_VIVO`) |
| Póker, Brisca, Conquián, ¡Una!, Blackjack | manos | se reconstruyen de la semilla en el cliente; la página del espectador solo dibuja dorsos y cartas públicas |
| Lotería y Bingo | tablas y cartones | salen de la semilla; no son secretos en el juego real; el espectador no tiene tabla |
| Fútbol en línea | táctica | ya viaja a ambos jugadores en el canal; no es secreta |

**Limitación conocida (anterior a este cambio):** en los juegos de cartas las manos se derivan de la semilla, que ya
reciben todas las personas de la sala; quien sepa programar podría calcularlas. El espectador queda exactamente al
mismo nivel que un jugador que no es dueño de esa mano, no más arriba. Quitar la semilla rompería la reproducción de la
mesa; se documenta como pendiente (repartir en el servidor).

### 3. Juegos en vivo: solo escucha
El topic solo se da al espectador en `ESPECTADOR_EN_VIVO = {karts, futbol, futbolito-arena, brigada}` (gancho para
juegos en vivo nuevos). En la página, el transporte de un espectador no envía (`enviar` vacío) y el puente no reenvía `vivo-tx` del
iframe; `EnVivo.conectar({ escucha: true })` no manda latidos, pings ni `_x`. Del lado de quien juega, `EnVivo` ya
descarta todo sobre cuyo `i` no está en `participantes` (`miembros`), y el puente de la página solo deja pasar ids de la
sala. **Riesgo residual documentado:** el `i` del sobre lo declara quien envía; alguien con el topic que modifique su
navegador podría hacerse pasar por un participante (igual que hoy entre participantes). Por eso el topic se da solo
donde hace falta; mitigarlo del todo requiere canales privados con RLS en Supabase (fuera de este cambio).

### 4. Iframes en modo espectador
La página manda `espectador: true` en `inicio`:
- **Karts:** todas las personas son remotas; `yo` apunta al kart que sigue la cámara (el líder por omisión, ◀ ▶ para
  cambiar). No hay entrada, ni ítems, ni `meta`; el HUD, el minimapa y la clasificación en vivo siguen al kart elegido.
  Con una sola persona (el resto fantasmas) no hay canal: la página muestra la clasificación del servidor.
- **Fútbol:** rol `espectador` = invitado sin entrada ni saludo; ve la cancha completa y el marcador.
- **Arena:** invitado con `yo = -1` (sin robot propio) y sin entrada. Con una sola persona el partido es local: la
  página avisa que se verá el resultado.
- **Brigada Xalli** (llegó a `main` durante este cambio): invitado de `brigada-red.js` con `espectador: true` (sin
  predicción ni entrada; solo toma la cámara compartida `c` de cada foto del anfitrión) y canal en solo escucha. Con una
  sola persona la misión es local: la página avisa que se verá el resultado.
- Ítems de Karts entre personas: quien especta no los dibuja (no tiene `red`); queda como pendiente.

### 5. Página
`sala.espectador` sale de la respuesta (`espectador: true`). Guardas: `post()` no envía a `/respuesta`, `/empezar`,
`/unirse`(de la sala vista) ni `/juegos/partida` mientras se especta; los clics dentro de `#p-body` se ignoran salvo
compartir, cambiar idioma/voz y la revancha. CSS `.espectando` apaga los controles. Barra con «👀 Espectador», «👀 N
viendo» y 🔊/🔇 (`arcade_sonido`, que respetan Emoción y los iframes). En el podio: «🔁 Unirme a la revancha» cuando
hay `siguiente` (si está llena o empezó, «👀 Ver la revancha»). Sin Realtime, sondeo como cualquier sala.

## Risks / Trade-offs

- Suplantación en el canal en vivo (ver §3) → topic solo en juegos en vivo; documentado.
- Un espectador olvidado sigue contando en «N viendo» hasta que vence la sala → aceptable (sin latidos que gasten
  GitHub); «Salir» lo quita.
- Escrituras: una por espectador; cupo de 30.
