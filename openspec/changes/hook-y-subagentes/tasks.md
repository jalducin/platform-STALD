## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0 — `git fetch` y crear `feature/hook-y-subagentes` desde `origin/main` (OBLIGATORIO)

## 1. Pruebas primero (OBLIGATORIO)

- [x] 1.1 Step 1 — Revisar pruebas existentes (OBLIGATORIO): ninguna cubre `.claude/` ni `ai-specs/`; se agregan
      nuevas
- [x] 1.2 `server/hook_proteger_git_test.ts` en rojo: corre el hook con Node y eventos JSON para cada escenario del
      spec (`.env`, `.env.example`, `IA/`, push a `main`, push al repo de datos, comando ajeno, JSON roto)
- [x] 1.3 `server/espejos_agentes_test.ts` en rojo: espejos idénticos a `ai-specs` y subagentes sin `Edit`/`Write`

## 2. Implementación

- [x] 2.1 `.claude/hooks/proteger-git.mjs` y `.claude/settings.json` (`PreToolUse`, matcher `Bash|PowerShell`)
- [x] 2.2 `ai-specs/agents/revisor-solo-lectura.md` y `ai-specs/agents/verificador-pruebas.md`
- [x] 2.3 `ai-specs/scripts/sincronizar-espejos.mjs` y regenerar `.claude/{agents,skills}` y `.gemini/{agents,skills}`
      como copias reales

## 3. Pruebas y verificación (OBLIGATORIO)

- [ ] 3.1 Step 3 — Ejecutar pruebas y verificar estado (OBLIGATORIO): pruebas nuevas, `deno test -A server/`,
      `deno check` y `deno lint`; reporte en
      `openspec/changes/hook-y-subagentes/reports/2026-10-19-step-3-pruebas-y-verificacion.md`. El cambio no muta
      datos.
- [ ] 3.2 Step 4 — Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA: correr el hook a mano con eventos reales
      (bloquea y deja pasar), correr el script de espejos dos veces (idempotente: el segundo no cambia nada) y, tras
      el merge, usar `revisor-solo-lectura` y `verificador-pruebas` en una sesión nueva

## 4. Documentación (OBLIGATORIO)

- [x] 4.1 Step 5 — `docs/base-standards.md` §6 (espejos = copias generadas por el script) y `README.md` (hook y
      subagentes del proyecto, cómo revisarlos con `/hooks` y `/agents`)
