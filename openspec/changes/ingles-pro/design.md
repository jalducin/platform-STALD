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
- `ingles.html` queda como shell y carga, en orden y con `defer`, **scripts clásicos** (no módulos ES):
  - `ingles/comun.js` con la configuración, `SECCIONES`, `api()`, el formato y los componentes;
  - `ingles/reproductor.js`, `ingles/presentacion.js` (guion y Meet), `ingles/admin.js` (grupos, alumnos y alumnas,
    juegos), `ingles/tablero.js` (vista del admin por secciones, mapa de calor y cajón), `ingles/alumno.js`,
    `ingles/profe.js` (`?modo=profe`) y `ingles/app.js` (sesión, ruteo y eventos).
- Así se reducen las ~1,400 líneas en un solo archivo y cada vista vive en su archivo.
- **Por qué scripts clásicos y no módulos ES (decisión de implementación):** las vistas comparten mucho estado
  (`state`, `contentEl`, `escapeHtml`, `accionItem`…) y los E2E dependen del comportamiento actual. Con scripts
  clásicos el ámbito global se comparte tal cual y el comportamiento no cambia; con módulos habría que reescribir cada
  dependencia como `import`/`export` en el mismo cambio, con más riesgo. Pasar a módulos ES queda como mejora futura.

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
  - racha: días seguidos con alguna entrega, calculados en el servidor (`calcularRacha` en `motor.ts`) con el
    `enviadoEn` de cada intento, en fecha de CDMX. Cuenta hasta hoy o, si hoy aún no entrega, hasta ayer.
  - **Decisión:** la racha viaja dentro de `GET /ingles/actividades` (campo `racha: { dias, hoy }`) y no en una ruta
    `/ingles/racha` aparte: la página ya pide esa lista y así no gasta otra petición (`ahorro-peticiones`), y el
    servidor ya lee esos resultados para calcular el estado de cada elemento.
- **Próxima clase:** sale de `grupos.horario` y `meet_url` (`ingles-grupos`), con una cuenta regresiva en vivo.
  El horario es texto libre: se entiende «día(s) + hora» (`Sáb 10:00`, `Mar y Jue 6:30 pm`). Si no se puede leer,
  se usa la fecha y hora del Meet de la semana; si tampoco hay, se muestra el horario sin cuenta regresiva.
- **Para hoy:** la misma lógica de urgencia que la vista del profe (`profe-diseno`), reutilizada.
- **Semana:**
  - 7 círculos de lunes a domingo, con su estado: hecho, pendiente, atrasado o sin tarea;
  - al tocar uno, se filtra la lista.
- **Insignias:** se calculan en el cliente con los resultados (no se guardan) y salen en una fila de chips.

### 4. Vista del profe
- Diseño: `grid` de `240px 1fr` en escritorio. En celular, la barra lateral se vuelve un menú arriba.
- `GET /ingles/resumen?grupo=<id>` (solo admin) responde con los agregados calculados en el servidor:
  - indicadores;
  - mapa de calor: filas de alumnos y alumnas, columnas de elementos de la semana y celdas con
    `{ estado, porcentaje, fueraDeTiempo }`.
  - **Decisión:** se calcula en Deno sobre el `Store` y no con una vista o función de Postgres. Los resultados viven
    como documentos JSON en `stald_docs`; agregarlos en SQL obligaría a una migración en producción. Con `PgStore`,
    `leerCarpeta` trae los resultados de cada elemento en una sola consulta (`path=like.resultados/<id>/*`): unas 5
    consultas por semana. Sin la base migrada funciona igual sobre GitHub (sin filtro por grupo).
  - "Quién no ha entrado": no se registran visitas, así que se muestra a quien no tiene entregas esta semana y ya
    tiene algo abierto (`sinEntregas`).
- Cajón lateral (`<dialog>` a la derecha) con el detalle de cada alumno o alumna:
  - reusa las acciones que ya existen: reinicio (`DELETE …/resultados/<alumno>`) y mover de grupo;
  - **prórroga:** no existía una ruta (se editaba `prorrogas` a mano en el JSON del elemento). Se agrega
    `POST /ingles/actividades/<id>/prorroga { alumno, fecha | null }`, solo admin, que escribe ese mismo campo con su
    `sha` (misma regla que `validateItem`: fecha válida y no anterior a `disponibleDesde`);
  - se cierra con Esc.

### 5. Reproductor
- Barra de progreso arriba.
- En celular (menos de 600 px), una pregunta por pantalla con Siguiente y Anterior, y «Ver todas las preguntas» para
  volver a la lista completa (útil para revisar antes de enviar).
- Atajos: 1–4 eligen la opción y Enter avanza (con todo respondido, Enter envía y pide confirmación).
- La lógica de calificación del servidor no cambia.

### 6. Hook para el inicio de sesión (Sprint 3)
- Todas las peticiones de la página salen por `api(url, opts)` en `ingles/comun.js`. El login agregará ahí el
  encabezado `Authorization`. Ojo: un encabezado propio vuelve a activar la verificación previa de CORS
  (`ahorro-peticiones`), y el servidor debe permitir `authorization` en `Access-Control-Allow-Headers`.
- Resultado: barras por tema, con su retroalimentación, y la revisión de errores.

## Pruebas
- Unitarias: `/ingles/resumen` (agregados correctos con datos de ejemplo) y racha (casos borde: hoy, ayer, huecos).
- E2E `e2e-ingles-pro`:
  - alumna: anillo, racha, próxima clase, "Para hoy" y resolver una actividad con atajos;
  - profe: cambiar de grupo, mapa de calor, cajón con prórroga;
  - celular sin desplazamiento horizontal, y modo oscuro.
- Regresión: todos los E2E de Inglés, ajustados a los nuevos selectores.
- Lighthouse (local) ≥ 90 en Accesibilidad y Buenas prácticas.
