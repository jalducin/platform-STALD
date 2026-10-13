## Why

Fútbol Estelar 2010 (`futbol-estelar`) ya se juega contra la IA, en copa, carrera y torneo local, pero no contra
otra persona en otro aparato. El diseño del en línea en tiempo real quedó escrito en
`openspec/changes/futbol-estelar/design.md` §12 y el sprint 27 lo hace realidad: un 1 vs 1 en vivo dentro de las
salas de siempre (código, sala de espera, podio y revancha), usando el canal en vivo `juegos/en-vivo.js` (sprint 27A,
broadcast de Supabase Realtime en el topic secreto de la sala).

## What Changes

- **Sala «⚽ Fútbol Estelar 2010» 1 vs 1 sin bots** en «Crear partida»: mesa `futbol` de 2 personas, sin bots, en
  `server/salas.ts` y `juegos/mesas.js` (iguales, lo comprueba `server/mesas_test.ts`).
- **Táctica en la sala de espera**: cada quien elige formación y deslizadores (línea, amplitud, mentalidad y presión);
  se guardan en su asiento con `POST /juegos/sala/<código>/unirse { tactica }` antes del partido.
- **Netcode** (`juegos/futbol-red.js`, sin DOM y probado en Deno):
  - anfitrión autoritativo (quien creó la sala): simula a 60 Hz y manda una **foto cuantizada** (~500 B) a 15 Hz con
    posiciones, balón con altura, marcador, reloj, posesión y el último `seq` de entrada aplicado;
  - invitado: manda su entrada (joystick + botones + `seq`) a 30 Hz, **interpola** a los demás con un búfer de 100 ms
    y **predice** solo a su jugador controlado, con **reconciliación** contra la foto;
  - goles, silbatos y victoria o derrota compartidos con `window.Emocion`;
  - indicador de latencia en pantalla; desconexión con aviso, la IA toma al equipo de quien se cayó y, si no vuelve
    en 15 s, el partido se cierra con el marcador de ese momento.
- **Resultado validado por el servidor**: el anfitrión manda `{ futbol: { goles, ms } }` y el invitado confirma lo que
  vio; el servidor acepta si coinciden y, si no, aplica la regla (manda el del anfitrión, marcado «en disputa»; si el
  anfitrión se cayó, cuenta el del invitado). Revisiones: marcador plausible y duración coherente con el inicio de la
  sala. Puntos por resultado (como el partido rápido) topados a 1000.
- **Respaldo**: si `EnVivo.conectar` falla (o la sala no trae canal en vivo), no se ofrece el en línea en esa sala y
  el juego sugiere la 📅 Clasificatoria semanal con un mensaje claro; nunca se juega por sondeo.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisitos nuevos de Fútbol Estelar en línea 1 vs 1 (sala, táctica en la espera, netcode, desconexión,
  resultado validado y respaldo).

## Impact

- Superficies: `juegos.html` (Partidas), `juegos/futbol.html`, `juegos/futbol-red.js` (nuevo), `juegos/mesas.js`,
  `juegos/app/salas.js`, `juegos/app/arcade.js`, `juegos/app/arranque.js`; servidor Deno (`server/salas.ts`,
  `server/futbol_linea.ts` nuevo). Supabase Realtime solo a través de `juegos/en-vivo.js` (sprint 27A).
- Archivos compartidos con 27A (`server/salas.ts`, `juegos/mesas.js`, `juegos/app/salas.js`, `juegos/app/arcade.js`):
  cambios pequeños marcados `// futbol-en-linea`.
- Sin datos personales en el canal (solo ids de asiento y números del partido); no se escribe en tablas `stald_`.
- Acciones externas: ninguna. Este cambio **no** toca la configuración de Supabase; depende de que `juegos/en-vivo.js`
  (27A) esté en `main` y declare que su paso 0 funciona sin cambios en Supabase.
