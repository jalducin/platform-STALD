## Why

Cada semana hay que cargar una clase nueva de Inglés: 2 actividades, el examen del viernes, el refuerzo
del sábado y el Meet del domingo con guion y presentación. La semana 1 se armó a mano con scripts sueltos.
Hace falta un flujo repetible para prepararla el fin de semana anterior, sin errores de formato y sin
exponer contenido antes de tiempo.

Además, hoy subir la semana siguiente por adelantado tiene un bug: el servidor muestra como "examen
suelto" todo examen que no pertenece a una semana ya iniciada. El examen del viernes siguiente aparecería
en el tablero desde que se sube (bloqueado, pero visible y fuera de su semana).

## What Changes

- **Corrección**: un examen que pertenece a cualquier semana (aunque no haya iniciado) ya no se muestra
  como examen suelto.
- **Validador de semana** (`server/semana.ts` + CLI `server/validar_semana.ts`). Revisa la semana
  completa antes de subirla:
  - fechas y días de la semana;
  - archivos y tipos;
  - examen bloqueado hasta su día;
  - bancos suficientes para 2 intentos distintos;
  - refuerzo y Meet coherentes;
  - sin correos en el contenido.
- **Flujo "nueva semana" como skill del proyecto** (`ai-specs/skills/nueva-semana-ingles`):
  - Pide los temas.
  - Lee el avance del grupo.
  - Genera los 6 JSON de la semana siguiente en la copia local del repo privado de datos.
  - Valida, muestra un resumen para aprobación y sube.
- **Generadores de la semana 1** movidos al repo privado de datos (`herramientas/`) como ejemplo completo.
  Tienen respuestas, así que no van al repo público.

## Capabilities

### New Capabilities
- `carga-semanal`: preparar, validar y publicar la clase de la semana siguiente.

### Modified Capabilities
- `actividades-online`: semanas publicadas por adelantado, sin mostrar sus elementos antes de su lunes.

## Impact

- **Superficies**:
  - Servidor Deno (`server/actividades.ts`, nuevos `server/semana.ts` y `server/validar_semana.ts`).
  - Repo privado de datos.
  - Skills del proyecto.
- Sin cambios en `index.html`, `ingles.html` ni Notion.
- **Acciones externas**:
  - Redeploy automático de Deno Deploy al hacer merge a `main` (el agente verifica).
  - Cada semana, el usuario aprueba el contenido y pasa el enlace y la hora del Meet.

## Matriz de acceso

Sin cambios respecto a `tareas-online-semanales`.
- **Alumnos y alumnas:** ven la semana desde su lunes y nunca las respuestas.
- **Admin:** también ve el guion y la presentación.
- Una semana futura no es visible para nadie en el tablero. Solo existe en el repo privado.
