## Contexto

`secundaria.html` es un puente a `ingles.html?modo=secundaria` (cambio `secundaria-sin-notion`), donde vive el
reproductor de clases. Otro cambio (PR #225) hace la experiencia dentro de cada clase. Este cambio solo toca lo de
afuera: el inicio, las pestañas, Mis materias y el portal.

## Decisiones

1. **El tablero vive en `ingles.html?modo=secundaria`, no en un `secundaria.html` propio.** Así «Empezar» abre la clase
   en la misma página (`data-action="abrir-item"`), sin enlaces profundos nuevos, y «Atrás» vuelve al tablero.
   `secundaria.html` sigue siendo el puente y conserva `?api=`, `?alumna=` y el `#hash`.
2. **Archivos nuevos en lugar de crecer los compartidos:**
   - `ingles/secundaria-inicio.js` (dibujo) y `ingles/secundaria.css` (estilos), para no chocar con PR #225;
   - `comun/secundaria-datos.js`: reglas puras, cargadas también por el portal y probadas en Deno.
   - `comun/gamificacion.js` (cambio `gamificacion-nucleo`) es la fuente de materias, día de la clase y mundos;
     `secundaria-datos.js` las reusa.
3. **Día de la clase:** `disponibleDesde` si `fechaLimite − disponibleDesde ≤ 1 día`; si no, `fechaLimite`. Las clases
   del repo de datos abren su día y vencen al siguiente. Las tareas con ventana (guías, exámenes mensuales) caen en su
   día de entrega.
4. **«Hoy te toca»:** primero lo de días anteriores que vence hoy y sigue sin hacer; después las clases de hoy.
   «Hecha» = al menos un envío (como Inglés y la racha del servidor).
5. **Racha:** la del servidor (`racha.dias`, días seguidos con al menos un envío). No se recalcula en el cliente.
6. **Promedio por materia:** media de la mejor calificación (`mejor.porcentaje`) de las clases con resultado.
7. **Admin:** pide la lista (resultados y `alumnas`) y luego `?alumna=<slug>`, que es la vista de ella de solo lectura.
   Toma la alumna de `?alumna=` de la URL o, si no viene, la primera; el selector recarga. Los botones de clase dicen
   «👀 Vista previa».
8. **Pestañas con hash:** `history.replaceState` guarda la pestaña sin crear entradas. El estado manda al volver de
   una clase. Si la página carga con `#ver/<id>`, abre «📅 Esta semana».
9. **Estilo RPG con CSS propio:** la referencia del profe usa Tailwind, Font Awesome y Google Fonts.
   - No se usa Tailwind ni Font Awesome: tokens `--rpg-*` (claro y oscuro) y emojis.
   - Sí se usan Inter (texto) y Orbitron (números, nivel, misión) de Google Fonts, que se inyectan solo en modo
     Secundaria (`display=swap`; si no cargan, queda la fuente del sistema). Es la excepción de CDN que pide
     `frontend-standards §1`.
   - El portal sigue con la fuente del sistema, consistente con el resto.
10. **Colores por materia compartidos:** se movieron de `ingles/ingles.css` a `estilos/materias.css` para que el portal
    los use sin duplicarlos. `.mat-otra` cae a `--bg` donde no existe `--card-2`.
11. **Portal:** una petición más (`/secundaria/actividades`, dos para el admin) solo si `accesos.secundaria`. Si falla,
    aparece un aviso corto con el botón a Secundaria.

## Accesibilidad

- Todo lo que se toca es `<button>` o `<a>` de 44 px o más; las pestañas son `role="tab"` con ← → Inicio Fin.
- Progreso, XP y promedios usan `role="progressbar"` con valores.
- Las insignias y los mundos dicen su estado en texto (`sr-only`), no solo con color o emoji. El chip de materia
  lleva el nombre.

## Riesgos

- Choques con PR #225 en `ingles.html` e `ingles/ingles.css`: se hace merge de `main` antes de fusionar y se sube el
  `?v=` por encima.
