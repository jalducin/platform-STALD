## Decisiones

### 1. Sistema de diseño (`estilos/stald.css`)
- Tokens en `:root`:
  - `--bg`, `--card`, `--text`, `--muted`, `--border`;
  - `--accent` (índigo de Inglés), `--ok`, `--warn`, `--bad`;
  - radios 12/18/24, sombras en 2 niveles y escala de espacio de 4 px.
- Modo oscuro con `prefers-color-scheme` y `[data-theme]`, igual que en Juegos.
- Tipografía: la pila del sistema, con los números en `tabular-nums` para calificaciones y relojes.
- Componentes como clases utilitarias de bajo nivel. No se usa un framework ni un paso de build: se mantiene
  vanilla JS y GitHub Pages.

### 2. Estructura de la página
- `ingles.html` queda como shell y carga módulos ES:
  - `ingles/alumno.js`, `ingles/admin.js` e `ingles/reproductor.js`;
  - `ingles/comun.js` con la API, el formato y los componentes.
- Así se reducen las ~1,300 líneas actuales en un solo archivo y cada vista se puede probar por separado.

### 2b. Navegación
- Ruteo por hash (`#inicio`, `#semana`, `#resultados`, `#perfil` y, para el profe, `#grupos`, `#alumnos`…):
  - `hashchange` pinta la sección;
  - la pestaña activa lleva `aria-current="page"`;
  - el botón Atrás funciona.
- Barra inferior en celular (menos de 720 px):
  - `position: fixed`, con `env(safe-area-inset-bottom)`;
  - botones de 56 px de alto, con el emoji arriba y la etiqueta abajo.
- En escritorio se usan pestañas arriba para la vista de alumno o alumna y un menú lateral para la del profe.
- Catálogo único de secciones (`SECCIONES`: id, emoji, título y rol): la barra, el menú y los encabezados salen
  de ahí, así que no se repiten ni se contradicen.

### 3. Vista de alumno o alumna
- **Encabezado:**
  - anillo SVG con el avance de la semana;
  - chip con su nivel (sale de su último examen);
  - racha: días seguidos con alguna entrega, calculados en el servidor desde `resultados.actualizado`.
- **Próxima clase:** sale de `grupos.horario` y `meet_url` (`ingles-grupos`), con una cuenta regresiva en vivo.
- **Para hoy:** la misma lógica de urgencia que la vista del profe (`profe-diseno`), reutilizada.
- **Semana:**
  - 7 círculos de lunes a domingo, con su estado: hecho, pendiente, atrasado o sin tarea;
  - al tocar uno, se filtra la lista.
- **Insignias:** se calculan en el cliente con los resultados (no se guardan) y salen en una fila de chips.

### 4. Vista del profe
- Diseño: `grid` de `240px 1fr` en escritorio. En celular, la barra lateral se vuelve un menú arriba.
- `GET /ingles/resumen?grupo=<id>` (solo admin) responde en una sola consulta agregada a Postgres:
  - indicadores;
  - mapa de calor: filas de alumnos y alumnas, columnas de elementos de la semana y celdas con
    `{ estado, porcentaje, fueraDeTiempo }`.
- Cajón lateral (`<dialog>` a la derecha) con el detalle de cada alumno o alumna:
  - reusa las acciones que ya existen: prórroga, reinicio y mover de grupo;
  - se cierra con Esc.

### 5. Reproductor
- Barra de progreso arriba.
- En celular (menos de 600 px), una pregunta por pantalla con Siguiente y Anterior.
- Atajos: 1–4 eligen la opción y Enter avanza.
- Resultado: barras por tema, con su retroalimentación, y la revisión de errores.

## Pruebas
- Unitarias: `/ingles/resumen` (agregados correctos con datos de ejemplo) y racha (casos borde: hoy, ayer, huecos).
- E2E `e2e-ingles-pro`:
  - alumna: anillo, racha, próxima clase, "Para hoy" y resolver una actividad con atajos;
  - profe: cambiar de grupo, mapa de calor, cajón con prórroga;
  - celular sin desplazamiento horizontal, y modo oscuro.
- Regresión: todos los E2E de Inglés, ajustados a los nuevos selectores.
- Lighthouse (local) ≥ 90 en Accesibilidad y Buenas prácticas.
