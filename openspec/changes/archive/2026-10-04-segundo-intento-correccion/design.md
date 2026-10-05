## Decisiones

### 1. La corrección sale del último intento guardado
`correccionDe(it, previo)` en `motor.ts` recibe el último intento y devuelve:
- `preguntas`: los ejercicios del banco con los ids de `previo.preguntas`, en el mismo orden;
- `fijas`: `{ id: respuesta }` de los que estaban bien;
- `anteriores`: `{ id: respuesta }` de los que estaban mal, para mostrar "antes respondiste".

Aplica cuando el elemento es "de aprendizaje" (`tipo !== "examen"`) y hay un intento previo. Si ningún id
del intento previo sigue en el banco (contenido editado), se vuelve a la selección normal.

### 2. El servidor manda en las fijas
En el POST, `respuestas = { ...sanitize(cliente), ...fijas }`. El navegador no puede empeorar ni alterar
una correcta. Se califica con `grade` sobre el mismo conjunto, así que la calificación del intento 2 es
mayor o igual que la del 1.

### 3. Respuesta del GET
Además de `preguntas` (sin respuestas), el GET del intento de corrección manda:
- `correccion: { fijas, anteriores }`, que solo contiene respuestas del propio alumno o alumna;
- `anteriores` como **texto**, con `textoRespuesta`, para que la página no tenga que interpretar índices.

`fijas` va como valor (índice u otro texto) para prellenar los controles.

### 4. Completo al 100 %
`estadoItem`: si `tipo !== "examen"` y el último intento tiene 100 %, devuelve `completo`, porque no hay
nada que corregir.

### 5. Página
- Si llega `correccion`, el formulario muestra:
  - un aviso "✏️ Corrección: corrige solo las N que fallaste";
  - los ejercicios a corregir con "Antes respondiste: X ✗";
  - un `<details>` "✅ Ya las tenías bien (M)" con las fijas, prellenadas y deshabilitadas.
- El contador y "Enviar" cuentan solo los ejercicios a corregir.
- En el resultado de una actividad, el botón dice "Corregir errores" en lugar de "Reintentar".

## Alternativas descartadas
- **Mostrar la respuesta correcta en la corrección:** ya se ve en "Revisa tus errores" del intento 1; en
  la corrección se pide contestarla de nuevo, que es donde está el aprendizaje.
