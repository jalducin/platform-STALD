## Decisiones

### 1. Prórroga en el JSON del elemento, por slug
`prorrogas` usa el slug del alumno o alumna (`slugAlumno`, el mismo de `resultados/<id>/<slug>.json`),
nunca el correo. Vive en el repo privado, igual que los resultados.

### 2. Se aplica al resolver el elemento para un alumno o alumna
`paraAlumno(it, slug)` en `motor.ts` devuelve el elemento con `fechaLimite` = la prórroga, si existe.
`handleActividades` la aplica a la lista y al detalle cuando quien consulta es un alumno o alumna. Así,
`meta()`, `estadoItem()` y `fueraDeTiempo` usan la fecha correcta sin más cambios. El admin ve la fecha
base.

### 3. Sin cambios en `disponibleDesde`
La prórroga solo extiende el plazo; no adelanta la apertura. Un examen bloqueado sigue bloqueado hasta su
día.

## Alternativas descartadas
- **Copiar el diagnóstico como otro examen para Sofy:** sería visible para todo el grupo como examen suelto
  y duplicaría el contenido.
