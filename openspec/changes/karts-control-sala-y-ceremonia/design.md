## Contexto

- Karts guarda el control en `localStorage.karts_control` (`botones` por omisión, `joystick`, `sensor`, `mando`) y la
  aceleración en `localStorage.karts_acelerar` (`auto` / `manual`) como texto plano. El iframe de Karts es del mismo
  origen que `juegos.html`.
- En sala, `juegos.html` pinta la sala de espera (`tarjetaPersonaje` en `app/arcade.js`) y el podio
  (`pintarFinalSala` en `app/salas.js`, llamado por `finalArcade` y `finalCopa`). La pausa no existe en sala.
- `Emocion.podio` ya suena en `pintarFinalSala` (redoble, revelación y tu lugar).

## Decisiones

### 1. El control es local (no va al servidor)
La tarjeta «🎮 Tu control» escribe `karts_control` / `karts_acelerar` en texto plano (igual que Karts). El iframe lee
`localStorage` al cargar y, en la copa en sala (el iframe no se recarga), lo vuelve a leer en cada `inicio`
(`releerControl`). No se muestra a los demás: no hace falta y evita tocar el servidor (43a lo está cambiando).

### 2. Sensor en iPhone
`requestPermission` solo funciona dentro de un toque. En la sala de espera se llama en el clic de «📱 Sensor» (el
permiso es del origen y lo comparte el iframe). Al arrancar la carrera en sala, si el control es el sensor:
- sin `requestPermission` (Android, escritorio) se activa como siempre;
- con `requestPermission` se intenta en modo silencioso (sin cambiar a botones si falla) y, si no quedó activo, se
  abre el panel ⚙️ con el botón «📱 Activar sensor» (un `click`, que sí cuenta como toque en iOS).

### 3. Panel ⚙️ durante la carrera en sala
Botón `#b-control` en el HUD, visible solo en sala y nunca para quien especta. Abre `#panel-control` (no es uno de
los overlays: la carrera sigue corriendo y no se pausa) con los mismos botones `data-control` / `data-acel`, que ya
atiende el manejador de clics del menú, más «📱 Activar sensor» y «✔ Listo». Al cambiar se llama `soltarTodo()` para
no dejar teclas pegadas.

### 4. Ceremonia: módulo puro + DOM
`juegos/karts-ceremonia.js` (UMD, sin dependencias obligatorias):
- `podioDe(filas)`: toma las 3 primeras filas en el orden que llegan (el del servidor) y devuelve
  `[{ lugar, nombre, personaje, color, puntos, yo }]`. El lugar es `fila.lugar` si viene, si no la posición; con
  empate (mismo `lugar`) se repite la medalla. No reordena.
- `secuencia(n)`: momentos de la escena: 3.º a 0.6 s, 2.º a 2.0 s, redoble a 3.2 s, 1.º a 4.7 s, fin a 7 s; con
  menos de 3 lugares se usan solo los que hay, siempre de abajo hacia arriba.
- `inicioSala(cierre)`: `cierre + 2500` (hora del servidor). `estadoEn(transcurrido, n)` dice qué lugares ya se ven.
- `mostrar({ contenedor, titulo, podio, transcurrido, reducido, sonido, alTerminar })`: pinta la escena (CSS propio
  inyectado una vez, prefijo `kc-`), programa los momentos que faltan (los pasados se muestran sin sonido) y regresa
  `{ cerrar }`. Retratos con `Personajes.retrato(id, 'gana')` y un kart SVG con los colores de `Personajes.LISTA`.

### 5. Ceremonia en la sala, sincronizada
- Carrera suelta: cierre = la hora del servidor del último reporte de las personas (`carrera.t`) o, si alguien no
  llegó, `inicio + limiteSala + GRACIA_SALA`.
- Copa: cierre de la última carrera del calendario (`KartsCopa.estado(...).calendario`), sin suponer cuántas son.
- Cada aparato calcula `transcurrido = ahoraServidor() − inicioSala(cierre)`; si es negativo espera; si ya pasó la
  duración, no la muestra y queda la tabla. Así todos la ven a la misma hora, también quien especta.
- Mientras corre la ceremonia `pintarFinalSala` no dispara `Emocion.podio` ni el confeti (lo hace la ceremonia; al
  terminar, el confeti si sumaste puntos).
- Bots: personaje de los que nadie eligió, en orden fijo (como los fantasmas del iframe).

### 6. Copa individual
En `mostrarResultados` de `karts.html`, si la copa terminó, la ceremonia se pinta sobre `#pantalla` con la tabla de la
copa (ya ordenada por `KartsPistas.sumarCarreraCopa`); al terminar o con «Saltar» quedan los resultados.

## Riesgos
- Un aparato que se entera tarde del final (sondeo de 5 s sin Realtime) ve la ceremonia ya empezada: es el precio de
  la sincronía. El colchón de 2.5 s cubre el caso normal con Realtime.
- La capa tapa la página unos 7 s: «⏭ Saltar» la quita.
