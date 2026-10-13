## Context

Las salas (`server/salas.ts`) guardan cada jugada en el repo de datos (0.3–1.5 s) y el servidor publica el estado en
Supabase Realtime (`server/realtime.ts`, evento `estado`, topic secreto `sala-<24 hex>`, canal público). La página de
Juegos escucha con la llave publicable (`juegos/app/salas.js`, `conectarRealtime`). Karts y Fútbol corren en un iframe
del mismo origen y hablan con la página por `postMessage` (`juegos/app/arcade.js`).

Para ver a los rivales hace falta otra vía: mensajes **de navegador a navegador** por el mismo topic, sin pasar por el
servidor. El Paso 0 comprobó que el canal público ya lo permite con la llave publicable (RTT mediana 163 ms).

## Goals / Non-Goals

**Goals:** módulo reutilizable y probado sin red; Karts con hasta 8 personas en vivo a 60 fps; Fútbol 1 vs 1 en línea;
respaldo claro; nada de configuración nueva en Supabase.

**Non-Goals:** servidor autoritativo de física; ítems ofensivos entre personas en Karts; Fútbol 2 vs 2 en línea;
espectadores.

## Decisions

### 1. Módulo `juegos/en-vivo.js` (`window.EnVivo`)

Script clásico sin DOM (como `juegos/mesas.js`): lo cargan `juegos.html`, `karts.html`, `futbol.html` y las pruebas de
Deno (`globalThis.EnVivo`).

Contrato público (lo usan Karts y Fútbol; acordado con la fase B, que se programa en paralelo):

```
const canal = await EnVivo.conectar({ topic, url, llave, yo: { id, nombre }, participantes: [ids], hz: 15 });
//   se rechaza en ≤ 5 s si no conecta (quien llama usa su respaldo); opcional `transporte` en lugar de
//   topic/url/llave (p. ej. EnVivo.transporteMarco(juego) en el iframe) y `espera`
canal.enviar(evento, datos)        // ritmo máximo `hz` por evento (guarda el último); agrega seq y t
canal.enviarYa(evento, datos)      // sin esperar el ritmo (último estado antes de cerrar)
canal.al(evento, fn)               // fn(datos, { de, seq, t, latencia, tLocal }); ignora seq viejos y ajenos
canal.presencia()                  // → [ids conectados], incluye el propio
canal.alCambiarPresencia(fn)       // fn([ids])
canal.latencia(id?)                // ms estimados de un sentido
canal.alDesconectar(fn)            // fn(id) cuando un participante pasa 3 s sin mandar nada
canal.cerrar()
EnVivo.simulado({ latencia, perdida, desorden, relevo?, noConecta? })  // doble de prueba: { conectar(o) }
EnVivo.interpolador({ retraso: 100, extrapolar: 250, angulos: [2] })    // agregar(t, arreglo) / muestra(ahora)
```

Por dentro, `EnVivo.crear` es el motor (con reloj inyectable y modo manual) y `EnVivo.redSimulada` la red
determinista de las pruebas de Deno.

- **Sobre:** `{ i, s, t, e, d }` = id del jugador en la sala, secuencia (una por emisor), hora del emisor
  (`Date.now()`), evento y datos. Viaja en el evento de broadcast `vivo` (el servidor sigue usando `estado`).
- **Orden y viejos:** para eventos con ritmo (continuos) se descarta todo `s` ≤ al último visto de ese emisor y
  evento (llegó tarde o repetido). Los eventos sueltos (gol, final) solo se descartan si se repiten (ventana de 64).
- **Reloj por compañero:** `desfase = mín(llegada − t)` de las últimas muestras (con deriva lenta de 0.02 ms/ms): la
  hora del emisor se traduce a la local sin el ruido de la red, y el interpolador usa esa hora.
- **Internos:** `_h` latido cada 1 s (presencia), `_p`/`_q` ping y respuesta a **un** compañero por turno cada 2 s
  (latencia = mediana de las últimas 9 RTT / 2; con 8 personas son 4 mensajes/s, no 56) y `_x` adiós al cerrar.
- **Desconexión:** sin mensajes de alguien durante `silencio` (3 s) → `presente: false`; vuelve al primer mensaje.
- **Reconexión:** si el transporte avisa `caido`, estado `reconectando` y `transporte.reconectar()` a 1, 2, 4 y 8 s
  (tope 10 s); al volver, `vivo`.
- **Respaldo:** si a los `espera` ms (5 s) nunca hubo `vivo`, estado `respaldo` (una vez). Si luego conecta, pasa a
  `vivo` (el juego decide si lo aprovecha).
- **Seguridad:** mensajes de ids fuera de `miembros` o del propio `yo` se ignoran; datos que no son arreglo/objeto
  se ignoran; el sobre se limita a 2 KB.

**Transportes** (interfaz `{ estado, enviar(m), alRecibir(fn), alEstado(fn), reconectar(), cerrar?() }`):
- `EnVivo.transporteSupabase({ topic, url, llave })`: canal propio (lo usa `conectar` con topic/url/llave).
- Karts: la página de Juegos agrega `.on('broadcast', { event: 'vivo' })` al **mismo** canal de `conectarRealtime`
  (un solo socket por sala) y el iframe habla con él por el puente `EnVivo.transporteMarco(juego)` ↔
  `EnVivo.puente({ marco, juego, transporte, permitido })`. La página filtra por participantes antes del iframe.
- Pruebas E2E: si la URL trae `vivoSimulado=1` y existe `window.__vivoSimulado` (opciones de `EnVivo.simulado` que
  inyecta la prueba con `addInitScript`, con `relevo`), la página usa el doble en lugar de Supabase. En producción
  nadie lo inyecta.

### 2. Karts en vivo

- **Mensaje `k`** (arreglo de enteros, ~100 B con el sobre): `[x·10, y·10, ángulo·1000, vel, vuelta, idx,
  banderas, término, personaje]`; banderas = turbo 1, estrella 2, derrape 4, giro 8, rayo 16, ítem en mano 32.
  Ritmo: **15 Hz** con ≤ 4 personas y **10 Hz** con 5–8 (antes de salir y tras la meta, 2 Hz).
- **Quién es quién:** la página pasa al iframe la lista de personas de la sala en orden (`humanos: [{ id, nombre }]`)
  y `yo`. Color = el de su lugar en la lista (igual en todos los aparatos); nombre = el de la sala (el mensaje no trae
  texto que se pinte); personaje = el del mensaje, normalizado con `Personajes.normalizar` (lista leída de
  `juegos/personajes.js`, no fija). Número del kart = su lugar.
- **Dibujo:** cada persona remota es un kart más del arreglo `karts` con `remoto: true`; `pasoRemoto` toma la muestra
  del interpolador (100 ms atrás, extrapolación ≤ 250 ms y luego se queda quieto) y la pinta como los demás: sprite
  del personaje, etiqueta con número y nombre, sombra y minimapa (círculo sólido, los fantasmas punteados).
- **Choques entre personas:** solo **empuje local**: tu kart se separa del remoto y pierde 3 % de velocidad; el remoto
  no se mueve en tu pantalla (en la suya, su dueño hace lo mismo). Es simétrico y no necesita mensajes ni autoridad;
  sin empuje, dos karts se atravesarían. **Ítems entre personas: no.** En sala solo salen monedas, turbo y estrella
  (ya era así), y la estrella no tumba a un remoto: no hay nada ofensivo que sincronizar.
- **Clasificación en vivo:** la posición del HUD y una lista compacta (`#vivo-tabla`, hasta 8 filas: lugar, color y
  nombre corto) ordenan por avance (`vuelta·N + idx`, o el término si ya llegó), con fantasmas y personas.
- **Podio:** sin cambios: cada quien manda su tiempo (`carrera`), el servidor lo valida (`validarCarrera`: mínimo,
  límite y reloj) y el podio sale de la sala.
- **Desconexión:** sin mensajes en 3 s → aviso «👋 <nombre> perdió la conexión» y el kart se desvanece en 1.5 s (se
  quita del dibujo y de la clasificación); si vuelve, reaparece.
- **Respaldo:** sin `rt` (o simulado) el iframe recibe `vivo: false` y corre como hoy con aviso «Sin conexión en
  vivo: corres contra fantasmas y se comparan los tiempos»; si a los 5 s no conectó, el mismo aviso.
- **Bots:** siguen como fantasmas con su tiempo simulado.

### 3. Mesa de Karts (8 personas)

`karts: { max: 8, asientos: 3, min: 1 }` en `server/salas.ts` y `juegos/mesas.js` (`server/mesas_test.ts` las
compara). Con bots: 1 persona + 2 bots (como hoy), 2 + 1, 3 o más sin bots; sin bots, solo personas. La 9.ª persona
recibe `sala_llena`. `asientos: 3` conserva la carrera de una persona igual que antes (BOT-VACHIRA y BOT-ISAGII) y no
necesita un bot con tiempo nuevo.

### 4. Ritmo y tamaño para 8 karts

| Personas | Hz por kart | Enviados por sala | Recibidos por aparato | Bytes/s recibidos |
|---|---|---|---|---|
| 2 | 15 | 30 + latidos | 15 | ~1.5 KB |
| 4 | 15 | 60 | 45 | ~4.5 KB |
| 8 | 10 | 80 + 8 latidos + 4 pings | ~77 | ~8 KB |

El throttle guarda solo el último estado por evento (coalescencia): nunca se acumula una cola. Se mide en la
verificación manual (8 clientes reales 30 s: mensajes/s, pérdidas y errores del canal).

### 5. Fútbol Estelar en línea 1 vs 1 (fase B)

Implementa `futbol-estelar/design.md` §12 con estos ajustes:
- **Sala:** juego `futbol` en `JUEGOS_PARTIDA` (servidor y página), mesa `{ max: 2, min: 2, bots: 'nunca' }`.
  Anfitrión = `sala.host` (quien creó la sala); invitado = la otra persona.
- **Táctica en la sala de espera:** formación (4-4-2, 4-3-3, 3-5-2, 5-3-2) con `POST /unirse { tactica }`, validada en
  el servidor contra la lista; el anfitrión las lee al empezar.
- **Canal:** `fe:foto` (anfitrión → invitado, 15 Hz) y `fe:entrada` (invitado → anfitrión, 30 Hz si cambia y 5 Hz si
  no), `fe:evento` (gol, final; sueltos) sobre `EnVivo`.
- **Invitado:** interpola las fotos 100 ms atrás, predice el movimiento de su jugador controlado con su entrada y lo
  corrige suave hacia la foto (20 % por cuadro; salto directo si la diferencia pasa de 3 m).
- **Desconexión:** invitado callado 3 s → su equipo pasa a la IA (el partido sigue, aviso); anfitrión callado 4 s →
  «Conexión perdida» y el partido se cierra con el marcador de la última foto.
- **Resultado:** `POST /respuesta { futbol: { a, b, fin } }` (goles 0–30, `fin` = `normal` | `corte`); el anfitrión
  manda `normal` solo si pasó la duración del partido (reloj del servidor ± margen); el invitado solo puede mandar
  `corte`; el primero válido queda y nadie lo cambia. Los puntos se calculan del resultado guardado.
- **Respaldo:** sin canal en 5 s, la sala de Fútbol muestra «En línea no disponible» y sugiere la Clasificatoria
  semanal en 🕹️ Arcade.

### 6. Pruebas

- **Unitarias (Deno):** `server/en_vivo_test.ts` con `EnVivo.redSimulada` y reloj inyectado: latencia, pérdida, fuera
  de orden, repetidos, ritmo, presencia y desconexión, reconexión, respaldo a 5 s, miembros, interpolación y
  extrapolación con ángulos.
- **E2E con canal simulado:** `tests/e2e/lib/vivo-relevo.js` levanta un relevo local (HTTP + SSE) y un `addInitScript`
  que crea `window.__vivoSimulado` con latencia, variación y pérdida inyectadas **en la página**; así CI no depende de
  Supabase. Karts con **8 contextos** (el cupo pedido; si la máquina no da, 6 y se justifica en el reporte).
- **Manual con Supabase real:** servidor local con las variables de Supabase en el entorno (nunca en archivos) y
  `STALD_TABLAS=stald_test_` (no escribe en `stald_`), dos contextos en una sala local, latencia medida y 8 clientes
  reales de carga 30 s en un topic de prueba; se borran las salas de prueba (copia de datos temporal) y los canales.

### 7. Alternativas descartadas

- Supabase Presence para «quién está»: más mensajes (diffs de presencia a todos) y difícil de simular; el latido de
  1 s por broadcast da lo mismo con el mismo transporte.
- Un segundo cliente de Supabase en el iframe: otro socket por persona; el puente por `postMessage` reutiliza el canal
  de la página.
- Choques autoritativos entre personas: necesitan dueño y corrección; el empuje local basta para que no se atraviesen.

## Risks / Trade-offs

- [Cuota de mensajes de Realtime con muchas salas a la vez] → 10 Hz con 5–8 personas, coalescencia, 2 Hz fuera de la
  carrera; si Realtime corta, el respaldo deja la carrera jugable.
- [Reloj de los aparatos] → el desfase por compañero usa el mínimo de (llegada − t), no la hora absoluta.
- [Alguien manda posiciones falsas] → solo se ve raro en pantalla; el podio usa el tiempo validado por el servidor.
- [Fotos de Fútbol de ~500 B a 15 Hz] → 7.5 KB/s, dentro del límite de broadcast.

## Migration Plan

Sin migraciones. Se publica en dos PR (Karts y luego Fútbol). Para revertir, basta con quitar el `?vivo` del puente:
las salas vuelven al respaldo (fantasmas).

## Open Questions

- Ninguna bloqueante. La prueba del profe con varios celulares decide si se archiva.
