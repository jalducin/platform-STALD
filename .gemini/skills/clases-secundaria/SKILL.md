---
name: clases-secundaria
description: Prepara, valida y sube las clases de Secundaria de cada bloque de 2 semanas (2 por día de lunes a sábado y 3 el domingo), además de repasos y tareas sueltas, en el repo privado de datos. Úsala cuando pidan «arma las siguientes 2 semanas de Secundaria», «las clases de la alumna de Secundaria», «un repaso de Secundaria», «agrega esta tarea a Secundaria», o den temas de alguna materia de Secundaria.
---

# clases-secundaria

Reglas para preparar las clases de Secundaria en el portal. Desde octubre de 2026 Secundaria ya no usa Notion. El
formato de cada JSON está en [docs/data-model.md](../../../docs/data-model.md), secciones «Actividades semanales»,
`teoria[].diagrama` y `contenido/secundaria/`. Léelo ahí; no se copia aquí.

## Reglas que no se rompen

- **Privacidad:** el contenido va solo al repo **privado** `jalducin/platform-STALD-data`. Trabaja en una copia en
  el scratchpad.
  - Nada de correos en archivos del repo de datos: la identidad vive en Postgres.
  - Nombres en ejercicios: siempre inventados.
- **Publicar:** no se sube nada sin `server/validar_semana.ts <datos> <lunes> --secundaria` con **0 errores**.
- **Repetición:** antes de elegir temas, revisa lo que ya vio para no repetir:
  - `contenido/secundaria/historial/<slug>.json`: lo que vio en Notion;
  - `contenido/secundaria/pendientes-notion.md`: lo pendiente;
  - resultados de las clases anteriores.
- **Fuentes verificadas:**
  - Videos de YouTube: comprueba cada uno con `https://www.youtube.com/oembed?url=<url>&format=json`, que debe
    dar 200.
  - Lecturas: deben dar 200 **y** el título de la página debe coincidir con el tema.
  - Khan Academy y Cambridge responden 200 aunque la página no exista, así que revisa el título o no las uses.
- **Idioma:** español de México. En Inglés, las instrucciones van en español y el contenido en inglés.
- **Tono:** lenguaje claro, motivador y nada tedioso, para 12–13 años.

## Horario (15 clases por semana)

| Día | Clases |
|---|---|
| Lunes | Inglés, Español |
| Martes | Matemáticas, Inglés |
| Miércoles | Español, Ciencias |
| Jueves | Matemáticas, Inglés |
| Viernes | Español, Tecnología |
| Sábado | Matemáticas, Inglés |
| Domingo | Tecnología, Ciencias Sociales, Artes **o** Educación Física (alternan cada domingo) |

A la semana: Inglés 4, Español 3, Matemáticas 3, Tecnología 2, Ciencias 1, Ciencias Sociales 1 y Artes o Ed. Física 1.

## Cómo avanza cada materia

| Materia | Secuencia |
|---|---|
| **Matemáticas** | Aritmética, 1 mes (26 oct–22 nov 2026): solo temas puntuales que no haya visto, porque va avanzada → **Geometría**, 1 mes (23 nov–20 dic): empieza por volumen de prismas, lo pendiente → **Álgebra** (desde ene 2027): ecuaciones de primer grado, incógnita en ambos lados y luego los temas avanzados de secundaria |
| **Ciencias** | **Biología**, 3 meses (oct 2026–ene 2027): de cero (método científico, seres vivos, célula) y luego los sistemas que no ha visto (nervioso, excretor, reproductor) → **Química**, 3 meses → **Física**, 3 meses (Leyes de Newton y energía estaban pendientes) |
| **Ciencias Sociales** | Rotación mensual: **Cívica y Ética** (26 oct–22 nov) → **Historia** (23 nov–20 dic; sigue la Revolución, porque llegó al Porfiriato) → **Geografía** (ene; coordenadas y climas de México) → otra vez Cívica… |
| **Tecnología** | **Bases** desde cero, rápidas y prácticas, unas 6 semanas: computadora, archivos, internet seguro, pensamiento computacional, hojas de cálculo, ofimática → **Programación** (repaso de listas, funciones y diccionarios en Python) e **IA** (bases, sesgos, uso responsable) |
| **Inglés** | Desde cero (le fue mal): alfabeto → números y colores → *to be* → posesivos → adjetivos → **presente simple** (-s, do/does) → *there is/are* → pasado → futuro. Avanza despacio, con mucha práctica y *speaking* |
| **Español** | Programa de 1.º de secundaria sin repetir lo visto (acentuación, categorías gramaticales y cuento ya los domina). Ortografía en cada bloque. Tareas del **libro físico de ortografía** cuando el profe lo pida |
| **Artes / Ed. Física** | Domingos alternados. Artes: elementos visuales y artistas mexicanos (el círculo cromático ya lo vio). Ed. Física: rutina segura, registro en la libreta. Coordinación y equilibrio estaba pendiente |

## Formato de cada clase

- `actividad` con:
  - `id` = `sec-<materia>-<fecha>`, con materia `ingles`, `espanol`, `mate`, `ciencias`, `sociales`, `tec`,
    `artes` o `edfisica`;
  - `titulo` = «<emoji> <Materia> · <tema>»;
  - `"materia"`, con el nombre de la materia.
- **Fechas (para que pueda adelantar; cambio `secundaria-adelantar`):**
  - `dia` = día del horario en que toca la clase;
  - `disponibleDesde` = inicio del bloque de 2 semanas, para que pueda adelantar;
  - `fechaLimite` = el día siguiente a `dia`.
  - Así la clase sale en su día en «Hoy te toca», «Esta semana» y «Mi horario», pero se puede resolver antes. Hecha
    antes de su día cuenta a tiempo. Sin `dia`, la clase vuelve a la regla vieja (`disponibleDesde` = su día).
- `intentos: 2` y `porSecciones: true`.
- **Exclusividad:** `alumnos` con los slugs de la alumna, los mismos que en las clases anteriores de
  `contenido/secundaria/actividades/`, **en el mismo orden: el slug canónico primero** (`["sofia","sofy"]`). El
  servidor toma el primero como su slug de Secundaria (con el que están sus resultados; cambio
  `secundaria-sin-notion`). No mezclar en un mismo arreglo a dos personas con nombres parecidos.
- **Ejercicios:**
  - 14–18 por clase (Artes y Ed. Física, unos 10);
  - ~70 % `opcion` / 30 % `escribir`, con `aceptadas` amplias (numéricas, contracciones, mayúsculas);
  - posición de la correcta repartida entre 0 y 3;
  - explicación en cada ejercicio.
  - El motor ignora acentos al calificar: en ortografía pide la regla, la letra o el tipo, no la palabra con tilde.
- **Temas:** cada uno con `retroalimentacion` (fortaleza / en-progreso / debilidad).
- **Teoría:** corta y visual, con tablas, ejemplos y **≥ 2 diagramas**. En `comparar`, `derecha` es obligatoria.
- **Tips:**
  - 1 «📒 Tarea de libreta», más el *speaking* en Inglés y la 🧪 práctica en la compu en Tecnología;
  - 2 videos reales verificados;
  - 1–2 lecturas verificadas.
  - Fuentes buenas: SEP Nueva Escuela Mexicana, CONALITEG, UNAM, FundéuRAE, Microsoft y Google (ayuda), CNDH,
    UNICEF, OMS e IMSS. En videos: profe Alex, Daniel Carreón, Smile and Learn, LearnFree, Khan Academy Español y
    canales de inglés para principiantes en español.
- **Mini examen:** la última clase de cada materia en el bloque de 2 semanas trae un tema 🎯 de repaso de lo visto.

## Paso a paso (cada bloque de 2 semanas)

1. **Fechas:** calcula los 2 lunes del bloque con la fecha real. El siguiente bloque empieza el 2026-11-09.
2. **Temas:** elige los de cada materia según la secuencia y el historial, sin repetir. Si el profe da temas o fotos
   del libro, esos mandan.
3. **Generador:** `herramientas/secundaria-<lunes>/<materia>.py`, uno por materia o grupo de materias. Puedes
   repartirlo entre varios agentes en paralelo, cada uno en su propia copia y tocando solo sus archivos.
4. **Semanas:** `contenido/secundaria/semanas/<lunes>.json`, con `elementos` ordenados por día y `fecha` igual
   a la `fechaLimite` de cada clase.
5. **Validar:** `npx -y deno run --allow-read server/validar_semana.ts <datos> <lunes> --secundaria`, una vez por
   cada lunes. Debe dar 0 errores. Los avisos de «poca variedad del banco» son normales con una sola alumna.
6. **Subir:** commit «secundaria: semanas N y N+1 (<fechas>)» y push al repo de datos, que publica en `main` por
   diseño. El servidor lo toma en menos de un minuto.
7. **Avisar al profe** con una tabla por día: materia y tema.

## Repasos y tareas sueltas

- **Repasos:** `sec-repaso-<materia|general>-<fecha>`, en la semana que les toca. Pueden abrir y vencer el mismo día.
- **Tareas copiadas de Inglés** (por ejemplo, la guía en PDF para la libreta):
  - copia la actividad con un `id` nuevo `sec-…`, `materia` y `alumnos`;
  - conserva sus tips (descarga del PDF, libreta) y agrega el «🎙️ audio para el profe» si lo lleva.

## Misiones principales (una por mundo; cambio `rpg-fase2-misiones`)

El formato de `mundos.json` y de cada misión está en [docs/data-model.md](../../../docs/data-model.md) § «Misiones
principales». Léelo ahí; no se copia aquí.

- **Entregables solo en texto.** Cada paso lleva `tipoEntrega: "texto"`; lo que antes era foto, cartel, hoja de
  cálculo o audio se pide escrito. Imagen y audio llegarán en otro cambio, con consentimiento firmado.
- **Privacidad en la consigna:** debe incluir «🔒 Sin nombres reales, direcciones ni datos de contacto» (el validador
  lo exige). Pide personajes, productos y lugares inventados; nunca datos de la alumna, su familia o su escuela.
- **Forma:** `id` `mis-<materia>-<mundo>` (único también entre `contenido/secundaria/` y `contenido/ingles/`), 3 a 5
  pasos con fechas en orden y dentro del mundo, rúbrica de 4 criterios con niveles cuyos máximos suman 100, tips con
  fuentes verificadas (mismas reglas de arriba) y teoría opcional con `practica` (la respuesta nunca llega al
  navegador).
- **Catálogo:** `contenido/secundaria/mundos.json` se genera con `npx -y deno run -A server/generar_mundos.ts <datos>`
  (copia nombres y fechas de `comun/gamificacion.js`); si cambian los mundos, se cambian primero ahí.
- **Validar:** `npx -y deno run --allow-read server/validar_semana.ts <datos> --misiones secundaria` con **0 errores**
  (y `--misiones ingles` si tocaste las de Inglés).
- **Subir:** solo después de que el código que las lee esté en producción. Commit «secundaria: misión <título>».
- **Evaluación:** la hace el profe en «📥 Entregas» con la rúbrica; la XP de la misión es rúbrica × 3 + 60 a tiempo.
