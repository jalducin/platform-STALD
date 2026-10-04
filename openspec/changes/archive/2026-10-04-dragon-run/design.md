## Decisiones

### 1. Página propia en un iframe
- `juegos/dragon-run.html` es una página autónoma: se puede abrir sola y se embebe en `juegos.html` con un iframe
  del mismo origen, en una caja de proporción 2:1 dentro de `marco('dragon-run')`.
- Mantenerla separada respeta el código del profe y evita mezclar su canvas y su audio con `juegos.html`.

### 2. Comunicación
- Al perder o ganar, si está embebida (`parent !== window`), la página envía con `postMessage`, solo a su origen:
  `{ juego: "dragon-run", fin: true, gano, puntos, monedas, metros, segundos }`.
- `juegos.html` acepta el mensaje solo si su `origin` coincide con el suyo y si viene de su iframe. Entonces llama a
  `terminar('dragon-run', …)`, que guarda los ⭐ individuales y muestra el resultado y "Jugar otra vez".
- Embebida no muestra sus botones de reintento: el resultado lo da la plataforma.
- Sola, se comporta como antes.

### 3. Mejoras de juego
- **Doble salto**: `dr.saltos` cuenta los saltos; el segundo, ya en el aire, da `vy = -600`, y al aterrizar el
  contador vuelve a 0.
- **Puntos**: `metros + monedas × 10`, más 200 si gana.
- **Pestaña oculta**: `visibilitychange` detiene la música y la reanuda si sigue jugando. El `dt` ya está topado en
  33 ms.
- **Modo prueba** `?auto=1` (solo para E2E): salta solo cuando un obstáculo está a 70–130 px y expone
  `window.__dragon`.

### 4. Música de Juegos
`jugarDragonRun` llama a `detenerMusica()` y registra en `limpiezas` la reanudación con
`iniciarMusica(musica.estilo)` si había un estilo elegido.
