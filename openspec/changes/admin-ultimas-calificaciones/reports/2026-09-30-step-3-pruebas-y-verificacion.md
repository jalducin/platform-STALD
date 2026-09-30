# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: admin-ultimas-calificaciones
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- Servidor local con fixture y una copia del repo de datos con resultados reales (almacén en memoria).
- `API=http://127.0.0.1:8787 node e2e-ultimas.js`
- Regresiones: `e2e-semana`, `e2e-correccion`, `e2e-filtro`, `e2e-marcar`, `e2e-guion`,
  `e2e-presentacion` y `e2e-portal`, cada una en un servidor nuevo.

## Resultados de pruebas
- **TDD:** `e2e-ultimas.js` falló antes de implementar, porque no existía la tarjeta. Después, 9/9.
  - Una fila por alumno o alumna, con un máximo de 5 y en orden de fecha descendente.
  - "—" sin calificaciones.
  - Mezcla en línea y Notion: Marisol tiene 100%, 100%, 70% y 9.
  - Detalle en su bloque, con título y fecha.
  - 0 envíos; la alumna no ve la tarjeta.
- **Regresiones:** semana 16/16, corrección 11/11, filtro 11/11, marcar 9/9, guion 8/8, presentación 8/8
  y portal 16/16.
- Captura revisada: `ultimas-admin.png`.

## Verificación de estado
- Solo frontend, sin cambios de datos. Las copias se borraron y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
