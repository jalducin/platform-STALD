# Reporte Step 4/5 — Pruebas y verificación de estado

- Fecha: 2026-09-25
- Cambio: ingles-fechas-y-avance
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados

- `npx -y deno test supabase/functions/tareas-estudio-secundaria/rows_test.ts`
- `npx -y deno check supabase/functions/tareas-estudio-secundaria/index.ts`
- `supabase functions deploy tareas-estudio-secundaria --project-ref xozsrcnjnugwbrrrwoeb --no-verify-jwt --use-api` → versión 12
- `curl` a `/ingles/data` con un correo de alumna
- E2E Playwright (`e2e-avance.js`, Chromium) sobre `python -m http.server`; reloj simulado con `page.clock` y
  un escenario con respuesta simulada (`page.route`)

## Resultados de pruebas

- Unitarias (deno): 8 pasaron, 0 fallaron (2 nuevas: calificación/dificultad/editadoEn y calificación vacía → null).
- Type-check: OK.
- curl (v12, alumna): 51 filas, `isAdmin: false`; claves `alumno, calificacion, completado, dificultad,
  editadoEn, fecha, label, name, source, url, userNames`; sin `userEmails`/`userIds`.
- E2E 13/13 PASS:
  - Hoy (25 sep, datos reales): contadores 0/0/0/50; orden de secciones Realizadas → Atrasadas → Hoy →
    Próximas; "Sin fecha" plegada con 1; Próximas con scroll interno (scrollHeight 5654 > 340); primera
    próxima "📋 A1 Test #1", sáb 26 sep.
  - Reloj en 1 oct (datos reales): 0/5/1/44; atrasadas ordenadas de 5d a 1d.
  - Simulado (10 oct): realizada ayer aparece en "Realizadas · últimos 3 días" con "⭐ 93% ✅"; realizada
    hace 7 días solo en "Realizadas anteriores" (plegada); progreso 2/3.
  - Admin: 5 bloques "0/51 ⏰ 0 📌 0" con el tablero completo dentro.
- Nota: 2 fallas iniciales de la prueba (comparaba texto con `text-transform: uppercase`); se corrigió la
  prueba, no la página.

## Verificación de estado (Notion)

- Antes: 255 filas sin `Fecha Entrega `, 0 completadas, 0 con calificación.
- Después (API en vivo): cada alumno tiene 50 fechas distintas entre 2026-09-26 y 2026-11-14; el calendario
  (título, fecha) es idéntico para los 5; la única fila sin fecha es "📋 REGLA — Dónde anotar cada tipo de clase".
- Estado restaurado: no aplica (las fechas son el objetivo). Las pruebas con datos simulados no escriben en Notion.

## Resultado

- Estado Step 4: PASS
- Estado Step 5: PASS local y en producción (PR #2 fusionado, `df7a364`; E2E 13/13 contra GitHub Pages).
- Bloqueos: ninguno
