## Why

El menú de Juegos tiene dos secciones chicas que hablan de lo mismo: «📝 Español» (Ortografía y Ordena la oración) y
«🧠 Maratón de cultura» (un solo juego). El profe pide juntarlas en una sola sección, «🧠 Cultura y Conocimiento», con
más contenido y un juego nuevo para ordenar sucesos en el tiempo. Los alumnos y las alumnas de secundaria y las
personas adultas juegan sobre todo en el celular.

## What Changes

- **Sección única «🧠 Cultura y Conocimiento»** en `juegos.html`, con 4 juegos: 🏃 Maratón de cultura, 📜 Línea del
  tiempo (nuevo), ✍️ Ortografía y 🔀 Ordena la oración. Desaparecen las secciones «📝 Español» y «🧠 Maratón de
  cultura». Los ids de los juegos no cambian, así que los puntos y récords anteriores siguen contando.
- **Más conocimiento en `juegos/datos/cultura.json`**: de 384 a 777 preguntas, en 14 categorías balanceadas (de 50 a
  60 preguntas cada una), con 4 categorías nuevas: Matemáticas básicas, Deportes, Naturaleza y animales, y Cultura
  general de México. Cada pregunta tiene su dato breve y verificable, y el Maratón lo muestra también al acertar.
- **Juego nuevo «📜 Línea del tiempo» (`cultura-linea`)**: se ordenan de 4 a 6 sucesos o inventos, del más antiguo
  al más reciente, tocando o arrastrando las tarjetas. Al confirmar se revelan los años y un dato curioso.
  - Individual: 3 vidas, 45 s por línea, racha y puntos, hasta 10 líneas; tope de 3,000 en el catálogo.
  - En partida: todos ordenan las mismas 5 líneas con la misma semilla; gana quien acierta más y más rápido; podio
    con revancha. Mesa `{ max: 30, min: 1 }`, con los bots aparte, como el quiz.
  - Contenido en la clave nueva `linea` de `cultura.json`: 4 temas (historia de México, historia universal, inventos y
    ciencia), 20 sets y 126 sucesos.
- Pruebas: datos de `cultura.json`, funciones puras de la Línea del tiempo, sala del servidor y E2E nueva
  `e2e-cultura-conocimiento`. Las E2E que contaban juegos o secciones ahora cuentan sin un número fijo de juegos.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: cambia «Catálogo de juegos» (sección única); se agregan «Cultura y Conocimiento con más contenido»,
  «Línea del tiempo» y «Línea del tiempo en partida».

## Impact

- Superficies: `juegos.html` y el servidor Deno (`server/salas.ts`, `server/juegos.ts`). No toca `index.html`,
  `ingles.html`, `secundaria.html`, Postgres, Realtime, Auth, el repo privado de datos ni Notion.
- Archivos: `juegos/datos/cultura.json`, `juegos/linea-tiempo.js` (nuevo), `juegos/mesas.js`.
- Datos personales: ninguno nuevo. La sala guarda, como el quiz, la respuesta de cada línea (`correcta`, `puntos`, `ms`
  y `aciertos`), visible solo para quienes están en la sala y para el admin.
- Acciones externas: ninguna. Deno Deploy y Pages publican con el merge a `main` (responsable: usuario).
