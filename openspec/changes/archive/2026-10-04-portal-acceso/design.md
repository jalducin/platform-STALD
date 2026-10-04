## Decisiones

### 1. `/perfil` con lógica pura
`armarPerfil(email, admin, filasIngles, filasSecundaria)` vive en `server/perfil.ts`. Filtra con las
mismas reglas de `filterForEmail` y devuelve:

```json
{ "email": "...", "isAdmin": false, "nombre": "Sofy",
  "accesos": { "ingles": true, "secundaria": true, "juegos": true },
  "conocido": true }
```

- **`nombre`:**
  - si tiene filas de Inglés, su "Nombre" (Sofy);
  - si no, el primer nombre de Notion en Secundaria (Sofia);
  - para el admin, "Profe".
- **`juegos`:** `true` para cualquier correo conocido. Para desconocidos, `false` hasta la entrega de
  invitados.
- **Carga:** `main.ts` carga las dos bases en paralelo, como hoy lo hace cada página por separado.

### 2. Portal (`index.html`)
- Un solo archivo autocontenido y sin CDN, como el resto.
- Colores en variables, con modo oscuro.
- **Estados** (frontend-standards §3):
  - sin sesión (login);
  - cargando;
  - desconocido ("No encontré tu correo…", con opción de reintentar);
  - error de red;
  - tarjetas;
  - admin (etiqueta "Modo maestro").
- Cada tarjeta es un enlace `<a>` a la página del espacio, con icono, título, descripción y una flecha.
  Las no disponibles no se muestran; Juegos aparece con "Muy pronto" y deshabilitada.

### 3. Sesión compartida
- Al entrar, el portal guarda el correo en `stald_email`, `ingles_email` y `secundaria_email`. Las páginas
  ya leen su clave al cargar, así que entran solas.
- "Cerrar sesión" en cualquier página borra las tres claves.
- Solo se guarda el correo (frontend-standards §2).

### 4. Mudanza de Secundaria
`git mv index.html secundaria.html`, sin cambios de lógica salvo el enlace "← Inicio" y el cierre de
sesión compartido.

## Riesgos
- Quien tenga guardada la liga raíz de Secundaria ahora ve el portal. Llega con un toque más, y el portal
  la reconoce si ya tenía sesión en Secundaria, porque también lee `secundaria_email` e `ingles_email`.
