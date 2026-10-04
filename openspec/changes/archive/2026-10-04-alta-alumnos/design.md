## Decisiones

### 1. Registro y fusión con Notion
- `alumnos.json` en el repo privado, con caché de 30 s que se actualiza al escribir.
- `filasIngles()` = `aplicarAlumnos(filasNotion(), registro)`:
  - si hay filas de Notion cuyo "Nombre" coincide (por slug, sin acentos ni mayúsculas), se les agrega el
    correo y el nombre (copias: no se muta la caché de Notion);
  - si no, se agrega una fila `{ source: "registro", id: "registro-<slug>", name: "", alumno, userEmails }`.
- Todo lo que ya usa las filas de Inglés (portal, `/ingles/data`, actividades, Juegos, marcar tareas)
  reconoce al alumno sin cambios. El tablero ignora la fila de identidad (`source` distinto de
  `clases_ingles`).

### 2. Validaciones del alta
- Correo válido; nombre de 2 a 40 letras (letras, espacios, punto, apóstrofo, guion).
- 409 `correo_en_uso` si el correo ya tiene acceso (Notion, registro o admin).
- 409 `nombre_en_uso` si ese nombre ya tiene correo; un nombre de Notion **sin** correo sí se puede ligar.

### 3. Vista de admin
- Tarjeta plegable arriba del resumen; tras dar de alta o quitar se recarga y queda abierta con el aviso.
- Quien no tiene tareas en Notion igual tiene su bloque (resultados de actividades).
