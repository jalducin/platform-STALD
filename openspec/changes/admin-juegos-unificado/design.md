## Decisiones

### Estructura
- `pantallaHub` arma 3 pestañas para todos y la cuarta, `data-tab="admin"` («🛡️ Admin»), solo si
  `state.jugador.tipo === 'admin'`. Los ids viejos (`jugadores`, `invitados`, `fotos`) se traducen a `admin` con su
  sub-sección, por si algo los sigue llamando.
- `pintarAdmin()` dibuja dentro de `#tab-body`:
  - encabezado corto («Los correos solo los ves tú») con «↻ Actualizar»;
  - `#adm-subs` (`role="tablist"`, `aria-label="Secciones de administración"`) con 4 botones
    `role="tab" data-adm="jugadores|pendientes|invitados|fotos"`, `aria-selected`, `aria-controls="adm-panel"` y
    tabindex móvil (← → Inicio Fin mueven el foco y eligen). Cada uno lleva su contador `.adm-n`
    (`…` mientras carga, `!` si falló). «Pendientes» se resalta si hay alguno;
  - barra de herramientas: `<label for="adm-buscar">` (visualmente oculta) + `input#adm-buscar type=search` y el botón
    de CSV de la sub-sección (`data-a="csv-jugadores"` en Jugadores y Pendientes, `data-a="csv"` en Invitados; en
    Fotos no hay CSV);
  - `#adm-resumen` (`aria-live="polite"`): «16 jugadores» o «2 de 16 coinciden con «vale»»;
  - `#adm-panel` (`role="tabpanel"`) con la lista de la sub-sección.
- **Carga:** las tres rutas se piden en paralelo al abrir la pestaña (`Promise.all`), así los contadores salen desde el
  principio. Cada fuente guarda su resultado o su error en `state.adm`; una que falla no tapa a las demás. Cambiar de
  sub-sección o buscar **no** vuelve a pedir nada. Quitar una foto vuelve a pedir solo `/juegos/fotos`.
- **Sub-sección guardada:** `localStorage.juegos_admin_sub` con el id de la sub-sección (lista blanca; si no es válida,
  «jugadores»). Es preferencia de interfaz, sin datos personales.

### Listas
- Una sola marca para celular y escritorio: `<table class="adm-tabla">` dentro de `.adm-lista`.
  - `.adm-lista`: `max-height: min(62vh, 560px)`, `overflow-y: auto`, `scroll-behavior: smooth`,
    `overscroll-behavior: contain`, barra delgada con los colores del tema y `tabindex="0"` con `aria-label` para
    desplazarla con el teclado.
  - Escritorio (≥ 640 px): `thead th { position: sticky; top: 0 }`.
  - Celular (< 640 px): `thead` oculto, cada `tr` es una tarjeta (`display: grid`) y cada `td` muestra su etiqueta con
    `td::before { content: attr(data-label) }`. Sin scroll horizontal a 390 px.
- **Jugadores:** avatar (foto si el jugador tiene una en `/juegos/fotos`, si no su inicial), nombre y nick, correo,
  tipo (📘 Inglés, 📚 Secundaria, 🎮 Juegos), puntos y partidas de la semana y última visita. Tabla `#jug-tabla`.
- **Pendientes:** correo, estado («✉️ No confirmó su correo» / «🙈 Entró sin elegir apodo»), fecha y
  `button[data-enlace]` «🔗 Enlace de acceso». La caja del enlace (`#jug-enlace`) va arriba de la lista para que se vea
  sin desplazarse; conserva 📋 Copiar y 📤 WhatsApp. Si `cuentasError`, aviso en esta sub-sección.
- **Invitados:** correo, apodo, visitas, última visita y puntos de la semana. Tabla `#inv-tabla`.
- **Fotos:** `.fotos-grid` de tarjetas con la foto, el nombre, el nick y el correo cuando el jugador está en la lista,
  la fecha y «🗑️ Quitar» (con `confirm`, como hoy).
- Cada elemento filtrable lleva `data-busca` con nombre, nick y correo normalizados (minúsculas y sin acentos,
  `normalize('NFD')`). El buscador oculta con `hidden` lo que no coincide.

### Estados
- Carga: filas de esqueleto (`.adm-esq`, con animación que respeta `prefers-reduced-motion`).
- Error: `.alert` con el código y «Reintentar» (`data-a="adm-reintentar"`).
- Vacío: `.adm-vacio` con emoji y texto («Sin registros pendientes 🎉», «Todavía no hay invitados», …).
- Sin coincidencias: «Nada coincide con «x»» y botón «Limpiar búsqueda».

### Estilo
- Tokens existentes de `juegos.html` (`--card`, `--border`, `--muted`, `--accent`, `--accent-2`, `--mente-soft`,
  `--bad`), así el modo oscuro funciona igual. `estilos/stald.css` no se enlaza en `juegos.html` (adoptarlo es otro
  cambio, ver frontend-standards §5).
- La barra principal usa `white-space: nowrap` y, a menos de 420 px, letra un poco menor para que las 4 pestañas
  quepan sin apretarse.
- Foco visible en sub-secciones, buscador, botones y la lista (`:focus-visible`).

## Alternativas descartadas
- **Mantener «Pendientes» dentro de «Jugadores»:** el contador que pidió el profe los separa, y así los registros por
  atender se ven de un vistazo.
- **Un `<details>` por sección:** con tres listas largas abiertas la página vuelve a ser muy larga.
- **Ruta nueva de resumen para los contadores:** no hace falta; las tres listas son pequeñas y se piden en paralelo.

## Pruebas
- E2E actualizadas (primero en rojo): `jugadores` (pestaña Admin, contadores, sub-secciones, buscador, enlace,
  preferencia guardada, tarjetas sin scroll horizontal a 390 px, alumna sin pestaña), `juegos` (invitados y CSV),
  `avatar-foto` (Fotos y quitar) y `nick` (nick en Jugadores).
- Capturas a 390×844 y 1280×800 revisadas a ojo.
