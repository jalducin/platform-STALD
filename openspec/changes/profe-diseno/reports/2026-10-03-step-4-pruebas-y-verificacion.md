# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-03
- Cambio: profe-diseno
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- Servidor local con una copia de los datos (`DATA_DIR`) y archivos estáticos en `:8765`.
- `node shot-profe.js antes` para capturar el diseño anterior.
- `node e2e-profe-diseno.js`.
- Regresiones:
  - `DATA=… node e2e-ruta-profe.js`, `e2e-profe-grupo.js` y `e2e-pronunciacion.js`;
  - `e2e-alta-alumnos.js`, `e2e-inicio-lunes.js` y `e2e-segunda-oportunidad.js`.

## Resultados de pruebas
- `e2e-profe-diseno` falló primero, como se esperaba: no había `.pf-hero`, ni Pendiente ahora, ni pestañas. Ahora
  pasa 11 de 11:
  - encabezado con 4 contadores y la barra del mes;
  - Pendiente ahora con etiquetas Ruta y Grupo;
  - 4 pestañas que cambian sin recargar;
  - la pestaña se recuerda al volver;
  - en el acordeón solo está abierta la semana actual, y cada semana muestra su avance x/y;
  - Mi grupo y Hechas;
  - en escritorio, dos columnas con 1,080 px de ancho;
  - en celular, una columna sin desplazamiento horizontal.
- Alto de la página:

  | Pantalla | Antes | Después |
  |---|---|---|
  | Escritorio | 3,579 px | 1,089 px |
  | Celular | 4,952 px | 1,769 px |

- Regresiones de la vista del profe, ajustadas a las pestañas (esperan `#ruta-plan` y `#grupo-profe` como
  `attached` y abren la pestaña antes de hacer clic):
  - `e2e-ruta-profe`: 15/15;
  - `e2e-profe-grupo`: 7/7;
  - `e2e-pronunciacion`: 11/11.
- Vista de alumnos, alumnas y admin, sin cambios:
  - `e2e-alta-alumnos`: 11/11;
  - `e2e-inicio-lunes`: 6/6;
  - `e2e-segunda-oportunidad`: 8/8. Para correrla se quitaron de la copia los resultados reales del
    `examen-2026-10-02` que hicieron las alumnas el viernes, porque la prueba espera ese examen sin intentos.
- Capturas de antes y después, en escritorio y en celular, revisadas en `scratchpad` (no se suben al repo).

## Verificación de estado
- Antes: copias temporales `data-pf`; producción sin tocar.
- Después: copias borradas y servidores locales apagados.
- Estado restaurado: Sí.

## Resultado
- Estado del Step 4: PASS
- Bloqueos: ninguno
