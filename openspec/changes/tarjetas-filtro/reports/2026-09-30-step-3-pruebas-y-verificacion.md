# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: tarjetas-filtro
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- Servidor local en memoria: `DATA_DIR=<copia> ROWS_FIXTURE=… SUPER_ADMIN_EMAIL=admin@example.com PORT=8787 deno run -A server/main.ts`
- `API=http://127.0.0.1:8787 ADMIN=admin@example.com node e2e-filtro.js` (página local)
- Regresiones: `e2e-semana.js`, `e2e-correccion.js`, `e2e-guion.js` y `e2e-presentacion.js`, cada una
  en un servidor nuevo

## Resultados de pruebas
- **TDD:** `e2e-filtro.js` falló antes de implementar (9 de 11).
  - Las 2 que pasaban eran vacías, porque no había secciones que comparar.
  - Después de implementar pasan 11 de 11.
- **Alumna:**
  - 4 tarjetas son botones.
  - Filtrar Atrasadas muestra solo su sección, con la tarjeta marcada y "Ver todo".
  - Cambiar a Próximas funciona.
  - La misma tarjeta, o "Ver todo", quita el filtro.
  - Con Enter también filtra.
  - 0 envíos al servidor.
- **Admin:** el filtro "Hoy" en un alumno o alumna no cambia el tablero de otro.
- **Regresiones:** semana 16/16, corrección 11/11, guion 8/8, presentación 8/8.
- Captura revisada: `filtro-atrasadas.png`.

## Producción (4.1)
- E2E de solo lectura en GitHub Pages: 11/11. Se usó el correo de Marisol y el del admin; 0 envíos al servidor.

## Verificación de estado
- Solo frontend; no hay cambios de servidor ni de datos. Las pruebas usaron copias en memoria, que se
  borraron, y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
