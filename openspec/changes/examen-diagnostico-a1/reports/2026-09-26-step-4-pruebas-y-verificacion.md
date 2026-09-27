# Reporte Step 4/5 — Pruebas y verificación de estado

- Fecha: 2026-09-26
- Cambio: examen-diagnostico-a1
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados

- `npx -y deno test examenes_test.ts rows_test.ts` y `npx -y deno check index.ts`
- `supabase functions deploy tareas-estudio-secundaria --project-ref xozsrcnjnugwbrrrwoeb --no-verify-jwt --use-api` → versión 13
- `curl` a las rutas `/ingles/examenes` (ver abajo)
- E2E Playwright (`e2e-examen.js`) sobre `python -m http.server`, dos corridas seguidas

## Resultados de pruebas

- Unitarias: 18 pasaron, 0 fallaron (10 del motor de exámenes y 8 de filas).
  - Definición válida (33 preguntas, 6 secciones).
  - Preguntas públicas sin `correcta`, `explicacion` ni `retroalimentacion`.
  - 100 % / 0 %.
  - Estado por tema con umbrales 80/60.
  - Fortalezas, en progreso y debilidades.
  - Revisión de errores con explicación.
  - Saneo de respuestas, fecha de CDMX y slug.
- curl (v13):
  - Alumna el 26 sep: la lista dice `proximamente`; GET y POST → 403 `no_disponible`; DELETE → 403 `solo_admin`.
  - Correo sin filas → 403 `sin_acceso`; examen inexistente → 404.
  - Vista previa admin: 33 preguntas, sin fuga de respuestas.
  - POST admin: calificación inmediata 25/33, 76 %, "A1 en progreso"; 4 fortalezas, 1 en progreso, debilidad
    en to be con su retroalimentación; revisión de 8 errores (incluye una sin responder); `guardado: false`.
- E2E: 16/16 en 2 de 2 corridas.
  - Alumna el 26: "Disponible el dom 27".
  - Día 27 simulado, con preguntas reales y calificación real en modo vista previa: 33 preguntas en 6
    secciones; Enviar bloqueado hasta 33/33 ("faltan 3"); resultado inmediato con 6 temas, chips y revisión
    de 28 errores; volver al tablero.
  - Admin: cada alumno con ⭐ última calificación (Jesus ⭐ 9) y 📝 pendiente; vista previa con 33 preguntas.
  - Hubo fallas iniciales intermitentes por la latencia del backend (1.5–5 s). Se corrigió cargando el
    tablero y los exámenes en paralelo y ampliando la espera de la prueba a 60 s.

## Verificación de estado (Storage)

- Antes: bucket `examenes` sin resultados (se creó en el primer uso).
- Escritura real: `POST ?prueba=1` del admin → `guardado: true` (`_prueba-admin.json`), oculto en el listado.
- Después: `DELETE …/_prueba-admin` → `borrado: true`; el listado del admin quedó con 0 resultados.
- Estado restaurado: sí. Ningún alumno gastó su intento; las pruebas del día 27 usaron la vista previa, que no guarda.

## Resultado

- Estado Step 4: PASS
- Estado Step 5 (local): PASS. En producción la primera corrida E2E falló: primero por la caché del CDN
  (`max-age=600`) y después al esperar el login. **Corrección:** el commit `0265c25` marcó 5.4 como hecha sin
  haber pasado; se revierte y se vuelve a verificar con el cambio 3.3.
- Bloqueos: ninguno
