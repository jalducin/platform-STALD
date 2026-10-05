## Decisiones

### 1. Imagen pequeña hecha en el navegador
- `<input type="file" accept="image/*">` → `createImageBitmap`/`<img>` → canvas 128×128 con recorte
  cuadrado al centro → `toDataURL('image/jpeg', 0.8)` (≈ 5–10 KB).
- Si pesa más de 40 KB se reintenta con calidad 0.6 y 0.4.
- No se usa EXIF ni metadatos: el canvas los descarta.

### 2. Almacenamiento y entrega
- `juegos/fotos/<token>.json` → `{ id, nombre, imagen, en }` en el repo privado. `token` = 24 hex
  aleatorios (`crypto.getRandomValues`).
- Índice `juegos/fotos/indice.json` → `{ [id]: { nombre, token, en } }` para la vista del admin.
- El avatar del perfil (`juegos/perfiles/<id>.json`) y la copia de la semana guardan solo el `token`;
  así el ranking y el sondeo de salas no cargan imágenes.
- `GET /juegos/foto/<token>`: no requiere correo (un `<img>` no manda encabezados); responde los bytes
  JPEG con `Cache-Control: public, max-age=3600` (una foto quitada deja de verse en ≤ 1 h aun en caché),
  guardados en memoria **60 s** como máximo (Deno Deploy corre varios isolates: uno puede borrar la foto
  mientras otro la tiene en memoria; con el vencimiento, una foto quitada deja de servirse en ≤ 1 min). Token inválido o borrado → 404.
- Validación: prefijo `data:image/jpeg;base64,`, base64 válido, bytes que empiezan con `FF D8 FF`,
  ≤ 40 000 caracteres.

### 3. Cambios de avatar
- Subir foto: conserva `emoji`/`color`, pone `foto` nuevo y borra el archivo de la foto anterior.
- Elegir personaje (`POST /juegos/avatar`): quita `foto` y borra su archivo.
- Admin quita foto: igual que elegir personaje, para el jugador `id` indicado.
- En los tres casos se actualizan el perfil, la semana actual, el índice y la caché de identidad.
  Semanas viejas o salas con el token borrado muestran el personaje (fallback en el cliente).

### 4. Cliente
- `avatarHtml(av)`: si `av.foto`, `<img src="<API>/juegos/foto/<token>">` dentro del círculo, con
  `onerror` que deja el emoji.
- Mismo criterio en `ingles.html` (tarjeta del admin) y en el saludo de `index.html`.
- Admin: pestaña "📷 Fotos" con cada foto, nombre, fecha y botón "Quitar".
