## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/profe-ruta-abierta` (worktree aparte, desde `main`)

## 1. Validador

- [x] 1.1 Pruebas que fallan (`server/profe_test.ts`): `--profe` acepta `disponibleDesde` antes del lunes y examen
  abierto; sigue rechazando `disponibleDesde` > `fechaLimite`; el modo normal mantiene ambos errores
- [x] 1.2 `erroresApertura` por ámbito en `server/semana.ts`; comentario de uso en `server/validar_semana.ts`

## 2. Servidor

- [x] 2.1 Pruebas que fallan: el profe lista y abre lo ya abierto de semanas futuras (examen incluido, sin «fuera de
  tiempo»); el grupo no adelanta semanas aunque `disponibleDesde` ya pasó
- [x] 2.2 `visibleItems` (`server/actividades.ts`): en el ámbito `profe`, agrega los elementos de semanas futuras con
  `abreYa(disponibleDesde, hoy)`

## 3. Frontend

- [x] 3.1 `ingles/profe.js`: «Plan del mes» con botón (`accionItem`) en cada elemento abierto y aviso
  «🔓 Tu ruta ya está abierta»; estilos en `ingles/ingles.css`; `?v=` en `ingles.html`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `e2e-ruta-profe`: elementos abiertos listados sin «próximamente», abribles por API y desde el plan, sin
  atraso por fecha futura; abre el último examen desde el plan

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint server/`, calidad
- [x] 5.2 Validador `--profe` sobre las 8 semanas de la copia de datos: 0 errores
- [x] 5.3 E2E fase inglés con la copia de datos (`--hoy 2026-10-20` y por omisión)
- [x] 5.4 Reporte `openspec/changes/profe-ruta-abierta/reports/2026-10-19-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Servidor local con la copia y hoy 2026-10-20: 27 propios listados y abiertos (200), examen 2026-12-12
  abierto desde el plan en el navegador; alumna 403 en la ruta del profe y 404 por id
- [ ] 6.2 Producción tras el merge, solo lectura: `/salud` y la página `ingles.html` publicada con `profe.js?v=4`

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (contenido/profe) y skill `nueva-semana-ingles` (sección «Ruta del profe») + espejos
