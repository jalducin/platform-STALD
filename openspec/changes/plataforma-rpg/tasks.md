## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/spec-plataforma-rpg` (worktree aparte, desde `main`) para este PR de solo
  artefactos
- [ ] 0.2 Cada fase se implementa en su propia rama y su propio cambio OpenSpec derivado de este:
  `feature/rpg-fase2-misiones`, `feature/rpg-fase2-ingles`, `feature/rpg-fase3-tutor`, `feature/rpg-fase4-panel`.
  El primer paso de cada uno es crear su rama desde `main` actualizado. Cada cambio derivado **mueve** a su propio
  `specs/` los requisitos de este cambio que implementa y los quita de aquí

## 1. Propuesta, validación y aprobación (este PR)

- [x] 1.1 `proposal.md`, `design.md`, specs `gamificacion`, `misiones`, `tutor-ia`, `panel-profe` y este `tasks.md`
- [x] 1.2 Revisión con el subagente `revisor-solo-lectura` (huecos, privacidad de menores, contradicciones) y
  corrección de sus hallazgos en los artefactos
- [x] 1.3 Pruebas y verificación (OBLIGATORIO): `openspec validate plataforma-rpg --strict` sin errores y búsqueda de
  correos y nombres reales en los artefactos (0); sin estado que restaurar (no hay código ni datos). Reporte
  `openspec/changes/plataforma-rpg/reports/2026-10-21-step-1.3-pruebas-y-verificacion.md`
- [x] 1.4 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): CLI de validación con el cambio válido; el PR solo
  contiene archivos de `openspec/changes/plataforma-rpg/`
- [x] 1.5 Documentación (OBLIGATORIO): no aplica en este PR (solo propuesta); cada fase actualiza los `docs/` que toca
- [ ] 1.6 El profe aprueba la propuesta y responde las decisiones de `design.md` §6 (PR abierto, sin merge hasta
  entonces)

## 2. Fase 1 — Núcleo y dashboard (en curso, otros cambios)

- [ ] 2.1 Esperar a que los cambios de Fase 1 (dashboard RPG con `comun/gamificacion.js` y clase como misión) se
  fusionen y archiven
- [ ] 2.2 Conciliar: confirmar que su fórmula (incluido cómo se duplica el mini examen 🎯) coincide con «Reglas de XP y
  nivel de la Fase 1 como invariante»; si difiere, actualizar primero este spec (base-standards §7), no el código
- [ ] 2.3 Fijar los 10 casos de regresión de XP, nivel y racha que usarán las fases 2–4

## 3. Fase 2a — Misiones principales en Secundaria (rama `feature/rpg-fase2-misiones`)

- [ ] 3.1 Step 0: crear la rama desde `main`
- [ ] 3.2 Pruebas que fallan (Deno): validador `--misiones <ámbito>` (válida, rúbrica ≠ 100, fechas fuera del mundo,
  sin aviso de privacidad) y `mundos.json` (encimados = error)
- [ ] 3.3 `server/motor.ts` y `server/validar_semana.ts`: forma nueva `--misiones <ámbito>` y validación de
  `mundos.json`
- [ ] 3.4 Pruebas que fallan: `POST /misiones/<id>/entrega` (200, 400 fuera de límites, 413, 409 ya evaluado, 404
  ajena, 403 baja, invitado y sin consentimiento `multimedia`, 401, 503 al fallar Postgres) y quitado de EXIF en el
  servidor
- [ ] 3.5 Ruta de entrega y servido de archivos con sesión en `server/main.ts`
- [ ] 3.6 Pruebas que fallan y ruta de evaluación básica `/profe/entregas` (XP = rúbrica × 3 + 60; corrección por
  privacidad borra el archivo)
- [ ] 3.7 `POST /practica/comprobar` con prueba de que la respuesta no viaja al navegador
- [ ] 3.8 `comun/gamificacion.js`: XP de misiones y mundos desde el catálogo (sin tocar la fórmula de Fase 1)
- [ ] 3.9 `comun/gamificacion.js`: misiones diarias y semanales y árbol de habilidades
- [ ] 3.10 Vista «🗺️ Mapa» con catálogo y «🌳 Árbol»
- [ ] 3.11 Vista «⚔️ Misión principal»: pasos, entrega con imagen reducida, recordatorio de privacidad y casilla
  «Acepto»
- [ ] 3.12 Retroalimentación inmediata accesible (XP, nivel, insignias; movimiento reducido; sonido apagado)
- [ ] 3.13 Aviso de privacidad `privacidad.html` enlazado desde el portal (texto aprobado por el profe)
- [ ] 3.14 Contenido: `mundos.json` y 3 misiones piloto de Secundaria (Matemáticas, Ciencias, Tecnología) en el repo
  privado, generadas con la skill y validadas con 0 errores
- [ ] 3.15 Actualizar `ai-specs/skills/clases-secundaria/SKILL.md` con la sección de misiones y correr
  `node ai-specs/scripts/sincronizar-espejos.mjs`
- [ ] 3.16 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E de Secundaria (`e2e-examen-secundaria`,
  `secundaria-clases`) y pruebas de `server/` afectadas; E2E nueva de misión a 360 px, claro y oscuro
- [ ] 3.17 Ejecutar pruebas y verificar estado (OBLIGATORIO): `deno test -A server/` (subagente
  `verificador-pruebas`), `deno check`, `deno lint`, E2E; datos de prueba solo en `stald_test_*` y restaurados; reporte
  `openspec/changes/rpg-fase2-misiones/reports/AAAA-MM-DD-step-3.17-pruebas-y-verificacion.md`
- [ ] 3.18 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): servidor local con copia de datos y curl a cada fila
  de la matriz (admin, alumna, alumno de Inglés, de baja, invitado, sin sesión, correo no asignado, misión ajena,
  imagen grande); CLI `--misiones` con caso válido e inválido; restaurar entregas de prueba
- [ ] 3.19 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): `/salud`, vistas publicadas y
  flujo entrega → evaluación → XP con la cuenta de prueba; borrar la entrega de prueba
- [ ] 3.20 Actualizar documentación técnica (OBLIGATORIO): `docs/data-model.md` (`mundos.json`, `misiones/`,
  `entregas/`, consentimientos), `docs/backend-standards.md` (rutas), `docs/frontend-standards.md` (vistas), índice de
  docs

## 4. Fase 2b — Gamificación en Inglés con ranking por grupo (rama `feature/rpg-fase2-ingles`)

- [ ] 4.1 Step 0: crear la rama desde `main`
- [ ] 4.2 Pruebas que fallan: perfil y nick (válido → pendiente, con nombre del registro → 400, de otra persona → 403,
  invitado o baja → 403, sin sesión → 401)
- [ ] 4.3 Pruebas que fallan: ranking (solo su grupo, puntos de constancia, sin nombres, correos, slugs, XP ni
  calificaciones en todo el JSON, oculto y baja no aparecen, otro grupo 403, Secundaria y apagado 404, sin sesión 401,
  Postgres caído 503, caché invalidada al ocultarse)
- [ ] 4.4 Función pura compartida servidor–navegador (import de `comun/` o copia vigilada por prueba)
- [ ] 4.5 Rutas `/gamificacion/perfil` y `/gamificacion/ranking` con caché de 60 s por grupo e invalidación
- [ ] 4.6 `/profe/nicks` (aprobar, rechazar, apagar ranking); si se reusa el nick de Juegos, delta MODIFIED en `juegos`
- [ ] 4.7 `ingles.html` de grupo: dashboard RPG y mundos por unidad
- [ ] 4.8 `ingles.html` de grupo: «🏆 Ranking de mi grupo» y «🙈 No aparecer»
- [ ] 4.9 Misión piloto «My Hero Card» en `contenido/ingles/` y `contenido/secundaria/`, validada
- [ ] 4.10 PWA opcional: `manifest.webmanifest` y *service worker* (estáticos versionados, API red primero con
  respaldo y aviso «Sin conexión»)
- [ ] 4.11 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E de Inglés del alumno y del profe afectadas
- [ ] 4.12 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E; prueba automática que recorre el JSON
  del ranking; medición p95 del dashboard con 4G simulado; restaurar `stald_test_*`; reporte
  `openspec/changes/rpg-fase2-ingles/reports/AAAA-MM-DD-step-4.12-pruebas-y-verificacion.md`
- [ ] 4.13 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): curl con admin, dos cuentas de prueba del mismo
  grupo, una de otro grupo, sin sesión y correo no asignado; ocultarse y volver; sin conexión con la PWA; restaurar
  nicks y preferencias de prueba
- [ ] 4.14 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): `/salud`, ranking con la cuenta
  de prueba sin datos personales; restaurar su perfil
- [ ] 4.15 Actualizar documentación técnica (OBLIGATORIO): data-model (`gamificacion/`), backend y frontend standards,
  aviso de privacidad (nick y ranking)

## 5. Fase 3 — Tutor IA (rama `feature/rpg-fase3-tutor`)

- [ ] 5.1 Step 0: crear la rama desde `main`
- [ ] 5.2 Acciones externas del profe: proveedor y modelo elegidos, llave en `TUTOR_IA_API_KEY`, tope en
  `TUTOR_IA_TOPE_USD`, consentimientos `tutor` escritos, protocolo de bienestar; el agente verifica y documenta
  retención y no entrenamiento del proveedor
- [ ] 5.3 Migración versionada `supabase/migrations/00N_stald_tutor_bitacora.sql` (RLS sin políticas) y tabla de prueba
  `stald_test_tutor_bitacora`
- [ ] 5.4 Pruebas que fallan: redacción (correo, teléfono, CURP, URL, números largos, nombres del registro) y contexto
  sin respuestas; el proveedor se simula
- [ ] 5.5 Pruebas que fallan: acceso y límites (403 sin consentimiento, baja, invitado, fuera de horario y desde examen;
  503 apagado, config ilegible, tope y bitácora caída; 429 diario; 400 largo; 409 turno 13; 401)
- [ ] 5.6 `server/tutor.ts`: orden guardar → llamar → revisar → guardar; revisión de salida contra todos los ejercicios
  visibles
- [ ] 5.7 `server/tutor/prompt.md` versionado, lista de expresiones de bienestar y mensaje fijo; aviso sin contenido al
  profe
- [ ] 5.8 `/profe/tutor`: interruptor, consentimientos, bitácora con marcadas primero y borrado por persona; script de
  borrado a 90 días
- [ ] 5.9 Batería versionada de 40 casos (10 de manipulación, 5 de bienestar) y script que la corre contra el modelo
  real con presupuesto aprobado por el profe
- [ ] 5.10 Vista «💬 Pregúntale al tutor» en la clase y la misión, con avisos fijos y contador de mensajes restantes
- [ ] 5.11 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E de clase y misión con el tutor simulado
- [ ] 5.12 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E; batería real (0 respuestas directas,
  ≥ 90 % con pregunta guía, 100 % bienestar); 20 casos de fuga con 0 datos enviados; limpiar `stald_test_*`; reporte
  `openspec/changes/rpg-fase3-tutor/reports/AAAA-MM-DD-step-5.12-pruebas-y-verificacion.md`
- [ ] 5.13 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): curl con admin, cuenta de prueba con y sin
  consentimiento, sin sesión y correo no asignado; apagado, límite y horario; medir p95 < 8 s
- [ ] 5.14 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): conversación con la cuenta de
  prueba y borrado de sus turnos de la bitácora
- [ ] 5.15 Actualizar documentación técnica (OBLIGATORIO): `docs/deno-deploy-setup.md` (variables nuevas),
  data-model (bitácora y retención), backend standards (ruta y modelo de amenaza), aviso de privacidad (proveedor de
  IA, país y retención)

## 6. Fase 4 — Panel del profe avanzado (rama `feature/rpg-fase4-panel`)

- [ ] 6.1 Step 0: crear la rama desde `main`
- [ ] 6.2 Pruebas que fallan: `/profe/*` 403 a alumnos e invitados y 401 sin sesión
- [ ] 6.3 Pruebas que fallan: publicar misión (válida → escribe en el repo; con errores → 422 sin escribir; repo caído →
  503)
- [ ] 6.4 Pruebas que fallan: reglas R1–R5 con 5 casos calculados a mano
- [ ] 6.5 Editor de misiones: formulario y borrador en `stald_docs`
- [ ] 6.6 Editor de misiones: publicación validada al repo de datos
- [ ] 6.7 Bandeja de entregas: lista por antigüedad y vista de una entrega
- [ ] 6.8 Bandeja de entregas: rúbrica, comentario, pedir corrección y borrar contenido
- [ ] 6.9 `/profe/metricas` con caché y su vista en `ingles.html` (admin)
- [ ] 6.10 `/profe/riesgo` con caché y su vista en `ingles.html` (admin)
- [ ] 6.11 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E del admin afectadas
- [ ] 6.12 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E; publicar en una copia del repo de datos
  (sin push real) y restaurar; reporte
  `openspec/changes/rpg-fase4-panel/reports/AAAA-MM-DD-step-6.12-pruebas-y-verificacion.md`
- [ ] 6.13 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): curl con admin, alumna, invitado, sin sesión y correo
  no asignado; crear y publicar una misión de prueba en < 10 min; evaluar una entrega en < 3 min; comparar la lista de
  riesgo con el cálculo a mano; borrar la misión y la entrega de prueba
- [ ] 6.14 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): `/salud` y panel en solo lectura
- [ ] 6.15 Actualizar documentación técnica (OBLIGATORIO): backend y frontend standards, data-model (borradores), README

## 7. Cierre

- [ ] 7.1 Cuando la Fase 4 se archive (o el profe descarte las fases restantes), cerrar este cambio paraguas con
  `openspec archive plataforma-rpg --skip-specs`: sus requisitos llegan a `openspec/specs/` por los cambios derivados
  que sí los implementan, nunca por este
