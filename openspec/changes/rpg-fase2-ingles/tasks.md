## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: crear y usar la rama `feature/rpg-fase2-ingles` desde `main` actualizado (worktree aparte)

## 1. Artefactos

- [x] 1.1 `proposal.md` (con matriz de acceso), `design.md`, specs `gamificacion` y `panel-profe` y este `tasks.md`
- [x] 1.2 Mover de `plataforma-rpg` los requisitos «Nick de Juegos para el ranking» y «Ranking por grupo con nicks, sin
  calificaciones», y la parte de nicks de «Moderación de nicks, tutor y consentimientos» (queda «Moderación del tutor y
  consentimientos»); marcar en su `tasks.md` lo que hace este cambio

## 2. Servidor

- [x] 2.1 Pruebas que fallan (`server/gamificacion_ingles_test.ts`): constancia (semana en CDMX, a tiempo, tarde, paso
  de misión), revisión del nick (correo, teléfono, nombre de pila del registro, «leet», palabra bloqueada), perfil
  (pendiente, `sin_nick`, `nick_invalido`, otra persona 403, admin/invitado/baja 403, Secundaria 404, sin sesión 401,
  cambio de nick → pendiente), ranking (solo su grupo, por constancia, nadie sin activarlo, posición propia privada,
  recorrido del JSON sin datos personales, otro grupo 403, baja 403 y no aparece, grupo apagado 404, Postgres caído
  503, caché invalidada al ocultarse) y panel (cola, aprobar, rechazar, 409, interruptor, retención de 30 días)
- [x] 2.2 `comun/constancia.js`: función pura compartida (servidor con `import`, navegador con `<script>`)
- [x] 2.3 `server/interruptores.ts` (genérico) y `gamificacion/config.json` con `ranking: false` por defecto
- [x] 2.4 `server/gamificacion.ts`: `/gamificacion/perfil`, `/gamificacion/ranking`, `/profe/nicks[/aprobar|/rechazar]`
  y `/profe/ranking`; `server/cache_ranking.ts` (60 s por grupo y semana) invalidada desde `server/juegos.ts` al
  cambiar un nick; `gamificacion/` a Postgres en `server/db.ts`; rutas en `server/main.ts`

## 3. Página

- [x] 3.1 `ingles/rpg-ingles.js`: tablero RPG en «🏠 Inicio» (nivel, rango, XP, insignias, racha y mundo) con
  `barraRpg` (cuarto parámetro opcional) y «🏆 Ranking de mi grupo» solo con el interruptor encendido
- [x] 3.2 Admin: sección «🛡️ Nicks» (interruptor general y por grupo, «⏳ Por revisar», «👥 Todos los nicks», motivo en
  la misma fila)
- [x] 3.3 `ingles/rpg-ingles.css` y `?v=` nuevos en `ingles.html`

## 4. Pendientes que dependen de otros cambios

- [ ] 4.1 Misión «My Hero Card» (solo texto) en `contenido/ingles/` y `contenido/secundaria/`: espera el motor de
  misiones de la Fase 2a (`rpg-fase2-misiones`); al llegar, conectar `pasosMision` en `depsGamificacion`
  (`server/main.ts`) para los 20 puntos por paso
- [ ] 4.2 PWA opcional (tarea 4.10 del paraguas): sin hacer en este cambio, para no arriesgar la caché de estáticos

## 5. Verificación (OBLIGATORIO)

- [x] 5.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `rpg-ingles` (fase `ingles`) a 360 px, en
  claro y oscuro; se corren las E2E de Inglés del alumno y del profe afectadas (`ingles` y `base`)
- [x] 5.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): `deno test -A server/`, `deno check`, `deno lint` y E2E
  con copia temporal de datos (puertos 8915/8916, sin tocar `stald_*`); reporte
  `openspec/changes/rpg-fase2-ingles/reports/2026-10-21-step-5.2-pruebas-y-verificacion.md`
- [x] 5.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): servidor local con copia de datos y curl con admin,
  dos cuentas del mismo grupo, una de otro grupo, baja, Secundaria, invitado, sin sesión; aparecer, ocultarse y volver;
  cambiar el nick en Juegos; interruptor apagado y encendido; restaurar nicks y preferencias de prueba
- [ ] 5.4 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): `/salud`, `ingles.html`
  publicado, y que con el interruptor apagado el ranking responde 404 (solo lectura; no se enciende)
- [x] 5.5 Actualizar documentación técnica (OBLIGATORIO): `docs/data-model.md` (`gamificacion/`),
  `docs/backend-standards.md` (rutas e interruptor), `docs/frontend-standards.md` (tablero RPG de Inglés, ranking,
  «🛡️ Nicks»). El aviso de privacidad (`privacidad.html`) lo crea la Fase 2a; al llegar, agregar el nick de Juegos y
  el ranking oculto por defecto (queda en 4.1)
