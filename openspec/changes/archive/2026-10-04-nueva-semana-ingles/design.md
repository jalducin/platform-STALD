## Contexto

El formato de los JSON está en `docs/data-model.md` y la lógica en `server/motor.ts` (`validateItem`).
Cada semana se identifica por su lunes (`contenido/semanas/<lunes>.json`) y se vuelve visible cuando
`id <= hoy` (hora de CDMX).

## Decisiones

### 1. Exámenes sueltos = no referenciados por ninguna semana
`visibleItems` lee **todas** las semanas (iniciadas o no) para decidir qué examen es suelto. Solo muestra
los elementos de las semanas iniciadas. Costo: una lectura más por semana futura (hay 1 o 2 a lo más).

### 2. Validador de semana reutilizando el motor
`validarSemana(store, lunes)` en `server/semana.ts` usa el mismo `Store` y `loadItem` que el servidor (el
refuerzo se valida con su banco combinado) y `validateItem` por elemento. Devuelve `{ errores, avisos }`.

**Errores** (bloquean la subida):
- El id no es un lunes, o falta el archivo de la semana.
- Un elemento sin archivo, con `tipo` distinto al del archivo, o con `fechaLimite` distinta de `fecha`.
- `disponibleDesde` antes del lunes de la semana o después de su fecha límite.
- Un examen cuya `disponibleDesde` no es su propio día (debe quedar bloqueado hasta ese día).
- Errores de `validateItem`.
- Refuerzo:
  - `bancoDe` o `basadoEn` apuntan a elementos inexistentes;
  - `mapeoTemas` apunta a temas del refuerzo que no existen;
  - algún tema sin ejercicios en el banco combinado.
- Meet: una diapositiva `teoria` con `ref` fuera de rango.
- Un correo electrónico en cualquier texto del contenido.

**Avisos** (no bloquean):
- Días distintos al patrón mar/jue actividad, vie examen, sáb refuerzo, dom Meet.
- Un banco menor que `preguntasPorIntento × intentos` (el 2.º intento repetiría ejercicios).
- Una actividad sin teoría o sin tips.
- Meet sin `meetUrl`/`hora`, sin `guion` o sin `presentacion`.

La CLI `server/validar_semana.ts <dir-datos> <lunes>` imprime el reporte y termina con código 1 si hay
errores.

### 3. Skill en `ai-specs`, espejo en `.claude/skills`
La fuente canónica es `ai-specs/skills/nueva-semana-ingles/`. Las demás entradas de `.claude/skills/`
están versionadas como archivos de texto con la ruta, y Claude Code no las carga en Windows. Por eso, según
base-standards §6, aquí va una **copia real** (`.claude/skills/nueva-semana-ingles/SKILL.md`). Al editar
la skill se edita `ai-specs` y se vuelve a copiar; la prueba de 3.1 verifica que sean idénticas.

La skill no copia el formato de los JSON: enlaza `docs/data-model.md` y usa como ejemplo los generadores del repo privado (`herramientas/semana-2026-09-28/`).

### 4. Contenido y privacidad
- El contenido con respuestas vive solo en el repo privado.
- La skill trabaja en una copia del repo de datos en el scratchpad, nunca dentro del repo público.
- Los enunciados no llevan nombres ni correos. El validador detecta correos; los nombres los revisa el
  agente, porque solo están en Notion.

## Alternativas descartadas
- **Base de datos para el contenido:** no reduce el trabajo de armar la clase y pierde la edición y el
  historial en git.
- **Formulario de carga en la web:** requiere autenticación de escritura para admin. Se puede hacer
  después si hace falta.
