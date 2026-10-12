## Context

- `juegos.html` es una página grande (más de 3,800 líneas) en la que trabajan otros agentes al mismo tiempo
  (revancha de salas, Plataformas y Karts). Este cambio debe dejar un diff chico ahí para que el merge sea fácil.
- Los juegos de preguntas usan el motor `quiz(opts)` en solitario y `preguntasPartida(juego, seed, opciones)` +
  `pintarPreguntaSala` en partida. La revelación de la partida ya muestra `p.dato` (💡) cuando existe.
- Las salas validan sus opciones en `server/salas.ts` (por ejemplo `rondas` de Basta → 400 `rondas_invalidas`).
- El contenido es estático (`juegos/datos/ingles.json`, servido por Pages) y no tiene datos personales.

## Goals / Non-Goals

**Goals**
- Contenido por tema (≥ 40 frases por tiempo) con `tema`, `es` y regla corta.
- Selector de tema en `en-frases` y `en-ordena` (solitario) y en la sala de `en-frases`.
- Juego nuevo `en-tiempos` (⏳ Máquina del tiempo) en solitario y en partida.
- Regla corta en cada error, sin alargar las pausas actuales (1.4 s en solitario; 4 s de revelación en partida).

**Non-Goals**
- No cambiar las reglas de puntos ni los topes de los juegos existentes.
- No agregar tema a Vocabulario, Spelling ni Memorama (su contenido es de vocabulario, no de gramática).
- No tocar `ingles/` (Inglés en línea) ni `server/motor.ts`.

## Decisions

### 1. Archivo propio `juegos/ingles-gramatica.js`

Toda la lógica nueva vive en un script clásico cargado antes del script principal de `juegos.html`:
- expone `globalThis.InglesGramatica` con funciones puras (sin DOM): `TEMAS`, `GRUPOS`, `filtrar(lista, tema)`,
  `reglaOrden(tema)`, `preguntaFrase`, `preguntaEn`, `preguntasFrasesPartida(d, tema, rnd, n)`, `formas`, `trampa`,
  `reglaTiempo`, `preguntaTiempos(item, paso, par, rnd)`, `preguntasTiempos(d, n, rnd)` y `masFallos(conteo)`;
- define las pantallas `elegirTemaIngles(id)`, `jugarFrasesTema(tema)`, `jugarTiempos()` y
  `resumenFallosSala(sala, n)`, que usan los helpers globales de la página (`quiz`, `marco`, `datos`,
  `jugarOrdena('en', tema)`…). Como son scripts clásicos, las funciones y constantes del script principal se
  resuelven al llamarlas; todo va dentro de una función para no chocar con los nombres de la página.

En `juegos.html` solo cambian: la etiqueta `<script>`, las tarjetas del catálogo (`en-frases`, `en-ordena` y la
nueva `en-tiempos`), `JUEGOS_PARTIDA`, dos ramas de `preguntasPartida`, el selector de tema al crear la sala, un
gancho `alResponder` en `quiz`, la regla en el error de Ordena, el resumen de fallos en `pintarFinalSala` y
`REANUDAR`.

*Alternativa descartada*: escribir todo dentro de `juegos.html`; habría choques de merge con los otros agentes.

### 2. Temas y grupos del selector

`tema` es un texto en cada elemento. El selector agrupa así (un elemento puede caer en dos grupos):

| Selector | id | Temas que incluye |
|---|---|---|
| Todo | `todo` | todos |
| To be | `tobe` | `to be`, `to be pasado` |
| Presente | `presente` | `to be`, `presente simple` |
| Pasado | `pasado` | `to be pasado`, `pasado simple` |
| Futuro (will) | `futuro` | `futuro will` |

Las frases de `negativo` y `preguntas` que ya existían se reclasifican a `to be` o `presente simple` según su
respuesta (isn't / Are… → `to be`; don't / Does… → `presente simple`). Los temas sin tiempo (`wh`, `posesivos`,
`articulos`, `plurales`, `demostrativos`, `adjetivos`) y los temas de conversación de `preguntas` (`gustos`,
`rutina`…) solo salen con «Todo».

### 3. Formato de datos (`ingles.json`)

- `verbos[]` `{ frase, opciones (3), correcta, es, tema, regla }`: `regla` es obligatoria (máx. 90 caracteres) y
  es lo que se muestra al fallar.
- `oraciones[]` `{ en, es, tema }`; las que no son de un tiempo (`Birds can fly`) llevan `general`.
- `preguntas[]` `{ pregunta, opciones (4), correcta, es, tema, regla? }`; las nuevas de tiempos traen `regla`.
- `tiempos[]` (nuevo) `{ sujeto, verbo, presente, pasado, resto, es, tema }`, con `tema` ∈ `regular`,
  `irregular`, `to be`. Las tres oraciones salen de la plantilla:
  presente = `sujeto presente resto`, pasado = `sujeto pasado resto`, futuro = `sujeto will verbo resto`.
  El `resto` no lleva marcas de tiempo (yesterday, tomorrow…) para que las tres formas sean correctas.

La prueba `server/ingles_datos_test.ts` valida la forma: temas válidos por clave, `correcta` en rango, opciones
sin repetir, `es` no vacía, `regla` en `verbos`, mínimo 40 frases por tema de tiempo, mínimo 6 oraciones y 5
preguntas por grupo del selector, y al menos 40 elementos en `tiempos`.

### 4. Máquina del tiempo (`en-tiempos`)

- Cada oración se juega en dos pasos con el motor `quiz` (cuenta como dos preguntas):
  1. **¿En qué tiempo está?** Se muestra la oración en un tiempo al azar; opciones fijas ⏪ Pasado · ▶️ Presente ·
     ⏩ Futuro.
  2. **Cámbiala a…** otro tiempo al azar; 3 opciones: la correcta, la del tiempo original y una «trampa» típica:
     - a pasado: `will` + pasado (`She will played…`);
     - a futuro: `will` + verbo con -s (`She will plays…`) o, si no hay -s, `will` + pasado;
     - a presente: concordancia equivocada (`She play…` / `I plays…`; en to be `She are…`).
- 90 s contra reloj, puntos y racha del motor `quiz` (100 + 10 por racha hasta +100), igual que `en-frases`.
  Tope del catálogo: 2,000.
- Cada pregunta trae `explicacion` (la regla) y `fallo` (etiqueta del tipo de error, por ejemplo «Pasado
  irregular» o «Presente con he / she / it»). El gancho `quiz(opts).alResponder(pregunta, bien)` cuenta los
  fallos y el resultado muestra «Lo que más se te complicó» (las 3 etiquetas con más fallos).
- En partida: `preguntasPartida('en-tiempos')` arma 5 oraciones × 2 pasos = 10 preguntas con la semilla de la
  sala; cada una lleva `dato` = regla, que la revelación ya muestra. El podio y el guardado son los mismos que
  `en-frases` (`/juegos/partida` con `sala`). Al final, la pantalla de la partida muestra el mismo resumen de
  fallos con las respuestas propias.

### 5. Selector de tema

- Solitario: al tocar `en-frases` o `en-ordena` aparece «Elige el tema» con 5 botones `.opt[data-tema]`
  (el primero es «Todo»). `en-frases` filtra `verbos` y `preguntas`; si un grupo no tiene preguntas, usa solo
  frases. `en-ordena` filtra `oraciones`. El tema se guarda en la instantánea para reanudar (`REANUDAR`).
- Partida: el formulario de crear muestra «Tema» cuando el juego es `en-frases`; va como `opciones.tema`.
  - Servidor: `opciones.tema` solo se acepta en `en-frases`; valores `todo` (por omisión), `tobe`, `presente`,
    `pasado`, `futuro`; otro valor → 400 `tema_invalido`.
  - El título de la partida muestra el tema elegido.

### 6. Regla al fallar

- `en-frases`: `explicacion` = «Era: <frase completa> · 📌 <regla>». En partida, `dato` = regla.
- `en-ordena`: en el error final se muestra la oración y `reglaOrden(tema)` (por ejemplo «Futuro: sujeto + will +
  verbo base»).
- La pausa tras un error se mantiene en 1.4 s (solitario) y 1.8 s (Ordena); el texto es una sola línea corta.

## Risks / Trade-offs

- Choques de merge en `juegos.html` y `server/salas.ts` con los otros agentes → cambios de pocas líneas y
  localizados; la lógica en un archivo propio.
- Los conteos del menú en E2E (21 → 22) cambian también con los otros agentes → se ajustan aquí y se resuelven al
  hacer merge.
- Calidad del contenido A1: se revisa a mano y se valida su forma con la prueba de datos.

## Matriz de acceso

Sin datos personales nuevos. El contenido es público (Pages). Las salas siguen las reglas actuales: solo
jugadores registrados crean y se unen; `opciones.tema` no identifica a nadie.
