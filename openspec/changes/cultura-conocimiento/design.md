## Context

- El catálogo del cliente (`CATEGORIAS` y `JUEGOS` en `juegos.html`) agrupa los juegos por `cat`. El servidor tiene su
  propio `CATALOGO` en `server/juegos.ts` con `categoria`, título y tope; la categoría del servidor no cambia el
  puntaje, pero se mantiene igual a la del cliente.
- El quiz de sala (`pintarPreguntaSala`) va sincronizado por reloj con la hora de inicio del servidor; cada jugador
  escribe solo su archivo y los bots se calculan en el cliente con la semilla.
- Hay otros cambios en paralelo en `juegos.html`, `server/salas.ts`, `server/juegos.ts` y `juegos/mesas.js`. Para
  no chocar, los cambios de este van en bloques propios marcados con `// cultura-conocimiento`, y la lógica nueva vive
  en un archivo aparte.

## Goals / Non-Goals

**Goals:** una sola sección; contenido al menos al doble y balanceado; Línea del tiempo individual y en sala; buena
vista a 390 px; respetar `prefers-reduced-motion`.

**Non-Goals:** cambiar los ids o los topes de los juegos que ya existen; mover contenido a Postgres; ampliar
`espanol.json` (su contenido ya alcanza para Ortografía y Ordena la oración).

## Decisions

### 1. Sección única
- `CATEGORIAS` deja una sola entrada `{ id: 'cultura', titulo: '🧠 Cultura y Conocimiento' }`; `es-ortografia` y
  `es-ordena` pasan a `cat: 'cultura'`. El orden de la sección es Maratón, Línea del tiempo, Ortografía y Ordena.
- En el servidor, `CATALOGO` cambia `categoria: "espanol"` por `"cultura"` en `es-*` (también en los absorbidos,
  que solo conservan puntos). Los ids no cambian, así que récords, ranking y salas siguen igual.
- La clase `.cat-espanol` se queda en el CSS sin usarse por ahora: no estorba y evita tocar más líneas.

### 2. Contenido de `cultura.json`
- Se agregan 393 preguntas (384 → 777). Las 14 categorías quedan entre 50 y 60 preguntas, con al menos 11 por nivel.
- La posición de la respuesta correcta sale de un hash del texto, para que no quede siempre en el mismo lugar.
- El generador vivió fuera del repo; la fuente de verdad es el JSON, validado por `server/cultura_datos_test.ts`.
- El Maratón ya mostraba el dato al fallar; ahora el quiz acepta `datoAlAcertar` y lo muestra también al acertar, con
  una pausa de 1.6 s para leerlo. Solo lo activa el Maratón.

### 3. Formato de `linea`
```json
"linea": {
  "temas": [{ "id": "historia-mexico", "titulo": "Historia de México", "emoji": "🇲🇽" }, …],
  "sets": [{ "tema": "inventos", "titulo": "Transporte", "sucesos": [{ "txt": "…", "anio": 1903, "dato": "…" }, …] }]
}
```
- Cada set tiene de 6 a 8 sucesos de un tema, con años enteros distintos (negativos = antes de Cristo; se muestran
  como «776 a. C.»). Así cualquier selección de 4 a 6 sucesos de un set tiene un único orden correcto.

### 4. Lógica pura en `juegos/linea-tiempo.js`
Script clásico, como `juegos/ingles-gramatica.js`, cargado antes del script principal:
- `globalThis.LineaTiempo` (sin DOM, probado con Deno): `TEMAS`, `RONDAS_SALA = 5`, `SUCESOS_SALA = [4, 5, 5, 6, 6]`,
  `sucesosDeLinea(n)`, `armarLinea(d, tema, n, rnd)`, `lineasPartida(d, tema, rnd)`, `aciertos(orden, linea)`,
  `puntosIndividual({ aciertos, n, racha, segundosSobran })`, `puntosSala(aciertos, n, ms, limiteMs)`,
  `botLinea(rnd, acierto, n, limiteMs)`, `podioLinea(filas)` y `anioTexto(anio)`.
- Pantallas (`elegirLineaTiempo`, `jugarLineaTiempo`, `pintarLineaSala`): usan los helpers globales de `juegos.html`
  (`marco`, `reloj`, `terminar`, `datos`, `rngDe`, `pintarFinalSala`, `sala`…), que se resuelven al llamarlas.

### 5. Interacción (celular primero)
- La línea es una lista vertical de casillas numeradas, de «⬆ Más antiguo» a «⬇ Más reciente»; debajo, las tarjetas
  por colocar.
- **Tocar** una tarjeta la coloca en la primera casilla libre; tocar una casilla ocupada la regresa.
- **Arrastrar** con el dedo o el mouse (Pointer Events) una tarjeta o una casilla ocupada a otra casilla la pone ahí;
  si la casilla estaba ocupada, intercambian lugar. Sin movimiento (menos de 8 px), cuenta como toque.
- «✔ Confirmar» se habilita con todas las casillas llenas. Al confirmar, cada casilla muestra el año y ✔/✘, y abajo se
  ve el orden correcto con el dato 💡 de cada suceso.
- Con `prefers-reduced-motion` no hay animación de revelado ni transición al arrastrar.

### 6. Puntos
- **Individual**: línea perfecta = 100 + 20 × sucesos + racha (`min(racha − 1, 10) × 10`) + rapidez (2 por segundo
  que sobra, hasta 90). Con errores, 15 por suceso en su lugar, la racha vuelve a 0 y se pierde una vida. Si se acaba
  el tiempo, se califica lo colocado. Termina sin vidas o tras 10 líneas; el servidor recorta al tope de 3,000.
  `aciertos` = líneas perfectas; `total` = líneas jugadas.
- **Sala**: 20 por suceso en su lugar y, si la línea es perfecta, hasta 80 más por rapidez (máximo 200). Desempate del
  podio: más puntos, luego más sucesos acertados y luego menos tiempo total.

### 7. Sala sincronizada
- 5 líneas de 4, 5, 5, 6 y 6 sucesos; cada línea tiene 40 s para ordenar y 8 s de revelación (`× TIEMPO` en E2E).
  Con la semilla de la sala todos ven los mismos sucesos y el mismo orden inicial de tarjetas.
- La respuesta va por la ruta del quiz: `POST /juegos/sala/<código>/respuesta` con
  `{ q, correcta, puntos, ms, aciertos }`. Si se acaba el tiempo sin confirmar, se envía lo colocado.
- El servidor, solo para `cultura-linea`: `q` de 0 a 4, `aciertos` entero de 0 a 6 (obligatorio), `ms` hasta
  60,000 y `puntos` recortados a `min(200, 20 × aciertos + (correcta ? 80 : 0))`. Otro valor → 400
  `respuesta_invalida`. Los demás juegos de preguntas no cambian.
- `opciones.cat` es el tema (`todos` por defecto o uno de los 4); otro valor → 400 `tema_invalido`.
- Bots: con su % de acierto ordenan perfecto; si no, aciertan de 0 a n − 2 sucesos, en 8 a 35 s.
- El final usa `pintarFinalSala` con `finAciertos` (líneas perfectas) y `finTotal = 5`; da la revancha.
- Mesa `cultura-linea: { max: 30, min: 1 }` en `MESAS` (`server/salas.ts`) y `juegos/mesas.js`, sin `asientos`:
  los bots se suman aparte.

## Risks / Trade-offs

- [Choques con otros agentes en archivos compartidos] → bloques pequeños y marcados; la lógica nueva, en un archivo
  aparte.
- [Exactitud del contenido] → solo datos de nivel secundaria, con fechas conocidas; sin temas polémicos ni fechas
  aproximadas en la línea del tiempo.
- [El cliente calcula los puntos] → igual que el quiz; el servidor los recorta según los aciertos y el tope.
