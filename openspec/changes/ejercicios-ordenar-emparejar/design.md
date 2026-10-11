## Decisiones

### 1. Modelo de datos (banco del repo de datos)

```json
{ "id": "o1", "tema": "futuro", "tipo": "ordenar", "enunciado": "Ordena: Yo voy a viajar mañana",
  "palabras": ["I", "will", "travel", "tomorrow"], "distractores": ["going"],
  "aceptadas": ["Tomorrow I will travel"], "audio": "I will travel tomorrow", "explicacion": "…" }

{ "id": "m1", "tema": "demostrativos", "tipo": "emparejar", "enunciado": "Une cada palabra con su significado",
  "pares": [["this", "este / esta"], ["these", "estos / estas"], ["that", "ese / esa / aquel"], ["those", "esos / esas"]],
  "explicacion": "…" }
```

- `ordenar.palabras`: al menos 2 fichas, en el orden correcto. `distractores` y `aceptadas`: opcionales.
- `emparejar.pares`: de 3 a 6 pares `[izquierda, derecha]`, sin textos repetidos en cada lado.
- `audio` (opcional) aplica igual que en los demás tipos.

### 2. Vista pública (`publicQuestion`)

- Firma: `publicQuestion(e, semilla?)`. `server/actividades.ts` pasa `"<id>|<slug>|<intento>"`, la misma base que la
  selección de ejercicios (`selectQuestions`), con `slug` = alumno o alumna en vista, o `admin` en la vista previa.
- El orden sale de `mulberry32(hashSeed(semilla + "|" + e.id))`: determinista por alumno, intento y ejercicio.
  Así, recargar no cambia las fichas, y el intento 2 las vuelve a barajar.
- Si al barajar queda el orden original (por ejemplo, 1 de 24 con 4 fichas), se rota una posición, para no
  regalar la respuesta.
- Se quitan siempre `palabras`, `distractores`, `aceptadas`, `pares`, `correcta` y `explicacion`.
  - `ordenar` publica `fichas`;
  - `emparejar` publica `izquierda` (en orden) y `derecha` (barajada).

**Alternativa descartada:** barajar en el cliente. Exigiría mandar el orden correcto.

### 3. Respuesta, saneo y calificación (`server/motor.ts`)

- `ordenar`: un texto ≤ 300 caracteres, sin espacios sobrantes en los extremos. Es correcta si
  `normalizeText(respuesta)` coincide con `palabras.join(" ")` o con alguna de `aceptadas`.
- `emparejar`: un arreglo de textos del largo exacto de `pares`.
  - Cada texto es `""` (sin unir todavía) o una de las opciones de `derecha`. Si no cumple, se descarta la
    respuesta completa.
  - Debe traer al menos un par: así el borrador guarda el avance parcial.
  - Es correcta solo si `normalizeText(r[i]) === normalizeText(pares[i][1])` para todos los pares.
- Las respuestas son **texto**, no índices. Por eso no dependen del orden barajado, que cambia entre el
  intento 1 y la corrección.
- Revisión (`tuRespuesta` / `correcta`). Estos textos los usan la revisión de resultados, el guion o la retro
  del Meet y el resumen del admin:
  - `ordenar`: lo que armó / `palabras` unidas;
  - `emparejar`: `"this → este / esta · these → — · …"` (`—` = sin unir) / los pares correctos con el mismo
    formato;
  - un emparejar sin ningún par cuenta como «Sin responder».
- Corrección: sin cambios. `correccionDe` usa `esCorrecta` y `textoRespuesta`, así que las correctas quedan
  fijas (arreglo o texto) y las falladas muestran «Antes respondiste: …».

### 4. Validación (`validateItem`, que usa también `validar_semana.ts`)

- `ordenar`:
  - «ordenar sin palabras» si hay menos de 2 fichas o alguna está vacía;
  - «ficha repetida X» si una ficha se repite entre `palabras` y `distractores` (comparando con
    `normalizeText`);
  - «distractores inválidos» si no son un arreglo de textos no vacíos;
  - «aceptadas inválidas» si no son un arreglo de textos no vacíos.
- `emparejar`:
  - «emparejar con N pares (3 a 6)»;
  - «par inválido» si un par no tiene exactamente 2 textos no vacíos;
  - «texto repetido X» si se repite un texto del mismo lado.

### 5. Página (`ingles/reproductor.js`, `ingles/app.js`, `ingles/ingles.css`)

- **`ordenar`:**
  - `.ord-linea` (tu oración) y `.ord-banco` (fichas): cada ficha es un `<button>`. Al tocarla en el banco pasa
    al final de la línea; al tocarla en la línea regresa a su lugar en el banco;
  - «Borrar» las devuelve todas;
  - la respuesta vive en un `<input type="hidden" class="q-text">`. Así, `examAnswers`, el progreso, el envío y
    el borrador siguen funcionando igual;
  - al restaurar un borrador, el texto se vuelve a convertir en fichas: se toma la ficha libre más larga que
    coincida con el inicio del texto.
- **`emparejar`:**
  - dos columnas de botones;
  - se toca uno de la izquierda (queda `aria-pressed="true"`) y luego uno de la derecha. También funciona al revés;
  - un par hecho lleva color (`par-0` … `par-5`) y un número en los dos lados, para no depender solo del color;
  - tocar un elemento ya unido deshace su par;
  - la respuesta es un JSON en `<input type="hidden" class="q-par">`. `examAnswers` la incluye con al menos un
    par, y la pregunta cuenta como respondida solo con **todos** los pares (lo mismo para «Enviar»).
- **Accesibilidad:**
  - todo son botones nativos (Tab, Enter, Espacio) con `aria-label` que dice el estado, por ejemplo
    «this, unida con este / esta» o «I, ficha 1 de tu oración»;
  - una región `aria-live="polite"` por ejercicio anuncia los cambios;
  - al mover una ficha, el foco pasa a la siguiente ficha disponible, para no perderse;
  - objetivos táctiles de al menos 44 px, que caben en 390 px (las fichas hacen salto de línea; los pares
    van en dos columnas de 1fr).
- **Corrección:** las fijas se pintan deshabilitadas, con la oración o los pares ya armados.
- **Vista previa del admin:** el mismo reproductor (`vistaPrevia`), sin borrador.
- Los scripts de `ingles/` no llevan `?v=` en `ingles.html` (solo `comun/auth.js`), así que no hay versión de
  caché que subir.

### 6. Pruebas

- **Deno:** `server/ordenar_emparejar_test.ts`. Cubre calificación, saneo, revisión, vista pública
  determinista y sin respuestas, validación, corrección y borrador en el servidor (por HTTP con `MemoryStore`).
- **E2E:** `e2e-ordenar-emparejar` (fase `ingles`) con la actividad de prueba
  `tests/fixtures/datos/contenido/actividades/fichas-e2e.json`.
  - Es exclusiva de Fernando (`alumnos: ["fernando"]`, persona de ejemplo) y está en la semana de prueba
    2026-09-21, con fecha el 2026-10-04. Así aparece en «Para ponerte al día» sin tocar a nadie más.
  - Recorre: resolver mal y bien, revisión, corrección, recarga a medio intento y captura a 390 px.
