## Why

El profe preguntó por qué no ve a sus rivales en una partida de Karts: hoy cada persona corre sola contra bots
«fantasma» (`juegos/karts.html`, `pasoFantasma`) y el servidor solo compara tiempos. Para el sprint 27 aprobó ver en
vivo los karts de las demás personas de la sala (hasta **8 personas**) y el 1 vs 1 en línea de Fútbol Estelar. Este
cambio trae la base común (módulo en vivo) y Karts; **el 1 vs 1 de Fútbol lo lleva otro agente en su propio cambio**
sobre el mismo módulo.

**Paso 0 (comprobado el 2026-10-12, sin tocar Supabase):** con los canales públicos (`private: false`) y la llave
publicable que el servidor ya entrega en `rt`, dos navegadores reales se mandan *broadcast* entre sí en un topic
`sala-prueba-<azar>` del proyecto Portafolio: 20 de 20 mensajes en cada sentido, RTT mediana 163 ms (≈ 80 ms de un
sentido). Con 8 navegadores a 10 Hz: 70.3 mensajes/s recibidos por cada uno, sin pérdida, ≈ 90 ms de un sentido. La
«acción externa» que `futbol-estelar/design.md` §12 suponía (política de Realtime) **no hace falta**.

## What Changes

- **Módulo nuevo `juegos/en-vivo.js`** (`window.EnVivo`, script clásico): mensajes de navegador a navegador sobre el
  canal secreto de la sala con evento propio `vivo` (distinto del `estado` del servidor). Contrato
  `EnVivo.conectar(...)` → `enviar` (ritmo máximo por evento), `al`, `presencia`, `alCambiarPresencia`, `latencia`,
  `alDesconectar`, `cerrar`; se rechaza en ≤ 5 s si no conecta. Números de secuencia y descarte de mensajes viejos o
  ajenos a la sala, reconexión con espera creciente, interpolador con extrapolación acotada y el doble de prueba
  `EnVivo.simulado` (latencia, pérdida y desorden).
- **Karts en vivo:** cada persona manda el estado de su kart 15 veces por segundo (10 con 5 o más personas):
  posición, ángulo, velocidad, vuelta, avance, turbo/estrella/derrape y personaje. Las demás lo dibujan en el
  pseudo-3D y en el minimapa con su personaje y su nombre de la sala, interpolando a 100 ms y extrapolando hasta
  250 ms. Clasificación en vivo por avance; podio final del servidor con el tiempo de cada quien (sin cambios). Quien
  se desconecta se desvanece con un aviso. Choques entre personas: solo empuje local de tu propio kart; sin ítems entre
  personas. Los bots siguen como fantasmas. **Mesa de Karts:** hasta 8 personas; los bots completan 3 lugares y cada
  persona que entra quita uno.
- **Respaldo:** sin Realtime o si el canal no conecta en 5 s, Karts vuelve a fantasmas + comparación de tiempos con
  un aviso claro.

## Capabilities

### New Capabilities
<!-- ninguna: se agrega a la capacidad viva `juegos` -->

### Modified Capabilities
- `juegos`: requisitos nuevos «Juego en vivo entre navegadores» y «Karts en vivo»; se modifican «Carreras de Arcade en
  partida» (mesa de 8 con bots que completan 3 lugares) y «Partidas en tiempo real con Supabase Realtime» (evento
  `vivo` de los navegadores).

## Impact

- **Superficies:** `juegos.html` (scripts y `?v=`), `juegos/en-vivo.js` (nuevo), `juegos/karts.html`,
  `juegos/app/salas.js`, `juegos/app/arcade.js`, `juegos/mesas.js` y `server/salas.ts` (mesa). No toca `index.html`,
  `ingles.html`, `secundaria.html`, Postgres `stald_*`, Notion, `supabase/` (legado de Fidello) ni `.env`.
- **Supabase:** sin cambios de configuración ni migraciones (Paso 0). Consumo de Realtime: una sala de Karts de 8
  manda ≈ 80–90 mensajes/s (10 Hz × 8 + latidos y pings) y cada navegador recibe ≈ 70/s.
- **Datos y privacidad:** por el canal solo viajan el id de jugador de la sala (el mismo que ya publica `estado`) y
  números; nunca correos ni otros datos personales. El nombre que se pinta sale de la sala, no del mensaje.
  **Matriz de acceso:** solo quien está en la sala recibe el topic (403 a los demás, como hoy); cada página ignora
  mensajes de ids que no están en su sala; el tiempo de cada quien lo sigue validando el servidor.
- **Pruebas:** `server/en_vivo_test.ts` (módulo con red simulada y el contrato), `server/mesas_test.ts`,
  `server/karts_vivo_test.ts`, E2E `e2e-karts-vivo.js` (8 contextos) con canal simulado (relevo local con latencia y
  pérdida) y verificación manual contra Supabase real.
- **Acciones externas** (usuario, tras el merge): prueba del profe con varios celulares antes de archivar.
