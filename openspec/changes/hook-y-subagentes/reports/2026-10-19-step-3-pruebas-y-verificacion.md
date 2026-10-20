# Reporte Step 3 y 4: pruebas y verificación

- Fecha: 2026-10-19
- Cambio: hook-y-subagentes
- Agente: Claude Code (Opus 5.5), con los subagentes `verificador-pruebas` y `revisor-solo-lectura`

## Comandos ejecutados
- `npx -y deno test -A server/hook_proteger_git_test.ts server/espejos_agentes_test.ts`
- `npx -y deno test -A server/`
- `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `npx -y @fission-ai/openspec@1.4.1 validate hook-y-subagentes --strict`
- `node ai-specs/scripts/sincronizar-espejos.mjs` (dos veces, con un espejo sobrante de prueba)
- `claude -p "… git add -f .env.prueba-hook"` en la rama, con el hook registrado (de punta a punta)

## Resultados de pruebas
- **Dirigidas:** 18 pasaron, 0 fallaron.
  - `hook_proteger_git_test` tiene 14 casos: `.env`, `IA/`, PowerShell, variantes de push a `main`, `Set-Location`,
    `git add -A`, `commit -a`, comillas y heredoc.
  - `espejos_agentes_test` tiene 4 casos.
- **Suite completa:** 879 pasaron, 0 fallaron, 6 omitidas (2 min).
- **Lint y tipos:** sin errores en 142 archivos.

## Revisión con contexto limpio (patrón Writer/Reviewer)
1. **Primera ronda:**
   - `verificador-pruebas`: 872 pasaron, 0 fallaron; 7 eventos manuales del hook con el código esperado; espejos
     idempotentes.
   - `revisor-solo-lectura`: 12 hallazgos que las pruebas en verde no veían. El más grave: `.gitignore` excluía
     `.claude/settings.json`, así que el hook nunca se habría registrado.
2. **Qué se hizo con los hallazgos:**
   - El spec se actualizó primero (base-standards §7).
   - Se escribieron 7 pruebas nuevas que fallaron.
   - Se corrigió el código: versionar `settings.json`, ignorar `**/.env.*` y `/IA/`.
   - El hook ahora:
     - pregunta a git qué entraría (`add --dry-run`, `diff --cached`);
     - normaliza las refspecs `HEAD` y `refs/heads/main`;
     - ignora las opciones de push que llevan valor;
     - reconoce `Set-Location`, `sl`, `pushd` y `Push-Location`;
     - acepta rutas `/c/...`;
     - respeta comillas y heredocs.
   - Los espejos borran lo que sobra y el subagente ya no trae ruta con usuario local.
3. **Cerrado:** los 12 hallazgos.

## Verificación manual
- **De punta a punta en Windows:** una sesión nueva de Claude Code intentó `git add -f .env.prueba-hook`.
  - Respuesta: «El hook proteger-git bloqueó el comando con exit code 2 … el archivo no se agregó al stage».
  - `git diff --cached` no lo muestra.
  - Esto confirma que `$CLAUDE_PROJECT_DIR` se expande y que el hook corre con Node.
- **Script de espejos:** borra un `.claude/agents/sobrante.md` de prueba («1 sobrantes borradas»). En la segunda
  corrida borra 0 y no hay cambios en git.

## Verificación de estado
- **Datos:** el cambio no muta datos ni toca Supabase, el repo de datos ni Notion.
- **Limpieza:** se borró el archivo temporal `.env.prueba-hook`. Ningún `stald_` se tocó.

## Resultado
- Estado Step 3 y Step 4: PASS
- Bloqueos: ninguno
