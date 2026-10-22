## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/navegacion-dispositivos` desde `main` actualizado (con el portal de `portal-diseno-rpg`)

## 1. Auditoría (medir antes de cambiar)

- [x] 1.1 E2E `navegacion-dispositivos` en modo `MEDIR=1` contra el código de `main`: 8 tareas × 5 tamaños, anchos,
  teclado y enlaces profundos (servidor local, copia temporal de datos, PostgREST falso; puertos 9001/9002/9003)
- [x] 1.2 Producción, solo lectura y sin sesión: tiempos de carga y estado/caché de los recursos de las páginas públicas

## 2. Implementación

- [x] 2.1 Secundaria: `irPestanaSec(id, enfocar, historial)` con `pushState` al tocar una pestaña y `hashchange` que
  regresa a la pestaña anterior (`ingles/secundaria.js`, `ingles/app.js`)
- [x] 2.2 Objetivos de 44 px: `.home-link` y `a.link` de Inglés, botón del mapa de calor, `.check` y `.btn.sm` de
  Juegos, `.btn.sm` con `pointer: coarse` (`ingles/ingles.css`, `juegos/app/juegos.css`, `estilos/stald.css`)
- [x] 2.3 `scroll-padding-bottom` para que las barras fijas no tapen lo enfocado (`ingles/ingles.css`)
- [x] 2.4 Diseño ancho: Inglés (alumnos y alumnas) con menú lateral ≥ 1100 px, Secundaria a 1100 px, hub de Juegos a
  1080 px con más columnas ≥ 1200 px (`ingles/ingles.css`, `ingles/secundaria.css`, `juegos/app/juegos.css`)
- [x] 2.6 Hallazgos de la revisión y de la suite: «Atrás» sin hash vuelve a Inicio; accesos a Misiones con
  `'agregar'`; selector de alumna con `location.assign`; Entregas repintada si llegó tras el esqueleto
  (`pintarEntregasPendientes`); E2E: 44 px en toda pantalla táctil, «atrás» pestaña por pestaña, flechas sin historial,
  `#horario`, columna del juego, «Grupo 1» visible aunque falle, 503 `sin_base` excusado y OMIT si se acaban las
  actividades de la copia
- [x] 2.7 PR 2 (tras el merge del PR 1 y con el portal nuevo en `main`): el portal enlaza Secundaria directo a
  `ingles.html?modo=secundaria` (`index.html`, constante `SECUNDARIA`); la E2E revisa que no se cargue el puente
- [x] 2.5 `?v=` de los archivos cambiados en `ingles.html` y `juegos.html`

## 3. Verificación (OBLIGATORIO)

- [x] 3.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `navegacion-dispositivos` con topes fijados
  por la auditoría, registrada en `tests/e2e/correr.sh` (fase `ingles`)
- [x] 3.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E afectadas (`navegacion-dispositivos`,
  `secundaria-clases`, `secundaria-clase`, `secundaria-dashboard`, `misiones`, `material`, `ingles-diseno-profe`,
  `ingles-alumno-diseno`, `ingles-admin`, `juegos-diseno`, `juegos`, `portal`, `portal-diseno`, `peticiones`) con
  `--hoy 2026-10-27 --pg` contra el PostgREST falso y con el «hoy» por omisión; reporte
  `openspec/changes/navegacion-dispositivos/reports/2026-10-22-step-3.2-pruebas-y-verificacion.md`
- [x] 3.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): recorrido con Playwright en los 5 tamaños y capturas
  antes/después; atrás entre pestañas de Secundaria; capturas de 1024, 1280 y 1920 px
- [x] 3.4 Actualizar documentación técnica (OBLIGATORIO): `docs/pruebas.md` (E2E nueva) y `docs/frontend-standards.md`
  (navegación en tablet y PC)
- [ ] 3.5 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): Pages sirve los CSS y JS nuevos
  y las páginas públicas siguen cargando con 200 (solo lectura, sin sesión)
