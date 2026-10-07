## Por qué
El profe pide que en el póker cada quien empiece con **500 fichas** y que, para subir la apuesta, haya **fichas de
5, 10, 20, 50 y 100** que se vean como fichas de casino, en lugar de la barra deslizante con un número. Así se
entiende mejor cuánto se apuesta y la mesa se ve mucho mejor, sobre todo en celular.

## Qué cambia
- Fichas iniciales: 500 por jugador en individual, en sala y por equipos (antes 1,000).
- Ciegas a la mitad para conservar la proporción: 5/10, 10/20, 20/40 y 40/80; siguen subiendo cada 4 manos.
- Todas las cantidades del póker quedan en múltiplos de 5 (la ficha más chica): al repartir un pozo empatado, lo
  que sobra se da de 5 en 5. El motor rechaza una subida que no sea múltiplo de 5 (salvo ir con todo).
- Puntos del ranking: fichas × 2 ÷ jugadores (máximo 1,000). Con 500 fichas la escala queda igual que antes y el
  bono de +150 al equipo o pareja ganadora sigue teniendo el mismo peso.
- «⬆️ Subir» abre un selector de fichas de colores (5, 10, 20, 50 y 100) dibujadas con CSS: cada toque suma al
  aumento con una pequeña animación; se ve el aumento y cómo queda tu apuesta, «↺ Limpiar» y «✅ Apostar». Las
  fichas que pasarían del máximo se deshabilitan y «✅ Apostar» se habilita solo desde la subida mínima legal.
- El pozo y la apuesta de cada asiento se muestran con pilas de fichas de esos colores.
- Textos: «500 fichas» en la portada del póker y en «📖 Cómo se juega» (ciegas, cómo subir con fichas y puntos).
- El servidor (`validarJugada`) acepta `subir` solo con un `monto` entero múltiplo de 5.

## Superficies
- `juegos.html` (mesa `pk-*`, botonera, portada y ayuda del póker; sube `?v=` de `juegos/cartas.js`).
- `juegos/cartas.js` (motor: fichas, ciegas, reparto y validación de la subida).
- Servidor Deno: `server/salas.ts` (`validarJugada` del póker).
- No toca Postgres, Realtime, Auth, el repo de datos ni Notion. No hay datos de alumnos y alumnas nuevos: la matriz
  de acceso no cambia.

## Fuera de alcance
- Cambiar el número de manos (10), los turnos o el ritmo de la sala.
- Fichas con valor real: siguen siendo solo de juego.

## Acciones externas
- Ninguna. Verificación en producción tras el merge y archivo del cambio: el integrador.
