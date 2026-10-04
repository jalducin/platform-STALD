## Why

El sitio de Juegos se ve profesional y Inglés todavía se ve básico:
- una sola columna de tarjetas blancas;
- poca jerarquía visual;
- no muestra el avance de un vistazo;
- el admin no tiene una vista de su grupo como tablero.

El profe pidió llevar Inglés al mismo nivel de diseño. Este cambio es el Sprint 2 y llega después de
`ingles-grupos`.

## What Changes

- **Sistema de diseño compartido con Juegos** (`estilos/stald.css`):
  - tokens de color, tipografía y espacio;
  - modo claro y oscuro;
  - componentes: tarjeta, botón, pestaña, chip, anillo de progreso, barra, tabla, cajón lateral, esqueleto de
    carga y estado vacío.
  - Lo usan `ingles.html` y, poco a poco, el portal.
- **Navegación fácil con íconos** (pedido del profe):
  - celular: barra inferior fija con 5 pestañas: 🏠 Inicio · 📅 Semana · ⭐ Resultados · 🎮 Juegos · 👤 Perfil;
  - escritorio: las mismas secciones como pestañas arriba;
  - profe: menú lateral con un emoji por sección: 🏠 Resumen · 👥 Grupos · 🧑‍🎓 Alumnos · 📅 Semana · ⭐ Resultados ·
    🎬 Presentar · 🎓 Mi ruta · 🎮 Juegos. En celular es una barra inferior con 4 secciones y «☰ Más»;
  - cada sección tiene su dirección (`#inicio`, `#semana`…), así que el botón Atrás del celular funciona y se pueden
    compartir enlaces;
  - cada encabezado de sección lleva su emoji, el mismo de su pestaña, para que se ubique igual en todos lados.
- **Vista de alumno o alumna** (enfocada en celular):
  - encabezado con avatar, nivel (A1→B1…), anillo de avance de la semana y **racha** 🔥 de días con entregas;
  - tarjeta **"Próxima clase"**: grupo, día, hora, cuenta regresiva y botón de Meet;
  - **"Para hoy"**: lo urgente arriba, con su botón de acción;
  - **línea de la semana** de lunes a domingo, con el estado de cada día;
  - **Mis resultados**: el % de cada actividad y los **temas a reforzar** como chips de color;
  - **insignias** sencillas, como «Semana perfecta», «Racha de 5» y «Examen 90 %+».
- **Vista del profe (admin)** como tablero, a dos columnas en escritorio:
  - barra lateral con los grupos (selector) y accesos: alumnos y alumnas, semana, resultados, presentación y juegos;
  - indicadores del grupo: % entregado a tiempo, promedio, atrasos y quién no ha entrado;
  - **mapa de calor**: alumnos × actividades de la semana, con colores por estado y calificación;
  - **cajón de alumno**: historial, temas a reforzar, prórroga, mover de grupo y reiniciar intento;
  - un "Últimas calificaciones" más compacto.
- **Reproductor de actividades y exámenes**:
  - barra de progreso;
  - en celular, una pregunta por pantalla;
  - atajos de teclado (1–4 y Enter);
  - pantalla final con gráfica por tema.
- **Calidad:**
  - accesibilidad AA: contraste, foco visible y `aria`;
  - esqueletos de carga;
  - sin desplazamiento horizontal;
  - Lighthouse ≥ 90 en Accesibilidad y Buenas prácticas.

## Siguiente

- **Sprint 3 · `plataforma-login`** (aprobado por el profe): inicio de sesión real con Supabase Auth.

## Capabilities

### Modified Capabilities
- `ingles`: diseño de las vistas de alumno o alumna, del profe y del reproductor.

## Impact

- Archivos nuevos: `estilos/stald.css`, `ingles/ingles.css`, `ingles/*.js` y `server/resumen.ts`.
- Archivos que cambian:
  - `ingles.html` (queda como shell; el código pasa a `ingles/comun.js`, `alumno.js`, `admin.js`, `tablero.js`,
    `reproductor.js`, `presentacion.js`, `profe.js` y `app.js`);
  - servidor:
    - `GET /ingles/resumen?grupo=` (solo admin): indicadores y mapa de calor, calculados sobre el almacén (con
      Postgres, una consulta por elemento);
    - la racha viaja en `GET /ingles/actividades` (`racha: { dias, hoy }`), sin ruta aparte;
    - `POST /ingles/actividades/<id>/prorroga` (solo admin) para dar o quitar una prórroga desde el cajón.
- Matriz de acceso: `/ingles/resumen` y la prórroga, solo el admin (403 a cualquier otro correo); la racha, cada
  alumno o alumna solo la suya.
- Los E2E de Inglés se ajustan a los nuevos selectores; los datos y el comportamiento no cambian.
