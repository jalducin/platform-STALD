## Context

Base: `openspec/changes/futbol-estelar/design.md` §12 (autoritativo en el anfitrión sobre Supabase Realtime
broadcast). El canal lo construye el sprint 27A en `juegos/en-vivo.js`; este cambio programa contra su contrato:

```js
const canal = await EnVivo.conectar({ topic, url, llave, yo: { id, nombre }, participantes: [ids], hz });
canal.enviar(evento, datos); canal.al(evento, fn /* (datos, { de, seq, t, latencia }) */);
canal.presencia(); canal.alCambiarPresencia(fn); canal.latencia(id?); canal.alDesconectar(fn /* id, a los 3 s */); canal.cerrar();
EnVivo.simulado({ latencia, perdida, desorden }); // doble de pruebas con la misma API
```

## Goals / Non-Goals

- Meta: 1 vs 1 en vivo jugable en celular con 50–300 ms de latencia, mismo marcador en ambos aparatos y resultado
  registrado por el servidor.
- Fuera: 2 vs 2 en línea, rollback, servidor autoritativo, cambios en la configuración de Supabase.

## Decisions

### 1. Sala y táctica
- Mesa `futbol: { max: 2, min: 2, bots: "nunca" }` (server y página iguales). El anfitrión es `sala.host`.
- Táctica en el asiento: `POST /unirse { tactica }` (también para quien ya está dentro, como el equipo de Futbolito);
  `server/futbol_linea.ts › validarTactica` (formación de la lista y enteros 0–100). Se puede cambiar solo antes de
  empezar (409 `ya_empezo`).
- Clubes: los saca la semilla de la sala (`FutbolRed.clubesDeSala(seed, 24)`), dos distintos; partido de 3 minutos
  reales, sin fuera de lugar complicado (sí activado) y nivel humano para los dos equipos.

### 2. Foto del anfitrión (`fe:foto`, 15 Hz)
`{ q, t, e, mi, m, g:[g0,g1], du, po, h:[jugAnf, jugInv], ai, b:[x,y,z,vx,vy,vz], j:[x,y,dir,anim × 22], ta? , ev? }`
- `x,y,z` × 20 (0.05 m), velocidades × 10, `dir` en 1/64 de vuelta (0–63), `anim` índice de 6, `t` ms del anfitrión
  desde el inicio, `ai` = último `seq` de entrada del invitado ya aplicado, `ev` = avisos desde la foto anterior.
- Tamaño medido en prueba: < 600 B en JSON.

### 3. Entrada del invitado (`fe:entrada`, 30 Hz)
`{ s, x, y, b }`: `x,y` × 100 enteros, `b` máscara de 6 botones. Los botones se **acumulan** entre envíos (un toque
corto no se pierde) y el anfitrión ignora `s` viejos.

### 4. Interpolación, predicción y reconciliación (invitado)
- Búfer ordenado por `t` (descarta repetidas y viejas, máximo 30). Reloj: `offset` = mínimo suavizado de
  `t_foto − ahora_local`; se dibuja en `ahora + offset − 100 ms`, interpolando lineal (ángulo por el camino corto)
  entre las dos fotos que lo rodean; sin la siguiente, extrapola hasta 100 ms con la velocidad del balón.
- Predicción solo del jugador controlado y solo en juego sin balón (`estado === juego` y `du !== jug`): cinemática del
  motor (aceleración hacia la velocidad deseada). Reconciliación: al llegar una foto, parte de la posición autoritativa
  y re-aplica las entradas con `seq > ai`; la diferencia con lo dibujado se corrige suave (30 % por cuadro) o de golpe
  si pasa de 3 m.

### 5. Desconexión (decisión)
- **Aviso + IA de inmediato + cierre a los 15 s.** `canal.alDesconectar(id)` (3 s sin mensajes) → aviso con cuenta
  regresiva. Si se cae el invitado, el anfitrión quita su humano y la IA toma su equipo (vuelve a ser humano si regresa).
  Si en 15 s no vuelve, el partido termina con el marcador de ese momento.
- Por qué: pausar congela al que se quedó y deja que quien va perdiendo «pause» desconectándose; seguir con la IA el
  partido entero regala puntos a quien se fue. 15 s cubre un cambio de red o de app en el celular.
- Si se cae el anfitrión, el invitado no puede simular: muestra «Conexión perdida» con la misma cuenta y, si no vuelven
  las fotos, cierra con el marcador de la última foto y lo reporta con `corte: true`.

### 6. Resultado
- `server/futbol_linea.ts`: `validarResultado(crudo, inicio, ahora)` (enteros 0–30, ≤ 1 + ms/10 000 goles, 10 s ≤ ms
  ≤ 20 min y ≤ ahora − inicio + 5 s) y `resultadoFutbol(sala, jugadores)` → `{ estado: confirmado | disputa |
  anfitrion | invitado | pendiente, goles, puntos: { id: n } }`.
- Guardado en el asiento (`futbol: { goles, ms, corte?, t }`, solo el primero) y devuelto en la respuesta.
- Puntos = fórmula del partido rápido (`300/120/40 + 60·min(6, gf) − 20·gc`, 0–1000) con el marcador aceptado.
- La página pinta el podio con `pintarFinalSala` (registro `final`, `/juegos/partida` y revancha de siempre).

### 7. Respaldo
Sin `rt` en la sala o si `EnVivo.conectar` rechaza (≤ 5 s): el iframe muestra «El partido en vivo no está disponible
en esta sala» y el botón «📅 Jugar la Clasificatoria semanal» (modo local de siempre); la página no reporta resultado.

### 8. Integración con la página (iframe)
El iframe avisa `listo`; `pintarFutbolSala` (arcade.js) abre `EnVivo.puente` con el canal de la sala y le manda `{ tipo: 'inicio', modo: 'linea', rol, yo, rival,
seed, vivo, participantes, tacticas }`; el iframe responde `fin-linea { goles, ms, corte }` y la
página lo manda al servidor y pinta el podio con los puntos que devuelve el servidor.

## Risks / Trade-offs

- [27A aún no está en `main`] → se programa contra un doble local en las pruebas; no se publica sin el módulo real.
- [Celular lento como anfitrión] → la foto se arma con enteros y sin copias del partido; el invitado no simula IA.
- [Trampa del anfitrión] → el servidor solo valida plausibilidad y coincidencia; un desacuerdo queda «en disputa»
  visible para el admin.

## Migration Plan

Merge a `main` (Pages + Deno Deploy). Verificar en producción que la sala `futbol` se crea y que `futbol-red.js` y
`futbol.html` responden 200. Reversa: revertir el merge.
