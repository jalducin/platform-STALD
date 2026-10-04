# Reporte Step 4/5 — Pruebas y verificación de estado

- Fecha: 2026-09-28
- Cambio: tareas-online-semanales
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados

- `gh repo create jalducin/platform-STALD-data --private`
- `python gen_semana1.py data`: contenido de la semana 1. Migración de 4 resultados del diagnóstico
  (export de admin desde Supabase v14 → `resultados/diagnostico-a1/*.json`)
- `DATA_DIR=<copia local> npx -y deno test --allow-env --allow-read` (en `server/`) y `npx -y deno check main.ts`
- Servidor local: `DATA_DIR=… ROWS_FIXTURE=… SUPER_ADMIN_EMAIL=admin@example.com PORT=8787 deno run … server/main.ts`
  (almacén en memoria; correos ficticios)
- `curl` al servidor local y E2E Playwright `e2e-semana.js` con `ingles.html?api=http://127.0.0.1:8787`

## Resultados de pruebas

- Unitarias e integración: 23 pasaron, 0 fallaron (sin `DATA_DIR`: 18 pasaron y 5 se omitieron).
  - Selección determinista y distinta por alumno e intento, repartida por tema.
  - Ejercicios de escribir sin mayúsculas ni acentos.
  - Mejor intento; 409 `sin_intentos`.
  - Examen con 1 intento y solo desde su fecha; el admin no guarda; reinicio solo admin.
  - Refuerzo: sin examen usa el diagnóstico mapeado; con examen, solo los temas débiles.
  - Temas a reforzar acumulados.
  - Contenido de la semana válido.
  - Hubo 1 falla inicial por una expectativa mal escrita en la prueba del refuerzo: omitía el tema "en
    progreso", que el refuerzo incluye a propósito. Se corrigió la prueba.
- curl local:
  - Lista de la alumna con 6 elementos y estados correctos (diagnóstico `completo` 70 %).
  - Sin email → 400; correo desconocido → 403 `sin_acceso`; examen antes de su fecha → 403; meet → 400
    `no_aplica`; `/ingles/data` → 200; raíz → 404.
- E2E local: 16/16.
  - Tarjeta de la semana con 5 elementos; el Meet dice "Enlace por WhatsApp".
  - Diagnóstico migrado visible con ⭐ 70 %; las filas de Notion se mantienen.
  - Teoría con tablas y tips; 12 ejercicios (opción y escribir).
  - Intento 1 → Reintentar → intento 2 con ejercicios distintos → sin Reintentar; la tarjeta queda 2/2 con ⭐.
  - Angel recibe una selección distinta a la de Marisol.
  - Admin: vista previa en 4 elementos, 📝 70 % y 🎯 en el encabezado, temas a reforzar y "2/2 intentos".

## Verificación de estado

- Repo de datos: 11 JSON (1 semana, 4 actividades, 2 exámenes, 4 resultados migrados). Storage de
  Supabase: 4 resultados, igual que el repo.
- Las pruebas locales usaron `MemoryStore`: no escribieron en GitHub ni en Supabase. Estado restaurado: sí.
- Supabase v14 sin cambios (sigue como respaldo).

## Resultado

- Estado Step 4: PASS
- Estado Step 5: PASS local. **Pendiente (5.3):** producción, cuando el usuario configure Deno Deploy
  (`docs/deno-deploy-setup.md`). Antes del corte hay que volver a migrar por si Fernando resuelve el
  diagnóstico en Supabase.
- Bloqueos: configuración de Deno Deploy y del token (acción del usuario)

## Clase del domingo (3b, post-apply)

- Contenido `meet-2026-10-04`:
  - Guion de 6 bloques (retroalimentación, presente simple negativo y en pregunta, WH, adjetivos y
    posesivos, reto en vivo, cierre), 5 bloques de teoría y 7 tips.
  - Reto de 26 ejercicios: 10 por intento, 2 intentos.
- `deno test`: 24/24.
  - El guion solo le llega al admin.
  - El reto abre el domingo, con 2 intentos, y queda `en-curso` tras el primero.
- E2E local, en un servidor nuevo:
  - Semana: 16/16.
  - Guion: 8/8. Examen del viernes bloqueado ("Abre vie 2", sin botón); Meet sin reto antes del domingo;
    guion con retroalimentación de 5 alumnos o alumnas, errores comunes, 6 bloques y teoría para
    compartir; "Probar el reto" en vista previa con 10 ejercicios.
  - Hubo 2 fallas iniciales de la prueba (no de la página): un selector sin distinguir mayúsculas y
    correr dos veces la prueba de la semana sobre el mismo servidor en memoria. Se corrigieron y se
    repitió todo en un servidor nuevo.

## Modo presentación (3b.5)

- 14 diapositivas en `meet-2026-10-04.presentacion`; el servidor las entrega solo al admin (`deno test` 24/24).
- E2E local a 1280×720: 8/8.
  - 14 diapositivas sin desbordes.
  - La retroalimentación es grupal y sin nombres: promedio y entregas por actividad, fortalezas, temas a
    reforzar y la pregunta más fallada, omitiendo enunciados que mencionan a alguien del grupo.
  - QR del reto; navegación ← / →; Esc sale.
  - Regresión: guion 8/8 y semana 16/16.
- Correcciones tras revisar las capturas:
  - La tabla de posesivos (8 filas) se desbordaba: las tablas largas se parten en dos columnas.
  - "Lo que reforzamos hoy" pasó de preguntas sueltas a temas.

## Producción en Deno Deploy (5.3)

- Backend: `https://stald.jalducin.deno.net` (Dynamic App, `server/main.ts`).
- Curl:
  - `/` → 404 JSON.
  - `/ingles/actividades` sin correo → 400; con un correo desconocido → 403.
  - `/ingles/data` → 7 filas.
  - `/data` → 74 filas, igual que Supabase v14.
- Escritura en GitHub verificada con un archivo de prueba, que después se borró.
- Migración: el diagnóstico tiene 4 resultados, igual que en Supabase Storage.
- E2E (página local contra el backend de producción, `e2e-prod.js`): 10/10.
  - La alumna solo leyó; no hubo ningún POST.
  - Admin en vista previa.
- Estado después del E2E: 0 resultados guardados en las actividades de la semana 1; el diagnóstico sigue en 4.
- Las páginas apuntan a Deno (`DEFAULT_API`, `DATA_URL_BASE`). Supabase queda como legado.
- E2E contra GitHub Pages (https://jalducin.github.io/platform-STALD/): 10/10. PR #11 fusionado; Secundaria responde 200.
