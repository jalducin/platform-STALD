## Decisiones

### 1. Ruta
`POST /ingles/data/<pageId>/completado?email=<correo>` con cuerpo `{ "completado": true | false }`.

Respuestas:

| Código | Cuerpo | Cuándo |
|---|---|---|
| 200 | `{ ok, id, completado, registrado }` | Se marcó o desmarcó |
| 400 | `missing_email` / `json_invalido` | Falta el correo o el cuerpo no trae un booleano |
| 403 | `sin_acceso` | La fila no está entre las que ve ese correo |
| 502 | `sin_permiso_notion` / `notion_<status>` | Notion rechazó la escritura |

`registrado: false` significa que Notion sí se actualizó, pero falló la escritura del avance (GitHub).
No se revierte.

### 2. Autorización con las mismas reglas de lectura
La lógica vive en `server/completar.ts` (`handleCompletar`), con dependencias inyectadas: filas, parche a
Notion y almacén, para probarla sin red. Se cargan las filas y se aplica `filterForEmail`. Solo se
permite un `id` que esté entre las filas visibles, así que el alumno o alumna nunca puede tocar la fila de
otro.

Los ids se comparan sin guiones, porque Notion acepta ambos formatos.

### 3. Registro de avance
`avance/<slug>.json`:

```json
{
  "alumno": "Sofy",
  "notion": { "<id>": { "titulo": "…", "completado": true, "en": "…", "por": "alumno" } },
  "historial": [{ "id": "…", "titulo": "…", "completado": true, "en": "…", "por": "alumno" }]
}
```

- `slug` = `slugAlumno(fila.alumno)`.
- Se escribe con `sha` y hasta 3 reintentos, como los resultados.
- `historial` guarda como máximo las 200 entradas más recientes.

Es la base del avance consolidado que el usuario pidió guardar en JSON.

### 4. Modo de pruebas
Con `ROWS_FIXTURE`, el parche a Notion se aplica en memoria sobre las filas del fixture. Así el E2E
local ve el cambio al recargar.

### 5. Actividades con intento = hechas
En `ingles.html`, `itemRow` marca `completado` si `intentosUsados > 0`; antes solo si `estado ===
'completo'`. El botón de corrección sigue mientras `estado === 'en-curso'`.

### 6. Página
- Filas de Notion:
  - si no están completadas, "✓ Marcar hecha";
  - si lo están, "↩" (desmarcar).
- Antes de enviar pide confirmación; al terminar recarga los datos y vuelve a dibujar el tablero.
- En admin aparecen en las filas de cada alumno o alumna.
