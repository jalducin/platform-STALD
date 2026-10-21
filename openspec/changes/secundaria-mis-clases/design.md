## Context

El módulo de Secundaria reutiliza el motor de actividades (`handleActividades` con `AMBITO_SECUNDARIA`). La lista
del alumno trae `hoy`, `semana` (la que contiene hoy) e `items` con `fechaLimite`, estado y oportunidades. La vista
(`ingles/secundaria.js`) pintaba una sola tarjeta «📝 Mis exámenes».

## Goals / Non-Goals

**Goals:** que la alumna vea primero lo de hoy, la semana por día y su horario por materia; validar Secundaria desde
la CLI; `materia` opcional en el contrato.

**Non-Goals:** cambiar la visibilidad del servidor (semanas iniciadas + sueltos), la matriz de acceso, la vista de
Inglés, el tablero de Notion o la vista del admin (salvo mostrar la materia).

## Decisions

1. **El día de una clase es su `fechaLimite`.** En las semanas de Secundaria cada elemento tiene `fecha` =
   `fechaLimite` (lo exige el validador), y las clases abren su día. «Hoy» = `fechaLimite === hoy`; «Esta semana» =
   `fechaLimite` entre el lunes y el domingo de la semana de `hoy` (calculado en la vista con `act.hoy`). Lo demás va
   en «📝 Otras clases y exámenes». Alternativa descartada: usar `semana.ids` (no cubre exámenes sueltos ni prórrogas).
2. **Materia: campo opcional con respaldo en el título.** `materia` explícita gana; si falta, prefijo del título
   antes de « · » sin el emoji inicial; si el prefijo contiene una materia conocida (sin acentos ni mayúsculas, la más
   larga primero: «Ciencias Sociales» antes que «Ciencias»), se usa la canónica. Sin « · », sin chip de materia.
3. **Color por materia con tokens CSS.** Clase `mat-<clave>` (ingles, espanol, matematicas, ciencias, sociales,
   tecnologia, artes, edfisica, otra) que fija `--mat` y `--mat-soft`; redefinidos en oscuro con
   `[data-theme="dark"]` y `prefers-color-scheme`. El chip lleva texto (accesible sin color).
4. **Pestañas dentro de la vista.** Botones «📚 Mis clases» / «🗓️ Mi horario» (`data-sec-tab`, `aria-pressed`); el
   estado vive en `state.secTab`. No se usa la barra de secciones de Inglés (sigue oculta).
5. **Horario responsive sin scroll.** `grid-template-columns: repeat(7, minmax(0, 1fr))` en anchos ≥ 760 px; debajo,
   una columna (lista por día). `minmax(0, …)` y `overflow-wrap:anywhere` evitan el desborde.
6. **Validador `--secundaria`.** `AMBITO_SECUNDARIA` en `validarSemana`. Sin patrón de días; apertura:
   `lunes ≤ disponibleDesde ≤ fechaLimite` sin la regla «examen bloqueado hasta su día»; sin el aviso de
   `segundaOportunidad`. `materia` inválida es error en `validateItem` (todos los ámbitos).

## Risks / Trade-offs

- Una clase repetida en «Hoy» y en su día de «Esta semana» aparece dos veces; es intencional (Hoy es el atajo).
- Si el título no sigue «<emoji> <Materia> · <tema>», el chip muestra el prefijo tal cual o no aparece.
