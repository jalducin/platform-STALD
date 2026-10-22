## Contexto

`index.html` traía todo su CSS en línea con tokens propios (`--bg`, `--card`, `--accent`…). Secundaria, Inglés y Juegos
ya comparten `estilos/ui.css` (tokens `--rpg-*` y componentes `rpg-`). El portal carga `comun/gamificacion.js` y
`comun/secundaria-datos.js` para «🗓️ Mi horario».

## Decisiones

1. **CSS en `estilos/portal.css`** (nuevo, `?v=1`), enlazado después de `estilos/ui.css`. El portal conserva sus tokens
   base (`--bg`, `--card`, `--text`, `--muted`, `--border`, `--accent-soft`) porque los componentes `rpg-` de `ui.css`
   los usan como respaldo, y suma los `--rpg-*` para el héroe, paneles y barras. `ui.css` no cambia (no hace falta
   subir su `?v=` en otras páginas). Los colores por área (`--ingles`, `--secundaria`, `--juegos`, `--profe`) se
   oscurecieron lo necesario para AA sobre su fondo suave en claro y se aclaran en oscuro.
2. **Tarjetas por área = `div.area` con un botón `a.btn[data-espacio]`.** La tarjeta deja de ser un enlace completo para
   poder llevar un `<select>` (admin, Secundaria) sin anidar controles. Se conservan `#tiles` y `[data-espacio]` en el
   enlace principal, que es lo que usan las E2E (`#tiles a[data-espacio="ingles"]`).
3. **Línea de estado solo con datos ya pedidos** (`[data-estado]` en cada tarjeta, oculta si no hay dato):
   - Secundaria (alumna o alumno): `SD.clasesDeHoy` de `/secundaria/actividades` → «2 clases hoy · 1 pendiente» u «Hoy
     no tienes clases». Admin: «N alumnas y alumnos» de `alumnas` de la misma respuesta.
   - Juegos: `total` y `pos` de `/juegos/yo` (la misma petición del avatar) → «⭐ 120 puntos esta semana · #3»; sin
     puntos, «Aún no juegas esta semana».
   - Inglés y Mi ruta: sin dato en el portal → sin línea.
4. **Avance RPG del héroe** (`#portal-avance`): solo Secundaria sin admin. Semana (`SD.progresoSemana`) con
   `.rpg-xp-barra` y racha (`SD.rachaDe`). **Nivel y rango, no:** el nivel de las páginas suma la XP de las misiones
   (`GAM.xpTotalConMisiones`, `/misiones`). Pedir `/misiones` en el portal agrega 2 peticiones (OPTIONS + GET) y
   mostrarlo sin ellas daría un nivel menor al de Secundaria. Alternativa descartada: guardar el nivel en
   `localStorage` desde Secundaria (dato viejo, dependencia entre páginas). Inglés tampoco tiene datos RPG en el portal
   (`/ingles/actividades` no se pide aquí).
5. **Selector de alumna (admin):** `<select id="sec-alumna-portal">` dentro de la tarjeta de Secundaria, con las
   `alumnas` de la respuesta del admin. Cambia el `href` del botón («secundaria.html?alumna=<slug>»), sin pedir nada.
   El horario de `#sec-portal` sigue siendo el de la primera (como antes).
6. **Tema:** botón `#tema-btn` (44 px) que rota auto → oscuro → claro y guarda `stald_tema`, como `ingles/app.js`. Un
   script corto en `<head>` aplica `data-theme` antes de pintar.
7. **Pie:** enlace de consentimiento con `data-interruptor="privacidad"` junto al del aviso; `comun/interruptores.js`
   ya los oculta o muestra sin petición extra.
8. **Héroe y saludo:** `#hello` sigue siendo el saludo (lo leen las E2E) y `pintarAvatar` sigue poniendo la cara del
   avatar dentro de `#portal-av` en lugar de dentro del texto. Nombre de pila: primera palabra de `p.nombre`.

## Riesgos

- E2E existentes que dependen del marcado: se conservan los ids (`#login`, `#login-form`, `#email`, `#password`,
  `#login-btn`, `#olvide-btn`, `#guest`, `#guest-btn`, `#juegos-cta-btn`, `#home`, `#hello`, `#admin-tag`, `#tiles`,
  `#sec-portal`, `#material-link`, `#secure-notice`, `#admin-link`, `#who`, `#cambiar-btn`, `#logout`).
- Contraste AA en ambos temas: lo mide la E2E nueva.
