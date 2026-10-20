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

## 2b. Hallazgos de la revisión con contexto limpio (`revisor-solo-lectura`, 12 hallazgos)

- [x] 2b.1 `.gitignore`: versionar `.claude/settings.json` (solo se ignora `settings.local.json`) e ignorar `**/.env.*`
- [x] 2b.2 Pruebas en rojo de los escenarios nuevos del spec: variantes de push a `main`, `Set-Location`, rutas `/c/`,
      `.env` con varios sufijos y por `git add -A`, `ia/` en minúsculas y absoluto, separadores en comillas y heredoc,
      espejo sobrante
- [x] 2b.3 Hook: tokenizador que respeta comillas y heredocs, `cd`/`Set-Location`/`pushd`, rutas de Git Bash,
      `git add --dry-run` y `git diff --cached`, refspecs `HEAD`/`refs/heads/`, opciones con valor de `push`
- [x] 2b.4 Script de espejos borra sobrantes (salvo `openspec-*`); `verificador-pruebas` sin ruta con usuario local

## 3. Pruebas y verificación (OBLIGATORIO)

- [x] 3.1 Step 3 — Ejecutar pruebas y verificar estado (OBLIGATORIO): pruebas nuevas, `deno test -A server/`,
      `deno check` y `deno lint`; reporte en
      `openspec/changes/hook-y-subagentes/reports/2026-10-19-step-3-pruebas-y-verificacion.md`. El cambio no muta
      datos.
- [x] 3.2 Step 4 — Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA: correr el hook a mano con eventos reales
      (bloquea y deja pasar), correr el script de espejos dos veces (idempotente: el segundo no cambia nada), probar el
      hook registrado de punta a punta con `claude -p` en una sesión nueva (que `$CLAUDE_PROJECT_DIR` se expanda en
      Windows) y usar `revisor-solo-lectura` y `verificador-pruebas`

## 4. Documentación (OBLIGATORIO)

- [x] 4.1 Step 5 — `docs/base-standards.md` §6 (espejos = copias generadas por el script) y `README.md` (hook y
      subagentes del proyecto, cómo revisarlos con `/hooks` y `/agents`)
