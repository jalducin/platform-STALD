## Why

El profe preguntó por qué no ve a sus rivales en una partida de Karts: hoy cada persona corre sola contra bots
«fantasma» (`juegos/karts.html`, `pasoFantasma`) y el servidor solo compara tiempos. Aprobó dos cosas para el
sprint 27:

- **(A) Karts:** ver en vivo los karts de las demás personas de la sala (hasta **8 personas**).
- **(B) Fútbol Estelar:** 1 vs 1 en línea en tiempo real, con el diseño de `openspec/changes/futbol-estelar/design.md`
  §12 (autoritativo en el anfitrión).

**Paso 0 (comprobado el 2026-10-12, sin tocar Supabase):** con los canales públicos (`private: false`) y la llave
publicable que el servidor ya entrega en `rt`, dos navegadores reales se mandan *broadcast* entre sí en un topic
`sala-prueba-<azar>` del proyecto Portafolio: 20 de 20 mensajes en cada sentido, RTT mediana 163 ms (≈ 80 ms de un
sentido). La «acción externa» que §12 suponía (política de Realtime) **no hace falta**.

## What Changes

- **Módulo nuevo `juegos/en-vivo.js`** (`window.EnVivo`, script clásico, sin DOM): mensajes cliente a cliente sobre
  el canal secreto de la sala con evento propio `vivo` (distinto del `estado` del servidor): `enviar(evento, datos)`
  con ritmo máximo por evento, `al(evento, fn)`, presencia, latencia (ping a un compañero por turno), detección de
  desconexión, política de reconexión con espera creciente, respaldo a los 5 s, números de secuencia y descarte de
  mensajes viejos o fuera de orden, e interpolador con extrapolación acotada. Transportes: Supabase (en la página de
  Juegos), puente `postMessage` (en el iframe del juego) y red simulada (pruebas).
- **(A) Karts en vivo:** cada persona manda el estado de su kart 15 veces por segundo (10 con 5 o más personas):
  posición, ángulo, velocidad, vuelta, avance, turbo/estrella/derrape y personaje. Las demás lo dibujan en el
  pseudo-3D y en el minimapa con su personaje y su nombre de la sala, interpolando a 100 ms y extrapolando hasta
  250 ms. Clasificación en vivo por avance; podio final del servidor con el tiempo de cada quien (sin cambios). Quien
  se desconecta se desvanece con un aviso. Choques entre personas: solo empuje local de tu propio kart. Los bots siguen
  como fantasmas. **Mesa de Karts:** hasta 8 personas; los bots completan 3 lugares y cada persona que entra quita uno.
- **(B) Fútbol Estelar en línea 1 vs 1:** sala `futbol` de 2 sin bots en «Crear partida»; táctica (formación) en la sala
  de espera; el anfitrión simula a 60 Hz y manda fotos a 15 Hz; el invitado manda entradas a 30 Hz, predice a su
  jugador y se reconcilia; goles compartidos con `Emocion`; si se cae el invitado, su equipo pasa a la IA; si se cae
  el anfitrión, el partido se cierra con el último marcador; el servidor valida el resultado.
- **Respaldo:** sin Realtime o si el canal no conecta en 5 s, Karts vuelve a fantasmas + comparación de tiempos con
  aviso, y Fútbol en línea no se ofrece (se sugiere la Clasificatoria semanal).

## Capabilities

### New Capabilities
<!-- ninguna: se agrega a la capacidad viva `juegos` -->

### Modified Capabilities
- `juegos`: requisito nuevo «Juego en vivo entre navegadores», «Karts en vivo» y «Fútbol Estelar en línea 1 vs 1»;
  se modifican «Carreras de Arcade en partida» (mesa de 8 con bots que completan 3 lugares) y «Partidas en tiempo
  real con Supabase Realtime» (evento `vivo` de los navegadores).

## Impact

- **Superficies:** `juegos.html` (scripts y `?v=`), `juegos/en-vivo.js` (nuevo), `juegos/karts.html`,
  `juegos/futbol.html`, `juegos/app/salas.js`, `juegos/app/arcade.js`, `juegos/mesas.js`, `server/salas.ts`,
  `server/carreras.ts` y un validador de resultado de futbol en el servidor. No toca `index.html`, `ingles.html`,
  `secundaria.html`, Postgres `stald_*`, Notion, `supabase/` (legado de Fidello) ni `.env`.
- **Supabase:** sin cambios de configuración ni migraciones (Paso 0). Consumo de Realtime: Karts con 8 personas manda
  ≈ 80 mensajes/s por sala (10 Hz × 8) y cada navegador recibe ≈ 70/s; Fútbol ≈ 45/s por sala (§ design 7).
- **Datos y privacidad:** por el canal solo viajan el id de jugador de la sala (el mismo que ya publica `estado`),
  posiciones y botones; nunca correos ni otros datos personales. El nombre que se pinta sale de la sala, no del
  mensaje. **Matriz de acceso:** solo quien está en la sala recibe el topic (403 a los demás, como hoy); cada página
  ignora mensajes de ids que no están en su sala; el resultado lo valida el servidor.
- **Pruebas:** `server/en_vivo_test.ts` (módulo con red simulada), `server/mesas_test.ts`, `server/futbol_sala_test.ts`,
  E2E `e2e-karts-vivo.js` (8 contextos) y `e2e-futbol-vivo.js` (2 contextos) con canal simulado (relevo local con
  latencia y pérdida), y verificación manual contra Supabase real.
- **Acciones externas** (usuario, tras el merge): prueba del profe con varios celulares antes de archivar.
