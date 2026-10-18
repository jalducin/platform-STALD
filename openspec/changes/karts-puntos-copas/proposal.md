## Why

Después de jugar, el profe dijo: «en la copa Reinos Antiguos no suma puntos y gané en la primera carrera». Ganó la
carrera 1 de la Copa Reinos Antiguos y no vio ni los puntos de la copa ni, al parecer, los de ranking.

Diagnóstico (sprint 41):

- Con un avance limpio **no se reproduce**: ganar la carrera 1 de cada una de las 4 copas (individual) deja +15 en la
  tabla, la copa en curso con 15 guardada en el servidor (PUT 200), los puntos de la carrera en ⭐ individuales
  (POST `/juegos/partida` 200) y, tras recargar, «Continuar … Carrera 2 de 4». La Copa Reinos en sala también suma 15.
  No hay acceso a los datos de producción para ver la partida del profe.
- Sí hay un **defecto confirmado** que produce exactamente ese síntoma en cualquier copa: el juego anotaba como récord
  cualquier tiempo ≥ 10 s, pero el servidor solo acepta récords de 10 s a 15 min. Como el reloj de la carrera es de
  pared, una carrera con la pestaña oculta o atorado contra un muro un buen rato pasa de 15 min: el récord queda fuera
  de rango y el servidor rechaza **todo** el avance (`progreso_invalido`), copa en curso incluida. El único aviso duraba
  2.5 s.
- En la copa en sala, si el servidor rechazaba tu tiempo (`carrera_invalida`, `carrera_cerrada`…), la página lo
  ignoraba: contabas como «no terminó» (0 puntos) sin ningún aviso.
- El servidor copiaba números del juego (copas ≤ 8 con cualquier id, puntos ≤ 60, 8 corredores, carrera 0–3,
  récords 10 s–15 min, versión 3): una copa o regla nueva podía romper el guardado sin que nada lo avisara.

## What Changes

- **Reglas compartidas** en `juegos/karts-pistas.js` (las usa el juego y el servidor): `PUNTOS_CARRERA`,
  `PUNTOS_COPA_MAX`, `RECORD_MIN_MS`/`RECORD_MAX_MS`, `copaNueva`, `anotarRecord` (solo anota récords que el servidor
  acepta) y `sumarCarreraCopa` (suma de la carrera y cierre de la copa, puros).
- **Servidor** (`server/progreso.ts`): las copas válidas, el tope de puntos, los corredores de la copa, la última
  carrera, el rango de los récords y la versión salen de `KartsPistas` (sin listas fijas).
- **Errores visibles**: si el servidor no guarda el avance, el juego lo avisa 4.5 s con el motivo y lo deja escrito en
  los resultados; en la copa en sala, un tiempo rechazado se avisa con su motivo.
- **Menú**: «Continuar copa» muestra tus puntos y tu lugar en la copa en curso.

Fuera de alcance: el botón de reversa (otro cambio, `feature/karts-reversa`).

Superficies: `juegos.html` (juegos/app/arcade.js), `juegos/karts.html`, servidor Deno (`server/progreso.ts`). Sin
cambios en Postgres, Realtime, Auth, repo de datos ni Notion. Sin acciones externas.
