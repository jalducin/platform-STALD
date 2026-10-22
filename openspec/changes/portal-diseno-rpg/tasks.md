## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/portal-diseno-rpg` desde `main` actualizado

## 1. Implementación

- [ ] 1.1 `estilos/portal.css` (nuevo): tokens base del portal + `--rpg-*`, héroe, tarjetas por área, entrada, pie y
  «🗓️ Mi horario»; claro, oscuro y `data-theme`; botones de 44 px o más y foco visible
- [ ] 1.2 `index.html`: enlazar `estilos/ui.css` y `estilos/portal.css`; quitar el CSS en línea; héroe `#portal-heroe`,
  tarjetas `div.area` con `a.btn[data-espacio]` y `[data-estado]`; entrada con el mismo estilo; pie con privacidad y
  consentimiento (`data-interruptor`)
- [ ] 1.3 Script: tema (`#tema-btn`, `stald_tema`, aplicado en `<head>`), nombre de pila, líneas de estado de
  Secundaria y Juegos con las respuestas que ya se piden, avance de la semana y racha (Secundaria sin admin), selector
  de alumna del admin sin peticiones

## 2. Verificación (OBLIGATORIO)

- [ ] 2.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `portal-diseno` (alumna de Secundaria,
  alumno de Inglés, invitado de Juegos, admin y sin sesión a 360 px en claro y oscuro; botones ≥ 44 px, sin scroll
  horizontal, contraste AA, sin errores de consola; tema guardado; pie apagado) y registro en `tests/e2e/correr.sh`
- [ ] 2.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E `portal-diseno`, `portal`, `login`,
  `peticiones`, `privacidad`, `secundaria-dashboard`, `material`, `baja-ingles` (puertos 8991/8992, copia temporal del
  repo de datos, sin Postgres real); reporte
  `openspec/changes/portal-diseno-rpg/reports/2026-10-22-step-2.2-pruebas-y-verificacion.md`
- [ ] 2.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): revisar las capturas a 360 px en claro y oscuro de los
  cinco tipos de persona
- [ ] 2.4 Actualizar documentación técnica (OBLIGATORIO): `docs/frontend-standards.md` (portal con diseño RPG)
- [ ] 2.5 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): Pages sirve `estilos/portal.css`
  y el `index.html` nuevo (solo lectura)
